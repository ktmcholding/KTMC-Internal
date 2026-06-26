import {
  supabase,
  DOCUMENTS_BUCKET,
  INTERNAL_DOCUMENTS_BUCKET,
} from "./supabase";
import { DEFAULT_DOC_FOLDERS } from "../types";
import type { Action } from "../store/actions";
import { emptyState } from "../data/seed";
import type {
  ActivityEvent,
  AppState,
  CalendarEvent,
  CallRecord,
  Client,
  ClientDocument,
  EmailExample,
  Employee,
  InternalDocument,
  InternalDocFolder,
  Invoice,
  InvoiceLineItem,
  Lead,
  SaleRecord,
  SectionKey,
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

export function toLead(r: Row): Lead {
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

export function toCall(r: Row): CallRecord {
  return {
    id: str(r.id),
    clientId: r.client_id ? str(r.client_id) : undefined,
    phone: str(r.phone),
    direction: (r.direction as CallRecord["direction"]) ?? "inbound",
    summary: str(r.summary),
    transcript: str(r.transcript),
    recordingUrl: str(r.recording_url),
    durationSeconds: num(r.duration_seconds),
    category: (r.category as CallRecord["category"]) || undefined,
    occurredAt: str(r.occurred_at),
  };
}

function toEmployee(r: Row): Employee {
  return {
    id: str(r.id),
    email: str(r.email),
    name: str(r.name),
    role: (r.role as Employee["role"]) ?? "employee",
    title: str(r.title),
    permissions: (r.permissions as SectionKey[]) ?? [],
    active: Boolean(r.active),
    createdAt: str(r.created_at),
  };
}

function toActivity(r: Row): ActivityEvent {
  return {
    id: str(r.id),
    userId: str(r.user_id),
    userEmail: str(r.user_email),
    type: r.type as ActivityEvent["type"],
    detail: str(r.detail),
    path: str(r.path),
    at: str(r.at),
  };
}

function toInternalDocument(r: Row): InternalDocument {
  return {
    id: str(r.id),
    name: str(r.name),
    size: num(r.size),
    type: str(r.type),
    folder: (str(r.folder) || "general") as InternalDocFolder,
    notes: str(r.notes),
    uploadedAt: str(r.uploaded_at),
    uploadedBy: str(r.uploaded_by),
    path: r.path ? str(r.path) : undefined,
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
    internalDocsRes,
    employeesRes,
    callsRes,
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
    sb.from("internal_documents").select("*"),
    sb.from("employees").select("*"),
    sb.from("calls").select("*"),
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
    settingsRes.error ||
    internalDocsRes.error ||
    employeesRes.error ||
    callsRes.error;
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
    internalDocuments: (internalDocsRes.data ?? []).map((r) =>
      toInternalDocument(r as Row)
    ),
    docFolders:
      (settingsMap.get("doc_folders") as AppState["docFolders"] | undefined) ??
      DEFAULT_DOC_FOLDERS.map((f) => ({ ...f })),
    employees: (employeesRes.data ?? []).map((r) => toEmployee(r as Row)),
    roles: (settingsMap.get("roles") as AppState["roles"] | undefined) ?? [],
    calls: (callsRes.data ?? []).map((r) => toCall(r as Row)),
    emailExamples:
      (settingsMap.get("email_examples") as EmailExample[] | undefined) ?? [],
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

/** Upload files to the internal vault and return document records. */
export async function uploadInternalDocuments(
  files: File[],
  folder: InternalDocFolder,
  uploadedBy: string,
  notes = ""
): Promise<InternalDocument[]> {
  const sb = db();
  const out: InternalDocument[] = [];
  for (const file of files) {
    const id = uid("idoc");
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${folder}/${id}-${safeName}`;
    const { error } = await sb.storage
      .from(INTERNAL_DOCUMENTS_BUCKET)
      .upload(path, file, { upsert: false });
    if (error) throw error;
    out.push({
      id,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      folder,
      notes,
      uploadedAt: new Date().toISOString().slice(0, 10),
      uploadedBy,
      path,
    });
  }
  return out;
}

export async function getInternalDocumentUrl(path: string): Promise<string | null> {
  const sb = db();
  const { data, error } = await sb.storage
    .from(INTERNAL_DOCUMENTS_BUCKET)
    .createSignedUrl(path, 60 * 5);
  if (error) {
    console.error("Failed to sign internal document URL", error);
    return null;
  }
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Activity tracking (silent; admin-only reads)
// ---------------------------------------------------------------------------

/** Record a single activity event. Fire-and-forget — never throws. */
export async function logActivity(
  userId: string,
  userEmail: string,
  type: ActivityEvent["type"],
  detail: string,
  path: string
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("activity_events").insert({
      id: uid("act"),
      user_id: userId,
      user_email: userEmail,
      type,
      detail,
      path,
    });
  } catch {
    // Tracking must never disrupt the app.
  }
}

/** Fetch recent activity (admin only via RLS). */
export async function fetchActivity(sinceIso: string): Promise<ActivityEvent[]> {
  const sb = db();
  const { data, error } = await sb
    .from("activity_events")
    .select("*")
    .gte("at", sinceIso)
    .order("at", { ascending: true })
    .limit(5000);
  if (error) throw error;
  return (data ?? []).map((r) => toActivity(r as Row));
}

// ---------------------------------------------------------------------------
// Employee management (admin) via the manage-employee Edge Function
// ---------------------------------------------------------------------------

export interface InvitedEmployee {
  employee: Employee;
  tempPassword?: string;
}

/** Create a team member (admin only). Returns the new profile + temp password. */
export async function createEmployee(input: {
  email: string;
  name: string;
  role: Employee["role"];
  title: string;
  permissions: SectionKey[];
}): Promise<InvitedEmployee> {
  const sb = db();
  const { data, error } = await sb.functions.invoke("manage-employee", {
    body: { action: "create", ...input },
  });
  if (error) throw error;
  const res = data as { employee: Row; tempPassword?: string };
  return {
    employee: toEmployee(res.employee),
    tempPassword: res.tempPassword,
  };
}

// ---------------------------------------------------------------------------
// AI email drafting (via the draft-email Edge Function, Claude Haiku 4.5)
// ---------------------------------------------------------------------------

export interface DraftEmailInput {
  clientName: string;
  context: string; // recent calls/notes summarising the conversation
  instruction: string; // what the email should achieve
  examples: { label: string; content: string }[]; // style samples
}

export interface DraftedEmail {
  subject: string;
  body: string;
}

export async function draftEmail(input: DraftEmailInput): Promise<DraftedEmail> {
  const sb = db();
  const { data, error } = await sb.functions.invoke("draft-email", {
    body: input,
  });
  if (error) throw error;
  const res = data as Partial<DraftedEmail> & { error?: string };
  if (res.error) throw new Error(res.error);
  return { subject: res.subject ?? "", body: res.body ?? "" };
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

    case "ADD_INTERNAL_DOCS":
      await throwOn(
        sb.from("internal_documents").insert(
          action.documents.map((d) => ({
            id: d.id,
            name: d.name,
            size: d.size,
            type: d.type,
            folder: d.folder,
            notes: d.notes,
            uploaded_at: d.uploadedAt,
            uploaded_by: d.uploadedBy,
            path: d.path ?? null,
          }))
        )
      );
      return;
    case "DELETE_INTERNAL_DOC":
      if (action.path) {
        const { error } = await sb.storage
          .from(INTERNAL_DOCUMENTS_BUCKET)
          .remove([action.path]);
        if (error) console.error("Failed to remove internal storage object", error);
      }
      await throwOn(sb.from("internal_documents").delete().eq("id", action.id));
      return;
    case "MOVE_INTERNAL_DOC":
      await throwOn(
        sb
          .from("internal_documents")
          .update({ folder: action.folder })
          .eq("id", action.id)
      );
      return;
    case "SET_DOC_FOLDERS":
      await throwOn(
        sb.from("settings").upsert({ key: "doc_folders", value: action.folders }, { onConflict: "key" })
      );
      return;

    case "ADD_EMPLOYEE":
      // Auth-user creation happens via the manage-employee Edge Function;
      // the local state update is enough here.
      return;
    case "UPDATE_EMPLOYEE":
      await throwOn(
        sb
          .from("employees")
          .update({
            name: action.employee.name,
            role: action.employee.role,
            title: action.employee.title,
            permissions: action.employee.permissions,
            active: action.employee.active,
          })
          .eq("id", action.employee.id)
      );
      return;
    case "DELETE_EMPLOYEE":
      await throwOn(sb.from("employees").delete().eq("id", action.id));
      return;
    case "SET_ROLES":
      await throwOn(
        sb.from("settings").upsert({ key: "roles", value: action.roles }, { onConflict: "key" })
      );
      return;

    case "ADD_CALL": {
      const c = action.call;
      await throwOn(
        sb.from("calls").insert({
          id: c.id,
          client_id: c.clientId ?? null,
          phone: c.phone,
          direction: c.direction,
          summary: c.summary,
          transcript: c.transcript,
          recording_url: c.recordingUrl,
          duration_seconds: c.durationSeconds,
          category: c.category ?? null,
          occurred_at: c.occurredAt,
        })
      );
      return;
    }
    case "DELETE_CALL":
      await throwOn(sb.from("calls").delete().eq("id", action.id));
      return;

    case "SET_EMAIL_EXAMPLES":
      await throwOn(
        sb
          .from("settings")
          .upsert({ key: "email_examples", value: action.examples }, { onConflict: "key" })
      );
      return;

    case "SET_QUO":
      await throwOn(
        sb.from("settings").upsert({ key: "quo", value: action.config }, { onConflict: "key" })
      );
      return;
    case "SET_CURATOR":
      await throwOn(
        sb.from("settings").upsert({ key: "curator", value: action.config }, { onConflict: "key" })
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
