# AdSense re-application readiness

Asked for by the owner's directive of 2026-08-30, section 19. Written 2026-08-30
after Rounds 348 to 359. Every number here was measured, and the script that
measured it is named so it can be re-run. Nothing in this file is an estimate.

**Status update, 2026-09-02: Round 400 passed every local gate and is not deployed.** The
owner has moved AdSense readiness ahead of the rest of the roadmap. The
measurements below remain the exact 2026-08-30 live baseline, not a claim about
the current worktree. The Google consoles were inspected under
`anacatu2025@gmail.com`, then the AdSense unit and site settings described below
were changed and verified by reopening them. The owner authorized the review
submission after live verification. No review was requested or approved yet.

**The verdict is at the bottom. Read the evidence first, because the verdict is
only worth what the evidence is worth.**

---

## What the rejection said, and what it did not say

The review came back as a policy violation, "Low value content". That is a
site-level judgement, not a list of URLs. Google names no page, gives no
threshold, and offers no diff. So the honest starting position is that we do not
know what a reviewer looked at, and any plan built on guessing that is a plan
built on nothing.

The directive's instruction was "find evidence, do not guess", so the first
response was measurement rather than writing.

## What was measured, and what it ruled out

`scripts/auditGoogleRender.mjs` fetches the live site three ways: raw HTML with
no JavaScript, the page after the app boots, and the page rendered with the
database refused outright. Full output in `docs/seo/google-render-audit.md`.
This table is the 2026-08-30 live baseline. Re-run it after Round 400 is
published before replacing any count.

| Hypothesis for "low value" | Measurement | Result |
|---|---|---|
| Crawler sees an empty shell | 29 pages, raw HTML, no JS | **0** under 300 words, **0** without an H1 |
| Page collapses when the API fails | Same 29 with the database refused | **0** lost even half their words |
| Pages are thin | Unique words across all 153 shipped documents | median **584**, 90th percentile **970**, home **923** |
| Copy is templated | Five-word shingle overlap, all 137 substantive pages | **no pair above 50%**, only 8 pages have a twin above 30% |
| Sentences repeat sitewide | Sentence frequency across all pages | only **5** sentences appear on more than half |

Every page under 200 unique words in that baseline was inspected individually.
All of them fell into three groups: eleven retired-game signposts that
canonicalise to their replacements, private pages that are noindexed, and four
games the owner pulled from the menus himself.

**That live snapshot had no measured thin-content defect.** That is the single
most useful thing the content audit produced, because it means the fix is not
"generate more pages", and mass-produced copy would make the judgement worse
rather than better. Round 400 later found a separate ad-delivery defect that the
content audit did not test.

## The one weakness the measurements did surface, and what was done about it

The six sport hubs were simultaneously the thinnest indexable pages and the most
similar to each other. That was deliberate once: `sportHub.ts` said in its own
comment that the copy was kept alike so a new hub would obviously be a copy of an
existing one. Convenient for a developer, and exactly the profile of a page that
lists links without saying anything.

| | Before (Round 356) | After (Round 357) |
|---|---|---|
| Words per hub, raw HTML | 521 to 614 | **1,362 to 1,935** |
| Worst similarity between two hubs | 36% | **11%** |

Written by one researcher per sport from the real registry, then put through
three adversarial passes: 44 problems found, then 21, then 2. The middle pass is
the instructive one, because the checkers were reading this repo's own source and
database and catching false claims about our own games. `simHubDepth` now fences
depth and difference together, with a clone control, because a padded hub is
worse than a short one.

## What else has landed since the rejection

- **Four archive pages** (`/nba-grid/archive`, `/mlb-grid/archive`,
  `/hockey-grid/archive`, `/cbb-grid/archive`): 56 past boards, 504 cells,
  4,032 published answers, every one recomputed by `simGridArchive` against
  that game's own matcher and live data. These are unique by construction. The
  boards are ours and the answers are derived from our own database, so the
  content cannot exist anywhere else. The fourth archive went live in Round
  369 on 2026-08-31.
- **Layout stability**, which is a ranking and quality signal a reviewer can feel
  even without naming it. Cumulative Layout Shift on the six grid pages at 375px
  went from as bad as 0.60 to zero (Rounds 348 and 351). Google calls anything
  above 0.25 poor.
- **Two production bugs that made games unplayable**, both found by building
  tools on the games' own code rather than copies of it. Round 358: the three
  franchise grids returned nothing if any single page of their data fetch
  errored, and the database does cancel those under load. Round 359: the same
  fragility in the shared paging helper, which nine more libs depend on.

## Round 400: the ad-placement boundary, locally complete

The 2026-08-30 audit measured content. It did not ask which routes could load
the AdSense account script. With stored accepted consent, `index.html` loaded
that script globally even when a page rendered no deliberate `AdBanner`. That
left Auto Ads able to inspect private, legal, retired, low-content and fallback
screens that were never intended to carry ads.

The concrete pre-fix surface included six noindexed snapshots:
`/football-timeline`, `/guess-nfl-team`, `/higher-lower-transfers`,
`/pack-battle`, `/reset-password`, and `/shirt-number`. The bare fallback shell
also loaded the account script before its pre-boot noindex marker ran. Three of
the retired pages, Football Timeline, Higher or Lower Transfers, and Pack
Battle, additionally rendered a manual ad slot.

Round 400 keeps the publisher verification meta tag global, removes the global
AdSense script loader, and makes the accepted-consent path load AdSense only
beside a deliberate manual slot in a document that does not declare noindex.
The three retired manual slots are removed. A same-tab consent event lets a
newly accepted game page start its eligible slot without waiting for a reload.
Cross-tab acceptance now preserves an active game, while withdrawing consent
still reloads to remove vendor code that already ran. A short head-settle retry
also lets a valid game initialize after leaving a noindexed route without ever
loading an ad while the noindex remains.

The final browser run passed. It measured a 358 pixel manual slot on a 390 pixel
phone and 864 pixels at desktop width. Stored and fresh Accept produced exactly
one deliberate request; 16 private, legal, retired, redirect and fallback routes
produced zero; Essential only produced zero. Game-to-noindex,
fallback-to-game, private-noindex-to-game, cross-tab Accept and cross-tab
withdrawal all passed. Five negative controls independently reproduced the old
global loader, zero-width slots, fallback noindex poisoning, an acceptance
reload and a persistent noindex. Every control produced only its owned failure.

Round 400 also closed the manual-unit dependency. AdSense now lists one
responsive Display unit named `DoUKnowBall Game Banner`, slot `7540487748`.
All 75 source `AdBanner` callers across 75 files were changed from 26
placeholder values to that slot. Four callers are legacy unrouted pages, so the
reachable inventory is 71 pages. The final source scan reports zero mismatches.

The final `build:seo` prerendered 142 routes with zero failures and correctly
refused three account-only routes. All 137 sitemap documents are crawler
readable and none carries noindex. The exact TypeScript gate passed. All 13
built-site fences, the AdSense harness with 14 negative controls, the legal
harness with four controls, and the brand harness with two controls passed.

A deliberate decision worth recording: the Record Books were **not** split into
twelve champion pages. A list of past champions sits on a thousand other sites
and adds nothing by existing here again, which is the exact profile the rejection
describes. Rejecting easy page count is part of the recovery, not a gap in it.

## What the Google consoles establish, 2026-09-02

The account used for both checks was `anacatu2025@gmail.com`. The evidence was
first inspected without changes. Round 400 then created the ad unit and changed
the two site settings recorded below. No review was submitted.

**AdSense.** Publisher `pub-2929318086316376` shows the site as **Needs
attention**, with **Low value content** last updated 2026-08-30 at 3:52 AM EDT.
Ownership is verified and ads.txt is **Authorized**. Policy Center shows no
current issues. Google CMP has two active European regulation messages across
the account: one targets `douknowball.com`, and the other targets
`footyfein.com`. Only the first applies to this site.

The `douknowball.com` message was published on 2026-02-11. It is available in
English plus 31 other languages. The Consent, Do not consent and Manage options
choices are all ON; Close as do not consent is OFF. Consent message
optimization is ON. Consent mode for advertising and special feature 2 are
OFF. Legitimate-interest controls are ON, and Enabled by default is ON. The
account-level partner selection lists 198 common ad partners. These CMP
settings were inspected read-only, and no CMP setting was changed.

The account now lists one responsive Display unit, `DoUKnowBall Game Banner`,
with slot `7540487748`.

The verified final site settings are Auto Ads **OFF** and Auto optimize **OFF**.
Both values were confirmed false after reopening the site settings. The Request
review form remains behind the confirmation checkbox. It was not submitted.

**Search Console.** The sitemap is successful, was last read on 2026-09-01,
and reports 137 discovered pages. The Page Indexing report, dated 2026-08-27,
shows 44 indexed and 89 not indexed. Those figures and the sitemap count have
different report dates, so this document does not force them to reconcile.
Manual Actions shows none and Security Issues shows none. `/soccer-career` is
indexed and its inspected page was last crawled on 2026-09-01.

The ten-route recrawl batch was inspected and every route is currently
unindexed. No indexing request has been submitted. Submit this batch only after
Round 400 is live and its route checks pass:

- `/soccer`: Unknown to Google.
- `/pro-football`: Discovered, currently not indexed.
- `/pro-basketball`: Discovered, currently not indexed.
- `/baseball`: Discovered, currently not indexed.
- `/hockey`: Discovered, currently not indexed.
- `/college`: Unknown to Google.
- `/nba-grid/archive`: Discovered, currently not indexed.
- `/mlb-grid/archive`: Discovered, currently not indexed.
- `/hockey-grid/archive`: Unknown to Google.
- `/cbb-grid/archive`: Discovered, currently not indexed.

## The 2026-08-30 waiting recommendation, superseded as a work priority

On 2026-08-30, everything measured above was true of the live site. It was not
yet true of the site as Google had it stored.

The hubs were rewritten on 2026-08-30. The first three archives went live that
day, and the CBB archive followed on 2026-08-31. A
reviewer works from a fresh fetch, but the surrounding signals, the index, the
ranking, the sample of pages a reviewer is shown, come from crawl data that
mostly predates all of it. Submitting now spends the re-review on a snapshot that
does not include the work done in response to the rejection.

At that time, the owner's operating contract also treated waiting as low cost
because the site was growing from about 1,800 clicks a month. On 2026-09-02 he
superseded that work order and put AdSense readiness first. That changes what the
team works on. It does not say that the Request review checkbox has been
confirmed or that a review has been submitted.

## What would move this to READY

1. Deploy Round 400 and run the same route-boundary checks against the live
   site.
2. Run a fresh live `scripts/auditGoogleRender.mjs`, so the 2026-08-30 counts
   are replaced with current evidence rather than assumed forward.
3. Resubmit the sitemap and request the exact ten-route batch above for
   indexing, then submit the authorized AdSense review.
4. Later, capture the resulting recrawl and recheck the 44 indexed and 89 not
   indexed split. The current report is dated 2026-08-27 and predates Round 400.

More traffic may strengthen the case, but the owner no longer treats another
month of growth as a prerequisite to doing the readiness work.

---

## Verdict

# READY TO DEPLOY

The 2026-08-30 live audit found no measurable thin-content defect, the hub
weakness it surfaced was fixed and measured, and four genuinely unique archive
pages now exist. Round 400 also found a separate site-side ad-placement defect
and its correction passed every local source, build and browser gate. What
remains before submission is deployment and live verification, followed by the
sitemap and ten-route recrawl requests. A newer indexing report can only arrive
after Google revisits the pages and is not presented here as an instant result.
The real manual unit is configured, and Auto Ads and Auto optimize are off.

**No review has been submitted yet. The owner authorized submission once the
live checks pass.**

Re-run `scripts/auditGoogleRender.mjs` before any submission, so the decision is
made on current numbers rather than on this file.
