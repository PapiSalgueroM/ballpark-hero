/* Round 1532 probe (not committed): simTycoonPacks S15's dry spell bot (longestDrySpell
   copied verbatim) on a tree, with the shipped prices and with every pack at four times
   its price (the `dear` control's rewrite), 50 seeds of 40 hours. Prints the p90 and
   median longest stretch and what ended the stretches, and how many titles a run won.
   node dryprobe.mjs <tree root> <label> */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const TREE = path.resolve(process.argv[2]);
const LABEL = process.argv[3] ?? TREE;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-probe-'));
const pathOf = name => path.join(TREE, 'src/lib', `${name}.ts`);
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); } };
async function bundle(name, academy) {
  const output = path.join(temp, `${name}.mjs`);
  await build({
    stdin: { contents: [['T', pathOf('stadiumTycoon')], ['R', pathOf('tycoonRewards')], ['W', academy]].map(([id, file]) => `export * as ${id} from ${JSON.stringify(file.split(path.sep).join('/'))};`).join('\n'), resolveDir: TREE, loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: output, logLevel: 'error', alias: { '@/lib/wonderkidFactory': academy, '@': path.join(TREE, 'src') },
  });
  return import(pathToFileURL(output).href);
}
const live = await bundle('live', pathOf('wonderkidFactory'));
let dearSource = fs.readFileSync(pathOf('wonderkidFactory'), 'utf8');
for (const pack of live.W.PACKS) dearSource = dearSource.replace(new RegExp(`(id: '${pack.id}',[^\\n]*?price: )${pack.price}(, firstFree:)`), (_, a, b) => `${a}${pack.price * 4}${b}`);
const dearPath = path.join(temp, 'wonderkidFactory-dear.ts');
fs.writeFileSync(dearPath, dearSource);
const dear = await bundle('dear', dearPath);
function mulberry(seed) { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function longestDrySpell(T, W, R, seed, hours = 40, step = 10) {
  const roll = mulberry(seed);
  let s = T.newTycoon(0);
  const a = W.newFactory(0, seed);
  let l = R.newLedger(seed);
  let last = 0; let longest = 0; let where = ''; let titles = 0;
  const unlock = (t, what) => { if (t - last > longest) { longest = t - last; where = what; } last = t; };
  let affordable = false;
  const end = hours * 3600;
  for (let t = step; t <= end; t += step) {
    const before = { rep: s.rep, titles: s.leagueTitles ?? 0, ach: (s.ach ?? []).length, claimed: (s.claimed ?? []).length, region: a.rep };
    const r = T.tick(s, step, roll);
    s = r.state;
    const ft = r.events.find(e => e.kind === 'win' || e.kind === 'draw' || e.kind === 'loss');
    if (ft) {
      const season = r.events.find(e => (e.kind === 'title' || e.kind === 'seasonEnd') && e.position !== undefined);
      l = R.creditFullTimes(l, [{ totalMatches: s.totalMatches, result: ft.kind, away: false, position: season?.position }]);
    }
    for (let guard = 0; guard < 40; guard += 1) {
      const full = T.attendance(s) >= T.capacity(s) - 5;
      const opts = T.TRACKS.filter(tr => T.canBuy(s, tr.id)).sort((x, y) => T.costOf(s, x.id) * (full && x.id === 'stands' ? 0.55 : 1) - T.costOf(s, y.id) * (full && y.id === 'stands' ? 0.55 : 1));
      if (!opts.length) break;
      s = T.buy(s, opts[0].id);
    }
    if (T.canPrestige(s)) s = T.prestige(s, 0);
    W.tick(a, step);
    for (const k of [...a.prospects]) if (k.rating >= k.potential - 0.5 || k.age >= 22) W.sellProspect(a, k.id);
    for (const fac of [...W.FACILITIES].sort((x, y) => W.facilityCost(a, x.id) - W.facilityCost(a, y.id))) W.buyFacility(a, fac.id);
    if (W.canMoveUp(a)) W.moveUp(a);
    const cheapest = Math.min(...W.PACKS.map(p => R.priceOf(l, p.id)));
    const nowAffordable = R.balance(l) >= cheapest && W.bedFree(a) && l.pending === null;
    if (nowAffordable && !affordable) unlock(t, 'a pack');
    affordable = nowAffordable;
    if (nowAffordable) {
      const id = [...W.PACKS].reverse().find(p => R.canOpen(l, p.id, W.bedFree(a)))?.id;
      const next = id ? R.openPack(l, id, true, (lo, hi, rng) => W.makeProspectInBand({ ...a, prospects: [...a.prospects] }, lo, hi, rng), (a.packsDelivered ?? 0) + 1) : null;
      if (next) { W.deliverPack(a, next.pending.seq, next.pending.kid, next.pending.tier); l = { ...next, pending: null }; affordable = false; }
    }
    if (s.rep > before.rep) unlock(t, 'a star');
    if ((s.leagueTitles ?? 0) > before.titles) { unlock(t, 'a title'); titles += 1; }
    if ((s.ach ?? []).length > before.ach) unlock(t, 'a badge');
    if ((s.claimed ?? []).length > before.claimed) unlock(t, 'a milestone');
    if (a.rep > before.region) unlock(t, 'a region');
  }
  return { longest, where, titles };
}
const out = { label: LABEL };
for (const [name, M] of [['shipped', live], ['dear', dear]]) {
  const spells = Array.from({ length: 50 }, (_, i) => longestDrySpell(M.T, M.W, M.R, (i + 1) * 101));
  const mins = spells.map(x => x.longest / 60).sort((x, y) => x - y);
  const ends = {}; for (const x of spells) ends[x.where] = (ends[x.where] ?? 0) + 1;
  out[name] = { p90: Math.round(mins[Math.ceil(0.9 * mins.length) - 1] * 10) / 10, median: Math.round(mins[25] * 10) / 10, ends, meanTitles: spells.reduce((a, b) => a + b.titles, 0) / spells.length };
}
console.log(`DRYPROBE ${JSON.stringify(out)}`);
fs.rmSync(temp, { recursive: true, force: true });
