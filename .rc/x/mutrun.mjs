/* Reviewer mutation runner for Round 1541. Not committed. Runs on a GitHub
   runner only: node .rc/x/mutrun.mjs <name>
   Makes its own git worktree of HEAD under /tmp, links the checkout's
   node_modules into it, applies ONE mutation there (asserting its anchor is
   present exactly once), runs the round's gates in that tree, and prints
   which went red. The checkout itself is never edited.
   Exit 1: the mutation was CAUGHT (some gate red). Exit 0: it SURVIVED
   (every gate green). Exit 2: could not run. */
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const MUTS = {
  quarter: { file: 'src/lib/careerIntl.ts', from: "if (p[4].includes(nation)) return 'quarter';", to: "if (false && p[4].includes(nation)) return 'quarter';", why: 'the other quarter-finalists of a played edition play at the field rung (76) instead of 82' },
  pool3: { file: 'src/lib/careerIntl.ts', from: 'let pool = poolOf(past.slice(-2));', to: 'let pool = poolOf(past.slice(-3));', why: 'a generated field draws from the last THREE played fields, not the last two the help promises' },
  thirds: { file: 'src/lib/careerIntl.ts', from: '.filter(Boolean).sort(order).slice(0, shape.thirdsThrough)', to: '.filter(Boolean).slice(0, shape.thirdsThrough)', why: 'the third placed sides go through in group order, not the best two by record' },
  knock: { file: 'src/lib/careerIntl.ts', from: 'const hurt = rng() < bind.knockChance(c);', to: 'const hurt = rng() > bind.knockChance(c);', why: 'the knock comparison flipped: about 92 percent of tournaments send him home hurt, the help still says 8' },
  bronzefourth: { file: 'src/lib/careerIntl.ts', from: "if (r.place === 'bronze') s.bronze += 1;", to: "if (r.place === 'fourth') s.bronze += 1;", why: 'intlStatsOf counts a fourth place as a bronze medal' },
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`unknown mutation ${name}`); process.exit(2); }
const ROOT = process.cwd();
const OUT = process.env.RC_OUT || '/tmp/rc-out';
fs.mkdirSync(OUT, { recursive: true });
const dir = `/tmp/mut-${name}`;
for (let tries = 1; ; tries += 1) {
  try { execSync(`git worktree add -f --detach ${dir} HEAD`, { stdio: 'ignore' }); break; }
  catch (e) { if (tries >= 5) { console.log(`mutation ${name} cannot run: git worktree add failed`); process.exit(2); } execSync('sleep 3'); }
}
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
const abs = path.join(dir, m.file);
const src = fs.readFileSync(abs, 'utf8');
const hits = src.split(m.from).length - 1;
if (hits !== 1) { console.log(`mutation ${name} cannot run: anchor found ${hits} times in ${m.file}`); process.exit(2); }
fs.writeFileSync(abs, src.replace(m.from, m.to));
console.log(`MUTATION ${name}: ${m.why}`);
const runs = [
  ['s1', 'node scripts/simCareerIntl.mjs'],
  ['s5', 'INTL_SECTIONS=5 node scripts/simCareerIntl.mjs'],
  ['s8', 'INTL_SECTIONS=8 node scripts/simCareerIntl.mjs'],
  ['unit', 'node_modules/.bin/vitest run src/lib/careerIntl.test.ts src/test/nbaCareerIntl.test.ts'],
];
if (name === 'knock') runs.push(['s7', `mkdir -p /tmp/base-${name} && git -C ${ROOT} archive e3deb2cb3 | tar -x -C /tmp/base-${name} && INTL_BASE_DIR=/tmp/base-${name} INTL_SECTIONS=7 node scripts/simCareerIntl.mjs`]);
const res = [];
for (const [label, cmd] of runs) {
  const t0 = Date.now();
  const tmp = fs.mkdtempSync(`/tmp/mt-${name}-${label}-`);
  const r = spawnSync('bash', ['-c', cmd], { cwd: dir, encoding: 'utf8', env: { ...process.env, TMPDIR: tmp, TEMP: tmp, TMP: tmp }, maxBuffer: 64 * 1024 * 1024 });
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  fs.writeFileSync(path.join(OUT, `mut-${name}-${label}.log`), text);
  const lines = text.trim().split('\n');
  const tail = lines.filter(l => /FAIL|GREEN|RED|Tests |Test Files|failed|passed/.test(l)).slice(-4);
  res.push([label, r.status]);
  console.log(`  ${label} exit=${r.status} ${Math.round((Date.now() - t0) / 1000)}s`);
  for (const l of tail) console.log(`    ${l.slice(0, 220)}`);
}
const red = res.filter(([, s]) => s !== 0);
console.log(`MUTATION ${name}: ${res.map(([l, s]) => `${l}=${s}`).join(' ')} => ${red.length ? `CAUGHT by ${red.map(([l]) => l).join(', ')}` : 'SURVIVED, every gate green'}`);
process.exit(red.length ? 1 : 0);
