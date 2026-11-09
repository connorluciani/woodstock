/* Money helpers. One formatter for the whole app (the prototype had WS.fmt.cad, E.cad and three local copies).
   No Intl: React Native's Hermes ships partial Intl, so grouping is done by hand and matches en-CA output. */

/** U+2212, the minus sign the prototype prints. */
export const MINUS = "−";

/** Number or fallback (the prototype's num()). */
export function num(v: unknown, d = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

/** Round to cents, treating non-numbers as 0. */
export function round2(n: unknown): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Whole dollars to the nearest $10, and down to $10 (the prototype's r10 and f10). */
export const r10 = (n: number): number => Math.round(n / 10) * 10;
export const f10 = (n: number): number => Math.floor(n / 10) * 10;

/** Dollars to integer cents and back (production storage, R13). */
export const toCents = (dollars: number): number => Math.round(dollars * 100);
export const fromCents = (cents: number): number => cents / 100;

function group(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "$1,234.56"; negatives get the minus sign when they round to at least a cent. */
export function cad(n: unknown): string {
  const v = Number(n) || 0;
  const parts = (Math.round(Math.abs(v) * 100) / 100).toFixed(2).split(".");
  const neg = v < 0 && Math.abs(v) >= 0.005;
  return (neg ? MINUS : "") + "$" + group(parts[0] ?? "0") + "." + (parts[1] ?? "00");
}

/** "$1,235": whole dollars. */
export function cad0(n: unknown): string {
  const v = Number(n) || 0;
  const r = Math.round(Math.abs(v));
  const neg = v < 0 && Math.round(v) !== 0;
  return (neg ? MINUS : "") + "$" + group(String(r));
}

/** "+$12.00" or "−$12.00". */
export function signed(n: unknown): string {
  const v = Number(n) || 0;
  return (v < 0 ? MINUS : "+") + cad(Math.abs(v));
}
