/* Round 1343: retiring. The engine's side is scripts/simCmRetire.mjs section retire. */
import { describe, expect, it } from 'vitest';
import { startCareer, worldSeasonLabel, type CareerState, type H2HEntry } from '@/lib/clubManager';
import { canRetire, careerLegacy, farewellShareText, printedWeek, retireCareer, retirementMoment } from '@/lib/clubManagerRetire';

const deepFreeze = <T,>(o: T): T => {
  if (o && typeof o === 'object') { Object.values(o as object).forEach(deepFreeze); Object.freeze(o); }
  return o;
};
const row = (opp: string, score: string, res: H2HEntry['res'], season = 1): H2HEntry => ({ opp, score, res, season, comp: 'league', home: true });
const without = (c: CareerState) => {
  const x = JSON.parse(JSON.stringify(c));
  delete x.retired;
  delete x.careerStats.highestScoring;
  return JSON.stringify(x);
};
const DASHES = [0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212].map(n => String.fromCharCode(n));

describe('retiring', { timeout: 60000 }, () => {
  const fresh = startCareer('Everton');

  it('refuses a retired career and a match in progress', () => {
    expect(canRetire(fresh)).toBe(true);
    expect(canRetire(null)).toBe(false);
    expect(canRetire({ ...fresh, retired: { season: 1, worldSeason: '2026-27', when: 'seasonEnd', club: 'Everton' } })).toBe(false);
    expect(canRetire({ ...fresh, live: {} as CareerState['live'] })).toBe(false);
    expect(retireCareer({ ...fresh, live: {} as CareerState['live'] })).toBeNull();
  });

  it('reads the moment: out of work over a season end, a season end over the middle of one', () => {
    const summary = {} as NonNullable<CareerState['pendingSummary']>;
    expect(retirementMoment({ ...fresh, sacked: true, pendingSummary: summary })).toBe('outOfWork');
    expect(retirementMoment({ ...fresh, pendingSummary: summary })).toBe('seasonEnd');
    expect(retirementMoment(fresh)).toBe('midSeason');
  });

  it('changes only `retired` at all three moments, never touching its input', () => {
    const summary = { season: 1 } as unknown as NonNullable<CareerState['pendingSummary']>;
    const cases: [CareerState, string][] = [[fresh, 'midSeason'], [{ ...fresh, pendingSummary: summary }, 'seasonEnd'], [{ ...fresh, sacked: true }, 'outOfWork']];
    for (const [input, when] of cases) {
      const c = deepFreeze(JSON.parse(JSON.stringify(input)) as CareerState);
      const r = retireCareer(c)!;
      expect(r.retired?.when).toBe(when);
      expect(r.retired?.club).toBe('Everton');
      expect(r.retired?.season).toBe(c.season);
      expect(r.retired?.worldSeason).toBe(worldSeasonLabel(c));
      expect(without(r)).toBe(JSON.stringify(c));
      expect('highestScoring' in r.careerStats).toBe(false);
      expect(retireCareer(r)).toBeNull();
      if (when === 'midSeason') {
        expect(r.retired?.week).toBe(c.week);
        expect(r.retired?.position).toBeGreaterThanOrEqual(1);
        expect(r.retired?.played).toBe(0);
        expect(r.retired?.points).toBe(0);
      } else expect(r.retired).not.toHaveProperty('week');
    }
  });

  it('writes the record down from the book when the save had none, and keeps a stored one', () => {
    const c = deepFreeze({ ...fresh, h2h: [row('A', '1-0', 'W'), row('B', '3-3', 'D', 1)], careerStats: { ...fresh.careerStats, played: 5 } } as CareerState);
    expect(retireCareer(c)!.careerStats.highestScoring).toEqual({ opp: 'B', score: '3-3', res: 'D', season: 1, missed: 3 });
    const stored = { opp: 'S', score: '1-1', res: 'D' as const, season: 1 };
    expect(retireCareer({ ...c, careerStats: { ...c.careerStats, highestScoring: stored } })!.careerStats.highestScoring).toEqual(stored);
  });

  it('prints the week the managers screen printed, capped at the calendar', () => {
    const c = { ...fresh, calendar: fresh.calendar.slice(0, 30) };
    expect(printedWeek(c, 22)).toBe(23);
    expect(printedWeek(c, 30)).toBe(30);
  });
});

describe('the farewell\'s data', () => {
  const base = (over: Partial<CareerState>): CareerState => ({
    clubName: 'D', season: 3, history: [], trophies: [], jobHunt: undefined, nationJob: null,
    careerStats: { played: 0, wins: 0, draws: 0, losses: 0 }, ...over,
  }) as unknown as CareerState;
  const hist = (season: number, club: string) => ({ season, club, position: 1, points: 80, trophies: [] });

  it('lists finished seasons per club, and numbers only the part season the save still names', () => {
    const c = base({
      history: [hist(1, 'A'), hist(3, 'D')],
      careerStats: { played: 100, wins: 50, draws: 20, losses: 30, clubsManaged: ['A', 'B', 'C', 'D'] },
      jobHunt: { open: null, cooldowns: [], sentSeason: 3, sent: 0, summerMove: null, lastMove: { from: 'C', to: 'D', interim: 'X', season: 3, week: 9, when: 'now' } },
    });
    const l = careerLegacy(c);
    expect(l.clubs.map(x => x.club)).toEqual(['A', 'B', 'C', 'D']);
    expect(l.clubs[0]).toEqual({ club: 'A', seasons: [1] });
    expect(l.clubs[1]).toEqual({ club: 'B', seasons: [], partOf: null });
    expect(l.clubs[2]).toEqual({ club: 'C', seasons: [], partOf: 3 });
    expect(l.clubs[3]).toEqual({ club: 'D', seasons: [3] });
    expect(l.finishedSeasons).toBe(2);
    expect(l.winRate).toBe(50);
  });

  it('keeps the season left unfinished by a mid season retirement', () => {
    const c = base({ history: [hist(1, 'D'), hist(2, 'D')], retired: { season: 3, worldSeason: '2028-29', when: 'midSeason', club: 'D', week: 12, position: 9, played: 12, points: 15 } });
    const l = careerLegacy(c);
    expect(l.clubs).toEqual([{ club: 'D', seasons: [1, 2], unfinished: 3 }]);
    expect(l.lastSeason).toBe(3);
    expect(l.finishedSeasons).toBe(2);
  });

  it('groups the cabinet by name in the order first won, a name it has never seen included', () => {
    const c = base({ trophies: [
      { name: 'League Title', emoji: '🏆', season: 1 }, { name: 'Galactic Shield', emoji: '🛡️', season: 2 }, { name: 'League Title', emoji: '🏆', season: 3 },
    ] });
    const l = careerLegacy(c);
    expect(l.cabinet).toEqual([{ name: 'League Title', emoji: '🏆', seasons: [1, 3] }, { name: 'Galactic Shield', emoji: '🛡️', seasons: [2] }]);
    expect(l.trophies).toBe(3);
    expect(l.leagueTitles).toBe(2);
  });

  it('reads a Skip career with no manager and no clubs list', () => {
    const l = careerLegacy(base({}));
    expect(l.clubs).toEqual([{ club: 'D', seasons: [], partOf: null }]);
    expect(l.nation).toBeNull();
  });
});

describe('the share line', () => {
  const legacy = (over: Partial<ReturnType<typeof careerLegacy>>) => ({
    finishedSeasons: 12, lastSeason: 12, played: 540, wins: 313, draws: 100, losses: 127, winRate: 58,
    clubs: [], cabinet: [], trophies: 7, leagueTitles: 2, nation: null, retired: null, ...over,
  });
  it('says the seasons, the trophies, the titles and the win rate, singular where it should be', () => {
    expect(farewellShareText(legacy({}))).toBe('I retired from Club Manager after 12 seasons: 7 trophies, 2 league titles, 58% of 540 matches won. Can you beat me? douknowball.com/club-manager');
    expect(farewellShareText(legacy({ finishedSeasons: 1, trophies: 1, leagueTitles: 1, played: 1, winRate: 100 })))
      .toBe('I retired from Club Manager after 1 season: 1 trophy, 1 league title, 100% of 1 match won. Can you beat me? douknowball.com/club-manager');
  });
  it('drops the titles at 0 and counts no unfinished season', () => {
    expect(farewellShareText(legacy({ finishedSeasons: 0, lastSeason: 1, trophies: 0, leagueTitles: 0, played: 1200, winRate: 41 })))
      .toBe('I retired from Club Manager in Season 1: no trophies, 41% of 1,200 matches won. Can you beat me? douknowball.com/club-manager');
  });
  it('uses no dash of any kind', () => {
    const t = farewellShareText(legacy({}));
    for (const d of DASHES) expect(t).not.toContain(d);
  });
});
