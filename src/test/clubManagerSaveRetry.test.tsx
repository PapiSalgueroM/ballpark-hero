import './dailyReload/mocks';
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ClubManager from '@/pages/ClubManager';
import { SAVE_KEY, startCareer } from '@/lib/clubManager';
import { SLOTS_INDEX_KEY } from '@/lib/clubManagerSlots';
import { fenceKeyOf } from '@/lib/saveFence';
import * as completions from '@/lib/completions';
import { click, mountPage } from './dailyReload/harness';

const wait = { timeout: 10_000 };
const disk = () => localStorage.getItem(SAVE_KEY);
const mount = () => mountPage(<ClubManager />, '/club-manager');

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(completions, 'recordActivity').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

async function blockedMatch() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(startCareer('Crystal Palace')));
  const page = mount();
  const board = within(page.container);
  await click(await board.findByRole('button', { name: /^Resume Career$/ }, wait));
  const quick = await board.findByRole('button', { name: /Quick Sim/ }, wait);
  const before = disk()!;

  const setItem = Storage.prototype.setItem;
  const attempts: string[] = [];
  let blocked = true;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (this === localStorage && key === SAVE_KEY) {
      attempts.push(value);
      if (blocked) throw new DOMException('proof refusal', 'QuotaExceededError');
    }
    setItem.call(this, key, value);
  });
  await click(quick);
  const warning = await board.findByTestId('cm-save-failed');
  expect(await board.findByRole('button', { name: /^Continue$/ }, wait)).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(disk()).toBe(before);
  expect(JSON.parse(attempts[0]).week).toBe(JSON.parse(before).week + 1);
  expect(JSON.parse(attempts[0]).resultLog).toHaveLength(JSON.parse(before).resultLog.length + 1);
  expect(completions.recordActivity).toHaveBeenCalledTimes(1);

  const retry = within(warning).getByRole('button', { name: /^Retry save$/ });
  return { page, board, retry, before, attempts, allow: () => { blocked = false; } };
}

it('retries the exact earned match without advancing or replaying it', async () => {
  const proof = await blockedMatch();
  const latest = proof.attempts[0];
  await click(proof.retry);
  expect(proof.attempts).toHaveLength(4);
  expect(proof.attempts[2]).toBe(latest);
  expect(disk()).toBe(proof.before);
  expect(proof.board.getByTestId('cm-save-failed')).toBeVisible();

  proof.allow();
  await click(proof.retry);
  expect(proof.attempts).toHaveLength(5);
  expect(disk()).toBe(latest);
  expect(proof.board.queryByTestId('cm-save-failed')).toBeNull();
  expect(proof.board.getByRole('button', { name: /^Continue$/ })).toBeVisible();
  expect(completions.recordActivity).toHaveBeenCalledTimes(1);

  proof.page.unmount();
  const reloaded = within(mount().container);
  await click(await reloaded.findByRole('button', { name: /^Resume Career$/ }, wait));
  expect(await reloaded.findByRole('button', { name: /Quick Sim/ }, wait)).toBeVisible();
  expect(JSON.parse(disk()!).resultLog).toEqual(JSON.parse(latest).resultLog);
}, 60_000);

it.each(['save generation', 'manager slot'])('refuses retry after the active %s moved', async moved => {
  const proof = await blockedMatch();
  proof.allow();
  const replacement = JSON.stringify(startCareer('Arsenal'));
  localStorage.setItem(SAVE_KEY, replacement);
  if (moved === 'manager slot') localStorage.setItem(SLOTS_INDEX_KEY, JSON.stringify({ v: 1, active: 2 }));
  else localStorage.setItem(fenceKeyOf(SAVE_KEY), '999');
  const attempts = proof.attempts.length;

  await click(proof.retry);

  expect(await screen.findByTestId('save-moved-notice', {}, wait)).toBeVisible();
  expect(proof.attempts).toHaveLength(attempts);
  expect(disk()).toBe(replacement);
  expect(completions.recordActivity).toHaveBeenCalledTimes(1);
}, 60_000);
