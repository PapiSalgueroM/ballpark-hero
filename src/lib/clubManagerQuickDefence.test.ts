import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  benchFor, changeLive, coachQuickMatch, FORMATIONS, liveGoneIds, loadCareer, matchRuleOf,
  myOnPitchAt, pitchLineOf, playNextEntry, resumeMatch, saveCareer, startCareer, type CareerState,
} from '@/lib/clubManager';
import { mulberry32 } from '@/lib/leagueCore';

const startSeed = 4107;
const matchSeed = 1068;
const secondHalfSeed = 101068;

function onSeed<T>(seed: number, play: () => T): T {
  const random = vi.spyOn(Math, 'random').mockImplementation(mulberry32(seed));
  try { return play(); } finally { random.mockRestore(); }
}

const fresh = () => onSeed(startSeed, () => startCareer('Everton', 'now'));

function halftime(seed = matchSeed) {
  const result = onSeed(seed, () => playNextEntry(freshCareer));
  expect(result.kind).toBe('halftime');
  expect(result.state.live?.opponent).toBe('Crystal Palace');
  return result.state;
}

let freshCareer: CareerState;
beforeEach(() => {
  localStorage.clear();
  freshCareer = fresh();
});

describe('Quick Sim defensive cover after a dismissal', () => {
  it('uses a legal attacker-for-defender substitution and records a ten-player shape', () => {
    const state = halftime();
    const prior = state.live!;
    const red = prior.h1Cards?.find(card => card.kind === 'red')!;
    const back = prior.onPitch.indexOf(red.id!);
    const formation = FORMATIONS[prior.formationIndex!];
    expect(red).toMatchObject({ id: 'p-jarrad-branthwaite', minute: 26 });
    expect(formation.slots[back].label).toBe('RB');
    const copy = JSON.stringify(state);
    const next = onSeed(secondHalfSeed, () => coachQuickMatch(state));
    const live = next.live!;
    const swap = live.subs?.find(sub => sub.minute === 46 && sub.onId === 'p-jake-o-brien');
    expect(swap).toBeDefined();
    const attack = prior.onPitch.indexOf(swap!.offId!);
    expect(pitchLineOf(formation.slots[attack])).toBe('attack');
    expect(swap?.offId).not.toBe(red.id);
    expect(live.formChanges?.[0]).toMatchObject({ minute: 46, formationIndex: prior.formationIndex, duties: prior.duties });
    expect(live.formChanges?.[0].order[back]).toBe(swap?.onId);
    expect(live.formChanges?.[0].order[attack]).toBe(red.id);
    const gone = liveGoneIds(live, 47);
    const active = myOnPitchAt(live, 47).filter(id => !gone.has(id));
    expect(active).toHaveLength(10);
    expect(new Set(active).size).toBe(10);
    expect(active).toContain(swap?.onId);
    expect(active).not.toContain(red.id);
    expect(live.h1Cards).toEqual(prior.h1Cards);
    expect(live.h1My).toEqual(prior.h1My);
    expect(live.h1Opp).toEqual(prior.h1Opp);
    expect(live.h1Play).toEqual(prior.h1Play);
    expect(live.startXi).toEqual(prior.startXi);
    expect(next.squad).toEqual(state.squad);
    expect(JSON.stringify(state)).toBe(copy);

    expect(saveCareer(next)).toBe(true);
    const loaded = loadCareer()!;
    expect(loaded.live?.formChanges).toEqual(live.formChanges);
    const finished = onSeed(secondHalfSeed, () => resumeMatch(loaded));
    expect(finished.kind).toBe('match');
    expect(finished.state.week).toBe(state.week + 1);
    if (finished.kind !== 'match') throw new Error('Expected the original fixture to settle');
    expect(finished.report?.detail?.cards).toContainEqual(red);
    expect(finished.report?.detail?.subs).toContainEqual({ off: swap!.off, on: swap!.on, minute: swap!.minute });
  });

  it('keeps custom slot coordinates in both snapshots and settles after reload', () => {
    const state = halftime();
    const live = state.live!;
    const formationIndex = live.formationIndex!;
    const shape = { v: 1, formationIndex, points: FORMATIONS[formationIndex].slots.map(({ x, y }) => ({ x, y })) };
    Object.assign(live, { positionRules: 1, customShape: shape,
      kickoffShape: { formationIndex, duties: [...live.duties!], customShape: shape } });
    const next = onSeed(secondHalfSeed, () => coachQuickMatch(state));
    expect(next.live?.formChanges?.[0].customShape).toEqual(shape);
    expect(next.live?.kickoffShape).toEqual(live.kickoffShape);
    expect(next.live?.customShape).toEqual(shape);
    expect(saveCareer(next)).toBe(true);
    const loaded = loadCareer()!;
    expect(loaded.live?.formChanges).toEqual(next.live?.formChanges);
    expect(onSeed(secondHalfSeed, () => resumeMatch(loaded)).kind).toBe('match');
  });

  it('uses cover on ordinary Quick Sim but keeps the unmanaged path and direct red replacement separate', () => {
    const managed = onSeed(matchSeed, () => playNextEntry(freshCareer, { skipHalftime: true }));
    const unmanaged = onSeed(matchSeed, () => playNextEntry(freshCareer, { skipHalftime: true, noCoach: true }));
    if (managed.kind !== 'match' || unmanaged.kind !== 'match') throw new Error('Expected both fixture paths to settle');
    expect(managed.report?.detail?.subs).toContainEqual({ off: 'Thierno Barry', on: "Jake O'Brien", minute: 46 });
    expect(unmanaged.report?.detail?.subs).toEqual([]);
    const paused = halftime();
    expect(changeLive(paused, 46, { kind: 'sub', outId: 'p-jarrad-branthwaite', inId: 'p-jake-o-brien' })).toBeNull();
  });

  it('keeps ordinary, attacking-red and unavailable-cover cases on their existing paths', () => {
    const ordinary = halftime(1000);
    expect(ordinary.live?.h1Cards?.some(card => card.kind === 'red')).toBe(false);
    const strikerRed = halftime(1005);
    expect(strikerRed.live?.h1Cards).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'p-thierno-barry', kind: 'red' })]));
    const noBench = halftime();
    const starters = new Set(noBench.live?.onPitch);
    noBench.squad = noBench.squad.filter(player => starters.has(player.id));
    expect(benchFor(noBench)).toEqual([]);
    const reserved = halftime();
    reserved.live!.subsUsed = matchRuleOf(reserved).subs - 1;
    const multiple = halftime();
    multiple.live!.h1Cards!.push({ kind: 'red', id: 'p-james-tarkowski', name: 'James Tarkowski', minute: 30 });
    const pastBreak = halftime();
    pastBreak.live!.minute = 47;
    for (const state of [ordinary, strikerRed, noBench, reserved, multiple, pastBreak]) {
      expect(onSeed(secondHalfSeed, () => coachQuickMatch(state)).live?.formChanges).toBeUndefined();
    }
  });
});
