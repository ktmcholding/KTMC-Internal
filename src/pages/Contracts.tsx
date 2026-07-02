import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  FileSignature,
  Send,
  Copy,
  Check,
  Download,
  Mail,
  Pencil,
} from "lucide-react";
import type { Contract, ContractStatus } from "../types";
import { useStore } from "../store/AppStore";
import { useAuth } from "../store/AuthStore";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { Modal } from "../components/Modal";
import { formatDate, uid } from "../lib/format";
import { openContractPdf } from "../lib/contractPdf";

/** Reasonably unguessable token for the public signing link. */
function makeToken(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `${uid("t")}${uid("k")}`.replace(/_/g, "");
}

const TEMPLATES: { label: string; body: string }[] = [
  {
    label: "Blank",
    body: "",
  },
  {
    label: "Mutual NDA",
    body:
      "This Mutual Non-Disclosure Agreement is entered into between KTMC and the undersigned.\n\n1. Confidential Information. Each party may disclose confidential and proprietary information to the other for the purpose of evaluating and carrying out a potential or ongoing business relationship.\n\n2. Obligations. The receiving party agrees to keep all confidential information secret, to use it solely for that purpose, and not to disclose it to any third party without prior written consent.\n\n3. Term. These obligations remain in effect for three (3) years from the date of signing.\n\nBy signing below, the signer agrees to the terms of this agreement.",
  },
  {
    label: "Service / Formulation Agreement",
    body:
      "This Services Agreement is entered into between KTMC (\"Provider\") and the undersigned client (\"Client\").\n\n1. Services. Provider will perform the formulation and/or manufacturing services as described in the applicable quote or statement of work.\n\n2. Fees. Client agrees to pay the fees set out in the corresponding invoice(s), on the terms stated therein.\n\n3. Intellectual Property. Formulations and deliverables developed specifically for the Client become the Client's property upon full payment, excluding Provider's pre-existing know-how.\n\n4. Confidentiality. Both parties will keep each other's confidential information secret.\n\nBy signing below, the signer agrees to the terms of this agreement.",
  },
  {
    label: "White-Label Supply Agreement",
    body:
      "This White-Label Supply Agreement is entered into between KTMC (\"Supplier\") and the undersigned client (\"Buyer\").\n\n1. Products. Supplier will manufacture and supply the products under the Buyer's brand as agreed in writing.\n\n2. Orders & Pricing. Orders are placed via purchase order and invoiced at the agreed unit pricing.\n\n3. Quality. Products will meet the agreed specifications and applicable regulations.\n\n4. Term. This agreement continues until terminated by either party with thirty (30) days written notice.\n\nBy signing below, the signer agrees to the terms of this agreement.",
  },
];

const STATUS_STYLES: Record<ContractStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-amber-100 text-amber-700",
  signed: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
};

export function Contracts() {
  const { state, dispatch } = useStore();
  const contracts = state.contracts;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);

  const stats = useMemo(() => {
    return {
      total: contracts.length,
      awaiting: contracts.filter((c) => c.status === "sent").length,
      signed: contracts.filter((c) => c.status === "signed").length,
    };
  }, [contracts]);

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle="Create contracts, send them to clients for a signature, and keep the signed copies on file."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Contracts" value={String(stats.total)} tone="brand" />
        <StatCard label="Awaiting signature" value={String(stats.awaiting)} tone="amber" />
        <StatCard label="Signed" value={String(stats.signed)} tone="green" />
      </div>

      <div className="mt-6 card">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">All contracts</h2>
          <button className="btn-primary" onClick={openNew}>
            <Plus size={16} /> New contract
          </button>
        </div>

        {contracts.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <FileSignature className="mx-auto mb-2 text-gray-300" size={28} />
            <p className="text-sm text-gray-400">No contracts yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {contracts.map((c) => (
              <ContractRow
                key={c.id}
                contract={c}
                onEdit={() => {
                  setEditing(c);
                  setShowForm(true);
                }}
                onDelete={() => dispatch({ type: "DELETE_CONTRACT", id: c.id })}
              />
            ))}
          </ul>
        )}
      </div>

      {showForm && (
        <ContractModal
          contract={editing}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function ContractRow({
  contract: c,
  onEdit,
  onDelete,
}: {
  contract: Contract;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { state, dispatch } = useStore();
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/sign/${c.token}`;
  const clientName =
    state.clients.find((x) => x.id === c.clientId)?.company ?? "";

  function markSent() {
    dispatch({
      type: "UPDATE_CONTRACT",
      contract: {
        ...c,
        status: c.status === "signed" ? c.status : "sent",
        sentAt: c.sentAt ?? new Date().toISOString(),
      },
    });
  }

  function copyLink() {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    markSent();
    setTimeout(() => setCopied(false), 1500);
  }

  function emailLink() {
    markSent();
    const subject = encodeURIComponent(`Please sign: ${c.title}`);
    const body = encodeURIComponent(
      `Hi ${c.signerName || "there"},\n\nPlease review and sign the following document:\n${link}\n\nThank you.`
    );
    window.open(
      `mailto:${encodeURIComponent(c.signerEmail)}?subject=${subject}&body=${body}`,
      "_blank"
    );
  }

  return (
    <li className="px-5 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-gray-800">
              {c.title || "Untitled contract"}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[c.status]}`}
            >
              {c.status}
            </span>
          </div>
          <p className="truncate text-xs text-gray-500">
            {c.signerName || "No signer"}
            {c.signerEmail ? ` · ${c.signerEmail}` : ""}
            {clientName ? ` · ${clientName}` : ""}
          </p>
          <p className="text-xs text-gray-400">
            Created {formatDate(c.createdAt)}
            {c.status === "signed" && c.signedAt
              ? ` · Signed ${formatDate(c.signedAt)}`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {c.status !== "signed" && (
            <>
              <button
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                onClick={copyLink}
                title="Copy signing link"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                onClick={emailLink}
                title="Email signing link to client"
              >
                <Mail size={13} /> Email
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700"
                onClick={markSent}
                title="Mark as sent"
              >
                <Send size={13} /> Sent
              </button>
              <button
                className="text-gray-400 hover:text-brand-600"
                onClick={onEdit}
                title="Edit"
              >
                <Pencil size={15} />
              </button>
            </>
          )}
          <button
            className="text-gray-400 hover:text-brand-600"
            onClick={() => openContractPdf(c, state.company)}
            title="View / PDF"
          >
            <Download size={16} />
          </button>
          <button
            className="text-gray-400 hover:text-red-500"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </li>
  );
}

function ContractModal({
  contract,
  onClose,
}: {
  contract: Contract | null;
  onClose: () => void;
}) {
  const { state, dispatch } = useStore();
  const { user } = useAuth();
  const [title, setTitle] = useState(contract?.title ?? "");
  const [body, setBody] = useState(contract?.body ?? "");
  const [clientId, setClientId] = useState(contract?.clientId ?? "");
  const [signerName, setSignerName] = useState(contract?.signerName ?? "");
  const [signerEmail, setSignerEmail] = useState(contract?.signerEmail ?? "");

  function pickClient(id: string) {
    setClientId(id);
    const cl = state.clients.find((c) => c.id === id);
    if (cl) {
      if (!signerName) setSignerName(cl.name);
      if (!signerEmail) setSignerEmail(cl.email);
    }
  }

  function save() {
    if (!title.trim() || !body.trim()) return;
    if (contract) {
      dispatch({
        type: "UPDATE_CONTRACT",
        contract: {
          ...contract,
          title: title.trim(),
          body: body.trim(),
          clientId: clientId || undefined,
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
        },
      });
    } else {
      dispatch({
        type: "ADD_CONTRACT",
        contract: {
          id: uid("con"),
          title: title.trim(),
          body: body.trim(),
          clientId: clientId || undefined,
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          status: "draft",
          token: makeToken(),
          signerTypedName: "",
          signature: "",
          signedIp: "",
          signedUserAgent: "",
          createdBy: user?.email ?? "",
          createdAt: new Date().toISOString().slice(0, 10),
        },
      });
    }
    onClose();
  }

  return (
    <Modal
      open
      wide
      title={contract ? "Edit contract" : "New contract"}
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            {contract ? "Save changes" : "Create contract"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Title</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mutual Non-Disclosure Agreement"
            />
          </div>
          <div>
            <label className="label">Client (optional)</label>
            <select
              className="input"
              value={clientId}
              onChange={(e) => pickClient(e.target.value)}
            >
              <option value="">— None —</option>
              {state.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </select>
          </div>
          {!contract && (
            <div>
              <label className="label">Start from template</label>
              <select
                className="input"
                onChange={(e) => {
                  const t = TEMPLATES.find((x) => x.label === e.target.value);
                  if (t) setBody(t.body);
                }}
                defaultValue="Blank"
              >
                {TEMPLATES.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Signer name</label>
            <input
              className="input"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Signer email</label>
            <input
              className="input"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Contract text</label>
          <textarea
            className="input font-sans"
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write or paste the contract text here…"
          />
        </div>
      </div>
    </Modal>
  );
}
