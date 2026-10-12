// AXG, attribution leg for the league rules digest: put the rule before Round 1304 back
// (the news feed's buyer and the rival of a negotiation read today's leagues in every era).
import fs from 'node:fs';
const file = 'src/lib/clubManager.ts';
const from = '  if (eraId && isHistoricEra(eraId)) return (ERA_LEAGUES[eraId] ?? []).map(l => eraPlayableClubs(eraId, l.id));\n  return REAL_LEAGUES.map(l => playableClubs(l.id));';
const to = '  return REAL_LEAGUES.map(l => playableClubs(l.id));';
const text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
if (text.split(from).length !== 2) { console.error('mut1304: the anchor is not in the file exactly once'); process.exit(2); }
fs.writeFileSync(file, text.replace(from, to));
console.log('mut1304: actingClubsByLeague answers today\'s leagues in every era (the rule before Round 1304)');
