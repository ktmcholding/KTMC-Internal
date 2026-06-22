import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, monthLabel } from "../lib/format";

const BRAND = "#2347d6";
const POTENTIAL = "#8eb4ff";
const PIE_COLORS = ["#2347d6", "#3563f0", "#598bff", "#8eb4ff", "#bcd2ff"];

export interface MonthlyRevenuePoint {
  month: string; // YYYY-MM
  current: number;
  potential: number;
}

/** Bar chart comparing realised (current) revenue vs potential pipeline. */
export function CurrentVsPotentialChart({ data }: { data: MonthlyRevenuePoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
          <XAxis
            dataKey="month"
            tickFormatter={monthLabel}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(v: number) => formatCurrency(v)}
            labelFormatter={(l) => monthLabel(String(l))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="current" name="Current revenue" fill={BRAND} radius={[4, 4, 0, 0]} />
          <Bar
            dataKey="potential"
            name="Potential revenue"
            fill={POTENTIAL}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface BreakdownSlice {
  name: string;
  value: number;
}

/** Pie chart breaking down a total by some dimension (category, status...). */
export function BreakdownPie({ data }: { data: BreakdownSlice[] }) {
  const nonEmpty = data.filter((d) => d.value > 0);
  if (nonEmpty.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-400">
        No data yet
      </div>
    );
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={nonEmpty}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={50}
            paddingAngle={2}
          >
            {nonEmpty.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => formatCurrency(v)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
