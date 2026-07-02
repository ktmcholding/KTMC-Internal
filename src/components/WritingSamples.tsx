import { useRef, useState } from "react";
import { Plus, Trash2, UploadCloud, Loader2, FileText } from "lucide-react";
import type { EmailExample } from "../types";
import { uid } from "../lib/format";

/** Max characters kept per sample so the AI prompt stays a sane size. */
const MAX_CHARS = 8000;
/** File types we can read as text (emails, chat logs, notes). */
const ACCEPT = ".txt,.md,.eml,.csv,.log,.html,.htm,.json,.vtt,text/*";

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function clip(text: string): string {
  const t = text.trim();
  return t.length > MAX_CHARS
    ? t.slice(0, MAX_CHARS) + "\n…(truncated)"
    : t;
}

/**
 * Manage the writing-voice samples used to teach the AI how you write.
 * Users can paste text or upload past emails / chat logs (text files).
 * The `examples` are stored globally (settings.email_examples) and sent to
 * the draft-email function on every draft.
 */
export function WritingSamples({
  examples,
  onChange,
}: {
  examples: EmailExample[];
  onChange: (examples: EmailExample[]) => void;
}) {
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function addPasted() {
    if (!content.trim()) return;
    onChange([
      ...examples,
      {
        id: uid("ex"),
        label: label.trim() || "Sample",
        content: clip(content),
      },
    ]);
    setLabel("");
    setContent("");
    setNote(null);
  }

  async function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setNote(null);
    const added: EmailExample[] = [];
    const skipped: string[] = [];
    for (const file of Array.from(fileList)) {
      try {
        const text = await readTextFile(file);
        if (!text.trim()) {
          skipped.push(file.name);
          continue;
        }
        added.push({
          id: uid("ex"),
          label: file.name.replace(/\.[^.]+$/, ""),
          content: clip(text),
        });
      } catch {
        skipped.push(file.name);
      }
    }
    if (added.length) onChange([...examples, ...added]);
    setBusy(false);
    const parts: string[] = [];
    if (added.length) parts.push(`Added ${added.length} sample(s).`);
    if (skipped.length)
      parts.push(
        `Couldn't read ${skipped.length} file(s) (${skipped.join(
          ", "
        )}) — upload text files like .txt, .eml, .md or exported chat logs.`
      );
    setNote(parts.join(" ") || null);
  }

  return (
    <div className="space-y-3">
      {examples.length > 0 && (
        <ul className="space-y-2">
          {examples.map((e) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-2 rounded-md bg-gray-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                  <FileText size={13} className="shrink-0 text-gray-400" />
                  {e.label}
                  <span className="font-normal text-gray-400">
                    · {e.content.length.toLocaleString()} chars
                  </span>
                </p>
                <p className="line-clamp-2 whitespace-pre-wrap text-xs text-gray-500">
                  {e.content}
                </p>
              </div>
              <button
                className="text-gray-400 hover:text-red-500"
                onClick={() => onChange(examples.filter((x) => x.id !== e.id))}
                aria-label="Remove sample"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {note && (
        <p className="rounded-md bg-brand-50 px-3 py-2 text-xs text-brand-700">
          {note}
        </p>
      )}

      {/* Upload files */}
      <div>
        <button
          className="btn-secondary w-full justify-center"
          onClick={() => !busy && fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <UploadCloud size={15} />
          )}
          {busy ? "Reading files…" : "Upload past emails / chat logs"}
        </button>
        <p className="mt-1 text-center text-xs text-gray-400">
          Text files — .txt, .eml, .md, .csv, exported chats. Each is capped at
          ~8k characters.
        </p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Or paste */}
      <div className="space-y-2 border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-gray-500">Or paste a sample</p>
        <input
          className="input"
          placeholder="Label (e.g. 'Follow-up after a call')"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <textarea
          className="input"
          rows={3}
          placeholder="Paste a past email or chat conversation to mimic the tone…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button className="btn-secondary" onClick={addPasted}>
          <Plus size={15} /> Add sample
        </button>
      </div>
    </div>
  );
}
