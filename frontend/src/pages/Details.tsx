import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useForecast } from "@/context/ForecastContext";
import { getForecast } from "@/api/client";
import { FORECAST_KEY } from "@/utils/queryKeys";
import { formatSEK } from "@/utils/forecastTransform";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import type { ForecastCategory } from "@/api/types";

const CATEGORY_LABELS: Record<ForecastCategory, string> = {
  incoming_invoice: "Leverantörsfaktura",
  outgoing_invoice: "Kundfaktura",
  recurring_invoice: "Återkommande faktura",
  future_invoice: "Planerad faktura",
  one_off_expense: "Engångskostnad",
  periodic_expense: "Löpande kostnad",
  salary: "Lön",
  tax_social: "Skatt & sociala",
  vat: "Moms",
};

export function Details() {
  const { months } = useForecast();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: FORECAST_KEY(months),
    queryFn: () => getForecast(months),
    staleTime: Infinity,
  });

  const [typeFilter, setTypeFilter] = useState<"all" | "actual" | "forecast">("all");
  const [hiddenCategories, setHiddenCategories] = useState<Set<ForecastCategory>>(new Set());

  if (isLoading) return <LoadingState rows={6} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const today = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  })();

  const entries = (data?.entries ?? [])
    .filter((e) => e.date >= today)
    .filter((e) => typeFilter === "all" || e.type === typeFilter)
    .filter((e) => !hiddenCategories.has(e.category))
    .sort((a, b) => a.date.localeCompare(b.date));

  const toggleCategory = (cat: ForecastCategory) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="all">Alla typer</option>
          <option value="actual">Faktiskt</option>
          <option value="forecast">Prognos</option>
        </select>
        {(Object.keys(CATEGORY_LABELS) as ForecastCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={`px-2 py-1 rounded text-xs border transition-colors ${
              hiddenCategories.has(cat)
                ? "bg-muted text-muted-foreground line-through"
                : "bg-background border-primary text-primary"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Datum</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Belopp</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Typ</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Kategori</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Källa</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry, i) => {
              const amount = parseFloat(entry.amount as unknown as string);
              return (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-3 py-2 whitespace-nowrap">{entry.date}</td>
                  <td className={`px-3 py-2 text-right font-medium whitespace-nowrap ${amount >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatSEK(amount)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={entry.type === "actual" ? "default" : "secondary"}>
                      {entry.type === "actual" ? "Faktiskt" : "Prognos"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{CATEGORY_LABELS[entry.category]}</td>
                  <td className="px-3 py-2 text-muted-foreground truncate max-w-40">{entry.label}</td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  Inga händelser att visa
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
