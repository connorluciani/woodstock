/* Calendar dates without time zones. Every date is a Date at 12:00 UTC on that calendar day, and wall-clock
   times ("2026-11-09T08:47:00") are read as UTC, so results are the same on every phone and on the server.
   The prototype used local time; its figures equal these when run with TZ=UTC (scripts/oracle.cjs). */
import type { Ctx, DemoState } from "./types.ts";

export const DAY_MS = 864e5;
export const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
export const MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const WD3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** A calendar day at noon UTC. Month is 0-based; day overflow rolls like Date (day 0 is the last day of the month before). */
export function ymd(y: number, m0: number, d: number, h = 12, mi = 0, s = 0): Date {
  return new Date(Date.UTC(y, m0, d, h, mi, s));
}

/** "2026-11-20" (noon), "2026-11-09T08:47:00" (wall clock), a Date, or "Oct 23, 2026". Returns null when unreadable. */
export function parseDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : new Date(v.getTime());
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return ymd(+m[1]!, +m[2]! - 1, +m[3]!);
  m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(s);
  if (m) {
    if (m[7]) { const t = Date.parse(s); return Number.isNaN(t) ? null : new Date(t); }
    return ymd(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +(m[6] ?? 0));
  }
  m = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(s);
  if (m) {
    const mi = MON3.findIndex((x) => x.toLowerCase() === m![1]!.toLowerCase());
    if (mi >= 0) return ymd(+m[3]!, mi, +m[2]!);
  }
  return null;
}

/** Noon on the same calendar day. */
export function noon(d: Date): Date { return ymd(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
export function addDays(d: Date, n: number): Date { return new Date(d.getTime() + n * DAY_MS); }
export function daysInMonth(y: number, m0: number): number { return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate(); }
/** "2026-11-20" */
export function isoDate(d: Date): string {
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
}
/** Last day of a month, as "YYYY-MM-DD". */
export function monthEndIso(y: number, m0: number): string { return isoDate(ymd(y, m0 + 1, 0)); }

/** "Nov 20" */
export function fmtShort(d: Date): string { return MON3[d.getUTCMonth()] + " " + d.getUTCDate(); }
/** "Fri, Nov 20" */
export function fmtDay(d: Date): string { return WD3[d.getUTCDay()] + ", " + fmtShort(d); }
/** "November" */
export function fmtMonth(d: Date): string { return MONL[d.getUTCMonth()]!; }
/** "November 2026" */
export function fmtMonthYear(d: Date): string { return MONL[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
/** "Nov 2026" */
export function fmtMonY(d: Date): string { return MON3[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
/** "9:42 AM" */
export function fmtClock(d: Date): string {
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  return ((h % 12) || 12) + ":" + (m < 10 ? "0" : "") + m + " " + (h < 12 ? "AM" : "PM");
}
/** A goal's date as the prototype labels it: "June 2027", or "June 15, 2027" when it is not the 1st or the month end. */
export function labelBy(by: string | null | undefined): string {
  const d = parseDate(by);
  if (!d) return "No date";
  const last = daysInMonth(d.getUTCFullYear(), d.getUTCMonth());
  return d.getUTCDate() !== last && d.getUTCDate() !== 1 ? MONL[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear() : fmtMonthYear(d);
}

/** The demo's clock: state.today, else the real time. The only clock the engine reads (R2, R12). */
export function today(s?: Pick<DemoState, "today"> | null): Date {
  const d = parseDate(s && s.today);
  return d ?? new Date();
}
export function ctxOf(s?: Pick<DemoState, "today"> | null): Ctx { return { today: today(s) }; }
/** A stamp for activity rows at a given moment. */
export function stampAt(d: Date): { iso: string; date: string; time: string } {
  return { iso: d.toISOString().slice(0, 19), date: fmtShort(d), time: fmtClock(d) };
}
