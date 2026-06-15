import { createServerFn } from "@tanstack/react-start";

import { fetchCurrentStock, fetchPaymentEntries, fetchRecentSalesInvoices, fetchSalesInvoiceItems, fetchStockBalance, geocodeAddresses, type PaymentEntry, type SalesInvoice, type SalesInvoiceItem, type StockRow } from "./erp.server";

// Map ERP warehouse names to dashboard region/center labels.
// Adjust the substrings on the right to match the user's actual warehouse naming.
export const DISTRIBUTION_CENTERS = ["Abuja Distribution Center", "Lagos Distribution Center", "Ibadan Distribution Center", "Kano Distribution Center", "Portharcourt Distribution Center", "Taraba Distribution Center", "Adamawa Distribution Center", "Liberia Distribution Center"] as const;

const WAREHOUSE_REGION_MAP: { match: RegExp; region: string }[] = [
  { match: /abuja/i, region: DISTRIBUTION_CENTERS[0] },
  { match: /lagos/i, region: DISTRIBUTION_CENTERS[1] },
  { match: /ibadan/i, region: DISTRIBUTION_CENTERS[2] },
  { match: /kano/i, region: DISTRIBUTION_CENTERS[3] },
  { match: /port\s*harcourt|portharcourt|phc|harcourt/i, region: DISTRIBUTION_CENTERS[4] },
  { match: /taraba/i, region: DISTRIBUTION_CENTERS[5] },
  { match: /adamawa/i, region: DISTRIBUTION_CENTERS[6] },
  { match: /liberia|monrovia/i, region: DISTRIBUTION_CENTERS[7] },
];

function regionFor(warehouse?: string | null, territory?: string | null): string {
  const hay = `${warehouse ?? ""} ${territory ?? ""}`;
  for (const entry of WAREHOUSE_REGION_MAP) {
    if (entry.match.test(hay)) return entry.region;
  }
  return "Other Warehouse";
}

const isTrackedCenter = (center: string) => (DISTRIBUTION_CENTERS as readonly string[]).includes(center);
const monthKey = (date: string) => date.slice(0, 7);
const previousMonthKey = (date: Date) => new Date(date.getFullYear(), date.getMonth() - 1, 1).toISOString().slice(0, 7);

export type ErpOverview = {
  ok: true;
  fetchedAt: string;
  totalSalesToday: number;
  invoiceCountToday: number;
  totalRevenueAllTime: number;
  totalRevenueMtd: number;
  previousMonthRevenue: number;
  mtdVsLastMonthPercent: number | null;
  totalInvoicesAllTime: number;
  outstandingTotal: number;
  newCustomersThisWeek: number;
  returningCustomers: number;
  partnerSalesByRegion: { region: string; sales: number; previousMonthSales: number; changePercent: number | null; sixMonthHigh: number; recommendation: string }[];
  monthlyRevenue: { month: string; revenue: number; customers: number; newCustomers: number; returningCustomers: number }[];
  topCustomers: { customer: string; center: string; currentMonth: number; previousMonth: number; changePercent: number | null; orders: number; behavior: string }[];
  customerLocations: { id: string; name: string; center: string; address: string; state: string; lat: number; lng: number; type: "new" | "returning"; sales: number; orders: number }[];
  inventory: {
    sku: string;
    product: string;
    center: string;
    qty: number;
    status: "out" | "low" | "ok";
  }[];
  outOfStockByCenter: { center: string; count: number }[];
  forecast: { center: string; sku: string; product: string; unitsSold90Days: number; monthlyDemand: number; onHand: number; coverageDays: number | null; reorderQty: number }[];
  alerts: { id: string; title: string; detail: string; severity: "critical" | "warning"; center: string; sku: string; detectedAt: string }[];
  accounting: { totalReceivables: number; totalAdvancePayments: number; byCenter: { center: string; receivables: number; advancePayments: number }[] };
} | { ok: false; error: string };

async function summarise(invoices: SalesInvoice[], stock: StockRow[], items: SalesInvoiceItem[], payments: PaymentEntry[]): Promise<ErpOverview> {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const todayInvoices = invoices.filter((i) => i.posting_date >= today);
  const totalSalesToday = todayInvoices.reduce((s, i) => s + (i.grand_total ?? 0), 0);
  const yearStart = "2026-01-01";
  const yearInvoices = invoices.filter((i) => i.posting_date >= yearStart && i.posting_date <= today);
  const totalRevenueAllTime = yearInvoices.reduce((s, i) => s + Number(i.grand_total ?? 0), 0);
  const monthStart = today.slice(0, 7) + "-01";
  const monthInvoices = yearInvoices.filter((i) => i.posting_date >= monthStart);
  const totalRevenueMtd = monthInvoices.reduce((s, i) => s + Number(i.grand_total ?? 0), 0);
  const previousMonth = previousMonthKey(new Date());
  const previousMonthRevenue = invoices.filter((i) => monthKey(i.posting_date) === previousMonth).reduce((sum, invoice) => sum + Number(invoice.grand_total ?? 0), 0);
  const mtdVsLastMonthPercent = previousMonthRevenue > 0 ? +(((totalRevenueMtd - previousMonthRevenue) / previousMonthRevenue) * 100).toFixed(1) : null;
  const outstandingTotal = invoices.reduce((s, i) => s + (i.outstanding_amount ?? 0), 0);

  // Customer first-seen detection from invoice history we have.
  const firstSeen = new Map<string, string>();
  for (const inv of invoices) {
    const prev = firstSeen.get(inv.customer);
    if (!prev || inv.posting_date < prev) firstSeen.set(inv.customer, inv.posting_date);
  }
  let newCustomersThisWeek = 0;
  for (const [, date] of firstSeen) if (date >= sevenDaysAgo) newCustomersThisWeek++;
  const returningCustomers = firstSeen.size - newCustomersThisWeek;

  // Partner sales by region (this month).
  const salesFor = (center: string, month: string) => invoices.filter((invoice) => regionFor(invoice.set_warehouse, invoice.territory) === center && monthKey(invoice.posting_date) === month).reduce((sum, invoice) => sum + Number(invoice.grand_total ?? 0), 0);
  const sixMonths = Array.from({ length: 6 }, (_, index) => new Date(new Date().getFullYear(), new Date().getMonth() - (5 - index), 1).toISOString().slice(0, 7));
  const partnerSalesByRegion = DISTRIBUTION_CENTERS.map((region) => {
    const current = salesFor(region, today.slice(0, 7));
    const previous = salesFor(region, previousMonth);
    const high = Math.max(...sixMonths.map((month) => salesFor(region, month)), 0);
    const change = previous > 0 ? ((current - previous) / previous) * 100 : null;
    return { region, sales: +(current / 1_000_000).toFixed(2), previousMonthSales: +(previous / 1_000_000).toFixed(2), changePercent: change === null ? null : +change.toFixed(1), sixMonthHigh: +(high / 1_000_000).toFixed(2), recommendation: change === null ? "Build consistent monthly sales coverage." : change < 0 ? "Recover lapsed partners and prioritize high-converting accounts." : "Protect momentum and expand repeat-order volume." };
  }).sort((a, b) => b.sales - a.sales);

  // Inventory rows + out-of-stock counts.
  const inventory = stock.map((r) => {
    const qty = Number(r.bal_qty ?? 0);
    const status: "out" | "low" | "ok" = qty <= 0 ? "out" : qty < 10 ? "low" : "ok";
    return {
      sku: String(r.item_code),
      product: String(r.item_name ?? r.item_code),
      center: regionFor(typeof r.warehouse === "string" ? r.warehouse : null),
      qty,
      status,
    };
  }).filter((row) => isTrackedCenter(row.center)).sort((a, b) => DISTRIBUTION_CENTERS.indexOf(a.center as typeof DISTRIBUTION_CENTERS[number]) - DISTRIBUTION_CENTERS.indexOf(b.center as typeof DISTRIBUTION_CENTERS[number]) || ({ out: 0, low: 1, ok: 2 }[a.status] - { out: 0, low: 1, ok: 2 }[b.status]) || a.product.localeCompare(b.product));

  const oosMap = new Map<string, number>();
  for (const r of stock) {
    const qty = Number(r.bal_qty ?? 0);
    if (qty > 0) continue;
    const center = regionFor(typeof r.warehouse === "string" ? r.warehouse : null);
    oosMap.set(center, (oosMap.get(center) ?? 0) + 1);
  }
  const outOfStockByCenter = DISTRIBUTION_CENTERS.map((center) => ({ center, count: oosMap.get(center) ?? 0 }));

  const invoiceByName = new Map(invoices.map((invoice) => [invoice.name, invoice]));
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const demandByProduct = new Map<string, { center: string; sku: string; product: string; qty: number }>();
  for (const item of items) {
    const invoice = invoiceByName.get(item.parent);
    if (!invoice || invoice.posting_date < ninetyDaysAgo) continue;
    const center = regionFor(item.warehouse, invoice.territory);
    if (!isTrackedCenter(center)) continue;
    const key = `${center}::${item.item_code}`;
    const current = demandByProduct.get(key);
    demandByProduct.set(key, { center, sku: item.item_code, product: item.item_name ?? item.item_code, qty: (current?.qty ?? 0) + Number(item.stock_qty ?? item.qty ?? 0) });
  }
  const stockByProduct = new Map(inventory.map((row) => [`${row.center}::${row.sku}`, row.qty]));
  const forecast = [...demandByProduct.values()].map((demand) => {
    const monthlyDemand = demand.qty / 3;
    const onHand = stockByProduct.get(`${demand.center}::${demand.sku}`) ?? 0;
    const dailyDemand = monthlyDemand / 30;
    return {
      center: demand.center,
      sku: demand.sku,
      product: demand.product,
      unitsSold90Days: +demand.qty.toFixed(1),
      monthlyDemand: +monthlyDemand.toFixed(1),
      onHand: +onHand.toFixed(1),
      coverageDays: dailyDemand > 0 ? +Math.floor(onHand / dailyDemand) : null,
      reorderQty: +Math.max(0, monthlyDemand - onHand).toFixed(1),
    };
  }).sort((a, b) => DISTRIBUTION_CENTERS.indexOf(a.center as typeof DISTRIBUTION_CENTERS[number]) - DISTRIBUTION_CENTERS.indexOf(b.center as typeof DISTRIBUTION_CENTERS[number]) || b.reorderQty - a.reorderQty);

  const monthlyRevenue = sixMonths.map((month) => {
    const monthRows = invoices.filter((invoice) => monthKey(invoice.posting_date) === month && isTrackedCenter(regionFor(invoice.set_warehouse, invoice.territory)));
    const seenBefore = new Set(invoices.filter((invoice) => monthKey(invoice.posting_date) < month).map((invoice) => invoice.customer));
    const customers = new Set(monthRows.map((invoice) => invoice.customer));
    const newCount = [...customers].filter((customer) => !seenBefore.has(customer)).length;
    return { month, revenue: monthRows.reduce((sum, invoice) => sum + Number(invoice.grand_total ?? 0), 0), customers: customers.size, newCustomers: newCount, returningCustomers: customers.size - newCount };
  });
  const customerRows = new Map<string, { center: string; current: number; previous: number; orders: number }>();
  for (const invoice of invoices) {
    const center = regionFor(invoice.set_warehouse, invoice.territory);
    if (!isTrackedCenter(center)) continue;
    const row = customerRows.get(invoice.customer) ?? { center, current: 0, previous: 0, orders: 0 };
    if (monthKey(invoice.posting_date) === today.slice(0, 7)) { row.current += Number(invoice.grand_total ?? 0); row.orders += 1; }
    if (monthKey(invoice.posting_date) === previousMonth) row.previous += Number(invoice.grand_total ?? 0);
    customerRows.set(invoice.customer, row);
  }
  const topCustomers = [...customerRows.entries()].map(([customer, row]) => ({ customer, center: row.center, currentMonth: row.current, previousMonth: row.previous, changePercent: row.previous > 0 ? +(((row.current - row.previous) / row.previous) * 100).toFixed(1) : null, orders: row.orders, behavior: row.orders >= 4 ? "Frequent buyer" : row.current > row.previous ? "Growing account" : row.previous > 0 && row.current === 0 ? "At risk / inactive" : "Developing account" })).sort((a, b) => b.currentMonth - a.currentMonth).slice(0, 10);

  const addressInvoices = invoices.filter((invoice) => isTrackedCenter(regionFor(invoice.set_warehouse, invoice.territory)) && Boolean(invoice.address_display || invoice.customer_address));
  const addressStrings = [...new Set(addressInvoices.map((invoice) => (invoice.address_display || invoice.customer_address || "").replace(/<br\s*\/?\s*>/gi, ", ").trim()).filter(Boolean))];
  const geocoded = await geocodeAddresses(addressStrings);
  const customerLocations = addressInvoices.map((invoice) => {
    const rawAddress = (invoice.address_display || invoice.customer_address || "").replace(/<br\s*\/?\s*>/gi, ", ").trim();
    const point = geocoded.get(rawAddress);
    if (!point) return null;
    const customerInvoices = invoices.filter((candidate) => candidate.customer === invoice.customer);
    const firstDate = customerInvoices.reduce((min, candidate) => candidate.posting_date < min ? candidate.posting_date : min, invoice.posting_date);
    return { id: invoice.customer, name: invoice.customer, center: regionFor(invoice.set_warehouse, invoice.territory), address: point.address, state: point.state, lat: point.lat, lng: point.lng, type: firstDate >= monthStart ? "new" as const : "returning" as const, sales: customerInvoices.reduce((sum, candidate) => sum + Number(candidate.grand_total ?? 0), 0), orders: customerInvoices.length };
  }).filter((point): point is NonNullable<typeof point> => point !== null).filter((point, index, all) => all.findIndex((candidate) => candidate.id === point.id) === index);

  const advanceByCustomer = new Map<string, number>();
  for (const payment of payments) if (payment.payment_type === "Receive" && Number(payment.unallocated_amount ?? 0) > 0 && payment.party) advanceByCustomer.set(payment.party, (advanceByCustomer.get(payment.party) ?? 0) + Number(payment.unallocated_amount ?? 0));
  const accountingByCenter = DISTRIBUTION_CENTERS.map((center) => ({ center, receivables: invoices.filter((invoice) => regionFor(invoice.set_warehouse, invoice.territory) === center).reduce((sum, invoice) => sum + Number(invoice.outstanding_amount ?? 0), 0), advancePayments: [...advanceByCustomer.entries()].filter(([customer]) => customerRows.get(customer)?.center === center).reduce((sum, [, value]) => sum + value, 0) }));
  const accounting = { totalReceivables: accountingByCenter.reduce((sum, row) => sum + row.receivables, 0), totalAdvancePayments: accountingByCenter.reduce((sum, row) => sum + row.advancePayments, 0), byCenter: accountingByCenter };

  const detectedAt = new Date().toISOString();
  const alerts = inventory
    .filter((row) => row.status !== "ok")
    .map((row) => ({
      id: `${row.center}-${row.sku}`,
      title: row.status === "out" ? `${row.product} is out of stock` : `${row.product} is running low`,
      detail: `${row.sku} · ${row.qty.toLocaleString()} units on hand`,
      severity: row.status === "out" ? "critical" as const : "warning" as const,
      center: row.center,
      sku: row.sku,
      detectedAt,
    }));

  return {
    ok: true,
    fetchedAt: new Date().toISOString(),
    totalSalesToday,
    invoiceCountToday: todayInvoices.length,
    totalRevenueAllTime,
    totalRevenueMtd,
    previousMonthRevenue,
    mtdVsLastMonthPercent,
    totalInvoicesAllTime: yearInvoices.length,
    outstandingTotal,
    newCustomersThisWeek,
    returningCustomers,
    partnerSalesByRegion,
    monthlyRevenue,
    topCustomers,
    customerLocations,
    inventory,
    outOfStockByCenter,
    forecast,
    alerts,
    accounting,
  };
}

export const getErpOverview = createServerFn({ method: "GET" }).handler(async (): Promise<ErpOverview> => {
  try {
    const [invoices, stock, payments] = await Promise.all([
      fetchRecentSalesInvoices(0),
      fetchCurrentStock().catch(() => fetchStockBalance()),
      fetchPaymentEntries().catch(() => [] as PaymentEntry[]),
    ]);
    const threeMonthsAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const recentInvoiceNames = invoices.filter((invoice) => invoice.posting_date >= threeMonthsAgo).map((invoice) => invoice.name);
    const items = await fetchSalesInvoiceItems(recentInvoiceNames).catch(() => [] as SalesInvoiceItem[]);
    return await summarise(invoices, stock, items, payments);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
});
