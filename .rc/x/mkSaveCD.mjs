// Reviewer facts-screens-weight, Release AZ. Never committed. Run from the repo root on a runner:
//   node .rc/x/mkSaveCD.mjs   (writes cd-save-seeded.json, cd-save-old.json and cd-sold.json into $RC_OUT)
// A SEEDED Everton career through the game's own functions, every sale through acceptBid to Liverpool:
// sale A his best real player aged 25 or under, sale C a real player in the last year of his deal (the help's
// "a season later he is still there"), season 1, an academy prospect promoted at the rollover and sold (sale B),
// season 2, then the save at the start of season 3. It plays on to season 7 printing where each man stands.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const ROOT = process.cwd();
const OUT = process.env.RC_OUT || '.tmp-fx';
const BUYER = 'Liverpool', NOW = 1791633600000;
const out = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as ledger from './src/lib/clubManagerWorldRoster';\n", resolveDir: ROOT, loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', logLevel: 'silent',
  alias: { '@': path.join(ROOT, 'src') } });
const module = { exports: {} }; const store = new Map();
class D extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let v = s; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; }; }
const MathX = Object.create(Math); MathX.random = seeded(Number(process.env.CD_SEED || 0xc0ffee));
const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math: MathX, Date: D,
  URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval, performance,
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
new vm.Script(out.outputFiles[0].text).runInContext(ctx);
const { cm, eras, ledger } = module.exports;
await eras.ensureAllEraRosters();
const fail = m => { console.log(`mkSaveCD: ABORT ${m}`); process.exit(2); };
const playSeason = s => { for (let i = 0; i < 400; i += 1) { const r = cm.playNextEntry(s, { skipHalftime: true, noCoach: true }); s = r.state; if (r.kind === 'seasonOver') break; } return cm.finishSeason(s).state; };
const sell = (s, p) => {
  const t = { ...s, incomingBids: [...(s.incomingBids ?? []), { playerId: p.id, playerName: p.name, club: BUYER, offer: Math.max(1, p.value ?? 5), status: 'open' }] };
  const r = cm.acceptBid(t, p.id); if (!r) fail(`acceptBid refused ${p.name}`); return r;
};
const sold = [];
const where = (s, label) => {
  const held = ledger.readWorldRoster(s), ro = cm.oppRosterFor(s, BUYER);
  for (const m of sold) {
    const rec = held?.records.find(r => r.player.name === m.name);
    const row = ro.find(r => r.n === m.name);
    console.log(`  ${label} ${m.tag} ${m.name}: record ${rec ? `${rec.status} ${rec.owner} contractYears ${rec.player.contractYears}` : 'none'}; ${BUYER} lists him ${row ? `age ${row.a} rating ${row.r} made up tag ${row.g === true}` : 'NO'}`);
  }
};
let s = cm.startCareer('Everton');
if (s.worldSeed === undefined) fail('a new career carries no worldSeed');
const real = s.squad.filter(p => !p.isYouth && !p.academyGrad && !p.generated && p.position !== 'GK');
const a = [...real].filter(p => p.age <= 25).sort((x, y) => y.rating - x.rating)[0];
if (!a) fail('no young real player to sell');
s = sell(s, a); sold.push({ tag: 'A', name: a.name });
console.log(`sale A: ${a.name} (${a.position}, age ${a.age}, ${a.rating}, contractYears ${a.contractYears}) to ${BUYER}`);
const c = real.filter(p => p.id !== a.id && (p.contractYears ?? 3) <= 1).sort((x, y) => y.rating - x.rating)[0];
if (c) { s = sell(s, c); sold.push({ tag: 'C', name: c.name }); console.log(`sale C: ${c.name} (${c.position}, age ${c.age}, ${c.rating}, contractYears ${c.contractYears}) to ${BUYER}`); }
else console.log(`sale C: no real player in the last year of his deal (contract years ${[...new Set(real.map(p => p.contractYears))].join(',')})`);
where(s, 'season 1 summer');
s = playSeason(s); s = cm.startNextSeason(s);
where(s, 'season 2 summer');
const prospects = [...(s.academy?.prospects ?? [])].sort((x, y) => x.fee - y.fee);
let b = null;
for (const pr of prospects) { const t = cm.promoteProspect(s, pr.id); if (t) { s = t; b = s.squad.find(p => p.name === pr.name); break; } }
if (b) {
  console.log(`academy player: ${b.name} (${b.position}, ${b.age}, ${b.rating}) generated=${b.generated === true} academyGrad=${b.academyGrad === true}`);
  s = sell(s, b); sold.push({ tag: 'B', name: b.name });
} else console.log(`no prospect could be promoted (${prospects.length} in the academy)`);
s = playSeason(s); s = cm.startNextSeason(s);
where(s, 'season 3 summer');
console.log(`save at season ${s.season}, club ${s.clubName}, sacked ${s.sacked === true}, yearsOn ${cm.yearsOn(s)}, ledger ${ledger.readWorldRoster(s)?.records.length ?? 0} records`);
cm.saveCareer(s);
const seededText = store.get(cm.SAVE_KEY);
if (!seededText) fail('saveCareer wrote nothing');
const old = JSON.parse(seededText); delete old.worldSeed; delete old.worldRoster;
for (const p of old.squad ?? []) { delete p.worldRosterKey; delete p.worldRosterSince; }
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'cd-save-seeded.json'), seededText);
fs.writeFileSync(path.join(OUT, 'cd-save-old.json'), JSON.stringify(old));
fs.writeFileSync(path.join(OUT, 'cd-sold.json'), JSON.stringify(sold.map(m => m.name)));
console.log(`old copy: ${BUYER} lists ${sold.map(m => `${m.name} ${cm.oppRosterFor(old, BUYER).some(r => r.n === m.name) ? 'YES' : 'no'}`).join(', ')}; Best XI seeded ${cm.worldRosterXIAvg(s, BUYER)} old ${cm.worldRosterXIAvg(old, BUYER)}`);
for (let k = 3; k <= 6; k += 1) { s = playSeason(s); s = cm.startNextSeason(s); where(s, `season ${k + 1} summer`); }
console.log(`mkSaveCD: done (buyer ${BUYER}, sold ${sold.map(m => `${m.tag} ${m.name}`).join(', ')})`);
