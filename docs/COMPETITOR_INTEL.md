# Competitor and Video-Format Intelligence for douknowball.com

Date: 2026-07-15. Method: static fetches plus web search only (no JS rendering). Sites that shipped as JS shells are marked; findings for those come from meta tags, search results and coverage. No code was changed for this report.

## PART 1: COMPETITOR TEARDOWNS

### 1. playfootball.games (absorbed missing11.com)
- Games (~19): Box2Box (grid), Missing 11, Who Are Ya (picture guess), Career Path Challenge, Football Wordle, Football Connections, Football Bingo (daily + friend rooms), Tiki-Taka-Toe (PvP tic tac toe with steal mode), Contextinho (semantle-style secret player), GoalLess (Pointless clone, rare answers win), TenaBall (Tenable top-10), Fan Favourites (Family Feud, guess popular answers), Futbol List a, Guess the Football Club (logo), SuperDraft Soccer (lineup builder with remix), Pack 11 (top trumps), plus new bets: Possession Play (1v1 territory), Rondo Ringer (imposter), The Heatmap.
- Daily vs unlimited: daily slate at midnight plus multiplayer rooms and archives. Regional editions (Missing 11 Brazil "Los Titulares", Argentina).
- Retention hooks: a homepage-wide daily tracker: "PLAYED 8/18, W-L record, complete today's quizzes, new quizzes at midnight". Limited-edition World Cup section (WC XI-0, WC Box2Box, WC Bingo, WC Who Are Ya). Discord, TikTok, YouTube, IG funnels. iOS and Android apps for Tiki Taka Toe.
- Onboarding: zero friction, no login for anything.
- Monetization: nothing visible in static HTML (ads not verifiable without JS). B2B signal: Goal.com licensed Box2Box and Football Bingo into the GOAL apps, so format licensing is a real revenue path in this niche.
- Better than typical: (1) the cross-game daily completion tracker turns 18 games into one habit; (2) event skins (World Cup editions) ride the calendar.
- Weak: (1) homepage is a cluttered wall of cards with inconsistent art; (2) everything is guess-and-type quizzing, no sim, no game-show mechanics, shallow variety under the surface.

### 2. futbol-11.com (plus clone network futbol11.com, futbol11.bond, futbol11.live, futbol11.cv)
- JS shell (Vue SPA, boots as "football-wordle"). From meta and search: Football Wordle, Grid, Bingo (+ Bingo Legends), Connections, Futbol11 (name the XI), Legends variants. Daily midnight reset, optional 60s or 90s timers.
- Better than typical: optional timer modes per game (casual vs sweat).
- Weak: (1) no SSR, terrible SEO fundamentals vs Astro-based playfootball; (2) the brand is being strip-mined by clone domains, and users cannot tell which is real. Lesson for us: publish how-to-play guide pages so douknowball owns its own SERP.

### 3. immaculategrid.com and Immaculate Footy (Sports Reference)
- Live daily grids per sport: Baseball, Football, Basketball (men and women), Hockey, plus Immaculate Footy World and England editions. 9 cells, 9 guesses.
- Retention: rarity score culture (lower is better), accounts with cross-device sync, current streaks, average score stats, spoiler-free share links. ~200k players per weekday as of 2023 (Wikipedia).
- Monetization: house upsells into Sports Reference / Stathead ecosystem.
- Better than typical: (1) rarity score made showing off about obscure answers the whole point, which powers sharing; (2) accounts protect streak data, which locks players in.
- Weak: (1) one format stretched across sports, no variety; (2) brutal for casuals, zero difficulty ramp; (3) soccer editions are thin next to their US sports data.

### 4. crossovergrid.com
- JS shell. Meta confirms daily grids across NBA, NFL, soccer, NHL, MLB, college football and movies (crossing into entertainment).
- Better than typical: multi-vertical under one brand plus a huge X/Twitter distribution habit (grid posted as an image every day, replies are the community).
- Weak: grids only; when grid fatigue hits there is nothing else to do. hoopgrids.com (the original NBA grid) is now an empty shell while clones like hoopgrids.net squat the name: single-format sites die or get cloned.

### 5. sporcle.com
- 133,091 soccer quizzes alone, 223.6M soccer plays, 6.7B plays sitewide. UGC quiz engine: type-in timed lists, clickable quizzes, minefields, photo minefields, A-Z minefields, sortable 4-to-1, Weakest Link, badges, playlists, leaderboards, Quests, multiplayer (Showdown, Live 5, Trivia Bingo), pub trivia events business, store, apps.
- Onboarding: play instantly; account pushed for badges and streak-type features.
- Monetization: visible "Remove Ads" membership link, subscriptions, live events, store. Ads on quiz pages (known, not measurable via static fetch).
- Better than typical: (1) infinite content via UGC plus community tooling; (2) diversified revenue that does not depend on one game trending.
- Weak: (1) dated, overwhelming UX, 2010s portal energy; (2) no sport-native identity, a soccer fan has no reason to make Sporcle a daily soccer habit.

### 6. jetpunk.com
- 5,000+ football quizzes, mostly user-created. Formats: timed type-in lists, clickable, logos, by-clue, all-time tables. Multilingual (de, es, fr, it, nl, pl, pt, fi and more). Account levels and stats. Featured soccer quizzes: EPL teams, Footballers by Country, Ballon d'Or winners, World Cup teams by year, Cities by Soccer Stadium.
- Better than typical: fast, lightweight pages and true multilingual reach.
- Weak: utilitarian design, no daily ritual for sports, no share cards.

### 7. poeltl.nbpa.com (moved off poeltl.dunk.town)
- The NBA daily guesser is now hosted by the NBPA itself (players association). Puzzle No. 1602 on 2026-07-15. 8 guesses, attribute feedback grid (team, conference, division, position, height, age, jersey), silhouette mode.
- Better than typical: (1) attribute-feedback clarity is the gold standard for guess-the-player UX; (2) meta keywords deliberately target misspellings (poetl, poetle, poetlt), cheap SEO win we should copy for game names.
- Weak: one puzzle per day, done in two minutes, nothing else to retain you. Strategic signal: leagues and PAs are acquiring proven daily games (NBPA here, Sports Reference for Immaculate, playfootball for Missing 11). Independents get bought when they own a format.

### 8. Tiki-Taka-Toe ecosystem (tiki-taka.co is a shell; playfootball hosts the real one; tikitakatoe.io and .org are clones)
- PvP tic tac toe where you claim a cell by naming a player matching row and column, with steal mode, friend rooms, same-screen pass and play, mobile apps.
- Better than typical: head-to-head trivia with a friend on one phone is a genuinely social living-room mechanic.
- Weak: needs an opponent for the full experience; clone sites offering "unlimited" mode prove demand for practice modes that the original does not serve.

### 9. guessthe.game family and GTFC-style picture dailies
- guessthe.game: daily video game screenshot guesser, 6 guesses, progressive reveal. Sports cousins (Guess the Football Club and similar) zoom or unblur a crest one step per wrong guess.
- Better than typical: progressive-reveal creates a "one more clue" loop and a natural difficulty curve inside a single round.
- Weak: image-based, so clones steal it trivially; text-only douknowball can copy the reveal pacing (redacted facts that un-redact per guess) without the image liability.

### 10. statmuse.com (UX benchmark, not a competitor)
- Natural-language stat search with instant answer cards, personality captions ("Boston got their big"), trending questions feed, illustrated player art, multi-league tabs including FC, dark and light themes, optional sign-in, SSR (Astro).
- Copy: the post-answer card energy. Every douknowball result screen should end with one sourced flex-fact worth screenshotting.
- Weak as a model: no game loop at all, it is a reference tool.

### 11. Long-tail clone tier (playfutbol.app, footballgenius.app, gridsport.games, lineup-builder.co.uk quizzes, planetefootball, playsportiz)
- Dozens of near-identical "guess the club / player" dailies fighting for the same keywords with 1-3 games each.
- Takeaway: single-game sites are a commodity. Breadth (68 games), original mechanics and one daily hub are the defensible position.

## COPY THESE 5 PATTERNS (mapped to existing douknowball games)

1. Cross-game daily slate tracker (from playfootball's PLAYED 8/18 with W-L).
   Build a "Today's Slate" strip on Home: every daily game (Missing XI, Soccer Grid, Guess The Club, Transfer Path, Guess The Value, Perfect Lineup, Football Grid, Draft Guesser, NFL Career Path, Conquest, College Grid, Guess The College, Guess CBB, Perfect Lineup NBA, NBA Conquest, Baseball Career, Baseball Connections, Puck Detective, Hockey Grid, Hockey Career, Hockey Higher/Lower, Perfect Lineup NHL, F1 Driver, F1 Constructor, Perfect Lineup F1, Tennis Player, NASCAR Driver, Olympics, Guess The Year, Guess The Nation, HOF or Bust, Score Predictor, Minefield, Sports Millionaire) with done/undone state and a daily W-L. Extends the existing home stats (lifetime plays, days visited, world rank).
2. Rarity scoring, streaks and spoiler-free share everywhere (from Immaculate Grid).
   Rarity already exists on Soccer Grid, Football Grid, College Grid, Hockey Grid. Add per-game streak counters and one-tap spoiler-free share cards to every daily above; accounts already exist (native Supabase auth), so surface "streak saved to your account".
3. Limited-edition event skins (from playfootball's World Cup section and Sporcle's World Cup subcategory).
   WC 2026 is live right now: ship World Cup editions of Missing XI, Perfect Lineup, Guess The Nation, Score Predictor and pin 2026 Bracket to the top of Soccer until the final. Repeat for Champions League final, NFL kickoff, March Madness (College games).
4. Yesterday link plus practice/unlimited mode (from missing11's Yesterday button, futbol-11 timer options, tikitakatoe.org "unlimited" clones).
   Every daily gets "Yesterday" (unranked replay) and "Practice (random archive)". Applies to all 30+ dailies; biggest wins on Soccer Grid, Missing XI, Footle, Guess The Value.
5. Result-screen flex facts and misspelling SEO (from StatMuse cards and Poeltl's keyword play).
   After any completed round, show one DB-sourced fact card ("Only 3 players in our 171k-row market DB were ever worth more at 19"). Add misspelling and synonym keywords to game SEO blocks (futle, foodle, soccer wordle, footy grid) via GameSeoContent.

## OWN THESE 5 GAPS

1. One habit, every sport. playfootball and futbol-11 are soccer-only; Immaculate is siloed per sport; Crossover is grids-only. Nobody bundles soccer + NFL + NBA + MLB + NHL + F1 + tennis + NASCAR + UFC + Olympics dailies into one streak. The slate tracker above is the weapon.
2. Trivia that plays like a game. Club Manager, Soccer Career, Perfect Season family, Squad Deal, Deal or No Deal, Sports Millionaire, Clue Auction, Minefield have no equivalent anywhere in the niche (competitors only do guess-and-type). Market this category as its own tab or "Arcade" rail.
3. Motor-skill + knowledge fusion. Dart Draft (timed darts on a world map) is unique in the entire field; the only neighbor is playfootball's brand-new Possession Play. Double down (see Part 2 specs) before they get there.
4. Underserved sports dailies. College football, college basketball, F1, NASCAR, tennis and UFC have essentially zero polished daily trivia competition (Immaculate and Crossover cover at most CFB grids). douknowball already has 15+ games there; they just need the retention plumbing (streaks, shares, slate).
5. Spanish-language soccer dailies. playfootball runs "Los Titulares" for Brazil/Argentina and JetPunk is multilingual, but no one owns ES-first daily soccer trivia. With WC 2026 in North America, an ES toggle on 5 core soccer dailies is a land grab.

## PART 2: VIDEO FORMATS THAT CONVERT TO CLICK-HEAVY WEB GAMES

Method: titles, descriptions, articles and coverage only (no video watched). Owner constraint honored: click/timing/drag mechanics only, no talk-only ranking formats (no keep-sub-sell).

### Candidate table

| Format | Source + popularity evidence | Core mechanic | Web mapping | Our data |
|---|---|---|---|---|
| Football Bingo (draw and place) | box2box show, 34M monthly views; format licensed by Goal.com into GOAL apps | A player is drawn; panel must slot them into one of 16 category tiles before the next draw | Deck flips a player name, you CLICK the tile they satisfy, strikes for misplacement | careers, nations, market values; reuse grid category engine |
| Who's Lying / imposter | Sidemen "Guess The Pro Footballer: Who's Lying"; Sidemen Guess The Footballer ft. Haaland (2026); playfootball just launched Rondo Ringer | Spot the fake among real ones | One CLICK to accuse: fake career among 4 real ones, or the ringer inside a real XI | Missing XI lineups, careers, teammates graph |
| Wheel-spin drafting | MMG Wheel of MUT (2.2B views across channels); KOT4Q wheel videos | Random wheel decides which player/team you get, you build around luck | Already ours: Perfect Season family, Squad Deal. Extend, do not rebuild | done |
| 3-minute grid speedrun | box2box plays their grid vs the clock in-video | Same puzzle, time-attack layer with percentile | Add Speedrun toggle + global percentile to Soccer/Football/College/Hockey Grids | grids (exists) |
| Crossbar / trickshot timing | F2Freestylers crossbar and trick-penalty formats, millions of views per video | Physical accuracy under pressure | Timing-bar penalty: CLICK to stop a moving marker in the sweet spot; knowledge earns attempts | any question bank; no new tables |
| Guess-the-player face/voice filters | TikTok filter trend (WC 2026 editions trending now; pros like Yamal participate) | Rapid-fire identify-under-timer | Already close to Alphabet Sprint and Who Am I; add a 30-second blitz mode | players |
| Bracket prediction filters | TikTok "Who wins WC 2026" filter + B/R Bracketology franchise | Pick winners through a bracket | 15 CLICKS through a 16-player duel bracket where a revealed stat decides each round | market values, careers, transfers |
| NBA logo/play guessing | KOT4Q viral logo video, CAN YOU GUESS series | Identify from partial visual | Blocked by text-only design; skip (redacted-text reveal is the text equivalent, already in Career Ladder/Clue Auction) | n/a |

### TOP 3 BUILD SPECS

---

SPEC 1: BINGO DRAW (soccer, working title "Full Card")
- Why: strongest external evidence in the whole scan (box2box's signature format, 34M monthly views, licensed by Goal.com). Distinct from our existing Player Bingo (there you complete a line by naming players; here the game deals players AT you and you make placement decisions).
- Mechanic: a 4x4 card of categories (played for Real Madrid, 100+ Brazil caps proxy, peak value over 80M, played in 3+ leagues, teammate of Messi, etc). A deck of ~30 real players flips one at a time. For each: CLICK the tile that player satisfies, or CLICK Pass (3 passes). Wrong tile = strike (3 strikes ends the run). Fill the card before the deck runs out.
- Screens: (1) card + current player name + deck counter + strikes/passes, (2) end screen: tiles filled, rarity-style score, share card, (3) how-to overlay first visit.
- Data: careers (club stints), nationalities, player_market_values (171k rows) for value tiles, teammates graph for teammate-of tiles. Category generator can reuse the soccer-grid engine; validity check is a lookup per (player, tile).
- Scoring: +10 per correct placement, streak multiplier, -1 card life per strike; par score per day; percentile vs all players.
- Daily hook: same deck and card for everyone (date seed), daily streak, spoiler-free share ("Full Card in 24 draws, 1 strike").
- Effort: M (2-3 days: category engine reuse, deck curation pass, new page + hook).

---

SPEC 2: THE RINGER (imposter XI)
- Why: Sidemen imposter formats are top-tier viral (Haaland edition, Who's Lying), and playfootball launching Rondo Ringer proves the mechanic is web-viable; ours is single-player daily, theirs needs friends. Cheapest build of the three.
- Mechanic: a real famous starting XI is shown as a formation of name tiles, but ONE name is swapped for a ringer who never played for that club (generated to be plausible: same era, nation or position via careers + teammates graph). CLICK the impostor. 5 rounds per day, escalating: round 5 swaps in a player who DID play for the club but not in that match era. One life, speed bonus.
- Screens: (1) formation of 11 clickable tiles + match header (competition, year), (2) reveal: correct XI with the ringer highlighted and their real career one-liner, (3) gauntlet summary + share (Ringer 4/5, 38s).
- Data: Missing XI lineups table (exists), careers for ringer sourcing, teammates graph to guarantee the ringer never overlapped with that squad.
- Scoring: round points x remaining seconds; perfect-5 badge; daily streak.
- Daily hook: "Today's Gauntlet" of 5 fixed rounds, global percentile.
- Effort: S (1-2 days: data already powers Missing XI; needs ringer-picker query + one page).

---

SPEC 3: KNOCKOUT 16 (stat duel bracket)
- Why: bracket filters are trending on TikTok for WC 2026 right now, B/R has run Bracketology as a franchise for years, and it is 15 rapid clicks of pure ball knowledge, zero typing, perfect for mobile. Rides the live World Cup.
- Mechanic: 16 players appear in a seeded bracket. Before each round the hidden judge stat is revealed (R1: career goals; QF: international caps; SF: peak market value; F: career transfer fees total; stats rotate daily). CLICK a winner in every pairing. After you lock a round, truth advances the bracket (not your picks), so one wrong pick does not kill the run.
- Screens: (1) bracket with tap-to-pick pairings + round stat banner, (2) per-round reveal with the real numbers side by side, (3) final card: 13/15 called, points, share image.
- Data: player_market_values (peak value), careers (goals, caps, clubs), transfers (fee totals). All three tables already loaded.
- Scoring: R1 correct = 1, QF = 2, SF = 3, F = 5 (max 21); perfect bracket badge; percentile.
- Daily hook: themed daily fields (WC 2026 golden boot race today, 90s legends tomorrow, one-club men Friday); daily streak; strong share card ("I called 14/21 on Knockout 16").
- Effort: M (2-3 days: bracket UI, stat resolver per duel, theme curation script).

Honorable mention (S effort, not a standalone game): F2-style timing-bar penalty as a universal sudden-death tiebreaker component for Perfect Lineup sims, Conquest and Score Predictor. Adds clicking juice everywhere without a new page.

## KEY SOURCES
- https://playfootball.games/ and https://playfootball.games/missing-11 (redirect of missing11.com)
- https://futbol-11.com/ plus clone domains futbol11.com, futbol11.bond, futbol11.live, futbol11.cv
- https://www.immaculategrid.com/ ; https://www.sports-reference.com/immaculate-footy/world/stats ; https://en.wikipedia.org/wiki/Immaculate_Grid
- https://crossovergrid.com/ ; https://hoopgrids.net/ (original hoopgrids.com now empty)
- https://www.sporcle.com/games/subcategory/soccer ; https://www.jetpunk.com/tags/soccer
- https://poeltl.nbpa.com/ (moved from poeltl.dunk.town)
- https://www.statmuse.com/ ; https://guessthe.game/
- https://playfootball.games/footy-tic-tac-toe/ ; https://tikitakatoe.io/ ; https://www.tikitakatoe.org/
- box2box: https://www.youtube.com/@box2boxshow ; https://www.tiktok.com/@box2box.show ; Goal.com licensing: https://www.goal.com/en/news/play-free-football-games--goal-live-scores-apps-new-box2box-football-bingo/bltf5f247cd19c798ce
- Sidemen: https://www.youtube.com/watch?v=k6tPeMMUn6A (Guess The Footballer ft. Haaland) ; https://www.youtube.com/watch?v=ipx9n-E2qBo (Who's Lying)
- MMG Wheel of MUT: https://www.youtube.com/playlist?list=PL8rqa9UCxq2cSVrqcLHSfKdYA6VRisUcJ ; https://en.wikipedia.org/wiki/MMG_(YouTuber)
- KOT4Q: https://www.nba.com/news/enjoy-basketball-partners-with-nba-trivia-show-kenny-beecham ; https://en.wikipedia.org/wiki/Kenny_Beecham
- F2Freestylers crossbar formats: https://www.youtube.com/user/F2Freestylers/videos
- TikTok trends: https://www.tiktok.com/discover/guess-the-player-filter ; https://www.tiktok.com/discover/who-will-win-the-world-cup-2026-filter
- B/R Bracketology: https://bleacherreport.com/bracketology
