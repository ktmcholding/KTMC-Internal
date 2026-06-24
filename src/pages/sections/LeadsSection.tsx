import { useState } from "react";
import { Plus, Trash2, PhoneCall, FolderInput } from "lucide-react";
import { Link } from "react-router-dom";
import type { CategoryId, Lead, LeadSource, LeadStatus } from "../../types";
import { useStore } from "../../store/AppStore";
import { StatCard } from "../../components/StatCard";
import { Modal } from "../../components/Modal";
import { BreakdownPie } from "../../components/RevenueCharts";
import { LeadSourceBadge } from "../../components/Badges";
import { CATEGORIES, formatCurrency, formatDate, uid } from "../../lib/format";

export function LeadsSection({ category }: { category: CategoryId }) {
  const { leadsByCategory, dispatch } = useStore();
  const leads = leadsByCategory(category);
  const [showAdd, setShowAdd] = useState(false);

  const openPipeline = leads
    .filter((l) => l.status !== "lost" && l.status !== "won")
    .reduce((s, l) => s + l.potentialValue, 0);
  const wonValue = leads
    .filter((l) => l.status === "won")
    .reduce((s, l) => s + l.potentialValue, 0);
  const quoCount = leads.filter((l) => l.source.startsWith("quo")).length;

  const byStatus = (["new", "contacted", "qualified", "won", "lost"] as LeadStatus[]).map(
    (st) => ({
      name: st,
      value: leads
        .filter((l) => l.status === st)
        .reduce((s, l) => s + l.potentialValue, 0),
    })
  );

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Potential revenue"
          value={formatCurrency(openPipeline)}
          hint="Open pipeline"
          tone="amber"
        />
        <StatCard
          label="Won value"
          value={formatCurrency(wonValue)}
          hint="Converted leads"
          tone="green"
        />
        <StatCard
          label="From QUO"
          value={`${quoCount} / ${leads.length}`}
          hint="Auto-captured leads"
          tone="brand"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Potential by status
          </h2>
          <BreakdownPie data={byStatus} />
        </div>
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Leads</h2>
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add lead
            </button>
          </div>
          {leads.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <PhoneCall className="mx-auto mb-2 text-gray-300" size={26} />
              <p className="text-sm text-gray-400">No leads yet.</p>
              <Link
                to="/quo"
                className="mt-1 inline-block text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Connect QUO to auto-capture leads →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {leads.map((l) => (
                <li key={l.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {l.company}
                      </p>
                      <p className="text-xs text-gray-500">
                        {l.name} · {l.email} · {l.phone}
                      </p>
                      {l.notes && (
                        <p className="mt-1 text-xs text-gray-400">{l.notes}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <LeadSourceBadge source={l.source} />
                        <span className="text-xs text-gray-400">
                          {formatDate(l.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-sm font-semibold text-gray-800">
                        {formatCurrency(l.potentialValue)}
                      </span>
                      <select
                        className="rounded border border-gray-200 bg-white px-1.5 py-1 text-xs capitalize"
                        value={l.status}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_LEAD",
                            lead: { ...l, status: e.target.value as LeadStatus },
                          })
                        }
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </select>
                      <div
                        className="flex items-center gap-1"
                        title="Move this lead to another category"
                      >
                        <FolderInput size={12} className="text-gray-400" />
                        <select
                          className="rounded border border-gray-200 bg-white px-1.5 py-1 text-xs"
                          value={l.category}
                          onChange={(e) => {
                            const next = e.target.value as CategoryId;
                            if (next !== l.category) {
                              dispatch({
                                type: "UPDATE_LEAD",
                                lead: { ...l, category: next },
                              });
                            }
                          }}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        className="text-gray-300 hover:text-red-500"
                        onClick={() => dispatch({ type: "DELETE_LEAD", id: l.id })}
                        aria-label="Delete lead"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showAdd && (
        <AddLeadModal category={category} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}

function AddLeadModal({
  category,
  onClose,
}: {
  category: CategoryId;
  onClose: () => void;
}) {
  const { dispatch } = useStore();
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    potentialValue: "",
    source: "manual" as LeadSource,
    notes: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function save() {
    if (!form.company.trim()) return;
    const lead: Lead = {
      id: uid("l"),
      category,
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      potentialValue: parseFloat(form.potentialValue) || 0,
      status: "new",
      source: form.source,
      notes: form.notes.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    dispatch({ type: "ADD_LEAD", lead });
    onClose();
  }

  return (
    <Modal
      open
      title="Add lead"
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            Save lead
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Company</label>
            <input
              className="input"
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Contact name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Potential value (USD)</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.potentialValue}
              onChange={(e) => set("potentialValue", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Source</label>
            <select
              className="input"
              value={form.source}
              onChange={(e) => set("source", e.target.value as LeadSource)}
            >
              <option value="manual">Manual</option>
              <option value="referral">Referral</option>
              <option value="quo-phone">QUO · Phone</option>
              <option value="quo-website">QUO · Website</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
