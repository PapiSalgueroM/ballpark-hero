/* Round 1226 proof, per SEASON: the seasons the round changes by rule are the
   seasons that move, and no other.
   usage: node probe.mjs <base checkout> <head checkout> [careers per cell]
   A career is driven by the HEAD engine. Before every season the save and the
   random stream are copied, and that one season is played from the same copy
   by the BASE engine and by the HEAD engine. "moved": the two disagree in the
   season line, the notes, the save after it or the place in the stream.
   "by rule": this file's own reading of what the round changes (typed below). */
import path from 'node:path';
import os from 'node:os';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';

const [BASE, HEAD] = [path.resolve(process.argv[2]), path.resolve(process.argv[3])];
const PER = Number(process.argv[4] || 16);
async function load(dir, tag) {
  const out = path.join(os.tmpdir(), `probe1226-${tag}-${process.pid}.mjs`);
  await build({
    stdin: { contents: ["export * as mlb from './src/lib/mlbMyCareer.ts';", "export * as nhl from './src/lib/nhlMyCareer.ts';"].join('\n'), resolveDir: dir, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(dir, 'src') }, nodePaths: [path.join(HEAD, 'node_modules')],
  });
  return import(pathToFileURL(out).href);
}
const B = await load(BASE, 'base'); const H = await load(HEAD, 'head');

const stream = seed => { const r = () => { r.s = (r.s + 0x6D2B79F5) | 0; let t = Math.imul(r.s ^ (r.s >>> 15), 1 | r.s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; r.s = seed; return r; };
const copy = r => stream(r.s);

/* THIS FILE'S OWN TABLE of what the round binds. */
const NHL_2019 = { BOS: 70, TBL: 70, TOR: 70, FLA: 69, BUF: 69, OTT: 71, DET: 71, MTL: 71, WSH: 69, PHI: 69, PIT: 69, CAR: 68, NYI: 68, CBJ: 70, NYR: 70, NJD: 69, STL: 71, COL: 70, DAL: 69, NSH: 69, WPG: 71, MIN: 69, CHI: 70, VGK: 71, EDM: 71, VAN: 69, CGY: 70, ARI: 70, LAK: 70, SJS: 70, ANA: 71 };
const nhlLen = (y, t) => (y >= 2026 ? 84 : y === 2012 ? 48 : y === 2020 ? 56 : y === 2019 ? (NHL_2019[t] ?? 82) : 82);
const MLB_OFF = { 2004: { 161: 'PIT MIL TBD TOR' }, 2005: { 163: 'CIN HOU' }, 2006: { 161: 'STL SFG' }, 2007: { 163: 'COL SDP' }, 2008: { 161: 'FLA CHC HOU BAL OAK', 163: 'CHW MIN' }, 2009: { 161: 'CHC PIT', 163: 'MIN DET' }, 2011: { 161: 'LAD' }, 2013: { 163: 'TEX' }, 2015: { 161: 'CLV DET' }, 2016: { 161: 'ATL CLV DET' }, 2018: { 161: 'PIT', 163: 'MIL CHC LAD COL' }, 2019: { 161: 'CHW DET' }, 2020: { 58: 'STL DET' }, 2021: { 161: 'ATL COL' }, 2024: { 161: 'HOU' }, 2026: { 161: 'BAL NYY' } };
const mlbLen = (y, t) => { for (const [g, ids] of Object.entries(MLB_OFF[y] ?? {})) if (ids.split(' ').includes(t)) return Number(g); return y === 2020 ? 60 : 162; };
const MLB_LADDER = ['Lost the Wild Card series', 'Lost the Division Series', 'Lost the Championship Series', 'Lost the World Series', 'WON THE WORLD SERIES'];
const PITCH = ['SP', 'RP'];
const work = (sport, pos, len) => ((sport === 'nhl' ? pos === 'G' : PITCH.includes(pos)) ? Math.min(len, sport === 'nhl' ? 82 : 162) : len);

function byRule(sport, pre, baseLine) {
  const own = sport === 'nhl' ? 82 : 162; const gate = sport === 'nhl' ? 35 : 70; const need = sport === 'nhl' ? 70 : 130;
  const len = sport === 'nhl' ? nhlLen(pre.year, pre.team) : mlbLen(pre.year, pre.team);
  if (len !== own) return 'length';
  if (sport === 'mlb' && baseLine.poGames !== undefined) {
    if (!PITCH.includes(pre.pos)) return 'hitter in October';
    const y = pre.year; const stage = MLB_LADDER.indexOf(baseLine.teamResult);
    if (y >= 2004 && y <= 2021 && y !== 2020) return 'October before 2022';
    if (y >= 2022 && ((stage === 0 && baseLine.poGames > 3) || (stage === 1 && baseLine.poGames > 8))) return 'October count';
  }
  const prev = pre.seasons[pre.seasons.length - 1];
  if (prev && baseLine.games >= need) {
    const w = work(sport, pre.pos, prev.slate ?? own);
    if ((prev.games <= gate) !== (prev.games * own / w <= gate)) return 'comeback gate';
  }
  return null;
}

const CELLS = [];
for (const sport of ['mlb', 'nhl']) for (const era of sport === 'mlb' ? [undefined, 'y2004'] : [undefined, 'y2006']) {
  const E = H[sport]; const positions = Object.keys(sport === 'mlb' ? E.MLB_ARCHETYPES : E.NHL_ARCHETYPES);
  for (const pos of positions) CELLS.push({ sport, era, pos });
}
const FORCE = { 'mlb|y2004': ['PIT', 'CIN', 'STL', 'COL', 'CHC', 'DET', 'HOU', 'MIN', 'LAD', 'TEX', 'CLV', 'ATL', 'MON', 'FLA'], 'mlb|now': ['BAL', 'NYY'], 'nhl|y2006': ['BOS', 'CAR', 'ATL', 'PHX', 'OTT'], 'nhl|now': [] };
const tally = new Map(); const bad = []; const causes = new Map();
const bump = (k, f) => { const t = tally.get(k) ?? { seasons: 0, rule: 0, moved: 0, ruleOnly: 0, movedOnly: 0 }; f(t); tally.set(k, t); };
for (const { sport, era, pos } of CELLS) {
  const E = H[sport]; const EB = B[sport]; const U = sport === 'mlb' ? 'Mlb' : 'Nhl'; const u = sport;
  const arch = (sport === 'mlb' ? E.MLB_ARCHETYPES : E.NHL_ARCHETYPES)[pos];
  for (let i = 0; i < PER; i++) {
    const rng = stream(1226 * 7 + i * 131 + pos.length * 17 + (era ? 5 : 0) + (sport === 'mlb' ? 1 : 2) * 1000003);
    const c = E[`start${U}Career`](`Probe ${i}`, pos, arch[i % arch.length], rng, null, era);
    const forced = FORCE[`${sport}|${era ? era : 'now'}`]; if (forced.length && i % 2 === 0) c.team = forced[(i / 2) % forced.length];
    let tq = E[`${u}RollTeamQuality`](null, rng);
    for (let s = 0; s < 26 && !c.retired; s++) {
      if (E[`${u}AssignRole`]) E[`${u}AssignRole`](c, tq, rng);
      const snap = JSON.stringify(c); const pre = JSON.parse(snap);
      const cb = JSON.parse(snap); const rb = copy(rng); const ob = EB[`sim${U}Season`](cb, tq, rb);
      const ch = JSON.parse(snap); const rh = copy(rng); const oh = E[`sim${U}Season`](ch, tq, rh);
      const moved = JSON.stringify([ob.line, ob.notes, cb]) !== JSON.stringify([oh.line, oh.notes, ch]) || rb.s !== rh.s;
      const rule = byRule(sport, pre, ob.line);
      const key = `${sport} ${era ?? 'now'}`;
      bump(key, t => { t.seasons++; if (rule) t.rule++; if (moved) t.moved++; if (rule && !moved) t.ruleOnly++; if (!rule && moved) t.movedOnly++; });
      if (rule) causes.set(`${key}: ${rule}`, (causes.get(`${key}: ${rule}`) ?? 0) + 1);
      if (!!rule !== moved && bad.length < 12) bad.push(`${key} ${pos} ${pre.year} ${pre.team}: rule=${rule} moved=${moved} base=${JSON.stringify(ob.line)} head=${JSON.stringify(oh.line)}`);
      E[`sim${U}Season`](c, tq, rng); E[`${u}Progress`](c, rng);
      tq = E[`${u}RollTeamQuality`](tq, rng);
      if (E[`${u}ShouldRetire`](c)) c.retired = true;
    }
  }
}
const lines = ['cell | seasons | changed by rule | moved | by rule and not moved | moved and not by rule'];
let off = 0;
for (const [k, t] of tally) { lines.push(`${k} | ${t.seasons} | ${t.rule} | ${t.moved} | ${t.ruleOnly} | ${t.movedOnly}`); off += t.ruleOnly + t.movedOnly; }
lines.push('', 'causes (seasons changed by rule, by the first cause that applies):', ...[...causes].sort().map(([k, n]) => `  ${k}: ${n}`));
if (bad.length) lines.push('', 'DISAGREEMENTS:', ...bad);
console.log(lines.join('\n'));
if (process.env.RC_OUT) writeFileSync(path.join(process.env.RC_OUT, 'probe-1226.txt'), lines.join('\n') + '\n');
console.log(off === 0 ? 'probe1226: the seasons changed by rule are exactly the seasons that moved.' : `probe1226: RED, ${off} seasons disagree.`);
process.exit(off === 0 ? 0 : 1);
