/**
 * Round 916: the Fight Career board with the life layer. Three things a
 * player meets: an old save opens on the hub with its record and the new
 * tiles, a card waiting on the save is the first thing shown and comes back
 * after a reload, and a tile opens its panel and Back closes it.
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FightCareerBoard from '@/components/fight-career/FightCareerBoard';
import { newFightCareer, runCamp, takeFight } from '@/lib/fightCareer';
import { lifeNewCareer, lifeRunCamp, lifeTakeFight, nextLifeStep } from '@/lib/fightCareerLifeFlow';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));

const KEY = 'fight-career-save-v1';
const PLAN = { conditioning: 2, power: 2, defence: 1, speed: 1 };
const LOOKS = ['box', 'press', 'counter'] as const;

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('Fight Career board, the life between fights', () => {
  it('opens a save from before the round on the hub, record intact, tiles showing', async () => {
    let st = newFightCareer('Old Timer', 'light', 'swarmer', 'board-v1');
    st = takeFight(runCamp(st, PLAN), st.offers[0].id, [...LOOKS])!.state;
    localStorage.setItem(KEY, JSON.stringify({ st, phase: 'hub' }));
    const view = render(<FightCareerBoard />);
    expect(await view.findByText('Old Timer')).toBeTruthy();
    const text = view.container.textContent ?? '';
    expect(text).toContain(`${st.fighter.wins}-${st.fighter.losses}`);
    for (const tile of ['Inbox', 'Rival', 'Bank and shop', 'Corner', 'Badges']) expect(text).toContain(tile);
    expect(text).toMatch(/What do you take\?|Defend the title/);
  });

  it('shows the waiting card first and brings it back after a reload', async () => {
    let st = lifeNewCareer('Card Holder', 'middle', 'slugger', 'puncher', 'dealmaker', 'board-card');
    st = lifeTakeFight(lifeRunCamp(st, PLAN), st.offers[0].id, [...LOOKS])!.state;
    const step = nextLifeStep(st)!;
    expect(step).not.toBeNull();
    const title = step.kind === 'beat' ? step.event.title : step.card.title;
    localStorage.setItem(KEY, JSON.stringify({ st, phase: 'hub' }));
    let view = render(<FightCareerBoard />);
    expect(await view.findByText(title, { exact: false })).toBeTruthy();
    expect(view.container.textContent).not.toContain('What do you take?');
    /* Answer it on screen: the save moves on to the next thing or the offers. */
    const first = view.container.querySelectorAll('button')[0];
    fireEvent.click(first);
    const after = JSON.parse(localStorage.getItem(KEY)!);
    const next = nextLifeStep(after.st);
    cleanup();
    view = render(<FightCareerBoard />);
    await view.findByText('Card Holder');
    const text = view.container.textContent ?? '';
    if (next) expect(text).toContain(next.kind === 'beat' ? next.event.title : next.card.title);
    else expect(text).toMatch(/What do you take\?|Defend the title/);
  });

  it('opens a tile and Back closes it', async () => {
    const st = lifeNewCareer('Tile Tester', 'welter', 'counter', 'slick', 'matchmaker', 'board-tiles');
    localStorage.setItem(KEY, JSON.stringify({ st, phase: 'hub' }));
    const view = render(<FightCareerBoard />);
    await view.findByText('Tile Tester');
    fireEvent.click(view.getByText(/Bank and shop/));
    expect(view.container.textContent).toContain('Cut man');
    fireEvent.click(view.getByText('Back'));
    expect(view.container.textContent).toContain('What do you take?');
  });

  /* Round 916 review: a game plan save from before the round has no offerId
     and its camp is already on the fighter. It must not let a second camp run
     on top of the first, and a reload on the hub must still remember that. */
  it('opens an old game plan save with its camp done and skips the second camp', async () => {
    const before = newFightCareer('Camp Done', 'welter', 'outboxer', 'board-plan');
    const st = runCamp(before, PLAN);
    localStorage.setItem(KEY, JSON.stringify({ st, phase: 'plan' }));
    let view = render(<FightCareerBoard />);
    await view.findByText('Camp Done');
    expect(view.container.textContent).toContain('Your camp is already done');
    cleanup();
    view = render(<FightCareerBoard />);
    await view.findByText('Camp Done');
    expect(view.container.textContent).toContain('Your camp is already done');
    const pick = st.offers[1];
    fireEvent.click(view.getByText(pick.label));
    expect(view.container.textContent).toContain('Tonight');
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect(saved.phase).toBe('plan');
    expect(saved.offerId).toBe(pick.id);
    expect(saved.st.fighter.attrs).toEqual(st.fighter.attrs);
  });

  /* Round 916 review: the board is the one real caller of lifeLoadState. A
     save holding a rival choice this build does not know (a damaged save, or
     an id a later round renamed) must open on the offers, not on a card
     nothing can answer. Loading through plain ensureLife would bring the
     soft lock back, and this is the test that sees it. */
  it('opens a save with an unknown rival choice on the offers, not stuck on it', async () => {
    const st = lifeNewCareer('Lost Card', 'light', 'counter', 'allround', 'family', 'board-stuck');
    const stored = JSON.parse(JSON.stringify(st));
    stored.life.pendingRivalryChoice = {
      id: 'fr-renamed-long-ago', emoji: '?', title: 'A choice from long ago', description: 'Nothing answers this.',
      choices: [{ label: 'Gone', emoji: '?', consequence: 'Nothing changes.' }],
    };
    expect(nextLifeStep(stored)?.kind).toBe('choice');
    localStorage.setItem(KEY, JSON.stringify({ st: stored, phase: 'hub' }));
    const view = render(<FightCareerBoard />);
    await view.findByText('Lost Card');
    const text = view.container.textContent ?? '';
    expect(text).not.toContain('A choice from long ago');
    expect(text).toMatch(/What do you take\?|Defend the title/);
  });
});
