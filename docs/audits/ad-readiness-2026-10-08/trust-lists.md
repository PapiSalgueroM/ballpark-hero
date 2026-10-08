# Trust area lists (Phase 0, items 4 and 7)

Read on branch ad-readiness (Release AL, head d070adb0) on 2026-10-08. The browser walk ran against the build that
is live (Release AK) at localhost:4190. Nothing in src, public or scripts was changed.

## List 1. Every place a count of games is said

The registry holds 133 games today (scripts/simHomeCopy.mjs, run green: "registry says 133 games, 36 of them soccer,
across 13 categories"). The one source of truth already exists: src/data/gameRegistry.ts line 345
`TOTAL_GAMES = ALL_GAMES.length` and line 346 `GAME_COUNT_LABEL`, the count rounded down to a ten with a plus, so "130+".

### Computed from the registry (always right)

| Where | What it says today |
|---|---|
| src/pages/Index.tsx:281, home hero, drawn by React only | "130+ free games across every sport. All playable without an account." |
| src/pages/Index.tsx:466, home sport sections | "(36 games)", "(11 games)" and so on, one per category |
| src/pages/NotFound.tsx:63, the page for a dead address | "See all 130+ games" |
| src/pages/Search.tsx:168, /search | "All 133 of them." (saved page says the same) |
| src/components/hub/HubExperience.tsx:82 and :88, the six sport hubs | "All 36 of them in one place", "36 games" (soccer 36, pro basketball 17, hockey 12, pro football 11, baseball 11, college 7) |
| src/components/game/GameNavbar.tsx:165, signed in chip | "played today / 133" |

### Typed by hand (can go stale)

| Where | What it says today | Guarded by |
|---|---|---|
| index.html:20, :176, :177 (description, og:description, twitter:description) and src/pages/Index.tsx:222 | "120+ free sports games, from a Soccer Career sim and Club Manager to ..." | simHomeCopy part 4b: the two strings must match, the floor must be under the real count and no more than 20 percent behind |
| src/data/homeCopy.ts:80, written into index.html:266 by scripts/genHomeCopy.mjs, and drawn again by React in the home About section | "120+ free sports games in the browser: ..." | simHomeCopy parts 2 and 6 |
| src/pages/About.tsx:10 (meta description, which also becomes the page's JSON-LD description) | "over 100 free sports trivia games" | nothing |
| src/pages/About.tsx:26 (body) | "Over 100 games covering soccer, pro football, ..." and "eleven sports" at :33 (the registry has 12 sports plus a world category; Aussie Rules is missing from the list) | nothing |
| src/pages/Footle.tsx:484 (meta description of /footle) | "One of 100+ free sports games on DoUKnowBall." | nothing |
| public/llms.txt:3 | "a free sports trivia and puzzle site with 100+ games" | nothing |
| src/pages/WhatsNew.tsx:390 (Spring 2026 entry) | "It has grown to eleven sports and over 100 games since" | nothing |
| src/pages/WhatsNew.tsx:265, :239, :238, :224, :205 (dated changelog entries) | "There are 113 games here", "all 127 games", "all 120 of them", "100+ free games", "all 126 of them". Each was true the week it was written. | nothing, and they are history, so they should stay as written |

### What one visitor can read today

120+ (home description, home static copy), 130+ (home hero and the dead address page), 133 (search), over 100 (About,
twice, plus its description and JSON-LD; What's New), 100+ (Footle description, llms.txt, What's New), 113, 120, 126,
127 (dated What's New entries). The home page itself, once drawn, says "130+ free games" at the top and "120+ free
sports games" lower down (browser walk, trust-browser-walk.json, row "/").

Machine list with every hit: trust-game-counts.json (made by trust-scan-counts.mjs; the source list in it also holds
season lengths and badge thresholds that are not site counts, the tables above are the cleaned list).

## List 2. Footer and disclaimer components

| Component | File | Where it renders |
|---|---|---|
| The global footer: long disclaimer, six hub links, Search, About, Contact, What's New, Record Books, Leaderboard, Privacy, Terms, Accessibility, Cookie choices, theme, Report a bug | src/components/game/Footer.tsx | Once, src/App.tsx:565, under every route. scripts/simSingleFooter.mjs fails if any other file renders or imports it. |
| An older short disclaimer with its own Privacy and Terms links, typed into the page | src/pages/About.tsx:97 to 104, src/pages/Contact.tsx:57 to 64, src/pages/PrivacyPolicy.tsx:131 to 134, src/pages/TermsOfService.tsx:115, src/pages/WhatsNew.tsx:402 | The bottom of those five pages, directly above the global footer. No fence sees it. |
| The legal clause itself | src/pages/TermsOfService.tsx:55 to 57 (Section 5) | /terms only. This one belongs there. |

Measured (trust-raw-footer.json, 192 saved pages; trust-browser-walk.json, 17 pages in a browser):

| | Raw saved HTML | After the app has drawn |
|---|---|---|
| footer elements | 0 on every page (the saved page keeps the footer's words in a plain block) | 1 on all 17, and never more than 1 at any sampled moment |
| disclaimer sentence | once on 172 pages; twice on /about, /contact, /privacy, /whats-new; three times on /terms; none on 15 (the home page template, /profile, two admin pages, 11 retired or redirect stubs) | 1 on game, hub, record, search, leaderboard and dead address pages; 2 on /about, /contact, /privacy, /whats-new; 3 on /terms |
| saved block and drawn footer on screen together | not applicable | never (0 of 17) |

## List 3. Cookie and consent components

| Thing | File | Notes |
|---|---|---|
| The one banner | src/components/CookieConsent.tsx, mounted once at src/App.tsx:316 | Words: "Ads and analytics only run if you press Accept. Essential only keeps them off and every game works the same. Learn more", buttons "Essential only" and "Accept". Two layouts of the same component: a bar fixed to the foot of the screen, or a card inside an open How to Play dialog (src/components/game/RulesGate.tsx:91, HowToPlayPopover.tsx:80). |
| The way back to it | src/components/game/Footer.tsx:13 to 16 and :100 to 106, "Cookie choices" | Clears the stored answer and reloads. |
| Analytics loader | index.html:122 to 141 and src/lib/consentedScripts.ts:46 to 63 | Runs only when the stored answer is "accepted". |
| Ad loader | src/lib/consentedScripts.ts:24 to 44, src/components/ads/AdBanner.tsx:115 and :161 | Only after Accept, only on a page with a real ad slot, never on a noindex page, non personalized flag set first. |
| A second consent system that is NOT code | the AdSense account, Privacy and messaging | A Google "European regulations message" for douknowball.com has been published since 2026-02-11 (docs/adsense/reapply-readiness.md:325, console-check-2026-09-15.md:65). Google's script shows it, and that script only loads after the site's own Accept. |
| Host analytics that no banner gates | injected by the host into the live HTML, not in the repo | `<script defer src="/~flock.js" data-proxy-url="/~api/analytics">` seen in the one live GET of the home page. |

Requests counted in the browser walk (every outside request aborted and counted): before any choice, 0 to analytics
hosts and 0 to ad hosts on 17 of 17 pages. After Accept, 17 analytics requests (one a page) and 4 ad requests (the
four pages with a slot). After "Essential only" and a reload (2 pages), 0 and 0. Requests that DO go out before any
choice: fonts.googleapis.com on every page, flagcdn.com where flags show, and the database.

## Item 7. ads.txt

public/ads.txt exists and holds one line and a line ending, nothing else:

    google.com, pub-2929318086316376, DIRECT, f08c47fec0942fa0

The brief's line ends `fa8`. The file ends `fa0`. The file is the correct one (it is Google's published id, the
AdSense console shows the file as Authorized, and docs/PROJECT-STATE.md:12805 records the same line). The live site
answered one GET of /ads.txt with 200, text/plain, 59 bytes, the same line.
