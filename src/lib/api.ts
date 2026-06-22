import { supabase, DOCUMENTS_BUCKET } from "./supabase";
import type { Action } from "../store/actions";
import { emptyState } from "../data/seed";
import type {
  AppState,
  CalendarEvent,
  Client,
  ClientDocument,
  Invoice,
  InvoiceLineItem,
  Lead,
  SaleRecord,
  Task,
} from "../types";
import { uid } from "./format";

function db() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

// ---------------------------------------------------------------------------
// Row <-> domain mappers (DB is snake_case, the app is camelCase)
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => String(v ?? "");

function toClient(r: Row, documents: ClientDocument[]): Client {
  return {
    id: str(r.id),
    category: r.category as Client["category"],
    name: str(r.name),
    company: str(r.company),
    email: str(r.email),
    phone: str(r.phone),
    recurringRevenue: num(r.recurring_revenue),
    documents,
    createdAt: str(r.created_at),
  };
}

function toDocument(r: Row): ClientDocument {
  return {
    id: str(r.id),
    name: str(r.name),
    size: num(r.size),
    type: str(r.type),
    uploadedAt: str(r.uploaded_at),
    path: r.path ? str(r.path) : undefined,
  };
}

function toLead(r: Row): Lead {
  return {
    id: str(r.id),
    category: r.category as Lead["category"],
    name: str(r.name),
    company: str(r.company),
    email: str(r.email),
    phone: str(r.phone),
    potentialValue: num(r.potential_value),
    status: r.status as Lead["status"],
    source: r.source as Lead["source"],
    notes: str(r.notes),
    createdAt: str(r.created_at),
  };
}

function toSale(r: Row): SaleRecord {
  return {
    id: str(r.id),
    category: r.category as SaleRecord["category"],
    clientId: str(r.client_id),
    description: str(r.description),
    amount: num(r.amount),
    recurring: Boolean(r.recurring),
    month: str(r.month),
    date: str(r.date),
  };
}

function toLineItem(r: Row): InvoiceLineItem {
  return {
    id: str(r.id),
    description: str(r.description),
    quantity: num(r.quantity),
    unitPrice: num(r.unit_price),
  };
}

function toInvoice(r: Row, lineItems: InvoiceLineItem[]): Invoice {
  return {
    id: str(r.id),
    number: str(r.number),
    category: r.category as Invoice["category"],
    clientId: str(r.client_id),
    issueDate: str(r.issue_date),
    dueDate: str(r.due_date),
    status: r.status as Invoice["status"],
    lineItems,
    notes: str(r.notes),
  };
}

function toTask(r: Row): Task {
  return {
    id: str(r.id),
    title: str(r.title),
    description: str(r.description),
    assignee: str(r.assignee),
    status: r.status as Task["status"],
    priority: r.priority as Task["priority"],
    dueDate: str(r.due_date),
  };
}

function toEvent(r: Row): CalendarEvent {
  return {
    id: str(r.id),
    title: str(r.title),
    date: str(r.date),
    time: str(r.time),
    category: (r.category as CalendarEvent["category"]) || undefined,
    notes: str(r.notes),
  };
}

// ---------------------------------------------------------------------------
// Full load
// ---------------------------------------------------------------------------

export async function fetchAll(): Promise<AppState> {
  const sb = db();
  const [
    clientsRes,
    documentsRes,
    leadsRes,
    salesRes,
    invoicesRes,
    lineItemsRes,
    tasksRes,
    eventsRes,
    settingsRes,
  ] = await Promise.all([
    sb.from("clients").select("*"),
    sb.from("documents").select("*"),
    sb.from("leads").select("*"),
    sb.from("sales").select("*"),
    sb.from("invoices").select("*"),
    sb.from("invoice_line_items").select("*"),
    sb.from("tasks").select("*"),
    sb.from("events").select("*"),
    sb.from("settings").select("*"),
  ]);

  const firstError =
    clientsRes.error ||
    documentsRes.error ||
    leadsRes.error ||
    salesRes.error ||
    invoicesRes.error ||
    lineItemsRes.error ||
    tasksRes.error ||
    eventsRes.error ||
    settingsRes.error;
  if (firstError) throw firstError;

  const docsByClient = new Map<string, ClientDocument[]>();
  for (const r of documentsRes.data ?? []) {
    const cid = str((r as Row).client_id);
    const arr = docsByClient.get(cid) ?? [];
    arr.push(toDocument(r as Row));
    docsByClient.set(cid, arr);
  }

  const itemsByInvoice = new Map<string, InvoiceLineItem[]>();
  for (const r of lineItemsRes.data ?? []) {
    const iid = str((r as Row).invoice_id);
    const arr = itemsByInvoice.get(iid) ?? [];
    arr.push(toLineItem(r as Row));
    itemsByInvoice.set(iid, arr);
  }

  const settingsMap = new Map<string, unknown>();
  for (const r of settingsRes.data ?? []) {
    settingsMap.set(str((r as Row).key), (r as Row).value);
  }

  const base = emptyState();
  return {
    clients: (clientsRes.data ?? []).map((r) =>
      toClient(r as Row, docsByClient.get(str((r as Row).id)) ?? [])
    ),
    leads: (leadsRes.data ?? []).map((r) => toLead(r as Row)),
    sales: (salesRes.data ?? []).map((r) => toSale(r as Row)),
    invoices: (invoicesRes.data ?? []).map((r) =>
      toInvoice(r as Row, itemsByInvoice.get(str((r as Row).id)) ?? [])
    ),
    tasks: (tasksRes.data ?? []).map((r) => toTask(r as Row)),
    events: (eventsRes.data ?? []).map((r) => toEvent(r as Row)),
    quo: { ...base.quo, ...((settingsMap.get("quo") as object) ?? {}) },
    curator: {
      ...base.curator,
      ...((settingsMap.get("curator") as object) ?? {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Document storage (files actually uploaded to Supabase Storage)
// ---------------------------------------------------------------------------

/** Upload files to storage and return document records (rows inserted by persist). */
export async function uploadClientDocuments(
  clientId: string,
  files: File[]
): Promise<ClientDocument[]> {
  const sb = db();
  const out: ClientDocument[] = [];
  for (const file of files) {
    const id = uid("doc");
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${clientId}/${id}-${safeName}`;
    const { error } = await sb.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, file, { upsert: false });
    if (error) throw error;
    out.push({
      id,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString().slice(0, 10),
      path,
    });
  }
  return out;
}

/** Create a temporary signed URL to view/download a stored document. */
export async function getDocumentUrl(path: string): Promise<string | null> {
  const sb = db();
  const { data, error } = await sb.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, 60 * 5);
  if (error) {
    console.error("Failed to sign document URL", error);
    return null;
  }
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Write-through persistence: map a dispatched action to a Supabase mutation
// ---------------------------------------------------------------------------

export async function persist(action: Action): Promise<void> {
  const sb = db();

  switch (action.type) {
    case "ADD_SALE": {
      const s = action.sale;
      await throwOn(
        sb.from("sales").insert({
          id: s.id,
          category: s.category,
          client_id: s.clientId || null,
          description: s.description,
          amount: s.amount,
          recurring: s.recurring,
          month: s.month,
          date: s.date,
        })
      );
      return;
    }
    case "DELETE_SALE":
      await throwOn(sb.from("sales").delete().eq("id", action.id));
      return;

    case "ADD_LEAD": {
      const l = action.lead;
      await throwOn(sb.from("leads").insert(leadRow(l)));
      return;
    }
    case "UPDATE_LEAD":
      await throwOn(
        sb.from("leads").update(leadRow(action.lead)).eq("id", action.lead.id)
      );
      return;
    case "DELETE_LEAD":
      await throwOn(sb.from("leads").delete().eq("id", action.id));
      return;

    case "ADD_INVOICE": {
      const inv = action.invoice;
      await throwOn(sb.from("invoices").insert(invoiceRow(inv)));
      if (inv.lineItems.length) {
        await throwOn(
          sb.from("invoice_line_items").insert(
            inv.lineItems.map((li) => ({
              id: li.id,
              invoice_id: inv.id,
              description: li.description,
              quantity: li.quantity,
              unit_price: li.unitPrice,
            }))
          )
        );
      }
      return;
    }
    case "UPDATE_INVOICE":
      // The UI only edits scalar invoice fields (status) after creation.
      await throwOn(
        sb
          .from("invoices")
          .update(invoiceRow(action.invoice))
          .eq("id", action.invoice.id)
      );
      return;
    case "DELETE_INVOICE":
      await throwOn(sb.from("invoices").delete().eq("id", action.id));
      return;

    case "ADD_CLIENT":
      await throwOn(sb.from("clients").insert(clientRow(action.client)));
      return;
    case "UPDATE_CLIENT":
      await throwOn(
        sb.from("clients").update(clientRow(action.client)).eq("id", action.client.id)
      );
      return;
    case "DELETE_CLIENT":
      await throwOn(sb.from("clients").delete().eq("id", action.id));
      return;

    case "ADD_CLIENT_DOCUMENTS":
      await throwOn(
        sb.from("documents").insert(
          action.documents.map((d) => ({
            id: d.id,
            client_id: action.clientId,
            name: d.name,
            size: d.size,
            type: d.type,
            path: d.path ?? null,
            uploaded_at: d.uploadedAt,
          }))
        )
      );
      return;
    case "DELETE_CLIENT_DOCUMENT":
      if (action.path) {
        const { error } = await sb.storage
          .from(DOCUMENTS_BUCKET)
          .remove([action.path]);
        if (error) console.error("Failed to remove storage object", error);
      }
      await throwOn(sb.from("documents").delete().eq("id", action.documentId));
      return;

    case "ADD_TASK":
      await throwOn(sb.from("tasks").insert(taskRow(action.task)));
      return;
    case "UPDATE_TASK":
      await throwOn(
        sb.from("tasks").update(taskRow(action.task)).eq("id", action.task.id)
      );
      return;
    case "DELETE_TASK":
      await throwOn(sb.from("tasks").delete().eq("id", action.id));
      return;

    case "ADD_EVENT":
      await throwOn(sb.from("events").insert(eventRow(action.event)));
      return;
    case "DELETE_EVENT":
      await throwOn(sb.from("events").delete().eq("id", action.id));
      return;

    case "SET_QUO":
      await throwOn(
        sb.from("settings").upsert({ key: "quo", value: action.config })
      );
      return;
    case "SET_CURATOR":
      await throwOn(
        sb.from("settings").upsert({ key: "curator", value: action.config })
      );
      return;

    // Local-only actions (no persistence side effect).
    case "HYDRATE":
    case "RESET":
      return;
  }
}

// --- row builders -----------------------------------------------------------

function leadRow(l: Lead) {
  return {
    id: l.id,
    category: l.category,
    name: l.name,
    company: l.company,
    email: l.email,
    phone: l.phone,
    potential_value: l.potentialValue,
    status: l.status,
    source: l.source,
    notes: l.notes,
    created_at: l.createdAt,
  };
}

function invoiceRow(inv: Invoice) {
  return {
    id: inv.id,
    number: inv.number,
    category: inv.category,
    client_id: inv.clientId || null,
    issue_date: inv.issueDate,
    due_date: inv.dueDate || null,
    status: inv.status,
    notes: inv.notes,
  };
}

function clientRow(c: Client) {
  return {
    id: c.id,
    category: c.category,
    name: c.name,
    company: c.company,
    email: c.email,
    phone: c.phone,
    recurring_revenue: c.recurringRevenue,
    created_at: c.createdAt,
  };
}

function taskRow(t: Task) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    assignee: t.assignee,
    status: t.status,
    priority: t.priority,
    due_date: t.dueDate || null,
  };
}

function eventRow(e: CalendarEvent) {
  return {
    id: e.id,
    title: e.title,
    date: e.date,
    time: e.time,
    category: e.category ?? null,
    notes: e.notes,
  };
}

async function throwOn(p: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await p;
  if (error) throw error;
}
