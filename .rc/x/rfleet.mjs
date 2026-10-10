/* Reviewer's old save fleet for Round 1228 (the run lens). Runs on the GitHub runner only.
 *   node .rc/x/rfleet.mjs <base root> <head root> [control]
 * A save is MADE by the base's engine in the middle of season one, written with the base's saveCareer, then
 * LOADED by each engine's own loadCareer and played to the end of the season, rolled over and played ten
 * more entries. The two engines must end on the same bytes. With "control" the head's bundle gets one edit
 * (the Champions League field read at 36) and the fleet must then DISAGREE, or it has no teeth.
 * Exit 0 equal (or the control fired), 1 different (or the control did not fire), 2 could not run. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const [baseRoot, headRoot, mode] = process.argv.slice(2);
if (!baseRoot || !headRoot) { console.log('rfleet: two roots are needed'); process.exit(2); }
const CONTROL = mode === 'control';
const LINE = 'const UCL_FIELD_SIZE = 32;';
let edited = 0;

async function bundle(root, name, edit) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `rfleet-${name}-`));
  const entry = path.join(work, 'entry.ts');
  fs.writeFileSync(entry, `export * as engine from ${JSON.stringify(path.join(root, 'src/lib/clubManager.ts'))};`);
  const out = path.join(work, 'bundle.mjs');
  const plugins = edit ? [{ name: 'edit', setup(b) { b.onLoad({ filter: /clubManager[.]ts$/ }, async args => {
    const source = await fs.promises.readFile(args.path, 'utf8');
    if (source.split(LINE).length - 1 !== 1) { console.log('rfleet: the control line is not there exactly once'); process.exit(2); }
    edited += 1;
    return { contents: source.replace(LINE, 'const UCL_FIELD_SIZE = 36;'), loader: 'ts' };
  }); } }] : [];
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', alias: { '@': path.join(root, 'src') }, plugins });
  return { engine: (await import(pathToFileURL(out).href)).engine, hash: createHash('sha256').update(fs.readFileSync(out)).digest('hex').slice(0, 16), bytes: fs.statSync(out).size };
}

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: i => [...store.keys()][i] ?? null, get length() { return store.size; },
};
const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const realRandom = Math.random;
const realNow = Date.now;
const pinned = (seed, fn) => { Math.random = mulberry(seed); Date.now = () => 1789430400000; try { return fn(); } finally { Math.random = realRandom; Date.now = realNow; } };
const play = (engine, s, most) => { let n = 0; while (s.week < s.calendar.length && n < most) { const r = engine.playNextEntry(s, { skipHalftime: true }); if (r && r.state) s = r.state; else break; n += 1; } return s; };
const sha = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);

const base = await bundle(baseRoot, 'base', false);
const head = await bundle(headRoot, 'head', CONTROL);
console.log(`rfleet: base bundle ${base.bytes} bytes ${base.hash}, head bundle ${head.bytes} bytes ${head.hash}${CONTROL ? ' (head edited: field of 36)' : ''}`);
for (const e of [base.engine, head.engine]) if (typeof e.ensureAllEraRosters === 'function') await e.ensureAllEraRosters();

/* Clubs in the Champions League and outside it, in four leagues. */
const CLUBS = ['Real Madrid', 'Arsenal', 'Bayern Munich', 'Inter Milan', 'Everton', 'Sevilla', 'Lyon', 'Fulham'];
let cases = 0;
let different = 0;
let inEurope = 0;
for (const [ci, club] of CLUBS.entries()) for (const seed of [41, 97]) {
  const tag = `${club} seed ${seed}`;
  let made;
  try { made = pinned(seed * 1000 + ci, () => play(base.engine, base.engine.startCareer(club), 22)); } catch (err) { console.log(`  ${tag}: the base could not make the save (${String(err).slice(0, 120)})`); process.exit(2); }
  if (made.uclGroup) inEurope += 1;
  const finish = engine => pinned(seed * 7 + ci, () => {
    store.clear();
    base.engine.saveCareer(made); // the save is always the base's own bytes
    const loaded = engine.loadCareer();
    if (!loaded) throw new Error('loadCareer answered null');
    const end = play(engine, loaded, 500);
    const { state: fin } = engine.finishSeason(end);
    const next = play(engine, engine.startNextSeason(fin), 10);
    return { loaded: sha(loaded), end: sha(end), next: sha(next), field: (next.uclField ?? []).length, week: next.week, season: next.season };
  });
  const a = finish(base.engine);
  const b = finish(head.engine);
  cases += 1;
  const eq = JSON.stringify(a) === JSON.stringify(b);
  if (!eq) different += 1;
  console.log(`  ${tag}: ${made.uclGroup ? 'in the Champions League' : 'not in it'}, saved at week ${made.week}; base ${a.loaded} ${a.end} ${a.next} (field ${a.field}); head ${b.loaded} ${b.end} ${b.next} (field ${b.field}) ${eq ? 'EQUAL' : 'DIFFERENT'}`);
}
if (CONTROL) {
  const fired = edited > 0 && different > 0;
  console.log(`rfleet control: ${fired ? 'FIRED' : 'DID NOT FIRE'} (${different} of ${cases} cases differ with the head's field read at 36)`);
  process.exit(fired ? 0 : 1);
}
console.log(`rfleet: ${different === 0 ? 'EQUAL' : 'DIFFERENT'}, ${cases} old saves (${inEurope} in the Champions League) made by the base, loaded and played on by both engines, ${different} differ.`);
process.exit(different === 0 ? 0 : 1);
