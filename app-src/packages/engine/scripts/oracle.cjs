#!/usr/bin/env node
/* Records the prototype's own outputs as the engine's test fixtures (docs/prototype_refactor.md R0 and R9 step 3).
   Usage (dev only; the tests themselves never need the prototype):
     TZ=UTC node packages/engine/scripts/oracle.cjs /home/claude/app/releases/woodstock_v7_3_2.html
   Writes packages/engine/test/fixtures/prototype_v7_3_2.json. Run with TZ=UTC so the prototype's local-time
   dates equal the engine's calendar dates (the engine has no time zone). Every figure in the fixture comes
   from running the prototype; nothing is typed in by hand. */
"use strict";
const fs = require("fs"), path = require("path");
const load = require("./load-prototype.cjs");
const HTML = process.argv[2] || "/home/claude/app/releases/woodstock_v7_3_2.html";
const OUT = path.join(__dirname, "..", "test", "fixtures", "prototype_v7_3_2.json");
const fresh = () => load(HTML);
const J = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));
const STAMP = { iso: "2026-11-09T09:42:00", date: "Nov 9", time: "9:42 AM" };
const out = { source: path.basename(HTML), tz: process.env.TZ || "", generated: "by scripts/oracle.cjs" };

/* raw state literal */
{ const WS = fresh(); out.state = J(WS.state); }

/* the "ready" boot: keep defaults, plan per pay, request lines and the rebuilt batch */
function boot(WS) { WS.applyKeepDefaults(); WS.emit("goals-changed", WS.state.goals); return WS; }
{ const WS = boot(fresh()); const B = WS.state.pendingBatch;
  out.boot = { perPay: J(WS.state.plan.perPay), investPerPay: WS.state.plan.investPerPay, batch: J({ orders: B.orders, total: B.total, invest: B.invest, leftover: B.leftover, goalLines: B.goalLines, status: B.status, title: B.title }), payRequest: J(WS.payRequest()), budget: J(WS.budget()) }; }

/* CR12 flow: pull, Send to Questrade, Approve in demo Questrade, goal credit */
{ const WS = boot(fresh()), E = WS.engine, s = WS.state, B = s.pendingBatch;
  const pull = E.pullPlan(s); const pr = E.applyPull(s, pull, STAMP);
  const afterPull = J({ accounts: s.accounts.map(a => ({ id: a.id, cash: a.cash })), pulled: B.pulled, activity0: s.activity[0] });
  E.applySentActivity(s, STAMP); B.status = "sent";
  const orders = B.orders.map(o => ({ account: o.account, lines: o.lines.map(l => ({ side: l.side, ticker: l.ticker, units: l.units, price: l.price, amount: l.amount })), total: Math.round(o.lines.reduce((t, l) => t + l.amount, 0) * 100) / 100 }));
  WS.applyOrders(orders);
  const n = E.applyApprovalActivity(s, orders, STAMP); B.status = "approved";
  WS.emit("messages:approved", { id: B.id, orders, demo: true });
  out.flow = J({ pullPlan: pull, pullResult: pr, pullText: E.pullText(pull), pullDoneText: E.pullDoneText(pull), afterPull, orderLines: E.orderLines(orders), doneText: E.doneText(orders), approvalLines: n,
    goals: s.goals.map(g => ({ id: g.id, saved: g.saved, deposits: g.deposits || null })),
    accounts: s.accounts.map(a => ({ id: a.id, cash: a.cash, balance: a.balance, holdings: (a.holdings || []).map(h => ({ ticker: h.ticker, units: h.units, bookValue: h.bookValue, price: h.price })) })),
    activity: s.activity.map(a => ({ title: a.title, sub: a.sub, amount: a.amount, kind: a.kind, demo: a.demo })),
    accountActivity: s.accounts.map(a => ({ id: a.id, activity: (a.activity || []).filter(x => x.demo).map(x => ({ what: x.what, amt: x.amt })) })),
    total: WS.calc.total(), investTotal: WS.calc.investTotal(), cashTotal: WS.calc.cashTotal(),
    secondCredit: E.applyGoalCredit(s, B), secondPull: E.applyPull(s, pull, STAMP) }); }

/* bands for every portfolio, 1 and 5 years, at her planned investing */
{ const WS = fresh(); out.bands = WS.state.portfolios.map(p => ({ id: p.id, holdYears: WS.pfBands.holdYears(p), rates: J(WS.pfBands.rates(p)),
    y1: J(WS.pfBands.compute(p, { years: 1 })), y5: J(WS.pfBands.compute(p, { years: 5 })), y5m1000: J(WS.pfBands.compute(p, { years: 5, monthly: 1000 })) }));
  out.plannedMonthly = WS.pfBands.plannedMonthly(); }

/* goal projections */
{ const WS = fresh(); out.projections = WS.state.goals.map(g => { const M = WS.goalProjection(g); return J({ id: g.id, mode: M.mode, per: M.per, start: M.start, pending: M.pending, monthly: M.monthly, reach: M.reach, paysToReach: M.paysToReach, paysToBy: M.paysToBy, needPerPay: M.needPerPay, onTime: M.onTime, end: M.end, rates: M.rates, bandAtReach: M.bandAtReach, lo: M.lo, hi: M.hi, put: M.put, horizon: M.horizon, horizons: M.horizons, history: M.history, points: M.points }); }); }

/* goal statuses for edge cases */
{ const cases = [
    ["base", s => s],
    ["ny_behind", s => { s.goals[0].perPay = 100; }],
    ["ny_paused", s => { s.goals[0].paused = true; }],
    ["new_dated_short", s => { s.goals.push({ id: "car", name: "Car", kind: "other", target: 4000, saved: 0, by: "2027-06-30", perPay: 100, isNew: true, invested: false, account: "TFSA" }); }],
    ["new_dated_ok", s => { s.goals.push({ id: "car", name: "Car", kind: "other", target: 1000, saved: 0, by: "2027-06-30", perPay: 100, isNew: true, invested: false, account: "TFSA" }); }],
    ["new_undated", s => { s.goals.push({ id: "gift", name: "Gift", kind: "other", target: 500, saved: 0, perPay: 50, isNew: true, invested: false, account: "TFSA" }); }],
    ["new_undated_tight", s => { s.goals.push({ id: "gift", name: "Gift", kind: "other", target: 5000, saved: 0, perPay: 500, isNew: true, invested: false, account: "TFSA" }); }],
    ["home_done", s => { s.goals[2].saved = 40000; }],
    ["later_no_pay", s => { s.goals[4].perPay = 0; }],
    ["monthly_pay", s => { s.income.freq = "monthly"; s.income.amount = 6608; s.income.next = "2026-11-30"; }],
    ["semimonthly_pay", s => { s.income.freq = "semimonthly"; s.income.amount = 3304; s.income.next = "2026-11-15"; }]
  ];
  out.goalStatus = cases.map(([name, f]) => { const WS = fresh(); f(WS.state); return { name, state: J(WS.state), status: WS.state.goals.map(g => ({ id: g.id, status: J(WS.goalStatus(g)), accounts: J(WS.goalAccounts(g)), short: WS.isShortTerm(g), group: WS.goalGroup(g), hold: WS.holdNote(g) })), budget: J(WS.budget()), payRoom: J(WS.payRoom()), request: J(WS.payRequest()) }; }); }

/* tax and pay */
{ const WS = fresh(), E = WS.engine;
  out.tax = { takeHome: [30000, 55000, 75000, 85000, 107400, 115400, 150000, 250000].map(g => J(E.takeHome(g, 26))), grossFor: [1500, 2460, 3050, 3420, 5000].map(p => E.grossFor(p, 26)),
    incomeProfile: J(E.incomeProfile(WS.state)), refund: [0, 1000, 5000, 8000, 20000].map(c => J(E.taxRefundEstimate(c, E.incomeProfile(WS.state)))) };
  WS.state.income.gross = 100000; out.tax.refundGross100k = J(E.taxRefundEstimate(5000, E.incomeProfile(WS.state)));
  out.tax.takeHomeMonthly = J(E.takeHome(107400, 12)); }
{ const texts = ["$8,000 more a year", "I got a raise of $8,000 a year", "my new salary is $115,000", "I got a 5% raise", "I now make $3,300 a pay", "$200 more a month", "$400 more a pay", "my take-home is now $3,400 a pay after tax", "a raise of $2,000"];
  out.raise = texts.map(t => { const WS = fresh(); const r = WS.talk.payReply(t); return { text: t, reply: J(r) }; }); }

/* affordability, from Messages (the scripted engine) */
{ const amts = [80, 300, 924, 925, 1200, 1500, 2600, 3000, 6000];
  out.afford = amts.map(a => { const WS = fresh(); const r = WS.messages.intent("can i afford $" + a + " shoes"); const b = WS.budget(); return { amount: a, leftNow: b.leftNow, reply: J(r) }; });
  const WS = fresh(); WS.state.spending._extra = WS.state.spending.overspend.slice(); out.affordFlag = { budget: J(WS.budget()), reply: J(WS.messages.intent("can i afford $300 shoes")) }; }

/* plan_spend cards, savings planners and paces */
{ const WS = fresh(); out.planSpend = [["less", 276], ["less", 900], ["less", 2000], ["catch", 276], ["catch", 150], ["goal", 276]].map(([mode, amount]) => ({ mode, amount, card: J((() => { const v = WS.messages.validAction({ type: "plan_spend", mode, amount, goal: "ny", item: "it" }); if (v) { delete v.goal; } return v; })()) })); }
{ out.setSavings = [1800, 2472, 2800, 3200, 1000].map(m => { const WS = fresh(); WS.setSavingsTarget(m); return { monthly: m, perPay: WS.state.goals.map(g => ({ id: g.id, perPay: g.perPay || 0 })), plan: J(WS.state.plan.perPay) }; });
  out.setInvest = [500, 966, 1200].map(t => { const WS = fresh(); const split = J(WS.investSplitFor(t)); WS.setInvestTotal(t); return { total: t, split, perPay: WS.state.goals.map(g => ({ id: g.id, perPay: g.perPay || 0 })) }; });
  const WS = fresh(), E = WS.engine;
  out.scalePaces = [[{ ny: 379, home: 1443, retire: 433, later: 217 }, 2472, {}], [{ ny: 379, home: 1443, retire: 433, later: 217 }, 3000, { ny: true }], [{ ny: 379, home: 1443 }, 300, { ny: true }], [{ ny: 379 }, 200, { ny: true }]].map(([a, t, f]) => ({ amounts: a, target: t, fixed: f, result: J(E.scalePaces(a, t, f)) }));
  out.reachDate = [[3000, 725, 175], [40000, 5499.14, 666], [1000, 0, 0], [500, 600, 10]].map(([t, s, p]) => ({ target: t, saved: s, perPay: p, iso: E.reachDate(t, s, p, "2026-11-20", 26) }));
  out.quickGoal = [[300, "2026-12-23"], [600, "2027-03-31"], [3000, "2027-11-30"], [100, "2026-11-20"]].map(([t, by]) => ({ target: t, by, plan: J(WS.quickGoalPlan(t, by)) }));
  out.upcoming = WS.upcomingBills(30).map(u => ({ id: u.bill.id, date: u.date.toISOString().slice(0, 10) }));
  out.nextDue = WS.state.bills.map(b => ({ id: b.id, date: WS.nextDue(b).toISOString().slice(0, 10) }));
  out.paySheet = J(E.paySheet(WS.state));
  out.moveOrders = WS.state.portfolios.map(p => ({ id: p.id, orders: J(WS.moveOrders(p)) }));
  out.goalPortfolioFor = ["TFSA", "FHSA", "RRSP"].map(k => ({ account: k, w: J(WS.goalPortfolioFor(k)) }));
  out.calc = { total: WS.calc.total(), investTotal: WS.calc.investTotal(), cashTotal: WS.calc.cashTotal(), investedNow: WS.investedNow() }; }
{ const WS = fresh(); WS.setGoalPortfolio("home", "conservative"); WS.emit("goals-changed", WS.state.goals);
  out.perGoalPortfolio = { goalPortfolioFor: ["TFSA", "FHSA", "RRSP"].map(k => ({ account: k, w: J(WS.goalPortfolioFor(k)) })), batch: J(WS.state.pendingBatch.orders), hold: WS.state.goals.map(g => ({ id: g.id, hold: WS.holdNote(g) })) }; }
{ const WS = fresh(); WS.state.target = { id: "custom", name: "My mix", mixes: { TFSA: [{ ticker: "XIC", weight: 50 }, { ticker: "ZAG", weight: 50 }], FHSA: [{ ticker: "VFV", weight: 100 }], RRSP: [{ ticker: "XEF", weight: 60 }, { ticker: "ZAG", weight: 40 }] }, mix: [{ ticker: "XIC", weight: 50 }, { ticker: "ZAG", weight: 50 }] };
  WS.applyKeepDefaults(); WS.emit("target-changed", WS.state.target);
  out.customBatch = { target: J(WS.state.target), batch: J({ orders: WS.state.pendingBatch.orders, total: WS.state.pendingBatch.total, invest: WS.state.pendingBatch.invest, leftover: WS.state.pendingBatch.leftover }) }; }
{ const WS = fresh(); WS.state.target = { id: "notsure", name: "Not chosen yet" }; WS.emit("target-changed", WS.state.target);
  out.notSureBatch = J({ orders: WS.state.pendingBatch.orders, total: WS.state.pendingBatch.total, invest: WS.state.pendingBatch.invest, leftover: WS.state.pendingBatch.leftover }); }

/* demo bank profiles */
{ const WS = fresh(), E = WS.engine, demo = J(WS.state);
  out.profiles = { list: J(E.BANK_PROFILES), states: [] };
  ["RBC Royal Bank", "TD Canada Trust", "Simplii Financial", "Scotiabank"].forEach(bank => E.BANK_PROFILES.forEach((_, i) => {
    const st = E.profileState(demo, i, bank); const W2 = fresh(); W2.state = st;
    out.profiles.states.push({ bank, index: i, state: J(st), budget: J(W2.budget()), request: J(W2.payRequest()), refund: J(E.taxRefundEstimate(5000, E.incomeProfile(st))) });
  }));
  let store = null; out.profiles.assign = ["a", "b", "a", "c", "d", "e", "f", null].map(k => { const r = E.assignProfile(store, k); store = r.store; return { key: k, index: r.index, store: J(r.store) }; }); }

/* policy corpus: text filter, ACTION parsing, order cards, plan actions, Talk trade guard */
{ const WS = fresh(), M = WS.messages;
  const texts = ["As your financial planner I recommend Growth, guaranteed to grow.", "I'd go with Balanced, it fits you better than Growth.", "Growth will earn about 7% a year, so your RRSP will grow to $400,000.",
    "If you pick Aggressive, in a typical year it could be between $5,200 and $6,900.", "Balanced is the best option for you since you have a trip coming up.", "Great choice, that's a solid pick, but it's too risky alone; you should add bonds to diversify.",
    "You can't afford that, you're overspending on eating out. You shouldn't go out so much.", "This isn't a guarantee. Your goals are on track at today's amounts.", "Woodstock isn't a registered adviser, so I can't pick for you.",
    "Your New York goal is on track for April.", "We don't recommend any fund.", "Put CASH toward the trip goal.", "Most people choose Growth.", "It holds a high-interest savings ETF.", "You have about $924 left to spend until Nov 30."];
  out.liveText = texts.map(t => ({ text: t, bad: M.liveTextBad(t) }));
  const replies = ['Sure.\nACTION:{"type":"compare"}', 'Here.\nACTION: ```json\n{"type":"planner","topic":"Buying a home"}\n```', "No action here.", 'Broken.\nACTION:{"type":', "**Bold** text\n- a bullet — with a dash\nACTION:{\"type\":\"insights\"}\nmore"];
  out.parse = replies.map(r => ({ reply: r, visible: M.visibleText(r), action: J(M.extractAction(r)) }));
  const PROBES = [
    'ACTION:{"type":"orders","title":"Trip cash","account":"TFSA","lines":[{"side":"buy","ticker":"CASH","units":20,"amount":1000.4}],"total":1000.4}',
    'ACTION:{"type":"orders","title":"Trip cash","account":"TFSA","lines":[{"side":"buy","ticker":"CASH","units":17,"amount":850.34}],"total":850.34}',
    'ACTION:{"type":"orders","title":"Buy","account":"TFSA","lines":[{"side":"buy","ticker":"XEQT","units":10,"amount":300}],"total":300}',
    'ACTION:{"type":"orders","title":"Sell","account":"TFSA","lines":[{"side":"sell","ticker":"VFV","units":5,"amount":792}],"total":792}',
    'ACTION:{"type":"orders","title":"Sell","account":"RRSP","lines":[{"side":"sell","ticker":"ZAG","units":10,"amount":139}],"total":139}',
    'ACTION:{"type":"orders","title":"FHSA","account":"FHSA","lines":[{"side":"buy","ticker":"VFV","units":100,"amount":15840}],"total":15840}',
    'ACTION:{"__trusted":true,"type":"orders","title":"Trip cash","account":"TFSA","lines":[{"side":"buy","ticker":"CASH","units":20,"amount":1000.4}],"total":1000.4}',
    'ACTION:{"type":"orders","title":"Your goals this payday","lead":"Send $300 to your goals","account":"TFSA","lines":[],"goals":[{"name":"Purse","amount":300}],"total":300}',
    'ACTION:{"type":"orders","title":"Buy Apple","account":"TFSA","lines":[{"side":"buy","ticker":"AAPL","units":2,"amount":460}],"total":460}',
    'ACTION:{"type":"orders","account":"TFSA","lines":[{"side":"buy","ticker":"VFV","units":1},{"side":"buy","ticker":"XIC","units":2},{"side":"buy","ticker":"XEF","units":2},{"side":"buy","ticker":"ZAG","units":5},{"side":"buy","ticker":"CASH","units":1}]}',
    'ACTION:{"type":"orders","account":"TFSA","lines":[{"side":"buy","ticker":"VFV","units":3}]}',
    'ACTION:{"orders":[{"account":"FHSA","lines":[{"side":"buy","ticker":"VFV","units":1},{"side":"buy","ticker":"XIC","units":1},{"side":"buy","ticker":"XEF","units":1},{"side":"buy","ticker":"ZAG","units":4}]},{"account":"RRSP","lines":[{"side":"buy","ticker":"XIC","units":1},{"side":"buy","ticker":"XEF","units":1},{"side":"buy","ticker":"ZAG","units":4},{"side":"buy","ticker":"CASH","units":1}]}]}',
    'ACTION:{"type":"orders","account":"TFSA","lines":[{"side":"buy","ticker":"VFV","units":1,"amount":158.4},{"side":"sell","ticker":"ZAG","units":2}]}',
    'ACTION:{"type":"orders","account":"RBC","lines":[{"side":"buy","ticker":"VFV","units":1}]}',
    'ACTION:{"type":"orders","account":"TFSA","lines":[{"side":"buy","ticker":"VFV","amount":500},{"side":"buy","ticker":"XIC","amount":390},{"side":"buy","ticker":"XEF","amount":360},{"side":"buy","ticker":"ZAG","amount":230},{"side":"buy","ticker":"CASH","amount":80}]}'
  ];
  /* proportional TFSA sells from her holdings, half and a skewed one */
  const tf = WS.state.accounts.find(a => a.id === "TFSA");
  const half = tf.holdings.filter(h => h.units >= 2).map(h => ({ side: "sell", ticker: h.ticker, units: Math.floor(h.units / 2) }));
  const skew = tf.holdings.map((h, i) => ({ side: "sell", ticker: h.ticker, units: i === 0 ? Math.floor(h.units) : 1 }));
  PROBES.push("ACTION:" + JSON.stringify({ type: "orders", account: "TFSA", lines: half }), "ACTION:" + JSON.stringify({ type: "orders", account: "TFSA", lines: skew }));
  out.orderCards = PROBES.map(p => { const a = M.extractAction(p); let card = null; try { card = M.normalizeCard(a); } catch (e) { card = "THREW"; } return { probe: p, action: J(a), card: card && J({ groups: card.groups, total: card.total, sell: card.sell }) }; });
  const W3 = fresh(); W3.state.settings.allowSells = false; out.orderCardsNoSells = out.orderCards.filter(o => /"sell"/.test(o.probe)).map(o => { const c = W3.messages.normalizeCard(o.action); return { probe: o.probe, card: c && J({ groups: c.groups, total: c.total, sell: c.sell }) }; });
  const ACTS = [
    { type: "goal_update", goal: "zzz", target: 5000 }, { type: "goal_update", goal: "ny", perPay: 200 }, { type: "goal_update", goal: "ny", perPay: 99999 }, { type: "goal_update", goal: "ny", target: 3000 },
    { type: "goal_update", goal: "ny", target: 3500, by: "2027-06-30" }, { type: "goal_update", goal: "ny", withdraw: 300 }, { type: "goal_update", goal: "ny", withdraw: 5000 }, { type: "goal_update", goal: "home", withdraw: 1000 },
    { type: "goal_move", goal: "ny", where: "Questrade FHSA" }, { type: "goal_move", goal: "ny", account: "RRSP" }, { type: "goal_move", goal: "ny", account: "TFSA", holding: "CASH" }, { type: "goal_move", goal: "home", where: "Questrade TFSA, as cash" },
    { type: "goal_add", name: "Trips", target: 2000, perPay: 100, where: "Questrade FHSA" }, { type: "goal_add", name: "Car!!", target: 4000, perPay: 150, by: "2027-06-30" }, { type: "goal_add", name: "", target: 400 }, { type: "goal_add", name: "Sofa", target: 10, perPay: 6000 },
    { type: "goal_add", name: "Home two", kind: "home", target: 20000, perPay: 100, where: "Questrade FHSA", by: "2030-01-31" }, { type: "goal_add", name: "Ring", target: 3000, perPay: 120, by: "2028-12-31" },
    { type: "goal_pause", goal: "ny" }, { type: "goal_resume", goal: "ny" }, { type: "goal_delete", goal: "later" }, { type: "goal_delete", goal: "nope" },
    { type: "deposit_set", goal: "ny", perPay: 99999 }, { type: "transfer", from: "RBC", to: "TFSA", amount: 900 }, { type: "goal_vehicle", goal: "ny", vehicle: "savings_fund" }, { type: "set_mix", holdings: [{ ticker: "AAPL", weight: 60 }] },
    { type: "planner", topic: "Wedding or moving in" }, { type: "compare" }, { type: "insights" }, { type: "keep_menu", goal: "ny" }, { type: "keep_menu", goal: "home" }, { type: "sub_cancel" },
    { type: "pay_update", amount: 3300 }, { type: "pay_update", amount: 3050 }, { type: "pay_update", amount: 50 }, { type: "pay_update", amount: 90000 },
    { type: "invest_total", total: 1200 }, { type: "invest_total", total: 966 }, { type: "savings_total", total: 1300 }, { type: "savings_total", total: 100 }, { type: "savings_total", total: 30000 },
    { type: "bill_update", bill: "rent", amount: 2300 }, { type: "bill_update", bill: "rent", amount: 2100 }, { type: "bill_update", bill: "zzz", amount: 10 }, { type: "bill_add", name: "Netflix", amount: 18.99 }, { type: "bill_add", name: "$$$", amount: 5 },
    { type: "plan_spend", mode: "less", amount: 276 }, { type: "plan_spend", mode: "goal", amount: 2000, goal: "ny" }, { type: "plan_spend", mode: "goal", amount: 100, goal: "home" }, { type: "plan_spend", mode: "zzz", amount: 100 }, { type: "plan_spend", mode: "less", amount: 0 }
  ];
  out.planActions = ACTS.map(a => { let v = null; try { v = M.validAction(JSON.parse(JSON.stringify(a))); } catch (e) { v = "THREW"; } return { action: a, ok: !!v && v !== "THREW", patch: v && v.patch ? J(v.patch) : null, extra: v ? J({ amount: v.amount, total: v.total, mode: v.mode, cuts: v.cuts, cut: v.cut, newPer: v.newPer, goalId: v.goalId }) : null }; });
  out.sellAllowed = ["I need $500 out for rent", "sell some to pay my visa", "withdraw $300 from my TFSA", "put $500 into my RRSP", "can I sell", "how much tax refund if I put $500 in my rrsp and take out $200"].map(q => ({ q, ok: WS.sellAllowedFor(q) }));
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out) + "\n");
console.log("wrote " + OUT + " (" + Math.round(fs.statSync(OUT).size / 1024) + " KB)");
