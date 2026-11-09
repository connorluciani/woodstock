/* Talk it through, in Node: the prototype's test_eng3.py cases through round 5 (honesty PM-R30, coverage PM-R15/R31,
   safety 18:52 and Compliance 18:58, round 3 to 5 fixes). */
import test from "node:test";
import assert from "node:assert/strict";
import { talkOn, cards, DASH, fresh } from "./helpers.ts";
import { budget, liveGoals } from "../src/env.ts";

const MISS = "I can’t help with that one yet.", CANT = "I couldn’t work that out yet", NOTRADE = "Selling is done from your Messages thread, where you approve each order.";
const GENERIC = /^I can work through a job offer|^I can help with/;
const TRADE = /tap approve|sale sent|account to sell from|sell for your withdrawal/i;

test("PM-R30: New York $4,000 gives two cards with before and after; nothing changes until Confirm", () => {
  const { S, t, ask } = talkOn();
  const before = JSON.stringify(S.goals);
  const r = ask("If the New York trip ends up costing $4,000 instead of $3,000, can I still go in April?");
  const c = cards(t, r);
  assert.equal(c.length, 2);
  assert.deepEqual(c[0].rows.slice(0, 2), [["Goal", "$3,000 → $4,000"], ["Every payday", "$175 → $275"]]);
  assert.match(c[1].rows.map((x: any) => x.join(" ")).join(" | "), /By April 2027 → July 2027/);
  assert.equal(JSON.stringify(S.goals), before);
  const ok = t.apply(S, c[0]); assert.ok(ok.ok);
  const ny = S.goals.find((g: any) => g.id === "ny"); assert.equal(ny.target, 4000); assert.equal(ny.perPay, 275); assert.equal(ny.by, "2027-04-30");
  assert.match(t.followUp(S, c[0]), /^Done\. New York with Aaron is updated/);
});

test("PM-R30: a reply that claims a change without a valid card becomes the honest line", () => {
  const { t } = talkOn();
  const r = t.finalize({ text: "Here’s what that changes. You’ll see the new pace on Home." });
  assert.ok(r.text.startsWith(CANT));
  const r2 = t.finalize({ text: "Done, I’ve updated it.", actions: [{ type: "goal_update", goal: "ny", target: 3000 }] }); /* no change, so no valid card */
  assert.ok(r2.text.startsWith(CANT));
});

test("P0 safety: no buy or sell card from Talk, ever; money out gets Compliance's line", () => {
  const { t, ask } = talkOn();
  for (const q of ["How much tax will I get back if I put $5,000 in my RRSP?", "Take $3,000 out of my TFSA", "I need $5,000 for a trip", "I need $5,000 out of my TFSA", "Sell my TFSA", "Withdraw $2,000 from my TFSA for a trip", "Buy more XEQT", "Move my RRSP into cash", "Put $3,000 in my FHSA", "Split it that way"]) {
    const r = ask(q);
    assert.ok(!(r.actions || []).some((a: any) => a.lines || a.orders || ["orders", "sell", "buy", "withdraw"].includes(a.type)), q);
    assert.ok(!TRADE.test(r.text || ""), q);
  }
  for (const q of ["Take $3,000 out of my TFSA", "Sell my TFSA"]) { const r = ask(q); assert.ok(r.text.startsWith(NOTRADE), q); assert.ok(r.chips.includes("Open Messages")); }
  const blocked = t.finalize({ text: "Your TFSA is the account to sell from. Tap Approve if you want the sale sent.", action: { title: "Sell for your withdrawal", lines: [{ side: "sell", ticker: "VFV", units: 2 }] } });
  assert.ok(blocked.text.startsWith(NOTRADE)); assert.equal(blocked.actions.length, 0);
});

test("Compliance 18:58: RRSP refund in Compliance's words, no card", () => {
  const { ask } = talkOn();
  const r = ask("How much tax will I get back if I put $5,000 in my RRSP?");
  assert.match(r.text, /^At your income, about \$[\d,]+ back \(an estimate from 2026 federal and Ontario rates; your real refund depends on your whole tax return\)\. You have \$7,500 of RRSP room this year\./);
  assert.equal((r.actions || []).length, 0);
});

test("routing: picks, a named fund, guarantee, unknown", () => {
  const { ask } = talkOn();
  assert.ok(ask("Which investments should I buy?").text.startsWith("I can’t pick investments; Woodstock isn’t registered to."));
  const pf = ask("Which portfolio should I pick?"); assert.ok(pf.chips.includes("Compare the four") && pf.chips.includes("Ask about these portfolios"));
  assert.equal(ask("Put my TFSA in XEQT").text, "I can’t pick investments; Woodstock isn’t registered to. You can change your portfolio, including Build my own, in Money.");
  assert.ok(ask("Is this a guarantee I'll reach my goals?").text.startsWith("No one can promise that."));
  const u = ask("What's the weather like tomorrow?"); assert.equal(u.text, "I can’t help with that one yet. Try asking it another way, or book a planner."); assert.ok(u.chips.includes("Book a planner"));
});

test("PM-R15 (d) and market discovery: 37 planner prompts, zero generic, miss, blocked or dashed replies", () => {
  const { ask } = talkOn();
  const P = ["I got a raise to $3,400 a pay", "I got a $5,000 bonus", "I'm moving out next spring", "I'm thinking of buying a car", "We're planning a wedding",
    "We're having a baby", "Should I pay off my line of credit or invest?", "I want to quit my job", "I'm going on parental leave in March", "I'm getting a $20,000 inheritance",
    "I want to retire at 55, is that realistic?", "I want to retire with $60,000 a year", "My rent is going up to $2,300", "I'm buying a $400 purse",
    "Should I contribute to my RRSP or TFSA?", "How much emergency fund do I need?", "I want to buy a house in 5 years", "What if I lose my job?",
    "Should I pay off my student loan?", "Can I afford a $1,200 laptop?", "How are my goals doing?", "My phone bill went up to $80",
    "When is the RRSP deadline and should I put money in?", "I get my tax refund in April, about $2,400. Where should it go?", "Can I share my First home goal with my partner?",
    "Aaron and I are moving in together. How do we split rent?", "I'm getting married next year, about $25,000.", "We're having a baby in 2028. What changes?",
    "I have a group RRSP at work with a 4% match. How does that fit?", "My RSUs vest in March, about $18,000. What do I do with them?", "I work shifts and my pay changes every two weeks.",
    "Can you see my Wealthsimple TFSA?", "I'm starting a new job in January at $110,000.", "Should I use the Home Buyers' Plan or my FHSA?", "Can I invite a friend?",
    "My firm pays a bonus in December. What should I do with it?", "How much tax will I get back if I put $5,000 in my RRSP?"];
  const bad = P.map((q) => [q, ask(q)] as const).filter(([, r]) => !r.text || r.text.startsWith(MISS) || r.text.startsWith(CANT) || r.text.startsWith(NOTRADE) || GENERIC.test(r.text) || r.menu || DASH.test(r.text));
  assert.deepEqual(bad.map(([q, r]) => q + " => " + String(r.text).slice(0, 80)), []);
});

test("line of credit versus investing: her numbers, Prime in plain words, two choice cards", () => {
  const { t, ask } = talkOn();
  const r = ask("Should I pay my line of credit off faster instead of investing?");
  assert.match(r.text, /\$57,854 at about 4\.45% \(it moves with your bank’s rate, called Prime, so it goes up and down\)/);
  const c = cards(t, r); assert.equal(c.length, 2);
  assert.equal(c[0].title, "Line of credit payment: $550 a month");
  assert.match(c[1].title, /Investing for later/);
  assert.match(r.table.foot, /illustration/i);
});

test("retirement: 55, 60, 65 and income a month; CPP and OAS named; the goal's own monthly figure", () => {
  const { S, ask } = talkOn();
  const r = ask("Am I saving enough for retirement?");
  const rows = r.table.rows.map((x: any) => x.l);
  assert.deepEqual(rows, ["By 55", "By 60", "By 65"]);
  assert.match(r.table.rows[2].s, /a month for 25 years/);
  assert.match(r.text, /Government pensions \(CPP and OAS\)/);
  const g = S.goals.find((x: any) => x.kind === "retirement"), m = Math.round(g.perPay * 26 / 12);
  assert.ok(r.text.includes("$" + m + " a month"), "monthly figure " + m);
  assert.ok(r.table.foot.startsWith("Planning illustration, not a promise."));
});

test("bill change: rent to $2,300 gives the bill card with the new left to spend", () => {
  const { S, t, ask } = talkOn();
  const r = ask("My rent is going up to $2,300"); const c = cards(t, r);
  assert.equal(c[0].title, "Rent: $2,300 a month");
  assert.deepEqual(c[0].rows[1], ["Left to spend a pay", "$657 → $565"]);
  t.apply(S, c[0]); assert.equal(S.bills.find((b: any) => b.id === "rent").amount, 2300);
  assert.match(t.followUp(S, c[0]), /^Done\. Your bills and debt payments are about/);
});

test("PM-R57: '$8,000 more a year' is about $200 a pay more, from January; Messages-style payReply reads it the same", () => {
  const { t, ask } = talkOn();
  const r = ask("My firm is giving first years a raise in January, about $8,000 more a year. What should I do with the extra money?");
  const pay = (r.actions || []).map((a: any) => (a.type === "dated" ? a.inner : a)).find((a: any) => a.type === "pay_update");
  assert.ok(pay && pay.amount >= 3200 && pay.amount <= 3300, String(pay && pay.amount));
  assert.match(r.text, /from your first January pay/); assert.match(r.text, /estimate/);
  assert.match(r.text, /New York with Aaron has \$[\d,]+ to go/);
  const m = t.payReply("I'm getting a raise in January, about $8,000 more a year");
  assert.ok(!m.action && /open Talk it through/.test(m.text));
});

test("PM-R57: a pay change above 50% asks first, unless she says per pay after tax", () => {
  const { t, ask } = talkOn();
  for (const q of ["I got a raise to $8,000 a pay", "My pay is now $9,000"]) { const r = ask(q); assert.equal((r.actions || []).length, 0, q); assert.ok(r.text.startsWith("Just to check: that would take your pay from $3,050"), q); }
  const r = t.reply("$8,000 a pay after tax");
  assert.ok((r.actions || []).some((a: any) => a.amount === 8000));
});

test("PM-R62: raise cards compute on the raised pay from January; confirming them changes nothing now", () => {
  const { S, t, ask } = talkOn();
  const b0 = budget(S)!, snap = JSON.stringify({ pay: b0.pay, goals: S.goals, bills: S.bills });
  const r = ask("My firm is giving first years a raise in January, about $8,000 more a year. What should I do with the extra money?");
  const c = cards(t, r);
  assert.equal(c.length, 4); assert.ok(c.every((x: any) => x.type === "dated" && x.button === "Set for January"));
  const loc = c.find((x: any) => /Line of credit payment/.test(x.title));
  assert.match(loc.rows[1][1], /^about \$860 → about \$660/);
  const ny = c.find((x: any) => /New York/.test(x.title));
  assert.match(ny.lead, /^Puts all \$200 a pay of the extra toward New York with Aaron from January; you’d reach \$3,000 by about [A-Z][a-z]{2} 2027 instead of Apr 2027/);
  assert.ok(!/keeps you on track/.test(ny.lead));
  c.forEach((x: any) => assert.ok(t.apply(S, x).ok));
  assert.equal(JSON.stringify({ pay: budget(S)!.pay, goals: S.goals, bills: S.bills }), snap);
  assert.equal(S.scheduledChanges.length, 4); assert.ok(S.scheduledChanges.every((x: any) => x.start === "2027-01-01"));
  assert.match(t.followUp(S, c[0]), /starts with your first January pay\. Nothing in your plan changes before then\./);
});

test("PM-R51: Aaron's birthday in January checks January and names the goal from her words", () => {
  const { t, ask } = talkOn();
  const r = ask("Aaron's birthday is in January and I want to spend about $300");
  assert.match(r.text, /^In January 2027 you get paid \d times\./); assert.ok(!/Nov 30/.test(r.text));
  const c = cards(t, r); assert.equal(c[0].title, "New goal: Aaron's birthday"); assert.deepEqual(c[0].rows[1], ["By", "January 2027"]);
  assert.equal(c[0].lead, "Tap Add goal to put it in your plan. You can change it any time.");
  const r2 = ask("$300 for Aaron's birthday in January"); assert.ok(cards(t, r2).some((x: any) => x.rows.some((y: any) => y[1] === "January 2027")));
});

test("round 3 (#7) and 18:52 (3): 'next year' asks for the month; her month becomes the date", () => {
  const { t, ask } = talkOn();
  const r = ask("I'm getting married next year, about $25,000.");
  assert.equal((r.actions || []).length, 0); assert.match(r.text, /in 2027/); assert.ok(r.chips.includes("Sep 2027"));
  const r2 = t.reply("Sep 2027"); assert.ok((r2.actions || []).some((a: any) => a.by === "2027-09-30"));
});

test("18:52 (4): an open question doesn't swallow an unrelated one", () => {
  const { t } = talkOn();
  t.reply("I'm buying a purse");
  const r = t.reply("Am I saving enough for retirement?");
  assert.match(r.text.toLowerCase(), /retirement/); assert.ok(!/purse/.test(r.text.toLowerCase()));
});

test("no reply anywhere uses an em or en dash", () => {
  const { ask } = talkOn();
  for (const q of ["What can you help with?", "I got a raise", "I'm choosing between a $95,000 and a $110,000 job", "Can I afford a $1,200 laptop?"]) assert.ok(!DASH.test(ask(q).text), q);
});

test("figures come from @woodstock/engine: the budget Talk quotes is the engine's", () => {
  const S = fresh(), b = budget(S)!;
  assert.equal(Math.round(b.leftPP), 657); assert.equal(Math.round(b.save), 1141);
  assert.ok(liveGoals(S).length >= 4);
});
