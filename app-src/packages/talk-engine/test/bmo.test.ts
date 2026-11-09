/* Build my own and Build it with me, in Node: guardrails, her words into rows, Use my mix only on her tap. */
import test from "node:test";
import assert from "node:assert/strict";
import { fresh } from "./helpers.ts";
import { createBuilder } from "../src/bmo.ts";

test("the helper never chooses: guard phrasings get Compliance's refusal", () => {
  const S = fresh(), b = createBuilder(() => S);
  ["which stock should I buy", "what's a good ETF", "suggest something safer", "make me a portfolio", "top fund for my TFSA"].forEach((q) => assert.ok(String(b.helper(q).text).includes("can’t choose investments"), q));
});

test("her words into rows: '60% VFV and 40% ZAG in my TFSA' becomes a draft card; nothing saved until Use my mix", () => {
  const S = fresh(), b = createBuilder(() => S), before = JSON.stringify(S.target);
  const r = b.helper("60% VFV and 40% ZAG in my TFSA"); assert.ok(r.ask);
  const n = b.next(); assert.equal(n.acct, "TFSA"); assert.deepEqual(n.rows, [{ t: "VFV", w: 60 }, { t: "ZAG", w: 40 }]);
  assert.match(b.applyRows(n.acct, n.rows, n.replace), /^Done\. Check them in your TFSA/);
  assert.equal(JSON.stringify(S.target), before);
  assert.equal(b.total("TFSA"), 100); assert.ok(b.readyToSave());
  assert.equal(b.save(S), "You chose these yourself. Woodstock doesn’t review or recommend investments.");
  assert.equal(S.target.id, "custom"); assert.deepEqual(S.target.mixes.TFSA.map((x: any) => [x.ticker, x.weight]), [["VFV", 60], ["ZAG", 40]]);
});

test("a description matching several funds becomes a neutral A to Z choice", () => {
  const S = fresh(), b = createBuilder(() => S);
  const r = b.helper("100% S&P 500 fund in my RRSP"); assert.ok(r.ask);
  const n = b.next(); assert.ok(n.choose && n.choose.options.length > 1);
  const names = n.choose.options.map((o: any) => o.name); assert.deepEqual(names, names.slice().sort((x: string, y: string) => x.localeCompare(y)));
  const done = b.pick(n.choose.desc, n.choose.options[0].t); assert.equal(done.acct, "RRSP"); assert.equal(done.rows[0].w, 100);
});

test("Compliance 18:33: the cash line; the filter blocks opinion words", () => {
  const S = fresh(), b = createBuilder(() => S), cash = b.LIST.find((s: any) => s.cat === "cash");
  assert.equal(b.moves(cash), "Moves very little. Its yield can change. Not guaranteed, and not covered by CDIC.");
  assert.ok(b.bad("VFV is a solid pick for your TFSA.")); assert.ok(!b.bad("VFV holds the 500 largest US companies. Its fee is about 0.09% a year."));
});
