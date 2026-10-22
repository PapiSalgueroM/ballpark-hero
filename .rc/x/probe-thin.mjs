/* Round 1520 fix probe (never committed): how thin is each place's real count? Run from the repo root. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-thin-'));
const entry = path.join(work, 'entry.ts');
const p = f => JSON.stringify(path.join(ROOT, f).split(path.sep).join('/'));
fs.writeFileSync(entry, `export * as cm from ${p('src/lib/clubManager.ts')};\nexport * as pn from ${p('src/data/playerNationalities.ts')};\nexport * as eras from ${p('src/lib/clubManagerEras.ts')};\n`);
const out = path.join(work, 'b.cjs');
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
  alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {}, clear() {} };
const m = createRequire(import.meta.url)(out);
await m.cm.ensureAllEraRosters();
const partial = new Set(m.cm.CM_PARTIAL);
const WORLDS = m.cm.CM_ERAS.map(e => e.id);
const FLOOR = Number(process.env.FLOOR || 20);
for (const era of WORLDS) {
  const raw = m.eras.eraRostersRaw(era);
  const leagues = era === 'now' ? m.cm.REAL_LEAGUES : m.cm.eraLeaguesFor(era);
  for (const lg of leagues) {
    const byHome = new Map();
    for (const club of lg.clubs) {
      const pl = m.cm.careerPlace({ clubName: club, eraId: era });
      if (!pl) continue;
      const roster = raw[club] ?? [];
      const key = pl.home;
      const row = byHome.get(key) ?? { clubs: 0, men: 0, known: 0, home: 0, part: 0, whole: 0, wKnown: 0, wHome: 0, sizes: [], low: [] };
      row.clubs += 1; row.men += roster.length; row.sizes.push(roster.length);
      if (era === 'now' && partial.has(club)) row.part += 1;
      const nat = roster.map(b => ({ v: b.v, n: m.pn.nationalityOf(era, b.n) })).filter(x => x.n);
      row.known += nat.length; row.home += nat.filter(x => x.n === key).length;
      const sorted = [...nat].sort((a, b) => a.v - b.v);
      row.low.push(...sorted.slice(0, Math.floor(sorted.length / 2)).map(x => x.n === key));
      if (roster.length >= FLOOR) { row.whole += 1; row.wKnown += nat.length; row.wHome += nat.filter(x => x.n === key).length; }
      byHome.set(key, row);
    }
    for (const [home, r] of byHome) {
      const pc = (a, b) => (b ? (a / b * 100).toFixed(1) : '-').padStart(5);
      const s = [...r.sizes].sort((a, b) => a - b);
      const lowHome = r.low.filter(Boolean).length;
      console.log(`${era.padEnd(7)} ${lg.id.padEnd(15)} ${home.padEnd(14)} clubs ${String(r.clubs).padStart(2)} men ${String(r.men).padStart(4)} size min ${s[0]} med ${s[Math.floor(s.length / 2)]} max ${s[s.length - 1]} partial ${r.part} | known ${String(r.known).padStart(4)} home ${pc(r.home, r.known)}% | low half home ${pc(lowHome, r.low.length)}% | whole(>=${FLOOR}) ${r.whole} known ${r.wKnown} home ${pc(r.wHome, r.wKnown)}%`);
    }
  }
}
for (const club of ['Al-Hilal', 'Al-Ittihad', 'Al-Nassr', 'Celtic', 'Rangers', 'Olympiacos', 'Toronto FC', 'Inter Miami', 'Cardiff City', 'Swansea City', 'Wrexham']) {
  const roster = m.eras.eraRostersRaw('now')[club] ?? [];
  console.log(`${club}: ${roster.length} men: ${roster.map(b => `${b.n.split(' ').slice(-1)[0]}:${m.pn.nationalityOf('now', b.n) ?? '?'}`).join(', ')}`.slice(0, 400));
}
