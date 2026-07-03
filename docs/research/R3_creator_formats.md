# R3 Research: Creator Format Inventory and Conversion Candidates

## Executive Summary

1. Box2Box Show (200K YouTube subs, 630K TikTok) is the richest single source. Its formats are proven twice over: by their own repeat use and by a third-party site (playfootball.games) that already turned nine of them into standalone web games.
2. The strongest untapped formats are Pointless-style rarity quizzes, football-trumps card battles, a Contexto-style secret player guesser, a Missing XI lineup-recall game, and a social deduction imposter game.
3. We already ship Who Am I (Contexto-style) and Clue Auction, Stat Detective, Alphabet Sprint, Deal or No Deal Player Edition, so those exact formats are excluded below.
4. JxmyHighroller (2.45M subs, 4M+ monthly views) and KOT4Q (1.42M subs) both run recurring stat-guessing and rebuild-challenge series, both format families we can adapt across NBA, soccer, and NFL.
5. The 38-0 / 82-0 style perfect-season builder that Sidemen popularized already exists on douknowball.com for four sports, so that lane is covered; the untapped adjacent format from the same family is Untouchables (keep 5, trade the rest).
6. Instagram and TikTok favor three shareable shapes: rarity leaderboards (percent of players who got it), grid reveals (emoji block like Wordle), and comment-bait prompts (name a player who, tag someone who knows this).
7. IP safety is straightforward for every format below: none require a photo, logo, or creator name; text, stats, flags, and club names already used elsewhere on the site are sufficient.
8. Our biggest data advantage is the 171K-row soccer market value table and the 151-player clean career graph, which supports value-guessing and career-chain formats better than most fan sites can match.
9. Baseball and hockey are underweighted in the creator landscape; most viral formats are soccer or NBA-first, so cross-porting to Lahman and NHL data is a differentiation opportunity, not a requirement.
10. Recommended build order: Pack Battle (trumps), Rarity Round (Pointless/Goalless), Missing XI, Career Contexto, and The Ringer (imposter, single-player adaptation), in that order.

## Current Game Registry Check

Read from `src/data/gameRegistry.ts` before researching. 65 games are already live across 12 categories. Formats we already have, so excluded from candidates below:

- Contexto-style secret player guessing -> `/who-am-i`
- Clue-buying against a points bank -> `/clue-auction`
- Stat-line detective -> `/stat-detective`
- Quickfire letter gauntlet -> `/alphabet-sprint`
- Deal or No Deal squad build -> `/deal-or-no-deal`, `/squad-deal`
- Tic-tac-toe grid crossover -> `/football-connect-4`, `/nba-connect-4`, `/soccer-grid`, `/football-grid`, `/college-grid`
- Higher/lower stat compare -> `/higher-lower`, `/higher-lower-transfers`, `/hockey-higher-lower`
- Career-path guessing -> `/career`, `/career-ladder`, `/baseball-career`, `/hockey-career`, `/nfl-career`
- Perfect season / spin-draft-simulate -> `/perfect-season-nfl`, `/perfect-season-nba`, `/perfect-season-mlb`, `/perfect-season-nhl`
- Bingo card fill -> `/player-bingo`, existing Football Bingo equivalent
- Connections (group of 4) -> `/connections`, `/baseball-connections`
- Draft against AI -> `/fantasy-draft`
- Chain-building (connected players) -> `/nba-chain`, `/tennis-chain`, `/nascar-chain`, `/ufc-chain`, `/transfer-path`
- List-as-many-as-you-can -> `/list-quiz`
- World XI / formation fill -> `/world-xi`, `/build-your-xi`, `/perfect-lineup`, `/perfect-lineup-nba`, `/perfect-lineup-nhl`, `/perfect-lineup-f1`

Everything proposed below is a distinct mechanic from this list.

## Part 1: Per-Creator Format Inventory

### Box2Box Show (soccer)

Channel stats: roughly 200K YouTube subscribers, 630K+ TikTok followers, 55K Instagram. Hosts Varvar, Mili, Pala, Ferms. Weekly YouTube upload, Monday podcast, described by fans as the biggest football show on TikTok. Their formats are the most validated in this whole report because a third party, playfootball.games, cloned nine of them into standalone daily web games, which is a direct signal that these formats survive the jump from video to interactive web page.

Format catalog, with engagement notes where found:

- Footy Tic Tac Toe: 3x3 grid, top row and left column are criteria (club, nation, trophy, award), players place a marker by naming a footballer who satisfies both the row and column. Described by the show as their most popular format ever created. Cloned as Box2Box and Tiki-Taka-Toe on playfootball.games, and we already have this exact mechanic across five games.
- Guess the Value, Get the Player: hosts guess a player's real transfer value; correct guesses (within a band) add that player to a fantasy squad. Direct match for our pending backlog item #54 (Guess the Value, Sign the Player) and for R3 candidate #1 below (Pack Battle borrows the same value axis).
- Guess the Stadium, Get the Player: shown a stadium description or fact, guess it, unlock a player tied to that ground.
- Career Path Challenge: guess the footballer purely from a sequence of clubs/loans, hardest transfers revealed last. Cloned directly on playfootball.games as "Career Path Challenge." We already ship this as Career Ladder and Career Quiz.
- Missing XI (their version, not always branded by Box2Box but the same family across football YouTube): shown a formation diagram from a real historic match, guess all 11 starters. Cloned as "Missing 11" with Brazil and Argentina-specific spinoffs on playfootball.games, tagged Daily. This exact format is our pending backlog item #57 (Missing XI game) and is a strong open candidate, detailed below.

### Clique Productions (NBA)

YouTube channel running NBA-2K-powered simulation and trivia content. Confirmed formats: "We Did An NBA Trivia Draft" (a trivia-gated fantasy draft, similar structurally to Guess the Value/Sign the Player but for trivia correctness instead of value guessing), and full-era resimulation videos (for example resetting the league to 1983 and re-simulating history, or turning role players into superstars). These are heavier production formats (video game simulation) that do not translate directly to a lightweight web game without a full season-sim engine, which we already have via Perfect Season. Signal is moderate; no public subscriber count confirmed in search, but the trivia-draft format specifically maps onto a variant of our existing Fantasy Draft with a correctness gate added.

### JxmyHighroller (NBA)

Real name Grayson Anderson. Subscriber count above 2.45M, 4.09M views in a 30-day window sampled, described by outside press as one of the most-viewed independent NBA channels despite low mainstream name recognition. Known for deep stat-line and box-score breakdown segments (the source of our existing Stat Detective). Given the channel's scale and its stat-first identity, the format family (stat line as the sole clue, revealed progressively) is strongly validated; we already built Stat Detective from this. The adjacent unbuilt format is a stat-line comparison/trumps mechanic (see Pack Battle below), since JxmyHighroller's videos frequently pit two stat lines against each other for the audience to judge.

### KOT4Q (NBA)

Real name Kentrell Beecham, 1.42M+ subscribers, started 2011, based in Chicago. Original claim to fame was NBA 2K rebuilding-challenge series (multiple seasons across 2K16 through 2K20 and beyond): draft-and-simulate a losing team back to a championship using in-game trades only. This is functionally the same shape as 82-0/Perfect Season, which we already ship. The distinct, unbuilt sub-format inside this family is "Untouchables": a team gives you 5 protected (untouchable) players and forces you to trade away everyone else, then simulate the fallout. Community quizzes about KOT4Q on Sporcle also confirm a large secondary audience for stat-line and legends-guessing trivia tied to his brand, reinforcing that his fanbase already plays stat quizzes about his content, a proxy signal for format-market fit.

### MMG and Deestroying (NFL/general sports)

Signal here is weaker than the NBA and soccer creators. MMG (Matthew Meagher) is primarily a Madden/EA Sports College Football gameplay YouTuber rather than a trivia-format creator; no distinct convertible quiz format surfaced. Deestroying (Donald De La Haye), a former Division I kicker, has done NFL jersey-number trivia videos and appeared in "Snapback Trivia" (a live NFL trivia broadcast format run around Super Bowl radio row), but neither is a recurring, structured series with a repeatable game loop the way Box2Box or KOT4Q are. Treat this pairing as a validation of two narrower ideas (jersey-number guessing, which we already ship as Shirt Number for soccer and could port to NFL/NBA, and live trivia broadcasts, which do not translate to an async web game) rather than a source of new formats.

### Sidemen / Miniminter (soccer, crossover appeal)

The Sidemen made 38-0.app go viral: spin to land on a real English top-flight club-season, draft one player from that squad into your formation, repeat until 11 slots are filled, then simulate all 38 games chasing an unbeaten season. This is the same core loop as our Perfect Season family, already shipped across four sports (`/perfect-season-nfl`, `-nba`, `-mlb`, `-nhl`) plus our soccer `/perfect-lineup`. No new format to extract here beyond what KOT4Q's Untouchables idea adds (protect-and-trade instead of spin-and-draft). Notably, 38-0's Champions and 1v1 modes added ticking-clock simulated matches with shots, cards, and penalty shootouts, a presentation upgrade worth stealing for our existing Perfect Season simulator rather than a new game.

### Instagram and TikTok native formats

Distinct from YouTube long-form, short-form social favors formats that resolve in under 15 seconds and bait a comment or share. Confirmed patterns from research:

- Rarity/percentage reveal quizzes: reels that ask a question and reveal "X% of people got this right," which is the exact mechanic behind Pointless/Goalless (see Rarity Round below). Quiz-sticker reels on Instagram explicitly extend average watch time because the reveal is withheld until the end, and quiz content is described by platform guidance as built to spark comments, one of Instagram's strongest ranking signals.
- Guess-the-player picture/silhouette accounts: large genre on TikTok and Instagram (searched as "guess the player" and "who are ya" style accounts). We must avoid the photo/silhouette version for IP safety (no athlete photos), but the underlying "narrow it down with each clue" loop is exactly Who Am I and Clue Auction, which we already have.
- Imposter/social-deduction party formats: Rondo Ringer (a fan-made football-imposter game, likely inspired by Werewolf/Among Us mechanics applied to a mystery footballer) shows this genre has crossed into sports trivia. Party-game formats are naturally shareable because they require inviting other people, which is a built-in virality loop.
- Bracket-vote stories: Instagram Stories' native poll sticker used for head-to-head bracket voting (seen in Sports Illustrated's March Madness bracket activation and generic sports bracket templates). This is a content-marketing tactic more than a standalone game, but it maps onto a lightweight "Community Bracket" results screen we could bolt onto existing games rather than a new game itself.
- Comment-chain prompts ("name a player who..."): could not confirm a single dominant viral account for this, but the mechanic is well documented as a general engagement tactic (tag a friend, drop your answer). This is a virality mechanic to bake into result screens (see Part 3), not a standalone game.

## Part 2: Ranked List of Convertible Formats

Format 1: Pack Battle (football trumps / stat-line duel)

- Source: Box2Box's "Guess the Value, Get the Player" plus the general football-trumps genre (playfootball.games ships this exact mechanic as "Pack 11," described as a daily football trumps game); JxmyHighroller's stat-line comparison segments are the NBA-side proof point.
- Web game spec: Each day the player opens a pack of 5 mystery player cards, one at a time. Before flipping each card, they see one revealed stat category (market value, goals, assists, or a chosen attribute) and must guess whether the hidden player beats a running "high score" card already in their hand, Top Trumps style. Correct calls keep the card and its stat active for the next comparison; a wrong call busts the pack. Score is the sum of stat values banked before busting or completing all 5. Share card shows a 5-card strip with green/red pips per correct/incorrect call plus final banked score, formatted as an emoji row so it posts cleanly to TikTok/Instagram captions.
- Data needs: `player_market_values` (171K rows) covers the value axis outright; goals/assists/appearances need a stat column per player, which likely requires joining against whatever season-stats table backs Footle/Career Quiz. Confirm which existing table has clean per-player career totals for soccer before committing to non-value stat categories; value-only is a safe fallback that needs zero new data.
- Difficulty: M. Core loop is simple higher/lower chaining (we already have this pattern in `/higher-lower-transfers`), the new work is the "pack of 5, bust mechanic, banked score" wrapper and the card-flip UI.

Format 2: Rarity Round (Pointless/Goalless style)

- Source: playfootball.games' "Goalless" (explicitly "inspired by Pointless") and "Footy TenaBall" (inspired by Tenable/Top 10 answers); this is also our own pending backlog item #58 (Pointless/Goalless mode), so this doubles as a spec for that ticket.
- Web game spec: Each round shows a trivia category (for example, "Ballon d'Or winners since 2000" or "Players with 300+ Premier League appearances"). The player has 3 guesses to name answers that are correct but as obscure/rare as possible; a scoring table (precomputed rarity rank, not live survey data) assigns each correct answer a rarity score, and the goal is the lowest total score across 3 rounds, with 0 being a perfect "Goalless" run. Share card shows the 3 answers found and their rarity ranks out of the full answer pool, framed as "you found a 12-point answer" the way Pointless displays its board.
- Data needs: needs a curated answer-set-plus-rarity-rank per category. `ballon_dor` (76 winners, already seeded) is ready to use as one category out of the gate. Additional categories can reuse existing tables (World Cup winners, career stat thresholds) as long as each category has a bounded, countable answer set with a defensible rarity ordering (for example, ordering by real-world market value or by recency as a proxy since we do not have actual "percent of people who said this" survey data).
- Difficulty: S. No autocomplete/fuzzy-matching complexity beyond what Career Quiz already solved; the hard part is curating clean, bounded answer sets, which is content work, not engineering.

Format 3: Missing XI (lineup recall)

- Source: playfootball.games "Missing 11," directly descended from the Box2Box/general football-YouTube "guess the historic lineup" segment; this matches our own pending backlog item #57 (Missing XI game).
- Web game spec: Player is shown a real historic match (competition, date, final score, and a formation diagram with positions but no names) and must fill in all 11 starters for one team. Each correct guess fills that slot; incorrect guesses cost a strike (3 strikes ends the round, remaining names are revealed). Score is correct-out-of-11 plus a time bonus. Share card renders the formation grid with green checks on filled slots and gray dashes on missed ones, an 11-cell emoji/box grid that reads clearly even as a compressed share image.
- Data needs: this is the one format on this list that needs genuinely new content: a table of historic match lineups (competition, date, team, formation, 11 player names plus positions). We do not currently have this; `player_market_values` and the 151-player career graph do not include match-day lineups. Needs sourcing (Wikipedia match reports for World Cup finals, Champions League finals, famous derbies are the most efficient starting point since those have the highest name recognition, which matters for guessability). Estimate 50-100 curated matches to launch, expandable over time.
- Difficulty: L. The mechanic itself is simple (it is structurally close to our existing autocomplete-guess games), but building and verifying a clean lineup dataset from scratch is the real cost.

Format 4: Career Contexto (secret player, word-embedding-style similarity but built on structured attributes)

- Source: playfootball.games "Contextinho" (an explicit football adaptation of Contexto/Semantle); note we already ship the guessing-with-similarity-feedback shape as Who Am I, so this format is only worth building as differentiated if it uses a different similarity axis than Who Am I currently does.
- Web game spec: Differentiate from Who Am I by keying similarity purely off the clean 151-player career graph (shared clubs, shared leagues, overlapping years, nationality, position) rather than Who Am I's existing scoring, and present it as a numbered rank (1 = the secret player, higher numbers = less similar) the way Contexto does, rather than Who Am I's current feedback style. Unlimited guesses, no strikes, pure exploration toward rank 1. Share card shows guess count and a compressed color bar (green improving, red worse) per guess in sequence.
- Data needs: fully covered by the existing 151-player clean career graph; this is the cheapest format on the list from a data standpoint.
- Difficulty: S, but only worth building if product wants a second Contexto-style game distinct enough from Who Am I to avoid cannibalizing it; flag this as a "build only if differentiation is clear" item rather than an automatic yes.

Format 5: The Ringer (single-player imposter/social-deduction, adapted)

- Source: playfootball.games "Rondo Ringer," an explicit football-imposter party game (one player is secretly shown a different "mystery player" than everyone else and must blend in while giving clues).
- Web game spec: Rondo Ringer is multiplayer/party by design, which does not fit our async daily-game pattern directly. Adapt it single-player: the player is shown 4 clues about a "consensus" mystery player and must spot which one of the 4 clues is actually about a different, decoy player (the "ringer" clue) rather than guessing the player's identity outright. Score is based on how many decoy clues are correctly flagged across a set of rounds. This preserves the "spot the odd one out" tension of the source format without needing real-time multiplayer infrastructure. Share card shows a 5-round grid of correct/incorrect ringer-spots.
- Data needs: needs curated clue sets per player (attributes true of the target plus one plausible-but-false attribute borrowed from a similar player). Can bootstrap from the same tables backing Career Quiz and Stat Detective; the work is in clue-pair curation, not new data sourcing.
- Difficulty: M. The single-player adaptation removes the hardest part of the source format (live multiplayer voting) but still needs careful clue-pair design to avoid pairs that are trivially obvious or unfairly ambiguous.

Format 6: Untouchables (protect-5, rebuild the rest)

- Source: KOT4Q's rebuilding-challenge video family, specifically the "untouchables" sub-format where a team must protect a handful of players and trade away the rest.
- Web game spec: Player is given a real historic team roster (for example a specific NBA or Premier League season squad) and must choose exactly 5 "untouchable" players to keep. The remaining roster is auto-traded away using a value-weighted return (drawing on market value data for soccer), and the game scores the resulting mini-squad's simulated performance using the same engine that already powers Perfect Season. This is effectively a new entry-point/framing on top of the existing perfectSeason.ts simulation core rather than a new simulator.
- Data needs: soccer version is well-supported by `player_market_values`; NBA/NFL/NHL versions would reuse whatever roster and season data already backs those sports' Perfect Season games.
- Difficulty: M, mostly because it should be built as a mode on top of the existing Perfect Season core (which is explicitly on the pending backlog as item #95: Perfect Season modes including daily one-attempt, hard, one-club) rather than a standalone game; recommend folding this into that backlog item instead of shipping it as its own page.

Format 7: Stadium Detective (guess the ground, unlock the player)

- Source: Box2Box's "Guess the Stadium, Get the Player."
- Web game spec: Shown progressively revealing text clues about a stadium (capacity, opening year, city, notable finals hosted, tenant club's nickname, never the club or stadium name itself), guess the stadium; a correct guess reveals one player tied to that ground and their info card is added to a running "squad" for the session. 5 stadiums per day, squad-building meta-score across the week is optional.
- Data needs: needs a small curated stadium-facts table (name, capacity, city, opened year, tenant club, notable events); this is new but lightweight content, roughly 50-100 major stadiums to launch a soccer version.
- Difficulty: S-M. Simple guess loop, main cost is curating clean stadium fact clues without using logos or photos (text-only per IP-safety rule, which fits naturally here since stadium facts are just numbers and names).

Format 8: Trivia Draft (correctness-gated fantasy draft)

- Source: Clique Productions' "NBA Trivia Draft" format.
- Web game spec: Player answers a trivia question each round; a correct answer unlocks a random player from a matching pool (for example, correctly naming a Ballon d'Or year unlocks a random Ballon d'Or-adjacent player) into their squad, a wrong answer skips that round. After a fixed number of rounds, the assembled squad is rated (reusing our existing `playerRating` logic from Squad Deal). This is a direct hybrid of our existing List Quiz/trivia mechanics and Squad Deal's rating system.
- Data needs: fully covered by existing trivia content (ballon_dor, World Cup data) plus the existing `playerRating` function in `src/lib/squadDeal.ts`.
- Difficulty: S. This is largely a remix of two systems we already have (trivia question banks plus squad rating), so it is closer to a content/wrapper build than new engineering.

Format 9: Jersey Number Cross-Sport (port of existing Shirt Number)

- Source: Deestroying's NFL jersey-number trivia video, confirming jersey-number guessing has cross-sport appeal beyond soccer.
- Web game spec: Same loop as our existing `/shirt-number` (guess the kit/jersey number a player wears or wore) but ported to NBA and NFL, where jersey numbers carry strong cultural weight (retired numbers, number-change stories). Daily puzzle, guess the number with a range-narrowing hint system identical to the existing soccer version.
- Data needs: needs jersey number fields for NBA/NFL rosters; likely already present or easy to derive from `nflfastr_rosters` for NFL, and would need confirmation of an equivalent NBA roster table.
- Difficulty: S. This is a straight port of an existing, already-shipped mechanic to two new sports, not a new format; the main cost is data-mapping, not design.

Format 10: Bracket Battle (community vote, results-screen add-on)

- Source: Instagram Stories bracket-poll activations (Sports Illustrated March Madness) and general sports bracket template virality.
- Web game spec: Not a standalone game. After finishing any existing head-to-head or ranking game (Higher or Lower, World XI, Career Ladder), offer an optional "how did the community vote" bracket-style comparison screen showing the aggregate pick rate for the two options the player just faced, sourced from our own play data once we have enough volume. This is a virality/retention layer to bolt onto multiple existing games rather than new game #66.
- Data needs: requires logging per-round pick data across existing games, which ties into pending backlog items #101-102 (streaks, leaderboards) since it needs the same event-logging infrastructure.
- Difficulty: M, primarily because it is an infrastructure item (event logging plus aggregation) shared across many games rather than isolated game logic.

Format 11 (bonus, cross-sport gap-filler): Career Contexto for Baseball/Hockey

- Source: same Contexto-family validation as Format 4, but flagged separately because baseball and hockey are underweighted in the entire creator landscape researched here (almost every viral format found is soccer-first or NBA-first).
- Web game spec: identical mechanic to Format 4, run against Lahman baseball data and NHL season stats instead of the soccer career graph.
- Data needs: Lahman baseball (already in the stack per CLAUDE.md) and NHL season stats; needs a comparable "clean career graph" style similarity model to be built for these sports, which does not yet exist the way the 151-soccer-player graph does.
- Difficulty: L, because the similarity-graph groundwork for baseball/hockey does not exist yet and would need to be built before any Contexto-style game could launch for those sports.

## Part 3: Virality Mechanics

What makes these formats shareable, and how to bake it into every result screen:

- Percent-based bragging rights. "Only 4% of players got a Goalless run" or "94% of players guessed wrong on round 3" performs better than a raw score because it turns an individual result into a comparison. Every new game above should compute and display this once enough play volume exists (ties into the pending leaderboard/streak infrastructure, backlog items #101-102).
- Compressed emoji-grid result blocks. Wordle popularized a copy-pasteable grid of colored squares that spoils nothing but proves completion; this is explicitly called out in our own pending backlog (#115: share cards include site URL plus emoji grid, #116: TikTok-ready vertical results screens). Every format above (Pack Battle's 5-card strip, Rarity Round's 3-answer rarity marks, Missing XI's 11-cell grid, The Ringer's 5-round grid) is designed around this exact shape so the eventual shared-component work in #115/#116 covers all of them at once.
- Withheld reveal drives watch/play time. Instagram's own quiz-sticker guidance notes viewers stay because the answer comes at the end; every format above should default to hiding the final score/reveal until the last round completes, not showing a running score prominently mid-game.
- Built-in comment/tag bait. Formats with a natural "debate" axis (Pack Battle's higher/lower calls, Bracket Battle's community-vote comparison) should phrase their share text as a question ("Would you have kept this card?") rather than a statement, since quiz content is explicitly designed to spark comments as an engagement signal.
- Party formats recruit new players by design. The Ringer's source format (Rondo Ringer) is inherently viral because it requires other people to play; even our single-player adaptation should keep a "send this round to a friend, see if they spot the ringer too" share action, since invite-required formats have a built-in acquisition loop that solo daily puzzles do not.
- Text-only clue design is a feature, not a limitation, for IP safety. Every spec above avoids photos, logos, and creator references by construction; stadium facts, career paths, market values, and flags are all text/data-driven, which keeps every format in this list safely inside the existing site's no-photo, no-logo convention.

## Sources

- [Box2Box - Fill the Football Grid](https://playfootball.games/box2box/)
- [Tiki-Taka-Toe - Play Footy Tic Tac Toe](https://playfootball.games/footy-tic-tac-toe/)
- [Missing 11 - Football Quiz Games](https://playfootball.games/missing-11/)
- [Rondo Ringer - The Football Imposter Party Game](https://playfootball.games/rondo-ringer/)
- [Contextinho - Play Football Contexto](https://playfootball.games/contextinho/)
- [Pack 11 - Daily football trumps game](https://playfootball.games/pack-11/top-stars)
- [Footy TenaBall - Football Tenable & Football Top 10 Quiz](https://playfootball.games/football-tenable/)
- [Goalless - Daily Football Quiz Inspired by Pointless](https://playfootball.games/goalless/)
- [Guess The Value, Get The Player In Your Squad! | Box2Box Show (Patreon)](https://www.patreon.com/posts/guess-value-get-123236497)
- [Guess The Stadium, Get The Player! - YouTube](https://www.youtube.com/watch?v=OxVUQR0R56E)
- [Guess The Player From Their Career Path Quiz!](https://m.youtube.com/watch?v=EAhEGWxVwyY)
- [Box2BoxShow - YouTube](https://www.youtube.com/@box2boxshow)
- [Box2BoxShow Official Linktree](https://linktr.ee/box2boxshow)
- [We Did An NBA Trivia Draft - YouTube (Clique Productions)](https://www.youtube.com/watch?v=YFZ_CMmZsqA)
- [I Reset The NBA to 1983 & Re-Simulated ALL Of NBA History - YouTube](https://www.youtube.com/watch?v=wdkMzymBKTI)
- [JxmyHighroller's YouTube Stats: Subscribers, Views & Earnings | vidIQ](https://vidiq.com/youtube-stats/channel/UC3L9XPe0_FGfRG-CMGtBvFg/)
- [No-Name YouTuber Crushing ESPN In NBA Video Views | OutKick](https://www.outkick.com/media-analysis/no-name-youtuber-crushing-espn-in-nba-video-views)
- [KOT4Q Youtuber overview](https://us.youtubers.me/kot4q/youtuber-stats)
- [Creators Going Pro: Meet KOT4Q (Tubefilter)](https://www.tubefilter.com/2020/02/19/creators-going-pro-kot4q/)
- [KOT4Q IMPOSSIBLE NBA quiz - Sporcle](https://www.sporcle.com/games/HachimuraROTY/kot4q-impossible-nba-quiz-50-or-below-1)
- [NBA Rebuilding Challenges | KOT4Q - YouTube playlist](https://www.youtube.com/playlist?list=PLsfR5_ZspQ1zM3lQt0-epzCPBfhtHBd3p)
- [The Hardest NFL Jersey Number Trivia w/ Deestroying - YouTube](https://www.youtube.com/watch?v=3pRXzJgxqaA)
- [How to play the viral 38-0 Premier League game - HITC](https://www.hitc.com/footballs-wordle-how-to-play-the-viral-soccer-game-that-is-all-over-social-media/)
- [38-0 | Build the Ultimate English Top-Flight Team](https://38-0.app/)
- [This New FOOTBALL Game has taken over the INTERNET! - YouTube](https://www.youtube.com/watch?v=hg9XUx2mQO8)
- [How to Use Quizzes on Instagram in 2026 (Stories, Posts & Reels)](https://typito.com/blog/instagram-quiz/)
- [Instagram: How to Use the Quiz Sticker in Reels (Adweek)](https://www.adweek.com/media/instagram-how-to-use-the-quiz-sticker-in-reels/)
- [Niche Trivia Challenges: Quiz Video Ideas for Reels, Shorts & TikTok](https://typito.com/blog/niche-trivia-challenges-quiz-video-ideas/)
- [March Madness Bracket: SI readers pick their bracket - Sports Illustrated](https://www.si.com/college/2018/03/14/sports-illustrated-ncaa-tournament-march-madness-instagram-poll)
