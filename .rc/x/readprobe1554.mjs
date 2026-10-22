/* Read lens probe for Round 1554 (never committed). Two questions:
   A) "nobody plays the same team twice": how often is a conference title game
      or a Playoff game a rematch of a regular season pair, under the format?
   B) "collegeSlate is shared and ready to bind": what does it give a CBB
      shaped spec (41 schools, leagues of 6 and 7, 10 rounds)?
   Run from the repo root: node .rc/x/readprobe1554.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd().replaceAll('\\', '/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'readprobe1554-'));
const BUNDLE = path.join(TMP, 'b.mjs');
await build({
  stdin: {
    contents: `export * as cfb from '${ROOT}/src/lib/cfbDynasty.ts';\nexport * as cbb from '${ROOT}/src/lib/cbbDynasty.ts';\nexport * as prog from '${ROOT}/src/lib/collegeProgram.ts';\n`,
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error',
  alias: { '@': `${ROOT}/src` },
});
const { cfb, cbb, prog } = await import(pathToFileURL(BUNDLE).href);

function lehmer(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/* ---- A: rematches after the regular season ---- */
const SEEDS = Number(process.env.SEEDS || 20);
const SEASONS = Number(process.env.SEASONS || 8);
const ids = cfb.CFB_SCHOOLS.map(s => s.id);
const a = { seasons: 0, ccg: 0, ccgRematch: 0, po: 0, poRematch: 0, myPo: 0, myPoRematch: 0, mySeasonsWithRematch: 0, regRepeats: 0, ex: [] };
for (let seed = 1; seed <= SEEDS; seed += 1) {
  const rng = lehmer(seed * 7919);
  const st = cfb.initCfb(ids[(seed * 7) % ids.length], rng, { depth: true });
  for (let s = 1; s <= SEASONS; s += 1) {
    a.seasons += 1;
    const met = new Set();
    for (let r = 1; r <= cfb.CFB_ROUNDS; r += 1) {
      const { games } = cfb.simCfbRound(st, rng);
      for (const g of games) { const k = key(g.home, g.away); if (met.has(k)) a.regRepeats += 1; met.add(k); }
      st.round += 1;
    }
    const post = cfb.runCfbPostseason(st, rng);
    for (const g of post.ccgs) { a.ccg += 1; if (met.has(key(g.home, g.away))) { a.ccgRematch += 1; if (a.ex.length < 4) a.ex.push(`${st.season} ${g.name}: ${g.home} v ${g.away}`); } }
    let mine = false;
    for (const g of post.bracket) {
      a.po += 1;
      const re = met.has(key(g.home, g.away));
      if (re) a.poRematch += 1;
      if (g.home === st.myTeam || g.away === st.myTeam) { a.myPo += 1; if (re) { a.myPoRematch += 1; mine = true; } }
    }
    for (const g of post.ccgs) if ((g.home === st.myTeam || g.away === st.myTeam) && met.has(key(g.home, g.away))) mine = true;
    if (mine) a.mySeasonsWithRematch += 1;
    cfb.cfbOpenOffseason(st, rng);
    cfb.cfbOffseason(st, rng);
  }
}
console.log(`A) ${a.seasons} seasons (format on: ${SEEDS} new dynasties x ${SEASONS}); regular season repeats ${a.regRepeats}`);
console.log(`A) title games ${a.ccg}, of them rematches of a regular season game ${a.ccgRematch} (${(100 * a.ccgRematch / Math.max(1, a.ccg)).toFixed(1)}%); e.g. ${a.ex.join('; ')}`);
console.log(`A) Playoff games ${a.po}, rematches ${a.poRematch}; my Playoff games ${a.myPo}, rematches ${a.myPoRematch}; my seasons with any postseason rematch ${a.mySeasonsWithRematch}`);

/* ---- B: collegeSlate on a CBB shaped spec ---- */
const cbbIds = cbb.CBB_SCHOOLS.map(s => s.id);
const confOf = new Map(cbb.CBB_SCHOOLS.map(s => [s.id, s.conf]));
const rivals = cbb.cbbRivalries().map(r => [r.a, r.b]);
const sizes = {};
for (const s of cbb.CBB_SCHOOLS) sizes[s.conf] = (sizes[s.conf] ?? 0) + 1;
console.log(`B) CBB: ${cbbIds.length} schools, leagues ${JSON.stringify(sizes)}, ${rivals.length} rivalry pairs, ${cbb.CBB_ROUNDS} rounds`);
function tryShape(label, idsIn) {
  const set = new Set(idsIn);
  const spec = {
    ids: idsIn, leagueOf: id => confOf.get(id) ?? null, rounds: cbb.CBB_ROUNDS, windowStart: 1,
    rivalryRound: cbb.CBB_RIVALRY_ROUND, rivals: rivals.filter(([x, y]) => set.has(x) && set.has(y)),
  };
  const t0 = Date.now();
  const out = prog.collegeSlate(spec, lehmer(1554));
  const ms = Date.now() - t0;
  const league = new Map(idsIn.map(id => [id, 0]));
  const games = new Map(idsIn.map(id => [id, 0]));
  for (const round of out.rounds) for (const [h, w] of round) {
    games.set(h, games.get(h) + 1); games.set(w, games.get(w) + 1);
    if (confOf.get(h) === confOf.get(w)) { league.set(h, league.get(h) + 1); league.set(w, league.get(w) + 1); }
  }
  const lv = [...league.values()];
  const gv = [...games.values()];
  console.log(`B) ${label}: fallback=${out.fallback}, ${ms} ms, games a school ${Math.min(...gv)} to ${Math.max(...gv)}, league games a school ${Math.min(...lv)} to ${Math.max(...lv)}`);
}
tryShape('all 41 schools as they are', cbbIds);
const unrivaled = cbbIds.filter(id => !rivals.some(([x, y]) => x === id || y === id));
console.log(`B) schools with no rival: ${unrivaled.join(', ') || 'none'}`);
tryShape('even count (the unrivaled school dropped)', cbbIds.filter(id => !unrivaled.includes(id)));
console.log('readprobe1554: done');
