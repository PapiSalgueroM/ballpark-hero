import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import UsSeasonCentre from '@/components/us-career/season/UsSeasonCentre';
import CareerSeasonReview from '@/components/us-career/CareerSeasonReview';
import { UsSeasonCentreEntry } from '@/components/us-career/season/UsSeasonCentreEntry';
import { UsSeasonCentreHost } from '@/components/us-career/season/UsSeasonCentreHost';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { MLB_SEASON } from '@/lib/season/mlb';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NBA_SEASON } from '@/lib/season/nba';
import { buildUsSeason, usPlayoffLay, type UsRow } from '@/lib/season/us';
import { deriveSeason } from '@/lib/season/core';
import { keyedRng } from '@/lib/keyedRng';
import { resetCareerMomentsForTest } from '@/components/soccer-career/careerMoments';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

const POST_LINE = '9 for 28 (.321), 2 HR';
const fixtures = new Map<string, UsCareerCore>();

function mlbViewerSport(): UsCareerSport {
  return { ...MLB_CAREER_SPORT, loadSeasonCentre: () => Promise.resolve(MLB_SEASON) };
}

function played(sport: UsCareerSport, pos: string, seed: string): UsCareerCore {
  const rng = keyedRng(seed);
  const career = sport.startCareer('Replay Prospect', pos, sport.create.archetypes[pos][0], rng, null as never, 'now');
  let quality = sport.rollTeamQuality(null, rng);
  sport.assignRole(career, quality, rng);
  for (let year = 0; year < 2; year += 1) {
    sport.campBattle(career, quality, rng);
    sport.simSeason(career, quality, rng);
    sport.progress(career, rng);
    quality = sport.rollTeamQuality(quality, rng);
  }
  return JSON.parse(JSON.stringify(career));
}

function hitter(id: string, overrides: Record<string, unknown> = {}): UsCareerCore {
  if (!fixtures.has(id)) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const career = played(MLB_CAREER_SPORT, 'CF', `mlb-playoff-viewer|${id}|${attempt}`);
      const at = career.seasons.length - 1;
      const row = { ...career.seasons[at], teamResult: 'Lost the Division Series', poGames: 7, poLine: POST_LINE, ...overrides } as UsRow;
      career.seasons[at] = row;
      const built = buildUsSeason(MLB_SEASON, career, row, MLB_CAREER_SPORT.teamLabelOf);
      if (built.ok && deriveSeason(built.sport, row, built.ctx)) { fixtures.set(id, career); break; }
    }
  }
  const career = fixtures.get(id);
  if (!career) throw new Error(`No actual regular-season layout for fixture ${id}`);
  return JSON.parse(JSON.stringify(career));
}

function savedPitcher(pos: 'SP' | 'RP') {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const career = played(MLB_CAREER_SPORT, pos, `mlb-pitcher-playoff|${pos}|${attempt}`);
    const row = career.seasons.at(-1) as UsRow;
    if (typeof row.poGames === 'number' && row.poGames > 0 && row.games > 0) return { career, row };
  }
  throw new Error(`No real saved MLB postseason for ${pos}`);
}

async function review(career: UsCareerCore, sport = mlbViewerSport()) {
  const onClose = vi.fn();
  localStorage.setItem(`seasonCentre:help:${sport.slug}`, '1');
  const row = career.seasons[career.seasons.length - 1];
  const view = render(<MemoryRouter><UsSeasonCentre sport={sport} career={career} row={row} onClose={onClose} /></MemoryRouter>);
  await waitFor(() => expect(view.container.querySelector('[data-kickoff]')).not.toBeNull());
  fireEvent.click(view.getByRole('button', { name: /Straight to the season review/ }));
  expect(view.container.querySelector('[data-review]')).not.toBeNull();
  return { view, row, onClose };
}

function replayButton(view: ReturnType<typeof render>) {
  const button = view.queryByRole('button', { name: 'Replay playoffs' });
  expect(button, 'A supported MLB season needs its game-by-game playoff replay control').not.toBeNull();
  return button!;
}

async function enterReplay(view: ReturnType<typeof render>) {
  fireEvent.click(replayButton(view));
  await waitFor(() => expect(view.container.querySelector('[data-mlb-playoff-replay]')).not.toBeNull());
  const replay = view.container.querySelector('[data-mlb-playoff-replay]') as HTMLElement;
  const help = replay.querySelector('[data-season-help]');
  if (help) fireEvent.click(within(help as HTMLElement).getByRole('button', { name: 'Got it' }));
  return replay;
}

function reveal(replay: HTMLElement) {
  expect(replay.querySelector('[data-mlb-playoff-result]')).toBeNull();
  fireEvent.click(within(replay).getByRole('button', { name: 'Show game result' }));
  const result = replay.querySelector('[data-mlb-playoff-result]')!.textContent;
  expect(result).toMatch(/^(Win|Loss)$/);
  expect(replay.querySelector('[data-score-bug]')).toBeNull();
  expect(replay.querySelector('[data-his-line]')).toBeNull();
  return result === 'Win';
}

beforeEach(() => { localStorage.clear(); resetCareerMomentsForTest(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('MLB playoff replay from the real season viewer', { timeout: 90000 }, () => {
  it('steps through every game of the saved playoff run and returns to the same regular review', async () => {
    const career = hitter('division-exit');
    const saved = JSON.stringify(career);
    localStorage.setItem(MLB_CAREER_SPORT.saveKey, saved);
    const { view, row, onClose } = await review(career);
    const regularReview = view.container.querySelector('[data-review]')!.innerHTML;
    const built = buildUsSeason(MLB_SEASON, career, row as UsRow, MLB_CAREER_SPORT.teamLabelOf);
    if (built.ok === false) throw new Error('The actual supported MLB fixture lost its context');
    const lay = usPlayoffLay(MLB_SEASON, row as UsRow, built.ctx, built.key)!;
    expect(lay.series.map(series => series.round)).toEqual(['Wild Card Series', 'Division Series']);
    const replay = await enterReplay(view);
    let count = 0;
    for (const series of lay.series) {
      let mine = 0; let theirs = 0;
      for (let game = 1; game <= series.games!; game += 1) {
        expect(mine).toBeLessThan(series.need);
        expect(theirs).toBeLessThan(series.need);
        const card = replay.querySelector('[data-mlb-playoff-game]')!;
        expect(card.textContent).toContain(series.round);
        expect(card.textContent).toContain(`Game ${game}`);
        const showResult = within(replay).getByRole('button', { name: 'Show game result' });
        showResult.focus();
        expect(document.activeElement).toBe(showResult);
        if (reveal(replay)) mine += 1; else theirs += 1;
        const action = within(replay).getByRole('button', { name: count < 6 ? 'Next playoff game' : 'Replay again' });
        expect(document.activeElement, 'Revealing a playoff result must keep native focus on the next action').toBe(action);
        expect(within(replay).queryByText(`Series wins: ${mine}-${theirs}`, { exact: true })).toBeTruthy();
        count += 1;
        if (count < 7) fireEvent.click(within(replay).getByRole('button', { name: 'Next playoff game' }));
      }
      expect(series.won ? mine : theirs).toBe(series.need);
      expect(series.won ? theirs : mine).toBe(series.games! - series.need);
    }
    expect(count).toBe(7);
    expect(within(replay).queryByRole('button', { name: 'Next playoff game' })).toBeNull();
    expect(replay.textContent).toContain(row.teamResult);
    expect(within(replay).getAllByText(POST_LINE, { exact: true })).toHaveLength(1);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(within(replay).getByRole('button', { name: 'Back to regular season' }));
    expect(view.container.querySelector('[data-mlb-playoff-replay]')).toBeNull();
    expect(view.container.querySelector('[data-season-centre]')!.getAttribute('aria-hidden')).not.toBe('true');
    expect(view.container.querySelector('[data-review]')!.innerHTML).toBe(regularReview);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(career)).toBe(saved);
    expect(localStorage.getItem(MLB_CAREER_SPORT.saveKey)).toBe(saved);
  });

  it('reopens the same W/L replay, explains its limits and reopens its rules', async () => {
    const career = hitter('reopen');
    const { view, onClose } = await review(career);
    fireEvent.click(replayButton(view));
    await waitFor(() => expect(view.container.querySelector('[data-mlb-playoff-replay] [data-season-help]')).not.toBeNull());
    let replay = view.container.querySelector('[data-mlb-playoff-replay]') as HTMLElement;
    expect(replay.querySelector('[data-season-help]')!.textContent).toContain('not saved');
    fireEvent.click(within(replay).getByRole('button', { name: 'Got it' }));
    const trace = () => Array.from({ length: 7 }, (_, index) => {
      const won = reveal(replay);
      if (index < 6) fireEvent.click(within(replay).getByRole('button', { name: 'Next playoff game' }));
      return won;
    });
    const first = trace();
    fireEvent.click(within(replay).getByRole('button', { name: 'Back to regular season' }));
    replay = await enterReplay(view);
    expect(trace()).toEqual(first);
    fireEvent.click(within(replay).getByRole('button', { name: 'How the playoff replay works' }));
    expect(replay.querySelector('[data-season-help]')).not.toBeNull();
    fireEvent.click(within(replay).getByRole('button', { name: 'Got it' }));
    const dialog = replay.matches('[role="dialog"]') ? replay : within(replay).getByRole('dialog', { name: 'Playoff replay' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps forward and backward keyboard focus inside the replay and its help', async () => {
    const { view, onClose } = await review(hitter('keyboard'));
    await enterReplay(view);
    const replay = view.getByRole('dialog', { name: 'Playoff replay' });
    const first = within(replay).getByRole('button', { name: 'How the playoff replay works' });
    const last = within(replay).getByRole('button', { name: 'Back to regular season' });

    replay.focus();
    fireEvent.keyDown(replay, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
    expect(fireEvent.keyDown(last, { key: 'Tab' })).toBe(false);
    expect(document.activeElement).toBe(first);
    expect(fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(last);

    fireEvent.click(first);
    const help = view.getByRole('dialog', { name: 'How the playoff replay works' });
    const gotIt = within(help).getByRole('button', { name: 'Got it' });
    fireEvent.keyDown(help, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(gotIt);
    expect(fireEvent.keyDown(gotIt, { key: 'Tab' })).toBe(false);
    expect(document.activeElement).toBe(gotIt);
    fireEvent.keyDown(gotIt, { key: 'Escape' });
    expect(document.activeElement).toBe(first);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps unsupported playoff counts and pre-format seasons on their honest regular review', async () => {
    for (const [id, overrides] of [
      ['missing', { poGames: undefined }], ['fraction', { poGames: 6.5 }],
      ['impossible', { poGames: 1 }], ['older-format', { year: 2021 }],
    ] as const) {
      const { view } = await review(hitter(id, overrides));
      expect(view.queryByRole('button', { name: 'Replay playoffs' })).toBeNull();
      expect(view.container.querySelector('[data-review]')).not.toBeNull();
      cleanup();
    }
  });

  it('leaves ordinary regular-season review, saved bytes and the engine RNG alone', async () => {
    const career = hitter('regular-preserved');
    const saved = JSON.stringify(career);
    localStorage.setItem(MLB_CAREER_SPORT.saveKey, saved);
    const random = vi.spyOn(Math, 'random');
    const { view, row } = await review(career);
    expect(view.container.querySelector('[data-review-finish]')!.textContent).toContain(row.teamResult);
    expect(view.container.querySelector('[data-review-tile="Games"]')!.textContent).toContain(String(row.games));
    expect(view.container.querySelector('[data-playoff-line]')!.textContent).toContain(POST_LINE);
    expect(random).not.toHaveBeenCalled();
    expect(JSON.stringify(career)).toBe(saved);
    expect(localStorage.getItem(MLB_CAREER_SPORT.saveKey)).toBe(saved);
    expect(Object.keys(localStorage).sort()).toEqual([MLB_CAREER_SPORT.saveKey, 'seasonCentre:help:mlb'].sort());
  });

  it('keeps another sport on its existing season viewer', async () => {
    const career = played(NBA_CAREER_SPORT, 'SG', 'mlb-playoff-viewer|nba-held');
    const saved = JSON.stringify(career);
    const { view, row } = await review(career, { ...NBA_CAREER_SPORT, loadSeasonCentre: () => Promise.resolve(NBA_SEASON) });
    expect(view.queryByRole('button', { name: 'Replay playoffs' })).toBeNull();
    expect(view.container.querySelector('[data-review-finish]')!.textContent).toContain(row.teamResult);
    expect(JSON.stringify(career)).toBe(saved);
  });

  it('preserves the current pitcher, short-season and outside-league held views', async () => {
    const pitcher = savedPitcher('SP').career;
    const hitterCareer = hitter('held-context');
    const last = hitterCareer.seasons[hitterCareer.seasons.length - 1];
    const cases = [
      { career: pitcher, row: { ...pitcher.seasons[pitcher.seasons.length - 1], poGames: undefined }, note: 'for pitchers yet' },
      { career: hitterCareer, row: { ...last, year: 2020, team: 'BOS' }, note: 'the real 2020 season had 60 games' },
      { career: hitterCareer, row: { ...last, team: 'Yomiuri Giants' }, note: 'your club plays outside Major League Baseball' },
    ];
    for (const { career, row, note } of cases) {
      const view = render(<MemoryRouter><UsSeasonCentre sport={mlbViewerSport()} career={career} row={row} onClose={vi.fn()} /></MemoryRouter>);
      await waitFor(() => expect(view.container.querySelector('[data-centre-tile]')).not.toBeNull());
      expect(view.container.querySelector('[data-centre-tile]')!.textContent).toContain(note);
      expect(view.queryByRole('button', { name: 'Replay playoffs' })).toBeNull();
      cleanup();
    }
  });

  it.each(['SP', 'RP'] as const)('opens team-only playoffs from a genuinely played %s save while holding regular games', async pos => {
    const { career, row } = savedPitcher(pos);
    const saved = JSON.stringify({ c: career, phase: 'season', teamQuality: 80, coach: null });
    localStorage.setItem(MLB_CAREER_SPORT.saveKey, saved);
    const random = vi.spyOn(Math, 'random');
    const onPlay = vi.fn();
    const sport = mlbViewerSport();
    const view = render(<MemoryRouter><UsSeasonCentreHost sport={sport}>
      <UsSeasonCentreEntry sport={sport} career={career} busy={false} onPlay={onPlay} />
    </UsSeasonCentreHost></MemoryRouter>);
    expect(view.getByText(/No week by week for pitchers yet/)).toBeInTheDocument();
    expect(view.queryByRole('button', { name: /watch .* game by game/i })).toBeNull();
    const opener = view.getByRole('button', { name: /Replay \d+ team playoffs/ });
    fireEvent.click(opener);
    const replay = await view.findByRole('dialog', { name: 'Playoff replay' });
    fireEvent.click(within(replay).getByRole('button', { name: 'Got it' }));
    expect(within(replay).queryByRole('button', { name: 'Back to regular season' })).toBeNull();
    for (let i = 0; i < Number(row.poGames); i += 1) {
      reveal(replay);
      if (i + 1 < Number(row.poGames)) fireEvent.click(within(replay).getByRole('button', { name: 'Next playoff game' }));
    }
    expect(within(replay).getByText(row.teamResult)).toBeInTheDocument();
    expect(within(replay).getByText(String(row.poLine))).toBeInTheDocument();
    fireEvent.click(within(replay).getByRole('button', { name: 'Back to your season' }));
    await waitFor(() => expect(document.activeElement).toBe(opener));
    expect(view.queryByRole('dialog', { name: 'Playoff replay' })).toBeNull();
    expect(localStorage.getItem(MLB_CAREER_SPORT.saveKey)).toBe(saved);
    expect(onPlay).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
  });

  it('replays a prior saved postseason from the selected Career Log year after retirement', async () => {
    const { career, row } = savedPitcher('SP');
    career.retired = true;
    career.seasons.push({ ...row, year: row.year + 1, teamResult: 'Missed October' });
    const saved = JSON.stringify({ c: career, phase: 'retired', teamQuality: 80, coach: null });
    localStorage.setItem(MLB_CAREER_SPORT.saveKey, saved);
    const sport = mlbViewerSport();
    const view = render(<MemoryRouter><UsSeasonCentreHost sport={sport}>
      <CareerSeasonReview sport={sport} career={career} onBack={vi.fn()} backLabel="Back to retirement" />
    </UsSeasonCentreHost></MemoryRouter>);
    fireEvent.click(view.getByRole('button', { name: `Review ${row.year + 1} season` }));
    fireEvent.click(view.getByRole('button', { name: /^Postseason$/ }));
    expect(view.queryByRole('button', { name: 'Replay team playoffs' })).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Back to seasons' }));
    fireEvent.click(view.getByRole('button', { name: `Review ${row.year} season` }));
    fireEvent.click(view.getByRole('button', { name: /^Postseason$/ }));
    const opener = view.getByRole('button', { name: 'Replay team playoffs' });
    fireEvent.click(opener);
    const replay = await view.findByRole('dialog', { name: 'Playoff replay' });
    expect(within(replay).getByText(`Playoff game 1 of ${row.poGames}`)).toBeInTheDocument();
    fireEvent.click(within(replay).getByRole('button', { name: 'Got it' }));
    fireEvent.click(within(replay).getByRole('button', { name: 'Back to your season' }));
    await waitFor(() => expect(document.activeElement).toBe(opener));
    expect(view.getByRole('heading', { name: `${row.year} season` })).toBeInTheDocument();
    expect(view.getByRole('button', { name: /^Postseason$/ })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem(MLB_CAREER_SPORT.saveKey)).toBe(saved);
  });
});
