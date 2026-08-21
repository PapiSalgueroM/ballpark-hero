# Project state

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
  Browser probed 7 for 7. Still open from the screenshots: top-rated players BOTH sides
  (needs an opposition ratings model), and possession/shots inside the momentum chart itself.
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
  STILL OPEN from CM-5: more era leagues (a third league for an existing era by the same
  recipe), nothing else.
- CM-6 More leagues (wave 3 list in item 6 of the previous review, densities measured).
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
  STILL OPEN from his list: release clauses on MY OWN contract renewals, and a nationality
  filter (the baked market rows carry no nationality; needs a data pass).
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

- S-1 **DONE for Club Manager in Round 157, extended in Round 159:** playing counts toward
  the header. Every CM match records a completion with the running season score, the
  anonymous completion path dispatches the same header-refresh event the auth path always
  had, and Round 159 gave Soccer Career the same treatment (every advanced season records
  an unscored play, the scored completion stays the retirement legacy). The header itself
  is truly centred at desktop now: at lg+ the bar is a three column grid with equal
  flexible side tracks, phone layout untouched, simMobileChrome still green across all
  five widths. STILL OPEN: the American careers and Stadium Tycoon record only at their
  natural end points; give them the same per-session marks.
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
- S-3 More animation everywhere, standing item F from the first review.
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
  sports one at a time.
- S-6 Indexing: keep the sitemap green (Round 148 fixed the root cause), give Search Console
  time, and add internal links between related games.

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
| Next free round number | **177** (check the folder first, the 3-hourly build task may have taken it) |
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

**Standing large items, still open:**

- **The Club Manager epic.** Transfers, negotiations, loans, release clauses, calendar, player
  stats, youth academy, scouts, facilities, spies, sponsors, tactics drag plus match animation,
  cup naming, garbled opponent names, roster freshness. Tactics drag has been asked for twice
  and is still not done.
- **More leagues.** Explicitly not done. Currently 10 leagues and 186 clubs. He wants "all the
  leagues FIFA has". Also more flags throughout the site.
- **International competitions inside Club Manager.**
- **ESPN-style score ticker.** Blocked on a data-source decision, which is a money question, so
  ask him.
- **CFB Dynasty still uses fake names.** `ROUND87_FILES.zip` contained real 2026 rosters, 528
  players. See the never-run zips warning below.
- **Profile page.** The favourite-game list does not include every game, "fav sport general"
  makes no sense, and he wants every stat verified end to end.
- **Cross-device and browser QA matrix.** Harnesses are Chromium-only at 430x900. WebKit is
  untested.
- **Google indexing and discovery.** Search Console, sitemap, noindex and canonical, Bing
  Webmaster Tools, IndexNow.
- **Trade finders and cap systems.**
- **Sacked-manager unemployed state** with an earned offer feed.
- **Sitewide FIFA-style tile-dashboard reformat.** Only Club Manager is done.
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
