/*
 * Minimal Playwright harness for the RN web build (RN QA). No test-runner dependency: plain `playwright`
 * (already a devDependency) plus node. Each test gets a fresh browser context per device profile, a step
 * log that becomes the exact repro on failure, a screenshot on every failed check, and a zero-console-error
 * gate at the end.
 *
 * Stage gating: every test declares the build stage that delivers its feature (see STAGES). Tests for a later
 * stage than the one under test are reported as "pending", never as failures.
 */
import fs from "node:fs";
import path from "node:path";

export const STAGES = {
  /* CLAUDE.md "Stage order" */
  0: "app shell and design system (tabs, profile, terms, PWA)",
  1: "engine package with tests",
  2: "onboarding",
  3: "Home and payday approval flow",
  4: "Plan and goals",
  5: "Money and Calendar",
  6: "Messages and Talk (scripted)",
  7: "the rest",
};

export const PROFILES = {
  "i15-light": { width: 390, height: 844, scheme: "light", label: "iPhone 15, light" },
  "i15-dark": { width: 390, height: 844, scheme: "dark", label: "iPhone 15, dark" },
  "w375-light": { width: 375, height: 667, scheme: "light", label: "375 wide, light" },
  "w375-dark": { width: 375, height: 667, scheme: "dark", label: "375 wide, dark" },
};

/* Console noise that is not an app error. Keep this list short; every entry needs a reason. */
const CONSOLE_IGNORE = [
  /Download the React DevTools/i, /* dev-only banner */
];

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 70);

export class Run {
  constructor({ browser, url, stage, out, profiles, only }) {
    Object.assign(this, { browser, url, stage, out, profiles, only });
    this.results = [];
    this.failShots = path.join(out, "shots");
    fs.mkdirSync(this.failShots, { recursive: true });
  }

  async context(profile, { offlineCapable = false } = {}) {
    const P = PROFILES[profile];
    const ctx = await this.browser.newContext({
      viewport: { width: P.width, height: P.height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      colorScheme: P.scheme, locale: "en-CA", timezoneId: "America/Toronto",
      serviceWorkers: offlineCapable ? "allow" : "block",
    });
    /* the app's own theme preference defaults to light (theme.tsx); dark profiles set it before the first paint */
    if (P.scheme === "dark") await ctx.addInitScript(() => { try { if (!localStorage.getItem("ws.v1.theme")) localStorage.setItem("ws.v1.theme", JSON.stringify("dark")); } catch (e) {} });
    return ctx;
  }

  async test(meta, fn) {
    const { id, title, stage, owner, profiles = Object.keys(PROFILES), sw = false } = meta;
    if (this.only && !this.only.some((o) => id.includes(o))) return;
    for (const profile of profiles.filter((p) => this.profiles.includes(p))) {
      const base = { id, title, profile, stage, owner };
      if (stage > this.stage) { this.results.push({ ...base, status: "pending", name: title, detail: `stage ${stage} (${STAGES[stage]}) not delivered yet` }); continue; }
      const ctx = await this.context(profile, { offlineCapable: sw });
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error" && !CONSOLE_IGNORE.some((r) => r.test(m.text()))) errors.push("console: " + m.text().slice(0, 300)); });
      page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 300)));
      const steps = [];
      let n = 0;
      const t = {
        page, ctx, profile, P: PROFILES[profile], url: this.url, errors, run: this,
        step: (s) => { steps.push(s); },
        check: async (name, ok, detail = "", o = {}) => {
          const r = { ...base, owner: o.owner || owner, name, status: ok ? "pass" : "fail", detail: typeof detail === "string" ? detail : JSON.stringify(detail) };
          if (!ok) {
            const f = path.join(this.failShots, `${profile}_${slug(id)}_${++n}.png`);
            try { await page.screenshot({ path: f }); r.shot = f; } catch {}
            r.repro = `${PROFILES[profile].label} (${PROFILES[profile].width}x${PROFILES[profile].height}), fresh storage, ${this.url}: ` + (steps.length ? steps.join(" -> ") : "open the app");
          }
          this.results.push(r);
          process.stdout.write((ok ? "  PASS " : "  FAIL ") + `[${profile}] ${id}: ${name}` + (ok || !r.detail ? "" : `  [${r.detail.slice(0, 220)}]`) + "\n");
          return !!ok;
        },
        pending: (name, why) => { this.results.push({ ...base, name, status: "pending", detail: why }); process.stdout.write(`  PEND [${profile}] ${id}: ${name} (${why})\n`); },
      };
      try {
        await fn(t);
      } catch (e) {
        await t.check("runs to the end", false, String(e && e.message || e).split("\n")[0].slice(0, 400));
      }
      if (meta.consoleGate !== false) await t.check("zero console errors", errors.length === 0, errors.slice(0, 4).join(" | "), { owner: "lead" });
      await ctx.close();
    }
  }

  summary() {
    const c = { pass: 0, fail: 0, pending: 0 };
    for (const r of this.results) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }
}
