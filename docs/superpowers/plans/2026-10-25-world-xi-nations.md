# World XI nations implementation contract

Status: source-only design, no product implementation or runtime qualification.
Future repository path: docs/superpowers/plans/2026-10-25-world-xi-nations.md.
Baseline: b20ec6664df9d4c58d63ea0596791d33b2a3b8fc.

## Goal and ownership

Let a player choose more existing nations, the original pool, or nations from the 2026 field before building the same World XI. Reuse the existing route, slot-fit rules and season report. This adds no tournament engine, player rows or official squads.

Root owns this narrow WorldXI lane under WORKBOARD21163/21164. Scope: WorldXi page, one page-only pool helper, focused tests/help, scoped QA/workflow and docs. Owner I retains protected football integration, main merge and publication. J retains Headlines. No App, global CSS, Toaster, dependency, provider, ads, consent-policy or data-table changes.

## Exact page-module API

Add src/lib/worldXiNationPools.ts with this public surface:

~~~ts
export type WorldXiNationMode = 'expanded' | 'classic' | '2026';
export function selectWorldXiNationPool(
  data: WorldXiData,
  mode: WorldXiNationMode,
): WorldXiData;
~~~

Import WorldXiData as a type from the unchanged worldXi core. Reuse WC2026_GROUPS from src/data/wc2026Results.ts. Keep its flattening, membership Set and derived maps inside the function. Do not evaluate imported values at module scope. A literal private alias table is sufficient; do not import the heavier international-squad/NATIONAL_POOLS module.

Classic returns the exact original data object, including countries order, arrays and map identities. It does no alias merge, draw, random call or data mutation.

Expanded is the default. Build a new byCountry Map, concatenating the original bucket rows into these five existing market keys:

- USA and United States become United States.
- Turkey and Türkiye become Türkiye.
- Ivory Coast and Cote d'Ivoire become Cote d'Ivoire.
- South Korea and Korea, South become Korea, South.
- Bosnia & Herzegovina and Bosnia-Herzegovina become Bosnia-Herzegovina.

These are the five source-backed aliases selected by Root, not fuzzy matching. Other keys stay as they are. Preserve every player object and the original players array. Never dedupe by player name alone, rewrite nationality/positions, split country names at commas or merge distinct Congo/Korea federations. Build countries from unique nonempty canonical buckets in deterministic alphabetical order. Leave the input map, its lists and countries array unchanged.

2026 uses the same cloned canonical map, with countries restricted to the canonicalized WC2026_GROUPS team membership. Ignore standings, thirdQualified and schedule order. Reuse the existing field rather than copying another 48-team list. The returned players array remains the original one; country selection controls drawing. A raw player.country may retain an alias, so any membership guard must use the selected bucket/identity or the same canonicalizer, not raw-string equality to the drawn canonical key.

## Page behavior

Add one setup-only mode state, default expanded, and memoize selectedData from data and mode. The three labels are Expanded, Classic and 2026 Nations. Controls must be at least44px high, keyboard reachable, visibly selected and fit a320px viewport without horizontal page overflow.

Use selectedData consistently in start, its callback dependencies, respin, suggestions, reel entries and availability count. Do not leave an old data.countries route in a secondary callback. Only setup exposes the selector; keep its state stable while playing and in results. Play again returns to setup retaining that choice, where the player may choose another mode.

Show the actual loaded selectedData.countries.length. It is available nation buckets, not a fresh player census or proof that all48 teams loaded. 2026 copy must say that nations come from the tournament while players come from the existing pool. It must not imply official squads, a tournament simulation or that every nation has a complete XI.

Keep the chosen label visible in play, won/lost results and both ordinary/season share text. Preserve the existing /world-xi completion path and filledCount score. Mode labels do not change OVR, chemistry, season inputs, the38-match season or report outcomes.

Update the existing WorldXI help entry and page how-to text for mode selection before play and the existing reopenable help control. Use a generic worked slot example or existing verified facts, with no new real-player counts, invented quotes or fabricated roster claims.

## Refusals and preserved behavior

Keep src/lib/worldXi.ts byte-for-byte unchanged, including fetch, primary-nationality parsing, fitsSlot, draws, respins, suggestions, ratings and season simulation. Existing boot requires the original minimum player and Classic-qualified country checks; Expanded does not bypass a refused load.

A selected mode with fewer than eleven available buckets must stay in setup with an honest unavailable/choose-another-mode message. It must not silently fall back, start the timer, spend respins or record a completion. A pool with enough countries can still fail slot coverage. Keep the existing fair-draw refusal, with no partial XI or repeated nation fallback. Forty unsuccessful greedy attempts are a refusal, not proof that no mathematical matching exists.

Preserve actual verified secondary-position eligibility and the GK/outfield boundary. Suggestions still permit a wrong-position candidate so the existing friendly fitsSlot rejection can explain it. Preserve distinct countries and existing used-name rejection. Per-slot coverage does not prove a global unique-name matching for very thin namesake buckets, so do not promise every draw is always solvable or introduce a matching rewrite in this round.

A no-alternative respin currently consumes one budget and returns the same nation. Retain that behavior, query handling and reel/timer semantics, rather than silently changing spending as part of the mode feature. Preserve timer settings, three-default/0/5/10 respin options, reduced-motion handling, reporting and completion-once logic.

## Test-first acceptance

1. Run CM's two named actual-page tests on unchanged product first. Require their actual owned assertion failures, not setup/import/timeout failures, with the existing seven component cases held. No production adoption before raw RED admission.
2. Pure helper cases prove Expanded includes a thin nonempty nation omitted by Classic; Classic returns the original object; 2026 excludes a non-field nation and an empty bucket; alias pairs form one federation; original rows/references remain unchanged; helper consumes no RNG; unrelated federation names are not broadened.
3. Use actual drawCountries, respinSlotCountry and fitsSlot on explicitly synthetic fixtures. A deliberately sparse positive fixture forces the added nation into a slot it can fill. Check eleven selected distinct canonical nations and a real eligible candidate for every assigned slot. Include verified secondary-position acceptance and the keeper boundary.
4. Cover empty/under-eleven and no-GK/no-cover refusals without timer/budget/completion changes, no-alternative respin spending, duplicate-name rejection, and unchanged original inputs. Do not call refusal a solver theorem.
5. Actual-page Green tests switch modes after fetch, then start, catching stale callback dependencies. Prove selected-data propagation into respins, reel and suggestions, mode labels in play/results/share, retained choice on replay, and a fresh choice applied to the next run.
6. Keep effective controls focused on these outcomes: bypass the new pool, leak an outside-field nation, omit canonical merging, or restore the stale start binding. Require an actual changed source/copy and owned failure plus exact restored pass when selected. Do not create a broad new proof framework.

Fixtures are disclosed fictional test players, never new application/sports data. A deterministic Classic fixture with the same RNG tape must retain the core result and consumption. Do not consume randomness in availability rendering or a speculative preflight draw.

## Remote verification and evidence

Use the existing ordinary source-push pipeline from an exact reviewed parent. No local app, Node/npm, parser/compiler, browser, Git or dependency execution, and no CI dispatch/rerun/cancel. Use locked dependencies, the original offline guard, finite existing process limits and complete source/dependency/generated/end holds. Retain native child exits, raw output, exact case census and partial failures.

After focused Green, run real app TypeScript, production build, applicable existing WorldXI position/report/season guards, all18 completed-dist readers and unchanged fatal weight caps. A network-dependent check remains explicitly unverified/refused under its original guard; never count a blocked read as a game pass.

Review actual production browser geometry and original PNGs at phone and desktop widths in normal/reduced motion. Exercise setup choice, current pool count, valid play/slot rejection, respin and replay with clearly declared synthetic pool input where needed. Check44px mode targets, no page overflow, useful focus and no jumps after explicit preparation. Fixture coverage is not a live nation-count or official-roster claim.

Root and an independent peer examine raw evidence and actual pixels before scoped admission. Main merge/publication stay with Owner I. Build weight, live pool count and playable2026 count remain UNKNOWN until actually observed.

## Source provenance

The retained1952 source.tar is an immutable witness for these b20 WorldXI bodies because that qualified child changed only DailyRail, its Home workflow and a docs append. Page:32711bytes/Git8bfda7ebab01f5af2c5e12e0b98611e74c141d83. Core:67740bytes/Gitd30a6de90d868e789a76d21cf8b87696786f89d2. Exact pins and source limits accompany this outside proposal.

The separate two-source field discovery is9872bytes/SHA2202abc8c43ad366be43e9a3692d13b8150eb8af9d0ee6b1fed943254106bebb. It binds current b20 source plus existing WC2026_GROUPS and official field sources. Its earlier membership-only recommendation is superseded here by Root's selected cloned-map merge. No new country, player, squad or runtime data is authored by this plan.

## Execution ledger, 2026-10-26, before final verification

The source design is implemented at e113bb232f1bbc38abc7c8ce40830b2ba5cf14e9. Baseline40267999442/a1 is admitted from actual owned RED; the prior failed baseline remains refused. Generation40270445637/a1 is independently admitted from originals: actual app types0, all17 related cases PASS, Expanded and2026 filter source faults each own their intended failure, and exact source restoration returns both page cases to PASS.

The scoped generator changed only the World XI snapshot, sitemap and lastmod ledger. Actual new blobs are e11ee10b5f525c91341db3c2621174b2388abeb9, e3721eca8f3e6a2dbb41afc993dc9c1242ce23c1 and4b4aafa562a9601b9e4f482375418670f04a0ed7 respectively. Other source bodies, sitemap rows and ledger records remain held. Public snapshot and completed-dist copy differ only by the unchanged build plugin's exact normal asset injection.

Final verification is a later ordinary commit adopting those actual outputs, browser harness and these documentation appends. Its scope is types/build17, the two local WorldXIReport/SeasonReport sims, all18 completed-dist readers, original fatal caps,12 real-page fictional-transport contexts, six effective copied-observation geometry controls and manual original-pixel review. The harness keeps all imported runtime evaluation inside its main function.

Source inspection confirmed the two older live-pool gates cannot qualify under the original offline guard. simWorldXiPositions and simWorldXiDefensiveMids stay UNVERIFIED and required for a big production ship. This is consistent with the original plan's blocked-read rule; neither is silently counted as PASS.

At the time this ledger is authored, final clean-source/browser/readers/caps/pixels remain pending. The later draft PR and closure packet record actual results. No real roster count, official squad, whole-site/full-suite or live publication result is inferred. Main integration and publication remain with Owner I.

## Followup after the first final run

Actual final40272503815/a1 remains refused. Its two stale derived-content gates and390px replay hit failure were investigated from retained originals. V5 centers only the existing two group observation preparations; no hit predicate or gameplay condition changes.

Qualified derived40276093890/a1 executed the two existing normal generators and retained actual before/after/partial bodies. Only the intended guide record and search index changed. All130 other frozen routes, the World XI example, all133 search keys and other132 keyword values remain held. Three physical copied-output controls prove the output judges, not product gameplay.

Adopt exact actual Gite0ca753ea4ce4fb1ab1781ee424085b03cc81878 and Gitc392d26946dc120410560f8e2b44390896259e11, then run the unchanged strict final verification protocol on a fresh source commit. Final types/build/test/sim/reader/cap/browser and pixel results are pending when this append is authored. Keep the two live-roster gates explicitly unverified and Owner I integration/publication separate. The earlier failed run is never reclassified.
