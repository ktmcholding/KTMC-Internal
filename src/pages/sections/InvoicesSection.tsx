import { useMemo, useState } from "react";
import { Plus, Trash2, FileText, Download } from "lucide-react";
import type { CategoryId, Invoice, InvoiceLineItem, InvoiceStatus } from "../../types";
import { useStore } from "../../store/AppStore";
import { StatCard } from "../../components/StatCard";
import { Modal } from "../../components/Modal";
import { formatCurrency, formatDate, uid } from "../../lib/format";
import { openInvoicePdf } from "../../lib/invoicePdf";

function invoiceTotal(inv: Invoice): number {
  return inv.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
}

export function InvoicesSection({ category }: { category: CategoryId }) {
  const { state, invoicesByCategory, clientsByCategory, clientName, dispatch } =
    useStore();
  const invoices = invoicesByCategory(category);
  const clients = clientsByCategory(category);
  const [showCreate, setShowCreate] = useState(false);

  const totals = useMemo(() => {
    const all = invoices.reduce((sum, i) => sum + invoiceTotal(i), 0);
    const paid = invoices
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + invoiceTotal(i), 0);
    const outstanding = invoices
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((sum, i) => sum + invoiceTotal(i), 0);
    return { all, paid, outstanding };
  }, [invoices]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Invoiced total" value={formatCurrency(totals.all)} tone="brand" />
        <StatCard label="Paid" value={formatCurrency(totals.paid)} tone="green" />
        <StatCard
          label="Outstanding"
          value={formatCurrency(totals.outstanding)}
          tone="amber"
        />
      </div>

      <div className="mt-6 card">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Invoices</h2>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create invoice
          </button>
        </div>
        {invoices.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <FileText className="mx-auto mb-2 text-gray-300" size={28} />
            <p className="text-sm text-gray-400">No invoices yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-2 font-medium">Number</th>
                  <th className="px-5 py-2 font-medium">Client</th>
                  <th className="px-5 py-2 font-medium">Issued</th>
                  <th className="px-5 py-2 font-medium">Due</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 text-right font-medium">Total</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-5 py-2.5 font-medium text-gray-800">
                      {inv.number}
                      {inv.label && (
                        <p className="text-xs font-normal text-gray-500">
                          {inv.label}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">
                      {clientName(inv.clientId)}
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">
                      {formatDate(inv.issueDate)}
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="px-5 py-2.5">
                      <select
                        className="rounded border border-gray-200 bg-white px-1.5 py-1 text-xs"
                        value={inv.status}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_INVOICE",
                            invoice: {
                              ...inv,
                              status: e.target.value as InvoiceStatus,
                            },
                          })
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-800">
                      {formatCurrency(invoiceTotal(inv))}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                          onClick={() =>
                            openInvoicePdf(
                              inv,
                              clients.find((c) => c.id === inv.clientId),
                              state.company,
                              state.invoiceTemplate
                            )
                          }
                          aria-label="Download invoice PDF"
                        >
                          <Download size={14} /> PDF
                        </button>
                        <button
                          className="text-gray-400 hover:text-red-500"
                          onClick={() =>
                            dispatch({ type: "DELETE_INVOICE", id: inv.id })
                          }
                          aria-label="Delete invoice"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateInvoiceModal
          category={category}
          clients={clients}
          nextNumber={`KTMC-2026-${String(1000 + invoices.length + 1).slice(1)}`}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function CreateInvoiceModal({
  category,
  clients,
  nextNumber,
  onClose,
}: {
  category: CategoryId;
  clients: ReturnType<typeof useStore>["state"]["clients"];
  nextNumber: string;
  onClose: () => void;
}) {
  const { state, dispatch, clientName } = useStore();
  const template = state.invoiceTemplate;
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [notes, setNotes] = useState(template.defaultTerms ?? "");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { id: uid("li"), description: "", quantity: 1, unitPrice: 0 },
  ]);

  const total = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);

  function updateItem(id: string, patch: Partial<InvoiceLineItem>) {
    setLineItems((items) =>
      items.map((li) => (li.id === id ? { ...li, ...patch } : li))
    );
  }

  function save() {
    const cleaned = lineItems.filter((li) => li.description.trim() && li.unitPrice >= 0);
    if (!clientId || cleaned.length === 0) return;
    const invoice: Invoice = {
      id: uid("inv"),
      number: nextNumber,
      label: label.trim(),
      category,
      clientId,
      issueDate,
      dueDate,
      status,
      lineItems: cleaned,
      notes: notes.trim(),
    };
    dispatch({ type: "ADD_INVOICE", invoice });
    onClose();
  }

  return (
    <Modal
      open
      wide
      title={`Create invoice · ${nextNumber}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            Create invoice
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Label / title (optional)</label>
          <input
            className="input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Deposit — Serum project"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Bill to (client)</label>
            <select
              className="input"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              {clients.length === 0 && <option value="">No clients in this category</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className="label">Issue date</label>
            <input
              className="input"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Due date</label>
            <input
              className="input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">Line items</label>
            <button
              className="btn-ghost px-2 py-1 text-xs"
              onClick={() =>
                setLineItems((items) => [
                  ...items,
                  { id: uid("li"), description: "", quantity: 1, unitPrice: 0 },
                ])
              }
            >
              <Plus size={14} /> Add item
            </button>
          </div>
          <div className="space-y-2">
            {lineItems.map((li) => (
              <div key={li.id} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  placeholder="Description"
                  value={li.description}
                  onChange={(e) => updateItem(li.id, { description: e.target.value })}
                />
                <input
                  className="input w-20"
                  type="number"
                  min="0"
                  placeholder="Qty"
                  value={li.quantity}
                  onChange={(e) =>
                    updateItem(li.id, { quantity: Number(e.target.value) || 0 })
                  }
                />
                <input
                  className="input w-28"
                  type="number"
                  min="0"
                  placeholder="Unit price"
                  value={li.unitPrice}
                  onChange={(e) =>
                    updateItem(li.id, { unitPrice: Number(e.target.value) || 0 })
                  }
                />
                <span className="w-24 text-right text-sm text-gray-600">
                  {formatCurrency(li.quantity * li.unitPrice, true)}
                </span>
                <button
                  className="text-gray-400 hover:text-red-500 disabled:opacity-30"
                  disabled={lineItems.length === 1}
                  onClick={() =>
                    setLineItems((items) => items.filter((x) => x.id !== li.id))
                  }
                  aria-label="Remove line item"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, PO number, etc."
          />
        </div>

        <div className="rounded-lg bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {clientId ? `Billing ${clientName(clientId)}` : "Select a client"}
            </span>
            <span className="text-base font-semibold text-gray-900">
              Total: {formatCurrency(total * (1 + (template.taxRate || 0) / 100), true)}
            </span>
          </div>
          {template.taxRate > 0 && (
            <p className="mt-1 text-right text-xs text-gray-500">
              Subtotal {formatCurrency(total, true)} +{" "}
              {template.taxLabel || "Tax"} ({template.taxRate}%){" "}
              {formatCurrency(total * (template.taxRate / 100), true)}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
