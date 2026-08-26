# DoUKnowBall (ballpark-hero)

Free multi-sport trivia, puzzle and simulation site. Live at https://douknowball.com
(Lovable preview: https://ballpark-hero.lovable.app).

**If you are a fresh session with no prior context, read these three files in this order and
you will know everything you need:**

1. This file. Who the owner is, how to work with him, the stack, the rules that must never break.
2. `docs/SHIP-PIPELINE.md`. How code actually reaches the live site, and every trap that has
   cost a working day.
3. `docs/PROJECT-STATE.md`. Where the build currently stands, what is pending, what is broken,
   what is next.

Everything in those three files is deliberately kept in the repo rather than in any assistant's
memory, so that any account, any session, any tool can pick the project up cold. Keep them
current. When you finish a round, update `docs/PROJECT-STATE.md` in the same round.

**On precedence and staleness.** `docs/PROJECT-STATE.md` carries a date. On any fact about
current state (the head, round numbers, what is pending, what is broken) **it beats this file
and it beats the pipeline doc**, because those two describe stable procedure while it describes
a moving target. If it is more than a couple of weeks old, verify its numbers against
`git log --oneline` and Anthony's folder before you trust them, then update it.

---

## Standing up a working tree from zero

A brand new session has none of this. Do it in this order.

```
git clone https://github.com/PapiSalgueroM/ballpark-hero.git
cd ballpark-hero
npm install
```

Then read `docs/PROJECT-STATE.md` and reconcile against reality:

1. `git log --oneline -5` gives you the true head.
2. List Anthony's folder (`C:\Users\antho\ballpark-hero`) and note every `ROUNDnn_FILES.zip`
   **whose round number is above the head**. Those are the genuinely pending rounds. Extract
   those, in numeric order, onto the clone before you touch any code.
3. **Do not extract a zip whose round number is at or below the head.** Old zips linger in that
   folder forever. `ROUND77_FILES.zip` and `ROUND87_FILES.zip` in particular are still sitting
   there unrun, and unpacking them over a Round 130-plus tree would silently revert fifty rounds
   of work in every file they happen to touch. It would look exactly like the clone-revert bug
   described below, and you would spend a session chasing the wrong thing. See
   `docs/PROJECT-STATE.md` for what to do about those two.
4. Confirm the tree is sane before building on it:
   `node_modules/.bin/tsc --noEmit -p tsconfig.app.json` should be at zero.

**Two things about this bootstrap that interact with traps listed further down.**

*Git.* `clone`, `fetch`, `log`, `revert` and `diff` all work fine. The index problem listed under
environment traps ("unknown index entry format") shows up on **staging operations** in some
sandboxes, `git add` and `git status` in particular. If `clone` itself fails, fall back to
`git clone --depth 1` or download the tarball; do not conclude the repo is broken.

*The CRLF check.* Once you have extracted pending zips onto the clone,
`git diff --ignore-cr-at-eol --stat` is **no longer empty**, and it stops being a clean proof
that the only changes are line endings. Run that check **before** extracting anything, or scope
it to files the pending rounds do not touch.

Playwright's Chromium is normally preinstalled (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`), so
do not reflexively run `playwright install`. If Chromium genuinely is not there, install it, it
just is not usually necessary. Use `ENGINES=chromium`, because WebKit is generally not
available.

---

## The owner and how he works

Anthony. He has no formal coding background and builds this with prompt-based tools. He is a
Business Management student and works a shift job, so he is not sitting there waiting on you.

His standing instruction, in his words: *"whatever u think should be next. everything is in ur
control. just create the best site possible."* And: *"keep going and stop stopping. just do a
bunch of rounds and implment new things and just keep going."*

What that means in practice:

- **Full autonomy. Do not ask him what to build.** Pick the next thing off
  `docs/PROJECT-STATE.md` and build it. Ask him about money, and about nothing else except the
  short list of open decisions tracked under "Decision owed by Anthony" in
  `docs/PROJECT-STATE.md`. If it is not on that list and it is not money, decide it yourself.
- **Build rounds back to back.** Do not build one round and stop to summarize. Package and
  deliver each round as you finish it, then start the next.
- **Short casual messages.** No long summaries between rounds.

### Style rules, non negotiable

- **Never use em dashes or en dashes.** Not in site copy, not in code comments, not in commit
  messages, not in messages to him, not anywhere in this repo. He reads them as AI writing.
  Use commas, periods, colons or parentheses instead.
- Site text sounds casual and human. Never AI-flavored.
- **Data correctness comes before UI and before everything else.** Never invent a player, a
  stat, a transfer or a result. Two-source verify anything real. Where the data is genuinely
  thin, mark it rather than filling the gap with something plausible: the existing convention
  for that in Club Manager is `CM_PARTIAL`, so grep for it and follow whatever shape it already
  takes rather than inventing a second marker.
- Every game needs instructions, rules and worked examples shown before play, re-openable from
  a "?" button.

---

## Stack and identifiers

| Thing | Value |
|---|---|
| Frontend | React + TypeScript + Vite, Tailwind, shadcn/ui |
| Repo | `PapiSalgueroM/ballpark-hero` (public), branch `main` |
| Local folder | `C:\Users\antho\ballpark-hero` |
| Host / builder | Lovable, project `c29d224f-a662-4a15-b809-d86fa3b3f0ad` |
| Database | Supabase, project `flawuiqbvjobmkfkauhw` (Pro plan, spend cap ON) |
| AdSense | publisher `pub-2929318086316376` |
| Owner logins | site account `amsalguero10@icloud.com`, project mail `douknowball1@gmail.com` |

**The Lovable workspace is on the free plan with 0 credits. Never drive builds through the
Lovable AI agent.** Lovable is used only as the host and the deploy trigger. All code changes
are made directly in the repo.

### The Supabase env var trap

Lovable's build injects `VITE_SUPABASE_*` env vars that point at a **deleted** project
(`pzzadswiradjnvvfybol`). **Never read those env vars.**
`src/integrations/supabase/client.ts` hardcodes the live project URL and public anon key on
purpose and exports them. Any code that talks to Supabase, including every edge function fetch,
must import `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `@/integrations/supabase/client`.

This caused a full outage in July 2026. It is the single easiest way to break the whole site.

---

## Repo layout

- `src/pages/` one component per game or screen, routed in `src/App.tsx` with `React.lazy`
  route-level code splitting.
- `src/data/gameRegistry.ts` the game catalog. `CATEGORIES` maps to
  `GameDef { path, label, emoji, description, daily?, isNew? }`. Soccer is ordered first.
- `src/data/gameContent/` per-game SEO copy, roughly 47k words. This is what drives indexing
  and the AdSense case. Treat it as load-bearing, not filler.
- `src/components/game/` shared UI: GameNav, GameNavbar (Home + Back), Footer, ShareButtons.
- `src/components/seo/GameSeoContent.tsx` bottom-of-page SEO block, title and description only.
- `src/hooks/`, `src/lib/`, `src/types/` game logic, helpers, shared types.
- `src/integrations/supabase/client.ts` see the env var trap above.
- `scripts/` the headless sim harnesses (roughly 52 as of August 2026, count it rather than
  quoting that) plus the browser sweeps. See the verification section.
- `supabase/functions/` edge function source. The **deployed** version is the source of truth;
  keep this directory synced when you redeploy, and redeploy through the Supabase MCP
  `deploy_edge_function` tool.

Reference pattern for a full game: `src/pages/SquadDeal.tsx` plus `src/hooks/useSquadDeal.ts`
plus `src/lib/squadDeal.ts` (`FORMATIONS`, `EXTRAS`, `playerRating`).

`/soccer-career` is the flagship. As of August 2026 it was about **1 in 5 of all pageviews
across the whole site and 11x the next most played game**, so it earns proportionally more of
the work. That figure came from Lovable's project analytics, not GA4, which is not wired up yet.
`docs/PROJECT-STATE.md` carries the source and the date; re-pull it before betting a big
prioritisation call on it.
`src/pages/SoccerCareer.tsx` is the biggest file in the repo, so read it in targeted slices
rather than whole.

### Adding a game

1. Create `src/pages/<Game>.tsx` plus hook and lib as needed.
2. Register the lazy route in `src/App.tsx`.
3. Add a `GameDef` entry under the right category in `src/data/gameRegistry.ts`.
4. Add per-game SEO copy in `src/data/gameContent/`.
5. Add a sim harness in `scripts/` named `sim*.mjs` so `runAllSims.mjs` discovers it.

---

## Shipping, in one paragraph

A cloud session can **never push**, it has no credentials. It packages a round as
`ROUNDnn_FILES.zip` plus `RUNnn.bat`, writes both to `C:\Users\antho\ballpark-hero`, and Anthony
double-clicks the bats in numeric order. Pushing updates the Lovable **preview only**;
douknowball.com serves the published snapshot and does not move until you call
`deploy_project`. Skipping that final publish step is why the live site once served a June build
for weeks while GitHub was current.

**The full runbook, with every trap, is `docs/SHIP-PIPELINE.md`. Read it before you package
anything.** The traps in there are not theoretical, each one cost real time.

---

## Verification gates

Run these. A round is not done until they pass.

**Type gate.** The real command is:

```
node_modules/.bin/tsc --noEmit -p tsconfig.app.json
```

Plain `tsc` or `npx tsc` is a **no-op**. The root tsconfig is solution-style and always exits 0,
so it will happily tell you everything is fine while the app is broken. This must be at zero
errors.

**Build.** `npm run build`.

**Sims.** `node scripts/runAllSims.mjs` auto-discovers every `scripts/sim*.mjs` harness. All of
them must be green before a big ship. Note the naming rule: a harness named `test*` will be
**silently skipped** by the runner. That is how `testBallonDorFairness.mjs` went unnoticed.

**Browser sweeps.** `scripts/sweepGames.mjs` walks every route across three viewports.
`scripts/playGames.mjs` actually plays them. WebKit is not installed in a fresh sandbox, so use
`ENGINES=chromium`. A full `playGames` run takes over 40 minutes; scope it with `ONLY=/route`
while iterating.

### How to write a harness that is worth having

The harnesses have caught things `tsc` structurally cannot: a page-crashing import cycle and
four separate stat-realism bugs. They are worth the effort, but only if written properly.

- Measure **outcomes against a baseline**. A harness that only proves "no crash" is close to
  worthless.
- Measure the **strongest** signal available, not the most descriptive one.
- **Never assert non-significance.** That test gets easier the less data you feed it, which
  means it passes for the wrong reason.
- **Never assert on a max.** Maxes are noise.
- Set margins from **measured headroom**, not from a number that felt right.
- Runtime does not prove a harness ran. **Its output does.** Check the output.
- Never evaluate an imported value at module scope. That is how the import cycle got in.

---

## Rules that must never break

### Validators fail closed

Every AI-backed grid and connect4 validator returns
`{valid:false, unverified:true, reason:"...try again"}` when it cannot verify, whether that is a
Gemini quota exhaustion, a parse failure, or any error. Grid hooks treat `unverified` as a
no-penalty retry so no guess is burned. Connect4 and chain hooks reject without ending the game
on network errors.

**Never reintroduce accept-on-error, "fail open", anywhere in a validator or its client catch.**
That was the July 2026 P1: nonsense answers were being accepted while the free Gemini quota was
exhausted.

The same principle applies to the packaging content assertions in every `RUNnn.bat`. They fail
closed on purpose. They are the only thing standing between a stale zip and a broken commit.

### Product rules

- **FIFA tile rule.** Small tiles plus a back button. Never long stacked pages.
- **No-scroll rule.** Enforced through `src/hooks/useRevealScroll.ts`. The page must not jump.
- Report-a-bug lives in the global footer and stays there.
- Every guessable player must actually exist in every game that can guess him. Anthony's words:
  *"verify every player that can be guessed is in every game."*

### Legal rules

These are not preferences, they are the exposure.

- **No league or club logos, crests, kits, or player photos.** Ever.
- **Never put invented words in a real person's mouth.** This is the line that matters most and
  it is easy to cross by accident. A real player's **name plus factual stats** is defensible
  ground: it is reporting. An **invented quote attributed to that real person** is not, and it
  is a different and worse kind of exposure than a stat you got wrong. It shows up in generated
  narrative copy: inbox messages, press reactions, dressing room lines, teammate dialogue,
  anything with a speaker. Things like *"You told me I was a star here"* attached to a real
  footballer.

  Write around it. Attribute to a role rather than a person ("your captain", "the manager"),
  narrate rather than quote ("he made it clear he expected more"), or use a generated player.
  The repo is public and the site is public, so both are readable.
- The only permitted external image host is `flagcdn.com`.
- The footer disclaimer naming UEFA and the competitions plus the words "independent fan
  project" is **required** and must not be removed or shortened.
- The genuinely exposed item is data provenance (Transfermarkt, Futbin). Do not make it worse
  by adding branded assets.
- **No rival product names anywhere in shipped files.** `scripts/simNoRivalNames.mjs` is the
  permanent guard, added in Round 133 after a purge that cleaned 284 findings across 843 files.
  Run it, keep it green, and read its header comment before touching it. The banned list lives
  in one place inside that file (`RIVAL_NAMES`) and covers rival life sims, sports games, daily
  word games and their variants, in UI copy, SEO text, alt text, JSON-LD, **code comments**,
  variable and function names, file names, and edge functions. The repo is public, so a comment
  naming a competitor is exactly as readable as a button naming one.

  **What it scans:** `src`, `public`, `supabase`, `scripts`, `index.html`. It deliberately does
  **not** scan `docs/` or root-level markdown, so this file and the docs can name things plainly
  without turning the build permanently red.

  **The FIFA distinction, do not simplify it away.** FIFA is two things sharing a name. FIFA the
  governing body is fine and is handled by an allowlist: World Cup, rankings, points, FIFA Best,
  Puskas, FIFPro, fifa.com as a cited source, and the legal disclaimer. FIFA the video game is
  banned: "FIFA card", "FIFA 23", "FIFA-style", "EA Sports FIFA", "EA FC", "Ultimate Team". A
  FIFA mention passes only if it matches an allowlisted shape, so a brand new "FIFA Ultimate
  Team" reference fails by default rather than sneaking through. Note that "FIFA tile rule" and
  "FIFA-style dashboard" are internal shorthand used in these docs. **Do not ship those words
  into `src/`.**

  There is also a short `LIVE_IDENTIFIERS` allowlist for strings that cannot change without a
  data migration: the `/jeopardy` route and its localStorage prefix and Supabase table, the
  retired `/deal-or-no-deal` redirect, and the `'fifa_cover'` save value. Renaming any of those
  is a migration with redirects and a backfill, not a find and replace.

### Database rules

- Most game data lives in Postgres, read via `src/lib/fetch*.ts` and the game hooks.
- Row counts in the Supabase table list **can be stale**. Trust `select count(*)`.
- All public tables have RLS enabled with a public read-only policy.
- **Tables created with `CREATE TABLE AS` have RLS OFF by default.** That is a public-schema
  write hole through the anon key. Enable RLS immediately after creating any backup table.
  Run `get_advisors` after any DDL; that is what caught the 2026-07-22 backup tables.

### Never reintroduce these specific regressions

- A strength multiplier that cannot reach 1 (Club Manager, Round 95).
- Growth that ignores potential headroom (Rounds 96 and 116).
- Parsing playoff depth out of a result string (Round 103).
- React error #310 on a game page means hooks placed after a conditional return.
  `TransferPathBoard` had exactly this: an early loading return sitting above a `useState`.
  **The loading check goes below every hook.**

---

## Environment traps

- **The cloud clone silently reverts mid-turn.** Tracked files snap back to origin, untracked
  files survive. Re-stage and extract the pending `ROUNDnn_FILES.zip` files from Anthony's
  folder, in numeric order, at the start of every turn and after every agent fan-out. Early
  warning sign: the tsc error count jumps from 0 to about 110. **His machine is the only source
  of truth for unpushed rounds.**

  **"Pending" means round number above the current head, and nothing else.** Re-read the
  bootstrap section above before you extract anything. Old zips never leave that folder, and
  extracting one below the head is self-inflicted damage that presents as this bug.
- **Never run `git checkout` in the cloud clone.** It is not an undo, it is a rollback to
  `origin/main`, which is however many unpushed rounds behind the tree you are working on. In
  Round 272 a `git checkout -- src/App.tsx` meant to undo a one line test edit silently took the
  file back fifteen rounds and deleted six routes, and tsc, the build and the sitemap generator
  all stayed green afterwards. Undo an edit by copying the file back from a copy you made first.
  Recovery is the same as for the clone-revert bug above: re-extract every pending zip in numeric
  order, then compare every file the zips carry against the tree byte for byte.
- **Bash reads can be stale or truncated** in the sandbox for files edited by the Write and Edit
  tools in the same session. A file once ended mid-word under `tail` while the Read tool showed
  it complete. **Verify file content with the Read and Grep tools, never with bash `cat`,
  `grep`, `ls` or `find`.** Do not panic over bogus syntax errors from a bash-side compile. A
  green bash build is not proof the code exists.
- **Sandbox git cannot use the index** ("unknown index entry format"). Use `git ls-remote` and
  `git cat-file` for remote truth, and run the commit bats on Windows.
- **The repo permanently shows around 642 modified files.** That is pure CRLF, nothing else.
  Prove it with `git diff --ignore-cr-at-eol --stat`, which comes back empty. **Never commit
  them.**
- `npx serve` caches `index.html` at startup, so restart it after a rebuild.
- Playwright `click()` scrolls first, which interacts with the no-scroll rule.

---

## Web browsing

If the `gstack` skill set is installed in your environment, use `/browse` for web browsing. If
it is not (it is not present in most Cowork cloud sessions), use the normal WebFetch and
WebSearch tools. Do not treat the absence of gstack as a blocker; it is optional tooling, not a
dependency.

---

## Map of `docs/`

`docs/` held 53 files as of August 2026. Most are historical. **Three are live and must be kept
current:**

| File | Status |
|---|---|
| `docs/SHIP-PIPELINE.md` | **LIVE.** The deploy runbook. Read before packaging. |
| `docs/PROJECT-STATE.md` | **LIVE.** Current head, pending rounds, open bugs, roadmap. Update every round. |
| `docs/LEGAL_REVIEW.md` | **LIVE.** Still governs what assets may appear on the site. |

Useful but read with a date in mind:

- `docs/BUG_AND_FEATURE_BACKLOG.md`, `docs/GAME_BACKLOG.md`, `docs/GAMES_INVENTORY.md`
- `docs/COMPETITOR_INTEL.md`, `docs/DATABASE_COMPARISON.md`, `docs/MASTER_PLAN.md`

**Historical, do not act on without checking first.** Everything else, in particular
`AUTOPILOT_*`, `HANDOFF_SESSION*`, `SESSION_*`, `NEXT_SESSION_BRIEF.md`, `OPUS_MASTER_GUIDE.md`,
`round2-handoff.md`, `round3-handoff.md`, `round4-*`. These are frozen snapshots from early and
mid 2026. They describe a pipeline and a game list that have both moved on. Reading them as
current instructions will send you backwards.

Two of them are also a live problem: `docs/research/R1_soccer_sites.md` and
`docs/research/R3_creator_formats.md` **name competitors by name in a public repo.** Anthony
still owes a decision on whether to delete them or gitignore them. Raise it, do not silently
delete his research.
