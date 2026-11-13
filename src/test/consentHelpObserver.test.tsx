import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CookieConsent } from '@/components/CookieConsent';

vi.mock('@/lib/consentedScripts', () => ({
  loadConsentedScripts: vi.fn(),
  stopRevokedServices: vi.fn(),
}));

const selector = '[data-dukb-help-cookie-choices]';
const fixtures: HTMLElement[] = [];
const fixture = () => {
  const node = document.createElement('div');
  fixtures.push(node);
  document.body.append(node);
  return node;
};
const mutate = async (change: () => void) => { await act(async () => { change(); }); };
const mount = () => render(<MemoryRouter><CookieConsent inline /></MemoryRouter>);

beforeEach(() => { localStorage.clear(); });
afterEach(() => {
  cleanup();
  fixtures.splice(0).forEach(node => node.remove());
  vi.restoreAllMocks();
  localStorage.clear();
});

it('does not search the whole document for ordinary game updates while choices are pending', async () => {
  const rows = fixture();
  mount();
  await screen.findByRole('region', { name: 'Cookie choices' });
  const searches = vi.spyOn(document, 'querySelector');
  for (let index = 0; index < 30; index += 1) {
    await mutate(() => {
      const row = document.createElement('p');
      row.textContent = `Fixture score ${index}`;
      rows.replaceChildren(row);
    });
  }
  expect(searches.mock.calls.filter(([query]) => query === selector)).toHaveLength(0);
  expect(screen.getAllByRole('region', { name: 'Cookie choices' })).toHaveLength(1);
  expect(localStorage.getItem('cookie-consent-v2')).toBeNull();
});

it('finds inserted hosts, keeps DOM order, and returns inline when hosts disappear', async () => {
  const hosts = fixture();
  const { container } = mount();
  await screen.findByRole('region', { name: 'Cookie choices' });
  const later = document.createElement('div');
  later.setAttribute('data-dukb-help-cookie-choices', '');
  await mutate(() => { hosts.append(later); });
  await waitFor(() => expect(later).toContainElement(screen.getByRole('region', { name: 'Cookie choices' })));
  const nested = document.createElement('section');
  const earlier = document.createElement('div');
  earlier.setAttribute('data-dukb-help-cookie-choices', '');
  nested.append(earlier);
  await mutate(() => { hosts.prepend(nested); });
  await waitFor(() => expect(earlier).toContainElement(screen.getByRole('region', { name: 'Cookie choices' })));
  await mutate(() => { nested.remove(); });
  await waitFor(() => expect(later).toContainElement(screen.getByRole('region', { name: 'Cookie choices' })));
  await mutate(() => { later.remove(); });
  await waitFor(() => expect(container).toContainElement(screen.getByRole('region', { name: 'Cookie choices' })));
  expect(screen.getByRole('region', { name: 'Cookie choices' })).toHaveAttribute('data-game-consent-inline');
  expect(localStorage.getItem('cookie-consent-v2')).toBeNull();
});

it('keeps an already open host through updates and replacement in one DOM batch', async () => {
  const hosts = fixture();
  const original = document.createElement('div');
  original.setAttribute('data-dukb-help-cookie-choices', '');
  hosts.append(original);
  mount();
  await waitFor(() => expect(original).toContainElement(screen.getByRole('region', { name: 'Cookie choices' })));
  const searches = vi.spyOn(document, 'querySelector');
  for (let index = 0; index < 20; index += 1) {
    await mutate(() => {
      const text = document.createTextNode(`Fixture update ${index}`);
      hosts.append(text);
      text.remove();
    });
  }
  expect(searches.mock.calls.filter(([query]) => query === selector)).toHaveLength(0);
  const replacement = document.createElement('div');
  replacement.setAttribute('data-dukb-help-cookie-choices', '');
  await mutate(() => { original.replaceWith(replacement); });
  await waitFor(() => expect(replacement).toContainElement(screen.getByRole('region', { name: 'Cookie choices' })));
  expect(screen.getAllByRole('region', { name: 'Cookie choices' })).toHaveLength(1);
});
