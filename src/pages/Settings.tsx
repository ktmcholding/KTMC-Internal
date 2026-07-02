import { useRef, useState } from "react";
import {
  UploadCloud,
  Building2,
  Save,
  Check,
  MessageSquareText,
  ReceiptText,
} from "lucide-react";
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

      <InvoiceTemplateCard />
    </div>
  );
}

function InvoiceTemplateCard() {
  const { state, dispatch } = useStore();
  const [tpl, setTpl] = useState(state.invoiceTemplate);
  const [saved, setSaved] = useState(false);
  const exampleRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof tpl>(k: K, v: (typeof tpl)[K]) {
    setTpl((t) => ({ ...t, [k]: v }));
    setSaved(false);
  }

  function onExample(file: File | undefined) {
    if (!file) return;
    if (file.size > 2_000_000) {
      alert("Please use an image under ~2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("exampleImage", String(reader.result));
    reader.readAsDataURL(file);
  }

  function save() {
    dispatch({ type: "SET_INVOICE_TEMPLATE", template: tpl });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card mt-6 space-y-5 p-6">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-brand-100 p-2 text-brand-700">
          <ReceiptText size={18} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Invoice template
          </h2>
          <p className="text-xs text-gray-500">
            These details print on every invoice you generate, alongside your
            letterhead.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Business address</label>
          <textarea
            className="input"
            rows={3}
            value={tpl.fromAddress}
            placeholder={"123 Main St\nCity, Province  A1A 1A1\nCanada"}
            onChange={(e) => set("fromAddress", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Payment instructions</label>
          <textarea
            className="input"
            rows={3}
            value={tpl.paymentInstructions}
            placeholder={"e-Transfer to sales@ktmcholdings.com\nor Bank: … Account: …"}
            onChange={(e) => set("paymentInstructions", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Business / tax number</label>
          <input
            className="input"
            value={tpl.businessNumber}
            placeholder="e.g. GST/HST 123456789 RT0001"
            onChange={(e) => set("businessNumber", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tax label</label>
            <input
              className="input"
              value={tpl.taxLabel}
              placeholder="GST/HST"
              onChange={(e) => set("taxLabel", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Tax rate (%)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.1"
              value={tpl.taxRate}
              onChange={(e) => set("taxRate", Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Default terms / notes (pre-filled on new invoices)</label>
          <input
            className="input"
            value={tpl.defaultTerms}
            onChange={(e) => set("defaultTerms", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Footer line</label>
          <input
            className="input"
            value={tpl.footer}
            onChange={(e) => set("footer", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Example invoice (reference)</label>
        <p className="mb-2 text-xs text-gray-500">
          Upload a picture of an invoice you already use. It's kept here as a
          reference so you can match the fields above — generated invoices are
          built from those fields + your letterhead.
        </p>
        {tpl.exampleImage ? (
          <div className="mb-2 rounded-lg border border-gray-200 p-3">
            <img
              src={tpl.exampleImage}
              alt="Example invoice"
              className="max-h-60 w-full object-contain"
            />
          </div>
        ) : (
          <div className="mb-2 flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
            No example uploaded
          </div>
        )}
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => exampleRef.current?.click()}
          >
            <UploadCloud size={15} /> Upload example
          </button>
          {tpl.exampleImage && (
            <button
              className="btn-ghost text-red-500"
              onClick={() => set("exampleImage", "")}
            >
              Remove
            </button>
          )}
          <input
            ref={exampleRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onExample(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <button className="btn-primary" onClick={save}>
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? "Saved" : "Save invoice template"}
        </button>
      </div>
    </div>
  );
}
