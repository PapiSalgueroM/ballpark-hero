# Audit — Guess The College (candidate set)

**Candidate file:** `docs/candidates/guess-college-candidates.json` (20 schools)
**Run:** overnight staging 2026-05-29
**Status:** AUDIT ONLY — **target table/format is UNDECIDED**; no SQL or TS draft produced (would require guessing a schema). Needs Anthony's call.

## 1. Target investigation (per brief 3.2 — "confirm same table as CBB or separate")
Three candidate homes, none a clean fit:
- **`src/data/colleges.ts` (the existing Guess The College game, STATIC):** its `College` interface is richly structured — `{ name, nicknames[], mascot, vibeWord, region, state, enrollment, acceptanceRate, conference, conferenceType, basketballHistory, cfbHistory, olympicAthletes, nflDraftHistory, famousAlumniHint, colors, funFact }`. The candidate is `{ school, clues: string[5] }` — **a clue list, not these fields. SCHEMA DOES NOT MATCH.**
- **`cbb_programs` table (the CBB game, 3.16):** that schema is clue-like (`vibe_word, region_hint, conference_hint, tournament_hint, championships_hint, mascot_hint`) but **basketball-only**. Many candidates here are FOOTBALL programs (Alabama, Georgia, Texas, USC, Notre Dame, Florida State, Penn State…). Mixed CFB+CBB → not a clean CBB fit either.
- **A new "guess the college program" game/table:** this clue format actually matches the **P2-5 college hub** concept (a unified CFB/CBB program-guessing game). That table does not exist yet.

**Verdict:** the candidate is effectively orphaned. Recommend Anthony decide the home (most likely: a new unified program-guesser table for P2-5). Until then, no SQL can be honestly drafted — inventing a schema would violate the "never assume the schema" rule.

## 2. Duplicate check
All 20 candidate schools already exist as entries in `colleges.ts` (Duke, UNC, Kentucky, Kansas, UCLA, Michigan, Ohio State, Alabama, Georgia, Texas, USC, Notre Dame, Florida, Tennessee, LSU, Auburn, Oklahoma, Penn State, Wisconsin, Florida State). So they are NOT new schools — only a new *clue-based representation* of existing schools.

## 3. Factual red flags (flag, do not fix)
| School | Flag |
|---|---|
| LSU | **LIKELY WRONG:** "Won basketball 1935 1946 only" — LSU has **0** NCAA men's basketball titles. 1935 was a retroactive Helms title; 1946 is not an LSU championship. Verify/correct. |
| Texas | **Year-convention inconsistency:** "Won CFB title 2005" uses the *season* year (game played Jan 2006), while Michigan ("2024") and Ohio State ("2025") use the *title-game* calendar year. Pick one convention. |
| Ohio State | "Won CFB title 2025" = 2024 season, game Jan 2025. Season-vs-game-year ambiguity (a player may read "2024 champion" = OSU). |
| Michigan | "Won CFB national championship 2024" = 2023 season. Same season/game-year ambiguity. |
| USC | "11 CFB championships" — USC *claims* 11; consensus/recognized counts differ. Mark as claimed. |
| Notre Dame | "11 CFB championships" — claimed/consensus figure; verify the count used. |
| UCLA | "11 national championships" (basketball, Wooden era) — correct, but clue omits "basketball"; ensure unambiguous. |
| Oklahoma | "7 CFB championships" — claimed count; verify. |

## 4. Facts I had to add
**None** — all clues are from the candidate file. (But the file mixes claimed vs recognized title counts and two year conventions; every championship count and year needs a source.)

## 5. Recommendation
1. Decide the target (recommend: a new unified college-program-guesser table for the P2-5 hub; keep separate from both `colleges.ts` and `cbb_programs`).
2. Standardize the year convention across all items.
3. Fact-check championship counts (especially LSU basketball — likely an error — and the "claimed" football totals).

## 6. Raw candidate dump
See `docs/candidates/guess-college-candidates.json` (20 items, each `{school, clues[5]}`). Preserved in full for the chat assistant.
