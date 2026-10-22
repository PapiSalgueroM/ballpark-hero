import { describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { FinancesScreen } from '@/components/club-manager/FinancesScreen';
import { engineRegistrations, restoreEngineRegistrations, startCareer } from '@/lib/clubManager';
import { booksOf } from '@/lib/clubManagerFinances';

describe('the actual Club Manager shirt sales explanation', () => {
  it('explains simulated shirt sales and costs on the finance desk before advancing', () => {
    const random = Math.random;
    const now = Date.now;
    const registrations = engineRegistrations();
    let value = 1519;
    Math.random = () => {
      value = (value + 0x6d2b79f5) | 0;
      let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
    Date.now = () => Date.UTC(2026, 9, 21, 12);
    let state: ReturnType<typeof startCareer>;
    try { state = startCareer('Manchester City'); } finally {
      restoreEngineRegistrations(registrations);
      Math.random = random;
      Date.now = now;
    }
    expect(Math.random).toBe(random);
    expect(Date.now).toBe(now);
    expect(state.squad.length).toBeGreaterThan(0);
    const original = JSON.stringify(state);
    try {
      const { container } = render(<FinancesScreen
        career={state} onTickets={() => {}} onConcessions={() => {}}
        onSponsor={() => {}} onPush={() => {}}
      />);
      expect(container.querySelector('[data-finance-projection] table')).toBeInTheDocument();
      expect(container.querySelector('[data-sponsor-desk]')).toHaveTextContent('Shirt sponsor');
      expect(JSON.stringify(state)).toBe(original);
      const words = container.textContent ?? '';
      expect(words, 'SHIRT_ORIGINAL_EXPLANATION_MISSING').toMatch(/shirt sales/i);
      expect(words).toMatch(/production/i);
      expect(words).toMatch(/net/i);
      expect(words).toMatch(/pending|waiting/i);
      expect(words).toMatch(/simulated/i);
    } finally { cleanup(); }
  });
});

function financeFixture() {
  const random = Math.random;
  const now = Date.now;
  const registrations = engineRegistrations();
  let value = 1519;
  Math.random = () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  Date.now = () => Date.UTC(2026, 9, 21, 12);
  try { return startCareer('Manchester City'); } finally {
    restoreEngineRegistrations(registrations);
    Math.random = random;
    Date.now = now;
  }
}

function renderFinances(state: ReturnType<typeof startCareer>) {
  return render(<FinancesScreen career={state} onTickets={() => {}} onConcessions={() => {}}
    onSponsor={() => {}} onPush={() => {}} />);
}

describe('shirt sales figures on the actual finance desk', () => {
  it.each([
    ['GBP', '£'], ['EUR', '€'], ['USD', '$'], ['BRL', 'R$'], ['JPY', '¥'],
  ] as const)('keeps every minor amount exact in %s without paying during render', (currency, symbol) => {
    const state = financeFixture();
    state.startOptions = { v: 1, currency, nationJobs: true, strictness: 3 };
    const books = booksOf(state);
    state.books = { ...books, season: { ...books.season, weeks: 2, shirts: {
      v: 1, weeks: 2, openingPence: 123_400, grossPence: 1_800_025,
      costPence: 600_000, paidPence: 1_000_000,
    } } };
    const saved = JSON.stringify(state);
    try {
      const { container, rerender } = renderFinances(state);
      const totals = container.querySelector('[data-shirt-totals="current"]');
      expect(totals).toBeInTheDocument();
      for (const [id, amount] of [
        ['gross', '18,000.25'], ['production', '6,000.00'], ['net', '12,000.25'],
        ['paid', '10,000.00'], ['pending', '3,234.25'], ['opening', '1,234.00'],
      ]) expect(totals?.querySelector(`[data-shirt-amount="${id}"] dd`)?.textContent).toBe(`${symbol}${amount}`);
      expect(container.querySelector('[data-projection-line="shirtSales"]')?.querySelectorAll('td')[1]?.textContent).toBe(`${symbol}10k`);
      expect(container.querySelector('[data-shirt-sales]')).toHaveTextContent(`2 weeks earns ${symbol}12,000.00`);
      rerender(<FinancesScreen career={state} onTickets={() => {}} onConcessions={() => {}}
        onSponsor={() => {}} onPush={() => {}} />);
      expect(JSON.stringify(state)).toBe(saved);
    } finally { cleanup(); }
  });

  it('starts a legacy current record at zero while preserving its existing gate books', () => {
    const state = financeFixture();
    const books = booksOf(state);
    const season = { ...books.season, weeks: 6, tickets: 1.25 };
    delete season.shirts;
    state.books = { ...books, season };
    const saved = JSON.stringify(state);
    try {
      const { container } = renderFinances(state);
      const card = container.querySelector('[data-shirt-sales]');
      expect(card).toHaveTextContent(/tracking starts with the next club week/i);
      expect(card).toHaveTextContent(/no earlier shirt sales are added/i);
      expect(card?.querySelector('[data-shirt-totals="current"] [data-shirt-amount="paid"] dd')?.textContent).toBe('£0.00');
      expect(card?.querySelector('[data-shirt-amount="opening"]')).not.toBeInTheDocument();
      expect(container.querySelector('[data-projection-line="tickets"]')).toHaveTextContent('£1.3m');
      expect(JSON.stringify(state)).toBe(saved);
    } finally { cleanup(); }
  });

  it('does not turn a malformed current shirt record into made up zero totals', () => {
    const state = financeFixture();
    const books = booksOf(state);
    state.books = { ...books, season: { ...books.season, weeks: 6, tickets: 1.25, shirts: null } };
    const saved = JSON.stringify(state);
    try {
      const { container } = renderFinances(state);
      expect(container.querySelector('[data-shirt-current-unavailable]')).toHaveTextContent(/shirt sales totals are unavailable/i);
      expect(container.querySelector('[data-shirt-current-unavailable]')).toHaveTextContent(/excluding unknown shirt income/i);
      expect(container.querySelector('[data-shirt-totals="current"]')).not.toBeInTheDocument();
      expect(container.querySelector('[data-projection-line="shirtSales"]')?.querySelectorAll('td')[1]).toHaveTextContent('Unavailable');
      expect(container.querySelector('[data-projection-line="shirtSales"]')?.querySelectorAll('td')[2]).toHaveTextContent('Unavailable');
      expect(container.querySelector('[data-projection-total="income"]')).toHaveTextContent('Income (known rows)');
      expect(container.querySelector('[data-projection-total="kitty"]')).toHaveTextContent('Kitty change (known rows)');
      expect(container.querySelector('[data-projection-line="tickets"]')).toHaveTextContent('£1.3m');
      expect(JSON.stringify(state)).toBe(saved);
    } finally { cleanup(); }
  });

  it('separates saved last-season totals from current receipts', () => {
    const state = financeFixture();
    const books = booksOf(state);
    state.books = { ...books, lastSeason: {
      ...books.season, weeks: 2, shirts: { v: 1, weeks: 2, openingPence: 0,
        grossPence: 2_400_000, costPence: 800_000, paidPence: 1_000_000 },
      transferIn: 0, transferOut: 0, facilities: 0, staffFees: 0, income: 0.01, spend: 0, result: 0.01,
    } };
    try {
      const { container } = renderFinances(state);
      const last = container.querySelector('[data-shirt-totals="last"]');
      expect(last).toBeInTheDocument();
      expect(last?.querySelector('[data-shirt-amount="gross"] dd')?.textContent).toBe('£24,000.00');
      expect(last?.querySelector('[data-shirt-amount="net"] dd')?.textContent).toBe('£16,000.00');
      expect(last?.querySelector('[data-shirt-amount="paid"] dd')?.textContent).toBe('£10,000.00');
      expect(last?.querySelector('[data-shirt-amount="pending"] dd')?.textContent).toBe('£6,000.00');
      expect(container.querySelector('[data-shirt-totals="current"] [data-shirt-amount="paid"] dd')?.textContent).toBe('£0.00');
    } finally { cleanup(); }
  });

  it.each([
    ['cash limit', { v: 1, weeks: 1, openingPence: 0, grossPence: 9_007_199_254_000_000,
      costPence: 0, paidPence: 9_007_199_254_000_000 }, '£90,071,992,540,000.00', '£90072.0bn'],
    ['week limit', { v: 1, weeks: Number.MAX_SAFE_INTEGER, openingPence: 0,
      grossPence: 0, costPence: 0, paidPence: 0 }, '£0.00', '£0k'],
  ] as const)('keeps current figures when the %s makes a future estimate unsafe', (_name, shirts, gross, paid) => {
    const state = financeFixture();
    const books = booksOf(state);
    state.books = { ...books, season: { ...books.season, weeks: shirts.weeks, shirts } };
    expect(state.calendar.filter(entry => !entry.night).length).toBeGreaterThan(0);
    const saved = JSON.stringify(state);
    try {
      const { container } = renderFinances(state);
      const cells = container.querySelector('[data-projection-line="shirtSales"]')?.querySelectorAll('td');
      expect(cells?.[1]?.textContent).toBe(paid);
      expect(cells?.[2]?.textContent).toBe('Unavailable');
      expect(container.querySelector('[data-shirt-totals="current"] [data-shirt-amount="gross"] dd')?.textContent).toBe(gross);
      expect(container.querySelector('[data-shirt-totals="current"] [data-shirt-amount="pending"] dd')?.textContent).toBe('£0.00');
      expect(container.querySelector('[data-shirt-projection-unavailable]')).toHaveTextContent(/current figures are shown/i);
      expect(container.querySelector('[data-shirt-current-unavailable]')).not.toBeInTheDocument();
      expect(container.querySelector('[data-projection-total="income"]')).toHaveTextContent('Income (known rows)');
      expect(container.querySelector('[data-projection-total="kitty"]')).toHaveTextContent('Kitty change (known rows)');
      expect(JSON.stringify(state)).toBe(saved);
    } finally { cleanup(); }
  });

  it.each(['legacy', 'unavailable'] as const)('labels a %s last season without replacing the valid books', kind => {
    const state = financeFixture();
    const books = booksOf(state);
    const lastSeason = { ...books.season, weeks: 12, tickets: 1.25,
      transferIn: 0, transferOut: 0, facilities: 0, staffFees: 0, income: 1.25, spend: 0, result: 1.25 };
    if (kind === 'unavailable') lastSeason.shirts = null;
    else delete lastSeason.shirts;
    state.books = { ...books, lastSeason };
    const saved = JSON.stringify(state);
    try {
      const { container } = renderFinances(state);
      const status = container.querySelector('[data-shirt-last-status]');
      expect(status).toHaveTextContent(kind === 'legacy' ? /not recorded in this save/i : /unavailable/i);
      if (kind === 'unavailable') expect(status).toHaveTextContent(/income and result include only known rows/i);
      expect(container.querySelector('[data-shirt-totals="last"]')).not.toBeInTheDocument();
      expect(JSON.stringify(state)).toBe(saved);
    } finally { cleanup(); }
  });

  it('preserves a single penny beside a large safe whole-money amount', () => {
    const state = financeFixture();
    const books = booksOf(state);
    state.books = { ...books, season: { ...books.season, weeks: 1, shirts: {
      v: 1, weeks: 1, openingPence: 0, grossPence: 9_007_199_254_000_001,
      costPence: 0, paidPence: 9_007_199_254_000_000,
    } } };
    const saved = JSON.stringify(state);
    try {
      const { container } = renderFinances(state);
      const totals = container.querySelector('[data-shirt-totals="current"]');
      expect(totals?.querySelector('[data-shirt-amount="gross"] dd')?.textContent).toBe('£90,071,992,540,000.01');
      expect(totals?.querySelector('[data-shirt-amount="pending"] dd')?.textContent).toBe('£0.01');
      expect(JSON.stringify(state)).toBe(saved);
    } finally { cleanup(); }
  });
});
