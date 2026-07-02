import type { Employee, SectionKey } from "../types";

export interface SectionDef {
  key: SectionKey;
  label: string;
  /** Always accessible to any signed-in user (e.g. the dashboard). */
  alwaysOn?: boolean;
  /** Only admins can access (e.g. team management & monitoring). */
  adminOnly?: boolean;
}

export const SECTIONS: SectionDef[] = [
  { key: "dashboard", label: "Overview", alwaysOn: true },
  { key: "formulation", label: "Formulation" },
  { key: "co-packing", label: "Co-packing" },
  { key: "private-white-label", label: "Private & White Label" },
  { key: "our-brands", label: "Our Brands" },
  { key: "software", label: "Software" },
  { key: "duties", label: "Duties & Tasks" },
  { key: "calendar", label: "Calendar" },
  { key: "documents", label: "Internal Documents" },
  { key: "curator", label: "Curator" },
  { key: "quo", label: "QUO (Leads)" },
  { key: "team", label: "Team & Monitoring", adminOnly: true },
  { key: "settings", label: "Settings", adminOnly: true },
];

/** Sections an admin can grant/revoke for an individual employee. */
export const ASSIGNABLE_SECTIONS = SECTIONS.filter(
  (s) => !s.alwaysOn && !s.adminOnly
);

export function sectionDef(key: SectionKey): SectionDef | undefined {
  return SECTIONS.find((s) => s.key === key);
}

/** Whether the given profile may access a section. */
export function canAccess(
  profile: Employee | null,
  key: SectionKey
): boolean {
  const def = sectionDef(key);
  if (def?.alwaysOn) return true;
  if (!profile || !profile.active) return false;
  if (profile.role === "admin") return true;
  if (def?.adminOnly) return false;
  return profile.permissions.includes(key);
}
