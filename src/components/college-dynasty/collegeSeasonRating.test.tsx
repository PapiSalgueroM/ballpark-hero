import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CfbDynastyBoard from '@/components/cfb-dynasty/CfbDynastyBoard';
import CbbDynastyBoard from '@/components/cbb-dynasty/CbbDynastyBoard';
import { cfbStrength, initCfb, simCfbRound } from '@/lib/cfbDynasty';
import { cbbStrength, initCbb, simCbbRound } from '@/lib/cbbDynasty';
import { keyedRng } from '@/lib/keyedRng';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

type RatingReview = { round: number; teamId: string; changes: { id: string; from: number; to: number }[] };
type Dynasty = (ReturnType<typeof initCfb> | ReturnType<typeof initCbb>) & { ratingReview?: RatingReview };

const SPORTS = [
  {
    label: 'CFB', word: 'Week', second: 6, Board: CfbDynastyBoard, key: 'cfb-dynasty-save-v1',
    init: () => initCfb('UGA', keyedRng('college rating'), { depth: true }),
    playOld: (st: Dynasty, rng: () => number) => simCfbRound(st as ReturnType<typeof initCfb>, rng),
    strength: (st: Dynasty) => cfbStrength((st as ReturnType<typeof initCfb>).teams.UGA),
  },
  {
    label: 'CBB', word: 'Round', second: 5, Board: CbbDynastyBoard, key: 'cbb-dynasty-save-v1',
    init: () => initCbb('UK', keyedRng('college rating'), { depth: true }),
    playOld: (st: Dynasty, rng: () => number) => simCbbRound(st as ReturnType<typeof initCbb>, rng),
    strength: (st: Dynasty) => cbbStrength((st as ReturnType<typeof initCbb>).teams.UK),
  },
];

describe.each(SPORTS)('$label roster rating reviews', ({ word, second, Board, key, init, playOld, strength }) => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  const load = (st: Dynasty, phase: 'season' | 'recruit' = 'season') => {
    localStorage.setItem(key, JSON.stringify({ st, phase, recruits: [], portal: [] }));
    return render(<Board />);
  };
  const read = () => (JSON.parse(localStorage.getItem(key)!) as { st: Dynasty }).st;
  const roster = (st: Dynasty) => st.teams[st.myTeam].players;
  const press = (round: number) => fireEvent.click(screen.getByRole('button', { name: `Play ${word} ${round}` }));
  const openPlay = () => fireEvent.click(screen.getByRole('button', { name: 'Play' }));

  it('reviews both leagues after games, feeds the next game, and survives reload', () => {
    vi.spyOn(Math, 'random').mockImplementation(keyedRng('board matches'));
    const st = init();
    for (const team of Object.values(st.teams)) {
      for (const p of team.players) {
        p.cls = team.id === st.myTeam ? 'FR' : 'SR';
        p.ovr = 75;
        p.pot = 88;
      }
    }
    const view = load(st);
    openPlay();
    press(1);
    press(2);
    const before = read();
    expect(before.ratingReview).toBeUndefined();
    expect(roster(before).every(p => p.ovr === 75)).toBe(true);
    press(3);
    const after = read();
    expect(after.ratingReview).toMatchObject({ round: 3, teamId: st.myTeam });
    expect(roster(after).some(p => p.ovr > 75)).toBe(true);
    expect(Object.values(after.teams).some(t => t.id !== st.myTeam && t.players.some(p => p.ovr < 75))).toBe(true);
    expect(strength(after)).toBeGreaterThan(strength(before));
    expect(after.mySlate?.slice(0, before.mySlate!.length)).toEqual(before.mySlate);
    expect(screen.getByText(/Ratings review/)).toBeInTheDocument();
    const saved = localStorage.getItem(key);
    view.unmount();
    render(<Board />);
    expect(screen.getByText(new RegExp(`Ratings review.*${word.toLowerCase()} 3`, 'i'))).toBeInTheDocument();
    expect(localStorage.getItem(key)).toBe(saved);
  });

  it('starts an older midseason save at its next scheduled review', () => {
    vi.spyOn(Math, 'random').mockImplementation(keyedRng('continued matches'));
    const st = init();
    const rng = keyedRng('previous matches');
    while (st.round < second) { playOld(st, rng); st.round++; }
    const before = roster(st).map(p => p.ovr);
    load(st);
    expect(localStorage.getItem(key)).not.toContain('ratingReview');
    openPlay();
    press(second);
    const after = read();
    expect(after.ratingReview?.round).toBe(second);
    expect(after.mySlate?.slice(0, st.mySlate!.length)).toEqual(st.mySlate);
    expect(roster(after).every((p, i) => Math.abs(p.ovr - before[i]) <= 2)).toBe(true);
  });

  it('keeps surviving players at their current ratings when closing old recruiting saves', () => {
    vi.spyOn(Math, 'random').mockImplementation(keyedRng('offseason'));
    const st = init();
    roster(st).forEach(p => { p.cls = 'SO'; p.ovr = 74; p.pot = 90; });
    const ids = new Set(roster(st).map(p => p.id));
    load(st, 'recruit');
    fireEvent.click(screen.getByRole('button', { name: 'Close the class, run it back' }));
    const after = read();
    expect(after.season).toBe(st.season + 1);
    expect(after.round).toBe(1);
    expect(roster(after).filter(p => ids.has(p.id)).map(p => [p.cls, p.ovr])).toEqual([...ids].map(() => ['JR', 74]));
  });
});
