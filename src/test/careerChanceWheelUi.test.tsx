import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CareerChanceWheel from '@/components/soccer-career/CareerChanceWheel';
import type { CareerChanceWheelReceipt } from '@/lib/careerChanceWheel';
const receipt: CareerChanceWheelReceipt = { title: 'Contract negotiation', chance: .5, roll: .2, result: true, hit: '20% wage raise', miss: 'Relationship damaged', seen: false };
afterEach(cleanup);
describe('chance wheel reveal', () => {
  it('shows rules, true odds and an example before spinning', () => {
    const close = vi.fn(); render(<CareerChanceWheel receipt={receipt} onClose={close} />);
    expect(screen.getByRole('dialog', { name: 'Contract negotiation' })).toBeVisible();
    expect(screen.getByText(/30 of 100 equal parts/)).toBeVisible();
    expect(document.querySelector('[data-wheel-result]')).toHaveTextContent('Ready to reveal'); expect(close).not.toHaveBeenCalled();
  });
  it('lands on the saved draw without consuming randomness or changing the receipt', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('UI rerolled'); }), before = structuredClone(receipt);
    try { render(<CareerChanceWheel receipt={receipt} onClose={() => {}} />); fireEvent.click(screen.getByRole('button', { name: 'Spin the wheel' }));
      const disk = document.querySelector('[data-wheel-disk]')!; expect(disk).toHaveStyle({ transform: 'rotate(1368deg)' });
      fireEvent.transitionEnd(disk); expect(document.querySelector('[data-wheel-result]')).toHaveTextContent('20% wage raise'); expect(receipt).toEqual(before); expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });
  it('skipping preserves the saved losing result and continues only on command', () => {
    const close = vi.fn(); render(<CareerChanceWheel receipt={{ ...receipt, roll: .8, result: false }} onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show result' })); expect(document.querySelector('[data-wheel-result]')).toHaveTextContent('Relationship damaged'); expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' })); expect(close).toHaveBeenCalledTimes(1);
  });
  it('restoring the same receipt reveals the same result', () => {
    const first = render(<CareerChanceWheel receipt={receipt} onClose={() => {}} />); fireEvent.click(screen.getByRole('button', { name: 'Show result' })); const text = document.querySelector('[data-wheel-result]')?.textContent;
    first.unmount(); render(<CareerChanceWheel receipt={JSON.parse(JSON.stringify(receipt))} onClose={() => {}} />); fireEvent.click(screen.getByRole('button', { name: 'Show result' })); expect(document.querySelector('[data-wheel-result]')?.textContent).toBe(text);
  });
  it('reduced motion reveals the saved result without animating or drawing again', () => {
    const media = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('Reduced motion rerolled'); });
    const before = structuredClone(receipt);
    try { render(<CareerChanceWheel receipt={receipt} onClose={() => {}} />); fireEvent.click(screen.getByRole('button', { name: 'Spin the wheel' }));
      expect(document.querySelector('[data-wheel-disk]')).toHaveStyle({ transition: 'none' });
      expect(document.querySelector('[data-wheel-result]')).toHaveTextContent('20% wage raise');
      expect(receipt).toEqual(before); expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); media.mockRestore(); }
  });
});
