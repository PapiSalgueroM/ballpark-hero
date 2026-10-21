/* Round 1532 step 1 probe (not committed; a copy lives in dukb-handoff results-g):
   Round 586's policy fixture (scripts/simAllPlayersValue.mjs policyRun, copied
   verbatim apart from the recording) on the base engine. For every watched match
   of both arms it records the opponent's stored offset and the first team edge
   averaged over the match's 90 minutes, so the wins gain under any candidate law
   table can be priced exactly. It also counts the base wins, which must equal the
   harness's own POLICY lines (the proof that this is the same fixture). */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probe586-'));
const lib = name => path.join(ROOT, 'src/lib', `${name}.ts`);
const NOW = 1767225600000;
function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const file = path.join(TEMP, 'engines.mjs');
const imports = [['W', lib('wonderkidFactory')], ['T', lib('stadiumTycoon')], ['R', lib('tycoonRewards')]];
await build({ stdin: { contents: imports.map(([n, e]) => `export * as ${n} from ${JSON.stringify(e.split(path.sep).join('/'))};`).join('\n'), resolveDir: ROOT, loader: 'ts' },
  outfile: file, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const mods = await import(pathToFileURL(file).href);

function openBestPack({ W, R }, academy, ledger) {
  const id = [...W.PACKS].reverse().find(pack => R.canOpen(ledger, pack.id, W.bedFree(academy)))?.id;
  if (!id) return ledger;
  const next = R.openPack(ledger, id, true, (lo, hi, roll) => W.makeProspectInBand({ ...academy, prospects: [...academy.prospects] }, lo, hi, roll), (academy.packsDelivered ?? 0) + 1);
  assert(next?.pending);
  assert(W.deliverPack(academy, next.pending.seq, next.pending.kid, next.pending.tier));
  return { ...next, pending: null };
}
function initialPolicyAcademy(m, seed) {
  const { W, R } = m;
  const a = W.newFactory(NOW, seed);
  let ledger = { ...R.newLedger(seed), earned: 1250 };
  for (let i = 0; i < 5; i += 1) {
    ledger = openBestPack(m, a, ledger);
    const kid = a.prospects[0];
    kid.age = 18; kid.rating = kid.potential;
    assert(W.promote(a, kid.id));
    a.firstTeam[i].age = 27; a.firstTeam[i].ageClock = 0; a.firstTeam[i].id = `sr-original-${i}`;
  }
  return a;
}
function policyRun(m, seed, sellAge) {
  const { W, T } = m;
  const a = initialPolicyAcademy(m, seed);
  const roll = rng(seed);
  let wins = 0;
  const per = [];
  for (let season = 1; season <= 10; season += 1) {
    let s = T.newTycoon(NOW);
    s.levels.squad = 40;
    s.league = T.newLeague(0, 3, season, undefined, 70);
    s.matchNo = 70;
    const matches = T.leagueShape(3).matchdays;
    let off = 0; let edge = 0; let mins = 0;
    while ((s.totalMatches ?? 0) < matches) {
      W.tick(a, 1.4);
      for (const senior of [...(a.firstTeam ?? [])]) if (senior.age >= sellAge) assert(W.sellSenior(a, senior.id) !== null);
      while ((a.firstTeam?.length ?? 0) < W.FIRST_TEAM_SLOTS) {
        const candidate = a.prospects.filter(p => p.age >= 18 && p.age <= 23).sort((x, y) => y.rating - x.rating || y.potential - x.potential || x.id - y.id)[0];
        if (!candidate) break;
        assert(W.promote(a, candidate.id));
      }
      for (const kid of [...a.prospects]) if (kid.age >= 22 || (a.firstTeam.length === 5 && kid.rating >= kid.potential - 0.5)) W.sellProspect(a, kid.id);
      const e = W.squadEdge(a);
      const before = s;
      const result = T.tick(s, 1.4, roll, e);
      s = result.state;
      const played = ((s.totalMatches ?? 0) - (before.totalMatches ?? 0)) * 90 + s.minute - before.minute;
      off += played * T.currentOpponentOffset(before); edge += played * Math.max(0, Math.min(0.4, e)); mins += played;
      const won = result.events.filter(event => event.kind === 'win').length;
      wins += won;
      if (result.events.some(ev => ev.kind === 'win' || ev.kind === 'draw' || ev.kind === 'loss')) {
        per.push([Math.round((off / mins) * 1e5), Math.round((edge / mins) * 1e5) / 1e5, won]);
        off = 0; edge = 0; mins = 0;
      }
    }
  }
  return { wins, per };
}
const out = {};
for (const [label, offset] of [['calibration', 0], ['holdout', 32]]) {
  const rows = [];
  for (let i = 1 + offset; i <= Number(process.env.PROBE_N || 32) + offset; i += 1) rows.push({ seed: i * 101, sell: policyRun(mods, i * 101, 28), hold: policyRun(mods, i * 101, 33) });
  const mean = g => rows.reduce((x, r) => x + g(r), 0) / rows.length;
  out[label] = { sellWins: mean(r => r.sell.wins), holdWins: mean(r => r.hold.wins), rows: rows.map(r => ({ seed: r.seed, sell: r.sell.per, hold: r.hold.per })) };
  const fbar = arm => rows.reduce((x, r) => x + r[arm].per.reduce((y, p) => y + p[1], 0), 0) / rows.reduce((x, r) => x + r[arm].per.length, 0);
  console.log(`PROBE586 ${label}: base sellWins ${out[label].sellWins} holdWins ${out[label].holdWins}; mean f sell ${fbar('sell').toFixed(5)} hold ${fbar('hold').toFixed(5)}; matches per arm ${rows[0].sell.per.length}`);
}
const dest = process.env.RC_OUT ? path.join(process.env.RC_OUT, 'probe586.json') : path.join(TEMP, 'probe586.json');
fs.writeFileSync(dest, JSON.stringify(out));
console.log(`probe586: wrote ${dest}`);
