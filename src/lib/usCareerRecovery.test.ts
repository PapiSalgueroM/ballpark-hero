import assert from 'node:assert/strict';
import { describe, expect, it } from 'vitest';
import { careerRecoveryRisk } from '@/lib/usCareerRecovery';
import { ARCHETYPES, startCareer, simSeason, progress, buyNflItem, NFL_SPEND_ITEMS, type CareerState, type CareerPos } from '@/lib/nflMyCareer';
import { NBA_ARCHETYPES, startNbaCareer, simNbaSeason, nbaProgress, buyNbaItem, NBA_SPEND_ITEMS, type NbaCareerState, type NbaCareerPos } from '@/lib/nbaMyCareer';
import { MLB_ARCHETYPES, startMlbCareer, simMlbSeason, mlbProgress, buyMlbItem, MLB_SPEND_ITEMS, type MlbCareerState, type MlbCareerPos } from '@/lib/mlbMyCareer';
import { NHL_ARCHETYPES, startNhlCareer, simNhlSeason, nhlProgress, buyNhlItem, NHL_SPEND_ITEMS, type NhlCareerState, type NhlCareerPos } from '@/lib/nhlMyCareer';
import { getNflCorruptionEvents } from '@/lib/nflCareerCorruption';
import { getNbaCorruptionEvents } from '@/lib/nbaCareerCorruption';
import { getMlbCorruptionEvents } from '@/lib/mlbCareerCorruption';
import { getNhlCorruptionEvents } from '@/lib/nhlCareerCorruption';

type State = CareerState | NbaCareerState | MlbCareerState | NhlCareerState;
type Output = { line: { games: number }; notes: string[] };
type Scenario = {
  sport: 'nfl' | 'nba' | 'mlb' | 'nhl'; id: string; positions: string[];
  items: readonly { id: string; cost: number; yearly?: number; effect?: string }[];
  start: (position: string) => State;
  buy: (c: State, id: string) => { state: State; log: string } | null;
  sim: (c: State, rng: () => number) => Output;
  progress: (c: State, rng: () => number) => string[];
  events: (c: State) => { id: string; options: { apply: (c: State) => string }[] }[];
};
const cases: Scenario[] = [
  { sport: 'nfl', id: 'recovery_suite', positions: Object.keys(ARCHETYPES), items: NFL_SPEND_ITEMS,
    start: p => startCareer('Fictional recovery fixture', p as CareerPos, ARCHETYPES[p as CareerPos][0], () => .5),
    buy: (c, id) => buyNflItem(c as CareerState, id), sim: (c, r) => simSeason(c as CareerState, 80, r), progress: (c, r) => progress(c as CareerState, r), events: c => getNflCorruptionEvents(c as CareerState, () => .5) as never },
  { sport: 'nba', id: 'recovery_nba', positions: Object.keys(NBA_ARCHETYPES), items: NBA_SPEND_ITEMS,
    start: p => startNbaCareer('Fictional recovery fixture', p as NbaCareerPos, NBA_ARCHETYPES[p as NbaCareerPos][0], () => .5),
    buy: (c, id) => buyNbaItem(c as NbaCareerState, id), sim: (c, r) => simNbaSeason(c as NbaCareerState, 80, r), progress: (c, r) => nbaProgress(c as NbaCareerState, r), events: c => getNbaCorruptionEvents(c as NbaCareerState, () => .5) as never },
  { sport: 'mlb', id: 'recovery_mlb', positions: Object.keys(MLB_ARCHETYPES), items: MLB_SPEND_ITEMS,
    start: p => startMlbCareer('Fictional recovery fixture', p as MlbCareerPos, MLB_ARCHETYPES[p as MlbCareerPos][0], () => .5),
    buy: (c, id) => buyMlbItem(c as MlbCareerState, id), sim: (c, r) => simMlbSeason(c as MlbCareerState, 80, r), progress: (c, r) => mlbProgress(c as MlbCareerState, r), events: c => getMlbCorruptionEvents(c as MlbCareerState, () => .5) as never },
  { sport: 'nhl', id: 'recovery_nhl', positions: Object.keys(NHL_ARCHETYPES), items: NHL_SPEND_ITEMS,
    start: p => startNhlCareer('Fictional recovery fixture', p as NhlCareerPos, NHL_ARCHETYPES[p as NhlCareerPos][0], () => .5),
    buy: (c, id) => buyNhlItem(c as NhlCareerState, id), sim: (c, r) => simNhlSeason(c as NhlCareerState, 80, r), progress: (c, r) => nhlProgress(c as NhlCareerState, r), events: c => getNhlCorruptionEvents(c as NhlCareerState, () => .5) as never },
];
const clone = <T,>(c: T): T => JSON.parse(JSON.stringify(c));
const projection = (output: Output) => ({ games: output.line.games, notes: output.notes.filter(n => n.startsWith('🚑')) });
const stripped = (c: State) => { const value = clone(c); delete value.purchased; delete value.yearlyCosts; delete value.netWorth; return value; };
function fixture(k: Scenario, position = k.positions[0], health = 70): State {
  const c = k.start(position);
  Object.assign(c, { age: 23, ovr: 75, pot: 99, health, morale: 60, fanbase: 50, netWorth: 100, earnings: 100, salary: 10, role: 'starter' });
  return c;
}
function bought(k: Scenario, c: State): State { const result = k.buy(c, k.id); expect(result).not.toBeNull(); return result!.state; }
function tracked(k: Scenario, c: State, chance: number) {
  let count = 0;
  const chanceIndex = k.sport === 'nhl' || (k.sport === 'mlb' && c.pos !== 'SP') ? 1 : 0;
  return { draw: () => { const i = count++; return i === chanceIndex ? chance : .5; }, count: () => count };
}
function baseRisk(k: Scenario, c: State): number {
  const durability = (1 - c.archetype.durability) * (k.sport === 'mlb' ? .55 : .5);
  return durability + (100 - c.health) / (k.sport === 'nfl' ? 260 : k.sport === 'nba' ? 240 : 250) + (k.sport === 'nfl' && c.pos === 'RB' ? .07 : 0);
}

describe('937 active career Recovery Suite simulation benefit', () => {
  it('reduces chance by exactly one quarter for only the matching active service without mutating ownership', () => {
    for (const k of cases) for (const risk of [0, .025, .17, .5, 1]) {
      const owned = Object.freeze([k.id, k.id, 'unknown_receipt']);
      expect(careerRecoveryRisk(k.sport, owned, risk)).toBe(risk * .75);
      for (const ids of [undefined, [], ['unknown_receipt'], cases.filter(other => other !== k).map(other => other.id)]) expect(careerRecoveryRisk(k.sport, ids, risk)).toBe(risk);
      expect(owned).toEqual([k.id, k.id, 'unknown_receipt']);
    }
  });

  it.each(cases)('$sport reduces injury selection across every supported position and depleted through full health', k => {
    for (const position of k.positions) for (const health of [0, 40, 70, 100]) {
      const initial = fixture(k, position, health), paid = bought(k, clone(initial));
      let originalInjuries = 0, protectedInjuries = 0;
      for (let n = 0; n < 100; n++) {
        const a = clone(initial), b = clone(paid), ar = tracked(k, a, n / 100), br = tracked(k, b, n / 100);
        const baseline = k.sim(a, ar.draw), protectedOutput = k.sim(b, br.draw);
        const injured = projection(baseline).notes.length > 0, protectedInjured = projection(protectedOutput).notes.length > 0;
        if (injured) originalInjuries++; if (protectedInjured) protectedInjuries++;
        assert.ok(!protectedInjured || injured, 'Recovery cannot create an injury');
        if (injured === protectedInjured) { assert.deepEqual(protectedOutput, baseline); assert.equal(br.count(), ar.count()); assert.deepEqual(stripped(b), stripped(a)); }
        else { assert.ok(protectedOutput.line.games > baseline.line.games); assert.equal(b.health, initial.health); }
      }
      expect(Math.abs(protectedInjuries - originalInjuries * .75)).toBeLessThanOrEqual(1);
      if (originalInjuries >= 4) expect(protectedInjuries).toBeLessThan(originalInjuries);
      if (baseRisk(k, initial) === 0) expect(protectedInjuries).toBe(0);
    }
  });

  it.each(cases)('$sport shop quotes the actual simulation percentage while holding purchase price and upkeep', k => {
    const c = fixture(k), before = clone(c), item = k.items.find(i => i.id === k.id)!;
    const next = bought(k, c);
    expect(item.effect).toBe('25% lower simulated injury risk');
    expect(next.netWorth).toBe(Math.round((before.netWorth! - item.cost) * 10) / 10);
    expect(next.yearlyCosts).toBe(item.yearly); expect(next.purchased).toEqual([k.id]);
    expect(stripped(next)).toEqual(stripped(before)); expect(c).toEqual(before); expect(k.buy(next, k.id)).toBeNull();
  });

  it.each(cases)('$sport JSON-restored and duplicate service receipts retain one real benefit without immunity', k => {
    const initial = fixture(k), next = bought(k, clone(initial)); next.purchased!.push(k.id); const restored = clone(next);
    const chance = baseRisk(k, initial) * .875;
    expect(projection(k.sim(clone(initial), tracked(k, initial, chance).draw)).notes).toHaveLength(1);
    expect(projection(k.sim(clone(restored), tracked(k, restored, chance).draw)).notes).toHaveLength(0);
    const stillInjured = baseRisk(k, initial) * .65;
    const a = clone(initial), b = clone(restored), ar = tracked(k, a, stillInjured), br = tracked(k, b, stillInjured);
    const unowned = k.sim(a, ar.draw), owned = k.sim(b, br.draw);
    expect(projection(owned).notes).toHaveLength(1); expect(owned).toEqual(unowned); expect(br.count()).toBe(ar.count());
    expect(next).toEqual(restored);
    let season = clone(restored);
    for (let year = 0; year < 2; year++) {
      const unpaid = clone(season); unpaid.purchased = [];
      const nextChance = baseRisk(k, season) * .875;
      expect(projection(k.sim(unpaid, tracked(k, unpaid, nextChance).draw)).notes).toHaveLength(1);
      expect(projection(k.sim(season, tracked(k, season, nextChance).draw)).notes).toHaveLength(0);
      k.progress(season, () => .5); season = clone(season);
      expect(season.purchased).toEqual([k.id, k.id]); expect(season.yearlyCosts).toBe(k.items.find(item => item.id === k.id)!.yearly);
    }
  });

  it.each(cases)('$sport matched injured and healthy branches keep exact severity season state and RNG draws', k => {
    for (const position of k.positions) for (const chance of [0, .99]) {
      const a = fixture(k, position, 40), b = bought(k, clone(a)), ar = tracked(k, a, chance), br = tracked(k, b, chance);
      const baseline = k.sim(a, ar.draw), protectedOutput = k.sim(b, br.draw);
      expect(protectedOutput).toEqual(baseline); expect(br.count()).toBe(ar.count()); expect(stripped(b)).toEqual(stripped(a));
      expect(projection(baseline).notes.length).toBe(chance === 0 ? 1 : 0);
    }
  });

  it.each(cases)('$sport actual liquidation cancels recovery for future seasons and JSON reload', k => {
    const paid = bought(k, fixture(k)); Object.assign(paid, { age: 31, netWorth: 1 });
    const active = clone(paid), event = k.events(paid).find(e => e.id.endsWith('_broke'))!;
    const chance = baseRisk(k, active) * .875;
    expect(projection(k.sim(clone(active), tracked(k, active, chance).draw)).notes).toHaveLength(0);
    const health = paid.health; event.options[0].apply(paid);
    expect(paid.purchased).not.toContain(k.id); expect(paid.yearlyCosts).toBe(0); expect(paid.health).toBe(health);
    const restored = clone(paid), baseline = clone(restored); baseline.purchased = [];
    const ar = tracked(k, restored, chance), br = tracked(k, baseline, chance);
    const canceled = k.sim(restored, ar.draw), unowned = k.sim(baseline, br.draw);
    expect(projection(canceled).notes).toHaveLength(1); expect(canceled).toEqual(unowned); expect(ar.count()).toBe(br.count());
  });

  it.each(cases)('$sport unowned unknown and other-sport receipts keep exact original season behavior', k => {
    for (const ids of [undefined, [], ['unknown_receipt'], cases.filter(other => other !== k).map(other => other.id)]) for (const chance of [0, .15, .99]) {
      const a = fixture(k), b = clone(a); b.purchased = ids;
      const ar = tracked(k, a, chance), br = tracked(k, b, chance);
      expect(k.sim(b, br.draw)).toEqual(k.sim(a, ar.draw)); expect(br.count()).toBe(ar.count()); expect(stripped(b)).toEqual(stripped(a));
    }
  });
});
