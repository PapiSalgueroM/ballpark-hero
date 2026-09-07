import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authSpies = vi.hoisted(() => ({
  initialize: vi.fn(),
  renderButton: vi.fn(),
  signInWithIdToken: vi.fn(),
  signInWithOAuth: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
  }),
}));

vi.mock('@/lib/authProviders', () => ({
  OAUTH_PROVIDERS: { google: true, apple: false },
  ANY_OAUTH_ENABLED: true,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithIdToken: authSpies.signInWithIdToken,
      signInWithOAuth: authSpies.signInWithOAuth,
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: authSpies.toastError,
    success: authSpies.toastSuccess,
  },
}));

const authModalPath = process.env.AUTH_MODAL_COMPONENT;
const { AuthModal } = authModalPath
  ? await import(/* @vite-ignore */ authModalPath)
  : await import('@/components/auth/AuthModal');

describe('AuthModal Google sign in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSpies.signInWithIdToken.mockResolvedValue({ data: {}, error: null });
    authSpies.signInWithOAuth.mockResolvedValue({ data: {}, error: null });

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: webcrypto,
    });

    let configuration: { callback?: (response: { credential?: string }) => void } = {};
    authSpies.initialize.mockImplementation((next) => {
      configuration = next;
    });
    authSpies.renderButton.mockImplementation((container: HTMLElement) => {
      const button = document.createElement('button');
      button.textContent = 'Continue with Google';
      button.addEventListener('click', () => configuration.callback?.({ credential: 'google-id-token' }));
      container.appendChild(button);
    });

    Object.defineProperty(window, 'google', {
      configurable: true,
      value: {
        accounts: {
          id: {
            initialize: authSpies.initialize,
            renderButton: authSpies.renderButton,
          },
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.querySelectorAll('script[src="https://accounts.google.com/gsi/client"]').forEach(script => script.remove());
  });

  it('uses the official popup button and exchanges its ID token with a matched cryptographic nonce', async () => {
    const onClose = vi.fn();
    render(<AuthModal isOpen onClose={onClose} />);

    await waitFor(() => expect(authSpies.initialize).toHaveBeenCalledTimes(1));
    expect(authSpies.renderButton).toHaveBeenCalledTimes(1);

    const configuration = authSpies.initialize.mock.calls[0][0];
    expect(configuration.client_id).toBe('999216565849-a179eijdh6d5mndlao0vg32llu2e2j7s.apps.googleusercontent.com');
    expect(configuration.ux_mode).toBe('popup');
    expect(configuration.nonce).toMatch(/^[a-f0-9]{64}$/);

    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(authSpies.signInWithIdToken).toHaveBeenCalledTimes(1));
    const credentials = authSpies.signInWithIdToken.mock.calls[0][0];
    expect(credentials.provider).toBe('google');
    expect(credentials.token).toBe('google-id-token');
    expect(credentials.nonce).toEqual(expect.any(String));

    const encodedNonce = new TextEncoder().encode(credentials.nonce);
    const digest = await webcrypto.subtle.digest('SHA-256', encodedNonce);
    const expectedHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    expect(configuration.nonce).toBe(expectedHash);
    expect(authSpies.signInWithOAuth).not.toHaveBeenCalled();
    expect(authSpies.toastSuccess).toHaveBeenCalledWith("You're signed in!");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a useful error and leaves the popup button ready after a rejected ID token', async () => {
    authSpies.signInWithIdToken.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('ID token rejected'),
    });

    render(<AuthModal isOpen onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(authSpies.toastError).toHaveBeenCalledWith('Could not sign in with Google. Try again or use email instead.'));
    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  });

  it('fits the rendered Google button inside a narrow phone dialog', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 268,
      bottom: 44,
      left: 0,
      width: 268,
      height: 44,
      toJSON: () => ({}),
    });

    render(<AuthModal isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(authSpies.renderButton).toHaveBeenCalledTimes(1));

    const [container, options] = authSpies.renderButton.mock.calls[0];
    expect(container).toHaveClass('w-full');
    expect(options.width).toBe(268);
  });

  it('can retry after a network failure or a loaded script with no Google API', async () => {
    Reflect.deleteProperty(window, 'google');
    const firstRender = render(<AuthModal isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading Google sign in');

    const firstScript = await waitFor(() => {
      const script = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
      expect(script).not.toBeNull();
      return script!;
    });
    act(() => firstScript.dispatchEvent(new Event('error')));
    await waitFor(() => expect(authSpies.toastError).toHaveBeenCalledWith('Google sign in could not load. Use email instead or try again later.'));
    expect(screen.getByRole('alert')).toHaveTextContent('Google sign in unavailable');
    expect(firstScript).not.toBeInTheDocument();

    firstRender.unmount();
    const secondRender = render(<AuthModal isOpen onClose={vi.fn()} />);
    const loadedWithoutApi = await waitFor(() => {
      const script = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
      expect(script).not.toBeNull();
      expect(script).not.toBe(firstScript);
      return script!;
    });
    act(() => loadedWithoutApi.dispatchEvent(new Event('load')));
    await waitFor(() => expect(authSpies.toastError).toHaveBeenCalledTimes(2));
    expect(loadedWithoutApi).not.toBeInTheDocument();

    secondRender.unmount();
    vi.useFakeTimers();
    const timeoutRender = render(<AuthModal isOpen onClose={vi.fn()} />);
    const timedOutScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    expect(timedOutScript).not.toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(10_000);
      await Promise.resolve();
    });
    expect(authSpies.toastError).toHaveBeenCalledTimes(3);
    expect(timedOutScript).not.toBeInTheDocument();

    timeoutRender.unmount();
    vi.useRealTimers();
    render(<AuthModal isOpen onClose={vi.fn()} />);
    const retryScript = await waitFor(() => {
      const script = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
      expect(script).not.toBeNull();
      expect(script).not.toBe(loadedWithoutApi);
      return script!;
    });
    Object.defineProperty(window, 'google', {
      configurable: true,
      value: {
        accounts: {
          id: {
            initialize: authSpies.initialize,
            renderButton: authSpies.renderButton,
          },
        },
      },
    });
    act(() => retryScript.dispatchEvent(new Event('load')));
    await waitFor(() => expect(authSpies.renderButton).toHaveBeenCalledTimes(1));
  });
});
