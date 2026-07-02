import { useMemo, useState } from "react";
import { Plus, Trash2, Boxes, AlertTriangle, Pencil } from "lucide-react";
import type { InventoryItem } from "../../types";
import { useStore } from "../../store/AppStore";
import { StatCard } from "../../components/StatCard";
import { Modal } from "../../components/Modal";
import { formatCurrency, formatDate, uid } from "../../lib/format";

function isLow(i: InventoryItem): boolean {
  return i.reorderLevel > 0 && i.quantity <= i.reorderLevel;
}

export function InventorySection() {
  const { state, dispatch } = useStore();
  const inventory = state.inventory;
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  const totals = useMemo(() => {
    const value = inventory.reduce((s, i) => s + i.quantity * i.unitCost, 0);
    const low = inventory.filter(isLow).length;
    return { count: inventory.length, value, low };
  }, [inventory]);

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(item: InventoryItem) {
    setEditing(item);
    setShowForm(true);
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Ingredients tracked" value={String(totals.count)} tone="brand" />
        <StatCard label="Inventory value" value={formatCurrency(totals.value)} tone="green" />
        <StatCard label="Low / reorder" value={String(totals.low)} tone="amber" />
      </div>

      <div className="mt-6 card">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Formulation ingredients
          </h2>
          <button className="btn-primary" onClick={openNew}>
            <Plus size={16} /> Add ingredient
          </button>
        </div>

        {inventory.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Boxes className="mx-auto mb-2 text-gray-300" size={28} />
            <p className="text-sm text-gray-400">No ingredients yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-2 font-medium">Ingredient</th>
                  <th className="px-5 py-2 font-medium">SKU</th>
                  <th className="px-5 py-2 text-right font-medium">On hand</th>
                  <th className="px-5 py-2 text-right font-medium">Reorder at</th>
                  <th className="px-5 py-2 text-right font-medium">Unit cost</th>
                  <th className="px-5 py-2 text-right font-medium">Value</th>
                  <th className="px-5 py-2 font-medium">Supplier</th>
                  <th className="px-5 py-2 font-medium">Updated</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inventory.map((i) => (
                  <tr key={i.id} className={isLow(i) ? "bg-amber-50/60" : undefined}>
                    <td className="px-5 py-2.5 font-medium text-gray-800">
                      <div className="flex items-center gap-1.5">
                        {isLow(i) && (
                          <AlertTriangle
                            size={14}
                            className="text-amber-500"
                            aria-label="Low stock"
                          />
                        )}
                        {i.name}
                      </div>
                      {i.notes && (
                        <p className="text-xs text-gray-400">{i.notes}</p>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-gray-500">{i.sku || "—"}</td>
                    <td className="px-5 py-2.5 text-right text-gray-700">
                      {i.quantity} {i.unit}
                    </td>
                    <td className="px-5 py-2.5 text-right text-gray-500">
                      {i.reorderLevel || "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right text-gray-700">
                      {formatCurrency(i.unitCost, true)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-800">
                      {formatCurrency(i.quantity * i.unitCost, true)}
                    </td>
                    <td className="px-5 py-2.5 text-gray-500">{i.supplier || "—"}</td>
                    <td className="px-5 py-2.5 text-gray-500">
                      {formatDate(i.updatedAt)}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          className="text-gray-400 hover:text-brand-600"
                          onClick={() => openEdit(i)}
                          aria-label="Edit ingredient"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="text-gray-400 hover:text-red-500"
                          onClick={() =>
                            dispatch({ type: "DELETE_INVENTORY_ITEM", id: i.id })
                          }
                          aria-label="Delete ingredient"
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

      {showForm && (
        <IngredientModal
          item={editing}
          onClose={() => setShowForm(false)}
          onSave={(item) => {
            dispatch({
              type: editing ? "UPDATE_INVENTORY_ITEM" : "ADD_INVENTORY_ITEM",
              item,
            });
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function IngredientModal({
  item,
  onClose,
  onSave,
}: {
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [sku, setSku] = useState(item?.sku ?? "");
  const [quantity, setQuantity] = useState(item?.quantity ?? 0);
  const [unit, setUnit] = useState(item?.unit ?? "kg");
  const [reorderLevel, setReorderLevel] = useState(item?.reorderLevel ?? 0);
  const [unitCost, setUnitCost] = useState(item?.unitCost ?? 0);
  const [supplier, setSupplier] = useState(item?.supplier ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");

  function save() {
    if (!name.trim()) return;
    onSave({
      id: item?.id ?? uid("ing"),
      name: name.trim(),
      sku: sku.trim(),
      quantity,
      unit: unit.trim() || "units",
      reorderLevel,
      unitCost,
      supplier: supplier.trim(),
      notes: notes.trim(),
      updatedAt: new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <Modal
      open
      wide
      title={item ? `Edit ${item.name}` : "Add ingredient"}
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            {item ? "Save changes" : "Add ingredient"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Ingredient name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hyaluronic Acid (LMW)"
          />
        </div>
        <div>
          <label className="label">SKU / code</label>
          <input
            className="input"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Supplier</label>
          <input
            className="input"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Quantity on hand</label>
          <input
            className="input"
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="label">Unit</label>
          <input
            className="input"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="kg, g, L, units"
          />
        </div>
        <div>
          <label className="label">Reorder level</label>
          <input
            className="input"
            type="number"
            min="0"
            value={reorderLevel}
            onChange={(e) => setReorderLevel(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="label">Unit cost</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={unitCost}
            onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Storage, grade, lead time, etc."
          />
        </div>
      </div>
    </Modal>
  );
}
