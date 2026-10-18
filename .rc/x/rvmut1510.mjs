/* Review of Round 1510 (lens: runs things). Applies one named mutation to the checkout in the CURRENT directory,
 * refusing (exit 2) unless its anchor stands exactly once. Never committed; sent as an extra file of a remote check
 * and restored in the same request line with git checkout. */
import fs from 'node:fs';
import path from 'node:path';

const CM = 'src/lib/clubManager.ts';
const MUTATIONS = {
  /* The critic's forbidden "midweekCost": the night's match cost with no midweek recovery (ruling 2b). */
  norecovery: [CM, '  state.squad = state.squad.map(p => ({ ...p, fitness: fitnessAfterWeek(p.fitness, playedIds.has(p.id), recoveryMod, flat) }));',
    '  state.squad = state.squad.map(p => ({ ...p, fitness: fitnessAfterWeek(p.fitness, playedIds.has(p.id), 0, 0) }));'],
  /* Off by one in the move's carry: a cup already shown to the manager becomes a 'joined' stub (correction 7). */
  carryseen: [CM, '    if (slice.clubs?.includes(joined.clubName) && seen < oneOffNightsOf(row).length) {',
    '    if (slice.clubs?.includes(joined.clubName) && seen <= oneOffNightsOf(row).length) {'],
  /* A dropped filter: any played entry (the super cup night included) starts the league (correction 13). */
  leaguestarted: [CM, "  for (let i = 0; i < state.week && i < cal.length; i += 1) if (cal[i].type === 'league') return true;",
    "  for (let i = 0; i < state.week && i < cal.length; i += 1) if (cal[i].type !== 'window') return true;"],
  /* A swapped argument: my result written into the slice the wrong way round. */
  resswap: [CM, '  const res: NightResult = { h: iAmHome ? mine : theirs, a: iAmHome ? theirs : mine };',
    '  const res: NightResult = { h: iAmHome ? theirs : mine, a: iAmHome ? mine : theirs };'],
  /* A swapped orientation: the shootout's winner written for the other side. */
  penswap: [CM, "  if (shootoutWon !== null) res.pens = shootoutWon === iAmHome ? 'h' : 'a';",
    "  if (shootoutWon !== null) res.pens = shootoutWon === iAmHome ? 'a' : 'h';"],
};

const name = process.argv[2];
const m = MUTATIONS[name];
if (!m) { console.log(`rvmut1510: unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
const abs = path.join(process.cwd(), file);
const text = fs.readFileSync(abs, 'utf8');
const n = text.split(from).length - 1;
if (n !== 1) { console.log(`rvmut1510: ${name}: its anchor stands ${n} times in ${file}, it must be once; nothing changed`); process.exit(2); }
fs.writeFileSync(abs, text.replace(from, to));
const after = fs.readFileSync(abs, 'utf8');
if (after.split(to).length - 1 !== 1) { console.log(`rvmut1510: ${name}: the mutation did not land`); process.exit(2); }
console.log(`rvmut1510: MUTATED ${name} in ${file}`);
