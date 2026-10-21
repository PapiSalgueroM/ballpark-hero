/* Review probe (Round 1520, run lens): the carries the round's own harness does not walk.
   (a) a made up man an AI club buys keeps the country his old club's listing showed;
   (b) a scouted boy released and signed back from the pool keeps his trip's country;
   (c) a scouted boy whose deal runs out goes to the pool with his trip's country.
   Prints one line per check and a closing verdict line. Offline. Run from the repo root. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = process.cwd();
const MODS = { cm: 'lib/clubManager' };
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-carry-'));
fs.writeFileSync(path.join(work, 'entry.ts'), `export * as cm from ${JSON.stringify(path.join(ROOT, 'src/lib/clubManager.ts'))};`);
await build({ entryPoints: [path.join(work, 'entry.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'b.cjs'),
  logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const { cm } = createRequire(import.meta.url)(path.join(work, 'b.cjs'));
await cm.ensureAllEraRosters();
let a = 7151520 >>> 0;
Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const playSeason = s => { for (let g = 0; g < 160; g += 1) { const r = cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver' || s.sacked) break; } return cm.finishSeason(s).state; };
let broken = 0;
const listing = s => new Map(cm.buildMarket(s).filter(l => l.generated).map(l => [`${l.name}|${l.position}`, l]));

/* (a) AI deals: every made up man listed at one club at the start of a season and at another at its end. */
for (const club of ['Everton', 'Real Madrid', 'Lyon']) {
  let s = cm.startCareer(club);
  /* AI clubs buy off the top of the market, where made up men only arrive years on: play AISEASONS seasons first. */
  for (let k = 0; k < Number(process.env.AISEASONS || 9); k += 1) { s = playSeason(s); if (s.sacked) break; s = cm.startNextSeason(s); }
  if (s.sacked) { console.log(`(a) ${club}: sacked, skipped`); continue; }
  const before = listing(s);
  s = playSeason(s);
  const after = listing(s);
  let moved = 0, abroad = 0, changed = 0;
  for (const [k, l] of after) {
    const was = before.get(k);
    if (!was || was.club === l.club) continue;
    moved += 1;
    if (was.nation !== l.nation) { changed += 1; if (changed <= 3) console.log(`   ${l.name}: ${was.club} ${was.nation} -> ${l.club} ${l.nation}`); }
    if (cm.careerPlace({ clubName: was.club })?.home !== cm.careerPlace({ clubName: l.club })?.home) abroad += 1;
  }
  console.log(`(a) ${club}: made up men moved between other clubs ${moved} (${abroad} across a border); country changed ${changed}`);
  if (changed) broken += 1;
}

/* (b) and (c): four boys from four trips at an English club. */
{
  let s = cm.startNextSeason(playSeason(cm.startCareer('Everton')));
  const trips = [['Brazil', 'Brazil'], ['Japan', 'Japan'], ['Turkey', 'Türkiye'], ['Nigeria', 'Nigeria']];
  const add = (st, tag) => ({ ...st, academy: { ...st.academy, prospects: [...(st.academy?.prospects ?? []), ...trips.map(([src], i) => ({ id: `rv-${tag}-${i}`,
    name: `Review ${tag} ${i}`, position: 'CM', age: 17, rating: 58, potential: 80, lowGuess: 70, highGuess: 86, source: src, flag: '', fee: 0, season: st.season }))] } });
  s = add(s, 'C');
  for (let i = 0; i < trips.length; i += 1) s = cm.promoteProspect(s, `rv-C-${i}`) ?? s;
  s = { ...s, squad: s.squad.map(p => (p.name.startsWith('Review C') ? { ...p, contractYears: 1 } : p)) };
  s = cm.startNextSeason(playSeason(s));
  let pooled = 0, held = 0;
  for (const [i, [, want]] of trips.entries()) {
    const fa = (s.freeAgents ?? []).find(f => f.name === `Review C ${i}`);
    if (!fa) continue;
    pooled += 1;
    if (fa.nation === want) held += 1; else console.log(`   (c) Review C ${i}: scouted ${want}, in the pool as ${fa.nation} (generated ${fa.generated})`);
  }
  console.log(`(c) deals ran out: ${pooled} of 4 in the pool, ${held} with the trip's country`);
  if (pooled === 0) console.log('   (c) none reached the pool, check not exercised');
  if (held < pooled) broken += 1;
  /* (b) a man whose deal ran out is signable from the pool the season after next: sign each back. */
  s = cm.startNextSeason(playSeason(s));
  let back = 0, kept = 0, tried = 0;
  for (const [i, [, want]] of trips.entries()) {
    const name = `Review C ${i}`;
    const fa = (s.freeAgents ?? []).find(f => f.name === name);
    if (!fa) continue;
    tried += 1;
    const rich = { ...s, budget: 9999, wageCap: 9999 };
    const signed = cm.signFreeAgent(rich, name);
    if (!signed) { console.log(`   (b) ${name}: refused (${cm.freeAgentBlock(rich, fa)})`); continue; }
    back += 1;
    const after = cm.playNextEntry(signed, { skipHalftime: true }).state;
    const got = after.squad.find(x => x.name === name)?.nation;
    if (got === want) kept += 1; else console.log(`   (b) ${name}: scouted ${want}, signed back as ${got}`);
    s = after;
  }
  console.log(`(b) signed back from the pool: ${back} of ${tried}, ${kept} kept the trip country`);
  if (back === 0) console.log("   (b) could not sign one back, check not exercised");
  if (kept < back) broken += 1;
}
console.log(`review-carry: ${broken ? `BROKEN in ${broken} check(s)` : 'every carry held'}`);
