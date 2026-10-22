import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCareer, playNextEntry, resumeMatch, startSecondHalf, liveFeed, changeLive, benchFor, isExtraTimeDue, startExtraTime, uclLegsFor } from '@/lib/clubManager';
import type { CareerState, LiveFeedEvent } from '@/lib/clubManager';
import { ACTION_SPAN, BEAT_SPAN, GOAL_MOUTH, NET_AT } from '@/components/pitch-motion/contract';
import type { PitchFigure, PitchInput } from '@/components/pitch-motion/contract';
import type { MotionScene } from '@/components/pitch-motion/motion';
import { pitchBeatAt, pitchPlan, pitchScene, pitchSceneKey, PITCH_HELD, PITCH_KICKOFF, PITCH_LATE, PITCH_LEAD, PITCH_RESTART, PITCH_SQUEEZE } from '@/components/pitch-motion/scene';
import type { PitchBeat, PitchPlaced, PitchPlan } from '@/components/pitch-motion/scene';
import { scorerMark } from '@/lib/clubManagerScorerLine';
const motionPath = process.env.LIVE_MOTION_COMPONENT;
/* Round 1101: the part lives in src/components/pitch-motion now, and `between` is exported there. */
const { actionFrame, between, useLiveSimMotion, flightPeak, shotLift } = motionPath ? await import(/* @vite-ignore */ motionPath) : await import('@/components/pitch-motion/motion');

const viewerPath = process.env.LIVE_MOTION_VIEWER;
const { LiveSimScreen, stagePitchInput, goalCardCount, labelsAbove, labelsShort, lookKeyOf, OPP_KEEPER } = viewerPath ? await import(/* @vite-ignore */ viewerPath) : await import('@/components/club-manager/LiveSimScreen');
/* Round 1521: the figures' looks, and the pitch's short names for the foul's label. */
import { figureLook, SKIN_TONES, HAIR_COLOURS, BOOT_COLOURS, HAIR_STYLES } from '@/components/pitch-motion/look';
import { pitchName } from '@/lib/cmMatchDisplay';
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
      /* Round 1101: a goal that plays out inside the stretch these tests walk (a goal of this period, at or
         after the opening minute, not the last kick itself) now holds the clock for its card, and the whistle
         these tests time to the frame would come late. No assertion and no timing below changes: such a half
         is simply not taken as the fixture. */
      if (feed.some(e => e !== event && e.kind === 'goal' && e.minute <= cap && e.minute > cap - 45 && clockPos(e) >= cap - 1.2)) continue;
      /* Round 1052: nor may the men on the pitch change while the wind up plays. The motion hook draws an action
         against the cast it began with and drops it when one of them leaves (useLiveSimMotion's samePlayers), so
         an injury, a sending off or a change in the board's last minute cancels the terminal contact: the score
         and the whistle still come, the strike is never drawn. That is the viewer as it has always been (neither
         LiveSimMotion nor LiveSimScreen changed in Round 1052) and no assertion below is about it. The Russian
         league moved every draw, and the first 90 goal the seeds now find is exactly that half: a goal and an
         injury to its scorer at 90+7, then the goal at 90+8. Measured on a GitHub runner, 2026-10-08: on that
         half the viewer shows pass, pass through the last minute and the whistle at 3-3; on the next three 90
         goals the seeds find (no change of cast in the last minute) it shows plant, flight and net before the
         whistle, as asserted. So such a half is skipped here, the same way a chance still in the air is skipped
         above, and the gap is reported to the viewer's owner rather than hidden.
         Release AR: that gap is closed in the viewer (a change off the clock waits for the action in flight,
         see 'a goal still on its way when the line up changes off the clock' below, which holds it on a goal in
         open play). The skip stays, so the four halves these tests were written against do not move. */
      if (feed.some(e => ['injury', 'red', 'sub'].includes(e.kind) && clockPos(e) > cap + board - 2 && clockPos(e) < cap + board)) continue;
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
let whistleMaterial: { due: CareerState; notDue: CareerState; pre: CareerState } | null = null;
function findWhistleMaterial() {
  if (whistleMaterial) return whistleMaterial;
  let pre: CareerState | null = null;
  /* A walk can go out in the groups (the first seed does), so a few are tried. */
  /* Round 1052: the decider kept is a SECOND leg whose first leg was not level. The banner test below is about
     exactly that night (level on aggregate, not level on the night: "3-1 after a 1-3 first leg") and asserts it
     of whatever this walk reaches, and the first two tests ask only for a decider. The Russian league moved every
     draw, and the first decider the old search reached had a level first leg, so any night that left it level on
     aggregate was level on the night too and the banner test went red on its own precondition, with the banner
     unchanged. The search now asks for the night the test is about (a decider after a level first leg is walked
     past, to the next round or the next walk), and 40 walks are allowed for it, not 10. */
  const firstLegLevel = (career: CareerState, round: string) => {
    const tie = career.uclBracket?.find(t => t.round === round && t.mine);
    return !tie?.leg1 || tie.leg1.homeGoals === tie.leg1.awayGoals;
  };
  for (let walk = 0; walk < 40 && !pre; walk++) {
    vi.mocked(Math.random).mockImplementation(seeded(670001 + walk));
    let career = startCareer('Real Madrid');
    for (let week = 0; week < 200; week++) {
      const entry = career.calendar[career.week];
      if (entry && entry.type === 'uclKo' && entry.uclRound && career.uclKoRound === entry.uclRound
        && entry.uclLeg === 2 && uclLegsFor(career.eraId, entry.uclRound) === 2 && !firstLegLevel(career, entry.uclRound)) { pre = career; break; }
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
    /* Round 1101: for the same reason a second half with a goal from the 90th minute on is not taken. */
    if (liveFeed(second.live!).some(e => e.kind === 'goal' && e.minute >= 90)) continue;
    if (isExtraTimeDue(second)) due ??= second; else notDue ??= second;
  }
  expect(due, 'no seed left the decider level at 90').not.toBeNull();
  expect(notDue, 'every seed left the decider level at 90').not.toBeNull();
  due!.live!.minute = 89.4;
  notDue!.live!.minute = 89.4;
  /* Round 1101: the career just before the decider goes along too, for a test that searches a second half of its own. */
  whistleMaterial = { due: due!, notDue: notDue!, pre: pre! };
  return whistleMaterial;
}
const stageOf = (container: HTMLElement) => container.querySelector('[data-cm-live-stage]')!.getAttribute('data-cm-live-stage');
const scoreAt = (career: CareerState, minute: number) => ['me', 'opp'].map(side => liveFeed(career.live!)
  .filter(e => e.kind === 'goal' && e.side === side && e.minute <= minute).length).join(' - ');
/* Round 1340: the score is drawn home side first, so it is read by side ("me - opp") off its two marked digits,
   which the strip and the interval card both carry, and every assertion keeps its meaning at any venue. */
const readScore = (container: HTMLElement) => {
  const score = container.querySelector('[data-cm-live-score]')!;
  return `${score.querySelector('[data-cm-score-of="me"]')!.textContent!.trim()} - ${score.querySelector('[data-cm-score-of="opp"]')!.textContent!.trim()}`;
};
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
    const saved = structuredClone(fixtures.get('save')!.career);
    const mounted = mount(saved);
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
    /* Round 1340: the pitch shows no numbers, so the label names the man by his whole name. */
    const man = saved.squad.find(p => p.id === id);
    expect(man).toBeTruthy();
    expect(player.getAttribute('aria-label')).toContain(man!.name);
    expect(player.getAttribute('aria-label')).not.toContain('number');
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
    if (fixture.event.kind === 'goal') {
      /* Round 1303 fix (finding 6 of Round 1302): a goal that is the last kick of a period gets its scorer card
         like every other goal, and the whistle waits for the card (1.8 seconds at the 2x a match opens at). The
         goal is counted the moment the clock reaches the whistle, as before. */
      expectWhistle(mounted, cap, false);
      expect(readScore(mounted.container)).toBe(scoreAt(career, cap));
      expect(mounted.container.querySelector('[data-cm-goal-card]')?.textContent ?? '', 'the last kick of the period got no scorer card').toContain(fixture.event.text);
      expect(pitch.getAttribute('data-cm-motion-phase')).toBe('net');
      await step(1500);
      expectWhistle(mounted, cap, false);
      await step(500);
    }
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
    /* Round 1101: the goal plays out before it is announced, so its line rises with the card when the ball is
       in the net. Wait for it, 1,200 ms at most; the three assertions below are as they were. */
    const announced = () => [...mounted.container.querySelectorAll('div')].find(d => d.childElementCount > 0 && (d.textContent ?? '').startsWith('GOAL!') && d.className.includes('truncate'));
    for (let waited = 0; waited < 1200 && !announced(); waited += 50) await step(50);
    const banner = announced();
    expect(banner, 'no goal banner on screen at the goal').toBeTruthy();
    expect(banner!.textContent).toContain(goal!.text);
    /* Round 1146: the report's mark follows the minute on a goal that carries one (a penalty reads 90+N' (P)). */
    expect(banner!.textContent!.endsWith(` 90+${plus}'${scorerMark(goal!)}`), `the banner reads "${banner!.textContent}"`).toBe(true);
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
  /* R6 */ chances: number; holderOffenders: number; steadyOffenders: number; followOffenders: number; underKickoff: number; lastKick: number;
  waited: number; lateSum: number; lateOffenders: number; overlapped: number; overlapOffenders: number; noLead: number; ledOn: number; followSeen: number;
  goalsToRestart: number; kickoffWhole: number; kickoffHeld: number; kickoffSeen: number; kickoffShort: number; beforeLastKick: number; kickoffSum: number;
  underHeld: number; goalWaited: number; nextSqueezed: number; periodEnd: number; underHeldOffenders: number; underHeldExamples: string[];
  /* R7 */ dead: Record<DeadKind, number>; deadOffenders: number; flanked: number; standIns: number; deadExamples: string[];
  /* R8 */ handed: number; kickHandOffenders: number; shareOffenders: number; unevenShares: number; awayHalves: number;
}
type DeadKind = 'opening' | 'restart' | 'corner' | 'throwin' | 'freekick' | 'goalkick' | 'keeper';
const tally = (club: string): SeedTally => ({
  club, matches: 0, halves: 0, frames: 0, goals: 0, goalsWithNetFrame: 0, mouthFrames: 0, mouthOffenders: 0,
  scenes: 0, sceneOverlaps: { new: 0, r504: 0 }, tweenRuns: 0, actionRuns: 0, examples: [],
  kickBeats: 0, kickSum: { new: 0, r504: 0 }, kickCount: { new: 0, r504: 0 }, kickOffenders: 0,
  follow: { new: { withBall: line(), without: line() }, r504: { withBall: line(), without: line() } },
  chances: 0, holderOffenders: 0, steadyOffenders: 0, followOffenders: 0, underKickoff: 0, lastKick: 0,
  waited: 0, lateSum: 0, lateOffenders: 0, overlapped: 0, overlapOffenders: 0, noLead: 0, ledOn: 0, followSeen: 0,
  goalsToRestart: 0, kickoffWhole: 0, kickoffHeld: 0, kickoffSeen: 0, kickoffShort: 0, beforeLastKick: 0, kickoffSum: 0,
  underHeld: 0, goalWaited: 0, nextSqueezed: 0, periodEnd: 0, underHeldOffenders: 0, underHeldExamples: [],
  dead: { opening: 0, restart: 0, corner: 0, throwin: 0, freekick: 0, goalkick: 0, keeper: 0 }, deadOffenders: 0, flanked: 0, standIns: 0, deadExamples: [],
  handed: 0, kickHandOffenders: 0, shareOffenders: 0, unevenShares: 0, awayHalves: 0,
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

/** R7: who takes a dead ball, and from where. Every dead stretch of the plan is traced back to the line of the
 *  feed that put it there (the plan's own id carries that line's index) and read against THAT line: a kick
 *  off after a goal is the side's that conceded, a corner and a throw in are the side's the line names, a
 *  free kick is the side's that was fouled, a goal kick and a save are the defending keeper's. */
function deadBall(t: SeedTally, input: PitchInput, beat: PitchBeat, scene: MotionScene<PitchPlaced>) {
  if (!beat.dead || beat.via === 'carrier') return;
  const flip = (side: string) => (side === 'me' ? 'opp' : 'me');
  const holder = [...scene.mine, ...scene.theirs].find(p => p.key === scene.holderKey);
  const holderSide = scene.mine.some(p => p.key === scene.holderKey) ? 'me' : scene.theirs.some(p => p.key === scene.holderKey) ? 'opp' : null;
  const index = Number(beat.id.slice(1));
  const source = input.feed[index];
  const tag = beat.id[0];
  const centre = scene.ball.x === 50 && scene.ball.y === 50;
  let kind: DeadKind | null = null;
  let wanted: string | null = null;
  let spot = true;
  /* The keeper has it. A side can be without a keeper on the pitch at all (the engine took him off and nobody
     went in goal: four dead balls in the material): then a man of that side stands in, and that is counted. */
  const inGoal = (side: string) => {
    if ((side === 'me' ? scene.mine : scene.theirs).some(p => p.keeper)) return !!holder?.keeper;
    t.standIns++;
    return !!holder;
  };
  if (tag === 'k' && beat.state === 'kickoff') { kind = 'opening'; wanted = input.kickoffs?.[index]?.side ?? null; spot = centre; }
  else if (tag === 'g' && beat.state === 'kickoff' && source?.kind === 'goal') { kind = 'restart'; wanted = flip(source.side); spot = centre; }
  else if (tag === 'f' && beat.state === 'corner' && source?.kind === 'corner') {
    kind = 'corner'; wanted = source.side;
    /* On a flag at the end that side attacks, and on the flank the line names when it names one. */
    spot = scene.ball.y === (source.side === 'me' ? 2.5 : 97.5) && (scene.ball.x === 2.5 || scene.ball.x === 97.5);
    if (source.flank) { t.flanked++; spot = spot && scene.ball.x === (source.flank === 'left' ? 2.5 : 97.5); }
  } else if (tag === 't' && beat.state === 'throwin' && source?.kind === 'throwin') { kind = 'throwin'; wanted = source.side; spot = scene.ball.x === 2 || scene.ball.x === 98; }
  else if (tag === 'x' && beat.state === 'freekick' && source?.kind === 'foul') { kind = 'freekick'; wanted = flip(source.side); }
  else if (tag === 'q' && beat.state === 'goalkick' && source?.kind === 'shot') { kind = 'goalkick'; wanted = flip(source.side); spot = inGoal(wanted) && (wanted === 'me' ? scene.ball.y > 90 : scene.ball.y < 10); }
  else if (tag === 'h' && beat.state === 'keeper' && source?.kind === 'save') { kind = 'keeper'; wanted = flip(source.side); spot = inGoal(wanted) && (wanted === 'me' ? scene.ball.y > 80 : scene.ball.y < 20); }
  const bad = !kind || beat.side !== wanted || holderSide !== wanted || !spot;
  if (kind) t.dead[kind]++;
  if (!bad) return;
  t.deadOffenders++;
  if (t.deadExamples.length < 3) t.deadExamples.push(`${beat.state} ${beat.id} at ${beat.start.toFixed(2)}: the ball is ${beat.side}'s (held by ${holderSide}) at ${scene.ball.x.toFixed(1)},${scene.ball.y.toFixed(1)}, off the line ${source ? `${source.kind} ${source.side}${source.flank ? ` ${source.flank}` : ''}` : 'none'}, wanted ${wanted}`);
}

function replayHalf(t: SeedTally, input: PitchInput) {
  const plan: PitchPlan = pitchPlan(input);
  const to = Math.max(input.span.from + BEAT_SPAN, input.span.to);
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
    deadBall(t, input, beat, scene);
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
    /* The frame the hook captures is the one on screen just before the action starts. */
    const just = a.at - .05;
    const captured: MotionScene<PitchPlaced> = pitchScene(plan, just);
    const underKickoff = pitchBeatAt(plan, just).state === 'kickoff';
    const before = plan.actions[n - 1], next = plan.actions[n + 1];
    const place = a.event.minute + (a.event.plus ?? 0);
    const after = a.at + ACTION_SPAN;
    /* How long it waited for its turn (the last kick of a period is wound up BEFORE its place: not a wait). */
    if (a.at > place + 1e-9) { t.waited++; t.lateSum += a.at - place; }
    if (a.at > place + PITCH_LATE + 1e-9) t.lateOffenders++;
    /* One action at a time: is this one still playing when the next starts? */
    if (next && next.at < after - 1e-9) {
      t.overlapped++;
      /* Never by more than the tenth of a minute two whole minutes fall short of two actions: a chance two
         minutes before the last kick is still resolving when that kick's wind up starts. */
      if (after - next.at > 2 * ACTION_SPAN - 2 + 1e-9) t.overlapOffenders++;
    }
    /* Did it get its lead in? Not when it had to start straight off the action, or the kick off, before it. */
    const clear = before ? before.at + ACTION_SPAN + (before.event.kind === 'goal' ? PITCH_RESTART : 0) : -Infinity;
    const noLead = a.at - clear < PITCH_SQUEEZE - 1e-9;
    if (noLead) t.noLead++;
    else if (underKickoff) t.underKickoff++;
    else {
      const attackers = a.event.side === 'me' ? captured.mine : captured.theirs;
      const holder = attackers.find(p => p.key === captured.holderKey);
      const picked = actionFrame(captured, action, 0).holderKey;
      if (!holder || picked !== holder.key || Math.hypot(captured.ball.x - holder.x, captured.ball.y - holder.y) > 3) t.holderOffenders++;
      /* And nothing changes under it while it plays (unless the next one starts over it, counted above). */
      if (!(next && next.at < after - 1e-9) && pitchSceneKey(plan, just) !== pitchSceneKey(plan, after - .01)) t.steadyOffenders++;
    }
    if (after >= to - 1e-9) t.lastKick++;
    else if (a.event.kind === 'goal') {
      /* A goal is followed by its kick off, on screen from the instant the action ends until the next chance's
         shooter is led in (or the next action starts). Four lengths are told apart: whole (both beats), held
         (KICKOFF_HELD or more: both sides are back and the picture has stood as long again), a beat or more,
         and under a beat. The one case that cannot be: the last kick's wind up comes first. */
      t.goalsToRestart++;
      const entry = pitchBeatAt(plan, after + 1e-6);
      const seen = entry.state === 'kickoff' && Math.abs(entry.start - after) < 1e-6 ? Math.min(entry.end, next ? Math.max(next.at, after) : entry.end) - after : 0;
      const nextIsLastKick = !!next && next.at < next.event.minute + (next.event.plus ?? 0) - 1e-9;
      t.kickoffSum += Math.min(seen, PITCH_KICKOFF);
      if (seen >= PITCH_KICKOFF - 1e-6) t.kickoffWhole++;
      else if (seen >= KICKOFF_HELD - 1e-6) t.kickoffHeld++;
      else if (seen >= PITCH_RESTART - 1e-6) t.kickoffSeen++;
      else if (nextIsLastKick) t.beforeLastKick++;
      else t.kickoffShort++;
      /* WHY a kick off is under KICKOFF_HELD, every time. A goal that started on time, with the next chance
         free to wait its turn, always has that much. So one of three things is true of every shorter one:
         the goal itself had to wait (a chance, or the period's kick off, in the minute before it), the next
         chance was squeezed from behind (the one after it starts the instant it and its beat of kick off are
         over), or the period is about to end (nothing waits into the last kick's wind up). */
      if (seen < KICKOFF_HELD - 1e-6) {
        t.underHeld++;
        const after2 = plan.actions[n + 2];
        const waited = a.at > place + 1e-9;
        const squeezed = !!next && !!after2 && after2.at - next.at <= ACTION_SPAN + (next.event.kind === 'goal' ? PITCH_RESTART : 0) + 1e-6;
        const ending = to - place < 4;
        if (waited) t.goalWaited++; else if (squeezed) t.nextSqueezed++; else if (ending) t.periodEnd++;
        else { t.underHeldOffenders++; if (t.underHeldExamples.length < 3) t.underHeldExamples.push(`goal ${a.event.side} at ${place} (started ${a.at.toFixed(2)}), kick off ${seen.toFixed(2)}, next ${next ? `${next.event.kind} at ${next.at.toFixed(2)}` : 'none'}`); }
      }
    } else {
      /* A miss is followed by the goal kick and a save by the keeper with the ball, unless the next chance's
         shooter is led in straight away (its stretch starts by the time this action ends). */
      const follow = pitchBeatAt(plan, after + 1e-6);
      const wanted = a.event.kind === 'shot' ? 'goalkick' : 'keeper';
      if (follow.state === wanted && Math.abs(follow.start - after) < 1e-6) t.followSeen++;
      else if (next && next.at - PITCH_LEAD <= after + 1e-6) t.ledOn++;
      else t.followOffenders++;
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

/* ─────────────────────────────────────────────────────────────────────────────────────────────
   Round 1521: what the viewer draws between the lines of the feed, read on the same 200 half feeds.
   R10 the ball: every pass into a stretch is drawn with the height its flight says (none on the grass, some
   in the air, as a cross or as a throw) and lands at the man it is played to. Every chance leaves the foot on
   the grass, rises, and is back on the grass at its end, in the net of the side it attacks, with the keeper of
   the side defending going for it, in both halves.
   R11 fouls: one cue for each foul line the plan stages at its own place, on the two men it is about, with
   the card the feed books on it and no other; a foul with no cue is under a stretch that outranks it. The foul
   lines are the plays the stats count, side by side.
   R12 the build up: inside one possession my side goes forward a line far more often than back, more so the
   more directly it plays (three arms of the same feeds: defensive, balanced, attacking), and never back
   without the reason the pitch shows (pressure, drawn as a man closing him down, or a switch across). A chance
   is reached by a build up that ends at its shooter. */
type Arm1521 = 'defensive' | 'balanced' | 'attacking';
const ARMS_1521: [Arm1521, number][] = [['defensive', -1], ['balanced', 0], ['attacking', 1]];
interface BuildArm { possessions: number; forward: number; level: number; back: number; behind: number; behindForward: number; resets: { press: number; switch: number }; unreasoned: number; switchOffenders: number; pressOffenders: number }
interface Tally1521 {
  passes: Record<'ground' | 'air' | 'cross' | 'throw', number>; liftedGround: number; flatAerial: number; landOffenders: number;
  shots: Record<'first' | 'second', number>; shotOffenders: number; shotExamples: string[];
  fouls: number; cues: number; waited: number; cueOffenders: number; hidden: number; hiddenOffenders: number; named: number; contacts: number; contactOffenders: number;
  cardLines: number; carded: number; cardOffenders: number; statFouls: number; statOffenders: number; foulExamples: string[];
  arms: Record<Arm1521, BuildArm>; pressGap: number[]; calmGap: number[]; chains: number; deepChains: number; chainOffenders: number;
}
const buildArm = (): BuildArm => ({ possessions: 0, forward: 0, level: 0, back: 0, behind: 0, behindForward: 0, resets: { press: 0, switch: 0 }, unreasoned: 0, switchOffenders: 0, pressOffenders: 0 });
const tally1521 = (): Tally1521 => ({
  passes: { ground: 0, air: 0, cross: 0, throw: 0 }, liftedGround: 0, flatAerial: 0, landOffenders: 0,
  shots: { first: 0, second: 0 }, shotOffenders: 0, shotExamples: [],
  fouls: 0, cues: 0, waited: 0, cueOffenders: 0, hidden: 0, hiddenOffenders: 0, named: 0, contacts: 0, contactOffenders: 0,
  cardLines: 0, carded: 0, cardOffenders: 0, statFouls: 0, statOffenders: 0, foulExamples: [],
  arms: { defensive: buildArm(), balanced: buildArm(), attacking: buildArm() }, pressGap: [], calmGap: [], chains: 0, deepChains: 0, chainOffenders: 0,
});
const LINE_RANK = { keeper: 0, defence: 1, midfield: 2, attack: 3 } as const;
const apart = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const placeOfLine = (e: { minute: number; plus?: number }) => e.minute + (e.plus ?? 0);
/** The nearest outfield man of the other side to the ball: how closely the man on it is pressed. */
const pressedBy = (scene: MotionScene<PitchPlaced>, side: 'me' | 'opp') => Math.min(...(side === 'me' ? scene.theirs : scene.mine).filter(p => !p.keeper).map(p => apart(p, scene.ball)));

function replay1521(t: Tally1521, input: PitchInput, live: NonNullable<CareerState['live']>, stage: 'first' | 'second') {
  const plan = pitchPlan(input);
  const from = input.span.from, to = Math.max(from + BEAT_SPAN, input.span.to);
  /* R10: every pass, read at the middle and at the end of its flight. */
  let previous: MotionScene<PitchPlaced> | null = null;
  for (const beat of plan.entries) {
    const scene: MotionScene<PitchPlaced> = pitchScene(plan, beat.start);
    if (previous) {
      const kind = scene.flight ?? 'ground';
      t.passes[kind as keyof Tally1521['passes']]++;
      const mid = between(previous, scene, 0.5);
      if (kind === 'ground' && (mid.lift ?? 0) > 0) t.liftedGround++;
      if (kind !== 'ground' && !((mid.lift ?? 0) > 0.5)) t.flatAerial++;
      const end = between(previous, scene, 1);
      const holder = [...scene.mine, ...scene.theirs].find(p => p.key === scene.holderKey);
      if ((end.lift ?? 0) > 0 || apart(end.ball, scene.ball) > 1e-6 || (!beat.dead && holder && apart(end.ball, holder) > 3)) t.landOffenders++;
    }
    previous = scene;
  }
  /* R10: every chance the plan stages. */
  for (const a of plan.actions) {
    const action = { event: a.event, key: 'r1521', at: a.at };
    const captured: MotionScene<PitchPlaced> = pitchScene(plan, a.at - .05);
    const mine = a.event.side === 'me';
    const attacking = mine ? captured.mine : captured.theirs;
    const keeper = (mine ? captured.theirs : captured.mine).find(p => p.keeper);
    let rose = false;
    let bad = '';
    for (let s = 0; s <= 21; s++) {
      const f = actionFrame(captured, action, s * .05);
      if (f.phase === 'plant' && (f.lift ?? 0) !== 0) bad ||= `off the grass at the plant (${f.lift})`;
      if (f.phase === 'flight' && (f.lift ?? 0) > 0.2) rose = true;
      for (const p of attacking) if (p.keeper && (f.poses[p.key]?.dive ?? 0) !== 0) bad ||= "the attacking side's keeper dives";
      if (f.net && f.net !== (mine ? 'opp' : 'me')) bad ||= `the ${f.net} net`;
    }
    const last = actionFrame(captured, action, ACTION_SPAN);
    if ((last.lift ?? 0) !== 0) bad ||= 'off the grass at the end';
    if (!rose) bad ||= 'never off the grass';
    if (keeper && a.event.kind === 'save' && !(Math.abs(last.poses[keeper.key]?.dive ?? 0) > 0)) bad ||= 'the defending keeper does not go';
    if (a.event.kind === 'goal' && (mine ? last.ball.y > GOAL_MOUTH.depth : last.ball.y < 100 - GOAL_MOUTH.depth)) bad ||= 'not in the goal it attacks';
    t.shots[stage]++;
    if (bad) { t.shotOffenders++; if (t.shotExamples.length < 3) t.shotExamples.push(`${a.event.kind} ${a.event.side} at ${a.at.toFixed(2)}${a.event.penalty ? ' penalty' : ''}${a.event.og ? ' own goal' : ''}: ${bad}`); }
  }
  replayFouls(t, input, plan, live, stage, from, to);
  replayBuild(t, input, plan);
}

/** R11, read against the feed's own lines: the plan's cues are worked out one way and checked another. */
function replayFouls(t: Tally1521, input: PitchInput, plan: PitchPlan, live: NonNullable<CareerState['live']>, stage: 'first' | 'second', from: number, to: number) {
  const say = (why: string) => { t.cueOffenders++; if (t.foulExamples.length < 4) t.foulExamples.push(why); };
  const cued = new Map<number, string | undefined>();
  plan.entries.forEach((beat, n) => {
    if (!beat.foul || !beat.dead) return;
    const scene: MotionScene<PitchPlaced> = pitchScene(plan, beat.start);
    if (!scene.cue) return;
    t.cues++;
    const cue = scene.cue;
    const line = input.feed[cue.order];
    if (cued.has(cue.order)) say(`two cues for line ${cue.order}`);
    cued.set(cue.order, cue.card);
    if (!line || line.kind !== 'foul' || line.side === 'none') { say(`a cue on line ${cue.order}, which is ${line?.kind ?? 'nothing'}`); return; }
    /* At its minute: the clock still reads it (it may wait inside it for a chance or a kick off to clear). */
    if (beat.start < placeOfLine(line) - 1e-6 || beat.start > placeOfLine(line) + 1 - BEAT_SPAN + 1e-6) say(`a whistle at ${beat.start} for a foul at ${placeOfLine(line)}`);
    else if (beat.start > placeOfLine(line) + 1e-6) t.waited++;
    const fouled = line.side === 'me' ? 'opp' : 'me';
    if (beat.side !== fouled) say(`the free kick at ${beat.start} goes to the side that fouled`);
    const named = (line.side === 'me' ? input.mine : input.theirs).find(f => f.name !== undefined && f.name === line.text);
    if (named) t.named++;
    if (cue.by !== (named?.key ?? null)) say(`the foul at ${beat.start} is drawn by ${cue.by}, and its line names ${named?.key ?? 'nobody on the grass'}`);
    const victims = fouled === 'me' ? scene.mine : scene.theirs;
    if (!victims.some(p => p.key === cue.on) || beat.carrier !== cue.on) say(`the foul at ${beat.start} is on ${cue.on}, who is not the fouled side's man on the ball`);
    if (apart(cue.at, scene.ball) > 1e-6) say(`the cue at ${beat.start} is not where the free kick is taken`);
    /* The two meet: the man it names at the ball at the whistle, and, in the stretch before it, at the man it was on. */
    const fouler = (line.side === 'me' ? scene.mine : scene.theirs).find(p => p.key === cue.by);
    if (fouler) { t.contacts++; if (apart(fouler, scene.ball) > 6) t.contactOffenders++; }
    const before = plan.entries[n - 1];
    if (fouler && before?.id === `w${cue.order}` && Math.abs(before.end - beat.start) < 1e-6) {
      const contact: MotionScene<PitchPlaced> = pitchScene(plan, before.start);
      const a = (line.side === 'me' ? contact.mine : contact.theirs).find(p => p.key === cue.by);
      const b = (fouled === 'me' ? contact.mine : contact.theirs).find(p => p.key === cue.on);
      t.contacts++;
      if (!a || !b || apart(a, b) > 6 || contact.holderKey !== b.key) t.contactOffenders++;
    }
  });
  /* Every staged foul has its cue, unless a stretch that outranks it holds its place. */
  for (const [order, e] of input.feed.entries()) {
    if (e.kind !== 'foul' || e.side === 'none' || placeOfLine(e) < from - 1e-9 || placeOfLine(e) >= to - 1e-9) continue;
    t.fouls++;
    if (cued.has(order)) continue;
    t.hidden++;
    /* Its reason: through the whole of its minute the pitch is held (a chance's feeder, its shooter or what follows
       it, a kick off, another dead ball or another foul), so no beat of it was free for a whistle. Read off what is
       drawn, not off the rule: a beat is free when only open play, a build up's first man or this foul's own
       stretches are on it. */
    const own = new Set([`w${order}`, `x${order}`, `y${order}`]);
    const holds = (b: PitchBeat) => !(b.via === 'grid' || (b.via === 'approach' && b.id.startsWith('b')) || own.has(b.id));
    const p = placeOfLine(e), last = Math.min(p + 1 - BEAT_SPAN, to - BEAT_SPAN);
    for (let s = p; s <= last + 1e-9; s += 0.02) {
      if (plan.entries.some(b => b.start < s + BEAT_SPAN - 1e-9 && s < b.end - 1e-9 && holds(b))) continue;
      t.hiddenOffenders++;
      const drawn = plan.entries.filter(b => b.end > p - 0.4 && b.start < p + 1.2).map(b => `${b.id}@${b.start.toFixed(2)}-${b.end.toFixed(2)}${b.foul ? `(at ${b.foul.at.toFixed(2)})` : ''}`).join(' ');
      if (t.foulExamples.length < 4) t.foulExamples.push(`the foul at ${p} (line ${order}) has no cue, and ${s.toFixed(2)} to ${(s + BEAT_SPAN).toFixed(2)} was free: ${drawn}`);
      break;
    }
  }
  /* The card: the feed's own, on that man at that place, one card to one foul, and never one the feed does not give. */
  const groups = new Map<string, { cards: string[]; fouls: number[] }>();
  for (const [order, e] of input.feed.entries()) {
    if (e.side === 'none' || (e.kind !== 'foul' && e.kind !== 'yellow' && e.kind !== 'red')) continue;
    const key = `${e.side}|${e.text}|${placeOfLine(e)}`;
    const g = groups.get(key) ?? { cards: [], fouls: [] };
    if (e.kind === 'foul') g.fouls.push(order); else g.cards.push(e.kind);
    groups.set(key, g);
  }
  for (const g of groups.values()) {
    t.cardLines += g.cards.length;
    const drawn = g.fouls.filter(o => cued.has(o));
    const carded = drawn.filter(o => cued.get(o));
    t.carded += carded.length;
    const kinds = carded.map(o => cued.get(o)!).sort().join(',');
    if (carded.length > g.cards.length || carded.some(o => !g.cards.includes(cued.get(o)!))) t.cardOffenders++;
    else if (drawn.length === g.fouls.length && kinds !== [...g.cards].sort().slice(0, g.fouls.length).join(',')) t.cardOffenders++;
  }
  /* The foul lines are the plays the stats count: side by side, the same number in this period. */
  const play = (stage === 'first' ? live.h1Play : live.h2Play) ?? [];
  for (const side of ['me', 'opp'] as const) {
    const counted = play.filter(e => e.kind === 'foul' && e.side === side).length;
    t.statFouls += counted;
    if (input.feed.filter(e => e.kind === 'foul' && e.side === side).length !== counted) t.statOffenders++;
  }
}

/** R12: three arms of the same half, my side defensive, balanced and attacking; the other side as it was. */
function replayBuild(t: Tally1521, input: PitchInput, plan: PitchPlan) {
  for (const [arm, lean] of ARMS_1521) {
    const armPlan = lean === (input.build?.me ?? 0) ? plan : pitchPlan({ ...input, build: { me: lean, opp: input.build?.opp ?? 0 } });
    const tally = t.arms[arm];
    let prev: PitchBeat | null = null;
    for (const beat of armPlan.entries) {
      if (beat.via === 'grid' && beat.side === 'me' && beat.line) {
        const carried = !!prev && prev.via === 'grid' && prev.side === 'me' && !!prev.line && Math.abs(prev.end - beat.start) < 1e-6;
        if (!carried) tally.possessions++;
        else {
          const up = LINE_RANK[beat.line] - LINE_RANK[prev!.line!];
          /* From behind the front line, where there is a line ahead to play into. */
          if (LINE_RANK[prev!.line!] < 3) { tally.behind++; if (up > 0) tally.behindForward++; }
          if (up > 0) tally.forward++;
          else if (up === 0) tally.level++;
          else {
            tally.back++;
            if (!beat.reset) tally.unreasoned++;
            else tally.resets[beat.reset]++;
            if (beat.reset === 'switch' && Math.abs(beat.anchor.x - prev!.anchor.x) < 30) tally.switchOffenders++;
            if (beat.reset === 'press' && !prev!.pressed) tally.pressOffenders++;
          }
          /* A reason on a pass that did not go back would be a reason made up. */
          if (beat.reset && up >= 0) tally.unreasoned++;
        }
        if (arm === 'balanced') (beat.pressed ? t.pressGap : t.calmGap).push(pressedBy(pitchScene(armPlan, beat.start), 'me'));
      }
      prev = beat;
    }
  }
  /* The chance: the feeder plays no further up than the shooter, and the man before him is deeper still. */
  plan.entries.forEach((beat, n) => {
    if (beat.via !== 'carrier' || !beat.line) return;
    const order = beat.id.slice(1);
    const feed = plan.entries[n - 1];
    if (feed?.id !== `a${order}` || Math.abs(feed.end - beat.start) > 1e-6) return;
    t.chains++;
    if (!feed.line || feed.side !== beat.side || LINE_RANK[feed.line] > LINE_RANK[beat.line]) { t.chainOffenders++; return; }
    const deep = plan.entries[n - 2];
    if (deep?.id !== `b${order}` || Math.abs(deep.end - feed.start) > 1e-6) return;
    t.deepChains++;
    if (!deep.line || deep.side !== beat.side || LINE_RANK[deep.line] >= LINE_RANK[feed.line]) t.chainOffenders++;
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
  /* Release AT: this material is 200 seeded half feeds, twenty matches from each of five clubs, and it was
     taken on the generated fixture list. Round 1184 binds the real 2026/27 list to a new Premier League
     career, and on that season the seeded Aston Villa walk ends in a sacking after 15 matches (190 feeds).
     The walk takes only the opt in key off, as simLiveMatch, simClubManagerSlots and simCmVar do for their
     generated cohorts, so the material is the one this file was written against. Proof that the binding
     and nothing else moved it: with the binding made a no-op the file is 55 of 55 (rAT-cm-n). */
  delete career.realLeagueFixtures;
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

interface Material { seeds: SeedTally[]; digest: string; draws: number; inputs: number; looks: Tally1521[] }
let material: Material | null = null;
/** The engine with the full replay of each half run between every engine call. Built once. */
function buildMaterial(): Material {
  if (material) return material;
  const seeds: SeedTally[] = [];
  const looks: Tally1521[] = [];
  const digests: string[] = [];
  let draws = 0;
  let inputs = 0;
  for (const { seed, club } of FIVE_CLUBS) {
    const t = tally(club);
    const x = tally1521();
    const walked = walkClub(seed, club, (career, stage) => {
      const cap = stage === 'first' ? 45 : 90;
      const input: PitchInput = stagePitchInput(career, career.live!, null, stage, stage === 'first' ? 0 : 46, 0, cap + boardAt(career, cap));
      inputs++;
      replayHalf(t, input);
      replay1521(x, input, career.live!, stage);
      /* R8: what the viewer hands the pitch, read against the match itself. Whoever is at home kicks off the
         match and the other side the second half, and the share of the ball is that half's own. */
      const live = career.live!;
      const opening = live.home === false ? 'opp' : 'me';
      const kicking = stage === 'first' ? opening : opening === 'me' ? 'opp' : 'me';
      const share = stage === 'first' ? live.possH1 : live.possH2 ?? live.possH1;
      t.handed++;
      if (live.home === false) t.awayHalves++;
      if (input.kickoffs?.length !== 1 || input.kickoffs[0].side !== kicking || input.kickoffs[0].at !== input.span.from) t.kickHandOffenders++;
      if (share !== undefined && share !== 50) t.unevenShares++;
      if (Math.abs((input.possession ?? -1) - (share ?? 50) / 100) > 1e-9) t.shareOffenders++;
    });
    t.matches = walked.matches;
    draws += walked.draws;
    digests.push(walked.digest);
    seeds.push(t);
    looks.push(x);
  }
  material = { seeds, digest: digests.join(' '), draws, inputs, looks };
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
/** R6, one action at a time. Measured on the 200 half feeds (2,130 chances, 262 goals with play left after
 *  them; the per seed counts are printed by R6 and recorded here):
 *  - still playing when the next one starts: 12 of 2,130 (per seed 1 5 5 1 0), every one by a twentieth
 *    or a tenth of a minute beside the last kick of a period, which is wound up to END on the whistle and can
 *    not wait. The length is a hard rule (0 offenders); the count may be one chance in 50 (42), 3.5 times
 *    what was measured.
 *  - set aside because it had no lead in (it started straight off the action or the kick off before it): 65
 *    of 2,130 (per seed 11 of 394, 15 of 420, 18 of 433, 6 of 434, 15 of 449). One in 10 (213) keeps the holder
 *    rule read on nine chances in ten, 3.3 times the measured.
 *  - a goal whose kick off is seen for less than a beat: 10 of 262 (9 cut by the next chance, 1 by the last
 *    kick's wind up; per seed 2 of 43, 1 of 52, 3 of 55, 1 of 56, 3 of 56). These are minutes too full to hold a goal, its kick off and
 *    the next chance, where the next chance has waited as long as it may. One in 12 (21) is twice the
 *    measured; before chances took turns it was 42 of 91 with no full kick off, and with the beat of kick
 *    off taken out again (control restartbeat) it is far over.
 *  The closing check of 2026-10-08 read those kick offs with the review's own measure (a kick off under 0.6 of
 *  the clock is short) and found that a beat was all most of them had: 42 of 91 short. Since then the kick
 *  off comes before the next shooter's lead: a chance in the very next minute waits as long as it may and
 *  leaves it PITCH_HELD (which is KICKOFF_HELD), a chance two minutes on leaves it 0.70, and anything later
 *  leaves it whole. R6 now tells four lengths apart, holds the share that is KICKOFF_HELD or more, and asks
 *  every shorter one for its reason. Measured on the 200 half feeds, 262 goals with play left after them:
 *  - whole (0.76 or more) 143, KICKOFF_HELD or more but not whole 80, a beat or more 29, under a beat 9, none
 *    because the last kick's wind up came first 1; 0.662 of the clock on average.
 *  - KICKOFF_HELD or more: 223 of 262, 85.1 percent (per seed 35 of 43, 45 of 52, 44 of 55, 52 of 56, 47 of
 *    56). With the kick off taken out of the turns again (control restartbeat) the same material gives 143
 *    of 262, 54.6 percent. The floor is 75 percent: ten points (26 goals) under the measured share, which is
 *    more than four times the 2.2 points a share counted on 262 goals moves by chance, and twenty points
 *    over what the rule gives when it is broken.
 *  - under KICKOFF_HELD: 39 (per seed 8 7 11 4 9). The goal itself had to wait 31, the next chance was
 *    squeezed from behind 6, the period was ending 2, none of these 0. That last count is a hard rule. The
 *    material must hold 19 of them (half the measured) for the rule to have been read at all.
 *  The whole kick offs are counted and printed, not held to a share: with the kick off taken out of the
 *  turns that count hardly moves (139 against 143), so a bound on it would guard nothing. */
const R6_OVERLAP_ONE_IN = 50;
const R6_NO_LEAD_ONE_IN = 10;
const R6_SHORT_KICKOFF_ONE_IN = 12;
/** The review's line between a short kick off and a full one: both sides have walked back to their own halves
 *  (the hook's walk lasts 0.3) and that picture has stood for as long again. */
const KICKOFF_HELD = 0.6;
const R6_HELD_KICKOFF_SHARE = 0.75;
const R6_UNDER_HELD_FLOOR = 19;
/** R7. How many of each kind of dead ball the material must hold for the rule to have been read at all: each
 *  floor is about half of what the 200 halves hold (opening 200, restart 261, corner 693, throw in 1,144, free
 *  kick 999, goal kick 931, keeper 475), so a data release can move them and an emptied rule can not pass. */
const R7_FLOOR: Record<DeadKind, number> = { opening: 199, restart: 130, corner: 350, throwin: 570, freekick: 500, goalkick: 460, keeper: 240 };
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
    /* A sample floor, not a band: 200 halves stage about 20,000 stretches (20,829 before chances waited their
       turn, 20,534 since), and a data release that moves the number of chances moves this a few percent. */
    expect(scenes).toBeGreaterThan(15000);
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
    const chances = total(t => t.chances), waited = total(t => t.waited);
    console.log(`[1101 R6] chances staged ${chances}; holder offenders ${total(t => t.holderOffenders)}, steady offenders ${total(t => t.steadyOffenders)}, follow up offenders ${total(t => t.followOffenders)}; a miss or a save followed by its goal kick or its keeper ${total(t => t.followSeen)}, led straight on to the next chance ${total(t => t.ledOn)}; set aside and counted: no lead in ${total(t => t.noLead)}, started from a kick off picture ${total(t => t.underKickoff)}, the last kick of the period ${total(t => t.lastKick)}`);
    console.log(`[1101 R6 turns] chances that waited for their turn ${waited} of ${chances}, by ${(total(t => t.lateSum) / Math.max(1, waited)).toFixed(2)} on average, later than ${PITCH_LATE} ${total(t => t.lateOffenders)}; still playing when the next one starts ${total(t => t.overlapped)} (per seed ${m.seeds.map(t => t.overlapped).join(' ')}), by more than a tenth of a minute ${total(t => t.overlapOffenders)}`);
    const restarts = total(t => t.goalsToRestart), whole = total(t => t.kickoffWhole), heldOrMore = whole + total(t => t.kickoffHeld);
    console.log(`[1101 R6 kick offs] goals with play left after them ${restarts}: kick off seen whole (${PITCH_KICKOFF} or more) ${whole}, for ${KICKOFF_HELD} or more ${total(t => t.kickoffHeld)}, for a beat or more ${total(t => t.kickoffSeen)}, cut under a beat by the next chance ${total(t => t.kickoffShort)}, none because the last kick's wind up came first ${total(t => t.beforeLastKick)}; on average ${(total(t => t.kickoffSum) / Math.max(1, restarts)).toFixed(3)} of the clock; ${KICKOFF_HELD} or more per seed ${m.seeds.map(t => `${t.kickoffWhole + t.kickoffHeld} of ${t.goalsToRestart}`).join(', ')}; whole per seed ${m.seeds.map(t => `${t.kickoffWhole} of ${t.goalsToRestart}`).join(', ')}; under a beat per seed ${m.seeds.map(t => `${t.kickoffShort + t.beforeLastKick} of ${t.goalsToRestart}`).join(', ')}; no lead in per seed ${m.seeds.map(t => `${t.noLead} of ${t.chances}`).join(', ')}`);
    expect(chances).toBeGreaterThan(1000);
    expect(total(t => t.holderOffenders)).toBe(0);
    expect(total(t => t.steadyOffenders)).toBe(0);
    expect(total(t => t.followOffenders)).toBe(0);
    /* One action at a time, and each inside its own minute. */
    expect(waited).toBeGreaterThan(100);
    expect(total(t => t.lateOffenders)).toBe(0);
    expect(total(t => t.overlapped) * R6_OVERLAP_ONE_IN).toBeLessThan(chances);
    expect(total(t => t.overlapOffenders)).toBe(0);
    expect(total(t => t.noLead) * R6_NO_LEAD_ONE_IN).toBeLessThan(chances);
    /* A goal gets its kick off: seen for a beat or more, but for the few minutes too full to hold one. */
    expect(total(t => t.goalsToRestart)).toBeGreaterThan(100);
    expect(heldOrMore + total(t => t.kickoffSeen + t.kickoffShort + t.beforeLastKick)).toBe(restarts);
    expect(total(t => t.kickoffShort + t.beforeLastKick) * R6_SHORT_KICKOFF_ONE_IN).toBeLessThan(restarts);
    /* And it is a kick off that can be read: on for KICKOFF_HELD or more after most goals. A soft
       assertion, so that a run in which it fails still reads the rule below it (control kickoffturn turns
       both red, and its log shows both). */
    expect.soft(heldOrMore).toBeGreaterThanOrEqual(R6_HELD_KICKOFF_SHARE * restarts);
    /* And a shorter one always has its reason: the minutes around that goal were too full. */
    console.log(`[1101 R6 short kick offs] under ${KICKOFF_HELD}: ${total(t => t.underHeld)} of ${restarts} (per seed ${m.seeds.map(t => t.underHeld).join(' ')}); the goal itself had to wait ${total(t => t.goalWaited)}, the next chance was squeezed from behind ${total(t => t.nextSqueezed)}, the period was ending ${total(t => t.periodEnd)}, none of these ${total(t => t.underHeldOffenders)}${m.seeds.flatMap(t => t.underHeldExamples).map(example => ` | ${example}`).slice(0, 5).join('')}`);
    expect(total(t => t.underHeld)).toBeGreaterThanOrEqual(R6_UNDER_HELD_FLOOR);
    expect(total(t => t.underHeldOffenders)).toBe(0);
  }, LONG);

  it('R7: every dead ball is taken by the right side from the right place', () => {
    const m = buildMaterial();
    const kinds: DeadKind[] = ['opening', 'restart', 'corner', 'throwin', 'freekick', 'goalkick', 'keeper'];
    const count = (kind: DeadKind) => sum(m.seeds.map(t => t.dead[kind]));
    const offenders = sum(m.seeds.map(t => t.deadOffenders)), flanked = sum(m.seeds.map(t => t.flanked));
    console.log(`[1101 R7] dead balls read against their own line of the feed: ${kinds.map(kind => `${kind} ${count(kind)}`).join(', ')}; corners whose line names a flank ${flanked}; taken by a stand in because that side has no keeper on ${sum(m.seeds.map(t => t.standIns))}; offenders ${offenders}${offenders ? `; first cases: ${m.seeds.flatMap(t => t.deadExamples).slice(0, 4).join(' | ')}` : ''}`);
    /* Nothing passes on an empty sample: every kind of dead ball is in the material, many times over. */
    expect(count('opening')).toBe(200);
    for (const kind of kinds) expect(count(kind), kind).toBeGreaterThan(R7_FLOOR[kind]);
    expect(flanked).toBeGreaterThan(R7_FLOOR.corner / 2);
    /* A stand in is the rare case, never the rule: the keeper rule above is read on all the rest. */
    expect(sum(m.seeds.map(t => t.standIns)) * 20).toBeLessThan(count('goalkick') + count('keeper'));
    expect(offenders).toBe(0);
  }, LONG);

  it('R8: the pitch is handed the right kick off and the right share of the ball', () => {
    const m = buildMaterial();
    const total = (pick: (t: SeedTally) => number) => sum(m.seeds.map(pick));
    console.log(`[1101 R8] halves handed to the pitch ${total(t => t.handed)} (${total(t => t.awayHalves)} of them away from home, ${total(t => t.unevenShares)} with a share of the ball that is not 50); kick off offenders ${total(t => t.kickHandOffenders)}, share offenders ${total(t => t.shareOffenders)}`);
    expect(total(t => t.handed)).toBe(200);
    /* Both kinds of match are in it, and shares a swap would show on. */
    expect(total(t => t.awayHalves)).toBeGreaterThan(40);
    expect(total(t => t.handed) - total(t => t.awayHalves)).toBeGreaterThan(40);
    expect(total(t => t.unevenShares)).toBeGreaterThan(100);
    expect(total(t => t.kickHandOffenders)).toBe(0);
    expect(total(t => t.shareOffenders)).toBe(0);
  }, LONG);

  /* R9, the closing check of 2026-10-08. The kick off after a goal on feeds made by hand, each instant the
     rule's own arithmetic and no statistic: how long the kick off is on, when the next chance starts and how
     long its shooter has had the ball by then. */
  it('R9: a goal gets its kick off before the next chance is led in', () => {
    const eleven = (tag: string): PitchFigure[] => [
      { key: `${tag}k`, line: 'keeper', slot: { x: 50, y: 90 } },
      ...[20, 40, 60, 80].map((x, i): PitchFigure => ({ key: `${tag}d${i}`, line: 'defence', slot: { x, y: 72 } })),
      ...[25, 50, 75].map((x, i): PitchFigure => ({ key: `${tag}m${i}`, line: 'midfield', slot: { x, y: 50 } })),
      ...[25, 50, 75].map((x, i): PitchFigure => ({ key: `${tag}a${i}`, line: 'attack', slot: { x, y: 26 }, name: `${tag} forward ${i}` })),
    ];
    const line = (minute: number, kind: 'goal' | 'save' | 'shot', by: 'me' | 'opp'): PitchInput['feed'][number] => ({ minute, side: by, kind, text: `${by === 'me' ? 'm' : 't'} forward 1` });
    const read = (feed: PitchInput['feed']) => {
      const plan = pitchPlan({ mine: eleven('m'), theirs: eleven('t'), feed, span: { from: 0, to: 45 }, kickoffs: [{ at: 0, side: 'me' }], possession: 0.5, seed: 7 });
      expect(plan.actions.length).toBe(feed.length);
      return plan.actions.map((a, n) => {
        const after = a.at + ACTION_SPAN;
        const next = plan.actions[n + 1];
        const entry = pitchBeatAt(plan, after + 1e-6);
        /* The kick off: from the instant the action ends until the next shooter's stretch starts. */
        const kickoff = entry.state === 'kickoff' && Math.abs(entry.start - after) < 1e-6 ? Math.min(entry.end, next ? Math.max(next.at, after) : entry.end) - after : 0;
        /* The lead in: how long the stretch that carries this action has been on when it starts. */
        const own = pitchBeatAt(plan, a.at + 1e-6);
        return { at: a.at, late: a.at - a.event.minute, kickoff, led: own.via === 'carrier' ? a.at - own.start : 0, kicking: entry.side, over: !next || next.at >= after - 1e-9 };
      });
    };
    const near = (value: number, wanted: number) => expect(Math.abs(value - wanted), `${value} against ${wanted}`).toBeLessThan(1e-5);
    /* Nothing near it: the whole kick off, taken by the side that conceded. */
    const alone = read([line(10, 'goal', 'me')]);
    near(alone[0].at, 10);
    expect(alone[0].kickoff).toBeGreaterThanOrEqual(PITCH_KICKOFF - 1e-6);
    expect(alone[0].kicking).toBe('opp');
    /* A chance three minutes on is on time and has its full lead. */
    const three = read([line(10, 'goal', 'me'), line(13, 'save', 'opp')]);
    near(three[1].at, 13);
    near(three[1].led, PITCH_LEAD);
    expect(three[0].kickoff).toBeGreaterThanOrEqual(PITCH_KICKOFF - 1e-6);
    /* Two minutes on: it is on time, its shooter has the ball for PITCH_SQUEEZE and the kick off has the
       rest, 0.70 of its 0.76. */
    const two = read([line(10, 'goal', 'me'), line(12, 'save', 'opp')]);
    near(two[1].at, 12);
    near(two[1].led, PITCH_SQUEEZE);
    near(two[0].kickoff, 2 - ACTION_SPAN - PITCH_SQUEEZE);
    expect(two[0].kickoff).toBeGreaterThanOrEqual(KICKOFF_HELD - 1e-6);
    /* In the very next minute: it waits as long as it may, the shooter keeps PITCH_SQUEEZE and the kick off
       has the rest, which is KICKOFF_HELD. */
    const one = read([line(10, 'goal', 'me'), line(11, 'save', 'opp')]);
    near(one[1].at, 11 + PITCH_LATE);
    near(one[1].led, PITCH_SQUEEZE);
    near(one[0].kickoff, PITCH_HELD);
    /* And PITCH_HELD is the review's line, not under it. */
    expect(PITCH_HELD).toBeGreaterThanOrEqual(KICKOFF_HELD - 1e-9);
    expect(one[0].kickoff).toBeGreaterThanOrEqual(KICKOFF_HELD - 1e-6);
    /* Two goals in two minutes: the second has its own whole kick off. */
    const twoGoals = read([line(10, 'goal', 'me'), line(11, 'goal', 'opp')]);
    expect(twoGoals[0].kickoff).toBeGreaterThanOrEqual(KICKOFF_HELD - 1e-6);
    expect(twoGoals[1].kickoff).toBeGreaterThanOrEqual(PITCH_KICKOFF - 1e-6);
    expect(twoGoals[1].kicking).toBe('me');
    /* Minutes too full: a goal and two chances, then three goals, in three minutes. Nothing plays under
       anything else, and a goal that is not the last of them still has its beat of kick off. */
    const full = read([line(10, 'goal', 'me'), line(11, 'save', 'opp'), line(12, 'save', 'me')]);
    expect(full.every(a => a.over)).toBe(true);
    expect(full[0].kickoff).toBeGreaterThanOrEqual(PITCH_RESTART - 1e-6);
    near(full[1].led, PITCH_SQUEEZE);
    const fuller = read([line(10, 'goal', 'me'), line(11, 'goal', 'opp'), line(12, 'shot', 'me')]);
    expect(fuller.every(a => a.over)).toBe(true);
    expect(fuller[0].kickoff).toBeGreaterThanOrEqual(PITCH_RESTART - 1e-6);
    expect(fuller[1].kickoff).toBeGreaterThanOrEqual(PITCH_RESTART - 1e-6);
    /* And every one of them still starts inside its own minute. */
    for (const plan of [alone, three, two, one, twoGoals, full, fuller]) for (const a of plan) { expect(a.late).toBeGreaterThanOrEqual(-1e-9); expect(a.late).toBeLessThanOrEqual(PITCH_LATE + 1e-9); }
  });
});

/* Round 1521, on the same 200 half feeds (the header of replay1521 says what each reads). The floors are about
   half of what the material holds, so a data release can move them and an emptied rule can not pass; the
   bands are the measured numbers with their headroom, written beside each. */
const totals1521 = (pick: (t: Tally1521) => number) => sum(buildMaterial().looks.map(pick));
const R10_FLOOR = { ground: 4000, air: 400, cross: 250, throw: 400 } as const;
/* R12, set from the five seeds on a GitHub runner at the shares in scene.ts's BUILD (r1521-sw1, cfgD; the bars sit
   under the least of the five): forward over back at least 2.14 times in every arm (defensive seed 1), all passes
   attacking over defensive 0.035 to 0.082, with a line ahead each step 0.105 to 0.157, resets per possession each
   step 0.050 to 0.110. */
const R12_RATIO = 1.8;
const R12_STEP = 0.02;
const R12_AHEAD_STEP = 0.05;
const R12_RESET_STEP = 0.02;
describe('Round 1521: the live match looks like football', () => {
  it('R10: the ball travels with height and lands at its man, and every chance rises and comes down in the right net', () => {
    const m = buildMaterial();
    const passes = (k: keyof Tally1521['passes']) => totals1521(t => t.passes[k]);
    console.log(`[1521 R10] passes drawn: on the grass ${passes('ground')}, in the air ${passes('air')}, crosses ${passes('cross')}, throws ${passes('throw')}; on the grass but lifted ${totals1521(t => t.liftedGround)}, in the air but never rose ${totals1521(t => t.flatAerial)}, not landing at their man ${totals1521(t => t.landOffenders)}; chances read: first halves ${totals1521(t => t.shots.first)}, second halves ${totals1521(t => t.shots.second)}, offenders ${totals1521(t => t.shotOffenders)}${m.looks.flatMap(t => t.shotExamples).slice(0, 3).map(s => ` | ${s}`).join('')}`);
    for (const k of ['ground', 'air', 'cross', 'throw'] as const) expect(passes(k), k).toBeGreaterThan(R10_FLOOR[k]);
    expect(totals1521(t => t.liftedGround)).toBe(0);
    expect(totals1521(t => t.flatAerial)).toBe(0);
    expect(totals1521(t => t.landOffenders)).toBe(0);
    /* Both halves, so both ends of the pitch, are read many times over. */
    expect(totals1521(t => t.shots.first)).toBeGreaterThan(500);
    expect(totals1521(t => t.shots.second)).toBeGreaterThan(500);
    expect(totals1521(t => t.shotOffenders)).toBe(0);
  }, LONG);

  it('R11: every foul the plan stages is seen at its own place, on the right two men, with only the card the feed gave', () => {
    const m = buildMaterial();
    const fouls = totals1521(t => t.fouls), cues = totals1521(t => t.cues);
    console.log(`[1521 R11] foul lines staged ${fouls}, with their cue ${cues} (${(cues / Math.max(1, fouls)).toFixed(3)}; per seed ${fixed(m.looks.map(t => t.cues / Math.max(1, t.fouls)), 3)}), of them waiting inside their minute ${totals1521(t => t.waited)}, under a stretch that outranks them ${totals1521(t => t.hidden)}, with no such reason ${totals1521(t => t.hiddenOffenders)}; cue offenders ${totals1521(t => t.cueOffenders)}; named on the grass ${totals1521(t => t.named)}, meetings read ${totals1521(t => t.contacts)}, apart ${totals1521(t => t.contactOffenders)}; cards in the feed ${totals1521(t => t.cardLines)}, carded cues ${totals1521(t => t.carded)}, card offenders ${totals1521(t => t.cardOffenders)}; fouls the stats count ${totals1521(t => t.statFouls)}, halves where the feed and the stats differ ${totals1521(t => t.statOffenders)}${m.looks.flatMap(t => t.foulExamples).slice(0, 4).map(s => ` | ${s}`).join('')}`);
    expect(fouls).toBeGreaterThan(1500);
    expect(cues * 2).toBeGreaterThan(fouls);
    expect(totals1521(t => t.cueOffenders)).toBe(0);
    expect(totals1521(t => t.hiddenOffenders)).toBe(0);
    expect(totals1521(t => t.named)).toBeGreaterThan(cues / 4);
    expect(totals1521(t => t.contacts)).toBeGreaterThan(cues / 4);
    expect(totals1521(t => t.contactOffenders)).toBe(0);
    expect(totals1521(t => t.carded)).toBeGreaterThan(40);
    expect(totals1521(t => t.cardOffenders)).toBe(0);
    expect(totals1521(t => t.statFouls)).toBe(fouls);
    expect(totals1521(t => t.statOffenders)).toBe(0);
  }, LONG);

  it('R12: an attack builds by lines, more directly the more attacking the side, and goes back only as a reset', () => {
    const m = buildMaterial();
    const share = (a: BuildArm, k: 'forward' | 'back') => a[k] / Math.max(1, a.forward + a.level + a.back);
    const per = (arm: Arm1521, k: 'forward' | 'back') => m.looks.map(t => share(t.arms[arm], k));
    const all = (pick: (a: BuildArm) => number) => ARMS_1521.map(([arm]) => `${arm} ${totals1521(t => pick(t.arms[arm]))}`).join(', ');
    const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
    const press = m.looks.flatMap(t => t.pressGap), calm = m.looks.flatMap(t => t.calmGap);
    /* Where there is a line ahead to play into (behind the front line), the share of passes that go up it. */
    const ahead = (arm: Arm1521) => m.looks.map(t => t.arms[arm].behindForward / Math.max(1, t.arms[arm].behind));
    const resets = (arm: Arm1521) => m.looks.map(t => t.arms[arm].back / Math.max(1, t.arms[arm].possessions));
    console.log(`[1521 R12] my possessions ${all(a => a.possessions)}; passes inside one: forward ${all(a => a.forward)}, across ${all(a => a.level)}, back ${all(a => a.back)}; forward share per seed: ${ARMS_1521.map(([arm]) => `${arm} ${fixed(per(arm, 'forward'), 3)}`).join('; ')}; back share per seed: ${ARMS_1521.map(([arm]) => `${arm} ${fixed(per(arm, 'back'), 3)}`).join('; ')}; from behind the front line ${all(a => a.behind)}, forward share per seed: ${ARMS_1521.map(([arm]) => `${arm} ${fixed(ahead(arm), 3)}`).join('; ')}; resets per possession per seed: ${ARMS_1521.map(([arm]) => `${arm} ${fixed(resets(arm), 3)}`).join('; ')}; by reason: press ${all(a => a.resets.press)}, switch ${all(a => a.resets.switch)}; back with no reason ${all(a => a.unreasoned)}, switches not across ${all(a => a.switchOffenders)}, pressure not drawn ${all(a => a.pressOffenders)}; nearest man to the ball: pressed ${median(press).toFixed(2)} (${press.length}), not pressed ${median(calm).toFixed(2)} (${calm.length}); chances with the feeder drawn ${totals1521(t => t.chains)}, with the man before him too ${totals1521(t => t.deepChains)}, out of order ${totals1521(t => t.chainOffenders)}`);
    for (const [arm] of ARMS_1521) {
      expect(totals1521(t => t.arms[arm].possessions), arm).toBeGreaterThan(1000);
      expect(totals1521(t => t.arms[arm].unreasoned), arm).toBe(0);
      expect(totals1521(t => t.arms[arm].switchOffenders), arm).toBe(0);
      expect(totals1521(t => t.arms[arm].pressOffenders), arm).toBe(0);
      /* Both reasons are read, many times. */
      expect(totals1521(t => t.arms[arm].resets.press), arm).toBeGreaterThan(50);
      expect(totals1521(t => t.arms[arm].resets.switch), arm).toBeGreaterThan(50);
      for (let s = 0; s < m.looks.length; s++) expect(per(arm, 'forward')[s], `${arm} seed ${s}`).toBeGreaterThan(R12_RATIO * per(arm, 'back')[s]);
    }
    /* More directly, the more attacking, per seed. Where there is a line ahead to play into, each step of mentality
       moves the share that goes up it by more than R12_AHEAD_STEP; of all the passes, attacking goes forward more
       than defensive by more than R12_STEP (not each step: a direct side reaches its front line sooner, where there
       is no line ahead and the ball is kept across it, so the share of all passes rises slowly); and each step takes
       more than R12_RESET_STEP off the resets per possession. */
    for (let s = 0; s < m.looks.length; s++) {
      expect(per('attacking', 'forward')[s] - per('defensive', 'forward')[s], `seed ${s}`).toBeGreaterThan(R12_STEP);
      expect(ahead('attacking')[s] - ahead('balanced')[s], `ahead, seed ${s}`).toBeGreaterThan(R12_AHEAD_STEP);
      expect(ahead('balanced')[s] - ahead('defensive')[s], `ahead, seed ${s}`).toBeGreaterThan(R12_AHEAD_STEP);
      expect(resets('defensive')[s] - resets('balanced')[s], `resets, seed ${s}`).toBeGreaterThan(R12_RESET_STEP);
      expect(resets('balanced')[s] - resets('attacking')[s], `resets, seed ${s}`).toBeGreaterThan(R12_RESET_STEP);
    }
    /* Pressure is drawn: the man the reset comes after is closed down far tighter than a man on the ball usually is. */
    expect(press.length).toBeGreaterThan(50);
    expect(median(press)).toBeLessThan(median(calm) - 2);
    expect(totals1521(t => t.chains)).toBeGreaterThan(500);
    expect(totals1521(t => t.deepChains)).toBeGreaterThan(250);
    expect(totals1521(t => t.chainOffenders)).toBe(0);
  }, LONG);
});

describe('Round 1521 by hand, and through the viewer', () => {
  const man = (key: string, x: number, y: number, keeper = false) => ({ key, keeper, x, y });
  const at = (x: number, y: number, flight?: string) => ({ mine: [man('m1', x, y)], theirs: [man('o1', 50, 50)], ball: { x: x + 1.6, y: y - 2.2 }, holderKey: 'm1', ...(flight ? { flight } : {}) });
  it('R10 by hand: a pass on the grass stays on it, a long ball and a cross rise and land, and a shot carries higher the further out it is struck', () => {
    const from = at(30, 80);
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(between(from, at(40, 70, 'ground'), t).lift, `ground at ${t}`).toBeUndefined();
      expect(between(from, at(40, 70), t).lift, `no flight at ${t}`).toBeUndefined();
    }
    for (const kind of ['air', 'cross', 'throw']) {
      const to = at(75, 30, kind);
      const lifts = [0, 0.25, 0.5, 0.75, 1].map(t => between(from, to, t).lift ?? 0);
      expect(lifts[0], kind).toBe(0);
      expect(lifts[4], kind).toBe(0);
      expect(lifts[2], kind).toBeCloseTo(flightPeak(kind, apart(from.ball, to.ball)), 6);
      expect(lifts[1] < lifts[2] && lifts[3] < lifts[2], kind).toBe(true);
    }
    /* A long ball goes higher the further it goes, up to its ceiling. */
    expect(flightPeak('air', 20)).toBeLessThan(flightPeak('air', 40));
    expect(flightPeak('ground', 60)).toBe(0);
    const peak = (reach: number, line: Record<string, unknown>) => Math.max(...Array.from({ length: 21 }, (_, i) => shotLift({ minute: 20, side: 'me', kind: 'goal', text: '', ...line }, reach, i / 20, 0)));
    expect(peak(12, {})).toBeLessThan(peak(24, {}));
    expect(peak(24, {})).toBeLessThan(peak(36, {}));
    /* Over the wall from a direct free kick, flat from the spot. */
    expect(peak(30, { freeKick: true })).toBeGreaterThan(peak(30, {}));
    expect(peak(12, { penalty: true })).toBeLessThan(peak(30, { freeKick: true }));
    /* On the foot at the plant and back on the grass at the end of every chance: the still form has no flight. */
    for (const kind of ['goal', 'save', 'shot'] as const) {
      const action = { event: { minute: 20, side: 'me' as const, kind, text: 'Home striker' }, key: kind, at: 0 };
      expect(actionFrame(scene, action, 0).lift, kind).toBe(0);
      expect(actionFrame(scene, action, 0.55).lift, kind).toBeGreaterThan(0.2);
      expect(actionFrame(scene, action, ACTION_SPAN).lift, kind).toBe(0);
    }
  });

  it('R13: every figure is his own generic person, a keyed draw from his id and never from his name or nationality', () => {
    const looks = Array.from({ length: 300 }, (_, i) => figureLook(`p:${i}`));
    expect(figureLook('p:7')).toEqual(figureLook('p:7'));
    const kinds = new Set(looks.map(l => `${l.skin}|${l.style}|${l.hair}|${l.boots}`));
    console.log(`[1521 R13] 300 ids: ${kinds.size} different looks (skin, hair style, hair colour, boots), heights ${Math.min(...looks.map(l => l.tall))} to ${Math.max(...looks.map(l => l.tall))}`);
    expect(kinds.size).toBeGreaterThan(240);
    for (const skin of SKIN_TONES) expect(looks.some(l => l.skin === skin), skin).toBe(true);
    for (const hair of HAIR_COLOURS) expect(looks.some(l => l.hair === hair), hair).toBe(true);
    for (const boots of BOOT_COLOURS) expect(looks.some(l => l.boots === boots), boots).toBe(true);
    for (let style = 0; style < HAIR_STYLES; style++) expect(looks.some(l => l.style === style), `style ${style}`).toBe(true);
    expect(looks.every(l => l.tall >= 0.92 && l.tall <= 1.08)).toBe(true);
    /* Whose look: mine by id, theirs by club and teamsheet place. Renamed, or from another country, he is the same man. */
    const mine = { id: 'cm-123', side: 'me' as const, number: 9, key: 'm8', name: 'First Name', nationality: 'England' };
    const renamed = { ...mine, name: 'Second Name', nationality: 'Brazil' };
    const other = { ...mine, id: 'cm-124' };
    expect(lookKeyOf(renamed, 'Club', 'Opponent')).toBe(lookKeyOf(mine, 'Club', 'Opponent'));
    expect(lookKeyOf(other, 'Club', 'Opponent')).not.toBe(lookKeyOf(mine, 'Club', 'Opponent'));
    const theirs = { side: 'opp' as const, number: 4, key: 'o3', name: 'Third Name', nationality: 'Spain' };
    const theirsRenamed = { ...theirs, name: 'Fourth Name', nationality: 'Japan' };
    expect(lookKeyOf(theirsRenamed, 'Club', 'Opponent')).toBe(lookKeyOf(theirs, 'Club', 'Opponent'));
    expect(lookKeyOf({ ...theirs, number: 5 }, 'Club', 'Opponent')).not.toBe(lookKeyOf(theirs, 'Club', 'Opponent'));
  });

  /** The parts of a drawn figure that are his look: the style, the skin, the boots, and the keeper's shirt. */
  const lookOf = (svg: Element) => [svg.getAttribute('data-pm-look'), svg.querySelector('ellipse[cy="-20"]')?.getAttribute('fill'), svg.querySelectorAll('g > path')[1]?.getAttribute('stroke'), svg.querySelectorAll('g > path')[2]?.getAttribute('stroke')].join('|');
  it('the viewer draws each man in his own look, the two keepers apart, and a renamed man the same', async () => {
    const career = structuredClone(fixtures.get('goal')!.career);
    const first = mount(career);
    await step(50);
    const mineSvgs = [...first.container.querySelectorAll('[data-cm-dot] svg')];
    const theirSvgs = [...first.container.querySelectorAll('[data-cm-dot-opp] svg')];
    expect(mineSvgs.length).toBeGreaterThan(8);
    expect(theirSvgs.length).toBeGreaterThan(8);
    expect([...mineSvgs, ...theirSvgs].every(svg => svg.hasAttribute('data-pm-look'))).toBe(true);
    expect(new Set([...mineSvgs, ...theirSvgs].map(lookOf)).size).toBeGreaterThan(16);
    const keeperShirt = (svgs: Element[]) => svgs.filter(svg => svg.querySelector('circle[fill="#fff2d3"]')).map(svg => svg.querySelectorAll('g > path')[2]?.getAttribute('stroke'));
    expect(keeperShirt(mineSvgs)).toEqual(['#f0b34b']);
    expect(keeperShirt(theirSvgs)).toEqual([OPP_KEEPER]);
    const dot = first.container.querySelector('[data-cm-dot]:not([data-cm-captain])')!;
    const id = dot.getAttribute('data-cm-dot')!;
    const before = lookOf(dot.querySelector('svg')!);
    first.unmount();
    const again = structuredClone(career);
    again.squad.find(p => p.id === id)!.name = 'Renamed Somebody';
    const second = mount(again);
    await step(50);
    expect(lookOf(second.container.querySelector(`[data-cm-dot="${id}"] svg`)!)).toBe(before);
  });

  it('the ball leaves the grass on a chance, its element staying where it always was, and never under reduced motion', async () => {
    const read = async (reduced: boolean) => {
      const original = window.matchMedia;
      const spy = vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...original(query), matches: reduced }));
      const { container, unmount } = mount(structuredClone(fixtures.get('goal')!.career));
      let lifted = 0, frames = 0, inPlace = true;
      for (let ms = 0; ms < 1800; ms += 40) {
        await step(40);
        const ball = container.querySelector<HTMLElement>('[data-cm-ball]')!;
        frames++;
        if (ball.hasAttribute('data-cm-ball-lift')) {
          lifted++;
          /* The ball's own element keeps its place on the grass: only its two drawn parts move. */
          if (!ball.querySelector('.cm-live-ball-air') || !ball.querySelector('.cm-live-ball-shadow') || /transform/.test(ball.getAttribute('style') ?? '')) inPlace = false;
        } else if (ball.children.length) inPlace = false;
      }
      unmount();
      spy.mockRestore();
      return { lifted, frames, inPlace };
    };
    const moving = await read(false);
    const still = await read(true);
    console.log(`[1521 lift] frames with the ball off the grass: ${moving.lifted} of ${moving.frames}, under reduced motion ${still.lifted} of ${still.frames}`);
    expect(moving.lifted).toBeGreaterThan(2);
    expect(moving.inPlace).toBe(true);
    expect(still.lifted).toBe(0);
    expect(still.inPlace).toBe(true);
  }, 60000);

  it('a foul is seen at its minute: the whistle and the name over its spot, and the ball goes up only when it should', async () => {
    /* The foul is one the plan the viewer will draw gives its whistle (worked out here exactly as the screen hands
       it over, opened where this test opens it), in the first half, with no goal near it to hold the clock. */
    let career: CareerState | null = null;
    let foul: LiveFeedEvent | undefined;
    for (const kind of ['shot', 'goal', 'save']) {
      const candidate = structuredClone(fixtures.get(kind)!.career);
      const feed = liveFeed(candidate.live!);
      foul = feed.find(e => {
        if (e.kind !== 'foul' || e.plus || e.side === 'none' || e.minute < 4 || e.minute > 40) return false;
        if (feed.some(g => g.kind === 'goal' && placeOfLine(g) >= e.minute - 3 && placeOfLine(g) <= e.minute + 1)) return false;
        /* and no other foul in the stretch the test watches before it, so the first whistle seen is this one's. */
        if (feed.some(g => g !== e && g.kind === 'foul' && placeOfLine(g) >= e.minute - 2.2 && placeOfLine(g) <= e.minute)) return false;
        const opened = e.minute - 1.2;
        const input: PitchInput = stagePitchInput(candidate, candidate.live!, null, 'first', opened, 0, 45 + boardAt(candidate, 45), opened);
        /* Each call of liveFeed makes its lines afresh, so the foul is found by what it is, not by identity. */
        const order = input.feed.findIndex(x => x.kind === 'foul' && x.minute === e.minute && (x.plus ?? 0) === (e.plus ?? 0) && x.side === e.side && x.text === e.text);
        const plan = pitchPlan(input);
        return order >= 0 && plan.entries.some(b => b.foul?.order === order && pitchScene(plan, b.start).cue?.order === order);
      });
      if (foul) { career = candidate; break; }
    }
    expect(foul, 'a foul of the first half the plan gives its whistle').toBeDefined();
    const feed = liveFeed(career!.live!);
    career!.live!.minute = foul!.minute - 1.2;
    const { container } = mount(career!);
    let seen: { text: string; side: string | null; minute: string | null; card: string | null } | null = null;
    let lifted = 0;
    for (let ms = 0; ms < 4000 && !seen; ms += 40) {
      await step(40);
      if (container.querySelector('[data-cm-ball-lift]')) lifted++;
      const cue = container.querySelector('[data-pm-cue="foul"]');
      const label = container.querySelector('[data-cm-foul-cue]');
      if (cue && label) seen = { text: label.textContent ?? '', side: label.getAttribute('data-cm-foul-cue'), minute: container.querySelector('[data-cm-live-minute]')?.getAttribute('data-cm-live-minute') ?? null, card: cue.getAttribute('data-pm-cue-card') };
    }
    expect(seen, 'the whistle was never drawn').not.toBeNull();
    expect(seen!.minute).toBe(String(foul!.minute));
    const lines = feed.filter(e => e.kind === 'foul' && e.minute === foul!.minute && e.side === seen!.side);
    expect(lines.some(e => seen!.text.startsWith(`Foul by ${pitchName(e.text)}`)), seen!.text).toBe(true);
    const booked = feed.some(e => (e.kind === 'yellow' || e.kind === 'red') && e.minute === foul!.minute && lines.some(l => l.text === e.text));
    expect(seen!.card !== null).toBe(booked);
    console.log(`[1521 viewer] the foul at ${foul!.minute}': "${seen!.text}"${seen!.card ? ` with a ${seen!.card} card` : ''}; frames with the ball off the grass on the way ${lifted}`);
  }, 60000);
});

/* ─────────────────────────────────────────────────────────────────────────────────────────────
   Round 1101: the goal sequence, through the real viewer on real engine feeds. */
describe('The goal sequence', () => {
  it('the score waits for the ball and the card lands at net contact', async () => {
    const fixture = fixtures.get('goal')!;
    const career = structuredClone(fixture.career);
    const place = clockPos(fixture.event);
    const before = scoreBy(career, place - 1), after = scoreBy(career, place);
    expect(after).not.toBe(before);
    const mounted = mount(career);
    const pitch = () => mounted.container.querySelector('[data-cm-live-pitch]')!;
    const card = () => mounted.container.querySelector<HTMLButtonElement>('[data-cm-goal-card]');
    await step(430);
    /* The line has fired and the ball is on its way: the old score, and no card yet. */
    expect(pitch().getAttribute('data-cm-motion')).toBe('goal');
    expect(readScore(mounted.container)).toBe(before);
    expect(card()).toBeNull();
    await step(660);
    /* 1,090 ms in: the ball is in the net, the score has changed, the card is up with the scorer's line. */
    expect(pitch().getAttribute('data-cm-motion-phase')).toBe('net');
    expect(readScore(mounted.container)).toBe(after);
    expect(card()).not.toBeNull();
    expect(card()!.firstElementChild!.className).toContain('truncate');
    expect(card()!.firstElementChild!.textContent!.startsWith('GOAL!')).toBe(true);
    expect(card()!.firstElementChild!.textContent).toContain(fixture.event.text);
    /* The clock all but stops while the card is up: well over a second later the goal is still being shown.
       (At the default 2x the hold is 1.8 real seconds; without it the action would have ended 0.3 seconds in.) */
    await step(1400);
    expect(pitch().getAttribute('data-cm-motion')).toBe('goal');
    expect(card()).not.toBeNull();
    /* A tap carries on. */
    fireEvent.click(card()!);
    await step(48);
    expect(card()).toBeNull();
    expect(pitch().getAttribute('data-cm-motion')).toBe('pass');
    expect(readScore(mounted.container)).toBe(after);
    expect(mounted.callbacks.onChange).not.toHaveBeenCalled();
  }, 60000);

  it("the card's season count is the settled count", () => {
    vi.mocked(Math.random).mockImplementation(seeded(110177));
    let career = startCareer('Aston Villa');
    let checked = 0, matches = 0;
    for (let guard = 0; guard < 300 && checked < 8; guard++) {
      const next = playNextEntry(career);
      career = next.state;
      if (next.kind === 'seasonOver' || career.sacked) break;
      if (next.kind !== 'halftime' || !career.live) continue;
      const second = startSecondHalf(career)!;
      const feed = liveFeed(second.live!);
      /* What each of my goals' cards would print, read before the match is settled. */
      const cards = feed.filter(e => e.kind === 'goal' && e.side === 'me').map(e => ({ e, count: goalCardCount(second, feed, e) }));
      const done = resumeMatch(second);
      career = done.state;
      matches++;
      for (const { e, count } of cards) {
        const row = career.squad.find(p => p.name === e.text);
        if (!row || count.season === null) continue;
        /* His goals later in that match: all the settled report gives him, less the ones up to this card. */
        const later = (done.report?.myScorers ?? []).filter(line => line.name === e.text).length - count.nth;
        expect(later).toBeGreaterThanOrEqual(0);
        expect(count.season, `${e.text} at ${e.minute}'`).toBe(row.seasonGoals - later);
        checked++;
      }
    }
    console.log(`[1101 card] matches ${matches}, cards of mine checked against the settled squad row ${checked}`);
    expect(checked).toBeGreaterThanOrEqual(8);
  }, 120000);

  /* Skip fires every line still to come at once, late. The last chance of the half, when it is a goal, used
     to stay behind as the action on the pitch and was replayed when the second half opened, and a moment
     built from it would open the second half one goal short or under a card for a first half goal. */
  it('after Skip the second half opens on the right score, with no card and nothing replayed', async () => {
    const base = fixtures.get('goal')!.career;
    let first: CareerState | null = null;
    let second: CareerState | null = null;
    for (let attempt = 0; attempt < 3000 && !first; attempt++) {
      vi.mocked(Math.random).mockImplementation(seeded(110190 + attempt * 104729));
      const drawn = changeLive(base, 0, { kind: 'shape', mentality: 'balanced' })!;
      const board = boardAt(drawn, 45);
      const chances = liveFeed(drawn.live!).filter(e => e.minute <= 45 && ['goal', 'save', 'shot'].includes(e.kind));
      const last = chances[chances.length - 1];
      /* The last chance of the half is a goal, inside the forty five, and nothing is struck with the last kick. */
      if (!last || last.kind !== 'goal' || clockPos(last) > 45 || chances.some(e => clockPos(e) === 45 + board)) continue;
      /* A board of at least a minute. Skip fires that goal late, at the end of the board, and an action left
         alive would still be inside its 1.05 at the 46th minute only then: with no board it is over 0.05 into
         the second half and this test could not see it (the skipmoment control stayed green on such a half). */
      if (board < 1) continue;
      const next = startSecondHalf(structuredClone(drawn))!;
      /* And nothing real happens in the first two minutes of the second half, so what is on screen there is the restart. */
      if (liveFeed(next.live!).some(e => e.minute >= 46 && e.minute <= 47 && e.kind !== 'halftime')) continue;
      /* And both elevens are the same men all the way: at the first minute (the viewer opens there and Skip is
         pressed at once, so that is the picture the late line is started from), at the end of the board, and
         going back out. The part drops an action by itself when the line up under it changes, which would
         hide a late line left alive whatever the viewer did about it. */
      const eleven = (input: PitchInput) => JSON.stringify([input.mine, input.theirs].map(list => list.map(f => [f.key, f.name ?? ''])));
      const goingOut = eleven(stagePitchInput(next, next.live!, null, 'second', 46, 0, 90 + boardAt(next, 90)));
      if (eleven(stagePitchInput(drawn, drawn.live!, null, 'first', 1, 0, 45 + board)) !== goingOut) continue;
      if (eleven(stagePitchInput(drawn, drawn.live!, null, 'first', 45, board, 45 + board)) !== goingOut) continue;
      first = structuredClone(drawn);
      second = next;
    }
    expect(first, 'no seed ended a first half on a goal as its last chance').not.toBeNull();
    console.log(`[1101 skip] the half found: board ${boardAt(first!, 45)}, its last chance a goal at ${clockPos(liveFeed(first!.live!).filter(e => e.minute <= 45 && e.kind === 'goal').slice(-1)[0])}`);
    first!.live!.minute = 1;
    const callbacks = { onSub: vi.fn(), onShape: vi.fn(), onTalk: vi.fn(), onSecondHalf: vi.fn(), onExit: vi.fn(), onStartSecondHalf: vi.fn(), onStartExtraTime: vi.fn(), onChange: vi.fn(), onMark: vi.fn() };
    function Page() {
      const [career, setCareer] = useState<CareerState>(first!);
      return <LiveSimScreen career={career} live={career.live ?? null} report={null} clubColor="#86bced" {...callbacks}
        onStartSecondHalf={() => { callbacks.onStartSecondHalf(); setCareer(() => second!); }} />;
    }
    const mounted = render(<Page />);
    await step(160);
    fireEvent.click(mounted.getByRole('button', { name: /Skip/ }));
    await step(64);
    expect(stageOf(mounted.container)).toBe('interval');
    fireEvent.click(mounted.getByRole('button', { name: 'Second half' }));
    await step(64);
    expect(stageOf(mounted.container)).toBe('second');
    expect(callbacks.onStartSecondHalf).toHaveBeenCalledTimes(1);
    for (let waited = 0; waited < 800; waited += 100) {
      expect(readScore(mounted.container)).toBe(scoreAt(first!, 45));
      expect(mounted.container.querySelector('[data-cm-goal-card]')).toBeNull();
      expect(mounted.container.querySelector('[data-cm-live-pitch]')!.getAttribute('data-cm-motion')).toBe('pass');
      await step(100);
    }
  }, 120000);

  /* The review's findings on the sequence, each with a test that sees it. */
  it('nothing says GOAL before the ball is in: not the list beside the pitch, not the line under it', async () => {
    const fixture = fixtures.get('goal')!;
    const mounted = mount(structuredClone(fixture.career));
    /* This goal's own line on the list: its minute, the word, the scorer. (Earlier goals may be on the list already.) */
    const told = () => [...mounted.container.querySelectorAll('[data-cm-live-log] li')]
      .some(li => li.textContent!.startsWith(`${fixture.event.minute}'`) && li.textContent!.includes('GOAL!') && li.textContent!.includes(fixture.event.text));
    const under = () => mounted.container.querySelector('[data-cm-live-event]')!.textContent!;
    const card = () => mounted.container.querySelector<HTMLButtonElement>('[data-cm-goal-card]');
    await step(430);
    /* The line has fired and the ball is on its way: the list has not said it, and the line under the pitch
       says nothing else meanwhile (a corner of the same minute used to sit there through the whole goal). */
    expect(mounted.container.querySelector('[data-cm-live-pitch]')!.getAttribute('data-cm-motion-phase')).toBe('plant');
    expect(told()).toBe(false);
    expect(under()).toBe('');
    await step(660);
    /* In the net: the card, and with it the list and the line. */
    expect(card()).not.toBeNull();
    expect(told()).toBe(true);
    expect(under().startsWith('GOAL!')).toBe(true);
    expect(under()).toContain(fixture.event.text);
    /* The card sits in the half the goal did NOT go in, clear of the scorer and the men around him. */
    expect(card()!.className).toContain(fixture.event.side === 'me' ? 'top-[62%]' : 'top-[16%]');
    expect(card()!.className).not.toContain(fixture.event.side === 'me' ? 'top-[16%]' : 'top-[62%]');
  }, 60000);

  it('no frame draws the new score before the ball is in', async () => {
    const fixture = fixtures.get('goal')!;
    const side = fixture.event.side;
    const mounted = mount(structuredClone(fixture.career));
    const score = mounted.container.querySelector('[data-cm-live-score]')!;
    const was = score.querySelector(`[data-cm-score-of="${side}"]`)!.textContent!;
    /* Every digit React puts into the score, commit by commit: a frame that drew the new score and was
       corrected by an effect in the same tick leaves no trace in the page afterwards, only here. */
    const drawn: string[] = [];
    const digit = (node: Node | null) => (node instanceof Element && node.getAttribute('data-cm-score-of') === side ? node : null);
    /* The records are taken in the observer's own callback as well as on each read: a callback that drops
       them leaves takeRecords empty, and then this test can see nothing at all (it once did exactly that). */
    const collect = (records: MutationRecord[]) => {
      for (const record of records) {
        /* A new digit is a new element (it is keyed on its value); a changed text node inside one counts too. */
        for (const node of record.addedNodes) {
          const own = digit(node) ?? digit(node.parentElement);
          if (own) drawn.push(own.textContent ?? '');
        }
        if (record.type === 'characterData' && digit(record.target.parentElement)) drawn.push(record.target.textContent ?? '');
      }
    };
    const observer = new MutationObserver(collect);
    observer.observe(score, { childList: true, subtree: true, characterData: true });
    const read = () => collect(observer.takeRecords());
    const phase = () => mounted.container.querySelector('[data-cm-live-pitch]')!.getAttribute('data-cm-motion-phase');
    /* Frame by frame, from before the line fires (200 ms in) to just short of the net (956 ms in). */
    for (let ms = 0; ms < 928; ms += 16) { await step(16); read(); }
    expect(phase()).toBe('flight');
    expect(drawn.filter(text => text !== was)).toEqual([]);
    /* And once it is in, the new digit is drawn: on the very frame the pitch first reads net, not the frame
       before it. (The wait was once read off the plan's instant alone while the pitch counted from the tick the
       line fired on, and the score led the ball by one frame: a real browser saw it, this loop did not.) */
    const landedOn: (string | null)[] = [];
    for (let ms = 0; ms < 160; ms += 16) {
      const before = drawn.length;
      await step(16);
      read();
      if (drawn.slice(before).some(text => text !== was)) landedOn.push(phase());
    }
    expect(drawn).toContain(String(Number(was) + 1));
    expect(landedOn).toEqual(['net']);
    observer.disconnect();
  }, 60000);

  it('a goal with the last kick of a period takes nothing off the score while it winds up', async () => {
    const base = fixtures.get('goal')!.career;
    let found: { career: CareerState; cap: number; goal: LiveFeedEvent } | null = null;
    for (let attempt = 0; attempt < 6000 && !found; attempt++) {
      vi.mocked(Math.random).mockImplementation(seeded(110230 + attempt * 104729));
      const first = changeLive(base, 0, { kind: 'shape', mentality: 'balanced' })!;
      const second = startSecondHalf(first)!;
      for (const [cap, career] of [[45, first], [90, second]] as const) {
        const board = boardAt(career, cap);
        const feed = liveFeed(career.live!);
        const chance = (e: LiveFeedEvent) => ['goal', 'save', 'shot'].includes(e.kind);
        const goal = [...feed].reverse().find(e => e.minute === cap && (e.plus ?? 0) === board && chance(e));
        if (found || !goal || goal.kind !== 'goal') continue;
        /* The side that scores it already has a goal on the board: a score that wrongly took one off would show
           it (with none, 0 minus one reads 0 and the mistake is invisible). */
        if (!feed.some(e => e !== goal && e.kind === 'goal' && e.side === goal.side && clockPos(e) < cap - 1.2)) continue;
        /* And nothing else is in the air from where this test opens to the whistle. */
        if (feed.some(e => e !== goal && chance(e) && e.minute <= cap && clockPos(e) >= cap - 1.2)) continue;
        const copy = structuredClone(career);
        copy.live!.minute = cap - 1.2;
        found = { career: copy, cap, goal };
      }
    }
    expect(found, 'no seed ended a period on a goal by a side that had already scored').not.toBeNull();
    const { career, cap, goal } = found!;
    const board = boardAt(career, cap);
    console.log(`[1101 last kick] the period found ends at ${cap}+${board} on a goal by ${goal.side}, the score before it ${scoreBy(career, cap + board - 1)}`);
    const mounted = mount(career);
    /* Through the board to the middle of the wind up: the ball is struck, 0.65 before the whistle. */
    await step(boardMs(career, cap) + 150 + 400);
    const pitch = mounted.container.querySelector('[data-cm-live-pitch]')!;
    expect(pitch.getAttribute('data-cm-motion')).toBe('goal');
    expect(pitch.getAttribute('data-cm-motion-phase')).toBe('flight');
    /* The engine has not counted this goal yet, so there is nothing to wait for: the score is the one before it. */
    expect(readScore(mounted.container)).toBe(scoreBy(career, cap + board - 1));
    expectWhistle(mounted, cap, false);
  }, 180000);

  it('a line fired late by Skip is not played again when extra time starts', async () => {
    const { pre } = findWhistleMaterial();
    const eleven = (input: PitchInput) => JSON.stringify([input.mine, input.theirs].map(list => list.map(f => [f.key, f.name ?? ''])));
    /* A decider level at 90 whose last chance that plays out is INSIDE the ninety: Skip leaves that one behind as
       the action, started at the end of the board, and extra time's clock (90) is past its place. A chance in
       the board would not do: its place is ahead of extra time's clock, the viewer takes it for a line the
       redraw may have replaced and drops it whatever else it does (the etclear control stayed green on such a
       half). Both elevens are the men who start extra time from the minute before that chance: the part drops
       an action by itself when the line up under it changes, which would hide a late line left alive too. */
    let found: { due: CareerState; drawn: CareerState; chance: LiveFeedEvent; board: number; seeds: number } | null = null;
    for (let k = 0; k < 30000 && !found; k++) {
      vi.mocked(Math.random).mockImplementation(seeded(110310 + k * 7919));
      const r1 = playNextEntry(pre);
      if (r1.kind !== 'halftime' || !r1.state.live) continue;
      const second = startSecondHalf(r1.state)!;
      if (!isExtraTimeDue(second)) continue;
      const board = boardAt(second, 90);
      const chances = liveFeed(second.live!).filter(e => e.minute >= 46 && ['goal', 'save', 'shot'].includes(e.kind) && clockPos(e) !== 90 + board);
      const last = chances[chances.length - 1];
      if (!last || last.minute < 48 || chances.some(e => clockPos(e) > 89)) continue;
      const drawn = startExtraTime(structuredClone(second))!;
      const goingOn = eleven(stagePitchInput(drawn, drawn.live!, null, 'extra', 90, 0, 120 + (drawn.live!.added?.et ?? 0)));
      if (eleven(stagePitchInput(second, second.live!, null, 'second', last.minute - 1, 0, 90 + board)) !== goingOn) continue;
      if (eleven(stagePitchInput(second, second.live!, null, 'second', 90, board, 90 + board)) !== goingOn) continue;
      found = { due: second, drawn, chance: last, board, seeds: k + 1 };
    }
    expect(found, 'no decider level at 90 keeps its last chance inside the ninety').not.toBeNull();
    const { due, drawn, chance, board } = found!;
    console.log(`[1101 extra] the late line is a ${chance.kind} at ${clockPos(chance)}, the board is ${board}, found on seed ${found!.seeds} of 30000`);
    const start = structuredClone(due);
    start.live!.minute = chance.minute - .5;
    const callbacks = { onSub: vi.fn(), onShape: vi.fn(), onTalk: vi.fn(), onSecondHalf: vi.fn(), onExit: vi.fn(), onStartSecondHalf: vi.fn(), onStartExtraTime: vi.fn(), onChange: vi.fn(), onMark: vi.fn() };
    function Page() {
      const [career, setCareer] = useState<CareerState>(start);
      return <LiveSimScreen career={career} live={career.live ?? null} report={null} clubColor="#86bced" {...callbacks}
        onStartExtraTime={() => { callbacks.onStartExtraTime(); setCareer(() => drawn); }} />;
    }
    const mounted = render(<Page />);
    await step(160);
    /* Skip fires every line still to come at the end of the board, late: the last of them is left as the action. */
    fireEvent.click(mounted.getByRole('button', { name: /Skip/ }));
    await step(96);
    expect(callbacks.onStartExtraTime).toHaveBeenCalledTimes(1);
    expect(stageOf(mounted.container)).toBe('extra');
    /* Extra time's clock starts at 90, before that action's start: nothing of it is drawn as the clock comes up. */
    for (let waited = 0; waited < 800; waited += 100) {
      expect(mounted.container.querySelector('[data-cm-goal-card]')).toBeNull();
      expect(mounted.container.querySelector('[data-cm-live-pitch]')!.getAttribute('data-cm-motion')).toBe('pass');
      await step(100);
    }
  }, 120000);

  it('under reduced motion the card is held for its first stretch only, and then the match runs on', async () => {
    const original = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...original(query), matches: true }));
    const fixture = fixtures.get('goal')!;
    const career = structuredClone(fixture.career);
    const after = scoreBy(career, clockPos(fixture.event));
    const mounted = mount(career);
    const card = () => mounted.container.querySelector('[data-cm-goal-card]');
    await step(330);
    /* The last frame shows at once, so the card and the new score are up straight away. */
    expect(card()).not.toBeNull();
    expect(readScore(mounted.container)).toBe(after);
    /* The hold is the first stretch of the action (1.8 real seconds at this speed); the rest of it runs at the
       match's own pace (three quarters of a second). So three seconds after the line it is over. A hold that
       lasted the whole action would keep the card up for more than six. */
    await step(2800);
    expect(card()).toBeNull();
    expect(mounted.container.querySelector('[data-cm-live-pitch]')!.getAttribute('data-cm-motion')).toBe('pass');
    expect(readScore(mounted.container)).toBe(after);
  }, 60000);

  it("a substitution in a goal's wind up takes the card with the action, and the score stops waiting", async () => {
    const fixture = fixtures.get('goal')!;
    const career = structuredClone(fixture.career);
    const place = clockPos(fixture.event);
    const before = scoreBy(career, place - 1), after = scoreBy(career, place);
    const mounted = mount(career);
    const pitch = () => mounted.container.querySelector('[data-cm-live-pitch]')!;
    const card = () => mounted.container.querySelector('[data-cm-goal-card]');
    await step(430);
    expect(pitch().getAttribute('data-cm-motion')).toBe('goal');
    expect(readScore(mounted.container)).toBe(before);
    /* A man of mine is replaced under the action. The part drops an action when the line up under it changes. */
    fireEvent.click(mounted.getByRole('button', { name: 'Pause' }));
    const off = mounted.container.querySelector<HTMLButtonElement>('[data-cm-dot]')!.dataset.cmDot!;
    const on = benchFor(career, off)[0];
    const minute = Number(mounted.container.querySelector('[data-cm-live-minute]')!.getAttribute('data-cm-live-minute'));
    const changed = changeLive(career, minute, { kind: 'sub', outId: off, inId: on.id })!;
    /* The goal itself is at or before that minute, so the engine keeps it. */
    expect(scoreBy(changed, place)).toBe(after);
    mounted.rerender(<LiveSimScreen career={changed} live={changed.live!} report={null} clubColor="#86bced" {...mounted.callbacks} />);
    await step(32);
    /* Nothing is left to wait for: the pitch shows open play, so the score is the engine's and no card comes. */
    expect(pitch().getAttribute('data-cm-motion')).toBe('pass');
    expect(readScore(mounted.container)).toBe(after);
    expect(card()).toBeNull();
    fireEvent.click(mounted.getByRole('button', { name: 'Resume' }));
    for (let waited = 0; waited < 800; waited += 100) {
      await step(100);
      expect(card()).toBeNull();
      expect(readScore(mounted.container)).toBe(after);
    }
  }, 60000);

  /* Release AR. The browser walk met this one at 79' on the release gate: a goal that waited its turn behind a
     save in the minute before it, with the other dugout's substitution made in the goal's own minute. Their man
     came onto the grass at the next whole minute whatever was playing, the part drops an action when the line
     up under it changes, and that minute fell 0.056 before the ball was in. So the score changed with the ball
     in the air and no card ever rose. A change that comes off the clock now waits for the action to end. The
     half is a real one of the engine's, found by search: nothing about it is typed here. */
  it('a goal still on its way when the line up changes off the clock keeps its net, its card and its men', async () => {
    const base = fixtures.get('goal')!.career;
    const eleven = (input: PitchInput) => JSON.stringify([input.mine, input.theirs].map(list => list.map(f => [f.key, f.name ?? ''])));
    let found: { career: CareerState; goal: LiveFeedEvent; at: number; attempt: number; behind: string } | null = null;
    for (let attempt = 0; attempt < 4000 && !found; attempt++) {
      vi.mocked(Math.random).mockImplementation(seeded(11460077 + attempt * 104729));
      const first = changeLive(base, 0, { kind: 'shape', mentality: 'balanced' })!;
      const second = startSecondHalf(structuredClone(first))!;
      for (const [cap, stage, career] of [[45, 'first', first], [90, 'second', second]] as const) {
        const stop = cap + boardAt(career, cap);
        const feed = liveFeed(career.live!).filter(e => e.minute > cap - 45 && e.minute <= cap);
        for (const goal of feed) {
          const m = goal.minute;
          if (goal.kind !== 'goal' || goal.side === 'none' || goal.plus || m < cap - 40 || m > cap - 4) continue;
          /* One goal on its own, so the score has one step to take in the stretch watched. */
          if (feed.some(e => e !== goal && e.kind === 'goal' && Math.abs(clockPos(e) - m) <= 2)) continue;
          /* The viewer opens a little before the minute before it, so the chance it waits behind is played. */
          const opened = m - 1.2;
          const cast = (minute: number) => stagePitchInput(career, career.live!, null, stage, minute, 0, stop, opened);
          /* The same men from where the viewer opens to the goal's minute, and other men the minute after. */
          if (eleven(cast(m - 2)) !== eleven(cast(m)) || eleven(cast(m)) === eleven(cast(m + 1))) continue;
          /* And the goal waits: its action starts inside its own minute, so late that the next minute comes
             while its ball is still on its way (by two frames of this test's clock at least), and early
             enough that it is over with a third of a minute of the stretch watched still to run. */
          const staged = pitchPlan(cast(m)).actions.find(a => a.event.kind === 'goal' && a.event.side === goal.side && a.event.minute === m && !a.event.plus);
          if (!staged || staged.at > m + 0.6 || staged.at + NET_AT < m + 1.04) continue;
          const copy = structuredClone(career);
          copy.live!.minute = opened;
          const behind = feed.filter(e => ['goal', 'save', 'shot'].includes(e.kind) && clockPos(e) >= opened && clockPos(e) < m).map(e => `${e.kind} at ${clockPos(e)}`).join(', ');
          found = { career: copy, goal, at: staged.at, attempt, behind };
          break;
        }
        if (found) break;
      }
    }
    expect(found, 'no half held a goal still on its way when the line up changes off the clock').not.toBeNull();
    const { career, goal } = found!;
    const m = goal.minute;
    const before = scoreBy(career, m - 1), after = scoreBy(career, m);
    expect(after).not.toBe(before);
    console.log(`[AR held cast] the half found on attempt ${found!.attempt}: a goal at ${m} for ${goal.side}, its action staged at ${found!.at.toFixed(3)} behind ${found!.behind || 'nothing'}, the ball in at ${(found!.at + NET_AT).toFixed(3)}, and the line up changes at ${m + 1}`);
    const mounted = mount(career);
    const read = () => {
      const pitch = mounted.container.querySelector('[data-cm-live-pitch]')!;
      return {
        motion: pitch.getAttribute('data-cm-motion'), phase: pitch.getAttribute('data-cm-motion-phase'),
        score: readScore(mounted.container), card: !!mounted.container.querySelector('[data-cm-goal-card]'),
        minute: Number(mounted.container.querySelector('[data-cm-live-minute]')!.getAttribute('data-cm-live-minute')),
        /* Who is on the grass: my men by id, theirs by the number on their backs (a man off the bench wears 12 or more). */
        cast: [...mounted.container.querySelectorAll<HTMLElement>('[data-cm-dot]')].map(d => d.dataset.cmDot).join(',')
          + ' | ' + [...mounted.container.querySelectorAll<HTMLElement>('[data-cm-dot-opp]')].map(d => d.dataset.cmDotOpp).join(','),
      };
    };
    const frames: ReturnType<typeof read>[] = [];
    for (let i = 0; i < 900; i++) {
      await step(16);
      frames.push(read());
      if (frames[frames.length - 1].minute >= m + 2) break;
    }
    const playing = frames.filter(f => f.motion === 'goal');
    const windup = playing.filter(f => f.phase === 'plant' || f.phase === 'flight');
    /* The score waits for the ball on every frame of the wind up and the flight, */
    expect(windup.length).toBeGreaterThan(20);
    expect(windup.filter(f => f.score !== before).length).toBe(0);
    /* and the first frame that reads the new score is the ball in the net. */
    const changed = frames.find(f => f.score !== before);
    expect(changed && { score: changed.score, motion: changed.motion, phase: changed.phase }).toEqual({ score: after, motion: 'goal', phase: 'net' });
    /* The stretch watched is the one the search promised: the next minute came with the ball on its way. */
    expect(windup.some(f => f.minute === m + 1)).toBe(true);
    /* The card rises with it, and is held as any goal's is (1.8 real seconds at this speed: over a hundred frames). */
    const carded = frames.filter(f => f.card);
    expect(carded.length).toBeGreaterThan(60);
    expect(carded.every(f => f.motion === 'goal' && f.phase === 'net' && f.score === after)).toBe(true);
    /* The goal is played out by the men it started with, */
    expect(new Set(playing.map(f => f.cast)).size).toBe(1);
    /* and the change comes onto the grass as soon as it has been seen, and stays. */
    const since = frames.slice(frames.lastIndexOf(playing[playing.length - 1]) + 1);
    expect(since.length).toBeGreaterThan(10);
    expect(since.every(f => f.cast !== playing[0].cast && f.score === after && !f.card)).toBe(true);
    expect(frames[frames.length - 1].minute).toBe(m + 2);
  }, 120000);

  it('a scorer card counts his goals up to this one, and gives a season count only to one of mine', () => {
    /* An invented feed on a real squad: one of my players twice, an opponent who happens to share his name
       between the two, and a scorer who is not in my squad. No outcome of a match is read off it. */
    const career = structuredClone(fixtures.get('goal')!.career);
    const mine = career.squad.find(p => p.position !== 'GK')!;
    mine.seasonGoals = 4;
    const goal = (minute: number, side: 'me' | 'opp', text: string): LiveFeedEvent => ({ minute, side, kind: 'goal', text });
    const feed = [goal(10, 'me', mine.name), goal(20, 'opp', mine.name), goal(30, 'me', mine.name), goal(40, 'me', 'Nobody In This Squad')];
    expect(goalCardCount(career, feed, feed[0])).toEqual({ nth: 1, season: 5 });
    expect(goalCardCount(career, feed, feed[2])).toEqual({ nth: 2, season: 6 });
    expect(goalCardCount(career, feed, feed[1])).toEqual({ nth: 1, season: null });
    expect(goalCardCount(career, feed, feed[3])).toEqual({ nth: 1, season: null });
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Round 1101, step 5: match mode. The running match is its own screen (one box the size of the window),
 * with one panel at a time, a Back that pauses and folds it to a card in the page, and names that get
 * out of each other's way. What a browser alone can see (the fit, the page not scrolling) is
 * scripts/playLiveMatchFit.mjs; this is the behaviour.
 * ───────────────────────────────────────────────────────────────────────────── */
describe('Match mode', () => {
  const quiet = () => {
    const career = structuredClone(fixtures.get('goal')!.career);
    career.live!.minute = 1;
    return career;
  };
  const minuteOf = (container: HTMLElement) => Number(container.querySelector('[data-cm-live-stage]')!.getAttribute('data-cm-live-minute'));
  const sideOf = (container: HTMLElement) => container.querySelector('[data-cm-live-side]')?.getAttribute('data-cm-live-side') ?? null;

  it('a name goes above its figure when another man stands just under him', () => {
    /* One man in front of another: the front man's name goes up, the other keeps his under. */
    expect([...labelsAbove([{ key: 'm1', x: 50, y: 40 }, { key: 'o1', x: 53, y: 43 }])]).toEqual(['m1']);
    /* Level with each other: one each, and the later key keeps his under. */
    expect([...labelsAbove([{ key: 'm1', x: 50, y: 40 }, { key: 'm2', x: 58, y: 40 }])]).toEqual(['m1']);
    /* Too far across, or too far below, for a name to be in the way: nobody moves. */
    expect(labelsAbove([{ key: 'm1', x: 50, y: 40 }, { key: 'm2', x: 63, y: 41 }]).size).toBe(0);
    expect(labelsAbove([{ key: 'm1', x: 50, y: 40 }, { key: 'm2', x: 51, y: 47 }]).size).toBe(0);
    /* A line of three, each just under the last: the two in front go up. */
    expect([...labelsAbove([{ key: 'a', x: 50, y: 30 }, { key: 'b', x: 51, y: 34 }, { key: 'c', x: 52, y: 38 }])].sort()).toEqual(['a', 'b']);
  });

  it('Back folds the match to a card and pauses it, and the card puts it back', async () => {
    const mounted = mount(quiet());
    await step(500);
    expect(mounted.container.querySelector('[data-cm-live-stagebox]')).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(mounted.getByRole('button', { name: 'Back to the club page' }));
    await step(32);
    const held = minuteOf(mounted.container);
    expect(mounted.container.querySelector('[data-cm-live-stagebox]')).toBeNull();
    const card = mounted.container.querySelector('[data-cm-live-compact]')!;
    expect(card.textContent).toContain(`Paused at ${held}'`);
    expect(document.body.style.overflow).not.toBe('hidden');
    /* Three real seconds are three minutes of the match at this speed. Folded away, not one passes. */
    await step(3000);
    expect(minuteOf(mounted.container)).toBe(held);
    fireEvent.click(mounted.getByRole('button', { name: 'Back to the match' }));
    await step(3000);
    expect(mounted.container.querySelector('[data-cm-live-compact]')).toBeNull();
    expect(mounted.container.querySelector('[data-cm-live-stagebox]')).not.toBeNull();
    /* (a goal inside these three seconds holds the clock for part of them, so one minute is the floor) */
    expect(minuteOf(mounted.container)).toBeGreaterThanOrEqual(held + 1);
    /* A match that was paused before Back comes back paused. */
    fireEvent.click(mounted.getByRole('button', { name: 'Pause' }));
    await step(32);
    fireEvent.click(mounted.getByRole('button', { name: 'Back to the club page' }));
    await step(32);
    fireEvent.click(mounted.getByRole('button', { name: 'Back to the match' }));
    await step(32);
    const stopped = minuteOf(mounted.container);
    await step(2000);
    expect(minuteOf(mounted.container)).toBe(stopped);
    expect(mounted.getByRole('button', { name: 'Resume' })).not.toBeNull();
  }, 60000);

  it('one panel at a time, and Escape closes what is open before it is Back', async () => {
    const mounted = mount(quiet());
    await step(300);
    expect(sideOf(mounted.container)).toBe('none');
    fireEvent.click(mounted.getByRole('button', { name: 'Squad and stamina' }));
    await step(32);
    expect(sideOf(mounted.container)).toBe('squad');
    fireEvent.click(mounted.getByRole('button', { name: 'How watching a match works' }));
    await step(32);
    expect(sideOf(mounted.container)).toBe('help');
    expect(mounted.container.querySelector('[data-cm-live-help]')).not.toBeNull();
    /* A tap on one of my players opens the change sheet in the panel's place, not on top of it. */
    const dot = [...mounted.container.querySelectorAll<HTMLButtonElement>('[data-cm-dot]')].find(b => !b.disabled && b.dataset.cmDot)!;
    fireEvent.click(dot);
    await step(32);
    expect(sideOf(mounted.container)).toBe('change');
    expect(mounted.container.querySelector('[data-cm-live-help]')).toBeNull();
    expect(mounted.container.querySelector('[data-cm-live-sheet]')).not.toBeNull();
    /* Escape closes the sheet and nothing comes back under it. A second Escape is Back. */
    fireEvent.keyDown(window, { key: 'Escape' });
    await step(32);
    expect(sideOf(mounted.container)).toBe('none');
    expect(mounted.container.querySelector('[data-cm-live-stagebox]')).not.toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    await step(32);
    expect(mounted.container.querySelector('[data-cm-live-stagebox]')).toBeNull();
    expect(mounted.container.querySelector('[data-cm-live-compact]')).not.toBeNull();
  }, 60000);

  it('the stats line a phone keeps in view reads the same count as the full stats', async () => {
    const mounted = mount(quiet());
    await step(4000);
    const line = mounted.container.querySelector('[data-cm-live-statline]')!.textContent!;
    const full = mounted.container.querySelector('[data-cm-live-stats]')!;
    /* Round 1340: both read home side first, so the line and the full stats are compared in the order drawn. */
    const cell = (label: string) => [...full.querySelectorAll(`[data-cm-live-stat="${label}"] span`)].map(s => s.textContent);
    const [shotsFirst, , shotsSecond] = cell('Shots (on target)');
    const [xgFirst, , xgSecond] = cell('xG');
    const possPair = [...full.querySelectorAll('[data-cm-live-poss]')].map(s => s.textContent).join(' ');
    expect(line).toContain(`Poss ${possPair}`);
    expect(line).toContain(`Shots ${shotsFirst} ${shotsSecond}`);
    expect(line).toContain(`xG ${xgFirst} ${xgSecond}`);
    /* And the full stats are in the markup the whole time, panel or no panel. */
    expect(mounted.container.querySelectorAll('[data-cm-live-stats]').length).toBe(1);
  }, 60000);

  it('away from home the score, the names either side of it and the stats read home side first (Round 1340)', async () => {
    const career = quiet();
    career.live!.home = false;
    const mounted = mount(career);
    await step(400);
    const score = mounted.container.querySelector('[data-cm-live-score]')!;
    const digits = [...score.querySelectorAll('[data-cm-score-of]')].map(d => d.getAttribute('data-cm-score-of'));
    expect(digits).toEqual(['opp', 'me']);
    expect(score.textContent!.trim()).toBe(`${score.querySelector('[data-cm-score-of="opp"]')!.textContent} - ${score.querySelector('[data-cm-score-of="me"]')!.textContent}`);
    const strip = score.parentElement!;
    const names = [...strip.children].filter(el => el !== score).map(el => el.textContent);
    expect(names).toEqual([career.live!.opponent, career.clubName]);
    expect(strip.children[strip.children.length - 1].className).toContain('text-primary');
    const full = mounted.container.querySelector('[data-cm-live-stats]')!;
    expect([...full.querySelectorAll('[data-cm-live-poss]')].map(s => s.getAttribute('data-cm-live-poss'))).toEqual(['theirs', 'mine']);
    for (const cell of full.querySelectorAll('[data-cm-live-stat]')) {
      expect([...cell.querySelectorAll('[data-cm-live-stat-n]')].map(s => s.getAttribute('data-cm-live-stat-n'))).toEqual(['theirs', 'mine']);
    }
    /* The line under the pitch: their number first, mine the bold one. */
    const line = mounted.container.querySelector('[data-cm-live-statline]')!;
    const possBold = line.querySelector('b')!.textContent;
    expect(possBold).toBe(full.querySelector('[data-cm-live-poss="mine"]')!.textContent);
    expect(line.textContent).toContain(`Poss ${full.querySelector('[data-cm-live-poss="theirs"]')!.textContent} ${possBold}`);
  }, 60000);

  it('level neighbours take a row each, and a wall shows numbers', () => {
    /* Three men level and shoulder to shoulder, their keys not in their order across the pitch: the names
       alternate above and under going across, and all three show a number without a name while they stand so. */
    const wall = [{ key: 'o2', x: 36.5, y: 21 }, { key: 'o3', x: 40, y: 21 }, { key: 'o5', x: 43.5, y: 21 }];
    const up = labelsAbove(wall);
    expect([up.has('o2'), up.has('o3'), up.has('o5')]).toEqual([true, false, true]);
    expect([...labelsShort(wall)].sort()).toEqual(['o2', 'o3', 'o5']);
    /* Two men side by side are not a wall: both keep their names, one above and one under. */
    const pair = [{ key: 'm4', x: 50, y: 60 }, { key: 'o9', x: 56, y: 61.5 }];
    expect(labelsShort(pair).size).toBe(0);
    expect(labelsAbove(pair).size).toBe(1);
    /* A crowd: five men in the area as a corner comes in, none of them level with two others. The four in
       the thick of it show numbers; the man at its edge, with only two of them near him, keeps his name. */
    const crowd = [{ key: 'm9', x: 46, y: 10 }, { key: 'o4', x: 50, y: 12 }, { key: 'o5', x: 54, y: 9 }, { key: 'm10', x: 51, y: 15.5 }, { key: 'o6', x: 62, y: 14 }];
    expect([...labelsShort(crowd)].sort()).toEqual(['m10', 'm9', 'o4', 'o5']);
    /* Three men spread over a line keep their names: near each other, but not a crowd and not a wall. */
    const line = [{ key: 'o2', x: 30, y: 30 }, { key: 'o3', x: 41, y: 33 }, { key: 'o4', x: 52, y: 30 }];
    expect(labelsShort(line).size).toBe(0);
  });

  it('at full time the folded card offers the report as well as the way back', async () => {
    const career = structuredClone(fixtures.get('goal')!.career);
    vi.mocked(Math.random).mockImplementation(seeded(6038));
    const done = resumeMatch(career);
    expect(done.report, 'the match was played to its report').toBeTruthy();
    const callbacks = { onSub: vi.fn(), onShape: vi.fn(), onTalk: vi.fn(), onSecondHalf: vi.fn(), onExit: vi.fn(), onStartSecondHalf: vi.fn(), onStartExtraTime: vi.fn(), onChange: vi.fn(), onMark: vi.fn() };
    const mounted = render(<LiveSimScreen career={done.state} live={null} report={done.report!} clubColor="#86bced" {...callbacks} />);
    await step(32);
    expect(stageOf(mounted.container)).toBe('done');
    fireEvent.click(mounted.getByRole('button', { name: 'Back to the club page' }));
    await step(32);
    expect(mounted.container.querySelector('[data-cm-live-compact]')!.textContent).toContain('Full time');
    expect(mounted.getByRole('button', { name: 'Back to the match' })).not.toBeNull();
    fireEvent.click(mounted.getByRole('button', { name: 'Full report' }));
    expect(callbacks.onExit).toHaveBeenCalledTimes(1);
  }, 60000);

  it('a phone on its side gets the pitch on its side', async () => {
    const size = (width: number, height: number) => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
      Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
    };
    const was = [window.innerWidth, window.innerHeight];
    try {
      size(844, 390);
      const mounted = mount(quiet());
      await step(200);
      const pitch = () => mounted.container.querySelector<HTMLElement>('[data-cm-live-pitch]')!;
      const mine = () => [...mounted.container.querySelectorAll<HTMLElement>('[data-cm-dot]')].map(dot => ({ left: parseFloat(dot.style.left), top: parseFloat(dot.style.top) }));
      expect(pitch().getAttribute('data-pm-orient')).toBe('landscape');
      /* I attack right on it: my keeper stands at the left end, and nobody of mine is drawn at its foot as a keeper would be upright. */
      expect(mine()).toHaveLength(11);
      expect(Math.min(...mine().map(dot => dot.left))).toBeLessThan(20);
      /* Turned upright again, the pitch is upright again and my keeper is at the foot of it. */
      size(390, 844);
      await act(async () => { window.dispatchEvent(new Event('resize')); });
      expect(pitch().getAttribute('data-pm-orient')).toBe('portrait');
      expect(Math.max(...mine().map(dot => dot.top))).toBeGreaterThan(80);
    } finally {
      size(was[0], was[1]);
    }
  }, 60000);
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Round 1101: the part itself drops an action when the line up under it changes. The viewer no longer
 * needs this to show the right man (it joins the frame to its own eleven by key, which the substitution
 * test above proves), so the old `lineup` control, which takes this guard out of the hook, turned nothing
 * red any more. A binder that draws straight off the frame (PitchMotion, the Season Centre's mini pitch)
 * does need it, so it is proven here on the hook, and `lineup` has a test to turn red again.
 * ───────────────────────────────────────────────────────────────────────────── */
describe('The part and a change of line up', () => {
  it('the part drops an action when the line up under it changes', async () => {
    type Five = typeof scene;
    /* One object for the whole test: the hook starts an action whenever its event changes identity. */
    const goal = { event: { minute: 10, side: 'me' as const, kind: 'goal' as const, text: 'Home striker' }, key: 'probe', at: 10 };
    function Probe({ on, clock }: { on: Five; clock: number }) {
      const frame = useLiveSimMotion(on, goal, clock, true, false);
      return <div data-probe={frame.action} data-names={frame.mine.map((p: { name?: string }) => p.name).join(',')} />;
    }
    const mounted = render(<Probe on={scene} clock={10.3} />);
    await step(32);
    const probe = () => mounted.container.querySelector('[data-probe]')!;
    /* The strike is playing, on the eleven it started with. */
    expect(probe().getAttribute('data-probe')).toBe('goal');
    expect(probe().getAttribute('data-names')).toBe('Home keeper,Home striker');
    /* The striker is replaced under the action: same slot, another man. */
    const changed: Five = { ...scene, mine: scene.mine.map(p => (p.key === 'm9' ? { ...p, name: 'Home sub' } : p)) };
    mounted.rerender(<Probe on={changed} clock={10.35} />);
    await step(32);
    expect(probe().getAttribute('data-probe')).toBe('pass');
    expect(probe().getAttribute('data-names')).toBe('Home keeper,Home sub');
  });

  /* The browser walk found this one on a wide screen: a goal whose score changed with nothing drawn, no
     strike, no card. A substitution, a red card and an injury sit on the same whole minute as a chance can,
     so the line up changes in the very commit the chance's line fires in. The frame the action is started
     from still held the old eleven then, and the guard above refused the action for good. */
  it('a chance whose line fires in the very commit the line up changes is still played, by the new eleven', async () => {
    type Five = typeof scene;
    const save = { event: { minute: 10, side: 'opp' as const, kind: 'save' as const, text: 'Away striker' }, key: 'probe-same-commit', at: 10 };
    function Probe({ on, action, clock }: { on: Five; action: typeof save | null; clock: number }) {
      const frame = useLiveSimMotion(on, action, clock, true, false);
      return <div data-probe={frame.action} data-names={frame.mine.map((p: { name?: string }) => p.name).join(',')} />;
    }
    const mounted = render(<Probe on={scene} action={null} clock={9.9} />);
    await step(32);
    const probe = () => mounted.container.querySelector('[data-probe]')!;
    expect(probe().getAttribute('data-probe')).toBe('pass');
    /* One commit: my striker goes off for another man in the same slot, and the chance of that minute fires. */
    const changed: Five = { ...scene, mine: scene.mine.map(p => (p.key === 'm9' ? { ...p, name: 'Home sub' } : p)) };
    mounted.rerender(<Probe on={changed} action={save} clock={10} />);
    await step(32);
    mounted.rerender(<Probe on={changed} action={save} clock={10.3} />);
    await step(32);
    expect(probe().getAttribute('data-probe')).toBe('save');
    expect(probe().getAttribute('data-names')).toBe('Home keeper,Home sub');
    /* And it is over at its own time, like any other. */
    mounted.rerender(<Probe on={changed} action={save} clock={10 + ACTION_SPAN + .01} />);
    await step(32);
    expect(probe().getAttribute('data-probe')).toBe('pass');
  });
});

/* Round 1101: and it plays only the action it is being handed. The Skip test above found this one: a line
   fired late by Skip was cleared by the viewer at the break, and the hook, which kept its own copy, played
   it again from its wind up when the clock went back to 46 (a goal nobody scored, for as long as the board
   had been). It hid for a while because the halves the test found all had a change of eleven in them. */
describe('The part and an action taken back', () => {
  it('the part drops an action the binder has taken back, even with the clock set back before its start', async () => {
    type Line = { event: { minute: number; side: 'me'; kind: 'goal'; text: string }; key: string; at: number };
    const goal: Line = { event: { minute: 10, side: 'me', kind: 'goal', text: 'Home striker' }, key: 'probe', at: 10 };
    function Probe({ line, clock }: { line: Line | null; clock: number }) {
      const frame = useLiveSimMotion(scene, line, clock, true, false);
      return <div data-probe={frame.action} data-phase={frame.phase} />;
    }
    const mounted = render(<Probe line={goal} clock={10.3} />);
    await step(32);
    const probe = () => mounted.container.querySelector('[data-probe]')!;
    expect(probe().getAttribute('data-probe')).toBe('goal');
    /* The period ends: the binder takes the action back and its clock goes back to the next kick off. */
    mounted.rerender(<Probe line={null} clock={9} />);
    await step(32);
    expect(probe().getAttribute('data-probe')).toBe('pass');
    /* And nothing of it comes back as the clock runs up through where it had started. */
    for (const clock of [9.5, 10, 10.4, 11]) {
      mounted.rerender(<Probe line={null} clock={clock} />);
      await step(16);
      expect(probe().getAttribute('data-probe')).toBe('pass');
    }
  });
});
