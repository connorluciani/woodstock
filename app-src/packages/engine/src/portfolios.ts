/* Portfolios: her target, a goal's own portfolio (Directive 18:25 item 1), weights and the suggested holding period. */
import type { DemoState, Goal, Portfolio } from "./types.ts";
import { ASSUMPTIONS } from "./assumptions.ts";
import { goalAccounts, liveGoals } from "./goals.ts";

/** Her target portfolio from the published list, or her own mix, or "Not chosen yet" (no buys). */
export function targetPortfolio(s: DemoState): Portfolio | null {
  const t = s.target || {};
  const pf = (s.portfolios || []).find((p) => p.id === t.id);
  if (pf) return pf;
  if (t.id === "custom" && t.mix && t.mix.length) return { id: "custom", name: "My mix", holdings: { registered: t.mix.map((m) => ({ ticker: m.ticker, weight: m.weight })) } };
  if (t.id === "notsure") return { id: "notsure", name: "Not chosen yet", holdings: { registered: [] } };
  return null;
}

/** Ticker weights (fractions of 1) of a portfolio's registered holdings. */
export function weightsOf(p: Portfolio | null | undefined): Record<string, number> {
  const o: Record<string, number> = {};
  ((p && p.holdings && p.holdings.registered) || []).forEach((h) => { o[h.ticker] = (Number(h.weight) || 0) / 100; });
  return o;
}

/** The portfolio a goal's money follows: its own pick, else her target. */
export function goalPortfolio(s: DemoState, g: Goal | null | undefined): Portfolio | null {
  const t = s.target || {}, id = g && g.portfolio ? g.portfolio : t.id;
  return (s.portfolios || []).find((p) => p.id === id) ?? null;
}

/** For an account, the weights of the goal that puts the most money into it, when that goal has its own portfolio. */
export function goalPortfolioFor(s: DemoState, acct: string): Record<string, number> | null {
  let best: Goal | null = null, amt = 0;
  liveGoals(s).forEach((g) => { if (!g.invested || g.paused) return; goalAccounts(s, g).forEach((x) => { if (x.account === acct && x.amount > amt) { amt = x.amount; best = g; } }); });
  const b = best as Goal | null;
  if (!b || !b.portfolio || b.portfolio === (s.target || {}).id) return null;
  const p = goalPortfolio(s, b);
  return p ? weightsOf(p) : null;
}

/** Suggested holding period in years, the same for every client (Directive 18:25 item 2). */
export function holdYears(p: Portfolio | null | undefined): number | null {
  if (!p) return null;
  return Number(p.holdYears) > 0 ? Number(p.holdYears) : ASSUMPTIONS.holdYears[p.id] ?? null;
}
