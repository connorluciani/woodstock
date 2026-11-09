/* Account values and totals (the prototype's WS.calc), with the state passed in. */
import type { Account, DemoState, Holding } from "./types.ts";

export function holdingValue(h: Holding): number { return h.value != null && h.units == null ? Number(h.value) : (h.units || 0) * (h.price || 0); }
export function accountValue(a: Account): number {
  let v = a.cash || 0;
  (a.holdings || []).forEach((h) => { v += holdingValue(h); });
  if (!a.holdings && a.balance != null) v = a.balance;
  if (a.kind === "debt" || a.kind === "card") v = a.balance || 0;
  return Math.round(v * 100) / 100;
}
/** Investment accounts (no kind) at today's prices. */
export function investTotal(s: DemoState): number {
  let t = 0; s.accounts.forEach((a) => { if (!a.kind) t += accountValue(a); }); return Math.round(t * 100) / 100;
}
/** Net worth: assets less cards and debt. */
export function netWorth(s: DemoState): number {
  let t = 0; s.accounts.forEach((a) => { const v = accountValue(a); t += a.kind === "debt" || a.kind === "card" ? -v : v; }); return Math.round(t * 100) / 100;
}
export function cashTotal(s: DemoState): number {
  let t = 0; s.accounts.forEach((a) => { if (a.kind === "bank") t += accountValue(a); }); return t;
}
/** An account by id or type, case-insensitive ("tfsa", "CHQ"). */
export function account(s: DemoState, id: string): Account | null {
  const k = String(id || "").toUpperCase();
  return s.accounts.find((a) => String(a.id || a.type).toUpperCase() === k || String(a.type || "").toUpperCase() === k) ?? null;
}
/** Everything at Questrade: cash plus holdings. */
export function investedNow(s: DemoState): number {
  return s.accounts.filter((a) => a.provider === "Questrade").reduce((t, a) => t + (Number(a.cash) || 0) + (a.holdings || []).reduce((u, h) => u + (h.units || 0) * (h.price || 0), 0), 0);
}
/** Units she holds per ticker in an account. */
export function heldUnits(s: DemoState, acct: string): Record<string, number> {
  const out: Record<string, number> = {}, a = account(s, acct);
  ((a && a.holdings) || []).forEach((h) => { const t = String(h.ticker).toUpperCase(); out[t] = (out[t] || 0) + (Number(h.units) || 0); });
  return out;
}
/** Today's approximate price of a ticker: the account's own holding price, else the price table. */
export function priceOf(s: DemoState, ticker: string, acct?: string): number {
  const t = String(ticker).toUpperCase();
  const h = acct ? ((account(s, acct) || { holdings: [] as Holding[] }).holdings || []).find((x) => String(x.ticker).toUpperCase() === t) : undefined;
  return (Number(h && h.price) || 0) || (Number((s.prices || {})[t]) || 0);
}
