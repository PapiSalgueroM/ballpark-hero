import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import App from '@/App';
import { toast } from '@/hooks/use-toast';

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: null, profile: null, loading: false }),
}));
vi.mock('@/components/layout/LiveTicker', () => ({ default: () => null }));
vi.mock('@/components/layout/Header', () => ({ Header: () => null }));
vi.mock('@/components/layout/SiteMenu', () => ({ SiteMenu: () => null }));
vi.mock('@/components/layout/UpdateNudge', () => ({ UpdateNudge: () => null }));
vi.mock('@/components/CookieConsent', () => ({ CookieConsent: () => null }));
vi.mock('@/components/game/Footer', () => ({ Footer: () => null }));
vi.mock('@/pages/Index', () => ({ default: () => <h1>Home fixture</h1> }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: async () => ({ data: null, error: null }) } },
}));

function navigate(path: string) {
  act(() => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

beforeEach(() => { vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
});

it('loads Fantasy Draft notifications on its first visit and retains an open toast across navigation', async () => {
  render(<HelmetProvider><App /></HelmetProvider>);
  await screen.findByRole('heading', { name: 'Home fixture' });
  expect(screen.queryByRole('region', { name: 'Notifications (F8)' })).toBeNull();

  navigate('/Fantasy-Draft/');
  await screen.findByRole('button', { name: 'Start Draft' }, { timeout: 5000 });
  await screen.findByRole('region', { name: 'Notifications (F8)' });
  const notification = 'Fantasy Draft notification fixture';
  act(() => { toast({ title: notification, duration: 30_000 }); });
  const shown = await screen.findByText(notification, { selector: '[data-state] *' });

  navigate('/');
  await screen.findByRole('heading', { name: 'Home fixture' });
  expect(shown).toBeVisible();
  expect(screen.getAllByRole('region', { name: 'Notifications (F8)' })).toHaveLength(1);
});
