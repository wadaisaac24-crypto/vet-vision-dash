import { createFileRoute } from "@tanstack/react-router";
import {
  Banknote,
  PackageX,
  Users,
  UserPlus,
  Sparkles,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { AfricaMap } from "@/components/africa-map";
import {
  PartnerSalesChart,
  CustomerActivityChart,
  InventoryForecastChart,
} from "@/components/dashboard-charts";
import { CenterInventory } from "@/components/center-inventory";
import { Button } from "@/components/ui/button";
import {
  kpis,
  formatNaira,
} from "@/lib/dashboard-data";
import { useErpOverview } from "@/hooks/use-erp-overview";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Farm Alert CEO Dashboard" },
      { name: "description", content: "Today's sales, stock health, customers and active red alerts across all Farm Alert distribution centers." },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const { data: erp, dataUpdatedAt, isFetching, isError } = useErpOverview();
  const live = erp && erp.ok ? erp : null;

  const totalSalesToday = live ? live.totalSalesToday : kpis.totalSalesToday.value;
  const outOfStockCount = live
    ? live.inventory.filter((i) => i.status === "out").length
    : kpis.outOfStockCount;
  const returningCount = live ? live.returningCustomers : kpis.activeReturningCustomers.value;
  const newCustomers = live ? live.newCustomersThisWeek : kpis.newCustomers.value;
  const oosByCenter = live?.outOfStockByCenter ?? [];
  const alerts = live?.alerts ?? [];
  const overviewForecast = live ? live.forecast.reduce<{ center: string; sku: string; product: string; unitsSold90Days: number; monthlyDemand: number; onHand: number; coverageDays: number | null; reorderQty: number }[]>((rows, item) => {
    const existing = rows.find((row) => row.center === item.center);
    if (existing) { existing.unitsSold90Days += item.unitsSold90Days; existing.monthlyDemand += item.monthlyDemand; existing.onHand += item.onHand; existing.reorderQty += item.reorderQty; }
    else rows.push({ center: item.center, sku: item.center.replace(/ Distribution Center/g, ""), product: item.center, unitsSold90Days: item.unitsSold90Days, monthlyDemand: item.monthlyDemand, onHand: item.onHand, coverageDays: null, reorderQty: item.reorderQty });
    return rows;
  }, []) : [];
  const threeMonthTarget = 250_000_000;
  const targetProgress = Math.min(100, ((live?.totalRevenueMtd ?? 0) / threeMonthTarget) * 100);

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Good morning, Dr. Kayode</h1>
          <p className="text-sm text-muted-foreground">
            Here's how Farm Alert is performing across the network today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex h-2 w-2 rounded-full",
              isError ? "bg-destructive" : live ? "bg-brand-green" : "bg-warn",
            )}
          />
          <span className="text-muted-foreground">
            {isError
              ? "ERP unreachable · showing last known"
              : live
                ? `Live ERP · updated ${lastUpdated}`
                : "Connecting to ERP…"}
            {isFetching && live ? " · refreshing" : ""}
          </span>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Total Revenue (2026 YTD)"
          value={formatNaira(live?.totalRevenueAllTime ?? 0)}
          hint={live ? `${live.totalInvoicesAllTime} approved invoices since 1 Jan` : "Awaiting ERP"}
          icon={<Banknote className="h-4 w-4" />}
          tone="navy"
        />
        <KpiCard
          label="Revenue MTD"
          value={formatNaira(live?.totalRevenueMtd ?? 0)}
          hint="approved invoices this month"
          icon={<Banknote className="h-4 w-4" />}
          tone="green"
        />
        <KpiCard
          label="Total Sales Today"
          value={formatNaira(totalSalesToday)}
          delta={kpis.totalSalesToday.delta}
          hint={live ? `${live.invoiceCountToday} invoices today` : "vs yesterday"}
          icon={<Banknote className="h-4 w-4" />}
          tone="green"
        />
        <KpiCard
          label="Out of Stock Items"
          value={outOfStockCount}
          hint={live ? "from live stock balance" : "across 8 centers"}
          icon={<PackageX className="h-4 w-4" />}
          tone="destructive"
        />
        <KpiCard
          label="Active / Returning Customers"
          value={returningCount.toLocaleString()}
          delta={kpis.activeReturningCustomers.delta}
          hint="last 30 days"
          icon={<Users className="h-4 w-4" />}
          tone="navy"
        />
        <KpiCard
          label="New Customers"
          value={newCustomers}
          delta={kpis.newCustomers.delta}
          hint="this week"
          icon={<UserPlus className="h-4 w-4" />}
          tone="green"
        />
      </section>

      {/* Map + Out of stock breakdown */}
      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Africa Operations Map</h2>
              <p className="text-xs text-muted-foreground">
                Live alert status and active sales by distribution zone.
              </p>
            </div>
            <a
              href="/map"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-navy hover:text-brand-green"
            >
              Open full map <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <AfricaMap variant="compact" centers={live?.partnerSalesByRegion} customers={live?.customerLocations} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Out of Stock by Center</h2>
          <p className="text-xs text-muted-foreground">
            {live ? "Live from ERP Stock Balance" : "All distribution centers · today"}
          </p>
          <ul className="mt-4 divide-y divide-border">
            {oosByCenter.map((c) => (
              <li key={c.center} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-foreground">{c.center}</span>
                <span
                  className={cn(
                    "inline-flex h-6 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold",
                    c.count === 0
                      ? "bg-brand-green/15 text-brand-green"
                      : c.count === 1
                      ? "bg-warn/15 text-warn"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {c.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Charts row */}
      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 xl:col-span-2">
          <div className="mb-2 flex items-end justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Partner Sales Performance
              </h2>
              <p className="text-xs text-muted-foreground">By region · this month (₦M)</p>
            </div>
          </div>
          <PartnerSalesChart data={live?.partnerSalesByRegion} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Customer Activity</h2>
          <p className="text-xs text-muted-foreground">New vs Returning · last 7 days</p>
          <div className="mt-3">
            <CustomerActivityChart />
          </div>
        </div>
      </section>

      {/* Inventory + forecast */}
      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Inventory Status</h2>
              <p className="text-xs text-muted-foreground">Top 10 priority products, separated by center and ordered by stock risk.</p>
            </div>
          </div>
          <CenterInventory rows={live?.inventory.slice(0, 10)} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Inventory Forecasting</h2>
          <p className="text-xs text-muted-foreground">90-day sales demand summarized for the eight centers</p>
          <div className="mt-3">
            <InventoryForecastChart data={overviewForecast} />
          </div>
        </div>
      </section>

      {/* AI Summary */}
      <section className="rounded-xl border border-brand-navy/20 bg-gradient-to-br from-brand-navy to-brand-navy/90 p-6 text-brand-navy-foreground">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-green text-brand-green-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">AI Executive Summary</h2>
              <span className="rounded-full bg-brand-green/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-green">
                Auto-generated
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-brand-navy-foreground/85">Month-to-date revenue is <strong className="text-brand-green">{formatNaira(live?.totalRevenueMtd ?? 0)}</strong>, {live?.mtdVsLastMonthPercent === null || live?.mtdVsLastMonthPercent === undefined ? "with no prior-month baseline yet" : `${Math.abs(live.mtdVsLastMonthPercent)}% ${live.mtdVsLastMonthPercent >= 0 ? "ahead of" : "behind"} last month's full performance`}. The June–August goal is <strong>{formatNaira(threeMonthTarget)}</strong>; current MTD revenue represents <strong>{targetProgress.toFixed(1)}%</strong> of that target. Management should prioritize collections on <strong>{formatNaira(live?.accounting.totalReceivables ?? 0)}</strong> in receivables, replenish the <strong className="text-warn">{outOfStockCount}</strong> zero-stock SKUs with proven 90-day demand, and assign weekly partner-recovery targets to underperforming centers. Protect the momentum in <strong>{live?.partnerSalesByRegion[0]?.region ?? "the leading center"}</strong>, convert new partners into repeat buyers, and review target progress every week.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" className="bg-brand-green text-brand-green-foreground hover:bg-brand-green/90">
                <AlertTriangle className="h-3.5 w-3.5" />
                Trigger replenishment
              </Button>
              <Button size="sm" variant="outline" className="border-brand-navy-foreground/30 bg-transparent text-brand-navy-foreground hover:bg-brand-navy-foreground/10 hover:text-brand-navy-foreground">
                Brief operations team
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Red alerts strip */}
      <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
        <h2 className="text-sm font-semibold text-destructive">Active Red Alerts</h2>
        <ul className="mt-3 space-y-2">
          {alerts.length === 0 && (
            <li className="rounded-md bg-card px-3 py-3 text-sm text-muted-foreground">
              {live ? "No current stock alerts." : "Waiting for live ERP alerts…"}
            </li>
          )}
          {alerts.slice(0, 8).map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-md bg-card px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-2 w-2 rounded-full",
                    a.severity === "critical" ? "bg-destructive" : "bg-warn",
                  )}
                />
                <span className="text-foreground">{a.title} · {a.center}</span>
              </div>
              <span className="text-xs text-muted-foreground">{a.detail}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
