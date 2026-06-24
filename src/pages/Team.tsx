import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Shield,
  User as UserIcon,
  Clock,
  Activity,
  Copy,
  Check,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import type { ActivityEvent, Employee, Role, SectionKey } from "../types";
import { useStore } from "../store/AppStore";
import { useAuth } from "../store/AuthStore";
import { PageHeader } from "../components/PageHeader";
import { Tabs } from "../components/Tabs";
import { Modal } from "../components/Modal";
import { StatCard } from "../components/StatCard";
import { ASSIGNABLE_SECTIONS } from "../lib/sections";
import { isSupabaseConfigured } from "../lib/supabase";
import { createEmployee, fetchActivity } from "../lib/api";
import { uid } from "../lib/format";

type TabId = "members" | "monitoring";

const TABS: { id: TabId; label: string }[] = [
  { id: "members", label: "Members" },
  { id: "monitoring", label: "Monitoring" },
];

export function Team() {
  const [tab, setTab] = useState<TabId>("members");
  return (
    <div>
      <PageHeader
        title="Team & Monitoring"
        subtitle="Manage who's on the team, what they can access, and their working activity."
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "members" ? <MembersTab /> : <MonitoringTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

function MembersTab() {
  const { state, dispatch } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  return (
    <div>
      <div className="card">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Team members</h2>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={() => setShowRoles(true)}>
              <Settings size={16} /> Manage roles
            </button>
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add member
            </button>
          </div>
        </div>
        <ul className="divide-y divide-gray-100">
          {state.employees.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between px-5 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    e.role === "admin"
                      ? "bg-brand-100 text-brand-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {e.role === "admin" ? <Shield size={16} /> : <UserIcon size={16} />}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {e.name || e.email}{" "}
                    {!e.active && (
                      <span className="badge ml-1 bg-gray-200 text-gray-500">
                        Inactive
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{e.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-gray-400 sm:block">
                  {e.role === "admin"
                    ? "Full access"
                    : `${e.permissions.length} section${
                        e.permissions.length === 1 ? "" : "s"
                      }`}
                </span>
                <span
                  className={`badge ${
                    e.role === "admin"
                      ? "bg-brand-100 text-brand-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {e.title || (e.role === "admin" ? "Admin" : "Employee")}
                </span>
                <button
                  className="btn-secondary px-2.5 py-1 text-xs"
                  onClick={() => setEditing(e)}
                >
                  Manage
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} />}
      {showRoles && <RoleManagerModal onClose={() => setShowRoles(false)} />}
      {editing && (
        <EditMemberModal
          employee={editing}
          onClose={() => setEditing(null)}
          onSave={(emp) => {
            dispatch({ type: "UPDATE_EMPLOYEE", employee: emp });
            setEditing(null);
          }}
          onRemove={(id) => {
            dispatch({ type: "DELETE_EMPLOYEE", id });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/** Dropdown to pick Admin, a custom role, or "Custom" manual access. */
function RoleSelect({
  roles,
  role,
  title,
  disabled,
  onPick,
}: {
  roles: Role[];
  role: Employee["role"];
  title: string;
  disabled?: boolean;
  onPick: (p: {
    role: Employee["role"];
    title: string;
    permissions?: SectionKey[];
  }) => void;
}) {
  const current =
    role === "admin"
      ? "admin"
      : roles.find((r) => r.name === title)?.id ?? "__custom";
  return (
    <select
      className="input"
      value={current}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "admin") onPick({ role: "admin", title: "Admin", permissions: [] });
        else if (v === "__custom") onPick({ role: "employee", title: "" });
        else {
          const r = roles.find((x) => x.id === v);
          if (r) onPick({ role: "employee", title: r.name, permissions: r.permissions });
        }
      }}
    >
      <option value="admin">Admin (full access)</option>
      {roles.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
      <option value="__custom">Custom (set sections manually)</option>
    </select>
  );
}

function PermissionPicker({
  role,
  permissions,
  onToggle,
}: {
  role: Employee["role"];
  permissions: SectionKey[];
  onToggle: (key: SectionKey) => void;
}) {
  if (role === "admin") {
    return (
      <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
        Admins have full access to every section, including this page.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {ASSIGNABLE_SECTIONS.map((s) => (
        <label
          key={s.key}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <input
            type="checkbox"
            checked={permissions.includes(s.key)}
            onChange={() => onToggle(s.key)}
          />
          {s.label}
        </label>
      ))}
    </div>
  );
}

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Employee["role"]>("employee");
  const [title, setTitle] = useState("");
  const [permissions, setPermissions] = useState<SectionKey[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggle(key: SectionKey) {
    setPermissions((p) =>
      p.includes(key) ? p.filter((k) => k !== key) : [...p, key]
    );
  }

  async function save() {
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (isSupabaseConfigured) {
        const res = await createEmployee({
          email: email.trim(),
          name: name.trim(),
          role,
          title,
          permissions,
        });
        dispatch({ type: "ADD_EMPLOYEE", employee: res.employee });
        if (res.tempPassword) {
          setTempPassword(res.tempPassword);
          return; // keep modal open to show the password
        }
        onClose();
      } else {
        const employee: Employee = {
          id: uid("emp"),
          email: email.trim(),
          name: name.trim() || email.split("@")[0],
          role,
          title: title || (role === "admin" ? "Admin" : ""),
          permissions,
          active: true,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        dispatch({ type: "ADD_EMPLOYEE", employee });
        onClose();
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not add member. Is the manage-employee function deployed?"
      );
    } finally {
      setBusy(false);
    }
  }

  if (tempPassword) {
    return (
      <Modal
        open
        title="Member added"
        onClose={onClose}
        footer={
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        }
      >
        <p className="text-sm text-gray-600">
          Share this temporary password with <strong>{email}</strong>. They sign in
          with their email and this password, then can change it.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-gray-50 px-3 py-2 text-sm">
            {tempPassword}
          </code>
          <button
            className="btn-secondary px-2.5 py-2"
            onClick={() => {
              navigator.clipboard?.writeText(tempPassword);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      title="Add team member"
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? "Adding…" : "Add member"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@ktmc.com"
            />
          </div>
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Role</label>
          <RoleSelect
            roles={state.roles}
            role={role}
            title={title}
            onPick={(p) => {
              setRole(p.role);
              setTitle(p.title);
              if (p.permissions) setPermissions(p.permissions);
            }}
          />
          <p className="mt-1 text-xs text-gray-400">
            Picking a role pre-fills the sections below — you can still adjust them.
          </p>
        </div>
        <div>
          <label className="label">Section access</label>
          <PermissionPicker role={role} permissions={permissions} onToggle={toggle} />
        </div>
      </div>
    </Modal>
  );
}

function EditMemberModal({
  employee,
  onClose,
  onSave,
  onRemove,
}: {
  employee: Employee;
  onClose: () => void;
  onSave: (e: Employee) => void;
  onRemove: (id: string) => void;
}) {
  const { user } = useAuth();
  const { state } = useStore();
  const [draft, setDraft] = useState<Employee>(employee);
  const isSelf = user?.id === employee.id;

  function toggle(key: SectionKey) {
    setDraft((d) => ({
      ...d,
      permissions: d.permissions.includes(key)
        ? d.permissions.filter((k) => k !== key)
        : [...d.permissions, key],
    }));
  }

  return (
    <Modal
      open
      title={`Manage ${employee.name || employee.email}`}
      onClose={onClose}
      footer={
        <>
          <button
            className="btn-secondary mr-auto text-red-600"
            disabled={isSelf}
            title={isSelf ? "You can't remove yourself" : undefined}
            onClick={() => onRemove(employee.id)}
          >
            Remove
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={() => onSave(draft)}>
            Save
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <RoleSelect
              roles={state.roles}
              role={draft.role}
              title={draft.title}
              disabled={isSelf}
              onPick={(p) =>
                setDraft((d) => ({
                  ...d,
                  role: p.role,
                  title: p.title,
                  permissions: p.permissions ?? d.permissions,
                }))
              }
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={draft.active}
            disabled={isSelf}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />
          Active (can sign in and access the site)
        </label>
        <div>
          <label className="label">Section access</label>
          <PermissionPicker
            role={draft.role}
            permissions={draft.permissions}
            onToggle={toggle}
          />
        </div>
      </div>
    </Modal>
  );
}

function RoleManagerModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [roles, setRoles] = useState<Role[]>(state.roles);

  function update(id: string, patch: Partial<Role>) {
    setRoles((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function toggle(id: string, key: SectionKey) {
    setRoles((rs) =>
      rs.map((r) =>
        r.id === id
          ? {
              ...r,
              permissions: r.permissions.includes(key)
                ? r.permissions.filter((k) => k !== key)
                : [...r.permissions, key],
            }
          : r
      )
    );
  }

  return (
    <Modal
      open
      wide
      title="Manage roles"
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              dispatch({
                type: "SET_ROLES",
                roles: roles.filter((r) => r.name.trim()),
              });
              onClose();
            }}
          >
            Save roles
          </button>
        </>
      }
    >
      <p className="mb-3 text-sm text-gray-500">
        A role is a named set of sections. When you assign it to a team member,
        they get exactly those sections — and you can still tweak per person.
      </p>
      <div className="space-y-3">
        {roles.length === 0 && (
          <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-sm text-gray-400">
            No roles yet. Add one below.
          </p>
        )}
        {roles.map((r) => (
          <div key={r.id} className="rounded-lg border border-gray-200 p-3">
            <div className="mb-2 flex items-center gap-2">
              <input
                className="input flex-1"
                value={r.name}
                placeholder="Role name (e.g. Sales Rep)"
                onChange={(e) => update(r.id, { name: e.target.value })}
              />
              <button
                className="text-gray-400 hover:text-red-500"
                onClick={() => setRoles((rs) => rs.filter((x) => x.id !== r.id))}
                aria-label="Delete role"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ASSIGNABLE_SECTIONS.map((s) => (
                <label
                  key={s.key}
                  className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={r.permissions.includes(s.key)}
                    onChange={() => toggle(r.id, s.key)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        className="btn-secondary mt-3"
        onClick={() =>
          setRoles((rs) => [
            ...rs,
            { id: uid("role"), name: "", permissions: [] },
          ])
        }
      >
        <Plus size={15} /> Add role
      </button>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Monitoring
// ---------------------------------------------------------------------------

function fmtMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function MonitoringTab() {
  const { state } = useStore();
  const [range, setRange] = useState<"today" | "week">("today");
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  async function load() {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    const since = new Date();
    if (range === "today") since.setHours(0, 0, 0, 0);
    else since.setDate(since.getDate() - 7);
    try {
      setEvents(await fetchActivity(since.toISOString()));
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // Per-user aggregates (1 heartbeat ≈ 1 active minute).
  const perUser = useMemo(() => {
    const map = new Map<
      string,
      { email: string; minutes: number; actions: number; last: string }
    >();
    for (const e of events) {
      const cur =
        map.get(e.userId) ??
        { email: e.userEmail, minutes: 0, actions: 0, last: e.at };
      if (e.type === "heartbeat") cur.minutes += 1;
      if (e.type === "action") cur.actions += 1;
      if (e.at > cur.last) cur.last = e.at;
      cur.email = e.userEmail || cur.email;
      map.set(e.userId, cur);
    }
    return map;
  }, [events]);

  const selectedEvents = useMemo(
    () => events.filter((e) => e.userId === selected),
    [events, selected]
  );

  const selectedSections = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of selectedEvents) {
      if (e.type === "heartbeat") m.set(e.detail, (m.get(e.detail) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [selectedEvents]);

  if (!isSupabaseConfigured) {
    return (
      <div className="card p-8 text-center text-sm text-gray-500">
        Activity tracking runs when the site is connected to Supabase. Connect the
        backend (see README) to start recording working time.
      </div>
    );
  }

  const totalActive = [...perUser.values()].reduce((s, u) => s + u.minutes, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          {(["today", "week"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                range === r ? "bg-brand-600 text-white" : "text-gray-600"
              }`}
            >
              {r === "today" ? "Today" : "Last 7 days"}
            </button>
          ))}
        </div>
        <button className="btn-secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="People active"
          value={String(perUser.size)}
          icon={<UserIcon size={18} />}
          tone="brand"
        />
        <StatCard
          label="Total active time"
          value={fmtMinutes(totalActive)}
          icon={<Clock size={18} />}
          tone="green"
        />
        <StatCard
          label="Actions logged"
          value={String(events.filter((e) => e.type === "action").length)}
          icon={<Activity size={18} />}
          tone="default"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="border-b border-gray-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Working time</h2>
          </div>
          {perUser.size === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              No activity recorded for this period yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {state.employees.map((emp) => {
                const u = perUser.get(emp.id);
                if (!u) return null;
                return (
                  <li key={emp.id}>
                    <button
                      onClick={() => setSelected(emp.id)}
                      className={`flex w-full items-center justify-between px-5 py-3 text-left hover:bg-gray-50 ${
                        selected === emp.id ? "bg-brand-50/50" : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {emp.name || u.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {u.actions} actions · last{" "}
                          {new Date(u.last).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {fmtMinutes(u.minutes)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card lg:col-span-2">
          <div className="border-b border-gray-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">
              {selected
                ? `Detail — ${
                    state.employees.find((e) => e.id === selected)?.name ??
                    "member"
                  }`
                : "Select a person to see their breakdown"}
            </h2>
          </div>
          {!selected ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">
              Pick someone from the list to see time per section and recent actions.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Time per section
                </h3>
                {selectedSections.length === 0 ? (
                  <p className="text-sm text-gray-400">No active time recorded.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {selectedSections.map(([section, mins]) => (
                      <li key={section} className="flex justify-between">
                        <span className="text-gray-700">{section}</span>
                        <span className="font-medium text-gray-800">
                          {fmtMinutes(mins)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Recent actions
                </h3>
                <ul className="space-y-1.5 text-sm">
                  {selectedEvents
                    .filter((e) => e.type === "action")
                    .slice(-15)
                    .reverse()
                    .map((e) => (
                      <li key={e.id} className="flex justify-between gap-2">
                        <span className="text-gray-700">{e.detail}</span>
                        <span className="whitespace-nowrap text-xs text-gray-400">
                          {new Date(e.at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </li>
                    ))}
                  {selectedEvents.filter((e) => e.type === "action").length === 0 && (
                    <li className="text-sm text-gray-400">No actions recorded.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
