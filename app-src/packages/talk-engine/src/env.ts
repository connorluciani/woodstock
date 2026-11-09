/* The bridge to @woodstock/engine: every figure Talk, the interview and the portfolio chat use comes from here.
   Dates are calendar days at 12:00 UTC (engine dates.ts), so replies are the same on every phone and on the server.
   Pure: functions take the state explicitly. */
import { budget as engineBudget, type Budget } from "../../engine/src/plan.ts";
import { cad0 as engineCad0, r10 as engineR10, num as engineNum } from "../../engine/src/money.ts";
import { MON3 as M3, MONL as ML, ymd, parseDate, isoDate, today as engineToday } from "../../engine/src/dates.ts";
import { income as engineIncome, ppyOf, FREQ_LABEL, paysUntil, nthPayday, nextPayday } from "../../engine/src/schedule.ts";
import { liveGoals as engineLive, goalDone as engineDone, goalStatus as engineStatus, pendingFor as enginePending, quickGoalPlan as engineQuick, findGoal as engineFind } from "../../engine/src/goals.ts";
import { goalPortfolio as engineGoalPf, targetPortfolio, holdYears as engineHoldYears } from "../../engine/src/portfolios.ts";
import { keepOpt as engineKeepOpt, KEEP_DEFAULT as ENGINE_KEEP_DEFAULT, applyKeepDefaults as engineKeepDefaults } from "../../engine/src/keep.ts";
import { applyPlanPerPay as enginePlanPerPay, applyPay as engineApplyPay } from "../../engine/src/plan.ts";
import { ASSUMPTIONS } from "../../engine/src/assumptions.ts";

export type AnyState = any; // the engine's DemoState / WSState; kept loose so the app and the server can both pass theirs
export type { Budget };
export const MON3: readonly string[] = M3;
export const MONL: readonly string[] = ML;
export { ymd, parseDate, isoDate, ASSUMPTIONS, FREQ_LABEL, ppyOf, targetPortfolio };

export const num = (v: unknown, d?: number): number => engineNum(v, d ?? 0);
export const cad0 = (n: unknown): string => engineCad0(n);
export const r10 = (n: number): number => engineR10(n);
export const today = (s: AnyState): Date => engineToday(s);
export const ctxOf = (s: AnyState) => ({ today: engineToday(s) });
export function budget(s: AnyState): Budget | null { try { return engineBudget(s, ctxOf(s)); } catch { return null; } }
export function income(s: AnyState): any { return engineIncome(s, ctxOf(s)); }
export function liveGoals(s: AnyState): any[] { return engineLive(s); }
export function goalDone(g: any): boolean { return engineDone(g); }
export function goalOk(s: AnyState, g: any): boolean { try { return engineStatus(s, g, ctxOf(s)).ok; } catch { return true; } }
export function pendingFor(s: AnyState, g: any): number { try { return enginePending(s, g); } catch { return 0; } }
export function quickGoalPlan(s: AnyState, target: number, by: string): { n: number; perPay: number } { return engineQuick(s, target, by, ctxOf(s)); }
export function findGoalRef(s: AnyState, ref: string): any { return engineFind(s, ref); }
export function goalPortfolio(s: AnyState, g: any): any { return engineGoalPf(s, g); }
export function holdYears(p: any): number | null { return engineHoldYears(p); }
export function keepOpt(id: string): any { return engineKeepOpt(id); }
export const KEEP_DEFAULT = ENGINE_KEEP_DEFAULT;
export function applyKeepDefaults(s: AnyState): void { engineKeepDefaults(s, ctxOf(s)); }
export function applyPlanPerPay(s: AnyState): void { try { enginePlanPerPay(s); } catch { /* plan split is the engine's; a missing plan block is fine */ } }
export function applyPay(s: AnyState, amount: number): void { engineApplyPay(s, amount); }
/** Paydays from her next one up to and including `by` (at least 1). */
export function paydaysTo(s: AnyState, by: string): number { return Math.max(1, paysUntil(s, by, ctxOf(s))); }
/** The n-th payday from her next one (n = 1 is the next payday). */
export function payDate(s: AnyState, n: number): Date { return nthPayday(s, Math.max(1, Math.round(n)), ctxOf(s)) || nextPayday(s, ctxOf(s)); }
export function nextPay(s: AnyState): Date { return nextPayday(s, ctxOf(s)); }
export function monthEnd(y: number, mo: number): Date { return ymd(y, mo + 1, 0); }
export function iso(d: Date): string { return isoDate(d); }
export function monY(v: unknown): string { const d = parseDate(v); return d ? MON3[d.getUTCMonth()] + " " + d.getUTCFullYear() : ""; }
export function monYL(v: unknown): string { const d = parseDate(v); return d ? MONL[d.getUTCMonth()] + " " + d.getUTCFullYear() : ""; }
export function labelBy(by: unknown): string { const d = parseDate(by); return d ? MONL[d.getUTCMonth()] + " " + d.getUTCFullYear() : "No date"; }
