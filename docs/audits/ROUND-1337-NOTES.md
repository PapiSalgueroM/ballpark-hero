# Round 1337 notes: Soccer Career's screens say true things (the screens half of plan round F16)

Branch r1337-sc-screens, started on origin/main e814c2de (Release BH live, plus its record and the board claims).
Brief: C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1337.md (the critic's "1337b"). No byte of
src/lib/soccerCareerEngine.ts moves. Every heavy check runs on a GitHub runner (rc.sh); result names are
origin/rc-results/<name>.

## What changed, step by step
1. Week by week's words. The 📺 button's aria-label reads "Week by week: watch your season match by match" (the
   "Week by week" prefix and data-week-by-week stay, harnesses find the button by both). The Season Centre help's
   intro[0] and intro[1] (src/components/soccer-career/SoccerSeasonCentre.tsx) say the season was played the moment
   you pressed Next Season or 📺 Week by week, that here you watch it one matchday at a time, and that only a season
   with a saved league world runs on simulated clubs. The Spanish pool sentence left the general intro; the season
   note pushed for a 'simulated-partial' world stays. Nothing else in HELP moved, and the shared SeasonCentre.tsx and
   SeasonCentreHelp.tsx are untouched, so the help still opens by itself once per viewer: POLISH 24 is PART for the
   Season Centre, owed to S15.

2. The Ballon d'Or night. While `career.phase === "ballon_dor" && ballonDorAwaitingReveal(career) !== null`, the Full
   attributes button is disabled and its second line (the same element, so nothing moves) reads "Opens once the
   Ballon d'Or night is over". No remount, so the countdown never starts again and no sound replays; no save write;
   no file of S18's touched. Every other phase is as before, season_summary with the night pending among them.
3. The Squad sheet. The first open lands on home with "New here? Tap ? for how your rank, the eleven and the
   manager's trust work." (data-squad-first-hint), above the tiles. The flag keeps the key soccerSquad:help but now
   means "the pointer was shown": read before the first paint (a pure read in a useState initialiser), written in an
   effect after mount (never in an initialiser). initialScreen skips the read, the write and the pointer. The help's
   first rule (src/lib/soccerClubSquadSheet.ts, the one string) reads "This is where you stand at the club right now.
   It explains your games, it does not change them."
4. Training. On the menu [data-practice-rules] holds one paragraph, the bank rule with its worked example; the drill
   list and the pause rule join it behind the ?; aria-expanded stays `showRules || screen === "menu"` (the shared
   TrainingGround's shape); the second copy of the bank rule under the drills is gone; the ? during a drill is as it was.
5. The attributes screen. The title wraps instead of truncating; each attribute label may take two lines.
6. What's New: one entry, newest first.

## Named edits to existing checks
- scripts/playCareerSquad.mjs: sections 3 (the first open lands on home with the pointer; ? opens the help; a viewer
  shown the pointer sees none), 4 (the walk reaches the help through ?; a new check that both fresh contexts show the
  pointer) and 7b (save A's first open is home with the pointer; Back is measured on the help reached through ?).
  No assertion removed or loosened. Check 7 already measured the help reached through ?.
- scripts/playCareerProgramme.mjs:120 (the other lane's walk, one line): waits for home, presses "How the squad works",
  then waits for the help; everything after it is as it was.
- scripts/simStorageWrites.mjs: the SquadSheet entry is `keys: ['write:markHintShown']` with the why "the hint seen
  flag: a browser that refuses storage sees the one line pointer again" (markHintShown answers false when storage
  refuses; the old helpSeen's keeps: key went with the function that kept its answer).
- scripts/simSoccerOpponentLabels.mjs: two REVERSE pairs put the help's old intro words back before the legacy page is
  hashed against ORIGINAL_COMPONENT_SHA (b553b627), the way Release BH reversed PR278's hunks.

## Proof (filled in as runner results come back)
- Base measurements on e814c2de: r1337-b0a, r1337-b0c (and r1337-b0b, r1337-b0d from the base worktree).
