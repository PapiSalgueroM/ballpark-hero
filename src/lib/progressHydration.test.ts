import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ensureProgressHydration,
  getProgressHydrationSnapshot,
  resetProgressHydration,
} from '@/lib/progressHydration';

describe('progress hydration state', () => {
  afterEach(() => {
    resetProgressHydration(null);
  });

  it('keeps a successful decision for duplicate callbacks from the same identity', async () => {
    resetProgressHydration('user-1');
    const firstHydrate = vi.fn(async () => true);
    const duplicateHydrate = vi.fn(async () => true);

    await expect(ensureProgressHydration('user-1', firstHydrate)).resolves.toBe(true);
    expect(getProgressHydrationSnapshot()).toMatchObject({
      userId: 'user-1',
      status: 'ready',
      promise: null,
    });

    await expect(ensureProgressHydration('user-1', duplicateHydrate)).resolves.toBe(true);
    expect(firstHydrate).toHaveBeenCalledTimes(1);
    expect(duplicateHydrate).not.toHaveBeenCalled();
  });

  it('keeps a failed decision distinct until the identity changes', async () => {
    resetProgressHydration('user-1');
    const failedHydrate = vi.fn(async () => false);
    const duplicateHydrate = vi.fn(async () => true);

    await expect(ensureProgressHydration('user-1', failedHydrate)).resolves.toBe(false);
    await expect(ensureProgressHydration('user-1', duplicateHydrate)).resolves.toBe(false);
    expect(getProgressHydrationSnapshot()).toMatchObject({
      userId: 'user-1',
      status: 'failed',
      promise: null,
    });
    expect(duplicateHydrate).not.toHaveBeenCalled();

    resetProgressHydration('user-2');
    await expect(ensureProgressHydration('user-2', duplicateHydrate)).resolves.toBe(true);
    expect(duplicateHydrate).toHaveBeenCalledTimes(1);
  });
});
