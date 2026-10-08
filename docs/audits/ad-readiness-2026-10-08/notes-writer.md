# Writer notes (AUDIT.md), 2026-10-08

Job 1: merge the seven auditor reports into AUDIT.md at the worktree root. Done (first draft, 801 lines).
Job 2 (closing pass): apply the two checkers' corrections, fill the gaps, commit and push. Done, see below.
No tracked file edited. Scratch scripts live in the session scratchpad, not in the worktree.

STATE: CLOSED. AUDIT.md is final (about 1,045 lines, about 18,400 words). If restarted: do not rewrite it. Check
`git log --oneline -1` on branch ad-readiness. If the commit "Ad readiness Phase 0: the audit ..." is there and pushed,
only return the result. If it is not there, run the commit and push steps at the bottom.

## Settled from the data files (first draft)
- My Career shared sentences: copy-by-game.json has 38 sentence forms that sit only on the four US My Career guides
  (2 or more of them), 30 of those on all four. The crawl's 36 is its own count on the saved pages (sentences on 4 or
  5 pages). AUDIT.md says: 38 on two or more guides (2,322 words), 30 to 36 on all four depending on the count.
- Fewest inbound links: routes.json counts every saved page (5, includes the noindexed /search); tech counts only
  sitemap pages (4). Same fact: 4 indexable pages link in, 5 with /search. AUDIT.md uses 4.
- Tiers: the copy auditor's A 21, B 47, C 65 is the detailed proposal (copy-tiers.json). The routes auditor's cut by
  code is A 23, B 42, C 68. AUDIT.md presents copy's, names the difference, and asks the owner (questions 9 and 10).
- Thin word counts: AUDIT.md uses the crawl's (main content: /contact 214, /leaderboard 477, /accessibility 510).
- soccer2.ts: NOT modified in the root checkout (12 modified code files, no soccer2.ts). Its Higher or Lower draft
  is in a stash instead (see below).
- ads.txt: committed blob ends fa0 plus one line feed, 59 bytes. A Windows checkout measures 60 (CRLF).
- Golf example verified at src/data/gameContent/moreSports.ts lines 1133, 1153, 1155.
- Start date: gameRegistry.ts dates Footle 2025-01-01 (one game), then six games on 2026-02-09.
- "Do not blanket noindex games" is the 2026-10-01 audit's own line, not the owner's words.
- Per family cut estimates: summed from copy-by-game.json phase1.estimatedCut.

## Closing pass: what was verified before applying the checkers' corrections
All corrections were supported. None was rejected.
- NFL Higher or Lower is six stat lists (60, 34, 34, 31, 31, 30) in src/data/nflHLCategories.ts, not one pool of 60.
  Fixed in AUDIT.md section 9 and in family-plan.md (the Higher or Lower paragraph).
- duplicates.json: repeated sentences raw 106 (9% of appearances), masked 114 (10.5%, 5.6% of words). Masked buckets
  3 / 1 / 21 / 7 / 82. The per page shares in the file are the masked ones: record pages 47.4 to 76.5, grid archives
  18.9 to 25.2, My Career US 22.2 to 25.1. The fact checker's exact matching gives 46 to 70 and 13 to 17.
- Thin copy headings on the 133 game routes: h1 76, h2 39, h3 1,634, h4 127 = 1,876. So 1,761 are sub headings.
- The "says the line under it again" rule in both scripts is 0.6 of the heading's words (auditDuplicateCopy.mjs line
  140, copy-measure.mjs line 97). 1,350 at 0.6, the fact checker's 1,515 at 0.5.
- /soccer thin headings: 36 h3 (its 36 game names, required as headings by simHubs) + 1 h1 + 2 h2 = 39.
- The extra h2 above the guide: 126 game pages (h2 sequences in duplicates.json; 7 pages start at "how").
- history.json: traffic reading 3 (2026-09-05 to 09-19, about 1,000 visitors a day, Bing 3,882, Google 1,705);
  Search Console 2026-09-20 = 68 indexed, 94 not (78 discovered, 10 crawled, 5 redirects, 1 noindex); fences 11 and
  16 to 21; owner decisions of 2026-08-29, 2026-08-30 and 2026-10-01 (both way quotes).
- docs/audits/LIVE-RENDERED-AUDIT-2026-10-01.md lines 272 to 289: the ten fixes and the "will not move the indexing
  numbers" line.
- Root checkout, read only: 12 modified code files; `git stash list` shows 7 stashes, the top three are "Paused
  Codex845" guide stashes (soccer2, football, four guide files). Root docs/WORKBOARD.md (uncommitted) notes of
  October 8: the brief was not pasted to Codex, no Phase 1 to 4 work starts there, drafts not to be shipped on its
  notes, file split to be proposed after Phase 0 approval; rounds 842 to 845 named; Round 1097 Soccer Perfect Season
  is a held draft (PR 186, converted guide floor 132); it also records Release AL live at 09:48 UTC.
- Saved pages: all 5 explainers print "N sources across N publishers, last checked <date>"; record pages open with
  their own intro and odd season notes and have 0 "last verified" lines.
- simAdsense.mjs line 464 EXPECTED_CALLERS = 80. simHomeCopy.mjs lines 372 to 377 (fails at or above the real count,
  or more than max(15, 20 percent) behind: 107+ to 132+ pass at 133). PrivacyPolicy.tsx line 68 names the host.

## What changed from the first draft (for the return)
- Header: says Release AL went live the same morning (other lane's note), that the files are committed on the side
  branch, that two checkers went over the draft, and where to read if short on time.
- Short version: item 4 reworded (half to three quarters), one new line on the two written directions.
- Claims tables: 1a evidence 133 of 133; 1b "about two thirds"; 2b measure named; 3a explainers' sources; 4c two
  guesses; traffic row with the newer reading and "mostly desktop unchecked"; new row "the games themselves are fine".
- Section 1: non page public files, /profile/<name>, signpost defined, Round 1097 effect.
- Section 2: counting rule stated, pointer.
- Section 3: one count (114, with buckets), exact figures beside the blanked ones, likeness measure named, one
  headline heading number, 1,761, golf 17 and 23, filler on 6 pages, the extra heading on 126 pages, pointer.
- Section 4: simHomeCopy rule, component files and lines, 80 ad banner files, Essential only on 2 pages, two guesses
  for the second banner, privacy names the host already, Terms line, pointer.
- Section 5: three boards with a fallback line, 12 commented out entries, the 2026-10-01 open items; lane only small
  things dropped.
- Section 6: not legal advice caveat up top, the banned names rule and the 4 names not on it, packBattle.ts line 14,
  record URL names, /ufc and /olympics, headshot columns; the "newspaper" framing removed.
- Section 7: 59 against 60 bytes, DIRECT or RESELLER.
- Section 8: "a check" defined; context list with 2026-08-30 and both way quotes; 8a record row fixed, explainers row
  added; 8b new row for the 2026-10-01 direction, 2026-08-29 directive, Terms pin; 8c five new rows (ad banner count,
  privacy line for sources, record page check, hub checks, sitemap count); 8e fixed (126 and 7, 1,761); 8f stashes,
  the other lane's status and Round 1097; new 8g (the ten fixes) and 8h (where Google stands, with the breakdown).
- Section 9: family page proposal (8 or 1), NFL pool, non game pages table, explainer topics, questions 6, 7, 8 named
  as the three that block.
- Section 10: regrouped (5 blank lines, 3 blocking, 16 with defaults, 4 lists, 9 only he can answer); new questions
  16 (extra heading), 17 (ranking pages order), 18 (new games meanwhile), 19 (ad banner on new pages); Q4 now covers
  /ufc and /olympics; Q20 says what an exact count costs; Q37 notes the audit's own marks files.
- End: data index gained the two checkers' notes; new "What nobody rechecked" block.

## Things I am still unsure of (carried into the return)
- Why the crawl counts 36 My Career sentences on all four saved pages and the guide source count is 30.
- Whether the Lovable badge can be switched off on the free plan (nobody checked pricing).
- What the brief saw as a second banner (two guesses, neither proven).
- Google's current consent platform rule was not checked by any auditor.
- The 7 stashes in the root checkout and the GridArchive.tsx draft were not read by anyone.
- /footle: the 2026-09-03 report lists it as crawled, not indexed; a 2026-09-15 inspection shows it indexed.
- Round 1097's guide shape is taken from the other lane's notes ("floor 132"), not from reading its branch.
- The report grew from 13,552 to about 18,400 words while one checker asked for it to be shorter. The gaps had to
  be filled; the "Short on time?" line at the top is the mitigation.
- The marks files under docs/ spell out other companies' game names in a public repo (allowed under docs/, flagged
  to the owner as question 37).

## Commit and push steps (closing pass C7)
cd to the worktree; git status; git add AUDIT.md docs/audits/ad-readiness-2026-10-08 scripts/auditRoutes.mjs
scripts/auditCrawl.mjs scripts/auditDuplicateCopy.mjs; commit "Ad readiness Phase 0: the audit (AUDIT.md, the crawl
and duplicate scripts, the data)" with the Co-Authored-By line; git push -u origin ad-readiness.
simNoRivalNames was run first on 2026-10-08: "Checked 81 product names against 3168 files", "No rival product names
found. 0 findings.", exit 0. No file in the folder is over 3 MB (largest about 1.1 MB).
