import type { InvoiceStatus, LeadStatus, LeadSource, TaskStatus, TaskPriority } from "../types";

const leadStatusStyles: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  qualified: "bg-violet-100 text-violet-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-gray-200 text-gray-600",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`badge ${leadStatusStyles[status]} capitalize`}>{status}</span>;
}

const leadSourceLabels: Record<LeadSource, string> = {
  "quo-phone": "QUO · Phone",
  "quo-website": "QUO · Website",
  manual: "Manual",
  referral: "Referral",
};

export function LeadSourceBadge({ source }: { source: LeadSource }) {
  const isQuo = source.startsWith("quo");
  return (
    <span
      className={`badge ${
        isQuo ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {leadSourceLabels[source]}
    </span>
  );
}

const invoiceStatusStyles: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`badge ${invoiceStatusStyles[status]} capitalize`}>{status}</span>
  );
}

const taskStatusStyles: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-600",
  "in-progress": "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const label = status === "in-progress" ? "In progress" : status;
  return (
    <span className={`badge ${taskStatusStyles[status]} capitalize`}>{label}</span>
  );
}

const taskPriorityStyles: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-red-100 text-red-700",
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`badge ${taskPriorityStyles[priority]} capitalize`}>
      {priority}
    </span>
  );
}
