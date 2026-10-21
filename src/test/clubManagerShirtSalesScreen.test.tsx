import { describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { FinancesScreen } from '@/components/club-manager/FinancesScreen';
import { engineRegistrations, restoreEngineRegistrations, startCareer } from '@/lib/clubManager';

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
