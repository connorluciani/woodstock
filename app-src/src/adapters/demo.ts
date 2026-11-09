/*
 * Stage 1 demo implementations of the adapters. Everything is stored on the device through
 * ./storage (AsyncStorage). Nothing leaves the device; nothing is charged; no real bank or broker.
 * Labels: every completion the screens show from these results carries "(demo)" (Compliance 19:24).
 * Owner: mobile-lead.
 */
import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { getJSON, setJSON, clearAll } from "./storage";
import { showFaceIdHud } from "@/design/components/FaceId";
import type {
  Adapters, AiResponder, ApprovalPayload, ApprovalResult, BankCredentials, BrokerStatus, Institution, OrderBatch, Provider, Session,
  Subscription, ThreadMessage, TransferRecord,
} from "./types";

const nowIso = () => new Date().toISOString();
const uid = (p: string) => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* Wipes a credential object in place, so the typed values do not outlive the call. */
function scrub(c: BankCredentials) {
  try {
    c.username = "";
    c.password = "";
  } catch {
    /* frozen object: nothing kept anyway */
  }
}

const INSTITUTIONS: Institution[] = [
  { id: "rbc", name: "RBC Royal Bank", short: "RBC" },
  { id: "td", name: "TD Canada Trust", short: "TD" },
  { id: "scotia", name: "Scotiabank", short: "Scotiabank" },
  { id: "bmo", name: "BMO", short: "BMO" },
  { id: "cibc", name: "CIBC", short: "CIBC" },
  { id: "national", name: "National Bank", short: "National" },
  { id: "desjardins", name: "Desjardins", short: "Desjardins" },
  { id: "tangerine", name: "Tangerine", short: "Tangerine" },
  { id: "simplii", name: "Simplii Financial", short: "Simplii" },
  { id: "eq", name: "EQ Bank", short: "EQ" },
];

/* ---------------- auth ---------------- */
const auth = {
  async signIn(provider: Provider, info?: { email?: string }): Promise<Session> {
    const s: Session = { userId: uid("u"), provider, email: info?.email, createdAt: nowIso(), demo: true };
    await setJSON("session", s);
    return s;
  },
  async startDemo(): Promise<Session> {
    const s: Session = { userId: "demo-alandra", provider: "demo-skip", createdAt: nowIso(), termsAcceptedAt: "2026-09-28T12:00:00Z", termsVersion: "demo-2026-11-09", demo: true };
    await setJSON("session", s);
    return s;
  },
  async currentUser(): Promise<Session | null> {
    return getJSON<Session | null>("session", null);
  },
  async acceptTerms(version: string): Promise<Session | null> {
    const s = await getJSON<Session | null>("session", null);
    if (!s) return null;
    const next = { ...s, termsAcceptedAt: nowIso(), termsVersion: version };
    await setJSON("session", next);
    return next;
  },
  async signOut(): Promise<void> {
    await setJSON("session", null);
  },
  async deleteAccount(): Promise<void> {
    await clearAll();
  },
  async confirmApproval(payload: ApprovalPayload): Promise<ApprovalResult> {
    if (Platform.OS !== "web") {
      try {
        const has = await LocalAuthentication.hasHardwareAsync();
        const enrolled = has && (await LocalAuthentication.isEnrolledAsync());
        if (enrolled) {
          const r = await LocalAuthentication.authenticateAsync({ promptMessage: approvalPrompt(payload), cancelLabel: "Cancel" });
          return { ok: r.success, method: r.success ? "face-id" : "none", at: nowIso() };
        }
      } catch {
        /* fall through to the demo HUD */
      }
    }
    await showFaceIdHud("Face ID (demo)");
    return { ok: true, method: "demo-face-id", at: nowIso() };
  },
};

function approvalPrompt(p: ApprovalPayload) {
  switch (p.kind) {
    case "payday-pull": return "Approve your payday request";
    case "orders": return "Send these orders to Questrade";
    case "broker-approval": return "Approve in demo Questrade";
    case "subscription": return "Confirm your subscription";
    default: return "Confirm";
  }
}

/* ---------------- bank ---------------- */
type ProfileStore = { next: number; byKey: Record<string, number> };
const bank = {
  institutions: () => INSTITUTIONS,
  async assignProfile(userKey: string, profileCount: number) {
    const st = await getJSON<ProfileStore>("demo.profiles", { next: 0, byKey: {} });
    if (st.byKey[userKey] != null) return { index: st.byKey[userKey], key: userKey };
    const index = st.next % Math.max(1, profileCount);
    const next: ProfileStore = { next: st.next + 1, byKey: { ...st.byKey, [userKey]: index } };
    await setJSON("demo.profiles", next);
    return { index, key: userKey };
  },
  async connect(institution: Institution, credentials: BankCredentials) {
    scrub(credentials);
    await new Promise((r) => setTimeout(r, 900));
    return { ok: true as const, institution, demo: true as const };
  },
  async pull(plan: { amount: number; from: string; to: { account: string; amount: number }[] }): Promise<TransferRecord> {
    const rec: TransferRecord = { id: uid("t"), kind: "payday-pull", amount: plan.amount, from: plan.from, to: plan.to, at: nowIso(), demo: true };
    const log = await getJSON<TransferRecord[]>("demo.transfers", []);
    await setJSON("demo.transfers", [rec, ...log].slice(0, 200));
    return rec;
  },
  async disconnect(_id: string) {
    /* demo: nothing to revoke */
  },
};

/* ---------------- broker ---------------- */
const broker = {
  async connect(credentials: BankCredentials) {
    scrub(credentials);
    await new Promise((r) => setTimeout(r, 700));
    return { ok: true as const, demo: true as const };
  },
  async submitOrders(batch: OrderBatch): Promise<BrokerStatus> {
    const at = nowIso();
    await setJSON("demo.broker." + batch.id, { status: "sent", at });
    return { status: "sent", at };
  },
  async approveOrders(batch: OrderBatch): Promise<BrokerStatus> {
    const at = nowIso();
    const fills = batch.orders.map((o) => ({ ...o, filledAt: at, demo: true as const }));
    await setJSON("demo.broker." + batch.id, { status: "done", at });
    return { status: "done", at, fills };
  },
};

/* ---------------- billing ---------------- */
const PRODUCT = { id: "woodstock.monthly", price: 15, currency: "CAD" as const, period: "month" as const, trialDays: 30 };
const billing = {
  products: () => [PRODUCT],
  async status(): Promise<Subscription> {
    return getJSON<Subscription>("billing", { product: PRODUCT.id, status: "none", demo: true });
  },
  async purchase(productId: string): Promise<Subscription> {
    const start = new Date();
    const end = new Date(start.getTime() + PRODUCT.trialDays * 86400000);
    const s: Subscription = { product: productId, status: "trial", startedAt: start.toISOString(), trialEndsAt: end.toISOString(), via: "applepay-demo", demo: true };
    await setJSON("billing", s);
    return s;
  },
  async cancel(): Promise<Subscription> {
    const s = await billing.status();
    const next: Subscription = { ...s, status: "cancelled" };
    await setJSON("billing", next);
    return next;
  },
};

/* ---------------- messaging ---------------- */
const messaging = {
  async thread(): Promise<ThreadMessage[]> {
    return getJSON<ThreadMessage[]>("thread", []);
  },
  async send(templateId: string, text: string, card?: ThreadMessage["card"]): Promise<ThreadMessage> {
    const m: ThreadMessage = { id: uid("m"), from: "woodstock", text, at: nowIso(), card, templateId };
    const t = await messaging.thread();
    await setJSON("thread", [...t, m]);
    return m;
  },
  async post(text: string): Promise<ThreadMessage> {
    const m: ThreadMessage = { id: uid("m"), from: "me", text, at: nowIso() };
    const t = await messaging.thread();
    await setJSON("thread", [...t, m]);
    return m;
  },
  async replaceThread(messages: ThreadMessage[]) {
    await setJSON("thread", messages);
  },
  async registerDevice(_token: string) {
    /* Stage 1 iOS: expo-notifications token to the server */
  },
};

/* ---------------- ai ---------------- */
let responder: AiResponder | null = null;
const ai = {
  async reply(surface: Parameters<AiResponder>[0], text: string, ctx: { state: unknown }) {
    if (!responder) return { text: "I can't answer that here yet.", action: null, source: "scripted" as const };
    return await responder(surface, text, ctx);
  },
  setResponder(fn: AiResponder) {
    responder = fn;
  },
};

/* ---------------- clock ---------------- */
const clock = {
  now(state?: { today?: string } | null) {
    return state?.today ? new Date(state.today) : new Date("2026-11-09T08:47:00");
  },
};

export const demoAdapters: Adapters = { auth, bank, broker, billing, messaging, ai, clock };
