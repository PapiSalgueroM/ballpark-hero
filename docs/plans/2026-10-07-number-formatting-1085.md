# Round1085: commas in large displayed numbers

Anthony requested commas between large values. Use one small presentation
helper and explicit numeric leaves on the main careers, manager records,
Tycoon money/counts, shared results, leaderboard and profile. A displayed
12500 becomes12,500. Signs, decimal digits and trailing zeroes stay intact.

Do not apply this to generic StatTile, numeric input/attributes, years,
IDs or ratings. Preserve existing currency conversion, compact money units
and rounding. The Tycoon page wraps its existing formatter at the final
display boundary. No arbitrary prose, DOM-wide rewrite or locale-dependent
grouping. Non-numeric tokens and scientific notation pass through unchanged.

The public countOf function stays byte-identical because NFL uses it in
saved postseason narrative. Presentation-only stat-line functions use their
own grouped count helper. Engines, data, schemas, keys, save handlers,
currency parser and saved narratives remain unchanged.

Remote-only validation: proper application type/build, actual mounted
formatter/consumer outcomes with independent unchanged arithmetic baseline,
effective copied faults with exact source/transform/report evidence, and
six native Tycoon/NFL cases across320/390/1280. Native checks preserve
physical viewport bounds, loaded fonts, source/build/dependency holds,
unchanged saved bytes and RNG. Nine restored DOM faults reject lost commas,
lost precision and grouped years. No scored game or production forwarding.

Two existing stat-line/review tests may update only their display
expectations for grouped QB/high/comparison values and valid grouped WR/TE
tokens. Original fictional fixture inputs and all engine/stat/precision
checks stay held. Exact whole-file original-plus-declared-edits guard
required, along with every source/built reader after build finishes.

Prepare and independently inspect an exact-head remote candidate before
PR readiness. Claude owns merge, current-main integration and publish.
This is a bounded display improvement, not whole-site feature completion,
full campaign proof or a live-site claim. Root source/seven stashes held.
