// Review of Round 1311 (run lens): saves written by the BASE engine, loaded and played on the BRANCH.
// OLD_BASE=<worktree of origin/main> node .rc/x/r1311run-old.mjs   (run from the repo root of the branch)
// Per real league (club = the league's SECOND club, so not the harness's fleet), one seeded stream:
//  P  base only: start, 18 entries, JSON round trip through base.loadCareer, play to the end, finishSeason.
//  Q  the same stream: start on base, 18 entries, JSON, loaded by the BRANCH's loadCareer, played to the end and
//     finished on the branch. Compared with P: the draw count, the whole save but the moved honours, and the
//     summary and record WHOLE where the book does not decide (share by hand, floor 73 typed here).
//  R  P's finished state (a base summary pending, base records with no awards) loaded on the branch, rolled into
//     the next season and played to its end on the branch: no throw, the old record untouched, the new record
//     with awards exactly when the book decides by hand, everything survives JSON.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.OLD_BASE;
if (!BASE || !fs.existsSync(path.join(BASE, 'src/lib/clubManager.ts'))) { console.log('old: cannot run: OLD_BASE'); process.exit(2); }
const FLOOR = 73;
const ENTRIES = Number(process.env.OLD_ENTRIES ?? 18);
const KEY = 'dukb-club-manager-save';
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(), key: () => null, get length() { return store.size; } };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r1311-old-'));

async function bundle(label, root) {
  const entry = path.join(TMP, `${label}-entry.mjs`);
  const out = path.join(TMP, `${label}.mjs`);
  const P = f => JSON.stringify(path.join(root, f).replaceAll('\\', '/'));
  fs.writeFileSync(entry, `export * as cm from ${P('src/lib/clubManager.ts')};\n`);
  await build({ entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', absWorkingDir: root,
    alias: { '@': path.join(root, 'src') }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
  const mod = await import(pathToFileURL(out).href);
  await mod.cm.ensureAllEraRosters();
  return mod.cm;
}
function seeded(seed) {
  let a = seed >>> 0; let calls = 0;
  const draw = () => { calls += 1; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  draw.calls = () => calls; return draw;
}
const realRandom = Math.random; const realNow = Date.now;
function onStream(draw, fn) { Math.random = draw; Date.now = () => 1791302400000; try { return fn(); } finally { Math.random = realRandom; Date.now = realNow; } }
function playTo(cm, s, stopAt) {
  let guard = 0;
  while (s.week < s.calendar.length && guard++ < 240) {
    if (stopAt !== undefined && guard > stopAt) break;
    const r = cm.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}
function viaSave(cm, s) { store.set(KEY, JSON.stringify(s)); const got = cm.loadCareer(); if (!got) throw new Error('loadCareer refused the save'); return got; }
function shareByHand(s) {
  const book = s.leagueBook; if (!book || !book.c) return null;
  let named = 0; let own = 0; let un = 0;
  for (const club of s.leagueClubs) { if (club === s.clubName) continue; const e = book.c[club]; if (!e) continue; for (const row of Object.values(e.m ?? {})) named += row[0] ?? 0; own += e.og ?? 0; un += e.u ?? 0; }
  un = Math.max(0, un - (book.u0 ?? 0));
  const all = named + own + un;
  return all > 0 ? Math.floor(100 * (named + own) / all) : 100;
}
const MOVED = ['goldenBoot', 'playerOfSeason', 'ballonDor', 'awards'];
const strip = o => { if (!o) return o; const c = { ...o }; for (const m of MOVED) delete c[m]; return c; };
const face = s => JSON.stringify(s, (k, v) => {
  if (k === 'leagueBook') return undefined;
  if (k === 'pendingSummary' && v && typeof v === 'object') return strip(v);
  if (k === 'history' && Array.isArray(v)) return v.map(h => { const { awards, ...rest } = h; void awards; return rest; });
  return v;
});

const base = await bundle('base', BASE);
const head = await bundle('head', ROOT);
let fails = 0; const fail = m => { fails += 1; console.log(`FAIL ${m}`); };
const rows = [];
let checks = 0;
for (const [li, league] of head.REAL_LEAGUES.entries()) {
  const club = league.clubs[1] ?? league.clubs[0];
  const seed = (0xb2b2 + li * 101) >>> 0;
  const tag = `${league.id} ${club}`;
  try {
    const dP = seeded(seed);
    const P = onStream(dP, () => { let s = base.startCareer(club, 'now'); s = playTo(base, s, ENTRIES); s = viaSave(base, s); s = playTo(base, s); const before = JSON.parse(JSON.stringify(s)); const fin = base.finishSeason(s); return { before, fin }; });
    const dQ = seeded(seed);
    const Q = onStream(dQ, () => { let s = base.startCareer(club, 'now'); s = playTo(base, s, ENTRIES); s = viaSave(head, s); s = playTo(head, s); const before = JSON.parse(JSON.stringify(s)); const fin = head.finishSeason(s); return { before, fin }; });
    checks += 1;
    if (dP.calls() !== dQ.calls()) fail(`${tag}: draws ${dP.calls()} on base, ${dQ.calls()} with the branch carrying the base save`);
    const share = shareByHand(Q.before);
    const whole = Boolean(Q.before.leagueBook && Q.before.leagueBook.r0 === undefined);
    const decided = whole && share !== null && share >= FLOOR && head.leagueBoardsOf(Q.before) !== null;
    const recP = P.fin.state.history.find(h => h.season === P.before.season);
    const recQ = Q.fin.state.history.find(h => h.season === Q.before.season);
    checks += 1;
    if (face(P.fin.state) !== face(Q.fin.state)) fail(`${tag}: the finished save (honours and book aside) differs from the base's`);
    if (!decided) {
      checks += 1;
      if (JSON.stringify(P.fin.summary) !== JSON.stringify(Q.fin.summary)) fail(`${tag}: share ${share}, not decided, but the summary is not the base's whole`);
      if (JSON.stringify(recP) !== JSON.stringify(recQ)) fail(`${tag}: share ${share}, not decided, but the record is not the base's whole`);
    } else {
      checks += 1;
      if (JSON.stringify(strip(P.fin.summary)) !== JSON.stringify(strip(Q.fin.summary))) fail(`${tag}: decided, the summary differs beyond the four moved fields`);
      const aw = Q.fin.summary.awards;
      if (!aw || aw.cov !== share) fail(`${tag}: decided at ${share} by hand, awards ${JSON.stringify(aw && aw.cov)}`);
      if (JSON.stringify(recQ?.awards) !== JSON.stringify(aw)) fail(`${tag}: the record's awards are not the summary's`);
    }
    /* R: the base's finished season, pending summary and all, opened on the branch and played one more season. */
    const dR = seeded(seed ^ 0x5151);
    const R = onStream(dR, () => {
      const loaded = viaSave(head, P.fin.state);
      if (JSON.stringify(loaded.pendingSummary ?? null) !== JSON.stringify(P.fin.summary)) fail(`${tag}: the base's pending summary changed on load`);
      if ('awards' in (loaded.pendingSummary ?? {})) fail(`${tag}: a base summary gained awards on load`);
      let s = head.startNextSeason(loaded);
      s = playTo(head, s);
      const before = JSON.parse(JSON.stringify(s));
      const fin = head.finishSeason(s);
      return { loaded, before, fin };
    });
    checks += 2;
    const oldRec = R.fin.state.history.find(h => h.season === P.before.season);
    if (JSON.stringify(oldRec) !== JSON.stringify(recP)) fail(`${tag}: the base's record of season ${P.before.season} changed on the branch: ${JSON.stringify(oldRec)}`);
    const share2 = shareByHand(R.before);
    const decided2 = Boolean(R.before.leagueBook && R.before.leagueBook.r0 === undefined && share2 >= FLOOR && head.leagueBoardsOf(R.before));
    const newRec = R.fin.state.history.find(h => h.season === R.before.season);
    if (decided2 !== Boolean(newRec?.awards)) fail(`${tag}: next season share ${share2} decided ${decided2} but the record ${newRec?.awards ? 'has' : 'has no'} awards`);
    if (JSON.stringify(JSON.parse(JSON.stringify(R.fin.state))) !== JSON.stringify(R.fin.state)) fail(`${tag}: the save does not survive JSON`);
    rows.push(`${league.id}:${share}${decided ? 'D' : '-'}/${share2}${decided2 ? 'D' : '-'}${Q.fin.summary.awards?.xi ? 'x' : ''}`);
  } catch (e) {
    fail(`${tag}: threw ${String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')}`);
  }
}
console.log(`shares (base save carried on the branch / the next season on the branch; D decided, x a team): ${rows.join(' ')}`);
const near = rows.filter(r => { const n = Number(r.split(':')[1].split(/[D\-/]/)[0]); return n >= 70 && n <= 76; });
console.log(`leagues closing within 70 to 76: ${near.length ? near.join(' ') : 'none'}`);
console.log(fails ? `old: RED, ${fails} failures over ${checks} checks on ${rows.length} leagues` : `old: green, ${checks} checks on ${rows.length} leagues`);
process.exit(fails ? 1 : 0);
