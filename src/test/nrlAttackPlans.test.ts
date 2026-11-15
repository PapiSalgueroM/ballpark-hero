import { describe, expect, it, vi } from 'vitest';
import * as random from '@/lib/careerEngine';
import {
  createNrlCareer, nrlAttackPlanPreview, nrlCounterPlanPreview, nrlLiveAttackPlans, nrlLivePlanPreview, nrlOppositionReport,
  nrlRivalSquad, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlNextRound, type NrlAttackPlan } from '@/lib/nrlManager';
import { nrlScorePoints } from '@/lib/nrlPlayerScoring';

const bytes = JSON.stringify;
const open = (seed = 16) => createNrlCareer('broncos', seed);
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const startLive = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startLive' });
const plan = (state: NrlCareerState, attackPlan: NrlAttackPlan, round = state.season.round) =>
  reduceNrlCareer(state, { type: 'setAttackPlan', attackPlan, year: state.season.year, clubId: state.season.clubId, round });
const finish = (state: NrlCareerState) =>
  reduceNrlCareer(state, { type: 'finishLive', year: state.season.year, round: state.season.round, tactic: state.season.tactic });
const managed = (state: NrlCareerState) => {
  const { clubId, round, results } = state.season;
  return results.find(match => match.round === round - 1 && (match.homeId === clubId || match.awayId === clubId))!;
};

describe('NRL match attack plans', () => {
  it.each([
    [2026, 'broncos', 1, 'edges', -2, 3, [22, 8], [16, 8]],
    [2027, 'bears', 3, 'middle', 3, -2, [24, 28], [30, 28]],
  ] as const)('counters a simulated style from the %s fixture without drawing on preview', (year, club, seed, style, attack, defense, ordinaryScore, counterScore) => {
    const initial = createNrlCareer(club, seed, year);
    const original = bytes(initial);
    const draws = vi.spyOn(random, 'rngFrom');
    try {
      expect(nrlCounterPlanPreview(initial)).toEqual({ style, attack, defense });
      expect(draws).not.toHaveBeenCalled();
    } finally {
      draws.mockRestore();
    }
    const pending = plan(initial, 'counter');
    expect(pending.season.attackPlan).toBe('counter');
    expect(nrlOppositionReport(initial)?.style).toBe(style);
    expect(nrlOppositionReport(pending)!.attackEdge - nrlOppositionReport(initial)!.attackEdge).toBeCloseTo(attack);
    expect(nrlOppositionReport(pending)!.defenseEdge - nrlOppositionReport(initial)!.defenseEdge).toBeCloseTo(defense);
    expect(bytes(plan(pending, 'standard'))).toBe(original);
    expect(bytes(readNrlCareerSave(bytes(pending)))).toBe(bytes(pending));
    expect(bytes(initial)).toBe(original);
    expect(plan(initial, 'counter', 2)).toBe(initial);

    const half = startLive(pending);
    const choices = { year, round: 1, tactic: 'balanced' } as const;
    expect(plan(half, 'standard')).toBe(half);
    const stage = reduceNrlCareer(readNrlCareerSave(bytes(half))!, { ...choices, type: 'reachMinute60' });
    expect(stage.season.live?.minute60).toBeDefined();
    expect(plan(stage, 'middle')).toBe(stage);
    expect(bytes(readNrlCareerSave(bytes(stage)))).toBe(bytes(stage));
    const taken = reduceNrlCareer(readNrlCareerSave(bytes(stage))!, { ...choices, type: 'finishMinute60' });
    const direct = advance(pending);
    const control = advance(initial);
    expect(JSON.stringify(taken, (key, value) => key === 'at60' ? undefined : value)).toBe(bytes(direct));
    expect(direct.season.attackPlan).toBeUndefined();
    expect(managed(direct).counterStyle).toBe(style);
    expect([managed(control).homeScore, managed(control).awayScore]).toEqual(ordinaryScore);
    expect([managed(direct).homeScore, managed(direct).awayScore]).toEqual(counterScore);
    expect(bytes(readNrlCareerSave(bytes(direct)))).toBe(bytes(direct));
    const foreign = direct.season.results.find(match => match.homeId !== club && match.awayId !== club)!;
    expect(foreign.counterStyle).toBeUndefined();
    expect(foreign).toEqual(control.season.results.find(match => match.homeId === foreign.homeId && match.awayId === foreign.awayId));
    for (const result of [managed(direct), foreign]) {
      const forged = { ...direct, season: { ...direct.season, results: direct.season.results.map(match =>
        match === result ? { ...match, counterStyle: style === 'middle' ? 'edges' : 'middle' } : match) } };
      expect(readNrlCareerSave(bytes(forged))).toBeNull();
    }
  });

  it('keeps a selected plan until the match settles and Standard restores the original bytes', () => {
    const standard = open();
    const middle = plan(standard, 'middle');
    expect(middle.season.attackPlan).toBe('middle');
    expect(middle.players).toBe(standard.players);
    expect(middle.finance).toBe(standard.finance);
    expect(plan(middle, 'middle')).toBe(middle);
    expect(plan(standard, 'standard')).toBe(standard);
    expect(bytes(plan(middle, 'standard'))).toBe(bytes(standard));
    expect(bytes(readNrlCareerSave(bytes(middle)))).toBe(bytes(middle));
    expect(advance(middle).season).not.toHaveProperty('attackPlan');
  });

  it('uses selected lane ratings against the saved rival, with bounded attack and an explicit defence cost', () => {
    const original = open();
    const opponent = nrlOppositionReport(original)!.opponentId;
    const middleRoles = ['Prop 8', 'Hooker', 'Prop 10', 'Lock'];
    const wideRoles = ['Left Wing', 'Left Centre', 'Right Centre', 'Right Wing'];
    const players = original.players.map(player => {
      const own = player.contract?.clubId === original.season.clubId;
      if (!own && player.contract?.clubId !== opponent) return player;
      const rating = middleRoles.includes(player.role) ? (own ? 94 : 60)
        : wideRoles.includes(player.role) ? (own ? 60 : 94) : 77;
      return { ...player, rating, potential: 98 };
    });
    const byId = new Map(players.map(player => [player.id, player]));
    const state = { ...original, players, season: { ...original.season,
      squad: original.season.squad.map(player => ({ ...player, rating: byId.get(player.id)!.rating })) } };
    const standard = nrlOppositionReport(state)!;
    expect(nrlAttackPlanPreview(state)).toEqual({
      middle: { attack: 6, defense: -2 },
      wide: { attack: -4, defense: -2 },
      wideLeft: { attack: -4, defense: -2 },
      wideRight: { attack: -4, defense: -2 },
    });
    expect(nrlOppositionReport(plan(state, 'middle'))!.attackEdge - standard.attackEdge).toBeCloseTo(6);
    expect(nrlOppositionReport(plan(state, 'wide'))!.attackEdge - standard.attackEdge).toBeCloseTo(-4);
    expect(nrlOppositionReport(plan(state, 'middle'))!.defenseEdge - standard.defenseEdge).toBeCloseTo(-2);
    const incomplete = { ...state, players: state.players.filter(player => player.contract?.clubId !== opponent || player.role !== 'Hooker') };
    expect(nrlAttackPlanPreview(incomplete)).toBeNull();
    expect(nrlOppositionReport(incomplete)?.matchups).toBeUndefined();
    expect(plan(incomplete, 'middle')).toBe(incomplete);
    expect(plan(incomplete, 'wideLeft')).toBe(incomplete);
    const half = startLive(incomplete);
    expect(nrlLiveAttackPlans(half)).toEqual(['standard', 'counter']);
    expect(reduceNrlCareer(half, { type: 'reachMinute60', year: 2026, round: 1, tactic: 'balanced', attackPlan: 'wideRight' })).toBe(half);
  });

  it.each([
    [2026, 5, 'sharks', true, 1.899, -1.951, [34, 40, 34]],
    [2027, 6, 'titans', false, -2.601, 1.789, [26, 20, 26]],
  ] as const)('uses the opposing edge in the %s Storm fixture and keeps the other results byte-identical', (year, seed, opponent, home, left, right, scores) => {
    const initial = createNrlCareer('storm', seed, year);
    const before = bytes(initial);
    const report = nrlOppositionReport(initial)!;
    const rival = nrlRivalSquad(initial, opponent);
    expect(report.opponentId).toBe(opponent);
    expect(nrlNextRound(initial.season).clubMatch!.homeId === 'storm').toBe(home);
    const preview = nrlAttackPlanPreview(initial)!;
    expect(preview.wideLeft.attack).toBeCloseTo(left, 3);
    expect(preview.wideRight.attack).toBeCloseTo(right, 3);
    const options = ['wide', 'wideLeft', 'wideRight'] as const;
    for (const [side, positions] of [
      ['wideLeft', [['Left Wing', 'Right Wing'], ['Left Centre', 'Right Centre']]],
      ['wideRight', [['Right Wing', 'Left Wing'], ['Right Centre', 'Left Centre']]],
    ] as const) {
      const matchup = report.matchups![side];
      expect(matchup.positions.map(({ role, rivalRole }) => [role, rivalRole])).toEqual(positions);
      for (const position of matchup.positions) {
        expect(position.rival).toBe(rival.find(({ player }) => player.role === position.rivalRole)?.player.rating);
      }
    }
    const baseline = advance(initial);
    const outsiders = (state: NrlCareerState) => state.season.results.filter(match => match.homeId !== 'storm' && match.awayId !== 'storm');
    for (const [index, choice] of options.entries()) {
      const selected = plan(initial, choice);
      expect(selected.season.attackPlan).toBe(choice);
      expect(bytes(plan(selected, 'standard'))).toBe(before);
      const selectedReport = nrlOppositionReport(selected)!;
      expect(selectedReport.attackEdge - report.attackEdge).toBeCloseTo(preview[choice].attack, 10);
      expect(selectedReport.defenseEdge - report.defenseEdge).toBeCloseTo(-2, 10);
      const result = advance(readNrlCareerSave(bytes(selected))!);
      const match = managed(result);
      expect(result.season.attackPlan).toBeUndefined();
      expect(home ? match.homeScore : match.awayScore).toBe(scores[index]);
      expect(match.openingAttackPlan).toBe(choice === 'wide' ? undefined : choice);
      expect(outsiders(result)).toStrictEqual(outsiders(baseline));
      expect(bytes(readNrlCareerSave(bytes(result)))).toBe(bytes(result));
      const foreign = outsiders(result)[0];
      for (const [target, forged] of [[match, 'wide'], [foreign, 'wideLeft']] as const) {
        const tampered = { ...result, season: { ...result.season, results: result.season.results.map(row =>
          row === target ? { ...row, openingAttackPlan: forged } : row) } };
        expect(readNrlCareerSave(bytes(tampered))).toBeNull();
      }
    }
    expect(bytes(initial)).toBe(before);
  });

  it('keeps the completed periods and phase receipts when switching sides in a reloaded Live Match', () => {
    const initial = createNrlCareer('storm', 5, 2026);
    const action = { year: 2026, round: 1, tactic: 'balanced' } as const;
    const half = startLive(plan(initial, 'wideLeft'));
    expect(half.season.attackPlan).toBe('wideLeft');
    expect(nrlLiveAttackPlans(half)).toEqual(['standard', 'middle', 'wide', 'wideLeft', 'wideRight', 'counter']);
    expect(plan(half, 'wideRight')).toBe(half);
    const fromHalf = { ...action, type: 'finishLive', attackPlan: 'wideRight' } as const;
    const halfPreview = nrlLivePlanPreview(half, fromHalf)!;
    expect(halfPreview.attackChange).toBeCloseTo(-3.85, 2);
    expect(halfPreview.defenseChange).toBeCloseTo(0, 10);
    const staged = reduceNrlCareer(readNrlCareerSave(bytes(half))!, { ...fromHalf, type: 'reachMinute60' });
    expect(staged.season.live?.minute60?.attackPlan).toBe('wideRight');
    expect(staged.season.live?.homeScoring).toEqual(half.season.live!.homeScoring);
    expect(staged.season.live?.awayScoring).toEqual(half.season.live!.awayScoring);
    const restored = readNrlCareerSave(bytes(staged))!;
    expect(bytes(restored)).toBe(bytes(staged));
    let finished = reduceNrlCareer(restored, { ...action, type: 'finishMinute60', attackPlan: 'wideLeft' });
    if (finished.season.live?.goldenPoint) {
      finished = reduceNrlCareer(readNrlCareerSave(bytes(finished))!,
        { type: 'settleGoldenPoint', year: 2026, round: 1, clubId: 'storm', approach: 'standard' });
    }
    const match = managed(finished);
    expect(match.openingAttackPlan).toBe('wideLeft');
    expect(match.halftimeAttackPlan).toBe('wideRight');
    expect(match.minute60AttackPlan).toBe('wideLeft');
    expect(match.scorePeriods?.halfTime).toEqual([half.season.live!.homeScoring, half.season.live!.awayScoring].map(nrlScorePoints));
    expect(match.scorePeriods?.at60).toEqual([staged.season.live!.minute60!.homeScoring, staged.season.live!.minute60!.awayScoring].map(nrlScorePoints));
    expect(bytes(readNrlCareerSave(bytes(finished)))).toBe(bytes(finished));
  });

  it('reads the preview without draws or mutation and refuses legacy, bye, stale and forged selections', () => {
    const original = open();
    const saved = bytes(original);
    const draws = vi.spyOn(random, 'rngFrom');
    try {
      expect(nrlAttackPlanPreview(original)).not.toBeNull();
      expect(draws).not.toHaveBeenCalled();
      expect(bytes(original)).toBe(saved);
    } finally {
      draws.mockRestore();
    }
    expect(plan(original, 'wide', 2)).toBe(original);
    expect(plan(original, 'other' as NrlAttackPlan)).toBe(original);
    const bye = createNrlCareer('panthers', 16);
    expect(nrlNextRound(bye.season).clubStatus).toBe('bye');
    expect(plan(bye, 'wide')).toBe(bye);
    expect(plan(bye, 'counter')).toBe(bye);
    expect(nrlAttackPlanPreview(bye)).toBeNull();
    expect(nrlCounterPlanPreview(bye)).toBeNull();
    const legacy = readNrlCareerSave(bytes(createNrlSeason('broncos', 16)))!;
    expect(nrlAttackPlanPreview(legacy)).toBeNull();
    expect(plan(legacy, 'middle')).toBe(legacy);
    expect(plan(legacy, 'counter')).toBe(legacy);
    expect(nrlCounterPlanPreview(legacy)).toBeNull();
    for (const [state, attackPlan] of [[original, 'standard'], [original, 'unknown'], [bye, 'middle'], [legacy, 'wide'],
      [bye, 'counter'], [legacy, 'counter']] as const) {
      expect(readNrlCareerSave(bytes({ ...state, season: { ...state.season, attackPlan } }))).toBeNull();
    }
  });

  it('replays the same plan through live reload and has a real effect on managed matches only', () => {
    let changed = 0;
    for (let seed = 1; seed <= 24; seed++) {
      const standard = open(seed);
      const planned = plan(standard, 'middle');
      const live = startLive(planned);
      const liveBytes = bytes(live);
      expect(live.season.live).toBeDefined();
      expect(live.season.attackPlan).toBe('middle');
      expect(plan(live, 'wide')).toBe(live);
      const reloaded = readNrlCareerSave(liveBytes)!;
      expect(bytes(reloaded)).toBe(liveBytes);
      const settled = finish(reloaded);
      expect(settled).toStrictEqual(advance(planned));
      expect(finish(settled)).toBe(settled);
      const control = advance(standard);
      if (managed(settled).homeScore !== managed(control).homeScore || managed(settled).awayScore !== managed(control).awayScore) changed++;
      const outside = (state: NrlCareerState) => state.season.results.filter(match =>
        match.homeId !== state.season.clubId && match.awayId !== state.season.clubId);
      expect(outside(settled)).toEqual(outside(control));
    }
    expect(changed).toBeGreaterThan(0);
  });

  it('reads the actual trained starter, fitness and reserve rotation in the chosen lane', () => {
    const before = open(7);
    const trainee = before.season.squad.find(player => player.role === 'Prop 10' && player.id !== before.season.lineup['Prop 10'])!;
    const train = (player: typeof trainee) => player.id === trainee.id ? { ...player, secondaryRole: 'Prop 8' as const } : player;
    const trained = { ...before, players: before.players.map(player => ({ ...player, secondaryRole: train(player).secondaryRole })),
      season: { ...before.season, squad: before.season.squad.map(train) } };
    const selected = reduceNrlCareer(trained, { type: 'selectStarter', role: 'Prop 8', playerId: trainee.id });
    expect(selected.season.lineup['Prop 8']).toBe(trainee.id);
    const withoutCover = { ...selected, season: { ...selected.season,
      squad: selected.season.squad.map(player => player.id === trainee.id ? { ...player, secondaryRole: undefined } : player) } };
    expect(nrlAttackPlanPreview(selected)!.middle.attack).toBeGreaterThan(nrlAttackPlanPreview(withoutCover)!.middle.attack);
    const tired = { ...selected, season: { ...selected.season,
      squad: selected.season.squad.map(player => player.id === trainee.id ? { ...player, fitness: 40 } : player) } };
    expect(nrlAttackPlanPreview(tired)!.middle.attack).toBeLessThan(nrlAttackPlanPreview(selected)!.middle.attack);
    const reserve = selected.season.squad.find(player => player.role === 'Prop 8'
      && !Object.values(selected.season.lineup).includes(player.id))!;
    const first = reduceNrlCareer(selected, { type: 'selectBench', slot: 0, playerId: reserve.id });
    const rested = { ...first, season: { ...first.season,
      squad: first.season.squad.map(player => player.id === reserve.id ? { ...player, fitness: 100 } : player) } };
    const tiredReserve = { ...rested, season: { ...rested.season,
      squad: rested.season.squad.map(player => player.id === reserve.id ? { ...player, fitness: 40 } : player) } };
    expect(first.season.bench![0]).toBe(reserve.id);
    expect(nrlAttackPlanPreview(rested)!.middle.attack).toBeGreaterThan(nrlAttackPlanPreview(tiredReserve)!.middle.attack);
  });

  it('offers the same live choice in a managed final and drops the plan before offseason', () => {
    let state = createNrlCareer('storm', 4);
    while (state.season.phase === 'regular') state = advance(state);
    while (state.season.phase === 'finals' && !nrlNextRound(state.season).clubMatch) state = advance(state);
    expect(state.season.phase).toBe('finals');
    const planned = plan(state, 'counter');
    expect(planned.season.attackPlan).toBe('counter');
    const pending = startLive(planned);
    expect(pending.season.live?.fixture.finalsRound).toBeDefined();
    expect(nrlLiveAttackPlans(pending)).toEqual(expect.arrayContaining(['wideLeft', 'wideRight']));
    const liveBytes = bytes(pending);
    const reopened = readNrlCareerSave(liveBytes)!;
    expect(bytes(reopened)).toBe(liveBytes);
    const forged = { ...pending, season: { ...pending.season, live: { ...pending.season.live!,
      homeScoring: { ...pending.season.live!.homeScoring, tries: pending.season.live!.homeScoring.tries + 1 } } } };
    expect(readNrlCareerSave(bytes(forged))).toBeNull();
    state = finish(reopened);
    expect(bytes(state)).toBe(bytes(advance(planned)));
    while (state.season.phase !== 'complete') state = advance(state);
    expect(plan(state, 'middle')).toBe(state);
    expect(nrlAttackPlanPreview(state)).toBeNull();
    expect(reduceNrlCareer(state, { type: 'startNextSeason' }).season).not.toHaveProperty('attackPlan');
  });

});
