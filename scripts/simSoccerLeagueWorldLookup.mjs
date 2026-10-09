/* Round 1175: paired lookup proof. The copied baseline restores the three
   original scans. Whole outcomes must match over fifteen years in all five
   pyramids. Count canonical lookups, never use timing as a pass threshold. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = 'src/lib/soccerCareerLeagueWorld.ts';
const join = lines => lines.join('\n');
const tierAfter = join([
  '  const members = world.leagues[league] ?? [];',
  '  const tiers = new Map<string, number>();',
  '  for (const c of clubs) {',
  '    const key = clubKey(c.name);',
  '    if (!tiers.has(key)) tiers.set(key, c.tier);',
  '  }',
  '  const form = members.map(name => {',
  '    const tier = tiers.get(clubKey(name)) ?? 4;',
]);
const tierBefore = join([
  '  const members = world.leagues[league] ?? [];',
  '  const form = members.map(name => {',
  '    const tier = clubs.find(c => same(c.name, name))?.tier ?? 4;',
]);
const poolAfter = join([
  '  const pool = [...clubs];',
  '  const present = new Set(pool.map(c => clubKey(c.name)));',
  '  const knownPool = new Map<string, ClubData>();',
  '  for (const c of CAREER_CLUB_POOL) {',
  '    const key = clubKey(c.name);',
  '    if (!knownPool.has(key)) knownPool.set(key, c);',
  '  }',
  '  for (const p of PYRAMIDS) for (const name of initialMembers(p.lower)) {',
  '    const key = clubKey(name);',
  '    if (!present.has(key)) {',
  "      pool.push(knownPool.get(key) ?? { id: `career-lower-${key.replace(/[^a-z0-9]+/g, '-')}`, name, country: p.lower === 'Ligue 2' ? 'France' : p.lower === 'Serie B' ? 'Italy' : name === 'FC Andorra' ? 'Andorra' : 'Spain', tier: 4, color: '#64748b', league: p.lower });",
  '      present.add(key);',
  '    }',
  '  }',
]);
const poolBefore = join([
  '  const pool = [...clubs];',
  '  for (const p of PYRAMIDS) for (const name of initialMembers(p.lower)) {',
  "    if (!pool.some(c => same(c.name, name))) pool.push(CAREER_CLUB_POOL.find(c => same(c.name, name)) ?? { id: `career-lower-${clubKey(name).replace(/[^a-z0-9]+/g, '-')}`, name, country: p.lower === 'Ligue 2' ? 'France' : p.lower === 'Serie B' ? 'Italy' : name === 'FC Andorra' ? 'Andorra' : 'Spain', tier: 4, color: '#64748b', league: p.lower });",
  '  }',
]);
const leagueAfter = join([
  '  const leagueOf = new Map<string, string>();',
  '  for (const [league, names] of Object.entries(world.leagues)) for (const name of names) {',
  '    const key = clubKey(name);',
  '    if (!leagueOf.has(key)) leagueOf.set(key, league);',
  '  }',
  '  return pool.map(c => {',
  '    const league = leagueOf.get(clubKey(c.name));',
]);
const leagueBefore = join([
  '  return pool.map(c => {',
  '    const league = Object.entries(world.leagues).find(([, names]) => names.some(n => same(n, c.name)))?.[0];',
]);
const clubKeyBefore = "const clubKey = (name: string) => (SC_CLUB_CANON[name] ?? name).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();";
const instrument = { file, from: clubKeyBefore, to: join([
  'let lookupCalls = 0;',
  'export function lookupProofCount(reset = false): number { const count = lookupCalls; if (reset) lookupCalls = 0; return count; }',
  "const clubKey = (name: string) => { lookupCalls += 1; return (SC_CLUB_CANON[name] ?? name).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim(); };",
]) };
const scans = [{ file, from: tierAfter, to: tierBefore }, { file, from: poolAfter, to: poolBefore }, { file, from: leagueAfter, to: leagueBefore }];
const precedence = { file, from: 'if (!tiers.has(key)) tiers.set(key, c.tier);', to: 'tiers.set(key, c.tier);' };
const original = fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
for (const patch of [...scans, instrument, precedence]) {
  assert.equal(original.split(patch.from).length, 2, 'every copied-code anchor occurs exactly once');
  assert.notEqual(original.replace(patch.from, patch.to), original, 'every control changes real source');
}
const extra = { world: file, season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts' };
const current = await bundleAwardsNight(ROOT, { patches: [instrument], extra });
const baseline = await bundleAwardsNight(ROOT, { patches: [...scans, instrument], extra });
const broken = await bundleAwardsNight(ROOT, { patches: [precedence, instrument], extra });
const clone = value => JSON.parse(JSON.stringify(value));
const captured = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(s => s.id === 'ere')?.state;
assert.ok(captured, 'existing complete save is available for fictional fixtures');
const profiles = [
  ['Arsenal', 'Premier League'], ['Bayern Munich', 'Bundesliga'], ['PSG', 'Ligue 1'],
  ['Inter Milan', 'Serie A'], ['Real Madrid', 'La Liga'],
];

function probe(B) {
  const started = performance.now(), output = [];
  let tables = 0, unavailable = 0;
  B.world.lookupProofCount(true);
  const realRandom = Math.random;
  Math.random = () => { throw new Error('lookup proof drew from the main RNG'); };
  try {
    for (const [club, league] of profiles) {
      const raw = clone(B.soccer.FALLBACK_CLUBS);
      const twin = clone(raw.find(c => c.name === 'Man United'));
      raw.push({ ...twin, id: 'lookup-duplicate', name: 'Manchester United', tier: 99 });
      const rawBefore = JSON.stringify(raw);
      const own = raw.find(c => c.name === club);
      const s = { ...clone(captured), playerName: `Lookup ${club}`, currentClub: club, currentLeague: league,
        currentClubCountry: own.country, currentClubTier: own.tier, position: 'CM', seasons: [], awards: [],
        events: [], story: [], phone: undefined, leagueWorld: undefined };
      const seasons = [];
      let profileTables = 0;
      for (let year = 2026; year <= 2040; year++) {
        const projected = B.world.prepareLeagueWorld(s, raw, year);
        const worldBefore = JSON.stringify(s.leagueWorld);
        const members = s.leagueWorld.leagues[s.currentLeague];
        const finish = year === 2026 ? members.length : year === 2027 ? 1 : 5;
        const row = { year, age: year - 2004, club, clubCountry: own.country, clubTier: s.currentClubTier,
          apps: 28, leagueApps: 28, goals: 5, assists: 4, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 6.9,
          leagueTitle: finish === 1, leagueFinish: finish, leagueSize: members.length,
          domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null,
          type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
        s.seasons.push(row);
        B.world.recordLeagueWorldSeason(s, raw, row);
        const orders = Object.fromEntries(Object.keys(s.leagueWorld.leagues).map(key => [key, B.world.leagueWorldOrder(s.leagueWorld, key, s.playerName, raw)]));
        const champions = B.world.leagueWorldChampions(s, raw, row);
        const ctx = B.season.buildSoccerSeasonCtx(s, raw, row);
        const derived = B.core.deriveSeasonOrWhy(B.season.SOCCER, row, ctx);
        const order = typeof derived === 'string' ? undefined : B.core.tableAt(derived, derived.rounds.length).map(t => derived.labels[t.slot].name);
        if (typeof derived === 'string') unavailable++; else {
          tables++; profileTables++;
          assert.deepEqual(B.core.disagreements(B.season.SOCCER, row, ctx, derived), []);
        }
        const previous = s.leagueWorld;
        B.world.settleLeagueWorld(s, raw, row, order);
        assert.equal(JSON.stringify(previous), worldBefore, 'settlement leaves the previous world untouched');
        const nextProjection = B.world.prepareLeagueWorld(s, raw, year + 1);
        seasons.push(clone({ projected, orders, champions, ctx, derived, row, world: s.leagueWorld,
          nextProjection, currentLeague: s.currentLeague, currentTier: s.currentClubTier, save: s }));
        assert.equal(JSON.stringify(raw), rawBefore, 'every input club object and alias stays immutable');
      }
      assert.ok(profileTables > 0, `${league} reaches actual derived tables`);
      output.push({ club, league, seasons });
    }
    // A duplicate canonical member must keep the first league, just as .find did.
    const s = { ...clone(captured), leagueWorld: undefined };
    B.world.prepareLeagueWorld(s, B.soccer.FALLBACK_CLUBS, 2026);
    s.leagueWorld.leagues.Championship = [...s.leagueWorld.leagues.Championship, 'Manchester United'];
    const before = JSON.stringify(s);
    const projected = B.world.projectLeagueWorldClubs(s, B.soccer.FALLBACK_CLUBS, 2026);
    assert.equal(projected.find(c => c.name === 'Man United').league, 'Premier League');
    assert.equal(JSON.stringify(s), before, 'projection cannot edit its input save');
    output.push({ precedenceProjection: projected });
    return { output, calls: B.world.lookupProofCount(), tables, unavailable, ms: performance.now() - started };
  } finally { Math.random = realRandom; }
}

const fast = probe(current), old = probe(baseline);
assert.deepEqual(fast.output, old.output, 'all ordered clubs, fields, full derived seasons, champions, movements and projections are identical');
assert.equal(fast.tables + fast.unavailable, 75);
assert.equal(fast.tables, old.tables);
assert.ok(fast.tables >= 60, 'all five pyramids reach a substantial actual-table population');
console.log(`ok exact paired outcomes:75season worlds, ${fast.tables} complete tables, ${fast.unavailable} unavailable, five pyramids over15years`);
console.log(`lookup calls: current ${fast.calls}, original scans ${old.calls}, reduction ${(100 * (1 - fast.calls / old.calls)).toFixed(2)}%; time only current ${fast.ms.toFixed(0)}ms, baseline ${old.ms.toFixed(0)}ms`);
const reduced = (now, prior) => assert.ok(now * 5 <= prior, 'paired lookup calls must drop by at least80%, with no timing threshold');
reduced(fast.calls, old.calls);
assert.throws(() => reduced(old.calls, old.calls), /paired lookup calls/, 'the copied old scans are an effective failed optimization control');
console.log('ok effective copied old scans keep all outcomes but fail the deterministic reduction check');
const world = current.world.leagueWorldForYear({ ...clone(captured), leagueWorld: undefined }, current.soccer.FALLBACK_CLUBS, 2026);
const raw = clone(current.soccer.FALLBACK_CLUBS);
raw.push({ ...clone(raw.find(c => c.name === 'Man United')), name: 'Manchester United', tier: 99 });
const expected = current.world.leagueWorldOrder(world, 'Premier League', 'Precedence fixture', raw);
const wrong = broken.world.leagueWorldOrder(world, 'Premier League', 'Precedence fixture', raw);
assert.notDeepEqual(wrong, expected, 'copied last-entry tier defect must change actual ordered clubs');
assert.throws(() => assert.deepEqual(wrong, expected), 'the exact-order check rejects the changed first-entry outcome');
console.log('ok copied last-entry tier defect changes actual league order and is caught');
console.log('simSoccerLeagueWorldLookup: identical full outcomes, deterministic lookup reduction, both effective controls caught');
