// Reviewer's mutations for Round 1225. Usage: node .rc/x/rmut.mjs <name>
// Each edits ONE source file in place at an anchor that must exist exactly once, and refuses otherwise.
import { readFileSync, writeFileSync } from 'node:fs';

const HELPER = 'src/lib/clubManagerFixtures.ts';
const ENGINE = 'src/lib/clubManager.ts';
const DEADLINE = 'src/lib/deadlineDay.ts';
const HOOK = 'src/hooks/useClubManager.ts';

const MUTS = {
  // A: off by one, the last matchday falls through to the generated list.
  lastround: [{ file: HELPER, from: 'round >= list.ledger.rounds.length) return null;', to: 'round >= list.ledger.rounds.length - 1) return null;' }],
  // B: dropped filter, a job move inside a running save (startCareer with a world) may bind.
  noworldguard: [{ file: ENGINE, from: 'if (!world && !worldEdit && !custom) {\n    const realList = realLeagueFixtureKeyForStart(', to: 'if (!worldEdit && !custom) {\n    const realList = realLeagueFixtureKeyForStart(' }],
  // C: swapped data path, the Bundesliga line loads the 2. Bundesliga file and the other way round.
  swaploaders: [
    { file: HELPER, from: "import('@/data/clubManagerBundesligaFixtures2026').then(m => m.BUNDESLIGA_FIXTURES_2026)", to: "import('@/data/clubManagerBundesliga2Fixtures2026').then(m => m.BUNDESLIGA2_FIXTURES_2026)", tag: 'x1' },
  ],
  // D: a key is given although the list is not here.
  keynolist: [{ file: HELPER, from: 'return entry && ledger && canBindRealLeagueFixtures(state, ledger, leagueId, clubs) ? entry.key : null;', to: 'return entry && (!ledger || canBindRealLeagueFixtures(state, ledger, leagueId, clubs)) ? entry.key : null;' }],
  // E: Deadline Day keeps the key.
  deadlinestrip: [{ file: DEADLINE, from: '    delete state0.realLeagueFixtures;', to: '    void 0;' }],
  // F: the home and away of the OTHER leagues only (a fault that the Premier League proof alone cannot see).
  lazyvenues: [{ file: HELPER, from: 'return list.ledger.rounds[round].map(([home, away]): [string, string] => [home, away]);', to: 'return list.ledger.rounds[round].map(([home, away]): [string, string] => (list.entry.load ? [away, home] : [home, away]));' }],
  // G: the club tap fetches the list of the default era whatever era was picked (a stale constant).
  // Not used by a sim harness; kept for a walk.
  // H: the label says "first published" for every list (a false claim for five leagues).
  alwayspublished: [{ file: HELPER, from: "return 'published' in asOf ? `the list as first published in ${asOf.published}` : `the list as it stood on ${asOf.stoodOn}`;", to: "return 'published' in asOf ? `the list as first published in ${asOf.published}` : `the list as first published in June 2026`;" }],
  // I: one frozen ledger row changed in a lazy data file (a venue swapped in La Liga's first round).
  // Built at run time from the file's first pair.
  dataswap: 'dataswap',
  // J: longer carry for the fleet's old saves (not a fault: a stronger test). Edits the harness.
  // Resolved at run time, see below.
};

const name = process.argv[2];
if (name === 'dataswap') {
  const file = 'src/data/clubManagerLaLigaFixtures2026.ts';
  const src = readFileSync(file, 'utf8');
  const m = src.match(/\[\s*"([^"]+)",\s*"([^"]+)"\s*\]|\[\s*'([^']+)',\s*'([^']+)'\s*\]/);
  if (!m) { console.error('rmut dataswap: no pair found in the La Liga file'); process.exit(7); }
  const a = m[1] ?? m[3], b = m[2] ?? m[4];
  const swapped = m[0].replace(a, '\u0000').replace(b, a).replace('\u0000', b);
  if (swapped === m[0]) { console.error('rmut dataswap: the swap changed nothing'); process.exit(7); }
  writeFileSync(file, src.replace(m[0], swapped));
  console.log(`rmut dataswap: La Liga first pair ${a} v ${b} now ${b} v ${a}`);
  process.exit(0);
}
const list = MUTS[name];
if (!Array.isArray(list)) { console.error(`rmut: no such mutation ${name}; have ${Object.keys(MUTS).join(', ')}`); process.exit(7); }
for (const mu of list) {
  const src = readFileSync(mu.file, 'utf8');
  const n = src.split(mu.from).length - 1;
  if (n !== 1) { console.error(`rmut ${name}: anchor found ${n} times in ${mu.file}, need exactly 1: ${mu.from.slice(0, 80)}`); process.exit(7); }
  const out = src.replace(mu.from, mu.to);
  if (out === src) { console.error(`rmut ${name}: the edit changed nothing`); process.exit(7); }
  writeFileSync(mu.file, out);
}
console.log(`rmut ${name}: applied (${list.length} edit(s))`);
