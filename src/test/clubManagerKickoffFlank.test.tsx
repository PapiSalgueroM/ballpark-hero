import { StrictMode } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/lib/clubManagerTactics';
import { FORMATIONS, SAVE_KEY, changeLive, coachQuickMatch, effectiveXIWithSlots, nextFixture, playNextEntry, resumeMatch, startCareer, type CareerState } from '@/lib/clubManager';
import { kickoffFlankPlayers, type FlankPlan } from '@/lib/clubManagerFlank';
import { useClubManager, type ClubManagerGame } from '@/hooks/useClubManager';
import { recordActivity } from '@/lib/completions';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn() }));
const left: FlankPlan = { side: 'left', support: 'overlap' };
const right: FlankPlan = { side: 'right', support: 'hold' };

function seeded<T>(number: number, run: () => T) {
  const random = Math.random, draws: number[] = [];
  Math.random = () => {
    number = (Math.imul(number, 1664525) + 1013904223) >>> 0;
    const value = number / 4294967296;
    draws.push(value);
    return value;
  };
  try { return { value: run(), draws }; } finally { Math.random = random; }
}
const newClub = () => seeded(12207, () => startCareer('Brentford')).value;
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });

describe('one-match kickoff flank order', () => {
  it('the named starting pair plays the selected route before halftime, even after an unavailable starter is replaced', () => {
    const career = newClub(), first = kickoffFlankPlayers(career, 'left')!;
    career.squad.find(p => p.id === first.fullback.id)!.injuryWeeks = 3;
    for (const plan of [left, right]) {
      const pair = kickoffFlankPlayers(career, plan.side)!;
      expect(pair.fullback.id).not.toBe(first.fullback.id);
      const active = seeded(9141, () => playNextEntry(career, { flankPlan: plan })).value.state;
      expect(active.live).toMatchObject({ minute: 0, flankPlan: plan });
      const firstMove = active.live!.h1Play!.find(e => e.flankMove)!;
      const [from, to] = plan.support === 'overlap' ? [pair.winger, pair.fullback] : [pair.fullback, pair.winger];
      expect(firstMove).toMatchObject({ who: from.name, flankMove: { receiver: to.name, ...plan } });
      expect(career).not.toHaveProperty('flankPlan');
      const restored = JSON.parse(JSON.stringify(active));
      const resume = seeded(12, () => playNextEntry(restored, { flankPlan: right }));
      expect(resume.value.live).toEqual(active.live);
      const historical = active.live!.h1Play!.filter(e => e.minute <= firstMove.minute);
      const changed = changeLive(restored, firstMove.minute, { kind:'flank', plan:plan.side === 'left' ? right : left })!;
      expect(changed.live!.h1Play!.filter(e => e.minute <= firstMove.minute)).toEqual(historical);
      expect(changed.live!.flankDraw).toBe(active.live!.flankDraw);
    }
  });

  it('reflects a mirrored custom formation and returns no pair for a depleted XI', () => {
    const career = newClub(), normal = kickoffFlankPlayers(career, 'right')!;
    const points = FORMATIONS[career.formationIndex].slots.map(slot => ({ x: 100 - slot.x, y: slot.y }));
    career.customShape = { v: 1, formationIndex: career.formationIndex, points };
    const preview = kickoffFlankPlayers(career, 'left')!;
    expect([preview.fullback.id, preview.winger.id]).toEqual([normal.fullback.id, normal.winger.id]);
    const opening = seeded(611, () => playNextEntry(career, { flankPlan: left })).value;
    const move = opening.live!.h1Play!.find(e => e.flankMove)!;
    expect(move).toMatchObject({ who: preview.winger.name, flankMove: { receiver: preview.fullback.name } });
    career.squad = [preview.fullback];
    expect(kickoffFlankPlayers(career, 'left')).toBeNull();
  });

  it('preserves an ordinary opening and all its random draws when no valid selection is made', () => {
    const career = newClub();
    const baseline = seeded(1974, () => playNextEntry(career));
    for (const option of [undefined, { side: 'other', support: 'hold' } as never]) {
      expect(seeded(1974, () => playNextEntry(career, { flankPlan: option }))).toEqual(baseline);
    }
    expect(baseline.value.live).not.toHaveProperty('flankPlan');
    expect(baseline.value.live).not.toHaveProperty('flankDraw');
  });

  it('plays the same coached first and second halves through quick sim or live, with a separate bench order', () => {
    const career = newClub(), xi = effectiveXIWithSlots(career);
    const out = xi.find(x => x.p.position === 'ST')!.p;
    const sub = career.squad.find(p => !xi.some(x => x.p.id === p.id) && p.position === 'ST' && !p.onLoan)!;
    const benchOrder = { outId: out.id, inId: sub.id, window:'hour' as const, when:'any' as const };
    const opts = { flankPlan: right, benchOrder };
    const quick = seeded(82571, () => playNextEntry(career, { ...opts, skipHalftime: true }));
    const replay = seeded(82571, () => {
      const opening = playNextEntry(career, opts);
      return resumeMatch(coachQuickMatch(JSON.parse(JSON.stringify(opening.state)), benchOrder));
    });
    expect(replay.draws).toEqual(quick.draws);
    expect(replay.value.report).toEqual(quick.value.report);
    const report = quick.value.report!;
    const moves = report.detail!.play!.filter(e => e.flankMove);
    expect(moves.some(e => e.minute <= 45)).toBe(true);
    expect(moves.some(e => e.minute > 45)).toBe(true);
    expect(report.events.join(' ')).toContain('Bench order');
    expect(quick.value.state.resultLog).toHaveLength((career.resultLog?.length ?? 0) + 1);
    const next = seeded(945, () => playNextEntry(quick.value.state)).value;
    expect(next.live).not.toHaveProperty('flankPlan');
  });

  it('crosses an idle date only to reach the advertised fixture, and consumes no order in a window or calendar simulation', () => {
    const career = newClub();
    const between = structuredClone(career);
    between.calendar.splice(0, 0, { type: 'uclGroup', round: 0 });
    expect(between.uclGroup).toBeNull();
    const advertised = nextFixture(between);
    const result = seeded(9351, () => playNextEntry(between, { flankPlan: left })).value;
    expect(result.live).toMatchObject({ flankPlan: left, week: 1 });
    expect(advertised).toMatchObject({ kind: 'match', opponent: result.live!.opponent });
    const window = structuredClone(career);
    window.calendar.splice(0, 0, { type: 'window', round: 0 });
    const passed = seeded(1128, () => playNextEntry(window, { flankPlan: left })).value;
    expect(passed.kind).toBe('window');
    expect(passed.state.live).toBeFalsy();
    expect(seeded(481, () => playNextEntry(passed.state)).value.live).not.toHaveProperty('flankPlan');
    const calendarRun = seeded(743, () => playNextEntry(career, { flankPlan: left, untilWeek: 1 })).value;
    expect(calendarRun.live).not.toHaveProperty('flankPlan');
  });
});

let api: ClubManagerGame;
function Harness() { api = useClubManager(); return <span>{api.phase}</span>; }
async function mount(career: CareerState) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(career));
  const rendered = render(<StrictMode><Harness /></StrictMode>);
  await waitFor(() => expect(api.phase).toBe('resume'));
  act(() => api.resume());
  await waitFor(() => expect(api.phase).toBe('hub'));
  return rendered;
}
it('the real hook makes a single claim for double taps, resumes the stored live order and quick sims once', async () => {
  const career = newClub(), view = await mount(career), kickoff = api.play;
  act(() => { kickoff(left); kickoff(right); });
  await waitFor(() => expect(api.phase).toBe('halftime'));
  const game = api.career!;
  expect(game.live!.flankPlan).toEqual(left);
  view.unmount();
  const restored = await mount(game);
  act(() => api.play(right));
  await waitFor(() => expect(api.phase).toBe('halftime'));
  expect(api.career!.live).toEqual(game.live);
  restored.unmount();
  await mount(career);
  const quick = api.quickPlay;
  act(() => { quick(undefined, right); quick(undefined, right); });
  await waitFor(() => expect(api.phase).toBe('matchResult'));
  expect(recordActivity).toHaveBeenCalledTimes(1);
  expect(api.report!.detail!.play!.some(e => e.minute <= 45 && e.flankMove?.side === 'right')).toBe(true);
});
