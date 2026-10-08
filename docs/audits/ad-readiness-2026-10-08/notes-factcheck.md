# Fact check notes (AUDIT.md draft), 2026-10-08

Status: in progress. Read OWNER-BRIEF.md and AUDIT.md (801 lines) in full.

Method: every statement is re-derived by me from code, saved pages, data files or http://localhost:4190.
My scripts live in the session scratchpad (fc/reg.mjs, fc/crawl.mjs, fc/report.mjs), not in the repo.
Verdicts: OK (reproduced), WRONG (reproduced a different value), UNSUPPORTED (could not reproduce).

## Step 1 done: registry, ads.txt, sitemap, my own crawl of 192 documents on localhost:4190

OK, reproduced exactly:
- Registry 133 games, 13 categories, 36/20/17/12/11/11/7/6/4/3/2/2/2 (esbuild bundle of gameRegistry.ts). GAME_COUNT_LABEL "130+".
- ads.txt ends fa0. Blob in git is 59 bytes (LF). NOTE: the worktree file and localhost:4190 serve 60 bytes (CRLF checkout). Draft's "59 bytes" is a live site claim, fits the LF blob.
- Sitemap: 171 rows (worktree file and localhost). Dates 2026-08-25 to 2026-10-07. 133 games + 14 records + 7 hubs + 6 trust/legal + /leaderboard + 5 format history + world-cup-2026-results + 4 grid archives. No game missing.
- 192 documents, all 200. 10 noindex, 11 refresh signposts, 171 indexable. 177 with a snapshot block, 3 stubs (/profile, /admin/login, /admin/reports).
- 171 of 171: one title, one description, one self canonical, one H1; 0 duplicate titles, descriptions, H1s. Title 19 to 60. Description 51 to 215, 9 over 160 (same 9 pages, same lengths), 2 under 70 (/privacy 51, /terms 53).
- Breadcrumb data 147 of 171, the missing 24 are the ones the draft lists. FAQ data on 133 pages, 617 questions, all 617 visible as a heading, min 3 per game page.
- Headings in main content 4,691 (27.4 a page), 3,864 on game pages.
- Home raw HTML: 1,009 words, 15 headings, links 46 of 133 games, no disclaimer.
- Dead address on localhost: 200, home title, canonical to /, no robots tag, byte identical to home.
- Disclaimer counts: 172 once, 4 twice (/about /contact /privacy /whats-new), /terms three, 15 none.
- Consent sentence in 159 of 192 raw documents, 18 game snapshots lack it.
- Canned FAQ sentence on 133 game pages.
- Inbound links: min 4 on the same 10 pages, median 8, 0 orphans. 17 indexable pages with no link to /. 12 games with no link from home raw HTML or a hub (same list). Hubs list 94 games. /search is the only raw page listing all 133. 8 live pages nothing links to.
- Word counts on game pages reproduce with "text outside link tiles": min 543, median 676, q3 1,047, /golf-higher-lower 551 (182 heading words), /soccer-career 2,410. Retired pages 88, 2, 92, 102.

Small differences (definition level, not errors I can prove):
- /club-manager: draft 5,182; mine 5,228 without links, 5,355 with.
- /football-timeline: draft 106, mine 104. /contact 214 vs 211 to 224. /whats-new 44,224 vs 43,793 to 44,249.
- Lower quarter of game pages: draft 621, mine 620.
- Draft's thinnest 20 list leaves out /records/dally-m-medal-winners only if link text counts (643 with, 528 without).

## Step 2 done: code lines, fences, docs, guide measurements, thin headings, pools

OK, reproduced:
- GameSeoContent.tsx 177 to 178 is the canned FAQ; five parts print unconditionally inside `{content && (`. moreSports.ts 1153 is the golf heading. PROJECT-STATE 15392 is Round 382. PROJECT-STATE 12724 to 12745 is the traffic pull (22,904 / 78,484, Direct 9,650, Bing 7,953, Google 2,619, page numbers all match).
- simGuideHeadings: CONVERTED_FLOOR 131 (fails above and below), h3 at least 8, h4 at least 1, label in every h2. Frozen fixture: 131 routes, 2,385 lines, 59,718 words (counted).
- simIndexNow SITEMAP_FLOOR = 171, fails above and below. simSchema fails under 2 FAQ questions. simAdsense section 3 does not pin the fourth ads.txt field (also accepts RESELLER, draft says DIRECT only: trivial).
- Router: 194 `<Route` elements, 8 utility incl catch all.
- Family sizes by path: HoL 10, Connect 4 5, Connections 5, Conquest 5, Perfect Season 4, Perfect Lineup 3, Gauntlet 5, Chain 4, Grid 7, My Career 4, Front Office 4, Dynasty 2, Missing 4, Career Path 5. 10 HoL hooks, 5 Connect 4 hooks.
- All tier and family arithmetic adds up (21+47+65=133; 37,943+36,653+39,725=114,321; 3,552+7,951+10,691=22,194; upper 26,772; every family row sums to its tier).
- Guide files (my own bundle): 133 guides, 2,110 sub headings, 1,906 over exactly one item, 873 over one sentence, 665 part titles all with the label, 118 How to play titles with "free", 72 guides with every sub heading over one block, 2 unconverted (/aussie-rules-manager, /cage-clash), 45 guides with 385 to 405 body words (body = intro + parts + FAQ questions and answers). Total 114,213 by my tokenizer vs 114,321. Family word sums within 0.4 percent.
- Thin headings on saved pages (my own parser): 2,846 of 4,691 under 25 words (draft 2,849), 692 only open a run (693), 117 over link tiles, 2,037 real (2,039), 23 over nothing, 86 are H1s, 1,876 on game pages (exact). Golf 17 of 27. Worst 20 list reproduces.
- Repeated sentences (my splitter, p and li only): 11,622 sentences, 10,454 distinct, 98 on more than three pages; top list matches (133, 133, 66 or 67, 15, 15, 15, 14, 13 ...).
- Docs: 2026-10-03 pause (PROJECT-STATE 1983), Round 638 quote (simGuideHeadings header), Round 270 hub rule (sportHub.ts 17), record books not split (reapply-readiness 310), EU message 2026-02-11 (reapply-readiness 329), 2026-10-01 prompt quotes, 68/94 GSC, Authorized then Not found, 09-25 04:59 EDT.
- Pools: every pool number I checked in the family table is right EXCEPT NFL Higher or Lower.

WRONG or loose:
- Family table "NFL 60" for Higher or Lower: the NFL file is six stat categories (tds 60, passYds 34, passTds 34, rushYds 31, recYds 31, recs 30), 112 different players. 60 is one category.
- "1,350 (64%) repeat the words of the line under them": threshold dependent, my 50 percent overlap count is 1,515. Not an overstatement, but not reproducible as a hard number.
- "129 of the 133 How to play titles tack a keyword phrase": by a plain test 132 are not the bare title; 129 needs a judgement on 3 titles.
- Record page shares: mine 45.9 to 69.8 percent, draft 47.4 to 76.5. Grid archives: mine 13 to 17 percent, draft "about 25%". Same ranking, different splitter.
- Golf "17 of 27" uses the narrow count while the worst 20 list uses the wide count (golf would be 23 of 27 on that basis).

## Step 3 done: trust pages, marks rows, other lane, remaining fences. FINISHED.

OK, reproduced:
- Typed counts: index.html "120+" three times in the head plus the static copy line 266; About "over 100" (description and body) and "eleven sports" (line 33); Footle description "One of 100+"; llms.txt "100+ games"; What's New 113, 127, 126, Spring 2026 line.
- simHomeCopy rule is: fail at or above the real count, or more than max(15, 20 percent) behind. So "130+" would pass in the template today.
- Privacy "Last updated: September 15, 2026"; no Google Fonts, no flagcdn in the body; it does name Lovable as host receiving IP and browser type (PrivacyPolicy.tsx 68). Terms: Massachusetts. Contact: douknowball1@gmail.com, 30 days.
- Short disclaimer typed in About 98, Contact 58, PrivacyPolicy 132, WhatsNew 402, TermsOfService 115 (plus the Terms clause at 56).
- One banner: CookieConsent.tsx, drawn once at App.tsx 316. GA in index.html is gated on localStorage cookie-consent. Google Fonts stylesheet loads in the head unconditionally.
- 17 image files in public (10 brand, 5 arenas, og-image, placeholder). 7 img tags. 177 saved pages with exactly one img. 7 page files with no route.
- Footle addedOn 2025-01-01, six games 2026-02-09. Five games retired 2026-07-06 and 07-08 (registry comments).
- Four rejections: Round 256 (by 08-21), 08-30 3:52 AM EDT, 09-09 4:47 PM EDT, 09-25 04:59 EDT.
- Round 313 commit 2026-08-28 23:14 EDT. Round 305 /jeopardy 2026-08-27. Round 272 _redirects not honoured, measured 2026-08-22. Round 649 record pages committed 2026-09-19, live 2026-09-22.
- 12 named pages: inbound link counts 6 to 11, 6 to 12, 7, 6 (all documents incl /search). Name in title, H1 and 7 to 9 headings. Six connect4 backend functions. Money ladder 15, lifeline 50:50. No show name in visible text.
- League names in URLs: NBA 17, MLB 10, NFL 9, NHL 9, F1 4, World Cup 4, UFC 2, NASCAR 2, AFL 2, Olympics 1.
- Sibling likeness (Jaccard on four word runs): HoL 1.5, Connect 4 2.1, Perfect Season 2.6, My Career 27.9, Gauntlet 23.0, Dynasty 20.2, Conquest 9.8, golf vs AFL 19.5. /soccer-career 68.7 words per sub heading.
- Other lane (root checkout, read only): 12 modified code files, 132 guides, no /cage-clash, 8 HoL guides body 2,811 to 5,145 by my count (draft 3,141 to 5,491 with FAQ questions, same 75 percent growth), golf and baseball lines lost as the draft says, About still "over 100".
- 133 of 133 game descriptions say "free". Sitemap differs between AK and AL on 2 rows. simNoRivalNames is green with the new audit scripts present. No em or en dash in AUDIT.md. No tracked file changed.
- Whitespace word split reproduces /club-manager 5,182 exactly.

WRONG or loose (added to the list above):
- Claims table 1a "132 saved pages carry the run in that order": I get 133 of 133.
- "Test your ... knowledge is on 5 saved pages": 6 saved pages, the sixth is the retired /football-timeline.
- Record Books row gives "since 2026-09-22" in 8a and "2026-09-19" in 8b for the same split: built 09-19, live 09-22.

NOT re-derived (live site or browser only, outside my sources): badge bytes 41,421, /~flock.js, live dead address 200, live ads.txt 59 bytes (git blob is 59), live sitemap byte equal, the 17 page browser walk request counts, the seven badge pages of 2026-09-15, 740,000 rows, "28 checks and 7 tests", "30 files draw shapes", "37 of 65 intros".
