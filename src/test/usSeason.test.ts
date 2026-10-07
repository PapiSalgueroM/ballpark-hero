/* Round 1048: the US Season Center's pure parts. The two ledgers first
   (src/data/usSeasonLengths.ts, src/data/usLeagueShape.ts), then the binding
   (src/lib/season/us.ts) and the two number files as each lands. */
import { describe, expect, it } from 'vitest';
import {
  US_FULL_SEASON, US_LENGTHS_VERIFIED_TO, US_SEASON_LENGTHS, usSeasonHeldLine, usSeasonLabel, usSeasonLength,
  type UsLengthSport,
} from '@/data/usSeasonLengths';
import { NBA_SCORING, US_LEAGUE_SHAPES, nflHosts17, usLeagueShape } from '@/data/usLeagueShape';

const SPORTS: UsLengthSport[] = ['nba', 'nfl'];

describe('the season length ledger', () => {
  it('has windows in order that never overlap or leave a gap, the last one open', () => {
    for (const sport of SPORTS) {
      const ws = US_SEASON_LENGTHS[sport];
      expect(ws.length).toBeGreaterThan(1);
      ws.forEach((w, i) => {
        if (i < ws.length - 1) {
          expect(w.to, `${sport} window ${i} is closed`).not.toBeNull();
          expect(w.to!).toBeGreaterThanOrEqual(w.from);
          expect(ws[i + 1].from).toBe(w.to! + 1);
        } else expect(w.to).toBeNull();
        if (w.games === null) expect(typeof w.why).toBe('string');
      });
      expect(ws[ws.length - 1].games).toBe(US_FULL_SEASON[sport]);
      expect(ws[ws.length - 1].from).toBeLessThanOrEqual(US_LENGTHS_VERIFIED_TO[sport]);
    }
  });
  it('holds a year exactly when its real length is not the one the career plays', () => {
    for (const sport of SPORTS) {
      let held = 0; let open = 0;
      for (let year = 1990; year <= 2060; year += 1) {
        const line = usSeasonHeldLine(sport, year);
        const full = usSeasonLength(sport, year) === US_FULL_SEASON[sport];
        expect(line === null, `${sport} ${year}`).toBe(full);
        if (line === null) open += 1; else { held += 1; expect(line.startsWith('📺 ')).toBe(true); expect(line).toContain(usSeasonLabel(sport, year)); }
      }
      expect(held).toBeGreaterThan(0);
      expect(open).toBeGreaterThan(0);
    }
  });
  it('says each kind of held year in its own words', () => {
    expect(usSeasonHeldLine('nfl', 2005)).toBe('📺 Week by week starts with the 2021 season: the real 2005 season had 16 games and this career plays 17.');
    expect(usSeasonHeldLine('nfl', 2020)).toContain('starts with the 2021 season');
    expect(usSeasonHeldLine('nfl', 2021)).toBeNull();
    expect(usSeasonHeldLine('nba', 2011)).toBe('📺 No week by week this season: the real 2011-12 season had 66 games and this career plays 82.');
    expect(usSeasonHeldLine('nba', 2019)).toBe('📺 No week by week this season: the real 2019-20 season was cut short and teams finished on different numbers of games.');
    expect(usSeasonHeldLine('nba', 2012)).toContain('2012-13');
    expect(usSeasonHeldLine('nba', 2020)).toContain('72 games');
    expect(usSeasonHeldLine('nba', 2003)).toBeNull();
    expect(usSeasonHeldLine('nba', 2026)).toBeNull();
    expect(usSeasonHeldLine('nba', 1999)).toContain('no verified length');
    expect(usSeasonLabel('nba', 1999)).toBe('1999-00');
    expect(usSeasonLabel('nba', 2009)).toBe('2009-10');
  });
});

describe('the league shape ledger', () => {
  it('has whole divisions, no team twice, and two conferences of equal size', () => {
    const want = { nba: { divisions: 6, per: 5 }, nfl: { divisions: 8, per: 4 } } as const;
    for (const w of US_LEAGUE_SHAPES) {
      const n = want[w.sport];
      expect(w.shape.divisions).toHaveLength(n.divisions);
      for (const d of w.shape.divisions) expect(d.teams, `${w.sport} ${d.name}`).toHaveLength(n.per);
      const ids = w.shape.divisions.flatMap(d => d.teams);
      expect(new Set(ids).size).toBe(ids.length);
      const confs = [...new Set(w.shape.divisions.map(d => d.conf))];
      expect(confs).toHaveLength(2);
      for (const c of confs) expect(w.shape.divisions.filter(d => d.conf === c)).toHaveLength(n.divisions / 2);
      expect(new Set(w.shape.divisions.map(d => d.name)).size).toBe(n.divisions);
    }
  });
  it('never has two windows for one sport, era and year', () => {
    for (const a of US_LEAGUE_SHAPES) for (const b of US_LEAGUE_SHAPES) {
      if (a === b || a.sport !== b.sport || a.era !== b.era) continue;
      const aTo = a.to ?? Infinity; const bTo = b.to ?? Infinity;
      expect(a.from > bTo || b.from > aTo).toBe(true);
    }
  });
  it('answers only for the era and the years it holds', () => {
    expect(usLeagueShape('nba', 'now', 2026)?.formula.kind).toBe('nba82');
    expect(usLeagueShape('nba', undefined, 2031)?.formula.kind).toBe('nba82');
    expect(usLeagueShape('nfl', 'now', 2026)?.formula.kind).toBe('nfl17');
    expect(usLeagueShape('nba', 'y2004', 2003)).toBeNull();
    expect(usLeagueShape('nba', 'y2004', 2026)).toBeNull();
    expect(usLeagueShape('nfl', 'y2005', 2021)).toBeNull();
    expect(usLeagueShape('nba', 'now', 2024)).toBeNull();
    expect(usLeagueShape('mlb', 'now', 2026)).toBeNull();
  });
  it('knows who hosts the 17th game only where two sources say so', () => {
    for (let y = 2021; y <= 2028; y += 1) {
      expect(nflHosts17(y, 'AFC')).toBe(y % 2 === 1);
      expect(nflHosts17(y, 'NFC')).toBe(y % 2 === 0);
    }
    expect(nflHosts17(2020, 'AFC')).toBeNull();
    expect(nflHosts17(2029, 'NFC')).toBeNull();
    expect(nflHosts17(2026, 'East')).toBeNull();
  });
  it('holds a scoring mean for both NBA eras', () => {
    expect(NBA_SCORING.now).toBeGreaterThan(NBA_SCORING.y2004);
    expect(NBA_SCORING.y2004).toBeGreaterThan(80);
    expect(NBA_SCORING.now).toBeLessThan(130);
  });
});
