import { useEffect, useMemo, useRef, useState } from "react";
import type { HolidayEntry } from "@/api/types";

type DayFraction = 0 | 0.25 | 0.5 | 0.75 | 1;

const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

interface ContextMenu {
  x: number;
  y: number;
  dateStr: string;
}

interface WorkCalendarProps {
  planMonth: string; // "YYYY-MM-DD"
  holidays: HolidayEntry[];
  initialFractions?: Record<string, number>;
  onChange: (hours: number, fractions: Record<string, DayFraction>) => void;
}

function buildDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ISO 8601 week number (Swedish standard: Mon-start, week 1 = first Thursday)
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7; // 1=Mon … 7=Sun
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek); // shift to Thursday of this week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function initFractions(
  year: number,
  month: number,
  holidaySet: Set<string>,
): Record<string, DayFraction> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const result: Record<string, DayFraction> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = buildDateStr(year, month, d);
    const dow = new Date(year, month - 1, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    result[dateStr] = isWeekend || holidaySet.has(dateStr) ? 0 : 1;
  }
  return result;
}

function computeHours(fractions: Record<string, DayFraction>): number {
  return Object.values(fractions).reduce<number>((sum, f) => sum + f * 8, 0);
}

// ── Fill circle ──────────────────────────────────────────────────────────────
function FillCircle({ fraction, borderCls }: { fraction: DayFraction; borderCls: string }) {
  const pct = `${fraction * 100}%`;
  const bg =
    fraction === 0 ? "white"
    : fraction === 1 ? "#3b82f6"
    : `conic-gradient(#3b82f6 0% ${pct}, white ${pct} 100%)`;
  return (
    <div
      className={`w-6 h-6 rounded-full border-2 ${borderCls}`}
      style={{ background: bg }}
    />
  );
}

export function WorkCalendar({ planMonth, holidays, initialFractions, onChange }: WorkCalendarProps) {
  const [year, month] = planMonth.split("-").map(Number);

  const holidayKey = holidays.map((h) => h.date).sort().join(",");
  const holidayMap = useMemo(
    () => Object.fromEntries(holidays.map((h) => [h.date, h.name])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [holidayKey],
  );
  const holidaySet = useMemo(
    () => new Set(holidays.map((h) => h.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [holidayKey],
  );

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  const [fractions, setFractions] = useState<Record<string, DayFraction>>(() =>
    initialFractions
      ? (initialFractions as Record<string, DayFraction>)
      : initFractions(year, month, holidaySet),
  );
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const next = initialFractions
      ? (initialFractions as Record<string, DayFraction>)
      : initFractions(year, month, holidaySet);
    setFractions(next);
    onChangeRef.current(computeHours(next), next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planMonth, holidayKey]);

  const isMountEffect = useRef(true);
  useEffect(() => {
    if (isMountEffect.current) { isMountEffect.current = false; return; }
    onChangeRef.current(computeHours(fractions), fractions);
  }, [fractions]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  const setFraction = (dateStr: string, fraction: DayFraction) => {
    setFractions((prev) => ({ ...prev, [dateStr]: fraction }));
    setContextMenu(null);
  };

  const handleClick = (dateStr: string) => {
    const cur = fractions[dateStr] ?? 1;
    setFraction(dateStr, cur === 0 ? 1 : 0);
  };

  const handleContextMenu = (e: React.MouseEvent, dateStr: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, dateStr });
  };

  // ── Week toggle ───────────────────────────────────────────────────────────────
  // Toggles all standard workdays in a week (weekdays that are not holidays).
  // If all are on → all off. Otherwise → all on.
  const handleWeekClick = (weekDays: Array<{ dateStr: string; dayNum: number } | null>) => {
    const workdays = weekDays.filter((d): d is { dateStr: string; dayNum: number } => {
      if (!d) return false;
      const dow = new Date(year, month - 1, d.dayNum).getDay();
      return dow !== 0 && dow !== 6 && !holidaySet.has(d.dateStr);
    });
    if (workdays.length === 0) return;
    const allOn = workdays.every((d) => (fractions[d.dateStr] ?? 1) > 0);
    const next: DayFraction = allOn ? 0 : 1;
    setFractions((prev) => {
      const updated = { ...prev };
      for (const d of workdays) updated[d.dateStr] = next;
      return updated;
    });
  };

  // ── Grid construction ─────────────────────────────────────────────────────────
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const leadingBlanks = firstDow === 0 ? 6 : firstDow - 1;

  type DayCell = { dateStr: string; dayNum: number } | null;

  const flat: DayCell[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      dateStr: buildDateStr(year, month, i + 1),
      dayNum: i + 1,
    })),
  ];
  while (flat.length % 7 !== 0) flat.push(null);

  // Group into week rows; week number derived from the Monday of each row
  const firstMonday = new Date(year, month - 1, 1 - leadingBlanks);
  const weeks = Array.from({ length: flat.length / 7 }, (_, wi) => {
    const monday = new Date(firstMonday);
    monday.setDate(firstMonday.getDate() + wi * 7);
    return {
      weekNum: isoWeekNumber(monday),
      days: flat.slice(wi * 7, wi * 7 + 7) as DayCell[],
    };
  });

  const totalHours = computeHours(fractions);
  const workDays = Object.values(fractions).filter((f) => f > 0).length;

  return (
    <div className="flex flex-col gap-2">
      {/* Header: week-col + weekdays */}
      <div className="grid grid-cols-8">
        <div className="text-center text-xs font-medium py-1 text-muted-foreground">V</div>
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`text-center text-xs font-medium py-1 ${i >= 5 ? "text-muted-foreground" : "text-foreground"}`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-8 gap-px border rounded-lg overflow-hidden bg-border">
        {weeks.map(({ weekNum, days }) => (
          <>
            {/* Week number cell */}
            <div
              key={`w${weekNum}-${days.find(Boolean)?.dateStr ?? weekNum}`}
              className="bg-background h-12 flex items-center justify-center cursor-pointer select-none hover:bg-muted/60 transition-colors group/week"
              onClick={() => handleWeekClick(days)}
              title="Klicka för att toggla veckan"
            >
              <span className="text-[10px] font-semibold text-muted-foreground group-hover/week:text-foreground transition-colors">
                {weekNum}
              </span>
            </div>

            {/* Day cells */}
            {days.map((cell, di) => {
              if (!cell) {
                return <div key={`blank-${weekNum}-${di}`} className="bg-background h-12" />;
              }

              const { dateStr, dayNum } = cell;
              const dow = new Date(year, month - 1, dayNum).getDay();
              const isSat = dow === 6;
              const isSun = dow === 0;
              const isHoliday = holidaySet.has(dateStr);
              const fraction = fractions[dateStr] ?? 1;

              const numCls = (isHoliday || isSun)
                ? "text-red-500"
                : isSat
                  ? "text-muted-foreground"
                  : "text-foreground";

              const borderCls = isHoliday
                ? "border-red-300"
                : (isSat || isSun)
                  ? "border-gray-200"
                  : fraction > 0
                    ? "border-blue-400"
                    : "border-gray-300";

              return (
                <div
                  key={dateStr}
                  className="relative bg-background h-12 flex flex-col items-center justify-center cursor-pointer select-none group"
                  onClick={() => handleClick(dateStr)}
                  onContextMenu={(e) => handleContextMenu(e, dateStr)}
                >
                  <span className={`absolute top-1 left-1.5 text-[10px] leading-none ${numCls}`}>
                    {dayNum}
                  </span>

                  <FillCircle fraction={fraction} borderCls={borderCls} />

                  {isHoliday && (
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 pointer-events-none">
                      {holidayMap[dateStr]}
                    </span>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground text-right">
        {workDays} dag{workDays !== 1 ? "ar" : ""} · {totalHours} timmar
      </p>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-popover text-popover-foreground border rounded-lg shadow-lg py-1 text-sm min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {([
            [1, "Hel dag (8h)"],
            [0.75, "¾ dag (6h)"],
            [0.5, "½ dag (4h)"],
            [0.25, "¼ dag (2h)"],
            [0, "Ledig"],
          ] as [DayFraction, string][]).map(([f, label]) => {
            const cur = fractions[contextMenu.dateStr] ?? 1;
            return (
              <button
                key={f}
                className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                onClick={() => setFraction(contextMenu.dateStr, f)}
              >
                <span className="w-3 text-center text-xs">{cur === f ? "✓" : ""}</span>
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
