/**
 * Round 833: every position in the four American careers prints its own stat
 * line, everywhere one is printed.
 *
 * Before this round the NFL board knew three shapes of season (passer, runner,
 * receiver), so a linebacker, corner, edge rusher or kicker fell through to
 * the receiver's line and read "undefined rec, undefined yds, undefined TD" on
 * the season card, the career log, the retirement list and the hub. The MLB
 * board sent relievers down the batting branch: ".000, undefined HR,
 * undefined RBI". The retirement card credited every NFL defender and kicker
 * with "0 catches for 0 yards", a reliever with "0 home runs", and called a
 * defender's Defensive Player of the Year awards MVPs.
 *
 * Two halves:
 *   1. Seeded careers for every position of every sport, played through the
 *      real engines: every season line, every retirement bullet and the hub's
 *      career figure must carry no "undefined" or "NaN", must show a stat the
 *      position records, and must name no stat the position never records.
 *   2. The real boards, rendered from saves of those careers for every
 *      position: the retirement screen and the hub must print exactly the
 *      helper's line for every season, the helper's bullets and the share
 *      text, and nothing undefined.
 *
 * scripts/simUsCareerDefects.mjs runs this file against copies of
 * usCareerStatLine.ts with the old board code put back (controls oldstatline,
 * rpbatting, oldbullets) and requires it to go red.
 */
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({
  getNewlyEarnedBadges: () => Promise.resolve([]),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));
/* The share text is only built for the share sheet, so the stand in prints it
   where the test can read it. */
vi.mock('@/components/game/ShareButtons', () => ({
  default: ({ customText }: { customText?: string }) => <p data-testid="share-text">{customText}</p>,
}));

import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import {
  ARCHETYPES, startCareer, simSeason, progress, shouldRetire, legacyOf, careerTotals,
  type CareerPos, type SeasonLine,
} from '@/lib/nflMyCareer';
import {
  NBA_ARCHETYPES, startNbaCareer, simNbaSeason, nbaProgress, nbaShouldRetire, nbaLegacyOf,
  type NbaCareerPos, type NbaSeasonLine,
} from '@/lib/nbaMyCareer';
import {
  MLB_ARCHETYPES, startMlbCareer, simMlbSeason, mlbProgress, mlbShouldRetire, mlbLegacyOf, mlbCareerTotals,
  type MlbCareerPos, type MlbSeasonLine,
} from '@/lib/mlbMyCareer';
import {
  NHL_ARCHETYPES, startNhlCareer, simNhlSeason, nhlProgress, nhlShouldRetire, nhlLegacyOf, nhlCareerTotals,
  type NhlCareerPos, type NhlSeasonLine,
} from '@/lib/nhlMyCareer';
import {
  nflStatLine, nbaStatLine, mlbStatLine, nhlStatLine,
  nflCareerStatBullet, nflCareerSoFar, mlbCareerStatBullet, mlbCareerSoFar,
  SUSPENDED_STAT_LINE,
} from '@/lib/usCareerStatLine';

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* What a line may never say, whoever it is about. */
const BROKEN = /\bundefined\b|\bNaN\b|\bnull\b/;

/* Per position: a stat the position records (the line must show one) and the
   stats it never records (the line must show none). Read off what each
   engine's season sim writes for the position, not off what reads nicely. */
interface PosRule { own: RegExp; never: RegExp }

const NFL_RULES: Record<CareerPos, PosRule> = {
  QB: { own: /\d+ yds, \d+ TD, \d+ INT/, never: /\b(rec|rush|catch(es)?|rushing|tackles?|sacks?|FG|field goals?|passe?s? defended|forced fumbles?|DPOYs?)\b/i },
  RB: { own: /\d+ rush yds/, never: /\b(tackles?|sacks?|INT|interceptions?|FG|field goals?|passe?s? defended|forced fumbles?|passing|DPOYs?)\b/i },
  WR: { own: /\d+ rec, \d+ yds/, never: /\b(rush|rushing|tackles?|sacks?|INT|interceptions?|FG|field goals?|passe?s? defended|forced fumbles?|passing|DPOYs?)\b/i },
  TE: { own: /\d+ rec, \d+ yds/, never: /\b(rush|rushing|tackles?|sacks?|INT|interceptions?|FG|field goals?|passe?s? defended|forced fumbles?|passing|DPOYs?)\b/i },
  LB: { own: /\d+ tackles?/, never: /\b(rec|yds|yards|TD|touchdowns?|catch(es)?|FG|field goals?|rush|rushing|passing|passe?s? defended|MVPs?)\b/i },
  CB: { own: /\d+ INT/, never: /\b(rec|yds|yards|TD|touchdowns?|catch(es)?|FG|field goals?|rush|rushing|passing|sacks?|forced fumbles?|MVPs?)\b/i },
  EDGE: { own: /[\d.]+ sacks?/, never: /\b(rec|yds|yards|TD|touchdowns?|catch(es)?|FG|field goals?|rush|rushing|passing|INT|interceptions?|passe?s? defended|MVPs?)\b/i },
  K: { own: /\d+ of \d+ (FG|field goals)/, never: /\b(rec|yds|yards|TD|touchdowns?|catch(es)?|rush|rushing|passing|INT|interceptions?|tackles?|sacks?|passe?s? defended|forced fumbles?|DPOYs?)\b/i },
};

const NBA_RULE: PosRule = { own: /[\d.]+ ppg/, never: /\b(threes?|blocks?|steals?)\b/i };

const ARM_NEVER = /\b(HR|RBI|home runs?|steals?|MVPs?)\b|(^|\s)\.\d{3}\b/i;
const BAT: PosRule = { own: /(^|\s)\.\d{3}, \d+ HR/, never: /\b(ERA|saves?|holds?|strikeouts?|K|wins|Cy Youngs?)\b/ };
const MLB_RULES: Record<MlbCareerPos, PosRule> = {
  SP: { own: /\d+-\d+, [\d.]+ ERA/, never: new RegExp(`${ARM_NEVER.source}|\\b(saves?|holds?)\\b`, 'i') },
  RP: { own: /\d+ saves?.*[\d.]+ ERA/, never: ARM_NEVER },
  C: BAT, '1B': BAT, '2B': BAT, '3B': BAT, SS: BAT, LF: BAT, CF: BAT, RF: BAT, DH: BAT,
};

const SKATER: PosRule = { own: /\d+ G, \d+ A, \d+ P/, never: /SV%|\b\d+ W\b|\bwins\b|\bVezinas?\b/ };
const NHL_RULES: Record<NhlCareerPos, PosRule> = {
  C: { ...SKATER, never: new RegExp(`${SKATER.never.source}|\\bNorris\\b`) },
  LW: { ...SKATER, never: new RegExp(`${SKATER.never.source}|\\bNorris\\b`) },
  RW: { ...SKATER, never: new RegExp(`${SKATER.never.source}|\\bNorris\\b`) },
  D: { ...SKATER, never: new RegExp(`${SKATER.never.source}|\\bHarts?\\b|Norriss`) },
  G: { own: /\d+ W, \.\d{3} SV%/, never: /\b\d+ [GAP]\b|\bgoals?\b|\bassists?\b|\bpoints\b|\bHarts?\b|\bNorris\b/ },
};

/* A career for the board and the sweep: the engine's own season and
   offseason, nothing else, seeded. */
interface Played<S> { career: S & { seasons: unknown[]; retired: boolean; name: string; pos: string }; lines: unknown[] }

interface SportCase {
  sport: 'nfl' | 'nba' | 'mlb' | 'nhl';
  label: string;
  saveKey: string;
  Board: ComponentType;
  positions: string[];
  rule: (pos: string) => PosRule;
  play: (pos: string, seed: number, maxSeasons: number) => Played<Record<string, unknown>>;
  line: (s: unknown, pos: string) => string;
  bullets: (c: unknown) => string[];
  statBullet: (c: unknown) => string;
  soFar: (c: unknown) => string | null;
}

function playOut<C extends { seasons: unknown[]; retired: boolean }>(
  c: C, rng: () => number, maxSeasons: number,
  season: (c: C, r: () => number) => void, done: (c: C) => boolean,
): C {
  for (let i = 0; i < maxSeasons; i++) {
    season(c, rng);
    if (done(c)) break;
  }
  return c;
}

const SPORTS: SportCase[] = [
  {
    sport: 'nfl', label: 'NFL', saveKey: 'nfl-my-career-save-v1', Board: NflMyCareerBoard,
    positions: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'],
    rule: pos => NFL_RULES[pos as CareerPos],
    play: (pos, seed, max) => {
      const r = mulberry32(seed);
      const arch = ARCHETYPES[pos as CareerPos][seed % ARCHETYPES[pos as CareerPos].length];
      const c = playOut(startCareer(`Line ${pos}`, pos as CareerPos, arch, r), r, max,
        (cc, rr) => { simSeason(cc, 80, rr); progress(cc, rr); }, shouldRetire);
      return { career: c as never, lines: c.seasons };
    },
    line: (s, pos) => nflStatLine(s as SeasonLine, pos as CareerPos),
    bullets: c => legacyOf(c as never).bullets,
    statBullet: c => nflCareerStatBullet(careerTotals(c as never), (c as { pos: CareerPos }).pos),
    soFar: c => nflCareerSoFar(careerTotals(c as never), (c as { pos: CareerPos }).pos),
  },
  {
    sport: 'nba', label: 'NBA', saveKey: 'nba-my-career-save-v1', Board: NbaMyCareerBoard,
    positions: ['PG', 'SG', 'SF', 'PF', 'C'],
    rule: () => NBA_RULE,
    play: (pos, seed, max) => {
      const r = mulberry32(seed);
      const arch = NBA_ARCHETYPES[pos as NbaCareerPos][seed % NBA_ARCHETYPES[pos as NbaCareerPos].length];
      const c = playOut(startNbaCareer(`Line ${pos}`, pos as NbaCareerPos, arch, r), r, max,
        (cc, rr) => { simNbaSeason(cc, 80, rr); nbaProgress(cc, rr); }, nbaShouldRetire);
      return { career: c as never, lines: c.seasons };
    },
    line: s => nbaStatLine(s as NbaSeasonLine),
    bullets: c => nbaLegacyOf(c as never).bullets,
    statBullet: c => nbaLegacyOf(c as never).bullets[1],
    soFar: () => null,
  },
  {
    sport: 'mlb', label: 'MLB', saveKey: 'mlb-my-career-save-v1', Board: MlbMyCareerBoard,
    positions: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'],
    rule: pos => MLB_RULES[pos as MlbCareerPos],
    play: (pos, seed, max) => {
      const r = mulberry32(seed);
      const arch = MLB_ARCHETYPES[pos as MlbCareerPos][seed % MLB_ARCHETYPES[pos as MlbCareerPos].length];
      const c = playOut(startMlbCareer(`Line ${pos}`, pos as MlbCareerPos, arch, r), r, max,
        (cc, rr) => { simMlbSeason(cc, 80, rr); mlbProgress(cc, rr); }, mlbShouldRetire);
      return { career: c as never, lines: c.seasons };
    },
    line: (s, pos) => mlbStatLine(s as MlbSeasonLine, pos as MlbCareerPos),
    bullets: c => mlbLegacyOf(c as never).bullets,
    statBullet: c => mlbCareerStatBullet(mlbCareerTotals(c as never), (c as { pos: MlbCareerPos }).pos),
    soFar: c => mlbCareerSoFar(mlbCareerTotals(c as never), (c as { pos: MlbCareerPos }).pos),
  },
  {
    sport: 'nhl', label: 'NHL', saveKey: 'nhl-my-career-save-v1', Board: NhlMyCareerBoard,
    positions: ['C', 'LW', 'RW', 'D', 'G'],
    rule: pos => NHL_RULES[pos as NhlCareerPos],
    play: (pos, seed, max) => {
      const r = mulberry32(seed);
      const arch = NHL_ARCHETYPES[pos as NhlCareerPos][seed % NHL_ARCHETYPES[pos as NhlCareerPos].length];
      const c = playOut(startNhlCareer(`Line ${pos}`, pos as NhlCareerPos, arch, r), r, max,
        (cc, rr) => { simNhlSeason(cc, 80, rr); nhlProgress(cc, rr); }, nhlShouldRetire);
      return { career: c as never, lines: c.seasons };
    },
    line: (s, pos) => nhlStatLine(s as NhlSeasonLine, pos as NhlCareerPos),
    bullets: c => nhlLegacyOf(c as never).bullets,
    statBullet: c => nhlLegacyOf(c as never).bullets[1],
    soFar: c => {
      const t = nhlCareerTotals(c as never);
      return (c as { pos: string }).pos === 'G' ? `${t.wins} career wins` : `${t.points.toLocaleString()} career points`;
    },
  },
];

const ALL = SPORTS.flatMap(s => s.positions.map(pos => ({ ...s, pos })));
const SEEDS_PER_POSITION = 6;

function checkText(text: string, rule: PosRule, where: string, needOwn: boolean): string[] {
  const bad: string[] = [];
  if (BROKEN.test(text)) bad.push(`${where}: "${text}" prints a value that is not there`);
  const never = rule.never.exec(text);
  if (never) bad.push(`${where}: "${text}" names "${never[0]}", a stat this position never records`);
  if (needOwn && !rule.own.test(text)) bad.push(`${where}: "${text}" shows none of this position's own stats`);
  return bad;
}

describe('every US career position prints its own stat line', () => {
  it.each(ALL)('$label $pos: seasons, retirement bullets and career figure from seeded careers', ({ pos, play, line, rule, bullets, statBullet, soFar }) => {
    const bad: string[] = [];
    let seasonsChecked = 0;
    for (let k = 0; k < SEEDS_PER_POSITION; k++) {
      const { career, lines } = play(pos, 833_000 + k * 97 + pos.length, 20);
      for (const s of lines) {
        seasonsChecked += 1;
        bad.push(...checkText(line(s, pos), rule(pos), `season ${(s as { year: number }).year}`, true));
      }
      const b = bullets(career);
      /* The engine's retirement card carries exactly the helper's stat bullet. */
      expect(b).toContain(statBullet(career));
      for (const text of b) bad.push(...checkText(text, rule(pos), 'retirement bullet', false));
      const figure = soFar(career);
      if (figure !== null) bad.push(...checkText(figure, rule(pos), 'career so far', false));
    }
    expect(seasonsChecked).toBeGreaterThan(SEEDS_PER_POSITION * 3);
    expect(bad).toEqual([]);
  });

  it.each(ALL)('$label $pos: a suspended season says so, and a line with nothing recorded invents nothing', ({ pos, line }) => {
    const banned = { year: 2030, team: 'X', age: 27, ovr: 80, games: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 };
    expect(line(banned, pos)).toBe(SUSPENDED_STAT_LINE);
    const empty = { year: 2030, team: 'X', age: 27, ovr: 80, games: 0, awards: [], teamResult: 'Missed the playoffs', salary: 1 };
    const text = line(empty, pos);
    expect(text).not.toMatch(BROKEN);
    expect(text).not.toMatch(/\d/);
  });
});

/* ─── the real boards ─────────────────────────────────────────────────────── */

/* A rivalry beat or a rival choice the seeded seasons left waiting is drawn
   ahead of every screen, so the saves under test are taken past it. */
function clearPending(c: Record<string, unknown>): void {
  delete c.pendingRivalryEvent;
  delete c.pendingRivalryChoice;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the boards print the position\'s own line everywhere', () => {
  it.each(ALL)('$label $pos retirement screen: every season row, the bullets and the share text', async ({ pos, play, line, rule, bullets, saveKey, Board }) => {
    const { career } = play(pos, 8330 + pos.length * 11, 4);
    career.retired = true;
    clearPending(career);
    localStorage.setItem(saveKey, JSON.stringify({ c: career, phase: 'retired', teamQuality: 80, coach: null }));
    render(<MemoryRouter><Board /></MemoryRouter>);
    expect(await screen.findByText(`${career.name} retires`)).toBeInTheDocument();
    const page = document.body.textContent ?? '';
    expect(page).not.toMatch(/undefined|NaN/);
    for (const s of career.seasons) expect(page).toContain(line(s, pos));
    for (const b of bullets(career)) expect(page).toContain(b);
    const share = screen.getByTestId('share-text').textContent ?? '';
    expect(checkText(share, rule(pos), 'share text', false)).toEqual([]);
  });

  it.each(ALL)('$label $pos hub: the last season and the career figure', async ({ pos, play, line, rule, soFar, saveKey, Board }) => {
    const { career } = play(pos, 8331 + pos.length * 13, 3);
    career.retired = false;
    clearPending(career);
    (career as { contractYears?: number }).contractYears = 3;
    localStorage.setItem(saveKey, JSON.stringify({ c: career, phase: 'season', teamQuality: 80, coach: null }));
    render(<MemoryRouter><Board /></MemoryRouter>);
    expect(await screen.findByText(/Career so far/)).toBeInTheDocument();
    const page = document.body.textContent ?? '';
    expect(page).not.toMatch(/undefined|NaN/);
    const last = career.seasons[career.seasons.length - 1];
    expect(page).toContain(line(last, pos));
    const sofar = screen.getByText(/Career so far/).textContent ?? '';
    const figure = soFar(career);
    if (figure !== null) expect(sofar).toContain(figure);
    expect(checkText(sofar, rule(pos), 'career so far', false)).toEqual([]);
  });
});
