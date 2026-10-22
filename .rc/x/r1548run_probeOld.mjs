/* Reviewer probe (round 1548, run lens): old saves made by the BASE engine load on the branch,
   the default paths are identical, and hostile saves still fail closed. Offline: the database
   client is a stub that throws. Needs the base tree at $BASE_TREE (default /tmp/base). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BASE = process.env.BASE_TREE || '/tmp/base';
const DAYS = Number(process.env.PROBE_DAYS || 45);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe-old-'));
const noDb = {
  name: 'no-db',
  setup(b) {
    b.onResolve({ filter: /integrations\/supabase\/client$/ }, () => ({ path: 'stub', namespace: 'no-db' }));
    b.onLoad({ filter: /.*/, namespace: 'no-db' }, () => ({
      contents: "export const SUPABASE_URL=''; export const SUPABASE_PUBLISHABLE_KEY=''; export const supabase=new Proxy({}, { get(){ throw new Error('no db'); } });",
      loader: 'js',
    }));
  },
};
async function bundle(root, name) {
  const entry = path.join(tmp, `${name}-entry.mjs`);
  fs.writeFileSync(entry, `export * from '${path.join(root, 'src/lib/hallOfChampions.ts').split(path.sep).join('/')}';\n`);
  const out = path.join(tmp, `${name}.mjs`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')], plugins: [noDb] });
  return import(pathToFileURL(out).href);
}
const base = await bundle(BASE, 'base');
const br = await bundle(ROOT, 'branch');
if (typeof br.advanceClock !== 'function' || typeof base.advanceClock === 'function') {
  console.error('probeOld: ABORTED, the base tree is not the pre round engine or the branch lacks advanceClock');
  process.exit(1);
}
const SIZES = { sb: 60, wnba: 29, cfb: 49, nba: 80, cbb: 87, cup: 110, ws: 121, epl: 127, nrl: 117, afl: 129 };
const rows = () => new Map(Object.entries(SIZES).map(([k, n]) => [k, Array.from({ length: n }, (_, i) => ({ year: 1890 + i, team: `Fixture ${k} ${i + 1}` }))]));
const wB = base.buildCatalog(rows());
const wR = br.buildCatalog(rows());
let fails = 0;
const fail = m => { fails += 1; if (fails <= 12) console.error('  FAIL: ' + m); };
const clone = s => JSON.parse(JSON.stringify(s));
const noMeter = t => { const o = JSON.parse(t); delete o.awayMs; return JSON.stringify(o); };
let rng = 1;
const rand = () => { rng = (rng * 1103515245 + 12345) % 2147483648; return rng / 2147483648; };

const c = { snaps: 0, sameLoad: 0, baseRefused: 0, deepLoaded: 0, offline: 0, visible: 0, rollback: 0, rollbackDeep: 0 };
for (const [career, redP] of [[1, 0], [2, 0.002], [3, 0.02], [4, 0.0005]]) {
  rng = career * 7919;
  const s = base.freshState(career * 1000 + 7);
  let wall = 1_800_000_000_000;
  for (let t = 0; t < DAYS * 86400; t += 60) {
    base.tick(wB, s, 60);
    wall += 60_000;
    if (rand() < 0.3) base.startRush(s);
    if (redP && base.canRededicate(s) && rand() < redP) base.rededicate(s);
    for (let g = 0; g < 500; g++) {
      const shut = wB.find(w => !s.openWings.includes(w.key));
      if (shut && base.canOpenWing(shut, s)) { base.openWing(shut, s); continue; }
      let best = null, bc = Infinity;
      for (const w of wB) {
        if (!s.openWings.includes(w.key)) continue;
        const n = s.owned[w.key] ?? 0;
        if (n >= w.artifacts.length) continue;
        const k = base.artifactCost(w, n, s);
        if (k < bc) { best = w; bc = k; }
      }
      if (best && base.canBuyArtifact(best, s)) { base.buyArtifact(best, s); continue; }
      const up = base.UPGRADES.filter(u => base.canBuyUpgrade(u.id, s)).sort((a, b) => base.upgradeCost(a, s.levels[a.id]) - base.upgradeCost(b, s.levels[b.id]))[0];
      if (up && (!best || base.upgradeCost(up, s.levels[up.id]) < bc / 10)) { base.buyUpgrade(up.id, s); continue; }
      break;
    }
    if (t % 3600 !== 0) continue;
    c.snaps += 1;
    const text = base.serialize(s, wall);
    const bl = base.loadSave(text);
    const rl = br.loadSave(text);
    if (bl) {
      if (JSON.stringify(rl) === JSON.stringify(bl)) c.sameLoad += 1; else fail(`career ${career} day ${(t / 86400).toFixed(2)}: an old save loads differently on the branch`);
    } else {
      c.baseRefused += 1;
      if (rl && JSON.stringify(rl) === JSON.stringify({ state: s, lastSeen: wall })) c.deepLoaded += 1; else fail(`career ${career} day ${(t / 86400).toFixed(2)}: a save base refused (funds ${s.funds.toExponential(2)}) does not load intact on the branch`);
    }
    if (!bl || t % (3600 * 12) !== 0) continue;
    for (const away of [61, 3600, 28800, 28801, 200000]) {
      const sb = clone(bl.state), sr = clone(rl.state);
      const pb = base.offlineReport(wB, sb, away), pr = br.offlineReport(wR, sr, away);
      if (pb.earned !== pr.earned || pb.capped !== pr.capped || base.serialize(sb, 5) !== noMeter(br.serialize(sr, 5))) fail(`career ${career}: the load welcome for ${away}s differs (${pb.earned} vs ${pr.earned})`);
      else c.offline += 1;
    }
    const sb = clone(bl.state), sr = clone(rl.state);
    for (let i = 0; i < 40; i++) { base.tick(wB, sb, 0.25); br.advanceClock(wR, sr, 250, true); }
    if (base.serialize(sb, 5) !== noMeter(br.serialize(sr, 5)) || sr.awayMs !== 0) fail(`career ${career}: ten watched seconds differ from the base clock`);
    else c.visible += 1;
    const back = base.loadSave(br.serialize(sr, 9));
    if (back && back.state.funds === sr.funds && JSON.stringify(back.state.owned) === JSON.stringify(sr.owned)) c.rollback += 1;
    else if (sr.funds > 1e15 || sr.careerEarned > 1e18) c.rollbackDeep += 1;
    else fail(`career ${career}: a branch save does not load on the base build`);
  }
  console.log(`   career ${career} (rededicate p=${redP}): ${base.totalArtifacts(s)} exhibits, renown ${s.renown}, rededications ${s.rededications}, funds ${s.funds.toExponential(2)}, career ${s.careerEarned.toExponential(2)}`);
}
console.log(`   ${c.snaps} hourly saves from the base engine: ${c.sameLoad} load byte for byte as on base, ${c.baseRefused} base refused and ${c.deepLoaded} of them load intact on the branch`);
console.log(`   load welcome identical in ${c.offline} checks; watched clock identical in ${c.visible}; branch saves load on base in ${c.rollback} (${c.rollbackDeep} too deep for base)`);
if (c.baseRefused < 100 || c.offline < 20 || c.visible < 5) fail(`the fleet did not exercise the paths (${JSON.stringify(c)})`);

/* hostile saves: simHallOfChampions section 0's list plus the new field and the wider loader */
const good = { ...br.freshState(7), funds: 500, owned: { sb: 3 }, openWings: ['sb'], plaques: [] };
const raw = (s, extra = '') => JSON.stringify({ ...s, lastSeen: 1_700_000_000_000 }).replace(/}$/, extra + '}');
const hostile = [
  ['null literal', 'null'], ['empty string', ''], ['not json', '{{{'], ['array root', '[1]'],
  ['wrong version', raw({ ...good, v: 99 })], ['negative funds', raw({ ...good, funds: -5 })],
  ['infinite funds', raw({ ...good, funds: Infinity })], ['renown past the cap', raw({ ...good, renown: br.MAX_RENOWN + 1 })],
  ['unknown wing key', raw({ ...good, owned: { ...good.owned, nfl2: 4 } })], ['fractional exhibits', raw({ ...good, owned: { sb: 2.5 } })],
  ['upgrade past its max', raw({ ...good, levels: { ...good.levels, tours: 999 } })], ['unknown wing open', raw({ ...good, openWings: ['sb', 'made-up'] })],
  ['negative career', raw({ ...good, careerEarned: -1 })], ['string funds', raw({ ...good, funds: '5' })],
  ['funds 1e400 text', raw(good).replace('"funds":500', '"funds":1e400')], ['career 1e400 text', raw(good).replace(/"careerEarned":0/, '"careerEarned":1e400')],
  ['NaN funds', raw({ ...good, funds: NaN })],
];
let hostileOk = 0;
for (const [name, r] of hostile) { if (br.loadSave(r) !== null) fail(`hostile save (${name}) loads on the branch`); else hostileOk += 1; }
const meterCases = [['absent', undefined, undefined], ['junk string', '"x"', 0], ['negative', '-5', 0], ['huge', '1e20', 28_800_000], ['null', 'null', 0], ['fine', '1234', 1234], ['1e400', '1e400', 0]];
let meterOk = 0;
for (const [name, v, want] of meterCases) {
  const r = v === undefined ? raw(good) : raw(good, `,"awayMs":${v}`);
  const l = br.loadSave(r);
  if (!l) fail(`a save with awayMs ${name} was refused`);
  else if (l.state.awayMs !== want) fail(`awayMs ${name} loaded as ${l.state.awayMs}, want ${want}`);
  else meterOk += 1;
}
const big = br.loadSave(raw({ ...good, funds: 1.7e308, careerEarned: 1.7e308 }));
console.log(`   ${hostileOk} of ${hostile.length} hostile saves refused; ${meterOk} of ${meterCases.length} meter repairs right; a save at 1.7e308 ${big ? 'loads' : 'is refused'}`);
console.log(fails ? `probeOld: RED, ${fails} failure(s)` : 'probeOld: green');
process.exit(fails ? 1 : 0);
