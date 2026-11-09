/* Talk it through: the scripted conversation engine (CR11 s2), ported from the prototype's talk.js (v7.3 round 5).
   Plans with her own numbers from @woodstock/engine: job offers and raises (units, "more", "from January"),
   purchases, bills, goal changes, retirement pace and work-back, line of credit versus investing, life events,
   tax season, workplace plans; Compliance's exact copy for scope and identity. Guardrails: no buy or sell card
   ever (TALK_OK, isTrade), no claimed change without a valid confirm card (finalize), banned wording (badText).
   Pure: the view (feature-talk TalkScreen) renders reply() and calls apply() on her tap. */
import * as E from "./env.ts";
import * as A from "./actions.ts";
import * as TAX from "./tax.ts";
import { createInterview } from "./interview.ts";

const num = E.num, cad0 = E.cad0, r10 = E.r10, MON3 = E.MON3, MONL = E.MONL, E_FREQ: any = E.FREQ_LABEL;
const isTrade = A.isTrade, TALK_OK: any = A.TALK_OK;
void MONL;

export interface TalkOptions {
  /** an extra intent engine (the Messages port, later the server), asked when the scripted engine has no answer */
  intent?: (text: string) => any;
}

export function createTalk(getState: () => any, opts?: TalkOptions) {
  var IV_MATH: any = createInterview(getState)._math;
  /* ---------- copy (Compliance 14:41) ---------- */
  var COPY: any = {
    title: "Talk it through",
    sub: "Plan with Woodstock",
    disclosure: "Woodstock is automated, not a person, and holds no planning or advising title. It plans with your own numbers. It doesn’t pick investments, file taxes or give legal advice.",
    hint: "Tap the mic on your keyboard and start talking.",
    picks: "I can’t pick investments; Woodstock isn’t registered to. A registered adviser can help you decide.",
    planner: "That’s one for a planner (or an accountant or lawyer). Want to book a call?",
    identity: "I’m Woodstock’s automated assistant, not a person, and I hold no planning or advising title. I plan with your own numbers.",
    limited: "Some answers are simpler in this preview.",
    micLabel: "Talk using your iPhone keyboard’s mic",
    micWho: "Your iPhone keyboard’s mic does the listening",
    picksMoney: "I can’t pick investments; Woodstock isn’t registered to. You can change your portfolio, including Build my own, in Money.",
    guarantee: "No one can promise that. Your goals are on track at today’s amounts; that’s an estimate from your own numbers, and investments can go down.",
    miss: "I can’t help with that one yet. Try asking it another way, or book a planner.",
    cant: "I couldn’t work that out yet, so nothing in your plan has changed. Try asking it another way, or book a planner.",
    cpp: "Government pensions (CPP and OAS) could cover part of this.",
    cppDef: "CPP is the Canada Pension Plan you pay into from each pay; it can start from 60. OAS is Old Age Security, usually from 65, depending on how long you’ve lived in Canada and your income. Your My Service Canada Account shows your own CPP estimate.",
    noTrade: "Selling is done from your Messages thread, where you approve each order. Want me to open it?",
    fine: "Planning only. Nothing is bought or sold. In this demo, money moves only when you approve, and only in demo accounts.",
    taxNote: "Estimates for Ontario using 2026 federal and Ontario tax, CPP and EI. Before workplace deductions like a pension or benefits. Your pay stub may differ."
  };

  /* ---------- helpers: figures from @woodstock/engine (env.ts) ---------- */
  function st(): any { return getState() || {}; }
  function today(): any { return E.today(st()); }
  function parseD(s?: any): any { return E.parseDate(s); }
  var iso = E.iso, monthEnd = E.monthEnd, monY = E.monY, monYL = E.monYL, labelBy = E.labelBy;
  function income(): any { return E.income(st()); }
  function freqLabel(): any { return E_FREQ[income().freq] || "every two weeks"; }
  function budget(): any { return E.budget(st()); }
  function liveGoals(): any { return E.liveGoals(st()); }
  function goalDone(g?: any): any { return E.goalDone(g); }
  function paydaysTo(by?: any): any { return E.paydaysTo(st(), by); }
  function payDate(n?: any): any { return E.payDate(st(), n); }
  function nextPayShort(): any { var d = E.nextPay(st()); return MON3[d.getUTCMonth()] + " " + d.getUTCDate(); }
  function month(t?: any): any { return IV_MATH.month(t); }
  function findGoal(ref?: any): any { return A.findGoal(st(), ref); }
  function validate(a?: any): any { try { return A.validAction(st(), a); } catch (e) { return null; } }
  var LINK: any = A.LINK;
  function ppy(): any { return E.ppyOf(income().freq); }
  function mf(): any { return ppy() / 12; }
  function goalsPP(): any { return liveGoals().filter(function (g: any) { return !g.paused && !goalDone(g); }).reduce(function (s: any, g: any) { return s + num(g.perPay); }, 0); }
  function money(t?: any): any { var m = /\$\s?(\d[\d,]*(?:\.\d+)?)\s?(k\b)?|\b(\d[\d,]*(?:\.\d+)?)\s?(k|grand|dollars|bucks)\b/i.exec(String(t || "")); if (!m) return null; var v = parseFloat(String(m[1] || m[3]).replace(/,/g, "")) * ((m[2] || /k|grand/i.test(m[4] || "")) ? 1000 : 1); return v > 0 ? v : null; }
  /* "Dec 23", "December 23rd", "Christmas" -> that day; otherwise a month and year -> its last day */
  function dateIn(t?: any): any {
    var q = String(t || "").toLowerCase(), T = today();
    if (/\bnext year\b/.test(q) && !/\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sept?(ember)?|oct(ober)?|nov(ember)?|dec(ember)?)\b|\b(spring|summer|fall|autumn|winter|christmas)\b/.test(q)) { CTX.yearHint = T.getUTCFullYear() + 1; return null; }
    var m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?!\d)(?:,?\s+(20\d\d))?/.exec(q);
    if (m && +m[2] >= 1 && +m[2] <= 31) {
      var mi = MON3.map(function (x: any) { return x.toLowerCase(); }).indexOf(m[1].slice(0, 3)), yr = m[3] ? +m[3] : T.getUTCFullYear(), d = E.ymd(yr, mi, +m[2]);
      if (!m[3] && d < T) d = E.ymd(yr + 1, mi, +m[2]);
      if (d > T) return iso(d);
    }
    if (/\bchristmas\b/.test(q)) return iso(E.ymd(T.getUTCMonth() === 11 && T.getUTCDate() > 23 ? T.getUTCFullYear() + 1 : T.getUTCFullYear(), 11, 23));
    return month(t);
  }
  /* salaries: "$95,000", "95k", "110 000", "$110K a year" (20,000 and up) */
  function salaries(q?: any): any {
    var out: any = [], re = /\$?\s?(\d{2,3})(?:[,\s]?(\d{3}))?\s?(k\b)?(?:\s*(?:a|per|\/)\s*(?:year|yr|annum))?/gi, m;
    while ((m = re.exec(q))) { var v = m[3] ? +m[1] * 1000 : m[2] ? +(m[1] + m[2]) : 0; if (v >= 20000 && v <= 1000000 && out.indexOf(v) < 0) out.push(v); }
    return out;
  }

  function takeHome(gross?: any): any { return TAX.takeHome(gross, ppy()); }
  var TAX_T = TAX.TAX, prog = TAX.prog, ohp = TAX.ohp;


  function cap(n?: any, lo?: any, hi?: any): any { n = Number(n); return isFinite(n) && n >= lo && n <= hi ? Math.round(n * 100) / 100 : null; }
  /* ---------- post-filter for live text (Messages filter plus CR11 s3 and title bans) ---------- */
  var TALK_BANNED = [/\bsave more\b/i, /you should save/i, /\bmax(imi[sz]e)? out\b/i, /boost your savings/i, /aim higher/i, /great saver/i, /could be saving/i,
    /\bAI advis/i, /robo[- ]?advis/i, /virtual advis/i, /\byour (financial )?advis(o|e)r\b/i, /\b(I am|I'm) (a|your) (planner|advis)/i, /financial\s+planner/i, /wealth manag/i,
    /(riskier|more aggressive|higher[- ]risk|safer) portfolio/i, /\bwill (reach|grow to|be worth)\b/i, /\bguarantee/i, /\brecommend/i];
  function badText(t?: any): any { var s = String(t || ""); var s2 = s.replace(/\b(not|no|never|can't|cannot|isn't|doesn't|won't) (a |any )?(guarantee\w*|recommend\w*)/ig, ""); return TALK_BANNED.some(function (r: any) { return r.test(s2); }); }

  /* ---------- goal facts used in replies ---------- */
  function reach(g?: any): any {
    if (g.paused) return "paused"; if (goalDone(g)) return g.kind === "emergency" ? "full" : "reached";
    var per = num(g.perPay); if (!(num(g.target) > 0) || !g.by) return per ? cad0(g.monthly || Math.round(per * mf())) + " a month" : "no amount yet";
    if (!(per > 0)) return "no amount yet";
    var pend = 0; pend = !g.invested ? num(E.pendingFor(st(), g)) : 0;
    var n = Math.ceil(Math.max(0, num(g.target) - num(g.saved) - pend) / per - 1e-9), d = payDate(n), by = parseD(g.by);
    return "by " + MON3[d.getUTCMonth()] + " " + d.getUTCFullYear() + (by && d > E.ymd(by.getUTCFullYear(), by.getUTCMonth() + 1, 0) ? " (after " + monY(g.by) + ")" : "");
  }
  function scenario(perPayTakeHome?: any): any {
    var b = budget(); if (!b) return null;
    var incM = perPayTakeHome * mf() + num(b.otherM), gM = goalsPP() * mf(), flex = incM - b.essM - b.debtM - gM, usual = st().spending ? b.usualEv : null;
    return { perPay: perPayTakeHome, incM: incM, flex: flex, usual: usual, room: usual != null ? flex - usual : flex, short: flex < 0 ? -flex : 0 };
  }
  function goalsLine(max?: any): any { return liveGoals().filter(function (g: any) { return !goalDone(g) || g.kind !== "emergency"; }).filter(function (g: any) { return !goalDone(g); }).slice(0, max || 4).map(function (g: any) { return g.name + " " + reach(g); }).join(", "); }

  /* ---------- the scripted engine: returns {text, actions, compare, chips, interview, trade} ---------- */
  var CTX: any = { pending: null, lastCompare: null, lastRetire: false, lastGoal: null };
  function norm(t?: any): any { return " " + String(t || "").toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ").trim() + " "; }
  function engine(text?: any): any {
    CTX.yearHint = null;
    var q = norm(text), b = budget(), sal = salaries(q), amt = money(text), by = dateIn(text);
    CTX._wasR = CTX.lastRetire; CTX.lastRetire = false;
    if (CTX.pending && !(amt || by || /^\s*\$?\s?\d/.test(text) || (String(text).trim().split(/\s+/).length <= 4 && !/\?\s*$/.test(text)))) CTX.pending = null;
    if (!amt && CTX.pending && /^\s*\$?\s?\d/.test(text)) { var bare = parseFloat(String(text).replace(/[^\d.]/g, " ").trim().split(/\s+/)[0]); if (bare > 0) amt = bare; }

    /* identity and titles */
    if (/\b(are you|is this|is woodstock|you('re| are))\b[^?.!]{0,20}\b(an? )?(ai |robo[- ]?|virtual |financial )?(advis|planner|person|human|real|bot|ai)\b/.test(q)) return { text: COPY.identity, chips: ["Talk to a planner", "What can you help with?"] };
    /* money out, selling or moving holdings: never prepared here (Compliance 18:58); the payday card and Messages hold orders */
    if (/\b(sell|selling|sold|withdraw\w*|cash out|liquidat\w*|rebalanc\w*)\b|\btake\b[^.?!]{0,20}\bout\b|\bout of my (tfsa|rrsp|fhsa|investments|portfolio)\b|\bmove my (tfsa|rrsp|fhsa|investments|portfolio)\b/.test(q) && !/\b(rsus?|stock options?|espp|house|home|car)\b/.test(q))
      return { text: COPY.noTrade, chips: ["Open Messages", "What can you help with?"], safe: true };
    /* out of scope: a named fund or ticker for her account (Compliance 18:33 routing) */
    if (/\b(put|move|switch|invest|buy|change)\b[^.?!]{0,30}\b(xeqt|veqt|vgro|xgro|vbal|xbal|vcns|xcns|vfv|xus|zsp|xsp|zag|vab|xbb|xic|vcn|xaw|vxc|xef|xec|zmmk|vsb|hxt|tsla|tesla|aapl|nvda|nvidia|shop|bitcoin|crypto|an index fund|index funds?)\b/.test(q))
      return { text: COPY.picksMoney, chips: ["Compare the four", "Ask about these portfolios"] };
    /* out of scope: picking investments or a portfolio (CR11 s2; PM-R15 a, R31) */
    if (/\b(which|what|best|good|recommend|pick|suggest)\b[^.?!]{0,30}\b(stocks?|etfs?|funds?|crypto|bitcoin|shares|portfolios?|investments?|securities|index)\b|\bwhat (should|do) i (buy|invest in|put my money in)\b|\bwhere should i (invest|put my money)\b|\bshould i (buy|sell|invest in|get)\b[^.?!]{0,30}\b(stocks?|etfs?|funds?|crypto|bitcoin|shares|tesla|apple|nvidia|vfv|xeqt|veqt)\b|\b(riskier|safer|more aggressive) portfolio\b|\bswitch (to|my) (portfolio|conservative|balanced|growth|aggressive)\b/.test(q))
      return { text: COPY.picks, chips: ["Compare the four", "Ask about these portfolios", "How are my goals doing?"] };
    /* "is this a guarantee?" (Compliance 18:33 routing) */
    if (/\b(guarantee\w*|promise|for sure|definitely|certain)\b/.test(q) && /\b(goals?|reach|make it|get there|hit|on track|this)\b/.test(q)) return guaranteeReply();
    /* out of scope: tax filing, legal, insurance, estate */
    if (/\b(file|filing|do|prepare)\b[^.?!]{0,12}\b(my )?tax(es)?\b|\btax return\b|\bcra\b|\baudit\b|\b(my|a) will\b|\bestate\b|power of attorney|\blawyer\b|\blegal (advice|question|help)\b|\bsue\b|\blawsuit\b|\b(life|disability|critical illness|need|buy|get|which) insurance\b|\binsurance (policy|advice|coverage|claim)\b|\bprenup\b|\bdivorce\b|\bseparation\b|\bcustody\b/.test(q) && !(sal.length && /\bjob|offer|salary\b/.test(q)))
      return { text: COPY.planner, actions: [{ type: "planner", topic: /tax|cra|audit/.test(q) ? "Taxes" : /insurance/.test(q) ? "Insurance" : /will|estate|attorney/.test(q) ? "Will and estate" : "Something else" }] };

    /* continue the goals interview */
    if (/\b(plan (my|new) goals|set up (my )?goals|goals interview|go through my goals|start over with my goals|add (some|a few|more) goals)\b/.test(q)) return { text: "Let’s go through it one question at a time.", interview: true };

    /* planning questions and life updates with her own numbers (PM-R15, R30, R31) */
    var px = plannerIntents(q, text, amt, by, sal, b); if (px) return px;

    /* follow-up on the last job comparison */
    if (CTX.lastCompare && /\b(took|taking|accepted|accept|going with|chose|picked|i'll take|signed)\b/.test(q)) {
      var pickS = sal.length ? sal[0] : /\b(higher|bigger|more|second)\b/.test(q) ? Math.max.apply(null, CTX.lastCompare.offers) : /\b(lower|smaller|first)\b/.test(q) ? Math.min.apply(null, CTX.lastCompare.offers) : null;
      if (pickS) return payFromSalary(pickS, "Congratulations.");
    }
    if (CTX.lastCompare && /\bwhat if\b[^.?!]{0,30}\b(extra|difference|more)\b/.test(q)) return whatIfExtra(q);

    /* a job choice: two salaries, or one offer next to today */
    if (sal.length >= 2 || (sal.length === 1 && /\b(job|offer|position|role)\b/.test(q) && !/\b(raise|promot)/.test(q))) return compareJobs(sal);

    /* a raise or a new salary (round 4 P0: read the units and "more"; per-pay take-home after tax, labelled; from when) */
    if (/\b(raise|promotion|promoted|new job|pay (went|is going|goes) up|paid more|my (take.?home|pay|salary) (is|went|will be))\b|\bi (now )?(make|earn)\b/.test(q)) {
      if (sal.length && !/\b(more|extra|raise of|increase of|bump of|by \$)/.test(q)) return payFromSalary(sal[0], "Nice.");
      var pct = /(\d{1,2}(?:\.\d)?)\s?%/.exec(q);
      if (pct && b) { var Gp = grossFor(b.pay), np0 = Math.round(takeHome(Gp * (1 + +pct[1] / 100)).perPay); return payCard(q, np0, "A " + pct[1] + "% raise on about " + cad0(Gp) + " a year (your pay, worked back) is about " + cad0(Math.round(Gp * +pct[1] / 100)) + " more a year before tax", false); }
      if (amt && b) { var pc = payChange(q, text, amt); if (pc) return pc; }
      CTX.pending = { type: "raise" };
      return { text: "Congratulations. What’s the new salary, the raise a year, or the take-home on each pay? Any of those works.", chips: ["$110,000 a year", "$8,000 more a year", "$3,400 a pay"] };
    }
    if (CTX.pending && CTX.pending.type === "raise") { CTX.pending = null; if (sal.length && !/\b(more|extra)\b/.test(q)) return payFromSalary(sal[0], "Got it."); if (amt) { var pc2 = payChange(q, text, amt); if (pc2) return pc2; } }

    /* save more? goals first (CR11 s3) */
    if (/\b(save more|saving enough|enough saved|should i (be )?sav|max out|save less)\b/.test(q) && b) {
      var behind = liveGoals().filter(function (g: any) { try { return !E.goalOk(st(), g); } catch (e) { return false; } });
      return { text: "Your goals need " + cad0(goalsPP()) + " a pay" + (behind.length ? ". " + behind[0].name + " needs a look; a later date or a smaller amount would bring it back on track." : ", and you’re on track. The rest is yours to spend or keep.") + " Want to add a goal?", chips: ["Add a goal", "How are my goals doing?"] };
    }

    /* move a date */
    var mv = /\b(move|push|change|shift|delay|bring|pull)\b/.test(q) && /\b(date|back|forward|later|earlier|sooner|to (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|20\d\d)|by (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|20\d\d))/.test(q);
    if (mv) { var g0 = findGoal(q); if (g0) return moveDate(g0, q, by); return { text: "Which goal should move? You have " + liveGoals().map(function (g: any) { return g.name; }).join(", ") + ".", chips: liveGoals().filter(function (g: any) { return g.by; }).slice(0, 3).map(function (g: any) { return "Move " + g.name + " to next summer"; }) }; }

    /* purchases and life updates: "I'm buying a purse" */
    var buy = /\b(i'm|i am|im|i'll be|going to|gonna|want to|wanna|thinking of|planning to|need to)\s+(buy|buying|get|getting|purchase)\b\s+(?:a |an |some |the |my |new )*(?:\$\s?[\d,.]+k?\s+)?(?:a |an |new )*([a-z][a-z' -]{1,24}?)(?=\s+(?:for|at|this|next|by|before|in|on|that|which|worth|soon|today|tonight|\$)|[.?!,]|\s*$)/.exec(q);
    if (buy || (CTX.pending && CTX.pending.type === "purchase")) {
      var item = buy ? buy[3].replace(/\b(it|that|this|something|stuff)\b/g, "").trim() : CTX.pending.item;
      if (!item) item = "it";
      if (buy && /\b(house|home|condo|car)\b/.test(item) && !amt) { CTX.pending = null; return { text: "That’s a big one. Want to set it up as a goal? Tell me roughly how much and by when, for example: a home, $40,000 down by December 2029.", chips: ["Plan my goals"] }; }
      var a1 = amt || (CTX.pending && CTX.pending.amount);
      if (!a1) { CTX.pending = { type: "purchase", item: item }; return { text: "Nice. How much is the " + item + ", and are you buying it now or saving up for it?", chips: ["$300, buying it now", "$300 by Dec 23", "Not sure yet"] }; }
      CTX.pending = null;
      if (by && /\b(by|before|for|in|on)\b/.test(q) && !/\bnow|today|tonight\b/.test(q)) return goalFor(item, a1, by);
      return affordFor(item, a1);
    }

    /* can I afford it */
    if (/\b(afford|am i (still )?(ok|okay)|can i (still )?(buy|get|spend))\b/.test(q)) {
      if (amt) { var it = (/\b(?:a|an|the|some)\s+(?:\$\s?[\d,.]+k?\s+)?([a-z][a-z ]{1,20}?)(?=\s+(?:for|at|this|by|\$)|[.?!,]|\s*$)/.exec(q) || [])[1] || "it"; return affordFor(it.trim(), amt); }
      CTX.pending = { type: "purchase", item: "it" };
      return { text: "Sure. How much is it? I’ll check it against what’s left this month.", chips: ["$80", "$300", "$1,200"] };
    }

    /* a new goal */
    var addG = /\b(add|new|start|create|set up)\b[^.?!]{0,14}\bgoal\b|\b(save|saving)\s+(up\s+)?(\$\s?[\d,]+k?\s+)?(for|towards?)\b|\bi want to save\b|\bplanning (a|an|to)\b/.test(q);
    if (addG || (CTX.pending && CTX.pending.type === "goal")) return goalIntent(q, text, amt, by);

    return null;
  }
  /* round 4 P0: "$8,000 more a year" is an annual increase before tax, not $8,000 a pay */
  var MONTHW = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/;
  function fromWhen(q?: any): any { var m = /\b(?:in|from|starting|as of|effective|next)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/.exec(q); if (!m) return null; var mi = MON3.map(function (x: any) { return x.toLowerCase(); }).indexOf(m[1].slice(0, 3)); return MONL[mi]; }
  function payWords(q?: any): any {
    return { year: /\b(a|per|each|every) year\b|\bannual(ly)?\b|\byearly\b|\/\s?yr\b|\ba yr\b|\bsalary\b/.test(q), pay: /\b(a|per|each|every) (pay|payday|paycheque|paycheck|cheque|check)\b|\bbi-?weekly\b|\bevery two weeks\b|\btake.?home\b/.test(q),
      month: /\b(a|per|each) month\b|\bmonthly\b/.test(q), inc: /\b(more|extra|on top|higher)\b|\b(raise|increase|bump) of\b|\bby \$|\bup \$/.test(q) };
  }
  function payChange(q?: any, text?: any, a?: any): any {
    var b = budget(); if (!b) return null; var W = payWords(q), G = grossFor(b.pay), np, lead;
    if (W.year || (a >= 20000 && !W.pay && !W.month)) {
      if (W.inc || a < 20000) { np = takeHome(G + a).perPay; lead = cad0(a) + " more a year before tax"; }
      else return payFromSalary(a, "Nice.");
      np = Math.round(np);
      return payCard(q, np, lead, false);
    }
    if (W.month) { var pm = a * 12 / ppy(); np = Math.round(W.inc ? b.pay + pm : pm); return payCard(q, np, cad0(a) + (W.inc ? " more" : "") + " a month after tax", W.pay || !W.inc && /\btake.?home|after tax\b/.test(q)); }
    np = Math.round(W.inc ? b.pay + a : a);
    return payCard(q, np, cad0(a) + (W.inc ? " more" : "") + " a pay", W.pay && /\b(after tax|take.?home|net|lands)\b/.test(q));
  }
  /* the pay card with before and after; a change above 50% needs explicit per-pay wording, or she confirms first */
  function payCard(q?: any, np?: any, lead?: any, explicit?: any): any {
    var b = budget(); if (!b) return null; var from = fromWhen(q), diff = np - b.pay, ratio = Math.abs(diff) / Math.max(1, b.pay);
    if (Math.abs(diff) < 1) return { text: "That’s about what you’re paid now, " + cad0(b.pay) + " a pay, so your plan stays as it is.", safe: true };
    if (ratio > 0.5 && !explicit) { CTX.pending = { type: "raise" }; return { safe: true, text: "Just to check: that would take your pay from " + cad0(b.pay) + " to " + cad0(np) + " a pay, " + Math.round(ratio * 100) + "% " + (diff > 0 ? "higher" : "lower") + ". Did you mean " + cad0(np) + " a pay after tax, or an amount a year before tax?", chips: [cad0(np) + " a pay after tax", cad0(money(q) || 0) + " more a year"] }; }
    var annualExtra = diff > 0 && /before tax/.test(lead), F = from ? firstPayIn(from) : null, dated = !!(F && F.n > 1);
    var lab = dated ? from : null, startTxt = dated ? "from your first " + from + " pay" : "";
    var t = (diff > 0 ? "Nice. " : "Thanks for telling me. ") + lead + "." + (annualExtra ? " That’s about " + cad0(Math.round(diff)) + " more a pay after tax (estimate: part of a raise goes to tax, CPP and EI)." : "") + " Your pay would go from " + cad0(b.pay) + " to about " + cad0(np) + " a pay" + (dated ? ", " + startTxt : "") + ". Your goals still need " + cad0(goalsPP()) + " a pay, so the difference is yours to spend or keep, or put toward a goal.";
    var leftNew = b.leftPP + diff, wrap = function (a: any, rows: any, lead2: any) { if (!dated) { a._rows = rows; a._lead = lead2; return a; } return { type: "dated", start: iso(F.d), startN: F.n, label: lab, inner: a, rows: rows, lead: lead2, _alt: a._alt }; };
    var payRows = [["Each pay", cad0(b.pay) + " → about " + cad0(np) + " a pay" + (dated ? ", " + startTxt : "")], ["Left to spend a pay", cad0(b.leftPP) + " → about " + cad0(leftNew)]];
    var acts = [wrap({ type: "pay_update", amount: np, _approx: true }, payRows, dated ? "Starts with your first " + lab + " pay (" + MON3[F.d.getUTCMonth()] + " " + F.d.getUTCDate() + "). Your plan before then stays as it is." : null)];
    if (/\b(what should i do|where should|what do i do|extra money|the extra)\b/.test(q)) {
      var gs = liveGoals().filter(function (g: any) { return !goalDone(g) && num(g.target) > 0; }).slice(0, 2), L = locInfo();
      t += " With your numbers: " + gs.map(function (g: any) { return g.name + " has " + cad0(toGo(g)) + " to go"; }).join(", ") + (L ? ", and your line of credit is about " + cad0(L.bal) + " at about " + L.rate + "%" : "") + ". Any of those, or none, is your choice; the cards below put the extra toward one" + (dated ? ", also from " + lab : "") + ".";
      var ex = Math.floor(Math.max(0, diff) / 5) * 5, sN = dated ? F.n : 1;
      if (ex >= 5) {
        gs.filter(function (g: any) { return num(g.perPay) > 0 && g.by; }).slice(0, 2).forEach(function (g: any) {
          var np2 = num(g.perPay) + ex, rd = reachWith(g, np2, sN), cur = reachWith(g, num(g.perPay), 1);
          var x: any = { type: "goal_update", goal: g.id, perPay: np2 }; x._alt = true;
          acts.push(wrap(x, [["Every payday", cad0(g.perPay) + " → " + cad0(np2) + (dated ? ", " + startTxt : "")], ["Reaches " + cad0(g.target), "about " + monYd(rd) + " instead of " + monYd(cur)]],
            "Puts all " + cad0(ex) + " a pay of the extra toward " + g.name + (dated ? " from " + lab : "") + "; you’d reach " + cad0(g.target) + " by about " + monYd(rd) + " instead of " + monYd(cur) + ". It stops once the goal is reached."));
        });
        if (L) { var nl = Math.round(L.pay + ex * ppy() / 12), xl: any = { type: "bill_update", bill: L.bill.id, amount: nl }; xl._alt = true;
          acts.push(wrap(xl, [["Each month", cad0(L.pay) + " → " + cad0(nl) + (dated ? ", " + startTxt : "")], ["Left to spend a pay", "about " + cad0(leftNew) + " → about " + cad0(leftNew - (nl - L.pay) * 12 / ppy()) + (dated ? ", on the new pay" : "")]],
            "Puts the extra toward your line of credit" + (dated ? " from " + lab : "") + ", on top of the " + cad0(L.pay) + " a month you pay now.")); }
      }
    }
    t += dated ? " Each card starts with your first " + lab + " pay when you tap it; nothing in November or December changes." : " Nothing changes until you confirm.";
    return { text: t, actions: acts, altLead: "If you’d like the extra to work for you" + (dated ? ", also from " + lab : ", after the pay change") + ":", needsCard: true, payExplicit: true, note: COPY.taxNote };
  }
  /* the first payday in a named month (next occurrence) */
  function firstPayIn(monthName?: any): any {
    var mi = MONL.indexOf(monthName), T = today(), y = T.getUTCFullYear(); if (mi < 0) return null; if (mi < T.getUTCMonth()) y++;
    for (var n = 1; n < 80; n++) { var d = payDate(n); if (d.getUTCFullYear() === y && d.getUTCMonth() === mi) return { n: n, d: d }; if (d.getUTCFullYear() > y) break; }
    return null;
  }
  /* when a goal reaches its target if its pace changes from payday startN on (PM-R62 b: say what the card does) */
  function reachWith(g?: any, newPer?: any, startN?: any): any {
    var pend = 0; pend = !g.invested ? num(E.pendingFor(st(), g)) : 0; /* same basis as Home's date: this payday's waiting request counts */
    var s0 = num(g.saved) + pend, k = 0, per0 = num(g.perPay); if (!(newPer > 0)) return payDate(1);
    while (s0 < num(g.target) - 0.005 && k < 600) { k++; s0 += k < startN ? per0 : newPer; }
    return payDate(Math.max(1, k));
  }
  function payFromSalary(gross?: any, lead?: any): any {
    var t = takeHome(gross), pp = Math.round(t.perPay), s = scenario(pp), b = budget();
    CTX.pending = null;
    var same = !(b && Math.abs(pp - b.pay) >= 1);
    return { text: lead + " " + cad0(gross) + " a year is about " + cad0(pp) + " a pay after tax, " + freqLabel() + " (estimate). Your goals still need " + cad0(goalsPP()) + " a pay, so about " + cad0(r10(Math.max(0, s.flex))) + " a month would be left for everything else." + (same ? " That’s about what you’re paid now, so your plan stays as it is." : " Here it is for your plan; nothing changes until you confirm, and you can adjust it when your first pay stub arrives."), actions: same ? [] : [{ type: "pay_update", amount: pp }], needsCard: !same, note: COPY.taxNote };
  }
  function compareJobs(sal?: any): any {
    var b = budget(); if (!b) return { text: "Add your pay in Plan first, and I’ll compare the offers with your own numbers." };
    var offers = sal.slice(0, 2).sort(function (x: any, y: any) { return x - y; });
    var cols = offers.map(function (g: any) { var t = takeHome(g), pp = Math.round(t.perPay); return { gross: g, perPay: pp, s: scenario(pp) }; });
    CTX.lastCompare = { offers: offers, cols: cols };
    var need = goalsPP(), parts = cols.map(function (c: any) { return cad0(c.gross) + ": about " + cad0(c.perPay) + " a pay"; });
    var short = cols.filter(function (c: any) { return c.s.flex < 0; });
    var txt = (cols.length > 1 ? "Here are both offers" : "Here’s the offer") + " with your own numbers. Take-home, after tax: " + parts.join("; ") + " (estimates). ";
    if (!short.length) txt += "Your goals need " + cad0(need) + " a pay either way, so their dates stay the same: " + goalsLine(3) + ". The difference is room: " + cols.map(function (c: any) { return "about " + cad0(r10(c.s.flex)) + " a month at " + cad0(c.gross); }).join(" and ") + ".";
    else txt += "At " + cad0(short[0].gross) + ", your goals would need about " + cad0(r10(short[0].s.short)) + " more a month than the pay leaves after bills, so a date or an amount would have to move. " + (cols.length > 1 && short.length < cols.length ? "At " + cad0(cols[cols.length - 1].gross) + " they keep their dates." : "");
    return { text: txt, compare: cols, chips: (cols.length > 1 ? ["I took the " + cad0(offers[1]) + " job", "What if the extra goes to a goal?"] : ["I took it"]).concat(["How is take-home worked out?"]) };
  }
  function whatIfExtra(q?: any): any {
    var C = CTX.lastCompare, b = budget(); if (!C || !b) return null;
    var hi = C.cols[C.cols.length - 1], base = C.cols.length > 1 ? C.cols[0].perPay : b.pay, extra = Math.max(0, hi.perPay - base);
    var g = findGoal(q) || liveGoals().filter(function (x: any) { return x.by && num(x.target) > 0 && !goalDone(x) && !x.paused; }).sort(function (x: any, y: any) { return String(x.by).localeCompare(String(y.by)); }).pop();
    if (!g || !(extra > 0)) return { text: "Those offers pay about the same, so there’s no extra to move." };
    var add = Math.floor(extra / 5) * 5, np = num(g.perPay) + add, n = Math.ceil(Math.max(0, num(g.target) - num(g.saved)) / np), d = payDate(n), nb = iso(monthEnd(d.getUTCFullYear(), d.getUTCMonth()));
    return { text: "At " + cad0(hi.gross) + " the difference is about " + cad0(add) + " a pay. If all of it went to " + g.name + ", it would arrive around " + MON3[d.getUTCMonth()] + " " + d.getUTCFullYear() + " instead of " + reach(g).replace(/^by /, "") + ". That’s only if you want to; the extra is just as fine to spend or keep.", actions: [{ type: "goal_update", goal: g.id, perPay: np, by: nb }], needsCard: true };
  }
  function moveDate(g?: any, q?: any, by?: any): any {
    if (!g.by || !(num(g.target) > 0)) return { text: g.name + " doesn’t have a date; it runs on " + cad0(r10(num(g.perPay) * mf())) + " a month. You can change the amount instead." };
    var cur = parseD(g.by), nb = by;
    var rel = /\b(back|later|push)\b[^.?!]{0,12}?(a|one|\d{1,2})?\s*(month|year)s?\b/.exec(q) || /\b(forward|earlier|sooner)\b[^.?!]{0,12}?(a|one|\d{1,2})?\s*(month|year)s?\b/.exec(q);
    if (!nb && rel) { var k = rel[2] && /\d/.test(rel[2]) ? +rel[2] : 1, mo = /year/.test(rel[3]) ? 12 * k : k, sign = /forward|earlier|sooner/.test(rel[1]) ? -1 : 1, d0 = E.ymd(cur.getUTCFullYear(), cur.getUTCMonth() + sign * mo, 1); nb = iso(monthEnd(d0.getUTCFullYear(), d0.getUTCMonth())); }
    if (!nb) { CTX.pending = null; return { text: "To which month? For example: move " + g.name + " to June 2027.", chips: ["Move " + g.name + " back 3 months", "Move " + g.name + " back a year"] }; }
    if (parseD(nb) <= today()) return { text: "That date has already passed. Pick a month ahead, like " + monYL(iso(monthEnd(today().getUTCFullYear() + 1, 5))) + "." };
    var np = Math.max(5, Math.ceil(Math.max(0, num(g.target) - num(g.saved)) / paydaysTo(nb) / 5) * 5), diffM = (num(g.perPay) - np) * mf();
    return { text: "Moving " + g.name + " to " + monYL(nb) + " " + (np < num(g.perPay) ? "lowers it to about " + cad0(np) + " a payday and frees about " + cad0(r10(diffM)) + " a month." : np > num(g.perPay) ? "needs about " + cad0(np) + " a payday, about " + cad0(r10(-diffM)) + " more a month." : "keeps the same " + cad0(np) + " a payday.") + " Here’s the change; nothing changes until you confirm.", actions: [{ type: "goal_update", goal: g.id, by: nb, perPay: np }], needsCard: true };
  }
  function goalFor(item?: any, amount?: any, by?: any): any {
    var name = item.charAt(0).toUpperCase() + item.slice(1), qp = E.quickGoalPlan(st(), amount, by);
    var s = scenario((budget() || {}).pay || 0), after = s ? s.room - qp.perPay * mf() : 0;
    return { text: "About " + cad0(qp.perPay) + " a payday for " + qp.n + " payday" + (qp.n === 1 ? "" : "s") + " gets you " + cad0(amount) + " by " + monYL(by) + ". It goes in Near-term experiences." + (s && after < 0 ? " With your other goals, that’s more than your pay leaves after bills and your usual spending, so a later date would fit more easily. Your choice." : ""), actions: [{ type: "goal_add", name: name, target: Math.round(amount), perPay: qp.perPay, by: by, where: "Questrade TFSA, as cash", kind: /trip|flight|travel|vacation/i.test(item) ? "trip" : "other" }] };
  }
  function affordFor(item?: any, amount?: any): any {
    var r: any = null;
    var later = E.ymd(today().getUTCFullYear(), today().getUTCMonth() + 2, 0), lb = iso(later);
    var alt: any = { type: "goal_add", name: (item && item !== "it" ? item.charAt(0).toUpperCase() + item.slice(1) : "Purchase"), target: Math.round(amount), perPay: E.quickGoalPlan(st(), amount, lb).perPay, by: lb, where: "Questrade TFSA, as cash", kind: "other" };
    alt._alt = true;
    var b = budget(); if (!b) return { text: "I can’t see your spending yet. Connect your bank and I’ll check it." };
    if (amount <= b.leftNow) return { text: "Yes. After " + cad0(amount) + " you’d have about " + cad0(b.leftNow - amount) + " left to spend until " + b.monthEnd + ", and your goals stay on pace. That’s an estimate from your own numbers.", actions: [alt], altLead: "Or, if you’d rather save up for it first:" };
    return { text: "Not from this month’s spending money alone: it’s about " + cad0(amount - Math.max(0, b.leftNow)) + " more than you have left. Saving up for it as a goal keeps everything else on pace.", actions: [alt] };
  }
  function goalIntent(q?: any, raw?: any, amt?: any, by?: any): any {
    var P = CTX.pending && CTX.pending.type === "goal" ? CTX.pending : { type: "goal" };
    var nm = /\b(?:goal|save|saving|planning)\b(?:\s+(?:up|a|an|to))?\s*(?:for|towards?|called|named|:)?\s+(?:a |an |my |our |the )?([a-z][a-z' ]{1,30}?)(?=\s+(?:by|in|of|for|worth|before|\$|\d)|[.?!,]|\s*$)/.exec(q);
    var nm2 = /\b(?:trip|vacation) to ([a-z][a-z ]{1,20}?)(?=\s+(?:by|in|for|\$|\d)|[.?!,]|\s*$)/.exec(q);
    if (nm2) P.name = "Trip to " + nm2[1].replace(/\b\w/g, function (c: any) { return c.toUpperCase(); }).trim();
    else if (nm && !P.name && !/^(a|an|goal|it|this|that|money)$/.test(nm[1].trim())) P.name = nm[1].trim().replace(/^./, function (c: any) { return c.toUpperCase(); });
    if (amt) P.amount = amt; if (by) P.by = by;
    if (P.name && !P.amount) { CTX.pending = P; return { text: "Good one. Roughly how much for " + P.name.toLowerCase() + "?", chips: ["$500", "$1,000", "$3,000"] }; }
    if (!P.name) { CTX.pending = P; return { text: "Happy to. What’s it for, how much, and by when? For example: a trip to Montreal, $600 by March 2027.", chips: ["Plan my goals"] }; }
    if (!P.by) { var yh = CTX.yearHint; CTX.yearHint = null; if (yh) P.yearHint = yh; yh = P.yearHint; CTX.pending = P; return { text: yh ? "Which month in " + yh + "?" : "By when? A month and year is perfect.", chips: yh ? ["Mar " + yh, "Jun " + yh, "Sep " + yh, "Dec " + yh] : ["Mar 2027", "Jun 2027", "Dec 2027"] }; }
    CTX.pending = null;
    return goalFor(P.name, P.amount, P.by);
  }

  /* ---------- planning questions with her own numbers (PM-R15, R30, R31; CR11 s2; Compliance 18:33 routing) ---------- */
  function allMoney(t?: any): any {
    var re = /\$\s?(\d[\d,]*(?:\.\d+)?)\s?(k\b)?|\b(\d[\d,]*(?:\.\d+)?)\s?(k|grand|dollars|bucks)\b/gi, m, out: any[] = [], s = String(t || "");
    while ((m = re.exec(s))) { var v = parseFloat(String(m[1] || m[3]).replace(/,/g, "")) * ((m[2] || /k|grand/i.test(m[4] || "")) ? 1000 : 1); if (v > 0) out.push(v); }
    return out;
  }
  function IM(): any { return IV_MATH; }
  function nice(n?: any): any { return n >= 100000 ? Math.round(n / 5000) * 5000 : n >= 20000 ? Math.round(n / 1000) * 1000 : n >= 5000 ? Math.round(n / 500) * 500 : Math.round(n / 50) * 50; }
  function herAge(): any { var U = st().user || {}; return num(U.age) > 0 ? num(U.age) : U.ageFacts && num(U.ageFacts.age) > 0 ? num(U.ageFacts.age) : null; }
  function myPortfolio(g?: any): any {
    var P = st().portfolios || [], t = st().target || {}, p = null;
    p = g ? E.goalPortfolio(st(), g) : null;
    return p || P.filter(function (x: any) { return x.id === t.id; })[0] || null;
  }
  function rates(g?: any): any {
    var M2 = IM(), p = myPortfolio(g), r = null; try { r = M2 && p ? M2.rateFor(p) : null; } catch (e) { r = null; }
    return r || { name: "a balanced mix", mid: 5.2, low: 3.2, realMid: 1.052 / 1.021 - 1, realLow: 1.032 / 1.021 - 1, generic: true };
  }
  function yrsMo(n?: any): any { var y = Math.floor(n / 12), mo = n % 12; return (y ? y + " year" + (y === 1 ? "" : "s") : "") + (y && mo ? " and " : "") + (mo ? mo + " month" + (mo === 1 ? "" : "s") : ""); }
  function addMonths(n?: any): any { var t = today(); return E.ymd(t.getUTCFullYear(), t.getUTCMonth() + n, 1); }
  function monYd(d?: any): any { return MON3[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
  function goalByKind(k?: any): any { return liveGoals().filter(function (g: any) { return g.kind === k; })[0] || null; }
  function grossFor(perPay?: any): any { var lo = 15000, hi = 600000; for (var i = 0; i < 40; i++) { var mid = (lo + hi) / 2; if (takeHome(mid).perPay < perPay) lo = mid; else hi = mid; } return Math.round((lo + hi) / 2 / 100) * 100; }
  function toGo(g?: any): any { return Math.max(0, num(g.target) - num(g.saved)); }

  /* retirement: her pace in today's dollars, at 55, 60 and 65 (interview math and label; PM-R10 income line) */
  function annuityM(egg?: any, real?: any): any { var a = Math.abs(real) < 1e-9 ? egg / 25 : egg * real / (1 - Math.pow(1 + real, -25)); return a / 12; }
  function retireRows(g?: any, ages?: any): any {
    var M2 = IM(), age = herAge(); if (!M2 || !g || age == null) return null;
    var r = rates(g), mo = num(g.monthly) || num(g.perPay) * mf(), saved = num(g.saved);
    return ages.filter(function (A: any) { return A > age; }).map(function (A: any) {
      var n = (A - age) * 12, lo = M2.fv(mo, saved, n, r.realLow), hi = M2.fv(mo, saved, n, r.realMid);
      return { age: A, lo: nice(lo), hi: nice(hi), incLo: r10(annuityM(lo, r.realLow)), incHi: r10(annuityM(hi, r.realMid)) };
    });
  }
  function retireCard(g?: any, rows?: any): any {
    var mo = num(g.monthly) || num(g.perPay) * mf();
    return { title: "Your retirement pace", tag: "Illustration", lead: cad0(mo) + " a month, with " + cad0(g.saved) + " there now. Today’s dollars.",
      rows: rows.map(function (x: any) { return { l: "By " + x.age, v: cad0(x.lo) + " to " + cad0(x.hi), s: "could pay " + cad0(x.incLo) + " to " + cad0(x.incHi) + " a month for 25 years" }; }),
      foot: (IM() ? IM().LABEL : "Planning illustration, not a promise.") + " The low end assumes returns 2 points lower. It doesn’t count CPP, OAS or a workplace pension." };
  }
  function ageIn(q?: any): any { var m = /\b(?:retire|retiring|stop working|retirement)\b[^.?!]{0,16}?\b(?:at|by|from|when i'?m)\s+(\d{2})\b/.exec(q) || /\b(?:at|from|by) (?:age )?(\d{2})\b/.exec(q); var a: any = m ? +m[1] : null; return a >= 45 && a <= 75 ? a : null; }
  function retireNoGoal(): any { return { text: "You don’t have a retirement goal yet. Want to set one up? It takes a few questions.", chips: ["Plan my goals"] }; }
  function retireEnough(q?: any): any {
    var g = goalByKind("retirement"); if (!g) return retireNoGoal();
    var mo = num(g.monthly) || num(g.perPay) * mf(), rows = retireRows(g, [55, 60, 65]); if (!rows || !rows.length) return null;
    CTX.lastRetire = true;
    var R2 = g.retire || {};
    if (R2.annual) return workBack(q, R2.annual, R2.stopAt || 65, true);
    var at65 = rows[rows.length - 1];
    return { text: "You haven’t set a retirement target yet, so there’s nothing to measure enough against. Here’s your pace: " + cad0(mo) + " a month into " + g.name + ", with " + cad0(g.saved) + " there now. In today’s dollars that could grow to about " + cad0(at65.lo) + " to " + cad0(at65.hi) + " by " + at65.age + ", which could pay about " + cad0(at65.incLo) + " to " + cad0(at65.incHi) + " a month for 25 years. " + COPY.cpp + " " + COPY.cppDef + " Want to set a target?",
      table: retireCard(g, rows), chips: ["Set a retirement target", "Could I retire at 55?"] };
  }
  function retireAt(q?: any, A?: any): any {
    var g = goalByKind("retirement"); if (!g) return retireNoGoal();
    var rows = retireRows(g, [A]); if (!rows) return null; if (!rows.length) return { text: "You’re already past " + A + " in your profile, so I can’t work that one out. Try a later age." };
    var x = rows[0], mo = num(g.monthly) || num(g.perPay) * mf(); CTX.lastRetire = true;
    var early = A < 60 ? " CPP (the Canada Pension Plan you pay into from each pay) can start at 60 at the earliest, and OAS (Old Age Security, a government pension) at 65, so the first years would come from your own savings." : A < 65 ? " OAS (Old Age Security, a government pension) starts at 65, so the first years would lean more on your own savings. " + COPY.cpp + " " + COPY.cppDef : " " + COPY.cpp + " " + COPY.cppDef;
    return { text: "At your pace, " + cad0(mo) + " a month with " + cad0(g.saved) + " there now, by " + A + " you could have about " + cad0(x.lo) + " to " + cad0(x.hi) + " in today’s dollars. That could pay about " + cad0(x.incLo) + " to " + cad0(x.incHi) + " a month for 25 years." + early + " Whether it’s realistic depends on what you’d want to live on. Tell me a yearly amount and I’ll work back what it takes.",
      table: retireCard(g, retireRows(g, A === 65 ? [55, 60, 65] : [A, 65])), chips: ["$50,000 a year from " + A, "$40,000 a year from " + A, "Set a retirement target"] };
  }
  function workBack(q?: any, annual?: any, stop?: any, fromTarget?: any): any {
    var g = goalByKind("retirement"), M2 = IM(), age = herAge(), b = budget(); if (!g) return retireNoGoal(); if (!M2 || age == null || !b) return null;
    if (stop <= age) return { text: "That age has already passed in your profile. Try a later one." };
    var r = rates(g), n = (stop - age) * 12, saved = num(g.saved), mo = num(g.monthly) || num(g.perPay) * mf();
    var need = M2.monthlyNeeded(M2.nestEgg(annual, r.realMid), saved, n, r.realMid), stress = M2.monthlyNeeded(M2.nestEgg(annual, r.realLow), saved, n, r.realLow);
    need = r10(need); stress = r10(stress); CTX.lastRetire = true; CTX.pending = null;
    var t = (fromTarget ? "Your target is about " : "To have about ") + cad0(annual) + " a year from " + stop + ", in today’s dollars" + (fromTarget ? ". That needs" : ", you’d put in") + " about " + cad0(need) + " a month from now (illustration). If returns are 2 points lower, about " + cad0(stress) + ". You put in " + cad0(mo) + " a month now. " + COPY.cpp + " That would lower it. " + COPY.cppDef;
    var s = scenario(b.pay), room = s ? s.room : 0, extra = need - mo;
    if (extra <= 5) return { text: t + " So what you put in now already covers it on these assumptions.", note: M2.LABEL, chips: ["What about from 55?", "How are my goals doing?"] };
    var pp = Math.ceil(need / mf() / 5) * 5;
    if (extra <= room + 0.5) return { text: t + " That’s about " + cad0(r10(extra)) + " a month more, and it fits after your bills, other goals and usual spending. Here it is as a change to " + g.name + "; nothing changes until you confirm.", note: M2.LABEL, actions: [{ type: "goal_update", goal: g.id, perPay: pp }], needsCard: true };
    var at65 = stop < 65 ? r10(M2.monthlyNeeded(M2.nestEgg(annual, r.realMid), saved, (65 - age) * 12, r.realMid)) : null;
    return { text: t + " That’s about " + cad0(r10(extra)) + " a month more than your plan has room for after bills, your other goals and your usual spending. A later age or a smaller yearly amount would fit more easily" + (at65 ? "; from 65 it would be about " + cad0(at65) + " a month" : "") + ". Your choice.", note: M2.LABEL,
      chips: (stop < 65 ? [cad0(annual) + " a year from 65"] : []).concat([cad0(Math.round(annual * 0.75 / 1000) * 1000) + " a year from " + stop, "Talk to a planner"]) };
  }

  /* line of credit: pay it down faster, or invest the same $100 (planning, with the FP Canada illustration, labelled) */
  function locInfo(): any {
    var A = (Array.isArray(st().accounts) ? st().accounts : []).filter(function (a: any) { return a.kind === "debt"; })[0] || null;
    var bill = (st().bills || []).filter(function (x: any) { return x.id === "loc" || /line of credit/i.test(x.name || ""); })[0] || null;
    if (!A || !bill) return null;
    var rate: any = null; (A.details || []).forEach(function (kv: any) { if (/rate/i.test(kv[0])) { var m2 = /([\d.]+)\s*%/.exec(kv[1]); if (m2) rate = +m2[1]; } });
    if (rate == null) { var m3 = /([\d.]+)\s*%/.exec(A.sub || ""); if (m3) rate = +m3[1]; }
    return rate == null ? null : { acct: A, bill: bill, bal: num(A.balance), rate: rate, pay: num(bill.amount), min: num(bill.min), name: A.name || "Line of credit" };
  }
  function payoff(B?: any, ratePct?: any, P?: any): any { var i = ratePct / 1200, bal = B, n = 0, it = 0; if (P <= B * i + 0.01) return null; while (bal > 0.005 && n < 1200) { var x = bal * i; it += x; bal = bal + x - P; n++; } return { n: n, interest: it }; }
  function fvNom(monthly?: any, months?: any, ratePct?: any): any { var i = Math.pow(1 + ratePct / 100, 1 / 12) - 1; return i === 0 ? monthly * months : monthly * (Math.pow(1 + i, months) - 1) / i; }
  function locReply(): any {
    var L = locInfo(), b = budget(); if (!L || !b) return { text: "I can’t see a line of credit or a loan in your accounts yet. Connect it in Accounts and I’ll work it through with your numbers." };
    var X = 100, a = payoff(L.bal, L.rate, L.pay), c = payoff(L.bal, L.rate, L.pay + X); if (!a || !c) return null;
    var inv = goalByKind("invest") || goalByKind("retirement"), r = rates(inv), d1 = addMonths(a.n), d2 = addMonths(c.n);
    var hi = nice(fvNom(X, a.n, r.mid)), lo = nice(fvNom(X, a.n, r.low)), saved = r10(a.interest - c.interest);
    var after = a.n - c.n, hi2 = nice(fvNom(L.pay + X, after, r.mid)), lo2 = nice(fvNom(L.pay + X, after, r.low));
    var pf = myPortfolio(inv), pfName = pf ? "your " + pf.name + " portfolio" : "a portfolio";
    var pp = Math.round(X / mf()), acts = [{ type: "bill_update", bill: L.bill.id, amount: L.pay + X }];
    if (inv) { var a2: any = { type: "goal_update", goal: inv.id, perPay: num(inv.perPay) + pp }; a2._alt = true; acts.push(a2); }
    return { text: "Here it is with your numbers: about " + cad0(L.bal) + " at about " + L.rate + "% (it moves with your bank’s rate, called Prime, so it goes up and down), and your plan pays " + cad0(L.pay) + " a month. An extra " + cad0(X) + " a month on it saves about " + cad0(saved) + " of interest and finishes about " + yrsMo(after) + " sooner, whatever markets do. The same " + cad0(X) + " invested in " + pfName + " could end up worth more or less than that; the illustration is below. Both are reasonable, and it’s your choice. Pick one below, or keep things as they are.",
      table: { title: "An extra " + cad0(X) + " a month", tag: "Estimates", sections: [
        { h: "On the line of credit", rows: [{ l: "Paid off", v: "about " + monYd(d2), s: "instead of " + monYd(d1) }, { l: "Interest along the way", v: "about " + cad0(r10(c.interest)), s: "instead of " + cad0(r10(a.interest)) }, { l: "Then, invest " + cad0(L.pay + X) + " a month", v: cad0(lo2) + " to " + cad0(hi2), s: "by " + monYd(d1) + " (illustration)" }] },
        { h: "Invested instead", rows: [{ l: "By " + monYd(d1), v: cad0(lo) + " to " + cad0(hi), s: "from " + cad0(X * a.n) + " put in (illustration)" }, { l: "Line of credit", v: "paid off " + monYd(d1), s: "about " + cad0(r10(a.interest)) + " of interest" }] }],
        foot: "The line of credit figures assume today’s rate stays the same. Investment figures: " + (IM() ? IM().LABEL : "planning illustration, not a promise.") + " The low end assumes returns 2 points lower, before any tax. Investments can go down." },
      actions: acts, altLead: inv ? "Or put the " + cad0(X) + " a month toward " + inv.name + ":" : null, needsCard: true, chips: ["Talk to a planner"] };
  }

  /* a goal's cost changes: before and after on one card, date kept, or the same pace with a later date (PM-R30) */
  function costChange(q?: any, g?: any, amts?: any, by?: any): any {
    var cur = num(g.target), nt = amts.filter(function (x: any) { return Math.abs(x - cur) > 0.5; })[0];
    if (/\$\s?[\d,]+k?\s+(more|extra|on top)\b/.test(q) && amts.length === 1 && amts[0] < cur) nt = cur + amts[0];
    if (!(nt > 0)) return null;
    CTX.lastGoal = g.id;
    var left = Math.max(0, nt - num(g.saved)), b = budget(), when = by || g.by;
    if (!when) return { text: g.name + " would go from " + cad0(cur) + " to " + cad0(nt) + ". It doesn’t have a date, so its pace stays " + cad0(g.perPay) + " a payday. Here’s the change; nothing changes until you confirm.", actions: [{ type: "goal_update", goal: g.id, target: nt }], needsCard: true };
    var n = paydaysTo(when), np = Math.max(5, Math.ceil(left / n / 5) * 5), extraM = (np - num(g.perPay)) * mf(), s = b ? scenario(b.pay) : null;
    var fits = !s || extraM <= s.room + 0.5;
    var act: any = { type: "goal_update", goal: g.id, target: nt, perPay: np }; if (by && by !== g.by) act.by = by; else act._keepDate = true;
    var acts = [act], alt = "";
    if (num(g.perPay) > 0 && np > num(g.perPay)) {
      var n2 = Math.ceil(left / num(g.perPay) - 1e-9), d2 = payDate(n2), nb2 = iso(monthEnd(d2.getUTCFullYear(), d2.getUTCMonth()));
      var a2: any = { type: "goal_update", goal: g.id, target: nt, by: nb2 }; a2._alt = true; acts.push(a2);
      alt = " Or keep " + cad0(g.perPay) + " a payday and go around " + monYL(nb2) + ".";
    }
    var wantsYes = /\b(can i|could i|still|ok|okay)\b/.test(q);
    var lead = np <= num(g.perPay) ? (wantsYes ? "Yes. " : "") + "Your " + cad0(g.perPay) + " a payday already gets " + g.name + " to " + cad0(nt) + " by " + monYL(when) + "."
      : (wantsYes ? (fits ? "Yes, if you put in a little more. " : "You can, but it’s tight. ") : "") + cad0(nt) + " by " + monYL(when) + " needs about " + cad0(np) + " a payday" + (num(g.perPay) > 0 ? " instead of " + cad0(g.perPay) : "") + " (" + n + " paydays left, with " + cad0(g.saved) + " saved)." +
        (fits ? " That still fits after your bills, other goals and usual spending." : " That’s about " + cad0(r10(extraM - (s ? Math.max(0, s.room) : 0))) + " a month more than your pay leaves after bills, your other goals and your usual spending.");
    return { text: lead + alt + (acts.length > 1 ? " Here are both; nothing changes until you pick one." : " Here’s the change; nothing changes until you confirm."), actions: acts, altLead: acts.length > 1 ? "Or keep " + cad0(g.perPay) + " a payday and move the date:" : null, needsCard: true };
  }

  /* a bill changes: the bill-change card with the new left to spend (PM-R15 c) */
  var BILLW: any[] = [["rent", /\brent\b/], ["phone", /\b(phone|cell|mobile) (bill|plan)?\b|\bphone\b/], ["gym", /\bgym\b/], ["spotify", /\bspotify\b/], ["util", /\b(utilities|hydro|electricity|internet)\b/], ["tenant", /\b(tenant|renter'?s) insurance\b/], ["loc", /\b(line of credit|loc) payment\b/]];
  function billFor(q?: any): any { var B = st().bills || []; for (var i = 0; i < BILLW.length; i++) if (BILLW[i][1].test(q)) { var x = B.filter(function (y: any) { return y.id === BILLW[i][0]; })[0]; if (x) return x; } return B.filter(function (y: any) { var w = String(y.name || "").toLowerCase().split(/\s+/)[0]; return w.length >= 4 && new RegExp("\\b" + w + "\\b").test(q); })[0] || null; }
  function billChange(bl?: any, q?: any, amt?: any): any {
    var b = budget(); if (!b) return null;
    var nw = amt; if (/\bby \$?\s?\d/.test(q) && amt < bl.amount) nw = /\b(down|lower|drop|less|cheaper|decreas)/.test(q) ? bl.amount - amt : bl.amount + amt;
    nw = Math.round(nw * 100) / 100; if (!(nw >= 1) || Math.abs(nw - bl.amount) < 0.01) return { text: bl.name + " is already " + cad0(bl.amount) + " a month in your plan." };
    var diff = nw - bl.amount, leftPP2 = b.leftPP - diff * 12 / b.ppy, flex2 = b.flexM - diff, usual = st().spending ? b.usualEv : null;
    CTX.pending = null;
    var t = bl.name + " going from " + cad0(bl.amount) + " to " + cad0(nw) + " a month is " + cad0(Math.abs(diff)) + (diff > 0 ? " more" : " less") + ". Your goals keep their pace: they still need " + cad0(goalsPP()) + " a pay. Left to spend a pay would go from " + cad0(b.leftPP) + " to " + cad0(leftPP2) + ", about " + cad0(r10(Math.max(0, flex2))) + " a month for everything else.";
    if (flex2 < 0) t += " That’s less than your goals need, so a goal would have to slow or move. Your choice.";
    else if (usual != null && diff > 0 && flex2 < usual) t += " You usually spend about " + cad0(r10(usual)) + " a month, so it would be tighter; a goal date could move if you’d like. Your choice.";
    return { text: t + " Here’s the change; nothing changes until you confirm.", actions: [{ type: "bill_update", bill: bl.id, amount: nw }], needsCard: true };
  }

  function guaranteeReply(): any {
    var G = liveGoals().filter(function (g: any) { return !g.paused && !goalDone(g) && g.by && num(g.target) > 0; });
    var off = G.filter(function (g: any) { try { return !E.goalOk(st(), g); } catch (e) { return false; } });
    if (!off.length) return { text: COPY.guarantee, chips: ["How are my goals doing?"] };
    return { text: "No one can promise that. At today’s amounts, " + off.map(function (g: any) { return g.name; }).join(" and ") + (off.length === 1 ? " needs" : " need") + " a look, and the rest are on track; that’s an estimate from your own numbers, and investments can go down.", chips: ["How are my goals doing?"] };
  }
  function taxOnly(inc?: any): any {
    var fed = Math.max(0, prog(inc, TAX_T.fed.b) - TAX_T.fed.low * TAX_T.fed.bpa), onb = Math.max(0, prog(inc, TAX_T.on.b) - TAX_T.on.low * TAX_T.on.bpa);
    return fed + onb + 0.2 * Math.max(0, onb - TAX_T.on.s1) + 0.36 * Math.max(0, onb - TAX_T.on.s2) + ohp(inc);
  }

  /* tax season, workplace plans, other accounts, couples (market discovery 18:5x, backlog 1 a): planning answers from her numbers, or an honest scope line */
  function roomOf(id?: any): any { var a = (Array.isArray(st().accounts) ? st().accounts : []).filter(function (x: any) { return x.id === id; })[0]; return a && (a.roomLeft != null || a.room != null) ? num(a.roomLeft != null ? a.roomLeft : a.room) : null; }
  function grossNow(): any { var b = budget(); return b ? grossFor(b.pay) : null; }
  function taxDrop(amt?: any): any { var G = grossNow(); if (!G) return null; return Math.max(0, takeHome(G).tax - takeHome(Math.max(0, G - amt)).tax); }
  function topRate(): any { var G = grossNow(); if (!G) return null; return (takeHome(G + 1000).tax - takeHome(G).tax) / 10; }
  var RRSP_DEADLINE = "March 1, 2027", TAX_YEAR = 2026;
  function paydaysUntil(isoD?: any): any { try { return paydaysTo(isoD); } catch (e) { return 0; } }
  function taxIntents(q?: any, amt?: any, amts?: any): any {
    var b = budget(); if (!b) return null;
    var R0 = goalByKind("retirement"), H0 = goalByKind("home"), rrspRoom = roomOf("RRSP"), fhsaRoom = roomOf("FHSA"), tr = topRate();
    var trTxt = tr ? "about " + (Math.round(tr * 10) / 10) + "%" : null;
    /* RRSP or FHSA contribution: refund estimate, never a sale */
    if (/\b(rrsp|fhsa)\b/.test(q) && amt && /\b(tax|refund|back|deduct\w*|save on|lower my tax|put|putting|contribut\w*|deposit\w*|add)\b/.test(q) && !/\b(out of|take out|withdraw\w*|from my)\b/.test(q) && !/\b(rrsp|tfsa|fhsa)\b[^.?!]{0,24}\b(or|vs|versus)\b[^.?!]{0,12}\b(rrsp|tfsa|fhsa)\b/.test(q)) {
      var fh = /\bfhsa\b/.test(q), room = fh ? fhsaRoom : rrspRoom, use = room != null ? Math.min(amt, room) : amt, back = r10(taxDrop(use));
      return { safe: true, text: fh ? "At your income, about " + cad0(back) + " back (an estimate from 2026 federal and Ontario rates; your real refund depends on your whole tax return)." + (room != null ? " You have " + cad0(room) + " of FHSA room this year." : "") + (room != null && amt > room ? " Only " + cad0(room) + " of the " + cad0(amt) + " would count this year." : "")
        : "At your income, about " + cad0(back) + " back (an estimate from 2026 federal and Ontario rates; your real refund depends on your whole tax return)." + (room != null ? " You have " + cad0(room) + " of RRSP room this year." : "") + (room != null && amt > room ? " Only " + cad0(room) + " of the " + cad0(amt) + " would count; going more than $2,000 over your room is charged 1% a month." : "") + " For the " + TAX_YEAR + " tax year, the deadline is " + RRSP_DEADLINE + ".",
        note: COPY.taxNote, chips: ["When is the RRSP deadline?", "Talk to a planner"] };
    }
    if (/\broom\b/.test(q) && /\b(rrsp|tfsa|fhsa|contribution)\b/.test(q)) {
      var tf = roomOf("TFSA");
      return { safe: true, text: "From your accounts: " + [rrspRoom != null ? "RRSP about " + cad0(rrspRoom) : null, tf != null ? "TFSA about " + cad0(tf) : null, fhsaRoom != null ? "FHSA about " + cad0(fhsaRoom) + " this year" : null].filter(Boolean).join(", ") + " of room left. Your Notice of Assessment from the CRA has the official RRSP figure, and TFSA room is shared across all your TFSAs.", chips: ["When is the RRSP deadline?", "How much tax would I get back on $2,000 in my RRSP?"] };
    }
    if (/\brrsp\b/.test(q) && /\b(deadline|due|last day|cut.?off|when)\b/.test(q)) {
      var nD = paydaysUntil("2027-03-01"), inPlan = R0 ? num(R0.perPay) * nD : 0;
      return { safe: true, text: "For the " + TAX_YEAR + " tax year, the RRSP deadline is " + RRSP_DEADLINE + ". What you put in by then can be deducted on your " + TAX_YEAR + " return, within your room" + (rrspRoom != null ? ": your RRSP has about " + cad0(rrspRoom) + " left" : "") + "." + (R0 ? " Your plan puts about " + cad0(r10(inPlan)) + " in before then, from " + R0.name + "." : "") + (tr ? " At your pay, each $1,000 in brings back about " + cad0(r10(taxDrop(1000))) + " (estimate)." : "") + " Whether to put in more is your call.", note: COPY.taxNote, chips: ["How much tax would I get back on $2,000?", "Talk to a planner"] };
    }
    if (/\b(tax )?refund\b|\btax (back|return money)\b|\bget back\b.{0,20}\btax\b/.test(q) && !/\b(file|filing|prepare|do my)\b/.test(q)) {
      var rYr = R0 ? num(R0.perPay) * ppy() : 0, hYr = H0 && /FHSA/.test(H0.account || H0.where || "") ? Math.min(8000, num(H0.perPay) * ppy()) : 0, est = r10(taxDrop(rYr + hYr) || 0);
      var gs = liveGoals().filter(function (g: any) { return !goalDone(g) && num(g.target) > 0; }).slice(0, 2), L = locInfo();
      if (amt) return { safe: true, text: "That " + cad0(amt) + " is yours to decide on. With your numbers: " + gs.map(function (g: any) { return g.name + " has " + cad0(toGo(g)) + " to go"; }).join(", ") + (L ? "; your line of credit is about " + cad0(L.bal) + " at about " + L.rate + "%" : "") + (fhsaRoom != null ? "; your FHSA has " + cad0(fhsaRoom) + " of room this year" : "") + (rrspRoom != null ? " and your RRSP " + cad0(rrspRoom) : "") + ". Your goals already get what they need each payday, so spending some is fine too. Woodstock can’t move it; once it’s where you want it, I can update a goal’s pace.", chips: ["Pay off my line of credit faster?", "Talk to a planner"] };
      return { safe: true, text: "I can’t work out your whole refund; that depends on your full return, and Woodstock doesn’t file taxes. The part I can estimate: your plan puts about " + cad0(r10(rYr)) + " a year into your RRSP" + (hYr ? " and " + cad0(r10(hYr)) + " into your FHSA" : "") + ", which could bring back about " + cad0(est) + " (estimate, if your employer withholds tax at the usual rate).", note: COPY.taxNote, chips: ["When is the RRSP deadline?", "Talk to a planner"] };
    }
    if (/\bgroup (rrsp|retirement|pension)\b|\b(employer|company|work)\b.{0,20}\bmatch\w*\b|\bmatch\w*\b.{0,30}\b(rrsp|pension|contribut\w*)\b|\b(rrsp|pension|dpsp)\b.{0,30}\bmatch\w*\b/.test(q)) {
      var pct = /(\d{1,2}(?:\.\d)?)\s?%/.exec(q), G = grossNow();
      if (!pct || !G) return { safe: true, text: "A workplace match is extra pay you only get by contributing. What does your employer match, as a percent of your pay? I’ll work it out with your numbers. Woodstock can’t see your group plan yet.", chips: ["They match 4%", "They match 3%"] };
      var p = +pct[1], yr = G * p / 100, drop = Math.round(takeHome(G).perPay - takeHome(G - yr).perPay);
      return { safe: true, text: "If your employer matches dollar for dollar up to " + p + "%, putting in " + p + "% of your pay, about " + cad0(r10(yr)) + " a year, brings in another " + cad0(r10(yr)) + " from them. It comes off your pay before tax, so your take-home would drop by about " + cad0(drop) + " a pay, not the full " + cad0(Math.round(yr / ppy())) + " (estimate). Both amounts use RRSP room" + (rrspRoom != null ? "; yours shows about " + cad0(rrspRoom) + " left" : "") + ". Woodstock can’t see your group plan yet; tell me what you put in and I’ll count it in your plan.", note: COPY.taxNote, chips: ["Talk to a planner", "Am I saving enough for retirement?"] };
    }
    if (/\b(rsus?|restricted (stock|share) units?|stock options?|espp|company (stock|shares))\b/.test(q)) {
      var G2 = grossNow(), v = amts.filter(function (x: any) { return x >= 500; })[0], tax = v && G2 ? r10(takeHome(G2 + v).tax - takeHome(G2).tax) : null;
      var invNow = liveGoals().filter(function (g: any) { return g.invested || g.kind === "retirement" || g.kind === "invest"; }).reduce(function (s: any, g: any) { return s + num(g.saved); }, 0), share = v ? Math.round(v / (v + invNow) * 100) : null;
      return { safe: true, text: (v ? "About " + cad0(v) + " vesting is taxed as employment income when it vests: at your pay, about " + cad0(tax) + " of tax on it (estimate). " : "RSUs are taxed as employment income when they vest, at your top rate" + (trTxt ? ", " + trTxt + " at your pay (estimate)" : "") + ". ") + "Employers usually withhold some tax at vest; if it’s less than you owe, the rest is due when you file. " + (share ? "If you keep the shares, about " + share + "% of your investments would be in one company. " : "") + "Whether to keep or sell them is an investment decision I can’t make; Woodstock isn’t registered to. Any cash you take from it can be planned as a goal here.", note: COPY.taxNote, chips: ["Talk to a planner", "Add a goal"] };
    }
    var plan = /\bplan (on|with|around) \$\s?([\d,]+)\b/.exec(q);
    if (plan) { var pp2 = +plan[2].replace(/,/g, ""); if (pp2 >= 100 && Math.abs(pp2 - b.pay) >= 1) { var s2 = scenario(pp2); return { text: "Here’s your plan on " + cad0(pp2) + " a pay. Your goals still need " + cad0(goalsPP()) + " a pay, so about " + cad0(r10(Math.max(0, s2.flex))) + " a month would be left for everything else" + (s2.flex < 0 ? ", which is short, so a goal would have to slow or move" : "") + ". Anything above it on a bigger payday is yours. Nothing changes until you confirm.", actions: [{ type: "pay_update", amount: pp2 }], needsCard: true }; } }
    if (/\b(shifts?|variable|irregular|commission|tips|seasonal|freelanc\w*|contract work|gig)\b|\bpay (changes|varies|is different|goes up and down)\b|\bchanges every\b/.test(q)) {
      var lo1 = Math.round(b.pay * 0.88 / 50) * 50, lo2 = Math.round(b.pay * 0.78 / 50) * 50;
      return { safe: true, text: "When pay changes, the plan works best on a lower, usual pay: your goals then fit even on a slow payday, and anything above it is yours to spend or keep, or can top up a goal. Right now your plan uses " + cad0(b.pay) + " " + b.freqLabel + ". What does a slower payday look like?", chips: ["Plan on " + cad0(lo1) + " a pay", "Plan on " + cad0(lo2) + " a pay"] };
    }
    if (/\b(wealthsimple|td|cibc|bmo|scotia\w*|tangerine|eq bank|simplii|desjardins|koho|national bank)\b/.test(q) && /\b(account|tfsa|rrsp|fhsa|see|connect|link|add|count|include)\b/.test(q))
      return { safe: true, text: "In this preview Woodstock sees your RBC and Questrade accounts. Accounts elsewhere, like Wealthsimple, aren’t connected, so their money isn’t counted in your plan yet. One thing that holds anyway: TFSA room is shared across all your TFSAs, so money you put in there uses the same room. A planner can include those accounts in a session.", chips: ["Talk to a planner", "How are my goals doing?"] };
    if (/\b(hbp|home buyers'? plan)\b/.test(q)) {
      var rb = roomOf("RRSP"), rr0 = R0 ? num(R0.saved) : null, fs = H0 ? num(H0.saved) : null;
      return { safe: true, text: "The rules, the same for everyone. FHSA: up to $8,000 a year and $40,000 in total, deducted from your income, and nothing to pay back when you take it out for a first home. Home Buyers’ Plan: take up to $60,000 out of your RRSP for a first home without tax, then pay it back into the RRSP over 15 years. You can use both for the same home. With your numbers: " + (fs != null ? "your FHSA has " + cad0(fs) + (fhsaRoom != null ? ", with " + cad0(fhsaRoom) + " of room left this year" : "") : "you don’t have an FHSA goal yet") + (rr0 != null ? "; your RRSP has " + cad0(rr0) + ", which is the most the Home Buyers’ Plan could take today" : "") + ". Which to use is your call; a planner can go through it with you.", chips: ["Talk to a planner", "How is First home doing?"] };
    }
    if (/\b(partner|boyfriend|girlfriend|husband|wife|spouse|fianc\w*|aaron)\b/.test(q) && /\b(share|shared|sharing|together|joint|split|splitting|both of us|with (my|him|her))\b/.test(q)) {
      if (/\brent\b/.test(q)) { var rent2 = (st().bills || []).filter(function (x: any) { return x.id === "rent"; })[0]; CTX.pending = rent2 ? { type: "bill", bill: "rent" } : null; return { safe: true, text: "How you split it is up to the two of you; half each, or by income, are both common ways. " + (rent2 ? "Your rent is " + cad0(rent2.amount) + " a month in your plan. Tell me your share and I’ll show what’s left to spend with it." : ""), chips: rent2 ? ["My share is " + cad0(Math.round(rent2.amount * 0.6 / 50) * 50)] : [] }; }
      var gS = findGoal(q);
      return { safe: true, text: "Shared goals aren’t in this preview: each person has their own private plan. You can plan your share as your own goal" + (gS ? ": " + gS.name + " stays yours, and you can set its amount to your part" : ", like New York with Aaron") + ". Nothing of yours is shared with anyone.", chips: gS ? ["Make " + gS.name + " " + cad0(Math.round(num(gS.target) / 2 / 500) * 500)] : ["Add a goal"] };
    }
    if (/\binvite\b|\brefer(ral)?\b|\btell a friend\b/.test(q)) return { safe: true, text: "Inviting a friend isn’t available in this preview. Your plan stays private either way.", chips: ["What can you help with?"] };
    return null;
  }
  /* a named month: that month's paydays, bills and goals, against her usual spending; and the goal named from her words */
  function monthAllowance(y?: any, mo?: any): any {
    var b = budget(); if (!b) return null; var k = 0;
    for (var n = 1; n < 80; n++) { var d = payDate(n); if (d.getUTCFullYear() > y || (d.getUTCFullYear() === y && d.getUTCMonth() > mo)) break; if (d.getUTCFullYear() === y && d.getUTCMonth() === mo) k++; }
    var yearly = (st().bills || []).filter(function (x: any) { return x.freq === "yearly" && num(x.month) === mo + 1; }).reduce(function (t0: any, x: any) { return t0 + num(x.amount); }, 0);
    var monthly = (b.bills || []).filter(function (x: any) { return x.freq !== "yearly"; }).reduce(function (t0: any, x: any) { return t0 + num(x.amount); }, 0);
    return { paydays: k, income: k * b.pay + num(b.otherM), bills: monthly + yearly, goals: k * goalsPP(), left: k * b.pay + num(b.otherM) - monthly - yearly - k * goalsPP(), usual: st().spending ? b.usualEv : null };
  }
  function nameFrom(q?: any): any {
    var m = /\b((?:[a-z]+'s )?(?:birthday|anniversary|wedding|graduation|shower|party|christmas|holiday) ?(?:gift|present|dinner|party|trip)?)\b/.exec(q) || /\b(?:for|on)\s+(?:a |an |my |the |our )?([a-z][a-z' ]{2,24}?)(?=\s+(?:in|by|before|this|next)\b)/.exec(q);
    var n = m ? m[1].trim() : ""; if (!n || /^(it|that|this|money|spending)$/.test(n)) return null;
    return n.replace(/^./, function (c: any) { return c.toUpperCase(); }).replace(/\baaron\b/gi, "Aaron").replace(/\bsam\b/g, "Sam");
  }
  function monthSpend(q?: any, text?: any, amt?: any, by?: any): any {
    var d = parseD(by), A = monthAllowance(d.getUTCFullYear(), d.getUTCMonth()); if (!A) return null;
    var mon = MONL[d.getUTCMonth()] + " " + d.getUTCFullYear(), name = nameFrom(q) || "Purchase in " + MONL[d.getUTCMonth()];
    var room = A.usual != null ? A.left - A.usual : A.left, fits = room >= amt;
    var t = "In " + mon + " you get paid " + A.paydays + " time" + (A.paydays === 1 ? "" : "s") + ". After bills (" + cad0(A.bills) + ") and your goals (" + cad0(A.goals) + "), about " + cad0(r10(A.left)) + " is left for everything else" + (A.usual != null ? ", and you usually spend about " + cad0(r10(A.usual)) + " a month" : "") + ". ";
    t += fits ? "So " + cad0(amt) + " fits in " + MONL[d.getUTCMonth()] + ", with about " + cad0(r10(room - amt)) + " to spare. That’s an estimate from your own numbers." : "So " + cad0(amt) + " would be about " + cad0(r10(amt - Math.max(0, room))) + " more than " + MONL[d.getUTCMonth()] + " usually leaves; saving up for it from now keeps everything else on pace.";
    var qp = E.quickGoalPlan(st(), amt, by);
    var g: any = { type: "goal_add", name: name, target: Math.round(amt), perPay: qp.perPay, by: by, where: "Questrade TFSA, as cash", kind: /trip/.test(q) ? "trip" : "other" };
    if (fits) g._alt = true;
    return { text: t, actions: [g], altLead: "Or, if you’d rather set it aside from now:", note: null, safe: true };
  }
  function plannerIntents(q?: any, text?: any, amt?: any, by?: any, sal?: any, b?: any): any {
    var P0 = CTX.pending, amts = allMoney(text);
    /* pending answers first */
    if (P0 && P0.type === "retireTarget") {
      if (/not sure|no idea|don.?t know|skip/.test(q)) { CTX.pending = null; var gR = goalByKind("retirement"), rr = gR && retireRows(gR, [65]); return { text: "That’s normal. " + (rr && rr.length ? "At your pace, from 65 that could pay about " + cad0(rr[0].incLo) + " to " + cad0(rr[0].incHi) + " a month for 25 years, in today’s dollars (illustration). " : "") + "You can set a target any time.", note: IM() ? IM().LABEL : null }; }
      if (amt) return workBack(q, /\ba month|monthly|per month\b/.test(q) && amt < 20000 ? amt * 12 : amt, ageIn(q) || ((goalByKind("retirement") || {}).retire || {}).stopAt || 65);
    }
    if (P0 && P0.type === "bill" && amt) { var blP = (st().bills || []).filter(function (x: any) { return x.id === P0.bill; })[0]; if (blP) return billChange(blP, q, amt); }
    if (P0 && P0.type === "bonus" && amt) { CTX.pending = null; return bonusReply(amt); }
    if (P0 && P0.type === "inherit" && amt) { CTX.pending = null; return inheritReply(amt); }
    if (P0 && P0.type === "car" && amt) { CTX.pending = null; return carReply(q, amt, by); }

    /* tax, workplace plans, other accounts, couples (checked before goals and bills: a contribution question is never a sale) */
    var tx = taxIntents(q, amt, amts); if (tx) return tx;
    /* how her goals are doing, from her own numbers */
    if (/\bhow (are|is|'s)\b[^.?!]{0,30}\bdoing\b|\b(goals?|first home|retirement|trip)\b[^.?!]{0,20}\b(on track|status|behind)\b/.test(q) && !/\bhow am i doing\b/.test(q)) {
      var g1 = findGoal(q), G1 = g1 ? [g1] : liveGoals();
      var st1 = function (g: any) { var off = false; try { off = !!(g.by && num(g.target) > 0 && !g.paused && !goalDone(g) && !E.goalOk(st(), g)); } catch (e) {} return g.name + ": " + (goalDone(g) ? (g.kind === "emergency" ? "full at " + cad0(g.target) : "reached") : g.paused ? "paused" : !(num(g.target) > 0) ? cad0(r10(num(g.monthly) || num(g.perPay) * mf())) + " a month, no target yet" : cad0(g.saved) + " of " + cad0(g.target) + ", " + reach(g) + (off ? ", needs a look" : "")); };
      return { safe: true, text: (g1 ? "" : "Here’s where they stand at today’s amounts. ") + G1.map(st1).join(". ") + ". These are estimates from your own numbers.", chips: g1 ? ["Move " + g1.name + " back 3 months", "How are my goals doing?"] : ["Am I saving enough for retirement?", "Is this a guarantee I'll reach my goals?"] };
    }
    /* what can you help with */
    if (/\bwhat (can|do) you (help|do)\b|\bwhat can i ask\b/.test(q)) return { safe: true, text: "I work things through with your own numbers: a job offer or a raise, a purchase, a bill that changes, a new goal or a new date, your line of credit, and retirement. I can’t pick investments, file taxes or give legal advice. What’s going on?", chips: ["I’m choosing between two jobs", "Am I saving enough for retirement?", "My rent is going up"] };

    /* retirement */
    var retireQ = /\bretir\w*\b|\bstop working\b|\bfinancial(ly)? (independen|free)\w*/.test(q);
    if (retireQ || (CTX._wasR && /\b(what|how) about\b|\bfrom \d{2}\b|\ba year\b/.test(q))) {
      if (/\bset (a |my )?(retirement )?target\b/.test(q)) { CTX.pending = { type: "retireTarget" }; return { text: "How much a year would you like to live on in retirement, in today’s dollars, and from what age? For example: $50,000 a year from 65.", chips: ["$40,000 a year from 65", "$60,000 a year from 65", "Not sure"] }; }
      var A0 = ageIn(q) || ((/\b(what|how) about\b/.test(q) && /\b(\d{2})\b/.exec(q)) ? +(/\b(\d{2})\b/.exec(q) as any)[1] : null);
      var yearly = amts.filter(function (x: any) { return x >= 1000; })[0];
      if (yearly) return workBack(q, /\ba month|monthly|per month\b/.test(q) && yearly < 20000 ? yearly * 12 : yearly, A0 || ((goalByKind("retirement") || {}).retire || {}).stopAt || 65);
      if (A0 && A0 >= 45 && A0 <= 75) return retireAt(q, A0);
      if (retireQ && /\b(enough|on track|behind|how much|am i|doing|ok|okay|pace|saving)\b/.test(q)) return retireEnough(q);
      if (retireQ) return retireEnough(q);
    }
    if (/\bset (a |my )?retirement target\b/.test(q)) { CTX.pending = { type: "retireTarget" }; return { text: "How much a year would you like to live on in retirement, in today’s dollars, and from what age? For example: $50,000 a year from 65.", chips: ["$40,000 a year from 65", "$60,000 a year from 65", "Not sure"] }; }

    /* line of credit or a loan: pay it down faster, or invest */
    if (/\b(line of credit|loc|student loan|loans?|debt)\b/.test(q) && !/\b(car|vehicle|mortgage)\b/.test(q) && /\b(pay\w*|faster|extra|instead|invest\w*|first|or|off|down|worth it)\b/.test(q) && !/\bpayment (is|went|goes|going)\b/.test(q)) return locReply();

    /* a bill changes */
    var bl = billFor(q);
    if (bl && amt && /\b(going up|goes up|went up|go up|increas\w*|rais\w*|is now|will be|now|new|going down|goes down|went down|drop\w*|lower\w*|cheaper|changing|changed|moving|by \$|to \$|costs?)\b/.test(q)) return billChange(bl, q, amt);
    if (bl && /\b(going up|goes up|went up|increas\w*|going down|went down|changing)\b/.test(q)) { CTX.pending = { type: "bill", bill: bl.id }; return { text: bl.name + " is " + cad0(bl.amount) + " a month now. What will it be? I’ll show what’s left to spend with it.", chips: [cad0(Math.round(bl.amount * 1.1 / 50) * 50), cad0(Math.round(bl.amount * 1.05 / 10) * 10)] }; }

    /* a goal's cost or amount changes */
    var gC = findGoal(q) || (CTX.lastGoal && /\b(it|that)\b/.test(q) ? findGoal(CTX.lastGoal) : null);
    if (gC && amts.length && /\b(cost\w*|instead of|more like|make|change it to|raise it to|bump\w*|increase\w*|up to|target|price|more expensive|be more|be less|ends? up)\b/.test(q) && !/\b(afford|buy|buying)\b/.test(q)) { var cc = costChange(q, gC, amts, by); if (cc) return cc; }

    /* life updates */
    if (/\bbonus\b/.test(q)) { if (amt) return bonusReply(amt); CTX.pending = { type: "bonus" }; return { text: "Nice. How much is it, before tax? I’ll work out what lands in your account.", chips: ["$2,000", "$5,000", "$10,000"] }; }
    if (/\binherit\w*\b/.test(q)) { if (amt) return inheritReply(amt); CTX.pending = { type: "inherit" }; return { text: "I’m sorry if that comes with a loss. Roughly how much, if you know? I’ll show what it could do with your goals and your line of credit.", chips: ["$10,000", "$25,000", "Not sure yet"] }; }
    if (/\bmoving costs?\b/.test(q) && amt && by) return goalFor("Moving costs", amt, by);
    /* PM-R51: "Aaron's birthday is in January and I want to spend about $300": check January, name it from her words */
    var nmM = /\b(?:in|by|before|for|this|next|around)\s+(?:next )?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/.exec(q);
    if (nmM && amt && by && parseD(by) > monthEnd(today().getUTCFullYear(), today().getUTCMonth()) && /\b(spend|spending|buy|buying|get|getting|gift|present|birthday|anniversary|party|dinner|trip|cost|costs)\b/.test(q) && !/\b(raise|salary|pay (is|will)|bonus|rent|bill|save up|saving for|save|saving)\b|\b(add|new|start|create|set up)\b[^.?!]{0,14}\bgoal\b/.test(q)) { var ms = monthSpend(q, text, amt, by); if (ms) return ms; }
    /* round 3 (B13): "$300 for Aaron's birthday in January" is a goal for next January, not this month's spending */
    var forM = /\$\s?[\d,]+k?\s+(?:for|towards?|on)\s+(?:a |an |my |the |our )?([a-z][a-z' ]{1,28}?)\s+(?:in|by|before|for|around|this|next)\s+(?:next )?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|christmas|the holidays|summer|spring|fall)\b/.exec(q);
    if (forM && amt && by && parseD(by) > monthEnd(today().getUTCFullYear(), today().getUTCMonth())) { var nmF = forM[1].trim().replace(/^./, function (c: any) { return c.toUpperCase(); }).replace(/\baaron\b/i, "Aaron"); return goalFor(nmF, amt, by); }
    var need = /\bi (need|want|'?d like|would like)\b[^.?!]{0,12}\$\s?[\d,]+k?\s+(?:for|towards?)\s+(?:a |an |my |the |our )?([a-z][a-z' ]{1,24}?)(?=\s+(?:by|in|next|this|before)\b|[.?!,]|\s*$)/.exec(q);
    if (need && amt && !/\b(tfsa|rrsp|fhsa|investments?|portfolio)\b/.test(q)) { var nmN = need[2].trim(), nmG = /trip|vacation|travel|holiday/.test(nmN) ? "Trip" : nmN.charAt(0).toUpperCase() + nmN.slice(1); if (by) return goalFor(nmG, amt, by); CTX.pending = { type: "goal", name: nmG, amount: amt }; return { text: "That can be a goal: " + cad0(amt) + " for " + (nmG === "Trip" ? "a trip" : nmN) + ". By when? I’ll work out what each payday needs. Woodstock doesn’t move money out of your accounts.", chips: ["Jun 2027", "Sep 2027", "Dec 2027"] }; }
    if (/\b(moving out|move out|moving in with|move in with|moving to|moving into|new apartment|new place|moving|relocat\w*)\b/.test(q) && !(findGoal(q) && by) && !/\b(date|goal)\b/.test(q)) {
      var rent = (st().bills || []).filter(function (x: any) { return x.id === "rent"; })[0];
      CTX.pending = rent ? { type: "bill", bill: "rent" } : null;
      return { safe: true, text: "Moving usually changes your biggest bill." + (rent ? " Your rent is " + cad0(rent.amount) + " a month now. What will the new rent be? I’ll show what’s left to spend with it." : "") + " If there are moving costs, like first and last month’s rent or movers, I can set them up as a short goal.", chips: (rent ? ["New rent " + cad0(Math.round(rent.amount * 1.15 / 50) * 50)] : []).concat(["Moving costs $2,000 by " + monY(iso(monthEnd(today().getUTCFullYear(), today().getUTCMonth() + 3)))]) };
    }
    if (/\b(car|vehicle|truck|suv)\b/.test(q) && !/\b(car insurance claim)\b/.test(q)) return carReply(q, amt, by);
    if (/\b(wedding|getting married|get married|engaged|elope)\b/.test(q)) {
      if (amt && by) return goalFor("Wedding", amt, by);
      var yhW = CTX.yearHint; CTX.yearHint = null;
      CTX.pending = { type: "goal", name: "Wedding", amount: amt || undefined, yearHint: yhW || undefined };
      return { text: "Congratulations. " + (amt ? (yhW ? "Which month in " + yhW + " would you like the " + cad0(amt) + " by?" : "By when would you like the " + cad0(amt) + "?") : "Roughly how much would you like to put toward it, and by when? For example: $10,000 by Sep " + (yhW || 2027) + "."), chips: amt ? (yhW ? ["Mar " + yhW, "Jun " + yhW, "Sep " + yhW, "Dec " + yhW] : ["Sep 2027", "Jun 2028"]) : ["$10,000 by Sep " + (yhW || 2027), "$5,000 by Jun " + (yhW || 2027)] };
    }
    if (/\b(baby|pregnan\w*|expecting (a baby|a child|twins)|parental leave|maternity|paternity|mat leave)\b/.test(q)) return leaveReply(q);
    if (!sal.length && /\b(quit|quitting|leave|leaving|lose|lost|losing)\b[^.?!]{0,16}\b(my |this )?(job|work)\b|\blaid off\b|\blayoffs?\b|\bunemploy\w*\b|\bbetween jobs\b|\bsabbatical\b/.test(q)) return jobLossReply(q);
    if (/\bpause\b/.test(q) && /\b(all|my|every)\b[^.?!]{0,6}\bgoals\b/.test(q)) return { text: "Pausing all of them would free " + cad0(goalsPP()) + " a pay, and their dates would move later. You can pause one at a time; tell me which, for example: pause " + (liveGoals().filter(function (g: any) { return !goalDone(g) && num(g.perPay) > 0; })[0] || { name: "a goal" }).name + ".", chips: liveGoals().filter(function (g: any) { return !goalDone(g) && num(g.perPay) > 0 && !g.paused; }).slice(0, 3).map(function (g: any) { return "Pause " + g.name; }) };
    var gP = /\bpause\b/.test(q) ? findGoal(q) : null; if (gP) return { text: "Pausing " + gP.name + " frees " + cad0(gP.perPay) + " a pay; nothing you’ve saved moves, and its date would move later. Here’s the change; nothing changes until you confirm.", actions: [{ type: "goal_pause", goal: gP.id }], needsCard: true };
    if (/\b(rrsp|tfsa|fhsa)\b[^.?!]{0,24}\b(or|vs|versus)\b[^.?!]{0,12}\b(rrsp|tfsa|fhsa)\b|\b(which|what) account\b/.test(q)) return accountsReply();
    if (/\b(emergency fund|safety net|rainy day)\b/.test(q) && !amts.length) return emergencyReply();
    if (/\b(house|home|condo)\b/.test(q) && /\b(buy|buying|in \d{1,2} years?|by 20\d\d)\b/.test(q)) {
      var gH = goalByKind("home"), yN = /\bin (\d{1,2}) years?\b/.exec(q), nbH = by || (yN ? iso(monthEnd(today().getUTCFullYear() + +yN[1], today().getUTCMonth())) : null);
      if (gH && nbH) { var mvH = moveDate(gH, q, nbH); mvH.text = gH.name + " is already in your plan: " + cad0(gH.target) + " by " + monYL(gH.by) + ". " + mvH.text; return mvH; }
      if (gH) return { text: gH.name + " is already in your plan: " + cad0(gH.target) + " by " + monYL(gH.by) + ", " + cad0(gH.perPay) + " a payday. Want a different date or amount?", chips: ["Move " + gH.name + " back a year", "Make First home $50,000"] };
    }
    return null;
  }
  function bonusReply(amt?: any): any {
    var b = budget(); if (!b) return null; var G = grossFor(b.pay), net = takeHome(G + amt).year - takeHome(G).year, off = Math.round((1 - net / amt) * 100);
    var gs = liveGoals().filter(function (g: any) { return !goalDone(g) && num(g.target) > 0; }).slice(0, 2), L = locInfo();
    CTX.pending = null;
    return { text: "Nice. A " + cad0(amt) + " bonus is about " + cad0(r10(net)) + " after tax at your pay (estimate: about " + off + "% comes off, since a bonus is taxed at your top rate). Your goals already get what they need each payday, so it’s yours to spend or keep. If you’d like some of it to work for you: " + (roomOf("FHSA") != null ? "your FHSA has " + cad0(roomOf("FHSA")) + " of room left this year and your RRSP " + cad0(roomOf("RRSP") || 0) + ", both of which lower your tax; " : "") + gs.map(function (g: any) { return g.name + " has " + cad0(toGo(g)) + " to go"; }).join(", ") + (L ? ", and your line of credit is about " + cad0(L.bal) + " at about " + L.rate + "%" : "") + ". Woodstock can’t move money, so you’d move it yourself, and then I can lower that goal’s pace.", note: COPY.taxNote, chips: ["Pay off my line of credit faster?", "How are my goals doing?"] };
  }
  function inheritReply(amt?: any): any {
    var gs = liveGoals().filter(function (g: any) { return !goalDone(g) && num(g.target) > 0; }).slice(0, 2), L = locInfo();
    return { text: "That’s yours to decide on, and there’s no rush. In Canada an inheritance usually isn’t taxed as your income; the estate settles its taxes first. With your numbers, " + cad0(amt) + " could go toward " + gs.map(function (g: any) { return g.name + " (" + cad0(toGo(g)) + " to go)"; }).join(" or ") + (L ? ", or pay down your line of credit (about " + cad0(L.bal) + " at about " + L.rate + "%)" : "") + ", or stay in savings while you think. Woodstock can’t move it for you; once it’s where you want it, I can update a goal’s pace. A planner can help with a bigger decision like this.", chips: ["Pay off my line of credit faster?", "Talk to a planner"] };
  }
  function carReply(q?: any, amt?: any, by?: any): any {
    var b = budget();
    if (amt && /\ba month|monthly|per month\b/.test(q) && b) { var lpp = b.leftPP - amt * 12 / b.ppy; return { text: "A car at about " + cad0(amt) + " a month, all in, would take left to spend a pay from " + cad0(b.leftPP) + " to " + cad0(lpp) + ". Your goals keep their pace." + (lpp < 0 ? " That’s more than your pay leaves, so a goal would have to slow or move. Your choice." : "") + " Here it is as a new monthly cost; nothing changes until you confirm.", actions: [{ type: "bill_add", name: "Car", amount: amt }], needsCard: true }; }
    if (amt && by) return goalFor("Car", amt, by);
    if (amt) { CTX.pending = { type: "goal", name: "Car", amount: amt }; return { text: "By when would you like the " + cad0(amt) + "? I’ll set it up as a goal, or tell me the monthly cost if you’ll finance it.", chips: ["Jun 2027", "Dec 2027", "$600 a month all in"] }; }
    CTX.pending = { type: "car" };
    return { text: "A car usually means money up front and new monthly costs: insurance, gas, parking and any loan payment. Tell me the down payment and when, and I’ll set it up as a goal, or the monthly cost, and I’ll show what’s left to spend.", chips: ["$8,000 down by Jun 2027", "$600 a month all in"] };
  }
  function leaveReply(q?: any): any {
    var b = budget(); if (!b) return null;
    var G = grossFor(b.pay), wk = Math.min(G, TAX_T.ei.max) / 52 * 0.55, yr = wk * 52, np = Math.round((yr - taxOnly(yr)) / ppy());
    return { text: (/\b(baby|pregnan\w*|expecting)\b/.test(q) ? "Congratulations. " : "") + "On standard EI parental benefits, which pay 55% of your insured earnings up to a weekly maximum, your pay could be about " + cad0(np) + " a pay instead of " + cad0(b.pay) + " (estimate, after tax). Here’s your plan on that pay, next to today. If it doesn’t fit, goals can slow or pause during the leave, and your Emergency fund is there too. Some employers top up EI; it’s worth asking yours.",
      compare: [{ label: "On leave", perPay: np, s: scenario(np), sub: "a pay, EI estimate" }], cmpHead: "On leave, next to today", note: "EI estimate from the 2026 maximum insurable earnings ($68,900) at 55%, taxed as income, before any employer top-up. Service Canada decides the actual amount.", chips: ["What if I pause my goals?", "Talk to a planner"] };
  }
  function jobLossReply(q?: any): any {
    var b = budget(); if (!b) return null; var ess = b.essM + b.debtM, ef = goalByKind("emergency"), efs = ef ? num(ef.saved) : 0, mos = ess > 0 ? efs / ess : 0;
    return { text: "Here’s the picture with your numbers. Your bills and debt payments are about " + cad0(r10(ess)) + " a month. " + (ef ? "Your " + ef.name + " has " + cad0(efs) + ", about " + (Math.round(mos * 2) / 2) + " months of those." : "You don’t have an emergency fund in your plan yet.") + " Your goals take " + cad0(goalsPP()) + " a pay; while you’re not paid they could pause, and their dates would move later. " + (/\bquit/.test(q) ? "If you quit, EI usually doesn’t pay; if you’re laid off, it may." : "If you’re laid off, EI may pay part of your pay; Service Canada decides.") + " A planner can help with a decision this big.", chips: ["What if I pause my goals?", "Talk to a planner"] };
  }
  function accountsReply(): any {
    var b = budget(), G = b ? grossFor(b.pay) : null, back = G ? r10((takeHome(G).tax - takeHome(G - 1000).tax)) : null;
    var R0 = goalByKind("retirement"), I0 = goalByKind("invest"), H0 = goalByKind("home");
    return { text: "Both let money grow without tax while it’s inside. An RRSP contribution lowers your taxable income now" + (back ? " (at your pay, about " + cad0(back) + " back for every $1,000, estimate)" : "") + ", and it’s taxed when you take it out. A TFSA gives no deduction now, and what you take out is tax-free. " + (H0 ? "The FHSA, for a first home, gets both: a deduction now and a tax-free withdrawal for the home. " : "") + "Your plan already uses them: " + [R0 ? R0.name + " in your " + (R0.account || "RRSP") : null, I0 ? I0.name + " in your " + (I0.account || "TFSA") : null, H0 ? H0.name + " in your " + (H0.account || "FHSA") : null].filter(Boolean).join(", ") + ". If you’re weighing which to fill first, a planner can go through it with you.", note: COPY.taxNote, chips: ["Talk to a planner"] };
  }
  function emergencyReply(): any {
    var b = budget(), g = goalByKind("emergency"); if (!b) return null; var ess = b.essM + b.debtM;
    if (!g) return { text: "You don’t have an emergency fund in your plan yet. Your bills and debt payments are about " + cad0(r10(ess)) + " a month, so each month of cushion is about that much. Want to set one up?", chips: ["Plan my goals"] };
    CTX.lastGoal = g.id;
    return { text: "Your " + g.name + " " + (goalDone(g) ? "is full at " + cad0(g.target) : "has " + cad0(g.saved) + " of " + cad0(g.target)) + ". Your bills and debt payments are about " + cad0(r10(ess)) + " a month, so it covers about " + (Math.round(num(g.saved) / ess * 2) / 2) + " months of those. How big a cushion feels right is your call. If you’d like it bigger, tell me the amount and when.", chips: ["Make it " + cad0(Math.ceil(ess * 5 / 1000) * 1000) + " by Dec 2027", "How are my goals doing?"] };
  }

  var TRADE_TEXT = /\b(tap approve|sale sent|sell (it|them|from|for)|account to sell from|to sell from|send the (order|sale)|buy order|sell order|prepare (a|the) (sale|sell|buy|order)|total to sell)\b/i;
  function safeReply(r?: any): any {
    r = r || {}; var acts = (r.actions || []).slice(); if (r.action) acts.unshift(r.action);
    if (acts.some(isTrade) || (!r.safe && TRADE_TEXT.test(String(r.text || "")))) { try { console.info("talk: trade reply blocked:", r.text); } catch (e) {} return { text: COPY.noTrade, chips: ["Open Messages", "What can you help with?"], actions: [], safe: true }; }
    var out = Object.assign({}, r); delete out.action; out.actions = acts.filter(function (a: any) { return a && TALK_OK[a.type]; }); return out;
  }
  var CLAIM = /\b(changes|changed|updated|done|i've|i have (added|updated|changed|moved|set|made)|added)\b/i;
  function claimsChange(t?: any): any { var s0 = String(t || "").replace(/’/g, "'").replace(/\b(nothing|no|not|never|hasn't|haven't|won't|isn't|couldn't|can't)\b[^.?!;]{0,48}/gi, " "); return CLAIM.test(s0); }
  /* what Talk will show for a reply: no trade, only Talk's card types, and no claimed change without a valid card */
  function finalize(r?: any): any {
    r = safeReply(r);
    var bP = budget(), big = bP && r.actions.filter(function (x: any) { return x.type === "pay_update" && Math.abs(num(x.amount) - bP.pay) / Math.max(1, bP.pay) > 0.5; })[0];
    if (big && !r.payExplicit) { CTX.pending = { type: "raise" }; return { text: "Just to check: that would take your pay from " + cad0(bP.pay) + " to " + cad0(big.amount) + " a pay. Did you mean " + cad0(big.amount) + " a pay after tax, or an amount a year before tax?", chips: [cad0(big.amount) + " a pay after tax", cad0(big.amount) + " more a year"], actions: [], safe: true }; }
    var vs = r.actions.map(function (a: any) { return validate(a); }), changes = vs.some(function (v: any) { return v && !LINK[v.type]; });
    if (!r.interview && !changes && (r.needsCard || (!r.safe && claimsChange(r.text)))) {
      try { console.info("talk: reply replaced, it announced a change with no valid card:", r.text); } catch (e) {}
      return { text: COPY.cant, chips: ["Book a planner", "What can you help with?"], actions: [] };
    }
    return r;
  }
  function fallback(text?: any): any {
    var r: any = null; try { if (opts && typeof opts.intent === "function") r = opts.intent(text); } catch (e) { r = null; }
    if (r && r.text && !r.menu) {
      var tx = String(typeof r.text === "function" ? r.text() : r.text).replace(/\bin this chat\b/g, "in Messages").replace(/\bhere in Messages\b/g, "in Messages");
      /* the Messages catch-all is a menu; Talk answers with the honest miss line instead (PM-R31) */
      var ra = (r.actions || []).concat(r.action ? [r.action] : []);
      if (ra.some(isTrade) || TRADE_TEXT.test(tx)) return { text: COPY.noTrade, chips: ["Open Messages", "What can you help with?"], safe: true };
      if (!MENU_RE.test(tx)) return { text: tx, action: r.action, actions: r.actions, chips: r.chips };
    }
    return { text: COPY.miss, chips: ["Book a planner", "What can you help with?"] };
  }
  var MENU_RE = /^(I can help with|I can work through|Here.s what I can|Try asking|I.m not sure (what|I follow))/i;

  var TALK_RULES = "TALK IT THROUGH: She opened Talk it through, a calm full-screen conversation about her plan. Reply in up to five short sentences, plain text. In scope: goals, budgets, debt, account order and contribution room, and what-if comparisons such as two job offers, all worked out with her own numbers and offered as confirm cards on her own plan. " +
    "Out of scope, reply exactly: for picking specific investments, \"" + COPY.picks + "\"; for tax filing, legal, insurance or estate, \"" + COPY.planner + "\" and end with ACTION:{\"type\":\"planner\",\"topic\":\"<short topic>\"}. If asked what you are: \"" + COPY.identity + "\" " +
    "Goals come first: her pay-yourself-first amount is the sum of what her goals need. Never push her to save more than her goals need; anything beyond them is hers to spend or keep. Never use the words save more, you should save, max out, boost your savings, aim higher or great saver. " +
    "When a goal is out of reach, the options are a later date, a smaller amount or a slower pace on one goal; never a different portfolio. Never propose orders here (no ACTION of type orders): buying and selling happen only in Messages with her tap and Face ID. Projections of invested money are illustrations, never promises. Use only the numbers given below; if a number is missing, say so. Never say you changed, updated or added anything: a change happens only when she taps Confirm on a card. If you can't build the card, reply exactly \"" + COPY.cant + "\"";
  function talkFacts(): any {
    var b = budget(); if (!b) return "";
    return "TALK FACTS: take-home " + cad0(b.pay) + " " + b.freqLabel + "; income about " + cad0(b.incomeM) + " a month; essentials " + cad0(b.essM) + " and debt payments " + cad0(b.debtM) + " a month; her goals need " + cad0(goalsPP()) + " a pay (about " + cad0(goalsPP() * mf()) + " a month); about " + cad0(r10(b.flexM)) + " a month is left for everything else; she usually spends about " + cad0(r10(b.usualEv)) + " a month on everyday things. Goal dates at today's pace: " + goalsLine(6) + ".";
  }
  var STARTERS: string[] = ["I’m choosing between a $95,000 and a $110,000 job", "I’m buying a purse", "I got a raise", "Move a goal’s date", "Can I afford a $1,200 laptop?", "Plan my goals"];
;
  /* informational card data: two offers, or a what-if next to today (the view draws it) */
  function compareTable(cols?: any, head?: any): any {
    var b = budget(), G = liveGoals().filter(function (g: any) { return !goalDone(g) && !g.paused && num(g.perPay) > 0; });
    var C = cols.length > 1 ? cols : [{ gross: null, perPay: b.pay, s: scenario(b.pay), today: true }].concat(cols);
    var row = function (label: string, f: any, cls?: any) { return { label: label, values: C.map(function (x: any) { return { text: f(x), tone: cls ? cls(x) : "" }; }) }; };
    return {
      head: head || (cols.length > 1 ? "Two offers, side by side" : "The offer, next to today"), tag: "Estimates",
      cols: C.map(function (x: any) { return { label: x.today ? "Today" : x.label ? x.label : cad0(x.gross), perPay: cad0(x.perPay), sub: x.today ? "a pay, from your deposits" : x.sub || "a pay, after tax" }; }),
      rows: [row("Income a month", function (x: any) { return cad0(x.s.incM); }),
        row("Bills and debt payments", function () { return "−" + cad0(b.essM + b.debtM); }),
        row("Your goals", function () { return "−" + cad0(goalsPP() * mf()); }),
        row("Left for everything else", function (x: any) { return x.s.flex < 0 ? "−" + cad0(-x.s.flex) : cad0(x.s.flex); }, function (x: any) { return x.s.flex < 0 ? "warn" : "strong"; })]
        .concat(st().spending ? [row("After your usual spending", function (x: any) { return x.s.room < 0 ? "−" + cad0(-x.s.room) : cad0(x.s.room); }, function (x: any) { return x.s.room < 0 ? "warn" : ""; })] : []),
      goalsHead: "Your goals under each",
      goals: G.slice(0, 5).map(function (g: any) { return row(g.name, function (x: any) { return x.s.flex < 0 ? "Needs a look" : reach(g).replace(/^by /, ""); }, function (x: any) { return x.s.flex < 0 ? "warn" : ""; }); }),
      foot: (head ? "" : COPY.taxNote + " ") + "Goal dates use your current amounts each payday."
    };
  }

  /* ---------- the API ---------- */
  /** The reply Talk shows for her message: scripted engine first, then the injected intent(), then the honest miss line; always finalize()d. */
  function reply(text: string): any { return finalize(engine(text) || fallback(text)); }
  return {
    reply: reply,
    finalize: finalize,
    validate: validate,
    /** Applies a confirmed card to the state it is given (the app's update() draft). */
    apply: function (draft: any, v: any) { return A.applyAction(draft, v); },
    /** The line after she confirms; pass the state after the change. */
    followUp: function (after: any, v: any) { return A.followUp(after, v); },
    compareTable: compareTable,
    payReply: function (t: string): any { var a = money(t); if (!a) return null; var r = payChange(norm(t), t, a); if (!r) return null; r = finalize(r); var out: any = { text: String(r.text).replace(/; the cards below put the extra toward one[^.]*\./, ".") }, a0 = r.actions && r.actions[0];
      if (a0 && a0.type === "dated") out.text = out.text.replace(/ Each card starts[^.]*\.[^.]*\./, "") + " To set it for your first " + a0.label + " pay, open Talk it through; nothing changes before then."; else if (a0) out.action = a0; return out; },
    takeHome: takeHome,
    copy: COPY,
    starters: STARTERS,
    rules: TALK_RULES,
    facts: talkFacts,
    badText: badText,
    ctx: CTX
  };
}
