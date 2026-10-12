// Review of Round 1311 (run lens): why a La Liga career's book falls to about 30 in 100 on record in some seasons.
// Replays the age probe's laliga career on its own stream and, at each season's end, asks every rival's roster.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const NOW = Date.parse('2026-10-12T16:00:00Z');
const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r1311-why-'));
const ENTRY = path.join(TMP, 'e.mjs'); const BUNDLE = path.join(TMP, 'b.mjs');
const P = f => JSON.stringify(path.join(ROOT, f).replaceAll('\\', '/'));
fs.writeFileSync(ENTRY, `export * as cm from ${P('src/lib/clubManager.ts')};\nexport * as book from ${P('src/lib/clubManagerLeagueBook.ts')};\n`);
await build({ entryPoints: [ENTRY], bundle: true, platform: 'node', format: 'esm', outfile: BUNDLE, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const { cm, book } = await import(pathToFileURL(BUNDLE).href);
await cm.ensureAllEraRosters?.();
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const LEAGUE = process.env.WHY_LEAGUE ?? 'laliga';
const l = cm.REAL_LEAGUES.find(x => x.id === LEAGUE);
const club = l.clubs[3] ?? l.clubs[0];
const seed = 0xa9 + 3 * 7 + LEAGUE.length;
const realR = Math.random; const realN = Date.now;
Math.random = seeded(seed); Date.now = () => NOW;
try {
  let s = cm.startCareer(club);
  for (let season = 0; season < 6 && !s.sacked; season += 1) {
    for (let g = 0; g < 240 && s.week < s.calendar.length; g += 1) { const r = cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver') break; }
    const b = cm.leagueBookOf(s);
    const rivals = s.leagueClubs.filter(c => c !== s.clubName);
    const rows = rivals.map(c => {
      const roster = cm.oppRosterFor(s, c);
      const xi = cm.leagueBookEleven(s, c);
      const g = b ? book.bookClubGoals(b, c) : null;
      const pos = ['GK', 'DEF', 'MID', 'ATT'].map(L => roster.filter(p => (L === 'GK' ? p.p === 'GK' : cm.groupOf(p.p) === L && p.p !== 'GK')).length).join('/');
      return { c, n: roster.length, xi: Boolean(xi), pos, u: g ? g.u : null, rows: g ? g.rows : null };
    });
    const noXi = rows.filter(r => !r.xi);
    console.log(`season ${season + 1} (${s.season}) yearsOn ${cm.yearsOn(s)} era ${s.eraId ?? 'now'} league ${cm.careerLeagueOf(s).id} clubs ${rivals.length}: no eleven ${noXi.length}; roster sizes ${Math.min(...rows.map(r => r.n))} to ${Math.max(...rows.map(r => r.n))}; u total ${rows.reduce((a, r) => a + (r.u ?? 0), 0)}, rows total ${rows.reduce((a, r) => a + (r.rows ?? 0), 0)}`);
    console.log(`   sample: ${rows.slice(0, 6).map(r => `${r.c} n${r.n} ${r.pos} xi:${r.xi ? 'y' : 'N'} u${r.u}`).join(' | ')}`);
    if (noXi.length) console.log(`   no eleven: ${noXi.slice(0, 6).map(r => `${r.c} n${r.n} ${r.pos}`).join(' | ')}`);
    const fin = cm.finishSeason(s);
    s = cm.startNextSeason(fin.state);
  }
} finally { Math.random = realR; Date.now = realN; }
console.log('why: done');
