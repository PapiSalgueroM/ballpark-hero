import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DailyRail } from '@/components/home/DailyRail';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Home Daily puzzle rail edges', () => {
  it.each(['horizontal', 'vertical'] as const)('keeps the %s navigation honest at each edge', axis => {
    const horizontal = axis === 'horizontal';
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const { container } = render(<MemoryRouter><DailyRail today="2026-11-13" /></MemoryRouter>);
    const rail = container.querySelector('ul')!.parentElement!;
    const back = screen.getByRole('button', { name: 'Scroll the daily puzzles back' });
    const forward = screen.getByRole('button', { name: 'Scroll the daily puzzles on' });
    const scrollBy = vi.fn();
    Object.defineProperties(rail, {
      clientWidth: { value: 320 }, scrollWidth: { value: horizontal ? 1000 : 320 },
      clientHeight: { value: 280 }, scrollHeight: { value: horizontal ? 280 : 1000 },
      scrollBy: { value: scrollBy },
    });
    const moveTo = (offset: number) => {
      if (horizontal) rail.scrollLeft = offset;
      else rail.scrollTop = offset;
      fireEvent.scroll(rail);
    };
    moveTo(0.5);
    expect(back).toHaveAttribute('aria-disabled', 'true');
    expect(forward).toHaveAttribute('aria-disabled', 'false');
    fireEvent.click(back);
    expect(scrollBy).not.toHaveBeenCalled();

    moveTo(horizontal ? 679.5 : 719.5);
    expect(forward).toHaveAttribute('aria-disabled', 'true');
    expect(back).toHaveAttribute('aria-disabled', 'false');
    forward.focus();
    fireEvent.click(forward);
    expect(forward).toHaveFocus();
    expect(scrollBy).not.toHaveBeenCalled();
    fireEvent.click(back);
    expect(scrollBy).toHaveBeenCalledWith(horizontal ? { left: -256, behavior: 'auto' } : { top: -224, behavior: 'auto' });

    moveTo(400);
    expect(forward).toHaveAttribute('aria-disabled', 'false');
    fireEvent.click(forward);
    expect(scrollBy).toHaveBeenLastCalledWith(horizontal ? { left: 256, behavior: 'auto' } : { top: 224, behavior: 'auto' });
  });

  it('remeasures both track and content when a resize changes the scroll axis', () => {
    const observe = vi.fn(), disconnect = vi.fn();
    let resize: () => void;
    vi.stubGlobal('ResizeObserver', class {
      constructor(measure: () => void) { resize = measure; }
      observe = observe;
      disconnect = disconnect;
    });
    const { container, unmount } = render(<MemoryRouter><DailyRail today="2026-11-13" /></MemoryRouter>);
    const content = container.querySelector('ul')!, rail = content.parentElement!;
    const forward = screen.getByRole('button', { name: 'Scroll the daily puzzles on' });
    expect(observe.mock.calls).toEqual([[rail], [content]]);
    expect(forward).toHaveAttribute('aria-disabled', 'true');
    Object.defineProperties(rail, {
      clientWidth: { value: 320 }, scrollWidth: { value: 320 },
      clientHeight: { value: 280 }, scrollHeight: { value: 1000 },
    });
    act(resize!);
    expect(forward).toHaveAttribute('aria-disabled', 'false');
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
