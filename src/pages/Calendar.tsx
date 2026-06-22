import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { CalendarEvent, CategoryId } from "../types";
import { useStore } from "../store/AppStore";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { CATEGORIES, categoryById, formatDate, uid } from "../lib/format";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function CalendarPage() {
  const { state, dispatch } = useStore();
  const [cursor, setCursor] = useState(() => new Date(2026, 5, 1)); // June 2026
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startWeekday = monthStart.getDay();
  const daysInMonth = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0
  ).getDate();

  const cells = useMemo(() => {
    const arr: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    return arr;
  }, [cursor, startWeekday, daysInMonth]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of state.events) {
      (map[e.date] ??= []).push(e);
    }
    return map;
  }, [state.events]);

  const monthName = cursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const upcoming = [...state.events]
    .filter((e) => e.date >= ymd(new Date(2026, 5, 22)))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Schedule and track meetings, site visits and deadlines."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setSelectedDate(ymd(new Date(2026, 5, 22)));
              setShowAdd(true);
            }}
          >
            <Plus size={16} /> New event
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="card p-4 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">{monthName}</h2>
            <div className="flex items-center gap-1">
              <button
                className="btn-ghost p-1.5"
                onClick={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
                }
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="btn-ghost p-1.5"
                onClick={() =>
                  setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
                }
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-gray-400">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="pb-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const key = ymd(date);
              const evs = eventsByDay[key] ?? [];
              return (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedDate(key);
                    setShowAdd(true);
                  }}
                  className="min-h-[78px] rounded-lg border border-gray-100 p-1.5 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
                >
                  <span className="text-xs font-medium text-gray-500">
                    {date.getDate()}
                  </span>
                  <div className="mt-1 space-y-1">
                    {evs.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        className="truncate rounded bg-brand-100 px-1 py-0.5 text-[10px] font-medium text-brand-700"
                        title={`${e.time} ${e.title}`}
                      >
                        {e.time} {e.title}
                      </div>
                    ))}
                    {evs.length > 2 && (
                      <div className="text-[10px] text-gray-400">
                        +{evs.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Upcoming</h2>
          <ul className="space-y-3">
            {upcoming.length === 0 && (
              <li className="text-sm text-gray-400">No upcoming events.</li>
            )}
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.title}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(e.date)} · {e.time}
                    {e.category && ` · ${categoryById(e.category).name}`}
                  </p>
                </div>
                <button
                  className="text-gray-300 hover:text-red-500"
                  onClick={() => dispatch({ type: "DELETE_EVENT", id: e.id })}
                  aria-label="Delete event"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {showAdd && (
        <AddEventModal
          defaultDate={selectedDate ?? ymd(new Date(2026, 5, 22))}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function AddEventModal({
  defaultDate,
  onClose,
}: {
  defaultDate: string;
  onClose: () => void;
}) {
  const { dispatch } = useStore();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("09:00");
  const [category, setCategory] = useState<CategoryId | "">("");
  const [notes, setNotes] = useState("");

  function save() {
    if (!title.trim()) return;
    const event: CalendarEvent = {
      id: uid("e"),
      title: title.trim(),
      date,
      time,
      category: category || undefined,
      notes: notes.trim(),
    };
    dispatch({ type: "ADD_EVENT", event });
    onClose();
  }

  return (
    <Modal
      open
      title="New event"
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            Add event
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Time</label>
            <input
              className="input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Category (optional)</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryId | "")}
          >
            <option value="">None</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
