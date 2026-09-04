/**
 * A CFB dynasty season closes exactly once.
 *
 * Round 426 part three. The final week handler ran the postseason, advanced
 * seasonsPlayed and natties, and persisted phase 'recap' with round still
 * 12 and no postseason. On reload the load effect mapped 'recap' back to
 * 'season', the button read "Final week + the Playoff" again, and one click
 * replayed the final week and the whole postseason on a season that was
 * already closed: seasonsPlayed and natties advanced twice, the natty could
 * be won twice, every team played a 13th game, and the inflated numbers
 * reached the recorded score.
 *
 * The save now carries the postseason so the recap is drawn again; a save
 * from before this round opens on the recruiting trail instead; and the
 * handler refuses a postseason for a season already in the record.
 *
 * scripts/simCfbDynasty.mjs runs this file and carries the negative control:
 * CFB_BOARD points it at a copy of the board with the old restore and no
 * guard, and the reload test must then fail.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { initCfb, simCfbRound, CFB_ROUNDS, type CfbState } from '@/lib/cfbDynasty';

// Completion tracking reads the auth context and writes to the database;
// the share buttons draw a canvas card; the reveal scroll calls
// scrollIntoView, which jsdom does not have. None is under test.
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const boardPath = process.env.CFB_BOARD;
const { default: CfbDynastyBoard } = boardPath
  ? await import(/* @vite-ignore */ boardPath)
  : await import('@/components/cfb-dynasty/CfbDynastyBoard');

const SAVE_KEY = 'cfb-dynasty-save-v1';

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* A dynasty on the morning of its final regular season week. */
function finalWeekState(): CfbState {
  const rng = lehmer(7);
  const st = initCfb('UGA', rng);
  for (let r = 1; r < CFB_ROUNDS; r += 1) { simCfbRound(st, rng); st.round += 1; }
  return st;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const save = (shape: any) => localStorage.setItem(SAVE_KEY, JSON.stringify(shape));
const read = (): any => JSON.parse(localStorage.getItem(SAVE_KEY)!);

describe('CFB Dynasty: the season closes once', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { cleanup(); });

  it('draws the recap again after a reload and does not replay the season', () => {
    save({ st: finalWeekState(), phase: 'season', recruits: null, portal: null });
    const first = render(<CfbDynastyBoard />);
    fireEvent.click(screen.getByText('Play'));
    fireEvent.click(screen.getByText('Final week + the Playoff'));
    expect(screen.getByText(/win the \d{4} natty/)).toBeTruthy();
    const closed = read();
    expect(closed.phase).toBe('recap');
    expect(closed.st.seasonsPlayed).toBe(1);
    expect(closed.st.natties).toHaveLength(1);
    expect(closed.postseason).toBeTruthy();
    first.unmount();

    render(<CfbDynastyBoard />);
    expect(screen.getByText(/win the \d{4} natty/)).toBeTruthy();
    expect(screen.queryByText('Final week + the Playoff')).toBeNull();
    expect(read().st.seasonsPlayed).toBe(1);
    expect(read().st.natties).toHaveLength(1);
  });

  it('opens an older recap save on the recruiting trail instead of the final week', () => {
    const st = finalWeekState();
    st.natties.push({ season: st.season, team: 'UGA' });
    st.seasonsPlayed = 1;
    save({ st, phase: 'recap', recruits: null, portal: null });
    render(<CfbDynastyBoard />);
    expect(screen.queryByText('Final week + the Playoff')).toBeNull();
    expect(read().phase).toBe('recruit');
    expect(read().st.seasonsPlayed).toBe(1);
  });

  it('refuses to run the final week twice for one season', () => {
    const st = finalWeekState();
    st.natties.push({ season: st.season, team: 'UGA' });
    st.seasonsPlayed = 1;
    save({ st, phase: 'season', recruits: null, portal: null });
    render(<CfbDynastyBoard />);
    fireEvent.click(screen.getByText('Play'));
    fireEvent.click(screen.getByText('Final week + the Playoff'));
    expect(read().st.seasonsPlayed).toBe(1);
    expect(read().st.natties).toHaveLength(1);
  });
});
