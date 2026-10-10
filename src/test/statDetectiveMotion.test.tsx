import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StatDetective from '@/pages/StatDetective';
import motion from '@/pages/StatDetective.module.css';
import { buildShareGrid, careerSpan, evaluateGuess, hintsFor, normalizeName, statChips, type MysterySeason, type PlayerProfile, type StatDetectiveData } from '@/lib/statDetective';
import { recordCompletion } from '@/lib/completions';

vi.mock('@/lib/statDetective', async original => ({ ...await original<typeof import('@/lib/statDetective')>(), fetchStatDetectiveData: async () => data }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Fixture guest' }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: (props: { description: string; howToPlay: string[] }) => <section data-fixture-guide><p>{props.description}</p>{props.howToPlay.map(text => <p key={text}>{text}</p>)}</section> }));
vi.mock('@/components/game/ShareButtons', () => ({ default: (props: { score: string; emojiGrid: string; gamePath: string }) => <output data-fixture-share data-score={props.score} data-grid={props.emojiGrid} data-path={props.gamePath}>{props.score}</output> }));

const season = (name: string, key: string): MysterySeason => ({
  key, player: name, season: '2001-02', endYear: 2002, decade: 2000, position: 'PG',
  team: 'FXB', teamName: 'Fixture Bay club', franchise: 'fixture-bay', minutes: 2300,
  pts: 1450, trb: 310, ast: 570, stl: 117, blk: 25, rating: 95,
});
const target = season('Fixture Aster Vale', 'fixture-vale');
const second = season('Fixture Lyra Stone', 'fixture-lyra');
const deep = { ...season('Fixture Niko Cove', 'fixture-niko'), position: 'C', decade: 1950, season: '1952-53', endYear: 1953, stl: null, blk: null, rating: 70 };
const profile = (name: string, peak: number, franchises = ['fixture-away']): PlayerProfile => ({ name, peak, firstYear: 1991, lastYear: 2009, positions: ['PG'], franchises });
const suspect = profile('Fixture Aster Rowan', 90, ['fixture-bay']);
const wrong = [suspect, ...['Briar Moss', 'Calder Pine', 'Dorian Fern', 'Emery Reed', 'Fenn Willow', 'Gale Cedar', 'Hollis Birch'].map((name, index) => profile(`Fixture ${name}`, 89 - index))];
const targetProfile = profile(target.player, 95, ['fixture-bay']);
const profiles = [targetProfile, profile(second.player, 94, ['fixture-bay']), ...wrong, profile(deep.player, 70)];
let data: StatDetectiveData;

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  vi.spyOn(Math, 'random').mockReturnValue(0);
  data = { pools: { stars: [target, second], deep: [deep] }, profiles, byName: new Map(profiles.map(value => [normalizeName(value.name), value])) };
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

const ready = async () => {
  const view = render(<StatDetective />);
  await view.findByRole('button', { name: /^Stars/ });
  return view;
};
const start = async () => {
  const view = await ready(); fireEvent.click(view.getByRole('button', { name: /^Stars/ }));
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  return view;
};
const search = (view: ReturnType<typeof render>) => view.getByRole('textbox', { name: 'Guess the mystery player' });
const row = (view: ReturnType<typeof render>, name: string) => [...view.container.querySelectorAll<HTMLElement>('[data-stat-guess]')].find(node => node.getAttribute('data-stat-guess') === name)!;
const clues = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll<HTMLElement>('[data-stat-clue]')];
const choose = (view: ReturnType<typeof render>, value: PlayerProfile) => {
  fireEvent.change(search(view), { target: { value: value.name } });
  const option = view.getByRole('button', { name: `${value.name} ${careerSpan(value)}` });
  fireEvent.click(option);
};
const settle = () => act(() => vi.advanceTimersByTime(501));
const shared = (view: ReturnType<typeof render>) => view.container.querySelector('[data-fixture-share]')!;

describe('actual Stat Detective committed feedback and access', () => {
  it('reveals each real profile-backed clue and only the newest guess without remounting older rows', async () => {
    const view = await start();
    expect(search(view)).toHaveFocus(); expect(view.getByText('Next clue unlocks after miss 1')).toBeVisible();
    for (const chip of statChips(target)) expect(view.getByText(chip.label).parentElement!.firstElementChild).toHaveTextContent(chip.value);
    let original: HTMLElement | undefined;
    for (let index = 0; index < 6; index++) {
      choose(view, wrong[index]);
      const newest = row(view, wrong[index].name);
      expect(newest).toHaveClass(motion.wrong); expect(newest).toHaveAttribute('data-stat-feedback', 'wrong');
      expect(view.container.querySelectorAll('[data-stat-guess][data-stat-feedback]')).toHaveLength(1);
      expect(clues(view).map(node => node.textContent)).toEqual(hintsFor(target, index + 1, targetProfile).map(hint => `${hint.label}: ${hint.value}`));
      expect(clues(view).filter(node => node.hasAttribute('data-stat-feedback'))).toHaveLength(1);
      expect(clues(view).at(-1)).toHaveClass(motion.clue);
      expect(search(view)).toHaveFocus();
      if (original) { expect(row(view, suspect.name)).toBe(original); expect(original).not.toHaveClass(motion.wrong); }
      else original = newest;
    }
    expect(view.queryByText(/Next clue unlocks/)).toBeNull();
    expect(row(view, suspect.name)).toHaveTextContent('Shared franchise');
    expect(row(view, wrong[1].name)).toHaveTextContent('No shared franchise');
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps the non-first native option mounted during focus transfer and preserves input Enter-first matching', async () => {
    const view = await start(); const input = search(view);
    fireEvent.change(input, { target: { value: 'Aster' } });
    const first = view.getByRole('button', { name: `${targetProfile.name} ${careerSpan(targetProfile)}` });
    const next = view.getByRole('button', { name: `${suspect.name} ${careerSpan(suspect)}` });
    fireEvent.blur(input, { relatedTarget: first }); expect(first.isConnected).toBe(true);
    act(() => first.focus()); expect(first).toHaveFocus();
    fireEvent.blur(first, { relatedTarget: next }); expect(next.isConnected).toBe(true);
    act(() => next.focus()); expect(next).toHaveFocus(); expect(next).toHaveClass(motion.option);
    fireEvent.click(next); expect(row(view, suspect.name)).toBeVisible(); expect(input).toHaveFocus();
    expect(row(view, suspect.name)).toHaveAttribute('data-stat-feedback', 'wrong');
    fireEvent.change(input, { target: { value: 'Aster' } }); fireEvent.keyDown(input, { key: 'Enter' });
    expect(row(view, target.player)).toHaveAttribute('data-stat-feedback', 'correct');
    expect(view.getByRole('group', { name: 'Case closed' })).toHaveFocus();
    expect(shared(view)).toHaveAttribute('data-score', '2/8 (Stars)');
  });

  it('cues a committed win once with exact helper feedback, share truth and undefined completion score', async () => {
    const view = await start(); choose(view, suspect); choose(view, targetProfile);
    const result = view.getByRole('group', { name: 'Case closed' });
    expect(result).toHaveFocus(); expect(result).toHaveClass(motion.result); expect(result).toHaveAttribute('data-stat-result', 'won');
    expect(row(view, target.player)).toHaveClass(motion.correct); expect(row(view, target.player)).toHaveTextContent('That is the player');
    const expected = [evaluateGuess(suspect, target), evaluateGuess(targetProfile, target)];
    expect(shared(view)).toHaveAttribute('data-score', '2/8 (Stars)');
    expect(shared(view)).toHaveAttribute('data-grid', buildShareGrid(expected));
    expect(shared(view)).toHaveAttribute('data-path', '/stat-detective');
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/stat-detective', undefined, 'Fixture guest');
    const timers = vi.getTimerCount(); view.rerender(<StatDetective />);
    expect(view.getByRole('group', { name: 'Case closed' })).toBe(result); expect(vi.getTimerCount()).toBe(timers);
    settle(); expect(view.container.querySelector('[data-stat-feedback]')).toBeNull();
    expect(result).not.toHaveClass(motion.result); expect(row(view, target.player)).not.toHaveClass(motion.correct);
    expect(row(view, suspect.name)).not.toHaveClass(motion.wrong);
    view.rerender(<StatDetective />); expect(view.container.querySelector('[data-stat-feedback]')).toBeNull();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('ends exactly eight misses, then starts a quiet different case and rearms one completion per difficulty', async () => {
    const view = await start(); for (const value of wrong) choose(view, value);
    const result = view.getByRole('group', { name: 'The trail went cold' });
    expect(result).toHaveFocus(); expect(result).toHaveClass(motion.result); expect(result).toHaveAttribute('data-stat-result', 'lost');
    expect(view.container.querySelectorAll('[data-stat-guess]')).toHaveLength(8); expect(view.queryByRole('textbox')).toBeNull();
    expect(shared(view)).toHaveAttribute('data-score', 'X/8 (Stars)');
    expect(shared(view)).toHaveAttribute('data-grid', buildShareGrid(wrong.map(value => evaluateGuess(value, target))));
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/stat-detective', undefined, 'Fixture guest');
    fireEvent.click(view.getByRole('button', { name: 'New case' }));
    expect(search(view)).toHaveFocus(); expect(view.container.querySelectorAll('[data-stat-guess]')).toHaveLength(0);
    expect(view.container.querySelector('[data-stat-feedback]')).toBeNull(); expect(recordCompletion).toHaveBeenCalledTimes(1);
    choose(view, profiles[1]); expect(view.getByRole('group', { name: 'Case closed' })).toHaveTextContent(second.player);
    expect(recordCompletion).toHaveBeenCalledTimes(2); expect(shared(view)).toHaveAttribute('data-score', '1/8 (Stars)');
    fireEvent.click(view.getByRole('button', { name: 'Switch difficulty' }));
    fireEvent.click(view.getByRole('button', { name: /^Deep Cuts/ }));
    expect(search(view)).toHaveFocus(); expect(view.container.querySelector('[data-stat-feedback]')).toBeNull();
    expect(view.getByText(/Steals and blocks were not tracked/)).toBeVisible();
    choose(view, profiles.at(-1)!); expect(shared(view)).toHaveAttribute('data-score', '1/8 (Deep Cuts)');
    expect(recordCompletion).toHaveBeenCalledTimes(3);
    expect(vi.mocked(recordCompletion).mock.calls.every(call => call[1] === undefined)).toBe(true);
  });

  it('derives the real sparse-profile unlock gaps without inventing career clues', async () => {
    data.profiles = profiles.filter(value => value !== targetProfile);
    data.byName.delete(normalizeName(target.player));
    const view = await start(); const pointers = [2, 2, 4, 4, 5, 6, null];
    for (let misses = 0; misses <= 6; misses++) {
      const expected = hintsFor(target, misses);
      expect(clues(view).map(node => node.textContent)).toEqual(expected.map(hint => `${hint.label}: ${hint.value}`));
      if (pointers[misses] == null) expect(view.queryByText(/Next clue unlocks/)).toBeNull();
      else expect(view.getByText(`Next clue unlocks after miss ${pointers[misses]}`)).toBeVisible();
      if (misses < 6) choose(view, wrong[misses]);
    }
    /* Release AT: these two name the labels that ship (Career span, Career franchises), as on main. The merge
       had left the other lane's labels here, which exist nowhere in the tree, so the lines could not fail. */
    expect(view.container.querySelector('[data-stat-clue="Career span"]')).toBeNull();
    expect(view.container.querySelector('[data-stat-clue="Career franchises"]')).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps short and duplicate queries quiet and clears owned feedback timers on unmount', async () => {
    const view = await start(); const input = search(view);
    fireEvent.change(input, { target: { value: 'A' } }); fireEvent.keyDown(input, { key: 'Enter' });
    expect(view.container.querySelector('[data-stat-guess]')).toBeNull();
    choose(view, suspect); const original = row(view, suspect.name); settle();
    fireEvent.change(input, { target: { value: suspect.name } }); fireEvent.keyDown(input, { key: 'Enter' });
    expect(view.queryByRole('button', { name: `${suspect.name} ${careerSpan(suspect)}` })).toBeNull();
    expect(row(view, suspect.name)).toBe(original); expect(view.container.querySelectorAll('[data-stat-guess]')).toHaveLength(1);
    expect(view.container.querySelector('[data-stat-feedback]')).toBeNull();
    choose(view, wrong[1]); expect(vi.getTimerCount()).toBeGreaterThan(0);
    view.unmount(); expect(vi.getTimerCount()).toBe(0); expect(recordCompletion).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  it('shows accurate rules and example before play and reopens the same native help door', async () => {
    const view = await ready(); const help = view.getByRole('button', { name: 'How to play' });
    expect(help).toHaveClass('min-h-[44px]', 'min-w-[44px]');
    expect(view.getAllByText(/Without that profile, they unlock after misses 2, 4, 5 and 6/).length).toBeGreaterThan(0);
    expect(view.getByText(/^Example: a Shared franchise chip/)).toBeVisible();
    const guide = view.container.querySelector('[data-fixture-guide]')!;
    expect(guide).toHaveTextContent('Wrong guesses tell you whether the player shares a franchise');
    expect(guide).not.toHaveTextContent('era, position and franchise feedback');
    help.focus(); fireEvent.click(help);
    const dialog = view.getByRole('dialog', { name: 'Stat Detective rules' });
    expect(within(dialog).getByText(/Without that profile/)).toBeVisible();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await view.findByRole('button', { name: /^Stars/ });
    await act(async () => {});
    expect(view.queryByRole('dialog')).toBeNull(); expect(help).toHaveFocus();
    expect(recordCompletion).not.toHaveBeenCalled();
  });
});
