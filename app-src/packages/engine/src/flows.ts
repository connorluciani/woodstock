/* CR12 demo flows: the payday money pull (s2), the two-step order approval (s1: Send to Questrade in Woodstock,
   then Approve in the demo Questrade), and crediting each goal by exactly its own line (D-20:53).
   Every function that changes the state starts with "apply"; the guarded steps check an approval first (policy.ts). */
import type { Account, DemoState, Order, PendingBatch, Stamp } from "./types.ts";
import { cad, cad0, round2 } from "./money.ts";
import { account } from "./accounts.ts";
import { requireApproval, type Approval, type GuardResult } from "./policy.ts";

/* ---------------- s2: the payday pull ---------------- */

/** Where the payday amount comes from: her chequing, else the first bank account that funds deposits. */
export function pullSource(s: DemoState): Account | null {
  const banks = (s.accounts || []).filter((a) => a.kind === "bank");
  return banks.find((a) => /chequing/i.test(a.name || "")) || banks.find((a) => a.fundsDeposits !== false) || banks[0] || null;
}

export interface PullPlan { batchId: string; amount: number; from: { id: string; name: string }; to: { account: string; amount: number }[]; pulled: boolean }

/** Today's pull: one amount from the bank, split by Questrade account, from the request's lines. */
export function pullPlan(s: DemoState): PullPlan | null {
  const B = s.pendingBatch; if (!B) return null;
  const by: Record<string, number> = {}, order: string[] = [];
  (B.goalLines || []).forEach((l) => {
    const parts = l.split && l.split.length ? l.split : [{ account: l.account || "TFSA", amount: l.amount }];
    parts.forEach((p) => { const k = String(p.account || "TFSA").toUpperCase(); if (!(k in by)) { by[k] = 0; order.push(k); } by[k] = round2(by[k]! + (Number(p.amount) || 0)); });
  });
  const amount = round2(order.reduce((t, k) => t + by[k]!, 0)), src = pullSource(s);
  if (!(amount > 0) || !src) return null;
  return { batchId: B.id, amount, from: { id: src.id, name: src.name || src.id }, to: order.filter((k) => account(s, k)).map((k) => ({ account: k, amount: by[k]! })), pulled: !!B.pulled };
}
export function pullText(p: PullPlan): string { return "Move " + cad0(p.amount) + " from " + p.from.name + " to your goals at Questrade? (demo)"; }
export function pullDoneText(p: PullPlan): string { return "Moved (demo): " + p.from.name + " −" + cad0(p.amount) + ", Questrade cash +" + cad0(p.amount) + "."; }

/** Moves the payday amount between demo accounts. Unguarded: call approvePull, which checks her approval. Mutates. */
export function applyPull(s: DemoState, p: PullPlan | null, stamp: Stamp): { ok: true; amount: number; from: PullPlan["from"]; to: PullPlan["to"] } | { ok: false; code: string } {
  const B = s.pendingBatch;
  if (!p || !B || B.pulled) return { ok: false, code: B && B.pulled ? "already_pulled" : "no_plan" };
  const bank = account(s, p.from.id); if (!bank) return { ok: false, code: "no_bank" };
  bank.cash = round2((Number(bank.cash) || 0) - p.amount);
  bank.activity = bank.activity || [];
  bank.activity.unshift({ date: stamp.date, time: stamp.time, what: "Moved to your goals at Questrade (demo)", amt: -p.amount, demo: true });
  p.to.forEach((t) => {
    const a = account(s, t.account); if (!a) return;
    a.cash = round2((Number(a.cash) || 0) + t.amount);
    a.activity = a.activity || [];
    a.activity.unshift({ date: stamp.date, time: stamp.time, what: "Moved in from " + p.from.name + " (demo)", amt: t.amount, demo: true });
  });
  s.activity = s.activity || [];
  s.activity.unshift({ when: stamp.iso, time: stamp.time, title: pullDoneText(p), sub: p.to.map((t) => t.account + " " + cad0(t.amount)).join(", "), amount: p.amount, kind: "pull", demo: true });
  B.pulled = { at: stamp.iso, time: stamp.time, amount: p.amount, from: p.from.name };
  s.demoMoved = true;
  return { ok: true, amount: p.amount, from: p.from, to: p.to };
}

/* ---------------- s1: orders ---------------- */

export interface FlatLine { account: string; side: "buy" | "sell"; ticker: string; units: number; price: number; amount: number }
export function orderLines(orders: Order[] | null | undefined): FlatLine[] {
  const out: FlatLine[] = [];
  (orders || []).forEach((o) => (o.lines || []).forEach((l) => out.push({ account: String(o.account).toUpperCase(), side: l.side === "sell" ? "sell" : "buy", ticker: String(l.ticker).toUpperCase(), units: Number(l.units) || 0, price: Number(l.price) || 0, amount: round2(l.amount) })));
  return out;
}
export function orderLineText(l: FlatLine): string { return (l.side === "sell" ? "Sold " : "Bought ") + l.units + " " + l.ticker + " at about " + cad(l.price) + " (demo)"; }
export function doneText(orders: Order[]): string {
  const L = orderLines(orders), nb = L.filter((l) => l.side === "buy").length, ns = L.length - nb, parts: string[] = [];
  if (nb) parts.push(nb + (nb === 1 ? " buy" : " buys")); if (ns) parts.push(ns + (ns === 1 ? " sell" : " sells"));
  return "Done (demo): " + (parts.join(" and ") || "nothing") + " applied to your demo accounts.";
}

/** Records approved orders in her demo accounts: units, book value and cash (the prototype's WS.applyOrders). Unguarded. Mutates. */
export function applyOrders(s: DemoState, orders: Order[] | Order, stamp: Stamp): { ok: true; applied: number } {
  const list = Array.isArray(orders) ? orders : [orders], applied: Order[] = [];
  list.forEach((o) => {
    if (!o) return;
    const acct = account(s, o.account); if (!acct) return;
    acct.holdings = acct.holdings || [];
    let spent = 0;
    (o.lines || []).forEach((l) => {
      const tk = String(l.ticker || "").toUpperCase(); if (!tk) return;
      let h = acct.holdings!.find((x) => String(x.ticker).toUpperCase() === tk);
      let px = Number(l.price) || (h && h.price) || (s.prices && s.prices[tk]) || 0;
      let units = Number(l.units);
      const amt = Number(l.amount);
      if (!(units > 0)) { if (px > 0) units = Math.floor((amt || 0) / px); else { px = 1; units = amt || 0; } }
      let cost = Math.round(units * px * 100) / 100;
      if (!(cost > 0) && amt > 0) cost = amt;
      const sign = l.side === "sell" ? -1 : 1;
      if (!h) { const meta = (s.funds && s.funds[tk]) || {}; h = { ticker: tk, name: meta.name || tk, units: 0, price: px, bookValue: 0 }; if (meta.sleeve) h.sleeve = meta.sleeve; acct.holdings!.push(h); }
      if (!h.price) h.price = px;
      h.units = Math.max(0, Math.round(((h.units || 0) + sign * units) * 10000) / 10000);
      if (h.bookValue != null || sign > 0) h.bookValue = Math.max(0, Math.round(((h.bookValue || 0) + sign * cost) * 100) / 100);
      spent += sign * cost;
    });
    const funded = (o.total != null ? Number(o.total) : (o.lines || []).reduce((t, l) => t + (l.side === "sell" ? 0 : Number(l.amount) || 0), 0)) || 0;
    const cash = Number(acct.cash) || 0;
    /* buys draw on cash already in the account; any shortfall is the deposit that funded this batch */
    const deposit = Math.max(0, Math.max(funded, spent) - cash);
    acct.cash = Math.round(Math.max(0, cash + deposit - spent) * 100) / 100;
    if (deposit > 0) {
      const bank = s.accounts.find((a) => a.kind === "bank" && a.fundsDeposits !== false);
      if (bank && typeof bank.cash === "number") bank.cash = Math.round(Math.max(0, bank.cash - deposit) * 100) / 100;
    }
    if (o.deposit) acct.cash = Math.round((acct.cash + Number(o.deposit)) * 100) / 100;
    acct.updated = stamp.iso;
    applied.push(o);
  });
  s.activity = s.activity || [];
  const tot = list.reduce((t, o) => t + (Number(o && o.total) || 0), 0);
  if (applied.length) s.activity.unshift({ when: stamp.iso, title: "Done (demo): orders applied", sub: applied.map((o) => String(o.account).toUpperCase()).join(", "), amount: -tot, kind: "order" });
  s.lastOrdersAt = stamp.iso;
  if (s.pendingBatch && s.pendingBatch.status === "pending" && list.some((o) => o && (o.lines || []).some((l) => l.side !== "sell"))) { s.pendingBatch.status = "approved"; s.pendingBatch.approvedAt = stamp.iso; }
  /* production_plan 5.5 item 8: never "Orders sent to Questrade" */
  s.messagesPreview = s.messagesPreview || {}; s.messagesPreview.preview = doneText(list);
  return { ok: true, applied: applied.length };
}

/** Activity rows for an approval, newest first. Mutates. */
export function applyApprovalActivity(s: DemoState, orders: Order[], stamp: Stamp): number {
  const L = orderLines(orders);
  s.activity = s.activity || [];
  L.slice().reverse().forEach((l) => {
    const a = account(s, l.account);
    if (a) { a.activity = a.activity || []; a.activity.unshift({ date: stamp.date, time: stamp.time, what: orderLineText(l), amt: l.side === "sell" ? l.amount : -l.amount, demo: true }); }
    s.activity!.unshift({ when: stamp.iso, time: stamp.time, title: orderLineText(l), sub: l.account, amount: l.side === "sell" ? l.amount : -l.amount, kind: "order", demo: true });
  });
  s.activity.unshift({ when: stamp.iso, time: stamp.time, title: "Approved in Questrade (demo)", sub: L.length + " orders", kind: "approval", demo: true });
  s.demoMoved = true;
  return L.length;
}
export function applySentActivity(s: DemoState, stamp: Stamp): void {
  s.activity = s.activity || [];
  s.activity.unshift({ when: stamp.iso, time: stamp.time, title: "Sent to Questrade (demo)", sub: "Waiting for your approval in demo Questrade", kind: "sent", demo: true });
}

/** D-20:53: the only goal-credit arithmetic. After the demo approval each goal gets exactly its own line, once. Mutates; returns goals credited. */
export function applyGoalCredit(s: DemoState, B: PendingBatch | null | undefined): number {
  if (!B || B._credited) return 0;
  B._credited = true; let n = 0;
  (B.goalLines || []).forEach((l) => {
    const g = (s.goals || []).find((x) => x.id === l.goal); if (!g) return;
    g.saved = round2((Number(g.saved) || 0) + (Number(l.amount) || 0));
    g.deposits = g.deposits || []; g.deposits.unshift({ date: B.payday || "", amount: Number(l.amount) || 0, demo: true }); n++;
  });
  return n;
}

/* ---------------- the guarded steps the app calls ---------------- */

export type FlowResult<T> = ({ ok: true } & T) | { ok: false; code: string };
const refuse = (g: GuardResult): { ok: false; code: string } => ({ ok: false, code: g.ok ? "refused" : g.code });

/** Step 0 (CR12 s2): she approves moving her payday amount from her bank (demo). Needs her approval of this batch. */
export function approvePull(s: DemoState, approval: Approval | null | undefined, stamp: Stamp): FlowResult<{ amount: number; text: string }> {
  const g = requireApproval(s, approval, "pull"); if (!g.ok) return refuse(g);
  const p = pullPlan(s), r = applyPull(s, p, stamp);
  if (!r.ok) return r;
  return { ok: true, amount: r.amount, text: pullDoneText(p!) };
}

/** Step 1 (CR12 s1): Send to Questrade, approved in Woodstock with Face ID. Nothing is bought yet. */
export function sendToQuestrade(s: DemoState, approval: Approval | null | undefined, stamp: Stamp): FlowResult<{ status: "sent" }> {
  const g = requireApproval(s, approval, "send"); if (!g.ok) return refuse(g);
  const B = s.pendingBatch!;
  applySentActivity(s, stamp); B.status = "sent"; B.sentAt = stamp.time;
  return { ok: true, status: "sent" };
}

/** Step 2 (CR12 s1): she approves in the demo Questrade. The pull runs first if it has not; then the orders apply,
    the activity rows are written and each goal is credited by its own line. */
export function approveInQuestrade(s: DemoState, approval: Approval | null | undefined, stamp: Stamp): FlowResult<{ lines: number; text: string; pulled: string | null; credited: number }> {
  const g = requireApproval(s, approval, "broker"); if (!g.ok) return refuse(g);
  const B = s.pendingBatch!, orders = (B.orders || []).map((o) => ({ account: o.account, lines: o.lines.map((l) => ({ side: l.side, ticker: l.ticker, units: l.units, price: l.price, amount: l.amount })), total: round2(o.lines.reduce((t, l) => t + l.amount, 0)) }));
  const pre = !B.pulled ? pullPlan(s) : null;
  if (pre) applyPull(s, pre, stamp);
  applyOrders(s, orders, stamp);
  const n = applyApprovalActivity(s, orders, stamp);
  B.status = "approved"; B.confirmedAt = stamp.iso; B.doneTime = stamp.time;
  s.messagesPreview = s.messagesPreview || {}; s.messagesPreview.preview = doneText(orders);
  const credited = applyGoalCredit(s, B);
  return { ok: true, lines: n, text: doneText(orders), pulled: pre ? pullDoneText(pre) : null, credited };
}
