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
  and the other lane takes NNN+1. NEXT FREE NUMBER: 350.

**THE FREEZE IS NARROWED (2026-08-29 evening, owner's operating contract,
recorded verbatim in docs/OPERATING-CONTRACT-2026-08.md). The contract
explicitly defers AdSense ("at current traffic this earns very little") and
ORDERS new production routes: NFL grid work, grid archive and answer pages.
That supersedes directive 3's blanket route freeze. Still verified-fix-only:
ads.txt, the verification code, robots.txt, and existing pages' canonicals.
New real-value routes and their sitemap rows are permitted again.
CONSEQUENCES: the NBA Stat Line branch (below) is UNBLOCKED and can merge as
the next cloud round; the grid archive system is UNBLOCKED and claimable.
Ground truth is now Google Search Console, not Semrush: 1,800 clicks per 28
days, mobile 42 percent of clicks, a third branded, /football-grid at position
21 for "nfl grid" (49,500 monthly volume) with NFL season starting in
September. Milestone 0 is the grid category; D157/D158/D159 wait.**

## Inbox (unclaimed)

**MILESTONE 0, own the grid category (Anthony, 2026-08-29 evening, from a pasted
outside SEO brief; the desktop lane ran the audit the same evening, findings in
the chat and summarized here). The brief's premise needs one correction on the
record: Semrush's 146 monthly visits measure ORGANIC SEARCH arrivals only, and
within that slice CFB grid terms lead; the site's total traffic is far larger
and Lovable analytics has soccer-career at roughly 1 in 5 of ALL pageviews. Both
facts are true at once. Grid search is the site's search beachhead, not its
whole audience.**

- BOOT SWAP CLS, the architectural remainder (found in Round 348, unclaimed and
  needs design thought, not a quick round): on slow connections the prerendered
  snapshot shows first and the booted React app then redraws the whole page,
  which registers as a large layout shift (measured locally at 200KB/s and
  150ms RTT: 0.53 to 0.69 on grid pages AFTER Round 348 removed the board-swap
  component; before it, 0.74 to 0.95). Font swap contributes a smaller early
  shift. Any fix touches the snapshot architecture or index.html (frozen during
  the AdSense review), so this waits for deliberate design plus the verdict.
  The Round 348 harness pins the part the app controls at 0.05.
- GRID ARCHIVE AND ANSWER PAGES (UNBLOCKED by the 2026-08-29 operating
  contract, its Task 3, unclaimed): past grids with answers, rarity scores and
  a replay button, one shared system across all six grid sports. Real search
  intent, real user value, and the contract's explicit carve-out says the
  thin-page rule must not be used to refuse it. Design first (the shared
  route shape, what data each grid can honestly show, replay mechanics), show
  the design before building, then one round for the system and the first
  sport, then one per sport.
- SPEC SPLIT INTO /docs/spec/ (queued, either lane, docs only): the operating
  contract wants the master spec split into per-part files with an index at
  docs/spec/README.md so sessions load only the relevant section. Mechanical,
  one round, no gates beyond the build staying green.
- CLAIMED Round 349 (desktop, 2026-08-29): the operating contract lands in the
  repo, the freeze reconciliation above, and the NFL grid says its own name
  (H1 "PRO FOOTBALL GRID" and the registry label "Pro Football Grid" align to
  the "NFL Grid" the page's own title already targets, snapshots regenerated).
  Contract Task 4 for the money page, smallest honest cut.
- GRID ENGINE TO NEW SPORTS (unclaimed): the engine family already spans soccer,
  NFL, CFB, NBA, MLB, NHL. Candidates with search demand: CBB grid, WNBA grid.
  Data-first rounds, two-source rule as always.

**ANTHONY'S 2026-08-29 IDEAS LIST (desktop chat, evening), his order, split into
workable pieces. Bugs still outrank these; within the list his order rules.**

- NBA Stat Line: a target stat line (23 points, 6 rebounds, 9 assists, 2 steals, 3
  blocks, optionally shooting splits), pick five player SEASONS whose combined
  per-game stats hit it, scored by similarity. A second mode deals a single real GAME
  line and you name the player and the night.
  **SEASON MODE IS BUILT AND HELD, NOT MERGED (cloud, 2026-08-29).** It sits
  complete on branch `worktree-agent-a8e555b59a5814836` (lib, hook, page,
  registry, guide copy, simNbaStatLine with a proven avgsplit control; tsc
  zero, harness green, simNoRivalNames clean, reviewed line by line against
  the recon traps below). It is NOT merged because it adds a production
  route and a sitemap URL, and owner directive 3 freezes both until the
  AdSense verdict. It takes the next free round number and ships the day the
  verdict lands, or sooner if Anthony says the freeze does not cover a new
  game page. Nothing else blocks it.
  RECON (cloud, 2026-08-29): the season mode is buildable now on
  bref_nba_player_seasons (30,462 rows: pts, trb, ast, stl, blk plus real shooting
  splits). Traps the recon pinned: games is NULL on every season row so true
  per-game rates are impossible, use per-36 like Perfect Season NBA and Stat
  Detective already do; stl and blk are null before 1973-74 (gate the pool when
  the target includes them); recompute combined percentages from summed makes and
  attempts, never average the percents; exclude the 2TM to 5TM combined rows;
  nba_player_team_seasons is DELIBERATELY EMPTY, do not build on it. The GAME
  line mode is DESKTOP GATED outright: no box-score table exists for any sport,
  it needs an external pull. File plan sits in the Round 335 session record
  (lib, hook, page, registry under Pro Basketball, simNbaStatLine with a
  distinct-targets-over-a-year assertion, the Round 212 lesson).
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
- LIGHT MODE (Anthony, 2026-08-29 late: "since its basically in dark mode already I
  would love for there to be a light mode and people can choose"). A real theme
  system: the palette is dark-only today, so this needs a light token set on the
  CSS variables, a toggle in the header persisted per browser, prefers-color-scheme
  as the default, and a legibility pass over the games (the sweeps at 320/390 run
  in both themes when this lands). Sizeable, its own round or two.

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

**FOR THE DESKTOP LANE, A BOARD FACT WORTH ONE DECISION, AND IT IS NOW A
CATEGORY RATHER THAN A ONE OFF: two harnesses read the live database, and the
cloud sandbox's egress proxy answers that host with a 403, "Host not in
allowlist". `simValueFreshness` (Round 344) and `simWorldXiPositions` (Round
345) therefore cannot run in the cloud lane AT ALL, and every cloud board from
here reports two reds that mean "not runnable here", not "broken". Both fail
closed with a clear sentence, which is right, and neither should ever be made
to pass on a run that reached no database. But the count grows with every
data-backed fence the desktop lane adds, and a board whose red is permanent
stops being read, which is the actual risk.
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
