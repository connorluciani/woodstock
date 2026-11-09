/* Ask about these portfolios, in Node: the Compliance cpass probes and PM-R29's twelve questions. */
import test from "node:test";
import assert from "node:assert/strict";
import { fresh } from "./helpers.ts";
import { createPortfolioChat } from "../src/pchat.ts";
import { compute } from "../src/bands.ts";

const PN = /Conservative|Balanced|Growth|Aggressive/;
function chat(h?: 1 | 5) { const S = fresh(); let shown: number | null = null; const c = createPortfolioChat(() => S, { horizon: h, onHorizon: (x) => { shown = x; } }); return { S, c, shown: () => shown }; }

test("her figures: all four, fixed order, from the band model", () => {
  const { S, c } = chat(); const F = c.figures();
  assert.ok(F.ok); assert.deepEqual(F.list.map((x: any) => x.name), ["Conservative", "Balanced", "Growth", "Aggressive"]);
  const b = compute(S, S.portfolios.find((p: any) => p.id === "growth"), { years: 1 })!;
  assert.equal(F.list[2].rough, b.p5); assert.ok(F.putIn > 20000);
});

test("cpass: pick, rank and confirm questions get Compliance's exact copy and all four", () => {
  const { c } = chat(); const F = c.figures();
  for (const q of ["Which should I pick?", "Just tell me which one", "Which is best for me?", "If you were me what would you do?", "Rank them from best to worst"]) {
    const r = c.reply(q); assert.ok(r.text.startsWith("I can’t choose for you, but I can help you decide."), q); assert.ok(r.four, q);
  }
  const r0 = c.reply("Which should I pick?"); F.list.forEach((x: any) => assert.ok(r0.text.includes("$" + x.off.toLocaleString("en-CA")), String(x.off)));
  for (const q of ["I need the money in 10 years, so Growth right?", "Is Aggressive too risky for me?"]) assert.ok(c.reply(q).text.startsWith("That’s your call, and I can’t say what’s right for you."), q);
  assert.ok(!/%/.test(c.reply("What did Growth return last year?").text));
  assert.equal(c.reply("Will it come back if it drops?").text, "Broad, diversified portfolios have recovered from past drops, sometimes over several years, but that’s history, not a promise. Selling during a drop locks in the loss.");
});

test("PM-R29: the twelve questions each get a specific reply; none is null", () => {
  const { c, shown } = chat();
  const A3 = ["Does this apply to all my goals?", "What happens to the money I already have?", "My house is in 5 years, what does a rough year mean for that?", "What does typical mean?",
    "What does rough mean, and how long is for a while?", "Why would I pick one over the other?", "Which one should I pick?", "What if markets drop right after I start?",
    "What are fees in dollars?", "What's a bond?", "Can I change later?", "Should I pay off my line of credit instead of investing?"];
  A3.forEach((q) => assert.ok(c.scripted(q), q));
  c.setHorizon(1); c.reset();
  const g = c.reply(A3[0]).text; ["First home", "Retirement", "Investing for later", "New York with Aaron"].forEach((n) => assert.ok(g.includes(n), n));
  const ex = c.reply(A3[1]).text; assert.match(ex, /Your \$[\d,]+ already invested/); assert.ok(ex.includes("Only new deposits") && ex.includes("Woodstock doesn’t recommend switching or staying."));
  const tf = c.reply(A3[2]); const F5 = c.figures();
  assert.equal(c.horizon(), 5); assert.equal(shown(), 5);
  F5.list.forEach((x: any) => assert.ok(tf.text.includes("$" + x.rough.toLocaleString("en-CA")), x.name));
  assert.ok(tf.text.includes("Woodstock’s general guide, the same for everyone") && tf.text.includes("Ontario Securities Commission"));
  assert.ok(!PN.test(tf.text.split(".")[0]));
  assert.match(c.reply(A3[4]).text, /For a while means months, and sometimes several years/);
  c.setHorizon(1);
  assert.match(c.reply(A3[8]).text, /^On about \$[\d,]+, the yearly fund fees would be about \$\d+ for Conservative, \$\d+ for Balanced, \$\d+ for Growth or \$\d+ for Aggressive/);
  const loc = c.reply(A3[11]); assert.equal(loc.text, "That’s a planning question; Talk it through can work it out with your numbers."); assert.ok(loc.talk);
  const miss = c.reply("What's the weather tomorrow?"); assert.ok(miss.text.startsWith("I can’t answer that one yet.")); assert.ok(miss.talk);
});

test("Compliance 18:33 wording: cash, the drop answer, the Not sure yet line; SYSTEM carries the holding-period rule", () => {
  const { c } = chat();
  assert.match(c.reply("What is cash in a portfolio?").text, /savings deposits or a savings fund/);
  assert.match(c.reply("What if it drops right after I start?").text, /each payday’s buy, which you approve, gets more units while prices are lower/);
  assert.equal(c.intro("notsure"), "No rush. Money for your long-term goals stays as cash until you choose. If it helps, ask me anything about the four.");
  assert.ok(c.SYSTEM.includes("never say which fits her goal"));
});

test("the live filter blocks steering and allows a plain explanation", () => {
  const { c } = chat();
  ["For you I'd go with Growth.", "Yes, Growth makes sense for a 10-year goal.", "Balanced is the safest of the four.", "It will come back, it always recovers."].forEach((t) => assert.ok(c.bad(t), t));
  assert.ok(!c.bad("A bond is a loan to a government or a company that pays interest. Bonds usually move less than stocks."));
});
