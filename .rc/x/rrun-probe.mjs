/* Reviewer's probe (Round 1219, the run lens). Pure node, no browser, no network. It bundles the keeper from the
   checked out source the way scripts/simSaveKeeper.mjs does and walks player flows the harness does not:
     S1  put back, then put the other one back (the undo), and what the card offers after it
     S2  the same at the cap, and what was dropped while the card says nothing was deleted
     S3  an ordinary boot over the whole fleet, and over a fleet made by the BASE tree's engines
     S4  a refusing game's save with no version number at all
     S5  the quiet copy and an older backup the player never answered
   It asserts nothing: it prints what happened and writes probe.json into $RC_OUT. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { buildRealSaves } from '../../scripts/lib/realSaves.mjs';

const ROOT = process.cwd();
const BASE_ROOT = process.env.PROBE_BASE || null;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rrun-probe-'));
const out = {};
const say = (...a) => console.log(...a);

function makeStore(m = new Map()) {
  const s = { m, sets: 0, removes: 0, wrote: [] };
  s.api = {
    get length() { return s.m.size; },
    key: i => [...s.m.keys()][i] ?? null,
    getItem: k => (s.m.has(k) ? s.m.get(k) : null),
    setItem: (k, v) => { s.sets += 1; s.wrote.push(String(k)); s.m.set(String(k), String(v)); },
    removeItem: k => { s.removes += 1; s.wrote.push(String(k)); s.m.delete(String(k)); },
    clear: () => { s.m.clear(); },
  };
  s.reset = () => { s.sets = 0; s.removes = 0; s.wrote = []; };
  return s;
}

/* The base bundle FIRST: both bundles share one stub store on globalThis, and the one loaded last owns it. The
   branch's loaders are the ones this probe calls, so the branch bundle is loaded last. */
let baseReal = null;
if (BASE_ROOT) {
  say(`probe: building real saves with the BASE engines at ${BASE_ROOT}...`);
  baseReal = await buildRealSaves({ root: BASE_ROOT, tmpDir: path.join(TMP, 'base'), seeds: [0, 1, 2, 3] });
}
say('probe: building real saves with the branch engines...');
const real = await buildRealSaves({ root: ROOT, tmpDir: path.join(TMP, 'real'), seeds: [0, 1, 2, 3] });
const noWindow = fn => { const w = globalThis.window; delete globalThis.window; try { return fn(); } finally { globalThis.window = w; } };

const page = makeStore();
globalThis.window = {
  localStorage: page.api,
  sessionStorage: makeStore().api,
  location: { pathname: '/', replace() {}, assign() {} },
  navigator: {},
};
const bundle = path.join(TMP, 'keeper.bundle.mjs');
await build({
  stdin: {
    contents: `
      export * from './src/lib/saveKeeper';
      export { CONTINUE_SAVES } from './src/data/continueSaves';
      export { BROKEN_SAVE_MARK, BACKUPS_KEPT, SET_ASIDE_SEEN_KEY, backupKeysOf, offeredBackup, restoreBackup } from './src/lib/brokenSaveRecovery';
      export { getStorageTrouble } from './src/lib/safeStorage';
    `,
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') },
});
const K = await import(pathToFileURL(bundle).href);
const ENTRIES = K.CONTINUE_SAVES;
const MARK = K.BROKEN_SAVE_MARK;
const byPath = Object.fromEntries(ENTRIES.map(e => [e.path, e]));
say(`probe: the seam answers ${K.getStorageTrouble()} (null means the keeper really runs)`);
out.seam = K.getStorageTrouble();

const T0 = new Date('2026-10-10T08:00:00Z');
const at = s => new Date(T0.getTime() + s * 1000);
const backupsOf = (m, e) => [...m.keys()].filter(k => k.startsWith(`${e.saveKey}${MARK}`)).sort();
/* What the card would offer: the library's newest backup, unless it is the save now at the key (the card's own check). */
const cardOffers = (e, api) => {
  const k = K.offeredBackup(e, api);
  if (!k) return null;
  const cur = api.getItem(e.saveKey);
  return cur !== null && api.getItem(k) === cur ? null : k;
};
const name = (m, e, k, names) => {
  const v = m.get(k);
  const hit = Object.entries(names).find(([, t]) => t === v);
  return hit ? hit[0] : `other(${String(v).length})`;
};
const picture = (m, e, names) => ({
  key: m.has(e.saveKey) ? name(m, e, e.saveKey, names) : 'EMPTY',
  backups: backupsOf(m, e).map(k => `${k.slice(e.saveKey.length + MARK.length)}=${name(m, e, k, names)}`),
});

/* ---------------------------------------------------------------- S1 */
say('\nS1. put back A, then put the other one back (the undo): what does the card offer after it?');
out.S1 = [];
for (const route of ['/fight-gym', '/club-manager', '/nfl-my-career', '/soccer-career', '/stadium-tycoon']) {
  const e = byPath[route];
  const [A, B] = real.fleet[route];
  for (const played of [false, true]) {
    const src = `${e.saveKey}${MARK}2026-10-04T09-00-00`;
    const st = makeStore(new Map([[e.saveKey, B], [src, A]]));
    const names = { A, B, 'A-played': `${A} `, 'B-played': `${B} ` };
    const steps = [];
    const o1 = cardOffers(e, st.api);
    K.stageRestore(e, o1, st.api, at(0));
    const r1 = K.applyPending(st.api, at(2));
    steps.push({ press: 1, offered: o1 && name(st.m, e, o1, names), outcome: r1, after: picture(st.m, e, names) });
    if (played) st.m.set(e.saveKey, `${st.m.get(e.saveKey)} `);
    const o2 = cardOffers(e, st.api);
    if (o2) {
      K.stageRestore(e, o2, st.api, at(60));
      const r2 = K.applyPending(st.api, at(62));
      steps.push({ press: 2, offered: name(st.m, e, o2, names), outcome: r2, after: picture(st.m, e, names) });
    }
    const o3 = cardOffers(e, st.api);
    const aHeld = backupsOf(st.m, e).some(k => st.m.get(k) === A);
    const row = { route, playedBetween: played, offeredAfterUndo: o3 ? name(st.m, e, o3, names) : null, aStillInABackup: aHeld, aAtKey: st.m.get(e.saveKey) === A, steps };
    out.S1.push(row);
    say(`   ${route.padEnd(18)} played between ${String(played).padEnd(5)} after the undo: key=${row.steps.at(-1).after.key}, backups=[${row.steps.at(-1).after.backups.join(', ')}], the card offers ${row.offeredAfterUndo ?? 'NOTHING'}; A is ${aHeld ? 'still kept aside' : 'in no backup'}`);
  }
}
/* The same flow on the library's Round 958 swap (restoreBackup), which is what the card called before this round. */
{
  const e = byPath['/fight-gym'];
  const [A, B] = real.fleet['/fight-gym'];
  const st = makeStore(new Map([[e.saveKey, B], [`${e.saveKey}${MARK}2026-10-04T09-00-00`, A]]));
  const names = { A, B };
  const o1 = cardOffers(e, st.api); K.restoreBackup(e, o1, st.api, at(0));
  const o2 = cardOffers(e, st.api); if (o2) K.restoreBackup(e, o2, st.api, at(60));
  const o3 = cardOffers(e, st.api);
  out.S1main = { after: picture(st.m, e, names), offeredAfterUndo: o3 ? name(st.m, e, o3, names) : null };
  say(`   Round 958's swap, same presses on /fight-gym: key=${out.S1main.after.key}, backups=[${out.S1main.after.backups.join(', ')}], the card offers ${out.S1main.offeredAfterUndo ?? 'NOTHING'}`);
}

/* ---------------------------------------------------------------- S2 */
say('\nS2. the same at the cap: three kept aside saves, a put back, a little play, the undo');
{
  const e = byPath['/fight-gym'];
  const [B, A1, A2, A3] = real.fleet['/fight-gym'];
  const seed = () => new Map([[e.saveKey, B], [`${e.saveKey}${MARK}2026-10-01T09-00-00`, A1], [`${e.saveKey}${MARK}2026-10-02T09-00-00`, A2], [`${e.saveKey}${MARK}2026-10-03T09-00-00`, A3]]);
  const names = { B, A1, A2, A3, 'A3-played': `${A3} ` };
  const st = makeStore(seed());
  const o1 = cardOffers(e, st.api);
  K.stageRestore(e, o1, st.api, at(0)); const r1 = K.applyPending(st.api, at(2));
  const p1 = picture(st.m, e, names);
  st.m.set(e.saveKey, `${A3} `);
  const o2 = cardOffers(e, st.api);
  K.stageRestore(e, o2, st.api, at(60)); const r2 = K.applyPending(st.api, at(62));
  const p2 = picture(st.m, e, names);
  const lost = ['A1', 'A2', 'A3'].filter(n => ![...st.m.values()].includes(names[n]));
  out.S2 = { press1: { offered: name(seed(), e, o1, names), outcome: r1, after: p1 }, press2: { outcome: r2, after: p2 }, inNoKeyAfter: lost };
  say(`   press 1 (${out.S2.press1.offered}): ${JSON.stringify(r1)} -> key=${p1.key}, backups=[${p1.backups.join(', ')}]`);
  say(`   press 2 (the undo):  ${JSON.stringify(r2)} -> key=${p2.key}, backups=[${p2.backups.join(', ')}]`);
  say(`   kept aside saves that are now in NO key: ${lost.join(', ') || 'none'}  (the card's line for kept:true is "...so nothing was deleted.")`);
  const mn = makeStore(seed());
  const m1 = cardOffers(e, mn.api); K.restoreBackup(e, m1, mn.api, at(0));
  mn.m.set(e.saveKey, `${A3} `);
  const m2 = cardOffers(e, mn.api); K.restoreBackup(e, m2, mn.api, at(60));
  const lostMain = ['A1', 'A2', 'A3'].filter(n => ![...mn.m.values()].includes(names[n]) && ![...mn.m.values()].includes(`${names[n]} `));
  out.S2main = { after: picture(mn.m, e, names), inNoKeyAfter: lostMain };
  say(`   Round 958's swap, same presses: key=${out.S2main.after.key}, backups=[${out.S2main.after.backups.join(', ')}], in no key: ${lostMain.join(', ') || 'none'}`);
}

/* ---------------------------------------------------------------- S3 */
say('\nS3. an ordinary boot over the whole fleet (through the real seam), branch made and base made saves');
{
  const fleets = [['branch', real]];
  if (baseReal) fleets.push(['base', baseReal]);
  out.S3 = {};
  for (const [label, r] of fleets) {
    let boots = 0; let saves = 0; let writes = 0; let changed = 0; let extra = 0;
    for (let i = 0; i < 4; i += 1) {
      page.m = new Map(ENTRIES.map(e => [e.saveKey, r.fleet[e.path][i]]));
      page.m.set('cookie-consent', 'essential');
      const before = new Map(page.m);
      page.reset();
      K.runSaveKeeper();
      boots += 1; saves += ENTRIES.length; writes += page.sets + page.removes;
      changed += [...before].filter(([k, v]) => page.m.get(k) !== v).length;
      extra += [...page.m.keys()].filter(k => !before.has(k)).length;
    }
    out.S3[label] = { boots, saves, writes, changed, extra };
    say(`   ${label}: ${boots} boots over ${saves} real saves: ${writes} writes or removes, ${changed} values changed, ${extra} keys added`);
  }
  if (baseReal) {
    let same = 0; let total = 0; const differ = [];
    for (const e of ENTRIES) for (let i = 0; i < 4; i += 1) { total += 1; if (real.fleet[e.path][i] === baseReal.fleet[e.path][i]) same += 1; else differ.push(`${e.path}#${i}`); }
    let opened = 0; let asked = 0; const refused = [];
    for (const [route, f] of Object.entries(real.accepts)) for (let i = 0; i < 4; i += 1) { asked += 1; if (noWindow(() => f(baseReal.fleet[route][i]))) opened += 1; else refused.push(`${route}#${i}`); }
    out.S3.baseVsBranch = { same, total, differ: differ.slice(0, 12), baseSavesOpenedByBranchLoaders: opened, asked, refused };
    say(`   base made saves byte equal to branch made ones: ${same} of ${total}${differ.length ? ` (differ: ${differ.slice(0, 12).join(', ')})` : ''}`);
    say(`   base made saves opened by the branch's own loaders: ${opened} of ${asked}${refused.length ? ` (refused: ${refused.join(', ')})` : ''}`);
  }
}

/* ---------------------------------------------------------------- S4 */
say('\nS4. a save of a game that REFUSES another version, holding no version number at all, or a text one');
out.S4 = [];
for (const route of Object.keys(K.SAVE_VERSIONS)) {
  const row = K.SAVE_VERSIONS[route];
  if (row.other === 'ignores') continue;
  const e = byPath[route];
  const load = real.accepts[route];
  for (const kind of ['missing', 'text']) {
    const o = JSON.parse(real.fleet[route][0]);
    let cur = o;
    for (let i = 0; i < row.at.length - 1; i += 1) cur = cur[row.at[i]];
    const last = row.at[row.at.length - 1];
    if (kind === 'missing') delete cur[last]; else cur[last] = String(row.current);
    const raw = JSON.stringify(o);
    const st = makeStore(new Map([[e.saveKey, raw]]));
    const made = K.keepUpdateCopies(st.api, at(0));
    const opens = load ? noWindow(() => load(raw)) : null;
    out.S4.push({ route, kind, gameOpensIt: opens, copiesMade: made, backups: backupsOf(st.m, e).length });
    say(`   ${route.padEnd(22)} version ${kind.padEnd(7)} the game ${opens === null ? 'has no pure loader' : opens ? 'OPENS it' : 'REFUSES it'}; copies kept aside by the boot: ${made}`);
  }
}

/* ---------------------------------------------------------------- S5 */
say('\nS5. the quiet copy, with one older kept aside save the player never answered');
{
  const e = byPath['/stadium-tycoon'];
  const row = K.SAVE_VERSIONS['/stadium-tycoon'];
  const o = JSON.parse(real.fleet['/stadium-tycoon'][0]); o[row.at[0]] = row.current - 1;
  const old = JSON.stringify(o);
  const unanswered = real.fleet['/stadium-tycoon'][1];
  const st = makeStore(new Map([[e.saveKey, old], [`${e.saveKey}${MARK}2026-10-01T09-00-00`, unanswered]]));
  const before = cardOffers(e, st.api);
  K.keepUpdateCopies(st.api, at(0));
  const after = cardOffers(e, st.api);
  out.S5 = { offeredBefore: before, offeredAfter: after, backups: backupsOf(st.m, e).length };
  say(`   before the boot the card offers ${before ? 'the unanswered save' : 'nothing'}; after the quiet copy it offers ${after ? 'a save' : 'NOTHING'} (${out.S5.backups} kept aside)`);
}

if (process.env.RC_OUT) { fs.mkdirSync(process.env.RC_OUT, { recursive: true }); fs.writeFileSync(path.join(process.env.RC_OUT, 'probe.json'), JSON.stringify(out, null, 1)); }
say('\nprobe: done (it asserts nothing; read the lines above).');
