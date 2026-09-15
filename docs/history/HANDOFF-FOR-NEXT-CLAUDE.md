# DoUKnowBall handoff brief. Updated 2026-08-20 (UTC). From the session that built rounds 157 to 215.

Read CLAUDE.md, docs/SHIP-PIPELINE.md, docs/PROJECT-STATE.md first, as always. The repo head is
e3e9201 = Round 156, but FIFTY EIGHT ROUNDS ARE PACKAGED AND UNPUSHED: 157 through 214, with 215
in flight. The freshest PROJECT-STATE rides inside ROUND214_FILES.zip. Extract the pending zips onto
your clone IN ORDER before building anything, exactly as the bootstrap section says.

## READ THIS FIRST: where everything physically is, 2026-08-20

Three places, and confusing them is the only way to lose work.

1. **The GitHub repo / Lovable project.** Head is `e3e9201` = **Round 156**. Anthony has never
   pushed since. Lovable project id `c29d224f-a662-4a15-b809-d86fa3b3f0ad`, site
   **douknowball.com**. Everything from 157 on is NOT live.

2. **Anthony's PC: `C:\Users\antho\ballpark-hero`.** This is the git clone he pushes from. As of
   2026-08-20 it holds **ROUND157 through ROUND214 zips, RUN157 through RUN214 bats, and SHIP
   wrappers up to SHIP72**, all md5-verified against the sandbox copies. Rounds 207-214 were
   written on 2026-08-20 the moment the device bridge came back after a long outage; before that
   they existed ONLY in a cloud sandbox. Newest ship log on disk is `ship_log15.txt`, which means
   **he has still never clicked a SHIP bat for anything past Round 156.**

3. **The cloud sandbox** (`/home/user/ballpark-hero` = the working clone, `/home/claude/pkg` = the
   packaging folder). EPHEMERAL. The working clone carries rounds 157-215 as ~347 uncommitted
   modified files on top of e3e9201. If the sandbox dies, only what is on his PC survives. This is
   why every round ships as a zip + bat pair to his disk on the same day it is built.

**THE ONE ACTION THAT UNBLOCKS EVERYTHING:** Anthony double-clicks `SHIP72.bat` in
`C:\Users\antho\ballpark-hero`. It runs RUN157 through RUN214 in order, each bat self-skipping and
chain-guarded, logging to `ship_log72.txt`. Then he pushes. Then `deploy_project` publishes. Until
he does that, 58 rounds of work are sitting on his hard drive and nothing is live.

## What is pending, one line each

- 157: Quick Sim, the Match Centre (form, head to head, engine odds), full match stats and
  ratings on the report, header counting fixed for Club Manager, scorer minutes now respect
  the halftime scoreboard.
- 158: Watch Live, the animated 2D match viewer (his "little circles" ask) with the dressing
  room embedded at the break, PLUS the month calendar with training cones and long fast
  forward. One round because they share files.
- 159: the fix pack off his screenshots: ceiling can never sit below the overall, real Retire
  and New Career buttons, slalom stopwatch, keeper Shot Stopping drill, Passing Gates drill,
  true header centering at desktop, Soccer Career records a play every season.
- 160: create-a-club depth: quality slider (up to a team of 90s), football identity, stadium
  size, plus a latent Round 154 wrong-league board label bug its harness caught.
- 161: structured transfer deals (add-ons that come due, sell-on clauses that collect,
  part-exchange players) and deep market filters (exact positions, age, price, league, sorts).
- 162: Stadium Tycoon goes massive, his direct ask: ten divisions climbed by home wins (exact
  multipliers to x5.5, promotion bonuses, harder opposition per stage), an eight tier staff
  payroll, the catchable golden whistle (five weighted prizes, no stacking, no offline leak),
  47 badges at a permanent 2 percent each, two drawers, help and SEO copy rewritten truthful.
- 163: league views, CM-9: pre-season alphabetical tables starred for all FIFTEEN leagues,
  flags on every league chip, all eight UCL groups simulated in lockstep, a projected
  quarter-final bracket, and the knockout draw seeded from the real group winners.
- 164: the stats centre, CM-11: per-competition team record, leader cards, full sortable
  player lines, engine per-comp splits that cannot disagree with season totals, and the
  14-vs-15 league count fix. NOTE: the 164 zip was REBUILT late on 2026-08-18 (a harness
  assertion about penalty shootout scores was wrong and got tightened); the copy on disk is
  the good one.
- 165: award races, CM-12: golden boot board, one-formula player of the season watch,
  Ballon d'Or watch, all three named in the season review, era aware, race provably bounded
  by the simulated tables.
- 166: era legends rate like legends (CM-5 rating half): prime Messi and Ronaldo at 97 over
  the modern best of 94, monotone load-time uplift, stature and 2010 values untouched,
  ageing ceiling follows the anchor. simEra2010 asserts identity THROUGH the uplift now.
- 167: The Ticker (S-2): the site's own scrolling wire on every screen, personal save
  lines, daily rotation, live registry counts, hostile-save-proof.
- 168: mid-season approaches (CM-10): hot managers get called, summer pre-agreements with
  real costs, honored or publicly withdrawn at season end, era aware.
- 169: the match report catches his five newest screenshots: named assists (credited at the
  same instant as the season stat so they can never disagree), sub arrows, stoppage time per
  half, a venue and crowd line with honest capacity rules (real grounds get NO invented
  capacity), and the momentum strip redrawn as the continuous "Balance of play" area chart.
- 170: pre-AdSense site health: the FULL route sweep on the future site, 119 routes x 3
  viewports = 357 checks, ZERO findings. Plus sweepGames grew OFFLINE=1 for sandboxes with no
  Supabase route, and Dart Draft stopped failing silently on an empty pool (says so now).
- 171: the finance layer (CM-8): every home crowd pays a gate into the kitty (attendance x a
  stature-scaled spend), a Finances desk (books, ticket policy with BOTH directions of the
  trade-off harness-guarded, three ground expansions the board loves), expansions belong to
  the club not the manager, era money runs smaller. simFinance is harness 53.
- 172: era starts for NFL and NBA My Career (his "add eras to nfl and nba and eveyr sport"):
  the 2005 NFL (32 franchises, Raiders in Oakland, Chargers in San Diego, Rams in St. Louis,
  Washington by city alone, verified on Wikipedia + Pro Football Reference) and the 29 team
  2003-04 NBA (SuperSonics, New Jersey Nets, New Orleans Hornets, no Charlotte, verified on
  Wikipedia + Basketball Reference). Era careers never leave their world: draft, free agency,
  trades, life sim rivals, the corruption arc all read the era pool. Era money at documented
  scale (0.32 / 0.31 from the verified caps, comments only). simSportEras is harness 54.
- 173: era starts for NHL and MLB, completing "every sport": the 30 team 2006-07 NHL (Thrashers
  in Atlanta, Coyotes in Phoenix, no Vegas/Seattle/Winnipeg/Utah, verified on Wikipedia +
  Hockey Reference; 2006-07 chosen over 2005-06 because Anaheim had renamed to plain Ducks by
  then) and the 2004 MLB (the Expos' last Montreal summer, Anaheim Angels, Florida Marlins,
  Devil Rays, Oakland Athletics, Cleveland under its 2004 name with the reasoning in the code
  comment, verified on Wikipedia + Baseball Reference). Era money 0.42 / 0.43 from documented
  figures. simSportEras now runs 9 sections over all four sports. Also a simApproaches deflake
  its suite run caught: the struggler control now clears approaches earned in its undoctored
  setup weeks before counting.
- 174: the era words. All four sports' SEO copy and FAQs teach the throwbacks with the
  verified franchise facts, and the pass swept out stale copy it surfaced: the NFL page's
  3-position claim (8 since Round 56), the NBA page's G/F/C claim (5 real positions), and
  leftover duplicate create steps in the hockey and baseball howToPlay lists.
- 175: the Leicester season. Club Manager's third era tile, 2015-16, baked by the 2010
  recipe: 767 real year-2015 players, 40 clubs, 56 window corrections every one verified
  against the table's own year-2016 rows (Sterling and De Bruyne to City, Pedro to Chelsea,
  Kante and Okazaki to Leicester, Di Maria and Xavi and Gerrard out). Era uplift measured at
  pivot 80 gain 0.6 (Messi and Ronaldo 98 over the modern best 94), pre-title Leicester
  honest below the pivot. Wes Morgan has NO 2015 row so the captain is absent, documented,
  never invented. simEra2015 (harness 55) + the playEra2015 browser walk (23 checks). Plus a
  simUsCoaching deflake (offer-count sample 300 to 1500, measurement in the comment).
- 176: the 2005-06 era, completing CM-5 to the data floor. Ronaldinho's season: 747 real
  year-2005 players, 26 two-way-verified corrections (Owen to Newcastle with Bellamy, Jenas
  and Kluivert out; Ramos to Madrid; the Liverpool rebuild; Essien; Vieira and Figo gone).
  Period vocabulary via the new uelName field: 2005 boards demand the UEFA CUP, provably
  never Europa or Conference. Steepest measured uplift (pivot 80 gain 1.67, Ronaldinho and
  Henry 96 over modern 94, teenage Messi honest at 73). Cadiz (ONE real row) and Alaves
  declared partial. simEra2005 (harness 56, four-world isolation matrix) + playEra2005
  (25 checks). There is NO honest 2000 era and the picker footnote says so.
- 177: Austria and Greece join Club Manager (CM-6 wave 3 first pair): 24 verified clubs, 105
  baked players, 16 supersession moves the Ozcan check caught (Jovic to AEK, Dessers to
  Panathinaikos, all real summer 2026 transfers), 17 stale drops. World now 296 clubs across
  17 leagues, 3,456 players, copy caught up. Czechia PARKED deliberately: the Karvina
  match-fixing fallout leaves the 2026-27 Chance Liga lineup unverifiable for now.
- 178: the other dressing room gets rated, closing his five match-app screenshots completely:
  a full opposition ratings sheet built from the opponent's own era-aware projected roster
  (scorers provably on the pitch first, full-eleven-or-nothing so thin clubs get honest
  absence instead of an invented XI, MADE UP tags carried through), our top three and their
  top three side by side on the report, the full opposition XI under the ratings toggle, and
  possession plus shots (on target) now riding on the Balance of play chart itself.
  simMatchDetail grew section 6 (twelve league sheets end to end plus the Lustenau
  honest-absence control). ALSO permanently retires the suite's one recurring statistical
  tail: simOpposition's league-balance tolerance was arithmetically doomed at 1.5 (its own
  accepted true effect 0.8 + error bar 1.0 = 1.8), re-derived honestly to 2.0 with the full
  derivation in the comment. If simOpposition fails NOW it is worth a real look.
- 179: free agency stops being a coin flip in all four US career games (S-5 parity opens with
  the market and the talks): an expired deal now opens a window of competing offers from named
  era-aware franchises, each with its own salary, length and roster quality, and the signed
  offer's quality becomes the exact teamQuality the sim runs on. Contenders lowball, rebuilds
  overpay (measured margins in the harness header), one push-for-more per offer with real
  leverage, and two fail-closed never-strand rules (the incumbent never rescinds, the last
  live offer never rescinds). The old two-button 'contract' card left all four event decks,
  and the boards refuse to start a season with no deal. One shared engine
  (usCareerFreeAgency.ts, the usCoachCareer pattern) plus one shared screen. simFreeAgency is
  harness 57; playFreeAgency is the fifth browser walk (26 checks, scoped to [data-fa-window]
  because the ticker legitimately talks about Vegas and signings).
- 180: the owner upstairs in all four Front Office GM games (S-5 boards half): ownership sets
  a mandate from the roster's honest league rank at hire and every offseason, the hub carries
  the mandate card with a 0-100 trust meter and a live on-pace read, season end grades it
  with narrated verdicts (never quoted speech, real owners exist), and zero trust fires you
  and ends the save, the fail state the GM games never had. Fresh GMs survive one bad year,
  never three. Shared engine foOwnerMandate.ts + shared card. simOwnerMandate is harness 58;
  playOwnerMandate is the sixth browser walk (26 checks incl. a manufactured firing that
  survives reload).
- 181: the internal link graph (S-6, timed for the AdSense review): the "More games" block
  became six real tiles driven by a deterministic graph (relatedGames.ts): a ring through
  the page's own category, a link into the next category so the WHOLE SITE is one crawlable
  component (BFS-proven from every page), two hash-spread variety picks. Zero orphan pages
  now; the old picker gave most games zero inbound links. simRelatedGames is harness 59;
  playRelatedGames is the seventh browser walk.
- 182: the depth chart in NFL and NBA My Career (S-5 roles half, first pair): draft capital
  or beat the incumbent to start, camp battles every offseason with hysteresis both ways,
  backup seasons are spot duty that drain morale and fame, free agency re-evaluates the role
  in the new locker room (contender money can cost a mid player the job), NBA Sixth Man goes
  to real bench seasons. Absent role = starter byte for byte (proven), so old saves and
  harness paths untouched. simDepthChart is harness 60; playDepthChart is the eighth walk.
  NHL and MLB get the same treatment next, the recipe transfers directly.
- 183: the depth chart reaches NHL and MLB, completing the roles half across all four career
  games, with the sport truths kept: rookie goalies ALWAYS apprentice (no draft-capital
  crease), backup goalies get twenty-odd starts, fourth lines get half the ice, bench bats
  get half the games, long relief gets spot starts, and relievers are EXEMPT because the
  bullpen ladder is the closer archetype (proven byte-for-byte under a forced flag).
  simDepthChart now covers all four sports; playDepthChart walks all four hubs (15 checks).
  Of the five named CM systems only PRESS remains on S-5.
- 184: the press room in all four career games, COMPLETING all five named CM parity systems
  (roles, press, talks, market, boards) across every sport: reactive pressers off the
  season's real facts (podium and scrum guaranteed, introduction, role question, trophy
  interview, future question; quiet summers provably quiet), three registers per presser
  with the firebrand genuinely gambling fanbase. Shared engine usCareerPress.ts mapped into
  the event decks, zero new UI. simCareerPress is harness 61; playCareerPress the ninth walk.
- 185: Denmark and Switzerland join Club Manager, the wave-3 second pair by the standing
  recipe: memberships two-source verified (AGF and Thun the reigning champions, Vaduz the
  Liechtenstein guest), 24 clubs baked, 22 new DB name mappings with receipts (the DB spells
  Brøndby with an ö), Horsens and SønderjyskE declared youth-padded, 11 Özcan supersession
  moves and 27 stale-2025 drops, world now 320 clubs / 19 leagues / 16 nations / 3,589
  players, copy caught up including gameRegistry's tile stale since wave one, pins re-pinned,
  a session probe went 30 for 30 through both new pickers (no shipped walk, same as 177).
- 186: the season curtain (S-3 third pass): every played season in the four My Career games
  opens a staged reveal (year slams in, result lands big, a title pours confetti, story
  lines tick in verbatim in engine order) before the crossroads. Shared engine
  usCareerReveal.ts + shared SeasonRevealCard, reveal transient (never persisted). Rules
  pinned in simSeasonReveal (harness 62): confetti ONLY on 'WON THE' (MLB's "Lost the World
  Series" is the trap), banned years muted, lines byte-for-byte the engines' own.
  playSeasonReveal is the tenth walk (19 checks); playCareerPress NEEDED a Continue click
  (the reveal preempts the crossroads) and has it now.
- 187: the verdict curtain (S-3 fourth pass): the four Front Office recaps stage in place
  (champion line slams, verdict lands, playoff rounds tick in, champion GM's card pulses
  gold under confetti; a firing gets one honest shake, never a celebration). stageVerdict
  joins usCareerReveal.ts; simSeasonReveal grew the four-combo truth table (confetti =
  champion AND not fired, the unreachable title-and-fired combo pinned belt-and-braces);
  playOwnerMandate grew two DOM checks (the recap IS the staged card; a fired GM's card
  holds ZERO confetti pieces), 28 for 28.
- 188: the home page tile curtain (S-3 fifth pass, list CLOSED): sections reveal once on
  scroll with a capped stagger, search results stay instant, reduced-motion users get
  everything instantly (proven via computed styles under an emulated reduced-motion
  context), no tile can be left hidden (counted in the DOM after a full scroll).
  playHomeReveal is the eleventh walk (10 for 10). Soccer Career match moments, the last
  name on the S-3 list, was found ALREADY covered by earlier rounds and is documented in
  PROJECT-STATE with line references instead of re-shipped.
- 189: Croatia's SuperSport HNL, the twentieth league, closing CM-6 wave 3 at the
  verifiable floor (330 clubs / 20 leagues / 17 nations / 3,615 players). Membership via
  rezultati.com's live 2026-27 fixtures plus per-leg sources (Vukovar relegated, Rudes
  promoted, Dinamo champions x26). Five Özcan moves (Livakovic and Beljo web-verified
  against the world before trusting the data), eight stale drops, Istra 1961 emptied
  honestly by its own player's move. AND a real engine catch: the ten club league exposed
  the sliding Conference window reaching rank 8 of 10, fixed with a top-half euroFloor in
  leagueDemand (no change in 14-to-20 club leagues), simBoard green after, full suite green
  on the fixed tree. Czechia/Liga MX/Brazil/Argentina are BLOCKED, not pending.
- 191: the Leicester era gets its third league, closing CM-5 COMPLETELY: the 2015-16 Serie A
  (membership two-source verified, Wikipedia season page + worldfootball fixtures) joins that
  era's Premier League and La Liga, 60 clubs and 1,098 real year-2015 players. Built by a new
  --extend-seriea bake mode that treats the SHIPPED file as byte-exact truth for the first
  forty clubs (the original dumps died with their session; re-transcribing is how you corrupt
  a verified world) and the audit proves 766 of 767 shipped player lines survive byte for
  byte, the one casualty a documented name-collision coin flip (Gijon's Carlos Carmona vs
  Atalanta's, higher value wins, logged; four such collisions total). 46 window moves all
  verified against year-2016 rows (Dybala to Juventus, Dzeko/Salah/Szczesny to Roma, Kovacic
  out to Madrid, Inler and Benalouane to LEICESTER), 21 removals of which Pirlo and Eto'o are
  documented SINGLE-SOURCE exceptions (leagues the table does not track; a removal invents
  nothing), 10 arrivals of which five are Round 175 removals RETURNING because Serie A is the
  world they left for (Mandzukic, Khedira, Bacca, Balotelli, Murillo), 1 Shaqiri duplicate
  fold. Nine new namesake pairs verified with b-year receipts (two Dodos, two Edersons, the
  Milan and Valencia Diego Lopezes). Frosinone honestly partial. playEra2015 grew the Italy
  walk (Juventus job taken through the real picker, Dybala present, Vidal honestly gone),
  30 for 30.
- 192: the GM faces the room, S-5 CLOSED COMPLETELY (both optional extensions built): the
  four Front Office games get a press room via one shared engine (foGmPress.ts) and card.
  Season facts pick the presser with strict priority (fired gets NOTHING per the 187
  one-shake rule; podium; scrum on missed or badly; trade question if a headline deal
  headlined a steady year; hiring-day introduction), quiet mandate-met summers PROVABLY
  quiet. Three registers move the Round 180 trust meter (floor 1: the room can bruise you,
  only a graded season can end you) and season-end answers TILT next season's mandate one
  tier via buildOwnerMandate's new optional tilt param (champion floor survives a temper;
  tilt 0 proven byte-identical to pre-192 for every rank in every league). Headline deal
  remembered from both trade paths; presser transient like talks, an ANSWERED tilt
  persists; the recap draft button waits for the room. simGmPress is harness 64;
  playGmPress the twelfth walk, 30 for 30 (Trust 60 to 63 read off the owner card, the
  doomed-season scrum, the softer-bar feed line after the draft, no resurrection on
  reload). ALSO: the state doc's round stamps for 185-191 were corrected to true
  2026-08-19 UTC times (the prior session's clock had drifted a day ahead), and the
  AdSense one-shot is THURSDAY 2026-08-20 14:00Z per the actual scheduled task.
- 193: release clauses on YOUR OWN renewals (CM-7's open line) and an ugly find fixed: the
  contracts desk (ContractsCard) was built in Round 105 and NEVER MOUNTED, renewals were
  unreachable for 88 rounds. It lives on the Squad tab now. Every renewal offers the plain
  deal or 88 percent of the wage with a clause at 1.5x sell value TODAY (bottom of Round
  71's buy-side range). The clause LIVES: bargain-scaled trigger rates (measured 7.5 / 39.5
  / 74.3 percent at ratios 0.67 / 1.0 / 1.5), a met clause cannot be rejected and block
  cannot kill it, an unanswered one executes itself on deadline day through the real
  acceptBid path (squad floor the one honest stop, it makes the news), a plain renewal
  deletes the clause. Granted-clauses ledger with bargain warnings on the desk. What's New
  confesses the mount bug plainly. simReleaseClause is harness 65; playReleaseClause the
  thirteenth walk, 15 for 15 (the modern club tile reads "Newcastle" not "Newcastle
  United"). simContracts/simTransfers/simDealDepth/simClubManager and the full
  playClubManager season walk rerun green.
- 194: the nationality filter, CM-7's LAST line, so his Club Manager list is now closed in
  full. playerNationalities.ts: one map per sealed world (6,262 of 6,262 world names, 132
  nations, 13 new FLAG_CODES), baked by bakeNationalities.mjs from player_market_values in
  twelve batched per-world year-window MCP queries (provenance in its header) because A
  NAME IS NOT A PERSON: the 2010 Aaron Ramsey is Welsh, the modern one English, and both
  pins live in the harness. Two receipts: Lucas Silva pinned Portugal (Round 185 Soccerway
  receipt), Tonali gap-filled Italy (his rows stop at 2022, all say Italy). Market grew
  the nationality dropdown (world-local nations, live counts, data-nat-filter) and flags
  on market and squad rows (SquadScreen takes eraId; made-up players honestly flagless).
  simNationalities is harness 66; playNationalities the fourteenth walk, 17 for 17,
  including reading Wales off the 2010 Ramsey's rendered flag (the hub tab is labeled
  Market, not Transfers). playReleaseClause and playEra2010 reran green.
- 195: per-session play marks, S-1 CLOSED IN FULL. The nine games that only ever counted at
  their natural end points now count the moment you play: the four FO boards mark every
  played week/round unscored, the four My Career boards mark every played season unscored
  (top of the play fn AFTER the null guard, so loading/creating never counts), and Stadium
  Tycoon marks once per sitting via sessionMarkedRef on the first doBuy/doHire/doTap (a
  ref, never state). Scored path (useGameCompletion) untouched in all eight boards; the
  idle game never sends a score. simSessionMarks is harness 67 (static guard, the
  simNoRivalNames tradition: exact unscored call per board in place, no direct scored
  call, legacy retained, tycoon guard-latch-mark order, paths are real routes, 157/159
  precedents pinned). playSessionMarks is the fifteenth walk, 17 for 17, and its method
  matters: page.route intercepts game_completions and COUNTS POST BODIES (zero on load,
  one per FO week and two after two, one per tycoon sitting across three taps plus one
  more only after reload, one per career season, all scoreless with handles). FO hub
  catch: the play button lives on the This week tab. playGmPress, playOwnerMandate,
  playDepthChart, playFreeAgency reran green over the touched boards.

- 196: the LEGACY BOARDROOM in Stadium Tycoon (his standing "keep going" on the idle game),
  the prestige shop the game was missing. A sale pays 1 + divisionIndex read BEFORE the
  reset, so cashing out at the bar pays 1 and a Summit sale pays 10, and the sell-up button
  quotes both that and what one more division would pay: the decision IS the feature. Eight
  capped perks totalling exactly 100 points (sway 5x+10% income, rolling 3 seed-money tiers,
  roots 3x+15% fan growth, payroll 3x+20% staff, shield 1 halving a streak DOWN on a loss,
  away 2 tiers to 80%/12h, voltage 2 tiers 480/420/360s hype charge, charm 2x+25% on timed
  whistles only). Perks and points survive every sale. Fail-closed load plus a ONE-TIME
  migration granting 1 point per existing star, latched on legacySeeded read off the RAW
  save. simStadiumTycoon section 13 measures every effect at its cap; playLegacy is the
  sixteenth walk, 19 for 19, and its trick matters: the tycoon saves on every pagehide, so
  the walk shares one context, CLOSES the game page, edits the save from /robots.txt where
  the app does not run, then reopens. ALSO: pkg/verifybat.py's baseline rule was wrong (it
  compared against the previous round's zip, so a file that skips rounds looked vacuous);
  it now uses the newest pending zip that contains the file, refuses absence checks on
  first-time files, and 193 to 196 all re-verify BAD: 0.

- 197: THE ACTUAL STARTING ELEVEN on Soccer Career's national team screen (his 2026-08-19
  screenshot: "I do not like this score thing"). SquadCall gained xi, built from the SAME
  rivals pool the rank was measured against so the sheet can never contradict the rank;
  4-3-3, he takes the shirt his position names, a CAM keeps its label; called-but-outside
  names the man ahead of him; not called still renders the eleven. The rank/places/score
  grid is gone. THE FIND: the career engine's old GEN_ name banks could produce 76 real
  footballers' exact names (Salah, Osimhen, Lautaro...) and the rivalry banks 4 more, so
  an invented man could wear a real person's name. Both now draw from src/lib/intlNames.ts
  (34 traditions, 146 nations mapped, 4,896 names) and the whole space is enumerated
  against all 5,622 real names plus the engine's real contenders: zero collisions. The
  unguarded banks were DELETED and a static guard stops them returning. simStartingXi is
  harness 68; playStartingXi the 17th walk, 22 for 22.
- 198: THE INDEXING PASS (his "make sure every page is good to be indexed"), read as: every
  live route either earns a result AND is reachable, or says noindex. Five orphaned retired
  games are noindex,follow now; /profile, /reset-password and both admin screens were
  indexable or headless and are closed; robots.txt had TWO wildcard groups, collapsed to
  one with the admin disallow inside; /college (a real hub, unreachable and unlisted) is in
  the sitemap and linked from the home page; the home canonical's trailing slash now
  matches the sitemap. THE ONE TO REMEMBER: GameSeoContent printed an h1 and so do most
  game pages, so ~40 shipped two. Demoting it everywhere WAS TRIED AND WAS WORSE, caught by
  a browser sweep before packaging: 82 of the 119 pages carrying that block have no
  headline of their own and would have had ZERO h1s. Shipped answer is a pageHasOwnH1 prop
  (110 pages pass it) and simIndexing section 6 recomputes the truth two hops deep (literal
  h1, or GameShell handed a title, SEO components excluded) and fails on disagreement in
  either direction. Chasing it also found /transfer-path and /shirt-number rendering the
  whole SEO block TWICE (page + board), duplicating the guide and its FAQ JSON-LD; board
  copies deleted, guarded. PageSeo gained noindex (noindex,follow, keeps the canonical,
  drops the Game structured data). simIndexing is harness 69; playIndexing the 18th walk,
  reading the RENDERED head. playGames' grammar rule had a false positive ("the man ahead
  of you is...") now cleared by a preposition lookbehind.

- 199: the invented-name rule finished across ALL TEN generators (197 fixed two), plus a
  roadmap audit. simInventedNames (harness 70) harvests ~8,661 real names from src/data and
  the four sealed worlds, multiplies out every bank, and fails on collision. Four more real
  people found: the youth academy could produce Noah Okafor and Diego Costa, nhlFrontOffice
  could produce Ilya Sorokin, and 197's own southernAfrica pool could produce Themba Zwane
  (only the WIDER harvest sees it). Four generators had nobody checking them and are
  registered; section 4 fails on any unregistered bank-shaped const in src/lib. THE SUBTLE
  ONE: clubManagerEras guards ITSELF at runtime against CM rosters, so its raw cross-product
  legitimately contains collisions it can never emit and a naive static check is wrong
  there; the harness exercises it (20,000 rolls) AND reconciles statically, which found five
  names real ELSEWHERE on the site that its roster-only guard cannot see, now listed in
  ALSO_REAL_ELSEWHERE and recomputed by the harness. ALSO: the "standing large items" list
  in PROJECT-STATE was audited against live code and rewritten. Most of it was false:
  TACTICS DRAG (listed as "asked for twice and still not done") ships and works; the league
  count said 10/186 against a real 20/330; ticker, internal links, profile, trade finders,
  academy, scouts, facilities, calendar and match animation were all listed open and all
  exist. Genuinely open now: sponsors in CM, national team football in CM, the
  sacked-manager unemployed state, WebKit QA, the sitewide tile reformat, competitor depth.

- 200: SPONSORS in Club Manager, the last unbuilt line of his epic (the 199 audit named it).
  Three SHAPES, not three numbers: safe (most guaranteed, 2 seasons), performance (0.72x plus
  a title bonus 0.9x base), long (0.6x, top-half bonus, 4 seasons). Base scales by stature,
  Europe (x1.35), trophies and era, and the table is deterministic per club+season so a
  reload cannot shop it. signSponsor pays year one immediately; startNextSeason pays the
  bonus for the season just played, takes a year off, pays the next guarantee, ends the deal
  on time; moving club drops it (the club owns it, per the R171 rule). simSponsors is harness
  71 and its METHOD is the transferable bit: a rollover moves lots of unrelated money, so
  every figure is the DIFFERENCE between an identical rollover with the deal and with
  sponsor: null. Section 7 enumerates the 20 invented brands against 40+ real sponsors/kit
  makers/betting firms by substring. playSponsors is the 19th walk, 15 for 15 (reads a fee
  off the card, signs, asserts the kitty rose by exactly that, reloads through Resume Career).

- 201: THE WILDERNESS. Being sacked ENDED the save; now it opens an unemployed state. Offers
  come from the existing manager job market (realJobOffers + generateJobOffers) fed by
  wildernessProfile(), built from what happened: trophies, title finishes as promotions,
  bottom-three finishes as relegations, last club's tier, departure 'relegated' when the last
  finish was 18th+. SeasonRecord holds no leagueName/relegated fields, so those are DERIVED
  from positions and the code says so. Waiting costs: seasonsOut = floor(weeksOut/4), standing
  measured falling 55.6 to 18.1 over twelve weeks. One call a week max, table caps at four,
  the sacking club and prior callers excluded, and a FLOOR job opens at eight weeks with
  nothing on the table (asserted over 30 seeded careers, not hoped for). Accepting runs
  startNextSeason(career, club), so no mid-season takeovers: the honest limit of a
  season-shaped engine. The R200 sponsor correctly does not follow him. simWilderness is
  harness 72; playWilderness the 20th walk, 14 for 14. ITS LESSON: the play loop first used a
  substring union whose "Continue" arm matched the transfer-window BANNER and navigated to
  the market instead of playing; it clicks exact button names now.

- 202: THE INTERNATIONAL JOB in Club Manager (the last big open line from the 199 audit).
  nationStanding() (tier worth + trophies x14 + seasons x3 + win rate x30, threshold 70)
  decides whether the federation calls; the country is the CLUB's country from NATIONS and
  only if soccerInternational has a confederation for it; sealed eras are excluded because
  those worlds are frozen and the engine runs on today's rankings. Summers run at the season
  rollover through a NEW runManagerSummer(nation, year, lift) with form: null, so nothing
  reads player stats for a man who is not playing. The manager's lift (0 to 6) is applied via
  a new overrideNationStrength() so it reaches qualifying, draw AND bracket consistently, and
  is unwound in a finally (asserted before/after, including after a throw). Measured: England
  wins 31 of 120 summers with a maxed manager against 15 with none. A title lands in the
  cabinet with a 🌐 mark; failing to QUALIFY ends the job; stepping down never costs the club.
  simNationJob is harness 73; playNationJob the 21st walk, 15 for 15.

- 203: THE SAFARI PASS. WebKit STILL cannot be installed here (npx playwright install webkit
  fails to download; retried this round), so the browser harnesses stay Chromium and the
  harness says so. THE FIND: minefield.ts built its daily seed as
  new Date(date.toLocaleString('en-US', {timeZone})) and handed a formatted string back to
  the parser. Only ISO 8601 must parse; Safari has historically returned Invalid Date, which
  would make the seed NaN and kill the daily board ON HIS DEVICE. Rewritten with
  formatToParts, proven to give an identical seed (20684 both ways). simSafari is harness 74
  (bans the round trip, spaced date literals, regex LOOKBEHIND in src because it is a PARSE
  error in Safari <16.4 that blanks a whole chunk, five late/missing APIs, hand-written
  100vh; checks the viewport meta allows zoom; asserts it keeps admitting what it cannot
  test). Comments are stripped before scanning or the fix's own explanation trips it.
  playIphone is the 22nd walk: Chromium under the iPhone 13 descriptor over ten pages, zero
  horizontal overflow, the daily board dealing, and no in-page control under 30px, which
  caught the Round 198 College hub link at 16px. Ticker and footer excluded, reason written
  down. SUITE NOTE: the 203 run had ONE tail in unseeded simHalftime (goals-for gap 5.6 vs a
  3-SE bar near 5); three reruns measured 0.0, 0.83 and 0.33. This is the SECOND noise
  failure on that check (Round 127 widened it once). If it goes a third time, raise RUNS or
  seed the arms, do NOT widen the bar again.

- 204: THE TILE REFORMAT REACHES THE FOUR FRONT OFFICES, half of the roadmap's last big
  presentation item. All four GM games opened on the same five word pills (Roster, Free
  agency, Trades, Play, Standings) which told you nothing: you tapped Free agency to learn
  whether anyone worth signing was there. They are now the same five BOXES Club Manager has
  had since Round 74, each carrying the fact you used to tap for, and opening one REPLACES
  the grid (the owner's no-scroll rule). ONE engine (src/lib/foHub.ts) decides what every box
  says, ONE component (front-office-shared/FoHubTiles.tsx) draws it, so the next family costs
  a facts object rather than a rewrite. Sport neutral by construction; hasFixtures is a real
  field because only the NFL board holds a true schedule and without it the other three would
  claim a bye week every round. Four accent rules, each a decision waiting. simFoHub is
  harness 75 (14 save states, no blanks/holes, no headline over 22 chars which CAUGHT "at
  Tennessee Titans", both directions of every accent, a static check that all four boards are
  converted, and 17 weeks of a real simulated season). playFoHub is the 23rd walk: four
  desks, every box opened and checked against a string only its panel contains, the grid
  proven replaced, the back control measured at 34px, and the boxes proven LIVE by doctoring
  a save to injure the best man. The four existing FO walks still pass: the box titles were
  kept as the exact strings they tap.

- 205: THE MATCH TIMELINE STOPS CONTRADICTING THE MATCH. FOUND BY THE SUITE: the 204 run
  failed once in simMatchDetail on an assist that did not match its own goal, and the cause
  was real, not noise. Goal minutes were independent ri() draws from a 45 minute window, so
  two goals by the same man could share a tick and the timeline printed "18' Bellingham
  (assist: Mbappe)" above "18' Bellingham (assist: Asencio)". Fixed with ONE minute book per
  match (distinctMinutes), shared by both sides and the live viewer's preset first half. A
  wider probe of the same timeline then found three more: (a) TWO YELLOWS AND NO RED in about
  ONE MATCH IN TEN, now a second-yellow dismissal with the 1 match ban and no further part in
  the game; (b) a STRAIGHT red to a man already booked, which reads as a second yellow but
  was reported and punished as a straight one, now impossible; (c) a man limping off in the
  33rd and scoring in the 88th, about 1 in 50, now impossible because exit events never
  precede that man's last goal (the EXIT moves, never the goal). BALANCE MEASURED:
  SECOND_YELLOW_CHANCE = 0.25 and the straight red rate 0.08 -> 0.06, so over 2,100 matches
  8.7 percent end a man short against 8.0 before. simMatchDetail grew section 7 (240 matches,
  8 careers, both play paths, banded rates) and its assist lookup was made EXACT. No new
  browser walk: no new rendering surface, so a static render guard sits in the harness
  instead. playClubManager replayed a full season through the changed engine, 0 findings.

- 206: TWO MEN, ONE NAME. Found by a probe walking 56 seasons for numbers that disagree.
  Thin clubs ship a day one squad of 16 academy kids named from 20x20 = 400 combinations, so
  by the birthday problem ABOUT ONE SQUAD IN FIVE had two men with identical names AND
  identical "(Youth)" tags: rows you cannot tell apart. Measured 8/40 at Kifisia, 9/40 at
  Volos before; 0/40 after. Fixed twice: bank widened to 36x36 = 1,296, and uniqueYouthName
  checks every name against a Set of names already on the team, rerolls, and walks the whole
  cross product if a dozen rolls collide, so it can neither fail nor loop. Threaded through
  ALL FOUR kid factories (thin-club padding, summer intake, academy graduates, scouted boys)
  and a scouted boy is checked against the FIRST TEAM too. All 1,296 pairings cleared the
  Round 199 real-name wall. simInventedNames grew section 6 (75 squads, 800 kids, 9 seasons,
  0 shared names, plus source-level guards). NEW HARNESS 76 simBooks pins the invariants
  nothing was watching: every week, my table AND all 19 world leagues AND every UCL group
  must satisfy pts = 3W+D, goals-for = goals-against, wins = losses, draws even, no club
  twice; squad ids unique, no negative tallies, no XI ghost, nobody picked twice; and the
  market never sells you your own man, never double-lists, never re-lists a gone man, with 50
  real signings made to prove buying works. It ends by proving its own sample was real
  football (300 matches, 377 goals, 20 leagues). Everything simBooks checks was ALREADY true:
  it is a fence, not a fix.

- 207: THE EXTENSION TALK, in all four US career games. Round 179 gave them real free agency;
  what none had was the decision BEFORE it. In the final year of a deal the club can table an
  extension: sign at a number usually a little under market, or play the year out and reach
  the open market, which pays better on average and can go badly wrong. One engine
  (usCareerExtension.ts) and one card (us-career/ExtensionCard.tsx); each sport wrapper feeds
  its own market number, accolades, salary floor and cliff age. extensionLeverage =
  skill*0.85 + fame - decline; under 0.18 they DO NOT OFFER and the screen says so. One push,
  the trade-talks rule: leverage finds money, no leverage can PULL the offer. Fail-closed: the
  worst case is a summer on the market, never a stuck career. The extension gate sits ABOVE
  the FA gate in all four boards and 'extension' is never persisted as a phase. MEASURED: 600
  offers average 93 percent of market, a 90-rated 25yo improves 100 percent of pushes, a
  79-rated 30yo loses the offer ~32 percent of the time, nobody past the cliff gets more than
  2 years. simExtension is harness 77; playExtension is the 24th walk (all four games, then
  push/sign/decline each walked to the save; `data-ext-salary` marks the offer field because
  the header quotes the MARKET number and a text scrape compared two different fields).
  SUITE NOTE: the 207 run had ONE tail in unseeded simRoles (the benched control read as
  having played; injuries in the XI drag him on, bar is a 0.5 share). Three reruns measured
  0, 0 and 0.2. FIRST failure on that check. If it recurs, seed the arms or lengthen the run;
  do NOT raise the 0.5 bar, the control exists so a bench man reads as a bench man.
  DELIVERY NOTE: the desktop bridge went offline right after packaging, so ROUND207 files
  reached the CONVERSATION but were NOT written to C:\Users\antho\ballpark-hero. Re-commit
  them (SendUserFile then device_commit_files) the moment the bridge is back.

- 208: THE TILE REFORMAT IS DONE. The four My Career games join the four front offices and
  Club Manager: NINE games on one box component, now at src/components/hub/HubTiles.tsx
  (front-office-shared/FoHubTiles.tsx stays as a thin door so the FO boards needed no
  touching). Their boxes existed since Round 85 but were labels with a number stapled on.
  Now: the player box NAMES which meter fell through the floor; the money box shows the deal
  and lights in the FINAL YEAR (where Round 207's extension lives) or when upkeep outruns the
  bank; the log box shows the last stat line; news counts what waits. FIFTH BOX IS NEW
  CONTENT: every award has been recorded on the season line since these games were built and
  NOTHING ever read it except a trophy emoji, so three MVPs looked like three good seasons.
  TrophyCase.tsx counts, names and dates every honour, reading the SEASONS not the counters.
  TWO BUGS CAUGHT BY SCREENSHOT, not by tests: the log box read its last season off transient
  React state so a reloaded five season career said "Play one and it goes on the books"; and
  the money box said "final year at Green Bay Packers" and truncated. Both fixed, and
  playCareerHub ALWAYS reloads before reading so the first cannot return. simCareerHub is
  harness 78; playCareerHub is the 25th walk. Roadmap line "sitewide tile reformat" is now
  CLOSED (the Dynasty pair and F1 pair are deliberately excluded: single-screen games with no
  drill-in to convert).
  DELIVERY NOTE: the desktop bridge was still offline, so ROUND207 AND ROUND208 files reached
  the CONVERSATION but were NOT written to C:\Users\antho\ballpark-hero. Re-commit both the
  moment the bridge is back.

- 209: THE WHOLE SITE MEASURED AT PHONE SIZE. sweepPhone (harness 79) opens ALL 132 routes,
  read straight out of App.tsx, at 390x844 with touch and an iOS UA, and measures four faults
  that are invisible on a desktop: sideways scroll, tap targets under 30px, text under 9px,
  and controls OVERLAPPING each other. Zero overflow and zero overlaps sitewide. But 292
  CONTROLS UNDER 30px, concentrated in SHARED pieces: "See all games ->" at 14px on 82 PAGES
  (the control that gets you OUT of a game), the Report chip at 28px on 63, the how-to-play
  trigger at 16px on 24, plus Give up / Skip / Hard mode / mode toggles / bracket sort chips /
  leaderboard tabs / legal-page Back links / Connect 4 team chips. All padded, mostly in the
  shared component. 11 runs of 8px pitch text raised to 9. Final: 132 routes, 0 of all four.
  ONE RULE NARROWED ON PURPOSE: a link inside a sentence is prose, not a control (detected by
  comparing the parent's text length to the link's own), because padding "Privacy Policy" to
  30px mid-paragraph breaks the paragraph to satisfy a rule that was never about it.
  ROUTE=/x sweeps one page. Also closed a stale roadmap line: the "7 times this season" copy
  nit was fixed back in Round 129.
  DELIVERY NOTE: the desktop bridge has been offline since Round 207, so ROUND207 through ROUND210 files reached the CONVERSATION but were NOT written to
  C:\Users\antho\ballpark-hero. Re-commit all four the moment the bridge is back.

- 210: ABOUT A THIRD LESS TO DOWNLOAD ON EVERY GAME PAGE. Nothing measured what a phone
  fetches to play. (1) html2canvas, 47K gz, STATIC import in ShareButtons which is on every
  game page, for one button most players never press: now awaited at press time. (2) THE BIG
  ONE: GameSeoContent imported the MERGED GAME_CONTENT map, every word of prose on the site
  (344K source / 101K gz), so a soccer page downloaded the hockey, college, basketball and
  baseball copy. New src/data/gameContent/loader.ts routes 107 paths to 9 sport files and
  dynamic-imports one (cached, so two soccer games do not refetch). Soccer pages pull 18K
  instead of 101K. SEO risk answered: the site is 100 percent client rendered, so a crawler
  ALREADY ran JS and fetched chunks; playIndexing and simIndexing both rerun green and the
  guides read back off five pages. MEASURED gz JS before/after: club-manager 661/530,
  soccer-career 776/649, stadium-tycoon 320/240, minefield 369/236, nfl-my-career 462/330,
  front-office 388/256. sweepWeight (harness 80) holds every route to a budget and fails in
  BOTH directions: over the ceiling is a regression, under HALF the ceiling means the budget
  is stale and must come down in the round that earned it. It also reconciles PATH_BUNDLE
  against the sport files so an unreachable guide is a failure, not silent fallback copy.
  NOT TAKEN, on purpose: managerJobMarket is 155K gz on soccer-career behind a SYNCHRONOUS
  call in the retirement flow, and the 201K index chunk is mostly the Supabase client that
  AuthProvider needs at first paint. Both need real refactors, not import moves.
  SUITE NOTE: one tail in unseeded simCareerEngaged (honest pros winning the Ballon d'Or 31
  percent against a 30 bar; three reruns gave 13, 9, 18). The band holds only 45 careers so a
  3-sigma tail is reachable. If it recurs RAISE THE CAREER COUNT, never the 30 percent bar.

- 211: THE FOUR GM GAMES GET ROUND 206's RULE. Found by probing the front office engines for
  self-contradictions. Their invented name banks were 10 firsts x 10 surnames = 100 possible
  people, and a new franchise deals FOURTEEN free agents out of that hundred. Measured over
  30 fresh leagues each: the same man twice in 6/30 NFL, 8/30 MLB, 13/30 NBA, 10/30 NHL.
  Banks widened to 28x28 (NFL 34x34) plus src/lib/foNames.ts (leagueNames + uniqueName), the
  same reroll-then-walk guard Round 206 used. WHAT COUNTS AS TAKEN IS WIDER: a GM league is a
  CLOSED WORLD, so a generated free agent is checked against the REAL players on all 32
  rosters too. Threaded through all three invention points per sport (opening FA pool, draft
  class, summer roster fill) AND the four boards' draft calls. After: 0 duplicates in 120
  fresh leagues, 0 across 4 summers each. All new names cleared the Round 199 wall (11,476
  invented names against 8,661 real ones). simInventedNames section 6 now covers the GM games
  and puts a FLOOR under bank sizes. simBooks widened past Club Manager to fence the GM
  leagues: no empty rosters, no shared ids, ratings 1-99, no negative salary or years, ages
  15-50, wins = defeats.
  DELIVERY NOTE: the bridge has been offline since Round 207. ROUND207 through ROUND214 files
  reached the CONVERSATION but were NOT written to C:\Users\antho\ballpark-hero. Re-commit
  all eight the moment it is back.

- 212: THE DAILY PUZZLES WERE NOT DAILY. Found by moving the clock a day at a time through a
  simulated year and writing down what each game dealt, which nobody had ever done. BEFORE:
  Missing XI dealt TWO distinct lineups in 365 days, ONE FOR 243 DAYS RUNNING; its blank had
  6; Sign the Player used ONE formation all year; Pack Battle's first card never moved.
  CAUSE, one mistake in four places: seeding a Lehmer generator with dateSeed(), the date as
  a number, so consecutive days differ by 1. A Lehmer step is (s*16807)%2147483647, so the
  FIRST output is nearly linear in the seed (8 parts in a million per day). Floor that against
  a 20 item pool and the index freezes for tens of thousands of days. It READS as correct.
  FIX: dailyPrngSeed() in dateUtils (FNV + avalanche, returned inside the Lehmer modulus),
  applied to missingXi, rarityRound, packBattle, signThePlayer. `dateSeed % pool.length` is
  UNTOUCHED and stays: it rotates correctly and is only unsafe as a PRNG starting state.
  AFTER: Missing XI 150 distinct lineups (longest run 2 days), blank 192, all 9 formations,
  96 distinct pack openers in 200 days. simDaily (harness 81) drives 9 daily games through
  365 moved clocks (determinism, no board over 3 days, distinct >= half the pool) plus a
  STATIC rule that no file with a Lehmer step may seed one from a raw date. That rule carries
  its OWN CONTROL: it measures the raw seed and fails if the raw seed ever starts scattering.
  Hashed reaches 20/20 buckets in 60 days, raw reaches 1.
  CONTENT NOTE, not a bug: Missing Five/Nine/Eleven and Order the List have pools of 10 to 18
  boards, so they cycle every two or three weeks. Content depth, not seeding.

- 213: TOMORROW'S PUZZLE STOPS BEING TODAY'S PLUS ONE. Round 212 fixed four games FROZEN by a
  bad PRNG seed; the rest had the OPPOSITE problem. Nearly every daily game picked with
  `pool[dateSeed(today) % pool.length]`, which has one good property worth keeping (index +1
  a day, so a pool of 14 shows all 14 before repeating) and one bad one (it is a straight
  line, on every game, forever, next to a leaderboard). NEW dailyIndex(dateStr, poolSize):
  days cut into cycles the length of the pool, each cycle its own full shuffle seeded from
  the cycle number. Coverage kept, predictability gone. SEAM RULE: a cycle that would OPEN on
  the board the last one CLOSED with has its first two entries SWAPPED, not skipped, because
  skipping drops a board and doubles another. 13 games moved onto it including the shared
  useDailyPuzzle hook. Shuffle uses mulberry32, NOT a Lehmer step, for the reason Round 212
  documents. simDaily section 3: 6 pool sizes x 6 cycles, failing on a skipped/doubled board,
  the same board two days running (including across a seam), a sequence still stepping +1
  more than 40 percent of the time, or any of the 13 games reverting.
  ENVIRONMENT NOTE from this round's verification: SUPABASE IS UNREACHABLE FROM THIS SANDBOX
  RIGHT NOW (curl exits 56 to flawuiqbvjobmkfkauhw.supabase.co). Every data-driven board
  (/ball-iq, /jeopardy and friends) shows "couldn't load" and playGames reports them DEAD.
  That is the network, not the code: playGames already documents the ignoreHTTPSErrors story
  for a DIFFERENT sandbox failure, and that flag does not help here. Do not chase it.

- 214: EVERY PUZZLE HAS EXACTLY ONE RIGHT ANSWER, now checked. The puzzle games share one
  failure mode, the worst kind, because the better you know the sport the more likely it
  catches you: a connections board with a man honestly in TWO groups has no right answer; a
  ranking round with two men on the SAME NUMBER has two right orders; a team sheet whose
  blanked man is not on the sheet is unsolvable. Nothing checked any of it across 322 boards,
  14 ranking rounds, 209 team sheets. ALL CLEAN, so simFairPuzzles (harness 82) is a FENCE.
  Also fenced: no two groups sharing a label or difficulty, no board duplicating another in
  its pool, no man twice on a sheet (would give the blank away), every blank candidate really
  on its sheet.
  THE UNCOMFORTABLE HALF: soccer connections has 250 boards, baseball 60, and NBA/NFL/NHL
  FOUR EACH, so those three repeat TWICE A WEEK. GENERATING boards was TRIED AND THROWN AWAY:
  a bake script made 30 per sport from shipped rosters, but "plays for the Clippers" is a
  claim about the world, the roster's accuracy cannot be verified from here, and this project
  does not ship claims it cannot check. Counts recorded as a RATCHET instead: fails if a pool
  SHRINKS and also fails if a pool GROWS without the floor being raised in the same round.
  Thin games are reported loudly but do NOT fail, because a harness that always fails gets
  ignored. NEXT PERSON: hand-writing NBA/NFL/NHL connections boards is a well-defined content
  job with an obvious payoff, and simFairPuzzles will check them the moment they land.

- 215: **IN FLIGHT, NOT PACKAGED. THE READABILITY AND KEYBOARD PASS.** Two things nobody had ever
  measured on this site: can you read it, and can you use it without a mouse. Findings, all
  measured in a real browser across all 132 routes:
  * The muted grey almost every second line on the site is written in measured **4.13:1 on a card
    and 3.57 on the lightest surface**, under the 4.5 normal text needs. Raised
    `--muted-foreground` 50 -> 58 percent (worst case now 4.73).
  * **The primary button was white on the brand green at 2.92:1**, under half of what it needs,
    and worst exactly where this site is played: a phone, outdoors. The brand green is untouched;
    `--primary-foreground` went to the page's own near-black (225 25% 8%), which measures 6.63.
  * `--destructive` was 3.63 on a card, so every "couldn't load" and every validation message on
    the site was under the bar: raised to 65 percent (4.65 worst case) with a near-black
    foreground. `--correct-foreground` was white on the success green at **2.30, the worst pair on
    the site**; now near-black at 8.15. `--warn-foreground` 2.73 -> 6.86.
    `--sidebar-primary-foreground` 2.92 -> 6.41.
  * **Tokens doing two jobs at once.** A fill has to be dark enough for white to read on it and
    ink has to be light enough to read on a card, and one value cannot be both. `--bb-red` was
    ink 17 times and a fill twice; `--wc-green` once each. Split: fills keep the name,
    `--bb-red-ink` / `--wc-green-ink` are new. `--cg-green` is ink only and its real surface is
    the green-tinted header, not the page, where 40 percent measured 3.84: raised to 48.
  * **The World Cup predictor's group colours.** `gc()` derived heading colours by SUBTRACTING
    lightness with no floor, so Group H printed its own title at **1.83:1** and its "Predict
    Scores" line at **1.24:1** - a hue with no word inside it. NEW `src/lib/readableColor.ts`
    (`hslToRgb`, `luminance`, `contrast`, `readableL`, `readableHsl`) keeps hue and saturation and
    raises ONLY lightness until the words clear the bar **against the surface they actually sit
    on** (the heading on the tinted header, the small line on the card). Twelve groups stay twelve
    colours. `hslToRgb` rounds to 8 bits on purpose and `readableHsl` aims at 4.6, because a value
    that clears 4.5 in floating point can land a hair under it once the browser paints it.
  * **52 lines wrote white on a fill too light to carry it** (emerald-500/600, red-500, amber-600,
    green-600, sky-600 and friends: 2.54 to 3.77). Black is the right ink on every one of them
    (5.13 minimum). ~40 more places used `text-neutral-500/600/700`, `text-slate-500`,
    `text-green-700/800` and similar DARK greys as ink on a DARK page (down to 1.71:1); all moved
    to the -400 shade. 42 literal `text-[hsl(h,s%,l%)]` colours in the murky middle raised by
    computation, not by eye.
  * **No page drew a focus ring and no page had a skip link.** `:focus-visible` is now a global
    rule (2px `--ring`, offset 2), plus `.dukb-skip-link` as the first element in `App.tsx`
    pointing at `#dukb-main`, which was added to 34 files' `<main>` plus `Index.tsx`'s wrapper.
    `src/components/ui/sidebar.tsx` was deliberately REVERTED to avoid a duplicate id. The focus
    rule carries `transition-property: none` because most cards on this site have `transition-all`,
    which animated the outline WIDTH and made the ring fade in behind a fast tab. **20 controls
    across 12 files were suppressing the ring with a bare `outline-none` and no replacement**;
    those were stripped (files under `src/components/ui/` left alone on purpose).
  * **Screen readers.** 42 Connect 4 board squares announced as nothing at all (an empty square
    has no text in it) now carry the pair of clues a sighted player reads off the edges of the
    grid. **288 World Cup score inputs had nothing naming them**; each is now "Goals for X against
    Y". The two inputs also had `focus:outline-none`, removed.
  * `scripts/sweepContrast.mjs` is **harness 83**, four sections: contrast on all 132 routes with
    ALPHA COMPOSITING up the tree (a naive check calls `rgba(green,.15)` opaque and reports
    nonsense 1:1 ratios); a keyboard walk that presses Tab (`:focus-visible` deliberately does NOT
    match a programmatic `.focus()`, so a check that focuses in a loop measures nothing) and
    asserts the skip link is stop one, points at `#dukb-main`, is off-screen unfocused, and that
    all 25 stops draw a ring; screen-reader basics on every route; and a SOURCE scan that catches
    all three shapes above before anything renders, carrying its own control so it fails if it
    stops recognising its own example.
  * **Score so far: 76 unreadable runs of text -> 4, then -> 0 pending the last rerun; 7 ringless
    tab stops -> 0; 47 unnamed controls -> 1; 288 unlabelled fields -> 0.**
  * **WHAT IS LEFT ON 215** (see the in-flight section at the bottom of this file).

**SHIP72.bat is the one-click wrapper now: it runs RUN157 through RUN214 in order, logging to
ship_log72.txt.** Anthony has not clicked any SHIP yet (last checked before packaging 178: no
ship_log past 15 exists). A computer-use access request for File Explorer sat unanswered from
~12:20Z and a fresh one was queued at ~16:45Z naming SHIP30; if he approves it, click SHIP72
instead, it covers everything. Any older SHIP wrapper still works followed by the later RUN
bats, and every bat self-skips rounds already in the log. Every bat is fail-closed and
chain-guarded, and every content assertion was tested against the actual zips before delivery.

## After the push lands

Publishing is NOT automatic. Verify Lovable synced (read a Round 173 file back out of it, for
example the NHL_TEAMS_2006 block in src/lib/nhlMyCareer.ts, which exists in no earlier commit),
call deploy_project on c29d224f-a662-4a15-b809-d86fa3b3f0ad, wait, then verify live with a
cache-busted fetch.

## Verification state at packaging time

tsc zero, build clean, ALL 62 node harnesses green in ONE suite run on the final (186) tree,
including simEra2015 with its new namesake allowlist and both former tail-readers
(simAwardRaces, simRoles) clean. History for context: the 185 suite's one red was simEra2015
correctly flagging the new Luzern Lucas Silva against Real Madrid's 2015 Brazilian, verified
as genuine namesakes (Luzern's is Lucas Manuel Silva Ferreira, b. 2006, Portuguese, per
Soccerway and the club's July 2026 extension news) and allowlisted with the receipt in the
harness comment. Treat single reads in simAwardRaces and simRoles as noise per the
simOpposition lesson; if either RECURS, re-derive its margin instead of nudging.
simOpposition itself at its re-derived 2.0 tolerance has passed clean six suite runs
straight. Browser group is 16 files: playSeasonReveal went 19 for 19, playCareerPress 9 for
9 with its new Continue click, playOwnerMandate 28 for 28 with its two new verdict-card DOM
checks against the 187 build, playDepthChart and playFreeAgency rerun green against the 186
build. The 187 suite run: ALL 62 node harnesses green. The 188 suite run: 61 green plus a single
tail in UNSEEDED simFinance (fair-vs-premium crowds over ten unseeded games briefly
inverted), five straight reruns green, first tail that harness has ever thrown; if it
RECURS, widen the sample or seed the streams, do NOT nudge the 1.06 bar, both directions of
that trade-off are load-bearing. playHomeReveal went 10 for 10 and simMobileChrome reran
green against the 188 build. The 189 suite: first run 61 green plus simBoard's REAL catch
(the ten club league reached the Conference window at rank 8 of 10), fixed with euroFloor
in leagueDemand, then ALL 62 green on the fixed tree in one run. The 190 suite: 62 green
plus the recurring simFinance tail, now PROPERLY fixed (40-gate sample, re-derived 1.04
bar, arithmetic in the comment, five straight greens); engine files were final before that
suite ran, and the copy guards plus simTradeTalks reran green standalone on the final tree.
The 191 suite: ALL 63 node harnesses green in ONE run on the final tree (simTradeTalks is
63; simEra2015 with its nine new namesake receipts and the three-league pins among them),
and playEra2015 went 30 for 30 with its new Italy walk against the 191 build. The 192
suite: 63 of 64 green (simGmPress is 64) plus a single DOWNSIDE tail in UNSEEDED
simOpposition's goals-effect check, its FIRST ever: rise measured 0.24 against the 0.29
one-bar margin where the documented true effect is 0.96, and the standalone rerun measured
a healthy 1.30. If it RECURS, widen RUNS or seed the two arms, do NOT lower the one-bar
margin, the check's own header derives why one bar is the honest floor. playGmPress went
30 for 30 and playOwnerMandate plus playTradeTalks reran green against the 192 build.
The 193 suite: ALL 65 node harnesses green in ONE run (simReleaseClause is 65), including
simOpposition healthy at a 747s full read, so the 192 tail stayed a one-off exactly as
diagnosed. playReleaseClause went 15 for 15 against the final build and playClubManager
played a full season through the changed Squad tab, 0 findings. The 194 suite: ALL 66
green in ONE run (simNationalities is 66; simOpposition healthy again at 761s).
playNationalities went 17 for 17 against the final build. The 195 suite: 66 of 67 green in
ONE run (simSessionMarks is 67, 0.1s) plus a FIRST-EVER tail in UNSEEDED simInternational:
its career batch honestly drew ZERO World Cup winners, so the winner-vs-capped legacy
comparison failed for want of a cohort, and the standalone rerun drew 7 winners against 40
capped players and passed everything. Round 195 touches nothing simInternational reads. If
it RECURS, top up the career batch until both cohorts are non-empty, do NOT weaken the
comparison: the check is about the legacy formula, not winner frequency. playSessionMarks
went 17 for 17 and playGmPress, playOwnerMandate, playDepthChart and playFreeAgency reran
green against the 195 build. Browser group is 21 files now.
Watch list now: simAwardRaces and simRoles remain single-tail-then-green cases; simFinance
is re-derived and should not tail again, if it does the attendance MODEL changed, look
there. simApproaches' one real flake was fixed in 173. Pre-ship catch worth
knowing: simNoRivalNames caught a rival product name in a Round 181 code comment before
packaging; the guard scans comments too, write accordingly.

## His feedback queue

The full triage lives in PROJECT-STATE (inside the 184 zip): the fourth-message section, the
eras-for-every-sport section (DONE across all four sports), CM-1 through CM-12 and S-1 through
S-6. CM-5 is FULLY CLOSED (166 legends, 175 the 2015-16 era, 176 the 2005-06 era, 191 the
Serie A third league; "more era leagues" is DONE, further ones only if he asks, and the
2010/2005 eras need density measurements before a third league each). CM-6 wave 3 has
shipped two pairs (177 Austria and Greece, 185 Denmark and Switzerland); the rest wait on
data or memberships. The five FotMob match-app
screenshots are now FULLY closed (169 + 178). The era words round is DONE (174). S-5 parity
is COMPLETE: 179 the market and talks, 180 the boards, 182+183 the roles, 184 the press,
across all four sports. ALL FIVE NAMED CM SYSTEMS ARE LIVE EVERYWHERE. S-6 internal links
are DONE (181). Optional extensions if ever wanted: GM-side press, trade negotiation beyond
accept/reject in the GM engines. S-3 is CLOSED as of 188 (career curtain 186,
GM verdict 187, home tile curtain 188, Soccer Career moments verified already-covered).
CM-6 wave 3 CLOSED at the verifiable floor (189 Croatia was the last candidate; Czechia
still parked on the Karvina fallout, Liga MX on the split-season shape, Brazil/Argentina on
calendar shape, all BLOCKED not pending). S-5 CLOSED COMPLETELY as of 192 (GM-side press
was the last named extension). CM-7 FULLY CLOSED (193 release clauses with
the contracts-desk mount fix, 194 the nationality filter). HIS CLUB MANAGER LIST IS NOW
CLOSED IN FULL, every numbered item. S-1 CLOSED IN FULL as of 195 (per-session marks for
the four US careers, the four GM games and Stadium Tycoon; 157 + 159 + 195 together).
EVERY numbered line from his older lists is closed, and 196 built the idle game's prestige
layer. NEW FEEDBACK 2026-08-19 afternoon (one screenshot of Soccer Career's national team
screen), triaged at the TOP of PROJECT-STATE: (a) the starting eleven = DONE in Round 197; (b) "make sure every page is
good to be indexed" = DONE in Round 198; (c) "u have full control so y are u asking for
permission so often" = STANDING: do not ask, ship. His whole list is closed again; the
open queue is his standing "keep going".

Search Console (his three shots): the 3 "Page with redirect" validation failures are 301s
working as designed and will never validate, the sitemap has been clean since Round 148, and
indexed is climbing (41). No code change needed; he has been told once, do not re-alarm him.

## ROUND 215: EXACT IN-FLIGHT STATE, AND HOW TO FINISH IT

Everything below is UNCOMMITTED in the sandbox working clone. tsc is zero and the build is clean
as of the last edit. Nothing is packaged.

**Files changed (all edits done, all verified compiling):**

- `src/index.css`: `--primary-foreground`, `--muted-foreground`, `--destructive`,
  `--destructive-foreground`, `--correct-foreground`, `--warn-foreground`,
  `--sidebar-primary-foreground`, `--cg-green`, `--wc-green` (now a FILL at 31 percent), NEW
  `--wc-green-ink` and `--bb-red-ink`; the `:focus-visible` block; the `.dukb-skip-link` block.
- `src/lib/readableColor.ts`: NEW.
- `src/App.tsx`: skip link is the first element in the tree.
- 34 files plus `src/pages/Index.tsx`: `id="dukb-main"`.
- `src/pages/WorldCupPredictor.tsx`: `gc()` rewritten on `readableHsl`, both score inputs given
  `aria-label` and their `focus:outline-none` removed.
- `src/components/football-connect4/FootballConnect4Board.tsx`: cell `aria-label`.
- `src/components/club-manager/LiveSimScreen.tsx`, `src/pages/StadiumTycoon.tsx`,
  `src/pages/Teammates.tsx`: hand fixes named in the 215 entry above.
- ~30 more files touched by the mechanical sweeps (white-on-light-fill, grey-ink, literal-hsl,
  outline-none). `git status --porcelain` is the authority.
- `scripts/sweepContrast.mjs`: NEW, harness 83, with section 4 and the 140ms tab settle.

**The four things still open, in order:**

1. **One nameless control left**, on `/guess-the-college`: a `<button class="inline-flex ...">`
   whose whole body is an `<svg>`, sitting in a `text-center mb-6 md:mb-8` block. It needs an
   `aria-label`. Find it, name it, done. (The harness reported 5 before the last build; 4 of them
   were the same shared component and are now fixed.)
2. **Rerun `scripts/sweepContrast.mjs` to green.** Last run: 6 failures, and every one of them has
   been fixed since; it has NOT been re-run against the current tree. Method:
   `npm run build`, then `(setsid nohup npx -y serve -s dist -l 4173 >/tmp/serve.log 2>&1 </dev/null &)`,
   then `(setsid nohup timeout 1500 node scripts/sweepContrast.mjs > /tmp/c215.log 2>&1 </dev/null &)`
   and poll the log. It takes about 4 minutes. DO NOT run it in the foreground, the tool call
   times out and kills it.
3. **Run the full suite**: `(setsid nohup node scripts/runAllSims.mjs > /tmp/suite215.log 2>&1 </dev/null &)`,
   ~18-20 minutes, output buffered until the end. All 83 harnesses must be green in ONE run.
4. **Package and deliver.** Write `/home/claude/pkg/_commit_msg_215.txt` FIRST (mkzip refuses
   without it), add the Round 215 row to `docs/PROJECT-STATE.md`, then
   `python3 pkg/mkzip.py 215 <repo-relative paths...>`,
   `python3 pkg/mkbat.py 215 214` (tab-separated spec on stdin),
   `python3 pkg/verifybat.py 215` which MUST report `BAD: 0`, plus `SHIP73.bat` covering 157-215.
   Then `SendUserFile` all three and `mcp__remote-devices__device_commit_files` them to
   `C:\Users\antho\ballpark-hero`, and md5-verify both sides.

**One judgement call already made, do not redo it:** black ink on light fills, not a darker fill
with white ink. Reason: `text-emerald-950` on `bg-emerald-600` only reaches 4.02, `text-black`
reaches 5.57, and dark ink on a coloured fill is already the site's own choice this round for
`--primary-foreground`. Consistency and margin both point the same way.

## THE SHIP PIPELINE, MECHANICALLY

The cloud session can NEVER push. No credentials, by design. Every round therefore ships as three
artifacts written to Anthony's disk:

- `ROUNDnn_FILES.zip` - the changed files, repo-relative paths inside.
- `RUNnn.bat` - CRLF, self-skipping (checks the ship log), chain-guarded on `nn-1`, fail-closed.
  It extracts the zip, ASSERTS content, `git add`s, and commits with `_commit_msg_nn.txt`.
- `SHIPnn.bat` - a wrapper that runs a contiguous range of RUN bats in order.

Tools in `/home/claude/pkg`:

- `python3 pkg/mkzip.py NN file1 file2 ...` - repo-relative paths. **Requires
  `_commit_msg_NN.txt` to already exist.**
- `python3 pkg/mkbat.py NN PREV` - reads a **TAB-SEPARATED** spec on stdin:
  `P\tpattern\tfile` (pattern must be PRESENT), `A\tpattern\tfile` (pattern must be ABSENT),
  `G\tfile` (git add - **MANDATORY, a bat with no G lines commits nothing**).
- `python3 pkg/verifybat.py NN` - must print `BAD: 0`.

**Three packaging traps that have each cost a round:**

- `printf '%s\n' "P\t..."` does NOT emit real tabs. RUN204 came out with zero assertions and zero
  `git add` lines and would have committed nothing. Feed the spec from a Python heredoc.
- An `A` (absence) pattern must be a string that WAS in the baseline, or verifybat rejects it as
  vacuous. Multi-line patterns do not work with findstr. Use the exact single line removed.
- Absence patterns match as substrings: `Math.random() < 0.08` matched `0.085` elsewhere in the
  file. Use the fuller line.

**Delivery:** `SendUserFile` the artifacts to get `file_uuid`s, then
`mcp__remote-devices__device_commit_files` with absolute Windows paths, then md5-verify BOTH sides
(`mcp__remote-devices__device_bash` sees the folder at `$HOME/mnt/ballpark-hero`). The bridge only
works while his desktop app is open; it was offline for most of 2026-08-19 and came back on
2026-08-20. If it is down, say so once and keep building - do not retry in a loop.

**Publishing is NOT automatic.** After he pushes: verify Lovable synced, call
`mcp__Lovable__deploy_project` on `c29d224f-a662-4a15-b809-d86fa3b3f0ad`, then verify live with a
cache-busted fetch, then tell him one casual line.

## VERIFICATION GATES, EVERY ROUND, NO EXCEPTIONS

1. `node_modules/.bin/tsc --noEmit -p tsconfig.app.json` - zero.
2. `npm run build` - clean.
3. The full suite: `(setsid nohup node scripts/runAllSims.mjs > /tmp/suiteNNN.log 2>&1 </dev/null &)`.
   ~18-20 min, buffered. All harnesses green in ONE run.
4. Any browser walk the round touches, against `npx -y serve -s dist -l 4173`, importing
   `pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js'`.
5. `verifybat.py NN` reports `BAD: 0`.

**Statistical-tail policy.** A single tail in an unseeded harness gets reruns before anyone chases
it. If it RECURS, widen RUNS or seed the arms - do NOT loosen the bar. Every bar in this repo has
its derivation in its own comment. Watch list: `simAwardRaces`, `simRoles`, `simInternational`
(one first-ever tail each, then green). `simOpposition` and `simFinance` were both properly
re-derived and should not tail again; if they do, the underlying MODEL changed, look there.

## HOUSE RULES THAT ARE NOT NEGOTIABLE

- **The screen never lies about anything it cannot check.** This is the oldest rule here. Round 214
  generated 30 connections boards per sport and then DELETED both the generator and its output,
  because "plays for the Clippers" is a claim about the world that could not be verified from the
  sandbox. Thin content was recorded as a ratchet instead. Do the same.
- **Never invent a real person's words, stats, or club.** Generated players are fine and are marked;
  real players in invented shirts are not.
- **No em dashes or en dashes anywhere** - not in code, comments, commit messages, or copy. A
  harness hunts them, and it writes the characters as `/[\u2013\u2014]/` so it cannot flag itself.
- **No rival product names**, including in code comments. `simNoRivalNames` scans comments too.
- **Commit messages are one long casual paragraph**, written for Anthony, explaining what was
  wrong, why it mattered, and what was measured. See `_commit_msg_212.txt` for the shape.

## BROWSER-WALK LESSONS, ALL LEARNED THE HARD WAY

- CSS `uppercase` transforms `innerText`, so match caseless.
- The consent bar ("Essential only") eats the first click on any page. Dismiss it once up front.
- Scope tile clicks to `button:has(div.uppercase)`: owner and press cards quote words like
  "roster" and the walk clicks the wrong thing otherwise.
- `:focus-visible` does NOT match a programmatic `.focus()`. Press Tab.
- Alpha backgrounds must be composited up the tree before any contrast comparison.
- `export * from` in an esbuild entry is HOISTED above the localStorage shim. Use
  `const mod = await import(...); export const engine = mod;`.
- The MLB roster panel says "DFA", not "Cut".
- `playGames.mjs` reports STALL on the FIFA-style tile dashboards (204/208) because clicking the
  Hub tile returns to a screen it has seen and its forward-progress model does not understand
  hub-and-spoke. That is a harness gap, not a product bug. Worth a round.

## KNOWN OPEN LEADS, NOT YET DONE

- **Grid games can deal an impossible cell.** `buildGridPuzzle` in `src/lib/nbaGrid.ts` and its
  siblings pick row and column categories WITHOUT checking that any player satisfies each
  intersection, so a cell can have zero valid answers. Needs Supabase reachable to verify.
- **NBA/NFL/NHL connections have FOUR boards each** against soccer's 250 and baseball's 60, so they
  repeat twice a week. Hand-writing boards is a well-defined content job; `simFairPuzzles` checks
  them the moment they land, and its `FLOOR` must be raised in the same round.
- **Supabase was unreachable from the sandbox** on 2026-08-19 (curl exit 56 to
  `flawuiqbvjobmkfkauhw.supabase.co`), so `/ball-iq` and `/jeopardy` render "couldn't load" and
  playGames calls them DEAD. Environmental, not a regression. Do not chase it.
- **`playGames` hub-tile STALLs**, above.

## HIS STANDING INSTRUCTIONS, VERBATIM

- **"U have full control so y are u asking for permission so often."** Do not ask. Ship. Only stop
  for something genuinely destructive or a real data fork.
- **"keep going and stop stopping. just do a bunch of rounds and implment new things and just keep
  going."**
- **"keep going and create the best website ever."**
- "Make sure every page is good to be indexed" - delivered in Round 198.

His numbered feedback lists (CM-1 to CM-12, S-1 to S-6) are ALL CLOSED. The open queue is the
standing "keep going", which is why rounds are self-directed: audit the site, find the thing that
is actually wrong, fix it, fence it with a harness so it cannot come back.

## Practical notes

- The build-loop cron takes round numbers too. Check the pkg folder for zips above 215 before
  taking 216.
- Click lessons for computer-use shipping are in project memory reference_ship_pipeline.md.
  Access grants lapse; request while he is actively messaging.
- ROUND77 and ROUND87 zips are ancient and unrun: never extract them.
- AdSense review pre-flight fires Thursday 2026-08-20 14:00Z (one-shot scheduled task,
  verified against the live trigger list). Keep polls clean, keep the suite green.
