/* Projections (R7): goal projections and the portfolio bands, from one assumptions table.
   Bands: monthly deposits mid-month, monthly log returns normal with mean ln(1 + net)/12 and sd sigma/sqrt(12);
   the exact mean, variance and skewness of the end value are matched by a shifted lognormal and the percentiles
   read from it (the prototype's portfolio bands module, checked there against a 400,000-path simulation). */
import type { Ctx, DemoState, Goal, Portfolio } from "./types.ts";
import { ASSUMPTIONS } from "./assumptions.ts";
import { DAY_MS, isoDate, noon, parseDate, today, ymd } from "./dates.ts";
import { income, payDates, ppyOf } from "./schedule.ts";
import { pendingFor, goalStatus, type GoalStatus } from "./goals.ts";
import { account } from "./accounts.ts";
import { goalPortfolio, holdYears } from "./portfolios.ts";

const A = ASSUMPTIONS;
function feeOf(mer: unknown, dflt: number): number { const m = /([\d.]+)\s*%/.exec(String(mer || "")); return m ? Number(m[1]) : dflt; }

/* ---------------- portfolio bands ---------------- */

export interface BandRates { blend: number; fee: number; net: number; sigma: number; mix: { stocks: number; bond: number; cash: number } }
export interface Bands {
  putIn: number; years: number; monthly?: number; mean?: number; sd?: number; skew?: number; fit?: string; rates: BandRates;
  exact?: { p5: number; p25: number; p50: number; p75: number; p95: number };
  p5?: number; p25?: number; p50?: number; p75?: number; p95?: number;
}

function mixOf(p: Portfolio): { stocks: number; bond: number; cash: number } | null {
  const sl = p.sleeves || {}; let tot = 0; const out = { stocks: 0, bond: 0, cash: 0 };
  Object.keys(sl).forEach((k) => { tot += Number(sl[k]) || 0; });
  if (!tot) return null;
  Object.keys(sl).forEach((k) => { const w = (Number(sl[k]) || 0) / tot; if (A.stockSleeves.indexOf(k) > -1) out.stocks += w; else if (k === "bond") out.bond += w; else out.cash += w; });
  return out;
}

/** Expected yearly return (blend by sleeve, less the portfolio's fee) and volatility (stocks as one block). */
export function bandRates(p: Portfolio): BandRates | null {
  const sl = p.sleeves || {}; let tot = 0, r = 0;
  Object.keys(sl).forEach((k) => { const w = Number(sl[k]) || 0; if (A.returns[k] == null) return; tot += w; r += w * A.returns[k]!; });
  const m = mixOf(p); if (!tot || !m) return null;
  const blend = r / tot, fee = feeOf(p.mer, 0), net = blend - fee;
  const st = m.stocks * A.vol.stocks, b = m.bond * A.vol.bond, c = m.cash * A.vol.cash;
  const sigma = Math.sqrt(st * st + b * b + c * c + 2 * A.corrStocksBonds * st * b);
  return { blend, fee, net, sigma, mix: m };
}

/** Her planned investing a month: the invested goals' per-pay total times her paydays, over 12. */
export function plannedMonthly(s: DemoState): number {
  return (Number((s.plan || {}).investPerPay) || 0) * ppyOf(s.income && s.income.freq) / 12;
}

const rnd = (n: number): number => Math.round(n / A.roundTo) * A.roundTo;

function bandsRaw(R: BandRates, years: number, monthly: number): Bands {
  const putIn = Math.round(monthly * 12) * years;
  if (!(putIn > 0)) return { putIn: 0, years, rates: R };
  const c = putIn / (12 * years), n = 12 * years;
  const mu = Math.log(1 + R.net / 100) / 12, s2 = Math.pow(R.sigma / 100, 2) / 12, g = Math.exp(mu + s2 / 2);
  const d: number[] = []; for (let k = 1; k <= n; k++) d.push(n - k + 0.5);
  const gp = d.map((x) => Math.pow(g, x));
  let M = 0, M2 = 0, M3 = 0;
  for (let i = 0; i < n; i++) {
    M += c * gp[i]!;
    for (let j = 0; j < n; j++) {
      M2 += c * c * gp[i]! * gp[j]! * Math.exp(s2 * Math.min(d[i]!, d[j]!));
      for (let k3 = 0; k3 < n; k3++) {
        const x1 = d[i]!, x2 = d[j]!, x3 = d[k3]!, mn = Math.min(x1, x2, x3), md = x1 + x2 + x3 - mn - Math.max(x1, x2, x3);
        M3 += c * c * c * gp[i]! * gp[j]! * gp[k3]! * Math.exp(s2 * (md + 2 * mn));
      }
    }
  }
  const V = Math.max(1e-9, M2 - M * M), sd = Math.sqrt(V), skew = (M3 - 3 * M * V - M * M * M) / (V * sd);
  let q: (z: number) => number, fit: string;
  if (skew > 1e-6) {
    let lo = 1, hi = 2;
    while ((hi + 2) * Math.sqrt(hi - 1) < skew) hi *= 2;
    for (let it = 0; it < 200; it++) { const mid = (lo + hi) / 2; if ((mid + 2) * Math.sqrt(mid - 1) < skew) lo = mid; else hi = mid; }
    const om = (lo + hi) / 2, ls3 = Math.sqrt(Math.log(om)), em = sd / Math.sqrt(om * (om - 1)), tau = M - em * Math.sqrt(om), lm3 = Math.log(em);
    q = (z) => tau + Math.exp(lm3 + z * ls3); fit = "shifted lognormal, three moments";
  } else {
    const ls2 = Math.log(1 + V / (M * M)), lm = Math.log(M) - ls2 / 2, ls = Math.sqrt(ls2);
    q = (z) => Math.exp(lm + z * ls); fit = "lognormal, two moments";
  }
  const exact = { p5: q(A.z.p5), p25: q(A.z.p25), p50: q(A.z.p50), p75: q(A.z.p75), p95: q(A.z.p95) };
  return { putIn, years, monthly: c, mean: M, sd, skew, fit, rates: R, exact, p5: rnd(exact.p5), p25: rnd(exact.p25), p50: rnd(exact.p50), p75: rnd(exact.p75), p95: rnd(exact.p95) };
}

const memo = new Map<string, Bands>();
/** Rough (5th), typical (25th to 75th) and good (95th) outcomes for her planned investing over 1 or 5 years. */
export function portfolioBands(s: DemoState, p: Portfolio, opts: { years?: number; monthly?: number } = {}): Bands | null {
  const R = bandRates(p); if (!R) return null;
  const years = opts.years || 1, monthly = opts.monthly != null ? opts.monthly : plannedMonthly(s);
  const key = [years, Math.round(monthly * 100), R.net.toFixed(6), R.sigma.toFixed(6)].join("|");
  const hit = memo.get(key); if (hit) return hit;
  const b = bandsRaw(R, years, monthly); memo.set(key, b); return b;
}

/* ---------------- holding period note (Directive 20:40 item 2, Compliance 20:45 final copy) ---------------- */

/** A neutral note when a goal's date is sooner than its portfolio's suggested holding period; "" otherwise. */
export function holdNote(s: DemoState, g: Goal, ctx?: Ctx): string {
  const c = ctx ?? { today: today(s) };
  if (!g || !g.invested || !g.by) return "";
  const p = goalPortfolio(s, g), hy = holdYears(p), by = parseDate(g.by);
  if (!p || !hy || !by) return "";
  const yrs = (by.getTime() - c.today.getTime()) / (365.25 * DAY_MS);
  if (!(yrs < hy)) return "";
  const n = Math.round(yrs);
  return (yrs < 1 ? "This goal is less than a year away. " : "This goal is about " + n + (n === 1 ? " year" : " years") + " away. ") + p.name + " is generally meant for money you won’t need for " + hy + " or more years.";
}

/* ---------------- goal projection (CR11 s4) ---------------- */

export interface GoalRates { portfolio: string; sleeves: Record<string, number>; parts: string[]; blend: number; fee: number; mid: number; low: number; realMid: number; realLow: number }
export interface ProjectionPoint { d: Date; dep: number; lo: number; hi: number }
export interface Horizon { id: string; label: string; years: number; phrase: string }
export interface GoalProjection {
  goal: Goal; today: Date; per: number; perPayRaw: number; paused: boolean; target: number; invested: boolean; saved: number; pending: number; start: number;
  by: Date | null; monthly: number; ppy: number; status: GoalStatus | null; mode: "done" | "pace" | "none" | "invested" | "cash";
  rates?: GoalRates | null; history?: { d: Date; v: number }[]; horizons?: Horizon[]; horizon?: Horizon; end?: Date; points?: ProjectionPoint[];
  put?: number; lo?: number | null; hi?: number | null; reach?: Date | null; paysToReach?: number; paysToBy?: number; needPerPay?: number | null; onTime?: boolean;
  bandAtReach?: { lo: number; hi: number } | null;
}

function portfolioForGoal(s: DemoState, goal: Goal): { name: string; sleeves: Record<string, number>; fee: number } | null {
  const acct = goal.account ? account(s, goal.account) : null;
  const P = s.portfolios || [], name = (acct && acct.portfolio) || (s.target && s.target.name);
  const gpf0 = goalPortfolio(s, goal);
  if (gpf0 && gpf0.sleeves) return { name: gpf0.name, sleeves: gpf0.sleeves, fee: feeOf(gpf0.mer, A.projectionFeeDefault) };
  const pf = P.find((p) => p.name === name || p.id === name || (!!s.target && !acct && p.id === s.target.id));
  if (pf && pf.sleeves) return { name: pf.name, sleeves: pf.sleeves, fee: feeOf(pf.mer, A.projectionFeeDefault) };
  /* Build my own, or an unknown portfolio: the account's holdings, only when every holding has a known sleeve */
  const H = (acct && acct.holdings) || [], sl: Record<string, number> = {}; let tot = 0, ok = H.length > 0;
  H.forEach((h) => { const v = (Number(h.units) || 0) * (Number(h.price) || 0); if (!h.sleeve || !A.returns[h.sleeve]) ok = false; const k = String(h.sleeve); sl[k] = (sl[k] || 0) + v; tot += v; });
  if (ok && tot > 0 && !(goal.customMix || (s.target && /own|custom/i.test(s.target.id || "")))) {
    Object.keys(sl).forEach((k) => { sl[k] = sl[k]! / tot * 100; });
    return { name: (acct && acct.portfolio) || "your mix", sleeves: sl, fee: A.projectionFeeDefault };
  }
  return null;
}

/** A goal's average and lower return lines: the portfolio's sleeves at the assumed returns, less fees; real values after inflation. */
export function goalRates(s: DemoState, goal: Goal): GoalRates | null {
  const pf = portfolioForGoal(s, goal); if (!pf) return null;
  let w = 0, r = 0; const parts: string[] = [];
  Object.keys(pf.sleeves).forEach((k) => { const p = Number(pf.sleeves[k]) || 0; if (p <= 0 || A.returns[k] == null) return; w += p; r += p * A.returns[k]!; parts.push(k); });
  if (!w) return null;
  const blend = r / w, mid = blend - pf.fee, low = mid - A.stressPts;
  return { portfolio: pf.name, sleeves: pf.sleeves, parts, blend, fee: pf.fee, mid, low,
    realMid: ((1 + mid / 100) / (1 + A.inflation / 100) - 1) * 100, realLow: ((1 + low / 100) / (1 + A.inflation / 100) - 1) * 100 };
}

function ageNow(s: DemoState, t0: Date): number | null {
  const U = s.user || {};
  if (Number(U.age) > 0) return Number(U.age);
  if (U.ageFacts && Number(U.ageFacts.age) > 0) return Number(U.ageFacts.age);
  if (Number(U.birthYear) > 1900) return t0.getUTCFullYear() - Number(U.birthYear);
  return null;
}
function horizonsFor(s: DemoState, t0: Date): Horizon[] {
  const a = ageNow(s, t0);
  if (a != null) return [55, 60, 65].filter((x) => x > a + 2).map((x) => ({ id: "age" + x, label: String(x), years: x - a, phrase: "by " + x }));
  return [10, 20, 30].map((y) => ({ id: "y" + y, label: y + " years", years: y, phrase: "in " + y + " years" }));
}

/** The numbers behind a goal's projection chart: deposits on each payday, with the average and lower return lines for invested goals. */
export function goalProjection(s: DemoState, goal: Goal, opts: { horizon?: string } = {}, ctx?: Ctx): GoalProjection {
  const c = ctx ?? { today: today(s) };
  const g = goal, t0 = noon(c.today), I = income(s, c), ppy = ppyOf(I.freq);
  const per = g.paused ? 0 : Number(g.perPay) || 0, target = Number(g.target) || 0, invested = !!g.invested;
  const saved = Number(g.saved) || 0, pending = invested ? 0 : pendingFor(s, g), start = saved + pending, by = parseDate(g.by);
  const M: GoalProjection = { goal: g, today: t0, per, perPayRaw: Number(g.perPay) || 0, paused: !!g.paused, target, invested, saved, pending, start, by,
    monthly: g.monthly ? Number(g.monthly) : Math.round((Number(g.perPay) || 0) * ppy / 12), ppy, status: goalStatus(s, g, c), mode: "cash" };
  if (target > 0 && start >= target) { M.mode = "done"; return M; }
  if (!(target > 0)) M.mode = (Number(g.perPay) || 0) > 0 ? "pace" : "none";
  else M.mode = invested ? "invested" : "cash";
  M.rates = invested ? goalRates(s, g) : null;

  /* history from recorded deposits (most recent first) */
  const hist: { d: Date; v: number }[] = [];
  if (g.deposits && g.deposits.length) {
    let v = saved;
    hist.push({ d: t0, v: saved });
    g.deposits.slice(0, 8).forEach((dp) => {
      let d = parseDate(dp.when || dp.dateISO) || parseDate(dp.date + ", " + t0.getUTCFullYear());
      if (!d) return;
      if (d > t0) d = ymd(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate());
      hist.push({ d, v }); v -= Number(dp.amount) || 0; hist.push({ d: new Date(d.getTime() - 1), v: Math.max(0, v) });
    });
    const first = hist[hist.length - 1]!; hist.push({ d: new Date(first.d.getTime() - 14 * DAY_MS), v: first.v });
    hist.reverse();
  }
  M.history = hist;

  if (M.mode === "pace" || M.mode === "none") {
    const H = horizonsFor(s, t0), sel = H.find((h) => h.id === opts.horizon) || H[H.length - 1]!;
    M.horizons = H; M.horizon = sel;
    const end = ymd(t0.getUTCFullYear() + sel.years, t0.getUTCMonth(), t0.getUTCDate());
    M.end = end;
    const R = M.rates, pts: ProjectionPoint[] = [], P = payDates(I, t0, end);
    let dep = saved, lo = saved, hi = saved, last = t0;
    const mk = (d: Date): void => { pts.push({ d, dep, lo, hi }); };
    mk(t0);
    P.forEach((d, i) => {
      if (R) { const yrs = (d.getTime() - last.getTime()) / (365.25 * DAY_MS); lo *= Math.pow(1 + R.realLow / 100, yrs); hi *= Math.pow(1 + R.realMid / 100, yrs); }
      dep += per; lo += per; hi += per; last = d;
      if (i % Math.max(1, Math.round(ppy / 12)) === 0 || i === P.length - 1) mk(d);
    });
    M.points = pts; M.put = dep; M.lo = R ? lo : null; M.hi = R ? hi : null;
    return M;
  }

  /* target goals: deposits each payday until reached, then on to the later of the date and the reach */
  const limit = ymd(t0.getUTCFullYear() + 40, 0, 1), P2 = per > 0 ? payDates(I, t0, limit, 1100) : [], need = target - start;
  let reach: Date | null = null, k = 0;
  if (per > 0) { k = Math.ceil(need / per - 1e-9); reach = P2[k - 1] ?? null; }
  M.reach = reach; M.paysToReach = k;
  let endT = reach && by ? (reach > by ? reach : by) : reach || by || ymd(t0.getUTCFullYear() + 1, t0.getUTCMonth(), t0.getUTCDate());
  endT = new Date(endT.getTime() + Math.max(28 * DAY_MS, (endT.getTime() - t0.getTime()) * 0.08));
  M.end = endT;
  if (by) {
    const nBy = payDates(I, t0, by).length; M.paysToBy = nBy;
    M.needPerPay = nBy > 0 ? Math.ceil((target - start) / nBy) : null;
    M.onTime = reach ? reach <= by : false;
  }
  const R2 = M.rates, pts2: ProjectionPoint[] = [];
  let dep2 = start, lo2 = start, hi2 = start, last2 = t0;
  pts2.push({ d: t0, dep: dep2, lo: lo2, hi: hi2 });
  payDates(I, t0, endT, 1100).forEach((d) => {
    if (R2) { const yrs = (d.getTime() - last2.getTime()) / (365.25 * DAY_MS); lo2 *= Math.pow(1 + R2.low / 100, yrs); hi2 *= Math.pow(1 + R2.mid / 100, yrs); }
    const add = dep2 < target ? Math.min(per, Math.max(0, target - dep2)) : 0;
    dep2 += add; lo2 += add; hi2 += add; last2 = d;
    pts2.push({ d, dep: dep2, lo: lo2, hi: hi2 });
  });
  const lp = pts2[pts2.length - 1]!;
  if (lp.d < endT) pts2.push({ d: endT, dep: lp.dep, lo: lp.lo, hi: lp.hi });
  M.points = pts2;
  if (R2 && reach) { const at = pts2.filter((p) => p.d <= reach!).pop(); M.bandAtReach = at ? { lo: at.lo, hi: at.hi } : null; }
  return M;
}

/** ISO date of a projection's reach, for display and tests. */
export function reachIso(M: GoalProjection): string | null { return M.reach ? isoDate(M.reach) : null; }
