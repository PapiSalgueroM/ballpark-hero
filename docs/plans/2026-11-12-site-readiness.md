# DoUKnowBall site readiness and game work

Checkpoint at 18:08 UTC on November 12, 2026. The existing 24-hour task remains active. These are review candidates, not a production release or a NitroPay acceptance claim.

## Current integration

The combined application is `c9879287b`, based on the earlier `4e42ccfb5` candidate. Full application TypeScript and the ordinary Vite build passed. The build contains 183 rewritten snapshots. The retained output and its 919-file SHA-256 manifest are under `C:/Users/antho/AppData/Local/Temp/dukb-integrated-20261112/`. The previous physical build was retained intact before the new output was selected.

Local storage became available again after the earlier disk-full interruption. Existing dependency trees are reused without installing or deleting packages. Production package versions match the lock. The borrowed development tree has `@testing-library/dom` 10.4.1 where the current lock names 10.4.2. Hosted checks from the exact review drafts provide separate installation evidence.

## NitroPay requirements

1. **Speed.** Routes load independently. All 31 ranked entry graphs passed and 105 compiled route openings at 320, 390 and 1440 pixels showed zero unrelated ranked game entries, page errors, horizontal overflow or unsized images. Startup removes unused providers and defers account/game code. Below-fold images retain lazy loading. A new quiet mobile/desktop Lighthouse run is pending. The earlier complete six-page run measured desktop LCP 0.949–1.237 seconds and mobile LCP 3.763–4.930 seconds. The mobile 2.5-second target remains open. Field INP is unknown. PageSpeed Insights returned HTTP 429 in the earlier attempt. Likely flags include unused JavaScript/CSS, render-blocking work and mobile main-thread work.
2. **Required pages.** About, Contact, Privacy and Terms are linked in every tested footer. The Contact mail link is `douknowball1@gmail.com`, matching the configured report inbox. Privacy explicitly covers advertising, cookies, personalized advertising, GDPR, CCPA, consent withdrawal and GPC. The latest policy text and shipped HTML agree. This does not establish that a future Nitro configuration is compliant before its actual settings and consent integration are reviewed.
3. **Text endpoints.** The candidate contains the Nitro seller placeholder in `/ads.txt`. The existing seller is retained. Previous live reads returned HTTP 200 with plain-text ads/robots and XML sitemap responses. Nitro seller records remain pending from the network.
4. **Helpful raw text.** The requested guide word counts are Home 197, Soccer Career 176, Club Manager 179, Soccer 181, NBA My Career 181 and Pro Basketball 185. They are present in the HTML, have unique titles/descriptions and contain no em dashes. The MLB guide also agrees with the new retirement rule.
5. **Thin pages.** A fresh census covers 174 indexed routes. None fall below 150 words. The six priority guides are counted separately from navigation and footer text. The census records near-duplicate comparisons and exclusions. Ten intentional noindex pages remain excluded: admin login/reports, Football Timeline, Guess NFL Team, Higher Lower Transfers, Pack Battle, Profile, Reset Password, Search and Shirt Number. Eleven redirects stay out of the sitemap.
6. **Ad slots.** Empty reserved spaces support the requested desktop and mobile dimensions. No Nitro script, seller identity, ad fill or region behavior has been activated.
7. **Consent.** All 64 phone checks across 32 game routes passed at 320 and 390 pixels. The unanswered prompt stays in document flow on games, controls remain usable, and reject/reopen works. No ad host was contacted by these isolated checks. Google Analytics 4 stays paused.
8. **Bots.** Review zero-engagement cohorts by landing page, referral source, country, device and time. Compare visits with game-start/completion events and hosting logs before labelling traffic invalid. Apply narrow request limits to abused endpoints, keep verified search crawlers working, and consider challenges only where abuse is demonstrated. No firewall or provider settings have been changed.

Lovable reports 227,724 project pageviews across the 30 complete UTC days ending November 11. The 30 daily buckets sum to that total. Australia is the second listed country. The source changes on October 26, so the mixed period is not evidence of a clean growth trend or deduplicated monthly visitors. Project aggregates do not establish an invalid-traffic rate. Nitro's publisher guidelines also require appropriate handling of under-16 users before personal data is sent to the network. The site's existing optional account minimum is 13, so that remains an activation decision rather than a claim solved by policy wording.

Sources: [Nitro publisher guidelines](https://blog.nitropay.com/guidelines/), [Nitro ads.txt documentation](https://nitropay.com/docs/setting-up-your-ads-txt-file/), [connected Lovable project](https://lovable.dev/projects/c29d224f-a662-4a15-b809-d86fa3b3f0ad).

## Games and admin reports

The live production report database remains at 156 active reports: 19 new, 107 investigating and 30 confirmed. There were no new submissions after the earlier 01:40 UTC report. No report status or admin note has been changed during this work. A separate legacy Lovable database is not the live report source.

- NRL Team Manager offers 2026 and 2027 starts. The current chain adds finances/forecasts, position depth, recruitment bookmarks, rival scouting and the league-wide round browser to the existing squad, tactics, academy, contracts, training, medical, live match, finals and save systems. Exact draft #769 passed application types, ordinary build, 31 focused tests, 15 readers and 16 download budgets. Phone/desktop journeys cover finals and 2028 rollover. Squads and draws are explicitly simulated. This is not a claim of complete Soccer Manager feature parity or official future fixtures.
- Manual Club Manager internationals use an eligible squad and XI, advance one fixture at a time and retain an automatic fallback for sparse player coverage. Native 320/390 checks cover England, a sparse Fiji save, the club-playoff guard, stale tabs and exact reloads.
- The watched Champions League winner now contributes to Club Manager's season award. Native Everton saves award the reproduced Bayern winner and retain the result on reload.
- Soccer Career title promises settle from the actual played league result. Native met/missed cases and reloads passed at both phone widths.
- MLB voluntary retirement opens after the first completed season. Native cancel, confirmation, reload, preserved record and contract checks passed. Zero-season MLB and one-season NBA controls retain their existing restrictions.
- Deadline Day, Contract Chaos, Player Stock Market and Sports Bingo keep the first completed Daily when a stale tab acts later. Their compiled native replays preserve the original bytes and record one completion. These checks cover ordered actions, not atomic simultaneous browser-storage writes.
- Dart Draft supports native Space selection and aiming without held-key double advancement. Stadium preserves hidden-close away earnings and the new-ground clock after a successful sale. The native two-hour fixture recovered $16,200 and four matchdays.
- Earlier verified work remains composed, including academy contract pricing, Player Bingo corrections, Gauntlet resume, Rebuild recovery, roster controls, CSL/J1 coverage and the simplified Home catalogue.

## Completed integration checks and remaining work

All 21 site readers now pass. Save Keeper follows an actual prior same-block constant initializer rather than looking for the serializer name in the raw setItem argument. Its deliberate wrong-serializer control fails only the intended Stadium writer and aggregate assertions. The 22 writer and 44 loader checks pass normally. The initial failure is retained in the log. The original current download harness passes all 16 unchanged caps and 400 data-isolation probes. Its transport-only loader denies non-loopback requests. The first obsolete temporary harness run remains recorded as failed and supplies no qualification credit.

The seven NRL journeys also pass against this exact combined output. The career group passes 170 focused cases and 18 native replays at 320/390. The six Daily/Dart/Stadium fixes pass 79 focused cases and their compiled browser replays. Root reviewed the fresh Home phone/desktop images, NRL depth/round screenshots and selected career screens. The 919-file build manifest SHA-256 is `3b088a7c24805678ffb6fda66c089eb0ec7f471e461f188f961a6fed2aa74e48`.

Fresh Lighthouse 13.6.0 checks use the actual compressed candidate with simulated mobile/desktop throttling and blocked third-party services. These are single lab runs per page and device, not real-user percentiles.

| Page | Mobile LCP | Desktop LCP | Mobile TBT |
| --- | ---: | ---: | ---: |
| Home | 4.385s | 0.960s | 564ms |
| Soccer Career | 4.617s | 1.222s | 285ms |
| Club Manager | 3.655s | 1.038s | 122ms |
| Soccer | 4.126s | 0.980s | 368ms |
| NBA My Career | 3.857s | 1.039s | 220ms |
| Pro Basketball | 4.097s | 0.982s | 208ms |

Maximum mobile CLS is 0.008 and desktop CLS is 0.022. Desktop LCP and lab CLS meet the requested targets in these runs. Mobile LCP does not. TBT is not INP, so the 200ms INP target remains unverified. Next performance work targets startup render work and early hub image discovery, using paired measurements before adopting a change.

An inventory found older separately qualified save fixes absent from the initial combined candidate. Hot Seat, NBA/NFL Perfect Season and several Career save/engine fixes are now being composed in isolated children and rechecked. Those are not credited to c9879287b. NRL sponsorship is the next bounded feature under development. Existing Edge/SQL changes that require coordinated release remain staged. New feature drafts are not deployed. Nitro application submission, seller IDs, provider activation, age handling and region-specific loading decisions remain outstanding.
