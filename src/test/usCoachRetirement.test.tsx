import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CoachCareerPanel, { CoachStartCard } from '@/components/us-career/CoachCareerPanel';
import * as Coach from '@/lib/usCoachCareer';
import type { CoachCareerState } from '@/lib/usCoachCareer';
import type { UsCareerLike } from '@/lib/usCareerToCoach';

const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function fixture(employed = true): CoachCareerState {
  const file = path.resolve(__dirname, 'fixtures/usCoachPoachingScouts888.json');
  const scout = (JSON.parse(readFileSync(file, 'utf8')) as {
    scouts: Record<string, { draws: number; player: UsCareerLike & { year: number } }>;
  }).scouts['1'];
  let seed = 1;
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let value = Math.imul(seed ^ seed >>> 15, seed | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  for (let i = 0; i < scout.draws; i++) random();
  const state = Coach.startCoachCareer('nba', { ...json(scout.player), retired: true }, scout.player.year, random);
  expect(state.offers.length).toBeGreaterThan(0);
  if (!employed) return state;
  const played = Coach.playCoachSeason(Coach.acceptCoachOffer(state, 0), random).state;
  expect(played.job).not.toBeNull();
  expect(played.results).toHaveLength(1);
  return played;
}
function panel(state: CoachCareerState, onChange = vi.fn(), onBack = vi.fn()) {
  return { ...render(<CoachCareerPanel state={state} playerName="Fictional coach" feed={[]}
    onChange={onChange} onBack={onBack} />), onChange, onBack };
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('US coaching retirement', () => {
  it('completed coach cannot play another season', () => {
    const state = { ...fixture(), done: true }, held = json(state), random = vi.fn(() => 0.5);
    const result = Coach.playCoachSeason(state, random);
    expect(result.state.year === state.year).toBe(true);
    expect(result).toEqual({ state: held, notes: [] });
    expect(state).toEqual(held); expect(random).not.toHaveBeenCalled();
  });

  it('completed coach cannot sit out another season', () => {
    const state = { ...fixture(false), done: true }, held = json(state), random = vi.fn(() => 0.5);
    const result = Coach.sitOutCoachSeason(state, random);
    expect(result.state.year === state.year).toBe(true);
    expect(result).toEqual({ state: held, notes: [] });
    expect(state).toEqual(held); expect(random).not.toHaveBeenCalled();
  });

  it('completed coach cannot accept an old offer', () => {
    const state = { ...fixture(false), done: true }, held = json(state);
    const result = Coach.acceptCoachOffer(state, 0);
    expect(result.job === null).toBe(true);
    expect(result).toEqual(held); expect(state).toEqual(held);
  });

  it('completed coach cannot refresh the market', () => {
    const state = { ...fixture(false), done: true }, held = json(state), random = vi.fn(() => 0.5);
    Coach.refreshCoachOffers(state, random);
    expect(random.mock.calls.length === 0).toBe(true);
    expect(state).toEqual(held);
  });

  it('retiring changes only done and is pure and idempotent', () => {
    const retire = (Coach as unknown as { retireCoachCareer?: (state: CoachCareerState) => CoachCareerState }).retireCoachCareer;
    expect(typeof retire === 'function').toBe(true);
    const state = fixture(), held = json(state);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Retirement must not draw'); });
    const retired = retire!(state);
    expect(retired).toEqual({ ...held, done: true }); expect(state).toEqual(held);
    expect(retire!(retired)).toEqual(retired); expect(random).not.toHaveBeenCalled();
  });

  it('retirement requires confirmation and accepts once after cancel and escape', async () => {
    const state = fixture(), held = json(state), view = panel(state);
    const opener = view.queryByRole('button', { name: 'Retire from coaching' });
    expect(opener !== null).toBe(true);
    fireEvent.click(opener!);
    let dialog = within(document.body).getByRole('alertdialog', { name: 'Retire from coaching?' });
    expect(dialog).toHaveAccessibleDescription(); expect(view.onChange).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep coaching' }));
    await waitFor(() => expect(within(document.body).queryByRole('alertdialog')).toBeNull());
    fireEvent.click(opener!);
    dialog = within(document.body).getByRole('alertdialog', { name: 'Retire from coaching?' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(within(document.body).queryByRole('alertdialog')).toBeNull());
    expect(view.onChange).not.toHaveBeenCalled(); expect(state).toEqual(held);
    fireEvent.click(opener!);
    dialog = within(document.body).getByRole('alertdialog', { name: 'Retire from coaching?' });
    const confirm = within(dialog).getByRole('button', { name: 'Retire from coaching' });
    act(() => { confirm.click(); confirm.click(); });
    expect(view.onChange).toHaveBeenCalledTimes(1);
    expect(view.onChange.mock.calls[0][0]).toEqual({ ...held, done: true });
    expect(state).toEqual(held); expect(view.onBack).not.toHaveBeenCalled();
  });

  it('completed employed coach keeps the record and log without season actions', () => {
    const state = { ...fixture(), done: true }, view = panel(state), last = state.results[0];
    expect(view.queryByRole('button', { name: /^Coach the \d+ season$/ }) === null).toBe(true);
    expect(view.getByRole('heading', { name: 'Coaching career complete' })).toBeInTheDocument();
    expect(view.queryByRole('button', { name: 'Retire from coaching' })).toBeNull();
    fireEvent.click(view.getByRole('button', { name: /Coaching Log/ }));
    expect(view.getByText(last.line)).toBeInTheDocument();
    expect(view.getAllByText(Coach.formatCoachRecord(last)).length).toBeGreaterThan(0);
    expect(view.onChange).not.toHaveBeenCalled();
  });

  it('completed unemployed coach cannot take offers or advance the calendar', () => {
    const state = { ...fixture(false), done: true }, view = panel(state);
    expect(view.queryByRole('button', { name: /^Sit out the \d+ season$/ }) === null).toBe(true);
    expect(view.getByRole('heading', { name: 'Coaching career complete' })).toBeInTheDocument();
    expect(view.queryByRole('button', { name: new RegExp(state.offers[0].team) })).toBeNull();
    fireEvent.click(view.getByRole('button', { name: /The Market/ }));
    expect(view.queryByRole('button', { name: /^Take the .+ job$/ })).toBeNull();
    expect(view.onChange).not.toHaveBeenCalled();
  });

  it('completed start card opens a review instead of offering a coaching return', () => {
    const resume = vi.fn(), start = vi.fn();
    const view = render(<CoachStartCard sport="nba" existing={{ ...fixture(), done: true }} onStart={start} onResume={resume} />);
    const review = view.queryByRole('button', { name: 'Review coaching career' });
    expect(review !== null).toBe(true); expect(view.queryByRole('button', { name: 'Back to the sideline' })).toBeNull();
    fireEvent.click(review!); expect(resume).toHaveBeenCalledTimes(1); expect(start).not.toHaveBeenCalled();
  });

  it('active coaching still plays one season and leaves its input unchanged', () => {
    const state = fixture(), held = json(state), random = vi.fn(() => 0.5);
    const result = Coach.playCoachSeason(state, random);
    expect(result.state.year).toBe(state.year + 1); expect(result.state.results).toHaveLength(state.results.length + 1);
    expect(result.state.results.slice(0, -1)).toEqual(state.results); expect(result.state.done).toBe(false);
    expect(random.mock.calls.length).toBeGreaterThan(0); expect(state).toEqual(held);
  });

  it('active coach still accepts a genuine offer without changing year or history', () => {
    const state = fixture(false), held = json(state), result = Coach.acceptCoachOffer(state, 0);
    expect(result.job?.team).toBe(state.offers[0].team); expect(result.unemployed).toBe(false);
    expect(result.year).toBe(state.year); expect(result.results).toEqual(state.results); expect(state).toEqual(held);
  });

  it('legacy coaching saves without done keep their active career', () => {
    const state = fixture(), legacy = json(state);
    delete (legacy as Partial<CoachCareerState>).done;
    const before = json(legacy), restored = Coach.ensureCoachCareer(legacy, 'nba');
    expect(restored?.done).toBe(false); expect(restored?.year).toBe(state.year);
    expect(restored?.results).toEqual(state.results); expect(legacy).toEqual(before);
  });

  it('completed coaching saves preserve their full record on JSON reload', () => {
    const state = { ...fixture(), done: true };
    expect(Coach.ensureCoachCareer(json(state), 'nba')).toEqual(state);
  });

  it('active start card still resumes the sideline without starting over', () => {
    const resume = vi.fn(), start = vi.fn();
    const view = render(<CoachStartCard sport="nba" existing={fixture()} onStart={start} onResume={resume} />);
    fireEvent.click(view.getByRole('button', { name: 'Back to the sideline' }));
    expect(resume).toHaveBeenCalledTimes(1); expect(start).not.toHaveBeenCalled();
  });
});
