import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import App from '@/App';

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
vi.mock('@/pages/SoccerCareerEntry', async () => {
  const { useLocation } = await import('react-router-dom');
  return { default: function FixtureCareer() {
    const { search } = useLocation();
    if (search === '?slot=2') throw new Error('Test slot failure');
    return <h1>Healthy career</h1>;
  } };
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
});

it('clears the route error boundary when browser history opens another Soccer Career slot', async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  window.history.replaceState({}, '', '/soccer-career?slot=3');
  render(<HelmetProvider><App /></HelmetProvider>);
  expect(await screen.findByRole('heading', { name: 'Healthy career' })).toBeVisible();
  act(() => {
    window.history.pushState({}, '', '/soccer-career?slot=2');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  expect(await screen.findByRole('heading', { name: 'This page broke' })).toBeVisible();
  await act(async () => { window.history.back(); });
  expect(await screen.findByRole('heading', { name: 'Healthy career' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'This page broke' })).toBeNull();
});
