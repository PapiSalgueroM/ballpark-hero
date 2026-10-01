import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCareer, playNextEntry, resumeMatch, startSecondHalf, liveFeed, changeLive, benchFor, isExtraTimeDue, startExtraTime, uclLegsFor } from '@/lib/clubManager';
import type { CareerState, LiveFeedEvent } from '@/lib/clubManager';
const motionPath = process.env.LIVE_MOTION_COMPONENT;
const { actionFrame } = motionPath ? await import(/* @vite-ignore */ motionPath) : await import('@/components/club-manager/LiveSimMotion');

const viewerPath = process.env.LIVE_MOTION_VIEWER;
const { LiveSimScreen } = viewerPath ? await import(/* @vite-ignore */ viewerPath) : await import('@/components/club-manager/LiveSimScreen');
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
  for (let attempt = 0; attempt < 300 && terminalFixtures.size < 4; attempt++) {
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
  for (let k = 0; k < 400 && (!due || !notDue); k++) {
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
  }, 30000);

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
