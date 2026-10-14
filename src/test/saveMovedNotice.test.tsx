/**
 * Round 1323: the notice a stale tab shows. The browser half (two real tabs,
 * the page behind it taking no press and no key, the page not jumping) is
 * scripts/playTwoTabs.mjs; this holds the component's own promises.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SaveMovedNotice from '@/components/SaveMovedNotice';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

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

  it('is named by its words (an alertdialog needs a name)', () => {
    const r = render(<SaveMovedNotice message={WORDS} onReload={() => undefined} />);
    expect(screen.getByRole('alertdialog', { name: WORDS })).toBeTruthy();
    r.unmount();
  });

  it('no key reaches a listener on window behind it, and they come back when it goes', () => {
    const seen: string[] = [];
    const onKey = (e: KeyboardEvent) => { seen.push(e.key); };
    window.addEventListener('keydown', onKey);
    const r = render(<div><button>Quick Sim</button><SaveMovedNotice message={WORDS} onReload={() => undefined} /></div>);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Reload' }), { key: 'Escape' });
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(seen).toEqual([]);
    r.unmount();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(seen).toEqual(['Escape']);
    window.removeEventListener('keydown', onKey);
  });

  it('Reload takes the first press while a dialog behind it holds the page (Release BD, the lead ruling of Round 1330)', () => {
    /* An open modal dialog (Radix, src/components/ui/dialog.tsx) sets pointer-events none on the body, and the notice
       is a child of the body, so it inherited that and the first press only closed the dialog. pointer-events is an
       inherited property: the value that applies to the button is the nearest one declared on it or above it.
       jsdom does not inherit it, so this walks up the way the browser does. */
    const applied = (el: Element | null) => {
      for (let at = el; at; at = at.parentElement) {
        const v = window.getComputedStyle(at).pointerEvents;
        if (v && v !== 'inherit' && v !== 'unset') return v;
      }
      return 'auto';
    };
    const onReload = vi.fn();
    const r = render(
      <div>
        <Dialog open>
          <DialogContent>
            <DialogTitle>Season review</DialogTitle>
            <button>Next season</button>
          </DialogContent>
        </Dialog>
        <SaveMovedNotice message={WORDS} onReload={onReload} />
      </div>,
    );
    expect(document.body.style.pointerEvents).toBe('none');
    const reload = screen.getByRole('button', { name: 'Reload' });
    expect(applied(reload)).not.toBe('none');
    fireEvent.click(reload);
    expect(onReload).toHaveBeenCalledTimes(1);
    r.unmount();
  });

  it('Reload calls the reload it is given', () => {
    const onReload = vi.fn();
    const r = render(<SaveMovedNotice message={WORDS} onReload={onReload} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledTimes(1);
    r.unmount();
  });
});
