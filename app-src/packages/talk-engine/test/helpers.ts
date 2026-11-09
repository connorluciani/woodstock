import { seedState } from "../../engine/src/index.ts";
import { createTalk } from "../src/talk.ts";
export function fresh(): any { return seedState(); }
/** A Talk session on a fresh Skip profile; reply() clears any open question first, like a new conversation. */
export function talkOn(s?: any) {
  const S = s || fresh(), t = createTalk(() => S);
  return { S, t, ask: (q: string) => { t.ctx.pending = null; t.ctx.lastCompare = null; return t.reply(q); }, say: (q: string) => t.reply(q) };
}
export const cards = (t: any, r: any) => (r.actions || []).map((a: any) => t.validate(a)).filter(Boolean);
export const DASH = /[—–]/;
