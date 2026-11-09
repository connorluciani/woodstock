/* Tax estimates (D-20:07): take-home pay, the RRSP refund and raises, from one 2026 federal and Ontario model.
   Our own arithmetic from published 2026 rates; every result is an estimate and is labelled as one on screen. */
import type { DemoState } from "./types.ts";
import { ppyOf } from "./schedule.ts";
import { MON3, MONL } from "./dates.ts";

export const TAX2026 = {
  fed: { b: [[58523, 0.14], [117045, 0.205], [181440, 0.26], [258482, 0.29], [Infinity, 0.33]] as [number, number][], bpa: 16452, cea: 1501, low: 0.14 },
  on: { b: [[53891, 0.0505], [107785, 0.0915], [150000, 0.1116], [220000, 0.1216], [Infinity, 0.1316]] as [number, number][], bpa: 12989, low: 0.0505, s1: 5818, s2: 7446 },
  cpp: { ympe: 74600, ybe: 3500, rate: 0.0595, base: 0.0495, yampe: 85000, rate2: 0.04 },
  ei: { max: 68900, rate: 0.0163 }
} as const;

function prog(t: number, B: readonly (readonly [number, number])[]): number {
  let tax = 0, lo = 0;
  for (const [hi, r] of B) { if (t > lo) tax += (Math.min(t, hi) - lo) * r; lo = hi; }
  return tax;
}
/** Ontario Health Premium. */
function ohp(t: number): number {
  if (t <= 20000) return 0; if (t <= 36000) return Math.min(300, 0.06 * (t - 20000)); if (t <= 48000) return Math.min(450, 300 + 0.06 * (t - 36000));
  if (t <= 72000) return Math.min(600, 450 + 0.25 * (t - 48000)); if (t <= 200000) return Math.min(750, 600 + 0.25 * (t - 72000)); return Math.min(900, 750 + 0.25 * (t - 200000));
}

export interface TakeHome { gross: number; year: number; perPay: number; tax: number; cpp: number; ei: number }

/** Take-home pay in Ontario for 2026 from a gross salary, before workplace deductions (pension, benefits). */
export function takeHome(gross: number, ppy = 26): TakeHome {
  const T = TAX2026, C = T.cpp;
  const pens = Math.max(0, Math.min(gross, C.ympe) - C.ybe), cpp = pens * C.rate, cppBase = pens * C.base, cppEnh = cpp - cppBase;
  const cpp2 = Math.max(0, Math.min(gross, C.yampe) - C.ympe) * C.rate2, ei = Math.min(gross, T.ei.max) * T.ei.rate;
  const taxable = gross - cppEnh - cpp2;
  const fed = Math.max(0, prog(taxable, T.fed.b) - T.fed.low * (T.fed.bpa + Math.min(T.fed.cea, gross) + cppBase + ei));
  const onb = Math.max(0, prog(taxable, T.on.b) - T.on.low * (T.on.bpa + cppBase + ei));
  const sur = 0.2 * Math.max(0, onb - T.on.s1) + 0.36 * Math.max(0, onb - T.on.s2);
  const net = gross - fed - onb - sur - ohp(taxable) - cpp - cpp2 - ei;
  return { gross, year: net, perPay: net / (ppy || 26), tax: fed + onb + sur + ohp(taxable), cpp: cpp + cpp2, ei };
}

/** The gross salary whose take-home is this per-pay amount, to the nearest $100. */
export function grossFor(perPay: number, ppy = 26): number {
  let lo = 15000, hi = 600000;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (takeHome(mid, ppy).perPay < perPay) lo = mid; else hi = mid; }
  return Math.round((lo + hi) / 2 / 100) * 100;
}

export interface IncomeProfile { gross: number; grossEntered: boolean; pay: number; ppy: number }

/** Her income for tax estimates: the gross a year she entered (CR9 02), else grossed up from take-home and marked as an estimate. */
export function incomeProfile(s: DemoState): IncomeProfile {
  const I = s.income || ({} as Partial<NonNullable<DemoState["income"]>>), ppy = ppyOf(I.freq), pay = Number(I.amount) || 0, g = Number(I.gross) || 0;
  return { gross: g > 0 ? g : pay > 0 ? grossFor(pay, ppy) : 0, grossEntered: g > 0, pay, ppy };
}

export interface RefundEstimate { amount: number; raw: number; gross: number; grossEstimated: boolean; rate: number }

/** The only refund arithmetic: tax that a deductible (RRSP or FHSA) contribution takes off her year, to the nearest $10. */
export function taxRefundEstimate(contribution: number, P: IncomeProfile | null | undefined): RefundEstimate | null {
  const G = P && P.gross, c = Math.max(0, Number(contribution) || 0);
  if (!P || !(G && G > 0)) return null;
  const raw = Math.max(0, takeHome(G, P.ppy).tax - takeHome(Math.max(0, G - c), P.ppy).tax);
  return { amount: Math.round(raw / 10) * 10, raw, gross: G, grossEstimated: !P.grossEntered, rate: c > 0 ? raw / c : 0 };
}

/** Her gross a year for a per-pay amount: her own profile when it is her current pay, else grossed up. */
function grossForHer(s: DemoState, perPay: number): number {
  const I = s.income, ppy = ppyOf(I && I.freq);
  if (I && Math.abs(perPay - (Number(I.amount) || 0)) < 0.5) return incomeProfile(s).gross;
  return grossFor(perPay, ppy);
}

/* ---------- raises and pay changes in her words (Talk it through, round 4 P0) ---------- */

/** The first amount in a message: "$8,000", "8k", "110 grand", "95,000 dollars". */
export function moneyIn(t: string): number | null {
  const m = /\$\s?(\d[\d,]*(?:\.\d+)?)\s?(k\b)?|\b(\d[\d,]*(?:\.\d+)?)\s?(k|grand|dollars|bucks)\b/i.exec(String(t || ""));
  if (!m) return null;
  const v = parseFloat(String(m[1] || m[3]).replace(/,/g, "")) * (m[2] || /k|grand/i.test(m[4] || "") ? 1000 : 1);
  return v > 0 ? v : null;
}
/** Salaries in a message, $20,000 and up: "$95,000", "95k", "110 000". */
export function salariesIn(q: string): number[] {
  const out: number[] = [], re = /\$?\s?(\d{2,3})(?:[,\s]?(\d{3}))?\s?(k\b)?(?:\s*(?:a|per|\/)\s*(?:year|yr|annum))?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(q))) { const v = m[3] ? +m[1]! * 1000 : m[2] ? +(m[1]! + m[2]) : 0; if (v >= 20000 && v <= 1000000 && out.indexOf(v) < 0) out.push(v); }
  return out;
}
function norm(t: string): string { return " " + String(t || "").toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ").trim() + " "; }
function payWords(q: string): { year: boolean; pay: boolean; month: boolean; inc: boolean } {
  return {
    year: /\b(a|per|each|every) year\b|\bannual(ly)?\b|\byearly\b|\/\s?yr\b|\ba yr\b|\bsalary\b/.test(q),
    pay: /\b(a|per|each|every) (pay|payday|paycheque|paycheck|cheque|check)\b|\bbi-?weekly\b|\bevery two weeks\b|\btake.?home\b/.test(q),
    month: /\b(a|per|each) month\b|\bmonthly\b/.test(q),
    inc: /\b(more|extra|on top|higher)\b|\b(raise|increase|bump) of\b|\bby \$|\bup \$/.test(q)
  };
}
function fromWhen(q: string): string | null {
  const m = /\b(?:in|from|starting|as of|effective|next)\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/.exec(q);
  if (!m) return null;
  const mi = MON3.map((x) => x.toLowerCase()).indexOf(m[1]!.slice(0, 3));
  return MONL[mi] ?? null;
}

export interface PayChange {
  /** How she said it. */
  kind: "salary" | "raise_year" | "month" | "per_pay" | "percent";
  /** The amount she gave (a year, a month or a pay, per kind). */
  amount: number;
  /** Her current take-home per pay and the new one (whole dollars, after tax). */
  fromPerPay: number; newPerPay: number; diffPerPay: number;
  /** True when the change is above 50% and she did not say "after tax" or "take-home": ask before a card. */
  needsConfirm: boolean;
  /** True when the new pay is within a dollar of today's: nothing to change. */
  same: boolean;
  /** "January" when she said when it starts. */
  from: string | null;
  /** Gross a year used, when the change went through the tax model. */
  gross: number | null;
}

/** A raise or a new pay from her message, as take-home per pay. "$8,000 more a year" is a yearly increase before tax. */
export function payChangeFromText(s: DemoState, text: string): PayChange | null {
  const q = norm(text), I = s.income, pay = Number(I && I.amount) || 0, ppy = ppyOf(I && I.freq);
  const card = (kind: PayChange["kind"], amount: number, np: number, explicit: boolean, gross: number | null): PayChange => {
    const diff = np - pay, ratio = Math.abs(diff) / Math.max(1, pay);
    return { kind, amount, fromPerPay: pay, newPerPay: np, diffPerPay: diff, needsConfirm: Math.abs(diff) >= 1 && ratio > 0.5 && !explicit, same: Math.abs(diff) < 1, from: fromWhen(q), gross };
  };
  const pct = /(\d{1,2}(?:\.\d)?)\s?%/.exec(q);
  const a = moneyIn(text);
  if (!a && pct && /\b(raise|promotion|promoted|increase|bump)\b/.test(q)) {
    const Gp = grossForHer(s, pay), g2 = Gp * (1 + +pct[1]! / 100);
    return card("percent", +pct[1]!, Math.round(takeHome(g2, ppy).perPay), false, g2);
  }
  if (!a) return null;
  const W = payWords(q), G = grossForHer(s, pay);
  if (W.year || (a >= 20000 && !W.pay && !W.month)) {
    if (W.inc || a < 20000) return card("raise_year", a, Math.round(takeHome(G + a, ppy).perPay), false, G + a);
    const pp = Math.round(takeHome(a, ppy).perPay);
    return { kind: "salary", amount: a, fromPerPay: pay, newPerPay: pp, diffPerPay: pp - pay, needsConfirm: false, same: Math.abs(pp - pay) < 1, from: fromWhen(q), gross: a };
  }
  if (W.month) {
    const pm = a * 12 / ppy;
    return card("month", a, Math.round(W.inc ? pay + pm : pm), W.pay || (!W.inc && /\btake.?home|after tax\b/.test(q)), null);
  }
  return card("per_pay", a, Math.round(W.inc ? pay + a : a), W.pay && /\b(after tax|take.?home|net|lands)\b/.test(q), null);
}
