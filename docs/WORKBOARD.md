# Work board

One page, two lanes. Read this before picking work, write here before building. This file
holds who is doing what right now; `docs/PROJECT-STATE.md` holds what happened. The split
protocol itself lives near the top of that file ("Two subscriptions, one repo").

How it works:

- Anthony drops feedback in either chat, tablet or desktop. Whichever Claude receives it
  writes each item into the Inbox below, splits anything big into workable pieces, and
  pushes this file immediately so the other lane sees it.
- A lane claims an item by moving it under its own heading with the date. Claim and push
  BEFORE building, so the other lane sees the claim before any code exists.
- Finished items move to Done with the round number, and the round writes its change log
  entry in `docs/PROJECT-STATE.md` as always.
- The 3 hourly scheduled cloud sessions count as the cloud lane and respect claims here
  exactly like a live session.
- An item claimed more than 4 days ago with no round landed goes back to the Inbox, so a
  dead session cannot squat on work.

## Inbox (unclaimed)

- **THE 2026-08-28 REVIEW: `docs/TWEAKS-2026-08-28.md`.** Anthony played the site top to
  bottom and filed his biggest list yet, transcribed there in full. It outranks the
  roadmap. The P1 bugs and the first feature wave are claimed below; everything else in
  that file is the shared backlog both lanes pull from, bugs before features, his order
  within a lane. Claim here before building.
- From that list, unclaimed and sizable: the Rebuild redesign, the Sign the Player
  auction rebuild, the Player Stock Market redesign, the tycoon merge, the conquest map
  overhaul, the three new games (Search and Discard, Sports Bingo, the draft mode), the
  Club Manager arc list, the Soccer Career BitLife audit, the US sports parity arc, the
  CFB real names research.
- Encyclopedia mining (tweaks item 12, the permanent backlog, pages 4 to 51 of his
  document): either lane pulls a system from it when its own list runs dry. Mine it for
  mechanics, never its vocabulary (simNoRivalNames enforces this).

## Desktop lane (Claude Code on Anthony's PC)

Claimed 2026-08-28. This lane takes the work that needs what only this machine has: the
Supabase MCP, the Lovable MCP, and cheap long local browser runs.

From the 2026-08-28 review (bugs, claimed same day):

- Ticker follow up: an alert when every feed has written zero rows for a full day, so a
  dead feed is surfaced instead of quiet (the suspension sat unnoticed for two days).
  The next candidate host if the header endpoint ever closes: cdn.espn.com/core, which
  answered 200 in the 2026-08-28 survey.
- Queued from the 08-28 review, Club Manager residue: era Champions League pools are 16
  clubs so era saves play 4 groups, not the real 8. Growing each era's euro pool to 28
  verified era participants (the real group stage fields are documented facts) is a data
  round. Also the era-id flags now exist in LEAGUE_NATIONS; a fence pinning every
  ERA_LEAGUES id to a nation would keep the next era honest.
- Harness portability sweep: 85 of 93 sim harnesses still hardcode '/tmp' and embed the
  Windows ROOT path into generated entries, so they cannot run on the desktop lane.
  Eight were ported in Round 312 with scripts/../portHarness (mechanical: os.tmpdir,
  pathToFileURL, forward slashed ROOT); port the rest and run the full suite green.
- P1: the boot flash (snapshot text visible before React mounts).
- P1 data batch: Who Am I zero ages and values (Rodri), the Squad Deal league filter
  dealing the wrong league, Build Your XI stale position validity, Sign the Player values
  (Svilar 162m), the Billion Dollar Game pricing in dollars at one billion and its
  oversized points.
- The report-a-bug pipeline: categories, delivery to the project inbox he can read,
  FormSubmit activation confirmed (folds into the Round 304 Supabase tap below).

Standing claims:

- auditLive's thin page bar has drifted from its own intent: its header and message say
  "the home page's own static block" but line 100 measures the WHOLE live home document,
  which was 1,760 readable characters when the rule was written (its own header records
  that) and is 4,967 now that rounds 280 plus grew the home copy, so on 2026-08-28 it
  flagged 101 healthy pages (each serving 2,000 to 4,900 characters of its own text,
  own canonical, one description, all 200). Re-derive the bar from what it means to
  measure, with a control, per the harness rules. Until fixed, treat the thin page
  finding as noise when live matches the committed snapshot byte for byte.
- The Round 304 Supabase tap that was recorded as owner side and does not need to be:
  backend audit, the report-relay redeploy, the RLS advisor run, and the
  game_completions SELECT policy question.
- The Club Manager half of tweaks item 10 (more leagues, more eras), which Round 302
  queued behind Supabase access: the data pulls happen from this lane.
- Tweaks item 9: the full playGames browser run over every game, every feature, then fix
  every finding.
- Publishing duty: after a burst lands on main, verify Lovable synced, call
  deploy_project, run indexnowSubmit.
  NOTE FROM THE CLOUD LANE, 2026-08-28: a scheduled publisher already runs on the cloud
  side every 3 hours (it deploys whenever main has moved and stays silent when it has
  not), so nothing waits on a manual publish; the desktop publishing after its own
  bursts is still welcome for immediacy, a double publish is harmless.

## Cloud lane (tablet sessions and the 3 hourly scheduled sessions)

Claimed 2026-08-28:

From the 2026-08-28 review (his decisions and the self contained fixes):

- Retire Overrated or Underrated and Tier List, his call, the standing retired-route
  pattern (redirect stub, sitemap, registry, harnesses).
- The home hero headline shortened ("100+ free games across every sport" shape), the
  disclaimer staying in the footer.
- Leaderboard names: regenerate legacy Baller-NNNN handles to the sports word pool and
  put a profanity blocklist in front of custom display names on shared surfaces (the
  decision and reasoning are in the tweaks doc).
- Small fixes batch: Career Ladder flags, Missing XI side colors and overlapping bubbles,
  Rarity Round hiding the rarest answer and stating the goal upfront, World XI position
  eligibility and customizable respins, Alphabet Sprint full name instruction, the
  Soccer Career keeper being told to score more goals, the how-to-play popup audit across
  every game.
- Trade Finder: both sides of the ball and current rosters.

Standing claims:

- The react-router v7 breaking major that Round 304 queued as its own round.
- New game rounds and record shelf tables, the self contained work.

## Done

- ONE FOOTER, Round 313 (desktop lane, 2026-08-29). The double footer he screenshotted:
  App.tsx has rendered the one global footer on every route since Round 49, but
  GameShell mounted its own copy inside every game page's column, and six quiz boards
  plus the Records page kept theirs, so two full footers stacked on most of the site
  (proven live: 2 footer elements, the disclaimer twice, on /soccer-grid). All eight
  extra mounts removed; the global footer is now the only one. simSingleFooter is the
  fence: comment stripped scan of all 789 src files, exactly one render in App.tsx,
  imports banned elsewhere, FOOTER_CONTROL=double goes red. Snapshots were never
  doubled so no prerender was needed. tsc zero, build green, the legal and
  accessibility fences green.
- THE CLUB MANAGER TABLES TELL THE TRUTH, Round 312 (desktop lane, 2026-08-28). Review
  P1s 2, 3 and part of 4. One root for the first two: syncWorld and the world tables
  picker both iterated REAL_LEAGUES, whose ids never match an era world's, so every era
  save's other league sat frozen on "pre-season, alphabetical order" for the game's
  whole history and the picker offered the entire modern set with a duplicate zero-point
  La Liga. One era aware list (worldLeagueDefs) now feeds initWorld, syncWorld and the
  picker, and syncWorld's own catch-up path heals every broken era save on next load.
  The knockout: the engine always advanced the top TWO of my group, but the bracket
  field took only winners and filled from a pool of clubs that finished nowhere, which
  is exactly the "projected quarter finals exclude my second placed team" report; the
  field and the projection now take the groups' top twos, winners crossed with
  runners-up, pool only for genuine shortfall. The Cups tab separates the two
  competitions under their own headers and finally mounts CupBracketCard, the domestic
  bracket built in Round 102 and never rendered anywhere. simEraWorldTables is the new
  harness (era season through the engine's own loop, modern control, picker truth,
  qualifier composition, source shape, WORLD_CONTROL=modern goes red).
- THE TICKER IS BACK, Round 311 (desktop lane, 2026-08-28). Review item 1. The dead
  API-Sports account is retired; scores-poll v6 reads ESPN's open scoreboard header
  endpoint (no account, no key, no quota), same table, same secret gate, fail closed as
  before. The day=1 cron had been silently re-polling today since Round 287 and now
  really seeds tomorrow, so the strip carries the coming slate before kickoff, live
  scores during, FINAL after. Verified end to end: the run ledger clean, 40 plus rows
  written for today and tomorrow, and the live douknowball.com strip seen showing three
  second half soccer matches and Saturday's Liverpool fixture with its start time.
  simLiveScores green with its planted key control firing, now also banning ESPN's host
  from src and running on Windows.
- THE PUBLISH HANDOFF: done, site is current (desktop lane, 2026-08-28). Everything
  through Round 310 is live on douknowball.com. Verified, not assumed: Lovable's copy of
  main carried Round 310's What's New line before deploy_project was called, the live
  /whats-new serves that line, /accessibility and /quiz-board answer 200, /jeopardy
  serves the meta refresh stub, and live pages measure byte faithful to the committed
  snapshots (four pages sampled with auditLive's own metric, each exactly the committed
  file plus the same 10 injected characters). indexnowSubmit accepted all 130 URLs.
  auditLive's 101 thin page flags were diagnosed as the tool's own drifted bar, filed on
  the desktop lane above.
- Manager arc four, promotion style world editing: Round 310 (cloud lane, 2026-08-28).
  Tweaks item 11 is complete across rounds 303, 308, 309 and 310.
