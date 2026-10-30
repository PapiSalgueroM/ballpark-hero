import { describe, expect, it } from 'vitest';
import * as T from '@/lib/stadiumTycoon';
import { LAW, goalLambda } from '@/lib/season/law';
import { lehmer } from '@/lib/arcade';

const NOW = 1_700_000_000_000;
const choices: T.MatchPlanChoice[] = ['protect', 'balanced', 'chase'];

function fixture(minute = 60): T.TycoonState {
  const base = T.newTycoon(NOW);
  let best = { ...base, minute };
  for (let squad = 0; squad <= 200; squad += 1) {
    const candidate = { ...base, minute, levels: { ...base.levels, squad } };
    if (Math.abs(T.matchGap(candidate)) < Math.abs(T.matchGap(best))) best = candidate;
  }
  return best;
}

function clone(state: T.TycoonState): T.TycoonState {
  return JSON.parse(JSON.stringify(state));
}

function freeze<Value>(value: Value): Value {
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) freeze(nested);
    Object.freeze(value);
  }
  return value;
}

function withoutPlan(state: T.TycoonState): T.TycoonState {
  const copy = { ...state };
  delete copy.matchPlan;
  return copy;
}

function counted(seed: number) {
  const rng = lehmer(seed);
  let draws = 0;
  return { roll: () => { draws += 1; return rng(); }, draws: () => draws };
}

describe('Stadium late-match plan', () => {
  it('keeps absent and explicit Balanced neutral without hiding time or RNG drift', () => {
    const untouched = freeze(fixture(0));
    const bytes = JSON.stringify(untouched);
    expect(T.matchPlanFor(untouched)).toBeNull();
    expect(T.canSetMatchPlan(untouched)).toBe(false);
    expect(T.goalChancePerMin(untouched)).toBe(goalLambda(T.matchGap(untouched), LAW.home) / 90);
    expect(T.oppChancePerMin(untouched, .2)).toBe(goalLambda(-T.matchGap(untouched), LAW.away) * .8 / 90);
    expect(JSON.stringify(untouched)).toBe(bytes);

    const run = (balanced: boolean) => {
      let state = clone(untouched);
      const stream = counted(6127);
      const events: T.TickEvent[] = [];
      for (let minute = 0; minute < 90; minute += 1) {
        if (balanced && minute === 60) state = T.setMatchPlan(state, 'balanced');
        const next = T.tick(state, 1.4, stream.roll, .2);
        state = next.state;
        events.push(...next.events);
      }
      return { state, events, draws: stream.draws() };
    };
    const absent = run(false);
    const balanced = run(true);
    expect(absent.draws).toBe(180);
    expect(balanced.draws).toBe(180);
    expect(Object.prototype.hasOwnProperty.call(absent.state, 'matchPlan')).toBe(false);
    expect(balanced.state.matchPlan?.choice).toBe('balanced');
    expect(withoutPlan(balanced.state)).toEqual(absent.state);
    expect(balanced.events).toEqual(absent.events);
    expect(T.serializeTycoon(withoutPlan(balanced.state), NOW + 9000)).toBe(T.serializeTycoon(absent.state, NOW + 9000));
    expect(JSON.parse(T.serializeTycoon(absent.state, NOW + 9000)).savedAt).toBe(NOW + 9000);
  });

  it('commits once at 60 through 89 and changes only the commitment metadata', () => {
    for (const minute of [59, 60, 89, 90]) {
      for (const choice of choices) {
        const before = freeze(fixture(minute));
        const bytes = JSON.stringify(before);
        const allowed = minute === 60 || minute === 89;
        expect(T.canSetMatchPlan(before)).toBe(allowed);
        const after = T.setMatchPlan(before, choice);
        if (!allowed) expect(after).toBe(before);
        else {
          expect(after).not.toBe(before);
          expect(after.matchPlan).toEqual({ rep: before.rep, match: before.totalMatches, choice });
          expect(T.matchPlanFor(after)).toBe(after.matchPlan);
          expect(T.canSetMatchPlan(after)).toBe(false);
          expect(withoutPlan(after)).toEqual(before);
          expect(Object.keys(after).filter(key => !Object.prototype.hasOwnProperty.call(before, key))).toEqual(['matchPlan']);
          for (const key of Object.keys(before) as (keyof T.TycoonState)[]) expect(after[key]).toBe(before[key]);
          expect(after.savedAt).toBe(NOW);
          for (const second of choices) expect(T.setMatchPlan(after, second)).toBe(after);
          expect(T.setMatchPlan(after, 'rush' as T.MatchPlanChoice)).toBe(after);
        }
        expect(JSON.stringify(before)).toBe(bytes);
      }
    }
  });

  it('distinguishes legacy undefined from hostile fields without mutating frozen inputs', () => {
    const base = fixture();
    const legacy = freeze({ ...base, totalMatches: undefined });
    expect(T.setMatchPlan(legacy, 'balanced').matchPlan?.match).toBe(0);
    const badValues: Record<string, unknown[]> = {
      totalMatches: [null, false, '0', -.5, .5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1],
      rep: [null, false, '0', -1, .5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1],
      minute: [null, '60', -1, 60.5, NaN, Infinity, 91],
      matchPlan: [null, [], {}, { rep: 0, match: 0, choice: 'rush' }, { rep: '0', match: 0, choice: 'balanced' }, { rep: 0, match: null, choice: 'chase' }],
    };
    for (const [field, values] of Object.entries(badValues)) for (const value of values) {
      const state = freeze({ ...base, [field]: value } as unknown as T.TycoonState);
      const keys = Object.keys(state);
      expect(T.matchPlanFor(state)).toBeNull();
      expect(T.canSetMatchPlan(state)).toBe(false);
      expect(T.setMatchPlan(state, 'protect')).toBe(state);
      expect(Object.keys(state)).toEqual(keys);
      expect((state as unknown as Record<string, unknown>)[field]).toBe(value);
    }
    expect(T.setMatchPlan(base, 'rush' as T.MatchPlanChoice)).toBe(base);
    for (const identity of [{ rep: base.rep + 1, match: base.totalMatches! }, { rep: base.rep, match: base.totalMatches! + 1 }]) {
      const stale = freeze({ ...base, matchPlan: { ...identity, choice: 'balanced' as const } });
      expect(T.matchPlanFor(stale)).toBeNull();
      expect(T.canSetMatchPlan(stale)).toBe(true);
      expect(T.setMatchPlan(stale, 'protect').matchPlan?.choice).toBe('protect');
      expect(stale.matchPlan.choice).toBe('balanced');
    }
  });

  it('keeps reload commitments and validates raw identity before existing save repairs', () => {
    const base = fixture();
    for (const choice of choices) {
      const saved = T.serializeTycoon(T.setMatchPlan(base, choice), NOW);
      const loaded = T.deserializeTycoon(saved, NOW)!;
      expect(T.matchPlanFor(loaded)?.choice).toBe(choice);
      expect(T.setMatchPlan(loaded, 'chase')).toBe(loaded);
    }
    const malformed: Record<string, unknown>[] = [
      { totalMatches: null }, { totalMatches: false }, { totalMatches: '0' }, { totalMatches: .5 },
      { rep: null }, { rep: .5 }, { rep: 51 }, { minute: 59 }, { minute: 60.5 }, { minute: 90 },
      { matchPlan: null }, { matchPlan: [] }, { matchPlan: { rep: 0, match: 0, choice: 'rush' } },
    ];
    for (const changes of malformed) {
      const raw = { ...base, matchPlan: { rep: base.rep, match: base.totalMatches, choice: 'protect' }, ...changes };
      const loaded = T.deserializeTycoon(JSON.stringify(raw), NOW)!;
      const oldShape: Record<string, unknown> = { ...raw };
      delete oldShape.matchPlan;
      const decodedOld = T.deserializeTycoon(JSON.stringify(oldShape), NOW)!;
      expect(Object.prototype.hasOwnProperty.call(loaded, 'matchPlan')).toBe(false);
      expect(loaded).toEqual(decodedOld);
      expect(T.serializeTycoon(loaded, NOW)).toBe(T.serializeTycoon(decodedOld, NOW));
    }
    const legacy = { ...base, totalMatches: undefined };
    const loadedLegacy = T.deserializeTycoon(JSON.stringify(legacy), NOW)!;
    expect(Object.prototype.hasOwnProperty.call(loadedLegacy, 'matchPlan')).toBe(false);
    expect(loadedLegacy.totalMatches).toBe(0);
    const decodedBase = T.deserializeTycoon(JSON.stringify(base), NOW)!;
    expect(T.serializeTycoon(loadedLegacy, NOW)).toBe(T.serializeTycoon(decodedBase, NOW));
  });

  it('applies the real bounded law in both directions and preserves Academy and rivals', () => {
    const base = fixture();
    for (const [division, squad] of [[0, 200], [9, 0]]) {
      const saturated = { ...base, bestDivision: division, league: T.newLeague(0, division, 0), levels: { ...base.levels, squad } };
      const forRate = T.goalChancePerMin(saturated);
      const againstRate = T.oppChancePerMin(saturated, .2);
      expect(forRate === LAW.min / 90 || forRate === LAW.max / 90).toBe(true);
      expect(againstRate === LAW.min * .8 / 90 || againstRate === LAW.max * .8 / 90).toBe(true);
      for (const choice of choices) {
        const planned = T.setMatchPlan(saturated, choice);
        expect(T.goalChancePerMin(planned)).toBe(forRate);
        expect(T.oppChancePerMin(planned, .2)).toBe(againstRate);
      }
    }
    for (const minute of [60, 89, 90]) {
      const neutral = { ...base, minute };
      const protect = { ...T.setMatchPlan({ ...base, minute: 60 }, 'protect'), minute };
      const chase = { ...T.setMatchPlan({ ...base, minute: 60 }, 'chase'), minute };
      for (const edge of [0, .2, .4, -.1, NaN, Infinity, 1]) {
        const defence = Number.isFinite(edge) ? Math.max(0, Math.min(.4, edge)) : 0;
        expect(T.oppChancePerMin(neutral, edge)).toBe(goalLambda(-T.matchGap(neutral), LAW.away) * (1 - defence) / 90);
        for (const state of [neutral, protect, chase]) {
          const forRate = T.goalChancePerMin(state);
          const againstRate = T.oppChancePerMin(state, edge);
          expect(forRate).toBeGreaterThanOrEqual(LAW.min / 90);
          expect(forRate).toBeLessThanOrEqual(LAW.max / 90);
          expect(againstRate).toBeGreaterThanOrEqual(LAW.min * (1 - defence) / 90);
          expect(againstRate).toBeLessThanOrEqual(LAW.max * (1 - defence) / 90);
        }
      }
      const [home, away] = base.league!.clubs;
      expect(T.rivalChancePerMin(protect, home, away, LAW.home)).toBe(T.rivalChancePerMin(neutral, home, away, LAW.home));
      expect(T.goalChancePerMin(protect), 'STADIUM_PLAN_EFFECT_PROTECT_FOR').toBeLessThan(T.goalChancePerMin(neutral));
      expect(T.goalChancePerMin(chase), 'STADIUM_PLAN_EFFECT_CHASE_FOR').toBeGreaterThan(T.goalChancePerMin(neutral));
      for (const edge of [0, .2, .4]) {
        expect(T.oppChancePerMin(protect, edge), 'STADIUM_PLAN_EFFECT_PROTECT_AGAINST').toBeLessThan(T.oppChancePerMin(neutral, edge));
        expect(T.oppChancePerMin(chase, edge), 'STADIUM_PLAN_EFFECT_CHASE_AGAINST').toBeGreaterThan(T.oppChancePerMin(neutral, edge));
      }
    }
  });

  it('keeps both transient minute-90 plan rolls before one full-time expiry', () => {
    const base = { ...fixture(89), goalsFor: 1, goalsAgainst: 0 };
    for (const choice of ['protect', 'chase'] as const) {
      const planned = T.setMatchPlan(base, choice);
      const forPlan = T.goalChancePerMin(planned);
      const forNeutral = T.goalChancePerMin(base);
      const againstPlan = T.oppChancePerMin(planned, .2);
      const againstNeutral = T.oppChancePerMin(base, .2);
      expect(forPlan !== forNeutral && againstPlan !== againstNeutral, 'STADIUM_PLAN_FINAL_MINUTE_NONNEUTRAL').toBe(true);
      const rolls = [(forPlan + forNeutral) / 2, (againstPlan + againstNeutral) / 2];
      const finish = (input: T.TycoonState) => {
        const state = clone(input);
        const events: T.TickEvent[] = [];
        let draws = 0;
        T.playMinute(state, () => { expect(draws).toBeLessThan(2); return rolls[draws++]; }, events, { pay: true }, .2);
        return { state, events, draws };
      };
      const outcome = finish(planned);
      const neutral = finish(base);
      const scored = choice === 'chase' ? 1 : 0;
      expect(outcome.draws).toBe(2);
      expect(neutral.draws).toBe(2);
      expect(outcome.events.filter(event => event.kind === 'goal')).toHaveLength(scored);
      expect(outcome.events.filter(event => event.kind === 'conceded')).toHaveLength(scored);
      expect(neutral.events.filter(event => event.kind === 'goal')).toHaveLength(1 - scored);
      expect(neutral.events.filter(event => event.kind === 'conceded')).toHaveLength(1 - scored);
      expect(outcome.events.filter(event => event.kind === 'goal' || event.kind === 'conceded').every(event => event.minute === 90)).toBe(true);
      expect(outcome.events.filter(event => ['win', 'draw', 'loss'].includes(event.kind))).toHaveLength(1);
      expect(outcome.state.minute).toBe(0);
      expect(outcome.state.totalMatches).toBe(base.totalMatches! + 1);
      expect(T.matchPlanFor(outcome.state)).toBeNull();
    }
  });

  it('expires by match and rep without mutating stale records or changing prestige', () => {
    const base = T.setMatchPlan(fixture(), 'balanced');
    for (const changed of [{ ...base, totalMatches: base.totalMatches! + 1 }, { ...base, rep: base.rep + 1 }]) {
      const state = freeze(changed);
      expect(T.matchPlanFor(state)).toBeNull();
      expect(T.goalChancePerMin(state)).toBe(goalLambda(T.matchGap(state), LAW.home) / 90);
      expect(T.canSetMatchPlan(state)).toBe(true);
      expect(T.setMatchPlan(state, 'protect').matchPlan).toEqual({ rep: state.rep, match: state.totalMatches, choice: 'protect' });
      expect(state.matchPlan).toBe(base.matchPlan);
    }
    const sellable = { ...base, lifetime: T.prestigeThreshold(base) };
    const sold = T.prestige(sellable, NOW + 1000);
    expect(Object.prototype.hasOwnProperty.call(sold, 'matchPlan')).toBe(false);
    expect(sold).toEqual(T.prestige(withoutPlan(sellable), NOW + 1000));
    expect(sold.totalMatches).toBe(base.totalMatches);
  });

  it('continues through the actual away loop and leaves later matches and the final gate neutral', () => {
    const start = T.setMatchPlan(fixture(), 'chase');
    const awayRoll = counted(7109);
    const away = T.playAwayMatchdays(start, 2, awayRoll.roll, .2);
    const reference = clone(start);
    const referenceRoll = counted(7109);
    const events: T.TickEvent[] = [];
    for (let minute = 0; minute < 120; minute += 1) {
      const before = reference.totalMatches;
      T.playMinute(reference, referenceRoll.roll, events, { pay: false }, .2);
      if (reference.totalMatches !== before) T.settleFirsts(reference, events);
    }
    expect(away.state).toEqual(reference);
    expect(reference.totalMatches).toBe(start.totalMatches! + 2);
    expect(away.events).toEqual(events);
    expect(away.results).toHaveLength(2);
    expect(awayRoll.draws()).toBe(240);
    expect(referenceRoll.draws()).toBe(240);
    expect(away.events.filter(event => event.kind === 'goal' || event.kind === 'win').every(event => event.amount === undefined)).toBe(true);
    const later = { ...away.state, minute: 60 };
    expect(T.matchPlanFor(later)).toBeNull();
    expect(T.goalChancePerMin(later)).toBe(goalLambda(T.matchGap(later), LAW.home) / 90);
    expect(T.canSetMatchPlan(later)).toBe(true);
    const final = { ...start, league: { ...start.league!, matchday: T.leagueShape(start.league!.division).matchdays - 1 } };
    const blockedRoll = counted(7110);
    const blocked = T.playAwayMatchdays(final, 5, blockedRoll.roll, .2);
    expect(blocked.results).toHaveLength(0);
    expect(blockedRoll.draws()).toBe(0);
    expect(blocked.state).toEqual(final);
  });
});
