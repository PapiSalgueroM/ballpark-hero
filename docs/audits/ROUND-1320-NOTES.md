# Round 1320 notes: the athletic director in CFB and CBB Dynasty

Branch r1320-college-ad-a, from origin/main 48cb9d4b (Release AY). Brief:
C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1320.md (the critic's Round A). Closing report:
C:/Users/antho/dukb-handoff/2026-10-10/results-g/finish-1320.md. Step 1's numbers: results-g/step1-1320.md.

## Steps and their runner results (all GitHub runners through rc.sh)

| Step | What | Commit | Runner result |
|---|---|---|---|
| (a) | the base measured | 48cb9d4b | r1320-base (all green), r1320-base-w (weights) |
| 1, lift | hostNextYear's body lifted into gmSeat.seatNextYear | ceaa838b | r1320-lift (green, closedquiet fired as on the base) |
| 1 | collegeSeat.ts, collegeSeatBind.ts, cfbSeatBind.ts, cbbSeatBind.ts, unit test, simCollegeSeat | 801111fa | r1320-s1 (green), r1320-s1c (11 controls fired) |
| 1 | the tilt table a step per tier; the softer football variant measured | 638357d8 | r1320-s1b |
| 2a | the seat while he holds it, the fixture rule and four board controls | 3f07a657, a97168bd | r1320-2a, r1320-2a2, r1320-2aw |
| 2b | the firing, the market, a job, the year out, the load rules; football one step softer | 299c15db | r1320-2b, r1320-2bw |
| 3 | the bid, Go to or Stay put; walk stations 8 and 9 | 4c7df8a5, 126e5917 | r1320-3, r1320-3w, r1320-3w2 |

## Decisions taken by the builder

- THE TILT. Step 1 measured the pro ladder on college fields: in CFB it let go 87, 96, 67 and 49 percent of the
  coaches starting in each prestige tier within ten seasons (the 'title' ask graded 'badly' three times in four,
  the 'playoffs' ask missed two times in three). The lead's prior was "CFB none"; no ruling arrived while 2b was
  built, so the builder applied the measured lever: CFB asks one step less on every postseason tier (11, 17, 20
  and 25 percent let go), CBB one step more of its 'respect' and 'rebuild' rosters (the prior). It is one line,
  COLLEGE_ASK_TILT in src/lib/collegeSeat.ts, said in the "?" as this game's rule; the harness keeps both
  alternatives as variants (SIM_COLLEGE_SEAT_TILT=cfb-none and none). The lead may overrule with that one line.
- The lift: no open branch touched gmSeat.ts or gmDeskHost.ts (257 branches scanned at the start), so
  hostNextYear's body moved into gmSeat.seatNextYear; its digest over 40320 synthetic careers is the base's
  (e3b0c4481b69e5a822e4f8bb953bcb35481fd2a9), held by simCollegeSeat S9 for good.
- 'climb' is read as 'shut' in college (collegeNextYear): the market tiers by editorial prestige, which never
  moves in this round, so the old program cannot climb a tier during a year out. Round B (prestige drift) must
  revisit this the day prestige moves.
- fired and the last graded season are derived from the career, never stored (advice 14). A stored ask for
  another season is never graded: the close rebuilds the season's ask (advice 15).
- sanitizeCollegeSeat bounds a stint's start at st.season + 1 (not st.season): a job taken at a close starts the
  season after the one on record and sits in phase 'recruit' until the offseason rolls the season.
- The market is never saved: the save stays phase 'recap' with the held recap, and the load rules open the
  market from it, so a fired coach's reload lands on the market and an older build lands on the recap.
- The seat's slot is one fixed 144 px in every state at every width; the walk holds the slot, its height and the
  tab bar under it to the pixel. The Play button's top moves after a press on the base too (the board's own feed
  above the Play card changes with the round's lines); the walk prints it and does not hold it.
- simCollegeDynastyBoard wrote every control's copy into one shared folder, so two controls of one file run side
  by side read each other's copy (cfbword read as dead on a runner). Each run now writes a folder of its own.

## Owed by others (never written here)

- The guide (src/data/gameContent/college.ts, the other lane's): 702 "an open-ended job" is now false for a
  dynasty with the athletic director; a firing by him does not wipe the save (beside 824); one sentence on the
  job market and the buyout bid; and the old ones: 849 "one of 40 programs" and cfbDynasty.ts 35 "60-97"
  against 44 programs at 69 to 96. After the guide moves, node scripts/genSearchKeywords.mjs.
- The continue card (src/data/continueSaves.ts) names st.myTeam, which during a market or a year out is the
  program that let him go; simHomeFront section 7d's WHERE list must name collegeSeat.ts if the card ever reads
  st.seat.
- scripts/lib/realSaves.mjs: a seeded seat save and a fired market save, once Rounds 1309 and 1318 land.
- GmSeatCard.tsx's 26 px buttons, for whoever binds it.
- The two prerendered pick screens (/cfb-dynasty, /cbb-dynasty) gain the seat line when the release gate
  rebuilds the saved pages; this round wrote nothing into public/.

## Not touched (decision 1 and 3)

cfbDynasty.ts, cbbDynasty.ts, collegeProgram.ts, collegeRecruiting.ts, coachCalls.ts, foOwnerMandate.ts,
managerOffers.ts, keyedRng.ts, packs.ts, gmSport.ts, Celebration.tsx, CelebrationStyles.tsx, useRevealScroll.ts,
continueSaves.ts, realSaves.mjs, front-office-shared, every front office board, the four gmDeskHost adapters,
collegeDynastyFixture.json. gmSeat.ts and gmDeskHost.ts move only by the lift.
