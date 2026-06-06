import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { DeleteConfirm } from "@/components/settings/DeleteConfirm";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { listRecurring, createRecurring, updateRecurring, deleteRecurring, getIncomingInvoices } from "@/api/client";
import { invalidateForecast } from "@/utils/queryKeys";
import { useForecast } from "@/context/ForecastContext";
import type { RecurringInvoiceConfigCreate, RecurringInvoiceConfigResponse } from "@/api/types";

const EMPTY: RecurringInvoiceConfigCreate = {
  supplier_name: "",
  interval_months: 1,
  override_total: null,
  override_vat: null,
  match_amount: null,
  enabled: true,
};

export function RecurringInvoices() {
  const { months } = useForecast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<RecurringInvoiceConfigResponse | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<RecurringInvoiceConfigCreate>(EMPTY);

  const { data: configs, isLoading, isError, refetch } = useQuery({
    queryKey: ["recurring"],
    queryFn: listRecurring,
  });
  const { data: invoices } = useQuery({
    queryKey: ["incoming-invoices"],
    queryFn: getIncomingInvoices,
  });

  const supplierNames = [...new Set((invoices ?? []).map((i) => i.SupplierName).filter(Boolean) as string[])].sort();

  const afterSave = () => {
    queryClient.invalidateQueries({ queryKey: ["recurring"] });
    invalidateForecast(queryClient, months);
    setAdding(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const saveMutation = useMutation({
    mutationFn: (f: RecurringInvoiceConfigCreate) =>
      editing ? updateRecurring(editing.id, f) : createRecurring(f),
    onSuccess: afterSave,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRecurring(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring"] });
      invalidateForecast(queryClient, months);
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const showForm = adding || editing !== null;

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard
        title="Återkommande fakturor"
        action={
          !showForm && (
            <Button size="sm" onClick={() => { setAdding(true); setForm(EMPTY); }} className="gap-1.5">
              <Plus className="size-3.5" /> Lägg till
            </Button>
          )
        }
      >
        {showForm && (
          <form
            className="flex flex-col gap-3 mb-6 p-4 border rounded-lg bg-muted/30"
            onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}
          >
            <div className="flex flex-col gap-1">
              <Label>Leverantör</Label>
              <Input
                list="suppliers"
                value={form.supplier_name}
                onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                placeholder="Leverantörsnamn"
                required
              />
              <datalist id="suppliers">
                {supplierNames.map((n) => <option key={n} value={n} />)}
              </datalist>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <Label>Intervall (månader)</Label>
                <Input
                  type="number"
                  min={1} max={12}
                  value={form.interval_months}
                  onChange={(e) => setForm({ ...form, interval_months: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <Label>Överstyr belopp (kr)</Label>
                <Input
                  type="number"
                  value={form.override_total ?? ""}
                  placeholder="Senaste faktura"
                  onChange={(e) => setForm({ ...form, override_total: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Matcha på belopp (kr) <span className="text-muted-foreground font-normal">— valfritt</span></Label>
              <Input
                type="number"
                value={form.match_amount ?? ""}
                placeholder="Lämna tomt om bara en faktura per leverantör"
                onChange={(e) => setForm({ ...form, match_amount: e.target.value ? parseFloat(e.target.value) : null })}
              />
              <p className="text-xs text-muted-foreground">
                Använd när samma leverantör skickar flera fakturor (t.ex. bil- och företagsförsäkring). ±25 % tolerans.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="size-4"
              />
              <Label htmlFor="enabled">Aktiv</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => { setAdding(false); setEditing(null); setForm(EMPTY); }}>
                Avbryt
              </Button>
              <Button type="submit" size="sm" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Sparar…" : "Spara"}
              </Button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-2">
          {(configs ?? []).map((cfg) => (
            <div key={cfg.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{cfg.supplier_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Var {cfg.interval_months}:e månad
                  {cfg.override_total != null && ` · ${Number(cfg.override_total).toLocaleString("sv-SE")} kr`}
                  {cfg.match_amount != null && ` · matchar ~${Number(cfg.match_amount).toLocaleString("sv-SE")} kr`}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Badge variant={cfg.enabled ? "default" : "secondary"}>
                  {cfg.enabled ? "Aktiv" : "Inaktiv"}
                </Badge>
                <Button variant="ghost" size="icon" className="size-8"
                  onClick={() => { setEditing(cfg); setForm({ supplier_name: cfg.supplier_name, interval_months: cfg.interval_months, override_total: cfg.override_total ?? null, override_vat: cfg.override_vat ?? null, match_amount: cfg.match_amount ?? null, enabled: cfg.enabled }); }}>
                  <Pencil className="size-4" />
                </Button>
                <DeleteConfirm onConfirm={() => deleteMutation.mutate(cfg.id)} />
              </div>
            </div>
          ))}
          {!configs?.length && <p className="text-sm text-muted-foreground text-center py-4">Inga konfigurationer ännu</p>}
        </div>
      </SettingsCard>
    </div>
  );
}
