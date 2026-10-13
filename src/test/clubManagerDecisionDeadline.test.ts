import { describe, expect, it, vi } from 'vitest';
import type { CareerState } from '@/lib/clubManager';
import type { DeskItem } from '@/lib/clubManagerDecisions';

const E = (process.env.CM_DEADLINE_ENGINE ? await import(/* @vite-ignore */ process.env.CM_DEADLINE_ENGINE)
  : await import('@/lib/clubManager')) as typeof import('@/lib/clubManager');
const D = (process.env.CM_DEADLINE_DECISIONS ? await import(/* @vite-ignore */ process.env.CM_DEADLINE_DECISIONS)
  : await import('@/lib/clubManagerDecisions')) as typeof import('@/lib/clubManagerDecisions');
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const DEADLINE = 'The next match has already kicked off, so the reply window closed. Nothing changed.';
const CLOCK = Date.parse('2026-10-13T16:00:00Z');
type Scope = 'board' | 'press' | 'morale' | 'budget' | 'decline';
const specs: { scope: Scope; deckId: string; option: number; delta: number }[] = [
  { scope: 'board', deckId: 'schoolVisit', option: 0, delta: 2 },
  { scope: 'press', deckId: 'columnist', option: 0, delta: 3 },
  { scope: 'morale', deckId: 'quietWord', option: 0, delta: 6 },
  { scope: 'budget', deckId: 'promoShoot', option: 0, delta: 0.2 },
  { scope: 'decline', deckId: 'schoolVisit', option: 1, delta: 0 },
];
function seeded<T>(seed: number, action: () => T): { result: T; draws: number[] } {
  const draws: number[] = [], random = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0; let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    const draw = ((value ^ value >>> 14) >>> 0) / 4294967296; draws.push(draw); return draw;
  });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(CLOCK);
  try { return { result: action(), draws }; } finally { random.mockRestore(); clock.mockRestore(); }
}
function restore(state: CareerState): CareerState {
  const previous = localStorage.getItem(E.SAVE_KEY), held = JSON.stringify(state);
  try {
    const run = seeded(13570000, () => {
      expect(E.saveCareer(state), 'actual initialized save must write').toBe(true);
      return E.loadCareer();
    });
    expect(run.result, 'actual manager save must validate and reload').not.toBeNull();
    expect(run.draws, 'complete canonical save reload consumes no answer inputs').toEqual([]);
    expect(JSON.stringify(state)).toBe(held); return run.result!;
  } finally { if (previous === null) localStorage.removeItem(E.SAVE_KEY); else localStorage.setItem(E.SAVE_KEY, previous); }
}
function repeatedReload(state: CareerState): CareerState {
  const held = JSON.stringify(state), once = restore(state), twice = restore(once);
  expect(JSON.stringify(once)).toBe(held); expect(JSON.stringify(twice)).toBe(held); return twice;
}
function context(): CareerState {
  return restore(seeded(13570001, () => E.startCareer('Arsenal')).result);
}
function presentation(scope: Scope): { before: CareerState; item: DeskItem; option: number } {
  const spec = specs.find(spec => spec.scope === scope)!, state = context();
  if (scope === 'morale') {
    const target = state.squad.find(player => !player.isYouth && player.position === 'CM') ?? state.squad.find(player => !player.isYouth);
    expect(target, 'actual initialized squad must provide a morale subject').toBeDefined();
    // Only this simulated morale context is prepared; football and medical fields stay initialized.
    state.squad = state.squad.map(player => player.id === target!.id ? { ...player, morale: 40 } : player);
  }
  const source = D.DECK.filter(card => card.id === spec.deckId); expect(source).toHaveLength(1);
  expect(source[0].fits(state)).toBe(true); if (source[0].who) expect(source[0].who(state)).not.toBeNull();
  const built = seeded(13570002, () => D.buildSituation(state, source[0])); expect(built.draws).toEqual([]);
  // The source-built card presentation is prepared before a real kickoff, not a natural offer claim.
  const before = repeatedReload(restore({ ...state, decisions: [built.result] })), item = D.deskOf(before)[0];
  expect(item).toEqual(built.result); expect(item.resolved).toBeUndefined();
  expect(item.options[spec.option].effect).toEqual(scope === 'decline' ? { kind: 'none' } : { kind: 'move', meter: scope, delta: spec.delta });
  return { before, item, option: spec.option };
}
function kickoff(before: CareerState): CareerState {
  const held = JSON.stringify(before), oldDesk = json(before.decisions); let state = before;
  for (let entry = 0; entry < 8; entry++) {
    const input = JSON.stringify(state), run = seeded(13570002 + entry, () => E.playNextEntry(state, { skipHalftime: false }));
    expect(JSON.stringify(state)).toBe(input); state = run.result.state;
    if (run.result.kind === 'halftime') {
      expect(state.live?.week).toBe(state.week); expect(state.live?.onPitch.length).toBeGreaterThan(0);
      expect(state.live?.opponent).toBeTruthy(); expect(state.decisions).toEqual(oldDesk);
      expect(JSON.stringify(before)).toBe(held); return repeatedReload(restore(state));
    }
    expect(run.result.kind, 'only actual calendar window entries may precede this kickoff').toBe('window');
  }
  throw new Error('The actual initialized career did not reach a live fixture within eight calendar calls');
}
function closed(before: CareerState, item: DeskItem, resolved: string, outcome?: DeskItem['outcome']): CareerState {
  const expected = json(before);
  expected.decisions = expected.decisions!.map(card => card.id === item.id
    ? { ...card, options: [], resolved, ...(outcome ? { outcome } : {}) } : card);
  return expected;
}
function answer(before: CareerState, item: DeskItem, option: number): CareerState {
  const held = JSON.stringify(before), run = seeded(13570020, () => E.answerMessage(before, item.id, option));
  expect(run.draws, 'desk answer consumes no match random inputs').toEqual([]); expect(JSON.stringify(before)).toBe(held);
  expect(json(D.answerDecision(before, item.id, option))).toEqual(json(run.result)); return run.result;
}
function unchanged(before: CareerState, id: string, option: number): void {
  const held = JSON.stringify(before), run = seeded(13570020, () => E.answerMessage(before, id, option));
  expect(run.result).toBe(before); expect(JSON.stringify(before)).toBe(held); expect(run.draws).toEqual([]);
}
function beforeEffect(before: CareerState, item: DeskItem, scope: Scope): CareerState {
  let text = 'Noted. Nothing changed.'; const expected = json(before);
  if (scope === 'board') { expected.boardConfidence = Math.min(100, Math.max(1, before.boardConfidence + 2)); text = 'Done. Board patience +2.'; }
  if (scope === 'press') { expected.press!.mood = Math.min(100, Math.max(0, before.press!.mood + 3)); text = 'Done. Press mood +3.'; }
  if (scope === 'morale') {
    const target = expected.squad.find(player => player.id === item.playerId)!;
    target.morale = Math.min(99, Math.max(5, target.morale + 6)); text = `Done. ${target.name}'s morale +6.`;
  }
  if (scope === 'budget') { expected.budget = Math.round((before.budget + 0.2) * 1000) / 1000; text = 'Done. £200k into the transfer budget.'; }
  return closed(expected, item, text);
}
function appealPresentation(): { before: CareerState; item: DeskItem } {
  const state = context(), target = state.squad.find(player => !player.isYouth && player.position !== 'GK')!;
  expect(target).toBeDefined();
  // A recorded two-match ban is prepared for the existing appeal contract; the live match is real.
  state.squad = state.squad.map(player => player.id === target.id ? { ...player, suspendedMatches: 2, seasonReds: 1 } : player);
  const item = D.appealCard(state, target.id, 'Fixture opponent'); expect(item).not.toBeNull();
  return { before: repeatedReload(restore({ ...state, decisions: [item!] })), item: item! };
}
function withoutDesk(state: CareerState): CareerState { const copy = json(state); delete copy.decisions; return copy; }
async function whistleEngines(): Promise<[typeof E, typeof E]> {
  expect(Boolean(process.env.CM_DEADLINE_WHISTLE_ENGINE)).toBe(Boolean(process.env.CM_DEADLINE_NEUTRAL_ENGINE));
  if (process.env.CM_DEADLINE_WHISTLE_ENGINE) expect(process.env.CM_DEADLINE_WHISTLE_ENGINE).not.toBe(process.env.CM_DEADLINE_NEUTRAL_ENGINE);
  async function fresh(filename: string | undefined): Promise<typeof E> {
    if (filename) return await import(/* @vite-ignore */ filename) as typeof E;
    vi.resetModules();
    return await import('@/lib/clubManager');
  }
  const actual = await fresh(process.env.CM_DEADLINE_WHISTLE_ENGINE), neutral = await fresh(process.env.CM_DEADLINE_NEUTRAL_ENGINE);
  expect(actual).not.toBe(neutral); expect(actual.resumeMatch).not.toBe(neutral.resumeMatch);
  return [actual, neutral];
}

describe('Club Manager saved situation reply deadline', () => {
  for (const spec of specs) it(`manager deadline missing: saved ${spec.scope} reply closes after actual kickoff`, () => {
    const fixture = presentation(spec.scope), before = kickoff(fixture.before), after = answer(before, fixture.item, fixture.option);
    const expected = closed(before, fixture.item, DEADLINE);
    expect(JSON.stringify(after) === JSON.stringify(expected), 'manager situation deadline allowed a reply after kickoff').toBe(true);
    expect(json(after)).toEqual(expected); expect(D.deskOf(after)[0].outcome).toBeUndefined();
    expect(E.answerMessage(after, fixture.item.id, fixture.option)).toBe(after); repeatedReload(after);
  });
  for (const spec of specs) it(`manager deadline preservation: ${spec.scope} reply keeps its exact before-kickoff effect`, () => {
    const { before, item, option } = presentation(spec.scope); expect(before.live).toBeFalsy();
    const after = answer(before, item, option); expect(json(after)).toEqual(beforeEffect(before, item, spec.scope));
    expect(E.answerMessage(after, item.id, option)).toBe(after); repeatedReload(after);
  });
  it('manager deadline preservation: live appeal keeps its original expired outcome', () => {
    const fixture = appealPresentation(), before = kickoff(fixture.before), after = answer(before, fixture.item, 0);
    expect(json(after)).toEqual(closed(before, fixture.item, 'The next match has already kicked off, so the appeal window closed. The ban stands.', 'expired'));
    repeatedReload(after);
  });
  it('manager deadline preservation: live acceptBan keeps its original accepted outcome', () => {
    const fixture = appealPresentation(), before = kickoff(fixture.before), after = answer(before, fixture.item, 1);
    expect(json(after)).toEqual(closed(before, fixture.item, `Accepted. ${fixture.item.playerName} serves the 2 matches ban.`, 'accepted'));
    repeatedReload(after);
  });
  it('manager deadline preservation: before-kickoff appeal keeps its deterministic verdict', () => {
    const { before, item } = appealPresentation(), won = D.appealWins(item, before), expected = json(before);
    const target = expected.squad.find(player => player.id === item.playerId)!; target.suspendedMatches = won ? 0 : 3;
    const line = won ? `Appeal won. The ban is wiped and ${target.name} is available for the next match.` : 'Appeal lost. The panel made it 3 matches.';
    const after = answer(before, item, 0); expect(json(after)).toEqual(closed(expected, item, line, won ? 'won' : 'lost'));
    repeatedReload(after);
  });
  it('manager deadline preservation: before-kickoff acceptBan keeps its original accepted outcome', () => {
    const { before, item } = appealPresentation(), after = answer(before, item, 1);
    expect(json(after)).toEqual(closed(before, item, `Accepted. ${item.playerName} serves the 2 matches ban.`, 'accepted')); repeatedReload(after);
  });
  it('manager deadline preservation: missing card returns the same object', () => {
    const fixture = presentation('board');
    for (const state of [fixture.before, kickoff(fixture.before)]) unchanged(state, 'desk-missing', 0);
  });
  it('manager deadline preservation: resolved card returns the same object', () => {
    const fixture = presentation('board'), answered = answer(fixture.before, fixture.item, fixture.option);
    for (const state of [answered, kickoff(answered)]) unchanged(state, fixture.item.id, 0);
  });
  it('manager deadline preservation: invalid before-kickoff choice returns the same object', () => {
    const fixture = presentation('board');
    for (const option of [-1, 999]) unchanged(fixture.before, fixture.item.id, option);
  });
  it('manager deadline preservation: invalid live choice returns the same object', () => {
    const fixture = presentation('board'), before = kickoff(fixture.before);
    for (const option of [-1, 999]) unchanged(before, fixture.item.id, option);
  });
  it('manager deadline preservation: real whistle expires the unanswered card without a desk benefit', async () => {
    const fixture = presentation('budget'), before = kickoff(fixture.before), held = JSON.stringify(before), neutral = withoutDesk(before);
    const neutralHeld = JSON.stringify(neutral);
    const [actualEngine, neutralEngine] = await whistleEngines();
    const actual = seeded(13570030, () => actualEngine.resumeMatch(before)), control = seeded(13570030, () => neutralEngine.resumeMatch(neutral));
    expect(actual.result.kind).toBe('match'); expect(control.result.kind).toBe('match'); expect(actual.draws).toEqual(control.draws);
    expect(JSON.stringify(before)).toBe(held); expect(withoutDesk(actual.result.state)).toEqual(withoutDesk(control.result.state));
    expect(JSON.stringify(neutral)).toBe(neutralHeld);
    const item = D.deskOf(actual.result.state).find(card => card.id === fixture.item.id)!;
    expect(item).toEqual({ ...fixture.item, options: [], resolved: 'Nobody answered before the next match, so nothing changed.' });
    expect(item.outcome).toBeUndefined(); repeatedReload(restore(actual.result.state));
  });
  it('manager deadline preservation: a previously answered card stays consumed across actual kickoff and reloads', () => {
    const fixture = presentation('board'), answered = answer(fixture.before, fixture.item, fixture.option), before = kickoff(answered);
    const after = repeatedReload(before); expect(after.decisions).toEqual(answered.decisions);
    unchanged(after, fixture.item.id, fixture.option); expect(D.pendingDecisions(after)).toEqual([]);
  });
});
