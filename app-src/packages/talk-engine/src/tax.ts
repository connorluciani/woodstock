/* Take-home pay estimate, Ontario 2026: federal and Ontario tax, surtax, Ontario Health Premium, CPP, CPP2 and EI.
   Our own arithmetic from published 2026 rates, shown as an estimate. D-20:07 asks for one tax model: when
   @woodstock/engine exports takeHome, re-export it here and delete this file. */
export const TAX = {
  fed: { b: [[58523, 0.14], [117045, 0.205], [181440, 0.26], [258482, 0.29], [Infinity, 0.33]], bpa: 16452, cea: 1501, low: 0.14 },
  on: { b: [[53891, 0.0505], [107785, 0.0915], [150000, 0.1116], [220000, 0.1216], [Infinity, 0.1316]], bpa: 12989, low: 0.0505, s1: 5818, s2: 7446 },
  cpp: { ympe: 74600, ybe: 3500, rate: 0.0595, base: 0.0495, yampe: 85000, rate2: 0.04 },
  ei: { max: 68900, rate: 0.0163 }
};
export function prog(t: number, B: number[][]) { var tax = 0, lo = 0; for (var i = 0; i < B.length; i++) { var hi = B[i][0]; if (t > lo) tax += (Math.min(t, hi) - lo) * B[i][1]; lo = hi; } return tax; }
export function ohp(t: number) { if (t <= 20000) return 0; if (t <= 36000) return Math.min(300, 0.06 * (t - 20000)); if (t <= 48000) return Math.min(450, 300 + 0.06 * (t - 36000)); if (t <= 72000) return Math.min(600, 450 + 0.25 * (t - 48000)); if (t <= 200000) return Math.min(750, 600 + 0.25 * (t - 72000)); return Math.min(900, 750 + 0.25 * (t - 200000)); }
export function takeHome(gross: number, ppy = 26): { gross: number; year: number; perPay: number; tax: number; cpp: number; ei: number } {
  var C = TAX.cpp, pens = Math.max(0, Math.min(gross, C.ympe) - C.ybe), cpp = pens * C.rate, cppBase = pens * C.base, cppEnh = cpp - cppBase;
  var cpp2 = Math.max(0, Math.min(gross, C.yampe) - C.ympe) * C.rate2, ei = Math.min(gross, TAX.ei.max) * TAX.ei.rate;
  var taxable = gross - cppEnh - cpp2;
  var fed = Math.max(0, prog(taxable, TAX.fed.b) - TAX.fed.low * (TAX.fed.bpa + Math.min(TAX.fed.cea, gross) + cppBase + ei));
  var onb = Math.max(0, prog(taxable, TAX.on.b) - TAX.on.low * (TAX.on.bpa + cppBase + ei));
  var sur = 0.2 * Math.max(0, onb - TAX.on.s1) + 0.36 * Math.max(0, onb - TAX.on.s2);
  var net = gross - fed - onb - sur - ohp(taxable) - cpp - cpp2 - ei;
  return { gross: gross, year: net, perPay: net / ppy, tax: fed + onb + sur + ohp(taxable), cpp: cpp + cpp2, ei: ei };
}

