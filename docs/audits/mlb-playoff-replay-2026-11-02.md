# MLB playoff replay report, 2026-11-02

The Season Center now offers Replay playoffs for supported saved MLB hitter seasons. It reconstructs a repeatable order of wins and losses from the saved playoff finish and team game count, using the existing canonical round layout and series ordering. It does not invent game scores or individual per-game player stats. A replay of aggregate data is labelled before play and on the board.

The regular-season viewer stays mounted and pauses while the playoff panel is open. Back returns to the same review and restores focus to its opener. The rules open before play and reopen through ?. A single stable footer button retains native focus as its label changes through reveal, next game and replay again. Native Escape can therefore close the panel after the final result.

## Scope and preserved behavior

The feature changes the existing UsSeasonCentre host, adds a pure MLB replay helper and one panel, plus focused outcome tests and a discovered sim guard. The other sports, shared season engine, saves, RNG streams, original game results, career stats and completion writes are held. Pitcher entry remains as it was; the underlying pitcher poGames is a team-game count, so this is a UI coverage limit rather than a claim that pitcher data is impossible.

Unsupported counts, missing complete round layouts and pre-format seasons keep their honest regular review. The model cases cover all thirty-three supported modern finish/game-count combinations, rather than claiming every historical format.

## Actual baseline and correction chain

- Baseline17a4381779d8a91af6465f8dcbc79de05274c98a, run41383758859, job125079970398: actual types and holds pass; two named missing-entry AssertionErrors and four preservation passes. Earlier4634dfc6 was a test typing failure and receives no feature RED credit.
- First implementatione722c008, run41398861434: focused outcomes and six faults/restores pass; full ordinary units10,274 passed58 optional skipped0 failed715 physical files; build/all15saved-output readers/all16unchangedcaps pass. Browser bootstrap fails before browser execution because its compiler had no CSS output path. That failure was corrected only in QA source.
- Corrected browser source199ff536, run41400110862, job125129907213: mini context plays the seven-game replay twice, preserves Back/review/save/RNG and exposes a real native-focus defect. Final Escape times out because the result button was unmounted. This run is incomplete, not a browser pass.
- Focus regression632e77d4, run41401801825, job125135025338: actual types/holds pass, exactly one native-focus AssertionError in the existing walk case and eleven passes. It focuses the actual Show button and sends Escape to the actual active element.
- Final immutable source0f387be3d1971390e0efb239aa77b610092914c4, [run41404000550](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/41404000550): all three jobs pass. The sole product correction replaces three conditional sibling action buttons with one stable button, preserving their labels, handlers, styles and Back action.

## Final outcome evidence

The twelve replay cases pass on healthy source and after all seven source-fault restorations. Entry, duplicate numbering, series count, flipped result, false help, broken Back and the complete old-panel focus control each produce their exact intended native AssertionErrors. Fifteen child runs provide180 actual observations:168 passes and12 owned negative failures, no skipped cases. All expected verdicts are true. Absent runtime/unhandled counters stay UNKNOWN. The existing three season/playoff suites pass39 cases.

The ordinary production build, actual app types, all fifteen saved-output readers and all sixteen unchanged page caps pass. The cap source is held at SHA256afdd281ce2984ca34158194a0d6102bd053f2f8d242bc844c19f8f536b08d627. No budget is raised.

Final full ordinary units:10,332 total,10,274 passed,58 optional skipped,0 failed,715 physical files. Missing runtime/unhandled fields are null, not inferred zero.

The compiled actual Season Center fixture runs at320x664,392x731 and1440x900 with production CSS, its actual compiled CSS modules and held fonts. Every context plays seven games twice, reopens help, returns to the identical regular review, restores Back focus and closes once through native Escape. Each has17 snapshots of unchanged career/save/construction-RNG bytes,0 global Math.random calls,0 horizontal overflow,0 page-scroll moves and empty observed browser-error/failed-request/unexpected-transport arrays. Eleven effective copied-report faults per context prove33 browser guards. Fifteen original screenshots are retained.

Root visually inspected exactly five final originals: mini help, mini first game, mini final, phone final and desktop final. Text and controls are readable and unclipped, including the320px footer. Other images are retained but receive no root visual-view credit.

## Artifact custody

Root is the sole custodian. Each original ZIP size and SHA256 is checked and every member is hashed before safe extraction. Final archives:
- Full units13123680452,1,304,035 bytes, SHA256ba61c8a030faffe3f80558dd317d53ffdc5346f343c2478cefbf843f9f7bb506.
- Focused13122707900,107,706 bytes, SHA256a6d839d110ad2ce091b0adfacbcc1402d275427b63f300790632ef4e559e7640.
- Build/browser13122014313,2,200,984 bytes, SHA2568b5b37901e7daa625ae7a8f55587ffb37d724f49da72d053336bb19add8c5bcb.

One build/browser HTTP transfer stalled before any ZIP file existed. Root stopped only its own native transfer helper, added a45-second HTTP timeout in a separate helper version and acquired the original archive successfully. No Actions run was canceled, rerun or dispatched. Existing acquired archives were not downloaded again.

## Remaining release checks

This is a compiled component proof. Full MLB route/header/consent/save-admission operation, pitcher entry expansion and the release owner's integrated suite remain separate. This packet does not claim live publication or a complete historical scorecard. K owns integration and publish.
