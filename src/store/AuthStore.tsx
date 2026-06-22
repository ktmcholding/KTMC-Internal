import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const AUTH_KEY = "ktmc-internal-auth-v1";

interface AuthUser {
  email: string;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: (email, password) => {
        // Placeholder authentication for the MVP. Replace with a real
        // identity provider / backend before production use.
        if (!email.trim() || !password.trim()) {
          return { ok: false, error: "Email and password are required." };
        }
        const u: AuthUser = {
          email: email.trim(),
          name: email.split("@")[0].replace(/[._]/g, " ") || "KTMC User",
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(u));
        setUser(u);
        return { ok: true };
      },
      logout: () => {
        localStorage.removeItem(AUTH_KEY);
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
