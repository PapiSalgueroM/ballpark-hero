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
- ROUND NUMBERS ARE CLAIMED HERE TOO (added after 311 and 313 both collided): when a lane
  starts a round it writes "next: Round NNN (lane)" on its own claim line and pushes,
  and the other lane takes NNN+1. NEXT FREE NUMBER: 321.

## Inbox (unclaimed)

- Programmatic sub-pages, from the outside analysis Anthony pasted 2026-08-29: dedicated
  indexable URLs for sub-content (era starts, daily puzzle archives, drills) could grow
  the indexed surface. CAUTION built into the item: thin or near-duplicate pages hurt as
  easily as help, and this site just spent twenty rounds earning its indexing back, so
  this starts as a small pilot (a handful of genuinely content-rich sub-pages with their
  own copy) measured in Search Console before any rollout. Pairs with the SEO keyword
  pass below.
- SEO keyword pass (Anthony, 2026-08-28 evening): "add words like key words and
  description and all that so that on search it pops up higher up, words like sports and
  trivia and so on." Work the head terms (free sports games, sports trivia, daily sports
  quiz, football quiz and their sport variants) through titles, meta descriptions and
  page copy where they read honestly; the meta keywords TAG is dead to Google and is not
  the ask. Pairs with the standing 88-not-indexed push.

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

- MOBILE PASS (claimed 2026-08-29, BUILDING as Round 320): Anthony, 2026-08-29: "were
  losing a lot of viewers because were not the best mobile friendly because how
  everything is formatted so make sure everything translates smoothly". A full
  phone-first sweep of every route: sweepGames at 320/390 widths, playIphone,
  simMobileChrome and the playGames walk, plus hand checks of the layouts those cannot
  judge (tap target sizes, text scale, horizontal squeeze, fixed elements covering
  content). Findings worked as rounds, 320 is the first. Constraint: no-scroll rule and
  the FIFA tile rule govern the fixes.
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
- Data follow up from Round 315: 247 players whose latest market value row is 2024 or
  older at a 30m+ peak. Most are honestly retired or in untracked leagues, but Rodri,
  Kimmich, Tchouameni and Ndidi were among them and were world class absences; a
  systematic sweep of that list against current squads would catch the rest. Needs the
  database and web verification, desktop lane work.
- From Round 319 (cloud): World XI wants eligibility derived from real positions PLAYED
  (his example: a CF with RW history should fit a RW slot). That needs per player
  secondary position data pulled and verified from the database side; the code side
  tightening (wing backs out of winger slots) already shipped. Add a positions_played
  style column or a verified secondary position map, then World XI's eligiblePositions
  can read data instead of a hand rule.
- OWNER TAP, the one thing only Anthony can do: open douknowball1@gmail.com, find the
  FormSubmit "Activate Form" email (a fresh one was triggered 2026-08-29), click
  Activate. Until that click, bug reports reach the admin screen but never his inbox;
  after it, every report emails him. Round 316 fixed everything around it.
- OWNER TAP, small: enable leaked password protection in the Supabase dashboard (Auth
  settings, one toggle, checks passwords against HaveIBeenPwned), advisor recommended.

Standing claims:

- auditLive's thin page bar has drifted from its own intent: its header and message say
  "the home page's own static block" but line 100 measures the WHOLE live home document,
  which was 1,760 readable characters when the rule was written (its own header records
  that) and is 4,967 now that rounds 280 plus grew the home copy, so on 2026-08-28 it
  flagged 101 healthy pages (each serving 2,000 to 4,900 characters of its own text,
  own canonical, one description, all 200). Re-derive the bar from what it means to
  measure, with a control, per the harness rules. Until fixed, treat the thin page
  finding as noise when live matches the committed snapshot byte for byte.
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
- The how-to-play popup audit across every game (split out of the small fixes batch).
- Trade Finder: both sides of the ball and current rosters.

Standing claims:

- The react-router v7 breaking major that Round 304 queued as its own round.
- New game rounds and record shelf tables, the self contained work.

## Done

- THE SMALL FIXES BATCH, Round 319 (cloud lane, 2026-08-29). Six review items: Rarity
  Round never reveals the rarest answer again and states its goal on the board; World
  XI's front line winger slots refuse wing backs (the LWB-into-RW hole) and the respin
  budget is picked before the draw; Missing XI bubbles stop overlapping and both sides
  fly country flags; Career Ladder flag coverage measured 274 of 274 after a hyphen bug
  fix (every Al- club was flagless) plus 60 verified new entries; Alphabet Sprint says
  full names count; the Soccer Career gram nags by position instead of telling keepers
  to score. NOTE FOR THE DESKTOP LANE: the World XI "eligibility from real positions
  PLAYED" half needs per player position history data (secondary positions), a database
  pull, filed here rather than guessed at in code.
- LEADERBOARD NAMES, Round 318 (cloud lane, 2026-08-29). Legacy Baller-NNNN handles
  regenerate to the word pool on next visit, and every name rendered on the shared board
  passes the blocklist (a dirty stored name prints as a stable substitute handle). The
  round's own harness found a live moderation bug: the normalizer collapsed "kkk" to "k"
  and "xxx" to "x" in the blocklist itself, so every name containing the letter k or x
  ("Mark", "Luka", "Xavi") has been refused since moderation shipped, in profile saves
  and created manager names alike. Fixed with both-ways matching, simHandleNames is the
  fence with its unfence control.
- Both retirements (Overrated or Underrated, Tier List) and the hero headline: Round 314
  (cloud lane, 2026-08-28; renumbered twice after the lanes collided on 311 and then 313,
  the desktop's ticker and footer rounds keep those). Crowd vote tables left in the
  database, noted on the desktop lane's backend audit item.
- THE WIRE GLIDES, Round 317 (desktop lane, 2026-08-29). His report "the ticker isnt
  moving", and it wasn't in the way that counts: the old loop held each sport's box
  perfectly still for up to 14 seconds then swapped, and once Round 311 loaded the day
  ahead a sport carries twenty plus cards, so everything past the screen edge was
  unreachable and the strip read as parked. Two real defects underneath: clicking the
  Round 307 pause button left FOCUS inside the strip, and focus is itself a pause, so
  clicking resume kept the wire parked (measured live: activeElement was the pause
  button, wire frozen); and the missing userPaused dependency meant the loop did not
  re-arm cleanly. The wire now glides at a steady cable crawl through every card, hands
  off to the next sport when the last card has passed, holds briefly on a fresh sport,
  loops itself when only one sport has games, and a mouse click on pause or resume
  never focuses the button (keyboard tabbing still parks it, the Round 306 promise).
  playLiveTicker grew sections 7 and 8: a 16 game fixture that genuinely overflows and
  the scroll MEASURED moving (the assertion that would have caught his report), pause
  parking it, resume actually resuming with no sticky focus. simTicker and simPrerender
  green; simTicker ported to Windows.
- THE REPORT PIPELINE AND THE SUPABASE TAP, Round 316 (desktop lane, 2026-08-29). The
  report button: relay redeployed with Round 304's queued origin allowlist, plus two
  finds that explain why his inbox stayed empty: FormSubmit refuses server calls that
  carry no web Origin (every mail this relay ever sent was silently refused while the
  old code reported delivery), and the destination inbox never clicked its one-time
  activation. The relay now sends the site's origin, reports delivery honestly, and a
  fresh activation email was triggered; the ONE remaining step is Anthony's click,
  filed at the top of this lane. A "Wrong answer" chip joined the report categories.
  The Supabase tap: advisor run clean of errors; has_role locked away from anon (the
  five policies using it are admin checks), four functions pinned to a fixed
  search_path, game_completions' public SELECT KEPT deliberately (handles and scores
  only, the same data the public leaderboard already shows). And the July fail-open
  rule got its fence at last: Round 316 found the pattern in FIVE more validators (four
  stale repo copies hiding fixed deployed versions, synced; nba-validate-player live
  in production accepting on lookup errors, fixed and deployed as v7 with the coverage
  leniency kept and documented). simValidatorsFailClosed scans all 27 edge functions
  for the smoking-gun pairing with VALIDATOR_CONTROL=open proven red.
- THE DATA BATCH, Round 315 (desktop lane, 2026-08-29). Five review items and a P1 the
  review exposed underneath one of them.
  Who Am I's Rodri at age 0 value 0: Rodri had NO market value row after 2022, and
  neither did Kimmich, Tchouameni or Ndidi, four world class names missing from the
  entire current pull; all four inserted with two-source verified clubs, ages and
  values (sources in the round record), and the retired render path now says "No
  current age / No listed value" instead of printing its zero sentinels.
  Squad Deal dealing Premier League players under La Liga: the club-to-league map held
  only short club names while the database spells them long, so nearly the whole pool
  fell into a flat Premier League default; the map now carries the 2026 pool's real
  spellings for every league, the club outranks the stale per-player entry, and an
  unknown club reads Other instead of a false league. Flags added to the pool list and
  the banker card, and the banker's floor moved from the single worst box to the 30th
  percentile of what is left, ending the 78-into-a-pool-of-80s lowball.
  Build Your XI's ter Stegen at CM: the position never reached the validator; the
  slot's role now rides along and the prompt refuses a player who never played it. AND
  the deployed validator's every failure path returned valid:true ("accept unverified
  so games never 500"), the banned July P1 shape, live in production; v6 fails closed
  with the standard unverified retry shape. The repo copy had drifted from deployed v5
  and is resynced.
  Sign the Player's Svilar at 162m: openings were priced off rating alone ((82-55)x6 is
  exactly 162); they now anchor to the real market value, opening a fifth below it.
  The Billion Dollar Game: the Today board is now exactly one billion, in dollars,
  which is the currency the values are recorded in (the euro sign was always wrong),
  label and copy updated, and its 1,200-a-play scoring brought to the sitewide ~100
  scale. simTopDailies proves every demand still winnable at the flat billion.
  Two more harnesses ported to Windows along the way (simTopDailies,
  simScoringCoverage).
- THE CALM BOOT, Round 314 (desktop lane, 2026-08-29). The flash he filmed: every page
  showed its full crawler copy as a wall of raw text until React mounted. Now the moment
  shows one dimmed screenful that reads as the site loading; a noscript lifts the cap so
  a browser that never boots the app gets the whole page, and crawlers read the DOM
  either way. Delivered three ways so it holds everywhere: injected into all 138 dist
  snapshots by the build plugin (no committed file churn), baked into prerender.mjs for
  future prerenders, and written into index.html for the home page he actually filmed
  (new #dukb-home-copy wrapper; the 404 marker's #dukb-snapshot logic untouched).
  simSnapshotAssets section 6 fences both halves with SNAP_CONTROL=flash. The round also
  made the desktop lane a full verification machine: all 15 built-site fences now run
  green on Windows (six more harnesses ported, the retired stub generator's dead Windows
  main guard fixed, stub comparison made newline insensitive with the reason documented,
  eleven browser harnesses freed from a hardcoded Linux chromium path, the logo
  generator pinned to LF output, Python and Playwright chromium installed).
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
