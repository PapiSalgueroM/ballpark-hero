import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MatchClock } from '@/components/season-centre/MatchClock';
import { buildUsModel } from '@/components/us-career/season/UsSeasonCentre';
import { UsSeasonCentreEntry } from '@/components/us-career/season/UsSeasonCentreEntry';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NBA_SEASON } from '@/lib/season/nba';
import type { DerivedGame, DerivedSeason } from '@/lib/season/core';
import type { UsRow, UsSeasonCtx } from '@/lib/season/us';
import type { UsCareerCore } from '@/lib/usCareerSport';

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
function suppliedModel(game: DerivedGame = GAME) {
  const season: DerivedSeason = {
    key: 'fictional-court-recap', mode: 'results', rule: null, teams: 2,
    labels: [
      { name: 'Harbor City', named: true, key: 'harbor' },
      { name: 'Summit Town', named: true, key: 'summit' },
    ],
    games: [game], rounds: [], bucket: null, clinch: null,
    target: { kind: 'none' }, attempt: 0, repairs: 0,
  };
  return buildUsModel(NBA_CAREER_SPORT, NBA_SEASON, CAREER, ROW, CTX, season, season.key);
}

beforeEach(() => { localStorage.clear(); });
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
