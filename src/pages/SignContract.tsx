import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, CheckCircle2, FileSignature, AlertTriangle } from "lucide-react";
import { SignaturePad } from "../components/SignaturePad";
import { isSupabaseConfigured } from "../lib/supabase";
import {
  fetchContractByToken,
  signContractByToken,
  type PublicContract,
} from "../lib/api";

const DEMO_KEY = "ktmc-internal-state-v1";

/** Demo-mode fallback: read the contract straight from localStorage. */
function demoLoad(token: string): PublicContract | null {
  try {
    const raw = window.localStorage.getItem(DEMO_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as { contracts?: Record<string, string>[] };
    const c = (state.contracts ?? []).find((x) => x.token === token);
    if (!c) return null;
    return {
      id: c.id,
      title: c.title,
      body: c.body,
      signerName: c.signerName,
      status: c.status,
      signedAt: c.signedAt,
      signerTypedName: c.signerTypedName,
    } as PublicContract;
  } catch {
    return null;
  }
}

function demoSign(token: string, typedName: string, signature: string) {
  try {
    const raw = window.localStorage.getItem(DEMO_KEY);
    if (!raw) return;
    const state = JSON.parse(raw) as { contracts?: Record<string, unknown>[] };
    state.contracts = (state.contracts ?? []).map((c) =>
      c.token === token
        ? {
            ...c,
            status: "signed",
            signerTypedName: typedName,
            signature,
            signedAt: new Date().toISOString(),
          }
        : c
    );
    window.localStorage.setItem(DEMO_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function SignContract() {
  const { token = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<PublicContract | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [typedName, setTypedName] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const c = isSupabaseConfigured
          ? await fetchContractByToken(token)
          : demoLoad(token);
        if (!active) return;
        if (!c) setError("This signing link is not valid or has expired.");
        else setContract(c);
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not load this contract."
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  async function sign() {
    if (!typedName.trim() && !signature) {
      setError("Please type your name and/or draw your signature.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isSupabaseConfigured) {
        await signContractByToken(token, {
          typedName: typedName.trim(),
          signatureDataUrl: signature,
        });
      } else {
        demoSign(token, typedName.trim(), signature);
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit signature.");
    } finally {
      setSubmitting(false);
    }
  }

  const alreadySigned = contract?.status === "signed";

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center gap-2 text-gray-700">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
            K
          </div>
          <span className="font-semibold">KTMC</span>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : error && !contract ? (
            <div className="py-12 text-center">
              <AlertTriangle className="mx-auto mb-3 text-amber-500" size={32} />
              <p className="text-gray-700">{error}</p>
            </div>
          ) : done || alreadySigned ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={40} />
              <h1 className="text-lg font-semibold text-gray-900">
                {done ? "Thank you — signed!" : "This contract is already signed."}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                A copy has been recorded with KTMC. You can close this page.
              </p>
            </div>
          ) : contract ? (
            <>
              <div className="mb-4 flex items-center gap-2 text-brand-600">
                <FileSignature size={20} />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Please review &amp; sign
                </span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">{contract.title}</h1>
              {contract.signerName && (
                <p className="mt-1 text-sm text-gray-500">
                  Prepared for {contract.signerName}
                </p>
              )}

              <div className="my-5 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">
                {contract.body}
              </div>

              {error && (
                <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {error}
                </p>
              )}

              <div className="space-y-4">
                <div>
                  <label className="label">Type your full name</label>
                  <input
                    className="input"
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Your full legal name"
                  />
                </div>
                <div>
                  <label className="label">Draw your signature</label>
                  <SignaturePad onChange={setSignature} />
                </div>
                <p className="text-xs text-gray-400">
                  By clicking “Sign &amp; submit”, you agree that your electronic
                  signature is the legal equivalent of your handwritten signature
                  on this document.
                </p>
                <button
                  className="btn-primary w-full justify-center"
                  onClick={sign}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <FileSignature size={16} />
                  )}
                  {submitting ? "Submitting…" : "Sign & submit"}
                </button>
              </div>
            </>
          ) : null}
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Secured by KTMC Internal · Do not share this link.
        </p>
      </div>
    </div>
  );
}
