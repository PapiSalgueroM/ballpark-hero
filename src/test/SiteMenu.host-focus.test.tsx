import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SiteMenu } from '@/components/layout/SiteMenu';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function launchers(fallbackHidden = false, hostHidden = true) {
  return <MemoryRouter initialEntries={['/soccer']}>
    <div data-testid="fallback" hidden={fallbackHidden}><SiteMenu /></div>
    <div data-testid="host" data-site-menu-host="" hidden={hostHidden}><SiteMenu /></div>
  </MemoryRouter>;
}

function geometry(button: HTMLButtonElement, visible: boolean) {
  vi.spyOn(button, 'getClientRects').mockReturnValue(
    (visible ? [{ x: 0, y: 0, width: 44, height: 44, top: 0, right: 44, bottom: 44, left: 0 }] : []) as unknown as DOMRectList,
  );
}

it.each(['escape', 'close'] as const)('returns real Sheet %s focus to the visible host after the fallback is hidden', async action => {
  const rendered = render(launchers());
  const fallback = within(screen.getByTestId('fallback')).getByRole('button', { name: 'Open site menu' }) as HTMLButtonElement;
  const host = screen.getByTestId('host').querySelector('button') as HTMLButtonElement;
  geometry(fallback, true);
  geometry(host, false);
  fallback.focus();
  fireEvent.click(fallback);
  const dialog = await screen.findByRole('dialog', { name: 'Menu' });
  expect(within(dialog).getByRole('link', { name: 'Soccer' }).getAttribute('href'), 'MENU_HOST_ACTUAL_SHEET').toBe('/soccer');
  await waitFor(() => expect(dialog.contains(document.activeElement), 'MENU_HOST_REAL_FOCUS_SCOPE').toBe(true));
  rendered.rerender(launchers(true, false));
  vi.mocked(fallback.getClientRects).mockReturnValue([] as unknown as DOMRectList);
  vi.mocked(host.getClientRects).mockReturnValue([{ x: 0, y: 0, width: 44, height: 44, top: 0, right: 44, bottom: 44, left: 0 }] as unknown as DOMRectList);
  expect(screen.getByTestId('fallback').hidden, 'MENU_HOST_FALLBACK_HIDDEN').toBe(true);
  expect(screen.getByTestId('host').hidden, 'MENU_HOST_ARRIVED').toBe(false);
  if (action === 'escape') fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
  else fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu' }), 'MENU_HOST_REAL_SHEET_CLOSED').toBeNull());
  await waitFor(() => expect(document.activeElement, 'MENU_HOST_VISIBLE_FOCUS_RETURN').toBe(host));
  expect(fallback.getAttribute('aria-expanded'), 'MENU_HOST_FALLBACK_CLOSED').toBe('false');
  expect(host.getAttribute('aria-expanded'), 'MENU_HOST_NO_SECOND_PANEL').toBe('false');
  await waitFor(() => expect(document.body.style.overflow, 'MENU_HOST_BODY_UNLOCKED').toBe(''));
});

it('keeps focus with the opening trigger while it remains visible', async () => {
  render(launchers(false, false));
  const [fallback, host] = screen.getAllByRole('button', { name: 'Open site menu' }) as HTMLButtonElement[];
  geometry(fallback, true);
  geometry(host, true);
  fallback.focus();
  fireEvent.click(fallback);
  const dialog = await screen.findByRole('dialog', { name: 'Menu' });
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
  await waitFor(() => expect(document.activeElement, 'MENU_HOST_OWNER_VISIBLE_PREFERRED').toBe(fallback));
});

it('retains the original trigger fallback when no visible host exists', async () => {
  render(launchers());
  const fallback = within(screen.getByTestId('fallback')).getByRole('button', { name: 'Open site menu' }) as HTMLButtonElement;
  const host = screen.getByTestId('host').querySelector('button') as HTMLButtonElement;
  geometry(fallback, false);
  geometry(host, false);
  fallback.focus();
  fireEvent.click(fallback);
  const dialog = await screen.findByRole('dialog', { name: 'Menu' });
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
  await waitFor(() => expect(document.activeElement, 'MENU_HOST_NO_ALTERNATIVE_FALLBACK').toBe(fallback));
});
