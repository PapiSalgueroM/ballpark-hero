import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContinueRow } from '@/components/home/ContinueRow';
import { FeaturedStage } from '@/components/home/FeaturedStage';

vi.mock('@/components/home/art/HomeArt', () => ({ default: () => null }));

const soccer = 'soccerCareerSave';
const nrl = 'nrl-manager-save-v1-slot-2';
const example = '{"currentClub":"Arsenal","age":23}';

function mount() {
  render(<MemoryRouter><FeaturedStage /><ContinueRow /></MemoryRouter>);
}

function announce(key: string | null, newValue: string | null = null, storageArea = localStorage) {
  act(() => window.dispatchEvent(new StorageEvent('storage', { key, newValue, storageArea })));
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Home career resume links', () => {
  it('reflects a new career or deletion while Home stays open', () => {
    mount();
    const stage = screen.getByRole('link', { name: /Soccer Career.*Start your career/ });
    stage.focus();
    expect(screen.queryByRole('heading', { name: 'Continue playing' })).not.toBeInTheDocument();
    localStorage.setItem(soccer, example);
    announce(soccer, example);
    expect(stage).toHaveTextContent('Continue your career');
    expect(stage).toHaveFocus();
    expect(screen.getByRole('link', { name: /Soccer Career Arsenal, age 23/ })).toHaveAttribute('href', '/soccer-career');
    localStorage.removeItem(soccer);
    announce(soccer);
    expect(stage).toHaveTextContent('Start your career');
    expect(screen.queryByRole('heading', { name: 'Continue playing' })).not.toBeInTheDocument();
    expect(localStorage.getItem(soccer)).toBeNull();
  });

  it('uses current bytes and ignores unrelated or session storage events', () => {
    localStorage.setItem(soccer, example);
    mount();
    localStorage.setItem(soccer, '{"currentClub":"Ajax","age":24}');
    const read = vi.spyOn(Storage.prototype, 'getItem');
    announce('other');
    announce(soccer, example, sessionStorage);
    expect(read).not.toHaveBeenCalled();
    expect(screen.getByText('Arsenal, age 23')).toBeInTheDocument();
    announce(soccer, example);
    expect(screen.getByText('Ajax, age 24')).toBeInTheDocument();
  });

  it('updates an alternate NRL slot after browser restore and handles clearing all saves', () => {
    mount();
    localStorage.setItem(nrl, '{"season":{"year":2027}}');
    act(() => window.dispatchEvent(new Event('pageshow')));
    const slot = screen.getByRole('link', { name: /NRL Team Manager.*2027 season/ });
    expect(slot).toHaveAttribute('href', '/nrl-team-manager?slot=2');
    localStorage.clear();
    announce(null);
    expect(screen.queryByRole('heading', { name: 'Continue playing' })).not.toBeInTheDocument();
  });
});
