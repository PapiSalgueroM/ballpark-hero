import { useState, type ComponentProps, type ComponentType } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TransferScreen } from '@/components/club-manager/TransferScreen';
import { marketForScreen, moneyIn, startCareer, worldSeedOf, worldYear, type CareerState, type MarketPlayer } from '@/lib/clubManager';
import { eraById } from '@/lib/clubManagerEras';

// First baseline imports only the existing real screen and engine. No future helper import.
type Target = { name: string; club: string; position: MarketPlayer['position']; cohort: number; worldRosterKey?: string };
type Context = { clubName: string; eraId: string; startYear: number; worldSeed: number | null };
type RecruitmentCareer = CareerState & { recruitment?: Context & { version: 1; targets: Target[] } };
type Commit = (make: (current: CareerState) => CareerState | null) => boolean;
type Props = ComponentProps<typeof TransferScreen> & { onCommitRecruitment?: Commit };
const ExistingScreen = TransferScreen as ComponentType<Props>;
const noop = () => {};

function fixture() {
  const career = startCareer('Brentford');
  const market = marketForScreen(career);
  expect(market.length, 'the actual current market must be nonempty').toBeGreaterThan(0);
  expect(career.transferWindow).not.toBeNull();
  return { career, target: market[0] };
}
function context(career: CareerState): Context {
  return {
    clubName: career.clubName, eraId: eraById(career.eraId).id,
    startYear: worldYear(career) - Math.max(0, career.season - 1), worldSeed: worldSeedOf(career) ?? null,
  };
}
function identity(career: CareerState, player: MarketPlayer): Target {
  return {
    name: player.name, club: player.club, position: player.position, cohort: worldYear(career) - player.age,
    ...(player.worldRosterKey ? { worldRosterKey: player.worldRosterKey } : {}),
  };
}
function mount(initial: RecruitmentCareer, market: MarketPlayer[], talk = vi.fn()) {
  let latest = initial;
  const committed: CareerState[] = [];
  function Parent() {
    const [career, setCareer] = useState<RecruitmentCareer>(initial);
    latest = career;
    const commit: Commit = make => {
      const next = make(latest);
      if (!next) return false;
      committed.push(next);
      latest = next;
      setCareer(next);
      return true;
    };
    return <ExistingScreen
      career={career} market={market} onCommitRecruitment={commit}
      onNegotiate={talk} onOffer={noop} onWalk={noop} onDismissNegotiation={noop}
      onClause={noop} onLoan={noop} onAcceptBid={noop} onRejectBid={noop}
      onSetStatus={noop} onLoanOut={noop} onProposeTerms={noop} onBuyLoanee={noop}
      onEndLoanEarly={noop} onRecallLoanee={noop}
    />;
  }
  const view = render(<Parent />);
  return { view, latest: () => latest, committed, talk };
}

beforeEach(() => {
  localStorage.clear();
  let seed = 20261027;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('Club Manager recruitment shortlist first behavior baseline', () => {
  it('adds a current Buy row without starting talks or changing any old career field', async () => {
    const { career, target } = fixture();
    const before = JSON.stringify(career);
    const app = mount(career, [target]);
    const add = screen.queryByRole('button', { name: `Save ${target.name}` });
    expect(add, 'CM_RECRUITMENT_SAVE_MISSING: a current Buy row needs an explicit Save action').not.toBeNull();
    const draws = vi.mocked(Math.random).mock.calls.length;
    fireEvent.click(add!);
    await waitFor(() => expect(app.committed).toHaveLength(1));
    expect(app.latest().recruitment).toEqual({ version: 1, ...context(career), targets: [identity(career, target)] });
    const { recruitment: _recruitment, ...oldFields } = app.latest();
    expect(JSON.stringify(oldFields)).toBe(before);
    expect(app.talk).not.toHaveBeenCalled();
    expect(vi.mocked(Math.random).mock.calls).toHaveLength(draws);
  });

  it('opens an empty shortlist while the transfer window is shut without writing', async () => {
    const { career, target } = fixture();
    const closed = { ...career, transferWindow: null };
    const before = JSON.stringify(closed);
    const app = mount(closed, [target]);
    const open = screen.queryByRole('button', { name: /^Shortlist\b/ });
    expect(open, 'CM_RECRUITMENT_CLOSED_OPENER_MISSING: saved recruitment must be reachable outside the window').not.toBeNull();
    fireEvent.click(open!);
    expect(await screen.findByRole('heading', { name: 'Recruitment shortlist' })).toBeVisible();
    expect(app.committed).toHaveLength(0);
    expect(JSON.stringify(app.latest())).toBe(before);
    expect(app.talk).not.toHaveBeenCalled();
  });

  it('reopens a saved identity using the current record and leaves saved bytes unchanged', async () => {
    const { career, target } = fixture();
    const saved: RecruitmentCareer = {
      ...career,
      recruitment: { version: 1, ...context(career), targets: [identity(career, target)] },
    };
    const before = JSON.stringify(saved);
    const app = mount(saved, [target]);
    const open = screen.queryByRole('button', { name: /^Shortlist\b/ });
    expect(open, 'CM_RECRUITMENT_SAVED_OPENER_MISSING: a saved target needs a reopenable board').not.toBeNull();
    fireEvent.click(open!);
    const row = await screen.findByRole('article', { name: target.name });
    expect(within(row).getByText(target.name, { exact: true })).toBeVisible();
    expect(within(row).getAllByText(moneyIn(saved)(target.price), { exact: true }).length).toBeGreaterThan(0);
    expect(within(row).getAllByText(`${target.age}y`, { exact: true }).length).toBeGreaterThan(0);
    expect(within(row).getAllByText(String(target.rating), { exact: true }).length).toBeGreaterThan(0);
    expect(within(row).getAllByText(target.position, { exact: true }).length).toBeGreaterThan(0);
    expect(JSON.stringify(app.latest())).toBe(before);
    expect(app.committed).toHaveLength(0);
  });

  it('does not present a same-club target copied from another era as current or repair it on read', async () => {
    const { career, target } = fixture();
    // Deliberately foreign metadata, not a claim that this player existed in that era.
    const saved: RecruitmentCareer = {
      ...career,
      recruitment: { version: 1, ...context(career), eraId: 'era2020', startYear: 2020, targets: [identity(career, target)] },
    };
    const before = JSON.stringify(saved);
    const app = mount(saved, [target]);
    const open = screen.queryByRole('button', { name: /^Shortlist\b/ });
    expect(open, 'CM_RECRUITMENT_FOREIGN_OPENER_MISSING: foreign metadata needs a safe read-only board').not.toBeNull();
    fireEvent.click(open!);
    const board = await screen.findByRole('region', { name: 'Recruitment shortlist' });
    expect(within(board).queryByRole('article', { name: target.name })).toBeNull();
    expect(JSON.stringify(app.latest())).toBe(before);
    expect(app.committed).toHaveLength(0);
    expect(app.talk).not.toHaveBeenCalled();
  });

  it('preserves the ordinary Talk callback with the exact existing current player object', () => {
    const { career, target } = fixture();
    const app = mount(career, [target]);
    fireEvent.click(screen.getByRole('button', { name: /^Talk ·/ }));
    expect(app.talk).toHaveBeenCalledTimes(1);
    expect(app.talk.mock.calls[0][0]).toBe(target);
    expect(app.committed).toHaveLength(0);
    expect(app.latest()).toBe(career);
  });

  it('ordinary rendering and a no-match search preserve input bytes and consume no random draws', () => {
    const { career, target } = fixture();
    const before = JSON.stringify(career);
    const draws = vi.mocked(Math.random).mock.calls.length;
    const app = mount(career, [target]);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search player or club' }), { target: { value: 'zzzz-no-recruitment-match-qa' } });
    expect(screen.getByText('No players match your search.')).toBeVisible();
    expect(JSON.stringify(career)).toBe(before);
    expect(JSON.stringify(app.latest())).toBe(before);
    expect(app.committed).toHaveLength(0);
    expect(vi.mocked(Math.random).mock.calls).toHaveLength(draws);
  });
});
