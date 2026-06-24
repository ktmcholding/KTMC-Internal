// Admin-only employee management (Supabase Edge Function).
//
// Creating an auth user requires the service role, which must never live in the
// browser — so the frontend calls this function. The caller must be a signed-in
// admin (verified against the employees table).
//
// Deploy (JWT verification ON so only signed-in users can call it):
//   supabase functions deploy manage-employee
//
// Supabase injects SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function tempPassword(): string {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `Ktmc-${rand}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Missing authorization" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Identify the caller by validating their JWT with the service-role client
  // (avoids depending on the anon key being present in the environment).
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const {
    data: { user: caller },
  } = await admin.auth.getUser(token);
  if (!caller) return json(401, { error: "Not authenticated" });

  // Verify the caller is an active admin.
  const { data: callerProfile } = await admin
    .from("employees")
    .select("role, active")
    .eq("id", caller.id)
    .maybeSingle();
  if (!callerProfile || callerProfile.role !== "admin" || !callerProfile.active) {
    return json(403, { error: "Admins only" });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid body" });
  }

  const action = String(payload.action ?? "create");
  if (action !== "create") return json(400, { error: "Unsupported action" });

  const email = String(payload.email ?? "").trim();
  const name = String(payload.name ?? "").trim();
  const role = payload.role === "admin" ? "admin" : "employee";
  const title = String(payload.title ?? "").trim();
  const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
  if (!email) return json(400, { error: "Email is required" });

  // Create the auth user with a temporary password.
  const password = tempPassword();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (createErr || !created.user) {
    return json(400, { error: createErr?.message ?? "Could not create user" });
  }

  // Create their employee profile.
  const profile = {
    id: created.user.id,
    email,
    name: name || email.split("@")[0],
    role,
    title: title || (role === "admin" ? "Admin" : ""),
    permissions,
    active: true,
    created_at: new Date().toISOString().slice(0, 10),
  };
  const { data: inserted, error: insertErr } = await admin
    .from("employees")
    .insert(profile)
    .select()
    .single();
  if (insertErr) {
    // Roll back the auth user if the profile insert failed.
    await admin.auth.admin.deleteUser(created.user.id);
    return json(400, { error: insertErr.message });
  }

  return json(200, { employee: inserted, tempPassword: password });
});
