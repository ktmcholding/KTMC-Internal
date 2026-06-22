import { useState } from "react";
import { Sparkles, ExternalLink, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { useStore } from "../store/AppStore";
import { PageHeader } from "../components/PageHeader";

export function Curator() {
  const { state, dispatch } = useStore();
  const curator = state.curator;
  const [workspaceUrl, setWorkspaceUrl] = useState(curator.workspaceUrl);
  const [apiKey, setApiKey] = useState(curator.apiKey);

  function connect() {
    dispatch({
      type: "SET_CURATOR",
      config: { connected: true, workspaceUrl, apiKey },
    });
  }

  function disconnect() {
    dispatch({
      type: "SET_CURATOR",
      config: { ...curator, connected: false },
    });
  }

  return (
    <div>
      <PageHeader
        title="Curator"
        subtitle="Connect KTMC Internal to your Curator software workspace."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-brand-100 p-2 text-brand-700">
                  <Sparkles size={18} />
                </span>
                <h2 className="text-sm font-semibold text-gray-900">
                  Curator workspace
                </h2>
              </div>
              {curator.connected ? (
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
                <label className="label">Curator workspace URL</label>
                <input
                  className="input"
                  placeholder="https://app.curator.com/your-workspace"
                  value={workspaceUrl}
                  onChange={(e) => setWorkspaceUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Curator API key</label>
                <input
                  className="input"
                  type="password"
                  placeholder="curator_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Used to authenticate requests to the Curator API. Replace with a
                  server-side secret before production use.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button className="btn-primary" onClick={connect}>
                  <Zap size={16} />{" "}
                  {curator.connected ? "Save & reconnect" : "Connect Curator"}
                </button>
                {curator.connected && (
                  <button className="btn-secondary" onClick={disconnect}>
                    Disconnect
                  </button>
                )}
                {curator.connected && workspaceUrl && (
                  <a
                    className="btn-ghost"
                    href={workspaceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Curator <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {curator.connected && (
            <div className="card mt-6 p-5">
              <h2 className="mb-2 text-sm font-semibold text-gray-900">
                Curator workspace
              </h2>
              <p className="mb-3 text-sm text-gray-500">
                Your Curator workspace is embedded below once the integration exposes an
                embeddable view. Until then, use the button above to open it in a new
                tab.
              </p>
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
                Curator embed placeholder
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="card p-5">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">About Curator</h2>
            <p className="text-sm text-gray-600">
              Curator is KTMC's external software tool. This tab links the internal
              system to your Curator workspace so the two can share data once the
              Curator API credentials are supplied.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                Single place to jump into Curator from KTMC Internal.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                Ready to sync records once the API is wired up.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
