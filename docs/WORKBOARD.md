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

- P1: the empty ticker. ROOT CAUSE FOUND 2026-08-28 from the run ledger: the API-Sports
  account was SUSPENDED at 2026-08-26 18:20 UTC. The cron fires, the function answers 200
  and fail-closes quietly on every feed ("Your account is suspended, check on
  dashboard.api-football.com"), so nothing has been written since 16:05 that day and the
  two day cleanup emptied the table. OWNER STEP, the only blocking one: Anthony logs into
  the API-Sports / api-football dashboard, sees why, reactivates or makes a new free key,
  and puts the new key into private.app_secrets HIMSELF via the Supabase dashboard SQL
  editor (update private.app_secrets set value = 'THE KEY' where name =
  'api_sports_key'), never pasting it into any chat or file. Desktop follow ups once the
  key lives: verify a poll writes rows again, add an alert so a feed dead for a day is
  surfaced instead of quiet, then the ESPN model (full day slate before games, live
  during, FINAL after, schedule loaded ahead so the strip is never empty).
- P1: the Club Manager league tables (other leagues stuck on pre-season alphabetical all
  season, the duplicate zero-point La Liga, the Cups tab rendering the UCL under Copa del
  Rey, the projected bracket excluding the second placed player, the 8 group 2005/06
  check).
- P1: the double footer.
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
