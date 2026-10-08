# notes-copy (auditor: copy area, brief context items 1, 2, 3 and the plan per game family)

Restart file. Rewritten after every step. If you are a restart, read this first and do not redo finished steps.

## Outputs owed
- copy-measure.mjs (my script, in this folder, NOT under scripts/). Reads copy-filler-phrases.json and routes.json.
- copy-by-game.json (per game table), family-plan.md (per family plan), this notes file.
- Final answer goes through StructuredOutput only.

## Done
1. Read OWNER-BRIEF.md, notes-routes.md, notes-crawl.md, types.ts, guideShape.ts, loader.ts, GameSeoContent.tsx,
   simGuideHeadings.mjs header, seoMeta.ts header, the /golf-higher-lower and /soccer-career guides.
2. copy-measure.mjs parts 1 and 2 written and run (bundles loader + registry + seoMeta with esbuild's JS API into os.tmpdir).
   Part 3 (family likeness, tiers, write copy-by-game.json) NOT yet written.

## Facts so far (all measured at source by copy-measure.mjs)
- 133 games, 133 guides, 0 without a guide. 131 converted to sections, 2 flat (/aussie-rules-manager, /cage-clash).
- Guide words: 114,321 in all = 90,486 body + about 20,000 heading words + the template FAQ. CLAUDE.md's "47k" is stale.
- About 60 guides have a body of 385 to 405 words: written to a size.
- Every guide prints the same five h2 in the same order BY CONSTRUCTION (GameSeoContent.tsx lines 249 to 321 are unconditional).
- 665 h2, 0 default, all 665 carry the game label, 663 add 3 or more words. How to play h2: 129 of 133 are
  "How to play X, a free ... game" (4 exceptions). 209 h2 carry a search word beyond the name.
- FAQ: 484 hand written (2 to 9 a game) + 1 template appended in code (GameSeoContent.tsx 177-178) on all 133.
  Whole answers repeated across pages once masked: only 4 (on 14 pages: gauntlet 5, conquest 4, my career 3, hot seat 2).
  Repeated questions: 39 forms. "No." opens 63 answers, "Yes." 55. 6 pages have an own "Do I need an account?" question.
- Guide sentences on more than one guide: 133 forms; on more than 3: 47 (My Career US 4, Conquest 5, Gauntlet 5).
- Brief's banned filler in the GUIDES: zero of the three exact phrases. 1 "casual fan" (/rarity-round, legit use),
  1 "Diehards" (/baseball-career). In SAVED PAGES: "test your knowledge" 5 pages, all from the page file's
  description prop, not the guide: LineupBuilder.tsx:539 (/build-your-xi), NbaLineup.tsx:405, CollegeGrid.tsx:159,
  Teammates.tsx:37 and :180, NascarChain.tsx:21, GuessTheCollege.tsx:92 (and hidden FootballTimeline.tsx:174).
  "How well do you know" on 5 boards (F1Driver, F1Constructor, CbbProgram, TennisPlayer, NascarDriver) + GuessTheNationBoard.
- Golf: 16 section headings, all 16 over one block, 12 over one sentence; 148 heading words over 325 body words.
- Soccer Career: 2179 body words, 23 section headings, 9 over one block, 2 over one sentence, 68.6 words a heading.
  It has one mislabelled h4: "A pay cut, an injury and a rival's Ballon d'Or" sits over a rule about the vote.
- Fences that Phase 1 collides with: simGuideHeadings (Round 638; label in every h2, 8 h3 + 1 h4 minimum,
  CONVERTED_FLOOR 131, sentences frozen in guideHeadingsFrozen.json), simSeoTitles (Round 642; title carries label + sport
  word + kind of game; description must say "free"), FAQPage JSON-LD built from the same array (Round 373), simSchema s3.
- Reference content today (all in sitemap): /records + 13 record pages, 5 format history explainers (2,062 to 3,900 words),
  /world-cup-2026-results, 4 grid archives (about 9,500 words each), /whats-new 44,385 words, 6 sport hubs.
- No mechanic family hub exists. Only sport hubs (6). A family hub is a NEW page (owner decision).

## Done, continued (steps 3 to 6 are FINISHED, do not redo)
3. copy-measure.mjs complete (8 parts) and run: copy-by-game.json WRITTEN (739 KB, summary + 133 game records).
   Inputs it reads: routes.json, copy-filler-phrases.json, copy-tiers.json (my tier proposal, all in this folder).
4. copy-data-sources.mjs written and run: copy-data-sources.json WRITTEN (68 reskin routes traced to local data
   modules, tables, edge functions; 57 of 66 local modules bundled and counted).
5. copy-other-lane-drafts.mjs written and run (prints only, writes nothing, read only on the root checkout).
6. Read: soccerCareerEngine.ts calculateLegacy (7969), getLegacyTier (7957), rollPrimeType (2551), isInPrime (2559),
   isPastPrime (2568), growStat (2844), effectivePotential (2607), pushCeiling (5695), calculateBallonDor (6896),
   calcSeasonRating (4009), calcAppearances (3775). Other Tier A engines: nflMyCareer.ts progress/shouldRetire/legacyOf
   (and nba/mlb/nhl twins), frontOffice.ts capUsed/capRoom/tradeValue/proposeTrade/runPlayoffs (and three twins),
   cfbDynasty.ts cfbRecruitClass/signRecruit, cbbDynasty.ts twins, fightCareer.ts ratingOf/shouldRetire/legacyOf,
   fightGym.ts gymVerdict, fightPromoter.ts promoterVerdict, stadiumTycoon.ts legacyPointsOf/capacity/tapValue,
   clubManagerScore.ts seasonLedgerScore, gridRarity.ts rarityPercent.

## Headline numbers (final, from copy-by-game.json summary)
- 2,110 section headings (1,898 h3 + 212 h4): 1,906 over ONE block (90%), 873 over one sentence (41%),
  1,347 over fewer than 25 words (64%), 1,350 restate their one line (64%). 72 guides: every section heading over one block.
- Heading words 20,332 = 22.5 per 100 body words (Tier C 32.9, Tier B 24.9, Tier A 11.5; Soccer Career 9.4).
- Body per guide: min 325, q1 396, median 426, q3 723, max 3,498. 45 guides between 385 and 405. 72 under 450.
- Numbers per 100 words: A 3.4, B 3.3, C 3.5. Tier C sentences are as specific as Tier A. 37 of 65 Tier C intros carry a number.
- Likeness inside reskin families (four word runs, name masked): Higher or Lower 1.5%, Connect 4 2.2%, Perfect Season 2.6%,
  Perfect Lineup 2.3%, Connections 1.7%, Chain 0.9%, Grid 0.9%, Daily clue 0.5%, Career Path 1.4%, Missing 1.7%,
  Conquest 9.8%, Gauntlet 23%. Shared engine: My Career US 27.7% (38 shared sentences, 2,322 words), College Dynasty 20.1%.
- Tiers proposed: A 21 pages (37,943 words, cut about 3,552), B 47 (36,653, cut 7,951), C 65 (39,725, cut 15,269).
  Total cut about 26,772 of 114,321 (23%). Tier C mean 611 words today, about 376 left.
- Round 638 was 2026-09-19 (PROJECT-STATE.md 6507 to 6528; "every original sentence kept word for word").
  guideHeadingsFrozen.json holds the flat pre conversion text of 131 guides.
- Master spec D46 (MASTER-BUILD-SPEC line 5489) already says "Do not repeat the same generic paragraph across every game".
- sportHub.ts header (Round 270): small categories deliberately get NO hub, "a hub over two games is a thin page".
- Reference today: /records + 13 pages (1,159 rows, 1889 to 2026), 5 format histories, WC 2026 results, 4 grid archives
  (44 boards each 2026-08-17 to 2026-09-29, 1,584 crossings, 12,672 answers listed; generatedFor 2026-09-29),
  /whats-new 308 entries in 5 month sections, 6 sport hubs. No byline anywhere; no last verified date on record pages.
- Codex drafts (root checkout, uncommitted): rewrites 8 of 10 Higher or Lower guides (not /higher-lower, not /nfl-higher-lower),
  3,141 words become 5,491 (+75%), real data facts replaced by "Illustrative ... counts only". Also sportHub.ts changes the
  TITLE of all six hubs, records.ts adds a reading paragraph + related per record page, About.tsx drops the "One person"
  passage and prints the gmail address, Contact.tsx grows. soccer2.ts is NOT modified there (the task text said it was).
  guideHeadingsFrozen.json is not in their diff, so their guide draft would turn simGuideHeadings red as it stands.

## Done, final
7. family-plan.md WRITTEN (10 sections, about 275 lines). No em or en dash in any file of mine (checked with Grep).
8. Late corrections folded in: only 6 pages have an own "Do I need an account?" FAQ (not 11; the first regex was noisy);
   126 of 133 game pages have their own H1 (the game name) and print the seoMeta search title as an extra h2, only 7 use
   the search title as the H1; simSchema.mjs lines 117 to 124 fail a game page with no FAQPage markup or fewer than 2
   questions; 28 harnesses and 7 tests name the guide files; GameHelp.tsx (the in game "?") reads how to play, rules and
   example from the same guide data, so Tier C cuts must keep the data and only change what the page prints.
   Firm cut estimate 22,194 words (19%), up to 26,772 (23%) if Tier C pages stop printing 4,578 words of generic steps.
   git status in the worktree: only untracked additions, no tracked file touched.

## Files of mine in this folder
copy-measure.mjs, copy-by-game.json, copy-tiers.json, copy-filler-phrases.json, copy-data-sources.mjs,
copy-data-sources.json, copy-other-lane-drafts.mjs, family-plan.md, notes-copy.md.

## Next
9. StructuredOutput (the only thing left).
