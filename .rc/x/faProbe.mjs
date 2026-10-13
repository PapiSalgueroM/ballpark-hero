// Release AZ fixer probe (never committed): why simFreeAgents' ex-player count in season three falls on a
// seeded career. Same seeds as the harness (9100 + i, 9600 + i, 10000 + i), seeded career against the same
// career with its seed and ledger taken off before the first summer. Run from the repo root.
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const ROOT = process.cwd();
const N = Number(process.env.FA_N || 60);
async function engine() {
  const out = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\n", resolveDir: ROOT, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
  const script = new vm.Script(out.outputFiles[0].text);
  const module = { exports: {} }; const store = new Map(); const NOW = 1791633600000;
  class D extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
  const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math, Date: D,
    URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval, performance,
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
  script.runInContext(ctx); if (module.exports.eras.ensureAllEraRosters) await module.exports.eras.ensureAllEraRosters();
  return module.exports;
}
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const real = Math.random;
const seeded = (seed, fn) => { Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = real; } };
const { cm } = await engine();
const sample = cm.REAL_LEAGUES.flatMap(l => l.clubs);
const strip = s => { const c = JSON.parse(JSON.stringify(s)); delete c.worldSeed; delete c.worldRoster; for (const p of c.squad) { delete p.worldRosterKey; delete p.worldRosterSince; } return c; };
const tot = { seeded: {}, stripped: {} };
const add = (o, k, v) => { o[k] = (o[k] ?? 0) + v; };
let shown = 0;
for (let i = 0; i < Math.min(N, sample.length); i += 1) {
  for (const arm of ['seeded', 'stripped']) {
    let s1, s2, s3;
    try {
      s1 = seeded(9100 + i, () => cm.startCareer(sample[i]));
      if (arm === 'stripped') s1 = strip(s1);
      s2 = seeded(9600 + i, () => cm.startNextSeason(s1));
      s3 = seeded(10000 + i, () => cm.startNextSeason(s2));
    } catch (e) { add(tot[arm], 'threw', 1); continue; }
    const level3 = s3.clubStrengths[s3.clubName], e3 = cm.eleventhBestRating(s3.squad);
    const ex2 = (s2.freeAgents ?? []).filter(f => f.fromMyClub && f.reason === 'expired');
    const ex = (s3.freeAgents ?? []).filter(f => f.fromMyClub && f.reason === 'expired' && f.since !== s3.season);
    const gap = ex.filter(f => f.rating <= level3 - 6 && f.rating > e3);
    const t = tot[arm];
    add(t, 'clubs', 1); add(t, 'expiredInS2Pool', ex2.length); add(t, 'carriedExInS3', ex.length); add(t, 'gap', gap.length);
    add(t, 'level3', level3); add(t, 'e3', e3); add(t, 'level1', s1.clubStrengths[s1.clubName]); add(t, 'e1', cm.eleventhBestRating(s1.squad));
    add(t, 'squad3', s3.squad.length); add(t, 'abovelevel', ex.filter(f => f.rating > level3 - 6).length); add(t, 'belowe3', ex.filter(f => f.rating <= e3).length);
    if (arm === 'seeded' && shown < 6 && s1.worldSeed !== undefined) { shown += 1; console.log(`${sample[i]}: seed ${s1.worldSeed} level1 ${s1.clubStrengths[s1.clubName]} level3 ${level3} e3 ${e3} carried ${ex.length} gap ${gap.length}`); }
  }
}
for (const arm of ['seeded', 'stripped']) {
  const t = tot[arm];
  console.log(arm, JSON.stringify({ clubs: t.clubs, threw: t.threw ?? 0, expiredInS2Pool: t.expiredInS2Pool, carriedExInS3: t.carriedExInS3, gap: t.gap,
    abovelevel: t.abovelevel, belowe3: t.belowe3, meanLevel1: +(t.level1 / t.clubs).toFixed(2), meanLevel3: +(t.level3 / t.clubs).toFixed(2), meanE1: +(t.e1 / t.clubs).toFixed(2), meanE3: +(t.e3 / t.clubs).toFixed(2), meanSquad3: +(t.squad3 / t.clubs).toFixed(2) }));
}
