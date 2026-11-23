import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContinueRow } from '@/components/home/ContinueRow';
import { FeaturedStage } from '@/components/home/FeaturedStage';
import { clubEraClubs, clubTableNames } from '@/data/lineupTeams';
import { FORMATIONS } from '@/types/lineupBuilder';

vi.mock('@/components/home/art/HomeArt', () => ({ default: () => null }));

const soccer = 'soccerCareerSave';
const nrl = 'nrl-manager-save-v1-slot-2';
const xi = 'dukb-build-your-xi-draft-v1';
const example = '{"currentClub":"Arsenal","age":23}';

function legacyXi(count: number, year = 2012) {
  const formation = '4-4-2';
  const teamAssignments = clubEraClubs.slice(0, 11).map(name => ({ name, isNation: false }));
  return JSON.stringify({
    formation, draftChoice: { mode: 'club-era', year: 2008 }, teamAssignments,
    slots: FORMATIONS[formation].slice(0, count).map((slot, index) => {
      const club = teamAssignments[index].name, playerName = 'Fixture Draft Pick ' + index;
      return [index, { ...slot, playerName, assignedTeam: club, isNation: false,
        pick: { rawName: playerName, rawPosition: slot.role, club: clubTableNames(club)[0], year } }];
    }),
  });
}

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
    expect(screen.getByRole('link', { name: /Soccer Career Slot 1.*Arsenal, age 23/ })).toHaveAttribute('href', '/soccer-career');
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
    expect(screen.getByText(/Arsenal, age 23/)).toBeInTheDocument();
    announce(soccer, example);
    expect(screen.getByText(/Ajax, age 24/)).toBeInTheDocument();
  });

  it('opens the actual Soccer Career slots from Home and updates the lead link when a slot is removed', () => {
    const secondKey = 'soccerCareerSave-slot-2';
    const thirdKey = 'soccerCareerSave-slot-3';
    const second = '{"currentClub":"Benfica","age":25}';
    const third = '{"currentClub":"Ajax","age":28}';
    localStorage.setItem(secondKey, second);
    localStorage.setItem(thirdKey, third);
    mount();

    const stage = screen.getByRole('link', { name: /Soccer Career.*Continue your career/ });
    expect(stage).toHaveAttribute('href', '/soccer-career?slot=2');
    const two = screen.getByRole('link', { name: /Soccer Career Slot 2.*Benfica, age 25/ });
    const three = screen.getByRole('link', { name: /Soccer Career Slot 3.*Ajax, age 28/ });
    expect(two).toHaveAttribute('href', '/soccer-career?slot=2');
    expect(three).toHaveAttribute('href', '/soccer-career?slot=3');
    three.focus();

    localStorage.removeItem(secondKey);
    announce(secondKey);
    expect(two).not.toBeInTheDocument();
    expect(three).toHaveFocus();
    expect(stage).toHaveAttribute('href', '/soccer-career?slot=3');
    expect(localStorage.getItem(thirdKey)).toBe(third);
    expect(localStorage.getItem(soccer)).toBeNull();
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

  it('shows separate NRL careers and keeps the surviving card focused after one is removed', () => {
    const firstKey = 'nrl-manager-save-v1';
    const first = '{"year":2026}';
    const second = '{"season":{"year":2027}}';
    localStorage.setItem(firstKey, first);
    localStorage.setItem(nrl, second);
    mount();
    const oldCareer = screen.getByRole('link', { name: /NRL Team Manager.*Slot 1.*2026 season/ });
    const otherCareer = screen.getByRole('link', { name: /NRL Team Manager.*Slot 2.*2027 season/ });
    expect(oldCareer).toHaveAttribute('href', '/nrl-team-manager');
    expect(otherCareer).toHaveAttribute('href', '/nrl-team-manager?slot=2');
    expect(localStorage.getItem(firstKey)).toBe(first);
    otherCareer.focus();
    localStorage.removeItem(firstKey);
    announce(firstKey);
    expect(oldCareer).not.toBeInTheDocument();
    expect(otherCareer).toHaveFocus();
    expect(localStorage.getItem(nrl)).toBe(second);
  });

  it('links to an older XI draft with its recorded progress and follows completion', () => {
    const started = legacyXi(1);
    localStorage.setItem(xi, started);
    mount();
    expect(screen.getByRole('link', { name: /Build Your XI.*4-4-2.*1\/11 picked/ })).toHaveAttribute('href', '/build-your-xi');
    expect(localStorage.getItem(xi)).toBe(started);

    const reviewing = legacyXi(11);
    localStorage.setItem(xi, reviewing);
    announce(xi, reviewing);
    expect(screen.getByRole('link', { name: /Build Your XI.*11\/11 picked/ })).toHaveAttribute('href', '/build-your-xi');
    expect(localStorage.getItem(xi)).toBe(reviewing);
    localStorage.removeItem(xi);
    announce(xi);
    expect(screen.queryByRole('heading', { name: 'Continue playing' })).not.toBeInTheDocument();
  });

  it('leaves the Home shelf hidden for empty, corrupt and out-of-range XI drafts', () => {
    mount();
    for (const raw of [legacyXi(0), '{damaged', legacyXi(1, 2013)]) {
      localStorage.setItem(xi, raw);
      announce(xi, raw);
      expect(screen.queryByRole('heading', { name: 'Continue playing' })).not.toBeInTheDocument();
      expect(localStorage.getItem(xi)).toBe(raw);
    }
  });
});
