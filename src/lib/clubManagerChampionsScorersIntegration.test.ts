import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  championsLeagueScorerRace, engineRegistrations, finishSeason, loadCareer, playNextEntry, REAL_LEAGUES,
  restoreEngineRegistrations, resumeMatch, saveCareer, startCareer, startNextSeason, uclHolderOf, worldRosterFor,
  type CareerState, type MatchWeekReport,
} from './clubManager';
import { joinClubNow } from './clubManagerCalendar';
import { ensureEraRosters } from './clubManagerEras';
import { UCL_GROUP_LEDGER } from './clubManagerUclGroups';
import { serializeParkedCareer } from './clubManagerParkedSave';
import { recordWorldRosterTransfer, worldRosterOwner } from './clubManagerWorldRoster';
import { HISTORIC_2005_CUP_ROSTERS } from '@/data/clubManagerHistoricCupRosters';

const BRUGGE = 115366;
const MADRID = 116137;

function tape<T>(seed: number, run: () => T) {
  const original = Math.random;
  const draws: number[] = [];
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(seed ^ seed >>> 15, seed | 1);
    mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, mixed | 61);
    const roll = ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
    draws.push(roll);
    return roll;
  };
  try { return { value: run(), draws }; } finally { Math.random = original; }
}

function next(state: CareerState, seed: number) {
  const through = state.week + 1;
  const play = (from: CareerState) => playNextEntry(from, { skipHalftime: true, untilWeek: through });
  const first = tape(seed + through, () => play(state));
  if (first.value.kind !== 'window' || first.value.state.week > state.week) return first;
  const second = tape(seed + through + 0x1000000, () => play(first.value.state));
  return { value: second.value, draws: [...first.draws, ...second.draws] };
}

function playTo(state: CareerState, seed: number, week: number) {
  const draws: number[] = [];
  const reports: MatchWeekReport[] = [];
  while (state.week < week) {
    const step = next(state, seed);
    if (step.value.state.week <= state.week) throw new Error(`Champions League fixture stalled at week ${state.week}`);
    state = step.value.state;
    draws.push(...step.draws);
    if (step.value.report) reports.push(step.value.report);
  }
  return { state, reports, draws };
}

function expectReconciled(state: CareerState, count: number, goals: number) {
  const group = Object.values(state.pairResults?.[UCL_GROUP_LEDGER] ?? {});
  const knockouts = (state.uclBracket ?? []).flatMap(tie => tie.leg1 || tie.leg2
    ? [tie.leg1, tie.leg2].flatMap(leg => leg ? [[leg.homeGoals, leg.awayGoals]] : [])
    : tie.homeGoals !== null && tie.awayGoals !== null ? [[tie.homeGoals, tie.awayGoals]] : []);
  const scores = [...group, ...knockouts];
  expect(scores).toHaveLength(count);
  expect(scores.reduce((total, [home, away]) => total + home + away, 0)).toBe(goals);
  const ledger = state.uclScorers;
  expect(ledger).toBeDefined();
  expect(ledger!.players.reduce((total, row) => total + row[3],
    ledger!.ownGoals + ledger!.unresolved + (ledger!.firstLeg?.credits.length ?? 0))).toBe(goals);
}

function madridBeforeFinal() {
  const madrid = tape(MADRID, () => startCareer('Real Madrid')).value;
  return playTo(madrid, MADRID, 53).state;
}

function goalsFor(state: CareerState, club: string, name: string) {
  return state.uclScorers?.players.filter(([, player, team]) => player === name && team === club)
    .reduce((goals, row) => goals + row[3], 0) ?? 0;
}

function scoreOnly(state: CareerState): CareerState {
  const older = JSON.parse(JSON.stringify(state)) as CareerState;
  delete older.uclScorers;
  return older;
}

function decisiveMadridFinal() {
  const before = madridBeforeFinal();
  const kickoff = tape(MADRID + before.week + 1, () => playNextEntry(before)).value;
  const paused = kickoff.state;
  const live = paused.live;
  expect(kickoff.kind).toBe('halftime');
  if (!live || !before.uclScorers) throw new Error('The final must have a settled tournament prefix and a live first half');
  const scorer = paused.squad.find(player => player.name === 'Jude Bellingham' && live.startXi.includes(player.id));
  if (!scorer) throw new Error('Jude Bellingham must start the final');
  // Hold the result decisive even when earlier AI goals lacked named scorers.
  const goals = 1 + before.uclScorers.players.reduce((highest, player) => Math.max(highest, player[3]), 0)
    + before.uclScorers.unresolved;
  live.myGoals = goals;
  live.oppGoals = 0;
  live.h1My = Array.from({ length: goals }, (_, i) => ({ id: scorer.id, name: scorer.name, minute: i % 45 + 1 }));
  live.h1Opp = [];
  live.h2Drawn = true;
  live.h2My = [];
  live.h2Opp = [];

  const final = tape(MADRID + 0xa00, () => resumeMatch(paused)).value.state;
  expect(uclHolderOf(final)).toBe('Real Madrid');
  const awardedGoals = goalsFor(before, 'Real Madrid', scorer.name) + goals;
  const award = [{ name: scorer.name, club: 'Real Madrid', goals: awardedGoals }];
  expect(championsLeagueScorerRace(final)).toMatchObject({ status: 'winner', leaders: award });
  return { final, award };
}

describe('Owned Champions League scorer settlement', () => {
  const registrations = engineRegistrations();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1791633600000);
  });

  afterEach(() => {
    restoreEngineRegistrations(registrations);
    localStorage.clear();
    vi.useRealTimers();
  });

  it('records the managed opener and other groups on the same Champions League matchday', () => {
    const fresh = tape(BRUGGE, () => startCareer('Club Brugge')).value;
    const before = playTo(fresh, BRUGGE, 3).state;
    const opener = next(before, BRUGGE).value;
    expect(opener.report).toMatchObject({
      competition: 'uclGroup', home: 'Club Brugge', away: 'Real Madrid', homeGoals: 1, awayGoals: 3,
      myScorers: [expect.objectContaining({ name: 'Hans Vanaken', minute: 87 })],
    });
    expect(opener.state.uclScorers?.nights).toBe(1);
    expect(goalsFor(opener.state, 'Club Brugge', 'Hans Vanaken')).toBe(1);
    expect(opener.state.uclScorers?.players.some(([, , club]) => !['Club Brugge', 'Real Madrid'].includes(club))).toBe(true);
    expectReconciled(opener.state, 16, 44);
  });

  it('starts a pristine older draw whose other groups are created at the opening whistle', () => {
    const fresh = tape(BRUGGE, () => startCareer('Club Brugge')).value;
    const legacy = playTo(fresh, BRUGGE, 3).state;
    delete legacy.uclWorld;
    const loaded = loadCareer(JSON.stringify(legacy))!;
    expect(loaded.uclGroup?.matchday).toBe(0);
    expect(loaded.uclWorld).toBeUndefined();

    const tracked = next(loaded, BRUGGE);
    // Keep normal career kickoff rules active while holding scorer recording off.
    const disabled = { ...loaded, uclScorers: null as unknown as CareerState['uclScorers'] };
    const control = next(disabled, BRUGGE);
    expect(tracked.draws).toEqual(control.draws);
    expect(tracked.value.report).toEqual(control.value.report);
    expect(scoreOnly(tracked.value.state)).toEqual(scoreOnly(control.value.state));
    expect(tracked.value.state.uclWorld).toHaveLength(7);
    expect(control.value.state.uclScorers).toBeNull();

    const actualGoals = Object.values(tracked.value.state.pairResults?.[UCL_GROUP_LEDGER] ?? {})
      .reduce((total, [home, away]) => total + home + away, 0);
    expect(actualGoals).toBeGreaterThan(tracked.value.report!.homeGoals + tracked.value.report!.awayGoals);
    expect(tracked.value.state.uclScorers?.nights).toBe(1);
    const { home, away } = tracked.value.report!;
    expect(tracked.value.state.uclScorers?.players.some(([, , club]) => club !== home && club !== away)).toBe(true);
    expectReconciled(tracked.value.state, 16, actualGoals);
    expect(championsLeagueScorerRace(tracked.value.state).status).toBe('racing');
  });

  it('keeps an older campaign score-only when its background groups need a midseason rebuild', () => {
    const brugge = tape(BRUGGE, () => startCareer('Club Brugge')).value;
    const legacy = scoreOnly(playTo(brugge, BRUGGE, 6).state);
    delete legacy.uclWorld;
    const loaded = loadCareer(JSON.stringify(legacy))!;
    expect(loaded.uclGroup?.matchday).toBe(1);

    const resumed = next(loaded, BRUGGE).value;
    expect(resumed.report?.competition).toBe('uclGroup');
    expect(resumed.state.uclGroup?.matchday).toBe(2);
    expect(resumed.state.uclWorld).toHaveLength(7);
    expect(resumed.state.uclScorers).toBeUndefined();
    expect(championsLeagueScorerRace(resumed.state)).toMatchObject({ status: 'unavailable', leaders: [] });
  });

  it('reopens an old watched draw without opening an owned scorer ledger', () => {
    const observer = tape(BRUGGE, () => startCareer('Everton')).value;
    expect(observer.uclGroup).toBeNull();
    expect(observer.worldComps?.ucl?.clubs).toHaveLength(36);
    const legacy = playTo(observer, BRUGGE, 3).state;
    delete legacy.worldComps!.ucl;
    const reopened = loadCareer(JSON.stringify(legacy))!;
    expect(reopened.worldComps?.ucl).toEqual(observer.worldComps?.ucl);

    const skipped = next(reopened, BRUGGE).value.state;
    expect(skipped.uclGroup).toBeNull();
    expect(skipped.worldComps?.ucl).toEqual(reopened.worldComps?.ucl);
    expect(skipped.uclScorers).toBeUndefined();
    expect(championsLeagueScorerRace(skipped)).toMatchObject({ status: 'unavailable', leaders: [] });
  });

  it('settles all 109 matches after Club Brugge leaves at the group stage', () => {
    const brugge = tape(BRUGGE, () => startCareer('Club Brugge')).value;
    const exit = playTo(brugge, BRUGGE, 21).state;
    expect(exit).toMatchObject({ uclKoRound: 'out', uclExit: 'group' });
    expect(exit.uclScorers?.nights).toBe(6);
    expectReconciled(exit, 96, 255);
    const own = exit.uclScorers?.players.filter(([, , club]) => club === 'Club Brugge');

    const beforeAI = playTo(exit, BRUGGE, 32).state;
    expect(beforeAI.uclScorers).toEqual(exit.uclScorers);
    const quarterFinals = next(beforeAI, BRUGGE).value;
    expect(quarterFinals.report).toBeUndefined();
    expect(quarterFinals.state.uclScorers?.nights).toBe(7);
    expectReconciled(quarterFinals.state, 104, 270);

    const finished = playTo(quarterFinals.state, BRUGGE, 50).state;
    expect(finished.uclBracket?.find(tie => tie.round === 'F')).toMatchObject({
      home: 'Real Madrid', away: 'Arsenal', homeGoals: 1, awayGoals: 2, winner: 'Arsenal', aet: true, mine: false,
    });
    expect(finished.uclScorers?.nights).toBe(9);
    expect(finished.uclScorers?.players.filter(([, , club]) => club === 'Club Brugge')).toEqual(own);
    expectReconciled(finished, 109, 281);
  });

  it('keeps the Roma first-leg credits through active and parked reloads without changing either leg', () => {
    const madrid = tape(MADRID, () => startCareer('Real Madrid')).value;
    const before = playTo(madrid, MADRID, 32).state;
    const tracked = next(before, MADRID);
    const control = next(scoreOnly(before), MADRID);
    expect(tracked.draws).toEqual(control.draws);
    expect(tracked.value.report).toEqual(control.value.report);
    expect(tracked.value.report).toMatchObject({
      home: 'Real Madrid', away: 'Roma', homeGoals: 1, awayGoals: 1, tie: { leg: 1 },
      myScorers: [expect.objectContaining({ name: 'Vinicius Junior', minute: 90, plus: 3 })],
      oppScorers: [expect.objectContaining({ name: 'Donyell Malen', minute: 34 })],
    });
    const first = tracked.value.state;
    expect(first.uclScorers?.nights).toBe(6);
    expect(first.uclScorers?.players).toEqual(before.uclScorers?.players);
    expect(first.uclScorers?.firstLeg).toMatchObject({
      round: 'QF', home: 'Real Madrid', away: 'Roma', homeGoals: 1, awayGoals: 1,
      credits: [
        expect.objectContaining({ name: 'Vinicius Junior', club: 'Real Madrid' }),
        expect.objectContaining({ name: 'Donyell Malen', club: 'Roma' }),
      ],
    });
    expect(first.uclBracket?.find(tie => tie.mine)).toMatchObject({
      leg1: { homeGoals: 1, awayGoals: 1 }, winner: null, homeGoals: null, awayGoals: null,
    });
    expectReconciled(first, 97, 251);
    expect(saveCareer(first)).toBe(true);
    const active = loadCareer();
    const parkedRaw = serializeParkedCareer(first);
    expect(JSON.parse(parkedRaw).saveVersion).toBe('parked-pairs-1');
    const parked = loadCareer(parkedRaw);
    expect(active?.uclScorers).toEqual(first.uclScorers);
    expect(parked?.uclScorers).toEqual(first.uclScorers);
    const snapshot = JSON.stringify(first.uclScorers);
    const preview = championsLeagueScorerRace(first);
    expect(preview.status).toBe('racing');
    for (const [club, name] of [['Real Madrid', 'Vinicius Junior'], ['Roma', 'Donyell Malen']]) {
      expect(preview.rows.find(row => row.club === club && row.name === name)?.goals).toBe(goalsFor(before, club, name) + 1);
    }
    expect(championsLeagueScorerRace(active!)).toEqual(preview);
    expect(championsLeagueScorerRace(parked!)).toEqual(preview);
    expect(JSON.stringify(first.uclScorers)).toBe(snapshot);
    expect(first.uclScorers?.nights).toBe(6);

    const resumed = playTo(active!, MADRID, 35);
    const alternate = playTo(parked!, MADRID, 35);
    const older = loadCareer(JSON.stringify(control.value.state));
    const scoreOnlyResumed = playTo(older!, MADRID, 35);
    expect(resumed.draws).toEqual(alternate.draws);
    expect(resumed.draws).toEqual(scoreOnlyResumed.draws);
    expect(resumed.reports).toEqual(alternate.reports);
    expect(resumed.reports).toEqual(scoreOnlyResumed.reports);
    expect(resumed.reports.at(-1)).toMatchObject({
      home: 'Roma', away: 'Real Madrid', homeGoals: 0, awayGoals: 1,
      tie: { leg: 2, aggMine: 2, aggTheirs: 1, through: true },
    });
    expect(resumed.state.uclBracket).toEqual(scoreOnlyResumed.state.uclBracket);
    expect(resumed.state.uclScorers).toEqual(alternate.state.uclScorers);
    expect(resumed.state.uclScorers?.nights).toBe(7);
    expect(resumed.state.uclScorers?.firstLeg).toBeUndefined();
    expectReconciled(resumed.state, 104, 264);
    expect(goalsFor(resumed.state, 'Real Madrid', 'Vinicius Junior')).toBe(goalsFor(before, 'Real Madrid', 'Vinicius Junior') + 1);
    expect(goalsFor(resumed.state, 'Roma', 'Donyell Malen')).toBe(goalsFor(before, 'Roma', 'Donyell Malen') + 1);
    expect(scoreOnlyResumed.state.uclScorers).toBeUndefined();
    expect(championsLeagueScorerRace(scoreOnlyResumed.state)).toMatchObject({ status: 'unavailable', leaders: [] });
  });

  it('credits the natural Madrid final without giving Porto a player goal for the own goal', () => {
    const before = madridBeforeFinal();
    const final = next(before, MADRID).value;
    expect(final.report).toMatchObject({
      home: 'Real Madrid', away: 'Porto', homeGoals: 2, awayGoals: 1, detail: { venue: 'neutral' },
      myScorers: [
        expect.objectContaining({ name: 'Jude Bellingham', minute: 40 }),
        expect.objectContaining({ name: 'Rodrygo', minute: 72 }),
      ],
      oppScorers: [expect.objectContaining({ name: 'Dean Huijsen', minute: 31, og: true })],
    });
    expect(uclHolderOf(final.state)).toBe('Real Madrid');
    expect(final.state.uclScorers?.nights).toBe(9);
    expect(final.state.uclScorers?.ownGoals).toBe((before.uclScorers?.ownGoals ?? 0) + 1);
    for (const name of ['Jude Bellingham', 'Rodrygo']) {
      expect(goalsFor(final.state, 'Real Madrid', name)).toBe(goalsFor(before, 'Real Madrid', name) + 1);
    }
    expect(final.state.uclScorers?.players.filter(([, , club]) => club === 'Porto'))
      .toEqual(before.uclScorers?.players.filter(([, , club]) => club === 'Porto'));
    expectReconciled(final.state, 109, 273);
    expect(championsLeagueScorerRace(final.state)).toMatchObject({
      status: 'undecided', leaders: [], unresolved: 6,
      rows: expect.arrayContaining([expect.objectContaining({ name: 'Samu Aghehowa', club: 'Porto', goals: 8 })]),
    });
    expect(tape(MADRID + 0xa01, () => finishSeason(final.state)).value.summary.uclScorerAward).toBeUndefined();

    const old = loadCareer(JSON.stringify(scoreOnly(final.state)));
    expect(uclHolderOf(old!)).toBe('Real Madrid');
    expect(championsLeagueScorerRace(old!)).toMatchObject({ status: 'unavailable', leaders: [] });
    expect(tape(MADRID + 0xa01, () => finishSeason(old!)).value.summary.uclScorerAward).toBeUndefined();
  });

  it('opens 2005-06 with Dani García outside the Espanyol squad and transfer supply', async () => {
    await ensureEraRosters('era2005');
    const espanyol = tape(MADRID, () => startCareer('Espanyol', 'era2005')).value;
    const madrid = tape(MADRID, () => startCareer('Real Madrid', 'era2005')).value;
    expect(espanyol.squad.some(player => player.name === 'Dani García')).toBe(false);
    expect(worldRosterFor(madrid, 'Espanyol').some(player => player.n === 'Dani García')).toBe(false);
  });

  it('credits verified background squads in the 2005 opening campaign', async () => {
    await ensureEraRosters('era2005');
    const madrid = tape(MADRID, () => startCareer('Real Madrid', 'era2005')).value;
    const before = playTo(madrid, MADRID, 55).state;
    expect(before.uclExit).toBe('R16');
    const reopened = loadCareer(serializeParkedCareer(before));
    expect(reopened?.uclScorers).toEqual(before.uclScorers);
    const snapshot = JSON.stringify(reopened!.uclScorers);
    const { value: final } = next(reopened!, MADRID);
    expect(final.report).toBeUndefined();
    expect(final.state.uclBracket?.find(tie => tie.round === 'F')).toMatchObject({
      home: 'Arsenal', away: 'Ajax', homeGoals: 4, awayGoals: 2, winner: 'Arsenal', mine: false,
    });
    expectReconciled(final.state, 125, 335);
    const goalsForClub = (state: CareerState, club: string) => state.uclScorers!.players
      .filter(row => row[2] === club).reduce((sum, row) => sum + row[3], 0);
    expect(goalsForClub(final.state, 'Ajax') - goalsForClub(before, 'Ajax')).toBe(2);
    for (const [club, count, laterArrival] of [
      ['Ajax', 19, 'Klaas-Jan Huntelaar'],
      ['Rosenborg', 17, 'Steffen Iversen'],
      ['Olympiacos', 14, 'Michał Żewłakow'],
      ['Fenerbahçe', 13, 'Zafer Biryol'],
    ] as const) {
      expect(goalsForClub(final.state, club)).toBe(count);
      const roster = HISTORIC_2005_CUP_ROSTERS.get(club)!;
      expect(roster.some(player => player.name === laterArrival)).toBe(false);
      const eligible = new Set(roster.filter(player => player.line !== 'GK').map(player => player.name));
      for (const [, name, recordedClub, , generated] of final.state.uclScorers!.players) {
        if (recordedClub !== club) continue;
        expect(eligible.has(name)).toBe(true);
        expect(generated).toBeUndefined();
      }
    }
    const olympiacos = final.state.uclScorers!.players.filter(row => row[2] === 'Olympiacos');
    const scorerNames = olympiacos.map(row => row[1]);
    expect(scorerNames).toEqual(expect.arrayContaining(['Dani García', 'Haruna Babangida']));
    expect(final.state.uclScorers?.unresolved).toBe(before.uclScorers?.unresolved);
    expect(JSON.stringify(reopened!.uclScorers)).toBe(snapshot);
  });

  it('respects a 2005 save that already moved Dani García to another club', async () => {
    await ensureEraRosters('era2005');
    const madrid = tape(MADRID, () => startCareer('Real Madrid', 'era2005')).value;
    const striker = madrid.squad.find(player => player.position === 'ST')!;
    const dani = { ...striker, id: 'p-dani-garcia', name: 'Dani García', age: 30, rating: 68, value: 1.5 };
    const legacy = recordWorldRosterTransfer(madrid, {
      player: dani, from: 'Espanyol', to: 'Sevilla', kind: 'permanent', since: 0,
    });
    const key = JSON.stringify(['era2005', 'Espanyol', 'Dani García', 'ST', 1975, 0]);
    const reopened = loadCareer(serializeParkedCareer(legacy))!;
    expect(worldRosterOwner(reopened, key)).toBe('Sevilla');

    const beforeFinal = playTo(reopened, MADRID, 55).state;
    const { value: final } = next(beforeFinal, MADRID);
    const olympiacos = final.state.uclScorers!.players.filter(row => row[2] === 'Olympiacos');
    expect(olympiacos.some(row => row[1] === 'Haruna Babangida')).toBe(true);
    expect(olympiacos.some(row => row[1] === 'Dani García')).toBe(false);
    expect(olympiacos.reduce((goals, row) => goals + row[3], 0)).toBe(14);
  });

  it('keeps a decisive award in the review and past season after normal rollover', () => {
    const { final, award } = decisiveMadridFinal();
    const finished = tape(MADRID + 0xa01, () => finishSeason(final)).value;
    expect(finished.summary.uclScorerAward).toEqual(award);
    expect(saveCareer(finished.state)).toBe(true);
    const active = loadCareer();
    const parked = loadCareer(serializeParkedCareer(finished.state));
    expect(active?.pendingSummary?.uclScorerAward).toEqual(award);
    expect(parked?.history.at(-1)?.uclScorerAward).toEqual(award);
    const nextSeason = tape(MADRID + 0xa02, () => startNextSeason(active!)).value;
    expect(nextSeason.season).toBe(2);
    expect(nextSeason.uclScorers?.nights ?? 0).toBe(0);
    expect(nextSeason.history.find(row => row.season === 1)?.uclScorerAward).toEqual(award);
  });

  it('keeps a confirmed award when a new season starts before the review', () => {
    const { final, award } = decisiveMadridFinal();
    expect(final.pendingSummary).toBeNull();
    expect(final.history.some(row => row.season === final.season)).toBe(false);
    const nextSeason = tape(MADRID + 0xa03, () => startNextSeason(final, 'Bayern Munich')).value;
    expect(nextSeason).toMatchObject({ season: 2, clubName: 'Bayern Munich' });
    expect(nextSeason.history.some(row => row.season === final.season)).toBe(false);
    expect(nextSeason.unreviewedUclScorerAwards).toEqual([{ season: 1, club: 'Real Madrid', winners: award }]);
    expect(nextSeason.uclScorers?.nights ?? 0).toBe(0);
    expect(saveCareer(nextSeason)).toBe(true);
    expect(loadCareer()?.unreviewedUclScorerAwards).toEqual(nextSeason.unreviewedUclScorerAwards);
  });

  it('keeps the old award when an accepted appointment replaces the tournament', () => {
    const { final, award } = decisiveMadridFinal();
    const club = 'Bayern Munich';
    const league = REAL_LEAGUES.find(item => item.clubs.includes(club));
    if (!league) throw new Error('The fixture needs a Champions League club in a different league');
    // Place the accepted offer at the final so the ordinary handover consumes it.
    const offered: CareerState = { ...final, jobHunt: {
      open: { club, league: league.id, tier: 1, season: final.season, week: final.week,
        matchesLeft: 0, roll: 0, status: 'accepted' },
      cooldowns: [], sentSeason: final.season, sent: 1, summerMove: null,
    } };
    const joined = tape(MADRID + 0xa04, () => joinClubNow(offered)).value;
    expect(joined?.clubName).toBe(club);
    expect(joined?.uclGroup).toBeTruthy();
    expect(joined?.uclScorers).toBeUndefined();
    expect(championsLeagueScorerRace(joined!)).toMatchObject({ status: 'unavailable', leaders: [] });
    expect(joined?.pendingUclScorerAward).toEqual({ club: 'Real Madrid', winners: award });

    expect(saveCareer(joined!)).toBe(true);
    const stored = loadCareer();
    expect(stored?.pendingUclScorerAward).toEqual(joined?.pendingUclScorerAward);
    const end = playTo(stored!, MADRID + 0xa05, stored!.calendar.length).state;
    expect(end.uclScorers).toBeUndefined();
    expect(championsLeagueScorerRace(end)).toMatchObject({ status: 'unavailable', leaders: [] });
    const review = tape(MADRID + 0xa06, () => finishSeason(end)).value;
    expect(review.summary.uclScorerAward).toEqual(award);
    expect(review.state.history.find(row => row.season === final.season)?.uclScorerAward).toEqual(award);
  });
});
