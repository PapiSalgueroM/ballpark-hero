/**
 * Release BS fix BS-sc419-3: while a job approach waits on Accept or Stay, the manager bar's Retire is off
 * as well as Next Manager Season, so a career cannot end with "Decision pending." frozen into its record.
 * The real page, mounted on the PR's own pending save (helpers/managerJobReviewFixtures), and on the same
 * manager with no decision waiting as the control.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

vi.mock('@/lib/completions', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined, loading: false }),
}));
vi.mock('sonner', () => {
  const toast = Object.assign(() => undefined, { success: () => undefined, error: () => undefined, info: () => undefined, message: () => undefined });
  return { toast, Toaster: () => null };
});
vi.mock('@/integrations/supabase/client', () => {
  const chain = (): unknown => new Proxy(() => undefined, {
    get(_t, prop) {
      if (prop === 'then') {
        return (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null, count: 0 }).then(ok, bad);
      }
      if (typeof prop === 'symbol') return undefined;
      return () => chain();
    },
    apply() { return chain(); },
  });
  const supabase = {
    from: () => chain(),
    rpc: () => chain(),
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
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));

import { serializeSoccerCareerSave } from '@/lib/soccerCareerSave';
import { setManagerJobReview } from '@/lib/soccerCareerManagerJobReview';
import * as E from '@/lib/soccerCareerEngine';
import type { CareerState } from '@/lib/soccerCareerEngine';
import SoccerCareer from '@/pages/SoccerCareer';
import { manager, pending } from './helpers/managerJobReviewFixtures';

const tick = (ms = 5) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
afterEach(() => { cleanup(); localStorage.clear(); });
async function bar(save: CareerState) {
  localStorage.setItem('soccerCareerSave', serializeSoccerCareerSave(save));
  const v = render(<HelmetProvider><MemoryRouter><SoccerCareer /></MemoryRouter></HelmetProvider>);
  await tick(80);
  const buttons = [...v.container.querySelectorAll('[data-career-action-bar] button')] as HTMLButtonElement[];
  const named = (text: string) => buttons.find(b => (b.textContent ?? '').includes(text));
  return { next: named('Next Manager Season'), retire: named('Retire') };
}

describe('Retire waits for a pending job decision', () => {
  it('both bar buttons are off while the approach waits, both on without one', async () => {
    const waiting = await bar(pending());
    expect(waiting.next?.disabled).toBe(true);
    expect(waiting.retire, 'the bar shows Retire').toBeDefined();
    expect(waiting.retire!.disabled).toBe(true);
    cleanup(); localStorage.clear();
    const free = await bar(setManagerJobReview(manager(), E.FALLBACK_CLUBS, true));
    expect(free.next?.disabled).toBe(false);
    expect(free.retire?.disabled).toBe(false);
  }, 120000);
});
