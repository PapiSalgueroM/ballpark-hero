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
import { allIntlNames } from '@/lib/intlNames';
import {
  genClubSquad, squadCentre, SQUAD_SLOTS, LAST_STARTER_SLOTS, FOREIGN_NATIONS, familyIdFor, CARRY_SEASONS,
} from '@/lib/soccerClubSquadGen';

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

/* ── Round 1115 step 2: the generator ───────────────────────────────────── */

const Q = { saveKey: 'Test Player|ST|2025|Tottenham Youth', club: 'Leeds', country: 'England', tier: 2, year: 2031 };
const count = (men: { group: string }[], g: string) => men.filter(m => m.group === g).length;

describe('the invented squad', () => {
  it('is the same squad every time it is asked for, 22 men in lines of 3, 7, 7 and 5', () => {
    const a = genClubSquad(Q);
    const b = genClubSquad({ ...Q });
    expect(b).toEqual(a);
    expect(a.length).toBe(22);
    expect([count(a, 'GK'), count(a, 'DEF'), count(a, 'MID'), count(a, 'ATT')]).toEqual([3, 7, 7, 5]);
    expect(new Set(a.map(m => m.name)).size).toBe(22);
    const pool = new Set(allIntlNames());
    for (const m of a) expect(pool.has(m.name)).toBe(true);
    for (let i = 1; i < a.length; i += 1) expect(a[i - 1].ovr).toBeGreaterThanOrEqual(a[i].ovr);
  });

  it('never repeats a name inside a squad, over many clubs and years', () => {
    let squads = 0;
    for (const club of ['Leeds', 'Ajax', 'Santos', 'Kashima', 'Al Ahly']) {
      for (let year = 1990; year <= 2060; year += 1) {
        const men = genClubSquad({ ...Q, club, year, country: 'Japan' });
        expect(new Set(men.map(m => m.name)).size).toBe(men.length);
        squads += 1;
      }
    }
    expect(squads).toBe(355);
  });

  it('keeps a man, one year older, until his run ends, and dates the new man to that summer', () => {
    let carried = 0;
    let arrived = 0;
    for (let year = 2030; year < 2060; year += 1) {
      const now = new Map(genClubSquad({ ...Q, year }).map(m => [m.id, m]));
      for (const next of genClubSquad({ ...Q, year: year + 1 })) {
        const was = now.get(next.id);
        if (was) {
          carried += 1;
          expect([next.name, next.nation, next.pos, next.age]).toEqual([was.name, was.nation, was.pos, (was.age ?? 0) + 1]);
          expect(next.since).toBe(was.since);
        } else {
          arrived += 1;
          expect(next.since).toBe(year + 1);
        }
      }
    }
    expect(carried).toBeGreaterThan(400);
    expect(arrived).toBeGreaterThan(90);
  });

  it('gives two saves two different squads at the same club', () => {
    const other = genClubSquad({ ...Q, saveKey: 'Other Player|CM|2025|Ajax Youth' });
    expect(other.map(m => m.name).join()).not.toBe(genClubSquad(Q).map(m => m.name).join());
  });

  it('rates the lines so the last starter is six under the level and every reserve under him', () => {
    let squads = 0;
    for (const tier of [1, 2, 3, 4, 7]) {
      for (let year = 2027; year <= 2050; year += 1) {
        const centre = squadCentre(tier);
        const men = genClubSquad({ ...Q, tier, year });
        for (const m of men) {
          const slot = Number((m.id ?? '').split(':')[0]);
          const kind = SQUAD_SLOTS[slot][3];
          if (LAST_STARTER_SLOTS.includes(slot)) expect(m.ovr).toBe(centre - 6);
          else if (kind === 'first') expect(m.ovr).toBeGreaterThanOrEqual(centre - 5);
          else expect(m.ovr).toBeLessThanOrEqual(centre - 7);
          expect(m.age).toBeGreaterThanOrEqual(16);
          expect(m.age).toBeLessThanOrEqual(40);
        }
        squads += 1;
      }
    }
    expect(squads).toBe(120);
    expect(squadCentre(7)).toBe(60);
  });

  it('draws a sheet with no names by role only', () => {
    const named = genClubSquad({ ...Q, year: 2004 });
    const roles = genClubSquad({ ...Q, year: 2004, named: false });
    const pool = new Set(allIntlNames());
    expect(roles.length).toBe(22);
    expect(new Set(roles.map(m => m.name)).size).toBe(22);
    for (const m of roles) {
      expect(m.role).toBe(m.name);
      expect(pool.has(m.name)).toBe(false);
      expect(m.nation).toBeUndefined();
      expect(m.name).toMatch(/^(First|Second|Third|Fourth) choice [a-z ]+$/);
    }
    /* the same men underneath: ids, ages and ratings agree with the named sheet */
    const byId = new Map(named.map(m => [m.id, m]));
    for (const m of roles) expect([m.age, m.ovr, m.pos]).toEqual([byId.get(m.id)?.age, byId.get(m.id)?.ovr, byId.get(m.id)?.pos]);
    expect(roles.find(m => m.pos === 'ST')?.name).toBe('First choice striker');
  });

  it('every signing nation and the three aliased countries have a name family', () => {
    for (const n of [...FOREIGN_NATIONS, 'Monaco', 'UAE', 'Malaysia']) expect(familyIdFor(n)).not.toBeNull();
    expect(FOREIGN_NATIONS.length).toBe(30);
  });

  it('carries a real squad on into the game\'s own years, man by man', () => {
    const real = clubSquad('Real Madrid', 2026);
    expect(real).not.toBeNull();
    const base = { men: real ?? [], year: 2026 };
    const realNames = new Set(base.men.map(m => m.name));
    const q = { ...Q, club: 'Real Madrid', country: 'Spain', tier: 1, base };
    let before = base.men.length;
    let seenReal = 0;
    for (let year = 2027; year <= 2026 + CARRY_SEASONS + 1; year += 1) {
      const men = genClubSquad({ ...q, year });
      const kept = men.filter(m => !m.id);
      for (const m of kept) { expect(realNames.has(m.name)).toBe(true); expect(m.age).toBeUndefined(); }
      for (const m of men.filter(x => x.id)) {
        expect(realNames.has(m.name)).toBe(false);
        expect(m.since).toBeGreaterThanOrEqual(2027);
        expect(m.since).toBeLessThanOrEqual(year);
      }
      expect(kept.length).toBeLessThanOrEqual(before);
      expect(men.length).toBeGreaterThanOrEqual(22);
      expect(new Set(men.map(m => m.name)).size).toBe(men.length);
      before = kept.length;
      seenReal += kept.length;
    }
    expect(seenReal).toBeGreaterThan(20);
    expect(before).toBe(0);
    /* inside the real window the base is ignored: the caller shows the real squad itself */
    expect(genClubSquad({ ...q, year: 2026 }).every(m => m.id)).toBe(true);
  });
});
