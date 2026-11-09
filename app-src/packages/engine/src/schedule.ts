/* The pay schedule: the one payday calculation (R2). It replaces the prototype's four: core paysUntil, paydaysTo
   and payDates (steps of 365.25/26 days), Messages payLeft and payDatesN (fixed Nov 20 and 14 days), perPayIn
   (12/26 whatever her frequency), E.reachDate (365.25/26 steps), and the projection module's payDates, whose
   calendar rules are kept here: every 7 or 14 days, the 15th and the last day for twice a month, the same date
   each month. For biweekly pay (the demo) every count equals the prototype's. */
import type { Ctx, DemoState, Freq, Income } from "./types.ts";
import { DAY_MS, daysInMonth, isoDate, noon, parseDate, today, ymd } from "./dates.ts";

export const PPY: Record<Freq, number> = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };
export const FREQ_LABEL: Record<Freq, string> = { weekly: "every week", biweekly: "every two weeks", semimonthly: "twice a month", monthly: "every month" };

/** Paydays a year for a frequency (26 when unknown, as in the prototype). */
export function ppyOf(freq: string | undefined): number { return PPY[freq as Freq] || 26; }

/** Her income with defaults filled in, without writing to the state (the prototype's income() wrote them). */
export function income(s: DemoState, ctx?: Ctx): Income {
  const I = s.income;
  const base: Income = I ? { ...I } : { amount: (s.plan && s.plan.netPay) || 0, freq: "biweekly", next: isoDate((ctx ?? { today: today(s) }).today) };
  if (!base.other) base.other = [];
  if (!base.basis) base.basis = "after";
  return base;
}

/** Writes the defaults income() returns into the state (the prototype did this at boot). */
export function applyIncomeDefaults(s: DemoState, ctx?: Ctx): Income {
  if (!s.income) s.income = income(s, ctx);
  if (!s.income.other) s.income.other = [];
  if (!s.income.basis) s.income.basis = "after";
  return s.income;
}

/** Paydays from `from` to `until` (inclusive), for a pay schedule that starts at income.next. */
export function payDates(I: Pick<Income, "freq" | "next">, from: Date, until: Date, max = 2000): Date[] {
  const f = I.freq || "biweekly", out: Date[] = [];
  const d = parseDate(I.next) ?? noon(from);
  let guard = 0;
  if (f === "semimonthly") {
    let y = d.getUTCFullYear(), m = d.getUTCMonth();
    while (out.length < max && guard++ < 5000) {
      for (const day of [15, daysInMonth(y, m)]) {
        const x = ymd(y, m, day);
        if (x >= d && x >= from && x <= until && out.length < max) out.push(x);
      }
      m++; if (m > 11) { m = 0; y++; }
      if (ymd(y, m, 1, 0) > until) break;
    }
    return out;
  }
  if (f === "monthly") {
    for (let i = 0; i < max && guard++ < 5000; i++) {
      const y = d.getUTCFullYear(), m = d.getUTCMonth() + i;
      const x = ymd(y, m, Math.min(d.getUTCDate(), daysInMonth(y, m)));
      if (x > until) break;
      if (x >= from) out.push(x);
    }
    return out;
  }
  const step = (f === "weekly" ? 7 : 14) * DAY_MS;
  for (let t = d.getTime(); t <= until.getTime() && out.length < max && guard++ < 5000; t += step) {
    const z = noon(new Date(t));
    if (z >= from) out.push(z);
  }
  return out;
}

const FAR = (d: Date): Date => ymd(d.getUTCFullYear() + 60, 0, 1);

/** Her next payday on or after today. */
export function nextPayday(s: DemoState, ctx?: Ctx): Date {
  const c = ctx ?? { today: today(s) }, I = income(s, c);
  return payDates(I, noon(c.today), FAR(c.today), 1)[0] ?? noon(c.today);
}

/** The first n paydays from her next one. */
export function nextPaydays(s: DemoState, n: number, ctx?: Ctx): Date[] {
  const c = ctx ?? { today: today(s) };
  return payDates(income(s, c), noon(c.today), FAR(c.today), n);
}

/** Paydays from her next one up to and including `by` (0 when `by` is before it). */
export function paysUntil(s: DemoState, by: string | Date | null | undefined, ctx?: Ctx): number {
  const end = parseDate(by);
  if (!end) return 0;
  const c = ctx ?? { today: today(s) };
  return payDates(income(s, c), noon(c.today), end).length;
}

/** The n-th payday from her next one (n = 1 is the next payday). */
export function nthPayday(s: DemoState, n: number, ctx?: Ctx): Date | null {
  if (!(n >= 1)) return null;
  return nextPaydays(s, n, ctx)[n - 1] ?? null;
}

/** A monthly amount as a per-pay amount at her frequency, and back. */
export function perPayFromMonthly(s: DemoState, monthly: number): number { return monthly * 12 / ppyOf(s.income && s.income.freq); }
export function monthlyFromPerPay(s: DemoState, perPay: number): number { return perPay * ppyOf(s.income && s.income.freq) / 12; }
