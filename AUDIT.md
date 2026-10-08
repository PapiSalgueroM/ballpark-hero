# Ad readiness audit (Phase 0), 2026-10-08

Read on 2026-10-08. The crawl ran against the build that was live when the audit started (Release AK), served locally
the way the live host serves it to a crawler that runs no JavaScript. The code was read from Release AL (branch
`ad-readiness`), which went live later the same morning according to a note from the other lane (Codex). The Release AL pages were
also crawled off disk and give the same counts, apart from 8 extra sentences and two newer sitemap dates. The live site
itself got six plain page loads (the sitemap, robots.txt, ads.txt, the home page, two made up addresses).

**Nothing on the site was changed.** No page, no game, no setting, no check. The only new files are this report, the
data files and the read only scripts listed at the bottom. They are committed on the side branch `ad-readiness`,
because your brief says to commit after each phase. Nothing is on `main` and nothing is live.

Two checkers went over the first draft of this report. One redid the numbers from scratch, one looked for gaps. Their
corrections are in. What nobody could recheck is listed at the very end.

Short on time? Read the short version, then section 8, then answer section 10.

## The short version

Google has said no four times (by 2026-08-21, then 08-30, 09-09 and 09-25), always "Low value content", never naming a page. Nobody knows the real cause. What a reviewer sees today, most likely to matter first:

1. **Half the catalogue is one game in different sports.** 68 of the 133 games are reskins in 12 families. The words differ, the shape is identical.
2. **A heading sits over almost every line of guide copy.** 1,906 of the 2,110 sub headings in the guides sit over one bullet or one paragraph. You asked for this layer on 2026-09-19 and a check enforces it today.
3. **One canned FAQ is on all 133 game pages** ("Is X free to play?"). Its three sentences are the three most repeated sentences on the site.
4. **The Record Books pages are the most alike pages on the site.** Roughly half to three quarters of each page's sentences (the tables aside) also sit on more than three other pages.
5. **The host adds things the code cannot remove.** The "Edit with Lovable" badge is in the raw HTML, a host visit counter runs before any consent, and any dead address answers 200 with a full copy of the home page (1,009 words).
6. **The trust pages look unfinished.** 5 of them show 2 or 3 trademark disclaimers, the home page's raw HTML shows none, the game count reads 5 ways, and About names nobody (your own instruction of 2026-09-01).
7. **12 live pages are named after another company's game or show** (5 Connect 4, 5 Connections, Footle, Sports Millionaire).

What the brief believed that is no longer true:

- The sitemap is not stale. It was generated 2026-10-07, holds 171 URLs, and already lists the Record Books, the hubs, About, Contact, What's New and Stadium Tycoon.
- The two footers problem was fixed on 2026-08-28 (every page has 1), and `/jeopardy` and `/deal-or-no-deal` were retired in August.
- Reskins do not share text. Two Higher or Lower guides are 1.5% alike on average. What they share is the layout.
- Titles, descriptions, canonicals and H1s are clean. All 171 indexable pages have exactly one of each and none is a duplicate.
- The ads.txt line in the brief has a typo (section 7), and this host cannot send a real 404 or a 301 at all (section 8d).

One thing the brief does not know: an audit done here on 2026-10-01 said to make the short guides longer. This brief says to make them shorter. The other lane's unshipped drafts follow the first one. You are choosing between two written directions (sections 8b, 8f and 8g).

## The brief's five claims, checked

| # | The brief says | True today | Evidence in a few words |
|---|---|---|---|
| 1a | Every game page follows the same sequence (intro, how to play, rules, walkthrough, tips, FAQ) | **True.** 133 of 133 guides, because one component prints the five titled parts every time | `GameSeoContent.tsx` prints them with no condition; 133 of 133 saved game pages carry the five titles in that order |
| 1b | Much of it is padding | **Partly.** The padding is the heading layer, not the sentences. 20,332 of the 114,321 guide words are headings. 10,346 of the 11,646 sentences in the pages' main copy are different from each other | 2,110 sub headings, 1,906 over one bullet or paragraph, about two thirds say the line under them again |
| 1c | `/golf-higher-lower` has the heading "Tapping the golfer with more majors" over one bullet | **True, word for word** | `moreSports.ts` lines 1153 to 1155; the live build shows the same |
| 1d | The same "Is X free to play?" answer is on every game page | **True.** 133 pages. It is one template in code, not 133 bits of copy | `GameSeoContent.tsx` lines 177 to 178; it also feeds the FAQ data Google reads on 133 pages |
| 2a | About ten Higher or Lower variants, several Connect 4, Conquest, Perfect Season and Perfect Lineup | **True, and bigger than that.** Higher or Lower 10, Connect 4 5, Conquest 5, Perfect Season 4, Perfect Lineup 3, plus 7 more families the brief did not name. 68 of 133 games in 12 families | `routes.json`, families worked out from shared code |
| 2b | Each reskin has the same templated text | **False for the words, true for the layout.** Two Higher or Lower guides are 1.5% alike on average, Connect 4 2.2%, Perfect Season 2.6% (section 3 says how "alike" is measured). Real repeated text sits in 4 families only (My Career US, Gauntlet Draft, Conquest, College Dynasty) | `copy-by-game.json` |
| 3a | Almost no editorial or reference content outside the Record Books | **Partly.** 10 reference pages exist outside it: 5 format history explainers (2,062 to 3,900 words each, with their sources and a "last checked" date printed), the World Cup 2026 results page, 4 grid archives. There is no explainer of how any simulation works and no byline anywhere | All 10 are in the sitemap; only 4 to 6 pages link to each |
| 3b | The Record Books is not in the sitemap | **False.** `/records` and all 13 record pages are in it | Live sitemap, read 2026-10-08 |
| 4a | The About page names nobody | **True, by your own instruction.** On 2026-09-01 you said "the note from the maker shouldnt say my name" and the name came off the whole site | Round 382, `docs/PROJECT-STATE.md` line 15392 |
| 4b | The game count differs (120+, 113, "over 100") | **True, and wider.** The registry holds 133. A visitor can read 120+, 130+, 133, "over 100" and "100+". 113 is only an old dated What's New entry | 8 typed places, 6 computed ones (section 4) |
| 4c | Two different cookie banners exist | **Partly.** The code has 1 banner with 1 wording. Two things could look like a second one, and both are guesses: the one banner has two layouts, and a Google "European regulations message" has been published in your AdSense account since 2026-02-11 | Browser walk of 17 pages; `docs/adsense/reapply-readiness.md` |
| 4d | Some pages render two footers | **False since 2026-08-28.** 1 footer on all 17 pages walked in a browser, never more than 1 at any moment | Round 313; a check fails the build if a second one appears |
| 4e | Some pages render two trademark disclaimers | **True on 5 pages.** `/about`, `/contact`, `/privacy` and `/whats-new` show 2, `/terms` shows 3. Every other page shows 1 | An old short disclaimer typed into those 5 page files; no check sees it |
| 5a | The sitemap was generated on 2026-08-12 | **False.** Generated 2026-10-07, 171 URLs, dates from 2026-08-25 to 2026-10-07. The brief describes the hand made file that was replaced on 2026-08-17 | One load of the live sitemap: the same file as the build, byte for byte |
| 5b | It is missing the Record Books, hubs, About, Contact, What's New and Stadium Tycoon | **False.** Every one of them is in it, each once | Checked by name |

Other things the brief states or takes for granted:

| The brief says | True today | Evidence in a few words |
|---|---|---|
| About 125 game pages | 133 registered games. 5 more retired games still answer at their old address, hidden from search | `gameRegistry.ts`; `routes.json` |
| Roughly 30K visits and 100K pageviews a month, mostly desktop, mostly from search and returning players | Two readings are on file. 30 days to 2026-09-14: 22,904 visitors, 78,484 pageviews (Direct 9,650, Bing 7,953, Google 2,619). 2026-09-05 to 2026-09-19: about 1,000 visitors a day, which is the brief's 30K a month (Bing 3,882 search visits, Google 1,705). "Mostly desktop" is unchecked: no device split for all traffic is on record. The one figure is 42 percent mobile among Google search clicks in the 28 days to 2026-08-29 | `docs/PROJECT-STATE.md` lines 12724 to 12745; `docs/WORKBOARD.md` lines 7358 to 7361 |
| Eight pages rank and must keep their URL, title and H1 | All 8 are live and in the sitemap. The repo records pageviews, not rankings. 6 of the 8 are in the recorded top ten. `/nfl-my-career` and `/fantasy-draft` are in no recorded top ten | The 30 day pull: `/soccer-career` 12,350 (16 percent of all pageviews), `/club-manager` 3,159, `/college-grid` 866, `/build-your-xi` 793, `/nba-my-career` 674, `/stadium-tycoon` 489. Three pages in that top ten are not on your list: `/perfect-season-nba` 592, `/dart-draft` 549, `/budget-builder` 501 |
| "The games themselves are fine" | Not checked by this audit. It read pages, it did not play games. Three open items from the 2026-10-01 audit touch pages on your list and were not measured again (section 5) | `docs/audits/LIVE-RENDERED-AUDIT-2026-10-01.md` |
| `/soccer-career` is the standard to match | It measures the way the brief describes it (2,179 body words, 68.6 words under each sub heading against 17.9 on a reskin). It still has the keyword titles, the canned FAQ and 9 sub headings over one bullet | `family-plan.md` section 2 |
| Trademark style URLs: `/jeopardy`, `/deal-or-no-deal`, `/connections`, `/football-connect-4`, `/footle` | 2 of the 5 are already retired. 12 live pages carry such a name | Section 6 |
| ads.txt should end `f08c47fec0942fa8` | Typo in the brief. The file is right as it is | Section 7 |
| Renames can use 301 redirects, and unknown URLs can return a real 404 | Not on this host | Section 8d |
| The "Edit with Lovable" badge is a hosting setting | True. And it is in the raw HTML every crawler receives | Section 4 |

## 1. Route inventory

The router holds 194 routes today.

| Type | Routes | What is in it |
|---|---|---|
| Game | 138 | The 133 registered games, plus 5 retired games that still answer at their old address and are hidden from search |
| Reference | 24 | `/records` and 13 record pages, 5 format history explainers, `/world-cup-2026-results`, 4 grid answer archives |
| Retired redirect | 11 | Old addresses that forward somewhere else. Each is a signpost: a tiny page that says "this page moved" and sends the visitor on |
| Utility | 8 | `/search`, `/leaderboard`, `/profile`, `/profile/:username`, `/reset-password`, `/admin/login`, `/admin/reports`, and the catch all for dead addresses |
| Hub | 7 | The home page and 6 sport hubs (`/soccer`, `/pro-basketball`, `/pro-football`, `/baseball`, `/hockey`, `/college`) |
| Legal and trust | 6 | `/privacy`, `/terms`, `/accessibility`, `/about`, `/contact`, `/whats-new` |

**The registry holds exactly 133 games** in 13 categories: Soccer 36, World and Olympic 20, Pro Basketball 17, Hockey 12,
Baseball 11, Pro Football 11, College 7, Combat 6, Formula 1 4, Tennis 3, Aussie Rules 2, Golf 2, NASCAR 2.

The sitemap lists 171 URLs: the 133 games, the 24 reference pages, the 7 hubs, the 6 legal and trust pages, and
`/leaderboard`. A crawler can read 192 documents in all: the home page, 177 saved pages, the 11 signposts and 3
placeholder pages (the profile page and the two admin pages). 21 saved documents are left out of the sitemap on purpose
(the 11 signposts and 10 pages that carry noindex). Nothing in the sitemap lacks a saved page, and no registered game is
missing from it.

Two kinds of address that are not in the table:

- `/profile/<name>` is a public player profile under a name the player chose. It has no fixed address, so it has no
  saved page. Its raw HTML is a copy of the home page, like any dead address, and it turns noindex once it has drawn.
- Six files are public addresses but not pages: `robots.txt` (lets every crawler in, blocks only `/admin/`, names the
  sitemap), `sitemap.xml`, `ads.txt` (section 7), `llms.txt` (a short description of the site for AI crawlers, with a
  typed "100+ games" in it), `manifest.json` (the app icon list) and one key file that lets the site tell search
  engines when a page changes.

Game families, worked out from the code each game shares:

| Kind | Games | Families |
|---|---|---|
| Reskins of one mechanic | 68 | Daily clue guessers 11, Higher or Lower 10, Grid 7, Connect 4 5, Connections 5, Conquest 5, Gauntlet Draft 5, Career Path guessers 5, Chain 4, Missing starter 4, Perfect Season 4, Perfect Lineup 3 |
| Deep games on a shared engine | 23 | My Career (US sports) 4, Front Office 4, Tycoon and idle 4, Club Manager engine 3, Fight sims 3, College Dynasty 2, Arcade shots 2, Soccer Career 1 |
| Different games on one shared pool | 19 | Soccer squad builders 12, Secret player games 5, Champions quizzes 2 |
| Standalone | 23 | One page each |

Three things about families that matter later:

- **No family hub page exists.** The only hubs are the 6 sport hubs, and together they list 94 of the 133 games. The
  other 39 games sit in 7 sports with no hub (World and Olympic 20, Combat 6, Formula 1 4, Tennis 3, Golf 2, Aussie Rules 2,
  NASCAR 2).
- **Most reskin families are parallel copies in code, not one engine.** Higher or Lower is ten separate copies of the
  game code, Connect 4 five. So the facts a reskin page could state (pool size, era range, stat compared) live in a
  different data file per page.
- **These counts move when the next game lands.** The other lane has a fifth Perfect Season reskin (Soccer Perfect
  Season, Round 1097) finished and waiting to merge. With it: 134 games, 69 reskins, 172 sitemap URLs.

**The full list:** `docs/audits/ad-readiness-2026-10-08/routes.json` has one record per route (type, family, why it is
in that family, sitemap row, saved page facts, who links to it), made by `scripts/auditRoutes.mjs`.

## 2. The crawl

192 addresses were fetched with a plain request and no JavaScript. All 192 answer 200. 171 are indexable, 10 carry
noindex, 11 are signposts for retired addresses.

What the 171 indexable pages have in their raw HTML:

| Check | Result |
|---|---|
| Title | 171 of 171 have exactly one. 0 duplicates. 19 to 60 characters, none over 60 |
| Meta description | 171 of 171 have exactly one. 0 duplicates. 51 to 215 characters: 9 run past 160 and 2 are under 70 |
| Canonical | 171 of 171 have one and it points at the page itself |
| H1 | 171 of 171 have exactly one. 0 duplicate H1 texts |
| Main text present | 171 of 171 |
| Headings | 4,691 in main content, 27.4 a page |
| Structured data | Reads cleanly on every page. Breadcrumb data on 147 of 171, FAQ data on the 133 game pages |

Word count of main content. Words are counted by splitting the saved page's main text at the spaces, leaving out the
standalone link tiles and the site's own top and bottom bars. Another counting rule moves a figure by a few words.

| Pages | Lowest | Lower quarter | Middle | Upper quarter | Highest |
|---|---|---|---|---|---|
| All 171 indexable | 214 | 624 | 784 | 1,294 | 44,224 |
| The 133 game pages | 543 | 621 | 676 | 1,047 | 5,182 |
| The 7 hubs | 1,009 | | | | 1,983 |
| The 24 reference pages | 638 | | | | 10,333 |

The 20 thinnest indexable pages: `/contact` 214, `/leaderboard` 477, `/accessibility` 510, `/nhl-connections` 543,
`/hockey-higher-lower` 547, `/golf-higher-lower` 551, `/hockey-career` 552, `/connections` 566, `/nfl-connections` 569,
`/f1-constructor` 577, `/tennis-higher-lower` 581, `/nba-career` 584, `/afl-higher-lower` 589, `/nba-higher-lower` 593,
`/score-predictor` 594, `/career` 596, `/missing-five` 597, `/missing-eleven` 598, `/baseball-connections` 599,
`/baseball-career` 601. Every one of the 17 games on that list is a reskin except `/score-predictor`.

Other things the crawl shows:

- No indexable page is empty. None has under 150 words and only `/contact` has under 300.
- The reskins cluster just above 540 words, and about a third of a thin game page's words are headings
  (`/golf-higher-lower`: 182 of 551).
- `/whats-new` is 44,224 words of changelog, thirty times the average page. It is the largest thing a crawler reads here.
- The longest game page is `/club-manager` at 5,182 words. `/soccer-career` has 2,410.
- **A dead address is a full copy of the home page** to any crawler that does not run JavaScript: status 200, the home
  title, a canonical to `/`, 1,009 words of home copy and no robots tag. The 404 message and the noindex only appear
  once scripts run.
- **The home page's raw HTML** has 1,009 words and 15 headings, no footer and no trademark disclaimer, and links 46 of
  the 133 games. The other 87 games are reachable from it only after JavaScript runs.
- The 9 long descriptions are the six sport hubs (190 to 215 characters), `/champions-league-format-history` 211,
  `/about` 167 and `/records` 163. Length only shortens how a search result looks. It is not an error.

**The full list:** `crawl.json` has one record per address (title, description, canonical, H1, words, headings, whether
the main text is there), made by `scripts/auditCrawl.mjs`. `crawl-branch-files.json` is the same crawl of Release AL.

## 3. Duplicate and thin copy

**Repeated sentences are few.** The main copy of the 171 pages holds 11,646 sentences, and 10,346 of them are different
from each other. 114 sentences sit on more than three pages. That count blanks out each game's own name and its numbers
before comparing, so the same sentence about two different games counts once. With exact matching it is 106. Counted
every time they appear, the 114 are 10.5% of all the sentences on the site and 5.6% of the words.

| On how many pages | Sentences | What they are |
|---|---|---|
| 100 or more | 3 | The canned FAQ answer (on 132 to 133 pages) |
| 67 | 1 | "No", the opening word of many FAQ answers. More a counting quirk than a duplicate |
| 10 to 19 | 21 | Nearly all shared by the Record Books pages |
| 6 to 9 | 7 | Not broken down here. The list is in `duplicates.json` |
| 4 or 5 | 82 | 36 of them are the four US My Career guides |

The fact checker counted again with a different way of splitting sentences and exact matching: 98 sentences, 8.6% of
all appearances, 4.4% of the words. Same picture.

The worst repeated sentences:

| Sentence | Pages |
|---|---|
| "No download and no signup needed" | 133 |
| "Yes" (the opening word of the canned answer) | 133 |
| "{game} is free to play on DoUKnowBall, right in your browser" | 132 |
| "No" | 67 |
| "The Report a bug button below lands straight in our inbox" | 15 |
| "Spot something that looks wrong anyway" | 15 |
| "Report a problem" | 15 |
| "Each table was verified against at least two independent sources, and the checks run on every build..." | 14 |
| "The Record Books, with the latest seasons of every competition" | 13 |
| "Name them all" | 13 |
| "Heisman Trophy winners since #, year by year" and "{sport} champions since #, year by year" | 13 each |
| Eleven more cross links from one record page to the others (Stanley Cup, Super Bowl, World Series and so on) | 12 each |

**The Record Books pages repeat the most.** A record page's tables are not sentences, so this is about the 290 to 410
words of text around the tables. With names and numbers blanked out, 47% to 77% of those words also sit on more than
three other pages. Highest: `world-series-winners` 76.5%, `stanley-cup-winners` 75.9%, `wnba-champions` 73%. Lowest:
`dally-m-medal-winners` 52.3%, `nrl-premiers` 48.6%, `brownlow-medal-winners` 47.4%. With exact matching the fact checker
got 46% to 70%. Either way they are the most alike pages on the site. The tables differ. What repeats is the same method
paragraph, the same report a bug lines and the same list of links to the other twelve books. After them come the grid
archives (19% to 25% blanked, 13% to 17% exact) and the four US My Career pages (22% to 25%).

**Where game guides really repeat themselves** (measured on the guide files). "How alike" means: take every run of four
words in a row from two guides and count the share of those runs that are in both. Measured against the shorter guide
alone the figures are about double (My Career US 45%, Gauntlet Draft 40%, Conquest 21%, Higher or Lower 3%).

| Family | How alike two of its guides are | Shared sentences |
|---|---|---|
| My Career, four US sports | 27.7% | 38 sit on two or more of the four guides (2,322 words). 30 to 36 sit on all four, depending on the count |
| Gauntlet Draft, 5 pages | 23% | 17 (674 words) |
| College Dynasty, 2 pages | 20.1% | not counted separately |
| Conquest, 5 pages | 9.8% | 16 (560 words) |
| Every other reskin family | 0.5% to 2.6% | Little beyond the canned FAQ lines (a Higher or Lower page shares 3 or 4 sentences out of 34 to 43). One pair stands out: the golf and Aussie rules Higher or Lower guides are 19.7% alike |

**Headings are the real pattern.** The number to steer by comes from the guide files: 2,110 sub headings, and 1,906 of
them (90%) sit over exactly one bullet or one paragraph.

- 873 (41%) sit over a single sentence. On 72 guides every single sub heading sits over one block.
- About two thirds say the line under them again. Counted as "six in ten or more of the heading's words are in that
  line" it is 1,350 (64%). At five in ten it is 1,515.
- Guide copy is 114,321 words: 90,486 of body text, 20,332 of headings and 3,503 of the one canned FAQ.
- Each guide has five part titles (How to play, Rules, Walkthrough, Tips, FAQ). All 665 carry the game's name. 132 of
  the 133 "How to play" titles add more words after the name (129 if three borderline ones are left out), and 118 use
  the word "free".
- On 126 of the 133 game pages the H1 is the plain game name, and the search title (the same words as the title tag)
  is printed a second time as an extra heading above the guide. On the other 7 (for example `/budget-builder`) the
  search title is the H1.
- 45 guides have a body of 385 to 405 words and 72 are under 450. They were written to a size.
- Two guides were never converted and already have the plain shape: `/aussie-rules-manager` and `/cage-clash`.

The same thing counted on the saved pages, the way the brief words it ("fewer than about 25 words"). This count takes
every heading on a page, the H1 included, so its numbers are bigger. Use it for the before and after, not to steer by.

- 4,691 headings in main content. 2,849 (60.7%) sit above fewer than 25 words.
- Take out the 693 that only open a run of smaller headings and the 117 that sit over link tiles, and 2,039 are left.
  1,951 of those sit over exactly one sentence or bullet, 23 sit over nothing, and 1,239 say the line under them again
  by the same six in ten rule.
- On the 133 game pages it is 1,876 of 3,864 headings. Of the 1,876, 76 are H1s over a short tagline, 39 are H2s and
  1,761 are sub headings.
- Only 5 pages have none (the 4 grid archives and `/whats-new`).

The worst pages, counting every heading over fewer than 25 words out of all the headings on the page: `/soccer` 39 of
51, `/list-quiz` 37 of 41, `/world-cup-bracket` 29 of 40, `/contract-chaos` 27 of 40, `/ufc-chain` 27 of 29,
`/f1-constructor` 26 of 27, `/guess-tennis-player` 26 of 28, then six pages on 25 (`/f1-driver`, `/f1-higher-lower`,
`/nba-grid`, `/nba-higher-lower`, `/olympics`, `/tennis-higher-lower`) and seven on 24 (`/baseball-career`,
`/guess-the-golfer`, `/higher-lower`, `/missing-nine`, `/nascar-chain`, `/nba-career`, `/nba-starting-5`). On
`/soccer`, 36 of the 39 are the names of its 36 games, which a check requires to be headings on a hub.

**Where the heading layer came from.** It was added on 2026-09-19 (Round 638) at your request at the time, for search. It
regrouped sentences that already existed under keyword titles and sub headings and did not change a sentence. The old
flat text of 131 guides is still on file, so taking the layer off is mostly mechanical.

**The brief's own example.** `/golf-higher-lower` has 27 headings on the page. 17 sit over a single line. 5 more are
part titles that only open a run of smaller headings, and 1 is "More games to play" over link tiles. So it is 23 of 27
by the count used for the list above and 17 of 27 by the narrow one. The heading "Tapping the golfer with more majors"
over the bullet "Tap the golfer you believe won more majors." is there word for word, and so is the keyword title "How
to play Golf Higher or Lower, a daily major championship trivia game".

**The filler phrases the brief bans** ("test your knowledge", "fun for all fans", "whether you're a casual fan or a
die-hard") appear zero times in the 133 guides. "Test your ... knowledge" is on 6 saved pages: `/build-your-xi`,
`/guess-the-year`, `/nascar-chain`, `/teammates`, `/ufc` and the retired, hidden `/football-timeline`. It comes from a
one line description typed in 7 page files. "How well do you know ..." is the subtitle of 6 guessing boards. "Fun for
all fans" appears nowhere.

**The full lists:** `duplicates.json` has every repeated sentence with its pages, every thin heading with the words
under it, and the share per page (made by `scripts/auditDuplicateCopy.mjs`). `copy-by-game.json` has each of the 133
guides measured (made by `copy-measure.mjs`).

## 4. Game counts, footers, disclaimers, consent banners

### Game counts

The registry holds 133 games. One source of truth already exists in the code (`src/data/gameRegistry.ts`: the count
worked out from the registry, plus a rounded label that reads "130+"). 6 places use it. 8 places are typed by hand.

| Worked out from the registry (always right) | Says today |
|---|---|
| Home page headline, once the app has drawn | "130+ free games across every sport" |
| Home page sport sections | "(36 games)", "(11 games)" and so on |
| The page for a dead address | "See all 130+ games" |
| `/search` | "All 133 of them." |
| The six sport hubs | "All 36 of them in one place", "36 games" and so on |
| The signed in chip in the game top bar | "played today / 133" |

| Typed by hand (can go stale) | Says today | Checked by anything? |
|---|---|---|
| Home page description (three copies in `index.html`, one in the app) | "120+ free sports games..." | Yes. The check fails if the typed number is at or above the real count, or more than 26 games behind it. So anything from "107+" to "132+" passes today, and "130+" would pass without touching the check |
| Home page static copy (`src/data/homeCopy.ts`, written into `index.html`) | "120+ free sports games in the browser" | Yes, same rule |
| About page description | "over 100 free sports trivia games" | No |
| About page body | "Over 100 games", and "eleven sports" (the registry has 12 sports plus a world category) | No |
| `/footle` description | "One of 100+ free sports games" | No |
| `public/llms.txt` | "100+ games" | No |
| What's New, Spring 2026 entry | "eleven sports and over 100 games" | No |
| What's New, dated entries | "113 games", "all 127 games", "all 120 of them", "100+ free games", "all 126 of them" | No. Each was true the week it was written, so these are history and should stay |

So one visitor can read 120+, 130+, 133, "over 100" and "100+" today. The home page itself, once drawn, says "130+ free
games" at the top and "120+ free sports games" lower down on the same screen. The home template uses a rounded number
on purpose: an exact one typed into saved pages has to be rewritten every time a game ships.

### Footers

There is 1 footer component (`src/components/game/Footer.tsx`) and it is drawn once, under every page (`src/App.tsx`
line 565). In a real browser the count was 1 on all 17 pages walked and never more than 1 at any moment. A check fails
the build if any other file draws it. The two footers problem from your 2026-08-28 screenshot is fixed.

### Trademark disclaimers

| | Pages |
|---|---|
| Disclaimer shown once | 172 saved pages |
| Shown twice | `/about`, `/contact`, `/privacy`, `/whats-new` |
| Shown three times | `/terms` (the third is the real legal clause and belongs there) |
| Not shown at all in the raw HTML | 15: the home page, `/profile`, the two admin pages and the 11 signposts |

- The extra one on those 5 pages is an older, shorter disclaimer typed into each page file (`About.tsx` lines 97 to
  104, `Contact.tsx` 57 to 64, `PrivacyPolicy.tsx` 131 to 134, `TermsOfService.tsx` 115, `WhatsNew.tsx` 402). It has
  its own Privacy and Terms links and sits right above the real footer. To a reader it looks like two footers stacked.
  These are exactly the pages a reviewer opens, and no check sees it.
- **The home page's raw HTML has no disclaimer.** It only appears after JavaScript runs.
- The real footer disclaimer (`Footer.tsx` line 25) names 23 bodies. It does not name the AFL, the NRL or the WNBA.
  The site has `/afl-higher-lower` and 5 record pages about them, and Australia is about a quarter of the audience by
  the project's own analytics notes.

### Consent banners

- **In the code there is 1 banner** (`src/components/CookieConsent.tsx`, drawn once at `src/App.tsx` line 316) with 1
  wording: "Ads and analytics only run if you press Accept. Essential only keeps them off and every game works the
  same." It has two layouts: a bar at the foot of the screen, or a card inside an open How to Play box. The footer's
  "Cookie choices" link brings it back.
- **It does what it says, for everything in the repo.** A browser walked 17 pages with every outside request counted.
  Before any choice: 0 requests to analytics hosts and 0 to ad hosts on 17 of 17 pages. After Accept: 1 analytics
  request on each of the 17, and 1 ad request on each of the 4 walked pages that carry an ad slot
  (`/golf-higher-lower`, `/footle`, `/club-manager`, `/college-grid`). "Essential only" was tested on 2 pages
  (`/about`, `/golf-higher-lower`): 0 and 0.
- **80 page files place the ad banner sitewide,** and a check pins that exact number. That 80 is the baseline for your
  hard rule "no ad code beyond what already exists".
- Requests that do go out before any choice: Google Fonts on 17 of 17 pages, flagcdn.com where flags show, and the
  site's own database.
- The banner's sentence is also saved into the raw text of 159 of the 192 documents as an ordinary paragraph, so
  someone reading raw HTML sees a consent sentence with no buttons.
- **What the brief saw as "two banners" is not known.** Two candidates, and both are guesses. One: the two layouts of
  the one banner (`/footle` opened with the card inside the How to Play box). Two: a second consent system outside the
  code. A Google "European regulations message" has been published for douknowball.com in your AdSense account since
  2026-02-11. Google's ad script shows it, and that script only loads after the site's own Accept, so a visitor in
  Europe can meet both, one after the other. That could not be reproduced locally because the ad host was blocked for
  the test.
- The site's own banner is not a Google certified consent platform and sends Google no consent signal. The site copes
  by asking only for non personalized ads. The brief asks for Google's current rule to be checked before recommending a
  platform. **That check was not done in Phase 0.**

### What the host adds to every page (not in the repo)

- **The "Edit with Lovable" badge.** The live home page is 41,421 bytes against 32,200 for the same build served
  locally. The difference is the badge markup, its styles and one script. The site already hides the badge for anyone
  whose browser runs JavaScript (your request of 2026-08-05), but it is still in the raw HTML a crawler or a reviewer's
  tool receives. The project notes record the same badge on seven other live pages on 2026-09-15.
- **The host's own visit counter** (`/~flock.js`). It loads for every visitor with no choice made, while the banner says
  "Ads and analytics only run if you press Accept". The privacy policy names Lovable as the host and says it receives
  your IP address and browser type to deliver pages. It does not mention this counter. It is also where your traffic
  totals come from, because it counts people who never press Accept.

### Privacy, Terms, About and Contact, as they stand

- **Privacy policy** (last updated September 15, 2026) covers the four things the brief lists: advertising cookies, the
  vendors including Google, how to opt out, and browser storage. Storage is described in general terms (saves kept in
  the browser, the random leaderboard handle), with no list of what is kept. Other gaps: Google Fonts and flagcdn.com
  are not named, the host's visit counter is not named, the cookie section does not say that Accept also starts
  Analytics (two other sections do), and there is no operator name or postal address.
- **Terms** say the site is run by "an individual doing business as DoUKnowBall" under Massachusetts law. A check pins
  both phrases.
- **About** says one person runs it, gives the project email, says it started in "early 2026", says advertising can
  help cover costs, and points to the footer's Report a bug button for corrections. It names nobody (your instruction).
  It names no data sources and no checking method. The voice is mixed ("we", "him", and a first person note) and a few
  marketing lines remain. The start date is not settled in the site's own data: About says early 2026, What's New says
  Spring 2026, and the registry dates Footle 2025-01-01 and the next six games 2026-02-09.
- **Contact** already has the public email (`douknowball1@gmail.com`) and the bug report route, plus a 30 day answer
  for data requests.

**The full lists:** `trust-lists.md` names every game count, every footer, disclaimer and consent component with its
file and line. `trust-browser-walk.json` is the 17 page walk. `trust-raw-footer.json` is the raw HTML count.

## 5. Empty, unfinished, retired and orphan pages

- **Empty or "coming soon": none.** 0 of the 191 saved pages say coming soon, check back soon or under construction.
  No indexable page has under 150 words. Three guessing boards carry an "empty database" line in their code
  (`CbbProgramBoard.tsx` line 87, `NascarDriverBoard.tsx` line 95, `TennisPlayerBoard.tsx` line 93). It shows only if
  their table comes back empty and it is in no saved page.
- **Unfinished in another sense, and not measured again today.** The 2026-10-01 audit left three items open on live
  pages: two slow grids, an error line on a first visit to `/fantasy-draft`, and a fonts file that holds up the first
  paint (8g, fixes 3, 9 and 10). `/college-grid` and `/fantasy-draft` are on your list of pages that rank.
- **Retired addresses that forward: 11.** `/world-cup`, `/football-draft`, `/guess-soccer-club`,
  `/guess-transfer-value`, `/perfect-lineup`, `/tier-list` and `/grade-transfer` go to the home page.
  `/world-cup-predictor` goes to `/world-cup-bracket`. `/deal-or-no-deal` goes to `/squad-deal`.
  `/overrated-underrated` goes to `/face-off`. `/jeopardy` goes to `/quiz-board`. Each is a signpost page (36 to 38
  words) that answers 200 and forwards. None is in the sitemap and no page links to any of them.
- **Retired games that still answer at their old address: 5.** `/football-timeline` (106 words in the saved page),
  `/guess-nfl-team` (88), `/shirt-number` (2), `/higher-lower-transfers` (92), `/pack-battle` (102). You retired them in
  July 2026. Each carries noindex, none is in the sitemap, and no page links to them. **This is the only real "delete or
  redirect" list in the audit**, and nothing has been done to it.
- The registry also holds 12 commented out entries, each with your own reason for retiring or deleting that game ("too
  simple", "Delete perfect lineup" and so on). None is in a menu. The list is in `routes.json`.
- **Live pages nothing links to: 8.** Those 5 games plus `/reset-password`, `/admin/login` and `/admin/reports`. All 8
  carry noindex.
- **Orphans among the pages Google is asked to index: 0.** The least linked pages have 4 indexable pages pointing at
  them (10 pages: the NFL, NBA, MLB and NHL format history explainers, `/world-cup-2026-results`, `/alphabet-sprint`,
  `/fight-gym`, `/guess-nascar-driver`, `/nascar-chain`, `/olympics`). The middle page has 8.
- **Games with no link from the home page's raw HTML or from any hub: 12.** `/fight-career`, `/fight-gym`,
  `/fight-promoter`, `/cage-clash`, `/hof-or-bust`, `/score-predictor`, `/list-quiz`, `/emoji-guess`, `/mystery-box`,
  `/idle-arena`, `/face-off`, `/perfect-lineup-f1`. They are reached only through "More games to play" links and `/search`.
- **The only full list of games in raw HTML is on `/search`,** which is noindex. No indexable page lists all 133.
- **17 indexable pages have no link back to the home page** in their raw HTML: the 13 record pages, `/accessibility`,
  `/privacy`, `/terms` and `/world-cup-2026-results`. The footer has no Home link.
- **`/leaderboard` is the one utility page in the sitemap.** Its saved page is 477 words that explain how the board
  works. The board itself comes from the database and is not in the raw HTML.
- **Dead code, never public:** 7 page files have no route at all (the old Deal, Football Draft, Grade Transfer, Guess
  Soccer Club, Guess Transfer Value, Perfect Lineup and World Cup pages). A tidy up item, not a crawler issue.
- Two older open decisions touch this list: retiring the standalone `/wonderkid-factory` route (Round 589, held on the
  AdSense decision) and whether `/world-cup-bracket` is kept or repurposed.

Three small things Phase 1 would trip over:

- 6 pages already answer "Do I need an account?" in their own FAQ, so the canned FAQ answers it twice:
  `/world-cup-bracket`, `/college-grid`, `/nba-connections`, `/f1-driver`, `/tennis-chain`, `/nascar-chain`.
- The hockey Higher or Lower data file marks its two goalies' totals "unverified". Any new line built on that file
  should leave those two out.
- `/soccer-career` has one mislabelled sub heading ("A pay cut, an injury and a rival's Ballon d'Or" sits over the
  award vote rule).

**The full lists:** `routes.json` holds 18 named lists (retired, hidden, linked from nowhere, thinly linked, games not
linked from the home page or a hub, commented out in the registry, page files with no route and so on).

## 6. Logos and other companies' marks

**None of this section is legal advice.** It records where each name sits and what moving it would cost. How strong
any one company's claim is, is a question for a lawyer. Every new name below is a suggestion only, and none of them
was checked for whether somebody else already trades under it.

### Logos: nothing to remove

- 17 image files ship with the site and all are the site's own: 10 brand files made by the logo generator, 5 empty
  arena backdrops, the social card, and 1 unused placeholder. The 5 arenas and the social card were looked at: no logo,
  lettering, sponsor or person.
- The code has 7 image tags: 4 load national flags from flagcdn.com, 1 is the arena art, 1 is a signed in visitor's own
  avatar, 1 is in a test. Each of the 177 saved pages carries exactly 1 image, the site's own logo mark.
- By the marks auditor's count 30 files draw shapes in code. None is a league or club mark. The only other companies'
  glyphs are the X, WhatsApp and Instagram share buttons and the Apple and Google sign in buttons.
- No crest, kit, jersey or badge component exists. Clubs are a name and a colour.
- Two database tables hold links to player headshots that came with a public dataset. No code reads them and no
  visitor sees them. The database itself was not queried.
- One gap: this rule is kept by habit. No check fails if someone adds a new image file or a new image host later.

### Names: 12 live pages are named after another company's game or show

Two of the brief's five examples are already done: `/jeopardy` has forwarded to `/quiz-board` since 2026-08-27 and
`/deal-or-no-deal` has forwarded to `/squad-deal` since 2026-08-22 at the latest. Neither show's name appears in any
visible text on the site.

On each of the 12 pages below, the name sits in the URL, the game's label, the title, the H1, 7 to 9 guide headings and
6 to 8 places in the structured data. None of the 12 is on your list of pages that rank. None is in any recorded top ten
for pageviews, so each had fewer than 489 pageviews in the 30 days to 2026-09-14.

| Pages | What the name echoes | What the repo knows about its search standing | What a rename would cost | Suggestion only, unchecked |
|---|---|---|---|---|
| `/football-connect-4`, `/nba-connect-4`, `/nfl-connect-4`, `/mlb-connect-4`, `/nhl-connect-4` | A board game brand, used as the game's own name on 5 pages | `/football-connect-4` was "crawled, not indexed" in Google's 2026-09-03 report. 6 to 11 other pages link to each | 5 signposts, 5 sitemap rows that start again as new pages, every linking page rebuilt. About 14 code files and 3 script files per page. The six backend functions with the old name must stay as they are | "Four in a Row" (for example `/soccer-four-in-a-row`). The marks auditor's read: the clearest case of the 12 |
| `/connections`, `/nfl-connections`, `/nba-connections`, `/baseball-connections`, `/nhl-connections` | An ordinary English word that is also a well known daily puzzle's name | `/connections` and `/baseball-connections` were "crawled, not indexed" in the same report. 6 to 12 pages link to each | Same recipe, 5 pages. The five puzzle tables and one saved streak key keep the old name | "Common Thread" (for example `/soccer-common-thread`). The auditor's read: your call |
| `/footle` | A coined word that leans on the "le" ending of a famous word game. It is also an English word and the oldest name on the site | Listed "crawled, not indexed" in the 2026-09-03 report. A single page inspection on 2026-09-15 showed it indexed. 7 pages link to it | Same recipe, 1 page. Three browser save keys keep the old name | "Guess The Footballer". The auditor's read: weakest case, keep it |
| `/sports-millionaire` | A TV quiz show. The page also keeps the show's furniture: a 15 question money ladder and lifelines, one called "50:50" | No record. 6 pages link to it | Same recipe, 1 page. The cheapest of the 12 to move | "Sports Money Ladder" (`/money-ladder`). The auditor's read: reasonable to do |

**Your standing rule and these 12.** Since August (Rounds 129 and 133) no other company's game may be named anywhere
in the repo, and a check enforces it against a list of 81 names. "Connect 4", "Connections", "Footle" and "Sports
Millionaire" are not on that list. So the check treats the 12 pages as fine today, and no decision of yours is on
record for them. If a page is renamed, the old name should go on the list the same day or it can drift back. One real
miss turned up on the way: a code comment at `src/lib/packBattle.ts` line 14 names a card game brand in the public repo.

What "rename" can mean here, in three depths. Each one includes the one above it:

1. **The name only** (label, title, H1, headings). The URL stays. No lost address, but the URL still carries the name,
   and your own hard rule says a title or H1 change needs your yes per page.
2. **The URL as well.** This is what was done for `/jeopardy`. The old address becomes a signpost page that answers 200
   and forwards. It is not a real redirect (section 8d), so to a search engine the page starts again at a new address.
   Scores, streaks and saves carry over through one mapping line.
3. **The stored names as well** (leaderboard keys, browser save keys, database tables, backend functions). Not
   recommended. Players could lose records, and your first hard rule ("do not change saves or data") already rules it out.

Also checked, and listed so nothing is hidden:

- Names that are ordinary words, with a "keep" reading from the marks auditor: My Career (4 pages, 2 of them on your
  ranking list), Higher or Lower, Dynasty, Tycoon, Bingo, Fantasy Draft, Deadline Day, Wonderkid.
- **League names sit in about 60 game URLs** (NBA 17, MLB 10, NFL 9, NHL 9, F1 4, World Cup 4, UFC 2, NASCAR 2, AFL 2,
  Olympics 1). The 13 record page URLs also carry trophy and league names (Super Bowl, World Series, Stanley Cup,
  Heisman, NCAA, WNBA, NRL, Brownlow, Dally M). They say which sport or competition a page is about. The marks auditor
  put them in a different class from the 12 above and suggests no change. Of the bodies behind the game URLs, every
  one except the AFL is named in the footer disclaimer. The NRL and the WNBA, from the record pages, are not named
  either.
- `/ufc` and `/olympics` are in that group. The auditor's read is keep both. One note: Olympic wording is the one a
  lawyer may treat differently. The label was already changed to "The Medal Games", while the URL, the end of the
  title, one guide heading and the category name still say Olympic.
- Format echoes remain where names were already made neutral: Squad Deal's guide says "the banker", the Quiz Board uses
  the $200 to $1000 board, the Connections pages use four colour tiers.
- The profile page's list of old score rows still shows the labels "Connect 4", "Connections", "Olympics" and "Guess
  the Face". Only a signed in visitor sees it and the page is noindex.
- Your master spec names "Connect 4", "Connections" and "Footle" as games to keep and expand, and asks for a new "WNBA
  Connections". A rename contradicts the spec until those lines change.

**The full tables:** `marks.md` has every image, the 12 pages, the cost breakdown and a suggested name per URL.
`marks-scan.json` is the page by page scan.

## 7. ads.txt

- **It exists and it is correct.** The file holds one line and a line ending, nothing else:
  `google.com, pub-2929318086316376, DIRECT, f08c47fec0942fa0`
- The live site answered one request for `/ads.txt` on 2026-10-08 with 200, plain text, 59 bytes, the same line. (A
  copy checked out on Windows measures 60 bytes because of the Windows line ending. That is not a fault.)
- **The brief's line is wrong by one character.** The brief ends `fa8`. The file ends `fa0`, which is the id Google
  publishes. The AdSense panel showed the file as "Authorized" on 2026-09-30 and 2026-10-01. **Do not change the file
  to match the brief.** That would break it.
- One loose end for you to look at: on 2026-10-03 the AdSense row said "Not found" for ads.txt while the live file was
  answering correctly. It was recorded as a mismatch on Google's side, not a fault in the file. No newer reading of
  the panel is in the repo.
- The check that guards the file looks for the file, google.com, the publisher id and the word DIRECT (or RESELLER).
  It does not pin the last field, so a typo there would not be caught today.

## 8. What is already done, and what collides with a standing rule or an earlier decision of yours

The brief was written from an older picture of the site. Read this section before you approve Phase 1. It takes no
side. It says what stands today and what a yes would mean.

One word used all through it: **a check** is a script that runs before every release and stops the release when it
fails. If the work changes what a check expects, the check has to change in the same release, or the release stops for
a reason that is not a bug.

Context first. The written direction on keywords and guide length has moved several times in six weeks, and the checks
still hold September's version:

- 2026-08-28 (you): add keywords and descriptions so the site ranks higher.
- 2026-08-30 (your AdSense recovery note, written the hour of the second "no"): no padding, no word count inflation, no
  templated pages, build a real reference layer, factual pages carry their source, a last verified date and the period
  covered, "Do not fabricate a company or team", and only you submit a review. Much of this brief was asked for there.
- 2026-09-19 (you): "lots of key words and headings and sub headings and sub sub headings" on every game page.
- 2026-10-01 (your AdSense prompt): "Do not stuff keywords into game pages", "Do not create fake FAQs", "Do not add these
  sections mechanically", "Do not mass-delete useful game pages", and also "Do not keep weak pages indexed merely because
  they create more URLs".
- 2026-10-01 (the audit done here that day, not your words): deepen the short guides, family by family, starting with
  the 10 Higher or Lower pages (8g).
- 2026-10-08 (this brief): keyword headings are banned and reskin pages are to be short.

This brief is also at least the third outside written assessment pasted in (2026-08-25, 2026-09-15, 2026-10-08). The
2026-09-15 one was judged at the time "not reliable evidence of the current site state".

### 8a. Already done

| The brief asks for | State today | What keeps it true | Gap left |
|---|---|---|---|
| A sitemap built from the registry with real last modified dates, without search, with hubs, Record Books, About, Contact, What's New | Done. A generator has built it since 2026-08-17 and each page's date has been worked out from that page's own words since Round 280. 171 URLs | A check recomputes every date and fails if a game is missing | Guides are not in it because no guides exist yet. One accuracy note: the brief says "at build time". Today the file is rebuilt on the work machine before each release and committed, and the host only copies it. So "can never go stale" rests on the check, not on the host. The mechanism should not be rebuilt: its record of dates is the only memory of when each page last changed |
| Record Books with an index and one page per competition, in the sitemap, each with an introduction and notes on odd seasons | Built 2026-09-19 (Round 649), live since 2026-09-22. 14 pages. Linked from every footer and from the home page's raw HTML. Each of the 13 pages already opens with its own one or two sentence introduction, and the ones with odd seasons already explain them (no World Series in 1904 or 1994, the 1919 Stanley Cup final abandoned, no Brownlow from 1942 to 1945, and so on) | A check holds every table row against the data file | No dated "last verified" line and no named source on any page. One shared sentence says "verified against at least two independent sources" and names none |
| Reference pages that show their sources and a date | The 5 format history explainers already do. `/champions-league-format-history` says "40 sources across 4 publishers, last checked 2026-09-10" and carries 93 outside links. `/nfl-playoff-format-history` says "13 sources across 6 publishers, last checked 2026-09-15" | Not looked at by any auditor | No byline. This is a working pattern for what Phase 2 asks of the record pages, typed date included |
| Main text in the raw HTML, a unique title, description, canonical and exactly one H1 on every indexable page | 171 of 171 | Several checks | Three small blind spots in those checks (for example, the 17 nested pages are not walked by one of them). None is a defect today |
| noindex on search and utility pages | 10 pages carry it, `/search` included, and none is in the sitemap | Several checks | `/leaderboard` and the 4 grid archives are indexable on purpose (earlier decisions) |
| No orphan pages | 0 of 171 | A check fails at zero inbound links | 10 pages sit at the minimum of 4 |
| Breadcrumb structured data | On 147 of 171 pages | A check | Missing on 24: the home page, 6 hubs, `/records`, 5 explainers, 4 archives, `/leaderboard`, `/whats-new` and the 5 trust and legal pages |
| FAQ data only where real FAQs are | The FAQ data is built from the visible FAQ. 617 of 617 questions match the page | A check | It will follow whatever Phase 1 does to the copy |
| One footer | Done 2026-08-28 | A check | None |
| Ads and analytics off until Accept | True for everything in the repo: 0 requests before a choice on 17 of 17 pages walked | Several checks | The host's own visit counter (8d) |
| Privacy policy covers ad cookies, vendors, opt out, browser storage | Yes, all four. Storage is described in general, with no list of what is kept | A check on a fixed list of outside hosts | Google Fonts, flagcdn.com and the host counter are not named |
| Contact page with the public email and the bug report route | Both are there | A check pins the one address | Only open if you want a different address |
| One source of truth for the game count | It exists and 6 places use it | A unit test | 8 places are typed by hand (section 4) |
| Neutral names for `/jeopardy` and `/deal-or-no-deal` | Both retired in August | A check on retired routes | None. No work owed on these two |
| ads.txt | Present and correct (section 7) | A check | None |
| No generic filler phrases | 0 of the three banned phrases in the 133 guides | None | "Test your ... knowledge" on 6 saved pages, from 7 page files, and 6 board subtitles (section 3) |
| Reskin pages say what is in their pool | By the copy auditor's count 37 of the 65 proposed reskin intros already carry a number, and the ones checked match the data files | None | The rest |

### 8b. Where a yes reverses or runs into an earlier decision

| The brief asks for | The earlier decision | What stands in the way today | What a yes would mean |
|---|---|---|---|
| Phase 1: no heading over a single line, no heading that repeats its line, no keyword headings, no sub headings inside How to play | Yours, 2026-09-19 (Round 638): you asked for exactly those headings, for search | A check requires the game's name in every part title, at least 8 sub headings and 1 sub sub heading per guide, exactly 131 guides in that shape, and every one of 2,385 stored guide lines (59,718 words) still there word for word | You reverse that request. The check and its stored copy of the guides are rewritten in the same release. Facts for the call: those rounds were built for search. Bing sent about three times Google's search visits in the 30 days to 2026-09-14 (7,953 against 2,619) and about twice in the two weeks to 2026-09-19 (3,882 against 1,705). The repo has no ranking data to show whether the headings helped or hurt |
| Short reskin pages (Tier C) | Not yours. The audit done here on 2026-10-01 put "Deepen the short guides, family by family" fourth on its list of ten fixes, starting with the 10 Higher or Lower pages, for the 71 game pages under 600 guide words | The other lane's unshipped drafts follow that audit: its Higher or Lower drafts are 75% longer (8f) | You pick one direction. Both ask for facts from the page's own data. The reskin pages are already the shortest game pages (543 to 600 words, about a third of it headings). This brief wants them shorter still (a reskin guide goes from 611 words on average to about 376 to 446). The 2026-10-01 audit wanted them longer |
| Your name on About, and a byline with your name on every guide and data piece | Yours, 2026-09-01 (Round 382): "the note from the maker shouldnt say my name". Your name was then removed from every file | A check fails when a real name sits beside a first person sentence, with no exemption for you since that round. Another check keeps the maker's note on `/about` under its current heading. The Terms say "an individual doing business as DoUKnowBall", pinned by a check | You reverse that instruction. A narrow exemption is written on purpose. A public name also raises whether Terms and Privacy should name the operator. The name line in the brief is still blank |
| Rename trademark style URLs | Yours: the hard rule in this same brief (no URL, title or H1 change without asking), and your 2026-08-29 directive "Preserve existing routes". Your master spec lists "Connect 4", "Connections" and "Footle" as games to keep and expand | A rename changes all three on each page. Two checks tie every title and every guide heading to the game's label. The host cannot send a real redirect (8d) | A yes per URL, a signpost instead of a redirect, the spec lines updated, the old name added to the banned names list. Stored names (saves, leaderboard keys, tables) never change |
| Add noindex to any other utility page | Yours: the hard rule (see the list first). Your 2026-08-29 directive says "Archive and answer pages are wanted". Your 2026-10-01 prompt pulls both ways (quoted above). `/leaderboard` and the 4 grid archives were submitted on purpose | A page cannot be in the sitemap and carry noindex. The 11 signposts carry no noindex on purpose (a noindex beside a canonical to another page can spread to that page, and 7 of them point at the home page) | Every noindex is also a sitemap removal and needs your yes on a list. The whole candidate list is short: `/leaderboard`, the 4 grid archives, `/whats-new` |
| One family hub page per reskin family | A house decision of Round 270, not your words: small groups get no hub, because "a hub over two games is a thin page" | Each hub is a new indexable address. Four families have only 3 or 4 games | You choose how many (section 9 has the proposal, section 10 the question) |
| Record Books as a first class section | Decided twice already. 2026-08-30: deliberately not split into pages ("a list of past champions sits on a thousand other sites"). 2026-09-19: split into pages for search | Today's 13 pages are the most alike pages on the site (section 3) | Phase 2 adds a dated "last verified" line and a named source per page, and moves the shared method paragraph and cross link list to `/records`. The introductions and the notes on odd seasons are already there |
| Six to ten new guide pieces | Not yours. Standing advice of 2026-09-12: do not add reference pages until Search Console shows the 5 existing explainers were crawled. On 2026-09-15 they were "discovered, not indexed" with no crawl recorded. Nothing newer is on file | Nothing technical | You go ahead without that reading, or you paste a current Search Console export first |
| The whole brief | Yours, 2026-10-03: you paused Google work ("games first") | Nothing | The brief ends that pause |

### 8c. Where a yes runs into a standing check or house rule

| The brief asks for | The rule that stands today | What a yes would mean |
|---|---|---|
| "Zero FAQs is acceptable" | Every game page must ship FAQ data with at least 2 questions | Removing only the canned question is safe: every guide keeps at least 2 of its own. A page with 1 or 0 needs the check relaxed first |
| Shorter reskin pages, one compact How to play list | House rule: every game shows instructions, rules and a worked example from the "?" button. That help reads the same guide data as the page | The page may print less, but the data must keep the steps, rules and example, or the "?" opens empty. Phase 1 has to separate the two |
| Rewrite the guide copy | By two auditors' counts, 28 to 30 check scripts and 7 tests read guide sentences, mostly to confirm a guide states a true number from the code. The site search index is built from the guides. Sitemap dates follow each page's words | Every reworded sentence a check leans on gets its check updated in the same release. The search index is regenerated. About 133 pages are honestly re-dated on one day |
| A public contact email (line still blank) | One address, `douknowball1@gmail.com`, is pinned across privacy, terms, contact, about and the bug report relay. A second address fails | Keeping it costs nothing. A new one means five places and a backend redeploy |
| One game count from the registry, used everywhere | The home page's raw HTML is a fixed template, so its number is typed and rounded ("120+"). A check fails an exact count there on purpose, and passes any rounded number from 107+ to 132+ today | A rounded wording everywhere ("130+") costs nothing and passes today. The exact number everywhere needs the check changed, and it re-dates every saved page that prints it each time a game ships. The dated What's New entries stay as written |
| One trademark disclaimer per page | Legal rule: the long footer disclaimer is required and must not be removed or shortened | Fine, as long as the 5 short typed copies are the ones that go. Adding the AFL, NRL and WNBA makes it longer, which is allowed |
| One consent banner sitewide | Three checks and the privacy policy forbid loading Google's ad script before the site's own Accept, or on a page with no ad slot. Google's own message is shown by that script | Keep both as now, or you unpublish Google's message in AdSense, or the checks and the policy are rewritten together. Google's current rule has to be checked first |
| "No ad code beyond what already exists", next to new guide, family and reference pages | The number of page files that place the ad banner is pinned at exactly 80. No ad may sit on a noindex page | Every new kind of page is decided on purpose: without the banner (the count stays 80), or with it (the count moves, and that is a new ad placement) |
| Published, updated and "last verified" dates | Nothing worked out from a clock may go into a saved page | The dates are typed, recorded values, the way the 5 explainers already do it |
| Record pages name the source they were checked against | Every outside site the pages link to or load from needs a line in privacy section 4, or a check fails | A source link on a record page ships with its privacy line in the same release |
| Record pages get more text | The record page check fixes each H1 to the search phrase and makes every heading that could read as "all time" name the first year in the table | New lines follow the same year rule. The other lane's draft 843 edits this same check, so Phase 2 starts from that draft or replaces it. It cannot work beside it |
| Family hubs, and less repeated text on the sport hubs | Each sport hub must hold at least 700 readable words, no two hubs may be more than 22 percent alike, and every game on a hub must be a heading that holds its link | Moving text out of a hub, or adding hubs, stays inside those limits. Hub game names cannot come under a "no thin headings" target unless that check changes |
| Any page added, hidden or merged | The sitemap count is pinned at exactly 171. The check fails on more and on fewer | That number moves in the same release as the page |
| Reskin pages state pool size and era range | Any number printed on a page is worked out from the data files at build time, not typed. Some pools are only in the database (all 4 Perfect Season pools, 3 of the 5 Connections sets, 3 of the guessers, `/missing-xi`, 3 of the 4 chains) | Those need one read only count per table, under the one live pass per release rule set after the 2026-10-02 database outage. Otherwise those pages say less |
| Data pieces from play data | Same load rule. By the project's notes the completions table holds about 740,000 rows and the leaderboard function has hit the 3 second limit | The data is pulled once, into a file, and you see the queries first, as the brief asks |
| Record Books and guides in the main navigation | There is no header menu. The footer is the site's menu and it is on every page. The home page must keep its first game tile within the first 430 pixels on a phone, with at most 2 account asks above it | A header menu is a new feature, not a cleanup. It is your call (section 10) |
| About says how game data is sourced | The project's legal notes treat data sources as the one sensitive item and say not to make it worse | The sourcing wording needs your words or your yes |
| Read the master build spec and update it | By the history auditor's reading the new template belongs in spec sections 18, 21, 22, 23, 172, D45, D46, D47 and D140, plus the matching reconciliation rows and the "Adding a game" steps | Guides are edited in almost every release, so the template, the check and the spec change in the same release or pages drift back |

### 8d. What this host cannot do

| The brief asks for | What was measured | What a yes would mean |
|---|---|---|
| 301 redirects for renamed URLs | The host ignores redirect rules. On 2026-08-22 a 301 rule returned 200 with the home page | A moved address is a signpost page that answers 200 and forwards. 11 exist today. That is weaker than a 301 for a page that ranks. A real 301 needs a different host, or a paid service placed in front of the site that can answer for it. That is money |
| Unknown URLs return a real 404 | Two made up addresses on the live site both returned 200 with the home page (2026-10-08) | Today's stand in stays: a script marks a dead address noindex and shows a 404 page once scripts run. A real 404 needs the same host change |
| Remove the hosting badge | The host adds it after the build. The workspace is on the free plan. Whether the switch exists on that plan was not checked | Yours to try in the Lovable project settings. If it needs a paid plan, that is a money question |
| Analytics off until Accept, everywhere | The host adds its own visit counter after the build | Keep it and say so in the banner and the policy, or have the site strip it in the browser and lose the only numbers that count every visitor |

### 8e. Where the brief cannot be met as written

- **The Phase 5 target** ("no heading above fewer than about 25 words, no sentence on more than three pages") cannot be
  hit without breaking the brief's own hard rules. 86 of the thin headings are H1s over a short tagline, and an H1 may
  not change without asking. 117 are headings over link tiles such as "More games to play". The game names on the sport
  hubs are headings by a standing check. Some repeated sentences are the games' own on screen text ("Create your
  player", "Saves automatically"). "Yes" and "No" as FAQ openers will always repeat. A target the scripts can hold: zero
  sub headings over a single line in guide copy (1,906 in the guide files today, which the crawl sees as 1,761 on the
  saved game pages), and zero repeated sentences outside game text, FAQ openers and the footer (about 110 today).
- **"Do not change a title or H1" protects less than it seems to.** On 126 of the 133 game pages the H1 is already the
  plain game name. The keyword search title is the title tag, and it is printed a second time as an extra heading above
  the guide. That extra heading is neither a title tag nor an H1, so the hard rule does not cover it. Phase 1 could
  keep it or drop it (section 10). On the other 7 pages the search title is the H1 and stays. All 133 game descriptions
  also say "free" by a standing check. Nothing is proposed for the descriptions.

### 8f. The other lane

Codex holds paused, unaccepted, uncommitted drafts of 12 files in the main folder. By its own notes they are its rounds
842 (About and Contact), 843 (the record pages), 844 (hub and archive titles and descriptions) and 845 (the Higher or
Lower guides). They were read, not touched. Section 9 lists them phase by phase.

- **All ten Higher or Lower guides were drafted.** Eight sit in the uncommitted files. The soccer one and the NFL one
  are parked in git stashes in the same folder (work set aside in git, in no branch), next to an older stash of four
  guide files. There are 7 stashes in all and **no auditor read them**.
- **The drafts follow fixes 4 to 7 of the 2026-10-01 audit (8g), not this brief.** The eight guides go from 3,141 words
  to 5,491 (75% more). Facts from the game's own data are swapped for disclaimers: golf loses "Nicklaus 18, Woods 15,
  Hagen 11" and "61 players, everyone with at least 2 majors" and gains "Illustrative major counts only". Baseball
  loses Griffey 630 over Thome 612. As it stands the draft would also fail the heading check.
- The other drafts (hub titles, record pages, About, Contact) are in the table at the end of section 9. That folder
  is one game behind the live site (132 games, no `/cage-clash`).
- **What the other lane says today** (its notes of 2026-10-08, in the main folder, uncommitted): this brief was not
  pasted to it. It starts no Phase 1 to 4 work. Its drafts must not be shipped on its notes alone. It wants the split
  of files between the lanes proposed after you approve Phase 0.
- **It is still shipping new games in the September shape.** Round 1097, Soccer Perfect Season, is a fifth Perfect
  Season reskin, finished and waiting to merge. By its notes the guide is in the September heading shape: the heading
  check's count of guides in that shape goes from 131 to 132 with it.
- Two lanes already built one round twice by accident (Round 619).

### 8g. The audit of 2026-10-01 and its ten fixes

On 2026-10-01 an audit here rendered all 170 pages in a browser and ended with a ranked list of ten fixes. This brief
does not mention it. Where each one stands:

| # | Fix | Today |
|---|---|---|
| 1 | Give the drawn home page its words back | Live |
| 2 | Stop the leaderboard showing empty when it failed to load | Live |
| 3 | Make `/college-grid` and `/cbb-grid` show their board in one request (they took 13 to 18 seconds) | Claimed, no commit on record. Not measured again today |
| 4 | Deepen the short guides, family by family, starting with the 10 Higher or Lower pages | The other lane's paused drafts for that first family. Nothing for the rest. The opposite of this brief on length |
| 5 | Rewrite `/about` around who, how and why | The other lane's paused draft |
| 6 | Thin out the shared blocks on the record pages | The other lane's paused draft |
| 7 | Make hub and archive titles and descriptions page specific | The other lane's paused draft |
| 8 | Separate the shared paragraphs in the Gauntlet Draft, Conquest and My Career guides | No record |
| 9 | Stop `/fantasy-draft` showing "Could not load today's criteria" on a first visit | No record |
| 10 | Chase the occasional failures, and the fonts file that holds up the first paint | No record |

The same audit's line on indexing: more internal linking or more technical work "will not move the indexing numbers,
because none of those is broken".

### 8h. Where Google stands

- As far as the repo records, Google has not been asked to look since 2026-09-15. The last "no" is dated 2026-09-25.
- Three fixes went live after that "no": guides that vanished on addresses ending in a slash (live 2026-09-30), the
  leaderboard that wrongly showed empty (2026-10-01) and the home page that lost its copy once drawn (2026-10-02).
- Google's page report of 2026-09-20: 68 pages indexed, 94 not. Of the 94, 78 were "discovered, not indexed" (Google
  knows the address and has never fetched the page), 10 were "crawled, not indexed", 5 were redirects and 1 carries
  noindex on purpose. So most of the gap is pages Google has never fetched.
- The standing advice of 2026-10-01 was to wait until that indexed count has clearly risen from 68 before asking
  again, and that only you press the button.

## 9. Proposed plan per game family

Nothing here is decided. It is a proposal for you to mark up.

**The size of it.** Phase 1 is mostly a removal, not a rewrite of 114,321 words. Taking off the heading layer, the
keyword tails on the part titles and the canned FAQ removes about 22,194 words (19%). It rises to about 26,772 (23%) if
reskin pages stop printing the generic steps a family page would say once.

| Tier | What it means | Pages | Guide words today | Words removed (estimate) |
|---|---|---|---|---|
| A | Career, manager, front office and dynasty sims, flagship grids. Full treatment | 21 | 37,943 | 3,552 |
| B | A distinct game with rules of its own. Intro, one list, the rules a player could get wrong | 47 | 36,653 | 7,951 |
| C | A reskin of one mechanic. Short, and about its own data | 65 | 39,725 | 10,691 to 15,269 |

The two auditors who looked at tiers did not fully agree. Cutting purely by shared code gives A 23, B 42, C 68. The
copy auditor's proposal above moves 5 pages up to A (`/college-grid`, `/football-grid`, `/soccer-grid`, `/rebuild`,
`/aussie-rules-manager`) and 7 down to B (`/manager-hot-seat`, `/deadline-day`, `/wonderkid-factory`,
`/hall-of-champions`, `/idle-arena`, `/free-kick`, `/buzzer-beater`). The tables below use the copy auditor's version.

**Family pages: the proposal.** The brief wants one page per reskin family that explains the shared game once. None
exists. The copy auditor recommends one of two options:

- **8 family pages**, one for each family with five or more variants. The four small families (3 or 4 variants) get a
  section on a shared page or on a sport hub instead. This is what the Hub column below assumes.
- **1 page**, "How the games work", with a section per mechanic. One new address instead of eight.

Each family page can carry something no variant page has: a table of the variants built from the data files (what is
compared, pool size, era range, daily or not). The other options are 12 pages (one per family, which runs into the
Round 270 worry about thin hubs for the small families), 11 (families of four or more) or none.

### The 12 reskin families (Tier C)

"Words removed" is the upper estimate.

| Family | Pages | Hub | What its pages can honestly say that is their own | Words removed, of today's |
|---|---|---|---|---|
| Daily clue guessers | 11 | None today. Own page proposed | Each game's clue columns, which differ per game and are the real difference. Pools: Footle 557 players, UFC 90 fighters (1997 to 2026), Olympics 43 athletes, colleges 70, Guess the Year 50 puzzles (1972 to 2025), F1 drivers 20, F1 constructors 31. Three pools are only in the database | 2,623 of 6,478 |
| Higher or Lower | 10 | None today. Own page proposed | Pool size, the stat compared and the era range, all in local files: NBA 80 players (points 18,327 to 43,394), MLB 55 (home runs 399 to 762, 1914 to 2018), F1 42 (wins 8 to 105), tennis 44 (titles 4 to 24), golf 61 (majors 2 to 18), Aussie rules 60 (goals 511 to 1,360), college football 65, hockey 45, soccer 199 with three stats. The NFL page has no single pool: it rotates six stat lists (touchdowns 60, passing yards 34, passing touchdowns 34, rushing yards 31, receiving yards 31, receptions 30), 220 entries and 112 different players. Plus the closest matchups. Most of this is already in the intros | 2,239 of 5,481 |
| Grid | 7 (3 proposed Tier A, 4 Tier C) | None today, but 4 archive pages exist. Own page proposed | The team and achievement lists, the college grid's 75 stored puzzles, and from the archives how many players fit each square. The rarity score rule comes from the code | 514 of 2,630 (the 3 flagship), 957 of 2,704 (the other 4) |
| Connect 4 | 5 | None today. Own page proposed | The board is 7 by 6. Curated boards: NBA 9, MLB 6, NFL 6, NHL 6. Answers are checked by a validator that refuses when it cannot verify. Thin on countable facts, so these will be the shortest pages | 1,182 of 2,803 |
| Connections | 5 | None today. Own page proposed | Soccer 250 puzzles and baseball 60 in local files. The other three sets are mostly in the database. Sixteen names, four groups, four lives. Example groups can be quoted | 1,096 of 2,963 |
| Conquest | 5 | None today. Own page proposed | The maps: NFL 32 teams, MLB 30, soccer 96 clubs over 154 regions. 16 shared sentences get said once | 1,239 of 3,876 |
| Gauntlet Draft | 5 | None today. Own page proposed, and the strongest case for one | The pools: soccer 557 players, NBA 66, MLB 30 rosters and 390 players, NFL 32 teams, NHL 32 rosters and 416 players. 17 shared sentences get said once | 1,327 of 4,048 |
| Career Path guessers | 5 | None today. Own page proposed | Pools: soccer 253, baseball 60, hockey 60, NFL 78 (draft years 1957 to 2023), NBA 50. What each clue ladder reveals and in what order, which differs by sport | 1,138 of 2,721 |
| Chain | 4 | None today. Too small: a section elsewhere | What counts as a link on each page (teammate, beat, raced against). UFC has 62 fighters and 59 results (2003 to 2024) in a local file. The other three pools sit on the server | 918 of 2,246 |
| Missing starter | 4 | None today. Too small: a section elsewhere | Basketball 40 lineups and 130 names, baseball 30 and 253, football 40 and 370. Every lineup carries its competition, date, opponent, score and venue. Soccer's is in the database | 864 of 2,216 |
| Perfect Season | 4 (5 once Round 1097 merges, which would put it over the line for its own page) | None today. Too small today: a section elsewhere | Season length and picks already differ per page (17 games, 82 games and 6 picks, 162 games and 11 picks). NFL seasons 1999 to 2024. The player pools are in the database | 1,017 of 2,507 |
| Perfect Lineup | 3 | None today. Too small: a section elsewhere | Pools: NBA 66, F1 41, NHL 57, each entry with a team, an era and a rating | 669 of 1,682 |

### The other 12 families (Tier A and B)

None of these needs a family hub. They are not reskins.

| Family | Pages | Tier and why | What its pages can honestly say that is their own | Words removed, of today's |
|---|---|---|---|---|
| Soccer Career | 1 | A. The flagship and the brief's own standard | How the legacy score, the potential and decline curve and the award vote really work, all from the code | 137 of 2,409 |
| My Career (US sports) | 4 | A. Four career sims on one engine | Each sport's own progress, retirement and legacy rules. The 38 shared sentences get said once or reworded per sport | 818 of 9,570 |
| Club Manager engine | 3 | `/club-manager` A (deepest manager sim). `/manager-hot-seat` and `/deadline-day` B (short scenarios on the same engine) | The season score, board, transfer and finance rules. The two scenarios can be short and point at Club Manager | 163 of 3,726 (A), 332 of 2,929 (B) |
| Front Office | 4 | A. Four general manager sims | Each league's own cap or tax, draft and trade rules, which really differ | 732 of 6,602 |
| College Dynasty | 2 | A. Two dynasty sims | Recruiting, the portal, the schedule and the playoff format by sport. The guides are 20.1% alike, so the shared part gets said once | 249 of 2,088 |
| Fight sims | 3 | A. A fighter career, a gym and a promoter sim | Each sim's own rating, retirement, legacy and verdict rules | 529 of 4,506 |
| Tycoon and idle | 4 | `/stadium-tycoon` A (deepest builder, on your ranking list). The other 3 B | Stadium Tycoon's legacy points, capacity and tap value rules. Each idle game's own loop | 192 of 2,326 (A), 612 of 3,787 (B) |
| Arcade shots | 2 | B. Two skill games | The controls and scoring of each | 333 of 1,697 |
| Soccer squad builders | 12 | `/rebuild` A. The other 11 B. Different games on one player pool | Each game's own rules. `/build-your-xi` and `/fantasy-draft` keep their URL, title and H1 | 169 of 2,567 (A), 1,903 of 8,690 (B) |
| Secret player games | 5 | B. Different games on one mystery player helper | Each game's own rules | 840 of 2,982 |
| Champions quizzes | 2 | B. Two quizzes on one champions list | Each quiz's own rules | 357 of 1,471 |
| Standalone | 23 | `/aussie-rules-manager` A (a full season manager sim). The other 22 B | Code of its own, rules of its own | 49 of 1,519 (A), 3,574 of 15,097 (B) |

### The pages that are not games

| Pages | What the audit found | Proposal |
|---|---|---|
| 6 sport hubs | `/soccer` is the worst page for thin headings (39 of 51), but 36 of those are its game names, which a check requires to be headings. All six descriptions run past 160 characters (190 to 215). No breadcrumb data. The other lane's draft changes all six titles and descriptions | No rewrite proposed. Titles and H1s stay (your hard rule). The game name headings are left out of the Phase 5 target. Phase 2 links the reference pages from the hubs |
| 5 format history explainers | 2,062 to 3,900 words each, with sources and a "last checked" date printed. Only 4 or 5 pages link to each. On 2026-09-15 Google had found them and not fetched them | The copy is left alone. Phase 2 links them from the hubs and the Record Books index and uses them as the pattern for the record pages. A byline only after your name answer |
| `/world-cup-2026-results` | 4 pages link to it. No link back to the home page in its raw HTML | The same linking fix |
| 13 record pages and `/records` | The most alike pages on the site. Introductions and odd season notes are there. No date, no named source | Phase 2: a typed "last verified" date and a named source per page, the shared method paragraph and the cross link list moved to `/records` |
| 4 grid archives | 44 past boards each, with how many players fit each square. About 10,000 words of answers each. 19% to 25% of their sentence words repeat. No thin headings. Indexable on purpose. The other lane's draft changes their titles and descriptions | No copy work proposed. They stay indexable unless you say otherwise (section 10) |
| `/whats-new` | 44,224 words, 308 entries, indexable, with the second disclaimer | Your call: keep, trim or hide (section 10). Phase 3 removes the second disclaimer either way |
| `/leaderboard` | 477 words in raw HTML. The board itself is not in the raw HTML | Your call (section 10) |
| The 6 trust and legal pages | Section 4 | Phase 3 |

### Explainers the code can support (Phase 2)

The brief asks for six to ten pieces on how the deep games really work. The copy auditor read the functions and lists
these as writable from the code with nothing invented: the Soccer Career legacy score, its potential and decline curve,
its award vote, the Club Manager season score, the Front Office cap and trade rules, College Dynasty recruiting, the
fight sims' rating and verdict rules, and Stadium Tycoon's legacy points. Soccer Career alone supports three or four.
The function names and line numbers are in `family-plan.md` section 6.

### Proposed order of work

**Before anything:** your answers in section 10. Three of them block Phase 1: questions 6, 7 and 8 (the keyword
heading reversal, the family page choice, and what happens to the other lane's drafts). Every other question has a
default that is taken if you say nothing.

**Phase 1, game copy.** Touches the 133 guides, the one component that prints them, the site search index, about 30
checks and the sitemap dates. Leaves every URL, title and H1 alone.

1. A checks release first, before any copy. Replace the heading check and its stored copy of the guides with a check
   for the new shape. Separate what the "?" help shows from what the page prints. Relax the "at least 2 FAQs" rule
   only if you allow pages with one or none (question 11). From that release on, a new game ships in the new shape.
2. The mechanical removal: the heading layer, the keyword tails and the canned FAQ (one edit clears the three worst
   sentences from 133 pages).
3. Reskins by family, largest first (Daily clue guessers, Higher or Lower, Grid, then the 5 and 4 page families). Keep
   the sentences that are already specific. Add one data line worked out from each page's own file.
4. Rewrite only the four families that really repeat themselves: My Career US, Gauntlet Draft, Conquest, College Dynasty.
5. Fix the filler in the 7 page files and 6 board subtitles.
6. Tier B, then the light Tier A trims (the one bullet headings, and one mislabelled heading on `/soccer-career`). The
   eight pages on your ranking list go last unless you say otherwise.
7. Family pages, if you approved any.

**Phase 2, reference and editorial.** Touches the record pages, new guide pages, the sitemap generator's page list.

1. Get a dated Search Console reading first: have the 5 existing explainers and the hubs been crawled?
2. Record Books: add a typed "last verified" date and a named source to each of the 13 pages, with the privacy line a
   source link needs. Move the shared method paragraph and the cross link list to `/records`. The introductions and
   the notes on odd seasons are already there, so this is smaller than the brief expects.
3. Explainers written from the code, starting with Soccer Career. Bylines wait on your name answer. Each new kind of
   page ships without an ad banner unless you say otherwise.
4. Link the 10 existing reference pages from the hubs and the Record Books index (4 to 6 pages link to each today).
5. Data pieces only after one read of the play data, done once under the load rule, with the queries shown to you first.

**Phase 3, trust.** Touches About, Contact, Privacy, Terms, What's New, the footer, the home page template.

1. Delete the 5 short typed disclaimers and teach the footer check to catch them.
2. One game count wording everywhere. Leave the dated What's New entries alone.
3. Put the full disclaimer into the home page's static HTML and add the AFL, NRL and WNBA to it.
4. Privacy: name Google Fonts and flagcdn.com, add the visit counter to the line that already names the host, and say
   that Accept also starts Analytics.
5. About and Contact, only after your name answer and your facts.
6. Renames, only for the URLs you say yes to, as signposts, with the old names added to the banned names list.
7. Yours by hand: the hosting badge, the host counter decision, the Google message for Europe.

**Phase 4, technical.** Mostly done already, so it is small.

1. Sitemap: change nothing in how it works. New sections get added to its page list.
2. Close the three blind spots in the head tag checks. Add a check that fails on a new image file or image host.
3. Add a Home link to the footer (fixes the 17 pages with none). Add breadcrumb data where a real trail exists. Give the
   12 unlinked games a path in raw HTML. A header menu only if you want one.
4. Dead addresses and redirects stay as they are unless you choose a host change.
5. A 380 pixel phone pass on the top ten pages, once you name them. Nobody tests at 380 today (the checks use 390, 320
   and 430). The three open items of the 2026-10-01 audit (the two slow grids, the Fantasy Draft error line, the fonts
   file) belong here too.

**Phase 5, verify.** Rerun the same audit scripts for the before and after numbers, update the master spec in the same
release, write `ADSENSE_READINESS.md`. You press Request review, not an agent.

### The other lane's drafts, phase by phase, and how not to collide

| Phase | The other lane's unshipped file | The overlap |
|---|---|---|
| 1 | `baseball.ts`, `basketball.ts`, `college.ts`, `hockey.ts`, `moreSports.ts` (8 Higher or Lower guides), plus the soccer and NFL guides in stashes | Same lines, the other direction on length (longer, real numbers swapped for "illustrative" ones) |
| 2 | `records.ts`, `RecordPage.tsx`, the record page check | Same pages and the same check. Each record page gains a "how to read this table" paragraph and a short related list. No date and no source |
| 3 | `About.tsx`, `Contact.tsx` | Same pages. Still "over 100 games", still no name. About loses the "One person ... writes the game engines, checks the rosters" passage. Contact gains a what to include list |
| 2 and 4 | `sportHub.ts` (six hub titles and descriptions), `GridArchive.tsx` (26 lines, not read in detail) | The hub draft changes six title tags, which needs your yes under your own hard rule |

How to avoid a collision:

1. You decide the drafts' fate before Phase 1 starts (question 8): drop them, ship them first, or hand them over to be
   folded in. The answer has to cover the 7 stashes too.
2. One lane owns each set of files for the length of a phase, and the claim goes on the shared task board on the main
   branch before building. A claim made on a side branch is invisible to the other lane. That is how Round 619 was built
   twice. The other lane has asked for this split to be proposed once you approve Phase 0.
3. Each phase starts from a copy of the code cut after the other lane's work has landed or been dropped. Its folder is
   one game behind the live site today.
4. New games keep arriving. Until the checks release in Phase 1 step 1 is live, each new game adds one more guide in
   the old shape to convert (question 18).

## 10. What I need from you before Phase 1

Answer by number. A line each is enough. Questions 6, 7 and 8 block Phase 1. Questions 1 and 3 block the About page in
Phase 3. Everything else has a default in square brackets, and the default is what happens if you say nothing.

### The five lines the brief left empty

1. **Public name.** On 2026-09-01 you asked for your name to come off the site. The brief asks for it on About and on
   every guide. Which now: full name, first name only, or still no name ("the maker")? If a name goes up, do Terms and
   Privacy name you too? Today they say "an individual doing business as DoUKnowBall".
2. **Public email.** Keep `douknowball1@gmail.com` (no work), or a new one (five places and a backend redeploy)?
   [Default: keep it.]
3. **Two or three true facts for About.** Where you are based (the Terms already say Massachusetts law), which teams
   you follow, why you built it, and the start date you want shown. The site's own data disagrees on that date: About
   says early 2026, What's New says Spring 2026, the registry dates Footle 2025-01-01.
4. **Rename trademark style URLs: yes, no, or per URL?** The marks auditor's read, which is not legal advice: yes for
   the 5 Connect 4 pages and Sports Millionaire, your call on the 5 Connections pages, keep Footle and the 4 My Career
   pages, and keep `/ufc`, `/olympics` and the other league names in URLs. Say so if you want any of those looked at
   again, the Olympic one above all. No suggested new name was checked for other users of it. And do you accept that a
   rename on this host is a signpost page that answers 200, not a true redirect? [Default: no renames.]
5. **A Search Console "Pages" export.** The newest reading in the repo is dated 2026-09-20 (68 indexed, 94 not). A Bing
   Webmaster export would help more, because Bing sends two to three times Google's search visits. [Default: skip it
   and work from the 2026-09-20 reading.]

### The three that block Phase 1

6. **Keyword headings.** On 2026-09-19 you asked for keyword headings and sub headings on every game page. This brief
   removes them. Confirm the brief wins, so the check that enforces them can be rewritten?
7. **Family pages.** 8 pages (families of five or more, the proposal), 1 page ("How the games work"), 12, 11, or none?
   Each one is a new indexable address.
8. **The reskin guides and the other lane's drafts.** Two written directions exist: shorter and about the page's own
   data (this brief), or longer (the 2026-10-01 audit, which the other lane's drafts follow). Which one? And the
   drafts themselves (ten Higher or Lower guides, six hub titles, About, Contact, the record pages, 7 stashes nobody
   has read): drop them, ship them first, or fold them into this work?

### Choices with a default

9. Flagship grids for the full treatment: `/college-grid`, `/football-grid` and `/soccer-grid`, with the NBA, MLB,
   hockey and college basketball grids as short pages? [Default: yes, as proposed.]
10. Other tier calls: `/stadium-tycoon`, `/rebuild`, `/aussie-rules-manager` and the 3 fight sims as Tier A.
    `/manager-hot-seat`, `/deadline-day`, `/wonderkid-factory`, `/hall-of-champions`, `/idle-arena`, `/free-kick` and
    `/buzzer-beater` as Tier B. [Default: yes, as proposed.]
11. Is a game page with one FAQ or none acceptable? It also removes that page's FAQ data for Google. [Default: no. Only
    the canned question goes, and every page keeps at least 2 questions of its own.]
12. May a reskin page stop printing its how to play steps and point at a family page, with the "?" help in the game
    still showing them? [Default: no. Every page keeps a short printed list.]
13. The four US My Career guides share 38 sentences. Say the shared part once on a page all four link to, or keep four
    full guides and reword the shared part per sport? [Default: reword per sport, which is also fix 8 of the
    2026-10-01 audit.]
14. May Phase 1 run one read only count per database table for the pools that are not in the repo? [Default: no. Those
    pages will not state a pool size.]
15. May the Phase 5 target leave out H1 taglines, "More games to play" style headings, the game names on the sport
    hubs, the games' own on screen text and "Yes" and "No" as FAQ openers? Your hard rules or a standing check keep
    each of them as they are. [Default: yes, they are left out.]
16. The extra heading that repeats the title tag above the guide on 126 game pages: keep it or drop it? Your hard rule
    does not cover it. [Default: keep it.]
17. The eight pages on your ranking list, plus `/perfect-season-nba`, `/dart-draft` and `/budget-builder` from the
    recorded top ten: do they lose the heading layer with everything else, last, or not at all? `/soccer-career` alone
    is 16 percent of pageviews, and the headings were added for search. [Default: last, after the other pages are live.]
18. While Phase 1 waits for your answers, do new games keep shipping in the old heading shape, and do new reskins
    keep shipping at all? One is waiting to merge now. [Default: nothing changes for the other lane until you say.]
19. Do new guide, family and reference pages carry an ad banner? [Default: no. The count stays at 80.]
20. Game count: one rounded wording such as "130+" everywhere, or the exact number everywhere (133 today)? The
    rounded one passes today's check. The exact one needs the check changed, and every saved page that prints it gets
    a new sitemap date each time a game ships. [Default: "130+" everywhere, dated What's New entries untouched.]
21. OK to add the AFL, the NRL and the WNBA to the footer disclaimer, and to put the same sentence into the home page's
    static HTML? Nothing is shortened. [Default: yes.]
22. Do you want a real header menu (sports, Record Books, guides) on every page? There is none today, only the footer.
    [Default: no menu. A Home link is added to the footer.]
23. Do you want a hub or an all games page for the 39 games in sports with no hub? Today the only full list in raw
    HTML is on the hidden `/search` page. [Default: no new hub. The 12 unlinked games get a link from an existing page.]
24. If any names change, should the master spec change with them, and should a future WNBA version take the new name?
    [Default: yes to both.]

### Lists you asked to see before anything is hidden, merged or deleted

The default for all four is that nothing changes.

25. The 5 retired games that still answer (`/football-timeline`, `/guess-nfl-team`, `/shirt-number`,
    `/higher-lower-transfers`, `/pack-battle`): keep them hidden as now, or turn each into a "this page moved" signpost?
    Pointing where?
26. `/leaderboard` and the 4 grid archives: keep them indexable, or treat them like `/search`? Your 2026-08-29
    directive says archive and answer pages are wanted.
27. `/whats-new` is 44,224 words of changelog and is indexable. Keep it, trim what is public, or noindex it?
28. Is `/world-cup-bracket` a keeper in this overhaul? And is the standalone `/wonderkid-factory` route still due to retire?

### Things only you can do or know

29. ads.txt: confirm we leave the file as it is. And when you are next in AdSense, does the ads.txt row say
    "Authorized" or "Not found"?
30. Can you switch off the "Edit with Lovable" badge in the Lovable project settings? If it needs a paid plan, is that
    spend approved?
31. The host's own visit counter runs without consent. Keep it and add it to the banner wording and to the privacy
    line that already names the host, or have the site strip it and lose the only numbers that count every visitor?
32. Europe: keep both the site's banner and the Google message in your AdSense account, or pick one? Picking Google's
    means changing what the privacy policy promises.
33. What may About say about where the game data comes from? The project's legal notes treat data sources as the
    sensitive item.
34. A real 404 and a real 301 need a different host, or a paid service in front of this one. Is that on the table, or
    do we keep today's handling?
35. Did you press Request review after 2026-09-25, or does the AdSense card still show that date?
36. Which ten pages count as the top ten for the phone test? Paste the export, or say we may read the Lovable analytics.
37. Still open from before: two files under `docs/research/` name competitors in the public repo. Delete them or keep
    them out of the repo? Note that this audit's own files on names (`marks.md` and the two `marks` data files under
    `docs/audits/`) also spell out the games and shows they checked for. They sit under `docs/` where that is allowed,
    but they are in the public repo too. Say if you want them kept out.

## Where the data is

Everything below is under `docs/audits/ad-readiness-2026-10-08/` unless a path says otherwise. Every script only reads.
None is picked up by the test runner. All of it is committed on the side branch `ad-readiness` and nowhere else.

| File | What it is |
|---|---|
| `OWNER-BRIEF.md` | Your brief, saved word for word |
| `routes.json` | Every route (194) with its type, family, sitemap row, saved page facts and who links to it, plus 18 named lists |
| `crawl.json` | The crawl of 192 addresses on the Release AK build: title, description, canonical, H1, word count, headings, main text |
| `crawl-branch-files.json` | The same crawl read off the Release AL saved pages on disk |
| `duplicates.json` | Every sentence on more than three pages, every thin heading, and the share per page (Release AK) |
| `duplicates-branch-files.json` | The same for Release AL |
| `copy-by-game.json` | Each of the 133 guides measured: words, headings, FAQ, likeness to its siblings, proposed tier, estimated cut |
| `copy-tiers.json` | The proposed tier for every family, with the reason and 8 single page exceptions |
| `copy-data-sources.json` | What data each of the 68 reskin pages reaches: local files counted, database tables named |
| `copy-filler-phrases.json` | Where the banned filler phrases sit |
| `family-plan.md` | The copy plan per family in full, with the function names an explainer can be written from |
| `history.json` | The four rejections, Search Console readings, traffic readings, 29 recovery rounds, 21 checks the brief runs into, your 16 decisions on record, the spec sections Phase 5 would change |
| `marks.md` | Logos and names in full: every image, the 12 named pages, the cost of a rename, a suggested name per URL |
| `marks-scan.json`, `marks-patterns.json` | The page by page name scan of 192 saved documents, and the list of names it looks for |
| `trust-lists.md` | Every game count, every footer, disclaimer and consent component with file and line, and ads.txt |
| `trust-game-counts.json` | Every hit for a game count in the source |
| `trust-raw-footer.json` | Footer, disclaimer and banner text counts in the raw HTML of 192 documents |
| `trust-browser-walk.json` | 17 pages walked in a real browser with every outside request counted |
| `tech-scan.json` | Head tags, links and structured data for the 171 sitemap pages |
| `notes-routes.md`, `notes-crawl.md`, `notes-trust.md`, `notes-tech.md`, `notes-marks.md`, `notes-copy.md`, `notes-history.md` | Each auditor's working notes |
| `notes-factcheck.md`, `notes-complete.md` | The two checkers' notes on the first draft of this report: what reproduced, what was corrected, what was missing |
| `notes-writer.md` | The writer's notes, including how disagreements between auditors were settled |

| Script | What it does |
|---|---|
| `scripts/auditRoutes.mjs` | Reads the router, the registry, the sitemap and the saved pages. Writes `routes.json` |
| `scripts/auditCrawl.mjs` | The crawl. Add `--files` to read a branch's saved pages off disk before it is built |
| `scripts/auditDuplicateCopy.mjs` | Repeated sentences and thin headings |
| `copy-measure.mjs` | Measures the guide files. Writes `copy-by-game.json` |
| `copy-data-sources.mjs` | Traces what data each reskin page reaches |
| `copy-other-lane-drafts.mjs` | Measures the other lane's uncommitted guide drafts, read only |
| `marks-scan.mjs`, `marks-report.mjs` | The name scan and its tables |
| `trust-scan-counts.mjs`, `trust-raw-footer.mjs`, `trust-browser-walk.mjs` | The game count scan, the raw footer count and the browser walk |
| `tech-scan.mjs`, `tech-report.mjs` | The head tag, link and structured data scan and its report |

The fact checker's own recount scripts ran from a temporary folder and are not in the repo.

### What nobody rechecked

- **Seen once on the live site and not loaded again** (six loads were the limit): the live home page at 41,421 bytes
  with the badge in it, the host's visit counter, the two made up addresses answering 200, the live ads.txt, and the
  live sitemap being the same file as the build.
- **Seen once in a browser and not walked again:** the 17 page walk (the request counts before and after Accept,
  Google Fonts on 17 of 17, never more than one footer). The code agrees with it: one banner drawn once, Analytics
  held back until the stored choice is "accepted", the fonts file loaded with no condition.
- **Taken from one auditor or from the project's notes, not recounted:** the 28 to 30 checks and 7 tests that read
  guide sentences, the 740,000 rows, the 30 files that draw shapes, the 37 of 65 reskin intros with a number, the badge
  on seven other pages on 2026-09-15, the list of spec sections.
- **Not read:** the other lane's 7 stashes, and its `GridArchive.tsx` draft in detail.
- **Not checked at all:** Google's current rule on consent platforms. Whether the badge can be switched off on the
  free Lovable plan. Any traffic or Search Console reading after 2026-09-20. Whether the games themselves play well,
  including the three open items of the 2026-10-01 audit. Whether any suggested new name is free to use.
- **Not settled:** the crawl counts 36 My Career sentences on all four saved pages and the guide files give 30.
  `/footle` is listed as not indexed on 2026-09-03 and as indexed on 2026-09-15.

Phase 0 stops here. Nothing moves until you answer.
