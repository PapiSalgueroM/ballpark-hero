/* Round 1592 review probe 2: the least free storage each carry path needs, on a store with a byte quota.
   Run from the repo root: node .rc/x/probe2.mjs. Prints facts. Paths: free (slot 1 full, 2 and 3 empty),
   replace (all full, pick parked slot 2), and the base's write over the career being played (saveCareer). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probe1592b-'));
const P = rel => JSON.stringify(path.join(ROOT, rel).split(path.sep).join('/'));
fs.writeFileSync(path.join(TMP, 'entry.mjs'), ['clubManager', 'managerHotSeat', 'clubManagerSlots', 'clubManagerHandOver']
  .map((m, i) => `export * as m${i} from ${P(`src/lib/${m}.ts`)};`).join('\n'));
await build({
  entryPoints: [path.join(TMP, 'entry.mjs')], outfile: path.join(TMP, 'bundle.mjs'), bundle: true, format: 'esm', platform: 'node',
  logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
});
const store = new Map();
let quota = Infinity;
const used = () => { let n = 0; for (const [k, v] of store) n += k.length + v.length; return n; };
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => {
    v = String(v);
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
const runs = [];
for (let k = 0; k < 80 && runs.length < 3; k++) {
  let r = hs.startHotSeat({ club: pool[(k * 7) % pool.length].club, seed: 3000 + k });
  for (let g = 0; !r.verdict && g < 40; g++) r = hs.pendingPress(r) ? hs.answerHotSeatPress(r, 0) : hs.playHotSeatMatch(r, 'balanced', null);
  if (hs.canCarryOn(r)) runs.push(r);
}
if (!runs.length) { console.log('probe2: ABORT, no survivor'); process.exit(2); }
const rawOf = club => { store.clear(); quota = Infinity; cm.saveCareer(cm.startCareer(club)); return store.get(KEY); };
const [A, B, C] = [pool[1].club, pool[2].club, pool[3].club].map(rawOf);
for (const run of runs) {
  const H = JSON.stringify(cm.trimCareer(hs.handoverState(run))).length;
  const carry = replace => hs.carryOnInClubManager(run, c => ho.handOverCareer(c, replace));
  const tryAt = (which, head) => {
    store.clear(); quota = Infinity; store.set(KEY, A);
    if (which === 'replace') { store.set(sl.parkedKey(2), B); store.set(sl.parkedKey(3), C); }
    quota = used() + head;
    let ok;
    try {
      ok = which === 'base overwrite' ? cm.saveCareer(hs.handoverState(run)) : carry(which === 'replace' ? sl.readSlots()[1] : undefined) === 'saved';
    } catch { ok = false; }
    quota = Infinity;
    return ok;
  };
  const out = [];
  for (const which of ['free', 'replace', 'base overwrite']) {
    let lo = -A.length, hi = 4 * H + 4 * A.length;
    if (!tryAt(which, hi)) { out.push(`${which} never`); continue; }
    while (hi - lo > 64) { const mid = Math.floor((lo + hi) / 2); if (tryAt(which, mid)) hi = mid; else lo = mid; }
    out.push(`${which} ${hi} (${(hi / H).toFixed(2)} H)`);
  }
  console.log(`${run.state.clubName}: carried career H ${H} chars, kept career ${A.length}; least headroom: ${out.join(', ')}`);
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log('probe2: done');
