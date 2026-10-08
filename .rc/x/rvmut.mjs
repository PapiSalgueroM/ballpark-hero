/* Reviewer's mutation runner (never committed). Runs on the GitHub runner from the repo root:
     node .rc/x/rvmut.mjs <mutation>
   Applies ONE exact string replacement to the checkout, runs the round's gates, prints which
   gate caught it, restores the file with git. Exit 0 = caught by at least one gate,
   1 = SURVIVED (everything green on a broken rule), 2 = the anchor was not found. */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const L = 'src/lib/soccerCareerLeague.ts';
const G = 'scripts/lib/careerClubPool.mjs';
const NUDGE = 'const nudge = rating >= 7.5 ? -at(0.1) : rating < 6.3 ? at(0.1) : 0;';
const MUTS = {
  rankoff: { file: L, from: 'ladderBand(before + 1, n, size, input.rating, before + g.length)', to: 'ladderBand(before, n, size, input.rating, before + g.length)' },
  grouplast: { file: L, from: 'ladderBand(before + 1, n, size, input.rating, before + g.length)', to: 'ladderBand(before + 1, n, size, input.rating, before + 1)' },
  nudgeedge: { file: L, from: NUDGE, to: 'const nudge = rating > 7.5 ? -at(0.1) : rating < 6.3 ? at(0.1) : 0;', nth: 1 },
  nudgelow: { file: L, from: NUDGE, to: 'const nudge = rating >= 7.5 ? -at(0.1) : rating <= 6.3 ? at(0.1) : 0;', nth: 1 },
  yeargate: { file: L, from: 'const groups = input.year >= LIST_SEASON && input.league !== null', to: 'const groups = input.year > LIST_SEASON && input.league !== null' },
  keystart: { file: L, from: 'return parts[parts.length - 6] || null;', to: 'return parts[1] || null;' },
  dugoutflag: { file: L, from: 'const windows = LEAGUE_SIZES[league] ?? (dugout ? DUGOUT_SIZES[league] : undefined);', to: 'const windows = LEAGUE_SIZES[league] ?? DUGOUT_SIZES[league];' },
  nohold: { file: L, from: 'if (then !== null && then === leagueSizeFor(key, year)) return null;', to: '' },
  oddsize: { file: L, from: 'const size = verified ?? oddClubs ?? Math.max(MANAGER_FIELD, names.length + 1);', to: 'const size = verified ?? Math.max(MANAGER_FIELD, names.length + 1);' },
  halfwide: { file: L, from: 'const half = Math.max(2, at(0.15));', to: 'const half = Math.max(2, at(0.25));' },
  belgium16: { file: L, from: '"Belgian Pro League": [{ from: 2026, size: 18 }],', to: '"Belgian Pro League": [{ from: 2026, size: 16 }],' },
  champ22: { file: L, from: '"Championship": [{ from: 2004, size: 24 }],', to: '"Championship": [{ from: 2004, size: 22 }],' },
  placescale: { file: L, from: 'const place = (r: number) => Math.round(n > 1 ? 1 + ((r - 1) * (size - 1)) / (n - 1) : r);', to: 'const place = (r: number) => Math.round(r);' },
  absdrop: { file: L, from: 'const ABSOLUTE_BAND = new Set(["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1"]);', to: 'const ABSOLUTE_BAND = new Set(["Premier League", "La Liga", "Serie A", "Bundesliga"]);' },
  sinceorder: { file: 'src/lib/careerEras.ts', from: '  ...CAREER_POOL_SINCE,\n  "Leipzig": 2010, "RB Leipzig": 2010, "Inter Miami": 2020, "LAFC": 2018,', to: '  "Leipzig": 2010, "RB Leipzig": 2010, "Inter Miami": 2020, "LAFC": 2018,\n  ...CAREER_POOL_SINCE,' },
  oddwords: { file: L, from: 'if (league && latest) return `The order only: ${leagueWithArticle(league)} ${latest.words}, so no points here.`;', to: 'if (league && latest && false) return "";' },
  /* generator mutations: the pool file is regenerated from the broken generator before the gates */
  xiasc: { file: G, from: 'sort((a, b) => b.xi - a.xi || byName(a.name, b.name))', to: 'sort((a, b) => a.xi - b.xi || byName(a.name, b.name))', regen: true },
  allranked: { file: G, from: 'members.push({ name: m.name, tier, xi: m.xi, ranked: rankable(m.cm) });', to: 'members.push({ name: m.name, tier, xi: m.xi, ranked: true });', regen: true },
  tierflat: { file: G, from: 'if (stronger.length) tier = Math.max(...stronger.map(h => h.tier));', to: 'if (stronger.length) tier = Math.min(...stronger.map(h => h.tier));', regen: true },
};
const GATES = [
  ['vitest', 'node_modules/.bin/vitest run src/lib/soccerCareerLeagueBand.test.ts src/lib/soccerCareerLeague.test.ts src/lib/soccerCareerLeagueSeasons.test.ts --testTimeout=300000 --hookTimeout=120000'],
  ['world', 'node scripts/simCareerLeagueWorld.mjs'],
  ['clubPool', 'node scripts/simCareerClubPool.mjs'],
  ['facts', 'node scripts/simCareerFacts.mjs'],
  ['leagueFinish', 'node scripts/simCareerLeagueFinish.mjs'],
  ['leagueSeasons', 'node scripts/simCareerLeagueSeasons.mjs'],
  ['manager', 'node scripts/simManagerCareer.mjs'],
  ['centreTable', 'node scripts/simSeasonCentreTable.mjs'],
  ['agree0', 'SEEDSET=0 node scripts/simSeasonCentreAgreement.mjs'],
  ['derbies', 'node scripts/simCareerDerbies.mjs'],
];

const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.error(`unknown mutation ${name}: ${Object.keys(MUTS).join(', ')}`); process.exit(2); }
const src = fs.readFileSync(m.file, 'utf8');
const parts = src.split(m.from);
const nth = m.nth ?? 0;
if (parts.length - 1 <= nth) { console.error(`MUT ${name}: anchor found ${parts.length - 1} times in ${m.file}, occurrence ${nth} wanted: DEAD MUTATION`); process.exit(2); }
const out = parts.slice(0, nth + 1).join(m.from) + m.to + parts.slice(nth + 1).join(m.from);
if (out === src) { console.error(`MUT ${name}: the replacement changed nothing`); process.exit(2); }
fs.writeFileSync(m.file, out);
console.log(`MUT ${name}: ${m.file} patched (occurrence ${nth} of ${parts.length - 1})`);
const run = cmd => spawnSync('bash', ['-c', cmd], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60 * 1000 });
const lastLine = r => ((r.stdout || '') + (r.stderr || '')).trim().split('\n').filter(x => x.trim()).slice(-1)[0] || '';
const fails = r => ((r.stdout || '') + (r.stderr || '')).split('\n').filter(x => /FAIL|AssertionError|✗|×|not ok|Error:/.test(x)).slice(0, 6);
const caught = [];
try {
  if (m.regen) {
    const g = run('node scripts/genCareerClubPool.mjs');
    console.log(`  regen exit=${g.status} | ${lastLine(g).slice(0, 200)}`);
    const d = run('git diff --stat -- src/data/soccerCareerClubPool.ts | tail -1');
    console.log(`  pool file after regen: ${d.stdout.trim() || 'UNCHANGED'}`);
    if (g.status !== 0) caught.push('regen');
  }
  for (const [label, cmd] of GATES) {
    const t = Date.now();
    const r = run(cmd);
    const red = r.status !== 0;
    if (red) caught.push(label);
    console.log(`  ${label} exit=${r.status} ${Math.round((Date.now() - t) / 1000)}s | ${lastLine(r).slice(0, 220)}`);
    if (red) for (const f of fails(r)) console.log(`      ${f.trim().slice(0, 260)}`);
  }
} finally {
  const back = run(`git checkout -- ${m.file} src/data/soccerCareerClubPool.ts && git status --porcelain --untracked-files=no | grep -v '^.. .rc/' | head -5`);
  console.log(`  restored (${(back.stdout || '').trim() || 'tree clean'})`);
}
if (caught.length) { console.log(`MUT ${name}: CAUGHT by ${caught.join(', ')}`); process.exit(0); }
console.log(`MUT ${name}: SURVIVED every gate`);
process.exit(1);
