/* Reviewer probe (Round 1559, runner lens): BASE vs HEAD over a fleet, on the paths the round promises are byte
   equal: the NHL summer with his club named (desk off), the NHL summer with nobody named and no option (the unnamed
   summer NhlRosterLimit.outcomes measures), the NHL desk summer with retained rows planted (keepRetainedOverSummer),
   and the MLB desk summer with retained rows planted. Each path is played on BASE's bundle and HEAD's bundle with
   the same seeded streams; league and desk JSON (id epoch taken out) are hashed a season.
   RV_FLEET_CONTROL=option: HEAD's unnamed summer passes { noUserClub: true } (must differ, proves the probe sees it).
   Run from the repo root on the runner after: git worktree add /tmp/base 115c68092 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const HEAD = process.cwd();
const BASE = process.env.RV_BASE || '/tmp/base';
const SEEDS = Number(process.env.RV_SEEDS || 40);
const SEASONS = Number(process.env.RV_SEASONS || 4);
const CONTROL = process.env.RV_FLEET_CONTROL || '';
const req = createRequire(path.join(HEAD, 'package.json'));
const esbuild = req('esbuild');
const sha = s => crypto.createHash('sha1').update(s).digest('hex');
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const OUT = fs.mkdtempSync('/tmp/rvfleet-');
async function bundle(root, tag) {
  const entry = path.join(OUT, `entry-${tag}.ts`);
  const lib = n => `'${root}/src/lib/${n}.ts'`;
  fs.writeFileSync(entry, [
    `export { makeIdMinter } from ${lib('entityIds')};`,
    `export * as EN from ${lib('nhlFrontOffice')};`,
    `export * as DN from ${lib('nhlGmDesk')};`,
    `export * as MN from ${lib('mlbFrontOffice')};`,
    `export * as MD from ${lib('mlbGmDesk')};`,
    `export * as G from ${lib('gmDesk')};`,
    `export { leagueNames } from ${lib('foNames')};`,
    `export { NHL_OPENING_RATINGS } from '${root}/src/data/nhlOpeningRatings.ts';`,
  ].join('\n'));
  const outfile = path.join(OUT, `bundle-${tag}.cjs`);
  await esbuild.build({ entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', alias: { '@': `${root}/src` }, nodePaths: [path.join(HEAD, 'node_modules')], outfile, logLevel: 'error' });
  const text = fs.readFileSync(outfile, 'utf8');
  if (text.includes('supabase.co')) { console.error('refusing: bundle names supabase.co'); process.exit(2); }
  const real = Math.random;
  Math.random = mulberry32(1559);
  const M = createRequire(import.meta.url)(outfile);
  Math.random = real;
  const id = M.makeIdMinter('x')();
  M.EPOCH = id.slice(1, id.lastIndexOf('-'));
  return M;
}

function run(M, isHead) {
  const { EN, DN, MN, MD, G, leagueNames, NHL_OPENING_RATINGS } = M;
  const un = s => s.split(M.EPOCH).join('E');
  const out = { A: [], B: [], C: [], D: [] };
  const team = 'TOR';
  const nhlSeason = (lg, me, rng, desk) => {
    for (;;) {
      EN.simNhlRound(lg, me, rng, desk ? DN.nhlDeskRoundOptions(desk, lg, me) : undefined);
      EN.nhlAiMoves(lg, me, rng);
      if (desk) desk = DN.nhlDeskAfterRound(desk, lg, me).desk;
      if (lg.round >= EN.NHL_FO_ROUNDS) break;
      lg.round += 1;
    }
    const po = EN.runNhlFoPlayoffs(lg, rng, desk ? DN.nhlDeskEdges(desk, lg, me) : undefined);
    lg.champions.push({ season: lg.season, team: po.champion });
    let cls = EN.nhlDraftClass(rng, 24, leagueNames(lg));
    for (let b = 0; b < 2; b++) cls = EN.nhlAiDraftPicks(lg, cls, EN.nhlFoStandings(lg).map(t => t.abbr).reverse().filter(a => a !== me), rng).remaining;
    return desk;
  };
  const plant = (lg, desk, keys, k) => {
    const clubs = Object.keys(lg.teams).sort().filter(c => c !== team).slice(0, 3);
    const rows = [];
    clubs.forEach((club, i) => {
      const t = lg.teams[club];
      const pid = `rv-${k}-${i}`;
      t.deadCap = [...(t.deadCap ?? []), { playerId: pid, name: `Rv ${k} ${i}`, amount: 2 + i, seasonsLeft: 1 + ((k + i) % 3) }];
      rows.push({ club, playerId: pid, name: `Rv ${k} ${i}`, share: 0.5, kept: 1 + i / 2 });
    });
    return G.withGmBlock(desk, keys.retained, [...(desk.blocks[keys.retained] ?? []), ...rows]);
  };
  for (let seed = 1; seed <= SEEDS; seed++) {
    for (const p of ['A', 'B', 'C']) {
      const rng = mulberry32(seed * 7919 + p.charCodeAt(0));
      Math.random = mulberry32(seed * 104729 + p.charCodeAt(0));
      const lg = EN.initNhlLeague(rng, NHL_OPENING_RATINGS);
      let desk = p === 'C' ? DN.openNhlDesk(lg, team) : null;
      for (let s = 0; s < SEASONS; s++) {
        if (p === 'C') desk = plant(lg, desk, DN.NHL_DESK_KEYS, s);
        desk = nhlSeason(lg, p === 'B' ? '' : team, rng, desk);
        if (p === 'A') EN.nhlOffseason(lg, rng, team);
        else if (p === 'B') { if (isHead && CONTROL === 'option') EN.nhlOffseason(lg, rng, undefined, { noUserClub: true }); else EN.nhlOffseason(lg, rng); }
        else {
          const r = DN.nhlDeskOffseason(lg, desk, team, rng);
          if (r.ok === false) throw new Error(`nhl desk summer refused seed ${seed}`);
          desk = r.desk;
        }
        out[p].push(sha(un(JSON.stringify({ lg, desk }))));
      }
    }
    {
      const rng = mulberry32(seed * 7919 + 68);
      Math.random = mulberry32(seed * 104729 + 68);
      const lg = MN.initMlbLeague(rng);
      const me = Object.keys(lg.teams).sort()[0];
      let desk = MD.openMlbDesk(lg, me);
      for (let s = 0; s < SEASONS; s++) {
        desk = plant(lg, desk, MD.MLB_DESK_KEYS, s);
        for (;;) {
          MN.simMlbRound(lg, me, rng, MD.mlbDeskRoundOptions(desk, lg, me));
          MN.mlbAiMoves(lg, me, rng);
          desk = MD.mlbDeskAfterRound(desk, lg, me).desk;
          if (lg.round >= MN.MLB_ROUNDS) break;
          lg.round += 1;
        }
        const po = MN.runMlbPlayoffs(lg, rng, MD.mlbDeskEdges(desk, lg, me));
        lg.champions.push({ season: lg.season, team: po.champion });
        let cls = MN.mlbDraftClass(rng, 24, leagueNames(lg));
        for (let b = 0; b < 2; b++) cls = MN.mlbAiDraftPicks(lg, cls, MN.mlbStandings(lg).map(t => t.abbr).reverse().filter(a => a !== me), rng).remaining;
        const r = MD.mlbDeskOffseason(lg, desk, me, rng);
        if (r.ok === false) throw new Error(`mlb desk summer refused seed ${seed}`);
        desk = r.desk;
        out.D.push(sha(un(JSON.stringify({ lg, desk }))));
      }
    }
  }
  return out;
}

const realRandom = Math.random;
const mb = await bundle(BASE, 'base');
const mh = await bundle(HEAD, 'head');
const rb = run(mb, false);
const rh = run(mh, true);
Math.random = realRandom;
let diff = 0;
for (const p of ['A', 'B', 'C', 'D']) {
  const first = rb[p].findIndex((h, i) => h !== rh[p][i]);
  const n = rb[p].filter((h, i) => h !== rh[p][i]).length;
  diff += n;
  console.log(`path ${p}: ${rb[p].length} season digests, ${n} differ${first >= 0 ? ` (first at index ${first})` : ''}; base ${sha(rb[p].join(''))} head ${sha(rh[p].join(''))}`);
}
if (CONTROL) {
  console.log(`RV_FLEET_CONTROL ${CONTROL}: ${diff} digests differ ${diff > 0 ? '(FIRED)' : '(DID NOT FIRE)'}`);
  process.exit(diff > 0 ? 1 : 3);
}
console.log(diff === 0 ? `rvFleet: BASE and HEAD byte equal on all four paths (${SEEDS} seeds x ${SEASONS} seasons)` : `rvFleet: ${diff} digests differ`);
process.exit(diff === 0 ? 0 : 1);
