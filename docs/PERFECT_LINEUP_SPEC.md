# Perfect Lineup — Game Spec (TASK 2)

A "Build-a-squad-under-random-constraints" game inspired by the **82-0** viral format.
Captures the three virality drivers from Anthony's research:

1. **Shareable result card** — a simulated scoreline + squad grade, posted to brag (reuses `ShareButtons`).
2. **Discovery layer** — each slot's constraint surfaces obscure-but-real players ("did you know X plays in the Saudi Pro League?"); ties into TASK 3's "did you know" facts.
3. **Randomized-constraint mechanic** — every slot can carry a league/nationality constraint, forcing tradeoffs (you can't just pick the best XI).

## Player data availability (checked, no Supabase query needed)

| Sport | Source | Fields | Verdict |
|---|---|---|---|
| **Soccer** | `src/data/players.ts` (748 players) | name, club, **league**, **nationality**, **position**, **marketValue**, goals, assists, age, difficulty | ✅ **Build now, fully client-side.** Positions & leagues are well-distributed (GK 41, CB 78, ST 165; Premier League 231, Serie A 103, La Liga 87, Bundesliga 65, Ligue 1 52, plus 30+ more leagues). |
| **NBA** | `src/data/nbaStats.ts`, `src/data/nbaTeams.ts`, `src/data/lineupTeams.ts` | players, teams, stats | 🟡 **Build second.** Need to confirm per-player position + a power metric exist in local data; if so, same client-side approach. Scoped below; not yet built. |
| Historical/era constraints (e.g. "2004 Arsenal") | Supabase `career_seasons`, `soccer_careers`, `soccer_career_clubs` | season-by-season rosters | ⛔ **Needs Anthony's Supabase access** — logged in `docs/ANTHONY_TODO.md` as a v2 enhancement. v1 uses the current-player pool with league/nationality constraints instead of era. |

## v1 Soccer mechanic (shipped client-side)

- **Formation:** 4-3-3, 11 slots. Each slot has a position label and a set of acceptable source positions (e.g. `RW` accepts `RW, RM, CF, ST`; `CDM` accepts `CDM, CM`).
- **The roll:** a seeded RNG assigns ~6 of the 11 slots a constraint — either a **league** (`Serie A`) or a **nationality** (`Brazil`). Only values with ≥4 eligible players for that position group are used, guaranteeing every slot is solvable. Remaining slots are wildcard (any player of that position).
  - **Daily** = date-seeded roll (everyone gets the same lineup challenge). **Unlimited** = fresh random roll on demand.
- **Pick phase:** tap a slot → search dialog lists every eligible player (position + constraint, not already used). Picking obscure valid players is encouraged (discovery).
- **Simulate:** once all 11 are filled, a deterministic pure function scores the squad:
  - `power(p)` = clamp(marketValue, 1, 200).
  - `avgPower` → normalized to 0-100 (150 €M avg ≈ elite).
  - `chemistry` (0-100) = share of players who match ≥1 teammate's league and/or nationality.
  - `rating` = `0.75 * normPower + 0.25 * chemistry`.
  - Scoreline (82-0 homage): `goalsFor` scales with rating (elite squads blow out, +3 bonus at rating ≥ 90); `goalsAgainst` inversely.
  - `grade`: A+/A/B/C/D by rating threshold.
  - Per-slot grade (🟩/🟨/⬛ by player power) → emoji grid on the share card.
- **Result card:** scoreline + grade + chemistry% + squad value, shared via `ShareButtons` (text + image card from TASK 1).

## Scoring is deterministic
Same 11 players always produce the same result, so shared cards are reproducible and the daily is fair.

## File plan (v1)
- `src/data/perfectLineup.ts` — formation, constraint config, seeded RNG, `rollLineup`, `eligiblePlayers`, `simulate`, types.
- `src/hooks/usePerfectLineup.ts` — state machine (roll daily/unlimited, pick, clear, simulate, reset).
- `src/components/perfect-lineup/PerfectLineupBoard.tsx` — slots grid + pick dialog + result.
- `src/pages/PerfectLineup.tsx` — page wrapper (SEO, nav, footer).
- Route `/perfect-lineup` in `App.tsx`; entry in `src/data/gameRegistry.ts` (Soccer category).

## NBA version (scoped, build next)
Same engine, different formation/slots: **starting 5** (PG, SG, SF, PF, C) with constraints on **team** and/or **draft era/decade**. Requires each NBA player record to carry a position and a power metric (PER/market-equivalent). If `nbaStats.ts` lacks position or a rating, log the gap to `ANTHONY_TODO.md` and either derive a proxy rating from available stats or seed a small curated pool. Simulation reuses the soccer `simulate` shape (rating → point differential instead of goals).

## Out of scope for v1 (future)
- Era/historical-roster constraints (Supabase).
- Server-persisted daily leaderboard for Perfect Lineup (could reuse `user_game_scores`).
- Multiplayer head-to-head.
