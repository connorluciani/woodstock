/* Validators and the guardrail policy (R9; production_plan 6.1 and 6.2). Pure functions with explicit inputs:
   the phone runs them for instant feedback and the server runs them again, and the server's result is final.
   The guardrails the app must call:
     1. No buy or sell from Talk:            talkActionAllowed, talkSafeReply
     2. Orders only with her approval:        requireApproval (used by every money-moving step in flows.ts)
     3. The FHSA cap:                         checkFhsaCap (and goalAccounts, which never plans past it)
     4. Room limits:                          checkRoom (inside checkOrderPolicy for every buy)
     5. Her own mix:                          validateOwnMix (Build my own) and checkOwnMix (orders follow her mix)
   plus the text filter (liveTextBad), the ACTION parser, normalizeCard, plan-action validation, the affordability
   rule (no trade from an affordability answer) and the sell rule (sells only when she asks to take money out). */
import type { AccountKey, Ctx, DemoState, Goal, MixLine, OrderLine } from "./types.ts";
import { num } from "./money.ts";
import { labelBy, parseDate, today, DAY_MS } from "./dates.ts";
import { account, heldUnits, priceOf } from "./accounts.ts";
import { KEEP, isShortTerm } from "./keep.ts";
import { findGoal, fhsaPerPayCap } from "./goals.ts";
import { budget, investSplitFor } from "./plan.ts";
import { planSpendCatch, planSpendFromGoal, planSpendLess } from "./affordability.ts";
import { paysUntil } from "./schedule.ts";
import { targetPortfolio } from "./portfolios.ts";

export const POLICY_VERSION = "policy-2026.11.1";
export type GuardResult = { ok: true } | { ok: false; code: string };
const OK: GuardResult = { ok: true };
const NO = (code: string): GuardResult => ({ ok: false, code });

/* ======================= text policy ======================= */

/** Live-reply post-filter: protected titles, recommendations, guarantees, return promises, fund-for-goal talk, shaming. */
export const BANNED_LIVE: readonly RegExp[] = [
  /financial\s+planner/i, /financial\s+advis/i, /wealth manag/i, /\b(I|we) (would )?recommend/i, /\brecommended for you/i,
  /people like you/i, /(^|[^t] )guarantee(d|s)?\b/i, /\bcash (fund|etf)\b/i, /high[- ]interest savings (fund|etf)/i, /best (portfolio|fund) for you/i,
  /\bI'?d (go with|pick|choose)\b/i, /\b(fits|suits) you\b/i, /\bright for you\b/i, /people your age/i, /most people (choose|pick|go)/i,
  /\bwill (earn|return|grow to)\b/i, /\byou('ll| will) (make|earn)\b/i, /\d+(\.\d+)? ?% (a|per) year/i, /nothing to worry about/i,
  /\b(CASH|ZAG|XIC|XEF|VFV)\b[^.]{0,40}\b(for|toward) (the|your) (trip|goal|wedding|car|house|home)\b/i,
  /could be between/i, /best (option|choice|pick|place) for you/i, /great (choice|pick)/i, /solid (pick|choice)/i, /too risky/i, /you should (add|buy|sell|hold|switch|diversify)/i, /\bdiversif/i,
  /you can'?t afford/i, /\boverspend/i, /over budget/i, /you shouldn'?t/i, /cut back/i, /\bsplurge/i, /treat yourself/i, /bad habit/i, /we('ll| will) put it in/i, /we keep short-term goals in/i, /\bsafest\b/i,
  /\b(I|we) (put|moved|placed|kept)\b[^.]{0,40}\b(savings fund|savings etf|money market|GIC|short[- ]term bond)/i
];
export const AFFORD_RE = /\b(afford|am i (still )?(ok|okay)|can i (buy|get|spend))\b/i;

/** True when a reply must not be shown (it falls back to the scripted reply). Negated disclaimers are allowed. */
export function liveTextBad(t: string): boolean {
  let s = String(t || "");
  if (/\b(not|no|never|can't|cannot|isn't|doesn't|won't) (a |any )?(guarantee|recommend)/i.test(s)) s = s.replace(/\b(not|no|never|can't|cannot|isn't|doesn't|won't) (a |any )?(guarantee\w*|recommend\w*)/gi, "");
  if (/woodstock (is not|isn't) a registered adviser/i.test(s)) s = s.replace(/woodstock (is not|isn't) a registered adviser/gi, "");
  return BANNED_LIVE.some((r) => r.test(s));
}
/** Em and en dashes become commas (house style: no dashes). */
export function stripDashes(s: unknown): string { return String(s == null ? "" : s).replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ","); }
/** Plain text: no markdown emphasis, headings or bullets, no dashes. */
export function plainify(s: unknown): string { return stripDashes(String(s || "").replace(/\*\*?|__|^#+\s*/gm, "").replace(/^\s*[-•]\s+/gm, "")); }
/** The part of a model reply that is shown: everything before the ACTION line. */
export function visibleText(t: string): string {
  const lines = String(t || "").split("\n"), out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i]!, trimmed = L.replace(/^\s+/, "");
    if (/^ACTION\s*:/i.test(trimmed)) break;
    if (i === lines.length - 1 && trimmed && "ACTION:".indexOf(trimmed.toUpperCase()) === 0) continue;
    out.push(L);
  }
  return plainify(out.join("\n").replace(/\n{3,}/g, "\n\n").trim());
}
/** The last ACTION line's JSON, or null. */
export function extractAction(t: string): Record<string, unknown> | null {
  const lines = String(t || "").split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = /^\s*ACTION\s*:\s*(.*)$/i.exec(lines[i]!);
    if (!m) continue;
    let raw = [m[1]].concat(lines.slice(i + 1)).join("\n").trim();
    raw = raw.replace(/^```(json)?/i, "").replace(/```\s*$/, "").trim();
    const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
    if (a < 0 || b <= a) return null;
    try { const v: unknown = JSON.parse(raw.slice(a, b + 1)); return v && typeof v === "object" ? (v as Record<string, unknown>) : null; } catch { return null; }
  }
  return null;
}

/* ======================= orders ======================= */

export const ORDER_ACCOUNTS: Record<AccountKey, 1> = { TFSA: 1, FHSA: 1, RRSP: 1 };
const DEFAULT_TICKERS = ["VFV", "XIC", "XEF", "ZAG", "CASH"];

export interface PolicyContext {
  /** Tickers she can buy: her target's funds (none when she has not chosen). */
  tickers: string[];
  /** Her target weights in percent. */
  weights: Record<string, number>;
  /** Her own mix per account (Build my own, CR11 s12), or null. */
  weightsByAcct: Record<string, Record<string, number>> | null;
  allowSells: boolean;
}

/** What the order policy reads, computed from the state each time (no stale snapshot: production_plan 5.5 item 6). */
export function policyContext(s: DemoState): PolicyContext {
  const t = s.target || {}, pf = targetPortfolio(s);
  const reg = (pf && pf.holdings && pf.holdings.registered) || [];
  const weights: Record<string, number> = {};
  reg.forEach((h) => { weights[String(h.ticker).toUpperCase()] = num(h.weight, 0); });
  let weightsByAcct: PolicyContext["weightsByAcct"] = null;
  if (t.id === "custom" && t.mixes) {
    weightsByAcct = {};
    Object.keys(t.mixes).forEach((k) => { const o: Record<string, number> = {}; (t.mixes![k] || []).forEach((m) => { o[String(m.ticker).toUpperCase()] = num(m.weight, 0); }); if (Object.keys(o).length) weightsByAcct![k] = o; });
  }
  /* "Not chosen yet" buys nothing; with no target at all the published defaults apply, as in the prototype */
  const tickers = pf ? reg.map((h) => String(h.ticker).toUpperCase()) : DEFAULT_TICKERS.slice();
  return { tickers, weights, weightsByAcct, allowSells: s.settings && typeof s.settings.allowSells === "boolean" ? s.settings.allowSells : true };
}

export interface OrderGroup { account: string; lines: OrderLine[] }

/** Room limit: a buy into a registered account never goes past its contribution room left. */
export function checkRoom(s: DemoState, acct: string, amount: number): GuardResult {
  const a = account(s, acct), room = num(a && a.roomLeft, NaN);
  return !Number.isNaN(room) && amount > room + 0.5 ? NO("over_room") : OK;
}

/** The FHSA cap: per pay, no more than the yearly limit over her paydays and never more than the room left. */
export function checkFhsaCap(s: DemoState, perPayToFhsa: number): GuardResult {
  return perPayToFhsa > fhsaPerPayCap(s) + 0.005 ? NO("over_fhsa_cap") : OK;
}

/** Her own mix: a buy in an account follows that account's weights (her target, or her own mix per account), within a unit. */
export function checkOwnMix(s: DemoState, g: OrderGroup, P: PolicyContext = policyContext(s)): GuardResult {
  const acct = g.account; let tot = 0; g.lines.forEach((l) => { tot += l.amount; });
  let W = P.weights, wKeys = Object.keys(W).filter((k) => num(W[k], 0) > 0);
  if (P.weightsByAcct) { W = P.weightsByAcct[acct]!; if (!W) return NO("no_mix_for_account"); wKeys = Object.keys(W).filter((k) => num(W[k], 0) > 0); if (!wKeys.length) return NO("no_mix_for_account"); }
  let unitMax = 0; if (P.weightsByAcct) wKeys.forEach((k) => { unitMax = Math.max(unitMax, priceOf(s, k, acct) || 0); });
  if (wKeys.length > 1 || P.weightsByAcct) {
    const amt: Record<string, number> = {}; g.lines.forEach((l) => { amt[l.ticker] = (amt[l.ticker] || 0) + l.amount; });
    if (Object.keys(amt).some((k) => wKeys.indexOf(k) < 0)) return NO("outside_mix");
    for (const k of wKeys) {
      const exp = tot * num(W[k], 0) / 100, p = priceOf(s, k, acct) || 0;
      if (Math.abs((amt[k] || 0) - exp) > Math.max(p * 1.5, tot * 0.03, unitMax)) return NO("off_mix");
    }
  }
  return OK;
}

/** The order rule (log.md D-03:26): buys follow her own weights and stay within room; sells only from the withdrawal
    account (TFSA), in proportion to what she holds; never mixed with buys. A single-fund buy is valid only for a goal
    kept in that fund, in the TFSA, up to the goal's money (D-12:51 (a), C4). */
export function checkOrderPolicy(s: DemoState, groups: OrderGroup[], allSell: boolean): GuardResult {
  try {
    const P = policyContext(s);
    const anySell = groups.some((g) => g.lines.some((l) => l.side === "sell"));
    if (anySell && !allSell) return NO("mixed_buy_and_sell");
    for (const g of groups) {
      const acct = g.account; let tot = 0; g.lines.forEach((l) => { tot += l.amount; });
      if (!(tot > 0)) return NO("empty");
      if (allSell) {
        if (acct !== "TFSA") return NO("sell_not_tfsa");
        const held = heldUnits(s, acct), hk = Object.keys(held).filter((k) => held[k]! >= 1);
        if (!hk.length) return NO("nothing_held");
        const sold: Record<string, number> = {}; g.lines.forEach((l) => { sold[l.ticker] = (sold[l.ticker] || 0) + l.units; });
        const ratios = hk.map((k) => (sold[k] || 0) / held[k]!), mx = Math.max(...ratios);
        for (let j = 0; j < hk.length; j++) if (Math.abs(ratios[j]! - mx) > Math.max(0.15, 1.5 / held[hk[j]!]!)) return NO("sell_not_proportional");
        if (Object.keys(sold).some((k) => !(held[k]! >= 1))) return NO("sell_not_held");
      } else {
        const tks = Array.from(new Set(g.lines.map((l) => l.ticker))), only = tks.length === 1 ? tks[0]! : null;
        let vg: Goal | undefined;
        if (only) { const vk = KEEP.find((k) => k.fund && k.fund.ticker === only); if (vk) vg = (s.goals || []).find((x) => x.keepIn === vk.id && (x.keepBy === "client" || x.keepBy === "default")); }
        if (vg) { if (acct !== "TFSA" || tot > num(vg.saved, 0) + num(vg.perPay, 0) + 0.5) return NO("fund_over_goal"); continue; }
        const room = checkRoom(s, acct, tot); if (!room.ok) return room;
        const mix = checkOwnMix(s, g, P); if (!mix.ok) return mix;
      }
    }
    return OK;
  } catch { return NO("error"); }
}

export interface OrderCard { id: string; strip: string; title: string; lead: string; groups: OrderGroup[]; total: number; sell: boolean; note: string; fine: string }

/** Validates and normalises an orders ACTION into a card (whole units, known tickers, her accounts, the order rule). Null when refused. */
export function normalizeCard(s: DemoState, a: unknown, idFallback = "act"): OrderCard | null {
  if (!a || typeof a !== "object") return null;
  const A = a as Record<string, unknown>, P = policyContext(s);
  const src = (A.orders && !Array.isArray(A.orders) ? A.orders : A) as Record<string, unknown>;
  const raw: [unknown, Record<string, unknown>][] = [];
  const groupsIn = (x: unknown): void => { (x as { account?: unknown; lines?: unknown[] }[]).forEach((o) => (o.lines || []).forEach((l) => raw.push([o.account, (l || {}) as Record<string, unknown>]))); };
  if (Array.isArray(src.orders)) groupsIn(src.orders);
  else if (Array.isArray(src.groups)) groupsIn(src.groups);
  else if (Array.isArray(src.lines)) (src.lines as Record<string, unknown>[]).forEach((l) => raw.push([(l && l.account) || src.account, l || {}]));
  const byAcct: Record<string, OrderLine[]> = {}, order: string[] = [];
  raw.slice(0, 15).forEach(([acctRaw, l]) => {
    const acct = String(acctRaw || "").toUpperCase();
    if (!(ORDER_ACCOUNTS as Record<string, 1>)[acct]) return;
    const t = String(l.ticker || l.symbol || "").toUpperCase();
    if (P.tickers.indexOf(t) < 0) return;
    const side = String(l.side || "buy").toLowerCase() === "sell" ? "sell" : "buy";
    if (side === "sell" && !P.allowSells) return;
    let units = Math.floor(num(l.units != null ? l.units : l.qty, 0));
    const price = num(l.price, 0) || priceOf(s, t, acct);
    if (!(units > 0) && price > 0 && num(l.amount, 0) > 0) units = Math.floor(num(l.amount, 0) / price);
    if (!(units > 0)) return;
    if (side === "sell") { const held = heldUnits(s, acct)[t] || 0; units = Math.min(units, Math.floor(held)); if (!(units > 0)) return; }
    const amount = price > 0 ? Math.round(units * price * 100) / 100 : num(l.amount, 0);
    if (!(amount > 0)) return;
    if (!byAcct[acct]) { byAcct[acct] = []; order.push(acct); }
    byAcct[acct]!.push({ side, ticker: t, units, price, amount });
  });
  if (!order.length) return null;
  const groups = order.map((k) => ({ account: k, lines: byAcct[k]! }));
  const allSell = groups.every((g) => g.lines.every((l) => l.side === "sell"));
  if (!checkOrderPolicy(s, groups, allSell).ok) return null;
  let total = 0; groups.forEach((g) => g.lines.forEach((l) => { total += l.amount; }));
  return {
    id: String(A.id || idFallback),
    strip: plainify(A.strip || (allSell ? "Withdrawal" : "Change")).slice(0, 24),
    title: plainify(A.title || (allSell ? "Sell for cash" : "Updated orders")).slice(0, 40),
    lead: plainify(A.lead || (allSell ? "From your " : "Into your ") + order.join(", ") + ". Sent only after you approve."),
    groups, total: Math.round(total * 100) / 100, sell: allSell,
    note: A.note ? plainify(A.note) : "",
    fine: plainify(A.fine || (allSell ? "Market orders. Sells settle in about one business day. Then move the cash to your bank in the Questrade app. Prices are approximate." : "Market orders. Sent to your Questrade accounts only after you approve. Prices are approximate."))
  };
}

/* ======================= sells, affordability and Talk ======================= */

const CONTRIB_RE = /\b(put|putting|contribut\w*|deposit\w*|add|adding|invest\w*|top up)\b[^.?!]{0,30}\b(in|into|to)\b[^.?!]{0,20}\b(rrsp|tfsa|fhsa)\b|\b(refund|tax back|get back|tax (credit|deduction|savings?)|how much tax|deduct\w*)\b/i;
const OUT_RE = /\b(withdraw\w*|take\s+(\$?[\d,]+k?\s+)?out|pull\s+(\$?[\d,]+k?\s+)?out|cash out|sell|need (the )?(cash|money)|money out|take money)\b/i;
/** A sell card is allowed only when she asked to take an amount out, not when she asked about contributing (D-18:51). */
export function sellAllowedFor(text: string): boolean { const q = String(text || ""); return OUT_RE.test(q) && /\$?\d/.test(q) && !CONTRIB_RE.test(q); }

/** Compliance C2: an affordability question never produces an order; only these plan changes. */
const AFFORD_OK = ["goal_update", "plan_spend", "planner", "spending"];
export function affordActionAllowed(userText: string, action: Record<string, unknown> | null): boolean {
  if (!action) return true;
  if (AFFORD_RE.test(String(userText || ""))) return typeof action.type === "string" && AFFORD_OK.indexOf(action.type) >= 0;
  return true;
}

/** Talk it through never shows a buy or sell: trades stay in Messages, where she approves each order. */
export function isTradeAction(a: unknown): boolean {
  if (!a || typeof a !== "object") return false;
  const x = a as Record<string, unknown>;
  return x.type === "orders" || !!x.lines || !!x.orders || !!x.groups || x.type === "sell" || x.type === "buy" || x.type === "withdraw" || /order|trade|sell|buy|withdraw/i.test(String(x.type || "") + " " + String(x.strip || ""));
}
export const TALK_OK: Record<string, 1> = { plan_spend: 1, goal_add: 1, goal_update: 1, goal_pause: 1, goal_resume: 1, pay_update: 1, bill_update: 1, bill_add: 1, planner: 1, compare: 1, insights: 1, spending: 1, bills: 1, keep_menu: 1 };
const TRADE_TEXT = /\b(tap approve|sale sent|sell (it|them|from|for)|account to sell from|to sell from|send the (order|sale)|buy order|sell order|prepare (a|the) (sale|sell|buy|order)|total to sell)\b/i;
export const TALK_NO_TRADE = "Selling is done from your Messages thread, where you approve each order. Want me to open it?";

/** Guardrail 1: may Talk show a card for this action? */
export function talkActionAllowed(a: unknown): GuardResult {
  if (!a || typeof a !== "object") return NO("no_action");
  if (isTradeAction(a)) return NO("trade_in_talk");
  const t = (a as Record<string, unknown>).type;
  return typeof t === "string" && TALK_OK[t] ? OK : NO("not_a_talk_card");
}
/** A Talk reply with any trade action or trade wording is replaced by the hand-off to Messages; other actions are filtered to Talk's cards. */
export function talkSafeReply<T extends { text?: string; actions?: unknown[]; action?: unknown; safe?: boolean }>(r: T): { text: string; actions: unknown[]; blocked: boolean } {
  const acts = (r.actions || []).slice(); if (r.action) acts.unshift(r.action);
  if (acts.some(isTradeAction) || (!r.safe && TRADE_TEXT.test(String(r.text || "")))) return { text: TALK_NO_TRADE, actions: [], blocked: true };
  return { text: String(r.text || ""), actions: acts.filter((a) => talkActionAllowed(a).ok), blocked: false };
}

/* ======================= approval ======================= */

export type ApprovalStep = "pull" | "send" | "broker";
export interface Approval {
  /** pull: move her payday amount from the bank; send: Send to Questrade in Woodstock; broker: approve in (demo) Questrade. */
  step: ApprovalStep;
  /** The batch she approved: the approval covers this exact request only. */
  batchId: string;
  /** How she confirmed: "face-id", "passcode", "demo-face-id" (production: a signed device approval over the batch). */
  method: string;
  at: string;
}

/** An Approval from the auth adapter's confirmApproval result, for one step of one batch. Null when she did not confirm. */
export function approvalFrom(result: { ok: boolean; method: string; at: string } | null | undefined, step: ApprovalStep, batchId: string): Approval | null {
  return result && result.ok && result.method && result.method !== "none" ? { step, batchId, method: result.method, at: result.at } : null;
}

/** Guardrail 2: money moves and orders go only with her approval of this exact batch, in order, after she accepted the terms. */
export function requireApproval(s: DemoState, ap: Approval | null | undefined, step: ApprovalStep): GuardResult {
  const B = s.pendingBatch;
  if (!B) return NO("no_batch");
  if (!ap || typeof ap !== "object" || !ap.method || !ap.at) return NO("no_approval");
  if (ap.step !== step) return NO("wrong_step");
  if (ap.batchId !== B.id) return NO("other_batch");
  if (step !== "broker" && !(s.user && s.user.termsAccepted)) return NO("terms_not_accepted");
  if (step === "pull") { if (B.pulled) return NO("already_pulled"); if (B.status !== "pending" && B.status !== "sent") return NO("not_waiting"); }
  if (step === "send") { if (B.status !== "pending") return NO("not_pending"); if (!(B.orders || []).some((o) => (o.lines || []).length)) return NO("no_orders"); }
  if (step === "broker" && B.status !== "sent") return NO("not_sent_in_woodstock");
  return OK;
}

/* ======================= her own mix (Build my own, CR8 s12) ======================= */

/** The searchable list in Build my own: [ticker, name, exchange, what it holds, fee, approximate price, sleeve]. */
export const PICK: readonly (readonly [string, string, string, string, string | null, number, string])[] = ([
  ["AAPL", "Apple", "NASDAQ", "One company", null, 228.1, "us"], ["BMO", "Bank of Montreal", "TSX", "One company", null, 128.4, "cad"], ["CNR", "Canadian National Railway", "TSX", "One company", null, 154.2, "cad"],
  ["CASH", "Global X High Interest Savings ETF", "TSX", "Cash in bank deposits", "0.11%", 50.02, "cash"], ["ENB", "Enbridge", "TSX", "One company", null, 58.3, "cad"],
  ["HXT", "Global X S&P/TSX 60 Index Corporate Class ETF", "TSX", "Canadian stocks", "0.03%", 63.8, "cad"], ["MSFT", "Microsoft", "NASDAQ", "One company", null, 418.5, "us"],
  ["RY", "Royal Bank of Canada", "TSX", "One company", null, 171.6, "cad"], ["SHOP", "Shopify", "TSX", "One company", null, 104.9, "cad"], ["SU", "Suncor Energy", "TSX", "One company", null, 52.7, "cad"],
  ["TD", "Toronto-Dominion Bank", "TSX", "One company", null, 79.1, "cad"], ["VAB", "Vanguard Canadian Aggregate Bond Index ETF", "TSX", "Bonds", "0.09%", 23.3, "bond"],
  ["VCN", "Vanguard FTSE Canada All Cap Index ETF", "TSX", "Canadian stocks", "0.05%", 50.4, "cad"], ["VEQT", "Vanguard All-Equity ETF Portfolio", "TSX", "Stocks from around the world", "0.24%", 44.9, "mixed"],
  ["VFV", "Vanguard S&P 500 Index ETF", "TSX", "US stocks", "0.09%", 158.4, "us"], ["VIU", "Vanguard FTSE Developed All Cap ex North America Index ETF", "TSX", "International stocks", "0.23%", 38.6, "intl"],
  ["VSB", "Vanguard Canadian Short-Term Bond Index ETF", "TSX", "Short-term bonds", "0.11%", 45.9, "bond"], ["VTI", "Vanguard Total Stock Market ETF", "NYSE Arca", "US stocks", "0.03%", 289.4, "us"],
  ["VXUS", "Vanguard Total International Stock ETF", "NASDAQ", "International stocks", "0.05%", 66.2, "intl"], ["XBB", "iShares Core Canadian Universe Bond Index ETF", "TSX", "Bonds", "0.10%", 28.7, "bond"],
  ["XEC", "iShares Core MSCI Emerging Markets IMI Index ETF", "TSX", "Emerging-market stocks", "0.26%", 29.8, "em"], ["XEF", "iShares Core MSCI EAFE IMI Index ETF", "TSX", "International stocks", "0.22%", 40.1, "intl"],
  ["XEQT", "iShares Core Equity ETF Portfolio", "TSX", "Stocks from around the world", "0.20%", 33.6, "mixed"], ["XGRO", "iShares Core Growth ETF Portfolio", "TSX", "Mostly stocks, some bonds", "0.20%", 30.1, "mixed"],
  ["XIC", "iShares Core S&P/TSX Capped Composite Index ETF", "TSX", "Canadian stocks", "0.06%", 41.2, "cad"], ["XUU", "iShares Core S&P US Total Market Index ETF", "TSX", "US stocks", "0.07%", 59.7, "us"],
  ["ZAG", "BMO Aggregate Bond Index ETF", "TSX", "Bonds", "0.09%", 13.9, "bond"], ["ZEB", "BMO Equal Weight Banks Index ETF", "TSX", "Canadian bank stocks", "0.28%", 39.2, "cad"],
  ["ZMMK", "BMO Money Market Fund ETF Series", "TSX", "Money market", "0.13%", 50.0, "cash"], ["ZSP", "BMO S&P 500 Index ETF", "TSX", "US stocks", "0.09%", 83.7, "us"]
] as const).slice().sort((a, b) => a[1].localeCompare(b[1]));

/** Guardrail 5: her own mix is valid only with listed tickers, no repeats, whole-percent weights of 0 to 100 that total exactly 100,
    and only when she sets it herself (a chat or model can never set it: chosenBy must be "client"). Returns the mix with names and prices. */
export function validateOwnMix(mix: { ticker: string; weight: number }[] | null | undefined, chosenBy: string): ({ ok: true; mix: MixLine[] }) | { ok: false; code: string } {
  if (chosenBy !== "client") return { ok: false, code: "not_her_tap" };
  if (!Array.isArray(mix) || !mix.length) return { ok: false, code: "empty" };
  const seen = new Set<string>(), out: MixLine[] = [];
  let total = 0;
  for (const m of mix) {
    const t = String(m && m.ticker || "").toUpperCase(), p = PICK.find((x) => x[0] === t), w = Number(m && m.weight);
    if (!p) return { ok: false, code: "not_listed" };
    if (seen.has(t)) return { ok: false, code: "repeated" };
    if (!Number.isFinite(w) || w < 0 || w > 100) return { ok: false, code: "bad_weight" };
    seen.add(t); total += w;
    out.push({ ticker: t, weight: w, name: p[1], price: p[5], kind: p[6] });
  }
  if (Math.abs(total - 100) > 1e-9) return { ok: false, code: "not_100" };
  return { ok: true, mix: out };
}

/* ======================= plan actions (confirm cards) ======================= */

export const ACT_TYPES: Record<string, 1> = { keep_menu: 1, sub_cancel: 1, goal_update: 1, goal_add: 1, goal_delete: 1, goal_move: 1, goal_pause: 1, goal_resume: 1, planner: 1, insights: 1, compare: 1, spending: 1, bills: 1, plan_spend: 1, pay_update: 1, invest_total: 1, savings_total: 1, bill_update: 1, bill_add: 1 };
export const WHERE_OK = ["Questrade TFSA, as cash", "Questrade FHSA"];

export type PlanActionResult =
  | { ok: true; type: string; goalId?: string; patch: Record<string, unknown>; shortTermDefault?: boolean; topic?: string; amount?: number; total?: number; mode?: string;
      cuts?: { id: string; cut: number }[]; cut?: number; newPer?: number; billId?: string; name?: string; split?: ReturnType<typeof investSplitFor>; withdraw?: number }
  | { ok: false; code: string };

function cap(n: unknown, lo: number, hi: number): number | null { const v = Number(n); return Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v * 100) / 100 : null; }
const isoRe = /^\d{4}-\d{2}-\d{2}$/;

/** Validates a plan change (from Messages, Talk or the model) against her real goals and the whitelists. The card copy is the app's;
    this returns the patch she confirms, or a refusal code. */
export function validatePlanAction(s: DemoState, a: unknown, ctx?: Ctx): PlanActionResult {
  const c = ctx ?? { today: today(s) };
  if (!a || typeof a !== "object") return { ok: false, code: "no_action" };
  const A = a as Record<string, unknown>, type = String(A.type || "");
  if (!ACT_TYPES[type]) return { ok: false, code: "unknown_type" };
  const b = budget(s, c);
  const goals = s.goals || [];
  if (type === "planner") return { ok: true, type, topic: String(A.topic || "").slice(0, 40), patch: {} };
  if (type === "insights" || type === "compare" || type === "spending" || type === "bills") return { ok: true, type, patch: {} };
  if (type === "keep_menu") { const kg = A.goal ? findGoal(s, String(A.goal)) : null; return kg && isShortTerm(kg, c) ? { ok: true, type, goalId: kg.id, patch: {} } : { ok: false, code: "not_short_term" }; }
  if (type === "sub_cancel") return s.subscription && s.subscription.status !== "cancelled" ? { ok: true, type, patch: {} } : { ok: false, code: "no_subscription" };
  if (type === "plan_spend") {
    const amt = cap(A.amount, 1, 20000); if (amt == null) return { ok: false, code: "bad_amount" };
    if (A.mode === "less") { const r = planSpendLess(s, amt, c); return r ? { ok: true, type, mode: "less", amount: amt, cuts: r.cuts, cut: r.cut, goalId: r.goalId, patch: {} } : { ok: false, code: "nothing_to_cut" }; }
    if (A.mode === "catch") { const r = planSpendCatch(s, amt, c); return r ? { ok: true, type, mode: "catch", amount: amt, goalId: r.goalId, patch: {} } : { ok: false, code: "no_flexible_goal" }; }
    if (A.mode === "goal") { const r = planSpendFromGoal(s, amt, String(A.goal || ""), c); return r ? { ok: true, type, mode: "goal", amount: amt, goalId: r.goalId, newPer: r.newPer, patch: { saved: Math.max(0, r.savedAfter), perPay: r.newPer } } : { ok: false, code: "goal_cannot_cover" }; }
    return { ok: false, code: "bad_mode" };
  }
  if (type === "pay_update") { const p = cap(A.amount, 100, 50000); return p == null || Math.abs(p - b.pay) < 1 ? { ok: false, code: p == null ? "bad_amount" : "no_change" } : { ok: true, type, amount: p, patch: { amount: p } }; }
  if (type === "invest_total" || type === "savings_total") {
    const tot = cap(A.total, 0, 20000); if (tot == null) return { ok: false, code: "bad_amount" };
    const cashPP = goals.filter((x) => !x.invested && !x.paused && num(x.perPay, 0) > 0 && !(x.target && num(x.saved, 0) >= x.target)).reduce((t, x) => t + num(x.perPay, 0), 0);
    const inv = type === "savings_total" ? tot - cashPP : tot; if (inv < 0) return { ok: false, code: "below_cash_goals" };
    const split = investSplitFor(s, inv), curInv = b.save - cashPP;
    if (Math.abs(inv - curInv) < 1) return { ok: false, code: "no_change" };
    return { ok: true, type, total: inv, split, patch: {} };
  }
  if (type === "bill_update") {
    const amtB = cap(A.amount, 1, 20000); if (amtB == null) return { ok: false, code: "bad_amount" };
    const bl = (s.bills || []).find((x) => x.id === A.bill); if (!bl || Math.abs(bl.amount - amtB) < 0.01) return { ok: false, code: bl ? "no_change" : "no_bill" };
    return { ok: true, type, billId: bl.id, amount: amtB, patch: { amount: amtB } };
  }
  if (type === "bill_add") {
    const amtB = cap(A.amount, 1, 20000); if (amtB == null) return { ok: false, code: "bad_amount" };
    const nm = String(A.name || "").replace(/[^\w\s'&-]/g, "").trim().slice(0, 30); if (!nm) return { ok: false, code: "no_name" };
    return { ok: true, type, name: nm, amount: amtB, patch: { name: nm, amount: amtB } };
  }
  if (type === "goal_add") {
    const name = String(A.name || "").replace(/[^\w\s'&,.-]/g, "").trim().slice(0, 36); if (!name) return { ok: false, code: "no_name" };
    let t = cap(A.target, 50, 500000), pp = cap(A.perPay, 0, 5000); if (t == null) t = 1000; if (pp == null) pp = 0;
    const by = isoRe.test(String(A.by || "")) ? String(A.by) : null;
    const where = WHERE_OK.indexOf(String(A.where)) >= 0 ? String(A.where) : "Questrade TFSA, as cash";
    if (/FHSA/.test(where) && A.kind !== "home") return { ok: false, code: "fhsa_only_for_home" };
    const byD = parseDate(by), shortNew = !/FHSA/.test(where) && !!byD && (byD.getTime() - c.today.getTime()) / DAY_MS <= 400;
    return { ok: true, type, shortTermDefault: shortNew, patch: { name, target: t, perPay: pp, by, byLabel: by ? labelBy(by) : null, where, kind: A.kind === "trip" ? "trip" : "other", saved: 0, invested: /FHSA/.test(where) } };
  }
  const g = A.goal ? findGoal(s, String(A.goal)) : null;
  if (!g) return { ok: false, code: "no_goal" };
  if (type === "goal_delete") return { ok: true, type, goalId: g.id, patch: {} };
  if (type === "goal_pause" || type === "goal_resume") {
    const pause = type === "goal_pause"; if (!!g.paused === pause) return { ok: false, code: "no_change" };
    return { ok: true, type, goalId: g.id, patch: { paused: pause } };
  }
  if (type === "goal_move") {
    const w = WHERE_OK.indexOf(String(A.where)) >= 0 ? String(A.where) : null; if (!w || w === g.where) return { ok: false, code: "bad_where" };
    if (/FHSA/.test(w) && g.kind !== "home") return { ok: false, code: "fhsa_only_for_home" };
    if (g.kind === "home" && !/FHSA/.test(w)) return { ok: false, code: "home_stays_in_fhsa" };
    return { ok: true, type, goalId: g.id, patch: { where: w, invested: /FHSA/.test(w) } };
  }
  if (type === "goal_update") {
    const P: Record<string, unknown> = {}; let changed = false;
    const nt = A.target != null ? cap(A.target, 50, 500000) : null; if (nt != null && nt !== g.target) { P.target = nt; changed = true; }
    const np = A.perPay != null ? cap(A.perPay, 0, 5000) : null; if (np != null && np !== g.perPay) { P.perPay = np; P.paused = false; changed = true; }
    if (A.by && isoRe.test(String(A.by)) && A.by !== g.by) { P.by = A.by; P.byLabel = labelBy(String(A.by)); changed = true; }
    if (A.name) { const nn = String(A.name).trim().slice(0, 36); if (nn && nn !== g.name) { P.name = nn; changed = true; } }
    let wd = A.withdraw != null ? cap(A.withdraw, 1, 500000) : null;
    if (wd != null) {
      const sv0 = num(g.saved, 0); if (wd > sv0) wd = sv0; if (!(wd > 0)) return { ok: false, code: "nothing_saved" };
      P.saved = Math.round((sv0 - wd) * 100) / 100; changed = true;
      if (g.by && g.target && P.perPay == null) {
        const nl = paysUntil(s, g.by, c), np2 = Math.max(0, Math.ceil((g.target - (P.saved as number)) / Math.max(1, nl)));
        if (Math.abs(np2 - num(g.perPay, 0)) >= 1) { P.perPay = np2; P.paused = false; }
      }
    }
    if (!changed) return { ok: false, code: "no_change" };
    return wd != null ? { ok: true, type, goalId: g.id, withdraw: wd, patch: P } : { ok: true, type, goalId: g.id, patch: P };
  }
  return { ok: false, code: "unknown_type" };
}

