# notes-trust (Phase 0 audit, trust area). Rewritten after every step.

Worktree: C:/Users/antho/ballpark-hero/.claude/worktrees/adready, branch ad-readiness (Release AL head d070adb0).
Live build (Release AK) served at http://localhost:4190.

## Step log

- [done] Read OWNER-BRIEF.md.
- [done] (a) game counts. Script: trust-scan-counts.mjs, data: trust-game-counts.json.
- [done] (b) footers and disclaimers. Raw: trust-raw-footer.mjs -> trust-raw-footer.json (192 saved pages). Browser: trust-browser-walk.mjs -> trust-browser-walk.json (17 pages walked on localhost:4190, all batches finished, do not rerun).
- [done] (c) consent: component read, browser requests counted (same walk), simAdsense and simLegalPages read, no other loader in src.
- [done] (d) About and Contact read (worktree AL) plus the other lane's uncommitted drafts in the root checkout (read only, git diff).
- [done] (e) privacy policy read against the brief list.
- [done] (f) ads.txt: file, git blob, local server, and the ONE live GET (spent, do not repeat).
- [done] (g) hosting badge: the ONE live GET of https://douknowball.com/ (spent, do not repeat). Saved in the scratchpad as live_home.html.
- [done] trust-lists.md written: the three lists the brief asks for (counts, footers and disclaimers, consent) plus ads.txt, cleaned for a reader.
- [todo] final: send the StructuredOutput report. No more live fetches are allowed (both GETs are spent). All data files exist; a restart only needs to send the report from these notes and trust-lists.md.
- simHomeCopy floor rule (scripts/simHomeCopy.mjs:373-377): a typed floor fails if it is at or over the real count, or more than max(15, 20 percent) behind it. At 133 games "120+" passes and would keep passing until about 150, which is why the template can say 120+ while React says 130+.
- The template says on purpose that static copy uses rounded floors, "because the exact ones change most weeks" (index.html:226-239). An exact count typed or generated into saved pages would rewrite them every time a game ships.

## (a) Game counts: facts so far

- Registry: src/data/gameRegistry.ts:342 to 346. ALL_GAMES = CATEGORIES.flatMap, TOTAL_GAMES = ALL_GAMES.length,
  GAME_COUNT_LABEL = floor(TOTAL/10)*10 + "+". simHomeCopy run on the worktree: "registry says 133 games, 36 of
  them soccer, across 13 categories", green, exit 0. So TOTAL_GAMES = 133 and GAME_COUNT_LABEL = "130+".
- COMPUTED from the registry:
  - src/pages/Index.tsx:281 hero line "{GAME_COUNT_LABEL} free games across every sport. All playable without an account." (130+ today; React only, not in the template)
  - src/pages/Index.tsx:466 per category "(N games)"
  - src/pages/NotFound.tsx:63 "See all {GAME_COUNT_LABEL} games" (130+)
  - src/pages/Search.tsx:168 "All {TOTAL_GAMES} of them." (133; saved page public/search/index.html says "All 133 of them")
  - src/components/hub/HubExperience.tsx:82 and :88 "All {games.length} of them in one place", "N games" (hubs: soccer 36, pro-basketball 17, hockey 12, pro-football 11, baseball 11, college 7 in the saved pages)
  - src/components/game/GameNavbar.tsx:165 "{gamesPlayedToday}/{totalGames}" (signed in stat chip)
- TYPED by hand:
  - index.html:20, :176, :177 meta description, og:description, twitter:description "120+ free sports games, from a Soccer Career sim ..." and src/pages/Index.tsx:222 the same string (held equal by simHomeCopy part 4b, floor rule: under the real count and no more than max(15, 20 percent) behind)
  - src/data/homeCopy.ts:80 "120+ free sports games in the browser: ..." which genHomeCopy writes into index.html:266 (simHomeCopy parts 2 and 6)
  - src/pages/About.tsx:10 meta description "over 100 free sports trivia games" and :26 body "Over 100 games covering ..."
  - src/pages/Footle.tsx:484 meta description "... One of 100+ free sports games" (check exact wording)
  - src/pages/WhatsNew.tsx:390 launch entry "over 100 games since"; dated changelog entries that quote the count of their day: :265 "There are 113 games here", :239 "all 127 games", :238 "all 120 of them", :205 "all 126 of them", :224 "100+ free games"
- Live build AK (localhost:4190): / says 120+, /about "Over 100 games", /search "All 133 of them", /footle "100+ free sports games", /whats-new 113 and 100+.
- So the brief's "120+, 113, over 100" is right in kind. Today's full set on the same site: 120+, 130+, 133, over 100, 100+, 113 (dated entry), 127/126/120 (dated entries).
- The home page AFTER React mounts says both 130+ (hero, computed) and 120+ (About section from homeCopy, typed) on one page. PROVEN in the browser walk: mounted home text carries "130+ free games" and "120+ free sports games".
- /search is already noindex, follow when mounted; the 404 fallback is noindex and says "See all 130+ games".

## (b) Footers and disclaimers: facts

- ONE footer component: src/components/game/Footer.tsx, rendered once at src/App.tsx:565 (inside Suspense, after the routes). scripts/simSingleFooter.mjs (Round 313, 2026-08-28) fails if any other file renders or imports it. Owner screenshotted the doubled footer on 2026-08-28; fixed that round.
- Its disclaimer (Footer.tsx:25) is the long one naming UEFA and the leagues plus "independent fan project". CLAUDE.md legal rule: required, must not be removed or shortened.
- A SECOND, older, shorter trademark disclaimer is typed inline at the bottom of five pages, each with its own Privacy and Terms links: src/pages/About.tsx:97-104, Contact.tsx:57-64, PrivacyPolicy.tsx:132, TermsOfService.tsx:115, WhatsNew.tsx:402. Text: "All team names, logos and trademarks are property of their respective owners. DoUKnowBall is not affiliated with the NFL, NBA, UFC, NHL, MLB, FIFA, IOC, NCAA, F1, PGA Tour, NASCAR, ATP or WTA. (c) 2026 DoUKnowBall". No fence covers it (simSingleFooter matches the Footer tag only).
- Terms also has the real legal clause in section 5 (TermsOfService.tsx:55-57), which is a third occurrence there and is legitimate.
- Raw saved pages (192): 0 footer tags anywhere (the prerenderer rebuilds the body as text, the footer arrives as a div data-site-chrome). Disclaimer sentence: once on 172, twice on /about /contact /privacy /whats-new, three times on /terms, zero on 15 (/ the home template, /admin/login, /admin/reports, /profile, and 11 retired or redirect stubs).
- The home page's raw HTML (index.html) has NO trademark disclaimer and no footer row; the mounted home has both.
- The consent banner sentence is baked into the raw text of 159 of 192 saved pages as a plain paragraph ("Ads and analytics only run if you press Accept. ...").
- Browser walk, 17 pages (/, /about, /contact, /privacy, /terms, /whats-new, /soccer-career, /golf-higher-lower, /footle, /soccer, /records, /records/nba-champions, /search, /leaderboard, /this-page-does-not-exist, /club-manager, /college-grid): the most footer elements that ever existed at any sampled moment was 1 on every page; the saved block and a React footer never coexisted (snap+footer false on all 17). Mounted disclaimers: 1 everywhere except /about 2, /contact 2, /privacy 2, /whats-new 2, /terms 3. h1 = 1 on all 17.
- Timeline shape (About): saved block at 9 ms, EMPTY root from 96 ms (0 h1), banner at 105 ms, route and footer at 166 ms.

## (f) ads.txt: facts

- public/ads.txt exists. Git blob: 59 bytes, one line "google.com, pub-2929318086316376, DIRECT, f08c47fec0942fa0" plus one LF. Working copy on this Windows machine has CRLF (60 bytes), nothing else in the file.
- THE BRIEF'S LINE ENDS fa8, THE FILE ENDS fa0. od of OWNER-BRIEF.md line 45 shows "f08c47fec0942fa8". So the file is NOT byte for byte the brief's line, by one character, and the file is the right one: f08c47fec0942fa0 is Google's published certification authority id, docs/PROJECT-STATE.md:12805 records the same line, and the AdSense console shows ads.txt "Authorized" (docs/adsense/reapply-readiness.md:323). Do not change the file to match the brief.
- Live, ONE GET of https://douknowball.com/ads.txt on 2026-10-08: 200, text/plain; charset=utf-8, 59 bytes, exactly the git blob (fa0 plus LF).
- scripts/simAdsense.mjs section 3 checks the file is present, google.com, a well formed pub id, DIRECT or RESELLER, and section 1 holds the pub id equal across index.html, ads.txt, AdBanner and consentedScripts. It does not pin the fourth field.

## (g) Hosting badge: facts

- ONE GET of https://douknowball.com/ on 2026-10-08: 200, 41,421 bytes, 725 lines. Local copy of the same build: 32,200 bytes, 470 lines. diff shows exactly two hunks: (1) the head: different asset file names, plus an injected <style> block for #lovable-badge (live lines 209-391) and <script defer src="/~flock.js" data-proxy-url="/~api/analytics"> (line 392); (2) before </body>: <aside id="lovable-badge" aria-label="Edit with Lovable"> with a link to https://lovable.dev/projects/lovp_...?utm_source=lovable-badge (rel noopener nofollow), the words "Edit with", a logo svg, a Dismiss button and a script. Nothing else differs.
- So the badge IS in the HTML the host serves to a crawler that runs no JavaScript. The brief is right that it is a hosting setting.
- What the repo does about it: index.html:92-121 (owner instruction 2026-08-05) a MutationObserver removes any element whose id or class contains "lovable" the moment it appears. That works only where JavaScript runs. The repo cannot take the markup out of the served HTML: it is added after the build by the host.
- docs/PROJECT-STATE.md:7417 (2026-09-15) records the same aside#lovable-badge on seven other live routes, so it is not only the home page.
- CLAUDE.md: the Lovable workspace is on the free plan with 0 credits. Whether the free plan can switch the badge off is an owner question (project settings), not checked.

## (d) About and Contact: facts

- About (src/pages/About.tsx, 748 words in the saved page): h1 "About DoUKnowBall"; sections What this site is / How it started / Who makes this / What we care about / Real records and simulated seasons / The games / A note from the maker / Say hi. Names NOBODY: "One person ... a lifelong sports fan", email douknowball1@gmail.com. Started "early 2026" (What's New says "Spring 2026"). Says "Over 100 games" and "eleven sports" (typed). Funding: "Advertising can help cover hosting and development costs". Corrections: Report a bug button. Data: "Trivia uses real sporting records", Record Books pages explain how tables were checked; no sources named.
- OWNER DECISION 2026-09-01, Round 382 (PROJECT-STATE.md:15392): "the note from the maker shouldnt say my name". His name was then removed from src entirely, and scripts/simNoInventedQuotes.mjs lost its exemption (lines 367-380): a real name handing over to a first person sentence fails in ANY file, and "Anthony" is a surname in the roster set. The brief now asks for the owner name on About and on bylines, and the name line is unfilled.
- Voice is mixed: "we/us", third person ("goes straight to him"), and a first person maker note. Marketing lines present ("If you know ball, something here will humble you", "No two-second gimmicks").
- Contact (src/pages/Contact.tsx, 349 words): h1 "Contact"; Email us (douknowball1@gmail.com) / Spotted a bug or a wrong answer (Report a bug in the footer) / Game ideas and feedback / Privacy and data requests (30 days). No name, no postal address, no form on the page itself.
- simLegalPages section 3: ONE address, douknowball1@gmail.com, must be in privacy, terms, contact, about and the report relay edge function, and any second gmail address fails. A different public email means all five plus a redeploy of the relay.
- Terms name "an individual doing business as DoUKnowBall" and Massachusetts law (simLegalPages section 2 pins both). That is the only "where" on the site.
- OTHER LANE: the root checkout holds uncommitted rewrites of About.tsx (+15 -9... 28 lines changed across both) and Contact.tsx. They still say "over 100 games", still name nobody, add a reporting checklist and a save problem section to Contact. A Phase 3 rewrite collides with them.

## (e) Privacy policy: facts

- src/pages/PrivacyPolicy.tsx, "Last updated: September 15, 2026", 12 sections, 2,348 words saved.
- Advertising cookies: Sections 2 and 5. Third party vendors including Google: Section 4 (Supabase, Google Sign-In if on, AdSense, Analytics, Hosting (Lovable and ChatGPT Sites), FormSubmit, Gemini, Wikipedia) and Section 5 bullet 1 word for word Google's required sentence. Opt out: Google Ads Settings, aboutads.info/choices, youronlinechoices.eu, the GA opt out add-on, and the footer Cookie choices link. Browser storage: Section 1 bullet 1 and 3 (local storage saves, the random leaderboard handle) and Section 2.
- Gaps: Google Fonts and flagcdn.com not named; the host's own analytics script not named; Section 2 paragraph 2 says Accept loads the advertising script and does not say it also starts Google Analytics (Sections 4 and 10 do); no named operator or postal address (email only); storage is described in general, no list of what is kept.
- Its own second disclaimer at line 132 (see b).

## (c) Consent: facts so far

- ONE consent component: src/components/CookieConsent.tsx, mounted once at src/App.tsx:316. Wording (line 141): "Ads and analytics only run if you press Accept. Essential only keeps them off and every game works the same. Learn more" with buttons Essential only / Accept. Same text on all 17 walked pages.
- It has TWO LAYOUTS, which is probably what the brief saw as two banners: a fixed bar at the foot of the screen, or, when a How to Play dialog is open (RulesGate.tsx:91, HowToPlayPopover.tsx:80 carry data-dukb-help-cookie-choices), the same component portalled INSIDE the dialog as a bordered card. /footle opened with the banner inside the dialog (the only one of the 17). Never two at once (max regions 1 on all 17). Totals over the 17 pages: before any choice analytics 0, ads 0; after Accept analytics 17, ads 4; reload with accepted stored analytics 17, ads 4. /search saved page already carries noindex, follow and is not in the sitemap.
- Stored answer: localStorage 'cookie-consent' = 'accepted' or 'essential'. Footer "Cookie choices" button clears it and reloads (Footer.tsx:13-16).
- Analytics: index.html:122-141 loads gtag only if the stored answer is 'accepted'; src/lib/consentedScripts.ts loadAnalytics on Accept. Ads: consentedScripts.ts loadAdSense only when a deliberate slot exists and the page is not noindex; AdBanner.tsx:115 and :161 render nothing unless 'accepted'; requestNonPersonalizedAds = 1.
- No fence covers typed counts outside the home page: public/llms.txt:3 also says "100+ games" (typed).
- TWO CONSENT SYSTEMS EXIST, one in code and one in the AdSense account: docs/adsense/reapply-readiness.md:325 and console-check-2026-09-15.md:65 record a PUBLISHED Google "European regulations message" for douknowball.com (Privacy and messaging, published 2026-02-11, Consent / Do not consent / Manage options). Google's script only loads after the site's own Accept on a page with an ad slot, so a visitor in the EEA, UK or Switzerland can be shown the site's banner and then Google's. This is the likeliest origin of the brief's "two different cookie banners". Not reproducible in the local walk (ad host aborted).
- No __tcfapi and no gtag('consent', ...) anywhere in src or index.html: the site's own banner is not a Google certified consent platform and sends no consent mode signal. Round 304 record (PROJECT-STATE.md:17082-17108): ads were switched to non personalized so the pages are true without a certified platform; Round 400 verified Google's own message is active.
- Requests BEFORE any choice on every page: fonts.googleapis.com (Google Fonts stylesheet, index.html:88-90), and flagcdn.com on pages with flags. Neither is named in Privacy Section 4; simLegalPages section 4 only checks a fixed map of seven hosts.
- LIVE ONLY: the host injects <script defer src="/~flock.js" data-proxy-url="/~api/analytics"> into the served head (seen in the one live GET). That is the host's own analytics (the Lovable project analytics CLAUDE.md calls the source for totals). It is not in the repo, loads for every visitor with no choice made, and the banner says "Ads and analytics only run if you press Accept". Privacy Section 10 mentions host server logs only. Not fetched (not allowed), so what it stores is unknown.
- Browser proof (requests aborted and counted): before any choice, 0 requests to analytics hosts and 0 to ad hosts on all 17 pages. After Accept: 1 analytics request on every page; 1 ad request only on pages with a slot (/golf-higher-lower, /footle, /club-manager, /college-grid). After Essential only plus reload (/about, /golf-higher-lower): 0 and 0.
