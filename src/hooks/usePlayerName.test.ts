import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getStoredPlayerName } from '@/lib/completions';
import { usePlayerName } from '@/hooks/usePlayerName';

describe('usePlayerName', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('reads without random work during initialization, then mints one persistent handle after commit', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(getStoredPlayerName()).toBeNull();
    expect(random).not.toHaveBeenCalled();

    const rendered = renderHook(() => usePlayerName(null));
    await waitFor(() => expect(rendered.result.current).toBe('ClinicalVolley-10'));

    expect(random).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem('dukb-guest-handle')).toBe('ClinicalVolley-10');
    expect(getStoredPlayerName()).toBe('ClinicalVolley-10');
    expect(random).toHaveBeenCalledTimes(3);
  });
});
