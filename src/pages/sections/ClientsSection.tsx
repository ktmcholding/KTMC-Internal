import { useState } from "react";
import { Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import type { CategoryId, Client, ClientDocument } from "../../types";
import { useStore } from "../../store/AppStore";
import { StatCard } from "../../components/StatCard";
import { Modal } from "../../components/Modal";
import { DocumentDropzone } from "../../components/DocumentDropzone";
import { formatCurrency, formatDate, uid } from "../../lib/format";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getDocumentUrl, uploadClientDocuments } from "../../lib/api";

export function ClientsSection({ category }: { category: CategoryId }) {
  const { clientsByCategory, dispatch } = useStore();
  const clients = clientsByCategory(category);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(clients[0]?.id ?? null);

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
                          <button
                            className="btn-ghost mt-3 px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                            onClick={() =>
                              dispatch({ type: "DELETE_CLIENT", id: c.id })
                            }
                          >
                            <Trash2 size={13} /> Remove client
                          </button>
                        </div>
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Documents
                          </h3>
                          <DocumentDropzone
                            documents={c.documents}
                            onAdd={async (files) => {
                              let docs: ClientDocument[];
                              if (isSupabaseConfigured) {
                                docs = await uploadClientDocuments(c.id, files);
                              } else {
                                docs = files.map((f) => ({
                                  id: uid("doc"),
                                  name: f.name,
                                  size: f.size,
                                  type: f.type || "application/octet-stream",
                                  uploadedAt: new Date()
                                    .toISOString()
                                    .slice(0, 10),
                                }));
                              }
                              dispatch({
                                type: "ADD_CLIENT_DOCUMENTS",
                                clientId: c.id,
                                documents: docs,
                              });
                            }}
                            onRemove={(docId) => {
                              const doc = c.documents.find((d) => d.id === docId);
                              dispatch({
                                type: "DELETE_CLIENT_DOCUMENT",
                                clientId: c.id,
                                documentId: docId,
                                path: doc?.path,
                              });
                            }}
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
                      </div>
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
