// Review of Round 1311 (run lens): (a) the walk's 'mid' save read null by leagueBoardsOf in node while the page drew
// its boards: reproduce and say why; (b) how the share on record moves over a long career, season by season.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const NOW = Date.parse('2026-10-12T16:00:00Z');
const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r1311-age-'));
const ENTRY = path.join(TMP, 'e.mjs'); const BUNDLE = path.join(TMP, 'b.mjs');
const P = f => JSON.stringify(path.join(ROOT, f).replaceAll('\\', '/'));
fs.writeFileSync(ENTRY, `export * as cm from ${P('src/lib/clubManager.ts')};\nexport * as book from ${P('src/lib/clubManagerLeagueBook.ts')};\nexport * as boards from ${P('src/lib/clubManagerLeagueBoards.ts')};\n`);
await build({ entryPoints: [ENTRY], bundle: true, platform: 'node', format: 'esm', outfile: BUNDLE, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const { cm, book, boards } = await import(pathToFileURL(BUNDLE).href);
await cm.ensureAllEraRosters?.();
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function onStream(seed, fn) { const r = Math.random; const n = Date.now; Math.random = seeded(seed); Date.now = () => NOW; try { return fn(); } finally { Math.random = r; Date.now = n; } }
const clubOf = (id, i) => { const l = cm.REAL_LEAGUES.find(x => x.id === id); return l.clubs[i] ?? l.clubs[0]; };
function play(s, n) { for (let k = 0; k < n && s.week < s.calendar.length; k += 1) { const r = cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver') break; } return s; }
function why(s) {
  const lid = cm.careerLeagueOf(s).id;
  const stamp = cm.bookStampOf ? cm.bookStampOf(s, lid) : '(bookStampOf not exported)';
  const b = cm.leagueBookOf(s);
  const clubs = s.leagueClubs.filter(c => c !== s.clubName).map(c => ({ club: c, gf: s.table.find(r => r.club === c)?.gf ?? 0 }));
  const off = b ? clubs.filter(c => { const g = book.bookClubGoals(b, c.club); return g.rows + g.og + g.u !== c.gf; }).map(c => { const g = book.bookClubGoals(b, c.club); return `${c.club} book ${g.rows}+${g.og}+${g.u} table ${c.gf}`; }) : [];
  return `book in save ${Boolean(s.leagueBook)} stamp(save) ${JSON.stringify(s.leagueBook?.s ?? s.leagueBook?.stamp ?? null).slice(0, 60)} stamp(now) ${String(stamp).slice(0, 60)}; read ${Boolean(b)}; r0 ${b?.r0}; off ${off.length}: ${off.slice(0, 3).join('; ')}; next entry ${s.calendar[s.week]?.type} week ${s.week}`;
}
/* (a) the walk's mid save, built exactly as the walk built it */
const mid = onStream(0xa1, () => play(cm.startCareer(clubOf('premier', 2)), 22));
console.log(`(a) ${mid.clubName} live: boards ${cm.leagueBoardsOf(mid) ? 'yes' : 'NULL'}; ${why(mid)}`);
const midJ = JSON.parse(JSON.stringify(mid));
console.log(`(a) after a JSON round trip: boards ${cm.leagueBoardsOf(midJ) ? 'yes' : 'NULL'}`);
/* entry by entry, the first 40 of that career: where is the door null? */
const nulls = [];
onStream(0xa1, () => { let s = cm.startCareer(clubOf('premier', 2)); for (let k = 0; k < 40; k += 1) { s = play(s, 1); if (!cm.leagueBoardsOf(s)) nulls.push(`${k + 1}:${s.calendar[s.week - 1]?.type}`); } });
console.log(`(a) entries after which the door is null (of the first 40): ${nulls.join(' ') || 'none'}`);
/* (b) eight seasons, five big leagues and the Championship: the closing share each season */
const SEASONS = Number(process.env.AGE_SEASONS ?? 8);
for (const [id, i] of [['premier', 3], ['laliga', 3], ['bundesliga', 3], ['seriea', 3], ['ligue1', 3], ['championship', 3]]) {
  const club = clubOf(id, i);
  const row = [];
  try {
    onStream(0xa9 + i * 7 + id.length, () => {
      let s = cm.startCareer(club);
      for (let season = 0; season < SEASONS && !s.sacked; season += 1) {
        s = play(s, 240);
        const lb = cm.leagueBoardsOf(s);
        const st = cm.bookAwardsState(s, lb);
        const thinClubs = lb ? lb.input.clubs.filter(c => { const g = book.bookClubGoals(lb.input.book, c.club); return g.u > 0; }).length : -1;
        const fin = cm.finishSeason(s);
        row.push(`S${season + 1}:${lb ? lb.share : 'null'}${st.by === 'book' ? 'D' : st.by[0]}${fin.summary.awards ? 'a' : ''}${fin.summary.awards?.xi ? 'x' : ''}(u${thinClubs})`);
        s = cm.startNextSeason(fin.state);
      }
      if (s.sacked) row.push('sacked');
    });
  } catch (e) { row.push(`threw ${String(e).slice(0, 120)}`); }
  console.log(`(b) ${id} ${club}: ${row.join(' ')}`);
}
console.log('age: done');
