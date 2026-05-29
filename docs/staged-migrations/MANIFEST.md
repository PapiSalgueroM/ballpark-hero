# Staged Migrations Manifest

Every draft content migration lives in `docs/staged-migrations/` with a `DRAFT_` prefix
and a top-of-file banner: `-- DRAFT — NOT FACT-VERIFIED — DO NOT APPLY UNTIL SIGNED OFF`.

**Firewall rule:** Claude Code never applies these. A draft becomes shippable only after
its status here is moved to `verified` by Anthony / his chat assistant. Then Anthony applies it.

**IMPORTANT target finding (overnight run):** many games are **static TS data files**, not Supabase tables. For those there is no SQL migration to apply — the merge target is the `src/data/*.ts` array, and staging = the audit report's curated list. SQL drafts are produced only for genuinely table-backed games (e.g. `guess_nation_countries`, `soccer_club_puzzles`, `cbb_programs`, `shirt_number_puzzles`).

| Game | Target | Format | Audit / draft | Rows in candidates | Status |
|---|---|---|---|---|---|
| Guess The Year | `src/data/guessTheYearPuzzles.ts` (STATIC, no table) | TS merge | `docs/audits/guess_year_audit.md` | 28 (only 12 non-dup) | drafted (audit) — needs format decision + fact-check |
| Guess The College | UNDECIDED (not colleges.ts, not cbb_programs) | — | `docs/audits/guess_college_audit.md` | 20 (all already in colleges.ts) | audit only — target undecided; no SQL (won't guess schema) |
| Connections fix (4.2) | `connections_puzzles` (broken batch quarantined) | analysis | `docs/audits/connections_fix_audit.md` | — | diagnosed — soccer-data.json tournament_winners mis-keyed (6/8). Not regenerated. |
| Connections 30 "good" (4.3) | — | locate | `docs/audits/connections_fix_audit.md` | 0 found | puzzle-156→185 DO NOT EXIST in repo (max present = 155). Need reconstruction. |
| CBB Programs (3.16) | `cbb_programs` (TABLE) | `DRAFT_cbb_programs.sql` + `docs/audits/cbb_programs_audit.md` | 24 | **verified** 2026-05-29 (Anthony) — 23/24 correct; Michigan fixed to 2 titles (1989, 2026). Cleared to apply. Unblocks P0-4. |
| Guess The Nation (3.4) | `guess_nation_countries` (TABLE — **Olympics schema**) | `docs/audits/guess_nation_audit.md` | 33 (soccer) | audit only — candidate is SOCCER data, table is OLYMPICS schema. MISMATCH, no SQL. |

Status values: `drafted` → `verified` → `applied`
