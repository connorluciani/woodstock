/* Engine parity with the prototype (stage 1). Ports qa/engine/golden.test.js, credit.test.js, cr12.test.js,
   lint.test.js and the cr12demo.py figure checks. Oracle: packages/engine/test/fixtures/prototype_v7_3_2.json
   (recorded from releases/woodstock_v7_3_2.html by packages/engine/scripts/oracle.cjs). Owner of failures: engine. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { E, F, ENGINE_SRC, GOLDEN_GOALS, PULL_LINES, STAMP, J, fresh, r2, need, diff, diffExpected, boot } from "./_shared.mjs";

const r = (n) => Math.round(n);

test("oracle: the recorded prototype figures are the golden values", () => {
  const got = Object.fromEntries(F.flow.goals.filter((g) => g.id in GOLDEN_GOALS).map((g) => [g.id, g.saved]));
  assert.deepEqual(got, GOLDEN_GOALS);
});

test("seed: the app's demo profile is the prototype's state (goals, accounts, income, bills, portfolios, prices)", { skip: need("demoState") }, () => {
  const s = E.demoState(), p = F.state;
  for (const k of ["goals", "accounts", "income", "bills", "portfolios", "prices"]) assert.deepEqual(diff(J(s[k]), p[k]), [], k);
  assert.match(s.user.name || s.user.firstName, /Alandra/);
});

test("D-16:11 gate figures (budget on the Skip profile)", { skip: need("budget") }, () => {
  const b = E.budget(fresh());
  assert.equal(r(b.incomeM), 6608); assert.equal(r(b.essM), 2262); assert.equal(r(b.debtM), 450);
  assert.equal(r(b.saveM), 2472); assert.equal(r(b.flexM), 1424);
  assert.equal(r(b.incomeM - b.essM - b.pyfM - b.flexM), 0);
});

test("budget matches the prototype in every field the prototype has", { skip: need("budget") }, () => {
  const base = F.goalStatus.find((c) => c.name === "base");
  assert.deepEqual(diffExpected(J(E.budget(fresh())), base.budget), []);
});

test("payday request: $1,141 and equal to the sum of its lines, same lines as the prototype", { skip: need("payRequest") }, () => {
  const R = E.payRequest(boot(fresh()));
  assert.equal(R.total, 1141); assert.equal(R.lines.reduce((s, l) => s + l.amount, 0), R.total);
  assert.deepEqual(R.lines.map((l) => [l.goal, l.amount, l.account]), F.boot.payRequest.lines.map((l) => [l.goal, l.amount, l.account]));
});

test("boot: plan per payday and the order batch equal the prototype's", { skip: need("payRequest") }, () => {
  const s = boot(fresh()), B = s.pendingBatch;
  assert.deepEqual(diff(J(s.plan.perPay), F.boot.perPay), [], "plan.perPay");
  assert.equal(B.total, F.boot.batch.total); assert.equal(B.invest, F.boot.batch.invest); assert.equal(r2(B.leftover), r2(F.boot.batch.leftover));
  assert.deepEqual(diff(J(B.orders.map((o) => ({ account: o.account, lines: o.lines.map((l) => [l.side, l.ticker, l.units, l.price]) }))),
    F.boot.batch.orders.map((o) => ({ account: o.account, lines: o.lines.map((l) => [l.side, l.ticker, l.units, l.price]) }))), []);
});

test("CR9 02: pay $3,050 to $3,300 every two weeks moves monthly income by $541.67", { skip: need("budget") }, () => {
  const s = fresh(), a = E.budget(s).incomeM; s.income.amount = 3300;
  assert.ok(Math.abs(E.budget(s).incomeM - a - 250 * 26 / 12) < 0.01);
});

test("FHSA share never exceeds the yearly limit per payday or the room left", { skip: need("goalAccounts", "account") }, () => {
  const s = fresh();
  s.goals.filter((g) => g.invested && g.account === "FHSA").forEach((g) => {
    const fh = E.goalAccounts(s, g).find((x) => x.account === "FHSA"), a = E.account(s, "FHSA");
    assert.ok(fh.amount <= Math.min(Math.floor((a.annualLimit || 8000) / 26), a.roomLeft));
  });
});

test("CR12 payday flow: pull, send, demo Questrade approval give the golden goal figures", { skip: need("pullPlan", "applyPull", "applySentActivity", "applyOrders", "applyApprovalActivity", "applyGoalCredit") }, () => {
  const s = boot(fresh()), B = s.pendingBatch;
  const before = Object.fromEntries(s.goals.map((g) => [g.id, g.saved || 0]));
  const p = E.pullPlan(s);
  assert.deepEqual(diff(J(p), F.flow.pullPlan), [], "pull plan");
  assert.equal(p.amount, E.payRequest(s).total);
  assert.equal(E.pullText(p), F.flow.pullText); assert.equal(E.pullDoneText(p), F.flow.pullDoneText);
  const tot0 = s.accounts.reduce((t, a) => t + (a.cash || 0), 0), chq0 = E.account(s, p.from.id).cash;
  assert.ok(E.applyPull(s, p, STAMP).ok);
  assert.ok(Math.abs(E.account(s, p.from.id).cash - (chq0 - 1141)) < 0.01, "bank -$1,141");
  assert.ok(Math.abs(s.accounts.reduce((t, a) => t + (a.cash || 0), 0) - tot0) < 0.01, "cash is conserved");
  assert.deepEqual(Object.fromEntries(s.goals.map((g) => [g.id, g.saved || 0])), before, "the pull alone credits no goal");
  assert.equal(E.applyPull(s, p, STAMP).ok, false, "a second pull does nothing");
  E.applySentActivity(s, STAMP); B.status = "sent";
  const orders = B.orders.map((o) => ({ account: o.account, lines: o.lines.map((l) => ({ side: l.side, ticker: l.ticker, units: l.units, price: l.price, amount: l.amount })), total: r2(o.lines.reduce((t, l) => t + l.amount, 0)) }));
  E.applyOrders(s, orders, STAMP);
  E.applyApprovalActivity(s, orders, STAMP); B.status = "approved";
  assert.equal(E.doneText(orders), F.flow.doneText);
  E.applyGoalCredit(s, B);
  const after = Object.fromEntries(s.goals.filter((g) => g.id in GOLDEN_GOALS).map((g) => [g.id, r2(g.saved)]));
  assert.deepEqual(after, GOLDEN_GOALS, "NY $900, First home $6,165.14, Retirement $4,076.41, Investing for later $1,678.60");
  for (const id in PULL_LINES) assert.equal(r2(after[id] - before[id]), PULL_LINES[id], id + " moved by its own line");
  assert.equal(E.applyGoalCredit(s, B), 0, "a second credit does nothing");
  assert.deepEqual(diff(J(s.accounts.map((a) => ({ id: a.id, cash: a.cash, holdings: (a.holdings || []).map((h) => ({ ticker: h.ticker, units: h.units })) }))),
    F.flow.accounts.map((a) => ({ id: a.id, cash: a.cash, holdings: a.holdings.map((h) => ({ ticker: h.ticker, units: h.units })) }))), [], "accounts after the flow");
  assert.ok(s.activity.every((a) => !a.demo || /\(demo\)/.test(a.title)), "every demo activity row says (demo)");
  assert.deepEqual(s.activity.filter((a) => a.demo).map((a) => a.title), F.flow.activity.filter((a) => a.demo).map((a) => a.title));
});

test("guarded flow: nothing moves without her approval of this batch, in order, after the terms", { skip: need("approvePull", "sendToQuestrade", "approveInQuestrade") }, () => {
  const s = boot(fresh()), id = s.pendingBatch.id, ap = (step, batchId = id) => ({ step, batchId, method: "demo-face-id", at: STAMP.iso });
  const snap = () => JSON.stringify([s.accounts, s.goals]);
  const s0 = snap();
  if (s.user) s.user.termsAccepted = null;
  assert.equal(E.approvePull(s, ap("pull"), STAMP).ok, false, "no pull before I agree");
  s.user.termsAccepted = "2026-11-09T09:40:00";
  assert.equal(E.approvePull(s, null, STAMP).ok, false, "no pull without an approval");
  assert.equal(E.approvePull(s, ap("send"), STAMP).ok, false, "an approval for another step does not count");
  assert.equal(E.approvePull(s, ap("pull", "other"), STAMP).ok, false, "an approval for another batch does not count");
  assert.equal(snap(), s0, "refusals change nothing");
  assert.ok(E.approvePull(s, ap("pull"), STAMP).ok);
  assert.equal(E.approvePull(s, ap("pull"), STAMP).ok, false, "a second pull is refused");
  assert.ok(E.sendToQuestrade(s, ap("send"), STAMP).ok);
  const done = E.approveInQuestrade(s, ap("broker"), STAMP);
  assert.ok(done.ok);
  assert.deepEqual(Object.fromEntries(s.goals.filter((g) => g.id in GOLDEN_GOALS).map((g) => [g.id, r2(g.saved)])), GOLDEN_GOALS);
  assert.equal(E.approveInQuestrade(s, ap("broker"), STAMP).ok, false, "a second approval is refused");
});

test("five made-up bank profiles, each different, named by the chosen bank (CR12 s4)", { skip: need("BANK_PROFILES", "profileState") }, () => {
  const demo = fresh();
  assert.ok(E.BANK_PROFILES.length >= 5);
  const pays = E.BANK_PROFILES.map((_, i) => E.profileState(demo, i, "TD Canada Trust").income.amount);
  assert.equal(new Set(pays).size, pays.length);
  const td = E.profileState(demo, 2, "TD Canada Trust");
  assert.ok(td.accounts.some((a) => a.name === "TD Chequing")); assert.ok(!JSON.stringify(td.accounts).includes("RBC"));
  for (const st of F.profiles.states) {
    const got = E.profileState(J(F.state), st.index, st.bank);
    assert.deepEqual(diff(J(got.income), st.state.income), [], `${st.bank} #${st.index} income`);
    assert.equal(E.payRequest(boot(J(got))).total !== undefined, true);
  }
});

test("profile assignment rotates and is stable per user", { skip: need("assignProfile") }, () => {
  let store = null;
  for (const a of F.profiles.assign) { const res = E.assignProfile(store, a.key); store = res.store; assert.equal(res.index, a.index, "key " + a.key); }
});

test("D-20:07: one refund function; the same figures as the prototype", { skip: need("taxRefundEstimate", "incomeProfile") }, () => {
  const P = E.incomeProfile(fresh());
  [0, 1000, 5000, 8000, 20000].forEach((c, i) => assert.deepEqual(diff(J(E.taxRefundEstimate(c, P)), F.tax.refund[i]), [], "refund " + c));
  const s = fresh(); s.income.gross = 100000;
  assert.deepEqual(diff(J(E.taxRefundEstimate(5000, E.incomeProfile(s))), F.tax.refundGross100k), []);
});

test("take-home and gross-for match the prototype", { skip: need("takeHome", "grossFor") }, () => {
  [30000, 55000, 75000, 85000, 107400, 115400, 150000, 250000].forEach((g, i) => assert.deepEqual(diff(J(E.takeHome(g, 26)), F.tax.takeHome[i]), [], "takeHome " + g));
  [1500, 2460, 3050, 3420, 5000].forEach((p, i) => assert.equal(r2(E.grossFor(p, 26)), r2(F.tax.grossFor[i]), "grossFor " + p));
});

test("raise parsing: the same new pay per payday as the prototype", { skip: need("payChangeFromText") }, () => {
  for (const c of F.raise) {
    const want = c.reply && c.reply.action && c.reply.action.amount;
    if (!want) continue;
    const got = E.payChangeFromText(fresh(), c.text);
    assert.ok(got, "no pay change for: " + c.text);
    const amt = got.newPerPay ?? got.perPay ?? (got.action && got.action.amount);
    assert.equal(Math.round(amt), Math.round(want), c.text);
  }
});

test("reachDate, scalePaces and quickGoalPlan match the prototype", { skip: need("reachDate", "scalePaces", "quickGoalPlan") }, () => {
  for (const c of F.scalePaces) assert.deepEqual(diff(J(E.scalePaces(J(c.amounts), c.target, J(c.fixed))), c.result), [], "scalePaces " + c.target);
  for (const c of F.quickGoal) assert.deepEqual(diffExpected(J(E.quickGoalPlan(fresh(), c.target, c.by)), c.plan), [], "quickGoal " + c.target + " " + c.by);
  for (const c of F.reachDate) assert.equal(E.reachDate(fresh(), c.target, c.saved, c.perPay), c.iso, `reachDate ${c.target}/${c.saved}/${c.perPay}`);
});

test("bills: next due dates and the 30-day list match the prototype", { skip: need("nextDue", "upcomingBills", "ctxOf", "isoDate") }, () => {
  const s = fresh(), ctx = E.ctxOf(s);
  assert.deepEqual(s.bills.map((b) => ({ id: b.id, date: E.isoDate(E.nextDue(b, ctx)) })), F.nextDue);
  assert.deepEqual(E.upcomingBills(s, 30, ctx).map((u) => ({ id: u.bill.id, date: E.isoDate(u.date) })), F.upcoming);
});

test("portfolio bands (1 and 5 years) and holding periods match the prototype", { skip: need("portfolioBands", "holdYears") }, () => {
  const s = fresh();
  for (const b of F.bands) {
    const p = s.portfolios.find((x) => x.id === b.id);
    assert.equal(E.holdYears(p), b.holdYears, b.id + " hold years");
    assert.deepEqual(diffExpected(J(E.portfolioBands(s, p, { years: 1 })), b.y1), [], b.id + " 1 year");
    assert.deepEqual(diffExpected(J(E.portfolioBands(s, p, { years: 5 })), b.y5), [], b.id + " 5 years");
  }
});

test("goal statuses for the edge cases match the prototype", { skip: need("goalStatus") }, () => {
  for (const c of F.goalStatus) {
    const s = J(c.state);
    c.status.forEach((g) => { const goal = s.goals.find((x) => x.id === g.id); assert.deepEqual(diffExpected(J(E.goalStatus(s, goal)), g.status), [], `${c.name} / ${g.id}`); });
  }
});

test("goal projections match the prototype (reach date, band, monthly)", { skip: need("goalProjection") }, () => {
  const s = fresh();
  for (const pj of F.projections) {
    const M = J(E.goalProjection(s, s.goals.find((g) => g.id === pj.id)));
    for (const k of ["mode", "per", "monthly", "paysToReach", "onTime", "lo", "hi", "put"]) if (pj[k] !== undefined) assert.deepEqual(diff(M[k], pj[k]), [], `${pj.id}.${k}`);
    if (pj.reach) assert.equal(String(M.reach).slice(0, 10), String(pj.reach).slice(0, 10), pj.id + ".reach");
  }
});

test("engine lint: no React, React Native, Expo, DOM, storage or src/ imports (Directive 18:39)", () => {
  const files = [];
  (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.ts$/.test(f)) files.push(p); } })(ENGINE_SRC);
  const bad = [];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    for (const rx of [/from\s+["'](react|react-native|expo[^"']*|@\/[^"']*|@react-native[^"']*)["']/, /\bdocument\./, /\bwindow\./, /\blocalStorage\b/, /\bsessionStorage\b/, /\bAsyncStorage\b/, /\bfetch\(/])
      if (rx.test(src)) bad.push(path.relative(ENGINE_SRC, f) + ": " + rx.source);
  }
  assert.deepEqual(bad, []);
});
