/* Bands (FP Canada 2026 returns plus Woodstock's stated volatility, shifted lognormal) and goal projections, against the prototype. */
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/index.ts";
import { P, plain } from "./helpers/fixture.ts";

const close = (a: number, b: number, tol = 1e-6): boolean => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

test("one assumptions table: FP Canada 2026 returns, inflation 2.1%, volatility 15/5/1, correlation 0.2, holding periods 3/5/7/10", () => {
  assert.deepEqual({ ...E.ASSUMPTIONS.returns }, { cash: 2.4, bond: 3.2, cad: 6.3, us: 6.4, intl: 6.6, em: 7.5 });
  assert.equal(E.ASSUMPTIONS.inflation, 2.1); assert.deepEqual({ ...E.ASSUMPTIONS.vol }, { stocks: 15, bond: 5, cash: 1 });
  assert.equal(E.ASSUMPTIONS.corrStocksBonds, 0.2); assert.deepEqual({ ...E.ASSUMPTIONS.holdYears }, { conservative: 3, balanced: 5, growth: 7, aggressive: 10 });
});

test("planned investing a month is $2,093 ($966 a payday x 26 / 12)", () => {
  assert.equal(Math.round(E.plannedMonthly(E.demoState())), Math.round(P.plannedMonthly));
});

for (const fx of P.bands as { id: string; holdYears: number; rates: E.BandRates; y1: E.Bands; y5: E.Bands; y5m1000: E.Bands }[]) {
  test(`bands for ${fx.id}: rough, typical and good figures for 1 and 5 years equal the prototype's`, () => {
    const s = E.demoState(), p = s.portfolios!.find((x) => x.id === fx.id)!;
    const R = E.bandRates(p)!;
    assert.ok(close(R.net, fx.rates.net) && close(R.sigma, fx.rates.sigma), "rates");
    assert.equal(E.holdYears(p), fx.holdYears);
    for (const [got, want] of [[E.portfolioBands(s, p, { years: 1 })!, fx.y1], [E.portfolioBands(s, p, { years: 5 })!, fx.y5], [E.portfolioBands(s, p, { years: 5, monthly: 1000 })!, fx.y5m1000]] as const) {
      assert.equal(got.putIn, want.putIn);
      for (const k of ["p5", "p25", "p50", "p75", "p95"] as const) {
        assert.equal(got[k], want[k], k);
        assert.ok(close(got.exact![k], want.exact![k]), k + " exact");
      }
      assert.equal(got.fit, want.fit);
    }
  });
}

test("Growth bands for her $25,116 a year: 1 year $23,000 / $24,600 to $27,100 / $29,100; 5 years $111,700 / $130,000 to $162,000 / $190,700", () => {
  const s = E.demoState(), g = s.portfolios!.find((p) => p.id === "growth")!;
  const b1 = E.portfolioBands(s, g, { years: 1 })!, b5 = E.portfolioBands(s, g, { years: 5 })!;
  assert.deepEqual([b1.putIn, b1.p5, b1.p25, b1.p75, b1.p95], [25116, 23000, 24600, 27100, 29100]);
  assert.deepEqual([b5.putIn, b5.p5, b5.p25, b5.p75, b5.p95], [125580, 111700, 130000, 162000, 190700]);
});

test("goal projections equal the prototype's (reach, paydays, bands, every point)", () => {
  const s = E.demoState();
  for (const fx of P.projections) {
    const g = s.goals.find((x) => x.id === fx.id)!, M = E.goalProjection(s, g);
    assert.equal(M.mode, fx.mode, fx.id);
    const got = JSON.parse(JSON.stringify(plain({ reach: M.reach ?? null, paysToReach: M.paysToReach ?? null, paysToBy: M.paysToBy ?? null, needPerPay: M.needPerPay ?? null, onTime: M.onTime ?? null, end: M.end ?? null, bandAtReach: M.bandAtReach ?? null, lo: M.lo ?? null, hi: M.hi ?? null, put: M.put ?? null, points: M.points ?? null, history: M.history ?? null, monthly: M.monthly, start: M.start })));
    const n = (v: unknown): unknown => (v === undefined ? null : v);
    const want = JSON.parse(JSON.stringify(plain({ reach: n(fx.reach), paysToReach: n(fx.paysToReach), paysToBy: n(fx.paysToBy), needPerPay: n(fx.needPerPay), onTime: n(fx.onTime), end: n(fx.end), bandAtReach: n(fx.bandAtReach), lo: n(fx.lo), hi: n(fx.hi), put: n(fx.put), points: n(fx.points), history: n(fx.history), monthly: fx.monthly, start: fx.start })));
    assert.deepEqual(got, want, fx.id);
    if (fx.rates) { assert.ok(close(M.rates!.mid, fx.rates.mid) && close(M.rates!.realLow, fx.rates.realLow), fx.id + " rates"); }
  }
});

test("New York reaches $3,000 on Apr 23, 2027 at $175 a payday (12 paydays, on time)", () => {
  const s = E.demoState(), M = E.goalProjection(s, s.goals[0]!);
  assert.equal(E.reachIso(M), "2027-04-23"); assert.equal(M.paysToReach, 12); assert.equal(M.onTime, true);
});

test("holding period note: neutral, only when the date is sooner than the portfolio's period", () => {
  for (const c of P.goalStatus) {
    const s = c.state as E.DemoState;
    c.status.forEach((x: { id: string; hold: string }) => assert.equal(E.holdNote(s, s.goals.find((g) => g.id === x.id)!), x.hold, c.name + " " + x.id));
  }
  const s = E.demoState(); E.goalById(s, "home")!.portfolio = "aggressive";
  assert.match(E.holdNote(s, E.goalById(s, "home")!), /^This goal is about 2 years away\. Aggressive is generally meant for money you won.t need for 10 or more years\.$/);
  const t = E.demoState(); E.goalById(t, "home")!.portfolio = "conservative";
  for (const x of P.perGoalPortfolio.hold) assert.equal(E.holdNote(t, E.goalById(t, x.id)!), x.hold, x.id);
});
