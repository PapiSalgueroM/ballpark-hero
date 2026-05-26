# DoUKnowBall — Round 3 Handoff
Date: 2026-05-25

> **Round 3 status: ALL soccer hooks wired to Supabase + cleanup queue clear. 7 games live on Supabase. Round 4 (puzzle generators) is the next major phase.**

## Round 2 summary (last commit before Round 3: 7a36a64)
See docs/round2-handoff.md for full Round 2 details. Key points carried forward:
- Total games: 38. Already wired to Supabase: 9. Needs wiring: 27. Partially wired: 5.
- Locked files (do NOT touch): src/hooks/useDailyPuzzle.ts, src/lib/dateUtils.ts, src/hooks/useShirtNumber.ts, src/hooks/useCareerGame.ts, src/hooks/useTransferPath.ts, src/hooks/useGuessSoccerClub.ts, src/hooks/useSoccerGrid.ts, src/hooks/useConnections.ts, the 17 Phase B migrated hooks.

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

## Round 3 Session 1b — Shirt Number wired (commit 053a9bb)
Date: 2026-05-25

### Files changed
- `supabase/migrations/20260525000001_shirt_number_puzzles.sql` (**new**) — CREATE TABLE + RLS public-read + 32 seed INSERTs. **Applied successfully in Supabase dashboard — 32 rows confirmed.**
- `src/integrations/supabase/types.ts` — added `shirt_number_puzzles` table definition
- `src/lib/fetchShirtNumberPuzzles.ts` (**new**) — SELECT all rows, snake_case → camelCase mapping, returns `[]` on error
- `src/hooks/useShirtNumber.ts` — migrated to `useDailyPuzzle` (kills UTC timezone bug), `puzzlePool` state + `isLoadingPool`, `ShirtGuess` type carries correctness, derived hint and score from guesses array
- `src/components/shirt-number/ShirtNumberBoard.tsx` — loading early-return gate on `(isLoadingPool || isLoading || !puzzle)`

### Pattern established for puzzle-list games (different from Footle's player-pool pattern)

Use this pattern for Connections, any other curated puzzle lists.

1. **New Supabase table `{game}_puzzles`** — same shape as existing hardcoded data file
2. **SQL migration file** — `supabase/migrations/YYYYMMDDHHMMSS_{game}_puzzles.sql` with:
   - `CREATE TABLE` + `ENABLE ROW LEVEL SECURITY` + public-read SELECT policy
   - Seed `INSERT` from existing hardcoded data
   - **Apply manually in Supabase dashboard SQL editor** (no CLI)
3. **New `src/lib/fetch{Game}Puzzles.ts`** — `SELECT *`, `ORDER BY created_at ASC`, snake_case → camelCase mapping, returns `[]` on error
4. **Modify the hook**:
   - Replace custom date-seeding + custom localStorage with `useDailyPuzzle` (fixes timezone bugs)
   - Add `const [puzzlePool, setPuzzlePool] = useState<T[]>(hardcodedFallback)`
   - Add `const [isLoadingPool, setIsLoadingPool] = useState(true)`
   - `useEffect` fetch on mount with `cancelled` cleanup flag
   - If guess type needs custom logic, define a local `XxxGuess` type that carries its own correctness so `isWon` stays pure
5. **Modify board/page component** — loading early-return: `if (isLoadingPool || isLoading || !puzzle) return <loading>`
6. **Keep `src/data/{game}.ts` as runtime fallback — do NOT delete**
7. **Add hook to locked-files list after migration**

### Locked files updated
`src/hooks/useShirtNumber.ts` is now locked — **do NOT re-migrate**. Uses `useDailyPuzzle` internally.

### Pool size
32 seed puzzles. Anthony can add more rows via Supabase admin dashboard at any time — no code deploy needed.

---

## Round 3 Session 1c — Phase A complete, Phase B APPROVED, Phase C deferred
Date: 2026-05-25

### Phase A findings (read-only)

**TransferPath Phase A** (completed first):
- `src/data/transferPathPuzzles.ts` — 118 lines, **20 puzzles** (4 one-step, 10 two-step, 6 three-step)
- Each puzzle: `{ id, playerA, playerB, minSteps, oneOptimalPath, hint }` — `oneOptimalPath` stored but NOT used at runtime (documentation only)
- Hook also imports `careerPlayers` from `src/data/careerPlayers.ts` and builds a module-level `PLAYER_CLUBS` map for validation
- Custom `getDateSeed()` — UTC timezone bug present, no `useDailyPuzzle`
- Pattern: **"puzzle list + validation graph"** — neither Footle nor ShirtNumber; needs BOTH puzzle list AND career data in Supabase

**CareerGame Phase A** (redirected — wire CareerGame first since it owns the shared career data):
- `useCareerGame.ts` — **already uses `useDailyPuzzle`** (one of the 17 Phase B hooks). No date-seeding migration needed.
- `src/data/careerPlayers.ts` — 2,874 lines, **158 players**, **1,764 total career season rows**, avg **11.2 seasons/player**
- `CareerPlayer` fields: `name`, `nationality`, `position`, `career: CareerSeason[]`
- `CareerSeason` fields: `season`, `club`, `goals`, `assists`, `appearances`, `marketValue` — **no `league`, `image`, `logo`, `difficulty`, or `tier` fields**
- `careerPlayers` is imported by 3 consumers: `useCareerGame`, `useTransferPath`, `SoccerGridSearch` — all will eventually share the same Supabase fetch
- `CareerGame.tsx` already has a loading guard (`isLoading`). No IP issues — all club data is plain text strings, no logos or photos.
- `soccerCareerEngine.ts` (4,166 lines) is a separate career *simulation* game — NOT in scope

### Phase B design — APPROVED verbatim

#### Two migration files (reserved filenames)
- `supabase/migrations/20260525000002_career_tables.sql` — ~50 lines, schema + RLS + indexes only
- `supabase/migrations/20260525000003_career_seed.sql` — ~1,940 lines, seed data only
- **Apply schema FIRST, seed SECOND** — seed references player UUIDs defined in schema migration

#### CREATE TABLE — career_players
```sql
CREATE TABLE public.career_players (
  id          UUID                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT                     NOT NULL UNIQUE,
  nationality TEXT                     NOT NULL,
  position    TEXT                     NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.career_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read career players"
  ON public.career_players FOR SELECT
  TO public USING (true);

CREATE INDEX career_players_name_idx ON public.career_players (player_name);
```

#### CREATE TABLE — career_seasons
```sql
CREATE TABLE public.career_seasons (
  id           UUID     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id    UUID     NOT NULL REFERENCES public.career_players(id) ON DELETE CASCADE,
  season       TEXT     NOT NULL,
  club         TEXT     NOT NULL,
  goals        INTEGER  NOT NULL DEFAULT 0,
  assists      INTEGER  NOT NULL DEFAULT 0,
  appearances  INTEGER  NOT NULL DEFAULT 0,
  market_value INTEGER  NOT NULL DEFAULT 0,
  sort_order   SMALLINT NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.career_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read career seasons"
  ON public.career_seasons FOR SELECT
  TO public USING (true);

CREATE INDEX career_seasons_player_id_idx ON public.career_seasons (player_id);
CREATE INDEX career_seasons_sort_order_idx ON public.career_seasons (player_id, sort_order);
```

**Why `sort_order`?** Some players have two entries for the same season string (e.g. Enzo Fernández: `"2022-2023"` at Benfica AND `"2022-2023"` at Chelsea after a January transfer). `ORDER BY season` alone cannot break this tie correctly. `sort_order` is the 0-indexed position in the original `career[]` array — the only reliable ordering key.

**Why `UNIQUE` on `player_name`?** Seed uses pre-assigned UUIDs so no sub-SELECT needed, but uniqueness prevents accidental duplicates.

#### Seed file strategy — pre-assigned sequential UUIDs
```sql
-- career_players (158 rows, pre-assigned UUIDs)
INSERT INTO public.career_players (id, player_name, nationality, position) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Cristiano Ronaldo', 'Portugal', 'ST'),
  ('a0000001-0000-0000-0000-000000000002', 'Lionel Messi',      'Argentina', 'RW'),
  ... -- 158 rows
;

-- career_seasons (1,764 rows, player_id = matching literal UUID — NO sub-SELECT)
INSERT INTO public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) VALUES
  ('a0000001-0000-0000-0000-000000000001', '2003-2004', 'Manchester United', 6, 8, 40, 8, 0),
  ('a0000001-0000-0000-0000-000000000001', '2004-2005', 'Manchester United', 9, 5, 50, 15, 1),
  ... -- 1,764 rows grouped by player
;
```
**Claude Code generates inline from `careerPlayers.ts` in Phase C — no external script.**

#### fetchCareerPlayers.ts — two parallel queries, join in TypeScript
```ts
// src/lib/fetchCareerPlayers.ts
const [playersResult, seasonsResult] = await Promise.all([
  supabase
    .from('career_players')
    .select('id, player_name, nationality, position')
    .order('player_name', { ascending: true }),
  supabase
    .from('career_seasons')
    .select('player_id, season, club, goals, assists, appearances, market_value, sort_order')
    .order('player_id', { ascending: true })
    .order('sort_order', { ascending: true }),
]);

// Group seasons by player_id, map to CareerPlayer[]
const seasonsByPlayer = new Map<string, CareerSeason[]>();
for (const s of seasonsResult.data) {
  if (!seasonsByPlayer.has(s.player_id)) seasonsByPlayer.set(s.player_id, []);
  seasonsByPlayer.get(s.player_id)!.push({
    season: s.season, club: s.club, goals: s.goals, assists: s.assists,
    appearances: s.appearances, marketValue: s.market_value,
  });
}
return playersResult.data.map(p => ({
  name: p.player_name, nationality: p.nationality, position: p.position,
  career: seasonsByPlayer.get(p.id) ?? [],
}));
// Returns [] on any error — caller falls back to careerPlayers.ts
```

#### useCareerGame.ts — 5 call sites to update + new state
New state (same pattern as Footle/ShirtNumber):
```ts
const [playerPool, setPlayerPool] = useState<CareerPlayer[]>(fallbackPlayers);
const [isLoadingPool, setIsLoadingPool] = useState(true);
useEffect(() => {
  let cancelled = false;
  fetchCareerPlayers().then(pool => {
    if (cancelled) return;
    if (pool.length > 0) setPlayerPool(pool);
    setIsLoadingPool(false);
  });
  return () => { cancelled = true; };
}, []);
```

The 5 `careerPlayers` → `playerPool` substitutions:
1. `useDailyPuzzle({ puzzles: careerPlayers, ... })` → `puzzles: playerPool`
2. `useState<CareerPlayer>(() => careerPlayers[Math.floor(...)])` → `fallbackPlayers[Math.floor(...)]` (init runs before fetch, fallback is correct)
3. `targetPlayer = dailyPuzzle ?? careerPlayers[0]` → `?? playerPool[0]`
4. `setUnlimitedPlayer(careerPlayers[Math.floor(...)])` in `resetGame` → `playerPool[Math.floor(...)]`
5. `ensureAnswerInOptions(careerPlayers.map(p => p.name), ...)` in `playerNames` → `playerPool.map(...)`

Return: add `isLoadingPool` to returned object.

#### CareerGame.tsx — one guard update
```tsx
// Destructure: add isLoadingPool
// Loading guard line ~133:
{(isLoadingPool || isLoading) ? (   // was: isLoading
```

#### types.ts additions
Add `career_players` (Relationships: []) and `career_seasons` (Relationships: with `career_seasons_player_id_fkey` → `career_players`) to `Database["public"]["Tables"]`. See Phase B report for full verbatim type definitions.

#### Phase C order
1. Write `20260525000002_career_tables.sql` (no TSC)
2. Write `20260525000003_career_seed.sql` (no TSC) — ⚠️ **1,940 lines, generated inline from careerPlayers.ts**
3. Remind Anthony: apply schema migration first, seed migration second in Supabase dashboard
4. `types.ts` → TSC
5. `src/lib/fetchCareerPlayers.ts` → TSC
6. `src/hooks/useCareerGame.ts` → TSC
7. `src/pages/CareerGame.tsx` → TSC
8. Final TSC + git status/diff + STOP

#### After CareerGame is wired (Session 1d+)
- `useTransferPath` reuses `fetchCareerPlayers()` directly — only needs `name`, `nationality`, `career[].club`
- `SoccerGridSearch` reuses `fetchCareerPlayers()` — only needs `name`
- No additional Supabase tables needed for either

---

## Round 3 Session 1c Phase C — CareerGame wired (commit 4804e93)
Date: 2026-05-26

### Result
CareerGame is now genuinely live on Supabase data.

### Supabase migrations applied (manually via SQL Editor)
- `supabase/migrations/20260525000002_career_tables.sql` — `career_players` + `career_seasons` schema, RLS public-read, FK with ON DELETE CASCADE, indexes on `player_name` and `(player_id, sort_order)` composite. **Applied first.**
- `supabase/migrations/20260525000003_career_seed.sql` — 151 players + 1,877 season rows, pre-assigned sequential UUIDs `a0000001-...-000001` through `...-000151`. **Applied second.**
- **Confirmed in Supabase Table Editor:** `career_players` 151 rows ✓, `career_seasons` 1,877 rows ✓

### Duplicate player resolution (7 names in 158 source entries → 151 unique)
- **First occurrence kept:** Lamine Yamal, Enzo Fernández (more complete season data)
- **Second occurrence kept:** Pedri, Gavi, Cole Palmer, Jude Bellingham, Alejandro Garnacho (newer stats or correct position)

### `sort_order` column
Added to `career_seasons` to handle mid-season transfer rows (e.g. Enzo Fernández 2022-23 Benfica + Chelsea) where `season` string alone cannot break the tie. 0-indexed position in original `career[]` array.

### Files changed (commit 4804e93)
- `supabase/migrations/20260525000002_career_tables.sql` (**new**)
- `supabase/migrations/20260525000003_career_seed.sql` (**new**, 2,021 lines)
- `src/integrations/supabase/types.ts` — `career_players` + `career_seasons` table definitions with FK relationship
- `src/lib/fetchCareerPlayers.ts` (**new**) — two parallel Supabase queries via `Promise.all`, TypeScript-side join grouping seasons by `player_id`, returns `[]` on error
- `src/hooks/useCareerGame.ts` — `playerPool` state + `isLoadingPool`, async fetch on mount with `cancelled` cleanup, 5 `careerPlayers` references updated to `playerPool` (unlimited init keeps `fallbackPlayers` for sync render)
- `src/pages/CareerGame.tsx` — loading guard updated to `(isLoadingPool || isLoading)`

### Locked files updated
`src/hooks/useCareerGame.ts` is now locked — **do NOT re-migrate.**

### Career schema ready to template
`career_players` + `career_seasons` establish the pattern for future wiring of:
- Hockey Career (hockeyCareerPlayers.ts)
- Baseball Career (baseballCareerPlayers.ts)
- NFL Career Path (nflCareer.ts)

### Downstream reuse
- `useTransferPath` (Session 1d) — can call `fetchCareerPlayers()` directly, no new Supabase tables needed for career data. Only needs `transfer_path_puzzles` table for its 20 curated puzzles + `useDailyPuzzle` migration.
- `SoccerGridSearch` — can call `fetchCareerPlayers()` directly, only needs player `name`.

---

## Round 3 Session 1d — TransferPath wired (commit 1264103)
Date: 2026-05-26

### Result
TransferPath is now live on Supabase data. 4 games genuinely wired: Footle, Shirt Number, CareerGame, TransferPath.

### Supabase migration applied
- `supabase/migrations/20260526000001_transfer_path_puzzles.sql` — schema + 20-row seed in a single file, RLS public-read, indexes on `puzzle_id` and `sort_order`. **Applied manually via Supabase SQL Editor. Confirmed: 20 rows live.**
- Reuses `career_players` + `career_seasons` from Session 1c — no new career schema needed.

### Files changed (commit 1264103)
- `supabase/migrations/20260526000001_transfer_path_puzzles.sql` (**new**)
- `src/lib/fetchTransferPathPuzzles.ts` (**new**) — SELECT ORDER BY sort_order, snake→camel, returns `[]` on error. `oneOptimalPath` intentionally omitted (unused at runtime).
- `src/integrations/supabase/types.ts` — `transfer_path_puzzles` table definition added
- `src/data/transferPathPuzzles.ts` — `oneOptimalPath` made optional (`oneOptimalPath?: string[]`), kept as runtime fallback
- `src/hooks/useTransferPath.ts` — full rewrite:
  - Dual fetch on mount via `Promise.all(fetchTransferPathPuzzles, fetchCareerPlayers)` — single combined `isLoadingPool`
  - Migrated to `useDailyPuzzle` (kills custom `getDateSeed` UTC bug)
  - Action-based event log: `{t:'step',player,club} | {t:'won'}` — same pattern as CareerGame
  - `getAllPlayerNames`, `getPlayerNationality`, `getPlayerClubs` moved from module-level exports to memoized closures returned from the hook (Option A from Phase B design)
  - `addPlayer` unified handler preserves auto-completion (when user adds a player who connects directly to playerB, playerB auto-appended)
  - Removed: `buildClubIndex`, `PLAYER_CLUBS`, `getDateSeed`, `loadDaily`, `saveDaily`
- `src/components/transfer-path/TransferPathBoard.tsx` — removed named helper imports, destructures helpers from hook return, added loading gate, fixed stale `allNames` `useMemo` dep (was `[]`, now `[getAllPlayerNames]`)

### Locked files updated
`src/hooks/useTransferPath.ts` is now locked — **do NOT re-migrate.**

### 4 games live on Supabase
| Game | Table(s) | Session |
|---|---|---|
| Footle | `player_market_values` | 1a |
| Shirt Number | `shirt_number_puzzles` | 1b |
| CareerGame | `career_players`, `career_seasons` | 1c |
| TransferPath | `transfer_path_puzzles` + reuses career tables | 1d |

### Career schema templating
`career_players` + `career_seasons` ready to template:
- Hockey Career (`hockeyCareerPlayers.ts`)
- Baseball Career (`baseballCareerPlayers.ts`)
- NFL Career Path (`nflCareer.ts`)

---

## Round 3 Session 1e — GuessSoccerClub wired (commit f3f179e)
Date: 2026-05-26

### Result
GuessSoccerClub is now live on Supabase data. 5 games genuinely wired: Footle, Shirt Number, CareerGame, TransferPath, GuessSoccerClub.

### Supabase migration applied
- `supabase/migrations/20260526000002_soccer_club_puzzles.sql` — schema + RLS public-read + indexes on `puzzle_id` and `league` + 79-row seed in 3 chunks, all in one file. Uses Postgres `TEXT[]` for `common_names` with `ARRAY[...]` seed syntax. **Applied manually in Supabase SQL Editor. Confirmed: 79 rows live, `common_names` TEXT[] arrays verified rendering correctly.**

### Key design notes
- `common_names` stored as `TEXT[]` — Postgres array, seeded with `ARRAY['alias1','alias2',...]` syntax. Returned by Supabase client as JS `string[]`.
- Indexes on `puzzle_id` (UNIQUE lookups) and `league` (leagueFilter mode filters in-memory, but index available for future direct queries).
- `fetchSoccerClubPuzzles.ts` SELECTs flat snake_case columns and reconstructs the nested `clues: { vibe, leagueHint, leagueTitles, kitColors }` object in TypeScript — Supabase table stays flat.
- **No `useDailyPuzzle` migration needed** — game doesn't persist mid-game state across page loads (puzzle is chosen on click, not on mount). Different from CareerGame/ShirtNumber/TransferPath.
- **UTC bug fixed**: daily puzzle selection now uses `getTodayET() + dateSeed()` from locked `src/lib/dateUtils.ts` instead of the old `new Date()` local-time diff. All users share the same midnight ET rollover.
- `allClubNames` (flat sorted alias list for autocomplete) is now a `useMemo` over `puzzlePool` returned from the hook — `ClubSearch.tsx` static import removed.
- Three module-level helpers (`getDailySoccerClubPuzzle`, `getRandomSoccerClubPuzzle`, `resolvePuzzleByName`) replaced by hook-internal closures over `puzzlePool`.

### Files changed (commit f3f179e)
- `supabase/migrations/20260526000002_soccer_club_puzzles.sql` (**new**)
- `src/lib/fetchSoccerClubPuzzles.ts` (**new**) — SELECT ORDER BY sort_order, snake→camel + clues reconstruction, returns `[]` on error
- `src/integrations/supabase/types.ts` — `soccer_club_puzzles` table definition added (`common_names: string[]`)
- `src/hooks/useGuessSoccerClub.ts` — pool state + `isLoadingPool`, fetch on mount with `cancelled` cleanup, `allClubNames` memo, three internal helper closures, UTC-safe daily selection
- `src/components/guess-soccer-club/ClubSearch.tsx` — removed static `allClubNames` import, accepts it as prop
- `src/components/guess-soccer-club/GuessSoccerClubBoard.tsx` — loading gate on mode-selection screen, passes `allClubNames` prop to `ClubSearch`

### Locked files updated
`src/hooks/useGuessSoccerClub.ts` is now locked — **do NOT re-migrate.**

### 5 games live on Supabase
| Game | Table(s) | Session |
|---|---|---|
| Footle | `player_market_values` | 1a |
| Shirt Number | `shirt_number_puzzles` | 1b |
| CareerGame | `career_players`, `career_seasons` | 1c |
| TransferPath | `transfer_path_puzzles` + reuses career tables | 1d |
| GuessSoccerClub | `soccer_club_puzzles` | 1e |
| SoccerGrid | `soccer_grid_puzzles` | 1f |

---

## Round 3 Session 1f — SoccerGrid wired (commit 11d3895)
Date: 2026-05-27

### Result
SoccerGrid is now genuinely live on Supabase data. 6 games genuinely wired: Footle, Shirt Number, CareerGame, TransferPath, GuessSoccerClub, SoccerGrid.

### Supabase migration applied
- `supabase/migrations/20260526000003_soccer_grid_puzzles.sql` — schema + RLS public-read + indexes on `puzzle_id` and `sort_order` + 15-row seed, all in one file. Uses Postgres JSONB for `rows_json`/`cols_json` (each puzzle is always read whole — JSONB avoids a JOIN and child table). **Applied manually in Supabase SQL Editor. Confirmed: 15 rows live, `rows_json` verified parsing as JS array (not raw string).**

### Key design notes
- **Approach B** — `supabasePuzzle` + `getPuzzleId` override on `useDailyPuzzle`. Future-proofs rotation for Round 4 puzzle expansion: new puzzles added to Supabase automatically enter the rotation via `dateSeed % puzzlePool.length`. Approach A would have locked the rotation to the initial 15 hardcoded puzzles forever.
- `todaysPuzzle` computed in `useMemo` over `puzzlePool` using `dateSeed(getTodayET()) % puzzlePool.length`. Passed as `supabasePuzzle` to `useDailyPuzzle`.
- `puzzles: soccerGridPuzzles` still passed as the stable module-level ref required by `useDailyPuzzle`'s dep array constraint (the `puzzles` param is intentionally excluded from its `useMemo` deps). Code comments in the hook explain why so future maintainers don't remove it.
- `isLoadingPool` gate added — prevents Round 4 mid-game puzzle resets: without it, if Supabase loads a larger pool and `puzzleIndex` changes, `useDailyPuzzle` would reset mid-game guesses.
- All existing functionality preserved: rarity queries against `soccer_grid_selections`, `soccer-grid-validate` edge function invocation, `soccer_grid_selections` insert on correct answer, `useGameCompletion`.

### Files changed (commit 11d3895)
- `supabase/migrations/20260526000003_soccer_grid_puzzles.sql` (**new**)
- `src/lib/fetchSoccerGridPuzzles.ts` (**new**) — SELECT ORDER BY sort_order, JSONB cast to `SoccerGridAttribute[]`, returns `[]` on error
- `src/integrations/supabase/types.ts` — `soccer_grid_puzzles` table definition added (`rows_json`/`cols_json` typed as `Json`)
- `src/hooks/useSoccerGrid.ts` — pool state + `isLoadingPool`, fetch on mount with `cancelled` cleanup, `todaysPuzzle` memo, Approach B wiring, `isLoadingPool` added to return
- `src/pages/SoccerGrid.tsx` — loading gate updated from `isLoading` to `(isLoadingPool || isLoading)`

### Locked files updated
`src/hooks/useSoccerGrid.ts` is now locked — **do NOT re-migrate.**

### Round 3 cleanup queue (deferred items)
- **SoccerGridSearch.tsx** — still imports `careerPlayers` from hardcoded data for autocomplete. The autocomplete is UX-only (validation is the AI edge function), so the static import works fine today. Wire in a later session via `fetchCareerPlayers()` with the same prop-passing pattern as `allClubNames` in GuessSoccerClub.

---

## Round 3 Session 1g — Connections wired (commit 3b360be)
Date: 2026-05-26

### Result
Connections is now genuinely live on Supabase data. ALL soccer hooks in the Round 3 queue are complete. 7 games genuinely wired: Footle, Shirt Number, CareerGame, TransferPath, GuessSoccerClub, SoccerGrid, Connections.

### Supabase migration applied
- `supabase/migrations/20260526000004_connections_puzzles.sql` — schema + RLS public-read + indexes on `puzzle_id` and `sort_order` + 155-row seed in 4 chunks of ~40 puzzles each, all in one file. Uses Postgres JSONB for `groups_json` (read-whole pattern, no JOIN needed). **Applied manually in Supabase SQL Editor. Confirmed: 155 rows live, `groups_json` verified parsing as JS array, last `puzzle_id` is `puzzle-155`.**
- Seed verification: `SELECT COUNT(*)` → 155; `SELECT groups_json WHERE puzzle_id = 'puzzle-1'` → parsed JSON array with 4 groups (first group category: "Won the Ballon d'Or"); `SELECT puzzle_id ORDER BY sort_order DESC LIMIT 1` → `puzzle-155`.

### Key design notes
- **Approach B** — `supabasePuzzle` + `getPuzzleId` override on `useDailyPuzzle`. Consistent with Session 1f (SoccerGrid). Future-proofs rotation for Round 4 puzzle expansion: new puzzles added to Supabase automatically enter the rotation.
- `todaysPuzzle` computed in `useMemo` over `puzzlePool` using `dateSeed(getTodayET()) % puzzlePool.length`. Passed as `supabasePuzzle` to `useDailyPuzzle`.
- `puzzles: fallbackPuzzles` still passed as the stable module-level ref required by `useDailyPuzzle`'s dep array constraint. Code comment in the hook explains why, so future maintainers don't remove it.
- `getPuzzleId: (p) => p.id` enables value-based identity lookup when Supabase-deserialized object replaces hardcoded reference.
- `isValidPuzzle` filter applied to fetched pool BEFORE `setPuzzlePool` — drops any malformed Supabase rows, falls back to hardcoded if all rows fail validation.
- **Unlimited mode** — switched from `fallbackPuzzles` to `puzzlePool` in all three places: `useState` initializer, active puzzle computation, `totalPuzzles`.
- **Split-conditional loading guards** in `Connections.tsx` — both updated: `(isLoading || isLoadingPool)` and `(!isLoading && !isLoadingPool)`.
- All existing functionality preserved: streak, hints, lives, oneAway detection, `useGameCompletion`.

### Execution issues (for future migration reference)
- **API socket timeouts on single-shot generation**: Generating all 155 puzzles in one file write caused socket timeouts. Resolved by splitting into 4 chunked write operations (~40 puzzles each) with user checkpoint verification between each chunk.
- **Drift after chunks 1–2**: Unauthorized `::jsonb` explicit casts (after every JSON string literal) and `ON CONFLICT (puzzle_id) DO NOTHING` clauses added without Phase B authorization. Caught during review. `::jsonb` breaks consistency with existing `soccer_grid_puzzles` migration; `ON CONFLICT` silently skips rows on re-run, preventing migration-based typo fixes from landing. Fix: `str_replace` with `replace_all: true` removed both from chunks 1–2; chunks 3–4 written clean.

### Apostrophe escaping (for future JSONB seed migrations)
SQL string literals use single-quote delimiters — every `'` inside must be doubled. Key patterns audited per chunk:
- `Eto''o` (Samuel Eto'o — multiple occurrences across chunks 1–4)
- `N''Golo Kanté` (multiple occurrences)
- `Ballon d''Or` (category names)
- `Côte d''Ivoire` (category/country names)
- `Barcelona''s` (puzzle-150 category name)

### Files changed (commit 3b360be)
- `supabase/migrations/20260526000004_connections_puzzles.sql` (**new**, 191 lines)
- `src/lib/fetchConnectionsPuzzles.ts` (**new**) — SELECT ORDER BY sort_order, JSONB cast to `ConnectionGroup[]`, applies `isValidPuzzle` filter, returns `[]` on error
- `src/integrations/supabase/types.ts` — `connections_puzzles` table definition added (`groups_json` typed as `Json`), inserted alphabetically between `college_guess_scores` and `daily_badges`
- `src/hooks/useConnections.ts` — pool state + `isLoadingPool`, fetch on mount with `cancelled` cleanup, `todaysPuzzle` memo, Approach B wiring (`supabasePuzzle` + `getPuzzleId`), unlimited mode migrated to `puzzlePool`, `isLoadingPool` added to return
- `src/pages/Connections.tsx` — `isLoadingPool` destructured, both split-conditional loading guards updated

### Locked files updated
`src/hooks/useConnections.ts` is now locked — **do NOT re-migrate.**

### 7 games live on Supabase
| Game | Table(s) | Session |
|---|---|---|
| Footle | `player_market_values` | 1a |
| Shirt Number | `shirt_number_puzzles` | 1b |
| CareerGame | `career_players`, `career_seasons` | 1c |
| TransferPath | `transfer_path_puzzles` + reuses career tables | 1d |
| GuessSoccerClub | `soccer_club_puzzles` | 1e |
| SoccerGrid | `soccer_grid_puzzles` | 1f |
| Connections | `connections_puzzles` | 1g |

---

## Round 3 Cleanup — SoccerGridSearch wired (commit 7c82f54)
Date: 2026-05-26

### Result
Deferred from Session 1f (SoccerGrid). The last hardcoded data import flagged during the soccer hook migrations is now removed. Round 3 cleanup queue is clear.

### Files changed (commit 7c82f54)
- `src/components/soccer-grid/SoccerGridSearch.tsx` — removed static `careerPlayers` import from hardcoded data. Added `PlayerSuggestion` interface (`{ name: string; nationality: string; position: string }`). Added `players: PlayerSuggestion[]` prop. Filter now sources from `players` prop instead of module-level data. Dropdown subtitle (`nationality · position`) preserved (Option B).
- `src/pages/SoccerGrid.tsx` — added `fetchCareerPlayers` import. Added `careerPlayerList` state initialized to `[]`. Added `useEffect` fetch on mount with `cancelled` cleanup (same pattern as puzzle pool fetches). Slims `CareerPlayer[]` to `PlayerSuggestion[]` before storing. Passes `players={careerPlayerList}` to `SoccerGridSearch`.

### Key design notes
- `useSoccerGrid` stays **locked — no change needed**. Render site is `SoccerGrid.tsx` directly; no intermediate board component for SoccerGrid.
- No Supabase schema changes, no migration, no `types.ts` edit. Pure component-level wiring.
- No loading gate change needed — existing `(isLoadingPool || isLoading)` gate already hides `SoccerGridSearch` while puzzle loads. Career fetch decouples from that gate; `[]` while loading is acceptable (user must click a cell + type 2+ chars before seeing suggestions, by which time the fetch has completed).

---

## Next: Round 4

Round 3 is fully complete. All 7 soccer games are live on Supabase and the cleanup queue is clear.

### Round 3 cleanup queue — DONE ✅
- ~~**SoccerGridSearch.tsx**~~ — wired in commit 7c82f54 (see section above)

### Round 4: Puzzle generators
Expand each `{game}_puzzles` table from its initial seed to 50–200+ puzzles per game.
- **Approach B games (SoccerGrid, Connections)** — new rows added to Supabase automatically enter the rotation via `dateSeed % puzzlePool.length`. No code deploy needed.
- **Approach A games (Footle, Shirt Number, CareerGame, TransferPath, GuessSoccerClub)** — rotation is not dynamic; would need retrofitting if pool expansion ever requires dynamic rotation. That's a Round 5 concern, not Round 4 — initial seeds are sufficient for now.

### Round 5: New puzzle types / game redesigns
- NBA Chain golf mode
- Higher/Lower stat-based game
- NFL Conquest state-splitting
- Deferred Round 2 bug-fix pass (see "Outstanding from Round 2 user testing" below)

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
- Locked files (do NOT touch): `src/hooks/useDailyPuzzle.ts`, `src/lib/dateUtils.ts`, the 17 Phase B migrated hooks, `src/hooks/useShirtNumber.ts`, `src/hooks/useCareerGame.ts`, `src/hooks/useTransferPath.ts`, `src/hooks/useGuessSoccerClub.ts`, `src/hooks/useSoccerGrid.ts`, `src/hooks/useConnections.ts`
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
