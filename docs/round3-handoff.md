# DoUKnowBall — Round 3 Handoff
Date: 2026-05-25

## Round 2 summary (last commit before Round 3: 7a36a64)
See docs/round2-handoff.md for full Round 2 details. Key points carried forward:
- Total games: 38. Already wired to Supabase: 9. Needs wiring: 27. Partially wired: 5.
- Locked files (do NOT touch): src/hooks/useDailyPuzzle.ts, src/lib/dateUtils.ts, the 17 Phase B migrated hooks.

---

## Round 3 Session 1 — Footle wired (commit 78416ac)
Date: 2026-05-25

### Files changed
- `src/integrations/supabase/types.ts` — added `player_market_values` table definition
- `src/data/footleEnrichment.ts` (**new**, 336 lines) — kit number + league bridge data, ~150 player entries, CLUB_TO_LEAGUE fallback
- `src/lib/fetchFootlePlayerPool.ts` (**new**, 201 lines) — Supabase query, position normalizer, GOAT merge, tier assignment
- `src/hooks/useGame.ts` — playerPool state, isLoadingPool, async fetch on mount, buildPool/selectRandomPlayer parameterized
- `src/pages/Footle.tsx` — gate loading UI on `(isLoadingPool || isLoading)`

### Pattern established for remaining soccer hooks (apply Phase A→B→C→D for each)

1. **New `src/lib/fetch{Game}PlayerPool.ts`**
   - Supabase query (`player_market_values`, `year = 2026`, top 150 by rank)
   - Position normalizer (Transfermarkt strings → Position union)
   - GOAT merge: if GOAT name not in Supabase result, pull from hardcoded fallback
   - Per-position-group tier assignment
   - Returns `[]` on error/empty → caller falls back to hardcoded data

2. **New `src/data/{game}Enrichment.ts`**
   - `Record<string, { kitNumber: number; league: League }>` keyed by player name
   - `CLUB_TO_LEAGUE` fallback map (`Partial<Record<string, League>>`)
   - `getEnrichment(playerName, club)` helper
   - TODO comment: "TODO Round 3+: migrate to Supabase player_enrichment table"

3. **Modify the game hook**
   - Add `const [playerPool, setPlayerPool] = useState<Player[]>(hardcodedFallback)`
   - Add `const [isLoadingPool, setIsLoadingPool] = useState(true)`
   - Add `useEffect` with `fetchXxxPlayerPool().then(pool => { if (pool.length > 0) setPlayerPool(pool); setIsLoadingPool(false); })` + cleanup `cancelled` flag
   - Change `dailyPool` from `useRef` to `useMemo(() => buildPool(dailyTier, playerPool), [dailyTier, playerPool])`
   - Parameterize `buildPool(tier, pool)` and `selectRandomPlayer(diff, pool)`
   - Return `isLoadingPool`

4. **Modify the page component**
   - Destructure `isLoadingPool` from hook
   - Gate loading UI: `(isLoadingPool || isLoading)` instead of just `isLoading`

5. **Keep `src/data/{game}.ts` as runtime fallback — do NOT delete**

### Tier assignment rule
Within each position group, sorted DESC by market value:
- Top 60% → **easy**
- Next 35% → **hard**
- Bottom 5% → **insane**

### GOAT allowlist (13 names — always included even if outside top-150)
Lionel Messi, Cristiano Ronaldo, Neymar, Zlatan Ibrahimovic, Karim Benzema, Andrés Iniesta, Xavi, Luka Modric, Robert Lewandowski, Sergio Ramos, Gareth Bale, Kylian Mbappé, Luis Suárez

---

## Next: Round 3 Session 1b — remaining soccer hooks

Apply the Phase A→B→C→D process for each. Note: not all of these fit the Footle player-pool pattern — some involve career history or transfer data and will need a custom design in Phase B.

1. **useCareerGame** — `src/data/careerPlayers.ts`, 2,874 lines. Biggest file. Career history data (clubs played for, in order) — likely needs a different Supabase table (not just player_market_values). Phase A should clarify what data exists.
2. **useConnections** — `src/data/connectionsPuzzles.ts`, 1,799 lines. Puzzle/grouping data, not a player pool. Each puzzle is 4 groups of 4 items with a theme. Very different pattern — may need a `connections_puzzles` Supabase table.
3. **useGuessSoccerClub** — guess-soccer-club data, 1,151 lines. Closer to Footle pattern (club attributes to guess), but clubs not players.
4. **useShirtNumber** — unknown line count. Investigate in Phase A.
5. **useTransferPath** — unknown line count. Likely transfer history data. Investigate in Phase A.
6. **useSoccerGrid** — puzzles hardcoded, partially wired (user selections already in Supabase). Different pattern: puzzle grid content needs wiring, not a player pool.

---

## Outstanding from Round 2 user testing (still unfixed)

These were marked "already correct" in Round 2 but the user reported them as still broken:

- **Homepage counter flicker every second** (Round 2 FIX 5 said already correct — `fetchStats` has `[]` dep + 5min interval — but user still saw flicker. Bug may be in a different component re-rendering. Has not been re-investigated.)
- **0/44 daily counter doesn't increment for non-grid games** (Round 2 FIX 8 covered grids only — all 3 grid hooks call `useGameCompletion`. Non-grid games may not write to `daily_completions`, or the Index.tsx read query may be wrong.)
- **Autocomplete suggestions feel sparse** — user reported despite Round 2 fixes. Not re-investigated.
- **Football Grid: "100% picked" should show 🦄 Unicorn for N=1** — Unicorn badge was added in Round 2 for `rarity > 100`. Verify this condition is correct in next playtest (may need to check the rarity threshold logic).

Revisit these in a dedicated bug-fix round (Round 4 or 5) after data wiring is complete.

---

## Working style notes for next Claude
- User wants minimal preamble, direct answers
- Push back when user wants to skip testing or bulk-fix without scoping
- User commits in single batches per round, not per-fix
- No AI attribution in commits (no "Co-Authored-By", no "Generated with Claude")
- Bun is the package manager, path: `/c/Users/antho/.bun/bin/bun`
- Always run TSC after edits: `/c/Users/antho/.bun/bin/bun x tsc --noEmit`
- Locked files (do NOT touch): `src/hooks/useDailyPuzzle.ts`, `src/lib/dateUtils.ts`, the 17 Phase B migrated hooks
- Phase workflow: A (read/investigate) → B (design, stop and report) → C (implement, one file at a time with TSC) → D (final TSC + git status/diff + STOP for commit approval)
- DO NOT commit until user explicitly approves

## Sport → Supabase table mapping (reference)
- Soccer → `player_market_values` (176,415 rows)
- NFL → `nflfastr_player_stats` (134,470 rows)
- College → `ncaa_player_stats` (43,800 rows)
- NHL → `nhl_draft` (26,138 rows)
- NBA → `nba_players_extended_v2` (5,135 rows)
- MLB → Lahman tables: batting, pitching, fielding, allstar, appearances (~422K rows)
- UFC/MMA → `ufc_fights_v2` (3,917 rows)
- F1, Tennis, NASCAR, Olympic, Golf → pending design
