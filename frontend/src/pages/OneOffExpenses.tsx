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
import { listExpenses, createExpense, updateExpense, deleteExpense } from "@/api/client";
import { invalidateForecast } from "@/utils/queryKeys";
import { useForecast } from "@/context/ForecastContext";
import { formatSEK } from "@/utils/forecastTransform";
import type { OneOffExpenseCreate, OneOffExpenseResponse } from "@/api/types";

const EMPTY: OneOffExpenseCreate = { label: "", amount: 0, planned_date: new Date().toISOString().slice(0, 10) };

export function OneOffExpenses() {
  const { months } = useForecast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<OneOffExpenseResponse | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<OneOffExpenseCreate>(EMPTY);

  const { data: expenses, isLoading, isError, refetch } = useQuery({ queryKey: ["expenses"], queryFn: listExpenses });

  const afterSave = () => {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    invalidateForecast(queryClient, months);
    setAdding(false); setEditing(null); setForm(EMPTY);
  };

  const saveMutation = useMutation({
    mutationFn: (f: OneOffExpenseCreate) => editing ? updateExpense(editing.id, f) : createExpense(f),
    onSuccess: afterSave,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); invalidateForecast(queryClient, months); },
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const showForm = adding || editing !== null;

  return (
    <SettingsCard
      title="Engångskostnader"
      action={!showForm && (
        <Button size="sm" onClick={() => { setAdding(true); setForm(EMPTY); }} className="gap-1.5">
          <Plus className="size-3.5" /> Lägg till
        </Button>
      )}
    >
      {showForm && (
        <form className="flex flex-col gap-3 mb-6 p-4 border rounded-lg bg-muted/30"
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}>
          <div className="flex flex-col gap-1">
            <Label>Benämning</Label>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Kostnadsbeskrivning" required />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <Label>Belopp (kr)</Label>
              <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} required />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <Label>Planerat datum</Label>
              <Input type="date" value={form.planned_date} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} required />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => { setAdding(false); setEditing(null); }}>Avbryt</Button>
            <Button type="submit" size="sm" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Sparar…" : "Spara"}</Button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {(expenses ?? []).sort((a, b) => a.planned_date.localeCompare(b.planned_date)).map((exp) => (
          <div key={exp.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{exp.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{exp.planned_date} · {formatSEK(Number(exp.amount))}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-8"
                onClick={() => { setEditing(exp); setForm({ label: exp.label, amount: Number(exp.amount), planned_date: exp.planned_date }); }}>
                <Pencil className="size-4" />
              </Button>
              <DeleteConfirm onConfirm={() => deleteMutation.mutate(exp.id)} />
            </div>
          </div>
        ))}
        {!expenses?.length && <p className="text-sm text-muted-foreground text-center py-4">Inga engångskostnader</p>}
      </div>
    </SettingsCard>
  );
}
