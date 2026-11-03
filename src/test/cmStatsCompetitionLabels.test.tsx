import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StatsScreen } from '@/components/club-manager/StatsScreen';
import {
  careerLeagueOf, engineRegistrations, restoreEngineRegistrations, startCareer,
} from '@/lib/clubManager';

let registrations: ReturnType<typeof engineRegistrations>;
beforeEach(() => { registrations = engineRegistrations(); localStorage.clear(); });
afterEach(() => {
  cleanup();
  restoreEngineRegistrations(registrations);
  vi.restoreAllMocks();
  localStorage.clear();
});

function statsFixture() {
  const random = Math.random, now = Date.now;
  let seed = 164;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  Date.now = () => Date.UTC(2026, 10, 3, 12);
  try {
    // Existing engine builder creates a fictional club and squad. All match and stat lines below are synthetic test data.
    const career = startCareer('Stats Label Lab', 'now', {
      name: 'Stats Label Lab', leagueId: 'premier', stadium: 'Lab Ground',
      budgetTier: 'small', quality: 72, replacedClub: '',
      crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'SL' },
    });
    const cupName = careerLeagueOf(career).cupName;
    if (!cupName) throw new Error('The fictional fixture needs a domestic cup');
    career.uclKoRound = 'F';
    career.resultLog = [
      { week: 0, comp: 'League fixture', competition: 'league', opp: 'Synthetic League Rival', home: true, score: '2-1', res: 'W' },
      { week: 1, comp: cupName, competition: 'cup', opp: 'Synthetic Cup Rival', home: true, score: '3-0', res: 'W' },
      { week: 2, comp: 'Champions League fixture', competition: 'uclGroup', opp: 'Synthetic European Rival', home: true, score: '1-1', res: 'D' },
      { week: 3, comp: 'Super cup fixture', competition: 'oneOff', opp: 'Synthetic Super Cup Rival', home: true, score: '0-2', res: 'L' },
      { week: 4, comp: 'Europa League fixture', competition: 'uel', opp: 'Synthetic Europa Rival', home: true, score: '4-3', res: 'W' },
    ];
    career.squad = career.squad.map((player, index) => ({
      ...player, apps: index === 0 ? 5 : 0, seasonGoals: index === 0 ? 7 : 0,
      seasonAssists: 0, seasonYellows: 0, seasonReds: 0, cleanSheets: 0, ratingSum: index === 0 ? 35 : 0,
      comp: index === 0 ? {
        league: { apps: 1, goals: 1, assists: 0, yellows: 0, reds: 0, ratingSum: 7 },
        cup: { apps: 1, goals: 2, assists: 0, yellows: 0, reds: 0, ratingSum: 7 },
        ucl: { apps: 1, goals: 1, assists: 0, yellows: 0, reds: 0, ratingSum: 7 },
        other: { apps: 1, goals: 0, assists: 0, yellows: 0, reds: 0, ratingSum: 7 },
        uel: { apps: 1, goals: 3, assists: 0, yellows: 0, reds: 0, ratingSum: 7 },
      } : undefined,
    }));
    return { career, cupName };
  } finally {
    Math.random = random;
    Date.now = now;
  }
}

const cases = [
  ['All comps', 'all', 'all competitions', ['5', '3W 1D 1L', '10', '7', '+3'], 7],
  ['League', 'league', 'league', ['1', '1W 0D 0L', '2', '1', '+1'], 1],
  ['Domestic cup', 'cup', null, ['1', '1W 0D 0L', '3', '0', '+3'], 2],
  ['Europe', 'ucl', 'Champions League', ['1', '0W 1D 0L', '1', '1', '0'], 1],
  ['Super cups', 'other', 'super cups', ['1', '0W 0D 1L', '0', '2', '-2'], 0],
  ['Europa League', 'uel', 'Europa League', ['1', '1W 0D 0L', '4', '3', '+1'], 3],
] as const;

describe('Club Manager competition record labels', () => {
  it.each(cases)('names the selected %s record and keeps its own team and player figures', (label, key, title, expectedTeamValues, goals) => {
    const { career, cupName } = statsFixture();
    expect(career.clubName, 'CM_STATS_COMPETITION_SETUP_FICTIONAL_CLUB').toBe('Stats Label Lab');
    expect(career.squad.length, 'CM_STATS_COMPETITION_SETUP_REAL_CUSTOM_SQUAD').toBeGreaterThan(0);
    const player = career.squad[0];
    const before = JSON.stringify(career);
    const view = render(<MemoryRouter><StatsScreen career={career} /></MemoryRouter>);
    const selectorLabels = ['All comps', 'League', cupName, 'Europe', 'Super cups', 'Europa League'];
    // Match the actual button text without asking JSDOM to evaluate CSS visibility.
    const selectors = Array.from(view.container.querySelectorAll<HTMLButtonElement>('button'))
      .filter(button => selectorLabels.includes(button.textContent ?? ''));
    const observedSelectors = selectors.map(button => button.textContent);
    const selected = selectors.find(button => button.textContent === (key === 'cup' ? cupName : label));
    if (!selected) throw new Error('The requested competition selector is missing');
    fireEvent.click(selected);

    const leaf = (text: string) => Array.from(view.container.querySelectorAll<HTMLElement>('div'))
      .find(element => element.children.length === 0 && element.textContent === text);
    const playedLabel = leaf('Played');
    if (!playedLabel?.parentElement?.parentElement) throw new Error('The actual team record is missing');
    const record = playedLabel.parentElement.parentElement;
    const teamValues = Array.from(record.children).map(cell => cell.firstElementChild?.textContent);
    const heading = record.previousElementSibling?.textContent?.trim();
    const tableLabel = leaf('Every player · tap a column to sort');
    const row = Array.from(tableLabel?.parentElement?.children ?? [])
      .find(element => element.firstElementChild?.textContent === player.name + ' ' + player.position);
    if (!row) throw new Error('The generated fixture player row is missing');
    const playerValues = Array.from(row.children).map(cell => cell.textContent);
    const expectedPlayerValues = [
      player.name + ' ' + player.position, key === 'all' ? '5' : '1', String(goals),
      '0', '0', key === 'all' ? '0' : '·', '7.00',
    ];
    const receipt = {
      key, fixture: 'Synthetic display-only results and stat lines over an existing engine fictional custom-club squad',
      selectorLabels: observedSelectors, heading, teamValues, expectedTeamValues,
      playerValues, expectedPlayerValues, inputUnchanged: JSON.stringify(career) === before,
    };
    const rawDir = process.env.CM_STATS_LABELS_RAW;
    if (rawDir) {
      fs.mkdirSync(rawDir, { recursive: true });
      fs.writeFileSync(path.join(rawDir, key + '.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
    }
    console.info('CM_STATS_COMPETITION_RECORD ' + JSON.stringify(receipt));
    expect(observedSelectors, 'CM_STATS_COMPETITION_ALL_SIX_SELECTORS').toEqual(selectorLabels);
    expect(teamValues, 'CM_STATS_COMPETITION_TEAM_VALUES_' + key.toUpperCase()).toEqual(expectedTeamValues);
    expect(playerValues, 'CM_STATS_COMPETITION_PLAYER_VALUES_' + key.toUpperCase()).toEqual(expectedPlayerValues);
    expect(JSON.stringify(career), 'CM_STATS_COMPETITION_INPUT_UNCHANGED').toBe(before);
    expect(heading, 'CM_STATS_COMPETITION_HEADING_' + key.toUpperCase())
      .toBe('📊 Stats Label Lab · ' + (title ?? cupName));
  });
});
