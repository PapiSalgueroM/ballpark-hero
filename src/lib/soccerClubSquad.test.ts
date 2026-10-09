/**
 * Round 1115: the club squad readers.
 *
 * The first block was recorded on untouched code, before anything in
 * soccerClubSquad.ts moved: every real depth chart and every baked squad,
 * reduced to a digest. From the lift on it must stay green without being
 * edited, which is the proof that the real squad readers (the offer fit line
 * and the club verdict line on the page) answer exactly what they answered
 * before this round.
 *
 * One thing did change after review, and it is the one thing the digest was
 * never about: WHICH baked row a season reads. A row is keyed by the year its
 * season ended in, the game counts a season by the year it starts in, so a
 * season now reads the row one year on (soccerClubSquad.ts, seasonSquad). The
 * digest still walks the same rows in the same order and still must not move:
 * it asks depthChart for the season that ends in each row's year.
 */
import { describe, expect, it } from 'vitest';
import { CLUB_DATA_NAME, CLUB_SQUADS } from '@/data/clubSquads';
import {
  clubSquad, depthChart, livingSquad, managerTrust, realSeasons, seasonSquad, squadNow, squadSaveKey, squadView, SEASON_TO_KEY,
} from '@/lib/soccerClubSquad';
import {
  isMixed, lastGamesLine, lastSeason, lastTileValue, lastWorthLine, offerFit, rankHeadline, realAmongInvented,
  seasonLabel, sourceChip, sourceLine, squadHelp, squadHelpExamples, trustLines,
} from '@/lib/soccerClubSquadSheet';
import { FALLBACK_CLUBS, initCareer } from '@/lib/soccerCareerEngine';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { phoneAppsSwing } from '@/lib/soccerPhone';
import { allIntlNames } from '@/lib/intlNames';
import {
  genClubSquad, squadCentre, roleName, SQUAD_SLOTS, LAST_STARTER_SLOTS, FOREIGN_NATIONS, familyIdFor, CARRY_SEASONS,
  ELEVEN_SHAPE, ROLE_WORD,
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
            /* the row keyed `year` is the season that starts the year before */
            const c = depthChart(club, year - SEASON_TO_KEY, pos, ovr, 'Test Player');
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
    const lastReal = realSeasons().last;
    const real = seasonSquad('Real Madrid', lastReal);
    expect(real).not.toBeNull();
    expect(real).toBe(clubSquad('Real Madrid', 2026));
    const base = { men: real ?? [], year: lastReal };
    const realNames = new Set(base.men.map(m => m.name));
    const q = { ...Q, club: 'Real Madrid', country: 'Spain', tier: 1, base };
    let before = base.men.length;
    let seenReal = 0;
    for (let year = lastReal + 1; year <= lastReal + CARRY_SEASONS + 1; year += 1) {
      const men = genClubSquad({ ...q, year });
      const kept = men.filter(m => !m.id);
      for (const m of kept) { expect(realNames.has(m.name)).toBe(true); expect(m.age).toBeUndefined(); }
      for (const m of men.filter(x => x.id)) {
        expect(realNames.has(m.name)).toBe(false);
        expect(m.since).toBeGreaterThanOrEqual(lastReal + 1);
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
    expect(genClubSquad({ ...q, year: lastReal }).every(m => m.id)).toBe(true);
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

  it('names the right man as the last one in ahead of him: never himself, always the lowest of his line in the eleven', () => {
    let outside = 0;
    let justOutside = 0;
    for (const position of ['ST', 'CM', 'CB', 'GK', 'LW', 'RB']) {
      for (const [club, country, tier, lastYear] of [['Leeds', 'England', 2, 2030], ['Leeds', 'England', 2, 2004], ['Real Madrid', 'Spain', 1, 2023], ['Real Madrid', 'Spain', 1, 2028]] as const) {
        for (let ovr = 44; ovr <= 92; ovr += 1) {
          const v = squadView({ ...save(club, country, tier, ovr, lastYear), position });
          if (!v) throw new Error('no view');
          if (v.inElevenOnRating) { expect(v.keepsMeOut).toBeNull(); continue; }
          outside += 1;
          const line = v.eleven[v.group];
          const out = v.keepsMeOut;
          if (!out) throw new Error(`nobody keeps a ${ovr} rated ${position} out at ${club}`);
          expect(out.me).toBeUndefined();
          expect(out.name).not.toBe('Test Player');
          expect(line).toContain(out);
          expect(out.ovr).toBe(Math.min(...line.map(m => m.ovr)));
          expect(out.ovr).toBeGreaterThanOrEqual(ovr);
          expect(v.queue.indexOf(out)).toBe(line.length - 1);
          /* the case an off by one lands on him: the first man outside the eleven */
          if (v.rank === line.length + 1) { justOutside += 1; expect(v.queue[v.rank - 1].me).toBe(true); }
          expect(rankHeadline(v)).toContain(out.role ? out.role.toLowerCase() : out.name);
          expect(rankHeadline(v)).not.toContain('Test Player');
        }
      }
    }
    expect(outside).toBeGreaterThan(300);
    expect(justOutside).toBeGreaterThan(20);
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
    expect(help.rules.length).toBe(6);
    expect(help.examples.length).toBe(4);
    expect(help.rules[5]).toContain('at least 10 recorded league games at this club last season');
    expect(help.rules[5]).toContain('7.6 or more, adds up to 2 league games');
    expect(help.rules[5]).toContain('6.4 or less takes away up to 2');
    expect(help.rules[5]).toContain('The frozen-out limit still applies.');
    expect(help.examples[3]).toContain('20 to 30 games becomes 22 to 32');
    expect(help.examples[3]).toContain('6.2 rating make it 18 to 28');
    expect(help.examples[3]).toContain('At a new club neither result carries over.');
    expect(help.examples[0]).toContain('you are 3rd of 6 forwards');
    expect(help.examples[1]).toContain('20 to 30 league games, and 25 of 38 is trust 66%');
    expect(help.examples[2]).toContain('8 to 18 league games');
    expect(JSON.stringify(help)).not.toMatch(/4-3-3/);
  });
});

/* ── Round 1115, after review: what the screens must never say ──────────── */
describe('the sheet does not argue with itself', () => {
  it('numbers his own line with him counted on a sheet by role', () => {
    let sheets = 0;
    let secondWithThirdUnder = 0;
    for (const position of ['ST', 'CM', 'CB', 'GK']) {
      for (const [club, tier] of [['Leeds', 2], ['Derby', 2], ['Wrexham', 3], ['Arsenal', 1]] as const) {
        for (let ovr = 45; ovr <= 90; ovr += 3) {
          const v = squadView({ ...save(club, 'England', tier, ovr, 1994), position });
          if (!v) throw new Error('no view');
          expect(v.source).toBe('roles');
          sheets += 1;
          const word = ROLE_WORD[v.group];
          v.queue.forEach((m, i) => {
            if (m.me) { expect(i).toBe(v.rank - 1); return; }
            expect(m.name).toBe(roleName(i, v.group));
            expect(m.role).toBe(m.name);
          });
          /* the roles inside the eleven are the first places of the line, and the next one is on the bench */
          const shape = ELEVEN_SHAPE[v.group];
          const inXi = new Set(v.eleven[v.group]);
          v.queue.forEach((m, i) => expect(inXi.has(m)).toBe(i < shape));
          for (const m of v.bench) if (!m.me && m.group === v.group) expect(v.queue.indexOf(m)).toBeGreaterThanOrEqual(shape);
          /* nobody wears his ordinal, and nobody is "first" when the headline says nobody is above him */
          const mine = roleName(v.rank - 1, v.group);
          const everyone = [...Object.values(v.eleven).flat(), ...v.bench];
          expect(everyone.some(m => !m.me && m.name === mine)).toBe(false);
          expect(new Set(everyone.map(m => m.name)).size).toBe(everyone.length);
          if (v.rank === 1) expect(rankHeadline(v)).toContain('nobody');
          if (v.rank === 2 && v.queue[2]) { secondWithThirdUnder += 1; expect(v.queue[2].name).toBe(`Third choice ${word}`); }
        }
      }
    }
    expect(sheets).toBe(256);
    expect(secondWithThirdUnder).toBeGreaterThan(5);
    /* the squad itself (the player not in it) keeps counting the club's own men */
    const bare = livingSquad('k', { club: 'Leeds', country: 'England', tier: 2, year: 1995 });
    expect(bare?.men.filter(m => m.group === 'ATT').map(m => m.name)[0]).toBe('First choice forward');
  });

  it('never prints an arrival or a NEW man on a sheet by role, only in the game\'s own years', () => {
    let roleSheetsWithANewMan = 0;
    for (let year = 1990; year <= 2012; year += 1) {
      const s = save('Leeds', 'England', 2, 60, year);
      const v = squadView(s);
      expect(v?.source).toBe('roles');
      expect(v?.arrivals).toEqual([]);
      const at = squadNow(s);
      const squad = at ? livingSquad(squadSaveKey(s), at) : null;
      if (squad?.men.some(m => m.group === 'ATT' && m.since === at?.year)) roleSheetsWithANewMan += 1;
    }
    /* the check above is not empty: the squads underneath do turn over */
    expect(roleSheetsWithANewMan).toBeGreaterThan(5);
    let arrivals = 0;
    for (let year = 2030; year <= 2050; year += 1) arrivals += squadView(save('Leeds', 'England', 2, 60, year))?.arrivals.length ?? 0;
    expect(arrivals).toBeGreaterThan(5);
  });

  it('never prints more league games than games: an injured season shows the total and says what the league figure is', () => {
    const hurt = lastSeason(save('Leeds', 'England', 2, 74, 2030, [{ year: 2030, ovr: 74, leagueApps: 25, apps: 23, injuryWeeks: 10, injury: 'Hamstring tear' }]));
    if (!hurt) throw new Error('no last season');
    expect(hurt.cut).toBe(true);
    expect(lastGamesLine(hurt)).toBe('23 games in all competitions');
    expect(lastWorthLine(hurt)).toBe('An injury took games off that total. Before it, your place was worth 25 league games.');
    expect(lastTileValue(hurt)).toBe('23 games');
    /* an injury that leaves the total above the league figure is still not league games played */
    const mild = lastSeason(save('Leeds', 'England', 2, 74, 2030, [{ year: 2030, ovr: 74, leagueApps: 28, apps: 31, injuryWeeks: 2 }]));
    expect([mild?.cut, mild && lastGamesLine(mild), mild && lastTileValue(mild)]).toEqual([true, '31 games in all competitions', '31 games']);
    const fit = lastSeason(save('Leeds', 'England', 2, 74, 2030, [{ year: 2030, ovr: 74, leagueApps: 24, apps: 30 }]));
    if (!fit) throw new Error('no last season');
    expect(fit.cut).toBe(false);
    expect(lastGamesLine(fit)).toBe('24 league games, 30 in all competitions');
    expect(lastWorthLine(fit)).toBeNull();
    expect(lastTileValue(fit)).toBe('24 league games');
    /* a hand edited row with fewer games than league games and no injury on it */
    const odd = lastSeason(save('Leeds', 'England', 2, 74, 2030, [{ year: 2030, ovr: 74, leagueApps: 24, apps: 20 }]));
    expect([odd?.cut, odd && lastGamesLine(odd), odd && lastWorthLine(odd)]).toEqual([true, '20 games in all competitions', 'Going in, your place was worth 24 league games.']);
    const one = lastSeason(save('Leeds', 'England', 2, 74, 2030, [{ year: 2030, ovr: 74, leagueApps: 1, apps: 1 }]));
    expect(one && lastGamesLine(one)).toBe('1 league game, 1 in all competitions');
  });

  it('still owes a thin season its selection line after an injury, because an injury never lowers the league figure', () => {
    const thinHurt = lastSeason(save('Leeds', 'England', 2, 74, 2030, [{ year: 2030, ovr: 74, leagueApps: 12, apps: 9, injuryWeeks: 10, injury: 'Hamstring tear' }]));
    expect(thinHurt?.lines).toEqual([
      '10 weeks out injured (Hamstring tear).',
      'The injury aside, nothing in your record explains the selection: your range going in was 20 to 30 league games.',
    ]);
    const thinFit = lastSeason(save('Leeds', 'England', 2, 74, 2030, [{ year: 2030, ovr: 74, leagueApps: 12, apps: 15 }]));
    expect(thinFit?.lines).toEqual(['Nothing in your record explains it beyond selection: your range going in was 20 to 30 league games.']);
  });

  it('draws the "under the level" line exactly at the band\'s edge: five under has none, six under has it', () => {
    const under = (ovr: number) => lastSeason(save('Leeds', 'England', 2, ovr, 2030, [{ year: 2030, ovr, leagueApps: 11, apps: 14 }]))?.lines.filter(l => l.includes('rating points under')) ?? [];
    expect(squadCentre(2)).toBe(72);
    expect(under(68)).toEqual([]);
    expect(under(67)).toEqual([]);
    expect(under(66)).toEqual(['Going into that season you were 6 rating points under the level that squad expects.']);
    expect(under(65).length).toBe(1);
  });

  it('says so when a squad of the game\'s own years still holds real men, and marks each of them', () => {
    const mixed = squadView(save('Real Madrid', 'Spain', 1, 84, 2027));
    if (!mixed) throw new Error('no view');
    expect(isMixed(mixed)).toBe(true);
    expect(sourceChip(mixed)).toBe('REAL AND INVENTED');
    const everyone = [...Object.values(mixed.eleven).flat(), ...mixed.bench];
    const real = new Set((seasonSquad('Real Madrid', realSeasons().last) ?? []).map(m => m.name));
    expect(real.size).toBeGreaterThan(15);
    let marked = 0;
    for (const m of everyone) {
      const isReal = realAmongInvented(mixed, m);
      if (isReal) marked += 1;
      expect(isReal).toBe(!m.me && real.has(m.name));
      if (m.id !== undefined) expect(isReal).toBe(false);
    }
    expect(marked).toBe(mixed.carried);
    expect(marked).toBeGreaterThan(0);
    const invented = squadView(save('Leeds', 'England', 2, 70, 2030));
    if (!invented) throw new Error('no view');
    expect([isMixed(invented), sourceChip(invented)]).toEqual([false, 'INVENTED TEAMMATES']);
    expect(sourceChip(squadView(save('Real Madrid', 'Spain', 1, 84, 2023)) ?? invented)).toBe('REAL SQUAD');
    expect(sourceChip(squadView(save('Leeds', 'England', 2, 70, 2004)) ?? invented)).toBe('ROLES ONLY');
  });

  it('gives a tie to the teammate without saying he was there first', () => {
    const help = squadHelp();
    expect(JSON.stringify(help)).not.toMatch(/here first/);
    expect(help.rules[1]).toContain('counts as ahead of you');
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

  it('never calls a career in a real past season by an invented name, in any season up to the last real one', () => {
    const pool = new Set(allIntlNames());
    /* the save's last row is `year`, so the season read is the one after it */
    for (let year = 1989; year < realSeasons().last; year += 1) {
      const v = squadView(save('Wrexham', 'Wales', 3, 60, year));
      expect(v?.source).toBe('roles');
      for (const m of [...(v?.bench ?? []), ...Object.values(v?.eleven ?? {}).flat()]) {
        if (!m.me) expect(pool.has(m.name)).toBe(false);
      }
    }
    expect(squadView(save('Wrexham', 'Wales', 3, 60, realSeasons().last))?.source).toBe('invented');
  });
});

/* ── after review: a season reads its own squad, not last season's ──────── */
describe('which baked row is a season', () => {
  /* Two moves everybody can check, each read in two sources on 2026-10-07 by
     the review of this round (the club's own announcement and the league's
     for the first, two national sports desks for the second): Erling Haaland
     joined Manchester City on 1 July 2022 and Kylian Mbappe signed for Real
     Madrid on 3 June 2024. So the season that starts in 2022 is his first at
     City and his old club's first without him, and the same for 2024 in
     Madrid and Paris. */
  const has = (club: string, season: number, name: string) => (seasonSquad(club, season) ?? []).some(m => m.name === name);
  const MOVES: [string, string, string, number][] = [
    ['Erling Haaland', 'Dortmund', 'Man City', 2022],
    ['Kylian Mbapp\u00e9', 'PSG', 'Real Madrid', 2024],
  ];

  it('puts a summer signing in the season he signed for, and takes him out of the club he left', () => {
    for (const [name, from, to, season] of MOVES) {
      expect([name, has(to, season, name), has(to, season - 1, name)]).toEqual([name, true, false]);
      expect([name, has(from, season - 1, name), has(from, season, name)]).toEqual([name, true, false]);
    }
  });

  it('says a real squad is a selection, and the baked rows keep the promise it makes (four at most a position)', () => {
    /* Release AN, after review: "The real Tottenham squad of 2019/20" stood over 19 names with a regular
       of that season missing, and nothing said the list was a selection. The line says it now, and its
       number is held to the data: no baked row may list more than four men at one position. */
    const club = FALLBACK_CLUBS.find(c => c.name === 'Man City');
    if (!club) throw new Error('no club Man City');
    const view = squadView(save('Man City', club.country, club.tier, 70, 2021));
    expect(view?.source).toBe('real');
    expect(sourceLine(view!)).toContain('up to four players at each position');
    expect(sourceLine(view!)).toContain('not everyone at the club is here');
    let rows = 0;
    let most = 0;
    for (const blob of Object.values(CLUB_SQUADS)) {
      rows += 1;
      const at = new Map<string, number>();
      for (const entry of blob.split(',')) { const pos = entry.split(':')[1]; at.set(pos, (at.get(pos) ?? 0) + 1); }
      most = Math.max(most, ...at.values());
    }
    expect(rows).toBeGreaterThan(300);
    expect(most).toBeLessThanOrEqual(4);
    /* the other kinds of squad make no such claim */
    expect(sourceLine({ ...view!, source: 'roles' })).not.toContain('up to four');
  });

  it('gives the page readers the same season: the squad view, the depth chart and the label', () => {
    for (const [name, , to, season] of MOVES) {
      const club = FALLBACK_CLUBS.find(c => c.name === to);
      if (!club) throw new Error(`no club ${to}`);
      /* a save whose last row is the season before reads the season he signed for */
      const view = squadView(save(to, club.country, club.tier, 70, season - 1));
      if (!view) throw new Error('no view');
      const everyone = [...Object.values(view.eleven).flat(), ...view.bench];
      expect([view.source, view.year, everyone.some(m => m.name === name)]).toEqual(['real', season, true]);
      expect(sourceLine(view)).toContain(`The real ${to} squad of ${seasonLabel(season)}`);
      const before = squadView(save(to, club.country, club.tier, 70, season - 2));
      expect([...Object.values(before?.eleven ?? {}).flat(), ...(before?.bench ?? [])].some(m => m.name === name)).toBe(false);
      expect(depthChart(to, season, 'GK', 99, 'Test Player')?.squad.some(m => m.name === name)).toBe(true);
      expect(depthChart(to, season - 1, 'GK', 99, 'Test Player')?.squad.some(m => m.name === name)).toBe(false);
    }
  });

  it('counts the real seasons from the data file, and the words follow them', () => {
    const real = realSeasons();
    expect([real.first, real.last]).toEqual([2015, 2025]);
    expect(seasonLabel(real.first)).toBe('2015/16');
    expect(seasonLabel(1999)).toBe('1999/00');
    const rule = squadHelp().rules[4];
    expect(rule).toContain('from 2015/16 to 2025/26');
    expect(rule).toContain('From 2026/27 the world is your career\'s own');
    /* the first season of the game's own world, at a club with a real squad and at one without */
    const mixed = squadView(save('Real Madrid', 'Spain', 1, 84, real.last));
    expect([mixed?.source, mixed?.year]).toEqual(['invented', real.last + 1]);
    expect(sourceLine(mixed ?? ({} as never))).toContain('of the real 2025/26 squad are still here');
    const made = squadView(save('Wrexham', 'Wales', 3, 60, real.last));
    expect(sourceLine(made ?? ({} as never))).toContain('From 2026/27 this is your career\'s own world');
    /* and the last real season is still the real squad */
    expect(squadView(save('Real Madrid', 'Spain', 1, 84, real.last - 1))?.source).toBe('real');
  });
});
