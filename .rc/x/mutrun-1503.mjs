// Reviewer (run lens) mutation driver for Round 1503, run on a GitHub runner only, from the repo root:
//   node .rc/x/mutrun-1503.mjs <id>
// Applies one plausible mutation (its line asserted present exactly once), runs the round's unit files on it,
// builds a dist from the mutated tree into a temp folder, PUTS THE FILE BACK, serves that dist and runs the round's
// own walk (scripts/playWorldUcl.mjs) against it. Last line: CAUGHT (exit 1) or SURVIVED (exit 0); 2 = could not run.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const MUTS = {
  M1: { file: 'src/lib/clubManagerWorldView.ts', why: 'watched nights: played off by one (i <= done)',
    from: '    const played = i < done;', to: '    const played = i <= done;' },
  M2: { file: 'src/components/club-manager/WorldCompScreen.tsx', why: 'knockout tie card: second leg score printed the wrong way round',
    from: 'Second leg: {t.away} {t.leg2[1]}-{t.leg2[0]} {t.home}', to: 'Second leg: {t.away} {t.leg2[0]}-{t.leg2[1]} {t.home}' },
  M3: { file: 'src/components/club-manager/ClubManagerSeasonSummary.tsx', why: 'season review: winner and runner-up swapped',
    from: '{ winner: r.winner, runnerUp: r.runnerUp }', to: '{ winner: r.runnerUp, runnerUp: r.winner }' },
  M4: { file: 'src/lib/clubManagerWorldView.ts', why: 'participant: my group venue rule inverted',
    from: 'const home = md < 3 ? idx !== 1 : idx === 1;', to: 'const home = md < 3 ? idx === 1 : idx !== 1;' },
  M5: { file: 'src/components/club-manager/WorldCompScreen.tsx', why: 'back no longer restores the scroll position',
    from: '    window.scrollTo(0, restore.current);', to: '    void 0;' },
  M6: { file: 'src/lib/clubManagerWorldView.ts', why: 'watched ties: two legged ties read as one match',
    from: '    legs: t.leg2 || nights.some(n => n.stage === t.round && n.leg === 2) ? 2 : 1,', to: '    legs: 1,' },
  M7: { file: 'src/lib/clubManagerWorldView.ts', why: 'participant: second leg night scores not flipped to the leg home side',
    from: 'homeGoals: t.leg2 ? t.leg2.awayGoals : null, awayGoals: t.leg2 ? t.leg2.homeGoals : null',
    to: 'homeGoals: t.leg2 ? t.leg2.homeGoals : null, awayGoals: t.leg2 ? t.leg2.awayGoals : null' },
};
const TESTS = ['src/lib/clubManagerWorldView.test.ts', 'src/test/clubManagerBracketMoment.test.tsx',
  'src/test/cmLeagueLeadersCard.test.tsx', 'src/test/clubManagerOfferConfirm.test.tsx'];
const id = process.argv[2];
const m = MUTS[id];
if (!m) { console.log(`mutrun: could not run, unknown mutation ${id}`); process.exit(2); }
const file = path.join(ROOT, m.file);
const original = fs.readFileSync(file);
const text = original.toString('utf8');
const n = text.split(m.from).length - 1;
if (n !== 1) { console.log(`mutrun ${id}: could not run, its line stands ${n} times in ${m.file}`); process.exit(2); }
const tail = (s, k = 3) => s.split('\n').map(x => x.trim()).filter(Boolean).slice(-k).join(' | ');
const dist = fs.mkdtempSync(path.join(os.tmpdir(), `mut-${id}-`));
let vit = -1; let vitLine = ''; let build = -1;
try {
  fs.writeFileSync(file, text.replace(m.from, m.to));
  const v = spawnSync(path.join(ROOT, 'node_modules', '.bin', 'vitest'), ['run', ...TESTS, '--testTimeout=300000', '--hookTimeout=120000'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  vit = v.status;
  const out = (v.stdout || '') + (v.stderr || '');
  vitLine = out.split('\n').filter(l => /Test Files|Tests\s|FAIL|AssertionError|Expected/.test(l)).slice(0, 8).join(' | ').replace(/\s+/g, ' ');
  const b = spawnSync(path.join(ROOT, 'node_modules', '.bin', 'vite'), ['build', '--outDir', dist, '--emptyOutDir'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  build = b.status;
  if (build !== 0) console.log(`build failed: ${tail((b.stdout || '') + (b.stderr || ''), 6)}`);
} finally {
  fs.writeFileSync(file, original);
}
if (!fs.readFileSync(file).equals(original)) { console.log(`mutrun ${id}: could not run, ${m.file} was not put back`); process.exit(2); }
console.log(`mutrun ${id} (${m.why}): vitest exit ${vit}: ${vitLine}`);
let walk = -1; let walkLine = '';
if (build === 0) {
  const port = 4300 + Number(id.slice(1));
  const server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), dist, String(port)], { stdio: 'ignore' });
  const url = `http://localhost:${port}`;
  let up = false;
  for (let i = 0; i < 60 && !up; i += 1) {
    up = await fetch(`${url}/robots.txt`).then(r => r.ok).catch(() => false);
    if (!up) await new Promise(r => setTimeout(r, 500));
  }
  if (up) {
    const w = spawnSync(process.execPath, ['scripts/playWorldUcl.mjs'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28,
      env: { ...process.env, BASE: url, SWEEP_BASE: url } });
    walk = w.status;
    const wout = (w.stdout || '') + (w.stderr || '');
    for (const l of wout.split('\n').filter(x => x.includes('FAIL')).slice(0, 6)) console.log(`   walk: ${l.trim().slice(0, 220)}`);
    walkLine = tail(wout, 1);
  } else walkLine = 'the mutated dist was never served';
  server.kill();
}
console.log(`mutrun ${id}: walk exit ${walk}: ${walkLine}`);
if (vit === 0 && (build !== 0 || walk === 2 || walk === -1)) {
  console.log(`mutrun ${id}: could not run the walk (build exit ${build}, walk exit ${walk}); vitest alone did not catch it`);
  process.exit(2);
}
const caught = vit !== 0 || walk !== 0;
console.log(`mutrun ${id}: ${caught ? 'CAUGHT' : 'SURVIVED'} (${m.why}; vitest exit ${vit}, build exit ${build}, walk exit ${walk})`);
process.exit(caught ? 1 : 0);
