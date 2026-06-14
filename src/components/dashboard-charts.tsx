import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import {
  partnerSalesByRegion,
  customerActivity,
} from "@/lib/dashboard-data";

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--foreground)",
};

export function PartnerSalesChart({ data }: { data?: { region: string; sales: number }[] }) {
  const rows = data && data.length > 0 ? data : partnerSalesByRegion;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="region" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v}M`} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v: number) => [`₦${v}M`, "Sales"]} />
        <Bar dataKey="sales" fill="var(--brand-green)" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CustomerActivityChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={customerActivity} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        <Bar dataKey="returning" stackId="a" name="Returning" fill="var(--brand-navy)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="new" stackId="a" name="New" fill="var(--brand-green)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export type ForecastRow = { center: string; monthlyDemand: number; onHand: number; coverageDays: number | null; reorderQty: number };

export function InventoryForecastChart({ data }: { data?: ForecastRow[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">Awaiting 3-month ERP sales history.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-green)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--brand-green)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="center" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
        <Area type="monotone" dataKey="monthlyDemand" name="Forecast monthly demand" stroke="var(--brand-green)" strokeWidth={2} fill="url(#forecastFill)" />
        <Area type="monotone" dataKey="onHand" name="Current stock" stroke="var(--brand-navy)" strokeWidth={2.5} fill="transparent" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
