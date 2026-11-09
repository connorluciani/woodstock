/* Confirm cards: what a proposed change would do (validAction), applying it on her tap (applyAction), and the line
   Talk says after (followUp). One rule set for Talk, the interview and, later, the server. Pure: applyAction
   mutates the state it is given (the app's update() draft) and returns what the UI should do next.
   Ported from the prototype's Messages validators (goal_add, goal_update, pause, pay, bills) plus Talk's dated
   changes (PM-R62). Talk never shows a buy or sell card: orders only come from the payday card. */
import * as E from "./env.ts";

const cad0 = E.cad0, num = E.num, r10 = E.r10;

export type Row = [string, string];
export interface Action { type: string; [key: string]: any }
export interface Card {
  type: string; title: string; lead?: string; rows: Row[]; button: string; danger?: boolean;
  /** link cards open another screen and change nothing */
  link?: boolean; topic?: string;
  goal?: any; patch?: any; amount?: number; bill?: any; name?: string;
  inner?: Card; innerA?: Action; start?: string; label?: string;
}

/** Cards that open another screen; they never change her plan. */
export const LINK: Record<string, 1> = { planner: 1, insights: 1, compare: 1, spending: 1, bills: 1, keep_menu: 1 };
/** The only card types Talk can show (P0 safety, 18:52): no orders, no sells, no withdrawals. */
export const TALK_OK: Record<string, 1> = { dated: 1, goal_add: 1, goal_update: 1, goal_pause: 1, goal_resume: 1, pay_update: 1, bill_update: 1, bill_add: 1, planner: 1, compare: 1, insights: 1, spending: 1, bills: 1, keep_menu: 1 };
export function isTrade(a: any): boolean {
  if (a && a.type === "dated") return isTrade(a.inner);
  return !!a && (a.type === "orders" || !!a.lines || !!a.orders || !!a.groups || a.type === "sell" || a.type === "buy" || a.type === "withdraw" || /order|trade|sell|buy|withdraw/i.test(String(a.type || "") + " " + String(a.strip || "")));
}
const WHERE_OK = ["Questrade TFSA, as cash", "Questrade TFSA, savings fund", "Questrade FHSA"];
function cap(n: unknown, lo: number, hi: number): number | null { const v = Number(n); return isFinite(v) && v >= lo && v <= hi ? Math.round(v * 100) / 100 : null; }

/** A goal by id, name, or a clear reference ("the trip", "my house"). */
export function findGoal(s: any, ref: unknown): any {
  const G = E.liveGoals(s), r = String(ref || "").toLowerCase(); if (!r) return null;
  return G.filter((g) => g.id === ref)[0] || G.filter((g) => r.indexOf(String(g.name).toLowerCase()) >= 0)[0] ||
    G.filter((g) => { const w = String(g.name).toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((x) => x.length >= 4 && ["with", "first", "trip", "fund", "goal", "save", "later"].indexOf(x) < 0); return w.some((x) => new RegExp("\\b" + x + "\\b").test(r)); })[0] ||
    (/\b(ny|nyc|new york|aaron)\b/.test(r) ? G.filter((g) => /new york/i.test(g.name))[0] : null) ||
    (/\b(home|house|condo|down ?payment|fhsa)\b/.test(r) ? G.filter((g) => g.kind === "home")[0] : null) ||
    (/\b(retire|retirement|rrsp)\b/.test(r) ? G.filter((g) => g.kind === "retirement")[0] : null) ||
    (/\b(emergency|safety net|buffer)\b/.test(r) ? G.filter((g) => g.kind === "emergency")[0] : null) ||
    (/\btrip\b/.test(r) ? G.filter((g) => g.kind === "trip")[0] : null) || null;
}

/** What a proposed change would do, as a confirm card; null when it isn't allowed or wouldn't change anything. */
export function validAction(s: any, a: Action | null | undefined): Card | null {
  if (!a || typeof a !== "object" || isTrade(a) || !TALK_OK[a.type]) return null;
  const b = E.budget(s), v: any = { type: a.type, rows: [] as Row[], patch: {} };
  if (a.type === "dated") {
    if (!a.inner || a.inner.type === "dated" || !/^\d{4}-\d{2}-\d{2}$/.test(a.start || "")) return null;
    const vi = validAction(s, a.inner); if (!vi || LINK[vi.type]) return null;
    return { type: "dated", inner: vi, innerA: a.inner, start: a.start, label: a.label, title: vi.title + ", from " + a.label, lead: a.lead || "Starts with your first " + a.label + " pay. Your plan before then stays as it is.", rows: a.rows || vi.rows, button: "Set for " + a.label };
  }
  if (a.type === "planner") return { type: "planner", link: true, topic: String(a.topic || "").slice(0, 40), title: "Talk to a planner", lead: "For bigger life decisions or a more detailed plan. Book a call with a credentialed planner.", rows: [], button: "See times" };
  if (a.type === "compare") return { type: "compare", link: true, title: "The four portfolios", lead: "Side by side, the same for everyone. The choice is yours.", rows: [], button: "Compare" };
  if (a.type === "insights") return { type: "insights", link: true, title: "This month", lead: "Your bills, goals and spending, worked out from your own numbers.", rows: [], button: "Open" };
  if (a.type === "spending" || a.type === "bills" || a.type === "keep_menu") return { type: a.type, link: true, title: a.type === "spending" ? "Spending" : a.type === "bills" ? "Bills" : "Where to keep it", rows: [], button: "Open", goal: a.goal };
  if (a.type === "goal_add") {
    const name = String(a.name || "").replace(/[^\w\s'&,.-]/g, "").trim().slice(0, 36); if (!name) return null;
    let t = cap(a.target, 50, 500000), pp = cap(a.perPay, 0, 5000); if (t == null) return null; if (pp == null) pp = 0;
    const by = /^\d{4}-\d{2}-\d{2}$/.test(a.by || "") ? a.by : null;
    let where = WHERE_OK.indexOf(a.where) >= 0 ? a.where : "Questrade TFSA, as cash";
    if (/FHSA/.test(where) && a.kind !== "home") return null;
    const short = !!by && !/FHSA/.test(where) && ((E.parseDate(by)!.getTime() - E.today(s).getTime()) / 864e5 <= 400 || a.kind === "trip");
    if (short) where = "Questrade TFSA, savings fund";
    v.patch = { name, target: t, perPay: pp, by, byLabel: by ? E.labelBy(by) : null, where, kind: a.kind === "trip" ? "trip" : "other", saved: 0, invested: /FHSA/.test(where), account: /FHSA/.test(where) ? "FHSA" : "TFSA" };
    v.title = "New goal: " + name; v.lead = "Tap Add goal to put it in your plan. You can change it any time.";
    v.rows = [["Goal", cad0(t)], ["By", by ? E.labelBy(by) : "No date"], ["Every payday", pp ? cad0(pp) : "Not set yet"], ["Kept in", short ? "Savings fund (starting choice set by Woodstock)" : where]];
    v.button = "Add goal"; return v;
  }
  if (a.type === "pay_update") {
    const p = cap(a.amount, 100, 50000); if (!b || p == null || Math.abs(p - b.pay) < 1) return null;
    v.amount = p; v.title = "Your pay: " + cad0(p); v.lead = "Take-home, " + b.freqLabel + ". Your plan, left to spend and every goal’s pace update everywhere.";
    v.rows = [["Each pay", cad0(b.pay) + " → " + cad0(p)], ["Left to spend a pay", cad0(b.leftPP) + " → " + cad0(b.leftPP + (p - b.pay))]]; v.button = "Update my pay"; return v;
  }
  if (a.type === "bill_update" || a.type === "bill_add") {
    const amt = cap(a.amount, 1, 20000); if (amt == null || !b) return null;
    if (a.type === "bill_update") {
      const bl = (s.bills || []).filter((x: any) => x.id === a.bill)[0]; if (!bl || Math.abs(bl.amount - amt) < 0.01) return null;
      v.bill = bl; v.amount = amt; v.title = bl.name + ": " + cad0(amt) + " a month";
      v.rows = [["Each month", cad0(bl.amount) + " → " + cad0(amt)], ["Left to spend a pay", cad0(b.leftPP) + " → " + cad0(b.leftPP - (amt - bl.amount) * 12 / b.ppy)]];
    } else {
      const nm = String(a.name || "").replace(/[^\w\s'&-]/g, "").trim().slice(0, 30); if (!nm) return null;
      v.name = nm; v.amount = amt; v.title = "New bill: " + nm;
      v.rows = [["Each month", cad0(amt)], ["Left to spend a pay", cad0(b.leftPP) + " → " + cad0(b.leftPP - amt * 12 / b.ppy)]];
    }
    v.button = "Confirm"; return v;
  }
  const g = findGoal(s, a.goal); if (!g) return null; v.goal = g;
  if (a.type === "goal_pause" || a.type === "goal_resume") {
    const pause = a.type === "goal_pause"; if (!!g.paused === pause) return null;
    v.patch = { paused: pause }; v.title = (pause ? "Pause " : "Resume ") + g.name;
    v.lead = pause ? "Stop saving " + cad0(g.perPay || 0) + " a payday for now. Nothing you've saved moves." : "Start saving " + cad0(g.perPay || 0) + " a payday again.";
    v.rows = [["Every payday", pause ? cad0(g.perPay || 0) + " → Paused" : "Paused → " + cad0(g.perPay || 0)]]; v.button = pause ? "Pause" : "Resume"; return v;
  }
  if (a.type === "goal_update") {
    const P: any = {}, rows: Row[] = [];
    const nt = a.target != null ? cap(a.target, 50, 500000) : null; if (nt != null && nt !== g.target) { P.target = nt; rows.push(["Goal", cad0(g.target || 0) + " → " + cad0(nt)]); }
    const np = a.perPay != null ? cap(a.perPay, 0, 5000) : null; if (np != null && np !== g.perPay) { P.perPay = np; P.paused = false; rows.push(["Every payday", cad0(g.perPay || 0) + " → " + cad0(np)]); }
    if (a.by && /^\d{4}-\d{2}-\d{2}$/.test(a.by) && a.by !== g.by) { P.by = a.by; P.byLabel = E.labelBy(a.by); rows.push(["By", (g.by ? E.labelBy(g.by) : "No date") + " → " + E.labelBy(a.by)]); }
    if (!rows.length) return null;
    v.patch = P; v.rows = rows; v.title = "Update " + g.name; v.button = "Confirm";
    const by2 = P.by || g.by, t2 = P.target != null ? P.target : g.target, p2 = P.perPay != null ? P.perPay : g.perPay;
    if (by2 && t2) { const n = E.paydaysTo(s, by2), proj = num(g.saved) + E.pendingFor(s, g) + num(p2) * n; v.lead = proj + 0.5 >= t2 ? "That keeps you on track for " + E.labelBy(by2) + "." : "That gets you to about " + cad0(proj) + " by " + E.labelBy(by2) + ", " + cad0(t2 - proj) + " short. About " + cad0(Math.ceil((t2 - num(g.saved)) / Math.max(1, n))) + " a payday would close it."; }
    else v.lead = "Changes " + g.name + " in your plan when you confirm.";
    return v;
  }
  return null;
}

/** Applies a confirmed card to the state it is given. Returns {ok, open?} where open names a screen for link cards. */
export function applyAction(s: any, v: Card): { ok: boolean; open?: string; topic?: string } {
  if (!v) return { ok: false };
  if (v.link) return { ok: true, open: v.type, topic: v.topic };
  if (v.type === "dated") {
    s.scheduledChanges = s.scheduledChanges || [];
    s.scheduledChanges.push({ id: "sc" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), start: v.start, label: v.label, title: v.title, action: v.innerA, source: "talk" });
    return { ok: true };
  }
  if (v.type === "goal_add") { (s.goals = s.goals || []).push(Object.assign({ id: "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), status: "New", isNew: true }, v.patch)); E.applyKeepDefaults(s); E.applyPlanPerPay(s); return { ok: true }; }
  if (v.type === "goal_update" || v.type === "goal_pause" || v.type === "goal_resume") { const g = (s.goals || []).filter((x: any) => x.id === v.goal.id)[0]; if (!g) return { ok: false }; Object.assign(g, v.patch); E.applyPlanPerPay(s); return { ok: true }; }
  if (v.type === "pay_update") { E.applyPay(s, v.amount!); return { ok: true }; }
  if (v.type === "bill_update") { const bl = (s.bills || []).filter((x: any) => x.id === v.bill.id)[0]; if (!bl) return { ok: false }; bl.amount = v.amount; bl.status = bl.status || "confirmed"; return { ok: true }; }
  if (v.type === "bill_add") { (s.bills = s.bills || []).push({ id: "b" + Date.now().toString(36), name: v.name, amount: v.amount, freq: "monthly", day: 1, category: "Other", status: "added", source: "Added by you" }); return { ok: true }; }
  return { ok: false };
}

/** What Talk says after she confirms (goals first, CR11 s3; never "you could save more"). Uses the state after the change. */
export function followUp(s: any, v: Card): string {
  const b = E.budget(s), gpp = E.liveGoals(s).filter((g) => !g.paused && !E.goalDone(g)).reduce((t, g) => t + num(g.perPay), 0);
  const np = E.nextPay(s), next = E.MON3[np.getUTCMonth()] + " " + np.getUTCDate();
  if (v.type === "goal_add") return "Added. " + v.patch.name + " is on Home and in Plan." + (v.patch.perPay ? " Your payday request goes up by " + cad0(v.patch.perPay) + " from " + next + " until it’s reached." : "");
  if (v.type === "goal_update") return "Done. " + ((v.goal && v.goal.name) || "Your goal") + " is updated, and Home shows the new pace.";
  if (v.type === "goal_pause") return "Paused. Nothing you saved has moved.";
  if (v.type === "goal_resume") return "Back on. " + cad0(v.goal.perPay || 0) + " a payday again.";
  if (v.type === "pay_update" && b) return "Done. Your pay is " + cad0(b.pay) + " " + b.freqLabel + ". Your goals still need " + cad0(gpp) + " a pay, so about " + cad0(r10(Math.max(0, b.flexM))) + " a month is left for everything else. The rest is yours to spend or keep.";
  if (v.type === "dated") return "Set. " + v.title + " starts with your first " + v.label + " pay. Nothing in your plan changes before then.";
  if ((v.type === "bill_update" || v.type === "bill_add") && b) return "Done. Your bills and debt payments are about " + cad0(b.billsM) + " a month now, and about " + cad0(b.leftPP) + " a pay is left to spend.";
  return "Done. Your plan is updated.";
}
