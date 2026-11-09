/* PWA basics (stage 1, owner lead): manifest, service worker, offline after one load, state survives a reload. */
import { open, skipToDemo, readState, settledState, waitScreen, sleep, until, topScreen } from "../lib/app.mjs";

export default async function pwa(run) {
  await run.test({ id: "pwa.manifest", title: "manifest loads and is installable", stage: 0, owner: "lead", profiles: ["i15-light"] }, async (t) => {
    await open(t);
    const m = await t.page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      if (!link) return { link: null };
      const r = await fetch(link.href); const j = r.ok ? await r.json() : null;
      const icons = j ? await Promise.all((j.icons || []).map(async (i) => ({ src: i.src, sizes: i.sizes, purpose: i.purpose, ok: (await fetch(new URL(i.src, link.href))).ok }))) : [];
      const touch = document.querySelector('link[rel="apple-touch-icon"]');
      return { link: link.getAttribute("href"), status: r.status, ctype: r.headers.get("content-type"), j, icons,
        touch: touch ? (await fetch(touch.href)).ok : false,
        theme: !!document.querySelector('meta[name="theme-color"]'),
        capable: !!document.querySelector('meta[name="apple-mobile-web-app-capable"], meta[name="mobile-web-app-capable"]'),
        viewport: (document.querySelector('meta[name="viewport"]') || {}).content || "" };
    });
    await t.check("manifest link present under /woodstock/", m.link && m.link.startsWith("/woodstock/"), m.link);
    await t.check("manifest fetches (200)", m.status === 200, String(m.status));
    const j = m.j || {};
    await t.check("start_url and scope are /woodstock/", j.start_url === "/woodstock/" && j.scope === "/woodstock/", `${j.start_url} ${j.scope}`);
    await t.check("display standalone, name Woodstock", j.display === "standalone" && /Woodstock/.test(j.name || ""), `${j.display} ${j.name}`);
    await t.check("192 and 512 icons plus a maskable icon, all fetch", m.icons.some((i) => i.sizes === "192x192") && m.icons.some((i) => i.sizes === "512x512") && m.icons.some((i) => /maskable/.test(i.purpose || "")) && m.icons.every((i) => i.ok), m.icons);
    await t.check("apple-touch-icon fetches", m.touch);
    await t.check("theme-color and home-screen meta present", m.theme && m.capable);
    await t.check("viewport-fit=cover (safe areas on iPhone)", /viewport-fit=cover/.test(m.viewport), m.viewport);
  });

  await run.test({ id: "pwa.sw", title: "service worker registers and the app opens offline after one load", stage: 0, owner: "lead", profiles: ["i15-light", "w375-dark"], sw: true }, async (t) => {
    await open(t, { sw: true });
    const reg = await t.page.evaluate(() => Promise.race([
      navigator.serviceWorker.ready.then((r) => ({ scope: r.scope, active: !!r.active })),
      new Promise((res) => setTimeout(() => res(null), 12000)),
    ]));
    if (!(await t.check("service worker registers (scope /woodstock/)", reg && /\/woodstock\/$/.test(reg.scope) && reg.active, reg))) return;
    t.step("reload once so the page is controlled");
    await t.page.reload({ waitUntil: "load" });
    await waitScreen(t.page);
    const controlled = await until(t.page, (p) => p.evaluate(() => !!navigator.serviceWorker.controller), 6000);
    await t.check("page is controlled by the service worker after one reload", controlled);
    const cached = await t.page.evaluate(async () => { const ks = await caches.keys(); const c = ks.find((k) => k.startsWith("woodstock-")); return c ? (await (await caches.open(c)).keys()).length : 0; });
    await t.check("precache holds the build", cached > 5, `${cached} entries`);
    t.step("go offline and reload");
    await t.ctx.setOffline(true);
    await t.page.reload({ waitUntil: "load" }).catch(() => {});
    let ok = true;
    try { await waitScreen(t.page, null, 12000); } catch { ok = false; }
    await t.check("app renders a screen offline", ok, await topScreen(t.page));
    await t.ctx.setOffline(false);
  });

  await run.test({ id: "pwa.persist", title: "state persists after a reload", stage: 0, owner: "lead" }, async (t) => {
    await skipToDemo(t);
    const s0 = await settledState(t.page);
    await t.check("Skip stores a state for the demo user", s0 && Array.isArray(s0.goals) && s0.goals.length > 0);
    t.step("reload");
    await t.page.reload({ waitUntil: "load" });
    await waitScreen(t.page);
    await sleep(500);
    await t.check("after a reload the app opens on Home, not onboarding", (await topScreen(t.page)) === "screen-home", await topScreen(t.page));
    const s1 = await readState(t.page);
    await t.check("state after the reload equals the state before it", JSON.stringify(s1) === JSON.stringify(s0));
  });
}
