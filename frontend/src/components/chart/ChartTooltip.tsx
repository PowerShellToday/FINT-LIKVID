import { formatSEK } from "@/utils/forecastTransform";

interface TooltipArgs {
  active?: boolean;
  payload?: Array<{ payload: unknown }>;
  label?: string;
}

export function ChartTooltip({ active, payload, label }: TooltipArgs) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload as {
    date: string;
    dayLabel: string;
    actualNet: number;
    forecastNet: number;
    runningBalance: number;
  };

  return (
    <div className="rounded-lg border bg-card shadow-md p-3 text-sm min-w-48">
      <p className="font-semibold text-foreground mb-2 capitalize">{data.dayLabel || data.date || label}</p>
      {data.actualNet !== 0 && (
        <div className="flex justify-between gap-4 text-muted-foreground">
          <span>Faktiskt netto</span>
          <span className={data.actualNet >= 0 ? "text-green-600" : "text-red-600"}>
            {formatSEK(data.actualNet)}
          </span>
        </div>
      )}
      {data.forecastNet !== 0 && (
        <div className="flex justify-between gap-4 text-muted-foreground">
          <span>Prognos netto</span>
          <span className={data.forecastNet >= 0 ? "text-green-600" : "text-red-600"}>
            {formatSEK(data.forecastNet)}
          </span>
        </div>
      )}
      <div className="flex justify-between gap-4 font-medium border-t mt-2 pt-2">
        <span>Saldo</span>
        <span className={data.runningBalance >= 0 ? "text-foreground" : "text-red-600"}>
          {formatSEK(data.runningBalance)}
        </span>
      </div>
    </div>
  );
}
