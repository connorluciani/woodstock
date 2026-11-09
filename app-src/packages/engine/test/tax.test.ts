/* Take-home, the refund estimate and raises (one 2026 federal and Ontario model, D-20:07), against the prototype. */
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/index.ts";
import { P } from "./helpers/fixture.ts";

test("take-home equals the prototype for every salary", () => {
  [30000, 55000, 75000, 85000, 107400, 115400, 150000, 250000].forEach((g, i) => {
    const a = E.takeHome(g, 26), b = P.tax.takeHome[i];
    for (const k of ["year", "perPay", "tax", "cpp", "ei"] as const) assert.ok(Math.abs(a[k] - b[k]) < 1e-9, g + " " + k);
  });
  assert.ok(Math.abs(E.takeHome(107400, 12).perPay - P.tax.takeHomeMonthly.perPay) < 1e-9);
  assert.deepEqual([1500, 2460, 3050, 3420, 5000].map((p) => E.grossFor(p, 26)), P.tax.grossFor);
});

test("her income profile: $3,050 every two weeks grosses up to about $107,400 (an estimate)", () => {
  assert.deepEqual(E.incomeProfile(E.demoState()), P.tax.incomeProfile);
  assert.equal(E.incomeProfile(E.demoState()).gross, 107400);
});

test("the refund on $5,000 to the RRSP: about $1,570", () => {
  const r = E.taxRefundEstimate(5000, E.incomeProfile(E.demoState()))!;
  assert.equal(r.amount, 1570); assert.equal(r.grossEstimated, true); assert.ok(r.amount % 10 === 0);
  assert.ok(r.rate > 0.2 && r.rate < 0.55);
  [0, 1000, 5000, 8000, 20000].forEach((c, i) => { const x = E.taxRefundEstimate(c, E.incomeProfile(E.demoState()))!; assert.equal(x.amount, P.tax.refund[i].amount); assert.ok(Math.abs(x.raw - P.tax.refund[i].raw) < 1e-6); });
  const s = E.demoState(); s.income!.gross = 100000;
  const r2 = E.taxRefundEstimate(5000, E.incomeProfile(s))!;
  assert.equal(r2.grossEstimated, false); assert.equal(r2.gross, 100000); assert.equal(r2.amount, P.tax.refundGross100k.amount);
  assert.equal(E.taxRefundEstimate(5000, { gross: 0, grossEntered: false, pay: 0, ppy: 26 }), null);
});

test("raise parsing: $8,000 a year becomes about $203 a payday ($3,050 to $3,253)", () => {
  const c = E.payChangeFromText(E.demoState(), "$8,000 more a year")!;
  assert.equal(c.kind, "raise_year"); assert.equal(c.newPerPay, 3253); assert.equal(c.diffPerPay, 203); assert.equal(c.needsConfirm, false);
  const c2 = E.payChangeFromText(E.demoState(), "I got a raise of $8,000 a year")!; assert.equal(c2.newPerPay, 3253);
});

test("raise parsing equals Talk it through's payReply for every phrasing", () => {
  for (const fx of P.raise as { text: string; reply: { text: string; action?: { amount: number } } | null }[]) {
    const c = E.payChangeFromText(E.demoState(), fx.text);
    if (!fx.reply) { assert.ok(!c || c.kind === "percent", fx.text); continue; }
    assert.ok(c, fx.text);
    if (fx.reply.action) { assert.equal(c!.newPerPay, fx.reply.action.amount, fx.text); assert.equal(c!.needsConfirm, false, fx.text); }
    else { assert.ok(/^Just to check/.test(fx.reply.text)); assert.equal(c!.needsConfirm, true, fx.text); }
  }
  const pct = E.payChangeFromText(E.demoState(), "I got a 5% raise")!;
  assert.equal(pct.kind, "percent"); assert.equal(pct.newPerPay, Math.round(E.takeHome(107400 * 1.05, 26).perPay));
  const jan = E.payChangeFromText(E.demoState(), "about $8,000 more a year from January")!; assert.equal(jan.from, "January");
});
