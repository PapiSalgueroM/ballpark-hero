import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCourtLife } from '@/hooks/useCourtLife';
import CourtLifeControls from '@/components/court-life/CourtLifeControls';
import { COURT_TICK_MS, createCourtMatch, neutralCourtInput, stepCourtMatch, simulateCourtMatch, type CourtMatch } from '@/lib/courtLife';
import { COURT_CAREER_SAVE_KEY, applyCareerAction, careerMatchConfig, chooseLifeDecision, completeCareerMatch, createCourtLifeCareer, currentLifeDecision, decodeCourtLifeSave, encodeCourtLifeSave, startCareerMatch, updateCareerMatch, type CourtCareer } from '@/lib/courtLifeCareer';
import { createCourtLifeWorld } from '@/data/courtLifeWorld';
import { recordCompletion } from '@/lib/completions';
import { installArcadePointers } from './arcadePointerFixture';

vi.mock('@/lib/courtLife', async original => {
  const actual = await original<typeof import('@/lib/courtLife')>();
  return { ...actual, stepCourtMatch: vi.fn(actual.stepCourtMatch) };
});
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
let realStep: typeof stepCourtMatch;
let now: number, nextFrame: number, frames: Map<number, FrameRequestCallback>;
let pointers: ReturnType<typeof installArcadePointers>;
let playing: CourtCareer | undefined;
beforeEach(async () => {
  realStep = (await vi.importActual<typeof import('@/lib/courtLife')>('@/lib/courtLife')).stepCourtMatch;
  vi.clearAllMocks(); vi.mocked(stepCourtMatch).mockImplementation(realStep); localStorage.clear();
  now = 100; nextFrame = 0; frames = new Map();
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  pointers = installArcadePointers();
});
afterEach(() => { cleanup(); pointers.restore(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function frame(elapsed = COURT_TICK_MS) {
  act(() => { now += elapsed; const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(now); });
}
function run(ticks: number) { for (let tick = 0; tick < ticks; tick++) frame(); }
function prepare(career: CourtCareer) {
  career = applyCareerAction(applyCareerAction(career, { kind: 'recovery' }), { kind: 'recovery' });
  return chooseLifeDecision(career, currentLifeDecision(career).options.find(option => !option.reason)!.id);
}
function playingCareer() {
  if (!playing) {
    for (let seed = 1; seed < 100; seed++) {
      const career = startCareerMatch(prepare(createCourtLifeCareer({ id: 'control-career', seed, name: 'Case Rowan', crewId: 'copper-owls', archetypeId: 'shooter' })));
      let match = career.activeMatch!.match;
      while (match.phase === 'inbound') match = realStep(match);
      if (match.ball.ownerId === career.playerId) { playing = updateCareerMatch(career, match, true); break; }
    }
  }
  expect(playing, 'A real seeded inbound gives the controlled player possession').toBeDefined();
  return JSON.parse(JSON.stringify(playing)) as CourtCareer;
}
function mount(career = playingCareer()) {
  localStorage.setItem(COURT_CAREER_SAVE_KEY, encodeCourtLifeSave(career));
  const hook = renderHook(({ help }) => useCourtLife(help), { initialProps: { help: false } });
  expect(hook.result.current.career).not.toBeNull();
  act(() => hook.result.current.resume()); frame(0);
  vi.mocked(stepCourtMatch).mockClear();
  return hook;
}
function finishedSeasonMatch() {
  let career = playingCareer();
  for (let round = 0; round < 6; round++) {
    if (round) career = startCareerMatch(prepare(career));
    const match = simulateCourtMatch(careerMatchConfig(career));
    match.controlledPlayerId = career.playerId;
    if (round === 5) return updateCareerMatch(career, match, true);
    career = completeCareerMatch(career, match);
  }
  throw new Error('The actual sixth fixture must finish.');
}
const player = (match: CourtMatch) => match.players.find(row => row.id === match.controlledPlayerId)!;

describe('Court Life controls and actual match persistence', () => {
  it('keeps press and release edges between frames and matches the actual engine result', () => {
    const hook = mount(), initial = hook.result.current.matchRef.current!;
    act(() => { hook.result.current.press('pointer:7', 'primary'); hook.result.current.release('pointer:7'); });
    run(2);
    const expected = realStep(realStep(initial, { ...neutralCourtInput(), shoot: 'press' }), { ...neutralCourtInput(), shoot: 'release' });
    expect(hook.result.current.matchRef.current).toEqual(expected);
    expect(player(expected).stats.attempts).toBe(1);
    expect(vi.mocked(stepCourtMatch).mock.calls.map(call => call[1]?.shoot)).toEqual(['press', 'release']);
  });

  it('clears every held and queued action on Help blur hidden and pause without charging or catch up', () => {
    const hook = mount();
    act(() => { hook.result.current.press('pointer:7', 'primary'); hook.result.current.move('pointer:8', 1, 0); }); run(4);
    expect(player(hook.result.current.matchRef.current!).chargeTicks).toBeGreaterThan(0);
    act(() => hook.result.current.pause());
    const paused = hook.result.current.matchRef.current!;
    expect(player(paused).chargeTicks).toBe(0); expect(hook.result.current.paused).toBe(true);
    run(30); expect(hook.result.current.matchRef.current).toEqual(paused);
    const saved = decodeCourtLifeSave(localStorage.getItem(COURT_CAREER_SAVE_KEY)!);
    expect(saved.status).toBe('valid');
    if (saved.status === 'valid') expect(saved.career.activeMatch).toMatchObject({ paused: true, match: paused });
    act(() => { hook.result.current.resume(); hook.result.current.release('pointer:7'); }); frame(0); run(2);
    expect(player(hook.result.current.matchRef.current!).stats.attempts).toBe(0);
    expect(vi.mocked(stepCourtMatch).mock.calls.at(-1)![1]).toEqual(neutralCourtInput());
    act(() => { hook.result.current.press('pointer:9', 'primary'); hook.result.current.release('pointer:9'); });
    hook.rerender({ help: true }); run(10); expect(hook.result.current.paused).toBe(true);
    hook.rerender({ help: false }); act(() => hook.result.current.resume()); frame(0); run(2);
    expect(player(hook.result.current.matchRef.current!).stats.attempts).toBe(0);
    fireEvent(window, new Event('blur')); expect(hook.result.current.paused).toBe(true);
    act(() => hook.result.current.resume()); frame(0);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true); fireEvent(document, new Event('visibilitychange'));
    const hidden = hook.result.current.matchRef.current; run(100); expect(hook.result.current.matchRef.current).toEqual(hidden);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false); act(() => hook.result.current.resume()); frame(0);
    const tick = hook.result.current.matchRef.current!.tick; frame(10000);
    expect(hook.result.current.matchRef.current!.tick).toBe(tick);
    frame(); expect(hook.result.current.matchRef.current!.tick).toBe(tick + 1);
  });

  it('binds a held finger to its original action through an actual possession change', () => {
    const hook = mount();
    act(() => { hook.result.current.press('pointer:7', 'primary'); hook.result.current.press('pointer:8', 'effort'); });
    const side = player(hook.result.current.matchRef.current!).side;
    for (let ticks = 0; ticks < 500 && hook.result.current.matchRef.current!.possession === side; ticks++) frame();
    expect(hook.result.current.matchRef.current!.possession).not.toBe(side);
    while (hook.result.current.matchRef.current!.phase === 'inbound') frame();
    vi.mocked(stepCourtMatch).mockClear();
    act(() => hook.result.current.press('pointer:8', 'effort')); run(2);
    expect(vi.mocked(stepCourtMatch).mock.calls.at(-1)![1]).toMatchObject({ sprint: true, guard: false, jump: false });
    act(() => hook.result.current.release('pointer:7')); run(1);
    expect(vi.mocked(stepCourtMatch).mock.calls.at(-1)![1]).toMatchObject({ shoot: 'release', jump: false });
    expect(player(hook.result.current.matchRef.current!).stats.attempts).toBe(0);
    act(() => hook.result.current.release('pointer:8')); run(1);
    expect(vi.mocked(stepCourtMatch).mock.calls.at(-1)![1]?.sprint).toBe(false);
  });

  it('maps screen movement and limits keyboard input to the focused court', () => {
    const hook = mount();
    const dom = render(<><canvas data-court-canvas tabIndex={0} /><input aria-label="Player name" /></>);
    const canvas = dom.container.querySelector('canvas')!, initial = hook.result.current.matchRef.current!;
    canvas.focus(); fireEvent.keyDown(canvas, { key: 'ArrowUp' }); run(2); fireEvent.keyUp(canvas, { key: 'ArrowUp' });
    const expected = realStep(realStep(initial, { ...neutralCourtInput(), moveX: -1 }), { ...neutralCourtInput(), moveX: -1 });
    expect(hook.result.current.matchRef.current).toEqual(expected);
    const input = screen.getByRole('textbox', { name: 'Player name' }); input.focus(); fireEvent.keyDown(input, { key: 'j' }); run(2);
    expect(player(hook.result.current.matchRef.current!).chargeTicks).toBe(0);
    canvas.focus(); fireEvent.keyDown(canvas, { key: 'j' }); fireEvent.keyDown(canvas, { key: 'j', repeat: true }); run(3); fireEvent.keyUp(canvas, { key: 'j' }); run(1);
    expect(player(hook.result.current.matchRef.current!).stats.attempts).toBe(1);
  });

  it('cancels pointer charge and never turns release clicks into a second action', () => {
    let game!: ReturnType<typeof useCourtLife>;
    localStorage.setItem(COURT_CAREER_SAVE_KEY, encodeCourtLifeSave(playingCareer()));
    function Surface() { game = useCourtLife(); return <CourtLifeControls {...game} />; }
    const view = render(<Surface />); act(() => game.resume()); frame(0);
    const pad = view.container.querySelector('[data-court-pad]')!;
    vi.spyOn(pad, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 128, bottom: 128, width: 128, height: 128, toJSON: () => ({}) });
    fireEvent.pointerDown(pad, { pointerId: 6, pointerType: 'touch', clientX: 112, clientY: 64 }); run(2);
    expect(vi.mocked(stepCourtMatch).mock.calls.at(-1)![1]).toMatchObject({ moveX: 0, moveY: -1 });
    act(() => game.pause()); act(() => game.resume()); frame(0);
    fireEvent.pointerMove(pad, { pointerId: 6, pointerType: 'touch', clientX: 112, clientY: 64 }); run(1);
    expect(vi.mocked(stepCourtMatch).mock.calls.at(-1)![1]).toMatchObject({ moveX: 0, moveY: 0 });
    const primary = view.container.querySelector('[data-court-control="primary"]')!;
    fireEvent.pointerDown(primary, { pointerId: 7, pointerType: 'touch' }); run(4);
    fireEvent.pointerCancel(primary, { pointerId: 7, pointerType: 'touch' }); run(2);
    expect(player(game!.matchRef.current!).chargeTicks).toBe(0); expect(player(game!.matchRef.current!).stats.attempts).toBe(0);
    fireEvent.pointerDown(primary, { pointerId: 8, pointerType: 'touch' }); run(4);
    fireEvent.pointerUp(primary, { pointerId: 8, pointerType: 'touch' }); run(1);
    expect(player(game!.matchRef.current!).stats.attempts).toBe(1);
    const beforeClick = game.matchRef.current!;
    fireEvent.click(primary, { detail: 1 }); run(1);
    expect(vi.mocked(stepCourtMatch).mock.calls.at(-1)![1]).toEqual(neutralCourtInput());
    expect(game.matchRef.current).toEqual(realStep(beforeClick));
    expect(player(game!.matchRef.current!).z).toBe(0);
    fireEvent.click(primary, { detail: 0 }); run(1);
    expect(vi.mocked(stepCourtMatch).mock.calls.at(-1)![1]?.jump).toBe(true);
  });

  it('restores live play paused and holds invalid raw until explicit replacement', () => {
    const hook = mount(); act(() => hook.result.current.press('pointer:7', 'primary')); run(4);
    act(() => hook.result.current.pause()); const tick = hook.result.current.matchRef.current!.tick; hook.unmount();
    const restored = renderHook(() => useCourtLife()); run(10);
    expect(restored.result.current.paused).toBe(true); expect(restored.result.current.matchRef.current!.tick).toBe(tick);
    expect(player(restored.result.current.matchRef.current!).chargeTicks).toBe(0); restored.unmount();
    for (const raw of ['{broken', '{"version":99}']) {
      localStorage.setItem(COURT_CAREER_SAVE_KEY, raw);
      const invalid = renderHook(() => useCourtLife()); expect(invalid.result.current.recovery?.raw).toBe(raw);
      act(() => invalid.result.current.create({ name: 'New player', crewId: 'copper-owls', archetypeId: 'runner' }));
      expect(localStorage.getItem(COURT_CAREER_SAVE_KEY)).toBe(raw); expect(invalid.result.current.storageError).not.toBeNull();
      act(() => invalid.result.current.replaceRecovery());
      expect(decodeCourtLifeSave(localStorage.getItem(COURT_CAREER_SAVE_KEY)!).status).toBe('valid');
      expect(invalid.result.current.recovery).toBeNull(); invalid.unmount();
    }
  });

  it('keeps actual play running on storage failure and retries its current snapshot', () => {
    const hook = mount();
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    act(() => hook.result.current.retrySave()); expect(hook.result.current.storageError).toEqual(expect.stringContaining('Could not save'));
    const before = hook.result.current.matchRef.current!; run(3);
    expect(hook.result.current.matchRef.current!.tick).toBe(before.tick + 3);
    write.mockRestore(); act(() => hook.result.current.retrySave());
    const saved = decodeCourtLifeSave(localStorage.getItem(COURT_CAREER_SAVE_KEY)!);
    expect(saved.status).toBe('valid'); if (saved.status === 'valid') expect(saved.career.activeMatch!.match.tick).toBe(hook.result.current.matchRef.current!.tick);
    expect(hook.result.current.storageError).toBeNull();
    run(151);
    const regular = decodeCourtLifeSave(localStorage.getItem(COURT_CAREER_SAVE_KEY)!);
    expect(regular.status).toBe('valid');
    if (regular.status === 'valid') expect(regular.career.activeMatch!.match.tick).toBeGreaterThan(before.tick + 3);
  });

  it('records a season transition once and never repays a restored finished season', () => {
    const career = finishedSeasonMatch();
    localStorage.setItem(COURT_CAREER_SAVE_KEY, encodeCourtLifeSave(career));
    const hook = renderHook(() => useCourtLife()); expect(hook.result.current.career).not.toBeNull();
    act(() => hook.result.current.finish());
    expect(hook.result.current.career!.phase).toBe('seasonComplete'); expect(recordCompletion).toHaveBeenCalledTimes(1);
    act(() => hook.result.current.finish()); expect(recordCompletion).toHaveBeenCalledTimes(1); hook.unmount();
    const restored = renderHook(() => useCourtLife()); expect(restored.result.current.career!.phase).toBe('seasonComplete');
    run(5); expect(recordCompletion).toHaveBeenCalledTimes(1);
  }, 30000);

  it('defers the season score until its claim is durable across failure retry and reload', () => {
    const durable = encodeCourtLifeSave(finishedSeasonMatch());
    localStorage.setItem(COURT_CAREER_SAVE_KEY, durable);
    const hook = renderHook(() => useCourtLife());
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    act(() => hook.result.current.finish());
    expect(hook.result.current.career!.phase).toBe('seasonComplete'); expect(hook.result.current.scorePending).toBe(true);
    expect(recordCompletion).not.toHaveBeenCalled(); expect(localStorage.getItem(COURT_CAREER_SAVE_KEY)).toBe(durable);
    act(() => hook.result.current.retrySave()); expect(recordCompletion).not.toHaveBeenCalled();
    act(() => hook.result.current.nextSeason()); expect(hook.result.current.career!.season).toBe(1);
    expect(hook.result.current.storageError).toEqual(expect.stringContaining('Save your finished season first'));
    hook.unmount();
    const restored = renderHook(() => useCourtLife());
    expect(restored.result.current.matchRef.current!.phase).toBe('finished'); expect(recordCompletion).not.toHaveBeenCalled();
    act(() => restored.result.current.finish()); expect(restored.result.current.scorePending).toBe(true);
    write.mockRestore(); act(() => restored.result.current.retrySave());
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(restored.result.current.scorePending).toBe(false);
    const claimed = decodeCourtLifeSave(localStorage.getItem(COURT_CAREER_SAVE_KEY)!);
    expect(claimed.status).toBe('valid'); if (claimed.status === 'valid') expect(claimed.career.chapters.at(-1)!.claimed).toBe(true);
    act(() => restored.result.current.retrySave()); expect(recordCompletion).toHaveBeenCalledTimes(1); restored.unmount();
    const final = renderHook(() => useCourtLife()); run(3); expect(recordCompletion).toHaveBeenCalledTimes(1);
    act(() => final.result.current.nextSeason()); expect(final.result.current.career!.season).toBe(2);
  }, 30000);

  it('keeps the original recovery bytes and download state until replacement saves successfully', () => {
    for (const raw of ['{broken', '{"version":99}']) {
      localStorage.setItem(COURT_CAREER_SAVE_KEY, raw);
      const hook = renderHook(() => useCourtLife());
      act(() => hook.result.current.create({ name: 'Retry replacement', crewId: 'copper-owls', archetypeId: 'runner' }));
      const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
      act(() => hook.result.current.replaceRecovery());
      expect(hook.result.current.recovery?.raw).toBe(raw); expect(localStorage.getItem(COURT_CAREER_SAVE_KEY)).toBe(raw);
      expect(hook.result.current.storageError).toEqual(expect.stringContaining('Could not save'));
      write.mockRestore(); act(() => hook.result.current.prepare({ kind: 'recovery' }));
      expect(localStorage.getItem(COURT_CAREER_SAVE_KEY)).toBe(raw); expect(hook.result.current.recovery?.raw).toBe(raw);
      act(() => hook.result.current.replaceRecovery());
      expect(hook.result.current.recovery).toBeNull(); expect(hook.result.current.storageError).toBeNull();
      const saved = decodeCourtLifeSave(localStorage.getItem(COURT_CAREER_SAVE_KEY)!);
      expect(saved.status).toBe('valid'); if (saved.status === 'valid') expect(saved.career.blocksLeft).toBe(1);
      hook.unmount();
    }
  });

  it('retains the independent seeded engine baseline without hook input', () => {
    const world = createCourtLifeWorld();
    const initial = createCourtMatch({ id: 'baseline', seed: 17, home: world.crews[0], away: world.crews[1] });
    let first = initial, second = initial;
    for (let tick = 0; tick < 900; tick++) { first = realStep(first); second = realStep(second); }
    expect(first).toEqual(second); expect(initial.tick).toBe(0); expect(first.tick).toBe(900);
    expect(first.events.some(event => event.kind === 'shot')).toBe(true);
    expect(first.events.some(event => event.kind === 'pass')).toBe(true);
  });
});
