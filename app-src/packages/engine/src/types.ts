/* State shapes. They mirror WS.state in the prototype (releases/woodstock_v7_3_2.html) so the demo data and
   a future server payload load unchanged. Fields the engine never reads are allowed through the index signatures.
   Money is in dollars (floating point, rounded with round2) exactly as in the prototype; see README, "Money". */

export type Freq = "weekly" | "biweekly" | "semimonthly" | "monthly";
export type BillFreq = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
export type AccountKey = "TFSA" | "FHSA" | "RRSP";
export type Side = "buy" | "sell";

export interface Ctx { today: Date }
export interface Stamp { iso: string; date: string; time: string }

export interface Holding {
  ticker: string; name?: string; units?: number; price?: number; bookValue?: number; value?: number; sleeve?: string;
  [key: string]: unknown;
}
export interface AccountActivity { date?: string; time?: string; what: string; amt: number; demo?: boolean; [key: string]: unknown }
export interface Account {
  id: string; type?: string; name?: string; provider?: string; kind?: "bank" | "card" | "debt" | string;
  cash?: number; balance?: number; holdings?: Holding[]; roomLeft?: number; annualLimit?: number; contributedThisYear?: number;
  portfolio?: string; sub?: string; fundsDeposits?: boolean; activity?: AccountActivity[]; details?: [string, string][];
  pad?: { amount?: number; next?: string; from?: string; [key: string]: unknown };
  [key: string]: unknown;
}
export interface OtherIncome { name?: string; amount: number; freq?: BillFreq }
export interface Income {
  amount: number; freq: Freq; next?: string; gross?: number; basis?: string; confirmed?: boolean; other?: OtherIncome[];
  [key: string]: unknown;
}
export interface Bill {
  id: string; name: string; amount: number; freq?: BillFreq; day?: number; month?: number; category?: string;
  account?: string; how?: string; status?: string; min?: number;
  [key: string]: unknown;
}
export interface Deposit { date?: string; when?: string; dateISO?: string; amount: number; demo?: boolean }
export interface Goal {
  id: string; name: string; kind?: string; target?: number; saved?: number; by?: string; byLabel?: string; perPay?: number;
  where?: string; account?: string; invested?: boolean; paused?: boolean; archived?: boolean; isNew?: boolean;
  keepIn?: string; keepBy?: string; portfolio?: string; group?: string; monthly?: number; statusLine?: string;
  earlier?: { amount: number; where: string }; deposits?: Deposit[];
  [key: string]: unknown;
}
export interface PortfolioHolding { ticker: string; weight: number; name?: string; holds?: string; fee?: string; sleeve?: string; price?: number; kind?: string }
export interface Portfolio {
  id: string; name: string; equity?: number; bonds?: number; mer?: string; holdYears?: number;
  sleeves?: Record<string, number>;
  holdings?: { registered?: PortfolioHolding[]; nonRegistered?: PortfolioHolding[] };
  [key: string]: unknown;
}
export interface MixLine { ticker: string; weight: number; name?: string; price?: number; kind?: string }
export interface Target {
  id?: string; name?: string; chosenBy?: string; chosenOn?: string; mix?: MixLine[]; mixes?: Partial<Record<string, MixLine[]>>;
  [key: string]: unknown;
}
export interface OrderLine { side: Side; ticker: string; units: number; price: number; amount: number; goal?: string }
export interface Order { account: string; lines: OrderLine[]; total?: number; deposit?: number }
export interface Fund { ticker: string; name: string; issuer?: string; fee?: string; price: number; out?: string }
export interface GoalLine {
  goal: string; label: string; amount: number; account: string;
  split?: { account: string; amount: number }[] | null; cash?: boolean; vehicle?: Fund | null;
  [key: string]: unknown;
}
export interface PendingBatch {
  id: string; status: "pending" | "sent" | "approved" | "empty" | string; title?: string; arrived?: number; invest?: number;
  payday?: string; orders?: Order[]; total?: number; goalLines?: GoalLine[]; leftover?: number;
  pulled?: { at: string; time: string; amount: number; from: string } | null;
  _credited?: boolean; sentAt?: string; confirmedAt?: string; doneTime?: string; approvedAt?: string;
  [key: string]: unknown;
}
export interface PlanRow { id: string; label?: string; amount: number }
export interface PlanAdjust { mode: string; leftThisMonth?: number; [key: string]: unknown }
export interface Plan {
  netPay?: number; perPay?: Partial<Record<AccountKey, number>>; investPerPay?: number; everyPayday?: PlanRow[];
  adjust?: PlanAdjust[]; debtPayment?: number; bufferTarget?: number;
  [key: string]: unknown;
}
export interface SpendCat { id: string; label: string; usual: number; now: number }
export interface SpendTxn { date: string; what?: string; cat?: string; amount: number; account?: string; [key: string]: unknown }
export interface Spending {
  daysInMonth?: number; todayDay?: number; through?: string; monthLabel?: string; month?: string;
  cats?: SpendCat[]; usualCurve?: number[]; thisCurve?: number[]; usualEveryday?: number; usualEverydayFixedDay1?: number;
  txns?: SpendTxn[]; overspend?: SpendTxn[]; _extra?: SpendTxn[]; months?: { label: string; everyday: number; total: number }[];
  sources?: string;
  [key: string]: unknown;
}
export interface Activity { when: string; time?: string; title: string; sub?: string; amount?: number; kind?: string; demo?: boolean; [key: string]: unknown }
export interface Subscription { status?: string; price?: number; taxRate?: number; trialEnds?: string; [key: string]: unknown }
export interface User { firstName?: string; name?: string; age?: number; birthYear?: number; province?: string; ageFacts?: { age?: number; [key: string]: unknown }; [key: string]: unknown }

export interface DemoState {
  today?: string; asOf?: string; user?: User; settings?: { allowSells?: boolean; [key: string]: unknown };
  target?: Target; portfolios?: Portfolio[]; prices?: Record<string, number>; funds?: Record<string, { name?: string; holds?: string; fee?: string; sleeve?: string }>;
  accounts: Account[]; pendingBatch?: PendingBatch | null; goals: Goal[]; plan?: Plan; activity?: Activity[];
  income?: Income; bills?: Bill[]; spending?: Spending; subscription?: Subscription;
  demoMoved?: boolean; messagesPreview?: { preview?: string; [key: string]: unknown }; lastOrdersAt?: string;
  [key: string]: unknown;
}
