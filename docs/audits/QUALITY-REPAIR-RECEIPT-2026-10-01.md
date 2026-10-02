# Accepted quality repairs after audit847

Six repairs are committed and pushed to main. Publication is a separate step
owned by Claude's release lane. No Google approval or full-site completion is
claimed. This receipt covers the tested code, not the currently published site.

| Round | Main commit | Affected URL | Repaired finding | Accepted evidence |
| --- | --- | --- | --- | --- |
| 846 | b69beca6 | /higher-lower | QA847-01 stale reveal changes a restarted round | Six regression cases; original hook fails four; two controls reject removed protection. Four native correct/wrong restart paths at1280/320 keep the fresh pair and streak0. |
| 852 | 4de313c8 | /footle, /accessibility | QA847-12 incorrect currency; QA847-13 timed-mode disclosure | Five result cases; euro control fails four and concealment holds. Native result/refresh at320 touch/1440 and original Alphabet Sprint45s to40s countdown. Accessibility raw snapshot refreshed. |
| 853 | af6eb498 | Header account dialogs | QA847-05 opener focus; QA847-06 guest-scoring claim | Eight cases; removed focus fails six, account-only copy fails one. Actual Header16case matrix at320/390 in each motion mode restores the exact connected opener. |
| 854 | 075ecd04 | /front-office, /nhl-front-office | QA847-11 NFL/NHL unusable nested saves |36 component cases; missing pool/period controls fail four/two. Four native320/1440 game contexts,12 corruption recoveries, other real save preserved. Two full mobile seasons, recap/draft refresh, all five earned picks,2027 hub reload. |
| 855 | c98e0ad2 | Games using HowToPlayPopover, including /footle | QA847-07 consent choices outside initial Help focus scope | Seven new cases plus six existing Help cases. Outside-portal control fails five with two unaffected baselines. Six native320/390 contexts in each motion mode verify both Tab directions, one visible choice pair, unchanged script gate, Help retention, Escape/banner/reopen and manual focus return. |
| 856 | 62dd5692 | Shared mobile toasts, demonstrated on /soccer-career | QA847-10 toast intercepts Next Year | One source option. Nine controlled cases before/after: eight narrow blocked cases become zero. Actual Soccer Career390 pointer/320 touch/1440 desktop creates a career, permits Next Year with visible toast, advances age once and retains it on refresh.390 hover holds the toast without blocking. |

## Production and regression boundary

A clean archive of the Release Q main lineage was built with only the accepted
repair files. Paused842-845 drafts were excluded. Type gate0 with
`tsc --noEmit -p tsconfig.app.json`, production build green. Entry asset:
`index-jzRN1lTs.js`; SHA256:
`11a2352e51f3769ee88219245c8241c21b6b825715ea9156cdf8d8506a0959d0`.

All15 built-site fences passed: simAdsense, simBrand, simHeadTags,
simHiddenPages, simHubs, simIndexNow, simIndexing, simInternalLinks,
simNoRivalNames, simPrerender, simPrerenderBoot, simRetiredRoutes, simSchema,
simSitemap and simSnapshotAssets. The five new regression harnesses,
simAccessibility and simHarnessAnchors passed too:22 selected harnesses,
62 new focused test cases. This is not a full runAllSims run.

Two new harnesses initially printed only one/two lines. The runner rejected
them as EMPTY even though their assertions passed. Substantive outcome-group
and cleanup reporting was added, with assertions unchanged. Both were rerun
through runAllSims and passed. Their negative controls were rerun directly.

Accessibility alone was prerendered at all three normal clock samples. The
derived sitemap ledger changed only that page;169 dates remained unchanged.
No new pages, bulk filler, sports dataset changes or backend writes occurred.

## Native test limits and retained unsuccessful attempts

Browser contexts and storage were disposable. Real ads/analytics were
intercepted. Credential, score and report mutations were intercepted. Reads
remained original. Essential requested no vendors; Accept requested one GA
and one AdSense script, both intercepted, with the non-personalized flag set.
No uncaught errors or document overflow appeared in accepted native cases.

The following attempts are retained as driver limits, not product failures:
Footle initially checked whether Help was visible before it mounted; the
replay waited for the actual dialog. An NHL broad Play locator selected a
help control; the replay selected the actual hub tile. An auth driver initially
rejected intercepted read RPCs as writes. One ordinary-motion Help context
timed out during navigation and passed on isolated replay without product
changes. No failed attempt was silently replaced by a green claim.

854's desktop runs cover one-period advancement. Championship-winning and
fired saves were not natively exercised. After the mobile draft's last earned
pick, reload restored the2027 hub; the final Continue button was not clicked.
The54 native854 resource errors correspond to54 deliberately blocked Google
Fonts requests.855 covers shared HowToPlayPopover, not legacy handbuilt rules.
856 does not verify physical-device safe-area insets or footer-lifted positions.
Soccer Career malformed-save recovery remains a separately claimed follow-up.

## Local evidence retained for review

- `C:/Users/antho/AppData/Local/Temp/dukb-repairs-native-2026-10-01/`: product.json, footle.json, gates.log, reporting-gates.log and screenshots.
- `C:/Users/antho/AppData/Local/Temp/dukb-native-auth-help-853-855-2026-10-01-a4/native-summary.json`, with a2/a3 raw runs and retained earlier limits.
- `C:/Users/antho/AppData/Local/Temp/dukb-save854/`: browser.json, receipt.json, original locator limit and screenshots.
- `C:/Users/antho/AppData/Local/Temp/dukb-toast856/`: before.json, after.json, receipt.json and controlled screenshots.

The permanent regression files are committed beside the product repairs.
Temporary native receipts are local and were not committed as shipped assets.
