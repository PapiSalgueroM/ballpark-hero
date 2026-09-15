/**
 * Round 586: unchanged youth fees, first team value, match edge and save survival.
 * Bundles the real engines. Control copies live only in a unique OS temp folder.
 * The old design's 52,920 sample has no stored sample definition. This replacement
 * states its larger exhaustive quote grid instead of claiming to recreate it.
 * Policy arms face the same ten mid-division seasons, rolls, facilities and refill
 * rule. Keeping the competition fixed isolates a roster decision from promotion
 * into a harder division. All minutes and academy progression use the real engines.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { basePrice as oldPrice } from './fixtures/playerValue585.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'all-players-value-'));
const lib = name => path.join(ROOT, 'src/lib', `${name}.ts`);
const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/allPlayersValueBaseline.json'), 'utf8'));
assert.equal(baseline.cases.length, 12, 'the frozen stadium corpus must not be thinned');
const CONTROL = process.env.VALUE_CONTROL || '';
assert(['', 'noprime', 'flatedge'].includes(CONTROL), 'unknown VALUE_CONTROL');
const POSITIONS = ['GK', 'DF', 'MF', 'FW'];
const NOW = 1767225600000;
const hash = text => createHash('sha256').update(text).digest('hex');
const failures = [];
const checks = {};

function check(id, work) {
  try { const detail = work(); checks[id] = true; console.log(`  PASS ${id}: ${detail}`); }
  catch (error) { checks[id] = false; failures.push(id); console.error(`  FAIL ${id}: ${error.message}`); }
}

function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length - 1, 1, 'control must find one executable anchor');
  const changed = source.replace(before, after);
  assert.notEqual(changed, source, 'control must change executable code');
  return changed;
}

async function modules(control = '') {
  let value = lib('playerValue');
  let academy = lib('wonderkidFactory');
  if (control === 'noprime') {
    const source = fs.readFileSync(value, 'utf8');
    value = path.join(TEMP, 'playerValue-noprime.ts');
    fs.writeFileSync(value, replaceOnce(source, 'return skill * promise * POS_PRICE[pos] * primeFactor(age);', 'return skill * promise * POS_PRICE[pos];'));
  }
  if (control === 'flatedge') {
    const source = fs.readFileSync(academy, 'utf8');
    academy = path.join(TEMP, 'wonderkidFactory-flatedge.ts');
    fs.writeFileSync(academy, replaceOnce(source, 'return Math.min(0.40, total * 0.002);', 'return Math.min(0.40, total * 0);'));
  }
  const file = path.join(TEMP, `engines-${control || 'live'}.mjs`);
  const imports = [['W', academy], ['V', value], ['T', lib('stadiumTycoon')], ['R', lib('tycoonRewards')], ['F', path.join(ROOT, 'scripts/fixtures/tycoonV1/wonderkidFactory.ts')]];
  await build({ stdin: { contents: imports.map(([name, entry]) => `export * as ${name} from ${JSON.stringify(entry.replaceAll('\\', '/'))};`).join('\n'), resolveDir: ROOT, loader: 'ts' },
    outfile: file, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
    alias: { '@/lib/playerValue': value, '@/lib/wonderkidFactory': academy, '@': path.join(ROOT, 'src') } });
  return import(pathToFileURL(file).href);
}

function player(rating, age = 27, id = 'sr-fixture') {
  return { id, name: `Academy player ${id}`, nation: 'England', pos: 'MF', rating, potential: 99, age, ageClock: 0 };
}

function feeIdentity(W) {
  assert.equal(hash(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/playerValue585.mjs'), 'utf8').replaceAll('\r\n', '\n')), baseline.feeFixtureSha256, 'frozen fee fixture changed');
  let quotes = 0;
  // Quarter ratings include the non-integer ratings produced by training.
  for (let rating = 30; rating <= 99; rating += 0.25) {
    for (let potential = Math.max(45, Math.ceil(rating)); potential <= 99; potential += 1) {
      for (let age = 15; age <= 23; age += 1) for (const pos of POSITIONS) {
        assert.equal(W.basePrice(rating, potential, age, pos), oldPrice(rating, potential, age, pos), `${rating}/${potential}/${age}/${pos}`);
        quotes += 1;
      }
    }
  }
  assert(quotes > 52920, 'replacement coverage must exceed the unavailable recon sample');
  return `${quotes.toLocaleString('en-US')} exact youth quotes: rating 30..99 by 0.25, ceiling max(45,ceil(rating))..99, age 15..23, four positions`;
}

function strictPrime(W) {
  let pairs = 0;
  for (let rating = 30; rating <= 99; rating += 1) for (let potential = Math.max(45, rating); potential <= 99; potential += 1) for (const pos of POSITIONS) {
    const fees = [27, 29, 31].map(age => W.basePrice(rating, potential, age, pos));
    assert(fees[0] > fees[1] && fees[1] > fees[2], `${rating}/${potential}/${pos} does not decline across27,29,31: ${fees}`);
    pairs += 2;
  }
  return `${pairs} strict senior age declines at fixed rating and ceiling`;
}

function emptyIdentity({ W, T }) {
  assert.equal(W.squadEdge(W.newFactory(NOW, 7)), 0);
  assert.equal(W.squadEdge({ ...W.newFactory(NOW, 7), firstTeam: [] }), 0);
  for (const row of baseline.cases) {
    let s = structuredClone(row.initial);
    const roll = rng(row.seed);
    const sum = createHash('sha256');
    for (let i = 0; i < baseline.steps; i += 1) {
      const result = T.tick(s, baseline.dt[i % baseline.dt.length], roll, 0);
      s = result.state;
      sum.update(JSON.stringify(result));
    }
    assert.equal(sum.digest('hex'), row.watchedHash, `watched baseline seed${row.seed}`);
    assert.equal(hash(JSON.stringify(T.playAwayMatchdays(structuredClone(row.initial), 40, rng(row.seed), 0))), row.awayHash, `away baseline seed${row.seed}`);
  }
  return `${baseline.cases.length} frozen pre-round watched histories and away runs match byte for byte`;
}

function edgeSteps({ W, T }) {
  const a = W.newFactory(NOW, 1);
  const s = T.newTycoon(NOW);
  s.league = T.newLeague(0, 3, 1, undefined, 70);
  s.matchNo = 70;
  s.levels.squad = 40;
  let steps = 0;
  for (let count = 1; count <= 5; count += 1) for (let rating = 60; rating < 99; rating += 1) {
    a.firstTeam = Array.from({ length: count }, (_, i) => player(rating, 27, `sr-edge-${i}`));
    const low = W.squadEdge(a);
    a.firstTeam[0].rating += 1;
    const high = W.squadEdge(a);
    assert(high > low, `one of${count} players at${rating} gained no edge`);
    const before = T.oppChancePerMin(s, low);
    const after = T.oppChancePerMin(s, high);
    assert(after < before, `opponent chance did not fall at${rating}`);
    const middle = (before + after) / 2;
    const roll = () => { let call = 0; return () => (++call % 2 ? 1 : middle); };
    const normal = T.tick(structuredClone(s), 1.4, roll(), low);
    const stronger = T.tick(structuredClone(s), 1.4, roll(), high);
    assert.equal(normal.state.goalsAgainst, 1, 'lower edge should concede on the separating roll');
    assert.equal(stronger.state.goalsAgainst, 0, 'tick must consume the stronger edge');
    steps += 1;
  }
  const edge = W.squadEdge({ ...a, firstTeam: Array.from({ length: 5 }, (_, i) => player(99, 27, `sr-top-${i}`)) });
  assert(Math.abs(edge - 0.39) < 1e-12, 'five99s must contribute0.39');
  const midpoint = (T.oppChancePerMin(s, 0) + T.oppChancePerMin(s, edge)) / 2;
  const alternating = () => { let call = 0; return () => (++call % 2 ? 1 : midpoint); };
  const empty = T.playAwayMatchdays(s, 1, alternating(), 0);
  const full = T.playAwayMatchdays(s, 1, alternating(), edge);
  assert.equal(empty.results[0].result, 'L');
  assert.equal(full.results[0].result, 'D', 'away minutes must consume the same edge');
  return `${steps} rating increments reach the live tick; the away consumer also changes its committed result`;
}

function saves({ W, T, F }) {
  const a = W.newFactory(NOW, 21);
  a.prospects = [player(70, 18, 1)];
  a.prospects[0].ageClock = 150;
  assert(W.promote(a, 1));
  assert.equal(a.prospects.length, 0);
  assert.equal(a.firstTeam[0].ageClock, 450, 'promotion preserves the birthday fraction');
  a.retired = 3;
  const firstTeam = JSON.stringify(a.firstTeam);
  a.lifetime = W.REGIONS[0].goal;
  assert(W.moveUp(a));
  assert.equal(JSON.stringify(a.firstTeam), firstTeam, 'academy move up must preserve the team');
  assert.equal(a.retired, 3);
  const loaded = W.deserialize(W.serialize(a), NOW);
  assert(loaded);
  assert.deepEqual(loaded.firstTeam, JSON.parse(firstTeam), 'V1 roundtrip must preserve the team');
  const oldLoaded = F.deserialize(W.serialize(a), NOW);
  assert(oldLoaded, 'the frozen V1 loader must accept the new save');
  assert.deepEqual(oldLoaded.firstTeam, JSON.parse(firstTeam), 'the old loader carries unknown top-level team data');
  const away = structuredClone(a);
  const clocks = away.firstTeam.map(p => ({ age: p.age, ageClock: p.ageClock }));
  W.applyAway(away, 12 * 3600 * 1000);
  assert.deepEqual(away.firstTeam.map(p => ({ age: p.age, ageClock: p.ageClock })), clocks, 'senior ages and birthdays stay still while away');
  assert(away.firstTeam[0].rating > a.firstTeam[0].rating, 'away senior training must actually occur');
  let stadium = T.newTycoon(NOW);
  stadium.lifetime = T.prestigeThreshold(stadium);
  assert(T.canPrestige(stadium));
  const academyBeforeSale = W.serialize(a);
  stadium = T.prestige(stadium, NOW);
  assert.equal(stadium.rep, 1);
  assert.equal(W.serialize(a), academyBeforeSale, 'separate academy save must survive stadium Sell up');
  const birthday = W.newFactory(NOW, 4);
  birthday.firstTeam = [player(80, 29)];
  birthday.firstTeam[0].ageClock = W.SENIOR_YEAR_SEC - 1;
  const quote = W.seniorBirthdayPreview(birthday, birthday.firstTeam[0]);
  W.tick(birthday, 1);
  assert.equal(birthday.firstTeam[0].age, 30);
  assert.equal(birthday.firstTeam[0].rating, 78.8);
  assert.equal(W.salePrice(birthday, birthday.firstTeam[0]), quote.price);
  const cash = birthday.cash;
  birthday.firstTeam[0].age = 33;
  birthday.firstTeam[0].ageClock = W.SENIOR_YEAR_SEC - 1;
  W.tick(birthday, 1);
  assert.equal(birthday.firstTeam.length, 0);
  assert.equal(birthday.retired, 1);
  assert.equal(birthday.cash, cash, 'retirement cannot pay a fee');
  const malformed = { ...a, firstTeam: [player(100, 27, 'duplicate'), player(75, 29, 'duplicate'), player(80, 34, 'retired'), { ...player(75, 20, 'bad-nation'), nation: 'toString' }], retired: -5 };
  const repaired = W.deserialize(JSON.stringify(malformed), NOW);
  assert(repaired);
  assert.equal(repaired.firstTeam.length, 2, 'retired and invalid-nation seniors are dropped');
  assert.equal(new Set(repaired.firstTeam.map(p => p.id)).size, 2, 'duplicate senior IDs are repaired');
  assert(repaired.firstTeam.every(p => p.rating <= p.potential && p.rating <= 99));
  assert.equal(repaired.retired, 0);
  return 'promotion, birthday quote, decline, retirement, away training, current/frozen V1 saves, malformed repairs, move up and Sell up verified';
}

function openBestPack({ W, R }, academy, ledger) {
  const id = [...W.PACKS].reverse().find(pack => R.canOpen(ledger, pack.id, W.bedFree(academy)))?.id;
  if (!id) return ledger;
  const next = R.openPack(ledger, id, true, (lo, hi, roll) => W.makeProspectInBand({ ...academy, prospects: [...academy.prospects] }, lo, hi, roll), (academy.packsDelivered ?? 0) + 1);
  assert(next?.pending);
  assert(W.deliverPack(academy, next.pending.seq, next.pending.kid, next.pending.tier));
  return { ...next, pending: null };
}

function initialPolicyAcademy(mods, seed) {
  const { W, R } = mods;
  const a = W.newFactory(NOW, seed);
  let ledger = { ...R.newLedger(seed), earned: 1250 };
  // A saved club's five matured Elite signings. The draw is real and identical
  // in both arms; its gems are fixture history, not fabricated policy income.
  for (let i = 0; i < 5; i += 1) {
    ledger = openBestPack(mods, a, ledger);
    const kid = a.prospects[0];
    kid.age = 18;
    kid.rating = kid.potential;
    assert(W.promote(a, kid.id));
    a.firstTeam[i].age = 27;
    a.firstTeam[i].ageClock = 0;
    a.firstTeam[i].id = `sr-original-${i}`;
  }
  return a;
}

function policyRun(mods, seed, sellAge) {
  const { W, T } = mods;
  const a = initialPolicyAcademy(mods, seed);
  const original = new Set(a.firstTeam.map(p => p.id));
  const roll = rng(seed);
  let wins = 0;
  let firstFees = 0;
  let seniorFees = 0;
  let sales = 0;
  let refills = 0;
  let elapsed = 0;
  for (let season = 1; season <= 10; season += 1) {
    let s = T.newTycoon(NOW);
    s.levels.squad = 40;
    s.league = T.newLeague(0, 3, season, undefined, 70);
    s.matchNo = 70;
    const matches = T.leagueShape(3).matchdays;
    while ((s.totalMatches ?? 0) < matches) {
      W.tick(a, 1.4);
      elapsed += 1.4;
      for (const senior of [...(a.firstTeam ?? [])]) if (senior.age >= sellAge) {
        const fee = W.sellSenior(a, senior.id);
        assert(fee !== null);
        seniorFees += fee;
        sales += 1;
        if (original.has(senior.id)) firstFees += fee;
      }
      // Identical refill rule in both arms: highest current rating among
      // eligible graduates; ceiling, then persisted numeric id break ties.
      while ((a.firstTeam?.length ?? 0) < W.FIRST_TEAM_SLOTS) {
        const candidate = a.prospects.filter(p => p.age >= 18 && p.age <= 23).sort((x, y) => y.rating - x.rating || y.potential - x.potential || x.id - y.id)[0];
        if (!candidate) break;
        assert(W.promote(a, candidate.id));
        refills += 1;
      }
      for (const kid of [...a.prospects]) if (kid.age >= 22 || (a.firstTeam.length === 5 && kid.rating >= kid.potential - 0.5)) W.sellProspect(a, kid.id);
      const result = T.tick(s, 1.4, roll, W.squadEdge(a));
      s = result.state;
      wins += result.events.filter(event => event.kind === 'win').length;
    }
  }
  assert(sales > 0 && refills > 0 && firstFees > 0, 'policy must sell, refill and realize its starting cohort');
  return { wins, firstFees, seniorFees, transferBudget: a.cash, sales, refills, hours: elapsed / 3600 };
}

function policyMeasure(mods, offset = 0) {
  const rows = [];
  for (let i = 1 + offset; i <= 32 + offset; i += 1) rows.push({ seed: i * 101, sell: policyRun(mods, i * 101, 28), hold: policyRun(mods, i * 101, 33) });
  const mean = getter => rows.reduce((sum, row) => sum + getter(row), 0) / rows.length;
  const result = {
    seeds: rows.length,
    sellWins: mean(row => row.sell.wins), holdWins: mean(row => row.hold.wins),
    sellFee: mean(row => row.sell.firstFees), holdFee: mean(row => row.hold.firstFees),
    sellBudget: mean(row => row.sell.transferBudget), holdBudget: mean(row => row.hold.transferBudget),
    sellSenior: mean(row => row.sell.seniorFees), holdSenior: mean(row => row.hold.seniorFees),
    sellRefills: mean(row => row.sell.refills), holdRefills: mean(row => row.hold.refills),
  };
  console.log(`  POLICY ${offset ? 'holdout' : 'calibration'} ${JSON.stringify(result)}`);
  return result;
}

function starPace(mods, seed, starLimit = mods.W.REGIONS.length) {
  const { W, T, R } = mods;
  const a = W.newFactory(NOW, seed);
  let s = T.newTycoon(NOW);
  let ledger = R.newLedger(seed);
  const roll = rng(seed);
  const times = [];
  const checkpoints = [];
  const hours = starLimit > W.REGIONS.length ? 5000 : 100;
  for (let time = 10; time <= hours * 3600 && times.length < starLimit; time += 10) {
    const result = T.tick(s, 10, roll, W.squadEdge(a));
    s = result.state;
    const ft = result.events.find(event => ['win', 'draw', 'loss'].includes(event.kind));
    const final = result.events.find(event => ['title', 'seasonEnd'].includes(event.kind) && event.position !== undefined);
    if (ft) ledger = R.creditFullTimes(ledger, [{ totalMatches: s.totalMatches, result: ft.kind, away: false, position: final?.position }]);
    for (let guard = 0; guard < 40; guard += 1) {
      const full = T.attendance(s) >= T.capacity(s) - 5;
      const choices = T.TRACKS.filter(track => T.canBuy(s, track.id)).sort((x, y) => T.costOf(s, x.id) * (full && x.id === 'stands' ? 0.55 : 1) - T.costOf(s, y.id) * (full && y.id === 'stands' ? 0.55 : 1));
      if (!choices.length) break;
      s = T.buy(s, choices[0].id);
    }
    if (T.canPrestige(s)) s = T.prestige(s, NOW);
    W.tick(a, 10);
    if (a.showcaseCooldown <= 0) W.startShowcase(a);
    for (const kid of [...a.prospects]) if (kid.rating >= kid.potential - 0.5 || kid.age >= 22) W.sellProspect(a, kid.id);
    for (const facility of [...W.FACILITIES].sort((x, y) => W.facilityCost(a, x.id) - W.facilityCost(a, y.id))) W.buyFacility(a, facility.id);
    if (W.canMoveUp(a)) { assert(W.moveUp(a)); times.push(time / 3600); }
    ledger = openBestPack(mods, a, ledger);
    if (time === 100 * 3600 || time === 150 * 3600) checkpoints.push({ hours: time / 3600, region: W.regionIndex(a) + 1, lifetime: a.lifetime, goal: W.REGIONS[W.regionIndex(a)].goal });
  }
  return { seed, times, packs: R.packsOpened(ledger), checkpoints };
}

try {
  const live = await modules(CONTROL);
  console.log(`Round 586 all players value${CONTROL ? `, control ${CONTROL}` : ''}`);
  check('youth', () => feeIdentity(live.W));
  check('prime', () => strictPrime(live.W));
  check('empty', () => emptyIdentity(live));
  check('edge', () => edgeSteps(live));
  check('saves', () => saves(live));
  const policy = policyMeasure(live);
  const holdout = policyMeasure(live, 32);
  check('policy-cash', () => {
    for (const [label, sample] of [['calibration', policy], ['holdout', holdout]]) {
      assert(sample.sellBudget > sample.holdBudget, `${label}: selling at28 must realize more transfer budget`);
      const gap = sample.sellFee - sample.holdFee;
      assert(gap > baseline.policy.cashGapFloor, `${label}: starting-cohort fee gap ${gap.toFixed(3)} below measured half-headroom floor ${baseline.policy.cashGapFloor}`);
    }
    return `sell28 budget ${policy.sellBudget.toFixed(1)} vs hold33 ${policy.holdBudget.toFixed(1)}; cohort fee advantage ${policy.sellFee - policy.holdFee}, holdout ${holdout.sellFee - holdout.holdFee} (floor ${baseline.policy.cashGapFloor})`;
  });
  check('policy-wins', () => {
    for (const [label, sample] of [['calibration', policy], ['holdout', holdout]]) {
      const gain = sample.holdWins - sample.sellWins;
      assert(gain > baseline.policy.winsGainFloor, `${label}: hold33 win gain ${gain.toFixed(3)} below measured half-headroom floor ${baseline.policy.winsGainFloor}`);
    }
    return `${policy.seeds}+${holdout.seeds} paired seeds: hold33 gains ${policy.holdWins - policy.sellWins} wins, holdout ${holdout.holdWins - holdout.sellWins} (floor ${baseline.policy.winsGainFloor})`;
  });
  if (!CONTROL) {
    const pace = [];
    for (let i = 1; i <= 12; i += 1) {
      const run = starPace(live, i * 101, i === 1 ? live.W.MAX_REP : live.W.REGIONS.length);
      pace.push(run);
      console.log(`  STAR PACE seed ${run.seed}: ${run.times.length} stars, hours ${run.times.map(time => time.toFixed(3)).join(', ')}; packs ${run.packs}; checkpoints ${JSON.stringify(run.checkpoints)}`);
    }
    check('pace', () => {
      assert(pace.every(run => run.times.length >= live.W.REGIONS.length && run.times[5] <= 100), 'all six regional stars must be reached within100 watched hours from a new game');
      assert.equal(pace[0].times.length, live.W.MAX_REP, 'one representative run must print every academy star');
      assert(pace.every(run => run.packs > 0), 'pace bot must actually open packs');
      const sixth = pace.map(run => run.times[5]).sort((x, y) => x - y);
      const median = (sixth[5] + sixth[6]) / 2;
      assert(median <= 100, `median region6 star ${median.toFixed(2)}h exceeds the contract retune trigger`);
      return `twelve greedy runs reach star 6, median ${median.toFixed(3)}h (trigger 100h from start); one representative continuation reaches all ${live.W.MAX_REP} stars at ${pace[0].times.at(-1).toFixed(3)}h`;
    });
  } else {
    const expected = CONTROL === 'noprime' ? ['prime', 'policy-cash'] : ['edge', 'policy-wins'];
    console.log(`  CONTROL ${CONTROL} applied; expected failing sections ${expected.join(',')}; observed ${failures.join(',')}`);
    assert.deepEqual([...failures].sort(), expected.sort(), 'control must break exactly its intended checks');
    for (const sample of [policy, holdout]) {
      if (CONTROL === 'noprime') assert(sample.sellFee - sample.holdFee < baseline.policy.cashGapFloor, 'no-prime must also break the independent holdout cash effect');
      else assert.equal(sample.holdWins, sample.sellWins, 'flat edge must remove the policy win effect in both seed sets');
    }
  }
  if (failures.length) process.exitCode = 1;
  else console.log('simAllPlayersValue: green.');
} finally {
  assert.equal(path.dirname(TEMP), path.resolve(os.tmpdir()));
  assert(path.basename(TEMP).startsWith('all-players-value-'));
  fs.rmSync(TEMP, { recursive: true, force: true });
}
