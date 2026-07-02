import { useMemo, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FlaskConical,
  Boxes,
  Tags,
  Store,
  Code2,
  ListChecks,
  CalendarDays,
  FolderLock,
  FileSignature,
  Sparkles,
  PhoneCall,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../store/AuthStore";
import { ActivityTracker } from "./ActivityTracker";
import type { SectionKey } from "../types";

type NavHeading = { type: "heading"; label: string };
type NavLinkItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  section: SectionKey;
  end?: boolean;
};
type NavEntry = NavHeading | NavLinkItem;

const navItems: NavEntry[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, section: "dashboard", end: true },
  { type: "heading", label: "KTMC internal system" },
  { to: "/category/formulation", label: "Formulation", icon: FlaskConical, section: "formulation" },
  { to: "/category/co-packing", label: "Co-packing", icon: Boxes, section: "co-packing" },
  { to: "/category/private-white-label", label: "Private & White Label", icon: Tags, section: "private-white-label" },
  { to: "/category/our-brands", label: "Our Brands", icon: Store, section: "our-brands" },
  { to: "/category/software", label: "Software", icon: Code2, section: "software" },
  { type: "heading", label: "Operations" },
  { to: "/duties", label: "Duties & Tasks", icon: ListChecks, section: "duties" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, section: "calendar" },
  { to: "/documents", label: "Internal Documents", icon: FolderLock, section: "documents" },
  { to: "/contracts", label: "Contracts", icon: FileSignature, section: "contracts" },
  { type: "heading", label: "Integrations" },
  { to: "/curator", label: "Curator", icon: Sparkles, section: "curator" },
  { to: "/quo", label: "QUO (Leads)", icon: PhoneCall, section: "quo" },
  { type: "heading", label: "Administration" },
  { to: "/team", label: "Team & Monitoring", icon: Users, section: "team" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, section: "settings" },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Filter nav by permission, then drop any heading with no visible items.
  const visibleItems = useMemo(() => {
    const allowed = navItems.filter((it) =>
      "type" in it ? true : can(it.section)
    );
    return allowed.filter((it, i) => {
      if (!("type" in it)) return true;
      const next = allowed[i + 1];
      return next !== undefined && !("type" in next);
    });
  }, [can]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
          K
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-gray-900">
            KTMC Internal
          </p>
          <p className="text-xs leading-tight text-gray-500">Operations system</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {visibleItems.map((item, idx) => {
          if ("type" in item) {
            return (
              <p
                key={`h-${idx}`}
                className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
              >
                {item.label}
              </p>
            );
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium capitalize text-gray-800">
              {user?.name ?? "User"}
            </p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>
          <button
            className="btn-ghost p-2"
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <ActivityTracker />
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <button
            className="btn-ghost p-2"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-semibold text-gray-900">KTMC Internal</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
