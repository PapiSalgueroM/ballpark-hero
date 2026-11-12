import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  DAILY_START, SAVE_KEY, buildCalendar, fixtureFor, loadCareer, playNextEntry, saveCareer, sortedUclGroup, startCareer, startNextSeason, uclEntrantsOf,
  type CareerState,
} from '@/lib/clubManager';
import { dateKey, dateOfEntries, joinClubNow } from '@/lib/clubManagerCalendar';
import { certainFixturesLeft } from '@/lib/clubManagerFinances';
import { jobHuntOf } from '@/lib/clubManagerJobHunt';
import { worldCompView } from '@/lib/clubManagerWorldView';
import { ensureEraRosters } from '@/lib/clubManagerEras';
import { mulberry32 } from '@/lib/leagueCore';

const PLAYED_UCL = { playedUclLeaguePhase: true, severeMatchInjuries: true } as const;
const legacyRules = { severeMatchInjuries: true } as const;

function seeded<T>(seed: number, run: () => T): { value: T; draws: number } {
  const rng = mulberry32(seed);
  const spy = vi.spyOn(Math, 'random').mockImplementation(rng);
  try {
    const value = run();
    return { value, draws: spy.mock.calls.length };
  } finally {
    spy.mockRestore();
  }
}

function start(club: string, opts = legacyRules, era?: string): CareerState {
  return startCareer(club, era, undefined, undefined, undefined, undefined, opts);
}

function digest(state: CareerState): string {
  // Academy IDs carry ambient time and a process-wide counter. Compare their identities
  // and references by creation order with every other serialized byte held.
  const ids = new Map<string, number>();
  const bytes = JSON.stringify(state).replace(/youth-[a-z0-9]+-[0-9]+-([0-9]{3})/g, (id, suffix) => {
    if (!ids.has(id)) ids.set(id, ids.size);
    return `youth-fixed-${ids.get(id)}-${suffix}`;
  }).replace(/(sc|pr)-[a-z0-9]+-([0-9]{4})/g, '$1-fixed-$2');
  return createHash('sha256').update(bytes).digest('hex');
}

function playTo(state: CareerState, done: (career: CareerState) => boolean): CareerState {
  for (let step = 0; step < 80 && !done(state) && state.week < state.calendar.length; step++) {
    state = playNextEntry(state, { skipHalftime: true, noCoach: true, noBook: true }).state;
  }
  return state;
}

function matchdays(state: CareerState) {
  return state.calendar.filter(entry => entry.type === 'uclGroup');
}

describe('played modern Champions League', () => {
  it('opens a 36-club field disjoint from Europa and previews eight real fixtures', () => {
    const { value: state } = seeded(731, () => start('Arsenal', PLAYED_UCL));
    const entrants = uclEntrantsOf(state);
    expect(entrants).toHaveLength(36);
    expect(new Set(entrants).size).toBe(36);
    expect(state.worldComps?.ucl).toBeUndefined();
    expect(state.worldComps?.uel?.clubs).toHaveLength(36);
    expect(state.worldComps?.uel?.clubs.filter(club => entrants.includes(club))).toEqual([]);
    expect(state.uclGroup?.table).toHaveLength(36);
    expect(worldCompView(state, 'ucl')?.nights.filter(night => night.stage === 'md').map(night => night.fixtures.length)).toEqual(Array(8).fill(18));
    const fixtures = matchdays(state).map(entry => fixtureFor(state, entry));
    expect(fixtures).toHaveLength(8);
    expect(new Set(fixtures.map(fx => fx?.opponent)).size).toBe(8);
    expect(fixtures.filter(fx => fx?.home === true)).toHaveLength(4);
    expect(fixtures.filter(fx => fx?.home === false)).toHaveLength(4);
    expect(fixtures.at(-1)?.compLabel).toContain('League MD8');
    expect(state.calendar.filter(entry => entry.uclRound === 'PO').map(entry => entry.uclLeg)).toEqual([1, 2]);
    expect(state.calendar.at(-1)?.uclRound).toBe('F');
    expect(state.severeMatchInjuries).toBe(true);
  });

  it('keeps league rounds and every two-leg knockout in order, then dates the single final last', () => {
    for (const size of [10, 12, 16, 18, 20, 22, 24]) {
      const calendar = buildCalendar(size, true, true, true, true);
      const league = calendar.filter(entry => entry.type === 'league');
      expect(league.map(entry => entry.round)).toEqual(Array.from({ length: 2 * (size - 1) }, (_, index) => index));
      expect(calendar.filter(entry => entry.type === 'uclKo').map(entry => [entry.uclRound, entry.uclLeg])).toEqual([
        ['PO', 1], ['PO', 2], ['R16', 1], ['R16', 2], ['QF', 1], ['QF', 2], ['SF', 1], ['SF', 2], ['F', undefined],
      ]);
      const firstPlayoff = calendar.findIndex(entry => entry.uclRound === 'PO');
      expect(calendar.slice(0, firstPlayoff).filter(entry => entry.type === 'uclGroup')).toHaveLength(8);
      const dates = dateOfEntries(2026, calendar);
      expect(dateKey(dates.at(-1)!)).toBeGreaterThan(dateKey(dates[calendar.indexOf(league.at(-1)!)]));
    }
  });

  it('writes 18 actual results at every matchday and completes the full bracket', () => {
    const { value: state } = seeded(731, () => playTo(start('Arsenal', PLAYED_UCL), () => false));
    expect(state.uclGroup?.matchday).toBe(8);
    expect(state.uclGroup?.table.every(row => row.w + row.d + row.l === 8)).toBe(true);
    expect(Object.keys(state.pairResults?.uclGroups ?? {})).toHaveLength(144);
    expect(state.uclBracket?.filter(tie => tie.round === 'PO')).toHaveLength(8);
    expect(state.uclBracket?.filter(tie => tie.round === 'R16')).toHaveLength(8);
    expect(state.uclBracket?.find(tie => tie.round === 'F')?.winner).toBeTruthy();
    const view = worldCompView(state, 'ucl');
    expect(view?.format).toBe('l36');
    expect(view?.table).toHaveLength(36);
    expect(view?.nights.filter(night => night.stage === 'md').flatMap(night => night.fixtures)
      .filter(match => match.homeGoals !== null && match.awayGoals !== null)).toHaveLength(144);
    expect(view?.winner).toBe(state.uclBracket?.find(tie => tie.round === 'F')?.winner);
  });

  it('leaves an active group season intact and activates only on ordinary rollover', () => {
    const { value: old } = seeded(731, () => playTo(start('Arsenal'), () => false));
    expect(matchdays(old)).toHaveLength(6);
    expect(old.uclGroup?.table).toHaveLength(4);
    const { value: next } = seeded(482, () => startNextSeason(old, undefined, PLAYED_UCL));
    expect(old.uclGroup?.table).toHaveLength(4);
    expect(matchdays(old)).toHaveLength(6);
    expect(next.uclFormat).toBe('league36');
    expect(next.uclGroup?.table).toHaveLength(36);
    expect(matchdays(next)).toHaveLength(8);
  });

  it('uses the established injury clock once on a played European matchday', () => {
    const { value: played } = seeded(731, () => {
      const career = playTo(start('Arsenal', PLAYED_UCL), state => state.calendar[state.week]?.type === 'uclGroup');
      const player = career.squad.find(p => p.injuryWeeks === 0)!;
      player.injuryWeeks = 32;
      player.severeInjury = 'ACL tear';
      const result = playNextEntry(career, { skipHalftime: true, noCoach: true, noBook: true });
      return { result, playerId: player.id };
    });
    expect(played.result.kind).toBe('match');
    expect(played.result.state.uclGroup?.matchday).toBe(1);
    expect(played.result.state.squad.find(p => p.id === played.playerId)).toMatchObject({
      injuryWeeks: 31, severeInjury: 'ACL tear',
    });
  });

  it('keeps the saved draw and recorded scores on reload after matchday four', () => {
    const { value: state } = seeded(731, () => playTo(start('Arsenal', PLAYED_UCL), career => career.uclGroup?.matchday === 4));
    localStorage.clear();
    try {
      expect(saveCareer(state)).toBe(true);
      const held = localStorage.getItem(SAVE_KEY);
      const reloaded = loadCareer();
      expect(reloaded?.uclGroup).toEqual(state.uclGroup);
      expect(reloaded?.pairResults?.uclGroups).toEqual(state.pairResults?.uclGroups);
      expect(worldCompView(reloaded!, 'ucl')).toEqual(worldCompView(state, 'ucl'));
      expect(localStorage.getItem(SAVE_KEY)).toBe(held);
    } finally {
      localStorage.clear();
    }
  });

  it('holds the season format when a club outside the competition takes a qualified job', () => {
    const joined = (opts: typeof legacyRules) => seeded(731, () => {
      const career = start('Everton', opts);
      expect(career.uclGroup).toBeNull();
      career.jobHunt = {
        ...jobHuntOf(career),
        open: { club: 'Arsenal', league: 'premier', tier: 1, season: 1, week: 0, matchesLeft: 0, roll: 0, status: 'accepted' },
      };
      return joinClubNow(career);
    }).value;
    const next = joined(PLAYED_UCL);
    expect(next?.clubName).toBe('Arsenal');
    expect(next?.uclGroup?.table).toHaveLength(36);
    const entrants = uclEntrantsOf(next!);
    expect(next?.worldComps?.uel?.clubs.some(club => entrants.includes(club))).toBe(false);
    expect(joined(legacyRules)?.uclGroup?.table).toHaveLength(4);
  });

  it.each([[4, 3, 'R16'], [731, 9, 'PO'], [11, 30, 'out']] as const)(
    'takes seed %i at table position %i to %s',
    (seed, rank, phase) => {
      const { value: state } = seeded(seed, () => playTo(start('Arsenal', PLAYED_UCL), career => career.uclGroup?.matchday === 8));
      expect(sortedUclGroup(state, state.uclGroup!.table).findIndex(row => row.club === state.clubName) + 1).toBe(rank);
      expect(state.uclKoRound).toBe(phase);
      const playoff = state.uclBracket?.find(tie => tie.round === 'PO' && tie.mine);
      if (phase === 'PO') {
        expect(playoff?.away).toBe(state.clubName);
        const legs = state.calendar.filter(entry => entry.uclRound === 'PO').map(entry => fixtureFor(state, entry));
        expect(legs.map(leg => leg?.home)).toEqual([false, true]);
      } else {
        expect(playoff).toBeUndefined();
      }
      if (phase === 'R16') {
        expect(state.uclDraw.R16).toBeUndefined();
        const control = certainFixturesLeft({ ...state, uclKoRound: 'out' });
        expect(certainFixturesLeft(state)).toEqual({
          home: control.home + 1, away: control.away + 1, euroAway: control.euroAway + 1,
        });
        const { value: settled } = seeded(seed, () => playTo(state, career => !!career.uclDraw.R16));
        expect(settled.uclBracket?.filter(tie => tie.round === 'PO' && tie.winner)).toHaveLength(8);
        const returnLeg = settled.calendar.find(entry => entry.uclRound === 'R16' && entry.uclLeg === 2)!;
        expect(fixtureFor(settled, returnLeg)).toMatchObject({ opponent: settled.uclDraw.R16, home: true });
      }
    },
  );

  it('keeps historic, Asian and Daily state and random draws exact', async () => {
    await ensureEraRosters('era2010');
    for (const [club, era, opts, control, sha, draws] of [
      ['Arsenal', 'era2010', PLAYED_UCL, legacyRules, 'ce98da36821317b46d59a45643a762cb535eb1bd60ab6a74fe73c93666569954', 404],
      ['Mito Hollyhock', undefined, PLAYED_UCL, legacyRules, 'e6da20625c8f7e189bd14f76dfbfb250c599052516510a7234e9ed3e1c6bc09f', 766],
      ['Wuhan Three Towns', undefined, PLAYED_UCL, legacyRules, 'b0ec3151504b07a1f3e74b00dc39e5db58062c76f18b7323791b4e5749572528', 761],
      ['FC Seoul', undefined, PLAYED_UCL, legacyRules, '3ac35a56e2047bd3c4ffe75584b2e7f02e5e957d7365a8541c65344677c3535f', 736],
      ['Arsenal', undefined, { ...DAILY_START, ...PLAYED_UCL }, { ...DAILY_START, ...legacyRules }, '55ec6b896348f6b15722e3a782e09a243d9ca489accefcc53e5511c2577f78b5', 784],
    ] as const) {
      const before = seeded(219, () => start(club, control, era));
      const after = seeded(219, () => start(club, opts, era));
      expect(digest(after.value), club).toBe(digest(before.value));
      expect(after.draws, club).toBe(before.draws);
      expect(digest(before.value), club).toBe(sha);
      expect(before.draws, club).toBe(draws);
    }
  });
});
