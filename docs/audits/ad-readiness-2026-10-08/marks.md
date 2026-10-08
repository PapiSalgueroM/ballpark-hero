# Logos and other companies' marks (Phase 0, item 6)

Audit only. Nothing in `src`, `public` or the product was changed. Read on 2026-10-08 from the `ad-readiness`
worktree (Release AL, head `d070adb0`), with the live build (Release AK) checked at `http://localhost:4190`.

This file lives under `docs/`, which `scripts/simNoRivalNames.mjs` does not scan, so it names the marks plainly.
None of this is legal advice. It records where each name sits and what moving it would cost. How strong any one
mark is, is a question for a lawyer, not for this audit.

How the numbers were made: `marks-scan.mjs` (beside this file) read all 192 saved documents (`index.html` at the
root plus every `public/**/index.html`), the registry labels and the router, and matched the patterns in
`marks-patterns.json`. Its output is `marks-scan.json`. `marks-report.mjs` prints slices of it.

---

## The short version

1. **No league logo, club crest, kit or player photo is on the site.** 17 image files ship, all the site's own.
   The only outside image host in the code is `flagcdn.com` (national flags). The repo's rule holds today.
2. **The brief is out of date on two of its five examples.** `/jeopardy` and `/deal-or-no-deal` are not live
   pages. They were retired in August and are signposts to `/quiz-board` and `/squad-deal`. Neither name appears
   in any title, heading or sentence a visitor can read.
3. **12 live pages are named after another company's game or show:** five "Connect 4" pages, five "Connections"
   pages, `/footle` and `/sports-millionaire`. On each, the name is in the URL, the registry label, the title,
   the H1, seven to nine guide headings per page (the guide fence requires the name in every h2) and the
   structured data.
4. **None of those 12 is on the brief's list of pages that rank.** The repo records no traffic for any of them
   (none has reached a recorded top ten), and Search Console listed four of them as crawled but not indexed.
5. **The host cannot send a real 301.** A rename here is a signpost page (meta refresh plus canonical), the same
   treatment `/jeopardy` got. The brief asks for 301 redirects, which this host does not do.
6. **A rename is cheap or expensive depending on how deep it goes.** Changing the label and URL is a known
   recipe (done twice). Changing the saved game keys, the leaderboard slug, the database tables or the edge
   function names is a data migration and should not be part of this workstream.
7. **Two gaps in the disclaimer coverage:** the home page's raw HTML carries no trademark disclaimer (it arrives
   only after JavaScript runs), and the disclaimer does not name the AFL or the NRL although the site has pages
   on both.

---

## Part A. Logos, crests, kits and player photos

### A1. Every image file that ships (17 files under `public/`, none anywhere in `src/`)

| File | What it is | Whose | Evidence |
|---|---|---|---|
| `public/logo.svg`, `logo-mark.svg`, `logo-wordmark.svg`, `favicon.svg` | The site's own mark (a question mark on a green ball) and wordmark | DoUKnowBall | Written by `scripts/logo/gen_logo.py`; `simBrand` section 6 checks the files match the generator |
| `public/favicon.ico`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | The same mark at icon sizes | DoUKnowBall | Same generator; `simBrand` sections 1 and 7 |
| `public/og-image.png` | Social card: the mark, the wordmark, one line of copy, the domain | DoUKnowBall | Looked at the file. No other mark on it |
| `public/arenas/soccer.webp`, `football.webp`, `basketball.webp`, `hockey.webp`, `baseball.webp` | Empty stadium and arena backdrops on the six sport hubs (college reuses football) | DoUKnowBall, generated 2026-10-03 | Looked at all five: no logo, no sponsor board, no lettering, no people. Prompts and the "no real venue, no marks" statement are on file in `docs/designs/ARENA-ART-994.md`. Used only by `src/components/hub/HubExperience.tsx:13-18` |
| `public/placeholder.svg` | A grey template placeholder left by the site builder | Nobody's mark | Not referenced anywhere in `src` or `index.html`. Dead file |

### A2. Every image tag in the code (7 `<img>` in `src/`, one of them in a test)

| Where | Source of the picture | Verdict |
|---|---|---|
| `src/components/FlagImg.tsx:163` and `:227` | `https://flagcdn.com/...` national flags | Allowed host |
| `src/pages/WorldCupPredictor.tsx:228` | `https://flagcdn.com/...` national flags | Allowed host |
| `src/components/lineup/TeamSpinner.tsx:97` | A flag from flagcdn, and only for national teams. Line 86 says in words that club crests are not used | Allowed host. Clubs show a name and no picture |
| `src/components/hub/HubExperience.tsx:78` | `/arenas/*.webp` (A1 above) | Own art |
| `src/pages/Profile.tsx:543` | The signed in visitor's own avatar (`profiles.avatar_url`; `docs/LEGAL_REVIEW.md` records that Google sign in can supply a profile picture) | A visitor's own picture on a noindex page. Not a league or player image |

What a crawler sees: each of the 177 saved game, hub and reference pages carries exactly one `<img>`, the site's
own `/logo-mark.svg`. The prerenderer keeps readable text only, so no other picture reaches a saved page.

### A3. Drawings made in code (inline SVG in 30 files)

None draws a league or club mark. The ones worth naming:

- `src/components/home/art/HomeArt.tsx` (file header, lines 4 to 11) and `src/components/home/SportGlyph.tsx`
  (lines 4 to 9): generic pitch, clipboard, stand, court, ball, glove. Both headers state that nothing copies a
  real ground, kit, crest or league mark.
- `src/components/soccer-career/PlayerAvatar.tsx`: a cartoon bust with a plain shirt in the club's colour. A
  flat colour, no stripes, no badge, no sponsor.
- `src/components/club-manager/CustomClubForm.tsx` (line 17): the build your own crest tool is abstract shapes
  plus the player's own initials.
- `src/components/conquest/ConquestRegionMap.tsx` (line 18): teams are a colour and a name. "Never a logo".
- **Other companies' glyphs that ARE drawn, as buttons:** the X, WhatsApp and Instagram icons on the share row
  (`src/components/game/ShareButtons.tsx:19-36`), the Apple icon on the sign in button
  (`src/components/auth/AuthModal.tsx:384`), and Google's own rendered sign in button. These are the usual
  "share to" and "sign in with" buttons, not league or team marks. Each platform publishes its own rules for
  that use. Listed here so the answer to "is any other company's logo on the site" is complete.

### A4. What is not there (checked, with the check)

- No file under `src/` is an image (`git ls-files src` filtered for image extensions: 0).
- No URL ending in an image extension points anywhere but `flagcdn.com` and `douknowball.com`
  (grep over `src`, `index.html`, `public/manifest.json`).
- No CSS `url(...)` or `backgroundImage` loads an outside picture.
- No component is named for a team logo, badge, crest, kit or jersey.
- No Wikipedia or Wikimedia image or API call remains in `src` or `supabase/functions`.
- One saved page tells visitors why: the `/pro-football` hub carries the question "Why are there no team logos,
  helmets or player photos?" and answers that those are licensed and this is an independent fan project. No
  other page says it.
- No real sponsor is signed in Soccer Career: Round 49 moved deals to invented brands
  (`src/lib/soccerCareerEngine.ts:2996-2999` keeps two real names only to read saves made before that).

### A5. Leftovers and gaps worth knowing

1. **A photo game used to exist.** `/guess-the-face` was added 2026-02-09 and removed 2026-04-10 (commit
   `bb56bac9`). No picture from it is in the repo. Two traces remain: a label in the profile page's game list
   (`src/pages/Profile.tsx:36`) and a dead line in `public/_redirects:35` (a file the host ignores).
2. **Two database tables hold headshot links that nothing shows.** `nflfastr_player_stats.headshot_url` and
   `nflfastr_rosters.headshot_url` are in `src/integrations/supabase/types.ts` (lines 6360 and 6542). No code in
   `src` reads either column. The table names say they came with the public nflfastR dataset. Not visible to a visitor. The database
   itself was not queried for this audit.
3. **The guard is narrower than the rule.** `scripts/simBrand.mjs` section 3 (lines 111 to 132) checks only the
   pictures the home template hands a crawler (social image and icons). Nothing fails the build if someone adds
   a crest file to `public/` or an `<img>` from another host inside a game. The rule holds today because people
   followed it, not because a fence enforces it. A small fence would close that (see the plan at the end).

---

## Part B. Other companies' names in URLs, labels, titles, H1s and headings

### B1. Where the brief is out of date

| The brief names | True today | Evidence |
|---|---|---|
| `/jeopardy` | **Not a live page.** Retired in Round 305 (2026-08-27). It is a signpost to `/quiz-board`: title "This page moved to Quiz Board", H1 "This page moved", canonical `https://douknowball.com/quiz-board`, meta refresh to `/quiz-board`. Not in the sitemap, not in the registry, no page links to it. The show's name appears nowhere in visible text on any of the 192 saved documents | `src/App.tsx:474`; `public/jeopardy/index.html`; `curl http://localhost:4190/jeopardy`; `marks-scan.json` (jeopardy: 1 page, URL only) |
| `/deal-or-no-deal` | **Not a live page.** The game was deleted on the owner's call on 2026-08-05 and the address became a signpost to `/squad-deal` in Round 272 (2026-08-22). Same shape as above. The show's name appears nowhere in visible text | `src/App.tsx:409`; `src/data/gameRegistry.ts:138-140`; `public/deal-or-no-deal/index.html` |
| `/connections` | Live. Four more pages share the name | Table B2 |
| `/football-connect-4` | Live. Four more pages share the name | Table B2 |
| `/footle` | Live. The only "le" name on the site | Table B2 |

One correction to the word "redirect": both retired addresses answer **200**, not 301. See B7.

### B2. The 12 live pages named after another company's game or show

Read the columns like this. "Label" is `src/data/gameRegistry.ts`. "Title" is the saved page's `<title>` without
the " | DoUKnowBall" tail. "Headings" is how many h2 and h3 headings on that page carry the name. "LD" is how
many times the name sits in that page's structured data. "Slug" is what the game writes to the leaderboard
tables and uses for its saved daily result (`<slug>-daily-<date>` in the browser, `src/lib/dailyRecord.ts`).
"In" is how many other saved pages link to it (from `routes.json`).

**Connect 4 (Hasbro's board game). All five live, all in the sitemap, all added 2026-02-10.**

| URL | Label | Title | H1 | Headings | LD | In | Slug | Edge function called |
|---|---|---|---|---|---|---|---|---|
| `/football-connect-4` | Soccer Connect 4 | Soccer Connect 4: Football Trivia Grid Game | SOCCER CONNECT 4 | 7 | 6 | 9 | `football-connect-4` | `football-connect4-validate`, `football-connect4-suggest` |
| `/nba-connect-4` | NBA Connect 4 | NBA Connect 4: Basketball Trivia Grid Game | NBA CONNECT 4 | 7 | 6 | 11 | `nba-connect-4` | `nba-connect4-validate` |
| `/nfl-connect-4` | NFL Connect 4 | NFL Connect 4: Football Trivia Grid Game | NFL CONNECT 4 | 7 | 6 | 8 | `nfl-connect-4` | `nfl-connect4-validate` |
| `/mlb-connect-4` | MLB Connect 4 | MLB Connect 4: Baseball Trivia Grid Game | MLB CONNECT 4 | 7 | 6 | 6 | `mlb-connect-4` | `mlb-connect4-validate` |
| `/nhl-connect-4` | NHL Connect 4 | NHL Connect 4: Hockey Trivia Grid Game | NHL CONNECT 4 | 8 | 6 | 10 | `nhl-connect-4` | `nhl-connect4-validate` |

Also carrying the name: the meta description calls the game "classic four in a row" (the generic name, already
in use), one frozen guide sentence reads "Connect 4 of your color in any direction to win"
(`scripts/data/guideHeadingsFrozen.json`), the profile page's game list says "Connect 4"
(`src/pages/Profile.tsx:36`), and 36 other saved pages mention a Connect 4 page in their "more games" links.
Site wide: 41 pages, 41 headings, 161 mentions in text, 30 in structured data.

**Connections (The New York Times daily puzzle). All five live, all in the sitemap.**

| URL | Label | Title | H1 | Headings | LD | In | Slug | Database table read |
|---|---|---|---|---|---|---|---|---|
| `/connections` (2026-02-09) | Soccer Connections | Soccer Connections: Football Player Puzzle | SOCCER CONNECTIONS | 7 | 6 | 8 | `connections` | `connections_puzzles` |
| `/nfl-connections` (2026-03-08) | NFL Connections | NFL Connections: Football Grouping Puzzle | NFL CONNECTIONS | 8 | 7 | 12 | `nfl-connections` | `nfl_connections_puzzles` |
| `/nba-connections` (2026-03-08) | NBA Connections | NBA Connections: Basketball Grouping Puzzle | NBA CONNECTIONS | 9 | 8 | 8 | `nba-connections` | `nba_connections_puzzles` |
| `/baseball-connections` (2026-03-08) | MLB Connections | MLB Connections: Baseball Grouping Puzzle | MLB CONNECTIONS | 7 | 6 | 6 | `baseball-connections` | `baseball_connections_puzzles` |
| `/nhl-connections` (2026-03-08) | NHL Connections | NHL Connections: Hockey Grouping Puzzle | NHL CONNECTIONS | 7 | 6 | 8 | `nhl-connections` | `nhl_connections_puzzles` |

Also: a browser key `connections-streak` (`src/hooks/useConnections.ts:112`), a backup table
`connections_puzzles_auto_backup`, and the profile list label "Connections". The four colour difficulty tiers
(green, yellow, blue, purple) echo the original's presentation; that is a format likeness, not a name.
"Connections" is also an ordinary English word, and the site uses it that way too ("four hidden connections"),
so the site wide counts (41 pages, 43 headings, 145 mentions) overstate the product sense of the word.

**Footle (a coined name that leans on the "le" ending of Wordle, The New York Times word game). Live, in the
sitemap, the oldest game on the site (2025-01-01).**

| URL | Label | Title | H1 | Headings | LD | In | Slug | Browser keys |
|---|---|---|---|---|---|---|---|---|
| `/footle` | Footle | Footle: Daily Soccer Player Guessing Game | FOOTLE | 8 | 7 | 7 | `footle` | `footle-daily-<date>`, `footle-practice-run-v1`, `footle-unlimited-session-v1` |

The original's name is not written anywhere in the repo's shipped folders (it is on the banned list and the scan
found 0). "Footle" is itself an English word. It is also listed in `public/llms.txt` and in the owner's master
spec by this name.

**Sports Millionaire (leans on the TV quiz Who Wants to Be a Millionaire?). Live, in the sitemap, added
2026-07-06.**

| URL | Label | Title | H1 | Headings | LD | In | Slug |
|---|---|---|---|---|---|---|---|
| `/sports-millionaire` | Sports Millionaire | Sports Millionaire: Soccer Money Ladder Quiz | SPORTS MILLIONAIRE | 7 | 6 | 6 | `sports-millionaire` |

The show's full title is banned by the guard and appears nowhere. The page does keep the show's furniture: a 15
question money ladder and three lifelines, one of them called "50:50". The home page's static copy names the game
once.

**What the repo records about visits to these 12.** Repo docs record pageviews, not visits, and only the top ten
pages of each pull (`docs/PROJECT-STATE.md`, "Analytics truth", line 12724). None of the 12 is in any recorded top
ten. In the newest pull (30 days to 2026-09-14) tenth place was 489 pageviews, so each of these 12 had fewer than
489 in 30 days, which is under about 114 a week. No finer number exists in the repo.

**What the repo records about their search standing.** The Search Console report of 2026-09-03 (read 2026-09-15,
`docs/adsense/exclusion-source-audit-2026-09-15.md`) listed `/football-connect-4`, `/footle`, `/connections` and
`/baseball-connections` as "crawled, currently not indexed", last crawled between March and May. For the other
eight there is no per page record. Nothing in the repo records Bing's index per page, and Bing sends about three
times Google's traffic (7,953 against 2,619 visits in that 30 day pull). None of the 12 is on the brief's list of
pages that rank.

### B3. Names that echo a product or mode but are ordinary words (listed so nothing is hidden)

| Name | Pages | What it echoes | Reading |
|---|---|---|---|
| "My Career" | `/nba-my-career`, `/nfl-my-career`, `/mlb-my-career`, `/nhl-my-career` (label, title, H1, 7 to 8 headings each; save keys `nba-my-career-save-v1` and siblings) | The career mode of a basketball video game series, which writes it as one word with capitals. The site never uses that one word spelling (0 hits) and names no video game mode anywhere | Two of these are on the brief's "ranks, do not touch" list. `/nba-my-career` is the only page in this file with a recorded number: 674 pageviews in the 30 days to 2026-09-14, about 157 a week (242 in the 15 days to 2026-08-25). Leave as is unless a lawyer says otherwise |
| "Higher or Lower" | 10 registry games plus the hidden `/higher-lower-transfers` (noindex, not in the sitemap) | A traditional card game, and also the name of a known browser game | Generic phrase. Leave |
| "Dynasty" | `/cfb-dynasty`, `/cbb-dynasty` | A generic sports word; also a mode name in a college football video game | Generic. Leave |
| "Tycoon", "Bingo", "Fantasy Draft", "Front Office", "Stock Market" | `/stadium-tycoon`, `/player-bingo`, `/sports-bingo`, `/fantasy-draft`, four front office games, `/player-stock-market` | Genre words | Generic. Leave. Two are on the brief's ranking list |
| "Deadline Day", "Wonderkid" | `/deadline-day`, `/wonderkid-factory` | Football slang (one is also a TV broadcast brand, one was popularised by a management sim) | Common usage. Leave |
| "Sports Quiz Board" | `/quiz-board` | Already renamed off the show (B1). The board itself ($200 to $1000, five categories) still follows the show's format | Name is neutral. Format likeness only |
| "Squad Deal" | `/squad-deal` | Already the neutral home of the retired box game. Its guide still says "the banker" in five headings and four lines (`src/data/gameContent/soccer2.ts:2234-2310`) and in its meta description (`src/data/seoMeta.ts:162`) | Name is neutral. One word of show furniture in the copy |
| "Rarity Round", "Minefield", the Conquest maps ("Imperialism" in five titles) | as named | A rarity scoring quiz format, a classic computer puzzle, a fan video map format | Names are neutral or generic. Leave |

Checked and clean: no grid game is named after the baseball grid product (the seven grid games are all called
"Grid"), no draft game is named after a product (Fantasy Draft, Gauntlet Draft, Dart Draft), and `/footle` is the
only "le" name among 133 registry games.

### B4. League and organisation names in URLs and labels (a different thing from B2)

These name the sport the page is about, the way a newspaper section does. Counts from `marks-scan.json`:

| Name | URLs carrying it | Registry labels carrying it |
|---|---|---|
| NBA | 17 | 14 |
| MLB | 10 | 10 |
| NFL | 9 | 10 |
| NHL | 9 | 11 |
| F1 | 4 | 3 |
| World Cup | 4 (two of them signposts) | 1 |
| UFC | 2 (`/ufc`, `/ufc-chain`) | 1 ("UFC Guesser"; `/ufc-chain` is already labelled "Combat Chain") |
| NASCAR | 2 | 1 |
| AFL | 2 | 1 |
| Olympics | 1 (`/olympics`) | 0 (the label is already "The Medal Games"; the word remains in the URL, the title tail "Guess the Olympic Athlete", one guide heading and the category name "World & Olympic Games") |
| Super Bowl, World Series, Stanley Cup, Heisman, NCAA | 1 each, all under `/records/` | 0 |

All of the organisations in the first ten rows except the AFL are named in the footer disclaimer (Part C).

### B5. Names that live only in the machinery (no visitor reads them on a page)

| Identifier | Where | Why it is still there |
|---|---|---|
| `'jeopardy'` completion slug | `src/hooks/useQuizBoard.ts:200`, `src/data/completionSlugs.ts:55`, a row in the `game_score_caps` table | Holds every player's Quiz Board history. On the guard's `LIVE_IDENTIFIERS` list |
| `jeopardy-<date>` browser key | `src/hooks/useQuizBoard.ts:39` | Saved boards. Same list |
| `jeopardy_clues` table | `src/lib/fetchQuizBoard.ts:35` | The clue bank. Same list |
| `/jeopardy`, `/deal-or-no-deal` | `src/App.tsx:474` and `:409`, plus the two signpost files | Old links must keep working. Same list |
| `'fifa_cover'` | read once by the Soccer Career save repair | An old saved sponsorship value. Same list |
| six `*-connect4-*` edge function names | `supabase/functions/` | Called by the five Connect 4 pages. Visible in a browser's network panel and in the public repo, not on a page |
| six `*connections_puzzles*` tables | the database | Read by the five Connections pages |
| Profile page game list | `src/pages/Profile.tsx:34-51` | Labels for old score rows: "Connect 4", "Connections", "Olympics", "Guess the Face". The page is noindex. A signed in visitor can read them |
| `/guess-the-face/` | `public/_redirects:35` | A dead rule in a file the host ignores |

### B6. What `scripts/simNoRivalNames.mjs` does and does not cover

Run on this tree on 2026-10-08: "Checked 81 product names against 3168 files ... 0 findings", exit 0.

- It scans `src`, `public`, `supabase`, `scripts` and `index.html`, and fails the build on any of 81 patterns:
  life sims, sports video games, daily word and grid games, rival puzzle sites, TV game show titles, board games.
  It does not scan `docs/`, on purpose.
- FIFA is handled by an allowlist of 27 shapes: the governing body, its World Cup, rankings and awards pass; the
  video game does not.
- Six strings are exempt as `LIVE_IDENTIFIERS` (listed in B5), with the note that renaming any of them "is a
  migration job with redirects and a backfill, not a find and replace".
- One real person is exempt by full name in five data files (a Detroit pitcher whose surname is also a banned
  product name).
- **The names in B2 are not on its list.** "Connect 4" and "Connections" are not banned at all. For the quiz
  show only the full title is banned, so "Sports Millionaire" passes. "Footle" passes because only the original's
  name is banned. So the guard does not treat the 12 live pages as a problem today. If the owner renames any of
  them, the old name should be added to `RIVAL_NAMES` in the same round or it can drift back.
- One miss found in passing: a code comment at `src/lib/packBattle.ts:14` names a card game brand that is not
  on the list. The repo is public and the guard's own rule is that a comment counts. One line to reword.
- `docs/LEGAL_REVIEW.md` says nothing about logos or names. It is the 2026-07-02 review of the Privacy and Terms
  pages plus the deletion runbook. The asset and naming rules live in `CLAUDE.md` ("Legal rules") and in the two
  guards, `simBrand` and `simNoRivalNames`.

### B7. What a rename costs on this site

**First, the thing the brief gets wrong: there is no 301 here.** The host ignores `public/_redirects`. That was
measured on the live site on 2026-08-22 (`scripts/genRetiredStubs.mjs`, lines 5 to 31, and the warning at the top
of `public/_redirects`): a rule that should have returned a 301 returned 200 with the home page. So a moved
address on this site is a small signpost page at the old URL (meta refresh, canonical to the new URL, one visible
link) plus a client side redirect in the router. `/jeopardy` and `/deal-or-no-deal` both answer 200 today. The
generator's own header says a meta refresh "is not as good as a 301 and this file does not pretend otherwise".

A rename can stop at three depths. Each one includes the one above it.

**Depth 1. The name only (label, title, H1, headings). The URL stays.**

| What changes | Where | Fence that will hold it |
|---|---|---|
| Registry label | `src/data/gameRegistry.ts` | none on its own |
| Title and meta description | `src/data/seoMeta.ts` and its parts | `simSeoTitles`: the title must carry the label exactly once, be unique, and fit 60 characters with the brand tail. "Soccer Four in a Row: Football Trivia Grid Game" is one character over, so tails need recutting |
| The five guide h2s per game, and any guide sentence that says the name | `src/data/gameContent/*.ts` | `simGuideHeadings`: every h2 must carry the label exactly once, and every guide sentence is frozen in `scripts/data/guideHeadingsFrozen.json`. A sentence such as "Connect 4 of your color in any direction to win" cannot change without re-freezing it on purpose |
| H1, the how to play panel and the result screen | the page file and its own components (for example `src/pages/FootballConnect4.tsx`, `src/components/football-connect4/FootballConnect4HowToPlay.tsx`, `src/components/connect4/Connect4Finish.tsx`) | none |
| Search index | run `node scripts/genSearchKeywords.mjs` | `simSiteSearch` section 7 |
| Home page static copy, hub lists, What's New, profile list | `src/data/homeCopy.ts`, `src/lib/sportHub.ts`, `src/pages/WhatsNew.tsx`, `src/pages/Profile.tsx` | `simHomeCopy`, `simHubs` |
| Saved pages | rebuild with `npm run build:seo` | `simPrerender`, `simSchema`, `simHeadTags` |
| Sitemap | the page's text changed, so its `lastmod` moves to that day. Correct and automatic | `simSitemap` section 5 |

Cost: no redirect, no lost address. But the URL still carries the name, and it changes a title and an H1, which
the brief's own hard rule says needs his yes per page.

**Depth 2. The URL as well. This is the Round 305 recipe, done twice already (`/jeopardy`, `/deal-or-no-deal`).**

| Step | Detail |
|---|---|
| Router | Old path becomes `<Navigate to="/new" replace />`; new path gets the page (`src/App.tsx`) |
| Signpost | `node scripts/genRetiredStubs.mjs` writes the meta refresh page over `public/<old>/index.html`. `simRetiredRoutes` checks refresh, canonical and link agree, the target is live, and it is not a chain |
| Sitemap row | The old URL leaves `public/sitemap.xml`, the new one enters |
| Lastmod ledger | `scripts/data/lastmod.json` is keyed by URL. The new URL has no history, so it is dated the day it ships ("a route with no entry yet gets today", `scripts/genSitemap.mjs:195`). The old row drops out. Honest, but the page reads as brand new to a crawler |
| Every inbound link | `simRetiredRoutes` section 4 fails if any saved page still links to the old address. Each of these pages has 6 to 12 other pages linking to it, so all of those are re-rendered |
| Everything keyed by path | `src/data/seoMeta.ts`, `src/data/gameContent/loader.ts`, `src/data/searchKeywords.json`, `scripts/data/guideHeadingsFrozen.json`, hub lists, three or more test files per game. For `/football-connect-4` that is 14 files in `src` and 3 in `scripts` |
| Leaderboard slug and saves | **Left alone.** One line in `src/data/completionSlugs.ts` maps the old slug to the new path, exactly as `'jeopardy': '/quiz-board'` does today. Scores, streaks and saved daily results carry over untouched |
| Guard | Add the old path to `LIVE_IDENTIFIERS` if the old name is also added to the banned list |
| After publish | Request indexing of the new URL in Search Console and Bing Webmaster Tools; the old one drops out as "page with redirect" |

Cost in search: the old address keeps working for people. For a search engine the page starts again at a new
address and the signpost is the only thing passing its history across. The repo holds no record of how either
earlier move fared in Google or Bing afterwards, so there is no local evidence either way. That is the reason not
to do this to any page that ranks. For the 12 pages in B2 the recorded exposure is small: no traffic record, and
four of them were not in Google's index on 2026-09-03.

**Depth 3. The stored names as well (leaderboard slug, browser keys, tables, edge function names). Not
recommended in this workstream.**

- `game_score_caps` is an allowlist keyed by slug: "a game absent from this table earns zero, on purpose"
  (`supabase/migrations/20260830_leaderboard_score_caps.sql`, lines 57 and 111). A new slug needs a new row
  first, and every history table keyed by slug needs a backfill, or players lose their records.
- Browser saves sit on each player's own device under the old key (`footle-daily-<date>`,
  `connections-streak`, `nba-my-career-save-v1`). Nothing on the server can move them. The game would have to
  read the old key forever, which keeps the old name in the code anyway.
- Table and edge function names are live production objects. Renaming them is a database migration and a
  redeploy with both names alive during the change.
- None of these names is visible on a page. The brief's first hard rule ("do not change game logic, scoring,
  saves, or data") already rules this depth out.

### B8. Suggested neutral names (SUGGESTION ONLY, the owner decides per URL)

Nothing below has been applied. Each new name would need a quick check that nobody else trades under it.

| Today | Suggested label | Suggested URL | Why this one | My read |
|---|---|---|---|---|
| Soccer Connect 4, `/football-connect-4` | Soccer Four in a Row | `/soccer-four-in-a-row` | The generic name of the game. The page's own meta description already says "classic four in a row" | The clearest case of the 12: a board game brand used as the game's own name on five pages. If any rename is approved, start here, depth 2 |
| NBA Connect 4, `/nba-connect-4` | NBA Four in a Row | `/nba-four-in-a-row` | same | same |
| NFL Connect 4, `/nfl-connect-4` | NFL Four in a Row | `/nfl-four-in-a-row` | same | same |
| MLB Connect 4, `/mlb-connect-4` | MLB Four in a Row | `/mlb-four-in-a-row` | same | same |
| NHL Connect 4, `/nhl-connect-4` | NHL Four in a Row | `/nhl-four-in-a-row` | same | same |
| Soccer Connections, `/connections` | Soccer Common Thread | `/soccer-common-thread` | Says what the puzzle is: find what four players share. (Second choice: "Four of a Kind") | An ordinary word that is also a well known puzzle's name. Owner's call. Depth 2 if yes |
| NFL Connections, `/nfl-connections` | NFL Common Thread | `/nfl-common-thread` | same | same |
| NBA Connections, `/nba-connections` | NBA Common Thread | `/nba-common-thread` | same | same |
| MLB Connections, `/baseball-connections` | MLB Common Thread | `/mlb-common-thread` | same, and it fixes the one sibling whose URL says "baseball" while its label says "MLB" | same |
| NHL Connections, `/nhl-connections` | NHL Common Thread | `/nhl-common-thread` | same | same |
| Footle, `/footle` | Guess The Footballer | `/guess-the-footballer` | Matches the site's own family: Guess The Golfer, Guess The F1 Driver, Guess The College | Weakest case of the 12: a coined word, an English word in its own right, and the oldest name on the site. I would keep it |
| Sports Millionaire, `/sports-millionaire` | Sports Money Ladder | `/money-ladder` | The page's own title already calls it a "Money Ladder Quiz" | Cheap to move (6 inbound links, no traffic record). Reasonable to do |
| NBA, NFL, MLB, NHL My Career | no change | no change | Two are on the brief's ranking list; the phrase is ordinary English and the one word spelling is never used | Keep |
| UFC Guesser, `/ufc` | no change (or "MMA Fighter Guesser", `/mma-guesser`) | no change | A league name used to say what the page is about, same class as the 45 NFL, NBA, MLB and NHL URLs. The UFC is named in the disclaimer | Keep, unless he wants league names out of every URL, which would be about 60 addresses |
| The Medal Games, `/olympics` | label already done | `/medal-games` if ever | Only the URL still carries the word | Keep for now. Olympic wording is the one family in B4 a lawyer may treat differently, so worth asking if he ever takes paid advice |

If all 11 pages in the first three families moved at depth 2, that is 11 signposts, 11 sitemap rows re-dated, and
re-renders of every page that links to them. One release, built and gated like any other.

---

## Part C. Team and league names in copy, and what the footer disclaimer covers

Names are not logos. Saying "the NFL" or "Arsenal" to tell a reader what a quiz is about is naming, and the site
does it on every page by design (`CLAUDE.md`: a real name plus factual stats is the defensible ground; an invented
quote in a real person's mouth is not).

**What the disclaimer covers, in two lines.** One sentence in `src/components/game/Footer.tsx:25`, mounted once
for the whole site (`src/App.tsx:565`), says all team names, competition names, logos and trademarks belong to
their owners, that the site is an independent fan project not affiliated with, endorsed by or sponsored by 23
named bodies (NFL, NBA, UFC, NHL, MLB, FIFA, UEFA, the Premier League, the EFL, LaLiga, Serie A, the Bundesliga,
Ligue 1, the Eredivisie, MLS, the Saudi Pro League, the IOC, the NCAA, F1, the PGA Tour, NASCAR, the ATP, the
WTA), and that player names and statistics are used for identification and commentary only. It is in the raw HTML
of 177 of the 192 saved documents.

**What it does not cover, measured.**

1. **The home page's raw HTML has no disclaimer.** `index.html` and the live build's `/` (32,200 bytes) contain
   none of "trademark", "affiliated" or "fan project". The home page is not prerendered, so the footer only
   appears after JavaScript runs. A reviewer reading the source of the most important page sees no disclaimer.
   (The trust auditor found the same thing independently.) The other 14 documents without it are the 11
   signposts, `/profile` and the two admin pages, which is as intended.
2. **The AFL and the NRL are not named**, though the site has `/afl-higher-lower` and four Australian record
   pages (`/records/afl-premiers`, `brownlow-medal-winners`, `dally-m-medal-winners`,
   `nrl-premiers`), and Australia is about a quarter of the audience (`docs/PROJECT-STATE.md`, "Analytics truth").
   The WNBA (one record page) is not named either. The sentence opens with "all team names, competition names",
   which covers them in general terms; the named list is simply behind the catalogue.
3. **It does not name any game or show company**, which is right: it is a sports bodies disclaimer. It does
   nothing for the 12 names in B2.
4. `CLAUDE.md` says this sentence "is required and must not be removed or shortened". The brief's "one footer and
   one trademark disclaimer per page" is compatible with that as long as the one that stays is this one, whole.

---

## Where this conflicts with the brief or with standing rules (he should know before Phase 1)

1. **"301 redirects" (Phase 3) cannot be delivered on this host.** What exists is the signpost recipe in B7.
2. **Two of his five trademark examples are already done** (`/jeopardy` in Round 305, `/deal-or-no-deal` in
   Round 272). No work is owed on them.
3. **His own master spec names these games.** `docs/MASTER-BUILD-SPEC-2026-08.md` lists "Connections" as a model
   game (line 54), asks for a new "WNBA Connections" (line 2037) and lists "Connect 4", "Connections" and
   "Footle" under games to maintain and expand (lines 7306 to 7308). A rename needs those lines changed in the
   same round, and a decision on whether a sixth "Connections" page still gets that name.
4. **A rename changes a URL, a title and an H1**, which his hard rule says must be asked per page. So his answer
   to "OK to rename trademark-style URLs?" is the gate for everything in B8.
5. **The guide fence ties every heading to the game's name.** `simGuideHeadings` requires the label in all five
   h2s of each guide and freezes every guide sentence. That fence was built on his earlier ask for keyword rich
   headings. Any rename has to move through it deliberately, and Phase 1's "no keyword stuffed headings" rule
   runs straight into the same fence (the copy auditor covers that in full).
6. **Stored names are out of scope by his own first rule.** The leaderboard slug, browser keys, tables and edge
   function names keep their spelling, as they did for the Quiz Board.

## Proposed plan for this area

1. **Logos: nothing to remove.** Add one small fence in Phase 4 so the rule cannot break quietly: fail the build
   on any image file under `public/` that is not on a short list, and on any `<img>`, `url()` or image URL in
   `src` that points at a host other than `flagcdn.com`. Delete the dead `public/placeholder.svg` and reword the
   one comment at `src/lib/packBattle.ts:14` while there.
2. **Names: wait for his answer per family.** My recommendation: move the five Connect 4 pages and Sports
   Millionaire at depth 2; treat Connections as his call; keep Footle, the four My Career pages, `/ufc` and
   `/olympics`. Never go to depth 3.
3. **If he says yes to any:** one release, using the Round 305 recipe, with the old names added to the banned
   list the same day, the master spec updated, and Search Console plus Bing Webmaster Tools told about the new
   addresses by him afterwards.
4. **Disclaimer:** put the full sentence into the home page's static HTML in `index.html` (guarded the way
   `simHomeCopy` already guards that block), and add the AFL, the NRL and the WNBA to the named list. Both are
   additions; nothing is shortened.
5. **Tidy, optional:** update the stale labels in the profile page's game list and drop the dead
   `/guess-the-face/` line from `public/_redirects`.

## Files beside this one

- `marks-patterns.json`: the names and patterns searched for.
- `marks-scan.mjs`: the reader. `marks-scan.json`: its output, one row per saved page with where each name sits.
- `marks-report.mjs`: prints slices (`products`, `body`, `leagues`, `one /route`).
