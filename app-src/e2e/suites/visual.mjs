/* Screenshots of every screen at 390 in light and dark for the visual review (RN QA reads each one with the
   Read tool and compares it with the prototype's screens). Saved to /home/claude/app/qa/rn_shots/. */
import fs from "node:fs";
import path from "node:path";
import { gotoTab, openProfile, skipToDemo, tap, waitScreen, scrollToEnd, scrollTop, sleep, open } from "../lib/app.mjs";

export const RN_SHOTS = process.env.RN_SHOTS || "/home/claude/app/qa/rn_shots";

export async function saveShot(t, name) {
  if (t.P.width !== 390) return null;
  fs.mkdirSync(RN_SHOTS, { recursive: true });
  const f = path.join(RN_SHOTS, `${name}_390_${t.P.scheme}.png`);
  await sleep(250);
  await t.page.screenshot({ path: f });
  return f;
}

export default async function visual(run) {
  await run.test({ id: "visual.screens", title: "screenshots of every screen", stage: 0, owner: "lead", profiles: ["i15-light", "i15-dark"] }, async (t) => {
    await open(t);
    await saveShot(t, "00_welcome");
    await tap(t, /^\s*Skip\s*$/, { ids: ["welcome-skip"] });
    await waitScreen(t.page, "screen-home");
    for (const [i, tab] of ["Home", "Plan", "Money", "Calendar", "Messages"].entries()) {
      await gotoTab(t, tab);
      await scrollTop(t.page, 0);
      await saveShot(t, `${String(i + 1).padStart(2, "0")}_${tab.toLowerCase()}`);
      await scrollToEnd(t.page);
      await saveShot(t, `${String(i + 1).padStart(2, "0")}_${tab.toLowerCase()}_end`);
      await scrollTop(t.page, 0);
    }
    await gotoTab(t, "Home");
    await openProfile(t);
    await saveShot(t, "07_profile");
    await scrollToEnd(t.page);
    await saveShot(t, "07_profile_end");
    if (await tap(t, /^\s*Terms and (conditions|disclosures)\s*$/i, { ids: ["profile-terms"] })) {
      await waitScreen(t.page, "screen-terms");
      await saveShot(t, "08_terms");
    }
    await t.check("screens captured", true, RN_SHOTS);
  });
}
