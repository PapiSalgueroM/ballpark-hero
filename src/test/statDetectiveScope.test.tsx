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
/* Release AT (ruling R3): the sentence that ships. Round 1145 made the span and the franchise count complete (every
   NBA season on file, from the view bref_nba_career_spans), so the other lane's Round 1183 sentence about 500 minute
   seasons and missing stints would be false. It is written out here, not imported, so a change to the shipped words
   turns these cases red (simReportedGamePools control stat-scope). */
const scope = 'Career span and Career franchises count every NBA season on file for the player, short stints included. Years are season end years. The files run from 1949-50 to 2024-25, so a career that started earlier or is still going shows only those seasons.';

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
  it('explains what the career span covers before play and in reopened help', async () => {
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

  it('shows the complete career span and franchises under their shipped labels', async () => {
    const before = JSON.stringify(data);
    const view = await ready(); fireEvent.click(view.getByRole('button', { name: /^Stars/ }));
    for (const profile of wrong) choose(view, profile);
    expect(view.container.querySelector('[data-stat-clue="Career span"]')).toHaveTextContent('Career span: 1990-1996');
    expect(view.container.querySelector('[data-stat-clue="Career franchises"]')).toHaveTextContent('Career franchises: 2');
    expect(view.container.querySelector('[data-stat-profile-scope]')).toHaveTextContent(scope);
    expect(view.container.querySelector('[data-stat-clue="Recorded seasons"]')).toBeNull();
    expect(view.container.querySelector('[data-stat-clue="Recorded franchises"]')).toBeNull();
    expect(hintsFor(mystery, 3)).toEqual([{ label: 'Surname starts with', value: 'A' }]);
    expect(JSON.stringify(data)).toBe(before);
  });

  it('captures the exact random case and mode while keeping the answer out of visible play', async () => {
    const view = await ready();
    expect(context(view)).toMatchObject({ puzzleId: null, player: null, phase: 'pick' });
    fireEvent.click(view.getByRole('button', { name: /^Deep Cuts/ }));
    expect(context(view)).toEqual({ puzzleId: mystery.key, player: mystery.player, season: mystery.season, team: 'FXB', difficulty: 'deep', phase: 'playing', guesses: [], profileScope: 'career-span-every-season-on-file', recordedSeasons: '1990-1996' });
    expect(view.queryByText(mystery.player)).toBeNull();
    choose(view, wrong[0]);
    expect(context(view).guesses).toEqual([wrong[0].name]);
    choose(view, target);
    expect(context(view)).toMatchObject({ puzzleId: mystery.key, player: mystery.player, phase: 'done', guesses: [wrong[0].name, target.name] });
    expect(view.getByRole('group', { name: 'Case closed' })).toHaveTextContent(mystery.player);
  });
});