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

  it('keeps the post-commit guest handle in memory when storage is unavailable', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    const rendered = renderHook(() => usePlayerName(null));

    await waitFor(() => expect(rendered.result.current).toBe('ClinicalVolley-10'));
    expect(random).toHaveBeenCalledTimes(3);
  });

  it('does not carry an in-memory handle across an auth identity change', async () => {
    const random = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValue(0.5);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    const rendered = renderHook(
      ({ identity }) => usePlayerName(null, identity),
      { initialProps: { identity: 'guest' } },
    );
    await waitFor(() => expect(rendered.result.current).toBe('ClinicalVolley-10'));

    rendered.rerender({ identity: 'account-a' });

    await waitFor(() => expect(rendered.result.current).toBe('CasualReturner-55'));
    expect(random).toHaveBeenCalledTimes(6);
  });

  it('hides an in-memory profile name on the first render after the profile changes', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    const renderedNames: Array<string | null> = [];
    const rendered = renderHook(
      ({ profile }) => {
        const name = usePlayerName(profile, 'account-a');
        renderedNames.push(name);
        return name;
      },
      {
        initialProps: {
          profile: { display_name: 'Alpha' } as { display_name: string } | null,
        },
      },
    );
    await waitFor(() => expect(rendered.result.current).toBe('Alpha'));

    renderedNames.length = 0;
    rendered.rerender({ profile: null });

    expect(renderedNames[0]).toBeNull();
    await waitFor(() => expect(rendered.result.current).toBe('ClinicalVolley-10'));
  });

  it('drops the previous profile name on the first render after identity changes', () => {
    localStorage.setItem('dukb-display-name', 'Alpha');
    localStorage.setItem('dukb-guest-handle', 'IcyPoacher-42');

    const rendered = renderHook(
      ({ profile }) => usePlayerName(profile),
      { initialProps: { profile: { display_name: 'Alpha' } as { display_name: string } | null } },
    );
    expect(rendered.result.current).toBe('Alpha');

    localStorage.removeItem('dukb-display-name');
    rendered.rerender({ profile: null });

    expect(rendered.result.current).toBe('IcyPoacher-42');
  });
});
