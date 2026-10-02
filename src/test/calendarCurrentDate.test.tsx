import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CalendarScreen } from '@/components/club-manager/CalendarScreen';
import { startCareer, type CareerState } from '@/lib/clubManager';
import { seasonDays, fastForwardTargets, shortDate, MONTH_NAMES } from '@/lib/clubManagerCalendar';

const fixture = () => startCareer('Brentford');
const title = (date: { y: number; m: number }) => `${MONTH_NAMES[date.m - 1]} ${date.y}`;
const january = (career: CareerState) => ({ ...career, week: seasonDays(career).entryDates.findIndex(date => date.m === 1) });
function mount(career = fixture()) {
  const onSimTo = vi.fn(), onSetTraining = vi.fn();
  const view = render(<CalendarScreen career={career} onSimTo={onSimTo} onSetTraining={onSetTraining} />);
  return { ...view, career, onSimTo, onSetTraining };
}
type View = ReturnType<typeof mount>;
const cells = (view: View) => within(view.getByTestId('cm-calendar-grid')).getAllByRole('button');
const inspect = (view: View) => { const cell = cells(view)[4]; fireEvent.click(cell); expect(cell).toHaveAttribute('aria-pressed', 'true'); expect(view.getByTestId('cm-calendar-day')).toBeVisible(); return cell; };
const currentButton = (view: View) => view.getByRole('button', { name: 'Current date' });
function expectCurrent(view: View, career: CareerState) {
  const today = seasonDays(career).today;
  expect(view.getByText(title(today), { exact: true })).toBeVisible();
  const todayCell = cells(view).find(cell => cell.getAttribute('aria-label')?.startsWith(`${shortDate(today)}:`));
  expect(todayCell).not.toBeUndefined(); expect(todayCell).toHaveClass('bg-primary/10');
  expect(todayCell!.querySelector('span')).toHaveClass('text-primary', 'font-bold');
  expect(view.queryByTestId('cm-calendar-day')).toBeNull();
  expect(cells(view).every(cell => cell.getAttribute('aria-pressed') === 'false')).toBe(true);
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Club Manager calendar current date', () => {
  it('preserves bounded month browsing and day inspection without simulating', () => {
    const career = fixture(), before = JSON.stringify(career), view = mount(career);
    expect(view.getByRole('button', { name: 'Previous month' })).toBeDisabled();
    for (let month = 0; month < 2; month++) fireEvent.click(view.getByRole('button', { name: 'Next month' }));
    expect(view.getByText(title({ y: seasonDays(career).today.y, m: 10 }), { exact: true })).toBeVisible();
    inspect(view); fireEvent.click(view.getByRole('button', { name: 'Previous month' }));
    expect(view.queryByTestId('cm-calendar-day')).toBeNull();
    expect(view.getByText(title({ y: seasonDays(career).today.y, m: 9 }), { exact: true })).toBeVisible();
    expect(view.onSimTo).not.toHaveBeenCalled(); expect(view.onSetTraining).not.toHaveBeenCalled();
    expect(JSON.stringify(career)).toBe(before);
  });

  it('preserves explicit fast forward and training callbacks', () => {
    const career = fixture(), view = mount(career), target = fastForwardTargets(career, seasonDays(career)).nextMatch!;
    fireEvent.click(view.getByRole('button', { name: /^Next match/ }));
    expect(view.onSimTo).toHaveBeenCalledExactlyOnceWith(target.week);
    fireEvent.click(view.getByRole('button', { name: /^Rest first/ }));
    expect(view.onSetTraining).toHaveBeenCalledExactlyOnceWith({ intensity: 'light', focus: career.training?.focus ?? 'balanced' });
  });

  it.each(['future', 'past'] as const)('returns from a distant %s month to the actual simulated date without taking a turn', direction => {
    const career = january(fixture()), before = JSON.stringify(career), view = mount(career);
    expect(career.week).toBeGreaterThan(0);
    const step = view.getByRole('button', { name: direction === 'future' ? 'Next month' : 'Previous month' });
    let count = 0; while (!step.hasAttribute('disabled') && count < 12) { fireEvent.click(step); count++; }
    expect(count).toBeGreaterThan(2); expect(step).toBeDisabled();
    inspect(view); fireEvent.click(currentButton(view)); expectCurrent(view, career);
    expect(view.onSimTo).not.toHaveBeenCalled(); expect(view.onSetTraining).not.toHaveBeenCalled();
    expect(JSON.stringify(career)).toBe(before);
  });

  it('uses the advanced career date and year while keeping browsing stable until asked', () => {
    const career = fixture(), view = mount(career);
    fireEvent.click(view.getByRole('button', { name: 'Next month' })); inspect(view);
    const oldMonth = title({ y: seasonDays(career).today.y, m: 9 });
    const advanced = january({ ...career, season: career.season + 2 });
    view.rerender(<CalendarScreen career={advanced} onSimTo={view.onSimTo} onSetTraining={view.onSetTraining} />);
    expect(view.getByText(oldMonth, { exact: true })).toBeVisible();
    fireEvent.click(currentButton(view)); expectCurrent(view, advanced);
    expect(seasonDays(advanced).today.y).toBeGreaterThan(seasonDays(career).today.y);
    expect(view.onSimTo).not.toHaveBeenCalled();
  });

  it('clears an inspected day even when already viewing the current month', () => {
    const view = mount(); inspect(view); const button = currentButton(view);
    expect(button).toBeEnabled(); fireEvent.click(button); expectCurrent(view, view.career);
    expect(view.onSimTo).not.toHaveBeenCalled(); expect(view.onSetTraining).not.toHaveBeenCalled();
  });

  it('keeps an enabled44px native button and keyboard focus through the return', () => {
    const view = mount(); fireEvent.click(view.getByRole('button', { name: 'Next month' }));
    const button = currentButton(view); button.focus();
    expect(button.tagName).toBe('BUTTON'); expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('min-h-[44px]'); expect(button).toBeEnabled(); expect(button).toHaveFocus();
    expect(fireEvent.keyDown(button, { key: 'Enter' })).toBe(true);
    fireEvent.click(button); expect(fireEvent.keyUp(button, { key: 'Enter' })).toBe(true);
    expectCurrent(view, view.career); expect(currentButton(view)).toBe(button); expect(button).toHaveFocus();
    expect(view.onSimTo).not.toHaveBeenCalled();
  });

  it('keeps repeated returns read only for career storage simulation and training', () => {
    const career = january(fixture()), before = JSON.stringify(career), view = mount(career);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    fireEvent.click(view.getByRole('button', { name: 'Previous month' })); inspect(view);
    for (let click = 0; click < 6; click++) fireEvent.click(currentButton(view));
    expectCurrent(view, career);
    expect(writes).not.toHaveBeenCalled(); expect(view.onSimTo).not.toHaveBeenCalled(); expect(view.onSetTraining).not.toHaveBeenCalled();
    expect(JSON.stringify(career)).toBe(before);
  });
});
