import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY, nrlRegularRounds } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const saveBytes = () => localStorage.getItem(NRL_SAVE_KEY);
const fence = () => localStorage.getItem(fenceKeyOf(NRL_SAVE_KEY));
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });

function caretakerFixture() {
  let career = createNrlCareer('storm', 3, 2026, true);
  career = reduceNrlCareer(career, { type: 'signSponsor', year: 2026, clubId: 'storm', offer: 'twoSeason' });
  while (career.season.round < 14) career = advance(career);
  career = reduceNrlCareer(career, {
    type: 'acceptCaretakerJob', year: 2026, round: 14, clubId: 'storm', destinationId: 'dragons',
  });
  expect(career.season.clubId).toBe('dragons');
  return advance(career);
}

function open(career: NrlCareerState) {
  const bytes = JSON.stringify(career);
  localStorage.setItem(NRL_SAVE_KEY, bytes);
  const view = render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  return { ...view, bytes, generation: fence() };
}

function openPanel(label: string) {
  const summary = screen.getByText(label, { exact: true });
  fireEvent.click(summary);
  const details = summary.closest('details')!;
  expect(details.open).toBe(true);
  return within(details);
}

function chooseFixture(fixtures: ReturnType<typeof within>, name: RegExp) {
  const selector = fixtures.getByRole('combobox', { name: 'Fixture player scores' });
  selector.focus();
  const option = within(selector).getByRole<HTMLOptionElement>('option', { name });
  fireEvent.change(selector, { target: { value: option.value } });
  expect(selector).toHaveFocus();
}

function checkRound14() {
  const home = screen.getByRole('region', { name: 'Melbourne Storm player scores' });
  const away = screen.getByRole('region', { name: 'Newcastle Knights player scores' });
  expect(within(home).getByRole('heading', { name: 'Melbourne Storm · 50' })).toBeVisible();
  expect(within(away).getByRole('heading', { name: 'Newcastle Knights · 8' })).toBeVisible();
  expect(within(home).getByRole('list', { name: 'Scoring totals' })).toHaveTextContent('Tries 9');
  expect(within(home).getByRole('list', { name: 'Scoring totals' })).toHaveTextContent('Conversions 7');
  expect(within(away).getByRole('list', { name: 'Scoring totals' })).toHaveTextContent('Tries 2');
  for (const region of [home, away]) {
    const side = within(region);
    const totals = side.getByRole('list', { name: 'Scoring totals' });
    expect(totals).toHaveTextContent('Penalty goals 0');
    expect(totals).toHaveTextContent('Field goals 0');
    expect(totals).toHaveTextContent('2-point field goals 0');
    fireEvent.click(side.getByText('Starting 13'));
    expect(within(side.getByRole('list', { name: 'Starters' })).getAllByRole('listitem')).toHaveLength(13);
    expect(side.queryByText('Bench used')).not.toBeInTheDocument();
  }
  expect(within(home).getByRole('list', { name: 'Starters' })).toHaveTextContent('Arlo Hanley');
  expect(within(away).getByRole('list', { name: 'Scorers' })).toHaveTextContent(/.+4 pts/);
}

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

describe('NRL league match book on the manager route', () => {
  it('opens both rival team sheets and scoring after a caretaker move without changing the save', async () => {
    const career = caretakerFixture();
    const { bytes, generation } = open(career);
    const fixtures = openPanel('Season fixtures');
    const view = fixtures.getByRole('combobox', { name: 'Fixtures to show' });
    fireEvent.change(view, { target: { value: '14' } });
    chooseFixture(fixtures, /Round 14 · Storm 50–8 Knights/);
    checkRound14();

    fireEvent.change(view, { target: { value: 'club:storm' } });
    chooseFixture(fixtures, /Round 14 · Storm 50–8 Knights/);
    expect(screen.getByRole('region', { name: 'Melbourne Storm player scores' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Ladder' }));
    const leaders = openPanel('League player leaders');
    expect(within(await leaders.findByRole('table', { name: '2026 try leaders' })).getAllByRole('row').length).toBeGreaterThan(1);
    const scout = openPanel('Scout a club');
    fireEvent.change(scout.getByLabelText('Club to scout'), { target: { value: 'storm' } });
    const squad = await scout.findByRole('region', { name: 'Melbourne Storm squad' });
    expect(within(squad).getByText('Arlo Hanley').closest('li')).toHaveTextContent(/Starts [1-9]\d* · Tries \d+/);
    expect(saveBytes()).toBe(bytes);
    expect(fence()).toBe(generation);
  });

  it('keeps an archived match and year-labelled leaders readable after rollover and reload', async () => {
    let career = caretakerFixture();
    while (career.season.phase !== 'complete') career = advance(career);
    const next = reduceNrlCareer(career, { type: 'startNextSeason' });
    expect(next.season.year).toBe(2027);
    const { bytes, generation } = open(next);
    const fixtures = openPanel('Season fixtures');
    const year = fixtures.getByRole('combobox', { name: 'Fixture season' });
    fireEvent.change(year, { target: { value: '2026' } });
    fireEvent.change(fixtures.getByRole('combobox', { name: 'Fixtures to show' }), { target: { value: '14' } });
    chooseFixture(fixtures, /Round 14 · Storm 50–8 Knights/);
    checkRound14();
    fireEvent.change(year, { target: { value: '2027' } });
    expect(fixtures.queryByRole('combobox', { name: 'Fixture player scores' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ladder' }));
    fireEvent.change(screen.getByLabelText('Ladder season'), { target: { value: '2026' } });
    const leaders = openPanel('League player leaders');
    expect(await leaders.findByRole('table', { name: '2026 try leaders' })).toBeVisible();
    expect(saveBytes()).toBe(bytes);
    expect(fence()).toBe(generation);
  });

  it('keeps existing club reports available in a career that predates the league book', () => {
    const oldCareer = { ...advance(createNrlCareer('storm', 3)), leagueBook: undefined };
    const { bytes } = open(oldCareer);
    const fixtures = openPanel('Season fixtures');
    expect(fixtures.getByText('Round 1 match report')).toBeVisible();
    expect(fixtures.queryByRole('combobox', { name: 'Fixture player scores' })).not.toBeInTheDocument();
    expect(fixtures.queryByRole('combobox', { name: 'Fixture season' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ladder' }));
    expect(screen.queryByText('League player leaders')).not.toBeInTheDocument();
    expect(saveBytes()).toBe(bytes);
  });

  it('opens the former club’s archive when rejoining at an expansion club', () => {
    let career = createNrlCareer('storm', 4, 2026);
    for (let round = 0; round < 36 && career.season.phase !== 'complete'; round++) career = advance(career);
    career = reduceNrlCareer(career, { type: 'leaveClub', year: 2026, clubId: 'storm' });
    career = reduceNrlCareer(career, { type: 'simulateSeasonOut', year: 2026, clubId: 'storm' });
    career = reduceNrlCareer(career, {
      type: 'acceptVacancy', year: 2026, clubId: 'storm', destinationId: 'chiefs', joinYear: 2028,
    });
    expect(career.season.clubId).toBe('chiefs');
    const { bytes } = open(career);
    const fixtures = openPanel('Season fixtures');
    fireEvent.change(fixtures.getByRole('combobox', { name: 'Fixture season' }), { target: { value: '2027' } });
    expect(fixtures.getByRole('option', { name: 'Melbourne Storm' })).toBeInTheDocument();
    const selector = fixtures.getByRole('combobox', { name: 'Fixture player scores' });
    expect(within(selector).getAllByRole('option', { name: /Storm/ })).toHaveLength(24 + career.latestLeagueBook!.fixtures
      .filter(([round, home, away]) => round > nrlRegularRounds(2027) && [home, away].includes('storm')).length);
    expect(saveBytes()).toBe(bytes);
  });
});
