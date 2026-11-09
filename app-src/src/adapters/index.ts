/*
 * The active adapter set. Stage 1 tonight: all demo. Later stages replace one entry at a time
 * (bank: Flinks in Stage 2; broker: Questrade in Stage 3), with no change to screens.
 */
import { demoAdapters } from "./demo";
import type { Adapters } from "./types";

export const adapters: Adapters = demoAdapters;
export * from "./types";
