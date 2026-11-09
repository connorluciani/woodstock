/*
 * Drivers for the Woodstock RN web build. Selectors follow the testID contract in e2e/README.md first
 * (RN web renders testID as data-testid), then fall back to the visible copy from the prototype, so a test
 * keeps working when a screen has the copy but not yet the testID.
 */

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function open(t, { sw = false, path = "" } = {}) {
  t.step(`open ${path || "/woodstock/"}${sw ? " (service worker on)" : ""}`);
  await t.page.goto(t.url + path + (sw ? "?sw=1" : ""), { waitUntil: "load" });
  await waitScreen(t.page);
}

/* The topmost visible screen root ([data-testid^=screen-]). */
export async function screens(page) {
  return page.evaluate(() => [...document.querySelectorAll('[data-testid^="screen-"]')].filter((e) => {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && r.left < innerWidth && r.right > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  }).map((e) => e.getAttribute("data-testid")));
}
export async function topScreen(page) { const s = await screens(page); return s[s.length - 1] || null; }

export async function waitScreen(page, id = null, timeout = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const s = await screens(page).catch(() => []);
    if (id ? s.includes(id) : s.length) return true;
    await sleep(150);
  }
  if (id) throw new Error(`screen ${id} did not appear (visible: ${(await screens(page).catch(() => [])).join(", ") || "none"})`);
  throw new Error("no screen rendered within " + timeout + " ms");
}

/* Visible text of the whole page (open sheets and modals included). */
export async function visibleText(page) { return page.evaluate(() => document.body.innerText); }

export async function byId(page, id) {
  const l = page.locator(`[data-testid="${id}"]`);
  const n = await l.count();
  for (let i = n - 1; i >= 0; i--) if (await l.nth(i).isVisible()) return l.nth(i);
  return null;
}

/* Click the last visible button (or, failing that, any element) whose text or label matches rx. */
export async function tap(t, rx, { ids = [], label = null, exactButton = true, wait = 450 } = {}) {
  const page = t.page;
  for (const id of ids) { const el = await byId(page, id); if (el) { t.step(`tap [${id}]`); await el.click(); await sleep(wait); return true; } }
  const re = rx instanceof RegExp ? rx : new RegExp("^\\s*" + String(rx).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$");
  const cands = [page.getByRole("button", { name: re }), page.getByRole("tab", { name: re }), page.getByRole("link", { name: re }), page.getByRole("switch", { name: re })];
  if (!exactButton) cands.push(page.getByText(re));
  for (const l of cands) {
    const n = await l.count();
    for (let i = n - 1; i >= 0; i--) {
      const el = l.nth(i);
      if (await el.isVisible().catch(() => false)) {
        t.step(`tap "${label || (rx instanceof RegExp ? rx.source : rx)}"`);
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await el.click({ timeout: 4000 });
        await sleep(wait);
        return true;
      }
    }
  }
  return false;
}

export async function isDisabled(page, rx) {
  const l = page.getByRole("button", { name: rx });
  const n = await l.count();
  for (let i = n - 1; i >= 0; i--) {
    const el = l.nth(i);
    if (await el.isVisible().catch(() => false)) return el.evaluate((e) => e.getAttribute("aria-disabled") === "true" || e.hasAttribute("disabled") || getComputedStyle(e).pointerEvents === "none");
  }
  return null;
}

/* Fill the first visible text field whose placeholder or label matches rx. */
export async function fill(t, rx, value) {
  const page = t.page;
  for (const l of [page.getByPlaceholder(rx), page.getByLabel(rx), page.getByRole("textbox", { name: rx })]) {
    const n = await l.count();
    for (let i = 0; i < n; i++) if (await l.nth(i).isVisible().catch(() => false)) { t.step(`type "${value}" in ${rx.source}`); await l.nth(i).fill(String(value)); await sleep(120); return true; }
  }
  return false;
}

/* The persisted app state (AsyncStorage on web is localStorage; keys ws.v1.state.<userId>). */
export async function readState(page) {
  return page.evaluate(() => {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("ws.v1.state."));
    if (!keys.length) return null;
    try { return JSON.parse(localStorage.getItem(keys[keys.length - 1])); } catch (e) { return null; }
  });
}
export async function readSession(page) {
  return page.evaluate(() => { const o = {}; for (const k of Object.keys(localStorage)) if (k.startsWith("ws.v1.") && !k.startsWith("ws.v1.state.")) { try { o[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { o[k] = localStorage.getItem(k); } } return o; });
}
/* State is persisted on a 250 ms debounce (AppState.tsx); wait for it to settle. */
export async function settledState(page, ms = 700) { await sleep(ms); return readState(page); }

export const goalsByName = (s) => Object.fromEntries(((s && s.goals) || []).map((g) => [g.name, Math.round((Number(g.saved) || 0) * 100) / 100]));
export const cashById = (s) => Object.fromEntries(((s && s.accounts) || []).map((a) => [a.id, Math.round((Number(a.cash) || 0) * 100) / 100]));
export const holdingsKey = (s) => JSON.stringify(((s && s.accounts) || []).map((a) => [a.id, (a.holdings || []).map((h) => [h.ticker, h.units])]));

export async function skipToDemo(t) {
  await open(t);
  if (!(await tap(t, /^\s*Skip\s*$/, { ids: ["welcome-skip"], label: "Skip" }))) throw new Error("no Skip on the first screen");
  await waitScreen(t.page, "screen-home");
}

export async function gotoTab(t, name) {
  const ok = await tap(t, new RegExp("^\\s*" + name + "\\s*$", "i"), { ids: ["tab-" + name.toLowerCase()], label: name + " tab" });
  if (!ok) throw new Error(`no ${name} tab`);
  await waitScreen(t.page, "screen-" + name.toLowerCase());
  await sleep(300);
}

export async function openProfile(t) {
  if (!(await tap(t, /profile|account|avatar/i, { ids: ["avatar"], label: "avatar" }))) throw new Error("no avatar / profile control");
  await waitScreen(t.page, "screen-profile");
}

/* Scroll every scrollable ancestor of the visible "Before we start" text (or the topmost scroller) to a fraction. */
export async function scrollTop(page, frac) {
  await page.evaluate((f) => {
    const sc = [...document.querySelectorAll("div")].filter((e) => {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false;
      const o = getComputedStyle(e).overflowY; return (o === "auto" || o === "scroll") && e.scrollHeight > e.clientHeight + 20;
    });
    const s = sc[sc.length - 1]; if (!s) return;
    s.scrollTop = f >= 1 ? s.scrollHeight : s.scrollHeight * f; s.dispatchEvent(new Event("scroll", { bubbles: true }));
  }, frac);
  await sleep(400);
}
/* Scroll to the end in steps (RN ScrollView onScroll reports only real scroll events). */
export async function scrollToEnd(page) {
  for (const f of [0.25, 0.5, 0.75, 1, 1]) await scrollTop(page, f);
}

/* Wait until fn(page) is truthy or time runs out. */
export async function until(page, fn, timeout = 8000, every = 250) {
  const t0 = Date.now();
  let v;
  while (Date.now() - t0 < timeout) { v = await fn(page).catch(() => null); if (v) return v; await sleep(every); }
  return v;
}

/* If the "Before we start" gate is open, scroll to its end and agree. Returns what happened. */
export async function passTermsGate(t, { check = null } = {}) {
  const text = await visibleText(t.page);
  if (!/Before we start/.test(text)) return "none";
  if (check) await check(`"I agree" is disabled before scrolling to the end`, (await isDisabled(t.page, /^\s*I agree\s*$/)) === true);
  await scrollToEnd(t.page);
  if (!(await tap(t, /^\s*I agree\s*$/, { ids: ["terms-agree"], label: "I agree" }))) return "no-agree";
  await sleep(800);
  return "agreed";
}
