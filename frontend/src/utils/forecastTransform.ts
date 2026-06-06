import type { ForecastEntry } from "@/api/types";

export interface DayBucket {
  date: string;           // "2025-06-12" — x-axis key
  dayLabel: string;       // "12 jun" — for tooltip
  monthLabel: string;     // "jun 2025" — shown on x-axis tick for the 1st of each month
  isMonthStart: boolean;  // true when date is the 1st of its month
  actualNet: number;
  forecastNet: number;
  runningBalance: number;
  hasActual: boolean;
  hasForecast: boolean;
}

// Keep the alias so SummaryRow and old imports don't break
export type MonthBucket = DayBucket;

function addOneDay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function labelForDate(dateStr: string): { dayLabel: string; monthLabel: string; isMonthStart: boolean } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dayLabel = d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  const monthLabel = d.toLocaleDateString("sv-SE", { month: "short", year: "numeric" });
  return { dayLabel, monthLabel, isMonthStart: day === 1 };
}

export function bucketByDay(
  entries: ForecastEntry[],
  startingBalance: number
): DayBucket[] {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Aggregate amounts per day, only from today forward
  const map = new Map<string, { actual: number; forecast: number }>();
  for (const entry of entries) {
    if (entry.date < today) continue;
    const amount = parseFloat(entry.amount as unknown as string);
    if (!map.has(entry.date)) map.set(entry.date, { actual: 0, forecast: 0 });
    const bucket = map.get(entry.date)!;
    if (entry.type === "actual") bucket.actual += amount;
    else bucket.forecast += amount;
  }

  if (map.size === 0) return [];

  const sortedDates = Array.from(map.keys()).sort();
  const firstDate = today < sortedDates[0] ? today : sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  // Walk every calendar day from firstDate to lastDate
  const result: DayBucket[] = [];
  let running = startingBalance;
  let cursor = firstDate;

  while (cursor <= lastDate) {
    const { actual, forecast } = map.get(cursor) ?? { actual: 0, forecast: 0 };
    running += actual + forecast;
    const { dayLabel, monthLabel, isMonthStart } = labelForDate(cursor);
    result.push({
      date: cursor,
      dayLabel,
      monthLabel,
      isMonthStart,
      actualNet: actual,
      forecastNet: forecast,
      runningBalance: running,
      hasActual: actual !== 0,
      hasForecast: forecast !== 0,
    });
    cursor = addOneDay(cursor);
  }

  return result;
}

// Keep old name as alias so Dashboard.tsx import doesn't break
export const bucketByMonth = bucketByDay;

export function formatSEK(amount: number): string {
  return amount.toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}
