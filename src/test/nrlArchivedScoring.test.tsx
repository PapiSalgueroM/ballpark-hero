import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerHistoryRow, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, NRL_ROLES, NRL_SAVE_KEY, reduceNrlSeason } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const bytes = JSON.stringify;
const fence = fenceKeyOf(NRL_SAVE_KEY);
const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

function finish(career: NrlCareerState) {
  for (let tick = 0; tick < 40 && career.season.phase !== 'complete'; tick++) career = reduceNrlCareer(career, { type: 'advance' });
  expect(career.season.phase).toBe('complete');
  return career;
}

function open(save: string) {
  localStorage.setItem(NRL_SAVE_KEY, save);
  localStorage.setItem(fence, '4');
  return render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
}

function verifyScorers({ year, scoring }: NrlCareerHistoryRow) {
  expect(scoring!.length).toBeGreaterThan(2);
  const summary = screen.getByText(year + ' player scoring', { exact: true });
  const details = summary.closest('details')!;
  expect(details).not.toHaveAttribute('open');
  fireEvent.click(summary);
  const table = within(details).getByRole('table', { name: year + ' recorded club scoring' });
  const rows = within(table).getAllByRole('row');
  expect(rows).toHaveLength(scoring!.length + 1);
  const headers = ['Player', 'Tries', 'Conversions', 'Penalty goals', 'One-point field goals', 'Two-point field goals', 'Points'];
  headers.forEach(name => expect(within(rows[0]).getByRole('columnheader', { name })).toBeVisible());
  const actual = rows.slice(1).map(row => [
    within(row).getByRole('rowheader').textContent,
    ...within(row).getAllByRole('cell').map(cell => Number(cell.textContent)),
  ]);
  expect(actual).toEqual(scoring!.map(([, name, tries, conversions, penalties, fieldGoals, longFieldGoals]) =>
    [name, tries, conversions, penalties, fieldGoals, longFieldGoals, 4 * tries + 2 * conversions + 2 * penalties + fieldGoals + 2 * longFieldGoals]));
}

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

describe('NRL archived club scoring', () => {
  it('keeps a scoreless player’s appearance history through rollover without writing when opened', async () => {
    const initial = createNrlCareer('storm', 4);
    const firstRound = reduceNrlCareer(initial, { type: 'advance' });
    const firstMatch = firstRound.season.results.find(match => match.playerScoring)!;
    const starter = firstMatch.playerScoring!.starters.find(id => firstMatch.playerScoring!.lines.every(line => line.playerId !== id))!;
    const role = NRL_ROLES.find(position => initial.season.lineup[position] === starter)!;
    const replacement = initial.season.squad.find(player => player.role === role && player.id !== starter)!;
    const completed = finish(reduceNrlCareer(firstRound, { type: 'selectStarter', role, playerId: replacement.id }));
    const matches = completed.season.results.filter(match => match.playerScoring);
    const first = matches[0].playerScoring!;
    const playerId = first.starters.find(id => matches.every(match => match.playerScoring!.lines.every(line => line.playerId !== id)))!;
    const player = completed.season.squad.find(entry => entry.id === playerId)!;
    const regularStarts = matches.filter(match => !match.finalsRound && match.playerScoring!.starters.includes(playerId)).length;
    const regularBench = matches.filter(match => !match.finalsRound && match.benchUsed?.includes(playerId)).length;
    const finalsStarts = matches.filter(match => match.finalsRound && match.playerScoring!.starters.includes(playerId)).length;
    const finalsBench = matches.filter(match => match.finalsRound && match.benchUsed?.includes(playerId)).length;
    expect(regularStarts).toBeGreaterThan(0);
    expect(completed.history[0].scoring?.some(row => row[0] === playerId)).toBe(false);

    const rolled = reduceNrlCareer(completed, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    const original = bytes(rolled);
    expect(bytes(readNrlCareerSave(original))).toBe(original);
    open(original);
    click('Club office');
    click('Season review');
    const summary = screen.getByText('Player history', { exact: true });
    expect(summary.closest('details')).not.toHaveAttribute('open');
    fireEvent.click(summary);
    fireEvent.change(await screen.findByLabelText('Player'), { target: { value: playerId } });
    const table = screen.getByRole('table', { name: '2026 Storm player history' });
    const values = (label: string) => {
      const row = within(table).getByRole('rowheader', { name: label }).closest('tr')!;
      return within(row).getAllByRole('cell').map(cell => Number(cell.textContent));
    };
    expect(values('Regular season')).toEqual([regularStarts + regularBench, regularStarts, regularBench, 0, 0]);
    expect(values('Finals')).toEqual([finalsStarts + finalsBench, finalsStarts, finalsBench, 0, 0]);
    expect(screen.getByText('Rating ' + player.rating + ' OVR')).toBeVisible();
    expect(raw()).toBe(original);
    expect(localStorage.getItem(fence)).toBe('4');
  });

  it('archives the exact match counts and scoring by phase, and rejects inconsistent archives', () => {
    const complete = finish(createNrlCareer('storm', 4));
    const next = reduceNrlCareer(complete, { type: 'startNextSeason' });
    const record = next.history[0];
    const archive = record.playerSeasons!;
    const expected = [];
    for (const player of complete.season.squad) {
      const counts = [0, 0, 0, 0];
      const scores = [0, 0, 0, 0, 0];
      for (const match of complete.season.results) {
        if (!match.playerScoring) continue;
        const phase = match.finalsRound ? 2 : 0;
        if (match.playerScoring.starters.includes(player.id)) counts[phase]++;
        if (match.benchUsed?.includes(player.id)) counts[phase + 1]++;
        if (!match.finalsRound) continue;
        const line = match.playerScoring.lines.find(scorer => scorer.playerId === player.id);
        if (!line) continue;
        scores[0] += line.tries;
        scores[1] += line.conversions;
        scores[2] += line.penalties;
        scores[3] += line.fieldGoals;
        scores[4] += line.longFieldGoals;
      }
      if (counts.some(Boolean)) expected.push([player.id, player.name, player.rating, ...counts, ...(scores.some(Boolean) ? [scores] : [])]);
    }
    expect([...archive].sort((a, b) => a[0].localeCompare(b[0]))).toEqual(expected.sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
    expect(archive.some(row => row[4] > 0 || row[6] > 0)).toBe(true);
    expect(archive.some(row => row[7])).toBe(true);
    const replace = (patch: Partial<NrlCareerHistoryRow>) => readNrlCareerSave(bytes({ ...next, history: [{ ...record, ...patch }] }));
    expect(replace({ playerSeasons: [archive[0], ...archive] })).toBeNull();
    expect(replace({ playerSeasons: archive.slice(1) })).toBeNull();
    const damaged = structuredClone(archive);
    damaged.find(row => row[7])![7]![0] += 999;
    expect(replace({ playerSeasons: damaged })).toBeNull();
    expect(replace({ scoring: undefined })).toBeNull();
    expect(replace({ finals: undefined })).toBeNull();
    expect(complete.history[0]).not.toHaveProperty('playerSeasons');
  });

  it('shows a rating change only between real consecutive observations, including while retired', async () => {
    const first = finish(createNrlCareer('storm', 4));
    const second = finish(reduceNrlCareer(first, { type: 'startNextSeason' }));
    const archived = second.history[0].playerSeasons!;
    const participants = new Set(second.season.results.flatMap(match => [
      ...(match.playerScoring?.starters ?? []), ...(match.benchUsed ?? []),
    ]));
    const player = second.season.squad.find(candidate => participants.has(candidate.id)
      && archived.some(([id, , rating]) => id === candidate.id && rating !== candidate.rating))!;
    const prior = archived.find(([id]) => id === player.id)![2];
    const delta = player.rating - prior;
    const retired = reduceNrlCareer(second, { type: 'retireCareer', year: 2027, clubId: 'storm' });
    const original = bytes(retired);
    open(original);
    fireEvent.click(screen.getByText('Player history', { exact: true }));
    fireEvent.change(await screen.findByLabelText('Player'), { target: { value: player.id } });
    expect(screen.getByRole('table', { name: '2026 Storm player history' })).toBeVisible();
    expect(screen.getByRole('table', { name: '2027 Storm player history' })).toBeVisible();
    expect(screen.getByText('Rating ' + player.rating + ' OVR (' + (delta > 0 ? '+' : '') + delta + ' from prior recorded season)')).toBeVisible();
    expect(raw()).toBe(original);
    expect(localStorage.getItem(fence)).toBe('4');
  });

  it('shows earlier scoring-only coverage and keeps older v1 matches untracked', async () => {
    const next = reduceNrlCareer(finish(createNrlCareer('storm', 4)), { type: 'startNextSeason' });
    const { playerSeasons: _playerSeasons, ...previous } = next.history[0];
    const original = bytes({ ...next, history: [previous] });
    expect(bytes(readNrlCareerSave(original))).toBe(original);
    const view = open(original);
    click('Club office');
    click('Season review');
    fireEvent.click(screen.getByText('Player history', { exact: true }));
    fireEvent.change(await screen.findByLabelText('Player'), { target: { value: previous.scoring![0][0] } });
    expect(screen.getByText(/Appearances, match split and rating are unavailable/)).toBeVisible();
    expect(screen.queryByRole('table', { name: '2026 Storm player history' })).not.toBeInTheDocument();
    expect(raw()).toBe(original);
    view.unmount();
    saveFence.release(NRL_SAVE_KEY);

    const legacy = reduceNrlSeason(createNrlSeason('storm', 4), { type: 'advance' });
    const v1 = bytes(legacy);
    open(v1);
    click('Club office');
    click('Season review');
    fireEvent.click(screen.getByText('Player history', { exact: true }));
    expect(await screen.findByText(/Player match records are unavailable for this saved season/)).toBeVisible();
    expect(screen.queryByLabelText('Player')).not.toBeInTheDocument();
    expect(raw()).toBe(v1);
    expect(reduceNrlCareer(finish(readNrlCareerSave(v1)!), { type: 'startNextSeason' }).history[0]).not.toHaveProperty('playerSeasons');
  });

  it('distinguishes separate player IDs with matching names and keeps unique labels plain', async () => {
    const first = finish(createNrlCareer('storm', 4));
    const second = finish(reduceNrlCareer(first, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } }));
    const next = reduceNrlCareer(second, { type: 'startNextSeason' });
    const withOldRecords = next.history.map(({ playerSeasons: _playerSeasons, ...row }, index) => ({
      ...row,
      scoring: [
        ['history-1', 'Shared Name', index + 1, 0, 0, 0, 0],
        ...(index ? [
          ['history-2', 'Shared Name', 3, 0, 0, 0, 0],
          ['history-3', 'Unique Name', 1, 0, 0, 0, 0],
        ] : [
          ['history-4', 'Shared Name', 5, 0, 0, 0, 0],
        ]),
      ],
    }));
    const original = bytes({ ...next, history: withOldRecords });
    expect(bytes(readNrlCareerSave(original))).toBe(original);
    open(original);
    click('Club office');
    click('Season review');
    fireEvent.click(screen.getByText('Player history', { exact: true }));
    const select = await screen.findByLabelText('Player');
    expect(within(select).getAllByRole('option').map(option => option.textContent)).toEqual([
      'Shared Name (Bears, 2027, history-1)', 'Shared Name (Bears, 2027, history-2)',
      'Shared Name (Storm, 2026)', 'Unique Name',
    ]);
    fireEvent.change(select, { target: { value: 'history-4' } });
    expect(screen.getByText(/5 tries · 20 points/)).toBeVisible();
    expect(screen.queryByText(/3 tries · 12 points/)).not.toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'history-2' } });
    expect(screen.getByText(/3 tries · 12 points/)).toBeVisible();
    expect(screen.queryByText(/5 tries · 20 points/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Player history', { exact: true }));
    await waitFor(() => expect(screen.queryByLabelText('Player')).not.toBeInTheDocument());
    fireEvent.click(screen.getByText('Player history', { exact: true }));
    expect(await screen.findByLabelText('Player')).toHaveValue('history-2');
    expect(raw()).toBe(original);
    expect(localStorage.getItem(fence)).toBe('4');
  });

  it('shows every recorded scorer before and after actual rollover without changing storage', () => {
    const complete = finish(createNrlCareer('storm', 4));
    const original = bytes(complete);
    open(original);
    click('Review this season');
    verifyScorers(complete.history[0]);
    expect(raw()).toBe(original);
    expect(localStorage.getItem(fence)).toBe('4');

    click('Start 2027');
    const rolled = raw()!;
    click('Club office');
    click('Season review');
    verifyScorers(complete.history[0]);
    expect(raw()).toBe(rolled);
    expect(localStorage.getItem(fence)).toBe('5');
  });

  it('keeps both clubs’ scoring rows browsable after retirement', () => {
    const complete = finish(createNrlCareer('storm', 4));
    const perth = reduceNrlCareer(complete, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    const second = finish(perth);
    const retired = reduceNrlCareer(second, { type: 'retireCareer', year: 2027, clubId: 'bears' });
    const original = bytes(retired);
    open(original);
    expect(screen.getByRole('heading', { name: 'Season review' })).toBeVisible();
    verifyScorers(retired.history[0]);
    verifyScorers(retired.history[1]);
    expect(raw()).toBe(original);
    expect(localStorage.getItem(fence)).toBe('4');
  });

  it('explains unavailable archived scoring in an older save', () => {
    const complete = finish(createNrlCareer('storm', 4));
    const rolled = reduceNrlCareer(complete, { type: 'startNextSeason' });
    const { scoring, playerSeasons: _playerSeasons, ...older } = rolled.history[0];
    expect(scoring?.length).toBeGreaterThan(0);
    const original = bytes({ ...rolled, history: [older] });
    expect(bytes(readNrlCareerSave(original))).toBe(original);
    open(original);
    click('Club office');
    click('Season review');
    expect(screen.getByText('Player scoring is unavailable for this saved season.')).toBeVisible();
    expect(screen.queryByText('2026 player scoring', { exact: true })).not.toBeInTheDocument();
    expect(raw()).toBe(original);
    expect(localStorage.getItem(fence)).toBe('4');
  });
});
