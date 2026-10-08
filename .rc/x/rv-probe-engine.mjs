/* Reviewer probe: what a player gets at each Russian club on day one. Read only, offline. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const ROOT = process.env.RV_ROOT ? path.resolve(process.env.RV_ROOT) : process.cwd();
const F = ROOT.replaceAll('\\', '/');
const TMP = fs.mkdtempSync(path.join(process.env.RV_TMP || os.tmpdir(), 'rvprobe-'));
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };
fs.writeFileSync(path.join(TMP, 'e.mjs'), [
  `export * from '${F}/src/lib/clubManager.ts';`,
  `export { CM_WORLD_ROSTERS, CM_WORLD_PARTIAL } from '${F}/src/data/clubManagerWorldRosters.ts';`,
  `export { nationalityOf } from '${F}/src/data/playerNationalities.ts';`,
].join('\n'));
await build({ entryPoints: [path.join(TMP, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'o.mjs'), alias: { '@': `${F}/src` }, logLevel: 'error', loader: { '.tsx': 'tsx' }, jsx: 'automatic',
  plugins: [{ name: 'sb', setup(b) { b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'sb', namespace: 'sb' })); b.onLoad({ filter: /.*/, namespace: 'sb' }, () => ({ contents: 'export const supabase = new Proxy({}, { get() { throw new Error("offline"); } }); export const SUPABASE_URL = "http://offline.invalid"; export const SUPABASE_PUBLISHABLE_KEY = "x";', loader: 'js' })); } }] });
const cm = await import(pathToFileURL(path.join(TMP, 'o.mjs')).href);
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const mode = process.argv[2] || 'clubs';
if (mode === 'clubs') {
  const lg = cm.REAL_LEAGUES.find(l => l.id === 'russia');
  const defs = cm.playableClubs('russia');
  console.log(`world ${cm.REAL_LEAGUES.length} leagues, ${cm.REAL_LEAGUES.reduce((s, l) => s + l.clubs.length, 0)} clubs, ${cm.NATIONS.length} nations`);
  for (const club of lg.clubs) {
    Math.random = seeded(1052);
    const s = cm.startCareer(club);
    const real = s.squad.filter(p => !p.isYouth);
    const pads = s.squad.filter(p => p.isYouth);
    const xi = (s.xi ?? []).map(id => s.squad.find(p => p.id === id)).filter(Boolean);
    const xiPads = xi.filter(p => p.isYouth).length;
    const def = defs.find(d => d.name === club);
    const grp = g => s.squad.filter(p => !p.isYouth && (g === 'GK' ? p.pos === 'GK' : g === 'DEF' ? ['CB', 'LB', 'RB'].includes(p.pos) : g === 'MID' ? ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(p.pos) : ['LW', 'RW', 'ST', 'CF'].includes(p.pos))).length;
    const noNat = real.filter(p => !cm.nationalityOf(undefined, p.name)).map(p => p.name);
    console.log(`${club.padEnd(19)} prev ${cm.clubPreviewRating(club)} xiAvg ${cm.bakedXIAvg(club)?.toFixed?.(1)} tier ${def?.tier} budget ${def?.budget} exp ${def?.expectation} col ${def?.color} | squad ${s.squad.length} real ${real.length} pads ${pads.length} xi ${xi.length} xiPads ${xiPads} | GK ${grp('GK')} DEF ${grp('DEF')} MID ${grp('MID')} FWD ${grp('FWD')} | budget ${s.budget} ask "${(s.boardExpectation?.label ?? s.objective?.label ?? '')}" noNat ${noNat.length ? noNat.join(',') : 0}`);
  }
  const s = cm.startCareer('Zenit');
  console.log('keys with board/expect:', Object.keys(s).filter(k => /board|expect|object|demand/i.test(k)).join(','));
  console.log('top 6 Zenit:', s.squad.slice().sort((a, b) => b.rating - a.rating).slice(0, 6).map(p => `${p.name} ${p.pos} ${p.rating}`).join('; '));
  console.log('youth pads Spartak:', cm.startCareer('Spartak Moscow').squad.filter(p => p.isYouth).map(p => `${p.name} ${p.pos} ${p.rating}`).join('; '));
}
console.log('probe done');
if (mode === 'era') {
  await cm.ensureAllEraRosters();
  const RU = new Set(cm.REAL_LEAGUES.find(l => l.id === 'russia').clubs);
  for (const [era, club] of [['era2005', 'Barcelona'], ['era2010', 'Barcelona']]) {
    let deals = 0, ruBuy = 0, careers = 0; const names = {}; const sample = [];
    for (let k = 0; k < 24; k++) {
      Math.random = seeded(5000 + k);
      let s;
      try { s = cm.startCareer(club, era); } catch (e) { console.log(`${era}: start threw ${e.message}`); break; }
      careers += 1;
      const seen = new Set();
      const take = st => { for (const n of st.transferLog ?? []) { const key = `${n.season}|${n.week}|${n.name}|${n.to}`; if (seen.has(key)) continue; seen.add(key); deals += 1; if (RU.has(n.to)) { ruBuy += 1; names[n.to] = (names[n.to] ?? 0) + 1; if (sample.length < 4) sample.push(`${n.to} sign ${n.name} from ${n.from}`); } } };
      take(s);
      for (let i = 0; i < 70; i++) { s.boardConfidence = 100; const r = cm.playNextEntry(s, { skipHalftime: true }); s = r.state; take(s); if (r.kind === 'seasonOver') break; }
    }
    const spenders = cm.REAL_LEAGUES.flatMap(l => cm.playableClubs(l.id).slice(0, 5).map(c => c.name));
    console.log(`${era} ${club}: ${careers} seeded seasons, ${deals} transfer news lines, ${ruBuy} name a 2026 Russian club as the buyer ${JSON.stringify(names)}; e.g. ${sample.join(' | ')}`);
    console.log(`   bidding war rival pool: ${spenders.length} clubs, ${spenders.filter(n => RU.has(n)).length} Russian (${spenders.filter(n => RU.has(n)).join(', ')})`);
  }
}
if (mode === 'eranames') {
  await cm.ensureAllEraRosters();
  const ruNames = new Set(cm.REAL_LEAGUES.find(l => l.id === 'russia').clubs.flatMap(c => (cm.CM_WORLD_ROSTERS[c] ?? []).map(p => p.n)));
  const rows = [['era2010', 'Rubin Kazan'], ['era2010', 'Spartak Moscow'], ['era2015', 'Zenit'], ['era2015', 'CSKA Moscow'], ['era2020', 'Lokomotiv Moscow'], ['era2020', 'Krasnodar'], ['era2020', 'Zenit'], ['era2005', 'Zenit']];
  for (const [era, club] of rows) {
    Math.random = seeded(1052);
    const s = cm.startCareer('Barcelona', era);
    let list = [];
    try { list = cm.oppRosterFor(s, club); } catch (e) { console.log(`${era} ${club}: oppRosterFor threw ${e.message}`); continue; }
    const hits = list.filter(p => ruNames.has(p.n));
    console.log(`${era} ${club}: ${list.length} men on the opposition list, ${hits.length} of them 2026 Russian squad names${hits.length ? ': ' + hits.slice(0, 6).map(p => `${p.n} ${p.a ?? ''}`).join(', ') : ''}; first three: ${list.slice(0, 3).map(p => p.n).join(', ')}; strength ${cm.strengthOf(s, club)}`);
  }
}
