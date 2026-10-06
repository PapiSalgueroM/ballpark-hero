# Round1002 verification receipt

2026-10-03. PR122 accepted and merged. The final combined candidate is
`d89716d4a898fc315d2d700cfa3244944f8a4afb`, including Release AC main `c218` and
the unchanged accepted Footle work. All four applicable workflows passed.

PR121 merged as `e6356de4`, followed by PR122 as
`52281311d7b7871b954b67da163b5bfa9e87a2c8`. The tested CI merge
`c35a75a60575799c79e03f70ce6b0b7449742d7a` and actual PR122 merge share tree
`f61f0a27a9ef25172cf9a101d49035eb26d2df23`. Main `52281311` was published and
public gameplay verified. Lovable showed Published and "Your website is up to
date"; douknowball.com served `index-DxOcAtGp.js`.

## Player experience

NHL Connections now has four draft tabs, A to D, with counts and assignment
badges on the existing player tiles. A name can move between drafts or be
removed without spending a life. Only the explicit Submit five action checks
a group. A wrong group remains editable; a correct group locks and removes
its names from every draft. Worked help explains the loop before play and can
be reopened.

Notes use a separate versioned key for each mode and validate the actual puzzle,
canonical roster, four group limits and unique names before restoration. Loading
does not overwrite notes from the fallback pool. Daily progress keeps its existing
save shape. Unlimited restores a valid saved note document's available puzzle,
but starts with four fresh lives on reload, as the help states. Play Again saves
empty notes for the newly selected puzzle so an immediate reload cannot reopen
the previous puzzle.

The playing reveal targets the bounded whole bench. The draft tabs, editable
names, feedback and actions remain together after a submission in all four
verified viewports. Feedback
focus uses `preventScroll`; a local post-layout check reveals the same bench when
its heading is already readable but its action block falls below the viewport.
The final result retains its own reveal target. The shared reveal hook is held.

## Scope held

- Existing NHL puzzle records, group membership, four-life rules, Daily action
  shape and completion calculation are unchanged. One wrong submission followed
  by four correct groups records exactly 750 points once in the verified cases.
- Planning has no action-log, score, completion or streak effect. Daily and
  Unlimited notes are independent. Malformed, stale, foreign or duplicate notes
  fail closed. No new sports facts or data verification claim is introduced.
- No shared career, manager, scoring, completion or puzzle-data source was edited.
  No direct production database probes or local runtime gates were used for this
  round. Normal public interface loads are expected.

Product files are `src/pages/NhlConnections.tsx`, `src/hooks/useNhlConnections.ts`,
`src/components/nhl-connections/NhlConnectionsHowToPlay.tsx` and
`src/lib/nhlConnectionDrafts.ts`. Verification lives in
`src/test/nhlPlanningBench.test.tsx`, `scripts/simNhlPlanningBench.mjs`,
`scripts/qa/nhlPlanning1002.mjs` and `.github/workflows/nhl-planning.yml`.

## Evidence already observed

The initial `52de3935` core run passed the real app type check and build, all ten
new model/mounted cases, all fourteen effective copied-source controls, original
Connections loss/timer regressions and all seventeen built readers. Two verifier
configuration problems prevented an overall green result:

- The source-anchor scanner attributed a raw Buffer preservation read to the
  multiline mutation anchor. Separate local declarations now use the accepted
  preservation pattern. Raw-byte equality and normalized mutation reads remain.
- `NO_DOUBLE_ONLY=nhl-connections` did not name a row in the existing completion
  test table. The workflow now runs that existing table unfiltered.

The `2beac7d5` native artifact was downloaded and SHA256 verified as
`0275815f075892cb78db926a623b0ddf1d124034fdb8ffb740688cf39796787b`
(artifact `11278705489`). Its 390px, 430px light and 1440px profiles passed their
full gameplay/save flows without page, console or local asset errors. The 320px
profile stopped at a native overflow-control assertion: enlarging the page also
enlarged `innerWidth`, so the expected rejection did not happen. The check now
uses the configured browser viewport and proves the actual document width grew
beyond that bound before requiring the exact assertion failure.

Screenshot review then found a real presentation defect despite the three green
profiles: the 430px wrong-result image showed feedback and actions above the SEO
content while the draft tabs and all editable names were above the viewport.
The reveal ref moved from the inner receipt to the whole bounded bench. Native
verification now requires tabs, the name grid with at least two complete editable
names, feedback and Submit to be visible together before any driver scrolling.
A control recreates the old receipt-only scroll, proves the context disappears,
requires the precise visibility rejection and restores the viewport/save bytes.

The `433d0c23` artifact `11278443056` was downloaded and SHA256 verified as
`b27148ec06e590b5a17e538d9ce7c8c36cbeb17821a8eb3c9002850df88e601b`.
Its 320px and 390px profiles completed their full gameplay/save flows; all three
native controls changed the measured page, rejected as expected and restored it.
The 430px and 1440px profiles failed at `wrong-action`: their feedback appeared at
y850..890 and y910..930 respectively while Submit extended below the viewport.
Actual screenshots confirmed the cause. The shared reveal guard treated the
bench's first 160 visible pixels as enough, even when the new feedback pushed
the action block below the screen. A local check now covers that exact gap by
scrolling the same whole bench, retaining its tabs and editable names. The native
context/action assertions and all three controls remained unchanged for the
accepted final run.

## Accepted final evidence

[Planning run 37163262831](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37163262831)
and job `111320978950` passed. Artifact `11288930751` was downloaded and its SHA256
matched `a5cd856d0f51c1db2848920e0e7ca28f3f8856869e8c60647bb86dc5df3f9656`.
The extracted evidence is in
`C:/Users/antho/AppData/Local/Temp/dukb-puzzle-final-2026-10-03/d89716d4/planning/evidence`.

- All ten normal model/mounted cases passed. Each of the fourteen controls
  produced exactly its intended assertion failure, with the independent original
  completed-Daily restore case passing and the other eight cases skipped.
  Changed-source anchors and held raw source bytes passed. Stalls and runtime
  exceptions did not earn control credit.
- The real app type check, build, original loss/timer/completion checks, source
  anchor scanner and all seventeen built readers passed.
- All four native profiles passed: 320px reduced motion, 390px touch, 430px light
  touch and 1440px keyboard. Each completed a wrong submission followed by four
  correct groups and produced exactly one locally intercepted 750-point Daily
  completion request. Completed-Daily reloads kept their exact saved payloads
  and made no extra completion request. Independent mode notes and the 390px
  Unlimited loss/reset/immediate-reload path passed.
- All three native geometry controls changed the measured page, rejected at
  their intended assertion, restored state and passed their positive check:
  oversized bench, hidden feedback and receipt-only scroll that loses editable
  context. There were zero page errors, console errors or local asset failures
  across the four profiles.
- The artifact contains 25 native screenshots. Final 430px wrong-feedback and
  1440px correct-lock images were opened and independently reviewed. The tabs,
  editable names, receipt and actions are together. After the wrong submission,
  Submit now occupies y513..557 at 430px and y477..521 at 1440px, within both
  viewports. The earlier action-visibility defect is resolved without relaxing
  either the context checks or the controls.

[Waiver run 37163262828](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37163262828)
and job `111320965373` also passed. Its artifact `11287704999` reports SHA256
`b976253e882584b10398524937ed03016a68f7e5966fb29f24bdb33a25d64fca` in GitHub
metadata. That incidental workflow's artifact was not downloaded or independently
hash-verified; the accepted NHL evidence above was.

Native play used locally fulfilled existing puzzle fixtures, with external
requests intercepted. These checks verify interface, save and scoring behavior;
they are not a new audit of production sports facts.

## Published public play

The public desktop Unlimited flow was played through the normal interface on
the published bundle above. Worked help was read before play. Draft A held five
mixed names and draft B held five Blackhawks names. Reloading and returning to
Unlimited restored both exact five-name drafts. Submitting the mixed draft used
one life and retained all five editable names. Removing three names and adding
three replacements cost no lives; the revised Lightning group locked correctly.
Draft B still held its five names and then locked as Blackhawks. Completing the
Kings and Ducks groups finished the game at four groups found with three lives.
The public tab reported no errors.

Saved live screenshots are
`C:/Users/antho/.codex/visualizations/2026/10/03/01a10028-7165-70b1-90e1-1946dd227be4/nhl1002-live-wrong-retained.png`,
`C:/Users/antho/.codex/visualizations/2026/10/03/01a10028-7165-70b1-90e1-1946dd227be4/nhl1002-live-planning.png`
and
`C:/Users/antho/.codex/visualizations/2026/10/03/01a10028-7165-70b1-90e1-1946dd227be4/nhl1002-live-result.png`.

Public play covered desktop Unlimited only. Phone evidence is the remote native
verification above. This public check makes no Daily scoring claim and does not
constitute a new audit of the real sports facts.

One existing copy issue remains for follow-up: the Unlimited result share card
uses "today's NHL Connections" and a date. No actual share was sent. The wording
does not affect the planning notes, group checks or lives and was not changed
in this round.
