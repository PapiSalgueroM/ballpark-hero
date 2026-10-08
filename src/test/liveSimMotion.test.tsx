import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCareer, playNextEntry, resumeMatch, startSecondHalf, liveFeed, changeLive, benchFor, isExtraTimeDue, startExtraTime, uclLegsFor } from '@/lib/clubManager';
import type { CareerState, LiveFeedEvent } from '@/lib/clubManager';
import { ACTION_SPAN, BEAT_SPAN, GOAL_MOUTH } from '@/components/pitch-motion/contract';
import type { PitchFigure, PitchInput } from '@/components/pitch-motion/contract';
import type { MotionScene } from '@/components/pitch-motion/motion';
import { pitchBeatAt, pitchPlan, pitchScene, pitchSceneKey } from '@/components/pitch-motion/scene';
import type { PitchBeat, PitchPlaced, PitchPlan } from '@/components/pitch-motion/scene';
const motionPath = process.env.LIVE_MOTION_COMPONENT;
/* Round 1101: the part lives in src/components/pitch-motion now, and `between` is exported there. */
const { actionFrame, between } = motionPath ? await import(/* @vite-ignore */ motionPath) : await import('@/components/pitch-motion/motion');

const viewerPath = process.env.LIVE_MOTION_VIEWER;
const { LiveSimScreen, stagePitchInput } = viewerPath ? await import(/* @vite-ignore */ viewerPath) : await import('@/components/club-manager/LiveSimScreen');
const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const scene = {
  mine: [{ key: 'm0', name: 'Home keeper', keeper: true, x: 50, y: 90 }, { key: 'm9', name: 'Home striker', keeper: false, x: 40, y: 40 }],
  theirs: [{ key: 'o0', name: 'Away keeper', keeper: true, x: 50, y: 10 }, { key: 'o9', name: 'Away striker', keeper: false, x: 60, y: 60 }],
  ball: { x: 40, y: 40 }, holderKey: 'm9',
};

const fixtures = new Map<string, { career: CareerState; event: LiveFeedEvent }>();
const terminalFixtures = new Map<string, { career: CareerState; event: LiveFeedEvent }>();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
  vi.spyOn(Math, 'random').mockImplementation(seeded(603));
  if (!fixtures.size) {
    let career = startCareer('Aston Villa');
    for (let attempt = 0; attempt < 40 && fixtures.size < 3; attempt++) {
      const next = playNextEntry(career); career = next.state;
      if (!career.live) continue;
      const feed = liveFeed(career.live);
      for (const event of feed) {
        if (!['goal', 'save', 'shot'].includes(event.kind) || event.minute < 2 || event.minute > 42 || fixtures.has(event.kind)) continue;
        if (feed.some(other => other !== event && ['goal', 'save', 'shot'].includes(other.kind) && other.minute >= event.minute && other.minute < event.minute + 1.2)) continue;
        const copy = structuredClone(career); copy.live!.minute = event.minute - .2;
        fixtures.set(event.kind, { career: copy, event });
      }
      career = resumeMatch(career).state;
    }
  }
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
async function step(ms: number) { for (let time = 0; time < ms; time += 16) await act(async () => { vi.advanceTimersByTime(Math.min(16, ms - time)); }); }
function mount(career: CareerState) {
  const callbacks = { onSub: vi.fn(), onShape: vi.fn(), onTalk: vi.fn(), onSecondHalf: vi.fn(), onExit: vi.fn(), onStartSecondHalf: vi.fn(), onStartExtraTime: vi.fn(), onChange: vi.fn(), onMark: vi.fn() };
  return { ...render(<LiveSimScreen career={career} live={career.live ?? null} report={null} clubColor="#86bced" {...callbacks} />), callbacks };
}
function findTerminalFixtures() {
  if (terminalFixtures.size === 4) return;
  const base = fixtures.get('goal')!.career;
  // Spread the LCG seeds across its range instead of sampling correlated consecutive seeds.
  // Redraw actual halves with the engine. No event minute, scorer or outcome is invented.
  /* 3000, not 300: Release AH puts the A-League in the modern world (Round 1035, league 23), which moves every
     draw after it, and none of the first 300 seeds ended a second half on a goal at the whistle any more
     (main be3f552d finds all four, the AH tree only three). The search stops at the first of each kind, and
     every assertion below still runs on what it finds. */
  for (let attempt = 0; attempt < 3000 && terminalFixtures.size < 4; attempt++) {
    vi.mocked(Math.random).mockImplementation(seeded(6034500 + attempt * 104729));
    const first = changeLive(base, 0, { kind: 'shape', mentality: 'balanced' })!;
    const second = startSecondHalf(first)!;
    for (const [cap, career] of [[45, first], [90, second]] as const) {
      /* Round 781: the whistle goes at the end of the board, and the terminal
         action is the last one deepest in it, the way the viewer picks it. */
      const board = boardAt(career, cap);
      const feed = liveFeed(career.live!);
      const event = [...feed].reverse().find(e => e.minute === cap && (e.plus ?? 0) === board && ['goal', 'save', 'shot'].includes(e.kind));
      if (!event || !['goal', 'save'].includes(event.kind)) continue;
      /* The clock runs through the board before the wind up, so nothing else
         may still be in the air when the wind up is read: a chance two minutes
         before the whistle would be. */
      if (feed.some(e => e !== event && ['goal', 'save', 'shot'].includes(e.kind) && clockPos(e) === cap + board - 2)) continue;
      const key = `${cap}:${event.kind}`;
      if (terminalFixtures.has(key)) continue;
      const copy = structuredClone(career);
      copy.live!.minute = cap - 1.2;
      terminalFixtures.set(key, { career: copy, event });
    }
  }
  expect([...terminalFixtures.keys()].sort()).toEqual(['45:goal', '45:save', '90:goal', '90:save']);
}
/* Round 670 review: one real Champions League decider of a real walk, its
   second half drawn on many seeds by the engine, kept twice: once level at 90
   (extra time due) and once not. Nothing about either is typed by hand. */
let whistleMaterial: { due: CareerState; notDue: CareerState } | null = null;
function findWhistleMaterial() {
  if (whistleMaterial) return whistleMaterial;
  let pre: CareerState | null = null;
  /* A walk can go out in the groups (the first seed does), so a few are tried. */
  for (let walk = 0; walk < 10 && !pre; walk++) {
    vi.mocked(Math.random).mockImplementation(seeded(670001 + walk));
    let career = startCareer('Real Madrid');
    for (let week = 0; week < 200; week++) {
      const entry = career.calendar[career.week];
      if (entry && entry.type === 'uclKo' && entry.uclRound && career.uclKoRound === entry.uclRound
        && !(entry.uclLeg === 1 && uclLegsFor(career.eraId, entry.uclRound) === 2)) { pre = career; break; }
      const next = playNextEntry(career, { skipHalftime: true });
      if (!next?.state || next.kind === 'seasonOver' || next.state.sacked) break;
      career = next.state;
    }
  }
  expect(pre, 'the walk reached no Champions League decider').not.toBeNull();
  let due: CareerState | null = null;
  let notDue: CareerState | null = null;
  /* 3000, not 400: Release AF's re-baked rosters (Round 1015) moved this Real Madrid knockout, and no seed of the
     first 400 left it level at 90 any more. The search stops at the first of each kind, so this costs nothing when
     the early seeds already find both, and every assertion below still runs on what it finds. */
  for (let k = 0; k < 3000 && (!due || !notDue); k++) {
    vi.mocked(Math.random).mockImplementation(seeded(6700000 + k * 7919));
    const r1 = playNextEntry(pre!);
    if (r1.kind !== 'halftime' || !r1.state.live) continue;
    const second = startSecondHalf(r1.state)!;
    if (isExtraTimeDue(second)) due ??= second; else notDue ??= second;
  }
  expect(due, 'no seed left the decider level at 90').not.toBeNull();
  expect(notDue, 'every seed left the decider level at 90').not.toBeNull();
  due!.live!.minute = 89.4;
  notDue!.live!.minute = 89.4;
  whistleMaterial = { due: due!, notDue: notDue! };
  return whistleMaterial;
}
const stageOf = (container: HTMLElement) => container.querySelector('[data-cm-live-stage]')!.getAttribute('data-cm-live-stage');
const scoreAt = (career: CareerState, minute: number) => ['me', 'opp'].map(side => liveFeed(career.live!)
  .filter(e => e.kind === 'goal' && e.side === side && e.minute <= minute).length).join(' - ');
const readScore = (container: HTMLElement) => container.querySelector('[data-cm-live-score]')!.textContent!.trim();
/* Round 781: a line's place on the clock (45+3 sits at 48 here, inside the
   first half's board), the board a period's clock runs on past its last
   minute, and the score off every goal at or before a clock place. */
const clockPos = (e: { minute: number; plus?: number }) => e.minute + (e.plus ?? 0);
const boardAt = (career: CareerState, cap: number) => (cap === 45 ? career.live!.added?.h1 : career.live!.added?.h2) ?? 0;
const scoreBy = (career: CareerState, pos: number) => ['me', 'opp'].map(side => liveFeed(career.live!)
  .filter(e => e.kind === 'goal' && e.side === side && clockPos(e) <= pos).length).join(' - ');
/* The default speed is 2x: one match minute a second, so a board of b minutes takes b seconds. */
const boardMs = (career: CareerState, cap: number) => boardAt(career, cap) * 1000;
function expectWhistle(mounted: ReturnType<typeof mount>, cap: number, called: boolean) {
  expect(mounted.callbacks.onMark.mock.calls).toEqual(cap === 45 && called ? [[45]] : []);
  expect(mounted.callbacks.onSecondHalf).toHaveBeenCalledTimes(cap === 90 && called ? 1 : 0);
  expect(mounted.callbacks.onStartSecondHalf).not.toHaveBeenCalled();
}

function expectAllocatedIds<T extends { id: string }>(original: T[], expected: T[], actual: T[], kind: 'msg' | 'pq') {
  const originalIds = new Set(original.map(item => item.id));
  expect(actual).toHaveLength(expected.length);
  expect(new Set(actual.map(item => item.id)).size).toBe(actual.length);
  expect(new Set(expected.map(item => item.id)).size).toBe(expected.length);
  for (let index = 0; index < expected.length; index++) {
    const wanted = expected[index], received = actual[index];
    const fresh = !originalIds.has(wanted.id);
    expect(!originalIds.has(received.id)).toBe(fresh);
    if (fresh) {
      const pattern = new RegExp(`^${kind}-(\\d+)-(\\d+)-([1-9]\\d*)$`);
      const expectedId = wanted.id.match(pattern), actualId = received.id.match(pattern);
      expect(expectedId).not.toBeNull(); expect(actualId).not.toBeNull();
      expect(actualId!.slice(1, 3)).toEqual(expectedId!.slice(1, 3));
      expect({ ...received, id: wanted.id }).toEqual(wanted);
      received.id = wanted.id;
    } else expect(received).toEqual(wanted);
  }
}

describe('Live simcast motion', () => {
  it('settlement ID comparison rejects changed payloads, retained IDs and allocator prefixes', () => {
    for (const kind of ['msg', 'pq'] as const) {
      const retained = { id: `${kind}-1-0-1`, text: 'Retained payload' };
      const fresh = { id: `${kind}-1-1-2`, text: 'Fresh payload' };
      const expected = [retained, fresh];
      const actual = [structuredClone(retained), { ...fresh, id: `${kind}-1-1-3` }];
      expectAllocatedIds([retained], expected, structuredClone(actual), kind);
      const controls = [
        [{ ...actual[0], id: `${kind}-1-0-4` }, actual[1]],
        [actual[0], { ...actual[1], id: 'malformed' }],
        [actual[0], { ...actual[1], id: `${kind}-2-1-3` }],
        [actual[0], { ...actual[1], id: `${kind}-1-2-3` }],
        [actual[0], { ...actual[1], text: 'Changed payload' }],
        [actual[1], actual[0]],
        [actual[0]],
        [actual[0], actual[0]],
      ];
      for (const broken of controls) {
        expect(broken).not.toEqual(actual);
        expect(() => expectAllocatedIds([retained], expected, structuredClone(broken), kind)).toThrow();
      }
    }
  });


  it('the committed action puts goals in the correct net and saves at the keeper', () => {
    const before = JSON.stringify(scene);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('Motion must not draw outcomes'); });
    for (const side of ['me', 'opp'] as const) for (const kind of ['goal', 'save', 'shot'] as const) {
      const event = { side, kind, minute: 5, text: side === 'me' ? 'Home striker' : 'Away striker' };
      const start = actionFrame(scene, { event, key: kind, at: 5 }, 0);
      const strike = actionFrame(scene, { event, key: kind, at: 5 }, .2);
      const end = actionFrame(scene, { event, key: kind, at: 5 }, 1.05);
      expect(strike.poses[side === 'me' ? 'm9' : 'o9'].kick).toBeGreaterThan(.3);
      expect(end.ball).not.toEqual(start.ball);
      expect(side === 'me' ? end.ball.y < 12 : end.ball.y > 88).toBe(true);
      if (kind === 'goal') { expect(end.net).toBe(side === 'me' ? 'opp' : 'me'); expect(end.phase).toBe('net'); }
      if (kind === 'save') { expect(end.net).toBeNull(); expect(end.phase).toBe('caught'); expect(end.ball.y).toBe(side === 'me' ? 8 : 92); }
      if (kind === 'shot') { expect(end.net).toBeNull(); expect(Math.abs(end.ball.x - 50)).toBeGreaterThan(12); }
    }
    expect(JSON.stringify(scene)).toBe(before); expect(random).not.toHaveBeenCalled();
  });

  it('actual feed triggers player strikes, ball flight, saves and net contact', async () => {
    expect(fixtures.size).toBe(3);
    for (const kind of ['goal', 'save', 'shot']) {
      const fixture = fixtures.get(kind)!;
      const mounted = mount(structuredClone(fixture.career));
      await step(430);
      const pitch = mounted.container.querySelector('[data-cm-live-pitch]')!;
      expect(pitch.getAttribute('data-cm-motion')).toBe(kind);
      expect(pitch.querySelector('[data-cm-actor-pose="strike"]')).not.toBeNull();
      const ball = pitch.querySelector('[data-cm-ball]')!;
      const before = ball.getAttribute('style');
      await step(300);
      expect(pitch.getAttribute('data-cm-motion-phase')).toBe('flight');
      expect(ball.getAttribute('style')).not.toBe(before);
      expect(pitch.querySelector('[data-cm-actor-pose="dive"]')).not.toBeNull();
      await step(360);
      expect(pitch.getAttribute('data-cm-motion-phase')).toBe(kind === 'goal' ? 'net' : kind === 'save' ? 'caught' : 'wide');
      expect(pitch.querySelectorAll('[data-cm-net="goal"]').length).toBe(kind === 'goal' ? 1 : 0);
      expect(mounted.callbacks.onSecondHalf).not.toHaveBeenCalled();
      cleanup();
    }
  }, 30000);

  it('pause freezes the ball and player pose, and the same player still opens changes', async () => {
    const mounted = mount(structuredClone(fixtures.get('save')!.career));
    await step(730);
    fireEvent.click(mounted.getByRole('button', { name: 'Pause' }));
    const pitch = mounted.container.querySelector('[data-cm-live-pitch]')!;
    const positions = () => [...pitch.querySelectorAll('[data-cm-ball], [data-cm-dot], [data-cm-dot-opp], .cm-pitch-player > g')].map(node => node.getAttribute('style') ?? node.getAttribute('transform'));
    const before = positions();
    await step(600);
    expect(positions()).toEqual(before);
    const player = mounted.container.querySelector<HTMLButtonElement>('[data-cm-dot]')!;
    const id = player.dataset.cmDot;
    fireEvent.click(player);
    expect(mounted.container.querySelector('[data-cm-live-sheet]')?.getAttribute('data-cm-live-sheet')).toBe(id);
    expect(player.getAttribute('aria-label')).toContain('number');
  });

  it('motion leaves committed state and settled results identical', async () => {
    const career = structuredClone(fixtures.get('goal')!.career);
    const before = JSON.stringify(career);
    vi.mocked(Math.random).mockImplementation(seeded(6038));
    const baseline = resumeMatch(structuredClone(career));
    const mounted = mount(career);
    await step(1500);
    expect(JSON.stringify(career) === before, 'Playback must leave every career field unchanged').toBe(true);
    expect(mounted.callbacks.onChange).not.toHaveBeenCalled();
    expect(mounted.callbacks.onSub).not.toHaveBeenCalled();
    vi.mocked(Math.random).mockImplementation(seeded(6038));
    const after = resumeMatch(structuredClone(career));
    // Module counters allocate fresh inbox and press IDs independently of the seeded match RNG.
    // Compare every payload first and only align IDs that did not exist in the input career.
    expectAllocatedIds(career.inbox ?? [], baseline.state.inbox ?? [], after.state.inbox ?? [], 'msg');
    const pending = (state: CareerState) => state.press?.pending ? [state.press.pending] : [];
    expectAllocatedIds(pending(career), pending(baseline.state), pending(after.state), 'pq');
    expect(after).toEqual(baseline);
  });

  it('a substitution during a paused action replaces the clickable player immediately', async () => {
    const career = structuredClone(fixtures.get('save')!.career);
    const mounted = mount(career);
    await step(730);
    fireEvent.click(mounted.getByRole('button', { name: 'Pause' }));
    const off = mounted.container.querySelector<HTMLButtonElement>('[data-cm-dot]')!.dataset.cmDot!;
    const on = benchFor(career, off)[0];
    expect(on).toBeDefined();
    const minute = Number(mounted.container.querySelector('[data-cm-live-minute]')!.getAttribute('data-cm-live-minute'));
    const changed = changeLive(career, minute, { kind: 'sub', outId: off, inId: on.id });
    expect(changed).not.toBeNull();
    mounted.rerender(<LiveSimScreen career={changed!} live={changed!.live!} report={null} clubColor="#86bced" {...mounted.callbacks} />);
    expect(mounted.container.querySelector(`[data-cm-dot="${off}"]`)).toBeNull();
    expect(mounted.container.querySelector(`[data-cm-dot="${on.id}"]`)).not.toBeNull();
  });

  it('speed changes scale action time with the match clock', async () => {
    const phases: string[] = [];
    for (const speed of ['0.5x', '4x']) {
      const mounted = mount(structuredClone(fixtures.get('save')!.career));
      fireEvent.click(mounted.getByRole('button', { name: speed }));
      await step(300);
      phases.push(mounted.container.querySelector('[data-cm-motion-phase]')!.getAttribute('data-cm-motion-phase')!);
      cleanup();
    }
    expect(phases).toEqual(['pass', 'flight']);
  });

  it('reduced motion shows the committed catch immediately without animated poses', async () => {
    const original = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...original(query), matches: true }));
    const mounted = mount(structuredClone(fixtures.get('save')!.career));
    await step(430);
    const pitch = mounted.container.querySelector('[data-cm-motion-phase]')!;
    expect(pitch.getAttribute('data-cm-motion-phase')).toBe('caught');
    const ball = pitch.querySelector('[data-cm-ball]')!.getAttribute('style');
    await step(200);
    expect(pitch.querySelector('[data-cm-ball]')!.getAttribute('style')).toBe(ball);
  });

  it.each([45, 90].flatMap(cap => ['goal', 'save'].flatMap(kind => [false, true].map(reduced => ({ cap, kind, reduced })))))
  ('terminal goal and save contact precede the unchanged whistle and score ($cap $kind reduced=$reduced)', async ({ cap, kind, reduced }) => {
    findTerminalFixtures();
    const original = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...original(query), matches: reduced }));
    const fixture = terminalFixtures.get(`${cap}:${kind}`)!;
    const career = structuredClone(fixture.career);
    const before = JSON.stringify(career);
    const board = boardAt(career, cap);
    const mounted = mount(career);
    /* Round 781: the clock runs on through the board first, to 1.2 minutes before its end. */
    await step(boardMs(career, cap));
    await step(160);
    expect(mounted.container.querySelector('[data-cm-motion]')!.getAttribute('data-cm-motion')).toBe('pass');
    await step(600);
    const pitch = mounted.container.querySelector('[data-cm-live-pitch]')!;
    const finalPhase = fixture.event.kind === 'goal' ? 'net' : 'caught';
    expect(pitch.getAttribute('data-cm-motion')).toBe(fixture.event.kind);
    expect(pitch.getAttribute('data-cm-motion-phase')).toBe(reduced ? finalPhase : 'flight');
    await step(240);
    expect(pitch.getAttribute('data-cm-motion-phase')).toBe(finalPhase);
    expect(readScore(mounted.container)).toBe(scoreBy(career, cap + board - 1));
    expect(mounted.container.textContent).not.toContain(`${cap}+${board}'`);
    expectWhistle(mounted, cap, false);
    await step(200);
    expectWhistle(mounted, cap, false);
    // The next frame crosses the cap even when float addition lands just below it.
    await step(48);
    expectWhistle(mounted, cap, true);
    expect(readScore(mounted.container)).toBe(scoreAt(career, cap));
    expect(mounted.container.querySelector('[data-cm-motion]')?.getAttribute('data-cm-motion') ?? 'pass').toBe('pass');
    await step(1500);
    expectWhistle(mounted, cap, true);
    expect(JSON.stringify(career)).toBe(before);
  }, 30000);

  it('terminal resume shows contact and Skip keeps immediate exactly-once whistle callbacks', async () => {
    findTerminalFixtures();
    const original = window.matchMedia;
    let reduced = false;
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...original(query), matches: reduced }));
    for (reduced of [false, true]) for (const fixture of terminalFixtures.values()) {
      const career = structuredClone(fixture.career);
      const cap = fixture.event.minute;
      const board = boardAt(career, cap);
      career.live!.minute = cap - .15;
      const mounted = mount(career);
      /* Round 781: a save never stands inside a board (the mark is capped at
         the period's last minute), so the resume runs through the board to
         0.15 minutes before its end, inside the terminal wind up. */
      await step(boardMs(career, cap));
      expect(mounted.container.querySelector('[data-cm-motion-phase]')!.getAttribute('data-cm-motion-phase'))
        .toBe(fixture.event.kind === 'goal' ? 'net' : 'caught');
      expect(readScore(mounted.container)).toBe(scoreBy(career, cap + board - 1));
      expectWhistle(mounted, cap, false);
      fireEvent.click(mounted.getByRole('button', { name: /Skip/ }));
      expectWhistle(mounted, cap, true);
      expect(readScore(mounted.container)).toBe(scoreAt(career, cap));
      await step(1500);
      expectWhistle(mounted, cap, true);
      cleanup();
    }
    /* Round 781 review: 120 seconds, not 30. Each of the eight mounts now
       walks its whole board frame by frame before the wind up (two to eight
       match minutes, a second each), where it used to start inside the wind
       up, so this test does three to five times the stepping it did. It took
       5 to 13 seconds on a quiet machine and went past 30 when other lanes
       were compiling, with nothing wrong in the viewer. */
  }, 120000);

  it('a tactics redraw cancels a terminal action that is no longer committed', async () => {
    findTerminalFixtures();
    const career = structuredClone(terminalFixtures.get('45:goal')!.career);
    const board = boardAt(career, 45);
    career.live!.minute = 44.2;
    const mounted = mount(career);
    /* Round 781: on through the board to 0.8 minutes before its end, inside the wind up. */
    await step(boardMs(career, 45));
    expect(mounted.container.querySelector('[data-cm-motion]')!.getAttribute('data-cm-motion')).toBe('goal');
    let changed: CareerState | null = null;
    for (let attempt = 1; attempt <= 30; attempt++) {
      vi.mocked(Math.random).mockImplementation(seeded(6034400 + attempt));
      /* Filed where the clock reads, 45 plus one less than the board; the rest of the board is drawn again. */
      const next = changeLive(career, 45, { kind: 'shape', mentality: 'defensive' }, board - 1)!;
      if (boardAt(next, 45) === board && !liveFeed(next.live!).some(e => e.minute === 45 && (e.plus ?? 0) === board && ['goal', 'save', 'shot'].includes(e.kind))) { changed = next; break; }
    }
    expect(changed).not.toBeNull();
    mounted.rerender(<LiveSimScreen career={changed!} live={changed!.live!} report={null} clubColor="#86bced" {...mounted.callbacks} />);
    expect(mounted.container.querySelector('[data-cm-motion]')!.getAttribute('data-cm-motion')).toBe('pass');
    expectWhistle(mounted, 45, false);
  });

  /* Round 670 review: the viewer decided extra time off the career it was
     rendered with, and the engine drew it off the latest save. A change
     landing at 89 or 90 can still be on its way when the clock gets there,
     so the two could disagree: thirty empty minutes badged ET before a report
     with no extra time, or no extra time watched when the save had it. The
     viewer now asks once at 90 and reads the answer off the save. */
  it('the ninetieth minute asks the latest save: refused means full time, never thirty empty minutes', async () => {
    const { due } = findWhistleMaterial();
    const career = structuredClone(due);
    expect(isExtraTimeDue(career), 'the career this render is given is level at 90').toBe(true);
    /* onStartExtraTime is a bare spy: the latest save said no, as it does when a change moved the score on its way. */
    const mounted = mount(career);
    /* Round 781: the question is asked at the end of the second half's board. */
    await step(1200 + boardMs(career, 90));
    expect(mounted.callbacks.onStartExtraTime).toHaveBeenCalledTimes(1);
    expect(mounted.callbacks.onSecondHalf).toHaveBeenCalledTimes(1);
    expect(stageOf(mounted.container)).not.toBe('extra');
    expect(mounted.container.textContent).not.toMatch(/ET \d+'/);
  }, 30000);

  it('the ninetieth minute asks the latest save: extra time drawn there is played, whatever this render was given', async () => {
    const { due, notDue } = findWhistleMaterial();
    const drawn = startExtraTime(structuredClone(due))!;
    expect(drawn.live!.et).toEqual({ from: 90, to: 120 });
    const start = structuredClone(notDue);
    expect(isExtraTimeDue(start), 'the career this render is given is not level at 90').toBe(false);
    const callbacks = { onSub: vi.fn(), onShape: vi.fn(), onTalk: vi.fn(), onSecondHalf: vi.fn(), onExit: vi.fn(), onStartSecondHalf: vi.fn(), onStartExtraTime: vi.fn(), onChange: vi.fn(), onMark: vi.fn() };
    /* The page: the latest save is the one with extra time drawn on it. */
    function Page() {
      const [career, setCareer] = useState<CareerState>(start);
      return <LiveSimScreen career={career} live={career.live ?? null} report={null} clubColor="#86bced" {...callbacks}
        onStartExtraTime={() => { callbacks.onStartExtraTime(); setCareer(() => drawn); }} />;
    }
    const mounted = render(<Page />);
    /* Round 781: asked at the end of this render's board; the latest save is
       another draw of the decider and its board can run longer, and the clock
       follows the save it was handed to the end of that board. */
    await step(1200 + Math.max(boardMs(start, 90), boardMs(drawn, 90)));
    expect(callbacks.onStartExtraTime).toHaveBeenCalledTimes(1);
    expect(callbacks.onSecondHalf).not.toHaveBeenCalled();
    expect(stageOf(mounted.container)).toBe('extra');
    expect(mounted.container.textContent).toMatch(/ET \d+'/);
    fireEvent.click(mounted.getByRole('button', { name: /Skip/ }));
    await step(200);
    expect(callbacks.onSecondHalf).toHaveBeenCalledTimes(1);
  }, 30000);

  /* Round 670 polish: the banner at 90 says what is true. On a second leg the
     night's score is often not level (0-3 after a 3-0 first leg), so "Level
     after 90 minutes" beside it was false: it is the aggregate that is level,
     and the banner says so and gives it. The aggregate is worked out here from
     the bracket's first leg and the goals the feed has by 90. */
  it('the extra time banner says what is true: a second leg is level on aggregate', async () => {
    const { due } = findWhistleMaterial();
    const entry = due.calendar[due.live!.week];
    expect(entry.uclLeg === 2 && uclLegsFor(due.eraId, entry.uclRound!) === 2, 'the decider this walk reached is a second leg').toBe(true);
    const tie = due.uclBracket!.find(t => t.round === entry.uclRound && t.mine)!;
    const iAmHome = tie.home === due.clubName;
    const [mine90, opp90] = scoreAt(due, 90).split(' - ').map(Number);
    const aggMine = (iAmHome ? tie.leg1!.homeGoals : tie.leg1!.awayGoals) + mine90;
    const aggTheirs = (iAmHome ? tie.leg1!.awayGoals : tie.leg1!.homeGoals) + opp90;
    expect(aggMine, 'level on aggregate at 90').toBe(aggTheirs);
    /* This walk's decider was 3-1 on the night after a 1-3 first leg when this
       was written (2026-09-28): the case the old banner got wrong. */
    expect(mine90, 'the night itself is not level').not.toBe(opp90);
    const drawn = startExtraTime(structuredClone(due))!;
    const callbacks = { onSub: vi.fn(), onShape: vi.fn(), onTalk: vi.fn(), onSecondHalf: vi.fn(), onExit: vi.fn(), onStartSecondHalf: vi.fn(), onStartExtraTime: vi.fn(), onChange: vi.fn(), onMark: vi.fn() };
    function Page() {
      const [career, setCareer] = useState<CareerState>(() => structuredClone(due));
      return <LiveSimScreen career={career} live={career.live ?? null} report={null} clubColor="#86bced" {...callbacks}
        onStartExtraTime={() => { callbacks.onStartExtraTime(); setCareer(() => drawn); }} />;
    }
    const mounted = render(<Page />);
    await step(1200 + boardMs(due, 90));
    expect(stageOf(mounted.container)).toBe('extra');
    const text = mounted.container.textContent!;
    expect(text).toContain(`Level ${aggMine}-${aggTheirs} on aggregate`);
    expect(text).not.toContain('Level after 90 minutes');
  }, 30000);

  /* Round 781: the clock runs on into the board and says so, LIVE 90+1' and
     never 91', and on a second leg the line under the score is the tie as it
     stands at that point of the board: the first leg plus every goal the
     clock has reached. The material is the same real decider as above. */
  it('the clock runs into the board as 90 plus, with the running aggregate under the score', async () => {
    const { notDue } = findWhistleMaterial();
    const career = structuredClone(notDue);
    const entry = career.calendar[career.live!.week];
    expect(entry.uclLeg === 2 && uclLegsFor(career.eraId, entry.uclRound!) === 2, 'the decider this walk reached is a second leg').toBe(true);
    expect(boardAt(career, 90), 'the second half board').toBeGreaterThanOrEqual(2);
    const mounted = mount(career);
    const root = () => mounted.container.querySelector('[data-cm-live-stage]')!;
    for (let t = 0; t < 8000 && root().getAttribute('data-cm-live-plus') !== '1'; t += 100) await step(100);
    expect(root().getAttribute('data-cm-live-stage')).toBe('second');
    expect(root().getAttribute('data-cm-live-minute')).toBe('90');
    expect(root().getAttribute('data-cm-live-plus')).toBe('1');
    const text = mounted.container.textContent!;
    expect(text).toContain("LIVE 90+1'");
    expect(text).not.toContain("LIVE 91'");
    const tie = career.uclBracket!.find(t => t.round === entry.uclRound && t.mine)!;
    const iAmHome = tie.home === career.clubName;
    const [mine, opp] = scoreBy(career, 91).split(' - ').map(Number);
    const agg = `${(iAmHome ? tie.leg1!.homeGoals : tie.leg1!.awayGoals) + mine}-${(iAmHome ? tie.leg1!.awayGoals : tie.leg1!.homeGoals) + opp}`;
    expect(mounted.container.querySelector('[data-cm-live-agg]')!.getAttribute('data-cm-live-agg')).toBe(agg);
  }, 30000);

  /* Round 781 review: the goal banner is the commentary the player actually
     reads, and nothing held its label: printing the bare minute left every
     gate green. A real second half, drawn by the engine on its own seeds,
     with a goal of mine inside the board (not the last thing in it, and
     nothing else loud at the same point of the clock), is walked to that
     goal, and the banner says 90+N'. */
  it('a goal in the board is announced with its plus, GOAL! ... 90+N', async () => {
    const { notDue } = findWhistleMaterial();
    /* Back to the restart, so a change there redraws the whole second half, board and all. */
    const restart = structuredClone(notDue);
    restart.live!.minute = 46;
    let career: CareerState | null = null;
    let goal: LiveFeedEvent | null = null;
    for (let k = 0; k < 400 && !career; k++) {
      vi.mocked(Math.random).mockImplementation(seeded(7810000 + k * 7919));
      const second = changeLive(restart, 46, { kind: 'shape', mentality: 'balanced' });
      if (!second?.live) continue;
      const board = boardAt(second, 90);
      const feed = liveFeed(second.live);
      const loud = ['goal', 'yellow', 'red', 'injury', 'sub'];
      const g = feed.find(e => e.kind === 'goal' && e.side === 'me' && e.minute === 90 && (e.plus ?? 0) >= 1 && (e.plus ?? 0) < board
        && !feed.some(o => o !== e && loud.includes(o.kind) && clockPos(o) === clockPos(e)));
      if (!g) continue;
      career = structuredClone(second);
      career.live!.minute = 89.4;
      goal = g;
    }
    expect(goal, 'no seed put a goal of mine inside the second half board').not.toBeNull();
    const plus = goal!.plus!;
    const mounted = mount(career!);
    const root = () => mounted.container.querySelector('[data-cm-live-stage]')!;
    for (let t = 0; t < 12000 && root().getAttribute('data-cm-live-plus') !== String(plus); t += 100) await step(100);
    expect(root().getAttribute('data-cm-live-plus')).toBe(String(plus));
    const banner = [...mounted.container.querySelectorAll('div')].find(d => d.childElementCount > 0 && (d.textContent ?? '').startsWith('GOAL!') && d.className.includes('truncate'));
    expect(banner, 'no goal banner on screen at the goal').toBeTruthy();
    expect(banner!.textContent).toContain(goal!.text);
    expect(banner!.textContent!.endsWith(` 90+${plus}'`), `the banner reads "${banner!.textContent}"`).toBe(true);
  }, 30000);

  /* Round 781 review: extra time has its own board at 120, and the clock in
     it read only through minuteLabel with nothing holding the call: "ET 120'"
     all through it left every gate green. Extra time drawn by the engine on a
     real level decider, with a board of two or more, is walked into it. */
  it('the extra time clock runs into its own board as ET 120 plus', async () => {
    const { due } = findWhistleMaterial();
    let drawn: CareerState | null = null;
    for (let k = 0; k < 200 && !drawn; k++) {
      vi.mocked(Math.random).mockImplementation(seeded(7820000 + k * 104729));
      const et = startExtraTime(structuredClone(due));
      if (et?.live?.et && (et.live.added?.et ?? 0) >= 2) drawn = et;
    }
    expect(drawn, 'no seed gave extra time a board of two or more').not.toBeNull();
    drawn!.live!.minute = 119.4;
    const mounted = mount(drawn!);
    const root = () => mounted.container.querySelector('[data-cm-live-stage]')!;
    expect(root().getAttribute('data-cm-live-stage')).toBe('extra');
    for (let t = 0; t < 8000 && root().getAttribute('data-cm-live-plus') !== '1'; t += 100) await step(100);
    expect(root().getAttribute('data-cm-live-minute')).toBe('120');
    expect(root().getAttribute('data-cm-live-plus')).toBe('1');
    const text = mounted.container.textContent!;
    expect(text).toContain("ET 120+1'");
    expect(text).not.toContain("ET 121'");
    expect(text).not.toContain("ET 120'");
  }, 30000);
});

/* ─────────────────────────────────────────────────────────────────────────────────────────────
   Round 1101: the pitch part on real feeds.

   Five seeds, each a different club in a different league, twenty matches each through the engine's
   own calls with Math.random seeded: 200 half feeds. Every one becomes a PitchInput through
   stagePitchInput, the same function the viewer calls, and is replayed WITHOUT React: every stretch
   of the plan as a scene, five tween samples between consecutive scenes, and actionFrame at 22
   instants for every chance the plan stages. One pass counts everything R1 to R6 read.

   THE BASELINE ARM is the Round 504 picture, copied here and nowhere else: each side its whole
   formation chart pushed up or dropped back by a constant. It is run on the same stretches. */
const R504_PUSH = { attack: 20, midfield: 17, defence: 14, keeper: 4 } as const;
const R504_BACK = { attack: 9, midfield: 8, defence: 5, keeper: 0 } as const;
function round504Side(figures: PitchFigure[], side: 'me' | 'opp', hasBall: boolean, ballX: number | null): PitchPlaced[] {
  return figures.map(f => {
    let x = side === 'me' ? f.slot.x : 100 - f.slot.x;
    let y = side === 'me' ? f.slot.y : 100 - f.slot.y;
    const dir = side === 'me' ? -1 : 1;
    if (hasBall) {
      y += dir * R504_PUSH[f.line];
      if (f.line === 'keeper') y = side === 'me' ? Math.max(y, 68) : Math.min(y, 32);
      else y = side === 'me' ? Math.max(y, 7) : Math.min(y, 93);
    } else {
      y -= dir * R504_BACK[f.line];
      x = 50 + (x - 50) * 0.86;
    }
    if (ballX !== null && f.line !== 'keeper' && Math.abs(f.slot.x - 50) >= 22) x += (ballX - x) * 0.18;
    return { key: f.key, name: f.name, keeper: f.line === 'keeper', line: f.line, x: Math.max(3, Math.min(97, x)), y: Math.max(3, Math.min(97, y)) };
  });
}
function round504Scene(input: PitchInput, beat: PitchBeat) {
  const mineHasIt = beat.side === 'me';
  const sides = (ballX: number | null) => ({ mine: round504Side(input.mine, 'me', mineHasIt, ballX), theirs: round504Side(input.theirs, 'opp', !mineHasIt, ballX) });
  const ballOf = (s: { mine: PitchPlaced[]; theirs: PitchPlaced[] }) => {
    const holder = (mineHasIt ? s.mine : s.theirs).find(p => p.key === beat.carrier);
    return holder ? { x: Math.max(3, Math.min(97, holder.x + 1.6)), y: Math.max(3, Math.min(97, holder.y + (mineHasIt ? -2.2 : 2.2))) } : { x: 50, y: 50 };
  };
  const placed = sides(ballOf(sides(null)).x);
  return { ...placed, ball: ballOf(placed) };
}

type Arm = 'new' | 'r504';
interface Line { n: number; sx: number; sy: number; sxx: number; sxy: number }
const line = (): Line => ({ n: 0, sx: 0, sy: 0, sxx: 0, sxy: 0 });
const feedLine = (l: Line, x: number, y: number) => { l.n++; l.sx += x; l.sy += y; l.sxx += x * x; l.sxy += x * y; };
/** Least squares slope of y on x; 0, and said so, when x or y never varies. */
const slope = (l: Line) => { const d = l.n * l.sxx - l.sx * l.sx; return l.n < 2 || Math.abs(d) < 1e-9 ? 0 : (l.n * l.sxy - l.sx * l.sy) / d; };
interface SeedTally {
  club: string; matches: number; halves: number; frames: number;
  /* R1 */ goals: number; goalsWithNetFrame: number; mouthFrames: number; mouthOffenders: number;
  /* R2 */ scenes: number; sceneOverlaps: Record<Arm, number>; tweenRuns: number; actionRuns: number; examples: string[];
  /* R3 */ kickBeats: number; kickSum: Record<Arm, number>; kickCount: Record<Arm, number>; kickOffenders: number;
  /* R4 */ follow: Record<Arm, { withBall: Line; without: Line }>;
  /* R6 */ chances: number; holderOffenders: number; steadyOffenders: number; followOffenders: number; underKickoff: number; cutShort: number; lastKick: number;
}
const tally = (club: string): SeedTally => ({
  club, matches: 0, halves: 0, frames: 0, goals: 0, goalsWithNetFrame: 0, mouthFrames: 0, mouthOffenders: 0,
  scenes: 0, sceneOverlaps: { new: 0, r504: 0 }, tweenRuns: 0, actionRuns: 0, examples: [],
  kickBeats: 0, kickSum: { new: 0, r504: 0 }, kickCount: { new: 0, r504: 0 }, kickOffenders: 0,
  follow: { new: { withBall: line(), without: line() }, r504: { withBall: line(), without: line() } },
  chances: 0, holderOffenders: 0, steadyOffenders: 0, followOffenders: 0, underKickoff: 0, cutShort: 0, lastKick: 0,
});
type Sides = { mine: PitchPlaced[]; theirs: PitchPlaced[] };
const inMouth = (ball: { x: number; y: number }) => ball.x >= GOAL_MOUTH.x0 && ball.x <= GOAL_MOUTH.x1 && (ball.y < GOAL_MOUTH.depth || ball.y > 100 - GOAL_MOUTH.depth);
/** Pairs of one side standing on each other: closer than 2.5 both ways. Returned as keys, so a run can be followed. */
function overlapping(s: Sides): string[] {
  const out: string[] = [];
  for (const [tag, list] of [['m', s.mine], ['o', s.theirs]] as const) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      if (Math.abs(list[i].x - list[j].x) < 2.5 && Math.abs(list[i].y - list[j].y) < 2.5) out.push(`${tag}:${list[i].key}:${list[j].key}`);
    }
  }
  return out;
}
/** How many pairs overlap in two samples running. */
function runs(samples: string[][]): number {
  let count = 0;
  for (let i = 1; i < samples.length; i++) for (const pair of samples[i]) if (samples[i - 1].includes(pair)) count++;
  return count;
}

function replayHalf(t: SeedTally, input: PitchInput) {
  const plan: PitchPlan = pitchPlan(input);
  t.halves++;
  let previous: MotionScene<PitchPlaced> | null = null;
  for (const beat of plan.entries) {
    const scene: MotionScene<PitchPlaced> = pitchScene(plan, beat.start);
    const old = round504Scene(input, beat);
    t.frames++; t.scenes++;
    if (inMouth(scene.ball)) { t.mouthFrames++; t.mouthOffenders++; }
    t.sceneOverlaps.new += overlapping(scene).length;
    t.sceneOverlaps.r504 += overlapping(old).length;
    if (previous) {
      const samples: string[][] = [];
      for (const k of [.2, .4, .6, .8, 1]) {
        const mid: MotionScene<PitchPlaced> = between(previous, scene, k);
        t.frames++;
        if (inMouth(mid.ball)) { t.mouthFrames++; t.mouthOffenders++; }
        samples.push(overlapping(mid));
      }
      const crossed = runs(samples);
      t.tweenRuns += crossed;
      if (crossed && t.examples.length < 4) t.examples.push(`tween into ${beat.via} ${beat.state} at ${beat.start.toFixed(2)} (ball with ${beat.side} ${beat.carrier}): ${samples.map(list => list.join(",") || "-").join(" ")}`);
    }
    if (beat.state === 'kickoff') {
      t.kickBeats++;
      for (const [arm, s] of [['new', scene], ['r504', old]] as const) {
        for (const [attackers, defenders] of [[s.mine, s.theirs], [s.theirs, s.mine]] as const) {
          const keeper = defenders.find(p => p.keeper);
          if (!keeper) continue;
          for (const p of attackers) if (p.line === 'attack') { t.kickSum[arm] += Math.hypot(p.x - keeper.x, p.y - keeper.y); t.kickCount[arm]++; }
        }
      }
      /* The hard rule, which needs no statistic: all twenty outfield men in their own half, and nobody
         of the side not kicking off within 9 of the centre spot. */
      for (const p of scene.mine) if (!p.keeper && p.y < 50 - 1e-9) t.kickOffenders++;
      for (const p of scene.theirs) if (!p.keeper && p.y > 50 + 1e-9) t.kickOffenders++;
      for (const p of beat.side === 'me' ? scene.theirs : scene.mine) if (Math.hypot(p.x - 50, p.y - 50) < 9) t.kickOffenders++;
    }
    if (beat.state === 'open' && beat.via === 'grid') {
      for (const [arm, s] of [['new', scene], ['r504', old]] as const) {
        for (const side of ['me', 'opp'] as const) {
          const list = (side === 'me' ? s.mine : s.theirs).filter(p => !p.keeper);
          if (!list.length) continue;
          const own = (y: number) => (side === 'me' ? y : 100 - y);
          const centroid = list.reduce((sum, p) => sum + own(p.y), 0) / list.length;
          feedLine(beat.side === side ? t.follow[arm].withBall : t.follow[arm].without, own(s.ball.y), centroid);
        }
      }
    }
    previous = scene;
  }
  plan.actions.forEach((a, n) => {
    t.chances++;
    const action = { event: a.event, key: `chance${n}`, at: a.at };
    /* The frame the hook captures is the one on screen just before the line fires. */
    const just = a.at - .05;
    const captured: MotionScene<PitchPlaced> = pitchScene(plan, just);
    const underKickoff = pitchBeatAt(plan, just).state === 'kickoff';
    const next = plan.actions[n + 1];
    const cutShort = !!next && next.at - BEAT_SPAN < a.at + ACTION_SPAN - 1e-9;
    if (underKickoff) t.underKickoff++;
    else {
      const attackers = a.event.side === 'me' ? captured.mine : captured.theirs;
      const holder = attackers.find(p => p.key === captured.holderKey);
      const picked = actionFrame(captured, action, 0).holderKey;
      if (!holder || picked !== holder.key || Math.hypot(captured.ball.x - holder.x, captured.ball.y - holder.y) > 3) t.holderOffenders++;
    }
    if (cutShort) t.cutShort++;
    else if (!underKickoff && pitchSceneKey(plan, just) !== pitchSceneKey(plan, a.at + ACTION_SPAN - .01)) t.steadyOffenders++;
    const after = a.at + ACTION_SPAN;
    if (after >= input.span.to - 1e-9) t.lastKick++;
    else if (!cutShort) {
      const follow = pitchBeatAt(plan, after + 1e-6);
      const wanted = a.event.kind === 'goal' ? 'kickoff' : a.event.kind === 'shot' ? 'goalkick' : 'keeper';
      if (follow.state !== wanted || Math.abs(follow.start - after) > 1e-6) t.followOffenders++;
    }
    if (a.event.kind === 'goal') t.goals++;
    const samples: string[][] = [];
    let net = false;
    for (let s = 0; s < 22; s++) {
      const frame = actionFrame(captured, action, s * .05);
      t.frames++;
      if (inMouth(frame.ball)) {
        t.mouthFrames++;
        if (a.event.kind !== 'goal' || (frame.phase !== 'flight' && frame.phase !== 'net')) t.mouthOffenders++;
        else if (frame.phase === 'net') net = true;
      }
      samples.push(overlapping(frame));
    }
    if (a.event.kind === 'goal' && net) t.goalsWithNetFrame++;
    const found = runs(samples);
    t.actionRuns += found;
    if (found && t.examples.length < 4) {
      const at = samples.findIndex((list, i) => i > 0 && list.some(pair => samples[i - 1].includes(pair)));
      t.examples.push(`${a.event.kind} by ${a.event.side} at ${a.at}${a.event.penalty ? " penalty" : ""}${a.event.freeKick ? " free kick" : ""}, sample ${at}: ${samples[at].join(" ")}`);
    }
  });
}

const FIVE_CLUBS = [
  { seed: 110101, club: 'Aston Villa', league: 'Premier League' },
  { seed: 110102, club: 'Real Madrid', league: 'La Liga' },
  { seed: 110103, club: 'Lyon', league: 'Ligue 1' },
  { seed: 110104, club: 'Ajax', league: 'Eredivisie' },
  { seed: 110105, club: 'Celtic', league: 'Scottish Premiership' },
] as const;
const MATCHES_EACH = 20;
const hash32 = (text: string) => { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };
/** Twenty matches of one club through the engine's own calls. `onHalf` runs between the engine calls. */
function walkClub(seed: number, club: string, onHalf: ((career: CareerState, stage: 'first' | 'second') => void) | null) {
  const draw = seeded(seed);
  let replaying = false;
  let draws = 0;
  vi.mocked(Math.random).mockImplementation(() => { if (replaying) draws++; return draw(); });
  const half = (career: CareerState, stage: 'first' | 'second') => { if (!onHalf) return; replaying = true; try { onHalf(career, stage); } finally { replaying = false; } };
  let career = startCareer(club);
  const lines: string[] = [];
  let matches = 0;
  for (let guard = 0; guard < 400 && matches < MATCHES_EACH; guard++) {
    const next = playNextEntry(career);
    career = next.state;
    if (next.kind === 'seasonOver' || career.sacked) break;
    if (next.kind !== 'halftime' || !career.live) continue;
    half(career, 'first');
    const second = startSecondHalf(career)!;
    half(second, 'second');
    const done = resumeMatch(second);
    career = done.state;
    matches++;
    /* Score, scorers, stats, ratings and cards are all on the report; inbox and press ids are not, on
       purpose: a module counter allocates them (expectAllocatedIds above explains). */
    lines.push(JSON.stringify([done.report, career.table.find(row => row.club === club)]));
  }
  return { matches, digest: hash32(lines.join('\n')), draws };
}

interface Material { seeds: SeedTally[]; digest: string; draws: number; inputs: number }
let material: Material | null = null;
/** The engine with the full replay of each half run between every engine call. Built once. */
function buildMaterial(): Material {
  if (material) return material;
  const seeds: SeedTally[] = [];
  const digests: string[] = [];
  let draws = 0;
  let inputs = 0;
  for (const { seed, club } of FIVE_CLUBS) {
    const t = tally(club);
    const walked = walkClub(seed, club, (career, stage) => {
      const cap = stage === 'first' ? 45 : 90;
      const input: PitchInput = stagePitchInput(career, career.live!, null, stage, stage === 'first' ? 0 : 46, 0, cap + boardAt(career, cap));
      inputs++;
      replayHalf(t, input);
    });
    t.matches = walked.matches;
    draws += walked.draws;
    digests.push(walked.digest);
    seeds.push(t);
  }
  material = { seeds, digest: digests.join(' '), draws, inputs };
  return material;
}
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const spread = (values: number[]) => Math.max(...values) - Math.min(...values);
const fixed = (values: number[], places = 2) => values.map(v => v.toFixed(places)).join(' ');

/* The floors, committed from measured headroom (five seeds, 2026-10-07, both arms; the numbers are in
   each comment). The same run's baseline arm stays beside each as the separation check. */
/** R3. Mean distance of an attack line from the opposing keeper at a kick off, per seed.
 *  Measured over 390 kick off beats: new 53.66 54.16 53.99 53.92 53.96, Round 504 17.87 18.45 18.09 18.13 18.16.
 *  The floor is 45 and not the lowest seed less two spreads (52.66): what moves this number is the formations
 *  a data release hands the engine, not chance. Two central strikers and nobody wide would read about 50 on
 *  healthy code (45 for the side kicking off, 54 for the other), so 52.66 would be a rule about formations.
 *  45 is the geometry's own lower bound, 8.7 under the lowest seed, and still 25 clear of the old picture
 *  (19.6 is its highest seed plus two spreads). The `kickoff` control reads about 36. */
const R3_FLOOR = 45;
/** R4. Least squares slope of a side's outfield centroid on the ball, along the pitch, in open play; the
 *  lower of the side with the ball and the side without it, per seed.
 *  Measured over 9,720 open beats: new 0.415 0.424 0.414 0.419 0.423 (with the ball 0.528 to 0.542, without
 *  it 0.414 to 0.424), Round 504 0.002 0.001 0.002 0.004 0.003 (a block that never follows the ball).
 *  The floor is 0.30: 0.114 under the lowest seed, which is eleven spreads, and thirty times the old
 *  picture's highest seed plus two spreads (0.010). */
const R4_FLOOR = 0.3;
const LONG = 300000;

describe('The pitch part on real feeds', () => {
  it('the material is 200 half feeds from five clubs in five leagues', () => {
    const m = buildMaterial();
    console.log(`[1101 material] ${m.seeds.map(t => `${t.club} ${t.matches} matches ${t.halves} halves`).join(', ')}; frames replayed ${sum(m.seeds.map(t => t.frames))}`);
    expect(new Set(FIVE_CLUBS.map(c => c.league)).size).toBe(5);
    expect(m.seeds.map(t => t.matches)).toEqual([MATCHES_EACH, MATCHES_EACH, MATCHES_EACH, MATCHES_EACH, MATCHES_EACH]);
    expect(m.inputs).toBe(200);
    expect(sum(m.seeds.map(t => t.halves))).toBe(200);
  }, LONG);

  it('R1: the ball is in the goal mouth on goals only', () => {
    const m = buildMaterial();
    const goals = sum(m.seeds.map(t => t.goals)), withNet = sum(m.seeds.map(t => t.goalsWithNetFrame));
    const frames = sum(m.seeds.map(t => t.mouthFrames)), offenders = sum(m.seeds.map(t => t.mouthOffenders));
    console.log(`[1101 R1] goals staged ${goals}, with a frame in the net ${withNet}, frames in the mouth ${frames}, offenders ${offenders}`);
    expect(goals).toBeGreaterThan(100);
    expect(withNet).toBe(goals);
    expect(offenders).toBe(0);
  }, LONG);

  it('R2: nobody stands on a team mate', () => {
    const m = buildMaterial();
    const scenes = sum(m.seeds.map(t => t.scenes));
    const fresh = sum(m.seeds.map(t => t.sceneOverlaps.new)), old = sum(m.seeds.map(t => t.sceneOverlaps.r504)), tweens = sum(m.seeds.map(t => t.tweenRuns)), acts = sum(m.seeds.map(t => t.actionRuns));
    console.log(`[1101 R2] scenes ${scenes}; overlapping pairs in a scene: new ${fresh}, Round 504 ${old}; pairs overlapping two samples running: in a tween ${tweens}, in an action ${acts}${acts + tweens ? `; first cases: ${m.seeds.flatMap(t => t.examples).slice(0, 6).join(" | ")}` : ""}`);
    expect(scenes).toBeGreaterThan(20000);
    expect(fresh).toBe(0);
    expect(tweens).toBe(0);
    expect(acts).toBe(0);
  }, LONG);

  it('R3: at a kick off each side is in its own half, far from the other keeper', () => {
    const m = buildMaterial();
    const beats = sum(m.seeds.map(t => t.kickBeats)), offenders = sum(m.seeds.map(t => t.kickOffenders));
    const fresh = m.seeds.map(t => t.kickSum.new / t.kickCount.new), old = m.seeds.map(t => t.kickSum.r504 / t.kickCount.r504);
    console.log(`[1101 R3] kick off beats ${beats}, hard rule offenders ${offenders}; attack line to the other keeper per seed: new ${fixed(fresh)}, Round 504 ${fixed(old)}; floor ${R3_FLOOR}`);
    expect(beats).toBeGreaterThan(300);
    expect(m.seeds.every(t => t.kickCount.new > 100 && t.kickCount.r504 > 100)).toBe(true);
    expect(offenders).toBe(0);
    /* The floor is a committed number, and it must stand clear of the old picture measured in this very run. */
    expect(R3_FLOOR).toBeGreaterThan(Math.max(...old) + 2 * spread(old));
    for (const value of fresh) expect(value).toBeGreaterThanOrEqual(R3_FLOOR);
  }, LONG);

  it('R4: the block follows the ball', () => {
    const m = buildMaterial();
    const lower = (arm: Arm) => m.seeds.map(t => Math.min(slope(t.follow[arm].withBall), slope(t.follow[arm].without)));
    const fresh = lower('new'), old = lower('r504');
    const beats = sum(m.seeds.map(t => t.follow.new.withBall.n));
    console.log(`[1101 R4] open beats ${beats}; slope of the centroid on the ball per seed (the lower of with and without the ball): new ${fixed(fresh, 3)}, Round 504 ${fixed(old, 3)} (a centroid that never moves reports 0); with ${fixed(m.seeds.map(t => slope(t.follow.new.withBall)), 3)}, without ${fixed(m.seeds.map(t => slope(t.follow.new.without)), 3)}; floor ${R4_FLOOR}`);
    expect(beats).toBeGreaterThan(5000);
    expect(R4_FLOOR).toBeGreaterThan(Math.max(...old) + 2 * spread(old));
    for (const value of fresh) expect(value).toBeGreaterThanOrEqual(R4_FLOOR);
  }, LONG);

  it('R5: nothing is decided here', () => {
    const m = buildMaterial();
    /* The other arm: the engine alone, same seeds, no replay between its calls. */
    const alone = FIVE_CLUBS.map(({ seed, club }) => walkClub(seed, club, null));
    const aloneDigest = alone.map(a => a.digest).join(' ');
    console.log(`[1101 R5] matches ${sum(alone.map(a => a.matches))}, frames replayed ${sum(m.seeds.map(t => t.frames))}, Math.random calls inside the replays ${m.draws}; engine alone ${aloneDigest}; engine with replays ${m.digest}`);
    expect(alone.map(a => a.matches)).toEqual(m.seeds.map(t => t.matches));
    expect(m.draws).toBe(0);
    expect(m.digest).toBe(aloneDigest);
  }, LONG);

  it('R6: a chance starts with the ball at the shooter and ends in its follow up', () => {
    const m = buildMaterial();
    const total = (pick: (t: SeedTally) => number) => sum(m.seeds.map(pick));
    console.log(`[1101 R6] chances staged ${total(t => t.chances)}; holder offenders ${total(t => t.holderOffenders)}, steady offenders ${total(t => t.steadyOffenders)}, follow up offenders ${total(t => t.followOffenders)}; set aside and counted: started from a kick off picture ${total(t => t.underKickoff)}, cut short by the next chance ${total(t => t.cutShort)}, the last kick of the period ${total(t => t.lastKick)}`);
    expect(total(t => t.chances)).toBeGreaterThan(1000);
    expect(total(t => t.holderOffenders)).toBe(0);
    expect(total(t => t.steadyOffenders)).toBe(0);
    expect(total(t => t.followOffenders)).toBe(0);
    /* The set aside cases stay the exception: a goal in the first minute of a period, two chances a minute apart. */
    expect(total(t => t.underKickoff) + total(t => t.cutShort)).toBeLessThan(total(t => t.chances) / 3);
  }, LONG);
});
