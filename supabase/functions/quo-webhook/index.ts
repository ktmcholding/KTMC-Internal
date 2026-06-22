// QUO → KTMC Internal lead webhook (Supabase Edge Function, Deno runtime).
//
// QUO (your business phone number + website) POSTs inbound contacts here and a
// new lead is created in the `leads` table, filed under the configured default
// category. Because QUO's exact payload varies, this function maps a range of
// common field names — adjust `LEAD_FIELDS` below if your QUO payload differs.
//
// Deploy:
//   supabase functions deploy quo-webhook --no-verify-jwt
//   supabase secrets set QUO_WEBHOOK_SECRET=<a-long-random-string>
//
// Then in QUO, set the webhook URL to:
//   https://<project-ref>.supabase.co/functions/v1/quo-webhook?secret=<same-secret>
// (or send the secret as an `x-quo-secret` header).

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

// Candidate field names, in priority order, for each lead attribute.
const LEAD_FIELDS = {
  name: ["name", "full_name", "fullName", "contact", "contact_name", "caller_name"],
  company: ["company", "company_name", "business", "organization", "organisation"],
  email: ["email", "email_address", "emailAddress"],
  phone: ["phone", "phone_number", "phoneNumber", "caller_id", "from", "tel", "number"],
  notes: ["message", "notes", "body", "summary", "transcript", "description", "comment"],
  value: ["potential_value", "potentialValue", "value", "estimated_value", "amount", "deal_value"],
  category: ["category"],
  channel: ["channel", "source", "type", "medium"],
};

type Payload = Record<string, unknown>;

function pick(obj: Payload, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function parseBody(req: Request): Promise<Payload> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await req.json()) as Payload;
  }
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData();
    return Object.fromEntries(form.entries());
  }
  // Best-effort: try JSON, then empty.
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

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  // Shared-secret auth (header or query param).
  const url = new URL(req.url);
  const provided =
    req.headers.get("x-quo-secret") ?? url.searchParams.get("secret") ?? "";
  if (!WEBHOOK_SECRET || provided !== WEBHOOK_SECRET) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  let payload: Payload;
  try {
    payload = await parseBody(req);
  } catch {
    return jsonResponse(400, { error: "Invalid request body" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Load the existing QUO config once (used for default category + sync time).
  const { data: quoSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "quo")
    .maybeSingle();
  const quoConfig = (quoSetting?.value as Record<string, unknown> | null) ?? {};

  // Resolve the category: payload override → configured default → fallback.
  let category = pick(payload, LEAD_FIELDS.category).toLowerCase();
  if (!VALID_CATEGORIES.includes(category)) {
    const def = quoConfig.defaultCategory as string | undefined;
    category = def && VALID_CATEGORIES.includes(def) ? def : "formulation";
  }

  // Phone vs website source.
  const channel = pick(payload, LEAD_FIELDS.channel).toLowerCase();
  const source =
    channel.includes("call") || channel.includes("phone") || channel.includes("voice")
      ? "quo-phone"
      : "quo-website";

  const today = new Date().toISOString().slice(0, 10);
  const lead = {
    id: `quo_${crypto.randomUUID()}`,
    category,
    name: pick(payload, LEAD_FIELDS.name),
    company: pick(payload, LEAD_FIELDS.company) || pick(payload, LEAD_FIELDS.name) || "QUO lead",
    email: pick(payload, LEAD_FIELDS.email),
    phone: pick(payload, LEAD_FIELDS.phone),
    potential_value: Number(pick(payload, LEAD_FIELDS.value)) || 0,
    status: "new",
    source,
    notes: pick(payload, LEAD_FIELDS.notes),
    created_at: today,
  };

  const { error } = await supabase.from("leads").insert(lead);
  if (error) {
    console.error("Failed to insert QUO lead", error);
    return jsonResponse(500, { error: "Could not save lead" });
  }

  // Record the sync time on the QUO settings row, preserving existing config.
  await supabase
    .from("settings")
    .upsert(
      {
        key: "quo",
        value: { ...quoConfig, lastSyncedAt: new Date().toISOString() },
      },
      { onConflict: "key" }
    )
    .then(() => {}, () => {});

  return jsonResponse(200, { ok: true, id: lead.id, category, source });
});
