import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import type { CategoryId } from "../types";
import { useAuth } from "../store/AuthStore";
import { CATEGORIES, categoryById } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { Tabs } from "../components/Tabs";
import { SalesSection } from "./sections/SalesSection";
import { InvoicesSection } from "./sections/InvoicesSection";
import { LeadsSection } from "./sections/LeadsSection";
import { ClientsSection } from "./sections/ClientsSection";
import { InventorySection } from "./sections/InventorySection";

type TabId = "sales" | "invoices" | "leads" | "clients" | "inventory";

const TABS: { id: TabId; label: string }[] = [
  { id: "sales", label: "Sales" },
  { id: "invoices", label: "Invoices" },
  { id: "leads", label: "Leads" },
  { id: "clients", label: "Clients" },
];

// The Inventory tab is only shown for Formulation (ingredient stock).
const INVENTORY_TAB: { id: TabId; label: string } = {
  id: "inventory",
  label: "Inventory",
};

function isCategory(id: string | undefined): id is CategoryId {
  return CATEGORIES.some((c) => c.id === id);
}

export function CategoryPage() {
  const { categoryId } = useParams();
  const { can } = useAuth();
  const [tab, setTab] = useState<TabId>("sales");

  if (!isCategory(categoryId)) {
    return <Navigate to="/" replace />;
  }
  if (!can(categoryId)) {
    return <Navigate to="/" replace />;
  }
  const category = categoryById(categoryId);
  const tabs =
    categoryId === "formulation" ? [...TABS, INVENTORY_TAB] : TABS;
  // Guard against a stale "inventory" selection when leaving Formulation.
  const activeTab = tabs.some((t) => t.id === tab) ? tab : "sales";

  return (
    <div>
      <PageHeader title={category.name} subtitle={category.description} />
      <Tabs tabs={tabs} active={activeTab} onChange={setTab} />

      {activeTab === "sales" && <SalesSection category={categoryId} />}
      {activeTab === "invoices" && <InvoicesSection category={categoryId} />}
      {activeTab === "leads" && <LeadsSection category={categoryId} />}
      {activeTab === "clients" && <ClientsSection category={categoryId} />}
      {activeTab === "inventory" && <InventorySection />}
    </div>
  );
}
