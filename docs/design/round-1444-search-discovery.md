# Round 1444: clearer search discovery

Date: 2026-10-21. Status: design and original-outcome proof only. No product implementation or release qualification yet.

## User problem and scope

Anthony supplied three SEO and AI search dashboard screenshots and asked to work on them. The review is explicitly Out of date. It flags generic home headings/image descriptions, incomplete Search Console setup, sitemap attention, a missing AI summary and an NFL Grid strategy opportunity. Most technical findings are green. We will improve the actual source gaps without assuming a stale warning identifies a broken implementation.

The three deliverables are:
1. A compact, visible home description that says trivia, puzzles and career sims, preserving the owner's name-only H1, the registry-derived count and account-free play.
2. A current factual version of the existing public/llms.txt, linking Club Manager, NBA My Career, NFL My Career and NFL Grid, and distinguishing fictional simulation outcomes from historical sports records.
3. More useful strategy in the existing /football-grid guide, with no promise that a named answer earns a fixed rarity percentage.

No new game, article route, AI summary route, player data, engine change, account change, GSC verification token, sitemap rewrite, image or branded asset is needed. Decorative artwork keeps its existing accessibility treatment unless a concrete informative image defect is observed.

## Evidence and priorities

The supplied SEO panel shows 50,188 pageviews, with 50,075 from search engines and 113 from AI assistants. The Google card separately shows 7,658 clicks and 52,837 impressions. Soccer Career, the home page, Club Manager and NBA My Career lead the pictured search/AI landing pages. These are different metrics, and the complete screenshot date filter is unknown. No ranking position, keyword difficulty, traffic guarantee or causal uplift is inferred.

Current source already contains raw readable home copy, metadata, structured data, a generated 171-URL sitemap, robots rules, llms.txt and a long NFL Grid guide. The September 15 GSC record observed the verified Domain property and a successful sitemap read with 148 discovered URLs. That historical observation does not establish current account setup.

The short home H1 was a direct owner request, recorded beside Index.tsx's H1. Keep it. No hidden keywords, clipped text or additional account prompt above games. The header and home drawings are decorative SVGs next to visible text; the boot image is decorative too. No actual missing informative image alternative has been established.

## Exact implementation boundaries

Product changes, after observed intended original failures:
- src/pages/Index.tsx: only the existing short hero paragraph.
- public/llms.txt: concise factual catalog and disclosure links.
- src/data/gameContent/football.ts: only the /football-grid entry, with no real sports data additions.

Support:
- scripts/simSeoDiscovery1444.mjs: actual exported guide and registry, parsed comment-free Index JSX, real summary URLs, three distinct outcomes and effective in-memory faults.
- .github/workflows/seo-discovery-1444.yml: remote original proof first, later evolved to full affected-source qualification.
- docs/superpowers/plans/2026-10-21-search-discovery.md and this design.
- Root owns status/workboard updates and generated adoption separately.

The base is bc79b526cb69a4e913416c77c6dba00fe9401a16. The shirt-sales lane is Round1443, formerly draft alias1519, in a different checkout. Shared I-lane claims1519-1522 and reservation1500-1549 remain untouched.

## Source and behavior contracts

Home: one visible DoUKnowBall H1, unchanged HOME_COPY and generated template agreement. Keep the description as one plain visible template expression using GAME_COUNT_LABEL exactly once. Say sports trivia, daily puzzles and career sims naturally, and keep the free/no-account claim. Do not import homeCopy into the entry chunk. The first game and account-prompt gates stay at their existing limits.

Summary: all Markdown links must be canonical https://douknowball.com URLs with no credentials, tracking query or fragment and must resolve to real live routes. Keep the registry's current rounded game-count literal, because simTrustCopy verifies it. Include /soccer-career, /club-manager, /nba-my-career, /nfl-my-career and /football-grid. Explain that career/manager outcomes are fictional simulations. Remove the blanket real rosters, real stats, verified lineups promise and suspicious unsupported group counts. Retain useful About, Contact and sitemap links. No new universal verification or privacy promise.

NFL guide: use the current exported FOOTBALL_CONTENT entry and flatGuide, not source comments. Advice must preserve the actual fifteen guesses, nine cells and six misses, no reused correct name, suggestions from the answer key and saving a flexible answer for the hardest crossing. Existing source has those underlying rules: GUESS_LIMIT15 and the duplicate-name return in useFootballGrid. Rarity comes from picks on the same puzzle and may change; it is not guaranteed by choosing a particular name. gridRarity has a special101 empty-crowd result, so do not promise all displayed percentages always fall within1-100. Avoid adding real-athlete facts; a criterion-level hypothetical example is sufficient.

## Verification design

Original phase must run before product edits. Five foundation checks must pass: real registry/live routes and H1/count, existing plain hero paragraph, existing canonical summary, substantial exported NFL guide plus source-backed game rules, and all unrelated football-guide bytes held. Then exactly three real AssertionError outcomes should fail:
- SEO_HOME_DESCRIPTION_MISSING
- SEO_SUMMARY_CAREERS_MISSING
- SEO_GRID_RARITY_PROMISE

No import, setup, compile, transport or empty-coverage error earns original credit. The report must show all three outcomes observed, exact marker in the actual assertion error, five passed foundations, no errors, unchanged source and zero transport. The workflow also holds all existing product bytes against the exact base and runs real app types.

After implementation the same outcomes must pass. Three controls change only in-memory copies: home-generic restores the generic description, summary-unlinked removes the actual Club Manager link, and guide-promised-rarity appends an unqualified fixed-rarity promise to the actual exported guide. Each must change input hashes and cause exactly its attributed outcome to fail while the other two pass. No repository mutation or marker-metadata-only credit.

Four unchanged baselines run separately: simHomeCopy, simTrustCopy, simNflGridPage and simNflGrid. Their existing controls must execute and report actual planted failures under their established exit conventions. Runtime remains on GitHub Actions with locked dependencies, offline transport and complete evidence hashes.

Full affected-source qualification comes after observed original failures: real app types, focused guards/controls, production and SEO builds, all18 completed-build readers, all14 unchanged download caps, home fold/mobile/overflow/reduced-motion checks, affected NFL route play and saved phone images. Do not run readers against a build in progress. Refresh/adopt only intended guide/search/snapshot/ledger output; unrelated entries must hold.

After merge and publish, perform bounded raw public/asset/crawler readback. A free current Lovable scan and current GSC property-specific setup remain distinct final dashboard/account checks. If tools cannot perform them, record them as unverified rather than claim the warning is cleared.

## Primary sources

- [Lovable SEO and AI search](https://docs.lovable.dev/features/seo-aeo): scans can be out of date, scan and paid AI fix differ, GSC verification/submission are distinct checks, and missing llms.txt is not a scan issue.
- [Google AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): useful crawlable content matters; special LLM files do not improve Google ranking.
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): canonical URLs and accurate meaningful lastmod dates.
- [Google image guidance](https://developers.google.com/search/docs/appearance/google-images): useful contextual image descriptions, avoiding keyword stuffing.

The screenshot's AI summary wording is not defined in the official Lovable page. Refreshing an existing factual summary is justified, but it is not evidence that this clears that particular badge.

The first Green candidate reproduced a stale literal in the existing HomeCopy srsource fault, before it could plant the fault. Its only guard adaptation now uses the existing exactly-one controlledRe helper at the actual closing H1, with the same hidden span, part8 detector and all assertions. Original bc79 plus original guard and current plus adapted guard each run normal, hiddenh1 and srsource. Whole forward and inverse source bindings restrict the adaptation to those two lines. The failed original Green evidence remains retained. The browser proof also now expects the existing football emoji in the title and uses an effective body minimum width for its overflow fault. Product copy is unchanged by these proof repairs.

Second Green39669595699 is retained failed: one setup readiness selector matched two real How to play buttons, and the changed overflow style still did not trip the innerWidth-based predicate. Readiness now uses the existing unique actual ready-guide section. Overflow is strengthened against the configured page viewport while retaining actual geometry on pass and failure and the same2px tolerance. Existing body min-width fault and exact style restoration stay unchanged. HomeCopy metadata now explicitly distinguishes its adapted anchor from unchanged assertions. Product hashes remain held.

Initial Green39672164076 now passes all six required jobs. Exact31576B/SHA25674c623e745e4d8118f2d2ca4212d8ac14908e8c232801806f5641590c2a5799e generated patch is adopted locally in its five allowed paths. Six complete ZIPs141 root-manifest members and797 captured dist files are admitted. Actual7positive/3fault/3restore browser cases,18readers14caps and all baseline controls pass. This is not the final source fixed point. Pending consent integration can change captured stable chrome, so its fresh output must be reviewed and final generated patch/files must both be empty before publication. Historical failures and current dashboard/account unknowns remain unwaived.


Exact consent main554a3b18641044ec5164bff9acab4d338237078c is integrated before fresh regeneration. Only unchanged-baselines BASE_SOURCE and final-build SEO_SPLIT_BASE_REF change to that actual source; original RED keepsbc79 and the original HomeCopy bytes remain held. The legacy workflow first measures fresh output. Exact new output adoption and final source-cleared complete-output holds are still owed, with no fixed-point assumption from the initial five-file patch.


Integrated39688732949 passed all six jobs with complete141 root-manifest members and797 dist hashes. Exact726B/ea71093ed17f7517798a0552356d94222a64822e83393877b7df0ab253c84913 patch changes only football-grid consent chrome to the actual two paragraphs. Its24,489-byte snapshot SHA4a0d3a7212f7efe01533adbc911e08bbbfc0f1f115d852536b5470f9748ff4f3 is adopted with full inverse. Final output-hold workflow is the reviewed three-span delta composed with only the two actual554 base bindings. Four copied controls and complete end inventories now run without changing existing product cases, limits, waits or guards. Final all-six success and0B generated files remain owed.
