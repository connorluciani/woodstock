/*
 * Adapter interfaces (Directive 18:39; docs/production_plan.md section 5.3).
 * Every mock in Stage 1 sits behind one of these, with the shape the real integration will have, so
 * later stages swap the implementation, not the screens:
 *   auth      Stage 1 demo sign-in on the device   -> real OIDC + passkeys (Stage 1 server)
 *   bank      demo bank profiles, demo transfers    -> Flinks (Stage 2)
 *   broker    demo Questrade accounts and fills     -> Questrade partner API (Stage 3)
 *   billing   demo pay sheet, nothing charged       -> StoreKit in-app purchase (iOS), Stripe (web)
 *   messaging in-app thread                         -> APNs push with actionable payday cards
 *   ai        scripted replies (tonight)            -> server AI with policy pipeline and audit
 *   clock     the demo "today"                      -> real time
 *
 * Adapters do input and output only. They never compute money: state changes from a transfer or a
 * fill are applied by @woodstock/engine (pure functions) through the app store.
 * Owner: mobile-lead. Screens call adapters through `useApp().adapters` or the `adapters` export.
 */

export type Provider = "apple" | "google" | "microsoft" | "email";

export type Session = {
  userId: string;
  provider: Provider | "demo-skip";
  email?: string;
  createdAt: string;
  termsAcceptedAt?: string;
  termsVersion?: string;
  demo: true;
};

export type ApprovalPayload = { kind: "payday-pull" | "orders" | "broker-approval" | "subscription" | "plan-change"; total?: number; batchId?: string };
export type ApprovalResult = { ok: boolean; method: "face-id" | "demo-face-id" | "passcode" | "none"; at: string; payloadHash?: string };

export interface AuthAdapter {
  signIn(provider: Provider, info?: { email?: string }): Promise<Session>;
  /* the Skip path: explore as the demo persona (Alandra Gray) */
  startDemo(): Promise<Session>;
  currentUser(): Promise<Session | null>;
  acceptTerms(version: string): Promise<Session | null>;
  signOut(): Promise<void>;
  /* Apple 5.1.1(v): account deletion in the app. Clears every Woodstock key on the device. */
  deleteAccount(): Promise<void>;
  /* Face ID before any approval. Production: unlocks a device key that signs the payload (plan 4.4). */
  confirmApproval(payload: ApprovalPayload): Promise<ApprovalResult>;
}

export type Institution = { id: string; name: string; short: string };

export type BankCredentials = { username: string; password: string };

export type ProfileAssignment = { index: number; key: string };

export type TransferRecord = {
  id: string; kind: "payday-pull"; amount: number; from: string; to: { account: string; amount: number }[]; at: string; demo: true;
};

export interface BankAdapter {
  institutions(): Institution[];
  /* CR12 s4: each new sign-up gets the next demo profile in turn, stable for that user. */
  assignProfile(userKey: string, profileCount: number): Promise<ProfileAssignment>;
  /* Demo sign-in. Credentials are cleared immediately: never stored, logged or sent (Directive 13:50). */
  connect(institution: Institution, credentials: BankCredentials): Promise<{ ok: true; institution: Institution; demo: true }>;
  /* CR12 s2: records the demo transfer; the engine applies the balances. */
  pull(plan: { amount: number; from: string; to: { account: string; amount: number }[] }): Promise<TransferRecord>;
  disconnect(institutionId: string): Promise<void>;
}

export type OrderLine = { account: string; side: "buy" | "sell"; ticker: string; units: number; price: number; goalId?: string };
export type OrderBatch = { id: string; orders: OrderLine[]; total: number; payday?: boolean };
export type BrokerStatus = { status: "sent" | "done" | "rejected"; at: string; fills?: (OrderLine & { filledAt: string; demo: true })[] };

export interface BrokerAdapter {
  connect(credentials: BankCredentials): Promise<{ ok: true; demo: true }>;
  /* Step 1 (Directive 19:22 item 1): approved in Woodstock and "sent to Questrade" (demo: recorded). */
  submitOrders(batch: OrderBatch): Promise<BrokerStatus>;
  /* Step 2: "Approve in demo Questrade". Fills at demo prices; the engine applies them to holdings. */
  approveOrders(batch: OrderBatch): Promise<BrokerStatus>;
}

export type Subscription = {
  product: string; status: "none" | "trial" | "active" | "cancelled"; startedAt?: string; trialEndsAt?: string; via?: "applepay-demo" | "storekit"; demo: true;
};

export interface BillingAdapter {
  products(): { id: string; price: number; currency: "CAD"; period: "month"; trialDays: number }[];
  status(): Promise<Subscription>;
  /* Demo: the pay sheet charges nothing (Compliance floor 1; Directive 19:22 item 3). */
  purchase(productId: string): Promise<Subscription>;
  cancel(): Promise<Subscription>;
}

export type ThreadMessage = {
  id: string; from: "woodstock" | "me"; text: string; at: string; card?: { type: string; data?: unknown }; templateId?: string;
};

export interface MessagingAdapter {
  thread(): Promise<ThreadMessage[]>;
  /* Woodstock sends a message (payday request, spending note). Production: push plus the thread. */
  send(templateId: string, text: string, card?: ThreadMessage["card"]): Promise<ThreadMessage>;
  /* She writes in the thread. */
  post(text: string): Promise<ThreadMessage>;
  replaceThread(messages: ThreadMessage[]): Promise<void>;
  registerDevice(token: string): Promise<void>;
}

export type AiSurface = "messages" | "talk" | "portfolio-chat" | "interview";
export type AiReply = { text: string; action?: { type: string; [k: string]: unknown } | null; source: "scripted" | "live" };
export type AiResponder = (surface: AiSurface, text: string, ctx: { state: unknown }) => Promise<AiReply> | AiReply;

export interface AiAdapter {
  reply(surface: AiSurface, text: string, ctx: { state: unknown }): Promise<AiReply>;
  /* Tonight the replies are scripted: screens-engineer-b registers the scripted responder. */
  setResponder(fn: AiResponder): void;
}

export interface ClockAdapter {
  /* The demo's "today" comes from the state (WS.state.today); production uses real time. */
  now(state?: { today?: string } | null): Date;
}

export type Adapters = {
  auth: AuthAdapter; bank: BankAdapter; broker: BrokerAdapter; billing: BillingAdapter;
  messaging: MessagingAdapter; ai: AiAdapter; clock: ClockAdapter;
};
