// Review of Round 1554 (run lens): old saves made by the BASE engine, played on the HEAD engine.
// Needs a base worktree at $BASE_TREE (default /tmp/base). Prints counts; exits 1 on a crash or a hard break.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.BASE_TREE || '/tmp/base';
const SEEDS = Number(process.env.SEEDS || 40);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'old1554-'));
async function bundle(root, name) {
  const out = path.join(TMP, name + '.mjs');
  await build({
    stdin: { contents: `export * as cfb from '${root}/src/lib/cfbDynasty.ts';\nexport * as cbb from '${root}/src/lib/cbbDynasty.ts';\n`, resolveDir: root, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': `${root}/src` }, nodePaths: [path.join(ROOT, 'node_modules')],
  });
  return import(pathToFileURL(out).href);
}
const B = await bundle(BASE, 'base');
const H = await bundle(ROOT, 'head');
function lehmer(seed) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  const f = () => { f.n += 1; s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  f.n = 0; return f;
}
const strip = st => JSON.stringify(st, (k, v) => (k === 'format' || k === 'slate' ? undefined : v));
const stripCbb = st => JSON.stringify(st, (k, v) => (k === 'format' ? undefined : v));
const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
let hard = 0;
const bad = m => { hard += 1; console.log('  BREAK: ' + m); };

// A) CFB legacy (no layer): base and head in lockstep, every step compared byte for byte.
{
  const ids = B.cfb.CFB_SCHOOLS.map(s => s.id);
  const same = ids.join() === H.cfb.CFB_SCHOOLS.map(s => s.id).join();
  console.log(`A) school order unchanged ${same}`);
  if (!same) bad('CFB_SCHOOLS order moved');
  let steps = 0, diff = 0, first = null, drawDiff = 0;
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const rb = lehmer(seed * 131), rh = lehmer(seed * 131);
    const sb = B.cfb.initCfb(ids[seed % ids.length], rb), sh = H.cfb.initCfb(ids[seed % ids.length], rh);
    for (let season = 0; season < 3; season += 1) {
      for (let r = 1; r <= 12; r += 1) {
        B.cfb.simCfbRound(sb, rb); H.cfb.simCfbRound(sh, rh); sb.round += 1; sh.round += 1;
        steps += 1; if (JSON.stringify(sb) !== JSON.stringify(sh)) { diff += 1; first ??= `seed ${seed} season ${season} round ${r}`; }
      }
      sb.round = 12; sh.round = 12;
      const pb = B.cfb.runCfbPostseason(sb, rb), ph = H.cfb.runCfbPostseason(sh, rh);
      steps += 1; if (JSON.stringify(pb) !== JSON.stringify(ph) || JSON.stringify(sb) !== JSON.stringify(sh)) { diff += 1; first ??= `seed ${seed} season ${season} postseason`; }
      sb.natties.push({ season: sb.season, team: pb.champion }); sh.natties.push({ season: sh.season, team: ph.champion });
      B.cfb.cfbOpenOffseason(sb, rb); H.cfb.cfbOpenOffseason(sh, rh); B.cfb.cfbOffseason(sb, rb); H.cfb.cfbOffseason(sh, rh);
      steps += 1; if (JSON.stringify(sb) !== JSON.stringify(sh)) { diff += 1; first ??= `seed ${seed} season ${season} offseason`; }
      if (rb.n !== rh.n) drawDiff += 1;
    }
  }
  console.log(`   legacy steps compared ${steps}, differing ${diff}, seasons with another draw count ${drawDiff}${first ? ', first ' + first : ''}`);
  if (diff || drawDiff) bad('the legacy (no layer) CFB path is not byte identical to the base');
}

// B) CFB saves with the layer on, written by the BASE engine at week k (k-1 rounds played; 13 means the
// regular season is over, postseason due), loaded on HEAD the way the board loads them, played on.
{
  const ids = B.cfb.CFB_SCHOOLS.map(s => s.id);
  const firstDiff = new Map(); let loads = 0, rivalWeekChanged = 0, myRivalChanged = 0, crashes = 0;
  let nextFormat = 0, nextRepeats = 0, nextNdCcg = 0, nextCcgBad = 0, oldCcgBad = 0, oldNdNotAcc = 0;
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    for (const k of [1, 2, 5, 9, 12, 13]) {
      loads += 1;
      const r0 = lehmer(seed * 977 + k);
      const team = ids[(seed * 5 + k) % ids.length];
      const sb = B.cfb.initCfb(team, r0, { depth: true });
      for (let r = 1; r < Math.min(k, 13); r += 1) { B.cfb.simCfbRound(sb, r0); sb.round += 1; }
      if (k === 13) sb.round = 12;
      const saved = JSON.stringify(sb);
      const sh = JSON.parse(saved);
      try {
        H.cfb.ensureCfbSlate(sh); // the board's load (ensureIds)
        const rb = lehmer(seed * 31 + k), rh = lehmer(seed * 31 + k);
        let where = null;
        for (let r = Math.min(k, 13); r <= 12; r += 1) {
          const gb = B.cfb.simCfbRound(sb, rb).games, gh = H.cfb.simCfbRound(sh, rh).games;
          if (r === 12) {
            const pb = new Set(gb.filter(g => g.rivalry).map(g => key(g.home, g.away)));
            const ph = new Set(gh.filter(g => g.rivalry).map(g => key(g.home, g.away)));
            if ([...pb].join() !== [...ph].join()) rivalWeekChanged += 1;
            const mine = gs => gs.find(g => g.home === team || g.away === team);
            const ob = mine(gb), oh = mine(gh);
            if (ob && oh && key(ob.home, ob.away) !== key(oh.home, oh.away)) myRivalChanged += 1;
          }
          sb.round += 1; sh.round += 1;
          if (!where && strip(sb) !== strip(sh)) where = `round ${r}`;
        }
        sb.round = 12; sh.round = 12;
        const accH = H.cfb.confStandings(sh, 'ACC').map(t => t.id);
        if (k > 1 && !accH.includes('ND')) oldNdNotAcc += 1;
        const pb = B.cfb.runCfbPostseason(sb, rb), ph = H.cfb.runCfbPostseason(sh, rh);
        if (k > 1 && ph.ccgs.length !== 5) oldCcgBad += 1;
        if (!where && (strip(sb) !== strip(sh) || JSON.stringify(pb) !== JSON.stringify(ph))) where = 'postseason';
        sh.natties.push({ season: sh.season, team: ph.champion }); sb.natties.push({ season: sb.season, team: pb.champion });
        B.cfb.cfbOpenOffseason(sb, rb); H.cfb.cfbOpenOffseason(sh, rh); B.cfb.cfbOffseason(sb, rb); H.cfb.cfbOffseason(sh, rh);
        if (!where && strip(sb) !== strip(sh)) where = 'offseason';
        firstDiff.set(`k=${k} ${where ?? 'none'}`, (firstDiff.get(`k=${k} ${where ?? 'none'}`) ?? 0) + 1);
        // two more seasons on HEAD only
        for (let s2 = 0; s2 < 2; s2 += 1) {
          if (sh.format === 1 && sh.slate && sh.slate.season === sh.season) nextFormat += 1;
          const pairs = new Set();
          for (let r = 1; r <= 12; r += 1) { for (const g of H.cfb.simCfbRound(sh, rh).games) { const kk = key(g.home, g.away); if (pairs.has(kk)) nextRepeats += 1; pairs.add(kk); } sh.round += 1; }
          sh.round = 12;
          const p = H.cfb.runCfbPostseason(sh, rh);
          if (p.ccgs.length !== 4) nextCcgBad += 1;
          if (p.ccgs.some(g => g.home === 'ND' || g.away === 'ND')) nextNdCcg += 1;
          sh.natties.push({ season: sh.season, team: p.champion });
          H.cfb.cfbOpenOffseason(sh, rh); H.cfb.cfbOffseason(sh, rh);
        }
      } catch (e) { crashes += 1; if (crashes < 4) console.log(`  crash seed ${seed} k ${k}: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); }
    }
  }
  console.log(`B) CFB base saves with the layer on, loaded on head: ${loads} loads, ${crashes} crashes`);
  console.log(`   first step where head parts from base (format and slate fields ignored): ${[...firstDiff].map(([w, n]) => `${w}: ${n}`).join('; ')}`);
  console.log(`   old season: rivalry week pairs changed ${rivalWeekChanged} of ${loads - 0}, my week 12 opponent changed ${myRivalChanged}; ND out of the ACC table ${oldNdNotAcc}; title games not 5 ${oldCcgBad}`);
  console.log(`   next two seasons: format with slate ${nextFormat} of ${loads * 2}; repeats ${nextRepeats}; title games not 4 ${nextCcgBad}; ND in a title game ${nextNdCcg}`);
  if (crashes) bad(`${crashes} old CFB saves crashed on head`);
  if (oldNdNotAcc || oldCcgBad) bad('an old season lost its ACC Notre Dame or its five title games');
  if (nextFormat !== loads * 2 || nextRepeats || nextCcgBad || nextNdCcg) bad('an old save did not move to the real format cleanly');
}

// C) CBB: the legacy path in lockstep, and base saves with the layer on loaded on head mid season.
{
  const ids = B.cbb.CBB_SCHOOLS.map(s => s.id);
  const R = B.cbb.CBB_ROUNDS;
  let steps = 0, diff = 0, first = null;
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const rb = lehmer(seed * 211), rh = lehmer(seed * 211);
    const sb = B.cbb.initCbb(ids[seed % ids.length], rb), sh = H.cbb.initCbb(ids[seed % ids.length], rh);
    for (let season = 0; season < 3; season += 1) {
      for (let r = 1; r <= R; r += 1) {
        B.cbb.simCbbRound(sb, rb); H.cbb.simCbbRound(sh, rh); if (r < R) { sb.round += 1; sh.round += 1; }
        steps += 1; if (JSON.stringify(sb) !== JSON.stringify(sh)) { diff += 1; first ??= `seed ${seed} season ${season} round ${r}`; }
      }
      const mb = B.cbb.runMarch(sb, rb), mh = H.cbb.runMarch(sh, rh);
      steps += 1; if (JSON.stringify(mb) !== JSON.stringify(mh) || JSON.stringify(sb) !== JSON.stringify(sh)) { diff += 1; first ??= `seed ${seed} season ${season} march`; }
      B.cbb.cbbOpenOffseason(sb, rb); H.cbb.cbbOpenOffseason(sh, rh); B.cbb.cbbOffseason(sb, rb); H.cbb.cbbOffseason(sh, rh);
      steps += 1; if (JSON.stringify(sb) !== JSON.stringify(sh)) { diff += 1; first ??= `seed ${seed} season ${season} offseason`; }
    }
  }
  console.log(`C) CBB legacy steps compared ${steps}, differing ${diff}${first ? ', first ' + first : ''}`);
  if (diff) bad('the legacy (no layer) CBB path is not byte identical to the base');
  const firstDiff = new Map(); let loads = 0, crashes = 0, nextFormat = 0;
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    for (const k of [1, 2, 6, 10]) {
      loads += 1;
      const r0 = lehmer(seed * 433 + k);
      const sb = B.cbb.initCbb(ids[(seed * 3 + k) % ids.length], r0, { depth: true });
      for (let r = 1; r < k; r += 1) { B.cbb.simCbbRound(sb, r0); sb.round += 1; }
      const sh = JSON.parse(JSON.stringify(sb));
      try {
        const rb = lehmer(seed * 17 + k), rh = lehmer(seed * 17 + k);
        let where = null;
        for (let r = k; r <= R; r += 1) {
          B.cbb.simCbbRound(sb, rb); H.cbb.simCbbRound(sh, rh); if (r < R) { sb.round += 1; sh.round += 1; }
          if (!where && stripCbb(sb) !== stripCbb(sh)) where = `round ${r}`;
        }
        const mb = B.cbb.runMarch(sb, rb), mh = H.cbb.runMarch(sh, rh);
        if (!where && (stripCbb(sb) !== stripCbb(sh) || JSON.stringify(mb) !== JSON.stringify(mh))) where = 'march';
        B.cbb.cbbOpenOffseason(sb, rb); H.cbb.cbbOpenOffseason(sh, rh); B.cbb.cbbOffseason(sb, rb); H.cbb.cbbOffseason(sh, rh);
        if (!where && stripCbb(sb) !== stripCbb(sh)) where = 'offseason';
        firstDiff.set(`k=${k} ${where ?? 'none'}`, (firstDiff.get(`k=${k} ${where ?? 'none'}`) ?? 0) + 1);
        if (sh.format === 1) nextFormat += 1;
        for (let r = 1; r <= R; r += 1) { H.cbb.simCbbRound(sh, rh); if (r < R) sh.round += 1; }
        H.cbb.runMarch(sh, rh);
      } catch (e) { crashes += 1; if (crashes < 4) console.log(`  crash cbb seed ${seed} k ${k}: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); }
    }
  }
  console.log(`   CBB base saves with the layer on: ${loads} loads, ${crashes} crashes; next season under the format ${nextFormat}`);
  console.log(`   first step where head parts from base (format ignored): ${[...firstDiff].map(([w, n]) => `${w}: ${n}`).join('; ')}`);
  if (crashes) bad(`${crashes} old CBB saves crashed on head`);
  if (nextFormat !== loads) bad('an old CBB save did not start league records with its next season');
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log(hard ? `\noldsave1554: ${hard} break(s)` : '\noldsave1554: no break');
process.exit(hard ? 1 : 0);
