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
}

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
  createdAt: string; // ISO date
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

export interface AppState {
  leads: Lead[];
  sales: SaleRecord[];
  invoices: Invoice[];
  clients: Client[];
  tasks: Task[];
  events: CalendarEvent[];
  quo: QuoIntegrationConfig;
  curator: CuratorIntegrationConfig;
}
