// Release AV fix2: proves the lead's hand step on a runner's THROWAWAY checkout. Never committed.
// Sent as .rc/x/fx2ProveBudgets.mjs beside .rc/x/fix2-AV-setBudgetsAV.mjs, in a #!serve #!playwright request.
// 1. both weight fences on the served build of the pushed head, as they stand (both must be red, as the closing check found)
// 2. where the roster beat builder rides in the build, and whether the flagship loads that chunk before it can render
// 3. the helper refuses a lower number and writes nothing
// 4. the helper with THIS build's own numbers, then both fences again (both must be green)
// 5. the diff the helper made, kept in $RC_OUT/budgets-av.patch, with no dash character in an added line
// The scripts folder is put back at the end.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.env.RC_OUT || '.';
const HELPER = '.rc/x/fix2-AV-setBudgetsAV.mjs';
const NEW_CEILING = process.env.FX2_CEILING || '2700';
let bad = 0;
const want = (ok, text) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`); if (!ok) bad += 1; };
const run = (label, cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  fs.writeFileSync(path.join(OUT, `${label}.log`), text);
  const lines = text.trim().split('\n');
  return { code: r.status, text, last: lines[lines.length - 1] ?? '' };
};
const sha = f => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const sweep = label => run(label, 'node', ['scripts/sweepWeight.mjs'], { SWEEP_OFFLINE: '1' });
const flag = label => run(label, 'node', ['scripts/simFlagshipWeight.mjs']);

/* 1. as they stand */
const s1 = sweep('sweep-before');
const over = [...s1.text.matchAll(/FAIL: (\/[a-z0-9-]*): (\d+)K of gzipped JavaScript against a budget of (\d+)K/g)].map(m => ({ route: m[1], kb: Number(m[2]), budget: Number(m[3]) }));
console.log(`sweepWeight as it stands: exit ${s1.code}, "${s1.last}"`);
for (const o of over) console.log(`   over: ${o.route} ${o.kb}K against ${o.budget}K`);
for (const l of s1.text.split('\n').filter(l => /K to the tenth\)/.test(l) && /club-manager|manager-hot-seat|deadline-day|soccer-career|nfl-my-career|front-office|^\s+\/\s/.test(l))) console.log(`   row: ${l.trim()}`);
want(s1.code === 1 && over.length > 0, `sweepWeight is red on the pushed head as the closing check found (${over.length} rows over)`);
const f1 = flag('flag-before');
const fm = f1.text.match(/(\d+) chunks, (\d+) KB raw \(ceiling (\d+)\)/);
console.log(`simFlagshipWeight as it stands: exit ${f1.code}, "${f1.last}"${fm ? `, ${fm[1]} chunks, ${fm[2]} KB raw, ceiling ${fm[3]}` : ''}`);
want(f1.code === 1 && !!fm, 'simFlagshipWeight is red on the pushed head as the closing check found');

/* 2. where the roster beat rides */
const ASSETS = 'dist/assets';
const files = fs.readdirSync(ASSETS).filter(f => f.endsWith('.js'));
const CHUNK_IMPORT = /(?:^|[;\s}])import\s*(?:[^'"]*?\s*from\s*)?["']\.\/([^"']+\.js)["']/g;
const depsOf = f => { const t = fs.readFileSync(path.join(ASSETS, f), 'utf8'); const out = new Set(); CHUNK_IMPORT.lastIndex = 0; for (let m; (m = CHUNK_IMPORT.exec(t)) !== null;) out.add(m[1]); return [...out]; };
const closure = start => { const seen = new Set(); const q = [...start]; while (q.length) { const f = q.pop(); if (!f || seen.has(f) || !files.includes(f)) continue; seen.add(f); for (const d of depsOf(f)) q.push(d); } return seen; };
const entry = files.find(f => /^index-.*\.js$/.test(f));
const soccer = files.find(f => /^SoccerCareer-.*\.js$/.test(f));
const flagship = closure([entry, soccer]);
let rawTotal = 0; for (const f of flagship) rawTotal += fs.statSync(path.join(ASSETS, f)).size;
console.log(`the flagship's static closure: ${flagship.size} chunks, ${rawTotal} bytes raw (${(rawTotal / 1024).toFixed(1)} KB)`);
const MARKS = [['the roster beat words of Round 1227, only the US careers deal them', 'are both on them'], ['the own roster words MLB and the NHL share, older than this release', 'one more line in the argument between you and']];
for (const [what, mark] of MARKS) {
  const holders = files.filter(f => fs.readFileSync(path.join(ASSETS, f), 'utf8').includes(mark));
  console.log(`   "${mark}" (${what}) is in: ${holders.map(f => `${f} (${fs.statSync(path.join(ASSETS, f)).size} bytes${flagship.has(f) ? ', LOADED BY /soccer-career before it can render' : ', not in the flagship closure'})`).join('; ') || 'no chunk'}`);
}

/* 3. the helper refuses a lower number and writes nothing */
const before = [sha('scripts/sweepWeight.mjs'), sha('scripts/simFlagshipWeight.mjs')];
const low = run('helper-lower', 'node', [HELPER, '/club-manager=1']);
want(low.code === 2 && sha('scripts/sweepWeight.mjs') === before[0], `the helper refuses a lower budget and writes nothing (exit ${low.code}: "${low.last}")`);
const lowC = run('helper-lower-ceiling', 'node', [HELPER, '--flagship=100']);
want(lowC.code === 2 && sha('scripts/simFlagshipWeight.mjs') === before[1], `the helper refuses a lower ceiling and writes nothing (exit ${lowC.code}: "${lowC.last}")`);

/* 4. the helper with this build's own numbers */
const args = [HELPER, ...over.map(o => `${o.route}=${o.kb}`), ...(fm ? [`--flagship=${NEW_CEILING}`, `--flagship-measured=${fm[2]}`] : [])];
const h = run('helper', 'node', args);
console.log(`the helper: node ${args.join(' ')}`);
for (const l of h.text.trim().split('\n')) console.log(`   ${l}`);
want(h.code === 0, `the helper wrote its numbers (exit ${h.code})`);
const s2 = sweep('sweep-after');
console.log(`sweepWeight after the helper: exit ${s2.code}, "${s2.last}"`);
want(s2.code === 0, 'sweepWeight is green with the measured numbers in its rows');
const f2 = flag('flag-after');
console.log(`simFlagshipWeight after the helper: exit ${f2.code}, "${f2.last}"`);
want(f2.code === 0, 'simFlagshipWeight is green with the new ceiling');

/* 5. the diff */
const d = spawnSync('git', ['diff', '--', 'scripts/sweepWeight.mjs', 'scripts/simFlagshipWeight.mjs'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
fs.writeFileSync(path.join(OUT, 'budgets-av.patch'), d.stdout);
const added = d.stdout.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
const removed = d.stdout.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---'));
const dashes = added.filter(l => l.includes(String.fromCharCode(0x2013)) || l.includes(String.fromCharCode(0x2014)));
console.log(`the diff: ${added.length} lines added, ${removed.length} removed, kept as files/budgets-av.patch`);
want(dashes.length === 0, 'no added line holds a dash character');
const syn = spawnSync('node', ['--check', 'scripts/sweepWeight.mjs'], { encoding: 'utf8' });
const syn2 = spawnSync('node', ['--check', 'scripts/simFlagshipWeight.mjs'], { encoding: 'utf8' });
want(syn.status === 0 && syn2.status === 0, 'both scripts still parse');

spawnSync('git', ['checkout', '--', 'scripts/sweepWeight.mjs', 'scripts/simFlagshipWeight.mjs']);
want(sha('scripts/sweepWeight.mjs') === before[0] && sha('scripts/simFlagshipWeight.mjs') === before[1], 'the two scripts are put back as the branch has them');
console.log(bad === 0 ? 'fx2ProveBudgets: all as wanted (red as it stands, green after the lead\'s hand step, nothing kept on the branch)' : `fx2ProveBudgets: ${bad} NOT as wanted`);
process.exit(bad === 0 ? 0 : 1);
