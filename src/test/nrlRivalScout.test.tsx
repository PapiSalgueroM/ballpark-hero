import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import {
  createNrlCareer, nrlCareerMarket, nrlContractOffer, nrlRivalSquad, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, NRL_SAVE_KEY, reduceNrlSeason } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const saveKey = NRL_SAVE_KEY;
const fenceKey = fenceKeyOf(saveKey);
const raw = () => localStorage.getItem(saveKey);

function openLadder(bytes: string) {
  localStorage.setItem(saveKey, bytes);
  const view = render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Ladder' }));
  return view;
}

async function scout(clubId: string, clubName: string) {
  const summary = screen.getByText('Scout a club');
  const details = summary.closest('details')!;
  if (!details.open) fireEvent.click(summary);
  const selector = screen.getByLabelText('Club to scout') as HTMLSelectElement;
  selector.focus();
  fireEvent.change(selector, { target: { value: clubId } });
  const squad = await screen.findByRole('region', { name: `${clubName} squad` });
  expect(selector).toHaveFocus();
  return { details, selector, squad: within(squad) };
}

function finish(initial: NrlCareerState) {
  let career = initial;
  for (let i = 0; i < 40 && career.season.phase !== 'complete'; i++) career = reduceNrlCareer(career, { type: 'advance' });
  expect(career.season.phase).toBe('complete');
  return career;
}

afterEach(() => {
  cleanup();
  saveFence.release(saveKey);
  localStorage.clear();
});

describe('NRL rival club scouting', () => {
  it.each([['storm', 2026], ['bears', 2027]] as const)('opens one generated squad from the %s %i ladder without saving', async (clubId, year) => {
    const career = createNrlCareer(clubId, 17, year);
    const bytes = JSON.stringify(career);
    openLadder(bytes);
    const fence = localStorage.getItem(fenceKey);
    const summary = screen.getByText('Scout a club');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(screen.queryByRole('region', { name: 'Brisbane Broncos squad' })).not.toBeInTheDocument();

    const { selector, squad } = await scout('broncos', 'Brisbane Broncos');
    const rivals = nrlSeasonPlan(year).clubs.filter(club => club.id !== clubId).map(club => club.id);
    expect(Array.from(selector.options).map(option => option.value)).toEqual(['', ...rivals]);
    expect(squad.getAllByRole('listitem')).toHaveLength(30);
    const player = career.players.find(player => player.contract?.clubId === 'broncos')!;
    const row = squad.getByText(player.name).closest('li')!;
    expect(row).toHaveTextContent(`${player.role} · Age ${player.age} · ${player.rating} OVR`);
    expect(row).toHaveTextContent(`Signed through ${player.contract!.endYear}`);
    expect(screen.getByText('Generated squad for this career.')).toBeVisible();

    fireEvent.click(summary);
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Brisbane Broncos squad' })).not.toBeInTheDocument());
    expect(raw()).toBe(bytes);
    expect(localStorage.getItem(fenceKey)).toBe(fence);
  });

  it('keeps a pending signing at its source club until the agreed season begins', async () => {
    const career = createNrlCareer('storm', 17);
    const target = nrlCareerMarket(career).find(entry => entry.kind === 'rival'
      && nrlContractOffer(career, entry.player.id, entry.askingSalary, 1).ok)!;
    const { id, name, contract } = target.player;
    const source = nrlSeasonPlan(2026).clubs.find(club => club.id === contract!.clubId)!;
    expect(nrlRivalSquad(career, source.id).find(row => row.player.id === id)?.marketYear).toBe(2027);
    expect(nrlRivalSquad(career, 'storm')).toEqual([]);
    expect(nrlRivalSquad(career, 'unknown')).toEqual([]);

    const signed = reduceNrlCareer(career, { type: 'offerContract', playerId: id, salary: target.askingSalary, years: 1 });
    const bytes = JSON.stringify(signed);
    const view = openLadder(bytes);
    const fence = localStorage.getItem(fenceKey);
    const { squad } = await scout(source.id, source.name);
    const row = squad.getByText(name).closest('li')!;
    expect(row).toHaveTextContent('Joins Storm in 2027');
    expect(row).not.toHaveTextContent('On the 2027 market');
    expect(raw()).toBe(bytes);
    expect(localStorage.getItem(fenceKey)).toBe(fence);
    view.unmount();

    const perth = reduceNrlCareer(finish(signed), { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    expect(nrlRivalSquad(perth, source.id).some(row => row.player.id === id)).toBe(false);
    expect(nrlRivalSquad(perth, 'storm').find(row => row.player.id === id)?.player.contract?.clubId).toBe('storm');

    const year2028 = reduceNrlCareer(finish(perth), { type: 'startNextSeason' });
    openLadder(JSON.stringify(year2028));
    const { squad: chiefs } = await scout('chiefs', 'PNG Chiefs');
    expect(chiefs.getAllByRole('listitem')).toHaveLength(30);
    expect(nrlRivalSquad(year2028, 'bears')).toEqual([]);
  });

  it('lists a rival arrival only from the season its contract begins', () => {
    const career = createNrlCareer('storm', 17);
    const destination = 'roosters';
    const rivalDesk = { ...career, season: { ...career.season, clubId: destination } };
    const target = nrlCareerMarket(rivalDesk).find(entry => entry.kind === 'rival' && entry.player.contract?.clubId !== 'storm'
      && nrlContractOffer(rivalDesk, entry.player.id, entry.askingSalary, 1).ok)!;
    const { id, contract } = target.player;
    const { players } = reduceNrlCareer(rivalDesk, { type: 'offerContract', playerId: id, salary: target.askingSalary, years: 1 });
    const saved = { ...career, players };
    const bytes = JSON.stringify(saved);
    expect(JSON.stringify(readNrlCareerSave(bytes))).toBe(bytes);
    const source = nrlRivalSquad(saved, contract!.clubId).find(row => row.player.id === id);
    expect(source?.player.futureContract?.clubId).toBe(destination);
    expect(source?.marketYear).toBeNull();
    expect(nrlRivalSquad(saved, destination).some(row => row.player.id === id)).toBe(false);

    const next = reduceNrlCareer(finish(saved), { type: 'startNextSeason' });
    expect(nrlRivalSquad(next, contract!.clubId).some(row => row.player.id === id)).toBe(false);
    expect(nrlRivalSquad(next, destination).find(row => row.player.id === id)?.player.contract?.clubId).toBe(destination);
  });

  it('labels a real partial v1 import and its v2 reload while preserving both raw saves', async () => {
    const legacy = reduceNrlSeason(createNrlSeason('storm', 17), { type: 'advance' });
    const imported = readNrlCareerSave(JSON.stringify(legacy))!;
    expect(imported.legacySeason).toBe(true);
    expect(imported.finance.fromRound).toBe(2);
    for (const bytes of [JSON.stringify(legacy), JSON.stringify(imported)]) {
      const view = openLadder(bytes);
      const fence = localStorage.getItem(fenceKey);
      const { squad } = await scout('broncos', 'Brisbane Broncos');
      expect(screen.getByText('This imported season uses its original opponent ratings for matches.')).toBeVisible();
      expect(squad.getAllByRole('listitem')).toHaveLength(30);
      expect(raw()).toBe(bytes);
      expect(localStorage.getItem(fenceKey)).toBe(fence);
      view.unmount();
    }
  });
});
