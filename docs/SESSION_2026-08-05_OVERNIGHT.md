# Session 2026-08-05 overnight: rounds 34-41 (38-39 live, 41 awaiting one click)

## Late-night update (05:25Z)
- Round 38 SHIPPED + PUBLISHED: Dart Draft overhaul (guaranteed position
  coverage via targeted queries + academy prospects, 40-OVR trialist replaces
  journeyman, shark/storm/mystery zones, all-time mode, ocean+graticule map),
  Sign the Player raise-by-raise live bidding + named XIs + stats + flags,
  Rebuild live bidding wars vs the two planned rivals + 6-team season sim
  with table/highlights/golden boot.
- Round 39 SHIPPED + PUBLISHED: antimeridian unwrap (partial map fix).
- Round 40 superseded by Round 41 (do not run its bat).
- Round 41 ON DISK, NOT PUSHED (Anthony asleep; Textinputhost stole focus and
  blocked my File Explorer clicks). COMMIT_ROUND41.bat = darts seam-split map
  fix (verified in local SVG render), 17-0 Perfect Season DEF units (new
  nfl_team_defense table, real opponent aggregates, era-relative ratings;
  anchors: 2000 BAL 97, 0-16 Lions 42) + HC cards (~80 curated stints in
  src/data/nflCoaches.ts, Belichick 97 to Urban Meyer 42), Club Manager REAL
  leagues (REAL_LEAGUES 2025-26 memberships, real cup names, 34-round
  DE/FR calendars, save v2), Who Am I/Clue Auction secret pool 200->300.
- DB content shipped instantly (no deploy needed): 20 expert soccer-grid
  puzzles (sg-691..710, all 9 cells hand-verified), 8 trap-heavy connections
  puzzles (cx-20260805-1..8).
- Morning report trigger updated to tell Anthony about the one-click ship.
- Round 38 note: npx tsc on the DEVICE resolves to the squatter package
  (typescript not in device node_modules) - bats now use
  node_modules\.bin\tsc.cmd if present, else skip (cloud is authoritative).
- Round 41 grew twice more before shipping: Budget Builder v2 (eras
  2007/2015/today with per-era pools verified in SQL, self-calibrating
  budget = 62% of the naive best XI, daily date-seeded board demand,
  3-leg Final vs the Money XI via dartDraft simulateSeries), how-to
  popovers added to Transfer Path + Shirt Number (the only 2 games missing
  one; audits confirmed how-to/share/autocomplete coverage everywhere else),
  Build Your XI fail-OPEN validator catch fixed to fail-closed (was a
  standing July-P1-rule violation) + wheel cut from 2000ms to 1100ms,
  docs/CONQUEST_REWORK.md (researched real imperialism-map rules:
  Voronoi start, winner-takes-all territory, landless comeback; contained
  rework plan for a green-light).
- Soccer Career: live-verified rich and stable (era Ballon d'Or, GK stat
  seasons, contracts, finances). The mega-overhaul Anthony asked for was
  the stranded July build, rescued in Round 34; he reviewed the OLD one.
- 07:25Z additions: 15 new Pro Football Grid puzzles (grid-016..030, all
  cells pre-verified) in the payload; 3 NBA + 2 NHL connections puzzles
  straight to the DB (nbaconn-012..014 with the Nash two-franchise-MVP
  error caught and fixed to LeBron, nhlconn-010..011); security advisors
  ran clean (no ERROR-level findings, WARNs pre-existing); Imperialism
  mode driven end-to-end by Playwright through all 18 weeks + playoffs to
  the champion screen with zero page errors; live-site sweep all 200s.
- 09:00Z: NBA CONQUEST GETS IMPERIALISM TOO. New src/lib/imperialismNba.ts
  (own module, not a generalization of the tested NFL engine, so neither
  sport can regress the other; seeds from INITIAL_TERRITORIES_NBA verbatim,
  58 territories, all 30 teams start with land, 14 rounds then a
  territory-seeded 8-team playoff, NBA scorelines 102-135 with OT no-ties)
  + ImperialismBoardNba.tsx + ConquestNba.tsx mode select (Arcade
  preserved). VERIFIED: 40 headless full seasons (territory conservation,
  no ties, winner always outscores loser, OT margin <=4, clean pairings,
  10 distinct champions tracking the checked team overalls: OKC 91 / BOS
  88 / HOU-SAS 87 top the file) + Playwright full season on the local
  build to the champion screen, zero page errors, map screenshots clean.
- CONQUEST IMPERIALISM MODE BUILT (task 83 complete, 06:30Z): new
  src/lib/imperialism.ts (32 real stadium coords, states-level Voronoi
  seeding with home guarantees, winner-takes-empire, landless comeback,
  OT no-ties, territory-seeded 8-team playoff) + ImperialismBoard.tsx
  (pick your team, weekly predictions at +25, results grid, comeback
  headlines, reuses ConquestMap) + Conquest.tsx mode select (Imperialism
  default-recommended, Arcade preserved untouched). VERIFIED: 30 headless
  full-season sims (no territory leaks, champion every run) + Playwright
  UI run through week 5 on a local build (screenshots clean, only
  expected offline-resource errors).
- 09:45Z: MISSING ELEVEN DEFENSES SHIPPED INTO THE PAYLOAD (task 82). Four
  iconic starting defenses, every starter confirmed by 2+ independent
  publishers (research agents + my own spot-checks of the primary sources):
  SB XX Bears (chicagobears.com official starters gallery +
  profootballarchives box score; Perry DID start at RDT), SB XXXV Ravens
  (pfr 2000 starters table + lineup listings + Sun/RSR; Herring at SS, not
  Corey Harris), SB XLVIII Seahawks (OFFICIAL NFL GAMEBOOK PDF fetched:
  the starting card is the NICKEL, Malcolm Smith the MVP did NOT start,
  neither did Irvin/Mebane/McDaniel/Bryant), SB 50 Broncos (B/R + AMNY +
  NFL.com film review + Wikipedia player pages). ElevenLineup gained
  unit: 'offense'|'defense', page copy is unit-aware, data invariants
  script-checked (slotIndex matches, self-guess passes, no em-dashes),
  Playwright verified a defense lineup renders + reveals cleanly.
- 10:35Z: CAREER LADDER +8 LEGENDS, LIVE NOW (task 60, DB-instant). Johan
  Cruyff, Michel Platini, Roberto Baggio, Alan Shearer, Peter Schmeichel,
  Edwin van der Sar, Nicolas Anelka, Robbie Keane: 173 season rows, every
  apps/goals figure reconciled by a research agent across 2+ fetched
  sources (Wikipedia table basis + 11v11/worldfootball/RSSSF/club
  archives/official gamebooks), career totals verified against canonical
  numbers (Shearer 734/379 incl PL-record 260, Cruyff 713/400, Keane
  737/325, Schmeichel Man Utd 398). Editor calls, documented: assists NULL
  everywhere (pre-Opta seasons cannot be honestly sourced; column made
  nullable via migration, UI already guards); market values are editorial
  era-plausible curves matching the Maradona/van Basten 25-peak precedent;
  Anelka's Shenhua 2012 stored as 24 apps (Wikipedia's 27 includes 3
  continental apps that cannot exist, the club played no continental
  games in 2012); Schmeichel's Danish per-season splits are single-source
  (Wikipedia table) with club totals two-source confirmed, Gladsaxe-Hero
  omitted entirely (no per-season data exists); van der Sar's 0-app
  1991-92 reserve year omitted. careerLadder.ts got 6 new club flag
  patterns (Vicenza/Nancy/Hvidovre/Aztecs/Diplomats/ATK), ships Round 41;
  until then those clubs just show no flag.
- 11:00Z MORE DB-INSTANT CONTENT (all live now, no deploy):
  * Missing XI 10 -> 18 puzzles: 2005 Istanbul Liverpool (Kewell started,
    Hamann did not), 1999 United (both scorers off the bench, Blomqvist
    started), 2010 Spain (Pedro over Torres), 2014 Germany (Kramer's
    warm-up start), 2011 Barca (Mascherano CB, Abidal lifts it first),
    2006 Italy (Totti started, Del Piero 86th), 2002 Brazil (Kleberson,
    Marcos not Dida), 2012 Chelsea (Bertrand's UCL debut IN the final).
    Every XI dual-sourced by research agents (official gamebook-grade
    sources: UEFA match data service, LFChistory, chelseafc.com verbatim
    line, BBC live text, it-wiki tabellino); slotIndex integrity checked
    in SQL; no em-dashes.
  * NFL Connections 12 -> 16 (nflconn-013..016): defensive SB MVPs incl
    Malcolm Smith, 16+ season one-franchise men (Hanson 21, Green 20),
    non-QB SB touchdown passes (Newhouse to Jennings, SI-verified), SB
    return TDs, undrafted Pro Bowlers, two-sport baseball guys, 10k-yard
    TEs, 72 Dolphins, Heisman+MVP, ORoY QBs, bustiest No. 1 picks,
    QB-punters. Group-overlap traps audited (e.g. Ray Lewis moved OUT of
    the one-franchise group because he fits it, Newhouse forced the
    16-year twist for the same reason).
- 11:20Z: connections sweep finished. NHL 11 -> 14 (nhlconn-012..014:
  losing-cause Conn Smythes, 4-decade careers, goalie goals, 3-team Cup
  winners; caught and fixed two ambiguity bugs on self-audit, Gretzky
  dual-fitting Oilers/70-goal and Nieuwendyk dual-fitting Calder/3-Cups)
  and NBA 14 -> 16 (nbaconn-015..016 with deliberate unique-partition
  misdirection: Rodman-to-DPOY, Kobe stays Lakers, Embiid forced to MVP
  group, SGA forced to MVP group despite his 2025 scoring-title-plus-chip;
  a genuine two-solution bug around Dwight Howard was caught before
  insert and replaced with Amare Stoudemire). Pools now: NFL 16, NBA 16,
  NHL 14, soccer 326+, Missing XI 18.
- 11:45Z VERIFICATION SWEEP CAUGHT A REAL BUG: every NBA + NHL connections
  puzzle authored today (nbaconn-012..016, nhlconn-010..014) was in the
  WRONG FORMAT (category/4-player groups) and the frontend validator
  (4 groups x 5 players x 20 unique, theme key) was silently dropping all
  10 of them; they never reached a single player. All 10 rewritten to the
  canonical format with fifth members verified and full partition-
  uniqueness audits (Kareem forced to Centers, Wilt forced to 30-a-game,
  Hull forced to 50-in-50 despite his 1999 Cup winner, Messier forced to
  Cup captains despite 1,756 games, Nieuwendyk forced to 3-team Cups
  despite his Calder). Re-ran the EXACT frontend predicate in SQL across
  all tables: NFL 16/16, NBA 16/16, NHL 14/14, soccer 326/326, baseball
  302/302 valid; missing_xi 18/18 slots+candidates aligned. Lesson
  banked: always read the game's fetch validator before authoring DB
  content, formats differ per sport.
- 12:40Z THE EVERY-SPORT CONQUEST PUSH (Anthony's midday directive:
  conquest + manager + career for each sport, max realism):
  * Imperialism realism pass on NFL + NBA: W-L records with streaks
    tracked all season, live standings table (top-8 line marked, record
    breaks territory ties for seeding), records on the matchup cards,
    streak headlines. Verified in 20 headless seasons (win/loss
    conservation, games-played integrity, seed uniqueness).
  * NHL CONQUEST built (/conquest-nhl): 32 teams, official colors,
    editorial 2026 strengths (FLA back-to-back anchor), nearest-rink seed
    over the same 58 territories, and THE INVADERS mechanic: TOR/OTT/EDM/
    VAN/BUF genuinely have no nearest-arena US territory so they start
    landless, one win from an empire (MTL holds Vermont, WPG North
    Dakota, CGY Montana as legit border footholds). Hockey scorelines,
    sudden-death OT always one goal. 40 headless seasons pass all
    invariants (6 invader titles, EDM 5). Playwright full season as
    invader Edmonton to the champion screen, zero errors.
  * MLB CONQUEST built (/conquest-mlb): 30 teams, editorial strengths
    (LAD back-to-back anchor, TOR 2025 pennant), nearest-park seed with
    documented editorial calls (Mets take CT, White Sox take Iowa for the
    Field of Dreams, Athletics hold Sacramento, Angels take Vegas,
    Cardinals keep Arkansas radio country), invaders TOR + SDP. Baseball
    linescores, extra innings always one run. 40 headless seasons pass
    (5 invader titles), Playwright full season as invader San Diego,
    zero errors. Playoff labels: Division Round, Pennant Round, Imperial
    World Series.
  * ROUND 42 staged as a SUPERSET: COMMIT_ROUND42.bat extracts Round 41's
    zip AND Round 42's, commits everything in one go. ANTHONY: run ONLY
    COMMIT_ROUND42.bat, skip the older bats.
- 13:30Z NFL FRONT OFFICE SHIPPED INTO ROUND 42 (/front-office): the
  flagship GM sim. REAL 2025 rosters (nflfastr_rosters season 2025 joined
  to 2023+2024 production by gsis_id; 287 players baked into
  frontOfficePlayers.ts with the full derivation documented in the file
  header; Rodgers on PIT, Darnold SEA, Metcalf PIT all correctly placed;
  CHI DJ Moore duplicate-spelling deduped; team defense units from
  nfl_team_defense 2024 with the LA/LAR abbr mismatch caught and fixed).
  Engine: cap sheet (260M rising 5 percent yearly), cuts, free agency,
  AI-evaluated trades with pick sweeteners, weekly injuries, AI rival
  moves, 17-game schedule with true 6-game divisional structure, REAL
  14-team playoff format (7 seeds, 1-seed byes, conference brackets to
  the Super Bowl), 3-round draft of clearly fictional prospects with
  scouting error, offseason aging/breakouts/retirements/contract churn,
  roster replenishment (found via 6-season headless test when BAL's
  roster collapsed), localStorage saves, unlimited seasons. Verified:
  engine test across 6 seasons (schedule integrity 17 games each with
  exactly 6 divisional, W/L conservation, 14 unique playoff seeds,
  correct bracket shape) + Playwright full season (cut, sign, accepted
  trade, 17 weeks, title recap, draft, into season 2027 with save),
  zero page errors. Fictional-contract framing stated in the data file
  and the UI copy.
- 14:15Z NFL MY CAREER SHIPPED INTO ROUND 42 (/nfl-my-career): BitLife
  style player life sim. Create a fictional prospect (QB/RB/WR, nine
  archetypes with real tradeoffs), get drafted by a real team, live whole
  seasons with position-appropriate stat lines driven by rating, health,
  morale and a random-walking team quality; one big decision per offseason
  (contract discounts vs free agency, trade requests, surgery vs playing
  hurt, podcast fame vs film room); awards (ORoY, All-Pro, MVP), rings,
  aging cliffs (RBs fall off at 28 and are forced out by 34), injuries
  weighted by archetype durability, retirement and a legacy verdict with
  HOF call. Balance verified over 300 random headless careers per the
  distributions in scripts/mcSimTest.ts (RB avg 11.9 seasons vs QB/WR
  17.9, MVPs under 0.5 per career, tuned three times: MVP odds, age-30
  training wall, RB cliff multiplier, legacy scale). Playwright drove a
  full RB career to the retirement screen, zero errors. localStorage
  saves like Front Office.
- 15:45Z NBA FRONT OFFICE + NBA MY CAREER SHIPPED INTO ROUND 42:
  * /nba-front-office: GM sim over the hand-curated real rosters already
    in conquestDataNba (about 10 real players per team). NBA economics
    (155M cap rising 7 percent), waives/signings/trades, 20-round season,
    conference standings, THE PLAY-IN for seeds 7-10 as single games
    (caught in test: play-ins were simming best-of-7, fixed), best-of-7
    rounds to the Finals (21-series structure verified), 2-round draft
    with scouting error, offseason churn. 4-season headless test + full
    Playwright season as OKC into 2027, zero errors.
  * /nba-my-career: player life sim, G/F/C with nine archetypes (Point
    God, Paint Beast, Stretch Five...), per-game stat lines clamped to
    believable records (38 ppg cap after a sim hit 46), ROY/All-NBA/MVP/
    Finals MVP, rings, Father Time at 32, verdict tiers up to the GOAT
    debate. 300-career balance distributions checked; Playwright full
    career to the rafters, zero errors. One real bug caught by Playwright
    that tsc missed: a renamed helper left `progress()` unresolved at
    runtime in the derived board.
  SITE NOW HAS: Conquest x4 sports, Manager x3 (soccer, NFL, NBA),
  Career x3 (soccer, NFL, NBA).
- 16:20Z MLB MY CAREER + NHL MY CAREER SHIPPED INTO ROUND 42
  (/mlb-my-career, /nhl-my-career): the career sim now exists for ALL
  FIVE sports. MLB: hitter/pitcher split (SP with Tommy John decisions
  and ERA/W/K lines vs CF/SS/1B with AVG/HR/RBI/SB), six years of team
  control before free agency, Cy Young vs MVP award tracks, Cooperstown
  verdicts. NHL: C/W/D/G with goalie SV% lines, Calder/Hart/Vezina/
  Norris/Conn Smythe, Cup runs, goalies peaking late. Both derived from
  the proven NFL/NBA template with sport-true parameters, both driven by
  Playwright through entire careers to the retirement screen with zero
  page errors (MLB crafty lefty reached Cooperstown first ballot, NHL
  statue goalie hit the Rushmore tier).
  FINAL SHAPE OF THE PUSH: Conquest x4 sports (all imperialism format
  with records/standings), Front Office GM x2 (NFL real-roster bake, NBA
  curated rosters), My Career x5 sports, plus soccer's existing Club
  Manager and Soccer Career. 
- 14:45Z SOCCER CAREER GOT THE OUTTA-POCKET EXPANSION Anthony asked for
  at midday (all in Round 42):
  * 12 new storyline dilemmas: THE MAFIA ARC (serious people ask you to
    throw a cup tie; take the 8M and they ALWAYS come back for the title
    decider at 15M, with a 50% investigation that lands a 3-SEASON BAN
    and a confession path with immunity and a forced move abroad), the
    magazine cover offer (tasteful calendar vs the artistic
    nothing-but-a-strategically-held-football version with sponsor
    fallout), the wedding-dress pitch proposal, the deepfake scandal,
    the cursed hometown statue, the haunted team hotel, the valet who
    crashes your hypercar, the reality show in your house, the ultras
    demanding a crest tattoo, Biscuit Gate, and THE BALLON D'OR SNUB
    (finish 2nd or 3rd and next season the snub storyline fires with a
    revenge-tour +3 all stats option). Arc follow-ups jump the random
    queue; dilemma rate raised 20% -> 30% per season.
  * 14 new money options: buy your BOYHOOD CLUB (60M legacy landmark),
    hometown academy, museum of yourself, hypercar, a personal
    submarine, teammate's startup, meme coin (10% chance of a 20x),
    art collection, racehorse, esports org, security team, your own
    documentary crew (+3 popularity per season), family office (+2%
    net worth per season), charity foundation (legacy credit yearly).
    Catalog now 41 items, all wired into purchase effects and yearly
    investment resolution.
  * VERIFIED: every choice of every new dilemma applied in a headless
    harness (state clears, event logs, no em-dashes), mafia stage
    machine exact, ban rate measured 93/200 at the stated 50%, snub
    fuel clears and stages the boost, all 14 items purchasable, and a
    pre-expansion save shape flows through untouched (new fields are
    optional). Ban serving logic confirmed generic for 3 seasons.
- Still open: MLB + NHL Front Office GM sims (need verified roster
  bakes; blocked earlier when subagents hit the org spend limit),
  Google/Apple sign-in (his clicks).



Anthony gave a ~70-item review of the live site and full autopilot authority.
Four rounds went from repo to douknowball.com in one night. All verified live.

## Shipped and published (in order)

### Round 34 (rescue + P0s)
- Shipped the entire stranded July session (direct-Supabase auth rewrite,
  HowToPlayPopover, validator fail-closed sources, RankEm, HockeyCareer fix).
- Auth modal: distinct signup copy ("Join DoUKnowBall"), cross-links.
- Stats: signed-in only, streak = consecutive days, games played today;
  guests get sign-up nudges on home hero + every game navbar.
- Lovable badge scrubbed via index.html MutationObserver sweep.
- Deleted with redirects: grade-transfer, perfect-lineup (soccer), world-cup
  legends, guess-soccer-club, guess-transfer-value, deal-or-no-deal
  (-> squad-deal), football-draft.
- Home scroll restoration confirmed working.
- report-relay edge function: stores report + forwards to
  douknowball1@gmail.com via FormSubmit (activation click pending in that
  inbox). ReportQuestion falls back to direct insert.
- LIVE-VERIFIED: voted A-Rod on the Jeter poll, results showed 13% (8 votes).

### Round 35 (data correctness + golf)
- Fantasy Draft criteria ENFORCED: age column added + backfilled on
  fantasy_draft_players; new all-enforceable criteria list (function v3);
  UI blocks illegal picks; AI drafts legal + smart (value-greedy, grabs GK).
  Labels must stay in sync between the edge function and
  src/lib/fantasyCriteria.ts.
- playerRating: FIFA-style curve with AGE BOOST (30+ multiplies value before
  the curve). Kane 91, Musiala 89, Neuer 80 verified on the live pitch.
- CM slots no longer accept wide players (MD = CM/CDM/CAM).
- World XI: age wired, respins capped at 3 per game.
- nameFold.ts: Odegaard-class letters (O-slash etc) fold in ~10 matchers.
- Career Ladder: flagForClub (~250 club->country patterns) + no more
  "stints" wording + honest loss share-line.
- Transfer Path: give-up with BFS shortest-path reveal (temporal teammates).
- Player Stock Market: blind buying (Mystery CF A style until reveal).
- Golf tab LIVE: golfLegends.ts (61 majors winners from golf_majors),
  Guess The Golfer + Golf Higher or Lower.
- 337 em-dashes stripped from strings in 111 files (string-literal-scoped
  script), en-dash year ranges to hyphens, }-{ JSX fixes.
- Legal email -> douknowball1@gmail.com; sitemap regenerated (94 games).

### Round 36 (NFL night + crowd)
- NFL Higher/Lower: 6 stat categories (nflHLCategories.ts baked from
  nflfastr aggregates, careers 2000+); per-round category chip; tie pairs
  banned in normal mode.
- NFL Career Path: real unlimited mode (no page reloads).
- NFL Connections: 4 niche puzzles (nflconn-009..012) in DB.
- Missing Eleven: suggestion bar merges puzzle-pool + whole NFL_ROSTER_SOURCE.
- Rarity Round: rarity_round_guesses table (anon insert/read), most-picked
  reveal + "you rank #N of M today" from game_completions.
- Squad Deal: fifth extras board (Home Kit) + hotter banker (target*1.06,
  25% sweetener near max).
- Tier List daily excludes the exact indexes Overrated picks that day.

### Round 37 (box2box Rebuild)
- rebuildDeck.ts: coach options (tier-priced, +1/+2/+3 rating), 8-objective
  board deck (2 dealt, seeded per club), 12 financial events (fire every 2nd
  transfer action), rival personas + deterministic rival window sim.
- useRebuild: pick-coach phase, live objective checklist, money news feed,
  forced-sale penalties on unmet demands at finish, async 2-rival sim.
- Pitch view: XI on a real pitch (slot.x/slot.y, GK bottom), tap to sign.
- LIVE-VERIFIED end to end on the preview: Bayern 85 -> 88 with Ancelotti
  (cost 39M off budget), penalty dropped it to 87, beat Agent Zero's Chelsea
  (85, signed Vinicius Junior) in the 3-way table.

### Round 42 addendum (14:50Z): MLB + NHL Front Office, no subagents needed
- The org monthly spend limit killed the Agent tool, but the leagues' own
  public APIs are reachable from the container, so the roster bakes ran
  in-session against primary sources instead of research agents:
  - MLB: statsapi.mlb.com. 2026 40-man rosters (40Man rosterType because
    active rosters were missing IL stars: Judge and Soto are on the IL as of
    Aug 5) + full-2025 hitting/pitching season stats + partial 2026.
  - NHL: api-web.nhle.com rosters for 2026-27 (post free agency) +
    api.nhle.com/stats/rest full 2025-26 skater/goalie summaries. urllib is
    403-blocked by their CDN, curl passes.
- src/data/mlbFoPlayers.ts (GENERATED): 30 x 13 real players. Hitters rated
  by 2025 OPS percentile (PA>=300) mapped 66..97, pitchers by FIP-lite
  percentile (SP 66..96, RP 64..92, closers +2), ages are MLB's own
  currentAge. Every name verified against the raw team roster JSON, zero
  cross-team dupes. Top of the league: Raleigh/Judge/Ohtani/Springer/Kurtz
  97. Real deadline moves confirmed from the API and preserved: Skubal and
  Kyle Tucker on LAD, Framber Valdez on DET, Bichette on NYM, Murakami CHW.
- src/data/nhlFoPlayers.ts (GENERATED): 32 x 13 (7F/4D/2G, BOS pads from
  depth because they list one goalie). Forwards by 2025-26 P/GP percentile
  (GP>=30) 66..97, D separately 66..95, goalies 60/40 save%+wins 66..95.
  McDavid/MacKinnon/Pastrnak/Draisaitl/Kucherov/Celebrini/Hughes/Necas 97.
- src/lib/mlbFrontOffice.ts: luxury-tax-line payroll (real 2026 line $244M,
  +3%/yr), 27 rounds x 6 games, real October: division winners 1-3, wild
  cards 4-6, byes for 1-2, Bo3 WC, Bo5 LDS, Bo7 LCS/WS. Divisions pulled
  from the API, not memory. Salary curve tuned so payroll min/median/max =
  101/177/244 vs the line.
- src/lib/nhlFrontOffice.ts: hard cap $104M (real announced 2026-27 upper
  limit, +9%/yr per the CBA memo), REAL points system (W2/OTL1, 25% of
  losses go OT), divisional playoff bracket exactly like the league: top 3
  per division + 2 WC per conference, better div winner draws WC2, all Bo7.
  Goalies decline later (34 vs 31).
- Boards + pages + routes + registry entries for /mlb-front-office and
  /nhl-front-office, same UX as the NBA GM (5 tabs, saves, draft with
  scouting error, trades with pick sweeteners, ShareButtons).
- Verified: scripts/mlbFoTest.ts + nhlFoTest.ts (4 simulated seasons each:
  series counts 11/15, WC=Bo3, LDS=Bo5, seeds are division winners, points
  math, 16 distinct playoff teams, rosters never collapse, varied champs),
  tsc + vite build clean, Playwright end-to-end on both boards (pick team,
  3 rounds, standings tables 30/32 rows, W-L-OTL points column, free
  agency), em-dash sweep clean.
- ROUND42_FILES.zip now 48 files; COMMIT_ROUND42.bat git-add list and
  commit message updated. Still ONE double-click for Anthony.

### Round 42 addendum 2 (15:25Z): connections pools topped up (DB-instant)
- nhl_connections_puzzles 14 -> 20, nfl_connections_puzzles 16 -> 20,
  nba_connections_puzzles 16 -> 20. All hand-authored in the strict
  theme/5-player/20-unique format and re-verified in SQL with the exact
  frontend predicate afterward (60/60 rows valid, zero em-dashes).
- Every puzzle carries a documented partition-uniqueness audit. Deliberate
  NYT-style overlaps left in on purpose, each proven to have no legal swap
  partner: Iginla (015), Bure (016), Crosby (017), Ullmark (018), Gordie
  Howe (019), Reinhart (020), Durant + Carter (nba-017), Giannis +
  Markkanen (nba-018), Shaq + Parker (nba-019), Curry (nba-020), Marcus
  Allen + Franco Harris double-fit in nfl-019 (no counter-swap exists in
  the OROY group, checked player by player).
- Facts stayed inside the certainty window (nothing after May 2025 asserted;
  the 2025 4 Nations and SGA 2024-25 scoring title are both pre-cutoff).

### Round 42 addendum 3 (15:55Z): the rivalry saga (owner ask: more rivalry storylines)
- Extended the EXISTING RivalPlayer system instead of duplicating it (same
  rule as the mafia arc). CareerState gains optional rivalryIntensity (0-100,
  old saves keep loading).
- Ten new rivalry beats (ids 109-118) in the yearly rivalry deck, all
  condition-gated: rival signs for YOUR club, tunnel bust-up, the 300-goal
  chase, national-team armband snub (same nationality only), viral shirt
  swap, rival's ligament tear (sympathy cools the feud), the GOAT debate
  (both 88+ overall), the ultras banner answer, the rivalry documentary
  (age 28+, pays 3M), and his testimonial invitation (age 32+).
- Four INTERACTIVE rival dilemmas with choices and risk rolls:
  rival_club_offer (join your enemy for a 10M bonus and furious fans, leak
  it for popularity, or refuse quietly), rival_bad_tackle (plot revenge with
  a 30% red-card backfire, accept the apology, or answer in May with +1
  shooting), goat_debate_show (2M fee with a 35% viral-disaster roll),
  rival_charity_match (truce night, nutmeg war, or quiet check). All gated
  on having an active rival; debate show needs 85+ overall.
- Rivalry heat feeds legacy: intensity 70+ at retirement adds +5 to the
  rivalry summary legacy bonus ("era-defining feud").
- Five more money moves (catalog 41 -> 46): signature cologne (60% prints
  5M), celebrity tequila (45% 3x), a football game studio with you on the
  cover (25% 4x), a seat to space, and the pettiest 45M in football:
  buying your RIVAL'S boyhood club (names him in the event line, +40 feud).
- Verified by scripts/rivalryTest.ts: all 10 events apply/clear/log with
  bounded intensity, all 4 dilemmas x every choice, red-card rate measured
  95/300, join-the-enemy pays exactly 10M, era bonus is exactly +5, all 5
  purchases deduct and log, old saves without the field tolerated. Full
  careerDilemmaTest regression still green, tsc and vite build clean.

### Round 42 addendum 4 (16:25Z): Missing XI audit instead of blind adds
- Planned to top up Missing XI, then discovered the REAL pool is the bundled
  LINEUPS array in src/lib/missingXi.ts (167 lineups); the 18-row
  missing_xi_puzzles table is only a staging mirror for merged batches. The
  four finals I authored (2022 WC Argentina, 2018 WC France, 2013 CL Bayern,
  2020 CL Bayern) already existed in the bundle. Reverted the duplicate
  merge, deleted the 4 staging rows, bundle back to byte-identical, tsc
  green, DB back to 18.
- Silver lining: my lineups were parsed mechanically from Wikipedia match
  wikitext via the MediaWiki API (the fast-model WebFetch extraction gets
  lineup tables WRONG: it had Montiel and Acuna starting the 2022 final;
  the raw wikitext proves Molina and Tagliafico started). All 44 names in
  the four existing bundle entries match the wikitext parse exactly, so
  that slice of Missing XI is now independently re-verified.
- Pipeline note for future sessions: WebFetch works for en.wikipedia.org
  (Guardian and BBC are proxy-blocked); for lineup tables ALWAYS pull raw
  wikitext via the MediaWiki API and parse mechanically, never trust the
  summarizer. And check the BUNDLE for existing content, not just the
  staging table.

### Round 42 addendum 5 (16:45Z): the Ballon d'Or ceremony got a microphone
- Owner ask "update the ballon dor thing": winning the award now hands you
  the mic. New engine export applyBdorSpeech with four acceptance speeches:
  thank your RIVAL by name (popularity +12, integrity +5, feud -20, the
  event line names him), bring your kid on stage (gated on having a child,
  popularity +15), cry through the whole thing (+10), or declare yourself
  the greatest ever (65% the room just agrees +8, 35% it backfires -10 and
  the feud heats up).
- BallonDorCeremonyCard now renders the speech menu on a win (choices
  gated: rival option needs a living rival, family option needs a child);
  losers keep the old Continue. Losing 2nd or 3rd still arms the snub
  revenge arc from earlier today.
- No new save fields (pendingBallonDor was already transient), so old saves
  are untouched.
- Verified: rivalryTest.ts extended (all 4 speeches apply and clear, rival
  named, feud cooled exactly 20, arrogance backfire measured 105/300),
  tsc + build clean, Playwright mounts /soccer-career with zero runtime
  errors. COMMIT_ROUND42.bat now also git-adds src/pages/SoccerCareer.tsx.

### Round 42 addendum 6 (17:55Z): CFB DYNASTY, a whole new game
- The college section had four quiz games and zero depth; the owner wants
  crazy in-depth sims. New game at /cfb-dynasty: run a real program.
- src/lib/cfbDynasty.ts: 44 real schools with post-2024-realignment
  memberships (Texas and OU in the SEC, USC/UCLA/Oregon/Washington in the
  Big Ten, SMU in the ACC, Utah/Arizona State/Colorado in the Big 12, a
  Group of Five bucket) and editorial prestige 69-96. Every PLAYER is
  fictional by design (generated names with class years) so no real
  athlete likeness is used: rosters churn honestly via FR-SR classes.
- Season: 12 weeks (4 non-conference then 8 conference), five conference
  championship games, then the REAL 12-team CFP: five champs auto-qualify,
  seven at-larges, straight seeding (the 2025 format), byes for the top 4,
  first round through the natty. Heisman race with one-award-per-player
  rule (no fictional Archie Griffins by accident).
- Offseason: seniors graduate, elite juniors (88+) declare 60% of the
  time, underclassmen develop toward potential, NIL budget from prestige +
  wins funds a 2-to-5-star high school board WITH scouting error while
  portal transfers have exact ratings, AI programs reload from prestige.
- Board with Roster / Play (full country scoreboard) / Top 25 (playoff cut
  line marked) / Conference standings tabs, save key cfb-dynasty-save-v1,
  ShareButtons, dynasty tracking (natties + seasons).
- Verified: scripts/cfbDynastyTest.ts (4 seasons: 22 games per week so all
  44 play, no ties, conference flags exact, everyone lands on 12 games, 5
  CCGs, champs always in the 12-team field, 11 bracket games, distinct
  Heismans, portal has zero scouting error, rosters never collapse), tsc +
  build clean, and a FULL Playwright E2E: picked Georgia, played all 12
  weeks, playoff + Heisman rendered, signed recruits, started season two.

### Round 42 addendum 7 (18:35Z): CBB DYNASTY, second new game of the night
- College hoops sibling of CFB Dynasty at /cbb-dynasty. 40 real programs
  across ACC, SEC, Big Ten, Big 12, Big East and a Mid-Major bucket built
  for Cinderella (Gonzaga, SDSU, Saint Mary's, Memphis, Dayton, VCU).
  Players are fully fictional with class years, same likeness rule.
- The hoops-specific flavor: elite freshmen are ONE-AND-DONE (88+ leaves
  after year one, 85% of the time), 20-game season in 10 two-game rounds,
  single-elim conference tournaments (top four), six auto-bids, then a
  32-team single-elimination March with straight seeding. The engine
  tracks the lowest Final Four seed and crowns a Cinderella at 10+.
- Balance was TUNED with a measured distribution, not vibes: first cut had
  a deep Cinderella every season (avg Final Four seed 6.3, one 26-seed).
  Fixed by blending strength into the committee's seeding (wins*1.6 +
  strength*0.8) and sharpening game win-prob to gap/6.5. Measured over 20
  simulated seasons: avg Final Four seed 4.3, 10-plus-seed crashes the
  Final Four in 6 of 20 seasons, worst tail a 14. March stays mad without
  being a coin flip.
- National Player of the Year with the one-award rule, NIL recruiting with
  scouting error, exact-rated portal, AI reload by prestige.
- Verified: scripts/cbbDynastyTest.ts (5 seasons: 40 games per round, no
  ties, everyone plays exactly 20, six conference finals, auto-bids always
  in the field, bracket exactly 16/8/4/2/1 by round, champion always wins
  five games, seeds in range, distinct POYs, portal exact, rosters hold),
  tsc + build clean, full Playwright E2E (Gonzaga: 10 rounds, March recap
  with title game and POY, recruited, started season two).

### Round 42 addendum 8 (18:55Z): home page showcase for the deep sims
- With 12 dynasty and career sims now live, they were buried inside sport
  categories. New "Dynasty & Career Sims" showcase section at the top of
  the home page (above the sport categories, below search): all four Front
  Offices, all four US My Careers, Soccer Career, Club Manager, CFB
  Dynasty and CBB Dynasty, with the line "Not quizzes. Whole universes."
- Implementation: featured flag on GameDef + FEATURED_GAMES export, so
  nothing is duplicated in the registry (search results, TOTAL_GAMES and
  the per-sport sections are untouched). Playwright confirms the section
  renders 12 worlds and cards navigate (clicked into CBB Dynasty).

## DB changes (flawuiqbvjobmkfkauhw)
- fantasy_draft_players.age (backfilled from player_market_values, 200/200)
- fantasy_draft_daily table created (RLS public read)
- rarity_round_guesses table (RLS anon insert + public read)
- nfl_connections_puzzles 8->12, nba 9->11, nhl 8->9 (all facts verified)
- Edge functions: report-relay v1 (new), fantasy-draft-daily v3

## Scheduled tasks (claude-code-remote)
- trig_01LfTPy5ywnF47t61VcZv4GP: 08:30Z one-shot, extends daily_polls
  +30 days of opinion-only debates.
- trig_015uid4SzNqkupTnqyAMKMEv: 13:00Z one-shot, morning report for Anthony
  (site health, signups, plays, votes, reports, advisors + his 2 pending
  clicks).

## Pipeline notes for the next session
- Ship loop: edit in cloud clone of PapiSalgueroM/ballpark-hero -> zip
  changed files + COMMIT_ROUNDxx.bat -> SendUserFile -> device_commit_files
  into C:\Users\antho\ballpark-hero -> computer-use File Explorer
  double-click the bat (typechecks, commits explicit list, pushes) -> verify
  git ls-remote -> wait ~90s Lovable sync -> Lovable deploy_project ->
  curl douknowball.com for the new index-*.js hash.
- COMPUTER-USE GRANTS DROP every ~30-45 min; re-resolve + re-request (Anthony
  approves fast when awake). File Explorer resolves tier "full".
- Container Chromium CANNOT reach external sites (proxy). Use Anthony's
  Chrome via claude-in-chrome against the id-preview URL for live playtests;
  container Playwright only against local `vite preview` (DB-free flows).
- Stale .git/index.lock exists on the device repo; every bat deletes it
  first. Never run git add/commit via device_bash.
- daily_polls banked through early September (overnight worker extends it).

## Top of the backlog (owner's remaining asks)
STATUS AUDIT 2026-08-05 17:05Z: most of the old list is DONE and was stale.
Verified in code this session:
- DONE Rebuild live bidding wars + season sim stats (53, 55): rebuildDeck.ts
  has rival personas, hijack bidding and the 6-team simulated season table.
- DONE Sign the Player tiered bidding + showdown (68): auctionHouse.ts
  (great/good/weak tiers, two AI moguls, simulateShowdown).
- DONE Club Manager real leagues + UCL (61, 62): REAL_LEAGUES with the
  actual 2025-26 memberships, league table, UCL group + knockout.
- DONE Soccer Career mega-overhaul (73): money catalog 46, mafia arc,
  rivalry saga, Ballon d'Or speeches, all shipped today.
- DONE how-to-play on older games (29): the last two gaps (Shirt Number,
  Transfer Path) already carry HowToPlayPopover inside their boards.
- DONE darts seam fix + ocean rule (56 partially, the 40-OVR ocean
  trialist and seam-cut scoring are in dartMap.ts).

Actually still open (corrected: darts all-time mode ALSO exists, the
'alltime' topic in DartDraft.tsx blends LEGENDS into the pool):
1. 17-0 Perfect Season coach + defense units (77): needs curated
   coach-by-team-year data, only map stints you are CERTAIN of.
2. DONE darts per-country coverage (58), closed 19:05Z by audit: SQL'd
   the 2026 pool (player_market_values_dedup) by nationality x position
   group for ~45 major footballing nations. Only four holes exist:
   Algeria, Mali and Wales have no goalkeeper in the pool, Peru has no
   MID/FWD. Every hole lands on the existing wildcardChoices fallback
   (verified in dartMap.ts), which is the designed behavior: a thin
   country offers a wildcard instead of an empty list. No change needed.
3. DONE NFL Conquest research pass (83), closed 17:20Z: audited all 32
   STADIUM_COORDS against real stadium locations (30 exact, LAC nudged
   toward San Diego and NYG toward south Jersey as deliberate tie-breakers
   because both LA teams share SoFi and both NY teams share MetLife), then
   ran seedEmpires headless (scripts/nflSeedAudit.ts): 56 territories, no
   landless teams, and every multi-state empire checked by hand against
   nearest-stadium math (DEN takes MT/NE/WY, KC takes AR/KS/MO, LV takes
   UT, SEA takes ID/OR, PIT takes WV, BAL edges PHI for DE). All correct.
4. Soccer grid nichification (72).
5. More DB puzzles always welcome (today: +18 connections across
   NFL/NBA/NHL, all pools now 20; Missing XI pool is actually 167 in the
   bundle, deep enough).
6. Google sign-in: BLOCKED on Anthony enabling 2-step verification, then
   console.cloud.google OAuth client + Supabase provider toggle
   (ANTHONY_TODO.md).
7. Apple sign-in: needs the $99/yr Apple Developer account. Owner's call.
