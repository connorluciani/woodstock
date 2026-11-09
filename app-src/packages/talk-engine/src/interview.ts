/* The goals interview engine (CR11 s1 and s3), ported from the prototype's interview.js (v7.3 round 5).
   One adaptive question at a time: life now; what she wants in 1, 3 and 10 years; for each goal what, how much,
   already saved, by when, how firm, and a name. Retirement starts from the end. Ends with "Here's what your goals
   need": each goal's per-pay amount and the total, with flexible spending from the engine's budget.
   Pure: no React. The UI (feature-talk InterviewView) renders log(), question() and summary(), and calls answer(),
   saveEdit(), remove(), commit(draft). Copy follows COMPLIANCE PATCH CR11 (inbox 14:41) and Compliance 18:33. */
import * as E from "./env.ts";
import { goalGroup } from "../../engine/src/goals.ts";

const num = E.num, cad0 = E.cad0, r10 = E.r10;

export function createInterview(getState: () => any, opts?: { embedded?: boolean }) {
  /* ---------- assumptions: one table (D-14:43); Engineer 2's projection.js owns it when loaded ---------- */
  var A0: any = { source: "FP Canada and Institute of Financial Planning, 2026 Projection Assumption Guidelines (April 2026)", inflation: 2.1,
    rates: { cash: 2.4, bond: 3.2, cad: 6.3, us: 6.4, intl: 6.6, em: 7.5 }, stressPts: 2 };
  function AS(): any { return { source: E.ASSUMPTIONS.source, inflation: E.ASSUMPTIONS.inflation, rates: E.ASSUMPTIONS.returns, stressPts: E.ASSUMPTIONS.stressPts }; }
  var LABEL = "Planning illustration, not a promise. Uses the FP Canada and Institute of Financial Planning 2026 assumptions (inflation 2.1%; average returns for your portfolio’s mix: cash 2.4%, bonds 3.2%, Canadian stocks 6.3%, US stocks 6.4%, international 6.6%, emerging 7.5%), less fund fees. Returns can be lower.";
  /* Compliance 18:33 item 2, exact: shown when a short-term goal is created and on the summary */
  var KEEP_DISC = "Short-term goals start in a savings fund at Questrade (a high-interest savings ETF), so the money can earn some interest. Woodstock sets this starting choice; it’s the same for every short-term goal and everyone. It isn’t a recommendation for you. Its price moves very little, the interest can change, and it isn’t covered by CDIC. Nothing is bought until you approve it. Change it any time in Where to keep it, including to uninvested cash.";
  var NOUN: any = { trip: "trip", purchase: "purchase", gift: "gift", wedding: "wedding", car: "car", school: "school goal", timeoff: "time off", kids: "education goal", home: "home" };
  /* a goal of the same type already in this interview or in her plan (PM-R16: "Another trip, or the same one?") */
  function repeatOf(d?: any): any {
    var K = KINDS[d.key]; if (!K || d.key === "retirement" || d.key === "invest") return null;
    var dr = IV.drafts.filter(function (x: any) { return x !== d && x.key === d.key && !IV.removed[x.id]; })[0]; if (dr) return { name: dr.name, draft: true, ref: dr };
    var lab = suggestName({ key: d.key, detail: "" }).toLowerCase();
    var ex = (st().goals || []).filter(function (g: any) { return !g.archived && (d.key === "trip" ? g.kind === "trip" : K.kind !== "other" ? g.kind === K.kind : String(g.name).toLowerCase().indexOf(lab) === 0); })[0];
    return ex ? { name: ex.name, draft: false, ref: ex } : null;
  }
  var YEARS_IN_RETIREMENT = 25; /* our own assumption, shown in the copy: the money lasts from retirement to about 90 */

  /* ---------- small helpers ---------- */
  var PPY: any = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };
  var MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function st(): any { return getState() || {}; }
  function nice(n?: any): any { return n >= 100000 ? Math.round(n / 5000) * 5000 : n >= 20000 ? Math.round(n / 1000) * 1000 : n >= 5000 ? Math.round(n / 500) * 500 : Math.round(n / 50) * 50; }
  function today(): any { return E.today(st()); }
  function iso(d?: any): any { return E.iso(d); }
  function monthEnd(y?: any, m?: any): any { return E.monthEnd(y, m); }
  function parseD(s?: any): any { return E.parseDate(s); }
  function monYear(s?: any): any { var d = parseD(s); return d ? MONL[d.getUTCMonth()] + " " + d.getUTCFullYear() : ""; }
  function monY3(s?: any): any { var d = parseD(s); return d ? MON3[d.getUTCMonth()] + " " + d.getUTCFullYear() : ""; }
  function haptic(k?: any): any { void k; }
  function income(): any { return E.income(st()); }
  function ppy(): any { return PPY[income().freq] || 26; }
  function m(): any { return ppy() / 12; }
  function budget(): any { return E.budget(st()); }
  function paydaysTo(by?: any): any { if (!by) return 0; return E.paydaysTo(st(), by); }
  function perPayFor(target?: any, saved?: any, by?: any): any { var n = Math.max(1, paydaysTo(by)); return Math.max(5, Math.ceil(Math.max(0, target - saved) / n / 5) * 5); }
  function payDate(n?: any): any { return E.payDate(st(), n); }
  function firstPay(): any { var d = parseD(income().next || "2026-11-20"); return d ? MON3[d.getUTCMonth()] + " " + d.getUTCDate() : "your next payday"; }

  /* "$3,000", "3k", "3 grand", "about 2500" -> number, else null */
  function money(t?: any): any {
    t = String(t || "").toLowerCase().replace(/,/g, "");
    var mm = /\$?\s?(\d+(?:\.\d+)?)\s*(k|grand|thousand)?\b/.exec(t); if (!mm) return null;
    var v = parseFloat(mm[1]) * (mm[2] ? 1000 : 1); return v > 0 ? v : null;
  }
  /* Round 3 (F): amounts she already has are "saved so far", never the target.
     "I have about $6,000 in my FHSA already" -> saved 6000; "need more like $40,000, I have $6,000" -> target 40000, saved 6000 */
  function amounts(t?: any): any {
    var re = /\$?\s?(\d[\d,]*(?:\.\d+)?)\s*(k|grand|thousand)?\b/gi, m, out: any[] = [], s0 = String(t || "");
    while ((m = re.exec(s0))) {
      var raw = m[0]; if (!/\$|k|grand|thousand/i.test(raw) && +m[1].replace(/,/g, "") < 100) continue; /* ages, years, "2 or 3" */
      if (/^\s*20\d\d$/.test(m[1]) && !/\$/.test(raw)) continue;
      var v = parseFloat(m[1].replace(/,/g, "")) * (m[2] ? 1000 : 1); if (!(v > 0)) continue;
      var before = s0.slice(Math.max(0, m.index - 40), m.index).toLowerCase(), after = s0.slice(m.index + raw.length, m.index + raw.length + 48).toLowerCase();
      var has = /\b(i have|i've got|i've saved|i already have|already have|already saved|saved|got|there'?s|sitting)\b[^.$]{0,14}$/.test(before) || /^[^.$]{0,30}\b(already|so far|saved|in my (fhsa|tfsa|rrsp|savings|esavings|account)|at rbc|in savings|is what i (already )?have|that i have)\b/.test(after);
      out.push({ v: v, saved: has });
    }
    return { target: (out.filter(function (x: any) { return !x.saved; })[0] || {}).v || null, saved: (out.filter(function (x: any) { return x.saved; })[0] || {}).v || null };
  }
  var CORRECT = /^\s*(wait|actually|no[,.!]|nope|sorry|oops|hold on|hang on)\b|\b(i meant|correction|is what i (already )?have|that's what i (already )?have|should be|change (it|that) to|more like|not \$?\d)/i;
  /* "April 2027", "Apr 27", "next summer", "in 6 months", "2028", "Later" -> ISO month end, or null */
  function month(t?: any): any {
    t = String(t || "").toLowerCase().trim(); var T = today(), y = T.getUTCFullYear();
    if (/later|no rush|someday|whenever|no date/.test(t)) return iso(monthEnd(y + 9, 11));
    if (/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*(or|to|-|and)\s*(\d{1,2}|two|three|four|five|six|seven|eight|nine|ten)\s+(month|year)s?\b/.test(t)) return null; /* "two or three years": she picks the month */
    var inM = /in\s+(\d{1,2}|a|one|two|three|four|five|six|seven|eight|nine|ten)\s+(month|year)s?/.exec(t);
    if (inM) { var w: any = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }[inM[1]] || +inM[1]; var add = /year/.test(inM[2]) ? w * 12 : w; var d0 = E.ymd(y, T.getUTCMonth() + add, 1); return iso(monthEnd(d0.getUTCFullYear(), d0.getUTCMonth())); }
    if (/next summer/.test(t)) return iso(monthEnd(y + 1, 7));
    if (/next (spring)/.test(t)) return iso(monthEnd(y + 1, 4));
    if (/next (fall|autumn)/.test(t)) return iso(monthEnd(y + 1, 9));
    if (/next (winter|christmas)|christmas|holidays/.test(t)) return iso(E.ymd(/next/.test(t) ? y + 1 : y, 11, 23));
    if (/next year/.test(t)) return iso(monthEnd(y + 1, 11));
    var mm = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?(?![a-z])\s*(?:'|20)?(\d{2})?\b/.exec(t), yy = /\b(20\d\d)\b/.exec(t);
    var mi = mm ? MON3.map(function (x: any) { return x.toLowerCase(); }).indexOf(mm[1].slice(0, 3)) : -1;
    var yr: any = yy ? +yy[1] : (mm && mm[2] ? 2000 + +mm[2] : null);
    if (mi < 0 && !yr) return null;
    if (mi < 0) mi = 11;
    if (!yr) { yr = y; if (monthEnd(yr, mi) < T) yr++; }
    var d = monthEnd(yr, mi); if (d < T) return null;
    return iso(d);
  }

  /* ---------- illustrations: FP Canada assumptions blended by a portfolio mix ---------- */
  function feeOf(mer?: any): any { var x = /([\d.]+)\s*%/.exec(String(mer || "")); return x ? Number(x[1]) : 0.15; }
  function rateFor(p?: any): any {
    var R = AS().rates, w = 0, r = 0; Object.keys(p.sleeves || {}).forEach(function (k: any) { var v = num(p.sleeves[k]); if (v > 0 && R[k] != null) { w += v; r += v * R[k]; } });
    if (!w) return null;
    var mid = r / w - feeOf(p.mer), low = mid - AS().stressPts, inf = AS().inflation / 100;
    return { name: p.name, mid: mid, low: low, realMid: (1 + mid / 100) / (1 + inf) - 1, realLow: (1 + low / 100) / (1 + inf) - 1 };
  }
  /* Her own portfolio after onboarding; during onboarding (no choice yet) all four, side by side with one method (Compliance s1: never "what if you switched") */
  function rateSet(): any {
    var S0 = st(), P = S0.portfolios || [], t = S0.target || {};
    if (!IV.embedded) { var mine = P.filter(function (p: any) { return p.id === t.id; })[0]; var rm = mine && rateFor(mine); if (rm) return { list: [rm], mine: true }; }
    var all = P.map(rateFor).filter(Boolean);
    if (!all.length) all = [{ name: "a balanced mix", mid: 5.2, low: 3.2, realMid: 1.052 / 1.021 - 1, realLow: 1.032 / 1.021 - 1 }];
    return { list: all, mine: false };
  }
  function nestEgg(annual?: any, real?: any): any { return real === 0 ? annual * YEARS_IN_RETIREMENT : annual * (1 - Math.pow(1 + real, -YEARS_IN_RETIREMENT)) / real; }
  function monthlyNeeded(target?: any, saved?: any, months?: any, real?: any): any {
    var i = Math.pow(1 + real, 1 / 12) - 1, g = Math.pow(1 + i, months), left = Math.max(0, target - saved * g);
    return i === 0 ? left / months : left * i / (g - 1);
  }
  function fv(monthly?: any, saved?: any, months?: any, real?: any): any { var i = Math.pow(1 + real, 1 / 12) - 1, g = Math.pow(1 + i, months); return saved * g + (i === 0 ? monthly * months : monthly * (g - 1) / i); }

  /* ---------- state ---------- */
  var IV: any = null;
  function fresh(embedded?: any): any {
    return { embedded: !!embedded, log: [], answers: {}, drafts: [], cur: null, horizon: 0, perH: {}, typing: false, done: false, committed: false,
      shortOpt: null, removed: {}, age: null, nAsked: 0, started: false, shown: 0, lastQ: null, patches: {}, awaitKind: null, horizonOf: horizonOf };
  }
  function ensure(): any { if (!IV) IV = fresh(true); if (!IV.started) start(); return IV; }
  function say(text?: any, extra?: any): any { IV.log.push(Object.assign({ from: "in", text: text, n: IV.nAsked }, extra || {})); }
  function hear(text?: any): any { IV.log.push({ from: "out", text: text, n: IV.nAsked }); }

  function existing(kind?: any): any { return (st().goals || []).filter(function (g: any) { return !g.archived && g.kind === kind; })[0] || null; }
  function hasKind(kind?: any): any { return !!existing(kind) || IV.drafts.some(function (d: any) { return d.kind === kind && !IV.removed[d.id]; }); }
  function knownAge(): any { var U = st().user || {}; if (IV.age) return IV.age; if (num(U.age) > 0) return num(U.age); if (U.ageFacts && num(U.ageFacts.age) > 0) return num(U.ageFacts.age); return null; }

  function start(): any {
    IV.started = true;
    var b = budget(), I = income();
    say("Let’s start with what you want. Then I’ll work out what each goal needs, one payday at a time.");
    if (b && b.pay > 0) {
      var freq = (E.FREQ_LABEL as any)[I.freq] || "every two weeks";
      say("I can see you take home " + cad0(b.pay) + " " + freq + ", and your bills and debt payments come to about " + cad0(b.essM + b.debtM) + " a month. I’ll plan from those.");
    }
  }

  /* ---------- goal kinds ---------- */
  var KINDS: any = {
    trip: { label: "A trip", kind: "trip", group: "near", amounts: [1500, 3000, 5000], ask: "Roughly how much for the whole trip?", detail: "Where to?", detailChips: ["Somewhere warm", "Visiting family", "Europe"] },
    purchase: { label: "Something big to buy", kind: "other", group: "near", amounts: [500, 1000, 2000], ask: "Roughly how much will it cost?", detail: "What is it?", detailChips: ["A laptop", "Furniture", "A bike"] },
    gift: { label: "A gift", kind: "other", group: "near", amounts: [200, 300, 500], ask: "About how much would you like to spend?", detail: "Who’s it for?", detailChips: ["Family", "My partner", "Friends"] },
    home: { label: "A home", kind: "home", group: "milestones", amounts: [20000, 40000, 60000], ask: "How much would you like for the down payment?" },
    wedding: { label: "A wedding", kind: "other", group: "milestones", amounts: [10000, 20000, 30000], ask: "Roughly how much for your share of the wedding?" },
    car: { label: "A car", kind: "other", group: "milestones", amounts: [5000, 10000, 20000], ask: "How much would you like to put toward the car?" },
    school: { label: "School", kind: "education", group: "milestones", amounts: [5000, 10000, 20000], ask: "Roughly how much will school cost?" },
    timeoff: { label: "Time off", kind: "other", group: "milestones", amounts: [3000, 6000, 10000], ask: "How much would you like set aside for the time off?" },
    kids: { label: "Kids’ education", kind: "education", group: "milestones", amounts: [10000, 20000, 40000], ask: "Roughly how much would you like to have for it?" },
    retirement: { label: "Retirement", kind: "retirement", group: "wealth" },
    invest: { label: "Investing for later", kind: "invest", group: "wealth" }
  };
  function kindOfText(t?: any): any {
    t = String(t || "").toLowerCase();
    if (/retire|rrsp|pension/.test(t)) return "retirement";
    if (/invest|for later|tfsa|wealth/.test(t)) return "invest";
    if (/kid|child|resp/.test(t) && /school|educat|universit|college/.test(t)) return "kids";
    if (/trip|travel|vacation|holiday|visit|flight|getaway/.test(t)) return "trip";
    if (/\bhome\b|house|condo|down ?payment|apartment to buy/.test(t)) return "home";
    if (/wedding|married|engage/.test(t)) return "wedding";
    if (/\bcar\b|vehicle|truck/.test(t)) return "car";
    if (/school|master|mba|degree|course|tuition|educat/.test(t)) return "school";
    if (/time off|sabbatical|leave|break/.test(t)) return "timeoff";
    if (/gift|present|secret santa|christmas|birthday/.test(t)) return "gift";
    return "purchase";
  }
  function detailFromText(t?: any, k?: any): any {
    t = String(t || "").trim();
    if (k === "trip") { var x = /\b(?:to|in)\s+([A-Za-z][A-Za-z .'-]{1,24})/.exec(t); return x ? cap1(x[1].replace(/\b(next|this|by|in)\b.*$/i, "").trim()) : ""; }
    if (k === "purchase") { var y = t.replace(/^(i want to |i'd like to |i need to )?(buy|get|save for)\s+/i, "").replace(/^(a|an|some|my|the)\s+/i, "").replace(/\$?\d[\d,]*(k)?/g, "").trim(); return y && y.length < 28 ? y.toLowerCase() : ""; }
    return "";
  }
  function cap1(s?: any): any { s = String(s || "").trim(); return s.charAt(0).toUpperCase() + s.slice(1); }
  function suggestName(d?: any): any {
    var k = d.key, x = d.detail || "";
    if (k === "trip") return x && !/somewhere|visiting/i.test(x) ? "Trip to " + cap1(x) : /visiting family/i.test(x) ? "Trip to see family" : "Trip";
    if (k === "purchase") return x ? cap1(x.replace(/^(a|an)\s+/i, "")) : "Big purchase";
    if (k === "gift") return x ? "Gift for " + x.replace(/^my /i, "").toLowerCase() : "Gift";
    if (k === "home") return "First home"; if (k === "wedding") return "Wedding"; if (k === "car") return "Car"; if (k === "school") return "School";
    if (k === "timeoff") return "Time off"; if (k === "kids") return "Kids’ education";
    return KINDS[k] ? KINDS[k].label : "Goal";
  }
  function dateChips(h?: any): any {
    var T = today(), y = T.getUTCFullYear(), mo = T.getUTCMonth(), out: any[] = [];
    if (h === 1) [3, 6, 9, 12].forEach(function (a: any) { var d = E.ymd(y, mo + a, 1); out.push(MON3[d.getUTCMonth()] + " " + d.getUTCFullYear()); });
    else if (h === 3) out = ["Dec " + (y + 1), "Jun " + (y + 2), "Dec " + (y + 2), "Dec " + (y + 3)];
    else [5, 7, 10].forEach(function (a: any) { out.push("Dec " + (y + a)); });
    return out.filter(function (v: any, i: any, a: any) { return a.indexOf(v) === i; });
  }

  /* ---------- the question engine: one question at a time, from what she has told us ---------- */
  var HZ = [
    { h: 1, q: "What would you like to do or buy in the next 12 months?", chips: ["trip", "purchase", "gift"], none: "Nothing in particular", more: "Anything else in the next 12 months?" },
    { h: 3, q: "Looking a bit further, about 3 years out. Anything bigger on your mind?", chips: ["home", "wedding", "car", "school", "timeoff"], none: "Nothing yet", more: "Anything else in the next few years?" },
    { h: 10, q: "And 10 years or more from now?", chips: ["retirement", "invest", "home", "kids"], none: "Not sure yet", more: "Anything else for the long term?" }
  ];
  function safetyTarget(): any { var b = budget(); return b ? Math.max(1000, Math.ceil((b.essM + b.debtM) * 2 / 500) * 500) : 5000; }

  function question(): any {
    var A = IV.answers;
    if (A.who == null) return { id: "who", text: "First, life right now. Who’s at home with you?", chips: ["Just me", "A partner", "A partner and kids", "Roommates", "Family"], input: "text" };
    if (A.net == null && !existing("emergency")) return { id: "net", text: "If your pay stopped for a while, could you cover two months of bills from savings?", chips: ["Yes", "About a month", "Not yet"], input: "text" };
    if (A.net && A.net !== "Yes" && A.netWhen == null) return { id: "netWhen", text: "Two months of bills is about " + cad0(safetyTarget()) + ". That’s your safety net. When would you like it in place?", chips: ["In 6 months", "In a year", "In 2 years", "Not now"], input: "month" };
    if (IV.pendUpd) { var U = IV.pendUpd, o2 = U.ref, t2 = U.f.target != null ? U.f.target : o2.target, b2 = U.f.by || o2.by, s2 = U.f.saved != null ? U.f.saved : o2.saved;
      return { id: "upd", text: "Update " + o2.name + " to " + cad0(t2) + (b2 ? " by " + monYear(b2) : "") + (num(s2) > 0 ? ", with " + cad0(s2) + " saved" : "") + "?", chips: ["Update it", "Keep it as it was"], input: "text" }; }
    var d = IV.cur;
    if (d) return goalQuestion(d);
    while (IV.horizon < HZ.length) {
      var H = HZ[IV.horizon], seen = IV.perH[H.h] || 0;
      if (A["hz" + H.h] === "none" || A["hz" + H.h] === "done" || seen >= 3) { IV.horizon++; continue; }
      var chips = H.chips.filter(function (k: any) { return !((k === "retirement" || k === "invest" || k === "home") && hasKind(KINDS[k].kind)); }).map(function (k: any) { return KINDS[k].label; });
      if (seen === 0) return { id: "hz", h: H.h, text: H.q, chips: chips.concat([H.none]), input: "text" };
      if (IV.awaitKind === H.h) return { id: "hz", h: H.h, text: "What is it?", chips: chips, input: "text" };
      return { id: "hz", h: H.h, more: true, text: H.more, chips: ["Yes, something else", "That’s it"], input: "text" };
    }
    return null;
  }
  function goalQuestion(d?: any): any {
    var K = KINDS[d.key];
    if (d.key === "retirement") return retireQuestion(d);
    if (d.key === "invest") { if (d.monthly == null) return { id: "comfort", text: "How much are you comfortable putting toward it each month?", chips: ["$50", "$100", "$200", "$300"], input: "money" }; return null; }
    if (d.same == null) { var rp = repeatOf(d); if (rp) return { id: "same", text: "You already have " + rp.name + ". Another " + (NOUN[d.key] || "goal") + ", or the same one?", chips: ["Another one", "The same one"], input: "text", rp: rp }; d.same = false; }
    if (K.detail && d.detail == null) return { id: "detail", text: K.detail, chips: K.detailChips, input: "text" };
    if (d.target == null) return { id: "amount", text: K.ask, chips: K.amounts.map(cad0).concat(["Not sure"]), input: "money" };
    if (!d.savedAsked) return { id: "saved", text: "Already saved anything for it?", chips: ["Not yet", "$500", "$1,000"], input: "money" };
    if (d.by == null) return { id: "by", text: "By when? A month and year is perfect.", chips: dateChips(IV.horizonOf(d)), input: "month" };
    if (d.flex == null) return { id: "flex", text: "How firm is that date?", chips: ["It’s fixed", "It can move a bit", "Whenever it fits"], input: "text" };
    if (d.name == null) return { id: "name", text: "Last thing: what should we call it?", chips: [suggestName(d)], input: "text" };
    return null;
  }
  function retireQuestion(d?: any): any {
    if (d.know == null) return { id: "rKnow", text: "Let’s start with the end in mind. Do you know how much you’d like to have when you retire?", chips: ["Yes, roughly", "Not really"], input: "text" };
    if (d.know && d.annual == null && d.lump == null) return { id: "rIncome", text: "About how much a year would you like to live on, in today’s dollars?", chips: ["$40,000", "$50,000", "$60,000", "$80,000"], input: "money" };
    if (knownAge() == null) return { id: "rAge", text: "How old are you now? It sets how many years you have.", chips: ["25", "28", "30", "35", "40"], input: "text" };
    if (d.stopAt == null) return { id: "rStop", text: "And when would you like to stop working?", chips: ["At 60", "At 65", "Not sure"], input: "text" };
    if (d.know && d.need && d.use == null && d.affordable) return { id: "rUse", text: "Want to put about " + cad0(d.need.mine) + " a month toward it?", chips: ["Yes, " + cad0(d.need.mine) + " a month", "Choose my own amount"], input: "text" };
    if (d.monthly == null) return { id: "comfort", text: "How much are you comfortable putting toward it each month?", chips: ["$100", "$200", "$300", "$500"], input: "money" };
    return null;
  }

  /* room for one more goal: what's left after bills, debt, every goal so far and her usual spending (a month) */
  function roomMonthly(exceptId?: any): any {
    var b = budget(); if (!b) return 0;
    var goalsM = plannedGoals().filter(function (g: any) { return g.id !== exceptId; }).reduce(function (s: any, g: any) { return s + g.monthly; }, 0);
    return b.incomeM - b.essM - b.debtM - goalsM - (st().spending ? b.usualEv : 0);
  }

  /* ---------- answering ---------- */
  function answer(raw?: any, fromChip?: any): any {
    var Q = question(); if (!Q) return false;
    raw = String(raw || "").trim(); if (!raw) return false;
    IV.log.push({ from: "in", text: Q.text, n: IV.nAsked, kind: "q" }); IV.shown = IV.log.length; /* the question stays in the thread */
    var reply = handle(Q, raw, fromChip);
    if (reply === false) return true; /* re-ask: handle() already said why */
    IV.nAsked++;
    if (!question()) finish();
    return true;
  }
  function retry(Q?: any, raw?: any, why?: any): any { hear(raw); say(why); IV.nAsked++; return false; }
  function handle(Q?: any, raw?: any, chip?: any): any {
    var A = IV.answers, d = IV.cur, v;
    if (!chip && CORRECT.test(raw) && Q.id !== "who" && Q.id !== "rAge") { var fx = correct(raw); if (fx) return fx; }
    switch (Q.id) {
      case "who":
        hear(raw); A.who = raw; say(/kid/i.test(raw) ? "Got it. I’ll keep the kids in mind as we go." : /partner/i.test(raw) ? "Got it, the two of you." : "Got it.");
        return true;
      case "net":
        hear(raw); A.net = /^y|yes|2|two|more/i.test(raw) ? "Yes" : /month|one|1/i.test(raw) ? "About a month" : "Not yet";
        var netAmt = amounts(raw); netAmt = netAmt.saved || netAmt.target; /* round 3: "about $9,000" is $9,000, not the two-month estimate */
        if (A.net === "Yes") { var nt0 = netAmt >= 100 ? Math.round(netAmt) : safetyTarget(); addDraft({ key: "safety", name: "Emergency fund", kind: "emergency", group: "safety", target: nt0, saved: nt0, by: null, perPay: 0, flex: "fixed", full: true }); say("Good. That’s your safety net" + (netAmt >= 100 ? ", " + cad0(nt0) + "," : "") + " and it’s already in place."); }
        else if (netAmt >= 100) IV.netSaved = Math.round(netAmt);
        return true;
      case "netWhen":
        if (/not now|skip|later/i.test(raw)) { hear(raw); A.netWhen = "skip"; say("OK, we’ll leave it for now. You can add it any time."); return true; }
        v = month(raw) || month(raw.replace(/^in /i, "in ")); if (!v) return retry(Q, raw, "Just so I get it right: by which month? For example, November 2027.");
        hear(raw); A.netWhen = v;
        var tgt = safetyTarget(), sv = IV.netSaved != null ? Math.min(IV.netSaved, tgt - 50) : A.net === "About a month" ? Math.round(tgt / 2) : 0;
        var g = addDraft({ key: "safety", name: "Emergency fund", kind: "emergency", group: "safety", target: tgt, saved: sv, by: v, perPay: perPayFor(tgt, sv, v), flex: "some" });
        say("That’s about " + cad0(g.perPay) + " a payday until " + monYear(v) + ", starting " + firstPay() + ".");
        return true;
      case "hz":
        hear(raw);
        if (Q.more) { if (/^(no|nope|that|that.s it|done|nothing)/i.test(raw)) { A["hz" + Q.h] = "done"; IV.horizon++; say(nextHorizonLine(Q.h)); return true; } if (/^yes|something|another/i.test(raw)) { IV.awaitKind = Q.h; return true; } }
        var H = HZ.filter(function (x: any) { return x.h === Q.h; })[0];
        if (!IV.awaitKind && new RegExp("^(" + H.none + "|nothing|no|nope|not sure|none)", "i").test(raw)) { A["hz" + Q.h] = "none"; IV.horizon++; say(nextHorizonLine(Q.h)); return true; }
        IV.awaitKind = null;
        var key = Object.keys(KINDS).filter(function (k: any) { return KINDS[k].label === raw; })[0] || kindOfText(raw);
        if ((key === "retirement" || key === "invest") && hasKind(KINDS[key].kind)) { say("You already have " + (existing(KINDS[key].kind) || {}).name + " in your plan, so we’ll keep it as it is."); return true; }
        var nd: any = { key: key, kind: KINDS[key].kind, group: KINDS[key].group, h: Q.h, saved: 0 };
        if (!chip) { var dt = detailFromText(raw, key); if (dt) nd.detail = dt; var am = amounts(raw); if (key !== "retirement" && key !== "invest") { if (am.target) nd.target = am.target; if (am.saved) { nd.saved = am.saved; nd.savedAsked = true; } } var by0 = month(raw); if (by0 && /\b(by|in|before|for)\b/i.test(raw)) nd.by = by0; }
        if (!KINDS[key].detail) nd.detail = "";
        IV.perH[Q.h] = (IV.perH[Q.h] || 0) + 1; IV.cur = nd;
        say(key === "retirement" ? "Retirement. Good one to start early." : key === "invest" ? "Investing for later. Money you can use for anything down the road." : nd.saved ? "Nice. I’ll count the " + cad0(nd.saved) + " you already have as saved so far. A few quick questions on it." : "Nice. A few quick questions on it.");
        return true;
      case "same":
        hear(raw);
        if (/same|that one|it.?s the same|already/i.test(raw) && !/another|new|different|second/i.test(raw)) {
          /* PM-R49 (h): the same goal with new numbers is an update she confirms, never a discard */
          var o = Q.rp.ref || {}, nf: any = {};
          if (d.target && Math.abs(num(d.target) - num(o.target)) >= 1) nf.target = Math.round(d.target);
          if (d.saved && Math.abs(num(d.saved) - num(o.saved)) >= 1) nf.saved = Math.round(d.saved);
          if (d.by && d.by !== o.by) nf.by = d.by;
          IV.cur = null;
          if (Object.keys(nf).length) { IV.pendUpd = { ref: o, draft: Q.rp.draft, f: nf }; return true; }
          say(Q.rp.draft ? "OK, I’ll keep the one you already added: " + Q.rp.name + "." : "OK, " + Q.rp.name + " is already in your plan, so I’ll leave it as it is. You can change it in Plan."); return true; }
        d.same = true; say("Got it, another one."); return true;
      case "upd":
        hear(raw); var U3 = IV.pendUpd; IV.pendUpd = null;
        if (/keep|no\b|as it was/i.test(raw) && !/update/i.test(raw)) { say("OK, " + U3.ref.name + " stays as it was."); return true; }
        if (U3.draft) { Object.keys(U3.f).forEach(function (k: any) { U3.ref[k] = U3.f[k]; }); U3.ref.savedAsked = true; if (U3.ref.target && U3.ref.by) U3.ref.perPay = perPayFor(U3.ref.target, U3.ref.saved || 0, U3.ref.by); say("Updated: " + U3.ref.name + ": " + cad0(U3.ref.target) + " by " + monYear(U3.ref.by) + (U3.ref.saved ? ", with " + cad0(U3.ref.saved) + " already saved" : "") + ", about " + cad0(U3.ref.perPay) + " a payday.", { kind: "goal" }); }
        else { var P3 = Object.assign({}, IV.patches[U3.ref.id] || {}, U3.f), t3 = P3.target != null ? P3.target : U3.ref.target, b3 = P3.by || U3.ref.by, s3 = P3.saved != null ? P3.saved : num(U3.ref.saved); if (t3 && b3) P3.perPay = perPayFor(t3, s3, b3); IV.patches[U3.ref.id] = P3; say("Updated: " + U3.ref.name + " will be " + cad0(t3) + (b3 ? " by " + monYear(b3) : "") + " when you add your goals.", { kind: "goal" }); }
        return true;
      case "detail":
        hear(raw); d.detail = raw.replace(/^(a|an)\s+/i, "").slice(0, 30); return true;
      case "amount":
        if (/not sure|no idea|don.?t know/i.test(raw)) { hear(raw); d.target = KINDS[d.key].amounts[1]; d.guessed = true; say("I’ll use " + cad0(d.target) + " for now. You can change it any time."); return true; }
        var am2 = chip ? { target: money(raw), saved: null } : amounts(raw); v = am2.target;
        if (!(v >= 20) && am2.saved) { hear(raw); d.saved = am2.saved; d.savedAsked = true; say("Got it, " + cad0(am2.saved) + " already saved. And how much would you like in total?"); return false; }
        if (!(v >= 20)) return retry(Q, raw, "Just a number is fine, like 3000, or tap Not sure.");
        hear(chip ? raw : cad0(v)); d.target = Math.round(v); if (am2.saved) { d.saved = am2.saved; d.savedAsked = true; } return true;
      case "saved":
        if (/^(no|not yet|nothing|none|zero|\$?0)\b/i.test(raw.trim())) { hear(raw); d.saved = 0; d.savedAsked = true; return true; }
        v = money(raw); if (v == null) return retry(Q, raw, "An amount is fine, like 500, or tap Not yet.");
        hear(chip ? raw : cad0(v)); d.saved = Math.round(v); d.savedAsked = true;
        if (d.target && d.saved >= d.target) say("That already covers it. I’ll keep it as a goal in case you want to add to it.");
        return true;
      case "by":
        v = month(raw); if (!v) return retry(Q, raw, "Just so I get it right: which month and year? For example, April 2027.");
        hear(raw); d.by = v; d.perPay = perPayFor(d.target, d.saved || 0, v);
        if (d.name && d.flex) { commitCur(); return true; } /* a corrected goal that only needed its date */
        say("That’s about " + cad0(d.perPay) + " a payday from " + firstPay() + " to " + monYear(v) + (d.saved ? ", with " + cad0(d.saved) + " already saved" : "") + ".");
        return true;
      case "flex":
        hear(raw); d.flex = /fixed|firm|can.?t/i.test(raw) ? "fixed" : /whenever|any ?time|flexible|no rush/i.test(raw) ? "open" : "some"; return true;
      case "name":
        hear(raw); d.name = cap1(raw).slice(0, 36); commitCur(); return true;
      case "rKnow":
        hear(raw); d.know = /^y|yes|roughly|sure/i.test(raw);
        if (!d.know) say("That’s normal. We’ll start from what feels comfortable instead.");
        return true;
      case "rIncome":
        v = money(raw); if (!(v >= 1000)) return retry(Q, raw, "A rough yearly amount is fine, like 50000.");
        hear(chip ? raw : cad0(v)); if (v >= 250000) d.lump = v; else d.annual = v; computeNeed(d); return true;
      case "rAge":
        v = parseInt(String(raw).replace(/[^\d]/g, ""), 10); if (!(v >= 16 && v <= 70)) return retry(Q, raw, "Just your age in years is fine, like 29.");
        hear(raw); IV.age = v; computeNeed(d); return true;
      case "rStop":
        hear(raw); v = parseInt(String(raw).replace(/[^\d]/g, ""), 10); d.stopAt = v >= 50 && v <= 75 ? v : 65;
        if (!(v >= 50)) say("We’ll use 65 for now. You can change it later.");
        computeNeed(d, true); return true;
      case "rUse":
        hear(raw); d.use = /^yes/i.test(raw); if (d.use) { d.monthly = d.need.mine; say(cad0(d.monthly) + " a month, done."); finishRetire(d); } return true;
      case "comfort":
        v = money(raw); if (!(v >= 5)) return retry(Q, raw, "A monthly amount is fine, like 200.");
        hear(chip ? raw : cad0(v)); d.monthly = Math.round(v); say(cad0(d.monthly) + " a month, done."); illustrate(d); finishRetire(d); return true;
    }
    return true;
  }
  /* round 3 (F): a correction updates the goal she means; it never starts a new one */
  function correct(raw?: any): any {
    var k = kindOfText(raw), live = IV.drafts.filter(function (x: any) { return !IV.removed[x.id] && x.key !== "safety"; });
    var g = IV.cur || live.filter(function (x: any) { return k !== "purchase" && x.key === k; }).pop() || live[live.length - 1];
    if (!g) return null;
    var am = amounts(raw), by = month(raw), ch: any[] = [];
    if (/\b(is|was) what i (already )?have\b|\bi (already )?have\b/i.test(raw) && am.target && !am.saved && g.target && Math.abs(am.target - g.target) < 0.5) { am.saved = am.target; am.target = null; }
    if (am.saved != null) { g.saved = am.saved; g.savedAsked = true; ch.push(cad0(am.saved) + " already saved"); }
    if (am.target) { g.target = Math.round(am.target); ch.push(cad0(g.target) + " in total"); }
    if (by && /\b(by|in|before|for|around)\b/i.test(raw)) { g.by = by; ch.push("by " + monYear(by)); }
    if (!ch.length) return null;
    hear(raw);
    if (g === IV.cur) { if (g.by && g.target) g.perPay = perPayFor(g.target, g.saved || 0, g.by); say("Got it: " + ch.join(", ") + "."); return true; }
    if (g.target && g.by) g.perPay = perPayFor(g.target, g.saved || 0, g.by);
    else if (g.target && !g.by) { IV.cur = g; IV.drafts = IV.drafts.filter(function (x: any) { return x !== g; }); g.by = null; say("Got it: " + ch.join(", ") + ". By when would you like it?"); return true; }
    say("Got it, I’ve changed it: " + g.name + ": " + cad0(g.target) + " by " + monYear(g.by) + (g.saved ? ", with " + cad0(g.saved) + " already saved" : "") + ", about " + cad0(g.perPay) + " a payday.", { kind: "goal" });
    return true;
  }
  function horizonOf(d?: any): any { return d.h || 1; }
  function nextHorizonLine(h?: any): any { return h === 1 ? "OK." : h === 3 ? "Got it." : "Thanks. That’s everything I need."; }
  function addDraft(g?: any): any { g.id = g.id || "iv" + Math.random().toString(36).slice(2, 8); IV.drafts = IV.drafts.filter(function (x: any) { return x.key !== g.key || g.key !== "safety"; }); IV.drafts.push(g); return g; }
  function commitCur(): any {
    var d = IV.cur; if (!d) return;
    d.perPay = d.perPay || perPayFor(d.target, d.saved || 0, d.by);
    d.account = d.kind === "home" ? "FHSA" : "TFSA";
    d.invested = d.kind === "home" && (parseD(d.by) - today()) / 864e5 > 3 * 365;
    d.where = d.kind === "home" ? "Questrade FHSA" : "Questrade TFSA, as cash";
    var kd = E.keepOpt(E.KEEP_DEFAULT);
    if (kd && !d.invested && d.kind !== "emergency" && (d.key === "trip" || (parseD(d.by) - today()) / 864e5 <= 400)) { d.keepIn = kd.id; d.keepBy = "default"; d.where = "Questrade TFSA, " + kd.name.replace(/ \(.*\)$/, "").toLowerCase(); d.account = "TFSA"; }
    /* ICP 17:29 P0 (lead, v7.2): never two goals with the same name */
    var taken = function (n: any) { n = String(n).toLowerCase(); return IV.drafts.some(function (x: any) { return x !== d && String(x.name).toLowerCase() === n; }) || (st().goals || []).some(function (x: any) { return !x.archived && String(x.name).toLowerCase() === n; }); };
    var dupOf: any = null; if (taken(d.name)) { dupOf = d.name; var k = 2; while (taken(d.name + " " + k)) k++; d.name = d.name + " " + k; }
    var line = d.name + ": " + cad0(d.target) + " by " + monYear(d.by) + (d.saved ? ", with " + cad0(d.saved) + " already saved" : "") + ", about " + cad0(d.perPay) + " a payday." + (dupOf ? " You already have a goal called " + dupOf + ", so this one is " + d.name + ". If it's the same goal, you can archive one in Plan." : "");
    addDraft(d); IV.cur = null; var room = roomMonthly();
    say(line + (room < 0 ? " I’ll show how it fits with everything at the end." : ""), { kind: "goal" });
    if (d.keepBy === "default" && !IV.toldKeep) { IV.toldKeep = true; say(KEEP_DISC); }
    if (d.kind === "home") { var cap = 8000 / ppy(); if (d.perPay > cap + 0.5) say("Your FHSA takes up to $8,000 a year, about " + cad0(cap) + " a payday. The rest would be kept in your TFSA."); }
  }
  /* Retirement: work back from the end (Compliance s1 copy) */
  function computeNeed(d?: any, final?: any): any {
    if (!d.know || knownAge() == null || (final !== true && d.stopAt == null)) return;
    var age = knownAge(), stop = d.stopAt || 65, months = Math.max(12, (stop - age) * 12), RS = rateSet(), saved = num((existing("retirement") || {}).saved);
    var needs = RS.list.map(function (r: any) {
      var egg = d.lump || nestEgg(d.annual, r.realMid), eggLow = d.lump || nestEgg(d.annual, r.realLow);
      return { mid: monthlyNeeded(egg, saved, months, r.realMid), low: monthlyNeeded(eggLow, saved, months, r.realLow), egg: egg };
    });
    var mids = needs.map(function (x: any) { return x.mid; }), lows = needs.map(function (x: any) { return x.low; });
    var lo = r10(Math.min.apply(null, mids)), hi = r10(Math.max.apply(null, mids)), stress = r10(Math.max.apply(null, lows));
    d.need = { mine: hi, lo: lo, hi: hi, stress: stress, months: months, stop: stop };
    var what = d.lump ? "To have about " + cad0(nice(d.lump)) + " by " + stop + ", in today’s dollars," : "To have about " + cad0(d.annual) + " a year to live on from " + stop + ", in today’s dollars,";
    var amt = RS.mine ? "about " + cad0(hi) + " a month from now" : "about " + cad0(lo) + " to " + cad0(hi) + " a month from now, depending on the portfolio you choose next";
    say(what + " you’d put in " + amt + ".", { kind: "illus", label: LABEL, lines: ["If returns are 2 points lower: " + (RS.mine ? "about " : "up to about ") + cad0(stress) + " a month.", "Assumes the money lasts about " + YEARS_IN_RETIREMENT + " years. It doesn’t count CPP, OAS or a workplace pension, which would lower it."] });
    d.affordable = hi <= roomMonthly(d.id);
    if (!d.affordable) { say("That’s more than your plan has room for right now, and that’s common early on."); }
  }
  function illustrate(d?: any): any {
    var age = knownAge(), RS = rateSet(), retire = d.key === "retirement";
    var months = retire ? Math.max(12, ((d.stopAt || 65) - (age || 30)) * 12) : 120;
    var saved = num((existing(retire ? "retirement" : "invest") || {}).saved);
    var lows = RS.list.map(function (r: any) { return fv(d.monthly, saved, months, r.realLow); }), mids = RS.list.map(function (r: any) { return fv(d.monthly, saved, months, r.realMid); });
    var A1 = nice(Math.min.apply(null, lows)), B1 = nice(Math.max.apply(null, mids));
    d.illus = { low: A1, high: B1, months: months };
    var when = retire ? "by " + (d.stopAt || 65) : "in 10 years";
    if (retire && age == null) when = "in " + Math.round(months / 12) + " years";
    say(cad0(d.monthly) + " a month could grow to about " + cad0(A1) + " to " + cad0(B1) + " " + when + " (today’s dollars), as an illustration.", { kind: "illus", label: LABEL, lines: RS.mine ? [] : ["The range covers the four portfolios you can choose from next, worked out the same way."] });
  }
  function finishRetire(d?: any): any {
    if (d.monthly == null) return;
    if (d.know && d.use) illustrate(d);
    var K = KINDS[d.key];
    d.name = K.label; d.perPay = Math.round(d.monthly / m() * 100) / 100; d.account = d.key === "retirement" ? "RRSP" : "TFSA"; d.where = "Questrade " + d.account; d.invested = true;
    addDraft(d); IV.cur = null;
  }
  function finish(): any { IV.done = true; haptic("success"); }

  /* ---------- the plan: what her goals need ---------- */
  function plannedGoals(): any {
    var mm = m(), out: any[] = [], seen: any = {};
    IV.drafts.filter(function (d: any) { return !IV.removed[d.id]; }).forEach(function (d: any) {
      var ex = (d.kind === "home" || d.kind === "retirement" || d.kind === "invest" || d.kind === "emergency") ? existing(d.kind) : null;
      if (ex) seen[ex.id] = 1;
      var pp = d.full ? 0 : num(d.perPay);
      out.push({ id: d.id, draft: d, name: d.name, kind: d.kind, group: d.group, perPay: pp, monthly: pp * mm, monthlyShown: d.monthly, target: d.target, by: d.by, saved: d.saved || 0, isNew: !ex, full: !!d.full, flex: d.flex, keepBy: d.keepBy || null, invested: !!d.invested });
    });
    (st().goals || []).forEach(function (g0: any) {
      if (g0.archived || seen[g0.id] || g0.paused) return;
      var g = Object.assign({}, g0, IV.patches[g0.id] || {}), done = g.target && num(g.saved) >= num(g.target);
      var pp = done ? 0 : num(g.perPay); if (!pp && !done) return;
      out.push({ id: g0.id, goal: g0, name: g.name, kind: g.kind, group: goalGroup(g0), perPay: pp, monthly: pp * mm, target: g.target, by: g.by, saved: num(g.saved), isNew: false, existing: true, full: !!done, flex: g.flex, keepBy: g.keepBy || null, invested: !!g.invested });
    });
    return out;
  }
  function summary(): any {
    var b = budget() || { incomeM: 0, essM: 0, debtM: 0, usualEv: 0 }, G = plannedGoals();
    var perPay = Math.round(G.reduce(function (s: any, g: any) { return s + g.perPay; }, 0) * 100) / 100, goalsM = G.reduce(function (s: any, g: any) { return s + g.monthly; }, 0);
    var flex = b.incomeM - b.essM - b.debtM - goalsM, usual = st().spending ? b.usualEv : null;
    var short = usual != null ? Math.max(0, usual - flex) : Math.max(0, -flex);
    return { goals: G, perPay: perPay, goalsM: goalsM, incomeM: b.incomeM, essM: b.essM, debtM: b.debtM, flexM: flex, usual: usual, short: short, room: usual != null ? flex - usual : flex };
  }
  /* the three ways to close a gap, for one goal at a time (she chooses; nothing preselected) */
  function proposals(kind?: any): any {
    var S0 = summary(), gapPP = S0.short / m(), out: any[] = [];
    S0.goals.forEach(function (g: any) {
      if (g.full || !(g.perPay > 0)) return;
      var saved = num(g.saved), target = num(g.target), cut = Math.min(Math.floor(g.perPay * 0.6 / 5) * 5, Math.ceil(gapPP / 5) * 5);
      if (kind === "slow" && (g.kind === "retirement" || g.kind === "invest")) {
        var curM = g.monthlyShown != null ? g.monthlyShown : r10(g.monthly), newM = Math.max(25, r10(curM - S0.short)); if (newM >= curM) return;
        out.push({ g: g, label: g.name, change: cad0(curM) + " → " + cad0(newM) + " a month", patch: { monthly: newM, perPay: Math.round(newM / m() * 100) / 100 }, covers: curM - newM });
        return;
      }
      if (!target || !g.by || cut <= 0) return;
      var newPP = g.perPay - cut, by0 = parseD(g.by), cap = E.ymd(by0.getUTCFullYear() + 3, by0.getUTCMonth(), 1);
      /* never stretch a goal more than 3 years past its date: trim the cut until it fits */
      while (cut > 0 && kind !== "amount" && payDate(Math.ceil(Math.max(0, target - saved) / (g.perPay - cut))) > cap) { cut -= 5; }
      if (cut <= 0) return; newPP = g.perPay - cut;
      if (kind === "date") {
        var n = Math.ceil(Math.max(0, target - saved) / newPP), dd = payDate(n), by = iso(monthEnd(dd.getUTCFullYear(), dd.getUTCMonth()));
        out.push({ g: g, label: g.name, change: monY3(g.by) + " → " + monY3(by) + ", " + cad0(g.perPay) + " → " + cad0(newPP) + " a pay", patch: { by: by, perPay: newPP }, covers: cut * m(), flexNote: g.flex });
      } else if (kind === "amount") {
        var nt = Math.floor((saved + newPP * paydaysTo(g.by)) / 50) * 50; if (nt <= saved) return;
        out.push({ g: g, label: g.name, change: cad0(target) + " → " + cad0(nt) + " by " + monY3(g.by) + ", " + cad0(newPP) + " a pay", patch: { target: nt, perPay: newPP }, covers: cut * m(), flexNote: g.flex });
      } else if (kind === "slow") {
        var n2 = Math.ceil(Math.max(0, target - saved) / newPP), d2 = payDate(n2);
        out.push({ g: g, label: g.name, change: cad0(g.perPay) + " → " + cad0(newPP) + " a pay, reached about " + MON3[d2.getUTCMonth()] + " " + d2.getUTCFullYear(), patch: { perPay: newPP, by: iso(monthEnd(d2.getUTCFullYear(), d2.getUTCMonth())) }, covers: cut * m(), flexNote: g.flex });
      }
    });
    /* goals she said can move come first; within that, the ones that close the whole gap */
    return out.sort(function (a: any, b: any) { var fa = a.flexNote === "open" ? 0 : a.flexNote === "some" ? 1 : 2, fb = b.flexNote === "open" ? 0 : b.flexNote === "some" ? 1 : 2; return fa - fb || (Number(b.covers >= S0.short - 1) - Number(a.covers >= S0.short - 1)); });
  }
  function applyProposal(p?: any): any {
    if (p.g.draft) { Object.assign(p.g.draft, p.patch); if (p.patch.by) p.g.draft.byLabel = monYear(p.patch.by); }
    else IV.patches[p.g.id] = Object.assign(IV.patches[p.g.id] || {}, p.patch);
    IV.shortOpt = null; haptic();
  }

  /* ---------- writing to her plan through the WS goal APIs ---------- */
  function commit(S?: any): any {
    if (!IV || IV.committed) return { added: 0, updated: 0 };
    var added = 0, updated = 0, G = (S.goals = S.goals || []);
    var addGoal = function (g: any) { G.push(Object.assign({ id: "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), saved: 0, status: "New", invested: false, isNew: true }, g)); };
    var updateGoal = function (id: any, p: any) { var x = G.filter(function (y: any) { return y.id === id; })[0]; if (x) Object.assign(x, p); };
    var exist = function (kind: any) { return G.filter(function (g: any) { return !g.archived && g.kind === kind; })[0] || null; };
    IV.drafts.filter(function (d: any) { return !IV.removed[d.id]; }).forEach(function (d: any) {
      var ex = (d.kind === "home" || d.kind === "retirement" || d.kind === "invest" || d.kind === "emergency") ? exist(d.kind) : null;
      var g: any = { name: d.name, kind: d.kind, group: d.group, target: d.target || null, saved: d.saved || 0, by: d.by || null, byLabel: d.by ? monYear(d.by) : "Long term",
        perPay: d.full ? 0 : Math.round(num(d.perPay) * 100) / 100, where: d.where || "Questrade TFSA, as cash", account: d.account || "TFSA", invested: !!d.invested, flex: d.flex || null, source: "interview" };
      if (d.keepIn) { g.keepIn = d.keepIn; g.keepBy = d.keepBy || "default"; }
      if (d.monthly != null) { g.monthly = d.monthly; g.statusLine = cad0(d.monthly) + " a month. Long term."; }
      if (d.key === "retirement") { g.byLabel = "Long term"; g.target = null; g.retire = { annual: d.annual || null, lump: d.lump || null, stopAt: d.stopAt || 65, need: d.need || null, illus: d.illus || null }; }
      if (d.illus) g.illus = d.illus;
      if (d.full) { g.status = "Complete"; }
      if (ex) { var p: any = {}; Object.keys(g).forEach(function (k: any) { if (k !== "saved" && k !== "name" && g[k] != null) p[k] = g[k]; }); if (d.kind === "emergency" && d.full) p.saved = Math.max(num(ex.saved), g.saved); updateGoal(ex.id, p); updated++; }
      else { if (d.full) g.isNew = false; addGoal(g); added++; }
    });
    Object.keys(IV.patches || {}).forEach(function (id: any) { updateGoal(id, IV.patches[id]); updated++; });
    if (IV.age) { S.user = S.user || {}; S.user.age = IV.age; }
    E.applyKeepDefaults(S); E.applyPlanPerPay(S);
    IV.committed = true;
    return { added: added, updated: updated };
  }
  function saveEdit(fields?: any): any {
    var d = IV.drafts.filter(function (x: any) { return x.id === IV.editing; })[0]; if (!d) { IV.editing = null; return; }
    var val = function (k: any) { return fields && fields[k] != null ? String(fields[k]).trim() : null; };
    var nm = val("name"), t = val("target"), by = val("by"), sv = val("saved"), mo = val("monthly"), nd: any = {};
    if (nm != null) { if (!nm) { IV.editErr = "Give it a name."; return; } nd.name = cap1(nm).slice(0, 36); }
    if (t != null) { var tv = money(t); if (!(tv >= 20)) { IV.editErr = "Amount: a number like 3000."; return; } nd.target = Math.round(tv); }
    if (by != null) { var bv = month(by); if (!bv) { IV.editErr = "By: a month and year ahead, like April 2027."; return; } nd.by = bv; }
    if (sv != null) { var s2 = sv === "" ? 0 : money(sv); if (s2 == null && !/^\$?0$/.test(sv)) { IV.editErr = "Saved so far: a number, or 0."; return; } nd.saved = Math.round(s2 || 0); }
    if (mo != null) { var mv = money(mo); if (!(mv >= 5)) { IV.editErr = "A month: a number like 200."; return; } nd.monthly = Math.round(mv); }
    var taken = IV.drafts.some(function (x: any) { return x !== d && !IV.removed[x.id] && String(x.name).toLowerCase() === String(nd.name || d.name).toLowerCase(); }) || (st().goals || []).some(function (x: any) { return !x.archived && String(x.name).toLowerCase() === String(nd.name || d.name).toLowerCase(); });
    if (taken && nd.name && nd.name !== d.name) { IV.editErr = "You already have a goal called " + nd.name + "."; return; }
    Object.keys(nd).forEach(function (k: any) { d[k] = nd[k]; }); d.savedAsked = true;
    if (d.full) { d.saved = d.target; d.perPay = 0; }
    else if (d.monthly != null && !d.target) d.perPay = Math.round(d.monthly / m() * 100) / 100;
    else if (d.target && d.by) d.perPay = perPayFor(d.target, d.saved || 0, d.by);
    IV.editing = null; IV.editErr = null;
  }

  IV = fresh(!!(opts && opts.embedded));
  return {
    /** The thread so far: {from: "in"|"out", text, kind?, label?, lines?}. */
    log: function (): any[] { ensure(); return IV.log.slice(); },
    question: function (): any { ensure(); var Q = question(); return Q ? { id: Q.id, text: Q.text, chips: Q.chips.slice(), input: Q.input } : null; },
    answer: function (t: string, fromChip?: boolean): boolean { ensure(); return answer(t, !!fromChip); },
    isDone: function (): boolean { return !!IV.done; },
    committed: function (): boolean { return !!IV.committed; },
    progress: function (): number { if (IV.done) return 1; return Math.min(0.92, 0.08 + IV.nAsked / 16); },
    summary: function (): any { ensure(); return summary(); },
    drafts: function (): any[] { return IV.drafts.filter(function (d: any) { return !IV.removed[d.id]; }).slice(); },
    remove: function (id: string): void { IV.removed[id] = true; },
    startEdit: function (id: string): void { IV.editing = id; IV.editErr = null; },
    cancelEdit: function (): void { IV.editing = null; IV.editErr = null; },
    editing: function (): string | null { return IV.editing || null; },
    /** Saves {name, target, by, saved, monthly} for the goal being edited; returns the error line, or null when saved. */
    saveEdit: function (fields: any): string | null { saveEdit(fields); return IV.editErr || null; },
    shortOptions: function (kind: string): any[] { return proposals(kind); },
    applyProposal: function (p: any): void { applyProposal(p); },
    keep: function (): void { IV.kept = true; },
    back: function (): boolean {
      if (!IV.log.length) return false;
      if (IV.done && !IV.committed) { for (var i = HZ.length - 1; i >= 0; i--) { var k = "hz" + HZ[i].h; if (IV.answers[k] === "none" || IV.answers[k] === "done") { delete IV.answers[k]; IV.horizon = i; IV.done = false; IV.shortOpt = null; return true; } } }
      return false;
    },
    /** Writes the goals into the state it is given (pass the app's update() draft). */
    commit: function (S: any) { return commit(S); },
    keepDisclosure: KEEP_DISC,
    /* the retirement maths and the parsers, shared with Talk */
    _math: { nestEgg: nestEgg, monthlyNeeded: monthlyNeeded, fv: fv, rateFor: rateFor, month: month, money: money, amounts: amounts, LABEL: LABEL, YEARS: YEARS_IN_RETIREMENT },
    _iv: function (): any { return IV; }
  };
}
