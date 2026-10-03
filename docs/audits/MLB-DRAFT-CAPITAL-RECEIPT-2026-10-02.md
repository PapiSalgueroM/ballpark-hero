# MLB draft capital966, 2026-10-02

Route: /mlb-front-office.

Verified problem: actual accepted trades could leave zero, one or four
owned tokens, but the draft always offered two selections and never spent
the tokens. Rival selections also ignored capital. A missing active
remaining-count field could silently discard two owned choices and advance
the season instead of reporting the damaged save.

The draft opens from actual owned current rights and consumes one per
accepted selection. Each of the existing two five-rival batches chooses
distinct eligible clubs and spends their tokens. Extra human choices do
not add rival batches. Zero capital has an explicit finish action. The
final selection or zero exit runs the actual offseason once, with guards
against repeated same-frame submissions. Continue only returns to the hub.

Legacy remaining progress is retained until action, without replaying
earlier choices. Old completed drafts return to the already advanced hub.
Empty old classes can be explicitly replaced. Damaged active counters and
draft state preserve the exact raw save for recovery and own-key discard.
An omitted inactive hub counter remains supported. Ordinary two-choice
terms, league outcome and RNG are held against the physical before engine.
Existing roster28, release costs, budget and CPU auto-cut behavior are held.

Source proof checkpoints are separate. The first frozen checkpoint passed
18 normal outcomes, physical before15 expected rejections/three held,
and14 effective controls,288 case executions. The final active-counter
repair was a single additional guard plus appended subpaths in the existing
damaged case. Final source passed18 normal and three exact controls,
phase/ownKey/activeLeft,72 case executions. The activeLeft control restored
the exact preceding Board bytes. Earlier controls retain their earlier
checkpoint scope; they were not all rerun on the final integer guard.
There are15 distinct controls across those scopes. Independent review passed.

Native proof uses the final Board, real accepted trade APIs, actual draft
and offseason, current structured opening data and held compiled CSS.
Twelve paths cover ordinary two, traded one, acquired four and zero at
1440 keyboard,390 touch and320 touch with reduced motion.438 checks and
39 screenshots pass. Initial, mid-draft and final refresh saves are exact;
one offseason and the bounded ten rival choices are retained. No overflow,
scaling, outside requests or console/page errors occurred. All contexts,
browser and owned server closed, with its port listener absent.

The first native attempt rejected a40px shared Continue target after20
accepted checks, with no complete path credited. Its report/log/screens
are retained. The only shared-card fix is min-h-11; callback and reveal
timing are unchanged. The final matrix measures every Continue at44px.
All11 runtime inputs, exact card bytes and compiled CSS are held. Parent
inspected320 zero-right completion and390 acquired-four final reveal.

These are explicitly simulated completed-season saves with inert
completion/share boundaries. They prove the actual isolated draft path,
not a full native season, historical-data correctness, the full page shell,
future-year pick lineage or a live-site rollout. The rival model remains
the existing limited two batches, rather than a complete league draft.

The existing instructions and two owned baseball-guide hunks describe
actual picks and the zero-pick exit. Paused unrelated guide drafts stay
unstaged. Parent real type/build,17 static/search/guide fences and24
relevant source/gameplay families pass on the combined three-sport gate.
An archive Git-context setup failure and stale NHL expectations were kept
uncredited before the corrected, scoped checks passed.

Local evidence:

- TEMP/dukb-mlb966-final-2026-10-02/verified-summary.json
- TEMP/dukb-mlb966-active-left-2026-10-02/final-followup-summary.json
- TEMP/dukb-mlb966-native-2026-10-02/verified-native-summary.json
- TEMP/dukb-drafts939966967-clean-gate-2026-10-02/verified-static.json
- TEMP/dukb-drafts939966967-clean-gate-2026-10-02/derived-copy-receipt.json

The combined corpus keyword effects, three guide fingerprints, route
snapshots and actual UTC2026-10-03 lastmod entries are checked before
copying. Other rows and ledger dates are held. No production data was
changed. Publication remains a separate release-lead action.

Final parent replay: real app type gate passed unchanged assertions and
flags. The unchanged global anchor scanner passed594 parses,145 anchored
harnesses and153 normalized reads. simDraftNight also passed on the final
shared card. An optional simRevealScroll attempt had no4173 test server,
so its five connection refusals are setup failures, not game test results.
No page interaction from that attempt is credited. All its workers closed.
