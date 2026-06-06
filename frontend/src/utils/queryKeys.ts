import type { QueryClient } from "@tanstack/react-query";

export const FORECAST_KEY = (months: number) => ["forecast", months] as const;

export const invalidateForecast = (client: QueryClient, months: number) =>
  client.invalidateQueries({ queryKey: FORECAST_KEY(months) });
