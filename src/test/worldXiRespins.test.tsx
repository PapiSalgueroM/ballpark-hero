/**
 * Round 743: the respin picker on World XI's setup screen sets the budget the
 * draw starts with.
 *
 * The report (2026-09-29, /world-xi): "I try adding 10 spins but it stays at 3
 * spins". The start callback read respinBudget through a stale closure: it was
 * memoised on data, formation and timerMode only, so picking 10 after the pool
 * loaded left the callback that ran on "Draw my 11 nations" holding the 3 it
 * was created with. Every pick on that screen other than the default was
 * ignored, and the picker had been shipped that way since Round 319.
 *
 * The page is the REAL page. Only the pool fetch (a network read), the
 * recorder, the ad slot, the SEO block and the share row are stubbed, each as
 * a stand in that renders nothing the test reads. Negative control: put the
 * dependency array back to [data, formation, timerMode] in
 * src/pages/WorldXi.tsx and the first test must fail on "(10 left)".
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import type { Position } from '@/types/game';

const H = vi.hoisted(() => {
  const POSITIONS = ['GK', 'CB', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST', 'CF'];
  const COUNTRIES = [
    'Argentina', 'Belgium', 'Brazil', 'Colombia', 'Croatia', 'England', 'France', 'Germany',
    'Italy', 'Japan', 'Mexico', 'Morocco', 'Netherlands', 'Portugal', 'Spain', 'Uruguay',
  ];
  /* Sixteen nations, each able to fill every slot of every formation, so the
     draw never fails and the test is about the respin count alone. */
  const pool = () => {
    const players: unknown[] = [];
    const byCountry = new Map<string, unknown[]>();
    for (const country of COUNTRIES) {
      const list = POSITIONS.map((position, i) => ({
        name: `${country} ${position} ${i + 1}`,
        country,
        position,
        club: 'Test FC',
        value: 1_000_000 * (30 - i),
        age: 25,
      }));
      players.push(...list);
      byCountry.set(country, list);
    }
    return { players, byCountry, countries: [...COUNTRIES] };
  };
  return { pool };
});

vi.mock('@/lib/worldXi', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchWorldXiPool: () => Promise.resolve(H.pool()),
}));
vi.mock('@/lib/completions', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined, loading: false }),
}));
vi.mock('sonner', () => {
  const toast = Object.assign(() => undefined, { success: () => undefined, error: () => undefined, info: () => undefined, message: () => undefined });
  return { toast, Toaster: () => null };
});
vi.mock('@/integrations/supabase/client', () => {
  const chain = (table: string): unknown => new Proxy(() => undefined, {
    get(_t, prop) {
      if (prop === 'then') {
        return (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null, count: 0 }).then(ok, bad);
      }
      if (typeof prop === 'symbol') return undefined;
      return () => chain(table);
    },
    apply() { return chain(table); },
  });
  const supabase = {
    from: (table: string) => chain(table),
    rpc: () => chain('rpc'),
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      getUser: () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => undefined,
  };
  return { supabase, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' };
});
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));

import WorldXi from '@/pages/WorldXi';

const mount = (el: JSX.Element) => render(<HelmetProvider><MemoryRouter>{el}</MemoryRouter></HelmetProvider>);
const buttonExactly = (root: HTMLElement, text: string) =>
  Array.from(root.querySelectorAll('button')).find(b => (b.textContent ?? '').trim() === text) as HTMLButtonElement | undefined;
const buttonWith = (root: HTMLElement, text: string) =>
  Array.from(root.querySelectorAll('button')).find(b => (b.textContent ?? '').includes(text)) as HTMLButtonElement | undefined;

afterEach(() => cleanup());

async function drawWith(pick: string | null) {
  const view = mount(<WorldXi />);
  await view.findByText('Draw my 11 nations');
  if (pick !== null) {
    const chip = buttonExactly(view.container, pick);
    if (!chip) throw new Error(`no respin chip labelled ${pick}`);
    fireEvent.click(chip);
  }
  const draw = buttonWith(view.container, 'Draw my 11 nations');
  if (!draw) throw new Error('no draw button');
  fireEvent.click(draw);
  const respin = await view.findByText(/Respin nation \(\d+ left\)/);
  return { view, text: (respin.textContent ?? '').trim() };
}

describe('World XI respin budget (Round 743)', () => {
  it('a pick of 10 on the setup screen starts the game with 10 respins', async () => {
    const { text } = await drawWith('10');
    expect(text).toContain('(10 left)');
  });

  it('a pick of None starts the game with no respins', async () => {
    const { text } = await drawWith('None');
    expect(text).toContain('(0 left)');
  });

  it('three stays the default when nothing is picked', async () => {
    const { text } = await drawWith(null);
    expect(text).toContain('(3 left)');
  });
});
// Position is imported for the reader: the stand in pool uses its values.
export type _RespinTestPosition = Position;
