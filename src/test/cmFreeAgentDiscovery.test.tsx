import fs from 'node:fs';
import path from 'node:path';
import { act, cleanup, fireEvent, render, waitFor, within, type RenderResult } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContractsCard } from '@/components/club-manager/ContractsCard';
import { TransferScreen } from '@/components/club-manager/TransferScreen';
import { useClubManager, type ClubManagerGame } from '@/hooks/useClubManager';
import {
  SAVE_KEY, freeAgentBlock, freeAgentTerms, loadCareer, marketForScreen, moneyIn,
  signFreeAgent, startCareer, startNextSeason, wageBill, type CareerState, type FreeAgent,
} from '@/lib/clubManager';
import { readWorldRoster } from '@/lib/clubManagerWorldRoster';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn() }));

const noop = () => {};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function fixture() {
  const career = startCareer('Brentford');
  const pool = career.freeAgents ?? [];
  expect(pool.length, 'CM_FA_DISCOVERY_SETUP_EXISTING_POOL').toBeGreaterThan(0);
  const agent = pool.find(f => freeAgentBlock(career, f) === null);
  expect(agent, 'CM_FA_DISCOVERY_SETUP_SIGNABLE_EXISTING_AGENT').toBeDefined();
  expect(signFreeAgent(clone(career), agent!.name), 'CM_FA_DISCOVERY_SETUP_REAL_SIGNING').not.toBeNull();
  return { career, pool, agent: agent! };
}
function transferProps(career: CareerState, onSignFreeAgent: (name: string) => void) {
  return {
    career, market: marketForScreen(career), onSignFreeAgent,
    onNegotiate: vi.fn(), onOffer: noop, onWalk: noop, onDismissNegotiation: noop,
    onClause: noop, onLoan: noop, onAcceptBid: noop, onRejectBid: noop,
    onSetStatus: noop, onLoanOut: noop, onProposeTerms: noop, onBuyLoanee: noop,
    onEndLoanEarly: noop, onRecallLoanee: noop,
  };
}
function region(view: RenderResult, marker: string) {
  const button = view.queryByRole('button', { name: /^Free agents \(\d+\)$/ });
  expect(button, marker).not.toBeNull();
  fireEvent.click(button!);
  const found = view.getByRole('region', { name: 'Free agents' });
  expect(found).toBeVisible();
  return found;
}
function buttonFor(container: HTMLElement, career: CareerState, agent: FreeAgent) {
  const index = (career.freeAgents ?? []).indexOf(agent);
  expect(index, 'CM_FA_DISCOVERY_SETUP_POOL_INDEX').toBeGreaterThanOrEqual(0);
  const button = container.querySelector<HTMLButtonElement>(`button[data-sign-index="${index}"]`);
  expect(button, 'CM_FA_DISCOVERY_SIGN_BUTTON').not.toBeNull();
  return button!;
}
function quote(career: CareerState, agent: FreeAgent) {
  const terms = freeAgentTerms(agent, career);
  return `Sign · ${terms.wage}k/w · ${terms.years}y · ${moneyIn(career)(terms.fee)}`;
}
function exactPool(container: HTMLElement, career: CareerState) {
  const pool = career.freeAgents ?? [];
  expect(container.querySelectorAll('[data-sign-index]')).toHaveLength(pool.length);
  for (const agent of pool) {
    expect(within(container).getByText(agent.name, { exact: true })).toBeVisible();
    const button = buttonFor(container, career, agent);
    if (freeAgentBlock(career, agent)) expect(button).toBeDisabled();
    else { expect(button).toBeEnabled(); expect(button).toHaveTextContent(quote(career, agent)); }
  }
}

// Optional remote browser inputs, emitted only by the final healthy hook case.
// These are copies of real engine states. No roster fields or live saved state are rewritten here.
function emitBrowserFixtures(open: CareerState) {
  const output = process.env.CM_MARKET_BROWSER_FIXTURES_OUT;
  if (!output) return;
  const before = startCareer('Everton');
  const player = [...before.squad].filter(p => !p.onLoan && !p.isYouth && p.position !== 'GK' && p.age >= 20 && p.age < 30)
    .sort((a, b) => a.rating - b.rating)[0];
  expect(player, 'CM_FA_BROWSER_SETUP_EXISTING_EXPIRING_PLAYER').toBeDefined();
  const expiring: CareerState = { ...before, budget: 9999, wageCap: 9999,
    squad: before.squad.map(p => ({ ...p, contractYears: p.id === player.id ? 1 : 4 })) };
  const previousRandom = vi.mocked(Math.random).getMockImplementation()!;
  let summer: CareerState;
  vi.mocked(Math.random).mockReturnValue(.6);
  try { summer = startNextSeason(clone(expiring)); } finally { vi.mocked(Math.random).mockImplementation(previousRandom); }
  const expired: CareerState = { ...summer, transferWindow: null };
  const row = expired.freeAgents?.find(f => f.name === player.name);
  expect(row, 'CM_FA_BROWSER_ACTUAL_EXPIRED_POOL').toMatchObject({ reason: 'expired', fromMyClub: true });
  expect(expired.squad.some(p => p.name === player.name), 'CM_FA_BROWSER_ACTUAL_DEPARTURE').toBe(false);
  expect(freeAgentBlock(expired, row!), 'CM_FA_BROWSER_ACTUAL_RECOVERY_ALLOWED').toBeNull();
  const records = readWorldRoster(expired)?.records.filter(r => r.player.id === player.id && r.status === 'released' && r.owner === null) ?? [];
  expect(records, 'CM_FA_BROWSER_ACTUAL_CANONICAL_RECORD').toHaveLength(1);
  const restored = signFreeAgent(clone(expired), player.name);
  expect(restored, 'CM_FA_BROWSER_ACTUAL_RECOVERY').not.toBeNull();
  const returned = restored!.squad.find(p => p.name === player.name)!;
  expect(returned.id, 'CM_FA_BROWSER_ACTUAL_CANONICAL_ID').toBe(player.id);
  expect(returned.worldRosterKey).toBe(records[0].key);
  const market = marketForScreen(open).filter(p => !p.generated && Number.isFinite(p.price) && p.price > 0);
  const boundary = market.find(p => p.price > 10 && p.price < 25)!;
  expect(boundary, 'CM_FA_BROWSER_ACTUAL_PRICE_BOUNDARY').toBeDefined();
  const dir = path.resolve(output); fs.mkdirSync(dir, { recursive: true });
  const write = (name: string, value: unknown) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  write('price-open.career.json', open);
  write('natural-expiry-before.career.json', expiring);
  write('natural-expiry-closed.career.json', expired);
  write('EXPECTED.json', {
    schema: 1, source: process.env.GITHUB_SHA ?? null, sourceTest: 'src/test/cmFreeAgentDiscovery.test.tsx',
    inputKind: 'ACTUAL_ENGINE_STATES_FROM_FINAL_HEALTHY_TEST_ONLY', productionDataChanged: false,
    naturalExpiry: { beforeCareer: 'natural-expiry-before.career.json', career: 'natural-expiry-closed.career.json', name: player.name, id: player.id, worldRosterKey: records[0].key, player: returned, quote: freeAgentTerms(row!, expired), beforeBudget: expired.budget, afterBudget: restored!.budget, setupOnlyBudget: 9999, setupOnlyWageCap: 9999, actualSeasonRollover: true },
    price: { career: 'price-open.career.json', boundary: { name: boundary.name, club: boundary.club, price: boundary.price }, displayedCurrencyIsSymbolOnly: true },
  });
}

let game: ClubManagerGame;
let hookCalls: string[];
function HookDesk() {
  const g = useClubManager(); game = g;
  if (!g.career) return <p>Opening career</p>;
  const props = {
    career: g.career, market: g.market, onSignFreeAgent: (name: string) => { hookCalls.push(name); g.signFree(name); },
    onNegotiate: g.negotiate, onOffer: g.offer, onWalk: g.walk, onDismissNegotiation: g.dismissNegotiation,
    onClause: g.clause, onLoan: g.loan, onAcceptBid: g.acceptIncomingBid, onRejectBid: g.rejectIncomingBid,
    onSetStatus: g.setStatus, onLoanOut: g.loanOut, onProposeTerms: g.proposeTerms,
    onBuyLoanee: g.buyLoanee, onEndLoanEarly: g.endLoanEarly, onRecallLoanee: g.recallLoanee,
    deskNote: g.deskNote, onClearNote: g.clearDeskNote,
  };
  return <TransferScreen {...props} />;
}
async function resumeHook() {
  const view = render(<HookDesk />);
  await waitFor(() => expect(game.phase).toBe('resume'));
  act(() => game.resume());
  await waitFor(() => expect(game.phase).toBe('hub'));
  return view;
}

beforeEach(() => {
  localStorage.clear(); hookCalls = [];
  let seed = 20261030;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('Club Manager free-agent discovery on Transfers', () => {
  it('keeps the contracts desk quotes and signing callback intact', () => {
    const { career, agent } = fixture();
    for (const current of [career, { ...career, transferWindow: null }]) {
      const before = JSON.stringify(current), sign = vi.fn();
      const view = render(<ContractsCard career={current} onRenew={noop} onRenewWithClause={noop} onSignFreeAgent={sign} />);
      const button = buttonFor(view.container, current, agent);
      expect(button).toBeEnabled(); expect(button).toHaveTextContent(quote(current, agent));
      fireEvent.click(button);
      expect(sign.mock.calls).toEqual([[agent.name]]);
      expect(JSON.stringify(current)).toBe(before);
      expect(buttonFor(view.container, current, agent)).toBeVisible();
      expect(view.queryByTestId('cm-contracts-cue')).toBeNull();
      cleanup();
    }
  });

  it('shows the existing free-agent pool and signing terms in the open transfer window', () => {
    const { career, agent } = fixture();
    expect(career.transferWindow, 'CM_FA_DISCOVERY_SETUP_OPEN').not.toBeNull();
    const before = JSON.stringify(career), sign = vi.fn(), props = transferProps(career, sign);
    const view = render(<TransferScreen {...props} />);
    expect(view.getByRole('button', { name: 'Buy' })).toBeVisible();
    expect(view.getByRole('combobox', { name: 'Price range' })).toHaveValue('any');
    expect(view.queryByRole('region', { name: 'Free agents' })).toBeNull();
    const pool = region(view, 'CM_FA_TRANSFER_OPEN_DISCOVERY_MISSING');
    expect(view.getByRole('button', { name: `Free agents (${career.freeAgents!.length})` })).toHaveAttribute('aria-pressed', 'true');
    expect(view.queryByRole('combobox', { name: 'Price range' })).toBeNull();
    exactPool(pool, career);
    fireEvent.click(buttonFor(pool, career, agent));
    expect(sign.mock.calls).toEqual([[agent.name]]);
    expect(props.onNegotiate).not.toHaveBeenCalled();
    expect(JSON.stringify(career)).toBe(before);
    expect(buttonFor(pool, career, agent)).toBeVisible();
  });

  it('shows the same free-agent signing action with the transfer window closed', () => {
    const initial = fixture(), career: CareerState = { ...initial.career, transferWindow: null };
    expect(freeAgentBlock(career, initial.agent), 'CM_FA_DISCOVERY_SETUP_CLOSED_SIGNABLE').toBeNull();
    const before = JSON.stringify(career), sign = vi.fn(), props = transferProps(career, sign);
    const view = render(<TransferScreen {...props} />);
    expect(view.getByText('🔒 Transfer window closed')).toBeVisible();
    expect(view.getByRole('button', { name: 'Buy' })).toBeVisible();
    const pool = region(view, 'CM_FA_TRANSFER_CLOSED_DISCOVERY_MISSING');
    exactPool(pool, career);
    expect(within(pool).getByText(/window being shut does not stop these/)).toBeVisible();
    fireEvent.click(buttonFor(pool, career, initial.agent));
    expect(sign.mock.calls).toEqual([[initial.agent.name]]);
    expect(props.onNegotiate).not.toHaveBeenCalled();
    expect(JSON.stringify(career)).toBe(before);
  });

  it('keeps engine refusals disabled and a refused callback leaves the pool unchanged', () => {
    const { career, agent } = fixture();
    const capped: CareerState = { ...career, wageCap: wageBill(career), transferWindow: null };
    expect(freeAgentBlock(capped, agent), 'CM_FA_DISCOVERY_SETUP_REAL_CAP_REFUSAL').toBe('overCap');
    const sign = vi.fn(), props = transferProps(capped, sign);
    const view = render(<TransferScreen {...props} />);
    expect(view.getByText('🔒 Transfer window closed')).toBeVisible();
    let pool = region(view, 'CM_FA_TRANSFER_REFUSAL_DISCOVERY_MISSING');
    let button = buttonFor(pool, capped, agent);
    expect(button).toBeDisabled(); expect(button).toHaveTextContent('Over the cap');
    fireEvent.click(button); expect(sign).not.toHaveBeenCalled();
    const before = JSON.stringify(career);
    view.rerender(<TransferScreen {...transferProps(career, sign)} />);
    pool = region(view, 'CM_FA_TRANSFER_REFUSAL_DISCOVERY_MISSING');
    button = buttonFor(pool, career, agent);
    expect(button).toBeEnabled(); fireEvent.click(button);
    expect(sign.mock.calls).toEqual([[agent.name]]);
    expect(JSON.stringify(career)).toBe(before);
    expect(buttonFor(pool, career, agent)).toBeVisible();
    expect(pool.querySelectorAll('[data-sign-index]')).toHaveLength(career.freeAgents!.length);
    expect(view.queryByText(/^Signed:/)).toBeNull();
  });

  it('shows an empty pool without inventing signable rows', () => {
    const initial = fixture(), career: CareerState = { ...initial.career, freeAgents: [], transferWindow: null };
    const before = JSON.stringify(career), sign = vi.fn();
    const view = render(<TransferScreen {...transferProps(career, sign)} />);
    expect(view.getByText('🔒 Transfer window closed')).toBeVisible();
    const pool = region(view, 'CM_FA_TRANSFER_EMPTY_DISCOVERY_MISSING');
    expect(within(pool).getByText('No free agents available right now.')).toBeVisible();
    expect(pool.querySelectorAll('[data-sign-index]')).toHaveLength(0);
    expect(sign).not.toHaveBeenCalled();
    expect(JSON.stringify(career)).toBe(before);
  });

  it('uses the existing signing hook once and retains its actual saved deal after reload', async () => {
    const initial = fixture();
    const career: CareerState = { ...initial.career, transferWindow: null };
    localStorage.setItem(SAVE_KEY, JSON.stringify(career));
    const view = await resumeHook();
    expect(view.getByText('🔒 Transfer window closed')).toBeVisible();
    const before = clone(game.career!), pool = before.freeAgents ?? [];
    const agent = pool.find(f => freeAgentBlock(before, f) === null);
    expect(agent, 'CM_FA_DISCOVERY_SETUP_LOADED_AGENT').toBeDefined();
    const expected = signFreeAgent(clone(before), agent!.name);
    expect(expected, 'CM_FA_DISCOVERY_SETUP_LOADED_SIGNING').not.toBeNull();
    const actualPool = region(view, 'CM_FA_TRANSFER_HOOK_DISCOVERY_MISSING');
    const loadedAgent = game.career!.freeAgents!.find(f => f.name === agent!.name)!;
    fireEvent.click(buttonFor(actualPool, game.career!, loadedAgent));
    await waitFor(() => expect(game.career!.squad.some(p => p.name === agent!.name)).toBe(true));
    expect(hookCalls).toEqual([agent!.name]);
    const signed = game.career!.squad.find(p => p.name === agent!.name)!;
    const expectedPlayer = expected!.squad.find(p => p.name === agent!.name)!;
    expect(signed).toEqual(expectedPlayer);
    expect(game.career!.budget).toBe(expected!.budget);
    expect(game.career!.freeAgents!.some(f => f.name === agent!.name)).toBe(false);
    expect(within(actualPool).queryByText(agent!.name, { exact: true })).toBeNull();
    await waitFor(() => expect(loadCareer()?.squad.find(p => p.id === signed.id)).toMatchObject(signed));
    const persisted = loadCareer()!.squad.find(p => p.id === signed.id)!;
    expect(loadCareer()!.freeAgents!.some(f => f.name === agent!.name)).toBe(false);
    cleanup();
    await resumeHook();
    expect(game.career!.squad.find(p => p.id === signed.id)).toEqual(persisted);
    expect(game.career!.budget).toBe(expected!.budget);
    expect(game.career!.freeAgents!.some(f => f.name === agent!.name)).toBe(false);
    expect(hookCalls).toEqual([agent!.name]);
    emitBrowserFixtures(initial.career);
  });
});
