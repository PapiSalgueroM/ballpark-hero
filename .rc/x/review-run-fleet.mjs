/* Reviewer probe (Round 1213, lens RUN): the default path did not move.
 * Bundles the Club Manager engine from two trees (BASE_ROOT = a checkout of origin/main,
 * HEAD_ROOT = the branch) and compares, career by career:
 *   1. startCareer: same state bytes, same count of random draws.
 *   2. twelve entries played: same bytes, same draws.
 *   3. an OLD SAVE: the base engine saves after twelve entries (saveCareer into a
 *      localStorage stand in); the head engine loads it, plays eight more entries;
 *      the base engine does the same from the same stored bytes; equal bytes.
 *   4. no head state carries realLeagueFixtures (nothing binds in this round).
 * Self check: one career with another seed must DIFFER, or the comparison is blind.
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE_ROOT = path.resolve(process.env.BASE_ROOT || '/tmp/base');
const HEAD_ROOT = path.resolve(process.env.HEAD_ROOT || process.cwd());
const hash = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v ?? null)).digest('hex').slice(0, 16);
const hashKey = s => { let h = 0x811c9dc5 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
let draws = 0;
const seeded = s => { let x = (s >>> 0) || 1; return () => { draws += 1; x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const REAL_RANDOM = Math.random;
Date.now = () => 1790000000000;

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r1213-fleet-'));
let seq = 0;
async function bundle(root) {
  seq += 1;
  const fwd = root.replaceAll('\\', '/');
  const entry = path.join(TMP, `entry${seq}.mjs`);
  const out = path.join(TMP, `engine${seq}.mjs`);
  fs.writeFileSync(entry, `export * as cm from '${fwd}/src/lib/clubManager.ts';\n`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': `${fwd}/src` }, logLevel: 'error' });
  return (await import(pathToFileURL(out).href)).cm;
}

const base = await bundle(BASE_ROOT);
const head = await bundle(HEAD_ROOT);
const NINE = ['laliga', 'ligue2', 'eredivisie', 'primeira', 'seriea', 'bundesliga', 'superlig', 'bundesliga2', 'championship'];
const OTHERS = ['premier', 'scottish', 'ligue1', 'proleague'];
const clubs = [];
for (const id of [...NINE, ...OTHERS]) {
  const row = head.REAL_LEAGUES.find(l => l.id === id);
  const rowBase = base.REAL_LEAGUES.find(l => l.id === id);
  if (!row || !rowBase) { console.error(`FAIL: no league row ${id}`); process.exit(1); }
  if (JSON.stringify(row.clubs) !== JSON.stringify(rowBase.clubs)) { console.error(`FAIL: ${id}: the club row differs between the trees`); process.exit(1); }
  clubs.push([id, row.clubs[0]], [id, row.clubs[Math.floor(row.clubs.length / 2)]], [id, row.clubs[row.clubs.length - 1]]);
}
const SEEDS = [1, 2];
let failures = 0;
let careers = 0;
let withKey = 0;
const fail = m => { failures += 1; if (failures <= 20) console.error(`  FAIL: ${m}`); };

function run(cm, club, seed, steps, from) {
  draws = 0;
  Math.random = seeded(hashKey(`r1213-fleet|${club}|${seed}|${from ? 'on' : 'start'}`));
  let s = from ? JSON.parse(from) : cm.startCareer(club, 'now');
  const startHash = hash(s);
  const startDraws = draws;
  for (let i = 0; i < steps; i += 1) {
    const r = cm.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver' || s.sacked) break;
  }
  Math.random = REAL_RANDOM;
  return { state: s, startHash, startDraws, endHash: hash(s), endDraws: draws };
}

for (const [leagueId, club] of clubs) for (const seed of SEEDS) {
  careers += 1;
  const tag = `${leagueId} ${club} seed ${seed}`;
  const b = run(base, club, seed, 12, null);
  const h = run(head, club, seed, 12, null);
  if (b.startHash !== h.startHash || b.startDraws !== h.startDraws) fail(`${tag}: startCareer differs (${b.startHash}/${b.startDraws} against ${h.startHash}/${h.startDraws})`);
  if (b.endHash !== h.endHash || b.endDraws !== h.endDraws) fail(`${tag}: twelve entries differ (${b.endHash}/${b.endDraws} against ${h.endHash}/${h.endDraws})`);
  if (Object.hasOwn(h.state, 'realLeagueFixtures')) withKey += 1;
  /* The old save: written by the base engine, loaded by both. */
  store.clear();
  if (base.saveCareer(b.state) !== true) fail(`${tag}: the base engine could not save`);
  const kept = new Map(store);
  const headLoaded = head.loadCareer();
  store.clear(); for (const [k, v] of kept) store.set(k, v);
  const baseLoaded = base.loadCareer();
  if (!headLoaded || !baseLoaded) { fail(`${tag}: a save did not load (head ${!!headLoaded}, base ${!!baseLoaded})`); continue; }
  if (JSON.stringify(headLoaded) !== JSON.stringify(baseLoaded)) fail(`${tag}: the loaded save differs between the engines`);
  const b2 = run(base, club, seed, 8, JSON.stringify(baseLoaded));
  const h2 = run(head, club, seed, 8, JSON.stringify(headLoaded));
  if (b2.endHash !== h2.endHash || b2.endDraws !== h2.endDraws) fail(`${tag}: the old save played on differs (${b2.endHash}/${b2.endDraws} against ${h2.endHash}/${h2.endDraws})`);
  store.clear();
  if (head.saveCareer(h2.state) !== true) fail(`${tag}: the head engine could not save`);
  const headBytes = JSON.stringify([...store]);
  store.clear();
  base.saveCareer(b2.state);
  if (JSON.stringify([...store]) !== headBytes) fail(`${tag}: the bytes saved after playing on differ`);
}
if (withKey) fail(`${withKey} head career(s) carry realLeagueFixtures: nothing may bind in this round`);

/* Self check: the comparison can see a difference. */
const a1 = run(head, clubs[0][1], 1, 12, null);
const a2 = run(head, clubs[0][1], 99, 12, null);
const blind = a1.endHash === a2.endHash;
if (blind) fail('self check: two different seeds gave the same bytes, the comparison is blind');

const line = `${careers} careers (${clubs.length} clubs of ${NINE.length + OTHERS.length} leagues x ${SEEDS.length} seeds), start, twelve entries, an old save loaded and played eight more, saved bytes; self check ${blind ? 'BLIND' : 'sees a different seed'}`;
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, 'fleet.txt'), `${failures ? 'FAILED' : 'OK'}: ${line}\n`);
fs.rmSync(TMP, { recursive: true, force: true });
if (failures) { console.error(`r1213 fleet: FAILED, ${failures} difference(s): ${line}`); process.exit(1); }
console.log(`r1213 fleet: OK, the head engine equals origin/main on all of it: ${line}`);
