import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { triggerCacheRefresh } from "@/api/client";
import { invalidateForecast } from "@/utils/queryKeys";
import { useForecast } from "@/context/ForecastContext";

interface DataFreshnessProps {
  fetchedAt: string | null;
}

function formatTimestamp(iso: string): string {
  return new Date(iso + "Z").toLocaleString("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Stockholm",
  });
}

export function DataFreshness({ fetchedAt }: DataFreshnessProps) {
  const { months } = useForecast();
  const queryClient = useQueryClient();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: triggerCacheRefresh,
    onSuccess: () => invalidateForecast(queryClient, months),
  });

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground py-2 px-1">
      <span>
        {fetchedAt
          ? `Senast uppdaterad: ${formatTimestamp(fetchedAt)}`
          : "Data ej tillgänglig"}
        {isError && (
          <span className="ml-2 text-destructive">
            Uppdatering misslyckades — kontrollera anslutningen.
          </span>
        )}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => mutate()}
        disabled={isPending}
        className="gap-2"
      >
        <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
        Uppdatera nu
      </Button>
    </div>
  );
}
