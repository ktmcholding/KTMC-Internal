import { useState } from "react";
import {
  PhoneCall,
  Globe,
  Zap,
  CheckCircle2,
  AlertCircle,
  Download,
  Webhook,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  CloudDownload,
} from "lucide-react";
import type { CategoryId, Lead, LeadSource } from "../types";
import { useStore } from "../store/AppStore";
import { PageHeader } from "../components/PageHeader";
import { CATEGORIES, formatCurrency, formatDate, uid } from "../lib/format";
import { LeadSourceBadge } from "../components/Badges";
import { isSupabaseConfigured } from "../lib/supabase";
import { syncQuo, type QuoSyncResult } from "../lib/api";

const WEBHOOK_URL = isSupabaseConfigured
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quo-webhook`
  : "";

// Sample inbound payloads to demonstrate auto-capture. In production these
// arrive from QUO via webhook / API polling rather than being generated here.
const SAMPLE_INBOUND: Omit<Lead, "id" | "createdAt" | "category">[] = [
  {
    name: "Inbound caller",
    company: "Fresh Press Juicery",
    email: "hello@freshpress.co",
    phone: "+1 (480) 555-0144",
    potentialValue: 28000,
    status: "new",
    source: "quo-phone",
    notes: "Called the QUO line asking about cold-press co-packing.",
  },
  {
    name: "Website visitor",
    company: "NorthPeak Supplements",
    email: "ops@northpeak.com",
    phone: "+1 (970) 555-0177",
    potentialValue: 19500,
    status: "new",
    source: "quo-website",
    notes: "Submitted the QUO contact form on the formulation page.",
  },
];

export function QuoIntegration() {
  const { state, dispatch, refresh, loading } = useStore();
  const quo = state.quo;
  const [copied, setCopied] = useState(false);

  function copyWebhookUrl() {
    navigator.clipboard?.writeText(WEBHOOK_URL).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => undefined
    );
  }
  const [phoneNumber, setPhoneNumber] = useState(quo.phoneNumber);
  const [websiteUrl, setWebsiteUrl] = useState(quo.websiteUrl);
  const [apiKey, setApiKey] = useState(quo.apiKey);
  const [defaultCategory, setDefaultCategory] = useState<CategoryId>(
    quo.defaultCategory
  );
  const [autoImport, setAutoImport] = useState(quo.autoImport);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<QuoSyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const quoLeads = state.leads.filter((l) => l.source.startsWith("quo"));

  async function syncNow() {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await syncQuo({
        defaultCategory,
        withCalls: true,
      });
      setSyncResult(res);
      dispatch({
        type: "SET_QUO",
        config: { ...quo, lastSyncedAt: new Date().toISOString() },
      });
      await refresh();
    } catch (e) {
      setSyncError(
        e instanceof Error ? e.message : "Could not sync from Quo. Check the setup."
      );
    } finally {
      setSyncing(false);
    }
  }

  function connect() {
    dispatch({
      type: "SET_QUO",
      config: {
        connected: true,
        phoneNumber,
        websiteUrl,
        apiKey,
        defaultCategory,
        autoImport,
        lastSyncedAt: new Date().toISOString(),
      },
    });
  }

  function disconnect() {
    dispatch({
      type: "SET_QUO",
      config: { ...quo, connected: false },
    });
  }

  function simulateImport() {
    const now = new Date().toISOString();
    SAMPLE_INBOUND.forEach((payload, i) => {
      const lead: Lead = {
        ...payload,
        id: uid("l"),
        category: defaultCategory,
        source: payload.source as LeadSource,
        createdAt: now.slice(0, 10),
      };
      // stagger ids so they are distinct
      lead.id = uid(`l${i}`);
      dispatch({ type: "ADD_LEAD", lead });
    });
    dispatch({
      type: "SET_QUO",
      config: { ...quo, connected: true, lastSyncedAt: now },
    });
  }

  return (
    <div>
      <PageHeader
        title="QUO — Lead Capture"
        subtitle="Connect your QUO business phone number and website so new leads flow into the system automatically."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Connection settings
              </h2>
              {quo.connected ? (
                <span className="badge bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={13} className="mr-1" /> Connected
                </span>
              ) : (
                <span className="badge bg-gray-100 text-gray-600">
                  <AlertCircle size={13} className="mr-1" /> Not connected
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">
                  <PhoneCall size={12} className="mr-1 inline" /> QUO business phone
                  number
                </label>
                <input
                  className="input"
                  placeholder="+1 (___) ___-____"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="label">
                  <Globe size={12} className="mr-1 inline" /> QUO website URL
                </label>
                <input
                  className="input"
                  placeholder="https://quo.yourbusiness.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="label">QUO API key</label>
                <input
                  className="input"
                  type="password"
                  placeholder="quo_live_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Stored locally for this demo. In production this is held server-side
                  and used to receive QUO webhooks.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">File new leads under</label>
                  <select
                    className="input"
                    value={defaultCategory}
                    onChange={(e) =>
                      setDefaultCategory(e.target.value as CategoryId)
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={autoImport}
                    onChange={(e) => setAutoImport(e.target.checked)}
                  />
                  Auto-import inbound leads
                </label>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button className="btn-primary" onClick={connect}>
                  <Zap size={16} /> {quo.connected ? "Save & reconnect" : "Connect QUO"}
                </button>
                {quo.connected && (
                  <button className="btn-secondary" onClick={disconnect}>
                    Disconnect
                  </button>
                )}
                <button
                  className="btn-secondary"
                  onClick={simulateImport}
                  title="Demonstrates how inbound QUO leads land in the system"
                >
                  <Download size={16} /> Simulate inbound leads
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card p-5">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">How it works</h2>
            <ol className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="font-semibold text-brand-600">1.</span> A customer
                calls your QUO number or submits your QUO website form.
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-brand-600">2.</span> QUO sends the
                contact details to KTMC Internal via webhook.
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-brand-600">3.</span> A new lead is
                created instantly under the chosen category and appears in that
                category's Leads tab.
              </li>
            </ol>
            <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              Last sync:{" "}
              {quo.lastSyncedAt
                ? new Date(quo.lastSyncedAt).toLocaleString()
                : "never"}
            </p>
          </div>

          {isSupabaseConfigured && (
            <div className="card mt-6 p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-lg bg-brand-100 p-1.5 text-brand-700">
                  <CloudDownload size={16} />
                </span>
                <h2 className="text-sm font-semibold text-gray-900">
                  Import from Quo
                </h2>
              </div>
              <p className="mb-3 text-xs text-gray-500">
                Pull the contacts and recent calls already stored in your Quo
                account into the system. New contacts become leads; calls are
                added to the matching client's history. Runs safely — existing
                records are skipped, not duplicated.
              </p>
              <button
                className="btn-primary w-full justify-center"
                onClick={syncNow}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CloudDownload size={16} />
                )}
                {syncing ? "Syncing from Quo…" : "Sync from Quo now"}
              </button>
              {syncResult && (
                <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Synced {syncResult.contacts} contact(s) —{" "}
                  {syncResult.leadsAdded} new lead(s) and {syncResult.calls} call(s)
                  added.
                  {syncResult.errors.length > 0 && (
                    <span className="mt-1 block text-amber-700">
                      Some items were skipped: {syncResult.errors[0]}
                    </span>
                  )}
                </div>
              )}
              {syncError && (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {syncError}
                </div>
              )}
              <p className="mt-2 text-xs text-gray-400">
                Requires the <code>quo-sync</code> function deployed and a{" "}
                <code>QUO_API_KEY</code> secret set in Supabase.
              </p>
            </div>
          )}

          {isSupabaseConfigured && (
            <div className="card mt-6 p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-lg bg-brand-100 p-1.5 text-brand-700">
                  <Webhook size={16} />
                </span>
                <h2 className="text-sm font-semibold text-gray-900">Webhook URL</h2>
              </div>
              <p className="mb-2 text-xs text-gray-500">
                Paste this into your QUO account's webhook settings, and append
                <code className="mx-1 rounded bg-gray-100 px-1">?secret=…</code>
                matching your deployed <code>QUO_WEBHOOK_SECRET</code>.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-gray-50 px-2 py-1.5 text-xs text-gray-700">
                  {WEBHOOK_URL}
                </code>
                <button
                  className="btn-secondary px-2 py-1.5"
                  onClick={copyWebhookUrl}
                  aria-label="Copy webhook URL"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Deploy the function with{" "}
                <code className="rounded bg-gray-100 px-1">
                  supabase functions deploy quo-webhook --no-verify-jwt
                </code>
                . See the README for full steps.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 card">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Leads captured via QUO ({quoLeads.length})
          </h2>
          {isSupabaseConfigured && (
            <button
              className="btn-secondary"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          )}
        </div>
        {quoLeads.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            No QUO leads yet. Connect QUO or simulate inbound leads to see them here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-2 font-medium">Company</th>
                  <th className="px-5 py-2 font-medium">Category</th>
                  <th className="px-5 py-2 font-medium">Source</th>
                  <th className="px-5 py-2 font-medium">Captured</th>
                  <th className="px-5 py-2 text-right font-medium">Potential</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quoLeads.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-gray-800">{l.company}</p>
                      <p className="text-xs text-gray-500">{l.name}</p>
                    </td>
                    <td className="px-5 py-2.5">
                      <select
                        className="rounded border border-gray-200 bg-white px-1.5 py-1 text-xs"
                        value={l.category}
                        title="Move this lead to another category"
                        onChange={(e) => {
                          const next = e.target.value as CategoryId;
                          if (next !== l.category) {
                            dispatch({
                              type: "UPDATE_LEAD",
                              lead: { ...l, category: next },
                            });
                          }
                        }}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-2.5">
                      <LeadSourceBadge source={l.source} />
                    </td>
                    <td className="px-5 py-2.5 text-gray-600">
                      {formatDate(l.createdAt)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-800">
                      {formatCurrency(l.potentialValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
