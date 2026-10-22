/* Round 1532 fix probe (not committed): simTycoonPacks S15's dry spell bot, the
   harness's longestDrySpell copied verbatim, 50 seeds of 40 hours, on four trees:
   shipped, dear (every pack four times its price, the dear control's rewrite),
   notitle (the league can never be won: position is at least 2), and both.
   node dryprobe2.mjs <tree root> <variant> [<variant> ...] */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const TREE = path.resolve(process.argv[2]);
const VARIANTS = process.argv.slice(3);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dry-probe2-'));
const pathOf = name => path.join(TREE, 'src/lib', `${name}.ts`);
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };
const unix = p => p.split(path.sep).join('/');
async function bundle(name, academy, stadium) {
  const output = path.join(temp, `${name}.mjs`);
  await build({
    stdin: { contents: [['T', stadium], ['R', pathOf('tycoonRewards')], ['W', academy]].map(([id, file]) => `export * as ${id} from ${JSON.stringify(unix(file))};`).join('\n'), resolveDir: TREE, loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: output, logLevel: 'error', alias: { '@/lib/wonderkidFactory': academy, '@': path.join(TREE, 'src') },
  });
  return import(pathToFileURL(output).href);
}
const once = (text, from, to, what) => { const n = text.split(from).length - 1; if (n !== 1) { console.error(`${what}: ${n} of ${JSON.stringify(from)}`); process.exit(2); } return text.replace(from, () => to); };
/* A variant spec: x<k> multiplies every pack price by k; +wall adds the scorelines
   matchno rewrite (rivals gain 1.8 law points a career match, the Round 582 wall);
   +notitle makes the league unwinnable. */
const academySource = fs.readFileSync(pathOf('wonderkidFactory'), 'utf8');
const prices = [...academySource.matchAll(/price: (\d+), firstFree:/g)].map(m => m[1]);
if (prices.length !== 3) { console.error(`${prices.length} prices`); process.exit(2); }
const trees = {};
const treeFor = spec => {
  const k = Number((spec.match(/^x(\d+)/) || [])[1]);
  if (!Number.isFinite(k) || k < 1) { console.error(`bad spec ${spec}`); process.exit(2); }
  let academy = academySource;
  if (k !== 1) for (const p of prices) academy = once(academy, `price: ${p}, firstFree:`, `price: ${Number(p) * k}, firstFree:`, 'price');
  let stadium = fs.readFileSync(pathOf('stadiumTycoon'), 'utf8');
  if (spec.includes('+wall')) stadium = once(stadium, '  return divisionOf(s).rivalStrength;', '  return divisionOf(s).rivalStrength + s.matchNo * 1.8;', 'wall');
  if (spec.includes('+notitle')) stadium = once(stadium, '  const position = leaguePosition(played);', '  const position = Math.max(2, leaguePosition(played));', 'notitle');
  const tag = spec.replace(/\W/g, '_');
  const a = path.join(temp, `wonderkidFactory-${tag}.ts`); fs.writeFileSync(a, academy);
  const s = path.join(temp, `stadiumTycoon-${tag}.ts`); fs.writeFileSync(s, stadium);
  trees[spec] = [a, s, k];
};
for (const v of process.argv.slice(3)) treeFor(v);
const mulberry = seed => {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
function longestDrySpell(T, W, R, seed, hours = 40, step = 10) {
  const roll = mulberry(seed);
  let s = T.newTycoon(0);
  const a = W.newFactory(0, seed);
  let l = R.newLedger(seed);
  let last = 0;
  let longest = 0;
  let where = '';
  let titles = 0;
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
  unlock(end, 'the end of the run');
  return { longest, where, titles, gems: l.earned };
}
for (const v of VARIANTS) {
  if (!trees[v]) { console.error(`unknown variant ${v}`); process.exit(2); }
  store.clear();
  const M = await bundle(v, trees[v][0], trees[v][1]);
  const t0 = Date.now();
  const spells = Array.from({ length: 50 }, (_, i) => longestDrySpell(M.T, M.W, M.R, (i + 1) * 101));
  const mins = spells.map(x => x.longest / 60).sort((x, y) => x - y);
  const ends = {}; for (const x of spells) ends[x.where] = (ends[x.where] ?? 0) + 1;
  const r1 = x => Math.round(x * 10) / 10;
  console.log(`DRYPROBE ${v} ${JSON.stringify({ p90: r1(mins[Math.ceil(0.9 * mins.length) - 1]), median: r1(mins[25]), p10: r1(mins[4]), ends, meanTitles: r1(spells.reduce((a, b) => a + b.titles, 0) / 50), meanGems: r1(spells.reduce((a, b) => a + b.gems, 0) / 50), prices: prices.map(p => Number(p) * trees[v][2]), p75: r1(mins[37]), max: r1(mins[49]), sec: Math.round((Date.now() - t0) / 1000) })}`);
}
fs.rmSync(temp, { recursive: true, force: true });
