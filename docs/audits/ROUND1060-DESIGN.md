# Round 1060: Compare saved career seasons

Career Log offers Compare seasons when at least two seasons exist. The first
and second selectors refer to distinct original save indices, defaulting to
the last two. Duplicate year labels retain their season number. Back returns
to the comparison opener, while opening again resets to Overview.

Overview compares saved OVR, games (including starts or appearances), age and
salary. Regular season uses the same sport and position fields and display
precision as the existing review. Its formatter now carries additive raw
numeric metadata so differences subtract saved values before rounding. No
formatted text is parsed. Positive and negative changes are neutral. Prose,
awards and postseason lines are not compared. Missing values say Not recorded,
true zero remains zero and suspended regular-season fields say Not played.

The view changes no engine, Board, save schema or records. Existing individual
season displays remain unchanged. All selectors and buttons are at least 44px.

Verification extends the existing mounted suite and copied-source controls:
distinct indices, return focus, all position fields, rate precision, missing
values, suspension, draws and writes. The existing 16 native journeys include
comparison, geometry, actual input and save-byte checks. Local work is limited
to source and static syntax review; runtime acceptance must run remotely.
