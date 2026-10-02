# Player decisions and feedback, 2026-10-02

## Scope and coordination

Pulled main before work at3f9d517a, then pushed claim9ef17d11 for four
disjoint scopes. Three agents built863-865; root built866 and integrated the
batch. Preserved Claude's848-851/held scopes, paused842-845 drafts, untracked
old packaging/assets and the retained scoped stash. No backend, sports data,
ad placements, authentication implementation or simulation engines changed.

The four runtime changes are described below. These are source repairs,
not a whole-site audit, completed-game declaration or AdSense approval.

## 864: Club Manager facilities

URL: `/club-manager`, Facilities screen.

`src/components/club-manager/FacilitiesScreen.tsx` previews the existing pure
`upgradeFacility` result. The next level/effect and remaining transfer kitty
match the actual engine purchase. Unaffordable/max states explain their reason.
Original one-tap callbacks, costs, save and engine are preserved. Buttons44px.

11 actual-screen tests: before9 failed missing quote/reason outcomes with2
independent callbacks/focus baselines passing; after11/11. Two executable
component-copy controls, missing forecast and wrong budget, each fail exactly7
rendered quote outcomes with4 independent baselines passing. All11 run each
time,0 pending/unhandled, raw source/test bytes held and owned copies cleaned.

Actual new-career native6/6 cases,147 assertions, on the built site:

| Width | Actual action | Engine/save result |
| --- | --- | --- |
|320 | Brentford dressing room, Enter | Level6 to7, £69m to£53m |
|390 | Brentford medical, click | Level6 to7, £69m to£47m |
|430 | Brentford training, Enter | Level6 to7, £69m to£42m |
|1440 | Brentford stadium, click | Level7 to8, £69m to£12m |
|390, reduced | Brentford medical, Enter | Level6 to7, £69m to£47m |
|320 | Manchester City maximum stadium | Level10, disabled action preserves save |

Every purchased forecast became the actual displayed effect and persisted
through five reload/resume paths. The actual stadium purchase leaves an£81m
next cost and£69m shortfall; disabled Enter preserves the raw save. No save
injection, real roster changes, overflow, page errors or intercepted writes.
Sixteen screenshots retained, three representative screenshots inspected.
Receipts: TEMP/dukb-864-facilities-native-2026-10-02/report.json.

Two unsuccessful driver receipts remain: the first incorrectly required a
facilities block in an initial save that legitimately uses `facilitiesOf`
defaults, and used an assumed Madrid option. The second incorrectly compared
the CSS-uppercase heading case. Only the disposable driver changed; the final
actual City and purchase paths passed. These attempts are not counted as wins.

Source commitf0c70331. Its first push met Claude's newer incident commit;
merge160de45d retained both workboard entries and pushed successfully.

## 863: Ball Knowledge IQ

URL: `/ball-iq`.

`BallIqBoard.tsx` and local `BallIqFeedback.module.css` add explicit correct/
wrong feedback and actual answer, submitted/correct tally, accurate submitted
progress, focus on enabled Next, first accepted pick protection and finite
420ms emphasis with600ms owned cleanup. Reduced motion remains static. Hook,
questions, IQ weighting, saves, share and booking are unchanged. No Unlimited
mode exists in this game, so it was not invented or counted as tested.

11 actual Board/hook tests: original9 failed/2 independent baselines passed;
after11/11. Full mixed twelve-question run preserves IQ106/payout1060, picks,
index, save, share and exactly one completion. Perfect finish preserves IQ160/
payout1600 and quiet reload. Thirteen controls each reject1 specific outcome
and pass1 full mixed scoring/save/booking baseline, with9 explicit selected
skips. The skips are reported, not counted as executed cases. Raw source bytes
held, exact real anchors changed in temporary copies, cleanup verified.

Receipts: TEMP/dukb-ball-iq-863-2026-10-02-a1/before.json and
TEMP/dukb-ball-iq-863-2026-10-02-a3/control-exits.json.
Peer source review found no blocker. Native layout/motion/daily acceptance is
pending database recovery. No native success is credited.

## 865: Tennis and NASCAR Chain

URLs: `/tennis-chain`, `/nascar-chain`.

`useTennisChain.ts` and `useNascarChain.ts` assign synchronous request ownership
and a pending ref. Give Up/reset/start/unmount invalidate old replies. Response,
catch and finally only affect the request owner. A stale finally cannot clear
a newer pending check. Same-frame submissions cannot start duplicate requests.
Existing acceptance, rejection, fail-closed retry, multipliers, badge and
completion behavior remains intact. No Board/data/validator backend change.

Original44 deferred real-hook cases:32 failures and12 independent baselines.
Final50/50 include direct mode-start and same-frame input. Guard removal in
isolated hook copies yields exactly32 intended failures/18 independent passes;
unmount removal yields4 failures/46 passes. All50 run,0 pending/unhandled;
actual normalization receives full CRLF input and original raw bytes remain.
Receipts: TEMP/dukb-chain-request865-2026-10-02-a1.

Peer source review found no blocker. Native20 cases failed their unavailable
autocomplete prerequisite before any validator POST, so0 native passes are
credited. A bounded probe showed actual search GET starts without responses,
not a scoring or request-ownership failure. Both contexts/browsers closed.
No synthetic autocomplete rows were added to bypass the incident.

## 866: Silverware Sort

URL: `/silverware-sort`.

`useSilverwareSort.ts` replaces the3.4s auto-advance with a consumed pending
result and actual `advanceReveal` action. `SilverwareSort.tsx` shows earned
rungs/points, keeps the real-count reveal readable, focuses Next board and
names the final action See results. Rules explain that advance. Two tries,
locked greens, counts, scoring and immediate daily save/booking are preserved.
Mode/replay clear pending results; repeated Next cannot erase the next board.

Ten real-hook/page cases pass: daily/Unlimited persistence past10s, first and
final misses, duplicate edits/Next, immediate final booking, reload, mode/replay,
dealt-day midnight and actual page action/focus/earned outcome. Fictional
boundary rows are clearly labeled in test fixtures; generator/judge/save/
completion remain real, no fictional history ships. Original persistence
tests both failed on changed boards after10s. That targeted before run skipped
the other8 cases intentionally and is not represented as a full before suite.

Three controls: auto-advance4 intended failures/6 independent passes, repeated
advance1/9, removed focus1/9. Every control runs all10,0 pending/unhandled;
source bytes held and temporary copies cleaned. An initial page driver was
too broad for jsdom role scans; scoped it to the actual board and omitted only
unrelated navbar/UI boundary, without changing outcome expectations. An
initial test used Playwright's `exact` option in a Testing Library role query;
the real app type gate rejected it and it was removed. Final type gate passes.

Existing no-double-record driver now advances Silverware through the real
player action. All original scoring/save/booking assertions remain. The late
daily-state control is rebound to manual advance only for Silverware; other
two hooks keep their prior control. It fires exactly6 intended failures with
61 independent table/check baselines passing. Normal full67 rows/checks pass.

The source guard also had a stale Buzzer predicate excluding only practice,
although the existing product excludes practice and contest. It now binds the
exact current daily/Unlimited predicate plus booked/phase definitions. Its
in-memory control flags only Buzzer. The existing real25-shot contest control
proves the legacy predicate would wrongly book a contest while the independent
daily/Unlimited/restore baseline holds (1 failed,1 passed,2 explicit skips).
Normal contest4 and practice11 cases pass. No arcade product change here.

Peer source review found no blocker. Native before/after Silverware load attempts
could not get champion data, so no native gameplay/layout pass is credited.

## Offline integration before Release R

Only accepted files copied into the clean production archive at
TEMP/dukb-repairs846-854-production. Paused local drafts excluded.
App type gate0; first and final build0. Final asset index-0qm1-PGv.js, SHA256:
182978dfc6f2a549b0ec28a6fbb1fe52eeeae07272cc0af5cf95b38cc0ee37ec.

All7 selected source harnesses pass via `runAllSims`: the four new guards,
NoDoubleRecord, ThreePointContest and BuzzerPractice. This includes82 new
focused cases and67 existing recording rows/checks. All543 harnesses parse,
and the anchor fence accepts all117 harnesses with multiline source anchors.
It initially rejected raw byte-holder flow in the new reveal guard; scoped
raw preservation assertions separately from normalized matching, then passed.

All15 required built fences pass, including real offline PrerenderBoot with
Supabase requests held before transport. No harness ran against writing dist.
The full runAllSims/live sweep was not run. Never run its live-data group while
the incident remains open.

Scoped three-clock Silverware prerender passed. Game publisher copy did not
change; its only diff removed an older captured cookie-banner paragraph. Held
the original public snapshot to avoid an unrelated rewrite, regenerated the
sitemap with170 dates unchanged,0 rewritten, and rebuilt to reinline assets.
No public snapshot/sitemap/ledger changes are included in this batch.

## Database incident and limits

Claude's65e08480 workboard notice reports production query starvation/timeouts
since00:10 EDT after migrations/release sweeps. Both lanes stopped production
tests. Root retained the notice and acknowledged it in merge160de45d; the
local4934 server and all owned native contexts/browsers were stopped. Source
and built checks after that are offline. No resource purchase, database repair
or additional production probe was attempted.

Early native diagnostics recorded no returned data, not proof of no GET starts.
Bounded uninstrumented SDK probe confirms auth initialization and guest session
resolution succeed, locks held0/pending0, while actual SDK and direct GETs do
not return within10s. One independent public Node read timed out at12s. These
are a transport boundary, not proof of a new auth bug. Earlier loop/SDK theories
were rejected. Diagnostic receipts and unsuccessful attempts remain private
in TEMP/dukb-ball-iq-863-sdk-2026-10-02-a1/a2 and
TEMP/dukb-repairs-native-2026-10-01.

One bounded diagnostic hung before it had a deadline. Closed only its verified
owned headless child so finally wrote the receipt and closed the context;
subsequent probes had explicit deadlines. No visible user tabs/connector used.

No approval or publication claim. Main source pushes reach preview only.
Claude pushed Release R source while this batch was being committed; its
publication remains held. The offline checks above predate that release and
do not verify its merged result. Local863d7c3c755/8650a1942fe push attempts
were rejected by remote advances. Root will merge and check the combined
source offline, then push. After recovery, complete real-data browser
acceptance for863/865/866 and verify live assets before publication credit.
