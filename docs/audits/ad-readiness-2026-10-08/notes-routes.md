# notes-routes (auditor: routes, Phase 0 items 1 and 5)

Restart file. STATUS: WORK COMPLETE. Only the final report (StructuredOutput) is left. Do not redo the steps below.

## Deliverables written
- scripts/auditRoutes.mjs (about 455 lines, reads only; `node scripts/auditRoutes.mjs` rewrites routes.json,
  `--dry` writes nothing, `--modules` prints the shared module table the families were worked out from).
  scripts/simNoRivalNames.mjs was run with it in the tree: 0 findings. Named audit*, so runAllSims does not pick it up.
- docs/audits/ad-readiness-2026-10-08/routes.json (245 KB): counts, families, lists, one record per Route (194).
- This notes file. No tracked file was edited (git status shows only untracked additions).

## Headline numbers (worktree = Release AL; live Release AK at localhost:4190 has the same 171 URL sitemap)
- App.tsx: 194 Route elements = 138 game + 24 reference + 11 retired redirect + 8 utility + 7 hub + 6 legal.
- Registry: 133 games, 13 categories, 75 daily, 12 featured. 12 commented out entries with the owner's reasons.
- By sport: Soccer 36, World and Olympic 20, Pro Basketball 17, Hockey 12, Baseball 11, Pro Football 11, College 7,
  Combat 6, F1 4, Tennis 3, Aussie Rules 2, Golf 2, NASCAR 2.
- Sitemap: 171 = 133 games + 24 reference + 7 hubs (home + 6) + 6 legal/trust + /leaderboard.
- Saved pages: 191 = 177 snapshots + 11 retired signposts + 3 noindex stubs. 10 carry noindex. 192 documents with home.
- 0 sitemap URLs without a saved page, 0 sitemap URLs carrying noindex, 0 saved pages without a route,
  0 registry games without a route or out of the sitemap, 0 orphans, 0 duplicate titles or H1s among the 171,
  every one of the 171 has exactly one H1 and a self canonical.
- Families: 68 of 133 registered games are reskins in 12 families; 23 shared engine; 19 shared pool; 23 standalone.

## Lists
- Retired redirects (11): /world-cup, /football-draft, /guess-soccer-club, /guess-transfer-value, /perfect-lineup,
  /tier-list, /grade-transfer -> / ; /world-cup-predictor -> /world-cup-bracket ; /deal-or-no-deal -> /squad-deal ;
  /overrated-underrated -> /face-off ; /jeopardy -> /quiz-board. Each has a meta refresh signpost document, canonical to
  the destination, no noindex on purpose, zero inbound links.
- Hidden live games (5): /football-timeline (106 words), /guess-nfl-team (88), /shirt-number (2),
  /higher-lower-transfers (92), /pack-battle (102). noindex,follow in the saved page, not submitted, zero inbound.
- Other unsubmitted: /search (noindex,follow, links all 133 games, linked from every footer), /profile (stub, linked from
  /whats-new only), /reset-password (4 words), /admin/login, /admin/reports (noindex,nofollow stubs; robots.txt
  disallows /admin/). Plus /profile/:username and the catch all, which have no fixed address.
- Page files with no route (7, dead code): DealOrNoDeal, FootballDraft, GradeTransfer, GuessSoccerClub,
  GuessTransferValue, PerfectLineup, WorldCup.
- Home raw HTML links 46 of 133 games; 87 not. Hubs cover 94 games (6 sports). 39 games in 7 sports have no hub.
  12 games have neither a home nor a hub link: /fight-career /fight-gym /fight-promoter /cage-clash /hof-or-bust
  /score-predictor /list-quiz /emoji-guess /mystery-box /idle-arena /face-off /perfect-lineup-f1.
- Thinnest indexable pages by inbound: explainers 4 to 5, /world-cup-2026-results 4, grid archives 6, games min 5.
- No "coming soon" or placeholder wording in any saved page. Three boards carry an empty database fallback line
  (CbbProgramBoard.tsx:87, NascarDriverBoard.tsx:95, TennisPlayerBoard.tsx:93), not in any saved page.

## Game count, how each consumer counts it
- Registry 133 (gameRegistry.ts:345). GAME_COUNT_LABEL "130+" (line 346): Index.tsx:281 hero, NotFound.tsx:63.
- Search.tsx:168 "All 133 of them" (TOTAL_GAMES). useGameNavbarStats.ts:158 totalGames.
- Typed floors: "120+" index.html lines 20, 176, 177, 266; src/data/homeCopy.ts:80; Index.tsx:222 (fenced by simHomeCopy
  as a floor). "over 100" About.tsx:10 and :26. "100+" Footle.tsx:484. 113 / 127 / 100+ in dated What's New entries.
- Comments only: sportHub.ts:4 and :15 ("113 games"), GameNav.tsx:133, Search.tsx:13 ("121 games").

## Host facts checked on localhost:4190
- Unknown URL returns 200 with the template (32200 bytes). Retired routes return 200 with the signpost (about 870 bytes).
- public/_redirects is not honoured by the host (its own header says so, Round 272).
- ads.txt on disk and served: ends f08c47fec0942fa0. The brief's line ends fa8. Flag for the ads auditor, do not "fix".

## Side findings
- scripts/genHiddenStubs.mjs line 127: file:// string compare never matches on Windows (Round 314 fixed the twin).
- Root checkout (Codex lane) is one game behind: 193 routes, 132 games, 170 sitemap URLs, no /cage-clash. Its drafts
  add no route, slug or hub (slug lists identical).
- docs/audits/ADSENSE-QUALITY-2026-10-01.md line 113: "Do not blanket-noindex games to manipulate the review";
  line 17: /pack-battle is intentionally retired and should remain excluded.
