// Public contract signing (Supabase Edge Function, Deno runtime).
//
// Clients are NOT app users, so this endpoint is public (no JWT). All access is
// gated by the contract's random token; the contracts table itself stays
// locked to authenticated staff. This function uses the service role.
//
// Actions (POST JSON { token, action, ... }):
//   - "get"     → returns the public view of the contract for the sign page.
//   - "sign"    → records the typed name + drawn signature, marks it signed.
//   - "decline" → marks the contract declined.
//
// Deploy:  supabase functions deploy sign-contract --no-verify-jwt
//   (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid request body" });
  }

  const token = str(payload.token).trim();
  const action = str(payload.action).trim() || "get";
  if (!token) return json(400, { error: "Missing token" });

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: row, error } = await db
    .from("contracts")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) return json(500, { error: "Lookup failed" });
  if (!row) return json(404, { error: "This signing link is not valid." });

  // Public view (never expose internal-only columns).
  const publicView = {
    id: row.id,
    title: row.title,
    body: row.body,
    signerName: row.signer_name,
    status: row.status,
    signedAt: row.signed_at,
    signerTypedName: row.signer_typed_name,
  };

  if (action === "get") {
    return json(200, { contract: publicView });
  }

  if (action === "sign") {
    if (row.status === "signed") {
      return json(409, { error: "This contract has already been signed." });
    }
    const typedName = str(payload.typedName).trim();
    const signature = str(payload.signatureDataUrl).trim();
    if (!typedName && !signature) {
      return json(400, {
        error: "Please type your name or draw a signature before signing.",
      });
    }
    const ip =
      str(req.headers.get("x-forwarded-for")).split(",")[0].trim() ||
      str(req.headers.get("x-real-ip"));
    const ua = str(req.headers.get("user-agent")).slice(0, 400);
    const { error: upErr } = await db
      .from("contracts")
      .update({
        status: "signed",
        signer_typed_name: typedName,
        signature,
        signed_ip: ip,
        signed_user_agent: ua,
        signed_at: new Date().toISOString(),
      })
      .eq("token", token);
    if (upErr) return json(500, { error: "Could not save your signature." });
    return json(200, { ok: true, status: "signed" });
  }

  if (action === "decline") {
    const { error: upErr } = await db
      .from("contracts")
      .update({ status: "declined" })
      .eq("token", token);
    if (upErr) return json(500, { error: "Could not update the contract." });
    return json(200, { ok: true, status: "declined" });
  }

  return json(400, { error: "Unknown action" });
});
