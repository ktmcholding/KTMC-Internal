import type { AppState } from "../types";
import { DEFAULT_DOC_FOLDERS, DEFAULT_CLIENT_DOC_SECTIONS } from "../types";

/** Default integration config used by both demo and backend modes. */
const defaultQuo: AppState["quo"] = {
  connected: false,
  phoneNumber: "",
  websiteUrl: "",
  apiKey: "",
  defaultCategory: "formulation",
  autoImport: true,
  lastSyncedAt: null,
};

const defaultCurator: AppState["curator"] = {
  connected: false,
  workspaceUrl: "",
  apiKey: "",
};

const defaultCompany: AppState["company"] = {
  name: "KTMC",
  phone: "",
  email: "Sales@ktmcholdings.com",
  letterhead: "",
};

/** An empty workspace (used in Supabase mode before/without data). */
export function emptyState(): AppState {
  return {
    clients: [],
    sales: [],
    leads: [],
    invoices: [],
    tasks: [],
    events: [],
    internalDocuments: [],
    docFolders: DEFAULT_DOC_FOLDERS.map((f) => ({ ...f })),
    clientDocSections: DEFAULT_CLIENT_DOC_SECTIONS.map((f) => ({ ...f })),
    inventory: [],
    employees: [],
    roles: [],
    calls: [],
    emailExamples: [],
    company: { ...defaultCompany },
    quo: { ...defaultQuo },
    curator: { ...defaultCurator },
  };
}

// Seed data so the app is immediately useful as a working foundation.
// In production this would be replaced by a backend / database.
export const seedState: AppState = {
  clients: [
    {
      id: "cli_aurora",
      category: "formulation",
      name: "Dana Wills",
      company: "Aurora Wellness",
      email: "dana@aurorawellness.com",
      phone: "+1 (415) 555-0142",
      recurringRevenue: 4200,
      documents: [
        {
          id: "doc_1",
          name: "Formulation-brief.pdf",
          size: 248_512,
          type: "application/pdf",
          section: "general",
          uploadedAt: "2026-03-12",
        },
      ],
      notes: "Prefers email updates. Targeting a Q3 launch.",
      goals: [
        { id: "g1", label: "Finalize serum formula", done: true },
        { id: "g2", label: "Stability testing", done: false },
        { id: "g3", label: "First production run", done: false },
      ],
      createdAt: "2025-11-04",
    },
    {
      id: "cli_pure",
      category: "co-packing",
      name: "Marcus Lee",
      company: "PureFill Co.",
      email: "marcus@purefill.co",
      phone: "+1 (312) 555-0188",
      recurringRevenue: 9800,
      documents: [],
      notes: "",
      goals: [],
      createdAt: "2025-09-21",
    },
    {
      id: "cli_lumen",
      category: "private-white-label",
      name: "Sofia Marin",
      company: "Lumen Skincare",
      email: "sofia@lumenskincare.com",
      phone: "+1 (646) 555-0199",
      recurringRevenue: 6500,
      documents: [],
      notes: "",
      goals: [],
      createdAt: "2026-01-15",
    },
    {
      id: "cli_ktmc",
      category: "our-brands",
      name: "Internal",
      company: "KTMC House Brand",
      email: "brands@ktmc.com",
      phone: "+1 (212) 555-0100",
      recurringRevenue: 12500,
      documents: [],
      notes: "",
      goals: [],
      createdAt: "2025-06-01",
    },
    {
      id: "cli_devshop",
      category: "software",
      name: "Priya Nair",
      company: "DevShop Labs",
      email: "priya@devshoplabs.io",
      phone: "+1 (737) 555-0123",
      recurringRevenue: 3200,
      documents: [],
      notes: "",
      goals: [],
      createdAt: "2026-02-28",
    },
  ],
  sales: [
    // Formulation
    { id: "s1", category: "formulation", clientId: "cli_aurora", description: "Serum formulation phase 1", amount: 8200, recurring: false, month: "2026-01", date: "2026-01-18" },
    { id: "s2", category: "formulation", clientId: "cli_aurora", description: "Stability retainer", amount: 4200, recurring: true, month: "2026-02", date: "2026-02-18" },
    { id: "s3", category: "formulation", clientId: "cli_aurora", description: "Stability retainer", amount: 4200, recurring: true, month: "2026-03", date: "2026-03-18" },
    // Co-packing
    { id: "s4", category: "co-packing", clientId: "cli_pure", description: "Production run Q1", amount: 22000, recurring: false, month: "2026-01", date: "2026-01-09" },
    { id: "s5", category: "co-packing", clientId: "cli_pure", description: "Monthly fulfilment", amount: 9800, recurring: true, month: "2026-02", date: "2026-02-09" },
    { id: "s6", category: "co-packing", clientId: "cli_pure", description: "Monthly fulfilment", amount: 9800, recurring: true, month: "2026-03", date: "2026-03-09" },
    // Private & white label
    { id: "s7", category: "private-white-label", clientId: "cli_lumen", description: "White-label line launch", amount: 15400, recurring: false, month: "2026-02", date: "2026-02-22" },
    { id: "s8", category: "private-white-label", clientId: "cli_lumen", description: "Replenishment", amount: 6500, recurring: true, month: "2026-03", date: "2026-03-22" },
    // Our brands
    { id: "s9", category: "our-brands", clientId: "cli_ktmc", description: "DTC revenue Jan", amount: 12500, recurring: true, month: "2026-01", date: "2026-01-31" },
    { id: "s10", category: "our-brands", clientId: "cli_ktmc", description: "DTC revenue Feb", amount: 13900, recurring: true, month: "2026-02", date: "2026-02-28" },
    { id: "s11", category: "our-brands", clientId: "cli_ktmc", description: "DTC revenue Mar", amount: 15200, recurring: true, month: "2026-03", date: "2026-03-31" },
    // Software
    { id: "s12", category: "software", clientId: "cli_devshop", description: "Platform subscription", amount: 3200, recurring: true, month: "2026-01", date: "2026-01-12" },
    { id: "s13", category: "software", clientId: "cli_devshop", description: "Platform subscription", amount: 3200, recurring: true, month: "2026-02", date: "2026-02-12" },
    { id: "s14", category: "software", clientId: "cli_devshop", description: "Platform subscription + add-on", amount: 4100, recurring: true, month: "2026-03", date: "2026-03-12" },
  ],
  leads: [
    { id: "l1", category: "formulation", name: "Helena Cruz", company: "Verde Botanicals", email: "helena@verdebotanicals.com", phone: "+1 (503) 555-0171", potentialValue: 18000, status: "qualified", source: "quo-website", notes: "Wants a natural sunscreen formulation.", createdAt: "2026-05-30" },
    { id: "l2", category: "co-packing", name: "Tom Becker", company: "Hydra Drinks", email: "tom@hydradrinks.com", phone: "+1 (708) 555-0150", potentialValue: 45000, status: "new", source: "quo-phone", notes: "Inbound call — needs canning line for 50k units.", createdAt: "2026-06-18" },
    { id: "l3", category: "private-white-label", name: "Ana Ruiz", company: "Glow Theory", email: "ana@glowtheory.com", phone: "+1 (917) 555-0133", potentialValue: 26000, status: "contacted", source: "quo-website", notes: "Requesting white-label cosmetics catalogue.", createdAt: "2026-06-10" },
    { id: "l4", category: "our-brands", name: "Retail buyer", company: "GreenMart", email: "buying@greenmart.com", phone: "+1 (202) 555-0166", potentialValue: 32000, status: "qualified", source: "referral", notes: "Wholesale order for house brand.", createdAt: "2026-06-02" },
    { id: "l5", category: "software", name: "Jordan Smith", company: "Cloudpeak", email: "jordan@cloudpeak.dev", phone: "+1 (415) 555-0190", potentialValue: 12000, status: "new", source: "quo-website", notes: "Submitted demo request form.", createdAt: "2026-06-20" },
  ],
  invoices: [
    {
      id: "inv1",
      number: "KTMC-2026-0001",
      category: "co-packing",
      clientId: "cli_pure",
      issueDate: "2026-03-09",
      dueDate: "2026-04-08",
      status: "paid",
      lineItems: [
        { id: "li1", description: "Monthly fulfilment", quantity: 1, unitPrice: 9800 },
      ],
      notes: "",
    },
    {
      id: "inv2",
      number: "KTMC-2026-0002",
      category: "formulation",
      clientId: "cli_aurora",
      issueDate: "2026-03-18",
      dueDate: "2026-04-17",
      status: "sent",
      lineItems: [
        { id: "li2", description: "Stability retainer", quantity: 1, unitPrice: 4200 },
      ],
      notes: "Net 30.",
    },
  ],
  tasks: [
    { id: "t1", title: "Send Q2 stability report to Aurora", description: "Compile and email the stability data.", assignee: "Lab team", status: "in-progress", priority: "high", dueDate: "2026-06-25" },
    { id: "t2", title: "Order canning components", description: "For Hydra Drinks trial run.", assignee: "Ops", status: "todo", priority: "medium", dueDate: "2026-06-30" },
    { id: "t3", title: "Update white-label catalogue", description: "Add new fragrance line.", assignee: "Marketing", status: "todo", priority: "low", dueDate: "2026-07-05" },
    { id: "t4", title: "Reconcile March invoices", description: "Match payments to invoices.", assignee: "Finance", status: "done", priority: "medium", dueDate: "2026-06-15" },
  ],
  events: [
    { id: "e1", title: "Aurora formulation review", date: "2026-06-24", time: "10:00", category: "formulation", notes: "Phase 2 kickoff." },
    { id: "e2", title: "Hydra Drinks site visit", date: "2026-06-26", time: "14:00", category: "co-packing", notes: "Tour the canning line." },
    { id: "e3", title: "Brand marketing standup", date: "2026-06-22", time: "09:30", category: "our-brands", notes: "" },
  ],
  internalDocuments: [
    {
      id: "idoc_1",
      name: "Employee-handbook.pdf",
      size: 412_000,
      type: "application/pdf",
      folder: "hr",
      notes: "Current company handbook.",
      uploadedAt: "2026-01-10",
      uploadedBy: "ktmcholding@gmail.com",
    },
    {
      id: "idoc_2",
      name: "Supplier-NDA-template.docx",
      size: 88_000,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      folder: "legal",
      notes: "Standard NDA we send to suppliers.",
      uploadedAt: "2026-03-02",
      uploadedBy: "ktmcholding@gmail.com",
    },
  ],
  docFolders: DEFAULT_DOC_FOLDERS.map((f) => ({ ...f })),
  clientDocSections: DEFAULT_CLIENT_DOC_SECTIONS.map((f) => ({ ...f })),
  inventory: [
    { id: "ing_1", name: "Hyaluronic Acid (LMW)", sku: "HA-LMW-01", quantity: 12, unit: "kg", reorderLevel: 5, unitCost: 145, supplier: "Actives Supply Co.", notes: "Cosmetic grade.", updatedAt: "2026-06-01" },
    { id: "ing_2", name: "Vitamin C (SAP)", sku: "VC-SAP-02", quantity: 3, unit: "kg", reorderLevel: 4, unitCost: 88, supplier: "Actives Supply Co.", notes: "Store cool & dry.", updatedAt: "2026-06-12" },
    { id: "ing_3", name: "Glycerin (USP)", sku: "GLY-USP", quantity: 60, unit: "L", reorderLevel: 20, unitCost: 6, supplier: "BulkChem", notes: "", updatedAt: "2026-05-20" },
    { id: "ing_4", name: "Phenoxyethanol", sku: "PRES-PE", quantity: 8, unit: "L", reorderLevel: 10, unitCost: 22, supplier: "PreservaChem", notes: "Preservative.", updatedAt: "2026-06-18" },
  ],
  emailExamples: [
    {
      id: "ex_1",
      label: "Follow-up after a sales call",
      content:
        "Hi {{name}},\n\nGreat speaking with you earlier. To recap what we discussed: you're looking to move forward with a first production run, and I'll have a detailed quote over to you by end of week. In the meantime, let me know if any other questions come up.\n\nBest,\nKTMC Team",
    },
  ],
  calls: [
    {
      id: "call_1",
      clientId: "cli_aurora",
      phone: "+1 (415) 555-0142",
      direction: "inbound",
      summary:
        "Dana called to check on the serum stability timeline and asked about scaling the formulation to 5,000 units. Agreed to send an updated quote by Friday.",
      transcript: "",
      recordingUrl: "",
      durationSeconds: 372,
      category: "formulation",
      occurredAt: "2026-06-20T15:12:00Z",
    },
  ],
  employees: [
    {
      id: "demo-user",
      email: "ktmcholding@gmail.com",
      name: "KTMC Owner",
      role: "admin",
      title: "Admin",
      permissions: [],
      active: true,
      createdAt: "2025-06-01",
    },
    {
      id: "emp_sample",
      email: "sales@ktmc.com",
      name: "Sample Employee",
      role: "employee",
      title: "Sales Rep",
      permissions: ["formulation", "co-packing", "calendar", "quo"],
      active: true,
      createdAt: "2026-02-01",
    },
  ],
  roles: [
    {
      id: "role_sales",
      name: "Sales Rep",
      permissions: ["formulation", "co-packing", "our-brands", "calendar", "quo"],
    },
    {
      id: "role_ops",
      name: "Operations",
      permissions: ["co-packing", "private-white-label", "duties", "calendar", "documents"],
    },
    {
      id: "role_finance",
      name: "Finance",
      permissions: ["formulation", "co-packing", "private-white-label", "our-brands", "software"],
    },
  ],
  company: { ...defaultCompany },
  quo: {
    connected: false,
    phoneNumber: "",
    websiteUrl: "",
    apiKey: "",
    defaultCategory: "formulation",
    autoImport: true,
    lastSyncedAt: null,
  },
  curator: {
    connected: false,
    workspaceUrl: "",
    apiKey: "",
  },
};
