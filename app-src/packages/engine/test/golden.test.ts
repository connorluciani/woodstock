/* The prototype's golden figures (qa/engine/golden.test.js, snapshot.test.js, cr12.test.js, credit.test.js), to the cent. */
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/index.ts";
import { GOLDEN, P, plain, clone, STAMP } from "./helpers/fixture.ts";

const r = Math.round;
const cents = (n: number): number => Math.round(n * 100);

test("D-16:11 / D-13:50 gate figures: pay $6,608, essentials $2,262, pay yourself first $2,472 a month or $1,141 a payday, flexible $1,424", () => {
  const s = E.demoState(), b = E.budget(s);
  assert.equal(r(b.incomeM), 6608); assert.equal(r(b.essM), 2262); assert.equal(r(b.debtM), 450);
  assert.equal(r(b.saveM), 2472); assert.equal(b.save, 1141); assert.equal(r(b.flexM), 1424);
  assert.equal(r(b.incomeM - b.essM - b.pyfM - b.flexM), 0);
  assert.equal(cents(b.incomeM), cents(6608.33)); assert.equal(cents(b.essM), cents(2261.99)); assert.equal(cents(b.saveM), cents(2472.17)); assert.equal(cents(b.flexM), cents(1424.18));
});

test("snapshot equals qa/engine/golden.json (budget, payday request, goal statuses, goal accounts)", () => {
  const s = E.demoState();
  const snap = JSON.parse(JSON.stringify(plain({
    budget: E.budget(s), payRequest: E.payRequest(s),
    goalStatus: s.goals.map((g) => { const { code: _c, params: _p, ...st } = E.goalStatus(s, g); return { id: g.id, status: st }; }),
    goalAccounts: s.goals.map((g) => ({ id: g.id, accounts: E.goalAccounts(s, g) }))
  })));
  assert.deepEqual(snap, GOLDEN);
});

test("payday request equals the sum of its lines ($1,141 over 4 lines)", () => {
  const R = E.payRequest(E.demoState());
  assert.equal(R.total, 1141); assert.equal(R.lines.length, 4); assert.equal(R.lines.reduce((t, l) => t + l.amount, 0), R.total);
});

test("CR9 02: pay $3,050 to $3,300 every two weeks moves monthly income by $541.67", () => {
  const s = E.demoState(), a = E.budget(s).incomeM; s.income!.amount = 3300;
  assert.ok(Math.abs(E.budget(s).incomeM - a - 250 * 26 / 12) < 0.01);
});

test("FHSA share never exceeds the yearly limit per payday or the room left", () => {
  const s = E.demoState();
  s.goals.filter((g) => g.invested && g.account === "FHSA").forEach((g) => {
    const fh = E.goalAccounts(s, g).find((x) => x.account === "FHSA")!, a = E.account(s, "FHSA")!;
    assert.ok(fh.amount <= Math.min(Math.floor((a.annualLimit || 8000) / 26), a.roomLeft!));
  });
});

test("boot: request lines, per-account split and today's orders equal the prototype's after ready", () => {
  const s = E.bootDemoState(), B = s.pendingBatch!;
  assert.deepEqual(plain(s.plan!.perPay), plain(P.boot.perPay)); assert.equal(s.plan!.investPerPay, P.boot.investPerPay);
  assert.deepEqual(plain(B.orders), plain(P.boot.batch.orders));
  assert.equal(B.total, P.boot.batch.total); assert.equal(B.invest, P.boot.batch.invest); assert.equal(B.leftover, P.boot.batch.leftover);
  assert.deepEqual(plain(B.goalLines), plain(P.boot.batch.goalLines));
  assert.deepEqual(plain(E.payRequest(s)), plain(P.boot.payRequest));
});

test("CR12 after both approvals: New York $900, First home $6,165.14, Retirement $4,076.41, Investing for later $1,678.60", () => {
  const s = E.bootDemoState(), B = s.pendingBatch!, before = Object.fromEntries(s.goals.map((g) => [g.id, g.saved || 0]));
  const ap = (step: E.ApprovalStep): E.Approval => ({ step, batchId: B.id, method: "demo-face-id", at: STAMP.iso });
  const pull = E.approvePull(s, ap("pull"), STAMP); assert.ok(pull.ok);
  assert.deepEqual(Object.fromEntries(s.goals.map((g) => [g.id, g.saved || 0])), before, "the pull alone credits no goal");
  assert.ok(E.sendToQuestrade(s, ap("send"), STAMP).ok);
  const done = E.approveInQuestrade(s, ap("broker"), STAMP); assert.ok(done.ok);
  const saved = Object.fromEntries(s.goals.map((g) => [g.id, cents(g.saved || 0)]));
  assert.equal(saved.ny, 90000); assert.equal(saved.home, 616514); assert.equal(saved.retire, 407641); assert.equal(saved.later, 167860); assert.equal(saved.buffer, 900000);
  P.flow.goals.forEach((g: { id: string; saved: number }) => assert.equal(saved[g.id], cents(g.saved), g.id));
  /* each goal moved by exactly its own line, once */
  const line = Object.fromEntries((B.goalLines || []).map((l) => [l.goal, l.amount]));
  s.goals.forEach((g) => assert.equal(cents((g.saved || 0) - before[g.id]!), cents(line[g.id] || 0), g.id));
  assert.equal(E.applyGoalCredit(s, B), 0, "a second credit does nothing");
});

test("CR12 flow: balances, holdings and activity equal the prototype's", () => {
  const s = E.bootDemoState(), B = s.pendingBatch!;
  const p = E.pullPlan(s)!;
  assert.deepEqual(plain(p), plain(P.flow.pullPlan)); assert.equal(E.pullText(p), P.flow.pullText); assert.equal(E.pullDoneText(p), P.flow.pullDoneText);
  const tot0 = s.accounts.reduce((t, a) => t + (a.cash || 0), 0);
  E.applyPull(s, p, STAMP);
  assert.ok(Math.abs(s.accounts.reduce((t, a) => t + (a.cash || 0), 0) - tot0) < 0.01, "cash is conserved");
  assert.deepEqual(plain(s.accounts.map((a) => ({ id: a.id, cash: a.cash }))), plain(P.flow.afterPull.accounts));
  assert.deepEqual(E.applyPull(s, p, STAMP), { ok: false, code: "already_pulled" });
  B.status = "sent";
  const ap: E.Approval = { step: "broker", batchId: B.id, method: "demo-face-id", at: STAMP.iso };
  const r2 = E.approveInQuestrade(s, ap, STAMP); assert.ok(r2.ok);
  assert.deepEqual(plain(s.accounts.map((a) => ({ id: a.id, cash: a.cash, balance: a.balance, holdings: (a.holdings || []).map((h) => ({ ticker: h.ticker, units: h.units, bookValue: h.bookValue, price: h.price })) }))), plain(P.flow.accounts));
  const act = s.activity!.filter((a) => a.title !== "Sent to Questrade (demo)").map((a) => ({ title: a.title, sub: a.sub, amount: a.amount, kind: a.kind, demo: a.demo }));
  const want = P.flow.activity.filter((a: { title: string }) => a.title !== "Sent to Questrade (demo)");
  assert.deepEqual(plain(act), plain(want));
  assert.equal(r2.ok && r2.text, P.flow.doneText);
  assert.ok(s.activity!.every((a) => !a.demo || /\(demo\)/.test(a.title)), "every demo row says (demo)");
  assert.equal(E.netWorth(s), P.flow.total); assert.equal(E.investTotal(s), P.flow.investTotal);
  assert.ok(!JSON.stringify(s).includes("Orders sent to Questrade"), "production_plan 5.5 item 8");
});
