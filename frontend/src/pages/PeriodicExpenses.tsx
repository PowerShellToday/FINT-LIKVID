import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { DeleteConfirm } from "@/components/settings/DeleteConfirm";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { listPeriodicExpenses, createPeriodicExpense, updatePeriodicExpense, deletePeriodicExpense } from "@/api/client";
import { invalidateForecast } from "@/utils/queryKeys";
import { useForecast } from "@/context/ForecastContext";
import { formatSEK } from "@/utils/forecastTransform";
import type { PeriodicExpenseCreate, PeriodicExpenseResponse } from "@/api/types";

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const EMPTY: PeriodicExpenseCreate = {
  label: "",
  amount: 0,
  recurrence_type: "days",
  interval_days: 30,
  day_of_month: null,
  start_date: localToday(),
  end_date: null,
};

function recurrenceLabel(pe: PeriodicExpenseResponse): string {
  if (pe.recurrence_type === "days") return `var ${pe.interval_days}:e dag`;
  return `månadsvis dag ${pe.day_of_month}`;
}

export function PeriodicExpenses() {
  const { months } = useForecast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PeriodicExpenseResponse | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<PeriodicExpenseCreate>(EMPTY);

  const { data: items, isLoading, isError, refetch } = useQuery({
    queryKey: ["periodic-expenses"],
    queryFn: listPeriodicExpenses,
  });

  const afterSave = () => {
    queryClient.invalidateQueries({ queryKey: ["periodic-expenses"] });
    invalidateForecast(queryClient, months);
    setAdding(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const saveMutation = useMutation({
    mutationFn: (f: PeriodicExpenseCreate) =>
      editing ? updatePeriodicExpense(editing.id, f) : createPeriodicExpense(f),
    onSuccess: afterSave,
  });

  const deleteMutation = useMutation({
    mutationFn: deletePeriodicExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodic-expenses"] });
      invalidateForecast(queryClient, months);
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const showForm = adding || editing !== null;

  const setRecurrenceType = (type: "days" | "monthly") => {
    setForm({
      ...form,
      recurrence_type: type,
      interval_days: type === "days" ? (form.interval_days ?? 30) : null,
      day_of_month: type === "monthly" ? (form.day_of_month ?? 1) : null,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard
        title="Löpande kostnader"
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
              <Label>Namn</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="t.ex. Kreditkort, Claude"
                required
              />
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <Label>Belopp (kr)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.amount || ""}
                  onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <Label>Upprepning</Label>
                <select
                  value={form.recurrence_type}
                  onChange={(e) => setRecurrenceType(e.target.value as "days" | "monthly")}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="days">Var X dag</option>
                  <option value="monthly">Månadsvis</option>
                </select>
              </div>
            </div>

            {form.recurrence_type === "days" ? (
              <div className="flex flex-col gap-1">
                <Label>Intervall (dagar)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.interval_days ?? ""}
                  onChange={(e) => setForm({ ...form, interval_days: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <Label>Dag i månaden</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.day_of_month ?? ""}
                  onChange={(e) => setForm({ ...form, day_of_month: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <Label>Startdatum</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <Label>Slutdatum (valfritt)</Label>
                <Input
                  type="date"
                  value={form.end_date ?? ""}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value || null })}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm"
                onClick={() => { setAdding(false); setEditing(null); setForm(EMPTY); }}>
                Avbryt
              </Button>
              <Button type="submit" size="sm" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Sparar…" : "Spara"}
              </Button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-2">
          {(items ?? []).map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatSEK(Number(item.amount))} · {recurrenceLabel(item)}
                  {" · "}Från {item.start_date}
                  {item.end_date && ` till ${item.end_date}`}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button variant="ghost" size="icon" className="size-8"
                  onClick={() => {
                    setEditing(item);
                    setForm({
                      label: item.label,
                      amount: Number(item.amount),
                      recurrence_type: item.recurrence_type as "days" | "monthly",
                      interval_days: item.interval_days,
                      day_of_month: item.day_of_month,
                      start_date: item.start_date,
                      end_date: item.end_date,
                    });
                  }}>
                  <Pencil className="size-4" />
                </Button>
                <DeleteConfirm onConfirm={() => deleteMutation.mutate(item.id)} />
              </div>
            </div>
          ))}
          {!items?.length && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Inga löpande kostnader ännu
            </p>
          )}
        </div>
      </SettingsCard>
    </div>
  );
}
