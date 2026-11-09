/* Goals, the pay schedule, obligations, savings planners and affordability, against the prototype. */
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/index.ts";
import { P, plain } from "./helpers/fixture.ts";

const strip = (x: E.GoalStatus): Omit<E.GoalStatus, "code" | "params"> => { const { code: _c, params: _p, ...r } = x; return r; };

test("goal status, accounts, short-term and group for every edge case equal the prototype's", () => {
  for (const c of P.goalStatus) {
    /* the prototype counted monthly and twice-monthly paydays in 365.25/12 and /24-day steps; the engine counts real
       paydays (R2, the documented fix), so those two cases are checked on their own below */
    if (c.name === "monthly_pay" || c.name === "semimonthly_pay") continue;
    const s = c.state as E.DemoState;
    c.status.forEach((x: { id: string; status: unknown; accounts: unknown; short: boolean; group: string }) => {
      const g = s.goals.find((y) => y.id === x.id)!, ctx = E.ctxOf(s);
      assert.deepEqual(plain(strip(E.goalStatus(s, g))), plain(x.status), c.name + " " + x.id);
      assert.deepEqual(E.goalAccounts(s, g), x.accounts, c.name + " " + x.id);
      assert.equal(E.isShortTerm(g, ctx), x.short); assert.equal(E.goalGroup(g), x.group);
    });
    assert.deepEqual(plain(E.payRoom(s)), plain(c.payRoom), c.name);
    assert.deepEqual(plain(E.payRequest(s)), plain(c.request), c.name);
    const { ...b } = E.budget(s), want = c.budget;
    for (const k of ["incomeM", "essM", "debtM", "saveM", "pyfM", "flexM", "save", "leftPP", "leftNow", "allowance", "perDay", "perWeek", "billsPP", "usualPP", "suggest", "suggestM"] as const)
      assert.ok(Math.abs((b[k] as number) - want[k]) < 0.005, c.name + " " + k + " " + b[k] + " vs " + want[k]);
  }
});

test("R2 fix: monthly and twice-monthly earners count real paydays (New York, by Apr 30, 2027)", () => {
  const m = P.goalStatus.find((c: { name: string }) => c.name === "monthly_pay").state as E.DemoState;
  assert.equal(E.paysUntil(m, "2027-04-30"), 6); /* Nov 30, Dec 31, Jan 31, Feb 28, Mar 31, Apr 30; the prototype counted 5 */
  assert.equal(E.goalStatus(m, m.goals[0]!).line, "About $1,050 short by April. $350 a payday would close it.");
  const sm = P.goalStatus.find((c: { name: string }) => c.name === "semimonthly_pay").state as E.DemoState;
  assert.equal(E.paysUntil(sm, "2027-04-30"), 12); /* Nov 15 to Apr 30, the 15th and the last day */
});

test("status codes for a copy table", () => {
  const s = E.demoState(), st = Object.fromEntries(s.goals.map((g) => [g.id, E.goalStatus(s, g).code]));
  assert.deepEqual(st, { ny: "on_track", buffer: "at_target", home: "on_track", retire: "pace", later: "pace" });
});

test("one pay schedule: biweekly from Nov 20, the 15th and month end for twice a month, the same date monthly", () => {
  const s = E.demoState(), c = E.ctxOf(s);
  assert.deepEqual(E.nextPaydays(s, 3, c).map(E.isoDate), ["2026-11-20", "2026-12-04", "2026-12-18"]);
  assert.equal(E.paysUntil(s, "2027-04-30", c), 12);
  s.income = { amount: 3304, freq: "semimonthly", next: "2026-11-15" };
  assert.deepEqual(E.nextPaydays(s, 4, c).map(E.isoDate), ["2026-11-15", "2026-11-30", "2026-12-15", "2026-12-31"]);
  s.income = { amount: 6608, freq: "monthly", next: "2027-01-31" };
  assert.deepEqual(E.payDates(s.income, E.ymd(2027, 0, 1), E.ymd(2027, 4, 1)).map(E.isoDate), ["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
  s.income = { amount: 1525, freq: "weekly", next: "2026-11-13" };
  assert.equal(E.paysUntil(s, "2026-12-31", c), 7);
  assert.equal(Math.round(E.perPayFromMonthly(E.demoState(), 650)), 300);
});

test("quick goals and the reach date (calendar paydays; R2)", () => {
  const s = E.demoState();
  P.quickGoal.forEach((q: { target: number; by: string; plan: { n: number; perPay: number; dates: string[] } }) => assert.deepEqual(E.quickGoalPlan(s, q.target, q.by), { ...q.plan, where: "Questrade TFSA, savings fund" }, q.by));
  /* E.reachDate stepped 365.25/26 days; the engine counts real paydays, so long horizons land on the payday itself */
  assert.equal(E.reachDate(s, 3000, 725, 175), "2027-05-07");
  assert.equal(E.reachDate(s, 40000, 5499.14, 666), "2028-11-03");
  assert.equal(E.reachDate(s, 1000, 0, 0), null);
  P.reachDate.forEach((r: { target: number; saved: number; perPay: number; iso: string | null }) => {
    const got = E.reachDate(s, r.target, r.saved, r.perPay);
    if (r.iso == null || got == null) assert.equal(got, r.iso); else assert.ok(Math.abs(Date.parse(got) - Date.parse(r.iso)) <= 3 * E.DAY_MS, got + " vs " + r.iso);
  });
});

test("scalePaces equals the prototype (whole dollars, total exact)", () => {
  P.scalePaces.forEach((c: { amounts: Record<string, number>; target: number; fixed: Record<string, boolean>; result: unknown }) => assert.deepEqual(E.scalePaces(c.amounts, c.target, c.fixed), c.result));
});

test("savings and investing planners return the prototype's per-payday amounts without writing", () => {
  for (const c of P.setSavings) {
    const s = E.demoState(), before = JSON.stringify(s), ch = E.planSavingsTarget(s, c.monthly);
    assert.equal(JSON.stringify(s), before, "no mutation");
    E.applyPerPayChanges(s, ch);
    assert.deepEqual(s.goals.map((g) => ({ id: g.id, perPay: g.perPay || 0 })), c.perPay, String(c.monthly));
    assert.deepEqual(plain(s.plan!.perPay), plain(c.plan));
  }
  for (const c of P.setInvest) {
    const s = E.demoState();
    assert.deepEqual(E.investSplitFor(s, c.total), c.split.map((x: { id: string; name: string; account: string; perPay: number }) => ({ id: x.id, name: x.name, account: x.account, perPay: x.perPay })));
    E.applyPerPayChanges(s, E.planInvestTotal(s, c.total));
    assert.deepEqual(s.goals.map((g) => ({ id: g.id, perPay: g.perPay || 0 })), c.perPay, String(c.total));
  }
});

test("obligations: next due dates and the next 30 days", () => {
  const s = E.demoState(), c = E.ctxOf(s);
  assert.deepEqual(s.bills!.map((b) => ({ id: b.id, date: E.isoDate(E.nextDue(b, c)) })), P.nextDue);
  assert.deepEqual(E.upcomingBills(s, 30, c).map((u) => ({ id: u.bill.id, date: E.isoDate(u.date) })), P.upcoming);
});

test("affordability: one decision, the same verdict and options as Messages", () => {
  for (const fx of P.afford) {
    const a = E.affordability(E.demoState(), fx.amount);
    assert.ok(Math.abs(a.left - fx.leftNow) < 1e-9);
    const t: string = fx.reply.text;
    const verdict = /^Yes\./.test(t) ? "yes" : /^No, not this month/.test(t) ? "no" : "conditional";
    assert.equal(a.verdict, verdict, String(fx.amount));
    assert.deepEqual(a.options.map((o) => ({ mode: o.mode, amount: o.amount, goal: o.goalId })), (fx.reply.actions || []).map((x: { mode: string; amount: number; goal?: string }) => ({ mode: x.mode, amount: x.amount, goal: x.goal })), String(fx.amount));
    if (verdict === "yes") assert.ok(t.includes(E.cad0(Math.round(a.after!))));
    assert.equal(a.asOf, "2026-11-09");
  }
  const lap = E.affordability(E.demoState(), 1200);
  assert.equal(lap.verdict, "conditional"); assert.equal(lap.over, 276); assert.deepEqual(lap.saveUp, { target: 1200, by: "2026-12-31", perPay: 400, n: 3 });
});

test("affordability follows her plan: rent edited, then savings reduced (CR9 06)", () => {
  const s = E.demoState(), a0 = E.affordability(s, 1200);
  s.bills!.find((b) => b.id === "rent")!.amount = 2300;
  const a1 = E.affordability(s, 1200); assert.equal(a1.over, a0.over + 200);
  E.applyPerPayChanges(s, E.planSavingsTarget(s, 1800));
  const a2 = E.affordability(s, 1200); assert.ok(a2.left > a1.left); assert.equal(a2.asOf, "2026-11-09");
});

test("plan_spend proposals equal the prototype's cards", () => {
  P.planSpend.forEach((c: { mode: string; amount: number; card: { cuts?: unknown; cut?: number; goalId?: string; newPer?: number } | null }) => {
    const s = E.demoState();
    const v = c.mode === "less" ? E.planSpendLess(s, c.amount) : c.mode === "catch" ? E.planSpendCatch(s, c.amount) : E.planSpendFromGoal(s, c.amount, "ny");
    if (!c.card) { assert.equal(v, null); return; }
    assert.ok(v);
    if (v!.mode === "less") { assert.deepEqual(v!.cuts, c.card.cuts); assert.equal(v!.cut, c.card.cut); assert.equal(v!.goalId, c.card.goalId); }
    if (v!.mode === "catch") assert.equal(v!.goalId, c.card.goalId);
    if (v!.mode === "goal") assert.equal(v!.newPer, c.card.newPer);
  });
});

test("custom mix, per-goal portfolio and Not chosen yet batches equal the prototype's", () => {
  const a = E.demoState(); a.target = P.customBatch.target; E.applyBoot(a);
  const B = a.pendingBatch!;
  assert.deepEqual(plain({ orders: B.orders, total: B.total, invest: B.invest, leftover: B.leftover }), plain(P.customBatch.batch));
  const b = E.demoState(); E.goalById(b, "home")!.portfolio = "conservative"; E.applyBoot(b);
  assert.deepEqual(plain(b.pendingBatch!.orders), plain(P.perGoalPortfolio.batch));
  assert.deepEqual(["TFSA", "FHSA", "RRSP"].map((k) => ({ account: k, w: E.goalPortfolioFor(b, k) })), P.perGoalPortfolio.goalPortfolioFor);
  const c = E.demoState(); c.target = { id: "notsure", name: "Not chosen yet" }; E.applyBoot(c);
  assert.deepEqual(plain({ orders: c.pendingBatch!.orders, total: c.pendingBatch!.total, invest: c.pendingBatch!.invest, leftover: c.pendingBatch!.leftover }), plain(P.notSureBatch));
});

test("batch invariants: whole units, each account within its amount, leftover = invested less orders, fund line only for a fund goal", () => {
  const s = E.bootDemoState(), b = E.buildBatch(s), per = E.planPerPay(s).perPay as Record<string, number>;
  b.orders.forEach((o) => {
    o.lines.forEach((l) => assert.ok(Number.isInteger(l.units) && l.units > 0));
    const own = o.lines.filter((l) => !l.goal).reduce((t, l) => t + l.amount, 0);
    assert.ok(own <= per[o.account]! + 1e-9, o.account);
  });
  assert.equal(b.leftover, Math.round((b.invest - b.total) * 100) / 100);
  const fund = b.orders.flatMap((o) => o.lines.filter((l) => l.goal));
  assert.deepEqual(fund.map((l) => [l.goal, l.ticker]), [["ny", "CASH"]]);
});

test("switching portfolio: the sell and buy orders equal the prototype's", () => {
  const s = E.demoState();
  P.moveOrders.forEach((m: { id: string; orders: { account: string; sells: { ticker: string; units: number; amount: number }[]; buys: { ticker: string; units: number; amount: number }[]; value: number }[] }) => {
    const got = E.moveOrders(s, s.portfolios!.find((p) => p.id === m.id)!).map((o) => ({ account: o.account, sells: o.sells.map(({ side, ticker, units, amount }) => ({ side, ticker, units, amount })), buys: o.buys.map(({ side, ticker, units, amount }) => ({ side, ticker, units, amount })), value: o.value }));
    assert.deepEqual(plain(got), plain(m.orders), m.id);
  });
});

test("money formatting matches en-CA", () => {
  assert.equal(E.cad0(1141), "$1,141"); assert.equal(E.cad(6165.14), "$6,165.14"); assert.equal(E.cad(-57853.8), "−$57,853.80");
  assert.equal(E.cad0(-0.4), "$0"); assert.equal(E.cad0(1234.5), "$1,235"); assert.equal(E.fmtDay(E.ymd(2026, 10, 20)), "Fri, Nov 20");
  assert.equal(E.labelBy("2027-04-30"), "April 2027"); assert.equal(E.labelBy("2026-12-23"), "December 23, 2026");
  assert.deepEqual(E.paySheet(E.demoState()), P.paySheet);
});
