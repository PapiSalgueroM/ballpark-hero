import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

/* The actual page, hook, formation pitch and spinner run. Only external IO,
 * completion and non-game shell wrappers are fixtures. No future API import. */
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://offline.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key',
  supabase: { from() { throw new Error('Unexpected database read in formation setup'); } },
}));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ title, headerExtra, children }: { title: string; headerExtra?: ReactNode; children: ReactNode }) =>
    <main><h1>{title}</h1>{headerExtra}{children}</main>,
}));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));

import LineupBuilder from '@/pages/LineupBuilder';

function formationButtons() {
  const labels = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '3-4-3', '5-3-2'];
  expect(screen.getByRole('heading', { name: 'Choose Your Formation' })).toBeVisible();
  return labels.map(label => screen.getByRole('button', {
    name: new RegExp('^' + label + '\\s*11 players$'),
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('lineup-rules-seen', '1');
  localStorage.setItem('cookie-consent', 'essential');
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Unexpected fetch in formation setup'); }));
});
afterEach(() => {
  cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Build Your XI club year setup', () => {
  it('keeps the mixed draft and six formations available', () => {
    render(<LineupBuilder />);
    /* Release BT: the page opens on Mixed, so a player who never touches the
       new choice plays the game exactly as before. */
    expect(screen.getByRole('button', { name: 'Mixed' }), 'XI_SETUP_MIXED_DEFAULT: Mixed is pressed on load')
      .toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Club year draft' }), 'XI_SETUP_MIXED_DEFAULT: Club year is not')
      .toHaveAttribute('aria-pressed', 'false');
    const buttons = formationButtons();
    expect(buttons).toHaveLength(6);
    expect(buttons.every(button => !button.hasAttribute('disabled'))).toBe(true);
    fireEvent.click(buttons[1]);
    expect(screen.getByText('0/11', { exact: true })).toBeVisible();
    const roles = /^(GK|LB|CB|RB|LM|CM|RM|ST)$/;
    const slots = screen.getAllByRole('button').filter(button =>
      roles.test(button.firstElementChild?.textContent?.trim() ?? ''));
    expect(slots).toHaveLength(11);
    expect(slots.every(button => !button.hasAttribute('disabled'))).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('offers a recorded year club draft before formation', () => {
    render(<LineupBuilder />);
    expect(formationButtons()).toHaveLength(6);
    expect(screen.queryAllByRole('button', { name: 'Club year draft' }).length,
      'XI_CLUB_YEAR_SETUP: recorded year choice').toBe(1);
  });
});

