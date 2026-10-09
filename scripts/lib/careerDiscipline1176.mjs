/* The old full-save fixture predates real ban consequences. Restore only
   those exact decisions in its copied baseline bundle, keeping every old
   apps, goals, score and state field under the existing whole-save check. */
export const careerDiscipline1176Attribution = [
  { file: 'src/lib/soccerCareerEngine.ts', from: 'if (apps > 0 && state.divingActive && !isGK) goals += 2;', to: 'if (state.divingActive && !isGK) goals += 2;' },
  { file: 'src/lib/soccerCareerEngine.ts', from: 'const redCards = Math.random() < 0.08 && apps > 0 ? 1 : 0;', to: 'const redCards = Math.random() < 0.08 ? 1 : 0;' },
  { file: 'src/lib/soccerCareerEngine.ts', from: `  const appearance = calcAppearances(overall, currentClubTier, age, state, fx);
  const { apps, leagueApps, served } = serveClubSuspension(appearance.apps, appearance.leagueApps, state.pendingSuspensionMatches);
  const { injured, injuryWeeks, injuryName, injurySevere } = appearance;`, to: '  const { apps, leagueApps, injured, injuryWeeks, injuryName, injurySevere } = calcAppearances(overall, currentClubTier, age, state, fx);' },
  { file: 'src/lib/soccerCareerEngine.ts', from: '    ...(served > 0 ? { suspensionMatches: served } : {}),', to: '' },
  { file: 'src/lib/soccerCareerEngine.ts', from: `  if (season.suspensionMatches) {
    const remaining = serveClubSuspension(season.suspensionMatches, 0, s.pendingSuspensionMatches).remaining;
    if (remaining > 0) s.pendingSuspensionMatches = remaining;
    else delete s.pendingSuspensionMatches;
    s.events.push(\`🟥 Served \${season.suspensionMatches} suspended club matches this season.\`);
  }`, to: '' },
  { file: 'src/lib/soccerCareerEngine.ts', from: 'consequence: "3-match ban next season, Reputation -5"', to: 'consequence: "Red cards +1, Reputation -5"' },
  { file: 'src/lib/soccerCareerEngine.ts', from: 's.pendingSuspensionMatches = serveClubSuspension(0, 0, s.pendingSuspensionMatches).remaining + 3; ', to: '' },
  { file: 'src/lib/soccerCareerEngine.ts', from: `  // Show the appeal result before any remaining event cards.
  if (s.phase === "red_card_appeal_result" as any) return s;
  if (s.pendingEvents.length > 0) {
    s.phase = "random_events";
    return s;
  }`, to: `  if (s.pendingEvents.length > 0) {
    s.phase = "random_events";
    return s;
  }
  // If phase was set to red_card_appeal_result by the event, don't override
  if (s.phase === "red_card_appeal_result" as any) return s;` },
  { file: 'src/lib/soccerCareerEngine.ts', from: '      s.pendingSuspensionMatches = serveClubSuspension(0, 0, s.pendingSuspensionMatches).remaining + result.banLength;', to: '' },
];
