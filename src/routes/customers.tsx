import { createFileRoute } from "@tanstack/react-router";
import { CustomerActivityChart } from "@/components/dashboard-charts";
import { useErpOverview } from "@/hooks/use-erp-overview";
import { formatNaira } from "@/lib/dashboard-data";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers — Farm Alert" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const { data } = useErpOverview();
  const live = data?.ok ? data : null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground">Buying behavior, retention and customer value across all eight distribution centers.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-base font-semibold">Six-month customer trend</h2>
        <div className="grid gap-3 md:grid-cols-3">{live?.monthlyRevenue.map((row) => <div key={row.month} className="border-l-2 border-brand-green pl-3"><p className="text-xs text-muted-foreground">{row.month}</p><p className="font-semibold">{row.customers} active customers</p><p className="text-xs text-muted-foreground">{row.newCustomers} new · {row.returningCustomers} returning · {formatNaira(row.revenue)}</p></div>)}</div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card p-5">
        <h2 className="mb-1 text-base font-semibold">Top 10 customers this month</h2>
        <p className="mb-4 text-xs text-muted-foreground">Ranked by submitted sales, with prior-month movement and buying behavior.</p>
        <table className="w-full text-sm"><thead className="text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2">Customer</th><th>Center</th><th>This month</th><th>Last month</th><th>Change</th><th>Orders</th><th>Behavior</th></tr></thead><tbody>{live?.topCustomers.map((row) => <tr key={row.customer} className="border-t border-border"><td className="py-3 font-semibold">{row.customer}</td><td>{row.center}</td><td>{formatNaira(row.currentMonth)}</td><td>{formatNaira(row.previousMonth)}</td><td>{row.changePercent === null ? "New / no baseline" : `${row.changePercent > 0 ? "+" : ""}${row.changePercent}%`}</td><td>{row.orders}</td><td>{row.behavior}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}
