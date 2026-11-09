/* Loads the prototype fixtures recorded by scripts/oracle.cjs (TZ=UTC) and qa/engine/golden.json. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const P: any = JSON.parse(readFileSync(join(here, "..", "fixtures", "prototype_v7_3_2.json"), "utf8"));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GOLDEN: any = JSON.parse(readFileSync(join(here, "..", "fixtures", "golden_v7_3_2.json"), "utf8"));

const r2 = (n: number): number => Math.round(n * 100) / 100;
/** The qa/engine snapshot normaliser: numbers to cents, keys sorted, functions dropped, Dates as ISO strings. */
export function plain(v: unknown): unknown {
  if (typeof v === "function" || v === undefined) return undefined;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") return r2(v);
  if (Array.isArray(v)) return v.map((x) => { const y = plain(x); return y === undefined ? null : y; });
  if (v && typeof v === "object") { const o: Record<string, unknown> = {}; Object.keys(v).sort().forEach((k) => { const x = plain((v as Record<string, unknown>)[k]); if (x !== undefined) o[k] = x; }); return o; }
  return v;
}
export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
export const STAMP = { iso: "2026-11-09T09:42:00", date: "Nov 9", time: "9:42 AM" };
