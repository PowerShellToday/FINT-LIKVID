import { cn } from "@/lib/utils";
import { formatSEK } from "@/utils/forecastTransform";
import type { ForecastEntry } from "@/api/types";

interface SummaryRowProps {
  entries: ForecastEntry[];
}

interface MonthTotal {
  key: string;
  label: string;
  net: number;
}

function aggregateByMonth(entries: ForecastEntry[]): MonthTotal[] {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const map = new Map<string, { label: string; net: number }>();
  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    if (key < thisMonth) continue; // skip months before the current one
    if (!map.has(key)) {
      const [year, month] = key.split("-").map(Number);
      const d = new Date(year, month - 1, 1);
      const label = d.toLocaleDateString("sv-SE", { month: "short", year: "numeric" });
      map.set(key, { label: label.charAt(0).toUpperCase() + label.slice(1), net: 0 });
    }
    map.get(key)!.net += parseFloat(entry.amount as unknown as string);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { label, net }]) => ({ key, label, net }));
}

export function SummaryRow({ entries }: SummaryRowProps) {
  const months = aggregateByMonth(entries);
  if (!months.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 pt-1 snap-x">
      {months.map(({ key, label, net }) => {
        const positive = net >= 0;
        return (
          <div
            key={key}
            className={cn(
              "flex-shrink-0 snap-start rounded-lg px-3 py-2 text-xs text-center min-w-28 border",
              positive
                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-400"
                : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-400"
            )}
          >
            <p className="font-medium capitalize">{label}</p>
            <p className="mt-0.5 font-semibold">{formatSEK(net)}</p>
          </div>
        );
      })}
    </div>
  );
}
