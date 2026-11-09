---
name: compliance
description: Pointer to Woodstock's existing Compliance and Copy Reviewer process. Use when a screen adds or changes legal, disclosure, title, demo-label or money-movement wording.
---
Woodstock's Compliance and Copy Reviewer already runs a process in the prototype folder; the app follows it rather than inventing a new one.

- The log and rulings: /home/claude/app/qa/compliance.md (briefs B1 to B5, C1 to C6, CR8 to CR12 entries, the Directive 21:21 minimum-disclosure floor of 21:22, and the Terms numbering of 22:27).
- The harness: /home/claude/app/qa/cpass.py (probes for titles, banned phrases, preselection, demo labels, credential sentinels, approval-card minimums). Its probe list is being ported to the engine's policy corpus.
- The summary that binds app engineers is the "Legal guardrails" section of CLAUDE.md.

How to use it from the app: post "COMPLIANCE REVIEW <screen>" to /home/claude/app/decisions/inbox.md with the exact visible copy; wait for a ruling before shipping any new sentence that reads as a disclaimer, a promise, a title, or a statement about moving money. Terms text lives in src/content/terms.json (mobile-lead writes it; Compliance supplies the words).
