import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useForecast } from "@/context/ForecastContext";
import { getForecast } from "@/api/client";
import { FORECAST_KEY } from "@/utils/queryKeys";
import { bucketByMonth } from "@/utils/forecastTransform";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { DataFreshness } from "@/components/dashboard/DataFreshness";
import { LiquidityChart } from "@/components/chart/LiquidityChart";
import { SummaryRow } from "@/components/dashboard/SummaryRow";

function is503(error: unknown): boolean {
  return error instanceof Error && error.message.includes("503");
}

export function Dashboard() {
  const { months } = useForecast();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: FORECAST_KEY(months),
    queryFn: () => getForecast(months),
    staleTime: Infinity,
    // Retry aggressively on 503 (cache still being populated after first startup)
    retry: (failureCount, err) => {
      if (is503(err)) return failureCount < 30; // up to 90 s
      return failureCount < 1;
    },
    retryDelay: (_count, err) => (is503(err) ? 3000 : 1000),
  });

  const balance = data ? parseFloat(data.account_balance as unknown as string) : null;
  const buckets = data ? bucketByMonth(data.entries, balance ?? 0) : [];

  if (isError && !isLoading) {
    const cacheEmpty = is503(error);
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <AlertCircle className="size-10 text-destructive" />
          <div>
            <p className="font-semibold text-foreground">
              {cacheEmpty ? "Data håller på att hämtas" : "Kunde inte ladda prognos"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {cacheEmpty
                ? "Vänta lite och försök igen — data hämtas från Wint API."
                : "Kontrollera att backend-tjänsten är igång."}
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="size-4" />
            Försök igen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <BalanceCard
        balance={balance}
        balanceSource={data?.balance_source ?? "api"}
        balanceUpdatedAt={data?.balance_updated_at ?? null}
        isLoading={isLoading}
      />
      <DataFreshness fetchedAt={data?.data_last_fetched_at ?? null} />
      <LiquidityChart data={buckets} isLoading={isLoading} />
      {!isLoading && <SummaryRow entries={data?.entries ?? []} />}
    </div>
  );
}
