# Arcade and scoring repairs859-862

These source repairs follow the eight accepted repairs in
[the earlier receipt](QUALITY-REPAIR-RECEIPT-2026-10-01.md).
This records tested source and the clean production build, not live publication.

## 859: Free Kick and Buzzer Beater hold input

Affected URLs: `/free-kick` and `/buzzer-beater`.

The held button and playing surface now own one primary pointer and capture
it until release. Releasing outside the control fires one shot; cancellation,
lost capture, pause, restart and unmount clear that hold. While charging, the
button changes from Hold to Release and shows its active ring. Practice still
uses explicit Kick/Shoot; keyboard controls, physics, scoring and flight are
preserved. No real sports data changed.

Before: four native390 inside releases settled; four outside releases kept
charging on shot1 after1240ms. The original28-case regression failed24 with
four independent baselines passing. Two feedback cases were then added.
After:30/30 focused component cases pass. Seven executable controls reject
exactly14/10/10/4/2/2/2 intended outcomes; their independent baselines pass.
Two legacy practice controls were rebound to executable anchors: each rejects
one intended outcome and retains one independent baseline with nine explicit
skips. They are limited controls, not full-suite proof.

Native24/24 actual production paths pass across both games, held button/SVG,
inside/outside releases and320/390/1440 widths.320 uses real touch input through
an owned page session;390/1440 use mouse input. The Release cue tracks charging,
one settled shot stays stable, Next is enabled and returns to aiming. No page
errors or horizontal overflow. Engine and RNG are original. Native pointer
cancellation and simultaneous key/pointer arbitration were not exercised.

Four complete native daily runs also pass: both games at320 keyboard and1440
mouse, ten shots each, ordinary flight and final run screens. Another ten
starts Unlimited on shot1 with0 points. Refresh restores the original daily
result and adds no completion: exactly one intercepted booking per run. No
page errors/overflow. These runs deliberately shoot poorly; successful scoring
is independently exercised by862's actual practice wins.

Three earlier full-run driver attempts are retained: a Hold locator stopped
matching when it correctly became Release, the tenth action is See the run,
and a saved daily returns directly to Done rather than Today's ten. Corrected
locators follow those actual states. No product code or timeout limit changed.

Existing tests were updated to actual pointer stimuli, with every previous
outcome assertion retained. Independent source review found no blocker.

## 860: Face Off answer deadline

Affected URL: `/face-off`.

The actual elapsed clock is checked when settling an answer. Expired picks
become timeout results for solo and either pass-the-phone chair. No answer
data, dealing, scoring formula or opponent decision changed.

Before: an ordinary11s timeout paid0. A controlled native scheduling fixture
delaying only100ms intervals accepted a correct native click after11s as
Right in10.0s and paid100; its wrong-answer baseline paid0. This is a delayed
callback hole, not a claim that ordinary unthrottled timeouts were broken.
After: the same three native paths all end Out of time with0. Real performance
clock and original game remain. No page errors; browsers and contexts close.

15/15 actual-hook cases pass, covering exact10s and delayed11s, daily/unlimited,
independent chair clocks, next-round reset and coincident click/timeout.
Removing the one guard rejects exactly ten expired-input cases while all five
early-score/ordinary-timeout baselines pass, with no pending/unhandled cases.
Native versus and a complete ten-round Face Off match were not tested here.

## 861: leaderboard participation claims

Affected URL: `/leaderboard`.

Metadata, permanent guidance and empty-rank prompts now explain that a positive
ranked score is needed to appear. Unscored finishes count as plays and streak
credit without leaderboard points. The unsupported four-puzzles-always-win
claim was replaced by the actual daily cap. Scoring, RPCs, guest access,
layout and failure states are unchanged.

The real recorder omits undefined scores. Deadline Day and Contract Chaos
call it without ranked scores. Round839 ranking requires positive scores from
registered games, takes each game/day best and caps each contribution at100.
Eight focused page/real-recorder cases and eight existing failure cases pass.
Restoring seven old universal-claim anchors rejects four intended copy cases
while four accounting/retry baselines pass. No pending/unhandled cases;
production bytes are held and disposable copies removed.

Only the leaderboard crawler snapshot was redrawn with the normal0/5/11-day
sampling. No volatile blocks changed. The derived sitemap holds169 dates and
updates only this page. No new URLs or generic content. Native unscored-game
completion, live ranking and publication were not tested.

## 862: visible shot results

Affected URLs: `/free-kick` and `/buzzer-beater`.

The shared result card has a larger verdict, clearer success/miss colors,
an enlarged exact-points pill and stronger existing ring, spark, sweep and
score animations. Only the shared card and CSS changed. Result values, status
semantics, detail, callbacks and immediately enabled Next are preserved.

Six actual practice wins pass at320/390/1440 with reduced motion. The real
engines award218..222 Free Kick points and166..168 Buzzer points; displayed
points equal board totals. Verdicts measure24/32px and points30/36px. No
document/card/score overflow or page errors. All eight decorative spans are
hidden and card/score animations are none. The full static result remains.

Two actual ordinary-motion wins at320 award212 Free Kick points and168 Buzzer
points. Existing keyframes are present, score scale settles after1s and Next
is enabled immediately and after settling. Clicking it returns to aiming.
Screenshots were visually inspected. The native24-case859 matrix separately
verifies ordinary miss cards. Dark theme was tested; light-theme contrast was
not measured here.

An ordinary-motion Free Kick driver initially sent arrow input before its
closing practice dialog finished unmounting, producing five actual misses.
Waiting for the actual teardown and checking the visible aim marker produced
a first-attempt goal. Both receipts are retained; no product change was made.

## Build and evidence boundary

Clean gate excludes paused842-845 drafts. Real app type gate exits0; production
build exits0. Entry `index-3CYGbOij.js`, SHA256
`7ea4e205f04fb3e594980bad134efe7e937a9f650f3dfee94ecc23e814dccb81`.
All15 built-site fences pass, including browser boot and snapshot assets.
The first post-prerender fence run rejected the fresh leaderboard dist copy
for missing inline assets. A second normal build applied the existing Vite
snapshot plugin; all15 then passed. Public snapshots remain hash free.

The combined113-case attempt had112 passes and one unchanged five-second
feedback timeout under load. The original-limit isolated feedback rerun passed
10/10; its final scoped harness passes. No all113-in-one-run success is claimed.
New focused cases are30+15+8=53, bringing the accepted-repair cumulative total
to163 once these four source rounds are committed. This is selected coverage,
not full runAllSims or a whole-site audit.

The selected source run passed nine harnesses but the anchor fence rejected
two new harness read paths as unsafe on CRLF checkouts.859 and861 now normalize
matching text inside a wrapped read while retaining original raw byte equality.
The final859 normal30/30 and all seven controls pass. Its CRLF proof binds all
14 mutation anchors and holds raw bytes.861 normal8/8 and exact four-failure,
four-baseline control pass on the original560-CRLF-line page. The coordinated
anchor fence passes across539 harnesses. No test assertion was relaxed.
The clean root runner then passes both repaired new harnesses, the anchor
fence and the rival-name fence. All25 distinct selected build/source harnesses
are green across the accepted runs. Full runAllSims was not run.

Native testing uses separate CLI headless launches and disposable storage.
Remote mutations and vendor scripts are intercepted. No user browser connector,
visible live-site tabs, backend writes or real sports dataset edits occurred.
Claude retains publication and his reserved simulation/data lanes.

Local evidence:

- `C:/Users/antho/AppData/Local/Temp/dukb-repairs-native-2026-10-01/`: arcade859-after.json, arcade859-complete.json, three full-run driver limits, faceoff-deadline-before.json, faceoff-deadline-probe.json and final built/source gate logs.
- `C:/Users/antho/AppData/Local/Temp/dukb-readonly-arcade-scout-2026-10-01-225211/`: scout.json and859-final-child-receipt.json.
- `C:/Users/antho/AppData/Local/Temp/dukb-data-trust-scout-2026-10-01-a1/`: eligibility-before.json and eligibility-after.json.
- `C:/Users/antho/AppData/Local/Temp/dukb-862-positive-feedback-2026-10-01-2328/`: six reduced-motion reports and screenshots. Its `-normal` and `-normal-free-kick` sibling folders retain ordinary success and earlier driver limits.
