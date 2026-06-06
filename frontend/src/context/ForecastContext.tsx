import { createContext, useContext, useState } from "react";

interface ForecastContextValue {
  months: number;
  setMonths: (n: number) => void;
}

const ForecastContext = createContext<ForecastContextValue | null>(null);

export function ForecastProvider({
  defaultMonths,
  children,
}: {
  defaultMonths: number;
  children: React.ReactNode;
}) {
  const [months, setMonths] = useState(defaultMonths);
  return (
    <ForecastContext.Provider value={{ months, setMonths }}>
      {children}
    </ForecastContext.Provider>
  );
}

export function useForecast() {
  const ctx = useContext(ForecastContext);
  if (!ctx) throw new Error("useForecast must be used within ForecastProvider");
  return ctx;
}
