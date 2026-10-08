/* rv-probe2.mjs (review scratch, never committed). The Hall's standout marks against the careers the branch's
   engine plays: what share of careers reach each family's `from` and `to`, on the real totals and on the total
   the legacy read is handed. No network. Usage: node .tmp-fx/rv-probe2.mjs [careers] [seed] */
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const CAREERS = Number(process.argv[2] || 3000);
const SEED = Number(process.argv[3] || 3);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const out = path.join(process.env.RV_TMP || os.tmpdir(), `rv-probe2-${process.pid}.mjs`);
await build({
  stdin: { contents: "export * as nba from './src/lib/nbaMyCareer.ts';\n", resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', logLevel: 'error', outfile: out, alias: { '@': path.join(ROOT, 'src') },
});
const { nba } = await import(pathToFileURL(out).href);
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const rnd = mulberry32(SEED); Math.random = rnd;
const C = [];
for (let i = 0; i < CAREERS; i++) {
  const pos = POS[i % 5]; const arch = nba.NBA_ARCHETYPES[pos][i % 3];
  const c = nba.startNbaCareer(`Sim ${i}`, pos, arch, rnd, null, i % 4 === 3 ? 'y2004' : undefined);
  let tq = nba.nbaRollTeamQuality(null, rnd); nba.nbaAssignRole(c, tq, rnd);
  let guard = 0; let done = false;
  while (!done && guard++ < 30) {
    if ((c.suspendedSeasons ?? 0) > 0) { c.suspendedSeasons -= 1; c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, ppg: 0, rpg: 0, apg: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 }); }
    else { nba.nbaCampBattle(c, tq, rnd); nba.simNbaSeason(c, tq, rnd); }
    nba.nbaProgress(c, rnd);
    const ev = nba.drawNbaEvent(c, rnd); if (ev) { const pick = ev.options[Math.floor(rnd() * ev.options.length)]; pick.apply(c, rnd); }
    tq = nba.nbaRollTeamQuality(tq, rnd);
    if (nba.nbaShouldRetire(c)) done = true;
  }
  c.retired = true; c.hallCal = 2;
  const leg = nba.nbaLegacyOf(c);
  C.push({ pos, tot: nba.nbaCareerTotals(c), standout: leg.standout ?? null });
}
const W = nba.NBA_LEGACY_WEIGHTS[2];
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const pct = (n, d) => `${((100 * n) / d).toFixed(1)}%`;
console.log(`careers ${CAREERS}, seed ${SEED}; the legacy scale constant is ${nba.NBA_LEGACY_NEW_LINE_SCALE}`);
for (const pos of POS) {
  const mine = C.filter(c => c.pos === pos);
  for (const s of W.positions[pos].standout ?? []) {
    const v = mine.map(c => c.tot[s.stat]);
    const paid = mine.filter(c => c.standout?.stat === s.stat).length;
    console.log(`${pos} ${s.label}: mark from ${s.from} to ${s.to}; careers' real totals p90 ${q(v, 0.9)}, p99 ${q(v, 0.99)}, best ${Math.max(...v)}; at or over from ${pct(v.filter(x => x > s.from).length, v.length)}, at or over to ${pct(v.filter(x => x >= s.to).length, v.length)}; the standout the ballot paid ${pct(paid, mine.length)} of ${mine.length}`);
  }
}
