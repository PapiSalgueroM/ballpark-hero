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
 *
 * Round 647: the second describe is the season ledger. A title season and a
 * season without one each add exactly one row to the save, scored on that
 * season alone, and that row's score is what the board hands the completion
 * hook; a reload on the recap hands it nothing; a closed season played again
 * adds nothing; and the same results score the same whichever program was
 * picked. The roster is rigged (every man 99, or every man 40) to force the
 * two outcomes. SEASON_LEDGER_MODULE points this file and the board at a
 * copy of src/lib/seasonLedger.ts that double counts a title or scores the
 * pick, and the ledger rows must then fail while the reload rows stay green.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { initCfb, simCfbRound, CFB_ROUNDS, CFB_SCHOOLS, type CfbState } from '@/lib/cfbDynasty';
import { scoreSeason, appendSeason, ledgerTotal, W_TITLE, SEASON_CEILING, type SeasonRow } from '@/lib/seasonLedger';

// Completion tracking reads the auth context and writes to the database;
// the share buttons draw a canvas card; the reveal scroll calls
// scrollIntoView, which jsdom does not have. None is under test.
// Round 647: the completion hook is a spy, so the ledger rows can read what
// the board handed it: the slug, whether a finish is on screen, the score.
const { completion } = vi.hoisted(() => ({ completion: vi.fn() }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: (...args: unknown[]) => { completion(...args); } }));
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

/* A dynasty on the morning of its final regular season week. Round 647: the
   rig forces the outcome. 'strong' rates every man on the roster 99 and every
   man on every other roster 40, a natty under any seed; 'weak' rates the
   roster 40 against ordinary rosters, no Playoff. Applied before the season
   is played so the record matches the roster. */
type Rig = 'strong' | 'weak' | undefined;
function finalWeekState(rig?: Rig): CfbState {
  const rng = lehmer(7);
  const st = initCfb('UGA', rng);
  if (rig) {
    for (const t of Object.values(st.teams)) {
      const mine = t.id === 'UGA';
      if (!mine && rig === 'weak') continue;
      for (const p of t.players) p.ovr = mine === (rig === 'strong') ? 99 : 40;
    }
  }
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

/* Round 647. What the board handed the completion hook while a finish was on
   screen: the third argument of every call whose second was true. */
const recorded = (): number[] => completion.mock.calls.filter(a => a[0] === 'cfb-dynasty' && a[1] === true).map(a => a[2] as number);
/* The finishes the real hook would record: it records only a transition it
   witnessed, the flag going from false to true while mounted, with the score
   of that moment. Every mount opens false (no row is closed yet), so reading
   the calls in order and counting the rises is exactly that rule. */
const finishes = (): number[] => {
  const out: number[] = [];
  let on = false;
  for (const a of completion.mock.calls) {
    if (a[0] !== 'cfb-dynasty') continue;
    if (a[1] === true && !on) out.push(a[2] as number);
    on = a[1] === true;
  }
  return out;
};
/* history: a dynasty already under way on a save written before this round,
   with natties and seasons counted and no ledger at all. */
const closeSeason = (rig: Rig, history?: { myTitles: number; seasonsPlayed: number }) => {
  const st = finalWeekState(rig);
  if (history) { delete st.ledger; Object.assign(st, history); }
  save({ st, phase: 'season', recruits: null, portal: null });
  const view = render(<CfbDynastyBoard />);
  expect(recorded(), 'nothing is recorded before the season closes').toHaveLength(0);
  fireEvent.click(screen.getByText('Play'));
  fireEvent.click(screen.getByText('Final week + the Playoff'));
  return { st, view, closed: read() };
};
const rowOf = (s: any): SeasonRow => {
  expect(Array.isArray(s.st.ledger), 'the save carries a ledger').toBe(true);
  expect(s.st.ledger, 'exactly one row for the one season closed').toHaveLength(1);
  return s.st.ledger[0];
};

describe('CFB Dynasty: the season ledger', () => {
  let restoreRandom: (() => void) | null = null;
  beforeEach(() => {
    localStorage.clear();
    completion.mockClear();
    const spy = vi.spyOn(Math, 'random').mockImplementation(lehmer(11));
    restoreRandom = () => spy.mockRestore();
  });
  afterEach(() => { cleanup(); restoreRandom?.(); });

  it('a title season adds exactly one row, scored on that season, and records that score once, even on an older save', () => {
    /* A dynasty from before this round: two natties and four seasons in the
       save, no ledger. The season closed now is the first row, and the two
       old natties earn nothing retroactively. */
    const { st, closed } = closeSeason('strong', { myTitles: 2, seasonsPlayed: 4 });
    expect(closed.st.natties[0].team, 'the 99 rated roster did not win the natty under this seed; re-seed the rig').toBe('UGA');
    const row = rowOf(closed);
    expect(row.season).toBe(st.season);
    expect(row.team).toBe('UGA');
    expect(row.wonTitle).toBe(true);
    expect(row.games).toBeGreaterThan(0);
    expect(row.score).toBe(scoreSeason(row));
    expect(row.score).toBeGreaterThanOrEqual(W_TITLE);
    expect(row.score).toBeLessThanOrEqual(SEASON_CEILING);
    expect(finishes(), 'one finish, and the number it records is the row').toEqual([row.score]);
    expect(ledgerTotal(closed.st.ledger), 'no retroactive points for the natties the old save already held').toBe(row.score);
    expect(closed.st.myTitles).toBe(3);
    expect(closed.st.seasonsPlayed).toBe(5);
    expect(screen.getByText(/This season/).textContent).toContain(String(row.score));
  });

  it('a season without a title adds exactly one row too, and records it once', () => {
    const { st, closed } = closeSeason('weak');
    expect(closed.st.natties[0].team, 'the 40 rated roster won the natty under this seed; re-seed the rig').not.toBe('UGA');
    const row = rowOf(closed);
    expect(row.season).toBe(st.season);
    expect(row.wonTitle).toBe(false);
    expect(row.score).toBe(scoreSeason(row));
    expect(row.score).toBeLessThan(W_TITLE);
    expect(finishes(), 'a season without a title is still a finish, recorded once').toEqual([row.score]);
    expect(ledgerTotal(closed.st.ledger)).toBe(row.score);
    expect(closed.st.myTitles).toBe(0);
    expect(screen.getByText(/This season/).textContent).toContain(String(row.score));
  });

  it('replaying a closed title adds nothing: a reload records nothing and the final week refuses', () => {
    const { view, closed } = closeSeason('strong');
    const row = rowOf(closed);
    expect(finishes()).toEqual([row.score]);
    view.unmount();

    /* A reload on the recap: the same row, no second finish. */
    render(<CfbDynastyBoard />);
    expect(screen.getByText(/win the \d{4} natty/)).toBeTruthy();
    expect(read().st.ledger).toHaveLength(1);
    expect(finishes(), 'a reload on the recap is not a finish').toEqual([row.score]);
    expect(screen.getByText(/This season/).textContent).toContain(String(row.score));
    cleanup();

    /* The closed season clicked again: refused, ledger untouched. */
    save({ st: closed.st, phase: 'season', recruits: null, portal: null });
    render(<CfbDynastyBoard />);
    fireEvent.click(screen.getByText('Play'));
    fireEvent.click(screen.getByText('Final week + the Playoff'));
    expect(read().st.ledger).toHaveLength(1);
    expect(read().st.ledger[0].score).toBe(row.score);
    expect(finishes()).toEqual([row.score]);

    /* And the module itself refuses a second row for the same season. */
    const again = appendSeason(closed.st.ledger, { ...row });
    expect(again.row).toBeNull();
    expect(again.ledger).toHaveLength(1);
  });

  it('every closed season adds its own row: two seasons in one sitting, two rows, two finishes, and the career is their sum', () => {
    const { closed } = closeSeason('strong');
    const first = rowOf(closed);
    /* The whole second season on the same mounted board: the recruiting
       trail, the offseason, every week, and the final week. */
    fireEvent.click(screen.getByText('Hit the recruiting trail'));
    fireEvent.click(screen.getByText('Close the class, run it back'));
    expect(read().st.season).toBe(first.season + 1);
    fireEvent.click(screen.getByText('Play'));
    for (let week = 1; week < CFB_ROUNDS; week += 1) fireEvent.click(screen.getByText(`Play Week ${week}`));
    fireEvent.click(screen.getByText('Final week + the Playoff'));
    const after = read().st;
    expect(after.ledger.map((r: SeasonRow) => r.season), 'one row per closed season, in order').toEqual([first.season, first.season + 1]);
    expect(after.ledger[0]).toEqual(first);
    const second: SeasonRow = after.ledger[1];
    expect(second.score).toBe(scoreSeason(second));
    expect(finishes(), 'each season recorded once, on its own number').toEqual([first.score, second.score]);
    expect(ledgerTotal(after.ledger)).toBe(first.score + second.score);
    expect(after.seasonsPlayed).toBe(2);
    expect(screen.getByText(/Career/).textContent).toContain(String(first.score + second.score));
  });

  it('the pick of program changes nothing: the same results score the same for every school', () => {
    const { closed } = closeSeason('weak');
    const row = rowOf(closed);
    expect(CFB_SCHOOLS.length).toBeGreaterThan(10);
    for (const s of CFB_SCHOOLS) {
      expect(scoreSeason({ ...row, team: s.id }), `${s.id} with the same results`).toBe(row.score);
      expect(scoreSeason({ ...row, team: s.id, wonTitle: true, reachedFinal: true, madePlayoffs: true }), `${s.id} with a natty`).toBe(scoreSeason({ ...row, wonTitle: true, reachedFinal: true, madePlayoffs: true }));
    }
  });
});
