import { StrictMode, useState } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import MoneyApp from '@/components/us-career/MoneyApp';
import motion from '@/components/us-career/MoneyAppFeedback.module.css';
import {
  ASSETS, MAX_LEDGER, bankSummary, cardCap, ensureMoney, fmtMoney, moneyAct,
  spendable, type LedgerEntry, type MoneyAction, type MoneyHost, type MoneySport,
} from '@/lib/careerMoney';
import { NFL_MONEY } from '@/lib/nflCareerMoney';
import { NBA_MONEY } from '@/lib/nbaCareerMoney';
import { MLB_MONEY } from '@/lib/mlbCareerMoney';
import { NHL_MONEY } from '@/lib/nhlCareerMoney';

// Simulated accounts only. These fields are exactly those read by the real sport descriptors.
type Account = MoneyHost & { name: string; year: number; yearlyCosts: number; fanbase: number };
const sports = [
  ['NFL', NFL_MONEY], ['NBA', NBA_MONEY], ['MLB', MLB_MONEY], ['NHL', NHL_MONEY],
] as const;
const sportFor = (sport: typeof sports[number][1]) => sport as unknown as MoneySport<Account>;
const defaultSport = sportFor(NFL_MONEY);
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const account = (): Account => ({ name: 'Simulated account', year: 2026, yearlyCosts: 0.2, fanbase: 40, netWorth: 10.1, morale: 55, seasons: [] });
const commit = (before: Account, action: MoneyAction, sport = defaultSport) => {
  const next = clone(before);
  expect(moneyAct(next, action, sport).ok).toBe(true);
  return next;
};

function mount(initial = account(), sport = defaultSport, strict = false) {
  const controller = {
    current: clone(initial), accept: true, calls: vi.fn<(action: MoneyAction) => void>(),
    replace: (_next: Account) => {},
  };
  function Host() {
    const [host, setHost] = useState(() => clone(initial));
    controller.current = host;
    controller.replace = next => setHost(clone(next));
    return <MoneyApp host={host} sport={sport} incomeLine="Simulated salary: $2M a season" shop={<button>Simulated shop item</button>} onMoney={action => {
      controller.calls(action);
      if (!controller.accept) return;
      const next = clone(host);
      if (moneyAct(next, action, sport).ok) setHost(next);
    }} />;
  }
  const view = render(strict ? <StrictMode><Host /></StrictMode> : <Host />);
  return { view, controller, sport };
}
type Screen = ReturnType<typeof mount>;
const bucket = (screen: Screen, name: 'cash' | 'vault' | 'invested') => screen.view.getByText({ cash: 'in the account', vault: 'savings', invested: 'invested' }[name], { exact: true }).parentElement!;
const statement = (screen: Screen) => screen.view.getByText('📄 Statement').parentElement!.parentElement!;
const latestRow = (screen: Screen, entry: LedgerEntry) => within(statement(screen)).getAllByText(entry.t, { exact: true })[0].parentElement!;
function assertBank(screen: Screen, expected: Account) {
  expect(screen.controller.current).toEqual(expected);
  const bank = bankSummary(expected, screen.sport);
  for (const name of ['cash', 'vault', 'invested'] as const) {
    expect(bucket(screen, name).firstElementChild).toHaveTextContent(fmtMoney(bank[name], screen.sport.currency));
    expect(bucket(screen, name).firstElementChild?.textContent).toBe(fmtMoney(bank[name], screen.sport.currency));
  }
  expect(screen.view.getByText('Everything you have').nextElementSibling?.textContent).toBe(fmtMoney(bank.total, screen.sport.currency));
  return bank;
}
function assertReceipt(screen: Screen, expected: Account, changed: ('cash' | 'vault' | 'invested')[]) {
  const bank = assertBank(screen, expected), entry = bank.entries[0];
  const receipt = screen.view.getByRole('status');
  expect(receipt).toHaveTextContent('Last transaction');
  expect(receipt).toHaveTextContent(entry.t);
  expect(receipt).toHaveTextContent(`${entry.a >= 0 ? '+' : ''}${fmtMoney(entry.a, screen.sport.currency)}`);
  expect(receipt).toHaveTextContent(`Season ${entry.y}`);
  expect(receipt).toHaveClass(motion.receipt);
  for (const name of ['cash', 'vault', 'invested'] as const) {
    if (changed.includes(name)) expect(bucket(screen, name)).toHaveClass(motion.changed);
    else expect(bucket(screen, name)).not.toHaveClass(motion.changed);
  }
  expect(screen.view.getByText('Everything you have').nextElementSibling).not.toHaveClass(motion.changed);
  return receipt;
}
function openAsset(screen: Screen) {
  fireEvent.click(screen.view.getByRole('button', { name: '📈 Market' }));
  fireEvent.click(screen.view.getByRole('button', { name: new RegExp(ASSETS[0].name) }));
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('MoneyApp committed transaction feedback', () => {
  it.each(sports)('announces the actual %s deposit and only the two changed buckets', (_name, descriptor) => {
    const initial = account(), screen = mount(initial, sportFor(descriptor), true);
    const before = clone(initial), oldTotal = bankSummary(before, screen.sport).total;
    const action: MoneyAction = { t: 'deposit', amount: spendable(before) * 0.25 };
    const button = screen.view.getByRole('button', { name: 'Save 25%' }); button.focus();
    fireEvent.click(button);
    const expected = commit(before, action, screen.sport);
    expect(screen.controller.calls).toHaveBeenCalledExactlyOnceWith(action);
    expect(bankSummary(expected, screen.sport).total).toBe(oldTotal);
    expect(initial).toEqual(before);
    assertReceipt(screen, expected, ['cash', 'vault']);
    expect(latestRow(screen, expected.money!.log.at(-1)!)).toHaveClass(motion.latest);
    expect(document.activeElement).toBe(button);
  });

  it('announces the actual withdrawal without treating a transfer as new wealth', () => {
    const initial = commit(account(), { t: 'deposit', amount: 4 }), screen = mount(initial);
    const action: MoneyAction = { t: 'withdraw', amount: bankSummary(initial, screen.sport).vault * 0.5 };
    fireEvent.click(screen.view.getByRole('button', { name: 'Take out half' }));
    const expected = commit(initial, action);
    expect(bankSummary(expected, screen.sport).total).toBe(bankSummary(initial, screen.sport).total);
    expect(screen.controller.calls).toHaveBeenCalledExactlyOnceWith(action);
    assertReceipt(screen, expected, ['cash', 'vault']);
    expect(latestRow(screen, expected.money!.log.at(-1)!)).toHaveClass(motion.latest);
  });

  it('shows the committed buy amount and exact holding after the existing fee', () => {
    const initial = account(), screen = mount(initial); openAsset(screen);
    const action: MoneyAction = { t: 'buy', id: ASSETS[0].id, amount: spendable(initial) * 0.25 };
    fireEvent.click(screen.view.getByRole('button', { name: '25%' }));
    const expected = commit(initial, action);
    expect(expected.money!.hold.ladder).toBe(2.475);
    expect(bankSummary(expected, screen.sport).total).toBe(10.08);
    expect(screen.controller.calls).toHaveBeenCalledExactlyOnceWith(action);
    assertReceipt(screen, expected, ['cash', 'invested']);
    expect(screen.view.getByText('You are holding').nextElementSibling?.textContent).toBe(fmtMoney(2.48, '$'));
  });

  it('shows the actual sale proceeds and retains both sides of the existing fee', () => {
    const initial = commit(account(), { t: 'buy', id: ASSETS[0].id, amount: 4 }), screen = mount(initial); openAsset(screen);
    const action: MoneyAction = { t: 'sell', id: ASSETS[0].id, frac: 1 };
    fireEvent.click(screen.view.getByRole('button', { name: 'All of it' }));
    const expected = commit(initial, action);
    expect(expected.money!.log.at(-1)?.a).toBe(3.92);
    expect(bankSummary(expected, screen.sport).total).toBe(10.02);
    expect(screen.controller.calls).toHaveBeenCalledExactlyOnceWith(action);
    assertReceipt(screen, expected, ['cash', 'invested']);
    expect(screen.view.getByRole('button', { name: 'All of it' })).toBeDisabled();
  });

  it.each([['win', 1], ['loss', 1000]] as const)('announces the committed cards %s without changing the seed odds or one-sitting limit', (outcome, seed) => {
    const initial = account(); initial.money = ensureMoney(initial, defaultSport); initial.money.seed = seed;
    const screen = mount(initial); fireEvent.click(screen.view.getByRole('button', { name: '🃏 Cards' }));
    const stake = cardCap(initial, screen.sport), action: MoneyAction = { t: 'cards', stake };
    fireEvent.click(screen.view.getByRole('button', { name: `Sit in for ${fmtMoney(stake, '$')}` }));
    const expected = commit(initial, action), delta = expected.money!.log.at(-1)!.a;
    expect(delta > 0).toBe(outcome === 'win');
    expect(screen.controller.calls).toHaveBeenCalledExactlyOnceWith(action);
    assertReceipt(screen, expected, ['cash']);
    expect(screen.view.queryByRole('button', { name: /^Sit in for/ })).toBeNull();
    expect(screen.view.getByText(/You have had your sitting this season/)).toBeInTheDocument();
    expect(screen.controller.current.money!.seed).toBe(expected.money!.seed);
  });

  it('keeps a fresh legacy account quiet and leaves its save untouched on opening', () => {
    const initial = account(), bytes = JSON.stringify(initial), screen = mount(initial, defaultSport, true);
    assertBank(screen, initial);
    expect(screen.view.queryByRole('status')).toBeNull();
    expect(screen.view.container.querySelector(`.${motion.changed}`)).toBeNull();
    expect(screen.view.container.querySelector(`.${motion.latest}`)).toBeNull();
    expect(screen.controller.calls).not.toHaveBeenCalled();
    expect(JSON.stringify(initial)).toBe(bytes); expect(screen.controller.current.money).toBeUndefined();
  });

  it('keeps a recovered account quiet with its exact latest statement and balances', () => {
    const saved = commit(account(), { t: 'deposit', amount: 3 }), screen = mount(clone(saved));
    assertBank(screen, saved);
    expect(latestRow(screen, saved.money!.log.at(-1)!)).toHaveTextContent('-$3.0M');
    expect(latestRow(screen, saved.money!.log.at(-1)!)).not.toHaveClass(motion.latest);
    expect(screen.view.queryByRole('status')).toBeNull();
    act(() => screen.controller.replace(clone(saved)));
    expect(screen.view.queryByRole('status')).toBeNull();
    expect(screen.controller.calls).not.toHaveBeenCalled();
  });

  it('does not replay a receipt or highlight a new passive ledger line after prop clones', () => {
    const screen = mount(); fireEvent.click(screen.view.getByRole('button', { name: 'Save 25%' }));
    const first = clone(screen.controller.current), receipt = assertReceipt(screen, first, ['cash', 'vault']);
    const cashNode = bucket(screen, 'cash'), row = latestRow(screen, first.money!.log.at(-1)!);
    act(() => screen.controller.replace(clone(first)));
    expect(screen.view.getByRole('status')).toBe(receipt); expect(bucket(screen, 'cash')).toBe(cashNode);
    expect(latestRow(screen, first.money!.log.at(-1)!)).toBe(row);
    const passive = commit(first, { t: 'withdraw', amount: 1 });
    act(() => screen.controller.replace(passive));
    assertBank(screen, passive);
    expect(screen.view.getByRole('status')).toBe(receipt);
    expect(receipt).toHaveTextContent('Into savings'); expect(receipt).not.toHaveTextContent('Out of savings');
    expect(latestRow(screen, passive.money!.log.at(-1)!)).not.toHaveClass(motion.latest);
    expect(screen.controller.calls).toHaveBeenCalledTimes(1);
  });

  it('consumes a declined local action before any unrelated later committed props', () => {
    const initial = account(), screen = mount(initial); screen.controller.accept = false;
    fireEvent.click(screen.view.getByRole('button', { name: 'Save 25%' }));
    expect(screen.controller.calls).toHaveBeenCalledTimes(1); assertBank(screen, initial);
    expect(screen.view.queryByRole('status')).toBeNull();
    const passive = commit(initial, { t: 'deposit', amount: 3 });
    act(() => screen.controller.replace(passive));
    assertBank(screen, passive);
    expect(screen.view.queryByRole('status')).toBeNull();
    expect(screen.view.container.querySelector(`.${motion.changed}`)).toBeNull();
    expect(latestRow(screen, passive.money!.log.at(-1)!)).not.toHaveClass(motion.latest);
  });

  it('keeps an earlier receipt static when a later local action is declined', () => {
    const screen = mount(); fireEvent.click(screen.view.getByRole('button', { name: 'Save 25%' }));
    const first = clone(screen.controller.current), receipt = assertReceipt(screen, first, ['cash', 'vault']);
    const cashNode = bucket(screen, 'cash'); screen.controller.accept = false;
    fireEvent.click(screen.view.getByRole('button', { name: 'Save 25%' }));
    assertBank(screen, first); expect(screen.view.getByRole('status')).toBe(receipt);
    expect(bucket(screen, 'cash')).toBe(cashNode); expect(screen.controller.calls).toHaveBeenCalledTimes(2);
    act(() => screen.controller.replace(clone(first)));
    expect(screen.view.getByRole('status')).toBe(receipt);
  });

  it('does not restart the statement cue when returning to Account after a transaction', () => {
    const screen = mount(); fireEvent.click(screen.view.getByRole('button', { name: 'Save 25%' }));
    const saved = clone(screen.controller.current), receipt = screen.view.getByRole('status');
    const cashNode = bucket(screen, 'cash');
    expect(latestRow(screen, saved.money!.log.at(-1)!)).toHaveClass(motion.latest);
    fireEvent.click(screen.view.getByRole('button', { name: '📈 Market' }));
    fireEvent.click(screen.view.getByRole('button', { name: '🏦 Account' }));
    assertBank(screen, saved);
    expect(screen.view.getByRole('status')).toBe(receipt); expect(bucket(screen, 'cash')).toBe(cashNode);
    expect(latestRow(screen, saved.money!.log.at(-1)!)).not.toHaveClass(motion.latest);
    expect(screen.controller.calls).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.view.getByRole('button', { name: 'Take out half' }));
    const next = commit(saved, { t: 'withdraw', amount: saved.money!.vault * 0.5 });
    assertBank(screen, next);
    expect(latestRow(screen, next.money!.log.at(-1)!)).toHaveClass(motion.latest);
    expect(screen.view.getByRole('status')).not.toBe(receipt);
    expect(screen.controller.calls).toHaveBeenCalledTimes(2);
  });

  it('restarts one real receipt for repeated identical transactions at the ledger cap', () => {
    const initial = commit(account(), { t: 'deposit', amount: 2.5 });
    initial.netWorth = 10.1; initial.money!.vault = 30;
    initial.money!.log = Array.from({ length: MAX_LEDGER }, () => clone(initial.money!.log[0]));
    const screen = mount(initial), ledger = JSON.stringify(initial.money!.log);
    fireEvent.click(screen.view.getByRole('button', { name: 'Save 25%' }));
    const first = commit(initial, { t: 'deposit', amount: 2.5 });
    expect(JSON.stringify(first.money!.log)).toBe(ledger);
    const firstReceipt = assertReceipt(screen, first, ['cash', 'vault']);
    const firstRow = latestRow(screen, first.money!.log.at(-1)!);
    expect(firstRow).toHaveClass(motion.latest);
    const resetCash = clone(first); resetCash.netWorth = 10.1;
    act(() => screen.controller.replace(resetCash));
    expect(screen.view.getByRole('status')).toBe(firstReceipt);
    fireEvent.click(screen.view.getByRole('button', { name: 'Save 25%' }));
    const second = commit(resetCash, { t: 'deposit', amount: 2.5 });
    expect(JSON.stringify(second.money!.log)).toBe(ledger);
    const secondReceipt = assertReceipt(screen, second, ['cash', 'vault']);
    expect(secondReceipt).not.toBe(firstReceipt);
    expect(latestRow(screen, second.money!.log.at(-1)!)).not.toBe(firstRow);
    expect(second.money!.log).toHaveLength(MAX_LEDGER);
    expect(screen.controller.calls).toHaveBeenCalledTimes(2);
  });

  it('preserves exact account payloads balances and statement amounts without changing the career rules', () => {
    const initial = account(), screen = mount(initial), action: MoneyAction = { t: 'deposit', amount: spendable(initial) * 0.5 };
    fireEvent.click(screen.view.getByRole('button', { name: 'Save half' }));
    const expected = commit(initial, action);
    expect(screen.controller.calls).toHaveBeenCalledExactlyOnceWith(action); assertBank(screen, expected);
    expect(latestRow(screen, expected.money!.log.at(-1)!)).toHaveTextContent('-$5.0M');
    expect(expected.money!.vault).toBe(5); expect(expected.netWorth).toBe(5.1);
  });

  it('preserves market navigation and the sport shop without dispatching money actions', () => {
    const initial = account(), screen = mount(initial); openAsset(screen);
    expect(screen.view.getByRole('button', { name: '25%' })).toBeEnabled();
    fireEvent.click(screen.view.getByRole('button', { name: '‹ Market' }));
    expect(screen.view.getByRole('button', { name: new RegExp(ASSETS[0].name) })).toBeInTheDocument();
    fireEvent.click(screen.view.getByRole('button', { name: '🛒 Shop' }));
    expect(screen.view.getByRole('button', { name: 'Simulated shop item' })).toBeInTheDocument();
    fireEvent.click(screen.view.getByRole('button', { name: '🏦 Account' }));
    expect(screen.view.getByRole('button', { name: 'Save half' })).toBeInTheDocument();
    expect(screen.controller.calls).not.toHaveBeenCalled(); assertBank(screen, initial);
    expect(screen.view.queryByRole('status')).toBeNull();
  });

  it('keeps feedback finite with an explicit visible static reduced-motion state', () => {
    const css = readFileSync(process.env.MONEY_APP_FEEDBACK_CSS || path.resolve('src/components/us-career/MoneyAppFeedback.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const name of ['receipt', 'changed', 'latest']) {
      const block = css.match(new RegExp(`\\.${name}\\s*\\{([^}]+)\\}`))?.[1];
      expect(block).toBeDefined();
      const animation = block!.match(/animation:\s*\w+\s+(\d+)ms\s+ease-out\s*;/);
      expect(animation).not.toBeNull();
      expect(Number(animation![1])).toBeGreaterThan(0);
      expect(Number(animation![1])).toBeLessThanOrEqual(600);
      expect(block).not.toMatch(/infinite|display:\s*none|visibility:\s*hidden/);
    }
    const reduced = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.receipt,\s*\.changed,\s*\.latest\s*\{([^}]+)\}/)?.[1];
    expect(reduced).toBeDefined();
    expect(reduced).toMatch(/animation:\s*none\s*;/);
    expect(reduced).toMatch(/opacity:\s*1\s*;/);
    expect(reduced).toMatch(/transform:\s*none\s*;/);
    expect(reduced).toMatch(/box-shadow:\s*none\s*;/);
  });
});
