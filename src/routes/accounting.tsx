import { createFileRoute } from "@tanstack/react-router";
import { Banknote, CreditCard, Receipt } from "lucide-react";
import { useErpOverview } from "@/hooks/use-erp-overview";
import { formatNaira } from "@/lib/dashboard-data";
import { KpiCard } from "@/components/kpi-card";

export const Route = createFileRoute("/accounting")({
  head: () => ({ meta: [{ title: "Accounting — Farm Alert" }] }),
  component: AccountingPage,
});

function AccountingPage() {
  const { data } = useErpOverview();
  const live = data?.ok ? data : null;
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold text-foreground">Accounting</h1><p className="text-sm text-muted-foreground">CEO-level revenue, receivables and customer advances from submitted ERP records.</p></div>
    <section className="grid gap-4 md:grid-cols-3">
      <KpiCard label="Revenue MTD" value={formatNaira(live?.totalRevenueMtd ?? 0)} hint="submitted invoices" icon={<Banknote className="h-4 w-4" />} tone="green" />
      <KpiCard label="Total Receivables" value={formatNaira(live?.accounting.totalReceivables ?? 0)} hint="outstanding customer invoices" icon={<Receipt className="h-4 w-4" />} tone="destructive" />
      <KpiCard label="Advance Payments" value={formatNaira(live?.accounting.totalAdvancePayments ?? 0)} hint="unallocated receipts" icon={<CreditCard className="h-4 w-4" />} tone="navy" />
    </section>
    <div className="overflow-x-auto rounded-xl border border-border bg-card p-5"><h2 className="mb-1 text-base font-semibold">Position by distribution center</h2><p className="mb-4 text-xs text-muted-foreground">Use receivables to focus collections and advances to prioritize order fulfilment.</p><table className="w-full text-sm"><thead className="text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="py-2">Distribution center</th><th>Receivables</th><th>Advance payments</th><th>Net exposure</th></tr></thead><tbody>{live?.accounting.byCenter.map((row) => <tr key={row.center} className="border-t border-border"><td className="py-3 font-semibold">{row.center}</td><td className="text-destructive">{formatNaira(row.receivables)}</td><td className="text-brand-green">{formatNaira(row.advancePayments)}</td><td>{formatNaira(row.receivables - row.advancePayments)}</td></tr>)}</tbody></table></div>
  </div>;
}