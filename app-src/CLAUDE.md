# Woodstock app (Stage 1): rules for every agent

Woodstock is a Canadian goal-planning app: goals first, pay yourself first, and a payday approval flow that moves money to the user's own Questrade accounts. Stage 1 runs entirely on demo bank and demo Questrade data. Nothing connects to a real bank or broker and nothing is charged.

This repo is the real app: React Native with TypeScript on Expo SDK 58 and Expo Router. Tonight's deliverable is the web build, installed to the iPhone home screen as a PWA and served from GitHub Pages at https://connorluciani.github.io/woodstock/. The same codebase builds the iOS app with EAS later (docs/OVERNIGHT_RUNBOOK.md, "iOS later").

## Sources of truth

| What | Where |
|---|---|
| Binding decisions | `/home/claude/app/decisions/directives.md` (on the Mac: the prototype folder). Read 18:39, 19:22, 21:21, 21:26, 21:40, 22:26 and 22:40 before any change. |
| Reference design and behaviour | The HTML prototype, `releases/woodstock_v7_3_2.html`; v7.3.3 is in progress as `woodstock.html`. Never edit either. |
| Figures | The engine golden tests (`packages/engine/test/`), ported from `qa/engine/` in the prototype. The app must match them. |
| Style | `docs/ux_polish_spec.md` section 11 in the prototype folder; the tokens in `src/design/tokens.ts`. |
| Onboarding target | `docs/onboarding_streamline.md` in the prototype folder (9 screens, "Before we start" last). |
| Architecture | `docs/production_plan.md` and `docs/prototype_refactor.md` in the prototype folder. |
| Guardrails | `qa/compliance.md` in the prototype folder; summary below. |
| Coordination | `/home/claude/app/decisions/inbox.md`: post questions, "SHELL PATCH", "DESIGN REQUEST" and stage reports there, labelled with the real Toronto clock (`TZ=America/Toronto date +%H:%M`). |

## Legal guardrails (binding; Compliance owns the wording)

1. **Woodstock is not a registered adviser or dealer.** It never picks, ranks, recommends or preselects a portfolio or a fund for her. The four portfolios are the same for everyone, shown in a fixed order, nothing highlighted. Her pick is confirmed by her tap ("I chose Balanced myself").
2. **No protected titles.** Never "financial planner", "financial advisor", "wealth manager", "AI advisor" for Woodstock, the app or the chat. People she can book are "planners" who hold the CFP or QAFP credential, labelled "Demo example". The conversation screen is "Talk it through".
3. **Nothing moves without her approval.** Plan changes need one confirm tap. Anything that moves money, buys or sells needs Approve plus Face ID (`adapters.auth.confirmApproval`). A typed "yes" never executes. Sells only with "Allow sell orders for withdrawals" on, proportional to her holdings, whole units.
4. **No return promises.** Projections of her money carry one word beside the figure: "Estimate" or "Illustration" (Compliance 21:22 floor). Never "will grow", "guaranteed", "you'll have $X", "best for you", "people like you".
5. **Minimum labels only (Directives 21:21 and 22:26).** No disclaimer paragraphs on screens. Where a method note would go, one line: "How this is worked out: see Terms, section N." (`<TermsLink section={N} pointer />`). The only inline labels are Compliance's floor: the Demo pill on screens with demo figures; "(demo)" on completion statuses (sent, approved, moved); "Demo: don't use your real password." at sign-in; "Estimate" / "Illustration"; "For age rules only. Not saved." at the birth-year question; "Set by Woodstock" on the savings-fund default; "Demo example" on planners; the subscription price line ("$15 a month plus tax ... billed through your Apple account until you cancel", with "Demo: nothing is charged.").
6. **"Before we start" is the final onboarding step** (Directive 21:21 item 3, onboarding_streamline step 9): key terms in plain words and one "I agree" button, enabled once she has scrolled to the end. No payday pull, order or subscription is possible before she agrees; "Not now" lands on Home with "Before we start" first in Finish setting up.
7. **Credentials are never kept.** Demo bank and Questrade sign-in fields are cleared on Continue: never stored, logged, sent or put in state (adapters scrub them).
8. **Demo honesty.** Demo bank profiles are made-up people. The demo Questrade approval uses Woodstock's own neutral styling, titled "Approve in demo Questrade", no Questrade logo or colours. The demo pay sheet has no Apple mark.
9. **Copy rules.** No em or en dashes anywhere visible (ranges use "to"). en-CA: "$1,141", "Fri, Nov 20", "April 2027". Whole dollars for planning figures, cents only for exact balances, holdings and order lines. "a payday", never "a pay" or "per pay". One name per concept (UX spec 11.3): Allowance, Usual, Essentials, Pay yourself first, Payday request, Savings fund, Talk it through, planner, Terms and conditions. Plain, calm, second person; no exclamation marks; no red alarms (amber for "needs a look").

`npm run lint:copy` enforces 9 and part of 2 and 4. Any new on-screen sentence that sounds legal goes to Compliance through the inbox first.

## Architecture rules (Directive 18:39)

- **Money logic lives in `packages/engine`** (`@woodstock/engine`): pure TypeScript functions with an explicit state argument; no React, React Native, Expo, storage or `src/` imports. Screens and the store call it; they never duplicate arithmetic (pay dates, budget, goals, pay yourself first, projections, affordability, payday request, order building, validators, subscription state).
- **Every mock sits behind an adapter** in `src/adapters/` (`auth`, `bank`, `broker`, `billing`, `messaging`, `ai`, `clock`) with the shape the real integration will have (`src/adapters/types.ts`). Adapters do input and output only; the engine applies the results to state.
- **State** lives in `src/state/AppState.tsx`: `useApp()` gives `{ state, update, replace, adapters, session, ... }`; `useWS()` gives the state inside the tabs. Change state only through `update((draft) => engine.someApply(draft, ...))`. It persists per user in AsyncStorage through `src/adapters/storage.ts`.
- **The shared design system** is `src/design` (import from `@/design`): tokens, `Text`, `Screen`, `Section`, `Row`, `Card`, `ConfirmCard`, `Sheet`, `Button`, `Chip`, `ChoiceChip`, `Toggle`, `Segmented`, `ProgressRing`, `ProgressBar`, `Avatar`, `DemoPill`, `TermsLink`, `SpendingChart`, `BandChart`, `MixBar`, `Icon`, `toast`, `showFaceIdHud`. Never hard-code colours, sizes or spacing (spacing scale 4, 8, 12, 16, 24, 32; gutter 16). Formatting helpers: `src/lib/format.ts` (`cad0`, `cad2`, dates).
- **Navigation.** Expo Router. Pages push inside a tab's stack (back chevron via `<Screen back="Plan">`); tasks open a `Sheet`; conversations and multi-step flows are full-screen modals at the root (`/payday`, `/talk`). UX spec 11.6.

## The single-writer rule and directory ownership

Each path has exactly one writer. If you need a change in a path you do not own, post it to the inbox as **"SHELL PATCH <file>"** (exact old and new text) or **"DESIGN REQUEST <component>"** for the owner to apply. Reading anything is always fine.

| Owner | Writes only in |
|---|---|
| **mobile-lead** | Everything not listed below: `app/_layout.tsx`, `app/index.tsx`, `app/(tabs)/_layout.tsx`, every tab's `_layout.tsx`, `app/profile.tsx`, `app/terms.tsx`, `src/design/**`, `src/adapters/**`, `src/state/**`, `src/lib/**`, `src/content/**`, `public/**`, `scripts/**`, `tests/smoke.mjs`, `app.json`, `package.json`, `tsconfig.json`, `CLAUDE.md`, `.claude/**`, `docs/**`. Integration of everyone's work. |
| **engine-engineer** | `packages/engine/**` only (source, fixtures, tests, its tsconfig). |
| **screens-engineer-a** | `app/(onboarding)/**`, `app/(tabs)/home/**` (not `_layout.tsx`), `app/(tabs)/plan/**` (not `_layout.tsx`), goal screens (`app/(tabs)/home/goal/**`, `app/(tabs)/plan/goal/**`), `src/features/onboarding/**`, `src/features/home/**`, `src/features/plan/**`, `src/features/goals/**`, `tests/flows/a-*.mjs`. |
| **screens-engineer-b** | `app/(tabs)/money/**`, `app/(tabs)/calendar/**`, `app/(tabs)/messages/**` (not `_layout.tsx`), `app/payday/**` (payday request and the demo Questrade approval), `app/talk/**` (Talk it through), `src/features/money/**`, `src/features/calendar/**`, `src/features/messages/**`, `src/features/payday/**`, `src/features/talk/**`, `tests/flows/b-*.mjs`. Registers the scripted responder with `adapters.ai.setResponder`. |
| **rn-qa** | `tests/flows/qa-*.mjs`, `tests/reports/**`. Reports defects to owners through the inbox; never edits app code. |
| **release-manager** | Runs the gate and `scripts/deploy.sh`; writes `docs/RELEASES.md`. No app code. |

Shared rule for screens engineers: a component used by both A and B belongs in `src/design` (ask the lead). Feature-local components stay in your `src/features/<area>/`.

## Conventions

- Every route's root view has `testID="screen-<name>"` (tabs: `screen-home`, `screen-plan`, `screen-money`, `screen-calendar`, `screen-messages`). Interactive elements that a test drives get a `testID`.
- Tab roots: `<Screen title="Home" large left={<DemoPill />} right={<Avatar ... onPress={() => router.push("/profile")} testID="avatar" />}>`.
- Today's date comes from `adapters.clock.now(state)` (the demo's fixed "today", 2026-11-09), never `new Date()` in a screen.
- Imports: `@/...` for `src/`, `@woodstock/engine` for the engine. Engine imports use explicit `.ts` extensions so Node runs its tests directly.
- No new npm dependency without the lead (post to the inbox). Use `npx expo install <pkg>` with `EXPO_OFFLINE=1` so versions match SDK 58.
- Commits: small, one area, message ending with the two attribution lines below. Only the lead and release manager push.

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CT7ga6ET8QSZyYKrjxzaYQ
```

## Run, test, build

```bash
npm install                      # once; offline afterwards
npx expo start --web             # dev server (http://localhost:8081/woodstock/)
npm run typecheck                # app and engine
npm run lint:copy                # dashes, titles, banned phrases, placeholders
npm run test:engine              # engine unit and golden tests (Node, no bundler)
npm run build:web                # expo export -> dist/ + 404.html, route pages, sw.js, .nojekyll
npm run smoke                    # Playwright, 390 x 844, light and dark, against dist/
npm run gate                     # all of the above in order
scripts/deploy.sh "Stage N: ..." # release-manager: copy dist/ to the Pages repo /docs, push
```

Everything runs offline after `npm install`: `EXPO_OFFLINE=1` is set by the build script and no Expo login is needed. On a Mac, Playwright needs `npx playwright install chromium` once.

## Definition of done, per stage

A stage is done only when all of these hold:

1. `npm run gate` passes: typecheck, copy lint, engine tests (golden figures match the prototype), web build, smoke at iPhone size in light and dark with zero console errors and no horizontal overflow.
2. The stage's own flow test in `tests/flows/` passes (each screens engineer adds one per stage).
3. The screens match the prototype's figures and flows for the Skip profile (Alandra Gray) and for a fresh sign-up, and look like a finished iOS app (UX spec 11).
4. No em dashes, no disclaimer paragraphs; only Compliance's minimum labels.
5. Deployed: `dist/` copied to the Pages repo's `docs/` and pushed; the stage is posted to the inbox with the build version from `dist/build.json`.

Stage order (Directive 22:40): 0 shell and design system; 1 engine with tests; 2 onboarding; 3 Home and the payday approval flow; 4 Plan and goals; 5 Money and Calendar; 6 Messages and Talk (scripted); 7 the rest (profile settings, Finish setting up, subscription, polish). Gates and deploy steps: `docs/OVERNIGHT_RUNBOOK.md`.
