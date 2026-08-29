# Grid archive and answer pages, the design (contract Task 3)

> **STATUS 2026-08-29, hours after this was written: DEFERRED, and the design
> below is wrong in two ways the data disproved. Recorded rather than deleted,
> because the reasons are the useful part.**
>
> The recon that should have come first:
>
> 1. **Selections are keyed by puzzle, not by date.** The three tables carry
>    `puzzle_id, cell_index, player_name, created_at` and nothing else. There
>    is no date key, so "the picks for 2026-08-28" is not a question the data
>    can answer.
> 2. **Puzzles repeat, so date pages would be duplicates of each other.** Each
>    grid draws its daily puzzle from a static array on a shuffled cycle
>    (`selectDailyPuzzle` in useDailyPuzzle.ts). The NFL pool is 30 puzzles,
>    so puzzle `grid-006` was served on 2026-07-15 and again weeks later; its
>    picks span 2026-07-15 to 2026-08-05. Sixteen of the NFL grid's 22 seen
>    puzzle ids have picks spanning more than one day. Date-keyed pages would
>    therefore publish the same board and the same answers at many URLs, which
>    is precisely the duplicate-content trap the contract's own rule 13 exists
>    to prevent.
> 3. **"Frozen once the day ends" was false** for the same reason: a puzzle's
>    picks keep accumulating every time it comes back around.
>
> And the finding that decides the sequencing: **publishing answers for a pool
> that recycles every 30 days leaks the live puzzle.** Every NFL grid puzzle is
> at most 30 days from being today's puzzle again, so an indexed answer page is
> an indexed answer key for a game we are still running.
>
> So the archive waits for the puzzle pool to be deep enough that a published
> board is genuinely retired for a long time, and when it is built it will be
> keyed on the PUZZLE (`/football-grid/archive/grid-006`), not on a date, so
> one page exists per distinct board and no two pages are twins. Round 350
> builds the pool instead.

---


Written 2026-08-29 by the desktop lane, shown to Anthony before any build per
the contract's "show diffs before applying". One round builds the shared
system plus the NFL grid archive; later rounds add one sport each.

## What a day page is

`/football-grid/archive/2026-08-28` shows, for that day's puzzle:

1. The nine criteria crossings, laid out as the familiar board.
2. The community's answers: for each cell, the correct players real people
   actually submitted that day, with each pick's rarity percentage, rarest
   first. This is honest, unique content no other site has, because it comes
   from our own recorded picks (the same `football_grid_selections` rows that
   power the live rarity score).
3. Day stats: how many players finished, the average rarity score.
4. A "Play this grid" button that loads exactly that puzzle in practice mode,
   clearly labeled as a replay that does not touch today's streak or score.
5. Previous day / next day links, plus a link up to the archive index and the
   live game.

`/football-grid/archive` is the index: a short intro, then the list of days,
newest first, paginated client side.

## The two data realities, and why the page is honest in both

- The franchise grids (NBA, MLB, NHL) have full local data, so their day
  pages can eventually show the complete valid answer set as well as the
  community picks.
- The AI-validated grids (soccer, NFL, college) have no exhaustive answer
  list by design (the validator judges each guess). Their day pages show the
  community's verified picks only, labeled as exactly that. No invented
  "complete" answer lists, ever: showing what thousands of real players
  found is the product, not a fallback.

## Dates, determinism, and the snapshot architecture

Every grid picks its daily puzzle deterministically from the date, so any
past date's criteria are reconstructable client side with zero new storage.
Selections are already keyed by puzzle and date.

A day page's content is FROZEN once its day ends: same criteria, same
recorded picks, forever. That makes it a perfect snapshot citizen: the
prerenderer's three clock samples see identical content, nothing gets
dropped, and the sitemap lastmod is the day itself and never moves. The
archive INDEX is the one clock-dependent surface (its list grows daily), so
the live date list is marked data-no-prerender and the index snapshot
carries the intro plus a build-time list; crawlers reach day pages through
the sitemap and the prev/next chain anyway, which never changes.

## Build mechanics (the part a round actually implements)

- One shared `GridArchivePage` component driven by a per-sport config
  (route, puzzle reconstruction, selections table, board renderer). Sport
  one: the NFL grid, the money page.
- `scripts/genArchiveDates.mjs` emits the date list (launch window back to
  yesterday) that BOTH the prerenderer route list and genSitemap consume, so
  the snapshots and the sitemap can never disagree about which days exist.
- Backfill window at launch: the last 60 days with recorded selections, not
  the whole history, so day one adds a bounded set of genuinely filled
  pages. It grows one page per day per sport after that.
- A day page with fewer than 9 recorded correct picks total renders what it
  has and stays OUT of the sitemap until it crosses the floor. No thin
  pages; the carve-out in the contract is for real content, and the floor is
  what keeps that promise measurable.
- Replay mode reuses the existing unlimited/practice plumbing, seeded with
  the archived date instead of a random puzzle.
- Fence: `simGridArchive` checks the date list, that every sitemap day page
  clears the pick floor, that criteria on N sampled pages match the
  deterministic generator's output for that date, that titles are unique,
  and that the ledger has a row per page. Negative control plants a phantom
  date and must go red.

## What this is not

Not a search-only surface (the contract's own carve-out, and the pick floor
enforces it). Not a second grid implementation: the board renderer and the
puzzle pickers are the live game's own code. Not a route explosion: one
index plus bounded day pages per sport, added a sport at a time.
