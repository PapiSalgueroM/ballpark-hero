# Round1084: keep the latest career progress available after a refused save

## Scope

Base accepted Release AJ main bde6b1c3797fd728dbd583a28623c34fe8452917,
tree f2657a3ef5a2eb4bf976b67e440e465c3613a1c0.
Managed branch codex/us-career-save-recovery-1084.
The shared NBA, NFL, MLB and NHL board silently discards failed career and
prospect writes. Reset/back deletions can throw before completing navigation.
This round retains the latest storage intent and displays persistent recovery.

## Behavior

One board-local ref holds the exact serialized latest write or queued deletion
and its existing sport key. Both career and prospect writers replace that intent.
Retry only repeats storage, without serializing again or replaying a drill,
decision, draft, season, reward or random draw. Successful storage clears the
queue and warning. Continued play replaces old failed bytes with the latest
intended save. A new player write supersedes a refused deletion.

Reset and prospect Back keep their existing create navigation when deletion is
refused, with an accurate notice that the device may load the previous career.
All13 Board return paths show the same small recovery control. Failure produces
one first-failure toast while the warning remains active. The 12px notice and
44px Retry save button preserve compact career panels. Existing sport load and
an exact-key retry guard clear or reject another sport's queued intent.

No engine, key, save shape, sport data, Hall, retirement talk, farewell, summer
or practice mechanics change. Four existing control anchors follow the two
storage call-site changes: ActionConfirm ownKey, Practice reset, Prospect save
and back. Their fault operations, mapped assertions and fixtures stay exact.
An artificial Board prop swap to an empty sport retains an older pre-existing
loader UI limitation, although pending save bytes cannot cross keys. Actual
route wrappers remount the Board. Do not claim that unrelated loader repair.

## Verify

Runtime is remote GitHub Actions only. Mount the actual Board across four sports:
refused practice, consecutive summer choices, prospect progression, Retry while
still refused, successful latest-byte Retry and reload, refused removal and a
new player replacing it. Retain attempted bytes, full storage, UI state and RNG.
Thirty-two authored Board cases plus one independent baseline and23 effective
copied faults await measured acceptance. A later ordinary successful save must
also clear the warning and replace refused progress without a Retry click.
Effective copied Board/notice faults must reach exact mapped assertions while
an independent unchanged engine baseline holds. Keep source copies, actual
transformed input/output, raw reports, process results and before/after hashes.

Native proof covers12 actual route journeys, four deletion cases and nine
effective restored DOM faults in 320px dark/reduced touch,390px light touch and
desktop keyboard. Use unchanged engine-created prospects and actual trusted
showcase/draft/join inputs across both real writers, then exact Retry/reload.
Only the active sport key is refused; other three career keys and unrelated
completion bytes must hold. Queue removal, retry and write replacement must
be measured. Load actual template fonts from a separate cached asset step.

Run proper application type/build, original four career engines and shared
board practice/prospect/action/summer/restore/retirement checks. Run changed
original anchor faults with their original healthy baselines. Every rebuilt
source/built reader must finish before acceptance. Hold data, engines, original
tests and fixtures, package/lock and all actual installed versions throughout.

## Delivery and limits

Prepare a draft PR only after retained remote proof. Independent peer/artifact
review and a final exact-head run precede READY. No merge or publication by
this lane. Claude owns main/release, Season Centre, league data and US legacy
calibration. Root source and seven stashes remain untouched. Emulated Chromium
and engine-made saved setups do not prove physical devices or a full campaign.
