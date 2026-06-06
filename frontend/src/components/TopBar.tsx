import { useNavigate, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HamburgerMenu } from "./HamburgerMenu";
import { useForecast } from "@/context/ForecastContext";
import { useConfig } from "@/context/ConfigContext";

export function TopBar() {
  const { months, setMonths } = useForecast();
  const { maxForecastMonths } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b bg-card shadow-sm">
      <div className="flex h-14 items-center justify-between px-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <HamburgerMenu />
          {!isHome && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} title="Hem">
              <Home className="size-4" />
            </Button>
          )}
          <span className="font-semibold text-primary text-lg tracking-tight">Fint Likvid</span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="forecast-months" className="text-sm text-muted-foreground hidden sm:block">
            Prognos:
          </label>
          <select
            id="forecast-months"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {Array.from({ length: maxForecastMonths }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m} {m === 1 ? "månad" : "månader"}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
