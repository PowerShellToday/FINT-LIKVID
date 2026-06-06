import { useEffect, useState } from "react";
import { useBlocker } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { MonthPicker } from "@/components/settings/MonthPicker";
import { DeleteConfirm } from "@/components/settings/DeleteConfirm";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { WorkCalendar } from "@/components/calendar/WorkCalendar";
import {
  listFutureInvoices, createFutureInvoice, updateFutureInvoice, deleteFutureInvoice,
  listInvoiceCustomers, createInvoiceCustomer, updateInvoiceCustomer, deleteInvoiceCustomer,
  getInvoiceCustomerNames, computeInvoiceDate, getHolidays,
} from "@/api/client";
import { invalidateForecast } from "@/utils/queryKeys";
import { useForecast } from "@/context/ForecastContext";
import type {
  FutureInvoicePlanResponse,
  InvoiceCustomerCreate,
  InvoiceCustomerResponse,
} from "@/api/types";
import { formatSEK } from "@/utils/forecastTransform";

const RULE_LABELS: Record<string, string> = {
  last_day: "Sista dagen i månaden",
  last_working_day: "Sista arbetsdagen i månaden",
  first_day_next_month: "Första dagen nästa månad",
  first_working_day_next_month: "Första arbetsdagen nästa månad",
};

const SELECT_CLS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function addDays(dateStr: string, days: number): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, day + days));
  return d.toISOString().slice(0, 10);
}

function formatPlanMonth(planMonth: string): string {
  const [year, month] = planMonth.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  const label = d.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const now = new Date();
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

interface CustomerForm {
  name: string;
  hourly_rate: number;
  payment_delay_days: number;
  invoice_day_rule: string;
}

const EMPTY_CUSTOMER: CustomerForm = {
  name: "",
  hourly_rate: 0,
  payment_delay_days: 30,
  invoice_day_rule: "last_working_day",
};

interface PlanForm {
  plan_month: string;
  customer_id: number | null;
  billable_hours: number;
  hourly_rate: number;
  payment_delay_days: number;
  invoice_date: string; // fallback when no customer selected (editing old plans)
  day_fractions: string | null;
}

const EMPTY_PLAN: PlanForm = {
  plan_month: thisMonth,
  customer_id: null,
  billable_hours: 0,
  hourly_rate: 0,
  payment_delay_days: 30,
  invoice_date: "",
  day_fractions: null,
};

export function FutureInvoices() {
  const { months } = useForecast();
  const queryClient = useQueryClient();

  const [editingPlan, setEditingPlan] = useState<FutureInvoicePlanResponse | null>(null);
  const [addingPlan, setAddingPlan] = useState(false);
  const [planForm, setPlanForm] = useState<PlanForm>(EMPTY_PLAN);
  const [hoursManual, setHoursManual] = useState(false);

  const [editingCustomer, setEditingCustomer] = useState<InvoiceCustomerResponse | null>(null);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(EMPTY_CUSTOMER);

  const { data: plans, isLoading: plansLoading, isError: plansError, refetch } = useQuery({
    queryKey: ["future-invoices"],
    queryFn: listFutureInvoices,
  });
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["invoice-customers"],
    queryFn: listInvoiceCustomers,
  });
  const { data: customerNames } = useQuery({
    queryKey: ["invoice-customer-names"],
    queryFn: getInvoiceCustomerNames,
  });

  const selectedCustomer = customers?.find((c) => c.id === planForm.customer_id) ?? null;

  const planYear = parseInt(planForm.plan_month.slice(0, 4));
  const { data: holidays } = useQuery({
    queryKey: ["holidays", planYear],
    queryFn: () => getHolidays(planYear),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: computedDateData } = useQuery({
    queryKey: ["compute-date", planForm.plan_month, selectedCustomer?.invoice_day_rule],
    queryFn: () => computeInvoiceDate(planForm.plan_month, selectedCustomer!.invoice_day_rule),
    enabled: !!selectedCustomer,
  });

  const invoiceDate = computedDateData?.invoice_date || planForm.invoice_date;
  const previewAmount = (planForm.billable_hours || 0) * (planForm.hourly_rate || 0) * 1.25;
  const previewPayment = invoiceDate ? addDays(invoiceDate, planForm.payment_delay_days || 0) : "";

  // ── Plan mutations ────────────────────────────────────────────────────────────

  const afterPlanSave = () => {
    queryClient.invalidateQueries({ queryKey: ["future-invoices"] });
    invalidateForecast(queryClient, months);
    setAddingPlan(false);
    setEditingPlan(null);
    setPlanForm(EMPTY_PLAN);
    setHoursManual(false);
  };

  const planSaveMutation = useMutation({
    mutationFn: (f: Parameters<typeof createFutureInvoice>[0]) =>
      editingPlan ? updateFutureInvoice(editingPlan.id, f) : createFutureInvoice(f),
    onSuccess: afterPlanSave,
  });

  const planDeleteMutation = useMutation({
    mutationFn: deleteFutureInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["future-invoices"] });
      invalidateForecast(queryClient, months);
    },
  });

  // ── Customer mutations ────────────────────────────────────────────────────────

  const afterCustomerSave = () => {
    queryClient.invalidateQueries({ queryKey: ["invoice-customers"] });
    queryClient.invalidateQueries({ queryKey: ["invoice-customer-names"] });
    setAddingCustomer(false);
    setEditingCustomer(null);
    setCustomerForm(EMPTY_CUSTOMER);
  };

  const customerSaveMutation = useMutation({
    mutationFn: (f: CustomerForm) =>
      editingCustomer
        ? updateInvoiceCustomer(editingCustomer.id, f)
        : createInvoiceCustomer(f as InvoiceCustomerCreate),
    onSuccess: afterCustomerSave,
  });

  const customerDeleteMutation = useMutation({
    mutationFn: deleteInvoiceCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-customers"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-customer-names"] });
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const initAddPlan = () => {
    const auto = customers?.length === 1 ? customers[0] : null;
    setPlanForm({
      ...EMPTY_PLAN,
      customer_id: auto?.id ?? null,
      hourly_rate: auto ? Number(auto.hourly_rate) : 0,
      payment_delay_days: auto ? auto.payment_delay_days : 30,
    });
    setHoursManual(false);
    setAddingPlan(true);
  };

  const handlePlanSubmit = () => {
    if (!invoiceDate) return;
    planSaveMutation.mutate({
      plan_month: planForm.plan_month,
      billable_hours: planForm.billable_hours,
      hourly_rate: planForm.hourly_rate,
      invoice_date: invoiceDate,
      payment_delay_days: planForm.payment_delay_days,
      customer_id: planForm.customer_id,
      customer_name: selectedCustomer?.name ?? editingPlan?.customer_name ?? null,
      day_fractions: planForm.day_fractions,
    });
  };

  const onCustomerChange = (id: number | null) => {
    const customer = customers?.find((c) => c.id === id) ?? null;
    setPlanForm((prev) => ({
      ...prev,
      customer_id: id,
      hourly_rate: customer ? Number(customer.hourly_rate) : prev.hourly_rate,
      payment_delay_days: customer ? customer.payment_delay_days : prev.payment_delay_days,
    }));
  };

  const showPlanForm = addingPlan || editingPlan !== null;
  const showCustomerForm = addingCustomer || editingCustomer !== null;

  // Warn on in-app navigation away from an open plan form
  const blocker = useBlocker(showPlanForm);

  // Warn on tab close / browser refresh
  useEffect(() => {
    if (!showPlanForm) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [showPlanForm]);

  if (plansLoading || customersLoading) return <LoadingState />;
  if (plansError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Kunder ──────────────────────────────────────────────────────────── */}
      <SettingsCard
        title="Kunder"
        action={!showCustomerForm && (
          <Button
            size="sm"
            onClick={() => { setCustomerForm(EMPTY_CUSTOMER); setAddingCustomer(true); }}
            className="gap-1.5"
          >
            <Plus className="size-3.5" /> Lägg till kund
          </Button>
        )}
      >
        {showCustomerForm && (
          <form
            className="flex flex-col gap-3 mb-6 p-4 border rounded-lg bg-muted/30"
            onSubmit={(e) => { e.preventDefault(); customerSaveMutation.mutate(customerForm); }}
          >
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <Label>Kundnamn</Label>
                <Input
                  list="customer-name-suggestions"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="Ange kundnamn"
                  required
                />
                <datalist id="customer-name-suggestions">
                  {(customerNames ?? []).map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <Label>Timpris (kr)</Label>
                <Input
                  type="number"
                  min={0}
                  value={customerForm.hourly_rate}
                  onChange={(e) => setCustomerForm({ ...customerForm, hourly_rate: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <Label>Fakturadatum</Label>
                <select
                  className={SELECT_CLS}
                  value={customerForm.invoice_day_rule}
                  onChange={(e) => setCustomerForm({ ...customerForm, invoice_day_rule: e.target.value })}
                >
                  {Object.entries(RULE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <Label>Betalningstid (dagar)</Label>
                <Input
                  type="number"
                  min={0}
                  value={customerForm.payment_delay_days}
                  onChange={(e) => setCustomerForm({ ...customerForm, payment_delay_days: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setAddingCustomer(false); setEditingCustomer(null); }}
              >
                Avbryt
              </Button>
              <Button type="submit" size="sm" disabled={customerSaveMutation.isPending}>
                {customerSaveMutation.isPending ? "Sparar…" : "Spara"}
              </Button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-2">
          {(customers ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatSEK(Number(c.hourly_rate))}/tim
                  {" · "}{RULE_LABELS[c.invoice_day_rule] ?? c.invoice_day_rule}
                  {" · "}{c.payment_delay_days} dagars betalningstid
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => {
                    setEditingCustomer(c);
                    setCustomerForm({
                      name: c.name,
                      hourly_rate: Number(c.hourly_rate),
                      payment_delay_days: c.payment_delay_days,
                      invoice_day_rule: c.invoice_day_rule,
                    });
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <DeleteConfirm onConfirm={() => customerDeleteMutation.mutate(c.id)} />
              </div>
            </div>
          ))}
          {!customers?.length && (
            <p className="text-sm text-muted-foreground text-center py-4">Inga kunder tillagda</p>
          )}
        </div>
      </SettingsCard>

      {/* ── Planerade fakturor ───────────────────────────────────────────────── */}
      <SettingsCard
        title="Planerade fakturor"
        action={!showPlanForm && (
          <Button size="sm" onClick={initAddPlan} className="gap-1.5">
            <Plus className="size-3.5" /> Lägg till
          </Button>
        )}
      >
        {showPlanForm && (
          <form
            className="flex flex-col gap-3 mb-6 p-4 border rounded-lg bg-muted/30"
            onSubmit={(e) => { e.preventDefault(); handlePlanSubmit(); }}
          >
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <Label>Kund</Label>
                <select
                  className={SELECT_CLS}
                  value={planForm.customer_id ?? ""}
                  onChange={(e) => onCustomerChange(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Välj kund…</option>
                  {(customers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <Label>Månad</Label>
                <MonthPicker
                  value={planForm.plan_month}
                  onChange={(v) => { setPlanForm({ ...planForm, plan_month: v, day_fractions: null }); setHoursManual(false); }}
                />
              </div>
            </div>
            {/* Work calendar */}
            <div className="flex flex-col gap-1">
              <Label>Debiterbara dagar</Label>
              <WorkCalendar
                planMonth={planForm.plan_month}
                holidays={holidays ?? []}
                initialFractions={planForm.day_fractions ? JSON.parse(planForm.day_fractions) : undefined}
                onChange={(h, fracs) => {
                  if (!hoursManual) setPlanForm((p) => ({ ...p, billable_hours: h, day_fractions: JSON.stringify(fracs) }));
                }}
              />
            </div>

            {/* Hours + rate + delay row */}
            <div className="flex gap-3 items-end">
              <div className="flex flex-col gap-1">
                <Label>Timmar</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={planForm.billable_hours}
                    onChange={(e) => {
                      setPlanForm((p) => ({ ...p, billable_hours: parseFloat(e.target.value) || 0, day_fractions: null }));
                      setHoursManual(true);
                    }}
                    className="w-24"
                  />
                  {hoursManual && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Manuellt</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <Label>Timpris (kr)</Label>
                <Input
                  type="number"
                  min={0}
                  value={planForm.hourly_rate}
                  onChange={(e) => setPlanForm({ ...planForm, hourly_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <Label>Betalningstid (dagar)</Label>
                <Input
                  type="number"
                  min={0}
                  value={planForm.payment_delay_days}
                  onChange={(e) => setPlanForm({ ...planForm, payment_delay_days: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground bg-muted rounded px-3 py-2">
              {selectedCustomer && invoiceDate ? (
                <>
                  <strong>Fakturadatum:</strong> {invoiceDate}
                  {previewAmount > 0 && (
                    <> · <strong>Belopp inkl. moms:</strong> {formatSEK(previewAmount)}</>
                  )}
                  {previewPayment && (
                    <> · <strong>Förväntad betalning:</strong> {previewPayment}</>
                  )}
                </>
              ) : (
                <span>Välj en kund för att beräkna fakturadatum automatiskt.</span>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setAddingPlan(false); setEditingPlan(null); setPlanForm(EMPTY_PLAN); }}
              >
                Avbryt
              </Button>
              <Button type="submit" size="sm" disabled={planSaveMutation.isPending || !invoiceDate}>
                {planSaveMutation.isPending ? "Sparar…" : "Spara"}
              </Button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-2">
          {(plans ?? [])
            .slice()
            .sort((a, b) => a.plan_month.localeCompare(b.plan_month))
            .map((plan) => {
              const amount = Number(plan.billable_hours) * Number(plan.hourly_rate) * 1.25;
              const paymentDate = addDays(plan.invoice_date, Number(plan.payment_delay_days));
              return (
                <div key={plan.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{plan.customer_name || formatPlanMonth(plan.plan_month)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatPlanMonth(plan.plan_month)}
                      {" · "}{plan.billable_hours} tim
                      {" · "}{formatSEK(amount)} inkl. moms
                      {" · "}Betalning: {paymentDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => {
                        setEditingPlan(plan);
                        setPlanForm({
                          plan_month: plan.plan_month,
                          customer_id: plan.customer_id ?? null,
                          billable_hours: Number(plan.billable_hours),
                          hourly_rate: Number(plan.hourly_rate),
                          payment_delay_days: Number(plan.payment_delay_days),
                          invoice_date: plan.invoice_date,
                          day_fractions: plan.day_fractions ?? null,
                        });
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <DeleteConfirm onConfirm={() => planDeleteMutation.mutate(plan.id)} />
                  </div>
                </div>
              );
            })}
          {!plans?.length && (
            <p className="text-sm text-muted-foreground text-center py-4">Inga planerade fakturor</p>
          )}
        </div>
      </SettingsCard>

      {/* Unsaved changes warning */}
      <AlertDialog open={blocker.state === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Osparade ändringar</AlertDialogTitle>
            <AlertDialogDescription>
              Du har en faktura som inte sparats. Vill du lämna sidan och förlora ändringarna?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Stanna kvar</AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>Lämna sidan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
