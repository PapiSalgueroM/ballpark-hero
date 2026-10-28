import { StrictMode, useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecruitmentBoard } from '@/components/club-manager/RecruitmentBoard';
import { TransferScreen } from '@/components/club-manager/TransferScreen';
import { marketForScreen, moneyIn, startCareer, type CareerState, type MarketPlayer } from '@/lib/clubManager';
import { addRecruitment, recruitmentOf, type RecruitmentCommit, type RecruitmentPick } from '@/lib/clubManagerRecruitment';

const noop = () => {};
beforeEach(() => {
  localStorage.clear();
  let seed = 20261028;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });
function fixture() {
  const career = startCareer('Brentford'), market = marketForScreen(career), player = market[0];
  expect(player).toBeDefined();
  const saved = addRecruitment(career, player)!;
  return { career, market, player, saved };
}
function mount(initial: CareerState, market: MarketPlayer[], options: { pick?: RecruitmentPick; refuse?: boolean; strict?: boolean; transfer?: boolean } = {}) {
  let latest = initial;
  const writes: CareerState[] = [], find = vi.fn(), back = vi.fn(), talk = vi.fn(), clause = vi.fn(), loan = vi.fn();
  function Parent() {
    const [career, setCareer] = useState(initial);
    latest = career;
    const commit: RecruitmentCommit = make => {
      if (options.refuse) return false;
      const next = make(latest);
      if (!next) return false;
      writes.push(next); latest = next; setCareer(next); return true;
    };
    return options.transfer ? <TransferScreen career={career} market={market} onCommitRecruitment={commit}
      onNegotiate={talk} onOffer={noop} onWalk={noop} onDismissNegotiation={noop} onClause={clause} onLoan={loan}
      onAcceptBid={noop} onRejectBid={noop} onSetStatus={noop} onLoanOut={noop} onProposeTerms={noop}
      onBuyLoanee={noop} onEndLoanEarly={noop} onRecallLoanee={noop} />
      : <RecruitmentBoard career={career} market={market} initial={options.pick} onCommit={commit} onBack={back} onFind={find} />;
  }
  const view = render(options.strict ? <StrictMode><Parent /></StrictMode> : <Parent />);
  return { view, latest: () => latest, writes, find, back, talk, clause, loan };
}
describe('actual recruitment board and ordinary Buy return', () => {
  it('shows the supplied current record, existing primary-position peers and no persisted price', () => {
    const { saved, player } = fixture();
    // Deliberately changed copied game observation, not a new imported player fact.
    const current = { ...player, price: player.price + 1, rating: player.rating - 1 };
    const before = JSON.stringify(saved), draws = vi.mocked(Math.random).mock.calls.length;
    const app = mount(saved, [current]);
    const row = screen.getByRole('article', { name: player.name });
    expect(within(row).getByText(moneyIn(saved)(current.price), { exact: true })).toBeVisible();
    expect(within(row).getByText(String(current.rating), { exact: true })).toBeVisible();
    expect(within(row).getByText(`${current.age}y`, { exact: true })).toBeVisible();
    expect(recruitmentOf(saved)!.targets[0]).not.toHaveProperty('price');
    const peers = saved.squad.filter(p => p.position === current.position).sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name)).slice(0, 3);
    for (const p of peers) expect(within(row).getByText(`${p.name} · ${p.age}y · ${p.rating} · ${p.position}`, { exact: true })).toBeVisible();
    expect(app.writes).toHaveLength(0); expect(JSON.stringify(app.latest())).toBe(before);
    expect(vi.mocked(Math.random).mock.calls).toHaveLength(draws);
  });
  it('keeps closed-window facts readable, disables Find and removes only explicit metadata', () => {
    const { saved, player } = fixture(), closed = { ...saved, transferWindow: null };
    const app = mount(closed, [player]);
    expect(screen.getByRole('button', { name: `Find ${player.name} in Buy` })).toBeDisabled();
    expect(screen.getByText(/The transfer window is shut/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: `Remove ${player.name}` }));
    expect(app.writes).toHaveLength(1); expect(app.latest()).not.toHaveProperty('recruitment');
    const { recruitment: _r, ...old } = closed as typeof closed & { recruitment?: unknown };
    expect(app.latest()).toStrictEqual(old); expect(app.find).not.toHaveBeenCalled();
  });
  it('Find passes only the current row and makes no write or random draw', () => {
    const { saved, player } = fixture(), before = JSON.stringify(saved), draws = vi.mocked(Math.random).mock.calls.length;
    const current = { ...player, price: player.price + 1 };
    const app = mount(saved, [current]);
    fireEvent.click(screen.getByRole('button', { name: `Find ${player.name} in Buy` }));
    expect(app.find).toHaveBeenCalledTimes(1); expect(app.find.mock.calls[0][0]).toBe(current);
    expect(app.writes).toHaveLength(0); expect(JSON.stringify(app.latest())).toBe(before);
    expect(vi.mocked(Math.random).mock.calls).toHaveLength(draws);
  });
  it('an unavailable target cannot be found but remains removable', () => {
    const { saved, player } = fixture();
    const app = mount(saved, []);
    expect(screen.getByText(/Unavailable in the current market/)).toBeVisible();
    expect(screen.getByRole('button', { name: `Find ${player.name} in Buy` })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: `Remove ${player.name}` }));
    expect(app.writes).toHaveLength(1); expect(app.find).not.toHaveBeenCalled();
  });
  it('a refused Remove retains the target and reports a save failure without a success claim', () => {
    const { saved, player } = fixture(), before = JSON.stringify(saved);
    const app = mount(saved, [player], { refuse: true });
    fireEvent.click(screen.getByRole('button', { name: `Remove ${player.name}` }));
    expect(screen.getByRole('article', { name: player.name })).toBeVisible();
    expect(screen.getByText(/Could not remove this target/)).toBeVisible();
    expect(screen.queryByText('Target removed.')).toBeNull();
    expect(app.writes).toHaveLength(0); expect(JSON.stringify(app.latest())).toBe(before);
  });
  it('an explicit Save arrival commits only once through StrictMode effect replay', async () => {
    const { career, player } = fixture();
    const app = mount(career, [player], { pick: { career, player }, strict: true });
    await waitFor(() => expect(app.writes).toHaveLength(1));
    expect(recruitmentOf(app.latest())!.targets).toHaveLength(1);
    expect(screen.getByText('Target saved.')).toBeVisible();
  });
  it('a delayed Save arrival from a replaced career refuses rather than changing the new career', () => {
    const { career, player } = fixture(), changed = { ...career, budget: career.budget + 1 }, before = JSON.stringify(changed);
    const app = mount(changed, [player], { pick: { career, player } });
    expect(screen.getByText(/Could not save this target/)).toBeVisible();
    expect(app.writes).toHaveLength(0); expect(JSON.stringify(app.latest())).toBe(before);
  });
  it('help and its Back preserve the list and return focus to the actual help opener', async () => {
    const { saved, player } = fixture(), before = JSON.stringify(saved);
    const app = mount(saved, [player]);
    const help = screen.getByRole('button', { name: 'Recruitment shortlist help' });
    fireEvent.click(help);
    expect(screen.getByRole('heading', { name: 'Keep a few options' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(document.activeElement).toBe(help));
    expect(app.back).not.toHaveBeenCalled(); expect(app.writes).toHaveLength(0);
    expect(JSON.stringify(app.latest())).toBe(before);
  });
  it('the real transfer screen returns Find to ordinary Buy search without talking paying or loaning', async () => {
    const { saved, player } = fixture(), before = JSON.stringify(saved);
    const app = mount(saved, [player], { transfer: true });
    fireEvent.click(screen.getByRole('button', { name: 'Shortlist' }));
    fireEvent.click(await screen.findByRole('button', { name: `Find ${player.name} in Buy` }));
    expect(screen.getByRole('textbox', { name: 'Search player or club' })).toHaveValue(player.name);
    expect(screen.getByRole('button', { name: /^Talk ·/ })).toBeVisible();
    expect(app.talk).not.toHaveBeenCalled(); expect(app.clause).not.toHaveBeenCalled(); expect(app.loan).not.toHaveBeenCalled();
    expect(app.writes).toHaveLength(0); expect(JSON.stringify(app.latest())).toBe(before);
  });
});
