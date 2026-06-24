import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { Employee, SectionKey } from "../types";
import { canAccess } from "../lib/sections";

const DEMO_AUTH_KEY = "ktmc-internal-auth-v1";

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthResult {
  ok: boolean;
  error?: string;
  needsConfirmation?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** The signed-in user's employee profile (role + permissions). */
  profile: Employee | null;
  loading: boolean;
  mode: "supabase" | "demo";
  isAdmin: boolean;
  can: (section: SectionKey) => boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function nameFromEmail(email: string): string {
  return email.split("@")[0].replace(/[._]/g, " ") || "KTMC User";
}

function loadDemoUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(DEMO_AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

/** In demo mode the single user is treated as a full admin. */
function demoProfile(user: AuthUser): Employee {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: "admin",
    title: "Admin",
    permissions: [],
    active: true,
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

/** Load (or self-provision) the employee profile for a Supabase user. */
async function ensureProfile(user: AuthUser): Promise<Employee | null> {
  if (!supabase) return null;
  const existing = await supabase
    .from("employees")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (existing.data) return rowToEmployee(existing.data);

  // No profile yet — self-provision. Try admin first (allowed only when the
  // employees table is empty, i.e. the very first user); fall back to employee.
  const base = {
    id: user.id,
    email: user.email,
    name: user.name,
    active: true,
    created_at: new Date().toISOString().slice(0, 10),
  };
  const asAdmin = await supabase
    .from("employees")
    .insert({ ...base, role: "admin", title: "Admin", permissions: [] })
    .select()
    .maybeSingle();
  if (asAdmin.data) return rowToEmployee(asAdmin.data);

  const asEmployee = await supabase
    .from("employees")
    .insert({ ...base, role: "employee", title: "", permissions: [] })
    .select()
    .maybeSingle();
  if (asEmployee.data) return rowToEmployee(asEmployee.data);

  return null;
}

function rowToEmployee(r: Record<string, unknown>): Employee {
  return {
    id: String(r.id),
    email: String(r.email ?? ""),
    name: String(r.name ?? ""),
    role: (r.role as Employee["role"]) ?? "employee",
    title: String(r.title ?? ""),
    permissions: (r.permissions as SectionKey[]) ?? [],
    active: Boolean(r.active),
    createdAt: String(r.created_at ?? ""),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    isSupabaseConfigured ? null : loadDemoUser()
  );
  const [profile, setProfile] = useState<Employee | null>(() => {
    if (isSupabaseConfigured) return null;
    const u = loadDemoUser();
    return u ? demoProfile(u) : null;
  });
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);

  // Restore / track the Supabase session and load the profile.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;

    async function applySession(sessionUser: { id: string; email?: string } | null) {
      if (!sessionUser) {
        if (!active) return;
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      const u: AuthUser = {
        id: sessionUser.id,
        email: sessionUser.email ?? "",
        name: nameFromEmail(sessionUser.email ?? ""),
      };
      if (active) setUser(u);
      const p = await ensureProfile(u).catch(() => null);
      if (!active) return;
      setProfile(p);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      mode: isSupabaseConfigured ? "supabase" : "demo",
      isAdmin: profile?.role === "admin",
      can: (section) => canAccess(profile, section),

      login: async (email, password) => {
        if (!email.trim() || !password) {
          return { ok: false, error: "Email and password are required." };
        }
        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (error) return { ok: false, error: error.message };
          return { ok: true };
        }
        const u: AuthUser = {
          id: "demo-user",
          email: email.trim(),
          name: nameFromEmail(email),
        };
        localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(u));
        setUser(u);
        setProfile(demoProfile(u));
        return { ok: true };
      },

      signUp: async (email, password) => {
        if (!email.trim() || !password) {
          return { ok: false, error: "Email and password are required." };
        }
        if (password.length < 6) {
          return { ok: false, error: "Password must be at least 6 characters." };
        }
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
          });
          if (error) return { ok: false, error: error.message };
          if (!data.session) return { ok: true, needsConfirmation: true };
          return { ok: true };
        }
        const u: AuthUser = {
          id: "demo-user",
          email: email.trim(),
          name: nameFromEmail(email),
        };
        localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(u));
        setUser(u);
        setProfile(demoProfile(u));
        return { ok: true };
      },

      logout: async () => {
        if (isSupabaseConfigured && supabase) {
          await supabase.auth.signOut();
        } else {
          localStorage.removeItem(DEMO_AUTH_KEY);
        }
        setUser(null);
        setProfile(null);
      },
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
