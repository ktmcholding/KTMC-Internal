import { useState } from "react";
import { Plus } from "lucide-react";
import type { CategoryId, SaleRecord } from "../../types";
import { useStore } from "../../store/AppStore";
import { StatCard } from "../../components/StatCard";
import {
  CurrentVsPotentialChart,
  type MonthlyRevenuePoint,
} from "../../components/RevenueCharts";
import { formatCurrency, formatDate, monthLabel, uid } from "../../lib/format";
import { Modal } from "../../components/Modal";

export function SalesSection({ category }: { category: CategoryId }) {
  const { salesByCategory, leadsByCategory, clientsByCategory, clientName } =
    useStore();
  const sales = salesByCategory(category);
  const leads = leadsByCategory(category);
  const clients = clientsByCategory(category);
  const [showAdd, setShowAdd] = useState(false);

  const current = sales.reduce((sum, s) => sum + s.amount, 0);
  const recurring = sales
    .filter((s) => s.recurring)
    .reduce((sum, s) => sum + s.amount, 0);
  const potential = leads
    .filter((l) => l.status !== "lost" && l.status !== "won")
    .reduce((sum, l) => sum + l.potentialValue, 0);

  const months = Array.from(new Set(sales.map((s) => s.month))).sort();
  const monthly: MonthlyRevenuePoint[] = months.map((m, i) => ({
    month: m,
    current: sales
      .filter((s) => s.month === m)
      .reduce((sum, s) => sum + s.amount, 0),
    potential: i === months.length - 1 ? potential : 0,
  }));

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Current revenue"
          value={formatCurrency(current)}
          hint={`${sales.length} sales recorded`}
          tone="brand"
        />
        <StatCard
          label="Recurring revenue"
          value={`${formatCurrency(recurring)}`}
          hint="From recurring sales"
          tone="green"
        />
        <StatCard
          label="Potential revenue"
          value={formatCurrency(potential)}
          hint="Open pipeline from leads"
          tone="amber"
        />
      </div>

      <div className="mt-6 card p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          Current vs potential revenue
        </h2>
        <CurrentVsPotentialChart data={monthly} />
      </div>

      <div className="mt-6 card">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Sales records</h2>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Record sale
          </button>
        </div>
        {sales.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            No sales recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-2 font-medium">Description</th>
                  <th className="px-5 py-2 font-medium">Client</th>
                  <th className="px-5 py-2 font-medium">Month</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-2.5 text-gray-800">
                      {s.description}
                      {s.recurring && (
                        <span className="badge ml-2 bg-emerald-100 text-emerald-700">
                          Recurring
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">
                      {clientName(s.clientId)}
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">{monthLabel(s.month)}</td>
                    <td className="px-5 py-2.5 text-gray-600">{formatDate(s.date)}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-800">
                      {formatCurrency(s.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddSaleModal
          category={category}
          clients={clients}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function AddSaleModal({
  category,
  clients,
  onClose,
}: {
  category: CategoryId;
  clients: ReturnType<typeof useStore>["state"]["clients"];
  onClose: () => void;
}) {
  const { dispatch } = useStore();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  function save() {
    const value = parseFloat(amount);
    if (!description.trim() || Number.isNaN(value)) return;
    const sale: SaleRecord = {
      id: uid("s"),
      category,
      clientId: clientId || (clients[0]?.id ?? ""),
      description: description.trim(),
      amount: value,
      recurring,
      month: date.slice(0, 7),
      date,
    };
    dispatch({ type: "ADD_SALE", sale });
    onClose();
  }

  return (
    <Modal
      open
      title="Record sale"
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            Save sale
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Client</label>
          <select
            className="input"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            {clients.length === 0 && <option value="">No clients yet</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Description</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Production run Q2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Amount (USD)</label>
            <input
              className="input"
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          This is recurring revenue
        </label>
      </div>
    </Modal>
  );
}
