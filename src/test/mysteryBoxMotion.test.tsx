import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MysteryBoxBoard } from '@/components/mystery-box/MysteryBoxBoard';
import { useMysteryBox, type MysteryBoxState } from '@/hooks/useMysteryBox';
import { FORMATIONS, playerRating } from '@/lib/squadDeal';
import type { PackPlayer, PackTier } from '@/lib/fetchPackPool';
import motion from '@/components/mystery-box/MysteryBoxMotion.module.css';

vi.mock('@/hooks/useMysteryBox', () => ({ TOTAL_PACKS: 15, useMysteryBox: vi.fn() }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/FlagImg', () => ({ FlagImg: ({ name }: { name: string }) => <span data-fixture-flag={name} /> }));

const player = (name: string, tier: PackTier = 'star'): PackPlayer => ({
  name: `Generated Fixture ${name}`, club: 'Fixture Club', nationality: 'Fixture Nation', league: 'Other',
  goals: 7, assists: 3, position: 'CM', kitNumber: 18, age: 22, marketValue: 36.5, difficulty: 'easy', tier, fixedOverall: 83,
});
const first = player('First');
const second = player('Second', 'quality');
const empty = () => Array<PackPlayer | undefined>(11).fill(undefined);
let state: MysteryBoxState;
beforeEach(() => {
  vi.clearAllMocks();
  state = {
    loading: false, formation: FORMATIONS[0], packIndex: 0, current: null, revealed: false, squad: empty(), compatibleSlots: [],
    discards: 0, finished: false, rating: 45, filled: 0, bestPull: null,
    openPack: vi.fn(), place: vi.fn(), discard: vi.fn(), shareText: 'Fixture share payload',
  };
  vi.mocked(useMysteryBox).mockImplementation(() => state);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const draw = () => <MemoryRouter><MysteryBoxBoard /></MemoryRouter>;
const slots = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll<HTMLButtonElement>('[data-mystery-slot]')];
const reveal = (current = first, compatibleSlots = [5, 6]) => { state = { ...state, current, revealed: true, compatibleSlots }; };

describe('Mystery Box settled card and slot feedback', () => {
  it('keeps eleven sealed slots quiet and opens only through its existing action', () => {
    const view = render(draw());
    expect(slots(view)).toHaveLength(11);
    expect(slots(view).every(slot => slot.disabled)).toBe(true);
    expect(view.container.querySelector('[data-mystery-card]')).toBeNull();
    expect(view.container.querySelector('[data-compatible-cue]')).toBeNull();
    expect(view.container.querySelector('[data-placement]')).toBeNull();
    for (const slot of slots(view)) fireEvent.click(slot);
    expect(state.place).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Open it' }));
    expect(state.openPack).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'click' }));
    expect(state.discard).not.toHaveBeenCalled();
  });

  it('reveals exact already drawn values and all five existing tier styles', () => {
    const tiers = [
      ['superstar', 'SUPERSTAR', 'text-purple-400'], ['star', 'Star', 'text-gold'],
      ['quality', 'Quality', 'text-emerald-500'], ['squad', 'Squad player', 'text-foreground'], ['fringe', 'Fringe', 'text-muted-foreground'],
    ] as const;
    const view = render(draw());
    for (const [tier, label, color] of tiers) {
      const current = player(tier, tier);
      reveal(current);
      view.rerender(draw());
      const card = view.container.querySelector('[data-mystery-card]')!;
      expect(card).toHaveClass(motion.drawn);
      expect(card).toHaveAttribute('data-pack-tier', tier);
      expect(screen.getByText(label)).toHaveClass(color);
      expect(card).toHaveTextContent(current.name);
      expect(card).toHaveTextContent('Fixture Club · CM · 22y');
      expect(card).toHaveTextContent(String(playerRating(current)));
      expect(card).toHaveTextContent('€36.5M');
      expect(card.querySelector('[data-fixture-flag]')).toHaveAttribute('data-fixture-flag', current.nationality);
      expect(state.place).not.toHaveBeenCalled();
      expect(state.openPack).not.toHaveBeenCalled();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Bin him' }));
    expect(state.discard).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'click' }));
  });

  it('cues only compatible stable slots and passes each enabled exact index once', () => {
    reveal();
    const view = render(draw());
    const original = slots(view);
    expect(view.container.querySelectorAll('[data-compatible-cue]')).toHaveLength(2);
    for (let index = 0; index < original.length; index++) {
      const slot = original[index];
      expect(slot.disabled).toBe(![5, 6].includes(index));
      if ([5, 6].includes(index)) {
        expect(slot.querySelector('[data-compatible-cue]')).toHaveClass(motion.compatible);
        expect(slot).not.toHaveClass('animate-pulse');
        fireEvent.click(slot);
      } else {
        expect(slot.querySelector('[data-compatible-cue]')).toBeNull();
        fireEvent.click(slot);
      }
    }
    expect(state.place).toHaveBeenCalledTimes(2);
    expect(vi.mocked(state.place).mock.calls).toEqual([[5], [6]]);
    expect(view.container.querySelector('[data-placement]')).toBeNull();
    state = { ...state, squad: [...state.squad], compatibleSlots: [...state.compatibleSlots] };
    view.rerender(draw());
    expect(slots(view)).toEqual(original);
  });

  it('retains card, cue, Bin and slot nodes on cloned state and renews only new card cues', () => {
    reveal();
    const view = render(draw());
    const original = slots(view);
    const card = view.container.querySelector('[data-mystery-card]')!;
    const cue = original[5].querySelector('[data-compatible-cue]');
    const bin = screen.getByRole('button', { name: 'Bin him' });
    act(() => bin.focus());
    state = { ...state, current: { ...first }, squad: [...state.squad], compatibleSlots: [...state.compatibleSlots] };
    view.rerender(draw());
    expect(view.container.querySelector('[data-mystery-card]')).toBe(card);
    expect(original[5].querySelector('[data-compatible-cue]')).toBe(cue);
    expect(screen.getByRole('button', { name: 'Bin him' })).toBe(bin);
    expect(document.activeElement).toBe(bin);
    state = { ...state, packIndex: 1, current: second };
    view.rerender(draw());
    const nextCard = view.container.querySelector('[data-mystery-card]')!;
    expect(nextCard).not.toBe(card);
    expect(nextCard).toHaveClass(motion.drawn);
    expect(nextCard).toHaveTextContent(second.name);
    expect(original[5].querySelector('[data-compatible-cue]')).not.toBe(cue);
    expect(original[5].querySelector('[data-compatible-cue]')).toHaveClass(motion.compatible);
    expect(screen.getByRole('button', { name: 'Bin him' })).toBe(bin);
    expect(document.activeElement).toBe(bin);
    expect(slots(view)).toEqual(original);
  });

  it('acknowledges only committed newly filled slots and preserves names, ratings and identities', () => {
    reveal();
    const view = render(draw());
    const original = slots(view);
    fireEvent.click(original[5]);
    expect(state.place).toHaveBeenCalledExactlyOnceWith(5);
    expect(view.container.querySelector('[data-placement]')).toBeNull();
    const squad = empty(); squad[5] = first;
    state = { ...state, packIndex: 1, current: null, revealed: false, squad, compatibleSlots: [], rating: 48, filled: 1 };
    view.rerender(draw());
    expect(original[5]).toHaveAttribute('data-placement', 'latest');
    expect(original[5]).toHaveClass(motion.placed);
    expect(original[5]).toHaveTextContent(String(playerRating(first)));
    expect(original[5]).toHaveTextContent('€36.5M');
    const name = screen.getByTitle(first.name);
    expect(name).toHaveTextContent(first.name);
    state = { ...state, squad: state.squad.map(p => p ? { ...p } : p) };
    view.rerender(draw());
    expect(screen.getByTitle(first.name)).toBe(name);
    expect(original[5]).toHaveClass(motion.placed);
    expect(original[5]).toHaveAttribute('data-placement', 'latest');
    expect(slots(view)).toEqual(original);
    reveal(second, [6]); view.rerender(draw());
    const nextSquad = [...state.squad]; nextSquad[6] = second;
    state = { ...state, packIndex: 2, current: null, revealed: false, squad: nextSquad, compatibleSlots: [], rating: 52, filled: 2 };
    view.rerender(draw());
    expect(original[5]).not.toHaveClass(motion.placed);
    expect(original[6]).toHaveClass(motion.placed);
    expect(view.container.querySelectorAll('[data-placement="latest"]')).toHaveLength(1);
    expect(slots(view)).toEqual(original);
    state = { ...state, packIndex: 3, discards: 1 }; view.rerender(draw());
    expect(view.container.querySelector('[data-placement]')).toBeNull();
    expect(screen.getByTitle(first.name)).toBe(name);
  });

  it('keeps already restored placements quiet when the pool finishes loading', () => {
    state = { ...state, loading: true, packIndex: 3 };
    const view = render(draw());
    const squad = empty(); squad[5] = first;
    state = { ...state, loading: false, squad, rating: 48, filled: 1, discards: 2 };
    view.rerender(draw());
    expect(slots(view)).toHaveLength(11);
    expect(view.container.querySelector('[data-placement]')).toBeNull();
    expect(slots(view).every(slot => !slot.classList.contains(motion.placed))).toBe(true);
    expect(screen.getByTitle(first.name)).toHaveTextContent(first.name);
    expect(state.place).not.toHaveBeenCalled();
  });

  it('keeps an incompatible draw unselectable and the existing Bin action immediate', () => {
    reveal(first, []);
    const view = render(draw());
    expect(screen.getByText('No compatible slot is open. Bin him to move on.')).toBeInTheDocument();
    expect(view.container.querySelector('[data-compatible-cue]')).toBeNull();
    for (const slot of slots(view)) { expect(slot).toBeDisabled(); fireEvent.click(slot); }
    expect(state.place).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Bin him' }));
    expect(state.discard).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'click' }));
  });

  it('preserves finished figures, best pull and exact existing share payload', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const squad = empty(); squad[5] = first;
    state = { ...state, packIndex: 15, squad, filled: 1, discards: 14, rating: 48, finished: true, bestPull: first };
    const view = render(draw());
    expect(screen.getByText('Final squad')).toBeInTheDocument();
    expect(screen.getByText(/1\/11 filled · best pull:/)).toHaveTextContent(first.name);
    expect(screen.getAllByText('48')).toHaveLength(2);
    expect(view.container.querySelector('[data-mystery-card]')).toBeNull();
    expect(view.container.querySelector('[data-placement]')).toBeNull();
    /* Round 951: the shared result moment shows the same rating, and a short
       XI is a good try, never a win. */
    expect(view.container.querySelector('[data-result-score]')).toHaveTextContent('48');
    expect(view.container.querySelector('[data-result-moment]')).toHaveAttribute('data-result-moment', 'close');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Share result' })));
    expect(writeText).toHaveBeenCalledExactlyOnceWith(state.shareText);
    vi.unstubAllGlobals();
  });
});
