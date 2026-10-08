/* Review probe: one small mutation of shootoutRosterSide (or its call site)
   on a COPY of the engine, run through a patched COPY of
   scripts/simCmShootoutOrder.mjs. Nothing tracked is touched.
   Usage: node mutRun.mjs <mutant>. Exit code is the harness's own. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = process.cwd().replaceAll('\\', '/');
const HERE = path.dirname(fileURLToPath(import.meta.url)).replaceAll('\\', '/');
const name = process.argv[2];
const KEEPER = "  if (side.length < SHOOTOUT_MAX_ORDER && !side.some(p => p.p === 'GK')) side.push({ n: 'Their keeper', p: 'GK', r: oppS, g: true });\n";
const TAKER = "  for (let i = 1; side.length < SHOOTOUT_MAX_ORDER; i++) side.push({ n: `Their taker ${i}`, p: 'CM', r: oppS, g: true });\n";
const HEADL = '  const side = [...roster].sort((a, b) => b.r - a.r).slice(0, SHOOTOUT_MAX_ORDER);\n  if (!side.length) return side;\n';
const CALL = '    : shootoutRosterSide(oppRosterFor(state, fx.opponent), oppS);\n';
const MUT = {
  /* expected red */
  nokeeper: [KEEPER, ''],
  unmarked: [TAKER, TAKER.replace(', g: true }', ' }')],
  flatrating: [TAKER, TAKER.replace("r: oppS, g: true", "r: 75, g: true")],
  tenonly: [TAKER, TAKER.replace('side.length < SHOOTOUT_MAX_ORDER; i++', 'side.length < SHOOTOUT_MAX_ORDER - 1; i++')],
  samename: [TAKER, TAKER.replace('n: `Their taker ${i}`', "n: 'Their taker'")],
  noslice: [HEADL, HEADL.replace('.slice(0, SHOOTOUT_MAX_ORDER)', '')],
  emptymade: [HEADL, HEADL.replace('  if (!side.length) return side;\n', '')],
  nosort: [HEADL, HEADL.replace('.sort((a, b) => b.r - a.r)', '')],
  keeperrating: [KEEPER, KEEPER.replace("p: 'GK', r: oppS", "p: 'GK', r: 99")],
  /* predicted survivors: a full roster with no keeper, and the strength handed in at the call site */
  keeperonfull: [KEEPER, KEEPER.replace('side.length < SHOOTOUT_MAX_ORDER && ', '')],
  wrongstrength: [CALL, CALL.replace(', oppS);', ', mine);')],
  /* sanity: no change at all must stay green */
  none: null,
};
if (!(name in MUT)) { console.error(`unknown mutant ${name}; known: ${Object.keys(MUT).join(', ')}`); process.exit(2); }

const readLF = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
let engine = readLF(`${ROOT}/src/lib/clubManager.ts`);
if (MUT[name]) {
  const [from, to] = MUT[name];
  const hits = engine.split(from).length - 1;
  if (hits !== 1 || from === to) { console.error(`mutant ${name} cannot run: its anchor is in the engine ${hits} times (or the rewrite changes nothing)`); process.exit(2); }
  engine = engine.replace(from, to);
}
const work = `${HERE}/mut-${name}-${process.pid}`;
fs.mkdirSync(`${work}/tmp`, { recursive: true });
const enginePath = `${work}/clubManager.mutant.ts`;
fs.writeFileSync(enginePath, engine);

let h = readLF(`${ROOT}/scripts/simCmShootoutOrder.mjs`);
const sub = (from, to, what) => {
  const hits = h.split(from).length - 1;
  if (hits !== 1) { console.error(`cannot patch the harness copy: ${what} found ${hits} times`); process.exit(2); }
  h = h.replace(from, to);
};
sub("import './lib/seedRandom.mjs';", `import '${pathToFileURL(`${ROOT}/scripts/lib/seedRandom.mjs`).href}';`, 'the seedRandom import');
sub("const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');", `const ROOT = ${JSON.stringify(ROOT)};`, 'ROOT');
sub("let enginePath = WRITE_FIXTURE ? path.resolve(WRITE_FIXTURE).replaceAll('\\\\', '/') : `${ROOT_URL}/src/lib/clubManager.ts`;", `let enginePath = ${JSON.stringify(enginePath)};`, 'the engine path');
const harness = `${work}/simCmShootoutOrder.mutant.mjs`;
fs.writeFileSync(harness, h);

const t = Date.now();
const r = spawnSync(process.execPath, [harness], {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  env: { ...process.env, CM_SHOOTOUT_CONTROL: '', CM_SHOOTOUT_ARTIFACTS: `${work}/artifacts`, TEMP: `${work}/tmp`, TMP: `${work}/tmp`, TMPDIR: `${work}/tmp` },
});
const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
const lines = out.split('\n').filter(l => l.trim());
const fails = lines.filter(l => l.includes('FAIL: '));
let sec = '?';
const secOf = [];
for (const l of lines) { const m = l.match(/^(\d)\) /); if (m) sec = m[1]; if (l.includes('FAIL: ')) secOf.push(sec); }
console.log(lines.filter(l => !l.includes('FAIL: ')).slice(-14).join('\n'));
console.log('--- first failures ---');
console.log(fails.slice(0, 8).map((l, i) => `[section ${secOf[i]}] ${l.trim().slice(0, 260)}`).join('\n') || '(none)');
const bySec = {};
for (const s of secOf) bySec[s] = (bySec[s] ?? 0) + 1;
console.log(`MUTANT ${name}: harness exit ${r.status}, ${fails.length} FAIL lines, by section ${JSON.stringify(bySec)}, ${Math.round((Date.now() - t) / 1000)}s`);
process.exit(r.status ?? 3);
