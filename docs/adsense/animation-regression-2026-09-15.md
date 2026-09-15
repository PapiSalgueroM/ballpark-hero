# Animation release AdSense regression review

Observation recorded on 2026-09-15 at 11:22 EDT (15:22 UTC). This is a bounded, read-only source and public HTTP review. No AdSense or Search Console controls were changed.

## Result

No concrete new AdSense blocker was found in the animation changes checked here. This does not establish approval. The last console confirmation remains the review submitted at 04:19 EDT on 2026-09-15; this audit did not make a fresh console read.

## Source checked

All paths below are under `C:/Users/antho/ballpark-hero/.worktrees/`.

| Worktree | HEAD at the source inventory | Scope |
| --- | --- | --- |
| `animation-release-603-605` | `c3f249b4934335c8aff051e4174843e6bc9843fe` | Shared ad, consent, page, help and SEO plumbing; integrated 603 renderer |
| `round-603-simcast-motion` | `26094c9f99f94ed9123a662f8a037d5b3704c674` | Club Manager live match motion |
| `round-604-drill-motion` | `c54691438006b62cb1fd7425e6d6abe767495f5d` | Working tree changes to `DrillBoard.tsx`, plus new `DrillPlayers.tsx` and their QA harness/fixture |
| `round-605-conquest-motion` | `a3471a4f46d0d27f0d914f5e74ce4b4d76280b95` | Working tree changes to both conquest boards and `conquestBattleNba.ts`, plus new action scene/player/frame files and QA harness/fixture |

The 604 and 605 changes were still uncommitted in their own worktrees and were not yet fully integrated into the release tree. The HEAD values identify their bases, not immutable commits containing all reviewed changes. This review therefore does not claim to verify the eventual release commit or deployed animation assets.

The new motion stays inside local clipped pitch, SVG or figure containers. It introduces no full-page overlay, ad refresh or ad placement. The checked page shells retain their help, readable instructions and `GameSeoContent`. Of the five pages below, Club Manager has a local manual ad mount; it remains after the game with the existing 150px padding. The other four have no local manual ad mount.

The existing ad component initializes its manual slot only after affirmative cookie consent and hides unfilled space. The existing script loader rejects noindex pages and pages without a deliberate manual ad slot. The global publisher association remains present. These are source observations, not confirmation of settings inside Google's account dashboard.

## Live public checks

Direct HTTP requests to the following live routes returned 200, their own canonical URL, the publisher association `ca-pub-2929318086316376`, a readable saved snapshot, and the headings "How to play", "Rules to know" and "Example walkthrough". No actual robots meta tag containing `noindex` was found.

- [Soccer Career](https://douknowball.com/soccer-career)
- [Club Manager](https://douknowball.com/club-manager)
- [Stadium Tycoon](https://douknowball.com/stadium-tycoon)
- [Football Conquest](https://douknowball.com/conquest)
- [Basketball Conquest](https://douknowball.com/conquest-nba)

[robots.txt](https://douknowball.com/robots.txt) returned 200 and permits the public pages, with no blanket root disallow. [ads.txt](https://douknowball.com/ads.txt) returned 200 and includes `google.com, pub-2929318086316376, DIRECT, f08c47fec0942fa0`.

These HTTP checks inspect the currently published documents. They do not prove every new renderer is live, measure an actual filled ad's geometry, or establish that Google has indexed or approved the site.

## Current official guidance

Google's [site readiness guidance](https://support.google.com/adsense/answer/12176698?hl=en) emphasizes valuable original content, usable navigation and crawler access. It also says review commonly takes a few days and can take two to four weeks. These checks preserve the site's content and access safeguards while the existing review is pending.

Google's [ads interfering with content policy](https://support.google.com/publisherpolicies/answer/11191353?hl=en-GB) prohibits publisher content from obscuring ads. Its [ad placement guidance](https://support.google.com/adsense/answer/1346295?hl=en) addresses accidental clicks near game controls and recommends at least 150px between ads and the game. No new placement or overlapping renderer was found in this source review.

Approval remains Google's decision. Animation quality and an indexed URL are not evidence of AdSense approval. No second review request was made.

## Supplemental frozen-source audit at 12:26 EDT

This supplement checks immutable combined source at `e5f28650c69eed724d123c23cd3767c9db442e86` in `animation-release-603-605`. It replaces the earlier mutable-source limitation for Rounds 603, 604 and 605. It does not claim that this combined commit has been published.

| Round | Included source commit | Presentation scope |
| --- | --- | --- |
| 603 | `26094c9f99f94ed9123a662f8a037d5b3704c674` | Club Manager live shots, saves and player motion |
| 604 | `547aee9a695faa72a6373be4530d9aa76a1b6269` | Soccer Career drill figures, ball paths and keeper saves |
| 605 | `be49e8adcecc3efa78cc4a638986e096c8a35dac` | NFL and NBA Conquest committed-play scenes |

Each of these three commits was compared with its own parent. None changes the ad components, consent component or script loader, `PageSeo`, `GameSeoContent`, guide data, routing or game registry, template, robots file, ads.txt, sitemap, lastmod ledger or prerender/indexing scripts. The broader combined tree also contains separately owned first-team changes, including additional Stadium Tycoon and Academy guide text. Those additions are not attributed to Rounds 603 to 605 and their presence is not a reason to claim every guide byte is unchanged.

No new ad placement, refresh call, publisher request, full-page animation portal or code that positions a renderer over an ad was found. Club Manager's actors and ball remain inside its clipped relative pitch. The drill figures stay in the existing SVG board, and Conquest uses a clipped figure in normal document flow. Club Manager retains its existing local manual slot after gameplay. Among the five reviewed page shells, the other four still have no local manual ad mount. This source review does not measure a filled ad or inspect account-level Auto ads settings.

The unchanged `src/components/ads/AdBanner.tsx` still requires `consent === 'accepted'`, pushes a slot once per mount, collapses unfilled space and supplies `AD_CONTROL_GAP_PX = 150`. The unchanged loader requires a deliberate manual slot and refuses a document with a noindex robots tag. Animation timing does not call either ad or consent code.

All five pages retain `PageSeo` and `GameSeoContent`. Soccer Career and both Conquest pages retain `GameHelp`; Club Manager retains its detailed help popover; Stadium Tycoon retains its rules dialog. The guide renderer still prints the how-to-play steps, rules and worked example as readable text. No route, canonical, robots directive or indexing behavior was changed by the three animation commits.

### Fresh published-page observations

Direct public HTTP requests ran on 2026-09-15 from **12:26:27 to 12:26:30 EDT (16:26:27 to 16:26:30 UTC)**. HTML was parsed without executing page scripts.

| Published page | HTTP | Raw HTML observations |
| --- | --- | --- |
| [Soccer Career](https://douknowball.com/soccer-career) | 200 | Own canonical, saved snapshot and all three guide headings |
| [Club Manager](https://douknowball.com/club-manager) | 200 | Own canonical, saved snapshot and all three guide headings |
| [Stadium Tycoon](https://douknowball.com/stadium-tycoon) | 200 | Own canonical, saved snapshot and all three guide headings |
| [NFL Conquest](https://douknowball.com/conquest) | 200 | Own canonical, saved snapshot and all three guide headings |
| [NBA Conquest](https://douknowball.com/conquest-nba) | 200 | Own canonical, saved snapshot and all three guide headings |

Each response contained `ca-pub-2929318086316376`, with no robots meta tag or `X-Robots-Tag` header imposing noindex. The three headings were How to play, Rules to know and Example walkthrough. [robots.txt](https://douknowball.com/robots.txt) returned 200, allows Googlebot and the public root, and restricts only `/admin/` in the wildcard group. [ads.txt](https://douknowball.com/ads.txt) returned 200 with `google.com, pub-2929318086316376, DIRECT, f08c47fec0942fa0`.

No new concrete AdSense regression was found in this bounded review. The HTTP observations describe the currently published documents, not deployment proof for the frozen animation commit, a fresh indexing report or an approval result. The last confirmed console action remains the review submission at **04:19 EDT on 2026-09-15**. No console was opened and no review request or other UI action was made for this supplement.
