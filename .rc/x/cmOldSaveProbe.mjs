/* Reviewer cm, Release AV: a save made by origin/main's code, loaded and played by the head.
 * usage: node .rc/x/cmOldSaveProbe.mjs <base root>
 * MAKE: main's engine starts a career, plays k entries (some stopped at half time) and saves it with its own
 * saveCareer. PLAY: a fresh copy of main's engine and a fresh copy of the head's each load those bytes with
 * loadCareer and play the season out, the summer, and the whole next season on one seeded stream.
 * Held: every face (the whole save, the report, the draws) equal up to the season's end, and equal but the book
 * after it; the head never gives the old season a book; the next season opens an EMPTY book whose first law
 * holds against the table after every entry; the saved bytes with and without the book. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const HEAD = process.cwd();
const BASE = path.resolve(process.argv[2] || '');
if (!fs.existsSync(path.join(BASE, 'src/lib/clubManager.ts'))) { console.error('no base'); process.exit(2); }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-cm-old-'));
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };

async function engine(label, root) {
  const entry = path.join(TMP, `${label}-entry.mjs`);
  const out = path.join(TMP, `${label}.bundle.mjs`);
  const P = f => JSON.stringify(path.join(root, f).replaceAll('\\', '/'));
  fs.writeFileSync(entry, `export * as cm from ${P('src/lib/clubManager.ts')};\nexport * as fx from ${P('src/lib/clubManagerFixtures.ts')};\n`);
  await build({ entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', absWorkingDir: root, alias: { '@': path.join(root, 'src') }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
  let n = 0;
  return async () => { const mod = await import(`${pathToFileURL(out).href}?copy=${++n}`); await mod.cm.ensureAllEraRosters(); for (const e of mod.fx.REAL_LEAGUE_FIXTURES) await mod.fx.ensureRealLeagueFixtures(e.key); return mod; };
}
function stream(seed) {
  let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = seed >>> 0, n = 0;
  const next = () => { n += 1; a |= 0; b |= 0; c |= 0; d |= 0; const t = (((a + b) | 0) + d) | 0; d = (d + 1) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); c = (c + t) | 0; return (t >>> 0) / 4294967296; };
  for (let i = 0; i < 15; i += 1) next();
  n = 0; next.calls = () => n; return next;
}
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v ?? null)).digest('hex').slice(0, 16);
const noBook = s => JSON.stringify(s, (k, v) => (k === 'leagueBook' ? undefined : v));
const onStream = (seed, fn) => { const draw = stream(seed); const R = Math.random, N = Date.now; Math.random = draw; Date.now = () => 1791302400000; try { return fn(draw); } finally { Math.random = R; Date.now = N; } };

/* [club, era, entries played on main before the save, stop at half time of the next match] */
const CASES = [
  ['Liverpool', 'now', 0, false], ['Liverpool', 'now', 9, false], ['Liverpool', 'now', 23, true],
  ['Sevilla', 'now', 5, true], ['Borussia Dortmund', 'now', 14, false], ['Juventus', 'now', 30, false],
  ['PSG', 'now', 2, false], ['Celtic', 'now', 18, true], ['New England Revolution', 'now', 11, false],
  ['Leeds United', 'now', 26, false], ['Barcelona', 'era2010', 12, true], ['Arsenal', 'era2005', 20, false],
];

const baseFresh = await engine('base', BASE);
const headFresh = await engine('head', HEAD);
const problems = []; const fail = m => { if (problems.length < 20) problems.push(m); else problems.count = (problems.count ?? 20) + 1; };
let made = 0, facesSame = 0, facesAll = 0, lawChecks = 0, opened = 0, keyedSaves = 0, halfSaves = 0; const sizes = [];

function playOn(mod, raw, seed, isHead, label, atHalf) {
  return onStream(seed, draw => {
    store.clear(); store.set(mod.cm.SAVE_KEY, raw);
    let s = mod.cm.loadCareer();
    if (!s) return null;
    const A = [`load|${sha(JSON.stringify(s))}`]; const B = []; const out = { A, B, bytes: null };
    if (isHead && 'leagueBook' in s) fail(`${label}: the head's loadCareer gave an old save a book`);
    let guard = 0;
    while (s.week < s.calendar.length && guard++ < 260) {
      const r = atHalf && guard === 1 ? mod.cm.resumeMatch(s) : mod.cm.playNextEntry(s, { skipHalftime: true });
      s = r.state; A.push(`${r.kind}|${sha(JSON.stringify(s))}|${sha(r.report)}|${draw.calls()}`);
      if (isHead && 'leagueBook' in s) { fail(`${label}: the old season gained a book at week ${s.week}`); break; }
      if (r.kind === 'seasonOver') break;
    }
    const fin = mod.cm.finishSeason(s);
    A.push(`fin|${sha(JSON.stringify(fin.state))}|${sha(fin.summary)}|${draw.calls()}`);
    s = mod.cm.startNextSeason(fin.state);
    B.push(`next|${sha(noBook(s))}|${draw.calls()}`);
    if (isHead) {
      const book = mod.cm.leagueBookOf(s);
      if (!book) fail(`${label}: the next season opened no readable book`);
      else { opened += 1; if (Object.keys(book.c).length || book.my.length) fail(`${label}: the new season's book is not empty at its opening`); }
    }
    guard = 0;
    while (s.week < s.calendar.length && guard++ < 260) {
      const r = mod.cm.playNextEntry(s, { skipHalftime: true });
      s = r.state; B.push(`${r.kind}|${sha(noBook(s))}|${sha(r.report)}|${draw.calls()}`);
      if (isHead) {
        const book = mod.cm.leagueBookOf(s);
        if (!book) { fail(`${label}: no readable book at week ${s.week} of the next season`); break; }
        for (const row of s.table) {
          if (row.club === s.clubName) continue;
          const e = book.c[row.club]; const got = e ? Object.values(e.m).reduce((x, m) => x + m[0], 0) + e.og + e.u : 0;
          lawChecks += 1; if (got !== row.gf) fail(`${label}: week ${s.week} ${row.club} book ${got} table ${row.gf}`);
        }
      }
      if (r.kind === 'seasonOver') break;
    }
    store.clear(); mod.cm.saveCareer(s); const saved = store.get(mod.cm.SAVE_KEY) ?? '';
    out.bytes = { saved: saved.length, book: s.leagueBook ? JSON.stringify(s.leagueBook).length : 0, savedHasBook: saved.includes('"leagueBook"') };
    return out;
  });
}

for (const [i, [club, era, k, half]] of CASES.entries()) {
  const label = `${club}/${era}@${k}${half ? '+half' : ''}`;
  const maker = await baseFresh();
  let raw = null; let atHalf = false;
  try {
    raw = onStream(0xC0FFEE + i * 97, () => {
      let s = maker.cm.startCareer(club, era);
      for (let n = 0; n < k && s.week < s.calendar.length - 2; n += 1) s = maker.cm.playNextEntry(s, { skipHalftime: true }).state;
      if (half) { let tries = 0; while (tries++ < 6) { const r = maker.cm.playNextEntry(s); s = r.state; if (r.kind === 'halftime') { atHalf = true; break; } } }
      store.clear(); maker.cm.saveCareer(s); return store.get(maker.cm.SAVE_KEY);
    });
  } catch (e) { fail(`${label}: main could not make the save: ${String(e).slice(0, 140)}`); continue; }
  if (!raw) { fail(`${label}: main wrote no save`); continue; }
  made += 1; const parsed = JSON.parse(raw);
  if (parsed.leagueBook !== undefined) fail(`${label}: main's save holds a book`);
  if (parsed.realLeagueFixtures) keyedSaves += 1; if (atHalf) halfSaves += 1;
  if (half && !atHalf) fail(`${label}: the make never reached a half time`);
  const seed = 0xBEEF + i * 7919;
  let b, h;
  try { b = playOn(await baseFresh(), raw, seed, false, label, atHalf); } catch (e) { fail(`${label}: main threw playing on: ${String(e).slice(0, 140)}`); continue; }
  try { h = playOn(await headFresh(), raw, seed, true, label, atHalf); } catch (e) { fail(`${label}: THE HEAD THREW on main's save: ${String(e).slice(0, 200)}`); continue; }
  if (!b || !h) { fail(`${label}: loadCareer gave null (main ${!!b}, head ${!!h})`); continue; }
  for (const part of ['A', 'B']) {
    const len = Math.max(b[part].length, h[part].length); let first = -1;
    for (let j = 0; j < len; j += 1) { facesAll += 1; if (b[part][j] === h[part][j]) facesSame += 1; else if (first < 0) first = j; }
    if (first >= 0) fail(`${label}: part ${part === 'A' ? 'the old season (whole save)' : 'the next season (save but the book)'} differs first at ${first} of ${len}: head ${h[part][first]} main ${b[part][first]}`);
  }
  sizes.push({ label, main: b.bytes.saved, head: h.bytes.saved, book: h.bytes.book, has: h.bytes.savedHasBook });
  console.log(`  ${label.padEnd(34)} saved bytes at the next season's end: main ${b.bytes.saved}, head ${h.bytes.saved} (+${h.bytes.saved - b.bytes.saved}), the book alone ${h.bytes.book}`);
}
const adds = sizes.map(s => s.head - s.main).sort((x, y) => x - y);
console.log(`saves made by main: ${made} of ${CASES.length} (${keyedSaves} on a real fixture list, ${halfSaves} saved at half time); next seasons that opened an empty book: ${opened}; first law checks ${lawChecks}`);
console.log(`bytes a whole season of the book adds to the saved file: min ${adds[0]}, median ${adds[Math.floor(adds.length / 2)]}, max ${adds[adds.length - 1]}; largest saved file on the head ${Math.max(...sizes.map(s => s.head))}`);
if (problems.length) console.log(problems.map(p => `  FAIL ${p}`).join('\n'));
const ok = problems.length === 0 && made === CASES.length;
console.log(`cmOldSaveProbe: ${ok ? 'GREEN' : 'RED'}. ${made} saves made by main, ${facesSame} of ${facesAll} faces equal, ${problems.count ?? problems.length} problem(s).`);
process.exit(ok ? 0 : 1);
