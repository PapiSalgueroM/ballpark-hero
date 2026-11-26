/* Round 1048: the US careers' lazy Season Center (the mirror of soccer's
   binding of the shared viewer), mounted by itself with a seeded career
   played through the real binding: tip off to the review, the tiles for a
   held year and for a load that fails, and nothing written anywhere but the
   help sheet's "seen it" flag. */
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import UsSeasonCentre, { buildUsModel } from '@/components/us-career/season/UsSeasonCentre';
import { buildUsSeason, type UsRow } from '@/lib/season/us';
import { deriveSeason } from '@/lib/season/core';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NBA_SEASON } from '@/lib/season/nba';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { nflSeasonLength } from '@/lib/nflMyCareer';
import { NFL_SEASON } from '@/lib/season/nfl';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { MLB_SEASON } from '@/lib/season/mlb';
import { keyedRng } from '@/lib/keyedRng';
import { usSeasonHeldLine } from '@/data/usSeasonLengths';
import { resetCareerMomentsForTest } from '@/components/soccer-career/careerMoments';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';
import { stageUsSeasonRating } from '@/lib/usInSeasonRating';

const WITH_LOADER: UsCareerSport = { ...NBA_CAREER_SPORT, loadSeasonCentre: () => Promise.resolve(NBA_SEASON) };

/** A career played with the binding's own calls on a seeded stream. */
function playNba(seed: string, seasons: number, eraId = 'now'): UsCareerCore {
  const rng = keyedRng(seed);
  const SB = NBA_CAREER_SPORT;
  const c = SB.startCareer('Trey Buckets', 'SG', SB.create.archetypes.SG[0], rng, null as never, eraId);
  let tq = SB.rollTeamQuality(null, rng);
  SB.assignRole(c, tq, rng);
  for (let i = 0; i < seasons; i += 1) {
    SB.campBattle(c, tq, rng);
    SB.simSeason(c, tq, rng);
    SB.progress(c, rng);
    tq = SB.rollTeamQuality(tq, rng);
  }
  return JSON.parse(JSON.stringify(c));
}

const press = (text: string) => {
  const b = [...document.querySelectorAll('button')].find(x => (x.textContent ?? '').includes(text));
  if (!b) throw new Error(`usSeasonCentre.test: no button reading "${text}"`);
  act(() => { fireEvent.click(b); });
};
const mount = (sport: UsCareerSport, career: UsCareerCore, onClose = vi.fn()) => {
  const row = career.seasons[career.seasons.length - 1];
  render(<MemoryRouter><UsSeasonCentre sport={sport} career={career} row={row} onClose={onClose} /></MemoryRouter>);
  return { row, onClose };
};

beforeEach(() => { localStorage.clear(); resetCareerMomentsForTest(); });
afterEach(() => { cleanup(); });

describe('the US Season Center, mounted by itself', () => {
  it('walks an NBA season from the tip off card to the review and closes', async () => {
    const career = playNba('centre-a', 2);
    const saved = JSON.stringify(career);
    const { row, onClose } = mount(WITH_LOADER, career);
    expect(document.querySelector('[data-season-centre-loading]')).not.toBeNull();
    await waitFor(() => expect(document.querySelector('[data-season-help]')).not.toBeNull());
    expect(document.querySelector('[data-us-season-centre]')).not.toBeNull();
    expect(document.querySelector('[data-season-help]')!.textContent).toContain('How the Season Center works');
    press('Got it');
    const kick = document.querySelector('[data-kickoff]')!;
    expect(kick.textContent).toContain(NBA_CAREER_SPORT.teamLabelOf(row.team, career.eraId));
    expect(kick.querySelector('[data-frame-line]')!.textContent).toContain('82 games · 41 home, 41 away');
    expect(kick.textContent).toContain('▶ Tip off');
    press('Tip off');
    press('Results');
    await waitFor(() => expect(document.querySelector('[data-full-time]')).not.toBeNull());
    const clock = document.querySelector('[data-match-clock]')!;
    expect(clock.querySelectorAll('[data-clock-events] li')).toHaveLength(clock.textContent!.includes('take over') ? 9 : 8);
    expect(document.querySelector('[data-his-line]')!.textContent).toMatch(/\d+ PTS/);
    expect(document.querySelector('[data-full-time]')!.textContent).toBe('Final');
    expect(document.querySelector('[data-match-development-overall]')).toBeNull();
    expect(document.querySelector('[data-record-panel]')).not.toBeNull();
    press('Sim the rest');
    const review = document.querySelector('[data-review]')!;
    expect(review.querySelector('[data-review-finish]')!.textContent).toContain(row.teamResult);
    const recorded = row as UsRow;
    expect(review.querySelector('[data-review-finish]')!.textContent).toContain(`${recorded.clubWins}-${recorded.clubLosses}`);
    expect(review.querySelector('[data-review-tile="Games"]')!.textContent).toContain(String(row.games));
    expect(review.querySelector('[data-review-tile="PPG"]')!.textContent).toContain(String((row as unknown as { ppg: number }).ppg));
    act(() => { fireEvent.click(document.querySelector('[data-centre-exit]')!); });
    expect(onClose).toHaveBeenCalledTimes(1);
    /* nothing but the help flag was written, and the career in memory is untouched */
    expect(JSON.stringify(career)).toBe(saved);
    expect(Object.keys(localStorage)).toEqual(['seasonCentre:help:nba']);
  });

  it('replays the saved NBA record while incomplete records keep their original reconstruction', () => {
    const career = playNba('record-archive', 1);
    const row = career.seasons[0] as UsRow;
    const scores = (input: UsRow) => {
      const built = buildUsSeason(NBA_SEASON, career, input, NBA_CAREER_SPORT.teamLabelOf);
      if (built.ok !== true) throw new Error('Expected a playable NBA season');
      const games = deriveSeason(built.sport, input, built.ctx)!.games;
      return games.map(game => game.us > game.them);
    };
    const archived = scores({ ...row, clubWins: undefined, clubLosses: undefined });
    expect(scores({ ...row, clubLosses: undefined })).toEqual(archived);
    expect(scores({ ...row, clubWins: 50, clubLosses: 99 })).toEqual(archived);
    expect(scores(row).filter(Boolean)).toHaveLength(Number(row.clubWins));
  });

  it('shows one honest tile for a year whose real length is not the one the career plays', async () => {
    const career = playNba('centre-b', 9, 'y2004');
    const at = career.seasons.findIndex(s => s.year === 2011);
    expect(at).toBeGreaterThan(-1);
    const onClose = vi.fn();
    render(<MemoryRouter><UsSeasonCentre sport={WITH_LOADER} career={career} row={career.seasons[at]} onClose={onClose} /></MemoryRouter>);
    await waitFor(() => expect(document.querySelector('[data-centre-tile]')).not.toBeNull());
    expect(document.querySelector('[data-centre-tile]')!.textContent).toContain(usSeasonHeldLine('nba', 2011)!);
    expect(document.querySelector('[data-kickoff]')).toBeNull();
    press('Back to your season');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('offers Retry when the numbers cannot be loaded, and loads on the second try', async () => {
    let calls = 0;
    const flaky: UsCareerSport = { ...NBA_CAREER_SPORT, loadSeasonCentre: () => { calls += 1; return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(NBA_SEASON); } };
    mount(flaky, playNba('centre-c', 1));
    await waitFor(() => expect(document.querySelector('[data-centre-tile]')).not.toBeNull());
    expect(document.querySelector('[data-centre-tile]')!.textContent).toContain('could not be loaded');
    press('Retry');
    await waitFor(() => expect(document.querySelector('[data-season-help]')).not.toBeNull());
    expect(calls).toBe(2);
  });

  it('shows the plain tile, never a throw, for a binding with no Season Center', async () => {
    mount(NBA_CAREER_SPORT.loadSeasonCentre ? { ...NBA_CAREER_SPORT, loadSeasonCentre: undefined } : NBA_CAREER_SPORT, playNba('centre-d', 1));
    await waitFor(() => expect(document.querySelector('[data-centre-tile]')).not.toBeNull());
  });
});

/* ─── Round 1147: the NFL, bound to the same viewer ─── */
const NFL_WITH_LOADER: UsCareerSport = { ...NFL_CAREER_SPORT, loadSeasonCentre: () => Promise.resolve(NFL_SEASON) };

/** An NFL career played with the binding's own calls, cut back to the last season he played every game of
 *  (17 today, 16 in a throwback year from 2005 to 2020 since Round 1104). */
function playNfl(pos: string, seed: string, eraId = 'now'): UsCareerCore {
  const SB = NFL_CAREER_SPORT;
  /* a rookie may sit for years: the first keyed career that has a full season is the one used */
  for (let n = 0; n < 12; n += 1) {
    const rng = keyedRng(`${seed}|${n}`);
    const c = SB.startCareer('Rex Gridiron', pos, SB.create.archetypes[pos][0], rng, null as never, eraId);
    let tq = SB.rollTeamQuality(null, rng);
    SB.assignRole(c, tq, rng);
    for (let i = 0; i < 8; i += 1) {
      SB.campBattle(c, tq, rng);
      SB.simSeason(c, tq, rng);
      SB.progress(c, rng);
      tq = SB.rollTeamQuality(tq, rng);
    }
    const career: UsCareerCore = JSON.parse(JSON.stringify(c));
    const full = career.seasons.map(s => s.games === nflSeasonLength(s.year)).lastIndexOf(true);
    if (full < 0) continue;
    career.seasons = career.seasons.slice(0, full + 1);
    return career;
  }
  throw new Error(`usSeasonCentre.test: no ${pos} career of seed ${seed} has a full season`);
}

describe('the US Season Center with the NFL bound', () => {
  const CASES: [string, RegExp, string, string][] = [
    ['QB', /^\d+ YDS\d+ TD\d+ INT$/, 'Pass yds', 'passYds'],
    ['K', /^\d\/\d FG(LONG \d+)?$/, 'FG made', 'fgMade'],
    ['LB', /^\d+ TKL/, 'Tackles', 'tackles'],
  ];
  it.each(CASES)('walks a %s season from the kick off card to the review: drives on the clock, his line, the record and his totals', async (pos, lineRe, tile, field) => {
    const career = playNfl(pos, `nfl-centre-${pos}`);
    const saved = JSON.stringify(career);
    const { row, onClose } = mount(NFL_WITH_LOADER, career);
    await waitFor(() => expect(document.querySelector('[data-season-help]')).not.toBeNull());
    const help = document.querySelector('[data-season-help]')!.textContent!;
    expect(help).toContain('How the Season Center works');
    expect(help).toContain('a champion wins 11 to 15 of 17');
    expect(help).toContain('Ties are real in the NFL');
    press('Got it');
    const kick = document.querySelector('[data-kickoff]')!;
    expect(kick.textContent).toContain(NFL_CAREER_SPORT.teamLabelOf(row.team, career.eraId));
    expect(kick.querySelector('[data-frame-line]')!.textContent).toMatch(/^17 games · (8 home, 9 away|9 home, 8 away) · the league's schedule formula/);
    expect(kick.textContent).toContain('▶ Kick off');
    press('Kick off');
    press('Results');
    await waitFor(() => expect(document.querySelector('[data-full-time]')).not.toBeNull());
    expect(document.querySelector('[data-full-time]')!.textContent).toBe('Final');
    expect(document.querySelector('[data-clock-minute]')!.textContent).toBe('FINAL');
    /* every line of the feed has its time in the wide column, as the quarter and the minutes left */
    const lines = [...document.querySelectorAll('[data-clock-events] li')];
    expect(lines.length).toBeGreaterThan(0);
    for (const li of lines) {
      const time = li.querySelector('span')!;
      expect(time.className).toContain('w-14');
      expect(time.className).not.toContain('w-8');
      expect(time.textContent).toMatch(/^Q[1-4] \d{1,2}:00$/);
      expect(li.textContent!.length).toBeGreaterThan(time.textContent!.length + 5);
    }
    /* the bug shows the score the drives in the feed add up to */
    const worth = (t: string) => (t.includes('Touchdown') ? (t.includes('no good') ? 6 : t.includes('two point') ? 8 : 7) : t.includes('Field goal') ? 3 : t.includes('Safety') ? 2 : 0);
    const total = lines.reduce((a, li) => a + worth(li.textContent!), 0);
    const [hg, ag] = document.querySelector('[data-score-bug]')!.textContent!.split('-').map(Number);
    expect(total).toBe(hg + ag);
    expect(document.querySelector('[data-his-line]')!.textContent).toMatch(lineRe);
    expect(document.querySelector('[data-record-panel]')!.getAttribute('data-record')).toMatch(/^(1-0|0-1|0-0-1)$/);
    press('Sim the rest');
    const review = document.querySelector('[data-review]')!;
    expect(review.querySelector('[data-review-finish]')!.textContent).toContain(row.teamResult);
    expect(review.querySelector('[data-review-finish]')!.textContent).toMatch(/^\d+-\d+(-\d+)? · /);
    expect(review.querySelector('[data-review-tile="Games"]')!.textContent).toContain('17');
    const want = (row as unknown as Record<string, number>)[field];
    expect(review.querySelector(`[data-review-tile="${tile}"]`)!.textContent).toContain(want.toLocaleString('en-US'));
    expect(!!review.querySelector('[data-playoff-path]')).toBe((NFL_SEASON.results as readonly string[]).includes(row.teamResult));
    act(() => { fireEvent.click(document.querySelector('[data-centre-exit]')!); });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(career)).toBe(saved);
    expect(Object.keys(localStorage)).toEqual(['seasonCentre:help:nfl']);
  });

  it('prints the NFL playoff sentence as the save holds it, one game as "1 game", and every round with no score', () => {
    const career = playNfl('QB', 'nfl-centre-po');
    const base = career.seasons[career.seasons.length - 1];
    const read = (over: Record<string, unknown>) => {
      const row = { ...base, ...over } as UsRow;
      const one: UsCareerCore = { ...career, seasons: [...career.seasons.slice(0, -1), row] };
      const b = buildUsSeason(NFL_SEASON, one, row, NFL_CAREER_SPORT.teamLabelOf);
      if (b.ok === false) throw new Error(`usSeasonCentre.test: ${b.why}`);
      const s = deriveSeason(b.sport, row, b.ctx);
      if (!s) throw new Error('usSeasonCentre.test: the season has no game by game view');
      const path = buildUsModel(NFL_CAREER_SPORT, NFL_SEASON, one, row, b.ctx, s, b.key).review.path;
      if (!path) throw new Error('usSeasonCentre.test: no playoff path');
      return path;
    };
    const lost = read({ teamResult: NFL_SEASON.results[0], poGames: 1, poLine: '238 yds, 2 TD, 1 INT' });
    expect(lost.line).toBe('Your playoffs: 1 team game, 238 yds, 2 TD, 1 INT');
    expect(lost.steps.map(st => [st.label, st.won])).toEqual([['Wild Card', false]]);
    expect(lost.steps[0].text).toMatch(/^lost to the \S/);
    const two = read({ teamResult: NFL_SEASON.results[1], poGames: 2, poLine: '4 of 5 on field goals' });
    expect(two.line).toBe('Your playoffs: 2 team games, 4 of 5 on field goals');
    expect(two.steps.map(st => [st.label, st.won])).toEqual([['Wild Card', true], ['Divisional', false]]);
    /* the save holds no playoff score, so no round prints one (a keyed score could not be held to "4 of 5") */
    for (const st of [...lost.steps, ...two.steps]) expect(st.text).not.toMatch(/\d+-\d+/);
    /* an older line with no playoff numbers shows the rounds and no sentence */
    const bare = read({ teamResult: NFL_SEASON.results[0], poGames: undefined, poLine: undefined });
    expect(bare.line).toBeNull();
    expect(bare.steps).toHaveLength(1);
  });

  it('shows the held line, never a guess, for a throwback season the real league played 16 games of', async () => {
    const career = playNfl('QB', 'nfl-centre-held', 'y2005');
    const row = career.seasons[0];
    expect(row.year).toBe(2005);
    render(<MemoryRouter><UsSeasonCentre sport={NFL_WITH_LOADER} career={career} row={row} onClose={vi.fn()} /></MemoryRouter>);
    await waitFor(() => expect(document.querySelector('[data-centre-tile]')).not.toBeNull());
    expect(document.querySelector('[data-centre-tile]')!.textContent).toContain(usSeasonHeldLine('nfl', 2005)!);
    expect(document.querySelector('[data-kickoff]')).toBeNull();
  });
});

describe('saved US season OVR in the game reports', () => {
  it.each([
    { sport: WITH_LOADER, slug: 'nba', career: () => playNba('centre-a', 2), games: 82, opening: 72, finish: 76 },
    { sport: NFL_WITH_LOADER, slug: 'nfl', career: () => playNfl('QB', 'nfl-centre-QB'), games: 17, opening: 78, finish: 74 },
    { sport: { ...MLB_CAREER_SPORT, loadSeasonCentre: () => Promise.resolve(MLB_SEASON) }, slug: 'mlb', career: () => openMlb('CF', 'mlb-centre-po'), games: 162, opening: 71, finish: 75 },
  ] as const)('reads the complete $slug checkpoint path', async ({ sport, slug, career: make, games, opening, finish }) => {
    const career = make();
    const row = career.seasons.at(-1)!;
    const rating = stageUsSeasonRating(slug, { ...career, ovr: opening }, games, () => finish);
    row.seasonRating = rating;
    const saved = JSON.stringify(career);
    mount(sport, career);
    await waitFor(() => expect(document.querySelector('[data-season-help]')).not.toBeNull());
    press('Got it');
    press(slug === 'nba' ? 'Tip off' : slug === 'mlb' ? 'Play ball' : 'Kick off');
    const stage = document.querySelector('[data-matchday="1"]')!;
    expect(stage.querySelector('[data-match-development-overall]')).toHaveTextContent(`Season OVR ${opening} · Opening matchday`);
    press('Results');
    await waitFor(() => expect(document.querySelector('[data-full-time]')).not.toBeNull());
    const fixtures = document.querySelector<HTMLButtonElement>('[data-centre-fixtures]')!;
    fireEvent.click(fixtures);
    const activeLog = within(document.querySelector('[data-centre-stage] [data-fixtures]')!);
    expect(activeLog.getAllByRole('button', { name: /Match report:/ })).toHaveLength(1);
    press('← Back');
    const [checkpoint, after] = rating.checkpoints[0];
    const direction = finish > opening ? 'Up 1' : 'Down 1';
    if (slug === 'nfl') {
      for (let game = 2; game < checkpoint; game++) {
        press(`Game ${game}`);
        await waitFor(() => expect(document.querySelector(`[data-matchday="${game}"] [data-full-time]`)).not.toBeNull());
      }
      press('1x');
      press(`Game ${checkpoint}`);
      const prior = document.querySelector(`[data-matchday="${checkpoint}"]`)!;
      expect(prior.querySelector('[data-match-development-overall]')).toHaveTextContent(`Season OVR ${opening} · No change`);
      press('Results');
      await waitFor(() => expect(prior.querySelector('[data-match-development-overall]')).toHaveTextContent(`Season OVR ${after} · ${direction}`));
    }
    press('Sim the rest');
    const reportButtons = within(document.querySelector('[data-fixtures]')!).getAllByRole('button', { name: /Match report:/ });
    expect(reportButtons).toHaveLength(games);
    for (const [game, text] of [
      [checkpoint - 1, `Season OVR ${opening} · No change`],
      [checkpoint, `Season OVR ${after} · ${direction}`],
      [checkpoint + 1, `Season OVR ${after} · No change`],
      [games, `Season OVR ${finish} · ${direction}`],
    ] as const) {
      fireEvent.click(reportButtons[game - 1]);
      const report = screen.getByRole('dialog', { name: 'Match report' });
      expect(report.querySelector('[data-match-development-overall]')).toHaveTextContent(text);
      fireEvent.keyDown(report, { key: 'Escape' });
    }
    expect(JSON.stringify(career)).toBe(saved);
    expect(Object.keys(localStorage)).toEqual([`seasonCentre:help:${slug}`]);
  });
});

/* ─── Round 1212: baseball, bound to the same viewer ─── */
const MLB_WITH_LOADER: UsCareerSport = { ...MLB_CAREER_SPORT, loadSeasonCentre: () => Promise.resolve(MLB_SEASON) };

/** An MLB career played with the binding's own calls on a seeded stream. */
function playMlb(pos: string, seed: string, seasons: number, eraId = 'now'): UsCareerCore {
  const rng = keyedRng(seed);
  const SB = MLB_CAREER_SPORT;
  const c = SB.startCareer('Cal Linedrive', pos, SB.create.archetypes[pos][0], rng, null as never, eraId);
  let tq = SB.rollTeamQuality(null, rng);
  SB.assignRole(c, tq, rng);
  for (let i = 0; i < seasons; i += 1) {
    SB.campBattle(c, tq, rng);
    SB.simSeason(c, tq, rng);
    SB.progress(c, rng);
    tq = SB.rollTeamQuality(tq, rng);
  }
  return JSON.parse(JSON.stringify(c));
}

/** The first keyed hitter career whose last season the view lays out (a season it refuses shows the plain tile). */
function openMlb(pos: string, seed: string): UsCareerCore {
  for (let n = 0; n < 12; n += 1) {
    const career = playMlb(pos, `${seed}|${n}`, 2);
    const row = career.seasons[career.seasons.length - 1] as UsRow;
    const b = buildUsSeason(MLB_SEASON, career, row, MLB_CAREER_SPORT.teamLabelOf);
    if (b.ok && deriveSeason(b.sport, row, b.ctx)) return career;
  }
  throw new Error(`usSeasonCentre.test: no ${pos} career of seed ${seed} has a season the view lays out`);
}

describe('the US Season Center with MLB bound', () => {
  it.each([true, false])('shows the saved reliever record at the end of a replay (%s)', async compatible => {
    const career = openMlb('RP', 'reliever-record');
    const row = career.seasons[career.seasons.length - 1] as UsRow;
    const wins = Number(row.wins), losses = Number(row.lossesP);
    expect(wins + losses).toBeGreaterThan(0);
    if (!compatible) row.saves = row.games;
    const built = buildUsSeason(MLB_SEASON, career, row, MLB_CAREER_SPORT.teamLabelOf);
    if (built.ok === false) throw new Error(built.why);
    const season = deriveSeason(built.sport, row, built.ctx)!;
    const appearance = compatible
      ? season.games.find(game => game.line.wins === 1 || game.line.lossesP === 1)!
      : season.games.find(game => game.played)!;
    expect(appearance?.played).toBe(true);
    const before = JSON.stringify(career);

    mount(MLB_WITH_LOADER, career);
    await waitFor(() => expect(document.querySelector('[data-season-help]')).not.toBeNull());
    press('Got it');
    press('Play ball');
    press('Sim the rest');
    const review = document.querySelector('[data-review]')!;
    expect(review.querySelector('[data-review-tile="Wins"]')).toHaveTextContent(String(wins));
    expect(review.querySelector('[data-review-tile="Losses"]')).toHaveTextContent(String(losses));
    const running = document.querySelector('[data-so-far-desktop]')!;
    if (compatible) {
      expect(running).toHaveTextContent(new RegExp(`\\b${wins} w · ${losses} l\\b`));
    } else {
      expect(running).not.toHaveTextContent(/\d+ [wl]\b/);
    }
    const match = within(document.querySelector(`[data-fixture-row="${appearance.md}"]`)!).getByRole('button', { name: /Match report:/ });
    fireEvent.click(match);
    const report = await screen.findByRole('dialog', { name: 'Match report' });
    const line = within(report.querySelector('[data-his-line]')!);
    expect(line.getByText(compatible ? appearance.line.wins === 1 ? 'W' : 'L' : 'Pitching decisions unavailable by game')).toBeInTheDocument();
    expect(JSON.stringify(career)).toBe(before);
  });

  it('prints baseball\'s playoff line the way the other sports read: the games, then his line as the save holds it', () => {
    const career = openMlb('CF', 'mlb-centre-po');
    const base = career.seasons[career.seasons.length - 1];
    /* a Division Series exit of today's rounds: seven games fit a best of three and a best of five */
    const row = { ...base, teamResult: 'Lost the Division Series', poGames: 7, poLine: '9 for 28 (.321), 2 HR' } as UsRow;
    const one: UsCareerCore = { ...career, seasons: [...career.seasons.slice(0, -1), row] };
    const b = buildUsSeason(MLB_SEASON, one, row, MLB_CAREER_SPORT.teamLabelOf);
    if (b.ok === false) throw new Error(`usSeasonCentre.test: ${b.why}`);
    const s = deriveSeason(b.sport, row, b.ctx);
    if (!s) throw new Error('usSeasonCentre.test: the season has no game by game view');
    const review = buildUsModel(MLB_CAREER_SPORT, MLB_SEASON, one, row, b.ctx, s, b.key).review;
    expect(review.path!.line).toBe('Your playoffs: 7 games, 9 for 28 (.321), 2 HR');
    expect(review.path!.steps.map(st => st.label)).toEqual(['Wild Card Series', 'Division Series']);
    expect(review.notes).toEqual([]);
  });
  it.each(['CF', 'C', 'DH'])('walks a %s season from the first pitch card to the review: innings on the clock, his line, the record and his totals', async pos => {
    const career = openMlb(pos, `mlb-centre-${pos}`);
    const saved = JSON.stringify(career);
    const { row, onClose } = mount(MLB_WITH_LOADER, career);
    await waitFor(() => expect(document.querySelector('[data-season-help]')).not.toBeNull());
    const help = document.querySelector('[data-season-help]')!.textContent!;
    expect(help).toContain('How the Season Center works');
    expect(help).toContain('Baseball is played in series');
    expect(help).toContain('Walks are not dealt game by game');
    expect(help).toContain('this career has no first round bye');
    press('Got it');
    const kick = document.querySelector('[data-kickoff]')!;
    expect(kick.textContent).toContain(MLB_CAREER_SPORT.teamLabelOf(row.team, career.eraId));
    expect(kick.querySelector('[data-frame-line]')!.textContent).toMatch(/^162 games · 81 home, 81 away/);
    expect(kick.textContent).toContain('▶ Play ball');
    press('Play ball');
    press('Results');
    await waitFor(() => expect(document.querySelector('[data-full-time]')).not.toBeNull());
    expect(document.querySelector('[data-full-time]')!.textContent).toBe('Final');
    expect(document.querySelector('[data-clock-minute]')!.textContent).toBe('FINAL');
    /* every line of the feed is an inning (or the one mark after the ninth), and the runs in it add up to the score */
    const lines = [...document.querySelectorAll('[data-clock-events] li')];
    expect(lines.length).toBeGreaterThan(0);
    let runs = 0;
    for (const li of lines) {
      const time = li.querySelector('span')!;
      expect(time.textContent).toMatch(/^([1-9](st|nd|rd|th)|EXT)$/);
      const put = /put (\d+) on the board (in the [1-9](st|nd|rd|th)|in extra innings)$/.exec(li.textContent!);
      if (put) runs += Number(put[1]);
      else expect(li.textContent).toMatch(/You go deep (in the [1-9](st|nd|rd|th)|in extra innings)$/);
    }
    const [hg, ag] = document.querySelector('[data-score-bug]')!.textContent!.split('-').map(Number);
    expect(runs).toBe(hg + ag);
    expect(hg).not.toBe(ag);
    /* his line is hits and at bats first, or the words for a game he sat out */
    expect(document.querySelector('[data-his-line]')!.textContent).toMatch(/^(\d-\d|Did not play)/);
    expect(document.querySelector('[data-record-panel]')!.getAttribute('data-record')).toMatch(/^(1-0|0-1)$/);
    press('Sim the rest');
    const review = document.querySelector('[data-review]')!;
    expect(review.querySelector('[data-review-finish]')!.textContent).toContain(row.teamResult);
    expect(review.querySelector('[data-review-finish]')!.textContent).toMatch(/^\d+-\d+ · /);
    const line = row as unknown as Record<string, number>;
    expect(review.querySelector('[data-review-tile="Games"]')!.textContent).toContain(String(line.games));
    expect(review.querySelector('[data-review-tile="HR"]')!.textContent).toContain(String(line.hr));
    expect(review.querySelector('[data-review-tile="RBI"]')!.textContent).toContain(String(line.rbi));
    /* the average reads as the season card prints it (.276), never with the board review's leading zero */
    const avgTile = review.querySelector('[data-review-tile="AVG"]')!.textContent!;
    expect(avgTile).toContain((row as unknown as { avg: number }).avg.toFixed(3).slice(1));
    expect(avgTile).not.toContain('0.');
    expect(MLB_CAREER_SPORT.statLine(row as never, pos)).toContain((row as unknown as { avg: number }).avg.toFixed(3).slice(1));
    act(() => { fireEvent.click(document.querySelector('[data-centre-exit]')!); });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(career)).toBe(saved);
    expect(Object.keys(localStorage)).toEqual(['seasonCentre:help:mlb']);
  }, 60000);

  it('shows the held line for the 60 game season and for a club outside the league, never a guess', async () => {
    const shows = async (career: UsCareerCore, row: UsCareerCore['seasons'][number], line: string) => {
      render(<MemoryRouter><UsSeasonCentre sport={MLB_WITH_LOADER} career={career} row={row} onClose={vi.fn()} /></MemoryRouter>);
      await waitFor(() => expect(document.querySelector('[data-centre-tile]')).not.toBeNull());
      expect(document.querySelector('[data-centre-tile]')!.textContent).toContain(line);
      expect(document.querySelector('[data-kickoff]')).toBeNull();
      cleanup();
    };
    const hitter = playMlb('CF', 'mlb-centre-held', 1);
    const short = { ...hitter.seasons[0], year: 2020, team: 'BOS' };
    await shows({ ...hitter, eraId: 'y2004', seasons: [short] }, short, 'the real 2020 season had 60 games');
    const abroad = { ...hitter.seasons[0], team: 'Yomiuri Giants' };
    await shows({ ...hitter, seasons: [abroad] }, abroad, 'your club plays outside Major League Baseball');
  }, 30000);
});
