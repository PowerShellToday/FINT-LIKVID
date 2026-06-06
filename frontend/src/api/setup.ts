export interface SetupStatus {
  configured: boolean;
  auth_enabled: boolean;
}

export interface SetupPayload {
  wint_api_username: string;
  wint_api_password: string;
  wint_bank_account_number: string;
  wint_api_base_url: string;
  cache_refresh_interval_hours: number;
  default_forecast_months: number;
  max_forecast_months: number;
  currency: string;
  auth_enabled: boolean;
  auth_password?: string;
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const res = await fetch("/api/setup/status");
  return res.json();
}

export async function postSetupComplete(payload: SetupPayload): Promise<void> {
  const res = await fetch("/api/setup/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? `Setup failed (${res.status})`);
  }
}

export async function postSetupDemo(): Promise<void> {
  const res = await fetch("/api/setup/demo", { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? `Demo setup failed (${res.status})`);
  }
}

export async function postSetupReset(): Promise<void> {
  const res = await fetch("/api/setup/reset", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? `Reset failed (${res.status})`);
  }
}
