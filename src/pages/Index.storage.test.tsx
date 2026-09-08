import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Index from './Index';
import { StreakReminder } from '@/components/game/StreakReminder';
import { getEtDateString } from '@/lib/streaks';

// Only replace account/network boundaries. The home page and its storage readers are real.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/integrations/supabase/client', () => {
  const result = Promise.resolve({ data: null, error: null, count: 0 });
  const query = new Proxy({}, { get: (_, key) => key === 'then' ? result.then.bind(result) : () => query });
  return { supabase: { from: () => query, rpc: () => result } };
});

beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('home page with blocked storage', () => {
  it.each(['length', 'key', 'getItem'] as const)('keeps the catalog and search usable when %s throws', async method => {
    localStorage.setItem('unrelated-save', '{"season":8}');
    const fail = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
    const denied = method === 'length'
      ? vi.spyOn(Storage.prototype, 'length', 'get').mockImplementation(fail)
      : vi.spyOn(Storage.prototype, method).mockImplementation(fail);
    render(<MemoryRouter><HelmetProvider><Index /></HelmetProvider></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'DoUKnowBall' })).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search games' }), { target: { value: 'Footle' } });
    await waitFor(() => expect(document.querySelector('a.home-tile[href="/footle"]')).toBeVisible());
    expect(denied).toHaveBeenCalled();
    denied.mockRestore();
    expect(localStorage.getItem('unrelated-save')).toBe('{"season":8}');
  });

  it('can dismiss an existing streak reminder when the dismissal cannot be stored', () => {
    localStorage.setItem('dukb-streaks-v1', JSON.stringify({
      version: 1, global: { current: 3, longest: 3, lastDate: getEtDateString(new Date(Date.now() - 86400000)) },
      perGame: {}, loginDates: [], totalPlays: 3, totalPoints: 10,
    }));
    const saved = localStorage.getItem('dukb-streaks-v1');
    const denied = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    const windowError = vi.fn((event: ErrorEvent) => event.preventDefault());
    window.addEventListener('error', windowError);
    render(<StreakReminder />);
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss streak reminder' }));
    } finally {
      window.removeEventListener('error', windowError);
    }
    expect(screen.queryByRole('button', { name: 'Dismiss streak reminder' })).toBeNull();
    expect(denied).toHaveBeenCalledWith('streak-reminder-dismissed', getEtDateString());
    expect(windowError).not.toHaveBeenCalled();
    expect(localStorage.getItem('dukb-streaks-v1')).toBe(saved);
  });
});
