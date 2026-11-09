/*
 * @woodstock/talk-engine: Woodstock's conversations as pure TypeScript (no React, no DOM, no storage).
 * Figures come from @woodstock/engine (env.ts); the server can import this package as is.
 *   createTalk(getState, opts?)            Talk it through: reply(text), validate(action), apply(draft, card), followUp(after, card)
 *   createInterview(getState, opts?)       the goals interview: question(), answer(text, chip?), summary(), saveEdit(), commit(draft)
 *   createPortfolioChat(getState, opts?)   Ask about these portfolios: reply(text), figures(), horizon()
 *   createBuilder(getState)                Build my own and Build it with me: draft, helper(text), applyRows(), save(draft)
 *   validAction / applyAction / followUp   confirm cards, one rule set (no buy or sell card, ever)
 * Owner: Engineer 3. Ported from the prototype modules at v7.3 round 5 (patches_eng3/).
 */
export { createTalk } from "./talk.ts";
export type { TalkOptions } from "./talk.ts";
export { createInterview } from "./interview.ts";
export { createPortfolioChat } from "./pchat.ts";
export type { PchatOptions } from "./pchat.ts";
export { createBuilder } from "./bmo.ts";
export { validAction, applyAction, followUp, isTrade, TALK_OK, LINK, findGoal } from "./actions.ts";
export type { Action, Card, Row } from "./actions.ts";
export { takeHome } from "./tax.ts";
export { compute as portfolioBands, rates as portfolioRates, plannedMonthly } from "./bands.ts";
export const TALK_ENGINE_VERSION = "talk-engine-0.1.0 (prototype v7.3 round 5)";
