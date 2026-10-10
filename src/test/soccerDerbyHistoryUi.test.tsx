import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SoccerDerbyHistory from '@/components/soccer-career/SoccerDerbyHistory';
import { CareerStatsCard } from '@/pages/SoccerCareer';
import { getCareerTotals, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' }));

// Explicit held simulation records, not real match results.
const row = (changes: Partial<SeasonRecord> = {}): SeasonRecord => ({
  year: 2027, age: 22, club: 'Arsenal', clubCountry: 'England', clubTier: 1,
  apps: 20, goals: 9, assists: 6, cleanSheets: 4, yellowCards: 2, redCards: 0, rating: 7.1, ovr: 80,
  leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false,
  ballonDor: false, ballonDorRank: null, type: 'playing',
  intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
  ...changes,
});
const held = () => row({ derbies: [{ rival: 'Tottenham', name: 'North London derby', kind: 'derby', meetings: [
  { home: true, gf: 2, ga: 1, played: false, goals: 0 },
  { home: false, gf: 1, ga: 2, played: true, goals: 1 },
  { home: true, gf: 0, ga: 0, played: true, goals: 0 },
] }] });
function Launcher({ seasons }: { seasons: readonly unknown[] }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)}>Open derby history</button>{open && <SoccerDerbyHistory seasons={seasons} onClose={() => setOpen(false)} />}</>;
}
async function open(seasons: readonly unknown[]) {
  render(<Launcher seasons={seasons} />);
  const launcher = screen.getByRole('button', { name: 'Open derby history' });
  launcher.focus(); fireEvent.click(launcher);
  const dialog = await screen.findByRole('dialog', { name: 'Derby history' });
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Derby history', level: 2 })).toHaveFocus());
  return { launcher, dialog, body: dialog.querySelector<HTMLDivElement>('[data-derby-history-body]')! };
}
const press = (label: string) => fireEvent.click(screen.getByRole('button', { name: label }));
const pick = (index: number) => fireEvent.click(document.querySelector(`[data-derby-season="${index}"]`)!);
const meeting = (key: string) => document.querySelector(`[data-derby-meeting="${key}"]`)!;
const detail = () => document.querySelector('[data-derby-detail]')!;
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.style.overflow = ''; });

describe('saved Soccer derby history UI', () => {
  it('keeps original senior indices and each saved empty unknown or invalid season accessible', async () => {
    const seasons = [row({ type: 'youth' }), held(), row({ derbies: [] }), row({ type: 'manager' }), row(), { ...held(), derbies: null }];
    const { dialog } = await open(seasons);
    expect(Array.from(dialog.querySelectorAll('[data-derby-season]')).map(node => [node.getAttribute('data-derby-season'), node.getAttribute('data-derby-season-status')])).toEqual([
      ['1', 'saved'], ['2', 'empty'], ['4', 'unrecorded'], ['5', 'invalid'],
    ]);
    expect(screen.getByText(/Pick a season or rival to see the saved meetings/)).toBeVisible();
  });

  it('separates all club results from only the derby appearances and goals you played', async () => {
    const { dialog } = await open([held()]);
    expect(dialog.querySelector('[data-derby-team-record]')).toHaveTextContent('3 saved1 W · 1 D · 1 L');
    expect(dialog.querySelector('[data-derby-player-record]')).toHaveTextContent('2 played · 1 not played0 W · 1 D · 1 L1 goal');
    pick(0);
    expect(detail().querySelector('[data-derby-team-record]')).toHaveTextContent('3 saved');
    expect(detail().querySelector('[data-derby-player-record]')).toHaveTextContent('1 goal');
  });

  it('shows the exact home clubs and score with the saved club on the left', async () => {
    await open([held()]); pick(0); const match = meeting('0:0:0');
    expect(match.querySelector('[data-derby-home-club]')).toHaveTextContent('Arsenal');
    expect(match.querySelector('[data-derby-away-club]')).toHaveTextContent('Tottenham');
    expect(match.querySelector('[data-derby-score]')?.textContent).toBe('2-1');
    expect(match.querySelector('[data-derby-venue]')?.textContent).toBe('Home for your saved club');
    expect(match.querySelector('[data-derby-result]')?.textContent).toBe('Club result: Win');
  });

  it('reverses the display score for an away meeting without reversing the club result', async () => {
    await open([held()]); pick(0); const match = meeting('0:0:1');
    expect(match.querySelector('[data-derby-home-club]')?.textContent).toBe('Tottenham');
    expect(match.querySelector('[data-derby-away-club]')?.textContent).toBe('Arsenal');
    expect(match.querySelector('[data-derby-score]')?.textContent).toBe('2-1');
    expect(match.querySelector('[data-derby-venue]')?.textContent).toBe('Away for your saved club');
    expect(match.querySelector('[data-derby-result]')?.textContent).toBe('Club result: Loss');
    expect(match.querySelector('[data-derby-played]')).toHaveTextContent('You played. Your goals: 1');
  });

  it('shows missed club wins without crediting a player appearance or goal', async () => {
    await open([row({ apps: 0, goals: 0, derbies: [{ rival: 'Tottenham', name: 'Saved derby', kind: 'derby', meetings: [{ home: true, gf: 2, ga: 1, played: false, goals: 0 }] }] })]); pick(0);
    expect(meeting('0:0:0').querySelector('[data-derby-played]')).toHaveTextContent('You did not play. Your goals: 0');
    expect(detail().querySelector('[data-derby-team-record]')).toHaveTextContent('1 W · 0 D · 0 L');
    expect(detail().querySelector('[data-derby-player-record]')).toHaveTextContent('0 played · 1 not played0 W · 0 D · 0 L0 goals');
  });

  it('shows only the recorded winning goal marker and never adds a hero award', async () => {
    await open([row({ derbies: [{ rival: 'Tottenham', name: 'Saved derby', kind: 'derby', meetings: [{ home: true, gf: 2, ga: 1, played: true, goals: 1, won: true }] }] })]); pick(0);
    expect(meeting('0:0:0').querySelector('[data-derby-winner]')).toHaveTextContent('Your saved winning goal.');
    expect(detail()).not.toHaveTextContent('Derby Hero');
    expect(detail().querySelector('[data-derby-goals]')?.textContent).toBe('Your goals: 1');
  });

  it('keeps duplicate years and loan clubs as distinct original records', async () => {
    const loan = row({ club: 'Tottenham', onLoanFrom: 'Arsenal', derbies: [{ rival: 'Arsenal', name: 'Saved rivalry', kind: 'rivalry', meetings: [{ home: false, gf: 3, ga: 2, played: true, goals: 2 }] }] });
    await open([held(), loan]);
    expect(screen.getByRole('button', { name: 'View derby season 2027, Arsenal, record 1' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'View derby season 2027, Tottenham, record 2' })).toBeVisible(); pick(1);
    expect(detail().querySelector('[data-derby-season-identity]')).toHaveTextContent('2027TottenhamAge 22On loan from Arsenal');
    expect(detail().querySelectorAll('[data-derby-meeting]')).toHaveLength(1);
    expect(meeting('1:0:0').querySelector('[data-derby-score]')?.textContent).toBe('2-3');
    expect(document.querySelector('[data-derby-meeting="0:0:0"]')).toBeNull();
  });

  it('marks missing saved club age and year without using current metadata', async () => {
    const older = { ...held(), club: undefined, age: undefined, year: undefined };
    await open([older]); pick(0);
    expect(detail().querySelector('[data-derby-season-identity]')).toHaveTextContent('Year not recordedClub not recordedAge not recorded');
    expect(meeting('0:0:0').querySelector('[data-derby-home-club]')?.textContent).toBe('Club not recorded');
    expect(detail()).not.toHaveTextContent('2027');
  });

  it('marks unrecorded old details without borrowing another saved season', async () => {
    await open([held(), row({ year: 1995 })]); pick(1);
    expect(screen.getByText('Derby details were not recorded for this season.')).toBeVisible();
    expect(detail().querySelector('[data-derby-meeting]')).toBeNull();
    expect(detail()).not.toHaveTextContent('Tottenham');
  });

  it('distinguishes an explicitly empty season from an unrecorded season', async () => {
    await open([row({ derbies: [] })]); pick(0);
    expect(screen.getByText('No derby meetings were saved for this season.')).toBeVisible();
    expect(detail().querySelector('[data-derby-missing]')).toHaveAttribute('data-derby-missing', 'empty');
    expect(detail().querySelector('[data-derby-meeting]')).toBeNull();
  });

  it('fails closed on an impossible missed personal goal without rendering partial results', async () => {
    const invalid = { ...held(), derbies: [{ rival: 'Tottenham', name: 'Saved derby', kind: 'derby', meetings: [{ home: true, gf: 2, ga: 1, played: false, goals: 1 }] }] };
    await open([invalid]); pick(0);
    expect(screen.getByText('These saved derby details could not be read. No results have been guessed.')).toBeVisible();
    expect(detail().querySelector('[data-derby-meeting]')).toBeNull();
  });

  it('explains a career without senior rows without inventing a derby season', async () => {
    const { dialog } = await open([row({ type: 'youth' }), row({ type: 'manager' })]);
    expect(screen.getByText('No saved senior seasons yet.')).toBeVisible();
    expect(dialog.querySelector('[data-derby-season]')).toBeNull();
  });

  it('does not disclose awards kept beside the saved derby fields', async () => {
    await open([row({ ...held(), ballonDor: true, ballonDorRank: 1, leagueTitle: true, championsLeague: true })]); pick(0);
    for (const text of ['Ballon', 'Champions League', 'League title', 'Award winner']) expect(detail()).not.toHaveTextContent(text);
  });

  it('restores season list scroll and the selected remounted tile after Back', async () => {
    const { body } = await open(Array.from({ length: 30 }, (_, index) => row({ year: 1995 + index, derbies: held().derbies })));
    body.scrollTop = 183; pick(17);
    expect(body.scrollTop).toBe(0); body.scrollTop = 71; press('Back to seasons');
    expect(body.scrollTop).toBe(183);
    expect(document.querySelector('[data-derby-season="17"]')).toHaveFocus();
    expect(document.querySelector('[data-derby-detail]')).toBeNull();
  });

  it('returns Help to the same detail scroll and persistent help trigger', async () => {
    const { body } = await open([held()]); pick(0); body.scrollTop = 96; press('Derby history help');
    expect(body.scrollTop).toBe(0);
    expect(screen.getByText('Example')).toBeVisible();
    expect(screen.getByText(/Your club wins 2-1 at home while you do not play/)).toBeVisible();
    press('Back to derby history');
    expect(body.scrollTop).toBe(96);
    expect(document.querySelector('[data-derby-detail]')).toHaveAttribute('data-derby-detail', '0');
    expect(screen.getByRole('button', { name: 'Derby history help' })).toHaveFocus();
  });

  it('reopens Help and restores the original list position each time', async () => {
    const { body } = await open([held(), row()]); body.scrollTop = 33;
    for (let read = 0; read < 2; read++) {
      press('Derby history help');
      expect(screen.getByText(/Your derby goals are already part of your season goals/)).toBeVisible();
      expect(screen.getByText(/Reading this history does not award anything again/)).toBeVisible();
      press('Back to derby history'); expect(body.scrollTop).toBe(33);
      expect(screen.getByRole('button', { name: 'Derby history help' })).toHaveFocus();
    }
  });

  it('closes from detail and restores the exact career opener and original inline body style', async () => {
    document.body.style.overflow = 'auto'; const { launcher } = await open([held()]); pick(0); press('Close derby history');
    await waitFor(() => expect(launcher).toHaveFocus());
    expect(screen.queryByRole('dialog')).toBeNull(); expect(document.body.style.overflow).toBe('auto');
  });

  it('Escape closes Help through the same dialog and restores the career opener', async () => {
    const { launcher } = await open([held()]); press('Derby history help');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Derby history help', level: 2 })).toHaveFocus());
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(launcher).toHaveFocus());
  });

  it('gives the dialog actions 44px target classes and accessible names', async () => {
    const { dialog } = await open([held()]);
    for (const button of dialog.querySelectorAll<HTMLButtonElement>('header button,[data-derby-seasons] button,[data-derby-list-tab]')) {
      expect(button.className).toContain('min-h-11'); expect(button.className).toContain('min-w-11'); expect(button).toHaveAccessibleName();
    }
    pick(0);
    for (const button of dialog.querySelectorAll<HTMLButtonElement>('header button,[data-derby-seasons] button,[data-derby-list-tab]')) expect(button.className).toContain('min-h-11');
    press('Derby history help');
    for (const button of dialog.querySelectorAll<HTMLButtonElement>('header button,[data-derby-seasons] button,[data-derby-list-tab]')) expect(button.className).toContain('min-h-11');
  });

  it('groups one exact rival across saved clubs and years with every original meeting identity', async () => {
    const later = row({ year: 2029, club: 'West Ham', onLoanFrom: 'Arsenal', derbies: [{ rival: 'Tottenham', name: 'Saved rivalry', kind: 'rivalry', meetings: [
      { home: false, gf: 3, ga: 1, played: true, goals: 2 }, { home: true, gf: 1, ga: 1, played: false, goals: 0 },
    ] }] });
    await open([held(), row(), later]); press('Rivals');
    expect(screen.getByRole('button', { name: 'Rivals' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'View derby rival Tottenham' })).toHaveTextContent('5 saved meetings3 played · 3 goals');
    press('View derby rival Tottenham'); const rival = document.querySelector('[data-derby-rival-detail]')!;
    expect(Array.from(rival.querySelectorAll('[data-derby-meeting]')).map(node => node.getAttribute('data-derby-meeting'))).toEqual(['0:0:0', '0:0:1', '0:0:2', '2:0:0', '2:0:1']);
    expect(rival.querySelector('[data-derby-team-record]')).toHaveTextContent('5 saved2 W · 2 D · 1 L');
    expect(rival.querySelector('[data-derby-player-record]')).toHaveTextContent('3 played · 2 not played1 W · 1 D · 1 L3 goals');
    expect(meeting('0:0:0').querySelector('[data-derby-meeting-season]')).toHaveTextContent('2027ArsenalAge 22');
    expect(meeting('2:0:0').querySelector('[data-derby-meeting-season]')).toHaveTextContent('2029West HamAge 22On loan from Arsenal');
  });

  it('keeps different saved rival spellings separate without alias merging', async () => {
    const spelling = row({ derbies: [{ rival: 'Tottenham Hotspur', name: 'Saved rivalry', kind: 'rivalry', meetings: [{ home: true, gf: 1, ga: 0, played: true, goals: 1 }] }] });
    await open([held(), spelling]); press('Rivals');
    expect(Array.from(document.querySelectorAll('[data-derby-rival]')).map(node => node.getAttribute('data-derby-rival'))).toEqual(['Tottenham', 'Tottenham Hotspur']);
    press('View derby rival Tottenham Hotspur');
    expect(document.querySelector('[data-derby-rival-detail]')?.querySelectorAll('[data-derby-meeting]')).toHaveLength(1);
    expect(meeting('1:0:0').querySelector('[data-derby-goals]')?.textContent).toBe('Your goals: 1');
  });

  it('returns to the same rival tile and exact rival list scroll after Back', async () => {
    const { body } = await open([held()]); press('Rivals'); body.scrollTop = 54;
    press('View derby rival Tottenham'); expect(body.scrollTop).toBe(0); body.scrollTop = 93;
    press('Back to rivals'); expect(body.scrollTop).toBe(54);
    expect(screen.getByRole('button', { name: 'View derby rival Tottenham' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Rivals' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps separate season and rival list offsets and focuses the active view control', async () => {
    const { body } = await open([held(), row()]); body.scrollTop = 82;
    const seasonsTab = screen.getByRole('button', { name: 'Seasons' });
    expect(seasonsTab.closest('header')).not.toBeNull(); expect(seasonsTab.className).toContain('bg-orange-500/15');
    press('Rivals'); expect(body.scrollTop).toBe(0); expect(screen.getByRole('button', { name: 'Rivals' })).toHaveFocus(); body.scrollTop = 36;
    expect(screen.getByRole('button', { name: 'Rivals' }).className).toContain('bg-orange-500/15');
    expect(screen.getByRole('button', { name: 'Seasons' }).className).not.toContain('bg-orange-500/15');
    press('Seasons'); expect(body.scrollTop).toBe(82); expect(screen.getByRole('button', { name: 'Seasons' })).toHaveFocus();
    press('Rivals'); expect(body.scrollTop).toBe(36); expect(screen.getByRole('button', { name: 'Rivals' })).toHaveFocus();
  });

  it('returns Help to the same rival detail and keeps missing seasons out of rival totals', async () => {
    const { body } = await open([held(), row(), { ...row(), derbies: null }]); press('Rivals'); press('View derby rival Tottenham'); body.scrollTop = 47;
    press('Derby history help'); expect(screen.getByText(/Different spellings stay separate/)).toBeVisible();
    press('Back to derby history'); expect(body.scrollTop).toBe(47);
    expect(document.querySelector('[data-derby-rival-detail]')).toHaveAttribute('data-derby-rival-detail', 'Tottenham');
    expect(document.querySelector('[data-derby-rival-detail]')?.querySelectorAll('[data-derby-meeting]')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Derby history help' })).toHaveFocus();
    press('Back to rivals'); press('Seasons'); pick(1);
    expect(screen.getByText('Derby details were not recorded for this season.')).toBeVisible();
  });

  it('offers an honest empty Rivals view while missing season tiles remain available', async () => {
    await open([row(), row({ derbies: [] }), { ...row(), derbies: null }]); press('Rivals');
    expect(screen.getByText('No readable rival meetings saved. The Seasons view still shows missing or unreadable details.')).toBeVisible();
    expect(document.querySelector('[data-derby-rival]')).toBeNull(); press('Seasons');
    expect(document.querySelectorAll('[data-derby-season]')).toHaveLength(3);
  });
  it('keeps every raw season byte reference and all counters unchanged across reading actions', async () => {
    const seasons = [held(), row({ derbies: [] })], before = JSON.stringify(seasons), first = seasons[0], meetings = first.derbies;
    const draw = vi.spyOn(Math, 'random'), write = vi.spyOn(Storage.prototype, 'setItem');
    await open(seasons); pick(0); press('Derby history help'); press('Back to derby history'); press('Back to seasons'); pick(1); press('Back to seasons'); press('Rivals'); press('View derby rival Tottenham'); press('Derby history help'); press('Back to derby history'); press('Back to rivals'); press('Close derby history');
    expect(JSON.stringify(seasons)).toBe(before); expect(seasons[0]).toBe(first); expect(first.derbies).toBe(meetings);
    expect(draw).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
  });
});

function StatsLauncher({ career }: { career: Pick<CareerState, 'position' | 'seasons'> }) {
  const [show, setShow] = useState(false);
  return <><CareerStatsCard career={career} totals={getCareerTotals(career.seasons)} onDerbyHistory={() => setShow(true)} />{show && <SoccerDerbyHistory seasons={career.seasons} onClose={() => setShow(false)} />}</>;
}
describe('Career Stats derby history entry', () => {
  it('opens for a saved senior season without any events or recorded derby details', async () => {
    render(<StatsLauncher career={{ position: 'ST', seasons: [row()] }} />);
    const entry = screen.getByRole('button', { name: /Derby history/ });
    expect(entry.className).toContain('min-h-11'); entry.focus(); fireEvent.click(entry);
    expect(await screen.findByRole('dialog', { name: 'Derby history' })).toBeVisible(); pick(0);
    expect(screen.getByText('Derby details were not recorded for this season.')).toBeVisible();
  });

  it('opens for a zero-app senior season whose club won a missed derby', async () => {
    const missed = row({ apps: 0, goals: 0, derbies: [{ rival: 'Tottenham', name: 'Saved derby', kind: 'derby', meetings: [{ home: true, gf: 1, ga: 0, played: false, goals: 0 }] }] });
    render(<StatsLauncher career={{ position: 'ST', seasons: [missed] }} />);
    expect(document.querySelector('[data-career-derbies]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Derby history/ })); await screen.findByRole('dialog', { name: 'Derby history' }); pick(0);
    expect(detail().querySelector('[data-derby-team-record]')).toHaveTextContent('1 W · 0 D · 0 L');
    expect(detail().querySelector('[data-derby-player-record]')).toHaveTextContent('0 played · 1 not played');
  });

  it('does not offer the entry for an academy-only career', () => {
    render(<StatsLauncher career={{ position: 'ST', seasons: [row({ type: 'youth' })] }} />);
    expect(screen.queryByRole('button', { name: /Derby history/ })).toBeNull();
  });

  it('keeps the existing stats and derby totals when no callback is supplied', () => {
    const career = { position: 'ST', seasons: [held()] }, before = JSON.stringify(career);
    const { container } = render(<CareerStatsCard career={career} totals={getCareerTotals(career.seasons)} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('[data-career-stat="Apps"]')).toHaveTextContent('20');
    expect(container.querySelector('[data-career-derbies]')).toHaveTextContent('Derbies: 2 played, 0 W 1 D 1 L, 1 goal');
    expect(JSON.stringify(career)).toBe(before);
  });
});
