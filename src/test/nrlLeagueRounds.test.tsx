import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlNextRound, NRL_SAVE_KEY, reduceNrlSeason, type NrlMatchResult } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const fenceKey = fenceKeyOf(NRL_SAVE_KEY);
const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const name = (year: number, id: string) => nrlSeasonPlan(year).clubs.find(club => club.id === id)!.shortName;
const pairing = (year: number, home: string, away: string) => `${name(year, home)} vs ${name(year, away)}`;
const score = (year: number, result: NrlMatchResult) =>
  `${name(year, result.homeId)} ${result.homeScore}${String.fromCharCode(0x2013)}${result.awayScore} ${name(year, result.awayId)}`;

function open(rawSave: string) {
  localStorage.setItem(NRL_SAVE_KEY, rawSave);
  localStorage.setItem(fenceKey, '4');
  return render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
}

function openFixtures() {
  const summary = screen.getByText('Season fixtures');
  const details = summary.closest('details')!;
  expect(details).not.toHaveAttribute('open');
  fireEvent.click(summary);
  expect(details).toHaveAttribute('open');
  return within(details);
}

function chooseRound(fixtures: ReturnType<typeof openFixtures>, round: number) {
  const select = fixtures.getByLabelText('Fixtures to show') as HTMLSelectElement;
  select.focus();
  fireEvent.change(select, { target: { value: String(round) } });
  expect(select).toHaveFocus();
  return select;
}

function matchLines(fixtures: ReturnType<typeof openFixtures>) {
  return within(fixtures.getByRole('list', { name: 'League round matches' })).getAllByRole('listitem').map(row => row.textContent?.trim());
}

function finish(career: NrlCareerState) {
  for (let i = 0; i < 40 && career.season.phase !== 'complete'; i++) career = advance(career);
  expect(career.season.phase).toBe('complete');
  return career;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

describe('NRL league round fixtures', () => {
  it('previews several regular rounds and saves once when an academy report stops the run', () => {
    const initial = reduceNrlCareer(createNrlCareer('panthers', 16), { type: 'scoutAcademy', role: 'Halfback' });
    const bytes = JSON.stringify(initial);
    open(bytes);
    const initialFence = Number(localStorage.getItem(fenceKey));
    const summary = screen.getByText('Fast-forward rounds', { exact: true });
    fireEvent.click(summary);
    const drawer = within(summary.closest('details')!);
    expect(drawer.getByText(/Round 1 · Bye/)).toBeVisible();
    fireEvent.change(drawer.getByLabelText('Simulate through'), { target: { value: '4' } });
    expect(raw()).toBe(bytes);
    fireEvent.click(drawer.getByRole('button', { name: 'Simulate through Round 4' }));
    expect(drawer.getByRole('status')).toHaveTextContent('Simulated 1 round');
    expect(drawer.getByRole('status')).toHaveTextContent('An academy report is ready');
    expect(drawer.getByRole('status')).toHaveFocus();
    expect(raw()).toBe(JSON.stringify(advance(initial)));
    expect(Number(localStorage.getItem(fenceKey))).toBe(initialFence + 1);
  });

  it('retries a refused four-round save without replaying the batch or double-advancing', () => {
    const initial = createNrlCareer('bears', 1, 2027);
    const bytes = JSON.stringify(initial);
    open(bytes);
    const initialFence = Number(localStorage.getItem(fenceKey));
    const summary = screen.getByText('Fast-forward rounds', { exact: true });
    fireEvent.click(summary);
    const drawer = within(summary.closest('details')!);
    fireEvent.change(drawer.getByLabelText('Simulate through'), { target: { value: '4' } });
    fireEvent(summary.closest('details')!, new Event('toggle'));
    expect(drawer.getByText(/season sponsor, board pathways objective/)).toBeVisible();
    const write = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === NRL_SAVE_KEY) throw new DOMException('Quota full', 'QuotaExceededError');
      write.call(this, key, value);
    });
    fireEvent.click(drawer.getByRole('button', { name: 'Simulate through Round 4' }));
    expect(drawer.getByRole('status')).toHaveTextContent('Simulated 4 rounds');
    expect(raw()).toBe(bytes);
    spy.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    let expected = initial;
    for (let i = 0; i < 4; i++) expected = advance(expected);
    expect(raw()).toBe(JSON.stringify(expected));
    expect(Number(localStorage.getItem(fenceKey))).toBe(initialFence + 1);
  });

  it('leaves a newer tab’s save in place and publishes no simulated receipt', () => {
    const initial = createNrlCareer('bears', 1, 2027);
    open(JSON.stringify(initial));
    const initialFence = localStorage.getItem(fenceKey);
    const summary = screen.getByText('Fast-forward rounds', { exact: true });
    fireEvent.click(summary);
    const drawer = within(summary.closest('details')!);
    const competing = JSON.stringify(advance(initial));
    localStorage.setItem(NRL_SAVE_KEY, competing);
    fireEvent.click(drawer.getByRole('button', { name: 'Simulate through Round 2' }));
    expect(raw()).toBe(competing);
    expect(localStorage.getItem(fenceKey)).toBe(initialFence);
    expect(drawer.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload your season' })).toBeVisible();
  });

  it('keeps the club calendar default and shows actual round scores and byes', () => {
    const career = createNrlCareer('storm', 17);
    const bytes = JSON.stringify(career);
    const plan = nrlSeasonPlan(2026);
    open(bytes);
    const fixtures = openFixtures();
    const fence = localStorage.getItem(fenceKey);
    expect(fixtures.getByLabelText('Fixtures to show')).toHaveValue('');
    expect(fixtures.getByRole('list', { name: 'Club season fixtures' })).toBeVisible();

    chooseRound(fixtures, 1);
    expect(matchLines(fixtures)).toEqual(plan.draw[0].map(([home, away]) => pairing(2026, home, away)));
    const byes = plan.clubs.filter(club => !plan.draw[0].some(pair => pair.includes(club.id)));
    expect(byes.length).toBeGreaterThan(0);
    const byeLine = `${byes.length === 1 ? 'Bye' : 'Byes'} · ${byes.map(club => club.shortName).join(', ')}`;
    expect(fixtures.getByText(byeLine)).toBeVisible();
    expect(raw()).toBe(bytes);
    expect(localStorage.getItem(fenceKey)).toBe(fence);

    fireEvent.click(screen.getByRole('button', { name: 'Quick Sim' }));
    const settled = advance(career);
    const expected = JSON.stringify(settled);
    expect(raw()).toBe(expected);
    expect(matchLines(fixtures)).toEqual(settled.season.results.map(result => score(2026, result)));
    expect(fixtures.getByText(byeLine)).toBeVisible();
    const afterAdvanceFence = localStorage.getItem(fenceKey);
    chooseRound(fixtures, 2);
    expect(matchLines(fixtures)).toEqual(plan.draw[1].map(([home, away]) => pairing(2026, home, away)));
    expect(raw()).toBe(expected);
    expect(localStorage.getItem(fenceKey)).toBe(afterAdvanceFence);
  });

  it('shows the known finals draw for an eliminated club and preserves the settled bracket', () => {
    let career = createNrlCareer('titans', 1);
    while (career.season.phase === 'regular') career = advance(career);
    const next = nrlNextRound(career.season);
    expect(next.clubStatus).toBe('eliminated');
    expect(next.fixtures).toHaveLength(4);
    const view = open(JSON.stringify(career));
    let fixtures = openFixtures();
    chooseRound(fixtures, next.round);
    expect(fixtures.queryByRole('option', { name: 'Finals week 2' })).not.toBeInTheDocument();
    expect(matchLines(fixtures)).toEqual(next.fixtures.map(match => pairing(2026, match.homeId, match.awayId)));
    expect(fixtures.queryByText(/^Byes? ·/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Simulate qualifying and elimination finals/i }));
    const settled = advance(career);
    expect(raw()).toBe(JSON.stringify(settled));
    expect(fixtures.getByRole('option', { name: 'Finals week 2' })).toBeInTheDocument();
    expect(matchLines(fixtures)).toEqual(settled.season.results.filter(result => result.round === next.round).map(result => score(2026, result)));

    view.unmount();
    const complete = finish(settled);
    const bytes = JSON.stringify(complete);
    open(bytes);
    fixtures = openFixtures();
    for (const [index, count] of [4, 2, 2, 1].entries()) {
      const round = nrlSeasonPlan(2026).draw.length + index + 1;
      const results = complete.season.results.filter(result => result.round === round);
      expect(results).toHaveLength(count);
      chooseRound(fixtures, round);
      expect(matchLines(fixtures)).toEqual(results.map(result => score(2026, result)));
    }
    expect(raw()).toBe(bytes);
  });

  it('opens the new generated calendar after a real 2027 rollover', () => {
    const complete = finish(createNrlCareer('bears', 7, 2027));
    open(JSON.stringify(complete));
    let fixtures = openFixtures();
    chooseRound(fixtures, complete.season.round);
    expect(fixtures.getByRole('option', { name: 'Grand final' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review this season' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start 2028' }));
    const after = reduceNrlCareer(complete, { type: 'startNextSeason' });
    const bytes = JSON.stringify(after);
    expect(raw()).toBe(bytes);
    fixtures = openFixtures();
    expect(fixtures.getByLabelText('Fixtures to show')).toHaveValue('');
    expect(fixtures.queryByRole('option', { name: 'Grand final' })).not.toBeInTheDocument();
    const plan = nrlSeasonPlan(2028);
    const round = plan.draw.findIndex(fixtures => fixtures.some(pair => pair.includes('chiefs'))) + 1;
    expect(round).toBeGreaterThan(0);
    chooseRound(fixtures, round);
    expect(matchLines(fixtures)).toEqual(plan.draw[round - 1].map(([home, away]) => pairing(2028, home, away)));
    expect(fixtures.getByText(/Chiefs/)).toBeVisible();
    expect(raw()).toBe(bytes);
  });

  it('reads all recorded results from a real v1 and its imported v2 without rewriting either', () => {
    const legacy = reduceNrlSeason(createNrlSeason('storm', 17), { type: 'advance' });
    const imported = readNrlCareerSave(JSON.stringify(legacy))!;
    expect(imported.legacySeason).toBe(true);
    for (const bytes of [JSON.stringify(legacy), JSON.stringify(imported)]) {
      const view = open(bytes);
      const fixtures = openFixtures();
      const fence = localStorage.getItem(fenceKey);
      chooseRound(fixtures, 1);
      expect(matchLines(fixtures)).toEqual(legacy.results.map(result => score(2026, result)));
      expect(raw()).toBe(bytes);
      expect(localStorage.getItem(fenceKey)).toBe(fence);
      view.unmount();
    }
  });
});
