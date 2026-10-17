import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CareerState } from '@/lib/clubManager';

const E = (process.env.CM_HT_CORE ? await import(/* @vite-ignore */ process.env.CM_HT_CORE)
  : await import('@/lib/clubManager')) as typeof import('@/lib/clubManager');
const UI = (process.env.CM_HT_COMPONENT ? await import(/* @vite-ignore */ process.env.CM_HT_COMPONENT)
  : await import('@/components/club-manager/HalftimeScreen')) as typeof import('@/components/club-manager/HalftimeScreen');
const NOW = '2026-10-14T00:00:00Z';
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers(); });

function interval(name: string): CareerState {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(NOW));
  const draws: { ordinal: number; phase: string; value: number }[] = [];
  const entries: { attempt: number; beforeWeek: number; afterWeek: number; kind: string }[] = [];
  let phase = 'startCareer';
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    draws.push({ ordinal: draws.length + 1, phase, value: 0.6 }); return 0.6;
  });
  let state: CareerState;
  try {
    state = E.startCareer('Aston Villa');
    for (let attempt = 1; attempt <= 8 && !state.live; attempt++) {
      phase = 'playNextEntry:' + attempt;
      const beforeWeek = state.week, next = E.playNextEntry(state);
      state = next.state; entries.push({ attempt, beforeWeek, afterWeek: state.week, kind: next.kind });
    }
  } finally { random.mockRestore(); }
  expect(state!.live, 'actual bounded entry APIs must reach a real interval').toBeTruthy();
  expect(state!.live!.startXi).toHaveLength(11);
  expect(state!.live!.oppXi, 'actual named opposition fixture is required').toHaveLength(11);
  expect(state!.live!.h2Drawn).not.toBe(true);
  console.log('CM_HT_UI_RECEIPT:' + JSON.stringify({ name, clock: NOW, draws, entries, state: state! }));
  return state!;
}
function mount(career: CareerState) {
  const callbacks = { onSub: vi.fn(), onShape: vi.fn(), onTalk: vi.fn(), onSecondHalf: vi.fn() };
  return { ...render(<UI.HalftimeScreen career={career} {...callbacks} />), callbacks };
}
function names(panel: Element | null) {
  return panel ? [...panel.querySelectorAll('[data-cm-halftime-name]')].map(node => node.textContent) : [];
}
function opponentOracle(state: CareerState) {
  const live = state.live!, cap = live.added?.h1 ?? 0;
  const occurred = (line: { minute: number; plus?: number }) => line.minute < 45
    || (line.minute === 45 && (line.plus ?? 0) <= cap);
  const mine = [...(live.h1My ?? []), ...(live.h2My ?? [])].filter(occurred);
  const theirs = [...(live.h1Opp ?? []), ...(live.h2Opp ?? [])].filter(occurred);
  const base = theirs.length > mine.length ? 7 : theirs.length === mine.length ? 6.4 : 5.7;
  return live.oppXi!.map(player => {
    const count = live.oppXi!.filter(other => other.n === player.n).length;
    const goals = count === 1 ? theirs.filter(line => !line.og && line.name === player.n).length : 0;
    return { name: player.n, ovr: String(player.r),
      grade: (Math.round(Math.min(10, Math.max(4.5, base + goals * 0.9)) * 10) / 10).toFixed(1) };
  });
}

describe('Halftime starting XIs and provisional grades', () => {
  it('halftime lineups missing: starting XIs are available at the interval', () => {
    const state = interval('entry'), held = JSON.stringify(state), random = vi.spyOn(Math, 'random');
    const view = mount(state), entry = screen.queryByRole('button', { name: 'Starting XIs' });
    expect(!!entry, 'halftime starting XIs entry is missing').toBe(true);
    fireEvent.click(entry!);
    const panel = view.container.querySelector('[data-cm-halftime-team="me"]');
    expect(names(panel)).toEqual(state.live!.startXi.map(id => state.squad.find(player => player.id === id)!.name));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: 'Starting XIs' })).toBeTruthy();
    expect(Object.values(view.callbacks).every(callback => callback.mock.calls.length === 0)).toBe(true);
    expect(JSON.stringify(state)).toBe(held); expect(random).not.toHaveBeenCalled();
  });
  it('halftime lineups missing: opposition has truthful provisional so-far grades', () => {
    const state = interval('opposition'), held = JSON.stringify(state), random = vi.spyOn(Math, 'random');
    const view = mount(state), entry = screen.queryByRole('button', { name: 'Starting XIs' });
    if (entry) fireEvent.click(entry);
    const tab = screen.queryByRole('tab', { name: state.live!.opponent });
    if (tab) fireEvent.click(tab);
    const panel = view.container.querySelector('[data-cm-halftime-team="opp"]');
    expect(!!panel && panel.textContent!.includes('So far (provisional)'),
      'halftime opposition so-far grades are missing').toBe(true);
    const rows = [...panel!.querySelectorAll('[data-cm-halftime-player]')].map(row => ({
      name: row.querySelector('[data-cm-halftime-name]')?.textContent,
      ovr: row.querySelector('[data-cm-halftime-ovr]')?.textContent,
      grade: row.querySelector('[data-cm-halftime-grade]')?.textContent,
    }));
    expect(rows).toEqual(opponentOracle(state)); expect(panel!.textContent).toContain('OVR');
    expect(panel!.textContent).not.toMatch(/assists?\s*[:+]\s*\d/i);
    expect(JSON.stringify(state)).toBe(held); expect(random).not.toHaveBeenCalled();
  });
  it('halftime preservation: reading the actual interval holds all state and RNG', () => {
    const state = interval('readonly'), held = JSON.stringify(state), random = vi.spyOn(Math, 'random');
    const view = mount(state);
    expect(view.container.textContent).toContain('Half time');
    expect(view.container.textContent).toContain(state.clubName);
    expect(view.container.textContent).toContain(state.live!.opponent);
    /* Round 1340: the score reads home side first, the venue's order. */
    const [first, second] = state.live!.home === false ? [state.live!.oppGoals, state.live!.myGoals] : [state.live!.myGoals, state.live!.oppGoals];
    expect(view.container.textContent).toContain(first + '-' + second);
    expect(JSON.stringify(state)).toBe(held); expect(random).not.toHaveBeenCalled();
    expect(Object.values(view.callbacks).every(callback => callback.mock.calls.length === 0)).toBe(true);
  });
  it('halftime preservation: all three shape buttons keep their callbacks', () => {
    const state = interval('shape'), held = JSON.stringify(state), random = vi.spyOn(Math, 'random');
    const view = mount(state);
    for (const name of ['Sit in', 'As you were', 'Go at them']) fireEvent.click(screen.getByRole('button', { name: new RegExp('^' + name) }));
    expect(view.callbacks.onShape.mock.calls).toEqual([['defensive'], ['balanced'], ['attacking']]);
    expect(view.callbacks.onSub).not.toHaveBeenCalled(); expect(view.callbacks.onTalk).not.toHaveBeenCalled();
    expect(view.callbacks.onSecondHalf).not.toHaveBeenCalled();
    expect(JSON.stringify(state)).toBe(held); expect(random).not.toHaveBeenCalled();
  });
  it('halftime preservation: team talk and second-half callbacks stay exact', () => {
    const state = interval('talk-and-second-half'), held = JSON.stringify(state), random = vi.spyOn(Math, 'random');
    const view = mount(state);
    for (const tone of E.TALK_TONES) fireEvent.click(screen.getByRole('button', { name: new RegExp(tone.label) }));
    expect(view.callbacks.onTalk.mock.calls).toEqual([['calm'], ['rally'], ['demand'], ['blast']]);
    fireEvent.click(screen.getByRole('button', { name: 'Second half' }));
    expect(view.callbacks.onSecondHalf).toHaveBeenCalledTimes(1);
    expect(view.callbacks.onShape).not.toHaveBeenCalled(); expect(view.callbacks.onSub).not.toHaveBeenCalled();
    expect(JSON.stringify(state)).toBe(held); expect(random).not.toHaveBeenCalled();
  });
  it('halftime preservation: a career without a live match stays empty', () => {
    const actual = interval('not-live'), state = { ...actual, live: null }, held = JSON.stringify(state);
    const random = vi.spyOn(Math, 'random'), view = mount(state);
    expect(view.container.innerHTML).toBe('');
    expect(Object.values(view.callbacks).every(callback => callback.mock.calls.length === 0)).toBe(true);
    expect(JSON.stringify(state)).toBe(held); expect(random).not.toHaveBeenCalled();
  });
});
