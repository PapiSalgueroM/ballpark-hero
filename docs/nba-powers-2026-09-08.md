# Round 527: NBA Arcade visible powers

Base 526 7c8168f8, draft PR77. User resumed work September 8.

## Design contract

The existing objective remains one team owning the map. Successful conquests
now award one power after player selection, unless that conquest ends the game.
An away loss or shielded defense does not conquer territory and earns none.
This is the app's Arcade rule, not a claim about the reference video's rules.

Keep the existing five team/game modifiers. The award's team stays attached
through selection. Use now or save up to two for that team, replacing the
oldest with visible warning when full. Saved powers reopen from the ready
screen. Free-agent rewards recruit only players available from eliminated
NBA rosters; no football or new current-market data enters this flow. Upgrade
and territory-steal choices follow the existing card promises. Canceling a
selection returns to its card without spending a second power. An unavailable
effect must have a clear way back.

Shields protect one losing home defense. Upgrade boosts the selected in-game
roster entry for that owner's next simulated battle, including when defending;
unrelated battles do not spend it. Legends reuse existing NBA data. Territory
steals choose only valid nearby enemy regions, update elimination, and finish
the game if one owner remains. Duplicate inputs must consume/award once.

This remains an unranked session Arcade mode; no daily save, points, account
or backend protocol changes. Reset and unmount cancel deferred actions. Mobile
buttons, reopenable instructions, worked example and honest copy are required.

## Verification plan

First reproduce missing ordinary rewards and dormant recipient/lifetime bugs.
Real-hook tests drive actual seeded battles for acquisition; scoped fixtures
may choose a power without replacing the state transitions. Assert effects,
not badges. Cover each effect, save/reopen/capacity, rejected stale clicks,
no-effect exits, visible territories, completion and reset/unmount.
Every new guard gets an exact changed-source control. Preserve the existing
away-loss and visible-region checks. Then exact types/build, fifteen built-site
fences, phone/desktop actual interactions with intercepted transport, and
independent review. No default broad suite or production probes.

## Implementation notes

The pre-change real seed5 battle had Portland conquer Utah and return to ready
without a reward. The new acquisition test failed at that missing reward.
Awards now happen once outside React's territory updater after player choice.
Synchronous phase/settlement guards reject repeated actions, and the delayed
player steal uses the same tracked timer cleanup as the rest of the run.

Saved buttons are available for every surviving team between battles. The
pending card retains its owner through all three selection dialogs. Back or
Close returns the unspent card; a duplicate shield, queued upgrade or unavailable
legend stays unspent with an explanation and the option to save it.

NBA recruits come only from eliminated original NBA rosters, deduplicated and
absent from every active roster. Existing metadata follows acquired players.
An explicit set records actual Legend activations, avoiding both an ordinary
Durant becoming 99 just because OKC recruits him and a real legend losing its
modifier when another team acquires him. No new player or current-market data.

Upgrades are stored by owner, including simultaneous opposing upgrades. Both
participants' boosts reach the simulator and expire for that battle; unrelated
teams keep theirs. Territory powers choose from the existing nearby-region
rule, remove an eliminated owner's pending upgrade and finish a final victory.
Their log entries are power actions, so standings do not count them as battles.

Independent review identified the eliminated upgrade and legend identity issues
above; both were corrected and reviewed again. Shared NFL power definitions,
map geometry and battle win probability are unchanged. Upgrades and recruited
players affect simulated possessions and box-score ratings; this round does
not establish or claim a new win-odds bonus. This repairs the existing Arcade
flow, not the owner's entire broader reference-video feature list.

The new built-browser walk selects reward randomness only after real simulated
conquests. It uses the rendered controls, with no hook-state or result injection.
It checks acquisition, owner retention, saving/reopening, cancel, consumption,
touch targets and the chosen territory transfer. The hook/engine tests verify
the other four effects themselves. The prior region walk was adapted to the
new Arcade entry copy and the reward dialog after player selection.

## Verified September 8

- Exact app and node configuration type checks pass, including all new tests.
- `npm run build` passes. The scoped `/conquest-nba` prerender passed all three
  clock samples; only that route's snapshot/ledger hash changed. The other 139
  sitemap entries retained their dates and hashes. The final build passes.
- 16 real hook/engine cases and 14 component cases pass. The existing Arcade
  two-case and visible-region five-case harnesses also pass (37 cases total).
- 29 hook/engine controls each fail at their exact intended assertion. The
  runtime-error control is rejected with exit1, not credited as a passing test.
  All 16 UI controls pass with 55 exact expected assertion failures and all
  unaffected cases green. No unexpected suite or unhandled errors.
- All fifteen generated-site fences pass. Fourteen ran through a scoped ONLY
  list; `simPrerenderBoot` ran directly with installed Chrome and BOOT_PORT4328.
  No broad suite or production probes were run.
- Built 390px and 1440px walks acquire, bank, reopen and use all five powers.
  The dead saved-button control fails the reopen assertion, restores the real
  button and completes the flow on each viewport. Both report zero overflow,
  runtime errors, local request failures and transport violations. The existing
  390px region walk and missing-map-path control also pass on this build.
- The separate normal phone/desktop pass also completes all five powers with
  zero runtime or transport errors. Settled reward, saved-bank and selection
  screenshots received a clear independent visual review on both widths.

Browser test correction: an outgoing player dialog briefly remains during its
close animation after an away loss. The first harness incorrectly treated any
visible dialog as a reward. It now waits specifically for Team Power or Next
Battle. Screenshots also wait for finite animations so outgoing text cannot
ghost into the inspection image. Neither correction changed production code.

Evidence on this machine:

- Hook controls: `C:\Users\antho\AppData\Local\Temp\round527-nba-power-controls-de9bcda0da19446dbcd68542d2faac53\results.json`
- UI controls: `C:\Users\antho\AppData\Local\Temp\dukb-round527-ui-controls.log`
- Controlled browser report: `C:\Users\antho\AppData\Local\Temp\dukb-nba-powers-HT1To4\report.json`
- Settled screenshots: `C:\Users\antho\AppData\Local\Temp\dukb-nba-powers-EVU3oF`
- Existing region walk: `C:\Users\antho\AppData\Local\Temp\dukb-nba-regions-KFvcDd\report.json`
- Fences/build logs: `C:\Users\antho\AppData\Local\Temp\dukb-round527-*.log`

The preview uses port4205 and entry bundle `index-BXbTBTnd.js`. All earlier
previews/worktrees remain. No root-folder changes, merge or publication.
