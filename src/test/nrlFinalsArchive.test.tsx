import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlArchivedFinals, nrlLadder, NRL_SAVE_KEY, reduceNrlSeason, type NrlMatchResult } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const bytes = JSON.stringify;
const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const fence = fenceKeyOf(NRL_SAVE_KEY);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const finals = (season: NrlCareerState['season']) => season.results.filter(match => match.finalsRound !== undefined);
const scoreReceipt = ({ round, finalsRound, tieId, homeId, awayId, homeScore, awayScore }: NrlMatchResult) =>
  ({ round, finalsRound, tieId, homeId, awayId, homeScore, awayScore });
const short = (year: number, id: string) => nrlSeasonPlan(year).clubs.find(club => club.id === id)!.shortName;
const scoreLine = (year: number, match: NrlMatchResult) =>
  short(year, match.homeId) + ' ' + match.homeScore + ' - ' + match.awayScore + ' ' + short(year, match.awayId);

function finish(career: NrlCareerState) {
  for (let tick = 0; tick < 40 && career.season.phase !== 'complete'; tick++) career = reduceNrlCareer(career, { type: 'advance' });
  expect(career.season.phase).toBe('complete');
  return career;
}
function open(saved: string) {
  localStorage.setItem(NRL_SAVE_KEY, saved);
  localStorage.setItem(fence, '5');
  return render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
}
function viewFinals(year: number, matches: NrlMatchResult[]) {
  const summary = screen.getByText(year + ' finals results', { exact: true });
  const details = summary.closest('details')!;
  expect(details).not.toHaveAttribute('open');
  fireEvent.click(summary);
  const section = within(details);
  const titles = ['Qualifying and elimination finals', 'Semi-finals', 'Preliminary finals', 'Grand final'];
  for (const [index, title] of titles.entries()) {
    const list = section.getByRole('list', { name: title });
    expect(within(list).getAllByRole('listitem').map(item => item.textContent?.trim()))
      .toEqual(matches.filter(match => match.finalsRound === index + 1).map(match => scoreLine(year, match)));
  }
}
function assertExactArchive(career: NrlCareerState, complete: NrlCareerState, index: number) {
  const { year, championId } = complete.season;
  const saved = career.history[index].finals;
  expect(saved).toEqual({
    seeds: nrlLadder(complete.season).slice(0, 8).map(row => row.clubId),
    scores: finals(complete.season).map(match => [match.homeScore, match.awayScore]),
  });
  expect(nrlArchivedFinals(saved, year)).toMatchObject({ championId, matches: finals(complete.season).map(scoreReceipt) });
  expect(bytes(saved).length).toBeLessThan(300);
  expect(bytes(readNrlCareerSave(bytes(career)))).toBe(bytes(career));
}

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

describe('NRL historical finals results', () => {
  it('archives only at rollover, preserving two exact brackets across a club move and reload', () => {
    const first = finish(createNrlCareer('storm', 4));
    expect(first.history[0].finals).toBeUndefined();
    const firstBytes = bytes(first);
    const view = open(firstBytes);
    click('Review this season');
    viewFinals(2026, finals(first.season));
    expect(raw()).toBe(firstBytes);
    expect(localStorage.getItem(fence)).toBe('5');
    fireEvent.click(screen.getByText('Change clubs for 2027'));
    fireEvent.change(screen.getByLabelText('Club to manage'), { target: { value: 'bears' } });
    click('Start 2027 with Bears');
    const perth = readNrlCareerSave(raw())!;
    expect(perth.season.clubId).toBe('bears');
    expect(perth.season.results).toHaveLength(0);
    assertExactArchive(perth, first, 0);
    view.unmount();

    const second = finish(perth);
    const third = reduceNrlCareer(second, { type: 'startNextSeason' });
    expect(third.season.year).toBe(2028);
    assertExactArchive(third, first, 0);
    assertExactArchive(third, second, 1);
    const lastBytes = bytes(third);
    open(lastBytes);
    click('Club office');
    click('Season review');
    viewFinals(2027, finals(second.season));
    viewFinals(2026, finals(first.season));
    expect(raw()).toBe(lastBytes);
    expect(localStorage.getItem(fence)).toBe('5');
  });

  it('preserves old archived years without reconstructing missing scores', () => {
    const first = finish(createNrlCareer('storm', 4));
    const next = reduceNrlCareer(first, { type: 'startNextSeason' });
    const { finals: _finals, playerSeasons: _playerSeasons, ...legacyHistory } = next.history[0];
    const older = { ...next, history: [legacyHistory] };
    const oldBytes = bytes(older);
    expect(bytes(readNrlCareerSave(oldBytes))).toBe(oldBytes);
    open(oldBytes);
    click('Club office');
    click('Season review');
    expect(screen.getByText('Finals scores aren’t saved for this season.')).toBeVisible();
    expect(screen.queryByText('2026 finals results')).not.toBeInTheDocument();
    expect(raw()).toBe(oldBytes);
  });

  it('shows the actual completed v1 bracket and carries it forward on explicit rollover', () => {
    let legacy = createNrlSeason('storm', 4);
    for (let tick = 0; tick < 40 && legacy.phase !== 'complete'; tick++) legacy = reduceNrlSeason(legacy, { type: 'advance' });
    expect(legacy.phase).toBe('complete');
    const v1 = bytes(legacy);
    open(v1);
    click('Review this season');
    viewFinals(2026, finals(legacy));
    expect(raw()).toBe(v1);
    click('Start 2027');
    const rolled = readNrlCareerSave(raw())!;
    assertExactArchive(rolled, readNrlCareerSave(v1)!, 0);
  });

  it('rejects tied, truncated and foreign finals data or disagreement with the season receipt', () => {
    const first = finish(createNrlCareer('storm', 4));
    const next = reduceNrlCareer(first, { type: 'startNextSeason' });
    const row = next.history[0];
    const archive = row.finals!;
    expect(archive.seeds).toHaveLength(8);
    const replace = (patch: object) => readNrlCareerSave(bytes({ ...next, history: [{ ...row, ...patch }] }));
    expect(replace({ finals: { ...archive, scores: archive.scores.slice(1) } })).toBeNull();
    expect(replace({ finals: { ...archive, scores: [[8, 8], ...archive.scores.slice(1)] } })).toBeNull();
    expect(replace({ finals: { ...archive, scores: [[-1, 6], ...archive.scores.slice(1)] } })).toBeNull();
    expect(replace({ finals: { ...archive, scores: [[999, 6], ...archive.scores.slice(1)] } })).toBeNull();
    expect(replace({ finals: { ...archive, seeds: ['bears', ...archive.seeds.slice(1)] } })).toBeNull();
    expect(replace({ finals: { ...archive, seeds: [archive.seeds[1], ...archive.seeds.slice(1)] } })).toBeNull();
    expect(replace({ rank: row.rank === 1 ? 2 : 1 })).toBeNull();
    expect(replace({ championId: row.championId === 'storm' ? 'panthers' : 'storm' })).toBeNull();
    const [home, away] = archive.scores.at(-1)!;
    expect(replace({ finals: { ...archive, scores: [...archive.scores.slice(0, -1), [away, home]] } })).toBeNull();
    expect(readNrlCareerSave(bytes({ ...first, history: [{ ...first.history[0], finals: archive }] }))).toBeNull();
  });
});
