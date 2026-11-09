/* @woodstock/engine: Woodstock's money logic, ported from the prototype (releases/woodstock_v7_3_2.html).
   Pure TypeScript: no DOM, no React, no storage, no network. The app and the server import the same functions.
   Conventions: every function takes the state `s` and, where time matters, a context `ctx = { today }`
   (default: state.today). Functions return values and never change `s`, except those whose name starts with
   "apply", and the guarded flow steps (approvePull, sendToQuestrade, approveInQuestrade). */

export const ENGINE_VERSION = "engine-1.0.0";

export type * from "./types.ts";

/* money and dates */
export { MINUS, num, round2, r10, f10, toCents, fromCents, cad, cad0, signed } from "./money.ts";
export { DAY_MS, MON3, MONL, ymd, parseDate, noon, addDays, daysInMonth, isoDate, monthEndIso, fmtShort, fmtDay, fmtMonth, fmtMonthYear, fmtMonY, fmtClock, labelBy, today, ctxOf, stampAt } from "./dates.ts";

/* the pay schedule (one payday calculation) */
export { PPY, FREQ_LABEL, ppyOf, income, applyIncomeDefaults, payDates, nextPayday, nextPaydays, paysUntil, nthPayday, perPayFromMonthly, monthlyFromPerPay } from "./schedule.ts";

/* obligations */
export { BILL_FREQ, BILL_FREQ_LABEL, BILL_CATS, billFactor, billMonthly, activeBills, isDebt, nextDue, upcomingBills } from "./obligations.ts";

/* accounts */
export { holdingValue, accountValue, investTotal, netWorth, cashTotal, account, investedNow, heldUnits, priceOf } from "./accounts.ts";

/* goals */
export { GROUPS, goalDone, liveGoals, payingGoals, goalById, goalGroup, pendingFor, goalAccounts, fhsaPerPayCap, payRoom, goalStatus, quickGoalPlan, reachDate, scalePaces, findGoal, goalOfKind } from "./goals.ts";
export type { GoalGroup, GoalStatus } from "./goals.ts";
export { KEEP, KEEP_DEFAULT, SHORT_TERM_DAYS, keepOpt, isShortTerm, applyKeepDefaults } from "./keep.ts";
export type { KeepOption } from "./keep.ts";

/* plan */
export { budget, spendCats, planPerPay, applyPlanPerPay, planSavingsTarget, planInvestTotal, investSplitFor, applyPerPayChanges, applyPay } from "./plan.ts";
export type { Budget, PerPayChange } from "./plan.ts";

/* affordability */
export { affordability, planSpendLess, planSpendCatch, planSpendFromGoal } from "./affordability.ts";
export type { Affordability, AffordMode, AffordOption, SpendLess, SpendCatch, SpendFromGoal } from "./affordability.ts";

/* portfolios, projections and bands */
export { ASSUMPTIONS } from "./assumptions.ts";
export type { Assumptions } from "./assumptions.ts";
export { targetPortfolio, weightsOf, goalPortfolio, goalPortfolioFor, holdYears } from "./portfolios.ts";
export { bandRates, plannedMonthly, portfolioBands, holdNote, goalRates, goalProjection, reachIso } from "./projections.ts";
export type { Bands, BandRates, GoalProjection, GoalRates, ProjectionPoint, Horizon } from "./projections.ts";

/* tax estimates */
export { TAX2026, takeHome, grossFor, incomeProfile, taxRefundEstimate, moneyIn, salariesIn, payChangeFromText } from "./tax.ts";
export type { TakeHome, IncomeProfile, RefundEstimate, PayChange } from "./tax.ts";

/* payday request and orders */
export { payRequest, applyRefreshRequest, buildBatch, applyBatch, moveOrders } from "./payday.ts";
export type { PayRequest, Batch } from "./payday.ts";

/* validators and guardrail policy */
export {
  POLICY_VERSION, BANNED_LIVE, AFFORD_RE, liveTextBad, stripDashes, plainify, visibleText, extractAction,
  ORDER_ACCOUNTS, policyContext, checkRoom, checkFhsaCap, checkOwnMix, checkOrderPolicy, normalizeCard,
  sellAllowedFor, affordActionAllowed, isTradeAction, TALK_OK, TALK_NO_TRADE, talkActionAllowed, talkSafeReply,
  requireApproval, approvalFrom, PICK, validateOwnMix, ACT_TYPES, WHERE_OK, validatePlanAction
} from "./policy.ts";
export type { GuardResult, PolicyContext, OrderGroup, OrderCard, Approval, ApprovalStep, PlanActionResult } from "./policy.ts";

/* CR12 demo flows */
export { pullSource, pullPlan, pullText, pullDoneText, applyPull, orderLines, orderLineText, doneText, applyOrders, applyApprovalActivity, applySentActivity, applyGoalCredit, approvePull, sendToQuestrade, approveInQuestrade } from "./flows.ts";
export type { PullPlan, FlatLine, FlowResult } from "./flows.ts";

/* subscription */
export { SALES_TAX, paySheet, subTax } from "./subscription.ts";

/* demo data */
export { ALANDRA, BANK_PROFILES, assignProfile, bankShort, profileState, demoState, applyBoot, bootDemoState, signUpState, seedState } from "./demo/index.ts";
export type { BankProfile, ProfileStore } from "./demo/index.ts";

/** The app store's name for the state (src/state/AppState.tsx). */
export type { DemoState as WSState } from "./types.ts";
