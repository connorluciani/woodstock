/* Shared loader for the parity tests: the RN engine, the prototype oracle fixture, the golden figures. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..", "..");
export const ENGINE_SRC = path.join(ROOT, "packages", "engine", "src");
export const FIXTURE = process.env.WS_ORACLE || path.join(ROOT, "packages", "engine", "test", "fixtures", "prototype_v7_3_2.json");

export const E = await import(path.join(ENGINE_SRC, "index.ts")).catch((e) => ({ __loadError: String(e && e.message || e) }));
export const F = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));

/* Directive 22:40 and cr12demo.py V721_GOALS: the goal figures after both demo approvals. Typed in on purpose,
   so a regenerated oracle cannot silently move them. */
export const GOLDEN_GOALS = { ny: 900, home: 6165.14, retire: 4076.41, later: 1678.6 };
export const GOLDEN_NAMES = { ny: "New York with Aaron", home: "First home", retire: "Retirement", later: "Investing for later" };
export const PULL_LINES = { ny: 175, home: 666, retire: 200, later: 100 };
export const STAMP = { iso: "2026-11-09T09:42:00", date: "Nov 9", time: "9:42 AM" };

export const J = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));
export const fresh = () => J(F.state);
export const r2 = (n) => Math.round(Number(n) * 100) / 100;

/* skip reason when the engine lacks any of the names */
export function need(...names) {
  if (E.__loadError) return "engine does not load: " + E.__loadError.slice(0, 200);
  const miss = names.filter((n) => typeof E[n] === "undefined");
  return miss.length ? "engine has no " + miss.join(", ") + " yet" : false;
}

/* Deep compare with money tolerance (half a cent) on numbers. Returns the first few differences. */
export function diff(a, b, at = "", out = []) {
  if (out.length > 6) return out;
  if (typeof a === "number" && typeof b === "number") { if (Math.abs(a - b) > 0.005) out.push(`${at}: ${a} vs ${b}`); return out; }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") { if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${at}: ${JSON.stringify(a)?.slice(0, 80)} vs ${JSON.stringify(b)?.slice(0, 80)}`); return out; }
  if (Array.isArray(a) !== Array.isArray(b)) { out.push(`${at}: array vs object`); return out; }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) diff(a[k], b[k], at ? at + "." + k : k, out);
  return out;
}
/* Like diff, but compares only the keys the expected value has. */
export function diffExpected(actual, expected, at = "", out = []) {
  if (out.length > 6) return out;
  if (expected === null || typeof expected !== "object") return diff(actual, expected, at, out);
  if (actual === null || typeof actual !== "object") { out.push(`${at}: missing (${JSON.stringify(actual)})`); return out; }
  for (const k of Object.keys(expected)) diffExpected(actual[k], expected[k], at ? at + "." + k : k, out);
  return out;
}

/* The prototype's "ready" boot (oracle.cjs boot()) through the RN engine. */
export function boot(s) {
  if (E.applyBoot) return E.applyBoot(s) || s;
  E.applyKeepDefaults(s); if (E.applyPlanPerPay) E.applyPlanPerPay(s); if (E.applyBatch) E.applyBatch(s);
  return s;
}
