// Reviewer probe (run lens) for Round 1513: old saves. Runs on the GitHub runner only.
//   git worktree add /tmp/base e86f0fe2 && node .rc/x/oldSave1513.mjs /tmp/base
// A) A put back staged by the BASE build (Round 1219's journal) and applied by the head build gives the very
//    store and outcome the base build gives, over a fleet: every long game, eight situations, three sizes.
// B) A Club Manager store from the base (career and parked slots) meets the head's no point calls
//    (seasonPosts, noteSeasonCredited, clearSlotPoints of an empty slot, readPointsIndex): nothing written.
// C) Control: CONTROL=differ makes the head's applyPending write one extra key on a backup put back,
//    and section A must go red (proves the comparison can fail).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const HEAD = process.cwd();
const BASE = process.argv[2];
const CONTROL = process.env.CONTROL || '';
if (!BASE || !fs.existsSync(path.join(BASE, 'src/lib/saveKeeper.ts'))) { console.log('ABORT: no base tree'); process.exit(2); }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'old1513-'));

function makeStore(limit = Infinity) {
  const m = new Map();
  let writes = 0;
  const used = () => { let n = 0; for (const [k, v] of m) n += k.length + v.length; return n; };
  const api = {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      v = String(v);
      const after = used() - (m.has(k) ? k.length + m.get(k).length : 0) + k.length + v.length;
      if (after > limit) throw new Error('QuotaExceededError');
      writes += 1; m.set(k, v);
    },
    removeItem: k => { writes += 1; m.delete(k); },
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    clear: () => m.clear(),
  };
  return { m, api, writes: () => writes, dump: () => JSON.stringify([...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) };
}
const page = makeStore();
globalThis.window = { localStorage: page.api, sessionStorage: makeStore().api, location: { pathname: '/', replace() {}, assign() {} }, navigator: {}, addEventListener() {}, removeEventListener() {} };

async function bundle(root, name, mutate) {
  const out = path.join(TMP, `${name}.mjs`);
  await build({
    stdin: { contents: `
      export * from './src/lib/saveKeeper';
      export { CONTINUE_SAVES } from './src/data/continueSaves';
      export { BROKEN_SAVE_MARK } from './src/lib/brokenSaveRecovery';
    `, resolveDir: root, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(HEAD, 'node_modules')],
    plugins: mutate ? [{ name: 'm', setup(b) { b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]saveKeeper\.ts$/ }, a => ({ contents: mutate(fs.readFileSync(a.path, 'utf8')), loader: 'ts', resolveDir: path.dirname(a.path) })); } }] : [],
  });
  return import(pathToFileURL(out).href);
}
const ctlMutate = CONTROL === 'differ' ? src => {
  const from = '  const dropped = tidy(entry, storage, made, incoming);\n  return done(true, dropped ? { kept, dropped } : { kept });';
  if (src.split(from).length !== 2) { console.log('ABORT: control anchor not found once'); process.exit(2); }
  return src.replace(from, "  const dropped = tidy(entry, storage, made, incoming);\n  storage.setItem('control-extra', '1');\n  return done(true, dropped ? { kept, dropped } : { kept });");
} : null;
const B = await bundle(BASE, 'base');
const H = await bundle(HEAD, 'head', ctlMutate);
const P = await (async () => {
  const out = path.join(TMP, 'points.mjs');
  await build({ stdin: { contents: "export * from './src/lib/cmSavePointsStore';", resolveDir: HEAD, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(HEAD, 'src') } });
  return import(pathToFileURL(out).href);
})();

/* ---------- A: a base staged put back, applied by the base and by the head ---------- */
const MARK = B.BROKEN_SAVE_MARK;
const T0 = 1_760_000_000_000;
const text = (tag, size) => JSON.stringify({ tag, pad: 'x'.repeat(size) });
const SITUATIONS = ['plain', 'nosave', 'stale', 'done', 'gone', 'cap', 'held', 'tight', 'junk'];
let cases = 0, differ = 0, staged = 0;
const diffs = [];
for (const entry of B.CONTINUE_SAVES) {
  const hEntry = H.CONTINUE_SAVES.find(e => e.path === entry.path);
  if (!hEntry) { differ += 1; diffs.push(`${entry.path} missing from head CONTINUE_SAVES`); continue; }
  for (const sit of SITUATIONS) {
    for (const size of [10, 2000, 60000]) {
      cases += 1;
      const init = (limit) => {
        const s = makeStore(limit);
        const cur = text(`cur-${entry.path}`, size);
        const bk = `${entry.saveKey}${MARK}${T0 - 1000}`;
        const back = text(`back-${entry.path}`, size + 3);
        if (sit !== 'nosave') s.api.setItem(entry.saveKey, sit === 'done' ? back : cur);
        s.api.setItem(bk, back);
        if (sit === 'cap') for (let i = 2; i < 5; i += 1) s.api.setItem(`${entry.saveKey}${MARK}${T0 - 1000 * i}`, text(`old${i}`, size));
        if (sit === 'held') s.api.setItem(`${entry.saveKey}${MARK}${T0 - 5000}`, cur);
        return { s, bk };
      };
      const { s: s0, bk } = init(Infinity);
      const st = B.stageRestore(entry, bk, s0.api, new Date(T0));
      if (!st.ok) { diffs.push(`${entry.path} ${sit} ${size}: base stage refused ${st.why}`); differ += 1; continue; }
      staged += 1;
      if (sit === 'gone') s0.api.removeItem(bk);
      if (sit === 'junk') s0.api.setItem(B.PENDING_RESTORE_KEY, '{"v":1,"path":"/nowhere"');
      const snap = s0.dump();
      const run = (K, e) => {
        const limit = sit === 'tight' ? JSON.parse(snap).reduce((n, [k, v]) => n + k.length + v.length, 0) + 50 : Infinity;
        const s = makeStore(limit);
        for (const [k, v] of JSON.parse(snap)) s.m.set(k, v);
        const when = new Date(T0 + (sit === 'stale' ? 6 * 60 * 1000 : 2000));
        const out = K.applyPending(s.api, when);
        return { out: JSON.stringify(out), store: s.dump() };
      };
      const rb = run(B, entry), rh = run(H, hEntry);
      if (rb.out !== rh.out || rb.store !== rh.store) {
        differ += 1;
        if (diffs.length < 8) diffs.push(`${entry.path} ${sit} ${size}: base ${rb.out} head ${rh.out}${rb.store !== rh.store ? ' (stores differ)' : ''}`);
      }
    }
  }
}
console.log(`A: ${cases} cases over ${B.CONTINUE_SAVES.length} games, ${staged} staged by the base, ${differ} differ`);
for (const d of diffs) console.log(`   ${d}`);

/* ---------- B: a Club Manager store with no points meets the head's calls ---------- */
const cm = makeStore();
const cmEntry = B.CONTINUE_SAVES.find(e => e.path === '/club-manager');
cm.api.setItem(cmEntry.saveKey, text('career', 150000));
for (const k of ['dukb-club-manager-slots', 'dukb-club-manager-slot-2', 'dukb-club-manager-slot-3']) cm.api.setItem(k, text(k, 1000));
const before = cm.dump();
const w0 = cm.writes();
let refused = 0;
for (const slot of [1, 2, 3]) {
  if (P.readPointsIndex(slot, cm.api) !== null) refused += 1;
  for (let season = 1; season <= 20; season += 1) {
    if (!P.seasonPosts(slot, season, cm.api)) refused += 1;
    P.noteSeasonCredited(slot, season, cm.api);
  }
  P.clearSlotPoints(slot, cm.api);
}
const bWrites = cm.writes() - w0;
console.log(`B: 3 slots x 20 seasons, ${refused} refused or indexed, ${bWrites} writes, store ${cm.dump() === before ? 'byte equal' : 'CHANGED'}`);

/* ---------- D (information only): a head staged save point put back met by a base build (an old tab) ---------- */
{
  const d = makeStore();
  const pointText = text('point', 150000);
  d.api.setItem(cmEntry.saveKey, text('career-now', 150000));
  d.api.setItem(H.PENDING_RESTORE_KEY, JSON.stringify({ v: 1, path: '/club-manager', backupKey: H.PENDING_COPY_KEY, at: T0, len: pointText.length, sum: H.sumOf(pointText) }));
  d.api.setItem(H.PENDING_COPY_KEY, pointText);
  const outB = B.applyPending(d.api, new Date(T0 + 2000));
  console.log(`D: base build meets a save point journal: outcome ${JSON.stringify(outB)}; left: ${[...d.m.keys()].filter(k => k.startsWith('dukb-save-pending')).join(',') || 'nothing'}`);
  const e = makeStore();
  e.api.setItem(cmEntry.saveKey, text('career-now', 150000));
  e.api.setItem(H.PENDING_RESTORE_KEY, '{"v":1,"path":"/club-manager","backupKey":"dukb-save-pending-copy"');
  e.api.setItem(H.PENDING_COPY_KEY, pointText);
  const outH = H.applyPending(e.api, new Date(T0 + 2000));
  console.log(`D: head build meets a cut save point journal: outcome ${JSON.stringify(outH)}; left: ${[...e.m.keys()].filter(k => k.startsWith('dukb-save-pending')).map(k => `${k} (${e.m.get(k).length} chars)`).join(',') || 'nothing'}`);
}

const bad = differ + refused + bWrites + (cm.dump() === before ? 0 : 1);
fs.rmSync(TMP, { recursive: true, force: true });
if (CONTROL) {
  console.log(differ > 0 ? `oldSave1513: control ${CONTROL} FIRED (${differ} cases differ)` : `oldSave1513: control ${CONTROL} DID NOT FIRE`);
  process.exit(differ > 0 ? 1 : 0);
}
console.log(bad ? `oldSave1513: FAIL (${differ} differ, ${refused} refused, ${bWrites} writes)` : `oldSave1513: OK, ${cases} put backs equal and a no point store untouched`);
process.exit(bad ? 1 : 0);
