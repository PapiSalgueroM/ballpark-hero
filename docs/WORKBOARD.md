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
  and the other lane takes NNN+1. NEXT FREE NUMBER: 363.

**THE ADSENSE VERDICT ARRIVED 2026-08-30 AND IT IS A REJECTION.** Anthony sent
the console screenshots: a policy violation, "Low value content", with the
minimum-content and thin-content guidelines linked and a Request review button
behind an "I confirm I have fixed the issues" checkbox. THE FREEZE IS THEREFORE
OVER, because directive 3 defined it as lasting until the verdict. Nothing on
the site is frozen any more; the ordinary care about crawler-facing files still
applies, and ads.txt, the verification code and robots.txt are still not things
to touch casually.

**THE DESKTOP LANE AUDITED THE SITE AGAINST THAT VERDICT THE SAME HOUR AND
FOUND NO MECHANICAL DEFECT TO FIX. Read this before anyone starts writing
filler copy.** Measured across all 153 shipped documents: the median page
carries 584 unique words and the 90th percentile 970, the home page 923, and
only FIVE sentences repeat on more than half the pages, so the guide copy is
genuinely per game rather than a template with the nouns swapped. Every page
under 200 unique words is one of three kinds and all three are already handled
correctly: eleven retired-game signposts that canonicalise to the game that
replaced them, private pages (profile, admin, password reset) that are
noindexed, and four games Anthony himself pulled from the menus, noindexed on
his own instruction. So the thin surface a reviewer could index is essentially
nothing, and the rejection is a judgement about what the site IS rather than a
list of pages to repair. Do not respond to it by mass producing copy: that is
the one move that would make the next review worse.

**HE HAS ANSWERED, 2026-08-30: DO NOT RE-APPLY YET, AND KEEP BUILDING THE
MASTER PLAN.** His full addendum is recorded verbatim in
docs/OWNER-ADSENSE-RECOVERY-2026-08-30.md and BOTH LANES MUST READ IT. The
headlines: low value does not mean low word count, so find evidence rather than
guessing; build a genuine sports reference layer that would be useful even if
the games did not exist; upgrade the game pages that already earn traffic; do
not mass generate AI content; connect reference content into the games rather
than bolting it on for search. Two named deliverables:
docs/seo/google-render-audit.md (what Google actually receives for the top 20
to 30 pages) and docs/adsense/reapply-readiness.md (ending in NOT READY,
NEARLY READY or READY, and he submits the review, not us). New P0 order:
production bugs and security, then AdSense recovery, then indexing, then sports
data correctness.

**SUPERSEDED, kept for the reasoning.** His own operating
contract already defers AdSense ("at current traffic this earns very little")
and at 1,800 clicks a month it is worth very little indeed, so the desktop
lane's recommendation on the record is to NOT request a re-review yet, keep
growing the traffic Milestone 0 is already growing, and re-apply when the site
is materially bigger, at which point the same content profile reads
differently. He has been asked and has not yet answered; until he does, nobody
should spend a round on AdSense remediation.


## HANDOFF TO THE CLOUD LANE, written 2026-08-30 by the desktop lane

Read this first if you are the cloud/tablet session. Anthony asked for it
directly, because from his side it looked like you had stopped working.

**You had not.** Rounds 336, 352 and 356 are all yours and all landed on main.
What was missing is the last step: landing on main only updates the Lovable
PREVIEW. douknowball.com does not move until somebody calls deploy_project,
and only the desktop lane has that tool. So your work was real and invisible at
the same time. Everything through ccc4c583 is now published and live.

**The rule that follows from it:** when you finish a round, say plainly in your
last message that it needs publishing, and add it to the PENDING PUBLISH list
at the bottom of this block. The desktop lane clears that list. Do not assume a
merged round is a shipped round.

### The constraint that decides what you should take

Your sandbox cannot reach the database. Its egress proxy answers Supabase with
a 403, which is what your own Round 356 taught the sim runner to report as
unreachable rather than broken. So **anything that reads live data is desktop
work**, and taking it will cost you a round you cannot finish. That currently
means: simValueFreshness, simWorldXiPositions, simSoccerGridTiers,
simGridArchive, scripts/genGridArchive.mjs, and any round whose verification
needs a real pool.

### What to take, in this order, all of it database free

1. **SPEC SPLIT INTO /docs/spec/.** The owner's operating contract asks for the
   master spec split into per-part files with an index at docs/spec/README.md,
   so sessions load only the section they need. Pure docs, mechanical, no data.
   Do this first because it is small and the contract names it.
2. **SOCCER CONQUEST, world map round.** Your own recon (on this board) proved
   it is self contained in bundled code: FALLBACK_CLUBS in soccerCareerEngine.ts
   carries 190 clubs with country, tier and colour, STRENGTH_PRIORS in
   clubManager.ts rates the big five, and worldMapGeo.ts is a complete projected
   basemap already used by dart draft. Nothing here needs the database. It is
   high on Anthony's own list.
3. **THE SNAPSHOT SWAP CLS**, the architectural remainder in the Inbox below.
   Design work, no data. Read the two constraints written into that item before
   proposing anything: it cannot be hydrated, and it must never be hidden from
   visitors.
4. **A CANVAS MINIGAME**, the first slice of Anthony's swipe-to-move soccer
   idea. Generated characters only, never a real athlete's likeness.

### What the desktop lane is holding

Milestone 0 grid work that needs the database: extending the archive to MLB and
NHL, and the CBB and WNBA grid expansion. Do not claim those.

### PENDING PUBLISH

(empty as of 2026-08-30, everything through ccc4c583 is live)

## Inbox (unclaimed)

- SNAPSHOT SWAP CLS, the real architectural remainder (Round 351 measured it
  properly and it is smaller than Round 348 thought): the prerendered snapshot
  lives INSIDE #root, so when React mounts it clears it and paints a different
  document, which shifts whatever the visitor could already see. It cannot be
  hydrated away because the snapshot is deliberately reconstructed readable
  text rather than React's own markup, and it must NOT be hidden from visitors,
  because text served only to crawlers is cloaking. Any real fix changes the
  prerenderer to emit hydratable markup, which is a designed round, not a
  patch. Round 351 removed the larger and cheaper half of what was filed here.
- GRID ARCHIVE, DEFERRED behind the pool (was Task 3, unclaimed): rebuild the
  design around /football-grid/archive/<puzzle-id>, one page per distinct
  board, after the pool is deep enough that a published board stays retired.
- SPEC SPLIT INTO /docs/spec/ (queued, either lane, docs only): the operating
  contract wants the master spec split into per-part files with an index at
  docs/spec/README.md so sessions load only the relevant section. Mechanical,
  one round, no gates beyond the build staying green.
- GRID ENGINE TO NEW SPORTS (unclaimed): the engine family already spans soccer,
  NFL, CFB, NBA, MLB, NHL. Candidates with search demand: CBB grid, WNBA grid.
  Data-first rounds, two-source rule as always.

**ANTHONY'S 2026-08-29 IDEAS LIST (desktop chat, evening), his order, split into
workable pieces. Bugs still outrank these; within the list his order rules.**


- Soccer Conquest, one map per league (map changes with the league) plus a big one
  with the world's best 100 or so clubs. The NFL, NBA and NHL Conquest engines are
  the pattern.
  RECON DONE (cloud, 2026-08-29), correcting this item's own premise: league tables
  and club strength are NOT in the database (soccer_career_clubs was dropped), but
  everything needed is BUNDLED IN CODE, so the world map round is self contained:
  FALLBACK_CLUBS in soccerCareerEngine.ts carries 190 clubs with name, country,
  tier and color (his best-100 list already written), STRENGTH_PRIORS in
  clubManager.ts rates the big five leagues, and worldMapGeo.ts is a complete
  projected world basemap (dart draft uses it today). Round A ships
  /conquest-soccer on the world map (country territories from GEO_COUNTRIES,
  each country seeded with its strongest club, clone imperialismNhl.ts with a
  soccer score model, decide the draw rule); the per league maps are hand
  authored SVG like usStatesPaths.ts, ONE LEAGUE PER ROUND, and the visual
  rebuild of the four existing maps (his tweaks item) is a separate round.
  Generated fixtures over bundled lists, never scraped ones (the NFL data
  decision precedent).
- WNBA games: a shelf of them (the Record Books already carry WNBA Champions; grids,
  higher or lower, name them all, career ladder variants are all data-ready pulls).
- The 82-0 game but fully for soccer: run an unbeaten season with a real club, same
  engine family as the existing NBA one.
- A swipe-to-move soccer game (his reference points: full touch control, move around,
  score) and, bigger, "real animated characters and fully interactive soccer and
  football games". Buildable as canvas games with generated characters; this is an
  ARC of rounds (movement, touch input, match flow), not one round. Start with one
  polished minigame (a free kick or dribble runner with swipe control) and grow it.
- Wii-Olympics-style minigame collection: several small motion-flavored events
  (timing, swipe, rhythm) under one roof with medals. Same canvas arc as above,
  naturally splits one event per round.
- Tower defense with athletes, many levels, abilities per athlete (a swimmer only in
  water lanes, a shooter with long range, a striker with damage). LEGAL CONSTRAINT
  the builder must respect: real athletes as fictional game characters with invented
  abilities is persona use well past stats trivia, and the standing legal rules (no
  likenesses, no invented words or deeds for real people) say build it with
  GENERATED athletes or role archetypes, never real names on the towers. The game
  itself is fully buildable.
- More character profiles: a create-your-own profile picture builder (the Soccer
  Career avatar generator is the seed, it already draws faces). Same legal line as
  above: generated faces only, never a recognizable real athlete's likeness.
- CASINO IN SOCCER CAREER: DECISION OWED BY ANTHONY, and the recommendation on the
  board is NO. He flagged the risk himself ("scared a minor might play and then we
  get in trouble"). Simulated gambling on a site with young players is exactly what
  AdSense family-safety review and app content ratings punish, there is no real
  revenue in it without real-money mechanics (which are out of the question), and
  the site's whole pitch is clean free games. If some of that flavor is wanted, the
  existing in-career purchases and a fictional "prediction night out" event carry it
  without slot machines. Parked unless he overrules.
- SPONSOR-READY SURFACES (owner directive 13): configurable presented-by slots for
  challenges, tournaments and hubs, admin configured, never hard-coded brands,
  clearly separated from gameplay. An architecture round first (where the config
  lives, how a surface renders empty), then surfaces game by game.
- Programmatic sub-pages, from the outside analysis Anthony pasted 2026-08-29: dedicated
  indexable URLs for sub-content could grow the indexed surface. CAUTION built into the
  item: thin or near-duplicate pages hurt as easily as help, so this starts as a small
  pilot measured in Search Console before any rollout.
  RECON DONE (cloud, 2026-08-29), the pilot is picked and the traps are mapped:
  FOUR pages, all fed by data already bundled in code, nothing clock derived:
  /club-manager-2015-16, /club-manager-2010-11 and /club-manager-2005-06 (season
  reference pages from ERA_LEAGUES plus the era roster files: real clubs, real
  players with real ages and values, the partial-squad honesty notes, the era
  copy from CM_ERAS; none of those club or player names appear anywhere on the
  shipped site today), and /soccer-career-eras (all eight ERA_DEFS windows on
  ONE page, about 160 named stars plus the league contender pools; eight
  separate URLs would be the thin-page shape itself). Alternate E if wanted:
  /data-and-sources, the provenance page, pure static prose. RULED OUT: any
  /records sub-page (the tables are Supabase-at-runtime, prerender leaves the
  request hanging, so the snapshot ships EMPTY of rows, measured on
  public/records/index.html), daily puzzle archives (clock derived, prints
  answers), and per-school or per-club programmatic scale (the thin-page risk
  itself; colleges.ts is a game's answer key). Registration order and the fence
  checklist are in the recon record; the two easiest misses: raise
  simIndexNow's SITEMAP_FLOOR in the same round, and give every page at least
  one inbound body link or simInternalLinks calls it an orphan. The era pages
  share a template, so the frame must stay thin around genuinely different
  data: the fences catch byte-identical documents, not near-duplicate prose.
  Pairs with the SEO keyword pass below.

- **THE 2026-08-28 REVIEW: `docs/TWEAKS-2026-08-28.md`.** Anthony played the site top to
  bottom and filed his biggest list yet, transcribed there in full. It outranks the
  roadmap. The P1 bugs and the first feature wave are claimed below; everything else in
  that file is the shared backlog both lanes pull from, bugs before features, his order
  within a lane. Claim here before building.
- Rebuild redesign, the remaining phase: phase two (the core loop) SHIPPED as Round
  333; phase three, real manager names as hire options per club, DESKTOP GATED: who
  manages whom changes weekly and needs web verification, and any manager "value"
  must derive from verifiable records, never be invented on a real person.
- The tycoon merge, RECON DONE (cloud, 2026-08-29): the target is Stadium Tycoon
  PLUS WONDERKID FACTORY (his tweaks lines 220-226 verbatim, "one massive tabbed
  tycoon"), NOT Club Manager. The staged plan: Round A ships the tabbed /tycoon
  shell (HubTiles) plus the save fold ONLY, reading both V1 keys into a new
  merged key with a mergedSeeded latch (the legacySeeded pattern), old routes
  kept dual writing so a rollback loses nothing; BOTH deserializers hard reject
  a bumped v and neither key is in LIVE_IDENTIFIERS, so a rename silently wipes
  saves, the migration assertions go in the game's own harness. Round B the
  named generated opponent league table (invented names, simNoRivalNames),
  Round C gems and tiered packs feeding the sell tension across the whole
  squad, Round D pitch, animations, gear, extra worlds. Round A touches saves
  and rides alone.
- From that list, unclaimed and sizable: the conquest map
  overhaul, (ALL THREE new games shipped: Sports Bingo R323, Search and Discard R325, Gauntlet Draft R328), the
  Club Manager arc list, the Soccer Career BitLife audit, the US sports parity arc, the
  CFB real names research.
- Encyclopedia mining (tweaks item 12, the permanent backlog, pages 4 to 51 of his
  document): either lane pulls a system from it when its own list runs dry. Mine it for
  mechanics, never its vocabulary (simNoRivalNames enforces this).

## Desktop lane (Claude Code on Anthony's PC)

Claimed 2026-08-28. This lane takes the work that needs what only this machine has: the
Supabase MCP, the Lovable MCP, and cheap long local browser runs.

From the 2026-08-28 review (bugs, claimed same day):


- SEO INDEXING, phase two (Round 341 shipped phase one): OWNER TAP NEEDED to finish,
  either sign into the Claude in Chrome extension on the PC so the desktop lane can
  read Search Console itself, or export the GSC Pages report CSV to Downloads and
  say so. Then the classification table in docs/seo/indexing-audit.md gets filled
  from real verdicts and a handful of high priority pages get manual requests.



- Soccer Career floating buttons, noted in Round 330, judged acceptable and left
  alone: the training and phone buttons transiently cover right-aligned numbers in
  the rows they float over; rows scroll clear, the buttons are owner approved
  (Rounds 80, 81, 129, 159), and a real fix is an auto-hide-on-scroll design
  decision, not a padding hack.
- Queued from the 08-28 review, Club Manager residue: era Champions League pools are 16
  clubs so era saves play 4 groups, not the real 8. Growing each era's euro pool to 28
  verified era participants (the real group stage fields are documented facts) is a data
  round. The era-id nation fence SHIPPED in Round 339 (simEraWorldTables section 6).
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

- **A RED MAIN CAUGHT BY THE OTHER LANE, 2026-08-29, worth one habit rather than
  any blame.** Round 346's maker note landed on main with `simNoInventedQuotes`
  failing, and the round record says what happened: it ran tsc, the build and
  the fold harness, which is the harness the round was about, and not the full
  board. The failing line was Anthony's own hello, flagged because "Anthony" is
  a surname in the roster set, so his sentence about his own site read to the
  detector like words put in a footballer's mouth. Round 335 (cloud) fixed it
  with an exemption scoped to his one voice file and only when his is the sole
  real name on the line, plus three planted probes proving it is not a back
  door. The habit the episode argues for: a round that adds any hand written
  copy to `src` runs the full board before it lands, because the copy fences
  (invented quotes, rival names) read files no scoped harness touches.
  TWO THINGS THE PROBES THEMSELVES TAUGHT, both worth your judgment since you
  own that harness. First, a probe that plants a violation the checker never
  catches proves nothing and will happily report success: the first draft
  planted `Mohamed Salah told me: "..."` inside the exempt file, the probe
  reported the exemption was a back door, and the truth was that the STRICT
  source rule ignores that shape everywhere, exempt or not. The probe now
  plants the shape that actually fires, a real name handing over to a first
  person sentence, with the person swapped. Second, and this is the part
  worth a decision: that strict rule requires the name to sit INSIDE the
  quoted run, deliberately, so a data row like `{ name: "..." }` cannot false
  positive. The consequence is that a hand written narrative line in `src` of
  the form `Salah said: "I want to leave"` is NOT caught by the static scan,
  only by the runtime pass over generated copy. Whether that gap is worth
  closing (and at what false positive cost across 712 files) is yours to
  weigh; it was left alone here rather than tightened unilaterally mid-freeze.
- Tweaks item 9: the full playGames browser run over every game, every feature, then fix
  every finding.
- Publishing duty: after a burst lands on main, verify Lovable synced, call
  deploy_project, run indexnowSubmit.
  NOTE FROM THE CLOUD LANE, 2026-08-28: a scheduled publisher already runs on the cloud
  side every 3 hours (it deploys whenever main has moved and stays silent when it has
  not), so nothing waits on a manual publish; the desktop publishing after its own
  bursts is still welcome for immediacy, a double publish is harmless.

## Cloud lane (tablet sessions and the 3 hourly scheduled sessions)

**FOR THE DESKTOP LANE, A BOARD FACT WORTH ONE DECISION, AND THE CATEGORY IS
GROWING FAST: FOUR harnesses now read the live database, and the
cloud sandbox's egress proxy answers that host with a 403, "Host not in
allowlist". `simValueFreshness` (R344), `simWorldXiPositions` (R345),
`simSoccerGridTiers` (R353) and `simGridArchive` (R354) therefore cannot run
in the cloud lane AT ALL, and every cloud board from here reports FOUR reds
that mean "not runnable here", not "broken". Two of those four arrived in a
single evening, which is the point: the count is climbing with every
data-backed fence, and a board that is permanently four-red stops being
read. All four fail closed with a clear sentence, which is right, and none of
them should ever be made to pass on a run that reached no database.
FIXED AT THE RUNNER, ROUND 356 (shipped) (cloud, 2026-08-29), without touching
any of the four: the runner probes the database once itself and, only when it
is genuinely unreachable, reports a harness that said NOTHING WAS CHECKED as
SKIPPED rather than failed. A skip is not a pass and is never counted as one.
Where the database IS reachable, the desktop lane included, nothing changes
and that sentence stays a hard failure, because there it means the data broke
rather than the sandbox.
Round 335 fixed only the diagnosis on `simValueFreshness`: it used to die on
`Unexpected token 'H'` because the bare `.json()` choked on the proxy's plain
text body before its own guard could speak, and it now prints the status, the
reason, and the line saying it needs database egress. `simWorldXiPositions`
already says its piece cleanly and was left alone.
The open question is yours, since you own both harnesses: either the runner
learns a documented "needs the database" group that the cloud lane skips
loudly, the way it already skips the 42 browser harnesses by name, or cloud
rounds keep reporting these as known reds with this reason written down. Do
not let anyone "fix" either one by making it pass when it checked nothing.**

**A THIRD FLAKE, RECORDED NOT FIXED (cloud, 2026-08-29, Round 352): `simEras`
failed one board with "no keeper sample at 35" and then passed three runs out
of three standalone, and it had passed the board immediately before. So it is
a low rate flake in the keeper sampling, roughly one run in four observed,
unrelated to the round that found it. It is left alone deliberately rather
than tuned blind: Round 335 fixed two flakes this way (simRoles was a coin
toss on one scenario, simWorld asserted a rule the engine had replaced) and
both took a measured distribution first. Whoever picks this up should do the
same, measure what "keeper sample at 35" actually produces across many runs
before touching a threshold, because the failure names an era age bucket and
an empty sample is as likely to be a real gap in an era's keeper pool as it
is to be a loose floor.**

Claimed 2026-08-28:

From the 2026-08-28 review (his decisions and the self contained fixes):
- Trade Finder, RECON DONE, NEEDS THE DESKTOP LANE'S NETWORK (cloud, 2026-08-29): both
  halves of the review item are data work the cloud sandbox cannot verify (egress is
  proxy blocked, ESPN and Wikipedia both 403). Diagnosis for whoever picks it up: "only
  offensive players" is STRUCTURAL in the NFL sim, frontOffice.ts carries POS lists of
  QB/RB/WR/TE/OL only and models defense as team units, so fixing it means real
  defensive players with derived ratings, a data pull. Rosters were baked 2026-08-05
  (NFL from 2025 nflfastr rosters, so a year stale; NHL is current 2026-27; MLB mixed).
  The bake scripts (bake_nhl.py and friends) are NOT in the repo, they lived on the
  machine that ran the 08-05 bake. MLB/NBA/NHL sims already roster both sides.

Standing claims:

- New game rounds and record shelf tables, the self contained work.

## Done

- THE DAILY PICK'S POOL NOW HAS A GUARANTEED ORDER, Round 362 (desktop lane,
  2026-08-30). dateUtils.ts documents pool[dateSeed % pool.length] as the site's
  daily mechanism and it is correct, but it rests entirely on the pool arriving
  in the same order every time, and four hooks never asked for one:
  useCbbProgram, useNascarDriver, useGuessTheNation and useTennisPlayer, which
  is the very file the other two cite as the pattern to mirror. Postgres returns
  heap order without an ORDER BY, which looks stable until a row is edited,
  because an UPDATE rewrites that tuple to the end of the heap and shifts every
  index after it: the date to puzzle mapping then changes silently and two
  players on the same date can get different puzzles. Latent, not firing:
  measured today the order was stable, and the honest claim is that the
  invariant was unguaranteed rather than that the games were broken.
  THE FIX RE-MAPS TODAY ONCE, and that is the real cost, stated rather than
  hidden: today's CBB program moves from Old Dominion to Missouri. One shift,
  then stable forever, and these are low traffic games. Worth it.
  TRUNCATION WAS THE OTHER HYPOTHESIS AND THE EVIDENCE KILLED IT: no daily pool
  table exceeds 1,000 rows. The largest is transfer_path_puzzles at 902, and
  that one already pages through fetchAllRows. soccer_grid_puzzles at 710 is the
  nearest unpaged one and it is correctly ordered by sort_order.
  NEARLY SHIPPED A BREAKING CHANGE, caught by verifying rather than assuming:
  the first patch ordered all three by 'id', and nascar_drivers HAS NO id COLUMN
  and no primary key at all. That query 400s and the hook turns it into its
  error state, so the game would simply have stopped working, and nothing would
  have caught it because these hooks reach Supabase through `as any` so tsc sees
  nothing. Ordered by driver_name instead: unique across all 83 rows, non null,
  and stabler than rank, which a data refresh could renumber.
  simDailyPoolOrder section 2 exists because of that near miss and is the half
  that earns its keep: it asks the DATABASE whether every (table, order column)
  pair in src is real, all 36 of them. Section 1 holds the ordering rule by
  shape rather than by a list of hooks, so a game added tomorrow is covered.
  Two controls, one per section, both proven red. The harness itself shipped a
  bug first: its chain regex required reaching the next .from( within 400
  characters, so any chain without one was silently DROPPED, and it reported
  useGuessTheNation as having zero pool reads while that file was the one under
  investigation. Fixed, and the count went from 12 pairs to 36, which is how the
  fourth game (tennis) was found at all. A harness that cannot see a file
  passes it.
  Filed, not fixed: nascar_drivers has no primary key, and useNascarDriver line
  63 looks up a daily by .eq('id', ...) on that same idless table, so even if
  the edge function ever ran, that path would 400. It is dead twice over.

- THE REST OF THE PUBLIC WRITE SURFACE, AND A WRONG NUMBER ON THE HOME PAGE,
  Round 361 (desktop lane, 2026-08-30). Nineteen anon writable tables audited by
  six parallel agents, every finding then put to an adversarial verifier told to
  refute it. The verifier moved three attack cost estimates by an order of
  magnitude and killed one proposed fence outright (it would have inflated
  scores worse than the deflation it prevented), so its corrections are taken
  throughout. Twelve tables feed something a human reads, seven feed nothing and
  are listed as needing nothing so nobody audits them again.
  EIGHT TABLES BOUNDED with CHECKs derived from each game's own source, never
  from what the data happens to hold: the three chain leaderboards (one forged
  row took rank 1 on a board shown to every finisher, and two of the three
  tables are empty so it would have been the whole visible history), the three
  grid rarity tables (about twenty rows own any cell, because the aggregation
  groups by cell and table size never enters it), hof_votes and poll_votes.
  Pre flight: zero existing rows violate any predicate.
  THE WRITE REMOVED RATHER THAN BOUNDED: cbb_daily and nascar_daily hold the
  ANSWER to the daily puzzle, not a score, and both accepted anonymous inserts
  while carrying UNIQUE(puzzle_date), so the first row for a date owned that
  date permanently and the edge function that should fix it returns early when a
  row exists. Nothing in the browser ever wrote them. Both policies dropped.
  THE BUG WITH NO ATTACKER IN IT, and it was live on the home page: useMostPlayed
  tallied the day's completions in the browser on the assumption in its own
  comment that a day stays small. PostgREST truncates at 1,000 and the day had
  grown to 3,550, so it ranked an arbitrary slice of the early hours, found only
  two games clearing the five play bar, and silently served the curated fallback
  trio. It computed club-manager 990, budget-builder 7, ball-iq 1 where the real
  top three were club-manager 2638, soccer-career 547, nba-my-career 132. Now a
  database aggregate that cannot be truncated and joins Round 360's allowlist so
  an invented key cannot trend. THIRD INSTANCE OF THE POSTGREST 1,000 ROW CAP IN
  THREE ROUNDS, after fetchAllRows in 359 and this round's own harness draft.
  THE SYSTEMIC FINDING: live had drifted looser than the committed migrations on
  five tables, always in the permissive direction. question_reports committed a
  bounded insert and live had WITH CHECK (true); cbb_scores and
  medal_games_scores are committed admin read and live was public. Restored, and
  verified afterwards that a normal bug report is still accepted, which mattered
  because the report forms swallow their errors so a rejected report would look
  exactly like a sent one. One missing bound is a bug, five in the same
  direction is a process with no feedback.
  simPublicWrites probes behaviour with the anon key and demands a check
  violation SPECIFICALLY (23514), because a 42501 would mean RLS refused it and
  prove nothing about a constraint; section 3 proves it can tell the two apart.
  Every probe is designed to be refused, so a green run writes nothing.
  PUBWRITES_CONTROL=unbounded points at cbb_scores, which is deliberately left
  open, and must go red there. Both probe rows it wrote were deleted and the
  tables verified back at their original counts.
  get_advisors after both migrations: zero ERROR, and the Round 360 view error
  is gone. Filed not fixed: nothing schedules either daily edge function, so
  Daily mode on those two games has run off the client fallback since it
  shipped.
  PUBLISHED and verified live 2026-08-30: Lovable synced be9c99a1, the live
  bundle flipped, and most_played_today called with the anon key returns
  club-manager 2835, soccer-career 648, nba-my-career 132, so the home page
  shows real data instead of the fallback trio for the first time since the day
  count passed 1,000. /rarity-round, /ufc-chain and /hof-or-bust all serve 200
  with their own titles.

- THE WORLD LEADERBOARD STOPS TRUSTING NUMBERS A STRANGER CAN WRITE,
  Round 360 (desktop lane, 2026-08-30). global_leaderboard() and global_rank()
  computed each game's denominator from game_completions, which takes anonymous
  INSERT with WITH CHECK (true), so posting one row under a game key that does
  not exist made your score that key's maximum and paid the full 100 points,
  repeatably, on a board linked from every page since Round 270. A fix was
  written on 2026-08-26 and NEVER APPLIED, because the doc and the migration
  were both left untracked in Anthony's folder where no session that pulls the
  repo could see them. Both are committed now.
  CORRECTING THIS ROUND'S OWN CLAIM: the claim said applying the stale draft
  would zero every game shipped since 2026-08-26. That was wrong and the diff
  says so. The draft's half one derives caps from the DATA, so any newer game
  that had recorded a score was already covered. The real gap was FOUR games
  that can send a completion and have no scores yet: clue-auction,
  perfect-season-nhl, stat-detective and who-am-i, all four live registered
  routes. Four silently earning nothing forever, not sixty.
  Applied as 20260830_leaderboard_score_caps.sql, superseding the draft, with
  one design change: half two now carries EVERY key the source can send, derived
  from source rather than typed, so the table is complete by construction rather
  than complete by somebody remembering. 137 rows, 122 frozen from live data and
  15 allowlisted with a null denominator that falls back to the game's own 99th
  percentile. Re-verified read only on 174,183 rows and 3,982 players
  immediately before applying: top 100 players whose points change 0, largest
  change 0, nobody dropped. Re-measured for exploitation: still none, no game's
  maximum exceeds 1.2x its own 99th percentile. An open door, not a break in.
  simLeaderboardCaps is the fence and it is the half that lasts, because the
  inner join that kills the attack turns a missing row into SILENT zero scoring,
  which is quieter than the bug it replaces. Five checks, CAPS_CONTROL=stalelist
  for the control. Its own section 4 shipped a bug first: it read
  game_completions with limit=100000 and went green having seen 1,000 of 174,183
  rows and 40 of the 122 scoring games, walking straight into the PostgREST
  1,000 row cap that fetchAllRows exists for and that Round 359 had just
  hardened. It keyset paginates now and refuses to pass if it enumerates under
  100 games.
  get_advisors after the DDL, per the database rules, found one ERROR of my own
  making: the new view defaulted to SECURITY DEFINER. Now security_invoker, and
  it exposed nothing meanwhile because both tables it reads are already public
  read. Confirmed at the same time that app_secret is executable only by
  postgres and service_role, so the poll secret is not reachable with the anon
  key.
  STILL OWED BY ANTHONY, both one click: leaked password protection is still OFF
  (the 2026-08-30 advisor run confirms it), and the Supabase spend cap wants
  confirming.

- THE PAGING HELPER SURVIVES A TRANSIENT, AND THE AdSENSE READINESS DOC LANDS,
  Round 359 (desktop lane, 2026-08-30). Round 358 found the three franchise
  grids giving up a whole game on one cancelled page. The same fragility lived
  in src/lib/fetchAllRows.ts, the shared helper that pages every large read on
  the site, and NINE more libs depend on it: career players, connections
  puzzles, the pack pool, the quiz board, rebuild, transfer grades, transfer
  path puzzles, transfer values and Who Am I. Paging turns one read into ten or
  twenty queries, so it multiplies the chance of meeting a transient by the
  number of pages, and the database really does cancel these under load
  (Postgres 57014). Fixed at the root: two retries of the SAME range with a
  short backoff, then the error still surfaces, because a database that is
  genuinely down must not be retried forever.
  simFetchRetry is the fence and it needs no database on purpose, because the
  failure is injected rather than waited for, so it is deterministic and it runs
  in a sandbox with no network. It holds six things, and the two that matter
  most are not the obvious one: that the rows after a retry are EXACTLY the rows
  without one (a retry that re-requested the wrong range would corrupt the
  result rather than fail it, which is the risk the fix itself carries), and
  that every caller reads the error, because the helper hands back what it
  collected ALONGSIDE the error, so a caller taking only the data would serve a
  silent fraction of the table. All nine honour it today and whoAmI documents
  why; the check is there so the tenth has to. Two controls, one per mechanism:
  FETCHRETRY_CONTROL=noretry strips the retry and sections 1 and 2 go red,
  showing the exact production failure (1,000 of 2,500 rows returned WITH an
  error), and FETCHRETRY_CONTROL=blindcaller blinds one caller and section 6
  goes red. Both refuse to run if they had nothing to remove.
  The round also lands docs/adsense/reapply-readiness.md, the owner directive's
  section 19 deliverable. Verdict NEARLY READY, and the reasoning is that the
  site is now better but Google's index is not: the hubs were rewritten and the
  archives shipped on 2026-08-30, so submitting today spends the re-review on a
  snapshot that predates the response to the rejection. The owner submits, not
  us. Still blocked on him: index coverage needs Search Console, which no tool
  here can read.
  PUBLISHED and verified live 2026-08-30: Lovable synced ead052f4, deploy_project
  called, the live bundle flipped, and the five fetchAllRows backed routes
  (/career, /connections, /transfer-path, /rebuild, /quiz-board) each serve their
  own snapshot with a unique title and 2,341 to 2,950 words. All 149 node
  harnesses green plus the 15 built-site fences re-run by hand afterwards.

- THE ARCHIVE COVERS THREE SPORTS, AND A REAL PRODUCTION BUG FELL OUT OF IT,
  Round 358 (desktop lane, 2026-08-30). The archive now runs for the NBA, MLB
  and NHL grids: 42 boards, 378 cells, 3,024 published answers, every one
  recomputed by the fence against each game's own matcher and live data.
  The other candidate for this round was splitting the Record Books into twelve
  champion pages, and it was rejected on purpose: a list of Super Bowl winners
  sits on a thousand other sites and adds nothing by existing here again, which
  is the opposite of the unique value the AdSense finding asks for. The archive
  is unique by construction, because the boards are ours and the answers are
  computed from our own data.
  THE BUG. The generator failed on MLB, succeeded on a retry, then failed
  again. That pattern is a transient, and chasing it found that all three
  franchise grids page through their table and return null if ANY single page
  errors, where each page is a query the database sometimes cancels under load
  (Postgres 57014, statement timeout). One dropped page and a real visitor gets
  the error card instead of a playable grid. All three now retry twice with a
  short backoff before giving up. Found only because the archive generator
  calls the same function the game does, which is the argument for building
  tools on the game's own code rather than a copy of it.
- THE SIX HUBS BECOME CORNERSTONE PAGES, Round 357 (desktop lane, 2026-08-30).
  The one weakness the AdSense render audit surfaced, fixed and measured. They
  were the thinnest indexable pages on the site AND the most similar to each
  other, because sportHub.ts said in its own comment that the copy was kept
  alike so a new hub would obviously be a copy of an existing one. Good for
  tone, and the exact recipe for six pages that read as one template. After:
  words went from 521 to 614 up to 1,362 to 1,935, and the worst similar pair
  went from 36 percent down to 11. Every number measured, not asserted.
  How the copy was written matters more than that it exists. One researcher per
  sport worked from the real registry game lists so no game or path could be
  invented, then THREE adversarial passes. Pass one rejected all six drafts, 44
  problems. Pass two fixed them and was rejected again, 21 problems, and the
  good ones were about THIS SITE's own games, checked against source and the
  database: rebuild_clubs returns 69 and not 63, NFL Grid has no unlimited
  mode, the baseball Connections uses groups of five where the soccer one uses
  four, statDetective's hint order was stated wrong. Pass three was told to CUT
  every disputed claim rather than fix it, which is what made it converge:
  four hubs came back clean and two carried one FAQ claim each, both cut by
  hand. A hub page does not need to know how many clubs a game has.
  simHubDepth fences depth, cross hub phrasing overlap and whether each hub
  names games only it names, because padding a hub with sentences that would
  work for any sport is worse than leaving it short. Its own third section was
  caught broken first, looking for hrefs in text whose tags were already
  stripped and returning the same answer for all six inputs. Clone control
  proven red. Shipped copy and method kept in scripts/data/hubCopy357.json; the
  raw checker prose is deliberately not kept, because it quoted rival product
  names while flagging them and tripped simNoRivalNames on a committed file.
- THE RUNNER LEARNS WHAT IT CANNOT REACH, Round 356 (cloud lane, 2026-08-29).
  The four database-backed fences no longer read as four broken harnesses in
  the lane that physically cannot reach the database. runAllSims probes the
  database once, and only when that probe is refused does a harness whose own
  output ends NOTHING WAS CHECKED report as SKIPPED, named in its own line and
  subtracted from the green total rather than counted as a pass. Where the
  database answers, nothing changes and that sentence is still a hard failure,
  so the desktop lane's runs are identical to before. No list of harness names
  was added, on purpose: two of the four reach the database through app libs
  and never mention it, so a text sniff would have missed them, while every one
  of them says plainly in its output that it checked nothing. The fifth such
  harness will be handled without anyone editing this. DB_PROBE=reachable is
  the control and turns the skips back into failures. Cloud board: 143 green,
  4 skipped, 0 failed.
- NBA STAT LINE, Round 352 (cloud lane, 2026-08-29). The first item off his
  2026-08-29 ideas list and the first new route since the contract narrowed the
  freeze. A target per-36 line drawn from a real season's own numbers, five real
  seasons blended minutes-weighted against it, scored 0 to 100, daily and
  unlimited. Per-36 rather than per-game because `games` is null on all 30,462
  season rows, said out loud in the guide instead of hidden; steals and blocks
  gate the pool to 1973-74 on and a 3P% target to 1979-80 on; splits recomputed
  from summed makes and attempts, never averaged. Built in a parallel worktree,
  reviewed here line by line, simNbaStatLine fencing it with measured floors and
  a proven avgsplit control. Sitemap 132 with the floor raised in the same round.
  The GAME line mode stays desktop gated: no box-score table exists for any sport.
- THE PRERENDER RACE, Round 355 (desktop lane, 2026-08-30). Filed the round
  before as "two pages have clock-dependent heads and halt the build", and the
  first thing this round did was disprove its own premise. The refused routes
  were DIFFERENT on every run (alphabet-sprint and golf-higher-lower on one,
  perfect-season-nhl and hall-of-champions on another, list-quiz and
  nfl-higher-lower on a third), and the reported difference was always the same
  shape: the FAQ block PRESENT in one clock sample and ABSENT in another,
  rather than carrying different content, which is what a real calendar
  dependency looks like. Run either refused route on its own and it prerenders
  perfectly. That is a race, not the calendar.
  Round 284 had already closed one race here by having the page announce when
  its guide had landed, and that check still passes on every sample. The one
  that survived it: Helmet writes structured data into the head from an effect,
  so the guide's marker can clear a tick before the FAQ JSON-LD is actually in
  the document, and under the load of a 140 route run that tick lands on the
  wrong side. Two changes, because the first alone was not enough. The capture
  waits for the head to be identical twice in a row before trusting it, a wait
  on the thing that was actually moving rather than a bigger fixed sleep. And
  the comparison now tells the two cases apart by shape: if one sample's head
  holds everything the others hold plus extra, the others had not received the
  extra yet and the fullest head is the true one; only when two samples each
  hold something the other lacks is it a real disagreement, the Round 282 case
  this check exists for, and that still refuses loudly. The clean run exercised
  exactly that path on /nba-my-career and kept the page rather than binning it.
  One more contributor, written down because it made all of this look worse
  than it was: 67 orphaned node processes had piled up across a long session of
  background harness runs, and that was a real part of the load the race needed.
  Kill stale node processes before trusting a timing measurement here.
  What it was costing: two pages a run kept a STALE snapshot rather than a new
  one, silently, and prerender's non-zero exit halted npm run build:seo before
  it ever regenerated the sitemap, which is why every recent round has been
  running the pipeline steps by hand. Full run after the fix: 137 routes, 0
  failed, exit 0, and build:seo completes end to end.
- THE GRID ARCHIVE, first slice, Round 354 (desktop lane, 2026-08-30). Contract
  Task 3, with the sport order inverted by what the recon found. Soccer and the
  NFL draw from fixed pools and recycle them, so publishing a board's answers
  publishes an answer key for a puzzle that comes back; the franchise grids
  seed each day's board from its date, so a board belongs to its date and never
  returns. NBA first, therefore. The answers are not community picks either:
  those tables hold a few hundred rows in total and would have made a mostly
  empty page. They are computed with the game's own playerMatchesCell over the
  same indexed data the game validates guesses against, so the page cannot list
  a player the game would reject. 14 boards, 126 cells, every cell with between
  39 and 59 valid players and the rarest few named by career games played.
  The data is baked into src/data/gridArchive.json by scripts/genGridArchive.mjs
  rather than computed live, because "the last fourteen days" is a thing derived
  from a clock and the prerenderer strips those on purpose; baked, the page
  prerenders honestly and its sitemap date moves only when it really changes.
  simGridArchive checks the boards against the generator, every published answer
  and count against the live data, that no board is dated later than the day it
  was generated for, and that no cell is a stub; ARCHIVE_CONTROL=badanswer
  swaps in a player who does not fit and was proven red.
  TWO PIPELINE FACTS THIS ROUND PAID FOR, both worth knowing before adding
  another non-game page: the prerenderer takes its route list from
  dist/sitemap.xml, and the sitemap only carries non-game pages named in
  genSitemap's curated STATIC_PAGES, so a new page that is not a registry game
  is invisible to both until it is listed there. And `npm run build:seo`
  currently exits 1 partway: prerender returns non-zero when it refuses a
  clock-dependent head, which two pages have, so the chain halts before the
  sitemap regenerates. Filed below.
- SOCCER GRID HARD MODE WAS INERT, Round 353 (desktop lane, 2026-08-30).
  Found while checking whether the archive could safely publish soccer boards,
  which needed the per-tier pool sizes. Difficulty here is DERIVED, from how
  narrow a board's row and column attribute types are, and the bands split the
  score's theoretical 2 to 6 range into even thirds. The pool cannot produce
  high scores, because narrow attributes are rare in it: measured across all
  710 live puzzles the score takes six values and two thirds of boards sit at
  exactly 2. So the tiers came out easy 554, normal 153, HARD 3, and because
  filterPoolByDifficulty falls back to the whole pool below 20, choosing Hard
  did nothing at all. Nothing crashed and nothing logged; the settings panel
  simply offered a choice with no effect, which is a button that does nothing
  on the contract's own do-not-ship list. The bands now cut the measured
  distribution instead of the theoretical one: 470 / 193 / 47, every tier
  clear of the floor, mean narrowness rising 2.00, 3.04, 4.07 in the order the
  labels promise. simSoccerGridTiers holds all three of those against the live
  pool, and TIERS_CONTROL=oldbands re-applies the shipped bands to the same
  data and goes red, so the control reproduces the real bug rather than a
  staged one. Note for the day it ships: a player mid-game on the old tier
  loses today's board, because useDailyPuzzle validates the saved puzzleIndex
  and discards a mismatch, which is the safe behaviour and the reason nothing
  is corrupted.
- THE FOOTER WAITS FOR ITS PAGE, Round 351 (desktop lane, 2026-08-30). The
  boot swap item, diagnosed rather than assumed, and most of it turned out not
  to be the snapshot architecture at all. Every route is lazily loaded, so
  while a chunk downloads React shows a spinner in a min-h-[60vh] box, and the
  global Footer rendered immediately BELOW that Suspense boundary: a full width
  277px footer painted about 535px down a phone screen, then the real route
  arrived several thousand pixels tall and shoved it down. That single move
  measured 0.341, which is exactly the CLS the live site showed on three
  unrelated pages in Round 348. The fix is moving <Footer /> inside the
  boundary so it waits for the content it sits under and then mounts below the
  fold, where a mount costs nothing. Proven by A/B on the real build rather
  than argued: the old structure measures 0.341 on all five swept routes, the
  new one measures 0 to 0.027, three consecutive runs green. playBootShift is
  the fence and it checks the STRUCTURE first (with the route chunk held back
  2500ms so the fallback is certain, nothing may render under it) and the
  number second, because the structure is the invariant and the number is
  evidence. Its first cut was flaky, sleeping a guessed four seconds and
  failing a merely slow sport hub, so it polls for the footer now. Control
  BOOTSHIFT_CONTROL=eagerfooter replants a footer under the fallback and was
  caught on all five routes. The genuine snapshot-swap remainder is smaller
  than believed and stays on the board.
- THE NFL GRID POOL, Round 350 (desktop lane, 2026-08-29). Claimed as the grid
  archive and reaimed by its own recon, which found a worse bug underneath:
  every grid walks its static pool once before repeating, so POOL LENGTH IS THE
  REPEAT INTERVAL, and the money page (ranked 21 for "nfl grid", 49,500 a month,
  NFL season days away) was handing daily players the same nine questions every
  30 days. The pool went 30 to 72, so the repeat is now quarterly. The 42 new
  boards were authored by eight parallel researchers by thematic slice and then
  handed to a separate adversarial checker told to refute rather than approve:
  64 written, 22 rejected each with a named error (Baldwin's 1,069 yards dated
  to the wrong season, Freeney's Colts-only sack total sold as a career total,
  three players credited to teams they never played a regular season game for),
  42 survived, and every crossing carries at least two evidenced real players
  in scripts/data/nflGridPool350.json. simGridPuzzlePool is the fence: pool
  depth against a 60-day floor, no two boards asking the same nine questions
  (rows and cols compared as unordered sets, because swapping the axes asks the
  same board), no label crossed with itself, and every criterion inside the
  vocabulary the game was taught. Its own first draft flagged three shipped,
  working criteria, so the vocabulary is now derived from the pools rather than
  guessed. GRIDPOOL_CONTROL=dupe clones a board back in and was proven red.
- NFL GRID SAYS ITS OWN NAME, Round 349 (desktop lane, 2026-08-29). Contract
  Task 4 for the money page: /football-grid ranks 21 for "nfl grid" (49,500
  monthly) with its title and meta already targeting the term, but the H1
  said PRO FOOTBALL GRID and the registry label rippled "Pro Football Grid"
  through every tile, hub, breadcrumb and related-games anchor on the site.
  All four naming sites (H1, label, share card name, SEO block title) now say
  NFL Grid, the full snapshot pipeline was regenerated, and the sitemap
  re-dated exactly the 23 pages whose shipped text really changed while 108
  held their old dates. The round also fixed a real pipeline bug it tripped
  over: genSitemap generated its esbuild entry with a raw Windows ROOT whose
  backslashes were eaten as escape sequences, so the desktop lane could not
  regenerate a sitemap at all (Linux never noticed, which is why nobody had).
  Forward slashes, os.tmpdir and a file URL import fixed it for both worlds.
  tsc zero, builds green, all 15 built-site fences green plus simHomeCopy and
  simNoInventedQuotes, simPrerenderBoot re-proven green in isolation after a
  batch-run collision with leftover pipeline processes.
- THE STRICTER HOW-TO-PLAY FENCE, Round 335 (cloud lane, 2026-08-29). The queued
  second half: the "handful" of prose-only games was measured at 39 of 116, all
  the non shell heavyweights included (Soccer Career, the dynasties, perfect
  seasons, my careers, front offices, conquests, chains, the new Rebuild spin
  screen). Each mounts the standard GameHelp through a uniform zero height
  z-10 anchor after the navbar, zero layout shift, and playHowTo now fails any
  route whose only affordance is prose. Overlap probed at 390 on all 39 (every
  "?" clickable, clear of title glyphs; the z-10 exists because Fantasy Draft
  proved a plain anchor gets painted over), 116 of 116 green under the strict
  rule, blind control proven.
- GRID MOBILE CLS, Round 348 (desktop lane, 2026-08-29). The Milestone 0 mobile
  bug, fixed at the structural level: all six grid pages used to swap a
  one-line loading div for a 300 to 650px board when data landed (soccer also
  dropped a 214px settings panel in above it), which measured live as CLS 0.60
  on soccer-grid and 0.40 on hockey-grid at 375px, both failing Core Web
  Vitals. GridBoardSkeleton now renders in every loading branch with the SAME
  container and sizing classes as the real boards (two geometries, square and
  franchise, mirrored class for class; soccer reserves its settings panel
  too), so the page's geometry settles before the network answers. The shared
  shadcn dialog close X grew from a bare 16x16 icon to a 32x32 tap target
  (p-2, corner position preserved), which fixes every dialog on the site at
  once. The player-search rows were verified 40px buttons, no fix needed,
  item closed. playGridCls fences it: database responses held back 1500ms on
  every run so the late-data worst case is deterministic, all six routes at
  or under CLS 0.05, GRIDCLS_CONTROL=noreserve yanks the skeletons mid-load
  and proved red (soccer 0.42), with the control's own first cut caught not
  firing and fixed (a pre-parse style injection never survives parsing). The
  boot-swap remainder is measured and filed as its own board item.
- LIGHT MODE, Round 347 (desktop lane, 2026-08-29). The owner's ask, shipped as
  a token flip and not a redesign: the dark :root palette stays the default and
  the identity (snapshots, social image and the AdSense review all show it, so
  prefers-color-scheme is deliberately not read), and a .light class on <html>
  overrides every token with a measured light set. The toggle lives in the
  footer for everyone (Cookie choices is the precedent) and as an icon in the
  header from sm up only, because the worst guest header row already measures
  347px at 360 (Round 320's lesson stands). Applied in main.tsx before React
  draws, nothing touches index.html or any crawler-facing file the freeze
  covers; buttons never survive prerendering, so crawlers see no change at
  all. The recon said 1,884 semantic-token usages against 87 hardcoded darks,
  and the harness found the ones that mattered: the ticker bar's hardcoded
  near black (token ink went invisible on it, 1.16), text-red-400 live labels,
  the gold New badges at 3.23, Club Manager's era chips at 1.92, all fixed at
  the token level. playLightMode fences it: dark by default (luminance 0.004
  fresh), the footer toggle flips and survives a reload, and 2,776 sampled
  text nodes across ten routes all hold the WCAG floor in light mode;
  LIGHTMODE_CONTROL=nolight strips the light CSS and proves the flip check
  bites. Fold covenant re-proven with the toggle in the chrome.
- WORLD XI REAL POSITIONS, Round 345 (desktop lane, 2026-08-29). The Round 319
  handoff, "a CF with RW history should fit a RW slot", now reads verified data
  instead of a hand rule. The round's real lesson: player_market_values has no
  person identity, so every derivation keyed on the name fakes careers by
  merging humans who share one (two Brazilian Gabriel Pereiras born a year
  apart became a centre-back with wide-right seasons; a "Daniel" played goal
  and attacking midfield at once; even the strictest identity filter kept
  colliding mononyms). The derived view was therefore dropped, not calibrated.
  What ships is curated only: player_verified_positions, the top 150 by value
  researched under the two-source rule with provenance stored per row, 63
  players with real secondary roles (Raphinha RW, Valverde RB, Alexander-Arnold
  CM, Szoboszlai CM and RB), each row carrying the verified human's
  primary_position so a same-named tail player cannot inherit a star's history,
  plus the goalkeeper wall behind it. fitsSlot widens by direct membership
  only, no family chain, so the Round 319 LWB-to-RW hole stays closed.
  simWorldXiPositions fences it live: 63 pooled players carry history, 6 earn
  the strict RW slot through it (Palmer, Güler, Foden), zero defenders cross
  without a verified wide-right season, WXIPOS_CONTROL=nohistory proven red.
- THE MAKER NOTE, Round 346 (desktop lane, 2026-08-29). His welcome idea, built
  the way the home page can carry it: a small dismissible card in his own voice
  (first coding project, independent, constantly improving, sorry for any bugs,
  thanks for visiting, have a blessed day), spelling cleaned, nothing sincere
  dropped. A card and not the popup he pictured, because the fold covenant is
  offers before asks; it sits measured BELOW the first game tile (note y=548,
  tile y=333), contains zero account language, and dismisses once per browser.
  Client rendered only, deliberately outside every crawler-facing file the
  AdSense freeze covers; the permanent /about copy waits for the verdict, noted
  here. playHomeFold section 5 fences all of it: renders fresh, below the tile,
  asks for nothing, gone after dismiss and reload. Full fold harness green.
- THE STALE VALUES SWEEP, Round 344 (desktop lane, 2026-08-29). The Round 315
  follow up, closed in one evening by eight parallel researchers under the
  two-source rule with every database write reviewed and executed by hand. All
  243 stale high-peak names classified: 135 honestly retired (no invented
  current rows, the render paths already say so), 101 verified active, 4 name
  collisions documented (two humans sharing a row name, including the fake
  Fabinho the list itself exposed), 3 unknowns recorded with what was tried.
  98 verified 2026 rows written (club, age, value from Transfermarkt at the
  documented 1.08 EUR to USD landing, sources kept per player in
  scripts/data/staleSweep2026.json), including Caicedo at Chelsea, Zubimendi at
  Arsenal, Szczesny at Barcelona, Casemiro at Inter Miami, and a 46 year old
  Ronaldinho genuinely un-retired at Ravenna (recorded, no value invented). The
  review gates caught the agents nothing: the one systematic near-miss was MY
  peak gate wrongly excluding young risers, fixed with the documented rule.
  simValueFreshness is the fence: the database held to the committed audit
  (actives present at audited values, retired rowless, collisions untouched),
  VALUE_CONTROL=phantom proven red. Stale count 243 to 145, every remaining one
  explained in the audit.
- THE OWNER DIRECTIVES LAND, Round 343 (desktop lane, 2026-08-29).
  docs/OWNER-DIRECTIVES-2026-08.md carries his final directives verbatim with the
  operational mapping: free forever (overrides the spec premium mention), the
  AdSense review freeze, the sponsor architecture arc filed, the high-risk
  approval list confirmed as standing law, and docs/agents/ created as the four
  stable contracts he asked for twice, each deliberately pointing at the board
  as the single live queue so no second status page can rot and contradict it.
- THE REAL EUROPEAN NIGHTS, Round 342 (desktop lane, 2026-08-29). The last Club
  Manager residue from the review: era saves played FOUR Champions League groups
  because the continental pool stopped at sixteen clubs from the two baked
  leagues. The real fields are in now: all 32 group stage clubs for 2005-06,
  2010-11 and 2015-16, researched by parallel agents against Wikipedia read as
  raw wikitext plus RSSSF and ESPN, with independent adversarial re-checks
  finding zero errors in all three (one agent even caught a hallucinated fetch
  naming Valencia and Roma in groups they never played and refuted it against
  RSSSF match records). Baked clubs keep their real rosters; foreign clubs get a
  strength PRIOR derived from their actual finish that season, anchored to the
  era rating scale, so nothing is invented, only calibrated. The full eight
  group draw now builds (proven: the played 2005 save drew 8 groups of 4), and
  fixing that exposed a projection regression the fence caught immediately:
  with eight groups the winners-only branch resurrected Round 312 exact report
  at full size, so a second placed my-club now takes the eighth slot in the
  projection exactly as the real draw gives it. simEraWorldTables section 7
  pins the 32 club shape, the exact finish distribution only a real season has,
  the pinned in-league spelling counts, and the eight group draw, with
  WORLD_CONTROL=field misspelling an entry in memory and proven red. tsc zero,
  build green, simWorld green, all three harness controls red.
- THE INDEXING AUDIT, EXTERNAL HALF, Round 341 (desktop lane, 2026-08-29). His
  Search Console task doc, executed to the line it can be without his login. A
  live probe of every canonical URL: all 131 answer 200 with self canonicals,
  titles, descriptions and real no-JS text; sitemap valid with zero rot; robots
  clean; every variant shape folds correctly (http 301, trailing slash and query
  canonicals, render-time noindex on unknown paths, retired stubs canonicaling
  to successors); the lovable.app mirror cross-domain canonicals to the real
  site on every sampled page. docs/seo/route-inventory.md holds the full table,
  docs/seo/indexing-audit.md holds the classification framework with the honest
  ledger: no technical blocker exists externally, the 80 plus not-indexed are
  expected to classify as legitimate folds plus the crawled-not-indexed quality
  window, and NOTHING is claimed fixed until the real GSC verdicts land. The one
  remaining input is his (extension sign-in or a CSV export, filed above).
- THE TEAM SKILLS, Round 340 (desktop lane, 2026-08-29). Anthony's dev-team doc,
  made real the repo-native way: five project skills in .claude/skills/ that load
  automatically for BOTH lanes and any future session, each one the distilled law
  of ninety rounds rather than generic advice. dukb-data-guardian (two-source
  verification, the smell list, derived-never-typed, fix the system not the
  record), dukb-game-designer (the gate questions that reject duplicates, the
  design contract, the legal lines that kill designs late), dukb-sim-architect
  (deterministic engines decide, fail-closed validators, sealed era snapshots,
  balance measured at scale with margins from measured headroom),
  dukb-qa-hunter (the gates in order, the browser weapons, how to hunt like a
  cheater, harness-drift judgment), dukb-visual-qa (boxes not vibes, the worst
  row rule, the paid-for judgment calls). CLAUDE.md's docs map now lists the
  four new LIVE docs and the skills. Also this push: the stray August 12 brief
  that add -A swept into the 337 commit is untracked and ignored, and the one
  secret it carried was neutralized FIRST, the old account's password rotated
  in the database to a value nobody has seen, so the published string opens
  nothing.
- THE SPEC ERA OPENS, Rounds 337, 338 and 339 (desktop lane, 2026-08-29, one push).
  Round 337: the Master Build Spec (7690 lines) and Anthony's parallel operating
  instructions are committed as docs/MASTER-BUILD-SPEC-2026-08.md and
  docs/PARALLEL-AGENT-OPS.md (with the mapping of its rules onto the running
  system and the one deliberate deviation, claims-first on main instead of
  feature branches, reasons written in the file), and EIGHT parallel agents read
  every spec section against the round history to produce
  docs/SPEC-RECONCILIATION.md: 361 sections classified, 38 done, 187 partial, 96
  new, 32 decided, 10 constrained by standing law. READ IT BEFORE CLAIMING SPEC
  WORK; the spec's P0 list is essentially complete and P1 flagship depth is the
  frontier. Round 338: auditLive's thin page bar re-derived from what it means
  to measure, the shared chrome measured live per run (quantile per word, 1166
  chars) with the bar at chrome times 1.4 set from measured headroom, verified
  against live douknowball.com: 131 of 131 clean, and AUDIT_CONTROL=thin plants
  a chrome-only measurement on a page it first proves passes, proven red. Round
  339: simEraWorldTables section 6 pins every ERA_LEAGUES id to a nation in
  LEAGUE_NATIONS on the real exported values, WORLD_CONTROL=flagless plants a
  nationless era league and goes red, so the next era cannot ship flagless.
  Both builds were made by parallel agents under hard no-assertion-touching
  rules and re-verified by hand.

- THE WIRE ON PHONES, AND FASTER EVERYWHERE, Round 336 (desktop lane, 2026-08-29).
  His pair of reports the same evening: "the ticker is moving really slow", then
  the decisive one, "on the computer its fine but on mobile it isnt moving". The
  mobile freeze was real and total: a touch tap synthesizes mouseenter at the
  finger and never sends the matching mouseleave, so the hover pause parked the
  wire forever after one brush of the strip, on every phone, since the hover pause
  existed. The pause is pointer-gated now: only a real mouse pauses by hovering, a
  finger never does, and the explicit pause button and keyboard focus pause both
  stay. The slow half was design, not defect, measured live at exactly the Round
  317 speed: 60 px/s is nearly a minute per pass on a 3000px slate, so the crawl
  is doubled to 110 with the reading hold trimmed to 1500ms. playLiveTicker grew
  section 9, a real touch context tapping the strip's one non-link element and
  MEASURING the wire still moving, with a genuine mouse hover parking it as proof
  the detector reads both states; sections 7 and 8 were re-derived for the
  doubled speed (overflow-gated waits, a wrap-aware sampled motion read, both of
  which the faster wire exposed as start-to-end reading artifacts). Full
  playLiveTicker green with the dim control firing, simTicker and simPrerender
  green, tsc zero, build green. ALSO SETTLED, same evening: his "this is out
  dated" screenshot of the old March social banner in Google Images is Google's
  5 month old cache, not the site; every live page serves the current generated
  og-image (byte-compared live against the repo) and nothing shipped references
  the old banner, so it corrects itself on Google's recrawl schedule and Bing's
  was already pinged today.
- THE FULL SUITE RUNS HERE, Round 334 (desktop lane, 2026-08-29). The portability
  sweep, done in one pass instead of a week: a mechanical porter applied the Round
  312 pattern (os.tmpdir, forward slashed ROOT interpolation, quoted esbuild,
  pathToFileURL imports) to all 99 remaining harnesses in seconds, four straggler
  shapes were hand fixed, every file syntax checked and import audited, and then
  SIX parallel agents ran the whole 121 harness node suite and read every output,
  under hard rules that they could fix path mechanics only and never touch an
  assertion. Result: 117 green as ported, 4 more green after documented one line
  path fixes (including simInventedNames, whose Windows backslash paths had been
  silently emptying the name bank registration check on this machine), and ONE
  genuine red that predates the port: simSilverwareSort has demanded team floors
  for brownlow and dallym since Round 291 added them and nobody ran it; measured
  live at 91 and 34 medallists (exactly Round 291's verified totals) and floored
  at half per the harness's own convention, now green. The three longest sims
  (opposition 14 min, press 9, invented quotes 16) ran solo and green. runAllSims
  itself proven on Windows. The mobile pass also CLOSED this round: the full 390
  playGames walk finished at 128 games, ZERO findings, 8 documented
  harness-limit skips, and the 15 built-site fences re-ran green on a fresh
  build made with the outDir-aware plugin. tsc zero.
- THE REBUILD CORE LOOP, Round 333 (cloud lane, 2026-08-29). Phase two of his
  redesign, the owner's spec executed whole: spin for a position in a hidden
  seeded order, keep or sell the drawn man (selling final), three priced
  replacements from three value bands plus free bench promotion, restriction
  presets locked at club pick, a 60M overdraft with random forced sales when the
  window ends in debt, and a five card punishment deck (one safe, drawn without
  replacement) replacing the flat best-player forfeit. Wars, finance events,
  fortune cards, rivals and the season sim all ride on the new loop. The round's
  harness caught the engine's Lehmer streams opening identically for neighboring
  seeds (fixed with seed warmup), and the browser playthrough caught a genuine
  deadlock (deep overdraft, nothing affordable, no bench fit), closed with the
  leave-the-shirt-empty resort that prices the hole at 40 immediately.
  simRebuildLoop fences it with measured floors and a proven dupslot control;
  a mocked-REST Chromium playthrough played the full eleven to the season table.
  Phase three (real manager hires) stays desktop gated above.
- THE TICKER WATCHDOG, Round 332 (desktop lane, 2026-08-29). The alert the August
  suspension deserved: scores-poll v7 judges YESTERDAY in New York on every
  ordinary today run, and a fully past day over which every feed wrote zero rows,
  or no runs at all (the cron itself dead), files one question_reports row on the
  shelf the admin screen already reads, never repeated for the same day. Proven
  live by drill, not by reading: watchdog_date=2026-08-28 answered dead false
  over 390 runs and 155 rows, watchdog_date=2020-01-01 fired and filed (marked
  test:true so a drill can never read as a real outage), the same drill again
  answered alreadyReported without a second row, the test row was deleted, and a
  real poll then wrote 54 rows with the watchdog riding along judging yesterday
  healthy. The drills ran through pg_net with the secret pulled inline from
  private.app_secrets, so it never left the database. Repo copy synced from
  deployed v7; simLiveScores and simValidatorsFailClosed green. Also this
  session: Round 330 published and VERIFIED live (the wrap row present, the name
  whole at 320 on douknowball.com) after two stale deploys exposed the sync
  trap now recorded in SHIP-PIPELINE.md: check get_project's latest_commit_sha
  against origin/main, read_file is not a sync check.
- THE REBUILD COPY PASS, Round 331 (cloud lane, 2026-08-29). His quoted offenders
  rewritten in place, the "+N rating" labels replaced with words, mechanics and the
  stored save id untouched, the guide aligned. The hairdryer lives in Club Manager
  as real football vocabulary and was deliberately kept there. The redesign's
  remaining phases are filed above as claimable items.
- THE MOBILE DEPTH LAYER, FIRST FINDINGS, Round 330 (desktop lane, 2026-08-29). The
  hand check pass at 320 and 390 over the heavy screens and the three new games (all
  clean, screenshots eyeballed) caught one real product bug: the Soccer Career
  identity row crushed the player's own name to a single letter at 320, Round 257's
  "Can't even see my name" back at a narrower width, fixed by wrapping the identity
  onto its own line below 480 and fenced in simMobileChrome with a
  SIM_MOBILE_CONTROL=nowrap control proven red. The bigger find was that
  playClubManager, the harness that exists because the generic walk cannot reach a
  match, had been silently dead since Round 303: the dugout step's Take the job
  button submits an empty manager form, the real-name gate refuses, and the driver
  parked at the picker every run since, reporting BLOCKED into a void. It now waits
  for each picker step's own content, presses the pinned confirm bar, skips the
  dugout form, and played a FULL season at 390 through the phone interface: 45 half
  times, 47 full times, 45 subs, 20 shape changes, 11 windows, zero findings.
  playGames and playClubManager both take WIDTH/HEIGHT for phone-width runs and
  playGames takes FROM= to resume an interrupted walk; the snapshot-inlining vite
  plugin honors the resolved outDir so a side build can verify a fix while a long
  run owns dist. The full 390 walk was launched and runs on; its findings become the
  next rounds.
- THE STOCK MARKET REBUILD, Round 329 (cloud lane, 2026-08-29). His anonymous
  format executed whole: six seasons back, 200M, position by position on stats
  alone, the reveal at the end. Lock proof wallet (punt ceiling plus a reserve
  rule), pure engine over injected rows, and simStockCampaign fences the assembly
  law, the lock proof, determinism, the scoring identities and the anonymity of
  the buying screen with its leaky control proven to catch a planted name.
- GAUNTLET DRAFT, Round 328 (cloud lane, 2026-08-29). The draft mode, completing all
  three new game requests: five card picks per slot in our own card frames, a
  deterministic five round knockout, daily and unlimited. The harness caught the
  first ladder making the trophy a 3 percent lottery even for perfect drafts;
  retuned against measured draft distributions to about one in eight, zero for
  bargain XIs. simGauntletDraft with its flatdeal control fences it.
- THE AUCTION REBUILD, Round 327 (cloud lane, 2026-08-29). Sign the Player runs the
  owner's room now: random position order in two passes, list price openings with
  the rival maths preserved to the digit, live wars, a decay phase with a snap
  button replacing forced sales, positions-only running order, the best player
  headlining the close, end of auction fill before the showdown. simAuctionRoom
  fences the lot with 200 seeded orders and a proven control; it also proved the
  decay's 5M clamp guards a genuine rounding fixpoint.
- THE FANTASY DRAFT REWORK, Round 326 (cloud lane, 2026-08-29). His "too much
  scrolling, unclear goal" both fixed: the pool is a best available shortlist
  (top ten by rating, search reaches everyone), and the draft settles the moment
  it completes through the shared season engine, verdict card, honest score, goal
  stated upfront. Stories, analysis and the vote kept as flavor. simDraftShowdown
  is the fence with its flatmap control.
- SEARCH AND DISCARD, Round 325 (cloud lane, 2026-08-29). The squad duel to his
  spec: search three, keep one into the shared 4-3-3, bin two from the whole game,
  CPU or pass and play, settled by one deterministic 38 game season with derbies.
  simSearchDiscard caught 32 duplicate names in the baked pool (the same man could
  land in both squads), a settle curve too soft to reward drafting, and two of its
  own invented measurement claims, all fixed with measured floors. Online rooms
  stay out of scope per the review's backend note. The draft mode game is the last
  of the three new game requests still in the Inbox.
- THE SEO KEYWORD PASS, Round 324 (cloud lane, 2026-08-29). The head terms worked
  through the home title (both pinned copies), both home descriptions, the og and
  twitter cards, the home static block and all six hub descriptions, each claim
  describing games that really exist. The meta keywords tag stayed dead on purpose.
  Watch Search Console over the coming weeks for the 88-not-indexed movement.
- SPORTS BINGO, Round 323 (cloud lane, 2026-08-29). His pack opening bingo, built to
  the spec: 24 real conditions plus a free centre, ten packs of five verified players
  on a fifteen second window, manual marking, shared daily card, unlimited, three CPU
  tempers on the identical deal. simSportsBingo (with its impossible control) caught an
  incompletable card and a flattened CPU curve pre launch; a Chromium playthrough
  proved the loop. Sitemap 129, floor ratcheted, What's New entry. Multiplayer rooms
  deliberately out of scope (the review's own backend note). Search and Discard and
  the draft mode remain in the Inbox.
- REACT-ROUTER V7, Round 322 (cloud lane, 2026-08-29). The queued breaking major,
  mechanical because the app never used the data router APIs: 6.30 to 7.18.3, zero
  code changes, tsc zero first try. Proven in a browser: five direct game loads, all
  four legacy redirects, playHowTo's 113 route walk, full board green. Trap recorded
  in the state doc: plain npm install prunes the no-save playwright package.
- THE HOW-TO-PLAY AUDIT, Round 321 (cloud lane, 2026-08-29). GameShell mounts a
  standard reopenable "?" (GameHelp) fed by each game's own guide content on all 69
  shell games; 24 pages with their own rules control opted out so nothing doubles.
  playHowTo is the fence: every registry route loaded in a real browser on a 390
  phone, database aborted, must show a rules affordance a visitor can see. 113 of
  113 green, blind control flags all 113. The stricter "reopenable mid game
  everywhere" tightening is queued above.
- THE MOBILE PASS, FIRST WAVE, Round 320 (desktop lane, 2026-08-29). The measured
  baseline for his "make sure everything translates smoothly": every one of the 140
  routes now fits a 320 and a 390 phone with nothing hanging off the side, proven by
  sweepGames, and the one real offender was the site Header, where Round 286's logo
  mark added 36px to a row Round 117 had fitted to 320 exactly, so Sign Up hung 37px
  off the right edge on all eight Header routes, the home page included. Worse
  underneath: a guest WITH a streak gets the flame and its count in that row, every
  sweep on the site runs streakless, and the streaked row never fit at 390 at all.
  The fix is two layers: structurally the wordmark can now truncate so nothing in
  that row can ever push past the screen edge again, and cosmetically the row steps
  down below 480 and again below 360 so the full wordmark actually shows everywhere,
  measured with a three digit streak at 320. playIphone grew section 4, the
  streaked-guest header at both widths with HEADER_CONTROL=wide proven red. Three
  harnesses were also brought back to the truth: simMobileChrome's planted state
  still used the pre-301 completions payload so its games chip read 0 and the bar
  was never measured at its widest (now 106/113 renders and everything is still
  green), playHomeFold was asserting Round 287's ticker label and Round 293's
  dailies checklist, both long gone (the checklist deliberately, Round 297, his
  instruction, so the harness now asserts it STAYS retired), and simBrand now finds
  Windows python through the py launcher instead of the Store stubs. simMobileChrome
  and sweepGames ported to Windows. tsc zero, build green, all 15 built-site fences
  green, tablet and desktop swept clean too.
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
