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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Red Alerts</h1>
        <p className="text-sm text-muted-foreground">Live stock exceptions from ERP · refreshes every 30 seconds{isFetching ? " · refreshing" : ""}.</p>
      </div>
      <ul className="space-y-3">
        {alerts.length === 0 && <li className="rounded-xl border border-border p-6 text-sm text-muted-foreground">No current stock alerts.</li>}
        {alerts.map((a) => (
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
              <div className="text-xs text-muted-foreground">{a.center} · {a.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
