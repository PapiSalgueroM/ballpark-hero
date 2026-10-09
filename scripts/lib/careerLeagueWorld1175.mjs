/* Round 1175 attribution: restore the exact pre-world hooks in a copied
   baseline bundle. No saved field or hash is omitted. Missing anchors fail
   closed in bundleAwardsNight's existing patch loader. */
const engine = 'src/lib/soccerCareerEngine.ts';
const binding = 'src/lib/season/soccer.ts';
const phone = 'src/lib/soccerPhone.ts';
export const careerLeagueWorld1175Attribution = [
  { file: engine, from: "import { prepareLeagueWorld, projectLeagueWorldClubs, recordLeagueWorldSeason, settleLeagueWorld, leagueWorldChampions, type CareerLeagueWorld, type LeagueWorldSeason } from './soccerCareerLeagueWorld';\nimport { deriveSeason, tableAt } from './season/core';\nimport { buildSoccerSeasonCtx, SOCCER } from './season/soccer';\n", to: '' },
  { file: engine, from: '  /** The career\'s simulated field and champion, held for this season only. */\n  leagueWorld?: LeagueWorldSeason;\n', to: '' },
  { file: engine, from: '  /** Membership for the next unplayed future season. Absent on older saves. */\n  leagueWorld?: CareerLeagueWorld;\n', to: '' },
  { file: engine, from: '  const pool = projectLeagueWorldClubs(state, adjustClubsForYear(clubs, (lastSeason?.year ?? 2024) + 1), (lastSeason?.year ?? 2024) + 1);', to: '  const pool = adjustClubsForYear(clubs, (lastSeason?.year ?? 2024) + 1);' },
  { file: engine, from: '  clubs = projectLeagueWorldClubs(state, adjustClubsForYear(clubs, (lastSeason?.year ?? 2024) + 1), (lastSeason?.year ?? 2024) + 1);', to: '  clubs = adjustClubsForYear(clubs, (lastSeason?.year ?? 2024) + 1);' },
  { file: engine, from: '  clubs = projectLeagueWorldClubs(state, adjustClubsForYear(clubs, (state.seasons[state.seasons.length - 1]?.year ?? 2024) + 1), (state.seasons[state.seasons.length - 1]?.year ?? 2024) + 1);', to: '  clubs = adjustClubsForYear(clubs, (state.seasons[state.seasons.length - 1]?.year ?? 2024) + 1);' },
  { file: engine, from: '  prepareLeagueWorld(s, clubs, (s.seasons[s.seasons.length - 1]?.year ?? 2024) + 1);\n', to: '' },
  { file: engine, from: '  const worldClubs = prepareLeagueWorld(s, clubs, (s.seasons[s.seasons.length - 1]?.year ?? 2024) + 1);\n  const season = generateSeasonStats(s, worldClubs);\n  recordLeagueWorldSeason(s, clubs, season);', to: '  \n  const season = generateSeasonStats(s, clubs);' },
  { file: engine, from: '    leagueChampions: leagueWorldChampions(s, clubs, season),\n', to: '' },
  { file: engine, from: `
  if (season.leagueWorld) {
    const derived = deriveSeason(SOCCER, season, buildSoccerSeasonCtx(s, clubs, season));
    const order = derived?.mode === 'table' ? tableAt(derived, derived.rounds.length).map(t => derived.labels[t.slot].name) : undefined;
    settleLeagueWorld(s, clubs, season, order);
    const movement = season.leagueWorld.movement;
    if (movement) s.events.push(\`\${movement.kind === 'promoted' ? '⬆️' : '⬇️'} \${movement.club} \${movement.kind} to \${movement.to} in your simulated league world.\`);
  } else settleLeagueWorld(s, clubs, season);
`, to: '' },
  { file: engine, from: '\n  prepareLeagueWorld(s, clubs, season.year + 1);\n', to: '\n' },
  { file: engine, from: '\n    prepareLeagueWorld(s, clubs, season.year + 1);\n', to: '\n' },
  { file: engine, from: '    const nextHere = projectLeagueApps(s.overall, s.currentClubTier, back.parentClub, backSeasons);', to: '    const nextHere = projectLeagueApps(s.overall, back.parentTier, back.parentClub, backSeasons);' },
  { file: phone, from: '    /** Saved simulated league champions. Existing world RNG draws stay put. */\n    leagueChampions?: Record<string, string>;\n', to: '' },
  { file: phone, from: '  if (opts.leagueChampions) Object.assign(leagueWinners, opts.leagueChampions);\n', to: '' },
  { file: binding, from: "import { readLeagueWorldSeason } from '../soccerCareerLeagueWorld';\n", to: '' },
  { file: binding, from: '  const snapshot = readLeagueWorldSeason(row);\n', to: '' },
  { file: binding, from: '  const league = snapshot ? { key: snapshot.league, name: snapshot.league } : finishLeague({ name: row.club, league: today }, row.year, finish?.size ?? null);', to: '  const league = finishLeague({ name: row.club, league: today }, row.year, finish?.size ?? null);' },
  { file: binding, from: '  const champion = snapshot && finish?.finish !== 1 ? snapshot.champion : crowned && key && namedInLeague(crowned, key, row.year) ? crowned : null;', to: '  const champion = crowned && key && namedInLeague(crowned, key, row.year) ? crowned : null;' },
  { file: binding, from: "  const titleOpen = !snapshot && !!(finish && finish.finish !== 1 && key && world && !world.leagues?.[key]);", to: "  const titleOpen = !!(finish && finish.finish !== 1 && key && world && !world.leagues?.[key]);" },
  { file: binding, from: "  else if (!snapshot && !leagueFormatFor(league.key, row.year)) why = 'format';\n  else if (!snapshot && derbyMeetings(league.key, row.year) !== 2) why = 'cadence';\n  else if (rivals.some(r => snapshot ? !snapshot.members.some(n => clubKey(n) === clubKey(r)) : !namedInLeague(r, league.key, row.year))) why = 'rival';", to: "  else if (!leagueFormatFor(league.key, row.year)) why = 'format';\n  else if (derbyMeetings(league.key, row.year) !== 2) why = 'cadence';\n  else if (rivals.some(r => !namedInLeague(r, league.key, row.year))) why = 'rival';" },
  { file: binding, from: "  const size = snapshot?.members.length ?? (mode === 'table' ? finish!.size! : (sizeKey ? leagueSizeFor(sizeKey, row.year) : null));", to: "  const size = mode === 'table' ? finish!.size! : (sizeKey ? leagueSizeFor(sizeKey, row.year) : null);" },
  { file: binding, from: '    const members = snapshot?.members ?? managerLeagueField({ clubs, club: row.club, league: sizeKey, year: row.year }, keyedRng(`${row.club}|${row.year}|centre|field`)).named;\n    named = members.filter(n => n !== row.club && !rivals.includes(n) && n !== champion);', to: '    const field = managerLeagueField({ clubs, club: row.club, league: sizeKey, year: row.year }, keyedRng(`${row.club}|${row.year}|centre|field`));\n    named = field.named.filter(n => n !== row.club && !rivals.includes(n) && n !== champion);' },
];
