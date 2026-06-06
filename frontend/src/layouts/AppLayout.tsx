import { Outlet } from "react-router-dom";
import { TopBar } from "@/components/TopBar";

export function AppLayout() {
  return (
    <div className="min-h-svh flex flex-col">
      <TopBar />
      <main className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
