import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  acceptBid, acceptWildernessJob, benchFor, engineRegistrations, enterWilderness, evalWorldComp, finishSeason, generateIncomingBids,
  loadCareer, makeHalftimeSub, playNextEntry, REAL_LEAGUES, restoreEngineRegistrations,
  resumeMatch, saveCareer, setTransferStatus, startCareer, startNextSeason, uelParticipant,
  wildernessWeek, worldCompNightsDone, worldRosterFor, type CareerState,
} from './clubManager';
import { joinClubNow } from './clubManagerCalendar';
import { cupScorerRace } from './clubManagerCupScorers';
import { serializeParkedCareer } from './clubManagerParkedSave';

const quick = { skipHalftime: true, noCoach: true };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function tape<T>(seed: number, run: () => T): { value: T; draws: number[] } {
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

function playToEnd(state: CareerState, seed: number): CareerState {
  for (let step = 0; step < 400 && state.week < state.calendar.length; step++) {
    state = tape(seed + step, () => playNextEntry(state, quick)).value.state;
  }
  expect(state.week).toBe(state.calendar.length);
  return state;
}

function playFirstNight(state: CareerState): CareerState {
  for (let step = 0; step < 80; step++) {
    const played = tape(0x1593a + step, () => playNextEntry(state, quick)).value;
    state = played.state;
    if (played.report?.competition === 'uel') return state;
  }
  throw new Error('No managed Europa League match settled');
}

function expectReconciled(state: CareerState): void {
  const played = evalWorldComp(state, 'uel');
  const ledger = state.worldComps?.uel?.scorers;
  expect(ledger).toBeDefined();
  const goals = played?.nights.flatMap(night => night.fixtures)
    .reduce((sum, fixture) => sum + (fixture.hg ?? 0) + (fixture.ag ?? 0), 0);
  expect(ledger!.unresolved + ledger!.ownGoals + ledger!.players.reduce((sum, row) => sum + row[3], 0)).toBe(goals);
}

describe('Europa League scorer settlement', () => {
  let entry: CareerState;
  const registrations = engineRegistrations();

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1791633600000);
    // The browser Europa fixture earns the Cup route on the engine's normal rollover.
    const first = tape(0x1509a, () => startCareer('Everton')).value;
    const season = playToEnd(first, 0x1509b);
    const finished = tape(0x1509b, () => finishSeason(season)).value.state;
    const cupFinal = finished.cupBracket?.find(tie => tie.round === 'F');
    if (!cupFinal) throw new Error('Everton has no domestic cup final in the fixture');
    cupFinal.winner = 'Everton';
    entry = tape(0x1509c, () => startNextSeason(finished)).value;
    expect(entry.worldComps?.uel).toMatchObject({ me: 'Everton', s: 2 });
    expect(entry.calendar.filter(week => week.type === 'uel')).toHaveLength(17);
  });

  afterAll(() => {
    restoreEngineRegistrations(registrations);
    localStorage.clear();
    vi.useRealTimers();
  });

  it('records the managed match and its background fixtures without changing the sporting random tape', () => {
    const before = JSON.stringify(entry);
    const withScorers = playFirstNight(copy(entry));
    expect(worldCompNightsDone(withScorers, 'uel')).toBe(1);
    expect(withScorers.worldComps?.uel?.scorers).toMatchObject({ v: 1, nights: 1 });
    expectReconciled(withScorers);
    const credits = withScorers.worldComps?.uel?.scorers?.players ?? [];
    expect(credits.some(([, , club, goals]) => club !== 'Everton' && goals > 0)).toBe(true);
    for (const player of withScorers.squad.filter(player => (player.comp?.uel?.goals ?? 0) > 0)) {
      expect(credits.find(([, name, club]) => club === 'Everton' && name === player.name)?.[3]).toBe(player.comp?.uel?.goals);
    }
    const scoreOnly = copy(withScorers);
    if (!scoreOnly.worldComps?.uel) throw new Error('No Europa League slice in fixture');
    delete scoreOnly.worldComps.uel.scorers;
    const current = tape(0x1593b, () => playNextEntry(withScorers, quick));
    const old = tape(0x1593b, () => playNextEntry(scoreOnly, quick));
    expect(current.draws).toEqual(old.draws);
    expect(current.value.report).toEqual(old.value.report);
    expect(evalWorldComp(current.value.state, 'uel')).toEqual(evalWorldComp(old.value.state, 'uel'));
    expect(old.value.state.worldComps?.uel?.scorers).toBeUndefined();
    expect(JSON.stringify(entry)).toBe(before);
  });

  it('leaves an ambiguous settled opponent name uncredited even if one positional match exists', () => {
    let state = copy(entry);
    let playing: CareerState | undefined;
    for (let step = 0; step < 80 && !playing; step++) {
      const result = tape(0x1593a + step, () => {
        const next = playNextEntry(state);
        if (next.kind !== 'halftime' || (next.live?.oppXi?.length && next.state.calendar[next.live.week]?.type === 'uel')) return next;
        return resumeMatch(next.state);
      }).value;
      state = result.state;
      if (result.kind === 'halftime') playing = state;
    }
    const live = playing?.live;
    const scorer = live?.oppXi?.find(p => p.p !== 'GK');
    const namesake = live?.oppXi?.find(p => p.p !== 'GK' && p.p !== scorer?.p);
    if (!live?.oppXi || !scorer || !namesake) throw new Error('The fixture needs a named opponent XI');
    live.myGoals = 0;
    live.oppGoals = 1;
    live.h1My = [];
    live.h1Opp = [{ name: scorer.n, minute: 1 }];
    live.h2Drawn = true;
    live.h2My = [];
    live.h2Opp = [];
    const ambiguous = copy(playing!);
    ambiguous.live!.oppXi!.find(p => p.n === namesake.n)!.n = scorer.n;
    const identified = tape(0x6c01, () => resumeMatch(playing!)).value;
    const held = tape(0x6c01, () => resumeMatch(ambiguous)).value;
    expect(held.report?.oppScorers).toEqual(identified.report?.oppScorers);
    expect(held.state.worldComps?.uel?.scorers?.unresolved).toBe(
      (identified.state.worldComps!.uel!.scorers!.unresolved) + 1,
    );
    expectReconciled(identified.state);
    expectReconciled(held.state);
  });

  it('can start a score-only save at its first whistle but cannot recreate already-settled scorer history', () => {
    const legacy = copy(entry);
    if (!legacy.worldComps?.uel) throw new Error('No Europa League slice in fixture');
    delete legacy.worldComps.uel.scorers;
    const started = playFirstNight(legacy);
    expect(started.worldComps?.uel?.scorers?.nights).toBe(1);
    const scoreOnly = copy(started);
    delete scoreOnly.worldComps!.uel!.scorers;
    const rolled = playToEnd(loadCareer(JSON.stringify(scoreOnly))!, 0x1593b);
    expect(evalWorldComp(rolled, 'uel')?.done).toBe(true);
    expect(rolled.worldComps?.uel?.scorers).toBeUndefined();
    expect(tape(0x1593f, () => finishSeason(rolled)).value.summary.uelScorerAward).toBeUndefined();
  });

  it('settles all Europa League nights after elimination, preserving exact earlier goals', () => {
    let state = copy(entry);
    let beforeFinal: CareerState | null = null;
    for (let step = 0; step < 400 && state.week < state.calendar.length; step++) {
      state = tape(0x1593a + step, () => playNextEntry(state, quick)).value.state;
      if (!beforeFinal && worldCompNightsDone(state, 'uel') >= 13) beforeFinal = state;
    }
    expect(beforeFinal).not.toBeNull();
    const earlier = beforeFinal!.worldComps?.uel?.scorers;
    const final = state.worldComps?.uel;
    const season = evalWorldComp(state, 'uel');
    expect(season?.done).toBe(true);
    expect(season?.winner).not.toBe('Everton');
    expect(Object.keys(final?.mine ?? {}).length).toBeLessThan(13);
    expect(earlier?.nights).toBeGreaterThanOrEqual(13);
    expect(final?.scorers?.nights).toBe(17);
    expect(final?.scorers?.unresolved).toBeGreaterThan(0);
    expect(final?.scorers?.players).toBeDefined();
    expectReconciled(state);
    for (const [id, , club, goals] of earlier?.players ?? []) {
      const finalGoals = final?.scorers?.players.find(([key]) => key === id)?.[3] ?? 0;
      if (club === 'Everton') expect(finalGoals).toBe(goals);
      else expect(finalGoals).toBeGreaterThanOrEqual(goals);
    }
    expect(tape(0x1593f, () => finishSeason(state)).value.state.worldComps?.uel?.scorers).toEqual(final?.scorers);
  });

  it('keeps the same edition and existing matches when a midseason job move starts watching from outside', () => {
    const first = playFirstNight(copy(entry));
    const held = first.worldComps!.uel!;
    const heldBytes = JSON.stringify(held);
    const league = REAL_LEAGUES.find(item => !item.clubs.includes(first.clubName)
      && item.clubs.some(club => club !== first.clubName && held.clubs.includes(club)));
    const club = league?.clubs.find(team => held.clubs.includes(team));
    if (!club || !league) throw new Error('No playable entrant for job move in fixture');
    first.jobHunt = { open: { club, league: league.id, tier: 3, season: first.season, week: first.week,
      matchesLeft: 0, roll: 0, status: 'accepted' }, cooldowns: [], sentSeason: first.season, sent: 1, summerMove: null };
    const moved = tape(0x2b000, () => joinClubNow(first)).value;
    expect(moved?.clubName).toBe(club);
    expect(moved && uelParticipant(moved)).toBe(false);
    expect(moved?.worldComps?.uel?.scorers).toEqual(held.scorers);
    const movedFirstSlice = moved!.worldComps!.uel!;
    const movedBytes = JSON.stringify(movedFirstSlice);
    const complete = playToEnd(moved!, 0x2b100);
    expect(complete.worldComps?.uel?.mine).toEqual(held.mine);
    expect(complete.worldComps?.uel?.scorers?.nights).toBe(17);
    expectReconciled(complete);
    expect(JSON.stringify(held)).toBe(heldBytes);
    expect(JSON.stringify(movedFirstSlice)).toBe(movedBytes);
  });

  it('keeps his goals under the same identity when a normal January sale moves the scorer to a Europa opponent', () => {
    const seed = 212241;
    const initial = tape(seed, () => startCareer('Real Betis')).value;
    const year = playToEnd(initial, seed + 1);
    const finished = tape(seed + 160, () => finishSeason(year)).value.state;
    let state = tape(seed + 161, () => startNextSeason(finished)).value;
    expect(state.worldComps?.uel?.me).toBe('Real Betis');
    expect(saveCareer(state)).toBe(true);
    state = loadCareer()!;
    let step = 1;
    for (; step < 70; step++) {
      state = tape(seed + 162 + step, () => playNextEntry(state, quick)).value.state;
      if (state.transferWindow === 'january') break;
    }
    expect(state.week).toBe(34);
    const player = state.squad.find(p => p.name === 'Antony');
    if (!player) throw new Error('The fixture lost its managed scorer');
    expect(player.comp?.uel?.goals).toBe(4);
    expect(player.worldRosterKey).toBeUndefined();
    const before = state.worldComps?.uel?.scorers?.players.filter(([, name]) => name === player.name);
    expect(before).toHaveLength(1);
    const listed = setTransferStatus(state, player.id, 'listed');
    tape(1029, () => generateIncomingBids(listed));
    expect(listed.incomingBids?.find(bid => bid.playerId === player.id)?.club).toBe('Real Sociedad');
    const sold = acceptBid(listed, player.id);
    expect(sold?.squad.some(p => p.id === player.id)).toBe(false);
    const ownedKey = worldRosterFor(sold!, 'Real Sociedad').find(p => p.n === player.name)?.worldRosterKey;
    state = sold!;
    for (let replayStep = step + 1; state.week < 36; replayStep++) {
      state = tape(seed + 162 + replayStep, () => playNextEntry(state, quick)).value.state;
      if (replayStep >= step + 5) throw new Error('The buyer did not reach its next scoring night');
    }
    const next = state.worldComps?.uel?.scorers?.players.filter(([, name]) => name === player.name);
    expect(ownedKey).toBeDefined();
    expect(next).toEqual([[ownedKey, player.name, 'Real Sociedad', 5]]);
    expect(before?.[0][0]).toBe(ownedKey);
    expectReconciled(state);
  });

  function playTitleFinal() {
    let state = copy(entry);
    let sawExtraTimeSub = false;
    for (let step = 0; step < 400 && state.week < state.calendar.length; step++) {
      state = tape(0x10000 + step, () => {
        const opened = playNextEntry(state);
        if (opened.kind !== 'halftime') return opened.state;
        const { state: playing, live } = opened;
        if (!live) throw new Error('Match is missing its saved first half');
        const week = playing.calendar[live.week];
        if (week?.type === 'uel') {
          // Hold the title case decisive while the real match settlement credits the committed goals.
          const scorer = playing.squad.find(p => p.position === 'ST' && live.startXi.includes(p.id))
            ?? playing.squad.find(p => p.position !== 'GK' && live.startXi.includes(p.id));
          if (!scorer) throw new Error('No starting outfielder in title fixture');
          if (week.night?.n === 16) {
            live.myGoals = 1;
            live.oppGoals = 1;
            live.h1My = [{ id: scorer.id, name: scorer.name, minute: 21, og: { n: live.oppXi?.[0].n ?? 'Opponent' } }];
            live.h1Opp = [{ name: scorer.name, minute: 28, og: true }];
            const substitute = benchFor(playing, scorer.id).find(p => p.position !== 'GK');
            const changed = substitute ? makeHalftimeSub(playing, scorer.id, substitute.id) : null;
            if (!substitute || !changed?.live) throw new Error('Could not bring on the extra-time scorer');
            changed.live.h2Drawn = true;
            changed.live.h2My = [{ id: substitute.id, name: substitute.name, minute: 106 }];
            changed.live.h2Opp = [];
            changed.live.et = { from: 90, to: 120 };
            const old = changed.worldComps!.uel!.scorers!;
            const played = resumeMatch(changed);
            const now = played.state.worldComps!.uel!.scorers!;
            expect(played.report?.decidedBy).toBe('aet');
            expect(played.report?.myScorers).toEqual([
              expect.objectContaining({ og: true }), expect.objectContaining({ name: substitute.name, minute: 106 }),
            ]);
            expect(played.report?.oppScorers).toEqual([expect.objectContaining({ og: true })]);
            expect(now.ownGoals).toBe(old.ownGoals + 2);
            expect(now.unresolved).toBe(old.unresolved);
            const scorerGoals = (ledger: typeof old) => ledger.players.find(([, name, club]) => name === substitute.name && club === 'Everton')?.[3] ?? 0;
            expect(scorerGoals(now)).toBe(scorerGoals(old) + 1);
            sawExtraTimeSub = true;
            return played.state;
          }
          live.myGoals = 9;
          live.oppGoals = 0;
          live.h1My = Array.from({ length: 9 }, (_, i) => ({ id: scorer.id, name: scorer.name, minute: i + 1 }));
          live.h1Opp = [];
          live.h2Drawn = true;
          live.h2My = [];
          live.h2Opp = [];
        }
        return resumeMatch(playing).state;
      }).value;
    }
    expect(sawExtraTimeSub).toBe(true);
    const result = evalWorldComp(state, 'uel');
    expect(result).toMatchObject({ winner: 'Everton', done: true });
    expectReconciled(state);
    const race = cupScorerRace(state.worldComps?.uel?.scorers, 17, true);
    expect(race.status).toBe('winner');
    const leader = race.leaders[0];
    expect(leader.club).toBe('Everton');
    return { state, leader };
  }

  it('keeps a confirmed title-run scoring award through save, reload and summer when the next edition replaces its ledger', () => {
    const { state, leader } = playTitleFinal();
    const finished = tape(0x20000, () => finishSeason(state)).value;
    expect(finished.summary.uelScorerAward).toEqual([expect.objectContaining({
      name: leader.name, club: leader.club, goals: leader.goals,
    })]);
    expect(saveCareer(finished.state)).toBe(true);
    const reloaded = loadCareer();
    expect(reloaded?.worldComps?.uel?.scorers).toEqual(state.worldComps?.uel?.scorers);
    expect(reloaded?.pendingSummary?.uelScorerAward).toEqual(finished.summary.uelScorerAward);
    expect(loadCareer(serializeParkedCareer(finished.state))?.history.find(row => row.season === state.season)?.uelScorerAward)
      .toEqual(finished.summary.uelScorerAward);
    const next = tape(0x20001, () => startNextSeason(reloaded!)).value;
    expect(next.season).toBe(state.season + 1);
    expect(next.worldComps?.uel?.scorers?.nights ?? 0).toBe(0);
    expect(next.history.find(row => row.season === state.season)?.uelScorerAward).toEqual(finished.summary.uelScorerAward);
    expect(next.unreviewedUelScorerAwards).toBeUndefined();
  });

  it('keeps the confirmed Europa award once after a wilderness job skips the season review', () => {
    const { state, leader } = playTitleFinal();
    let out = enterWilderness({ ...state, sacked: true });
    for (let n = 0; n < 24 && !out.wilderness?.offers.length; n++) out = tape(4100 + n, () => wildernessWeek(out)).value;
    const club = out.wilderness!.offers[0]?.club;
    expect(club).toBeTruthy();
    const take = (s: CareerState) => tape(4200, () => acceptWildernessJob(s, club!)).value!;
    const next = take(out);
    expect(next).toMatchObject({ season: state.season + 1, clubName: club, pendingSummary: null });
    expect(next.history.some(row => row.season === state.season)).toBe(false);
    const receipt = { season: state.season, club: 'Everton', winners: [{ name: leader.name, club: leader.club, goals: leader.goals }] };
    expect(next.unreviewedUelScorerAwards).toEqual([receipt]);
    expect(saveCareer(next)).toBe(true);
    expect(loadCareer()?.unreviewedUelScorerAwards).toEqual([receipt]);
    expect(loadCareer(serializeParkedCareer(next))?.unreviewedUelScorerAwards).toEqual([receipt]);
    expect(take({ ...out, unreviewedUelScorerAwards: [receipt] }).unreviewedUelScorerAwards).toEqual([receipt]);
    const missing = copy(out);
    delete missing.worldComps!.uel!.scorers;
    expect(take(missing).unreviewedUelScorerAwards).toBeUndefined();
  }, 30_000);

  it('keeps the Europa scorer with his original club when a direct appointment changes the edition before review', () => {
    const { state, leader } = playTitleFinal();
    state.jobHunt = { open: { club: 'Chelsea', league: 'premier', tier: 1, season: state.season, week: state.week,
      matchesLeft: 0, roll: 0, status: 'accepted' }, cooldowns: [], sentSeason: state.season, sent: 1, summerMove: null };
    const joined = tape(4120, () => joinClubNow(state)).value!;
    expect(joined.clubName).toBe('Chelsea');
    const receipt = { club: 'Everton', winners: [{ name: leader.name, club: leader.club, goals: leader.goals }] };
    expect(joined.pendingUelScorerAward).toEqual(receipt);
    const reloaded = loadCareer(JSON.stringify(joined))!;
    // A conflicting new European field can replace the previous edition at a job change.
    delete reloaded.worldComps?.uel;
    const { state: reviewed, summary } = tape(4200, () => finishSeason(reloaded)).value;
    expect(summary).toMatchObject({ club: 'Chelsea', uelScorerClub: receipt.club, uelScorerAward: receipt.winners });
    expect(reviewed.history.find(h => h.season === state.season)).toMatchObject({ club: 'Chelsea', uelScorerClub: receipt.club, uelScorerAward: receipt.winners });
    const next = tape(4300, () => startNextSeason(reviewed)).value;
    expect(next.pendingUelScorerAward).toBeUndefined();
    expect(next.unreviewedUelScorerAwards).toBeUndefined();
    const skipped = tape(4300, () => startNextSeason(reloaded)).value;
    expect(skipped.unreviewedUelScorerAwards).toEqual([{ season: state.season, ...receipt }]);
  }, 30_000);
});
