import { describe, expect, it, vi } from 'vitest';
import * as random from '@/lib/careerEngine';
import {
  createNrlCareer, nrlAttackPlanPreview, nrlOppositionReport, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlNextRound, type NrlAttackPlan } from '@/lib/nrlManager';

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
    });
    expect(nrlOppositionReport(plan(state, 'middle'))!.attackEdge - standard.attackEdge).toBeCloseTo(6);
    expect(nrlOppositionReport(plan(state, 'wide'))!.attackEdge - standard.attackEdge).toBeCloseTo(-4);
    expect(nrlOppositionReport(plan(state, 'middle'))!.defenseEdge - standard.defenseEdge).toBeCloseTo(-2);
    const incomplete = { ...state, players: state.players.filter(player => player.contract?.clubId !== opponent || player.role !== 'Hooker') };
    expect(nrlAttackPlanPreview(incomplete)).toBeNull();
    expect(plan(incomplete, 'middle')).toBe(incomplete);
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
    expect(nrlAttackPlanPreview(bye)).toBeNull();
    const legacy = readNrlCareerSave(bytes(createNrlSeason('broncos', 16)))!;
    expect(nrlAttackPlanPreview(legacy)).toBeNull();
    expect(plan(legacy, 'middle')).toBe(legacy);
    for (const [state, attackPlan] of [[original, 'standard'], [original, 'unknown'], [bye, 'middle'], [legacy, 'wide']] as const) {
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
    const planned = plan(state, 'wide');
    expect(planned.season.attackPlan).toBe('wide');
    const pending = startLive(planned);
    expect(pending.season.live?.fixture.finalsRound).toBeDefined();
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
