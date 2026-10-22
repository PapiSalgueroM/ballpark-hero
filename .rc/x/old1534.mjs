/* Round 1534 review probe (the runner lens): old saves made by the REAL base commit, continued on the head.
   Needs the base tree checked out at .rc/base (git worktree add .rc/base <sha>). Bundles the four engines from
   .rc/base and from this tree with esbuild. Two phases:
   A. identity: base made saves holding nothing that pays (no steady card, no stake, no office, no lawyer) are
      continued 4 seasons on base and on head with the same stream and a random policy (any answer, any buy except
      the paying cards, the office, the lawyer and the summer camp): every JSON and draw count must match.
   B. old saves that DO hold paying cards (bought on base, never paid there): one season on base and on head from
      the same JSON and stream. Every field but netWorth, shopCarry, purchased and heat must match, the draw counts
      must match, and Cash plus the carry must have moved by exactly the steady money (rates parsed from the card
      words), the stake payouts the feed prints, and 2 percent of Cash for an office; each stake must have left. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE_DIR = path.join(ROOT, '.rc/base');
if (!fs.existsSync(path.join(BASE_DIR, 'src/lib/nbaMyCareer.ts'))) { console.log('old1534: could not run, no .rc/base'); process.exit(2); }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'old1534-'));
const US = [
  { id: 'nba', S: 'NBA', file: 'src/lib/nbaMyCareer.ts', arch: 'NBA_ARCHETYPES', eras: 'NBA_ERAS', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress', draw: 'drawNbaEvent', retire: 'nbaShouldRetire', roll: 'nbaRollTeamQuality', buy: 'buyNbaItem' },
  { id: 'nfl', S: 'NFL', file: 'src/lib/nflMyCareer.ts', arch: 'ARCHETYPES', eras: 'NFL_ERAS', start: 'startCareer', season: 'simSeason', progress: 'progress', draw: 'drawEvent', retire: 'shouldRetire', roll: 'rollTeamQuality', buy: 'buyNflItem' },
  { id: 'mlb', S: 'MLB', file: 'src/lib/mlbMyCareer.ts', arch: 'MLB_ARCHETYPES', eras: 'MLB_ERAS', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress', draw: 'drawMlbEvent', retire: 'mlbShouldRetire', roll: 'mlbRollTeamQuality', buy: 'buyMlbItem' },
  { id: 'nhl', S: 'NHL', file: 'src/lib/nhlMyCareer.ts', arch: 'NHL_ARCHETYPES', eras: 'NHL_ERAS', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress', draw: 'drawNhlEvent', retire: 'nhlShouldRetire', roll: 'nhlRollTeamQuality', buy: 'buyNhlItem' },
];
async function bundle(dir, name) {
  const entry = path.join(TMP, `${name}-entry.ts`);
  fs.writeFileSync(entry, US.map(s => `export * as ${s.id} from '${path.join(dir, s.file).split(path.sep).join('/')}';`).join('\n'));
  const out = path.join(TMP, `${name}.mjs`);
  const built = await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(dir, 'src') }, absWorkingDir: dir, metafile: true, nodePaths: [path.join(ROOT, 'node_modules')] });
  if (Object.keys(built.metafile.inputs).some(f => /supabase/.test(f))) { console.log(`old1534: could not run, ${name} bundles a database client`); process.exit(2); }
  return import(pathToFileURL(out).href);
}
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const B = await bundle(BASE_DIR, 'base');
const CONTROL = process.env.OLD_CONTROL || '';
const H = CONTROL === 'basehead' ? B : await bundle(ROOT, 'head');
const mulberry = seed => {
  let s = seed | 0, n = 0;
  const f = () => { n += 1; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.count = () => n;
  return f;
};
const pinned = (seed, f) => { const real = Math.random; Math.random = mulberry(seed ^ 0x51ed270b); try { return f(); } finally { Math.random = real; } };
function printed(card) {
  const text = `${card.desc} ${card.effect ?? ''}`;
  let m = text.match(/Steady (\d+) percent/);
  if (m) return { rate: Number(m[1]) / 100 };
  m = text.match(/(\d+) percent chance it prints ([\d.]+)M/);
  if (m) return { chance: Number(m[1]) / 100, flat: Number(m[2]) };
  m = text.match(/(\d+) percent chance of (\d+)x/);
  if (m) return { chance: Number(m[1]) / 100, times: Number(m[2]) };
  return null;
}
const OFFICE = 'Family Office', LAWYER = 'The Lawyer Who Never Loses';
const CAREERS = Number(process.env.OLD_CAREERS || 150);
let fails = 0;
const fail = msg => { fails += 1; if (fails <= 30) console.log(`  FAIL ${msg}`); };
const itemsOf = (X, sport) => X[sport.id][`${sport.S}_SPEND_ITEMS`];
const paysCard = card => !!printed(card) || card.name === OFFICE || card.name === LAWYER;
const pick = (pol, pool) => pool[Math.floor(pol() * pool.length)];
function makeSaves(sport, k) {
  const lib = B[sport.id], its = itemsOf(B, sport);
  const positions = Object.keys(lib[sport.arch]);
  const pos = positions[k % positions.length], archs = lib[sport.arch][pos];
  const arch = archs[(k >> 2) % archs.length], era = lib[sport.eras][k % lib[sport.eras].length].id;
  const rng = mulberry(1534000 + k), pol = mulberry(99000 + k);
  const pays = k % 2 === 0;
  const saves = [];
  pinned(k, () => {
    let c = lib[sport.start](`Old ${sport.id} ${k}`, pos, arch, rng, null, era);
    let prev = null;
    for (let season = 0; season < 14 && !c.retired; season += 1) {
      const tq = lib[sport.roll](prev, rng); prev = tq;
      lib[sport.season](c, tq, rng);
      lib[sport.progress](c, rng);
      if (lib[sport.retire](c)) break;
      const ev = lib[sport.draw](c, rng);
      if (ev?.options?.length) pick(pol, ev.options).apply(c, rng);
      for (let t = 0; t < 3; t += 1) {
        const card = pick(pol, its.filter(x => x.id !== 'summer_camp' && (pays || !paysCard(x))));
        const got = lib[sport.buy](c, card.id);
        if (got) c = got.state;
      }
      if (season >= 2 && season % 3 === 2) saves.push(JSON.stringify(c));
    }
  });
  return saves;
}
function continueLife(X, sport, json, seed) {
  const lib = X[sport.id], its = itemsOf(X, sport);
  let c = JSON.parse(json);
  const rng = mulberry(seed), pol = mulberry(seed ^ 0x777);
  const trail = [];
  pinned(seed, () => {
    let prev = null;
    for (let season = 0; season < 4 && !c.retired; season += 1) {
      const tq = lib[sport.roll](prev, rng); prev = tq;
      trail.push(JSON.stringify(lib[sport.season](c, tq, rng)), JSON.stringify(c));
      trail.push(JSON.stringify(lib[sport.progress](c, rng)), JSON.stringify(c), String(rng.count()));
      if (lib[sport.retire](c)) break;
      const ev = lib[sport.draw](c, rng);
      if (ev?.options?.length) { const o = pick(pol, ev.options); trail.push(ev.id, o.label, JSON.stringify(o.apply(c, rng) ?? null), JSON.stringify(c)); }
      for (let t = 0; t < 2; t += 1) {
        const card = pick(pol, its.filter(x => x.id !== 'summer_camp' && !paysCard(x)));
        const got = lib[sport.buy](c, card.id);
        trail.push(card.id, got ? 'y' : 'n');
        if (got) { c = got.state; trail.push(JSON.stringify(c)); }
      }
      trail.push(String(rng.count()));
    }
  });
  return trail;
}
function oneSeason(X, sport, json, seed) {
  const lib = X[sport.id], c = JSON.parse(json), rng = mulberry(seed);
  let notes = [];
  pinned(seed, () => { const tq = lib[sport.roll](null, rng); lib[sport.season](c, tq, rng); notes = lib[sport.progress](c, rng); });
  return { c, notes, draws: rng.count() };
}

for (const sport of US) {
  const its = itemsOf(H, sport);
  const steadyOf = held => its.reduce((sum, card) => { const p = printed(card); const n = held.filter(id => id === card.id).length; return p?.rate && n ? sum + card.cost * p.rate * (card.oneTime ? 1 : n) : sum; }, 0);
  const stakeIds = new Set(its.filter(card => printed(card)?.chance).map(card => card.id));
  const officeId = its.find(card => card.name === OFFICE).id, lawyerId = its.find(card => card.name === LAWYER).id;
  let aCompared = 0, aParted = 0, bCompared = 0, bBad = 0, bStrict = 0, stakesSettled = 0, stakeWins = 0, maxHeld = 0;
  const diffFields = new Map();
  let sumGot = 0, sumWant = 0;
  for (let k = 0; k < CAREERS; k += 1) {
    for (const [si, json] of makeSaves(sport, k).entries()) {
      const c0 = JSON.parse(json), held = c0.purchased ?? [];
      const holdsPay = held.some(id => its.some(card => card.id === id && paysCard(card)));
      const seed = 424242 + k * 31 + si;
      if (!holdsPay) {
        const a = continueLife(B, sport, json, seed), b = continueLife(H, sport, json, CONTROL === 'seeda' ? seed + 1 : seed);
        aCompared += 1;
        const first = a.findIndex((x, i) => x !== b[i]);
        if (first >= 0 || a.length !== b.length) { aParted += 1; fail(`A ${sport.id} ${k}/${si}: parts at record ${first} of ${a.length}`); }
        continue;
      }
      bCompared += 1;
      maxHeld = Math.max(maxHeld, held.filter(id => stakeIds.has(id)).length);
      const b = oneSeason(B, sport, json, seed), h = oneSeason(H, sport, json, seed);
      const bad = [];
      if (b.draws !== h.draws) bad.push(`draws ${b.draws} vs ${h.draws}`);
      const lawyerHeat = held.includes(lawyerId) && (c0.heat ?? 0) > 0;
      if (!lawyerHeat) {
        bStrict += 1;
        for (const key of new Set([...Object.keys(b.c), ...Object.keys(h.c)])) {
          if (['netWorth', 'shopCarry', 'purchased'].includes(key)) continue;
          if (JSON.stringify(b.c[key]) !== JSON.stringify(h.c[key])) { bad.push(`field ${key}`); diffFields.set(key, (diffFields.get(key) ?? 0) + 1); }
        }
      } else if (b.c.heat === Math.max(0, (c0.heat ?? 0) - 9) && h.c.heat !== Math.max(0, (c0.heat ?? 0) - 18)) bad.push(`lawyer heat ${c0.heat} to ${h.c.heat} (base ${b.c.heat})`);
      const stakeLines = h.notes.filter(t => /^(🎰|💸) Your /.test(t));
      const heldStakes = held.filter(id => stakeIds.has(id)).length;
      if (stakeLines.length !== heldStakes) bad.push(`${stakeLines.length} stake lines for ${heldStakes} stakes`);
      const payouts = stakeLines.filter(t => t.startsWith('🎰')).reduce((s, t) => s + Number((t.match(/: \$([\d.]+)M back/) || [0, NaN])[1]), 0);
      stakesSettled += heldStakes; stakeWins += stakeLines.filter(t => t.startsWith('🎰')).length;
      const wantHeld = (b.c.purchased ?? []).filter(id => !stakeIds.has(id));
      if (JSON.stringify(h.c.purchased ?? []) !== JSON.stringify(wantHeld)) bad.push('purchased after settle');
      const steady = steadyOf(held);
      const cashBase = (b.c.netWorth ?? 0) + payouts;
      const office = held.includes(officeId) && cashBase + steady > 0 ? (cashBase + steady) * 0.02 : 0;
      const want = payouts + steady + office, got = (h.c.netWorth ?? 0) + (h.c.shopCarry ?? 0) - (b.c.netWorth ?? 0);
      sumGot += got; sumWant += want;
      if (Math.abs(got - want) > 1.5e-4) bad.push(`Cash moved ${got.toFixed(4)}, the cards print ${want.toFixed(4)} (steady ${steady.toFixed(4)}, stakes ${payouts}, office ${office.toFixed(4)})`);
      if (h.c.netWorth !== undefined && Math.abs(h.c.netWorth * 10 - Math.round(h.c.netWorth * 10)) > 1e-9) bad.push(`Cash ${h.c.netWorth} not in tenths`);
      if (bad.length) { bBad += 1; fail(`B ${sport.id} ${k}/${si}: ${bad.join('; ')}`); }
    }
  }
  console.log(`${sport.id}: A ${aCompared} old saves holding nothing that pays, continued 4 seasons, ${aParted} parted; B ${bCompared} old saves holding paying cards (${bStrict} compared field by field), ${bBad} wrong; ${stakesSettled} stakes settled (${stakeWins} won, at most ${maxHeld} held by one save); Cash moved ${sumGot.toFixed(2)} against ${sumWant.toFixed(2)} printed; fields that differed: ${JSON.stringify(Object.fromEntries(diffFields))}`);
}
console.log(fails ? `old1534: red, ${fails} failures` : 'old1534: green');
process.exit(fails ? 1 : 0);
