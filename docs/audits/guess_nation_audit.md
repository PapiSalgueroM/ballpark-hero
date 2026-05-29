# Audit — Guess The Nation (3.4)

**Candidate file:** `docs/candidates/guess-nation-candidates.json` (33 countries)
**Target table:** `public.guess_nation_countries` (TABLE — `useGuessTheNation` queries it)
**Status:** AUDIT ONLY — **domain/schema mismatch; no SQL produced.** Nothing applied.

## 1. Real schema (read from migration 20260309014118)
`guess_nation_countries (country_name, common_names[], flag_emoji, continent, difficulty, season_focus, vibe_word, continent_hint, population_hint, games_attended_hint, total_medals_hint, best_sport_hint, famous_moment_hint, winter_history_hint, gold_medal_hint, flag_colors_hint, country_size_hint, iconic_moment)`.

## 2. CRITICAL: the candidate is for a DIFFERENT GAME
The table is an **OLYMPICS / medals** nation-guessing game — its hint columns are
`population_hint`, `games_attended_hint`, `total_medals_hint`, `gold_medal_hint`,
`best_sport_hint`, `winter_history_hint`, etc.

The candidate data is **SOCCER**: each item is `{ country, clues[] }` where clues are
World Cup wins, star players, stadiums, nicknames (e.g. Argentina "Won 3 World Cups…
Messi and Maradona… Monumental"; France "Les Bleus"; Italy "catenaccio").

**Soccer clues do not map to the Olympics hint columns.** There is no honest way to
produce `DRAFT_*.sql` for this table from this candidate without fabricating Olympics
facts (medal counts, best sport, winter history) for all 33 countries — which would be
both a different game and pure invention. So: no SQL. The candidate looks like it was
generated for a "guess the soccer nation" concept that does not match the live table.

**Recommended:** Anthony decides — either (a) this soccer-nation data belongs to a NEW
table/game (not guess_nation_countries), or (b) it's discarded and the Olympics game is
seeded with actual Olympics data instead. Do not jam soccer clues into the Olympics schema.

## 3. Soccer facts themselves — spot-check (if repurposed for a soccer game)
Mostly correct, but at least one error:
| Country | Claim | Flag |
|---|---|---|
| Spain | "Won 4 of last 5 European Championships" | **LIKELY WRONG** — Spain won Euro 2008, 2012, 2024 = **3** of the last 5 (2008/12/16/20/24), not 4. |
| Argentina | 3 World Cups 1978, 1986, 2022 | OK |
| Brazil | 5 World Cups (most) | OK |
| France | WC 1998, 2018; hosted Euro 2016 | OK |
| Germany | 4 World Cups; 7-1 vs Brazil 2014 | OK |
| Italy | 4 World Cups; won Euro 2020 | OK |
(Remaining ~27 countries not individually checked here — full list in candidate file for the chat assistant.)

## 4. Facts I had to add
**None** — no SQL generated. (If repurposed, every clue still needs a source.)

## 5. Raw candidate dump
See `docs/candidates/guess-nation-candidates.json` (33 items, each `{country, clues[]}`, soccer-domain).
