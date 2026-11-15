import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const fence = fenceKeyOf(NRL_SAVE_KEY);
let finishedRegularSeason: NrlCareerState;

beforeAll(() => {
  finishedRegularSeason = createNrlCareer('storm', 4);
  for (let round = 1; round <= 28; round++) {
    finishedRegularSeason = reduceNrlCareer(finishedRegularSeason, { type: 'advance' });
  }
  expect(finishedRegularSeason.season.round).toBe(29);
  expect(finishedRegularSeason.season.results.some(match => match.playerScoring && match.finalsRound)).toBe(true);
});

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

function putSave(career: NrlCareerState) {
  const bytes = JSON.stringify(career);
  expect(readNrlCareerSave(bytes)).not.toBeNull();
  localStorage.setItem(NRL_SAVE_KEY, bytes);
  localStorage.setItem(fence, '4');
  return bytes;
}

function openRatingDrawer() {
  const view = render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Squad' }));
  fireEvent.click(screen.getByText('Rating changes', { exact: true }));
  expect(screen.getByText('Round 22 review')).toBeVisible();
  return { view, progress: within(screen.getByRole('region', { name: 'Season rating progress' })) };
}

function playerRow(progress: ReturnType<typeof within>, name: string) {
  return within(progress.getByText(name, { exact: true }).closest('li')!);
}

describe('NRL season rating progress', () => {
  it('counts clean club games, omits byes and finals, and reads cumulative changes after reload', () => {
    const bytes = putSave(finishedRegularSeason);
    const { view, progress } = openRatingDrawer();
    expect(progress.getByText(/24 of 24 regular-season club matches/)).toBeVisible();
    expect(playerRow(progress, 'Callum Avery').getByText('81 OVR · -2 from reviews')).toBeVisible();
    expect(playerRow(progress, 'Riley Cairns').getByText('84 OVR · +2 from reviews')).toBeVisible();
    expect(progress.getAllByRole('listitem')).toHaveLength(12);

    view.unmount();
    const reopened = openRatingDrawer().progress;
    expect(playerRow(reopened, 'Callum Avery').getByText('81 OVR · -2 from reviews')).toBeVisible();
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(bytes);
    expect(localStorage.getItem(fence)).toBe('4');
  });

  it('shows net zero for offsetting recorded changes and leaves an older gap in coverage', () => {
    const { season } = finishedRegularSeason;
    const results = season.results.map<NrlCareerState['season']['results'][number]>(match => {
      if (!match.playerScoring) return match;
      if (match.round === 1) return { ...match, ratingChanges: [['nrl-storm-2026-29', 1]] };
      if (match.round === 6) return { ...match, ratingChanges: undefined };
      return match;
    });
    const bytes = putSave({ ...finishedRegularSeason, season: { ...season, results } });
    const { progress } = openRatingDrawer();
    expect(progress.getByText(/23 of 24 regular-season club matches/)).toBeVisible();
    expect(playerRow(progress, 'Callum Avery').getByText('81 OVR · 0 from reviews')).toBeVisible();
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(bytes);
  });

  it('keeps season progress unknown when the save has only a legacy latest review', () => {
    const { season } = finishedRegularSeason;
    const results = season.results.map(match => ({ ...match, ratingChanges: undefined }));
    putSave({ ...finishedRegularSeason, season: { ...season, results } });
    const { progress } = openRatingDrawer();
    expect(progress.getByText(/0 of 24 regular-season club matches/)).toBeVisible();
    expect(progress.getByText('Season rating history is unavailable for these matches.')).toBeVisible();
    expect(progress.queryByRole('list')).toBeNull();
    expect(screen.getByRole('list', { name: 'Recent rating changes' })).toBeVisible();
  });
});
