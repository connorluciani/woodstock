/* Demo data: Alandra and the five bank profiles, and the boot step the prototype ran when the page was ready. */
import type { Ctx, DemoState } from "../types.ts";
import { ALANDRA } from "./alandra.ts";
import { assignProfile, profileState, type ProfileStore } from "./profiles.ts";
import { applyKeepDefaults } from "../keep.ts";
import { applyPlanPerPay } from "../plan.ts";
import { applyBatch, applyRefreshRequest } from "../payday.ts";

export { ALANDRA } from "./alandra.ts";
export { BANK_PROFILES, assignProfile, bankShort, profileState, type BankProfile, type ProfileStore } from "./profiles.ts";

/** A fresh copy of Alandra's state, exactly as the prototype seeds it. */
export function demoState(): DemoState { return JSON.parse(JSON.stringify(ALANDRA)) as DemoState; }

/** What the prototype did on "ready": short-term goals get their starting fund, the per-account split is synced,
    today's request follows her goals, and today's orders are built from her target. Mutates and returns s. */
export function applyBoot(s: DemoState, ctx?: Ctx): DemoState {
  applyKeepDefaults(s, ctx);
  applyPlanPerPay(s);
  applyRefreshRequest(s);
  applyBatch(s);
  return s;
}

/** A booted Alandra. */
export function bootDemoState(ctx?: Ctx): DemoState { return applyBoot(demoState(), ctx); }

/** A new sign-up: the next profile in turn at the bank she picked, booted. Returns the state and the new store to save. */
export function signUpState(store: ProfileStore | null | undefined, key: string | null, bank: string, ctx?: Ctx): { state: DemoState; index: number; store: ProfileStore } {
  const r = assignProfile(store, key), st = applyBoot(profileState(demoState(), r.index, bank), ctx);
  return { state: st, index: r.index, store: r.store };
}

/** The Skip profile (Alandra Gray) after boot: the app store's seed. */
export function seedState(ctx?: Ctx): DemoState { return bootDemoState(ctx); }
