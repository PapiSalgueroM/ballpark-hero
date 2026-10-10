/* Round 1175 attribution: restore the exact pre-world hooks in a copied
   baseline bundle. No saved field or hash is omitted. Missing anchors fail
   closed in bundleAwardsNight's existing patch loader. */
const engine = 'src/lib/soccerCareerEngine.ts';
const binding = 'src/lib/season/soccer.ts';
const phone = 'src/lib/soccerPhone.ts';
export const careerLeagueWorld1175Attribution = [
  { file: 'src/lib/season/soccer.ts',
    from: '    const fixedMissed = fixedOf(row, ctx).filter(f => !f.played).length;\n    const room = Math.min(severe ? M : M - block, M - fixedMissed);',
    to: '    const room = severe ? M : M - block;' },
  { file: engine, from: "import { prepareLeagueWorld, projectLeagueWorldClubs, recordLeagueWorldSeason, settleLeagueWorld, leagueWorldChampions, type CareerLeagueWorld, type LeagueWorldSeason } from './soccerCareerLeagueWorld';\n", to: '' },
  { file: engine, from: '  /** The career\'s simulated field and champion, held for this season only. */\n  leagueWorld?: LeagueWorldSeason;\n', to: '' },
  { file: engine, from: '  /** Membership for the next unplayed future season. Absent on older saves. */\n  leagueWorld?: CareerLeagueWorld;\n', to: '' },
  { file: engine, from: '  const pool = projectLeagueWorldClubs(state, adjustClubsForYear(clubs, (lastSeason?.year ?? 2024) + 1), (lastSeason?.year ?? 2024) + 1);', to: '  const pool = adjustClubsForYear(clubs, (lastSeason?.year ?? 2024) + 1);' },
  { file: engine, from: '  clubs = projectLeagueWorldClubs(state, adjustClubsForYear(clubs, (lastSeason?.year ?? 2024) + 1), (lastSeason?.year ?? 2024) + 1);', to: '  clubs = adjustClubsForYear(clubs, (lastSeason?.year ?? 2024) + 1);' },
  { file: engine, from: '  clubs = projectLeagueWorldClubs(state, adjustClubsForYear(clubs, (state.seasons[state.seasons.length - 1]?.year ?? 2024) + 1), (state.seasons[state.seasons.length - 1]?.year ?? 2024) + 1);', to: '  clubs = adjustClubsForYear(clubs, (state.seasons[state.seasons.length - 1]?.year ?? 2024) + 1);' },
  { file: engine, from: '  prepareLeagueWorld(s, clubs, (s.seasons[s.seasons.length - 1]?.year ?? 2024) + 1);\n', to: '' },
  { file: engine, from: '  const worldClubs = prepareLeagueWorld(s, clubs, (s.seasons[s.seasons.length - 1]?.year ?? 2024) + 1);\n  const season = generateSeasonStats(s, worldClubs);\n  recordLeagueWorldSeason(s, clubs, season);', to: '  \n  const season = generateSeasonStats(s, clubs);' },
  { file: engine, from: '    leagueChampions: leagueWorldChampions(s, clubs, season),\n', to: '' },
  /* Release AQ: the settle no longer draws the Season Centre's season, and it
     runs in two places (the season's end and the severe injury year). Both
     calls and their log lines come out; the comments above them stay. */
  { file: engine, from: `  settleLeagueWorld(s, clubs, season);
  {
    const movement = season.leagueWorld?.movement;
    if (movement) s.events.push(\`\${movement.kind === 'promoted' ? '⬆️' : '⬇️'} \${movement.club} \${movement.kind} to \${movement.to} in your simulated league world.\`);
  }
`, to: '' },
  { file: engine, from: `      settleLeagueWorld(s, clubs, injuryRow);
      {
        const movement = injuryRow.leagueWorld?.movement;
        if (movement) s.events.push(\`\${movement.kind === 'promoted' ? '⬆️' : '⬇️'} \${movement.club} \${movement.kind} to \${movement.to} in your simulated league world.\`);
      }
      prepareLeagueWorld(s, clubs, injuryRow.year + 1);
`, to: '' },
  { file: engine, from: '\n  prepareLeagueWorld(s, clubs, season.year + 1);\n', to: '\n' },
  { file: engine, from: '\n    prepareLeagueWorld(s, clubs, season.year + 1);\n', to: '\n' },
  { file: engine, from: '    const nextHere = projectLeagueApps(s.overall, s.currentClubTier, back.parentClub, backSeasons);', to: '    const nextHere = projectLeagueApps(s.overall, back.parentTier, back.parentClub, backSeasons);' },
  { file: phone, from: '    /** Saved simulated league champions. Existing world RNG draws stay put. */\n    leagueChampions?: Record<string, string>;\n', to: '' },
  { file: phone, from: '  if (opts.leagueChampions) Object.assign(leagueWinners, opts.leagueChampions);\n', to: '' },
  { file: binding, from: "import { leagueWorldZone, readLeagueWorldSeason, type LeagueWorldSeason } from '../soccerCareerLeagueWorld';\n", to: '' },
  { file: binding, from: '  const snapshot = readLeagueWorldSeason(row);\n', to: '' },
  /* Release AQ: the saved zone is read off the snapshot, so it goes with it;
     everything that reads ctx.zone then never runs. */
  { file: binding, from: '    ...(snapshot ? worldZoneOf(snapshot) : {}),\n', to: '' },
  { file: binding, from: '  const league = snapshot ? { key: snapshot.league, name: snapshot.league } : finishLeague({ name: row.club, league: today }, row.year, finish?.size ?? null);', to: '  const league = finishLeague({ name: row.club, league: today }, row.year, finish?.size ?? null);' },
  { file: binding, from: '  const champion = snapshot && finish && finish.finish !== 1 ? snapshot.champion : crowned && key && namedInLeague(crowned, key, row.year) ? crowned : null;', to: '  const champion = crowned && key && namedInLeague(crowned, key, row.year) ? crowned : null;' },
  { file: binding, from: "  const titleOpen = !snapshot && !!(finish && finish.finish !== 1 && key && world && !world.leagues?.[key]);", to: "  const titleOpen = !!(finish && finish.finish !== 1 && key && world && !world.leagues?.[key]);" },
  { file: binding, from: "  else if (!snapshot && !leagueFormatFor(league.key, row.year)) why = 'format';\n  else if (!snapshot && derbyMeetings(league.key, row.year) !== 2) why = 'cadence';\n  else if (rivals.some(r => snapshot ? !snapshot.members.some(n => clubKey(n) === clubKey(r)) : !namedInLeague(r, league.key, row.year))) why = 'rival';", to: "  else if (!leagueFormatFor(league.key, row.year)) why = 'format';\n  else if (derbyMeetings(league.key, row.year) !== 2) why = 'cadence';\n  else if (rivals.some(r => !namedInLeague(r, league.key, row.year))) why = 'rival';" },
  { file: binding, from: "  const size = snapshot?.members.length ?? (mode === 'table' ? finish!.size! : (sizeKey ? leagueSizeFor(sizeKey, row.year) : null));", to: "  const size = mode === 'table' ? finish!.size! : (sizeKey ? leagueSizeFor(sizeKey, row.year) : null);" },
  { file: binding, from: '    const members = snapshot?.members ?? managerLeagueField({ clubs, club: row.club, league: sizeKey, year: row.year }, keyedRng(`${row.club}|${row.year}|centre|field`)).named;\n    named = members.filter(n => n !== row.club && !rivals.includes(n) && n !== champion);', to: '    const field = managerLeagueField({ clubs, club: row.club, league: sizeKey, year: row.year }, keyedRng(`${row.club}|${row.year}|centre|field`));\n    named = field.named.filter(n => n !== row.club && !rivals.includes(n) && n !== champion);' },
  { file: binding, from: '  /** Held future field spellings, indexed by the unchanged saved derby key. */\n  fixedNames?: Record<string, string>;\n', to: '' },
  { file: binding, from: '    ...(snapshot ? { fixedNames: Object.fromEntries(rivals.map(r => [r, snapshot.members.find(n => clubKey(n) === clubKey(r)) ?? r])) } : {}),\n', to: '' },
  { file: binding, from: "      const championKey = ctx.champion && ctx.rivals.find(r => (ctx.fixedNames?.[r] ?? r) === ctx.champion);\n      const champion = title ? 'mine' as const : championKey ? { key: championKey } : 'other' as const;", to: "      const champion = title ? 'mine' as const : ctx.champion && ctx.rivals.includes(ctx.champion) ? { key: ctx.champion } : 'other' as const;" },
  { file: binding, from: '    if (s.fixedKey) out[s.slot] = { name: ctx.fixedNames?.[s.fixedKey] ?? s.fixedKey, named: true, key: s.fixedKey };', to: '    if (s.fixedKey) out[s.slot] = { name: s.fixedKey, named: true, key: s.fixedKey };' },
];
