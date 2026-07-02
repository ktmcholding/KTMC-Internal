import { useMemo, useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
  Mail,
} from "lucide-react";
import type { Client, EmailExample } from "../types";
import { useStore } from "../store/AppStore";
import { Modal } from "./Modal";
import { WritingSamples } from "./WritingSamples";
import { isSupabaseConfigured } from "../lib/supabase";
import { draftEmail } from "../lib/api";
import { emailSignature, withSignature } from "../lib/emailSignature";

export function DraftEmailModal({
  client,
  onClose,
}: {
  client: Client;
  onClose: () => void;
}) {
  const { state, dispatch } = useStore();

  // Pre-fill the conversation context from this client's recent calls.
  const defaultContext = useMemo(() => {
    const calls = state.calls
      .filter((c) => c.clientId === client.id)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
      .slice(0, 3);
    if (calls.length === 0) return "";
    return calls
      .map((c) => `Call on ${c.occurredAt.slice(0, 10)}: ${c.summary}`)
      .join("\n");
  }, [state.calls, client.id]);

  const [context, setContext] = useState(defaultContext);
  const [instruction, setInstruction] = useState(
    "Write a friendly follow-up email summarising our conversation and the agreed next steps."
  );
  const [showSamples, setShowSamples] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      if (isSupabaseConfigured) {
        const res = await draftEmail({
          clientName: client.name || client.company,
          context,
          instruction,
          signature: emailSignature(state.company),
          examples: state.emailExamples.map((e) => ({
            label: e.label,
            content: e.content,
          })),
        });
        setDraft({ ...res, body: withSignature(res.body, state.company) });
      } else {
        // Demo mode: no AI — fill a basic template from the first sample.
        const base = state.emailExamples[0]?.content ?? "Hi {{name}},\n\n";
        const body =
          base.replace(/\{\{name\}\}/g, client.name || client.company) +
          (context ? `\n\nNotes from our conversation:\n${context}` : "");
        setDraft({
          subject: `Following up — ${client.company}`,
          body: withSignature(body, state.company),
        });
        setError(
          "Demo mode produced a template. Connect Supabase + add an Anthropic key for AI-written drafts."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the draft.");
    } finally {
      setBusy(false);
    }
  }

  function copyDraft() {
    if (!draft) return;
    navigator.clipboard?.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function openInMail() {
    if (!draft) return;
    const url = `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent(
      draft.subject
    )}&body=${encodeURIComponent(draft.body)}`;
    window.open(url, "_blank");
  }

  return (
    <Modal
      open
      wide
      title={`Draft email — ${client.company}`}
      onClose={onClose}
      footer={
        draft ? (
          <>
            <button className="btn-secondary mr-auto" onClick={() => setDraft(null)}>
              Start over
            </button>
            <button className="btn-secondary" onClick={copyDraft}>
              {copied ? <Check size={15} /> : <Copy size={15} />} Copy
            </button>
            <button className="btn-primary" onClick={openInMail} disabled={!client.email}>
              <Mail size={15} /> Open in email
            </button>
          </>
        ) : (
          <>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={generate} disabled={busy}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {busy ? "Drafting…" : "Generate draft"}
            </button>
          </>
        )
      }
    >
      {error && (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {error}
        </div>
      )}

      {!draft ? (
        <div className="space-y-4">
          <div>
            <label className="label">What did you talk about? (context)</label>
            <textarea
              className="input"
              rows={4}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Paste notes, or they'll be pulled from recent calls…"
            />
          </div>
          <div>
            <label className="label">What should this email do?</label>
            <input
              className="input"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </div>

          <StyleSamples
            examples={state.emailExamples}
            open={showSamples}
            onToggle={() => setShowSamples((s) => !s)}
            onChange={(examples) =>
              dispatch({ type: "SET_EMAIL_EXAMPLES", examples })
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="label">Subject</label>
            <input
              className="input"
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Body (editable)</label>
            <textarea
              className="input font-sans"
              rows={14}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

function StyleSamples({
  examples,
  open,
  onToggle,
  onChange,
}: {
  examples: EmailExample[];
  open: boolean;
  onToggle: () => void;
  onChange: (examples: EmailExample[]) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
        onClick={onToggle}
      >
        <span className="flex items-center gap-1.5">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          Writing style samples ({examples.length})
        </span>
        <span className="text-xs font-normal text-gray-400">
          Your past emails / chats — used as the voice
        </span>
      </button>
      {open && (
        <div className="border-t border-gray-100 p-3">
          <WritingSamples examples={examples} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
