import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, nrlCareerCap, nrlCareerFinance, nrlFinanceForecast, readNrlCareerSave, reduceNrlCareer, type NrlCareerState, type NrlSponsorOffer } from '@/lib/nrlCareer';
import { createNrlSeason, nrlLadder, nrlNextRound, nrlRegularRounds, NRL_SAVE_KEY, reduceNrlSeason } from '@/lib/nrlManager';
import { createSaveFence, fenceKeyOf, saveFence } from '@/lib/saveFence';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

const fenceKey = fenceKeyOf(NRL_SAVE_KEY);
const raw = () => localStorage.getItem(NRL_SAVE_KEY);
const cash = (state: NrlCareerState) => nrlCareerFinance(state).cash;
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const sign = (state: NrlCareerState, offer: NrlSponsorOffer) => reduceNrlCareer(state, {
  type: 'signSponsor', offer, year: state.season.year, clubId: state.season.clubId,
});
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

function until(career: NrlCareerState, done: (state: NrlCareerState) => boolean) {
  for (let i = 0; i < 40 && !done(career); i++) career = advance(career);
  expect(done(career)).toBe(true);
  return career;
}

function open(bytes: string) {
  localStorage.setItem(NRL_SAVE_KEY, bytes);
  localStorage.setItem(fenceKey, '4');
  const view = render(<MemoryRouter initialEntries={['/nrl-team-manager']}><NrlTeamManager /></MemoryRouter>);
  click('Club office');
  click('Finances');
  return view;
}

function openSponsor() {
  const summary = screen.getByText('Season sponsor', { exact: true });
  const details = summary.closest('details')!;
  expect(details).not.toHaveAttribute('open');
  fireEvent.click(summary);
  expect(details).toHaveAttribute('open');
  return within(details);
}

function assertReload(state: NrlCareerState) {
  const bytes = JSON.stringify(state);
  expect(JSON.stringify(readNrlCareerSave(bytes))).toBe(bytes);
}

afterEach(() => {
  cleanup();
  saveFence.release(NRL_SAVE_KEY);
  localStorage.clear();
});

describe('NRL season sponsor', () => {
  it('opens without saving, pays the fixed offer once and reloads its ledger receipt', () => {
    const start = createNrlCareer('storm', 4);
    const bytes = JSON.stringify(start);
    const view = open(bytes);
    const sponsor = openSponsor();
    expect(raw()).toBe(bytes);
    expect(localStorage.getItem(fenceKey)).toBe('4');
    expect(sponsor.getByText(/simulated one-season offers/i)).toBeVisible();
    click('Sign fixed offer');
    expect(sponsor.getByText('Season sponsor', { exact: true })).toHaveFocus();
    expect(sponsor.getByText('$200,000 received')).toBeVisible();
    expect(sponsor.queryByRole('button', { name: 'Sign finals offer' })).not.toBeInTheDocument();
    const signed = sign(start, 'fixed');
    expect(raw()).toBe(JSON.stringify(signed));
    expect(cash(signed) - cash(start)).toBe(200_000);
    expect(sign(signed, 'fixed')).toBe(signed);
    expect(sign(signed, 'finals')).toBe(signed);
    expect(screen.getByText('Cash balance', { exact: true }).nextElementSibling).toHaveTextContent('$2,700,000');
    view.unmount();
    open(JSON.stringify(signed));
    expect(openSponsor().getByText('$200,000 received')).toBeVisible();
    expect(raw()).toBe(JSON.stringify(signed));
    assertReload(signed);
    expect(readNrlCareerSave(JSON.stringify({
      ...signed, finance: { ...signed.finance, sponsor: { offer: 'fixed', bonusPaid: true } },
    }))).toBeNull();
  });

  it.each([[4, 8, 310_000], [1, 9, 110_000]] as const)('settles final-round byes from the actual ladder (seed %i, rank %i)', (seed, rank, total) => {
    const start = createNrlCareer('dolphins', seed, 2027);
    const signed = sign(start, 'finals');
    expect(cash(signed) - cash(start)).toBe(110_000);
    expect(nrlCareerCap(signed)).toEqual(nrlCareerCap(start));
    const due = nrlFinanceForecast(signed)!;
    const original = nrlFinanceForecast(start)!;
    expect(due.cashNow - original.cashNow).toBe(110_000);
    expect(due.closingHigh - original.closingHigh).toBe(110_000);
    const lastRegular = nrlRegularRounds(2027);
    const beforeFinalRound = (state: NrlCareerState) => state.season.round === lastRegular;
    const before = until(signed, beforeFinalRound);
    const baseBefore = until(start, beforeFinalRound);
    expect(nrlNextRound(before.season).clubStatus).toBe('bye');
    expect(before.finance.sponsor).toEqual({ offer: 'finals' });
    expect(cash(before) - cash(baseBefore)).toBe(110_000);
    expect(readNrlCareerSave(JSON.stringify({
      ...before, finance: { ...before.finance, sponsor: { offer: 'finals', bonusPaid: true } },
    }))).toBeNull();
    assertReload(before);

    const settled = advance(before);
    const baseline = advance(baseBefore);
    expect(nrlLadder(settled.season).findIndex(row => row.clubId === 'dolphins') + 1).toBe(rank);
    expect(settled.season).toEqual(baseline.season);
    expect(cash(settled) - cash(baseline)).toBe(total);
    expect(cash(advance(settled)) - cash(advance(baseline))).toBe(total);
    assertReload(settled);
    expect(readNrlCareerSave(JSON.stringify({
      ...settled,
      finance: { ...settled.finance, sponsor: rank === 8 ? { offer: 'finals' } : { offer: 'finals', bonusPaid: true } },
    }))).toBeNull();
  });

  it('explains the pending bonus separately from forecast and keeps Quick Sim and reloaded Live identical', () => {
    const start = createNrlCareer('storm', 4);
    const signed = sign(start, 'finals');
    open(JSON.stringify(signed));
    expect(openSponsor().getByText('$110,000 received')).toBeVisible();
    const forecast = screen.getByText('Season cash forecast', { exact: true });
    fireEvent.click(forecast);
    expect(within(forecast.closest('details')!).getByText(/excludes the possible.*200,000.*sponsor bonus/i)).toBeVisible();
    expect(raw()).toBe(JSON.stringify(signed));

    const live = reduceNrlCareer(signed, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    const reloaded = readNrlCareerSave(JSON.stringify(live))!;
    const { year, round, tactic } = reloaded.season;
    const fullTime = reduceNrlCareer(reloaded, { type: 'finishLive', year, round, tactic });
    expect(fullTime).toEqual(advance(signed));
    expect(fullTime.season).toEqual(advance(start).season);
  });

  it('keeps the optional receipt with the completed season and cash with its club', () => {
    const start = createNrlCareer('storm', 4);
    const booked = reduceNrlCareer(reduceNrlCareer(sign(start, 'finals'), {
      type: 'hireCoach', role: 'attack', year: 2026, round: 1,
    }), { type: 'upgradeMedical', level: 2 });
    assertReload(booked);
    const finish = (state: NrlCareerState) => state.season.phase === 'complete';
    const ended = until(booked, finish);
    expect(ended.history[0].finance?.sponsor).toEqual({ offer: 'finals', bonusPaid: true });
    expect(ended.history[0].finance?.cash).toBe(cash(ended));
    assertReload(ended);
    const view = open(JSON.stringify(ended));
    click('Season review');
    expect(screen.getByText('Sponsor income $310,000', { exact: true })).toBeVisible();
    view.unmount();
    const stayed = reduceNrlCareer(ended, { type: 'startNextSeason' });
    expect(stayed.finance.sponsor).toBeUndefined();
    expect(stayed.finance.openingCash).toBe(cash(ended));
    assertReload(stayed);
    const perth = reduceNrlCareer(ended, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    expect(perth.finance.sponsor).toBeUndefined();
    expect(perth.finance.openingCash).toBe(2_500_000);
    const returned = reduceNrlCareer(until(perth, finish), { type: 'startNextSeason', move: { fromYear: 2027, clubId: 'storm' } });
    expect(returned.finance.openingCash).toBe(cash(ended));
    expect(returned.finance.sponsor).toBeUndefined();
    assertReload(returned);
    const archive = perth.history[0];
    const forged = {
      ...archive, finance: { ...archive.finance!, sponsor: { offer: 'finals' },
        cash: archive.finance!.cash - 200_000, profit: archive.finance!.profit - 200_000 },
    };
    expect(readNrlCareerSave(JSON.stringify({ ...perth, history: [forged] }))).toBeNull();
  });

  it('locks the first-round window after a bye or live kickoff and preserves legacy bytes', () => {
    const initial = createNrlCareer('panthers', 1);
    expect(nrlNextRound(initial.season).clubStatus).toBe('bye');
    const afterBye = advance(initial);
    expect(sign(afterBye, 'fixed')).toBe(afterBye);
    expect(afterBye.finance.sponsor).toBeUndefined();
    assertReload(afterBye);
    const storm = createNrlCareer('storm', 4);
    const inPlay = reduceNrlCareer(storm, { type: 'startLive' });
    expect(inPlay.season.live).toBeDefined();
    expect(sign(inPlay, 'fixed')).toBe(inPlay);
    for (const identity of [{ year: 2027, clubId: 'storm' }, { year: 2026, clubId: 'titans' }]) {
      expect(reduceNrlCareer(storm, { type: 'signSponsor', offer: 'fixed', ...identity })).toBe(storm);
    }
    const legacyBytes = JSON.stringify(reduceNrlSeason(createNrlSeason('storm', 4), { type: 'advance' }));
    const legacy = readNrlCareerSave(legacyBytes)!;
    expect(sign(legacy, 'fixed')).toBe(legacy);
    open(legacyBytes);
    expect(openSponsor().getByText('Sponsor offers open next season for this imported career.')).toBeVisible();
    expect(raw()).toBe(legacyBytes);
    expect(localStorage.getItem(fenceKey)).toBe('4');
    expect(readNrlCareerSave(JSON.stringify({
      ...legacy, finance: { ...legacy.finance, sponsor: { offer: 'fixed' } },
    }))).toBeNull();
  });

  it('refuses to replace another tab’s sponsor or credit a second offer', () => {
    const start = createNrlCareer('storm', 4);
    open(JSON.stringify(start));
    const sponsor = openSponsor();
    const newer = JSON.stringify(sign(start, 'finals'));
    const other = createSaveFence(localStorage);
    other.adopt(NRL_SAVE_KEY);
    expect(other.write(NRL_SAVE_KEY, () => { localStorage.setItem(NRL_SAVE_KEY, newer); return true; })).toBe('written');
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: fenceKey })));
    const fixed = sponsor.getByRole('button', { name: 'Sign fixed offer' });
    expect(fixed).toBeDisabled();
    fireEvent.click(fixed);
    expect(raw()).toBe(newer);
    expect(readNrlCareerSave(raw())?.finance.sponsor).toEqual({ offer: 'finals' });
  });
});
