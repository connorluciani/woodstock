# Overnight runbook: Woodstock Stage 1 app

Directive 22:40: build the Stage 1 app properly in React Native with TypeScript (Expo), overnight. Tonight's deliverable is the web build, installable to the iPhone home screen and hosted at https://connorluciani.github.io/woodstock/. The backup link for friends, if the app is not complete by morning, is the HTML prototype PWA (/home/claude/app/pwa).

## Team and order of work

| Stage | What | Owner | Can start when |
|---|---|---|---|
| 0 | App shell, five tabs, design system, adapters, store, PWA build, smoke test | mobile-lead | now (done: "RN SCAFFOLD READY" in the inbox) |
| 1 | Engine package: pay schedule, budget, goals, payday request, order batch, projections, demo profiles, policy; golden tests | engine-engineer | now, in parallel with stage 0 |
| 2 | Onboarding (9 screens, docs/onboarding_streamline.md), "Before we start" last | screens-engineer-a | stage 0 ready |
| 3 | Home ("Am I on track?", spending chart, Needs you, goals, Finish setting up) and the payday approval flow (request, Face ID, demo pull, Send to Questrade, Approve in demo Questrade, demo fills) | A (Home), B (payday) | stage 1 exports budget, payRequest, buildBatch, applyPull, applyFills |
| 4 | Plan and goals (goal rows, goal detail page, edit sheet, add a goal, pay yourself first, portfolio pick with band charts) | screens-engineer-a | stage 3 |
| 5 | Money (accounts, account detail, investing, change portfolio) and Calendar | screens-engineer-b | stage 3 |
| 6 | Messages thread and Talk it through, scripted, with the policy filters | screens-engineer-b | stage 5 |
| 7 | The rest: profile settings, subscription (demo pay sheet), Finish setting up items, polish, accessibility | all, lead integrates | stage 6 |

QA (rn-qa) runs on every stage candidate. Compliance and PM acceptance follow their existing processes (.claude/agents/compliance.md, pm-acceptance.md).

## Gate for every stage

Every stage must leave a working, deployable web build. A stage passes when:

1. `npm run gate` passes:
   - `npm run typecheck` (app and engine)
   - `npm run lint:copy` (no dashes, titles, banned phrases or placeholders)
   - `npm run test:engine` (golden figures match the prototype)
   - `npm run build:web` (offline export to dist/)
   - `npm run smoke` (Playwright at 390 x 844, light and dark: zero console errors, no horizontal overflow, no dashes in visible text, every tab, profile, Terms, reload, deep link, manifest and service worker, plus every tests/flows/*.mjs)
2. rn-qa's stage report has no open P0.
3. The stage's screens show only Compliance's minimum labels (CLAUDE.md, guardrail 5).

If a stage cannot pass by its slot, ship what passes (the previous stage stays deployed) and post the blocker; never deploy a failing build.

## Deploy

```bash
cd /home/claude/woodstock-app
npm run gate
scripts/deploy.sh "Stage N: <one line>"
```

`scripts/deploy.sh` copies dist/ into /home/claude/woodstock/docs/ (with .nojekyll), copies the tracked source into app-src/, commits with the two attribution lines, runs `git fetch origin main` and rebases, then pushes main. GitHub Pages serves /docs on main. It never force-pushes. Then post "RELEASED Stage N <version from dist/build.json>" to the inbox.

Base URL: the app is built for /woodstock/ (app.json experiments.baseUrl; public/index.html; public/manifest.webmanifest; src/lib/pwa.ts). Changing the repo name means changing all four.

## Install on the iPhone

1. Open https://connorluciani.github.io/woodstock/ in Safari.
2. Share, then Add to Home Screen. It opens standalone, full screen, with the Woodstock icon.
3. Updates: the service worker fetches the new page on next launch; close and reopen the app once to pick up a new build.

## Continuing on the Mac (Claude Code)

```bash
git clone https://github.com/connorluciani/woodstock && cd woodstock/app-src
npm install
npx playwright install chromium     # once, for the smoke test
npm run gate
```

The agents in .claude/agents/ carry the same roles. Set PAGES_REPO to the clone's root before `scripts/deploy.sh` (it copies into $PAGES_REPO/docs). Paths in CLAUDE.md under /home/claude/app refer to the prototype folder; keep a copy of it beside the repo.

## iOS later (EAS)

When the founder has an Apple Developer membership (docs/app_publishing_guide.md in the prototype folder):

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform ios --profile preview
npx eas-cli@latest submit --platform ios
```

The same code runs natively: Face ID uses expo-local-authentication (already wired in adapters.auth.confirmApproval), the demo HUD is web only. Before the first TestFlight build: replace the demo Apple Pay sheet with a StoreKit subscription (production_plan 3.3), move the adapters to the Stage 1 server, and add push notifications for the payday request.
