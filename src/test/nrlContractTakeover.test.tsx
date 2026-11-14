import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NRL_LAST_YEAR } from '@/data/nrlManagerSeasons';
import {
  createNrlCareer, nrlCareerCap, nrlCareerSquad, nrlTakeoverOffers, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, NRL_ROLES, NRL_SAVE_KEY } from '@/lib/nrlManager';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const playerId = 'storm-2-0';
const clubId = 'storm';
const destinationId = 'raiders';
const year = 2026;
const action = { type: 'arrangeTakeover', year, clubId, playerId, destinationId } as const;
const bytes = JSON.stringify;
const fence = fenceKeyOf(NRL_SAVE_KEY);
const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const playerAt = (state: NrlCareerState, id = playerId) => state.players.find(player => player.id === id)!;
const asClub = (state: NrlCareerState, clubId: string) => ({ ...state, season: { ...state.season, clubId } });
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const makeCareer = () => createNrlCareer(clubId, 4);
const withSignedWingCover = () => reduceNrlCareer(makeCareer(), {
  type: 'offerContract', playerId: 'nrl-storm-2026-27', salary: 325000, years: 1,
});

function open(save: string) {
  localStorage.setItem(NRL_SAVE_KEY, save);
  localStorage.setItem(fence, '4');
  const view = render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Club office' }));
  return view;
}

function selectMove() {
  const summary = screen.getByText('Arrange an offseason move', { exact: true });
  const details = summary.closest('details')!;
  expect(details).not.toHaveAttribute('open');
  fireEvent.click(summary);
  const desk = within(details);
  fireEvent.change(desk.getByLabelText('Player to move'), { target: { value: playerId } });
  fireEvent.change(desk.getByLabelText('Receiving club'), { target: { value: destinationId } });
  return desk;
}

it.each([
  [2026, 'storm', 'storm-2-0', 'nrl-storm-2026-27', 410000],
  [2027, 'bears', 'bears-2-0', 'nrl-bears-2027-27', 356127],
] as const)('guards the direct %i move until another player is signed and keeps existing moves readable', (year, clubId, playerId, cover, salary) => {
  const initial = createNrlCareer(clubId, 1, year);
  const player = playerAt(initial, playerId);
  const action = { type: 'arrangeTakeover', year, clubId, playerId, destinationId: 'broncos' } as const;
  expect(nrlCareerSquad(initial, year + 1).filter(member => member.role === player.role)).toEqual([player]);
  expect(reduceNrlCareer(initial, action)).toBe(initial);
  expect(nrlTakeoverOffers(initial, playerId)).toEqual([]);
  const legacy = { ...initial, players: initial.players.map(member => member.id === playerId ? { ...member,
    contract: { ...player.contract!, endYear: year }, futureContract: { ...player.contract!, clubId: 'broncos', startYear: year + 1 },
  } : member) };
  expect(readNrlCareerSave(bytes(legacy))).toEqual(legacy);

  const view = open(bytes(initial));
  const summary = screen.getByText('Arrange an offseason move', { exact: true });
  fireEvent.click(summary);
  const desk = within(summary.closest('details')!);
  fireEvent.change(desk.getByLabelText('Player to move'), { target: { value: playerId } });
  expect(desk.getByText(`Keep another Left Wing signed for ${year + 1} before arranging a move.`)).toBeVisible();
  expect(desk.queryByLabelText('Receiving club')).not.toBeInTheDocument();
  expect(raw()).toBe(bytes(initial));
  const coverName = playerAt(initial, cover).name;
  fireEvent.click(screen.getByRole('button', { name: 'Extend for ' + coverName }));
  fireEvent.change(screen.getByLabelText('Term'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agree contract' }));
  const renewed = reduceNrlCareer(initial, { type: 'offerContract', playerId: cover, salary, years: 1 });
  expect(raw()).toBe(bytes(renewed));
  fireEvent.change(desk.getByLabelText('Receiving club'), { target: { value: 'broncos' } });
  fireEvent.click(desk.getByRole('button', { name: 'Confirm offseason move' }));
  const agreed = reduceNrlCareer(renewed, action);
  expect(raw()).toBe(bytes(agreed));
  expect(nrlCareerSquad(agreed, year + 1).filter(member => member.role === player.role).map(member => member.id)).toEqual([cover]);
  expect(nrlCareerCap(agreed, year + 1).available - nrlCareerCap(renewed, year + 1).available).toBe(salary === 410000 ? 256034 : 259124);
  view.unmount();
  expect(readNrlCareerSave(raw())).toEqual(agreed);
});

it('shows the squad cover refusal before permission and accepts after an actual renewal', () => {
  const start = createNrlCareer('storm', 1);
  const target = 'storm-2-0';
  const before = bytes(start);
  const view = open(before);
  const openApproaches = () => {
    const summary = screen.getByText('Invite rival approaches', { exact: true });
    fireEvent.click(summary);
    return within(summary.closest('details')!);
  };
  let desk = openApproaches();
  fireEvent.change(desk.getByLabelText('Player to invite approaches for'), { target: { value: target } });
  expect(desk.getByText('Keep another Left Wing signed for 2027 before inviting approaches.')).toBeVisible();
  expect(desk.getByRole('button', { name: 'Confirm permission' })).toBeDisabled();
  expect(raw()).toBe(before);
  expect(localStorage.getItem(fence)).toBe('4');
  fireEvent.click(screen.getByRole('button', { name: 'Extend for Malachi Frost' }));
  fireEvent.change(screen.getByLabelText('Term'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agree contract' }));
  expect(desk.getByText('16 rival clubs could take over the deal right now.')).toBeVisible();
  expect(desk.getByText('A move would leave $256,034 more cap room in 2027 after reserving a squad place.')).toBeVisible();
  expect(desk.getByRole('button', { name: 'Confirm permission' })).toBeDisabled();
  fireEvent.click(desk.getByRole('checkbox', { name: /player and club agree/ }));
  fireEvent.click(desk.getByRole('button', { name: 'Confirm permission' }));
  expect(desk.getByText('Jalen Merritt · A reply is due after this round.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Match centre' }));
  fireEvent.click(screen.getByRole('button', { name: 'Quick Sim' }));
  fireEvent.click(screen.getByRole('button', { name: 'Review rival offer' }));
  expect(screen.getByText(/Dragons offered to take over Jalen Merritt/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Accept offseason move' }));
  const agreed = raw()!;
  expect(readNrlCareerSave(agreed)?.contractApproach?.outcome).toBe('accepted');
  expect(localStorage.getItem(fence)).toBe('8');
  view.unmount();
  open(agreed);
  desk = within(screen.getByText('Invite rival approaches', { exact: true }).closest('details')!);
  expect(desk.getByText(/Rival offer accepted/)).toBeVisible();
  expect(raw()).toBe(agreed);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

describe('NRL offseason contract takeover', () => {
  it('requires mutual permission, announces the reply in Match centre and retries one accepted save', () => {
    const playerId = 'storm-3-1';
    const start = makeCareer();
    const view = open(bytes(start));
    const summary = screen.getByText('Invite rival approaches', { exact: true });
    fireEvent.click(summary);
    const desk = within(summary.closest('details')!);
    fireEvent.change(desk.getByLabelText('Player to invite approaches for'), { target: { value: playerId } });
    const invite = desk.getByRole('button', { name: 'Confirm permission' });
    expect(invite).toBeDisabled();
    expect(raw()).toBe(bytes(start));
    fireEvent.click(desk.getByRole('checkbox', { name: /player and club agree/ }));
    fireEvent.click(invite);
    expect(desk.getByText(/A reply is due after this round/)).toBeVisible();
    expect(readNrlCareerSave(raw())?.contractApproach).toMatchObject({ playerId, listedRound: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Match centre' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quick Sim' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review rival offer' }));
    const response = screen.getByRole('region', { name: 'Rival contract offer' });
    expect(within(response).getByText(/Reply by the end of Round 3/)).toBeVisible();
    const before = raw()!;
    const write = Storage.prototype.setItem;
    const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === NRL_SAVE_KEY) throw new DOMException('Quota full', 'QuotaExceededError');
      write.call(this, key, value);
    });
    fireEvent.click(within(response).getByRole('button', { name: 'Accept offseason move' }));
    expect(raw()).toBe(before);
    expect(screen.getByText(/Rival offer accepted/)).toBeVisible();
    quota.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    const accepted = raw()!;
    expect(readNrlCareerSave(accepted)?.contractApproach?.outcome).toBe('accepted');
    view.unmount();
    open(accepted);
    expect(screen.getByText(/Rival offer accepted/)).toBeVisible();
  });

  it('cannot accept a rival reply from a tab whose saved choice has changed', () => {
    const playerId = 'storm-3-1';
    const start = makeCareer();
    const listed = reduceNrlCareer(start, { type: 'inviteContractApproach', year, clubId, round: 1, playerId, permission: true });
    const replied = advance(listed);
    open(bytes(replied));
    const reply = replied.contractApproach!;
    const newer = reduceNrlCareer(replied, {
      type: 'answerContractApproach', year, clubId, listedRound: reply.listedRound, playerId, destinationId: reply.destinationId!, decision: 'decline',
    });
    localStorage.setItem(NRL_SAVE_KEY, bytes(newer));
    fireEvent.click(screen.getByRole('button', { name: 'Accept offseason move' }));
    expect(raw()).toBe(bytes(newer));
    expect(localStorage.getItem(fence)).toBe('4');
    expect(screen.getByRole('button', { name: 'Reload your season' })).toBeVisible();
  });

  it('explains the missing next-year cover and refuses acceptance when other players are moved', () => {
    const start = makeCareer();
    const subject = 'storm-3-1';
    const listed = reduceNrlCareer(start, { type: 'inviteContractApproach', year, clubId, round: 1, playerId: subject, permission: true });
    let changed = advance(listed);
    for (const cover of ['storm-3-0', 'nrl-storm-2026-28']) {
      const offer = nrlTakeoverOffers(changed, cover)[0];
      changed = reduceNrlCareer(changed, { type: 'arrangeTakeover', year, clubId, playerId: cover, destinationId: offer.clubId });
    }
    expect(readNrlCareerSave(bytes(changed))).toEqual(changed);
    open(bytes(changed));
    expect(screen.getByText('Keep another Left Centre signed for 2027 before accepting.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Accept offseason move' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decline offer' })).toBeEnabled();
    expect(raw()).toBe(bytes(changed));
  });

  it('keeps the current season exact and transfers both guaranteed years to the rival at rollover', () => {
    const start = withSignedWingCover();
    const original = playerAt(start).contract!;
    expect(original.endYear).toBe(2028);
    let booked = reduceNrlCareer(start, action);
    const deal = { clubId: destinationId, salary: original.salary, startYear: 2027, endYear: 2028 };
    expect(playerAt(booked).futureContract).toEqual(deal);
    expect(playerAt(booked).contract).toEqual({ ...original, endYear: 2026 });
    expect(nrlTakeoverOffers(start, playerId)).toContainEqual(deal);
    expect(booked.season).toBe(start.season);
    expect(booked.finance).toBe(start.finance);
    expect(nrlCareerCap(booked)).toEqual(nrlCareerCap(start));
    for (const nextYear of [2027, 2028]) {
      const prior = nrlCareerCap(start, nextYear);
      const newCap = nrlCareerCap(booked, nextYear);
      expect(newCap.available - prior.available).toBe(original.salary - prior.minimumSalary);
      expect(nrlCareerCap(asClub(booked, destinationId), nextYear).committed
        - nrlCareerCap(asClub(start, destinationId), nextYear).committed).toBe(original.salary);
    }
    expect(bytes(readNrlCareerSave(bytes(booked)))).toBe(bytes(booked));
    expect(reduceNrlCareer(booked, action)).toBe(booked);
    expect(reduceNrlCareer(booked, { type: 'offerContract', playerId, salary: original.salary, years: 2 })).toBe(booked);
    const live = reduceNrlCareer(booked, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    expect(bytes(live.season)).toBe(bytes(reduceNrlCareer(start, { type: 'startLive' }).season));
    expect(bytes(reduceNrlCareer(readNrlCareerSave(bytes(live))!, {
      type: 'finishLive', year, round: live.season.round, tactic: live.season.tactic,
    }))).toBe(bytes(advance(booked)));

    let baseline = start;
    while (baseline.season.phase !== 'complete') {
      baseline = advance(baseline);
      booked = advance(booked);
      expect(bytes(booked.season)).toBe(bytes(baseline.season));
      expect(bytes(booked.finance)).toBe(bytes(baseline.finance));
    }
    const retained = reduceNrlCareer(booked, { type: 'startNextSeason' });
    expect(nrlCareerSquad(retained)).toHaveLength(30);
    expect(nrlCareerSquad(retained).map(player => player.role)).toEqual(expect.arrayContaining([...NRL_ROLES]));
    expect(nrlCareerSquad(retained).some(player => player.id === playerId)).toBe(false);
    const received = reduceNrlCareer(booked, { type: 'startNextSeason', move: { fromYear: year, clubId: destinationId } });
    expect(nrlCareerSquad(received).find(player => player.id === playerId)?.contract).toEqual(deal);
    expect(bytes(readNrlCareerSave(bytes(received)))).toBe(bytes(received));
    expect(reduceNrlCareer(received, action)).toBe(received);
  });

  it('re-quotes beyond the next season and rejects ineligible clubs, deals and career states', () => {
    const start = withSignedWingCover();
    const currentOffer = nrlTakeoverOffers(start, playerId).find(offer => offer.clubId === destinationId)!;
    const cap = nrlCareerCap(asClub(start, destinationId), 2028);
    const incumbent = start.players.find(player => player.contract?.clubId === destinationId && player.contract.endYear === 2027)!;
    const filled = {
      ...start,
      players: start.players.map(player => player === incumbent ? { ...player, futureContract: {
        clubId: destinationId, salary: cap.available + cap.minimumSalary, startYear: 2028, endYear: 2028,
      } } : player),
    };
    expect(readNrlCareerSave(bytes(filled))).toEqual(filled);
    expect(currentOffer.endYear).toBe(2028);
    expect(nrlCareerCap(asClub(filled, destinationId), 2027)).toEqual(nrlCareerCap(asClub(start, destinationId), 2027));
    expect(nrlCareerCap(asClub(filled, destinationId), 2028).available).toBe(0);
    expect(nrlTakeoverOffers(filled, playerId).some(offer => offer.clubId === destinationId)).toBe(false);
    expect(reduceNrlCareer(filled, action)).toBe(filled);
    expect(reduceNrlCareer(start, { ...action, destinationId: 'bears' })).toBe(start);
    const unavailableDestination = { ...start, players: start.players.map(player => player.id === playerId
      ? { ...player, contract: { ...player.contract!, endYear: year }, futureContract: { ...currentOffer, clubId: 'bears' } } : player) };
    expect(readNrlCareerSave(bytes(unavailableDestination))).toBeNull();
    expect(reduceNrlCareer(start, { ...action, destinationId: 'broncos' })).toBe(start);
    expect(reduceNrlCareer(start, { ...action, destinationId: clubId })).toBe(start);
    expect(reduceNrlCareer(start, { ...action, year: 2027 })).toBe(start);
    expect(reduceNrlCareer(start, { ...action, clubId: 'panthers' })).toBe(start);
    expect(reduceNrlCareer(start, { ...action, playerId: 'storm-1-0' })).toBe(start);
    expect(reduceNrlCareer(start, { ...action, playerId: incumbent.id })).toBe(start);
    const legacy = readNrlCareerSave(bytes(createNrlSeason(clubId, 4)))!;
    const live = reduceNrlCareer(start, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    for (const state of [legacy, live, { ...start, retired: true as const },
      { ...start, season: { ...start.season, year: NRL_LAST_YEAR } }]) {
      expect(nrlTakeoverOffers(state, playerId)).toEqual([]);
      expect(reduceNrlCareer(state, { ...action, year: state.season.year })).toBe(state);
    }
  });

  it('preserves the last open place for its missing role and refuses a full receiving squad', () => {
    const start = withSignedWingCover();
    const target = 'titans';
    const outgoing = playerAt(start);
    const knownHooker = nrlCareerSquad(asClub(start, target), 2027).filter(player => player.role === 'Hooker');
    expect(knownHooker).toHaveLength(1);
    const futureDeal = { clubId: target, salary: 145_000, startYear: 2027, endYear: 2027 };
    const eligible = start.players.filter(player => player.contract?.clubId === target
      && player.contract.endYear === 2026 && player.role !== 'Hooker');
    const extra = start.players.find(player => !player.contract && !player.futureContract && player.role !== 'Hooker')!;
    const reserved = {
      ...start,
      players: start.players.map(player => player.id === knownHooker[0].id
        ? { ...player, contract: { ...player.contract!, endYear: 2026 } }
        : eligible.includes(player) || player === extra ? { ...player, futureContract: futureDeal } : player),
    };
    expect(readNrlCareerSave(bytes(reserved))).toEqual(reserved);
    const projected = nrlCareerSquad(asClub(reserved, target), 2027);
    expect(projected).toHaveLength(29);
    expect(projected.some(player => player.role === 'Hooker')).toBe(false);
    expect(projected.filter(player => player.role === outgoing.role).every(player => player.rating < outgoing.rating)).toBe(true);
    const targetMove = { ...action, destinationId: target };
    expect(nrlTakeoverOffers(start, playerId).some(offer => offer.clubId === target)).toBe(true);
    expect(reduceNrlCareer(reserved, targetMove)).toBe(reserved);

    const filled = { ...reserved, players: reserved.players.map(player => player.id === knownHooker[0].id
      ? { ...player, futureContract: futureDeal } : player) };
    expect(readNrlCareerSave(bytes(filled))).toEqual(filled);
    expect(nrlCareerCap(asClub(filled, target), 2027).openSlots).toBe(0);
    expect(reduceNrlCareer(filled, targetMove)).toBe(filled);
  });

  it('shows exact simulated terms, supports cancel and persists the destination once confirmed', () => {
    const start = withSignedWingCover();
    const save = bytes(start);
    const view = open(save);
    const desk = selectMove();
    expect(desk.getByText(/simulated/i)).toBeVisible();
    expect(desk.getByText(/stays with Storm for 2026/i)).toBeVisible();
    expect(desk.getByText(/398,736 per season.*2027.*2028/i)).toBeVisible();
    expect(desk.getByText(/253,736.*2027.*cap space/i)).toBeVisible();
    expect(raw()).toBe(save);
    expect(localStorage.getItem(fence)).toBe('4');
    fireEvent.click(desk.getByRole('button', { name: 'Cancel move' }));
    expect(desk.getByLabelText('Player to move')).toHaveValue('');
    expect(raw()).toBe(save);

    fireEvent.change(desk.getByLabelText('Player to move'), { target: { value: playerId } });
    fireEvent.change(desk.getByLabelText('Receiving club'), { target: { value: destinationId } });
    fireEvent.click(desk.getByRole('button', { name: 'Confirm offseason move' }));
    expect(raw()).toBe(bytes(reduceNrlCareer(start, action)));
    expect(localStorage.getItem(fence)).toBe('5');
    expect(screen.getByText('Moving to Raiders in 2027')).toBeVisible();
    view.unmount();
    open(raw()!);
    const destination = screen.getByText('Moving to Raiders in 2027');
    expect(destination).toBeVisible();
    expect(destination.nextElementSibling).toHaveTextContent('$398,736 per season through 2028');
  });

  it('rejects a stale same-slot quote and retries a quota failure without duplicating the deal', () => {
    const start = withSignedWingCover();
    const save = bytes(start);
    const view = open(save);
    const stale = selectMove();
    const newer = bytes(advance(start));
    localStorage.setItem(NRL_SAVE_KEY, newer);
    fireEvent.click(stale.getByRole('button', { name: 'Confirm offseason move' }));
    expect(raw()).toBe(newer);
    expect(screen.getByRole('button', { name: 'Reload your season' })).toBeVisible();
    view.unmount();

    open(save);
    const pending = selectMove();
    const setItem = Storage.prototype.setItem;
    const full = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === NRL_SAVE_KEY) throw new DOMException('Quota full', 'QuotaExceededError');
      setItem.call(this, key, value);
    });
    fireEvent.click(pending.getByRole('button', { name: 'Confirm offseason move' }));
    expect(raw()).toBe(save);
    expect(localStorage.getItem(fence)).toBe('4');
    expect(screen.getByRole('button', { name: 'Retry save' })).toBeVisible();
    full.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    expect(raw()).toBe(bytes(reduceNrlCareer(start, action)));
    expect(localStorage.getItem(fence)).toBe('5');
  });
});
