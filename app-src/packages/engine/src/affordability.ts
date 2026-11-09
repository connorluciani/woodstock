/* Affordability as one decision (R8): Messages, Talk it through and Home all phrase this result; none computes
   its own. It replaces the Messages part's affordability() arithmetic and Talk's fallback copy in affordFor().
   An affordability answer only ever offers plan changes, never a trade (Compliance C2; policy.ts). */
import type { Ctx, DemoState, Goal } from "./types.ts";
import { isoDate, today, ymd } from "./dates.ts";
import { budget, type Budget } from "./plan.ts";
import { findGoal, quickGoalPlan } from "./goals.ts";
import { nextPaydays, paysUntil } from "./schedule.ts";

export type AffordMode = "less" | "catch" | "goal";
export interface AffordOption { mode: AffordMode; amount: number; goalId?: string }
export interface Affordability {
  verdict: "yes" | "conditional" | "no";
  amount: number;
  /** Left to spend this month before the purchase, and after it (yes only). */
  left: number; after: number | null;
  /** Dollars over what is left (conditional and no), rounded up. */
  over: number;
  /** Per day left after it, when her spending is running ahead of usual (yes only). */
  perDayAfter: number | null;
  options: AffordOption[];
  /** The alternative both surfaces offer: save up for it as a goal, by the end of next month. */
  saveUp: { target: number; by: string; perPay: number; n: number };
  asOf: string; monthEnd: string; flag: boolean;
  /** "usual_month": assumes the rest of the month looks like a usual month for her. */
  assumptions: "usual_month";
  budget: Budget;
}

/** A cash goal she could use part of: not invested, not her safety net, not in an FHSA or RRSP, with enough saved. */
function cashGoalFor(s: DemoState, over: number): Goal | undefined {
  return (s.goals || []).filter((g) => !g.invested && g.kind !== "emergency" && g.account !== "FHSA" && g.account !== "RRSP" && (Number(g.saved) || 0) >= over)[0];
}

/** Can she afford this amount this month? From her own budget, with an as-of date (CR9 06). */
export function affordability(s: DemoState, amount: number, ctx?: Ctx): Affordability {
  const c = ctx ?? { today: today(s) }, b = budget(s, c), left = b.leftNow, amt = Number(amount) || 0;
  const later = ymd(c.today.getUTCFullYear(), c.today.getUTCMonth() + 2, 0), lb = isoDate(later), qp = quickGoalPlan(s, Math.round(amt), lb, c);
  const base = { amount: amt, left, asOf: b.asOf, monthEnd: b.monthEnd, flag: b.flag, assumptions: "usual_month" as const, budget: b, saveUp: { target: Math.round(amt), by: lb, perPay: qp.perPay, n: qp.n } };
  if (amt <= left) {
    const after = left - amt;
    return { ...base, verdict: "yes", after, over: 0, perDayAfter: b.flag ? Math.max(0, after / b.daysLeft) : null, options: [] };
  }
  const over = Math.ceil(amt - Math.max(0, left));
  const options: AffordOption[] = [{ mode: "less", amount: over }, { mode: "catch", amount: over }];
  const cg = cashGoalFor(s, over);
  if (cg) options.push({ mode: "goal", amount: over, goalId: cg.id });
  const room = b.save + (cg ? Number(cg.saved) || 0 : 0);
  if (over > room + b.leftPP) return { ...base, verdict: "no", after: null, over, perDayAfter: null, options: [] };
  return { ...base, verdict: "conditional", after: null, over, perDayAfter: null, options };
}

/* ---------------- the three plan changes an affordability answer can offer (confirmed on a card) ---------------- */

export interface SpendLess { mode: "less"; amount: number; cuts: { id: string; cut: number }[]; cut: number; goalId: string; uncovered: number; pays: string[] }
export interface SpendCatch { mode: "catch"; amount: number; goalId: string; half: number; pays: string[] }
export interface SpendFromGoal { mode: "goal"; amount: number; goalId: string; savedAfter: number; newPer: number }

function liveList(s: DemoState): Goal[] { return s.goals || []; }

/** "Save less this pay": takes it from this pay's goal money, Investing for later and Retirement first, then cash goals, then the home. */
export function planSpendLess(s: DemoState, amount: number, ctx?: Ctx): SpendLess | null {
  const G = liveList(s);
  const ids = [G.find((x) => x.kind === "invest" && !x.paused), G.find((x) => x.kind === "retirement" && !x.paused)].concat(G.filter((x) => !x.invested && x.kind !== "emergency")).concat([G.find((x) => x.kind === "home")]);
  let need = amount; const cuts: { g: Goal; cut: number }[] = [];
  ids.forEach((g0) => {
    if (need <= 0 || !g0 || g0.paused || cuts.some((x) => x.g === g0)) return;
    const c0 = Math.min(need, Number(g0.perPay) || 0);
    if (c0 > 0) { cuts.push({ g: g0, cut: c0 }); need -= c0; }
  });
  if (!cuts.length) return null;
  return { mode: "less", amount, cuts: cuts.map((x) => ({ id: x.g.id, cut: x.cut })), cut: amount - Math.max(0, need), goalId: cuts[0]!.g.id, uncovered: Math.max(0, need), pays: nextPaydays(s, 3, ctx).map(isoDate) };
}

/** "Catch up over the next two pays": less on this pay, half more on each of the next two, from Investing for later. */
export function planSpendCatch(s: DemoState, amount: number, ctx?: Ctx): SpendCatch | null {
  const G = liveList(s);
  const flex = G.find((x) => x.kind === "invest" && !x.paused) || G.filter((x) => x.invested && !x.paused && (Number(x.perPay) || 0) > 0)[0];
  if (!flex) return null;
  return { mode: "catch", amount, goalId: flex.id, half: Math.ceil(amount / 2), pays: nextPaydays(s, 3, ctx).map(isoDate) };
}

/** "Use part of a cash goal's savings": the goal's payday amount goes up to stay on its date. */
export function planSpendFromGoal(s: DemoState, amount: number, goalRef: string, ctx?: Ctx): SpendFromGoal | null {
  const g = findGoal(s, goalRef);
  if (!g || g.invested || g.kind === "emergency" || g.account === "FHSA" || g.account === "RRSP") return null;
  const have = Number(g.saved) || 0; if (have < amount) return null;
  const n = paysUntil(s, g.by, ctx), need = n ? Math.ceil(((Number(g.target) || 0) - (have - amount)) / n / 5) * 5 : Number(g.perPay) || 0;
  return { mode: "goal", amount, goalId: g.id, savedAfter: have - amount, newPer: Math.max(need, Number(g.perPay) || 0) };
}
