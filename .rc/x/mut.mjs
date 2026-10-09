/* Reviewer: mutations of the seam's core rules, one at a time, on the runner's checkout. Sent as .rc/x/mut.mjs.
   Each mutation: assert its string is there exactly once, patch, run its checks, restore. Never committed. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const OUT = process.env.RC_OUT ?? '.';
fs.mkdirSync(OUT, { recursive: true });
const V = 'node_modules/.bin/vitest run';
const VT = '--testTimeout=300000 --hookTimeout=120000';
const USC0 = 'SEEDSET=0 node scripts/simUsSeasonCentre.mjs';
const TRUTH = 'node scripts/simNflTruth.mjs';
const T = {
  nfl: 'src/test/usSeasonNfl.test.ts', us: 'src/test/usSeason.test.ts', truth: 'src/test/nflTruthRules1104.test.ts',
  help: 'src/test/usCareerHelpRules1104.test.tsx', entry: 'src/test/usSeasonCentreEntry.test.tsx', centre: 'src/test/usSeasonCentre.test.tsx',
};
const MUTS = [
  { id: 'm0-baseline', file: null, cmds: [['vitest-all-six', `${V} ${Object.values(T).join(' ')} ${VT}`], ['simTrustCopy', 'node scripts/simTrustCopy.mjs']] },
  { id: 'm1-odd-tenths-of-a-sack-dropped', file: 'src/lib/season/nfl.ts',
    from: '    if (left % 5 > 0) t[t.indexOf(Math.max(...t))] += left % 5;\n', to: '',
    cmds: [['vitest-nfl', `${V} ${T.nfl} ${VT}`], ['usc-set0', USC0]] },
  { id: 'm2-held-line-says-this-career-plays-17', file: 'src/data/usSeasonLengths.ts',
    from: '{ nba: false, nfl: true }', to: '{ nba: false, nfl: false }',
    cmds: [['vitest-us-nfl-entry', `${V} ${T.us} ${T.nfl} ${T.entry} ${VT}`]] },
  { id: 'm3-viewer-plays-at-most-16', file: 'src/lib/season/nfl.ts',
    from: 'availability: row => ({ played: row.games, block: 0, severe: false }),', to: 'availability: row => ({ played: Math.min(row.games, 16), block: 0, severe: false }),',
    cmds: [['vitest-nfl', `${V} ${T.nfl} ${VT}`], ['usc-set0', USC0]] },
  { id: 'm4-a-year-off-the-ledger-plays-16', file: 'src/lib/nflMyCareer.ts',
    from: "return usSeasonLength('nfl', year) ?? NFL_RATE_GAMES;", to: "return usSeasonLength('nfl', year) ?? 16;",
    cmds: [['vitest-truth-help-us', `${V} ${T.truth} ${T.help} ${T.us} ${VT}`], ['simNflTruth', TRUTH], ['usc-set0', USC0]] },
  { id: 'm5-headline-missed-games-off-a-stale-17', file: 'src/lib/nflCareerLoop.ts',
    from: 'Math.max(0, nflSeasonLength(line.year) - line.games)', to: 'Math.max(0, 17 - line.games)',
    cmds: [['vitest-truth', `${V} ${T.truth} ${VT}`], ['simNflTruth', TRUTH]] },
  { id: 'm6-watch-again-offered-for-a-held-year', file: 'src/components/us-career/season/UsSeasonCentreEntry.tsx',
    from: '&& !sport.seasonCentreHeld?.(last.year, career.eraId) ? last : null', to: '? last : null',
    cmds: [['vitest-entry-centre', `${V} ${T.entry} ${T.centre} ${VT}`]] },
  { id: 'm7-llms-says-120', file: 'public/llms.txt', from: '130+ games', to: '120+ games', cmds: [['simTrustCopy', 'node scripts/simTrustCopy.mjs']] },
  { id: 'm8-ledger-2021-still-16', file: 'src/data/usSeasonLengths.ts',
    from: '    { from: 2005, to: 2020, games: 16 },\n    { from: 2021, to: 2021, games: 17 },', to: '    { from: 2005, to: 2021, games: 16 },',
    cmds: [['vitest-us-truth', `${V} ${T.us} ${T.truth} ${VT}`]] },
];
const ONLY = (process.argv[2] ?? '').split(',').filter(Boolean);
const lines = [];
const norm = s => s.replace(/\r\n/g, '\n');
for (const m of MUTS) {
  if (ONLY.length && !ONLY.some(o => m.id.startsWith(o))) continue;
  let orig = null;
  try {
    if (m.file) {
      orig = fs.readFileSync(m.file, 'utf8');
      const src = norm(orig);
      const n = src.split(m.from).length - 1;
      if (n !== 1) { lines.push(`${m.id}: REFUSED, its string is there ${n} times in ${m.file}`); continue; }
      fs.writeFileSync(m.file, src.replace(m.from, () => m.to));
    }
    const got = [];
    for (const [label, cmd] of m.cmds) {
      const t0 = Date.now();
      const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', 'mut-'));
      const r = spawnSync('bash', ['-c', cmd], { encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, TMPDIR: tmp, TEMP: tmp, TMP: tmp } });
      const text = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
      fs.writeFileSync(path.join(OUT, `${m.id}.${label}.log`), text.slice(-60000));
      const tail = text.split('\n').map(s => s.trim()).filter(Boolean);
      const fails = tail.filter(s => /^(FAIL|×|✗)|FAIL |AssertionError|expected/.test(s)).slice(0, 4).map(s => s.slice(0, 200));
      got.push(`${label} exit=${r.status}${r.signal ? ` signal=${r.signal}` : ''} ${Math.round((Date.now() - t0) / 1000)}s | ${(tail[tail.length - 1] ?? '').slice(0, 200)}${fails.length ? ` || first reds: ${fails.join(' ; ')}` : ''}`);
    }
    const caught = got.some(g => !/ exit=0 /.test(g));
    lines.push(`${m.id}: ${m.file ? (caught ? 'CAUGHT' : 'SURVIVED (every check green)') : (caught ? 'BASELINE RED' : 'baseline green')}`);
    for (const g of got) lines.push(`    ${g}`);
  } finally {
    if (m.file && orig !== null) fs.writeFileSync(m.file, orig);
  }
  console.log(lines.slice(-4).join('\n'));
}
fs.writeFileSync(path.join(OUT, 'mutations.txt'), `${lines.join('\n')}\n`);
console.log('==== mutations ====');
console.log(lines.join('\n'));
const dirty = spawnSync('git', ['status', '--porcelain', '--untracked-files=no', '--', 'src', 'public', 'scripts'], { encoding: 'utf8' }).stdout.trim();
console.log(`tree after: ${dirty ? `DIRTY ${dirty.slice(0, 200)}` : 'clean'}`);
console.log('mut: done');
