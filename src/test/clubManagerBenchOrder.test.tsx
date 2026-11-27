import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BenchOrderCard } from '@/components/club-manager/BenchOrderCard';
import { effectiveXIWithSlots, isAvailable, nextFixture, playNextEntry, startCareer, type BenchOrder } from '@/lib/clubManager';

function seed(n: number) {
  vi.spyOn(Math, 'random').mockImplementation(() => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  });
}

function match() {
  seed(151);
  let career = startCareer('Brentford');
  while (nextFixture(career).kind === 'window') career = playNextEntry(career).state;
  const xi = effectiveXIWithSlots(career).map(slot => slot.p);
  const off = xi.find(p => p.position === 'ST')!;
  const on = career.squad.find(p => p.position === off.position && isAvailable(p) && xi.every(starter => starter.id !== p.id))!;
  const order: BenchOrder = { outId: off.id, inId: on.id, window: 'hour', when: 'ahead' };
  return { career, off, on, order };
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('makes the ordered change on the actual score, records the match, and preserves an untriggered ordinary sim', () => {
  const { career, off, on, order } = match();
  const before = JSON.stringify(career);
  function play(benchOrder?: BenchOrder) {
    seed(1);
    return playNextEntry(career, { skipHalftime: true, benchOrder }).report!;
  }
  const ordinary = play();
  const taken = play(order);
  const skipped = play({ ...order, when: 'not-ahead' });
  expect(taken.detail?.subs).toContainEqual({ off: off.name, on: on.name, minute: 62 });
  expect(taken.events[0]).toContain('as instructed');
  expect([taken.homeGoals, taken.awayGoals]).toEqual([1, 0]);
  expect(skipped.events[0]).toContain('score condition missed');
  expect({ ...skipped, events: skipped.events.slice(1) }).toEqual(ordinary);
  expect([ordinary.homeGoals, ordinary.awayGoals]).toEqual([1, 1]);
  const ineligible = play({ ...order, inId: off.id });
  expect(ineligible.events[0]).toContain('no longer available');
  expect({ ...ineligible, events: ineligible.events.slice(1) }).toEqual(ordinary);
  expect(JSON.stringify(career)).toBe(before);
});

it('requires two eligible named players and passes the selected condition and window to Quick Sim', () => {
  const { career, off, on, order } = match();
  const sim = vi.fn();
  render(<BenchOrderCard career={career} onSim={sim} />);
  fireEvent.click(screen.getByRole('button', { name: 'Quick Sim bench order' }));
  const submit = screen.getByRole('button', { name: 'Sim with this order' });
  expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Player coming off'), { target: { value: off.id } });
  fireEvent.change(screen.getByLabelText('Player coming on'), { target: { value: on.id } });
  fireEvent.change(screen.getByLabelText('When to check'), { target: { value: 'late' } });
  fireEvent.change(screen.getByLabelText('Score on the night'), { target: { value: 'not-ahead' } });
  fireEvent.click(submit);
  expect(sim).toHaveBeenCalledWith({ ...order, window: 'late', when: 'not-ahead' });
});
