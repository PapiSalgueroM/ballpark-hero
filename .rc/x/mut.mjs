// Round 1304 reviewer mutations (sent as an extra file, applied on the runner only, restored by git checkout in the same line).
// node .rc/x/mut.mjs <name>   edits ONE line of a source file, refusing unless its anchor is there exactly once.
import fs from 'node:fs';

const ENGINE = 'src/lib/clubManager.ts';
const JOIN = 'src/data/clubManagerWorldRosters.ts';
const HELPER = "  if (eraId && isHistoricEra(eraId)) return (ERA_LEAGUES[eraId] ?? []).map(l => eraPlayableClubs(eraId, l.id));";
const MUTATIONS = {
  /* a stale constant: every past season reads the 2020-21 leagues */
  eraconst: [ENGINE, HELPER, "  if (eraId && isHistoricEra(eraId)) return (ERA_LEAGUES['era2020'] ?? []).map(l => eraPlayableClubs('era2020', l.id));"],
  /* the wrong function: the era's league ids handed to today's club list */
  wrongfn: [ENGINE, HELPER, "  if (eraId && isHistoricEra(eraId)) return (ERA_LEAGUES[eraId] ?? []).map(l => playableClubs(l.id));"],
  /* the rule holds in the first season only: from the second summer on, today's clubs buy again */
  seasononly: [ENGINE, HELPER, "  if (eraId && isHistoricEra(eraId) && state.season <= 1) return (ERA_LEAGUES[eraId] ?? []).map(l => eraPlayableClubs(eraId, l.id));"],
  /* a dropped argument: the market forgets which season the save plays */
  marketera: [ENGINE, "  return marketBase(yearsOn(career), career.eraId)", "  return marketBase(yearsOn(career))"],
  /* the join stops moving the man a newer squad list moved: one real man at two clubs */
  nosupersede: [JOIN, "    if (list) out[club] = list.filter(p => p.n !== name);", "    if (list) out[club] = list;"],
  /* an off by one: the rival of a negotiation is drawn from the six strongest of each league, not five (sabotage only, measures the net) */
  topsix: [ENGINE, "    const spenders = actingClubsByLeague(career).flatMap(cs => cs.slice(0, 5).map(c => c.name))", "    const spenders = actingClubsByLeague(career).flatMap(cs => cs.slice(0, 6).map(c => c.name))"],
};
const name = process.argv[2];
const m = MUTATIONS[name];
if (!m) { console.error(`unknown mutation ${name}`); process.exit(2); }
const [file, anchor, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(anchor).length - 1;
if (n !== 1) { console.error(`MUTATION ${name} did not apply: its anchor is in ${file} ${n} times`); process.exit(2); }
fs.writeFileSync(file, src.replace(anchor, to));
console.log(`MUTATION ${name} applied to ${file}`);
