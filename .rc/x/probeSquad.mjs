// Reviewer probe (r1323 run lens). Node only, no network, no dist.
// Part A: can the ENGINE write a squad under 14 through its own functions (loan in two, loan out down to 14,
//         send both loanees back with breakLoan)? If so, what does loadCareer on HEAD do to that save, against BASE?
// Part B: old saves under manager actions the simSaveFence fleet never takes: the BASE engine plays careers in which
//         the manager loans in, loans out and breaks loans; every save is loaded on HEAD and on BASE and compared.
// Usage: PROBE_BASE=<worktree of 8fea14e2> node probeSquad.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = path.resolve(process.env.PROBE_BASE || '');
if (!process.env.PROBE_BASE || !fs.existsSync(path.join(BASE, 'src/lib/clubManager.ts'))) { console.error('PROBE ABORT: set PROBE_BASE'); process.exit(3); }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probeSquad-'));
const KEY = 'dukb-club-manager-save';
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); } };

async function bundle(root, label) {
  const entry = path.join(TMP, `entry-${label}.mjs`);
  const out = path.join(TMP, `bundle-${label}.mjs`);
  const P = rel => JSON.stringify(path.join(root, rel).split(path.sep).join('/'));
  fs.writeFileSync(entry, `export * as cm from ${P('src/lib/clubManager.ts')};\nexport * as eras from ${P('src/lib/clubManagerEras.ts')};\n`);
  await build({ entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', absWorkingDir: root,
    alias: { '@': path.join(root, 'src') }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
  return import(pathToFileURL(out).href);
}
function mulberry(n) {
  let a = (n * 2654435761 + 0x2f6b9) >>> 0;
  const f = () => { f.calls += 1; a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.calls = 0;
  return f;
}
const head = await bundle(ROOT, 'head');
const base = await bundle(BASE, 'base');
Date.now = () => 1791302400000;

/** Manager actions in an open window: loan in two, loan out down to `floor`, then break both loans. */
function squeeze(cm, s, floor = 14, log = []) {
  if (s.transferWindow === null) { log.push('window shut'); return s; }
  const market = cm.buildMarket(s);
  let taken = 0;
  for (const mp of market) {
    if (taken >= 2) break;
    if (!cm.loanEligible(s, mp)) continue;
    const next = cm.loanIn(s, mp);
    if (next) { s = next; taken += 1; }
  }
  log.push(`loaned in ${taken}, squad ${s.squad.length}`);
  for (let guard = 0; s.squad.length > floor && guard < 60; guard++) {
    const p = s.squad.find(x => !x.onLoan && cm.loanOutRefusal(s, x.id) === null);
    if (!p) break;
    const next = cm.loanOutPlayer(s, p.id);
    if (!next) break;
    s = next;
  }
  log.push(`loaned out down to ${s.squad.length}`);
  for (const p of s.squad.filter(x => x.onLoan)) { const next = cm.breakLoan(s, p.id); if (next) s = next; }
  log.push(`after breakLoan: squad ${s.squad.length}, budget ${s.budget}`);
  return s;
}

/* ---------- Part A ---------- */
console.log('PART A: the squad floor through the engine\'s own functions');
let partARed = 0;
for (const club of ['Everton', 'Brighton', 'Fulham']) {
  Math.random = mulberry(1323);
  store.clear();
  const log = [];
  let s = head.cm.startCareer(club);
  s = squeeze(head.cm, s, 14, log);
  head.cm.saveCareer(s);
  const raw = store.get(KEY);
  const n0 = JSON.parse(raw).squad.length;
  const dh = mulberry(7); Math.random = dh;
  const h = head.cm.loadCareer();
  store.clear(); store.set(KEY, raw);
  const db = mulberry(7); Math.random = db;
  const b = base.cm.loadCareer();
  const hn = h?.squad.length, bn = b?.squad.length;
  const added = h ? h.squad.filter(p => !JSON.parse(raw).squad.some(q => q.id === p.id)).map(p => `${p.name} (${p.position}, ${p.age}${p.isYouth ? ', youth' : ''})`) : [];
  console.log(`  ${club}: ${log.join('; ')}. Saved squad ${n0}. Loaded on HEAD: ${hn} men, ${dh.calls} draws. On BASE: ${bn} men, ${db.calls} draws. HEAD added: ${added.join(', ') || 'nobody'}`);
  if (n0 < 14 && hn !== n0) partARed += 1;
}
console.log(`PART A: ${partARed} of 3 engine-written saves changed on load by the squad repair`);

/* ---------- Part B ---------- */
console.log('PART B: old saves (BASE engine, manager squeezes the squad at each window) load the same on HEAD and BASE');
let saves = 0, same = 0, under = 0, firstDiff = null;
for (const club of ['Everton', 'Brighton', 'Fulham', 'Lincoln City']) {
  for (const seedN of [0, 1, 2]) {
    Math.random = mulberry(500 + seedN);
    store.clear();
    let s;
    try { s = base.cm.startCareer(club); } catch (e) { console.log(`  ${club}: no career (${e.message})`); break; }
    let lastWindow = null;
    for (let guard = 0; s.week < s.calendar.length && guard < 220; guard++) {
      if (s.transferWindow && s.transferWindow !== lastWindow) { s = squeeze(base.cm, s, Number(process.env.PROBE_FLOOR || 0) || 15 - (seedN % 2), []); }
      lastWindow = s.transferWindow;
      const r = base.cm.playNextEntry(s, { skipHalftime: true });
      s = r.state;
      base.cm.saveCareer(s);
      const raw = store.get(KEY);
      const rnd = Math.random;
      saves += 1;
      if (JSON.parse(raw).squad.length < 14) under += 1;
      const dh = mulberry(9); Math.random = dh;
      store.set(KEY, raw); const h = JSON.stringify(head.cm.loadCareer());
      const db = mulberry(9); Math.random = db;
      store.set(KEY, raw); const b = JSON.stringify(base.cm.loadCareer());
      Math.random = rnd;
      if (h === b && dh.calls === db.calls) same += 1;
      else firstDiff ??= `${club} seed ${seedN} week ${s.week}: draws head ${dh.calls} base ${db.calls}, json equal ${h === b}`;
      store.set(KEY, raw);
      if (r.kind === 'seasonOver') break;
    }
  }
}
console.log(`PART B: ${saves} saves, ${under} with a squad under 14, ${same} open to the same JSON and draw count on HEAD and BASE. First difference: ${firstDiff ?? 'none'}`);
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`probeSquad: done (partA changed ${partARed}, partB ${saves - same} differ)`);
console.log(`probeSquad PART B floor ${process.env.PROBE_FLOOR || '14/15'}: ${same} of ${saves} same`);
process.exit(partARed || saves !== same ? 1 : 0);
