# CFB Dynasty simulated low scores

R0004 reports a one-point CFB Dynasty score. The original save and match details are unavailable. This round first tests whether the held coordinator-adjusted simulator can independently produce the reported total.

## Original qualification

Use PR 539 at 6b773fc6cc8ace8ddc2c6c8ed2eb0a61602a0aca and the admitted active-entry run 42778375141. Hold the game engine, Page, Board, data, snapshots, and both existing CFB simulation harnesses while running the original candidate.

1. Start the real depth-enabled dynasty from a separate deterministic kickoff seed. Read the first actual pairing from the generated Week 1 slate and use its home team as the selected test team. Vary only synthetic coordinator ratings in the in-memory fixture.
2. Drive real `simCfbRound` calls with a retained draw tape. The first three draws select the home winner and base totals 24 and 3. The remaining pairings have the same neutral staff, exact 44-11 scores, and the same ordered draw tape. Capture all games, standings records, and the real first Week 1 log row.
3. Capture neutral 24-3, the modeled 24-0 and 24-2 cases, the 24-1 witness, and the authentic depth-disabled legacy round. The exact old schedule and 86 zero draws remain a legacy control. Only the ordinary 24-1 case should raise `CFB_DYNASTY_ORDINARY_ONE_POINT` on the held engine. Run the proper app type check and retain actual Vitest output plus complete RAW before deciding on any fix.

## Staff adjustment boundary

The normal witness uses losing OC 60 against DC 70. The losing base is 3 and the staff shift is minus 1.8, which rounds to 1. The neutral comparison is 3 and its same-winner cap is 2, so a change to 0 would exceed that cap. The owned test preserves the neutral result and that witness's existing cap while allowing a future approved score rule to choose its permitted total.

A separate same-draw diagnostic fixes the opposing DC at 81 and tests losing OC 65, 70, and 75. The original forecasts 0, 1, and 2. Each neighboring rating is within a one-point cap of neutral. Removing 1 while holding both exact neighbors cannot preserve both caps. The raw diagnostic records all three real simulator arms. It does not demand those exact three totals on a future implementation.

The original packet should determine whether the reported mechanism is real in this engine. A later source decision must state any tradeoff among low-score preservation and the staff bounds. The existing CFB staff and dynasty harnesses remain relevant to that decision.

## Scope

This candidate exercises the public simulator API and its schedule log. It uses synthetic staff and deterministic draws against held program definitions. Actual browser display, the reporter's particular save, provider behavior, changes to sports records, and release remain separate.
