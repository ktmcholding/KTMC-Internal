import { Link } from "react-router-dom";
import { DollarSign, TrendingUp, Users, Repeat, ArrowRight } from "lucide-react";
import { useStore } from "../store/AppStore";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import {
  CurrentVsPotentialChart,
  BreakdownPie,
  type MonthlyRevenuePoint,
} from "../components/RevenueCharts";
import { CATEGORIES, categoryById, formatCurrency } from "../lib/format";
import { LeadSourceBadge, LeadStatusBadge } from "../components/Badges";

export function Dashboard() {
  const { state } = useStore();

  const totalSales = state.sales.reduce((sum, s) => sum + s.amount, 0);
  const potentialPipeline = state.leads
    .filter((l) => l.status !== "lost" && l.status !== "won")
    .reduce((sum, l) => sum + l.potentialValue, 0);
  const currentClients = state.clients.length;
  const recurringRevenue = state.clients.reduce(
    (sum, c) => sum + c.recurringRevenue,
    0
  );

  // Monthly current vs potential. Potential is spread as the open pipeline
  // attributed to the latest month for a simple at-a-glance comparison.
  const monthsSet = new Set(state.sales.map((s) => s.month));
  const months = Array.from(monthsSet).sort();
  const monthly: MonthlyRevenuePoint[] = months.map((m, i) => ({
    month: m,
    current: state.sales
      .filter((s) => s.month === m)
      .reduce((sum, s) => sum + s.amount, 0),
    // Attribute the full open pipeline to the most recent month as a forecast.
    potential: i === months.length - 1 ? potentialPipeline : 0,
  }));

  const salesByCategory = CATEGORIES.map((c) => ({
    name: c.name,
    value: state.sales
      .filter((s) => s.category === c.id)
      .reduce((sum, s) => sum + s.amount, 0),
  }));

  const recentLeads = [...state.leads]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Everything inputted across KTMC — sales, pipeline, clients and recurring revenue."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sales added up"
          value={formatCurrency(totalSales)}
          hint={`${state.sales.length} recorded sales`}
          icon={<DollarSign size={18} />}
          tone="brand"
        />
        <StatCard
          label="Lead potential added up"
          value={formatCurrency(potentialPipeline)}
          hint={`${state.leads.length} leads in pipeline`}
          icon={<TrendingUp size={18} />}
          tone="amber"
        />
        <StatCard
          label="Current clients"
          value={String(currentClients)}
          hint="Across all categories"
          icon={<Users size={18} />}
          tone="default"
        />
        <StatCard
          label="Recurring revenue"
          value={`${formatCurrency(recurringRevenue)}/mo`}
          hint="Monthly recurring"
          icon={<Repeat size={18} />}
          tone="green"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Current vs potential revenue
          </h2>
          <CurrentVsPotentialChart data={monthly} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Sales by category
          </h2>
          <BreakdownPie data={salesByCategory} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent leads</h2>
            <Link
              to="/quo"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              QUO integration <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {recentLeads.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {l.company}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {categoryById(l.category).name} · {l.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 pl-3">
                  <span className="text-sm font-medium text-gray-700">
                    {formatCurrency(l.potentialValue)}
                  </span>
                  <LeadSourceBadge source={l.source} />
                  <LeadStatusBadge status={l.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Category breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">Sales</th>
                  <th className="pb-2 text-right font-medium">Pipeline</th>
                  <th className="pb-2 text-right font-medium">Clients</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {CATEGORIES.map((c) => {
                  const sales = state.sales
                    .filter((s) => s.category === c.id)
                    .reduce((sum, s) => sum + s.amount, 0);
                  const pipeline = state.leads
                    .filter((l) => l.category === c.id)
                    .reduce((sum, l) => sum + l.potentialValue, 0);
                  const clients = state.clients.filter(
                    (cl) => cl.category === c.id
                  ).length;
                  return (
                    <tr key={c.id}>
                      <td className="py-2.5">
                        <Link
                          to={`/category/${c.id}`}
                          className="font-medium text-gray-800 hover:text-brand-700"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2.5 text-right text-gray-700">
                        {formatCurrency(sales)}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">
                        {formatCurrency(pipeline)}
                      </td>
                      <td className="py-2.5 text-right text-gray-500">{clients}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
