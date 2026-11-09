/* Portfolio bands (CR11 s13): what she would have put in over 1 or 5 years and the rough (5th), typical (25th to
   75th) and good (95th percentile) results, from @woodstock/engine's ASSUMPTIONS (FP Canada 2026 returns, Woodstock's
   own volatility). Ported from Engineer 2's prototype WS.pfBands.compute so the portfolio chat quotes the same
   figures as the cards. Lognormal monthly returns with mid-month deposits; the exact mean, variance and skewness of
   the end value are matched by a shifted lognormal and the percentiles read from it.
   Engine owner: when @woodstock/engine exports a bands function, re-export it here and delete this file. */
import * as E from "./env.ts";

const A = E.ASSUMPTIONS;
const rnd = (n: number): number => Math.round(n / A.roundTo) * A.roundTo;
const feeOf = (mer: unknown): number => { const m = /([\d.]+)\s*%/.exec(String(mer || "")); return m ? Number(m[1]) : 0; };

export interface Rates { blend: number; fee: number; net: number; sigma: number; mix: { stocks: number; bond: number; cash: number } }
export interface Bands { putIn: number; years: number; p5: number; p25: number; p50: number; p75: number; p95: number; rates: Rates }

export function mix(p: any): { stocks: number; bond: number; cash: number } | null {
  const sl = p.sleeves || {}; let tot = 0; const out = { stocks: 0, bond: 0, cash: 0 };
  Object.keys(sl).forEach((k) => { tot += E.num(sl[k]); });
  if (!tot) return null;
  Object.keys(sl).forEach((k) => { const w = E.num(sl[k]) / tot; if (A.stockSleeves.indexOf(k) > -1) out.stocks += w; else if (k === "bond") out.bond += w; else out.cash += w; });
  return out;
}
export function rates(p: any): Rates | null {
  const sl = p.sleeves || {}; let tot = 0, r = 0;
  Object.keys(sl).forEach((k) => { const w = E.num(sl[k]); if (A.returns[k] == null) return; tot += w; r += w * A.returns[k]!; });
  const m = mix(p); if (!tot || !m) return null;
  const blend = r / tot, fee = feeOf(p.mer), net = blend - fee;
  const s = m.stocks * A.vol.stocks, b = m.bond * A.vol.bond, c = m.cash * A.vol.cash;
  return { blend, fee, net, sigma: Math.sqrt(s * s + b * b + c * c + 2 * A.corrStocksBonds * s * b), mix: m };
}
/** Her planned investing a month (the payday request's invest amount). */
export function plannedMonthly(s: any): number { const P = s.plan || {}, I = s.income || {}; return E.num(P.investPerPay) * E.ppyOf(I.freq) / 12; }

const memo: Record<string, Bands> = {};
export function compute(s: any, p: any, opts?: { years?: number; monthly?: number }): Bands | null {
  const R = rates(p); if (!R) return null;
  const years = (opts && opts.years) || 1, monthly = opts && opts.monthly != null ? opts.monthly : plannedMonthly(s);
  const key = [years, Math.round(monthly * 100), R.net.toFixed(6), R.sigma.toFixed(6)].join("|");
  if (memo[key]) return memo[key]!;
  const putIn = Math.round(monthly * 12) * years;
  if (!(putIn > 0)) return null;
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
  let q: (z: number) => number;
  if (skew > 1e-6) {
    let lo = 1, hi = 2;
    while ((hi + 2) * Math.sqrt(hi - 1) < skew) hi *= 2;
    for (let it = 0; it < 200; it++) { const mid = (lo + hi) / 2; if ((mid + 2) * Math.sqrt(mid - 1) < skew) lo = mid; else hi = mid; }
    const om = (lo + hi) / 2, ls3 = Math.sqrt(Math.log(om)), em = sd / Math.sqrt(om * (om - 1)), tau = M - em * Math.sqrt(om), lm3 = Math.log(em);
    q = (z) => tau + Math.exp(lm3 + z * ls3);
  } else {
    const ls2 = Math.log(1 + V / (M * M)), lm = Math.log(M) - ls2 / 2, ls = Math.sqrt(ls2);
    q = (z) => Math.exp(lm + z * ls);
  }
  const out: Bands = { putIn, years, rates: R, p5: rnd(q(A.z.p5)), p25: rnd(q(A.z.p25)), p50: rnd(q(A.z.p50)), p75: rnd(q(A.z.p75)), p95: rnd(q(A.z.p95)) };
  memo[key] = out;
  return out;
}
