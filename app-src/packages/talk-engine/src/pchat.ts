/* Ask about these portfolios (CR11 s14), ported from the prototype's pchat.js (v7.3 round 5). Explains the four
   published portfolios with her own figures (bands.ts, the same numbers as the cards), always all four in the fixed
   order, and never chooses: pick, rank and confirm questions get Compliance's exact copy. Her goals, money already
   invested (the two switch options), her timeframe (switches the cards' horizon through onHorizon), "for a while",
   fees in her dollars; a planning question hands off to Talk it through. SYSTEM is instructions.md part 2, for the
   live mode later. Pure: the view (feature-talk PortfolioChat) renders reply() and fourCard(). */
import * as E from "./env.ts";
import * as BANDS from "./bands.ts";

const num = E.num, cad0 = E.cad0;

export interface PchatOptions { horizon?: 1 | 5; onHorizon?: (h: 1 | 5) => void }

export function createPortfolioChat(getState: () => any, opts?: PchatOptions) {
  function st(): any { return getState() || {}; }
  var H: any = { horizon: (opts && opts.horizon) || 1 };
  var SYSTEM = "You explain Woodstock's four published portfolios (Conservative, Balanced, Growth, Aggressive) to someone who knows nothing about investing. Woodstock is not registered to give personal investment advice, so you explain and never choose.\nStyle: plain words, two to four short sentences, define any term in the same sentence, no exclamation marks, no em or en dashes. Use her own dollar figures from the illustration on screen when helpful, and say they are an illustration.\nYou may: explain stocks, bonds, cash, diversification, fees, a typical year and a rough year, and what happens if markets drop soon after she starts; describe how each of the four differs, always all four, in this order: Conservative, Balanced, Growth, Aggressive; state general facts that are true for everyone, such as \"money needed within a few years is usually kept out of the stock market\" and \"broad, diversified portfolios have recovered from past drops, sometimes over several years; that is not a promise\".\nYou must not: say or hint which portfolio to pick, which suits her, is best, safest, right, too risky or too cautious for her; rank them or put one first except in the fixed order; link anything she tells you (her timeframe, age, goal, feelings) to a named portfolio; agree when she proposes one (\"so Growth, right?\"): say the choice is hers; use \"for you\", \"in your case\", \"I'd\", \"I would\", \"if I were you\", \"most people\"; predict returns or say a drop will recover; quote any past return figure; name any fund outside the four portfolios' published holdings; preselect, highlight or open one portfolio for her.\nIf asked to choose, rank or confirm a pick, reply: \"I can't choose for you, but I can help you decide.\" then ask the two questions (when she will need the money; how she would feel if it dropped by each portfolio's rough-year amount) and show all four again.\nNumbers come only from the on-screen illustration (FP Canada and Institute of Financial Planning 2026 assumptions with Woodstock's stated swings) or published fund facts. Any number you use is an illustration, not a promise.\n\nCONTEXT FOR THIS SCREEN (Engineer 3; for Compliance review; our own words, under the guardrails above)\nShe is on the portfolio pick, looking at the four cards. Each card shows, in her own dollars, what she will have put in over the chosen time frame (1 year or 5 years), a typical range (the middle half of outcomes), a rough-year figure (about the 5th percentile: a bad year that comes about one year in twenty in the illustration) and a good-year figure (about the 95th percentile). Those figures are given below as HER FIGURES. They are an illustration, not a promise, and real results can fall outside them.\nPlain definitions to use, in these words or simpler:\n- Stocks: small pieces of companies. Over long periods they have grown more than bonds or cash, but their price goes up and down a lot from year to year.\n- Bonds: loans to governments or companies that pay interest. They usually move less than stocks and grow more slowly, and can still go down, especially when interest rates rise.\n- Cash: money in savings deposits or a savings fund. It barely moves, and it grows slowly.\n- Swing: how far the value can move up or down in a year. More stocks means bigger swings.\n- Typical year: the middle of the range on the card; half of outcomes in the illustration land there.\n- Rough year: a bad year in the illustration, about one in twenty. Her money could be down to that figure for a while.\n- Fees: each fund charges a small yearly percentage of what she holds (the MER, management expense ratio). About 0.1% means about $1 a year for every $1,000. The figures on the cards already take fees off.\n- Holding for the long term: over a few months any portfolio with stocks can be down. Broad, diversified portfolios have recovered from past drops, sometimes over several years; that is history, not a promise. Selling during a drop locks in the loss.\n- A drop right after she starts: new money keeps going in every payday, and each payday's buy, which she approves, gets more units while prices are lower. What matters is whether she can leave the money in place until she needs it.\nAnswer only from these definitions, HER FIGURES and the four portfolios' published mixes and holdings below. Two to four short sentences. When a question involves the four, give all four in the fixed order. Never name a portfolio in a sentence about her own situation.\nIf she asks about the holding periods, read them as Woodstock's general guide, the same for everyone, and never say which fits her goal.\nIf she states when she needs the money, give the general timeframe facts and the four portfolios' figures for that time frame, and never link her timeframe to a named portfolio.\nNever use an ACTION line. You cannot select, open, save or change a portfolio.";

  var COPY: any = {
    title: "Ask about these portfolios",
    entry: "Questions about these? Ask me",
    disc: "Explains the four portfolios, the same for everyone. Woodstock isn’t registered to give personal investment advice, so it can’t choose one for you.",
    hint: "Tap the mic on your keyboard and start talking.",
    label: "Illustration, not a promise. Real results can fall outside these ranges.",
    limited: "Some answers are simpler in this preview.",
    notsure: "No rush. Money for your long-term goals stays as cash until you choose. If it helps, ask me anything about the four.",
    miss: "I can’t answer that one yet.",
    toTalk: "That’s a planning question; Talk it through can work it out with your numbers.",
    guide: "Woodstock’s general guide, the same for everyone, based on how much each portfolio can swing. It isn’t advice about your situation. Source for the time bands: Ontario Securities Commission, GetSmarterAboutMoney.ca.",
    whileLine: "For a while means months, and sometimes several years: your money could stay below what you put in for that long.",
    intro: "Ask me anything about these four, in your own words. I’ll explain in plain language, with your own numbers from the cards. The choice stays yours.",
    why: "It’s a trade-off. More stocks has meant more growth over long periods, but bigger swings, so a rough year takes more off. More bonds and cash swings less, but usually grows more slowly. Two things usually matter: when you need the money, and how you’d feel watching it drop.",
    back: "Which of these swings would you be comfortable with?",
    short: "Money needed within a few years is usually kept out of the stock market.",
    long: "Money you won’t need for many years has more time to ride out ups and downs.",
    recover: "Broad, diversified portfolios have recovered from past drops, sometimes over several years, but that’s history, not a promise. Selling during a drop locks in the loss.",
    change: "Yes. Your portfolio is your choice and you can change it any time in Money.",
    past: "There are no past returns in this preview. The figures on the cards are an illustration from planning assumptions, not past results, and real results can fall outside them."
  };
  var ORDER: string[] = ["conservative", "balanced", "growth", "aggressive"];

  function four(): any { var P = st().portfolios || []; return ORDER.map(function (id: any) { return P.filter(function (p: any) { return p.id === id; })[0]; }).filter(Boolean); }

  /* ---------- her figures: the shared band function (Engineer 2: any, WS.pfBands.compute: any), same time frame as the cards ---------- */
  function figures(): any {
    var years = H.horizon || 1, out: any[] = [];
    four().forEach(function (p: any) {
      var b: any = BANDS.compute(st(), p, { years: years });
      out.push({ id: p.id, name: p.name, equity: num(p.equity), bonds: num(p.bonds), years: years,
        putIn: b ? b.putIn : 0, rough: b ? b.p5 : null, lo: b ? b.p25 : null, hi: b ? b.p75 : null, good: b ? b.p95 : null, off: b && b.putIn ? Math.max(0, Math.round((b.putIn - b.p5) / 100) * 100) : null });
    });
    return { years: years, putIn: out.length ? out[0].putIn : 0, list: out, ok: out.length === 4 && out.every(function (x: any) { return x.putIn > 0 && x.rough != null; }) };
  }
  function when(F?: any): any { return F.years === 1 ? "this year" : "over 5 years"; }
  function roughWord(F?: any): any { return F.years === 1 ? "a rough year" : "a rough 5 years"; }

  /* ---------- the scripted engine (Compliance section 2 exact replies; section 4 ten questions) ---------- */
  var P_NAMES = "conservative|balanced|growth|aggressive";
  var R: any = {
    past: /\b(return(ed|s)?|made|did|perform\w*|gain\w*)\b.{0,40}\b(last year|past|historic\w*|history|since|ago|last \d+|20\d\d)\b|\bpast (returns?|results|performance)\b|\bhow (much )?(has|did|have)\b.{0,30}\b(done|returned|performed|made)\b/i,
    confirm: new RegExp("\\bso (" + P_NAMES + ")\\b|\\b(" + P_NAMES + ")\\b.{0,25}\\b(right|okay|ok|good|fine|too risky|too safe|too cautious|for me|makes sense)\\b|\\bis (" + P_NAMES + ")\\b.{0,30}\\b(for me|right|risky|safe|cautious)\\b|\\bshould i (go with|pick|choose|get) (" + P_NAMES + ")\\b", "i"),
    pick: /\b(which|what)\b.{0,40}\b(pick|choose|go with|get|best|should|safest|right one)\b|\bjust tell me\b|\bwhat would you\b|\bif (you were|i were you|you were me)\b|\bbest for me\b|\brank\w*\b|\brecommend\w*\b|\bsuggest\w*\b|\bdecide for me\b|\bpick (one )?for me\b|\byour (pick|choice|favou?rite)\b/i,
    why: /\bwhy\b.{0,40}\b(one over|pick one|choose one|over the other|instead|rather|vs|versus)\b|\btrade.?off\b|\bpros and cons\b/i,
    recover: /\b(come back|recover\w*|bounce back|go back up|get it back)\b/i,
    stocks: /\bwhat('?s| is| are)\b.{0,12}\b(a )?stocks?\b|\bstocks\b\s*\??\s*$/i,
    bonds: /\bwhat('?s| is| are)\b.{0,12}\b(a )?bonds?\b|\bbonds?\b\s*\??\s*$/i,
    cash: /\bwhat('?s| is| are)\b.{0,12}\bcash\b|\bwhy (is there |hold )?cash\b/i,
    swing: /\b(swing|move|go up and down|volatil\w*|bounce around|risk(ier|y)?)\b.{0,30}\b(more|less|why|different)\b|\bwhy\b.{0,30}\b(swing|move|volatil\w*|riskier|go up and down)\b/i,
    typical: /\b(typical|rough|good|bad) (year|5 years)\b|\bwhat do(es)? (the|these|this) (bars?|bands?|numbers|ranges?|chart|figures)\b|\bwhat does .{0,20}(mean)\b/i,
    fees: /\bfees?\b|\bmer\b|\bcosts?\b|\bcharge\b/i,
    drop: /\b(drops?|dropped|crash(es|ed)?|falls?|fell|go(es)? down|lose|tanks?)\b.{0,40}\b(start|begin|right after|first|soon|join)\b|\bwhat (if|happens if)\b.{0,30}\b(drops?|crash(es)?|falls?|go(es)? down|tanks?)\b/i,
    differ: /\b(differ\w*|compare|comparison|how are they|what('?s| is) the difference)\b/i,
    longterm: /\blong.?term\b|\bhold\w*\b.{0,20}\b(long|years)\b|\bwhy (wait|stay|keep it)\b|\bhow long\b/i,
    change: /\bchange (it|my mind|later|portfolio)\b|\bswitch (it )?later\b|\bcan i (change|switch)\b|\bstuck with\b/i,
    safe: /\bis (my money|it) safe\b|\bcipf\b|\bciro\b|\bcan i lose\b|\bprotected\b|\bsafe\b\s*\??\s*$/i,
    goals: /\b(apply|applies|cover|covers|for|used for|count for)\b.{0,12}\b(all|each|every|both|which|my)\b.{0,8}\bgoals?\b|\bwhich goals?\b|\bwhat goals?\b|\bmy (other )?goals\b.{0,20}\b(too|as well|same)\b/i,
    existing: /\b(money|what) (i|i've|i have) (already )?(have|got|own|hold|saved|invested|put in)\b|\balready (have|own|hold|invested|saved|put in)\b|\bexisting (money|investments|savings)\b|\bwhat i('ve| have) (got|saved)\b|\bif i switch\b|\bwhen i switch\b/i,
    debt: /\b(line of credit|loc|loan|debt|mortgage|credit card)\b/i,
    forawhile: /\bfor a while\b|\bhow long (is|would|could|might|does|until|before)\b|\bhow long\b.{0,20}\b(down|stay|last|recover|wait|take)\b/i,
    hold: /\bholding periods?\b|\bat least \d+ years\b|\b(3|5|7|10)\+? years\b.{0,20}\b(mean|why|card|guide)\b|\bwhy (does it|do they) say\b.{0,20}\byears\b/i,
    feel: /\b(panic|scared|nervous|worried|anxious|stressed|freak|fine|okay with|ok with|wouldn'?t mind|could handle|sleep|comfortable)\b/i
  };
  function yearsIn(q?: any): any {
    var m = /\b(?:in|within|for|about|around|need it in|need the money in)\s+(?:about\s+)?(\d{1,2}|a|one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty)\s+(year|month)s?\b/i.exec(q);
    var W: any = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, thirty: 30 };
    if (m) { var n = W[m[1].toLowerCase()] || +m[1]; return /month/.test(m[2]) ? n / 12 : n; }
    if (/\b(retire|retirement)\b/i.test(q)) return 25;
    if (/\bnext year\b/i.test(q)) return 1;
    return null;
  }
  function tfLine(y?: any): any { return y == null ? "" : y < 3 ? COPY.short : y >= 10 ? COPY.long : ""; }
  var CTX: any = { years: null, askedTwo: false };
  function pickReply(F?: any): any {
    var t = "I can’t choose for you, but I can help you decide. Two questions only you can answer: when will you need this money, and how would you feel if it dropped by the rough-year amount?";
    if (F.ok) t += " On what you’d put in " + when(F) + ", " + roughWord(F) + " could take off about " + cad0(F.list[0].off) + " for Conservative, " + cad0(F.list[1].off) + " for Balanced, " + cad0(F.list[2].off) + " for Growth or " + cad0(F.list[3].off) + " for Aggressive (an illustration).";
    return t + " Here are the four again.";
  }
  function scripted(text?: any): any {
    var q = String(text || "").trim(), F = figures(), y = yearsIn(q);
    if (y != null) CTX.years = y;
    if (R.past.test(q)) return { text: COPY.past, kind: "past" };
    if (R.confirm.test(q)) return { text: "That’s your call, and I can’t say what’s right for you. Here’s what each one could look like in " + roughWord(F) + (F.ok ? ": " + F.list.map(function (x: any) { return x.name + " about " + cad0(x.rough); }).join(", ") + " (an illustration)." : ", on the cards."), four: true, kind: "confirm" };
    if (R.pick.test(q)) { CTX.askedTwo = true; return { text: pickReply(F), four: true, kind: "pick" }; }
    if (R.debt.test(q) && !R.pick.test(q)) return { text: COPY.toTalk, talk: true, kind: "debt" };
    if (R.goals.test(q)) return { text: goalsLine(), kind: "goals" };
    if (R.existing.test(q)) return { text: existingLine(), kind: "existing" };
    if (R.why.test(q)) { var ln = tfLine(y != null ? y : CTX.years); return { text: COPY.why + (ln ? " " + ln : "") + " " + COPY.back, four: true, kind: "why" }; }
    if (y != null && !R.fees.test(q)) return timeframe(y, q);
    if (R.forawhile.test(q)) return { text: (/\brough\b/i.test(q) ? roughDef(F) + " " : "") + COPY.whileLine + " " + COPY.recover + " That’s why it helps to know when you’ll need the money.", kind: "forawhile" };
    if (R.hold.test(q)) return { text: holdLine() + " " + COPY.guide, four: true, kind: "hold" };
    if (R.recover.test(q)) return { text: COPY.recover, kind: "recover" };
    if (R.drop.test(q)) return { text: "It can happen, and it’s why the rough-year figure is on each card. If prices drop soon after you start, each payday’s buy, which you approve, gets more units while prices are lower. What matters is whether you can leave the money in place until you need it. " + COPY.recover, kind: "drop" };
    if (R.typical.test(q)) return { text: "Each card starts from what you’d put in " + when(F) + (F.ok ? ", " + cad0(F.putIn) : "") + ". The darker part is a typical result: the middle half of outcomes in the illustration. The rough figure is a bad " + (F.years === 1 ? "year" : "stretch") + ", about one in twenty, when your money could be down to that amount for a while. The good figure is the same on the upside.", four: true, kind: "typical" };
    if (R.differ.test(q) && !R.why.test(q)) return { text: "They hold the same kinds of funds in different amounts. From fewest to most stocks: Conservative is 35% stocks, Balanced 60%, Growth 80% and Aggressive 100%. More stocks means bigger swings and, over long periods, more growth potential.", four: true, kind: "differ" };
    if (R.swing.test(q)) return { text: "Stocks swing more than bonds and cash, so the more stocks a portfolio holds, the more its value moves up and down. Bonds and cash steady it, but grow more slowly. That’s why the bars get wider from Conservative to Aggressive.", four: true, kind: "swing" };
    if (R.stocks.test(q)) return { text: "A stock is a small piece of a company. Over long periods stocks have grown more than bonds or cash, but their price goes up and down a lot from year to year.", kind: "stocks" };
    if (R.bonds.test(q)) return { text: "A bond is a loan to a government or a company that pays interest. Bonds usually move less than stocks and grow more slowly, and they can still go down, especially when interest rates rise.", kind: "bonds" };
    if (R.cash.test(q)) return { text: "Cash here means money in savings deposits or a savings fund. It barely moves, and it grows slowly, so a little cash steadies a portfolio.", kind: "cash" };
    if (R.fees.test(q)) return { text: feesLine(F), kind: "fees" };
    if (R.longterm.test(q)) return { text: "Over a few months, any portfolio with stocks can be down. The longer you can leave the money, the more time it has to ride out ups and downs. " + COPY.recover, kind: "long" };
    if (R.change.test(q)) return { text: COPY.change, kind: "change" };
    if (R.safe.test(q)) return { text: "Your investments are in your own accounts at Questrade Inc., a CIRO member, protected by CIPF within its limits if the firm fails. That protection doesn’t cover market drops: investments can go down in value.", kind: "safe" };
    if (CTX.askedTwo && R.feel.test(q)) return { text: "Only you can weigh that. Here’s " + roughWord(F) + " for all four again, so you can compare them side by side.", four: true, kind: "feel" };
    return null;
  }

  /* ---------- R29: her goals, her money already invested, her timeframe, fees in her dollars ---------- */
  function liveGoals(): any { return (st().goals || []).filter(function (g: any) { return !g.archived; }); }
  function andList(a?: any): any { return a.length > 1 ? a.slice(0, -1).join(", ") + " and " + a[a.length - 1] : (a[0] || ""); }
  function covered(): any { return liveGoals().filter(function (g: any) { return g.invested || g.kind === "retirement" || g.kind === "invest"; }); }
  function pfOf(g?: any): any { return E.goalPortfolio(st(), g); }
  function goalsLine(): any {
    var C = covered(), base = (st().target || {}).id, own = C.filter(function (g: any) { return g.portfolio && g.portfolio !== base; });
    var shortG = liveGoals().filter(function (g: any) { return !g.invested && g.kind !== "emergency" && g.kind !== "retirement" && g.kind !== "invest" && num(g.target) > 0; }), ef = liveGoals().filter(function (g: any) { return g.kind === "emergency"; })[0];
    if (!C.length) return "The portfolio is for your long-term goals, like retirement or investing for later. Short-term goals are kept out of it.";
    var shared = C.filter(function (g: any) { return own.indexOf(g) < 0; });
    var t = (shared.length ? "It covers your long-term goals: " + andList(shared.map(function (g: any) { return g.name; })) + "." : "") +
      (own.length ? " " + andList(own.map(function (g: any) { var p = pfOf(g); return g.name + (p ? " uses " + p.name : " has its own choice"); })) + ", chosen on that goal’s screen." : "");
    if (shortG.length) t += " " + andList(shortG.map(function (g: any) { return g.name; })) + (shortG.length === 1 ? " is a short-term goal" : " are short-term goals") + ", kept in " + (shortG.every(function (g: any) { return g.keepIn === "savings_fund"; }) ? "a savings fund" : "savings") + ", not in this portfolio.";
    if (ef) t += " Your " + ef.name + " stays as cash.";
    return (t + " You can choose a different portfolio for one goal on its screen in Plan.").trim();
  }
  function investedNow(): any { return covered().reduce(function (s: any, g: any) { return s + num(g.saved); }, 0); }
  function existingLine(): any {
    var inv = Math.round(investedNow()), cur = (st().portfolios || []).filter(function (p: any) { return p.id === (st().target || {}).id; })[0];
    if (!cur || !(inv > 0)) return "Nothing is invested in a portfolio yet, so there’s nothing to move. Whatever you choose applies from your first payday’s buy, which you approve.";
    return "Your " + cad0(inv) + " already invested stays in " + cur.name + " unless you choose otherwise. If you change portfolios, you pick one of two. Only new deposits: from your next payday, buys follow the new portfolio, and what you already own stays as it is. Or also move what’s already invested: sell what you hold now and buy the new portfolio’s funds, in TFSA, FHSA and RRSP; you’ll see every order, approve with Face ID, then confirm in Questrade. Selling inside these accounts isn’t taxed. Prices move, so amounts are approximate. Your choice. Woodstock doesn’t recommend switching or staying.";
  }
  function roughDef(F?: any): any { return "Rough is a bad " + (F.years === 1 ? "year" : "stretch") + " in the illustration, about one in twenty: about 1 " + (F.years === 1 ? "year" : "time") + " in 20 is worse."; }
  function holdLine(): any {
    var hy = function (p: any) { return E.holdYears(p); };
    return "The holding periods on the cards: " + four().map(function (p: any) { return p.name + " is generally meant for money you won’t need for at least " + hy(p) + " years"; }).join("; ") + ".";
  }
  function timeframe(y?: any, q?: any): any {
    var h = y >= 3 ? 5 : 1, was = H.horizon;
    if (was !== h) { H.horizon = h; try { opts && opts.onHorizon && opts.onHorizon(h as 1 | 5); } catch (e) {} }
    var F = figures(), yrs = y < 1 ? Math.round(y * 12) + " months" : Math.round(y) + " year" + (Math.round(y) === 1 ? "" : "s");
    var gen = y < 5 ? "Money needed in under 5 years is generally treated as short term, usually kept in lower-risk options that are easy to cash out." : y <= 10 ? "Money needed in about 5 to 10 years is generally treated as medium term, often with some stocks." : "Money needed in more than 10 years is generally treated as long term, with more room for stocks.";
    var t = "You said about " + yrs + ". " + (h !== was ? "The cards now show " + (h === 5 ? "5 years" : "1 year") + ". " : "") +
      (F.ok ? "Over " + (h === 5 ? "5 years" : "1 year") + ", " + roughWord(F) + " could leave about " + cad0(F.list[0].rough) + " for Conservative, " + cad0(F.list[1].rough) + " for Balanced, " + cad0(F.list[2].rough) + " for Growth or " + cad0(F.list[3].rough) + " for Aggressive, from " + cad0(F.putIn) + " put in (an illustration). " : "") +
      gen + " " + holdLine() + " " + COPY.guide + " " + COPY.back;
    return { text: t, four: true, kind: "timeframe" };
  }
  function feeOfP(p?: any): any { var x = /([\d.]+)\s*%/.exec(String(p.mer || "")); return x ? Number(x[1]) : null; }
  function feesLine(F?: any): any {
    var amt = F.putIn || investedNow(), P = four(), fs = P.map(feeOfP);
    var base = "Each fund charges a small yearly fee, a percentage of what you hold, called the MER (management expense ratio). The figures on the cards already take it off.";
    if (!(amt > 0) || fs.some(function (x: any) { return x == null; })) return base + " About 0.1% means about $1 a year for every $1,000.";
    return "On about " + cad0(amt) + ", the yearly fund fees would be about " + P.map(function (p: any, i: any) { return cad0(Math.round(amt * fs[i] / 100)) + " for " + p.name; }).join(", ").replace(/, ([^,]*)$/, " or $1") + ". " + base + " Woodstock’s own subscription is separate.";
  }
  var CHIPS = ["What are stocks and bonds?", "What does a rough year mean?", "Why do some swing more?", "What if it drops right after I start?", "What do fees mean?", "Which one should I pick?"];

  /* ---------- live filter: Compliance section 5 cpass patterns, plus the shared one ---------- */
  var BAD: RegExp[] = [
    new RegExp("\\b(go with|pick|choose|i'?d|suits you|right for you|best for|would be best)\\b[^.]{0,40}\\b(" + P_NAMES + ")\\b", "i"),
    new RegExp("\\b(" + P_NAMES + ")\\b[^.]{0,40}\\b(suits you|right for you|best for|would be best|is for you)\\b", "i"),
    new RegExp("\\b(yes|right|exactly|makes sense|good choice)\\b[^.]{0,20}\\b(" + P_NAMES + ")\\b", "i"),
    /\b(best|safest|worst|number one|first choice)\b/i, /\bfor you\b/i, /\bif i were you\b/i, /\bin your case\b/i, /\bI'?d\b/, /\bI would\b/i, /\bmost people\b/i,
    /\b(will come back|always recover|will recover|will bounce|guarantee\w*)\b/i, /\bwill (earn|return|grow|make)\b/i, /ACTION\s*:/i, /[\u2014\u2013]/];
  function bad(t?: any): any {
    var s = String(t || "");
    if (/\d+(\.\d+)?\s?%/.test(s) && /\b(returned|return of|returns of|last year|in 20\d\d|per year over)\b/i.test(s) && !/Past results don.t predict/i.test(s)) return true;
    
    return BAD.some(function (r: any) { return r.test(s); });
  }

  function context(): any {
    var F = figures();
    var a = "THE FOUR (fixed order): " + four().map(function (p: any) { return p.name + ": " + p.equity + "% stocks, " + p.bonds + "% bonds and cash; holds " + ((p.holdings && p.holdings.registered) || []).map(function (h: any) { return h.ticker + " " + h.weight + "% (" + h.holds + ", fee " + h.fee + ")"; }).join(", "); }).join(". ") + ".";
    var b = F.ok ? "HER FIGURES (" + (F.years === 1 ? "1 year" : "5 years") + ", an illustration): she would put in " + cad0(F.putIn) + ". " + F.list.map(function (x: any) { return x.name + ": rough about " + cad0(x.rough) + " (takes off about " + cad0(x.off) + "), typical " + cad0(x.lo) + " to " + cad0(x.hi) + ", good about " + cad0(x.good); }).join("; ") + "." : "HER FIGURES: not available; say the cards show them.";
    return a + "\n" + b;
  }

  return {
    /** The scripted reply: {text, four?, talk?, menu?, kind}. A miss is never null: it says so and offers Talk. */
    reply: function (text: string): any { return scripted(text) || { text: COPY.miss + " Talk it through can work through planning questions with your numbers, or try one of these.", talk: true, menu: true, kind: "miss" }; },
    scripted: scripted,
    figures: figures,
    horizon: function (): number { return H.horizon; },
    setHorizon: function (h: 1 | 5) { H.horizon = h === 5 ? 5 : 1; },
    reset: function () { CTX = { years: null, askedTwo: false }; },
    bad: bad, context: context, SYSTEM: SYSTEM, COPY: COPY, CHIPS: CHIPS, ORDER: ORDER,
    intro: function (from?: string) { return from === "notsure" ? COPY.notsure : COPY.intro; }
  };
}
