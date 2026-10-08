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
import { clubSquad, depthChart, managerTrust, squadNow, squadSaveKey, squadView } from '@/lib/soccerClubSquad';
import { lastSeason, offerFit, squadHelp, squadHelpExamples, trustLines } from '@/lib/soccerClubSquadSheet';
import { FALLBACK_CLUBS, initCareer } from '@/lib/soccerCareerEngine';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { phoneAppsSwing } from '@/lib/soccerPhone';
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
      expect(m.name).toMatch(/^(First|Second|Third|Fourth|Fifth|Sixth|Seventh) choice (keeper|defender|midfielder|forward)$/);
    }
    /* the same men underneath: ids, ages and ratings agree with the named sheet */
    const byId = new Map(named.map(m => [m.id, m]));
    for (const m of roles) expect([m.age, m.ovr, m.pos]).toEqual([byId.get(m.id)?.age, byId.get(m.id)?.ovr, byId.get(m.id)?.pos]);
    expect(roles.find(m => m.group === 'ATT')?.name).toBe('First choice forward');
    expect(roles.filter(m => m.group === 'MID').map(m => m.name)[6]).toBe('Seventh choice midfielder');
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

/* ── Round 1115 step 3: the living squad, trust, the reasons, the help ──── */
const STATS = { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, reflexes: 60 };

/** A save built by the real engine, then moved to a club and a season. */
function save(club: string, country: string, tier: number, overall: number, lastYear: number, rows: Partial<SeasonRecord>[] = []): CareerState {
  const s = initCareer('Test Player', 'England', 'ST', '2020s', STATS, overall, 2025, FALLBACK_CLUBS, null);
  const youth = s.seasons[0];
  const played = rows.map(r => ({ ...youth, type: 'playing' as const, club, clubCountry: country, clubTier: tier, apps: 30, leagueApps: 26, rating: 6.9, ...r }));
  const filler = played.length ? [] : [{ ...youth, year: lastYear, type: 'playing' as const, club: 'Somewhere Else', clubTier: 3, apps: 30, leagueApps: 26, rating: 6.9 }];
  return { ...s, phase: 'playing', currentClub: club, currentClubCountry: country, currentClubTier: tier, overall, seasons: [youth, ...filler, ...played] };
}

describe('the living squad', () => {
  it('has three sources and says which', () => {
    const real = squadView(save('Real Madrid', 'Spain', 1, 84, 2023));
    expect(real?.source).toBe('real');
    expect(real?.year).toBe(2024);
    expect(real?.queue.filter(m => !m.me).every(m => m.age === undefined && m.id === undefined)).toBe(true);
    expect(real?.arrivals).toEqual([]);

    const later = squadView(save('Real Madrid', 'Spain', 1, 84, 2027));
    expect(later?.source).toBe('invented');
    expect(later?.carried).toBeGreaterThan(0);

    const roles = squadView(save('Leeds', 'England', 2, 70, 2004));
    expect(roles?.source).toBe('roles');
    const pool = new Set(allIntlNames());
    for (const m of [...(roles?.bench ?? []), ...Object.values(roles?.eleven ?? {}).flat()]) {
      if (m.me) continue;
      expect(m.role).toBe(m.name);
      expect(pool.has(m.name)).toBe(false);
    }

    const invented = squadView(save('Leeds', 'England', 2, 70, 2030));
    expect(invented?.source).toBe('invented');
    expect(invented?.carried).toBe(0);
    expect(invented?.bench.length).toBe(23 - 11);
  });

  it('puts him exactly once across the eleven and the bench, in lines of 1, 4, 3 and 3', () => {
    for (const ovr of [50, 66, 67, 72, 80, 93]) {
      const v = squadView(save('Leeds', 'England', 2, ovr, 2030));
      if (!v) throw new Error('no view');
      const xi = Object.values(v.eleven).flat();
      expect([v.eleven.GK.length, v.eleven.DEF.length, v.eleven.MID.length, v.eleven.ATT.length]).toEqual([1, 4, 3, 3]);
      expect([...xi, ...v.bench].filter(m => m.me).length).toBe(1);
      expect(xi.some(m => m.me)).toBe(v.inElevenOnRating);
      expect(v.keepsMeOut === null).toBe(v.inElevenOnRating);
      expect(v.rank).toBeGreaterThanOrEqual(1);
      expect(v.rank).toBeLessThanOrEqual(v.groupSize);
    }
  });

  it('agrees with the plan at the line by construction: 67 is in both pictures, 66 in neither', () => {
    const inside = squadView(save('Leeds', 'England', 2, 67, 2030));
    const outside = squadView(save('Leeds', 'England', 2, 66, 2030));
    expect([inside?.inElevenOnRating, inside?.trust.inPlans]).toEqual([true, true]);
    expect([outside?.inElevenOnRating, outside?.trust.inPlans]).toEqual([false, false]);
  });

  it('does not change when the nation on the save does', () => {
    const a = save('Leeds', 'England', 2, 70, 2030);
    const b = { ...a, nationality: 'Ghana' };
    expect(squadSaveKey(b)).toBe(squadSaveKey(a));
    expect(squadView(b)).toEqual(squadView(a));
  });

  it('shows nothing in the academy or after retiring, but still answers a caller with its own club', () => {
    const youth = initCareer('Test Player', 'England', 'ST', '2020s', STATS, 55, 2025, FALLBACK_CLUBS, null);
    expect(squadNow(youth)).toBeNull();
    expect(squadView(youth)).toBeNull();
    expect(squadView({ ...save('Leeds', 'England', 2, 70, 2030), retired: true })).toBeNull();
    const fit = offerFit(youth, { club: { name: 'Leeds', country: 'England', tier: 2 } });
    expect(fit?.club).toBe('Leeds');
    expect(fit?.rank).toBeGreaterThanOrEqual(1);
  });

  it('reads trust from the band, the phone and the freeze', () => {
    const base = save('Leeds', 'England', 2, 74, 2030);
    const at = squadNow(base);
    if (!at) throw new Error('no club');
    const warm = { ...base, phone: { threads: [{ rel: 90 }] } } as unknown as CareerState;
    const cold = { ...base, phone: { threads: [{ rel: 10 }] } } as unknown as CareerState;
    expect(phoneAppsSwing(warm)).toBe(3);
    expect(phoneAppsSwing(cold)).toBe(-3);
    expect(managerTrust(base, at)).toMatchObject({ expected: 25, pct: 66, swing: 0, inPlans: true, label: 'Starter most weeks' });
    expect(managerTrust(warm, at)).toMatchObject({ expected: 28, pct: 74, swing: 3, label: 'Nailed on starter' });
    expect(managerTrust(cold, at)).toMatchObject({ expected: 22, pct: 58, swing: -3, label: 'Starter most weeks' });
    const frozen = managerTrust({ ...base, frozenOut: 1 }, at);
    expect(frozen).toMatchObject({ expected: 6, frozen: true, inPlans: false, label: 'Frozen out' });
    expect(trustLines({ ...base, frozenOut: 1 }, at, frozen)[0]).toContain('8 league games at most');
    expect(trustLines(warm, at, managerTrust(warm, at))).toEqual([
      'The plan is about 23 to 33 league games if you stay fit.',
      'You are 2 above the level this squad expects (72).',
      'The dressing room has your back: about 3 more league games.',
    ]);
  });

  it('explains a thin season from the saved row', () => {
    const thin = save('Leeds', 'England', 2, 62, 2030, [{ year: 2030, ovr: 62, leagueApps: 11, apps: 17 }]);
    const last = lastSeason(thin);
    expect(last).toMatchObject({ club: 'Leeds', year: 2030, leagueApps: 11, apps: 17, thin: true, loan: false });
    expect(last?.lines).toContain('Going into that season you were 10 rating points under the level that squad expects.');
    expect(last?.lines.some(l => l.startsWith('On our ratings you went into the season'))).toBe(true);
    const old = save('Leeds', 'England', 2, 62, 2030, [{ year: 2030, ovr: undefined, leagueApps: 11, apps: 17 }]);
    expect(lastSeason(old)?.lines).toEqual(['This season was saved before the game kept the numbers that explain it.']);
    const full = save('Leeds', 'England', 2, 62, 2030, [{ year: 2030, ovr: 62, leagueApps: 24, apps: 30 }]);
    expect(lastSeason(full)?.lines.some(l => l.includes('last one in'))).toBe(false);
    expect(lastSeason(initCareer('Test Player', 'England', 'ST', '2020s', STATS, 55, 2025, FALLBACK_CLUBS, null))).toBeNull();
  });

  it('computes the numbers in the help, and the help prints them', () => {
    const n = squadHelpExamples();
    expect(n).toMatchObject({
      atOrAbove: 2, rank: 3, groupSize: 6, centre: 72, above: 2, band: { min: 20, max: 30 }, mid: 25, pct: 66,
      pctWithSwing: 71, under: 10, thinBand: { min: 8, max: 18 }, thinRank: 6,
    });
    const help = squadHelp();
    expect(help.rules.length).toBe(5);
    expect(help.examples[0]).toContain('you are 3rd of 6 forwards');
    expect(help.examples[1]).toContain('20 to 30 league games, and 25 of 38 is trust 66%');
    expect(help.examples[2]).toContain('8 to 18 league games');
    expect(JSON.stringify(help)).not.toMatch(/4-3-3/);
  });
});

/* ── Round 1115: the saves nobody planned for ───────────────────────────── */
describe('odd saves and odd years', () => {
  it('keeps the men when a club changes tier, and moves their ratings with the level', () => {
    const low = genClubSquad({ ...Q, tier: 2 });
    const high = new Map(genClubSquad({ ...Q, tier: 1 }).map(m => [m.id, m]));
    for (const m of low) {
      const up = high.get(m.id);
      expect([up?.name, up?.age, up?.pos]).toEqual([m.name, m.age, m.pos]);
      expect((up?.ovr ?? 0) - m.ovr).toBeGreaterThanOrEqual(0);
    }
    expect(high.get('6:' + low.find(m => m.id?.startsWith('6:'))?.id?.split(':')[1])?.ovr).toBe(74);
  });

  it('answers at the edges of time without hanging', () => {
    for (const year of [1900, 1960, 1961, 2100, 2399, 2400, 999999999]) {
      const men = genClubSquad({ ...Q, year });
      expect(men.length).toBe(22);
      expect(new Set(men.map(m => m.name)).size).toBe(22);
    }
    expect(genClubSquad({ ...Q, year: 1900 })).toEqual(genClubSquad({ ...Q, year: 1960 }));
  });

  it('survives a save with one row, an unknown position, a hand edited first row and bad numbers', () => {
    const base = save('Leeds', 'England', 2, 70, 2030);
    const oneRow = { ...base, seasons: [base.seasons[0]] };
    expect(squadView(oneRow)?.year).toBe(base.seasons[0].year + 1);
    expect(squadView({ ...base, position: 'SW' })?.group).toBe('MID');
    const edited = { ...base, seasons: [{ ...base.seasons[0], year: undefined as unknown as number, club: undefined as unknown as string }, ...base.seasons.slice(1)] };
    expect(squadView(edited)?.rank).toBeGreaterThanOrEqual(1);
    const empty = { ...base, seasons: [] };
    expect(squadView(empty)?.source).toBe('roles');
    expect(lastSeason(empty)).toBeNull();
    expect(squadView({ ...base, currentClubTier: Number.NaN })).toBeNull();
    expect(squadView({ ...base, currentClub: '' })).toBeNull();
    const noRating = squadView({ ...base, overall: Number.NaN });
    expect(noRating?.rank).toBe(1);
    expect(noRating?.trust.pct).toBeGreaterThanOrEqual(0);
  });

  it('treats a renamed club as a new dressing room, the way the engine counts his seasons there', () => {
    const base = save('Leeds', 'England', 2, 70, 2030, [{ year: 2029, ovr: 69 }, { year: 2030, ovr: 70 }]);
    const renamed = { ...base, currentClub: 'Leeds City' };
    const at = squadNow(renamed);
    if (!at) throw new Error('no club');
    expect(squadView(renamed)?.club).toBe('Leeds City');
    expect(lastSeason(renamed)?.club).toBe('Leeds');
    expect(managerTrust(renamed, at).band).toEqual(managerTrust(base, squadNow(base) ?? at).band);
  });

  it('never calls a career in a real past season by an invented name, in any year before 2027', () => {
    const pool = new Set(allIntlNames());
    for (let year = 1989; year <= 2025; year += 1) {
      const v = squadView(save('Wrexham', 'Wales', 3, 60, year));
      expect(v?.source).toBe('roles');
      for (const m of [...(v?.bench ?? []), ...Object.values(v?.eleven ?? {}).flat()]) {
        if (!m.me) expect(pool.has(m.name)).toBe(false);
      }
    }
    expect(squadView(save('Wrexham', 'Wales', 3, 60, 2026))?.source).toBe('invented');
  });
});
