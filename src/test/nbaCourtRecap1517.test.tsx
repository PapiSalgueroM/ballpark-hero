import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { keyedRng } from '@/lib/keyedRng';
import { resetCareerMomentsForTest } from '@/components/soccer-career/careerMoments';
import { UsSeasonCentreHost } from '@/components/us-career/season/UsSeasonCentreHost';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NFL_SEASON } from '@/lib/season/nfl';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { MLB_SEASON } from '@/lib/season/mlb';
import { MatchClock } from '@/components/season-centre/MatchClock';
import { buildUsModel } from '@/components/us-career/season/UsSeasonCentre';
import { UsSeasonCentreEntry } from '@/components/us-career/season/UsSeasonCentreEntry';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NBA_SEASON } from '@/lib/season/nba';
import type { DerivedGame, DerivedSeason } from '@/lib/season/core';
import type { UsRow, UsSeasonBind, UsSeasonCtx } from '@/lib/season/us';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

/* Fictional supplied results. Quarter expectations are hand checked, not derived
   through the score helper or the artwork being tested. */
const GAME: DerivedGame = {
  md: 1, opp: 1, home: true, us: 100, them: 102, fixed: false,
  played: true, started: true, line: { pts: 27, reb: 8, ast: 6 },
  events: [
    { min: 12, kind: 'quarter', side: 'us', pts: 24 },
    { min: 12, kind: 'quarter', side: 'them', pts: 22 },
    { min: 23, kind: 'hot', side: 'us', mine: true },
    { min: 24, kind: 'quarter', side: 'us', pts: 31 },
    { min: 24, kind: 'quarter', side: 'them', pts: 28 },
    { min: 36, kind: 'quarter', side: 'us', pts: 18 },
    { min: 36, kind: 'quarter', side: 'them', pts: 27 },
    { min: 48, kind: 'quarter', side: 'us', pts: 27 },
    { min: 48, kind: 'quarter', side: 'them', pts: 25 },
  ],
};
const ROW: UsRow = {
  year: 2026, team: 'fictional-harbor', age: 24, ovr: 80, games: 82,
  awards: [], teamResult: 'Missed the playoffs', salary: 1000000,
  ppg: 27, rpg: 8, apg: 6,
};
const CAREER: UsCareerCore = {
  name: 'Court Reader', pos: 'SG', team: ROW.team, year: 2027, age: 25,
  ovr: 80, morale: 70, pot: 85, fanbase: 100, health: 100,
  salary: 1000000, contractYears: 2, seasons: [ROW], retired: false,
  draftPick: 12, earnings: 1000000, eraId: 'now',
};
const CTX: UsSeasonCtx = {
  name: CAREER.name, pos: CAREER.pos, eraId: CAREER.eraId, team: ROW.team,
  teamLabel: 'Harbor City', year: ROW.year, length: 82, shape: null,
  order: [], names: ['Harbor City', 'Summit Town'], divSlots: 0, confSlots: 0,
};
function suppliedModel(game: DerivedGame = GAME, bind: UsSeasonBind = NBA_SEASON, sport: UsCareerSport = NBA_CAREER_SPORT) {
  const season: DerivedSeason = {
    key: 'fictional-court-recap', mode: 'results', rule: null, teams: 2,
    labels: [
      { name: 'Harbor City', named: true, key: 'harbor' },
      { name: 'Summit Town', named: true, key: 'summit' },
    ],
    games: [game], rounds: [], bucket: null, clinch: null,
    target: { kind: 'none' }, attempt: 0, repairs: 0,
  };
  return buildUsModel(sport, bind, CAREER, ROW, CTX, season, season.key);
}

beforeEach(() => { localStorage.clear(); resetCareerMomentsForTest(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('NBA court recap, Round 1517', () => {
  it('draws a basketball court recap before any quarter has been scored', () => {
    const model = suppliedModel();
    render(<MatchClock
      game={GAME} clock={model.sport.clock} usName="Harbor City" themName="Summit Town"
      speed={1} paused reduced={false} onFullTime={vi.fn()}
      stage={model.sport.pitch ? at => model.sport.pitch!(GAME, at) : undefined}
    />);
    expect(document.querySelector('[data-match-clock]')).toHaveAttribute('data-score', '0-0');
    expect(screen.queryByRole('img', { name: /basketball court recap/i })).not.toBeNull();
  });

  it('offers Watch games on the NBA entry without changing the saved career', () => {
    const saved = JSON.stringify({ c: CAREER, phase: 'season' });
    localStorage.setItem(NBA_CAREER_SPORT.saveKey, saved);
    render(<UsSeasonCentreEntry sport={NBA_CAREER_SPORT} career={CAREER} busy={false} onPlay={vi.fn()} />);
    const entry = document.querySelector('[data-week-by-week]');
    expect(entry).not.toBeNull();
    expect(entry).toHaveTextContent('Watch games');
    expect(localStorage.getItem(NBA_CAREER_SPORT.saveKey)).toBe(saved);
  });
});

function drawAt(shown: number, game = GAME, paused = false, instant = false) {
  const model = suppliedModel(game);
  return render(<>{model.sport.pitch?.(game, { shown, paused, instant })}</>);
}
const court = () => document.querySelector('[data-nba-court]')!;
const quarterScores = () => [...document.querySelectorAll('[data-court-quarter]')].map(cell => cell.textContent);
const pressText = (text: string) => {
  const button = [...document.querySelectorAll('button')].find(b => b.textContent?.includes(text));
  if (!button) throw new Error(`NBA court test: no ${text} button`);
  act(() => { fireEvent.click(button); });
};

describe('NBA court, supplied quarter outcomes', () => {
  it.each([
    { shown: 0, score: '0-0', quarter: '1', cells: ['Q1?', 'Q2?', 'Q3?', 'Q4?'], lead: 'Level at 0-0' },
    { shown: 12, score: '24-22', quarter: '1', cells: ['Q124-22', 'Q2?', 'Q3?', 'Q4?'], lead: 'Harbor City lead by 2' },
    { shown: 24, score: '55-50', quarter: '2', cells: ['Q124-22', 'Q231-28', 'Q3?', 'Q4?'], lead: 'Harbor City lead by 5' },
    { shown: 36, score: '73-77', quarter: '3', cells: ['Q124-22', 'Q231-28', 'Q318-27', 'Q4?'], lead: 'Summit Town lead by 4' },
    { shown: 48, score: '100-102', quarter: '4', cells: ['Q124-22', 'Q231-28', 'Q318-27', 'Q427-25'], lead: 'Summit Town lead by 2' },
  ])('reconciles the supplied quarter totals at $shown minutes', ({ shown, score, quarter, cells, lead }) => {
    drawAt(shown);
    expect(court()).toHaveAttribute('data-score', score);
    expect(court()).toHaveAttribute('data-quarter', quarter);
    expect(quarterScores()).toEqual(cells);
    expect(document.querySelector('[data-court-summary]')).toHaveTextContent(lead);
    expect(court().textContent).not.toMatch(/27 PTS|8 REB|6 AST/);
  });

  it('keeps an away team on the same scoreboard side as the actual clock', () => {
    drawAt(12, { ...GAME, home: false });
    expect(document.querySelector('[data-court-home]')).toHaveTextContent('Summit Town22');
    expect(document.querySelector('[data-court-away]')).toHaveTextContent('Harbor City (you)24');
    expect(quarterScores()).toEqual(['Q122-24', 'Q2?', 'Q3?', 'Q4?']);
    expect(court()).toHaveAttribute('data-score', '24-22');
  });

  it('draws the same revealed recap when only future quarters and final player stats differ', () => {
    drawAt(12);
    const original = court().outerHTML;
    cleanup();
    const future: DerivedGame = {
      ...GAME, us: 145, them: 139, line: { pts: 68, reb: 19, ast: 17 },
      events: GAME.events.map(e => e.min > 12 && e.kind === 'quarter' ? { ...e, pts: e.side === 'us' ? 40 : 39 } : e),
    };
    drawAt(12, future);
    expect(court().outerHTML).toBe(original);
  });

  it.each([
    { shown: 22, hot: false }, { shown: 23, hot: true },
    { shown: 24, hot: true }, { shown: 25, hot: false },
  ])('shows a supplied hot event only in its revealed current quarter at $shown minutes', ({ shown, hot }) => {
    drawAt(shown);
    expect(!!document.querySelector('[data-court-player-hot]')).toBe(hot);
    expect(document.querySelector('[data-court-participation]')?.textContent).toBe(hot ? 'Your recorded hot quarter' : 'Your team is on court');
  });

  it.each(['rested', 'injured'] as const)('never highlights participation in a %s game, even if a hot event is supplied', why => {
    drawAt(23, { ...GAME, played: false, started: false, why, line: {} });
    expect(document.querySelector('[data-court-player-hot]')).toBeNull();
    expect(document.querySelector('[data-court-participation]')?.textContent).toBe(why === 'injured' ? 'You are out injured' : 'You are resting');
  });

  it('settles on the same quarter recap when paused or when Results is selected', () => {
    drawAt(24);
    const original = court().outerHTML;
    cleanup();
    drawAt(24, GAME, true);
    expect(court().outerHTML).toBe(original);
    cleanup();
    drawAt(24, GAME, false, true);
    expect(court().outerHTML).toBe(original);
  });

  it('keeps the basketball stage out of the actual NFL and MLB model bindings', () => {
    expect(suppliedModel(GAME, NFL_SEASON, NFL_CAREER_SPORT).sport.pitch).toBeUndefined();
    expect(suppliedModel(GAME, MLB_SEASON, MLB_CAREER_SPORT).sport.pitch).toBeUndefined();
  });

  it('leaves the other sports entry labels alone', () => {
    for (const sport of [NFL_CAREER_SPORT, MLB_CAREER_SPORT]) {
      render(<UsSeasonCentreEntry sport={{ ...sport, seasonCentreHeld: undefined }} career={CAREER} busy={false} onPlay={vi.fn()} />);
      expect(document.querySelector('[data-week-by-week]')).toHaveTextContent('Week by week');
      cleanup();
    }
  });
});

describe('the real lazy NBA Season Center host', () => {
  it('opens, replays and closes the court without changing career bytes or drawing random numbers', async () => {
    const rng = keyedRng('court-1517-host');
    const c = NBA_CAREER_SPORT.startCareer('Court Reader', 'SG', NBA_CAREER_SPORT.create.archetypes.SG[0], rng, null as never, 'now');
    const row = { ...ROW, year: c.year, team: c.team };
    c.seasons = [row as typeof c.seasons[number]];
    c.year += 1;
    const career: UsCareerCore = JSON.parse(JSON.stringify(c));
    const saved = JSON.stringify({ c: career, phase: 'season', teamQuality: 75 });
    localStorage.setItem(NBA_CAREER_SPORT.saveKey, saved);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.37);
    const onPlay = vi.fn();
    render(<MemoryRouter><UsSeasonCentreHost sport={NBA_CAREER_SPORT}>
      <UsSeasonCentreEntry sport={NBA_CAREER_SPORT} career={career} busy={false} onPlay={onPlay} />
    </UsSeasonCentreHost></MemoryRouter>);
    expect(document.querySelector('[data-nba-court]')).toBeNull();
    for (let replay = 0; replay < 2; replay += 1) {
      act(() => { fireEvent.click(document.querySelector('[data-watch-last]')!); });
      await waitFor(() => expect(document.querySelector('[data-season-help], [data-kickoff]')).not.toBeNull());
      if (document.querySelector('[data-season-help]')) {
        expect(document.querySelector('[data-season-help]')).toHaveTextContent('Scores update at the end of each quarter');
        expect(document.querySelector('[data-season-help]')).toHaveTextContent('24-22');
        pressText('Got it');
      }
      pressText('Tip off');
      await waitFor(() => expect(screen.queryByRole('img', { name: /basketball court recap/i })).not.toBeNull());
      expect(document.querySelector('[data-his-line]')).toBeNull();
      pressText('Results');
      await waitFor(() => expect(document.querySelector('[data-full-time]')).not.toBeNull());
      expect(document.querySelector('[data-his-line]')).toHaveTextContent(/\d+ PTS/);
      expect(document.querySelector('[data-his-line]')).toHaveTextContent(/\d+ REB/);
      expect(document.querySelector('[data-his-line]')).toHaveTextContent(/\d+ AST/);
      expect(court()).toHaveAttribute('data-quarter', '4');
      act(() => { fireEvent.click(document.querySelector('[data-centre-exit]')!); });
      await waitFor(() => expect(document.querySelector('[data-nba-court]')).toBeNull());
      expect(document.activeElement).toBe(document.querySelector('[data-watch-last]'));
      expect(localStorage.getItem(NBA_CAREER_SPORT.saveKey)).toBe(saved);
      expect(JSON.stringify(career)).toBe(JSON.stringify(c));
    }
    expect(onPlay).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
  });
});
