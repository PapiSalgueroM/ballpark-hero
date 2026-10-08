/* Round 1101 REVIEW probe (runner lens). Not committed: sent as .rc/x/rvProbe.test.tsx and copied into src/test on the runner. */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCareer, playNextEntry, resumeMatch, liveFeed } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import type { PitchEvent, PitchFigure } from '@/components/pitch-motion/contract';
import { PitchMotion } from '@/components/pitch-motion/PitchMotion';
import { LiveSimScreen } from '@/components/club-manager/LiveSimScreen';

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const FIVE = {
  mine: [
    { key: 'm0', line: 'keeper', slot: { x: 50, y: 90 }, name: 'Home keeper' },
    { key: 'm4', line: 'defence', slot: { x: 30, y: 70 }, name: 'Home far' },
    { key: 'm7', line: 'midfield', slot: { x: 62, y: 52 }, name: 'Home next' },
    { key: 'm8', line: 'midfield', slot: { x: 38, y: 48 }, name: 'Home near' },
    { key: 'm9', line: 'attack', slot: { x: 50, y: 26 }, name: 'Home scorer' },
  ] satisfies PitchFigure[],
  theirs: [
    { key: 'o0', line: 'keeper', slot: { x: 50, y: 90 }, name: 'Away keeper' },
    { key: 'o4', line: 'defence', slot: { x: 30, y: 70 }, name: 'Away far' },
    { key: 'o7', line: 'midfield', slot: { x: 62, y: 52 }, name: 'Away next' },
    { key: 'o8', line: 'midfield', slot: { x: 38, y: 48 }, name: 'Away near' },
    { key: 'o9', line: 'attack', slot: { x: 50, y: 26 }, name: 'Away scorer' },
  ] satisfies PitchFigure[],
  feed: [{ minute: 5, side: 'me', kind: 'goal', text: 'Home scorer' }] satisfies PitchEvent[],
  span: { from: 0, to: 45 },
  seed: 1101,
  colors: { mine: '#85bcf0', theirs: '#d6e6ed' },
};
const read = (root: Element) => {
  const pitch = root.querySelector('[data-cm-live-pitch]')!;
  const ball = root.querySelector<HTMLElement>('[data-cm-ball]')!.style;
  return { motion: pitch.getAttribute('data-cm-motion'), phase: pitch.getAttribute('data-cm-motion-phase'), ball: `${ball.left} ${ball.top}`, dive: !!pitch.querySelector('[data-cm-actor-pose="dive"]') };
};

describe('RV probe: the ready made part as a binder would use it', () => {
  afterEach(() => { cleanup(); });

  it('P1: playing false freezes the current frame (the contract says so)', () => {
    const mounted = render(<PitchMotion {...FIVE} clock={5.45} playing />);
    const moving = read(mounted.container);
    mounted.rerender(<PitchMotion {...FIVE} clock={5.45} playing={false} />);
    const frozen = read(mounted.container);
    console.log('[RV P1] playing true :', JSON.stringify(moving));
    console.log('[RV P1] playing false:', JSON.stringify(frozen));
    expect(frozen).toEqual(moving);
  });

  it('P2: a binder that builds its arrays in render (not memoised) still gets a clean goal', () => {
    const seen: string[] = [];
    const Binder = ({ clock }: { clock: number }) => (
      <PitchMotion {...FIVE} mine={[...FIVE.mine]} theirs={[...FIVE.theirs]} feed={FIVE.feed.map(e => ({ ...e }))} kickoffs={[{ at: 0, side: 'me' }]} clock={clock} playing />
    );
    const mounted = render(<Binder clock={5.0} />);
    const pitch = mounted.container.querySelector('[data-cm-live-pitch]')!;
    const observer = new MutationObserver(records => { for (const r of records) seen.push(String((r.target as Element).getAttribute('data-cm-motion'))); });
    observer.observe(pitch, { attributes: true, attributeFilter: ['data-cm-motion'] });
    const finals: string[] = [];
    for (const clock of [5.1, 5.2, 5.3, 5.45, 5.6, 5.8, 5.9, 6.0]) {
      mounted.rerender(<Binder clock={clock} />);
      for (const r of observer.takeRecords()) seen.push(String((r.target as Element).getAttribute('data-cm-motion')));
      const now = read(mounted.container);
      finals.push(`${clock}:${now.motion}/${now.phase}`);
    }
    observer.disconnect();
    /* The same clocks with stable arrays, for comparison. */
    cleanup();
    const steady = render(<PitchMotion {...FIVE} clock={5.0} playing />);
    const wanted: string[] = [];
    for (const clock of [5.1, 5.2, 5.3, 5.45, 5.6, 5.8, 5.9, 6.0]) {
      steady.rerender(<PitchMotion {...FIVE} clock={clock} playing />);
      const now = read(steady.container);
      wanted.push(`${clock}:${now.motion}/${now.phase}`);
    }
    console.log('[RV P2] unmemoised finals:', finals.join(' '));
    console.log('[RV P2] memoised finals  :', wanted.join(' '));
    console.log('[RV P2] data-cm-motion attribute writes seen while unmemoised (a flip back to pass mid goal is a committed pass frame):', seen.length, seen.join(','));
    expect(finals).toEqual(wanted);
    expect(seen.filter(v => v === 'pass')).toHaveLength(0);
  });
});

describe('RV probe: old shapes of a live match still open in the viewer', () => {
  let career: CareerState;
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
    vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
    vi.spyOn(Math, 'random').mockImplementation(seeded(603));
    career = startCareer('Aston Villa');
    for (let attempt = 0; attempt < 40; attempt++) {
      const next = playNextEntry(career); career = next.state;
      if (career.live) break;
      career = resumeMatch(career).state;
    }
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
  const step = async (ms: number) => { for (let time = 0; time < ms; time += 16) await act(async () => { vi.advanceTimersByTime(Math.min(16, ms - time)); }); };
  const mount = (c: CareerState) => {
    const callbacks = { onSub: vi.fn(), onShape: vi.fn(), onTalk: vi.fn(), onSecondHalf: vi.fn(), onExit: vi.fn(), onStartSecondHalf: vi.fn(), onStartExtraTime: vi.fn(), onChange: vi.fn(), onMark: vi.fn() };
    return { ...render(<LiveSimScreen career={c} live={c.live ?? null} report={null} clubColor="#86bced" {...callbacks} />), callbacks };
  };
  const strips: Record<string, string[]> = {
    'as saved today (JSON round trip)': [],
    'no board (before Round 781)': ['added'],
    'no committed play lines': ['h1Play', 'h2Play'],
    'no half shares of the ball': ['possH1', 'possH2', 'possNoise'],
    'no opposition eleven': ['oppXi', 'oppBench'],
    'all of those at once': ['added', 'h1Play', 'h2Play', 'possH1', 'possH2', 'possNoise', 'oppXi', 'oppBench'],
  };
  for (const [name, keys] of Object.entries(strips)) {
    it(`P3: ${name}`, async () => {
      expect(career.live, 'no live match was reached').toBeTruthy();
      const old = JSON.parse(JSON.stringify(career)) as CareerState;
      const live = old.live as unknown as Record<string, unknown>;
      for (const k of keys) delete live[k];
      live.minute = 12;
      let feedOk = true;
      try { liveFeed(old.live!); } catch (e) { feedOk = false; console.log(`[RV P3] ${name}: the ENGINE's own liveFeed throws on this shape (${String(e).slice(0, 80)}), so it is not a shape the viewer ever sees`); }
      if (!feedOk) return;
      const random = vi.mocked(Math.random);
      const callsBefore = random.mock.calls.length;
      const mounted = mount(old);
      await step(6000);
      const root = mounted.container.querySelector('[data-cm-live-stage]')!;
      const pitch = mounted.container.querySelector('[data-cm-live-pitch]');
      const out = {
        stage: root.getAttribute('data-cm-live-stage'), minute: root.getAttribute('data-cm-live-minute'),
        figures: pitch ? pitch.querySelectorAll('.cm-pitch-player').length : -1, ball: pitch ? pitch.querySelectorAll('[data-cm-ball]').length : -1,
        randomCalls: random.mock.calls.length - callsBefore, marks: mounted.callbacks.onMark.mock.calls.length, bodyOverflow: document.body.style.overflow,
      };
      console.log(`[RV P3] ${name}:`, JSON.stringify(out));
      expect(out.figures).toBeGreaterThanOrEqual(20);
      expect(Number(out.minute)).toBeGreaterThanOrEqual(15);
      expect(out.randomCalls).toBe(0);
      mounted.unmount();
      console.log(`[RV P3] ${name}: after unmount body overflow "${document.body.style.overflow}", onMark calls ${JSON.stringify(mounted.callbacks.onMark.mock.calls)}`);
      expect(document.body.style.overflow).toBe('');
      expect(mounted.callbacks.onMark.mock.calls.length).toBe(1);
    });
  }
});
