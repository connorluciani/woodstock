/* The plan (R3, R5): income, essentials, pay yourself first (derived from her goals and debt payments),
   flexible spending and this month's allowance, by the month with per-pay equivalents. One budget for every screen. */
import type { AccountKey, Bill, Ctx, DemoState, Freq, Goal, SpendCat } from "./types.ts";
import { f10 } from "./money.ts";
import { fmtMonth, isoDate, MON3, today, ymd } from "./dates.ts";
import { FREQ_LABEL, income, ppyOf } from "./schedule.ts";
import { activeBills, billFactor, billMonthly } from "./obligations.ts";
import { goalAccounts, goalDone, liveGoals, payingGoals } from "./goals.ts";

export interface Budget {
  asOf: string; pay: number; freq: Freq; freqLabel: string; ppy: number; next: string; basis: string | undefined;
  payM: number; otherM: number; incomeM: number;
  bills: Bill[]; essBills: Bill[]; debtBills: Bill[]; essM: number; debtM: number; billsM: number; billsPP: number;
  goals: Goal[]; bufferM: number; goalsM: number; investM: number;
  /** Pay yourself first: money to goals a month (saveM) and with debt payments (pyfM). */
  saveM: number; pyfM: number;
  /** Flexible spending a month, and per pay (leftPP). */
  flexM: number; leftM: number; leftPP: number;
  /** Savings per pay: the payday request total. */
  save: number;
  /** This month's allowance after confirmed plan changes, and what is left of it today. */
  allowance: number; leftNow: number; perDay: number; perWeek: number;
  daysLeft: number; day: number; dim: number; monthLabel: string; monthEnd: string;
  cats: SpendCat[]; usualEv: number; evNow: number; usualToDate: number; ahead: number; projected: number; projectedLeft: number;
  flag: boolean; negative: boolean; catsAhead: { id: string; label: string; now: number; usualToDate: number }[];
  usualMonth: number; usualPP: number; suggest: number; suggestM: number;
}

/** Spending categories with purchases she added by hand. */
export function spendCats(s: DemoState): SpendCat[] {
  const sp = s.spending || {}, extra = sp._extra || [];
  return (sp.cats || []).map((c) => {
    const add = extra.filter((t) => t.cat === c.id).reduce((t, x) => t + x.amount, 0);
    return { id: c.id, label: c.label, usual: c.usual, now: Math.round((c.now + add) * 100) / 100 };
  });
}

/** Income, essentials, pay yourself first, flexible spending (CR9 05) with per-pay equivalents (CR8 s3). */
export function budget(s: DemoState, ctx?: Ctx): Budget {
  const c = ctx ?? { today: today(s) };
  const I = income(s, c), ppy = ppyOf(I.freq), pay = Number(I.amount) || 0, m = ppy / 12;
  const otherM = (I.other || []).reduce((t, o) => t + (Number(o.amount) || 0) * billFactor(o.freq), 0);
  const payM = pay * m, incomeM = payM + otherM;
  const bills = activeBills(s), debtBills = bills.filter((b) => b.category === "Debt"), essBills = bills.filter((b) => b.category !== "Debt");
  const essM = essBills.reduce((t, b) => t + billMonthly(b), 0), debtM = debtBills.reduce((t, b) => t + billMonthly(b), 0);
  const billsM = essM + debtM;
  const G = payingGoals(s);
  let bufferM = 0, goalsM = 0, investM = 0;
  G.forEach((g) => { const v = (Number(g.perPay) || 0) * m; if (g.kind === "emergency") bufferM += v; else if (g.invested) investM += v; else goalsM += v; });
  const saveM = bufferM + goalsM + investM, pyfM = debtM + saveM;
  const flexM = incomeM - essM - pyfM;
  const adj = (s.plan && s.plan.adjust) || [];
  const sp = s.spending || {}, dim = sp.daysInMonth || 30, day = sp.todayDay || c.today.getUTCDate(), daysLeft = Math.max(1, dim - day);
  const cats = spendCats(s), usualEv = cats.reduce((t, x) => t + x.usual, 0), evNow = cats.reduce((t, x) => t + x.now, 0);
  const fixedDay1 = sp.usualEverydayFixedDay1 || 0;
  let usualToDate = fixedDay1 + (usualEv - fixedDay1) * day / dim;
  if (sp.usualCurve && sp.thisCurve && sp.usualCurve[day] != null && sp.thisCurve[day] != null) {
    const billsToDate = sp.thisCurve[day]! - (sp.cats || []).reduce((t, x) => t + x.now, 0);
    usualToDate = sp.usualCurve[day]! - billsToDate;
  }
  /* plan changes she confirmed this month (affordability options) move the month's number, never money */
  const extraLeft = adj.reduce((t, a) => t + (Number(a.leftThisMonth) || 0), 0);
  const allowance = flexM + extraLeft, leftNow = allowance - evNow;
  const ahead = evNow - usualToDate, projected = evNow + (usualEv - usualToDate);
  const usualAt = (x: SpendCat): number => (x.id === "transit" ? x.usual : x.usual * day / dim);
  const catsAhead = cats.filter((x) => x.now - usualAt(x) > 40 && x.now > usualAt(x) * 1.3).map((x) => ({ id: x.id, label: x.label, now: x.now, usualToDate: usualAt(x) }));
  const usualMonth = billsM + usualEv, usualPP = usualMonth / m;
  const monthDate = ymd(c.today.getUTCFullYear(), c.today.getUTCMonth(), 1);
  return {
    asOf: sp.through || isoDate(c.today),
    pay, freq: I.freq, freqLabel: FREQ_LABEL[I.freq] || "every two weeks", ppy, next: I.next || isoDate(c.today), basis: I.basis,
    payM, otherM, incomeM,
    bills, essBills, debtBills, essM, debtM, billsM, billsPP: billsM / m,
    goals: G, bufferM, goalsM, investM, saveM, pyfM, flexM, save: saveM / m,
    leftPP: flexM / m, leftM: flexM, allowance, leftNow, perDay: leftNow / daysLeft, perWeek: leftNow / daysLeft * 7,
    daysLeft, day, dim, monthLabel: sp.monthLabel || fmtMonth(monthDate), monthEnd: MON3[c.today.getUTCMonth()] + " " + dim,
    cats, usualEv, evNow, usualToDate, ahead, projected, projectedLeft: allowance - projected,
    flag: ahead >= 50 && projected > allowance, negative: flexM < 0, catsAhead,
    usualMonth, usualPP, suggest: Math.max(0, f10(pay - usualPP)), suggestM: Math.max(0, f10(incomeM - usualMonth))
  };
}

/** Per-account amounts each payday for the invested goals (the split the payday request and orders use). */
export function planPerPay(s: DemoState): { perPay: Record<AccountKey, number>; investPerPay: number } {
  const per: Record<AccountKey, number> = { FHSA: 0, RRSP: 0, TFSA: 0 };
  liveGoals(s).forEach((g) => {
    if (g.invested && g.account && per[g.account as AccountKey] != null && !g.paused && !goalDone(g)) goalAccounts(s, g).forEach((x) => { per[x.account as AccountKey] += x.amount; });
  });
  return { perPay: per, investPerPay: per.FHSA + per.RRSP + per.TFSA };
}
/** Writes planPerPay into s.plan (the prototype's syncPlanPerPay). */
export function applyPlanPerPay(s: DemoState): { perPay: Record<AccountKey, number>; investPerPay: number } {
  const P = (s.plan = s.plan || {}), r = planPerPay(s);
  P.perPay = r.perPay; P.investPerPay = r.investPerPay;
  return r;
}

export interface PerPayChange { goalId: string; perPay: number }

/* Goals that take an increase first, and give back first on a decrease: by kind, in the prototype's order of ids
   ("later", "retire", "home"), so a goal she creates of those kinds is included (R5 step 2). */
const ORDER_KINDS = ["invest", "retirement", "home"];
function byKinds(G: Goal[]): Goal[] { return ORDER_KINDS.map((k) => G.find((g) => g.kind === k)).filter((g): g is Goal => !!g); }

/** Proposal for a monthly savings total: per-pay changes, nothing written. */
export function planSavingsTarget(s: DemoState, monthly: number): PerPayChange[] {
  const m = ppyOf(income(s).freq) / 12;
  const G = liveGoals(s).filter((g) => !goalDone(g) && !g.paused).map((g) => ({ g, perPay: Number(g.perPay) || 0 }));
  const cur = G.reduce((t, x) => t + x.perPay * m, 0);
  let diff = monthly - cur;
  if (diff > 0) {
    const pick = byKinds(G.map((x) => x.g)).find((g) => g.kind === "invest") || G.map((x) => x.g).find((g) => g.invested) || (G[0] && G[0].g);
    const f = pick && G.find((x) => x.g === pick);
    if (f) f.perPay = Math.round((f.perPay + diff / m) * 100) / 100;
  } else {
    const seen = new Set<Goal>(), order = byKinds(G.map((x) => x.g)).concat(G.map((x) => x.g));
    order.forEach((g) => {
      if (diff >= -0.01 || seen.has(g)) return; seen.add(g);
      const x = G.find((y) => y.g === g)!, have = x.perPay * m, take = Math.min(have, -diff);
      x.perPay = Math.round((have - take) / m * 100) / 100; diff += take;
    });
  }
  return G.filter((x) => x.perPay !== (Number(x.g.perPay) || 0)).map((x) => ({ goalId: x.g.id, perPay: x.perPay }));
}

/** The invested goals' per-pay amounts for a new investing total each pay (increase to Investing for later first). */
export function investSplitFor(s: DemoState, total: number): { id: string; name: string; account: string | undefined; perPay: number }[] {
  const G = liveGoals(s).filter((g) => g.invested && !goalDone(g)).map((g) => ({ id: g.id, name: g.name, account: g.account, kind: g.kind, perPay: g.paused ? 0 : Number(g.perPay) || 0 }));
  let diff = total - G.reduce((t, g) => t + g.perPay, 0);
  if (diff >= 0) { const f = G.find((g) => g.kind === "invest") || G[0]; if (f) f.perPay += diff; }
  else ORDER_KINDS.forEach((k) => { if (diff >= 0) return; const g = G.find((x) => x.kind === k); if (!g) return; const take = Math.min(g.perPay, -diff); g.perPay -= take; diff += take; });
  return G.map((g) => ({ id: g.id, name: g.name, account: g.account, perPay: g.perPay }));
}

/** Proposal for a new investing total each pay. */
export function planInvestTotal(s: DemoState, total: number): PerPayChange[] {
  const G = liveGoals(s), split = investSplitFor(s, total);
  return split.filter((x) => { const g = G.find((y) => y.id === x.id); return !!g && x.perPay !== (Number(g.perPay) || 0); }).map((x) => ({ goalId: x.id, perPay: x.perPay }));
}

/** Applies per-pay changes and re-syncs the per-account split. Mutates. */
export function applyPerPayChanges(s: DemoState, changes: PerPayChange[]): void {
  changes.forEach((c) => { const g = (s.goals || []).find((x) => x.id === c.goalId); if (g) g.perPay = c.perPay; });
  applyPlanPerPay(s);
}

/** Her take-home pay, frequency and next payday. Mutates (the prototype's setPay). */
export function applyPay(s: DemoState, amount: number, freq?: Freq, next?: string, confirmed?: boolean): void {
  const I = (s.income = s.income || income(s));
  I.amount = amount; if (freq) I.freq = freq; if (next) I.next = next; if (confirmed) I.confirmed = true;
  if (s.plan) s.plan.netPay = amount;
}
