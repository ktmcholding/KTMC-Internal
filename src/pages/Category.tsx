import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import type { CategoryId } from "../types";
import { CATEGORIES, categoryById } from "../lib/format";
import { PageHeader } from "../components/PageHeader";
import { Tabs } from "../components/Tabs";
import { SalesSection } from "./sections/SalesSection";
import { InvoicesSection } from "./sections/InvoicesSection";
import { LeadsSection } from "./sections/LeadsSection";
import { ClientsSection } from "./sections/ClientsSection";

type TabId = "sales" | "invoices" | "leads" | "clients";

const TABS: { id: TabId; label: string }[] = [
  { id: "sales", label: "Sales" },
  { id: "invoices", label: "Invoices" },
  { id: "leads", label: "Leads" },
  { id: "clients", label: "Clients" },
];

function isCategory(id: string | undefined): id is CategoryId {
  return CATEGORIES.some((c) => c.id === id);
}

export function CategoryPage() {
  const { categoryId } = useParams();
  const [tab, setTab] = useState<TabId>("sales");

  if (!isCategory(categoryId)) {
    return <Navigate to="/" replace />;
  }
  const category = categoryById(categoryId);

  return (
    <div>
      <PageHeader title={category.name} subtitle={category.description} />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "sales" && <SalesSection category={categoryId} />}
      {tab === "invoices" && <InvoicesSection category={categoryId} />}
      {tab === "leads" && <LeadsSection category={categoryId} />}
      {tab === "clients" && <ClientsSection category={categoryId} />}
    </div>
  );
}
