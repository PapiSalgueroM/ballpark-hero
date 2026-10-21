import { useEffect, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Props = { isOpen: boolean; onClose: () => void; defaultTab?: 'login' | 'signup' };
let AuthModal: typeof import('@/components/auth/AuthModal').AuthModal;
let resolveBody: () => void;
let rejectBody: (reason: Error) => void;
const imported = vi.fn();
const mounted = vi.fn();
const unmounted = vi.fn();

function Body({ isOpen, onClose, defaultTab = 'login' }: Props) {
  const [draft, setDraft] = useState('');
  useEffect(() => { mounted(document.activeElement); return () => { unmounted(); }; }, []);
  return isOpen ? <div role="dialog" aria-label={defaultTab}>
    <label>Email draft<input value={draft} onChange={event => setDraft(event.target.value)} /></label>
    <button onClick={onClose}>Close form</button>
  </div> : null;
}

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  const pending = new Promise<void>((resolve, reject) => { resolveBody = resolve; rejectBody = reject; });
  vi.doMock('@/components/auth/AuthModalBody', async () => {
    imported();
    await pending;
    return { AuthModal: Body };
  });
  ({ AuthModal } = await import('@/components/auth/AuthModal'));
});
afterEach(async () => {
  cleanup();
  await act(async () => { resolveBody(); });
  document.querySelectorAll('[data-auth-loading-opener]').forEach(element => element.remove());
  vi.doUnmock('@/components/auth/AuthModalBody');
});

async function finishLoading() {
  await act(async () => { resolveBody(); });
  await waitFor(() => expect(mounted).toHaveBeenCalledTimes(1));
}

describe('account form code loads only after an account action', () => {
  it('does not request the body while closed and can cancel a pending first open', async () => {
    const close = vi.fn();
    const opener = document.createElement('button');
    opener.setAttribute('data-auth-loading-opener', '');
    document.body.appendChild(opener);
    opener.focus();
    const view = render(<AuthModal isOpen={false} onClose={close} />);
    await act(async () => {});
    expect(imported).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Account sign in' })).toBeNull();
    view.rerender(<AuthModal isOpen onClose={close} defaultTab="signup" />);
    await waitFor(() => expect(imported).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status')).toHaveTextContent('Loading account form');
    expect(opener).toHaveFocus();
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    cancel.focus();
    fireEvent.click(cancel);
    expect(close).toHaveBeenCalledTimes(1);
    expect(opener).toHaveFocus();
    view.rerender(<AuthModal isOpen={false} onClose={close} defaultTab="signup" />);
    await finishLoading();
    expect(screen.queryByRole('dialog')).toBeNull();
    view.rerender(<AuthModal isOpen onClose={close} defaultTab="signup" />);
    expect(screen.getByRole('dialog', { name: 'signup' })).toBeInTheDocument();
    expect(imported).toHaveBeenCalledTimes(1);
    opener.remove();
  });

  it('keeps the loaded body mounted so closing and reopening preserves its draft', async () => {
    const close = vi.fn();
    const view = render(<AuthModal isOpen onClose={close} />);
    await waitFor(() => expect(imported).toHaveBeenCalledTimes(1));
    await finishLoading();
    fireEvent.change(screen.getByRole('textbox', { name: 'Email draft' }), { target: { value: 'player@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close form' }));
    expect(close).toHaveBeenCalledTimes(1);
    view.rerender(<AuthModal isOpen={false} onClose={close} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(unmounted).not.toHaveBeenCalled();
    view.rerender(<AuthModal isOpen onClose={close} />);
    expect(screen.getByRole('textbox', { name: 'Email draft' })).toHaveValue('player@example.com');
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(imported).toHaveBeenCalledTimes(1);
  });

  it('starts loading for a caller that is already open on its first render', async () => {
    const opener = document.createElement('button');
    opener.setAttribute('data-auth-loading-opener', '');
    document.body.appendChild(opener);
    opener.focus();
    render(<AuthModal isOpen onClose={vi.fn()} defaultTab="signup" />);
    await waitFor(() => expect(imported).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status')).toHaveTextContent('Loading account form');
    screen.getByRole('button', { name: 'Cancel' }).focus();
    await finishLoading();
    expect(mounted).toHaveBeenCalledWith(opener);
    expect(opener).toHaveFocus();
    expect(screen.getByRole('dialog', { name: 'signup' })).toBeInTheDocument();
  });

  it('contains a failed import and leaves a cancel action available', async () => {
    const close = vi.fn();
    const first = document.createElement('button');
    const second = document.createElement('button');
    for (const opener of [first, second]) {
      opener.setAttribute('data-auth-loading-opener', '');
      document.body.appendChild(opener);
    }
    first.focus();
    const view = render(<AuthModal isOpen onClose={close} />);
    await waitFor(() => expect(imported).toHaveBeenCalledTimes(1));
    await act(async () => { rejectBody(new Error('Fixture module download failed')); });
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeNull());
    expect(screen.getByRole('alert')).toHaveTextContent('Account form could not load');
    screen.getByRole('button', { name: 'Cancel' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(first).toHaveFocus();
    view.rerender(<AuthModal isOpen={false} onClose={close} />);
    second.focus();
    view.rerender(<AuthModal isOpen onClose={close} defaultTab="signup" />);
    screen.getByRole('button', { name: 'Cancel' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalledTimes(2);
    expect(second).toHaveFocus();
    expect(imported).toHaveBeenCalledTimes(1);
    expect(mounted).not.toHaveBeenCalled();
  });
});