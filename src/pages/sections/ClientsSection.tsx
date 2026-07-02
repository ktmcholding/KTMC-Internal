import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PlayCircle,
  Mail,
  Target,
  CheckCircle2,
  Circle,
  FolderPlus,
} from "lucide-react";
import type {
  CallRecord,
  CategoryId,
  Client,
  ClientDocument,
  ClientGoal,
} from "../../types";
import { useStore } from "../../store/AppStore";
import { useAuth } from "../../store/AuthStore";
import { StatCard } from "../../components/StatCard";
import { Modal } from "../../components/Modal";
import { DraftEmailModal } from "../../components/DraftEmailModal";
import { DocumentDropzone } from "../../components/DocumentDropzone";
import { formatCurrency, formatDate, uid } from "../../lib/format";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getDocumentUrl, uploadClientDocuments } from "../../lib/api";

export function ClientsSection({ category }: { category: CategoryId }) {
  const { clientsByCategory, dispatch, state } = useStore();
  const clients = clientsByCategory(category);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(clients[0]?.id ?? null);
  const [draftFor, setDraftFor] = useState<Client | null>(null);

  const totalRecurring = clients.reduce((s, c) => s + c.recurringRevenue, 0);
  const totalDocs = clients.reduce((s, c) => s + c.documents.length, 0);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Clients" value={String(clients.length)} tone="brand" />
        <StatCard
          label="Recurring revenue"
          value={`${formatCurrency(totalRecurring)}/mo`}
          tone="green"
        />
        <StatCard label="Documents on file" value={String(totalDocs)} tone="default" />
      </div>

      <div className="mt-6 card">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Manage clients</h2>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add client
          </button>
        </div>

        {clients.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">
            No clients in this category yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {clients.map((c) => {
              const open = expanded === c.id;
              return (
                <li key={c.id}>
                  <button
                    className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-gray-50"
                    onClick={() => setExpanded(open ? null : c.id)}
                  >
                    <div className="flex items-center gap-2">
                      {open ? (
                        <ChevronDown size={16} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {c.company}
                        </p>
                        <p className="text-xs text-gray-500">
                          {c.name} · {c.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-400">
                        {c.documents.length} docs
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {formatCurrency(c.recurringRevenue)}/mo
                      </span>
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4">
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Details
                          </h3>
                          <dl className="space-y-1.5 text-sm">
                            <Row label="Contact" value={c.name} />
                            <Row label="Email" value={c.email} />
                            <Row label="Phone" value={c.phone} />
                            <Row
                              label="Recurring"
                              value={`${formatCurrency(c.recurringRevenue)}/mo`}
                            />
                            <Row label="Client since" value={formatDate(c.createdAt)} />
                          </dl>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              className="btn-secondary px-2.5 py-1 text-xs"
                              onClick={() => setDraftFor(c)}
                            >
                              <Mail size={13} /> Draft email
                            </button>
                            <button
                              className="btn-ghost px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                              onClick={() =>
                                dispatch({ type: "DELETE_CLIENT", id: c.id })
                              }
                            >
                              <Trash2 size={13} /> Remove client
                            </button>
                          </div>
                          <ClientNotes client={c} />
                          <ClientGoals client={c} />
                        </div>
                        <ClientDocuments client={c} />
                      </div>

                      <CallTimeline
                        calls={state.calls
                          .filter((cl) => cl.clientId === c.id)
                          .sort((a, b) =>
                            b.occurredAt.localeCompare(a.occurredAt)
                          )}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showAdd && (
        <AddClientModal
          category={category}
          onClose={() => setShowAdd(false)}
          onCreated={(id) => setExpanded(id)}
        />
      )}
      {draftFor && (
        <DraftEmailModal client={draftFor} onClose={() => setDraftFor(null)} />
      )}
    </div>
  );
}

function ClientNotes({ client }: { client: Client }) {
  const { dispatch } = useStore();
  const [notes, setNotes] = useState(client.notes ?? "");
  return (
    <div className="mt-4">
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Notes
      </h3>
      <textarea
        className="input"
        rows={3}
        value={notes}
        placeholder="Add notes about this client…"
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => {
          if (notes !== (client.notes ?? "")) {
            dispatch({ type: "UPDATE_CLIENT", client: { ...client, notes } });
          }
        }}
      />
    </div>
  );
}

function ClientGoals({ client }: { client: Client }) {
  const { dispatch } = useStore();
  const goals = client.goals ?? [];
  const [newGoal, setNewGoal] = useState("");
  const done = goals.filter((g) => g.done).length;
  const pct = goals.length ? Math.round((done / goals.length) * 100) : 0;

  function save(next: ClientGoal[]) {
    dispatch({ type: "UPDATE_CLIENT", client: { ...client, goals: next } });
  }

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <Target size={13} /> Goals &amp; progress
        </h3>
        <span className="text-xs font-medium text-gray-500">
          {done}/{goals.length} · {pct}%
        </span>
      </div>
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-1">
        {goals.map((g) => (
          <li key={g.id} className="flex items-center gap-2">
            <button
              className="text-gray-400 hover:text-brand-600"
              onClick={() =>
                save(
                  goals.map((x) =>
                    x.id === g.id ? { ...x, done: !x.done } : x
                  )
                )
              }
              aria-label={g.done ? "Mark not done" : "Mark done"}
            >
              {g.done ? (
                <CheckCircle2 size={16} className="text-emerald-500" />
              ) : (
                <Circle size={16} />
              )}
            </button>
            <span
              className={`flex-1 text-sm ${
                g.done ? "text-gray-400 line-through" : "text-gray-700"
              }`}
            >
              {g.label}
            </span>
            <button
              className="text-gray-300 hover:text-red-500"
              onClick={() => save(goals.filter((x) => x.id !== g.id))}
              aria-label="Remove goal"
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          className="input py-1.5 text-sm"
          placeholder="Add a goal…"
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newGoal.trim()) {
              save([...goals, { id: uid("g"), label: newGoal.trim(), done: false }]);
              setNewGoal("");
            }
          }}
        />
        <button
          className="btn-secondary px-2.5 py-1.5"
          onClick={() => {
            if (!newGoal.trim()) return;
            save([...goals, { id: uid("g"), label: newGoal.trim(), done: false }]);
            setNewGoal("");
          }}
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

function ClientDocuments({ client }: { client: Client }) {
  const { state, dispatch } = useStore();
  const { isAdmin } = useAuth();
  const sections = state.clientDocSections;

  async function add(files: File[], sectionId: string) {
    let docs: ClientDocument[];
    if (isSupabaseConfigured) {
      docs = await uploadClientDocuments(client.id, files, sectionId);
    } else {
      docs = files.map((f) => ({
        id: uid("doc"),
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
        section: sectionId,
        uploadedAt: new Date().toISOString().slice(0, 10),
      }));
    }
    dispatch({ type: "ADD_CLIENT_DOCUMENTS", clientId: client.id, documents: docs });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Documents
        </h3>
        {isAdmin && (
          <button
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            onClick={() => {
              const name = window.prompt(
                "Name for the new document area (e.g. Contracts):"
              );
              if (name && name.trim()) {
                dispatch({
                  type: "SET_CLIENT_DOC_SECTIONS",
                  sections: [
                    ...sections,
                    { id: uid("sec"), name: name.trim() },
                  ],
                });
              }
            }}
          >
            <FolderPlus size={13} /> Add area
          </button>
        )}
      </div>
      <div className="space-y-4">
        {sections.map((s) => {
          const sectionDocs = client.documents.filter(
            (d) => (d.section || "general") === s.id
          );
          return (
            <div key={s.id}>
              <p className="mb-1 text-xs font-medium text-gray-600">{s.name}</p>
              <DocumentDropzone
                documents={sectionDocs}
                onAdd={(files) => add(files, s.id)}
                onRemove={(docId) => {
                  const doc = client.documents.find((d) => d.id === docId);
                  dispatch({
                    type: "DELETE_CLIENT_DOCUMENT",
                    clientId: client.id,
                    documentId: docId,
                    path: doc?.path,
                  });
                }}
                onRename={(docId, name) =>
                  dispatch({
                    type: "RENAME_CLIENT_DOCUMENT",
                    clientId: client.id,
                    documentId: docId,
                    name,
                  })
                }
                onOpen={
                  isSupabaseConfigured
                    ? async (doc) => {
                        if (!doc.path) return;
                        const url = await getDocumentUrl(doc.path);
                        if (url) window.open(url, "_blank");
                      }
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function CallTimeline({ calls }: { calls: CallRecord[] }) {
  return (
    <div className="mt-5">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <Phone size={13} /> Call history ({calls.length})
      </h3>
      {calls.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-4 text-center text-xs text-gray-400">
          No calls recorded yet. QUO call summaries for this client appear here
          automatically.
        </p>
      ) : (
        <ul className="space-y-2">
          {calls.map((call) => (
            <li
              key={call.id}
              className="rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                  {call.direction === "outbound" ? (
                    <PhoneOutgoing size={13} className="text-brand-500" />
                  ) : (
                    <PhoneIncoming size={13} className="text-emerald-500" />
                  )}
                  {call.direction === "outbound" ? "Outbound" : "Inbound"} call
                  {call.durationSeconds > 0 && (
                    <span className="text-gray-400">
                      · {formatDuration(call.durationSeconds)}
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(call.occurredAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-700">
                {call.summary || "(No summary provided)"}
              </p>
              {call.recordingUrl && (
                <a
                  href={call.recordingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  <PlayCircle size={14} /> Listen to recording
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-800">{value}</dd>
    </div>
  );
}

function AddClientModal({
  category,
  onClose,
  onCreated,
}: {
  category: CategoryId;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { dispatch } = useStore();
  const [form, setForm] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
    recurringRevenue: "",
  });

  function save() {
    if (!form.company.trim()) return;
    const id = uid("cli");
    const client: Client = {
      id,
      category,
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      recurringRevenue: parseFloat(form.recurringRevenue) || 0,
      documents: [],
      notes: "",
      goals: [],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    dispatch({ type: "ADD_CLIENT", client });
    onCreated(id);
    onClose();
  }

  return (
    <Modal
      open
      title="Add client"
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            Add client
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Company</label>
          <input
            className="input"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Contact name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Recurring (USD/mo)</label>
          <input
            className="input"
            type="number"
            min="0"
            value={form.recurringRevenue}
            onChange={(e) =>
              setForm((f) => ({ ...f, recurringRevenue: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            className="input"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
      </div>
    </Modal>
  );
}
