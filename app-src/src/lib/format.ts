/*
 * Display formatting (UX spec 11.2). Formatting only: no money logic here (that is the engine's).
 * - Whole dollars for planning figures; cents only for exact account values.
 * - Thousands separator always; negatives as U+2212 minus then dollar sign ("−$1,240").
 * - en-CA dates: "Fri, Nov 20", "April 2027", "Apr 30, 2027".
 */
const MINUS = "−";

export function cad0(n: number): string {
  const v = Math.round(Number(n) || 0);
  const s = Math.abs(v).toLocaleString("en-CA", { maximumFractionDigits: 0 });
  return (v < 0 ? MINUS : "") + "$" + s;
}

export function cad2(n: number): string {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  const s = Math.abs(v).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < 0 ? MINUS : "") + "$" + s;
}

export function pct(n: number, digits = 0): string {
  return (Number(n) || 0).toFixed(digits) + "%";
}

const toDate = (d: Date | string) => (typeof d === "string" ? new Date(d.length <= 10 ? d + "T12:00:00" : d) : d);

export function dayShort(d: Date | string): string {
  return toDate(d).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }).replace(/\./g, "");
}
export function monthDay(d: Date | string): string {
  return toDate(d).toLocaleDateString("en-CA", { month: "short", day: "numeric" }).replace(/\./g, "");
}
export function monthYear(d: Date | string): string {
  return toDate(d).toLocaleDateString("en-CA", { month: "long", year: "numeric" });
}
export function fullDate(d: Date | string): string {
  return toDate(d).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }).replace(/\./g, "");
}

/* Guard for visible copy: the lint script and dev builds flag these. */
export const BANNED_DASHES = /[\u2013\u2014]/;
