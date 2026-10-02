# Quality repair backlog and review checklist

## Repair status after the initial audit, 2026-10-01

Codex846,852,853,854,855 and856 are verified main commits, with acceptance
and exact limits in `QUALITY-REPAIR-RECEIPT-2026-10-01.md`. QA847-01,05,06,
07 (shared HowToPlayPopover),10,12 and13 are repaired in source;11's NFL/NHL
portion is repaired. Publication has been handed to Claude and is not claimed
here.857 claims11's Soccer Career page-boundary recovery;858 claims the other
shared RulesGate consent/focus behavior. Claude848 owns02/03/04,849 the reviewed
data corrections,850 lost Soccer seasons and851 NBA/MLB schedules and NBA
trade eligibility. All original reproductions and proposed rows below retain
their audit-time meaning. Do not treat old paused-status text as current.

This is a proposed repair plan from Codex847's audit, not code that has shipped.
Read `FORENSIC-QUALITY-AUDIT-2026-10-01.md` for reproductions and the linked
specialist reports for original evidence. Claude848 owns QA847-02/03/04.
Codex846's QA847-01 implementation remains an unaccepted, paused local draft.
Data changes need a separate source-backed review before production writes.

## Top20 problems and review flags

There are14 verified product defect families and seven data findings/flags.
This list ranks20 of those21 groups. A source disagreement or absent provenance
is labeled as such; it is not counted as a newly proved false sports fact.
No new sitewide P0 outage was reproduced in the measured flows. Individual
corrupt local saves do break their routes under their stated prerequisites.

| Rank | Priority | Finding | Evidence class and consequence |
| --- | --- | --- | --- |
| 1 | P1 | DQ01,69 NHL corrupt records | Impossible season/arithmetic fields; two-source correction proved for a sample, other correct values unknown |
| 2 | P1 | DQ02,161 MLB corrupt records | Impossible dates and total-bases identity; latent table corruption, no wrong current game result proved from these rows |
| 3 | P1 | QA847-09, unfair NBA/MLB schedules | Three actual complete regular seasons; unequal game counts and raw-win seeding |
| 4 | P1 | QA847-14, retirement declines lose years | Native Soccer Career loses six seasons and drifts age/calendar six years |
| 5 | P1 | QA847-01, abandoned reveal changes fresh run | Four live native correct/wrong restart cases at phone and desktop widths |
| 6 | P1 | QA847-08, incomplete trade selection | NBA/NHL expose eight of13 roster players; NHL excludes both goalies |
| 7 | P2 | QA847-11, simulation corrupt-save recovery loops | Soccer/NFL/NHL repeat error boundary and keep invalid save; deliberate local corruption required |
| 8 | P2 | DQ03, Lundqvist points46 versus27 | Source entry wrong by two independent publishers; current pair ordering would not invert |
| 9 | P2 | QA847-12, Footle currency relabeling | Actual Daily and Unlimited results present stored USD values as EUR |
| 10 | P2 | QA847-03, malformed Daily recovery | Nine actual Higher or Lower routes crash from valid-JSON malformed guess logs |
| 11 | P2 | QA847-02, stale-tab progress loss | Normal two-tab AFL Daily play overwrites two decided rounds with one |
| 12 | P2 | QA847-04, missing skip target | Target absent on19 routes; native Free Kick failure and Footle comparison |
| 13 | P2 | QA847-05, account dialog focus loss | Native Escape returns focus to BODY instead of the exact opener |
| 14 | P2 | QA847-06, misleading account description | Live signup copy contradicts guest leaderboard and completion accounting |
| 15 | P2 | QA847-13, inaccurate untimed-play claim | Accessibility claim contradicted by native default solo45s countdown |
| 16 | P2 | QA847-10, toast blocks advance | Narrow pointer hover blocks Soccer Next Year; native touch persistence unproved |
| 17 | P2 | DQ05, incomplete verification |398 soccer club-stat cells explicitly unverified;129 single-publisher caps; NFL category fence gaps |
| 18 | P2 | DQ04, Bo Nix source conflict |15,351 versus15,352; publisher convention requires adjudication, not an automatic change |
| 19 | P3 | QA847-07, visible cookie choices outside focus trap | Initial Footle help blocks Tab to consent controls; Escape workaround exists |
| 20 | P3 | DQ06, ambiguous MLB roster snapshots |17 IDs have conflicting undated team fields; no active game consumer located |

DQ07, incomplete displayed career team/constructor lists, remains in the data
report. The list has no declared completeness convention, so its correct
resolution is source-backed completion or a clear label.

## Top20 gameplay problems

Only11 gameplay/recovery/interaction families were verified: QA847-01/02/03,
04/07/08/09/10/11/12/14. Their rank follows the table above. QA847-05/06/13
are shared focus/copy defects, reported separately. There is no invented
twelfth through twentieth gameplay defect. Multiple routes or corrupt values
do not turn one shared bug into many unrelated findings.

The highest-priority gameplay repairs are the unequal schedules, lost career
seasons, old answer timers and inaccessible trade depth. More animation would
not correct those outcomes. Save recovery comes before calling a simulator
complete. The four bounded signed-out NBA/NFL/MLB/NHL career samples and a full
Soccer life do not establish every branch, contract, injury or post-retirement
path. Exact coverage is maintained in the inventory and specialist receipts.

## Exact proposed repairs

Every relative URL in this table is on https://douknowball.com. File references
identify the current source responsibilities, not a newly applied patch.

| Affected URL(s) | Code/content target | Required outcome |
| --- | --- | --- |
| /higher-lower | src/hooks/useHigherLower.ts; paused846 coverage | Cancel or invalidate the old owned reveal callback on give up, reset and unmount; retain normal reveal timing/scoring |
| /afl-higher-lower, review every daily-hook consumer | src/hooks/useDailyPuzzle.ts and existing persistence helpers | A stale tab adopts newer valid progress and cannot overwrite it; synchronize storage events |
| /nfl-higher-lower, /nba-higher-lower, /mlb-higher-lower, /hockey-higher-lower, /cfb-higher-lower, /f1-higher-lower, /tennis-higher-lower, /golf-higher-lower, /afl-higher-lower | shared Daily restore and game deserializers | Validate array and item shapes, dates/version/ranges; recover the damaged game's state without clearing unrelated saves |
| All19 QA847-04 URLs listed in shared.json | src/App.tsx, shared layout and actual main landmarks | Exactly one reachable skip target with native focus movement on bespoke pages |
| / header Log In and Sign Up | src/components/layout/Header.tsx; src/components/auth/AuthModal.tsx | Restore the exact connected opener on Escape/close and preserve normal focus trap |
| / Sign Up, shared modal | src/components/auth/AuthModal.tsx | Describe guest local progress/public participation and account-linked persistence accurately |
| /footle initial help/consent | src/components/CookieConsent.tsx and HowToPlayPopover/dialog coordination | Visible cookie controls are keyboard reachable without bypassing the actual consent decision |
| /nba-front-office | src/components/nba-front-office/NbaFrontOfficeBoard.tsx | All eligible own/opponent players reachable in both trade paths; existing trade rules preserved |
| /nhl-front-office | src/components/nhl-front-office/NhlFrontOfficeBoard.tsx | Same full eligibility requirement, including goalie choices |
| /nba-front-office, /mlb-front-office | src/lib/nbaFrontOffice.ts, src/lib/mlbFrontOffice.ts | Sport-specific balanced schedules, consistent total games and one-time result booking before seeding |
| /soccer-career | src/pages/SoccerCareer.tsx; src/components/ui/sonner.tsx | Notifications do not cover fixed primary controls at narrow pointer/touch widths |
| /soccer-career | repairCareer/restore in src/lib/soccerCareerEngine.ts and SoccerCareer; route error recovery | Validate nested save shapes and keep a usable confirmed recovery/reset path |
| /front-office, /nhl-front-office | respective state restore, board and RouteErrorBoundary | Reject missing/range-invalid league fields; offer recovery without repeatedly loading the same broken state |
| /footle | src/pages/Footle.tsx result fact; existing formatter in src/lib/gameLogic.ts | Use the stored USD unit consistently, or explicitly convert with provenance |
| /accessibility | src/pages/Accessibility.tsx | Correct timed-mode and skip-link claims to match tested behavior; update its date when substantively changed |
| /soccer-career | advanceProSeason/declineRetirementSuggestion in src/lib/soccerCareerEngine.ts | Declining retirement completes the same pending season, with one age/calendar advance and actual history/finance consequences |
| /club-manager and catalog/home copy carrying its count | src/data/gameRegistry.ts and relevant rendered/static copy | Qualify20 as league/conference options, including the two MLS conferences; do not equate selector count with20 independently verified distinct competitions |
| /hockey-grid, /perfect-season-nhl, /puck-detective data paths | public.nhl_player_stats import and validation | Flag the69 raw records; verify each corrected field and reimport through a reviewed migration; do not derive historical points from already shifted G/A |
| No active wrong game result demonstrated from malformed MLB rows | public.mlb_batting_stats import and validation | Review161 raw records; correct only sourced fields; resolve source conventions for Bridwell GP and final year |
| /hockey-higher-lower | src/data/hockeyHLPlayers.ts and its verification ledger | Review27 points for Lundqvist with season/source/retrieval dates; retain explicit limits for unverified fields |
| /cfb-higher-lower | src/data/cfbHLPlayers.ts, public.cfb_qb_stats and source record | Adjudicate Bo Nix publisher convention; update source and date together if corrected |
| /higher-lower, /face-off, NFL comparison categories | selected datasets and verification records | Finish independent fact checks where absent; preserve unverified labels and historical snapshots |

Confirm exact export/filename targets against the live repair branch before
editing. These instructions do not authorize guessed historical values.
The claim matrix also distinguishes100+ declared event cards from100 verified
meaningful/reachable decisions, and selected real-player seed rosters from
complete current squads. Keep those distinctions in any proposed copy repair.

## Page repair, consolidation and indexation decisions

- Repair the game and shared-interface routes above. Corruption tests requiring
  local tampering do not prove that their fresh public pages lack value.
- No entire useful game, sport hub, grid archive or record book is recommended
  for deletion from this evidence. The170 sitemap pages had unique descriptions,
  one canonical and no noindex in the tested raw/mounted documents. That is
  technical indexability, not proof of Google indexation or product quality.
- No pair of routes was proved to be a redundant product that needs wholesale
  consolidation. Shared descriptions/boilerplate alone do not establish a
  duplicate game. Retain distinct historical tables and distinct sports rules;
  use relevant related links rather than repeated full cross-lists when helpful.
- Keep private/profile/reset, internal search where intentionally excluded,
  retired redirects and unknown fallback pages out of the sitemap and ad
  inventory. The unknown200 fallback removes canonical and marks noindex; a
  real host404 status would be useful if hosting later supports it, but this
  audit did not find an indexable duplicate home at the tested unknown URL.
- If a later end-to-end test proves a published page truly empty or unfinished,
  repair it or temporarily exclude that exact route and its advertising until
  it serves a distinct useful purpose. Do not mass-noindex the catalog from
  source guesses or a crawler's old exclusion count.
- Do not turn generic guide text into a substitute for working gameplay.
  Paused842-845 copy drafts are not accepted changes or claimed audit repairs.

## Top20 AdSense readiness problems and open checks

This audit does not establish20 Google policy violations. The concrete product
readiness issues are the inaccurate units/data, unfair seasons, missing trade
choices, lost career years, restart race, save recovery, broken skip navigation
and misleading account/accessibility claims above. They should be repaired
because they harm the promised product. Calling each a confirmed cause of
Google's previous rejection would go beyond the evidence.

Google excludes ads on low-value, unfinished and no-content screens, and expects
publisher content to remain the focus. That supports fixing meaningful product
functionality rather than adding generic words. [Google publisher inventory policy](https://support.google.com/publisherpolicies/answer/11112688?hl=en).

### Advertising placements

The reserved-slot inventory visits every sitemap URL with stored Accept on
current Release P, intercepting vendor scripts locally.75 pages expose one
manual slot each, all slot7540487748, all with150px padding above the ins. No
duplicate slot, applicable noindex slot, page exception or no-slot AdSense
attempt was observed after seven sequential timeout retries. These are initial
reserved containers, not filled creatives. `evidence847/ad-slot-final.json`
contains all170 measurements; utility/no-slot consent tests are in the shared
report. No paid traffic, real ad impression or ad click was generated.

No new specific ad relocation is ordered from these measurements. Preserve
separation from controls and verify actual filled layouts, sticky controls,
results and postgame pages. Google's gameplay guidance recommends at least
150px from game interactions, and its policy addresses accidental clicks and
confusing play navigation. A padding constant by itself does not certify the
complete filled layout. [Google gameplay ad guidance](https://support.google.com/adsense/answer/2768340?hl=en).

Keep private, reset, fallback/error-only and navigation-only screens free of
ads. Verify that an error boundary unmounts a game's slot. Do not add more ads
or auto-placement just because space exists. The placement recommendation is
to retain intentional separate advertising and review real creatives when
available, not to surround every game with inventory.

### Policy disclosures and human review

Privacy/Terms describe non-personalized advertising after Accept and GA4 after
Accept. The tested browser attempts match that: none before consent/Essential,
one GA/one AdSense attempt with a deliberate slot after Accept, then removal
on withdrawal/reload. Actual third-party cookies, GA transmission and regional
messages were blocked and remain unverified. Non-personalized advertising
still has cookie/consent considerations. [Google non-personalized ad guidance](https://support.google.com/adsense/answer/9007336?hl=en).

No new verified contradiction was found among Privacy, Terms and the measured
script gate. Do not change policy dates merely to make pages appear current.
Correct the verified account/signup and Accessibility statements, which are
concrete trust inconsistencies. Retain accurate local-save, server-score,
FormSubmit/Gemini/Supabase and hosting disclosures, and verify they still match
each implemented service before release. Google requires privacy disclosures
to match the actual collection and use of its services. [Google publisher privacy policy](https://support.google.com/adsense/answer/10502938?hl=en).

Regional CMP configuration and actual account privacy settings need a separate
human review. Current Google guidance distinguishes certified personalized
traffic from possible non-personalized/limited traffic; this audit does not
infer CMP compliance or noncompliance from the site's own banner alone.
[Google publisher consent requirements](https://support.google.com/adsense/answer/13554116?hl=en).

Data licensing/source rights, trademark treatment and any age/privacy legal
conclusions require human review. The independent-project disclosures and
no-official-branding conventions were not converted into a claim of legal
clearance. No email, report, account deletion or legal request was sent.

## Games that cannot be called complete yet

Soccer Higher or Lower has a restart race. NBA and NHL Front Office omit trade
choices; NBA and MLB schedules affect fair seeding. Soccer Career loses seasons
on retirement decline. Nine comparison games and three simulations have
verified malformed-save recovery gaps. Footle has a result currency error.
These have functioning portions, but passing their normal loop does not settle
the defects. Other games marked not established in the inventory are untested
for completeness, not proven broken or placeholders.

## Final pre-submission checklist

Every unchecked item remains open. This checklist is a review gate, not a
promise of approval or an invented Google traffic/word-count threshold.

- [ ] Repair and independently replay the P1 gameplay defects on the actual published bundle.
- [ ] Review all69 NHL and161 MLB flagged records, using correct source conventions and no guessed replacements.
- [ ] Correct or quarantine verified visible wrong data/units, with source and snapshot dates.
- [ ] Resolve the Bo Nix disagreement with a recorded convention rather than declaring either publisher infallible.
- [ ] Complete the missing independently verified sports-data coverage or retain honest field labels.
- [ ] Verify normal, worst-case and multi-season decisions actually change management/career outcomes.
- [ ] Recheck reset, give-up, delayed reveals and rapid/held inputs after fixes.
- [ ] Recheck same-browser two-tab Daily progress and Eastern Time rollover using a clearly labeled clock test.
- [ ] Recheck malformed/outdated save restore and a usable recovery/reset path without erasing unrelated saves.
- [ ] Complete targeted winning and losing paths on important trivia/puzzle games; initial render is insufficient.
- [ ] Verify the remaining career, dynasty, manager, fight, arcade and guessing flows marked untested in the inventory.
- [ ] Verify keyboard focus, skip targets, help dialogs, touch controls and narrow result states after repairs.
- [ ] Recheck unique canonical, robots, sitemap membership/lastmod and unknown/retired paths on the deployed release.
- [ ] Review page-specific instructions/scoring/data context only where helpful; add no generic articles or filler FAQs.
- [ ] Test actual filled ad layouts without clicking ads, including sticky game controls and result states.
- [ ] Recheck no ads on empty/error/private/navigation-only screens and no excessive auto-placement.
- [ ] Test consent withdrawal in multiple tabs and match actual third-party behavior to the disclosures.
- [ ] Verify relevant regional CMP/account configuration and obtain human legal/data-rights review where needed.
- [ ] Confirm AdSense's exact current rejection/status in the account and record its date; a Search Console count is not that decision.
- [ ] Review the completed evidence on the actual published version before deciding to request Google's review.

Google determines approval. [Google's not-ready guidance](https://support.google.com/adsense/answer/12176698?hl=en).
