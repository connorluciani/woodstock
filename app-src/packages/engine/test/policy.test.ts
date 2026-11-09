/* Validators and the guardrail policy: the qa/cpass.py probes as a corpus (R9 step 3), plus each legal guardrail. */
import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../src/index.ts";
import { P, plain, STAMP } from "./helpers/fixture.ts";

test("text filter: banned and allowed live replies equal the prototype's", () => {
  P.liveText.forEach((x: { text: string; bad: boolean }) => assert.equal(E.liveTextBad(x.text), x.bad, x.text));
});

test("ACTION parsing and the visible text equal the prototype's", () => {
  P.parse.forEach((x: { reply: string; visible: string; action: unknown }) => { assert.equal(E.visibleText(x.reply), x.visible); assert.deepEqual(E.extractAction(x.reply), x.action); });
});

test("order cards: every cpass probe accepted or refused exactly as in the prototype", () => {
  P.orderCards.forEach((x: { probe: string; action: unknown; card: { groups: unknown; total: number; sell: boolean } | null }) => {
    const c = E.normalizeCard(E.demoState(), x.action);
    assert.deepEqual(c && plain({ groups: c.groups, total: c.total, sell: c.sell }), x.card && plain(x.card), x.probe);
  });
  const off = E.demoState(); off.settings!.allowSells = false;
  P.orderCardsNoSells.forEach((x: { probe: string; card: unknown }) => assert.deepEqual(E.normalizeCard(off, E.extractAction(x.probe)), x.card, x.probe));
});

test("plan actions: every probe accepted or refused as in the prototype, with the same patch", () => {
  P.planActions.forEach((x: { action: Record<string, unknown>; ok: boolean; patch: Record<string, unknown> | null; extra: Record<string, unknown> | null }) => {
    const v = E.validatePlanAction(E.demoState(), x.action);
    assert.equal(v.ok, x.ok, JSON.stringify(x.action) + (v.ok ? "" : " " + v.code));
    if (!v.ok || !x.ok) return;
    if (x.patch && Object.keys(x.patch).length && !(x.action.type === "plan_spend")) assert.deepEqual(plain(v.patch), plain(x.patch), JSON.stringify(x.action));
    const ex = x.extra || {};
    for (const k of ["amount", "total", "mode", "cuts", "cut", "newPer"] as const) if (ex[k] !== undefined) assert.deepEqual(plain((v as Record<string, unknown>)[k]), plain(ex[k]), k + " " + JSON.stringify(x.action));
  });
});

test("sell rule: sells only when she asks to take an amount out (D-18:51)", () => {
  P.sellAllowed.forEach((x: { q: string; ok: boolean }) => assert.equal(E.sellAllowedFor(x.q), x.ok, x.q));
});

test("guardrail 1: no buy or sell from Talk", () => {
  for (const a of [{ type: "orders", lines: [] }, { type: "sell" }, { type: "buy" }, { type: "withdraw" }, { type: "goal_update", lines: [{}] }, { type: "x", strip: "Sell for cash" }, { orders: [] }])
    assert.equal(E.talkActionAllowed(a).ok, false, JSON.stringify(a));
  assert.equal(E.talkActionAllowed({ type: "goal_update", goal: "ny", perPay: 200 }).ok, true);
  assert.deepEqual(E.talkActionAllowed({ type: "invest_total", total: 900 }), { ok: false, code: "not_a_talk_card" });
  const r = E.talkSafeReply({ text: "Here's the sale.", actions: [{ type: "orders", account: "TFSA", lines: [{ side: "sell", ticker: "VFV", units: 1 }] }] });
  assert.equal(r.blocked, true); assert.equal(r.text, E.TALK_NO_TRADE); assert.deepEqual(r.actions, []);
  assert.equal(E.talkSafeReply({ text: "Tap approve to send the order." }).blocked, true);
  assert.deepEqual(E.talkSafeReply({ text: "Here's the change.", actions: [{ type: "goal_update", goal: "ny", perPay: 200 }, { type: "compare" }, { type: "sub_cancel" }] }).actions.length, 2);
  /* Compliance C2: an affordability question never produces an order */
  assert.equal(E.affordActionAllowed("Can I afford an $80 makeup purchase?", { type: "orders" }), false);
  assert.equal(E.affordActionAllowed("Can I afford an $80 makeup purchase?", { type: "plan_spend" }), true);
});

test("guardrail 2: orders and money moves only with her approval of this batch, in order, after the terms", () => {
  const s = E.bootDemoState(), B = s.pendingBatch!, ap = (step: E.ApprovalStep, extra: Partial<E.Approval> = {}): E.Approval => ({ step, batchId: B.id, method: "face-id", at: STAMP.iso, ...extra });
  const cash0 = JSON.stringify(s.accounts);
  assert.deepEqual(E.approveInQuestrade(s, ap("broker"), STAMP), { ok: false, code: "not_sent_in_woodstock" });
  assert.deepEqual(E.sendToQuestrade(s, null, STAMP), { ok: false, code: "no_approval" });
  assert.deepEqual(E.sendToQuestrade(s, ap("broker"), STAMP), { ok: false, code: "wrong_step" });
  assert.deepEqual(E.sendToQuestrade(s, ap("send", { batchId: "other" }), STAMP), { ok: false, code: "other_batch" });
  assert.deepEqual(E.approvePull(s, ap("pull", { method: "" }), STAMP), { ok: false, code: "no_approval" });
  const noTerms = E.bootDemoState(); delete noTerms.user!.termsAccepted;
  assert.deepEqual(E.approvePull(noTerms, ap("pull"), STAMP), { ok: false, code: "terms_not_accepted" });
  assert.deepEqual(E.sendToQuestrade(noTerms, ap("send"), STAMP), { ok: false, code: "terms_not_accepted" });
  assert.equal(JSON.stringify(s.accounts), cash0, "nothing moved");
  assert.equal(E.approvalFrom({ ok: false, method: "none", at: "" }, "send", B.id), null);
  assert.ok(E.sendToQuestrade(s, E.approvalFrom({ ok: true, method: "demo-face-id", at: STAMP.iso }, "send", B.id), STAMP).ok);
  assert.deepEqual(E.sendToQuestrade(s, ap("send"), STAMP), { ok: false, code: "not_pending" }, "sent once");
  assert.ok(E.approveInQuestrade(s, ap("broker"), STAMP).ok);
  assert.deepEqual(E.approveInQuestrade(s, ap("broker"), STAMP), { ok: false, code: "not_sent_in_woodstock" }, "approved once");
});

test("guardrail 3: the FHSA cap (yearly limit over her paydays, never past the room left)", () => {
  const s = E.demoState();
  assert.equal(E.fhsaPerPayCap(s), 307); /* floor(8,000 / 26) */
  assert.ok(E.checkFhsaCap(s, 307).ok); assert.deepEqual(E.checkFhsaCap(s, 308), { ok: false, code: "over_fhsa_cap" });
  E.account(s, "FHSA")!.roomLeft = 120;
  assert.equal(E.fhsaPerPayCap(s), 120);
  assert.deepEqual(E.goalAccounts(s, E.goalById(s, "home")!), [{ account: "FHSA", amount: 120 }, { account: "TFSA", amount: 546 }]);
  assert.equal(E.planPerPay(s).perPay.FHSA, 120);
  const t = E.demoState(); E.goalById(t, "home")!.perPay = 200;
  assert.deepEqual(E.goalAccounts(t, E.goalById(t, "home")!), [{ account: "FHSA", amount: 200 }]);
  /* only a home goal can use the FHSA */
  assert.deepEqual(E.validatePlanAction(E.demoState(), { type: "goal_add", name: "Trips", target: 2000, where: "Questrade FHSA" }), { ok: false, code: "fhsa_only_for_home" });
  assert.deepEqual(E.validatePlanAction(E.demoState(), { type: "goal_move", goal: "ny", where: "Questrade FHSA" }), { ok: false, code: "fhsa_only_for_home" });
});

test("guardrail 4: room limits on every buy", () => {
  const s = E.demoState();
  assert.ok(E.checkRoom(s, "FHSA", 2361).ok); assert.deepEqual(E.checkRoom(s, "FHSA", 2400), { ok: false, code: "over_room" });
  assert.equal(E.normalizeCard(s, { type: "orders", account: "FHSA", lines: [{ side: "buy", ticker: "VFV", units: 100 }] }), null);
  E.account(s, "TFSA")!.roomLeft = 100;
  assert.equal(E.normalizeCard(s, { type: "orders", account: "TFSA", lines: [{ side: "buy", ticker: "VFV", units: 1 }, { side: "buy", ticker: "XIC", units: 2 }, { side: "buy", ticker: "XEF", units: 2 }, { side: "buy", ticker: "ZAG", units: 5 }, { side: "buy", ticker: "CASH", units: 1 }] }), null);
});

test("guardrail 5: her own mix (Build my own, and orders that follow it)", () => {
  assert.deepEqual(E.validateOwnMix([{ ticker: "XIC", weight: 50 }, { ticker: "ZAG", weight: 50 }], "model"), { ok: false, code: "not_her_tap" });
  assert.deepEqual(E.validateOwnMix([{ ticker: "AAPL", weight: 60 }, { ticker: "ZAG", weight: 30 }], "client"), { ok: false, code: "not_100" });
  assert.deepEqual(E.validateOwnMix([{ ticker: "NVDA", weight: 100 }], "client"), { ok: false, code: "not_listed" });
  assert.deepEqual(E.validateOwnMix([{ ticker: "ZAG", weight: 50 }, { ticker: "zag", weight: 50 }], "client"), { ok: false, code: "repeated" });
  assert.deepEqual(E.validateOwnMix([], "client"), { ok: false, code: "empty" });
  const ok = E.validateOwnMix([{ ticker: "aapl", weight: 60 }, { ticker: "ZAG", weight: 40 }], "client");
  assert.ok(ok.ok && ok.mix[0]!.ticker === "AAPL" && ok.mix[0]!.price === 228.1 && ok.mix[0]!.kind === "us");
  /* a chat can never set a mix: set_mix is not a card type */
  assert.deepEqual(E.validatePlanAction(E.demoState(), { type: "set_mix", holdings: [{ ticker: "AAPL", weight: 60 }] }), { ok: false, code: "unknown_type" });
  /* orders follow her mix per account; tickers outside it are refused */
  const s = E.demoState(); s.target = { id: "custom", name: "My mix", mix: [{ ticker: "XIC", weight: 50 }, { ticker: "ZAG", weight: 50 }], mixes: { TFSA: [{ ticker: "XIC", weight: 50 }, { ticker: "ZAG", weight: 50 }] } };
  assert.ok(E.checkOwnMix(s, { account: "TFSA", lines: [{ side: "buy", ticker: "XIC", units: 5, price: 41.2, amount: 206 }, { side: "buy", ticker: "ZAG", units: 15, price: 13.9, amount: 208.5 }] }).ok);
  assert.deepEqual(E.checkOwnMix(s, { account: "TFSA", lines: [{ side: "buy", ticker: "XIC", units: 10, price: 41.2, amount: 412 }] }), { ok: false, code: "off_mix" });
  assert.deepEqual(E.checkOwnMix(s, { account: "RRSP", lines: [{ side: "buy", ticker: "XIC", units: 1, price: 41.2, amount: 41.2 }] }), { ok: false, code: "no_mix_for_account" });
  assert.equal(E.normalizeCard(s, { type: "orders", account: "TFSA", lines: [{ side: "buy", ticker: "VFV", units: 1 }] }), null);
  /* "Not chosen yet" buys nothing (the prototype kept the last portfolio's tickers; fixed here) */
  const n = E.demoState(); n.target = { id: "notsure" };
  assert.equal(E.normalizeCard(n, { type: "orders", account: "TFSA", lines: [{ side: "buy", ticker: "VFV", units: 1 }] }), null);
});
