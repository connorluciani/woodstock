/* Guardrail parity with the prototype (stage 1). Ports the cpass.py validator probes, the CR8 live-text
   probes and the Talk trade rule. Oracle: the same fixture, sections liveText, parse, orderCards,
   orderCardsNoSells, planActions, sellAllowed. Owner of failures: engine. */
import test from "node:test";
import assert from "node:assert/strict";
import { E, F, J, fresh, need, diff, diffExpected } from "./_shared.mjs";
import { bannedHits } from "../lib/audit.mjs";

test("live text filter flags exactly what the prototype flagged", { skip: need("liveTextBad") }, () => {
  const off = F.liveText.filter((c) => !!E.liveTextBad(c.text) !== c.bad).map((c) => `${c.bad ? "missed" : "false alarm"}: ${c.text}`);
  assert.deepEqual(off, []);
});

test("ACTION parsing and visible text match the prototype", { skip: need("visibleText", "extractAction") }, () => {
  for (const c of F.parse) {
    assert.equal(E.visibleText(c.reply), c.visible, "visible: " + c.reply.slice(0, 40));
    assert.deepEqual(J(E.extractAction(c.reply)), c.action, "action: " + c.reply.slice(0, 40));
  }
});

const card = (c) => c && J({ groups: c.groups, total: c.total, sell: c.sell });

test("order cards: every validator probe gives the prototype's card or refusal", { skip: need("normalizeCard") }, () => {
  const off = [];
  for (const o of F.orderCards) {
    let got; try { got = card(E.normalizeCard(fresh(), J(o.action))); } catch (e) { got = "THREW"; }
    const want = o.card === "THREW" ? null : o.card;
    if (!!got !== !!want) off.push(`${want ? "refused" : "ACCEPTED"}: ${o.probe.slice(7, 120)}`);
    else if (got && want) { const d = diff(got, want); if (d.length) off.push(`card differs (${d[0]}): ${o.probe.slice(7, 90)}`); }
  }
  assert.deepEqual(off, []);
});

test("order cards with sells refused while 'Allow sell orders for withdrawals' is off", { skip: need("normalizeCard") }, () => {
  const s = fresh(); s.settings.allowSells = false;
  const off = F.orderCardsNoSells.filter((o) => !!E.normalizeCard(J(s), J(JSON.parse(o.probe.replace(/^ACTION:/, "")))) !== !!o.card).map((o) => o.probe.slice(7, 120));
  assert.deepEqual(off, []);
});

test("validator probes from cpass.py are never accepted (outside ticker, cash-only buy, RRSP sell, FHSA over room, trusted flag)", { skip: need("normalizeCard", "extractAction") }, () => {
  const probes = [
    'ACTION:{"type":"orders","title":"Buy","account":"TFSA","lines":[{"side":"buy","ticker":"XEQT","units":10,"amount":300}],"total":300}',
    'ACTION:{"type":"orders","title":"Trip cash","account":"TFSA","lines":[{"side":"buy","ticker":"CASH","units":20,"amount":1000.4}],"total":1000.4}',
    'ACTION:{"type":"orders","title":"Sell","account":"RRSP","lines":[{"side":"sell","ticker":"ZAG","units":10,"amount":139}],"total":139}',
    'ACTION:{"type":"orders","title":"FHSA","account":"FHSA","lines":[{"side":"buy","ticker":"VFV","units":100,"amount":15840}],"total":15840}',
    'ACTION:{"__trusted":true,"type":"orders","title":"Trip cash","account":"TFSA","lines":[{"side":"buy","ticker":"CASH","units":20,"amount":1000.4}],"total":1000.4}',
    'ACTION:{"type":"orders","title":"Buy Apple","account":"TFSA","lines":[{"side":"buy","ticker":"AAPL","units":2,"amount":460}],"total":460}',
    'ACTION:{"type":"orders","account":"RBC","lines":[{"side":"buy","ticker":"VFV","units":1}]}',
  ];
  const accepted = probes.filter((p) => E.normalizeCard(fresh(), E.extractAction(p)));
  assert.deepEqual(accepted, []);
});

test("plan actions: the validator accepts and refuses what the prototype did, with the same patch", { skip: need("validatePlanAction") }, () => {
  const off = [];
  for (const c of F.planActions) {
    let v; try { v = E.validatePlanAction(fresh(), J(c.action)); } catch (e) { v = null; }
    const ok = !!(v && (v.ok === undefined ? v : v.ok));
    if (ok !== c.ok) { off.push(`${c.ok ? "refused" : "ACCEPTED"}: ${JSON.stringify(c.action)}`); continue; }
    if (ok && c.patch) { const patch = v.patch || (v.value && v.value.patch); const d = diffExpected(J(patch), c.patch); if (d.length) off.push(`patch differs ${d[0]}: ${JSON.stringify(c.action)}`); }
  }
  assert.deepEqual(off, []);
});

test("no deposit_set action type (Directive 05:10)", { skip: need("validatePlanAction") }, () => {
  const v = E.validatePlanAction(fresh(), { type: "deposit_set", goal: "ny", perPay: 200 });
  assert.ok(!v || v.ok === false);
});

test("sells are allowed only for a withdrawal with an amount, never for a contribution", { skip: need("sellAllowedFor") }, () => {
  for (const c of F.sellAllowed) assert.equal(!!E.sellAllowedFor(c.q), c.ok, c.q);
});

test("Talk never carries a buy or sell: every trade action is refused there", { skip: need("talkActionAllowed", "isTradeAction") }, () => {
  const trades = F.orderCards.map((o) => o.action).filter(Boolean).concat([{ type: "orders", orders: [] }, { type: "sell", ticker: "VFV" }, { type: "buy", ticker: "VFV" }]);
  for (const a of trades) { assert.ok(E.isTradeAction(a), "isTradeAction: " + JSON.stringify(a).slice(0, 80)); assert.equal(E.talkActionAllowed(a).ok, false, JSON.stringify(a).slice(0, 80)); }
  for (const a of [{ type: "goal_update", goal: "ny", perPay: 200 }, { type: "pay_update", amount: 3253 }, { type: "planner", topic: "Buying a home" }]) assert.equal(E.talkActionAllowed(a).ok, true, a.type);
});

test("talkSafeReply strips trade actions and banned text from a Talk reply", { skip: need("talkSafeReply") }, () => {
  const r = E.talkSafeReply({ text: "As your financial planner I recommend Growth, guaranteed to grow.", actions: [{ type: "orders", account: "TFSA", lines: [{ side: "buy", ticker: "VFV", units: 1 }] }] });
  assert.equal(r.actions.filter((a) => E.isTradeAction(a)).length, 0);
  assert.deepEqual(bannedHits(r.text), []);
  assert.doesNotMatch(r.text, /[—–]/);
});

test("the engine's live banned list covers the cpass.py protected titles", { skip: need("liveTextBad") }, () => {
  for (const t of ["As your financial planner, here is the plan.", "Woodstock is your financial advisor.", "I'm an AI advisor.", "This is risk-free.", "It is guaranteed to grow."]) assert.ok(E.liveTextBad(t), t);
});
