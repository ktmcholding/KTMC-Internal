import type { Client, CompanyInfo, Invoice } from "../types";
import { formatCurrency, formatDate } from "./format";

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Build a printable invoice document (with the company letterhead) and open it
 * in a new window with the print dialog, so the user can "Save as PDF" and send
 * it to the client.
 */
export function openInvoicePdf(
  invoice: Invoice,
  client: Client | undefined,
  company: CompanyInfo
) {
  const total = invoice.lineItems.reduce(
    (s, li) => s + li.quantity * li.unitPrice,
    0
  );

  const rows = invoice.lineItems
    .map(
      (li) => `
      <tr>
        <td>${esc(li.description)}</td>
        <td class="num">${li.quantity}</td>
        <td class="num">${formatCurrency(li.unitPrice, true)}</td>
        <td class="num">${formatCurrency(li.quantity * li.unitPrice, true)}</td>
      </tr>`
    )
    .join("");

  const header = company.letterhead
    ? `<img class="letterhead" src="${company.letterhead}" alt="${esc(
        company.name
      )}" />`
    : `<div class="wordmark">${esc(company.name || "KTMC")}</div>`;

  const contactBits = [company.phone, company.email].filter(Boolean).map(esc);

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${esc(invoice.number)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 40px; }
  .letterhead { max-height: 110px; max-width: 60%; object-fit: contain; }
  .wordmark { font-size: 30px; font-weight: 800; color: #2347d6; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 24px; }
  .title { text-align: right; }
  .title h1 { font-size: 30px; letter-spacing: 4px; margin: 0 0 6px; color: #111827; }
  .muted { color: #6b7280; font-size: 13px; }
  .meta { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 28px; font-size: 14px; }
  .meta h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; color: #9ca3af; border-bottom: 1px solid #e5e7eb; padding: 8px 10px; }
  td { padding: 10px; border-bottom: 1px solid #f3f4f6; }
  .num { text-align: right; }
  .totals { margin-top: 16px; display: flex; justify-content: flex-end; }
  .totals table { width: 260px; }
  .totals td { border: none; padding: 6px 10px; }
  .grand { font-weight: 700; font-size: 18px; border-top: 2px solid #e5e7eb; }
  .status { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: capitalize; background: #eef2ff; color: #2347d6; }
  .notes { margin-top: 28px; font-size: 13px; color: #4b5563; white-space: pre-wrap; }
  .foot { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
  @media print { body { padding: 24px; } .noprint { display: none; } }
</style>
</head>
<body>
  <div class="top">
    <div>${header}
      <div class="muted" style="margin-top:8px;">${contactBits.join(" &nbsp;·&nbsp; ")}</div>
    </div>
    <div class="title">
      <h1>INVOICE</h1>
      <div class="muted">${esc(invoice.number)}</div>
      <div style="margin-top:8px;"><span class="status">${esc(invoice.status)}</span></div>
    </div>
  </div>

  <div class="meta">
    <div>
      <h3>Bill to</h3>
      <div><strong>${esc(client?.company ?? "Client")}</strong></div>
      ${client?.name ? `<div class="muted">${esc(client.name)}</div>` : ""}
      ${client?.email ? `<div class="muted">${esc(client.email)}</div>` : ""}
      ${client?.phone ? `<div class="muted">${esc(client.phone)}</div>` : ""}
    </div>
    <div style="text-align:right;">
      <h3>Details</h3>
      <div class="muted">Issued: ${formatDate(invoice.issueDate)}</div>
      <div class="muted">Due: ${formatDate(invoice.dueDate)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <table>
      <tr class="grand"><td>Total</td><td class="num">${formatCurrency(total, true)}</td></tr>
    </table>
  </div>

  ${invoice.notes ? `<div class="notes"><strong>Notes:</strong>\n${esc(invoice.notes)}</div>` : ""}

  <div class="foot">Thank you for your business — ${esc(company.name || "KTMC")}</div>

  <script>window.onload = function(){ setTimeout(function(){ window.focus(); window.print(); }, 300); };</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow pop-ups to generate the invoice PDF.");
    return;
  }
  w.document.write(html);
  w.document.close();
}
