// Baseline on a tree before Round 1554: repeated pairs, Notre Dame title games, G5 title games.
// Usage: node baseline.mjs <tree root>. Not committed; sent to the runner as an extra file.
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const TREE = path.resolve(process.argv[2] || '.').replaceAll('\\', '/');
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'base-')), 'b.mjs');
await build({ stdin: { contents: `export * from '${TREE}/src/lib/cfbDynasty.ts';`, resolveDir: TREE, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': `${TREE}/src` } });
const cfb = await import(pathToFileURL(out).href);
function lehmer(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const ids = cfb.CFB_SCHOOLS.map(s => s.id);
let seasons = 0, repeats = 0, withRepeat = 0, ndCcg = 0, g5Ccg = 0, ndAccTitle = 0, maxPerTeam = 0;
const perConf = {};
for (let seed = 1; seed <= 20; seed += 1) {
  const rng = lehmer(seed * 7919);
  const st = cfb.initCfb(ids[(seed * 7) % ids.length], rng, { depth: true });
  for (let season = 1; season <= 8; season += 1) {
    seasons += 1;
    const count = new Map(); let rep = 0;
    for (let r = 1; r <= cfb.CFB_ROUNDS; r += 1) {
      const { games } = cfb.simCfbRound(st, rng);
      for (const g of games) { const k = key(g.home, g.away); const n = (count.get(k) || 0) + 1; count.set(k, n); if (n > 1) { rep += 1; const c = cfb.CFB_SCHOOL_MAP.get(g.home).conf; perConf[c] = (perConf[c] || 0) + 1; } }
      st.round += 1;
    }
    st.round = cfb.CFB_ROUNDS;
    repeats += rep; if (rep > 0) withRepeat += 1;
    const post = cfb.runCfbPostseason(st, rng);
    for (const g of post.ccgs) { if (g.home === 'ND' || g.away === 'ND') ndCcg += 1; if (/G5/.test(g.name)) g5Ccg += 1; if (/ACC/.test(g.name) && g.winner === 'ND') ndAccTitle += 1; }
    st.natties.push({ season: st.season, team: post.champion });
    cfb.cfbOpenOffseason(st, rng); cfb.cfbOffseason(st, rng);
  }
}
console.log(JSON.stringify({ tree: TREE, seasons, repeats, seasonsWithRepeat: withRepeat, repeatsByHomeConf: perConf, ndTitleGames: ndCcg, ndAccTitles: ndAccTitle, g5TitleGames: g5Ccg }));
console.log(`baseline: ${withRepeat} of ${seasons} seasons repeat a pair (${repeats} repeats), Notre Dame in ${ndCcg} ACC title games (won ${ndAccTitle}), ${g5Ccg} G5 Championships`);
