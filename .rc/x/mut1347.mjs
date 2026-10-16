// Round 1347 review (run lens): apply ONE named mutation to the checked out tree, asserting its line is present
// exactly once. The request line restores the tree after the gate it runs (git checkout -- src scripts).
import fs from 'node:fs';

const W = 'src/lib/worldCompetition.ts';
const MUTS = {
  // the tie view shows leg one's score on the night it is played rather than after it (a night early)
  tieleg1: [W, '        if (k > first) view.leg1 = [t.leg1.homeGoals, t.leg1.awayGoals];', '        if (k >= first) view.leg1 = [t.leg1.homeGoals, t.leg1.awayGoals];'],
  // the tie view shows the aggregate and the winner a night early
  tieagg: [W, '      if (k > end) {\n        view.agg', '      if (k >= end) {\n        view.agg'],
  // the eras' default round of 16 pairs each winner with the runner-up of its OWN group
  r16same: [W, '({ home: runnersUp[(i + 1) % winners.length], away: w })', '({ home: runnersUp[i], away: w })'],
  // the league phase nights lose the one round apart rule
  nightsame: [W, 'const r = Math.max(prev + 1, at(f));', 'const r = Math.max(prev, at(f));'],
  // the group draw forgets the Russia and Ukraine ban
  noban: [W, '|| banned(x.assoc, y.assoc) ? 1 : 0', '? 1 : 0'],
  // the group draw counts no clash even when it had to draw one
  noclash: [W, 'return { clubs: cells.flatMap(c => c.map(e => e.club)), clashes: used };', 'return { clubs: cells.flatMap(c => c.map(e => e.club)), clashes: 0 };'],
  // a fixture of the first stage is scored the night before it is played
  fxearly: [W, 'if (md >= k) return { home, away };', 'if (md > k) return { home, away };'],
  // the watched groups go back to the device's order
  locale: [W, "bind.groupRule ?? 'h2hFull', results, byText)", "bind.groupRule ?? 'h2hFull', results)"],
  // extra time in leg two is added the wrong way round
  etswap: [W, 'const [ea, eh] = sim(t.away, t.home, rules.etScale);', 'const [eh, ea] = sim(t.away, t.home, rules.etScale);'],
  // the 2020 era's draw forgets the ban (a stale constant)
  ban2020: [W, "2015: [['Russia', 'Ukraine']], 2020: [['Russia', 'Ukraine']],", "2015: [['Russia', 'Ukraine']], 2020: [],"],
  // two league phase nights share one mark (a stale constant)
  marks: [W, '[0.50, 0.53, 0.60, 0.63,', '[0.50, 0.50, 0.60, 0.63,'],
  // the participant's default order is no longer the device's (correction 1's promise: unchanged callers)
  defaultorder: ['src/lib/clubManagerUclGroups.ts', 'const byLocale: NameOrder = (a, b) => a.localeCompare(b);', 'const byLocale: NameOrder = (a, b) => (a < b ? -1 : a > b ? 1 : 0);'],
};
if (process.argv[2] === '--dry') {
  for (const [k, [file, from]] of Object.entries(MUTS)) {
    const s = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
    console.log(`${k}: ${s.split(from).length - 1}`);
  }
  process.exit(0);
}
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`mut1347: unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`mut1347: ${name}: its line is in ${file} ${n} times, it must be exactly once: ABORTED`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`mut1347: ${name} applied to ${file}`);
