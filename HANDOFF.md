# Morning Handoff: Woodstock Web Build

Prepared by the Release Manager for Connor. Status as of 03:30, 9 November 2026 (Toronto time). Updated if a later build is deployed before 10:00.

## 1. What is live

**Link for friends:** https://connorluciani.github.io/woodstock/install.html (install steps), which opens the app at https://connorluciani.github.io/woodstock/.

| Item | Value |
|---|---|
| Live build | 202611090757-5d6b545 (React Native web export, Expo SDK 58) |
| App source commit | woodstock-app 5d6b545 (private repository connorluciani/woodstock-app) |
| Pages commit | e278d90 on main of connorluciani/woodstock, served from /docs |
| Deployed | 03:10 Toronto time |
| Previous deploy | adec94f (build of 48310b9), 02:41 |

The public repository contains only README.md (Compliance's prototype notice), LICENSE ("Copyright Project Woodstock. All rights reserved.") and docs/ (the built web export, .nojekyll and install.html). It contains no app source. The live site could not be opened from the build environment, because github.io is blocked there; every check below was run on the identical files served locally under /woodstock/. Please open the link once on your phone to confirm.

## 2. What works

- First screen: the prototype splash with the "Woodstock (prototype)" marker, then the welcome video (ElevenLabs "John" V2 cut, captions fully visible).
- Sign-up: ten steps, from account creation through bank connection (any username and password; nothing is sent or saved), your month, the goals interview, your plan, Questrade, the portfolio pick (nothing preselected) and "Before we start" last. Each sign-up gets its own randomized demo account; Skip opens the Alandra demo profile. Progress survives a reload.
- Home: "Am I on track?", spending chart, Needs you, goals, and the payday request.
- Payday approval: request, demo Face ID, demo money pull, Send to Questrade, approval in demo Questrade, statuses marked "(demo)". Goal figures match the prototype engine to the cent.
- Plan and goals: goal rows, goal pages with projections, edit with a confirm card, add a goal, bills (add, change, remove), Talk to a planner (demo examples, illustrative pricing).
- Money: accounts, account detail and activity, Change portfolio with the portfolios video.
- Calendar, Messages (with the Messages to Talk handoff) and Talk it through. Chat uses the live Worker (version 3.1) with the scripted engine as fallback; every live reply and action passes the app's guardrail filters.
- Profile and Settings, Terms (16 sections), demo subscription sheet ("Illustrative price. Not for sale.").
- Installs to the home screen, opens full screen, works offline after the first load, light and dark themes.

## 3. What is unfinished

- Third-round items not in the live build: bills frequency, Plan rows opening the editor (Screens A 47f2901), and the remaining UX P2 polish items from the overnight reviews.
- Real accounts: bank and brokerage connections, payments and the subscription are demonstrations only.
- No native iPhone app yet (section 8).

## 4. Test results (live build 5d6b545)

| Check | Result |
|---|---|
| Clean-clone `npm ci` and `npm run gate`: typecheck, copy lint, engine tests, talk-engine tests, web export, smoke at 390 wide in light and dark | PASS: engine 92 of 92, talk 48 of 48, smoke 337 checks, 0 failures |
| Release Manager dist audit: no source, source maps or internal files; no design gallery; only the V2 videos (md5 verified); no old Kokoro media; title "Woodstock (prototype)" | PASS |
| Release Manager pre-push smoke on docs/ at 390 x 844 light and 375 x 667 dark: loads, manifest and icons, service worker, offline, sign-up through "Before we start" to Home, every tab, zero console errors | PASS |
| Compliance public demo checklist (G3) | PASS, 03:06 |
| RN QA full suite on the previous deploy 48310b9 | 1,550 pass, no P0; the open items were P2 and are fixed in 5d6b545 except clipped goal names on Plan at 375 wide |

## 5. Install steps for friends

Send https://connorluciani.github.io/woodstock/install.html.

**iPhone:** open the link in Safari (not inside another app's browser), tap Share, tap Add to Home Screen, then tap Add. Open Woodstock from the new icon.

**Android:** open the link in Chrome, tap Install app (or the three-dot menu, then Install app or Add to Home screen), and confirm.

Updates: close the app fully and reopen it to pick up a new build. Tell friends not to enter real passwords or account details; the app says so on every sign-in screen.

## 6. Known issues

1. Plan goal names can be clipped at 375 points wide (smaller iPhones), for example "Emergency fu...". Cosmetic.
2. The live chat cannot be tested from the build environment (workers.dev is blocked there); it was tested against a mocked Worker. If the Worker is unreachable, the app falls back to scripted replies.
3. The Pages repository history still contains the app source from the reverted push of 23:05 (commit 69b60bf). No keys or secrets were found in it. Removing it needs a force-push or a fresh repository, which is your decision.
4. The API key behind the chat Worker should have a monthly spend cap before the link spreads beyond close friends (workers.dev allows no rate-limit rule; the Worker's per-IP limit applies).
5. The welcome video says "financial planner" once. Compliance accepted it for Ontario only; re-record that line before any launch outside Ontario.

## 7. Decisions waiting for you

1. Keep or clean the Pages repository history (issue 3).
2. Confirm the spend cap on the API key (issue 4).

## 8. Next steps for a real iPhone app

The same React Native code produces the iOS app; no rewrite is needed.

1. Join the Apple Developer Program (USD 99 a year) with your Apple ID.
2. On your Mac, from a clone of the private woodstock-app repository: `npm install`, `npx eas-cli@latest login`, `npx eas-cli@latest build:configure`.
3. Build with `npx eas-cli@latest build --platform ios --profile preview` and install it through TestFlight (`npx eas-cli@latest submit --platform ios`).
4. Before the first TestFlight build: replace the demo Apple Pay sheet with a StoreKit subscription, move the demo adapters to the Stage 1 server, and add push notifications for the payday request. Face ID already uses expo-local-authentication on device.

Details: woodstock-app docs/OVERNIGHT_RUNBOOK.md ("iOS later") and docs/app_publishing_guide.md in the prototype folder.
