/* Round 1592 review probe: what a refused write really leaves behind, on a store that refuses like a browser.
   Run from the repo root: node .rc/x/probe.mjs. Prints facts; exit 0 always unless it cannot run (exit 2).
   P1  all three full, replace PARKED slot 2, the kept aside copy refused: answer, which keys changed, careers intact?
   P2  all three full, replace PARKED slot 2, the career write after the swap refused: same questions.
   Q   a byte quota store (sum of key and value lengths) at headroom 0.5, 1.5 and 2.5 careers: the free path
       (slot 1 full, slots 2 and 3 empty) and the replace path (all full, pick slot 2): answer and integrity. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probe1592-'));
const P = rel => JSON.stringify(path.join(ROOT, rel).split(path.sep).join('/'));
fs.writeFileSync(path.join(TMP, 'entry.mjs'), ['clubManager', 'managerHotSeat', 'clubManagerSlots', 'clubManagerHandOver']
  .map((m, i) => `export * as m${i} from ${P(`src/lib/${m}.ts`)};`).join('\n'));
await build({
  entryPoints: [path.join(TMP, 'entry.mjs')], outfile: path.join(TMP, 'bundle.mjs'), bundle: true, format: 'esm', platform: 'node',
  logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
});
const store = new Map();
let refuse = () => false;
let quota = Infinity;
const used = () => { let n = 0; for (const [k, v] of store) n += k.length + v.length; return n; };
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => {
    v = String(v);
    if (refuse(k)) throw new Error('refused');
    const was = store.has(k) ? k.length + store.get(k).length : 0;
    if (used() - was + k.length + v.length > quota) throw new Error('quota');
    store.set(k, v);
  },
  removeItem: k => { store.delete(k); },
  clear: () => store.clear(),
  get length() { return store.size; },
  key: i => [...store.keys()][i] ?? null,
};
const b = await import(pathToFileURL(path.join(TMP, 'bundle.mjs')).href);
const [cm, hs, sl, ho] = [b.m0, b.m1, b.m2, b.m3];
const KEY = cm.SAVE_KEY;
const pool = hs.hotSeatPool();
let run = null;
for (let k = 0; k < 60 && !run; k++) {
  let r = hs.startHotSeat({ club: pool[(k * 7) % pool.length].club, seed: 3000 + k });
  for (let g = 0; !r.verdict && g < 40; g++) r = hs.pendingPress(r) ? hs.answerHotSeatPress(r, 0) : hs.playHotSeatMatch(r, 'balanced', null);
  if (hs.canCarryOn(r)) run = r;
}
if (!run) { console.log('probe: ABORT, no survivor'); process.exit(2); }
const rawOf = club => { store.clear(); quota = Infinity; cm.saveCareer(cm.startCareer(club)); return store.get(KEY); };
const [A, B, C] = [pool[1].club, pool[2].club, pool[3].club].map(rawOf);
const carry = replace => hs.carryOnInClubManager(run, c => ho.handOverCareer(c, replace));
const snapMap = () => new Map(store);
const changed = before => {
  const out = [];
  for (const k of new Set([...before.keys(), ...store.keys()])) if (before.get(k) !== store.get(k)) out.push(`${k}${store.has(k) ? (before.has(k) ? ' changed' : ' added') : ' removed'}`);
  return out;
};
/* Every career still on the device, by slot, as Club Manager would read it: club names. */
const careers = () => sl.readSlots().map(v => v.summary ? v.summary.clubName : v.damaged ? 'damaged' : 'empty');
const fillThree = () => { store.clear(); quota = Infinity; store.set(KEY, A); store.set(sl.parkedKey(2), B); store.set(sl.parkedKey(3), C); };
console.log(`run ${run.state.clubName}; careers ${[A, B, C].map(r => JSON.parse(r).clubName).join(', ')}; career sizes ${[A, B, C].map(r => r.length).join(', ')}`);

for (const [tag, rule] of [
  ['P1 kept aside copy refused', () => k => k.startsWith(`${KEY}.broken-`)],
  /* The swap's own write is the first; the career's full and lean tries are the second and third; the roll back's is the fourth. */
  ['P2 career write after the swap refused', () => { let n = 0; return k => k === KEY && [2, 3].includes(++n); }],
]) {
  fillThree();
  const before = snapMap(), was = careers();
  refuse = rule();
  let res;
  try { res = carry(sl.readSlots()[1]); } finally { refuse = () => false; }
  const lost = [A, B, C].filter(r => ![...store.values()].includes(r) && ![...store.values()].some(v => { try { return JSON.parse(v).clubName === JSON.parse(r).clubName; } catch { return false; } }));
  console.log(`${tag}: answered ${res}; active slot ${sl.activeSlot()}; careers ${careers().join(', ')} (were ${was.join(', ')}); careers gone ${lost.length}; keys changed: ${changed(before).join('; ') || 'none'}`);
}

for (const head of [0.5, 1.5, 2.5]) {
  for (const which of ['free', 'replace']) {
    store.clear(); quota = Infinity;
    store.set(KEY, A);
    if (which === 'replace') { store.set(sl.parkedKey(2), B); store.set(sl.parkedKey(3), C); }
    const was = careers();
    quota = used() + Math.round(head * A.length);
    let res;
    try { res = carry(which === 'replace' ? sl.readSlots()[1] : undefined); } catch (e) { res = `THREW ${e.message}`; }
    quota = Infinity;
    const aside = [...store.keys()].filter(k => k.startsWith(`${KEY}.broken-`));
    console.log(`Q headroom ${head} careers, ${which}: answered ${res}; active ${sl.activeSlot()}; careers ${careers().join(', ')} (were ${was.join(', ')}); kept aside ${aside.length}`);
  }
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log('probe1592: done');
