/* Release AX, the critic's advice 14 on the Belgian replay names.
 *
 * belgian2025OpponentLabels keys on the season's YEAR and the CLUB'S NAME and never reads the league. Its
 * sentence on the screen says the 2025/26 membership is verified, so a 2025 row at one of the sixteen names has
 * to be a season in that top division, or the names and the league beside them could disagree. This file asks
 * that of the game's own committed data and of the function's own branches:
 *   1. every club the career can hold whose name is one of the sixteen (or one of their source spellings) is in
 *      the Belgian league in the game's data, and no other club shares a name with them;
 *   2. the league world moves no Belgian club between divisions (it runs five pyramids, none of them Belgian);
 *   3. the league the Season Centre prints for such a row in 2025 is that league or none at all;
 *   4. a career in another league in 2025 that meets a club of one of the names gets no label;
 *   5. a named opponent that is not a member (a foreign club) cancels the whole overlay;
 *   6. another year, a season that is not a playing one and a table season get nothing;
 *   7. an old save: the saved row and the derived season are not written to;
 *   8. only league games are ever labelled: the overlay reads the league replay's own slots and nothing else.
 */
import { describe, it, expect } from 'vitest';
import { BELGIAN_2025_MEMBERS } from '@/data/belgianSeasonMembership';
import { belgian2025OpponentLabels } from '@/lib/season/belgianOpponentLabels';
import { FALLBACK_CLUBS } from '@/lib/soccerCareerEngine';
import { PYRAMIDS } from '@/lib/soccerCareerLeagueWorld';
import { leagueKeyInYear } from '@/lib/soccerCareerLeague';
import type { DerivedSeason } from '@/lib/season/core';

const LEAGUE = 'Belgian Pro League';
const SPELLINGS = new Set(BELGIAN_2025_MEMBERS.flatMap(m => [m.name, ...m.aliases]));

/** A results season as the label function reads it: slot 0 is his own club, the rest are league opponents. */
function season(labels: [string, boolean][], opps: number[], mode: DerivedSeason['mode'] = 'results'): DerivedSeason {
  return {
    mode,
    labels: labels.map(([name, named], i) => ({ name, named, key: `k${i}` })),
    games: opps.map(opp => ({ opp })),
  } as unknown as DerivedSeason;
}
const row = (club: string, year = 2025, type = 'playing') => ({ club, year, type }) as Parameters<typeof belgian2025OpponentLabels>[0];

describe('the 2025/26 Belgian names, bound to the league by the data (Release AX)', () => {
  it('the list is sixteen clubs, each once', () => {
    expect(BELGIAN_2025_MEMBERS.length).toBe(16);
    expect(new Set(BELGIAN_2025_MEMBERS.map(m => m.name)).size).toBe(16);
    expect(SPELLINGS.size).toBe(BELGIAN_2025_MEMBERS.reduce((n, m) => n + 1 + m.aliases.length, 0));
  });

  it('every club of the career that carries one of the names is in the Belgian league, and only there', () => {
    const carrying = FALLBACK_CLUBS.filter(c => SPELLINGS.has(c.name));
    const elsewhere = carrying.filter(c => c.league !== LEAGUE || c.country !== 'Belgium').map(c => `${c.name} (${c.league})`);
    expect(elsewhere).toEqual([]);
    /* Fifteen of the sixteen are clubs a career can sign for; Dender is a label only. */
    expect(new Set(carrying.map(c => c.name)).size).toBe(15);
    expect(carrying.some(c => c.name === 'Dender')).toBe(false);
  });

  it('the league world moves no Belgian club up or down', () => {
    expect(PYRAMIDS.some(p => p.upper === LEAGUE || p.lower === LEAGUE)).toBe(false);
  });

  it('the league printed beside such a row in 2025 is that league or none', () => {
    const printed = BELGIAN_2025_MEMBERS.map(m => leagueKeyInYear({ name: m.name, league: LEAGUE }, 2025));
    expect(printed.filter(k => k !== null && k !== LEAGUE)).toEqual([]);
  });

  it('a career in another league that meets a club of one of the names gets no label', () => {
    const s = season([['Ajax', true], ['Antwerp', true], ['', false], ['', false]], [1, 2, 3]);
    expect(belgian2025OpponentLabels(row('Ajax'), s)).toBeNull();
  });

  it('a named opponent that is not a member cancels the whole overlay', () => {
    const s = season([['Anderlecht', true], ['Club Brugge', true], ['Ajax', true], ['', false]], [1, 2, 3]);
    expect(belgian2025OpponentLabels(row('Anderlecht'), s)).toBeNull();
  });

  it('another year, a season that is not a playing one and a table season get nothing', () => {
    const s = season([['Anderlecht', true], ['Club Brugge', true], ['', false]], [1, 2]);
    expect(belgian2025OpponentLabels(row('Anderlecht'), s)).not.toBeNull();
    expect(belgian2025OpponentLabels(row('Anderlecht', 2024), s)).toBeNull();
    expect(belgian2025OpponentLabels(row('Anderlecht', 2026), s)).toBeNull();
    expect(belgian2025OpponentLabels(row('Anderlecht', 2025, 'youth'), s)).toBeNull();
    expect(belgian2025OpponentLabels(row('Anderlecht'), season([['Anderlecht', true], ['Club Brugge', true], ['', false]], [1, 2], 'table'))).toBeNull();
  });

  it('an old save: the row and the derived season are read and never written', () => {
    const r = row('Westerlo');
    const s = season([['Westerlo', true], ['Genk', true], ['', false], ['', false]], [1, 2, 3, 1, 2, 3]);
    const before = JSON.stringify([r, s]);
    const out = belgian2025OpponentLabels(r, s)!;
    expect(JSON.stringify([r, s])).toBe(before);
    expect(out.names[0]).toBe('Westerlo');
    expect(out.names[1]).toBe('Genk');
    /* The unnamed slots take the remaining members in the list's order, each once, never his own club. */
    expect(out.names[2]).toBe('Anderlecht');
    expect(out.names[3]).toBe('Antwerp');
    expect(new Set(out.names).size).toBe(out.names.length);
  });

  it('a full league replay names fifteen opponents and leaves the rest unrecorded, in league slots only', () => {
    const labels: [string, boolean][] = [['Gent', true], ...Array.from({ length: 19 }, () => ['', false] as [string, boolean])];
    const opps = Array.from({ length: 38 }, (_, i) => 1 + (i % 19));
    const out = belgian2025OpponentLabels(row('Gent'), season(labels, opps))!;
    const named = out.names.slice(1).filter(n => n !== 'Opponent not recorded');
    expect(named.length).toBe(15);
    expect(named.every(n => BELGIAN_2025_MEMBERS.some(m => m.name === n) && n !== 'Gent')).toBe(true);
    expect(out.names.filter(n => n === 'Opponent not recorded').length).toBe(4);
    /* Nothing but a slot of the league replay is named: the output is exactly as long as the label list. */
    expect(out.names.length).toBe(labels.length);
    expect(out.note).toContain('membership is verified');
    expect(out.note).toContain('simulated');
  });
});
