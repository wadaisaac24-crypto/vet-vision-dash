import { createFileRoute } from "@tanstack/react-router";
import { AfricaMap } from "@/components/africa-map";
import { useErpOverview } from "@/hooks/use-erp-overview";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Africa Map — Farm Alert" }] }),
  component: MapPage,
});

function MapPage() {
  const { data } = useErpOverview();
  const live = data?.ok ? data : null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Africa Operations Map</h1>
        <p className="text-sm text-muted-foreground">
          Live center sales ranking and geocoded customer addresses from ERP registrations. Green customer markers are new partners; navy markers are returning partners.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <AfricaMap variant="full" centers={live?.partnerSalesByRegion} customers={live?.customerLocations} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {live?.partnerSalesByRegion.map((r, index) => (
          <div key={r.region} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">{r.region}</div>
                <div className="text-xs text-muted-foreground">Sales rank #{index + 1}</div>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background:
                    index === 0
                      ? "color-mix(in oklab, var(--brand-green) 18%, transparent)"
                      : "color-mix(in oklab, var(--muted-foreground) 15%, transparent)",
                  color:
                     index === 0
                      ? "var(--brand-green)"
                      : "var(--muted-foreground)",
                }}
              >
                {index === 0 ? "Highest seller" : "Active"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Partners</div>
                <div className="font-semibold text-foreground">{r.changePercent === null ? "No baseline" : `${r.changePercent > 0 ? "+" : ""}${r.changePercent}%`}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Sales</div>
                <div className="font-semibold text-foreground">
                  ₦{r.sales.toFixed(2)}M
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
