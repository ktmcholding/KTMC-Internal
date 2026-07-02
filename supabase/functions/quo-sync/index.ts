// Quo (OpenPhone) historical sync (Supabase Edge Function, Deno runtime).
//
// Pulls data already stored in your Quo/OpenPhone account into KTMC Internal:
//   - Contacts  → imported as leads (deduped by phone against leads + clients)
//   - Recent calls per contact (+ AI summaries) → stored in the call history,
//     attached to the matching client when there is one.
//
// The webhook (quo-webhook) keeps things live going forward; this backfills.
//
// Quo/OpenPhone REST API: base https://api.openphone.com/v1
//   Auth header:  Authorization: <API_KEY>   (raw key, no "Bearer" prefix)
//
// Deploy (JWT verification ON — only signed-in staff can trigger a sync):
//   supabase functions deploy quo-sync
//   supabase secrets set QUO_API_KEY=<your Quo API key>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const QUO_API_KEY = Deno.env.get("QUO_API_KEY") ?? "";
const QUO_BASE = "https://api.openphone.com/v1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_CATEGORIES = [
  "formulation",
  "co-packing",
  "private-white-label",
  "our-brands",
  "software",
];

const KEYWORDS: Record<string, string[]> = {
  formulation: ["formula", "formulation", "ingredient", "serum", "cream", "lotion", "sunscreen", "spf", "stability"],
  "co-packing": ["co-pack", "copack", "fill", "filling", "bottling", "canning", "packaging", "contract manufactur", "production"],
  "private-white-label": ["white label", "white-label", "private label", "private-label", "rebrand", "catalog", "catalogue"],
  "our-brands": ["wholesale", "retail", "distribut", "reseller", "purchase order", "bulk"],
  software: ["software", "app", "platform", "api", "integration", "dashboard", "saas", "demo", "website"],
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const digits10 = (v: unknown) => str(v).replace(/\D/g, "").slice(-10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function classify(text: string, fallback: string): string {
  const lower = text.toLowerCase();
  let best: string | null = null;
  let score = 0;
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    const s = words.filter((w) => lower.includes(w)).length;
    if (s > score) {
      score = s;
      best = cat;
    }
  }
  return best ?? fallback;
}

async function quoGet(path: string): Promise<any> {
  const res = await fetch(`${QUO_BASE}${path}`, {
    headers: { Authorization: QUO_API_KEY, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Quo ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  if (!QUO_API_KEY) {
    return json(400, {
      error:
        "Quo is not connected. Set the QUO_API_KEY secret on the quo-sync function (your Quo → Settings → API key).",
    });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine
  }
  const defaultCategory = VALID_CATEGORIES.includes(str(body.defaultCategory))
    ? str(body.defaultCategory)
    : "formulation";
  const withCalls = body.withCalls !== false; // default true

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Existing phones (leads + clients) so we don't create duplicates.
  const [leadsRes, clientsRes] = await Promise.all([
    db.from("leads").select("id,phone"),
    db.from("clients").select("id,phone"),
  ]);
  const known = new Set<string>();
  const clientByPhone = new Map<string, string>();
  for (const l of leadsRes.data ?? []) {
    const d = digits10((l as { phone?: string }).phone);
    if (d) known.add(d);
  }
  for (const c of clientsRes.data ?? []) {
    const d = digits10((c as { phone?: string }).phone);
    if (d) {
      known.add(d);
      clientByPhone.set(d, (c as { id: string }).id);
    }
  }

  const result = { contacts: 0, leadsAdded: 0, calls: 0, errors: [] as string[] };

  // 1) Phone numbers (used as the "our side" of call lookups).
  let phoneNumberIds: string[] = [];
  try {
    const pn = await quoGet("/phone-numbers");
    phoneNumberIds = (pn.data ?? [])
      .map((p: { id?: string }) => str(p.id))
      .filter(Boolean);
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "phone-numbers failed");
  }

  // 2) Contacts → leads (paginated).
  const importedPhones: string[] = [];
  let pageToken = "";
  let pages = 0;
  try {
    do {
      const q = new URLSearchParams({ maxResults: "50" });
      if (pageToken) q.set("pageToken", pageToken);
      const page = await quoGet(`/contacts?${q.toString()}`);
      const rows: any[] = page.data ?? [];
      for (const c of rows) {
        result.contacts++;
        const f = c.defaultFields ?? c ?? {};
        const first = str(f.firstName);
        const last = str(f.lastName);
        const name = `${first} ${last}`.trim();
        const company = str(f.company);
        const role = str(f.role);
        const phone = str((f.phoneNumbers ?? [])[0]?.value);
        const email = str((f.emails ?? [])[0]?.value);
        const d = digits10(phone);
        if (d) importedPhones.push(phone);
        if (!name && !company && !phone) continue;
        if (d && known.has(d)) continue; // already a lead/client
        const id = `quo_${str(c.id) || crypto.randomUUID()}`.slice(0, 60);
        const category = classify(`${company} ${role}`, defaultCategory);
        const { error } = await db.from("leads").insert({
          id,
          category,
          name,
          company: company || name || "Quo contact",
          email,
          phone,
          potential_value: 0,
          status: "new",
          source: "quo-phone",
          notes: `Imported from Quo${role ? ` · ${role}` : ""}`,
          created_at: str(c.createdAt).slice(0, 10) || new Date().toISOString().slice(0, 10),
        });
        if (!error) {
          result.leadsAdded++;
          if (d) known.add(d);
        }
      }
      pageToken = str(page.nextPageToken);
      pages++;
    } while (pageToken && pages < 20);
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "contacts failed");
  }

  // 3) Recent calls per contact (+ AI summary), best-effort and capped.
  if (withCalls && phoneNumberIds.length > 0) {
    const pnId = phoneNumberIds[0];
    const targets = importedPhones.slice(0, 25);
    for (const phone of targets) {
      try {
        const q = new URLSearchParams({
          phoneNumberId: pnId,
          maxResults: "5",
        });
        q.append("participants[]", phone);
        const calls = await quoGet(`/calls?${q.toString()}`);
        for (const call of calls.data ?? []) {
          const callId = str(call.id);
          if (!callId) continue;
          // Skip if we already stored this call.
          const { data: existing } = await db
            .from("calls")
            .select("id")
            .eq("id", callId)
            .maybeSingle();
          if (existing) continue;

          let summary = "";
          try {
            const s = await quoGet(`/call-summaries/${callId}`);
            const parts = [
              ...(s.data?.summary ?? []),
              ...(s.data?.nextSteps ?? []).map((n: string) => `Next: ${n}`),
            ];
            summary = parts.join(" ");
          } catch {
            // no summary available for this call
          }
          const d = digits10(phone);
          const { error } = await db.from("calls").insert({
            id: callId,
            client_id: clientByPhone.get(d) ?? null,
            phone,
            direction: str(call.direction) === "outgoing" ? "outbound" : "inbound",
            summary,
            transcript: "",
            recording_url: "",
            duration_seconds: Number(call.duration ?? 0) || 0,
            category: null,
            occurred_at:
              str(call.completedAt) || str(call.createdAt) || new Date().toISOString(),
          });
          if (!error) result.calls++;
          await sleep(120); // stay under the Quo rate limit
        }
      } catch (e) {
        result.errors.push(e instanceof Error ? e.message : "calls failed");
      }
    }
  }

  return json(200, { ok: true, ...result });
});
