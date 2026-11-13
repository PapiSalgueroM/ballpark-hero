import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CookieConsent } from '@/components/CookieConsent';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/consentedScripts', () => ({ loadConsentedScripts: vi.fn(), stopRevokedServices: vi.fn() }));

const route = '/nrl-team-manager';
const seenKey = `rules-gate-seen:${route}`;
const choiceKey = 'cookie-consent-v2';
const rulesName = 'How to play NRL Team Manager';
const choices = { name: 'Cookie choices' };

function renderRoute(initial = route) {
  return render(<MemoryRouter initialEntries={[initial]}><Routes>
    <Route path="/" element={<><CookieConsent inline compactInitial /><Link to={route}>Open NRL</Link></>} />
    <Route path={route} element={<><NrlTeamManager /><Link to={`${route}?view=saves`}>Open slots</Link><Link to="/">Return home</Link></>} />
  </Routes></MemoryRouter>);
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

it('opens first NRL rules with one cookie region and no intermediate inline copy', async () => {
  const addedInline: Element[] = [];
  const selector = '[data-game-consent-inline]';
  const observer = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches(selector)) addedInline.push(node);
      addedInline.push(...node.querySelectorAll(selector));
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  try {
    renderRoute(`${route}/?slot=2`);
    const dialog = await screen.findByRole('dialog', { name: rulesName });
    const region = await within(dialog).findByRole('region', choices);
    expect(screen.getAllByRole('region', choices)).toEqual([region]);
    expect(region).toHaveFocus();
    expect(addedInline).toEqual([]);
    expect(localStorage.getItem(seenKey)).toBe('1');

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: rulesName })).toBeNull());
    const inline = screen.getByRole('region', choices);
    const board = screen.getByRole('main');
    expect(inline).toHaveAttribute('data-game-consent-inline');
    expect(inline.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: 'How to play' })).toHaveFocus());
    expect(localStorage.getItem(choiceKey)).toBeNull();
  } finally { observer.disconnect(); }
});

it('opens Rules but leaves no consent prompt when choices were already accepted', async () => {
  const saved = JSON.stringify({ version: 2, advertising: true, analytics: false, updatedAt: Date.now() });
  localStorage.setItem(choiceKey, saved);
  renderRoute();
  await screen.findByRole('dialog', { name: rulesName });
  expect(screen.queryByRole('region', choices)).toBeNull();
  expect(localStorage.getItem(choiceKey)).toBe(saved);
});

it('keeps the same pending region when the career screen switches to saves', async () => {
  localStorage.setItem(seenKey, '1');
  renderRoute();
  const region = await screen.findByRole('region', choices);
  fireEvent.click(screen.getByRole('link', { name: 'Open slots' }));
  await screen.findByRole('heading', { name: 'Career saves' });
  expect(screen.getAllByRole('region', choices)).toEqual([region]);
  expect(region).toHaveAttribute('data-game-consent-inline');
  expect(screen.queryByRole('dialog', { name: rulesName })).toBeNull();
  expect(localStorage.getItem(choiceKey)).toBeNull();
});

it.each(['seen', 'blocked'] as const)('keeps one above-game choice with %s Rules storage', async state => {
  if (state === 'seen') localStorage.setItem(seenKey, '1');
  else {
    const original = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === seenKey) throw new DOMException('Rules fixture blocks storage', 'SecurityError');
      return original.call(this, key);
    });
  }
  renderRoute();
  const region = await screen.findByRole('region', choices);
  expect(region).toHaveAttribute('data-game-consent-inline');
  expect(screen.getAllByRole('region', choices)).toEqual([region]);
  expect(screen.queryByRole('dialog', { name: rulesName })).toBeNull();
  expect(region).not.toHaveFocus();
});

it('keeps one consent region through Home, Rules and the return to Home without hidden focus', async () => {
  const focus: HTMLElement[] = [];
  const capture = (event: FocusEvent) => {
    if (event.target instanceof HTMLElement && event.target.closest('[aria-label="Cookie choices"]')) focus.push(event.target);
  };
  document.addEventListener('focusin', capture);
  try {
    renderRoute('/');
    expect(screen.getAllByRole('region', choices)).toHaveLength(1);
    fireEvent.click(screen.getByRole('link', { name: 'Open NRL' }));
    const dialog = await screen.findByRole('dialog', { name: rulesName });
    const region = await within(dialog).findByRole('region', choices);
    expect(screen.getAllByRole('region', choices)).toEqual([region]);
    act(() => within(region).getByRole('link', { name: 'Learn more' }).focus());
    expect(focus.length).toBeGreaterThan(0);
    expect(focus.every(node => region.contains(node))).toBe(true);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: rulesName })).toBeNull());
    fireEvent.click(screen.getByRole('link', { name: 'Return home' }));
    expect(screen.getAllByRole('region', choices)).toHaveLength(1);
    expect(localStorage.getItem(choiceKey)).toBeNull();
  } finally { document.removeEventListener('focusin', capture); }
});
