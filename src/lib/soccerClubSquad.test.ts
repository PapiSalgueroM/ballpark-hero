/**
 * Round 1115: the club squad readers.
 *
 * The first block was recorded on untouched code, before anything in
 * soccerClubSquad.ts moved: every real depth chart and every baked squad,
 * reduced to a digest. From the lift on it must stay green without being
 * edited, which is the proof that the real squad readers (the offer fit line
 * and the club verdict line on the page) answer exactly what they answered
 * before this round.
 */
import { describe, expect, it } from 'vitest';
import { CLUB_DATA_NAME, CLUB_SQUADS } from '@/data/clubSquads';
import { clubSquad, depthChart } from '@/lib/soccerClubSquad';

/* 32 bit FNV-1a, written here so the digest depends on nothing else. */
function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const POSITIONS = ['GK', 'CB', 'LB', 'CM', 'CAM', 'LW', 'ST'];
const RATINGS = [55, 68, 74, 82, 90, 96];

describe('the real squad readers, recorded before Round 1115 touched them', () => {
  it('every real depth chart is what it was', () => {
    const out: unknown[] = [];
    let charts = 0;
    let nulls = 0;
    for (const club of Object.keys(CLUB_DATA_NAME)) {
      for (let year = 2014; year <= 2028; year += 1) {
        for (const pos of POSITIONS) {
          for (const ovr of RATINGS) {
            const c = depthChart(club, year, pos, ovr, 'Test Player');
            if (!c) { nulls += 1; out.push(null); continue; }
            charts += 1;
            out.push([
              c.group, c.ahead, c.men.length, c.squad.length, c.aheadOfMe?.name ?? null,
              c.men.map(m => (m.me ? '*' : `${m.name}:${m.ovr}`)).join(','),
            ]);
          }
        }
      }
    }
    expect(charts).toBe(18900);
    expect(nulls).toBe(15120);
    expect(fnv(JSON.stringify(out))).toBe('774db77f');
  });

  it('every baked squad is what it was', () => {
    const dataToClub = new Map(Object.entries(CLUB_DATA_NAME).map(([club, data]) => [data, club]));
    const out: unknown[] = [];
    let squads = 0;
    let men = 0;
    for (const key of Object.keys(CLUB_SQUADS).sort()) {
      const [dataName, year] = key.split('|');
      const club = dataToClub.get(dataName);
      const squad = club ? clubSquad(club, Number(year)) : null;
      if (!squad) { out.push([key, null]); continue; }
      squads += 1;
      men += squad.length;
      out.push([key, squad.map(m => `${m.name}:${m.pos}:${m.ovr}:${m.group}`).join(',')]);
    }
    expect(squads).toBe(450);
    expect(men).toBe(8154);
    expect(fnv(JSON.stringify(out))).toBe('d6efad18');
  });
});
