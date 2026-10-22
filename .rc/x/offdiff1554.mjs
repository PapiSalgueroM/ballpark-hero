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
  /* entityIds draws its EPOCH from Math.random at module load: give both bundles the same one. */
  const orig = Math.random; Math.random = lehmer(99);
  const mod = await import(pathToFileURL(out).href);
  Math.random = orig;
  return mod;
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

// Where does a finished base season part from head in the offseason?
function diffPaths(a, b, p = '', out = []) {
  if (out.length > 12) return out;
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffPaths(a[k], b[k], `${p}.${k}`, out);
  } else out.push(`${p}: ${JSON.stringify(a)?.slice(0, 60)} vs ${JSON.stringify(b)?.slice(0, 60)}`);
  return out;
}
const ids = B.cfb.CFB_SCHOOLS.map(s => s.id);
for (let seed = 1; seed <= 3; seed += 1) {
  const r0 = lehmer(seed * 977 + 13);
  const team = ids[(seed * 5 + 13) % ids.length];
  const sb = B.cfb.initCfb(team, r0, { depth: true });
  for (let r = 1; r <= 12; r += 1) { B.cfb.simCfbRound(sb, r0); sb.round += 1; }
  sb.round = 12;
  const sh = JSON.parse(JSON.stringify(sb));
  H.cfb.ensureCfbSlate(sh);
  const rb = lehmer(seed * 31 + 13), rh = lehmer(seed * 31 + 13);
  const pb = B.cfb.runCfbPostseason(sb, rb), ph = H.cfb.runCfbPostseason(sh, rh);
  console.log(`seed ${seed} ${team}: postseason same ${JSON.stringify(pb) === JSON.stringify(ph)}, state same ${strip(sb) === strip(sh)}`);
  sh.natties.push({ season: sh.season, team: ph.champion }); sb.natties.push({ season: sb.season, team: pb.champion });
  B.cfb.cfbOpenOffseason(sb, rb); H.cfb.cfbOpenOffseason(sh, rh);
  console.log(`  after open offseason: ${diffPaths(JSON.parse(strip(sb)), JSON.parse(strip(sh))).slice(0, 6).join(' ; ') || 'same'}`);
  B.cfb.cfbOffseason(sb, rb); H.cfb.cfbOffseason(sh, rh);
  console.log(`  after offseason: draws ${rb.n} vs ${rh.n}; ${diffPaths(JSON.parse(strip(sb)), JSON.parse(strip(sh))).slice(0, 8).join(' ; ') || 'same'}`);
}
