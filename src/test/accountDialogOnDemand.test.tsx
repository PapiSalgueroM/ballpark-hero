import { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest';

type Consumer = 'header' | 'home' | 'navbar';
const auth = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), resetPasswordForEmail: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, loading: false, ...auth }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { resetPasswordForEmail: auth.resetPasswordForEmail }, from: auth.from, rpc: auth.rpc } }));
vi.mock('@/lib/authProviders', () => ({ OAUTH_PROVIDERS: { google: false, apple: false }, ANY_OAUTH_ENABLED: false }));
vi.mock('@/hooks/useStreaks', () => ({ useStreaks: () => ({ globalCurrentStreak: 0 }) }));
vi.mock('@/hooks/useMostPlayed', () => ({ useMostPlayed: () => ({ entries: [], loading: false }) }));
vi.mock('@/hooks/useGameNavbarStats', () => ({ useGameNavbarStats: () => ({ gamesPlayedToday: 0, totalPointsToday: 0, dailyRank: null, currentStreak: 0, totalGames: 0, loading: false }) }));
vi.mock('@/hooks/useDailyLegend', () => ({ useDailyLegend: () => ({ showCelebration: false, streakDays: 0, dismissCelebration: () => undefined }) }));
vi.mock('@/lib/completions', () => ({ getCurrentPlayerName: () => 'Account fixture', getLocalTodayCount: () => 0 }));
vi.mock('@/components/layout/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/components/game/SoundToggle', () => ({ SoundToggle: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/game/StreakReminder', () => ({ StreakReminder: () => null }));
vi.mock('@/components/home/FeaturedStage', () => ({ FeaturedStage: () => null }));
vi.mock('@/components/home/DailyRail', () => ({ DailyRail: () => null }));
vi.mock('@/components/home/JustShipped', () => ({ JustShipped: () => null }));
vi.mock('@/components/home/ContinueRow', () => ({ ContinueRow: () => null }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

export const caseTitles = [
  'Header leaves the account dialog unevaluated until Log In',
  'Home leaves the account dialog unevaluated until Make a free one',
  'Game navbar leaves the account dialog unevaluated until Track stats',
  'Header preserves requested tabs fields and the latest opener across reopening',
  'Home opens the real signup form and keeps validation and Close usable',
  'Game navbar keeps signup Escape navigation and saved bytes unchanged',
];
const cases: Record<string, unknown> = {};
let counts: { factoryEvaluations: number; realImports: number; renders: number; mounts: number; unmounts: number };
const stored = (store: Storage) => Object.fromEntries(Object.keys(store).sort().map(key => [key, store.getItem(key)]));
const stores = () => ({ local: stored(localStorage), session: stored(sessionStorage) });
const backend = () => Object.fromEntries(Object.entries(auth).map(([key, fn]) => [key, fn.mock.calls.length]));
const address = () => screen.getByTestId('account-address').textContent;
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
function Address() { const location = useLocation(); return <output data-testid="account-address">{location.pathname + location.search + location.hash}</output>; }
function form() {
  const dialog = screen.queryByRole('dialog');
  return { heading: dialog?.querySelector('h2')?.textContent ?? null,
    email: (screen.queryByRole('textbox', { name: 'Email' }) as HTMLInputElement | null)?.value ?? null,
    password: (screen.queryByLabelText('Password', { exact: true }) as HTMLInputElement | null)?.value ?? null,
    ageConfirmed: (screen.queryByRole('checkbox') as HTMLInputElement | null)?.checked ?? null,
    focusInside: !!dialog?.contains(document.activeElement), address: address(), stores: stores() };
}
async function mount(consumer: Consumer) {
  const Component = consumer === 'header' ? (await import('@/components/layout/Header')).Header
    : consumer === 'home' ? (await import('@/pages/Index')).default
      : (await import('@/components/game/GameNavbar')).GameNavbar;
  const entries = consumer === 'navbar' ? ['/soccer', '/club-manager?fixture=kept#round'] : ['/'];
  const view = render(<MemoryRouter initialEntries={entries}><Component /><Address /></MemoryRouter>);
  await flush(); return view;
}
function openerFor(consumer: Consumer) {
  return screen.getByRole('button', { name: consumer === 'header' ? 'Log In' : consumer === 'home' ? 'Make a free one' : /Track stats/i });
}
async function open(opener: HTMLElement, heading: string) {
  opener.focus(); fireEvent.click(opener);
  await screen.findByRole('heading', { name: heading });
  const email = await screen.findByRole('textbox', { name: 'Email' });
  await waitFor(() => expect(email).toHaveFocus());
  expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
}
async function close(opener: HTMLElement, escape = false) {
  if (escape) fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  else fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() => expect(opener).toHaveFocus());
}

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('soccerCareerSave', '{"fixture":"opaque career bytes"}');
  sessionStorage.setItem('account-fixture', 'held session bytes');
  counts = { factoryEvaluations: 0, realImports: 0, renders: 0, mounts: 0, unmounts: 0 };
  for (const fn of Object.values(auth)) fn.mockImplementation(() => { throw new Error('No account or database request is allowed in this mounted fixture'); });
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Account loading fixture must stay offline'); }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  // Count the boundary, then evaluate and render the unchanged real dialog.
  // Re-registering after resetModules gives every caller its own cold import.
  vi.doMock('@/components/auth/AuthModal', async () => {
    counts.factoryEvaluations++;
    const actual = await vi.importActual<typeof import('@/components/auth/AuthModal')>('@/components/auth/AuthModal');
    counts.realImports++;
    return { ...actual, AuthModal: (props: Parameters<typeof actual.AuthModal>[0]) => {
      counts.renders++;
      useEffect(() => { counts.mounts++; return () => { counts.unmounts++; }; }, []);
      return <actual.AuthModal {...props} />;
    } };
  });
});
afterEach(() => {
  cleanup();
  for (const fn of Object.values(auth)) expect(fn).not.toHaveBeenCalled();
  expect(globalThis.fetch).not.toHaveBeenCalled();
  vi.doUnmock('@/components/auth/AuthModal'); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
afterAll(async () => {
  if (!process.env.ACCOUNT_DIALOG_RAW) return;
  const { writeFile } = await import('node:fs/promises');
  await writeFile(process.env.ACCOUNT_DIALOG_RAW, JSON.stringify({ version: 1, caseTitles, cases }, null, 2) + '\n', { flag: 'wx' });
});

const targets = [
  { consumer: 'header', key: 'headerDeferred', title: caseTitles[0], cause: 'Closed Header must not initialize AuthModal', heading: 'Welcome Back!' },
  { consumer: 'home', key: 'homeDeferred', title: caseTitles[1], cause: 'Closed Home must not initialize AuthModal', heading: 'Join DoUKnowBall' },
  { consumer: 'navbar', key: 'navbarDeferred', title: caseTitles[2], cause: 'Closed game navbar must not initialize AuthModal', heading: 'Join DoUKnowBall' },
] as const;
for (const target of targets) it(target.title, async () => {
  const before = stores(); await mount(target.consumer);
  const initial = { ...counts, dialogPresent: !!screen.queryByRole('dialog'), address: address(), stores: stores() };
  const opener = openerFor(target.consumer); await open(opener, target.heading);
  const opened = { ...counts, form: form() };
  await close(opener);
  const closed = { ...counts, dialogPresent: !!screen.queryByRole('dialog'), openerFocused: document.activeElement === opener, stores: stores() };
  cases[target.key] = { title: target.title, consumer: target.consumer, before, initial, opened, closed, backend: backend() };
  expect(initial.dialogPresent).toBe(false);
  expect(opened.factoryEvaluations).toBe(1); expect(opened.realImports).toBe(1); expect(opened.mounts).toBe(1);
  expect(opened.form.heading).toBe(target.heading); expect(closed.openerFocused).toBe(true);
  expect(stores()).toEqual(before);
  expect(initial.factoryEvaluations === 0 && initial.realImports === 0 && initial.mounts === 0, target.cause).toBe(true);
});

it(caseTitles[3], async () => {
  const before = stores(); await mount('header');
  const login = screen.getByRole('button', { name: 'Log In' });
  const signup = screen.getByRole('button', { name: 'Sign Up' });
  await open(login, 'Welcome Back!');
  fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'fixture@example.invalid' } });
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'held-password' } });
  const first = form(); await close(login, true);
  await open(signup, 'Join DoUKnowBall');
  expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('fixture@example.invalid');
  expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('held-password');
  fireEvent.click(screen.getByRole('checkbox')); const second = form(); await close(signup);
  await open(login, 'Welcome Back!'); const third = form();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument(); await close(login);
  await open(signup, 'Join DoUKnowBall'); const fourth = form();
  const beforeFinalClose = { mounts: counts.mounts, unmounts: counts.unmounts, realImports: counts.realImports };
  await close(signup, true);
  cases.headerLifetime = { title: caseTitles[3], first, second, third, fourth, beforeFinalClose,
    latestOpenerFocused: document.activeElement === signup, loginConnected: login.isConnected, signupConnected: signup.isConnected, before, after: stores(), backend: backend() };
  expect(third.email).toBe(first.email); expect(third.password).toBe(first.password);
  expect(fourth.email).toBe(first.email); expect(fourth.password).toBe(first.password); expect(fourth.ageConfirmed).toBe(true);
  expect(beforeFinalClose).toEqual({ mounts: 1, unmounts: 0, realImports: 1 }); expect(stores()).toEqual(before);
});

it(caseTitles[4], async () => {
  const before = stores(); await mount('home'); const opener = openerFor('home');
  await open(opener, 'Join DoUKnowBall'); const opened = form();
  fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
  const validation = { emailInvalid: screen.getByRole('textbox', { name: 'Email' }).getAttribute('aria-invalid'),
    passwordInvalid: screen.getByLabelText('Password', { exact: true }).getAttribute('aria-invalid'),
    emailMessage: screen.getByText('Email is required').textContent?.trim(), passwordMessage: screen.getByText('Password is required').textContent?.trim() };
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByRole('heading', { name: 'Welcome Back!' })).toBeInTheDocument();
  const login = form(); await close(opener);
  cases.homeForm = { title: caseTitles[4], opened, validation, login, openerFocused: document.activeElement === opener, before, after: stores(), backend: backend() };
  expect(validation).toEqual({ emailInvalid: 'true', passwordInvalid: 'true', emailMessage: 'Email is required', passwordMessage: 'Password is required' });
  expect(stores()).toEqual(before);
});

it(caseTitles[5], async () => {
  const before = stores(); await mount('navbar'); const opener = openerFor('navbar');
  const initialAddress = address(); await open(opener, 'Join DoUKnowBall'); const opened = form();
  await close(opener, true); const afterEscape = { openerFocused: document.activeElement === opener, address: address(), stores: stores() };
  fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
  cases.navbarNavigation = { title: caseTitles[5], initialAddress, opened, afterEscape, afterBack: address(), before, after: stores(), backend: backend() };
  expect(initialAddress).toBe('/club-manager?fixture=kept#round'); expect(afterEscape.address).toBe(initialAddress);
  expect(address()).toBe('/soccer'); expect(stores()).toEqual(before);
});
