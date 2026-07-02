import type { CompanyInfo, Contract } from "../types";
import { formatDate } from "./format";

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function multiline(s: string): string {
  return esc(s).replace(/\n/g, "<br/>");
}

/**
 * Open a printable version of a contract (with the signature block + audit
 * details if signed) so it can be saved as a PDF and kept on file.
 */
export function openContractPdf(contract: Contract, company: CompanyInfo) {
  const header = company.letterhead
    ? `<img class="letterhead" src="${company.letterhead}" alt="${esc(
        company.name
      )}" />`
    : `<div class="wordmark">${esc(company.name || "KTMC")}</div>`;

  const signed = contract.status === "signed";
  const signatureBlock = signed
    ? `
    <div class="sig">
      <h3>Signature</h3>
      ${
        contract.signature
          ? `<img class="sigimg" src="${contract.signature}" alt="Signature" />`
          : ""
      }
      <div class="sigline">
        <strong>${esc(contract.signerTypedName || contract.signerName)}</strong>
      </div>
      <div class="muted">Signed ${
        contract.signedAt ? esc(formatDate(contract.signedAt)) : ""
      }${contract.signedIp ? ` · IP ${esc(contract.signedIp)}` : ""}</div>
    </div>`
    : `
    <div class="sig">
      <h3>Signature</h3>
      <div class="sigempty">Awaiting signature</div>
      <div class="muted">Signer: ${esc(contract.signerName || "—")}</div>
    </div>`;

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(contract.title || "Contract")}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 48px; line-height: 1.55; }
  .letterhead { max-height: 100px; max-width: 55%; object-fit: contain; }
  .wordmark { font-size: 28px; font-weight: 800; color: #2347d6; }
  .top { border-bottom: 2px solid #e5e7eb; padding-bottom: 18px; margin-bottom: 24px; }
  h1 { font-size: 24px; margin: 18px 0 4px; color: #111827; }
  .muted { color: #6b7280; font-size: 13px; }
  .body { margin: 24px 0; font-size: 14px; white-space: normal; }
  .sig { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
  .sig h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin: 0 0 10px; }
  .sigimg { max-height: 90px; display: block; margin-bottom: 6px; }
  .sigline { border-top: 1px solid #9ca3af; display: inline-block; padding-top: 4px; min-width: 240px; }
  .sigempty { color: #b91c1c; font-size: 14px; margin-bottom: 6px; }
  .foot { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
  @media print { body { padding: 28px; } }
</style>
</head>
<body>
  <div class="top">
    ${header}
    <div class="muted" style="margin-top:8px;">${[company.phone, company.email]
      .filter(Boolean)
      .map(esc)
      .join(" &nbsp;·&nbsp; ")}</div>
  </div>

  <h1>${esc(contract.title || "Contract")}</h1>
  <div class="muted">Prepared ${esc(formatDate(contract.createdAt))} for ${esc(
    contract.signerName || "the client"
  )}</div>

  <div class="body">${multiline(contract.body)}</div>

  ${signatureBlock}

  <div class="foot">${esc(company.name || "KTMC")}</div>

  <script>window.onload = function(){ setTimeout(function(){ window.focus(); window.print(); }, 300); };</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow pop-ups to generate the contract PDF.");
    return;
  }
  w.document.write(html);
  w.document.close();
}
