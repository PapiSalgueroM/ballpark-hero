import { useEffect } from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useArrivalTop } from '@/hooks/useArrivalTop';

/* Round 1328: the hub's landing hook. A new screen lands at its top before the
   first paint, once per entry, and never moves a top that is already readable.
   jsdom has no layout, so every element reports the rectangle set below and
   nothing is pinned to either edge of the screen. */

let rect = { top: 0, bottom: 600, height: 600 };
let scrollSpy: ReturnType<typeof vi.fn>;

function Probe({ k }: { k: string | null }) {
  const ref = useArrivalTop<HTMLDivElement>(k);
  return <div ref={ref}>hub</div>;
}

/* A passive effect inside the new screen, which React runs after the browser
   may already have painted. Children run their effects before their parent
   in each phase, so this one sees the move only when the hook made it in the
   layout phase, which runs to the end before any passive effect starts. */
function PassiveWitness({ seen }: { seen: number[] }) {
  useEffect(() => { seen.push(scrollSpy.mock.calls.length); }, [seen]);
  return null;
}
function ProbeWithWitness({ k, seen }: { k: string | null; seen: number[] }) {
  const ref = useArrivalTop<HTMLDivElement>(k);
  return <div ref={ref}>hub<PassiveWitness seen={seen} /></div>;
}

beforeEach(() => {
  scrollSpy = vi.fn();
  Object.defineProperty(document, 'elementsFromPoint', { value: () => [], configurable: true, writable: true });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: scrollSpy, configurable: true, writable: true });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    top: rect.top, bottom: rect.bottom, height: rect.height, left: 0, right: 390, width: 390, x: 0, y: rect.top,
    toJSON: () => ({}),
  }) as DOMRect);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useArrivalTop', () => {
  it('a top far above the screen lands once, at block start, instantly', () => {
    rect = { top: -1700, bottom: -1100, height: 600 };
    render(<Probe k="hub" />);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy.mock.calls[0][0]).toMatchObject({ block: 'start', behavior: 'instant' });
  });

  it('the move is made in the layout phase, before paint: a passive effect of the new screen already sees it', () => {
    rect = { top: -1700, bottom: -1100, height: 600 };
    const seen: number[] = [];
    render(<ProbeWithWitness k="hub" seen={seen} />);
    expect(seen).toEqual([1]);
  });

  it('a tall screen that spans the viewport but starts above it lands (the real hub shape)', () => {
    rect = { top: -1700, bottom: 3000, height: 4700 };
    render(<Probe k="hub" />);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it('a top that is already readable moves nothing', () => {
    rect = { top: 40, bottom: 640, height: 600 };
    render(<Probe k="hub" />);
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('a top below the fold with too little of it showing lands', () => {
    rect = { top: window.innerHeight - 20, bottom: window.innerHeight + 580, height: 600 };
    render(<Probe k="hub" />);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it('a null key does nothing', () => {
    rect = { top: -1700, bottom: -1100, height: 600 };
    render(<Probe k={null} />);
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('a rerender with the same key does nothing more', () => {
    rect = { top: -1700, bottom: -1100, height: 600 };
    const { rerender } = render(<Probe k="hub" />);
    rerender(<Probe k="hub" />);
    rerender(<Probe k="hub" />);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it('a zero height element does nothing', () => {
    rect = { top: -1700, bottom: -1700, height: 0 };
    render(<Probe k="hub" />);
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('leaving (null) and coming back (hub) lands again', () => {
    rect = { top: -1700, bottom: -1100, height: 600 };
    const { rerender } = render(<Probe k="hub" />);
    rerender(<Probe k={null} />);
    rerender(<Probe k="hub" />);
    expect(scrollSpy).toHaveBeenCalledTimes(2);
  });
});
