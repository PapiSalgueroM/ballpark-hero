import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SeasonRatings from '@/components/soccer-career/SeasonRatings';
import type { SeasonRecord } from '@/lib/soccerCareerEngine';

type Source = Parameters<typeof SeasonRatings>[0]['career'];
const row = (changes: Partial<SeasonRecord> = {}): SeasonRecord => ({
  year: 2026, age: 22, club: 'Harbour Town', clubCountry: 'England', clubTier: 2,
  apps: 20, goals: 12, assists: 6, cleanSheets: 4, yellowCards: 2, redCards: 0, rating: 7.1, ovr: 80,
  leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false,
  ballonDor: false, ballonDorRank: null, type: 'playing',
  intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
  ...changes,
});
const source = (seasons: SeasonRecord[], position = 'ST'): Source => ({ seasons, position, overall: 97, retired: false });
const held = () => source([
  row({ type: 'youth', club: 'Harbour Academy', year: 2024 }),
  row({ year: 2025, age: 21, goals: 12, ovr: 75 }),
  row({ year: 2025, age: 21, club: 'Rivertown', onLoanFrom: 'Harbour Town', apps: 8, goals: 15, rating: 8.1, ovr: 82 }),
  row({ type: 'manager', club: 'Manager job', year: 2026 }),
  row({ year: 2027, club: 'BANNED', clubTier: 99, clubCountry: '', apps: 0, goals: 0, assists: 0, rating: 0, ovr: undefined }),
]);
function Launcher({ career }: { career: Source }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)}>Open season ratings</button>{open && <SeasonRatings career={career} onClose={() => setOpen(false)} />}</>;
}
async function open(career: Source) {
  render(<Launcher career={career} />);
  const launcher = screen.getByRole('button', { name: 'Open season ratings' });
  launcher.focus(); fireEvent.click(launcher);
  const dialog = await screen.findByRole('dialog', { name: 'Season Ratings' });
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Season Ratings' })).toHaveFocus());
  return { launcher, dialog, scroll: dialog.querySelector<HTMLDivElement>('[data-season-history-scroll]')! };
}
const press = (label: string) => fireEvent.click(screen.getByRole('button', { name: label, exact: true }));
const choose = (label: string, value: string) => fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value } });
const metric = (key: string) => Array.from(document.querySelector(`[data-season-history-stat="${key}"]`)!.querySelectorAll('[data-season-history-value]')).map(node => node.textContent);
const availability = (key: string) => document.querySelector(`[data-season-availability-field="${key}"]`)?.textContent;
const close = (dialog: HTMLElement) => fireEvent.click(dialog.querySelector('[data-season-history-close]')!);
afterEach(() => { cleanup(); document.body.style.overflow = ''; });

describe('Soccer Career season history UI', () => {
  it('keeps the existing Ratings table, average and unknown OVR caption', async () => {
    const older = row({ year: 2025, ovr: undefined, rating: 7 });
    const newer = row({ year: 2026, rating: 8 });
    const { dialog } = await open(source([older, newer]));
    expect(dialog.querySelectorAll('[data-season-ratings-row]')).toHaveLength(2);
    expect(dialog.querySelector('[data-ratings-ovr]')).toHaveTextContent('-');
    expect(dialog.querySelector('[data-career-average-rating]')).toHaveTextContent('7.5');
    expect(dialog.querySelector('[data-ovr-tracked-from="2026"]')).toBeVisible();
  });

  it('defaults to the last two senior records including a saved zero-app season', async () => {
    await open(held()); press('Compare seasons');
    expect(screen.getByRole('combobox', { name: 'First season' })).toHaveValue('2');
    expect(screen.getByRole('combobox', { name: 'Second season' })).toHaveValue('4');
    expect(metric('apps')).toEqual(['8', '0', '-8']);
    expect(metric('rating')).toEqual(['8.1', 'Not recorded', 'Not recorded']);
  });

  it('selects distinct duplicate-year records by original index and shows the loan identity', async () => {
    await open(held()); press('Compare seasons'); choose('First season', '1'); choose('Second season', '2');
    expect(metric('goals')).toEqual(['12', '15', '+3']);
    expect(document.querySelector('[data-season-history-side="first"]')).toHaveTextContent('2025/26');
    expect(document.querySelector('[data-season-history-side="second"]')).toHaveTextContent('Rivertown');
    expect(document.querySelector('[data-season-history-side="second"]')).toHaveTextContent('Age 21');
    expect(document.querySelector('[data-season-history-side="second"]')).toHaveTextContent('On loan from Harbour Town');
  });

  it('swaps exactly two saved seasons and reverses the recorded delta', async () => {
    await open(source([row({ year: 2025, goals: 12 }), row({ year: 2026, goals: 15 })])); press('Compare seasons');
    expect(metric('goals')).toEqual(['12', '15', '+3']); press('Swap seasons');
    expect(screen.getByRole('combobox', { name: 'First season' })).toHaveValue('1');
    expect(screen.getByRole('combobox', { name: 'Second season' })).toHaveValue('0');
    expect(metric('goals')).toEqual(['15', '12', '-3']);
  });
  it('never offers the opposite selected record or academy and manager rows', async () => {
    await open(held()); press('Compare seasons');
    const first = within(screen.getByRole('combobox', { name: 'First season' })).getAllByRole('option');
    const second = within(screen.getByRole('combobox', { name: 'Second season' })).getAllByRole('option');
    expect(first.map(option => (option as HTMLOptionElement).value)).toEqual(['2', '1']);
    expect(second.map(option => (option as HTMLOptionElement).value)).toEqual(['4', '1']);
  });

  it('never substitutes current overall or zero for a missing saved OVR', async () => {
    await open(source([row({ year: 1992, ovr: undefined }), row({ year: 1993, ovr: 88 })])); press('Compare seasons');
    expect(metric('ovr')).toEqual(['Not recorded', '88', 'Not recorded']);
    expect(document.querySelector('[data-season-history-comparison]')).not.toHaveTextContent('97');
  });

  it('shows recorded zero goals but not a fabricated zero match rating', async () => {
    await open(source([row({ goals: 0, apps: 0, rating: 0 }), row({ goals: 2, rating: 7.3 })])); press('Compare seasons');
    expect(metric('goals')).toEqual(['0', '2', '+2']);
    expect(metric('rating')).toEqual(['Not recorded', '7.3', 'Not recorded']);
  });

  it('shows keeper clean sheets without inventing attacking or defensive estimates', async () => {
    await open(source([row({ cleanSheets: 4 }), row({ cleanSheets: 9 })], 'GK')); press('Compare seasons');
    expect(metric('cleanSheets')).toEqual(['4', '9', '+5']);
    expect(document.querySelector('[data-season-history-stat="goals"]')).toBeNull();
    expect(document.querySelector('[data-season-history-stat="assists"]')).toBeNull();
    expect(document.querySelector('[data-season-history-comparison]')).not.toHaveTextContent('Tackles');
  });

  it('keeps uncertain older defender clean sheets distinct from a recorded zero', async () => {
    await open(source([row({ ovr: undefined, cleanSheets: 0 }), row({ cleanSheets: 0 })], 'CB')); press('Compare seasons');
    expect(metric('cleanSheets')).toEqual(['Not recorded', '0', 'Not recorded']);
  });

  it('reads injury weeks, severity and actual suspension matches as separate saved facts', async () => {
    await open(source([row({ injury: 'Recorded knock', injuryWeeks: 4, injurySevere: false, suspensionMatches: 2 })])); press('Availability');
    expect(availability('injury')).toBe('Recorded knock');
    expect(availability('weeks')).toBe('4 weeks');
    expect(availability('severity')).toBe('No serious injury recorded');
    expect(availability('suspension')).toBe('2 club matches missed');
    expect(screen.getByText('Only what this save kept. Injury weeks and suspension matches stay separate.')).toBeVisible();
  });

  it('distinguishes missing availability facts from explicit no-injury and zero counts', async () => {
    await open(source([row({ year: 1992 }), row({ injury: null, injuryWeeks: 0, injurySevere: false, suspensionMatches: 0 })])); press('Availability');
    expect(availability('injury')).toBe('No injury recorded');
    expect(availability('weeks')).toBe('0 weeks');
    expect(availability('suspension')).toBe('0 club matches missed');
    choose('Availability season', '0');
    for (const key of ['injury', 'weeks', 'severity', 'suspension']) expect(availability(key), key).toBe('Not recorded');
  });

  it('shows every senior record in the compact history with original indices and honest unknowns', async () => {
    await open(held()); press('Availability');
    const list = screen.getByRole('list', { name: 'Recorded availability by season' });
    expect(Array.from(list.querySelectorAll('[data-season-availability-summary]')).map(node => node.getAttribute('data-season-availability-summary'))).toEqual(['4', '2', '1']);
    expect(list.querySelector('[data-season-availability-summary="1"] [data-availability-summary-field="injury"]')).toHaveTextContent('Not recorded');
    expect(list.querySelector('[data-season-availability-summary="2"]')).toHaveTextContent('Loan from Harbour Town');
  });

  it('labels saved zero-app status without claiming injury caused all missed matches', async () => {
    await open(held()); press('Availability'); expect(availability('reason')).toBe('Banned');
    choose('Availability season', '1'); expect(availability('reason')).toBe('Appearances recorded');
    expect(document.querySelector('[data-season-availability]')).not.toHaveTextContent('because of');
  });

  it('keeps comparison unavailable with fewer than two rows and gives an honest empty history', async () => {
    const { dialog } = await open(source([]));
    expect(screen.getByRole('button', { name: 'Compare seasons' })).toBeDisabled();
    press('Availability');
    expect(screen.getByText('No saved senior seasons yet. Availability will show up here when one is recorded.')).toBeVisible();
    expect(dialog.querySelectorAll('select')).toHaveLength(0);
  });

  it('Help returns to comparison choices, comparison scroll and its Help trigger', async () => {
    const { scroll } = await open(held()); press('Compare seasons'); choose('First season', '1'); choose('Second season', '2');
    scroll.scrollTop = 139; press('Season history help');
    expect(screen.getByText(/12 goals in the first season and 15 in the second/)).toBeVisible();
    press('Back to comparison');
    expect(screen.getByRole('combobox', { name: 'First season' })).toHaveValue('1');
    expect(screen.getByRole('combobox', { name: 'Second season' })).toHaveValue('2');
    expect(scroll.scrollTop).toBe(139);
    expect(screen.getByRole('button', { name: 'Season history help' })).toHaveFocus();
  });

  it('Help keeps the selected availability record and restores its scroll', async () => {
    const { scroll } = await open(held()); press('Availability'); choose('Availability season', '1'); scroll.scrollTop = 69;
    press('Season history help'); expect(screen.getByText(/saved 4-week injury and 2 club matches/)).toBeVisible();
    press('Back to Availability'); expect(screen.getByRole('combobox', { name: 'Availability season' })).toHaveValue('1');
    expect(scroll.scrollTop).toBe(69);
  });

  it('restores Ratings scroll and original launcher focus after comparison', async () => {
    const { scroll } = await open(held()); const launcher = screen.getByRole('button', { name: 'Compare seasons' });
    scroll.scrollTop = 215; launcher.focus(); fireEvent.click(launcher);
    expect(scroll.scrollTop).toBe(0); press('Back to Ratings');
    expect(scroll.scrollTop).toBe(215);
    expect(screen.getByRole('button', { name: 'Compare seasons' })).toHaveFocus();
  });

  it('Escape restores the actual page opener and pre-existing body overflow', async () => {
    document.body.style.overflow = 'auto';
    const { launcher, dialog } = await open(held()); press('Availability');
    await waitFor(() => expect(document.body.hasAttribute('data-scroll-locked')).toBe(true));
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await waitFor(() => { expect(screen.queryByRole('dialog')).toBeNull(); expect(launcher).toHaveFocus(); expect(document.body.hasAttribute('data-scroll-locked')).toBe(false); });
    expect(document.body.style.overflow).toBe('auto');
  });

  it('all reads and Close preserve complete saved bytes and original row references', async () => {
    const career = held(); const before = JSON.stringify(career); const originals = [...career.seasons];
    career.seasons.forEach(Object.freeze); Object.freeze(career.seasons); Object.freeze(career);
    const { launcher, dialog } = await open(career); press('Compare seasons'); choose('First season', '1');
    press('Season history help'); press('Back to comparison'); press('Back to Ratings'); press('Availability');
    choose('Availability season', '1'); close(dialog);
    await waitFor(() => expect(launcher).toHaveFocus());
    expect(JSON.stringify(career)).toBe(before);
    originals.forEach((original, index) => expect(career.seasons[index]).toBe(original));
  });
});
