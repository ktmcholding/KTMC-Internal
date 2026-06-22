import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  AppState,
  CategoryId,
  Client,
  ClientDocument,
  Invoice,
  Lead,
  SaleRecord,
  Task,
  CalendarEvent,
  QuoIntegrationConfig,
  CuratorIntegrationConfig,
} from "../types";
import { seedState } from "../data/seed";

const STORAGE_KEY = "ktmc-internal-state-v1";

type Action =
  | { type: "ADD_SALE"; sale: SaleRecord }
  | { type: "DELETE_SALE"; id: string }
  | { type: "ADD_LEAD"; lead: Lead }
  | { type: "UPDATE_LEAD"; lead: Lead }
  | { type: "DELETE_LEAD"; id: string }
  | { type: "ADD_INVOICE"; invoice: Invoice }
  | { type: "UPDATE_INVOICE"; invoice: Invoice }
  | { type: "DELETE_INVOICE"; id: string }
  | { type: "ADD_CLIENT"; client: Client }
  | { type: "UPDATE_CLIENT"; client: Client }
  | { type: "DELETE_CLIENT"; id: string }
  | { type: "ADD_CLIENT_DOCUMENTS"; clientId: string; documents: ClientDocument[] }
  | { type: "DELETE_CLIENT_DOCUMENT"; clientId: string; documentId: string }
  | { type: "ADD_TASK"; task: Task }
  | { type: "UPDATE_TASK"; task: Task }
  | { type: "DELETE_TASK"; id: string }
  | { type: "ADD_EVENT"; event: CalendarEvent }
  | { type: "DELETE_EVENT"; id: string }
  | { type: "SET_QUO"; config: QuoIntegrationConfig }
  | { type: "SET_CURATOR"; config: CuratorIntegrationConfig }
  | { type: "RESET" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
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
  // Convenience selectors
  clientsByCategory: (c: CategoryId) => Client[];
  leadsByCategory: (c: CategoryId) => Lead[];
  invoicesByCategory: (c: CategoryId) => Invoice[];
  salesByCategory: (c: CategoryId) => AppState["sales"];
  clientName: (id: string) => string;
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be full (e.g. large document payloads) — non-fatal
    }
  }, [state]);

  const value = useMemo<AppStoreContextValue>(
    () => ({
      state,
      dispatch,
      clientsByCategory: (c) => state.clients.filter((x) => x.category === c),
      leadsByCategory: (c) => state.leads.filter((x) => x.category === c),
      invoicesByCategory: (c) => state.invoices.filter((x) => x.category === c),
      salesByCategory: (c) => state.sales.filter((x) => x.category === c),
      clientName: (id) =>
        state.clients.find((x) => x.id === id)?.company ?? "Unknown client",
    }),
    [state]
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
