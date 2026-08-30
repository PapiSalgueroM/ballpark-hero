# Owner directive: AdSense recovery and master plan continuation (2026-08-30)

Anthony's words, recorded the hour AdSense rejected the site for "Low value
content". This is a HIGH PRIORITY ADDENDUM, not a replacement for the master
spec. Both lanes read it.

One mechanical change on transcription: his text used em dashes and this repo
bans them everywhere, so they are commas and colons here. Nothing else is
altered, nothing is summarised away.

---

## 0. Standing

Keep following the Master Build Specification as the long term north star. Do
not abandon, overwrite or simplify that roadmap. The AdSense rejection is a new
urgent constraint, not a change in the vision.

## 1. Do not re-apply to AdSense yet

Not until production is materially better than the version Google rejected. Do
not add a few paragraphs, inflate word counts, resubmit unchanged, mass
generate AI articles, change metadata only, or add filler. The objective is to
be obviously valuable to BOTH players and Google's publisher review systems.

## 2. Continue the master plan

Keep building toward the platform: trivia and ball knowledge games, careers,
front office and GM modes, Club Manager, dynasties, interactive games,
Conquest, arcade, multiplayer, matchmaking, profiles, achievements,
leaderboards, social competition, shared engines, high quality sports data,
excellent mobile and desktop UX. For the immediate window, prefer tasks that
improve content quality, indexability, discoverability, user value and AdSense
readiness while still moving the platform forward.

## 3. Treat low value as a site level issue

The audit found a median around 584 unique words, content varying per game, and
deliberately thin pages already noindexed or canonicalised. Therefore DO NOT
ASSUME LOW VALUE MEANS LOW WORD COUNT. Investigate deeper causes: pages looking
like game shells, insufficient standalone value, repeated page structure,
content visible to users but not clearly exposed in rendered HTML, weak
editorial depth, underdeveloped pages, poor differentiation between similar
games, indexing and canonical issues, pages Google crawls but does not consider
worth indexing, insufficient context around interactive games.
**Find evidence. Do not guess.**

## 4. Build a real sports knowledge and reference layer

Not a generic sports blog. A useful reference layer that supports the games,
expanding Record Books: records and history per league (NBA, NFL, MLB, NHL,
WNBA, college football, college basketball, soccer), competition history,
Champions League format history, historical champions, award winners, draft
history, league format explainers, roster and rules explainers, salary cap
explainers, transfer window explainers, playoff system explainers, historical
competition structures. These pages must be genuinely useful even if a game did
not exist. Do not create filler.

## 5. Upgrade important game pages

Prioritise pages that already receive users and search traffic. A major game
page should carry: introduction, what makes this game different, complete
rules, scoring, examples, strategy and tips, common mistakes, sport specific
context, relevant historical information, FAQ, related games, related reference
pages. Do not paste the same template paragraph across every game. The game
stays the centerpiece; content enhances it rather than burying it.

## 6. Audit what Google actually sees

For the highest priority public pages inspect: raw HTML response, rendered
HTML, server side metadata, H1, page copy, internal links, structured data,
canonical, robots directives, HTTP status, whether content appears only after
JavaScript, and whether API failure leaves a nearly empty page. A page that
looks excellent in the owner's browser and almost empty to a crawler is
unacceptable. Deliverable: `docs/seo/google-render-audit.md`, at least the top
20 to 30 important pages.

## 7. Connect this to the existing indexing problem

Search Console previously showed roughly 80 plus URLs not indexed, still P0.
Produce a complete classification: total public canonical URLs, indexed, should
be indexed but are not, intentionally not indexed, discovered currently not
indexed, crawled currently not indexed, duplicate, alternate canonical,
redirects, blocked, errors. Pay special attention to CRAWLED, CURRENTLY NOT
INDEXED, because those pages may reveal the same quality problem behind the
AdSense rejection. Do not claim success because the sitemap and robots code
look correct.

## 8. Do not mass generate generic AI content

No thin AI blogs, rewritten encyclopedia articles, keyword stuffed pages, fake
news, templated pages differing only by a player or team name, or fabricated
history. Quality over quantity: a smaller number of genuinely excellent
reference pages beats many weak ones.

## 9. Prioritise real user value

Connect reference content back into the games. A College Football Grid player
should be able to reach rivalry history, championship history, conference
history, player records and related college games. A Club Manager player should
reach league rules, competition history and format explanations. Content should
be part of the product, not an SEO appendix.

## 10. Free forever

No subscriptions, premium gameplay, paywalls, pay to win, paid careers or paid
save slots. Monetisation comes from ads, sponsorships, branded challenges and
corporate partnerships.

## 11. Keep building the hub

Somewhere a user can test ball knowledge, play alone, play a CPU, play a
friend, match with a stranger, build a career, manage a club, build a dynasty,
play arcade sports games, compete on leaderboards, and spend one minute or
several hours.

## 12. Do not copy commercial games

Original mechanics and identity. No proprietary code, artwork, assets, exact
UI, exact systems, datasets or copyrighted content.

## 13. Use analytics to choose what to improve first

Rank by: pages receiving meaningful traffic, pages with impressions but poor
clicks, important pages crawled but not indexed, cornerstone game pages, major
sport hubs. Do not give every page equal development time. Build a ranked page
improvement list from traffic, impressions, clicks, ranking, engagement,
strategic importance and index status.

## 14. Add internal content networks

Sport hub, then games, then record and reference content, then related games,
then career and manager experience. For example /basketball leading to NBA
Grid, NBA Stat Line, NBA Record Book, NBA Draft History, NBA My Career, NBA
Front Office.

## 15. Cornerstone pages

One excellent canonical hub per major sport (soccer, basketball, football,
baseball, hockey, college football, college basketball, WNBA), explaining what
the site offers for that sport, the best games, knowledge games, career and
manager modes, relevant reference content, new content and related sports.
Strong standalone pages, not icon grids.

## 16. Editorial quality controls

Any factual reference page carries source and provenance, a last verified date,
the correct season or period, a human readable explanation, and validation
where possible. No hallucinated or unverified sports facts.

## 17. About and trust signals

Communicate clearly what the site is, what users can do, why it exists, who it
is for, how to report problems, contact, privacy, terms and legal notices. Do
not fabricate a company or team. Authenticity beats fake corporate language.

## 18. Ad friendly UX without ruining the product

Prepare the architecture, never compromise gameplay. Ads must not cover
controls, trick users, look like navigation, interfere with answers, cause
accidental clicks or wreck mobile. Keep ad components configurable.

## 19. The next review gate

Deliverable: `docs/adsense/reapply-readiness.md`, carrying site changes
completed (pages upgraded, new reference content, indexing improvements, crawl
and render improvements, navigation and internal linking, thin pages resolved,
bugs fixed), metrics (canonical public pages, indexed pages, important non
indexed pages, organic traffic trend, engagement), manual QA across the
homepage and a representative page from every major section, and a single
recommendation: NOT READY, NEARLY READY, or READY TO REQUEST ADSENSE REVIEW.
**Do not submit the review. The owner decides.**

## 20. Immediate priority order

P0: production breaking bugs and security; AdSense low value content recovery;
Google indexing and crawlability; sports data correctness.
P1: improve highest traffic existing games; improve cornerstone sport hubs;
build and expand the reference layer; profiles, leaderboards, saves and shared
platform systems; Club Manager architecture.
P2: Soccer Career; other careers and front offices; shared competition and
match engines; Conquest, Draft, Stat Line and similar.
P3: major interactive arcade games; real time multiplayer; experiments.
This does not cancel the master plan. It decides what gets built first.

## 21. Keep the multi agent rules

Two instances may run concurrently: separate responsibilities, branches or
worktrees, a shared task queue, documented handoffs, ownership of high risk
files, testing before merge. Avoid duplicate work.

## 22. Report back with evidence

After the first recovery pass answer, with measurable evidence rather than
"SEO improved" or "content fixed": what likely caused the rejection, what
evidence supports it, which pages were weakest, which important URLs are not
indexed, what Google actually received in rendered HTML, what reference
sections were added, which pages were substantially improved, what files
changed, what tests were run, what remains, whether the site is materially
different from the rejected version, and whether it is ready to request review.

---

## His closing note

"Do not stop building the larger vision. Do not rush the next AdSense review.
Make the next version of DoUKnowBall meaningfully better first." And: after
this, no more giant directives for a while. "The next useful thing is execution
plus evidence, not more ideas."
