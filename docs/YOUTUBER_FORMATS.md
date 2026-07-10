# YouTuber format mining — build pipeline (2026-07-10)

Owner brief: "look up sports youtubers... find the most successful videos on
different concepts and integrate that exact idea onto the website." This doc
maps proven formats → site games. Status: ✅ live, 🔨 built this session,
📋 specced (next builds).

## 🔨 Dart Draft (`/dart-draft`) — Sidemen/MMG giant-dartboard genre
The "throw a dart, live with the consequences" format + owner's timing twist.
Two-phase timed aim (lock X, lock Y, sweeps speed up each throw), 12 wedges
(5 leagues, 5 nations, World, gold LEGENDS), real darts ring economics:
triple ring = elite pull, bull = top-3 superstar, off-board = worst player in
the wedge. 11 throws fill a chosen formation → squad rating + chemistry →
best-of-3 sim vs "The Machine" with minute-by-minute commentary. Fully local
(no AI dependency), completion wired to points/streaks/badges.

## 📋 Blind Rank — KOT4Q's signature ("CAN YOU GUESS?" adjacent)
Reveal 5 players ONE AT A TIME; player must slot each into rank 1-5
immediately, no rearranging. Then reveal the true order by the hidden stat
(career goals, PPG, trophies, transfer fees, WC goals...). Score = exact slots
+ adjacency partial credit. Daily (seeded) + unlimited. Data: existing
player_market_values, career tables, ballon_dor, nba tables — multi-sport from
day one. LOW build cost, HIGH replay value. → build next.

## 📋 Start / Bench / Cut — KOT4Q staple
3 players + a context ("2016 season", "champions league finals", "prime
years"). Choose who starts, benches, gets cut. True answer computed from the
stat context; 5 rounds per run. Multi-sport. Pairs perfectly with daily seed.

## 📋 Guess the Stadium, Get the Player — box2box earn-your-XI hybrid
Identify a stadium (or badge / transfer fee / iconic moment year) from
progressive clues; each correct answer EARNS the tied player for your XI.
11 rounds → rate + sim like Dart Draft. Needs a stadiums/badges table
(~120 rows, hand-verifiable).

## 📋 Minefield — Sporcle/KOT4Q hybrid
"Name every club Ronaldo scored 20+ league goals for" style board with a few
WRONG tiles hidden among right ones; one wrong click ends the run (or costs a
life). Reuses list-quiz data (`listQuiz.ts` / name-them-all quizzes) with a
mine layer on top.

## ✅ Already live (owner brief coverage)
- Deal or No Deal / Squad Deal (box2box "FOOTBALL DEAL OR NO DEAL", May 2026)
  — deep rework still queued (banker math, pools, stay/swap, themed boards).
- Who Wants to Be a Millionaire (`/sports-millionaire`).
- Darts 501 race (`/darts`) — name-a-player checkout format.
- Player Bingo, Alphabet Sprint, Missing XI, Club Manager, Fantasy Draft.

## Build order recommendation
1. Blind Rank (cheap, daily, multi-sport, shareable "X/5" result)
2. Start/Bench/Cut (same data spine as Blind Rank)
3. Sign the Player box2box auction rework (already on the master list)
4. Guess the Stadium (needs small new dataset)
5. Minefield (after list-quiz content expansion)

Sources: Sidemen football-darts format teardown (gist.ly summary), KOT4Q
video/playlist catalog + Sporcle tag, box2box channel uploads (Football Deal
or No Deal, Guess The Stadium Get The Player), hoopgoat.com daily-game suite
(GOATED / Blind Rank / Start-Bench-Cut precedents).
