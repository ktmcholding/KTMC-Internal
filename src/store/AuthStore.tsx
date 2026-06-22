import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const DEMO_AUTH_KEY = "ktmc-internal-auth-v1";

interface AuthUser {
  email: string;
  name: string;
}

interface AuthResult {
  ok: boolean;
  error?: string;
  /** True when sign-up succeeded but the account needs email confirmation. */
  needsConfirmation?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  mode: "supabase" | "demo";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    isSupabaseConfigured ? null : loadDemoUser()
  );
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);

  // Restore / track the Supabase session.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const u = data.session?.user;
      setUser(u ? { email: u.email ?? "", name: nameFromEmail(u.email ?? "") } : null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setUser(u ? { email: u.email ?? "", name: nameFromEmail(u.email ?? "") } : null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      mode: isSupabaseConfigured ? "supabase" : "demo",

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
        // Demo mode
        const u: AuthUser = { email: email.trim(), name: nameFromEmail(email) };
        localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(u));
        setUser(u);
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
          // If email confirmation is enabled there is no active session yet.
          if (!data.session) return { ok: true, needsConfirmation: true };
          return { ok: true };
        }
        // Demo mode behaves like login.
        const u: AuthUser = { email: email.trim(), name: nameFromEmail(email) };
        localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(u));
        setUser(u);
        return { ok: true };
      },

      logout: async () => {
        if (isSupabaseConfigured && supabase) {
          await supabase.auth.signOut();
        } else {
          localStorage.removeItem(DEMO_AUTH_KEY);
        }
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
