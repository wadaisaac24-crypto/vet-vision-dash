import { createFileRoute } from "@tanstack/react-router";
import { InventoryTable } from "@/components/inventory-table";
import { CenterInventory } from "@/components/center-inventory";
import { InventoryForecastChart } from "@/components/dashboard-charts";
import { useErpOverview } from "@/hooks/use-erp-overview";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Farm Alert" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const { data } = useErpOverview();
  const live = data?.ok ? data : null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Inventory</h1>
        <p className="text-sm text-muted-foreground">Stock status & forecasting across all distribution centers.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-1 text-base font-semibold text-foreground">Inventory by distribution center</h2>
        <p className="mb-5 text-xs text-muted-foreground">Complete live ERP inventory. Each center is separated and ordered: out of stock, low stock, then in stock.</p>
        <CenterInventory rows={live?.inventory} />
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">90-day demand forecast</h2>
        <p className="mb-2 text-xs text-muted-foreground">Product-level demand calculated from 90 days of submitted sales, compared with current stock in each center.</p>
        <InventoryForecastChart data={live?.forecast} />
        {live?.forecast && live.forecast.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Center</th><th>Product / SKU</th><th>90-day sales</th><th>Monthly demand</th><th>On hand</th><th>Coverage</th><th>Reorder now</th></tr></thead>
              <tbody>{live.forecast.map((row) => <tr key={`${row.center}-${row.sku}`} className="border-t border-border"><td className="py-2 font-medium">{row.center}</td><td><span className="font-medium">{row.product}</span><span className="block font-mono text-xs text-muted-foreground">{row.sku}</span></td><td>{row.unitsSold90Days.toLocaleString()}</td><td>{row.monthlyDemand.toLocaleString()}</td><td>{row.onHand.toLocaleString()}</td><td>{row.coverageDays === null ? "No sales history" : `${row.coverageDays} days`}</td><td className="font-semibold text-destructive">{row.reorderQty.toLocaleString()}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
