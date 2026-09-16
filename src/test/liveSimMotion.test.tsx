import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCareer, playNextEntry, resumeMatch, startSecondHalf, liveFeed, changeLive, benchFor } from '@/lib/clubManager';
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
  const callbacks = { onSub: vi.fn(), onShape: vi.fn(), onTalk: vi.fn(), onSecondHalf: vi.fn(), onExit: vi.fn(), onStartSecondHalf: vi.fn(), onChange: vi.fn(), onMark: vi.fn() };
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
      const event = [...liveFeed(career.live!)].reverse().find(e => e.minute === cap && ['goal', 'save', 'shot'].includes(e.kind));
      if (!event || !['goal', 'save'].includes(event.kind)) continue;
      const key = `${cap}:${event.kind}`;
      if (terminalFixtures.has(key)) continue;
      const copy = structuredClone(career);
      copy.live!.minute = cap - 1.2;
      terminalFixtures.set(key, { career: copy, event });
    }
  }
  expect([...terminalFixtures.keys()].sort()).toEqual(['45:goal', '45:save', '90:goal', '90:save']);
}
const scoreAt = (career: CareerState, minute: number) => ['me', 'opp'].map(side => liveFeed(career.live!)
  .filter(e => e.kind === 'goal' && e.side === side && e.minute <= minute).length).join(' - ');
const readScore = (container: HTMLElement) => container.querySelector('[data-cm-live-score]')!.textContent!.trim();
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
    const mounted = mount(career);
    await step(160);
    expect(mounted.container.querySelector('[data-cm-motion]')!.getAttribute('data-cm-motion')).toBe('pass');
    await step(600);
    const pitch = mounted.container.querySelector('[data-cm-live-pitch]')!;
    const finalPhase = fixture.event.kind === 'goal' ? 'net' : 'caught';
    expect(pitch.getAttribute('data-cm-motion')).toBe(fixture.event.kind);
    expect(pitch.getAttribute('data-cm-motion-phase')).toBe(reduced ? finalPhase : 'flight');
    await step(240);
    expect(pitch.getAttribute('data-cm-motion-phase')).toBe(finalPhase);
    expect(readScore(mounted.container)).toBe(scoreAt(career, cap - 1));
    expect(mounted.container.textContent).not.toContain(`${cap}'`);
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
      career.live!.minute = cap - .15;
      const mounted = mount(career);
      expect(mounted.container.querySelector('[data-cm-motion-phase]')!.getAttribute('data-cm-motion-phase'))
        .toBe(fixture.event.kind === 'goal' ? 'net' : 'caught');
      expect(readScore(mounted.container)).toBe(scoreAt(career, cap - 1));
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
    career.live!.minute = 44.2;
    const mounted = mount(career);
    expect(mounted.container.querySelector('[data-cm-motion]')!.getAttribute('data-cm-motion')).toBe('goal');
    let changed: CareerState | null = null;
    for (let attempt = 1; attempt <= 30; attempt++) {
      vi.mocked(Math.random).mockImplementation(seeded(6034400 + attempt));
      const next = changeLive(career, 44, { kind: 'shape', mentality: 'defensive' })!;
      if (!liveFeed(next.live!).some(e => e.minute === 45 && ['goal', 'save', 'shot'].includes(e.kind))) { changed = next; break; }
    }
    expect(changed).not.toBeNull();
    mounted.rerender(<LiveSimScreen career={changed!} live={changed!.live!} report={null} clubColor="#86bced" {...mounted.callbacks} />);
    expect(mounted.container.querySelector('[data-cm-motion]')!.getAttribute('data-cm-motion')).toBe('pass');
    expectWhistle(mounted, 45, false);
  });
});
