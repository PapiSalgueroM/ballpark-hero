import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancesScreen } from '@/components/club-manager/FinancesScreen';
import {
  engineRegistrations, gatePricePerFan, moneyIn, restoreEngineRegistrations, startCareer,
} from '@/lib/clubManager';
import { concessionPerFan, projectFinances, ticketPerFan } from '@/lib/clubManagerFinances';
import { currencySymbol, defaultStartOptions, type CurrencyCode } from '@/lib/clubManagerStart';

let registrations: ReturnType<typeof engineRegistrations>;
beforeEach(() => { registrations = engineRegistrations(); localStorage.clear(); });
afterEach(() => {
  cleanup();
  restoreEngineRegistrations(registrations);
  vi.restoreAllMocks();
  localStorage.clear();
});

function financeFixture(currency: CurrencyCode | undefined) {
  const random = Math.random, now = Date.now;
  let seed = 1519;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  Date.now = () => Date.UTC(2026, 10, 3, 12);
  try {
    // Fictional custom-club fixture, built by the existing engine. No sports data is edited.
    const career = startCareer('Currency Label Lab', 'now', {
      name: 'Currency Label Lab', leagueId: 'premier', stadium: 'Lab Ground',
      budgetTier: 'small', quality: 72, replacedClub: '',
      crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'CL' },
    });
    if (currency) career.startOptions = { ...defaultStartOptions(), currency };
    else delete career.startOptions;
    return career;
  } finally {
    Math.random = random;
    Date.now = now;
  }
}

const cases = [
  ['GBP', 'GBP', '£'], ['EUR', 'EUR', '€'], ['USD', 'USD', '$'],
  ['BRL', 'BRL', 'R$'], ['JPY', 'JPY', '¥'], ['legacy default', undefined, '£'],
] as const;

describe('Club Manager finance pricing currency', () => {
  it.each(cases)('shows all three per-fan quotes in %s without converting their values', (label, currency, symbol) => {
    const career = financeFixture(currency);
    expect(career.clubName, 'CM_FINANCE_CURRENCY_SETUP_FICTIONAL_CLUB').toBe('Currency Label Lab');
    expect(career.squad.length, 'CM_FINANCE_CURRENCY_SETUP_REAL_CUSTOM_SQUAD').toBeGreaterThan(0);
    const before = JSON.stringify(career);
    const expectedAmounts = [ticketPerFan(career), concessionPerFan(career), gatePricePerFan(career)];
    const projectionBefore = projectFinances(career);
    const onTickets = vi.fn(), onConcessions = vi.fn(), onSponsor = vi.fn(), onPush = vi.fn();
    const view = render(<FinancesScreen career={career} onTickets={onTickets} onConcessions={onConcessions}
      onSponsor={onSponsor} onPush={onPush} />);

    // Read all three actual paragraphs before any currency assertion can stop this case.
    const quoteTexts = [
      view.getByText(/^Tickets about /).textContent!,
      view.getByText(/^Food and drink about /).textContent!,
      view.getByText(/^Every home crowd pays the kitty:/).textContent!,
    ];
    const quotes = quoteTexts.map(text => {
      const match = text.match(/about (R\$|[£€$¥])(\d+(?:\.\d+)?)/);
      return { text, symbol: match?.[1] ?? null, amount: match ? Number(match[2]) : null };
    });
    const kittyLabel = within(view.container.querySelector<HTMLElement>('[data-finance-books]')!)
      .getByText('Transfer kitty', { exact: true });
    const kittyText = kittyLabel.previousElementSibling?.textContent ?? null;
    const pricing = view.container.querySelector<HTMLElement>('[data-pricing-desk]')!;
    const buttons = Array.from(pricing.querySelectorAll<HTMLButtonElement>('button'));
    for (const button of buttons) fireEvent.click(button);

    const receipt = {
      case: label, fixture: 'Existing engine custom-club builder, fictional Currency Label Lab',
      selectedCurrency: career.startOptions?.currency ?? null, expectedSymbol: symbol,
      quoteTexts, quotes, expectedAmounts, kittyText, expectedKitty: moneyIn(career)(career.budget),
      callbacks: { tickets: onTickets.mock.calls, concessions: onConcessions.mock.calls,
        sponsor: onSponsor.mock.calls, push: onPush.mock.calls },
      inputUnchanged: JSON.stringify(career) === before,
    };
    const output = process.env.CM_CURRENCY_LABELS_RAW;
    if (output) {
      fs.mkdirSync(path.resolve(output), { recursive: true });
      fs.writeFileSync(path.join(path.resolve(output), (currency ?? 'legacy') + '.json'),
        JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    }
    console.log('CM_FINANCE_CURRENCY_QUOTES ' + JSON.stringify(receipt));

    expect(currencySymbol(career), 'CM_FINANCE_CURRENCY_SETUP_SELECTED_SYMBOL').toBe(symbol);
    expect(kittyText, 'CM_FINANCE_CURRENCY_EXISTING_TOTAL_FORMAT').toBe(moneyIn(career)(career.budget));
    expect(kittyText?.startsWith(symbol), 'CM_FINANCE_CURRENCY_EXISTING_TOTAL_SYMBOL').toBe(true);
    expect(quotes.map(quote => quote.amount), 'CM_FINANCE_CURRENCY_NUMBERS_UNCHANGED').toEqual(expectedAmounts);
    expect(buttons).toHaveLength(6);
    expect(onTickets.mock.calls).toEqual([[0], [1], [2]]);
    expect(onConcessions.mock.calls).toEqual([[0], [1], [2]]);
    expect(onSponsor).not.toHaveBeenCalled();
    expect(onPush).not.toHaveBeenCalled();
    expect(projectFinances(career)).toEqual(projectionBefore);
    expect(JSON.stringify(career)).toBe(before);
    expect(quotes.map(quote => quote.symbol), 'CM_FINANCE_CURRENCY_ALL_THREE_' + (currency ?? 'LEGACY'))
      .toEqual([symbol, symbol, symbol]);
  });
});
