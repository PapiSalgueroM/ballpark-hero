/*
 * Round 1513 harness: Club Manager's save points, on the REAL engine, the
 * REAL points modules and the REAL save keeper, bundled with esbuild.
 *
 * A player report forwarded on 2026-10-18 asked for a point he can make at
 * any time in one career, go back to after a mistake, copy, rename and
 * delete. src/lib/cmSavePoints.ts and src/lib/cmSavePointsStore.ts hold them;
 * a restore goes through stageCopy in src/lib/cmSavePoints.ts, then applyPending in src/lib/saveKeeper.ts
 * on the next load. src/test/cmSavePoints.test.ts holds the storage rules
 * one at a time on a fresh career; this plays whole careers through them.
 *
 *   1) SIZES. Two careers (Everton and Lincoln City, today), a point at week
 *      10 of seasons 1, 8 and 15: the career's plain text and the stored
 *      point, in characters. Each point opens back to the career's exact
 *      text, and is under half its career. Skipped under a control that aims
 *      at another section.
 *   2) A POINT IS WHAT IT SAYS. On a store that silently cuts what it is
 *      handed, a point is refused, never reported saved, and so is one whose
 *      index the store cuts (the first point, and over one). A point whose bytes
 *      were swapped for another point's career (a damaged store, the length
 *      and sum no longer match) is refused at restore and nothing is staged.
 *   3) RESTORE AFTER SEVERAL MATCHES. A point at week 10, three matches
 *      played and saved, restore staged and applied as the next load does:
 *      the save is the point's text byte for byte, a reload (loadCareer)
 *      opens the very career a reload opened at the point, the career he had
 *      is kept aside and is the one the card offers, and the point is still
 *      there.
 *   4) THE CAP. Three points, a fourth refused, every point still listed and
 *      byte equal; a copy refused at three; a copy made at two opens to its
 *      source's career after the source is renamed and deleted.
 *   5) THE QUOTA. A store with room for the point but not the index, and one
 *      with room for nothing: the store is byte equal before and after (the
 *      career and every point). A restore with room to stage but not to keep
 *      the career aside: nothing is put back, and the career is where it was.
 *   6) A SEASON POSTS ONCE. The hook's rule replayed (a scored ping and a
 *      scored completion only when the engine's postsScore AND the slot's
 *      record say so, the season credited as it finishes): a restore into a
 *      season that never finished posts nothing for it again, and a restore
 *      that replays a season already finished posts no second completion.
 *   7) THE HOOK'S WIRING, read as code: every scored ping asks the wrapper,
 *      the wrapper asks the record, each scored completion credits its
 *      season, and deleting a career or starting one clears its slot.
 *   8) A CAREER THAT NEVER MAKES A POINT writes no new key: a season played
 *      with the hook's store calls leaves only the career's own key.
 *
 * NEGATIVE CONTROLS (SIM_CM_POINTS_CONTROL=<name>), each asserts the text it
 * changes is in the file first, changes a copy only, and must turn its
 * section red: unpacked (1), lossy (1), noindexback (2), noreadback (2),
 * nosum (2), noaside (3), evict (4), orphan (5), blocked (6), nocredit (6),
 * unguarded (7), noclear (7), pointless (8).
 *
 * MEASURED (section 1, on GitHub runners, Round 1513 build r1513-f and every
 * run since; the careers are seeded, so the numbers repeat): a point is 21.0
 * to 25.9 percent of its career's characters. Everton 101,393 / 21,303 at
 * season 1, 150,415 / 37,082 at season 8, 152,746 / 39,536 at season 15;
 * Lincoln City 101,154 / 21,370, 150,061 / 35,906, 154,354 / 38,585. The
 * bound is half, so the largest point measured sits at about half the bound.
 * A restore costs more than a point (section 3 prints it): the staged copy
 * and the kept aside career are plain text, a whole career each (about 153K
 * characters at season 15), and the game keeps three kept aside careers.
 */
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cmPoints-')).replaceAll('\\', '/');
const ENTRY = `${TMP}/entry.mjs`;
const BUNDLE = `${TMP}/bundle.mjs`;
const CONTROL = process.env.SIM_CM_POINTS_CONTROL || '';
const SAVE_KEY = 'dukb-club-manager-save';
const abort = m => { console.error(`ABORT: ${m}`); process.exit(2); };
const readLF = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

function findUp(rel) {
  let dir = ROOT;
  for (let i = 0; i < 6; i++) {
    const p = path.join(dir, rel);
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return abort(`could not find ${rel} above ${ROOT}`);
}

/* ---------- the controls: a file, the text there, what replaces it, the section that must go red ---------- */
const CONTROLS = {
  /* Review of 2026-10-19: section 1's two checks had no control. */
  unpacked: { file: 'src/lib/cmSavePoints.ts', section: 1,
    from: 'size: packed.length,',
    to: 'size: text.length,' },
  lossy: { file: 'src/lib/cmSavePoints.ts', section: 1,
    from: 'return { ok: true, meta, text, packed };',
    to: 'return { ok: true, meta, text: text.slice(1), packed };' },
  /* Review of 2026-10-19: the index read back had no guard (a store that cuts the index). */
  noindexback: { file: 'src/lib/cmSavePointsStore.ts', section: 2,
    from: '    return storage.getItem(pointsIndexKey(slot)) === text;',
    to: '    return true;' },
  noreadback: { file: 'src/lib/cmSavePoints.ts', section: 2,
    from: "if (back !== packed || decompressFromUTF16(back) !== text) throw new Error('point did not read back');",
    to: "if (back === null) throw new Error('point did not read back');" },
  nosum: { file: 'src/lib/cmSavePoints.ts', section: 2,
    from: "if (typeof text !== 'string' || text.length !== meta.len || sumOf(text) !== meta.sum) return { ok: false, why: 'damaged' };",
    to: "if (typeof text !== 'string') return { ok: false, why: 'damaged' };" },
  noaside: { file: 'src/lib/saveKeeper.ts', section: 3,
    from: '  if (cur !== null) {\n    if (heldAside(entry, storage, cur)) {',
    to: '  if (cur === "never") {\n    if (heldAside(entry, storage, cur)) {' },
  evict: { file: 'src/lib/cmSavePoints.ts', section: 4,
    from: "  if (idx.points.length >= POINTS_CAP) return { ok: false, why: 'full' };\n  let text: string;",
    to: "  if (idx.points.length >= POINTS_CAP) idx.points.shift();\n  let text: string;" },
  orphan: { file: 'src/lib/cmSavePoints.ts', section: 5,
    from: '    storage.removeItem(key);\n    if (before === null)',
    to: '    if (before === null)' },
  blocked: { file: 'src/lib/cmSavePointsStore.ts', section: 6,
    from: '(!idx.credited.includes(season) && !idx.blocked.includes(season))',
    to: '(!idx.credited.includes(season))' },
  nocredit: { file: 'src/lib/cmSavePointsStore.ts', section: 6,
    from: '  if (!idx || idx.credited.includes(season)) return;\n',
    to: '  if (idx || !idx) return;\n' },
  unguarded: { file: 'src/hooks/useClubManager.ts', section: 7,
    from: 'return careerPostsScore(s) && seasonPosts(activeSlot(), s.season);',
    to: 'return careerPostsScore(s);' },
  noclear: { file: 'src/hooks/useClubManager.ts', section: 7,
    from: '    /* Round 1513: the career\'s save points and its score record go with it. */\n    clearSlotPoints(slot);\n',
    to: '' },
  pointless: { file: 'src/lib/cmSavePointsStore.ts', section: 8,
    from: '  if (raw === null) return null;\n  try {\n    const o = JSON.parse(raw)',
    to: '  if (raw === null) return emptyIndex();\n  try {\n    const o = JSON.parse(raw)' },
};
const ctl = CONTROL ? CONTROLS[CONTROL] : null;
if (CONTROL && !ctl) abort(`unknown control "${CONTROL}" (${Object.keys(CONTROLS).join(', ')})`);
/** A file's code as the bundle or the reader sees it, with the control applied when it aims there. */
function source(rel) {
  const text = readLF(path.join(ROOT, rel));
  if (!ctl || ctl.file !== rel) return text;
  const n = text.split(ctl.from).length - 1;
  if (n !== 1) abort(`control ${CONTROL}: the text it changes is in ${rel} ${n} times, not once`);
  return text.replace(ctl.from, ctl.to);
}
if (ctl) console.log(`NEGATIVE CONTROL ON: SIM_CM_POINTS_CONTROL=${CONTROL} (${ctl.file}, must turn section ${ctl.section} red)`);

/* ---------- the bundle: a store with a quota, a refusal hook and a liar, then the real modules ---------- */
fs.writeFileSync(ENTRY, `
const store = new Map();
globalThis.__store = store;
globalThis.__quota = Infinity;
globalThis.__refuse = null;
globalThis.__cut = null;
const used = () => { let n = 0; for (const [k, v] of store) n += k.length + v.length; return n; };
globalThis.__used = used;
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    v = String(v);
    if (globalThis.__refuse && globalThis.__refuse(k)) throw new Error('QuotaExceededError (refusal stub)');
    const after = used() - (store.has(k) ? k.length + store.get(k).length : 0) + k.length + v.length;
    if (after > globalThis.__quota) throw new Error('QuotaExceededError (quota stub)');
    store.set(k, globalThis.__cut && globalThis.__cut(k) ? v.slice(0, v.length - 7) : v);
  },
  removeItem: k => { store.delete(k); },
  clear: () => store.clear(),
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
export const cm = await import('@/lib/clubManager');
export const st = await import('@/lib/clubManagerStart');
export const pts = await import('@/lib/cmSavePoints');
export const ps = await import('@/lib/cmSavePointsStore');
export const keeper = await import('@/lib/saveKeeper');
export const rec = await import('@/lib/brokenSaveRecovery');
export const saves = await import('@/data/continueSaves');
export const lz = await import('lz-string');
`);
const { build } = await import('esbuild');
const swapped = new Set();
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error',
  alias: { '@': `${ROOT_URL}/src` }, nodePaths: [path.join(path.dirname(findUp(path.join('node_modules', 'lz-string', 'package.json'))), '..')],
  plugins: [{
    name: 'control',
    setup(b) {
      b.onLoad({ filter: /\.tsx?$/ }, args => {
        const rel = path.relative(ROOT, args.path).replaceAll('\\', '/');
        if (!ctl || ctl.file !== rel) return undefined;
        swapped.add(rel);
        return { contents: source(rel), loader: rel.endsWith('x') ? 'tsx' : 'ts' };
      });
    },
  }],
});
if (ctl && ctl.file !== 'src/hooks/useClubManager.ts' && !swapped.has(ctl.file)) abort(`control ${CONTROL}: ${ctl.file} never reached the bundle`);
const { cm, st, pts, ps, keeper, rec, saves, lz } = await import(pathToFileURL(BUNDLE).href);
const { startCareer, playNextEntry, finishSeason, startNextSeason, saveCareer, loadCareer, trimCareer } = cm;
for (const [name, fn] of Object.entries({ startCareer, playNextEntry, finishSeason, startNextSeason, saveCareer, loadCareer, trimCareer,
  postsScore: st.postsScore, createPoint: pts.createPoint, restorePoint: pts.restorePoint, stageCopy: pts.stageCopy, applyPending: keeper.applyPending })) {
  if (typeof fn !== 'function') abort(`the harness could not reach ${name}; the bundle is not the shape it expects`);
}
if (cm.SAVE_KEY !== SAVE_KEY) abort(`SAVE_KEY is ${cm.SAVE_KEY}, not the key the save points restore into`);
const store = globalThis.__store;
const ls = globalThis.localStorage;
const entry = saves.CONTINUE_SAVES.find(e => e.saveKey === SAVE_KEY);
if (!entry) abort('no continue save entry for Club Manager');

const failures = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error(`  FAIL (${section}): ${m}`); };
const snap = () => JSON.stringify([...store.entries()].sort());
const T0 = new Date('2026-10-19T12:00:00Z');
let tick = 0;
const now = () => new Date(T0.getTime() + (tick += 1000));
const stageHere = when => (e, text) => pts.stageCopy(e, text, ls, when);

/** The stream from scripts/lib/seedRandom.mjs, rooted per career and season. */
function reseed(career, season, salt = 0) {
  let a = (1513 + career * 7919 + season * 104729 + salt * 15485863) >>> 0;
  Math.random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- playing: the board is held up by fiat, so every section sees a whole career ---------- */
let nudges = 0;
function entryOf(s) {
  if (s.boardConfidence < 35) { s = { ...s, boardConfidence: 55 }; nudges += 1; }
  return playNextEntry(s, { skipHalftime: true });
}
/** Entries until the week pointer reaches w, n matches have been played, or the season is over. */
function play(s, { toWeek = Infinity, matches = Infinity, onPing } = {}) {
  let played = 0;
  for (let g = 0; g < 220 && s.week < toWeek && played < matches; g++) {
    const res = entryOf(s);
    s = res.state;
    if (res.kind === 'match' && res.report) { played += 1; onPing?.(s); }
    if (res.kind === 'seasonOver') return { s, over: true };
  }
  return { s, over: false };
}
/** The rest of the season, its end (onEnd sees the finished season) and the next one started. */
function nextSeason(s, onPing, onEnd) {
  const run = play(s, { onPing });
  if (!run.over) throw new Error('a season never ended in 220 entries');
  const fin = finishSeason(run.s).state;
  onEnd?.(fin);
  return startNextSeason(fin);
}
const pointKey = id => ps.pointKey(1, id);
/** A restore as the screen and the next load make it: stage, then apply. Returns the career the load opens. */
function restoreTo(point, cur, label) {
  saveCareer(cur);
  const when = now();
  const r = pts.restorePoint(1, point.meta.id, cur, ls, stageHere(when));
  if (!r.ok) { fail(`${label}: the restore was refused (${r.why})`); return cur; }
  const out = keeper.applyPending(ls, when);
  if (!out || !out.ok || !out.copy) fail(`${label}: the load did not put the point back (${JSON.stringify(out)})`);
  return loadCareer();
}

/* ---------- 1. sizes ---------- */
console.log('\n1. sizes: a point at week 10 of seasons 1, 8 and 15');
const sizes = [];
if (ctl && ctl.section !== 1) console.log('   skipped under a control that aims elsewhere');
else {
  for (const [ci, club] of ['Everton', 'Lincoln City'].entries()) {
    reseed(ci, 0);
    let s = startCareer(club);
    for (let season = 1; season <= 15; season++) {
      reseed(ci, season);
      if (season === 1 || season === 8 || season === 15) {
        s = play(s, { toWeek: 9 }).s;
        store.clear();
        const text = pts.pointText(s);
        const r = pts.createPoint(1, s, '', ls, now());
        if (!r.ok) { fail(`${club} season ${season}: the point was refused (${r.why})`); continue; }
        const o = pts.openPoint(1, r.meta.id, ls);
        if (!o.ok || o.text !== text) fail(`${club} season ${season}: the point does not open to the career's text`);
        if (r.meta.size * 2 > text.length) fail(`${club} season ${season}: the point is ${r.meta.size} characters for ${text.length} of career, not under half`);
        sizes.push({ club, season, plain: text.length, point: r.meta.size });
        console.log(`   ${club.padEnd(13)} season ${String(season).padStart(2)}: career ${text.length} characters, point ${r.meta.size} (${(100 * r.meta.size / text.length).toFixed(1)} percent)`);
      }
      if (season < 15) s = nextSeason(s);
    }
  }
}

/* ---------- 2. a point is what it says ---------- */
section = 2;
console.log('\n2. a point is what it says');
reseed(5, 1);
const base = play(startCareer('Everton'), { toWeek: 9 }).s;
store.clear();
globalThis.__cut = k => k.startsWith('dukb-cm-point-');
{
  const before = snap();
  const r = pts.createPoint(1, base, 'Liar', ls, now());
  globalThis.__cut = null;
  if (r.ok) fail('a point the store cut short was reported saved');
  if (snap() !== before) fail('a refused point left something behind');
  console.log(`   a store that cuts what it is handed: ${r.ok ? 'reported saved' : `refused (${r.why})`}`);
}
/* Review of 2026-10-19: the same store cutting the next index write only, once with no index there and once over
   one point (the cut is once, so the index put back as it was is not cut again). */
for (const first of [false, true]) {
  store.clear();
  if (first && !pts.createPoint(1, base, 'First', ls, now()).ok) abort('section 2 could not make its first point');
  const before = snap();
  let cuts = 1;
  globalThis.__cut = k => k === ps.pointsIndexKey(1) && cuts-- > 0;
  const r = pts.createPoint(1, base, 'Liar index', ls, now());
  globalThis.__cut = null;
  if (r.ok) fail(`an index the store cut short was reported saved (${first ? 'over one point' : 'the first point'})`);
  if (snap() !== before) fail(`a refused index left the store changed (${first ? 'over one point' : 'the first point'})`);
  console.log(`   a store that cuts the index, ${first ? 'over one point' : 'the first point'}: ${r.ok ? 'reported saved' : `refused (${r.why})`}`);
}
store.clear();
const later = play(base, { matches: 3 }).s;
{
  const a = pts.createPoint(1, base, 'A', ls, now());
  const b = pts.createPoint(1, later, 'B', ls, now());
  if (!a.ok || !b.ok) abort('section 2 could not make its two points');
  store.set(pointKey(a.meta.id), store.get(pointKey(b.meta.id)));
  saveCareer(later);
  const before = snap();
  const staged = [];
  const r = pts.restorePoint(1, a.meta.id, later, ls, (_e, t) => { staged.push(t); return { ok: true }; });
  if (r.ok || r.why !== 'damaged') fail(`a point holding another point's career was ${r.ok ? 'restored' : `refused as ${r.why}`}, not refused as damaged`);
  if (staged.length) fail('a damaged point was staged');
  if (snap() !== before) fail('refusing a damaged point changed the store');
  console.log(`   a point holding another point's career: ${r.ok ? 'restored' : `refused (${r.why})`}, staged ${staged.length}`);
}

/* ---------- 3. restore after several matches ---------- */
section = 3;
console.log('\n3. restore after three matches');
store.clear();
reseed(6, 1);
const atPoint = play(startCareer('Lincoln City'), { toWeek: 9 }).s;
saveCareer(atPoint);
const pointBytes = store.get(SAVE_KEY);
reseed(6, 1, 1);
const reloadAtPoint = JSON.stringify(loadCareer());
const p3 = pts.createPoint(1, atPoint, 'Before the run', ls, now());
if (!p3.ok) abort('section 3 could not make its point');
let moved = atPoint;
for (let i = 0; i < 3; i++) { moved = play(moved, { matches: 1 }).s; saveCareer(moved); }
const had = store.get(SAVE_KEY);
if (had === pointBytes || moved.week <= atPoint.week) abort(`three matches did not move the career (week ${atPoint.week} to ${moved.week})`);
{
  const when = now();
  const r = pts.restorePoint(1, p3.meta.id, moved, ls, stageHere(when));
  if (!r.ok) fail(`the restore was refused (${r.why})`);
  if (store.get(SAVE_KEY) !== had) fail('the restore wrote the save under a live page');
  /* Review of 2026-10-19: what a restore costs the browser, beside what the point costs. */
  const stagedLen = store.get(keeper.PENDING_COPY_KEY)?.length ?? 0;
  console.log(`   what a restore holds: a staged plain copy of ${stagedLen} characters until the load, then a kept aside career of ${had.length} (the game keeps its three newest); the point is ${p3.meta.size}`);
  const out = keeper.applyPending(ls, when);
  if (!out || !out.ok || !out.copy || !out.kept) fail(`the load's outcome was ${JSON.stringify(out)}`);
  if (store.get(SAVE_KEY) !== pointBytes) fail('the save after the load is not the point byte for byte');
  reseed(6, 1, 1);
  const reloadAfter = JSON.stringify(loadCareer());
  if (reloadAfter !== reloadAtPoint) fail('a reload after the restore opens a different career from a reload at the point');
  const aside = rec.backupKeysOf(entry, ls);
  const offered = rec.offeredBackup(entry, ls);
  if (!aside.some(k => store.get(k) === had)) fail('the career he had is not kept aside');
  if (!offered || store.get(offered) !== had) fail('the card does not offer the career he had');
  const again = pts.openPoint(1, p3.meta.id, ls);
  if (!again.ok || again.text !== pointBytes) fail('the point changed when it was restored');
  if (store.has(keeper.PENDING_COPY_KEY) || store.has(keeper.PENDING_RESTORE_KEY)) fail('the staging was left behind');
  console.log(`   week ${moved.week + 1} back to week ${JSON.parse(store.get(SAVE_KEY)).week + 1}; save equal ${store.get(SAVE_KEY) === pointBytes}, reload equal ${reloadAfter === reloadAtPoint}, kept aside ${aside.length}, offered ${!!offered && store.get(offered) === had}`);
}

/* ---------- 4. the cap ---------- */
section = 4;
console.log('\n4. three a career, never one dropped');
store.clear();
{
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const r = pts.createPoint(1, i === 1 ? moved : atPoint, `P${i}`, ls, now());
    if (r.ok) ids.push(r.meta.id); else fail(`point ${i + 1} of 3 was refused (${r.why})`);
  }
  const bytes = ids.map(id => store.get(pointKey(id)));
  const r4 = pts.createPoint(1, moved, 'Fourth', ls, now());
  if (r4.ok || r4.why !== 'full') fail(`a fourth point was ${r4.ok ? 'made' : `refused as ${r4.why}`}, not refused as full`);
  const c4 = pts.copyPoint(1, ids[0], ls, now());
  if (c4.ok || c4.why !== 'full') fail(`a copy at three was ${c4.ok ? 'made' : `refused as ${c4.why}`}, not refused as full`);
  const listed = (ps.readPointsIndex(1, ls)?.points ?? []).map(p => p.id);
  if (JSON.stringify(listed) !== JSON.stringify(ids)) fail(`the list is ${listed.join(',')} after the refusals, not ${ids.join(',')}`);
  if (ids.some((id, i) => store.get(pointKey(id)) !== bytes[i])) fail('a point changed when the fourth was refused');
  pts.deletePoint(1, ids[2], ls);
  const cp = pts.copyPoint(1, ids[0], ls, now());
  if (!cp.ok) fail(`a copy at two was refused (${cp.why})`);
  else {
    pts.renamePoint(1, ids[0], 'Renamed', ls);
    pts.deletePoint(1, ids[0], ls);
    const o = pts.openPoint(1, cp.meta.id, ls);
    if (!o.ok || o.text !== pts.pointText(atPoint)) fail('a copy did not open to its source career after the source was renamed and deleted');
  }
  console.log(`   fourth: ${r4.ok ? 'made' : r4.why}; copy at three: ${c4.ok ? 'made' : c4.why}; listed ${listed.length}`);
}

/* ---------- 5. the quota ---------- */
section = 5;
console.log('\n5. a full store keeps the career and every point');
store.clear();
saveCareer(moved);
{
  const keep = pts.createPoint(1, atPoint, 'Kept', ls, now());
  if (!keep.ok) abort('section 5 could not make its point');
  const packedLen = lz.compressToUTF16(pts.pointText(moved)).length;
  for (const [label, room] of [['room for the point but not its index', packedLen + 60], ['room for nothing', 0]]) {
    const before = snap();
    globalThis.__quota = globalThis.__used() + room;
    const r = pts.createPoint(1, moved, 'No room', ls, now());
    globalThis.__quota = Infinity;
    if (r.ok) fail(`${label}: the point was reported saved`);
    if (snap() !== before) fail(`${label}: the store changed (a half written point or index)`);
    console.log(`   ${label}: ${r.ok ? 'saved' : r.why}, store equal ${snap() === before}`);
  }
  const savedBefore = store.get(SAVE_KEY);
  const when = now();
  const staged = pts.restorePoint(1, keep.meta.id, moved, ls, stageHere(when));
  if (!staged.ok) fail(`the restore could not even be staged (${staged.why})`);
  globalThis.__quota = globalThis.__used() + 100;
  const out = keeper.applyPending(ls, when);
  globalThis.__quota = Infinity;
  if (!out || out.ok || out.why !== 'no-room') fail(`with no room to keep the career aside the load answered ${JSON.stringify(out)}`);
  if (store.get(SAVE_KEY) !== savedBefore) fail('with no room to keep the career aside the save was replaced');
  const o = pts.openPoint(1, keep.meta.id, ls);
  if (!o.ok || o.text !== pts.pointText(atPoint)) fail('the point did not survive a refused load');
  if (store.has(keeper.PENDING_COPY_KEY) || store.has(keeper.PENDING_RESTORE_KEY)) fail('a refused load left its staging behind');
  console.log(`   no room to keep the career aside: ${out?.ok ? 'put back' : out?.why}, career kept ${store.get(SAVE_KEY) === savedBefore}`);
}

/* ---------- 6. a season posts once ---------- */
section = 6;
console.log('\n6. a season posts once per career');
store.clear();
{
  /* The hook's rule (useClubManager.ts postsScore and creditSeason), with a count where it would post. */
  const posts = new Map();
  const bump = (season, kind) => { const p = posts.get(season) ?? { pings: 0, completions: 0 }; p[kind] += 1; posts.set(season, p); };
  const onPing = s => { if (st.postsScore(s) && ps.seasonPosts(1, s.season, ls)) bump(s.season, 'pings'); };
  const onEnd = fin => { if (st.postsScore(fin) && ps.seasonPosts(1, fin.season, ls)) bump(fin.season, 'completions'); ps.noteSeasonCredited(1, fin.season, ls); };
  const count = (season, kind) => posts.get(season)?.[kind] ?? 0;
  reseed(7, 1);
  let s = startCareer('Everton');
  if (!st.postsScore(s)) abort('a fresh Medium career does not post scores, so this section measures nothing');
  /* A: a point in season 1, five more matches, back to it. Season 1 never finished, and must not post again. */
  s = play(s, { toWeek: 9, onPing }).s;
  const pA = pts.createPoint(1, s, 'Season 1', ls, now());
  if (!pA.ok) abort('section 6 could not make its first point');
  s = play(s, { matches: 5, onPing }).s;
  const pingsBeforeA = count(1, 'pings');
  s = restoreTo(pA, s, 'restore into season 1');
  reseed(7, 1, 1);
  s = nextSeason(s, onPing, onEnd);
  const replayA = count(1, 'pings') - pingsBeforeA;
  if (replayA !== 0 || count(1, 'completions') !== 0) fail(`season 1 posted again after a restore landed in it: ${replayA} pings and ${count(1, 'completions')} completion(s) on the replay`);
  /* B: a point in season 2, seasons 2 and 3 finished (credited), into season 4, back to season 2. */
  reseed(7, 2);
  s = play(s, { toWeek: 9, onPing }).s;
  const pB = pts.createPoint(1, s, 'Season 2', ls, now());
  if (!pB.ok) abort('section 6 could not make its second point');
  s = nextSeason(s, onPing, onEnd);
  reseed(7, 3);
  s = nextSeason(s, onPing, onEnd);
  reseed(7, 4);
  s = play(s, { matches: 3, onPing }).s;
  const firstPass = { 2: { ...posts.get(2) }, 3: { ...posts.get(3) } };
  s = restoreTo(pB, s, 'restore into season 2');
  reseed(7, 2, 1);
  s = nextSeason(s, onPing, onEnd);
  reseed(7, 3, 1);
  s = nextSeason(s, onPing, onEnd);
  for (const season of [2, 3]) {
    const again = { pings: count(season, 'pings') - (firstPass[season]?.pings ?? 0), completions: count(season, 'completions') - (firstPass[season]?.completions ?? 0) };
    if (again.pings || again.completions) fail(`season ${season} posted again on the replay: ${again.pings} pings and ${again.completions} completion(s)`);
  }
  if (count(2, 'completions') !== 1 || count(3, 'completions') !== 1) fail(`seasons 2 and 3 posted ${count(2, 'completions')} and ${count(3, 'completions')} completions, not one each`);
  reseed(7, 4, 1);
  const pings4 = count(4, 'pings');
  s = play(s, { matches: 3, onPing }).s;
  if (count(4, 'pings') <= pings4) fail('season 4 stopped posting after the replay (a later season must post as usual)');
  console.log(`   season 1: ${count(1, 'pings')} pings, ${count(1, 'completions')} completions; seasons 2 and 3: ${count(2, 'completions')} and ${count(3, 'completions')} completions; season 4 pings ${count(4, 'pings')}; blocked ${JSON.stringify(ps.readPointsIndex(1, ls)?.blocked)}, credited ${JSON.stringify(ps.readPointsIndex(1, ls)?.credited)}`);
}

/* ---------- 7. the hook's wiring, read as code ---------- */
section = 7;
console.log('\n7. the hook, read as code');
{
  const hook = source('src/hooks/useClubManager.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
  const between = (from, to) => { const i = hook.indexOf(from); if (i < 0) return null; const j = hook.indexOf(to, i + from.length); return hook.slice(i, j < 0 ? undefined : j); };
  if (!/import \{ postsScore as careerPostsScore\b[^}]*\} from '@\/lib\/clubManagerStart'/.test(hook)) fail('the engine\'s postsScore is not imported as careerPostsScore');
  const wrapper = between('function postsScore(s: CareerState): boolean {', '}');
  if (!wrapper || !wrapper.includes('careerPostsScore(s)') || !wrapper.includes('seasonPosts(activeSlot(), s.season)')) fail(`the wrapper does not ask both the engine and the record: ${wrapper}`);
  const credit = between('function creditSeason(s: CareerState): void {', '}');
  if (!credit || !credit.includes('noteSeasonCredited(activeSlot(), s.season)')) fail('creditSeason does not note the season');
  let scored = 0, credited = 0;
  for (const m of hook.matchAll(/if \(postsScore\(([\w.]+)\)\) recordCompletion\('\/club-manager', /g)) {
    scored += 1;
    const after = hook.slice(m.index, m.index + 260);
    if (after.includes(`creditSeason(${m[1]});`)) credited += 1; else fail(`a scored completion on ${m[1]} is not followed by creditSeason(${m[1]})`);
  }
  if (scored < 4) fail(`only ${scored} scored completions found (four expected)`);
  const slotsCleared = [
    ['removeSlot', between('const removeSlot = useCallback(', '}, ['), 'clearSlotPoints(slot)'],
    ['newInSlot', between('const newInSlot = useCallback(', '}, ['), 'clearSlotPoints(slot)'],
    ['confirmClub', between('const confirmClub = useCallback(', 'const confirmCustomClub'), 'clearSlotPoints(activeSlot())'],
    ['confirmCustomClub', between('const confirmCustomClub = useCallback(', '}, ['), 'clearSlotPoints(activeSlot())'],
  ];
  for (const [name, body, call] of slotsCleared) if (!body || !body.includes(call)) fail(`${name} does not call ${call}`);
  console.log(`   ${scored} scored completions, ${credited} credited; slot clears in ${slotsCleared.filter(([, b, c]) => b && b.includes(c)).length} of 4`);
}

/* ---------- 8. a career that never makes a point ---------- */
section = 8;
console.log('\n8. a career that never makes a point writes nothing new');
store.clear();
{
  reseed(8, 1);
  let s = startCareer('Lincoln City');
  ps.clearSlotPoints(1, ls);
  saveCareer(s);
  let pings = 0, refused = 0;
  const onPing = c => { pings += 1; if (!ps.seasonPosts(1, c.season, ls)) refused += 1; };
  s = nextSeason(s, onPing, fin => ps.noteSeasonCredited(1, fin.season, ls));
  saveCareer(s);
  const extra = [...store.keys()].filter(k => /^dukb-cm-points?-/.test(k) || k.startsWith('dukb-save-pending'));
  if (extra.length) fail(`a career with no points wrote ${extra.join(', ')}`);
  if (refused) fail(`${refused} of ${pings} pings were refused on a career with no points`);
  console.log(`   ${pings} pings, ${refused} refused; keys beside the save: ${extra.length ? extra.join(', ') : 'none'}`);
}

/* ---------- the verdict ---------- */
const total = Object.values(failures).reduce((a, b) => a + b, 0);
console.log(`\nfailures by section: ${JSON.stringify(failures)}; board nudges ${nudges}`);
if (sizes.length) console.log(`sizes (characters, career then point): ${sizes.map(x => `${x.club} s${x.season} ${x.plain}/${x.point}`).join('; ')}`);
fs.rmSync(TMP, { recursive: true, force: true });
if (ctl) {
  if (failures[ctl.section] > 0) { console.log(`simCmSavePoints: control ${CONTROL} FIRED, section ${ctl.section} red (${failures[ctl.section]} failure(s))`); process.exit(1); }
  console.log(`simCmSavePoints: control ${CONTROL} DID NOT FIRE, section ${ctl.section} stayed green`);
  process.exit(0);
}
console.log(total ? `simCmSavePoints: FAIL, ${total} failure(s)` : 'simCmSavePoints: OK, all eight sections green');
process.exit(total ? 1 : 0);
