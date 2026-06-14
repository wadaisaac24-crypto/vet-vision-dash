// Server-only Frappe/ERPNext client for Farm Alert ERP.
// Auth: Frappe uses `Authorization: token <api_key>:<api_secret>`.

function getEnv() {
  let baseUrl = process.env.FARMALERT_ERP_BASE_URL?.trim();
  const key = process.env.FARMALERT_ERP_API_KEY?.trim();
  const secret = process.env.FARMALERT_ERP_API_SECRET?.trim();
  if (!baseUrl || !key || !secret) {
    throw new Error("FARMALERT_ERP_* env vars are not configured");
  }
  // Normalise: ensure scheme, strip trailing slashes, drop any desk/app path
  // so we always hit /api/* from the site root.
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = `https://${baseUrl}`;
  try {
    const u = new URL(baseUrl);
    baseUrl = `${u.protocol}//${u.host}`;
  } catch {
    baseUrl = baseUrl.replace(/\/+$/, "");
  }
  return { baseUrl, key, secret };
}

async function erpFetch(path: string, init: RequestInit = {}) {
  const { baseUrl, key, secret } = getEnv();
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    redirect: "manual",
    headers: {
      "Authorization": `token ${key}:${secret}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-Frappe-CSRF-Token": "",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ERP ${res.status} ${res.statusText} at ${path}: ${text.slice(0, 300)}`);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    throw new Error(
      `ERP ${path} returned ${ct || "no content-type"} (likely auth failure / wrong URL): ${text.slice(0, 200)}`,
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`ERP ${path} returned non-JSON body: ${text.slice(0, 200)}`);
  }
}

export type SalesInvoice = {
  name: string;
  customer: string;
  posting_date: string;
  grand_total: number;
  status: string;
  outstanding_amount: number;
  title?: string;
  set_warehouse?: string | null;
  territory?: string | null;
};

export type SalesInvoiceItem = {
  parent: string;
  item_code: string;
  item_name?: string;
  qty?: number;
  stock_qty?: number;
  warehouse?: string | null;
  amount?: number;
};

export async function fetchRecentSalesInvoices(limit = 0): Promise<SalesInvoice[]> {
  const fields = JSON.stringify([
    "name",
    "customer",
    "posting_date",
    "grand_total",
    "status",
    "outstanding_amount",
    "title",
    "set_warehouse",
    "territory",
  ]);
  // docstatus=1 → Submitted (approved) invoices only; exclude Cancelled.
  const filters = JSON.stringify([
    ["docstatus", "=", 1],
    ["status", "!=", "Cancelled"],
  ]);
  const params = new URLSearchParams({
    fields,
    filters,
    order_by: "posting_date desc, name desc",
    limit_page_length: String(limit), // 0 = all
  });
  const data = await erpFetch(`/api/resource/Sales Invoice?${params.toString()}`);
  return (data?.data ?? []) as SalesInvoice[];
}

export async function fetchSalesInvoiceItems(invoiceNames: string[]): Promise<SalesInvoiceItem[]> {
  if (invoiceNames.length === 0) return [];
  const rows: SalesInvoiceItem[] = [];
  for (let offset = 0; offset < invoiceNames.length; offset += 100) {
    const names = invoiceNames.slice(offset, offset + 100);
    const params = new URLSearchParams({
      fields: JSON.stringify(["parent", "item_code", "item_name", "qty", "stock_qty", "warehouse", "amount"]),
      filters: JSON.stringify([
        ["parent", "in", names],
        ["docstatus", "=", 1],
      ]),
      limit_page_length: "0",
    });
    const data = await erpFetch(`/api/resource/Sales Invoice Item?${params.toString()}`);
    rows.push(...((data?.data ?? []) as SalesInvoiceItem[]));
  }
  return rows;
}

export type StockRow = {
  item_code: string;
  item_name?: string;
  warehouse?: string;
  bal_qty?: number;
  [k: string]: unknown;
};

export async function fetchCurrentStock(): Promise<StockRow[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["item_code", "warehouse", "actual_qty"]),
    limit_page_length: "0",
  });
  const data = await erpFetch(`/api/resource/Bin?${params.toString()}`);
  const bins = (data?.data ?? []) as { item_code?: string; warehouse?: string; actual_qty?: number }[];
  const itemCodes = [...new Set(bins.map((bin) => bin.item_code).filter((code): code is string => Boolean(code)))];
  const names = new Map<string, string>();
  for (let offset = 0; offset < itemCodes.length; offset += 100) {
    const paramsForItems = new URLSearchParams({
      fields: JSON.stringify(["item_code", "item_name"]),
      filters: JSON.stringify([["item_code", "in", itemCodes.slice(offset, offset + 100)]]),
      limit_page_length: "0",
    });
    const itemData = await erpFetch(`/api/resource/Item?${paramsForItems.toString()}`);
    for (const item of (itemData?.data ?? []) as { item_code?: string; item_name?: string }[]) {
      if (item.item_code) names.set(item.item_code, item.item_name ?? item.item_code);
    }
  }
  return bins
    .filter((bin): bin is { item_code: string; warehouse?: string; actual_qty?: number } => Boolean(bin.item_code))
    .map((bin) => ({ item_code: bin.item_code, item_name: names.get(bin.item_code), warehouse: bin.warehouse, bal_qty: Number(bin.actual_qty ?? 0) }));
}

async function fetchCompanyName(): Promise<string> {
  const configured = process.env.FARMALERT_ERP_COMPANY?.trim();
  if (configured) return configured;
  const params = new URLSearchParams({ fields: JSON.stringify(["name"]), limit_page_length: "20" });
  const data = await erpFetch(`/api/resource/Company?${params.toString()}`);
  const companies = (data?.data ?? []) as { name?: string }[];
  const preferred = companies.find((company) => /farm\s*alert/i.test(company.name ?? ""));
  const name = preferred?.name ?? companies[0]?.name;
  if (!name) throw new Error("No ERP company is available for the Stock Balance report");
  return name;
}

export async function fetchStockBalance(company?: string): Promise<StockRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const companyName = company ?? await fetchCompanyName();
  const body = {
    report_name: "Stock Balance",
    filters: {
      from_date: "2026-01-01",
      to_date: today,
      company: companyName,
      valuation_field_type: "Currency",
    },
  };
  const data = await erpFetch("/api/method/frappe.desk.query_report.run", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const result = data?.message?.result ?? [];
  return result.filter(
    (r: unknown): r is StockRow =>
      typeof r === "object" && r !== null && typeof (r as StockRow).item_code === "string",
  );
}
