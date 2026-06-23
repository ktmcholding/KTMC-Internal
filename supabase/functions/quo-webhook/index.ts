// QUO → KTMC Internal webhook (Supabase Edge Function, Deno runtime).
//
// Handles two kinds of inbound events from QUO:
//   1. Leads (phone enquiry / website form) → creates a row in `leads`,
//      routed to a category by keyword matching on what the client wrote.
//   2. Call summaries (after a phone call) → creates a row in `calls`,
//      matched to the client by phone number so it shows on their profile.
//
// Deploy:
//   supabase functions deploy quo-webhook --no-verify-jwt
//   supabase secrets set QUO_WEBHOOK_SECRET=<a-long-random-string>
//
// QUO webhook URL:
//   https://<project-ref>.supabase.co/functions/v1/quo-webhook?secret=<secret>

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

// Keyword routing: the lead/call text is scanned and filed under the category
// with the most keyword hits. Edit these lists to match how your clients talk.
const KEYWORDS: Record<string, string[]> = {
  formulation: [
    "formula", "formulation", "ingredient", "recipe", "r&d", "develop a",
    "serum", "cream", "lotion", "sunscreen", "spf", "stability", "active",
  ],
  "co-packing": [
    "co-pack", "copack", "co pack", "fill", "filling", "bottling", "canning",
    "packaging", "contract manufactur", "production run", "assembly", "blister",
  ],
  "private-white-label": [
    "white label", "white-label", "private label", "private-label", "rebrand",
    "our own brand", "label it", "catalog", "catalogue", "ready made",
  ],
  "our-brands": [
    "wholesale", "retail", "stock your", "distribut", "reseller",
    "purchase order", "house brand", "buy your", "bulk order",
  ],
  software: [
    "software", "app", "platform", "api", "integration", "dashboard", "saas",
    "demo request", "website", "build a tool", "automation",
  ],
};

const LEAD_FIELDS = {
  name: ["name", "full_name", "fullName", "contact", "contact_name", "caller_name"],
  company: ["company", "company_name", "business", "organization", "organisation"],
  email: ["email", "email_address", "emailAddress"],
  phone: ["phone", "phone_number", "phoneNumber", "caller_id", "from", "tel", "number"],
  notes: ["message", "notes", "body", "summary", "transcript", "description", "comment", "subject"],
  value: ["potential_value", "potentialValue", "value", "estimated_value", "amount", "deal_value"],
  category: ["category"],
  channel: ["channel", "source", "type", "medium"],
};

const CALL_FIELDS = {
  phone: ["phone", "phone_number", "caller_id", "from", "to", "tel", "number"],
  summary: ["summary", "call_summary", "notes", "description"],
  transcript: ["transcript", "body", "text"],
  recording: ["recording_url", "recording", "recordingUrl", "audio_url", "media_url"],
  duration: ["duration", "duration_seconds", "call_duration", "length"],
  direction: ["direction"],
  occurredAt: ["occurred_at", "timestamp", "started_at", "time", "date"],
};

type Payload = Record<string, unknown>;

function pick(obj: Payload, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function classifyCategory(text: string): string | null {
  const lower = text.toLowerCase();
  let best: string | null = null;
  let bestScore = 0;
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    let score = 0;
    for (const w of words) if (lower.includes(w)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return bestScore > 0 ? best : null;
}

/** Last 10 digits of a phone number, for fuzzy matching. */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function parseBody(req: Request): Promise<Payload> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await req.json()) as Payload;
  if (ct.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries(form.entries());
  }
  try {
    return (await req.json()) as Payload;
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
  const provided =
    req.headers.get("x-quo-secret") ?? url.searchParams.get("secret") ?? "";
  if (!WEBHOOK_SECRET || provided !== WEBHOOK_SECRET) {
    return json(401, { error: "Unauthorized" });
  }

  let payload: Payload;
  try {
    payload = await parseBody(req);
  } catch {
    return json(400, { error: "Invalid request body" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: quoSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "quo")
    .maybeSingle();
  const quoConfig = (quoSetting?.value as Record<string, unknown> | null) ?? {};

  const eventType = pick(payload, ["type", "event", "event_type", "kind"]).toLowerCase();
  const hasCallData =
    pick(payload, CALL_FIELDS.summary) !== "" ||
    pick(payload, CALL_FIELDS.transcript) !== "" ||
    pick(payload, CALL_FIELDS.recording) !== "";
  const isCall = eventType.includes("call") || (!eventType && hasCallData);

  // -------------------------------------------------------------------------
  // Call summary → attach to the matching client
  // -------------------------------------------------------------------------
  if (isCall) {
    const phone = pick(payload, CALL_FIELDS.phone);
    const summary = pick(payload, CALL_FIELDS.summary);
    const transcript = pick(payload, CALL_FIELDS.transcript);
    const norm = normalizePhone(phone);

    // Find a client whose phone matches (best-effort, by last 10 digits).
    let clientId: string | null = null;
    let category: string | null = null;
    if (norm) {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, phone, category");
      const match = (clients ?? []).find(
        (c) => normalizePhone(String(c.phone ?? "")) === norm
      );
      if (match) {
        clientId = String(match.id);
        category = String(match.category);
      }
    }
    if (!category) category = classifyCategory(`${summary} ${transcript}`);

    const direction = pick(payload, CALL_FIELDS.direction) || "inbound";
    const occurredAt = pick(payload, CALL_FIELDS.occurredAt) || new Date().toISOString();

    const call = {
      id: `call_${crypto.randomUUID()}`,
      client_id: clientId,
      phone,
      direction: direction.toLowerCase().includes("out") ? "outbound" : "inbound",
      summary,
      transcript,
      recording_url: pick(payload, CALL_FIELDS.recording),
      duration_seconds: Number(pick(payload, CALL_FIELDS.duration)) || 0,
      category,
      occurred_at: occurredAt,
    };

    const { error } = await supabase.from("calls").insert(call);
    if (error) {
      console.error("Failed to insert call", error);
      return json(500, { error: "Could not save call" });
    }
    return json(200, { ok: true, kind: "call", id: call.id, clientId, matched: !!clientId });
  }

  // -------------------------------------------------------------------------
  // Lead → keyword-routed to a category
  // -------------------------------------------------------------------------
  const message = pick(payload, LEAD_FIELDS.notes);
  let category = pick(payload, LEAD_FIELDS.category).toLowerCase();
  if (!VALID_CATEGORIES.includes(category)) {
    const classified = classifyCategory(message);
    if (classified) {
      category = classified;
    } else {
      const def = quoConfig.defaultCategory as string | undefined;
      category = def && VALID_CATEGORIES.includes(def) ? def : "formulation";
    }
  }

  const channel = pick(payload, LEAD_FIELDS.channel).toLowerCase();
  const source =
    channel.includes("call") || channel.includes("phone") || channel.includes("voice")
      ? "quo-phone"
      : "quo-website";

  const lead = {
    id: `quo_${crypto.randomUUID()}`,
    category,
    name: pick(payload, LEAD_FIELDS.name),
    company:
      pick(payload, LEAD_FIELDS.company) || pick(payload, LEAD_FIELDS.name) || "QUO lead",
    email: pick(payload, LEAD_FIELDS.email),
    phone: pick(payload, LEAD_FIELDS.phone),
    potential_value: Number(pick(payload, LEAD_FIELDS.value)) || 0,
    status: "new",
    source,
    notes: message,
    created_at: new Date().toISOString().slice(0, 10),
  };

  const { error } = await supabase.from("leads").insert(lead);
  if (error) {
    console.error("Failed to insert QUO lead", error);
    return json(500, { error: "Could not save lead" });
  }

  await supabase
    .from("settings")
    .upsert(
      { key: "quo", value: { ...quoConfig, lastSyncedAt: new Date().toISOString() } },
      { onConflict: "key" }
    )
    .then(() => {}, () => {});

  return json(200, { ok: true, kind: "lead", id: lead.id, category, source });
});
