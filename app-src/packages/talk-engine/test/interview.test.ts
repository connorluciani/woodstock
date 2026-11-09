/* The goals interview, in Node: round 3 block F (her typed sentences, a correction, editing on the summary),
   round 4 ("The same one" with new numbers), Directive 18:25 (short-term default) and the summary against the engine. */
import test from "node:test";
import assert from "node:assert/strict";
import { fresh } from "./helpers.ts";
import { createInterview } from "../src/interview.ts";
import { budget } from "../src/env.ts";

/** A new user's state: the Skip profile's pay and bills, with no goals yet. */
function newUser(): any { const s = fresh(); s.goals = []; s.pendingBatch = null; return s; }

test("round 3 F: her sentences, the $9,000 safety net, New York with $725 saved, the condo's $6,000 saved and no date", () => {
  const S = newUser(), iv = createInterview(() => S, { embedded: true });
  iv.answer("I live with a roommate, Sam. My boyfriend Aaron has his own place.");
  assert.equal(iv.question().id, "net");
  iv.answer("Yes, I have about $9,000 in my RBC savings for emergencies.");
  const ef = iv.drafts().find((d: any) => d.key === "safety"); assert.equal(ef.target, 9000); assert.equal(ef.saved, 9000);
  iv.answer("Saving for a trip to New York with Aaron in April. Probably about $3,000.");
  assert.equal(iv.question().id, "saved");
  iv.answer("About $725 at RBC");
  if (iv.question().id === "by") iv.answer("Apr 2027", true);
  iv.answer("It can move a bit", true); iv.answer("New York with Aaron");
  const ny = iv.drafts().find((d: any) => d.name === "New York with Aaron");
  assert.equal(ny.saved, 725); assert.equal(ny.by, "2027-04-30"); assert.ok(ny.perPay < 200, String(ny.perPay));
  assert.equal(ny.keepIn, "savings_fund"); assert.equal(ny.keepBy, "default");
  assert.ok(iv.log().some((x: any) => /^Short-term goals start in a savings fund at Questrade/.test(x.text)));
  iv.answer("That’s it", true);
  iv.answer("I'd like to buy a condo in Toronto eventually, maybe in two or three years. I have about $6,000 in my FHSA already.");
  const cur = iv._iv().cur; assert.equal(cur.key, "home"); assert.equal(cur.saved, 6000); assert.ok(!cur.target); assert.ok(!cur.by);
  iv.answer("$40,000"); iv.answer("Dec 2028", true); iv.answer("It can move a bit", true); iv.answer("First home", true);
  assert.ok(iv.log().some((x: any) => x.text.startsWith("First home: $40,000 by December 2028, with $6,000 already saved")));
  // a correction updates the goal she means; no "First home 2"
  iv.answer("Wait, $6,000 is what I already have. I think I need more like $45,000 for a down payment, in two or three years.");
  const hm = iv.drafts().filter((d: any) => d.key === "home");
  assert.equal(hm.length, 1); assert.equal(hm[0].name, "First home"); assert.equal(hm[0].target, 45000); assert.equal(hm[0].saved, 6000);
  assert.ok(iv.log().some((x: any) => x.text.startsWith("Got it, I’ve changed it: First home: $45,000 by December 2028, with $6,000 already saved")));
  for (let i = 0; i < 6 && iv.question(); i++) { const q = iv.question(); iv.answer(q.chips.includes("Not sure yet") ? "Not sure yet" : q.chips.includes("Nothing yet") ? "Nothing yet" : "That’s it", true); }
  assert.ok(iv.isDone());
  // edit on the summary: amount, date, saved; a bad date is explained and nothing is saved
  iv.startEdit(hm[0].id);
  assert.equal(iv.saveEdit({ name: "First home", target: "40000", by: "June 2029", saved: "6165" }), null);
  const h2 = iv.drafts().find((d: any) => d.key === "home"); assert.equal(h2.target, 40000); assert.equal(h2.by, "2029-06-30"); assert.equal(h2.saved, 6165); assert.ok(h2.perPay < 600);
  iv.startEdit(h2.id); assert.match(String(iv.saveEdit({ by: "blursday" })), /^By: a month and year ahead/); iv.cancelEdit();
  assert.equal(iv.drafts().find((d: any) => d.key === "home").by, "2029-06-30");
  // commit: one figure, the engine's (round 3 #6); no goal she didn't ask for (#5)
  const Sum = iv.summary(); const r = iv.commit(S);
  assert.ok(r.added >= 3); assert.ok(!S.goals.some((g: any) => g.kind === "invest"));
  const b = budget(S)!; assert.ok(Math.abs(b.flexM - Sum.flexM) < 1, b.flexM + " vs " + Sum.flexM); assert.ok(Math.abs(b.save - Sum.perPay) < 0.6, b.save + " vs " + Sum.perPay);
  const h3 = S.goals.find((g: any) => g.kind === "home"); assert.equal(h3.target, 40000); assert.equal(h3.saved, 6165);
});

test("round 4 PM-R49 (h): the same goal with new numbers asks to update it, and updates; still one home goal", () => {
  const S = fresh(), iv = createInterview(() => S);
  iv.answer("Just me", true); iv.answer("Nothing in particular", true);
  iv.answer("A condo, I think I need about $40,000 by December 2029, and I have $6,000 saved");
  const q = iv.question(); assert.equal(q.id, "same"); assert.match(q.text, /You already have First home\. Another home, or the same one\?/);
  iv.answer("The same one", true);
  assert.equal(iv.question().text, "Update First home to $40,000 by December 2029, with $6,000 saved?");
  iv.answer("Update it", true); iv.answer("That’s it", true); iv.answer("Not sure yet", true);
  iv.commit(S);
  const homes = S.goals.filter((g: any) => g.kind === "home");
  assert.equal(homes.length, 1); assert.equal(homes[0].target, 40000); assert.equal(homes[0].by, "2029-12-31"); assert.equal(homes[0].saved, 6000);
});

test("PM-R16: a repeated trip asks 'Another trip, or the same one?'; the same one adds nothing; Lisbon starts in the savings fund", () => {
  const S = fresh(), iv = createInterview(() => S);
  iv.answer("Just me", true); iv.answer("A trip", true);
  assert.match(iv.question().text, /You already have New York with Aaron\. Another trip, or the same one\?/);
  iv.answer("The same one", true); assert.ok(!iv.drafts().some((d: any) => d.key === "trip"));
  iv.answer("Yes, something else", true); iv.answer("A trip", true); iv.answer("Another one", true);
  iv.answer("Lisbon"); iv.answer("$1,500"); iv.answer("Not yet", true); iv.answer("Feb 2027"); iv.answer("It can move a bit", true); iv.answer("Trip to Lisbon", true);
  iv.answer("That’s it", true); iv.answer("Nothing yet", true); iv.answer("Not sure yet", true);
  const sm = iv.summary(); assert.ok(sm.goals.some((g: any) => g.name === "Trip to Lisbon" && g.keepBy === "default"));
  iv.commit(S);
  const g = S.goals.find((x: any) => x.name === "Trip to Lisbon"); assert.equal(g.keepIn, "savings_fund"); assert.equal(g.keepBy, "default"); assert.ok(!g.invested);
  assert.equal(S.goals.filter((x: any) => x.kind === "trip").length, 2);
});

test("retirement worked back from the end, with the label and the 2-point lower line", () => {
  const S = newUser(), iv = createInterview(() => S, { embedded: true });
  iv.answer("Just me", true); iv.answer("Yes", true); iv.answer("Nothing in particular", true); iv.answer("Nothing yet", true);
  iv.answer("Retirement", true); iv.answer("Yes, roughly", true); iv.answer("$60,000", true);
  if (iv.question().id === "rAge") iv.answer("28", true);
  iv.answer("At 65", true);
  const il = iv.log().filter((x: any) => x.kind === "illus").pop();
  assert.match(il.text, /^To have about \$60,000 a year to live on from 65, in today’s dollars, you’d put in about \$[\d,]+ to \$[\d,]+ a month/);
  assert.ok(il.label.startsWith("Planning illustration, not a promise."));
  assert.ok(il.lines.some((l: string) => l.startsWith("If returns are 2 points lower")));
});
