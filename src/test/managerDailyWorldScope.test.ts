import { describe, expect, it } from 'vitest';
import { careerLeagueOf, startCareer } from '@/lib/clubManager';
import { dailyDeadlineDay, replayDeadlineDay, startDeadlineDay } from '@/lib/deadlineDay';
import { dailyHotSeat, replayHotSeat, startHotSeat, upcoming, withSeed, type HotSeatAction } from '@/lib/managerHotSeat';

describe('manager Daily world scope at the K League release', () => {
  it('restores the original Athletic Club matches from the saved Daily tape', () => {
    const setup = dailyHotSeat('2026-10-10');
    // The eight actions played on the pre-release engine, in saved order.
    const press: HotSeatAction = { t: 'press', i: 0 };
    const match: HotSeatAction = { t: 'match', m: 'balanced', talk: null };
    const actions = [press, match, press, match, match, press, match, match];
    const run = replayHotSeat(setup, actions);

    expect(run.log.map(m => [m.opponent, m.myGoals, m.oppGoals])).toEqual([
      ['Elche', 1, 1], ['Real Sociedad', 3, 2], ['Alavés', 0, 2],
      ['Atlético Madrid', 0, 1], ['Espanyol', 1, 0],
    ]);
    expect(run.actions).toEqual(actions);
    expect(run.verdict).toMatchObject({ kind: 'survived', points: 7, target: 5, leaguePlayed: 5 });
    expect(run.state.world).not.toHaveProperty('kleague1');
  });

  it('reopens Deadline Day talks with the target at the original saved index', () => {
    const setup = dailyDeadlineDay('2026-10-11');
    const actions = [{ t: 'open', i: 4 }] as const;
    const run = replayDeadlineDay(setup, [...actions]);

    expect(run.targets[4]).toMatchObject({ mp: { name: 'Alphonso Davies', price: 40.5 }, status: 'talks' });
    expect(run.actions).toEqual(actions);
    expect(run.startBudget).toBe(94.5);
    expect(run.state.world).not.toHaveProperty('kleague1');
  });

  it.each([
    ['2026-11-05', 'AZ Alkmaar', 'Heerenveen', 14, 9, false],
    ['2026-11-06', 'QPR', 'Portsmouth', 13, 5, true],
    ['2026-11-07', 'Fenerbahçe', 'Kocaelispor', 11, 12, true],
  ])('uses the right world for the %s Daily in both games', (date, club, opponent, week, target, includeKLeague) => {
    const run = startHotSeat(dailyHotSeat(date));
    expect(run.setup.club).toBe(club);
    expect(upcoming(run)?.opponent).toBe(opponent);
    expect(run.takeover.week).toBe(week);
    expect(run.target).toBe(target);
    expect(Object.prototype.hasOwnProperty.call(run.state.world ?? {}, 'kleague1')).toBe(includeKLeague);
    const deadline = startDeadlineDay(dailyDeadlineDay(date));
    expect(Object.prototype.hasOwnProperty.call(deadline.state.world ?? {}, 'kleague1')).toBe(includeKLeague);
  });

  it('keeps undated runs and ordinary Club Manager careers in the expanded world', () => {
    const setup = { club: 'Arsenal', seed: 1 };
    const free = replayHotSeat({ ...setup, rules: 1331, tie: 1603 }, [{ t: 'match', m: 'balanced', talk: null }]);
    expect(free.log[0]?.opponent).toBe('PSV');
    expect(free.state.world).toHaveProperty('kleague1');
    expect(replayDeadlineDay(setup, []).state.world).toHaveProperty('kleague1');

    expect(withSeed(17, () => startCareer('Arsenal')).world?.kleague1.table).toHaveLength(12);
    const ulsan = withSeed(17, () => startCareer('Ulsan HD'));
    expect(careerLeagueOf(ulsan).id).toBe('kleague1');
    expect(ulsan.table).toHaveLength(12);
  });
});
