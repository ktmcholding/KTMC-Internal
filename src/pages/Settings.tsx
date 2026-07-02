import { useRef, useState } from "react";
import { UploadCloud, Building2, Save, Check, MessageSquareText } from "lucide-react";
import { useStore } from "../store/AppStore";
import { PageHeader } from "../components/PageHeader";
import { WritingSamples } from "../components/WritingSamples";

export function Settings() {
  const { state, dispatch } = useStore();
  const [company, setCompany] = useState(state.company);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof company>(k: K, v: (typeof company)[K]) {
    setCompany((c) => ({ ...c, [k]: v }));
    setSaved(false);
  }

  function onLetterhead(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_500_000) {
      alert("Please use an image under ~1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("letterhead", String(reader.result));
    reader.readAsDataURL(file);
  }

  function save() {
    dispatch({ type: "SET_COMPANY", company });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Settings"
        subtitle="Company details and branding used on invoices, documents and email sign-offs."
      />

      <div className="card space-y-5 p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-brand-100 p-2 text-brand-700">
            <Building2 size={18} />
          </span>
          <h2 className="text-sm font-semibold text-gray-900">Company details</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Company name</label>
            <input
              className="input"
              value={company.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Phone number</label>
            <input
              className="input"
              value={company.phone}
              placeholder="+1 (___) ___-____"
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Contact email (used in email sign-offs)</label>
            <input
              className="input"
              value={company.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Letterhead / header image</label>
          <p className="mb-2 text-xs text-gray-500">
            Appears at the top of invoices and generated documents. A wide banner
            (e.g. 1000×250) works best. PNG or JPG, under ~1.5 MB.
          </p>
          {company.letterhead ? (
            <div className="mb-2 rounded-lg border border-gray-200 p-3">
              <img
                src={company.letterhead}
                alt="Letterhead preview"
                className="max-h-28 w-full object-contain"
              />
            </div>
          ) : (
            <div className="mb-2 flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
              No letterhead uploaded
            </div>
          )}
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={() => fileRef.current?.click()}
            >
              <UploadCloud size={15} /> Upload image
            </button>
            {company.letterhead && (
              <button
                className="btn-ghost text-red-500"
                onClick={() => set("letterhead", "")}
              >
                Remove
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                onLetterhead(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
          <button className="btn-primary" onClick={save}>
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? "Saved" : "Save settings"}
          </button>
          <p className="text-xs text-gray-400">
            Email sign-off will read: <em>Cheers, {company.name}{" "}
            {company.phone && `(${company.phone})`} {company.email}</em>
          </p>
        </div>
      </div>

      <div className="card mt-6 space-y-4 p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-brand-100 p-2 text-brand-700">
            <MessageSquareText size={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Writing voice
            </h2>
            <p className="text-xs text-gray-500">
              Upload past emails and chat logs so AI-drafted emails sound like
              you. These samples are used every time you draft an email.
            </p>
          </div>
        </div>
        <WritingSamples
          examples={state.emailExamples}
          onChange={(examples) =>
            dispatch({ type: "SET_EMAIL_EXAMPLES", examples })
          }
        />
      </div>
    </div>
  );
}
