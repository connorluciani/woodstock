/* One assumptions table (R7, D-15:06): merges the prototype's WS.PROJECTION_ASSUMPTIONS and WS.PF_BANDS_ASSUMPTIONS,
   which carried the same returns. */

export const ASSUMPTIONS = {
  version: "assumptions-2026.1",
  /* FP Canada and Institute of Financial Planning, 2026 Projection Assumption Guidelines (April 2026).
     Geometric (compound) average yearly returns, before fees, in percent. */
  source: "FP Canada and Institute of Financial Planning, 2026 Projection Assumption Guidelines (April 2026)",
  inflation: 2.1,
  returns: { cash: 2.4, bond: 3.2, cad: 6.3, us: 6.4, intl: 6.6, em: 7.5 } as Record<string, number>,
  labels: { cash: "cash", bond: "bonds", cad: "Canadian stocks", us: "US stocks", intl: "international stocks", em: "emerging-market stocks" } as Record<string, string>,
  /* Woodstock's own volatility assumptions (the guidelines publish none): yearly standard deviation in percent,
     stocks treated as one block, and the stock and bond correlation. Our observation, not a published figure. */
  vol: { stocks: 15, bond: 5, cash: 1 },
  corrStocksBonds: 0.2,
  stockSleeves: ["cad", "us", "intl", "em"] as readonly string[],
  /* The lower line on goal projections: returns this many points lower. Our own choice, not an FP Canada figure. */
  stressPts: 2,
  /* Suggested holding periods, the same for every client (Directive 18:25 example figures; Compliance to confirm).
     A portfolio may carry its own holdYears, which wins. */
  holdYears: { conservative: 3, balanced: 5, growth: 7, aggressive: 10 } as Record<string, number>,
  /* Standard normal quantiles for the band percentiles. */
  z: { p5: -1.6448536, p25: -0.6744898, p50: 0, p75: 0.6744898, p95: 1.6448536 },
  /* Band figures are shown to the nearest $100. */
  roundTo: 100,
  /* Fee assumed for a goal projection when the portfolio has no fee field (the projection module's default). */
  projectionFeeDefault: 0.15
} as const;

export type Assumptions = typeof ASSUMPTIONS;
