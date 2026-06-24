// QUO → KTMC Internal webhook (Supabase Edge Function, Deno runtime).
//
// Handles Quo (quo.com) webhook events:
//   - call.summary.completed / call.completed / call.recording.completed →
//       if the caller matches a client, the summary is attached to that
//       client's call history; otherwise a new lead is created.
//   - message.received → a new lead is created (deduped by phone).
//
// Quo wraps the payload as { type, data: { object: { ... } } }.
//
// Deploy:  supabase functions deploy quo-webhook --no-verify-jwt
//          supabase secrets set QUO_WEBHOOK_SECRET=<your-secret>
// URL:     https://<ref>.supabase.co/functions/v1/quo-webhook?secret=<secret>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("QUO_WEBHOOK_SECRET") ?? "";

const VALID_CATEGORIES = [
  "formulation",
  "co-packing",
  "private-white-label",
  "our-brands",
  "software",
];

// Keyword routing: the call summary / message text is scanned and the lead is
// filed under the category with the most keyword hits. Edit these freely.
const KEYWORDS: Record<string, string[]> = {
  formulation: ["formula", "formulation", "ingredient", "serum", "cream", "lotion", "sunscreen", "spf", "stability", "develop a"],
  "co-packing": ["co-pack", "copack", "co pack", "fill", "filling", "bottling", "canning", "packaging", "contract manufactur", "production run"],
  "private-white-label": ["white label", "white-label", "private label", "private-label", "rebrand", "our own brand", "catalog", "catalogue"],
  "our-brands": ["wholesale", "retail", "stock your", "distribut", "reseller", "purchase order", "bulk order"],
  software: ["software", "app", "platform", "api", "integration", "dashboard", "saas", "demo", "website"],
};

type Json = Record<string, unknown>;

function asObj(v: unknown): Json {
  return v && typeof v === "object" ? (v as Json) : {};
}
function str(v: unknown): string {
  return v === undefined || v === null ? "" : String(v);
}
function digits(v: unknown): string {
  return str(v).replace(/\D/g, "").slice(-10);
}
function classify(text: string): string | null {
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
  return score > 0 ? best : null;
}
function json(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function parseBody(req: Request): Promise<Json> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries(form.entries());
  }
  try {
    return (await req.json()) as Json;
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type, x-quo-secret",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const url = new URL(req.url);
  const provided = req.headers.get("x-quo-secret") ?? url.searchParams.get("secret") ?? "";
  if (!WEBHOOK_SECRET || provided !== WEBHOOK_SECRET) {
    return json(401, { error: "Unauthorized" });
  }

  let payload: Json;
  try {
    payload = await parseBody(req);
  } catch {
    return json(400, { error: "Invalid request body" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: quoSetting } = await supabase
    .from("settings").select("value").eq("key", "quo").maybeSingle();
  const quoConfig = (quoSetting?.value as Json | null) ?? {};
  const defaultCategory = VALID_CATEGORIES.includes(str(quoConfig.defaultCategory))
    ? str(quoConfig.defaultCategory)
    : "formulation";

  // Quo wraps the real object as data.object; fall back to flat payloads.
  const obj = asObj(asObj(payload.data).object);
  const eventType = str(payload.type).toLowerCase();
  const kind = str(obj.object).toLowerCase(); // "call" | "message" | ...

  // -------- helpers that need the db client --------
  async function findClient(phone: string) {
    const n = digits(phone);
    if (!n) return null;
    const { data } = await supabase.from("clients").select("id, phone, category");
    return (data ?? []).find((c) => digits(c.phone) === n) ?? null;
  }
  async function openLeadExists(phone: string) {
    const n = digits(phone);
    if (!n) return false;
    const { data } = await supabase.from("leads").select("phone, status");
    return (data ?? []).some(
      (l) => digits(l.phone) === n && l.status !== "lost" && l.status !== "won"
    );
  }
  async function createLead(phone: string, notes: string, source: string) {
    if (await openLeadExists(phone)) return { skipped: "duplicate-lead" };
    const category = classify(notes) || defaultCategory;
    const lead = {
      id: `quo_${crypto.randomUUID()}`,
      category,
      name: "",
      company: phone || "QUO lead",
      email: "",
      phone,
      potential_value: 0,
      status: "new",
      source,
      notes,
      created_at: new Date().toISOString().slice(0, 10),
    };
    const { error } = await supabase.from("leads").insert(lead);
    if (error) throw error;
    return { kind: "lead", id: lead.id, category };
  }

  await supabase.from("settings").upsert(
    { key: "quo", value: { ...quoConfig, lastSyncedAt: new Date().toISOString() } },
    { onConflict: "key" }
  ).then(() => {}, () => {});

  try {
    // -------------------- CALLS --------------------
    if (eventType.startsWith("call") || kind === "call") {
      const incoming = str(obj.direction).toLowerCase().includes("in");
      const customerPhone = str(incoming ? obj.from : obj.to);

      const cs = asObj(obj.callSummary);
      const bullets = Array.isArray(cs.summary) ? (cs.summary as string[]) : [];
      const steps = Array.isArray(cs.nextSteps) ? (cs.nextSteps as string[]) : [];
      let summary = bullets.map((b) => `• ${b}`).join("\n");
      if (steps.length) summary += `${summary ? "\n\n" : ""}Next steps:\n` + steps.map((s) => `• ${s}`).join("\n");
      if (!summary) summary = str(obj.summary);

      const media = Array.isArray(obj.media) ? (obj.media as Json[]) : [];
      const recording = str(media[0]?.url ?? obj.recording_url);
      const duration = Number(media[0]?.duration ?? obj.duration ?? 0) || 0;
      const occurredAt = str(obj.completedAt || obj.createdAt) || new Date().toISOString();

      const client = await findClient(customerPhone);
      if (client) {
        const { error } = await supabase.from("calls").insert({
          id: `call_${crypto.randomUUID()}`,
          client_id: client.id,
          phone: customerPhone,
          direction: incoming ? "inbound" : "outbound",
          summary,
          transcript: "",
          recording_url: recording,
          duration_seconds: duration,
          category: client.category,
          occurred_at: occurredAt,
        });
        if (error) throw error;
        return json(200, { ok: true, kind: "call", clientId: client.id });
      }
      // Unknown caller → treat as a new lead, carrying the summary.
      const res = await createLead(customerPhone, summary, "quo-phone");
      return json(200, { ok: true, ...res, from: "call" });
    }

    // -------------------- MESSAGES --------------------
    if (eventType.startsWith("message") || kind === "message") {
      // Only act on inbound messages.
      if (eventType.includes("delivered") || str(obj.direction).toLowerCase().includes("out")) {
        return json(200, { ok: true, skipped: "outbound-message" });
      }
      const from = str(obj.from);
      const body = str(obj.body || obj.text);
      if (await findClient(from)) {
        return json(200, { ok: true, skipped: "existing-client" });
      }
      const res = await createLead(from, body, "quo-phone");
      return json(200, { ok: true, ...res, from: "message" });
    }

    return json(200, { ok: true, ignored: eventType || kind || "unknown" });
  } catch (e) {
    console.error("Failed to process Quo event", e);
    return json(500, { error: "Could not process event" });
  }
});
