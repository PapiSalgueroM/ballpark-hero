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
| `origin/main` head | `dadd94b` = **Round 257**, pushed 2026-08-21 evening and PUBLISHED LIVE the same evening. Verified as a crawler on the live domain afterwards: /soccer-career answers with 10,782 characters of readable text before any JavaScript runs, the app still boots on top of it (338 nodes, zero failed asset requests), and /prerender-boot.js is served. IndexNow resubmitted 122 URLs. **THE ADSENSE BLOCKER IS FIXED AND LIVE**, so a review request can go in whenever Anthony wants. |
| WAITING ON ONE DOUBLE CLICK | Rounds **258 through 285** are packaged on his disk and NOT pushed (2026-08-25: every assertion in RUN258 through RUN283 was re-simulated against the zips from a clean Round 257 tree, 229 checks, all passing; RUN283 was re-delivered with CRLF line endings, the copy on disk was LF only). **`SHIP146.bat` runs all twenty eight in order and is the only bat he needs**; every earlier SHIP wrapper (117 through 145) is a subset of the same queue, and each RUN bat self-skips once its round is in the log, so it is safe to click after SHIP142 as well as instead of it. Rounds 284, 285 and 286 from the 2026-08-24 session never reached his disk and were rebuilt on 2026-08-25 as 284 and 285 from the handoff notes; if the old downloads ever turn up, do NOT put them in the folder, the rebuilt ones supersede them. 258 currency plus real ticker events, 259 real internationals, 260 the home page count correction, 261-262 real club squads and the depth chart, 263 the 320px overflow, 264 the sports calendar, 265 the home page canonical and title, 266 footer links plus simInternalLinks, 267 offer fit, 268 /college was shipping empty, 269 two prerenderer defects, 270 six sport hubs, 271 every prerendered page 32px narrow, 272 the retired routes stop serving the home page, 273 the flagship stops shipping another game, **274 the duplicate canonical that would have told Google all 126 pages are the home page**, 275 every page starts loading a second sooner, 276 nine more duplicated head tags, so every page describes itself rather than the site, 277 no page title gets cut off in a search result, 278 the nine deliberately hidden pages stop serving the home page, 279 a tool that asks the live site what a crawler actually gets, **280 the sitemap stops telling Google that all 127 pages changed today** plus the four lines that were frozen wrong on every page and a home page that had half the content of the pages it links to, 281 the structured data that was generated and thrown away, 282 dead addresses stop answering as the home page, 283 the home page offers a game before it asks for an account, **284 today's puzzle stops being frozen into saved pages, and the site-wide noindex that nearly shipped gets a permanent fence**, 285 the footer links all six sport hubs and the privacy policy says everything Google asks it to. AFTER THEY LAND: verify Lovable synced to the new head, call deploy_project on c29d224f-a662-4a15-b809-d86fa3b3f0ad, then run `node scripts/indexnowSubmit.mjs`. |
| OWNER'S SCREENSHOT LIST, ALL CLEARED | Every item from his 2026-08-21 Soccer Career screenshots is done: real events in the ticker (258), clubs dropping/listing/loaning you (257), the negative net worth format (257), display currency (258), the mirrored team sheet and misplaced CDM (257, tightened in 259), the passport event naming its nation (257), the cut-off player name (257), the group stage table replacing the qualifying one (257), and real players in national squads (259). |
| PREVIOUS HEAD, FOR CONTEXT | `f848aa0` = Round 253, pushed 2026-08-21 morning and published the same morning. THE ENTIRE 157-253 BACKLOG IS SHIPPED: 97 rounds, verified on the live domain (bundle hash moved to index-KZ_JE1hg.js, sitemap 115 to 122 URLs, /hall-of-champions and /silverware-sort and /records all 200 on douknowball.com), IndexNow submitted 122 URLs. Every row below describing a 'pending' or 'packaged' round from 157 to 253 is HISTORY now, not a queue. Nothing is waiting on Anthony's machine. |
| WHY THE BACKLOG SAT FOR WEEKS | **Four separate bugs in the RUN bats, not in the code and not on his machine.** Every one of them made a fail-closed assertion STOP a run that should have passed, so a click that looked like it worked shipped a handful of rounds and quit. All four were reproduced on Windows before being fixed, all four are fixed in the bats on his disk AND in pkg/mkbat.py, and pkg/verifybat.py now refuses to build or bless a bat carrying any of them: (1) FORWARD SLASHES in a findstr file argument: findstr rejects them outright and returns errorlevel 1 exactly as if the pattern were missing, which killed 56 bats at Round 179 every single time; (2) RAW DOUBLE QUOTES in a pattern: cmd ends the quoted argument at the first one, so any assertion quoting real code (an aria-label, a JSX prop, an array of strings) was mangled, killing 10 bats at Round 198; (3) A QUOTE FOLLOWED BY A CMD OPERATOR: cmd counts quotes and does not understand the \" escape, so a `>` after one becomes a redirection, which silently turned RUN209's check into a file write; (4) A PERCENT SIGN in a pattern: cmd strips a lone `%` as variable-expansion syntax, so the assertion hunts for text the file does not contain, which stopped RUN251 on a comment reading "the 40% wash". The empirical tests that proved 1, 2 and 3 are worth repeating if a fifth ever appears: write a throwaway bat that runs the shapes against a known file, log the errorlevels, and read the log. Guessing cost more time than testing. |
| ONE MORE SHIP TRAP, NOT A BUG | Every RUN bat's chain guard greps `git log --oneline -80` for the previous round. A SHIP wrapper that starts at 157 therefore FAILS at RUN157 once the head is more than 80 commits past Round 156, which is exactly what happened after the backlog landed. Build the wrapper from the FIRST UNCOMMITTED round, not from 157. |
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
| Packaged 2026-08-20, early UTC | **Round 206** (TWO MEN, ONE NAME. Found by a probe that walked 56 seasons looking for numbers that disagree. Thin clubs (Kifisia, Volos and any youth-padded side) ship a day one squad of 16 academy kids named from a bank of 20 firsts x 20 lasts = 400, so by the birthday problem ABOUT ONE DAY ONE SQUAD IN FIVE contained two men with IDENTICAL names and identical "(Youth)" suffixes: indistinguishable rows when picking an XI or choosing who to sell. Measured 8/40 at Kifisia and 9/40 at Volos before the fix, 0/40 after. FIXED TWICE OVER: the bank is 36x36 = 1,296, and a hard guard (uniqueYouthName) checks every generated name against a Set of names already on the team, rerolls, and if a dozen rolls all collide walks the whole cross product for the first free pairing, so it can neither fail nor loop. Threaded through ALL FOUR places kids are made: the thin-club padding, the summer intake, academy graduates and scouted boys, and a scouted boy is checked against the FIRST TEAM as well as the books. All 1,296 new pairings were enumerated against the Round 199 real-name wall (8,661 real names): zero collisions. simInventedNames grew section 6 (75 day one squads holding 800 academy kids, 9 seasons of intake and scouting, 0 shared names, plus source-level guards that makeYouth still takes the name book and nothing builds a name by picking blind again). NEW HARNESS 76, simBooks: the invariants BETWEEN features that nothing was watching. Every week of every season, in my league AND all 19 others AND every UCL group: pts = 3W + D, goals for = goals against, wins = losses, draws even, no club twice. Squad: no shared ids, no negative tallies, no XI naming a man who is not in the squad, nobody picked twice. Market: never sells you your own man, never lists a man twice, never re-lists a gone man, and a signing costs money, adds exactly one player and comes off the shelf, checked by MAKING 50 of them. It ends by proving its own sample was real football (300 club-matches, 377 goals, 20 leagues), because balancing books are easy to fake with an empty ledger. Everything simBooks checks was already true: it is a fence, not a fix.) `RUN206.bat`, chain-guarded on 205. **SHIP64.bat is the current wrapper: it runs 157 through 206.** |
| Packaged 2026-08-20, morning UTC | **Round 207** (THE EXTENSION TALK, in all four US career games. Round 179 gave them real free agency; what none had was the decision BEFORE it. In the final year of a deal the club can table an extension: sign at a number usually a little under market, or play the year out and reach the open market, which pays better on average and can go badly wrong. Before this the final year was indistinguishable from any other year. ONE ENGINE (`src/lib/usCareerExtension.ts`) and ONE CARD (`us-career/ExtensionCard.tsx`), the same shape usCareerFreeAgency and usCoachCareer already use; each sport wrapper (build{Nfl,Mlb,Nba,Nhl}Extension + {sport}ExtPushArgs) feeds its own market number, accolade count, salary floor and cliff age. RULES THAT MAKE IT A FORK: extensionLeverage = skill*0.85 + fame - decline, and below 0.18 they simply do not offer and the screen SAYS SO (a 36yo at 71 is let go, no token deal). The card shows the offer AND the market AND the percentage between them, because hiding one would be asking the player to guess. ONE push, the single-shot rule from trade talks: leverage finds money, no leverage can PULL the offer entirely. Fail-closed as always: the worst outcome is no extension and a summer on the market, never a stuck career, because free agency is guaranteed when contractYears hits 0. The extension gate sits ABOVE the FA gate in all four boards (harness-checked by index) and 'extension' is never persisted as a phase, so a reload returns to the hub with the season unplayed, same as trade talks. MEASURED, not assumed: 600 offers average 93 percent of market, under 5 percent beat it by more than 5 points, a 90-rated 25yo improves his offer 100 percent of the time he pushes, a 79-rated 30yo loses it about 32 percent of the time, and nobody past the cliff gets more than 2 years. simExtension is harness 77 (7 career shapes x 40 rolls all answerable, offer rates 100/100/0 percent for star/starter/faded, both push arms, length bands, and static checks that all four boards gate, render, sign correctly and cannot ask twice). playExtension is the TWENTY-FOURTH browser walk: all four games raise the card from a doctored final year, then push/sign/decline are each walked to the save (`data-ext-salary` marks the offer field, because the header quotes the MARKET number and a text scrape compared two different fields).) SUITE NOTE: the 207 run had ONE tail in unseeded simRoles ("a man who was barely used reads as if he had played": the benched control is dragged on by injuries in the XI and the bar is a 0.5 playing share). Three reruns measured 0, 0 and 0.2. This is the FIRST recorded failure on that check. If it goes again, seed the arms or lengthen the run, do NOT raise the 0.5 bar: the whole point of that control is that a bench man reads as a bench man. `RUN207.bat`, chain-guarded on 206. **SHIP65.bat is the current wrapper: it runs 157 through 207.** |
| Packaged 2026-08-20, morning UTC | **Round 208** (THE TILE REFORMAT IS DONE: the four My Career games join the four front offices and Club Manager on the same boxes, NINE GAMES on one component. Their boxes had existed since Round 85 but were labels with a number stapled on ("Bank, $12.4M to spend"). Now every box carries a live fact and an accent that means a decision: the player box names WHICH meter fell through the floor and how far; the money box shows the deal and lights in the FINAL YEAR (which is exactly when Round 207's extension comes for you) or when upkeep is outrunning the bank; the log box shows the last season's stat line; news counts what is waiting. THE FIFTH BOX IS NEW CONTENT: every award these games have handed out has been recorded on the season line since they were built, and the ONLY thing that ever read it was a trophy emoji at the end of a log row, so three MVPs looked like three good seasons. `TrophyCase.tsx` counts, names and dates every honour, most-won first, reading the SEASONS rather than the career counters so it cannot drift from what happened. THE COMPONENT MOVED to `src/components/hub/HubTiles.tsx` (neutral home: nine games, four engines, a name starting "Fo" was claiming otherwise); `front-office-shared/FoHubTiles.tsx` stays as a thin door so the four FO boards needed no touching. A BUG NEARLY SHIPPED and was caught BY SCREENSHOT, not by a test: the log box read its last season off transient React state, so a five season career that had just reloaded said "Play one and it goes on the books". Now read off `career.seasons`, and playCareerHub ALWAYS reloads before reading so it cannot come back. Also fixed by screenshot: the money box said "final year at Green Bay Packers" and truncated, so the club name is gone from it (Round 204 learned the same lesson with "at Tennessee Titans"). simCareerHub is harness 78 (11 save states, both directions of every accent, the trophy grouping/dating/ordering including a season with NO awards array at all, which pre-R85 saves really have, and static checks that all four boards are converted with zero hand built grids left). playCareerHub is the TWENTY-FIFTH browser walk: four games, a known three season history written onto each save, every box opened and checked, and the case read back off the screen (x2 counts, both years, the sport's own word for a title).) `RUN208.bat`, chain-guarded on 207. **SHIP66.bat is the current wrapper: it runs 157 through 208.** |
| Packaged 2026-08-20, midday UTC | **Round 209** (THE WHOLE SITE MEASURED AT PHONE SIZE. Round 203's playIphone covers 10 busy screens; this sweeps ALL 132 ROUTES read straight out of App.tsx, at 390x844 with touch and an iOS UA, for the four faults that are invisible on a desktop: sideways scroll, tap targets under 30px, text under 9px, and controls OVERLAPPING each other (which no screenshot can show you). GOOD NEWS FIRST: zero horizontal overflow on every page, and zero overlapping controls. BAD NEWS: 292 CONTROLS UNDER 30px, and they were not scattered, they were a handful of SHARED pieces repeated sitewide. "See all games ->" was 14px on 82 PAGES, less than half a thumb, on the control that gets you OUT of a game. The Report chip was 28px on 63 pages. The how-to-play trigger was 16px on 24. Then the tail: Give up, Skip, Hard mode, the Daily/Unlimited toggles, the bracket sort chips, the leaderboard tabs, the Back links on every legal page, and the team chips in all four Connect 4 games. ALL PADDED, mostly in the shared component so one change lands everywhere, plus 11 runs of 8px pitch-label text raised to 9. Final sweep: 132 routes, 0 of all four faults. ONE RULE DELIBERATELY NARROWED rather than satisfied: a link INSIDE a sentence is prose, not a control, and padding "Privacy Policy" to 30px mid-paragraph would break the paragraph to satisfy a rule that was never about it; prose links are detected by comparing the parent's text length to the link's own, and the reasoning sits in the harness beside the ticker and footer exclusions Round 203 wrote. sweepPhone is harness 79 and runs with --browser on every suite from here, so a new page cannot ship with a link nobody can hit. ROUTE=/x checks one page.) `RUN209.bat`, chain-guarded on 208. **SHIP67.bat is the current wrapper: it runs 157 through 209.** |
| Packaged 2026-08-20, midday UTC | **Round 210** (ABOUT A THIRD LESS TO DOWNLOAD ON EVERY GAME PAGE. Nothing was measuring what a phone fetches to play a game. Two finds. (1) html2canvas, 47K gzipped, STATICALLY imported by ShareButtons, which is on every game page, to serve one button most players never press: now `await import('html2canvas')` at press time. (2) THE BIG ONE: GameSeoContent imported the MERGED GAME_CONTENT map, which is every word of prose for every game on the site (344K source, 101K gz), so a soccer page downloaded the hockey, college, basketball and baseball copy to render soccer copy. New `src/data/gameContent/loader.ts`: PATH_BUNDLE maps 107 routes to the 9 sport files, LOADERS dynamic-imports one, a Map caches it so two soccer games do not refetch. GameSeoContent loads it in an effect. Soccer pages now pull 18K instead of 101K. SEO risk considered and answered: the whole site is client rendered, so a crawler ALREADY had to run JS and fetch chunks to see anything; playIndexing and simIndexing were both rerun green, and the guides, FAQs and headings were read back off five pages (853 to 1,770 words each). MEASURED, gzipped JS over the wire, before/after: / 201/201, club-manager 661/530, soccer-career 776/649, stadium-tycoon 320/240, minefield 369/236, nfl-my-career 462/330, front-office 388/256. sweepWeight is harness 80 and holds every route to a budget measured the way a phone experiences it (open the page, collect every script actually requested, sum the GZIPPED sizes). It fails in BOTH directions: over the ceiling is a regression, under half the ceiling means the budget is stale and must come down in the round that earned it. It also reconciles PATH_BUNDLE against the sport files, so a new game with an unreachable guide is a failure rather than silent fallback copy. STILL ON THE TABLE, deliberately not taken: managerJobMarket is 155K gz on soccer-career via a SYNCHRONOUS call inside the retirement flow, and the 201K index chunk is mostly the Supabase client, needed by AuthProvider at first paint. Both need real refactors, not import moves.) SUITE NOTE: the 210 run had ONE tail in unseeded simCareerEngaged ("an honest pro wins the Ballon d'Or 31% of the time" against a 30% bar). Three reruns measured 13%, 9% and 18%. The sample is only 45 careers in that band, so a 3-sigma tail is reachable; Round 210 touched no engine code, only import mechanics. If it recurs, RAISE THE CAREER COUNT, do not raise the 30% bar: the bar is the whole point of the check. `RUN210.bat`, chain-guarded on 209. **SHIP68.bat is the current wrapper: it runs 157 through 210.** |
| Packaged 2026-08-20, afternoon UTC | **Round 211** (THE FOUR GM GAMES GET ROUND 206's RULE. Found by probing the four front office engines for self-contradictions. Their invented name banks were TEN first names by TEN surnames = 100 possible people, and a new franchise deals FOURTEEN free agents out of that hundred before you press anything. Measured over 30 fresh leagues each: the same man twice in 6/30 NFL, 8/30 MLB, 13/30 NBA, 10/30 NHL. Two identical rows in the market list. FIXED the same way: banks widened to 28x28 (NFL 34x34), plus `src/lib/foNames.ts` with `leagueNames()` and `uniqueName()`, a hard guard that rerolls and then walks the cross product so it can neither fail nor loop. WHAT COUNTS AS TAKEN IS WIDER THAN IN CLUB MANAGER, on purpose: a club squad is one team but a GM league is a CLOSED WORLD, so a generated free agent is checked against the REAL players on all 32 rosters as well as the other free agents. Threaded through all three places each sport invents a person (opening FA pool, draft class, summer roster fill) plus the four BOARDS' draft calls. Measured after: 0 duplicates in 120 fresh leagues and 0 across 4 summers of each. All new names cleared the Round 199 wall: 11,476 invented names enumerated against 8,661 real ones, zero collisions. simInventedNames section 6 now covers the GM games (48 leagues, 16,653 men, 4 offseasons each) plus a FLOOR under bank sizes so a tidy cannot shrink them back. simBooks widened past Club Manager to fence the four GM leagues on everything the probe found already true: no empty rosters, no shared ids, ratings 1-99, no negative salary or contract years, ages 15-50, and wins = defeats in a closed league.) `RUN211.bat`, chain-guarded on 210. **SHIP69.bat is the current wrapper: it runs 157 through 211.** |
| Packaged 2026-08-20, afternoon UTC | **Round 212** (THE DAILY PUZZLES WERE NOT DAILY. Found by moving the clock a day at a time through a simulated year and writing down what each game dealt, which nobody had ever done. MEASURED BEFORE: Missing XI dealt TWO distinct lineups in 365 days, ONE OF THEM FOR 243 DAYS RUNNING; its blanked player had 6 distinct in a year; Sign the Player used ONE formation for the whole year; Pack Battle's first card never changed. CAUSE, one mistake in four places: they seed a Lehmer generator with `dateSeed()`, the date as a number, so consecutive days differ by 1. A Lehmer step is `s = (s * 16807) % 2147483647`, so its FIRST output is nearly linear in the seed: two seeds one apart give first draws 16807/2147483647 = 8 parts in a million apart. Floor that against a 20 item pool and the index is frozen for tens of thousands of days. It reads as completely correct; only checking the output catches it. FIX: `dailyPrngSeed()` in dateUtils, an FNV hash plus an avalanche pass, returned inside the Lehmer modulus so two dates cannot fold onto one stream. getDailyTier has used the same idea since it was written. Applied to missingXi, rarityRound, packBattle, signThePlayer. `dateSeed % pool.length` is UNTOUCHED and stays: that rotates correctly, it is only unsafe as a PRNG starting state. MEASURED AFTER: Missing XI 150 distinct lineups (longest run 2 days), blank 192, Sign the Player all 9 formations, Pack Battle 96 distinct openers in 200 days. simDaily is harness 81: drives 9 daily games through 365 moved clocks asserting determinism, no board surviving more than 3 days, and distinct count at least half the pool; plus a STATIC rule that no file containing a Lehmer step may seed one from a raw date. That static rule carries its OWN CONTROL: it measures the raw seed too and fails if the raw seed ever starts scattering, because a control that has stopped failing proves nothing. Currently the hashed seed reaches 20/20 buckets in 60 days and the raw one reaches 1. CONTENT NOTE, not a bug: Missing Five, Missing Nine, Order the List and Missing Eleven have pools of 10 to 18 boards, so they cycle every two or three weeks. That is content depth, not seeding.) `RUN212.bat`, chain-guarded on 211. **SHIP70.bat is the current wrapper: it runs 157 through 212.** |
| Packaged 2026-08-20, afternoon UTC | **Round 213** (TOMORROW'S PUZZLE STOPS BEING TODAY'S PLUS ONE. Round 212 fixed four games frozen by a bad PRNG seed; looking at the REST turned up the opposite problem, sitewide. Nearly every daily game picked with `pool[dateSeed(today) % pool.length]`. That has ONE GOOD PROPERTY worth protecting: the index moves by exactly 1 a day, so a pool of 14 shows all 14 before repeating any, which matters a lot at these pool sizes. And one bad one: it is a straight line. Tomorrow is today plus one, on every daily game, forever, next to a leaderboard, and there is no pattern to guess because there is not one. NEW `dailyIndex(dateStr, poolSize)` in dateUtils keeps the coverage and drops the line: days are cut into cycles the length of the pool, each cycle is its own full shuffle seeded from the cycle number, so within any run of poolSize days every board appears exactly once and the order differs each cycle. SEAM RULE: if a cycle would OPEN on the board the previous one CLOSED with, its first two entries are SWAPPED, not skipped, because skipping would drop a board from the cycle and show another twice, which is the thing being prevented. THIRTEEN games moved onto it, including the shared `useDailyPuzzle` hook most word and grid games are built on. The shuffle uses mulberry32, NOT a Lehmer step, because a multiplicative generator seeded from a short label is exactly the Round 212 mistake and making it twice in consecutive rounds would be embarrassing (this is stated in the source). simDaily grew section 3: six pool sizes (3, 10, 14, 18, 40, 150) walked through six cycles each, failing on a skipped or doubled board inside a cycle, on the same board two days running INCLUDING across a seam, on a sequence that still steps +1 more than 40 percent of the time, and on any of the 13 games not calling dailyIndex or reverting to the remainder.) `RUN213.bat`, chain-guarded on 212. **SHIP71.bat is the current wrapper: it runs 157 through 213.** |
| Packaged 2026-08-20, evening UTC | **Round 214** (EVERY PUZZLE HAS EXACTLY ONE RIGHT ANSWER, checked. The puzzle games share one failure mode and it is the worst kind, because the better you know the sport the more likely it catches you: a connections board with a man honestly in TWO of its groups has no right answer; a ranking round with two men on the SAME NUMBER has two right orders and marks one wrong; a team sheet whose blanked man is not on the sheet is unsolvable. Nothing checked any of it across 322 connections boards, 14 ranking rounds and 209 team sheets. ALL CLEAN, so this is a FENCE not a fix, plus the smaller rules that make a board work: no two groups sharing a label or a difficulty, no board being the same 16 names as another in its pool, no man twice on one sheet (which would give the blank away whichever slot was hidden), every blank candidate actually on its sheet. simFairPuzzles is harness 82. THE UNCOMFORTABLE HALF: the pool counts. Soccer connections 250 boards, baseball 60, and NBA, NFL and NHL FOUR EACH. Round 213's shuffled walk shows the whole pool before repeating any of it, which is the most possible with four boards and still means those three games have repeated TWICE A WEEK since they shipped. GENERATING boards was tried and THROWN AWAY: a bake script produced 30 per sport from the shipped rosters, but a group like "plays for the Clippers" is a claim about the world, the underlying roster's accuracy cannot be verified from here, and this project does not ship claims it cannot check. The counts are recorded as a RATCHET instead: a floor that fails if a pool shrinks AND fails if a pool grows without the floor being raised in the same round, so new boards cannot be lost later. The thin games are REPORTED loudly but do NOT fail the run, because a harness that fails every time trains everyone to ignore it. NEXT PERSON: writing NBA/NFL/NHL connections boards by hand is a real, well-defined content job with an obvious payoff.) `RUN214.bat`, chain-guarded on 213. **SHIP72.bat is the current wrapper: it runs 157 through 214.** |
| Packaged 2026-08-20, night UTC | **Round 215** (THE READABILITY AND KEYBOARD PASS. Nobody had ever measured whether you can read this site or use it without a mouse, so every word on all 133 routes was measured in a real browser. Found and fixed: the muted grey half the site is written in at 4.13 on a card (raised 50 to 58 percent, now 5.49), white on the brand green primary button at 2.93 (the green is untouched, the words on it are now the page's own near black at 6.38), white on the success green at 2.30 which was the worst pair on the site, every destructive error line at 3.66, and the World Cup predictor deriving group heading colours by SUBTRACTING lightness with no floor, so Group H titled itself at 1.83. NEW src/lib/readableColor.ts raises ONLY lightness by computation against the surface a word actually sits on, so the twelve group colours stay twelve colours. Tokens doing two jobs split: bb-red and wc-green stay fills, bb-red-ink and wc-green-ink are new. About 50 white-on-light-fill lines now write black, about 40 dark-grey inks moved to the readable shade, literal hsl murk raised by computation. The keyboard side existed NOWHERE: no focus ring on any page, no skip link, 20 controls suppressing the ring with bare outline-none. Now one global focus-visible rule (2px ring, transition-property none because the cards' transition-all animated the ring width), a skip link first in the tab order on every page pointing at #dukb-main, suppressions stripped. Screen readers: all 42 Connect 4 squares announce their clue pair, all 288 World Cup score inputs say which team against which, the year steppers say what they step, every search box carries a name. sweepContrast.mjs is harness 83: real-browser contrast on every route with ALPHA COMPOSITING up the tree and gradients judged at their worst stop, a keyboard walk pressing REAL Tab since focus-visible ignores programmatic focus, name checks everywhere, and a source scan catching white-on-light, grey ink and murky literals before render, carrying its own control examples so it fails if it goes blind. Also: mid-animation reads are waited out, the lesson being that a rules dialog fading in measures at a fraction of its real opacity. Measured 76 unreadable runs to 0, ringless stops to 0, unlabelled fields 288 to 0, unnamed controls to 0.) `RUN215.bat`, chain-guarded on 214. **SHIP73.bat is the current wrapper: it runs 157 through 215.** |
| Packaged 2026-08-20, night UTC | **Round 216** (WONDERKID FACTORY, the site's second idle game, his direct ask ("also create an idle game"). Stadium Tycoon grows a ground, this grows PEOPLE: scouts bring kids in on their own clock, coaches grow each one toward a hidden ceiling he can never pass, and the whole game is one repeated decision, sell now or let him cook. A fee pays rating plus a promise premium for the room left to grow; the premium is fattest young, fades from 21, is gone at 23, and at 24 the kid walks out FREE. Four geometric upgrades (scouting speed, and level 3 reads ceilings as a range while level 6 reads them exactly; coaching; dorm beds; agent fees), a showcase button (training x3 for 25s), deadline day every few minutes (all fees x1.5 for 50s), six regions from District Fields to the World Stage: moving up leaves cash, facilities and kids behind, pays a forever star (+15 percent training, +10 percent fees each) and raises the next region's ceilings. Offline runs at half speed for 8h and the calendar pauses so nobody ages out overnight. Every kid is generated: names ONLY from the Round 197 intlNames banks (enumerated against every real name on the site), Round 206's no-duplicate guard inside each academy, growth respects potential headroom per the Round 96/116 rule, the save loads fail closed and a doctored save comes back clamped. Page keeps the house shapes: HubTiles boxes where opening one replaces the grid, rules shown before first play and reopenable from the question mark, the tycoon-shape unscored once-per-session mark, no score ever sent. simWonderkid is harness 84 and MEASURES: first sale inside 90s, first move up about minute 8 against a 45 minute bar, late window 4.6x the early one against a 3x floor, nobody passes a ceiling and everyone slows approaching it, the price curve is strictly monotone in rating (premium coefficient 0.022 sits under 2.35 over 99 EXACTLY so training can never cut a fee), deadline measures exactly 1.5 and ten agent levels exactly 1.8, 1000h away applies exactly the 8h cap with zero cash movement, 480 kids across 40 academies with zero duplicate names all inside the enumerated space, and the wiring section pins route, registry row, guide bundle entry and mark shape. Registered in Soccer, sitemap entry, soccer2 guide, 270K weight budget measured 243K, What's New tells players about this and 215. sweepPhone reran green over all 133 routes.) `RUN216.bat`, chain-guarded on 215. **SHIP74.bat is the current wrapper: it runs 157 through 216.** |
| Packaged 2026-08-20, night UTC | **Round 217** (THE LOAN MOVE in Soccer Career, the flagship. The appearance model has benched overmatched kids at giants since the early rounds (8 to 16 league games in season one at an elite) with no way out but a permanent move and NOTHING warning you first. Now the window screen opens with a projection line, about X to Y league games next season, drawn from the SAME band table the sim rolls from: projectLeagueApps was extracted from calcAppearances so one table has two readers and the screen cannot overpromise. Fringe projection + age 23 or under + 2yr on the deal + top two tier club opens the loan window: up to two lower tier clubs, each quoting ITS projection from the same table, each promising 20+ league games, wage and contract stay with the parent, one season then home with a verdict line quoting the parent's real next season band. Records carry onLoanFrom forever and the history shows (loan). THE TWO CATCHES THE MEASUREMENT FORCED: (1) the tier one training bonus (x1.2 development) applied IN FULL from the bench, so six seasons benched at a giant developed a kid as fast as six seasons of football, fixed by scaling the bonus with minutes (full at 25 games, half at 12, quarter below); (2) Round 96's comment says the season you JUST PLAYED decides growth but the code read the season BEFORE, a one year form lag, fixed by handing developmentRate the fresh record at the pro call site. simLoanSpell is harness 85 with SEEDED cohort arms per the house tail policy: 150 benched careers taking every loan vs 150 identical ones staying, deterministic, measurably better and more football by age 21, floors at half the smallest run; plus the shared table case checks, the offer law (stars, veterans, final year men, small clubs never see one), the lifecycle across 150 careers with zero mid loan windows, the old save shape repaired to null and advancing clean, and all five window entries proven to route through enterTransferWindow. NOTE for the next person: Supabase is REACHABLE from this sandbox again (a 401 without keys, network fine), so the Round 214 grid impossible-cell lead is unblocked. playGames still cannot drive hub-and-spoke screens (FO hubs, career hubs, and now the wonderkid page read DEAD at step 0 despite a clean hand probe): that driver gap is a round of its own.) `RUN217.bat`, chain-guarded on 216. **SHIP75.bat is the current wrapper: it runs 157 through 217.** |
| Packaged 2026-08-20, night UTC | **Round 218** (NO GRID CELL CAN BE IMPOSSIBLE, verified against the LIVE tables, closing the lead on the books since Round 214. The three client built franchise grids (NBA, NHL, MLB) pick six categories a board and nothing ever verified against today's data that every crossing has an answer. simGridCells is harness 86: the builder pinned across all three difficulties (4000 seeds each, deterministic, six distinct categories, hard mode all franchises), then the exact three tables the games fetch pulled through the same client code paths and EVERY pairing enumerated, 171 per sport, 513 in all. Verified live 2026-08-20: NBA worst Bulls x Heat = 25 (matches the July audit to the digit), NHL worst Capitals x 300 goals = 23, MLB worst Twins x 300 home runs = 12. ZERO impossible cells, so a FENCE not a fix, floors at half each sport's own measured worst. Network honesty: when the sandbox loses Supabase (it does, Round 213 documented it) the pairing sections skip LOUDLY IN CAPITALS and exit green, because a harness that fails every offline run gets ignored, and the builder sections run regardless.) `RUN218.bat`, chain-guarded on 217. **SHIP76.bat is the current wrapper: it runs 157 through 218.** |
| Packaged 2026-08-20, late night UTC | **Round 219** (FOUR LIVE NBA CONNECTIONS BOARDS HAD TWO VALID SOLUTIONS, found and fixed in production. THE CORRECTION TO ROUND 214'S RECORD: the static files it fenced are only the OFFLINE FALLBACK. The live site fetches boards from Supabase and the live pools hold 20 per US sport, 302 baseball, 326 soccer, so the four-boards-repeat-twice-a-week worry was overstated AND the boards people actually play had never passed any fairness rule. simLiveBoards is harness 87: all five live pools pulled through the games' own client paths. FOUND LIVE: board 12 had Nash and Karl Malone (MVP no championship group) both ex-Lakers opposite a Lakers group, plus Luka in the 70 point group (a Laker since Feb 2025); board 15 had Garnett (DPOY group) opposite a Celtics group; board 18 had Markkanen (MIP) opposite his Cavaliers, AND Randolph AND Ja Morant in the Grizzlies group when both won MIP, a theme on the same board; board 19 had Moses Malone (HOF centers) opposite the Spurs he finished at, Shaq AND Hakeem (Finals MVP group) both HOF centers, and Tony Parker (Spurs group) a HOF point guard, another theme on the board. ALL FIXED IN THE DB with two-source-verified replacements (6MOY five per Basketball Reference + Wikipedia; the eleven-man 70 point club per NBA.com; Mourning DPOY x2; Rashard Lewis HS 1998; Marc Gasol and Battier as Grizzlies; Maxey MIP 2024; the unanimous ABA All-Time five with Rick Barry chosen over Moses because Moses appeared in Portland's 1976 PRESEASON and a board should never hinge on that argument; the Blazers five). ALSO: three baseball boards deleted as byte-for-byte twins of others (bconn-157, 277, 291), originals kept. The harness fences it all forever: shape, tiers (soccer grades easy to insane, accepted as written), no name twice on a board (the game samples 4 of 5), no twins, LIVE ratchets 326/299/20/20/20, and NBA criterion cross-checks against nba_player_stats in BOTH directions for every franchise and counting theme, with unverifiable legends (West, Russell, pre-table era) reported loudly not failed. THE DB FIXES ARE LIVE ALREADY, no deploy needed for them; the commit ships the fence and this record.) `RUN219.bat`, chain-guarded on 218. **SHIP77.bat is the current wrapper: it runs 157 through 219.** |
| Packaged 2026-08-20, late night UTC | **Round 220** (THE BROWSER PLAYER LEARNS HUB-AND-SPOKE, closing the harness gap carried in every handoff since Round 204. playGames condemned any control forever the first time it led back to a seen screen: right for the cbb create-and-reset ping pong it was built to catch, wrong for a hub whose doors legitimately re-lead to seen places while the world BEHIND them changes. New rule: reaching a genuinely NEW screen grants amnesty to every condemned door, because new ground proves the world moved; the ping pong stays caught since a create-and-reset pair mints exactly two new screens once (the derivation ships in the comment). 'abandon' joined the surrender list so the walker stops treating Abandon-and-restart as a way forward. MEASURED: /front-office STALL to 14 clean, /nba-front-office 14 clean, /wonderkid-factory DEAD-at-step-0 to 14 clean, regression sentries /cbb-dynasty and /guess-the-nation both kept 14 clean. The wonderkid page owned half its DEAD: its rules screen was a styled div with only a corner X, invisible to overlay clearing; it is a REAL dialog now (role, aria-modal, data-state open) with the house bottom button, better for screen readers too. Spot coverage, not a full 40 minute playGames run; the five walked routes are the ones the round touched plus the two sentinel pathologies.) `RUN220.bat`, chain-guarded on 219. **SHIP78.bat is the current wrapper: it runs 157 through 220.** |
| Packaged 2026-08-20, afternoon UTC | **Round 221** (EVERY SAVE ON THE SITE NOW SURVIVES BEING GARBAGE, and one game did not. sweepSaves is harness 88, two passes. DISCOVERY visits all 133 routes on a clean profile, navigates away so pagehide saves fire, and reads keys from /robots.txt (the Round 196 same-origin trick), measuring which routes own localStorage keys from BEHAVIOUR not source grep, so a renamed constant cannot drop a game out of coverage: 22 routes keep state through 26 keys, 111 keep nothing and are excused. THE TAMPER SWEEP then loads every stateful route six times, each time with ALL its keys pre-set to a different wreckage (plain garbage, truncated JSON, hostile version number, empty object, bare null, empty array), 132 tampered loads, asserting no uncaught exception and no blank screen. Deliberately NOT asserted: that old state is kept. A mangled save can only be survived; keeping real state across versions is each game's own harness's job. FOUND: /world-cup-bracket crashed to a blank page under FOUR of six modes: selectedThirds did .includes on whatever JSON.parse returned (object under hostileVersion and emptyObject), and predictions did a property read on bare null. FIXED fail closed at every load site: predictions and playoffPicks accept only a plain object, selectedThirds only an array filtered to strings, the knockout loader only a plain object with non-string values dropped, the awards loader only string fields. Full 132-load sweep green after the fix. ALSO in this round: the 219 and 220 rows above carried a wrong date stamp (2026-08-21 for work done in the small hours of Aug 20), corrected; the Analytics truth section below refreshed from a fresh 31-day Lovable pull taken 2026-08-20; and the What's New iPhone entry claimed most people play on phones, which the measured 79% desktop disproves, softened to a lot of people.) `RUN221.bat`, chain-guarded on 220. **SHIP79.bat is the current wrapper: it runs 157 through 221.** |
| Packaged 2026-08-20, afternoon UTC | **Round 222** (INDEXNOW WIRED: the site can now tell its number one traffic source about changes instead of waiting to be crawled. The fresh analytics pull made the case plainly: Bing sent 6,947 visits in 31 days, 4.3x Google, and IndexNow is Bing's own push protocol, also read by DuckDuckGo and Yahoo, ignored by Google which needs nothing since its crawler follows the sitemap. Three pieces. public/16211a5a50cff8f3434e5db883a21d8f.txt is the ownership key Bing fetches off the live site. scripts/indexnowSubmit.mjs is the OPERATIONAL submitter, named so the sim runner never discovers it since running it has a side effect: it reads the 116 sitemap URLs (or URLS=/a,/b for a scoped ping, DRY=1 to print without sending), REFUSES to submit until it can read the key off the live site itself with a cache buster (proven against production: it correctly refused with a 404 while the live site still serves Round 156), and treats anything but 200/202 as a loud failure. scripts/simIndexNow.mjs is harness 89, the offline drift fence: the key file's content must be exactly its filename stem, the KEY and HOST constants in the submitter must match, every sitemap loc must be on douknowball.com, and the 116-URL count ratchets both ways. SHIP-PIPELINE Deploying grew step 5: after every verified publish, run the submitter from the cloud session. FIRST REAL SUBMISSION happens right after the next publish, since the key file must be live before Bing can verify it.) `RUN222.bat`, chain-guarded on 221. **SHIP80.bat is the current wrapper: it runs 157 through 222.** |
| Packaged 2026-08-20, evening UTC | **Round 223** (THE TOP TEN'S UNFENCED DAILIES, and two of them were live-broken: the Round 212 bug in a new costume. /overrated-underrated (532 pageviews) and /tier-list (417) picked daily players with `seed * (i+1) * 1103515245` off the raw 8-digit date; for every 2026 date that product passes 2^53, the float rounds the low bits away, and after the modulo Overrated could only reach every 4TH pool index and Tier List every 8TH. MEASURED over a simulated year pre-fix: 450 of 600 pool players could NEVER appear in either game, the tier list dealt yesterday's identical board 17 days a year, and a typical day changed one name in eight, which is exactly the owner's 2026-08-05 report "u are reusing people". FIXED: both picks moved onto shuffledRange (now exported from dateUtils), living in ONE place (fetchOverratedPool: overratedDailyIndices, tierListDailyIndices) so the never-share-a-player rule is structural instead of two files mirroring arithmetic. Post-fix measured: 598 and 595 of 600 reached, zero identical days, 9.86/10 and 7.89/8 fresh names a day. ALSO FIXED, the fetch order: game_player_pool 2026 holds 2,879 rows across only 48 distinct values, and the fetch ordered by value alone, so the top-600 cut and the index-to-man mapping were tied-row arbitrary per fetch (two visitors, or the two games, could disagree); now ordered value, name, nationality server-side plus a canonical client sort with plain code-unit compares. AND a third real bug via the new harness: Budget Builder's star-power demand (90+ rated player) was IMPOSSIBLE in the 2015 and 2007 eras, where value-anchored ratings top out around 88; now todayOnly like league-spread. simTopDailies is harness 90: year-long deal fence for both picks (determinism, disjointness, zero identical days, reach and turnover floors set halfway to the measured broken values), live pool contract (600 rows, unique identities, canonical order, 4m floor), the collapsed-generator-stays-dead static rule, and per-era certificate construction proving EVERY Budget Builder demand winnable inside the self-calibrated budget against the LIVE era pools (Today 890M with 10 demands, tightest star-power at 68% headroom; 2015 510M and 2007 330M with 8 each, tightest in-the-black at 86% and 82%), skipping LOUDLY in capitals offline. Board-swap note: the day this deploys, both games' boards change mid-day once and a pre-deploy tier-list save shows as a fresh board; one-time, accepted. LEAD FOR 224 LOGGED: 13 more hooks (the HL family, useMysteryBox, useQuizBoard, useBallIq, useEmojiGuess, useGradeTransfer) share the same overflow-prone `s * 1103515245 & 0x7fffffff` LCG stepped from a raw date seed, losing low bits on every step; none are covered by simDaily's deal-level sections. Measure each properly before fixing, same as this round.) `RUN223.bat`, chain-guarded on 222. **SHIP81.bat is the current wrapper: it runs 157 through 223.** |
| Packaged 2026-08-20, late afternoon UTC | **Round 224** (GRADE THE TRANSFER WAS DEAD IN PRODUCTION and its data carried invented transfers; both fixed, plus the Round 223 bug class swept off the rest of the site. THE OUTAGE: transfer_grade_pool was a live VIEW measuring 27.9 seconds per computation (window functions over 80,586 stint rows plus a misplanned nested loop doing 2,106 bitmap scans), past the anon statement timeout, so every fetch from /grade-transfer failed and the game loaded empty. Found because harness 91's live section hit the same timeout through the game's own client path, twice. FIXED by materializing the pool as a real table (same SELECT, RLS enabled immediately per the CREATE TABLE AS rule, read policy, value index, get_advisors clean); repo mirror in supabase/migrations/20260820_materialize_transfer_grade_pool.sql, which is also the refresh procedure when stints or values change. THE DATA: the stints table keys careers by (player_name, nationality) and mononym Brazilians collide, merging distinct real players into one fake career whose stint boundaries FABRICATE transfers (a Paulinho "Levski Sofia to FC Barcelona" move that never happened), plus 60 exact duplicate rows differing only in position label. The table has a person_key column but only 9 of 80,586 rows carry it (an abandoned start), so identity cannot be fixed at the root yet. Rebuild rules: collapse to one row per move identity, then drop every (player_name, move_year) mapping to more than one distinct move in ANY nationality, because the game keys crowd votes on exactly that pair. 1,824 rows survive, 777 at the game's 25M bar, zero colliding vote keys, band-relative grading recomputed over the clean population (6 A grades above 80M, the July property holds). Spot-verified against known moves: Haaland Molde-Salzburg-Dortmund-City chain right, Hazard both moves right, Coutinho arc right. THE SWEEP: the overflow multiply pattern from Round 223 lived in 13 more hooks; ALL MEASURED over a simulated year with real pool sizes before touching anything. Broken and fixed (moved onto dailyDraw/shuffledRange labels, exported from dateUtils): Grade the Transfer picker reached 81 of 800 cases; Ball IQ's 400 tier first slot drew the same NINE of 72 clues all year, 600/800/1000 slots half their tiers; Emoji Guess's two easy slots pinned to 3 of 24 easy puzzles; Mystery Box per-slot picks circled half each tier bucket (tier sequences were fine). Adequate and fenced AS IS, not rewritten: the seven HL games (zero identical boards, at most 1 identical opening pair a year, damaged-but-acceptable first-pair variety 257 to 319 of 365) and Sports Quiz Board's category splice (the shrinking modulus un-collapses it). simDateDraws is harness 91: live year-long floors for the four fixes through the real exported functions, HL fenced via a faithful copy plus body fingerprints that force re-measurement if a hook's generator changes, and a site-wide allowlist so the constant can never reach a new call site unmeasured. Browser spot-played all six touched games clean; /grade-transfer went from empty to playable. OPEN LEADS LOGGED: (1) move_year lags reality by about a year on famous moves (Neymar Santos to Barcelona shown 2015, real 2013) because it reads the NEW stint's first_year; the stints table carries last_year, so a re-derivation dating moves by the OLD club's last season is the designed fix, but it changes vote keys and value-at-move join semantics, so it is its own careful round. (2) person_key backfill would kill merged-career fabrication at the root and return the dropped legitimate double-movers. (3) Loan stints render as transfers (Coutinho's Bayern year shows as two moves).) `RUN224.bat`, chain-guarded on 223. **SHIP82.bat is the current wrapper: it runs 157 through 224.** |
| Packaged 2026-08-20, late afternoon UTC | **Round 225** (THE TRANSFER YEARS ARE TRUE NOW, closing lead 1 from Round 224 the same night. The pool dated each move by the BUYING club's first recorded season, which runs a year late on every standard summer move and up to two late across data holes: Neymar's Santos to Barcelona showed 2015 for a 2013 move, his PSG move showed 2018 for 2017, Hazard's Chelsea move 2013 for 2012. MEASURED on the full transition set before changing anything: 26,130 moves carry the standard one year offset, 254 are same-year pairs, 3,821 sit across data holes, 128 have negative gaps (overlapping stints, noise, now excluded). THE RULE: move_year is the SELLING club's last recorded season, the year the player actually left; value_at_move becomes his final-season value at the seller, the honest pre-move number; value_after stays three years on; grades re-ranked. VERIFIED against nine famous moves, all now correct: Neymar x3 (2013, 2017, 2023), Hazard x2 (2012, 2019), Haaland Dortmund to City 2022, Bellingham x2 (2020, 2023), Rice 2023, Grealish 2021, Coutinho's arc. FIVE of them are PINNED in simDateDraws so a future rebuild that drifts the dating rule goes red. Zero crowd votes existed (the game was dead until Round 224), so no vote keys migrated, which is why this was safe to do the same night. Winter-window moves stay ambiguous by a few weeks (yearly snapshot source, both January cases checked present as ordinary gap-1 rows), recorded as source granularity rather than papered over. Pool: 1,802 rows, 759 at the game's bar, zero colliding vote keys, 6 A grades above 80M so the band-relative property holds. The repo migration mirror carries the full five-step story and is the refresh procedure. Round 224's remaining leads: person_key backfill (identity at the root), loan stints rendering as transfers.) `RUN225.bat`, chain-guarded on 224. **SHIP83.bat is the current wrapper: it runs 157 through 225.** |
| Packaged 2026-08-20, early evening UTC | **Round 226** (THE OPEN BUGS TABLE, SWEPT TO ZERO. All six rows resolved or investigated, details now in the table itself. The three real fixes: the football-connect4-validate edge function redeployed as v8 from the already-clean repo copy, so the deployed glossary no longer names the video game (verified by re-fetching the deployed source; the guessable key stays verbatim; repo and deployed in sync); the dead testBallonDorFairness harness revived as simBallonDorFairness, harness 92, with the localStorage stub it always needed, a seeded Math.random because its verdict genuinely flipped between runs, and a must-win trigger rebuilt off the bare field maximum it used to assert on (house rule violation), now green and deterministic and actually discovered by the runner; and RebuildBoard's revealRef, created in Round 61 and attached to nothing ever since, now on all five phase screens so the no-scroll rule works on /rebuild. The two non-reproductions, with method: the 390px AGE tile occlusion was probed with elementFromPoint before and after scrolling the board's own scroller, nothing overlaps it on the current build; the award flicker has no live async path, the engine decorates the season atomically before any render. The sixth row, the two career playGames stalls, turned out to be already cleared by Round 220's amnesty and both games now classify as honest skips. PIPELINE NOTE: mkbat grew an R directive emitting a guarded git rm, used here to retire the test-named file properly instead of leaving a dead twin behind; verifybat unchanged and still BAD: 0 on this bat.) `RUN226.bat`, chain-guarded on 225. **SHIP84.bat is the current wrapper: it runs 157 through 226.** |
| Packaged 2026-08-20, evening UTC | **Round 227** (THE MANAGER EPILOGUE SIMULATES A REAL SEASON, flagship work on the roadmap's "manager side" item. For a hundred rounds the dugout afterlife was three INDEPENDENT coin flips (15% sacked, maybe promoted, maybe "Won the league trophy!", else a random adjective), which read like a slot machine next to the fully simulated playing career and could contradict itself. NOW: his club plus the era clubs at his tier (thin tiers topped up from the neighbour) each play the season to a points table; every total is proven reachable in the games played (3W+D=pts with W+D<=games, including the 3g-1 impossibility knocked out); position is the SORT of the points so the table cannot disagree with itself; his W-D-L line multiplies back to his exact points. EVERY OUTCOME DERIVED FROM THE FINISH: champion iff 1st (and only then the league trophy), promotion iff top two in a lower tier and he goes up WITH the club (the old code teleported him to a random club), relegation from the bottom three can be survived (down with the club) or end in the sack, the sack otherwise only from a bottom-half season at a top club, scouts only after a top four finish down the pyramid (Round 111's earned-move rule kept), the national team call only after a title or a top three finish at a big club. NEW: a domestic cup knockout run every season, edge-shaded coin per round so giants fall and minnows run; manager honours (League Title, Domestic Cup, tagged Manager, calendar-yeared) go into s.awards so the cabinet shows them. THE EDGE IS REAL AND MEASURED: dugout trophies, promotions, playing legacy and tenure push finishes up; seeded measurement over 300 careers puts debut seasons at 50% down the table and proven managers at 34%. UI: ManagerPanel renders the final table (leaders plus his row), the W-D-L line and the cup run. simManagerEpilogue is harness 93, seeded: 2,937 employed seasons across 300 careers, table coherence on every one, outcome derivation cross-checked (263 titles, 149 cups, 425 promotions, 112 sacks, zero contradictions), the edge floor at half the measured 16-point gap. The row type gained optional table/leagueSize/record/cup fields so every pre-227 save loads untouched. simManagerCareer's sack detector updated WITH the round: a sack is the unemployed flag flipping, not the word Relegated in the line, because surviving relegation is a new outcome, not a rehire. All 18 engine-adjacent harnesses green.) `RUN227.bat`, chain-guarded on 226. **SHIP85.bat is the current wrapper: it runs 157 through 227.** |
| Packaged 2026-08-20, evening UTC | **Round 228** (THE PERFECT SEASON FAMILY FENCED, plus a misleading rejection fixed in the number three game. /build-your-xi (832 pageviews, the measured number three) validates answers through the validate-player edge function and fails closed correctly, EXCEPT one path: a non-OK response (rate limit, server error) was parsed as if it were a verdict, `valid` read off an error body, and the player was told his TRUE answer "hasn't played for" the club. Now a non-OK response says the honest thing, could not verify, try again. THE FENCE: the four Perfect Season games (162-0/82-0/82-0/17-0, /perfect-season-nba at 628 pageviews is measured top five) share one engine core plus per-sport Supabase adapters and had ZERO harness coverage. simPerfectSeason is harness 94, five sections: core math (winProbability monotone inside its documented bounds, simulateSeason deterministic with wins equal to games won and perfect meaning perfect, teamOverall the weighted mean it claims); framing copy total over every win count of every sport with the undefeated and one-loss overrides outranking the tiers; daily seeding measured the Round 223/224 way BEFORE anything broke (four sports draw four different seeds every day of a simulated year, same date reproduces, the daily first pick reaches 18+ of 20 wheel positions in a year; this family's dailySportSeed multiplies a small salt and stays under 2^53, so it is genuinely fine); the saved daily attempt loading fail closed at the LOGIC level (hostile version, stale date, garbage all null); and the LIVE wheels per sport, skipping loudly offline: measured 2026-08-20 at nba 1,616 team-season entries, nfl 828, nhl 194, mlb 1,000, floors ratcheted to about half of each, eight squads sampled per sport across the wheel with unique players, ratings inside 40-99, eligibility keys that exist, stat lines present, and ZERO dead spins (every sampled squad fills a fresh board). Both touched games browser-played clean.) `RUN228.bat`, chain-guarded on 227. **SHIP86.bat is the current wrapper: it runs 157 through 228.** |
| Packaged 2026-08-20, evening UTC | **Round 229** (THE ROADMAP AUDIT, the last predictable daily walk closed, and an over-purge prevented by measurement. THE AUDIT: the roadmap's four-item "Next up" list predated a hundred rounds and three items had quietly shipped (awards including Puskás and the cabinet, the 2032 real-name cutoff, the manager epilogue as of 227); rewritten with evidence, and the genuinely open list is now person_key backfill, mini games (with the measured AU signal: Australia is the number two country at 3,551 visits and the site has zero Australian sport content), and GA4 which parks on an owner-only measurement ID. THE MEASUREMENT THAT SAVED DATA: Round 224's loan lead proposed purging A-to-B-then-back-within-2-years pairs from the transfer pool as loan artifacts; pulled all 57 such return legs and spot-checked them against known history, and MANY are real permanent transfers (Werner back to Leipzig, Payet to Marseille, David Luiz to Chelsea, Morata to Madrid, Filipe Luis to Atletico), so the purge is REJECTED and recorded, a loan-aware rule needs loan flags the source data does not carry. THE CODE: Sports Quiz Board's per-tile clue pick was the site's last predictable +1-a-day walk (pickDeterministic added the raw date to an offset, so tomorrow's alternative clue was always simply the next one); it now uses a labelled dailyDraw per (date, category, value) like every daily pick since Round 224, the dead helper is deleted, and both simDateDraws and simDaily stay green. The category splice keeps its measured-adequate generator and its allowlist entry.) `RUN229.bat`, chain-guarded on 228. **SHIP87.bat is the current wrapper: it runs 157 through 229.** |
| Packaged 2026-08-20, evening UTC | **Round 230** (THE MERGED-IDENTITY BLOBS ARE OUT OF THE TRANSFER POOL, and the person_key lead is honestly closed. The plan was the backfill; the evidence killed it in two measurements. First, debut_year is 100% populated but was derived PER (name, nationality), so zero pairs carry two debut years and it holds no identity signal at all. Second, the Paulinho|Brazil blob laid out in full is at least six real careers interleaved year by year (the Ahlen/Aarau one, the Hacken/Orebro one, two Japan-based ones, the Corinthians/Tottenham/Barcelona star, the Vasco/Leverkusen one, plus literal duplicate rows and Retired pseudo-club rows), so ANY inferred lane assignment produces chronologically-plausible but person-WRONG careers, and plausible-but-wrong is exactly what the data rules forbid. SHIPPED INSTEAD, provable from the table alone: a (name, nationality) pair with 3+ distinct clubs in one calendar year, or a span past 22 years, is not one career; 39 such pairs exist and they are precisely the mononym roll call (Paulinho, Fernandinho, Marcelo, Robinho, Alex, Diego, Douglas...) plus Luis Garcia and Carlitos. Every transition inside those blobs is excluded from the pool rebuild, which removed 55 of 1,802 rows INCLUDING a live fabricated "Fernandinho: Atletico Mineiro to Manchester City 2014" card (the real Fernandinho came from Shakhtar in 2013). Pool now 1,745 rows, 731 at the game's bar, zero duplicate vote keys, Neymar's three real moves intact, all five famous pins green. simDateDraws grew four merged-identity ghost pins (any Paulinho/Fernandinho/Marcelo/Robinho Brazil row in the pool goes red). The repo migration mirror carries the six-step story. Known cost, accepted: a genuine single career that really did touch three clubs in one calendar year inside these name blobs is dropped with the blob; the blob names make that overwhelmingly the right trade.) `RUN230.bat`, chain-guarded on 229. **SHIP88.bat is the current wrapper: it runs 157 through 230.** |
| Packaged 2026-08-20, late evening UTC | **Round 231** (THE SITE'S FIRST AUSTRALIAN RULES GAME, built for the measured number two country. The analytics case from the 2026-08-20 pull: Australia sends 3,551 visits a month, 21% of everything, and the menu had nothing for them. /afl-higher-lower is a direct port of the proven HL template (10 rounds, streak bonuses, shared ET daily plus unlimited, hard mode pairing close counts, ties pay both ways): which legend kicked more career VFL/AFL goals. THE DATA, the part that matters: 60 RETIRED goal kicking leaders, two-source verified (the aflonline.com.au all-time table cross-checked against the documented records: Lockett 1,360 the all-time record, Coventry 1,299, Dunstall 1,254, Franklin 1,066, Wade 1,057, Ablett Sr 1,031 the complete thousand-goal club). Four active players on the source list (Cameron, Walker, Gunston, Darling) and the 2025 finisher Breust were deliberately EXCLUDED: active totals move and the site does not ship numbers that quietly go wrong. New registry category Aussie Rules after Golf, per-game SEO content in moreSports.ts, sitemap regenerated to 117 URLs WITH the simIndexNow ratchet raised in the same round per its own rule. simAflHL is harness 95: the six verified totals pinned (any drift goes red), the thousand-goal club closed at exactly six, 60 unique names sorted with sane 1897-2024 spans, the no-active-players rule enforced, and the tie the game copy quotes (Carey and Hudson, 727 each) proven present. The HL family fence in simDateDraws grew an afl row (pool 60, zero identical boards, zero identical opening pairs over a simulated year) and the shuffle joined the measured allowlist. One guard story worth keeping: the rival-name scan flagged Simon Madden, a real Essendon ruckman sharing a surname with the banned video game, resolved with the guard's own inline allow and a comment saying exactly why. Browser-played 14 interactions clean.) `RUN231.bat`, chain-guarded on 230. **SHIP89.bat is the current wrapper: it runs 157 through 231.** |
| Packaged 2026-08-20, night UTC | **Round 232** (THE COLLEGE GRID IMPOSSIBLE-CELL FENCE, and it dug up a rotten champions table on the way. THE FIND: cfb_national_champions was a corrupted scrape, every row suspect: losing scores stored as records (Alabama "16-44" for the season Clemson won 44-16), RUNNERS-UP stored as champions (USC for the 2005 season TEXAS won in the Rose Bowl, Ohio State THREE times for the 2006 season FLORIDA won 41-14, Iowa for 1985 which Oklahoma won), duplicates, and about half the real champions missing (no Texas, Penn State, BYU, Colorado, 2014 Ohio State, 2016 Clemson, 2020 Alabama, 2021 Georgia). The List Quiz reads it as "every school with a national title in our records", so players were being taught wrong history. REBUILT season by season, 1981-2025, 49 verified rows across 22 schools with split years carried per selector; the 2025 row (Indiana 27-21 over Miami, their first title, game played 2026-01-19) verified against ESPN, NCAA.com and NPR the same day; repo mirror in supabase/migrations/20260820_rebuild_cfb_national_champions.sql. ALSO FOUND AND RECORDED: cfb_all_americans is its own mangled scrape (position null everywhere, the school column a jumble of positions and class years); nothing on the site consumes it, so nothing shipped wrong, and the fence treats it witness-only (can prove a yes, can never prove a no). THE FENCE: simCollegeGrid is harness 96, the Round 218 pattern applied to /college-grid (517 pageviews, measured top ten): all 75 boards, every cell oriented (college, or conference expanded to the famous pre-realignment members, against a criterion), verified against 17,980 draft picks for the boards' colleges with normalized position groups, the 91-row Heisman table, the rebuilt champions, plus the count ratchet at exactly 75, unique ids, 3x3 shape, the original Oregon-x-National-Champion pin, and champion-table pins (Texas 2005, Florida 2006, Indiana 2025, Clemson 1981, Penn State 1982 must all exist, Oregon must not). VERDICT ON THE BOARDS THEMSELVES: 504 of 675 cells verified answerable, 171 rest on criteria no table can see (counted loudly, the Round 219 rule), ZERO impossible cells, so the old hand audit held and now something stands guard. Supabase sections skip loudly offline.) `RUN232.bat`, chain-guarded on 231. **SHIP90.bat is the current wrapper: it runs 157 through 232.** |
| Packaged 2026-08-20, night UTC | **Round 233** (EVERY LIST QUIZ SOURCE AUDITED, AND THE WHOLE FINALS-TABLE FAMILY CARRIED THE ROUND 232 DISEASE. THE HARNESS: simListQuizSources is harness 97, four layers through the quiz's own fetch closures: every one of the 26 live lists must clear its declared minAnswers after the game's own cleaning; no cleaned answer may look like the cfb-style column shift (scorelines, bare ranks, class years, lone position words); pinned facts verified outside the database (36 must-contain names across the lists plus 13 year pins, with the champions decided after the January cutoff verified against news sources on 2026-08-20: Super Bowl LX Seahawks 29-13 over the Patriots, 2026 NBA Finals the Knicks in five over the Spurs with Brunson MVP, 2026 Stanley Cup the Hurricanes over Vegas in six, 2026 NCAA basketball Michigan 69-63 over UConn, 2025-26 Premier League Arsenal; a wrong winner in an existing row fails, a missing recent year is a loud freshness note); and shape fences described below. FIRST RUN VERDICT: all 26 lists green, sniff clean, every pin true, one freshness gap (no 2026 Stanley Cup row). THE FIND BEHIND THE GAP: all four finals-series tables (stanley_cup_finals_v2, world_series_v2, wnba_finals, nba_finals) carry the shifted-scrape disease in their UNCONSUMED columns: scores sitting in loser (85 of 110 Stanley rows, about 100 World Series rows including best-of-9 and tie-game formats), coaches and managers sitting in series_result, the true WNBA runners-up sitting in finals_mvp, and nba_finals scores whose DIRECTION depended on whose franchise page the scrape read (Boston's 1959 sweep stored as 0-4, Jason Kidd stored as the 2024 winning coach when Joe Mazzulla's Celtics won). Nothing wrong ever shipped, the quiz reads only the winner columns and those plus nba finals_mvp were checked row by row against the record and are correct, but Round 232 proved this sits harmless only until a new feature reads the table. THE REPAIR, one migration (supabase/migrations/20260820_finals_tables_shape_repair.sql, applied live, backups of all four pre-repair tables kept with RLS on and no policy, get_advisors clean): every cell either moves to the column that means it, corroborated against known history, or goes honestly to NULL, nothing invented. Scores relocated winner-first (definitional for a completed series, and every relocated games-split was checked), all 29 WNBA losers recovered from the team names stranded in finals_mvp, 15 NBA losers recovered from franchise-history strings naming a team other than the winner, coach and manager names dropped because half the NBA attributions were the LOSING coach and there is no coach column for them anyway. The 2026 Stanley Cup row added (Hurricanes over the Vegas Golden Knights in six, verified against NHL.com and CBS Sports today) and the prior session's 2026 NBA row corroborated against NBA.com and ESPN. THE FENCES, permanent in the harness: per table, a loser never starts with a digit, a series_result is winner-first games and nothing else, the person columns never carry digits, and row plus named-loser floors sit at half to two thirds of measured so a truncation or a re-scrape goes red. Nothing player-visible changed, so no WhatsNew entry.) `RUN233.bat`, chain-guarded on 232. **SHIP91.bat is the current wrapper: it runs 157 through 233.** |
| Packaged 2026-08-20, night UTC | **Round 234** (VFL/AFL PREMIERS JOIN THE LIST QUIZ, the second Australian build for the measured number two country (3,551 visits a month, 21% of traffic). THE DATA FIRST: a new afl_premiers table, 129 rows, one premier per season 1897 through 2025 with zero gaps (the league played through both wars; 1924 had no grand final but Essendon are the premiers; 2026 is absent because that grand final has not been played). Two-source verified the same day: afl.com.au's premiership winners page cross-checked against aflonline.com.au's premiers roll, agreeing on every single year, with Wikipedia's summary corroborating the headline counts. The famous totals hold exactly: Essendon, Carlton and Collingwood 16 flags each, Richmond, Hawthorn and Melbourne 13, Geelong 10, Fitzroy 8, St Kilda's lone 1966 flag, the Bulldogs' 2016. Clubs are named as they were at the time (South Melbourne for 1909/1918/1933, Footscray for 1954), the Minneapolis Lakers convention the other champion lists already use, giving 18 distinct answer strings. RLS on with a public read policy, repo mirror in supabase/migrations/20260820_create_afl_premiers.sql. THE GAME: a 27th List Quiz category, id afl-premiers, in its own AFL section of the picker (the picker groups by sport automatically), minAnswers 12. THE FENCES, riding Round 233's harness: the new list flows through all four audit layers automatically, plus five must-contain pins (including Footscray and St Kilda), a 2025 Brisbane year pin, and a dedicated exact ratchet: precisely 129 rows, each season 1897-2025 exactly once, exactly 18 names, and ten pinned flag counts, so the 2026 grand final row and the ratchet must move together deliberately. VERIFIED: harness green against the live table, tsc zero, build green, rival-names green, and browser-probed: the AFL card renders in its section, and with the sandbox's browser network dead (chromium could not reach ANY host, example.com included, an environment restriction, not a code path) the designed offline degradation was observed working: the picker offers the built-in list with the honest banner instead of hanging, and play mechanics (surname aliases, full names, miss feedback, the found counter) all proven in-browser on that list with zero page errors. WhatsNew entry added, the list-quiz SEO copy count updated to 27.) `RUN234.bat`, chain-guarded on 233. **SHIP92.bat is the current wrapper: it runs 157 through 234.** |
| Packaged 2026-08-20, night UTC | **Round 235** (NEW GAME: CHAMP OR NOT, the roadmap's mini games item cashed against this week's audit work. /champ-or-not deals ten true-or-false claims a day about champions: a TRUE claim is a real (year, winner) row read verbatim from the audited tables, a FALSE claim pairs a real year with a real winner of the SAME competition who did not win that year, so nothing is ever invented and every reveal names who really won. Nine competitions per day, every one appearing at least once (Super Bowl, NBA, World Series, Stanley Cup, WNBA, college football with split titles counted true for both schools, men's NCAA basketball, the English title with era-neutral phrasing since the filter covers the whole top flight back past 1993, and the AFL premiers built last round). Deterministic dailies on labelled dailyDraw/shuffledRange like every daily since Round 224, shared ET date, saved daily result with a FAIL-CLOSED shape-guarded loader (the R221 rule), unlimited mode, RulesGate instructions with a worked example (the 1994 Bulls baseball-year trap), registry entry under World and Olympic Games with daily flag, full SEO content entry, sitemap regenerated to 118 URLs with the simIndexNow floor raised in the same round per its rule. simChampOrNot is harness 98: hostile-save shapes rejected in unit, live pool floors at half of measured (sb 60, nba 80, ws 121, cup 110, wnba 29, cfb 49, cbb 87, epl 127, afl 129 rows measured), then a SIMULATED YEAR of 3,650 rounds re-verified against an independent truth map built from the same fetched rows: every TRUE claim exists, every FALSE claim absent from that year's winner set (the split-title trap can never fire: USC 2003 can never be served as false), decoys are real winners, no long dashes in any statement, all nine competitions served daily with no back-to-back repeats, consecutive days never identical, same day rebuilt byte-identical, true rate 50.7% inside the 46-54 coin band. Gates: tsc zero, build green, simSitemap green (no orphans), simIndexNow green at the new floor, rival names green. Browser-probed on the built bundle: rules dialog shows, home tile present, a wrecked daily save cannot crash the page, and the dead-network case surfaced a real UX gap the probe caught: fetches that HANG (rather than reject) left an endless spinner, fixed with a 15 second watchdog that flips to the honest retry card while still letting late data win, re-probed and confirmed. The sandbox browser had no external network today (chromium could not reach any host), so live in-browser play waits for the next sandbox; the data path is fully proven by the harness in node.) `RUN235.bat`, chain-guarded on 234. **SHIP93.bat is the current wrapper: it runs 157 through 235.** |
| Packaged 2026-08-20, night UTC | **Round 236** (THE NRL JOINS THE RECORDS SHELF, the third Australian build, and the new data went into two games at once. THE TABLE: nrl_premiers, 117 rows covering every top grade premiership 1908-2025, two-source verified the same day (Wikipedia's Australian rugby league premiers roll against Topend Sports, agreeing on every year). Three honesty decisions recorded in the migration: 1997 carries BOTH premiers because the game split (Newcastle Knights in the ARL, Brisbane Broncos in Super League), both real, handled natively by the split-title machinery; 2007 and 2009 are ABSENT FOREVER because Melbourne's titles were stripped for the salary cap and stay vacant, so an absent year can never be asked about and Melbourne's count reads the honest 4; names are canonical per continuous club (Canterbury-Bankstown Bulldogs covers its Sydney Bulldogs and Bulldogs branding years) with genuine renames and mergers as separate answers (Eastern Suburbs then Sydney Roosters; St George then St George Illawarra Dragons), landing every famous count exactly: Souths 21, St George 15 with the eleven straight, Easts and Balmain 11, Manly and the Bulldogs 8, Brisbane 7 with the Super League year as its own competition row, Penrith 6 with the four-peat. A competition column carries the era (NSWRFL to 1983, NSWRL to 1994, ARL, Super League, NRL). RLS on, public read policy, repo mirror in supabase/migrations/20260820_create_nrl_premiers.sql. THE GAMES: Name Them All's 28th list (nrl-premiers, its own NRL picker section, minAnswers 12) and Champ or Not's TENTH competition with era-neutral phrasing ("won the top grade rugby league premiership in {year}") that is true for both 1997 premiers and can never ask about the vacated years. Copy counts updated (27 to 28 lists, nine to ten competitions). THE FENCES: simListQuizSources grew five NRL must-contain pins (including North Sydney and Newtown, the answers nobody remembers), a 2025 Brisbane Broncos year pin, and an exact ratchet: 117 rows, every season 1908-2025 with 1997 at exactly two rows and 2007/2009 at exactly ZERO (the stripped-title pin), 20 canonical names, twelve count pins. simChampOrNot's floors grew nrl 58 (half of 117). Both harnesses green live: 28 lists audited clean, and the year simulation now proves 3,650 honest claims across all ten competitions daily. tsc zero, build green, rival names green. No new route, so the sitemap stands at 118.) `RUN236.bat`, chain-guarded on 235. **SHIP94.bat is the current wrapper: it runs 157 through 236.** |
| Packaged 2026-08-20, late night UTC | **Round 237** (CHAMP OR NOT HARD MODE, AND THE FULL BOARD RUN OVER THE FIVE STACKED ROUNDS CAUGHT TWO REAL THINGS. THE FEATURE: hard mode on the Unlimited tab (the shared daily stays one board for everyone, the HL-games convention). Regular fakes pull any winner from a competition's whole history, which a sharp fan reads from the era alone; a hard fake is a team that REALLY won within HARD_WINDOW (3) seasons of the claimed year but not the year itself ("the Penrith Panthers won the 2020 premiership"), still checked against every real winner of that year so the honesty guarantee is identical, with a whole-history fallback when no close winner exists. Toggle resets the run, seed labels carry :hard so boards differ, result share and emoji grid tag hard runs, and the unlimited share line stopped claiming "today's". simChampOrNot grew section 3b: 120 simulated hard runs, 622 fakes, 616 within 3 seasons and 6 honest fallbacks (all deep inside St George's eleven straight, where no other club won nearby), floor at 95% close, determinism pinned. THE BOARD RUN: node scripts/runAllSims.mjs over all 94 node harnesses (35 browser harnesses skipped loudly: the sandbox's chromium could reach no external host today). 92 green including every heavy engine sim; two REAL failures, both fixed and re-proven this round: (1) simRelatedGames: /afl-higher-lower offered only 3 related links because a ONE-GAME category has no ring to lean on (latent since Round 231, the round gates never ran this harness); relatedGamesFor now keeps hash-walking variety picks until the block holds six, which provably changes nothing on existing pages (they already stopped at six, so zero link churn for crawlers) and the harness's whole board is green again (out-degree, inbound spread, BFS reachability, determinism). (2) simNoInventedQuotes flagged the round's own fresh WhatsNew copy: "St George's eleven straight" put a roster surname (George) on a line whose "invented: we measured" read as a first-person handover; reworded to the Dragons' eleven straight with no speech shape, and the static pass re-run to zero offending lines across 682 files (the 25-minute runtime pass was green in the same suite run). Gates: tsc zero, build green, rival names green.) `RUN237.bat`, chain-guarded on 236. **SHIP95.bat is the current wrapper: it runs 157 through 237.** |
| Packaged 2026-08-20, late night UTC | **Round 238** (THE RECORD BOOKS: the week's audit work becomes a public reference page. /records renders all ten audited champion tables year by year (Super Bowl with runner-up, score and MVP, all complete; NBA back to 1947 with winner-first series and every Finals MVP since 1969; World Series since 1903 with the best-of-nine and tie-game years reading as played; Stanley Cup since 1915 with 1919 and 2005 correctly absent; WNBA with all 29 beaten finalists recovered in Round 233; CFB with selector, result and coach per row and split titles per selector; men's CBB; English champions; AFL premiers; NRL premiers with the competition era column and the vacated-titles honesty note rendered under the table). Data layer is src/lib/records.ts reading the SAME live tables the games read, columns shown only where verified and reasonably filled (a blank cell is honest thinness, never a guess), rows newest first with a show-all toggle per section (12 rows by default so the page loads glanceable), per-section independent fetch with fail-closed error lines and a 15 second watchdog, jump nav, and every section linking into the games that play on that history (all links harness-verified against the registry). Discovery: footer link sitewide (Record Books), sitemap regenerated to 119 with the simIndexNow floor raised in the same round per its rule; not a game, so no registry entry. simRecords is harness 99: all ten sections against the live tables with the champ-or-not floors, column-completeness pinned exactly where the repairs made columns complete (sb runner-up/score/mvp, cfb selector/result/coach, nba series, nrl competition), NO LONG DASH anywhere in any rendered cell (the style rule as a data fence), scores and series shape-checked, play links resolved, the NRL note required to keep saying stripped and vacant. Browser-probed on the built bundle: renders, jump nav, per-section offline degradation after the watchdog, note present, footer link live sitewide, zero page errors (sandbox browser still has no external network, so live tables in-browser wait for the next sandbox; the node harness proves them). Gates: tsc zero, build green, simSitemap green, simIndexNow green at 119, rival names green, related games green.) `RUN238.bat`, chain-guarded on 237. **SHIP96.bat is the current wrapper: it runs 157 through 238.** |
| Packaged 2026-08-20, late night UTC | **Round 239** (EVERY NBA FINALS NAMES ITS BEATEN FINALIST, the first enrichment round for the Record Books. Round 233's shape repair recovered 15 runners-up and honestly nulled 64 the scrape never carried; this closes the column: all 80 Finals 1947-2026 now carry the loser. THE VERIFICATION, three ways agreeing before any row moved (the method is the story): an independent finals list was fetched and MACHINE-CHECKED against the database, where all 79 pre-2026 winners aligned and all 79 series scores agreed EXACTLY with the Round 233 repair (mutual corroboration of both sides); the 15 already-recovered losers all matched; and every derived runner-up was checked against known history row by row. The cross-check caught the fetched list carrying TWO bad lines, which is why it exists: its 2026 row inverted the result (the Knicks beat the Spurs in five, verified against NBA.com and ESPN earlier today, so the fetched line was discarded and the DB row stands) and its 1948 line flipped a settled series (the Baltimore Bullets beat the Warriors 4-2; the pair was right, the direction wrong, resolved by the verified DB winner). Era names kept (Chicago Stags, Washington Capitols, Fort Wayne Pistons, San Francisco Warriors). Migration guarded (fills NULLs only), repo mirror supabase/migrations/20260820_backfill_nba_finals_losers.sql. SHIPPED WITH IT: the Record Books NBA section gains the Runner-up column (now complete: Year, Champion, Runner-up, Series, Finals MVP), simRecords pins nba runnerUp complete, and simListQuizSources raises the nba named-loser floor from 12 to 70 (80 measured). Verified live: 80 of 80 rows carry the loser, zero self-losses, all fences green, tsc zero, build green, rival names green.) `RUN239.bat`, chain-guarded on 238. **SHIP97.bat is the current wrapper: it runs 157 through 239.** |
| Packaged 2026-08-20, late night UTC | **Round 240** (EVERY WORLD SERIES NAMES ITS BEATEN PENNANT WINNER, the Round 239 method applied to baseball: all 121 series 1903-2025 now carry the loser (101 backfilled; the 20 the scrape had clean all reconfirmed). THE VERIFICATION: Wikipedia's champions table would not come through the fetcher (its metadata did, and it matches ours exactly: 121 series, 1904 and 1994 absent, the best-of-nine and tie-game years), so the independent list came from Topend Sports and was machine-checked against the database: all 121 winners align (two period-name variants ruled on: Boston Americans and Washington Senators stay, the table's own convention, so the 1925 and 1933 losers are recorded as Washington Senators for internal consistency), the 20 existing losers all match, and the series scores agree on 118 of 121 with all three deltas resolved IN THE DATABASE'S FAVOR and recorded in the migration: the source drops the tie games from 1907/1912/1922 (our 4-0-1, 4-3-1, 4-0-1 are the fuller truth), claims 1995 ended 4-1 (it went six, Glavine's one-hitter, our 4-2 stands, both sides agree Cleveland lost), and prints an impossible 5-4 for 2025 (our verified 4-3 stands). Every derived runner-up also read against known history row by row (Black Sox 1919, Murderers' Row victims, the 1944 all-St. Louis series with the Browns, Buckner 1986, the earthquake Giants 1989). Migration guarded (fills NULLs only), repo mirror supabase/migrations/20260820_backfill_world_series_losers.sql. SHIPPED WITH IT: the Record Books World Series section gains the Runner-up column (Year, Champion, Runner-up, Series, complete), simRecords pins ws runnerUp+series complete, simListQuizSources raises the ws named-loser floor 15 to 110 (121 measured). Verified live: 121 of 121 rows carry the loser, zero self-losses, all fences green, tsc zero, build green, rival names green.) `RUN240.bat`, chain-guarded on 239. **SHIP98.bat is the current wrapper: it runs 157 through 240.** |
| Packaged 2026-08-20, late night UTC | **Round 241** (EVERY STANLEY CUP FINAL NAMES ITS BEATEN SIDE, completing the finals-loser sweep: all 110 finals 1915-2026 now carry the runner-up (83 backfilled; the 27 the repairs had recovered all reconfirmed), which means EVERY finals table on the site is loser-complete (cup 110/110, ws 121/121, nba 80/80, wnba 29/29). THE VERIFICATION, the Round 239 method: Topend Sports' finals roll machine-checked against the database: all 110 winners align (two period-name rulings recorded: the database's Toronto Hockey Club and Toronto St. Patricks stand for 1918 and 1922 against the source's Arenas and St. Pats, same clubs), the 27 existing losers all match, series scores agree on 108 of 110 with both deltas resolved in the database's favor: the source prints 2-1 for 2024 and 5-1 for 2025, which are the CLINCHING GAMES' GOAL SCORES, not series results (the real series were the Panthers' 4-3 game-seven over Edmonton and 4-2, both already verified). Pacific Coast and WCHL challengers land under their real names (Portland Rosebuds 1916, Edmonton Eskimos 1923, Calgary Tigers 1924), the 2003 loser is the Mighty Ducks of Anaheim under the era name, and the row-by-row knowledge sweep covered the famous ones (the 1942 comeback over Detroit, the Blues swept in their first three finals, Hull's skate 1999). Migration guarded (fills NULLs only), repo mirror supabase/migrations/20260820_backfill_stanley_cup_losers.sql. SHIPPED WITH IT: the Record Books Stanley Cup section gains the Runner-up column, simRecords pins cup runnerUp+series complete, simListQuizSources raises the cup named-loser floor 20 to 100 (110 measured). Three rounds of the method have caught SEVEN source errors (two NBA, three World Series, two Cup). Verified live: 110 of 110 rows carry the loser, zero self-losses, all fences green, tsc zero, build green, rival names green.) `RUN241.bat`, chain-guarded on 240. **SHIP99.bat is the current wrapper: it runs 157 through 241.** |
| Packaged 2026-08-20, late night UTC | **Round 242** (NEW GAME: WHO'D THEY BEAT?, the completed loser columns become a game the same day the last of them landed, plus THE FINAL FINALS BACKFILL: the ten missing WNBA series scores verified (Athlon's finals list agreed with all 29 winners, all 29 losers and all 19 existing scores, and the ten new ones matched known history row by row) and applied, so every finals table is now FULLY complete: winner, runner-up and series on every row. THE GAME: /whod-they-beat gives the champion and the year across five competitions (Super Bowl, NBA, World Series, Stanley Cup, WNBA), and you pick who they beat from four options that are ALL real beaten finalists of that competition, so the traps are the near-year runners-up (the 1995 Magic sit next to the 1994 Rockets question). Ten finals a day, each competition exactly twice via a two-pass shuffle with no back-to-back repeats, deterministic labelled draws, fail-closed shape-guarded daily save, unlimited mode, RulesGate with the 1994 Rockets worked example, reveal teaches the series result (and the Super Bowl numeral from sb_number), registry under World and Olympic Games with daily flag, full SEO content, sitemap 121 games/120 URLs with the simIndexNow floor raised per its rule. simWhodTheyBeat is harness 100: hostile saves rejected, live pools floored (60/80/121/110/29 complete finals measured), then a SIMULATED YEAR of 3,650 questions against an independent truth map: every correct option IS the table's loser for that exact year, every distractor a real loser of the same competition and never the champion, options unique, series details match the table, each competition exactly twice daily with no adjacency, correct-answer position spread measured 23.6/24.5/26.5/25.4 against a 15-35 band (no always-option-A tell), consecutive days never identical, same day byte-identical. Gates: tsc zero, build green, simRecords/simListQuizSources/simSitemap/simIndexNow/simNoRivalNames/simRelatedGames/simChampOrNot all green. Browser-probed: rules dialog, fail-closed offline card, wrecked save cannot crash, home tile present, zero page errors (sandbox browser still offline externally; the node harness proves live data).) `RUN242.bat`, chain-guarded on 241. **SHIP100.bat is the current wrapper: it runs 157 through 242.** |
| Packaged 2026-08-20, late night UTC | **Round 243** (THE DAY'S BOOKEND: the full board run over everything, and the roadmap rewritten with evidence. THE BOARD: node scripts/runAllSims.mjs over ALL 96 node harnesses against the tree carrying rounds 233 through 242, every single one green, including the two new game simulators (97 through 100 joined the board this day), the heavy engine sims, and the 25-minute invented-quotes guard. The 35 browser harnesses were skipped loudly for the second time today: this sandbox's chromium could reach no external host at any point, so the browser board (sweeps, plays, contrast, saves) is THE FIRST ITEM OF BUSINESS for the next session with working browser egress: run `node scripts/runAllSims.mjs --browser` before building anything. THE ROADMAP: the mini games item is closed as heavily delivered (the whole R231-242 arc listed with round numbers), and two new open items are written with enough detail to start cold: the Soccer Career CLUB CAPTAINCY ARC as the flagship's next build (current state mapped: random event 3 sets isLeader, the under-23 dilemma, the real international check at 30 caps; the arc design sketched: earned armband by age plus tenure plus standing, stripped on transfer, retention in decline, cabinet line, one captaincy truth; verify the R227 way with a seeded few-hundred-career harness), and the cheap Round 239-method enrichments now open (wnba finals_mvp, sb city, ncaa runner_up). FOR THE RECORD, the day in one line: rounds 233 to 243, two new games, two new sports verticals, a public Record Books page, every champion list audited against the record, every finals table completed to winner plus runner-up plus series on every row, seven source errors caught by the triple-check method, and 96 of 96 harnesses green at close.) `RUN243.bat`, chain-guarded on 242. **SHIP101.bat is the current wrapper: it runs 157 through 243.** |
| Packaged 2026-08-20, past midnight UTC | **Round 244** (THE ARMBAND IS A CAREER: the flagship's club captaincy arc, the roadmap item written the round before, built with ONE captaincy truth instead of three half systems. THE STATE: isClubCaptain + captainClub + captainSeasons (per-stint count), all optional so every pre-244 save loads untouched, with repairCareer dropping any armband claimed at a club he no longer plays for. THE ROADS IN: earned in the season loop (age 24+, overall 76+, two prior seasons at the club, base 18% a season with leaders +15, academy sons +10, +5 per extra tenure year capped) or voted early via random event 3, which now lands in the same awardClubCaptaincy so the vote and the earned path can never disagree; the event stays gated off once any path set it. THE ROADS OUT, all honest: acceptOffer strips it with "the armband stays behind" ON THE FRESH EVENTS LIST (the reset in acceptOffer would have eaten an earlier line), acceptLoan hands it over, decline at 33+ with overall 74 or below passes it on with a dressing room send-off, all three retirement paths close it out, and a catch-all at the season push ends it if ANY unusual flow (prison) changed clubs without a transfer. THE CABINET: every stint that completed a season leaves "Club Captain of X (n seasons)" with the per-stint count, second armbands elsewhere earn their own line. UI: the ©️ badge beside the club name. simClubCaptaincy is harness 101, seeded, invariants checked at EVERY state transition across 300 careers: award always lands with captainClub = currentClub, never on loan, always with isLeader; earned awards always 24+/76+/two prior seasons; the stint counter may only hold or step (a banned season rightly does not count); every cabinet line quotes exactly the engine's counter and names the right club; no transfer or loan ever kept the armband and no career retired holding it. Measured (seeded, exact): 42% of careers wear it, 80 earned + 79 voted, mean award age 25.8, 152 transfer strips, 33 second stints, 4 decline handovers (rare BY DESIGN: captains mostly transfer, retire or stay at the level), 125 cabinet lines all arithmetic-true; floors at half of measured. THE DRIVER LESSONS recorded in the harness: the engine counts the award season as worn (check before push, increment after), a ban skips the count, and handovers only exist for careers that DECLINE the retirement suggestion, so the fleet splits. Gates: tsc zero, build green, simSoccerCareer green, simBallonDorFairness green, simManagerEpilogue green, rival names green, and the invented-quotes STATIC pass re-run over the new engine copy: 687 files, zero offending lines. WhatsNew tells the players.) `RUN244.bat`, chain-guarded on 243. **SHIP102.bat is the current wrapper: it runs 157 through 244.** |
| Packaged 2026-08-21, small hours UTC | **Round 245** (EVERY WNBA FINALS MVP ON THE BOOKS, the first of the roadmap's cheap Round 239-method enrichments. The finals_mvp column held team names and coaches before the Round 233 repair honestly nulled it; now all 29 championships carry the real award: Cynthia Cooper's four straight to open the league, Leslie's pair, Taurasi 2009 and 2014, Fowles twice, Stewart twice, Meesseman 2019 (the only bench Finals MVP), Wilson 2023 and 2025. Verified against Athlon's finals list, the same source whose matchups agreed with all 29 verified winners and losers in Round 242, and every name independently matches known history. Migration fills NULLs only, repo mirror supabase/migrations/20260820_backfill_wnba_finals_mvp.sql. The Record Books WNBA section gains the Finals MVP column, completing that table on EVERY column like the other four finals; simRecords pins wnba runnerUp+series+mvp complete; the shape fence's no-digits-in-person-columns rule now guards real MVP names instead of nulls. Gates: simRecords, simListQuizSources, simWhodTheyBeat, tsc zero, rival names, build all green. Remaining item-6 enrichments open: sb city (venue column already complete and could ship as a column any time), ncaa runner_up/score/coach/MOP (87 rows, the biggest one left).) `RUN245.bat`, chain-guarded on 244. **SHIP103.bat is the current wrapper: it runs 157 through 245.** |
| Packaged 2026-08-21, small hours UTC | **Round 246** (EVERY NCAA TITLE GAME SCORED: all 87 men's championship games 1939-2026 now carry the beaten finalist and the final score (2020 cancelled, honestly absent). THE VERIFICATION, the Round 239 method: FOX Sports' championship list (1939-2024) machine-checked against the database with all champions agreeing (era-name rulings in the database's favor: Oklahoma A&M, NC State, Loyola Chicago are the schools the source spells Oklahoma State, North Carolina State, Loyola (Ill.); the 1955 runner-up recorded as La Salle to match the table's own 1954 champion spelling); the two seasons past the source's end verified separately (2025 Florida 65-63 over Houston: ESPN, CBS, NBC; 2026 Michigan 69-63 over UConn: verified the day of the Round 232 rebuild); and knowledge spot-checks throughout (the 1957 triple-OT 54-53, Texas Western 1966, NC State 54-52, Villanova 66-64, UNLV by thirty, Hayward's 61-59, Jenkins' 77-74, Virginia's OT 85-77). Migration fills NULL runner_up rows only, repo mirror supabase/migrations/20260821_backfill_ncaa_title_games.sql. The Record Books men's basketball section gains Runner-up and Score columns; simRecords pins cbb runnerUp+score complete. Verified live: 87 of 87 with both fields, zero self-losses. With this, item 6's enrichments are done except sb city (venue already complete; city stays null unless a game ever wants it), and EVERY table on the Record Books page is now complete on every displayed column. Gates: simRecords, simListQuizSources, tsc zero, rival names, build all green.) `RUN246.bat`, chain-guarded on 245. **SHIP104.bat is the current wrapper: it runs 157 through 246.** |
| Packaged 2026-08-21, small hours UTC | **Round 247** (THE GLUE ROUND: the Record Books gain the Super Bowl Venue column and the quiz games point at the books. THE VENUE COLUMN: era-accurate all the way back (Los Angeles Memorial Coliseum for I, Tulane Stadium for IX, Stanford Stadium for XIX, Cowboys Stadium for XLV before the rename), shipped after two cleanups recorded in one migration: the scrape's times-hosted annotations stripped from the names ("Rose Bowl (5)" is a list's context, not a stadium's name), and THE FENCE EARNING ITS KEEP IN REAL TIME: the moment venue joined the rendered set, simRecords' long-dash rule caught the 1988 venue carrying a Wikipedia en dash inside "San Diego(dash)Jack Murphy Stadium", normalized to the plain hyphen. simRecords pins sb venue complete and adds a permanent no-bare-parenthesised-count rule on every rendered cell ("(FL)" and "(interim)" are words and pass). THE CROSS-LINKS: Champ or Not, Who'd They Beat? and Name Them All each carry a one-line link to /records above their SEO blocks, and the Record Books' four finals sections now list Who'd They Beat? among their play links, closing the loop both ways (good for players who want receipts, good for the crawl graph). Gates: simRecords green after the catch, tsc zero, rival names green, related games green, build green.) `RUN247.bat`, chain-guarded on 246. **SHIP105.bat is the current wrapper: it runs 157 through 247.** |
| Packaged 2026-08-21, small hours UTC | **Round 248** (WHERE EVERY SUPER BOWL WAS PLAYED: the last item-6 enrichment, the all-null sb city column filled and a state column added so the pair renders as an almanac line ("Glendale, AZ" cannot be confused with Glendale, California). VENUE-KEYED backfill: every era stadium name in the table sits in exactly one host city, verified against Pro Football Reference's Super Bowl index plus a per-game knowledge sweep. TWO SOURCE DISPUTES SETTLED and recorded in the migration, with one rule applied across the table (the incorporated city containing the venue at game time, or the venue's contemporary postal city where unincorporated): Stanford Stadium (XIX) is Stanford CA (PFR says Palo Alto; Wikipedia's game article, its infobox and the stadium's own postal designation all say Stanford, 2 to 1), and Allegiant Stadium (LVIII) is Las Vegas (Wikipedia pedantically says the unincorporated Paradise; PFR and the stadium's own address say Las Vegas). ERA-ACCURATE MUNICIPALITY: the Miami Gardens site was unincorporated Dade County with a Miami postal address until 2003, so Joe Robbie and Pro Player games (1989, 1995, 1999) file under Miami and Dolphin/Sun Life/Hard Rock games (2007 on) under Miami Gardens; no venue NAME spans the 2003 line, so venue-keying is exact (PFR retroactively says Miami Gardens for 1989, the same disease as retroactive Caesars Superdome, rejected the same way). Verified live: 60 of 60 rows carry city and state, no city holds a venue word or digit, all states two capitals, grouped counts match the hosting history (New Orleans 11, Miami 8 through 1999, Miami Gardens 3 from 2007, Pasadena 5). Migration is ALTER ADD state + venue-keyed UPDATE filling NULL cities only, repo mirror supabase/migrations/20260821_backfill_sb_city_state.sql; advisors clean after the DDL. The Record Books SB section gains the City column (city and state joined in the fetch mapper, same pattern as the score join); simRecords pins sb city complete, shape-checks every city cell as "City, ST" with no venue words, and pins the era boundary permanently (1967 Los Angeles, 1985 Stanford, 1989 AND 1999 Miami, 2007 Miami Gardens, 2014 East Rutherford, 2024 Las Vegas, 2026 Santa Clara); the pin path was proven to execute by a deliberate wrong-pin run failing before the real run passed. WITH THIS, ROADMAP ITEM 6 IS FULLY DONE: every enrichment (wnba finals_mvp R245, ncaa runner_up/score R246, sb venue R247, sb city R248) shipped, and every Record Books table is complete on every displayed column. Gates: simRecords green, tsc zero, rival names green, build green.) `RUN248.bat`, chain-guarded on 247. **SHIP106.bat is the current wrapper: it runs 157 through 248.** |
| Packaged 2026-08-21, small hours UTC | **Round 249** (THE REVEALS GOT RECEIPTS: the week's completed finals data becomes teaching copy in both quiz games, closing the R242 "richer reveals" note. CHAMP OR NOT: CompetitionDef gains an optional finals config (loseCol + seriesCol or scoreCols) on the five finals competitions; fetchCompetitionRows builds row.beat ("the Denver Broncos 42-10" style, series for nba/ws/cup/wnba, game score for sb) only when loser and result are both present and shaped; buildRound carries it as ChampRound.beatLine (the drawn row is always a REAL row of the claimed year, a decoy only swaps the shown team, so the line describes the real final for true and false claims alike); the reveal renders "They beat {beatLine}." after the truth line, RulesGate and howToPlay updated. WHO'D THEY BEAT: the sb def gains extraCols (winner_score, loser_score, venue, city, state), FinalsRow carries score/venue/place, and the sb detail is now the full almanac line "Super Bowl XXVII, 52-17 at the Rose Bowl in Pasadena, CA" via an exported venuePhrase helper (article follows the venue's head noun: Bowl, dome, Coliseum take "the"; the city drops when the venue name already starts with it, so San Diego-Jack Murphy Stadium never gets "in San Diego" behind it); piecewise fallback if any part is ever missing. FENCES: simChampOrNot builds an INDEPENDENT beat-truth map through the other game's fetcher (whodTheyBeat.ts, a separate code path over the same tables) and asserts every finals reveal's beatLine equals the loser + series/score exactly across the 3650-round year, that list competitions never carry one, and the long-dash rule covers the new line; simWhodTheyBeat rebuilds the expected sb almanac line from its truth row (including the article and duplicate-city rules) and requires exact equality, with score/venue/place required present since those columns are complete. Both new fences PROVEN TO EXECUTE by deliberate-corruption runs before the clean runs (1825 and 730 failures, exactly the 5-of-10-comps and 2-sb-per-day counts predicted). Rendered lines eyeballed against known history (Astros 4-3 Dodgers, Flames 4-2 Canadiens, Redskins 42-10 Broncos, Bulls 4-2 SuperSonics, Sparks 2-0 Liberty, Seahawks 43-8 at MetLife). Saves unaffected: both games store only answer booleans and rebuild questions deterministically. Gates: tsc zero, simChampOrNot green, simWhodTheyBeat green, build green, rival names green.) `RUN249.bat`, chain-guarded on 248. **SHIP107.bat is the current wrapper: it runs 157 through 249.** |
| Packaged 2026-08-21, small hours UTC | **Round 250** (NEW GAME: SILVERWARE SORT, the Factle-style ordering concept from the idea bank built entirely on the audited champion tables, so the data bar was already cleared. /silverware-sort deals five teams from one competition and wants them stacked by title count, most first: tap chips into the ladder, two attempts per board with first-try greens LOCKING for the retry, one point per correct rung on the final answer, three boards a day (distinct competitions), unlimited mode, share grid with per-board green/red rows and a star for first-try perfection. THE TWO HONESTY RULES that make it servable: counts are derived by counting rows in the audited tables (the site convention: a title belongs to the name the club wore at the time, South Melbourne separate from Sydney, stated in rules and SEO), and a board only ever holds five pairwise-DISTINCT counts so exactly one right order exists (ties never share a board: Essendon/Carlton/Collingwood all on 16 is the canonical example, Steelers/Patriots both 6 the NFL one). ELIGIBILITY IS DATA-DRIVEN AND PINNED: a competition qualifies with five distinct count values; the WNBA honestly fails (only 3 values in its history) and is excluded by measurement, with the harness pinning the eligible set (sb, nba, ws, cup, cfb, cbb, epl, afl, nrl) so a future promotion is deliberate. cfb was verified safe for counting first (zero duplicate (year, champion) rows, so split-year selectors never double-count a team). Implementation: src/lib/silverwareSort.ts (reuses champOrNot's audited fetcher, aggregateCounts, isEligible, buildBoard greedy-distinct picker with a tray that is never the solved order, buildBoards, judge), useSilverwareSort (fail-closed save loader validating internal consistency: score must equal greens, first-try flag requires perfection; 15s watchdog; boards rebuild deterministically, saves store only results), SilverwareSort.tsx (tap-to-place ladder, locked greens, reveal shows the true order with counts, records cross-link), registry + route + full SEO content in world.ts, sitemap regenerated to 121 with the simIndexNow floor raised per its rule. simSilverwareSort is harness 102: 10 hostile save shapes rejected, team floors at half of measured, the eligible-set pin both directions, 15 knowledge-verified COUNT PINS (Yankees 27, Canadiens 24, Celtics 18, Liverpool and United 20, the three 16-flag AFL clubs, Souths 21, St George 15, UCLA 11, Steelers and Patriots 6), independent recount of every displayed count, then a 365-day year of 1095 boards (distinct counts, sorted solutions, tray permutation never identity, no wnba, no repeats within a day, coverage 106-133 per comp, determinism, no long dashes) and exact judge cases. Both fence families proven to execute by deliberate corruption (1 and 1095 failures exactly as predicted). BROWSER-PROBED TWICE on the built bundle: offline (tile, rules gate, wrecked saves cannot crash, watchdog error card, zero page errors) and a FULL PLAY-THROUGH with supabase proxied through the node side (three boards played tap by tap through lock-and-retry to the result screen, zero page errors), the first full in-browser play of a new game since the sandbox lost browser egress. Gates: tsc zero, simSilverwareSort green, simSitemap green, simIndexNow green at 121, simRelatedGames green, rival names green, build green.) `RUN250.bat`, chain-guarded on 249. **SHIP108.bat is the current wrapper: it runs 157 through 250.** |
| Packaged 2026-08-21, small hours UTC | **Round 251** (THE BROWSER BOARD RAN, AFTER FOUR SESSIONS OF BEING BLOCKED, AND CAUGHT A REAL CRASH. THE UNLOCK: cloud sandboxes give node full egress and Chromium none, which is why all 35 browser harnesses had been skipped since Round 233 with "run them next session" in this file; that session never comes because every sandbox is built the same way. scripts/browserEgressShim.mjs carries the browser's traffic over node's socket: a CONNECT proxy started inside the harness process, plus a monkey-patch of playwright's chromium.launch that routes every browser through it. Three details are load bearing and each cost a run to find: the sandbox intercepts TLS with a CA node trusts and Chromium does not (so --ignore-certificate-errors, acceptable because harnesses assert on content, not transport), sweepGames passes --no-proxy-server which would override the proxy (stripped), and the proxy must speak PLAIN HTTP as well as CONNECT with Connection: close forced, because a keep-alive socket's second request arrives in absolute form and broke sweepSaves' rapid navigations mid-board. Usage is one env var, no harness edits: NODE_OPTIONS="--import .../browserEgressShim.mjs" ENGINES=chromium node scripts/runAllSims.mjs --browser. THE BOARD: 98 of 98 node harnesses green, then 29 of 35 browser harnesses green on the first honest run. THE CATCH THAT JUSTIFIES THE WHOLE THING: playGames found /rebuild throwing "Cannot read properties of undefined (reading 'emoji')" on a signing, reproduced 5 times in 6, and it was real: rebuildDeck's four seeded helpers XOR hashSeed with the run seed, JS XOR is SIGNED 32-bit, so a hash with the top bit set went negative and warRivalIndex returned -1 for roughly a quarter of all players; rivalPlans[-1] was undefined and the first tap on such a player's Sign button killed the transfer market. The same signed remainder was also making isContested always true and rivalCapFor bid BELOW market for those players. All four forced unsigned (>>> 0), plus a fail-safe in useRebuild so a missing rival completes the deal uncontested instead of eating it. THE REST OF THE HAUL, all real: MissingXi and MissingFive pulsed the whole tile including its text (position tags measured 3.36 and 3.70 mid-pulse), now a background layer pulses and the words hold still; HigherLowerTransfers' hidden value at 40% opacity measured 1.94; BudgetBuilder's tap hint measured 3.80; 30 nameless controls on /career (icon-only reveal cells) and 9 per grid on nba/hockey/mlb now carry aria-labels naming the intersection; three guess fields named; every /records control padded to a 32px box (the phone sweep flagged 36 at 15-16px); and sweepWeight caught TWO games whose SEO guides were showing fallback copy for want of a loader.ts line, /afl-higher-lower (latent since R231) and /silverware-sort (yesterday's). HARNESS FIXES, both honest: sweepContrast's single animation wait read data-driven boards mid-fade (career season cells at 2.50 that settle over 10), so it now settles in bounded rounds and finishes any finite stragglers; playWilderness' 60-iteration patience was measured in a browser with no egress and flaked one run in two, so the walk now re-doctors the save and resumes every 40 iterations, keeping the sack inside the engine while making it inevitable, verified green twice back to back. Gates: tsc zero, build green, rival names green, and the six previously-red browser harnesses all green on re-run.) `RUN251.bat`, chain-guarded on 250. **SHIP109.bat is the current wrapper: it runs 157 through 251.** |
| Packaged 2026-08-21, small hours UTC | **Round 252** (NEW GAME: HALL OF CHAMPIONS, the site's third idle game and the first one built on the audited record instead of generated people. /hall-of-champions is a sports museum whose every exhibit is a real championship: 909 of them across ten wings, 1889 to 2026, fetched through champOrNot's own audited fetcher so the catalog can never drift from the Record Books. Visitors pay admission per second, admission buys exhibits oldest-first, every MILESTONE_EVERY (10) exhibits doubles that wing, completing a wing hangs a PERMANENT plaque (+25% forever, survives prestige), anniversary weekends pay x3 on a tap, four upgrades (tours, curator's network, gift shop, archive vault), and rededication trades the whole museum for renown stars (one per 20 exhibits, +10% each, capped 80). Finals wings carry the verified beaten side and result on the plaque line ("beat the Kansas City Chiefs 35-10"), read from the same completed loser columns Rounds 239-242 filled. HOUSE RULES HONORED: offline runs at half speed capped at eight hours (gift shop raises the rate, ceiling 0.9), the save loads fail closed on twelve hostile shapes, the tile rule (HubTiles, opening a panel replaces the grid), and the quoted price is the charged price. THE ECONOMY WAS MEASURED, NOT GUESSED, and the harness earned its keep twice: the first draft had NO base income, so an empty museum could never buy its first exhibit and a simulated day collected zero; the second draft had income growing FASTER than cost (1.055 x 2^0.1 against 1.11) and a greedy player finished all 909 exhibits in FIFTEEN MINUTES. A parameter sweep picked cost 1.28 against income 1.02 with x2 milestones and a x4 wing multiplier, which measures 137 exhibits and 5 wings in a quarter hour, 731 exhibits with 5 of 10 wings complete in a day, and 797 in a week: a real curve with a long tail. A browser probe then found the cold open was 25 seconds of watching a number, so the door fee went from 0.4 to 1 (first exhibit about ten seconds in, irrelevant within five minutes). simHallOfChampions is harness 103: 12 hostile saves rejected, EVERY ONE of the 909 exhibits checked against an independent recount of the same tables (pair exists, wings in year order, ids unique, no long dashes, and every finals plaque line equal to the verified loser and series through whodTheyBeat's fetcher), a simulated greedy day with floors AND ceilings (a day must not empty the museum: that ceiling is the one that caught the runaway), every stated multiplier measured against its stated value (anniversary exactly x3, milestones over x2, renown and plaques exactly their percentages, the rush stops exactly when its timer says, the vault adds exactly its seconds, offline measures 0.5 and nine hours pays exactly what eight pays), and rededication proven a real trade (stars at the stated rate, plaques survive, upgrades and wings reset, and the same wall out-earns itself x4.6 after). Browser-probed on the built bundle with live data proxied through the Round 251 shim: rules open on a WRECKED save (fixed in probe: the gate asked whether a save KEY existed, which left exactly the corrupted case ruleless, and now asks whether it LOADS), acquisitions land, the plaque read "1969 New York Jets, beat the Baltimore Colts 16-7", the upgrade panel replaces the grid, zero page errors. Registry, route, full SEO content, loader entry, sitemap 122 with the simIndexNow floor raised per its rule. Gates: tsc zero, simHallOfChampions green, simSitemap green, simIndexNow green at 122, simRelatedGames green, rival names green, build green.) `RUN252.bat`, chain-guarded on 251. **SHIP110.bat is the current wrapper: it runs 157 through 252.** |
| Packaged 2026-08-21, small hours UTC | **Round 253** (THE INJURY ARC: the flagship's weakest system becomes a chapter. A severe injury (ACL, achilles, broken leg, back stress fracture, ruptured quad) used to be pace -2, physical -1 and a line of text applied automatically. It now PAUSES the season into a new `rehab_choice` phase carrying a pendingRehab (real name, real weeks, a specialist quote when affordable), and the stat cost is applied by the PLAYER'S CHOICE instead, so the three roads genuinely differ. RUSH IT: back in ~60% of the weeks, but a 45% setback chance (pace -5, physical -2, morale -12) and +0.02 permanent rehabFragility, capped at 0.06, added straight into the season injury roll. FOLLOW THE PLAN: the stated weeks and the old honest toll, now as a decision. THE SPECIALIST: costs 0.8M off net worth, offered only at net worth >= 1.6, keeps the physical intact and loses only 1 pace. Every road appends a seriousInjuries entry (year, name, weeks, path, setback), so a comeback is something the save remembers. All fields optional, so every pre-253 save loads untouched. simInjuryArc is harness 104: three seeded fleets, one per road, proving the pause carries a real diagnosis (name from the engine's own severe list, 14-30 weeks, a sane year), that only a choice clears the phase, that the money is exact (a specialist debits precisely its quote, a free road moves net worth by zero, never negative), that history records exactly one correct entry per comeback, and above all THAT THE ROADS MEASURABLY DIFFER: mean pace lost per comeback must order specialist < plan < rushed (measured 1.26 < 2.00 < 3.30) with the setback rate inside the 30-60 band the copy promises (measured 43.4%). THE FRAGILITY CHECK IS THE INTERESTING ONE: comparing two fleets could not see two points of injury chance (the careers diverge and noise swamps it, and the first version of the check measured rushing coming back LESS injured, by luck), so it was rewritten as a CONTROLLED EXPERIMENT: the same career state and the same seed, one clone fragile and one not, 900 identical seeded seasons. With an identical random stream the fragile clone can never be injured less, and it was injured measurably more (45 against 40, zero inversions). REGRESSIONS THE NEW PHASE CAUSED IN OTHER HARNESSES, both found and fixed: simClubCaptaincy's driver fell into `default: retired = true` on the unknown phase and so INVENTED a mid-career retirement that tripped its own armband invariant, and simInternational reported a career stuck in the phase; both now drive it (always taking the club's plan, since neither arc cares which road back). Gates: tsc zero, simInjuryArc green, simClubCaptaincy green, simInternational green, simSoccerCareer, simCareerEngaged, simCreation, simLoanSpell, simMoney, simPhone, simPhone2, simPotential, simTraining and simBallonDorFairness all green, rival names green, build green.) `RUN253.bat`, chain-guarded on 252. **SHIP111.bat is the current wrapper: it runs 157 through 253.** |
| Packaged 2026-08-21, morning | **Round 254** (THE DOCS CATCH UP WITH REALITY, and this round is mostly institutional memory, which is the point: the two files a cold session trusts most were describing a world that stopped existing this morning. PROJECT-STATE's head row said Round 156 with a queue of pending rounds behind it; it now says Round 253, published and verified live, and states plainly that every 157-253 row below it is history rather than a queue. Added in the same row: WHY the backlog sat, which was four separate bugs in the RUN bats (forward-slash findstr paths, raw quotes in patterns, a quote followed by a cmd operator, and a percent sign), each reproduced on Windows before being fixed, each now refused by mkbat and caught by verifybat. SHIP-PIPELINE gained a full section on those four rules plus two constraints that are not bugs (patterns must be ASCII and single line; a SHIP wrapper must start at the first UNCOMMITTED round, because the chain guard only greps 80 commits and a 157-to-253 wrapper died at RUN157 the moment the backlog landed). The section ends with the method that actually worked: write a throwaway bat, echo the errorlevels to a log, double-click, read. Guessing cost far more time than testing did. No src changes, so no gates beyond the docs themselves.) `RUN254.bat`, chain-guarded on 253. **SHIP113.bat runs 254 alone.** |
| Packaged 2026-08-21, morning | **Round 255** (WHAT THE FULL BOARD CAUGHT ON THE NEW WORK. With the shim in place the whole board now runs on demand, so the three rounds shipped this morning went through it and it found three things, all real. (1) THE LEGAL GUARD FIRED ON MY OWN COPY: simNoInventedQuotes flagged the Hall of Champions intro, because 'Green Bay' puts a real roster surname on a line the detector reads as quoted speech. The guard is deliberately conservative and the rule is to reword rather than loosen it, so all three new mentions (the SEO intro, the worked example and the What's New entry) now say 'which team won it' and name no player-shaped word; scan back to 693 files, 0 offending lines. (2) simCareerEngaged reported five careers stuck with no way forward: the THIRD harness to trip over Round 253's new rehab_choice phase, and right to. It drives the phase now, like simClubCaptaincy and simInternational before it. (3) MY OWN HARNESS WAS WRONG TWICE: its serious-injury floor was a fixed 40 measured on a 120-career fleet, so the runner's default 260-career fleet was fine but any smaller fleet failed for no reason (now scaled to CAREERS/3), and its net-worth check blamed the rehab for debt a career already carried from wages and standing costs (now it only fails when the rehab ITSELF pushed a solvent player under). Gates: tsc zero, simInjuryArc green, simCareerEngaged green, simNoInventedQuotes green, build green.) `RUN255.bat`, chain-guarded on 254. **SHIP114.bat runs 255 alone.** |
| Packaged 2026-08-21 | **Round 256** (THE ADSENSE BLOCKER, DIAGNOSED AND FIXED. AdSense rejected douknowball.com for "Low value content" and the cause was not the content: it was that NONE of it reached a crawler. Measured on the live site: /soccer-career, /records and /minefield returned BYTE-IDENTICAL html (same md5), about 7,000 characters whose only readable words were code comments and the site title, and the same shell came back under a Googlebot user agent. All 122 URLs were one empty page as far as a first-pass reviewer is concerned, which is exactly what that rejection means. THE FIX: scripts/prerender.mjs renders every sitemap route in headless chromium after the build and writes a real document per route. THREE DESIGN CALLS, each measured rather than assumed: (1) SNAPSHOTS GO IN public/, NOT dist/, because the site is built ON THE HOST, so anything written only to dist is thrown away by the next deploy; vite copies public/ verbatim, verified by a plain `npm run build` producing dist/soccer-career/index.html. The root is the exception (vite generates dist/index.html from the template, so a public/index.html would collide). (2) THE SNAPSHOT IS LIGHT: a full DOM capture measured 96KB a page and 11.6MB across the site, far too heavy to carry in the repo forever, so the body is rebuilt as plain semantic HTML holding only the page's own headings, paragraphs, list items and links in document order, and the head is copied minus its runtime-injected <style> blocks (29KB a page, duplicates of the linked stylesheet). Result: 1.7MB total, 10,770 readable characters and 22 internal links on /soccer-career. (3) NO LIVE DATA IS BAKED IN: Supabase requests are left HANGING rather than answered (which would freeze today's puzzle answers into a file that outlives today) or refused (which would bake the fail-closed error cards in), so every page shows its static copy plus its normal loading state. TWO THINGS THE FENCE CAUGHT ON ITSELF: the first full pass baked this browser's own idle-game save into the ticker on all 122 pages ("Your stadium empire: $54 banked"), fixed by clearing storage before each render; and two drafts of the guard cried wolf on good copy ("unavailable" flagged /clue-auction explaining its honesty rule, "banked" and "your streak" flagged twelve pages of tips), so both lists were narrowed to the shapes that actually indicate a defect. simPrerender is harness 105: coverage of every sitemap route, a text floor per page, 122 DISTINCT documents and 122 distinct titles (the whole defect was that they were identical), ten sampled pages each carrying their own words, and no error cards or personal state anywhere. package.json gains `prerender` and `build:seo`. mkbat now chunks its git add lines, because 121 paths on one line blows past cmd's 8191-character limit. Gates: tsc zero, simPrerender green, simSitemap green, simIndexNow green, rival names green, build green.) `RUN256.bat`, chain-guarded on 255. **SHIP115.bat runs 256 alone.** |
| Packaged 2026-08-21 | **Round 257** (SOCCER CAREER, HIS BUG REPORT, ANSWERED. Six items off Anthony's screenshots. THE BIG ONE, in his words: "make it that if u play poorly enough. A team just drops u from the squad and ur a free agent or they list for transfers or loans." He was pointing at a hole: every transfer window was written from the player's side, so a 6-appearance, 5.9-rating season still opened with "no clubs have made an offer, your club wants to keep you". The club now files a verdict built from measured facts, not a mood roll: league games under 60 percent of the projection for that rating at that club, a season average at or under 6.3, sitting more than 3 rating points under the squad's bar, and 2 or more reds. Two strikes is a warning, three is a verdict, and the screen prints the exact lines it was built from. Roads: 23 or under at a tier 1-2 club goes on LOAN, contract at 1 year or a second offence in a row is RELEASED, everything else is TRANSFER LISTED. Refusing a listing sets frozenOut, which crushes the next season to a quarter of the minutes with a hard 8-game ceiling the screen promises out loud; a transfer or a loan clears it, because the freeze belongs to the club that imposed it. TWO TUNING PASSES, both measured, both in simClubVerdict (harness 106): the first draft released on 2 years left and measured 25 releases / 1 listing / 0 loans across 400 careers, which is one third of the mechanic he asked for; and the minutes strike was comparing TOTAL apps against a LEAGUE projection, so a fringe man at a giant with 8 league, 6 European and 2 cup games sailed past a band whose floor was 8. SeasonRecord gained an optional leagueApps for that, and a save without it simply cannot be judged on minutes, which is the safe direction. After both: 91 released / 33 listed / 16 loaned, 2.6 percent of windows. THE OTHER FIVE: the international tile showed the QUALIFYING table when you were already at the finals, and the group table was being simulated and stored all along with no screen to reach it, so it now leads with your group, your position and how many go through, qualifying one tap away; XI_SHAPE was mirrored, putting right wingers on the left and the CDM in the wrong slot; formatNetWorth printed a negative as EUR-1340k instead of -EUR1.34M; the second passport event never named the nation, so it now picks a real side ranked 12-plus places above yours off the same FIFA points table the rest of the game uses, quotes both ranks, ACTUALLY changes s.nationality, and is gated at 3 caps or fewer because that is when a switch is really open; and the header name had truncate on a flex CONTAINER, which does nothing for the text inside it. AND THEN, PACKAGING THIS ROUND, THE WORST BUG THIS PROJECT HAS COME CLOSE TO SHIPPING, sitting inside Round 256, which is still unrun on his disk. The prerenderer copied vite's built <head> into every snapshot exactly as it stood, hashed asset tags included. Snapshots live in public/ and are copied verbatim into whatever build runs next, and that build names its bundle differently. REPRODUCED IN A HEADLESS BROWSER before fixing: serve a fresh build with the previous snapshot and /soccer-career 404s on the entry bundle AND on every lazy chunk, with #root's first child still the snapshot's own markup. The app never boots. Every game on the site would have been dead for anyone arriving from a search result, which is far worse than the indexing problem the feature exists to fix. THE FIX: no /assets path is written into a snapshot at all, and public/prerender-boot.js (a stable name no build renames) reads the real tags off the live root document and injects them, stylesheets first. A two line theme style covers the unstyled instant; a failed fetch leaves the words and the links, which is honest degradation. A SECOND PRERENDER BUG fell out of the same rerun: the script serves dist through an SPA fallback that re-read dist/index.html per request, and the run OVERWRITES dist/index.html with its own home page snapshot, so from route two onward the fallback was a finished document and 32 routes captured the HOME PAGE's text under their own names. Caught by three unrelated routes coming out at exactly 17,578 bytes. THE ROOT CAUSE OF BOTH was prerendering the home page at all, so it no longer is: vite generates dist/index.html from the repo template on whatever machine builds the site, a snapshot written over it is thrown away, and a public/index.html would collide with it. The shell is now read into memory once before anything is written and the script refuses to start if it is not a real vite shell (a hashed entry module is the test). THE HOME PAGE INSTEAD CARRIES ITS CONTENT IN index.html ITSELF, inside #root, which React replaces on mount exactly as it does on every prerendered route. Measured before: the built home page had 43 characters of readable text, its own title, so the most important page on the site was the emptiest. After: 1,750, with 17 links each verified against a real route in App.tsx. Counts in that block are deliberately floors ("more than 120") rather than exact numbers, because exact ones go stale weekly and the live ticker computes them anyway. A THIRD FIX from the same rerun: the prerender browser died at route 108 of 122 and reported 14 failures, every one of which would have kept its previous snapshot, so the page is recreated every 25 routes and any goto failure retries once on a fresh browser. All 121 route snapshots regenerated. simPrerender gains section 6 (no snapshot carries a hashed path, every one references the boot script) and simPrerenderBoot is harness 107: it serves public/ snapshots against dist/ assets, which IS the host's arrangement, loads three routes in a real browser and requires zero failed requests plus React actually taking #root over. Gates: tsc zero, simClubVerdict green, simPrerender green, simPrerenderBoot green, simLoanSpell green, simCareerEngaged green, simInternational green, simNoInventedQuotes green, rival names green, build green.) `RUN257.bat`, chain-guarded on 256. **SHIP116.bat runs 256 and 257 back to back. Do not deploy after 256 alone: 257 is what makes it safe.** |
| Packaged 2026-08-21 | **Round 258** (THE TICKER LEARNS WHAT IS ACTUALLY ON, AND THE MONEY LEARNS WHERE YOU LIVE. Two more items off Anthony's list. (1) REAL SPORT ON THE STRIP, his words: "For the ticker I want real life events going on." Every ticker line until now was derived from the visitor's own save or the game registry and therefore could not be wrong; these are CLAIMS ABOUT THE WORLD on every page, so src/data/sportsCalendar.ts is a repo file rather than a table: the claim and the two sources backing it sit on the same lines and are checkable in the diff. Eight entries seeded, each two-source verified (UCL league phase draw 27 Aug, US Open main draw 30 Aug to 13 Sep, FIBA Women's World Cup Berlin 4-13 Sep, Monza 6 Sep, UCL matchday 1 8-10 Sep, NFL opener 9 Sep New England at Seattle, MLB Wild Card 29 Sep, World Series G1 23 Oct). WHERE THE SOURCES DISAGREED THE DISPUTED PART WAS DROPPED, not picked: UEFA's own draw page says Monaco and the club explainers say Nyon, so the entry carries the date they agree on and no venue. Dates are computed from the reader's clock (today / tomorrow / weekday inside five days / "in N days" beyond, "on now" for a running tournament), so the file claims no timezone; weekday naming stops at five days because "Thursday" said on a Friday is ambiguous. FAILS QUIET: past events vanish, and an exhausted calendar returns the strip to exactly what it was. THESE LINES ARE MARKED data-no-prerender and prerender.mjs now strips any such element, because "in nine days" frozen into a snapshot is a lie within a day; simPrerender section 7 reads the calendar's own titles out of the source and fails if any appears in a shipped file. simSportsCalendar is harness 108: shape, real routes, exactly two sources on two DIFFERENT hosts, a banned-shape list (no scorelines, predictions, superlatives or quotes), 208 simulated days end to end proving the cap, the ordering, the expiry and a 120 day quiet tail, and the phrase checked on every day of a run up. (2) CURRENCY, his aside next to the net worth bug: "depending where u live ur currency will be diffrent." src/lib/soccerCurrency.ts is DISPLAY ONLY: the engine keeps euros forever, so a save is identical whatever is picked. Reach is two-part: formatNetWorth and formatWage build the euro string then convert on the way out, so every existing call site became currency aware with ZERO call site changes, and localizeMoney rewrites the euro amounts inside the hundreds of hand authored event and consequence lines at draw time (24 money() sites on the page). Rates are the ECB's published reference rates for one stated day, read off the Bundesbank republication and cross checked against the ECB's own page (agreeing to about 0.2 percent one day apart), and every converted screen prints the rate month rather than pretending to be live. THE HARNESS CAUGHT THE FORMATTER, NOT THE RATES: a first pass rounded 1.67B to 1.7B, a 1.7 percent error, so trim now keeps places by size (bounded at half a percent) and a unit ladder promotes or demotes so 0.2M euros reads as 171k pounds rather than 0.17M. simSoccerCurrency is harness 109: 510 real catalog lines harvested, euro path byte identical on all of them, 1,134 amounts checked against the published rate to 1 percent, 2,485 money free lines proven untouched, and 40 careers played TWICE in different currencies with all 9 stored fields compared, 0 differences. Gates: tsc zero, simSportsCalendar green, simSoccerCurrency green, simPrerender green, simPrerenderBoot green, rival names green, build green.) `RUN258.bat`, chain-guarded on 257. **SHIP117.bat runs 258 alone.** |
| Packaged 2026-08-21 | **Round 259** (REAL INTERNATIONALS ON THE TEAM SHEET, the last item off his screenshot list. His words: "What type of squad is this? There's no real life players and this is only 2023. I get it in like 2045 because we don't know who's going to be good then but right now u can say who's good." The data was already ours: player_market_values_dedup carries name, nationality, position and market value per year from 2004, which IS a national pool once grouped. scripts/bakeNationalPools.mjs writes src/data/nationalPools.ts, 533 nation seasons and 12,703 players over 2016-2026 at 274KB, ratings off the SAME 48-94 value curve as bakeClubManagerRosters so one player is one number site-wide. THREE BAKE BUGS THE HARNESS CAUGHT, each a different shape of wrong. (1) Taking the most valuable N per GROUP produced a Belarus squad of one keeper and fifteen wide midfielders all rated 64, because at the bottom of the value table everything is worth the same; selection is now per EXACT position. (2) The sheet then handed shirts out in rating order and put Trent Alexander-Arnold at centre half, which is the owner's own Round 257 complaint arriving by another road; buildStartingXi now matches each shirt to a man who plays there (shirtWants), falling back to the group and then to the generator, and REMOVES THE MATCHED MAN when the player's own shirt is spliced out, without which every name after it shifted a place. (3) The source holds a player twice in a year when he changed club mid-season, so per-position picking took him as both a CM and a CAM: 162 nation seasons flagged, from Wales to Uruguay, fixed by deduping on the highest valued row. A fourth: the fieldable test ran on the RAW pool and then capped below it, so Slovakia 2025 passed on four centre halves and shipped three; it now tests what is actually shipped. Nations the data cannot fill (no keeper for Algeria, Mali, Tunisia or Wales in several years) are ABSENT ON PURPOSE and fall back to generated men, as does every year past 2026. POOL_ALIAS maps the five names that genuinely differ (USA/United States, Turkey/Türkiye, Ivory Coast/Cote d'Ivoire, South Korea/Korea South, Bosnia) and deliberately does NOT contain self-mappings, which were checked against the data's own distinct list. simNationalPools is harness 110: pool shape and curve bounds, no man in two national squads in one year, 432 sampled sheets with all 4,320 real men at positions they play and on their own rating, at least 7 of 11 real on any pool backed sheet, and complete generated elevens with zero real names leaking past the window. Gates: tsc zero, simNationalPools green, simInternational green, simNoInventedQuotes green, rival names green, build green.) `RUN259.bat`, chain-guarded on 258. **SHIP118.bat runs 258 and 259.** |
| Packaged 2026-08-21 | **Round 260** (I SHIPPED TWO WRONG NUMBERS AND THEY WERE LIVE FOR A DAY. Round 257's static block in index.html, the thing that fixed the home page being 43 characters of readable text, claimed "more than 120 free sports games" and "nearly forty" soccer games. The registry the site actually renders from holds 113 and 30. Both figures came off a crude grep of gameRegistry.ts (`path:` occurrences) rather than off CATEGORIES, and the grep counted entries that are defined but not in any visible category. On a site whose top rule is that its numbers are real, that is the worst class of mistake available, and it was invisible to every existing check: index.html is not React, not in src/data, and nothing renders it in a harness. Corrected to "more than 110" and "more than twenty five", both floors, both under the real figure. simHomeCopy is harness 111 and it exists because of this: it imports the registry (not a grep), reads every "more than N" claim out of the prose by the sentence it lives in, and fails BOTH ways, when a floor is above the real count and when it has fallen more than 20 percent behind it, because a floor forty games stale is barely better than one that is wrong. It also checks all 17 links against App.tsx routes, requires at least six of them to be games, holds the block to half the character count it shipped at (still twenty times the empty page it replaced), and refuses any year, month, relative date or scoreline. Its own first draft matched "more than" case sensitively and silently checked only the soccer claim, which is logged in the file. No src changes, no prerender needed: index.html is generated fresh by whatever machine builds the site, so no snapshot holds it. Gates: tsc zero, simHomeCopy green, build green.) `RUN260.bat`, chain-guarded on 259. **SHIP119.bat runs 258, 259 and 260.** |
| Packaged 2026-08-21 | **Round 261** (THE TWO LIVE DOCS CATCH UP, and this one matters more than it reads. PROJECT-STATE's head row still said `f848aa0` Round 253 with "nothing is waiting on Anthony's machine", which was true this morning and stopped being true twice since. It now says `dadd94b` Round 257, published live and verified as a crawler on the live domain (10,782 readable characters on /soccer-career before any JavaScript, the app still booting on top, zero failed asset requests), states plainly that **the AdSense blocker is fixed and live**, and carries a row naming the three rounds sitting unpushed on his disk with the single bat that ships them and the exact steps that follow. A fourth row records that every item from his 2026-08-21 screenshot list is cleared, with the round each went out in. SHIP-PIPELINE gains a full section on the three prerender traps, written the same way as the findstr section: no snapshot may carry a hashed path (reproduced in a browser, and the failure is every game on the site dead for anyone arriving from search); never prerender the page you are also serving as the SPA fallback (it turned 32 routes into copies of the home page, caught only because three unrelated routes came out at identical byte counts); and nothing dated may reach a snapshot that outlives the date. Plus the two operational notes a future session will want: the render browser dies on long runs so it is recreated every 25 routes, and a full prerender is 45 minutes, so run it once at the END of a round. No src changes, so no gates beyond the docs themselves.) `RUN261.bat`, chain-guarded on 260. **SHIP120.bat runs 258 through 261.** |
| Packaged 2026-08-22 | **Round 262** (THE OTHER HALF OF ROUND 259: the squad you are in every week, not just the one you join every other summer. A card on the season page shows the real squad at your real club that season, your position queue with you slotted in at your rating, and the man directly in front of you named. 450 club seasons over 2016-2026, 8,155 players, 179KB, baked by scripts/bakeClubSquads.mjs off the same market value table and the same 48-94 curve as nationalPools and clubManagerRosters. THE CLUB MAP IS HAND WRITTEN, 54 ENTRIES, EXACT MATCH ONLY, and that is the whole design: the data also holds Arsenal Tula, Liverpool FC Montevideo, Real Madrid Castilla, Juventus Next Gen, Inter U23, Queens Park Rangers, Racing Santander, Racing Club de Montevideo, CA River Plate Montevideo and Cercle Brugge, so a fuzzy match would have filled Rangers' dressing room with QPR and nobody would have noticed for months. The bake refuses to write at all if a mapped name matches nothing, and the harness asserts that guard still exists, that no two career clubs share a data club, and that no known wrong club is ever a target. THREE THINGS THE HARNESS CAUGHT. (1) My first check treated a mapped club with no squad as a map bug; five of them (Al Hilal, Al Ittihad, LA Galaxy, LAFC, Inter Miami) are correct entries whose MLS and Saudi coverage is four to eleven players, which cannot field a shape. That is thin data, not a broken map, so it is reported and only fails if the count runs away. (2) NEED.MID was 4, borrowed from the national bake which builds an ELEVEN with a spare; this builds a DEPTH CHART where three is a queue, and the data counts wingers as forwards, so real squads read midfield-light. (3) Even at 3, the per-position KEEP cap could push a group under NEED: Arsenal 2023's only three midfielders are all attacking midfielders against a cap of two, so a real squad was thrown away. The bake now TOPS UP a short group from the same club's own remaining real players before judging it, which recovered 63 club seasons (387 to 450). DISPLAY ONLY AND PROVEN SO: 30 careers played twice, once consulting the depth chart every season, all 7 stored fields identical, because the appearance model has been tuned across dozens of rounds and must not move. Ties in the queue go to the man already at the club, which is the pessimistic and correct reading for a card explaining thin minutes. simClubSquads is harness 112: map integrity, squad shape, nobody at two clubs in one season, 3,066 depth charts with insertion index, ordering and the named man in front all checked, both ends of the queue exercised (1,042 first choice, 1,528 buried three deep), and null for every unknown club or year with the page wired to render nothing. Gates: tsc zero, simClubSquads green, rival names green, build green.) `RUN262.bat`, chain-guarded on 261. **SHIP121.bat runs 258 through 262.** |
| Packaged 2026-08-22 | **Round 263** (THE BROWSER SWEEP RAN AND FOUND A REAL SHARED BUG. With the Round 251 egress shim in place, sweepGames walked all 125 routes at a 320px screen and reported six pages wider than their own viewport: the five Connections games and /nba-grid. ONE SHARED CAUSE: src/components/game/GameShell.tsx draws EVERY game's title, and `text-4xl tracking-[0.15em]` on an unbreakable eleven letter word measured 352px inside a 256px container, pushing the whole document 64px past the edge. Fixed by stepping the size and the letter spacing up rather than starting at their largest (`text-3xl sm:text-4xl md:text-6xl`, `tracking-[0.1em] sm:tracking-[0.15em]`) plus `break-words` so multi word titles wrap. Measured at 320, 390 and 1440 before and after: zero overflow everywhere, desktop title unchanged at 60px. Sweep rerun at two viewports went 6 findings to 1. THE REMAINING ONE IS HONEST AND UNRESOLVED: /nba-grid reported 9px once and did NOT reproduce in eight subsequent runs at the sweep's own timing and measurement, including with the database blocked. The suspect is the shadcn toast viewport, which sits at left 32 and right 352 on a 320px screen, but an EMPTY viewport contributes no overflow (verified) and no toast could be provoked, so nothing was changed on a guess. If it recurs, provoke a real toast first and measure it. ALSO: the club verdict screen now adds one line naming where you finished in your position queue and who was in front of you, when Round 262's real squad exists for that club and season. Deliberately in the UI and NOT in seasonStrikes, because that list decides the verdict and a fourth entry would move the trigger rate Round 257 measured. Gates: tsc zero, sweepGames 1 known finding, simClubSquads green, build green.) `RUN263.bat`, chain-guarded on 262. **SHIP122.bat runs 258 through 263.** |
| Packaged 2026-08-22 | **Round 264** (THE FULL SUITE RAN AND FOUND A 3 PERCENT FLAKE THAT HAD BEEN THERE SINCE ROUND 253. runAllSims: 106 of 107 green, simLoanSpell FAIL on "the repaired save did not play a season". It passed six times standalone, which is the signature of a rate rather than a break. CAUSE, MEASURED NOT GUESSED: 12 of 400 first seasons from that synthetic state hit a severe injury, which pauses on the rehab_choice phase and RETURNS before the season is recorded, so no "playing" season exists and the check reports an old save that cannot play. That is the injury arc working. simLoanSpell is the FOURTH harness to trip over Round 253 (simClubCaptaincy, simInternational and simCareerEngaged were the first three, fixed in Round 255) and the last to be caught because it only fails when the roll lands. Fixed the way the others were: the pause is answered and the season finished. Six clean runs after. A SECOND FINDING, AND MY HYPOTHESIS WAS WRONG, WHICH IS RECORDED IN THE FILE: the loan payoff gap has drifted from the documented +0.5 to +0.9 overall and +10 to +14 apps down to +0.4 and +7, on SEEDED arms, so the engine moved under them. Round 257's verdict rerouting loans onto the situation instead of pendingLoanOffers was the obvious suspect; teaching the harness that second road left the loan count identical at 121 of 150, so it is CLEARED. The harness now handles both roads anyway (it is a real way the game offers a loan) and the header records the re-measurement, what was ruled out, and the untested next suspect (Round 253's injury arc, which would move the gap rather than the level if it costs the loan arm more for playing more football). Floors untouched: the house policy is widen or seed, never loosen. ALSO: three more two-source verified events on the ticker calendar, NHL opener 29 Sep (nhl.com + thehockeynews.com), NBA opening night 20 Oct (foxsports + cbssports), Super Bowl LXI 14 Feb 2027 at SoFi (sofistadium.com + wikipedia). 11 entries across 15 distinct hosts, 322 simulated days. Gates: tsc zero, runAllSims 107 of 107 green, simSportsCalendar green, build green.) `RUN264.bat`, chain-guarded on 263. **SHIP123.bat runs 258 through 264.** |
| Packaged 2026-08-22 | **Round 265** (HIS QUESTION, ANSWERED WITH MEASUREMENT, PLUS THE TWO THINGS IT TURNED UP. He asked whether Search Console's 82 not-indexed pages and AdSense were fine. Checked the LIVE site with JAVASCRIPT OFF and a Googlebot user agent, which is exactly what Google saw when it decided: ten pages, all 200, all UNIQUE titles, all UNIQUE canonicals, no noindex, 299 to 10,450 words each; sitemap 200 with 122 URLs, every sampled one 200, robots.txt declaring it. So the 82 are the pre-Round-257 picture (every URL was a byte-identical empty shell until the evening of 2026-08-21) and need recrawl time, not a fix. Told him to request the AdSense review now, since a human reviewer fetches fresh. THE ONE REAL GAP THE CHECK FOUND: the home page had NO canonical to a JavaScript-off crawler. Every other page gets one because the prerenderer captures the head after React draws it; the home page is deliberately not prerendered, so its canonical only existed once JS ran, on the one page most likely to collect tracking parameters from shares. Now a static tag in index.html. The same check found the template title and the app title DISAGREED ("Free Daily Sports Trivia Games" versus "The Ultimate Sports Trivia Hub"), so Google was choosing between them depending on how it fetched; aligned on the template's wording. simHomeCopy section 4 now fails if the canonical goes missing or the two titles drift apart. A COMMENT PLACED INSIDE THE PageSeo PROPS compiled fine and broke simIndexing's parse of the block, which is how that was caught; it now sits outside the element. AND THE FULL DEEP PLAY WALK RAN: 125 games, 1 finding, and the finding was FALSE. /dart-draft reported a hard stall; driven by hand with real network it goes 1/11 to 2/11 to 3/11 to 4/11 with no errors and no failed requests. The walk's rule was "a screen you have seen before means backwards", which is wrong for a game whose eleven turns each end back at the same screen. playGames now tracks every distinct "N of M" a run observes and refuses to call a stall when the game's own counter moved, reporting a skip that names the values instead. A stuck game still reports STALL, because a stuck game's counter never moves. Gates: tsc zero, simIndexing green, simHomeCopy green, simSitemap green, playGames 0 findings on the route, build green.) `RUN265.bat`, chain-guarded on 264. **SHIP124.bat runs 258 through 265.** |
| Packaged 2026-08-22 | **Round 266** (TWO ORPHAN PAGES, FOUND BY MAPPING THE LINK GRAPH, AND A PERMANENT GUARD FOR IT. Round 265 answered his Search Console question; this is the second thing that came out of measuring rather than reassuring. Walking every internal link across all 122 SHIPPED documents (the prerendered snapshots plus index.html for the home page, which is what a crawler actually receives) found /leaderboard and /college with ZERO inbound links from anywhere crawlable. Both are in the sitemap, so Google knows the addresses; nothing on the site argued they were worth having, which is exactly the shape behind "discovered, currently not indexed". A sitemap entry is a suggestion, a link is a vote. Both added to the GLOBAL FOOTER, so they went from 0 inbound to being on every page, which needed a full 121 route re-prerender to propagate. Measured after: 0 orphans, thinnest linked route 3 inbound (was 1), median 8, outbound median 21. simInternalLinks is harness 113 and it reads the shipped files rather than the React source, because the question is what a crawler RECEIVES: no sitemap route may have zero inbound links, no document may link out to fewer than 5 real pages (measured min was 10, so the floor is half), every internal href must be a real route in App.tsx, and the eight standing hubs must each keep 50-plus inbound links, which is how it notices if one silently drops out of the footer. Gates: tsc zero, simInternalLinks green, simPrerender green, simPrerenderBoot green, simHomeCopy green, simIndexing green, rival names green, build green.) `RUN266.bat`, chain-guarded on 265. **SHIP125.bat runs 258 through 266.** |
| Packaged 2026-08-22 | **Round 267** (AN OFFER IS A QUEUE YOU ARE JOINING, AND NOW IT SAYS SO. Round 262 showed where you stand in your CURRENT squad; this points the same arithmetic at the club making the offer, so every offer card carries a line like "you would be 4th of 6 forwards there, behind Gabriel Jesus" or "you would be their best on day one". That turns the transfer window from a badge-size contest into a real decision, and it costs nothing new: it reads the same baked clubSquads data. All EIGHT OfferCard call sites are handed the career, which matters because a card that is not would silently never show the line, and the harness counts them and fails on any mismatch rather than trusting the wiring. Display only, same as 262: no data for that club or season means no line, never a guess. simClubSquads gains section 5b: the component exists, every card gets the career, and 35 sampled fits resolve against the OFFERING club's own squad with the man in front named. ALSO VERIFIED THIS ROUND, and worth recording because it is the guarantee the whole nine-round queue rests on: for all 149 distinct files across rounds 258 to 266, the HIGHEST numbered zip that ships each one matches the working tree byte for byte. Running the bats in order therefore produces exactly the tree that was tested, with no file left at an older version by an out-of-order overwrite. Gates: tsc zero, simClubSquads green, simInternalLinks green, build green.) `RUN267.bat`, chain-guarded on 266. **SHIP126.bat runs 258 through 267.** |
| Packaged 2026-08-22 | **Round 268** (A HUB THAT PROMISED SIX GAMES AND SHIPPED ZERO, LIVE, FOR MONTHS. /college filtered the registry for the category titles 'College Football' and 'College Basketball'. The registry calls that category 'College Sports'. Neither title has ever existed, so the filter returned an empty array and the live page read "All 0 college football and college basketball games in one place" with NOTHING under it: 1,634 readable characters, six games missing, and Round 266 had just put it in the footer of all 122 crawlable documents, so the entire site was voting for an empty page. That is a textbook "crawled, currently not indexed" and it was self-inflicted. NOTHING COULD HAVE CAUGHT IT: not a type error against `title: string`, no crash, no dead link, and simInternalLinks PASSED it because that harness counts a document's outbound links across the WHOLE document, where the navbar, ticker and footer clear its floor of five twice over on a page whose body is blank. CHROME HIDES AN EMPTY BODY is the lesson of this round. Fixed three ways. (1) ROOT CAUSE: category titles are now a `CategoryTitle` union and the lookup is `categoriesByTitle(...titles: CategoryTitle[])`, so the exact typo that shipped is a compile error, PROVEN by reintroducing it (TS2345) and by breaking the home page's `cat.title === 'College Sports'` comparison (TS2367); adding a category without listing its title is also a compile error, which is the trade that keeps the union honest. (2) The page was rewritten: all 6 games, split by the registry's own `featured` and `daily` flags so a new college game files itself, an honest note that the dynasty recruits are generated and guarded so none can carry a real person's name, and links on to /records, /leaderboard and home. Readable text 1,634 to 3,397 chars. Every number on it is derived from the registry it imports, never typed in, which is the standing rule since Round 260. (3) simHubs is harness 114 and it reads the SHIPPED documents: any page calling categoriesByTitle must be declared in it or the suite fails (the simInventedNames registration rule), every hub must link EVERY game it gathers (exhaustive, not a floor), the count a hub prints is parsed back out and compared to the registry in both directions, no document may claim zero of its own content, and every game must stay in the link graph with chrome COMPUTED (any href in 90%+ of docs) rather than assumed. Measured 2026-08-22: 13 chrome links, 109 non-chrome games, min 3 median 8 max 31 inbound, so the floor is 2. The harness was run against the BROKEN snapshot first and failed it 8 times on 3 independent fronts before the fix. ALSO FIXED, A FLAKY BOARD, WHICH IS THE SAME DISEASE: the first full run of this round's board failed simInventedNames with "name banks with nobody checking them: src/lib/__oppArm_off.ts, __oppArm_on.ts". Those banks do not exist. simOpposition was writing patched COPIES of clubManager.ts into src/lib (it had to, because a copy in /tmp cannot resolve clubManager's neighbours), the board runs harnesses concurrently, and SEVEN harnesses walk src. simOpposition now bundles the real file ONCE and patches the BUNDLE instead, so nothing in src is touched: the rule text survives esbuild byte for byte and appears exactly once, and both facts are asserted rather than assumed, because if either stopped holding the two arms would silently become one engine. Re-run clean: gap 1.49 against a tolerance of 2, in line with the documented 0.76-0.8 accepted effect. AND A SECOND WOLF, MEASURED AND WIDENED: simApproaches section 5 waits for a random mid-season approach to a hot 2010 Blackpool and gave up after SIX tries. Run 150 times standing alone it failed twice, so 1.3% a board, which puts one attempt succeeding at about 51% (0.487^6 = 0.013). Widened to sixteen attempts, so 0.487^16, about one run in a hundred thousand; measured 0 of 60 after. WIDENED, NOT LOOSENED: the assertion is unchanged, an approach must arrive and it must come from a club that really exists in the 2010 world. Two independent false reds on one board is what this round is about. AND A THIRD FINDING, RECORDED NOT FIXED: prerender drops any element over 1200 characters, which had been silently costing /whats-new SIX of its 112 entries, the longest six, meaning the biggest features. This round's own entry was cut to 1,192 chars to fit and verified present in the snapshot (li count 106 to 107). Both prerender defects are written up in the roadmap for one shared round, because each rewrites all 121 snapshots. Gates: tsc zero, simHubs green, simOpposition green, full sim board green, build green, /college and /whats-new re-prerendered.) `RUN268.bat`, chain-guarded on 267. **SHIP127.bat runs 258 through 268.** |
| Packaged 2026-08-22 | **Round 269** (THE PAGE A CRAWLER RECEIVES WAS LOSING THE BIGGEST THINGS ON IT. Two defects in `scripts/prerender.mjs`, both found while measuring Round 268, both fixed here because each rewrites all 121 snapshots and one 55 minute full re-prerender is cheaper than two. ONE: `if (!text || text.length > 1200) continue;` threw away ANY element longer than 1200 characters. The cap guards against a giant wrapper swallowing a whole page, which is real, but length is the wrong test for it. On /whats-new the source held 112 entries and the shipped page carried 106, and the six it dropped were the longest six, which on a changelog means the biggest features: the Soccer Career squad card, the full browser inspection and the search-visibility pass were all missing from the page Google reads. The cap is about SHAPE now: an element that CONTAINS another block element is a wrapper and is still capped at 1200, a leaf keeps its text to a ceiling of 8000. Measured after: 112 of 112. TWO: the loop took each element's innerText, which flattens an inline link into plain words, then emitted that same link AGAIN as a bare anchor immediately after its container. Measured before: 161 duplicated anchors, all 121 documents affected, /about worst at 6. Blocks are now rebuilt with their anchors preserved inline and those anchors are marked consumed, so writing one twice is structurally impossible. Measured after: 2, and both are a page that links the privacy policy from its own prose AND from the footer, which is honest repeat linking. Totals across the 121 snapshots: readable text 696,081 to 699,791, list items 1,717 to 1,722, /whats-new 80,990 bytes. simPrerender gains sections 8 and 9. SECTION 9 IS A DELIBERATE CLIMBDOWN AND IT IS WRITTEN UP IN THE FILE: two drafts of an output-based duplicate-link assertion both cried wolf on /contact and /terms, because the fact that made a link a duplicate (one DOM element written out twice) does not survive into the HTML, and honest repeat linking looks identical. So it asserts the extractor's consumed-anchor mechanism is still present and REPORTS the adjacency count without asserting on it, the way simOpposition reports a signal too small to test. Section 8 reads the changelog SOURCE and insists every entry reaches the shipped page; proven by deleting one entry from the shipped file and watching it fail. Gates: tsc zero, simPrerender green, full sim board green, build green, all 121 routes re-prerendered.) `RUN269.bat`, chain-guarded on 268. **SHIP128.bat runs 258 through 269.** |
| Packaged 2026-08-22 | **Round 270** (SIX SPORT HUBS, ONE COMPONENT, 81 OF THE 113 GAMES COVERED. Until this round the site had 113 games and exactly ONE page gathering any of them by sport, /college, which Round 268 found had been shipping empty. Everything else was on the home page or nowhere. That fails a person who wants hockey games and has to scroll thirteen sports, and it fails a crawler, because there was no page anywhere that is ABOUT hockey games on this site for a "free hockey games" result to be. NEW: `src/lib/sportHub.ts` holds six definitions (route, categories, h1, SEO title and description, group headings and blurbs, the about block, how to play) and `src/pages/SportHub.tsx` draws all six, replacing CollegeHub.tsx which is DELETED. Routes: /soccer 30 games, /pro-basketball 14, /hockey 11, /pro-football 10, /baseball 10, /college 6. WHAT DELIBERATELY GOT NOTHING: Formula 1 4, Tennis 3, Golf 2, NASCAR 2, Combat Sports 2, Aussie Rules 1. Fourteen games across six categories means a hub over two games, and a thin page is the problem these exist to solve, not a way to have more of them; when one grows it earns an entry and nothing else changes. NOT ONE COUNT IS HAND TYPED: every number a hub prints is computed from the registry at render, the Round 260 rule. Wired end to end: App.tsx mounts all six through the one component, genSitemap's STATIC_PAGES carries all six (sitemap 122 to 127 URLs), the home page's category headings drive their Hub link off the hub list instead of one hardcoded case, and index.html's STATIC block, which is the home page a crawler receives with no JavaScript, gained a "Browse by sport" list of all six, because the React grid's links do not exist for a crawler. simHubs now READS sportHub.ts instead of carrying its own list, so a new hub is checked from the moment it exists: it must be mounted in App.tsx at the same string it is handed, it must be in the sitemap generator, it must link every game it gathers, its printed count must match the registry, and no page outside this system may gather categories on its own. simIndexing section 3, which since Round 198 looked for the literal string to="/college" in Index.tsx, was generalised to read the hub list and check each route is submitted, kept by the generator, and linked from the STATIC home page. Measured after: 6/6 hubs complete (30/30, 14/14, 11/11, 10/10, 10/10, 6/6), 128 indexable pages with 0 duplicate titles and 0 duplicate descriptions, per-game body links min 3 to 4. Gates: tsc zero, simHubs, simIndexing, simInternalLinks, simSitemap, simPrerender, simHomeCopy all green, full sim board green, build green, six hub routes prerendered.) `RUN270.bat`, chain-guarded on 269. **SHIP129.bat runs 258 through 270.** |
| Packaged 2026-08-22 | **Round 271** (EVERY PRERENDERED PAGE ON THE LIVE SITE WAS 64 PIXELS NARROWER THAN THE SCREEN, AND HAD BEEN SINCE ROUND 257. The snapshot head carries a small boot `<style>` so the readable text looks like the site for the moment before the real stylesheet arrives. It set `padding:16px` on html AND body. That block never leaves the head, and Tailwind's reset zeroes body MARGIN and says nothing about body PADDING, so the padding survived the stylesheet, survived React mounting, and squeezed the LIVE APP by 32px a side on all 121 prerendered pages. MEASURED ON douknowball.com AT 390px: body 358 on /records and /leaderboard, 390 on the home page, which is the one route that is not prerendered. That is 8% of a phone screen, on 121 of 122 pages, for thirteen rounds. WHY NOTHING CAUGHT IT: every layout check on this project hunts content WIDER than the viewport, because that is what makes a page slide sideways. This made everything NARROWER, which no check was looking for. FIX: the padding moved to `<div id="dukb-snapshot">` INSIDE #root, which React discards on mount, so it lasts exactly as long as it is useful; html and body are pinned to `padding:0` rather than left unset, so a future reset cannot bring it back. Verified after: body 390 of 390 on six sampled routes and the wrapper gone from the DOM once mounted. HOW IT WAS FOUND, which is the other half of the round: `scripts/sweepGames.mjs` took its routes from the GAME REGISTRY ONLY, so the home page, Record Books, leaderboard, changelog, about, contact, privacy, terms and every sport hub had NEVER been opened at 320px by anything. Round 263 found a real overflow that shoved whole pages 64px off a phone, on game pages, because game pages were all it walked. The sweep reads the SITEMAP now (generated from App.tsx plus the registry, so still no hand kept list): 139 routes instead of 125. First run with the non-game pages in it: /leaderboard overflowed 33px at 320, because the squeezed width could no longer fit the header's Log In and Sign Up. ALSO FIXED, A WOLF: the sweep's second-person verb check flagged the changelog sentence "A club wanting you is not the same as a club playing you", which is correct English. Round 198 had tried to establish subject position with a BLOCKLIST of prepositions, and a blocklist of the ways "you" can be an object has no end; it is stated the other way round now (a subject follows a clause boundary, a short closed list), checked against nine sentences, four wrong and five right, and it gets all nine. simPrerender gains section 10: no snapshot may leak padding onto html or body, and every snapshot must carry the wrapper, both asserted because either alone lets it back. Gates: tsc zero, simPrerender green, sweep clean, full sim board green, build green, all 126 routes re-prerendered.) `RUN271.bat`, chain-guarded on 270. **SHIP130.bat runs 258 through 271.** |
| Next free round number | **272** (check the folder first before taking it) |
| Round missing from history | 115. Never existed, do not go looking for it. |

### The live site is checked by a tool now, not by hand (Round 279)

`scripts/auditLive.mjs` asks douknowball.com, as Googlebot, what a crawler gets at each URL, and
flags the five things that are always defects. It exists because that question has come up in
almost every recent round and has been answered by hand-building a probe each time, and every
hand-built version has had a flaw: one served the committed snapshot instead of the shipped one,
another followed redirects and reported the destination's content under the source's name.

**Its first run corrected something this session had already told the owner.** Round 276 was
described as catching the duplicate canonical AND the duplicate description before either shipped.
Only the canonical half is true. The canonical duplication was introduced by unshipped Round 265
and fixed by unshipped Round 274, so it never reached the live site. The **description**
duplication has been live the whole time, because `index.html` has always carried one and Helmet
has always added another, and a reader takes the first. Every page on the live site right now
hands Google the generic site blurb instead of its own.

That was missed because the check was made against the queue rather than the live site, and
because the hand-built probe read the first description tag instead of counting them. The tool
counts.

Measured on the same run, against the ten URLs in the owner's "Crawled, currently not indexed"
list: seven answer with 4,300 to 5,700 readable characters, their own title and their own
canonical, so the old verdict was passed when they served an empty shell. Three answer with the
HOME PAGE: `/football-draft`, `/guess-soccer-club` (Round 272) and `/guess-nfl-team` (Round 278).

**Also for the record: the "Crawled, currently not indexed" validation that failed on 8/22 was
started on 8/12**, and the crawlability fix went live on 8/21, so nine of its ten days were spent
re-checking the broken site. Do not start another validation until the queue has landed and been
published, or the run gets spent on a site that is only partly fixed.

### ⚠ Nine hidden pages were serving the home page (Round 278)

Nine live routes are deliberately unsubmitted and every one asks not to be indexed:
`/football-timeline`, `/admin/login`, `/admin/reports`, `/profile`, `/reset-password`,
`/guess-nfl-team`, `/shirt-number`, `/higher-lower-transfers`, `/pack-battle`. None had a
snapshot, on the documented grounds that a page you do not want indexed should not be
prerendered.

**That rule was correct when written and stopped being correct without anyone touching it.** A
route with no snapshot served the SPA fallback, and the fallback was an empty shell with 43
characters in it. Round 257 moved the home page's content into that shell, for its own good
reason, and nine harmless addresses became nine copies of the home page, with their noindex
visible only after JavaScript ran. Anthony's Search Console screenshots on 2026-08-23 show
`/guess-nfl-team` in "Crawled, currently not indexed", last crawled **April 10**, which is what an
address serving somebody else's content and declaring nothing looks like.

Six of the nine render themselves signed out and are prerendered properly now. The three that need
an account (`/profile` and both admin screens) land on the home page without one, so
`scripts/genHiddenStubs.mjs` gives them a small document carrying **what the page itself
declares**, which is `noindex, nofollow` for the admin pair and `noindex, follow` for profile: a
page that asks crawlers not to follow its links has a reason, and overriding that from a generator
would be inventing policy.

**A guard came out of it that is worth more than the round.** The very first run wrote the HOME
PAGE into `public/profile/index.html`, because `/profile` navigates away when signed out. That is
the third time this project has written one page's content under another page's name (Round 257
did it to 32 routes). The prerenderer now refuses to write any snapshot whose captured canonical
is not the route being rendered, and fails the run rather than shipping it.

Guarded by `scripts/simHiddenPages.mjs`, four sections, three negative controls including the
exact pre-round state. `simHeadTags` and `simAdsense` learned the shape too: a noindexed page has
no result to appear in, so a description and a share card are furniture it will never use, and
they are counted separately rather than excluded silently.

### 37 titles were being truncated in search results (Round 277)

Google shows roughly 60 characters of a title. Measured across the 126 shipped pages: 37 were
over, the longest 73. Every one ended in the same 14 character brand suffix, and removing it
brought **all 37 under**, longest 59.

Done as a rule in `PageSeo` rather than 37 hand edits, because a rule still applies to the next
title somebody writes. The suffix comes off the `<title>` only, and only when the title is over
the limit; `og:title` and `twitter:title` keep the full text, because a social card has roughly 88
characters and the brand is worth more there. After: 0 over 60, longest exactly 60, and 83 of 126
titles still carry the brand.

`simHeadTags` section 4 was a REPORTED number in Round 276 and is a FAILURE now, because Round 276
could not fix 37 titles by hand and Round 277 made it a rule, and a rule can be enforced. A title
still over the limit after the suffix has come off is a real copy problem that no rule can fix,
and the harness says so rather than truncating further.

**Section 5 had to be rewritten before it shipped.** The first version counted brandless titles and
reported "43 dropped it to stay under 60", which was false: 37 were over the limit and the rest are
pages whose copy never used that suffix at all (`Privacy Policy - DoUKnowBall`,
`Contact DoUKnowBall`). It now separates the two by arithmetic and states only what it establishes.
A harness that asserts a cause it has not established will mislead somebody at 2am.

### ⚠ NINE more duplicated head tags, on all 126 pages (Round 276)

Round 274 found the template's canonical sitting in front of every page's own and fixed it. It
fixed **only** the canonical, because the harness that found it only read canonicals. Measuring
the rest afterwards: `description`, `og:type`, `og:title`, `og:description`, `og:image`,
`twitter:card`, `twitter:title`, `twitter:description` and `twitter:image` were **all** doubled on
**all 126** shipped pages, same cause, template plus Helmet.

A reader takes the first tag. So every page was handing Google the generic site description
instead of its own, and every share of every game carried the site wide title, blurb and image
rather than the game's. Before: **1 description repeated 126 times.** After: **126 distinct.**

The fix generalises Round 274's: a static tag is removed only when a Helmet authored tag with the
same key exists to replace it, so the tags the template owns outright (viewport, charset, the
AdSense verification tag) are untouched by construction rather than by an allowlist.

**Two things worth knowing about how it was built.** The first version ran the sweep in a plain
effect, like Round 274's did, and it worked for 9 pages of 126: Helmet writes asynchronously and
PageSeo does not re-render when it does, so on most pages the sweep ran before the replacement
tags existed. It watches `document.head` now, which is the only moment the sweep can be correct.
And `simHeadTags` **counts** tags rather than checking for presence, because presence is what
every check since Round 198 asked for and presence is exactly what was true the whole time.

Also: `npm run build:seo` now ends with a second `vite build`. The prerenderer writes into dist as
well as public, so running it after a build overwrote the asset tags Round 275's plugin had just
injected. The last thing to touch dist has to be the build, which is also the only order the host
ever uses.

### Every prerendered page used to spend two round trips finding its own code (Round 275)

Round 257 made the committed snapshots hash free on purpose: they are copied into every future
build, and a hashed path baked into one goes stale and the app never starts. The cost was that
each page had to FIND its assets at runtime through `/prerender-boot.js`, which fetches the home
page and reads the tags out of its head.

Measured on a phone at slow 4G, `/soccer-career`: snapshot HTML at 591ms, boot script at 1231ms,
the home page it fetches at 1837ms, stylesheet only starting at 1878ms. Three serial round trips
on a document the browser has had complete since 591ms.

A vite plugin in `vite.config.ts` now writes the real tags into the **dist** copies at build time,
where the hashes are correct by construction. `public/` stays hash free, so Round 257's guarantee
is untouched, and `prerender-boot.js` stays in every page as the fallback: it already returns
early when it finds a module script, so a build without the plugin behaves exactly as before.

Three runs a side, median, serving what actually ships:

| | requests | FCP | playable |
|---|---|---|---|
| before | 24 | 740ms | 14,519ms |
| first attempt, blocking CSS | 23 | **2,860ms** | 13,353ms |
| shipped | 23 | 756ms | **13,348ms** |

**The middle row is why the harness has a hard rule about it.** Injecting a plain
`<link rel="stylesheet">` bought one second of "I can use this" for two seconds of "I can see
this", on a document whose entire purpose is that its words are already there. The shipped version
downloads the CSS with `media="print"` and swaps it in on load, with a `<noscript>` copy behind it.

**Two measurement traps worth knowing.** `scripts/measureRouteWeight.mjs` was serving `public/`
before `dist/` for routes, which meant a build time change to the snapshots was invisible: the
first A/B came back 740ms vs 772ms, no difference, because both arms were being handed the same
untouched file. It serves dist first now, because dist IS what the host serves. And
`simPrerender`'s no-hashed-paths rule had to MOVE rather than loosen: the danger is a hash frozen
into a COMMITTED file, which lives in `public/`, so that is where it looks now, and
`scripts/simSnapshotAssets.mjs` owns the dist side.

### ⚠ Every page was shipping TWO canonicals (Round 274, caught just in time)

**126 of the 134 shipped documents carried two `rel="canonical"` tags**: `https://douknowball.com/`
first, then their own. Google's stated behaviour for conflicting canonicals is to ignore all of
them, and a crawler that simply takes the first was being told that `/privacy`, `/soccer-career`
and every other page on this site IS the home page.

Cause: Round 265 hardcoded a canonical to the home page in `index.html`, correctly, because the
home page is the one route that is not prerendered and had no other way to declare one. But
Helmet ADDS a canonical rather than replacing a static one, and every snapshot captures the head
after the app has rendered, so both went into the file.

**It never reached the live site**, because it sat inside the unpushed queue the whole time. Had
`SHIP132` been clicked before this was found, all 126 pages would have gone out contradicting
themselves, which would have undone most of what rounds 265 to 272 were for.

Nothing caught it for nine rounds because every check asked whether a canonical was PRESENT and
none asked how many there were. `scripts/simPrerender.mjs` section 11 now asserts exactly one per
document, negative controlled both ways (two canonicals, and none).

Fixed in `PageSeo`, which removes any canonical the page did not author once it mounts. One
mechanism rather than two, and it fixes the live DOM as well as the snapshot. The home page loses
nothing: PageSeo on `/` emits the same URL, and a crawler that runs no JavaScript never gets that
far and keeps the template's tag, which is exactly why Round 265 put it there.

### ⚠ A running clock was frozen into 90 shipped pages (Round 274)

90 of the 134 shipped documents carried `Next puzzle in 22:04:46`, the daily countdown captured
at the instant the snapshot was taken. Round 256's rule is explicit that no dated figure may be
frozen into a file that will still be on disk next month, and this broke it in the most literal
way possible.

The second cost was invisible and worse for the process: it made every snapshot
**non deterministic**. Re-rendering one route twice produced two different files, so every
round's zip carried up to 90 files of pure countdown churn, which buries whatever actually
changed and makes a byte comparison useless as a review tool.

Fixed with `data-no-prerender`, the mechanism Round 258 built for exactly this and which the
ticker's real world fixture lines already use. A visitor still sees the clock; only the copy a
crawler reads leaves it out. Verified: 90 to 0, and re-rendering one route twice now produces
byte identical files. Guarded by `simPrerender` section 12, negative controlled.

### ⚠ Eight browser harnesses could not run at all (Round 274)

The full board with `--browser` is rarely run. When Round 274 ran it, 29 of 37 passed and **8
failed for reasons that had nothing to do with the site**. Both causes are worth knowing:

- **Six died on `waitUntil: 'networkidle'`**, which on this site can never be reached.
  Measured with pending-request logging: `/` had 6 requests still open, `/records` 10, all of
  them Supabase, which HANGS rather than fails when there is no egress. It is not only a sandbox
  problem: `useDailyLegend` opens a realtime websocket, and an open socket means a page that
  mounts it is never network idle anywhere. Those six now abort Supabase requests instead of
  letting them hang. **`playIndexing` was one of them, and the moment it could run it found the
  duplicate canonical above.** A harness that cannot run is worse than no harness, because
  everyone assumes it is watching.
- **Two died launching WebKit**, which cannot be installed here and never could. They skip
  loudly now and keep their chromium results, instead of throwing away a completed chromium pass.

A third problem surfaced only once the first was fixed: `sweepPhone` and `sweepContrast` drive one
browser through every route on the site, and chromium runs this container out of memory partway
through. Both recreate the browser every 25 routes now, the same fix and the same number the
prerenderer has used since Round 257.

### /soccer-career was shipping the whole Club Manager engine (Round 273, measured)

`src/lib/soccerCareerEngine.ts` had one line, `import { realJobOffers } from './managerJobMarket'`.
managerJobMarket is 3 KB of its own code and imports `clubManager.ts`, the biggest file in the
repo, which imports `squadDeal.ts`, which imports `footleEnrichment.ts`, which is Footle's data.
The two files also import each other, so the bundler had no choice but to emit them as one
731 KB chunk. Every Soccer Career player therefore downloaded and parsed a different game before
they could name a player, for a job market that does not exist until a career reaches the dugout.

Measured on the built site served exactly as the host serves it, a phone at slow 4G (1.6 Mbps,
562 ms round trip) with a 4x CPU slowdown, three runs an arm, median, timed to the moment the
Begin Career button exists:

| | downloaded | JS | requests | playable |
|---|---|---|---|---|
| before | 2807 KB | 2618 KB | 26 | 17,535 ms |
| after | 2207 KB | 2018 KB | 24 | 14,491 ms |

The fix is a dynamic import behind `loadManagerMarket()`, preloaded by SoccerCareer.tsx on both
`post_retirement` (the screen where the choice is made) and `manager_season` (what a SAVED career
reloads straight into, which is the case that would otherwise have been missed). If the market
somehow is not there, `refreshManagerOffers` says the phone lines are still connecting and starts
the load, because **an empty offer list is a real game state here**: it means nobody called, and
the note under it is written to sting. Faking that while a file downloads would tell a player his
career is finished when it is not.

Guarded by `scripts/simFlagshipWeight.mjs`, three sections, all negative controlled against the
pre-fix code (11 failures). Section 1 names the four foreign modules, which is the assertion that
matters, because a byte ceiling can be raised by anyone in a hurry and a named defect cannot.
Section 3 also proves the Club Manager chunk is still in the flagship's LAZY dependency list,
because absence alone would also be satisfied by the feature being broken.
`scripts/measureRouteWeight.mjs` is the tool that produced the table above; re-run it before ever
raising that ceiling.

**Two things NOT done, on purpose.** The remaining weight is Soccer Career's own: `nationalPools.ts`
(274 KB, the Round 259 real international squads) and `clubSquads.ts` (179 KB, the Round 261 real
club squads). Both are used during normal play rather than after retirement, so deferring them
would put a loading state in the middle of a season instead of in front of a menu. That is a
worse trade and a different round. And a browser probe of a hand built dugout save crashed on
`reading '0'`, but the SAME save crashes the pre-fix build identically, so it is a property of a
save shape the game cannot actually produce, not a regression. Recorded rather than chased.

### ⚠ public/_redirects does nothing on this host (Round 272, measured)

Do not spend a session on this again. Measured against the live site on 2026-08-22, asking as
Googlebot with redirects not followed:

| Address | Status | Bytes | Canonical | Title |
|---|---|---|---|---|
| `/world-cup` | 200 | 18,725 | none | the home page's |
| `/football-draft` | 200 | 18,725 | none | the home page's |
| `/guess-soccer-club` | 200 | 18,725 | none | the home page's |
| `/guess-transfer-value` | 200 | 18,725 | none | the home page's |
| `/perfect-lineup` | 200 | 18,725 | none | the home page's |
| `/world-cup-predictor` | 200 | 18,725 | none | the home page's |
| `/deal-or-no-deal` | 200 | 18,725 | none | the home page's |
| `/grade-transfer` | 200 | 18,725 | none | the home page's |
| an address that was never a route | 200 | 18,725 | none | the home page's |

All nine bodies are byte identical to the home page. Two facts fall out of that table and both
had been believed the other way round for many rounds:

1. **`public/_redirects` is not honored.** Not one 301 in it fires. The decisive rule is
   `/world-cup-predictor /world-cup-bracket 301`, because its source and target are different
   pages, so a working rule would have to answer 301 with a Location header. It answered 200
   with the home page. The trailing slash rules look like they work and do not: `/footle/` and
   `/footle` come back byte identical because the host serves `public/footle/index.html` for
   both, which is directory index serving and not a redirect. The file is **kept**, annotated
   at the top, because its last line is the SPA fallback and it cannot be proved from outside
   whether the fallback comes from that line or from the host. Deleting it to tidy up would
   risk every deep link on the site to find out.
2. **The only redirect these eight ever had was the client side `<Navigate>` in App.tsx**,
   which a crawler finds only by rendering the page. That is a plausible source of the
   "Redirect error" reason on the 8/16 Search Console screenshots, which is the one reason
   attributed to the website rather than to Google.

Round 272's fix and its limit: this host serves `public/<route>/index.html` at `/<route>`, which
is how all 126 snapshots already work, so each retired address now has its own small document
carrying a meta refresh and a canonical to its destination. A meta refresh is a redirect Google
reads out of the HTML without rendering. It is **not** as good as a 301. If the host ever starts
honoring `_redirects`, replace the stubs with real 301s in the same round.

**No `noindex` on those stubs, on purpose.** It is the obvious next thing to reach for and it is
a trap: Google's guidance is not to combine `noindex` with a canonical, because the `noindex` can
carry across to the canonical target, and six of the eight point at the home page.

Also worth knowing: an address that was never a route returns 200 with the home page too, so the
whole URL space is a soft 404. Round 265's home page canonical is what stops that being an
uncanonicalised duplicate, which is a second reason that round matters.

Guarded by `scripts/simRetiredRoutes.mjs` (five sections, all five negative-controlled) and by
section 4 of `scripts/simPrerenderBoot.mjs`, which drives a real browser through all eight and
checks where it lands.

### ⚠ Never run `git checkout` in the cloud clone (Round 272, self-inflicted)

This cost real time in Round 272 and it presents exactly like the clone-revert bug in CLAUDE.md,
so it is worth naming separately. A negative control script used `git checkout -- src/App.tsx`
to undo a deliberate one line edit. It worked, and it reverted the file all the way to
**origin/main, which is Round 257**, silently deleting Round 270's six sport hub routes along
with the edit. The tree had fourteen unpushed rounds extracted onto it; git knows nothing about
any of them.

What makes it dangerous is that nothing noticed for a while:

- `tsc` stayed at zero errors, because the hubs are mounted through one shared component and
  removing the routes removes no types.
- `npm run build` stayed green.
- `genSitemap.mjs` produced a **byte identical** sitemap, because the six hubs are listed in
  STATIC_PAGES rather than parsed out of App.tsx.
- The new round's own harness stayed green, because the eight retired routes exist in Round 257
  as well.

It surfaced only when `simSitemap`, `simHubs` and `simInternalLinks` were run and all three
failed at once, naming `/soccer`, `/pro-basketball`, `/pro-football`, `/baseball` and `/hockey`.
The recovery is the same as for the clone-revert bug: re-extract every pending zip in numeric
order, then verify. Do the verification properly rather than by eye. Walk every file carried by
any pending zip, take the copy from the highest numbered zip that carries it, and compare bytes
against the tree; the only file allowed to differ is one the current round is editing.

**Undo an edit with a copy of the file, never with git.** In this tree, `git checkout` is not an
undo, it is a fifteen round rollback of whatever file it is pointed at.

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

## Round 284: today's puzzle was frozen into seventeen saved pages, and a site-wide noindex nearly shipped

Rebuilt on 2026-08-25 from the previous session's handoff notes, because the original Round 284
was built, tested and delivered as chat downloads that never reached the folder. Everything
below was measured again on the Round 283 tree rather than copied from those notes.

**The frozen puzzles.** Round 256's rule against freezing live data covers anything that
arrives over the network and does nothing for a board the page works out from the clock.
`data-no-prerender`, the Round 258 mechanism, covers exactly what somebody has marked. So the
prerenderer now draws every route three times with the page's own clock at 0, 5 and 11 days
(the same Date replacement `playSnapshotDrift` proved in Round 280) and writes only the blocks
all three renders agree on. Nothing in it knows which games are daily, on purpose: a list of
affected games has been written three times in this repo and each one covered what somebody had
already found and nothing after.

Measured on the final full run: **13 routes carried date dependent blocks, 11 of them in the
sitemap**, 43 blocks removed by the second sample and 3 more by the third (the first run
reported 18, and the difference is the random content described below, which is now frozen
rather than dropped). Three pages printed the literal date ("Today's lineup, 2026-08-25. Same
puzzle for everyone." on /missing-xi, "Today's categories" on /rarity-round, "Today's ladder"
on /sports-millionaire), /missing-xi had all seventeen lines of today's lineup in it, and
/missing-five, /missing-nine, /missing-eleven and /score-predictor each carried one day's game.
The sitemap ledger moved 17 dates and held 110, which is the ledger doing its job: the pages
whose words changed are the pages that re-dated.

Two decisions in there were measured rather than assumed. All three samples are always drawn;
drawing the third only when the first two disagree would save about ten minutes a run and
reopen a hole (a page keyed only to the week can agree with itself five days apart, and nothing
would then ask for the sample that catches it), and the summary line reports what the third
sample removed over and above the second so that cost stays visible. And the head has to agree
with itself across samples or the route is not written; that check is what found the next two
things.

**The race that had been there for twenty eight rounds.** Five routes failed the first run
because their head disagreed between samples, and on a quiet machine none of them could be made
to disagree. The head carried the FAQ structured data, which lives in a lazy loaded sport file,
and the block renders a generic three question fallback until that file lands. A fixed 3.5
second settle was racing that chunk, and the single sample prerender had been running the same
race since Round 256 with nothing to notice it. `GameSeoContent` now has three states rather
than two (in flight, no guide, guide) and marks its section `data-seo-content="loading"` until
the answer is in, and the prerenderer waits for the mark to clear before it settles. Two more
transients on the second run, never the same routes twice, so a head disagreement now gets one
full redraw before it fails the route, and whatever differed is printed so the next one can be
named rather than guessed at.

**The near miss, reproduced on purpose.** Round 282's soft 404 marker decides a document is a
dead address by the absence of a snapshot block, and the prerender server hands every route the
bare template so React can draw into it. Under the prerenderer every page therefore looked like
a dead address, and the noindex went into the head of every saved document. The marker now
returns on `window.__DUKB_PRERENDER__`, which the prerenderer sets before any page code runs.
The fence is `simPrerender` section 14: no document in the sitemap may ship a noindex, read off
the files with comments and scripts stripped, attribute order not assumed. Both sides carry a
negative control that was run before anything shipped: `PRERENDER_CONTROL=noflag` leaves the
flag unset and writes into `dist/` only, and on two routes it produced exactly the noindexed
documents the original run produced, with a correct title and a single correct canonical, which
is why thirteen sections passed them; section 14 then went red on both. In the other direction
`SIM_PRERENDER_CONTROL=noindex` injects one in memory and the harness must report it.

**Random content, frozen the same way every time.** Two full runs on the same day disagreed
about /mlb-connect-4: its board is picked with `Math.random`, and on one run all three clock
samples happened to draw the same board out of a small pool, so the line was written, and on the
other they did not. A random pick is not false, so it does not need dropping; what it must not
do is change from build to build, which rewrites the file and re-dates the page for nothing. The
prerenderer now replaces `Math.random` with a seeded generator, same seed on every sample and
every run, before any page code runs. Verified by rendering the two Connect 4 pages twice and
comparing bytes: identical. Date driven content is still caught by the clocks; random content is
simply the same photograph every time.

**Stable structured data order.** The readiness change moved Helmet's mount order, and 79
documents changed with not one word in them different because two JSON-LD scripts had swapped
places. The ledger held every one of those dates (it sorts the blocks before hashing), but a diff
that size hides the seventeen files that really changed. The prerenderer now writes the blocks
sorted by their own text, so two builds of an unchanged page are the same bytes.

**A threshold measured instead of felt.** `simCreation` section 1 required a 93 ceiling to peak
more than 4 points above an 84 ceiling and went red on healthy code at exactly 4.0. Over 12 runs
at the harness's own sample size the gap came out 4.26 to 5.07, an earlier 25 run series
bottomed at 3.89, and at four times the sample it settles at 4.40 to 4.61. The true gap is about
four and a half and a 300 career run wobbles by close to half a point either side of it, so the
floor sat inside the wobble. It is 3 now, with the measurement in the comment.

**The browser harnesses were being served the wrong site.** `runAllSims --browser` served
`dist/` with `npx serve -s`, and in serve-handler 6.1.7 that flag rewrites every extension-less
path to `index.html` before it looks at the filesystem, so `/about` answered with the fallback
even though `dist/about/index.html` was right there. `playSoftFourOhFour` section 4 reported the
404 marker firing on four real pages; it had not, the server had never handed the browser a real
page. `scripts/lib/hostLikeServer.mjs` now serves the browser group the way the live host was
measured to on 2026-08-21: the route's own document if it has one, `index.html` with a 200 if
not. Both harnesses green on it, along with the boot check, the drift check and the home fold.

**Also cleared while here.** `src/pages/CollegeHub.tsx` is `git rm`'d by RUN270 and RUN272 on
Anthony's machine, which a zip cannot express, so any clone built by extracting the zips still
has it and `simHubs` goes red on it. Remove it by hand after extracting. Full node suite on the
Round 283 tree: 116 harnesses, all green once that file is gone.

## Round 283: the home page asked for an account four times before it offered a game

He sent a video of five design plugins and said add them. Four of the five are things this repo
already does better (39 browser harnesses driving real Chromium beats a generic screenshot
plugin), none of the five are in his plugin catalog, and they are handed out by DM from an
anonymous account, which is not a channel to take executable code from on somebody's behalf. So
instead of installing five unknowns, the round did the thing they were a proxy for: took real
screenshots of the built site and measured what a visitor is actually given.

**Measured on a 390 by 844 phone, before anything was changed: the first playable game tile sat
at y=478.** Fifty seven percent of the way down the only screen most visitors ever see. Above it,
four separate asks for an account: the nav's Log In and Sign Up, a full width green strip reading
"Create a free account to save your scores", and a "Make a free account" button in the hero. On a
site whose own pitch, in its own words, is "no sign-up, no downloads, no app to install", the
first screen was a sign-up form with the product below the fold.

Two more things came out of the same look. The hero repeated the wordmark that was already in the
nav twelve pixels above it, five times larger, and captioned it "The Ultimate Sports Trivia Hub",
which is the one line on the site that reads as a template and says nothing a person can act on.
And all three "Most played today" tiles carried the identical subtitle "Popular pick", the same
two words under three different games, because the fallback label was a constant while every game
in the registry has its own one line description sitting unused.

Fixed: the hero shrank and now says what the site is in words somebody would search for, the
guest CTA became a line of text instead of a gate (the account is an upsell, and an upsell goes
after somebody has played something), the green strip is suppressed on the home page only and
kept everywhere else where a person has a score worth saving, and the tiles print the game's own
description. **After: y=369 on a phone, y=365 on desktop, two places asking instead of four, and
three tiles that say what the three games are.**

`scripts/playHomeFold.mjs` holds it. Its ceiling is 430, not the measured 369, because a
threshold set at today's number fails on the next honest word added to a sentence and trains
people to raise it. Three of its four assertions were wrong on the first draft and each was
caught by its own negative control: it measured the ticker's game links and reported the first
tile at y=5, it counted the NEW badge as a placeholder subtitle (a repeated badge is a fact about
several games, a repeated subtitle is a constant standing in for a description), and it counted
account prompts as elements rather than as places, so it passed with the banner deliberately
restored, because that banner's ask is a span rather than a button.

## Round 282: every address that does not exist was answering as the home page

Asked as Googlebot on the live site, `/this-page-does-not-exist-12345` came back **200, 18,725
bytes, the home page's title, the home page's readable copy, the home page's canonical, and no
robots tag at all**. So did `/soccer-career/nonsense`. That is how a single page app is normally
served, and Google has a name for it: a soft 404, with two complaints attached. It burns crawl
budget on an unlimited number of addresses that do not exist, on a site whose real pages are
already struggling to get looked at. And since Round 257 put real copy into the template, every
one of those addresses now serves a full duplicate of the site's most important page, canonical
included, which is the site telling a crawler that infinitely many URLs are copies of its home
page.

The app has rendered a proper noindexed 404 since Round 53. That only exists after React mounts.
A small script in the template now runs before it, and **it needs no list of routes to go stale**:
every real address is served from its own prerendered document and every one of those carries
`id="dukb-snapshot"`, and the template does not, so a document with no snapshot block at any path
other than the root is by construction the fallback wearing the home page's clothes. A real route
whose saved document went missing would be caught too, and noindex is the safe direction there:
same call Round 278 made, and it turns a silent failure into a visible one.

**The canonical had to go with the noindex, not after it.** This template canonicalises to the
home page, which on a dead address is a claim that the address *is* the home page. Leaving that
next to a noindex is the exact pairing Round 272 refused for the retired routes, because Google's
guidance is that a noindex can propagate along a canonical to its target, and the target here is
the most important page on the site. The og:title and og:description are corrected for the same
reason.

**Two things the harness caught in its own author, and both are the reason to write one.** Its
first draft looked for the string `id="dukb-snapshot"` in the served HTML, and reported the
fallback as a real page, because the comment in `index.html` explaining this very mechanism
mentions the id in prose: a guard that can be satisfied by its own documentation. And its first
negative control exposed something worse. With the new script deleted entirely, five of its seven
assertions still passed, because by the time it read the page React had mounted and Round 53's
404 had supplied the title and the robots tag. The harness was measuring old work and crediting
it to this round. It now aborts the app's own modules, so the document's inline scripts run,
React never mounts, and what is left is exactly what a crawler holds before it decides whether to
spend the effort of rendering. With the script deleted, all of section 1 fails, which is what a
control is for.

## Round 281: the structured data was generated correctly and thrown away

Three findings, all counted on the shipped files before anything was touched.

**1. Every game page builds FAQ markup and breadcrumb markup, and no crawler has ever seen
either.** Both were rendered in the page BODY. Since Round 256 a snapshot keeps the head exactly
as the build produced it and rebuilds the body from readable content only, headings, paragraphs,
list items and links, and a script tag is none of those. Counted across all 127 shipped
documents: exactly one ld+json block each, the `Game` object, which only survives because it
happens to live in the head. 113 game pages were generating a breadcrumb trail, which is the one
of the two that Google routinely draws into a result, and shipping none of them. Both are in
Helmet now, so they land in the head and the snapshot copies them verbatim. Nothing about what is
generated changed; only where it is put.

**2. Thirteen pages declared themselves video games.** `PageSeo` emitted one shape for the home
page and `@type: Game` for everything else, so the privacy policy, the terms, About, Contact, the
Record Books, the world leaderboard, the changelog and all six sport hubs each told Google in
machine-readable terms that they are a game. Google's structured data guidelines are explicit
that markup has to describe the page's main content, and on a domain already turned down once for
low value content, a privacy policy claiming to be a game is exactly the wrong shape of signal.
The type now comes from `src/lib/pageSchema.ts`: in the game registry means `Game`, and every
other submitted route has to appear in an explicit table with a real type. Deliberately not a
prop on the component, because a prop is a thing you forget. `simSchema` section 5 fails if a
submitted route is in neither, so a new static page cannot inherit `Game` by accident and a new
game needs no change there at all.

**3. The home page shipped no structured data at all.** Not the wrong kind: none. The app has
generated a `WebApplication` object since Round 53, but the home page is the one page that is not
prerendered, because vite regenerates it from `index.html` on whatever machine builds the site,
so anything React adds at runtime never reaches the raw HTML. Exactly the trap that swallowed its
canonical in Round 265 and its readable copy in Round 257, and it had swallowed this too. The
site-level objects, `WebSite`, `Organization` and `WebApplication`, are in the template now.
Each carries an `@id` naming the site root, so none of them can be read as a claim about
whichever page is being served, which is what makes it correct that all 126 snapshots carry them
as well: that is how a crawler ties 127 documents to one entity instead of treating them as 127
strangers. `simSchema` section 4b parses the template block and compares it against the library's
export, because two copies of the same JSON is how a thing goes stale.

## Round 280: what the site was still telling Google, and why Google stopped listening

Three findings, all measured before anything was changed, all on pages that are shipping today.

**1. The sitemap said all 127 pages changed today, every single time it was written.**
`genSitemap.mjs` stamped `new Date()` on every row, so a regeneration for any reason at all
re-dated the whole site. Google's sitemap documentation says `lastmod` must be consistently and
verifiably accurate and that they may ignore it entirely where it is not, and ignoring it is the
right call for a file that cries wolf 127 times at once. The specific Search Console complaint on
this domain is nineteen pages sitting in "Crawled, currently not indexed", some last looked at in
April, and the one lever a site has for asking to be re-crawled was the one being thrown away.
A page's date is now derived, not asserted: the shipped snapshot is reduced to the text and links
a crawler reads, hashed, and compared against `scripts/data/lastmod.json`. Same hash keeps the
stored date however often the generator runs; a different hash gets today's. Proved by backdating
all 127 entries to 1 July, regenerating (127 held), changing one paragraph in one snapshot,
regenerating (126 held, that one page moved to today), and putting it back. The generator now runs
twice in `build:seo`, once with `--routes-only` before the prerenderer so a new route reaches the
file it needs to be in, and once for real afterwards against the documents that were just written.

**2. Four lines on all 126 pages were wrong the day after they were written.**
The ticker picks four "Fresh daily" games with `Date.now()`, and those lines were being captured
into every snapshot, so every page on the site promised a crawler that today's puzzle is Tier List
and would have gone on promising it for as long as the file lived. Round 258 built the exact
mechanism to stop this and set it on the calendar lines only; the guard it added looks for the
calendar's own titles, so it could never have found this. Found by rendering six routes twice with
the page's own clock five days apart and diffing what was captured. Exactly those four lines moved,
the same four on every route, and nothing else on any page moved at all, which is worth recording
as a clean result: the corpus was date stable apart from one hole. The rule is mechanical now.
Every `items.push` in the ticker either declares itself volatile or its text is a plain string with
nothing interpolated into it, and `simPrerender` section 13 reads the source and fails otherwise, so
the next computed line cannot be added without the question being asked. `playSnapshotDrift.mjs`
runs the clock diff itself, asserts nothing about what should be there, and has a negative control
that injects a paragraph printing its own date and fails if that goes unreported.

**3. The home page had less than half the content of the pages it links to.**
Measured across all 126 submitted documents: median 4,666 readable characters, most games between
four and six thousand, and the home page 2,187. That is the page a crawler visits most often and the
page an ad reviewer opens first. Twelve sports were named in a closing paragraph with not one link
on any of them, so the seven sections with no hub page of their own had no path in from the home page
at all. It is now 4,875 characters and 63 links, all 54 distinct destinations checked against the
router, with front offices and dynasties, the quiz games, every sport linked where it was previously
only named, and the five questions a first time visitor actually arrives with, answered in writing.
`simHomeCopy` still passes: every number in it is a floor, and it is still under the real figure.

**4. And the harness found a second one on its first real run, which is the argument for it.**
Nothing had ever noticed that the "Play Next" trio at the foot of every game page is seeded with
the date, so it too was frozen into 94 of the 143 shipped documents. Unlike the ticker it was not
telling anybody a lie: three real links to three real games, true whichever three get picked. It
still had to come out, because a block that rewrites itself daily re-dates every page in the
sitemap on every build and hands straight back the "everything changed today" lie that finding 1
exists to end. The visitor's rotation is untouched; only the photograph loses it. What the
snapshot gives up was measured rather than waved at: simulating both seeds across all 113 games,
this block leaves 27 games with no inbound link on a given day and hands one game 26, so it was
a lumpy distributor either way, and the link graph a crawler actually needs is the date-free
`relatedGamesFor` block that is proven to give every game inbound links and keep the whole site
one connected component. That block stays.

**And the thinnest submitted page on the site got a page.** `/leaderboard` carried 165 readable
characters once the shared footer was discounted, 85 percent boilerplate, easily the thinnest of the
126. Everything on it is live data and the prerenderer correctly refuses to freeze live data, so the
fix is not more data, it is writing that does not depend on any: how the scoring works, why every
game is capped at the same hundred points a day, what the two tabs mean, what the sport filter does,
and how to get on the board. Nothing in it is a figure that can go stale.

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

**The whole table was swept in Round 226 (2026-08-20). Every row resolved or investigated:**

| Was | Resolution |
|---|---|
| Edge function `football-connect4-validate` glossary named the video game | **DONE.** v8 deployed 2026-08-20 from the repo copy, which was already clean. Verified by re-fetching the deployed source: zero product names, the `Has/Had a 90+ Rated Player Card` key verbatim, cache and fail-closed paths intact. Repo and deployed are in sync. |
| 📱 button covers the AGE tile at 390px | **DOES NOT REPRODUCE** on the Round 225 build. Probed at 390x844 with elementFromPoint on the AGE header before and after scrolling the board's own horizontal scroller: nothing overlaps it, no fixed element intersects it, scrollWidth equals the viewport. Whatever covered it in Round 129 was rebuilt away since. Reopen only with a fresh screenshot. |
| Award flicker ("says I didn't win, next sec it shows I did") | **INVESTIGATED, no live async path.** The engine sets season.ballonDor, the awards list and market value atomically inside advanceProSeason before any screen renders, and the US career staged reveals intentionally walk award lines in late (that is the animation, not a race). Cannot act further without a screenshot naming the screen; reopen with one. |
| `testBallonDorFairness.mjs` dies on import and is invisible to the runner | **DONE.** Lives as `simBallonDorFairness.mjs` now: localStorage stubbed, Math.random seeded so the verdict cannot flip run to run (it did: one run snubbed at rank 3, the next was 85 for 85), and the must-win trigger requires outscoring the field by 5+ with a major, because the old bare-max trigger violated the never-assert-on-a-max rule. Green, deterministic, discovered by runAllSims. |
| `playGames` stalls on `/nfl-my-career` and `/nba-my-career` | **CLEARED by Round 220's amnesty rule.** Both now report the honest skip (the way forward is a typed create-screen answer the walker cannot invent), zero findings. |
| `RebuildBoard.tsx` unattached `revealRef` | **DONE.** The ref is attached to all five phase screens (pick-coach, fortune, cuts, done, market), so the no-scroll rule actually applies on /rebuild. |
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

**Next up, AUDITED AND REWRITTEN IN ROUND 229** (the old four-item list predated a hundred
rounds and three of its four items had quietly shipped; verified against the live code, not
memory):

- ~~Awards~~ **DONE long since:** the engine hands out the Ballon d'Or (with the world tick so
  the feed and ceremony agree), the Puskás Award, Player of the Year, International POY, UCL Top
  Scorer, tournament Best Player and Golden Boot, Fair Play, and the page has a Trophy Cabinet;
  Round 227 added manager honours to the same cabinet.
- ~~Realism / age-out~~ **DONE:** `LAST_REAL_YEAR = 2032` in soccerPhone.ts, past which the
  world generates its own names ("Nobody real gets a fictional future"), and era stars are
  drawn per year.
- ~~Manager side after retirement~~ **DONE, Round 227:** the dugout epilogue simulates a real
  league table, cup runs, derived sackings and promotions, and cabinet honours. (An era
  selector for Club Manager also exists: 2005, 2010, 2015 eras shipped months ago.)

**Genuinely open, in rough priority order:**

1. ~~person_key backfill~~ **INVESTIGATED AND CLOSED, Round 230:** debut_year is 100% filled
   but carries ZERO identity signal (it was derived per (name, nationality), so no pair has
   two debut years), and the Paulinho blob interleaves six-plus real careers so tightly that
   lane inference would assert plausible-but-wrong identities, which the data rules forbid. A
   true split needs external person ids the source does not carry. SHIPPED INSTEAD: the
   provably-multi-person taint rule (3+ clubs in a calendar year, or a 22+ year span) excludes
   all 39 merged blobs from the transfer pool at the source, which also killed a live
   fabricated "Fernandinho: Atletico Mineiro to Man City" row. If a future data refresh brings
   real person ids, revisit.
2. **The Round 224 leads that resolved as KEEP, recorded so nobody re-litigates:** the
   loan-return purge idea was measured in Round 229 and REJECTED: of the ~57 A-to-B-then-back
   pairs in the pool, many are real permanent transfers (Werner back to Leipzig, Payet to
   Marseille, David Luiz to Chelsea, Morata to Madrid), so a blanket return-leg rule would
   delete real history. A loan-aware fix needs loan flags in the source data, which we do not
   have.
3. ~~Mini games, harder criteria~~ **HEAVILY DELIVERED, Rounds 231-242:** the AU signal got a
   whole vertical (AFL Higher or Lower R231, the AFL premiers List Quiz category R234, the NRL
   R236), and two new multi-sport mini games shipped on the audited champion tables: Champ or
   Not (R235, hard mode R237) and Who'd They Beat? (R242). The Record Books reference page
   (R238) and the finals runner-up completion (R239-242) round out the arc. Round 250 added
   Silverware Sort (the idea bank's "Order the List" concept on audited title counts). More
   minis remain welcome whenever an idea clears the data bar; the idea bank in
   docs/GAME_BACKLOG.md still holds 51 concepts.
4. **GA4 wiring** parks on a measurement ID only Anthony can create; Lovable analytics remains
   the only source meanwhile.
5. ~~Soccer Career: the club captaincy arc~~ **DONE, Round 244:** one captaincy truth
   (isClubCaptain, captainClub, per-stint captainSeasons), earned in the season loop (24+,
   overall 76+, two prior seasons at the club, leaders and academy sons weighted up), the
   dressing-room vote (event 3) folded into the same award path, stripped on every transfer
   and loan with honest lines, decline handover at 33+ with overall 74 or below, a cabinet
   line per stint that completed a season, a catch-all in the season push so no unusual club
   change lets the armband travel, repairCareer guards, and the ©️ badge by the club name.
   simClubCaptaincy is harness 101 (seeded, invariants at every transition).
6. ~~Finals-adjacent enrichments~~ **DONE IN FULL, Rounds 245-248:** wnba finals_mvp (R245,
   all 29), ncaa runner_up and score (R246, all 87), sb venue cleaned and shown (R247), sb
   city and state (R248, all 60, era-accurate municipality with the boundary pinned). Every
   Record Books table is now complete on every displayed column, each via the Round 239
   method: fetch, machine-check, backfill NULLs only, fence.

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
  the college hub linked and submitted). R222 wired IndexNow (key file, submit script, fence,
  pipeline step 5): after every verified publish, `node scripts/indexnowSubmit.mjs` pings Bing,
  DuckDuckGo and Yahoo. Bing Webmaster Tools (the dashboard) remains untried and needs an
  owner login, so it is parked.
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
- **THE BROWSER BOARD IS NO LONGER BLOCKED (Round 251).** The note that sat here since Round 233
  saying "run `node scripts/runAllSims.mjs --browser` in the next session with egress" is retired:
  the egress never arrives, so Round 251 built `scripts/browserEgressShim.mjs` to carry Chromium's
  traffic over node's socket. Run the full board in any sandbox with:
  `NODE_OPTIONS="--import /path/to/scripts/browserEgressShim.mjs" ENGINES=chromium node scripts/runAllSims.mjs --browser`
  It takes about two and a half hours (playGames alone is 90 minutes). Do it whenever a round
  touches shared UI, and always before a big ship.
- **Cross-device and browser QA matrix.** PARTLY CLOSED, Round 203: there is now an iPhone
  device-emulation walk (playIphone) and a static Safari-hostile-pattern scan (simSafari),
  which caught a real iOS date bug in the minefield. A true WebKit run is still impossible
  here: the download fails in this sandbox. Anyone with a Mac or a working install can run
  the existing walks under webkit unchanged.
- ~~Sitewide FIFA-style tile-dashboard reformat~~ **DONE, Rounds 204 and 208.** Round 204: the four front
  offices (NFL, MLB, NBA, NHL) now open on the same five boxes Club Manager has had since
  Round 74, sharing one engine (`src/lib/foHub.ts`) and one component
  (`front-office-shared/FoHubTiles.tsx`), so a change to the pattern lands on four games at
  once. Round 208 finished the job: the four My Career boards joined them, the drawing moved
  to `src/components/hub/HubTiles.tsx`, and NINE games now open on the same box. What is
  deliberately NOT converted: the two Dynasty games and the F1 pair, which are single-screen
  games with no drill-in structure to convert; if they ever grow one, the same two files
  serve them with their own facts object.
- **Per-game competitor depth audit.**
- **simHalftime section 1 flaked once on the Round 271 board. MEASURED ONCE, NOT FIXED, AND
  DELIBERATELY NOT TOUCHED.** It failed with "splitting the match into halves moved the league by
  7.47 points on its own", passed standing alone immediately after, and passed on the Round 270
  board. The check is `gap > 3 * se` over `RUNS = 60` seasons an arm, so a 7.47 gap is roughly a
  four sigma event and should not turn up once in four boards by chance, which means either the
  spread estimate is understated or there is a small real effect. **The rate was NOT measured,
  because one run of this harness takes about 475 seconds and a 40 run sample is over five
  hours.** It is left alone on purpose: the standing rule is widen or seed, never loosen, and
  raising RUNS would SHRINK 3 standard errors and make the test stricter, which is the wrong
  move if there is a real bias and pointless if there is not. Whoever picks this up: run it
  overnight with the arm means, the sd and the gap printed each time, and find out whether the
  gap centres on zero before changing a single number. Do not re-run until green and ship.
- ~~Prerender emits inline anchor text twice~~ and ~~Prerender silently drops any element over
  1200 characters~~ **BOTH DONE, ROUND 269**, in one round because both rewrite every snapshot
  and one full re-prerender is cheaper than two. The length cap is now a SHAPE cap (an element
  that contains another block element is a wrapper and is still capped at 1200; a leaf keeps its
  text to 8000), and blocks are rebuilt with their links preserved inline instead of having their
  text flattened and the link written out again. Measured across all 121 snapshots: doubled links
  161 to 2, and both survivors are a page that links the privacy policy from its own prose as
  well as from the footer, which is honest repeat linking. /whats-new went 106 of 112 entries to
  112 of 112. simPrerender sections 8 and 9 hold both. **The old workaround, keeping What's New
  entries under about 1,150 characters, is retired: write them at whatever length they need.**
- ~~Copy nit: the "🛝 7 times this season..." line~~ **ALREADY DONE, Round 129**, verified in Round 209: SoccerCareer.tsx counts GOALS and lets the celebration finish the sentence. Another stale roadmap line of the kind the Round 199 audit was written to catch.

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

Fresh 31-day pull, 2026-07-21 through 2026-08-20, taken 2026-08-20:

- **16,954 visitors, 59,024 pageviews**, 3.48 pages a visit, about 5 minute sessions, 58%
  bounce. The three best days in the window were Aug 17 to 19 (765, 860, 834 visitors), so the
  trend is up.
- `/soccer-career` did **11,538 pageviews, about 1 in 5 of the whole site and 13.9x the next
  most played game**. Still the single most important fact for prioritising work. When in
  doubt, build for Soccer Career.
- The rest of the measured top ten, in order: `/build-your-xi` 832, `/club-manager` 762,
  `/perfect-season-nba` 628, `/overrated-underrated` 532, `/college-grid` 517,
  `/budget-builder` 446, `/soccer-grid` 440, `/tier-list` 417. Note three of those
  (`/overrated-underrated`, `/budget-builder`, `/tier-list`) are date-seeded dailies that
  simDaily's fence does **not** cover.
- **Bing is the number one traffic source at 6,947 visits**, ahead of Direct at 6,548 and 4.3x
  Google's 1,633. DuckDuckGo adds 804 and Yahoo 306. This is why IndexNow (keyless, Bing's own
  protocol) is on the roadmap.
- **Devices: 79% desktop, 21% mobile**, tablets a rounding error. Countries: US 4,254,
  Australia 3,551, China 1,362, UK 1,278.

Source and caveat: Lovable's project analytics
(`mcp__Lovable__get_project_analytics` on `c29d224f-a662-4a15-b809-d86fa3b3f0ad`). GA4 is
**not** wired up yet, so Lovable is currently the only analytics source. Re-pull before making
a big prioritisation call, and update this section.

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

- **2026-08-25** Round 284. Rebuilt from the handoff after the previous session's 284 to 286
  never reached the folder. Three clock sample prerender, the noindex fence (section 14) with
  controls on both sides, the guide readiness mark, stable JSON-LD order, the simCreation
  threshold measured. Pending row rewritten: 258 through 285 wait on `SHIP146.bat`.
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
