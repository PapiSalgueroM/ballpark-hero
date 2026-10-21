/* Round 1523: morale that plays, one shared form term for five careers.
 *
 * src/lib/careerForm.ts holds the morale term every career's season form shares. The four US My Careers used to
 * carry one copy each of form = rating + (morale - 60) / k + ... (NBA 12, NFL 10, MLB 12, NHL 12) and now bind
 * moraleForm with those divisors.
 *
 * 1) The four US careers replay BYTE IDENTICAL. Each engine is bundled twice: as this tree has it (bound to
 *    careerForm.ts) and with its own file read at BASE (origin/main when the round started, the copies still
 *    inline). Seeded careers for every position and archetype are played season by season with morale and team
 *    quality swept across their whole range from a stream of their own, and the whole state after every season
 *    and every progress step must be the same string in both arms. Control SIM_CAREER_FORM_CONTROL=divisor
 *    changes the NFL divisor in careerForm.ts (10 to 11) in this tree's bundle: the replay must part.
 *
 * Environment: SIM_CAREER_FORM_BASE (the ref the base arm reads), SIM_CAREER_FORM_SECTIONS (comma separated).
 * Never reads the network. Exit 1 on any failure; the last line says green or red.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SIM_CAREER_FORM_BASE || '2ab9bef153009a3144970e87755225a458ef0c3b';
const CONTROL = process.env.SIM_CAREER_FORM_CONTROL || '';
const CONTROLS = { divisor: '1' };
if (CONTROL && !CONTROLS[CONTROL]) { console.log(`ABORT: unknown SIM_CAREER_FORM_CONTROL ${CONTROL}`); process.exit(1); }
const SECTIONS = (process.env.SIM_CAREER_FORM_SECTIONS || '1').split(',').map(s => s.trim());
const runs = n => SECTIONS.includes(n);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'career-form-'));
const failures = [];
const fail = msg => { failures.push(msg); console.log(`   FAIL ${msg}`); };
const norm = p => path.resolve(p).split(path.sep).join('/').toLowerCase();
const lf = s => s.split('\r\n').join('\n');
const read = rel => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const atBase = rel => lf(execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6 }));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/* One bundle of `entry` with some files served from given text (path from the root to LF text). */
async function bundle(name, entry, serve = {}) {
  const map = new Map(Object.entries(serve).map(([rel, text]) => [norm(path.join(ROOT, rel)), text]));
  const served = new Set();
  const out = path.join(TMP, `${name}.mjs`);
  await build({ entryPoints: [path.join(ROOT, entry)], bundle: true, format: 'esm', platform: 'node', outfile: out,
    logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, absWorkingDir: ROOT,
    plugins: [{ name: 'serve', setup(b) { b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const text = map.get(norm(args.path));
      if (text === undefined) return undefined;
      served.add(norm(args.path));
      return { contents: text, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' };
    }); } }] });
  for (const key of map.keys()) if (!served.has(key)) fail(`${name}: the bundle never loaded ${key}`);
  return import(pathToFileURL(out).href);
}
const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/* Section 1 */
const US = [
  { id: 'nba', file: 'src/lib/nbaMyCareer.ts', arch: 'NBA_ARCHETYPES', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress' },
  { id: 'nfl', file: 'src/lib/nflMyCareer.ts', arch: 'ARCHETYPES', start: 'startCareer', season: 'simSeason', progress: 'progress' },
  { id: 'mlb', file: 'src/lib/mlbMyCareer.ts', arch: 'MLB_ARCHETYPES', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress' },
  { id: 'nhl', file: 'src/lib/nhlMyCareer.ts', arch: 'NHL_ARCHETYPES', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress' },
];
const FORM = 'src/lib/careerForm.ts';
const NFL_DIVISOR = 'nfl: { per: 10, neutral: 60 },';
/* Every position and archetype, SEEDS careers each, YEARS seasons; morale and team quality from a stream of their own. */
function replay(lib, sport, seeds, years) {
  const trail = [];
  const real = Math.random;
  for (const pos of Object.keys(lib[sport.arch])) {
    for (const archetype of lib[sport.arch][pos]) {
      for (let k = 0; k < seeds; k += 1) {
        const seed = 1000 + k * 7919, rng = mulberry(seed), dial = mulberry(seed ^ 0x5bd1e995);
        Math.random = mulberry(seed + 17);
        try {
          const c = lib[sport.start]('Replay Man', pos, archetype, rng);
          for (let y = 0; y < years && !c.retired; y += 1) {
            c.morale = Math.round(dial() * 100);
            const out = lib[sport.season](c, 70 + Math.floor(dial() * 20), rng);
            trail.push(JSON.stringify(out), JSON.stringify(c));
            trail.push(JSON.stringify(lib[sport.progress](c, rng)), JSON.stringify(c));
          }
        } finally { Math.random = real; }
      }
    }
  }
  return trail;
}
if (runs('1')) {
  console.log('1) the four US careers replay byte identical through careerForm.ts');
  const form = read(FORM);
  if (!form.includes(NFL_DIVISOR)) { console.log(`ABORT: ${FORM} no longer holds ${NFL_DIVISOR}, so the divisor control would prove nothing`); process.exit(1); }
  const formServe = CONTROL === 'divisor' ? { [FORM]: form.replace(NFL_DIVISOR, 'nfl: { per: 11, neutral: 60 },') } : {};
  if (CONTROL === 'divisor') console.log('   CONTROL divisor: the NFL divisor is 11 in this tree\'s bundle');
  for (const sport of US) {
    const head = read(sport.file), base = atBase(sport.file);
    if (head.includes('(c.morale - 60) /')) fail(`${sport.id}: ${sport.file} still carries its own copy of the morale term`);
    if (!head.includes(`moraleForm('${sport.id}', c.morale)`)) fail(`${sport.id}: ${sport.file} does not bind moraleForm('${sport.id}', c.morale)`);
    if (!base.includes('(c.morale - 60) /')) fail(`${sport.id}: the base ${BASE.slice(0, 8)} has no inline morale term, so it is not the tree before the lift`);
    const now = await bundle(`${sport.id}-head`, sport.file, formServe);
    const was = await bundle(`${sport.id}-base`, sport.file, { [sport.file]: base });
    const a = replay(now, sport, 6, 18), b = replay(was, sport, 6, 18);
    let first = -1;
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) if (a[i] !== b[i]) { first = i; break; }
    const careers = Object.values(now[sport.arch]).reduce((n, list) => n + list.length, 0) * 6;
    console.log(`   ${sport.id}: ${careers} careers, ${a.length / 4} seasons replayed, ${first < 0 ? 'byte identical' : `parts at record ${first}`}`);
    if (a.length < careers * 8) fail(`${sport.id}: only ${a.length / 4} seasons were played, the replay is too thin to mean anything`);
    if (first >= 0) fail(`${sport.id}: this tree parts from ${BASE.slice(0, 8)} at record ${first} of ${a.length}`);
  }
}

console.log(failures.length ? `simCareerForm: RED, ${failures.length} failure(s)` : 'simCareerForm: green');
process.exit(failures.length ? 1 : 0);
