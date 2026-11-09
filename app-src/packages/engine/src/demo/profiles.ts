/* CR12 s4: the five demo bank profiles (made-up people and numbers; D-19:23 (e)). Profile 1 is Alandra, the
   original demo; each other one changes pay, bills, balances, spending and Questrade holdings, and the bank she
   picks names every account. Each new sign-up gets the next profile in turn. Ported from the prototype's engine. */
import type { Account, Bill, DemoState } from "../types.ts";
import { cad0, round2 } from "../money.ts";

type BillRow = [id: string, name: string, amount: number, day: number, from: "chq" | "card", category: string];
export interface BankProfile {
  id: string; label: string; job: string; age: number; salary: number; base?: boolean;
  pay?: number; chq?: number; sav?: number; card?: number; cardLimit?: number; loc?: { balance: number; payment: number; name: string } | null;
  spend?: number; hold?: Record<string, number>; holdCash?: Record<string, number>; bills?: BillRow[];
}

export const BANK_PROFILES: readonly BankProfile[] = [
  { id: "p1", label: "Demo profile 1: lawyer, Toronto", job: "Toronto lawyer called to the Ontario bar in 2026", age: 28, salary: 125000, base: true },
  { id: "p2", label: "Demo profile 2: consultant, Toronto", job: "management consultant", age: 30, salary: 98000,
    pay: 2780, chq: 3240, sav: 6400, card: 860, cardLimit: 8000, loc: null, spend: 0.9, hold: { TFSA: 1.4, FHSA: 0, RRSP: 0.6 }, holdCash: { TFSA: 31.4, FHSA: 0, RRSP: 18.2 },
    bills: [["rent", "Rent", 1850, 1, "chq", "Housing"], ["util", "Hydro and internet", 95, 4, "card", "Utilities"], ["phone", "Phone", 75, 14, "card", "Phone and internet"], ["stream", "Streaming", 18.99, 3, "card", "Subscriptions"], ["climb", "Climbing gym", 79, 5, "card", "Subscriptions"], ["tenant", "Tenant insurance", 24, 15, "card", "Insurance"]] },
  { id: "p3", label: "Demo profile 3: nurse, shift pay", job: "registered nurse working shifts", age: 27, salary: 84000,
    pay: 2460, chq: 2150, sav: 3800, card: 640, cardLimit: 5000, loc: { balance: 8400, payment: 250, name: "Car loan" }, spend: 0.8, hold: { TFSA: 0.5, FHSA: 0.3, RRSP: 0.4 }, holdCash: { TFSA: 12.6, FHSA: 22.1, RRSP: 9.8 },
    bills: [["rent", "Rent", 1600, 1, "chq", "Housing"], ["carins", "Car insurance", 165, 10, "chq", "Insurance"], ["phone", "Phone", 60, 14, "card", "Phone and internet"], ["stream", "Streaming", 16.99, 3, "card", "Subscriptions"], ["loc", "Car loan payment", 250, 28, "chq", "Debt"]] },
  { id: "p4", label: "Demo profile 4: developer, group RRSP at work", job: "software developer with a group RRSP at work", age: 31, salary: 132000,
    pay: 3420, chq: 6900, sav: 14200, card: 2100, cardLimit: 15000, loc: null, spend: 1.2, hold: { TFSA: 1.8, FHSA: 1.2, RRSP: 0.5 }, holdCash: { TFSA: 44.9, FHSA: 61.3, RRSP: 20.7 },
    bills: [["rent", "Rent", 2350, 1, "chq", "Housing"], ["util", "Hydro", 85, 6, "card", "Utilities"], ["phone", "Phone and internet", 140, 14, "card", "Phone and internet"], ["gym", "Gym", 60, 5, "card", "Subscriptions"], ["tenant", "Tenant insurance", 25, 15, "card", "Insurance"]] },
  { id: "p5", label: "Demo profile 5: couple sharing a home", job: "teacher who shares rent and bills with a partner", age: 33, salary: 92000,
    pay: 2900, chq: 3900, sav: 11000, card: 1500, cardLimit: 10000, loc: { balance: 21000, payment: 300, name: "Line of credit" }, spend: 1.1, hold: { TFSA: 1.0, FHSA: 0.8, RRSP: 1.1 }, holdCash: { TFSA: 28.3, FHSA: 40.5, RRSP: 33.2 },
    bills: [["rent", "Rent, your half", 1350, 1, "chq", "Housing"], ["util", "Utilities, your half", 70, 1, "chq", "Utilities"], ["phone", "Phone", 55, 14, "card", "Phone and internet"], ["daycare", "Daycare, your half", 420, 1, "chq", "Childcare"], ["loc", "Line of credit payment", 300, 30, "chq", "Debt"]] }
];

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export interface ProfileStore { next: number; byKey: Record<string, number> }
/** The next profile in turn, stable per sign-up key. Pure: returns the index and a new store. */
export function assignProfile(store: ProfileStore | null | undefined, key?: string | null): { index: number; store: ProfileStore } {
  const st = clone(store || { next: 0, byKey: {} });
  st.byKey = st.byKey || {}; st.next = Number(st.next) || 0;
  if (key && st.byKey[key] != null) return { index: st.byKey[key]!, store: st };
  const i = st.next % BANK_PROFILES.length; st.next = st.next + 1; if (key) st.byKey[key] = i;
  return { index: i, store: st };
}

/** "RBC Royal Bank" to "RBC", "TD Canada Trust" to "TD", "Simplii Financial" to "Simplii", else the first word. */
export function bankShort(bank?: string | null): string {
  const n = String(bank || "RBC Royal Bank").replace(/ \(.*\)/, "");
  return /^RBC/.test(n) ? "RBC" : n === "TD Canada Trust" ? "TD" : n === "Simplii Financial" ? "Simplii" : n.split(" ")[0]!;
}

/** A demo state for profile i at the bank she chose. Pure: returns a new object. */
export function profileState(demo: DemoState, i: number, bank?: string | null): DemoState {
  const P = BANK_PROFILES[i] || BANK_PROFILES[0]!, d = clone(demo), sh = bankShort(bank), rbc = sh === "RBC";
  const names = { chq: sh + " Chequing", sav: rbc ? "RBC eSavings" : sh + " Savings", card: sh + " Visa" };
  const ren = <T>(str: T): T => (typeof str !== "string" ? str : (str.replace(/RBC Chequing/g, names.chq).replace(/RBC eSavings/g, names.sav).replace(/RBC Visa/g, names.card).replace(/\bRBC\b/g, sh) as unknown as T));
  d.profile = { id: P.id, index: i, label: P.label, job: P.job, age: P.age, salary: P.salary, bank: sh };
  if (!P.base) {
    const pay = P.pay!, f = P.spend!, bills = P.bills!;
    d.income = { amount: pay, freq: "biweekly", next: "2026-11-20", confirmed: false, detected: { amount: pay, freq: "biweekly", what: "Payroll", account: "RBC Chequing", seen: ["Oct 9", "Oct 23", "Nov 6"], line: "Payroll into RBC Chequing every two weeks since August" } };
    d.bills = bills.map((b): Bill => ({ id: b[0], name: b[1], amount: b[2], day: b[3], freq: "monthly", category: b[5], account: b[4] === "chq" ? "RBC Chequing" : "RBC Visa", how: b[4] === "chq" ? "Pre-authorized payment from RBC Chequing" : "RBC Visa", source: "Seen 3 months in a row", status: "detected" }));
    const billsM = d.bills.reduce((t, b) => t + b.amount, 0);
    d.accounts = (d.accounts || []).filter((a) => a.id !== "LOC" || P.loc).map((a): Account => {
      if (a.id === "CHQ") { a.cash = P.chq; a.advice = "Your pay lands here every two weeks."; a.details = [["Connected (demo)", "Read-only through Flinks"], ["Next pay", "Fri, Nov 20"]]; a.activity = [{ date: "Nov 6", what: "Payroll", amt: pay }, { date: "Nov 1", what: "Rent", amt: -bills[0]![2] }]; }
      if (a.id === "SAV") { a.cash = P.sav; a.sub = "Savings"; a.advice = ""; a.details = [["Connected (demo)", "Read-only through Flinks"]]; a.activity = [{ date: "Oct 2", what: "Interest", amt: round2(P.sav! * 0.0015) }]; }
      if (a.id === "VISA") { a.balance = P.card; a.sub = "Due Nov 21 · limit " + cad0(P.cardLimit); a.details = [["Statement due", "Sat, Nov 21"], ["Credit limit", cad0(P.cardLimit)], ["Paid in full", "Every month"]]; a.advice = "Paid in full every month, so no interest."; a.activity = []; }
      if (a.id === "LOC" && P.loc) { a.balance = P.loc.balance; a.name = P.loc.name; a.sub = P.loc.name + " · about 6.2%"; a.details = [["Rate", "About 6.2%"], ["Your plan pays", cad0(P.loc.payment) + " a month"]]; }
      if (a.provider === "Questrade") {
        const k = a.id, m = P.hold![k] != null ? P.hold![k]! : 1;
        a.holdings = (a.holdings || []).map((h) => { h.units = Math.round((h.units || 0) * m); h.bookValue = round2(h.units * (h.price || 0) * 0.982); return h; });
        a.cash = P.holdCash![k] != null ? P.holdCash![k] : a.cash; a.activity = [];
      }
      return a;
    });
    const sp = d.spending;
    if (sp) {
      const sc = (n: number): number => round2(n * f);
      sp.cats = (sp.cats || []).map((c) => { c.usual = Math.round(c.usual * f); c.now = Math.round(c.now * f); return c; });
      sp.usualEveryday = Math.round((sp.usualEveryday || 0) * f); if (sp.usualEverydayFixedDay1 != null) sp.usualEverydayFixedDay1 = Math.round(sp.usualEverydayFixedDay1 * f);
      sp.months = (sp.months || []).map((m0) => { const ev = Math.round(m0.everyday * f); return { label: m0.label, everyday: ev, total: Math.round(ev + billsM) }; });
      sp.usualCurve = (sp.usualCurve || []).map(sc); sp.thisCurve = (sp.thisCurve || []).map(sc);
      sp.txns = (sp.txns || []).map((t) => { t.amount = sc(t.amount); return t; });
      sp.overspend = (sp.overspend || []).map((t) => { t.amount = sc(t.amount); return t; });
      const visa = d.accounts.find((a) => a.id === "VISA");
      if (visa) visa.activity = sp.txns.filter((t) => /Visa/.test(String(t.account))).slice(0, 6).map((t) => ({ date: t.date.slice(5).replace(/^11-0?/, "Nov ").replace(/^10-0?/, "Oct "), what: String(t.what), amt: -t.amount }));
    }
  }
  /* the bank she chose names every account and line */
  d.accounts = (d.accounts || []).map((a) => {
    if (a.provider === "RBC" || a.kind === "bank" || a.kind === "card" || a.kind === "debt") {
      a.name = ren(a.name); a.sub = ren(a.sub); a.footer = ren(a.footer); a.advice = ren(a.advice);
      if (!rbc) { a.provider = sh; a.mono = sh.slice(0, 4); a.monoBg = "#5A6B7B"; }
      (a.activity || []).forEach((x) => { x.what = ren(x.what); });
      a.details = (a.details || []).map((kv): [string, string] => [ren(kv[0]), ren(kv[1])]);
    }
    if (a.pad && a.pad.from) a.pad.from = ren(a.pad.from);
    return a;
  });
  (d.bills || []).forEach((b) => { b.account = ren(b.account); b.how = ren(b.how); });
  if (d.spending) { d.spending.sources = ren(d.spending.sources); (d.spending.txns || []).concat(d.spending.overspend || []).forEach((t) => { t.account = ren(t.account); }); }
  const det = d.income && (d.income.detected as { account?: string; line?: string } | undefined);
  if (det) { det.account = ren(det.account); det.line = ren(det.line); }
  return d;
}
