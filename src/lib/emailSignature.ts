import type { CompanyInfo } from "../types";

/**
 * The KTMC email sign-off. Every drafted email to a client must end with this
 * block, e.g.:
 *
 *   Cheers,
 *   KTMC
 *   (555) 123-4567
 *   Sales@ktmcholdings.com
 */
export function emailSignature(company: CompanyInfo): string {
  const lines = ["Cheers,", company.name?.trim() || "KTMC"];
  if (company.phone?.trim()) lines.push(company.phone.trim());
  lines.push(company.email?.trim() || "Sales@ktmcholdings.com");
  return lines.join("\n");
}

const SIGNOFF_RE =
  /\n+\s*(cheers|best|regards|thanks|thank you|sincerely|warm regards|kind regards|best regards|talk soon|all the best)\b[\s\S]*$/i;

/**
 * Guarantee the body ends with the canonical KTMC signature. Strips any
 * sign-off the model already appended (to avoid a duplicate) and adds ours.
 */
export function withSignature(body: string, company: CompanyInfo): string {
  const sig = emailSignature(company);
  let trimmed = body.replace(/\s+$/, "");
  if (trimmed.endsWith(sig)) return trimmed;
  // Remove a trailing sign-off block the model may have written itself.
  trimmed = trimmed.replace(SIGNOFF_RE, "").replace(/\s+$/, "");
  return `${trimmed}\n\n${sig}`;
}
