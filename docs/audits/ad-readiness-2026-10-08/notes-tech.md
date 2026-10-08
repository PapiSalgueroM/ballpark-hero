# notes-tech (auditor: tech, the brief's Context item 5 and Phase 4)

Restart file. Rewrite after every step. No tracked file edited. Scratch (live fetches) lives in the session scratchpad
under tech/, not in the repo.

## STATUS
- (a) sitemap: DONE (facts below). Live GETs used: sitemap.xml 1 of 1, robots.txt 1 of 1.
- (b) head tags: DONE (facts below)
- (c) noindex utility: DONE
- (d) unknown URLs: DONE. Both live GETs USED (2 of 2). NO MORE LIVE FETCHES OF ANY KIND ARE ALLOWED.
- (e) navigation: DONE
- (f) structured data: DONE (section at the bottom)
- (g) 380px fences: DONE (below). ALL SEVEN PARTS DONE. Only the StructuredOutput report is left. Do not redo anything.

## (g) Phone width fences (read, not run)
- NOBODY measures 380 px. Widths measured: 390 x 844 (playHomeFold home page only: first game tile at or above y=430,
  at most 2 account asks above it; sweepGames every sitemap and registry route: exception, empty screen, page wider
  than the screen, leaked undefined/NaN; sweepPhone every static route with touch and an iOS user agent: sideways
  overflow, tap targets under 30 px, text under 9 px, overlapping controls; playIphone ten screens: /, /club-manager,
  /stadium-tycoon, /soccer-career, /minefield, /footle, /soccer-grid, /leaderboard, /whats-new, /privacy), 320
  (sweepGames only when SIZES=mini is passed, playIphone header row, playLeagueTableFit), 430 x 900 (playGames, the
  only harness that actually PLAYS games; WIDTH env can change it). playLeagueTableFit is the Club Manager league
  card alone at 320, 390, 430, 1440.
- Not measured by anyone: 380 itself; a full play through of any game at a phone width under 430; the brief's own
  eight ranking pages as a set (only 3 of them are in playIphone's ten; all 8 are in the two whole site sweeps, which
  look at the opening screen only). Which ten pages are "top ten" is not recorded in the repo (needs Lovable analytics
  or the Search Console export the owner skipped).

## Other facts picked up
- ads.txt in the repo and live ends f08c47fec0942fa0. The brief's line ends fa8. Google's published id is fa0; the brief
  has a typo. simAdsense section 3 guards the file. (Ads auditor's call.)
- simIndexNow.mjs line 31: SITEMAP_FLOOR = 171, fails on fewer AND on more. Any page added (guides) or removed
  (noindex, merge) needs that number moved in the same round.
- docs/audits/GOOGLE-STATUS-2026-10-03.md: Search Console sitemap report Success, submitted and last read October 1,
  170 discovered pages. Page indexing (September 20 update) 68 indexed, 94 not (78 discovered not indexed, 10 crawled
  not indexed, 5 redirects, 1 noindex).
- docs/audits/QUALITY-REPAIR-BACKLOG-2026-10-01.md line 120: a real host 404 "would be useful if hosting later
  supports it"; line 124: "Do not mass-noindex the catalog".
- Retired routes answer 200 with an 870 byte meta refresh signpost (canonical to the destination), not a 301. A URL
  rename (brief Phase 3) can only be done that way on this host.
- crawl.json: main text present on 171 of 171 indexable pages; thinnest /contact 214 words, /leaderboard 477.
- Files added by this auditor (all under docs/audits/ad-readiness-2026-10-08/): notes-tech.md, tech-scan.mjs,
  tech-scan.json (336 KB, one record per saved document, 192), tech-report.mjs. Nothing else.

## (b) Head tags (worktree = Release AL, my own scan of the saved files, 171 sitemap pages)
- title, description, canonical, h1: exactly one of each on 171 of 171. 0 missing, 0 doubled, 0 shared title, 0 shared
  description, 0 shared h1 text, canonical is the page's own address on 171 of 171. crawl.json (Release AK, over HTTP)
  says the same.
- Title length: longest 60 (/alphabet-sprint), 0 over 60. Description: 9 over 160 characters (longest 215, /pro-football),
  2 under 70 (shortest 51, /privacy). Length only truncates, it is not an error.
- 17 nested sitemap pages (13 /records/<slug>, 4 /<grid>/archive).
- Fence coverage: simHeadTags reads public/<dir>/index.html one level deep only (line 38), so it checks 153 pages and
  NOT the 17 nested pages nor the home page; simIndexing 4 checks title and description uniqueness from PageSeo literals
  in src/pages/*.tsx, so pages whose title is built at runtime (6 hubs, 13 record pages, 4 archives) are outside it;
  simIndexing 6b counts h1 in every sitemap page's saved file (all 171); simPrerender 11 counts canonicals on every
  sitemap document; simPrerender 14 no sitemap page ships noindex. NOBODY checks h1 text uniqueness, title uniqueness
  on the 23 dynamic title pages at file level, or canonical == own address on indexable pages. All three are clean
  today by my scan; the gap is in the fences.

## (c) noindex
- 0 sitemap pages carry a robots meta. 21 saved documents are not in the sitemap:
  noindex, follow in the raw HTML: /search, /profile, /reset-password, /football-timeline, /guess-nfl-team,
  /higher-lower-transfers, /pack-battle, /shirt-number. noindex, nofollow: /admin/login, /admin/reports.
  11 retired signposts: no robots tag on purpose (canonical to the destination, meta refresh).
- /search is ALREADY noindex (Search.tsx:155, saved page has it before JS). The brief's Phase 4 item is delivered.
  simHiddenPages guards it (document exists, noindex in raw HTML, not the home page copy, not in sitemap).
- Utility pages that ARE indexable and submitted: /leaderboard (priority 0.7, daily) and the 4 grid archives.

## (d) Unknown URLs
- LIVE, 2026-10-08: GET /no-such-page-audit-20261008 -> HTTP 200, text/html, 41421 bytes.
  GET /records/no-such-record-audit-20261008 -> HTTP 200, 41421 bytes, byte identical to the first.
  Raw body = the home template: title "DoUKnowBall: Free Sports Trivia Games and Daily Quizzes", canonical
  https://douknowball.com/, the home copy, no robots meta. The 404 text only exists after the inline script runs.
- Local AK copy answers the same address with the 32200 byte template. The live host ADDS 259 lines (9221 bytes): the
  hashed bundle tags, a `#lovable-badge` style block plus the badge markup (aria-label "Edit with Lovable"), and
  `<script defer src="/~flock.js" data-proxy-url="/~api/analytics">` (the host's own analytics, injected in the head).
  index.html line 93 on removes the badge with JS at runtime (owner 2026-08-05) but the markup is in the raw response.
- Repo today: index.html lines 349 to 466 (Round 282) inline script: if no #dukb-snapshot and path is not /, add
  robots noindex,follow, remove the canonical, set title "Page Not Found | DoUKnowBall", replace #root with an h1
  "404: there is no page at this address" plus 8 links. Skips under the prerenderer and paints nothing on
  /profile/<name>. Guard: scripts/playSoftFourOhFour.mjs (browser, app bundle blocked). NotFound.tsx is the React 404
  (noindex). There is NO public/404.html.
- public/_redirects is NOT honoured by the host (its own header, Round 272, measured live). So the host gives no 301
  and no 404 status. docs/SHIP-PIPELINE.md says nothing about a way to get one.

## (e) Navigation
- Header.tsx = logo link, theme toggle, streak flame, Log In, Sign Up. There is NO menu of sections in the header.
  GameNavbar.tsx = Home link plus Back button. The only sitewide menu is the footer (Footer.tsx lines 39 to 100):
  6 hubs, Search, About, Contact, What's New, Record Books, Leaderboard, Privacy, Terms, Accessibility.
- Raw saved HTML: 0 documents contain a <nav> element (the prerenderer rebuilds bodies from readable blocks). The
  footer links ARE real anchors: 176 of 177 snapshots carry the footer chrome wrapper with the 15 links (minus any
  already linked in the body, the prerenderer writes a link once). 154 also carry the brand link to / at the top.
- No chrome wrapper: the home page (its static block links 59 of the other 170 sitemap pages, including 6 hubs,
  /records, /about, /contact, /whats-new, /leaderboard, /privacy, /terms; not /search, /accessibility), the 11 retired
  signposts, /profile, /admin/login, /admin/reports, and one noindex snapshot.
- Orphans: 0. Fewest inbound from other sitemap pages is 4 (10 pages: 4 format explainers, /world-cup-2026-results,
  /alphabet-sprint, /fight-gym, /guess-nascar-driver, /nascar-chain, /olympics). Median 8. 29 pages under 6.
  /accessibility is linked only from the footer. 0 links to an address with no saved document.
- simInternalLinks: orphans (fail at 0 inbound), every link is a route, hubs at 50+ inbound, 5+ outbound.


## (a) Sitemap facts
- Generator: scripts/genSitemap.mjs (390 lines). Sources: src/App.tsx routes via scripts/lib/retiredRoutes.mjs,
  src/data/gameRegistry.ts (every game), RECORD_SECTIONS in src/lib/records.ts (record slugs), STATIC_PAGES (lines 60 to
  103, the curated non game list). Redirect routes are excluded mechanically. Fails closed on a registry game with no
  route, a record slug with no route, a malformed slug list.
- package.json line 16 build:seo = genSitemap --routes-only, vite build, prerender, genRetiredStubs, genHiddenStubs,
  genSitemap (real), vite build. The host (Lovable) runs plain `vite build`, which copies the committed
  public/sitemap.xml. So the file is regenerated in every release gate and committed ("Release AK: build output"),
  not on the host.
- lastmod: scripts/data/lastmod.json (ledger, committed, fingerprint v3). Date = the day the page's own readable text,
  links, title, description and JSON-LD last changed (sha256 of the reduced snapshot, chrome excluded). Round 280.
  194 commits have touched the ledger since 2026-08-25, 193 the sitemap.
- Worktree (Release AL) public/sitemap.xml: 171 URLs, header says generated 2026-10-07. lastmod spread: 2026-08-25 x1
  (/contact), 09-16 x2 (/privacy, /terms), 09-19 x20, 09-29 x2, 09-30 x63, 10-01 x34, 10-02 x4, 10-03 x6, 10-06 x23,
  10-07 x16.
- LIVE https://douknowball.com/sitemap.xml (one GET, 2026-10-08 08:36 GMT): 200, application/xml, 25532 bytes, 171
  URLs, header says generated 2026-10-07, newest lastmod 2026-10-07 (14 rows), oldest 2026-08-25. Byte identical to the
  Release AK copy at localhost:4190. Same 171 URLs as the worktree; only two lastmod values differ (AL re-dated
  /buzzer-beater and /cage-clash from 10-06 to 10-07).
- LIVE robots.txt (one GET): 200, text/plain, identical to public/robots.txt. Allow all for 13 named bots and *,
  Disallow: /admin/ only, Sitemap: https://douknowball.com/sitemap.xml.
- By type (171): 133 games (priority 0.8, daily), home, /leaderboard, 6 hubs, /whats-new, /records + 13 record pages,
  5 format history explainers, /world-cup-2026-results, 4 grid archives, /about, /contact, /privacy, /terms,
  /accessibility.
- THE BRIEF IS STALE: "generated 2026-08-12, missing Record Books, hubs, About, Contact, What's New, Stadium Tycoon"
  matches commit 424eed00 (2026-08-16): 124 URLs, all lastmod 2026-08-12, no /records, no hubs, no /stadium-tycoon
  (but /about, /contact, /whats-new WERE in it even then). Round 148 (2026-08-17, 6fcb9ce4) replaced it with the
  generator. Today all of those are in the live file: /records 09-30 plus 13 record pages, 6 hubs, /about 10-01,
  /contact 08-25, /whats-new 10-07, /stadium-tycoon 10-01.
- Left out on purpose: /search, /profile, /reset-password, /admin/*, 5 hidden games, 11 retired redirects.

## Navigation correction
- 177 of 177 snapshots carry the footer wrapper (not 176). Every one of the 170 non home sitemap pages links all six
  hubs, /records, /about, /contact, /whats-new, /search, /leaderboard, /privacy, /terms, /accessibility in raw HTML.
- App.tsx:185 HEADER_PATHS = ['/', '/leaderboard', '/profile']: the Header shows on three routes only. 23 snapshots have
  no top bar at all (13 record pages, /records, /about, /contact, /whats-new, /privacy, /terms, /accessibility,
  /world-cup-2026-results, /search, /reset-password). 17 sitemap pages have NO link to the home page in raw HTML:
  13 record pages, /accessibility, /privacy, /terms, /world-cup-2026-results (the footer has no Home link).

## (f) Structured data (worktree, 171 sitemap pages, all blocks in the head, 0 parse errors)
- Site block (Organization, WebSite, WebApplication, Offer): 171 of 171.
- BreadcrumbList: 147 of 171 = 133 games + 13 record pages + /world-cup-2026-results. 108 three step (94 games through
  their hub, 13 record pages through /records, wc results), 39 two step (games in sports with no hub). None on: home,
  6 hubs, /records, 5 format explainers, 4 grid archives, /leaderboard, /whats-new, /about, /contact, /privacy,
  /terms, /accessibility (24).
- FAQPage: 133 of 171, exactly the 133 game pages, 617 questions, 3 to 10 a page (18 pages have 3, 71 have 4).
  Every marked up question AND answer is in the visible raw text of the same page: 0 mismatches of 617.
  All 133 carry "Is X free to play?" with the same answer ("...on DoUKnowBall, right in your browser. No download and
  no signup needed."): the brief is right about that today.
- FENCES THAT PHASE 1 WOULD TURN RED:
  simSchema.mjs line 122 to 124: every registry game page must ship FAQPage with at least 2 questions ("zero FAQs is
  acceptable" in the brief fails here).
  simGuideHeadings.mjs (Round 638, the owner's own request for "lots of key words and headings and sub headings and
  sub sub headings"): CONVERTED_FLOOR = 131 guides (line 68), each h2 must carry the game's registry label, at least 8
  h3s and 1 h4 above the FAQ (line 386), every sentence frozen in scripts/data/guideHeadingsFrozen.json (372 KB) must
  still be there exactly once. The brief bans keyword headings, a heading over one bullet, and sub headings inside
  How to play. The two instructions are opposite; the fence has to be retired or rewritten with him knowing.
  simFaqSchema: no two blocks of one @type, no generic placeholder FAQ, no swap after boot (stays valid).
