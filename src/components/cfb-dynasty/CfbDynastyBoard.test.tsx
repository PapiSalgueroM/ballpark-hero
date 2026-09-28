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
 * Round 647: the second describe is the season ledger. Every closed season
 * adds exactly one row to the save, scored against the projection the save
 * carries (made at the pick, and at every close for the next season, from
 * the roster the season finished with), and that row's score is what the board hands the completion
 * hook; an older save with natties and no ledger gets one row and nothing
 * retroactive, and its sum is labelled as counted since that season; a
 * reload on the recap hands the hook nothing; a closed season played again
 * adds nothing; two seasons in one sitting are two rows and two finishes;
 * and the projection is the pick's, so a roster made better after the pick
 * beats it while the same season scored against the roster at the whistle
 * would not. The roster is rigged (every man 99, or every man 40) to force
 * the outcomes. SEASON_LEDGER_MODULE points this file and the board at a
 * copy of src/lib/seasonLedger.ts with one rule put back, and exactly the
 * rows written for that rule must then fail.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { initCfb, simCfbRound, CFB_ROUNDS, CFB_SCHOOL_MAP, type CfbState } from '@/lib/cfbDynasty';
import { scoreSeason, appendSeason, ledgerTotal, projectionFor, projectNext, BAR_SHARE, SEASON_CEILING, type SeasonExpectation, type SeasonRow } from '@/lib/seasonLedger';
import { CFB_SEASON, roundPhrase } from '@/lib/seasonFormats';

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

/* Round 647: a program's projection, the way the board makes it. */
const project = (st: CfbState, season = st.season): SeasonExpectation =>
  projectionFor(CFB_SEASON.teams(st), CFB_SEASON.format, season, st.myTeam);
/* Round 647 fix: the next season's projection, the way the board makes it at the close. */
const projectAfter = (st: CfbState): SeasonExpectation => projectNext(CFB_SEASON, st, st.myTeam, st.season + 1);

/* Round 647: force the outcome. 'strong' rates every man on the roster 99
   and every man on every other roster 40, a natty under any seed; 'weak'
   rates the roster 40 against ordinary rosters, no Playoff. */
type Rig = 'strong' | 'weak' | undefined;
function rig(st: CfbState, how: Rig) {
  if (!how) return;
  for (const t of Object.values(st.teams)) {
    const mine = t.id === st.myTeam;
    if (!mine && how === 'weak') continue;
    for (const p of t.players) p.ovr = mine === (how === 'strong') ? 99 : 40;
  }
}

/* A dynasty on the morning of its final regular season week. The save
   carries the projection made at the pick, from the roster the pick handed
   over, and the rig is applied after it: the roster that plays is not the
   roster that was projected, the way a manager's moves make it. */
function finalWeekState(how?: Rig): { st: CfbState; pickExpect: SeasonExpectation } {
  const rng = lehmer(7);
  const st = initCfb('UGA', rng);
  const pickExpect = project(st);
  st.expect = pickExpect;
  rig(st, how);
  for (let r = 1; r < CFB_ROUNDS; r += 1) { simCfbRound(st, rng); st.round += 1; }
  return { st, pickExpect };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const save = (shape: any) => localStorage.setItem(SAVE_KEY, JSON.stringify(shape));
const read = (): any => JSON.parse(localStorage.getItem(SAVE_KEY)!);

describe('CFB Dynasty: the season closes once', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { cleanup(); });

  it('draws the recap again after a reload and does not replay the season', () => {
    save({ st: finalWeekState().st, phase: 'season', recruits: null, portal: null });
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
    const { st } = finalWeekState();
    st.natties.push({ season: st.season, team: 'UGA' });
    st.seasonsPlayed = 1;
    save({ st, phase: 'recap', recruits: null, portal: null });
    render(<CfbDynastyBoard />);
    expect(screen.queryByText('Final week + the Playoff')).toBeNull();
    expect(read().phase).toBe('recruit');
    expect(read().st.seasonsPlayed).toBe(1);
  });

  it('refuses to run the final week twice for one season', () => {
    const { st } = finalWeekState();
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
   with natties and seasons counted and no ledger and no projection at all. */
const closeSeason = (how: Rig, history?: { myTitles: number; seasonsPlayed: number }) => {
  const { st, pickExpect } = finalWeekState(how);
  if (history) { delete st.ledger; delete st.expect; Object.assign(st, history); }
  save({ st, phase: 'season', recruits: null, portal: null });
  const view = render(<CfbDynastyBoard />);
  expect(recorded(), 'nothing is recorded before the season closes').toHaveLength(0);
  fireEvent.click(screen.getByText('Play'));
  fireEvent.click(screen.getByText('Final week + the Playoff'));
  return { st, pickExpect, view, closed: read() };
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

  it('a title season adds exactly one row, scored against the projection the save carries, and records it once', () => {
    const { st, pickExpect, closed } = closeSeason('strong');
    expect(closed.st.natties[0].team, 'the 99 rated roster did not win the natty under this seed; re-seed the rig').toBe('UGA');
    const row = rowOf(closed);
    expect(row.season).toBe(st.season);
    expect(row.team).toBe('UGA');
    expect(row.stage, 'a natty is the round past the last').toBe(row.rounds + 1);
    expect(row.games, 'the form term reads the twelve game regular season, not the title game').toBe(CFB_ROUNDS);
    expect(row.expShare).toBe(pickExpect.share);
    expect(row.expBar).toBe(pickExpect.top[0]);
    expect(row.score).toBe(scoreSeason(row, pickExpect));
    /* A perfect season beats every season the roster was projected to have
       except the projection's own perfect ones, which it ties, and a tie
       counts half. UGA is strong enough to go perfect in a few of its
       projected seasons, so it wins that share of the headroom, not always
       the whole ceiling, and one that goes perfect one season in ten or more
       (the first CBB school does) scores nothing for it: see THE LIMIT IT
       CANNOT HELP in src/lib/seasonLedger.ts. A pick that never went perfect
       gets the whole ceiling. */
    expect(row.wins, 'the rigged roster went unbeaten').toBe(row.games);
    const tied = pickExpect.top.filter(v => v >= SEASON_CEILING).length;
    const beat = 1 - tied / 2 / pickExpect.runs;
    expect(row.score, 'a perfect season scores the share of the projection it beat, ties half').toBe(Math.max(0, Math.min(SEASON_CEILING, Math.round(SEASON_CEILING * (beat - BAR_SHARE) / (1 - BAR_SHARE)))));
    expect(finishes(), 'one finish, and the number it records is the row').toEqual([row.score]);
    expect(ledgerTotal(closed.st.ledger)).toBe(row.score);
    expect(screen.getByText(/This season/).textContent).toContain(String(row.score));
    expect(screen.getByText(/Career/).textContent).toContain(String(row.score));
    /* The recap states the whole projection: the wins and the round it
       projected, the bar a season had to get past, and the season. */
    const note = screen.getByText(/Points start past/).textContent ?? '';
    expect(note).toContain(`Projected: ${Math.round(row.expShare * row.games)} wins, ${roundPhrase(CFB_SEASON, row.expStage)}.`);
    expect(note).toContain(`: ${Math.round(row.barShare * row.games)} wins, ${roundPhrase(CFB_SEASON, row.barStage)}.`);
    expect(note).toContain(`Yours: ${row.wins} wins, the title.`);
  });

  it('a season without a title adds exactly one row too, and records it once', () => {
    const { st, pickExpect, closed } = closeSeason('weak');
    expect(closed.st.natties[0].team, 'the 40 rated roster won the natty under this seed; re-seed the rig').not.toBe('UGA');
    const row = rowOf(closed);
    expect(row.season).toBe(st.season);
    expect(row.stage).toBeLessThanOrEqual(row.rounds);
    expect(row.score).toBe(scoreSeason(row, pickExpect));
    expect(row.score, 'a 40 rated roster\'s season is under the bar an ordinary roster was projected to reach: it scores nothing').toBe(0);
    expect(finishes(), 'a season without a title is still a finish, recorded once').toEqual([row.score]);
    expect(ledgerTotal(closed.st.ledger)).toBe(row.score);
    expect(closed.st.myTitles).toBe(0);
    expect(screen.getByText(/This season/).textContent).toContain(String(row.score));
  });

  it('an older save adds one row and nothing retroactive, and labels the sum as counted since that season', () => {
    /* A dynasty from before this round: two natties and four seasons in the
       save, no ledger and no projection. The board projects the season from
       the league as it loads, the season closed now is the first row, and
       the two old natties earn nothing retroactively. */
    const { st, closed } = closeSeason('strong', { myTitles: 2, seasonsPlayed: 4 });
    const row = rowOf(closed);
    const repaired = project(st);
    expect(row.expShare, 'projected from the league as the save loaded').toBe(repaired.share);
    expect(row.expBar).toBe(repaired.top[0]);
    expect(row.score).toBe(scoreSeason(row, repaired));
    expect(finishes()).toEqual([row.score]);
    expect(ledgerTotal(closed.st.ledger), 'no retroactive points for the natties the old save already held').toBe(row.score);
    expect(closed.st.myTitles).toBe(3);
    expect(closed.st.seasonsPlayed).toBe(5);
    expect(screen.getByText(/Since 2026/).textContent, 'the sum is the ledger since 2026, not the career').toContain(String(row.score));
    expect(screen.queryByText(/Career/), 'five seasons played and one row: the chip must not call the sum the career').toBeNull();
  });

  it('replaying a closed title adds nothing: a reload records nothing and the final week refuses', () => {
    const { pickExpect, view, closed } = closeSeason('strong');
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
    const again = appendSeason(closed.st.ledger, { ...row }, pickExpect);
    expect(again.row).toBeNull();
    expect(again.ledger).toHaveLength(1);
  });

  it('every closed season adds its own row: two seasons in one sitting, two rows, two finishes, and the career is their sum', () => {
    const { closed } = closeSeason('strong');
    const first = rowOf(closed);
    /* The next season is projected at the close, from the roster the
       season finished with, carried through the offseason an untouched
       coach gets: the moment the four front offices project theirs. */
    const closeExpect = projectAfter(closed.st);
    expect(closed.st.expect, 'next season is projected at the close').toEqual(closeExpect);
    /* The whole second season on the same mounted board: the recruiting
       trail, the offseason, every week, and the final week. The board's
       closed row has to reset between the two, or the second close is no
       rise and records nothing. */
    fireEvent.click(screen.getByText('Hit the recruiting trail'));
    const trail = read().st;
    expect(trail.expect, 'the trail does not project it again: the class and the portal are the coach\'s').toEqual(closeExpect);
    fireEvent.click(screen.getByText('Close the class, run it back'));
    expect(read().st.season).toBe(first.season + 1);
    fireEvent.click(screen.getByText('Play'));
    for (let week = 1; week < CFB_ROUNDS; week += 1) fireEvent.click(screen.getByText(`Play Week ${week}`));
    fireEvent.click(screen.getByText('Final week + the Playoff'));
    const after = read().st;
    expect(after.ledger.map((r: SeasonRow) => r.season), 'one row per closed season, in order').toEqual([first.season, first.season + 1]);
    expect(after.ledger[0]).toEqual(first);
    const second: SeasonRow = after.ledger[1];
    expect(second.expShare, 'the second season is scored against the projection made at the first close').toBe(closeExpect.share);
    expect(second.expBar).toBe(closeExpect.top[0]);
    expect(second.score).toBe(scoreSeason(second, closeExpect));
    expect(finishes(), 'each season recorded once, on its own number').toEqual([first.score, second.score]);
    expect(ledgerTotal(after.ledger)).toBe(first.score + second.score);
    expect(after.seasonsPlayed).toBe(2);
    expect(screen.getByText(/Career/).textContent).toContain(String(first.score + second.score));
  });

  it('the projection is the pick\'s: a season is scored against what its roster was projected to do, not the roster at the whistle', () => {
    /* The pick, on the real pick screen. */
    render(<CfbDynastyBoard />);
    fireEvent.click(screen.getByText(CFB_SCHOOL_MAP.get('UGA')!.name));
    const picked: CfbState = read().st;
    const pickExpect = project(picked);
    expect(picked.expect, 'the pick is projected the moment it is made, from the roster it hands over').toEqual(pickExpect);
    cleanup();
    /* The roster that plays is better than the one projected, and the
       season is played to its final week on it. */
    rig(picked, 'strong');
    const rng = lehmer(7);
    for (let r = 1; r < CFB_ROUNDS; r += 1) { simCfbRound(picked, rng); picked.round += 1; }
    const atWhistle = project(picked);
    save({ st: picked, phase: 'season', recruits: null, portal: null });
    render(<CfbDynastyBoard />);
    fireEvent.click(screen.getByText('Play'));
    fireEvent.click(screen.getByText('Final week + the Playoff'));
    const row = rowOf(read());
    expect(row.expShare, 'scored against the pick\'s projection').toBe(pickExpect.share);
    expect(row.expBar).toBe(pickExpect.top[0]);
    expect(row.score).toBe(scoreSeason(row, pickExpect));
    expect(scoreSeason(row, atWhistle), 'the same season against the roster at the whistle would score less: the pick sets the bar, the moves after it beat it').toBeLessThan(row.score);
  });
});
