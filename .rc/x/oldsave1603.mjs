/* Reviewer probe for Round 1603 (runner only, never committed): OLD SAVES.
   A save written by the base tree's engine (BASE_ROOT, a checkout of 4bd20c993) at several points of a season is
   loaded by the branch's engine and by the base's own, and both carry on with the same dice:
     load      HEAD's loadCareer gives exactly the base's loadCareer (JSON equal), never null;
     fans      HEAD's fan terms on the loaded save equal the base's;
     carry     the two carry on JSON equal week by week (a named haul read as the old words) until a deciding
               second leg where night and tie differ, and nowhere else may they part;
     tie       at that leg HEAD logs `tie` and the base does not; the record (score, res) is the same;
     rollback  a HEAD save carrying `tie` loads on the base engine.
   Exit 0 green, 1 red, 2 could not run. */
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_ROOT = process.env.BASE_ROOT ? path.resolve(process.env.BASE_ROOT) : '';
if (!BASE_ROOT || !fs.existsSync(path.join(BASE_ROOT, 'src/lib/clubManager.ts'))) { console.log('oldsave1603 could not run: BASE_ROOT'); process.exit(2); }
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'oldsave-'));
async function bundle(name, root) {
  const entry = path.join(work, `${name}.entry.ts`);
  const P = f => JSON.stringify(path.join(root, f).split(path.sep).join('/'));
  fs.writeFileSync(entry, `export * as cm from ${P('src/lib/clubManager.ts')};\nexport * as meters from ${P('src/lib/clubManagerMeters.ts')};\n`);
  const out = path.join(work, `${name}.cjs`);
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent', alias: { '@': path.join(root, 'src') } });
  return out;
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(), key: i => [...store.keys()][i] ?? null, get length() { return store.size; } };
Date.now = () => 1793000000000;
const req = createRequire(import.meta.url);
const H = req(await bundle('head', ROOT));
const B = req(await bundle('base', BASE_ROOT));
await H.cm.ensureAllEraRosters();
await B.cm.ensureAllEraRosters();

function keyOf(...parts) { let h = 2166136261 >>> 0; for (const ch of parts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function withStream(seed, fn) {
  let a = seed | 0; const prev = Math.random;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = prev; }
}
const J = v => JSON.stringify(v);
const HAUL_NAMED = /⚽ ([^"!]+?) scored (four|five|six|seven|eight|[0-9]+)!/g;
const asBase = s => s.replace(HAUL_NAMED, (_, name) => `⚽ ${name} bagged a hat-trick!`);
const OPTS = { skipHalftime: true };
const step = (m, s, seed) => withStream(seed, () => m.cm.playNextEntry(structuredClone(s), OPTS));
const KEY = H.cm.SAVE_KEY;

const CAREERS = [['Real Madrid', 'now'], ['Liverpool', 'now'], ['Barcelona', 'era2015'], ['Bayern Munich', 'era2010'], ['Chelsea', 'era2020'], ['Inter Milan', 'now'], ['Arsenal', 'now'], ['Juventus', 'era2015']];
const bad = { load: [], fans: [], carry: [], tie: [], rollback: [] };
const n = { checkpoints: 0, carriedWeeks: 0, partedAtLeg: 0, tieLogged: 0, rollbacks: 0 };
for (const [club, era] of CAREERS) {
  const tag = `${club} ${era}`;
  let s = withStream(keyOf(tag, 'start'), () => B.cm.startCareer(club, era));
  const marks = [];
  for (let i = 0; i < 70; i++) {
    const e = s.calendar?.[s.week];
    const deciding = !!e && e.type === 'uclKo' && e.uclLeg === 2 && s.uclKoRound === e.uclRound;
    const firstLeg = !!e && e.type === 'uclKo' && e.uclLeg === 1 && s.uclKoRound === e.uclRound;
    if (i === 6 || deciding || firstLeg) marks.push({ why: i === 6 ? 'week 6' : deciding ? 'before a deciding leg' : 'before a first leg', state: structuredClone(s) });
    const r = step(B, s, keyOf(tag, 'walk', i));
    s = r.state;
    if (r.kind === 'seasonOver' || s.sacked) break;
  }
  for (const mk of marks) {
    n.checkpoints += 1;
    const where = `${tag} ${mk.why} (week ${mk.state.week})`;
    store.clear();
    if (!B.cm.saveCareer(mk.state)) { bad.load.push(`${where}: base could not save`); continue; }
    const lB = B.cm.loadCareer();
    const lH = H.cm.loadCareer();
    if (!lH || !lB || J(lH) !== J(lB)) { bad.load.push(`${where}: ${!lH ? 'HEAD load null' : !lB ? 'base load null' : 'loads differ'}`); continue; }
    if (J(H.meters.fanTerms(lH)) !== J(B.meters.fanTerms(lB))) bad.fans.push(where);
    let sH = lH, sB = lB, parted = null;
    for (let k = 0; k < 14 && !parted; k++) {
      const seed = keyOf(where, k);
      const rH = step(H, sH, seed);
      const rB = step(B, sB, seed);
      const t = rH.report?.tie;
      const night = rH.report ? (rH.report.won ? 'W' : rH.report.drawn ? 'D' : 'L') : null;
      const differ = !!t && t.leg === 2 && typeof t.through === 'boolean' && night !== (t.through ? 'W' : 'L');
      const same = asBase(J(rH.state)) === J(rB.state) && asBase(J(rH.report ?? null)) === J(rB.report ?? null);
      if (differ) {
        parted = 'leg';
        n.partedAtLeg += 1;
        const eH = rH.state.resultLog.at(-1), eB = rB.state.resultLog.at(-1);
        const { tie, ...restH } = eH;
        if (tie !== (t.through ? 'W' : 'L') || 'tie' in eB || asBase(J(restH)) !== J(eB)) bad.tie.push(`${where} +${k}: HEAD ${J(eH)} base ${J(eB)}`);
        else n.tieLogged += 1;
        store.clear();
        H.cm.saveCareer(rH.state);
        const back = B.cm.loadCareer();
        if (!back) bad.rollback.push(where); else n.rollbacks += 1;
      } else if (!same) {
        parted = 'elsewhere';
        bad.carry.push(`${where} +${k} (${sH.calendar?.[sH.week]?.type})`);
      } else n.carriedWeeks += 1;
      sH = rH.state; sB = rB.state;
      if (rH.kind === 'seasonOver') break;
    }
  }
  console.log(`  ${tag}: ${marks.length} checkpoints (${marks.map(m => `${m.why} w${m.state.week}`).join(', ')})`);
}
const checks = [
  ['load: HEAD loads every base save exactly as the base does', bad.load],
  ['fans: fan terms of a loaded base save are the base\'s', bad.fans],
  ['carry: HEAD and base carry on equal except at a differing deciding leg', bad.carry],
  ['tie: at a differing leg HEAD logs tie, the base does not, the record is the same', bad.tie],
  ['rollback: a HEAD save with tie loads on the base engine', bad.rollback],
];
console.log(`checkpoints ${n.checkpoints}, weeks carried equal ${n.carriedWeeks}, parted at a differing leg ${n.partedAtLeg}, tie logged ${n.tieLogged}, rollbacks ${n.rollbacks}`);
let red = 0;
for (const [name, list] of checks) { if (list.length) red += 1; console.log(`${list.length ? 'FAIL' : 'ok  '} ${name}${list.length ? ` (${list.length}: ${list.slice(0, 3).join('; ')})` : ''}`); }
if (n.checkpoints < 12 || n.carriedWeeks < 100) { red += 1; console.log(`FAIL coverage too thin (${n.checkpoints} checkpoints, ${n.carriedWeeks} weeks)`); }
console.log(`oldsave1603 ${red ? 'RED' : 'GREEN'}: ${checks.length - red} of ${checks.length} green`);
process.exit(red ? 1 : 0);
