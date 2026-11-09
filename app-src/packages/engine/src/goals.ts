/* Goals: which ones are live and paying, their accounts (FHSA yearly cap), status, pace and quick plans (R4). */
import type { Ctx, DemoState, Goal } from "./types.ts";
import { cad0 } from "./money.ts";
import { fmtMonth, fmtMonthYear, fmtShort, isoDate, parseDate, today } from "./dates.ts";
import { income, nextPayday, nextPaydays, nthPayday, paysUntil, ppyOf } from "./schedule.ts";
import { budget } from "./plan.ts";

export const GROUPS = [["safety", "Safety net", "shield"], ["near", "Near-term experiences", "plane"], ["milestones", "Major milestones", "home"], ["wealth", "Long-term wealth", "growth"]] as const;
export type GoalGroup = (typeof GROUPS)[number][0];

export function goalDone(g: Goal): boolean { return !!g.target && (Number(g.saved) || 0) >= Number(g.target); }
export function liveGoals(s: DemoState): Goal[] { return (s.goals || []).filter((g) => !g.archived); }
/** Goals that get money this payday: not paused, not done, with a per-pay amount. */
export function payingGoals(s: DemoState): Goal[] { return liveGoals(s).filter((g) => !g.paused && !goalDone(g) && (Number(g.perPay) || 0) > 0); }
export function goalById(s: DemoState, id: string): Goal | null { return (s.goals || []).find((g) => g.id === id) ?? null; }

export function goalGroup(g: Goal): GoalGroup {
  if (g.group) return g.group as GoalGroup;
  if (g.kind === "emergency") return "safety";
  if (g.kind === "home" || g.kind === "education") return "milestones";
  if (g.kind === "retirement" || g.kind === "invest" || g.invested) return "wealth";
  return "near";
}

/** Today's payday amount for a goal while the request waits (pending or sent): shown as on its way, never as saved. */
export function pendingFor(s: DemoState, g: Goal): number {
  const B = s.pendingBatch;
  if (!B || (B.status !== "pending" && B.status !== "sent")) return 0;
  const l = (B.goalLines || []).find((x) => x.goal === g.id);
  return l ? Number(l.amount) || 0 : 0;
}

/** The accounts a goal's per-pay amount goes to. A home goal's FHSA share never goes past the yearly limit per pay
    or the room left; the rest goes to her TFSA under the same goal (Engineer 2 audit, 15:05). */
export function goalAccounts(s: DemoState, g: Goal): { account: string; amount: number }[] {
  const amt = g.paused ? 0 : Number(g.perPay) || 0, acct = g.account || "TFSA";
  if (!g.invested || acct !== "FHSA" || amt <= 0) return [{ account: acct, amount: amt }];
  const cap = fhsaPerPayCap(s);
  const f = Math.min(amt, cap), r = Math.round((amt - f) * 100) / 100;
  return r > 0 ? [{ account: "FHSA", amount: f }, { account: "TFSA", amount: r }] : [{ account: "FHSA", amount: f }];
}

/** The most that can go to the FHSA on one payday: the yearly limit spread over her paydays, and never more than the room left. */
export function fhsaPerPayCap(s: DemoState): number {
  const a = s.accounts.find((x) => x.id === "FHSA" || x.type === "FHSA");
  const lim = Number(a && a.annualLimit) || 8000, room = a && a.roomLeft != null ? Number(a.roomLeft) : lim;
  return Math.max(0, Math.min(Math.floor(lim / ppyOf(income(s).freq)), Math.floor(room)));
}

/** What's left each payday after the plan's spending row and every new cash goal. The prototype's $550 default
    (production_plan 5.5 item 4) is replaced by the budget's flexible spending a pay when the plan has no row. */
export function payRoom(s: DemoState, ctx?: Ctx): { spend: number; added: number; left: number } {
  const P = s.plan || {}, row = (P.everyPayday || []).find((r) => r.id === "spend");
  const spend = row && Number(row.amount) ? Number(row.amount) : budget(s, ctx).leftPP;
  const added = (s.goals || []).reduce((t, g) => t + (g.isNew && !g.paused && !g.invested && g.kind !== "home" ? Number(g.perPay) || 0 : 0), 0);
  return { spend, added, left: spend - added };
}

export interface GoalStatus {
  pct: number; ok: boolean; word: string; line: string; neutral?: boolean;
  /** Machine-readable status for a copy table (R4 step 2). */
  code: "new_needs_more_than_pay" | "new_short" | "new_tight" | "new" | "new_no_amount" | "complete" | "at_target" | "on_hold" | "pace" | "long_term" | "paused" | "on_track" | "behind";
  params: Record<string, number | string | null>;
}

/** A goal's status, word and line, exactly as the prototype words them (money in today's request counts toward it). */
export function goalStatus(s: DemoState, g: Goal, ctx?: Ctx): GoalStatus {
  const c = ctx ?? { today: today(s) };
  const target = Number(g.target) || 0, savedRaw = Number(g.saved) || 0, saved = savedRaw + pendingFor(s, g), per = g.paused ? 0 : Number(g.perPay) || 0;
  const pct = target ? Math.max(0, Math.min(1, savedRaw / target)) : 0;
  const by = parseDate(g.by), n = g.by ? paysUntil(s, g.by, c) : 0;
  if (g.isNew && !saved && g.by && target && by) {
    const n0 = Math.max(1, n), need0 = Math.ceil(target / n0), pay0 = income(s, c).amount || (s.plan && s.plan.netPay) || 0;
    if (per * n + 0.5 < target) {
      return need0 > pay0
        ? { pct: 0, ok: false, word: "Needs a look", code: "new_needs_more_than_pay", params: { need: need0, pays: n }, line: "This needs about " + cad0(need0) + " a payday, more than your pay. A later date or a smaller amount would fit better." }
        : { pct: 0, ok: false, word: "Needs a look", code: "new_short", params: { perPay: per, atDate: per * n, need: need0, pays: n }, line: "At " + cad0(per) + " a payday you'd have about " + cad0(per * n) + " by " + fmtMonth(by) + ". About " + cad0(need0) + " a payday would get you there." };
    }
  }
  if (g.isNew && !saved) {
    const room = payRoom(s, c);
    if (room.left < 200 && (g.perPay || 0) > 0) return { pct: 0, ok: false, word: "Needs a look", code: "new_tight", params: { added: room.added, spend: room.spend }, line: "New goals use " + cad0(room.added) + " of the " + cad0(room.spend) + " a payday your plan leaves for spending. A later date or a smaller amount would leave more." };
    const np = nextPayday(s, c);
    return per
      ? { pct: 0, ok: true, word: "New", code: "new", params: { perPay: per, next: isoDate(np) }, line: "Starts with your next pay on " + fmtShort(np) + ": " + cad0(per) + " a payday." }
      : { pct: 0, ok: true, word: "New", code: "new_no_amount", params: {}, line: "Add a payday amount to start." };
  }
  if (target && saved >= target) {
    return g.kind === "emergency"
      ? { pct: 1, ok: true, word: "At your target", code: "at_target", params: { target }, line: "2 months of spending (" + cad0(target) + ")" }
      : { pct: 1, ok: true, word: "Complete", code: "complete", params: { target }, line: "You reached it." };
  }
  if (!g.by && !per && !goalDone(g)) return { pct, ok: true, word: "On hold", code: "on_hold", params: {}, line: "Not getting money right now. Add an amount in Pay yourself first." };
  if (!g.by && !target && per) {
    const monthly = Math.round(per * ppyOf(income(s, c).freq) / 12);
    return { pct, ok: true, neutral: true, word: cad0(monthly) + " a month", code: "pace", params: { monthly, saved: Math.round(savedRaw) }, line: cad0(Math.round(savedRaw)) + " saved · no target" };
  }
  if (!g.by) return { pct, ok: true, word: "On track", code: "long_term", params: { perPay: per }, line: g.statusLine || (per ? cad0(per) + " every payday. Long term." : "Long term.") };
  if (g.paused) return { pct, ok: false, word: "Paused", code: "paused", params: {}, line: "Deposits are paused. Turn them back on any time." };
  const proj = saved + per * n, byD = by ?? c.today;
  if (proj + 0.5 >= target) return { pct, ok: true, word: "On track", code: "on_track", params: { target, by: g.by, projected: proj }, line: "Reaches " + cad0(target) + " by " + fmtMonthYear(byD) + "." };
  const need = Math.ceil((target - saved) / Math.max(1, n));
  return { pct, ok: false, word: "A little behind", code: "behind", params: { short: target - proj, need, by: g.by }, line: "About " + cad0(target - proj) + " short by " + fmtMonth(byD) + ". " + cad0(need) + " a payday would close it." };
}

/** A small goal's pace: paydays to the date and the per-pay amount, rounded up to $5 (CR8 section 5). */
export function quickGoalPlan(s: DemoState, target: number, by: string, ctx?: Ctx): { n: number; perPay: number; dates: string[]; where: string } {
  const c = ctx ?? { today: today(s) };
  const n = Math.max(1, paysUntil(s, by, c)), per = Math.ceil(target / n / 5) * 5;
  return { n, perPay: per, dates: nextPaydays(s, Math.min(n, 3), c).map(fmtShort), where: "Questrade TFSA, savings fund" };
}

/** The payday a goal reaches its target at a per-pay amount, counting from her next payday. ISO date, or null when it never does. */
export function reachDate(s: DemoState, target: number, saved: number, perPay: number, ctx?: Ctx): string | null {
  const left = Math.max(0, (Number(target) || 0) - (Number(saved) || 0));
  const c = ctx ?? { today: today(s) };
  if (!left) return isoDate(nextPayday(s, c));
  if (!(perPay > 0)) return null;
  const d = nthPayday(s, Math.ceil(left / perPay), c);
  return d ? isoDate(d) : null;
}

/** The Pay yourself first control scales the goals' paces (D-20:52). amounts: { id: monthly }; fixed: goals she
    marked as fixed-date keep their pace. Whole dollars, total exact; `moved` lists fixed goals that had to change. */
export function scalePaces(amounts: Record<string, number>, target: number, fixed?: Record<string, boolean>): { amounts: Record<string, number>; ok: boolean; moved: string[] } {
  const ids = Object.keys(amounts || {}), out: Record<string, number> = {};
  let fixTot = 0, flexTot = 0;
  const isFixed = (id: string): boolean => !!(fixed && fixed[id]);
  ids.forEach((id) => { const v = Math.max(0, Number(amounts[id]) || 0); out[id] = v; if (isFixed(id)) fixTot += v; else flexTot += v; });
  const T = Math.max(0, Number(target) || 0), moved: string[] = [];
  if (T >= fixTot && flexTot > 0) { const k = (T - fixTot) / flexTot; ids.forEach((id) => { if (!isFixed(id)) out[id] = Math.round(out[id]! * k); }); }
  else if (flexTot === 0 && fixTot > 0) { const k2 = T / fixTot; ids.forEach((id) => { if (out[id]! > 0) { out[id] = Math.round(out[id]! * k2); moved.push(id); } }); }
  else if (T < fixTot) { const k3 = fixTot > 0 ? T / fixTot : 0; ids.forEach((id) => { if (isFixed(id)) { out[id] = Math.round(out[id]! * k3); if (k3 < 1) moved.push(id); } else out[id] = 0; }); }
  const sum = ids.reduce((t, id) => t + out[id]!, 0), last = ids.filter((id) => out[id]! > 0 && !isFixed(id)).pop();
  if (last && sum !== Math.round(T)) out[last] = Math.max(0, out[last]! + Math.round(T) - sum);
  return { amounts: out, ok: !moved.length, moved };
}

/** A goal by id, full name, or a clear reference ("the trip", "my house"). A person's name never picks a goal. */
export function findGoal(s: DemoState, ref: string | null | undefined): Goal | null {
  if (!ref) return null;
  const G = s.goals || [], r = String(ref).toLowerCase();
  return G.find((g) => g.id === ref) || G.find((g) => r.indexOf(String(g.name).toLowerCase()) >= 0) ||
    (/\b(ny|nyc|new york)\b|\b(the|my|our) (new york )?trip\b/.test(r) ? G.find((g) => /new york/i.test(g.name)) : undefined) ||
    (/\b(home|house|condo)\b/.test(r) ? G.find((g) => g.kind === "home") : undefined) ||
    (/\b(emergency|safety net|buffer)\b/.test(r) ? G.find((g) => g.kind === "emergency") : undefined) ||
    (/\btrips?\b/.test(r) ? G.find((g) => g.kind === "trip") : undefined) || null;
}

/** The goal of a kind, first in her list. */
export function goalOfKind(goals: Goal[], kind: string): Goal | undefined { return goals.find((g) => g.kind === kind); }
