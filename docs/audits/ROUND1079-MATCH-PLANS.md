# Round 1079: saved Club Manager match plans

Preparation, October 7, 2026. Base main 2fff5e044160b70bd58b64d931793ee4e443cedd.
Branch codex/manager-match-plans-1079. No live claim, merge or publish.

Three named slots store formation, mentality, requested XI, duties, captain,
set piece assignments and shootout order. Apply updates tactics atomically and
clears pending pitch selections. Preview resolves the actual current squad with
the existing engine, including unavailable players, replacements and fitness.
Club and era metadata, phase, live match and active save-slot guards prevent
foreign or stale plans from changing a career. Old saves need no migration.

The new compact Tactics tile has Back, Escape, help and a worked example.
Its next action is revealed through the existing scroll hook. No league, player,
match model, result probability or random stream is added or changed.

Remote acceptance is pending. Authored checks: 12 mounted outcomes, 32 copied
source faults with mapped assertion failures and an independent engine baseline,
13 source holds; three native profiles and nine restored DOM geometry controls.
Native runs use the actual career hook and TacticsScreen in an offline fixture,
not the full app or a live service. Availability and club transitions are explicit
fixture inputs. Fonts and flags use actual cached dependencies. Existing tactics
controls retain their original sizing; new plan controls must be at least 44px
and new copy at least 12px.

Workflow also runs real app types/build, eight existing manager regressions,
all 20 built/source readers, and source/data holds. All runtime is remote CI.
No production traffic, database changes, scored games or local runtime.
Final hashes, runs, artifacts and independent inspection will be recorded after
remote evidence is available. This document does not yet credit passing runtime.
