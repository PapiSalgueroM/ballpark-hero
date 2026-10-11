// Release AX d8, a fleet for the claim "the Soccer half needs no inverse": whole careers that never open the
// Press room, played on the engine of commit c (the first parent of merge d) and on this head, in lockstep.
// After every step the whole save (as the page writes it, JSON) and the number of draws must be equal.
// usage on a runner: git worktree add -q /tmp/base 934c29d9 && node .rc/x/pressNeutral.mjs /tmp/base [careers]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const BASE = path.resolve(process.argv[2]);
const HEAD = process.cwd();
const N = Number(process.argv[3] || 150);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'press-neutral-'));
const ENTRY = "export * as SOC from './src/lib/soccerCareerEngine';\nexport { careerStep } from './scripts/lib/careerStep.mjs';\n";
async function bundle(root, name) {
  const outfile = path.join(tmp, name + '.mjs');
  await build({ stdin: { contents: ENTRY, resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error',
    alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(HEAD, 'node_modules')], define: { 'process.env.NODE_ENV': '"production"' },
    banner: { js: 'globalThis.__store ??= new Map(); globalThis.localStorage ??= { getItem: k => (globalThis.__store.has(k) ? globalThis.__store.get(k) : null), setItem: (k, v) => { globalThis.__store.set(k, String(v)); }, removeItem: k => { globalThis.__store.delete(k); } };' } });
  return import(pathToFileURL(outfile).href);
}
const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
const NATIONS = ['England', 'Spain', 'France', 'Brazil', 'Germany', 'Argentina', 'Portugal', 'Italy', 'Belgium', 'Netherlands'];
const POS = ['ST', 'CM', 'CB', 'LW', 'GK', 'CAM', 'RB', 'CDM'];
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
function play(mod, seed) {
  let a = seed | 0, draws = 0;
  const real = Math.random;
  Math.random = () => { draws += 1; a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const frames = [];
  try {
    const clubs = mod.SOC.FALLBACK_CLUBS;
    let c = mod.SOC.initCareer('Neutral ' + seed, NATIONS[seed % NATIONS.length], POS[seed % POS.length], seed % 3 ? '2010-14' : 'modern', flat(58 + (seed % 5)), 58 + (seed % 5), seed % 3 ? 2010 : 2020, clubs, null, 78 + (seed % 20));
    for (let g = 0; g < 900 && !c.retired; g += 1) {
      /* every other career is saved and loaded between steps, as a player who closes the tab would */
      if (seed % 2 && c.phase === 'playing') c = mod.SOC.repairCareer(JSON.parse(JSON.stringify(c)));
      c = mod.careerStep(mod.SOC, c, clubs);
      frames.push(`${c.phase}|${draws}|${sha(JSON.stringify(c))}`);
    }
    return { frames, seasons: c.seasons.length, press: c.pressRoom !== undefined, retired: !!c.retired, final: c };
  } finally { Math.random = real; }
}
const base = await bundle(BASE, 'base'), head = await bundle(HEAD, 'head');
const twoTrees = typeof base.SOC.advanceProSeason === 'function' && fs.existsSync(path.join(HEAD, 'src/lib/soccerCareerPress.ts')) && !fs.existsSync(path.join(BASE, 'src/lib/soccerCareerPress.ts'));
console.log(`${twoTrees ? 'ok  ' : 'FAIL'} the two bundles are two trees (only the head has src/lib/soccerCareerPress.ts)`);
let bad = twoTrees ? 0 : 1, steps = 0, seasons = 0, retired = 0, withPress = 0;
const SEED0 = Number(process.argv[4] || 3001);
console.log(`reviewer's copy: seeds ${SEED0} to ${SEED0 + N - 1}, base ${BASE}`);
for (let seed = SEED0; seed < SEED0 + N; seed += 1) {
  const x = play(base, seed), y = play(head, seed);
  steps += y.frames.length; seasons += y.seasons; retired += y.retired ? 1 : 0; withPress += y.press ? 1 : 0;
  if (x.frames.length !== y.frames.length || x.frames.some((f, i) => f !== y.frames[i])) {
    bad += 1;
    const at = x.frames.findIndex((f, i) => f !== y.frames[i]);
    if (bad <= 5) {
      const keys = [...new Set([...Object.keys(x.final), ...Object.keys(y.final)])].filter(k => JSON.stringify(x.final[k]) !== JSON.stringify(y.final[k]));
      console.log(`FAIL seed ${seed}: first differing step ${at} of ${x.frames.length}/${y.frames.length}: base ${x.frames[at]} head ${y.frames[at]}; final fields that differ: ${keys.slice(0, 8).join(', ')}`);
    }
  }
}
console.log(`${withPress === 0 ? 'ok  ' : 'FAIL'} no career of the fleet holds a pressRoom (${withPress})`);
if (withPress) bad += 1;
console.log(`pressNeutral: ${N} careers, ${steps} steps, ${seasons} season rows, ${retired} played to retirement; ${bad} failure(s). ${bad ? 'RED' : 'Every save after every step and every draw count is the base engine\'s: the Press room moved nothing for a player who never answers.'}`);
process.exit(bad ? 1 : 0);
