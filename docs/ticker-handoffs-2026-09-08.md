# Round 518: ticker handoff visibility

Base: `5c5f84e7`. Scope: the TopTicker frontend and regression checks only.

## Plan

1. Reproduce score visibility gaps with all nine existing sports and a long
   synthetic slate. Assert actual score-card intersection, not just mounted
   nodes or increasing scrollLeft.
2. Measure the active group's own start and final card, then crawl only that
   interval at the existing speed. Remove animated/capped width before measuring.
3. Keep a visible end hold before handoff or one-sport restart. Preserve reading
   time across pauses and keep focus, pointer and explicit pause independent.
4. Keep all reduced-motion content manually reachable and handle resizing. No
   new sport selector: existing sport labels continue to navigate to their hubs.
5. Prove old behavior fails the new tests, then run exact types/build, relevant
   ticker checks, all fifteen generated-site fences and visual/browser checks at
   320, 390, 430 and 1440 pixels. Leave broader gate limitations explicit.

No sports facts, upstream refresh promises, database writes, provider changes,
new paid service, merge or publication are part of this round.

## Implemented and verified

The active SportBox is measured before paint and on resizing. Its own start and
last score define a physically clamped scrolling range, rather than the whole
row of collapsed sport labels. The speed stays at 75 px/s. A fractional position
avoids frame-by-frame DOM rounding. The old animated max-width cap is removed.
Initial and final reading holds remain through independent hover, focus and
explicit pauses. A single overflowing sport has a Pause button and a held wrap.

Reduced motion uses manual horizontal scrolling. Focusing a score exposes it
without moving the page vertically. Feed updates preserve manual position;
focus/hover pauses are reconciled when a target disappears or the strip hides.
Normal resume returns to the active bounds, or the final score during its hold.

## Evidence

- Unchanged-source RED: at 320px, MLB had 71.9px of preceding collapsed soccer
  label before its content. The first score was not starting with its sport.
- `playTickerHandoffs.mjs` bundles real React and TopTicker, using synthetic
  rows, real built CSS and isolated local HTTP. Only requestAnimationFrame time
  is advanced; production speed and holds are unchanged. External requests are
  blocked. Text and score visibility use actual clipping ancestors, not merely
  mounted nodes. Browser errors fail after each scenario.
- Final matrix passed twice at 320, 390, 430 and 1440px. It covers all 36 sport
  handoffs, forty-card 6,409.8px slates including a 447px card, one-sport pause
  and restart, manual wheel and keyboard access, vertical text bounds, touch,
  independent pauses, preserved remaining holds, resizing, focused-card removal,
  reduced-motion feed refresh and collapsed-label focus during crawl/end hold.
  Mobile hub/home and viewport hide/return also resume correctly.
- Eleven in-memory controls each require a changed executable source target and
  their exact AssertionError. Names: starts, cap, handoff, focus, pausehold,
  singlepause, refresh, reducedrefresh, focusreturn, focusend and touch. An
  intended failure exits 1; unrelated failures exit 2, so arbitrary red is not
  accepted. All eleven were observed failing their intended checks.
- Review found three additional lifecycle defects after the initial matrix was
  green. A fourth check caught the first resume clamp hiding the final card
  during its hold. All four were reproduced before correction. A touch test was
  corrected to dispatch pointerover, the event React actually uses, and its
  mouse-only guard control was observed failing. Final independent review has
  no remaining actionable findings.
- Main-agent screenshots inspected from `ticker-handoffs-WePCoq` in the local
  OS temp directory. Main-agent final matrix artifacts: `ticker-handoffs-HUTpEn`.
  Text remains inside the 31px ticker client height; no scrollbar styling change
  was needed. These paths are local evidence, not shipped assets.
- Exact app type gate passed after the final source change. Production build
  passed in 46.13 seconds with 2,839 modules, entry `index-CN0RkAol.js` and CSS
  `index-u8YcqwVc.css`. The compiled entry was checked for the final end-hold fix.
  Existing Browserslist, ambiguous duration utility and large chunk warnings
  remain. Scoped ESLint has zero errors and the two pre-existing Fast Refresh
  export warnings. No package or lockfile changed.
- `simTicker` and `simLiveScores` pass. All fifteen generated-site fences pass:
  simAdsense, simBrand, simHeadTags, simHiddenPages, simHubs, simIndexNow,
  simIndexing, simInternalLinks, simNoRivalNames, simPrerender, simPrerenderBoot,
  simRetiredRoutes, simSchema, simSitemap and simSnapshotAssets. Three boot samples
  have zero failed requests and all eleven retired routes redirect. Committed
  snapshots and sitemap ledger are unchanged.
- Actual built-app `playLiveTicker` passes at local preview 4188, with real wall
  time and mocked scores. Its legacy resume test initially failed despite a
  273px forward crawl: a 450ms sample at 75px/s moves about 34px, not the old
  demanded maximum above 50px. The check now totals forward distance over 3.6s,
  excluding backward wraps. The normal rerun moved 271px. A new browser control
  blocks exactly one resume click, verifies the pause remains, and accepts only
  that motion failure (0px); all other checks must pass.

## Not claimed

No upstream freshness or production feed behavior was changed or verified here.
The earlier full node suite has eight outstanding results documented separately.
There is no whole-site all-clear, account migration, merge or publish. Root and
the Round 516 review preview on 4186 are untouched. Preview 4188 is an additional
local review surface for this candidate only.

## Next bounded query issue

A separate in-memory probe executed real fetchLiveScores with 132 synthetic
rows: 130 earlier soccer finals and two later live NFL/NBA games. It returned
60 soccer finals and no live rows because the REST query truncates before the
client sort. A null row also discards an otherwise valid response through the
outer catch. Neither issue is fixed in this UI round.

Next-round preparation read the current Supabase changelog and pagination docs.
No relevant breaking pagination change was found. Stable ordering and raw
offset progression matter; short pages can reflect server caps. The old
playLiveTicker REST fixtures must honor offsets before pagination is introduced.
References: https://supabase.com/changelog.md,
https://supabase.com/docs/reference/javascript/using-modifiers-range,
https://postgrest.org/en/stable/references/api/pagination_count.html.
