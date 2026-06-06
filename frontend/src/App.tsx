import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { ConfigProvider, useConfig } from "@/context/ConfigContext";
import { ForecastProvider } from "@/context/ForecastContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Dashboard } from "@/pages/Dashboard";
import { Details } from "@/pages/Details";
import { RecurringInvoices } from "@/pages/RecurringInvoices";
import { FutureInvoices } from "@/pages/FutureInvoices";
import { SalarySettings } from "@/pages/SalarySettings";
import { OneOffExpenses } from "@/pages/OneOffExpenses";
import { Help } from "@/pages/Help";
import { PeriodicExpenses } from "@/pages/PeriodicExpenses";
import { AppSettings } from "@/pages/AppSettings";
import { SetupWizard } from "@/pages/SetupWizard";
import { LoginPage } from "@/pages/LoginPage";
import { getAuthStatus } from "@/api/auth";
import { getHolidays } from "@/api/client";

const HOLIDAY_CACHE_OPTIONS = { staleTime: Infinity, gcTime: Infinity } as const;

const queryClient = new QueryClient();

function prefetchHolidays() {
  const year = new Date().getFullYear();
  for (let i = 0; i < 4; i++) {
    queryClient.prefetchQuery({
      queryKey: ["holidays", year + i],
      queryFn: () => getHolidays(year + i),
      ...HOLIDAY_CACHE_OPTIONS,
    });
  }
}

function AppRoutes() {
  const config = useConfig();
  // Router created once; config is stable after ConfigProvider resolves
  const [router] = useState(() =>
    createBrowserRouter([
      {
        element: (
          <ForecastProvider defaultMonths={config.defaultForecastMonths}>
            <AppLayout />
          </ForecastProvider>
        ),
        children: [
          { index: true, element: <Dashboard /> },
          { path: "details", element: <Details /> },
          { path: "recurring", element: <RecurringInvoices /> },
          { path: "future-invoices", element: <FutureInvoices /> },
          { path: "salary", element: <SalarySettings /> },
          { path: "expenses", element: <OneOffExpenses /> },
          { path: "periodic", element: <PeriodicExpenses /> },
          { path: "help", element: <Help /> },
          { path: "settings", element: <AppSettings /> },
        ],
      },
    ]),
  );
  return <RouterProvider router={router} />;
}

type Status = "loading" | "setup" | "login" | "ready";

async function fetchSetupStatus(retries = 8, delayMs = 1500): Promise<{ configured: boolean; auth_enabled: boolean } | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch("/api/setup/status");
      if (res.ok) return res.json();
    } catch {
      // network/502 — backend still starting
    }
    if (i < retries - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return null; // backend unreachable after all retries
}

function AppGate() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    async function init() {
      const setup = await fetchSetupStatus();
      if (!setup) {
        // Backend unreachable after retries — show a reload prompt rather than the setup wizard
        setStatus("setup");
        return;
      }
      if (!setup.configured) {
        setStatus("setup");
        return;
      }
      try {
        const auth = await getAuthStatus();
        if (auth.auth_enabled && !auth.authenticated) {
          setStatus("login");
          return;
        }
      } catch {
        // auth check failed — proceed to app anyway (auth middleware will 401 if needed)
      }
      setStatus("ready");
      prefetchHolidays();
    }
    init();
  }, []);

  useEffect(() => {
    function onExpired() {
      setStatus("login");
    }
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Laddar…
      </div>
    );
  }

  if (status === "setup") {
    return <SetupWizard onComplete={() => setStatus("ready")} />;
  }

  if (status === "login") {
    return <LoginPage onLogin={() => { setStatus("ready"); prefetchHolidays(); }} />;
  }

  return (
    <ConfigProvider>
      <AppRoutes />
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppGate />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
