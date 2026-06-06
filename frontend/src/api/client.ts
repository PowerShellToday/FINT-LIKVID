import type {
  ForecastResponse,
  HolidayEntry,
  IncomingInvoice,
  InvoiceCustomerCreate,
  InvoiceCustomerResponse,
  InvoiceCustomerUpdate,
  PeriodicExpenseCreate,
  PeriodicExpenseResponse,
  SalarySettingCreate,
  SalarySettingResponse,
  SalarySettingUpdate,
  TaxSocialSettingCreate,
  TaxSocialSettingResponse,
  TaxSocialSettingUpdate,
  RecurringInvoiceConfigCreate,
  RecurringInvoiceConfigResponse,
  RecurringInvoiceConfigUpdate,
  FutureInvoicePlanCreate,
  FutureInvoicePlanResponse,
  FutureInvoicePlanUpdate,
  OneOffExpenseCreate,
  OneOffExpenseResponse,
  OneOffExpenseUpdate,
  UserDefaultsResponse,
  UserDefaultsUpdate,
  AppSettingsResponse,
  AppSettingsUpdate,
  WintCredentialsUpdate,
  WintConnectionTest,
  AuthSettingsUpdate,
} from "./types";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...options });
  if (res.status === 401) {
    window.dispatchEvent(new Event("auth:expired"));
    throw new Error("Sessionen har gått ut. Logga in igen.");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

function json(body: unknown): RequestInit {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ── Forecast ──────────────────────────────────────────────────────────────────
export const getForecast = (months: number) =>
  apiFetch<ForecastResponse>(`/api/forecast?months=${months}`);

export const triggerCacheRefresh = () =>
  apiFetch<{ fetched_at: string; message: string }>("/api/cache/refresh", { method: "POST" });

// ── Invoices ──────────────────────────────────────────────────────────────────
export const getIncomingInvoices = () =>
  apiFetch<IncomingInvoice[]>("/api/incoming-invoices");

// ── Salary settings ───────────────────────────────────────────────────────────
export const listSalary = () => apiFetch<SalarySettingResponse[]>("/api/settings/salary");
export const createSalary = (body: SalarySettingCreate) =>
  apiFetch<SalarySettingResponse>("/api/settings/salary", { method: "POST", ...json(body) });
export const updateSalary = (id: number, body: SalarySettingUpdate) =>
  apiFetch<SalarySettingResponse>(`/api/settings/salary/${id}`, { method: "PUT", ...json(body) });
export const deleteSalary = (id: number) =>
  apiFetch<void>(`/api/settings/salary/${id}`, { method: "DELETE" });

// ── Tax/social settings ───────────────────────────────────────────────────────
export const listTaxSocial = () => apiFetch<TaxSocialSettingResponse[]>("/api/settings/tax-social");
export const createTaxSocial = (body: TaxSocialSettingCreate) =>
  apiFetch<TaxSocialSettingResponse>("/api/settings/tax-social", { method: "POST", ...json(body) });
export const updateTaxSocial = (id: number, body: TaxSocialSettingUpdate) =>
  apiFetch<TaxSocialSettingResponse>(`/api/settings/tax-social/${id}`, { method: "PUT", ...json(body) });
export const deleteTaxSocial = (id: number) =>
  apiFetch<void>(`/api/settings/tax-social/${id}`, { method: "DELETE" });

// ── Recurring invoice configs ─────────────────────────────────────────────────
export const listRecurring = () =>
  apiFetch<RecurringInvoiceConfigResponse[]>("/api/settings/recurring-invoices");
export const createRecurring = (body: RecurringInvoiceConfigCreate) =>
  apiFetch<RecurringInvoiceConfigResponse>("/api/settings/recurring-invoices", { method: "POST", ...json(body) });
export const updateRecurring = (id: number, body: RecurringInvoiceConfigUpdate) =>
  apiFetch<RecurringInvoiceConfigResponse>(`/api/settings/recurring-invoices/${id}`, { method: "PUT", ...json(body) });
export const deleteRecurring = (id: number) =>
  apiFetch<void>(`/api/settings/recurring-invoices/${id}`, { method: "DELETE" });

// ── Invoice customers ─────────────────────────────────────────────────────────
export const listInvoiceCustomers = () =>
  apiFetch<InvoiceCustomerResponse[]>("/api/settings/invoice-customers");
export const createInvoiceCustomer = (body: InvoiceCustomerCreate) =>
  apiFetch<InvoiceCustomerResponse>("/api/settings/invoice-customers", { method: "POST", ...json(body) });
export const updateInvoiceCustomer = (id: number, body: InvoiceCustomerUpdate) =>
  apiFetch<InvoiceCustomerResponse>(`/api/settings/invoice-customers/${id}`, { method: "PUT", ...json(body) });
export const deleteInvoiceCustomer = (id: number) =>
  apiFetch<void>(`/api/settings/invoice-customers/${id}`, { method: "DELETE" });
export const getInvoiceCustomerNames = () =>
  apiFetch<string[]>("/api/settings/invoice-customers/names");
export const computeInvoiceDate = (plan_month: string, rule: string) =>
  apiFetch<{ invoice_date: string }>(`/api/settings/invoice-customers/compute-date?plan_month=${plan_month}&rule=${rule}`);

// ── Future invoice plans ──────────────────────────────────────────────────────
export const listFutureInvoices = () =>
  apiFetch<FutureInvoicePlanResponse[]>("/api/settings/future-invoices");
export const createFutureInvoice = (body: FutureInvoicePlanCreate) =>
  apiFetch<FutureInvoicePlanResponse>("/api/settings/future-invoices", { method: "POST", ...json(body) });
export const updateFutureInvoice = (id: number, body: FutureInvoicePlanUpdate) =>
  apiFetch<FutureInvoicePlanResponse>(`/api/settings/future-invoices/${id}`, { method: "PUT", ...json(body) });
export const deleteFutureInvoice = (id: number) =>
  apiFetch<void>(`/api/settings/future-invoices/${id}`, { method: "DELETE" });

// ── One-off expenses ──────────────────────────────────────────────────────────
export const listExpenses = () =>
  apiFetch<OneOffExpenseResponse[]>("/api/settings/one-off-expenses");
export const createExpense = (body: OneOffExpenseCreate) =>
  apiFetch<OneOffExpenseResponse>("/api/settings/one-off-expenses", { method: "POST", ...json(body) });
export const updateExpense = (id: number, body: OneOffExpenseUpdate) =>
  apiFetch<OneOffExpenseResponse>(`/api/settings/one-off-expenses/${id}`, { method: "PUT", ...json(body) });
export const deleteExpense = (id: number) =>
  apiFetch<void>(`/api/settings/one-off-expenses/${id}`, { method: "DELETE" });

// ── User defaults ─────────────────────────────────────────────────────────────
export const getDefaults = () => apiFetch<UserDefaultsResponse>("/api/settings/defaults");
export const updateDefaults = (body: UserDefaultsUpdate) =>
  apiFetch<UserDefaultsResponse>("/api/settings/defaults", { method: "PUT", ...json(body) });

// ── Manual balance override ───────────────────────────────────────────────────
export const setBalanceOverride = (amount: number) =>
  apiFetch<{ amount: number; set_at: string }>("/api/settings/balance-override", { method: "PUT", ...json({ amount }) });
export const clearBalanceOverride = () =>
  apiFetch<void>("/api/settings/balance-override", { method: "DELETE" });

// ── App settings ──────────────────────────────────────────────────────────────
export const getAppSettings = () =>
  apiFetch<AppSettingsResponse>("/api/app-settings");
export const updateAppSettings = (body: AppSettingsUpdate) =>
  apiFetch<{ ok: boolean }>("/api/app-settings", { method: "PUT", ...json(body) });
export const updateWintCredentials = (body: WintCredentialsUpdate) =>
  apiFetch<{ ok: boolean }>("/api/app-settings/credentials", { method: "PUT", ...json(body) });
export const testWintConnection = (body: WintConnectionTest) =>
  apiFetch<{ ok: boolean }>("/api/app-settings/test-connection", { method: "POST", ...json(body) });
export const updateAuthSettings = (body: AuthSettingsUpdate) =>
  apiFetch<{ ok: boolean }>("/api/app-settings/auth", { method: "PUT", ...json(body) });

// ── Holidays ──────────────────────────────────────────────────────────────────
export const getHolidays = (year: number) =>
  apiFetch<HolidayEntry[]>(`/api/settings/holidays?year=${year}`);

// ── Periodic expenses ─────────────────────────────────────────────────────────
export const listPeriodicExpenses = () =>
  apiFetch<PeriodicExpenseResponse[]>("/api/settings/periodic-expenses");
export const createPeriodicExpense = (body: PeriodicExpenseCreate) =>
  apiFetch<PeriodicExpenseResponse>("/api/settings/periodic-expenses", { method: "POST", ...json(body) });
export const updatePeriodicExpense = (id: number, body: Partial<PeriodicExpenseCreate>) =>
  apiFetch<PeriodicExpenseResponse>(`/api/settings/periodic-expenses/${id}`, { method: "PUT", ...json(body) });
export const deletePeriodicExpense = (id: number) =>
  apiFetch<void>(`/api/settings/periodic-expenses/${id}`, { method: "DELETE" });

// ── Backup / restore ──────────────────────────────────────────────────────────
export async function exportData(): Promise<void> {
  const res = await fetch("/api/data/export", { credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Export misslyckades (${res.status}): ${text}`);
  }
  const blob = await res.blob();
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ts =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = `fint_backup_${ts}.json`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(payload: object): Promise<{ imported: Record<string, number> }> {
  return apiFetch<{ imported: Record<string, number> }>("/api/data/import", {
    method: "POST",
    ...json(payload),
  });
}
