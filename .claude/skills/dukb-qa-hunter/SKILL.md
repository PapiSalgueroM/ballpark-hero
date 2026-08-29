---
name: dukb-qa-hunter
description: Use when verifying a round, hunting for breakage after a change, or auditing a game in depth. The job is to BREAK DoUKnowBall and prove findings with output, not to build features.
---

# DoUKnowBall QA Hunter

Runtime does not prove a harness ran; its OUTPUT does. Read the closing line.

## The gates, in order, for any round

1. node_modules/.bin/tsc --noEmit -p tsconfig.app.json (plain tsc is a NO-OP that
   always exits 0).
2. npm run build. Never run harnesses while a build is writing dist.
3. The round's own harness green AND its negative control proven red.
4. If dist or public/ snapshots changed: ALL 15 built-site fences (simAdsense,
   simBrand, simHeadTags, simHiddenPages, simHubs, simIndexNow, simIndexing,
   simInternalLinks, simNoRivalNames, simPrerender, simPrerenderBoot,
   simRetiredRoutes, simSchema, simSitemap, simSnapshotAssets). A hand-picked
   subset is how simIndexNow stayed red for five rounds.
5. node scripts/runAllSims.mjs for the full node suite (ONLY=name,name scopes it).

## The browser weapons

Serve dist with scripts/lib/hostLikeServer.mjs (dir, port; npx serve lies about
routes). ENGINES=chromium always. sweepGames (SIZES=mini,phone,tablet,desktop)
walks every route for overflow, emptiness and leaked undefined/NaN. playGames
actually plays every game (WIDTH/HEIGHT for phone runs, ONLY=/route to chase one,
FROM=/route to resume, STEPS to deepen). playClubManager plays a full season
through the UI. playIphone, simMobileChrome, playHomeFold, playLiveTicker,
playHowTo, playSoftFourOhFour, playSnapshotDrift each own a specific promise;
read a harness's header before judging its output. A second build can go to
another directory (vite build --outDir dist-verify) and another port so a long
run keeps dist.

## How to hunt like a cheater

Refresh mid-game and resubmit; open two tabs on the same daily; edit localStorage
saves and reload (a hostile save must load to a sane state, never crash); replay
the same completion event; drive the back button mid-flow; change the client
clock against an Eastern-day daily; hammer a validator offline and confirm the
fail-closed retry shape; tap everything on a phone context where hover does not
exist.

## Judgment rules that keep findings honest

A harness that cannot drive a game is a SKIP said out loud, not a failure. A
finding must name the measured number and the bar it crossed. A flake that does
not reproduce on replay is recorded as a flake. A control that fires proves the
check; a control that changes nothing proves nothing, refuse to trust it. When a
harness is red, first ask whether the HARNESS drifted from a deliberate product
change (the Round 297 checklist, the Round 311 ticker label); a stale expectation
gets updated to assert the CURRENT deliberate truth, never deleted.
