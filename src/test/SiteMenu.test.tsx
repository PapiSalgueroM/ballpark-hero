import { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { SiteMenu } from '@/components/layout/SiteMenu';
import { useRoutePath } from '@/hooks/useRoutePath';

afterEach(cleanup);

async function menuHost(initial = '/soccer') {
  let actualNavigate: NavigateFunction | undefined;
  function Host() {
    const navigate = useNavigate();
    const location = useLocation();
    const normalized = useRoutePath();
    useEffect(() => { actualNavigate = navigate; }, [navigate]);
    return <>
      <SiteMenu />
      <output data-testid="actual-router-location" data-normalized-path={normalized} data-route-key={location.key}>
        {location.pathname + location.search + location.hash}
      </output>
    </>;
  }
  render(<MemoryRouter initialEntries={[initial]}><Host /></MemoryRouter>);
  await waitFor(() => expect(actualNavigate, 'SITE_MENU_ROUTER_READY').toBeDefined());
  return {
    navigate(target: string | number) {
      if (!actualNavigate) throw new Error('SITE_MENU_ROUTER_NOT_READY');
      act(() => {
        if (typeof target === 'number') actualNavigate!(target);
        else actualNavigate!(target);
      });
    },
  };
}

async function openMenu() {
  const trigger = screen.getByRole('button', { name: 'Open site menu' });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', { name: 'Menu' });
  return { trigger, dialog, menu: within(dialog) };
}

async function expectClosed(marker: string) {
  await waitFor(() => {
    if (screen.queryByRole('dialog', { name: 'Menu' })) throw new Error(marker + ': Menu dialog is still open');
  });
}

describe('global top-left SiteMenu with the actual Sheet and router', () => {
  it('opens a named dialog with the real site links and all six lightweight sports hubs', async () => {
    await menuHost();
    const trigger = screen.getByRole('button', { name: 'Open site menu' });
    expect(trigger, 'SITE_MENU_VISIBLE_TRIGGER').toHaveTextContent('Menu');
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
    const { dialog, menu } = await openMenu();
    expect(dialog, 'SITE_MENU_NAMED_DIALOG').toBeVisible();
    expect(menu.getByText('Find games, sports and site links.'), 'SITE_MENU_DESCRIPTION').toBeVisible();
    const links: [RegExp, string][] = [
      [/^Home$/, '/'], [/^Search Games$/, '/search'], [/^Record Books$/, '/records'],
      [/^Leaderboard$/, '/leaderboard'], [/^What's New$/, '/whats-new'],
      [/^Soccer$/, '/soccer'], [/^NBA$/, '/pro-basketball'], [/^NHL$/, '/hockey'],
      [/^NFL$/, '/pro-football'], [/^MLB$/, '/baseball'], [/^College$/, '/college'],
      [/^About$/, '/about'], [/^Contact$/, '/contact'], [/^Privacy Policy$/, '/privacy'],
      [/^Cookie Policy$/, '/cookie-policy'], [/^Terms of Service$/, '/terms'],
      [/^Accessibility$/, '/accessibility'],
    ];
    for (const [name, href] of links) {
      const link = menu.getByRole('link', { name });
      expect(link.getAttribute('href'), 'SITE_MENU_ACTUAL_HREF_' + href).toBe(href);
      expect(link, 'SITE_MENU_VISIBLE_LINK_' + href).toBeVisible();
    }
    expect(menu.getAllByRole('link'), 'SITE_MENU_BOUNDED_LINK_SET').toHaveLength(17);
    expect(menu.getByRole('button', { name: 'Close' }), 'SITE_MENU_REAL_CLOSE_CONTROL').toBeVisible();
  });

  it('lets real Radix Escape dismiss and return focus to the opening trigger', async () => {
    await menuHost();
    const { trigger, dialog } = await openMenu();
    await waitFor(() => expect(dialog, 'SITE_MENU_FOCUS_INSIDE').toContainElement(document.activeElement as HTMLElement));
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await expectClosed('SITE_MENU_ESCAPE_CLOSED');
    await waitFor(() => expect(trigger, 'SITE_MENU_ESCAPE_FOCUS_RETURN').toHaveFocus());
  });

  it('selects a real internal link, changes router location and closes', async () => {
    await menuHost();
    const { menu } = await openMenu();
    fireEvent.click(menu.getByRole('link', { name: 'Record Books' }));
    await expectClosed('SITE_MENU_SELECTED_LINK_CLOSED');
    expect(screen.getByTestId('actual-router-location'), 'SITE_MENU_REAL_LINK_NAVIGATION')
      .toHaveTextContent(/^\/records$/);
  });

  it('marks only the normalized current route and closes when that current link is selected', async () => {
    await menuHost('/soccer/?from=menu#section');
    const { dialog, menu } = await openMenu();
    const soccer = menu.getByRole('link', { name: 'Soccer' });
    expect(screen.getByTestId('actual-router-location'), 'SITE_MENU_REAL_NORMALIZED_PATH')
      .toHaveAttribute('data-normalized-path', '/soccer');
    expect(soccer, 'SITE_MENU_EXACT_CURRENT_MARK').toHaveAttribute('aria-current', 'page');
    expect(dialog.querySelectorAll('[aria-current="page"]'), 'SITE_MENU_ONLY_ONE_CURRENT').toHaveLength(1);
    expect(menu.getByRole('link', { name: 'Home' }), 'SITE_MENU_HOME_NOT_PREFIX_CURRENT')
      .not.toHaveAttribute('aria-current');
    fireEvent.click(soccer);
    await expectClosed('SITE_MENU_SAME_PATH_CLOSED');
    expect(screen.getByTestId('actual-router-location'), 'SITE_MENU_CURRENT_LINK_TARGET')
      .toHaveTextContent(/^\/soccer$/);
  });

  it('dismisses from the actual Sheet overlay and returns focus', async () => {
    await menuHost();
    const { trigger, dialog } = await openMenu();
    // The held Sheet renders Overlay immediately before Content in the same portal.
    const overlay = dialog.previousElementSibling;
    expect(overlay, 'SITE_MENU_ACTUAL_OVERLAY_FOUNDATION').toBeInstanceOf(HTMLElement);
    expect(overlay, 'SITE_MENU_ACTUAL_OVERLAY_STATE').toHaveAttribute('data-state', 'open');
    expect(overlay, 'SITE_MENU_ACTUAL_OVERLAY_CLASS').toHaveClass('fixed', 'inset-0');
    // Let the real dismissable-layer document listener attach before the outside pointer.
    await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 0)); });
    fireEvent.pointerDown(overlay as HTMLElement, { button: 0, pointerType: 'mouse' });
    await expectClosed('SITE_MENU_OUTSIDE_CLOSED');
    await waitFor(() => expect(trigger, 'SITE_MENU_OUTSIDE_FOCUS_RETURN').toHaveFocus());
  });

  it('closes on external search/hash and history key changes while the normalized path stays the same', async () => {
    const host = await menuHost('/soccer');
    await openMenu();
    const before = screen.getByTestId('actual-router-location').getAttribute('data-route-key');
    host.navigate('/soccer?menu=next#results');
    await expectClosed('SITE_MENU_EXTERNAL_KEY_CLOSED');
    const location = screen.getByTestId('actual-router-location');
    expect(location, 'SITE_MENU_EXTERNAL_LOCATION_CHANGED').toHaveTextContent('/soccer?menu=next#results');
    expect(location, 'SITE_MENU_EXTERNAL_PATH_HELD').toHaveAttribute('data-normalized-path', '/soccer');
    expect(location.getAttribute('data-route-key'), 'SITE_MENU_EXTERNAL_KEY_CHANGED').not.toBe(before);
    await openMenu();
    host.navigate(-1);
    await expectClosed('SITE_MENU_HISTORY_CLOSED');
    expect(screen.getByTestId('actual-router-location'), 'SITE_MENU_REAL_HISTORY_BACK')
      .toHaveTextContent(/^\/soccer$/);
  });
});
