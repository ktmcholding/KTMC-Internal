// AI email drafting (Supabase Edge Function, Deno runtime).
//
// Drafts a follow-up email summarising a client conversation, written in KTMC's
// own voice using uploaded past emails / chat transcripts as style examples.
// Uses Claude Haiku 4.5 via the official Anthropic SDK.
//
// Deploy (JWT verification ON — only signed-in users can call it):
//   supabase functions deploy draft-email
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.70.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

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

interface Body {
  clientName?: string;
  context?: string;
  instruction?: string;
  signature?: string;
  examples?: { label: string; content: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  if (!ANTHROPIC_API_KEY) {
    return json(400, {
      error:
        "AI email drafting is not configured. Set the ANTHROPIC_API_KEY secret on the draft-email function.",
    });
  }

  let payload: Body;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid request body" });
  }

  const clientName = (payload.clientName ?? "the client").trim();
  const context = (payload.context ?? "").trim();
  const instruction = (payload.instruction ?? "Write a friendly follow-up email.").trim();
  const signature = (payload.signature ?? "Cheers,\nKTMC\nSales@ktmcholdings.com").trim();
  const examples = Array.isArray(payload.examples) ? payload.examples : [];

  const styleBlock =
    examples.length > 0
      ? examples
          .map(
            (e, i) =>
              `Example ${i + 1}${e.label ? ` (${e.label})` : ""}:\n${e.content}`
          )
          .join("\n\n---\n\n")
      : "(No style samples provided — use a warm, professional, concise tone.)";

  const system =
    "You are an assistant that drafts follow-up emails on behalf of KTMC, a " +
    "contract manufacturing and product company. Match the writing style, tone " +
    "and greeting shown in the provided sample emails as closely as possible. " +
    "Keep the email concise and ready to send. Do not invent facts that are not " +
    "supported by the conversation context. The email body MUST end with exactly " +
    `this sign-off (verbatim, on its own lines, and nothing after it):\n${signature}\n` +
    'Respond with ONLY a JSON object of the form {"subject": "...", "body": "..."} ' +
    "and nothing else — no markdown, no code fences, no commentary.";

  const userContent =
    `Writing style samples to imitate:\n${styleBlock}\n\n` +
    `Client: ${clientName}\n\n` +
    `Conversation context / notes:\n${context || "(none provided)"}\n\n` +
    `What this email should accomplish:\n${instruction}\n\n` +
    `End the email with exactly this sign-off:\n${signature}`;

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  let text = "";
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: userContent }],
    });
    text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();
  } catch (e) {
    console.error("Anthropic request failed", e);
    return json(502, {
      error: e instanceof Error ? e.message : "AI request failed",
    });
  }

  // Parse the JSON the model returned, tolerating stray code fences.
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let subject = "Following up";
  let body = text;
  try {
    const parsed = JSON.parse(cleaned) as { subject?: string; body?: string };
    if (parsed.subject) subject = parsed.subject;
    if (parsed.body) body = parsed.body;
  } catch {
    // Leave the raw text as the body with a default subject.
  }

  return json(200, { subject, body });
});
