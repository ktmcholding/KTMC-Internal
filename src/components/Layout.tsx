import { useState, type ReactNode } from "react";
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
  Sparkles,
  PhoneCall,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../store/AuthStore";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { type: "heading", label: "KTMC internal system" } as const,
  { to: "/category/formulation", label: "Formulation", icon: FlaskConical },
  { to: "/category/co-packing", label: "Co-packing", icon: Boxes },
  {
    to: "/category/private-white-label",
    label: "Private & White Label",
    icon: Tags,
  },
  { to: "/category/our-brands", label: "Our Brands", icon: Store },
  { to: "/category/software", label: "Software", icon: Code2 },
  { type: "heading", label: "Operations" } as const,
  { to: "/duties", label: "Duties & Tasks", icon: ListChecks },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/documents", label: "Internal Documents", icon: FolderLock },
  { type: "heading", label: "Integrations" } as const,
  { to: "/curator", label: "Curator", icon: Sparkles },
  { to: "/quo", label: "QUO (Leads)", icon: PhoneCall },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

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
        {navItems.map((item, idx) => {
          if ("type" in item && item.type === "heading") {
            return (
              <p
                key={`h-${idx}`}
                className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
              >
                {item.label}
              </p>
            );
          }
          const Icon = item.icon!;
          return (
            <NavLink
              key={item.to}
              to={item.to!}
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
