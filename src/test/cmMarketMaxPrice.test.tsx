import { cleanup, fireEvent, render, type RenderResult } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TransferScreen } from '@/components/club-manager/TransferScreen';
import { marketForScreen, moneyIn, startCareer, type CareerState, type MarketPlayer } from '@/lib/clubManager';
import { setStartOption, type CurrencyCode } from '@/lib/clubManagerStart';

// Source-only baseline: real career, market pricing and screen, with no future API imports.
// Market props are subsets of actual engine rows; prices, values and identities are not rewritten.
const noop = () => {};
const noSave = () => { throw new Error('CM_MAX_ASK_UNEXPECTED_CAREER_WRITE'); };

function fixture() {
  const career = startCareer('Brentford');
  expect(career.transferWindow, 'CM_MAX_ASK_SETUP_OPEN_WINDOW').not.toBeNull();
  const pool = marketForScreen(career).filter(p => !p.generated && Number.isFinite(p.price) && p.price > 0);
  expect(pool.length, 'CM_MAX_ASK_SETUP_REAL_MARKET').toBeGreaterThan(100);
  return { career, pool };
}

function pick(pool: MarketPlayer[], predicate: (p: MarketPlayer) => boolean, marker: string) {
  const player = pool.find(predicate);
  expect(player, `CM_MAX_ASK_SETUP_${marker}`).toBeDefined();
  return player!;
}

function bands(pool: MarketPlayer[]) {
  return {
    cheap: pick(pool, p => p.price < 10, 'BELOW_TEN'),
    middle: pick(pool, p => p.price > 10 && p.price < 25, 'TEN_TO_TWENTY_FIVE'),
    high: pick(pool, p => p.price > 25 && p.price < 60, 'TWENTY_FIVE_TO_SIXTY'),
    top: pick(pool, p => p.price > 60, 'ABOVE_SIXTY'),
  };
}

function mount(career: CareerState, market: MarketPlayer[]) {
  const careerBefore = JSON.stringify(career);
  const marketBefore = JSON.stringify(market);
  const talk = vi.fn();
  const view = render(<TransferScreen
    career={career} market={market} onNegotiate={talk}
    onOffer={noop} onWalk={noop} onDismissNegotiation={noop}
    onClause={noop} onLoan={noop} onAcceptBid={noop} onRejectBid={noop}
    onSetStatus={noop} onLoanOut={noop} onProposeTerms={noop} onBuyLoanee={noop}
    onEndLoanEarly={noop} onRecallLoanee={noop}
    onCommitRecruitment={noSave} onCommitLoanPlan={noSave}
  />);
  expect(view.getByRole('button', { name: 'Buy' })).toBeVisible();
  expect(view.getByRole('combobox', { name: 'Price range' })).toHaveValue('any');
  expect(view.getByRole('combobox', { name: 'Sort players' })).toHaveValue('rating');
  expect(view.getByRole('textbox', { name: 'Search player or club' })).toHaveValue('');
  expect(view.getByRole('button', { name: 'Shortlist' })).toBeVisible();
  return {
    ...view,
    talk,
    unchanged: () => {
      expect(JSON.stringify(career), 'CM_MAX_ASK_CAREER_READ_ONLY').toBe(careerBefore);
      expect(JSON.stringify(market), 'CM_MAX_ASK_MARKET_READ_ONLY').toBe(marketBefore);
    },
  };
}

function listed(view: RenderResult, ...players: MarketPlayer[]) {
  for (const player of players) expect(view.getByText(player.name, { exact: true })).toBeVisible();
}

function absent(view: RenderResult, ...players: MarketPlayer[]) {
  for (const player of players) expect(view.queryByText(player.name, { exact: true })).toBeNull();
}

function ceiling(view: RenderResult, marker: string, symbol = '£') {
  const input = view.queryByRole('textbox', { name: `Maximum asking price (${symbol}m)` });
  expect(input, marker).not.toBeNull();
  return input as HTMLInputElement;
}

beforeEach(() => {
  localStorage.clear();
  let seed = 20261030;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('Club Manager exact maximum asking price', () => {
  it('keeps existing price presets and the default Buy results unchanged', () => {
    const { career, pool } = fixture();
    const { cheap, middle, high, top } = bands(pool);
    const app = mount(career, [middle, top, cheap, high]);
    listed(app, cheap, middle, high, top);
    const preset = app.getByRole('combobox', { name: 'Price range' });
    fireEvent.change(preset, { target: { value: 'p10' } });
    listed(app, cheap); absent(app, middle, high, top);
    fireEvent.change(preset, { target: { value: 'p25' } });
    listed(app, cheap, middle); absent(app, high, top);
    fireEvent.change(preset, { target: { value: 'p60' } });
    listed(app, cheap, middle, high); absent(app, top);
    fireEvent.change(preset, { target: { value: 'any' } });
    listed(app, cheap, middle, high, top);
    fireEvent.change(app.getByRole('combobox', { name: 'Sort players' }), { target: { value: 'cheap' } });
    expect(app.getAllByRole('button', { name: /^Talk ·/ })[0]).toHaveTextContent(moneyIn(career)(cheap.price));
    fireEvent.change(app.getByRole('textbox', { name: 'Search player or club' }), { target: { value: middle.name } });
    listed(app, middle); absent(app, cheap, high, top);
    fireEvent.click(app.getByRole('button', { name: /^Talk ·/ }));
    expect(app.talk.mock.calls).toEqual([[middle]]);
    app.unchanged();
  });

  it('includes the exact asking-price boundary and excludes the next higher ask', () => {
    const { career, pool } = fixture();
    const boundary = pick(pool, p => p.price > 10 && p.price < 25, 'EXACT_BOUNDARY');
    const below = pick(pool, p => p.price < boundary.price, 'BELOW_BOUNDARY');
    const above = [...pool].filter(p => p.price > boundary.price).sort((a, b) => a.price - b.price)[0];
    expect(above, 'CM_MAX_ASK_SETUP_NEXT_HIGHER_ASK').toBeDefined();
    const app = mount(career, [above, boundary, below]);
    listed(app, above, boundary, below);
    const input = ceiling(app, 'CM_MAX_ASK_BOUNDARY_CONTROL_MISSING');
    input.focus();
    fireEvent.change(input, { target: { value: String(boundary.price) } });
    listed(app, boundary, below); absent(app, above);
    expect(app.getByRole('textbox', { name: 'Maximum asking price (£m)' })).toBe(input);
    expect(document.activeElement).toBe(input);
    fireEvent.click(app.getByRole('button', { name: `Talk · ${moneyIn(career)(boundary.price)}` }));
    expect(app.talk.mock.calls).toEqual([[boundary]]);
    app.unchanged();
  });

  it('filters public asking prices without using stored market values', () => {
    const { career, pool } = fixture();
    const premium = pick(pool, p => typeof p.value === 'number' && p.value > 0.5 && p.price > p.value, 'ASK_ABOVE_VALUE');
    const discount = pick(pool, p => typeof p.value === 'number' && p.value > p.price, 'ASK_BELOW_VALUE');
    const below = pick(pool, p => p.price < Math.min(premium.value!, discount.price), 'BELOW_BOTH_PUBLIC_CAPS');
    const app = mount(career, [premium, discount, below]);
    listed(app, premium, discount, below);
    const input = ceiling(app, 'CM_MAX_ASK_PUBLIC_CONTROL_MISSING');
    fireEvent.change(input, { target: { value: String(premium.value) } });
    listed(app, below); absent(app, premium);
    fireEvent.change(input, { target: { value: String(discount.price) } });
    listed(app, below, discount);
    expect(app.talk).not.toHaveBeenCalled();
    app.unchanged();
  });

  it('applies the asking-price ceiling before the fifty-result limit', () => {
    const { career, pool } = fixture();
    const target = [...pool].sort((a, b) => a.price - b.price || a.rating - b.rating)[0];
    const leaders = pool.filter(p => p.price > target.price && p.rating > target.rating).slice(0, 50);
    expect(leaders, 'CM_MAX_ASK_SETUP_FIFTY_HIGHER_RATED_EXPENSIVE_ROWS').toHaveLength(50);
    const app = mount(career, [...leaders, target]);
    expect(app.getAllByRole('button', { name: /^Talk ·/ })).toHaveLength(50);
    absent(app, target);
    const input = ceiling(app, 'CM_MAX_ASK_SLICE_CONTROL_MISSING');
    fireEvent.change(input, { target: { value: String(target.price) } });
    listed(app, target); absent(app, ...leaders);
    expect(app.getAllByRole('button', { name: /^Talk ·/ })).toHaveLength(1);
    app.unchanged();
  });

  it('clears the custom ceiling and keeps preset shortcuts usable', () => {
    const { career, pool } = fixture();
    const { cheap, middle, high, top } = bands(pool);
    const app = mount(career, [cheap, middle, high, top]);
    listed(app, cheap, middle, high, top);
    const preset = app.getByRole('combobox', { name: 'Price range' });
    fireEvent.change(preset, { target: { value: 'p10' } });
    listed(app, cheap); absent(app, middle, high, top);
    const input = ceiling(app, 'CM_MAX_ASK_CLEAR_CONTROL_MISSING');
    fireEvent.change(input, { target: { value: String(middle.price) } });
    expect(preset).toHaveValue('any');
    listed(app, cheap, middle); absent(app, high, top);
    fireEvent.change(input, { target: { value: '' } });
    listed(app, cheap, middle, high, top);
    fireEvent.change(input, { target: { value: String(high.price) } });
    fireEvent.change(preset, { target: { value: 'p10' } });
    expect(input).toHaveValue('');
    listed(app, cheap); absent(app, middle, high, top);
    app.unchanged();
  });

  it('rejects malformed ceilings without silently parsing a partial number', () => {
    const { career, pool } = fixture();
    const { cheap, middle, high, top } = bands(pool);
    const app = mount(career, [cheap, middle, high, top]);
    listed(app, cheap, middle, high, top);
    const input = ceiling(app, 'CM_MAX_ASK_INVALID_CONTROL_MISSING');
    fireEvent.change(input, { target: { value: String(middle.price) } });
    listed(app, cheap, middle); absent(app, high, top);
    for (const invalid of ['12oops', '-1', 'Infinity', '1e3', '1.2.3']) {
      fireEvent.change(input, { target: { value: invalid } });
      expect(input).toHaveValue(invalid);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      listed(app, cheap, middle, high, top);
    }
    fireEvent.change(input, { target: { value: '0' } });
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    absent(app, cheap, middle, high, top);
    expect(app.getByText('No players match your search.')).toBeVisible();
    fireEvent.change(input, { target: { value: String(middle.price) } });
    listed(app, cheap, middle); absent(app, high, top);
    app.unchanged();
  });

  it('uses each selected currency symbol without converting the asking-price amount', () => {
    const { career, pool } = fixture();
    const { cheap, middle, high } = bands(pool);
    const currencies: Array<[CurrencyCode, string]> = [['GBP', '£'], ['EUR', '€'], ['USD', '$'], ['BRL', 'R$'], ['JPY', '¥']];
    for (const [code, symbol] of currencies) {
      const current = code === 'GBP' ? career : setStartOption(career, 'currency', code);
      expect(current, 'CM_MAX_ASK_SETUP_DISPLAY_CURRENCY').not.toBeNull();
      const app = mount(current!, [cheap, middle, high]);
      listed(app, cheap, middle, high);
      const input = ceiling(app, 'CM_MAX_ASK_CURRENCY_CONTROL_MISSING', symbol);
      fireEvent.change(input, { target: { value: String(middle.price) } });
      listed(app, cheap, middle); absent(app, high);
      expect(app.getByRole('button', { name: `Talk · ${moneyIn(current!)(middle.price)}` })).toBeVisible();
      expect(input).toHaveValue(String(middle.price));
      app.unchanged();
      cleanup();
    }
  });
});
