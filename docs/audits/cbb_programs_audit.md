# Audit — CBB Programs seed (3.16)

**Draft:** `docs/staged-migrations/DRAFT_cbb_programs.sql` (24 programs)
**Target table:** `public.cbb_programs` (confirmed: `useCbbProgram` queries it). Unblocks P0-4.
**Status:** drafted — **ALL values are Claude-generated facts; verify before applying.** Nothing applied.

## 1. Real schema (read from migration 20260309020228)
`cbb_programs (id uuid, school_name text NOT NULL, common_names text[] NOT NULL, vibe_word text NOT NULL, region_hint text NOT NULL, conference_hint text NOT NULL, tournament_hint text NOT NULL, championships_hint text NOT NULL, mascot_hint text NOT NULL, difficulty text NOT NULL default 'easy', created_at)`. The 6 clues the game shows (`useCbbProgram.mapRow`) are: vibe_word, region_hint, conference_hint, tournament_hint, championships_hint, mascot_hint. The draft fills all required columns. ✓ schema-fit.

**Answer-matching note:** the game accepts a guess if it equals `school_name` OR any `common_names` entry (case-insensitive). I included colloquial names (e.g. "Zags", "Coogs", "Hoos") so guesses match — verify these are the forms you want accepted.

## 2. Facts I had to add — EVERYTHING (this whole game is new content)
Every field is generated from memory (cutoff Jan 2026). Highest-risk = championship counts and 2024-25 conference realignment. Verify each row.

| School | Champs claimed (VERIFY each) | Conference (VERIFY realignment) | Red flag |
|---|---|---|---|
| Duke | 5 (1991,92,2001,2010,2015) | ACC | — |
| North Carolina | 6 (1957,82,93,2005,09,17) | ACC | — |
| Kentucky | 8 (1948,49,51,58,78,96,98,2012) | SEC | high count — verify all 8 |
| Kansas | 4 (1952,88,2008,2022) | Big 12 | — |
| UCLA | 11 (10 under Wooden) | **Big Ten (moved 2024)** | verify realignment |
| Indiana | 5 (1940,53,76,81,87) | Big Ten | — |
| Connecticut (UConn) | 6 (1999,2004,2011,2014,**2023,2024**) | Big East | verify back-to-back 2023-24 (recent) |
| Villanova | 3 (1985,2016,2018) | Big East | — |
| Louisville | **2 recognized (1980,1986); 2013 VACATED** | ACC | ⚠️ decide how to present vacated 2013 |
| Florida | 3 (2006,2007,**2025**) | SEC | ⚠️ 2025 title is very recent — verify |
| Michigan State | 2 (1979,2000) | Big Ten | — |
| Michigan | 1 (1989) | Big Ten | — |
| Arizona | 1 (1997) | **Big 12 (moved 2024)** | verify realignment |
| Syracuse | 1 (2003) | ACC | — |
| Georgetown | 1 (1984) | Big East | — |
| Gonzaga | 0 (2 runner-up) | WCC | — |
| Houston | 0 (multiple Final Fours) | **Big 12 (joined 2023)** | verify realignment + that they have 0 titles |
| Baylor | 1 (2021) | Big 12 | — |
| Arkansas | 1 (1994) | SEC | — |
| Cincinnati | 2 (1961,1962) | **Big 12 (joined 2023)** | verify realignment |
| Ohio State | 1 (1960) | Big Ten | — |
| Maryland | 1 (2002) | Big Ten (joined 2014) | — |
| Virginia | 1 (2019) | ACC | — |
| NC State | 2 (1974,1983) | ACC | — |

## 3. Deliberate omissions / red flags
- **Memphis EXCLUDED** on purpose: its 2008 runner-up finish was vacated — a vacated-title trap like Louisville. Add later only with a clear convention.
- **Vacated-title convention:** Louisville's 2013 needs a project-wide rule (show as 2 or 3?). Flagged in the row.
- **Recency:** UConn 2024 and Florida 2025 are within but near the knowledge cutoff — double-check the champion and year.
- **Realignment:** UCLA→Big Ten, Arizona→Big 12, Houston & Cincinnati→Big 12 are all recent moves; basketball conference must be the *current* one for the game to be fair.
- Only 24 programs (brief suggested 30+). These are the highest-confidence blue-bloods/major programs; expand after this batch is verified.

## 4. Recommendation
Fact-check the championship counts + current conferences (the two error-prone fields), settle the vacated-title convention, then Anthony applies `DRAFT_cbb_programs.sql` manually. After it's in, the CBB game (already code-fixed in P0-4) becomes playable.
