/** Round 588: exact fees, title receipts and real match outcomes.
 * Controls change one executable anchor in a unique OS temp copy.
 * The fee oracle is frozen before this round; edge assertions use the published
 * arithmetic and separating rolls, not a statistical significance shortcut.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { feeBeforeGear } from './fixtures/tycoonGear587Fee.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tycoon-gear-'));
const NOW = 1767225600000;
const CONTROL = process.env.GEAR_CONTROL || '';
const failures = [];
const store = new Map();
let blockedKey = null;
const writes = [];
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => {
    writes.push(key);
    if (key === blockedKey) throw new Error('deliberately refused storage write');
    store.set(key, String(value));
  },
  removeItem: key => store.delete(key),
  clear: () => store.clear(),
};
const clone = value => structuredClone(value);
const close = (got, want, label) => assert(Math.abs(got - want) < 1e-12, `${label}: ${got} != ${want}`);
const gear = l => ({ unlocked: l.gearUnlocked ?? [], levels: l.gearLevel ?? {}, kits: l.kitUpgrades ?? 0, titles: l.gearTitles ?? Array(10).fill(0) });
const player = (rating = 75, id = 'sr-gear-0') => ({ id, name: `Gear Graduate ${id.slice(-1)}`, nation: 'England', pos: 'MF', age: 27, ageClock: 0, rating, potential: 99 });
const alternating = middle => { let calls = 0; return () => (++calls % 2 ? 1 : middle); };
function rng(seed) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length - 1, 1, 'control must match one executable anchor');
  const changed = source.replace(before, after);
  assert.notEqual(changed, source, 'control must change the executable source');
  console.log(`CONTROL ${CONTROL}: one unique executable mutation applied`);
  return changed;
}

const controls = {
  order: { file: 'src/lib/soccerBootIds.ts', section: 'catalog', before: '  "vortex_strike",\n  "vortex_ghost",', after: '  "vortex_ghost",\n  "vortex_strike",' },
  catalog: { file: 'src/lib/soccerBoots.ts', section: 'catalog', before: '{ id: BOOT_IDS[0],', after: '{ id: BOOT_IDS[1],' },
  fee: { file: 'src/lib/wonderkidFactory.ts', section: 'fees', before: 'basePrice(p.rating, p.potential, p.age, p.pos)', after: 'basePrice(p.rating + ("bootId" in p && p.bootId ? 1 : 0), p.potential, p.age, p.pos)' },
  edge: { file: 'src/lib/wonderkidFactory.ts', section: 'consumers', before: 'const effectiveRating = Math.min(99, p.rating + level);', after: 'const effectiveRating = Math.min(99, p.rating);' },
  cap: { file: 'src/lib/wonderkidFactory.ts', section: 'edge', before: 'const effectiveRating = Math.min(99, p.rating + level);', after: 'const effectiveRating = p.rating + level;' },
  duplicate: { file: 'src/lib/wonderkidFactory.ts', section: 'equipment', before: 'p.bootId && !worn.has(p.bootId) ? bootLevel(levels, p.bootId) : 0', after: 'p.bootId ? bootLevel(levels, p.bootId) : 0' },
  repeat: { file: 'src/lib/tycoonRewards.ts', section: 'schedule', before: 'ft.totalMatches <= out.lastMatch', after: 'ft.totalMatches < out.lastMatch' },
  title: { file: 'src/lib/tycoonRewards.ts', section: 'schedule', before: 'allowGear && !ft.away && ft.position === 1 &&', after: 'allowGear && !ft.away &&' },
  summit: { file: 'src/lib/tycoonRewards.ts', section: 'schedule', before: '(!titles[division] || division === GEAR_DIVISIONS - 1)', after: '(!titles[division])' },
  pack: { file: 'src/lib/tycoonRewards.ts', section: ['packs', 'source writers'], before: 'spent: l.spent + priceOf(l, id),', after: 'spent: l.spent + priceOf(l, id), gearUnlocked: [BOOT_IDS[0]], gearLevel: { [BOOT_IDS[0]]: 1 },' },
  upgrade: { file: 'src/lib/tycoonRewards.ts', section: 'upgrades', before: 'kitUpgrades: l.kitUpgrades! - 1', after: 'kitUpgrades: l.kitUpgrades!' },
  locked: { file: 'src/lib/wonderkidFactory.ts', section: 'equipment', before: 'if (!BOOT_IDS.some(bootId => bootId === id) || !Object.prototype.hasOwnProperty.call(levels, id)) return 0;', after: 'if (!Object.prototype.hasOwnProperty.call(levels, id)) return 0;' },
  save: { file: 'src/lib/tycoonRewards.ts', section: 'durability', before: 'if (mustPersist) throw error;', after: 'if (false) throw error;' },
  cache: { file: 'src/lib/tycoonRewards.ts', section: 'durability', before: 'if (memoryOnly && cached) {', after: 'if (memoryOnly && cached) { return cached.ledger;' },
  writer: { file: 'src/lib/wonderkidFactory.ts', section: 'source writers', before: 'v: SAVE_VERSION,', after: 'v: SAVE_VERSION, gearUnlocked: [BOOT_IDS[0]],' },
};
assert(!CONTROL || CONTROL in controls, `unknown GEAR_CONTROL=${CONTROL}`);
let selected = null;
if (CONTROL) {
  const c = controls[CONTROL];
  const original = path.join(ROOT, c.file);
  const copy = path.join(TEMP, path.basename(original));
  fs.writeFileSync(copy, replaceOnce(fs.readFileSync(original, 'utf8').replaceAll('\r\n', '\n'), c.before, c.after));
  selected = { original: path.resolve(original), copy, sections: Array.isArray(c.section) ? c.section : [c.section] };
}
const out = path.join(TEMP, 'engines.mjs');
await build({
  stdin: { contents: [
    "export * as W from '@/lib/wonderkidFactory';",
    "export * as R from '@/lib/tycoonRewards';",
    "export * as T from '@/lib/stadiumTycoon';",
    "export { BOOT_IDS } from '@/lib/soccerBootIds';",
    "export { BOOTS } from '@/lib/soccerCareerAppearance';",
  ].join('\n'), loader: 'ts', resolveDir: ROOT },
  outfile: out, platform: 'node', format: 'esm', bundle: true, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  plugins: selected ? [{ name: 'temporary-control', setup(b) { b.onLoad({ filter: /\.tsx?$/ }, args => path.resolve(args.path) === selected.original ? { contents: fs.readFileSync(selected.copy, 'utf8'), loader: 'ts', resolveDir: path.dirname(args.path) } : undefined); } }] : [],
});
const { W, R, T, BOOTS, BOOT_IDS } = await import(pathToFileURL(out).href);
const ids = BOOTS.map(b => b.id);
const title = (match, division, extra = {}) => ({ totalMatches: match, result: 'win', away: false, position: 1, division, ...extra });
const award = (l, match, division, extra) => R.creditFullTimes(l, [title(match, division, extra)]);
const unlocked = (count = 18) => {
  let l = R.newLedger(588);
  for (let i = 0; i < count; i++) l = award(l, i + 1, Math.min(i, 9));
  return l;
};
async function check(name, work) {
  if (selected && !selected.sections.includes(name)) return;
  try { console.log(`PASS ${name}: ${await work()}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.stack ?? error.message}`); }
}

await check('catalog', () => {
  assert.deepEqual(BOOT_IDS, ids, 'Every ordered engine boot ID has exactly one complete visible record');
  assert.equal(new Set(ids).size, ids.length, 'Boot IDs are unique');
  assert.equal(createHash('sha256').update(JSON.stringify(BOOTS)).digest('hex'), '938a2d682bfb78a4dd7562dc1cf7d049ce6143995dd9479a05c078f7772be8c4', 'Complete boot catalog preserves frozen pre-split IDs, order and visible details');
  assert(BOOTS.every(b => b.label && b.color && b.flavor), 'Every boot retains visible details');
  return `${ids.length} ordered unique engine IDs match all visible records`;
});

await check('fees', () => {
  const a = W.newFactory(NOW, 588);
  let quotes = 0;
  for (const context of [{ rep: 0, agents: 0, deadline: 0 }, { rep: 60, agents: 12, deadline: 1 }]) {
    a.rep = context.rep; a.levels.agents = context.agents; a.deadlineLeft = context.deadline;
    for (let rating = 30; rating <= 99; rating += 0.5) for (let potential = Math.max(45, Math.ceil(rating)); potential <= 99; potential++) {
      for (let age = 18; age <= 34; age++) for (const pos of ['GK', 'DF', 'MF', 'FW']) {
        const p = { ...player(rating), potential, age, pos };
        const baseline = feeBeforeGear(a, p);
        assert.equal(W.salePrice(a, p), baseline, 'bare fee differs from frozen pre588 value');
        for (const bootId of ids) {
          assert.equal(W.salePrice(a, { ...p, bootId }), baseline, `boot changes fee: ${rating}/${potential}/${age}/${pos}/${bootId}`);
          quotes++;
        }
      }
    }
  }
  return `${quotes.toLocaleString('en-US')} geared quotes equal the independent frozen curve; half-point ratings30..99, all legal ceilings, ages18..34, four positions, every boot, ordinary/max-reputation deadline contexts`;
});

await check('edge', () => {
  const a = W.newFactory(NOW, 588), l = unlocked();
  let increments = 0, saturated = 0, transitions = 0;
  for (const id of ids) for (let rating = 30; rating <= 99; rating += 0.25) {
    a.firstTeam = [{ ...player(rating), bootId: id }];
    for (let level = 0; level <= 3; level++) {
      const levels = level ? { ...l.gearLevel, [id]: level } : {};
      const got = W.squadEdge(a, levels);
      const expected = Math.max(0, Math.min(99, rating + level) - 60) * 0.002;
      close(got, expected, `${rating}/${id}/${level}`);
      if (level) {
        const prev = W.squadEdge(a, level > 1 ? { ...levels, [id]: level - 1 } : {});
        const step = got - prev;
        if (Math.abs(step - 0.002) < 1e-12) increments++;
        else if (Math.abs(step) < 1e-12) saturated++;
        else transitions++;
      }
    }
  }
  a.firstTeam = ids.slice(0, 5).map((id, i) => ({ ...player(99, `sr-top-${i}`), bootId: id }));
  close(W.squadEdge(a, Object.fromEntries(ids.map(id => [id, 3]))), 0.39, 'five capped99 players');
  a.firstTeam.push({ ...player(99, 'sr-sixth'), bootId: ids[5] });
  close(W.squadEdge(a, l.gearLevel), 0.39, 'malformed sixth player contributes');
  return `${increments} full+.002 steps, ${saturated} neutral capped/floor steps, ${transitions} fractional threshold crossings; legal five-player maximum.39`;
});

await check('consumers', () => {
  const a = W.newFactory(NOW, 588);
  a.firstTeam = [{ ...player(75), bootId: ids[0] }];
  const s = T.newTycoon(NOW);
  s.league = T.newLeague(0, 3, 1, undefined, 70); s.matchNo = 70; s.levels.squad = 40;
  let cases = 0;
  for (let level = 1; level <= 3; level++) {
    const low = W.squadEdge(a, level > 1 ? { [ids[0]]: level - 1 } : {});
    const high = W.squadEdge(a, { [ids[0]]: level });
    const before = T.oppChancePerMin(s, low), after = T.oppChancePerMin(s, high);
    assert(after < before, 'boot level does not reduce opponent chance');
    const separating = (before + after) / 2;
    const weak = T.tick(clone(s), 1.4, alternating(separating), low);
    const strong = T.tick(clone(s), 1.4, alternating(separating), high);
    assert.equal(weak.state.goalsAgainst, 1); assert.equal(strong.state.goalsAgainst, 0, 'watched tick ignores gear');
    const awayWeak = T.playAwayMatchdays(clone(s), 1, alternating(separating), low);
    const awayStrong = T.playAwayMatchdays(clone(s), 1, alternating(separating), high);
    assert.equal(awayWeak.results[0].result, 'L'); assert.equal(awayStrong.results[0].result, 'D', 'away loop ignores gear');
    cases++;
  }
  return `${cases} adjacent levels each prevent a real watched concession and change an actual away result L to D on the same separating rolls`;
});

await check('schedule', () => {
  assert.equal(ids.length, 18); assert.equal(new Set(ids).size, ids.length);
  let l = R.newLedger(588), match = 0;
  assert.equal(l.gearUnlocked, undefined, 'old ledger unexpectedly invents rewards');
  for (let division = 0; division < 10; division++) {
    l = award(l, ++match, division);
    assert.deepEqual(l.gearUnlocked, ids.slice(0, division + 1));
    assert.equal(l.gearLevel[ids[division]], 1);
    const before = gear(l);
    assert.deepEqual(gear(award(l, match, division)), before, 'replayed title pays again');
    if (division < 9) {
      l = award(l, ++match, division);
      assert.deepEqual(l.gearUnlocked, before.unlocked, 'repeat lower-division title unlocks a line');
      assert.equal(l.kitUpgrades, before.kits + 1);
    }
  }
  for (let size = 11; size <= 18; size++) {
    l = award(l, ++match, 9);
    assert.deepEqual(l.gearUnlocked, ids.slice(0, size), 'Summit title misses next fixed line');
  }
  for (let division = 0; division < 10; division++) {
    const before = l.kitUpgrades; l = award(l, ++match, division);
    assert.equal(l.kitUpgrades, before + 1, 'after18 a title does not grant one kit');
  }
  let legacy = R.newLedger(588);
  for (let i = 0; i < 18; i++) { legacy = award(legacy, 3000 + i, 9); assert.deepEqual(legacy.gearUnlocked, ids.slice(0, i + 1)); }
  for (const other of [
    title(++match, 0, { away: true }), title(++match, 0, { position: 2 }),
    title(++match, 0, { position: undefined }), title(++match, undefined),
    ...[-1, 10, 1.5, NaN, '9'].map(division => title(++match, division)),
  ]) {
    const next = R.creditFullTimes(l, [other]); assert.deepEqual(gear(next), gear(l), 'non-title or malformed division granted gear'); l = next;
  }
  const lossTitle = award(R.newLedger(588), 1, 0, { result: 'loss' });
  assert.deepEqual(lossTitle.gearUnlocked, ids.slice(0, 1), 'league champion gets no gear after losing final fixture');
  return 'all18 BOOTS in order; lower-division repeats and post18 titles pay one kit; legacy Summit progresses; duplicate/malformed/away/non-title receipts neutral; losing title fixture still earns its league reward';
});

await check('equipment', () => {
  const a = W.newFactory(NOW, 588), l = unlocked(2);
  a.firstTeam = [player(75, 'sr-gear-0'), player(80, 'sr-gear-1')];
  assert(W.equipBoot(a, a.firstTeam[0].id, ids[0], l.gearLevel));
  assert(W.equipBoot(a, a.firstTeam[1].id, ids[0], l.gearLevel));
  assert.equal(a.firstTeam[0].bootId, undefined, 'reassignment leaves duplicate wearer');
  assert.equal(a.firstTeam[1].bootId, ids[0]);
  const before = W.serialize(a);
  assert.equal(W.equipBoot(a, 'missing', ids[0], l.gearLevel), false);
  assert.equal(W.equipBoot(a, a.firstTeam[0].id, ids[2], l.gearLevel), false);
  assert.equal(W.serialize(a), before, 'invalid equip changes academy');
  assert(W.equipBoot(a, a.firstTeam[1].id, null, l.gearLevel));
  assert.equal(a.firstTeam[1].bootId, undefined);
  const duplicate = clone(a);
  duplicate.firstTeam.forEach(p => { p.bootId = ids[0]; });
  const loaded = W.deserialize(W.serialize(duplicate), NOW, l.gearLevel);
  W.normalizeBoots(loaded, l.gearLevel);
  assert.equal(loaded.firstTeam.filter(p => p.bootId === ids[0]).length, 1, 'load keeps two wearers of one pair');
  close(W.squadEdge(duplicate, l.gearLevel), (15 + 20 + 1) * 0.002, 'raw duplicate gear is counted twice');
  for (const bootId of ['missing', '__proto__', 'toString', ids[2]]) {
    const malformed = { ...a, firstTeam: [{ ...player(75), bootId }] };
    close(W.squadEdge(malformed, l.gearLevel), 0.03, 'corrupt or locked pair adds edge');
    W.normalizeBoots(malformed, l.gearLevel);
    assert.equal(malformed.firstTeam[0].bootId, undefined);
  }
  close(W.squadEdge({ ...a, firstTeam: [{ ...player(), bootId: 'unknown' }] }, { unknown: 3 }), 0.03, 'unknown pair accepted from a raw level map');
  for (const value of [-1, 0, 1.5, 4, Infinity, NaN, '3', {}, null]) {
    close(W.squadEdge({ ...a, firstTeam: [{ ...player(), bootId: ids[0] }] }, { [ids[0]]: value }), 0.03, 'invalid level adds edge');
  }
  W.equipBoot(a, a.firstTeam[0].id, ids[0], l.gearLevel);
  const bought = clone(l);
  assert.notEqual(W.sellSenior(a, a.firstTeam[0].id), null);
  assert.deepEqual(l, bought, 'sale consumes the unlocked pair');
  assert(W.equipBoot(a, a.firstTeam[0].id, ids[0], l.gearLevel));
  a.firstTeam[0].age = 33; a.firstTeam[0].ageClock = 899;
  W.tick(a, 2);
  assert.equal(a.firstTeam.length, 0, 'retirement fixture did not retire');
  assert.deepEqual(l, bought, 'retirement consumes the unlocked pair');
  return 'atomic reassignment/unequip, malformed and locked gear, raw/load duplicate neutrality, invalid levels, sale and retirement preserve the owned pair';
});

await check('upgrades', () => {
  let l = unlocked(2);
  l = award(l, 3, 0);
  const before = clone(l), a = W.newFactory(NOW, 588), p = { ...player(), bootId: ids[0] };
  const price = W.salePrice(a, p);
  l = R.upgradeBoot(l, ids[0]);
  assert(l); assert.equal(l.gearLevel[ids[0]], 2); assert.equal(l.kitUpgrades, before.kitUpgrades - 1);
  assert.equal(W.salePrice(a, p), price, 'level2 changes fee');
  assert.equal(R.upgradeBoot(l, ids[0]), null, 'upgrade without a kit succeeds');
  l = award(l, 4, 0); l = R.upgradeBoot(l, ids[0]);
  assert.equal(l.gearLevel[ids[0]], 3); assert.equal(W.salePrice(a, p), price, 'level3 changes fee');
  l = award(l, 5, 0);
  assert.equal(R.upgradeBoot(l, ids[0]), null, 'level3 pair can be upgraded');
  assert.equal(R.upgradeBoot(l, ids[2]), null, 'locked pair can be upgraded');
  assert.deepEqual(R.cleanLedger(JSON.parse(JSON.stringify(l))), l, 'ledger upgrade roundtrip loses gear');
  for (const key of ['earned', 'spent', 'seed', 'opened', 'dry', 'pending']) assert.deepEqual(l[key], key === 'earned' ? before.earned + 46 : before[key], `upgrade changes unrelated ${key}`);
  return 'one kit per level, max3, locked/no-kit rejection, V1 roundtrip, unchanged fees and pack state';
});

await check('packs', () => {
  for (const pack of W.PACKS) for (let seed = 1; seed <= 50; seed++) {
    const plain = { ...R.newLedger(seed), earned: 10000 };
    const geared = { ...plain, ...gearFields(unlocked()) };
    const make = (lo, hi, roll) => ({ ...player(40), id: 1, age: 16, potential: lo + Math.floor(roll() * (hi - lo + 1)) });
    const a = R.openPack(plain, pack.id, true, make), b = R.openPack(geared, pack.id, true, make);
    assert(a && b); assert.deepEqual(gear(a), gear(plain), 'pack grants gear to an empty ledger');
    assert.deepEqual(gear(b), gear(geared), 'pack changes existing gear');
    for (const key of ['earned', 'spent', 'seed', 'opened', 'dry', 'nextSeq', 'pending']) assert.deepEqual(a[key], b[key], `gear changes pack ${key}`);
  }
  const before = unlocked(); const next = award(before, 19, 9);
  assert.equal(next.seed, before.seed, 'title advances pack RNG');
  return '150 paired real pack draws have identical kid/tier/seed/debit; packs never grant gear; title does not advance pack generator';
});

await check('loads and resets', () => {
  const good = unlocked(2), bare = gear(R.newLedger(588));
  for (const patch of [
    { gearTitles: undefined }, { gearTitles: {} }, { gearTitles: [0] },
    { gearTitles: [good.lastMatch + 1] }, { gearTitles: [1.5] }, { gearTitles: ['1'] },
    { gearTitles: [NaN] }, { gearTitles: [-1] }, { gearUnlocked: [ids[1], ids[0]] },
    { gearUnlocked: ['unknown'] }, { gearUnlocked: {} },
  ]) {
    const cleaned = R.cleanLedger({ ...good, ...patch });
    assert.deepEqual(cleaned.gearUnlocked, [], `corrupt ledger retains ownership: ${JSON.stringify(patch)}`);
    assert.deepEqual(cleaned.gearLevel, {}, 'locked level survives invalid ownership');
  }
  const mixed = R.cleanLedger({ ...good, gearTitles: [1, 1, 500], gearUnlocked: [ids[0], 'unknown'], gearLevel: { [ids[0]]: 100, [ids[1]]: 3 }, kitUpgrades: Infinity });
  assert.deepEqual(mixed.gearUnlocked, [ids[0]]);
  assert.deepEqual(mixed.gearLevel, { [ids[0]]: 3 });
  assert.equal(mixed.gearTitles.filter(Boolean).length, 1, 'duplicate/future title receipts survive');
  assert.equal(mixed.kitUpgrades, 0);
  const a = W.newFactory(NOW, 588);
  a.firstTeam = [{ ...player(), bootId: ids[0] }];
  a.lifetime = W.REGIONS[0].goal;
  const owned = JSON.stringify(good);
  assert(W.moveUp(a)); assert.equal(a.firstTeam[0].bootId, ids[0], 'academy move up forgets pair');
  const loaded = W.deserialize(W.serialize(a), NOW, good.gearLevel);
  assert.deepEqual(loaded.firstTeam, a.firstTeam, 'valid gear save changes on reload');
  const stadium = T.newTycoon(NOW); stadium.lifetime = T.prestigeThreshold(stadium); stadium.totalMatches = 50;
  assert(T.canPrestige(stadium));
  const reset = T.prestige(stadium, NOW);
  assert.equal(reset.totalMatches, 50); assert.equal(reset.league.division, 0);
  assert.equal(JSON.stringify(good), owned, 'reset changed ledger');
  const repeated = award(good, 51, 0);
  assert.deepEqual(repeated.gearUnlocked, good.gearUnlocked); assert.equal(repeated.kitUpgrades, good.kitUpgrades + 1, 'prestige repeats a first-title unlock');
  const missing = W.deserialize(W.serialize(a), NOW, R.newLedger(588).gearLevel);
  assert.equal(missing.firstTeam[0].bootId, undefined, 'lost ledger leaves a usable pair');
  close(W.squadEdge(missing, bare.levels), W.squadEdge(missing), 'lost ledger changes base edge');
  return 'invalid/inherited/duplicate/future receipt fields repaired, prefix ownership enforced, move up/currentV1/Sell up survive, lost ledger clears equipped gear';
});

await check('durability', async () => {
  let serial = 0;
  const freshRewards = async ledger => {
    blockedKey = null; store.clear(); writes.length = 0;
    if (ledger) store.set(R.REWARDS_KEY, JSON.stringify(ledger));
    return (await import(`${pathToFileURL(out).href}?store=${++serial}`)).R;
  };
  let r = await freshRewards(R.newLedger(588));
  let notices = 0;
  blockedKey = r.REWARDS_KEY;
  assert.equal(r.recordFullTimes([title(1, 0)], true, () => notices++), 23);
  assert.equal(notices, 1, 'failed title save is not reported');
  assert.equal(r.loadLedger().gearUnlocked, undefined, 'failed title write exposes usable gear');
  assert.equal(r.loadLedger().earned, 23, 'old visit-only gem fallback changed');
  assert.equal(JSON.parse(store.get(r.REWARDS_KEY)).earned, 0, 'failure fixture actually wrote');
  blockedKey = null;
  r.recordFullTimes([{ totalMatches: 2, result: 'loss', away: false }]);
  assert.equal(r.loadLedger().gearUnlocked, undefined, 'later save retroactively grants lost title');
  assert.equal(r.recordFullTimes([title(1, 0)]), 0, 'lost title is replayed');
  const resumed = (await import(`${pathToFileURL(out).href}?store=reload`)).R;
  assert.equal(resumed.loadLedger().earned, 23); assert.equal(resumed.loadLedger().gearUnlocked, undefined);

  let l = award(unlocked(1), 2, 0);
  r = await freshRewards(l);
  blockedKey = r.REWARDS_KEY;
  assert.throws(() => r.commitUpgradeBoot(ids[0]), /refused/);
  assert.deepEqual(r.loadLedger(), l, 'failed upgrade changed live state');
  assert.deepEqual(JSON.parse(store.get(r.REWARDS_KEY)), l, 'failed upgrade changed saved state');
  blockedKey = null;
  assert(r.commitUpgradeBoot(ids[0]));
  assert.equal(r.loadLedger().gearLevel[ids[0]], 2); assert.equal(r.loadLedger().kitUpgrades, 0);
  assert.equal(r.commitUpgradeBoot(ids[0]), false, 'same successful upgrade spends again');
  store.delete(r.REWARDS_KEY);
  assert.deepEqual(gear(r.loadLedger()), gear(R.newLedger(588)), 'removed ledger remains usable from cache');

  r = await freshRewards(unlocked(1));
  blockedKey = r.REWARDS_KEY;
  r.recordFullTimes([{ totalMatches: 2, result: 'win', away: false }]);
  const visit = r.loadLedger(), earned = visit.earned;
  assert.equal(visit.gearUnlocked.length, 1);
  assert.equal(r.loadLedger(), visit, 'unchanged memory-only load changes snapshot reference');
  let notifications = 0;
  const unsubscribe = r.subscribeLedger(() => notifications++);
  store.delete(r.REWARDS_KEY);
  const reset = r.loadLedger();
  assert.deepEqual(gear(reset), gear(R.newLedger(588)), 'removed ledger leaves gear after a prior gem write failure');
  assert.equal(reset.earned, earned, 'gear reset discards visit-only gems');
  for (let i = 0; i < 100; i++) assert.equal(r.loadLedger(), reset, 'unchanged cold edge read loops React snapshots');
  assert.equal(notifications, 0, 'load notifies subscribers recursively'); unsubscribe();

  const random = Math.random, date = Date.now;
  const counts = [];
  try {
    for (const allow of [false, true]) {
      r = await freshRewards(null);
      let randomCalls = 0, clockCalls = 0;
      Math.random = () => { randomCalls++; return 0.5; };
      Date.now = () => { clockCalls++; return NOW; };
      r.loadLedger();
      assert.equal(randomCalls, 0, 'cold read advances RNG'); assert.equal(clockCalls, 0, 'cold read reads clock');
      r.recordFullTimes([title(1, 0)], allow);
      counts.push([randomCalls, clockCalls]);
    }
  } finally { Math.random = random; Date.now = date; }
  assert.deepEqual(counts, [[1, 1], [1, 1]], 'gear adds RNG or clock calls relative to existing freshSeed');
  return 'failed title exposes gems only, lost reward stays lost across recovery/reload; failed upgrade leaves save/cache unchanged and retries once; ledger reset drops gear; fresh-seed call counts identical';
});

function gearFields(l) {
  return Object.fromEntries(['gearUnlocked', 'gearLevel', 'kitUpgrades', 'gearTitles'].filter(k => l[k] !== undefined).map(k => [k, clone(l[k])]));
}

await check('source writers', () => {
  const ts = createRequire(path.join(ROOT, 'package.json'))('typescript');
  const names = new Set(['gearUnlocked', 'gearLevel', 'kitUpgrades', 'gearTitles']);
  const allowed = new Set(['cleanLedger', 'creditFullTimes', 'upgradeBoot']);
  const offenders = [];
  let assignments = 0;
  function member(node) {
    if (ts.isPropertyAccessExpression(node)) return names.has(node.name.text) || member(node.expression);
    if (ts.isElementAccessExpression(node)) return (ts.isStringLiteral(node.argumentExpression) && names.has(node.argumentExpression.text)) || member(node.expression);
    return false;
  }
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'test') scan(file); continue; }
      if (!/\.tsx?$/.test(file) || /\.test\.tsx?$/.test(file)) continue;
      const source = fs.readFileSync(selected?.original === path.resolve(file) ? selected.copy : file, 'utf8');
      if (!/gearUnlocked|gearLevel|kitUpgrades|gearTitles/.test(source)) continue;
      const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
      function walk(node, owner = '') {
        if (ts.isFunctionDeclaration(node)) owner = node.name?.text ?? '';
        const objectWrite = ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) && names.has(node.name.text);
        const assignment = ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment && member(node.left);
        const push = ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ['push', 'splice', 'pop'].includes(node.expression.name.text) && member(node.expression.expression);
        if (objectWrite || assignment || push) {
          assignments++;
          if (path.relative(ROOT, file).replaceAll('\\', '/') !== 'src/lib/tycoonRewards.ts' || !allowed.has(owner)) offenders.push(`${path.relative(ROOT, file)}:${parsed.getLineAndCharacterOfPosition(node.getStart()).line + 1} (${owner})`);
        }
        ts.forEachChild(node, child => walk(child, owner));
      }
      walk(parsed);
    }
  }
  scan(path.join(ROOT, 'src'));
  assert(assignments > 0, 'AST fence inspected no executable gear writes');
  assert.deepEqual(offenders, [], 'gear written outside validated load, title credit or kit upgrade');
  return `${assignments} executable gear assignments occur only in validated load/title credit/kit upgrade; comments and type declarations cannot satisfy the fence`;
});

if (CONTROL) {
  assert.deepEqual(failures, selected.sections, 'control did not fail exactly its intended outcomes');
  console.log(`CONTROL PROVED ${CONTROL}: ${selected.sections.join(', ')}`);
  process.exitCode = 1;
} else if (failures.length) {
  console.error(`simTycoonGear: ${failures.length} failed sections; artifacts ${TEMP}`);
  process.exitCode = 1;
} else console.log(`simTycoonGear: all sections passed; artifacts ${TEMP}`);
