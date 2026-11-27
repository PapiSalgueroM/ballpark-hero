import { StrictMode, useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecruitmentBoard } from '@/components/club-manager/RecruitmentBoard';
import { TransferScreen } from '@/components/club-manager/TransferScreen';
import { marketForScreen, moneyIn, renewContract, startCareer, type CareerState, type MarketPlayer } from '@/lib/clubManager';
import { addRecruitment, recruitmentOf, scoutBrief, type RecruitmentCommit, type RecruitmentPick } from '@/lib/clubManagerRecruitment';

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
  function successionFixture() {
    const { career, market } = fixture();
    const [first, other, borrowed, short, missing, lent] = career.squad.slice(0, 6);
    const incumbent = { ...first, position: 'CB' as const, age: 24, contractYears: 1 };
    const partner = { ...other, position: incumbent.position, rating: 99, contractYears: 4 };
    const reserve = { ...lent, position: incumbent.position, rating: 72, contractYears: 3 };
    const squad = [
      incumbent, partner, { ...borrowed, position: incumbent.position, rating: 98, onLoan: true, contractYears: 4 },
      { ...short, position: incumbent.position, rating: 97, contractYears: 1 },
      { ...missing, position: incumbent.position, rating: 96, contractYears: undefined },
    ];
    return { market, incumbent, reserve, partner, career: { ...career, squad, xiIds: [incumbent.id, partner.id],
      loanedOut: [{ player: reserve, club: 'Loan club', fee: 0, season: 1, optionFee: 2 }], budget: 60 } };
  }
  it('prices a real renewal, excludes occupied shirts and expiring or borrowed cover, and charges just one deal', () => {
    const { career, incumbent, reserve, partner, market } = successionFixture();
    const app = mount(career, market);
    fireEvent.click(screen.getByRole('button', { name: 'Squad succession' }));
    expect(screen.getByLabelText('Deal to review')).toHaveValue(incumbent.id);
    const card = screen.getByRole('article');
    expect(card).toHaveTextContent(reserve.name);
    expect(card).toHaveTextContent('The borrowing club has a purchase option');
    expect(card).not.toHaveTextContent(partner.name);
    expect(app.writes).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Renew for 4 years' }));
    expect(app.latest()).toEqual(renewContract(career, incumbent.id));
    expect(app.writes).toHaveLength(1);
    expect(screen.getByLabelText('Deal to review')).toHaveValue('');
    expect(screen.queryByRole('button', { name: /^Renew for/ })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(incumbent.name + ' renewed');
  });
  it('hands the expiring position to scouting, preserves the displayed deal on Back, and does not renew on a refused write', () => {
    const { career, incumbent, market } = successionFixture();
    const app = mount(career, market, { refuse: true });
    fireEvent.click(screen.getByRole('button', { name: 'Squad succession' }));
    fireEvent.click(screen.getByRole('button', { name: 'Scout a replacement' }));
    expect(screen.getByLabelText('Position')).toHaveValue(incumbent.position);
    expect(screen.getByLabelText('Squad job')).toHaveValue('starter');
    fireEvent.click(screen.getByRole('button', { name: 'Back to succession' }));
    expect(screen.getByLabelText('Deal to review')).toHaveValue(incumbent.id);
    fireEvent.click(screen.getByRole('button', { name: 'Renew for 4 years' }));
    expect(screen.getByRole('status')).toHaveTextContent('could not be saved');
    expect(app.latest()).toBe(career);
  });
  it('moves the cover cutoff with the following summer and keeps an equal-length renewal off the desk', () => {
    const { career, incumbent, reserve, market } = successionFixture();
    career.squad[0] = { ...incumbent, age: 33, contractYears: 2 };
    career.loanedOut[0].player = { ...reserve, contractYears: 2 };
    const app = mount(career, market);
    fireEvent.click(screen.getByRole('button', { name: 'Squad succession' }));
    fireEvent.change(screen.getByLabelText('Deal to review'), { target: { value: incumbent.id } });
    expect(screen.getByRole('article')).toHaveTextContent('No other player outside your starting eleven');
    expect(screen.queryByRole('button', { name: /^Renew for/ })).toBeNull();
    expect(app.writes).toHaveLength(0);
  });
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
  it('a 13th Save says the shortlist is full instead of blaming the save (Release BS fix BS-cm416-4)', () => {
    const career = startCareer('Brentford'), market = marketForScreen(career);
    expect(market.length).toBeGreaterThan(12);
    let full = career;
    for (const p of market.slice(0, 12)) full = addRecruitment(full, p)!;
    expect(recruitmentOf(full)!.targets).toHaveLength(12);
    const before = JSON.stringify(full);
    const app = mount(full, market, { pick: { career: full, player: market[12] } });
    expect(screen.getByText('Your shortlist is full: 12 of 12. Remove a target to save another.')).toBeVisible();
    expect(screen.queryByText(/Could not save this target/)).toBeNull();
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
  it('runs two briefs against one market, resumes the new search and hands its earlier target to ordinary Buy', async () => {
    const { career, market } = fixture(), original = JSON.stringify(career);
    const first = scoutBrief(career, market, { position: 'CB', job: 'starter', budgetShare: 50 }).reports[0];
    const cover = scoutBrief(career, market, { position: 'CB', job: 'cover', budgetShare: 50 }).reports[0];
    expect(first.player.rating).toBeGreaterThan(cover.player.rating);
    expect(first.terms.total).toBeGreaterThan(cover.terms.total);
    const open = async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Shortlist' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Recruitment brief' }));
    };
    const marketRows = [first.player, cover.player];
    const app = mount(career, marketRows, { transfer: true });
    await open();
    expect(app.writes).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Run this brief' }));
    const firstCard = screen.getByRole('article', { name: 'Report on ' + first.player.name });
    expect(within(firstCard).getByText(new RegExp('Estimated commitment'))).toHaveTextContent(moneyIn(career)(first.terms.total));
    fireEvent.click(within(firstCard).getByRole('button', { name: 'Shortlist from this brief' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Squad job' }), { target: { value: 'cover' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run this brief' }));
    expect(screen.getByRole('article', { name: 'Report on ' + cover.player.name })).toBeVisible();
    const current = app.latest();
    expect(recruitmentOf(current)?.targets[0].fromBrief?.job).toBe('starter');
    const { recruitment: _, ...untouched } = current as typeof current & { recruitment?: unknown };
    expect(JSON.stringify(untouched)).toBe(original);
    cleanup();
    const restored = mount(JSON.parse(JSON.stringify(current)), marketRows, { transfer: true });
    await open();
    expect(screen.getByRole('combobox', { name: 'Squad job' })).toHaveValue('cover');
    expect(screen.getByRole('article', { name: 'Report on ' + cover.player.name })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back to shortlist' }));
    expect(screen.getByText(/Scouted for CB/)).toHaveTextContent('First-team challenger');
    fireEvent.click(screen.getByRole('button', { name: 'Find ' + first.player.name + ' in Buy' }));
    fireEvent.click(screen.getByRole('button', { name: /Talk ·/ }));
    expect(restored.talk).toHaveBeenCalledWith(first.player);
    expect(restored.writes).toHaveLength(0);
  });
  it('shows twelve saved targets as compact View tiles and opens only one current detail before Back with no write or draw', () => {
    const career = startCareer('Brentford'), market = marketForScreen(career), players = market.slice(0, 12);
    expect(players).toHaveLength(12);
    let saved = career;
    for (const player of players) saved = addRecruitment(saved, player)!;
    expect(recruitmentOf(saved)!.targets).toHaveLength(12);
    const before = JSON.stringify(saved), draws = vi.mocked(Math.random).mock.calls.length;
    const app = mount(saved, market);
    expect(screen.queryByRole('button', { name: `View ${players[0].name}` }), 'MISSING_VIEW_TILE').not.toBeNull();
    for (const player of players) expect(screen.getByRole('button', { name: `View ${player.name}` })).toBeVisible();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.queryByText('Asking price', { exact: true })).toBeNull();
    const selected = players[7];
    fireEvent.click(screen.getByRole('button', { name: `View ${selected.name}` }));
    const detail = screen.getByRole('article', { name: selected.name });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(within(detail).getByText(moneyIn(saved)(selected.price), { exact: true })).toBeVisible();
    expect(within(detail).getByText(`${selected.age}y`, { exact: true })).toBeVisible();
    fireEvent.click(within(detail).getByRole('button', { name: `Find ${selected.name} in Buy` }));
    expect(app.find).toHaveBeenCalledTimes(1); expect(app.find.mock.calls[0][0]).toBe(selected);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    for (const player of players) expect(screen.getByRole('button', { name: `View ${player.name}` })).toBeVisible();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(app.back).not.toHaveBeenCalled(); expect(app.writes).toHaveLength(0);
    expect(JSON.stringify(app.latest())).toBe(before); expect(vi.mocked(Math.random).mock.calls).toHaveLength(draws);
  });
});
