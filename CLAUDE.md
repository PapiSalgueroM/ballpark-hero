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

A claude.ai/code session already has the clone, so it only needs `npm install`, plus two
installs the clone does not carry, both learned on 2026-08-26 when the first cloud round hit
them: `npm install --no-save playwright` (the prerenderer and the browser sweeps import it;
the browsers themselves are preinstalled at `/opt/pw-browsers`, so this is just the package)
and `pip3 install fonttools pillow` (simBrand runs the logo generator and fails closed
without them).

Then read `docs/PROJECT-STATE.md` and reconcile against reality:

1. `git log --oneline -5` gives you the true head. **Trust this over the head recorded in
   `docs/PROJECT-STATE.md`**, which goes stale the moment a queue lands.
2. **Steps 2 and 3 are Cowork only.** They need Anthony's folder, which a claude.ai/code session
   does not have. On that path skip straight to step 4: your clone is already current with
   `origin/main` and there is nothing to extract.
3. List Anthony's folder (`C:\Users\antho\ballpark-hero`) and note every `ROUNDnn_FILES.zip`
   **whose round number is above the head**. Those are the genuinely pending rounds. Extract
   those, in numeric order, onto the clone before you touch any code.
   **Do not extract a zip whose round number is at or below the head.** Old zips linger in that
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

*The CRLF check.* Cowork only, for the same reason. Once you have extracted pending zips onto the
clone, `git diff --ignore-cr-at-eol --stat` is **no longer empty**, and it stops being a clean
proof that the only changes are line endings. Run that check **before** extracting anything, or
scope it to files the pending rounds do not touch.

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
| Scores feed | ESPN's open scoreboard header endpoint since Round 311 (the API-Sports account from Round 287 was suspended 2026-08-26 and is retired). No key exists any more; the poll secret gating `scores-poll` still lives only in `private.app_secrets` and must never reach the repo or a chat. `simLiveScores` scans for key shaped literals and bans feed hosts from `src`. |

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
the work. That figure came from Lovable's project analytics. GA4 (`G-KZQK2G68YC`) is wired in
since Round 285 but only counts visitors who accept the cookie banner, so Lovable stays the
source for totals.
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

## Shipping

**There are two kinds of session and they ship differently. Work out which one you are before
you write a line of code.** The old blanket rule ("a cloud session can never push") was wrong,
it described only one of them, and following it from the other one produces zips nobody needs.

| | Cowork session | claude.ai/code session |
|---|---|---|
| GitHub credentials | none | yes |
| Anthony's Windows folder | connected through the desktop bridge | not there at all |
| How a round lands | package a zip plus a bat, he double-clicks it | commit and push, then open a PR |
| Zip, `RUNnn.bat`, `SHIPnn.bat` | required | **never build them** |

**How to tell.** A claude.ai/code session is handed a branch name to develop on, has the GitHub
tools, and `git ls-remote origin` succeeds against
`https://github.com/PapiSalgueroM/ballpark-hero`. A Cowork session has the desktop bridge tools
and `C:\Users\antho\ballpark-hero` instead. If you genuinely cannot tell, try the push: if it is
refused for want of credentials, you are on the Cowork path and the bat pipeline applies.

**Cowork.** It can **never push**, it has no credentials. It packages a round as
`ROUNDnn_FILES.zip` plus `RUNnn.bat`, writes both to `C:\Users\antho\ballpark-hero`, and Anthony
double-clicks the bats in numeric order.

**claude.ai/code.** Commit on the branch you were given, `git push -u origin <branch>`, then open
a PR. **Do not write a zip, do not write a `RUNnn.bat`, do not write a `SHIP` wrapper, and do not
try to reach Anthony's folder**, none of that applies to you and none of it exists on your
machine. Nothing reaches `main` until the PR merges, so the preview does not rebuild before that.

**Both paths end the same way.** Landing on `main` updates the Lovable **preview only**;
douknowball.com serves the published snapshot and does not move until you call
`deploy_project`. Skipping that final publish step is why the live site once served a June build
for weeks while GitHub was current.

**The full runbook, with every trap, is `docs/SHIP-PIPELINE.md`. Read it before you package
anything.** The traps in there are not theoretical, each one cost real time. Most of it is about
the bat pipeline, so on the claude.ai/code path read the session-type section at the top and the
deploy section, and skip the packaging chapters.

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

Between big ships, when a round rebuilds `dist` and the snapshots in `public/`, run **all** of
the harnesses that read those directories, not a hand picked few: `simAdsense`, `simBrand`,
`simHeadTags`, `simHiddenPages`, `simHubs`, `simIndexNow`, `simIndexing`, `simInternalLinks`,
`simNoRivalNames`, `simPrerender`, `simPrerenderBoot`, `simRetiredRoutes`, `simSchema`,
`simSitemap`, `simSnapshotAssets`. Round 293 found `simIndexNow` had been red since Round 288
because two rounds that added a page ran the sitemap fence and skipped this one. A hand picked
list is exactly the kind of memory that fails.

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
- Set margins from **measured headroom**, not from a number that felt right. Round 284's
  example: a ceiling gap that must exceed 4 went red on healthy code at exactly 4.0. Measured
  over repeated runs the gap sits between roughly 3.9 and 5.0, so the threshold was in the
  middle of the distribution and the check was a coin toss dressed as a rule.
- Runtime does not prove a harness ran. **Its output does.** Check the output.
- Never evaluate an imported value at module scope. That is how the import cycle got in.
- **Write a negative control for every new check, and assert that the control changed
  something.** A control that replaces a string the file does not contain changes nothing, the
  harness stays green, and green then means "the control did not fire" rather than "the check
  works". `assert old in src` before the edit, or refuse to run. `simPrerender`
  (`SIM_PRERENDER_CONTROL=noindex`), `prerender.mjs` (`PRERENDER_CONTROL=noflag`) and
  `playSnapshotDrift` (`DRIFT_CONTROL=1`) all carry theirs.
- **A guard that reads source must read the code, not the comments.** Four times in one day a
  check was satisfied by the prose explaining why the check exists: a canonical count read its
  own comment as a tag, a 404 harness read its documentation as a page marker, and two privacy
  checks matched the comment saying they had been added. Prose about the code is the one place
  the string a guard looks for is guaranteed to appear. Strip comments and scripts before
  matching, and match the shape (a real `<meta name="robots">` element) rather than the word.
- **Never run the harness suite while a build is running.** Two harnesses once reported
  failures that were just them reading a half-written `dist`.

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

### Nothing computed from a clock goes into a saved page

Every route except the home page ships as a snapshot in `public/<route>/index.html`, written
once and copied into every later build. A snapshot is therefore a promise held for weeks, and
anything in it derived from `Date.now()` breaks that promise on a schedule.

Two different costs, and it is worth keeping them apart when deciding what to do:

- **The line is a claim about today.** "Fresh daily: Tier List" is false tomorrow. On every page.
- **The line is a rotation that stays true.** The "Play Next" trio is three real links to three
  real games whichever three get picked. Nothing about it is wrong later. But it rewrites 126
  files on every build, which buries real changes in a diff, and since Round 280 it would also
  re-date every URL in the sitemap and hand back the exact "all 127 pages changed today" lie
  that `scripts/data/lastmod.json` exists to end.

Both get `data-no-prerender`, which `scripts/prerender.mjs` strips. The visitor keeps the
rotation; only the photograph loses it.

**The rule that catches the next one: a check written for a known offender cannot find the next
offender.** This was learned three times before it was written down. Round 258 marked the
calendar lines and guarded them by looking for the calendar's own titles. Round 274 found a
frozen countdown and guarded it by looking for `hh:mm:ss`. Both guards were green while the
ticker's four rotating daily lines sat frozen on all 126 pages and a rotating trio sat frozen on
94 of them. What found those was not a better string list, it was
`scripts/playSnapshotDrift.mjs`: render the page twice with its own clock five days apart and
diff what the prerenderer would capture. It asserts nothing about what should be there, so it
does not need anyone to have thought of the failure first. `simPrerender` section 13 backs it up
at source level, requiring every ticker line built from a template literal to declare itself
volatile, so the question cannot go unasked.

**Since Round 284 the prerenderer itself works this way.** `data-no-prerender` only ever covered
what somebody had marked, and a board the page computes from the date (a daily puzzle, a
"Today's lineup, 2026-08-24" caption) was frozen into fifteen saved pages that no rule about
network data could see. `scripts/prerender.mjs` now draws every route three times with the
page's own clock at 0, 5 and 11 days and writes only the blocks all three agree on. Nothing in
it knows which games are daily, on purpose: a list of affected games has been written three
times in this repo, and each time it covered what somebody had already found and nothing after.
`data-no-prerender` still matters for the visitor-facing side (the rotation is kept on screen
and only the photograph loses it) and it stays the cheap fix for a known line; the sampling is
what catches the unknown one. Content picked with `Math.random` is a different case and gets a
different treatment: the prerenderer seeds `Math.random` identically on every sample and every
run, so a random pick is frozen the same way in every build rather than dropped. It is not
false, and the only harm it could do was rewriting the file on every build.

### index.html is also the 404 page, and it has to say so before React runs

The host answers every unknown address with `index.html` and a **200**. Since Round 257 that file
carries the home page's real copy and its canonical, so before Round 282 every dead address on
the domain served a full duplicate of the most important page on the site, with no robots tag.
A small script at the end of the template's body now marks those: no `#dukb-snapshot` in the
document and a path other than `/` means the fallback, because every real address is served from
its own prerendered document and every one of those carries that block.

Three rules for anyone touching it:

- **It must never fire on a real page.** A marker that noindexes a good page is far worse than
  the bug it fixes. `scripts/playSoftFourOhFour.mjs` section 4 walks real routes for exactly this.
- **It must never fire under the prerenderer, and it did.** The prerender server hands every
  route the bare template on purpose so React can draw into it, which to this script is exactly
  a dead address. The first prerender after Round 282 wrote a noindex into all 133 saved
  documents, sitemap pages included, and every existing check passed because none of them asked
  the question. `prerender.mjs` now sets `window.__DUKB_PRERENDER__` before any page code runs
  and the marker returns on it. **The check to keep is `simPrerender` section 14: no document
  in the sitemap may ship a noindex.** It reads the files, not the marker, so it holds whatever
  the mechanism is next time, and `PRERENDER_CONTROL=noflag` reproduces the near miss on demand
  into `dist/` only.
- **The canonical goes with the noindex.** The template canonicalises to `/`, and a noindex
  beside a canonical pointing at another page can propagate the noindex to that page. Same reason
  Round 272 left the retired-route stubs without one.
- **Test it with the app bundle blocked.** The app has rendered a noindexed 404 since Round 53,
  so a harness that waits for React measures Round 53's work and credits it to whoever is
  writing today. The harness aborts `**/assets/*.js` for this reason and its negative control
  proves it: with the pre-boot script deleted, five of seven assertions still passed before that
  change, and all of them fail after it.

### Anything a crawler must read goes in the HEAD, and the home page's goes in the template

Two separate traps, both of which have now swallowed real work more than once.

**A snapshot keeps the head verbatim and rebuilds the body.** `scripts/prerender.mjs` writes each
page's `<head>` exactly as the build produced it and reconstructs the body from readable content
only: headings, paragraphs, list items, table cells, links. Anything else in the body is gone. In
Round 281 that turned out to have been quietly binning the FAQ markup and the breadcrumb trail on
all 113 game pages since Round 256, both correctly generated, neither ever shipped. **If it must
reach a crawler and it is not readable text, it belongs in `<Helmet>`.**

**The home page is not prerendered, so nothing React adds at runtime reaches its raw HTML.** vite
regenerates `dist/index.html` from `index.html` on whatever machine builds the site, so a snapshot
written over it is thrown away and one written into `public/` would collide with it. Three
separate things have fallen into this: the readable copy (Round 257), the canonical (Round 265),
and the entire structured data block (Round 281, which had been generated since Round 53 and seen
by nobody). **Anything the home page must serve to a crawler goes in `index.html` itself.** When
that means a second copy of something the app also knows, guard the pair: `simSchema` section 4b
parses the template's JSON-LD and compares it against `SITE_JSON_LD`, and `simHomeCopy` checks
every number and link in the static block against the registry.

### The sitemap's lastmod is derived, never asserted

`genSitemap.mjs` used to stamp `new Date()` on all 127 rows, so any regeneration claimed the
whole site had changed. Google's sitemap documentation says the value must be verifiably
accurate and that they may ignore it entirely otherwise, which is the right response to a file
crying wolf 127 times at once, and it costs this site the only re-crawl lever it has while pages
sit in "Crawled, currently not indexed".

Each date now comes from a hash of that page's own shipped text and links, recorded in
`scripts/data/lastmod.json`. **That ledger is committed and must stay committed**: it is the only
memory of when a page last really changed, and losing it re-dates the whole site. `simSitemap`
section 5 checks that every date has a ledger entry behind it, that the entry's hash still
matches the file on disk, and that no date is in the future.

Consequence for the build order: the sitemap has to be generated **after** the prerenderer, so
`build:seo` runs the generator twice, once with `--routes-only` (route list, ledger untouched)
before the build and once for real afterwards. Do not collapse that back into one call.

### The home page offers before it asks

Everything on this site plays signed out. That is the pitch, it is what the copy says, and it is
the reason to use it. So the account is an **upsell**, and an upsell goes after somebody has
played something, not in front of the game list.

Round 283 measured the opposite: on a 390 by 844 phone the first playable game tile was at y=478
with four separate account asks above it. `scripts/playHomeFold.mjs` now fails if the first tile
drops past y=430 or if more than two places above it ask for an account. The sitewide guest strip
in `Header.tsx` is suppressed on `/` for this reason and belongs everywhere else.

Two things learned writing that harness, both worth keeping:

- **A repeated badge is not a repeated label.** "NEW" on three genuinely new games is a fact.
  "Popular pick" under three different games is a constant standing in for a description. The
  first draft flagged the first and would have made someone delete a true badge.
- **Count places, not elements.** The guest strip's ask is a `<span>`, so a sweep of `a, button`
  reported the same prompt count with the strip present and absent. Asks are bucketed by vertical
  position now, so the nav's pair is one place and the strip is another.

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
- The only permitted external image host is `flagcdn.com`. That includes the social image and
  the icons in `index.html`: until Round 286 og:image pointed at the host's upload bucket, and
  `simBrand` section 3 now fails on any image the template hands a crawler from any other host.
- The mark, the wordmark, the icons and the social image all come from `scripts/logo/gen_logo.py`.
  Do not hand edit an asset in `public/`; edit the generator, re-run it with `rasterize.mjs` and
  `make_ico.py`, and `simBrand` section 6 will confirm the shipped files match.
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
- **Never create a SECURITY DEFINER function that runs arbitrary SQL, and read the advisor's
  function warnings, not just its table ones.** On 2026-08-25 `get_advisors` (run after adding
  a table) showed `public.exec_sql(query text)`: SECURITY DEFINER, owned by postgres, body
  `EXECUTE query`, with EXECUTE granted to PUBLIC, anon and authenticated. The anon key is in
  every page bundle and in this public repo, so anyone could have POSTed any statement to
  `/rest/v1/rpc/exec_sql` and run it as the table owner, including reading
  `private.app_secrets`. Nothing in the repo called it (only the generated types listed it).
  It was dropped the same minute, `handle_new_user` lost its anon and authenticated execute
  for good measure, and the visible 24 hours of edge logs showed no call to it. If a helper
  like that is ever wanted again, it does not go in the database: run SQL through the
  Supabase MCP, which authenticates the session, never through an RPC the browser can reach.
- **Anything a table says about a puzzle that the game's own rule can compute is derived,
  never typed.** Transfer Path's `min_steps` and `hint` were hand written under the "any
  shared club" rule and sat unchanged for six weeks after the rule became "same club, same
  season", until a player followed a hint into a refusal (Round 294). They now come from
  `scripts/genTransferPathHints.mjs` over a pull of the career tables, and
  `simTransferPathHints` fails if a row disagrees with the search. When a rule changes,
  grep the tables for prose that encodes the old one.


### Never reintroduce these specific regressions

- A strength multiplier that cannot reach 1 (Club Manager, Round 95).
- Growth that ignores potential headroom (Rounds 96 and 116).
- Parsing playoff depth out of a result string (Round 103).
- React error #310 on a game page means hooks placed after a conditional return.
  `TransferPathBoard` had exactly this: an early loading return sitting above a `useState`.
  **The loading check goes below every hook.**

---

## Environment traps

- **The cloud clone silently reverts mid-turn. Cowork only.** Tracked files snap back to origin,
  untracked files survive. Re-stage and extract the pending `ROUNDnn_FILES.zip` files from
  Anthony's folder, in numeric order, at the start of every turn and after every agent fan-out.
  Early warning sign: the tsc error count jumps from 0 to about 110. **On the Cowork path his
  machine is the only source of truth for unpushed rounds.**

  **"Pending" means round number above the current head, and nothing else.** Re-read the
  bootstrap section above before you extract anything. Old zips never leave that folder, and
  extracting one below the head is self-inflicted damage that presents as this bug.

  On the claude.ai/code path none of this applies. The clone is fresh from `origin`, there are no
  pending zips to extract because there is no folder to extract them from, and your own branch is
  the source of truth for work in flight. Commit early so a revert cannot cost you anything.
- **Never run `git checkout` in the Cowork cloud clone.** It is not an undo, it is a rollback to
  `origin/main`, which is however many unpushed rounds behind the tree you are working on. In
  Round 272 a `git checkout -- src/App.tsx` meant to undo a one line test edit silently took the
  file back fifteen rounds and deleted six routes, and tsc, the build and the sitemap generator
  all stayed green afterwards. Undo an edit by copying the file back from a copy you made first.
  Recovery is the same as for the clone-revert bug above: re-extract every pending zip in numeric
  order, then compare every file the zips carry against the tree byte for byte. On the
  claude.ai/code path this trap does not exist, the clone sits at `origin` and checkout behaves
  like ordinary git, but the habit of copying a file before experimenting on it is still a good
  one.
- **Bash reads can be stale or truncated** in the sandbox for files edited by the Write and Edit
  tools in the same session. A file once ended mid-word under `tail` while the Read tool showed
  it complete. **Verify file content with the Read and Grep tools, never with bash `cat`,
  `grep`, `ls` or `find`.** Do not panic over bogus syntax errors from a bash-side compile. A
  green bash build is not proof the code exists.
- **Sandbox git cannot use the index** ("unknown index entry format"), in **some** sandboxes and
  **not** in all of them. Where it bites, use `git ls-remote` and `git cat-file` for remote truth
  and run the commit bats on Windows. On the claude.ai/code path it has not been seen: `add`,
  `commit`, `status` and `push` all work normally, so try them before assuming you are blocked.
- **The repo permanently shows around 642 modified files, on Anthony's machine.** That is pure
  CRLF, nothing else. Prove it with `git diff --ignore-cr-at-eol --stat`, which comes back empty.
  **Never commit them.** A fresh claude.ai/code clone does not have this: it comes up clean, so
  there a dirty `git status` means real edits and is worth reading rather than dismissing.
- `npx serve -s` never serves a prerendered route: its single page rewrite runs before the
  filesystem is checked, so every route answers with `index.html`. The browser harnesses are
  served by `scripts/lib/hostLikeServer.mjs`, which behaves like the live host. Use that when
  serving `dist/` by hand too.
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
