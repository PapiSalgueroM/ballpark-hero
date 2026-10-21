# Cancelled gestures in Soccer Career drills

An interrupted touch or mouse gesture should leave the round ready to play. Career Wall Shot and Glove Save previously sent pointer cancellation through the normal release handler, which could fire a shot or dive.

The dedicated cancellation handler clears dragging and its starting point. Normal releases, keyboard controls and Shoot now keep their existing behavior. A cancelled gesture keeps the retained aim and dive vector. The goalkeeper deadline continues normally, so cancellation does not pause the round.

Physics, difficulty, seeded outcomes, scoring, the daily record and training rewards stay unchanged. This change addresses the cancellation path separately from the easier timing and power controls already present.

## Verification scope

Two new component cases play the actual daily Wall Shot and Glove Save boards. A cancelled drag and stray release must preserve the round, score, count, saved bytes and career. A subsequent real gesture must resolve one round and write its daily record once. Four existing match cases remain unchanged, alongside the separate markup suite.

A copied original cancellation binding must produce exactly the two marked cancellation failures. Reversing that same binding must restore the complete current Source and all six passing cases. The remote workflow retains full unit JSON, command arguments, raw output and Source bodies; its independent consumer rejects unrelated runtime errors and partial results.

Application types, four unchanged drill and free-kick simulations, the full production SEO build and all fifteen rebuilt-output readers remain required. Complete Source, package metadata, generated files, strict self-inclusive 500M evidence cap and failure-preserving upload stay in place.

Fresh runtime verification, current-main integration and publication are pending. These controlled component cases do not claim a naturally played career, real browser gesture or full-session reward.
