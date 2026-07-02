// Core domain types for the KTMC internal system.

/** Business categories shown under "KTMC internal system". */
export type CategoryId =
  | "formulation"
  | "co-packing"
  | "private-white-label"
  | "our-brands"
  | "software";

export interface Category {
  id: CategoryId;
  name: string;
  /** Short description shown on the category header. */
  description: string;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

/** Where a lead originated. QUO = the business phone/website integration. */
export type LeadSource = "quo-phone" | "quo-website" | "manual" | "referral";

export interface Lead {
  id: string;
  category: CategoryId;
  name: string;
  company: string;
  email: string;
  phone: string;
  /** Estimated potential revenue if the lead converts. */
  potentialValue: number;
  status: LeadStatus;
  source: LeadSource;
  notes: string;
  createdAt: string; // ISO date
}

export interface SaleRecord {
  id: string;
  category: CategoryId;
  clientId: string;
  description: string;
  amount: number;
  /** Whether this sale recurs (subscription / retainer). */
  recurring: boolean;
  /** Month bucket for charting, e.g. "2026-01". */
  month: string;
  date: string; // ISO date
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  number: string;
  /** Optional custom label/title, e.g. "Deposit — Serum project". */
  label: string;
  category: CategoryId;
  clientId: string;
  issueDate: string; // ISO date
  dueDate: string; // ISO date
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  notes: string;
}

export interface ClientDocument {
  id: string;
  name: string;
  size: number; // bytes
  type: string; // mime type
  uploadedAt: string; // ISO date
  /** Which document area/section it belongs to on the client profile. */
  section: string;
  /** Storage object path (Supabase Storage). Absent in demo mode. */
  path?: string;
}

/** A goal/milestone tracked on a client profile (feeds the progress bar). */
export interface ClientGoal {
  id: string;
  label: string;
  done: boolean;
}

/** A named document upload area shown on every client profile. */
export interface ClientDocSection {
  id: string;
  name: string;
}

export const DEFAULT_CLIENT_DOC_SECTIONS: ClientDocSection[] = [
  { id: "general", name: "General documents" },
  { id: "product-profile", name: "Product profile" },
];

export interface Client {
  id: string;
  category: CategoryId;
  name: string;
  company: string;
  email: string;
  phone: string;
  /** Total recognised recurring revenue from this client (per month). */
  recurringRevenue: number;
  documents: ClientDocument[];
  /** Free-form notes about the client. */
  notes: string;
  /** Goals/milestones with a progress bar. */
  goals: ClientGoal[];
  createdAt: string; // ISO date
}

/** A recorded/summarized phone call (e.g. from QUO), tied to a client. */
export interface CallRecord {
  id: string;
  clientId?: string; // matched client, if any
  phone: string;
  direction: "inbound" | "outbound";
  summary: string;
  transcript: string;
  recordingUrl: string;
  durationSeconds: number;
  category?: CategoryId;
  occurredAt: string; // ISO timestamp
}

/** A sample of the user's past emails/conversations, used as a writing-style basis. */
export interface EmailExample {
  id: string;
  label: string;
  content: string;
}

/** A formulation ingredient / raw material tracked in inventory. */
export interface InventoryItem {
  id: string;
  name: string;
  /** Optional SKU / internal code. */
  sku: string;
  /** Quantity currently on hand. */
  quantity: number;
  /** Unit of measure, e.g. "kg", "g", "L", "units". */
  unit: string;
  /** Low-stock threshold; below this the item is flagged to reorder. */
  reorderLevel: number;
  /** Cost per unit. */
  unitCost: number;
  supplier: string;
  notes: string;
  updatedAt: string; // ISO date
}

export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string; // ISO date
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date (YYYY-MM-DD)
  time: string; // HH:mm
  category?: CategoryId;
  notes: string;
}

/** Configuration for the QUO phone/website lead-ingestion integration. */
export interface QuoIntegrationConfig {
  connected: boolean;
  phoneNumber: string;
  websiteUrl: string;
  apiKey: string;
  /** Default category new QUO leads are filed under. */
  defaultCategory: CategoryId;
  autoImport: boolean;
  lastSyncedAt: string | null;
}

/** Configuration for the external Curator software integration. */
export interface CuratorIntegrationConfig {
  connected: boolean;
  workspaceUrl: string;
  apiKey: string;
}

/** Company branding used on invoices, documents and email sign-offs. */
export interface CompanyInfo {
  name: string;
  phone: string;
  email: string;
  /** Header/letterhead image as a data URL (or "" if none uploaded). */
  letterhead: string;
}

/**
 * Standing invoice details that print on every generated invoice, so they
 * carry the proper information a client needs (address, how to pay, tax, terms).
 */
export interface InvoiceTemplate {
  /** Your business address block (multi-line). */
  fromAddress: string;
  /** Business / tax / GST-HST number shown on the invoice. */
  businessNumber: string;
  /** How the client should pay (bank details, e-transfer, terms). */
  paymentInstructions: string;
  /** Default terms/notes pre-filled into new invoices. */
  defaultTerms: string;
  /** Tax label, e.g. "GST/HST", "VAT", "Sales tax". */
  taxLabel: string;
  /** Tax rate as a percent (e.g. 13 for 13%). 0 = no tax line. */
  taxRate: number;
  /** Footer line printed at the bottom of the invoice. */
  footer: string;
  /** An uploaded example/existing invoice (image data URL) kept for reference. */
  exampleImage: string;
}

/** A folder/section id for the internal document vault (admin-customizable). */
export type InternalDocFolder = string;

/** A user-defined folder in the internal document vault. */
export interface DocFolder {
  id: string;
  name: string;
}

/** A company-wide internal document (not tied to a client). */
export interface InternalDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  folder: InternalDocFolder;
  notes: string;
  uploadedAt: string; // ISO date
  uploadedBy: string; // email/name
  path?: string; // storage object path
}

/** Keys for the access-controllable areas of the site. */
export type SectionKey =
  | "dashboard"
  | "formulation"
  | "co-packing"
  | "private-white-label"
  | "our-brands"
  | "software"
  | "duties"
  | "calendar"
  | "documents"
  | "curator"
  | "quo"
  | "team"
  | "settings";

/** Access level. 'admin' has full access and can manage the team. */
export type EmployeeRole = "admin" | "employee";

/** A custom, admin-defined role: a named bundle of section permissions. */
export interface Role {
  id: string;
  name: string;
  permissions: SectionKey[];
}

export interface Employee {
  id: string; // auth user id (or local id in demo mode)
  email: string;
  name: string;
  /** Access level used for admin privileges (kept for security/RLS). */
  role: EmployeeRole;
  /** Display label / job title (e.g. the assigned custom role's name). */
  title: string;
  /** Sections this employee may access (admins implicitly get everything). */
  permissions: SectionKey[];
  active: boolean;
  createdAt: string; // ISO date
}

/** A single recorded activity event used for silent time/work tracking. */
export interface ActivityEvent {
  id: string;
  userId: string;
  userEmail: string;
  type: "navigate" | "heartbeat" | "action";
  detail: string;
  path: string;
  at: string; // ISO timestamp
}

export interface AppState {
  leads: Lead[];
  sales: SaleRecord[];
  invoices: Invoice[];
  clients: Client[];
  tasks: Task[];
  events: CalendarEvent[];
  internalDocuments: InternalDocument[];
  docFolders: DocFolder[];
  clientDocSections: ClientDocSection[];
  /** Formulation ingredient inventory. */
  inventory: InventoryItem[];
  employees: Employee[];
  roles: Role[];
  calls: CallRecord[];
  emailExamples: EmailExample[];
  company: CompanyInfo;
  invoiceTemplate: InvoiceTemplate;
  quo: QuoIntegrationConfig;
  curator: CuratorIntegrationConfig;
}

/** Folders a new workspace starts with (then fully editable by admins). */
export const DEFAULT_DOC_FOLDERS: DocFolder[] = [
  { id: "general", name: "General" },
  { id: "hr", name: "HR" },
  { id: "legal", name: "Legal" },
  { id: "finance", name: "Finance" },
  { id: "operations", name: "Operations" },
  { id: "compliance", name: "Compliance" },
];
