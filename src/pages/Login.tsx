import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../store/AuthStore";

export function Login() {
  const { login, signUp, mode } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = isSignUp
        ? await signUp(email, password)
        : await login(email, password);
      if (res.ok) {
        if (res.needsConfirmation) {
          setInfo(
            "Account created. Check your email to confirm, then sign in."
          );
          setIsSignUp(false);
        } else {
          navigate("/", { replace: true });
        }
      } else {
        setError(res.error ?? "Unable to continue.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-gray-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">
            K
          </div>
          <h1 className="text-xl font-semibold text-gray-900">KTMC Internal System</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isSignUp
              ? "Create your account to get started"
              : "Sign in to manage day-to-day operations"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {info}
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="input"
              placeholder="you@ktmc.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            {isSignUp ? "Create account" : "Sign in"}
          </button>

          {mode === "supabase" ? (
            <p className="text-center text-sm text-gray-500">
              {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
              <button
                type="button"
                className="font-medium text-brand-600 hover:text-brand-700"
                onClick={() => {
                  setIsSignUp((s) => !s);
                  setError(null);
                  setInfo(null);
                }}
              >
                {isSignUp ? "Sign in" : "Create one"}
              </button>
            </p>
          ) : (
            <p className="text-center text-xs text-gray-400">
              Demo mode — enter any email and password to continue. Connect Supabase
              to enable real accounts.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
