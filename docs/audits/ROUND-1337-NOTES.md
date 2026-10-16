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

## Proof (filled in as runner results come back)
- Base measurements on e814c2de: r1337-b0a, r1337-b0c (and r1337-b0b, r1337-b0d from the base worktree).
