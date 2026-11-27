import { afterEach, expect, it } from 'vitest';
import { protectVignetteLinks } from '@/components/ads/protectVignetteLinks';

let stop: (() => void) | undefined;
function open(path: string, markup: string) {
  history.replaceState({}, '', path);
  document.body.innerHTML = '<div id="root">' + markup + '</div>';
  stop = protectVignetteLinks();
}
const value = (selector: string) => document.querySelector(selector)?.getAttribute('data-google-vignette');
afterEach(() => {
  stop?.();
  document.body.replaceChildren();
  history.replaceState({}, '', '/');
});

it.each(['/club-manager', '/soccer-career/', '/soccer-career?slot=2', '/profile'])('opts out every link from %s', path => {
  open(path, '<a href="/">Home</a><a href="/records">Records</a>');
  expect([...document.querySelectorAll('a')].map(link => link.dataset.googleVignette)).toEqual(['false', 'false']);
});

it('protects game entry, resume, private, same-page and dialog links on the hub', async () => {
  open('/soccer', '<a id="home" href="/">Home</a><a id="game" href="/club-manager">Play</a><a id="save" href="/club-manager?slot=2">Resume</a><a id="account" href="/profile">Profile</a><a id="skip" href="#main">Skip</a><div role="dialog"><a id="dialog" href="/records">Records</a></div><a id="off" href="/" data-google-vignette="false">Keep explicit opt-out</a>');
  expect(value('#home')).toBeNull();
  for (const id of ['game','save','account','skip','dialog','off']) expect(value('#' + id)).toBe('false');
  const card = document.createElement('a');
  card.href = '/records';
  document.querySelector('#root')!.append(card);
  await Promise.resolve();
  expect(card.dataset.googleVignette).toBeUndefined();
  card.href = '/soccer-career/';
  await Promise.resolve();
  expect(card.dataset.googleVignette).toBe('false');
});

it('protects links inside a portaled menu and an existing panel switching to search', async () => {
  open('/', '<section id="panel"><a href="/soccer">Soccer</a></section>');
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.innerHTML = '<a href="/soccer">Sport hub</a><a href="/club-manager">Resume</a>';
  document.body.append(dialog);
  expect(value('#panel a')).toBeNull();
  document.querySelector('#panel')!.setAttribute('data-home-search-active', '');
  await Promise.resolve();
  expect([...dialog.querySelectorAll('a')].map(link => link.dataset.googleVignette)).toEqual(['false', 'false']);
  expect(value('#panel a')).toBe('false');
});
