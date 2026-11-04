import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GmTradeBuilder, type BuilderTile } from './GmTradeBuilder';
import { assetKey, type PackageVerdict, type TradeAsset } from '@/lib/gmTradePackage';
import type { TradeWindow } from '@/lib/gmDeadline';

afterEach(cleanup);
const fixture = () => ({
  mine: [
    { asset: { kind: 'player', id: 'fixture-qb' }, label: 'Fixture Quarterback', sub: 'QB 82, age 26, $3M x 2' },
    { asset: { kind: 'player', id: 'fixture-rb' }, label: 'Fixture Runner', sub: 'RB 76, age 24, $2M x 3' },
    { asset: { kind: 'pick', key: '2030-1-LAB' }, label: '2030 round 1', sub: 'their own' },
    { asset: { kind: 'pick', key: '2031-2-LAB' }, label: '2031 round 2', sub: 'from LAB', blocked: 'This pick is protected.' },
  ] satisfies BuilderTile[],
  theirs: [
    { asset: { kind: 'player', id: 'target-qb' }, label: 'Target Quarterback', sub: 'QB 79, age 25, $4M x 2' },
    { asset: { kind: 'player', id: 'target-wr' }, label: 'Target Receiver', sub: 'WR 80, age 23, $3M x 3' },
  ] satisfies BuilderTile[],
});
const openWindow: TradeWindow = { open: true, deadlineAfter: 8, periodsLeft: 4, reason: null };
const accepted: PackageVerdict = { verdict: 'accepted', reason: null, step: 0, offer: 100, ask: 90, short: 0 };
function mount(initial: string[] = [], verdict: PackageVerdict | null = null, window = openWindow) {
  const tiles = fixture(), input = JSON.stringify(tiles), toggled = vi.fn(), proposed = vi.fn();
  function App() {
    const [selected, setSelected] = useState(new Set(initial));
    return <GmTradeBuilder partnerName="Fixture Club" {...tiles} selected={selected} maxPerSide={2}
      verdict={verdict} window={window} onPropose={proposed} onToggle={asset => {
        toggled(asset); setSelected(previous => { const next = new Set(previous), key = assetKey(asset); if (next.has(key)) next.delete(key); else next.add(key); return next; });
      }} />;
  }
  return { ...render(<App />), tiles, input, toggled, proposed };
}
function tile(container: HTMLElement, key: string) {
  return container.querySelector<HTMLButtonElement>('[data-gm-tile="' + key + '"]');
}
function search(name: string, marker: string) {
  const input = screen.queryByRole('searchbox', { name });
  expect(input, marker).not.toBeNull();
  return input!;
}

describe('GM trade asset search', () => {
  it('finds name, position and pick text independently without changing the deal', () => {
    const f = mount();
    expect(f.container.querySelectorAll('[data-gm-tile]')).toHaveLength(6);
    const own = search('Search your trade assets', 'GM_TRADE_SEARCH_MATCHES');
    fireEvent.change(own, { target: { value: ' qb ' } });
    expect(tile(f.container, 'player:fixture-qb')).not.toBeNull();
    expect(tile(f.container, 'player:fixture-rb')).toBeNull();
    expect(tile(f.container, 'player:target-wr')).not.toBeNull();
    fireEvent.change(own, { target: { value: '2030' } });
    expect(tile(f.container, 'pick:2030-1-LAB')).not.toBeNull();
    expect(tile(f.container, 'player:fixture-qb')).toBeNull();
    fireEvent.change(search('Search their trade assets', 'GM_TRADE_SEARCH_MATCHES'), { target: { value: 'RECEIVER' } });
    expect(tile(f.container, 'player:target-qb')).toBeNull();
    expect(tile(f.container, 'player:target-wr')).not.toBeNull();
    expect(tile(f.container, 'pick:2030-1-LAB')).not.toBeNull();
    expect(f.toggled).not.toHaveBeenCalled(); expect(f.proposed).not.toHaveBeenCalled();
    expect(JSON.stringify(f.tiles)).toBe(f.input);
    expect(screen.getByRole('button', { name: 'Make the trade' })).toBeDisabled();
  });
  it('keeps selected pieces visible and uses the whole deal for the limit while filtering', () => {
    const f = mount(['player:fixture-rb', 'pick:2030-1-LAB']);
    const own = search('Search your trade assets', 'GM_TRADE_SEARCH_SELECTION');
    fireEvent.change(own, { target: { value: 'QB' } });
    expect(tile(f.container, 'player:fixture-rb')).toHaveAttribute('aria-pressed', 'true');
    expect(tile(f.container, 'pick:2030-1-LAB')).toHaveAttribute('aria-pressed', 'true');
    expect(tile(f.container, 'player:fixture-qb')).toBeDisabled();
    expect(tile(f.container, 'player:fixture-rb')).toBeEnabled();
    expect(f.toggled).not.toHaveBeenCalled();
    fireEvent.click(tile(f.container, 'player:fixture-rb')!);
    expect(f.toggled).toHaveBeenCalledTimes(1);
    expect(f.toggled).toHaveBeenLastCalledWith({ kind: 'player', id: 'fixture-rb' } satisfies TradeAsset);
    expect(tile(f.container, 'player:fixture-rb')).toBeNull();
    expect(tile(f.container, 'pick:2030-1-LAB')).toHaveAttribute('aria-pressed', 'true');
    expect(tile(f.container, 'player:fixture-qb')).toBeEnabled();
    fireEvent.click(tile(f.container, 'player:fixture-qb')!);
    expect(f.toggled).toHaveBeenCalledTimes(2);
    expect(f.toggled).toHaveBeenLastCalledWith({ kind: 'player', id: 'fixture-qb' } satisfies TradeAsset);
    expect(f.proposed).not.toHaveBeenCalled(); expect(JSON.stringify(f.tiles)).toBe(f.input);
  });
  it('clears either search without unlocking blocked assets or changing a closed-window verdict', () => {
    const f = mount([], accepted, { ...openWindow, open: false, periodsLeft: 0, reason: 'The trade window is shut.' });
    const own = search('Search your trade assets', 'GM_TRADE_SEARCH_CLEAR');
    fireEvent.change(own, { target: { value: 'round' } });
    fireEvent.change(search('Search their trade assets', 'GM_TRADE_SEARCH_CLEAR'), { target: { value: 'missing' } });
    expect(tile(f.container, 'pick:2031-2-LAB')).toBeDisabled();
    expect(tile(f.container, 'pick:2031-2-LAB')).toHaveTextContent('This pick is protected.');
    expect(tile(f.container, 'player:target-qb')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clear your asset search' }));
    expect(tile(f.container, 'player:fixture-qb')).not.toBeNull();
    expect(tile(f.container, 'player:target-qb')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clear their asset search' }));
    expect(f.container.querySelectorAll('[data-gm-tile]')).toHaveLength(6);
    expect(tile(f.container, 'pick:2031-2-LAB')).toBeDisabled();
    expect(screen.getByText('The trade window is shut.', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make the trade' })).toBeDisabled();
    expect(f.toggled).not.toHaveBeenCalled(); expect(f.proposed).not.toHaveBeenCalled(); expect(JSON.stringify(f.tiles)).toBe(f.input);
  });
  it('keeps the existing selected payload and accepted proposal callback', () => {
    const f = mount(['player:fixture-rb', 'player:target-wr'], accepted);
    expect(tile(f.container, 'player:fixture-rb')).toHaveAttribute('aria-pressed', 'true');
    expect(tile(f.container, 'player:target-wr')).toHaveAttribute('aria-pressed', 'true');
    const propose = screen.getByRole('button', { name: 'Make the trade' });
    expect(propose).toBeEnabled(); fireEvent.click(propose);
    expect(f.proposed).toHaveBeenCalledTimes(1); expect(f.toggled).not.toHaveBeenCalled(); expect(JSON.stringify(f.tiles)).toBe(f.input);
  });
});
