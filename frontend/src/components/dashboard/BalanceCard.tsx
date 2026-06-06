import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, X, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatSEK } from "@/utils/forecastTransform";
import { setBalanceOverride, clearBalanceOverride } from "@/api/client";
import { invalidateForecast } from "@/utils/queryKeys";
import { useForecast } from "@/context/ForecastContext";

interface BalanceCardProps {
  balance: number | null;
  balanceSource: "api" | "manual";
  balanceUpdatedAt: string | null;
  isLoading: boolean;
}

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "Z"); // backend stores UTC without tz marker
  return d.toLocaleString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" });
}

export function BalanceCard({ balance, balanceSource, balanceUpdatedAt, isLoading }: BalanceCardProps) {
  const { months } = useForecast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const invalidate = () => invalidateForecast(queryClient, months);

  const saveMutation = useMutation({
    mutationFn: () => setBalanceOverride(parseFloat(inputValue.replace(/\s/g, "").replace(",", "."))),
    onSuccess: () => { setEditing(false); invalidate(); },
  });

  const clearMutation = useMutation({
    mutationFn: clearBalanceOverride,
    onSuccess: invalidate,
  });

  const startEdit = () => {
    setInputValue(balance != null ? String(Math.round(balance)) : "");
    setEditing(true);
  };

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Aktuellt saldo</p>
            {isLoading ? (
              <Skeleton className="h-6 w-36" />
            ) : editing ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  type="number"
                  className="h-7 w-36 text-base font-bold"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveMutation.mutate(); if (e.key === "Escape") setEditing(false); }}
                />
                <Button size="icon" className="size-7" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  <Check className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditing(false)}>
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <p className="text-xl font-bold text-foreground leading-none">
                {balance != null ? formatSEK(balance) : "—"}
              </p>
            )}
            {!isLoading && !editing && balanceUpdatedAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {balanceSource === "manual" ? "Manuellt satt" : "Från API"} · {formatUpdatedAt(balanceUpdatedAt)}
              </p>
            )}
          </div>
          {!isLoading && !editing && (
            <div className="flex items-center gap-1 shrink-0">
              {balanceSource === "manual" && (
                <Button
                  variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive"
                  title="Återgå till API-saldo"
                  onClick={() => clearMutation.mutate()}
                  disabled={clearMutation.isPending}
                >
                  <X className="size-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" onClick={startEdit}>
                <Pencil className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
