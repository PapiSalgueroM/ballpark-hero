import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SoccerCareerSlots from '@/components/soccer-career/SoccerCareerSlots';
import { FALLBACK_CLUBS, initCareer } from '@/lib/soccerCareerEngine';
import { serializeSoccerCareerSave } from '@/lib/soccerCareerSave';

const SLOTS = [
  { path: '/soccer-career', saveKey: 'soccerCareerSave' },
  { path: '/soccer-career?slot=2', saveKey: 'soccerCareerSave-slot-2' },
  { path: '/soccer-career?slot=3', saveKey: 'soccerCareerSave-slot-3' },
];
const attrs = { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, reflexes: 60 };

function showSlots(backPath = '/soccer-career') {
  return render(<MemoryRouter>
    <SoccerCareerSlots slots={SLOTS} backPath={backPath} />
  </MemoryRouter>);
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('Soccer Career save chooser', () => {
  it('reads packed careers by player and links each slot to its own route without writing', () => {
    const career = initCareer('Fixture Forward', 'England', 'ST', '2020-24', attrs, 60, 2020, FALLBACK_CLUBS);
    const longCareer = { ...career, legacyFixtureData: 'older saved fields'.repeat(4_000) };
    const packed = serializeSoccerCareerSave(longCareer);
    expect(JSON.parse(packed).seasons.format).toBe('lz-string-utf16-career');
    localStorage.setItem(SLOTS[0].saveKey, packed);
    localStorage.setItem(SLOTS[2].saveKey, '{unreadable');
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const remove = vi.spyOn(Storage.prototype, 'removeItem');

    showSlots(SLOTS[0].path);

    expect(screen.getByRole('heading', { name: 'Career saves' })).toBeVisible();
    expect(screen.getByText('Fixture Forward')).toBeVisible();
    expect(screen.getByText(`${career.currentClub} · Age 16`)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Resume slot 1' })).toHaveAttribute('href', SLOTS[0].path);
    expect(screen.getByRole('link', { name: 'New career in slot 2' })).toHaveAttribute('href', SLOTS[1].path);
    expect(screen.getByRole('link', { name: 'Review slot 3' })).toHaveAttribute('href', SLOTS[2].path);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', SLOTS[0].path);
    expect(write).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('keeps a blocked slot distinct from an empty one and refreshes a changed key', () => {
    const read = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      if (key === SLOTS[0].saveKey) throw new Error('blocked read');
      return read.call(this, key);
    });
    showSlots(SLOTS[2].path);

    expect(screen.getByText('Storage unavailable')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'New career in slot 1' })).toBeNull();
    expect(screen.getByRole('link', { name: 'New career in slot 2' })).toHaveAttribute('href', SLOTS[1].path);
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', SLOTS[2].path);

    localStorage.setItem(SLOTS[1].saveKey, '{unreadable');
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: SLOTS[1].saveKey })); });
    expect(screen.getByRole('link', { name: 'Review slot 2' })).toHaveAttribute('href', SLOTS[1].path);
  });
});
