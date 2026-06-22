import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "green" | "amber" | "brand";
}

const toneMap: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-gray-100 text-gray-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  brand: "bg-brand-100 text-brand-700",
};

export function StatCard({ label, value, hint, icon, tone = "default" }: StatCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        </div>
        {icon && (
          <span className={`rounded-lg p-2 ${toneMap[tone]}`}>{icon}</span>
        )}
      </div>
    </div>
  );
}
