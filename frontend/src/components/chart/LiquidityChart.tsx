import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTooltip } from "./ChartTooltip";
import { ChartLegend } from "./ChartLegend";
import type { DayBucket } from "@/utils/forecastTransform";
import { formatSEK } from "@/utils/forecastTransform";
import { useTheme } from "@/context/ThemeContext";

interface LiquidityChartProps {
  data: DayBucket[];
  isLoading: boolean;
}

function cssVar(name: string) {
  return `hsl(${getComputedStyle(document.documentElement).getPropertyValue(name).trim()})`;
}

function xTickFormatter(_date: string, index: number, buckets: DayBucket[]): string {
  const bucket = buckets[index];
  if (!bucket) return "";
  // Show label only on the 1st of each month (or the very first point)
  if (bucket.isMonthStart || index === 0) return bucket.monthLabel;
  return "";
}

export function LiquidityChart({ data, isLoading }: LiquidityChartProps) {
  useTheme(); // re-render on theme/mode change so cssVar reads updated values

  const primary = cssVar("--primary");
  const gridColor = cssVar("--border");
  const tickColor = cssVar("--muted-foreground");
  const balanceColor = cssVar("--muted-foreground");

  if (isLoading) {
    return <Skeleton className="w-full h-72 rounded-xl" />;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primary} stopOpacity={0.6} />
              <stop offset="95%" stopColor={primary} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primary} stopOpacity={0.25} />
              <stop offset="95%" stopColor={primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            tickFormatter={(value, index) => xTickFormatter(value as string, index, data)}
            tick={{ fontSize: 11, fill: tickColor }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tickFormatter={(v: number) => formatSEK(v)}
            tick={{ fontSize: 10, fill: tickColor }}
            width={90}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="actualNet"
            stroke={primary}
            strokeWidth={2}
            fill="url(#actualFill)"
            name="Faktiskt"
          />
          <Area
            type="monotone"
            dataKey="forecastNet"
            stroke={primary}
            strokeWidth={1.5}
            strokeDasharray="4 2"
            fill="url(#forecastFill)"
            name="Prognos"
          />
          <Line
            type="monotone"
            dataKey="runningBalance"
            stroke={balanceColor}
            strokeWidth={2}
            dot={false}
            name="Saldo"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartLegend />
    </div>
  );
}
