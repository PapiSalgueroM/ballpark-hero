/**
 * Round 782: the shootout order tile on the tactics tab, rendered for real.
 * The pre match card asks for it open (openTileRequest), a tap on a squad
 * tile adds the man next, a tap on his numbered chip takes him off, and the
 * back button closes the tile. The engine side (the walk and the odds) is
 * in clubManagerShootoutOrder.test.ts and scripts/simCmShootoutOrder.mjs.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TacticsScreen } from '@/components/club-manager/TacticsScreen';
import { startCareer, setShootoutOrder, SHOOTOUT_MAX_ORDER } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';

const noop = () => {};

describe('the shootout order tile', () => {
  it('opens on request, adds on tap, removes on a second tap, and backs out', () => {
    let career: CareerState = startCareer('Real Madrid');
    const onShootoutOrder = vi.fn((ids: string[]) => { career = setShootoutOrder(career, ids) ?? career; });
    const done = vi.fn();
    const draw = (req: 'shootout' | null) => (
      <TacticsScreen
        career={career}
        onFormation={noop} onMentality={noop} onSlot={noop} onSwap={noop} onAutoPick={noop}
        onDuty={noop} onSetPiece={noop} onAutoSetPieces={noop}
        onShootoutOrder={onShootoutOrder}
        openTileRequest={req}
        onOpenTileRequestDone={done}
      />
    );
    const { container, rerender } = render(draw('shootout'));
    const q = (sel: string) => container.querySelector(sel);

    /* Open on arrival, request handed back, nobody listed, the header says so. */
    expect(q('[data-cm-shootout-order]')).not.toBeNull();
    expect(done).toHaveBeenCalled();
    expect(q('[data-cm-so-empty]')).not.toBeNull();
    expect(q('[data-cm-so-count]')?.textContent).toBe(`0/${SHOOTOUT_MAX_ORDER}`);
    expect(q('[data-cm-so-clear]')).toBeNull();

    /* Tap the first squad tile: he is listed first. */
    const first = q('[data-cm-so-opt]') as HTMLButtonElement;
    const firstId = first.getAttribute('data-cm-so-opt')!;
    fireEvent.click(first);
    expect(onShootoutOrder).toHaveBeenLastCalledWith([firstId]);
    expect(career.shootoutOrder).toEqual([firstId]);
    rerender(draw(null));
    expect(q('[data-cm-so-pick]')?.getAttribute('data-cm-so-pick')).toBe(firstId);
    expect(q('[data-cm-so-count]')?.textContent).toBe(`1/${SHOOTOUT_MAX_ORDER}`);
    expect(q('[data-cm-so-clear]')).not.toBeNull();

    /* Tap a second tile: he is second, numbered 2 on his tile. */
    const second = container.querySelectorAll('[data-cm-so-opt]')[1] as HTMLButtonElement;
    const secondId = second.getAttribute('data-cm-so-opt')!;
    fireEvent.click(second);
    expect(career.shootoutOrder).toEqual([firstId, secondId]);
    rerender(draw(null));
    const picks = [...container.querySelectorAll('[data-cm-so-pick]')].map(el => el.getAttribute('data-cm-so-pick'));
    expect(picks).toEqual([firstId, secondId]);

    /* Tap the first man's chip: he comes off and the second man moves up to one. */
    fireEvent.click(q(`[data-cm-so-pick="${firstId}"]`)!);
    expect(career.shootoutOrder).toEqual([secondId]);
    rerender(draw(null));
    expect([...container.querySelectorAll('[data-cm-so-pick]')].map(el => el.getAttribute('data-cm-so-pick'))).toEqual([secondId]);

    /* Clear, then back. */
    fireEvent.click(q('[data-cm-so-clear]')!);
    expect('shootoutOrder' in career).toBe(false);
    rerender(draw(null));
    expect(q('[data-cm-so-empty]')).not.toBeNull();
    fireEvent.click(q('[data-cm-so-back]')!);
    expect(q('[data-cm-shootout-order]')).toBeNull();
    expect(q('[data-cm-tile-btn="shootout"]')).not.toBeNull();
  });

  it('stops at eleven and greys the rest', () => {
    let career: CareerState = startCareer('Real Madrid');
    const ids = career.squad.filter(p => !p.onLoan).slice(0, SHOOTOUT_MAX_ORDER).map(p => p.id);
    career = setShootoutOrder(career, ids)!;
    const onShootoutOrder = vi.fn();
    const { container } = render(
      <TacticsScreen
        career={career}
        onFormation={noop} onMentality={noop} onSlot={noop} onSwap={noop} onAutoPick={noop}
        onDuty={noop} onSetPiece={noop} onAutoSetPieces={noop}
        onShootoutOrder={onShootoutOrder}
        openTileRequest="shootout"
      />,
    );
    expect(container.querySelectorAll('[data-cm-so-pick]')).toHaveLength(SHOOTOUT_MAX_ORDER);
    const spare = [...container.querySelectorAll('[data-cm-so-opt]')].find(el => !ids.includes(el.getAttribute('data-cm-so-opt')!)) as HTMLButtonElement;
    expect(spare).toBeTruthy();
    expect(spare.disabled).toBe(true);
    fireEvent.click(spare);
    expect(onShootoutOrder).not.toHaveBeenCalled();
  });

  it('offers a loan signing in the eleven, so all eleven can be listed', () => {
    const base: CareerState = startCareer('Real Madrid');
    /* A loan signing (on loan TO the club) starting in the first slot. */
    const loanee = { ...base.squad[0], id: 'loanee-782', name: 'Loan Signing', onLoan: true, loanFrom: 'Elsewhere FC' };
    const career: CareerState = { ...base, squad: [...base.squad, loanee], xiIds: [loanee.id, ...base.xiIds.slice(1)] };
    const onShootoutOrder = vi.fn();
    const { container } = render(
      <TacticsScreen
        career={career}
        onFormation={noop} onMentality={noop} onSlot={noop} onSwap={noop} onAutoPick={noop}
        onDuty={noop} onSetPiece={noop} onAutoSetPieces={noop}
        onShootoutOrder={onShootoutOrder}
        openTileRequest="shootout"
      />,
    );
    const opt = container.querySelector(`[data-cm-so-opt="${loanee.id}"]`) as HTMLButtonElement | null;
    expect(opt).not.toBeNull();
    fireEvent.click(opt!);
    expect(onShootoutOrder).toHaveBeenLastCalledWith([loanee.id]);
  });
});
