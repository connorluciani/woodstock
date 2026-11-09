/* Sign-up to Home through the streamlined onboarding (stage 2, owner screens-a), docs/onboarding_streamline.md
   and Directives 21:21, 21:40, 22:26. Includes the "Before we start" gate: "I agree" is disabled until the end of
   the terms is reached, scrolling alone accepts nothing, nothing moves before "I agree". Port of cr13.py
   terms_onboarding_test plus the no-preselection rule (Directive 01:26 QA item, CR8 s6). */
import { auditScreen } from "./shell.mjs";
import { fill, isDisabled, open, readSession, readState, scrollTop, scrollToEnd, sleep, tap, topScreen, visibleText, waitScreen, cashById, holdingsKey } from "../lib/app.mjs";
import { saveShot } from "./visual.mjs";

/* Chip answers for Sam (onboarding_streamline 2.3), first match wins on each question. */
const CHIP_PREFS = [/^Yes, all of it$/, /^A trip$/, /^\$1,500$/, /^Nothing yet$/, /^A home$/, /^\$20,000$/, /^Retirement$/, /^\$50,000$/, /^1996$/, /^At 60$/, /^\$100$/, /^That's all( for now)?$/];

async function chips(page) {
  return page.evaluate(() => [...document.querySelectorAll('[role="button"]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && r.bottom <= innerHeight && r.top >= 0; })
    .map((e) => e.innerText.trim()).filter(Boolean));
}

export async function walkOnboarding(t, { onGate = null, questrade = "later", shots = false } = {}) {
  const seen = [];
  let last = "", same = 0;
  for (let i = 0; i < 70; i++) {
    const scr = await topScreen(t.page);
    if (scr === "screen-home") return { seen, home: true };
    const txt = await visibleText(t.page);
    const key = scr + "|" + txt.slice(0, 200);
    if (key === last) { if (++same > 3) return { seen, home: false, stuck: scr, text: txt.slice(0, 300) }; } else { same = 0; last = key; seen.push(scr); if (shots) await saveShot(t, "onb_" + String(seen.length).padStart(2, "0") + "_" + (scr || "unknown").replace(/^screen-/, "")); }
    if (/Before we start/.test(txt) && onGate) { await onGate(t); continue; }
    const P = t.page;
    if (await tap(t, /^\s*Get started\s*$/, { ids: ["welcome-start"] })) continue;
    if (/Create your account/.test(txt)) {
      if (await tap(t, /or use email/i, { exactButton: false })) { await fill(t, /email/i, "sam.lee@example.com"); await fill(t, /password/i, "demo-pass-1"); }
      if (await tap(t, /^\s*(Continue|Create account|Sign up)\s*$/)) continue;
      if (await tap(t, /Continue with Apple/)) continue;
    }
    if (/What should we call you/.test(txt)) { await fill(t, /first name/i, "Sam"); await fill(t, /last name/i, "Lee"); if (await tap(t, /^\s*Next\s*$/)) continue; }
    if (/Connect your bank/.test(txt) || /Sign in to /.test(txt)) {
      if (/Sign in to /.test(txt)) { await fill(t, /user ?name|card number|client/i, "samlee"); await fill(t, /password/i, "demo-pass-1"); if (await tap(t, /^\s*Connect\s*$/)) { await sleep(1800); continue; } }
      if (await tap(t, /Use a demo bank/i)) { await sleep(1500); continue; }
      if (await tap(t, /RBC/, { exactButton: false })) continue;
    }
    if (/Do you (already )?have a Questrade account/.test(txt)) {
      if (questrade === "later" && await tap(t, /Finish setting up later|Set it up later|^\s*No\s*$|Not now/)) continue;
      if (await tap(t, /^\s*Yes/)) continue;
    }
    if (/Pick your portfolio/.test(txt)) {
      if (onGate && onGate.portfolio) await onGate.portfolio(t);
      if (await tap(t, /^\s*Use this one\s*$/)) { await sleep(400); if (await tap(t, /I chose .* myself/)) continue; continue; }
    }
    if (await tap(t, /^\s*(Looks right|Looks good|Continue|Next|Done)\s*$/)) continue;
    /* interview: one chip per question */
    const cs = await chips(P);
    const pick = CHIP_PREFS.map((rx) => cs.find((c) => rx.test(c))).find(Boolean);
    if (pick && await tap(t, new RegExp("^\\s*" + pick.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$"))) { await sleep(600); continue; }
    /* a month chip (When do you need it?) */
    const month = cs.find((c) => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* ?\d{0,4}$/.test(c));
    if (month && await tap(t, new RegExp("^\\s*" + month + "\\s*$"))) continue;
    await sleep(500);
  }
  return { seen, home: false, stuck: await topScreen(t.page) };
}

export default async function onboarding(run) {
  await run.test({ id: "onboarding.signup", title: "sign-up reaches Home through the streamlined onboarding", stage: 2, owner: "screens-a" }, async (t) => {
    await open(t);
    let gate = false;
    const onGate = async (tt) => {
      if (gate) { await tap(tt, /^\s*I agree\s*$/, { ids: ["terms-agree"] }); return; }
      gate = true;
      const P = tt.page, s0 = await readState(P), ses0 = JSON.stringify(await readSession(P));
      await auditScreen(tt, "Before we start", "screens-a");
      const agree = /^\s*I agree\s*$/;
      await tt.check('"Before we start" has one "I agree" button', (await P.getByRole("button", { name: agree }).count()) >= 1);
      await tt.check('"I agree" is disabled on arrival', (await isDisabled(P, agree)) === true);
      const txt = await visibleText(P);
      for (const [rx, nm] of [[/\$15 a month plus tax/, "the price ($15 a month plus tax)"], [/Free for 30 days/i, "the free 30 days"], [/This is a demo/i, "the demo notice"]])
        await tt.check(`Before we start shows ${nm}`, rx.test(txt));
      await tt.check('no "5 a month" typo (D-21:23)', !/(?<![$\d])5 a month/.test(txt));
      tt.step("tap I agree before scrolling");
      await P.getByRole("button", { name: agree }).last().click({ force: true, timeout: 2000 }).catch(() => {});
      await sleep(500);
      await tt.check('tapping the disabled "I agree" does nothing', /Before we start/.test(await visibleText(P)));
      tt.step("scroll halfway");
      await scrollTop(P, 0.5);
      await tt.check('"I agree" still disabled halfway down', (await isDisabled(P, agree)) === true);
      await tt.check("nothing moved while on Before we start", holdingsKey(await readState(P)) === holdingsKey(s0) && JSON.stringify(cashById(await readState(P))) === JSON.stringify(cashById(s0)));
      tt.step("scroll to the end");
      await scrollToEnd(P);
      await tt.check('"I agree" enables at the end of the terms', (await isDisabled(P, agree)) === false);
      await tt.check("scrolling alone accepts nothing", JSON.stringify(await readSession(P)) === ses0 || !/termsAcceptedAt/.test(JSON.stringify(await readSession(P))));
      await tap(tt, agree, { ids: ["terms-agree"], label: "I agree" });
      await sleep(900);
      const ses = JSON.stringify(await readSession(P)) + JSON.stringify((await readState(P) || {}).user || {});
      await tt.check('"I agree" records the acceptance with a time', /termsAccepted(At)?"\s*:\s*"20\d\d-/.test(ses), ses.slice(0, 200));
      const s1 = await readState(P);
      await tt.check('nothing moved on "I agree"', s1 && s0 ? holdingsKey(s1) === holdingsKey(s0) && JSON.stringify(cashById(s1)) === JSON.stringify(cashById(s0)) : true);
    };
    onGate.portfolio = async (tt) => {
      const pre = await tt.page.evaluate(() => [...document.querySelectorAll('[aria-checked="true"], [aria-selected="true"]')].map((e) => e.innerText.slice(0, 40)).filter((x) => /Conservative|Balanced|Growth|Aggressive|All equity/.test(x)));
      await tt.check("Pick your portfolio: nothing preselected", pre.length === 0, pre);
      const n = await tt.page.getByRole("button", { name: /^\s*Use this one\s*$/ }).count();
      await tt.check("Pick your portfolio: every card has its own Use this one", n >= 3, String(n));
    };
    const r = await walkOnboarding(t, { onGate, shots: t.profile.startsWith("i15") });
    await t.check("sign-up reaches Home", r.home, r.home ? "" : `stuck on ${r.stuck}: ${r.text || ""}`);
    await t.check('the flow passes "Before we start" before Home', gate);
    if (!r.home) return;
    await t.check("onboarding stays short (at most 12 distinct screens before Home)", r.seen.length <= 12, r.seen.join(" > "));
    const s = await readState(t.page);
    await t.check("Home has a state with goals from the interview", s && (s.goals || []).length >= 1);
    await t.check("the new user is not Alandra (own name)", s && !/Alandra/.test(JSON.stringify(s.user || {})), JSON.stringify((s || {}).user || {}).slice(0, 120));
    const home = await visibleText(t.page);
    await t.check("Home shows a Finish setting up item when Questrade was skipped", /Finish setting up/i.test(home));
    await auditScreen(t, "Home after sign-up", "screens-a");
  });
}
