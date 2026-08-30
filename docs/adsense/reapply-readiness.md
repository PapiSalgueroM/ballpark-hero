# AdSense re-application readiness

Asked for by the owner's directive of 2026-08-30, section 19. Written 2026-08-30
after Rounds 348 to 359. Every number here was measured, and the script that
measured it is named so it can be re-run. Nothing in this file is an estimate.

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

| Hypothesis for "low value" | Measurement | Result |
|---|---|---|
| Crawler sees an empty shell | 29 pages, raw HTML, no JS | **0** under 300 words, **0** without an H1 |
| Page collapses when the API fails | Same 29 with the database refused | **0** lost even half their words |
| Pages are thin | Unique words across all 153 shipped documents | median **584**, 90th percentile **970**, home **923** |
| Copy is templated | Five-word shingle overlap, all 137 substantive pages | **no pair above 50%**, only 8 pages have a twin above 30% |
| Sentences repeat sitewide | Sentence frequency across all pages | only **5** sentences appear on more than half |

Every page under 200 unique words was inspected individually. All of them fall
into three groups, and all three are already handled the way Google asks: eleven
retired-game signposts that canonicalise to their replacements, private pages
that are noindexed, and four games the owner pulled from the menus himself.

**There is no mechanical thin-content defect on this site.** That is the single
most useful thing the audit produced, because it means the fix is not "generate
more pages", and mass-produced copy would make the judgement worse rather than
better. The directive says the same thing in section 12.

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

- **Three archive pages** (`/nba-grid/archive`, `/mlb-grid/archive`,
  `/hockey-grid/archive`): 42 past boards, 378 cells, 3,024 published answers,
  every one recomputed by `simGridArchive` against that game's own matcher and
  live data. These are unique by construction. The boards are ours and the
  answers are derived from our own database, so the content cannot exist
  anywhere else.
- **Layout stability**, which is a ranking and quality signal a reviewer can feel
  even without naming it. Cumulative Layout Shift on the six grid pages at 375px
  went from as bad as 0.60 to zero (Rounds 348 and 351). Google calls anything
  above 0.25 poor.
- **Two production bugs that made games unplayable**, both found by building
  tools on the games' own code rather than copies of it. Round 358: the three
  franchise grids returned nothing if any single page of their data fetch
  errored, and the database does cancel those under load. Round 359: the same
  fragility in the shared paging helper, which nine more libs depend on.

A deliberate decision worth recording: the Record Books were **not** split into
twelve champion pages. A list of past champions sits on a thousand other sites
and adds nothing by existing here again, which is the exact profile the rejection
describes. Rejecting easy page count is part of the recovery, not a gap in it.

## What is still unknown

**Index coverage.** The directive's section 7 asks how many pages are indexed
versus excluded and under which reasons. This cannot be answered from here: it
needs Search Console, which no tool in this session can read. It needs either the
Chrome extension connected to the owner's account or a Pages CSV export. Until
then, the share of the site Google has actually accepted is a blank, and it is a
material blank.

**Whether Google has re-crawled any of the above.** This is the decisive one and
it is addressed below.

## The argument against submitting now

Everything above is true of the site as it stands today. It is not yet true of
the site as Google has it stored.

The hubs were rewritten on 2026-08-30. The archives went live the same day. A
reviewer works from a fresh fetch, but the surrounding signals, the index, the
ranking, the sample of pages a reviewer is shown, come from crawl data that
mostly predates all of it. Submitting now spends the re-review on a snapshot that
does not include the work done in response to the rejection.

There is also no cost to waiting. The owner's own operating contract defers
AdSense on the grounds that at 1,800 clicks a month it earns very little, the
site is growing, and the identical content profile reads differently on a larger
site. Waiting improves both the content signal and the traffic signal at once. A
second rejection is more expensive than a delayed approval.

## What would move this to READY

1. Evidence that Google has re-crawled the six hubs and the three archives.
   Visible as a changed "last crawled" date in the URL Inspection tool, or as
   the new pages appearing in the Pages report.
2. The index-coverage classification from section 7, which needs Search Console
   access. If a large share of the site sits in "Crawled, currently not indexed",
   that is a stronger signal about Google's judgement than anything measurable
   from outside, and it should be understood before re-applying rather than after.
3. One more month of traffic growth, so the same content profile is being judged
   on a bigger site.

Items 1 and 2 are the real gates. Item 3 is a preference and the owner may
reasonably discount it.

---

## Verdict

# NEARLY READY

The site has no measurable thin-content defect, the one weakness the evidence
surfaced has been fixed and measured, and genuinely unique pages have been added.
What is missing is not more work on the site. It is proof that Google has seen
the work, plus the index-coverage picture that only Search Console can give.

**Do not submit the review. The owner decides.**

Re-run `scripts/auditGoogleRender.mjs` before any submission, so the decision is
made on current numbers rather than on this file.
