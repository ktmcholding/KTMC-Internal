import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "../types";
import { useStore } from "../store/AppStore";
import { PageHeader } from "../components/PageHeader";
import { Modal } from "../components/Modal";
import { TaskPriorityBadge } from "../components/Badges";
import { formatDate, uid } from "../lib/format";

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "in-progress", label: "In progress" },
  { id: "done", label: "Done" },
];

export function DutiesTasks() {
  const { state, dispatch } = useStore();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <PageHeader
        title="Duties & Tasks"
        subtitle="Assign and track internal duties across the team."
        actions={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> New task
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const tasks = state.tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="card flex flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">{col.label}</h2>
                <span className="badge bg-gray-100 text-gray-600">{tasks.length}</span>
              </div>
              <div className="flex-1 space-y-3 p-3">
                {tasks.length === 0 && (
                  <p className="py-6 text-center text-xs text-gray-400">
                    Nothing here.
                  </p>
                )}
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800">{t.title}</p>
                      <button
                        className="text-gray-300 hover:text-red-500"
                        onClick={() => dispatch({ type: "DELETE_TASK", id: t.id })}
                        aria-label="Delete task"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {t.description && (
                      <p className="mt-1 text-xs text-gray-500">{t.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <TaskPriorityBadge priority={t.priority} />
                      <span className="text-xs text-gray-400">{t.assignee}</span>
                      <span className="text-xs text-gray-400">
                        · due {formatDate(t.dueDate)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <select
                        className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-xs"
                        value={t.status}
                        onChange={(e) =>
                          dispatch({
                            type: "UPDATE_TASK",
                            task: { ...t, status: e.target.value as TaskStatus },
                          })
                        }
                      >
                        <option value="todo">To do</option>
                        <option value="in-progress">In progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function AddTaskModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useStore();
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignee: "",
    priority: "medium" as TaskPriority,
    status: "todo" as TaskStatus,
    dueDate: new Date().toISOString().slice(0, 10),
  });

  function save() {
    if (!form.title.trim()) return;
    const task: Task = {
      id: uid("t"),
      title: form.title.trim(),
      description: form.description.trim(),
      assignee: form.assignee.trim() || "Unassigned",
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate,
    };
    dispatch({ type: "ADD_TASK", task });
    onClose();
  }

  return (
    <Modal
      open
      title="New task"
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            Create task
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Assignee</label>
            <input
              className="input"
              value={form.assignee}
              onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Due date</label>
            <input
              className="input"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))
              }
            >
              <option value="todo">To do</option>
              <option value="in-progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}
