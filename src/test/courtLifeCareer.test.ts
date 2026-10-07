import { describe, expect, it } from 'vitest';
import { createCourtLifeWorld, COURT_ATTRIBUTE_KEYS } from '@/data/courtLifeWorld';
import { continueCourtPeriod, courtShotMeter, createCourtMatch, neutralCourtInput, neutralizeCourtMatch, simulateCourtMatch, stepCourtMatch, type CourtMatch } from '@/lib/courtLife';
import {
  applyCareerAction, careerMatchConfig, chooseLifeDecision, claimCourtSeasonScore, completeCareerMatch, courtCareerHistory, courtCareerPlayer, courtCareerRole,
  courtSeasonScore, courtSeasonScoreBreakdown, courtSeasonStats, courtStandings, createCourtLifeCareer, currentCareerFixture, currentLifeDecision,
  decodeCourtLifeSave, encodeCourtLifeSave, nextCareerSeason, previewCareerAction, startCareerMatch, updateCareerMatch, type CourtCareer,
} from '@/lib/courtLifeCareer';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function career(id = 'career-test', seed = 1075) {
  return createCourtLifeCareer({ id, seed, name: 'Remy', crewId: 'copper-owls', archetypeId: 'shooter' });
}
function prepared(value: CourtCareer) {
  value = applyCareerAction(value, { kind: 'recovery' });
  value = applyCareerAction(value, { kind: 'team' });
  const option = currentLifeDecision(value).options.find(row => !row.reason)!;
  return chooseLifeDecision(value, option.id);
}
function advance(match: CourtMatch, ticks: number) {
  for (let index = 0; index < ticks; index++) match = match.phase === 'halftime' ? continueCourtPeriod(match) : stepCourtMatch(match, neutralCourtInput());
  return match;
}
let cachedSeason: CourtCareer | undefined;
function finishedSeason() {
  if (cachedSeason) return clone(cachedSeason);
  let value = career();
  for (let round = 0; round < 6; round++) {
    value = startCareerMatch(prepared(value));
    const finished = simulateCourtMatch(careerMatchConfig(value));
    value = completeCareerMatch(value, finished);
    expect(value.round, 'real finished match advances one round').toBe(round + 1);
  }
  cachedSeason = value;
  return clone(value);
}
const independent = 'keeps separately created careers isolated with their own sealed world';

describe('Court Life career', () => {
  it('creates balanced archetypes and six true home away rounds for every crew', () => {
    const world = createCourtLifeWorld();
    expect(world.crews).toHaveLength(4); expect(world.archetypes).toHaveLength(5);
    expect(new Set(world.crews.flatMap(crew => crew.players.map(player => player.id))).size).toBe(12);
    expect(world.archetypes.map(row => COURT_ATTRIBUTE_KEYS.reduce((sum, key) => sum + row.attrs[key], 0))).toEqual([300, 300, 300, 300, 300]);
    for (const crew of world.crews) {
      const value = createCourtLifeCareer({ id: 'schedule', seed: 8, name: 'Avery', crewId: crew.id, archetypeId: 'connector' });
      expect(value.fixtures).toHaveLength(12);
      for (let round = 0; round < 6; round++) {
        const fixtures = value.fixtures.filter(row => row.round === round);
        expect(fixtures).toHaveLength(2);
        expect(new Set(fixtures.flatMap(row => [row.homeId, row.awayId])).size).toBe(4);
      }
      const own = value.fixtures.filter(row => row.homeId === crew.id || row.awayId === crew.id);
      expect(own).toHaveLength(6);
      for (const opponent of world.crews.filter(row => row.id !== crew.id)) {
        expect(own.filter(row => row.homeId === crew.id && row.awayId === opponent.id)).toHaveLength(1);
        expect(own.filter(row => row.awayId === crew.id && row.homeId === opponent.id)).toHaveLength(1);
      }
    }
  });

  it('applies the exact visible action deltas and spends only two affordable time blocks', () => {
    let value = career();
    const recovery = previewCareerAction(value, { kind: 'recovery' });
    expect(recovery.effect.condition).toBe(15);
    value = applyCareerAction(value, { kind: 'recovery' });
    expect(value.resources.condition).toBe(100); expect(value.blocksLeft).toBe(1);
    const training = previewCareerAction(value, { kind: 'training', attribute: 'shooting' });
    expect(training.effect).toEqual({ condition: -12, credits: -6, trust: 0, attrs: { finishing: 0, shooting: 2, passing: 0, defense: 0, conditioning: 0 } });
    value = applyCareerAction(value, { kind: 'training', attribute: 'shooting' });
    expect(courtCareerPlayer(value).attrs.shooting).toBe(80);
    expect(value.resources).toEqual({ condition: 88, credits: 12, trust: 25 });
    expect(value.blocksLeft).toBe(0); expect(value.preparation).toHaveLength(2);
    expect(applyCareerAction(value, { kind: 'work' })).toBe(value);
    expect(startCareerMatch(value)).toBe(value);
    const poor = career('poor'); poor.resources.credits = 0;
    expect(previewCareerAction(poor, { kind: 'training', attribute: 'defense' }).reason).toBe('Not enough credits.');
    expect(applyCareerAction(poor, { kind: 'training', attribute: 'defense' })).toBe(poor);
    const worked = applyCareerAction(poor, { kind: 'work' });
    expect(worked.resources).toEqual({ condition: 75, credits: 12, trust: 23 });
    const capped = career('capped'); courtCareerPlayer(capped).attrs.shooting = 94;
    expect(previewCareerAction(capped, { kind: 'training', attribute: 'shooting' }).effect.attrs.shooting).toBe(1);
    courtCareerPlayer(capped).attrs.shooting = 85;
    expect(previewCareerAction(capped, { kind: 'training', attribute: 'shooting' }).effect.attrs.shooting).toBe(1);
  });

  it('makes contextual life decisions once with honest costs and persistent consequences', () => {
    const value = career(), decision = currentLifeDecision(value);
    expect(decision.id).toBe('crew-session'); expect(decision.options).toHaveLength(2);
    const stay = decision.options.find(row => row.id === 'stay')!;
    expect(stay.effect.condition).toBe(-10); expect(stay.effect.trust).toBe(8); expect(stay.effect.attrs.passing).toBe(1);
    const chosen = chooseLifeDecision(value, 'stay');
    expect(chosen.resources).toEqual({ condition: 75, credits: 18, trust: 33 });
    expect(courtCareerPlayer(chosen).attrs.passing).toBe(courtCareerPlayer(value).attrs.passing + 1);
    expect(chooseLifeDecision(chosen, 'rest')).toBe(chosen);
    expect(currentLifeDecision(chosen).options.every(row => row.reason === 'You already made this choice.')).toBe(true);
    const equipment = career('equipment'); equipment.decisionId = 'equipment'; equipment.resources.credits = 3;
    expect(currentLifeDecision(equipment).options.find(row => row.id === 'book')?.reason).toBe('Not enough credits.');
    expect(chooseLifeDecision(equipment, 'book')).toBe(equipment);
    expect(chooseLifeDecision(equipment, 'outside').resources.credits).toBe(3);
    const tired = { ...career('tired'), resources: { condition: 42, credits: 8, trust: 18 } };
    const next = nextCareerSeason({ ...tired, phase: 'seasonComplete' });
    expect(next.decisionId).toBe('late-night');
  });

  it('changes actual shot windows stamina and inbound decisions through preparation and earned roles', () => {
    const base = career(), trained = applyCareerAction(base, { kind: 'training', attribute: 'shooting' });
    const recovered = applyCareerAction(base, { kind: 'recovery' });
    const regularMatch = createCourtMatch(careerMatchConfig(base));
    const trainedMatch = createCourtMatch(careerMatchConfig(trained));
    const restedMatch = createCourtMatch(careerMatchConfig(recovered));
    expect(courtShotMeter(trainedMatch, base.playerId).window).toBeGreaterThan(courtShotMeter(regularMatch, base.playerId).window);
    const stamina = (match: CourtMatch) => match.players.find(row => row.id === base.playerId)!.stamina;
    expect(stamina(restedMatch)).toBeGreaterThan(stamina(regularMatch));
    expect(stamina(trainedMatch)).toBeLessThan(stamina(regularMatch));
    const trusted = applyCareerAction(applyCareerAction(base, { kind: 'team' }), { kind: 'team' });
    expect(courtCareerRole(trusted.resources.trust).name).toBe('Trusted outlet');
    expect(careerMatchConfig(trusted).role).toEqual(courtCareerRole(trusted.resources.trust).config);
    expect(careerMatchConfig(trusted).home.chemistry).toBeGreaterThan(careerMatchConfig(base).home.chemistry!);
    let newcomerInbound = 0, leaderInbound = 0;
    for (let seed = 1; seed <= 128; seed++) {
      const config = careerMatchConfig(base);
      const low = advance(createCourtMatch({ ...config, seed: seed * 104729, role: courtCareerRole(25).config }), 18);
      const high = advance(createCourtMatch({ ...config, seed: seed * 104729, role: courtCareerRole(80).config }), 18);
      newcomerInbound += Number(low.ball.ownerId === base.playerId); leaderInbound += Number(high.ball.ownerId === base.playerId);
    }
    expect(leaderInbound, 'higher earned role changes real inbound ownership over the same seeds').toBeGreaterThan(newcomerInbound);
    console.log(JSON.stringify({ roleSeeds: 128, newcomerInbound, leaderInbound, regularStamina: stamina(regularMatch), restedStamina: stamina(restedMatch) }));
  });

  it('reconciles a complete season from twelve actual engine fixtures without duplicate progress', () => {
    let value = career();
    for (let round = 0; round < 6; round++) {
      value = startCareerMatch(prepared(value));
      const fixture = currentCareerFixture(value)!, own = simulateCourtMatch(careerMatchConfig(value));
      const otherFixture = value.fixtures.find(row => row.round === round && row.id !== fixture.id)!;
      const other = simulateCourtMatch(careerMatchConfig(value, otherFixture));
      expect(completeCareerMatch(value, value.activeMatch!.match)).toBe(value);
      const before = value, next = completeCareerMatch(value, own);
      expect(next.round).toBe(round + 1); expect(next.results).toHaveLength((round + 1) * 2);
      expect(next.weeks[round]).toEqual({ round, fixtureId: fixture.id, preparation: before.preparation,
        decision: { decisionId: before.decisionId, ...before.decision! },
        beforeMatch: { resources: before.resources, attributes: courtCareerPlayer(before).attrs, role: courtCareerRole(before.resources.trust).name },
        afterMatch: next.resources });
      for (const match of [own, other]) {
        const recorded = next.results.find(row => row.fixtureId === match.id)!;
        expect(recorded).toMatchObject({ home: match.score.home, away: match.score.away, winner: match.result!.winner, tick: match.tick, rngState: match.rngState });
        expect(recorded.stats).toEqual(Object.fromEntries(match.players.map(player => [player.id, player.stats])));
      }
      expect(completeCareerMatch(next, own)).toBe(next);
      expect(before.results).toHaveLength(round * 2);
      value = next;
    }
    expect(value.phase).toBe('seasonComplete'); expect(value.chapters).toHaveLength(1);
    expect(value.chapters[0].weeks).toEqual(value.weeks);
    expect(courtCareerHistory(value)[0].weeks).toHaveLength(6);
    const table = courtStandings(value.world, value.fixtures, value.results);
    expect(table.map(row => row.played)).toEqual([6, 6, 6, 6]);
    expect(table.reduce((sum, row) => sum + row.scored, 0)).toBe(table.reduce((sum, row) => sum + row.conceded, 0));
    const line = table.find(row => row.crewId === value.crewId)!, stats = courtSeasonStats(value);
    expect(stats.attempts).toBeGreaterThan(0);
    const expected = Math.round(50 * (line.wins + line.draws / 2) / 6 + 20 * Math.min(stats.points, 60) / 60
      + 20 * Math.min(2 * stats.assists + stats.steals + stats.blocks + stats.rebounds, 36) / 36 + 10 * Math.max(0, 1 - stats.turnovers / 18));
    expect(courtSeasonScore(value)).toBe(expected);
    expect(courtSeasonScoreBreakdown(value).total).toBe(expected);
    expect(decodeCourtLifeSave(encodeCourtLifeSave(value)).status).toBe('valid');
    console.log(JSON.stringify({ actualFixtures: value.results.length, standings: table, playerStats: stats, seasonScore: expected }));
    cachedSeason = value;
  }, 60000);

  it('claims each completed season once and carries actual attributes resources and history forward', () => {
    const fresh = career(); expect(claimCourtSeasonScore(fresh).completion).toBeNull();
    const completed = finishedSeason(), originalChapter = clone(completed.chapters[0]);
    const claimed = claimCourtSeasonScore(completed);
    expect(claimed.completion).toEqual({ id: 'career-test:season:1', score: courtSeasonScore(completed), wins: courtStandings(completed.world, completed.fixtures, completed.results).find(row => row.crewId === completed.crewId)!.wins });
    expect(claimCourtSeasonScore(claimed.career).completion).toBeNull();
    const next = nextCareerSeason(claimed.career);
    expect(next.season).toBe(2); expect(next.round).toBe(0); expect(next.results).toHaveLength(0);
    expect(next.resources).toEqual(completed.resources); expect(courtCareerPlayer(next).attrs).toEqual(courtCareerPlayer(completed).attrs);
    expect(next.chapters[0]).toEqual({ ...originalChapter, claimed: true });
    expect(next.weeks).toHaveLength(0); expect(next.chapters[0].weeks).toHaveLength(6);
    expect(next.fixtures.every(row => row.id.startsWith('career-test:s2:'))).toBe(true);
    const advanced = applyCareerAction(next, { kind: 'training', attribute: 'finishing' });
    expect(advanced.chapters).toEqual(next.chapters);
    expect(decodeCourtLifeSave(encodeCourtLifeSave(advanced)).status).toBe('valid');
  }, 60000);

  it('scores the stated season arithmetic with caps draws and turnovers', () => {
    // Arithmetic fixtures are separate from the full real-engine season above.
    function scoreFixture(draw: boolean, turnovers: number, points = 10) {
      const value = career('score');
      value.results = value.fixtures.map(fixture => {
        const match = createCourtMatch(careerMatchConfig(value, fixture));
        const stats = Object.fromEntries(match.players.map(player => [player.id, { ...player.stats }]));
        const own = fixture.homeId === value.crewId || fixture.awayId === value.crewId;
        let home = 0, away = 0;
        if (own) {
          stats[value.playerId] = { ...stats[value.playerId], points, attempts: points / 2, made: points / 2, steals: 1, blocks: 1, rebounds: 4, turnovers };
          if (fixture.homeId === value.crewId) home = points; else away = points;
          if (draw) {
            const opponent = match.players.find(player => player.side === (fixture.homeId === value.crewId ? 'away' : 'home'))!;
            stats[opponent.id] = { ...stats[opponent.id], points, attempts: points / 2, made: points / 2 };
            home = points; away = points;
          }
        }
        return { fixtureId: fixture.id, home, away, winner: home === away ? 'draw' as const : home > away ? 'home' as const : 'away' as const, tick: 5000, rngState: 1, stats };
      });
      return value;
    }
    expect(courtSeasonScoreBreakdown(scoreFixture(false, 0))).toEqual({ wins: 50, scoring: 20, teamwork: 20, security: 10, total: 100 });
    expect(courtSeasonScoreBreakdown(scoreFixture(true, 0))).toEqual({ wins: 25, scoring: 20, teamwork: 20, security: 10, total: 75 });
    expect(courtSeasonScoreBreakdown(scoreFixture(false, 3))).toEqual({ wins: 50, scoring: 20, teamwork: 20, security: 0, total: 90 });
    expect(courtSeasonScore(scoreFixture(false, 20, 20))).toBe(90);
  });

  it('claims only the current finished season when an older saved chapter remains unclaimed', () => {
    const previous = finishedSeason();
    expect(previous.chapters[0].claimed).toBe(false);
    const restored = decodeCourtLifeSave(encodeCourtLifeSave(previous));
    expect(restored.status).toBe('valid');
    if (restored.status !== 'valid') throw new Error(restored.reason);
    let value = nextCareerSeason(restored.career);
    expect(claimCourtSeasonScore(value)).toEqual({ career: value, completion: null });
    for (let round = 0; round < 6; round++) {
      value = startCareerMatch(prepared(value));
      value = completeCareerMatch(value, simulateCourtMatch(careerMatchConfig(value)));
      expect(value.round).toBe(round + 1);
    }
    expect(value.season).toBe(2); expect(value.chapters).toHaveLength(2);
    const claimed = claimCourtSeasonScore(value);
    expect(claimed.completion, 'A new finish cannot repay a previous saved chapter').toMatchObject({ id: `${value.id}:season:2`, score: value.chapters[1].score });
    expect(claimed.career.chapters[0]).toEqual(previous.chapters[0]);
    expect(claimed.career.chapters[1].claimed).toBe(true);
    expect(claimCourtSeasonScore(claimed.career)).toEqual({ career: claimed.career, completion: null });
    expect(decodeCourtLifeSave(encodeCourtLifeSave(claimed.career)).status).toBe('valid');
  }, 60000);

  it('restores an active match paused with its exact RNG and neutral continuation', () => {
    let value = startCareerMatch(prepared(career('resume')));
    const current = advance(value.activeMatch!.match, 140);
    value = updateCareerMatch(value, current, false);
    const raw = encodeCourtLifeSave(value), decoded = decodeCourtLifeSave(raw);
    expect(decoded.status).toBe('valid');
    if (decoded.status !== 'valid') throw new Error(decoded.reason);
    expect(decoded.career.activeMatch!.paused).toBe(true);
    expect(decoded.career.activeMatch!.match).toEqual(neutralizeCourtMatch(current));
    expect(decoded.career.activeMatch!.match.rngState).toBe(current.rngState);
    expect(advance(decoded.career.activeMatch!.match, 300)).toEqual(advance(neutralizeCourtMatch(current), 300));
    expect(encodeCourtLifeSave(value)).toBe(raw);
    expect(decodeCourtLifeSave(encodeCourtLifeSave(career())).status).toBe('valid');
  });

  it('rejects corrupt unknown and inconsistent saves while leaving the supplied bytes untouched', () => {
    const value = startCareerMatch(prepared(career('corrupt')));
    const cases: Array<(copy: any) => void> = [
      row => { row.resources.credits = -1; }, row => { row.world.crews[1].players[0].id = row.playerId; },
      row => { row.fixtures[0].homeId = row.fixtures[0].awayId; }, row => { row.blocksLeft = 1; },
      row => { row.activeMatch.match.rngState = null; }, row => { row.activeMatch.match.ball.ownerId = 'missing-player'; },
      row => { row.activeMatch.match.players[0].x = Infinity; }, row => { row.activeMatch.match.players[0].stats.points = 2; },
      row => { row.activeMatch.match.role.callPriority = 5; }, row => { row.activeMatch.match.players[0].attrs.shooting += 1; },
      row => { delete row.activeMatch.match.players[0].stride; }, row => { delete row.activeMatch.match.ball.turnoverOwnerId; },
    ];
    for (const damage of cases) {
      const changed = clone(value); damage(changed); const raw = JSON.stringify(changed), kept = raw;
      expect(decodeCourtLifeSave(raw).status).toBe('invalid'); expect(raw).toBe(kept);
    }
    expect(decodeCourtLifeSave('{broken').status).toBe('invalid');
    expect(decodeCourtLifeSave(JSON.stringify({ ...value, version: 999 })).status).toBe('unsupported');
    expect(decodeCourtLifeSave(JSON.stringify({ ...value, world: null })).status).toBe('invalid');
    expect(decodeCourtLifeSave(encodeCourtLifeSave(value)).status).toBe('valid');
  });

  it('rejects missing or mismatched airborne shooters while preserving actual shot and loose continuations', () => {
    const value = startCareerMatch(prepared(career('airborne')));
    let match = value.activeMatch!.match, airborne: CourtMatch | undefined, loose: CourtMatch | undefined;
    for (let tick = 0; tick < 6000 && (!airborne || !loose); tick++) {
      match = match.phase === 'halftime' ? continueCourtPeriod(match) : stepCourtMatch(match);
      if (!airborne && match.ball.mode === 'shot') airborne = match;
      if (!loose && match.ball.mode === 'loose' && match.ball.shooterId !== null) loose = match;
    }
    expect(airborne, 'The actual engine releases a shot').toBeDefined();
    expect(loose, 'The actual engine retains the shooter on a live miss or block').toBeDefined();
    const shotCareer = updateCareerMatch(value, airborne!, true);
    for (const live of [airborne!, loose!]) {
      const decoded = decodeCourtLifeSave(encodeCourtLifeSave(updateCareerMatch(value, live, true)));
      expect(decoded.status, `An actual ${live.ball.mode} possession remains loadable`).toBe('valid');
      if (decoded.status === 'valid') expect(advance(decoded.career.activeMatch!.match, 45)).toEqual(advance(neutralizeCourtMatch(live), 45));
    }
    const damage: Array<(ball: CourtMatch['ball']) => void> = [
      ball => { ball.shooterId = null; }, ball => { ball.shotSide = null; },
      ball => { ball.shotSide = ball.shotSide === 'home' ? 'away' : 'home'; },
      ball => { ball.ownerId = ball.shooterId; },
    ];
    for (const corrupt of damage) {
      const changed = clone(shotCareer); corrupt(changed.activeMatch!.match.ball);
      const raw = encodeCourtLifeSave(changed), kept = raw;
      expect(decodeCourtLifeSave(raw).status, 'An airborne shot needs its real shooter side and no owner').toBe('invalid');
      expect(raw).toBe(kept);
    }
  });

  it(independent, () => {
    const first = career('first'), second = career('second');
    const original = clone(second.world);
    first.world.crews[0].name = 'Saved local crew';
    courtCareerPlayer(first).attrs.shooting = 94;
    expect(second.world).toEqual(original);
    expect(createCourtLifeWorld().crews[0].name).toBe('Copper Owls');
    const restored = decodeCourtLifeSave(encodeCourtLifeSave(first));
    expect(restored.status).toBe('valid');
    if (restored.status === 'valid') {
      expect(restored.career.world.crews[0].name).toBe('Saved local crew');
      expect(courtCareerPlayer(restored.career).attrs.shooting).toBe(94);
      expect(restored.career.playerId).toBe('first:player');
    }
  });
});
