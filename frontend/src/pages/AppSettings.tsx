import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import {
  getAppSettings,
  updateAppSettings,
  updateWintCredentials,
  testWintConnection,
  updateAuthSettings,
  exportData,
  importData,
} from "@/api/client";
import { postSetupReset } from "@/api/setup";
import type { AppSettingsResponse } from "@/api/types";
import { useTheme, type Theme, type Mode } from "@/context/ThemeContext";

type SaveState = "idle" | "saving" | "ok" | "error";
type TestState = "idle" | "testing" | "ok" | "error";

// ── Section 0: Appearance ─────────────────────────────────────────────────────

const THEMES: Array<{ id: Theme; label: string; description: string; swatches: string[] }> = [
  {
    id: "default",
    label: "Standard",
    description: "Klassisk blå design",
    swatches: ["#3b82f6", "#f8fafc", "#1e293b"],
  },
  {
    id: "fint",
    label: "Fint",
    description: "Varm beige & himmelsblå",
    swatches: ["#5dcfff", "#f8f1e8", "#402d2a"],
  },
  {
    id: "matrix",
    label: "Matrix",
    description: "Monospace, skarp, grön terminal",
    swatches: ["#00ff00", "#000000", "#00cc00"],
  },
  {
    id: "solarized",
    label: "Solarized",
    description: "Varm Solarized-palett",
    swatches: ["#268bd2", "#fdf6e3", "#002b36"],
  },
];

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "light", label: "Ljust" },
  { id: "dark", label: "Mörkt" },
  { id: "system", label: "System" },
];

function AppearanceSection() {
  const { theme, mode, setTheme, setMode } = useTheme();

  return (
    <SettingsCard title="Utseende">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium mb-2">Tema</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex flex-col gap-2 p-3 rounded-lg border-2 text-left transition-colors ${
                  theme === t.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex gap-1.5">
                  {t.swatches.map((c) => (
                    <span
                      key={c}
                      className="w-4 h-4 rounded-full border border-border/50"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.description}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Ljusläge</p>
          <div className="flex gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-4 py-1.5 rounded-md text-sm border transition-colors ${
                  mode === m.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}

function statusText(state: SaveState, errorMsg: string): string | null {
  if (state === "ok") return "Sparat!";
  if (state === "error") return errorMsg;
  return null;
}

// ── Section 1: Wint API ───────────────────────────────────────────────────────

function WintApiSection({ data, onSaved }: { data: AppSettingsResponse; onSaved: () => void }) {
  const [form, setForm] = useState({
    username: data.wint_username,
    password: "",
    base_url: data.wint_api_base_url,
    bank_account: data.wint_bank_account_number,
  });
  const [testState, setTestState] = useState<TestState>("idle");
  const [testMsg, setTestMsg] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMsg, setSaveMsg] = useState("");

  async function handleTest() {
    setTestState("testing");
    setTestMsg("");
    try {
      await testWintConnection({
        username: form.username || undefined,
        password: form.password || undefined,
        base_url: form.base_url || undefined,
      });
      setTestState("ok");
      setTestMsg("Anslutning lyckades!");
    } catch (err) {
      setTestState("error");
      setTestMsg(err instanceof Error ? err.message : "Anslutning misslyckades");
    }
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveMsg("");
    try {
      await updateAppSettings({
        wint_api_base_url: form.base_url,
        wint_bank_account_number: form.bank_account,
        cache_refresh_interval_hours: data.cache_refresh_interval_hours,
        default_forecast_months: data.default_forecast_months,
        max_forecast_months: data.max_forecast_months,
        currency: data.currency,
      });
      if (form.password) {
        await updateWintCredentials({ username: form.username, password: form.password });
        setForm((f) => ({ ...f, password: "" }));
      }
      setSaveState("ok");
      onSaved();
    } catch (err) {
      setSaveState("error");
      setSaveMsg(err instanceof Error ? err.message : "Kunde inte spara");
    }
  }

  return (
    <SettingsCard title="Wint API">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="wint-username">Användarnamn</Label>
            <Input
              id="wint-username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wint-password">Lösenord</Label>
            <Input
              id="wint-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Lämna tomt för att behålla"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wint-base-url">API-URL</Label>
            <Input
              id="wint-base-url"
              value={form.base_url}
              onChange={(e) => setForm({ ...form, base_url: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wint-bank-account">Bankkontonummer</Label>
            <Input
              id="wint-bank-account"
              value={form.bank_account}
              onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
            />
          </div>
        </div>

        {testMsg && (
          <p className={`text-sm px-3 py-2 rounded-md ${testState === "ok" ? "text-green-700 bg-green-50 border border-green-200" : "text-destructive bg-destructive/10"}`}>
            {testMsg}
          </p>
        )}

        {saveState !== "idle" && saveState !== "saving" && (
          <p className={`text-sm px-3 py-2 rounded-md ${saveState === "ok" ? "text-green-700 bg-green-50 border border-green-200" : "text-destructive bg-destructive/10"}`}>
            {statusText(saveState, saveMsg)}
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testState === "testing"}
          >
            {testState === "testing" ? "Testar…" : "Testa anslutning"}
          </Button>
          <Button onClick={handleSave} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Sparar…" : "Spara"}
          </Button>
        </div>
      </div>
    </SettingsCard>
  );
}

// ── Section 2: App behavior ───────────────────────────────────────────────────

function AppBehaviorSection({ data, onSaved }: { data: AppSettingsResponse; onSaved: () => void }) {
  const [form, setForm] = useState({
    cache_refresh_interval_hours: data.cache_refresh_interval_hours,
    default_forecast_months: data.default_forecast_months,
    max_forecast_months: data.max_forecast_months,
    currency: data.currency,
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMsg, setSaveMsg] = useState("");

  async function handleSave() {
    setSaveState("saving");
    setSaveMsg("");
    try {
      await updateAppSettings({
        wint_api_base_url: data.wint_api_base_url,
        wint_bank_account_number: data.wint_bank_account_number,
        ...form,
      });
      setSaveState("ok");
      onSaved();
    } catch (err) {
      setSaveState("error");
      setSaveMsg(err instanceof Error ? err.message : "Kunde inte spara");
    }
  }

  return (
    <SettingsCard title="Appinställningar">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cache-interval">Cache-uppdatering (timmar)</Label>
            <Input
              id="cache-interval"
              type="number"
              min={1}
              max={24}
              value={form.cache_refresh_interval_hours}
              onChange={(e) => setForm({ ...form, cache_refresh_interval_hours: parseInt(e.target.value) || 6 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Valuta</Label>
            <Input
              id="currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="default-months">Standardperiod prognos (månader)</Label>
            <Input
              id="default-months"
              type="number"
              min={1}
              max={24}
              value={form.default_forecast_months}
              onChange={(e) => setForm({ ...form, default_forecast_months: parseInt(e.target.value) || 6 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max-months">Maxperiod prognos (månader)</Label>
            <Input
              id="max-months"
              type="number"
              min={1}
              max={24}
              value={form.max_forecast_months}
              onChange={(e) => setForm({ ...form, max_forecast_months: parseInt(e.target.value) || 24 })}
            />
          </div>
        </div>

        {saveState !== "idle" && saveState !== "saving" && (
          <p className={`text-sm px-3 py-2 rounded-md ${saveState === "ok" ? "text-green-700 bg-green-50 border border-green-200" : "text-destructive bg-destructive/10"}`}>
            {statusText(saveState, saveMsg)}
          </p>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Sparar…" : "Spara"}
          </Button>
        </div>
      </div>
    </SettingsCard>
  );
}

// ── Section 3: Auth ───────────────────────────────────────────────────────────

function AuthSection({ data }: { data: AppSettingsResponse }) {
  const [form, setForm] = useState({
    auth_enabled: data.auth_enabled,
    new_password: "",
    confirm_password: "",
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMsg, setSaveMsg] = useState("");

  async function handleSave() {
    setSaveState("saving");
    setSaveMsg("");
    try {
      await updateAuthSettings({
        auth_enabled: form.auth_enabled,
        new_password: form.new_password || null,
        confirm_password: form.confirm_password || null,
      });
      setSaveState("ok");
      setForm((f) => ({ ...f, new_password: "", confirm_password: "" }));
    } catch (err) {
      setSaveState("error");
      setSaveMsg(err instanceof Error ? err.message : "Kunde inte spara");
    }
  }

  return (
    <SettingsCard title="Åtkomst">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <input
            id="auth-enabled"
            type="checkbox"
            className="size-4 accent-primary"
            checked={form.auth_enabled}
            onChange={(e) => setForm({ ...form, auth_enabled: e.target.checked })}
          />
          <Label htmlFor="auth-enabled" className="cursor-pointer">Aktivera inloggning</Label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Nytt lösenord</Label>
            <Input
              id="new-password"
              type="password"
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
              placeholder={data.auth_enabled ? "Lämna tomt för att behålla" : ""}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Bekräfta lösenord</Label>
            <Input
              id="confirm-password"
              type="password"
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
              autoComplete="new-password"
            />
          </div>
        </div>

        {saveState !== "idle" && saveState !== "saving" && (
          <p className={`text-sm px-3 py-2 rounded-md ${saveState === "ok" ? "text-green-700 bg-green-50 border border-green-200" : "text-destructive bg-destructive/10"}`}>
            {statusText(saveState, saveMsg)}
          </p>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveState === "saving"}>
            {saveState === "saving" ? "Sparar…" : "Spara"}
          </Button>
        </div>
      </div>
    </SettingsCard>
  );
}

// ── Section 4: Backup / restore ──────────────────────────────────────────────

function BackupSection() {
  const queryClient = useQueryClient();
  const [exportState, setExportState] = useState<"idle" | "busy" | "error">("idle");
  const [importState, setImportState] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const [importMsg, setImportMsg] = useState("");
  const [exportError, setExportError] = useState("");

  async function handleExport() {
    setExportState("busy");
    setExportError("");
    try {
      await exportData();
      setExportState("idle");
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export misslyckades.");
      setExportState("error");
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportState("busy");
    setImportMsg("");
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const result = await importData(payload);
      const summary = Object.entries(result.imported)
        .map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`)
        .join(", ");
      setImportMsg(`Importerat: ${summary}`);
      setImportState("ok");
      queryClient.invalidateQueries();
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "Import misslyckades.");
      setImportState("error");
    }
  }

  return (
    <SettingsCard title="Säkerhetskopiering">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Exportera alla inställningar till en JSON-fil. Filen innehåller{" "}
          <strong>inga</strong> API-uppgifter eller lösenord och kan importeras för att
          återställa inställningar på en ny installation.
        </p>

        {/* Export */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportState === "busy"}
          >
            {exportState === "busy" ? "Exporterar…" : "⬇ Exportera inställningar"}
          </Button>
          {exportError && (
            <p className="text-sm text-destructive">{exportError}</p>
          )}
        </div>

        {/* Import */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="import-file" className="text-sm font-medium">
            Importera från fil
          </Label>
          <p className="text-xs text-muted-foreground -mt-1">
            Ersätter alla nuvarande inställningar med innehållet i säkerhetskopian.
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              asChild
              disabled={importState === "busy"}
            >
              <label htmlFor="import-file" className="cursor-pointer">
                {importState === "busy" ? "Importerar…" : "⬆ Välj fil (.json)"}
              </label>
            </Button>
            <input
              id="import-file"
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={handleImport}
              disabled={importState === "busy"}
            />
          </div>
          {importMsg && (
            <p
              className={`text-sm px-3 py-2 rounded-md ${
                importState === "ok"
                  ? "text-green-700 bg-green-50 border border-green-200"
                  : "text-destructive bg-destructive/10"
              }`}
            >
              {importMsg}
            </p>
          )}
        </div>
      </div>
    </SettingsCard>
  );
}

// ── Section 5: Danger zone ────────────────────────────────────────────────────

function DangerZoneSection() {
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");

  async function handleReset() {
    setResetting(true);
    setError("");
    try {
      await postSetupReset();
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Återställning misslyckades.");
      setResetting(false);
    }
  }

  return (
    <SettingsCard title="Farlig zon">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Återställer all konfiguration, rensar all data och återgår till installationsguiden.
          Åtgärden går inte att ångra.
        </p>
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
        )}
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={resetting}>
                {resetting ? "Återställer…" : "Återställ konfiguration"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Är du säker?</AlertDialogTitle>
                <AlertDialogDescription>
                  All konfiguration, inloggningsuppgifter och inställningar raderas permanent.
                  Appen återgår till installationsguiden. Det går inte att ångra.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Ja, återställ allt
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </SettingsCard>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AppSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
  });

  function handleSaved() {
    queryClient.invalidateQueries({ queryKey: ["app-settings"] });
  }

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState onRetry={refetch} />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Inställningar</h1>
      {data.is_demo_mode && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-300">
          <span className="text-base">🎭</span>
          <span>Du kör i <strong>demoläge</strong> — påhittade data, ingen Wint-koppling.</span>
        </div>
      )}
      <AppearanceSection />
      {!data.is_demo_mode && <WintApiSection data={data} onSaved={handleSaved} />}
      <AppBehaviorSection data={data} onSaved={handleSaved} />
      <AuthSection data={data} />
      <BackupSection />
      <DangerZoneSection />
    </div>
  );
}
