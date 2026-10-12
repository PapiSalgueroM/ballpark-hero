# Round 1320 notes: the athletic director in CFB and CBB Dynasty

Branch r1320-college-ad-a, from origin/main 48cb9d4b (Release AY). Brief:
C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1320.md (the critic's Round A). Kept current at every push.

## Steps

| Step | What | Commit | Runner result |
|---|---|---|---|
| (a) | the base measured | 48cb9d4b | r1320-base, r1320-base-w |
| 1, lift | hostNextYear's body lifted into gmSeat.seatNextYear, a pure move | ceaa838b | r1320-lift |
| 1 | collegeSeat.ts, collegeSeatBind.ts, cfbSeatBind.ts, cbbSeatBind.ts, the unit test, simCollegeSeat S1 to S9 and SY | (this push) | r1320-s1 |
| 2a | the seat while he holds it, on the board | | |
| 2b | the firing, the market, the year out, the load rules on the board | | |
| 3 | the bid, the record as stints, What's New | | |

## Decisions taken by the builder (say so, never silently)

- The lift: no open branch touched gmSeat.ts or gmDeskHost.ts (257 branches scanned at the start), so
  hostNextYear's body moved into gmSeat.seatNextYear. Proof: hostNextYear over 40320 synthetic careers prints
  the same digest on the base and after (e3b0c4481b69e5a822e4f8bb953bcb35481fd2a9); S9 holds it for good.
- 'climb' is read as 'shut' in college (collegeNextYear): the market tiers by editorial prestige, which never
  moves in this round, so the old program cannot climb a tier during a year out. Round B (prestige drift)
  must revisit this the day prestige moves.
- fired and the last graded season are derived from the career, never stored (advice 14).
- A stored ask for another season is never graded: the close rebuilds the ask for the season with collegeAsk
  (advice 15). The first press of a season stores the ask, so this is a guard, not a path.
- sanitizeCollegeSeat bounds a stint's start at st.season + 1, not st.season as advice 14 words it: a job taken
  at a close starts the season after the one on record, and the save sits in phase 'recruit' with that stint
  until the offseason rolls the season.
- The year out refuses with 'broken-season' and throws the copy away when its post condition fails.
- S8's seat off twin runs on a second instance of the same bundle, and ids are compared by first appearance:
  the engines mint ids from a module counter with an epoch drawn at load.
- The tilt: built as the lead's prior (CBB lifts a 'respect' or 'rebuild' ask one step, CFB none), and the
  harness prints the alternative with SIM_COLLEGE_SEAT_TILT=none. The lead rules before 2b.

## Not touched (decision 1 and 3)

cfbDynasty.ts, cbbDynasty.ts, collegeProgram.ts, collegeRecruiting.ts, coachCalls.ts, foOwnerMandate.ts,
managerOffers.ts, keyedRng.ts, packs.ts, gmSport.ts, Celebration.tsx, CelebrationStyles.tsx, useRevealScroll.ts,
continueSaves.ts, realSaves.mjs, front-office-shared, every front office board, the four gmDeskHost adapters,
collegeDynastyFixture.json. gmSeat.ts and gmDeskHost.ts move only by the lift.
