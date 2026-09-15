/* Round 610: players who joined with Google can get back in while Google sign
   in is paused.

   THE RISK. Round 509 hid the Google button. An account made with Google has
   no password, so when its session ends the only way back in is Forgot
   password, and nothing on the site said so. On 2026-09-15 the live auth tables
   held 244 of these accounts, none had ever asked for a reset link, and none
   had signed in fresh since 2026-09-08.

   HOW. The real sign in modal, header and reset page, rendered in jsdom with
   the auth client mocked at its boundary. The Google flag is a mutable mock, so
   the same file proves the help appears while Google is paused and disappears
   the day it returns.

   The wrapper is scripts/simGoogleOnlyReturn.mjs; its negative controls point
   the GOOGLE_PAUSED_* variables below at broken copies. */
import { configure, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* The wrapper runs this file eleven times, often beside the full suite and
   other builds on one machine. The first run at 100% CPU timed out renders at
   the default one and five seconds, so a slow machine must not read as a
   broken check. A real failure still fails: nothing here retries. */
vi.setConfig({ testTimeout: 90_000 });
configure({ asyncUtilTimeout: 20_000 });

const spies = vi.hoisted(() => ({
  google: false,
  user: null as null | Record<string, unknown>,
  signIn: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getSession: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/lib/authProviders', () => ({
  OAUTH_PROVIDERS: {
    get google() { return spies.google; },
    apple: false,
  },
  get ANY_OAUTH_ENABLED() { return spies.google; },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: spies.user,
    profile: null,
    loading: false,
    signIn: spies.signIn,
    signUp: spies.signUp,
    signOut: vi.fn(),
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: spies.resetPasswordForEmail,
      updateUser: spies.updateUser,
      getSession: spies.getSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithIdToken: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));

vi.mock('sonner', () => ({ toast: { error: spies.toastError, success: spies.toastSuccess } }));
vi.mock('@/hooks/useStreaks', () => ({ useStreaks: () => ({ globalCurrentStreak: 0 }) }));
vi.mock('@/components/layout/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));

const from = (env: string | undefined, fallback: () => Promise<Record<string, unknown>>) =>
  env ? import(/* @vite-ignore */ env) : fallback();
const { AuthModal } = await from(process.env.GOOGLE_PAUSED_MODAL, () => import('@/components/auth/AuthModal'));
const { Header } = await from(process.env.GOOGLE_PAUSED_HEADER, () => import('@/components/layout/Header'));
const { default: ResetPassword } = await from(process.env.GOOGLE_PAUSED_RESET, () => import('@/pages/ResetPassword'));
const { isGoogleOnlyAccount, PASSWORD_SET_FLAG } = await from(process.env.GOOGLE_PAUSED_LIB, () => import('@/lib/googlePaused'));

const googleOnly = { id: 'u1', email: 'player@example.com', identities: [{ provider: 'google' }], user_metadata: {} };
const emailUser = { id: 'u2', email: 'other@example.com', identities: [{ provider: 'email' }], user_metadata: {} };

function renderModal() {
  return render(<MemoryRouter><AuthModal isOpen onClose={vi.fn()} defaultTab="login" /></MemoryRouter>);
}
function openAccountMenu() {
  const trigger = screen.getByRole('button', { name: 'Account menu' });
  act(() => {
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
  });
}

describe('Round 610: Google players can get back in while Google is paused', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spies.google = false;
    spies.user = null;
    spies.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    spies.updateUser.mockResolvedValue({ data: {}, error: null });
    spies.getSession.mockResolvedValue({ data: { session: { user: googleOnly } } });
  });

  it('1 the sign in modal tells a Google player how to get back in, on Log In only', () => {
    const { unmount } = renderModal();
    const hint = document.querySelector('[data-google-paused-hint]');
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toMatch(/Joined with Google\?/);
    expect(hint?.textContent).toMatch(/Forgot password/);
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(document.querySelector('[data-google-paused-hint]')).toBeNull();
    unmount();
  });

  it('2 a wrong password, or signing up again, points a Google player at Forgot password', async () => {
    spies.signIn.mockResolvedValue({ error: new Error('Invalid login credentials') });
    spies.signUp.mockResolvedValue({ error: new Error('User already registered'), session: null });
    const { unmount } = renderModal();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'player@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'guessing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => expect(spies.toastError).toHaveBeenCalledWith('Incorrect email or password. If you joined with Google, tap Forgot password to set one.'));
    unmount();

    render(<MemoryRouter><AuthModal isOpen onClose={vi.fn()} defaultTab="signup" /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'player@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'guessing' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(spies.toastError).toHaveBeenCalledWith('An account with this email already exists. If you joined with Google, go to Log In and tap Forgot password.'));
  });

  it('3 Forgot password sends the link for the typed email to the reset page', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  player@example.com ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    await waitFor(() => expect(spies.resetPasswordForEmail).toHaveBeenCalledTimes(1));
    const [email, options] = spies.resetPasswordForEmail.mock.calls[0];
    expect(email).toBe('player@example.com');
    expect(options.redirectTo).toMatch(/\/reset-password$/);
    await waitFor(() => expect(spies.toastSuccess).toHaveBeenCalled());
  });

  it('4 only an account with Google and no email identity and no saved password counts as Google only', () => {
    expect(isGoogleOnlyAccount(googleOnly)).toBe(true);
    expect(isGoogleOnlyAccount(emailUser)).toBe(false);
    expect(isGoogleOnlyAccount({ identities: [{ provider: 'google' }, { provider: 'email' }] })).toBe(false);
    expect(isGoogleOnlyAccount({ ...googleOnly, user_metadata: { [PASSWORD_SET_FLAG]: true } })).toBe(false);
    expect(isGoogleOnlyAccount({ identities: [] })).toBe(false);
    expect(isGoogleOnlyAccount(null)).toBe(false);
    /* a restored session without the identities list falls back to the token's providers */
    expect(isGoogleOnlyAccount({ app_metadata: { providers: ['google'] } })).toBe(true);
    expect(isGoogleOnlyAccount({ identities: [], app_metadata: { providers: ['email', 'google'] } })).toBe(false);
  });

  it('5 the account menu offers a Google-only player the change password page, and nobody else', async () => {
    spies.user = googleOnly;
    const { unmount } = render(<MemoryRouter><Header /></MemoryRouter>);
    openAccountMenu();
    const item = await waitFor(() => {
      const el = document.querySelector('[data-set-password]');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    expect(item.getAttribute('href')).toBe('/reset-password');
    expect(item.textContent).toMatch(/Set a password/);
    /* no email goes out from the menu: the page needs none */
    expect(spies.resetPasswordForEmail).not.toHaveBeenCalled();
    unmount();

    spies.user = emailUser;
    render(<MemoryRouter><Header /></MemoryRouter>);
    openAccountMenu();
    await screen.findByText('Log Out');
    expect(document.querySelector('[data-set-password]')).toBeNull();
  });

  it('6 saving a password on the reset page marks the account so the menu stops asking', async () => {
    render(<MemoryRouter><ResetPassword /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'kickoff99' } });
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'kickoff99' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() => expect(spies.updateUser).toHaveBeenCalledTimes(1));
    const attrs = spies.updateUser.mock.calls[0][0];
    expect(attrs.password).toBe('kickoff99');
    expect(attrs.data?.[PASSWORD_SET_FLAG]).toBe(true);
  });

  it('8 when the server wants a fresh sign in, the reset page offers the email link to the account email', async () => {
    spies.updateUser.mockResolvedValue({ data: {}, error: new Error('Password update requires reauthentication') });
    render(<MemoryRouter><ResetPassword /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'kickoff99' } });
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'kickoff99' } });
    expect(document.querySelector('[data-email-link-instead]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    const button = await waitFor(() => {
      const el = document.querySelector('[data-email-link-instead]');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    act(() => { fireEvent.click(button); });
    await waitFor(() => expect(spies.resetPasswordForEmail).toHaveBeenCalledTimes(1));
    expect(spies.resetPasswordForEmail.mock.calls[0][0]).toBe('player@example.com');
    expect(spies.resetPasswordForEmail.mock.calls[0][1].redirectTo).toMatch(/\/reset-password$/);
  });

  it('7 the day Google comes back, all of it goes quiet', async () => {
    spies.google = true;
    spies.signIn.mockResolvedValue({ error: new Error('Invalid login credentials') });
    const modal = render(<MemoryRouter><AuthModal isOpen onClose={vi.fn()} defaultTab="login" /></MemoryRouter>);
    expect(document.querySelector('[data-google-paused-hint]')).toBeNull();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'player@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'guessing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => expect(spies.toastError).toHaveBeenCalledWith('Incorrect email or password. Double-check and try again.'));
    modal.unmount();

    spies.user = googleOnly;
    render(<MemoryRouter><Header /></MemoryRouter>);
    openAccountMenu();
    await screen.findByText('Log Out');
    expect(document.querySelector('[data-set-password]')).toBeNull();
  });
});
