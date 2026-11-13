import './dailyReload/mocks';
import { createElement } from 'react';
import { act, cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { players } from '@/data/players';
import { buildDraft, dailyDraftSeed } from '@/lib/gauntletDraft';
import GauntletDraft from '@/pages/GauntletDraft';
import MlbGauntletDraft from '@/pages/MlbGauntletDraft';
import NbaGauntletDraft from '@/pages/NbaGauntletDraft';
import NflGauntletDraft from '@/pages/NflGauntletDraft';
import NhlGauntletDraft from '@/pages/NhlGauntletDraft';
import { button, click, findButton, mountPage, type MountedPage } from './dailyReload/harness';
import { recordCompletion, resetMocks, setPoolFixture } from './dailyReload/mocks';
import gauntlet from './dailyReload/gauntlet-draft.driver';

const date = '2026-11-11';
const soccerKey = 'gauntlet-draft-daily-' + date;
const chosen = [2, 4, 1, 3];

const routes = [
  { slug: 'gauntlet-draft', Page: GauntletDraft, slots: 11 },
  { slug: 'nba-gauntlet-draft', Page: NbaGauntletDraft, slots: 5 },
  { slug: 'nfl-gauntlet-draft', Page: NflGauntletDraft, slots: 7 },
  { slug: 'nhl-gauntlet-draft', Page: NhlGauntletDraft, slots: 11 },
  { slug: 'mlb-gauntlet-draft', Page: MlbGauntletDraft, slots: 11 },
];

beforeEach(() => {
  localStorage.clear();
  resetMocks();
  setPoolFixture('squad', players);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.UTC(2026, 10, 11, 17));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function open({ slug, Page }: typeof routes[number]) {
  const page = mountPage(createElement(Page), '/' + slug);
  await waitFor(() => button(page.container, /^Daily gauntlet/));
  return page;
}

const startDaily = (page: MountedPage) => click(button(page.container, /^Daily gauntlet/));
const cards = (page: MountedPage) => Array.from(page.container.querySelectorAll('button.bg-gradient-to-b'));

function cardNames(page: MountedPage) {
  return cards(page).map(card => card.children[2].textContent ?? '');
}

function pickLine(page: MountedPage) {
  return Array.from(page.container.querySelectorAll('p')).find(p => /^Pick \d+ of \d+/.test(p.textContent ?? ''))?.textContent;
}

function squadLine(page: MountedPage) {
  const line = Array.from(page.container.querySelectorAll('p')).find(p => / so far · \d+ OVR/.test(p.textContent ?? ''));
  return line?.parentElement?.textContent;
}

async function keep(page: MountedPage, indices: number[]) {
  const names: string[] = [];
  for (const index of indices) {
    expect(cards(page)).toHaveLength(5);
    names.push(cardNames(page)[index]);
    await click(cards(page)[index]);
  }
  return names;
}

it.each(routes)('resumes real picks and keeps final bytes for $slug', async route => {
  const key = route.slug + '-daily-' + date;
  const first = await open(route);
  await startDaily(first);
  const picked = await keep(first, chosen);
  const nextOffer = cardNames(first);
  const progress = squadLine(first);
  const partial = localStorage.getItem(key);
  expect(JSON.parse(partial ?? 'null')).toMatchObject({ v: 1, date, kept: picked });
  expect(recordCompletion).toHaveBeenCalledTimes(0);
  first.unmount();

  const resumed = await open(route);
  await startDaily(resumed);
  expect(pickLine(resumed)).toMatch(/^Pick 5 of /);
  expect(cardNames(resumed)).toEqual(nextOffer);
  expect(squadLine(resumed)).toBe(progress);
  expect(localStorage.getItem(key)).toBe(partial);
  const rest = Array<number>(route.slots - chosen.length).fill(0);
  await keep(resumed, rest);
  const final = localStorage.getItem(key);
  expect(Object.keys(JSON.parse(final ?? '{}'))).toEqual(['run', 'v', 'date']);
  expect(recordCompletion).toHaveBeenCalledTimes(1);
  resumed.unmount();

  localStorage.removeItem(key);
  const control = await open(route);
  await startDaily(control);
  await keep(control, [...chosen, ...rest]);
  expect(localStorage.getItem(key)).toBe(final);
  expect(recordCompletion).toHaveBeenCalledTimes(2);
});

function alternateSoccerPool() {
  const seed = dailyDraftSeed(date);
  const original = buildDraft(players, seed);
  const changedName = original.picks[8].choices[0].name;
  const alternate = players.map(player => player.name === changedName ? { ...player, name: 'Fixture changed offer' } : player);
  return { seed, original, alternate };
}

it('retains Soccer picks through a different future offer and resumes when the original pool returns', async () => {
  const { seed, original, alternate } = alternateSoccerPool();
  const altered = buildDraft(alternate, seed);
  expect(altered.picks.slice(0, 4)).toEqual(original.picks.slice(0, 4));
  expect(altered.picks[8].choices.map(player => player.name)).not.toEqual(original.picks[8].choices.map(player => player.name));

  const route = routes[0];
  const first = await open(route);
  await startDaily(first);
  setPoolFixture('squad', alternate);
  const stale = await open(route);
  await startDaily(stale);
  await keep(first, chosen);
  const partial = localStorage.getItem(soccerKey);
  expect(partial).not.toBeNull();
  const progress = squadLine(first);
  const nextOffer = cardNames(first);
  first.unmount();
  await keep(stale, [0]);
  expect(stale.container.textContent).toContain('Your picks are still saved');
  expect(cards(stale)).toHaveLength(0);
  expect(localStorage.getItem(soccerKey)).toBe(partial);
  stale.unmount();

  setPoolFixture('squad', alternate);
  const mismatch = await open(route);
  await startDaily(mismatch);
  expect(mismatch.container.textContent).toContain('Your picks are still saved');
  expect(cards(mismatch)).toHaveLength(0);
  expect(localStorage.getItem(soccerKey)).toBe(partial);
  await click(button(mismatch.container, /^Unlimited/));
  expect(pickLine(mismatch)).toMatch(/^Pick 1 of /);
  await keep(mismatch, [0]);
  expect(localStorage.getItem(soccerKey)).toBe(partial);
  mismatch.unmount();

  const withoutKeepers = players.filter(player => player.position !== 'GK');
  expect(withoutKeepers.length).toBeGreaterThanOrEqual(100);
  setPoolFixture('squad', withoutKeepers);
  const unavailable = await open(route);
  await startDaily(unavailable);
  expect(unavailable.container.textContent).toContain('Your picks are still saved');
  expect(button(unavailable.container, /^Try again$/)).toBeDefined();
  expect(localStorage.getItem(soccerKey)).toBe(partial);
  unavailable.unmount();

  setPoolFixture('squad', players);
  const recovered = await open(route);
  await startDaily(recovered);
  expect(pickLine(recovered)).toMatch(/^Pick 5 of /);
  expect(cardNames(recovered)).toEqual(nextOffer);
  expect(squadLine(recovered)).toBe(progress);
  expect(localStorage.getItem(soccerKey)).toBe(partial);
  expect(recordCompletion).toHaveBeenCalledTimes(0);
});

it.each([routes[0], routes[1]])('keeps the saved choice when a stale $slug tab taps a different one', async route => {
  const key = route.slug + '-daily-' + date;
  const first = await open(route);
  const stale = await open(route);
  await startDaily(first);
  await startDaily(stale);
  const firstPicks = await keep(first, [2]);
  const stored = localStorage.getItem(key);
  expect(JSON.parse(stored ?? 'null')).toMatchObject({ kept: firstPicks });
  await keep(stale, [3]);
  expect(localStorage.getItem(key)).toBe(stored);
  expect(pickLine(stale)).toMatch(/^Pick 2 of /);
  expect(squadLine(stale)).toBe(squadLine(first));

  await keep(first, Array<number>(route.slots - 1).fill(0));
  const final = localStorage.getItem(key);
  await keep(stale, [0]);
  expect(localStorage.getItem(key)).toBe(final);
  expect(cards(stale)).toHaveLength(0);
  expect(button(stale.container, /^Back to modes$/)).toBeDefined();
  expect(recordCompletion).toHaveBeenCalledTimes(1);
});

it('records a fresh shared-board Unlimited run after a saved Daily review', async () => {
  const route = routes[1];
  const key = route.slug + '-daily-' + date;
  const page = await open(route);
  vi.useRealTimers();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(Date.UTC(2026, 10, 11, 17));
  await startDaily(page);
  await keep(page, [0, 0, 0, 0, 0]);
  const save = localStorage.getItem(key);
  const back = /^Back to modes$/;
  for (let tick = 0; tick < 7 && !findButton(page.container, back); tick += 1) {
    await act(async () => { vi.advanceTimersByTime(1000); });
  }
  await click(button(page.container, back));
  await startDaily(page);
  expect(recordCompletion).toHaveBeenCalledTimes(1);
  await click(button(page.container, back));
  await click(button(page.container, /^Unlimited/));
  await keep(page, [0, 0, 0, 0, 0]);
  expect(recordCompletion).toHaveBeenCalledTimes(2);
  expect(localStorage.getItem(key)).toBe(save);
});

it('checks each saved name against the offers for its original slot', async () => {
  const route = routes[0];
  const first = await open(route);
  await startDaily(first);
  await keep(first, [2]);
  const record = JSON.parse(localStorage.getItem(soccerKey) ?? 'null');
  const [laterOffer] = cardNames(first);
  expect(record.kept).toHaveLength(1);
  record.kept[0] = laterOffer;
  const bad = JSON.stringify(record);
  localStorage.setItem(soccerKey, bad);
  first.unmount();

  const second = await open(route);
  await startDaily(second);
  expect(cards(second)).toHaveLength(0);
  expect(second.container.textContent).toContain('Your picks are still saved');
  expect(localStorage.getItem(soccerKey)).toBe(bad);
  expect(recordCompletion).toHaveBeenCalledTimes(0);
});

it('can save the full pick prefix when storage recovers after a refused pick', async () => {
  const route = routes[0];
  const first = await open(route);
  await startDaily(first);
  const firstPicks = await keep(first, [2]);
  const partial = localStorage.getItem(soccerKey);
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new DOMException('Fixture write refused', 'QuotaExceededError');
  });
  let refusedPicks: string[];
  try {
    refusedPicks = await keep(first, [4]);
    expect(write.mock.calls[0][0]).toBe(soccerKey);
    expect(localStorage.getItem(soccerKey)).toBe(partial);
  } finally {
    write.mockRestore();
  }
  const newPicks = await keep(first, [1]);
  expect(JSON.parse(localStorage.getItem(soccerKey) ?? 'null').kept).toEqual([...firstPicks, ...refusedPicks, ...newPicks]);
  first.unmount();

  const second = await open(route);
  await startDaily(second);
  expect(pickLine(second)).toMatch(/^Pick 4 of /);
  expect(recordCompletion).toHaveBeenCalledTimes(0);
});

it.each(['different picks', 'different deal'] as const)('preserves a peer partial with %s before retrying an unsaved result', async difference => {
  const route = routes[0];
  const first = await open(route);
  await startDaily(first);
  if (difference === 'different deal') setPoolFixture('squad', alternateSoccerPool().alternate);
  const peer = await open(route);
  await startDaily(peer);
  vi.useRealTimers();
  const write = Storage.prototype.setItem;
  const refused = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
    if (name === soccerKey) throw new DOMException('Fixture quota refusal', 'QuotaExceededError');
    write.call(this, name, value);
  });
  try {
    await gauntlet.finish(first);
    expect(refused.mock.calls.filter(([name]) => name === soccerKey)).toHaveLength(11);
  } finally {
    refused.mockRestore();
  }
  expect(localStorage.getItem(soccerKey)).toBeNull();
  const picked = await keep(peer, [difference === 'different deal' ? 0 : 2]);
  const peerPartial = localStorage.getItem(soccerKey);
  expect(JSON.parse(peerPartial ?? 'null')).toMatchObject({ kept: picked });

  const retry = /^Retry save$/;
  await click(button(first.container, retry));
  expect(localStorage.getItem(soccerKey)).toBe(peerPartial);
  expect(gauntlet.status(first)).toBe('finished');
  expect(gauntlet.fingerprint(first)).toContain('with a 87 rated XI');
  expect(first.container.textContent).toContain('Another tab saved a different Daily draft');
  expect(recordCompletion).toHaveBeenCalledTimes(1);

  await gauntlet.finish(peer);
  const peerFinal = localStorage.getItem(soccerKey);
  await click(button(first.container, retry));
  expect(localStorage.getItem(soccerKey)).toBe(peerFinal);
  expect(gauntlet.fingerprint(first)).toBe(gauntlet.fingerprint(peer));
  expect(recordCompletion).toHaveBeenCalledTimes(2);
});
