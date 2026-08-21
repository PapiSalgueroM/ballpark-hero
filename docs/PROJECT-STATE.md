# Project state

## Owner feedback, 2026-08-19 afternoon (one screenshot, Soccer Career national team)

Two asks plus the standing "keep going":

- **DONE, Round 197: "I do not like this score thing. When I think of the squad like I
  imagine u can see the starting eleven and if u can show that it would be nice. Like the
  actual starting eleven."** The screenshot is Soccer Career's THE SQUAD card for Argentina:
  it currently renders "Your rank 1 / Places 6 / Your score 102" plus "Named as a captain.
  The last man in scored 82." He wants the actual starting XI: names, positions, the shape,
  with HIM in it. The engine already computes a selection score per man to decide his rank,
  so the eleven exists implicitly; the round is to derive it honestly, name the other ten
  (generated internationals, never invented real players in a real shirt), and lay them out
  as a team sheet instead of a leaderboard readout. Keep a small honest line about where he
  sits, drop the raw score column.
- **DONE, Round 198: "Make sure every page is good to be indexed."** An indexing pass across every route:
  canonical, title/description presence and length, no accidental noindex, sitemap coverage
  matching the live route list, structured data valid. simSitemap and the Round 170 route
  sweep are the starting points; this wants a real per-route audit harness.
- **"U have full control so y are u asking for permission so often."** Standing instruction:
  do not ask, ship. Only stop for something genuinely destructive or a real data fork.

## Owner feedback, fourth message 2026-08-18 morning (nine screenshots)

Three things in one message, mid session:

- **The idle game, DONE in Round 162.** His words: "work on that idle game. A full game like a
  massive idle game, a ton better" (naming two famous browser clickers as the bar to clear:
  keep those names out of src, the spirit is scale and depth). Shipped: ten named divisions
  climbed by home wins (exact income multipliers up to x5.5, promotion bonuses, tougher
  opposition per stage, ladder resets on prestige but best division is recorded forever), an
  eight tier staff payroll (Turnstile Steward to Club Legend Ambassador, flat income per level
  before the multipliers), the golden whistle (drifts in about every 150s of real play, 12s to
  catch, five weighted prizes: DERBY DAY x7 for 77s, CROWD SURGE taps x25 for 30s, TV WINDFALL
  15 minutes of income instantly, WONDERGOAL +12 percent fans, SPONSOR GIFT a free level; no
  stacking, excluded from away pay, clock burns in play time only), and 47 badges at a
  permanent +2 percent each, riding through every prestige. Two drawers (Badges, Club records),
  the income line names every live multiplier, help modal and SEO copy rewritten truthful.
  simStadiumTycoon grew sections 9-12 (division/promotion/staff/whistle/badge math pinned to
  exact formulas, saves tamper-proofed) and the old bands were re-measured on the new economy
  (30 min growth about 530x, first prestige minute 14, worst post-star wait 203s). Browser
  probe: 19/19 including catching a forced whistle and seeing the DERBY DAY chip.
- **Five more match-app screenshots, MOSTLY DONE in Round 169.** Shipped: assists credited by
  name on the report and in the timeline (captured at the same moment the season assist is
  paid, so the two can never disagree), sub arrows (▲ on ▼ off) on the sub chips, stoppage
  time per half on the clock rows and the header (+2' & +5' style, bands 1-4 and 2-6), a
  venue and crowd line (the sim's own attendance banded by the HOST club's stature; a custom
  club's chosen ground shows its real capacity and the crowd fits it; real grounds get NO
  invented capacity or stadium name, per the data rules; neutral finals get a big-final
  band), and the momentum strip redrawn as a continuous two-tone area chart ("Balance of
  play") from the same nine buckets. simMatchDetail grew section 5 (39 assists verified
  teammate-true across 25 matches, timeline carries the exact credited assist, stoppage in
  band on both clock rows, crowds in band, custom 28k ground fits three home crowds, no
  capacity ever claimed for a real ground). playClubManager updated for the renamed strip.
  Browser probed 7 for 7. **The two leftovers landed in Round 178:** the opposition ratings
  model (their XI built from the opponent's own era-aware projected roster, scorers guaranteed
  on the pitch, ratings from the same base-plus-goals shape my players use, keeper floored by
  the clean sheet and lifted by saves faced, generated players wearing the MADE UP tag, and
  the sheet only shipping when the world can field a real named eleven, so a youth-padded thin
  club gets no invented sheet, harness-pinned both directions) and possession plus shots
  riding directly on the Balance of play chart. The report now shows top rated BOTH sides with
  the full opposition sheet under the ratings toggle, and oppBest is derived from the top of
  the sheet when one exists. simMatchDetail grew section 6 (12 league sheets checked, XIs of
  eleven with a keeper, sorted, scorers all present with goals reconciled, clean-sheet keepers
  floored right, and the Lustenau thin-world control proving absence where honesty demands
  it). That closes his five match-app screenshots completely.
- **Three Search Console shots** (88 not indexed vs 41 indexed and climbing; a "Page with
  redirect" validation started 8/12 and FAILED 8/15 on 3 pages). Read: the 3 failures are the
  301 redirects working exactly as designed (a redirecting URL can never validate as indexed,
  and should not), the sitemap has been clean since Round 148, and the indexed count is the
  number that matters and it is rising. No code change needed; tell him not to sweat that
  validation email.

## Owner instruction, same morning: "add eras to nfl and nba and eveyr sport"

A separate line in the same burst of messages. Status by sport:

- **NFL and NBA, DONE in Round 172.** Both create screens grew an era picker on the Club
  Manager pattern: the default is today, the throwback is a sealed old league. NFL: the 2005
  season, all 32 franchises as they stood (the Raiders in Oakland, the Chargers in San Diego,
  the Rams in St. Louis, Washington listed by city alone because the 2005 nickname is retired
  and stays off this site), verified against the 2005 season records on Wikipedia and Pro
  Football Reference. NBA: the 29 team league of 2003-04 (the SuperSonics in Seattle, the Nets
  in New Jersey, the Hornets in New Orleans, no Charlotte yet, no Oklahoma City or Brooklyn),
  verified against the 2003-04 season pages on Wikipedia and Basketball Reference. An era
  career starts in the era year and NEVER leaves its world: the draft, free agency moves,
  trades, the life sim's rival team draws and the NFL corruption arc all read the era pool.
  Era contracts pay era money (scales 0.32 and 0.31, derived from the verified caps, documented
  in code comments only, never on screen). Era-only abbreviations are globally unique so every
  label resolves without knowing the era. `simSportEras.mjs` is the 54th harness: both lists
  verified in both directions, 40 era drafts per sport all landing on era franchises with the
  era-only ones actually drawn, 20 season careers never leaving the era, the modern game
  provably untouched, and star money at the documented scale. Browser probed 17 for 17.
- **NHL and MLB, DONE in Round 173. All four sports now have era starts.** Same recipe as 172.
  NHL: the 30 team league of 2006-07 (the Thrashers in Atlanta, the Coyotes in Phoenix, no
  Vegas, Seattle, Winnipeg or Utah), verified against the 2006-07 season pages on Wikipedia
  and Hockey Reference; 2006-07 was picked over 2005-06 deliberately because Anaheim had
  already renamed to plain Ducks by then, so no franchise needs a name this site would rather
  not print. MLB: the 2004 league (the Expos' last Montreal summer, the Anaheim Angels, the
  Florida Marlins, the Tampa Bay Devil Rays, the Oakland Athletics, Cleveland under its 2004
  name which the record books still print, reasoning documented in the code comment), verified
  against Wikipedia and Baseball Reference. Era money: NHL at 0.42 (the 44 million cap of
  2006-07 against the announced 104 for 2026-27), MLB at 0.43 (average salary 2.31 million by
  the players association's table against the AP study's 5.34 for 2026), documented in code
  comments only. Era-aware team draws end to end including both life sims' rival club draws;
  the one legal non-franchise stop is the Japan offer's Yomiuri Giants, a real 2004 club,
  exempted in the harness with a comment. simSportEras now runs 9 sections over all four
  sports. Browser probed 24 for 24. **Round 174 finished the words:** all four games' SEO copy
  (the gameContent entries and the on-page GameSeoContent blocks) now teaches the era pickers
  with the verified franchise facts, plus a "Can I start in a different era?" FAQ per sport.
  That round also swept out stale copy the pass surfaced: the NFL page still said 3 positions
  (it has 8 since Round 56), the NBA page said G/F/C (it has 5), and the hockey and baseball
  gameContent howToPlay lists each carried a leftover duplicate create step from the 3-position
  era. Probed 14 for 14 on the built site including the stale strings being gone.

## Owner feedback, third review 2026-08-18 (his biggest list yet, with screenshots)

He sent a long review overnight with four screenshots: a matchday app's pre and post match
screens (his model for what a match should show), a phone month calendar (his model for the
season calendar), his Club Manager header reading "Points: 0, Rank: -" while he was mid save,
and a Soccer Career creation roll where a 99 potential showed "89 ceiling". Worked as a queue,
top items first. Marks: DONE means shipped and verified, NEXT means the very next rounds.

**Club Manager (he said "first up is club manager"):**

- CM-1 **DONE, Round 157: Quick Sim and the Match Centre.** One tap gives the full result:
  scorers, cards and injuries with minutes, possession, shots, on target, expected goals read
  off the same lambdas the goals were drawn from, corners, fouls, momentum by ten minute
  bucket, player of the match and a full ratings list. The Match Centre before kick off shows
  both clubs' REAL last-5 form (tracked for every club whose results this save simulated),
  your own head to head (kept across seasons now), the engine's own win odds (labelled engine
  odds, never a fake fan vote), danger men both sides, and the team talk, which he did not
  want forced on him, so it moved off the hub into the centre and is optional. Playing a match
  also records a completion now, so the site header counts a mid season session (his
  screenshot showed 0/107 after six rounds of football). And scorer minutes now respect the
  halftime scoreboard (first half goals get minutes 1-45), which they quietly did not since
  Round 119. `simMatchDetail.mjs` guards all of it (45 harnesses now).
- CM-2 **DONE, Round 158: the Live Sim.** His words: "u see the little circles moving about".
  Watch Live on the hub and in the Match Centre: a 2D pitch, my real XI as dots in my real
  formation (names under the circles), the opposition mirrored, a ball that moves with the
  balance of play, goals, cards, injuries and subs landing at their true minutes with
  banners, speed control (0.5x to 4x), pause, skip, a stamina drawer, xG line after the
  break, and the REAL dressing room embedded at the interval (subs, shape and the talk all
  change the second half, because it is the Round 119 halftime screen inside the viewer).
  It is a replay of the match the engine decided, never a second simulation: kick off now
  commits the first half's scorers onto LiveMatch (engine work) and the full time report
  reuses those exact lines, with season stats credited once at the whistle. simLiveSim.mjs
  pins the reuse verbatim and the exactly-once crediting; the browser walk watches a match
  end to end (viewer, 4x, skip, dressing room, second half, full report). STILL OPEN for a
  later pass: throw in and corner set piece scenes, live shot counters (needs the engine to
  pre-commit a full-match event timeline at kick off), and a penalty shootout scene.
- CM-3 **DONE, Round 158 (same round as CM-2): the real calendar.** Like the phone month
  grid he sent: a month view with fixtures on their dates (league Saturdays, cups and
  Europe midweek, exactly like a real season), played matches wearing their W/D/L, a drawn
  training cone on training days, the January window and its deadline marked, season start
  and end shown, a training policy picker (Rest first / Balanced / Full training, driving
  the real training intensity), and fast forward that goes next match, about a month, to
  the window, or the rest of the season (still stopping at the window and season review).
  Dates are derived deterministically from the save's own clock with hand-rolled Gregorian
  helpers, no Date object. simCalendar.mjs pins the date maths against known anchors, and
  its FIRST run caught a real bug: one Saturday per entry stretched a 52 entry season to
  July 31, which is why cups went midweek. The browser walk opens the calendar and checks
  grid, cones, policy and the long fast forward.
- CM-4 **DONE, Round 160: create-a-club depth.** A squad quality slider (55 to 88 average:
  88 hands you starters in the low 90s, decoupled from the money, and the create form's
  live board line moves as you drag), a football identity picked at the founding
  (Gegenpress, Tiki-taka, Park the bus, Counter attack, Balanced: sets day-one formation
  and mentality, changeable any week, deliberately NO hidden strength modifier), and the
  ground's size (9k, 28k, 62k, shown on the hub, ready for the finance layer). Boards read
  the squad, so a slider superteam in the Eredivisie is told to win it and a 55 squad in
  the Premier League is told to stay up. simCreateClub grew section 8 (slider reach, cap at
  93, honest demands both directions, identity applied, capacity persisted, determinism,
  legacy anchor intact), and its first run caught a LATENT Round 154 bug: boardWantLabel
  read leagueOf, whose fallback is the Premier League, so a tier-one custom club in any
  other league was told to win the wrong country's title. Fixed at the source (the label
  reads the registered spec like careerLeagueOf does) and pinned. Browser-checked end to
  end: form sections render, slider flips the live demand, founding lands on the hub with
  the capacity chip.
- CM-5 **LEGENDS HALF DONE, Round 166.** His words: "ur undermining the fact that these are
  legends of the game and way better than anyone in the current generation." Fixed with an
  era rating uplift applied at LOAD (the AUTO-GENERATED bake file stays byte for byte the
  real data): above a pivot of 80 the top of the era stretches by 0.7 per point, so prime
  Messi and prime Ronaldo sit at 97 against the modern best of 94, the 88 class (Xavi,
  Iniesta) lands 94-96, and the 732 sub-pivot players are untouched. Monotone, so no two
  players ever swap order; values untouched (2010 money stays real); the modern world
  provably does not wear it. Stature stayed calibrated: era tiers, budgets and expectations
  deliberately read the RAW bake (eraRostersRaw) so no mid table club got refiled by the
  stretched scale, and the ageing ceiling now follows the anchor (max(94, anchor+4)) so a
  97 legend does not snap to the old 94 cap at the first summer, with modern ageing byte
  for byte unchanged. simEra2010 section 1 asserts identity THROUGH the uplift, and its new
  section 6 pins all of it; section 4's balance IMPROVED (Barcelona finishes 2,2,1,1,1,1).
  Browser probed: Messi reads 97 on the squad screen of a real 2010 save.
  **2015 DONE, Round 175: the Leicester season.** The era picker's third tile is 2015-16,
  built by the same recipe as 2010 (scripts/bakeEra2015.mjs): 767 real year-2015 players
  across all 40 clubs of that Premier League and La Liga, two-source verified memberships,
  and 56 verified summer 2015 window corrections (25 in-world moves like Sterling to City
  and Pedro to Chelsea, 17 departures like Di Maria and Xavi, 14 arrivals like De Bruyne,
  Kante, Son, Firmino and Payet, every one checked against the table's own year-2016 rows).
  Two data honesty calls documented in the bake header: Wes Morgan has NO year-2015 row at
  all so the champions' captain is absent rather than invented, and two first-choice
  keepers' rows sit under U21 club variants (Schmeichel, Mannone), folded in with the
  variant mapped and the reasoning written down. Era uplift pivot 80 gain 0.6, measured off
  the bake: raw Messi and Ronaldo 91 lift to 98 above the modern best of 94, pre-title
  Vardy (74), Mahrez (78) and Kante (76) sit below the pivot untouched, which IS the story.
  simEra2015 is the 55th harness (six sections, including the first cross-past check: 226
  names shared between 2010 and 2015 all age about five years, with verified namesakes
  allowlisted) and playEra2015 walks the UI branch (23 checks, both nations, the thin
  Las Palmas marker, August Leicester NOT told to win, Vardy and Schmeichel in the squad).
  **2005 DONE, Round 176: CM-5 is COMPLETE as far as the data honestly reaches.** The fourth
  era tile is 2005-06 (Ronaldinho's Ballon d'Or, Mourinho's back to back Chelsea, a 17 year
  old Messi at 73 rated honestly): 747 real year-2005 players, both memberships verified
  against Wikipedia plus worldfootball plus RSSSF, 26 window corrections all two-way verified
  against year-2006 rows (Owen to Newcastle, Ramos and Baptista to Madrid, Villa to Valencia,
  the Liverpool rebuild of Reina, Sissoko, Crouch and Morientes, Essien and SWP to Chelsea,
  Park to United, van Bommel to Barcelona, Vieira and Figo out, and Newcastle's outgoing side
  of the Owen summer: Bellamy, Jenas, Kluivert). Era vocabulary is period-correct: EURO_SLOTS
  grew a uelName field, so 2005 boards demand the UEFA CUP and provably never say Europa or
  Conference League. Uplift at the steepest measured gain (pivot 80, 1.67): raw Ronaldinho
  and Henry 86 lift to 96 over the modern best of 94, and the gain-per-era comment documents
  the pattern (0.6 / 0.7 / 1.67 tracking how far each era's money sits below 2026). Cadiz
  (ONE real 2005 row) and Alaves (seven) ship as declared partial squads. simEra2005 is the
  56th harness (the four-world isolation matrix: 2005 names checked against 2026, 2015 AND
  2010 with per-pair verified namesake allowlists) and playEra2005 walks the UI (25 checks
  including the UEFA Cup vocabulary read off the actual club tiles). 2005-06 is the floor:
  the table bottoms at 2004 and the two-way verification needs the year after, so there is
  no honest 2000 era and the picker footnote says so.
  MORE ERA LEAGUES DONE, Round 191: the 2015-16 Serie A joined the Leicester era by the
  same recipe (membership two-source verified, fresh base-table dump, every window
  correction checked against year-2016 rows, Frosinone the one declared-thin squad). The
  era runs three leagues and 1,098 players now. CM-5 IS FULLY CLOSED: further era leagues
  only if he asks (the recipe is proven; 2010/2005 Serie A or Bundesliga would need their
  own density measurements first).
- CM-6 **WAVE 3 FIRST PAIR DONE, Round 177: Austria and Greece.** Two leagues from the
  measured wave-3 list: the Austrian Bundesliga (12 clubs, membership verified against
  worldfootball's live table plus Soccerway) and the Super League Greece (14, verified against
  Soccerway plus the season records; Iraklis and Kalamata up, AEL and Panserraikos down). 105
  players appended to the bake by the standing curve; Salzburg and Olympiacos simply gained
  home leagues (they were already baked as UCL flavor clubs). The Ozcan check earned its keep
  at scale: 16 players moved because their 2026 rows superseded stale bakes at old clubs
  (Jovic and Marin to AEK, Dessers, Calabria, Zaroury and Kyriakopoulos to Panathinaikos,
  Ivanusec, Taylor, Kenny and Bianco to PAOK, all real summer 2026 moves) and 17 stale wave-3
  rows were dropped the same way. World now 296 clubs, 17 leagues, 3,456 players; copy updated
  everywhere it counts things; simEras' year-zero strength anchor re-measured (74.1 was the
  272-club world, the padded tails settle it at 71.6, comment documents it). Five verified
  members with zero dataset rows ship as declared youth-padded squads (Lustenau, Iraklis,
  Kalamata, Kifisia, Volos), the Championship's own honesty rule. Browser probed 16 for 16:
  both nations, both leagues, dense and thin clubs pickable, partial markers, Salzburg and
  Olympiacos told to win it, careers started in both. **Czechia is deliberately parked:** the
  2026-27 Chance Liga membership is genuinely unsettled in the sources (Karvina's match-fixing
  relegation, appeal dropped July 6, replacement invitations still unresolved in anything
  citable), and we do not bake a league whose lineup we cannot verify.
  **WAVE 3 SECOND PAIR DONE, Round 185: Denmark and Switzerland,** by the same recipe (two
  agreeing sources per membership, the standing curve, the Özcan supersession pass, KNOWN_EMPTY
  for the zero-row squads).
  **WAVE 3 COMPLETE TO THE VERIFIABLE FLOOR, Round 189: Croatia,** same recipe (rezultati.com's
  live 2026-27 fixtures plus the season math with each leg sourced; Dinamo the champions).
  World is 330 clubs across 20 leagues in 17 nations. What remains is BLOCKED, not pending:
  Czechia (the Karviná fallout left the membership unverifiable when checked), and Liga MX,
  Brazil and Argentina (all need the split-season engine shape). Wave 3 should be considered
  CLOSED until one of those blocks lifts.
- CM-7 **MOSTLY DONE, Round 161: structured deals and deep filters.** Negotiations take
  PACKAGES now: cash plus add-ons (weigh 60p on the pound, queue up and come due in later
  summers at a measured 0.65 rate, leading the summer news), a sell-on clause (worth about
  a third of face to the seller, rides on the signing, and takes its exact cut off the top
  when you resell him), and a part-exchange player (85 percent of sell value, leaves with
  the deal, cannot be bought back). One dealPackageValue function feeds the offer, the
  acceptance line, the rival war and the UI preview so no screen can disagree with the
  table, and Meet Ask offers LESS CASH when the structure covers the gap, which is the
  whole point. Market filters went all the way down: exact positions (LW vs RW), age bands,
  price bands, the selling club's league, four sorts, plus the existing name search.
  simDealDepth.mjs pins identity (extras-free offers behave exactly as eleven calibrated
  rounds always did), the cash-only budget hit, the queue, the resale cut and the due rate,
  and its FIRST RUN caught generateHeadlines eating the add-on news at the summer rollover.
  RELEASE CLAUSES ON MY OWN RENEWALS DONE (Round 193): every renewal now offers the plain
  deal or 88 percent of the wage with a release clause at 1.5x sell value that day (the
  bottom of the buy side range releaseClauseOf has used since Round 71). The clause LIVES:
  generateIncomingBids hunts clauses first at a bargain-scaled rate, a met clause cannot be
  rejected and block cannot kill it, an unanswered one executes itself on deadline day
  through the real acceptBid path, and a plain renewal deletes it, which is the counter
  move. Round 193 also fixed the ugliest find of the whole push: ContractsCard was built in
  Round 105 and NEVER MOUNTED, so renewals were unreachable for 88 rounds while deals ran
  out. It lives on the Squad tab now with a granted-clauses ledger and bargain warnings.
  NATIONALITY FILTER DONE (Round 194): playerNationalities.ts holds one map per sealed
  world (a name is not a person: the 2010 Aaron Ramsey is Welsh, the modern one English),
  baked from player_market_values in twelve batched per-world year-window queries with the
  provenance in bakeNationalities.mjs's header; 6,262 of 6,262 world names covered, 132
  nations, every one with a FLAG_CODES flag (13 new codes added). The market grew the
  nationality dropdown (world-local nations with live counts) and real flags on market and
  squad rows. CM-7 IS NOW FULLY CLOSED: structured deals (161), deep filters (161),
  release clauses on own renewals (193), the nationality filter (194). Nothing remains.
- CM-8 **DONE, Round 171: the finance layer.** A Finances desk on the hub: every HOME crowd
  now pays a gate into the transfer kitty (the Round 169 attendance times an average spend
  per fan set by club stature and your ticket policy, about 25 to 40 million a season for a
  mid table club, era-scaled down in 2010), a ticket policy with real trade-offs (Fair
  fills a bigger louder ground for less a head, Premium banks more from fewer, both
  directions harness-guarded so the choice can never go one-sided), and ground expansion:
  three levels, priced by stature and rising each time, paid from the same kitty, +2 board
  confidence for the ambition, crowds up about 12 percent a level from the next home game,
  and a custom club's chosen capacity genuinely grows (+6,000 seats a level, crowd always
  fits). Expansions belong to the CLUB: move jobs and the new ground is theirs as-is; stay
  and they carry with fresh season books. Scouts and the academy already spend from the
  kitty (Round 116); the desk says so. simFinance (53rd harness): gates reconcile to the
  pound and only at home, the ticket trade-off is real both ways, builders charge and
  crowds measurably grow inside the hard bands, books follow the club not the manager, old
  saves default sanely, era prices run smaller. Browser probed 8 for 8. NOTE: the suite run
  for this round had simOpposition read 1.74 against its 1.5 equivalence tolerance ONCE and
  0.37 on the immediate rerun (its own error bar is about 1.0 and it runs unseeded); noise,
  not a regression, and the engine path it measures gained no new random draws this round.
- CM-9 **DONE, Round 163: league views.** Tables exist before a ball is kicked: pre-season
  every league (mine and all fourteen others) shows its full membership in alphabetical
  order with my club starred and a note that positions arrive with round one, replacing the
  old "kicks off with your next round" placeholder. Every league picker chip wears its
  nation's real flag (flagcdn via the existing FlagImg machinery, LEAGUE_NATIONS mapping
  all fifteen ids including 2. Bundesliga). And Europe is WHOLE now: seven AI groups (B to
  H) of four real clubs each, drawn from the same continental pool as mine, playing their
  two fixtures the same nights my group plays, tables in lockstep, old saves caught up
  mid-campaign. The knockout bracket is EARNED: quarter-finalists are the eight group
  winners in group order (a runner-up me takes the last slot, never a slot-0 rematch), with
  the old shuffled pool kept only as filler for thin historic-era worlds. A projected
  bracket pairs the eight current leaders A v B, C v D style all group stage, marked "if
  the groups ended today", and goes silent the moment the real bracket exists. simWorld
  grew section 8 (lockstep, reconciling tables, no invented clubs, earned bracket, honest
  projection, catch-up, rollover redraw, flag map coverage both directions) and its first
  run caught the pool being one group short and the unmapped 2. Bundesliga id. Browser
  probe 14 for 14 on the real built site.
- CM-10 **DONE, Round 168: mid-season approaches.** When your stock runs hot (overachieving
  the board's expectation by 3+ places, or four wins in the last five, after at least 8
  league rounds) a bigger club calls: about 6 percent per week, one approach at a time,
  never while a pre-agreement exists, suitors drawn from the same tier-ranked era-aware
  pool the season-end offers use, custom-safe (a displaced club cannot call). The approach
  lands in the week's events, lights the Manager tile, and sits in the Manager panel with
  the suitor's stature, budget and named board demand. Committing is a SUMMER
  pre-agreement, like real football's announced-in-March moves: the news breaks, your
  current board drops 6 confidence, and at season end the pre-agreement leads the offers,
  honored even in a flat season, with one out: finish 6+ places below expectation and they
  publicly walk away. Declining pays +2 confidence and a loyalty headline. Ignored
  approaches expire in 5 weeks with a shortlist headline. Nothing crosses the summer.
  simApproaches (52nd harness) proves the gates: bigger-club-only suitors with named
  demands, exact confidence costs both ways, the pre-agreement leading the offers and the
  collapse voiding it, expiry, ZERO approaches across a doctored relegation season, and a
  2010 save courted only by 2010 clubs. Browser probed 8 for 8 including answering the
  card on the real page.
- CM-11 **DONE, Round 164: the stats centre.** A Stats tile on the hub opens one screen with
  competition filter chips (All, League, the real cup name, Europe when the club is in it):
  the club's record in that view (P, W D L, scored, conceded, diff) derived from the fixture
  log by a typed competition field (old label-only entries bucket by their label prefix),
  leader cards (top scorer, most assists, best average rating at 3+ apps, most carded), and
  every player's full line (apps, goals, assists, Y/R, clean sheets, average rating),
  sortable by any column. The engine grew per-competition stat splits on CMPlayer
  (comp.league/cup/ucl), credited at the SAME code sites at the SAME moments as the season
  totals (the ratings map for apps/goals/assists/rating, the card sites for yellows and
  reds), so the two books cannot disagree: simStatsCentre reconciles every player both ways
  over a full 50 match season (worst rating drift measured 0.00), pins 11 apps per match in
  every bucket, the team record reconciliation, the typed-vs-label agreement, the old-save
  path (stripped saves keep counting season totals and grow splits from the update forward,
  with the screen saying so), and the summer reset. Help popover updated, and it also fixed
  a Round 156 miscount: the game has FIFTEEN leagues since the 2. Bundesliga landed in
  Round 142, and the help, SEO block and site copy all said 14. Browser probe 12 for 12.
- CM-12 **DONE, Round 165: award races.** An Award races card tops the stats centre: the
  league's golden boot board (two real attack-minded men per rival club tracked from the
  same projected rosters the danger-men use, handed shares of the goals their clubs
  actually score in the simulated season, my own scorers merged in from their real
  per-competition stat lines so the race and the stats centre are one bookkeeping), a
  player of the season watch scored by ONE formula for everyone (goals plus a lift for
  table position, mine included, so the ranking cannot favour my squad), and a Ballon d'Or
  watch (boot leaders plus the star of every league's current leaders, era aware because
  every name comes from the save's own rosters and tables). All three settle in
  finishSeason: the summary now names the golden boot, the player of the season and the
  Ballon d'Or (Europe's crown weighs most, then titles, then the boot), and the season
  review displays them. Old saves reconstruct the race from the goals the table already
  holds at the same shares the weekly crediting uses. Generated players wear the MADE UP
  tag on the board like everywhere else. simAwardRaces proves: roster-true names, a race
  that can never outscore its club's table line (winners measured 26 to 31), the one-
  formula POTY re-derived to the digit, all three honours present and earned at season
  end, the 2010 era racing 2010 names, the mid-season rebuild, and the summer reset.
  Browser probe 9 for 9.

**Site wide:**

- S-1 **CLOSED IN FULL, Round 195 (157 + 159 + 195):** playing counts toward the header,
  everywhere. Every CM match records a completion with the running season score, the
  anonymous completion path dispatches the same header-refresh event the auth path always
  had, and Round 159 gave Soccer Career the same treatment (every advanced season records
  an unscored play, the scored completion stays the retirement legacy). The header itself
  is truly centred at desktop now: at lg+ the bar is a three column grid with equal
  flexible side tracks, phone layout untouched, simMobileChrome still green across all
  five widths. Round 195 closed the last gap: the four Front Office boards mark every
  played week or round unscored, the four My Career boards mark every played season
  unscored (both at the top of the play function AFTER the null guard, so loading or
  creating never counts), and Stadium Tycoon marks once per session via sessionMarkedRef
  on the first meaningful action (doBuy, doHire or doTap; a ref so marking never
  re-renders the game loop). The scored path (useGameCompletion) is untouched in all
  eight boards and the tycoon never had one. simSessionMarks (harness 67) pins the
  source shape; playSessionMarks (fifteenth walk) counts the actual POST bodies a real
  browser sends: zero on load, one per FO week, one per career season, one per tycoon
  sitting across three taps, one more after a reload, every body scoreless with a handle.
- S-2 **DONE (v1), Round 167: The Ticker.** A thin scrolling wire across the top of every
  screen (site-wide at desktop, home page only on phones so game play areas stay clean, off
  on admin paths). Every line is derived or personal, never hand-typed to rot: your own
  Club Manager save (club, computed league position and points, or "awaits kick off" at
  zero games, plus the golden boot leader from the Round 165 race), your Stadium Tycoon
  bank and rep stars, your Soccer Career player and OVR, four fresh dailies rotated by the
  calendar day, live game counts read off the registry, and a pointer to /whats-new. CSS
  marquee (pause on hover, off under prefers-reduced-motion with plain overflow scrolling),
  seamless loop via a non-focusable ghost copy, fixed 28px height so no layout jump.
  simTicker (51st harness) proves: a fresh visitor still gets a full wire, every daily line
  is a real daily game at its real path, save lines reconcile against independently
  computed truth (position by the same tiebreaks), zero-game saves say so instead of
  claiming 1st, EIGHT hostile or garbage saves absorbed without a throw (the ticker renders
  on every route, so a throw would kill the whole app shell), and the rival broadcaster's
  name appears nowhere in the file, not even in a comment. Browser probed 10 for 10 across
  desktop and phone including the personal lines and the hidden-on-phone-game rule;
  simMobileChrome still green across all widths. The paid real-scores feed stays parked
  (money, his call).
- S-3 More animation everywhere, standing item F from the first review. THIRD PASS DONE,
  Round 186: the season curtain in all four My Career games (staged reveal on every played
  season via one shared engine usCareerReveal.ts and one shared card, confetti only on a
  title, banned years muted, every line verbatim from the sport engines). FOURTH PASS DONE,
  Round 187: the verdict curtain in all four Front Office games (the recap stages in place,
  stageVerdict in the same engine decides confetti and tone: champion GM only, fired kills
  it outright, one honest shake on the way out). FIFTH PASS DONE, Round 188: the home page
  tile curtain (sections reveal once on scroll, capped stagger, reduced-motion users get
  everything instantly, search results stay instant, proven in the DOM by playHomeReveal).
  The remaining named candidate, Soccer Career match moments, turned out to be ALREADY
  SERVED by earlier rounds: SeasonSummaryCard, the event cards, the World Cup and UCL
  result cards and the legacy card all carry staged entrances and trophy confetti
  (SoccerCareer.tsx lines 443, 1902, 1964, 2369, 2444 as of Round 188). S-3's named list
  is CLOSED; further animation only if he asks or a new surface obviously wants it.
- S-4 **DONE, Round 159: the Soccer Career fix pack from his screenshots.** The ceiling can
  never sit below the man: the build editor used to keep the ORIGINAL roll's ceiling when
  you typed a higher overall (his screenshot: 99 overall, "89 ceiling"), so the ceiling now
  rises with the build, rollPotential is capped at 99 (it could project 101), and
  effectivePotential floors at the player's own overall so old broken saves read repaired.
  Retire and New Career became real bordered 40px buttons. The cone slalom shows a live
  ticking stopwatch from the first cone. Keepers train position specific now: Shot Stopping
  (read the striker's tell, dive by tapping a zone, tell honest 65 percent of the time)
  replaces Penalty Placement for GKs, feeding the reflexes stat the engine always mapped
  them to. And a fourth drill for everyone: Passing Gates, tap the lit gate before it
  shuts, windows shrink, trains passing (new TrainingDrill member wired through
  applyTrainingResult). simPotential grew a section pinning the ceiling band; simTraining,
  simCreation, simSoccerCareer and simMobileChrome all green.
- S-5 The other career and manager games are "so way behind compared to the soccer ones":
  standing parity item, pull the CM systems (roles, press, talks, market, boards) into their
  sports one at a time. IN PROGRESS: Round 179 pulled the market and the talks into all four
  My Career games (real free agency with competing offers and push-for-more negotiation);
  Round 180 pulled the boards into all four Front Office GM games (ownership mandates, trust,
  live pace, graded verdicts, firing as a real fail state); Rounds 182 and 183 pulled the
  roles into ALL FOUR My Career games (depth chart, camp battles, bench seasons, FA role
  re-evaluation, with the goalie apprentice rule and the reliever exemption as the sport
  truths); Round 184 pulled the press into all four My Career games (reactive pressers off
  the season's real facts, three registers, the firebrand gamble). ALL FIVE NAMED SYSTEMS
  (roles, press, talks, market, boards) ARE NOW LIVE ACROSS EVERY SPORT. Optional S-5
  extensions: negotiation depth in the GM trade engines DONE (Round 190, foTradeTalks:
  the direct trade is a phone call with counters, lesser returns, a one-shot stand-firm
  on measured leverage, and an execute path honoring the agreed premium); GM-side press
  DONE (Round 192, foGmPress: the season's real facts pick the presser, podium, scrum,
  trade question or the hiring-day introduction; three registers whose answers move the
  Round 180 trust meter, floor 1 so only a graded season can fire you; season-end answers
  can TILT next season's mandate one tier through buildOwnerMandate's tilt parameter;
  quiet mandate-met summers provably quiet). S-5 IS NOW COMPLETE INCLUDING BOTH OPTIONAL
  EXTENSIONS. Nothing named remains on this item.
- S-6 Indexing: keep the sitemap green (Round 148 fixed the root cause), give Search Console
  time, and add internal links between related games. INTERNAL LINKS DONE (Round 181): the
  deterministic related-games graph makes the whole site one crawlable component with zero
  orphan pages. Remaining: give Search Console time, keep the sitemap green.

## Owner feedback, second review 2026-08-17 (5 AM, after rounds 139-144 went live)

He reviewed again about twenty minutes after the deploy, so items he calls unfixed may be his
browser cache: rounds 139-144 went live at 08:00 UTC and his message landed 08:2x. He was told
to hard refresh. His NEW asks, worked in order:

A. **DONE, Round 145: past eras.** "U should have diffrent era like u can be the manager for
   clubs in 2010 and 2000 and so on with all correct lineups and everything like that and
   values and just everything." Phase one shipped: the 2010-11 era, Premier League + La Liga,
   802 real year-2010 players across all 40 clubs, famous summer 2010 moves corrected against
   the table's own 2011 rows (Villa to Barcelona, Ozil and Di Maria to Madrid, Ibrahimovic
   out to Milan), era-sealed market, 2010 boards (no Conference League, it did not exist),
   era continental pool, era cups. `simEra2010.mjs` guards identity, isolation, ladder and
   playability. DATA FLOOR: player_market_values reaches 2004, so 2005 and 2015 eras are
   buildable next by the same recipe (scripts/bakeEra2010.mjs), an exact 2000 era is NOT
   possible honestly, and he was told so.

B. **DONE, Round 145 (same round as A, one review, one commit): top clubs demand the title
   itself.** "The second highest overall team
   dosent want to be top 2. They also want to win it. The same with 3rd place... stop with
   this top 20 or top 2 nonsense." The title band now runs on the measured XI gap to the
   league's best (TITLE_GAP in clubManager.ts, threshold 2.5 measured over all 13 leagues),
   so Liverpool, Chelsea, United, AC Milan, Feyenoord, Sporting CP, Union SG all demand the
   title, the euro windows slide down below a wide title band, and every positional
   parenthetical is gone from every label. The two worst "Top N" offenders were UI lines:
   the club picker tile and the rival viewer both printed raw ranks ("Top 20"); both now
   quote the board's named demand. simBoardObjectives 1b pins 26 giants to target 1.

C. **OPEN: "look up all the leagues fifa has" and add more.** See item 6 below for the wave
   recipe and remaining candidates. (Never write that product name into src.)

D. **DONE, Round 154: create-a-club.** "Create my team for the manger game and its full
   customizatable with crests and stadium and starting money and everything." Shipped as a
   fourth picker step: any league (eras included), club name with a collision guard that
   folds diacritics, badge prefixes and famous alternate spellings (an engine keyed on names
   cannot allow a second "Arsenal", and "Paris Saint-Germain" must collide with the in-game
   "PSG"), an original SVG crest builder (6 abstract shields x 6 patterns x palette x your
   initials, sanitized so nothing a form passes can reach markup), stadium name, three
   budget tiers. The club REPLACES the weakest club of its league for that save only, its
   24-man day-one squad is generated players (all tagged made up), and the real market is
   where real players come from. Boards read the squad, not the wallet: measured day one,
   a big-money startup ranks about 20th in the Premier League but 4th in the Eredivisie
   ("Win the Eredivisie") and 1st in Scotland, and the create form quotes the live demand
   before you commit. The displaced club is out of the world entirely: not in the table,
   the cup, the results, the buyers, the suitors, season after season (the swap recomputes
   every summer; leave for another job and your club dissolves with your tenure).
   `simCreateClub.mjs` (7 sections) guards the name wall, the swap, the generated squad,
   honest boards at every tier, tier separation where the league allows it, save/load with
   zero bleed into real careers, and crest injection-proofing. Browser-walked 12/12 at
   390x844: form, live validation, honest replaced-club line, crest in the hub header,
   stadium chip, made-up tags on every squad row.

E2. **DONE, Round 150: Matchday Hype, the tycoon's boost.** He nudged "Dont forget the idle
   game" the same afternoon, so it got the genre's heartbeat from his reference shots: a
   boost that charges over eight minutes of play and pays exactly double for sixty seconds
   when pressed (income, taps, goal and win bonuses, all downstream of one multiplier).
   Charges only while playing, never stacks, away pay stays unboosted by construction, and
   simStadiumTycoon section 6 pins all of it (x2.00 measured, burnout on schedule, save
   roundtrip). The button fills like a battery, glows when ready, burns while lit.

E. **DONE, Round 146: Stadium Tycoon, the idle game.** He sent two reference screenshots of
   an idle sports tycoon and asked to be surprised, with animation named twice. Shipped
   original: /stadium-tycoon, a matchday-economy idle game where attendance is min(seats,
   fanbase), every fan pays per second, a live toy match (player dots chasing a ball,
   real sim state) pays crowd-scaled goal bonuses, win streaks multiply income and pull
   fans, nine upgrade tracks, tap income with a Megaphone track, prestige into Reputation
   stars (+50% each, permanent), away earnings at half rate capped at 8h, versioned
   localStorage saves. Animations: seat-by-seat crowd fill, floaters off every earn,
   goal confetti, count-up cash, streak flame, glow on the prestige button. Tuned WITH
   the harness (simStadiumTycoon.mjs): first prestige minute ~15 on a greedy floor
   strategy, no pre-prestige purchase ever more than 60s away, the post-prestige wall
   measured 253s max on a 2h refuser (ceiling 420s), offline pay capped and honest,
   corrupt saves fall back safely. Live-verified in Chromium at 390x844: money grows,
   tiles buy, floaters fire, zero page errors.

G. **DONE, Round 148: the Search Console redirect failure, fixed at the root.** His
   screenshots (2026-08-17, 9:53 AM): 41 indexed and climbing, 88 not indexed, and a FAILED
   validation on "Page with redirect". Root cause found in the repo: the r54 sitemap was
   generated once by hand and drifted, submitting SIX routes that had since become 301
   redirects (/world-cup, /football-draft, /guess-soccer-club, /guess-transfer-value,
   /perfect-lineup, /grade-transfer; Google sampled 3 for the validation), plus five
   retired orphan pages feeding the "crawled, currently not indexed" pile, and NO new
   games since r54 (Stadium Tycoon was invisible to Google). Now: scripts/genSitemap.mjs
   regenerates public/sitemap.xml mechanically from App.tsx routes plus the registry
   (redirects excluded by construction), and scripts/simSitemap.mjs fails the suite if a
   redirect is ever submitted, a registry game is ever missing, or an orphan sneaks in.
   114 URLs now: 107 games, 7 static, /jeopardy legacy. EXPECTATIONS for whoever reads
   the next screenshots: the failed validation heals after the next crawl of the new
   sitemap (or tap VALIDATE FIX again in Search Console to hurry it), the 17 "Started"
   resolve on their own, and the big "crawled not indexed" bucket is normal for a young
   site: it shrinks as content and internal links age, which the 47k words of game
   content are for. Nothing else actionable from our side today.

F. **STANDING: more animation everywhere, more depth everywhere.** "Add more animation
   especially to the idle game... and all the games." Second pass DONE, Round 149: the
   shared ResultScreen (the end card of about 56 games) now celebrates every WIN site
   wide: confetti with a per-game deterministic fall, the outcome emoji slams in, the
   headline rises, stat rows stagger. Losses stay deliberately quiet, because 56 games
   shaking at you gets old in an afternoon. Verified: full sweep of 119 routes across 3
   viewports with zero non-network errors, plus a complete Club Manager season played to
   its ResultScreen with 0 findings. First pass DONE, Round 147: Club
   Manager full time is staged now (verdict slams in after a beat, scorers stagger in
   minute order, wins pulse, defeats shake once, trophies pour confetti, and season end
   rains confetti over silverware) via a shared Celebration component ready for other
   games. LESSON, paid for immediately: the first draft counted the scoreboard up from
   0-0 and playClubManager flagged it as "the score went backwards" within the hour,
   because for a moment the screen contradicted the sim. The scoreboard now shows the
   true final from frame one and the theatre lives around it. The rule for future juice
   passes: animate emphasis, never animate a number through false values. Verified: a
   full 48-half-time interface playthrough with 0 findings. Next candidates: Soccer
   Career match moments, NBA/NFL career result screens, home page tiles.

## Owner feedback, 2026-08-16 (first review)

Anthony reviewed the whole site and gave direct feedback. **Worked top to bottom; DONE marks
below are current** so the 3-hourly build sessions do not redo finished work.

His closing direction, which applies to every game, not just the items below: *"Just keep
adding to every game and more more realism and more info and more minigames and more of
everything. think gta, btlife, 2k, madden, fifa, and much more in ur idea of building better
games."* Treat the depth of the big life sims and franchise modes as the bar. Never write
those product names into `src/` (the rival names guard fails the build); the FEATURES are the
target, not the names.

1. **DONE (no round needed). Polls of the day: corny answers.** His words: "some of ur answers
   are so corny. It should be like a yes or no question or choose this athlete or other not a
   whole as sentence." Fixed 2026-08-16 directly in the `daily_polls` table (today's rows and
   the pre-stocked bank were swept; options over 20 characters: zero) and the generator task
   prompt now hard-requires options of at most 3 words, a name, a team, Yes or No, never a
   sentence, never a joke option. If corny options reappear, the generator prompt is the place
   to look, not the site code.

2. **DONE, Round 139. Club Manager eras: no future.** His words: "u could take control of
   diffrent teams in diffrent eras meaning current or the pass. Not the future since we dont
   know the future. So please remove that." The 2031, 2036 and 2041 starts are gone. The
   ageing engine stays (a save that starts today still needs the world to age around it).
   simEras now FAILS if anybody adds a future era back.

3. **DONE, Round 145: PAST eras phase one, built honestly per `docs/PAST-ERAS-DESIGN.md`.**
   See item A in the 2026-08-17 review above for what shipped. The design doc remains the
   recipe for further eras (2005, 2015): dump the year's rows per league through the MCP,
   bake with scripts/bakeEra2010.mjs adapted, add the era's leagues to ERA_LEAGUES and its
   bake to HISTORIC_ROSTERS, extend simEra2010-style checks, done. The engine threading
   (era-keyed market, era boards, era continental pool, era cup, era job offers, era-relative
   yearsOn) is general now and needs no further surgery per era. Traps hit in phase one,
   recorded for phase two: year-2010 value snapshots can predate the summer window, so
   verify marquee movers against the NEXT year's rows and correct clubs (values stay the
   era snapshot); and cross-era same-name different-person collisions are real (Aaron
   Ramsey twice), harmless across worlds, and allowlisted in simEra2010's NAMESAKES.

4. **DONE, Round 139. Board objectives talk like boards.** His words: "no team is looking for
   top 2. There looking to win it all... win the league or get champions league football or
   Europa league or conference league or finish mid table or dont get related." The demand
   ladder is now named competitions with per-league European slots (Ligue 1 sends 3 to the CL,
   England 4, the Eredivisie 2, the Championship demands promotion, MLS can never threaten
   relegation, the Saudi league points at the AFC). Also MORE wants, which he asked for twice:
   points floors, the league-and-cup double for the biggest boards, turn-a-profit mandates for
   selling clubs, on top of goals, defence, youth and the rival. Job offers now carry the same
   named demands. `simBoardObjectives.mjs` guards all of it.

5. **DONE, Round 139. No more instant selling, and windows that actually span weeks.** His
   words: "U shouldnt be able to just quickly sell someone. U need offers and put them on the
   transfer market." `sellPlayer` is deleted. Selling is: transfer list him, offers arrive
   (70 percent on window open, 35 a week after, and open offers now PERSIST week to week),
   accept one. To make waiting possible at all, windows now span real match weeks (4 in
   summer, 3 in January) with a deadline instead of slamming shut at the first fixture. The
   transfer screen shows weeks-to-deadline.

6. **IN PROGRESS: way way way more leagues.** "There's many leagues u must add with correct
   data. And some second divisions too and maybe up to 5."

   **Wave 1 DONE, Round 140: Primeira Liga, Scottish Premiership and the Süper Lig.** 48 new
   playable clubs (234 total), 205 newly baked real players (3,147 total). Memberships
   verified for 2026-27: Portugal (Marítimo and Académico de Viseu up, Tondela and AVS down,
   Casa Pia survived the playoff), Scotland (St Johnstone up, Livingston down, St Mirren
   survived the playoff), Turkey (Erzurumspor, Amedspor and Çorum FK up; Antalyaspor,
   Kayserispor and Fatih Karagümrük down). Every new league carries proper euro slots,
   relegation counts (Scotland drops 1, Portugal 2, Turkey 3), cup names, priors and colors,
   and the thin tails are marked in CM_PARTIAL exactly like the Championship has always been.

   **How wave 1 was built, because wave 2 repeats it:** the sandbox cannot reach Supabase
   directly, so rows were pulled through the Supabase MCP and baked offline.
   `bakeClubManagerRosters.mjs` now takes `--dump=rows.json` for exactly this, and its
   DB_TO_ENGINE map already carries all wave 1 names. The dataset ranks players by value
   worldwide, so small clubs sit below its floor: that is why St Mirren and the promoted
   sides bake empty and youth-pad in game, the Abha and Cambuur precedent.

   **Wave 2 part one DONE, Round 142: the 2. Bundesliga.** 18 more clubs (252 playable), 93
   more real players (3,240 total). Membership from the league's own 2026-27 season preview:
   Wolfsburg, Heidenheim and St. Pauli down from the Bundesliga, Osnabrück and Energie Cottbus
   up from 3. Liga. Wolfsburg bakes 20 real players including Amoura and Eriksen. The board
   ladder speaks German second tier: automatic promotion top 2, the promotion playoff for 3rd,
   two go down. Germany now has two playable divisions like England.

   **Wave 2 part two DONE, Round 143: the Belgian Pro League.** 18 clubs (270 playable), 127
   more real players (3,367 total). And 2026-27 is the perfect year to add Belgium: the league
   reformed to 18 clubs in a straight round robin with no playoffs, exactly the shape this
   engine plays. Beveren, Kortrijk and Lommel up, Dender down via the playoff Lommel won.
   Genk bake 19 real players (Karetsas at 38m), Anderlecht 18, Union Saint-Gilloise 16.
   This round also fixed three stale entries where a player's real 2026 move superseded the
   2025 row an earlier wave baked him under: Özcan to Anderlecht, Muja to Sint-Truiden,
   Tresoldi to Club Brugge. Lesson recorded: when a new league wave lands, check whether any
   of its 2026 rows name players already baked elsewhere off 2025 fallbacks, and move them.

   **Wave 3 candidates, densities MEASURED 2026-08-17** (Supabase MCP, DISTINCT ON player,
   years 2025-26, top-club real-player counts). Six European-calendar leagues fit the engine
   as is, dense tops with thin tails (CM_PARTIAL precedent applies): Czechia (Sparta Prague
   25, Slavia Prague 24, Viktoria Plzeň 13), Austria (Red Bull Salzburg 23, Sturm Graz 14,
   LASK 8), Denmark (Copenhagen 20, Midtjylland 13, Nordsjælland 13), Greece (Panathinaikos
   18, Olympiacos 17, PAOK 15, AEK Athens 15), Switzerland (Basel 18, Young Boys 14, Lugano
   8), Croatia (Dinamo Zagreb 15, Hajduk Split 11, Rijeka 8). Liga MX is the deepest pool of
   all (América 19, Monterrey 18, Cruz Azul 16, Guadalajara 15, Toluca 14) BUT plays split
   Apertura/Clausura short tournaments, the same engine-shape problem as Brazilian Serie A
   and Argentine Primera (calendar-year seasons); none of those three gets wired in blind.
   Same recipe every time: verify membership via web plus the table, extend DB_TO_ENGINE,
   dump through the MCP, supplement bake, wire EURO_SLOTS, relegationSpots, NATIONS, colors,
   priors, cup names, and check for players already baked elsewhere off 2025 fallbacks (the
   Özcan lesson above).

7. **DONE, Round 141: way more headlines.** The feed lives all season now instead of only at
   window opens: every match week can add a line, read straight off the sim's real state.
   Title race framing with the exact gap, relegation scrap with points from safety, derby
   week previews from the actual fixture list, sharpest attack and meanest defence off the
   real table, deadline countdown, and the window's record deal off the transfer log.
   Measured: fresh news in about 30 of 39 match weeks against 2 refreshes a season before,
   11 to 13 distinct story shapes. `simHeadlines.mjs` guards liveness AND truth (doctored
   tables must produce lines carrying exactly the table's numbers), and simNoInventedQuotes
   now harvests aiHeadlines too, so a future headline that quotes a real player fails the
   build. The card renamed from "Window headlines" to "Around the league".

9. **DONE, Round 144: the full-suite verification pass over everything above.** All 40
   harnesses were run end to end over the complete five-round tree, plus a real-browser
   click-through of the Club Manager picker (12 nations, Belgium down to club level, partial
   marking visible, zero page errors). Two failures surfaced and both got ENGINE fixes, not
   harness softening: an NFL linebacker could out-tackle the record book about once in a few
   thousand seasons (now capped at the realism guard's 200, the same treatment EDGE sacks got
   in Round 123), and spamming one press tone had quietly become nearly free because staleness
   only damped a talk instead of ever costing anything. A stale tone now carries a flat drag
   (TALK_STALE_DRAG), and measured at Manchester City all four tones lose points when spammed
   while reading the room stays worth about plus 3, which is the Round 135 calibration
   restored.

9b. **DONE, Round 151: the simContracts flake window is closed.** Its wage-bill section ran
   forty UNSEEDED runs per arm against results noise of plus or minus fifteen points and a
   signal worth about eight, so it flapped roughly one full-suite run in a few dozen
   (observed 2026-08-17). The arms now run paired seeds (run k of each arm sees the same
   random stream, the simEras pattern), so results cancel and the measured difference is
   the wage penalty alone. Three consecutive greens after the fix.

10. **OPEN, standing: every game gets deeper.** More realism, more info, more minigames, in
   every game on the site, career modes first. Use the franchise-mode checklist as the gap
   list per game: training plans, form and morale loops, media, contracts, injuries and
   recovery choices, rivalries, awards races, offseason depth, save-spanning records.


**As of 2026-08-16 (night update, after Round 144).** This is the volatile file.
Update it in the same round as any change, so the next session (or the next account) picks up
cleanly.

**Precedence.** On any question of *current state* (the head, round numbers, what is pending,
what is broken, what is next) **this file wins over every other document in the repo, including
`CLAUDE.md` and `docs/SHIP-PIPELINE.md`.** Those two describe stable procedure; this one
describes a moving target, and procedure written last month cannot know today's round number.
The reverse is also true: on *procedure* (how to package, how to verify, what is forbidden),
those two win and this file should not contradict them.

**Staleness.** Check the date above. Anything here older than about two weeks should be verified
against `git log --oneline` and a listing of `C:\Users\antho\ballpark-hero` before you act on
it, then corrected. The counts marked "about" or "roughly" below are approximations that were
true on the date above; re-measure rather than quoting them.

---

## Where the build stands

| | |
|---|---|
| `origin/main` head | `e3e9201` = **Round 156**, pushed and published 2026-08-17 night (this row updated 2026-08-18 with Round 157) |
| How 139-144 landed | SHIP13 clicked via computer-use 2026-08-17 ~07:50 UTC. First run failed closed on a bad RUN139 assertion (bare `plus10` matched the removal comment); pattern fixed to `id: 'plus10'`, re-clicked, all six pushed clean. Lesson in SHIP-PIPELINE terms: absence assertions must target the old DEFINITION shape, and every bat's patterns get tested against the actual zip contents before delivery. |
| Live site | douknowball.com published 2026-08-17 ~08:00 UTC at Round 144 (two deploy calls, second after sync was file-verified). Republish after 145+146 land. |
| Shipped 2026-08-17 | Rounds 139 through 150 all pushed and published the same day (SHIP13 morning, SHIP14 16:02 UTC). Head was `d486a09` Round 150 when this was written. |
| Packaged queue | Round **151** (the What's New page catches up with the big day, plus the simContracts deflake) and Round **152** (Stadium Tycoon milestones plus named opposition: ten career firsts that pay exactly once, and every opponent is an invented club like Ironbridge Rovers, 288 possible names proven collision-free against all 277 real clubs in the manager world). Plus Round **153**: `scripts/playEra2010.mjs`, the browser harness that walks the 2010 era picker like a person (14 checks: era tile, nations shrunk to England and Spain, Blackpool pickable and marked partial, the title demand on the United tile, Rooney in the dressing room, no 2026 leak). One click ships all three: **`SHIP15.bat`** (logs to `ship_log15.txt`). Then Round **154** (create-a-club, owner item D) rides alone as `RUN154.bat`, chain-guarded on 153, and Round **155** (the content layer catches up: Club Manager's SEO copy rewritten for 270 clubs, eras and create-a-club after sitting at the 20-club version with "Top 14" phrasing; a What's New entry; the wave-3 league probe folded into item 6) as `RUN155.bat`, and Round **156** (the game's own help catches up: the in-game "?" popover still said nine leagues and 186 clubs, still offered the future starts Round 139 removed, and still DENIED the 2010 era Round 146 shipped; the on-page SEO block had the same rot. Both rewritten from the live engine, browser-checked 8/8) as `RUN156.bat`. Click order: SHIP15.bat, RUN154.bat, RUN155.bat, RUN156.bat, each one self-guards. |
| Packaged 2026-08-18 | **Round 157** (Quick Sim, Match Centre, match stats and ratings, header counting, halftime-consistent scorer minutes) and **Round 158** (Watch Live, the animated 2D match viewer with the dressing room embedded at the break, PLUS the month calendar with training cones and the long fast forward: the two shipped together because they share the page files). `RUN157.bat` then `RUN158.bat`, each chain-guarded. `SHIP16.bat` runs both. |
| Packaged 2026-08-18, later | **Round 159** (the fix pack off his screenshots: ceiling repair, real Retire and New Career buttons, the slalom stopwatch, keeper Shot Stopping, Passing Gates, true header centering at desktop, Soccer Career counting toward the header per season). `RUN159.bat`, chain-guarded on 158. `SHIP16.bat` runs 157 and 158; click RUN159 after, or use SHIP17.bat which runs all three. |
| Packaged 2026-08-18, later still | **Round 160** (create-a-club depth: quality slider, football identity, stadium size, plus the boardWantLabel wrong-league fix its harness caught). `RUN160.bat`, chain-guarded on 159. SHIP18.bat runs 157 through 160. |
| Packaged 2026-08-18, small hours | **Round 161** (structured transfer deals: add-ons, sell-on clauses, part exchange, plus the deep market filters). `RUN161.bat`, chain-guarded on 160. |
| Packaged 2026-08-18, morning | **Round 162** (Stadium Tycoon goes massive, his direct ask: ten named divisions with exact income multipliers and promotion bonuses, an eight tier staff payroll, the catchable golden whistle with five prizes, 47 badges at a permanent 2 percent each, a Badges drawer, a Club records drawer, and the game's help plus SEO copy rewritten to match). `RUN162.bat`, chain-guarded on 161. |
| Packaged 2026-08-18, midday | **Round 163** (league views, CM-9 in full: pre-season alphabetical tables with the star for all fifteen leagues, flags on every league chip, all eight UCL groups simulated in lockstep, the projected quarter-final bracket, and the knockout draw seeded from the real group winners). `RUN163.bat`, chain-guarded on 162. |
| Packaged 2026-08-18, early afternoon | **Round 164** (the stats centre, CM-11: per-competition team record, leader cards, full sortable player lines, engine-level per-comp stat splits that cannot disagree with the season totals, plus the 14-vs-15 league count fix in the help and SEO copy). `RUN164.bat`, chain-guarded on 163. |
| Packaged 2026-08-18, afternoon | **Round 165** (award races, CM-12: the golden boot board, the one-formula player of the season watch, the Ballon d'Or watch and all three honours named in the season review, era aware, race goals provably bounded by the simulated tables). `RUN165.bat`, chain-guarded on 164. |
| Packaged 2026-08-18, later afternoon | **Round 166** (era legends rate like legends, the CM-5 rating half: prime Messi and Ronaldo at 97 above the modern best of 94, monotone load-time uplift, stature and values untouched, ageing ceiling follows the anchor). `RUN166.bat`, chain-guarded on 165. |
| Packaged 2026-08-18, evening | **Round 167** (The Ticker, his S-2 ask: the site's own scrolling wire on top of every screen, personal save lines, daily rotation, live registry counts, hostile-save-proof). `RUN167.bat`, chain-guarded on 166. |
| Packaged 2026-08-18, night | **Round 168** (mid-season approaches, CM-10: hot managers get called by bigger clubs, commit for a summer pre-agreement the board hears about, honored or publicly withdrawn at season end, all gates harness-proven). `RUN168.bat`, chain-guarded on 167. |
| Packaged 2026-08-18, late night | **Round 169** (the match report catches his five newest screenshots: named assists, sub arrows, stoppage time, the venue and crowd line with honest capacity rules, and the continuous Balance of play area chart). `RUN169.bat`, chain-guarded on 168. |
| Packaged 2026-08-18, pre-AdSense sweep | **Round 170** (site health for Wednesday's AdSense review: the FULL route sweep ran clean, 119 routes x 3 viewports = 357 checks, ZERO findings on the future site with all pending rounds applied. Two fixes shipped: sweepGames grew an OFFLINE=1 mode for sandboxes with no route to Supabase, so environment noise cannot bury real findings, and Dart Draft stopped failing SILENTLY when the player pool cannot load: the mode tile used to bounce back to the intro with no explanation, and now the screen says the pool could not load and to try again. Fail closed, never silently.) `RUN170.bat`, chain-guarded on 169. |
| Packaged 2026-08-18, later still | **Round 171** (the finance layer, CM-8: home gates pay the kitty, ticket policy with real trade-offs, three ground expansions the board loves and the club keeps, custom capacities genuinely grow, era prices run smaller). `RUN171.bat`, chain-guarded on 170. **SHIP29.bat is the current wrapper: it runs 157 through 171.** |
| Packaged 2026-08-18, evening again | **Round 172** (era starts for NFL and NBA My Career, his "add eras to nfl and nba and eveyr sport": the 2005 NFL and the 29 team 2003-04 NBA, two-source verified franchise lists, sealed era worlds end to end including trades, free agency, life sim rivals and the corruption arc, era money at documented scale, era pickers on both create screens). `RUN172.bat`, chain-guarded on 171. **SHIP30.bat is the current wrapper: it runs 157 through 172.** |
| Packaged 2026-08-18, night again | **Round 173** (era starts for NHL and MLB, completing "add eras to nfl and nba and eveyr sport" across all four US sports: the 2006-07 NHL and the 2004 MLB, two-source verified, sealed era worlds end to end, era money at documented scales, era pickers on both create screens. Plus a simApproaches deflake its suite run caught: the "nobody courts a struggler" control now clears any approach earned during its ten UNDOCTORED setup weeks before counting, because a genuinely hot Everton start could earn a real call the section then blamed on the struggler. And for the record: simOpposition read 1.64 against its 1.5 equivalence tolerance in this suite run and 0.70 on the immediate rerun, same unseeded tail as Round 171, error bar 1.02, no Club Manager path was touched this round). `RUN173.bat`, chain-guarded on 172. **SHIP31.bat is the current wrapper: it runs 157 through 173.** |
| Packaged 2026-08-18, late night | **Round 174** (the era words: all four sports' SEO copy and FAQs teach the throwbacks with the verified franchise facts, plus the stale-copy sweep it surfaced: the NFL page's 3-position claim, the NBA page's G/F/C claim, and leftover duplicate create steps in the hockey and baseball howToPlay lists). `RUN174.bat`, chain-guarded on 173. **SHIP32.bat is the current wrapper: it runs 157 through 174.** |
| Packaged 2026-08-18, past midnight | **Round 175** (the 2015-16 era for Club Manager, CM-5's biggest remaining half: the Leicester season baked from 767 real year-2015 rows with 56 two-way-verified window corrections, era uplift at measured 0.6, the What's New page catching up on all the era work, and two new harnesses: simEra2015 and the playEra2015 browser walk. Plus a simUsCoaching deflake its suite run caught: section 4's offer-count noise margin sat at 1.7 sigma on the tightest pair at 300 samples, so the row sample grew to 1500 where the same margin sits past 3, with the measurement in the comment; the deterministic standing check was always the real assertion). `RUN175.bat`, chain-guarded on 174. **SHIP33.bat is the current wrapper: it runs 157 through 175.** |
| Packaged 2026-08-19, small hours | **Round 176** (the 2005-06 era, completing CM-5 to the data floor: Ronaldinho's season with 747 real year-2005 players, 26 two-way-verified window corrections, period-correct UEFA Cup vocabulary via the new uelName field, the steepest measured uplift, Cadiz and Alaves honestly partial, simEra2005 and playEra2005 as harnesses 56 and the fourth browser walk, plus kit colors for the era-only clubs both new and previously gray). `RUN176.bat`, chain-guarded on 175. **SHIP34.bat is the current wrapper: it runs 157 through 176.** |
| Packaged 2026-08-19, deeper small hours | **Round 177** (CM-6 wave 3 first pair: the Austrian Bundesliga and the Super League Greece, 24 new clubs and 105 new players by the standing bake curve, 16 supersession moves and 17 stale-row drops from the Ozcan check, 296 clubs across 17 leagues with the copy caught up, Czechia parked with the reason documented). `RUN177.bat`, chain-guarded on 176. **SHIP35.bat is the current wrapper: it runs 157 through 177.** |
| Packaged 2026-08-19, before dawn | **Round 178** (the last two FotMob screenshot items: the opposition ratings model with top rated both sides on the report, the full their-XI sheet under the toggle with MADE UP tags and honest absence for thin worlds, and possession plus shots riding on the Balance of play chart. Plus the permanent fix for the suite's one recurring tail: simOpposition's league tolerance re-derived from its own accepted effect plus its own error bar, 1.5 to 2.0 with the arithmetic and all three observed tail reads in the comment). `RUN178.bat`, chain-guarded on 177. **SHIP36.bat is the current wrapper: it runs 157 through 178.** |
| Packaged 2026-08-19, morning | **Round 179** (S-5 parity opens: real free agency in all four US career games. One shared engine, usCareerFreeAgency.ts, following the usCoachCareer pattern: an expired deal opens a window of competing offers from named era-aware franchises, each with its own salary, length and roster quality, and the signed offer's quality becomes the exact teamQuality the season sim runs on. Contenders lowball, rebuilds overpay, one push-for-more per offer with leverage from rating, accolades and age, and two fail-closed rules: the incumbent never rescinds and the last live offer never rescinds, so a career can never be stranded. The old two-button 'contract' card left all four event decks, and the boards now refuse to start a season with no deal, which also closes the old hole where the deck could skip the card and let you play years on an expired contract. simFreeAgency is harness 57, margins from a measured 3000-window run; playFreeAgency is the fifth browser walk, 26 checks, scoped to the market screen because the ticker legitimately talks about Vegas and signings). `RUN179.bat`, chain-guarded on 178. **SHIP37.bat is the current wrapper: it runs 157 through 179.** |
| Packaged 2026-08-19, mid-morning | **Round 180** (S-5 boards half: the owner upstairs in all four Front Office GM games via one shared engine, foOwnerMandate.ts. Ownership sets a mandate from the roster's honest league rank at hire and every offseason (title, contend, playoffs, or an honest win floor; a defending champion is never asked for less than a deep run), the hub carries the mandate card with a 0-100 trust meter and a live on-pace read, season end grades the mandate with narrated verdicts (never quoted speech, several of these franchises have famous real owners), and zero trust fires you and ends the save, the fail state the GM games never had. Trust arithmetic guarantees a fresh GM survives one bad year and never three. simOwnerMandate is harness 58 (deterministic matrix checks plus the real playoff engines); playOwnerMandate is the sixth browser walk, 26 checks, including a manufactured doomed season ending in the fired screen surviving reload). `RUN180.bat`, chain-guarded on 179. **SHIP38.bat is the current wrapper: it runs 157 through 180.** |
| Packaged 2026-08-19, late morning | **Round 181** (S-6 internal links, the day before the AdSense review: the "More games" block stopped pointing every page in a category at the same first three games and became a deterministic link graph via src/lib/relatedGames.ts, rendered as six real tiles on every game page through GameSeoContent. A ring through the page's own category plus a link into the next category makes the WHOLE SITE one crawlable component (BFS-proven from every one of the 107 pages), plus two hash-spread variety picks; measured inbound spread min 2, median 5, max 13, zero orphans, where the old picker left most games with zero inbound links. simRelatedGames is harness 59; playRelatedGames is the seventh browser walk). `RUN181.bat`, chain-guarded on 180. **SHIP39.bat is the current wrapper: it runs 157 through 181.** |
| Packaged 2026-08-19, midday | **Round 182** (S-5 roles half, first pair: the depth chart in NFL and NBA My Career. Draft day assigns starter or backup from draft capital plus an incumbent modeled off team quality, every offseason runs a camp battle with hysteresis both ways, backup seasons are spot duty (QB clipboard 18-32% of snaps, NBA bench 55-65% minutes) that drain morale and fanbase, free agency re-evaluates the role in the NEW locker room so a mid player chasing a ring can lose the job (closing the 179 money-role-rings triangle), and NBA Sixth Man now goes to actual bench seasons. Absent role means starter BYTE FOR BYTE (proven over 30 seeded season pairs), so pre-182 saves and every harness path are untouched. Role chip on both hubs, camp lines in the feed. simDepthChart is harness 60 with measured margins; playDepthChart is the eighth browser walk. NHL and MLB get the same treatment next round). `RUN182.bat`, chain-guarded on 181. **SHIP40.bat is the current wrapper: it runs 157 through 182.** |
| Packaged 2026-08-19, early afternoon | **Round 183** (S-5 roles half complete: the depth chart reaches NHL and MLB My Career with the sport truths kept. NO rookie goalie opens as the number one on draft capital alone (the apprentice rule, measured 6% starter rate), backup goalies get their honest twenty-odd starts (games x0.35), fourth lines play every night on half the ice time (production x0.5-0.62), MLB bench bats get half the games, long-relief arms get spot starts (x0.4), and RELIEVERS ARE EXEMPT by design because the bullpen hierarchy already lives in the closer archetype (exemption proven byte-for-byte even under a forced backup flag). Same camp battles, hysteresis, drains, FA role re-evaluation and absent-role-is-starter compatibility as 182, all extended into simDepthChart (now covering all four sports with measured ratio bands: NHL points 0.59, G wins 0.40, MLB HR 0.58, SP strikeouts 0.46) and playDepthChart (15 checks across four hubs)). `RUN183.bat`, chain-guarded on 182. **SHIP41.bat is the current wrapper: it runs 157 through 183.** |
| Packaged 2026-08-19, mid afternoon | **Round 184** (the press room, completing ALL FIVE named CM parity systems across every sport: one shared engine, usCareerPress.ts, mapped into all four career games' event decks with zero new UI. The press reads the season's actual facts: a title takes the podium and a collapse takes the accountability scrum GUARANTEED (preempting the deck), a team change brings the introduction naming the actual new city, the bench brings the role question, MVP the trophy interview, a final contract year the future question, and quiet summers stay provably quiet. Three answers per presser (diplomat, honest, firebrand), the firebrand genuinely gambles fanbase both ways at documented odds. The speaker is always the fictional player, questions come from unnamed reporters, no real-name inputs exist. simCareerPress is harness 61 (triggers, priority, exact effect deltas, gamble odds at 4000 rolls, cross-sport vocabulary isolation, 120 full careers per sport); playCareerPress is the ninth browser walk (a doctored struggler meets the scrum through the real UI; first draft retired the probe instantly by setting ovr below the retire line, fixed with the reasoning in the comment). For the record, this round's suite run read two single tails in UNSEEDED Club Manager harnesses that no 184 code touches: simAwardRaces ("a boot winner reached 45") and simRoles ("a promised-then-benched man never asked"), both immediately green on rerun, simAwardRaces green five straight and simRoles two straight. Treat single reads as noise per the simOpposition lesson; if either recurs, re-derive its margin instead of nudging it). `RUN184.bat`, chain-guarded on 183. **SHIP42.bat is the current wrapper: it runs 157 through 184.** |
| Packaged 2026-08-19, 04:28 UTC | **Round 185** (CM-6 wave 3 second pair: the Danish Superliga and the Swiss Super League, both memberships two-source verified (Denmark: the Wikipedia season page plus worldfootball's live table, AGF the reigning champions; Switzerland: Wikipedia plus Nau.ch, Thun the surprise champions, Vaduz the Liechtenstein guest playing under a straight round robin simplification documented at the league entry). 24 new clubs by the standing bake curve, 22 new DB-to-engine name mappings each carrying its verification comment (the DB spells Brøndby with an ö), AC Horsens and SønderjyskE join KNOWN_EMPTY as declared youth-padded squads. The Özcan check again at scale: 11 supersession moves on real summer 2026 rows (Moukoko, Kotarski and Richardson to Copenhagen, Billing to Midtjylland, Godfrey and Köhlert to Brøndby, Duranville, Agbonifo and Salah to Basel, Andrews to Young Boys, Boukhalfa to St. Gallen) and 27 stale 2025 fallbacks dropped in favor of existing 2026 rows (Kvistgaarden stays Norwich, Bardghji stays Barcelona, Froholdt stays Porto). World now 320 clubs, 19 leagues, 16 nations, 3,589 players; copy caught up everywhere it counts things, including gameRegistry's tile line which had sat stale at 270/13 since wave one. simClubManager pins re-pinned with the arithmetic in the comment; session probe 30 for 30 across both legs (nation tiles, cups, Euro spots, 12 tiles each, partial markers on Horsens and Vaduz, title demands at Copenhagen and Basel, careers started in both). The suite's era cross-check earned its keep: simEra2015 flagged the new Luzern signing Lucas Silva against Real Madrid's 2015 Brazilian of the same name, verified as genuine namesakes (Luzern's is the Portuguese Lucas Manuel Silva Ferreira, b. 2006, per Soccerway and the club's July 2026 extension news) and allowlisted with the receipt in the harness comment. Remaining wave-3 candidates: Croatia when verified, Czechia still parked on the Karviná fallout, Liga MX blocked on the split-season shape). `RUN185.bat`, chain-guarded on 184. **SHIP43.bat is the current wrapper: it runs 157 through 185.** |
| Packaged 2026-08-19, 05:02 UTC | **Round 186** (S-3 third pass: the season curtain in all four My Career games. Playing a season now opens a staged reveal, the year slams in, the team result lands big, a title pours confetti, and the story lines (camp, awards, pressers, progress) tick in verbatim in engine order, then Continue hands over to the crossroads exactly as before. One shared engine usCareerReveal.ts (fifth in the one-engine-four-sports family) decides presentation facts; one shared card SeasonRevealCard renders them. House rules kept and pinned: confetti ONLY on a result starting WON THE, with MLB's "Lost the World Series" as the explicit trap case since MLB words every exit "Lost the ..."; suspended years get the muted card (no confetti, no stat line, no per-line theatre); the stat line is the true final from frame one (the Round 147 lesson); the engine invents nothing, every line is byte-for-byte a string the sport engines wrote. The reveal is TRANSIENT, never persisted, so a reload mid-curtain opens the save's real screen, the market-window precedent. simSeasonReveal is harness 62 (confetti truth table across all four sports' exact result strings, muted ban card, verbatim-and-ordered lines, emoji tone dialect, 480 seeded integration seasons proving confetti tracks the ring count exactly); playSeasonReveal is the tenth browser walk (19 checks: curtain up, year and true stat line on card, Continue handover, reload transience, muted ban card, NBA cross-render). playCareerPress gained the Continue click, WITHOUT WHICH IT STALLED, the reveal preempting the crossroads is exactly the kind of cross-cutting change the walks exist to catch; playDepthChart and playFreeAgency rerun green untouched). `RUN186.bat`, chain-guarded on 185. **SHIP44.bat is the current wrapper: it runs 157 through 186.** |
| Packaged 2026-08-19, 05:30 UTC | **Round 187** (S-3 fourth pass: the verdict curtain in all four Front Office games. The GM recap stages in place, every Round 180 string untouched: the champion line slams in, ownership's verdict lands a beat later, playoff results tick in, the trust line rises, and the champion GM's card pulses gold under confetti. stageVerdict joins usCareerReveal.ts so the rule is harnessed, not JSX folklore: confetti = iAmChampion AND not fired, all four combinations pinned including the engine-unreachable title-and-fired combo (belt and braces, a presentation layer should not trust arithmetic from a distance). The firing, both on the recap and on the dedicated fired screen, gets one honest cm-loss-shake and a grey card, never a celebration. simSeasonReveal grew section 6 (the four-combo truth table); playOwnerMandate grew two DOM checks (the recap IS the staged card, and a fired GM's card contains ZERO confetti pieces), 28 for 28 against the built site). `RUN187.bat`, chain-guarded on 186. **SHIP45.bat is the current wrapper: it runs 157 through 187.** |
| Packaged 2026-08-19, 06:00 UTC | **Round 188** (S-3 fifth pass, closing the named list: the home page tile curtain. Every game section reveals once as it scrolls into view, tiles rising in a 60ms stagger capped by a modulo 9 so deep grids settle fast. Implementation is one observer per section that disconnects after firing, transforms and opacity only so no layout shift, search results deliberately excluded because search must feel instant, and prefers-reduced-motion kills the animation entirely (tiles instantly visible, animationName none, PROVEN by computed style under an emulated reduced-motion context). playHomeReveal is the eleventh browser walk, 10 for 10: wrappers exist, the first grid fires as it enters the viewport (on a phone nothing is revealed at load because no grid is in view, which is the design working and the walk documents it), a full scroll leaves zero sections hidden and zero tiles transparent, the stagger is real (0s then 0.06s then 0.12s read from the DOM), a revealed tile still navigates, and the reduced-motion contract holds. simMobileChrome rerun green against the build. Also for the record: the last S-3 named candidate, Soccer Career match moments, was found ALREADY covered by earlier rounds (staged entrances plus trophy confetti on the season summary, event, World Cup, UCL and legacy cards), documented with line references instead of re-shipped. And this round's suite run read a single tail in UNSEEDED simFinance, which no 188 code touches (fair-vs-premium crowds over ten unseeded home games briefly inverted, 26.9k vs 27.3k against a 1.06 bar); five straight reruns green. First tail this harness has ever thrown; treat single reads as noise per the simOpposition lesson, and if it RECURS, widen the sample or seed the streams rather than nudging the 1.06 bar, because both directions of that trade-off are load-bearing). `RUN188.bat`, chain-guarded on 187. **SHIP46.bat is the current wrapper: it runs 157 through 188.** |
| Packaged 2026-08-19, 07:06 UTC | **Round 189** (CM-6 wave 3 complete to the verifiable floor: Croatia's SuperSport HNL, the twentieth league. Membership two-source verified with a wrinkle worth recording: the usual season-page sources were cache-stale for exactly the rows that mattered, so the verification is rezultati.com's LIVE 2026-27 fixture list naming exactly ten clubs, agreeing with the season math where every leg has its own source (Vukovar 1991 relegated 10th of 10 per their Wikipedia club page; Rudeš promoted per Index.hr and Vrisak.info, both 2026-05-23; Dinamo Zagreb champions, their 26th, per the league overview and the April 2026 press). 31 players baked by the standing curve; the DB's Croatia traps documented in the mapping comments (FK Istra is Serbian, ND Gorica is Slovenian, the Dinamo family spans eight countries). The Özcan pass caught FIVE moves, two of which contradicted shipped rows at big clubs and were web-verified before trusting the data: Livaković Fenerbahçe to Dinamo (fussballeuropa, karlobag.eu and the Turkish press, July 2026) and Beljo to Dinamo (FC Augsburg's own site), plus Vidovic from Bayern, Pérez Vinlöf from Austria Wien, Vignato from Monza; and EIGHT stale-2025 drops (Sučić stays Inter, Baturina stays Como, Pašalić stays Orlando, Prpić stays Porto, Mlacic stays Udinese, Smolcic stays Como, Pjaca stays Twente, Kulenović stays Torino). Istra 1961's only usable row was Valincic's 2025 Istra line, superseded by his own 2026 Dinamo row, so Istra join KNOWN_EMPTY honestly with Varaždin, Lokomotiva, Gorica and Rudeš. Engine fully wired (league, nation 🇭🇷, relegation 1 with the barrage note, one-ticket Euro shape, priors with Rijeka's 2025 title respected, colors); pins re-pinned 17 nations / 330 clubs; copy caught up everywhere; session probe 15 for 15 through the picker (Dinamo told to win it, Rudeš honestly partial, career started). AND the suite caught a real engine hole the new league exposed: in a TEN club league the sliding Conference window (uecl + 3 + title-band overshoot) reached rank 8 of 10, two places off the drop, so simBoard failed on "Osijek: Qualify for the Conference League". Fixed at the cause, not the symptom: the European windows now also stop at the top-half line (rank <= round(size x 0.65)), which changes nothing in the 14-to-20 club leagues where the floor sits below every window, and in small leagues turns the dishonest Europe ask into the honest stay-up it should have been. simBoard green after the fix, full suite rerun green on the fixed tree. World: 330 clubs, 20 leagues, 3,615 players. Wave 3 is CLOSED until a block lifts: Czechia stays unverifiable post-Karviná, Liga MX/Brazil/Argentina need the split-season shape). `RUN189.bat`, chain-guarded on 188. **SHIP47.bat is the current wrapper: it runs 157 through 189.** |
| Packaged 2026-08-19, 08:02 UTC | **Round 190** (S-5 optional extension, his exact words honored one desk over: "true negotiations not just 3 buttons that say haggle." The GM games' direct trade was precisely that, propose and get accepted or the dial tone with one silent +Pick button, and now it is a phone call. One shared engine foTradeTalks.ts (seventh in the one-engine family): the other GM reads the value gap and answers like a person, a fair swap shakes on the spot, a pick-coverable gap counters "add a pick and we are done", a bigger gap names the best man they would GENUINELY move for your offer (a real player off their roster, the engine invents nobody), and an insult gets the dial tone. STAND FIRM is a one-shot per call, the Round 179 push precedent: odds from measured leverage (base 35, plus 12 when their cover at your man's position is thin, plus 8 selling age 26 or under, clamped 20 to 60, constants documented), blink resolves the ask at 1.02, sour at 1.15 which can downgrade the counter or kill the call. Each sport lib gained executeTalksTrade which enforces only the hard rules (floors, salary matching) and honors the agreed premium, so a blinked 1.02 deal executes where the old 1.07/1.08 threshold would have hung up, pinned in the harness. Sport asks preserved exactly (NFL 1.08 open, others 1.07, pick values 14/12/12/13). The trade FINDER is untouched: it finds already-fair deals. Talks are transient, never persisted. simTradeTalks is harness 63 (the ladder against its exact arithmetic, the one-shot rule, odds bands, execution honoring the agreement in all four libs, 800 seeded integration calls with the full outcome spread); playTradeTalks is the twelfth walk, 20 for 20 (the handshake deal lands and Darnell Mooney ACTUALLY ARRIVES on the roster read from the DOM, the push button dies after one use, walk-away and reload both hang up, the shared card serves the NBA desk too). Copy caught up in all four sports plus What's New. AND the simFinance tail RECURRED on this round's suite (second time after 188), which per the standing rule meant fixing it properly, not renudging: the fair-vs-premium crowd sample widened from 10 to 40 home gates per tier (the engine offers no rng injection there) and the bar was RE-DERIVED with the arithmetic in the harness comment (band noise sigma 4330 puts the 10-game ratio sigma at 0.086 with the old bar only 1.2 sigma under the true 1.165 mean, an eleven percent flake per run; at 40 gates sigma is 0.037 and the 1.04 bar sits 3.4 sigma under, one spurious failure in thousands). Five straight greens after, observed ratios 1.081 to 1.188). `RUN190.bat`, chain-guarded on 189. **SHIP48.bat is the current wrapper: it runs 157 through 190.** |
| Packaged 2026-08-19, 09:02 UTC | **Round 191** (CM-5's last open item, more era leagues: the 2015-16 SERIE A joins the Leicester era, taking it to three leagues, 60 clubs and 1,098 real players. Membership two-source verified (Wikipedia season page: Juventus champions, their fifth straight, Carpi/Frosinone/Bologna up; worldfootball fixture list names exactly the twenty). Baked via a NEW EXTEND MODE in bakeEra2015.mjs, documented in its header: the shipped era file is the byte-exact truth for the first forty clubs (the original dumps were session files), the Serie A arrives from a fresh base-table dump (same documented SQL shape, 347 names), and the set-level audit proved 766 of 767 shipped player lines preserved byte for byte, the one loss being Sporting Gijon's fringe Carlos Carmona to the documented one-name-one-player rule (four such collisions resolved by the standing higher-value rule: two Fernandinhos, two Rafaels, two Carmonas, two Alvaro Gonzalezes). The summer 2015 window applied across all three leagues, EVERY correction verified against year-2016 rows queried 2026-08-19: 46 moves (Dybala Palermo to Juventus, Dzeko and Salah and Szczesny to Roma, Kovacic OUT to Real Madrid, Savic to Atletico, Darmian to Man United, Inler and Benalouane to the CHAMPIONS, Cuadrado/Neto/Rugani/Zaza to Juventus, Hysaj/Allan/Valdifiori to Napoli, and more), 21 removals, 10 arrivals (five of them RE-ADDITIONS of rows Round 175 removed as having left the two-league world for what turned out to be Serie A: Mandzukic, Khedira, Bacca, Balotelli, Murillo), 1 Shaqiri fold, and TWO single-source removals documented as the honest asymmetry (Pirlo to New York and Eto'o to Antalyaspor have no year-2016 rows because the table does not track those leagues, but keeping them would be affirmatively false and a removal invents nothing). Engine wired (era league def, euro slots ucl 3 with no Conference in 2015, six era-only club colors); era copy updated everywhere including the honesty line (60 clubs); simEra2015 re-pinned (three leagues, Juventus told to win it, meta 1098/60) and grew NINE verified namesake allowlist entries with receipts (the Milan keeper Diego Lopez vs Valencia's winger, Carpi's keeper Gabriel vs Arsenal's centre-back, two Dodos, two Romulos, two Edersons, two Danilos, two Gabriel Silvas, two Guilhermes, plus the 2010-vs-2015 David Lopez pair); playEra2015 grew the Italy walk (13 new checks: Dybala ARRIVED read from the real dressing room, Vidal GONE, Pogba stayed, Frosinone honestly partial, Como absent, Juventus demanding the title), 30 for 30 total. simEras/simClubManager/simWorld green). `RUN191.bat`, chain-guarded on 190. **SHIP49.bat is the current wrapper: it runs 157 through 191.** |
| Packaged 2026-08-19, mid morning | **Round 192** (S-5's last named extension, GM-side press, closing the parity item COMPLETELY: the four Front Office games now put the GM at the podium via one shared engine, foGmPress.ts, and one shared GmPressCard. The season's real facts pick the presser with strict priority (fired gets NOTHING per the Round 187 one-shake rule, then the champion's podium, then the accountability scrum on a missed or badly grade, then the trade question if a headline deal happened in a steady year, then the hiring-day introduction as the only out-of-season presser), and a quiet mandate-met no-news summer is PROVABLY quiet. Three registers per presser, measured, candid, bold, same triangle as the career press room, but the stakes are the GM loop itself: every answer moves the Round 180 TRUST meter (flat effects exact, gambles at stated odds, trust floors at 1 so the room can bruise you but only a graded season can end you), and the season-end answers carry a TILT that moves next season's mandate one tier through buildOwnerMandate's new optional tilt parameter (promise the repeat and the ask ratchets up, ask for patience and it softens at a small trust cost; the defending-champion floor survives a temper, and tilt 0 is proven byte-identical to the pre-192 mandate for every rank in every league). The headline deal is remembered from either trade path (talks or finder) and persists; the presser itself is transient like trade talks, a reload ends the scrum, but an ANSWERED tilt survives to the next mandate build and the recap's draft button waits while the room does. simGmPress is harness 64 (presser selection matrix across all four sports, priority, the provably quiet summer, the no-presser-for-the-fired pin including the unreachable title-and-fired combo, exact flat arithmetic, gamble odds within 3.8 sigma over 4000 seeded rolls, floor and cap, the tilt ladder, the tilted mandate including champion floor, and the byte-identity of omitted tilt). playGmPress is the twelfth browser walk, 30 for 30: introduction on the hub with Trust 60 to 63 read off the owner card after the measured answer, the doomed-season scrum ON the recap with the draft button held back, the patience answer's softer-bar line surfacing in the feed after the draft, no presser resurrection on reload, and the other three hubs speaking their own sport's title. The four FO pages' howToPlay each gained the press line. ALSO: the seven round stamps for 185-191 in this table were corrected to their true 2026-08-19 UTC times, the prior session's internal clock had drifted a day ahead; the AdSense review one-shot is Thursday 2026-08-20 14:00Z per the actual scheduled task, not Wednesday as one earlier note said. Suite state: 63 of 64 green in one run plus a single DOWNSIDE tail in UNSEEDED simOpposition's goals-effect check, rise measured 0.24 against its 0.29 one-bar margin where the documented true effect is 0.96; the standalone rerun measured a healthy 1.30, so this was that check's FIRST tail ever, a 2.5 sigma downside draw. If it RECURS, widen RUNS or seed the two arms, do NOT lower the one-bar margin, the check's own header derives why one bar is already the honest floor.) `RUN192.bat`, chain-guarded on 191. **SHIP50.bat is the current wrapper: it runs 157 through 192.** |
| Packaged 2026-08-19, midday | **Round 193** (CM-7's release clauses, and the desk that was never on the wall: renewals become a real negotiation. renewalTermsWithClause offers 88 percent of the wage for a release clause at 1.5x sell value TODAY (documented against Round 71's buy-side range); renewContractWithClause writes the door, renewContract now DELETES any clause as the full-price counter-move. The clause lives: generateIncomingBids (now exported for the harness) hunts clauses FIRST at a bargain-scaled rate (0.9 x (sellValue/clause - 0.6) clamped [0.03, 0.75], a third on weekly top-ups; measured 7.5 / 39.5 / 74.3 percent at ratios 0.67 / 1.0 / 1.5 against 4-sigma bands), scanning PAST transferStatus because blocking cannot un-sign a door; the bid arrives at exactly the clause with clauseMet, rejectBid refuses to touch it, setTransferStatus 'blocked' kills plain bids but never a met clause, and an unanswered clause EXECUTES ITSELF on deadline day through the real acceptBid path (Object.assign onto the weekly draft so it can never drift from a manual accept), with the one honest stop being canLeaveSquad (the last goalkeeper cannot be sold through the floor, and the collapse makes the news). THE MOUNT FIX: ContractsCard was built in Round 105 and never rendered ANYWHERE (verified via git grep at head e3e9201), so renewals were unreachable for 88 rounds; it now lives on the Squad tab with two-button rows (full wage vs clause deal with exit number), a granted-clauses ledger sorted by bargain ratio with A BARGAIN warnings, and a Remove-via-renewal button. Copy caught up: the help popover gained the contracts paragraph, the SEO howToPlay the contracts-desk line, soccer1's rules line the clause sentence, What's New confesses the mount bug plainly. simReleaseClause is harness 65 (terms arithmetic exact, sign and delete, three trigger-rate bands with sigma math in the header, no-clause world never sees a clauseMet bid, reject impossible + block useless + accept exact + blocked players still hunted, deadline-day execution asserted via the transfer LEDGER because Round 171 gate receipts contaminate a budget-delta read, the squad floor collapse headline, dash scan). playReleaseClause is the thirteenth browser walk, 15 for 15 (desk on the wall, clause signed, ledger appears with the exit number, survives reload, deleted by the full-price renewal; the modern club tile reads "Newcastle" not "Newcastle United", probed against the real build). simContracts, simTransfers, simDealDepth, simClubManager and the full playClubManager season walk all rerun green.) `RUN193.bat`, chain-guarded on 192. **SHIP51.bat is the current wrapper: it runs 157 through 193.** |
| Packaged 2026-08-19, early afternoon | **Round 194** (CM-7's LAST open line, the nationality filter, closing the item COMPLETELY: src/data/playerNationalities.ts carries one nationality map per sealed world, 6,262 entries over all 6,262 world names (3,615 modern, 1,098 era2015, 802 era2010, 747 era2005), 132 nations, baked by scripts/bakeNationalities.mjs from player_market_values via twelve batched queries run through the MCP, each world resolving names INSIDE ITS OWN YEAR WINDOW (now: year >= 2025 prefer 2026; era2015: 2015 or 2016 prefer 2015; and so on), because A NAME IS NOT A PERSON: the 2010 world's Aaron Ramsey is the Welshman at Arsenal, the modern one is the English midfielder, and a single latest-row map would have invented one of them. Fail-closed bake rules documented in its header: exact per-batch line counts, at most 3 unresolved names per world (omitted honestly, currently zero after two receipts: Lucas Silva pinned Portugal per the Round 185 Soccerway receipt as belt and braces, Sandro Tonali gap-filled Italy via a targeted any-year query because his table rows stop at 2022 and every one says Italy), duplicate-names-in-world asserted zero, and every nationality must have a FLAG_CODES entry, which grew 13 verified ISO codes (Guyana, Central African Republic, Gibraltar, Barbados, St. Kitts & Nevis, Grenada, Seychelles, Martinique, Chad, Burundi, Yemen, Mauritania, Saint-Martin). UI: the market's deep filters gained the nationality dropdown (data-nat-filter, nations drawn from THIS world's market only, busiest first, live player counts) and market rows plus SquadScreen rows now carry FlagImg flags (made-up players honestly get none; SquadScreen takes eraId). simNationalities is harness 66 (total coverage, no map leakage between worlds, the Ramsey and Lucas Silva cross-world pins, sixteen famous two-source pins, flag completeness, the honest lookup edges, dash scan). playNationalities is the fourteenth browser walk, 17 for 17 (filter present with 120 nations offered in a real market, narrowing verified stray-flag-free, reset restores the list, squad flags, and the 2010 Ramsey reading Wales off the real DOM; the hub tab is labeled Market not Transfers, caught live). Copy: the popover market paragraph, the SEO howToPlay market line, soccer1's rules line, What's New. playReleaseClause and playEra2010 reran green against the flagged screens.) `RUN194.bat`, chain-guarded on 193. **SHIP52.bat is the current wrapper: it runs 157 through 194.** |
| Packaged 2026-08-19, just after midday UTC | **Round 195** (S-1's LAST open line, closing the item COMPLETELY: per-session play marks for the nine games that never counted. The four Front Office boards call unscored recordCompletion at the top of playWeek/playRound after the null guard ('/front-office', '/nba-front-office', '/nhl-front-office', '/mlb-front-office'), the four My Career boards do the same at the top of playSeason ('/nfl-my-career', '/nba-my-career', '/nhl-my-career', '/mlb-my-career'), and useStadiumTycoon gained sessionMarkedRef + markSessionPlay(), invoked first in doBuy, doHire and doTap so one sitting is one mark however many taps land (a ref, never state: marking must not re-render the tick loop). Unscored ON PURPOSE everywhere: the scored completion stays the retirement legacy / the title via useGameCompletion, untouched in all eight boards, and the idle game never sends a score at all. simSessionMarks is harness 67, a static guard in the simNoRivalNames tradition: per board exactly one unscored call with the exact route path inside the play function after the guard within 500 chars, no direct scored call anywhere, useGameCompletion retained, the tycoon's guard-latch-mark ref shape in order, every marked path a real App.tsx route, the Round 157/159 precedents still standing, dash scan. playSessionMarks is the fifteenth browser walk, 17 for 17, and its method is the point: it intercepts every game_completions request, answers for supabase, and counts POST bodies, zero after page load, zero after picking a franchise, zero after looking at the fixture tab, one after one FO week and two after two (every play counts, the CM rule), one per tycoon sitting across three taps with the ref holding, one more after a reload (per session means per session), zero for creating a career, one for playing a season, and every single body scoreless with a guest handle. The FO hub catch: the play button lives on the This week tab, the hub opens on team. playGmPress, playOwnerMandate, playDepthChart and playFreeAgency reran green over the touched boards. What's New leads with the confession that nine sims never counted. The 195 suite: 66 of 67 green in one run (simSessionMarks is 67) plus a FIRST-EVER tail in UNSEEDED simInternational: its career batch honestly produced zero World Cup winners so the winner-vs-capped legacy comparison had nothing to compare; the standalone rerun drew 7 winners against 40 capped players and passed everything. Round 195 touches nothing simInternational reads. If it RECURS, top up the career batch until both cohorts are non-empty rather than weakening the comparison: the check is about the legacy formula, not winner frequency, so more careers is the honest fix.) `RUN195.bat`, chain-guarded on 194. **SHIP53.bat is the current wrapper: it runs 157 through 195.** |
| Packaged 2026-08-19, afternoon UTC | **Round 196** (his standing "keep going" on the idle game: THE LEGACY BOARDROOM, a prestige shop, the genre layer Stadium Tycoon was missing. Selling up pays legacyPoints = 1 + divisionIndex READ BEFORE THE RESET, so cashing out at the bar pays 1 and a Summit sale pays 10, and the sell-up button quotes the number plus what one more division would pay: the decision IS the feature. Eight capped perks costing exactly 100 points in total: sway (5 levels, +10% income each, the only one that touches the income line), rolling (3, seed money 500/2500/12000 in the next till), roots (3, +15% fan growth), payroll (3, +20% staff rate, applied inside staffBaseIncome so the payroll line and the income line cannot disagree), shield (1, a loss halves the streak DOWN instead of zeroing it, so a streak of 1 still dies), away (2, 65%/10h then 80%/12h), voltage (2, hype charge 480/420/360s, boostReady and the tick clamp both read boostChargeSecOf so the bar fills exactly when the button lights), charm (2, timed whistles x1.25 per level, instants untouched). Perks and points survive every sale; the ladder and payroll still do not. Fail-closed load: only real perk ids, integer levels clamped per cap, points clamped 5000, non-numeric to zero, and a ONE-TIME migration granting 1 point per existing star to pre-boardroom saves latched by legacySeeded read off the RAW parsed save (the base template carries the flag, so the spread would have masked old saves). doLegacyPerk marks the session per Round 195, so simSessionMarks now expects FOUR markSessionPlay call sites. simStadiumTycoon grew section 13 (board costs exactly 100, Summit pays 10, every effect measured at its cap: sway x1.5, roots x1.45, payroll x1.6, voltage 480/420/360 with a live tick clamp, polished frenzy 115.5s, away x1.3 for an hour and the 12h x 0.8 week cap to the dollar, rolling seed 12040 exactly, shield 8 to 4 and 1 to 0, a MAXED board multiplying fresh income by exactly 1.5 and nothing else, tamper and migration matrix). playLegacy is the SIXTEENTH browser walk, 19 for 19; its method is worth keeping: the tycoon writes state to localStorage on every pagehide, so doctoring a save on the live page and reloading gets overwritten, and the walk instead shares ONE context, closes the game page (farewell save lands), edits from a helper page on /robots.txt where the app does not run, then reopens the game, which puts deserialization on trial by the real road. The 196 suite: ALL 67 node harnesses green in ONE run, simInternational among them, which retires the Round 195 tail as the one-off it was diagnosed to be. ALSO fixed this round: pkg/verifybat.py, the packaging verifier, was comparing every file against the PREVIOUS round's zip, so a file that skips rounds (gameRegistry.ts last shipped in 189) had its absence assertions reported as vacuous when they were genuinely stale. The baseline is now the newest pending zip below nn that actually contains the file, a first-time file's absence assertion is REFUSED as unprovable, and rounds 193 to 196 all re-verify at BAD: 0 under the corrected rule.) `RUN196.bat`, chain-guarded on 195. **SHIP54.bat is the current wrapper: it runs 157 through 196.** |
| Packaged 2026-08-19, evening UTC | **Round 197** (his 2026-08-19 screenshot ask, THE ACTUAL STARTING ELEVEN, plus the find it turned up. SquadCall gained xi: StartingEleven, built inside pickSquad by buildStartingXi from the SAME rivals pool the rank was measured against, so the sheet can never contradict the rank. 4-3-3, one shape on purpose: XI_SHAPE lists the eleven shirts, XI_FILL says which shirts the best men take (CB CB RB LB, CM CM CDM, ST RW LW), the player takes the shirt his own position names and a CAM keeps the CAM label on a central midfield shirt (a manager shifts a shape for the one man he will not leave out). Called and inside the starters for his group means mySlot and me: true; called but outside means mySlot null and aheadOfMe NAMES the last starter keeping him out; not called at all means the eleven still renders without him, which is the point. InternationalPanel's rank/places/score grid is GONE, replaced by data-team-sheet with four lines and data-xi-man cards, gold for him, and one plain line underneath. Old saves have no xi and fall back to the written lines. THE FIND: the other ten are invented, so the generator was audited before shipping, and the career engine's existing GEN_FIRST_NAMES x GEN_LAST_NAMES banks turned out to produce SEVENTY SIX real footballers' exact names out of 1,900 pairings (Mohamed Salah, Victor Osimhen, Lautaro Martinez, Darwin Nunez, James Rodriguez, Bernardo Silva, Luis Diaz among them), with four more from the rivalry banks (Lucas Silva, Lucas Hernandez, Joao Costa, Florian Muller). An invented man with invented goals could therefore appear under a real person's name, which this project has never allowed. Both generators now draw from src/lib/intlNames.ts: 34 naming traditions, 12 firsts x 12 lasts each, 146 nations mapped, and the whole 4,896-name space enumerated by the harness against all 5,622 real names in the four Club Manager worlds plus the engine's 28 named real contenders. Zero collisions. The unguarded banks were DELETED, not left dead, and section 6 of the harness fails if a const of those names ever comes back. simStartingXi is harness 68 (shape, rank consistency over 400 careers, ten positions to ten shirts, Spain's eleven outrating Luxembourg's by 22, the collision enumeration, the static guard, total nation coverage which is how 46 missing nations were found and mapped, name stability). playStartingXi is the SEVENTEENTH browser walk, 22 for 22: it creates a real career through the real create screen with Radix typeahead (clicking an option a hundred deep fights the popper's own scroll buttons), fast-forwards the save from /robots.txt where the app does not run, plays on until a real tournament lands, reads the sheet off the DOM, proves the score readout is gone, and then forces him into the eleven by save patch to prove the highlighted branch renders. The walk's advance loop had to learn that career choice cards block it, and that the consent bar eats clicks meant for the form. The 197 suite: ALL 68 node harnesses green in ONE run, simSoccerCareer and simInternational included, so rewiring both name generators changed nothing else. pkg/verifybat.py grew a second baseline rule this round: a file no pending zip carries (InternationalPanel.tsx) is compared against the clone's committed HEAD, which is the true pre-round state while 157+ sit unpushed; only a genuinely new file has no baseline and refuses absence checks.) `RUN197.bat`, chain-guarded on 196. **SHIP55.bat is the current wrapper: it runs 157 through 197.** |
| Packaged 2026-08-19, late evening UTC | **Round 198** (his second 2026-08-19 ask, "make sure every page is good to be indexed", read as: every one of the 124 live routes either earns a result AND is reachable from inside the site, or says noindex. FOUR REAL FINDS. (1) Five retired games (/higher-lower-transfers, /shirt-number, /pack-battle, /football-timeline, /guess-nfl-team) have live routes kept for old links but sit in no menu and no sitemap, so a search result was the only door in and there was no door onward; noindex, follow now, which keeps the links flowing and keeps old bookmarks working. NOTE the other seven retired entries are Navigate redirects whose page files are DEAD (never imported by App), so they were left alone deliberately. (2) /profile and /reset-password were indexable by accident, and AdminLogin/AdminReports had NO head tags at all; all four closed, admin also disallowed in robots. (3) robots.txt had grown TWO "User-agent: *" groups, which Google merges and other parsers do not; collapsed to one with the admin disallow inside it. (4) THE BIG ONE BY REACH, AND THE ROUND'S BEST LESSON: GameSeoContent rendered its heading as an h1, and most game pages also print their own, so about forty pages shipped two competing first-level headings. The first fix was to make it an h2 everywhere, which was WORSE and was caught before shipping by a browser sweep: 82 of the 119 pages carrying that block have NO headline of their own (their board is the whole page), so a blanket h2 would have left them with zero h1s, which is weaker than two. The shipped answer is a pageHasOwnH1 prop: the block renders h2 under a page that already has a headline and h1 where the page has none, identical classes either way so nothing moves on screen. 110 page files pass the flag, and simIndexing section 6 recomputes the truth (literal h1, or GameShell handed a title, resolved TWO hops because the shape is page to board to shell, with the SEO components excluded or every page looks like it has one) and fails if a page's flag disagrees with its real headings in either direction. A 115-page browser sweep confirmed exactly one h1 everywhere except /guess-the-nation, which in this sandbox sits in its no-data error state (no Supabase route here) and renders neither its own h1 nor its shell. ALSO FOUND while chasing it: /transfer-path and /shirt-number rendered GameSeoContent TWICE, once in the page and once in the board, duplicating the entire guide and its FAQ structured data; the board copies are deleted and section 6 fails if any component renders the block again. Also: /college is a real hub with unique copy and links to every college game and was in NO menu and NO sitemap, so it was unreachable and unlisted; it is in STATIC_PAGES in genSitemap and linked from the home page's College Sports heading, because a sitemap entry nothing links to is a page a crawler may ignore. Also: the home page's canonical carried a trailing slash while the sitemap submitted the bare host, one URL announced and another pointed at; genSitemap now emits the slash to match PageSeo exactly. PageSeo gained noindex (emits "noindex, follow", keeps the self canonical, and DROPS the Game structured data, because a page that should not rank has no business advertising itself as a Game). simIndexing is harness 69: the must-noindex list, the sitemap-vs-live-route reconciliation in both directions, the college hub's link AND listing AND generator entry, duplicate title/description across all 122 indexable pages (0 and 0), no indexable page without a head, robots.txt shape, and the contradiction rule that a URL can never be both submitted and noindexed. Its PageSeo parser had to learn expression props: Profile builds title and path from state, and a template literal's own ${} braces end a non-greedy match early, so the path is read as the last route-shaped literal after "path={". playIndexing is the EIGHTEENTH browser walk, 40 for 40, and it reads the RENDERED head because Helmet builds it at runtime: title, description, self canonical, robots absent on indexable pages and exactly "noindex, follow" on hidden ones, structured data present on one side and absent on the other, exactly one h1 per page, unique titles across the walk, plus robots.txt and sitemap.xml served and agreeing. playRelatedGames rerun green. The playGames sweep (119 games, 46 the harness cannot drive without typed answers) surfaced 12 COPY findings that were all ONE false positive in its own grammar rule: /\byou (is|has|...)/ fired on "the man ahead of you is as good as your team is", where "you" is the object of a preposition and the verb belongs to "the man". The rule in playGames and sweepGames now clears a "you" preceded by any of 30 prepositions and still catches a real "you is" or "you has"; both files' own dash-hunting rules were converted to codepoint escapes at the same time, per the simEras convention. Its STALL and DEAD classifications are the sandbox having NO route to supabase.co: those games render their honest "could not load today's ... try again shortly" state with a link home, which is also why /guess-the-nation was the one page in the h1 sweep without a heading. The 198 suite: ALL 69 node harnesses green in ONE run.) `RUN198.bat`, chain-guarded on 197. **SHIP56.bat is the current wrapper: it runs 157 through 198.** |
| Packaged 2026-08-19, night UTC | **Round 199** (finishing what Round 197 started, plus a roadmap audit. THE RULE: no invented man on this site may carry a real person's name, now enforced across ALL TEN name generators, not just the two soccer ones. simInventedNames is harness 70: it harvests ~8,661 real names (every `name:`/`n:` literal in src/data plus all four sealed worlds), multiplies out every bank, and fails on any collision. FOUR MORE FINDS: Club Manager's youth academy could name an academy kid Noah Okafor or Diego Costa; nhlFrontOffice's free agent bank could produce Ilya Sorokin; and Round 197's own southernAfrica pool could produce Themba Zwane, which only the WIDER harvest catches (197 checked against the sealed worlds alone). All four names removed. FOUR generators had nobody checking them at all (clubManagerEras GEN_, and the MLB/NBA/NHL front office FA_ banks) and are registered now; section 4 scans src/lib for bank-shaped consts and fails on any that is unregistered. THE SUBTLE ONE: clubManagerEras.makeGeneratedName already guards ITSELF at runtime by re-rolling any pair that matches a Club Manager roster, so its raw cross-product legitimately contains collisions it can never emit (Bruno + Fernandes among them) and a naive static check is WRONG there. The harness therefore splits: unguarded banks are checked statically, and the guarded one is EXERCISED (20,000 rolls, 13,395 distinct names, zero real) AND statically reconciled: of its 32,000 pairings exactly five are real people its roster-only guard cannot see (Cesar Ruiz, Erik Karlsson, Isaac Paredes, Rasmus Falk, Thiago Silva), now listed in ALSO_REAL_ELSEWHERE with the reasoning, and the harness recomputes that list from the data so it can never fall behind. ALSO: the "Standing large items, still open" roadmap was audited line by line against the live code and rewritten. Most of it had been false for months: TACTICS DRAG, listed as "asked for twice and still not done", has been shipped and working (TacticsScreen has pointer drag with a keyboard fallback); the league count said 10 leagues and 186 clubs against a real 20 and 330; the ticker, internal links, profile page, trade finders, academy, scouts, facilities, calendar and match animation were all listed open and all exist. Genuinely open now: sponsors in CM, national team football inside CM, the sacked-manager unemployed state, WebKit QA, the sitewide tile reformat, the competitor depth audit. The 199 suite: ALL 70 node harnesses green in ONE run.) `RUN199.bat`, chain-guarded on 198. **SHIP57.bat is the current wrapper: it runs 157 through 199.** |
| Packaged 2026-08-19, night UTC | **Round 200** (SPONSORS, the last unbuilt line of his Club Manager epic, which the Round 199 audit had just identified as the one thing genuinely left. Whenever state.sponsor is null the Finances desk offers THREE SHAPES, not three numbers: safe (most guaranteed money, no bonus, 2 seasons), performance (0.72x the money plus a title bonus of 0.9x base, 2 seasons), long (0.6x the money, a top-half bonus of 0.25x base, 4 seasons). Base = clamp of stature (tier 1/0.62/0.4/0.26) x Europe 1.35 x trophy form (up to +24 percent) x era 0.7, times 34. Offers are DETERMINISTIC per club+season (a string hash, not Math.random), so a reload cannot shop for a better table. signSponsor pays year one on the spot and refuses a second deal. startNextSeason does the whole ledger: bonus for the season just played (off the summary's real position and the live table size), then a year off the term, then next year's guarantee, then the deal ends and the club goes shopping. Moving club sets sponsor null, the Round 171 rule that the ground and the books belong to the club. simSponsors is harness 71, and its method is worth copying: a rollover moves plenty of money that has nothing to do with sponsors, so EVERY figure is measured as the difference between an identical rollover with the deal and with sponsor: null, which isolates the sponsor from the board's own budget. That method caught the first version of the check reporting a -10.0 "payment". Section 7 enumerates the 20 invented brands against 40+ real sponsors, kit makers and betting firms, substring-matched so "Emirates Freight" would fail as hard as "Emirates". playSponsors is the NINETEENTH browser walk, 15 for 15: takes the Newcastle job, opens Finances, reads a fee off the card it is about to sign, signs it, and asserts the kitty rose by exactly that number, then reloads (through the Resume Career screen) and finds the deal still there. The 200 suite: ALL 71 node harnesses green in ONE run, and playClubManager played a full season through the changed engine with 0 findings.) `RUN200.bat`, chain-guarded on 199. **SHIP58.bat is the current wrapper: it runs 157 through 200.** |
| Packaged 2026-08-19, late night UTC | **Round 201** (THE WILDERNESS, from the corrected roadmap: being sacked ENDED the save, one screen with a share button and "Start New Career", which is the wrong shape for the one moment a manager game is really about. Now the sack opens an unemployed state. The offers come from the SAME engine the retired-player manager path uses (managerJobMarket.realJobOffers + managerOffers.generateJobOffers), fed by wildernessProfile(), which builds a ManagerProfile from what actually happened: trophies, title finishes counted as promotions, bottom-three finishes counted as relegations, seasons managed, the tier of the club that just sacked him, and departure 'relegated' when the last finish was 18th or worse. NOTE SeasonRecord holds only season/club/position/points/trophies, so promotions and relegations are DERIVED from finishes and the comment says so rather than inventing fields. Waiting is a real cost: seasonsOut = floor(weeksOut / 4), so four quiet weeks read to a board like a season on the sofa and standing slides (measured 55.6 to 18.1 over twelve weeks). One call a week at most (55 percent roll), table capped at four, the sacking club and anyone who already called are excluded, and at eight weeks with NOTHING on the table a floor job opens from the bottom tiers, because a save that can never continue is exactly what this round exists to end. Accepting runs startNextSeason(career, club), the same rollover every other move uses, so nobody takes over in March: that is the honest limit of a season-shaped engine and it is documented in the code. The Round 200 sponsor correctly does NOT follow him. simWilderness is harness 72 (the profile ladder winner 79.6 > plain 37.6 > relegation 22.6, the decay, 30 seeded careers all finding a job inside ten weeks, no callback from the sacking club, no duplicate callers, and the accept path rebuilding a real squad). playWilderness is the TWENTIETH browser walk, 14 for 14: doctors board confidence to 0.4 and the squad to 45 rated from /robots.txt, plays until the board acts, waits for the phone, takes the Southampton job and lands back in the hub. ITS LESSON: the loop first used a substring union whose "Continue" arm matched the transfer window BANNER, which navigated to the market and left the fixture unplayed for forty iterations; it clicks exact button names now. The 201 suite: ALL 72 node harnesses green in ONE run. ALSO: the Round 200 stamp in this table said 2026-08-20 when the clock read 2026-08-19 21:00 UTC, corrected here, the same day-ahead drift Round 192 had to fix.) `RUN201.bat`, chain-guarded on 200. **SHIP59.bat is the current wrapper: it runs 157 through 201.** |
| Packaged 2026-08-19, late night UTC | **Round 202** (THE INTERNATIONAL JOB, the last big line the Round 199 audit left open. Win enough and your federation calls: nationStanding() = club tier worth (26/16/8/3) + trophies x14 + min(seasons,12) x3 + win rate x30, threshold 70, so a rookie at Coventry scores 8, a giant's new manager 26 and a treble winner at City 102.5. The country offered is the CLUB's country, read off the NATIONS table, and ONLY if the international engine has a confederation for it. Sealed historic eras are excluded: those worlds are frozen and the engine runs on today's published rankings. Summers run at the season rollover on soccerInternational's REAL engine (Round 124), via a new runManagerSummer(nation, year, lift) that passes form: null throughout, so nothing reads a player's rating for a man who is not playing. The manager's contribution is a lift of 0 to 6 strength points from nationLift(), applied through a new overrideNationStrength() so it reaches qualifying, the draw AND the bracket consistently instead of being injected per match, and always unwound in a finally (asserted by rating the nation before and after, including after an unknown nation throws). Measured: over 120 summers England wins 31 with a maxed manager against 15 with none, which is a real edge and nothing like a guarantee. Winning goes in the cabinet with its own 🌐 mark; failing to QUALIFY ends the job; stepping down is always available and never costs the club. simNationJob is harness 73; playNationJob is the TWENTY-FIRST browser walk, 15 for 15 (doctors a decorated record from /robots.txt, finds the tile saying the country is calling, accepts, and reloads to prove it is part of the save). The 202 suite: ALL 73 node harnesses green in ONE run.) `RUN202.bat`, chain-guarded on 201. **SHIP60.bat is the current wrapper: it runs 157 through 202.** |
| Packaged 2026-08-19, night UTC | **Round 203** (THE SAFARI PASS, taking the WebKit line off the roadmap as far as this environment honestly allows. WEBKIT CANNOT BE INSTALLED HERE: `npx playwright install webkit` fails to download in this sandbox, verified this round, so every browser harness remains Chromium and that is stated in the harness rather than papered over. What IS possible: a static scan of shipped src for the patterns that work in Chromium and break in Safari, plus an iPhone device-emulation walk. THE FIND: src/lib/minefield.ts built its daily seed as `new Date(date.toLocaleString('en-US', {timeZone}))`, formatting a date to "8/19/2026, 10:00:00 PM" and handing it back to the parser. Only ISO 8601 is required to parse; Safari has historically returned Invalid Date for that shape, which would make the seed NaN and take the whole daily board down ON THE DEVICE HE PLAYS ON. Rewritten with formatToParts, and proven to produce an IDENTICAL seed (20684 both ways). Everywhere else already used the safe en-CA/formatToParts pattern, so this was the only one. simSafari is harness 74: bans the toLocaleString round trip and space-separated date literals (comments stripped first, or the fix's own explanation trips the scanner), bans regex LOOKBEHIND in src (a Safari <16.4 PARSE error, which blanks a whole chunk rather than failing one function; scripts/ stay free to use it, they run in node), bans five APIs Safari lacks or got late, bans hand-written 100vh (Tailwind's min-h-screen is exempted with the reasoning), checks the viewport meta allows zoom, and asserts this file keeps admitting what it cannot test. playIphone is the TWENTY-SECOND browser walk: Chromium under the iPhone 13 descriptor (3x DPR, touch, iOS UA) over ten pages, asserting zero horizontal overflow (the commonest phone bug), that the daily board DEALS after the fix, and that no control inside the page is under 30px tall. That last rule found MY OWN Round 198 bug: the College hub link shipped at 16px, half a thumb; padded to 30. The ticker and the footer are excluded with the reason written down.) `RUN203.bat`, chain-guarded on 202. **SHIP61.bat is the current wrapper: it runs 157 through 203.** |
| Packaged 2026-08-19, late night UTC | **Round 204** (THE TILE REFORMAT REACHES THE FOUR FRONT OFFICES, half of the roadmap's last big presentation item. All four GM games (NFL, MLB, NBA, NHL) opened on the SAME five word pills: Roster, Free agency, Trades, Play, Standings. Five words that tell you nothing, so you tapped Free agency to learn whether anyone worth signing was there, tapped Roster to learn your best man was hurt, and tapped Standings to learn you had fallen out of the playoff places. They are now the same five BOXES Club Manager has had since Round 74, each carrying the fact you used to have to tap for, and opening one REPLACES the grid rather than unrolling under it, which is the owner's own no-scroll rule. ONE ENGINE, `src/lib/foHub.ts`, decides what every box says, and ONE component, `front-office-shared/FoHubTiles.tsx`, draws it, so the four games cannot drift apart and the next family costs a facts object rather than a rewrite. The engine is sport-neutral by construction: the boards flatten their own state into FoHubFacts (roster, market, cap room, record, period, fixture, table place, cut) and the wording is decided in one harnessed place. Four accents, each meaning a decision is waiting: a man unavailable, a free agent who BOTH fits the room AND beats the 67th percentile of your roster, a payroll over the line, and a table place outside the playoff cut with under a third of the season left. The play box always pulses because it is why you opened the game. hasFixtures is a real field, not a nicety: only the NFL board holds a true schedule, so without it the other three would have claimed a bye week every round all season. simFoHub is harness 75: 14 save states including an empty roster, an empty market, over the cap, the postseason, a bye week and a team out of the table entirely, asserting no blank line, no undefined/NaN hole, and no headline over 22 characters (which CAUGHT "at Tennessee Titans" and cut the boards back to nicknames), plus both directions of every accent rule, both halves of the free agency rule, the four title strings the browser walks tap by, a static check that all four boards are converted and no pill row survives, and 17 weeks of a REAL simulated NFL season through the real engine. playFoHub is the TWENTY-THIRD browser walk: all four desks, five boxes each, every box opened and checked against a string only its own panel contains, the grid proven replaced rather than unrolled, the back control measured at 34px against Round 203's 30px thumb rule, and the boxes proven LIVE by doctoring a save to injure the best man and watching the roster box change its count, name him and light its dot, then clearing it and watching the dot go out. The four existing front office walks (playTradeTalks, playGmPress, playOwnerMandate, playSessionMarks) still pass: the box titles were deliberately kept as the exact strings they tap.) `RUN204.bat`, chain-guarded on 203. **SHIP62.bat is the current wrapper: it runs 157 through 204.** |
| Packaged 2026-08-20, early UTC | **Round 205** (THE MATCH TIMELINE STOPS CONTRADICTING THE MATCH. Found BY THE SUITE: the 204 run failed once in simMatchDetail on an assist that did not match its own goal, and the cause was real. Goal minutes were independent `ri()` draws from a 45 minute window, so two goals by the same man could land on the same tick and the timeline printed "18' Bellingham (assist: Mbappe)" directly above "18' Bellingham (assist: Asencio)"; the harness's find() by name+minute then returned the wrong row. FIX: one minute book per match, shared by both sides AND by the live viewer's preset first half, threaded through splitMinutes/pickMyScorerLines/generateMyScorers/generateOppScorers via a new distinctMinutes(). Verified 0 duplicates over 1,800 matches. THEN a wider probe of the same timeline found three more, two of them worse. (a) TWO YELLOWS, NO RED, in about ONE MATCH IN TEN: the 0-3 yellow draw was with replacement, so the same man could be booked twice and stay on. The second yellow now dismisses him with the 1 match ban a second yellow carries, and he takes no further part (no later card, no later goal). (b) A STRAIGHT RED to a man already carrying a booking, which reads as a second yellow but was reported and punished as a straight one: the straight red now only picks from unbooked men. (c) A MAN LIMPING OFF IN THE 33rd AND SCORING IN THE 88th, about one match in fifty: exit events (injury, red) now never precede that man's last goal, and the EXIT moves rather than the goal. BALANCE MEASURED, NOT ASSUMED: adding second yellows to a game that already sent men off would have doubled the suspension load, so SECOND_YELLOW_CHANCE = 0.25 (the referee usually books somebody else instead) and the straight red rate came 0.08 -> 0.06. Result over 2,100 matches: 8.7 percent of matches end a man short against 8.0 percent before, of which 2.5 points are second yellows. simMatchDetail grew section 7 (240 matches over 8 careers, all four rules, both play paths, rates banded 2-20 percent reds and under 10 percent second yellows, plus a static guard that the report card still draws red rows, card minutes and the events list) and its Round 169 assist lookup was made EXACT rather than name+minute, because a test that can pick the wrong row will lie again. NO NEW BROWSER WALK: no new rendering surface was added, which is why the static render guard is there instead.) `RUN205.bat`, chain-guarded on 204. **SHIP63.bat is the current wrapper: it runs 157 through 205.** |
| Next free round number | **204** (check the folder first, the 3-hourly build task may have taken it) |
| Round missing from history | 115. Never existed, do not go looking for it. |

### ⚠ The live deploy was triggered but not proven

Lovable was stuck on `9494d8e` (Round 128) for days. The Round 131 to 137 push unstuck it and it
resynced commit by commit up to Round 137, confirmed by reading `scripts/simNoInventedQuotes.mjs`
back out of it, a file that exists in no earlier commit. Note that its `latest_commit_sha` field
lagged one commit behind its actual file tree throughout, so **do not trust that field alone**,
read a file the round changed.

`deploy_project` was then called and returned `pending`, which the pipeline doc correctly says
is not proof. The usual live check (fetch the site, read the `index-*.js` name out of the HTML,
grep the chunk for a marker) **could not be completed from the cloud session**: the fetch tool
converts pages to markdown and strips script tags, so the asset name is unreachable, and
Lovable's build hashes do not match a local `npm run build`, so the name cannot be guessed
either. Whoever picks this up should confirm the live bundle moved before assuming it did.

### A pipeline capability that was not known before 2026-08-16

**A cloud session can get rounds pushed after all, without Anthony clicking anything.** It still
cannot push directly and it still has no credentials, so everything above about bats stands. But
the desktop bridge exposes computer-use tools, and File Explorer can be granted at `click` tier,
which is enough to double-click `SHIP7.bat` and let the existing chain run itself. That is how
131 through 137 landed.

The limits are real and worth writing down so nobody wastes a session rediscovering them:

- **Terminals, IDEs and the Windows shell are capped at `click` tier by the platform.** Visible
  plus plain left-click only. No typing, no key presses, no right-click, no drag and drop. So
  there is no typing a git command into a terminal, and no typing a path into the Explorer
  address bar. Navigate by clicking, and launch work by double-clicking a file.
- **`device_bash` cannot push.** It runs in a Linux VM on his machine with the folder mounted,
  but it has no network: `git ls-remote` fails with a 403 at the proxy. It is for file work
  only.
- This means the bat pipeline is not a workaround to be removed, it is the mechanism. Keep
  writing `RUNnn.bat` files exactly as `docs/SHIP-PIPELINE.md` describes. The only thing that
  changed is that a session can now click one instead of waiting a day for Anthony to.

### What each pending round is

| Round | Contents |
|---|---|
| 131 | Player creation: look options, height and weight with real attributes, no build cap below 99, rerolls against the potential cap. |
| 132 | Club Manager eras: era selector, club detail and squad and transfer screens. |
| 133 | Rival-name purge, 284 findings to zero across 843 files, plus the permanent guard `scripts/simNoRivalNames.mjs`. Renames Jeopardy to QuizBoard, which is why `RUN133.bat` deletes four old paths before committing. |
| 134 | Money becomes a real system: five assets that move between seasons, a savings vault, fees each way so churning costs you. Calibrated so the best money player finishes about 1.6x richer than one who ignores it, with a guard that fails above 3.2 so money can never become the whole game. My Life moved onto the phone. DoUKnowBall inside DoUKnowBall, generated from your own save. Gambling is deliberately small and unfun to grind: once a season, capped at the lower of 50k or 4 percent of net worth, blocked under 250k, 42 percent win rate and 1.15x payout both printed on screen, closes permanently at 500k down. Career average is minus 92k. The upside is dressing room morale, not money. |
| 135 | Press conferences and team talks. Morale was worth nearly 18 league points floor to ceiling but nothing reached the whole squad. Four tones, before the match and at half time, press questions built from your save. Reading the room is worth about 3 points a season, misreading costs 3.8, and spamming one tone is worth 1.6 against 4.3 for reading the situation. Skipping a presser costs exactly zero versus never opening it, which is what makes the skip button honest. |
| 136 | **This documentation round.** `CLAUDE.md`, `docs/SHIP-PIPELINE.md`, `docs/PROJECT-STATE.md`. |
| 137 | **The legal round.** No real player is quoted or accused anywhere on the site any more. See below. |

The three documentation files were also written directly onto Anthony's disk when they were
packaged, so they are readable from the local folder whether or not Round 136 has been
committed. Check `git log` to see whether it has landed.

### ⚠ Two sessions can collide on round numbers

Rounds 134 and 135 were packaged by the **scheduled build task** while an interactive session
was separately packaging documentation as 134. The scheduled task won the filename race and the
documentation round had to be renumbered to 136. Nothing was lost, but an hour of work nearly
was, and a `SHIP` wrapper got silently replaced with one that did not include the other
session's round.

**Before you package anything, check the folder for a `ROUNDnn_FILES.zip` newer than your own
session start.** If one is there, another session is live. Take a number above it, and do not
overwrite a `SHIP` wrapper without reading what it currently ships. The scheduled build task
fires on cron `57 */3 * * *`, so it is running more often than you would guess.

### Round 137, what it actually did

The item that had been sitting at the top of "Decisions owed by Anthony" as the highest
priority open exposure. It is now closed and the decision is off the list.

The Club Manager inbox was rendering invented speech and invented off-pitch conduct against
**real named professionals** out of `clubManagerRosters.ts`, on a public site out of a public
repo. The reported example (*"You told me I was a star here"*) was real and was in
`clubManager.ts`. The drama pool was worse than the quotes: it had named men crashing cars into
the training ground at 2am, sitting in a casino two nights before a match, missing training,
and falling out with their wives on Instagram. None of it happened to any of them.

The line the code now holds to, and it is written into the file so it survives:

- **Football events inside the sim keep the name.** Minutes, selection, morale, transfer
  requests, bids. That is what a management sim is, and the name is doing honest work.
- **Invented speech and invented off-pitch conduct lose the name.** Attributed to a squad role
  instead ("your star man", "one of your midfielders"), so no roster name shares a string with
  them.

Six drama entries that alleged something genuinely damaging were cut rather than reworded,
because a role descriptor is still uncomfortably close to a named man when the claim is that
serious. Three harmless ones were written to replace them. Every quote in the inbox, the
transfer-request copy and the broken-promise line was rewritten as narration.

**`scripts/simNoInventedQuotes.mjs` is the permanent guard.** Read its header before touching
narrative copy. It runs three passes, and the third is what makes it worth having: it drives
real seasons and checks rendered output (not source) against the real roster, it scans src for
literal names beside speech, **and it self-tests against the exact strings Round 137 removed**.
A detector that finds nothing passes either because the code is clean or because the detector
is broken, so the known-bad lines are kept as fixtures and it fails loudly if it stops catching
them. It also carries known-good fixtures, because a guard with false positives gets deleted.

Two calibration notes for whoever touches it. The harvest floor is 150, set from ten measured
trials that ranged 221 to 248, not from a number that felt right. And accents matter: `\b`
treats `é` as a word break, so "Jérémy" parsed as J, r, my and the guard read the "my" in his
own first name as him talking. Names are accent-folded before any boundary test now, which also
means copy writing "Mbappe" for "Mbappé" is caught rather than missed.

**Done as of 2026-08-16.** Rounds 131 to 137 are pushed and the publish was triggered. The
queue is empty. Pick the next thing off the roadmap and build it.

Anthony's own next step, in his words, is that he wants to **review all the games and come back
with tweaks**. Expect a batch of feedback rather than a single bug, and expect it to be worth
more than anything on the roadmap below, because it is the owner playing his own site. When it
arrives, triage it into rounds rather than trying to fix everything in one.

### What the pending rounds contain

- **131** player creation: look options, height and weight with real attributes, no build cap
  below 99, jump-by-5 or type the overall directly, rerolls against the potential cap.
- **132** money and life: bank depth, timed investing (crypto, index, APY), a transaction limit,
  My Life moved onto the phone, DoUKnowBall inside DoUKnowBall, gambling.
- **133** rival-name purge. 284 findings across 843 files taken to zero, plus the permanent
  guard `scripts/simNoRivalNames.mjs`. Also renames the Jeopardy files to QuizBoard, which is
  why `RUN133.bat` explicitly deletes four old paths before committing.

**Note:** the awards round was originally planned as 133, but the 133 slot got spent on the name
purge. Awards is still unbuilt. See the roadmap below.

---

## Recently shipped

| Round | What |
|---|---|
| 130 | Phone stops being a one-shot novelty. Threads, 17 contacts, contacts/continuation/neglect/apology, world-only sports feed. |
| 129 | Mobile chrome: navbar overlap, the invisible-streak `xs` breakpoint bug, action-bar footer lift, product-name strip. All measured in a real browser. |
| 128 | The no-scroll rule was itself jumping the page. |
| 127 | Every player is told what he is at this club, and the dressing room remembers whether you kept your word. |
| 126 | The Round 113 coaching career was never plugged in, so all four American games still dead-ended at retirement. Fixed. |
| 125 | Seven permanent guards had been failing since Round 119 with nothing checking the checkers. |
| 124 | International football became a real competition that crowns a winner every four years. |
| 123 | You have to beat somebody to win an award, across all four American career modes. |

Also already done, do not rebuild: recently-played and leaderboard rank (55), NFL/NBA/MLB/NHL
career rebuilds (56 to 59), appearance creator (54), Club Manager picker leagues and flag (106),
Club Manager tile-dashboard reformat (74), halftime management (119), a harness that actually
reaches a match in Club Manager (120).

---

## Open bugs

| Bug | Notes |
|---|---|
| **Edge function `football-connect4-validate` needs redeploy at publish time** | A key was renamed from "FIFA Ratings & Stats" to "Player Ratings & Stats". Needs a **second** redeploy: v7 still names the game in the glossary definition. The key `Has/Had a 90+ Rated Player Card` must stay verbatim. |
| 📱 button covers the AGE tile at 390px | AGE is invisible on phones. Introduced by Round 129. |
| Award flicker | Anthony: "says I didn't win an award, next sec it shows I did". |
| `scripts/testBallonDorFairness.mjs` dies on import | No localStorage stub. Also named `test*` so `runAllSims` silently skips it. Rename to `sim*` when fixing. |
| `playGames` stalls on `/nfl-my-career` and `/nba-my-career` | Pre-existing, not a regression. |
| `RebuildBoard.tsx:41` unattached `revealRef` | Small, but it means the no-scroll rule is not actually applied there. |
*Checked and NOT a bug, 2026-08-16, recorded so nobody flags it twice: `public/sitemap.xml`
still lists `/jeopardy` and looks stale at first glance. It is correct. Round 133 renamed the
files and the on-screen label to QuizBoard but deliberately kept the **route** at `/jeopardy`,
because it is on the `LIVE_IDENTIFIERS` allowlist in `scripts/simNoRivalNames.mjs` and changing
it is a migration with redirects and a backfill, not a copy edit. The counts also reconcile
exactly: 118 registry paths, minus the retired `/deal-or-no-deal` redirect, plus the root and
six static pages, is the 124 entries in the file.*

### Decisions owed by Anthony

This is the registry `CLAUDE.md` points at. **These are the only things you may ask him about
besides money. Everything else, decide yourself.** When one is resolved, delete it from here.

1. **Competitor names in the public repo.** `docs/research/R1_soccer_sites.md` and
   `docs/research/R3_creator_formats.md` name competitors by name in a public repo. Delete or
   gitignore. Do not silently delete his research, ask him.
2. **ESPN-style score ticker data source.** Needs a paid feed decision. Money.
3. **Apple sign-in.** Parked on the $99/yr Apple developer account. Money.

*Closed 2026-08-16: invented quotes attributed to real players. Was item 1 and the highest
priority open exposure. Fixed and guarded in Round 137, see above.*

---

## Roadmap

Not numbered by round on purpose. Take the next free round number from the top of this file and
work down this list in order.

**Next up, in order:**

1. **Awards** (was planned as 133, still unbuilt). Puskas and FIFA Best, candidate goals and
   assists, a trophy cabinet, animated and personalised trophies, Champions League and World Cup
   tables plus brackets plus per-competition stats, no-spoiler gating, more international
   trophies.
2. **Realism.** Players must age out. Salah should not still be playing in the 2030s. Generated
   young players need to work far into the future.
3. **Manager side.** Full manager tools after retirement, with era rosters. An era selector for
   Club Manager.
4. **Mini games.** More of them, harder criteria.

**Standing large items. AUDITED AND CORRECTED IN ROUND 199, because most of this
list had been true for months and stopped being true without anyone updating it.
Verified against the live code, not from memory:**

DONE, and previously listed here as open:

- **The Club Manager epic** is almost entirely shipped: transfers and negotiations (R121+),
  loans, release clauses (R193), the calendar (R158), per-player stats (R164), the youth
  academy (AcademyScreen, mounted), scouts (SCOUT bank and screen), facilities (FacilityKind
  recruitment/coaching/facilities with levels), rival watch (the "spies" line), cup naming
  (R176 uelName), the match animation (R158 Watch Live), roster freshness (Ozcan passes each
  wave). TACTICS DRAG IS DONE: TacticsScreen.tsx has pointer-based drag with a documented
  fallback for anyone who cannot drag, and its header comment quotes the ask. What remains
  of the epic: SPONSORS, which has never been built.
- **More leagues:** now 20 leagues and 330 clubs (R189 closed wave 3 at the verifiable
  floor). Flags are throughout the site as of R194.
- **International competitions inside Club Manager:** the UCL groups, the projected bracket
  and the seeded knockout draw shipped in R163. NATIONAL team football inside CM is what is
  still missing, and is a fair future round.
- **ESPN-style score ticker:** shipped as The Ticker in R167, derived from live save state
  rather than a paid feed, so the money question never had to be asked.
- **Profile page:** the favourite-game picker lists every game and the sport stat reads real
  categories (shipped, see What's New). R198 also noindexed the page.
- **Google indexing and discovery:** R181 (internal link graph), R148 (sitemap generator),
  R198 (the full audit: noindex where it belongs, robots.txt normalised, one h1 per page,
  the college hub linked and submitted). Bing Webmaster Tools and IndexNow remain untried.
- **Trade finders and cap systems:** the trade finder ships in all four GM games (simTradeFinder),
  and R190 added real negotiation on top of it.

STILL OPEN, honestly:

- ~~Sponsors in Club Manager~~ **DONE, Round 200.** His epic is now closed in full.
- ~~National team football inside Club Manager~~ **DONE, Round 202.**
- **CFB Dynasty and CBB Dynasty use invented names.** For college sport that is arguably the
  RIGHT call rather than a defect (R199 guarded both generators so no invented recruit can
  ever carry a real player's name). `ROUND87_FILES.zip` holds real 2026 rosters and has never
  been run: see the never-run zips warning below before touching it.
- ~~Sacked-manager unemployed state~~ **DONE, Round 201.** The sack opens the wilderness:
  real offers from the real pyramid, standing that decays while you wait, and a floor so the
  phone always rings in the end.
- **Cross-device and browser QA matrix.** PARTLY CLOSED, Round 203: there is now an iPhone
  device-emulation walk (playIphone) and a static Safari-hostile-pattern scan (simSafari),
  which caught a real iOS date bug in the minefield. A true WebKit run is still impossible
  here: the download fails in this sandbox. Anyone with a Mac or a working install can run
  the existing walks under webkit unchanged.
- **Sitewide FIFA-style tile-dashboard reformat.** HALF CLOSED, Round 204: the four front
  offices (NFL, MLB, NBA, NHL) now open on the same five boxes Club Manager has had since
  Round 74, sharing one engine (`src/lib/foHub.ts`) and one component
  (`front-office-shared/FoHubTiles.tsx`), so a change to the pattern lands on four games at
  once. Still on pills or long pages: the four My Career boards (NFL, MLB, NBA, NHL), the
  two Dynasty games, and the F1 pair. The My Career family is the obvious next one and the
  same two files should serve it with a wider FoHubFacts.
- **Per-game competitor depth audit.**
- Copy nit: kill the "🛝 7 times this season..." line.

### ⚠ Two zips that were built and never run

`ROUND77_FILES.zip` (Club Manager youth academy, scouts, upgradeable facilities, sponsors, spy
system) and `ROUND87_FILES.zip` (real 2026 CFB Dynasty rosters, 528 players) were packaged weeks
ago and Anthony has **never run them**. Between them they clear a large chunk of the outstanding
list.

**Check for them every session.** If they are missing from his folder, rebuild that
functionality as a fresh round rather than waiting. Do not assume something shipped just because
it was once packaged.

**Do NOT extract them.** They are far below the current head. Unpacking a Round 77 tree over a
Round 130-plus tree would silently revert dozens of rounds in every file they touch, and it
would look exactly like the clone-revert bug. Rebuild the *functionality* as a new round;
never re-run the old zip. The same rule holds for any zip whose number is at or below the head.

**They are also the reason the roadmap below still lists youth academy, scouts, facilities,
sponsors, spies and real CFB rosters as open.** That work exists, it just never reached the
repo.

---

## Analytics truth

`/soccer-career` is about **1 in 5 of all pageviews across the site** and **11x the next most
played game**. This is the single most important fact for prioritising work. When in doubt,
build for Soccer Career.

Source and caveat: this came from Lovable's project analytics
(`mcp__Lovable__get_project_analytics` on `c29d224f-a662-4a15-b809-d86fa3b3f0ad`), read in
August 2026. GA4 is **not** wired up yet, so Lovable is currently the only analytics source.
Re-pull it before making a big prioritisation call on it, and update this line.

Approximate at the date above, re-measure rather than quoting: roughly 118 to 122 games, entry
bundle about 663KB with route-level code splitting, `src/data/gameContent/` about 47k words of
per-game SEO copy, about 52 harnesses in `scripts/`, 53 files in `docs/`.

---

## Services and accounts

| Service | Detail |
|---|---|
| GitHub | `PapiSalgueroM/ballpark-hero`, public, branch `main` |
| Supabase | `flawuiqbvjobmkfkauhw`, **Pro $25/mo**, spend cap ON |
| Lovable | `c29d224f-a662-4a15-b809-d86fa3b3f0ad`, **free plan, 0 credits**, never use its AI agent |
| AdSense | `pub-2929318086316376`. Rejected once for "Low value content". Fix went live 2026-08-12. Review reminder set for 2026-08-20. |
| ads.txt line | `google.com, pub-2929318086316376, DIRECT, f08c47fec0942fa0` |
| Google sign-in | live |
| Apple sign-in | parked, needs the $99/yr developer account, this is a money question |
| GA4 | measurement ID still outstanding |

---

## Scheduled tasks

These live in the assistant account, **not in this repo**, and they do not survive an account
change. If they are not running, they need recreating. Full prompts are in
`_claude-migration/SCHEDULED-TASKS-TO-RECREATE.md` in Anthony's local folder (gitignored,
because it contains account emails).

**Recreated 2026-08-16 on the new account**, all three, after the migration. The build-loop
prompt was rewritten in the process: the archived copy hardcodes head `9da1788` and rounds 101
to 110 as pending, which is nine months of drift, so the live version now carries **no round
numbers at all** and points at this file instead. Do not paste the archived prompt back in.

Supabase and Lovable connectors are both connected on the new account as of the same date, so
the polls task can write and deploys can run.

| Task | Schedule |
|---|---|
| DoUKnowBall: continue the career epic (the main build loop) | cron `57 */3 * * *` |
| DoUKnowBall daily polls | cron `0 11 * * *`, needs the Supabase connector |
| AdSense review day | one-shot 2026-08-20 14:00 UTC |

The daily polls task writes to `public.daily_polls`. Columns: `poll_key` (unique, format
`dp-YYYY-MM-DD-N`), `poll_date`, `sort_order`, `question`, `option_a` through `option_d`, the
matching `option_*_emoji` fields, and `option_*_flag` (a country name only when the option **is**
a country, otherwise empty string). Three rows per day. Replace any pre-stocked generic rows for
today rather than adding alongside them.

---

## Change log for this file

- **2026-08-16** created, as part of Round 134. Pulled the live project state out of assistant
  memory and into the repo so any session or account can pick the project up cold.
- **2026-08-16** Round 137. Closed the invented-quotes exposure and recorded the guard. Noted
  the account migration, the three recreated scheduled tasks, and Lovable confirmed stuck at
  `9494d8e`. Wrapper moved to `SHIP7.bat`.
- **2026-08-16** Round 138. Docs only, and it exists because Round 137's own copy of this file
  went stale the moment 131 to 137 were pushed: it still claimed the head was `e7fe005` with
  seven rounds pending. Corrected to `6397a77` with an empty queue, plus the computer-use
  clicking discovery, the Lovable `latest_commit_sha` lag, the note that live was not
  independently verified, and a retraction of a sitemap "bug" that turned out to be the
  `LIVE_IDENTIFIERS` allowlist working as designed. **Lesson worth keeping: a round that pushes
  a queue invalidates this file's own header, so the next round has to fix it.**
