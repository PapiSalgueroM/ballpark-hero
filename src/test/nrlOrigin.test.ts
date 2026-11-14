import { describe, expect, it } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { NRL_OPENING_MATCHDAY_2026 } from '@/data/nrlOpeningMatchday2026';
import { createNrlCareer, createNrlOpeningMatchdayCareer, loadNrlPerthSigningsCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlCanPlayRole, NRL_ROLES } from '@/lib/nrlManager';
import {
  createNrlOriginSeries, isNrlOriginSeries, nrlOriginEligibility, nrlOriginFixtures, nrlOriginResult, playNrlOriginMatch,
  selectNrlOriginReserve, selectNrlOriginStarter, setNrlOriginTactic, type NrlOriginSeries,
} from '@/lib/nrlOrigin';

const activePlayers = ({ players, season }: NrlCareerState) => players.filter(player => player.contract
  && player.contract.startYear <= season.year && player.contract.endYear >= season.year);
const setup = (seed = 16) => {
  const career = createNrlOpeningMatchdayCareer('broncos', seed, NRL_OPENING_MATCHDAY_2026);
  return { career, series: createNrlOriginSeries(activePlayers(career), 2026, 'qld')! };
};

describe('NRL State of Origin', () => {
  it('uses the published 2026 men’s venues and dates and marks all later fixtures as simulated', () => {
    expect(nrlOriginFixtures(2026)).toEqual([
      { game: 1, date: '2026-05-27', venue: 'Accor Stadium, Sydney', home: 'nsw', away: 'qld', neutral: false },
      { game: 2, date: '2026-06-17', venue: 'Melbourne Cricket Ground', home: 'nsw', away: 'qld', neutral: true },
      { game: 3, date: '2026-07-08', venue: 'Suncorp Stadium, Brisbane', home: 'qld', away: 'nsw', neutral: false },
    ]);
    for (const year of [2027, 2028, 2035]) {
      expect(nrlOriginFixtures(year)).toHaveLength(3);
      for (const fixture of nrlOriginFixtures(year)) {
        expect(fixture).not.toHaveProperty('date');
        expect(fixture).not.toHaveProperty('venue');
        expect(fixture).toHaveProperty('simulated', true);
      }
    }
  });

  it('uses documented 2026 selection for real IDs, excludes unresolved real IDs, and only simulates known generated IDs', () => {
    expect(nrlOriginEligibility('nrl-real-500449')).toBe('nsw'); // Addin Fonua-Blake
    expect(nrlOriginEligibility('nrl-real-100011678')).toBe('nsw'); // Casey McLean
    expect(nrlOriginEligibility('nrl-real-504870')).toBe('qld'); // Kalyn Ponga
    expect(nrlOriginEligibility('nrl-real-507062')).toBe('qld'); // Briton Nikora
    expect(nrlOriginEligibility('nrl-real-100008071')).toBeNull(); // Dominic Young, unverified here
    expect(nrlOriginEligibility('nrl-real-1')).toBeNull();
    expect(nrlOriginEligibility('fake-player-2026-1')).toBeNull();
    expect(nrlOriginEligibility('fake-player-2-0')).toBeNull();
    expect(nrlOriginEligibility('nrl-bears-2026-1')).toBeNull();
    const verified = Object.values(NRL_OPENING_MATCHDAY_2026).flat().map(([id]) => nrlOriginEligibility(`nrl-real-${id}`));
    expect(verified.filter(side => side === 'nsw')).toHaveLength(22);
    expect(verified.filter(side => side === 'qld')).toHaveLength(19);
    for (const clubId of ['panthers', 'broncos', 'warriors', 'bears']) {
      const sides = new Set(Array.from({ length: 30 }, (_, index) => nrlOriginEligibility(`nrl-${clubId}-2027-${index}`)));
      expect(sides).toEqual(new Set(['nsw', 'qld', null]));
    }
  });

  it('supplies 13 qualified starters and six distinct reserves for either state in every supported opening', () => {
    for (const year of [2026, 2027] as const) {
      for (const { id } of nrlSeasonPlan(year).clubs) {
        const careers = [createNrlCareer(id, 16, year)];
        if (year === 2026) careers.push(createNrlOpeningMatchdayCareer(id, 16, NRL_OPENING_MATCHDAY_2026));
        for (const career of careers) {
          for (const side of ['nsw', 'qld'] as const) {
            const series = createNrlOriginSeries(activePlayers(career), year, side)!;
            expect(series, `${id} ${year} ${career.openingRoster ?? 'fictional'} ${side}`).not.toBeNull();
            expect(series.pools[side].length).toBeLessThanOrEqual(41);
            expect(series.selection.bench).toHaveLength(6);
            expect(new Set([...Object.values(series.selection.starters), ...series.selection.bench]).size).toBe(19);
            for (const role of NRL_ROLES) {
              const player = series.pools[side].find(candidate => candidate.id === series.selection.starters[role])!;
              expect(nrlCanPlayRole(player, role)).toBe(true);
            }
            expect(isNrlOriginSeries(series, career.season.seed)).toBe(true);
          }
        }
      }
    }
  });

  it('keeps every verified eligible player selectable in a named 2026 career', () => {
    for (const seed of [0, 16, 37]) {
      const { career, series } = setup(seed);
      for (const side of ['nsw', 'qld'] as const) {
        const known = activePlayers(career).filter(player => player.id.startsWith('nrl-real-') && nrlOriginEligibility(player.id) === side);
        expect(series.pools[side].map(player => player.id)).toEqual(expect.arrayContaining(known.map(player => player.id)));
      }
      expect(series.pools.qld.find(player => player.name === 'Kalyn Ponga')).toBeDefined();
      expect(series.pools.nsw.find(player => player.name === 'Nathan Cleary')).toBeDefined();
    }
  });

  it('lets a qualified reserve take a starter spot, avoids duplicates and rejects cross-state picks', () => {
    const { series } = setup();
    const pool = series.pools.qld;
    const reserve = pool.find(player => series.selection.bench.includes(player.id))!;
    const outgoing = series.selection.starters[reserve.role];
    const changed = selectNrlOriginStarter(series, reserve.role, reserve.id);
    expect(changed.selection.starters[reserve.role]).toBe(reserve.id);
    expect(changed.selection.bench[series.selection.bench.indexOf(reserve.id)]).toBe(outgoing);
    const wrongRole = NRL_ROLES.find(role => !nrlCanPlayRole(reserve, role))!;
    expect(selectNrlOriginStarter(series, wrongRole, reserve.id)).toBe(series);
    expect(selectNrlOriginReserve(series, 0, series.pools.nsw[0].id)).toBe(series);
    expect(selectNrlOriginReserve(series, 0, Object.values(series.selection.starters)[0])).toBe(series);
    const reordered = selectNrlOriginReserve(series, 0, series.selection.bench[1]);
    expect(reordered.selection.bench.slice(0, 2)).toEqual(series.selection.bench.slice(0, 2).reverse());
  });

  it('plays all three games deterministically without consuming club state, rejects stale matches and validates saved receipts', () => {
    const { career, series } = setup();
    const bytes = JSON.stringify(career);
    const attack = setNrlOriginTactic(series, 'attack');
    expect(playNrlOriginMatch(attack, career.season.seed, 2)).toBe(attack);
    const gameOne = playNrlOriginMatch(attack, career.season.seed, 1);
    expect(gameOne.matches[0]).toMatchObject({ tactic: 'attack', selection: attack.selection });
    expect(playNrlOriginMatch(gameOne, career.season.seed, 1)).toBe(gameOne);
    expect(playNrlOriginMatch(attack, career.season.seed, 1)).toEqual(gameOne);
    const gameTwo = playNrlOriginMatch(setNrlOriginTactic(gameOne, 'defense'), career.season.seed, 2);
    const done = playNrlOriginMatch(gameTwo, career.season.seed, 3);
    expect(done.matches).toHaveLength(3);
    expect(nrlOriginResult(done).winner).toMatch(/^(nsw|qld)$/);
    expect(Object.values(nrlOriginResult(done).wins).reduce((sum, count) => sum + count, 0)).toBe(3);
    expect(done.matches.every(({ homeScore, awayScore }) => homeScore !== awayScore)).toBe(true);
    expect(playNrlOriginMatch(done, career.season.seed, 4)).toBe(done);
    expect(setNrlOriginTactic(done, 'balanced')).toBe(done);
    expect(JSON.stringify(career)).toBe(bytes);
    expect(isNrlOriginSeries(JSON.parse(JSON.stringify(done)), career.season.seed)).toBe(true);
    const forged = JSON.parse(JSON.stringify(done)) as NrlOriginSeries;
    forged.matches[0].homeScore += 6;
    expect(isNrlOriginSeries(forged, career.season.seed)).toBe(false);
  });

  it('settles tied regulation in Golden Point and rejects insufficient or forged pools', () => {
    const { career, series } = setup();
    const tied = Array.from({ length: 100 }, (_, seed) => playNrlOriginMatch(series, seed, 1).matches[0])
      .find(match => match.goldenPoint)!;
    expect(tied).toBeDefined();
    expect(Math.abs(tied.homeScore - tied.awayScore)).toBe(1);
    expect(createNrlOriginSeries(activePlayers(career).slice(0, 10), 2026, 'qld')).toBeNull();
    const forged = JSON.parse(JSON.stringify(series)) as NrlOriginSeries;
    forged.pools.qld[0].id = 'nrl-real-100008071';
    expect(isNrlOriginSeries(forged, career.season.seed)).toBe(false);
  });
});

describe('Origin career saves', () => {
  const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
  const withoutOrigin = ({ origin: _, ...career }: NrlCareerState) => career;
  const start = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startOrigin', side: 'qld', year: state.season.year });
  const play = (state: NrlCareerState, game: number) => reduceNrlCareer(state, {
    type: 'playOriginMatch', game, year: state.origin!.year, side: state.origin!.side,
  });

  it('round-trips an optional series and leaves club progression byte-identical with or without it', () => {
    const initial = createNrlCareer('broncos', 16, 2026, true);
    expect(initial).not.toHaveProperty('origin');
    const old = readNrlCareerSave(JSON.stringify(createNrlSeason('broncos', 16)))!;
    expect(old).not.toHaveProperty('origin');
    const oldWithOrigin = start(old);
    expect(oldWithOrigin.origin?.side).toBe('qld');
    expect(oldWithOrigin.season).toBe(old.season);
    expect(JSON.stringify(readNrlCareerSave(JSON.stringify(oldWithOrigin)))).toBe(JSON.stringify(oldWithOrigin));
    expect(reduceNrlCareer(initial, { type: 'startOrigin', side: 'nsw', year: 2027 })).toBe(initial);
    const active = start(initial);
    expect(active.origin).toMatchObject({ year: 2026, side: 'qld' });
    expect(JSON.stringify(withoutOrigin(active))).toBe(JSON.stringify(initial));
    expect(start(active)).toBe(active);
    const played = play(active, 1);
    expect(played.origin?.matches).toHaveLength(1);
    expect(play(played, 1)).toBe(played);
    expect(played.season).toBe(initial.season);
    const raw = JSON.stringify(played);
    expect(JSON.stringify(readNrlCareerSave(raw))).toBe(raw);
    expect(raw.length - JSON.stringify(initial).length).toBeLessThan(15_000);
    let current = played;
    let baseline = initial;
    while (baseline.season.phase !== 'complete') {
      current = advance(current);
      baseline = advance(baseline);
      expect(JSON.stringify(withoutOrigin(current))).toBe(JSON.stringify(baseline));
    }
    current = reduceNrlCareer(current, { type: 'startNextSeason' });
    baseline = reduceNrlCareer(baseline, { type: 'startNextSeason' });
    expect(current.season.year).toBe(2027);
    expect(JSON.stringify(withoutOrigin(current))).toBe(JSON.stringify(baseline));
    expect(start(current)).toBe(current);
    current = play(play(current, 2), 3);
    expect(current.origin?.matches).toHaveLength(3);
    expect(JSON.stringify(readNrlCareerSave(JSON.stringify(current)))).toBe(JSON.stringify(current));
    expect(start(current).origin).toMatchObject({ year: 2027, matches: [] });
  });

  it('rejects stale Origin actions while preserving the existing live-match lock', () => {
    const initial = createNrlCareer('broncos', 16);
    const active = start(initial);
    const late = { type: 'setOriginTactic', year: 2026, game: 1, side: 'qld', tactic: 'attack' } as const;
    expect(reduceNrlCareer(active, late).origin?.tactic).toBe('attack');
    const played = play(active, 1);
    expect(reduceNrlCareer(played, late)).toBe(played);
    expect(reduceNrlCareer(active, { ...late, side: 'nsw' })).toBe(active);
    const live = reduceNrlCareer(active, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    expect(play(live, 1)).toBe(live);
    expect(JSON.stringify(readNrlCareerSave(JSON.stringify(live)))).toBe(JSON.stringify(live));
  });

  it('archives the exact previous series only when a new one starts and rejects fabricated history', () => {
    let career = createNrlCareer('broncos', 16);
    const finish = (state: NrlCareerState) => {
      while (state.season.phase !== 'complete') state = advance(state);
      return reduceNrlCareer(state, { type: 'startNextSeason' });
    };
    const recorded = [];
    for (const side of ['qld', 'nsw'] as const) {
      const appointment = reduceNrlCareer(career, { type: 'startOrigin', side, year: career.season.year });
      expect(appointment.originHistory ?? []).toEqual(recorded);
      const done = play(play(play(appointment, 1), 2), 3);
      const archive = { year: done.origin!.year, side, winner: nrlOriginResult(done.origin!).winner,
        matches: done.origin!.matches.map(({ homeScore, awayScore, goldenPoint }) => ({ homeScore, awayScore, goldenPoint })) };
      expect(done.originHistory ?? []).toEqual(recorded);
      expect(start(done)).toBe(done);
      career = finish(done);
      expect(career.originHistory ?? []).toEqual(recorded);
      const old = career.origin;
      expect(reduceNrlCareer(career, { type: 'startOrigin', side, year: career.season.year, nominationId: 'none' }).origin).toBe(old);
      recorded.push(archive);
    }
    const active = start(career);
    expect(active.origin?.year).toBe(2028);
    expect(active.originHistory).toEqual(recorded);
    expect(readNrlCareerSave(JSON.stringify(active))).toEqual(active);
    for (const originHistory of [
      [...recorded].reverse(),
      [...recorded, recorded[1]],
      [{ ...recorded[0], winner: recorded[0].winner === 'qld' ? 'nsw' : 'qld' }, recorded[1]],
      [{ ...recorded[0], matches: [{ homeScore: 8, awayScore: 8, goldenPoint: false }, ...recorded[0].matches.slice(1)] }, recorded[1]],
    ]) expect(readNrlCareerSave(JSON.stringify({ ...active, originHistory }))).toBeNull();
    const { originHistory: _omit, ...oldSave } = active;
    expect(readNrlCareerSave(JSON.stringify(oldSave))).toEqual(oldSave);
  });

  it('lets a club coach add one eligible omitted player to the Origin pool and field them', () => {
    const initial = createNrlCareer('broncos', 16);
    const base = start(initial);
    const pool = base.origin!.pools.qld;
    const own = activePlayers(initial).filter(player => player.contract?.clubId === initial.season.clubId);
    const candidate = own.find(player => nrlOriginEligibility(player.id) === 'qld' && !pool.some(p => p.id === player.id))!;
    expect(candidate).toBeDefined();
    const nominate = (id: string) => reduceNrlCareer(initial, { type: 'startOrigin', side: 'qld', year: 2026, nominationId: id });
    expect(nominate(own.find(player => nrlOriginEligibility(player.id) === 'nsw')!.id)).toBe(initial);
    expect(nominate(activePlayers(initial).find(player => nrlOriginEligibility(player.id) === 'qld'
      && player.contract?.clubId !== initial.season.clubId)!.id)).toBe(initial);
    const nominated = nominate(candidate.id);
    expect(nominated.origin?.nomination).toEqual({ clubId: 'broncos', playerId: candidate.id });
    expect(nominated.origin?.pools.qld).toHaveLength(pool.length);
    expect(nominated.origin?.pools.qld.some(player => player.id === candidate.id)).toBe(true);
    expect(nominated.origin?.pools.nsw).toEqual(base.origin?.pools.nsw);
    expect(nominated.origin?.selection).toEqual(base.origin?.selection);
    expect(withoutOrigin(nominated)).toEqual(initial);
    const chosen = reduceNrlCareer(nominated, { type: 'selectOriginReserve', game: 1, year: 2026, side: 'qld', slot: 0, playerId: candidate.id });
    const played = play(chosen, 1);
    expect(played.origin?.matches[0].selection.bench[0]).toBe(candidate.id);
    expect(withoutOrigin(advance(played))).toEqual(advance(initial));
    const raw = JSON.stringify(played);
    expect(JSON.stringify(readNrlCareerSave(raw))).toBe(raw);
    const forged = { ...played, origin: { ...played.origin, nomination: { clubId: 'raiders', playerId: candidate.id } } };
    expect(readNrlCareerSave(JSON.stringify(forged))).toBeNull();
    let completedClub = played;
    while (completedClub.season.phase !== 'complete') completedClub = advance(completedClub);
    const moved = reduceNrlCareer(completedClub, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    expect(moved.season).toMatchObject({ clubId: 'bears', year: 2027 });
    expect(moved.origin?.nomination).toEqual({ clubId: 'broncos', playerId: candidate.id });
    expect(JSON.stringify(readNrlCareerSave(JSON.stringify(moved)))).toBe(JSON.stringify(moved));
  });

  it('retains all verified players and the current default selections on a named career', () => {
    const initial = createNrlOpeningMatchdayCareer('broncos', 16, NRL_OPENING_MATCHDAY_2026);
    const base = start(initial);
    const reece = 'nrl-real-510216';
    const named = reduceNrlCareer(initial, { type: 'startOrigin', side: 'qld', year: 2026, nominationId: reece });
    expect(named.origin).toEqual({ ...base.origin, nomination: { clubId: 'broncos', playerId: reece } });
    expect(play(named, 1).origin?.matches).toEqual(play(base, 1).origin?.matches);
    expect(JSON.stringify(readNrlCareerSave(JSON.stringify(named)))).toBe(JSON.stringify(named));
    const candidate = activePlayers(initial).find(player => player.contract?.clubId === 'broncos'
      && !nrlOriginEligibility(player.id) && player.id.startsWith('nrl-real-'))!;
    expect(reduceNrlCareer(initial, { type: 'startOrigin', side: 'qld', year: 2026, nominationId: candidate.id })).toBe(initial);
  });

  it('uses verified eligibility for named 2027 Perth signings', async () => {
    const perth = await loadNrlPerthSigningsCareer(16, false);
    const qld = { type: 'startOrigin', side: 'qld', year: 2027 } as const;
    expect(reduceNrlCareer(perth, { ...qld, nominationId: 'nrl-real-perth-toby-sexton' })).toBe(perth);
    const nominated = reduceNrlCareer(perth, { ...qld, nominationId: 'nrl-real-504371' });
    expect(nominated.origin?.nomination).toEqual({ clubId: 'bears', playerId: 'nrl-real-504371' });
    expect(nominated.origin?.pools.qld.some(player => player.name === 'Gehamat Shibasaki')).toBe(true);
    expect(JSON.stringify(readNrlCareerSave(JSON.stringify(nominated)))).toBe(JSON.stringify(nominated));
  });
});
