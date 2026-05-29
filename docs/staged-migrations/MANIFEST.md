# Staged Migrations Manifest

Every draft content migration lives in `docs/staged-migrations/` with a `DRAFT_` prefix
and a top-of-file banner: `-- DRAFT — NOT FACT-VERIFIED — DO NOT APPLY UNTIL SIGNED OFF`.

**Firewall rule:** Claude Code never applies these. A draft becomes shippable only after
its status here is moved to `verified` by Anthony / his chat assistant. Then Anthony applies it.

**IMPORTANT target finding (overnight run):** many games are **static TS data files**, not Supabase tables. For those there is no SQL migration to apply — the merge target is the `src/data/*.ts` array, and staging = the audit report's curated list. SQL drafts are produced only for genuinely table-backed games (e.g. `guess_nation_countries`, `soccer_club_puzzles`, `cbb_programs`, `shirt_number_puzzles`).

| Game | Target | Format | Audit / draft | Rows in candidates | Status |
|---|---|---|---|---|---|
| Guess The Year | `src/data/guessTheYearPuzzles.ts` (STATIC, no table) | TS merge | `docs/audits/guess_year_audit.md` | 28 (only 12 non-dup) | drafted (audit) — needs format decision + fact-check |

Status values: `drafted` → `verified` → `applied`
