/* Reviewer cm, Release AV: is the match stream byte equal with the league book kept?
 * usage: node .rc/x/cmStreamProbe.mjs <base root> [careersCap]
 * Plays one career in every league of every era on the head (cwd) and on the base, on one seeded stream each
 * (a generator of this file's own), and compares AFTER EVERY CALL: the whole save but leagueBook, the report,
 * the live block, the kind and how many draws the stream gave. Half the careers stop at half time and resume.
 * Also on the head: the first law against the table at every season end, and the bytes the book adds. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const HEAD = process.cwd();
const BASE = path.resolve(process.argv[2] || '');
const CAP = Number(process.argv[3] || 999);
if (!fs.existsSync(path.join(BASE, 'src/lib/clubManager.ts'))) { console.error('no base'); process.exit(2); }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-cm-stream-'));
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };

async function engine(label, root) {
  const entry = path.join(TMP, `${label}-entry.mjs`);
  const out = path.join(TMP, `${label}.bundle.mjs`);
  const P = f => JSON.stringify(path.join(root, f).replaceAll('\\', '/'));
  fs.writeFileSync(entry, `export * as cm from ${P('src/lib/clubManager.ts')};\nexport * as eras from ${P('src/lib/clubManagerEras.ts')};\nexport * as fx from ${P('src/lib/clubManagerFixtures.ts')};\n`);
  await build({ entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', absWorkingDir: root, alias: { '@': path.join(root, 'src') }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
  const mod = await import(pathToFileURL(out).href);
  await mod.cm.ensureAllEraRosters();
  for (const e of mod.fx.REAL_LEAGUE_FIXTURES) await mod.fx.ensureRealLeagueFixtures(e.key);
  return mod;
}

/* sfc32, not the generator the round's harness uses */
function stream(seed) {
  let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = seed >>> 0, n = 0;
  const next = () => { n += 1; a |= 0; b |= 0; c |= 0; d |= 0; const t = (((a + b) | 0) + d) | 0; d = (d + 1) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); c = (c + t) | 0; return (t >>> 0) / 4294967296; };
  for (let i = 0; i < 15; i += 1) next();
  n = 0;
  next.calls = () => n;
  return next;
}
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v ?? null)).digest('hex').slice(0, 16);
const noBook = s => JSON.stringify(s, (k, v) => (k === 'leagueBook' ? undefined : v));

function play(mod, club, era, seed, live, extra) {
  const { cm } = mod;
  const draw = stream(seed);
  const R = Math.random, N = Date.now;
  Math.random = draw; Date.now = () => 1791302400000;
  const faces = []; const info = { law: 0, lawBad: [], bookBytes: [], saveBytes: [], hadBook: 0, entries: 0, matches: 0, halts: 0 };
  const face = (tag, s, r) => faces.push(`${tag}|${r?.kind ?? ''}|${sha(noBook(s))}|${sha(r?.report)}|${sha(r?.live)}|${draw.calls()}`);
  try {
    let s = cm.startCareer(club, era);
    if (s.realLeagueFixtures) info.keyed = 1;
    face('start', s, null);
    for (let season = 0; season < 2; season += 1) {
      let guard = 0; const stopAt = season === 0 ? s.calendar.length : Math.min(s.calendar.length, extra);
      while (s.week < stopAt && guard++ < 260) {
        let r = cm.playNextEntry(s, live ? undefined : { skipHalftime: true });
        if (r.kind === 'halftime') { info.halts += 1; face(`s${season}h`, r.state, r); r = cm.resumeMatch(r.state); }
        face(`s${season}e`, r.state, r); info.entries += 1; if (r.kind === 'match') info.matches += 1;
        s = r.state;
        if (r.kind === 'seasonOver') break;
      }
      if (season === 1) break;
      if (cm.leagueBookOf) {
        const book = cm.leagueBookOf(s);
        if (book) {
          info.hadBook += 1; info.bookBytes.push(JSON.stringify(s.leagueBook).length); info.saveBytes.push(JSON.stringify(s).length);
          for (const row of s.table) {
            if (row.club === s.clubName) continue;
            const e = book.c[row.club]; const rows = e ? Object.values(e.m).reduce((x, m) => x + m[0], 0) + e.og + e.u : 0;
            const gf = row.gf ?? row.f ?? row.goalsFor;
            info.law += 1; if (rows !== gf) info.lawBad.push(`${club}/${era}: ${row.club} book ${rows} table ${gf}`);
          }
        }
      }
      const fin = cm.finishSeason(s);
      faces.push(`fin|${sha(fin.summary)}|${sha(noBook(fin.state))}|${draw.calls()}`);
      s = cm.startNextSeason(fin.state);
      face('next', s, null);
    }
  } finally { Math.random = R; Date.now = N; }
  return { faces, info };
}

const head = await engine('head', HEAD);
const base = await engine('base', BASE);
const fleet = [];
for (const era of head.eras.CM_ERAS.map(e => e.id)) {
  head.cm.eraLeaguesFor(era).forEach((lg, i) => { if (lg.clubs.length) fleet.push([lg.clubs[(i * 7 + 3) % lg.clubs.length], era, lg.id, lg.clubs.length]); });
}
head.cm.REAL_LEAGUES.forEach((lg, i) => { if (lg.clubs.length) { fleet.push([lg.clubs[(i * 5 + 1) % lg.clubs.length], 'now', lg.id, lg.clubs.length]); fleet.push([lg.clubs[(i * 11 + 8) % lg.clubs.length], 'now', lg.id, lg.clubs.length]); } });
const cut = fleet.slice(0, CAP);
let same = 0, total = 0, bad = 0; const agg = { law: 0, lawBad: [], bookBytes: [], saveBytes: [], hadBook: 0, entries: 0, matches: 0, halts: 0 }; const threw = []; const bothThrew = [];
cut.forEach(([club, era, lg, n], i) => {
  const seed = (0xA5 + i * 2654435761) >>> 0; const live = i % 2 === 1;
  let h, b, he = '', be = '';
  try { h = play(head, club, era, seed, live, 8); } catch (e) { he = String(e).slice(0, 160); }
  try { b = play(base, club, era, seed, live, 8); } catch (e) { be = String(e).slice(0, 160); }
  if (he || be) { if (he === be) { bothThrew.push(`${club}/${era}: ${he}`); } else threw.push(`${club}/${era}: head [${he}] base [${be}]`); return; }
  const len = Math.max(h.faces.length, b.faces.length); let first = -1;
  for (let k = 0; k < len; k += 1) { total += 1; if (h.faces[k] === b.faces[k]) same += 1; else if (first < 0) first = k; }
  if (first >= 0) { bad += 1; console.log(`DIFF ${club} (${lg}, ${era}, ${live ? 'live' : 'quick'}) first at face ${first} of ${len}:\n   head ${h.faces[first]}\n   base ${b.faces[first]}`); }
  agg.keyed = (agg.keyed ?? 0) + (h.info.keyed ?? 0);
  for (const k of ['law', 'hadBook', 'entries', 'matches', 'halts']) agg[k] += h.info[k];
  agg.lawBad.push(...h.info.lawBad); agg.bookBytes.push(...h.info.bookBytes); agg.saveBytes.push(...h.info.saveBytes);
});
const srt = a => [...a].sort((x, y) => x - y); const q = (a, p) => (a.length ? srt(a)[Math.min(a.length - 1, Math.floor(a.length * p))] : 'n/a');
console.log(`fleet: ${cut.length} careers of ${fleet.length} (one a league of every era), ${agg.entries} entries, ${agg.matches} match entries, ${agg.halts} half time stops, ${agg.keyed ?? 0} careers on a real fixture list`);
console.log(`book at season one's end on the head: ${agg.hadBook} careers; bytes min ${q(agg.bookBytes, 0)} median ${q(agg.bookBytes, 0.5)} max ${q(agg.bookBytes, 0.999)}; whole save (unsaved state JSON) median ${q(agg.saveBytes, 0.5)} max ${q(agg.saveBytes, 0.999)}`);
console.log(`first law at season end: ${agg.law} rival clubs checked, ${agg.lawBad.length} bad${agg.lawBad.length ? ': ' + agg.lawBad.slice(0, 6).join('; ') : ''}`);
if (threw.length) console.log(`THREW ${threw.length}: ${threw.slice(0, 8).join(' || ')}`);
if (bothThrew.length) console.log(`both engines threw the same way on ${bothThrew.length} (not judged): ${bothThrew.slice(0, 6).join(' || ')}`);
const ok = bad === 0 && threw.length === 0 && agg.lawBad.length === 0 && total > 0;
console.log(`cmStreamProbe: ${ok ? 'GREEN' : 'RED'}. ${same} of ${total} faces equal to the base over ${cut.length} careers, ${bad} careers differ, ${threw.length} threw, ${agg.lawBad.length} law failures.`);
process.exit(ok ? 0 : 1);
