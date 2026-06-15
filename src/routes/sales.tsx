import { createFileRoute } from "@tanstack/react-router";
import { PartnerSalesChart } from "@/components/dashboard-charts";
import { useErpOverview } from "@/hooks/use-erp-overview";
import { formatNaira } from "@/lib/dashboard-data";

export const Route = createFileRoute("/sales")({
  head: () => ({ meta: [{ title: "Sales — Farm Alert" }] }),
  component: SalesPage,
});

function SalesPage() {
  const { data } = useErpOverview();
  const live = data?.ok ? data : null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Sales</h1>
        <p className="text-sm text-muted-foreground">Current month performance, prior-month comparison and six-month peak for all eight distribution centers.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <PartnerSalesChart data={live?.partnerSalesByRegion} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card p-5">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2">Distribution center</th><th>Month to date</th><th>Last month</th><th>Change</th><th>6-month high</th><th>Management recommendation</th></tr></thead>
          <tbody>{live?.partnerSalesByRegion.map((row) => <tr key={row.region} className="border-t border-border"><td className="py-3 font-semibold">{row.region}</td><td>{formatNaira(row.sales * 1_000_000)}</td><td>{formatNaira(row.previousMonthSales * 1_000_000)}</td><td className={row.changePercent !== null && row.changePercent < 0 ? "text-destructive" : "text-brand-green"}>{row.changePercent === null ? "No baseline" : `${row.changePercent > 0 ? "+" : ""}${row.changePercent}%`}</td><td>{formatNaira(row.sixMonthHigh * 1_000_000)}</td><td className="max-w-xs text-muted-foreground">{row.recommendation}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
