import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { createNrlCareer, nrlDevelopmentAssistantProgress, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY, createNrlSeason, nrlHoldableReserves } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

it.each([false, true])('shows exact match rating changes and keeps them on reload with live play %s', live => {
  let before = createNrlCareer('broncos', 1, 2026);
  while (before.season.round < 7) before = reduceNrlCareer(before, { type: 'advance' });
  const fence = fenceKeyOf(NRL_SAVE_KEY);
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(before));
  localStorage.setItem(fence, '4');
  const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  const view = show();
  const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
  if (live) {
    click('Play Live');
    expect(screen.queryByText('Match rating changes')).toBeNull();
    click('Play second half');
  } else click('Quick Sim');
  const expected = reduceNrlCareer(before, { type: 'advance' });
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(JSON.stringify(expected));
  expect(localStorage.getItem(fence)).toBe(live ? '6' : '5');
  const verify = (reportName: string) => {
    const report = within(screen.getByRole('region', { name: reportName }));
    const summary = report.getByText('Match rating changes', { exact: true });
    expect(summary.closest('summary')).toHaveTextContent('1 up · 1 down');
    fireEvent.click(summary);
    const rows = within(report.getByRole('list', { name: 'Player rating changes' })).getAllByRole('listitem');
    expect(rows.map(row => row.textContent)).toEqual(['Koa Nairn+1 OVR', 'Teo Dawson-1 OVR']);
  };
  verify(live ? 'Full time' : 'Round 7 results');
  view.unmount();
  show();
  verify('Round 7 results');
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(JSON.stringify(expected));
});

it.each([[11, false, true], [16, false, false], [1, true, false]] as const)(
  'shows an empty match review only for a tracked round %s, legacy %s', (round, legacy, showEmpty) => {
    let before = legacy ? readNrlCareerSave(JSON.stringify(createNrlSeason('broncos', 1, 2026)))! : createNrlCareer('broncos', 1, 2026);
    while (before.season.round < round) before = reduceNrlCareer(before, { type: 'advance' });
    const settled = reduceNrlCareer(before, { type: 'advance' });
    if (!legacy) expect(settled.ratingReview?.round).toBe(10);
    localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(settled));
    render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
    const report = within(screen.getByRole('region', { name: `Round ${round} results` }));
    expect(Boolean(report.queryByText('No OVR changes in this match review.'))).toBe(showEmpty);
    expect(report.queryByText('Match rating changes')).toBeNull();
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(JSON.stringify(settled));
  },
);

it('does not attach the last regular-season review to a settled finals match', () => {
  let before = createNrlCareer('broncos', 95, 2026);
  while (before.season.phase === 'regular') before = reduceNrlCareer(before, { type: 'advance' });
  const settled = reduceNrlCareer(before, { type: 'advance' });
  expect(settled.ratingReview).toBe(before.ratingReview);
  expect(settled.season.results.some(match => match.finalsRound && match.playerScoring)).toBe(true);
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(settled));
  render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  const report = within(screen.getByRole('region', { name: 'Latest finals results' }));
  expect(report.queryByText('Match rating changes')).toBeNull();
  expect(report.queryByText('No OVR changes in this match review.')).toBeNull();
});

it('reopens the exact older match review after a later round has replaced the squad review', async () => {
  let state = createNrlCareer('broncos', 1, 2026);
  while (state.season.round < 12) state = reduceNrlCareer(state, { type: 'advance' });
  expect(state.ratingReview?.round).toBe(10);
  expect(state.season.results.find(match => match.round === 7 && match.playerScoring)?.ratingChanges).toHaveLength(2);
  expect(state.season.results.find(match => match.round === 11 && match.playerScoring)?.ratingChanges).toEqual([]);
  const old = { ...state, season: { ...state.season, results: state.season.results.map(({ ratingChanges, ...match }) => match) } };
  expect(readNrlCareerSave(JSON.stringify(old))).toEqual(old);
  const mutate = (ratings: unknown, round: number, managed: boolean) => readNrlCareerSave(JSON.stringify({
    ...state, season: { ...state.season, results: state.season.results.map(match =>
      match.round === round && Boolean(match.playerScoring) === managed ? { ...match, ratingChanges: ratings } : match) },
  }));
  const [playerId] = state.ratingReview!.changes[0];
  expect(mutate([['foreign', 1]], 7, true)).toBeNull();
  expect(mutate([[playerId, 2]], 7, true)).toBeNull();
  expect(mutate([], 7, false)).toBeNull();
  expect(mutate([], 10, true)).toBeNull();
  const raw = JSON.stringify(state);
  expect(readNrlCareerSave(raw)).toEqual(state);
  localStorage.setItem(NRL_SAVE_KEY, raw);
  render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  fireEvent.click(screen.getByText('Season fixtures', { exact: true }));
  const report = screen.getByText('Round 7 match report', { exact: true });
  fireEvent.click(report);
  const contents = within(report.closest('details')!);
  const rating = await contents.findByText('Match rating changes', { exact: true });
  expect(rating.closest('summary')).toHaveTextContent('1 up · 1 down');
  fireEvent.click(rating);
  expect(within(contents.getByRole('list', { name: 'Player rating changes' })).getAllByRole('listitem').map(row => row.textContent))
    .toEqual(['Koa Nairn+1 OVR', 'Teo Dawson-1 OVR']);
  expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(raw);
});

it('uses the exact latest older review and explains when a historical match has no record', async () => {
  let state = createNrlCareer('broncos', 1, 2026);
  while (state.season.round < 12) state = reduceNrlCareer(state, { type: 'advance' });
  const old = { ...state, season: { ...state.season, results: state.season.results.map(({ ratingChanges, ...match }) => match) } };
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(old));
  render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  fireEvent.click(screen.getByText('Season fixtures', { exact: true }));
  const unrecorded = screen.getByText('Round 7 match report', { exact: true });
  fireEvent.click(unrecorded);
  expect(await within(unrecorded.closest('details')!).findByText('Rating changes weren’t recorded for this match.')).toBeVisible();
  const known = screen.getByText('Round 10 match report', { exact: true });
  fireEvent.click(known);
  expect(await within(known.closest('details')!).findByText('Match rating changes', { exact: true })).toBeVisible();
});

it.each([[2026, 'broncos', 9], [2027, 'bears', 8]] as const)(
  'previews the %s eighth match and earns the existing assistant point only when the reserve plays',
  (year, clubId, round) => {
    let career = reduceNrlCareer(createNrlCareer(clubId, 1, year), { type: 'hireCoach', role: 'development', year, clubId, round: 1 });
    while (career.season.round < round) career = reduceNrlCareer(career, { type: 'advance' });
    const id = 'nrl-' + clubId + '-' + year + '-26';
    const player = nrlDevelopmentAssistantProgress(career).find(candidate => candidate.id === id)!;
    expect(player.apps).toBe(7);
    const original = reduceNrlCareer(career, { type: 'selectBench', slot: 4, playerId: id });
    const baseline = JSON.stringify(original);
    const fence = fenceKeyOf(NRL_SAVE_KEY);
    localStorage.setItem(NRL_SAVE_KEY, baseline);
    localStorage.setItem(fence, '4');
    const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
    show();
    const rotation = screen.getByText('Hold one reserve for later').closest('details')!;
    rotation.open = true;
    const preview = within(rotation);
    const development = preview.getByText('Development appearances', { exact: true }).closest('section')!;
    const row = () => within(development).getByText(player.name, { exact: true }).closest('li')!;
    expect(row()).toHaveTextContent('7 of 8 appearances');
    expect(row()).toHaveTextContent('Quick Sim: Not in rotation');
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(baseline);
    expect(localStorage.getItem(fence)).toBe('4');

    expect(nrlHoldableReserves(original.season).some(candidate => candidate.id === id)).toBe(true);
    fireEvent.change(preview.getByLabelText('Opening rotation'), { target: { value: id } });
    expect(row()).toHaveTextContent('Live: Held for later');
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(baseline);

    const control = reduceNrlCareer(original, { type: 'advance' });
    expect(nrlDevelopmentAssistantProgress(control).find(candidate => candidate.id === id)?.apps).toBe(7);
    expect(control.ratingReview?.assistant ?? []).not.toContain(id);
    fireEvent.click(screen.getByRole('button', { name: 'Squad' }));
    fireEvent.change(screen.getByLabelText('Reserve 14'), { target: { value: id } });
    fireEvent.click(screen.getByRole('button', { name: 'Match centre' }));
    const nextRotation = screen.getByText('Hold one reserve for later').closest('details')!;
    nextRotation.open = true;
    const nextDevelopment = within(nextRotation).getByText('Development appearances', { exact: true }).closest('section')!;
    const nextRow = within(nextDevelopment).getByText(player.name, { exact: true }).closest('li')!;
    expect(nextRow).toHaveTextContent('Quick Sim: In rotation');
    fireEvent.click(screen.getByRole('button', { name: 'Quick Sim' }));
    const settled = readNrlCareerSave(localStorage.getItem(NRL_SAVE_KEY))!;
    expect(nrlDevelopmentAssistantProgress(settled).find(candidate => candidate.id === id)?.apps).toBe(8);
    expect(settled.ratingReview?.assistant).toContain(id);
    expect(settled.players.find(candidate => candidate.id === id)?.rating).toBe(player.rating + 1);
  },
);

it('saves one priority player in Coaching staff and awards the eighth appearance after reopening', () => {
  const year = 2026, clubId = 'storm', round = 8, playerId = 'storm-3-0';
  let before = reduceNrlCareer(createNrlCareer(clubId, 1, year), { type: 'hireCoach', role: 'development', year, clubId, round: 1 });
  while (before.season.round < round) before = reduceNrlCareer(before, { type: 'advance' });
  const fence = fenceKeyOf(NRL_SAVE_KEY);
  localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(before));
  localStorage.setItem(fence, '4');
  const show = () => render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  const office = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Club office' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finances' }));
    fireEvent.click(screen.getByText('Coaching staff', { exact: true }));
    return screen.getByRole('combobox', { name: 'Development priority' });
  };
  const page = show();
  const select = office();
  expect(select).toHaveValue('');
  expect(localStorage.getItem(fence)).toBe('4');
  fireEvent.change(select, { target: { value: playerId } });
  expect(select).toHaveValue(playerId);
  expect(localStorage.getItem(fence)).toBe('5');
  page.unmount();
  show();
  expect(office()).toHaveValue(playerId);
  fireEvent.click(screen.getByRole('button', { name: 'Match centre' }));
  const rotation = screen.getByText('Hold one reserve for later').closest('details')!;
  rotation.open = true;
  const player = rotation.querySelector(`[data-nrl-development-player="${playerId}"]`)!;
  expect(player).toHaveTextContent('7 of 8 appearances · Priority');
  fireEvent.click(screen.getByRole('button', { name: 'Quick Sim' }));
  const settled = readNrlCareerSave(localStorage.getItem(NRL_SAVE_KEY))!;
  expect(settled.ratingReview?.assistant?.[0]).toBe(playerId);
  expect(settled.developmentPriorityId).toBeUndefined();
  expect(localStorage.getItem(fence)).toBe('6');
});
