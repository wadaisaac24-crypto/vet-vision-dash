import { InventoryTable } from "@/components/inventory-table";
import type { StockStatus } from "@/lib/dashboard-data";

type InventoryRow = { sku: string; product: string; center: string; qty: number; status: StockStatus };
const order: StockStatus[] = ["out", "low", "ok"];
const headings: Record<StockStatus, string> = { out: "Out of stock", low: "Low in stock", ok: "In stock" };

export function CenterInventory({ rows = [], limitPerCenter }: { rows?: InventoryRow[]; limitPerCenter?: number }) {
  const centers = [...new Set(rows.map((row) => row.center))];
  if (centers.length === 0) return <InventoryTable rows={[]} />;
  return (
    <div className="space-y-8">
      {centers.map((center) => {
        const centerRows = order.flatMap((status) => rows.filter((row) => row.center === center && row.status === status));
        const visible = limitPerCenter ? centerRows.slice(0, limitPerCenter) : centerRows;
        return (
          <section key={center} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <h3 className="text-base font-semibold text-foreground">{center}</h3>
              <span className="text-xs text-muted-foreground">{centerRows.length} products · ordered by stock risk</span>
            </div>
            {order.map((status) => {
              const statusRows = visible.filter((row) => row.status === status);
              if (statusRows.length === 0) return null;
              return <div key={status}><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{headings[status]} · {statusRows.length}</p><InventoryTable rows={statusRows} /></div>;
            })}
          </section>
        );
      })}
    </div>
  );
}