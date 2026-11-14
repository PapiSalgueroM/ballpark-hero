import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContinueRow } from '@/components/home/ContinueRow';
import FightPromoterModes from '@/components/fight-promoter/FightPromoterModes';
import { newPromoter } from '@/lib/fightPromoter';
import { newMmaPromotion } from '@/lib/mmaPromotion';
import { heldSaveEntry, routeSaveEntry } from '@/lib/brokenSaveRecovery';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const mmaKey = 'dukb-mma-promoter-v1';
const boxingKey = 'fight-promoter-save-v1';
const preference = 'fight-promoter-mode-v1';
const mma = JSON.stringify({
  version: 1, state: newMmaPromotion('Cage Ledger', 'home-resume'),
  plan: { venueId: 'club', ticketPrice: 25, bookings: [] }, view: 'dashboard', resultIndex: null,
});
const boxing = JSON.stringify({ st: newPromoter('Ring Ledger', 'home-resume') });
const card = () => screen.getByRole('link', { name: /Fight Promoter/ });

function app(initial = '/') {
  return render(<MemoryRouter initialEntries={[initial]}>
    <Routes>
      <Route path="/" element={<ContinueRow />} />
      <Route path="/fight-promoter" element={<><FightPromoterModes /><Link to="/">Go home</Link></>} />
    </Routes>
  </MemoryRouter>);
}

describe('Home resumes the selected Fight Promoter ledger', () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it('finds an MMA-only save even with a stale boxing preference and resumes it after reload', () => {
    localStorage.setItem(mmaKey, mma);
    localStorage.setItem(preference, 'boxing');
    const root = app();
    expect(card()).toHaveTextContent('Cage Ledger, event 1');
    const target = card().getAttribute('href')!;
    expect(target).toBe('/fight-promoter?mode=mma');
    fireEvent.click(card());
    expect(screen.getByText('Cage Ledger')).toBeInTheDocument();
    expect(localStorage.getItem(preference)).toBe('mma');
    root.unmount();
    app(target);
    expect(screen.getByText('Cage Ledger')).toBeInTheDocument();
    expect(localStorage.getItem(mmaKey)).toBe(mma);
    expect(localStorage.getItem(boxingKey)).toBeNull();
  });

  it('keeps an existing boxing save available when no MMA save exists', () => {
    localStorage.setItem(boxingKey, boxing);
    localStorage.setItem(preference, 'mma');
    app();
    expect(card()).toHaveTextContent('Ring Ledger, show 1');
    expect(card()).toHaveAttribute('href', '/fight-promoter?mode=boxing');
    fireEvent.click(card());
    expect(screen.getByText('Ring Ledger')).toBeInTheDocument();
    expect(localStorage.getItem(boxingKey)).toBe(boxing);
  });

  it('holds Home focus during sync and changes the link with the open promotion', () => {
    localStorage.setItem(boxingKey, boxing);
    localStorage.setItem(mmaKey, mma);
    localStorage.setItem(preference, 'boxing');
    app();
    const original = card();
    expect(original).toHaveTextContent('Ring Ledger');
    original.focus();
    act(() => {
      localStorage.setItem(preference, 'mma');
      window.dispatchEvent(new StorageEvent('storage', { key: preference, storageArea: localStorage }));
    });
    expect(card()).toBe(original);
    expect(original).toHaveFocus();
    expect(original).toHaveTextContent('Cage Ledger');
    fireEvent.click(original);
    expect(screen.getByText('Cage Ledger')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change sport' }));
    fireEvent.click(screen.getByRole('button', { name: 'Boxing' }));
    expect(screen.getByText('Ring Ledger')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Go home' }));
    expect(card()).toHaveTextContent('Ring Ledger');
    expect(card()).toHaveAttribute('href', '/fight-promoter?mode=boxing');
    expect(localStorage.getItem(mmaKey)).toBe(mma);
    expect(localStorage.getItem(boxingKey)).toBe(boxing);
  });

  it('uses the same mode for route-level save actions as the visible promotion', () => {
    localStorage.setItem(boxingKey, boxing);
    localStorage.setItem(mmaKey, mma);
    localStorage.setItem(preference, 'mma');
    expect(heldSaveEntry('/fight-promoter', localStorage)?.saveKey).toBe(mmaKey);
    expect(heldSaveEntry('/fight-promoter?mode=boxing', localStorage)?.saveKey).toBe(boxingKey);
    expect(routeSaveEntry('/fight-promoter?mode=mma')?.saveKey).toBe(mmaKey);
    expect(routeSaveEntry('/fight-promoter?mode=mma&mode=boxing')).toBeNull();
  });
});
