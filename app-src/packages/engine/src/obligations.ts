/* Bills and debt payments (CR9 03, CR8 s2): monthly equivalents and next due dates. */
import type { Bill, BillFreq, Ctx, DemoState } from "./types.ts";
import { DAY_MS, daysInMonth, today, ymd } from "./dates.ts";

export const BILL_FREQ: Record<BillFreq, number> = { weekly: 52 / 12, biweekly: 26 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
export const BILL_FREQ_LABEL: Record<BillFreq, string> = { weekly: "a week", biweekly: "every two weeks", monthly: "a month", quarterly: "every 3 months", yearly: "a year" };
export const BILL_CATS = ["Housing", "Utilities", "Phone and internet", "Subscriptions", "Insurance", "Debt", "Transportation", "Other"] as const;

/** Monthly multiplier for a bill frequency. */
export function billFactor(freq: string | undefined): number { return BILL_FREQ[(freq || "monthly") as BillFreq] || 1; }
/** A bill of any frequency as a monthly amount. */
export function billMonthly(b: Pick<Bill, "amount" | "freq">): number { return (Number(b.amount) || 0) * billFactor(b.freq); }
/** Bills she has not removed. */
export function activeBills(s: DemoState): Bill[] { return (s.bills || []).filter((b) => b.status !== "removed"); }
export function isDebt(b: Bill): boolean { return b.category === "Debt"; }

/** The next date a bill is due, from today. */
export function nextDue(b: Bill, ctx: Ctx): Date {
  const t = ctx.today, y = t.getUTCFullYear(), mo = t.getUTCMonth(), day = b.day || 1;
  let d: Date;
  if (b.freq === "yearly") { d = ymd(y, (b.month || 1) - 1, day); if (d < t) d = ymd(y + 1, (b.month || 1) - 1, day); return d; }
  if (b.freq === "quarterly") { d = ymd(y, (b.month || mo + 1) - 1, day); while (d < t) d = ymd(d.getUTCFullYear(), d.getUTCMonth() + 3, day); return d; }
  if (b.freq === "weekly" || b.freq === "biweekly") return new Date(t.getTime() + DAY_MS * 3);
  d = ymd(y, mo, Math.min(day, 28) === day ? day : Math.min(day, daysInMonth(y, mo)));
  if (d < t) d = ymd(y, mo + 1, Math.min(day, daysInMonth(y, mo + 1)));
  return d;
}

/** Bills due in the next `days` days, soonest first. */
export function upcomingBills(s: DemoState, days = 30, ctx?: Ctx): { bill: Bill; date: Date }[] {
  const c = ctx ?? { today: today(s) }, end = new Date(c.today.getTime() + days * DAY_MS);
  return activeBills(s).map((bill) => ({ bill, date: nextDue(bill, c) })).filter((u) => u.date <= end).sort((a, b) => a.date.getTime() - b.date.getTime());
}
