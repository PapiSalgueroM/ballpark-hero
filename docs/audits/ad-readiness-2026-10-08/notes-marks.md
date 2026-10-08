# notes-marks (Phase 0 item 6, logos and other companies' marks)

Restart note: read this first. Rewritten after every step.

## Done so far
- Step 1: read OWNER-BRIEF.md, scripts/simNoRivalNames.mjs (462 lines), docs/LEGAL_REVIEW.md (102 lines).
  - LEGAL_REVIEW.md is about the Privacy and Terms pages only (2026-07-02). It says nothing on logos or names.
    The asset rule lives in CLAUDE.md "Legal rules" and in simBrand.mjs.
  - simNoRivalNames: RIVAL_NAMES list (life sims, sports video games, word games, rival puzzle sites, TV formats,
    board games), FIFA by allowlist, LIVE_IDENTIFIERS = '/jeopardy', "'jeopardy'", 'jeopardy-', 'jeopardy_clues',
    '/deal-or-no-deal', "'fifa_cover'". Scans src, public, supabase, scripts, index.html. Not docs/.
    Not banned by it: "connect 4", "connections", "footle", "higher or lower", "bingo", "guess who", "tier list".

- Step 2 DONE: router. /jeopardy and /deal-or-no-deal are ALREADY retired redirects (App.tsx 474 and 409), meta refresh
  stubs in public/, out of sitemap and registry. Brief is stale on both. Host does NOT honor public/_redirects, so no
  real 301 exists on this host (scripts/genRetiredStubs.mjs header, measured 2026-08-22): a rename = meta refresh stub
  + canonical + client Navigate. 11 redirects in App.tsx.
  Live mark-style routes: 5 connect-4, 5 connections, /footle, /sports-millionaire, 4 my-career, 11 higher-lower
  (10 in registry + hidden /higher-lower-transfers), /ufc, /ufc-chain, /olympics (label already "The Medal Games").
- Step 3 DONE: images. 17 image files under public/ (9 brand files from scripts/logo/gen_logo.py, 5 arenas webp
  generated 2026-10-03 with prompts in docs/designs/ARENA-ART-994.md, placeholder.svg, favicon.svg..). Looked at all 5
  arenas and og-image: no logos. Zero image files in src. 7 img tags in src: flagcdn (FlagImg x2, TeamSpinner,
  WorldCupPredictor), arena (HubExperience), user avatar (Profile), 1 test. Saved pages carry exactly one img each:
  /logo-mark.svg (177 files). Only external image host in code: flagcdn.com. 30 files with inline svg: none a league or
  club mark; third party glyphs = X, WhatsApp, Instagram (ShareButtons.tsx), Apple (AuthModal.tsx), Google button.
  DB columns headshot_url on nflfastr_player_stats and nflfastr_rosters exist in types but no src code reads them.
- Step 4 PART: wrote marks-patterns.json, marks-scan.mjs (writes marks-scan.json, 192 saved pages), marks-report.mjs.
  Completion slug = route minus slash (src/data/completionSlugs.ts); precedent: /quiz-board keeps slug 'jeopardy',
  storage prefix 'jeopardy-', table jeopardy_clues. Storage key shape `<slug>-daily-<date>` (src/lib/dailyRecord.ts).
  Edge functions with the mark in the slug: football-connect4-suggest, football-connect4-validate, mlb/nba/nfl/nhl
  -connect4-validate. Tables: connections_puzzles, baseball/nba/nfl/nhl_connections_puzzles,
  connections_puzzles_auto_backup, jeopardy_clues. lastmod ledger keyed by route (scripts/data/lastmod.json, 171 rows).

- Step 4 DONE. Scan totals (192 saved pages): connect4 url5 label5 title5 h1 5 headings41 jsonld30; connections
  5/5/5/5 headings43 jsonld37 (word is also generic); footle 1/1/1/1 hd9 ld7; millionaire 1/1/1/1 hd7 ld6;
  mycareer 4/4/4/4 hd37 ld24; higherlower url11 label10 title11 h1 10 hd79 ld63; jeopardy and deal-or-no-deal: url only
  (the two stubs), zero visible text; wordle 0 everywhere.
  Fences that bind a rename: simSeoTitles (title carries the registry label exactly once), simGuideHeadings (every h2
  carries the label once, sentences frozen in scripts/data/guideHeadingsFrozen.json), simRetiredRoutes (no saved page may
  link to a retired route, stub must match generator), genSitemap ledger (new route gets today's date),
  game_score_caps is an ALLOWLIST keyed by completion slug (absent slug earns zero), genSearchKeywords.
  Owner's own master spec names the games "Connect 4", "Connections", "Footle" (lines 54, 2037 "WNBA Connections",
  7306-7308) = conflict with a rename.
  Other finds: src/lib/packBattle.ts:14 comment names a card game product the banned list lacks; Profile.tsx:34-51
  label map still says "Connect 4", "Connections", "Olympics", "Guess the Face" (game removed 2026-04-10, bb56bac9);
  public/_redirects line 35 still lists /guess-the-face/ (file is ignored by host). Soccer Career sponsors were moved to
  fictional brands in R49 (soccerCareerEngine.ts:2996). Squad Deal guide says "the banker"; Sports Millionaire has
  lifelines 50:50; Connections uses 4 colour tiers: format echoes, not names.
  Disclaimer: Footer.tsx:25, on 177 of 192 saved docs; missing on 11 stubs, /profile, /admin/login, /admin/reports and
  the HOME template index.html (0 hits in raw HTML, live AK build too). Does not name AFL or NRL though the site has
  /afl-higher-lower and 4 Australian record pages.
- Step 5 DONE: traffic. Repo records PAGEVIEWS for the top ten only (PROJECT-STATE.md "Analytics truth", line 12724).
  30 days to 2026-09-14: /nba-my-career 674 (about 157 a week); tenth place /stadium-tycoon 489, so every other route
  in my tables had under 489 in 30 days (under about 114 a week). GSC 2026-09-03 report
  (docs/adsense/exclusion-source-audit-2026-09-15.md): /football-connect-4, /footle, /connections, /baseball-connections
  were "crawled, currently not indexed". No Bing per-URL data in repo.

- Step 6 DONE: marks.md written in full (Parts A, B1 to B8, C, conflicts, plan). simNoRivalNames run on the worktree:
  81 names, 3168 files, 27 FIFA shapes, 0 findings, exit 0. No tracked file touched (git status clean of M lines).
  Files added: marks.md, marks-patterns.json, marks-scan.mjs, marks-scan.json, marks-report.mjs, notes-marks.md.
- ONLY THING LEFT: return the StructuredOutput. Nothing else to run.

## To do (all done, kept for the record)
- Step 2: registry + App.tsx routes + retired routes: which trademark style routes are live or redirects.
- Step 3: images under public/, image imports in src, inline SVG, external image hosts.
- Step 4: per name: where it appears (URL, title, H1, label, guide, JSON-LD, localStorage, tables).
- Step 5: weekly visits from docs.
- Step 6: write marks.md, then StructuredOutput.
