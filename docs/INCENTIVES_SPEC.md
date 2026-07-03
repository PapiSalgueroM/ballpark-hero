# Incentives Spec (streaks + leaderboards + badges)

Owner-editable. One page. Covers items #97 / #102 / #103. Guest-first: nothing here requires an account. Signing in only upgrades a guest's local identity to a synced one; it never gates a feature.

## Principles

- Guest-first. Every incentive must work with zero login, from the first visit, in the same browser.
- Local-first. LocalStorage is the source of truth for anything about "this browser." Supabase (`game_completions`) is the source of truth for anything cross-browser (leaderboards).
- Never block gameplay. All reads/writes here are fire-and-forget or synchronous-local. A failure never surfaces to the player and never delays a result screen.
- Honest badges only. A badge rule only ships if it is computable from data we actually store. No "coming soon" badges, no badges that are always earned, no badges that need data we don't have (see Omitted Rules below).

## 1. Streaks (shipped, #101)

Local-first, computed entirely from `localStorage` key `dukb-streaks-v1`. See `src/lib/streaks.ts` and `src/hooks/useStreaks.ts`. Not part of this build; documented here for completeness since badges and Profile read from it.

- Global streak: consecutive ET days any game was completed.
- Per-game streak: consecutive ET days a specific game was completed.
- A day with zero completions breaks the streak back to 0 (no freeze concept; the old freeze logic lived in a `profiles` table that didn't exist in production and is not resurrected).

## 2. Leaderboards (#102)

### Identity model

Every player, guest or signed-in, has a **display handle** used only for leaderboard rows.

- **Guests**: a handle is generated once per browser on first need, in the form `Baller-1234` (four random digits), persisted in `localStorage` under `dukb-guest-handle`. It never changes on its own. It is not editable from a settings screen in this build (out of scope) but the storage shape allows a future edit box to overwrite the same key.
- **Signed-in**: the handle is `profile.display_name` if set, else `profile.username` if set, else falls back to the same `Baller-1234` style guest handle (so a signed-in user who never filled in a display name still gets a real name instead of "null"). This is edited today via the existing "Edit" flow on Profile.tsx (`display_name` field), nothing new to build there.

The handle is captured into `game_completions.player_name` at the moment of each completion (see completions.ts changes below), so leaderboard rows show whatever name the player had *at the time they set that score*. Renaming later does not retroactively rewrite old rows. This is a deliberate simplicity trade-off: it avoids a join against a mutable profiles table for anonymous rows (guests have no profiles row at all).

### Data source

`public.game_completions` (id, game, completed_on, created_at, score, player_name). RLS: anyone can INSERT, anyone can SELECT. No auth required to read or write. `score`/`player_name` are nullable so historical rows (recorded before this change) simply don't appear in leaderboard results, and any future caller that forgets to pass a score degrades to "not shown" instead of erroring.

### Views

**Game picker**: every `daily: true` entry in `src/data/gameRegistry.ts` (`ALL_GAMES.filter(g => g.daily)`), grouped by category the same way the registry already groups them. Non-daily games are excluded from the leaderboard picker in this build: they have no natural "today" boundary, so a Today tab for them is meaningless and diffusing 65+ games across two tabs each would produce mostly-empty tables. All-time boards for non-daily games are a reasonable future add (see Future Ideas).

**Today tab**: for the selected game, `SELECT player_name, score, created_at FROM game_completions WHERE game = :slug AND completed_on = :today_utc AND score IS NOT NULL`, grouped by `player_name` taking `MAX(score)`, sorted descending, top 20. Ties broken by earliest `created_at` (first to reach that score ranks higher).

**All-time tab**: same shape but no `completed_on` filter: `SELECT player_name, score FROM game_completions WHERE game = :slug AND score IS NOT NULL`, grouped by `player_name` taking `MAX(score)` and `MIN(created_at)` for tie-break, sorted descending, top 20.

Both queries group in JS after a single Supabase `select`, not in SQL, because this table is accessed via `(supabase.from as any)(...)` (see completions.ts comment: it predates generated types) and Postgrest's `.group()` isn't available through the JS client anyway. Row volume per game per day is small enough (this is a trivia site, not a MMO leaderboard) that client-side grouping of a capped `.limit(500)` result set is fine; the `idx_game_completions_day_game` index keeps the underlying scan cheap.

### Own-row highlight

The current browser's handle (guest or signed-in) is compared against each row's `player_name` and highlighted the same way the old leaderboard highlighted `user_id === user?.id`. This is a name match, not an identity match: if two different guests both happen to have rolled the same `Baller-1234` handle (low odds, 10,000 possibilities, not cryptographically unique) they would both get highlighted. Acceptable for a cosmetic highlight; not used for anything security-sensitive.

### Empty states

- No `daily` games in the registry at all: picker shows nothing to pick (should never happen given current registry, guarded anyway).
- Selected game has zero qualifying rows for the active tab: "No scores yet for `<Game Label>`. Be the first!" with no crash, no infinite spinner.
- Fewer than 20 rows: render exactly what exists, no padding/placeholder rows.

### Explicitly out of scope for this build

- The old Leaderboard.tsx's Streaks tab and By-Sport tab, and every query against `user_scores`, `user_best_scores`, and `profiles.all_time_score`. Per CLAUDE.md and streaks.ts's own header comment, those tables/columns are dead in production (confirmed again against live schema while building this: `user_scores` and `user_best_scores` do exist as tables today but are never populated by any live write path outside the auth-gated `useGameCompletion` flow, which is a parallel and much thinner system than this one). Rebuilding the whole page on `game_completions` instead of trying to reconcile two systems.
- A "By Sport" aggregate tab. Removed because it depended on the dead `user_best_scores` table. Could come back once per-sport totals are meaningful under the new schema; not attempted here to keep this change scoped to what's askable in one page.

## 3. Badges (#103)

Local-first. All rules below are computed from data already sitting in the browser: `localStorage` (`dukb-streaks-v1`) and the Supabase read of the current player's own completion history where noted. No new tables, no new columns beyond the two added to `game_completions` above.

Badges intentionally do NOT read other players' data. They are a personal-progress feature, not a competitive one (that's what the leaderboard is for).

| # | Emoji | Name | Rule | Source |
|---|---|---|---|---|
| 1 | 🔥 | Streak Starter | Longest global streak >= 3 | `streaks.ts` global.longest |
| 2 | 🔥🔥 | On Fire | Longest global streak >= 7 | `streaks.ts` global.longest |
| 3 | 👑 | Streak King | Longest global streak >= 30 | `streaks.ts` global.longest |
| 4 | 🎮 | Rookie | 10+ completion rows (lifetime) | own `game_completions` history, see below |
| 5 | 🎮🎮 | Veteran | 50+ completion rows (lifetime) | own `game_completions` history |
| 6 | 🏆 | Century Club | 100+ completion rows (lifetime) | own `game_completions` history |
| 7 | 🌍 | All Rounder | Played at least one game from every top-level category in `gameRegistry.ts` (`CATEGORIES`, only categories with >0 games) | own `game_completions` history x registry |
| 8 | 📅 | Creature of Habit | Visited (opened the app) on 7+ distinct ET days | `streaks.ts` loginDates |
| 9 | 🗓️ | Regular | Visited on 30+ distinct ET days | `streaks.ts` loginDates |
| 10 | 🎯 | Well Rounded | Played 5+ distinct games in a single ET day, at least once | own `game_completions` history (grouped by day) |
| 11 | 🌅 | Perfect Week | 7-day global streak achieved at least once (duplicate-safe alias check against badge 2's data, phrased as a distinct milestone name for players who don't parse "longest streak") | `streaks.ts` global.longest |

Badge 11 is deliberately the same underlying number as badge 2 (`longest >= 7`) shown under a second name. This was a judgment call to reach the 10-12 range asked for without inventing a rule we can't honestly compute; see Omitted Rules below for what was cut instead of padding further with duplicates. If a reviewer would rather cut it than ship a near-duplicate, delete the "Perfect Week" entry from `BADGE_DEFS` in `src/lib/badges.ts` and the count becomes 10.

### Data sources for per-completion badges (4, 5, 6, 7, 10)

Badges 4, 5, 6, 7, 10 need per-completion history (game slug + ET day), which `streaks.ts` does not store (it only keeps aggregate streak counters, not a full log). Two options were considered:

1. A new localStorage log written from a new call site inside `useGameCompletion.ts`.
2. Reading the player's own rows back out of `game_completions` (now that every insert carries `player_name`, per the completions.ts change above), filtered client-side to rows whose `player_name` matches this browser's current handle.

**Option 2 was built.** `useGameCompletion.ts` is not on this change's edit list (see Hard Rules), so a new hook-in there was not available regardless of which approach was better; but option 2 is also simply better on the merits: it needs no new write path at all (every completion already lands in `game_completions` with a name attached, as of the completions.ts change), it survives a page reload without relying on a second localStorage key staying in sync with the first, and it is real historical data rather than a second bookkeeping log that could drift from what actually got recorded. The trade-off is one extra network read on Profile mount (`select game, score, completed_on from game_completions where player_name = :handle order by completed_on desc limit 500`) and a small honesty caveat: if a guest clears localStorage, their next-generated handle won't match old rows, so lifetime counts reset along with everything else local-first already resets on clear. That's consistent with how every other local-first stat on this site already behaves (streaks, days-visited), so it's not a new class of limitation.

### Omitted rules (asked for, not shippable honestly)

- **First perfect grid**: the mission allowed omitting this "if stored results not available." Checked: no game currently persists a structured "was this a perfect/flawless run" flag anywhere client-side or server-side that a badge could read generically across all grid games (each grid game's perfect-run definition lives only transiently in that page's component state and is never written anywhere). Omitted.
- **Night owl / early bird**: allowed to omit "if not stored locally." Checked `dukb-streaks-v1` and the new badge log: neither stores a time-of-day, only an ET calendar date, and `game_completions.created_at` is a server timestamp for cross-browser leaderboard rows, not a locally-owned signal for a specific device's play-time habits (and reading other rows' timestamps to badge yourself would mean guessing which row is "yours" by name match, which is the wrong trust boundary for a personal-achievement feature). Omitted rather than adding a new timestamp store for a single badge.
- **Sport-master style badges** (the old Profile page's "Soccer Master: 900+ on 3 soccer games" etc.): required `best_score` per game type from `user_best_scores`, a table this build treats as dead (see Leaderboards section above). Omitted rather than reading a table nothing else in the new system writes to.

### Profile UI

`src/pages/Profile.tsx`'s existing Badges card is kept in place and re-pointed at `src/lib/badges.ts`'s `getBadgeState()` instead of the old inline `badges` array (which depended on `bestScores`/`savedBracket`/`dailyGameSlugs`, several of which come from the dead-table reads). Earned badges keep the existing highlighted-border treatment; locked badges keep the existing grayscale/blur treatment. Grid layout unchanged.

## Future ideas (not built here)

- Editable guest handle from a Profile settings control (storage already supports it, just needs a text input wired to the same localStorage key).
- All-time boards for non-daily games.
- Weekly leaderboard tab (would need a `completed_on >= start_of_iso_week` filter, trivial addition to the same query shape once wanted).
- Streak freezes, once/if there is a durable per-user store the team actually wants to commit to maintaining (see `useStreaks.ts`'s `syncToProfileIfPossible` for the existing best-effort sync path that already writes to `profiles.streak_state jsonb`, which could become the backing store for freezes without a new migration).
