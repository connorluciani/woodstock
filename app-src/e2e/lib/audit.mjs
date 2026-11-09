/*
 * Text and DOM audits shared by every suite. Ported from the prototype suites in /home/claude/app/qa:
 *   BANNED, OUTSIDE_TICKERS  from cpass.py (Compliance banned-words list, CR8 additions)
 *   DEMO_WORDS, NEVER        from cr12demo.py (Compliance 19:24 item 5: transaction words need "(demo)")
 *   NON_REGISTERED           from Directive 01:41 (HXS, HXQ, HXT, HXDM, HBB only inside "More information")
 * Owner: RN QA. Change a rule only with a Compliance entry in decisions/inbox.md.
 */

/* cpass.py BANNED, verbatim except that JS regex has no variable-length lookbehind issues here (all fixed width). */
export const BANNED = [
  /financial planner/i, /financial advis/i, /wealth manag/i, /(?<!not a )(?<!no )\bguarantee/i, /risk[- ]free/i, /\bno risk\b/i,
  /can'?t lose/i, /nothing to worry/i,
  /(?<!not a )(?<!personal )(?<!not )(?<!never )(?<!does not )(?<!doesn.t )(?<!or a )(?<!review or )(?<!isn.t a )(?<!is not a )\brecommend/i,
  /people like you/i, /\bpopular\b/i, /best for you/i,
  /auto[- ]?invest/i, /set it and forget/i, /cash fund/i, /cash etf/i, /will grow to/i,
  /\b(I'?d|I would|you should|go with|we'?ll put|I'?ll put|let'?s put|put it in an?|keep it in an?|best (place|spot|option) (is|would be))\b[^.|]{0,30}\b(savings fund|savings etf|money market|GIC|short[- ]term bond)/i,
  /\b(I|we) (put|moved|placed|kept)\b[^.|]{0,40}\b(savings fund|savings etf|money market|GIC|short[- ]term bond)/i,
  /best (option|choice|pick|place) for you/i, /(?<!portfolio )(?<!which )\bsuits you\b/i, /right choice for you/i, /\bsafest choice\b/i,
  /you can'?t afford/i, /\boverspend/i, /over budget/i, /you shouldn'?t/i, /cut back on/i, /\bsplurge/i, /treat yourself/i,
  /Woodstock moves your/i, /we move your savings/i, /auto[- ]?save/i,
  /orders? (were |are )?sent to questrade(?! \(demo\))/i, /\ball orders filled\b/i, /sent to questrade(?! \(demo\))/i, /\b(executed|order filled|orders filled)\b/i,
  /charged automatically/i, /automatically (charged|billed|renew)/i, /auto[- ]?renew/i,
  /subscription[^.|\n]{0,40}\$\d+(?![^.|\n]{0,40}(plus tax|\+ ?tax))/i,
  /\b(AI|virtual|robo|digital)[- ]?(advis|planner|wealth)/i, /\bsave more\b/i, /you should save/i, /you could be saving/i, /\bmax(imi[sz]e)? out\b/i,
  /boost your savings/i, /aim higher/i, /great saver/i,
  /\b(good|right) (fit|match) for (this|your) goal/i, /too (soon|short) for (Conservative|Balanced|Growth|Aggressive)/i,
  /(goal|date) is (too )?(soon|short) for/i, /consider (switching|a different|moving)/i, /you (may|might) want to (switch|choose)/i,
  /so less tax each year/i, /pay no yearly distributions/i,
  /great (choice|pick)/i, /solid (pick|choice)/i, /too risky/i, /you should add/i, /\bdiversify\b/i, /\btrending\b/i, /top picks?/i, /\bstar rating/i,
  /your advis[oe]r says/i, /your planner says/i, /we manage your/i,
  /fits you/i, /I'd go with/i, /most people your age/i, /\bTSLA\b|tesla|bitcoin pick/i,
];

export const EM_DASH = /—/;
export const EN_DASH = /–/;

/* cpass.py OUTSIDE_TICKERS: never named anywhere in the app (CR2, D-01:31). */
export const OUTSIDE_TICKERS = /\b(XEQT|XGRO|VGRO|VBAL|VEQT|PSA|CSAV|HISA|TSLA|AAPL|BTC|ETH|QQQ|SPY)\b/;
/* D-01:41: non-registered funds appear only inside the More information sheet. */
export const NON_REGISTERED = /\b(HXS|HXQ|HXT|HXDM|HBB)\b/;

/* cr12demo.py: transaction words need "demo" on the same line; filled, executed or settled are never used. */
export const DEMO_WORDS = /\b(approved in questrade|done|moved|bought|sold|paid|charged|subscribed|deposited|withdrawn)\b/i;
export const NEVER = /\b(filled|executed|settled)\b/i;

/* Visible-text lines that would count as a "demo" completed transaction without the label. */
export function unlabelled(text) {
  const bad = [];
  for (const ln of String(text || "").split("\n")) {
    const s = ln.trim();
    if (!s) continue;
    if (NEVER.test(s)) bad.push("NEVER: " + s.slice(0, 90));
    else if (DEMO_WORDS.test(s) && !/demo/i.test(s) && !/^(Done|Not now|Close)$/.test(s)
      && !/\b(nothing|never|until you|only after|isn.t|aren.t|not|once you|when you|after you|if you)\b/i.test(s)) bad.push(s.slice(0, 90));
  }
  return bad;
}

/* Every banned pattern that hits, with the line it hit on (for the repro). */
export function bannedHits(text) {
  const hits = [];
  for (const ln of String(text || "").split("\n")) {
    for (const rx of BANNED) if (rx.test(ln)) hits.push(rx.source.slice(0, 40) + " :: " + ln.trim().slice(0, 100));
  }
  return hits;
}

export function dashHits(text) {
  return String(text || "").split("\n").filter((l) => EM_DASH.test(l) || EN_DASH.test(l)).map((l) => l.trim().slice(0, 100));
}

/* DOM audit run inside the page. Returns plain data; the suites decide what fails. */
export async function domAudit(page) {
  return page.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
    const selects = [...document.querySelectorAll("select")].length;
    const datalists = [...document.querySelectorAll("input[list], datalist")].length;
    const nativePickers = [...document.querySelectorAll('input[type="date"], input[type="month"], input[type="time"], input[type="datetime-local"]')].length;
    const de = document.documentElement;
    const wide = [...document.querySelectorAll("body *")].filter((e) => {
      if (!vis(e)) return false; const b = e.getBoundingClientRect();
      if (getComputedStyle(e).position === "fixed") return false;
      /* ignore content inside a horizontal scroller (carousels, chip rows) */
      for (let p = e.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden") return false; }
      return b.right > innerWidth + 1;
    }).slice(0, 5).map((e) => (e.getAttribute("data-testid") || e.tagName) + ": " + (e.innerText || "").slice(0, 40));
    /* text that is clipped by ellipsis is reported for the visual review, not failed */
    const truncated = [...document.querySelectorAll("div, span")].filter((e) => vis(e) && e.children.length === 0 && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).textOverflow === "ellipsis")
      .slice(0, 8).map((e) => (e.innerText || "").slice(0, 50));
    return { selects, datalists, nativePickers, scrollW: de.scrollWidth, clientW: de.clientWidth, wide, truncated, text: document.body.innerText };
  });
}
