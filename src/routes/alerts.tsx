import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useErpOverview } from "@/hooks/use-erp-overview";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Red Alerts — Farm Alert" }] }),
  component: AlertsPage,
});

function AlertsPage() {
  const { data, isFetching } = useErpOverview();
  const alerts = data?.ok ? data.alerts : [];
  const centers = [...new Set(alerts.map((alert) => alert.center))];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Red Alerts</h1>
        <p className="text-sm text-muted-foreground">Live stock exceptions from ERP · refreshes every 30 seconds{isFetching ? " · refreshing" : ""}.</p>
      </div>
      {alerts.length === 0 && <div className="rounded-xl border border-border p-6 text-sm text-muted-foreground">No current stock alerts.</div>}
      {centers.map((center) => <section key={center} className="rounded-xl border border-border bg-card p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{center}</h2><span className="text-xs text-muted-foreground">{alerts.filter((alert) => alert.center === center).length} active exceptions</span></div><ul className="space-y-3">
        {alerts.filter((alert) => alert.center === center).sort((a, b) => a.severity === b.severity ? a.title.localeCompare(b.title) : a.severity === "critical" ? -1 : 1).map((a) => (
          <li
            key={a.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              a.severity === "critical"
                ? "border-destructive/30 bg-destructive/5"
                : "border-warn/30 bg-warn/5",
            )}
          >
            <AlertTriangle
              className={cn(
                "mt-0.5 h-5 w-5",
                a.severity === "critical" ? "text-destructive" : "text-warn",
              )}
            />
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">{a.title}</div>
              <div className="text-xs text-muted-foreground">{a.detail}</div>
            </div>
          </li>
        ))}
      </ul></section>)}
    </div>
  );
}
