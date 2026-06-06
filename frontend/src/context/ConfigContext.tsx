import { createContext, useContext, useEffect, useState } from "react";

export interface AppConfig {
  defaultForecastMonths: number;
  maxForecastMonths: number;
  currency: string;
}

const ConfigContext = createContext<AppConfig | null>(null);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) =>
        setConfig({
          defaultForecastMonths: data.default_forecast_months,
          maxForecastMonths: data.max_forecast_months,
          currency: data.currency,
        })
      )
      .catch(() =>
        setConfig({ defaultForecastMonths: 6, maxForecastMonths: 24, currency: "SEK" })
      );
  }, []);

  if (!config) return null;

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useConfig(): AppConfig {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
