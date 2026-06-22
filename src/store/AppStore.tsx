import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type { AppState, CategoryId, Client, Invoice, Lead } from "../types";
import type { Action } from "./actions";
import { emptyState, seedState } from "../data/seed";
import { isSupabaseConfigured } from "../lib/supabase";
import { fetchAll, persist } from "../lib/api";
import { useAuth } from "./AuthStore";

const STORAGE_KEY = "ktmc-internal-state-v1";

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "ADD_SALE":
      return { ...state, sales: [action.sale, ...state.sales] };
    case "DELETE_SALE":
      return { ...state, sales: state.sales.filter((s) => s.id !== action.id) };

    case "ADD_LEAD":
      return { ...state, leads: [action.lead, ...state.leads] };
    case "UPDATE_LEAD":
      return {
        ...state,
        leads: state.leads.map((l) => (l.id === action.lead.id ? action.lead : l)),
      };
    case "DELETE_LEAD":
      return { ...state, leads: state.leads.filter((l) => l.id !== action.id) };

    case "ADD_INVOICE":
      return { ...state, invoices: [action.invoice, ...state.invoices] };
    case "UPDATE_INVOICE":
      return {
        ...state,
        invoices: state.invoices.map((i) =>
          i.id === action.invoice.id ? action.invoice : i
        ),
      };
    case "DELETE_INVOICE":
      return { ...state, invoices: state.invoices.filter((i) => i.id !== action.id) };

    case "ADD_CLIENT":
      return { ...state, clients: [action.client, ...state.clients] };
    case "UPDATE_CLIENT":
      return {
        ...state,
        clients: state.clients.map((c) =>
          c.id === action.client.id ? action.client : c
        ),
      };
    case "DELETE_CLIENT":
      return { ...state, clients: state.clients.filter((c) => c.id !== action.id) };

    case "ADD_CLIENT_DOCUMENTS":
      return {
        ...state,
        clients: state.clients.map((c) =>
          c.id === action.clientId
            ? { ...c, documents: [...c.documents, ...action.documents] }
            : c
        ),
      };
    case "DELETE_CLIENT_DOCUMENT":
      return {
        ...state,
        clients: state.clients.map((c) =>
          c.id === action.clientId
            ? {
                ...c,
                documents: c.documents.filter((d) => d.id !== action.documentId),
              }
            : c
        ),
      };

    case "ADD_TASK":
      return { ...state, tasks: [action.task, ...state.tasks] };
    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)),
      };
    case "DELETE_TASK":
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };

    case "ADD_EVENT":
      return { ...state, events: [...state.events, action.event] };
    case "DELETE_EVENT":
      return { ...state, events: state.events.filter((e) => e.id !== action.id) };

    case "SET_QUO":
      return { ...state, quo: action.config };
    case "SET_CURATOR":
      return { ...state, curator: action.config };

    case "RESET":
      return seedState;
    default:
      return state;
  }
}

function init(): AppState {
  // In Supabase mode we start empty and hydrate from the backend.
  if (isSupabaseConfigured) return emptyState();
  // Demo mode: restore from localStorage or fall back to seed data.
  if (typeof window === "undefined") return seedState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...seedState, ...(JSON.parse(raw) as AppState) };
  } catch {
    // ignore corrupt storage
  }
  return seedState;
}

interface AppStoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  /** True while the initial backend load is in flight (Supabase mode). */
  loading: boolean;
  /** Last sync/persist error, if any. */
  error: string | null;
  // Convenience selectors
  clientsByCategory: (c: CategoryId) => Client[];
  leadsByCategory: (c: CategoryId) => Lead[];
  invoicesByCategory: (c: CategoryId) => Invoice[];
  salesByCategory: (c: CategoryId) => AppState["sales"];
  clientName: (id: string) => string;
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, init);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Demo mode: persist the whole state to localStorage.
  useEffect(() => {
    if (isSupabaseConfigured) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be full (e.g. large document payloads) — non-fatal
    }
  }, [state]);

  // Supabase mode: load everything once the user is authenticated.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!user) {
      rawDispatch({ type: "HYDRATE", state: emptyState() });
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchAll()
      .then((s) => {
        if (!active) return;
        rawDispatch({ type: "HYDRATE", state: s });
        setError(null);
      })
      .catch((e) => {
        if (!active) return;
        console.error("Failed to load data from Supabase", e);
        setError(
          "Could not load data from the backend. Check your Supabase setup and that the migration has been run."
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user]);

  // Write-through dispatch: update local state immediately, then persist.
  const dispatch = useCallback<React.Dispatch<Action>>((action) => {
    rawDispatch(action);
    if (isSupabaseConfigured && action.type !== "HYDRATE") {
      persist(action).catch((e) => {
        console.error("Failed to save change to the backend", action.type, e);
        setError("A change could not be saved to the backend. Please retry.");
      });
    }
  }, []);

  const value = useMemo<AppStoreContextValue>(
    () => ({
      state,
      dispatch,
      loading,
      error,
      clientsByCategory: (c) => state.clients.filter((x) => x.category === c),
      leadsByCategory: (c) => state.leads.filter((x) => x.category === c),
      invoicesByCategory: (c) => state.invoices.filter((x) => x.category === c),
      salesByCategory: (c) => state.sales.filter((x) => x.category === c),
      clientName: (id) =>
        state.clients.find((x) => x.id === id)?.company ?? "Unknown client",
    }),
    [state, dispatch, loading, error]
  );

  return (
    <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useStore must be used within AppStoreProvider");
  return ctx;
}
