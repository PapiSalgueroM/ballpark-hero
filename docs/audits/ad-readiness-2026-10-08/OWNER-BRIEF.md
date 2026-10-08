(The owner pasted this brief into the desktop Claude lane on 2026-10-08 about 04:05 EDT, with the five fill in lines at
the top still unfilled. Saved word for word. Phase 0 was started on it at once; the fill in lines are asked for in
the lead's reply.)

DoUKnowBall: ad-network readiness overhaul
Fill these in before you paste

* Owner name to show publicly: `[YOUR NAME]`
* Contact email to show publicly: `[YOUR EMAIL]`
* Two or three true facts about you for the About page (where you're based, which teams you follow, why you built this): `[FACTS]`
* OK to rename trademark-style URLs with redirects? `[YES / NO / ASK ME PER URL]`
* Optional: paste a Search Console "Pages" export so you know which URLs get search clicks: `[PASTE OR SKIP]`

Context
douknowball.com is a free sports games site: about 125 game pages (career sims, grids, daily puzzles, trivia), sport hub pages, a Record Books reference section, and the usual legal pages. It gets roughly 30K visits and 100K pageviews a month, mostly desktop, mostly from search and returning players.
Google AdSense has rejected the site several times for "low value content". The games themselves are fine. The problem is how the site reads to a reviewer who never plays anything and only looks at the pages:

1. Templated filler copy. Every game page follows the same sequence (intro, how to play, rules, walkthrough, tips, FAQ), and much of it is padding. Example from `/golf-higher-lower`: a heading "Tapping the golfer with more majors" sits above a single bullet, "Tap the golfer you believe won more majors." The same "Is X free to play?" FAQ answer appears on every game page.
2. Many near-duplicate pages. The same mechanic is reskinned across sports (about ten Higher or Lower variants, several Connect 4, Conquest, Perfect Season and Perfect Lineup variants), each with the same templated text.
3. Almost no editorial or reference content outside the Record Books, and the Record Books is not in the sitemap.
4. Weak trust signals. The About page names nobody. The game count differs between pages (120+, 113, "over 100"). Two different cookie banners exist. Some pages render two footers and two trademark disclaimers.
5. Stale sitemap. It was generated on 2026-08-12 and is missing the Record Books, sport hubs, About, Contact, What's New, and newer games such as Stadium Tycoon.

Your job is to fix these so the site reads as an original, finished, well-maintained publication to a human reviewer and to a crawler. The same work should help search rankings and applications to gaming ad networks, so treat it as a quality overhaul, not a trick to pass one review.
The standard to match is the existing `/soccer-career` page copy. It is specific, has a voice, and every paragraph tells the player something true about that game. Use it as the reference for tone and usefulness.
Hard rules

* Do not change game logic, scoring, saves, or data. This is a content, structure and trust pass.
* Do not change the URL, title tag or H1 of any page without asking. Several pages rank in search (`/soccer-career`, `/club-manager`, `/college-grid`, `/nba-my-career`, `/nfl-my-career`, `/build-your-xi`, `/fantasy-draft`, `/stadium-tycoon`). Losing those rankings would cost more than ads would earn.
* Do not noindex, merge or delete any page without showing me the list first.
* Do not invent anything. No made-up statistics, player facts, testimonials, author credentials, awards or user counts. Every factual claim in game copy must come from the game's own code, constants or dataset. Where you need a fact only I can supply, leave a clearly marked `TODO(owner)` and list it in the final report.
* Do not pad. A short honest page beats a long padded one. Never add text to hit a word count.
* Do not add ad code or ad placeholders beyond what already exists.
* Read the master build spec before starting and update it when you finish.
* Work in phases, commit after each phase, and stop after Phase 0 for my approval.

Phase 0: Audit (stop here and report)

1. Build a full route inventory from the router and `src/data/gameRegistry.ts`: every public URL, its type (game, hub, reference, legal, utility), and which game family it belongs to.
2. Write a crawl script that fetches the built, prerendered HTML for every route without executing JavaScript and records: title, meta description, canonical, H1, word count of main content, number of headings, and whether main text is present in the raw HTML.
3. Run duplicate detection across all pages. Flag every sentence that appears on more than three pages (excluding the legal footer) and every heading that sits above fewer than about 25 words of body text.
4. List every place a game count is hardcoded, every footer and disclaimer component, and every cookie or consent banner component.
5. List pages that are empty, unfinished, "coming soon", retired, or reachable but not linked from anywhere.
6. List every use of official league or team logos, and every URL or game title that uses another company's trademark (for example `/jeopardy`, `/deal-or-no-deal`, `/connections`, `/football-connect-4`, `/footle`).
7. Check whether `/ads.txt` exists and contains exactly: `google.com, pub-2929318086316376, DIRECT, f08c47fec0942fa8`
8. Save all of this as `AUDIT.md` with a proposed plan per game family, then stop and wait for me.

Phase 1: Rewrite the game page copy
Replace the current template with a flexible structure. Sections are optional; include one only if there is something real to say.

* Intro: two to four sentences on what this specific game is and what makes it different from its siblings. Lead with the game, not with keywords.
* How to play: one compact ordered list. No sub-headings inside it.
* Scoring and rules: only rules a player could get wrong. Pull numbers from the code.
* Worth knowing: optional. Real strategy or a worked example, only for games deep enough to have one.
* FAQ: only questions specific to this game. Delete "Is X free to play?" and any other answer that would be identical on another page. Zero FAQs is acceptable.

Banned patterns:

* A heading above a single sentence or single bullet.
* A heading that restates the sentence under it.
* Keyword-stuffed headings (for example "How to play Golf Higher or Lower, a daily major championship trivia game").
* The same sentence on more than three pages.
* Generic filler such as "test your knowledge", "fun for all fans", "whether you're a casual fan or a die-hard".

Depth by tier:

* Tier A (career sims, manager and front office sims, dynasty sims, the flagship grids): full treatment at `/soccer-career` quality. These games are deep, so the copy can be.
* Tier B (distinct standalone games): intro, how to play, rules, and FAQ only if warranted.
* Tier C (reskins of a shared mechanic): short and honest. What differentiates the page is its dataset, so say what is in the pool: how many entries, the era range, what stat is compared, the hardest known matchups. Derive all of it from the data files.

For each reskin family, make sure there is one family hub page that explains the shared mechanic once and links to every variant, so the variants do not each have to repeat it.
Phase 2: Reference and editorial content

1. Record Books. Make it a first-class section: in the main navigation, in the sitemap, with an index page and one page per competition or award. Each page gets a short introduction, the table, notes explaining anomalies (unplayed seasons, vacated titles), a "last verified" date, and the source it was checked against.
2. Game guides. Write explainers for the Tier A games that document how the simulation actually works, derived from the code: for example how the Soccer Career legacy score is calculated, how potential and decline curves work, how the Ballon d'Or vote is decided. This is original content nobody else can publish. Aim for six to ten strong pieces, not volume.
3. Data pieces. If aggregate play data exists in the database (leaderboards, grid answer rarity, most-missed questions), draft two or three pieces built on real numbers from it. Show me the queries and results before writing prose. If the data does not exist, skip this and say so.
4. Every guide and data piece gets a byline with the owner name above, a published date, an updated date, and a link back to the game it covers.
5. Put these under one clearly named section linked from the main navigation and the homepage.

Phase 3: Trust and consistency

* About page: who runs the site (owner name and the facts I supplied above), when it started, how game data is sourced and checked, how corrections are handled, how the site is funded. First person, plain, no marketing language.
* Contact page: the public email above, plus the existing bug report route.
* One source of truth for the game count, computed from the registry and used everywhere.
* One footer and one trademark disclaimer per page, sitewide.
* One consent banner sitewide with consistent wording. Ads and analytics must stay off until the visitor accepts. Note in the report that serving Google ads to EEA, UK and Swiss visitors requires a Google-certified consent platform, and check Google's current requirement before recommending one.
* Privacy policy: confirm it covers advertising cookies, third-party vendors including Google, how to opt out, and what is stored in the browser for saves and leaderboards.
* Trademark names: based on my answer at the top, propose neutral names and 301 redirects for trademark-style URLs. Show the mapping before applying it.
* The "Edit with Lovable" badge is a hosting setting, not code. Flag it in the report for me to remove.

Phase 4: Technical cleanup

* Generate `sitemap.xml` at build time from the registry and the content sections, so it can never go stale. Include hubs, Record Books, guides, About, Contact and What's New. Use real last-modified dates. Exclude utility pages such as search.
* Confirm every indexable route has its main text in the prerendered HTML, a unique title, meta description, canonical and exactly one H1.
* Add `noindex` to internal search results and any other utility page.
* Make unknown URLs return a real 404 status with a helpful page.
* Make sure the main navigation is a real, crawlable menu present on every page, and that no indexable page is an orphan.
* Add breadcrumb structured data. Keep FAQ structured data only where real FAQs remain.
* Test the top ten pages at a 380px viewport and fix anything that blocks play on a phone.

Phase 5: Verify and report

1. Rerun the Phase 0 crawl and duplicate detection. Target: no sentence on more than three pages outside the legal footer, no heading above fewer than about 25 words, no missing or duplicate titles, descriptions or H1s.
2. Write `ADSENSE_READINESS.md` containing: before and after numbers from the crawl, every page changed, every `TODO(owner)`, every decision still waiting on me, and a checklist of what I must do by hand (remove the hosting badge, resubmit the sitemap in Search Console and Bing Webmaster Tools, request AdSense review).
3. Update the master build spec with the new content template, the tier rules and the banned patterns, so future games ship in this shape by default.
