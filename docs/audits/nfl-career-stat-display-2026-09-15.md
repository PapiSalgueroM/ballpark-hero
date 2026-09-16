# NFL Career position statistics

The season formatter previously treated LB, CB, EDGE and K as receivers. The
season reveal and log could print undefined values while the career and retirement
summaries claimed receiving production. The engine already records the proper
defensive and kicking fields.

The repair uses those recorded fields in all three displays. Career totals add
the counting stats and take the longest field goal only from played,
nonsuspended seasons with a made kick. Missing legacy fields stay unrecorded;
recorded zero remains zero. Career and retirement summaries label these as
recorded totals. Offense text, original offense totals, legacy score, verdict,
Hall of Fame threshold, save shape and simulation balance are unchanged.

## Verification

- Proper application TypeScript check: exit 0.
- Offline regression harness: 24 actual engine seasons across eight positions.
- 22 effective source mutations fail their intended assertions, including the
  old receiving formatter, incorrect field mappings, missing values, longest
  kick eligibility, legacy scoring and both aggregate display fallbacks.
- External comparison against the real base commit `a96ed002`: 48 seeded seasons
  across both eras and eight positions have identical serialized state, events,
  results and random-call counts. 192 presentation reads leave state unchanged
  and make no random draw.
- Independent source and evidence review: no findings.

Receipts were recorded before the commit in
`C:/Users/antho/AppData/Local/Temp/dukb-nfl-career-stat-display`.
The focused harness is committed as `scripts/simNflCareerStatDisplay.mjs`.
This patch has no full build or browser release claim and remains separate from
the combined animation CI run `35048332634`.
