# Woodstock design system (React Native)

Owner of this spec: UX Design Lead. Owner of the code: Mobile Lead (src/design). Date: Nov 8, 2026, 22:57 Toronto.
Sources: the HTML prototype (latest release) for look and behaviour; docs/ux_polish_spec.md section 11 (style rules) and docs/onboarding_streamline.md in /home/claude/app/docs; Directives 21:21, 21:40, 22:26 and 22:40; Compliance 21:22 and 22:27 for the few words that must stay on screen.

The bar (Directive 22:40, coordinator): it looks like a finished native iOS app, at 390 pt wide, in light and dark.

This spec starts from what is already in src/design (tokens.ts, theme.tsx, components/*). Where it says **Keep**, the code already matches. Where it says **Change** or **Add**, the change is listed with exact values. Screens never hard-code a colour, size, spacing value or font: they read tokens through `useTheme()` and import components from `@/design`.

---

## 1. Principles

1. **Native first.** Every pattern is one an iPhone user already knows: large titles that collapse, inset grouped lists, sheets with a grabber, a translucent tab bar, swipe back. When in doubt, copy iOS Settings and Wallet, then Wealthsimple.
2. **One idea per screen, one hero figure per screen.** A figure appears once per screen; a child layer never repeats its parent's hero (ux_polish_spec 11.2).
3. **Calm.** No red alarms, no exclamation marks, no badges except unread counts. Green means on track, amber means needs a look.
4. **No small print on the way.** Directive 22:26: no multi-sentence disclaimer on any screen. A screen may carry at most one pointer line, "How this is worked out: see Terms, section N.", and Compliance's single words ("Estimate", "Illustration", "(demo)", the Demo pill, the price line).
5. **Light and dark are equal citizens.** Every screen is reviewed in both before it ships.

---

## 2. Colour tokens

Semantic tokens only. The palette in tokens.ts is **Keep** except the three changes in 2.2.

### 2.1 Roles

| Token | Light | Dark | Use |
|---|---|---|---|
| bgGrouped | #F2F2F7 | #000000 | Screen background behind inset grouped lists (Home, Plan, Money, Calendar, Profile) |
| bgPlain | #FFFFFF | #000000 | Full-bleed screens: onboarding, Talk, Messages, Terms |
| bgCard | #FFFFFF | #1C1C1E | Cards and list cells on bgGrouped |
| bgElevated | #FFFFFF | #2C2C2E | Anything above a card: popovers, scrubber readout, cells inside a sheet in dark |
| sheetBg / sheetCell | #F2F2F7 / #FFFFFF | #1C1C1E / #2C2C2E | Sheet background and its cells (dark sheets lift one step, as iOS does) |
| textPrimary | #000000 | #FFFFFF | Titles, body, every money figure |
| textSecondary | #3C3C43 at 60% | #EBEBF5 at 60% | Sublines, labels, captions. Never a money figure she must act on |
| textTertiary | #3C3C43 at 30% | #EBEBF5 at 30% | Placeholders and disabled text only |
| separator | #3C3C43 at 29% | #545458 at 60% | Hairline between rows, inset to the text start |
| accent | #1F5E4B | #5FB394 | Links, text buttons, selected states, the green chart line, primary button fill |
| accentPressed | #174A3B | #4E9C80 | Pressed primary button |
| accentTint | #E4EFEA | #5FB394 at 16% | Secondary button fill, selected chip, icon tiles |
| onAccent | #FFFFFF | #06251B | Text on accent fills |
| positive | #1A7F45 | #4CC27A | "On track", gains |
| warning | see 2.2 | #FFB340 | "Needs a look", over-usual spending, the Demo pill text |
| warningTint | #FBF0DD | #FFB340 at 14% | Demo pill and warning chip fill |
| negative | #C8372D | #FF6A5E | Destructive actions only (Delete goal, Cancel subscription). Never for balances, debt or net worth (D-22:36) |
| chartLine / chartGrid / bandLight | as tokens.ts | as tokens.ts | Charts (section 7) |
| sleeveCa, sleeveUs, sleeveIntl, sleeveBond, sleeveCash | as tokens.ts | as tokens.ts | Mix bars and holdings dots, the same colour for the same sleeve everywhere |
| bubbleOut, bubbleIn, imessageBlue | as tokens.ts | as tokens.ts | Messages thread only. Talk uses accent, not iMessage blue |
| materialBar | rgba(249,249,249,0.86) | rgba(22,22,24,0.82) | Nav bar and tab bar, with a 20 pt blur (expo-blur on native, backdrop-filter on web) |
| backdrop | black at 40% | black at 55% | Behind sheets and the Face ID HUD |

### 2.2 Changes (contrast, measured)

| Pair | Now | Ratio | Change to | New ratio |
|---|---|---|---|---|
| warning text on white (light) | #B26A00 | 4.24:1 (fails 4.5) | **#9C5B00** | 5.37:1 |
| Demo pill text, warning on warningTint (light) | #B26A00 on #FBF0DD | 3.76:1 (fails) | **#9C5B00** on #FBF0DD | 4.76:1 |
| chevron on bgCard (dark) | #5A5A5E | 2.48:1 | Keep (decorative, iOS value). Rows must never rely on the chevron alone to look tappable |

All other text pairs pass 4.5:1 in both themes (accent 7.61 and 6.78; positive 5.04 and 7.54; negative 5.20 and 6.06; dark warning 9.54). textSecondary is iOS's own secondaryLabel (3.44:1 light); it is allowed for sublines, as in iOS, but no money figure, status word or instruction may use it.

### 2.3 Dark mode rules
- Pure black only for screen backgrounds. Cards are #1C1C1E, things above cards #2C2C2E. No borders to separate cards; elevation does it.
- No shadows in dark (shadows invisible on black); the elevation step replaces them. Light-mode shadows only on: Segmented thumb, scrubber readout, Face ID HUD, toasts.
- Chart colours, mix bars, illustrations and video posters each have a dark value. Video posters and the welcome illustration need a dark-background frame (no white boxes in dark).
- Status bar: dark content on light, light content on dark; on web, `theme-color` follows bgGrouped or bgPlain of the current screen (theme.tsx already does bgGrouped; onboarding and Talk need bgPlain).

---

## 3. Typography

Font: SF Pro on iOS (system). Web: the -apple-system stack already in tokens.ts, which renders SF on iPhone and Mac. Money figures use SF Pro Rounded with tabular numbers (`fonts.num`), so digits line up and do not jump while counting or scrubbing.

### 3.1 Scale (Keep tokens.ts values; usage rules added)

| Variant | Size / line | Weight | Use | Never |
|---|---|---|---|---|
| largeTitle | 34 / 41 | Bold | Tab screen titles (Plan, Money, Calendar), onboarding step titles, Home headline ("You're on track.") | More than one per screen |
| title1 | 28 / 34 | Bold | Sheet titles that act as page titles (Change portfolio, Where to keep it) | |
| title2 | 22 / 28 | Bold | Card titles that lead a section (payday request card title) | |
| headline | 17 / 22 | Semibold | Row titles that need weight, card headings, button labels | Body paragraphs |
| body | 17 / 22 | Regular | Row titles, chat bubbles, sentences | |
| callout | 16 / 21 | Regular | Chips and choice chips | |
| secondary | 15 / 20 | Regular | Row sublines, supporting lines under a hero | Money she must act on |
| footnote | 13 / 18 | Regular | The one pointer line per screen, chart axis labels, Demo pill | Anything longer than one line |
| sectionHeader | 13 / 18 | Regular, uppercase | Section headers of grouped lists | Sentences |
| caption | 12 / 16 | Regular | Chart legends, tab-free micro labels | |
| tab | 10 / 12 | Medium | Tab bar labels only | |
| hero | 44 / 48 | Semibold, rounded, tabular | One hero figure per screen (Home allowance, Money "what you have", goal saved) | Two on one screen |
| heroSmall | 34 / 40 | Semibold, rounded, tabular | Hero inside a sheet | |
| figure | 17 / 22 | Semibold, rounded, tabular | Right-aligned row values, totals | |

### 3.2 Rules
- Cents in a hero render at 60% size and textSecondary ("$11,736" + ".15"), as the prototype does. Planning figures have no cents at all (ux_polish_spec 11.2).
- Truncation: titles may truncate with an ellipsis at one line; **figures never truncate**. Sublines wrap to at most two lines (`subtitleLines={2}`); if more is needed, shorten the copy.
- Dynamic Type (native): `allowFontScaling` on, `maxFontSizeMultiplier` 1.6 for body and 1.3 for hero, so the layout holds at accessibility sizes. Rows grow in height, never clip.
- Web: disable `-webkit-text-size-adjust`; no text selection on buttons, rows, tabs and chips (`userSelect: "none"`); selection stays on chat bubbles and Terms.

---

## 4. Spacing, layout and shape

### 4.1 Spacing scale (Keep)
`space`: 4 (xs), 8 (s), 12 (m), 16 (l), 24 (xl), 32 (xxl). Layout code uses only these.

**Native intrinsic metrics** are allowed exceptions, because they are iOS's own measurements and make controls look native: row vertical padding 11, choice chip horizontal padding 14, segmented control height 32 with 2 pt inset, nav bar 44, tab bar 49 plus the home indicator inset, grabber 36 x 5, switch 51 x 31. They live in the component, never in a screen.

### 4.2 Layout
| Measure | Value |
|---|---|
| Side gutter | 16 for inset grouped lists and cards; 16 for text on plain screens; 20 on onboarding steps (wider breathing room, matches iOS setup screens). Nothing else touches the screen edge except full-bleed charts and video |
| Large title block | 3 top, 8 bottom, collapses into the 17 pt semibold nav title on scroll (Screen `large`) |
| Section header to first cell | 8 (header has 6 bottom padding inside the 13 pt label, as iOS) |
| Between sections | 24 (32 before the first section after a hero) |
| Card inner padding | 16 |
| Row | min height 44; leading icon tile 30 x 30 radius 7; 12 between tile and text; separator inset to the text start |
| Bottom of scroll content | tab bar height + safe-area bottom + 24 (`useTabBarInset`) |
| Sticky footer (onboarding, sheets) | 16 sides, 8 above the button, safe-area bottom + 8 below; material background with a hairline top border only when content scrolls under it |
| Max content width on web wider than 430 | 430, centred, bgGrouped outside (desktop preview looks like a phone, not a stretched page) |

### 4.3 Radius and elevation (Keep with one change)
cell 12 (inset grouped list), card 16, sheet 16 (top corners; iOS uses about 10 at the medium detent and 38 at full on device edges; 16 reads correctly on web), button 14, chip fully rounded, icon tile 7. **Change:** ConfirmCard uses `radius.card + 2` (18) hard-coded; make it a token `radius.message: 18` so Messages cards match iMessage rich links.

### 4.4 Motion and haptics
| Event | Motion | Haptic (native) |
|---|---|---|
| Push | 350 ms, ease iOS (0.32, 0.72, 0, 1), slide with 30% parallax of the previous screen | none |
| Sheet in / out | 420 / 280 ms, same curve; backdrop fades | none |
| Press on row or card | background to rowPressed in 100 ms, no scale | none |
| Press on button | opacity 0.85 and accentPressed fill | light impact on primary actions that commit (Approve, I agree, Use this one) |
| Selection change (chip, segmented, tab) | 150 ms | selection |
| Success (approved, goal added) | toast slides from top, 2.4 s | success notification |
| Face ID (demo) | HUD scales 0.9 to 1 in 200 ms, check draws in 300 ms | success notification |
| Reduced motion | all transitions become 150 ms fades; no chart draw-in animation | unchanged |

### 4.5 Icons
SF Symbols on iOS through expo-symbols; on web the matching SVGs in Icon.tsx (Keep). Sizes: tab 25, row tile glyph 17, nav bar 22, inline 15. Stroke weight matches the text weight next to it. **Add** to Icon.tsx for screens already specified: `chart` (Money tab detail), `calendarDay`, `play`, `pause`, `lock` (bank sign-in sheet), `sparkle` (Build it with me), `pencil` (edit goal), `trash`. No emoji anywhere.

---

## 5. Content and number rules (code-enforced where possible)

- Money through `src/lib/format.ts` only: `cad0` for every planning figure, `cad2` only for account balances, holdings, transactions, order lines and prices. Negative: "−$1,240" (U+2212). Never "~", never "$ 2472".
- Periods are always stated: "a month", "a payday" (not "a pay").
- Dates: "Fri, Nov 20" (dayShort), "Nov 20" (monthDay), "April 2027" (monthYear), "Apr 30, 2027" (fullDate) in rows.
- No em dash or en dash in any string (`BANNED_DASHES`, `npm run lint:copy`). Ranges use "to".
- One name per concept (ux_polish_spec 11.3), with one update for Directive 22:26: the legal page is **Terms and conditions**.

| Concept | Use |
|---|---|
| Monthly flexible amount | Allowance; remainder "Left in your allowance" (Home label "Money left in your allowance this month") |
| Spending baseline | Usual |
| Recurring costs excluding debt | Essentials (a single item is a bill) |
| Goals plus debt repayment | Pay yourself first |
| The payday approval | Payday request |
| Short-term default | Savings fund, with the tag "Set by Woodstock" |
| Conversation screen | Talk it through |
| Credentialed person | Planner |
| Legal page | Terms and conditions |

`lint:copy` should also fail on: "Flexible spending", "Left to spend", "Typical month", "batch", "a pay " (with the trailing space), "How Woodstock works".

---

## 6. Components and their states

Every interactive component has these states unless noted: default, pressed, disabled, focused (keyboard and screen reader focus ring: 2 pt accent outline, 2 pt offset, web only), and loading where an action waits. All touch targets are at least 44 x 44 pt (hit slop counts).

### 6.1 Screen and navigation (`Screen`, tab layout)
- **Large title screen** (Plan, Money, Calendar): large title left, Avatar right (36 pt) aligned to the title baseline. On scroll past 44 pt, the title collapses into the nav bar (17 semibold, centred) and the bar gets materialBar plus a hairline bottom border. At rest the bar is transparent with no border.
- **Home**: no title at rest and none collapsed (CR11 s10; ux_polish_spec G5). The headline "You're on track." is content in largeTitle style, the Avatar sits at its right. When scrolled, the bar shows material with no text.
- **Pushed screen**: back chevron plus the previous screen's title ("‹ Money"), 17 regular accent; title centred; swipe from the left edge goes back (native; on web, the browser back button and a 20 pt left-edge swipe area).
- **Tab bar**: 5 tabs (Home, Plan, Money, Calendar, Messages), icon 25 above a 10 pt label, selected accent, unselected tabInactive, material background with a hairline top. Unread badge on Messages only: badge red, 17 pt min diameter, caption bold white. Tapping the selected tab scrolls to top, and a second tap pops to the tab's root.
- States: nav title appears or hides with scroll; back is disabled while a sheet is open.

### 6.2 Lists (`Section`, `Row`)
Inset grouped by default: cells on bgCard with radius 12, 16 from the screen edges.

| Row variant | Layout | Props |
|---|---|---|
| Navigation | title, optional subline, chevron | `onPress`, `chevron` |
| Value | title left, `figure` value right, no chevron unless tappable | `value` |
| Total | as Value with `strongTitle`, value in headline weight, separator above; not tappable, no chevron (ux_polish_spec PL12) | `strongTitle` |
| Toggle | title, subline, Toggle trailing; the whole row toggles | `trailing={<Toggle/>}` |
| Accent action | title in accent, no chevron ("Add a goal", "Show the 14 orders") | `accent` |
| Destructive | title in negative, centred when alone in its section | `destructive` |
| Leading tile | 30 pt tile with a glyph, radius 7 | `leading={<Tile/>}` |

States: pressed (rowPressed fill, full cell width, no rounding change), disabled (title tertiary, no press), loading (value replaced by a small spinner). Separators: hairline, inset to text start, hidden on the pressed row and the row above it (iOS behaviour). Section header: uppercase footnote, textSecondary, 16 from the cell edge; optional right-side accent action ("Add"). Section footer: at most one line, or the Terms pointer.

### 6.3 Card (`Card`)
bgCard, radius 16, padding 16, 16 from the screen edges. Tappable cards press like rows. **Do not nest cards.** A card holds one idea (the spending card, the "You're set up" card, the Finish setting up card).

### 6.4 Hero figure (Add: `HeroFigure`)
Used once per screen. Props: `label` (secondary, 15), `value` (hero), `cents?`, `sub?` (secondary, one line), `qualifier?` ("Estimate" or "Illustration", footnote, textSecondary, placed after the sub on the same line).
States: default; counting (value animates from the previous figure over 400 ms, tabular digits, skipped with reduced motion); scrubbing (the spending chart can drive the label and value; see 7.1).
Example (Home): label "Money left in your allowance this month", value "$924", sub "Of $1,424, after bills and goals. About $308 a week.", qualifier "Estimate".

### 6.5 Buttons (`Button`)
| Kind | Look | Height | Use |
|---|---|---|---|
| primary | accent fill, onAccent headline label, radius 14, full width | 50 | One per screen: the commit action |
| secondary | accentTint fill, accent label | 50 (34 small) | Second action of equal weight, "Use this one" on portfolio cards |
| plain (text) | accent label, no fill | 44 | Cancel, Not now, Skip, Back |
| destructive | negative label, no fill, or negative fill in a confirm sheet | 50 | Delete goal, Cancel subscription |

States: pressed (accentPressed fill, or 0.6 opacity for plain), disabled (fill fillTertiary, label textTertiary; never hidden; tapping a disabled primary highlights the field that is still missing, instead of a line of text such as "Answer above to continue"), loading (label replaced by a spinner in the label colour, width fixed, taps ignored; PM-R65: the first tap after the pull must show this state, never be swallowed), success (label briefly "Done" with a check, 600 ms, then the next state).

### 6.6 Chips
- **Status chip** (`Chip`): 22 high, caption semibold. `ok` positive on positiveTint, `warn` warning on warningTint, `mute` textSecondary on fillTertiary. Used for goal status words only when a row has no room for the word; otherwise the status word is plain text in its colour.
- **Choice chip** (`ChoiceChip`, interview answers, amount chips): callout, 36 min height, radius 18, fillSecondary background. States: default, pressed (fillPrimary), selected (accent fill, onAccent text, and the chip stays visible in the transcript as her answer bubble), disabled (after the question is answered, the unpicked chips fade out in 150 ms and are removed).

### 6.7 Segmented control (`Segmented`)
iOS look: 32 high, fillTertiary track, thumb bgCard (light) or thumb #636366 (dark) with a light shadow in light only, label footnote semibold. Max 4 segments. Used for: 1 year / 5 years, All / FHSA / RRSP / TFSA, Light / Dark / Automatic, % / $ a payday.

### 6.8 Toggle (`Toggle`)
iOS switch 51 x 31, on: positive (#34C759 light, #30D158 dark, as iOS) or accent; pick **accent** for brand consistency and keep it everywhere. Disabled: 50% opacity.

### 6.9 Text field (Add: `TextField`)
Used by sign-up, name, bank sign-in, amounts, chat composer.
- Inside a list cell: label left (body), input right-aligned, or label above the input on onboarding steps (footnote secondary, 8 above). Height 44 min. Placeholder textTertiary.
- Amount field: "$" prefix in textSecondary, numeric keyboard, formats with thousands separators as she types (`cad0`), value right-aligned in `figure`.
- States: default, focused (cursor accent, separator under the field becomes accent on plain screens), error (one line under the field in negative, footnote, plain words: "Add your last name."), disabled.
- Password field: secure entry, "Show" text button; the single line under it on bank and Questrade sign-in: "Demo: don't use your real password." (Compliance floor).

### 6.10 Sheet (`Sheet`)
- Detents: **medium** (about 50% height) for short tasks: pickers, the "Use Balanced?" confirm, Pay and Bills edit; **large** (full minus 10 pt top) for long content: Terms section, Where to keep it, goal edit. On web, medium is 55vh.
- Header: grabber 36 x 5 at 5 from the top; Cancel left (plain), title centred (headline), Done right (headline semibold, accent; disabled until valid). A sheet with no edits shows only Done on the right.
- Behaviour: swipe down or tap the backdrop to dismiss; if there are unsaved edits, a confirm ("Discard changes?" Discard / Keep editing) appears instead. At most two stacked sheets; a third replaces the second.
- Keyboard: the sheet rises with the keyboard; the focused field stays visible.
- Sheet versus page (ux_polish_spec 11.6): sheet for a task with an end or a short explanation; pushed page for browsing deeper (goal detail, account detail, Investing, fund detail, Terms from Settings); full-screen modal for Talk, the portfolio chat and onboarding.

### 6.11 Pickers (Add: `MonthPicker`, `YearWheel`, `WheelPicker`)
- MonthPicker (next payday, goal date): month grid, today ringed in accent, past days textTertiary and disabled, chevrons for months, selected day accent fill, Done. Shows "Fri, Nov 20" style after.
- YearWheel and WheelPicker (birth year, birthday): iOS wheel, 5 visible rows, selection band fillTertiary, snap per row, **tapping a visible row selects it** (PM O3), Done.

### 6.12 Confirm and order cards (`ConfirmCard`)
The Messages and Talk card (iMessage rich-link style), radius 18 (`radius.message`), max width 340.
Structure: eyebrow (Woodstock mark, "Nov 6 pay" right), title (title2), optional lead (one line), lines (label left with optional sub, `figure` right), total (separator above, headline), details control ("See what this buys" or "Show the 14 orders", accent row with chevron), actions (primary, plain).
States:
| State | Look |
|---|---|
| pending | as above, buttons enabled |
| busy | primary shows spinner; both buttons disabled |
| step 2 waiting | status line under the title: "Sent to Questrade (demo)"; primary becomes "Approve in demo Questrade" |
| done | buttons removed; status "Done (demo)" with a positive check; card stays in the thread |
| declined ("Not now") | buttons removed; status "Not sent" in textSecondary; a "Send it now" accent row while the payday is still open |
| expired | status "This request has closed" textSecondary, no actions |
Every line names its account or goal (Compliance floor); no disclaimer sentence inside the card (Compliance 21:22 moved it to Terms).

### 6.13 Goal row (Add: `GoalRow`, used by Home and Plan)
One component so the rules hold everywhere (PM-R66: no figure twice in a row).
- Line 1: goal name (headline) and status word right (secondary weight 600 in positive, warning or textSecondary).
- Line 2: progress (ProgressBar 6 high, or ProgressRing 36 on Plan) for goals with a target; no visual for no-target goals.
- Line 3: one subline, built by one function from the engine, choosing **one** of: "$725 of $3,000 · $175 a payday" (Plan), "Reaches $3,000 by April 2027" (Home), "$4,076 saved · no target" (no target). Never a second line that repeats a figure. "In today's request" appears only on the payday card.
- Savings-fund tag: "Set by Woodstock" chip `mute` beside "Savings fund" where the keep location is shown (goal detail, setup summary), not on Home rows.
- States: pressed; paused (status "Paused", textSecondary, bar at 40% opacity); done (status "Done", bar full, positive).

### 6.14 Progress (`ProgressBar`, `ProgressRing`)
Bar: 6 high, radius 3, track fillTertiary, fill accent (or warning when behind). Ring: 36 (rows) or 120 (goal detail header), stroke 4 or 8, percentage in the centre in `figure` for 120 only. Animate fill 400 ms on first appear; not with reduced motion.

### 6.15 Avatar, Demo pill, Terms pointer
- Avatar: 36 circle, accentTint fill, accent initials (headline), both initials (CR11 s9). Tap opens Profile as a large sheet.
- DemoPill: one per screen, in the nav bar right of the title area (or top-right of onboarding, left of Skip), caption semibold, warning on warningTint (new light value, 2.2). Tapping it opens a small sheet: "This is a demo. Sample data. Nothing is sent to Questrade, a bank or Apple, and nothing is charged. Your profile: <name> (made-up person and numbers)." This is where "Demo profile: made-up person and numbers" lives (PM-R69), not under her name.
- TermsLink: two forms only. Pointer: "How this is worked out: see Terms, section N." (footnote, textSecondary with the "see Terms, section N." part in accent), 16 from the edge, at the foot of the content it explains. Plain link: "Terms and conditions" (footnote, accent). At most one per screen. **Change:** its horizontal padding is `gutter * 2` (32); use `gutter` (16) so it aligns with the cards' left edge.

### 6.16 Toast and Face ID HUD (`toast`, `showFaceIdHud`)
- Toast: top, under the status bar, bgElevated, radius 14, light shadow (light) or none (dark), one line, optional leading check in positive; 2.4 s; swipe up to dismiss. Never carries a figure that isn't on the screen beneath.
- Face ID HUD: 156 x 156, radius 32, bgElevated with blur, Face ID glyph, caption "Face ID (demo)". Keep.

### 6.17 Chat (Add: `ChatThread`, `ChatBubble`, `Composer`)
Two skins of one component:
- **Messages** (iMessage skin): outgoing bubbleOut with bubbleOutText, incoming bubbleIn, 17 body, radius 18 with tails on the last bubble of a group, timestamps as centred caption ("Today 8:47 AM"), chips as outline pills in imessageBlue, composer "iMessage" placeholder with plus and mic.
- **Talk, interview and portfolio chat** (Woodstock skin): incoming plain text on bgPlain (no bubble, like an assistant), outgoing accentTint bubble with textPrimary, choice chips (6.6) under the last question, composer placeholder "Talk or type", the large mic (88 pt circle, accent) on the empty state with the line "Talk using your iPhone keyboard's mic".
States: typing indicator (three dots, 1.2 s loop), sending (outgoing bubble at 60% until acknowledged), failed (a small "Not sent. Tap to retry." in negative footnote under the bubble), card (ConfirmCard inline).

### 6.18 Finish setting up card (Add: `ChecklistCard`)
Card with a header row "Finish setting up" (headline) and "0 of 3" (secondary) and a collapse chevron. Rows: leading 22 pt circle (empty, or positive check when done), title, one subline ("Needed before your first payday request on Nov 20"), chevron. Done rows move to the bottom at 50% opacity, then the card removes itself 2 s after the last item is done, with a toast "All set up."

### 6.19 Video (Add: `VideoCard`, PM-R68)
For the welcome slide and Pick your portfolio. 4:5 frame, radius 16, full width inside the gutter. Poster frame in light and dark variants. Controls: a 44 pt play button centred on the poster, then a pause button in the bottom-right corner while playing (the welcome video autoplays muted and needs this pause control), a mute toggle bottom-left once sound exists (voiceover approved 21:55). Captions are burned in; the Demo corner tag is in the video. The poster must not cover any text or chart; on Change portfolio the video sits at the top, before the cards (PM-R68).

### 6.20 Empty, loading and error states
- Loading: skeleton blocks in fillTertiary with a 1.2 s shimmer, shaped like the content (hero, 3 rows). No spinner-only screens except the bank connect step ("Finding your pay and bills…", centred spinner and one line).
- Empty: one sentence and one action, never a request to do manual work ("No goals yet." + "Add a goal"). The spending chart is never empty (every account has a demo profile, CR12).
- Error: one sentence in plain words and a retry: "Couldn't load your accounts. Try again." No error codes on screen.

---

## 7. Charts

### 7.1 Spending chart (`SpendingChart`, Home)
- Height 132, full card width minus padding; no y axis, no grid lines except the baseline (chartGrid).
- Usual month: textTertiary-coloured stepped line (grey), 2 pt. This month: chartLine (accent) stepped line, 2.5 pt, ending in a 6 pt dot with a 3 pt bgCard ring. Over-usual state (`warn`): this-month line and dot in warning.
- Axis labels: "Nov 1" left, "Nov 30" right, caption textSecondary. Legend below: two 12 pt line swatches with caption labels "Your usual month", "This month so far".
- Scrubbing: press and drag shows a vertical hairline and a readout on bgElevated (radius 10, light shadow): "Nov 7 · This month $441 · Usual $403 · $38 above usual". The hero above does not change. Release hides it (PM H2). Haptic selection tick per day on native.
- Dark: the grey line is #8E8E93 at 70%, not the light value.

### 7.2 Band chart (`BandChart`, portfolio cards)
Shared scale across the four cards; track 18 high radius 5; typical band chartLine, rough-to-good band bandLight; "Put in" as a 2 pt textPrimary line with its label above. Three labelled figures under it (Rough year, Typical, Good year) with the figures in `figure` weight, then the single word "Illustration" (footnote, textSecondary). Nothing else.

### 7.3 Goal projection chart (Add: `ProjectionChart`, goal detail)
Saved so far as a filled step area (chartFillTop), planned deposits as a dashed accent line, the goal as a dashed textTertiary horizontal line labelled "Goal $3,000", the reach date as a ringed dot. Invested goals add the bandLight illustration band and the word "Illustration". Scrubber as 7.1.

### 7.4 Net worth chart (Money)
Full-bleed line with chartFillTop gradient, range Segmented below (1W 1M 3M 1Y All), scrubber with date and value. Per D-22:36 the Money hero leads with what she has and what she owes; net worth is third, never negative in red.

### 7.5 Mix bar (`MixBar`)
10 high, radius 5, 2 pt gaps between sleeves, sleeve tokens; labels under it in caption ("80% stocks", "20% bonds and cash").

---

## 8. Screen templates (how the pieces combine)

| Template | Background | Structure |
|---|---|---|
| Tab root (Plan, Money, Calendar) | bgGrouped | Large title + Avatar, optional hero, Sections of inset rows, at most one Terms pointer at the end |
| Home | bgGrouped | Headline block (largeTitle headline, "Good morning, Sam." headline, one supporting line + "Estimate"), Talk card, spending Card with HeroFigure and chart, Needs you / Coming up section, Finish setting up card (first weeks), Your goals section of GoalRows |
| Detail (pushed) | bgGrouped | Nav bar with back, hero or ring header, facts section, actions section |
| Onboarding step | bgPlain | Progress (10 thin segments, 4 high, accent filled), title (largeTitle), one supporting line, content, sticky footer with one primary and an optional plain button. Back top-left, Skip top-right only on the welcome |
| Sheet task | sheetBg | Header (Cancel, title, Done), sections of cells |
| Conversation | bgPlain | Nav bar (Done left, title and subline centred), thread, composer above the keyboard |
| Terms | bgPlain | Large title "Terms and conditions", numbered sections as headline + body, section anchors for deep links, version and acceptance date at the end |

---

## 9. Accessibility checklist (every component)

- accessibilityRole set (button, link, header, adjustable for steppers and pickers, switch, tab, image for charts).
- Charts have an accessibilityLabel that states the figures ("Spent $500 of your usual $1,239 by Nov 30").
- Status words are text, not colour only.
- Focus order follows reading order; sheets trap focus; closing a sheet returns focus to the control that opened it.
- Hit targets 44 x 44 including hit slop; chips 36 high plus 4 hit slop.
- Reduced motion honoured (4.4).

---

## 10. What I will check on every deployed stage ("UX RN review")

At 390 x 844 in light and dark, each screen against the prototype and docs/onboarding_streamline.md:
1. Tokens only: no off-palette colour, no off-scale spacing outside component intrinsics, the right type variant per role.
2. Native behaviour: large title collapse, translucent bars, sheet detents and grabber, swipe back, tab re-tap, pressed states on every tappable thing, keyboard handling.
3. Content: one hero per screen, no repeated figure, one name per concept, number formats, no em or en dashes, no disclaimer beyond Compliance's floor and one pointer line.
4. Dark: elevation correct, no white boxes, chart and video poster variants, status bar and theme-color.
5. Edges: nothing touches the screen edge except full-bleed charts and video; nothing clipped by the tab bar or home indicator; no horizontal scroll.
6. Figures equal the prototype's for the same profile (spot check against the engine golden tests).
Findings go to the inbox as "UX RN review <stage>" with the screen, the shot path, the problem and the exact fix, tagged for the owning engineer.

---

## 11. Change list for the Mobile Lead (from this spec)

| # | File | Change |
|---|---|---|
| 1 | tokens.ts | light.warning "#B26A00" to "#9C5B00" (contrast) |
| 2 | tokens.ts | add `radius.message: 18`; Card.tsx `confirm.borderRadius` uses it |
| 3 | Controls.tsx TermsLink | `paddingHorizontal: gutter` (16), not `gutter * 2` |
| 4 | Controls.tsx DemoPill | make it pressable, opening the demo sheet in 6.15 |
| 5 | Controls.tsx Toggle | on colour accent everywhere |
| 6 | Add components | HeroFigure, TextField, MonthPicker, YearWheel/WheelPicker, GoalRow, ChecklistCard, VideoCard, ChatThread/ChatBubble/Composer, ProjectionChart |
| 7 | Icon.tsx | add chart, calendarDay, play, pause, lock, sparkle, pencil, trash |
| 8 | Screen.tsx | Home variant with no collapsed title; web max width 430 centred |
| 9 | theme.tsx | theme-color follows the current screen background (bgPlain on onboarding, Talk, Terms) |
| 10 | scripts/lint-copy.mjs | add the banned names in section 5 |
