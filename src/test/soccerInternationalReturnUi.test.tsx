import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { InternationalReturnCard } from '@/components/soccer-career/InternationalReturnCard';
import * as E from '@/lib/soccerCareerEngine';
import { internationalReturnEligibility, makeInternationallyAvailable, readInternationalReturn } from '@/lib/soccerInternationalReturn';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function senior(): E.CareerState {
  const carrier = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const career = copy(carrier.saves.find((saved: { id: string }) => saved.id === 'ere').state) as E.CareerState;
  career.playerName = 'Comeback Tester'; career.age = 34; career.overall = 82; career.peakOverall = 82;
  career.phase = 'playing'; career.retired = false; career.retirementSuggested = true;
  career.internationalCareer = false; career.intStats = { ...career.intStats, isRetired: true, debutYear: -1 };
  career.seasons[career.seasons.length - 1] = { ...career.seasons[career.seasons.length - 1], age: 34, ovr: 82 };
  career.pendingSummary = null; career.pendingBallonDor = null; career.pendingTournament = null;
  career.pendingWorldCup = null; career.pendingRivalryEvent = null; career.pendingEvents = [];
  delete career.seasonMoments;
  return copy(E.repairCareer(career));
}
function open() {
  const trigger = document.querySelector<HTMLButtonElement>('[data-international-return-open]');
  expect(trigger).toBeEnabled(); trigger!.focus(); fireEvent.click(trigger!);
  const dialog = document.querySelector<HTMLElement>('[data-international-return-dialog]');
  expect(dialog).toBeVisible(); return { trigger: trigger!, dialog: dialog! };
}
function review(dialog: HTMLElement) {
  expect(dialog.querySelector('[data-international-return-help]')).toBeVisible();
  expect(dialog.querySelector('[data-international-return-confirm]')).toBeNull();
  fireEvent.click(dialog.querySelector('[data-international-return-review-open]')!);
  const confirm = dialog.querySelector<HTMLButtonElement>('[data-international-return-confirm]');
  expect(confirm).toBeEnabled(); return confirm!;
}
beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.52);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); document.body.style.overflow = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Soccer international return controls', () => {
  it('shows rules and a worked example before review without reading draws or changing the career', () => {
    const career = senior(), before = JSON.stringify(career), onReturn = vi.fn();
    expect(internationalReturnEligibility(career).available).toBe(true);
    vi.mocked(Math.random).mockImplementation(() => { throw new Error('comeback read drew randomness'); });
    render(<InternationalReturnCard career={career} onReturn={onReturn} />);
    const { dialog } = open();
    expect(dialog).toHaveTextContent('National-team selection for Netherlands');
    expect(dialog.querySelector('[data-international-return-help]')).toHaveTextContent('Example: return with 40 caps');
    expect(dialog).toHaveTextContent('It does not give you a call-up or play a match');
    expect(dialog).toHaveTextContent('Injury, bans and failed qualification can still keep you out');
    expect(dialog).toHaveTextContent('Retiring again, moving clubs or reloading cannot unlock another return');
    expect(dialog.querySelector('[data-international-return-confirm]')).toBeNull();
    expect(onReturn).not.toHaveBeenCalled(); expect(JSON.stringify(career)).toBe(before);
  });
  it('confirms once for two captured rapid confirmation clicks through the real component guard', () => {
    const career = senior(), before = JSON.stringify(career), onReturn = vi.fn();
    render(<InternationalReturnCard career={career} onReturn={onReturn} />);
    const { dialog } = open(), button = review(dialog);
    expect(button).toHaveTextContent('Make me available');
    expect(dialog.querySelector('[data-international-return-review]')).toHaveTextContent('No instant caps, extra money or rating boost');
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(onReturn).toHaveBeenCalledTimes(1); expect(JSON.stringify(career)).toBe(before);
    expect(document.querySelector('[data-international-return-dialog]')).toBeNull();
  });
  it('reopens Help from review without confirming and retains the review choice', () => {
    const onReturn = vi.fn(); render(<InternationalReturnCard career={senior()} onReturn={onReturn} />);
    const { dialog } = open(); review(dialog);
    const help = dialog.querySelector<HTMLButtonElement>('[data-international-return-help-open]')!;
    fireEvent.click(help); expect(help).toHaveAttribute('aria-expanded', 'true');
    expect(dialog.querySelector('[data-international-return-help]')).toBeVisible();
    expect(dialog.querySelector('[data-international-return-confirm]')).toBeNull();
    fireEvent.click(help); expect(dialog.querySelector('[data-international-return-review]')).toBeVisible();
    expect(dialog.querySelector('[data-international-return-confirm]')).toBeEnabled(); expect(onReturn).not.toHaveBeenCalled();
  });
  it('returns Back to the actual opener and restores the complete previous body style', async () => {
    const career = senior(), raw = JSON.stringify(career), onReturn = vi.fn();
    document.body.style.overflow = 'scroll'; const body = document.body.getAttribute('style');
    render(<InternationalReturnCard career={career} onReturn={onReturn} />);
    const { trigger, dialog } = open(); review(dialog);
    await act(async () => { fireEvent.click(dialog.querySelector('[data-international-return-cancel]')!); });
    expect(document.querySelector('[data-international-return-dialog]')).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus()); expect(document.body.getAttribute('style')).toBe(body);
    expect(JSON.stringify(career)).toBe(raw); expect(onReturn).not.toHaveBeenCalled();
  });
  it('closes Escape to the real opener and shows rules again when reopened', async () => {
    const career = senior(), raw = JSON.stringify(career), onReturn = vi.fn();
    document.body.style.overflow = 'scroll'; const body = document.body.getAttribute('style');
    render(<InternationalReturnCard career={career} onReturn={onReturn} />);
    const { trigger, dialog } = open(); review(dialog);
    await act(async () => { fireEvent.keyDown(document.activeElement!, { key: 'Escape', code: 'Escape' }); });
    expect(document.querySelector('[data-international-return-dialog]')).toBeNull();
    await waitFor(() => expect(trigger).toHaveFocus()); expect(document.body.getAttribute('style')).toBe(body);
    fireEvent.click(trigger); expect(document.querySelector('[data-international-return-help]')).toBeVisible();
    expect(document.querySelector('[data-international-return-confirm]')).toBeNull();
    expect(JSON.stringify(career)).toBe(raw); expect(onReturn).not.toHaveBeenCalled();
  });
  it.each([false, true])('keeps this-season saved availability read-only after another retirement=%s', retiredAgain => {
    let career = makeInternationallyAvailable(senior());
    if (retiredAgain) career = E.retireFromInternational(career);
    const raw = JSON.stringify(career), onReturn = vi.fn(); expect(readInternationalReturn(career)).not.toBeNull();
    render(<InternationalReturnCard career={career} onReturn={onReturn} />);
    expect(document.querySelector('[data-international-return-status="saved"]')).toHaveTextContent(
      retiredAgain ? 'International plans already changed this season' : 'Available for national-team selection');
    const { dialog } = open(); expect(dialog).toHaveTextContent('Your international plans');
    expect(dialog.querySelector('[data-international-return-review-open]')).toBeNull();
    expect(dialog.querySelector('[data-international-return-confirm]')).toBeNull();
    fireEvent.click(dialog.querySelector('[data-international-return-help-open]')!);
    expect(dialog.querySelector('[data-international-return-review]')).toHaveTextContent('You cannot make another return');
    expect(dialog.querySelector('[data-international-return-confirm]')).toBeNull();
    expect(JSON.stringify(career)).toBe(raw); expect(onReturn).not.toHaveBeenCalled();
  });
  it('offers a later return for a later saved senior row in the explicit fixture', () => {
    const career = E.retireFromInternational(makeInternationallyAvailable(senior()));
    const previous = career.seasons[career.seasons.length - 1];
    career.age += 1; career.seasons = [...career.seasons, { ...previous, year: previous.year + 1, age: career.age }];
    const raw = JSON.stringify(career); expect(internationalReturnEligibility(career).available).toBe(true);
    render(<InternationalReturnCard career={career} onReturn={vi.fn()} />);
    expect(document.querySelector('[data-international-return-status="available"]')).toBeVisible();
    const { dialog } = open(); expect(review(dialog)).toHaveTextContent('Make me available');
    expect(JSON.stringify(career)).toBe(raw);
  });
  it.each([18, 44])('shows the existing capped senior comeback at age %s', age => {
    const career = senior(); career.age = age; career.seasons[career.seasons.length - 1].age = age;
    render(<InternationalReturnCard career={career} onReturn={vi.fn()} />);
    expect(document.querySelector('[data-international-return-open]')).toHaveTextContent('National-team comeback');
  });
  it.each<[string, (career: E.CareerState) => void]>([
    ['uncapped', career => { career.intStats.caps = 0; }],
    ['still available', career => { career.internationalCareer = true; career.intStats.isRetired = false; }],
    ['too young', career => { career.age = 17; career.seasons[career.seasons.length - 1].age = 17; }],
    ['past the age boundary', career => { career.age = 45; career.seasons[career.seasons.length - 1].age = 45; }],
    ['retired career', career => { career.retired = true; career.phase = 'retired'; }],
    ['queued season summary', career => { career.pendingSummary = career.seasons[career.seasons.length - 1]; }],
    ['ceremony phase', career => { career.phase = 'ballon_dor'; }],
    ['no saved rows', career => { career.seasons = []; }],
    ['no senior source row', career => { career.seasons[career.seasons.length - 1].type = 'youth'; }],
    ['source age mismatch', career => { career.seasons[career.seasons.length - 1].age = career.age - 1; }],
    ['malformed optional receipt', career => { career.internationalReturn = { version: 1 } as E.CareerState['internationalReturn']; }],
  ])('renders no comeback for %s and leaves the complete input unchanged', (_name, change) => {
    const career = senior(); change(career); const raw = JSON.stringify(career), onReturn = vi.fn();
    render(<InternationalReturnCard career={career} onReturn={onReturn} />);
    expect(document.querySelector('[data-international-return-open]')).toBeNull();
    expect(document.querySelector('[data-international-return-status]')).toBeNull();
    expect(JSON.stringify(career)).toBe(raw); expect(onReturn).not.toHaveBeenCalled();
  });
});
