# The operating contract, 2026-08-29

Received from Anthony in the desktop chat on 2026-08-29, verbatim below the
line. It arrived with the full v1.0 Master Build Specification attached as
reference; that spec is the same document the repo already carries as
`docs/MASTER-BUILD-SPEC-2026-08.md` (adopted Round 337, reconciled in
`docs/SPEC-RECONCILIATION.md`), so only the contract half is recorded here.
The contract asks for the spec to be split into `/docs/spec/` sections with an
index; that split is queued on the board.

Reading order for a fresh session stays what CLAUDE.md says, with this file
added: this contract sets WHAT to build and in what order, and it supersedes
the older Milestone 0 note that was built on Semrush estimates. CLAUDE.md and
SHIP-PIPELINE.md still govern HOW anything ships (the pipeline, the gates, the
traps); nothing in this contract touches those.

Two reconciliations made on receipt, both recorded on the board:

1. The contract explicitly defers AdSense ("at current traffic this earns very
   little") and orders new production routes (NFL grid work, archive and
   answer pages). That supersedes owner directive 3's blanket freeze on new
   routes and sitemap rows. What stays untouched as verified-fix-only:
   ads.txt, the verification code, robots.txt, and existing pages' canonicals,
   because breaking those costs more than restraint costs us.
2. The contract's traffic table comes from Google Search Console and replaces
   every Semrush-derived number in earlier board notes. Mobile is 42 percent
   of search clicks, not 7.58; branded queries are the single largest cluster,
   not zero.

His trailing sentence arrived cut off ("also keep"); flagged back to him.

---

You are working on the DoUKnowBall codebase. Read this file fully before any work.

This is the operating contract. The full product vision lives in `/docs/spec/`
(split from the v1.0 Master Build Specification, Aug 2026). Do not load the whole
spec into context. Load only the section relevant to the task at hand.

## 1. Ground truth about this site

These numbers come from **Google Search Console**, which reports what Google
actually recorded. Use them, and only them, for prioritization decisions.

Earlier planning used Semrush traffic estimates. Those were wrong by wide margins
in three separate places: total traffic (12x low), branded traffic (reported as
zero when it is the largest single query), and mobile share (reported as 7.58%
when it is 42%). **Do not reason from Semrush traffic estimates.** Semrush search
*volume* figures are more reliable and are used below where noted.

**Last 28 days (as of Aug 29, 2026):**

| Metric | Value |
| --- | --- |
| Clicks | 1,800 (+230%) |
| Impressions | 8,800 (+157%) |
| Average CTR | 20.7% |
| Average position | 11 |

**Device split (3 months):** Desktop 1,440 clicks, Mobile 1,081, Tablet 77.
Mobile is 42% of clicks with a CTR essentially identical to desktop. Mobile is
healthy. It is not an emergency, but every new surface ships mobile-first.

**Top queries:**

| Query | Clicks | Position |
| --- | --- | --- |
| douknowball | 531 | 1.5 |
| college football immaculate grid | 133 | 4 |
| college football grid | 113 | 3.1 |
| doyouknowball | 70 | 2.7 |

Roughly a third of traffic is branded: people typing the site name on purpose.
That is returning-user behavior and it is the most valuable signal on the site.
Protect it. Never break the homepage URL, never regress homepage load time, and
never make the daily game harder to reach from the root.

Traffic grew from near zero in late May to about 130 clicks/day by late August.
The site is compounding. The job is to not interrupt that.

## 2. The demand gap that sets current priority

Search volume for the NFL version of the same game dwarfs the college version:

| Term | Monthly volume | Difficulty | Current position |
| --- | --- | --- | --- |
| nfl grid | 49,500 | (none given) | **21** |
| nfl immaculate grid | 40,500 | KD 40 | not ranking |
| immaculate grid football | 9,900 | KD 46 | not ranking |
| college football immaculate grid | 880 | (none given) | 4 |
| college football grid | 480 | (none given) | 3 |
| cfb grids | 260 | (none given) | 4 |

The site already ranks page 2 for a 49.5K-volume term without a dedicated page
for it. The competitor holding the top spot for "nfl immaculate grid" sits at
position 15; this is not a defended position.

NFL season begins in September. Demand is seasonal and rising now.

**Ignore high-volume NFL schedule queries** ("nfl game" 201K, "nfl games this
weekend" 90.5K, "nfl schedule tomorrow" 18.1K). All KD 90-100, all owned by
NFL.com and ESPN, and all searchers wanting a broadcast schedule rather than a
game to play. They will appear in any keyword gap report. They are not
opportunities.

**Competitors worth studying, not copying:** the grid-category sites (the
multi-sport one is the structural model). Take interaction patterns and
information architecture only.

## 3. Current milestone

**Milestone 0: own the grid category.** This precedes the spec's D157 platform
shell, D158 Club Manager, and D159 Soccer Career.

Reason for the reorder: the grid game generates effectively all current organic
traffic and the spec mentions "grid" eight times in 7,690 lines without ever
naming it. Club Manager and Soccer Career are unvalidated bets. Build what is
proven before what is hoped for. The spec remains the north star; only the
sequence changed.

### Task 1: Audit. Report before changing anything.

- Where the grid game lives, how it is structured, and what is genuinely shared
  across grid variants versus duplicated.
- Is grid content server-rendered? Fetch the page with JavaScript disabled and
  report what text is actually in the HTML. This gates everything else.
- What is currently ranking at position 21 for "nfl grid." If an NFL grid page
  exists it needs work, not a rebuild.
- What test infrastructure exists. If none, say so plainly.
- Real page count versus sitemap.xml contents.

### Task 2: NFL grid

Ship a proper NFL grid as a configuration of the shared grid engine, not a
fork. If the engine is not currently extractable, extracting it is the task.
NFL roster and franchise history data is well documented; data confidence
rules apply in full.

### Task 3: Archive and answer pages

A page showing a past grid, its valid answers, rarity scores, and a replay
button is real user value and matches real search intent.

Explicit carve-out: the spec's prohibition on pages built only to manipulate
rankings must not be used to refuse them. The line is whether a human arriving
from search gets something worth their time. Build this as a shared system
across all grid sports.

### Task 4: On-page for the money terms

Titles, H1s, meta descriptions on the grid pages and hubs. Show current state
before rewriting.

### Task 5: Expansion order

After NFL ships and holds, extend the same engine by search volume. Same
engine, new data. No new game *types* until the grid category is won.

### Explicitly deferred

- D157 platform shell: after Milestone 0.
- D158 Club Manager, D159 Soccer Career: unvalidated. Revisit when the grid
  category is held.
- AdSense: at current traffic this earns very little. Build ad guardrails
  immediately before scaling traffic, not now.

## 4 through 8

The contract's non-negotiable principles, agent rules, working method, do-not-
ship list and commandment are the same ones the spec carries (sections 0,
Appendix L, M, N, Q of `docs/MASTER-BUILD-SPEC-2026-08.md`). The operating
additions worth restating:

- Small reversible changes. Show diffs before applying.
- Do not claim a feature is complete when only its UI exists.
- Preserve existing routes. Never break the homepage URL.
- Report implemented / tested / known limitations / next recommended task
  before finalizing.
