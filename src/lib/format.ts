import type { CategoryId, Category } from "../types";

export const CATEGORIES: Category[] = [
  {
    id: "formulation",
    name: "Formulation",
    description: "Custom product formulation projects and R&D engagements.",
  },
  {
    id: "co-packing",
    name: "Co-packing",
    description: "Contract manufacturing and co-packing runs.",
  },
  {
    id: "private-white-label",
    name: "Private & White Label Products",
    description: "Private label and white-label product programs.",
  },
  {
    id: "our-brands",
    name: "Our Brands",
    description: "KTMC-owned brands and direct sales.",
  },
  {
    id: "software",
    name: "Software",
    description: "Software products and services offered by KTMC.",
  },
];

export function categoryById(id: CategoryId): Category {
  const found = CATEGORIES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown category: ${id}`);
  return found;
}

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const currencyFmtCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number, cents = false): string {
  return cents ? currencyFmtCents.format(value) : currencyFmt.format(value);
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function monthLabel(month: string): string {
  // month is "YYYY-MM"
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/** Generate a short, reasonably unique id without external deps. */
export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}
