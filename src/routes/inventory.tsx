import { createFileRoute } from "@tanstack/react-router";
import { InventoryTable } from "@/components/inventory-table";
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
        <h2 className="mb-1 text-base font-semibold text-foreground">Out-of-stock items</h2>
        <p className="mb-4 text-xs text-muted-foreground">Exact products, SKUs, warehouses and current ERP quantities.</p>
        <InventoryTable rows={live?.inventory.filter((row) => row.status === "out")} />
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-1 text-base font-semibold text-foreground">All inventory</h2>
        <p className="mb-4 text-xs text-muted-foreground">Live Stock Balance rows from ERP.</p>
        <InventoryTable rows={live?.inventory} />
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">90-day demand forecast</h2>
        <p className="mb-2 text-xs text-muted-foreground">Average monthly item demand from submitted sales across every warehouse, compared with current stock.</p>
        <InventoryForecastChart data={live?.forecast} />
        {live?.forecast && live.forecast.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Center</th><th>Monthly demand</th><th>On hand</th><th>Coverage</th><th>Reorder now</th></tr></thead>
              <tbody>{live.forecast.map((row) => <tr key={row.center} className="border-t border-border"><td className="py-2 font-medium">{row.center}</td><td>{row.monthlyDemand.toLocaleString()}</td><td>{row.onHand.toLocaleString()}</td><td>{row.coverageDays === null ? "No sales history" : `${row.coverageDays} days`}</td><td className="font-semibold text-destructive">{row.reorderQty.toLocaleString()}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
