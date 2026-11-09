/* CR12 s3: the subscription pay sheet ($15 a month plus sales tax; free for testers). R10: tax by province, an estimate to confirm. */
import type { DemoState } from "./types.ts";
import { cad, round2 } from "./money.ts";

export const SALES_TAX: Record<string, { name: string; rate: number; label: string }> = { ON: { name: "HST", rate: 0.13, label: "Ontario" } };

export function paySheet(s: DemoState): { merchant: string; price: number; total: number; region: string; priceLine: string; termsLine: string; first: string } {
  const S0 = s.subscription || {}, price = Number(S0.price) || 15, t = SALES_TAX[(s.user && s.user.province) || "ON"] || SALES_TAX.ON!;
  const total = round2(price * (1 + (S0.taxRate != null ? S0.taxRate : t.rate))), ends = S0.trialEnds || "";
  return { merchant: "Woodstock", price, total, region: t.label, priceLine: cad(price) + " a month plus tax (" + cad(total) + " in " + t.label + ")",
    termsLine: "Free until " + ends + ", then renews monthly until you cancel.", first: ends };
}
/** The sales tax on one month. */
export function subTax(s: DemoState): number {
  const S0 = s.subscription; if (!S0) return 0;
  return Math.round((Number(S0.price) || 0) * (S0.taxRate || 0.13) * 100) / 100;
}
