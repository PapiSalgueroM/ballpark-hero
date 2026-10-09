import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StatDetective from '@/pages/StatDetective';
import { hintsFor, normalizeName, type MysterySeason, type PlayerProfile, type StatDetectiveData } from '@/lib/statDetective';

vi.mock('@/lib/statDetective', async original => ({ ...await original<typeof import('@/lib/statDetective')>(), fetchStatDetectiveData: async () => data }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Fixture guest' }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: (props: { gameContext: Record<string, unknown> }) => <button data-report-context={JSON.stringify(props.gameContext)}>Fixture report</button> }));

const mystery: MysterySeason = { key: 'fixture-case|1994-95|FXB', player: 'Fixture Case Anchor', season: '1994-95', endYear: 1995, decade: 1990, position: 'PG', team: 'FXB', teamName: 'Fixture Bay', franchise: 'fixture-bay', minutes: 2000, pts: 1300, trb: 300, ast: 600, stl: 100, blk: 20, rating: 95 };
const target: PlayerProfile = { name: mystery.player, firstYear: 1990, lastYear: 1996, positions: ['PG'], franchises: ['fixture-bay', 'fixture-hill'], peak: 95 };
const wrong: PlayerProfile[] = ['One', 'Two', 'Three'].map(name => ({ ...target, name: `Fixture Guess ${name}`, peak: 70, franchises: ['fixture-away'] }));
let data: StatDetectiveData;
const scope = 'Recorded seasons and franchises cover NBA seasons with 500+ minutes in these case files. Years are season end years. Short stints and other seasons can be missing.';

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const profiles = [target, ...wrong];
  data = { pools: { stars: [mystery], deep: [mystery] }, profiles, byName: new Map(profiles.map(profile => [normalizeName(profile.name), profile])) };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const ready = async () => {
  const view = render(<StatDetective />);
  await view.findByRole('button', { name: /^Stars/ });
  return view;
};
const choose = (view: ReturnType<typeof render>, profile: PlayerProfile) => {
  fireEvent.change(view.getByRole('textbox', { name: 'Guess the mystery player' }), { target: { value: profile.name } });
  fireEvent.click(view.getByRole('button', { name: new RegExp(`^${profile.name} `) }));
};
const context = (view: ReturnType<typeof render>) => JSON.parse(view.getByRole('button', { name: 'Fixture report' }).getAttribute('data-report-context')!);

describe('Stat Detective recorded profile scope', () => {
  it('explains the eligible season window before play and in reopened help', async () => {
    const view = await ready();
    expect(view.getByText(scope)).toBeVisible();
    const help = view.getByRole('button', { name: 'How to play' });
    help.focus(); fireEvent.click(help);
    const dialog = view.getByRole('dialog', { name: 'Stat Detective rules' });
    expect(within(dialog).getByText(scope)).toBeVisible();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await waitFor(() => {
      expect(view.queryByRole('dialog')).toBeNull();
      expect(help).toHaveFocus();
    });
  });

  it('shows recorded seasons and franchises without claiming complete career dates', async () => {
    const before = JSON.stringify(data);
    const view = await ready(); fireEvent.click(view.getByRole('button', { name: /^Stars/ }));
    for (const profile of wrong) choose(view, profile);
    expect(view.container.querySelector('[data-stat-clue="Recorded seasons"]')).toHaveTextContent('Recorded seasons: 1990-1996');
    expect(view.container.querySelector('[data-stat-clue="Recorded franchises"]')).toHaveTextContent('Recorded franchises: 2');
    expect(view.container.querySelector('[data-stat-profile-scope]')).toHaveTextContent(scope);
    expect(view.container.querySelector('[data-stat-clue="Career span"]')).toBeNull();
    expect(view.container.querySelector('[data-stat-clue="Career franchises"]')).toBeNull();
    expect(hintsFor(mystery, 3)).toEqual([{ label: 'Surname starts with', value: 'A' }]);
    expect(JSON.stringify(data)).toBe(before);
  });

  it('captures the exact random case and mode while keeping the answer out of visible play', async () => {
    const view = await ready();
    expect(context(view)).toMatchObject({ puzzleId: null, player: null, phase: 'pick' });
    fireEvent.click(view.getByRole('button', { name: /^Deep Cuts/ }));
    expect(context(view)).toEqual({ puzzleId: mystery.key, player: mystery.player, season: mystery.season, team: 'FXB', difficulty: 'deep', phase: 'playing', guesses: [], profileScope: 'recorded-500-minute-seasons', recordedSeasons: '1990-1996' });
    expect(view.queryByText(mystery.player)).toBeNull();
    choose(view, wrong[0]);
    expect(context(view).guesses).toEqual([wrong[0].name]);
    choose(view, target);
    expect(context(view)).toMatchObject({ puzzleId: mystery.key, player: mystery.player, phase: 'done', guesses: [wrong[0].name, target.name] });
    expect(view.getByRole('group', { name: 'Case closed' })).toHaveTextContent(mystery.player);
  });
});