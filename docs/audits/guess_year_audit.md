# Audit — Guess The Year

**Candidate file:** `docs/candidates/guess-year-candidates.json` (28 events)
**Run:** overnight staging 2026-05-29
**Status:** AUDIT ONLY — do not merge as-is (see verdict). No fact yet verified.

## 1. Real target & schema (READ, not assumed)
- **This is a STATIC game, not Supabase.** Hook `src/hooks/useGuessTheYear.ts` imports `getDailyGuessTheYearPuzzle` from `src/data/guessTheYearPuzzles.ts`. There is **no `guess_year` table** in `supabase/migrations/`.
- **Schema** = TS interface `src/types/guessTheYear.ts`:
  ```ts
  interface YearPuzzle { year: number; clues: string[]; }
  ```
- **Merge target** = the array in `src/data/guessTheYearPuzzles.ts` (NOT a SQL migration). So no `DRAFT_*.sql` is produced for this game; staging = the curated list below + this audit.

## 2. Schema-fit verdict — DOES NOT MATCH ESTABLISHED FORMAT
The candidates are structurally valid (`year:number`, `clues:string[]`) but break the game's established style in two ways:
- **Clue count:** existing puzzles have **6 clues**; candidates have **4**.
- **Sport coverage:** existing puzzles are **multi-sport** (each year mixes NHL, MLB, NBA, NFL, college/Heisman, Olympics, soccer). **All 28 candidates are SOCCER-ONLY.** The autopilot notes explicitly asked to "cover multiple sports" — the candidates did not.
- Decision for Anthony: either (a) reject soccer-only 4-clue items, (b) reformat each kept item to the 6-clue multi-sport style, or (c) deliberately accept a new soccer-only sub-style. This is a design call, not a fact.

## 3. CRITICAL red flag — duplicate years (16 of 28 already exist live)
Existing years in `guessTheYearPuzzles.ts` (22): 1984, 1985, 1986, 1990, 1992, 1994, 1996, 1998, 2000, 2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2025.

| Candidate year | Already live? | Notes / red flags |
|---|---|---|
| 1986 | **DUP** | live 1986 = Maradona+Mets+Tyson (multi-sport). Candidate soccer-only. |
| 1999 | new | Man Utd treble. OK new year. |
| 2005 | new | Istanbul (Liverpool). OK new year. |
| 2012 | **DUP** | live 2012 multi-sport. |
| 2014 | **DUP** | live 2014 already includes the 7-1. |
| 2016 | **DUP** | live 2016 already includes Leicester 5000-1. |
| 2018 | **DUP** | live 2018 already includes France WC. |
| 2020 | **DUP** + **AMBIGUOUS YEAR** | "Euro 2020" was played in **2021** (COVID). Candidate answer-year is debatable; live 2020 uses different events. |
| 2022 | **DUP** | live 2022 already includes Messi WC. |
| 2024 | **DUP** | live 2024 multi-sport (Mbappé free transfer, etc.). |
| 2002 | **DUP** | live 2002 already includes Brazil WC. |
| 1994 | **DUP** | live 1994 already includes Brazil WC penalties. |
| 2010 | **DUP** | live 2010 already includes Spain WC. |
| 2008 | **DUP** | live 2008 already includes Spain Euro. |
| 2017 | new | Neymar 222M to PSG. OK new year. |
| 2003 | new | Beckham to Real Madrid. OK new year. |
| 2009 | new | Barça treble / 2-6 at Bernabéu. OK new year. |
| 2007 | new | Milan CL / Kaká Ballon d'Or. OK new year. |
| 2013 | new | Bayern all-German final. OK new year. |
| 2015 | new | Barça MSN treble Berlin. OK new year. |
| 2019 | new | Liverpool CL / Barça comeback. OK new year. |
| 2021 | new | Messi to PSG. OK new year. |
| 2023 | new | Man City UCL vs Inter. OK new year. |
| 2006 | **DUP** | live 2006 already includes Zidane headbutt. |
| 1990 | **DUP** | live 1990 already includes Germany WC. |
| 1998 | **DUP** | live 1998 already includes France WC. |
| 2011 | new | Barça 3-1 Man Utd Wembley. OK new year. |
| 2025 | **DUP** + **RECENCY** | live 2025 = Ovechkin/Chiefs/Luka trade. Candidate = Club World Cup/Chelsea (June-July 2025) — verify result & "Cole Palmer star". |

**Summary:** only **12 candidate years are NOT already live**: 1999, 2005, 2017, 2003, 2009, 2007, 2013, 2015, 2019, 2021, 2023, 2011. The other 16 would create duplicate-year puzzles if merged.

## 4. Facts I had to add
**None.** All clues come from the candidate file; I generated no new facts. (Years/clues still require source verification — flagged above.)

## 5. Recommendation (for human + chat assistant)
1. Discard the 16 duplicate-year candidates (or use them only to *replace*/enrich the existing multi-sport entry — a deliberate edit, not an append).
2. Of the 12 new-year items, decide the format question (§2) before merge.
3. Fact-check the 12 kept years — all soccer, generally well-known; specifically re-check 2025 Club World Cup (recent) and the 2020/Euro-2020 year convention.

## 6. Raw candidate dump
See `docs/candidates/guess-year-candidates.json` (28 items, each `{year, clues[4]}`, all soccer). Full values preserved there for the chat assistant to verify.
