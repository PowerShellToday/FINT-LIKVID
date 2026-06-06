import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postSetupComplete, postSetupDemo, type SetupPayload } from "@/api/setup";

interface Props {
  onComplete: () => void;
}

const STEPS = ["Wint API", "Appinställningar", "Åtkomst"];

const DEFAULTS: SetupPayload = {
  wint_api_username: "",
  wint_api_password: "",
  wint_bank_account_number: "1930",
  wint_api_base_url: "https://superkollapi.wint.se",
  cache_refresh_interval_hours: 6,
  default_forecast_months: 6,
  max_forecast_months: 24,
  currency: "SEK",
  auth_enabled: false,
  auth_password: "",
};

type WizardMode = "none" | "wint" | "demo";

export function SetupWizard({ onComplete }: Props) {
  const [mode, setMode] = useState<WizardMode>("none");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SetupPayload>(DEFAULTS);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleDemoMode() {
    setSubmitting(true);
    setError("");
    try {
      await postSetupDemo();
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel.");
      setSubmitting(false);
    }
  }

  function update(field: keyof SetupPayload, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  function validateStep(): string {
    if (step === 0) {
      if (!form.wint_api_username.trim()) return "Användarnamn krävs.";
      if (!form.wint_api_password.trim()) return "Lösenord krävs.";
      if (!form.wint_api_base_url.trim()) return "API-URL krävs.";
    }
    if (step === 2 && form.auth_enabled && !form.auth_password?.trim()) {
      return "Ange ett lösenord för att aktivera åtkomstskydd.";
    }
    return "";
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => s + 1);
  }

  async function submit() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setSubmitting(true);
    setError("");
    try {
      await postSetupComplete(form);
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">Fint Likvid</h1>
          <p className="text-muted-foreground mt-1">Första uppstart — konfigurera appen</p>
        </div>

        {/* Mode selection */}
        {mode === "none" && (
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <p className="text-sm text-muted-foreground text-center">Välj hur du vill komma igång</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setMode("wint")}
                className="flex flex-col gap-2 p-5 rounded-xl border-2 border-border hover:border-primary/60 text-left transition-colors"
              >
                <span className="text-2xl">🔌</span>
                <span className="font-semibold text-sm">Anslut till Wint API</span>
                <span className="text-xs text-muted-foreground">
                  Koppla in ditt Wint-konto och se riktig data direkt.
                </span>
              </button>
              <button
                onClick={handleDemoMode}
                disabled={submitting}
                className="flex flex-col gap-2 p-5 rounded-xl border-2 border-border hover:border-primary/60 text-left transition-colors disabled:opacity-50"
              >
                <span className="text-2xl">🎭</span>
                <span className="font-semibold text-sm">Prova med demodata</span>
                <span className="text-xs text-muted-foreground">
                  Utforska appen med påhittade svenska företag. Inget konto behövs.
                </span>
              </button>
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}
          </div>
        )}

        {/* Step indicator — only shown in Wint mode */}
        {mode === "wint" && (
          <div className="flex gap-2 mb-8">
            {STEPS.map((label, i) => (
              <div key={i} className="flex-1">
                <div
                  className={`h-1.5 rounded-full mb-1 ${i <= step ? "bg-primary" : "bg-muted"}`}
                />
                <p className={`text-xs text-center ${i === step ? "text-primary font-medium" : "text-muted-foreground"}`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}

        {mode === "wint" && <div className="bg-card border rounded-xl p-6 shadow-sm space-y-5">
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="username">Wint API-användarnamn</Label>
                <Input
                  id="username"
                  value={form.wint_api_username}
                  onChange={(e) => update("wint_api_username", e.target.value)}
                  placeholder="t.ex. 123456"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Wint API-lösenord</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.wint_api_password}
                  onChange={(e) => update("wint_api_password", e.target.value)}
                  placeholder="UUID eller lösenord"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank">Bankkonto (BAS-nummer)</Label>
                <Input
                  id="bank"
                  value={form.wint_bank_account_number}
                  onChange={(e) => update("wint_bank_account_number", e.target.value)}
                  placeholder="1930"
                />
                <p className="text-xs text-muted-foreground">Kontonummer för saldo. Vanligtvis 1930.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="api-url">API-URL</Label>
                <Input
                  id="api-url"
                  value={form.wint_api_base_url}
                  onChange={(e) => update("wint_api_base_url", e.target.value)}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="cache">Uppdateringsintervall (timmar)</Label>
                <Input
                  id="cache"
                  type="number"
                  min={1}
                  max={24}
                  value={form.cache_refresh_interval_hours}
                  onChange={(e) => update("cache_refresh_interval_hours", Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Hur ofta data hämtas från Wint API.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="default-months">Standard prognosperiod (månader)</Label>
                <Input
                  id="default-months"
                  type="number"
                  min={1}
                  max={24}
                  value={form.default_forecast_months}
                  onChange={(e) => update("default_forecast_months", Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-months">Max prognosperiod (månader)</Label>
                <Input
                  id="max-months"
                  type="number"
                  min={1}
                  max={24}
                  value={form.max_forecast_months}
                  onChange={(e) => update("max_forecast_months", Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">Valuta</Label>
                <Input
                  id="currency"
                  value={form.currency}
                  onChange={(e) => update("currency", e.target.value)}
                  placeholder="SEK"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Lägg till ett lösenord för att skydda appen. Utan lösenord är appen öppen för alla på nätverket.
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="size-4 rounded"
                    checked={form.auth_enabled}
                    onChange={(e) => update("auth_enabled", e.target.checked)}
                  />
                  <span className="text-sm font-medium">Aktivera lösenordsskydd</span>
                </label>
              </div>
              {form.auth_enabled && (
                <div className="space-y-1.5">
                  <Label htmlFor="auth-pwd">Lösenord</Label>
                  <Input
                    id="auth-pwd"
                    type="password"
                    value={form.auth_password ?? ""}
                    onChange={(e) => update("auth_password", e.target.value)}
                    placeholder="Välj ett lösenord"
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Återställ lösenordet med:{" "}
                    <code className="font-mono bg-muted px-1 rounded">
                      docker exec wintstatus-backend python -m app.cli reset-auth
                    </code>
                  </p>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
                Tillbaka
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={next} className="flex-1">
                Nästa
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting} className="flex-1">
                {submitting ? "Sparar…" : "Slutför"}
              </Button>
            )}
          </div>
        </div>}
      </div>
    </div>
  );
}
