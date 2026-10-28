import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { marketForScreen, startCareer, worldYear, type MarketPlayer } from '@/lib/clubManager';
import {
  addRecruitment, removeRecruitment, recruitmentContext, recruitmentKey, recruitmentOf, recruitmentTarget, resolveRecruitmentTarget,
  type RecruitmentCareer,
} from '@/lib/clubManagerRecruitment';

beforeEach(() => {
  let seed = 20261028;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
});
afterEach(() => vi.restoreAllMocks());
function fixture() {
  const career = startCareer('Brentford'), market = marketForScreen(career);
  const seen = new Set<string>();
  const unique = market.filter(p => {
    const key = recruitmentKey(recruitmentTarget(career, p));
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  expect(unique.length, 'actual current market must support the12-target boundary and one overflow').toBeGreaterThan(12);
  return { career, market, players: unique.slice(0, 13) };
}
function saved() {
  const { career, market, players } = fixture();
  const next = addRecruitment(career, players[0]) as RecruitmentCareer;
  expect(next).not.toBeNull();
  return { career, market, player: players[0], next, target: next.recruitment!.targets[0] };
}
describe('Club Manager current recruitment identities and explicit metadata writes', () => {
  it('stores only current identity and context while keeping every existing field and all draws', () => {
    const { career, players } = fixture(), before = JSON.stringify(career);
    const draws = vi.mocked(Math.random).mock.calls.length;
    const next = addRecruitment(career, players[0]) as RecruitmentCareer;
    expect(next).not.toBe(career);
    const { recruitment, ...old } = next;
    expect(JSON.stringify(old)).toBe(before);
    expect(recruitment).toEqual({ version: 1, ...recruitmentContext(career), targets: [recruitmentTarget(career, players[0])] });
    for (const field of ['price', 'age', 'rating', 'potential']) expect(recruitment!.targets[0]).not.toHaveProperty(field);
    expect(JSON.stringify(career)).toBe(before);
    expect(vi.mocked(Math.random).mock.calls).toHaveLength(draws);
  });
  it('admits12 targets in order, rejects the13th and makes a duplicate at capacity a no-op', () => {
    const { career, players } = fixture();
    let next = career;
    for (const p of players.slice(0, 12)) next = addRecruitment(next, p)!;
    expect(recruitmentOf(next)!.targets.map(p => p.name)).toEqual(players.slice(0, 12).map(p => p.name));
    const before = JSON.stringify(next);
    expect(addRecruitment(next, players[12])).toBeNull();
    expect(addRecruitment(next, players[0])).toBe(next);
    expect(JSON.stringify(next)).toBe(before);
  });
  it('removes an unavailable target and restores exact original bytes after the last removal', () => {
    const { career, next, target } = saved();
    expect(resolveRecruitmentTarget(next, target, [])).toBeNull();
    const removed = removeRecruitment(next, target)!;
    expect(removed).not.toHaveProperty('recruitment');
    expect(JSON.stringify(removed)).toBe(JSON.stringify(career));
    expect(removeRecruitment(removed, target)).toBeNull();
  });
  it('reads absent and malformed metadata without changing a byte or consuming a draw', () => {
    const { career, next, target } = saved();
    const values: unknown[] = [undefined, null, {}, { ...next.recruitment, version: 2 }, { ...next.recruitment, targets: 'bad' },
      { ...next.recruitment, targets: [target, target] }, { ...next.recruitment, targets: Array(13).fill(target) },
      { ...next.recruitment, targets: [{ ...target, cohort: NaN }] }, { ...next.recruitment, worldSeed: undefined }];
    for (const value of values) {
      const c = { ...career, recruitment: value } as unknown as RecruitmentCareer;
      const before = JSON.stringify(c), draws = vi.mocked(Math.random).mock.calls.length;
      expect(recruitmentOf(c)).toBeNull();
      expect(JSON.stringify(c)).toBe(before);
      expect(vi.mocked(Math.random).mock.calls).toHaveLength(draws);
    }
  });
  it('rejects each changed club era start-year and seed context including same-club foreign-era data', () => {
    const { next } = saved(), own = recruitmentContext(next);
    expect(own.eraId).not.toBe('era2020'); expect(own.startYear).not.toBe(2020);
    const changes = [{ clubName: own.clubName + ' copied foreign context' }, { eraId: 'era2020' }, { startYear: own.startYear + 1 }, { worldSeed: own.worldSeed === null ? 0 : null }];
    for (const change of changes) {
      const foreign = { ...next, recruitment: { ...next.recruitment!, ...change } };
      expect(recruitmentContext(next)).not.toMatchObject(change);
      const before = JSON.stringify(foreign);
      expect(recruitmentOf(foreign)).toBeNull();
      expect(JSON.stringify(foreign)).toBe(before);
    }
  });
  it('an explicit Add replaces foreign metadata with the current context, with no other change', () => {
    const { next, player } = saved();
    const foreign = { ...next, recruitment: { ...next.recruitment!, eraId: 'era2020', startYear: 2020 } };
    const added = addRecruitment(foreign, player) as RecruitmentCareer;
    expect(added.recruitment).toEqual(next.recruitment);
    const { recruitment: _r, ...rest } = added, { recruitment: _f, ...before } = foreign;
    expect(rest).toStrictEqual(before);
  });
  it('an actual keyed target follows its exact key across a club move and reads updated facts', () => {
    const { career, market } = fixture();
    const player = market.find(p => !!p.worldRosterKey);
    expect(player, 'actual seeded market needs an existing stable key').toBeDefined();
    const target = recruitmentTarget(career, player!);
    const otherClub = market.find(p => p.club !== player!.club)!.club;
    // Copied observations deliberately represent a move and changed game numbers, not imported sports facts.
    const moved = { ...player!, club: otherClub, age: player!.age + 1, rating: player!.rating - 1, price: player!.price + 1 };
    expect(resolveRecruitmentTarget({ ...career, season: career.season + 1 }, target, [moved])).toBe(moved);
    expect(target.club).toBe(player!.club);
  });
  it('a missing stable key never falls back to a same-name same-cohort replacement', () => {
    const { career, market } = fixture(), player = market.find(p => !!p.worldRosterKey)!;
    expect(player).toBeDefined();
    const target = recruitmentTarget(career, player);
    const replacement = { ...player, worldRosterKey: player.worldRosterKey + ':copied-wrong-key' };
    expect(replacement.worldRosterKey).not.toBe(player.worldRosterKey);
    expect(resolveRecruitmentTarget(career, target, [replacement])).toBeNull();
    expect(resolveRecruitmentTarget(career, target, [player, { ...player }])).toBeNull();
    expect(resolveRecruitmentTarget(career, target, [player])).toBe(player);
  });
  it('legacy matching keeps the original club and game cohort, refuses ambiguity and does not follow namesakes', () => {
    const { career, market, players } = fixture();
    const player: MarketPlayer = { ...players[0], worldRosterKey: undefined };
    const target = recruitmentTarget(career, player);
    expect(target).not.toHaveProperty('worldRosterKey');
    const aged = { ...player, age: player.age + 1 };
    const next = { ...career, season: career.season + 1 };
    expect(worldYear(next) - aged.age).toBe(target.cohort);
    expect(resolveRecruitmentTarget(next, target, [aged])).toBe(aged);
    const otherClub = market.find(p => p.club !== player.club)!.club;
    const namesake = { ...aged, club: otherClub };
    expect(namesake.club).not.toBe(target.club);
    expect(resolveRecruitmentTarget(next, target, [namesake])).toBeNull();
    expect(resolveRecruitmentTarget(next, target, [aged, { ...aged }])).toBeNull();
    expect(resolveRecruitmentTarget(next, target, [{ ...aged, age: aged.age + 1 }])).toBeNull();
  });
  it('refuses a supplied nonexistent key before adding any metadata', () => {
    const { career, players } = fixture(), before = JSON.stringify(career);
    expect(addRecruitment(career, { ...players[0], worldRosterKey: 'copied-absent-target-key' })).toBeNull();
    expect(JSON.stringify(career)).toBe(before);
  });
  it('duplicate legacy and keyed views of the same current row do not create two targets', () => {
    const { career, market } = fixture(), player = market.find(p => !!p.worldRosterKey)!;
    expect(player).toBeDefined();
    const legacy = recruitmentTarget(career, { ...player, worldRosterKey: undefined });
    const prior: RecruitmentCareer = { ...career, recruitment: { version: 1, ...recruitmentContext(career), targets: [legacy] } };
    expect(addRecruitment(prior, player)).toBe(prior);
    expect(recruitmentOf(prior)!.targets).toHaveLength(1);
  });
});
