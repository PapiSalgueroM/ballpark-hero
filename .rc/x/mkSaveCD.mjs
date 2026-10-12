// Reviewer facts-screens-weight, Release AZ. Never committed. Run from the repo root on a runner:
//   node .rc/x/mkSaveCD.mjs   (writes cd-save-seeded.json and cd-save-old.json into $RC_OUT)
// Builds a SEEDED Everton career through the game's own functions: sells his best young real player to the
// board's rival through acceptBid (sale A), plays season 1, promotes an academy prospect at the rollover and
// sells HIM to the rival too (sale B), then plays on to SEASONS. Prints what the rival's roster shows for both
// men (name, age, rating, made up flag) on the seeded save and on the same save with seed and ledger taken off.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const ROOT = process.cwd();
const OUT = process.env.RC_OUT || '.tmp-fx';
const SEASONS = Number(process.env.CD_SEASONS || 4);
const NOW = 1791633600000;
const out = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as ledger from './src/lib/clubManagerWorldRoster';\n", resolveDir: ROOT, loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', logLevel: 'silent',
  alias: { '@': path.join(ROOT, 'src') } });
const module = { exports: {} }; const store = new Map();
class D extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
function seeded(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let v = s; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; }; }
const MathX = Object.create(Math); MathX.random = seeded(0xc0ffee);
const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math: MathX, Date: D,
  URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval, performance,
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
new vm.Script(out.outputFiles[0].text).runInContext(ctx);
const { cm, eras, ledger } = module.exports;
await eras.ensureAllEraRosters();
const fail = m => { console.log(`mkSaveCD: ABORT ${m}`); process.exit(2); };
const playSeason = s => { for (let i = 0; i < 400; i += 1) { const r = cm.playNextEntry(s, { skipHalftime: true, noCoach: true }); s = r.state; if (r.kind === 'seasonOver') break; } return cm.finishSeason(s).state; };
const sell = (s, p, club) => {
  const t = { ...s, incomingBids: [...(s.incomingBids ?? []), { playerId: p.id, playerName: p.name, club, offer: Math.max(1, p.value ?? 5), status: 'open' }] };
  const r = cm.acceptBid(t, p.id); if (!r) fail(`acceptBid refused ${p.name}`); return r;
};
let s = cm.startCareer('Everton');
if (s.worldSeed === undefined) fail('a new career carries no worldSeed');
const rival = s.boardObjectives?.find(o => o.id === 'rival')?.rivalName ?? 'Liverpool';
const a = [...s.squad].filter(p => !p.isYouth && p.position !== 'GK' && p.age <= 25).sort((x, y) => y.rating - x.rating)[0];
if (!a) fail('no young real player to sell');
s = sell(s, a, rival);
const recA = ledger.readWorldRoster(s)?.records.find(r => r.player.name === a.name);
console.log(`sale A: ${a.name} (${a.position}, ${a.age}, ${a.rating}) to ${rival}; ledger record ${recA ? `${recA.status} ${recA.owner}` : 'NONE'}`);
s = playSeason(s);
s = cm.startNextSeason(s);
const prospects = [...(s.academy?.prospects ?? [])].sort((x, y) => x.fee - y.fee);
let b = null;
for (const pr of prospects) { const t = cm.promoteProspect(s, pr.id); if (t) { s = t; b = s.squad.find(p => p.name === pr.name); break; } }
if (!b) {
  b = s.squad.find(p => p.isYouth || p.academyGrad);
  console.log(`no prospect could be promoted (${prospects.length} in the academy); using ${b ? b.name : 'nobody'}`);
}
if (b) {
  console.log(`academy player: ${b.name} (${b.position}, ${b.age}, ${b.rating}) generated=${b.generated === true} academyGrad=${b.academyGrad === true} isYouth=${b.isYouth === true}`);
  s = sell(s, b, rival);
  const recB = ledger.readWorldRoster(s)?.records.find(r => r.player.name === b.name);
  console.log(`sale B: ${b.name} to ${rival}; ledger record ${recB ? `${recB.status} ${recB.owner} generated=${recB.player.generated === true}` : 'NONE'}`);
}
for (let k = 2; k <= SEASONS; k += 1) { s = playSeason(s); if (s.sacked) console.log(`sacked after season ${k}`); s = cm.startNextSeason(s); }
console.log(`now season ${s.season}, club ${s.clubName}, yearsOn ${cm.yearsOn(s)}, ledger ${ledger.readWorldRoster(s)?.records.length ?? 0} records`);
cm.saveCareer(s);
const seededText = store.get(cm.SAVE_KEY);
if (!seededText) fail('saveCareer wrote nothing');
const old = JSON.parse(seededText); delete old.worldSeed; delete old.worldRoster;
for (const p of old.squad ?? []) { delete p.worldRosterKey; delete p.worldRosterSince; }
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'cd-save-seeded.json'), seededText);
fs.writeFileSync(path.join(OUT, 'cd-save-old.json'), JSON.stringify(old));
fs.writeFileSync(path.join(OUT, 'cd-sold.json'), JSON.stringify([a.name, ...(b ? [b.name] : [])]));
const show = (state, tag) => {
  const ro = cm.oppRosterFor(state, rival);
  for (const m of [a, b].filter(Boolean)) {
    const row = ro.find(r => r.n === m.name);
    console.log(`${tag}: ${rival} lists ${m.name}: ${row ? `age ${row.a}, rating ${row.r}, made up tag ${row.g === true}` : 'NOT LISTED'}`);
  }
  const t0 = performance.now(); for (let i = 0; i < 5; i += 1) { cm.oppRosterFor(state, rival); cm.worldRosterXIAvg(state, rival); }
  console.log(`${tag}: ${rival} Best XI ${cm.worldRosterXIAvg(state, rival)}, squad ${ro.length}; the screen's two reads ${((performance.now() - t0) / 5).toFixed(1)} ms`);
};
show(s, 'seeded');
show(old, 'old');
const mk = cm.buildMarket ? (() => { const t0 = performance.now(); cm.buildMarket(s); return (performance.now() - t0).toFixed(0); })() : 'n/a';
console.log(`buildMarket on the seeded save: ${mk} ms; save ${seededText.length} code units, ${Buffer.byteLength(seededText, 'utf8')} bytes`);
console.log(`mkSaveCD: done (rival ${rival}, sale A ${a.name}, sale B ${b ? b.name : 'none'})`);
