/* Build my own with "Build it with me" (CR11 s12), ported from the prototype's bmo.js (v7.3).
   The demo list (real, well-known securities; factual descriptions; approximate prices and fees), her draft per
   account (TFSA, FHSA, RRSP and any other linked Questrade account), and the helper that turns her own words into
   rows ("60% VFV in my TFSA"), lists every fund in a category she names A to Z, and explains a fund. It never
   chooses, ranks or suggests (GUARD, COPY.refuse, BANNED). Nothing is saved until she taps Use my mix (save()).
   Pure: the view (feature-talk BuildMyOwn) renders the draft and the helper's replies. */
import * as E from "./env.ts";

const num = E.num;

export function createBuilder(getState: () => any) {
  function st(): any { return getState() || {}; }
  var D: any = null;
  var H: any = { turns: [], pending: null, picked: {}, pendingText: null };
  var COPY: any = {
    title: "Build my own",
    gate: "For people who want to choose each investment themselves.",
    header: "Search by name or ticker. Listed A to Z. This is a sample list for the demo, not a selection or a recommendation.",
    single: "A single company’s stock can rise or fall much more than a fund that holds many.",
    usd: "Bought in US dollars. Questrade converts at a fee (about 1.5%).",
    confirm: "You chose these yourself. Woodstock doesn’t review or recommend investments.",
    demoPrices: "Demo prices, not live. Fees are approximate; check the issuer before you buy.",
    refuse: "I can’t choose investments for you; Woodstock isn’t registered to give that kind of advice. Two ways to go from here: compare the four ready-made portfolios side by side, or tell me a category and I’ll list every fund in it, A to Z, so you can pick.",
    canDo: "Turn what you tell it into rows, like \"60% VFV in my TFSA\". Find every fund in a category you name. Explain a fund: what it holds, its fee, how much it tends to move, its currency. It can’t tell you what to pick or whether a fund is good.",
    pct: "What percentage for each?",
    acct: "Which account: TFSA, FHSA or RRSP?",
    past: "Past results don’t predict future returns.",
    source: "Facts from the issuer. Demo data.",
    helperIntro: "Tell me what you want in your own words, for example: 60% in an S&P 500 fund and 40% in a Canadian bond fund in my TFSA. Every fund choice stays yours, and nothing is saved until you tap Use my mix.",
    helperDisc: "Build it with me follows your instructions and explains funds. It doesn’t choose, rank or suggest investments; Woodstock isn’t registered to give investment advice. You decide what goes in each account."
  };
  var FX = 1.38; /* demo US dollar rate, shown wherever a US price is converted */

  /* ---------- the demo list: real, well-known securities; factual descriptions; prices and fees approximate ----------
     [ticker, name, exchange, category, kind ("fund"|"stock"), issuer, fee, holds, price (listing currency), sleeve, tags] */
  var RAW: any[] = [
    ["HXT", "Global X S&P/TSX 60 Index Corporate Class ETF", "TSX", "can", "fund", "Global X", "0.03%", "The 60 largest Canadian companies. Dividends stay inside the fund.", 63.80, "cad", "tsx60 canadian"],
    ["VCN", "Vanguard FTSE Canada All Cap Index ETF", "TSX", "can", "fund", "Vanguard", "0.05%", "About 170 Canadian companies of all sizes.", 50.40, "cad", "canadian market"],
    ["XIC", "iShares Core S&P/TSX Capped Composite Index ETF", "TSX", "can", "fund", "BlackRock (iShares)", "0.06%", "About 220 large and mid-sized Canadian companies.", 41.20, "cad", "tsx composite canadian market"],
    ["XIU", "iShares S&P/TSX 60 Index ETF", "TSX", "can", "fund", "BlackRock (iShares)", "0.18%", "The 60 largest Canadian companies.", 38.90, "cad", "tsx60 canadian"],
    ["ZCN", "BMO S&P/TSX Capped Composite Index ETF", "TSX", "can", "fund", "BMO Global Asset Management", "0.06%", "About 220 large and mid-sized Canadian companies.", 33.10, "cad", "tsx composite canadian market"],
    ["ZEB", "BMO Equal Weight Banks Index ETF", "TSX", "can", "fund", "BMO Global Asset Management", "0.28%", "Canada’s six largest banks, in equal amounts.", 39.20, "cad", "banks"],
    ["BMO", "Bank of Montreal", "TSX", "can", "stock", "", "", "One company: a Canadian bank.", 128.40, "cad", "banks bank"],
    ["CNR", "Canadian National Railway", "TSX", "can", "stock", "", "", "One company: a railway across Canada and the US.", 154.20, "cad", "railway"],
    ["ENB", "Enbridge", "TSX", "can", "stock", "", "", "One company: oil and gas pipelines and a gas utility.", 58.30, "cad", "energy pipeline"],
    ["RY", "Royal Bank of Canada", "TSX", "can", "stock", "", "", "One company: a Canadian bank.", 171.60, "cad", "banks bank"],
    ["SHOP", "Shopify", "TSX", "can", "stock", "", "", "One company: software for online stores.", 104.90, "cad", "tech"],
    ["SU", "Suncor Energy", "TSX", "can", "stock", "", "", "One company: oil sands, refining and Petro-Canada stations.", 52.70, "cad", "energy oil"],
    ["TD", "Toronto-Dominion Bank", "TSX", "can", "stock", "", "", "One company: a Canadian bank.", 79.10, "cad", "banks bank"],
    ["VFV", "Vanguard S&P 500 Index ETF", "TSX", "us", "fund", "Vanguard", "0.09%", "About 500 large US companies (the S&P 500). Bought in Canadian dollars.", 158.40, "us", "sp500"],
    ["VOO", "Vanguard S&P 500 ETF", "NYSE Arca", "us", "fund", "Vanguard", "0.03%", "About 500 large US companies (the S&P 500).", 560.10, "us", "sp500"],
    ["VTI", "Vanguard Total Stock Market ETF", "NYSE Arca", "us", "fund", "Vanguard", "0.03%", "About 3,600 US companies of all sizes.", 289.40, "us", "ustotal"],
    ["XUS", "iShares Core S&P 500 Index ETF", "TSX", "us", "fund", "BlackRock (iShares)", "0.10%", "About 500 large US companies (the S&P 500). Bought in Canadian dollars.", 55.40, "us", "sp500"],
    ["XUU", "iShares Core S&P US Total Market Index ETF", "TSX", "us", "fund", "BlackRock (iShares)", "0.07%", "About 3,500 US companies of all sizes. Bought in Canadian dollars.", 59.70, "us", "ustotal"],
    ["ZSP", "BMO S&P 500 Index ETF", "TSX", "us", "fund", "BMO Global Asset Management", "0.09%", "About 500 large US companies (the S&P 500). Bought in Canadian dollars.", 83.70, "us", "sp500"],
    ["AAPL", "Apple", "NASDAQ", "us", "stock", "", "", "One company: iPhone, Mac and services.", 228.10, "us", "tech"],
    ["AMZN", "Amazon", "NASDAQ", "us", "stock", "", "", "One company: online retail and cloud computing.", 198.20, "us", "tech"],
    ["GOOGL", "Alphabet (Class A)", "NASDAQ", "us", "stock", "", "", "One company: Google search, YouTube and cloud.", 172.40, "us", "tech"],
    ["MSFT", "Microsoft", "NASDAQ", "us", "stock", "", "", "One company: Windows, Office and cloud computing.", 418.50, "us", "tech"],
    ["NVDA", "NVIDIA", "NASDAQ", "us", "stock", "", "", "One company: computer chips for graphics and AI.", 135.60, "us", "tech chips"],
    ["VIU", "Vanguard FTSE Developed All Cap ex North America Index ETF", "TSX", "intl", "fund", "Vanguard", "0.23%", "About 3,900 companies in Europe, Japan, Australia and other developed countries.", 38.60, "intl", "developed international"],
    ["VXUS", "Vanguard Total International Stock ETF", "NASDAQ", "intl", "fund", "Vanguard", "0.05%", "About 8,000 companies outside the US, in developed and emerging countries.", 66.20, "intl", "international"],
    ["XEC", "iShares Core MSCI Emerging Markets IMI Index ETF", "TSX", "intl", "fund", "BlackRock (iShares)", "0.26%", "About 3,000 companies in emerging countries such as China, India, Taiwan and Brazil.", 29.80, "em", "emerging"],
    ["XEF", "iShares Core MSCI EAFE IMI Index ETF", "TSX", "intl", "fund", "BlackRock (iShares)", "0.22%", "About 2,500 companies in Europe, Asia and Australia.", 40.10, "intl", "developed international eafe"],
    ["VEE", "Vanguard FTSE Emerging Markets All Cap Index ETF", "TSX", "intl", "fund", "Vanguard", "0.24%", "About 5,000 companies in emerging countries.", 40.00, "em", "emerging"],
    ["VAB", "Vanguard Canadian Aggregate Bond Index ETF", "TSX", "bond", "fund", "Vanguard", "0.09%", "Canadian government and company bonds of all lengths.", 23.30, "bond", "bonds canadian aggregate"],
    ["VSB", "Vanguard Canadian Short-Term Bond Index ETF", "TSX", "bond", "fund", "Vanguard", "0.11%", "Canadian government and company bonds that mature in 1 to 5 years.", 45.90, "bond", "bonds canadian short"],
    ["XBB", "iShares Core Canadian Universe Bond Index ETF", "TSX", "bond", "fund", "BlackRock (iShares)", "0.10%", "Canadian government and company bonds of all lengths.", 28.70, "bond", "bonds canadian aggregate"],
    ["XSB", "iShares Core Canadian Short Term Bond Index ETF", "TSX", "bond", "fund", "BlackRock (iShares)", "0.10%", "Canadian government and company bonds that mature in 1 to 5 years.", 26.80, "bond", "bonds canadian short"],
    ["ZAG", "BMO Aggregate Bond Index ETF", "TSX", "bond", "fund", "BMO Global Asset Management", "0.09%", "Canadian government and company bonds of all lengths.", 13.90, "bond", "bonds canadian aggregate"],
    ["CASH", "Global X High Interest Savings ETF", "TSX", "cash", "fund", "Global X", "0.11%", "Cash in deposit accounts at Canadian banks.", 50.02, "cash", "cash savings"],
    ["PSA", "Purpose High Interest Savings Fund (ETF)", "TSX", "cash", "fund", "Purpose Investments", "0.15%", "Cash in deposit accounts at Canadian banks.", 50.04, "cash", "cash savings"],
    ["ZMMK", "BMO Money Market Fund ETF Series", "TSX", "cash", "fund", "BMO Global Asset Management", "0.13%", "Short loans to governments and companies.", 50.00, "cash", "cash moneymarket"],
    ["VBAL", "Vanguard Balanced ETF Portfolio", "TSX", "all", "fund", "Vanguard", "0.24%", "About 60% stocks and 40% bonds, from around the world, in one fund.", 33.20, "mixed", "balanced allinone"],
    ["VEQT", "Vanguard All-Equity ETF Portfolio", "TSX", "all", "fund", "Vanguard", "0.24%", "About 13,000 stocks from around the world, no bonds, in one fund.", 44.90, "mixed", "allequity allinone"],
    ["VGRO", "Vanguard Growth ETF Portfolio", "TSX", "all", "fund", "Vanguard", "0.24%", "About 80% stocks and 20% bonds, from around the world, in one fund.", 36.50, "mixed", "growth allinone"],
    ["XBAL", "iShares Core Balanced ETF Portfolio", "TSX", "all", "fund", "BlackRock (iShares)", "0.20%", "About 60% stocks and 40% bonds, from around the world, in one fund.", 30.50, "mixed", "balanced allinone"],
    ["XEQT", "iShares Core Equity ETF Portfolio", "TSX", "all", "fund", "BlackRock (iShares)", "0.20%", "About 9,000 stocks from around the world, no bonds, in one fund.", 33.60, "mixed", "allequity allinone"],
    ["XGRO", "iShares Core Growth ETF Portfolio", "TSX", "all", "fund", "BlackRock (iShares)", "0.20%", "About 80% stocks and 20% bonds, from around the world, in one fund.", 30.10, "mixed", "growth allinone"]
  ];
  var CATS: any[] = [
    { id: "can", name: "Canadian stocks", line: "Funds that hold many Canadian companies, and single Canadian companies." },
    { id: "us", name: "US stocks", line: "Funds that hold many US companies, and single US companies." },
    { id: "intl", name: "International stocks", line: "Funds that hold companies outside Canada and the US." },
    { id: "bond", name: "Bonds", line: "Funds that hold government and company bonds." },
    { id: "cash", name: "Cash and savings funds", line: "Funds that hold cash deposits or very short loans." },
    { id: "all", name: "All-in-one funds", line: "One fund that holds stocks and bonds from around the world." }
  ];
  var MOVES: any = {
    stockFund: "A stock fund can rise or fall a lot in a single year.",
    stock: COPY.single,
    bond: "Bond funds usually move less than stock funds, and can go down, especially when interest rates rise.",
    cash: "Moves very little. Its yield can change. Not guaranteed, and not covered by CDIC.",
    mixed: "Moves with its mix of stocks and bonds; the more stocks, the bigger the ups and downs."
  };
  var LIST: any[] = RAW.map(function (r: any) {
    var usd = /NASDAQ|NYSE/.test(r[2]);
    return { t: r[0], name: r[1], ex: r[2], cat: r[3], kind: r[4], issuer: r[5], fee: r[6], holds: r[7], px: r[8], sleeve: r[9], tags: r[10], usd: usd, cad: usd ? Math.round(r[8] * FX * 100) / 100 : r[8] };
  }).sort(function (a: any, b: any) { return a.name.localeCompare(b.name); });
  function sec(t?: any): any { t = String(t || "").toUpperCase(); for (var i = 0; i < LIST.length; i++) if (LIST[i].t === t) return LIST[i]; return null; }
  function moves(s?: any): any { return s.kind === "stock" ? MOVES.stock : s.cat === "bond" ? MOVES.bond : s.cat === "cash" ? MOVES.cash : s.cat === "all" ? MOVES.mixed : MOVES.stockFund; }
  function catName(id?: any): any { return (CATS.filter(function (c: any) { return c.id === id; })[0] || {}).name || ""; }
  function plainCat(s?: any): any { return s.kind === "stock" ? "One company" : catName(s.cat); }

  function perPay(acct?: any): any { var P = (st().plan && st().plan.perPay) || {}; return num(P[acct]); }
  function accounts(): any {
    var out = ["TFSA", "FHSA", "RRSP"];
    (st().accounts || []).forEach(function (a: any) { var k = String(a.type || a.id || "").toUpperCase(); if (a.provider === "Questrade" && !a.kind && k && out.indexOf(k) < 0) out.push(k); });
    return out;
  }

  /* ---------- the draft: one list of {t, w} per account; % or $ a payday per account ---------- */
  var D: any = null;
  function loadDraft(): any {
    var t = st().target || {}, m: any = {}, mode: any = {};
    accounts().forEach(function (a: any) { m[a] = []; mode[a] = "pct"; });
    if (t.id === "custom" && t.mixes) Object.keys(t.mixes).forEach(function (a: any) { m[a] = (t.mixes[a] || []).map(function (x: any) { return { t: x.ticker, w: num(x.weight) }; }); });
    else if (t.id === "custom" && t.mix) accounts().forEach(function (a: any) { if (perPay(a) > 0) m[a] = t.mix.map(function (x: any) { return { t: x.ticker, w: num(x.weight) }; }); });
    var first = accounts().filter(function (a: any) { return perPay(a) > 0; })[0] || "TFSA";
    D = { mixes: m, mode: mode, acct: first, dirty: false };
  }
  function total(a?: any): any { return Math.round(D.mixes[a].reduce(function (s: any, x: any) { return s + num(x.w); }, 0) * 10) / 10; }
  function filled(): any { return accounts().filter(function (a: any) { return D.mixes[a].length; }); }
  function readyToSave(): any { var f = filled(); return f.length > 0 && f.every(function (a: any) { return Math.abs(total(a) - 100) < 0.05; }); }
  function setRow(a?: any, t?: any, w?: any): any { var r = D.mixes[a].filter(function (x: any) { return x.t === t; })[0]; if (r) r.w = w; else D.mixes[a].push({ t: t, w: w }); D.dirty = true; }

  var DESCR: any[] = [
    [/s\s*&\s*p\s*500|s&p500|sp\s?500|s and p 500/, function (s: any) { return /sp500/.test(s.tags); }, "S&P 500 funds"],
    [/total (us )?(stock )?market|whole us market|all us (stocks|companies)/, function (s: any) { return /ustotal/.test(s.tags); }, "US total market funds"],
    [/tsx ?60|60 largest/, function (s: any) { return /tsx60/.test(s.tags); }, "S&P/TSX 60 funds"],
    [/all.?equity|100% stocks/, function (s: any) { return /allequity/.test(s.tags); }, "all-equity funds"],
    [/\bbalanced\b/, function (s: any) { return /balanced/.test(s.tags); }, "balanced all-in-one funds"],
    [/\bgrowth (etf|fund|portfolio)\b|80\/20/, function (s: any) { return /growth/.test(s.tags); }, "growth all-in-one funds"],
    [/all.?in.?one|one.?fund|asset allocation/, function (s: any) { return s.cat === "all"; }, "all-in-one funds"],
    [/short.?term bond/, function (s: any) { return /short/.test(s.tags) && s.cat === "bond"; }, "short-term bond funds"],
    [/\bbonds?\b/, function (s: any) { return s.cat === "bond"; }, "bond funds"],
    [/money market/, function (s: any) { return /moneymarket/.test(s.tags); }, "money market funds"],
    [/\bcash\b|savings|high.?interest/, function (s: any) { return s.cat === "cash"; }, "cash and savings funds"],
    [/emerging/, function (s: any) { return /emerging/.test(s.tags); }, "emerging-market funds"],
    [/international|developed|eafe|europe|outside (canada|north america)|global ex/, function (s: any) { return s.cat === "intl" && s.kind === "fund" && !/emerging/.test(s.tags); }, "international funds"],
    [/bank (stocks?|shares)|\bbanks\b/, function (s: any) { return /banks/.test(s.tags); }, "bank stocks and funds"],
    [/canad(a|ian)( stock| equit| market| index| compan|s? fund)|\btsx\b/, function (s: any) { return s.cat === "can" && s.kind === "fund" && !/banks/.test(s.tags); }, "Canadian stock funds"],
    [/\bu\.?s\.?( stock| equit| market| index| compan)|american (stocks|companies)/, function (s: any) { return s.cat === "us" && s.kind === "fund"; }, "US stock funds"]
  ];
  var WORDY: any = { CASH: 1, SU: 1, TD: 1, RY: 1, PSA: 1 };
  function nameCore(s?: any): any { var n = s.name.toLowerCase().replace(/\(.*?\)/g, "").replace(/[.,]/g, "").trim().split(/\s+/); return n.slice(0, s.kind === "stock" ? (n[1] === "of" ? 3 : 2) : 3).join(" "); }
  function resolve(desc?: any): any {
    var raw = " " + String(desc || "").replace(/[’]/g, "'") + " ", d = raw.toLowerCase();
    var tk = LIST.filter(function (s: any) { return WORDY[s.t] ? new RegExp("(^|[^A-Za-z])" + s.t + "([^A-Za-z]|$)").test(raw) : new RegExp("(^|[^a-z])" + s.t.toLowerCase() + "([^a-z]|$)").test(d); });
    var nm = LIST.filter(function (s: any) { var core = nameCore(s), first = core.split(" ")[0]; return d.indexOf(" " + core) >= 0 || (s.kind === "stock" && first.length > 4 && ["canadian", "royal", "toronto-dominion", "suncor"].indexOf(first) < 0 && d.indexOf(" " + first) >= 0) || (s.kind === "stock" && first === "suncor" && d.indexOf("suncor") >= 0); });
    if (nm.length && (!tk.length || nm.some(function (s: any) { return tk.some(function (t: any) { return s.name.toLowerCase().indexOf(t.t.toLowerCase() + " ") === 0; }); }))) return { list: nm, how: "name" };
    if (tk.length) return { list: tk, how: "ticker" };
    for (var i = 0; i < DESCR.length; i++) if (DESCR[i][0].test(d)) return { list: LIST.filter(DESCR[i][1]), how: "descr", label: DESCR[i][2] };
    return { list: [], how: "none" };
  }
  function pickedOrResolve(desc?: any): any { var key = desc.toLowerCase().trim(); if (H.picked[key]) return { list: [sec(H.picked[key])], how: "picked" }; return resolve(desc); }
  function acctIn(q?: any): any { var m = /\b(tfsa|fhsa|rrsp|lira|resp)\b/i.exec(q), k = m ? m[1].toUpperCase() : null; return k && accounts().indexOf(k) >= 0 ? k : null; }
  /* "60% S&P 500 fund, 40% Canadian bonds in my TFSA" -> [{pct, desc}] */
  function segments(q?: any): any {
    var body = q.replace(/\b(in|into|for|to) (my|the) (tfsa|fhsa|rrsp|lira)\b/ig, " ").replace(/\b(please|put|make it|i want|i'd like|let's do|do)\b/ig, " ");
    var parts = body.split(/,|;|\+|\band\b|\bplus\b|\bwith\b/i).map(function (x: any) { return x.trim(); }).filter(Boolean), out: any[] = [];
    parts.forEach(function (p: any) {
      var m: any = /(\d{1,3}(?:\.\d)?)\s*(%|percent)/i.exec(p), d: any = /\$\s?(\d[\d,]*)/.exec(p);
      if (!m && !d) return;
      var desc = p.replace(m ? m[0] : d[0], " ").replace(/\b(of|in|an?|the|my|each|every|a payday|per payday|a pay)\b/ig, " ").replace(/\s+/g, " ").trim();
      out.push({ pct: m ? +m[1] : null, usd: d ? +d[1].replace(/,/g, "") : null, desc: desc });
    });
    return out;
  }
  var GUARD = /\b(which|what)\b[^?]{0,40}\b(should|would|do you|to (pick|choose|buy))\b|\bshould i (pick|choose|buy|get|use|go with|add|hold|invest)\b|\b(best|good|better|safest|safer|top|popular|recommend\w*|suggest\w*|favou?rite|winning)\b|\bbuild me\b|\b(pick|choose|decide) for me\b|\bwhat would you\b|\bis \w+ (a )?(good|bad|safe|risky|worth)\b|\bmake me (a|an)\b|\bwhat would you do\b|\b(fill|cover) (in )?(the )?(rest|gap|remaining)\b|\bsomething (for|in) the (rest|other)\b/i;
  function scripted(text?: any): any {
    var q = String(text || "").trim(), ql = q.toLowerCase();
    if (GUARD.test(ql)) {
      var one = resolve(ql);
      if (/\bis\b|\bare\b|\bhow (good|safe|risky)\b/.test(ql) && (one.how === "ticker" || one.how === "name") && one.list.length === 1) return { handled: true, text: "Here are the facts about " + one.list[0].t + ", the same for everyone.", facts: one.list };
      var cat: any = null, segs = one;
      if (segs.how === "descr" || segs.how === "name") cat = segs; else { var c0 = CATS.filter(function (c: any) { return ql.indexOf(c.name.toLowerCase().replace(/ stocks$/, "")) >= 0; })[0]; if (c0) cat = { list: LIST.filter(function (s: any) { return s.cat === c0.id; }), label: c0.name.toLowerCase() }; }
      return { handled: true, text: COPY.refuse, four: true, browse: true, list: cat && cat.list.length ? cat.list : null, listLabel: cat ? cat.label || "matches" : null };
    }
    var explain = /\b(what('?s| is| are)|tell me about|explain|describe|how much does|what does|fee (on|for)|how (risky|volatile)|holds?)\b/i.test(ql);
    var segs2 = segments(q);
    if (explain && !segs2.length) {
      var rs = resolve(ql);
      if (rs.list.length === 1 || (rs.how === "ticker" && rs.list.length)) return { handled: true, facts: rs.list.slice(0, 2) };
      if (rs.list.length > 1) return { handled: true, text: "Here are the " + (rs.label || "matches") + " in the demo list, A to Z. Tap one to see what it holds, its fee and how much it moves.", list: rs.list, listLabel: rs.label };
      if (/\betf\b|\bfund\b/.test(ql)) return { handled: true, text: "A fund (an ETF) holds many investments in one, and trades like a share. Its fee is a yearly percentage of what you hold. Tap any fund in the list to see what it holds." };
    }
    var ed = /\b(remove|delete|take out|drop)\b\s+([a-z0-9.]+)/i.exec(q); if (ed) { var s0 = sec(ed[2]) || (resolve(ed[2]).list.length === 1 ? resolve(ed[2]).list[0] : null), a0 = acctIn(q) || D.acct; if (s0 && D.mixes[a0].some(function (x: any) { return x.t === s0.t; })) { var rows0 = D.mixes[a0].filter(function (x: any) { return x.t !== s0.t; }).map(function (x: any) { return { t: x.t, w: x.w }; }); return { handled: true, text: "Here’s your " + a0 + " without " + s0.t + ".", rows: rows0, acct: a0, replace: true }; } }
    var cl = /\b(clear|empty|start over( with)?|reset)\b/i.exec(q); if (cl) { var a1 = acctIn(q) || D.acct; return { handled: true, text: "This empties your " + a1 + " draft.", rows: [], acct: a1, replace: true }; }
    var cp = /\bsame\b[^.]*\b(in|for) (my )?(tfsa|fhsa|rrsp)\b|\bcopy\b[^.]*\b(tfsa|fhsa|rrsp)\b[^.]*\b(to|into)\b[^.]*\b(tfsa|fhsa|rrsp)\b/i.exec(q);
    if (cp) { var to = (cp[3] || cp[6]).toUpperCase(), from = cp[4] ? cp[4].toUpperCase() : D.acct; if (D.mixes[from].length) return { handled: true, text: "Here’s your " + from + " mix for your " + to + ".", rows: D.mixes[from].map(function (x: any) { return { t: x.t, w: x.w }; }), acct: to, replace: true }; }
    var setw: any = /\b(set|make|change|put)\s+([a-z0-9.]{2,6})\s+(to|at)\s+(\d{1,3}(?:\.\d)?)\s*%?/i.exec(q);
    if (setw && sec(setw[2])) { var a2 = acctIn(q) || D.acct, rows2 = D.mixes[a2].map(function (x: any) { return { t: x.t, w: x.w }; }), r2 = rows2.filter(function (x: any) { return x.t === sec(setw[2]).t; })[0]; if (r2) r2.w = +setw[4]; else rows2.push({ t: sec(setw[2]).t, w: +setw[4] }); return { handled: true, text: "Here’s the change to your " + a2 + ".", rows: rows2, acct: a2, replace: true }; }
    if (segs2.length || (/\b(mostly|some|a bit of|a little)\b/.test(ql) && resolve(ql).list.length)) {
      if (!segs2.length) return { handled: true, text: COPY.pct };
      var acct = acctIn(q), pp = acct ? perPay(acct) : 0;
      if (!acct) { H.pendingText = q; return { handled: true, text: COPY.acct, askAcct: true }; }
      H.pending = { acct: acct, items: segs2.map(function (s: any) { return { pct: s.pct != null ? s.pct : (pp > 0 && s.usd != null ? Math.round(s.usd / pp * 1000) / 10 : null), usd: s.usd, desc: s.desc, t: null } }) };
      if (H.pending.items.some(function (x: any) { return x.pct == null; })) { H.pending = null; return { handled: true, text: "Your " + acct + " has no payday amount yet, so dollars can’t be turned into shares of it. " + COPY.pct }; }
      var sum0 = H.pending.items.reduce(function (s3: any, x: any) { return s3 + x.pct; }, 0);
      if (H.pending.items.length > 1 && Math.abs(sum0 - 100) > 0.05) { H.pending = null; return { handled: true, text: "Those add up to " + Math.round(sum0 * 10) / 10 + "%. " + COPY.pct }; }
      return { handled: true, ask: true };
    }
    return { handled: false };
  }
  var BANNED: RegExp[] = [/\b(good|great|solid|smart|strong|safe|best|top|popular|favou?rite|winning) (pick|choice|fund|option|mix|portfolio|stock|bet)\b/i, /\brecommend/i, /\bsuggest/i, /\bdiversif/i, /\brebalance into\b/i, /\btoo risky\b/i, /\byou should\b/i, /\bi'?d (go with|pick|choose)\b/i, /\b(fits|suits|right for) you\b/i, /\bguarantee/i, /\bwill (earn|return|grow)\b/i, /\boutperform/i, /financial planner|financial advis|wealth manag|AI advis/i];
  function bad(t?: any): any { var s = String(t || "").replace(/\b(not|no|never|can'?t|cannot|won'?t|doesn'?t|don'?t) (a |any )?(recommend\w*|suggest\w*|guarantee\w*)/ig, ""); return BANNED.some(function (r: any) { return r.test(s); }); }
  var RULES = "You are the \"Build it with me\" helper inside Woodstock's Build my own screen. Woodstock is a planning app, not a registered adviser or dealer, and holds no planning or advising title. Plain text, at most four short sentences, Canadian spelling, no em or en dashes, no exclamation marks. " +
    "You follow her own instructions and explain funds factually (what they hold, issuer, fee, how much that kind of fund moves). You never choose, rank, compare as better or worse, or suggest any security, mix or portfolio, and never comment on her picks (no good, great, solid, smart, risky, diversify, rebalance). If she asks which to pick or for a good portfolio, reply exactly: \"" + COPY.refuse + "\" " +
    "Use only the securities in THE LIST below; never name anything else. Projections and returns are never given. If she gives percentages for named securities, you may end with one line ACTION:{\"type\":\"bmo_rows\",\"account\":\"TFSA\",\"rows\":[{\"ticker\":\"XIC\",\"pct\":50}]} using only tickers she named herself; never fill in a security she did not name.";

  /* walk her items; a description that matches more than one fund becomes a neutral A to Z choice for her */
  function askNext(): any {
    var P = H.pending; if (!P) return null;
    for (var i = 0; i < P.items.length; i++) {
      var it = P.items[i]; if (it.t) continue;
      var r = pickedOrResolve(it.desc);
      if (r.list.length === 1 && (r.how === "ticker" || r.how === "name" || r.how === "picked")) { it.t = r.list[0].t; continue; }
      if (!r.list.length) { H.pending = null; return { text: "I couldn’t find “" + it.desc + "” in the demo list. Try a name or a ticker, or browse a category." }; }
      var lab = r.label || "matches";
      return { text: "“" + it.desc + "”: " + (r.list.length === 1 ? "one fund in the list matches" : r.list.length + " " + lab + " in the list match, A to Z by name") + ". Pick one for " + it.pct + "% of your " + P.acct + ".",
        choose: { desc: it.desc, options: r.list.slice().sort(function (x: any, y: any) { return x.name.localeCompare(y.name); }).map(function (s: any) { return { t: s.t, name: s.name, sub: s.t + " · " + (s.issuer || s.ex) + " · " + (s.fee ? "fee about " + s.fee : "no fund fee") }; }) } };
    }
    var rows = P.items.map(function (x: any) { return { t: x.t, w: x.pct }; }), sum = rows.reduce(function (s: number, x: any) { return s + x.w; }, 0), acct = P.acct;
    H.pending = null;
    return { rows: rows, acct: acct, replace: Math.abs(sum - 100) < 0.05 || !D.mixes[acct].length };
  }
  /** Her rows from a helper card, on her tap: into the draft only; nothing is saved. */
  function applyRows(acct: string, rows: any[], replace: boolean) {
    if (!D.mixes[acct]) D.mixes[acct] = [];
    if (replace) D.mixes[acct] = rows.map(function (x: any) { return { t: x.t, w: num(x.w) }; });
    else rows.forEach(function (x: any) { setRow(acct, x.t, num(x.w)); });
    D.acct = acct; D.dirty = true;
    return "Done. Check them in your " + acct + ", change anything you like, then tap Use my mix when you’re ready.";
  }
  /** Use my mix: writes her target (custom, per account) into the state it is given; only on her tap. */
  function save(S: any) {
    var mixes: any = {}, union: any = {}, wsum = 0, meta: any = {};
    accounts().forEach(function (a: string) {
      if (!D.mixes[a].length) return;
      var rows = D.mixes[a].map(function (x: any) { return { t: x.t, w: Math.round(num(x.w) * 10) / 10 }; });
      var d = Math.round((100 - rows.reduce(function (s: number, x: any) { return s + x.w; }, 0)) * 10) / 10; if (d) rows.sort(function (x: any, y: any) { return y.w - x.w; })[0].w += d;
      mixes[a] = rows.map(function (x: any) { var s = sec(x.t) || {}; meta[x.t] = s; return { ticker: x.t, weight: x.w, name: s.name || x.t, price: s.cad || 0, kind: s.sleeve || "" }; });
      var share = perPay(a) > 0 ? perPay(a) : 1; wsum += share; rows.forEach(function (x: any) { union[x.t] = (union[x.t] || 0) + x.w * share; });
    });
    var mix = Object.keys(union).map(function (k) { var s = meta[k] || {}; return { ticker: k, weight: Math.round(union[k] / wsum * 10) / 10, name: s.name || k, price: s.cad || 0, kind: s.sleeve || "" }; });
    S.funds = S.funds || {}; S.prices = S.prices || {};
    Object.keys(meta).forEach(function (k) { var s = meta[k]; S.prices[k] = s.cad; S.funds[k] = { name: s.name, holds: s.holds, fee: s.fee ? "about " + s.fee : "", sleeve: s.sleeve, issuer: s.issuer, single: s.kind === "stock", usd: s.usd }; });
    S.target = Object.assign({}, S.target || {}, { id: "custom", name: "My mix", mixes: mixes, mix: mix, chosenBy: "client" });
    D.dirty = false;
    return COPY.confirm;
  }
  loadDraft();
  return {
    COPY: COPY, LIST: LIST, CATS: CATS, FX: FX,
    sec: sec, moves: moves, catName: catName, plainCat: plainCat, accounts: accounts, perPay: perPay,
    draft: function (): any { return D; }, reload: loadDraft, total: total, filled: filled, readyToSave: readyToSave, setRow: setRow,
    removeRow: function (a: string, t: string) { D.mixes[a] = D.mixes[a].filter(function (x: any) { return x.t !== t; }); D.dirty = true; },
    setAccount: function (a: string) { D.acct = a; },
    /** The helper's scripted reply: {handled, text?, facts?, four?, list?, listLabel?, browse?, askAcct?, ask?, rows?, acct?, replace?}. */
    helper: function (text: string) { H.turns.push({ role: "user", content: text }); return scripted(text); },
    /** After {ask: true} or a pick: the next neutral choice, or the rows card. */
    next: askNext,
    /** She picked a fund for a description from an A to Z choice. */
    pick: function (desc: string, t: string) { H.picked[String(desc).toLowerCase().trim()] = t; var P = H.pending; if (P) P.items.forEach(function (x: any) { if (!x.t && x.desc === desc) x.t = t; }); return askNext(); },
    /** She answered "Which account?": re-reads her earlier message with it. */
    account: function (a: string) { var t0 = (H.pendingText || "") + " in my " + a; H.pendingText = null; return scripted(t0); },
    applyRows: applyRows, save: save, bad: bad, RULES: RULES,
    listText: function () { return "THE LIST (A to Z): " + LIST.map(function (s: any) { return s.t + " " + s.name + " (" + plainCat(s) + (s.fee ? ", fee about " + s.fee : "") + "): " + s.holds; }).join("; ") + ". Her current draft: " + accounts().map(function (a: string) { return a + " " + (D.mixes[a].map(function (x: any) { return x.t + " " + x.w + "%"; }).join(", ") || "empty"); }).join("; ") + "."; }
  };
}
