import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Menu, Home, Calendar, Repeat, FilePlus, Wallet, Receipt, TrendingDown, HelpCircle, Settings, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { postLogout, getAuthStatus } from "@/api/auth";

const NAV_ITEMS = [
  { label: "Instrumentpanel", icon: Home, path: "/" },
  { label: "Detaljer & händelser", icon: Calendar, path: "/details" },
  { label: "Återkommande fakturor", icon: Repeat, path: "/recurring" },
  { label: "Planerade fakturor", icon: FilePlus, path: "/future-invoices" },
  { label: "Lön & skatt", icon: Wallet, path: "/salary" },
  { label: "Engångskostnader", icon: Receipt, path: "/expenses" },
  { label: "Löpande kostnader", icon: TrendingDown, path: "/periodic" },
];

const BOTTOM_ITEMS = [
  { label: "Inställningar", icon: Settings, path: "/settings" },
  { label: "Hjälp", icon: HelpCircle, path: "/help" },
];

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: authStatus } = useQuery({ queryKey: ["auth-status"], queryFn: getAuthStatus, staleTime: 60_000 });

  async function handleLogout() {
    await postLogout();
    setOpen(false);
    window.dispatchEvent(new Event("auth:expired"));
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Öppna meny">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72" aria-label="Navigation">
        <SheetHeader>
          <SheetTitle className="text-left text-primary">Fint Likvid</SheetTitle>
        </SheetHeader>
        <Separator className="my-4" />
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => { navigate(path); setOpen(false); }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            >
              <Icon className="size-4 text-muted-foreground" />
              {label}
            </button>
          ))}
          <Separator className="my-2" />
          {BOTTOM_ITEMS.map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => { navigate(path); setOpen(false); }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            >
              <Icon className="size-4 text-muted-foreground" />
              {label}
            </button>
          ))}
          {authStatus?.auth_enabled && (
            <>
              <Separator className="my-2" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors text-muted-foreground"
              >
                <LogOut className="size-4" />
                Logga ut
              </button>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
