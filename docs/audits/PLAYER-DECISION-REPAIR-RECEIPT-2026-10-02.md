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

## Release R merge and second batch

Merged both source lanes atd2466763. Only WORKBOARD/PROJECT-STATE conflicted;
both sets of entries were retained. Claude'se641a405 handoff reports Release R
published at01:29 EDT, deploymentb710846e, entryindex-DIZtEVXD.js. This lane
did not verify that live report. The database incident remains open and no
production requests were resumed. The pre-merge held-publication wording above
is historical; this lane's new source still has no publication credit.

Parked only the overlapping paused football guide in a scoped stash named
"Paused Codex845 football guide before Release R merge, preserve for later
review". Earlier stashes, other paused drafts and old untracked files remain.
No stale guide was applied over Release R's actual53 roster text.

Fresh clean Git archive from the merged head:
TEMP/dukb-release-r-codex863-866-offline. App type gate0, build0 and all15
offline built fences pass. Entryindex-BJXDNBsH.js, SHA256
f7c01fe29b4765468e7583c61664bd8d0309508fcac70bea3926f091bee66004.
`DB_PROBE=unreachable` prevents the runner's automatic REST probe; only named
offline guards ran. Boot contexts held Supabase requests before transport.

Seven source harnesses: six passed in the concurrent runner; Silverware's
actual page case returned STACK_TRACE_ERROR and the runner exited1. Retained
source-863-866-gate.log. With source/assertions/timeouts unchanged, one-worker
direct replay passed10/10; its normal and all three copied controls then
passed. Cause of the first failure is not proved. Reduced test worker overhead
using supported VITEST_MAX_FORKS/VITEST_MIN_FORKS environment values, without
changing shared config or relaxing expectations. Replay/control logs retained
in that archive. This merged proof predates868-870 runtime additions.

Accepted source863d7c3c755,8650a1942fe,86689373f3f and merge/claim8724ceac
were pushed after integration.864f0c70331 was already on main. Preview/source
pushes alone are not live deployment proof.

## 867: Guess the Nation reload driver

URL: `/guess-the-nation`. Product is unchanged.

The driver mistook831's transient feedback status for a completed ResultScreen.
One selector now requires the result card's actual h2 before treating it as
finished. Normalized original/current driver differ by exactly that line;
all stimuli, score/fingerprint/save/corruption/booking assertions remain.
The one-hint path still earns1100 and verifies restored clues.

Before5 Nation checks failed,2 independent discovery/restore-handshake checks
passed. After7/7 pass. Clear-save control rejects restore and rebooking with
the other3 Nation baselines held. Silent-mark control rejects duplicate booking
only with4 held. Existing source mark/date controls also reject their defects.
Before/after logs and receipt: TEMP/dukb-daily-reload867-2026-10-02-a1.
No timers, expectations, gameplay or data changed. Commit19b179e8 pushed.

## 868: Club Manager contract decisions

URL: `/club-manager`, Squad Contracts.

Original pure renewContract/renewContractWithClause produce visible term,
fee, clause, remaining transfer kitty and weekly bill. Remove shows the full
plain renewal behind that action. Signing shortfall and soft-cap pressure are
visible before signing. Original callbacks, affordable over-cap signing,
engine/save/data stay unchanged. New renewal buttons have44px targets.

13 focused actual-screen/engine cases pass, including matching signed state
and real saveCareer/loadCareer recovery. Test careers use existing Brentford
players with controlled simulation contract boundaries, no historical fixtures.
Before10 missing-preview failures and3 independent baselines held. Budget/fee
copied controls each reject9 quote assertions with4 held; cap rejects2 warnings
with11 held. All13 run per control,0 pending/unhandled; actual source/test/engine
bytes held and owned copies cleaned. Receipts TEMP/dukb-868-contract-before.json
and -after.json. Commite9cfb96f pushed. Native and final combined gates follow.

Peer review caught one own forecast error before final acceptance: loadCareer
does not fill absent wageCap. The old-save renewal keeps it absent, so actual
next card derives its fallback cap from next wage bill, whereas the first
forecast printed the current fallback. Corrected denominator/warning/delta
from actual next state, no engine rule change. Two new committing old-save
cases compare forecast with actual signed header and save/reload.

Expanded15-case before:12pass/3 exact legacy quote failures; after15/15. Budget
and fee controls each11 targeted failures/4 held, removed warning2/13. New
legacy control changes the actual nextCap initializer once back to current
cap and rejects exactly the three missing-cap outcomes,12 held. All15 run,
0 pending/unhandled, source bytes held and owned copies cleaned. Before proof
TEMP/dukb-868-legacy-cap-before.json. Peer review confirms the finding is closed.

## 869: Club Manager calendar return

URL: `/club-manager`, Home Calendar.

Current date uses seasonDays(career).today on the current render and clears
the inspected day. Only component view/selection change. No simulation,
training, save or automatic month-following was added. Existing bounded month
browsing/fast forwards remain. Added button is native with44px minimum height.

8 actual-screen/real-calendar tests pass; before6 intended feature failures
with2 original browsing/callback baselines passing. Test careers start through
the existing engine, with explicit simulation-week/season boundaries for
advanced-date checks. Five controls (view, selection, current date, accidental
simulation, target size) each reject exactly1 intended assertion,2 original
baselines pass and5 explicit selected skips. Do not count those skips as passes.
Normal runs all8 with0 pending/unhandled. Raw source/test/engine bytes held,
temporary component copies cleaned. Receipt TEMP/dukb-calendar869-2026-10-02-a3.

Initial test used unsupported ByRole exact:true, removed before handoff. Another
test assumed today's border is always primary, but existing January window
styling makes it gold. Assert existing today background/bold date text instead;
no product styling changed. Final anchor fence554 parsed scripts,119 multiline
guards,123 normalized reads pass. Native Enter/mobile geometry are pending here.

## 870: Player Bingo earned bonus

URL: `/player-bingo`.

When a placement completes two extra lines the old banner says+100 although
score actually increases200. Flash now stores the actual line delta's points
and displays them, with polite status and the existing1800ms lifetime. Only
the extra-line animation gets motion-safe classes; first-line motion remains
unchanged. Score/placement/bank/continue/blackout/deck/completion branches are
unchanged. Existing start and effect cleanup clear pending feedback.

Seven actual-page cases use explicitly fictional criterion/deck boundaries
and the real layoutGrid/countCompletedLines, placements, score, share and
ResultScreen booking. Before5pass/2 intended failures; after7/7. One-line100,
intersection200 with real300 total, first-line bank100 and blackout1700 all
verified. Incorrect placement, skip, final deck, exact booking, replay/unmount
and feedback lifetime hold. This does not verify native/mobile or real data.

Four controls: constant1001 failed/6 held, cumulative delta2/5, missing status
1/6, unguarded motion1/6. All7 run,0 pending/unhandled. Actual executable
anchors change once, CRLF binding checked, source/test/line/recording bytes held
and owned copies cleaned. Unchanged existing scoreShown Bingo first-bank/
blackout cases pass2/2 with14 other cases explicitly unselected. Peer source
review clear. Exact receipts TEMP/dukb-player-bingo870-2026-10-02-a1.

## Final accepted-files gate and management native

Copied only accepted868-870 files into the existing clean merged archive,
including final legacy cap correction. Initial final app type gate found four
TS2322 test inference errors: fixture made contractYears required, but observer
receives CareerState with the supported optional field. Added an explicit
fixture return annotation, no test stimulus/expectation changed. Original
final-868-870-type.log retained; repaired type exits0 with empty output.

Bounded the now-expanded granted-clause quote list with the existing256px
overflow-y-auto pattern. Final build0,12 selected source guards0 and all15
required built fences0. Entryindex-OjecPy7M.js, SHA256
b9fc28441893467b73f8b63257f79f6db5dd772c11b4c3f4cbceae19bd543bcd.
Logs final-868-870-build-repair.log, final-source-gate.log, final-built-gate.log
in TEMP/dukb-release-r-codex863-866-offline. No suites read writing dist;
DB_PROBE=unreachable stops automatic live REST probe, Boot holds Supabase.
112 new runtime cases across the seven product scopes pass. Full live-reading
suite and whole-site sweep remain deliberately unrun.

Native management6/6 cases,254 assertions,24 screenshots on that exact build:
plain and clause renewals at320/390/1440 via actual Enter/click; actual new
careers, no injected save, data/engine/RNG replacements. Every quote matches
fee, remaining kitty, duration, wage, clause and weekly bill in actual signed
save, then reload/resume. Other players and career week stay unchanged.
Plain4yr/46k costs£8.3m, leaves£60.7m, bill678/773; clause4yr/40k costs£7.2m,
leaves£61.8m, exit£17.3m, bill672/773. Values are generated simulation state,
not real athlete contracts. Legacy/over-cap saves are covered by focused
engine cases, no native old-save injection was used.

Three calendar widths browse/select a day, then Current date returns to
August2026 and clears selection while exact career-save bytes stay unchanged.
Clause list's computed256px/auto scrolling and44px Remove access hold after
grant/reload. Quotes/cards have0 sideways overflow,0 clipped quote text.
Root and agent inspected representative phone screenshots. These six cases
verify phone-width layout plus mouse/keyboard, not true touch interaction.

Owned headless contexts use serviceWorkers:block and install all-URL routing
before first navigation. Only exact local origin can continue; all outside
HTTP/WebSocket connections blocked.423 attempts intercepted,0 external
responses/unexpected local writes/page errors. Browser and contexts close in
finally. Receipt and visual notes TEMP/dukb-868-869-native-2026-10-02.
No user browser connector or visible tabs.
