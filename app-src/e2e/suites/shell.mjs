/* Shell checks on every screen (stage 1, owner per tab): the five tabs, no native select, no em or en dash,
   no banned words, no outside or non-registered tickers on the main screens, no horizontal overflow at
   390 and 375; Terms reachable from Settings; appearance persists. */
import { bannedHits, dashHits, domAudit, NON_REGISTERED, OUTSIDE_TICKERS } from "../lib/audit.mjs";
import { gotoTab, openProfile, skipToDemo, tap, waitScreen, visibleText, scrollToEnd, sleep, topScreen } from "../lib/app.mjs";

export const TABS = [
  /* owners from the OWNER headers in app/(tabs)/<tab>/index.tsx */
  { name: "Home", owner: "screens-a", stage: 0 },
  { name: "Plan", owner: "screens-a", stage: 0 },
  { name: "Money", owner: "screens-b", stage: 0 },
  { name: "Calendar", owner: "screens-b", stage: 0 },
  { name: "Messages", owner: "screens-b", stage: 0 },
];

export async function auditScreen(t, label, owner) {
  const a = await domAudit(t.page);
  await t.check(`${label}: no native select inputs`, a.selects === 0 && a.datalists === 0, `${a.selects} select, ${a.datalists} datalist`, { owner });
  await t.check(`${label}: no native date or time inputs`, a.nativePickers === 0, `${a.nativePickers}`, { owner });
  const d = dashHits(a.text);
  await t.check(`${label}: no em or en dash in visible text`, d.length === 0, d.slice(0, 3).join(" | "), { owner });
  const b = bannedHits(a.text);
  await t.check(`${label}: no banned words (cpass list)`, b.length === 0, b.slice(0, 3).join(" | "), { owner });
  const o = a.text.match(OUTSIDE_TICKERS);
  await t.check(`${label}: no outside tickers`, !o, o && o[0], { owner });
  const nr = a.text.match(NON_REGISTERED);
  await t.check(`${label}: no non-registered tickers outside More information`, !nr, nr && nr[0], { owner });
  await t.check(`${label}: no horizontal overflow at ${t.P.width}`, a.scrollW <= a.clientW && a.wide.length === 0, { scrollW: a.scrollW, clientW: a.clientW, wide: a.wide }, { owner });
  return a;
}

export default async function shell(run) {
  await run.test({ id: "shell.tabs", title: "five tabs render and pass the screen audits", stage: 0, owner: "lead" }, async (t) => {
    await skipToDemo(t);
    for (const tab of TABS) {
      await gotoTab(t, tab.name);
      await auditScreen(t, tab.name, tab.owner);
      await scrollToEnd(t.page);
      await auditScreen(t, tab.name + " (scrolled to the end)", tab.owner);
    }
  });

  await run.test({ id: "shell.terms", title: "Terms reachable from Settings", stage: 0, owner: "lead" }, async (t) => {
    await skipToDemo(t);
    await openProfile(t);
    await auditScreen(t, "Profile", "lead");
    const ok = await tap(t, /^\s*Terms and (conditions|disclosures)\s*$/i, { ids: ["profile-terms"], label: "Terms and conditions" });
    if (!(await t.check("Profile has a Terms row", ok))) return;
    await waitScreen(t.page, "screen-terms");
    const txt = await visibleText(t.page);
    await t.check("Terms open from Settings with numbered sections", /\b1\.\s/.test(txt) && /\b2\.\s/.test(txt), txt.slice(0, 120));
    await scrollToEnd(t.page);
    const all = await t.page.locator('[data-testid="screen-terms"]').last().innerText();
    await t.check("Terms have no bracketed placeholders or draft banner (PM-R63)", !/\[[^\]]{3,}\]/.test(all) && !/DRAFT FOR COUNSEL/i.test(all), (all.match(/\[[^\]]{3,}\]|DRAFT FOR COUNSEL/i) || [""])[0]);
    const d = dashHits(all);
    await t.check("Terms: no em or en dash", d.length === 0, d.slice(0, 3).join(" | "));
    await t.check("Terms: the $15 price line says plus tax", !/\$15 a month/.test(all) || /\$15 a month plus tax/.test(all));
  });

  await run.test({ id: "shell.appearance", title: "appearance choice persists after a reload", stage: 0, owner: "lead", profiles: ["i15-light"] }, async (t) => {
    await skipToDemo(t);
    await openProfile(t);
    if (!(await t.check("Appearance has a Dark option", await tap(t, /^\s*Dark\s*$/, { label: "Dark" })))) return;
    await sleep(500);
    await t.check("Dark applies at once", (await t.page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "dark");
    t.step("reload");
    await t.page.reload({ waitUntil: "load" });
    await waitScreen(t.page);
    await t.check("Dark survives a reload", (await t.page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "dark");
    const bg = await t.page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await t.check("dark body background is near black", /rgb\((\d|1\d|2\d), ?(\d|1\d|2\d), ?(\d|1\d|2\d)\)/.test(bg), bg);
    void topScreen;
  });
}
