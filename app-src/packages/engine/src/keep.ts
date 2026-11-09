/* Where short-term goal money is kept (CR8 s6 and s11, Directive 18:25 item 3). Same list and order for everyone. */
import type { Ctx, DemoState, Fund, Goal } from "./types.ts";
import { DAY_MS, parseDate, today } from "./dates.ts";

export interface KeepOption { id: string; name: string; line: string; moves: 0 | 1 | 2; fund: Fund | null; gic?: boolean }

export const KEEP: readonly KeepOption[] = [
  { id: "tfsa_cash", name: "Cash in your TFSA", line: "Uninvested. Doesn't move. May earn no interest at Questrade.", moves: 0, fund: null },
  { id: "savings_fund", name: "Savings fund (high-interest savings ETF)", line: "Holds bank deposits. Its price moves very little, and the interest rate can change. Not covered by CDIC.", moves: 1, fund: { ticker: "CASH", name: "Global X High Interest Savings ETF", issuer: "Global X", fee: "about 0.11%", price: 50.02, out: "Sell any trading day; the cash settles in about a day." } },
  { id: "money_market", name: "Money market fund", line: "Short loans to governments and companies. Moves very little. Not guaranteed. Not covered by CDIC.", moves: 1, fund: { ticker: "ZMMK", name: "BMO Money Market Fund ETF Series", issuer: "BMO Global Asset Management", fee: "about 0.13%", price: 50.0, out: "Sell any trading day; the cash settles in about a day." } },
  { id: "gic", name: "GIC", line: "Locked until a date you pick. The amount is guaranteed by the issuer, and is usually covered by CDIC within its limits. Hard to take out early.", moves: 0, fund: null, gic: true },
  { id: "short_bonds", name: "Short-term bond fund", line: "Can go down a little, especially if rates rise.", moves: 2, fund: { ticker: "VSB", name: "Vanguard Canadian Short-Term Bond Index ETF", issuer: "Vanguard", fee: "about 0.11%", price: 45.9, out: "Sell any trading day; the price may be a little lower than you paid." } }
];
/** The founder's starting choice for short-term goals (Directive 18:25 item 3; flagged for counsel). Configurable for production (production_plan 6.4). */
export const KEEP_DEFAULT = "savings_fund";
export const SHORT_TERM_DAYS = 400;

export function keepOpt(id: string | undefined): KeepOption | null { return KEEP.find((k) => k.id === id) ?? null; }

/** A cash goal dated within about 13 months (400 days) of today. */
export function isShortTerm(g: Goal | null | undefined, ctx: Ctx): boolean {
  if (!g || g.invested || g.kind === "emergency" || !g.by) return false;
  const by = parseDate(g.by); if (!by) return false;
  return (by.getTime() - ctx.today.getTime()) / DAY_MS <= SHORT_TERM_DAYS;
}

/** Gives short-term goals the starting choice and one wording for "where" (the prototype's applyKeepDefaults). Mutates. */
export function applyKeepDefaults(s: DemoState, ctx?: Ctx): boolean {
  const c = ctx ?? { today: today(s) };
  let ch = false;
  (s.goals || []).forEach((g) => {
    if (isShortTerm(g, c) && !g.keepIn) {
      const k = keepOpt(KEEP_DEFAULT)!;
      g.keepIn = k.id; g.keepBy = "default"; g.where = "Questrade TFSA, " + k.name.replace(/ \(.*\)$/, "").toLowerCase(); g.account = "TFSA"; ch = true;
    }
    const ko = g.keepIn ? keepOpt(g.keepIn) : null;
    if (ko && ko.fund && /as cash/i.test(g.where || "")) { g.where = "Questrade TFSA, savings fund"; ch = true; }
  });
  return ch;
}
