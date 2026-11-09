/* The payday request and the order batch (R6). One request covers every goal (CR8 section 11); the orders buy
   whole units of her own target mix per account, within 99% of each account's amount, plus the short-term fund
   line for a goal kept in a fund. Pure builders return values; apply* functions write them into the state. */
import type { AccountKey, DemoState, Fund, GoalLine, Order, OrderLine, Portfolio } from "./types.ts";
import { cad0 } from "./money.ts";
import { goalAccounts, payingGoals } from "./goals.ts";
import { keepOpt } from "./keep.ts";
import { planPerPay } from "./plan.ts";
import { goalPortfolioFor, targetPortfolio, weightsOf } from "./portfolios.ts";

export interface PayRequest { lines: GoalLine[]; total: number }

/** Today's payday request: one line per paying goal, with its account split and the fund it buys, if any. */
export function payRequest(s: DemoState): PayRequest {
  const lines: GoalLine[] = payingGoals(s).map((g) => {
    const kv = !g.invested && g.keepIn ? keepOpt(g.keepIn) : null;
    const sp = g.invested ? goalAccounts(s, g) : null, multi = !!sp && sp.length > 1;
    const label = multi ? g.name + " · " + sp!.map((x) => x.account + " " + cad0(x.amount)).join(" + ")
      : g.name + (kv && kv.fund ? " · TFSA · Savings fund" : " · " + (g.account || "TFSA") + (!g.invested ? " · cash (uninvested)" : ""));
    return { goal: g.id, label, amount: Number(g.perPay) || 0, account: g.account || "TFSA", split: multi ? sp : null, cash: !g.invested && !(kv && kv.fund), vehicle: kv && kv.fund ? kv.fund : null };
  });
  return { lines, total: lines.reduce((t, l) => t + l.amount, 0) };
}

/** Keeps today's waiting request in step with her goals (adding or changing a goal updates it). Mutates; true when it changed. */
export function applyRefreshRequest(s: DemoState): boolean {
  const B = s.pendingBatch;
  if (!B || (B.status !== "pending" && B.status !== "empty")) return false;
  if (B.status === "empty") B.status = "pending";
  const R = payRequest(s), sig = (L: GoalLine[]): string => L.map((l) => l.goal + ":" + l.amount + ":" + l.label + ":" + (l.vehicle ? l.vehicle.ticker : "")).join(",");
  const before = sig(B.goalLines || []);
  const lines = R.lines.map((l) => {
    const old = (B.goalLines || []).find((x) => x.goal === l.goal);
    const keepNew = !!l.split || !!(old && old.split) || !!l.vehicle !== !!(old && old.vehicle);
    return { ...(old || {}), ...l, label: keepNew ? l.label : (old && old.label) || l.label };
  });
  if (before === sig(lines)) return false;
  B.goalLines = lines; B.arrived = R.total; B.title = "Send " + cad0(R.total) + " to your goals this payday";
  if (!lines.length) B.status = "empty";
  return true;
}

export interface Batch {
  orders: Order[]; total: number; invest: number; leftover: number;
  /** Prices and fund names the batch used that the state's tables lack (her own mix, a short-term fund). */
  pricesAdded: Record<string, number>; fundsAdded: Record<string, { name: string; holds: string; fee: string; sleeve: string }>;
  portfolioName: string | null;
}

const ACCTS: AccountKey[] = ["TFSA", "FHSA", "RRSP"];

/** Builds today's orders from her plan and target, without writing anything. */
export function buildBatch(s: DemoState): Batch {
  const t = s.target || {}, pf: Portfolio | null = targetPortfolio(s);
  const empty: Batch = { orders: [], total: 0, invest: 0, leftover: 0, pricesAdded: {}, fundsAdded: {}, portfolioName: pf ? pf.name : null };
  if (!pf) return empty;
  const px: Record<string, number> = { ...(s.prices || {}) }, pricesAdded: Batch["pricesAdded"] = {}, fundsAdded: Batch["fundsAdded"] = {};
  (t.mix || []).forEach((m) => { if (m.price) { px[m.ticker] = m.price; pricesAdded[m.ticker] = m.price; } if (!(s.funds || {})[m.ticker]) fundsAdded[m.ticker] = { name: m.name || m.ticker, holds: m.name || m.ticker, fee: "", sleeve: m.kind || "" }; });
  const W0 = weightsOf(pf);
  if (!Object.keys(W0).length) return { ...empty, pricesAdded, fundsAdded };
  const per = planPerPay(s).perPay;
  let total = 0;
  /* CR11 s12: her own mix is per account; a goal with its own portfolio sets its main account's mix (Directive 18:25) */
  const wFor = (k: string): Record<string, number> => {
    const gpw = goalPortfolioFor(s, k); if (gpw) return gpw;
    if (!(t.id === "custom" && t.mixes)) return W0;
    const o: Record<string, number> = {}; (t.mixes[k] || []).forEach((m) => { o[m.ticker] = (Number(m.weight) || 0) / 100; }); return o;
  };
  let orders: Order[] = ACCTS.filter((k) => per[k] > 0).map((k) => {
    const W = wFor(k), amt = per[k], budget = amt * 0.99, u: Record<string, number> = {};
    let spent = 0;
    Object.keys(W).forEach((tk) => { u[tk] = Math.floor(amt * W[tk]! / px[tk]!); spent += u[tk]! * px[tk]!; });
    for (let guard = 0; guard < 200; guard++) {
      const cands = Object.keys(W).filter((tk) => W[tk]! > 0 && spent + px[tk]! <= budget);
      if (!cands.length) break;
      const tot = spent + 1e-9;
      cands.sort((a, b) => (u[a]! * px[a]! / tot - W[a]!) - (u[b]! * px[b]! / tot - W[b]!));
      u[cands[0]!]!++; spent += px[cands[0]!]!;
    }
    const lines: OrderLine[] = Object.keys(W).filter((tk) => u[tk]! > 0).map((tk) => ({ side: "buy" as const, ticker: tk, units: u[tk]!, price: px[tk]!, amount: Math.round(u[tk]! * px[tk]! * 100) / 100 }));
    const ot = Math.round(lines.reduce((t2, l) => t2 + l.amount, 0) * 100) / 100; total += ot;
    return { account: k, lines, total: ot };
  });
  orders = orders.filter((o) => o.lines.length);
  /* CR8 s6: a short-term goal kept in a fund buys that fund in her TFSA, inside the same request */
  let vInv = 0;
  payRequest(s).lines.forEach((l) => {
    if (!l.vehicle) return;
    const f: Fund = l.vehicle, units = Math.floor(l.amount / f.price); if (units < 1) return;
    const amt = Math.round(units * f.price * 100) / 100;
    let o = orders.find((x) => x.account === "TFSA");
    if (!o) { o = { account: "TFSA", lines: [], total: 0 }; orders.push(o); }
    o.lines.push({ side: "buy", ticker: f.ticker, units, price: f.price, amount: amt, goal: l.goal });
    o.total = Math.round(((o.total || 0) + amt) * 100) / 100; total += amt; vInv += l.amount;
    if (px[f.ticker] !== f.price) pricesAdded[f.ticker] = f.price;
    px[f.ticker] = f.price;
    if (!(s.funds || {})[f.ticker]) fundsAdded[f.ticker] = { name: f.name, holds: f.name, fee: f.fee || "", sleeve: "cash" };
  });
  const invest = ACCTS.reduce((t3, k) => t3 + (per[k] || 0), 0) + vInv, tot2 = Math.round(total * 100) / 100;
  return { orders, total: tot2, invest, leftover: Math.round((invest - tot2) * 100) / 100, pricesAdded, fundsAdded, portfolioName: pf.name };
}

/** Writes the batch into today's waiting request (only while it is pending) and names her target everywhere. Mutates. */
export function applyBatch(s: DemoState): Batch | null {
  const b = buildBatch(s), t = s.target || {};
  if (b.portfolioName) {
    t.name = b.portfolioName;
    s.accounts.forEach((a) => { if (a.provider === "Questrade") { a.portfolio = b.portfolioName!; a.sub = "Questrade · " + b.portfolioName; } });
  }
  const B = s.pendingBatch;
  if (!B || B.status !== "pending" || !b.portfolioName) return null;
  s.prices = { ...(s.prices || {}), ...b.pricesAdded };
  s.funds = { ...(s.funds || {}), ...b.fundsAdded };
  B.orders = b.orders; B.total = b.total; B.invest = b.invest; B.leftover = b.leftover;
  return b;
}

/** "Also move what's already invested" (Directive 18:25 item 4): net sells and buys per account to reach a portfolio's mix, whole units. */
export function moveOrders(s: DemoState, p: Portfolio): { account: string; sells: OrderLine[]; buys: OrderLine[]; value: number }[] {
  const W = weightsOf(p), px: Record<string, number> = { ...(s.prices || {}) };
  return s.accounts.filter((a) => a.provider === "Questrade").map((a) => {
    const have: Record<string, number> = {};
    (a.holdings || []).forEach((h) => { have[h.ticker] = (have[h.ticker] || 0) + (h.units || 0); if (!px[h.ticker]) px[h.ticker] = h.price || 0; });
    const val = Object.keys(have).reduce((t, tk) => t + have[tk]! * (px[tk] || 0), 0);
    const tks = Object.keys(have).concat(Object.keys(W)).filter((x, i, arr) => arr.indexOf(x) === i);
    const sells: OrderLine[] = [], buys: OrderLine[] = [];
    tks.forEach((tk) => {
      const want = px[tk] ? Math.floor(val * (W[tk] || 0) / px[tk]!) : 0, d = want - (have[tk] || 0);
      if (d < 0) sells.push({ side: "sell", ticker: tk, units: -d, price: px[tk] || 0, amount: Math.round(-d * px[tk]! * 100) / 100 });
      else if (d > 0) buys.push({ side: "buy", ticker: tk, units: d, price: px[tk] || 0, amount: Math.round(d * px[tk]! * 100) / 100 });
    });
    return { account: a.type || a.id, sells, buys, value: sells.reduce((t, x) => t + x.amount, 0) };
  }).filter((o) => o.sells.length || o.buys.length);
}
