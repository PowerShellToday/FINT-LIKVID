export interface HolidayEntry {
  date: string; // "YYYY-MM-DD"
  name: string; // Swedish name e.g. "Nyårsdagen"
}

export type ForecastCategory =
  | "incoming_invoice"
  | "outgoing_invoice"
  | "recurring_invoice"
  | "future_invoice"
  | "one_off_expense"
  | "periodic_expense"
  | "salary"
  | "tax_social"
  | "vat";

export interface PeriodicExpenseCreate {
  label: string;
  amount: number;
  recurrence_type: "days" | "monthly";
  interval_days: number | null;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
}

export interface PeriodicExpenseResponse extends PeriodicExpenseCreate {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface ForecastEntry {
  date: string;
  amount: string; // Pydantic Decimal serializes as string
  category: ForecastCategory;
  type: "actual" | "forecast";
  label: string;
  source_id: number | null;
}

export interface ForecastResponse {
  entries: ForecastEntry[];
  account_balance: string; // Pydantic Decimal serializes as string
  balance_source: "api" | "manual";
  balance_updated_at: string | null;
  generated_at: string;
  horizon_months: number;
  data_last_fetched_at: string | null;
}

export interface IncomingInvoice {
  Id: number;
  SupplierName: string | null;
  Amount: string;
  DueDate: string | null;
  PaymentDate: string | null;
  IsTaxInvoice: boolean;
}

// ── Settings types ────────────────────────────────────────────────────────────

export interface SalarySettingCreate {
  net_monthly_amount: number;
  effective_from: string; // "YYYY-MM-DD"
}
export interface SalarySettingUpdate {
  net_monthly_amount?: number;
  effective_from?: string;
}
export interface SalarySettingResponse extends SalarySettingCreate {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface TaxSocialSettingCreate {
  net_monthly_amount: number;
  effective_from: string;
}
export interface TaxSocialSettingUpdate {
  net_monthly_amount?: number;
  effective_from?: string;
}
export interface TaxSocialSettingResponse extends TaxSocialSettingCreate {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface RecurringInvoiceConfigCreate {
  supplier_name: string;
  interval_months: number;
  override_total?: number | null;
  override_vat?: number | null;
  match_amount?: number | null;
  enabled: boolean;
}
export interface RecurringInvoiceConfigUpdate {
  supplier_name?: string;
  interval_months?: number;
  override_total?: number | null;
  override_vat?: number | null;
  match_amount?: number | null;
  enabled?: boolean;
}
export interface RecurringInvoiceConfigResponse extends RecurringInvoiceConfigCreate {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceCustomerCreate {
  name: string;
  hourly_rate: number;
  payment_delay_days: number;
  invoice_day_rule: string;
}
export interface InvoiceCustomerUpdate {
  name?: string;
  hourly_rate?: number;
  payment_delay_days?: number;
  invoice_day_rule?: string;
}
export interface InvoiceCustomerResponse extends InvoiceCustomerCreate {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface FutureInvoicePlanCreate {
  plan_month: string; // "YYYY-MM-DD" (first day of month)
  billable_hours: number;
  hourly_rate: number;
  invoice_date: string;
  payment_delay_days: number;
  customer_id?: number | null;
  customer_name?: string | null;
  day_fractions?: string | null; // JSON-serialized Record<string, number>
}
export interface FutureInvoicePlanUpdate {
  plan_month?: string;
  billable_hours?: number;
  hourly_rate?: number;
  invoice_date?: string;
  payment_delay_days?: number;
  customer_id?: number | null;
  customer_name?: string | null;
  day_fractions?: string | null;
}
export interface FutureInvoicePlanResponse extends FutureInvoicePlanCreate {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface OneOffExpenseCreate {
  label: string;
  amount: number;
  planned_date: string;
}
export interface OneOffExpenseUpdate {
  label?: string;
  amount?: number;
  planned_date?: string;
}
export interface OneOffExpenseResponse extends OneOffExpenseCreate {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface AppSettingsResponse {
  wint_api_base_url: string;
  wint_bank_account_number: string;
  wint_username: string;
  cache_refresh_interval_hours: number;
  default_forecast_months: number;
  max_forecast_months: number;
  currency: string;
  auth_enabled: boolean;
  is_demo_mode: boolean;
}

export interface AppSettingsUpdate {
  wint_api_base_url: string;
  wint_bank_account_number: string;
  cache_refresh_interval_hours: number;
  default_forecast_months: number;
  max_forecast_months: number;
  currency: string;
}

export interface WintCredentialsUpdate {
  username: string;
  password: string;
}

export interface WintConnectionTest {
  username?: string;
  password?: string;
  base_url?: string;
}

export interface AuthSettingsUpdate {
  auth_enabled: boolean;
  new_password?: string | null;
  confirm_password?: string | null;
}

export interface UserDefaultsUpdate {
  default_hourly_rate?: number | null;
  default_payment_delay_days?: number | null;
}
export interface UserDefaultsResponse {
  id: number;
  default_hourly_rate: number | null;
  default_payment_delay_days: number | null;
  updated_at: string;
}
