/* Round 1555 adversarial review (runs lens): an INDEPENDENT brute force of the best and worst five, with dense
 * name sharing across the five dealt teams (the case the five-candidate bound and the shared-name break exist for),
 * over several seeds and both directions. Bundles the lib from the cwd's src (run from the repo root on a runner).
 * Usage: node .rc/x/probe1555.mjs [deals per seed]. Exit 0 green, 1 red. Fixture names only. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';

const ROOT = process.cwd().replace(/\\/g, '/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probe1555-')).replace(/\\/g, '/');
fs.writeFileSync(`${TMP}/entry.ts`, `export * from '${ROOT}/src/lib/nbaStartingFiveScore.ts';`);
buildSync({ entryPoints: [`${TMP}/entry.ts`], bundle: true, format: 'esm', platform: 'node', outfile: `${TMP}/b.mjs`, logLevel: 'error', alias: { '@': `${ROOT}/src` } });
const L = await import(pathToFileURL(`${TMP}/b.mjs`).href);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const TEAMS = Object.keys(L.NBA_FIVE_FRANCHISE_CODES);
const POS = ['G', 'F', 'C', 'G-F', 'F-C', null, 'G', 'F'];
const ROLES = L.NBA_FIVE_ROLES;
const round1 = v => Math.round(v * 10) / 10;

function deal(rand, namespace, rosterSize, corr) {
  const teams = [...TEAMS].sort(() => rand() - 0.5).slice(0, 5);
  return teams.map(team => {
    const code = L.NBA_FIVE_FRANCHISE_CODES[team][0];
    const names = new Set();
    while (names.size < rosterSize) names.add(`Fx${Math.floor(rand() * namespace)} Probe`);
    const roster = [...names].map(n => ({ first_name: n.split(' ')[0], last_name: 'Probe', position: POS[Math.floor(rand() * POS.length)] }));
    const records = [...names].map(n => {
      const games = 50 + Math.floor(rand() * 900); const k = corr ? (Number(n.slice(2, n.indexOf(' '))) + 1) * 3 + rand() : 0; const r = x => (corr ? k * x / 25 : rand() * x);
      return { player_name: n, teams: code, year_from: '1990-91', games, points: Math.floor(r(25) * games), trb: Math.floor(r(12) * games), ast: Math.floor(r(9) * games), stl: Math.floor(r(2) * games), blk: Math.floor(r(2) * games), three_p: Math.floor(r(2500)) };
    });
    return L.buildTeamPool(team, roster, records);
  });
}

/* Independent: every team to every slot, every eligible numbered man, no key twice. */
function brute(pools, ch, mode) {
  const opts = pools.map(pool => ROLES.map(role => pool.entries.filter(e => L.isPositionEligibleForSlot(e.position, role)).map(e => ({ e, v: L.valueFor(e, ch) })).filter(x => x.v.ok).map(x => ({ key: x.e.key, name: x.e.name, value: x.v.value, role, team: pool.team }))));
  let best = null, bestPicks = null;
  const perms = [];
  const permute = (a, k) => { if (k === a.length) { perms.push([...a]); return; } for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; permute(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; } };
  permute([0, 1, 2, 3, 4], 0);
  for (const perm of perms) {
    const used = new Set(); const chosen = [];
    const go = (i, sum) => {
      if (i === 5) { if (best === null || (mode === 'max' ? sum > best + 1e-9 : sum < best - 1e-9)) { best = sum; bestPicks = [...chosen]; } return; }
      for (const c of opts[i][perm[i]]) { if (used.has(c.key)) continue; used.add(c.key); chosen.push(c); go(i + 1, sum + c.value); chosen.pop(); used.delete(c.key); }
    };
    go(0, 0);
  }
  return best === null ? null : { total: round1(best), picks: bestPicks };
}

const deals = Number(process.argv[2] || 120);
let fails = 0, checked = 0, nulls = 0, sharedDeals = 0;
const fail = m => { fails += 1; if (fails <= 12) console.error(`  FAIL: ${m}`); };
for (const [seed, namespace, rosterSize, corr] of [[11, 9, 6, 0], [23, 12, 6, 0], [37, 7, 5, 0], [41, 30, 7, 0], [59, 8, 6, 0], [71, 5, 5, 1], [83, 6, 6, 1], [97, 8, 6, 1]]) {
  const rand = mulberry32(seed);
  for (let d = 0; d < deals; d++) {
    const pools = deal(rand, namespace, rosterSize, corr);
    const keys = pools.flatMap(p => p.entries.map(e => e.key));
    if (new Set(keys).size < keys.length) sharedDeals += 1;
    const ch = L.NBA_FIVE_CHALLENGES[d % L.NBA_FIVE_CHALLENGES.length];
    for (const mode of ['max', 'min']) {
      const got = L.extremeFive(pools, ch, mode);
      const want = brute(pools, ch, mode);
      checked += 1;
      if (!want) { nulls += 1; if (got) fail(`seed ${seed} deal ${d} ${mode}: brute finds no five, lib returns ${got.total}`); continue; }
      if (!got || Math.abs(got.total - want.total) > 0.051) fail(`seed ${seed} deal ${d} ${ch.key} ${mode}: lib ${got?.total} brute ${want.total}`);
    }
    for (const dir of ['highest', 'lowest']) {
      const b = brute(pools, ch, dir === 'highest' ? 'max' : 'min');
      const w = brute(pools, ch, dir === 'highest' ? 'min' : 'max');
      if (!b || !w) continue;
      const sb = L.scoreFive(b.picks.map(p => ({ team: p.team, role: p.role, name: p.name })), pools, ch, dir);
      const sw = L.scoreFive(w.picks.map(p => ({ team: p.team, role: p.role, name: p.name })), pools, ch, dir);
      if (!sb || sb.score !== 100) fail(`seed ${seed} deal ${d} ${dir}: the brute best five scores ${sb?.score}, want 100`);
      if (b.total !== w.total && (!sw || sw.score !== 0)) fail(`seed ${seed} deal ${d} ${dir}: the brute worst five scores ${sw?.score}, want 0`);
      if (sb) for (const p of sb.perPick) {
        const vals = pools.find(pl => pl.team === p.team).entries.filter(e => L.isPositionEligibleForSlot(e.position, p.role)).map(e => L.valueFor(e, ch)).filter(v => v.ok).map(v => v.value);
        const want = dir === 'highest' ? Math.max(...vals) : Math.min(...vals);
        if (p.slotBest !== want) fail(`seed ${seed} deal ${d} ${dir}: ${p.name} best here ${p.slotBest}, want ${want}`);
        const span = Math.max(...vals) - Math.min(...vals);
        const close = span === 0 ? 1 : (dir === 'highest' ? p.value - Math.min(...vals) : Math.max(...vals) - p.value) / span;
        if (Math.abs(p.closeness - close) > 1e-9) fail(`seed ${seed} deal ${d} ${dir}: ${p.name} closeness ${p.closeness}, want ${close}`);
      }
    }
  }
}
console.log(`probe1555: ${checked} extremes checked against an independent brute force (${nulls} with no five), ${sharedDeals} deals with a name on two or more dealt teams, ${fails} failure(s)`);
process.exit(fails ? 1 : 0);
