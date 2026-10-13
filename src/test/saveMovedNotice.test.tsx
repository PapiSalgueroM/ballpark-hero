/**
 * Round 1323: the notice a stale tab shows. The browser half (two real tabs,
 * the page behind it taking no press and no key, the page not jumping) is
 * scripts/playTwoTabs.mjs; this holds the component's own promises.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SaveMovedNotice from '@/components/SaveMovedNotice';

const WORDS = 'This career moved on in another tab. Reload to carry on.';

describe('SaveMovedNotice', () => {
  it('is a dialog with the words and one Reload button that has focus', () => {
    const r = render(<div><button>Quick Sim</button><SaveMovedNotice message={WORDS} onReload={() => undefined} /></div>);
    const dialog = screen.getByRole('alertdialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain(WORDS);
    const reload = screen.getByRole('button', { name: 'Reload' });
    expect(document.activeElement).toBe(reload);
    r.unmount();
  });

  it('makes everything else in the document inert, and gives it back when it goes', () => {
    const r = render(<div data-testid="page"><button>Quick Sim</button><SaveMovedNotice message={WORDS} onReload={() => undefined} /></div>);
    const root = r.container;
    expect(root.hasAttribute('inert')).toBe(true);
    expect(screen.getByTestId('save-moved-notice').closest('[inert]')).toBeNull();
    r.unmount();
    expect(root.hasAttribute('inert')).toBe(false);
    expect(document.querySelector('[data-testid="save-moved-notice"]')).toBeNull();
  });

  it('Reload calls the reload it is given', () => {
    const onReload = vi.fn();
    const r = render(<SaveMovedNotice message={WORDS} onReload={onReload} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledTimes(1);
    r.unmount();
  });
});
