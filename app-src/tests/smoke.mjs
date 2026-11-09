/*
 * Stage gate smoke test (mobile-lead). Serves dist/ under /woodstock/ and drives it in Chromium at
 * iPhone 15 size (390 x 844, touch, DPR 3). Fails on: any console error or page error, a missing
 * tab, horizontal overflow, an em or en dash in visible text, a missing manifest or service worker.
 * Run: npm run smoke (after npm run build:web). Screenshots: tests/shots/.
 * Screens engineers: add a flow to FLOWS below through a "SHELL PATCH" to the mobile lead, or add
 * tests/flows/<area>.mjs exporting `async function run(page, ctx)`; they run after the core checks.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { start } from "../scripts/serve.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const shots = path.join(root, "tests", "shots");
fs.mkdirSync(shots, { recursive: true });
const PORT = 8000 + Math.floor(Math.random() * 900);
const URL0 = `http://localhost:${PORT}/woodstock/`;
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); console.log((ok ? "PASS " : "FAIL ") + msg); };

const srv = await start(PORT);
const browser = await chromium.launch();
const themes = process.env.THEMES ? process.env.THEMES.split(",") : ["light", "dark"];
try {
  for (const theme of themes) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: theme, locale: "en-CA", timezoneId: "America/Toronto" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    if (theme === "dark") await page.addInitScript(() => { try { localStorage.setItem("ws.v1.theme", JSON.stringify("dark")); } catch (e) {} });

    const res = await page.goto(URL0, { waitUntil: "networkidle" });
    check(res && res.ok(), `[${theme}] loads ${URL0}`);
    await page.getByTestId("screen-welcome").waitFor({ timeout: 15000 });
    check(true, `[${theme}] welcome screen renders`);
    await page.screenshot({ path: path.join(shots, `${theme}_00_welcome.png`) });

    await page.getByTestId("welcome-skip").click();
    await page.getByTestId("screen-home").waitFor({ timeout: 15000 });
    check(true, `[${theme}] Skip lands on Home`);

    const tabs = ["home", "plan", "money", "calendar", "messages"];
    for (const [i, t] of tabs.entries()) {
      await page.getByTestId("tab-" + t).click();
      await page.getByTestId("screen-" + t).last().waitFor({ timeout: 10000 });
      await page.waitForTimeout(350);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(ov <= 0, `[${theme}] ${t}: no horizontal overflow (${ov})`);
      const text = await page.evaluate(() => document.body.innerText);
      check(!/[–—]/.test(text), `[${theme}] ${t}: no em or en dash in visible text`);
      await page.screenshot({ path: path.join(shots, `${theme}_${String(i + 1).padStart(2, "0")}_${t}.png`) });
    }

    /* profile, appearance, terms */
    await page.getByTestId("tab-home").click();
    await page.getByTestId("screen-home").getByTestId("avatar").click();
    await page.getByTestId("screen-profile").waitFor({ timeout: 10000 });
    await page.getByText("Terms and conditions").last().click();
    await page.getByTestId("screen-terms").waitFor({ timeout: 10000 });
    const terms = await page.getByTestId("screen-terms").innerText();
    check(/16\. /.test(terms) && !/\[/.test(terms), `[${theme}] Terms shows 16 sections and no bracketed placeholder`);
    await page.screenshot({ path: path.join(shots, `${theme}_07_terms.png`) });

    /* reload keeps the session (AsyncStorage) and returns to Home */
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("screen-terms").waitFor({ timeout: 15000 });
    await page.goto(URL0, { waitUntil: "networkidle" });
    await page.getByTestId("screen-home").waitFor({ timeout: 15000 });
    check(true, `[${theme}] reload keeps the route; a fresh load keeps the session and opens Home`);

    /* deep link under the subpath (GitHub Pages 404 fallback) */
    const deep = await page.goto(URL0 + "plan/", { waitUntil: "networkidle" });
    await page.getByTestId("screen-plan").waitFor({ timeout: 15000 });
    check(!!deep && deep.status() === 200, `[${theme}] deep link /woodstock/plan/ opens Plan with 200`);

    /* area flows from the screens engineers */
    const flowDir = path.join(root, "tests", "flows");
    if (fs.existsSync(flowDir)) {
      for (const f of fs.readdirSync(flowDir).filter((x) => x.endsWith(".mjs")).sort()) {
        try {
          const mod = await import(path.join(flowDir, f));
          await mod.run(page, { url: URL0, theme, check, shots });
        } catch (e) { check(false, `[${theme}] flow ${f}: ${e.message.split("\n")[0]}`); }
      }
    }

    check(errors.length === 0, `[${theme}] zero console errors${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""}`);
    await ctx.close();
  }

  const man = await fetch(URL0 + "manifest.webmanifest").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  check(man && man.display === "standalone" && man.start_url === "/woodstock/" && man.icons.length >= 2, "manifest: standalone, start_url /woodstock/, icons");
  const sw = await fetch(URL0 + "sw.js").then((r) => (r.ok ? r.text() : "")).catch(() => "");
  check(sw.includes("PRECACHE"), "service worker present");
  const icon = await fetch(URL0 + "icons/apple-touch-icon.png").then((r) => r.ok).catch(() => false);
  check(icon, "apple-touch-icon present");
} finally {
  await browser.close();
  srv.close();
}
console.log(fails.length ? `\nSMOKE FAIL: ${fails.length} check(s)` : "\nSMOKE PASS");
process.exit(fails.length ? 1 : 0);
