import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { MonthPicker } from "@/components/settings/MonthPicker";
import { DeleteConfirm } from "@/components/settings/DeleteConfirm";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import {
  listSalary, createSalary, deleteSalary,
  listTaxSocial, createTaxSocial, deleteTaxSocial,
} from "@/api/client";
import { invalidateForecast } from "@/utils/queryKeys";
import { useForecast } from "@/context/ForecastContext";
import { formatSEK } from "@/utils/forecastTransform";
import type { SalarySettingCreate, SalarySettingResponse, TaxSocialSettingCreate, TaxSocialSettingResponse } from "@/api/types";

type AnySettingResponse = SalarySettingResponse | TaxSocialSettingResponse;

function isActive(row: AnySettingResponse): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return row.effective_from <= today;
}

interface SectionProps {
  title: string;
  amountLabel: string;
  items: AnySettingResponse[];
  onCreate: (body: SalarySettingCreate) => void;
  onDelete: (id: number) => void;
  isPending: boolean;
}

function SettingSection({ title, amountLabel, items, onCreate, onDelete, isPending }: SectionProps) {
  const [adding, setAdding] = useState(false);
  const today = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [form, setForm] = useState<SalarySettingCreate>({ net_monthly_amount: 0, effective_from: today });

  const sorted = [...items].sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  const activeRow = sorted.find(isActive);

  return (
    <SettingsCard
      title={title}
      action={!adding && (
        <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5">
          <Plus className="size-3.5" /> Lägg till period
        </Button>
      )}
    >
      {adding && (
        <form className="flex flex-col gap-3 mb-4 p-4 border rounded-lg bg-muted/30"
          onSubmit={(e) => { e.preventDefault(); onCreate(form); setAdding(false); setForm({ net_monthly_amount: 0, effective_from: today }); }}>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <Label>{amountLabel}</Label>
              <Input type="number" min={0} value={form.net_monthly_amount}
                onChange={(e) => setForm({ ...form, net_monthly_amount: parseFloat(e.target.value) || 0 })} required />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <Label>Gäller från och med</Label>
              <MonthPicker value={form.effective_from} onChange={(v) => setForm({ ...form, effective_from: v })} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>Avbryt</Button>
            <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Sparar…" : "Spara"}</Button>
          </div>
        </form>
      )}
      <div className="flex flex-col gap-2">
        {sorted.map((row) => {
          const active = row === activeRow;
          return (
            <div key={row.id} className={`flex items-center justify-between p-3 border rounded-lg ${active ? "border-primary bg-primary/5" : ""}`}>
              <div>
                <p className="font-medium">{formatSEK(Number(row.net_monthly_amount))} / månad</p>
                <p className="text-xs text-muted-foreground mt-0.5">Från {row.effective_from.slice(0, 7)}</p>
              </div>
              <div className="flex items-center gap-1">
                {active && <Badge>Aktiv</Badge>}
                <DeleteConfirm onConfirm={() => onDelete(row.id)} />
              </div>
            </div>
          );
        })}
        {!sorted.length && <p className="text-sm text-muted-foreground text-center py-4">Inga inställningar</p>}
      </div>
    </SettingsCard>
  );
}

export function SalarySettings() {
  const { months } = useForecast();
  const queryClient = useQueryClient();

  const { data: salary, isLoading: salLoading, isError: salError, refetch: salRefetch } = useQuery({ queryKey: ["salary"], queryFn: listSalary });
  const { data: taxSocial, isLoading: taxLoading, isError: taxError, refetch: taxRefetch } = useQuery({ queryKey: ["tax-social"], queryFn: listTaxSocial });

  const afterSave = () => {
    queryClient.invalidateQueries({ queryKey: ["salary"] });
    queryClient.invalidateQueries({ queryKey: ["tax-social"] });
    invalidateForecast(queryClient, months);
  };

  const createSalaryMutation = useMutation({ mutationFn: createSalary, onSuccess: afterSave });
  const deleteSalaryMutation = useMutation({ mutationFn: (id: number) => deleteSalary(id), onSuccess: afterSave });
  const createTaxMutation = useMutation({ mutationFn: createTaxSocial, onSuccess: afterSave });
  const deleteTaxMutation = useMutation({ mutationFn: (id: number) => deleteTaxSocial(id), onSuccess: afterSave });

  if (salLoading || taxLoading) return <LoadingState />;
  if (salError || taxError) return <ErrorState onRetry={() => { salRefetch(); taxRefetch(); }} />;

  return (
    <div className="flex flex-col gap-4">
      <SettingSection
        title="Lön"
        amountLabel="Nettomånadslön (kr)"
        items={salary ?? []}
        onCreate={(body) => createSalaryMutation.mutate(body as SalarySettingCreate)}
        onDelete={(id) => deleteSalaryMutation.mutate(id)}
        isPending={createSalaryMutation.isPending}
      />
      <SettingSection
        title="Skatt & sociala avgifter"
        amountLabel="Preliminär skatt och sociala avgifter (kr)"
        items={taxSocial ?? []}
        onCreate={(body) => createTaxMutation.mutate(body as TaxSocialSettingCreate)}
        onDelete={(id) => deleteTaxMutation.mutate(id)}
        isPending={createTaxMutation.isPending}
      />
    </div>
  );
}
