/* Round 1541: the NBA bind of the international summers (src/lib/nbaCareerIntl.ts).
   Round 1544: the board reads the static gate (nbaCareerIntlGate.ts) and loads this on demand. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NBA_ARCHETYPES, startNbaCareer, type NbaCareerState, type NbaSeasonLine } from '@/lib/nbaMyCareer';
import { keyedRng } from '@/lib/keyedRng';
import {
  INTL_CALL_UP_OVR, INTL_KNOCK_BASE, INTL_LIFT_CAP, INTL_LIFT_PER_POINT, INTL_MAX_AGE, INTL_MIN_HEALTH,
  NBA_CAREER_INTL, NBA_INTL_CALENDAR, nbaIntlCallOf, nbaIntlEditionLabel, nbaIntlHelpRules, nbaIntlLift,
  nbaIntlLine, nbaIntlPlay, nbaIntlStrength, nbaIntlSummerNotes, nbaIntlSummerOf, INTL_RUNG_STRENGTH,
} from '@/lib/nbaCareerIntl';
import { intlRungHistory } from '@/lib/careerIntl';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NBA_CAREER_INTL_LAZY } from '@/lib/nbaCareerIntlGate';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';

const line = (year: number, ovr: number, over: Partial<NbaSeasonLine> = {}): NbaSeasonLine => ({
  year, team: 'BOS', age: 27, ovr, games: 70, ppg: 26, rpg: 7, apg: 6, awards: [], teamResult: 'Lost in the second round', salary: 30, ...over,
});
/** A career just after its season labelled `year`, the way the board holds it after progress. */
function after(year: number, ovr: number, over: Partial<NbaCareerState> = {}, lineOver: Partial<NbaSeasonLine> = {}): NbaCareerState {
  const c = startNbaCareer('Test Player', 'SF', NBA_ARCHETYPES.SF[0], keyedRng(`intl-test:${year}`));
  c.seasons = [line(year, ovr, lineOver)];
  c.year = year + 1;
  c.age = 28;
  c.health = 80;
  c.retired = false;
  return Object.assign(c, over);
}

afterEach(() => { vi.restoreAllMocks(); });

describe('the summer after a season', () => {
  it('maps the season labelled Y to the summer Y + 1', () => {
    expect(nbaIntlSummerOf(2003)).toBe(2004);
    expect(NBA_INTL_CALENDAR.editionFor(nbaIntlSummerOf(2003))?.id).toBe('oly-2004');
    expect(NBA_INTL_CALENDAR.editionFor(nbaIntlSummerOf(2019))).toBeNull();
    expect(NBA_INTL_CALENDAR.editionFor(nbaIntlSummerOf(2020))?.id).toBe('oly-2021');
    expect(NBA_INTL_CALENDAR.editionFor(nbaIntlSummerOf(2026))?.id).toBe('wc-2027');
  });
  it('has no edition in the summers between', () => {
    for (const y of [2005, 2007, 2009, 2011, 2013, 2015, 2017, 2018, 2020, 2022, 2025, 2026]) expect(NBA_INTL_CALENDAR.editionFor(y)).toBeNull();
  });
  it('labels an edition from the ledger, Tokyo with the year it was held, a projected one with no host', () => {
    expect(nbaIntlEditionLabel('oly-2004')).toBe('the 2004 Olympics in Athens');
    expect(nbaIntlEditionLabel('oly-2021')).toBe('the 2020 Olympics in Tokyo, held in 2021');
    expect(nbaIntlEditionLabel('wc-2006')).toBe('the 2006 World Championship in Japan');
    expect(nbaIntlEditionLabel('wc-2027')).toBe('the 2027 Basketball World Cup in Qatar');
    expect(nbaIntlEditionLabel('oly-2036')).toBe('the 2036 Olympics');
  });
  it('names the two group rounds only for a World Cup really played that way (review of Round 1544: no source for 2027 on)', () => {
    const fmt = 'The game plays its two group rounds as one, into a round of 16.';
    expect(nbaIntlSummerNotes('wc-2019', 28).playedAsNote).toBe(fmt);
    expect(nbaIntlSummerNotes('wc-2023', 28).playedAsNote).toBe(fmt);
    /* the teeth: these World Cups carry the two round shape the game cannot play, so only their kind keeps the line off */
    for (const id of ['wc-2027', 'wc-2031', 'wc-2035', 'wc-2039']) expect(NBA_INTL_CALENDAR.byId(id)?.shape.playable).toBe(false);
    for (const id of ['wc-2027', 'wc-2031', 'wc-2035', 'wc-2039', 'oly-2004', 'oly-2028']) expect(nbaIntlSummerNotes(id, 28).playedAsNote).toBeNull();
  });
});

describe('the call', () => {
  it('comes at 87 and not at 86 (the lead\'s ruling L1 of Round 1544)', () => {
    expect(INTL_CALL_UP_OVR).toBe(87);
    expect(nbaIntlCallOf(after(2003, 87))?.id).toBe('oly-2004');
    expect(nbaIntlCallOf(after(2003, 86))).toBeNull();
  });
  it('never comes when retired, suspended, too old or too hurt, or in a summer with no edition', () => {
    expect(nbaIntlCallOf(after(2003, 90, { retired: true }))).toBeNull();
    expect(nbaIntlCallOf(after(2003, 90, {}, { teamResult: 'SUSPENDED' }))).toBeNull();
    expect(nbaIntlCallOf(after(2003, 90, { suspendedSeasons: 1 }))).toBeNull();
    expect(nbaIntlCallOf(after(2003, 90, { age: INTL_MAX_AGE + 1 }))).toBeNull();
    expect(nbaIntlCallOf(after(2003, 90, { age: INTL_MAX_AGE }))?.id).toBe('oly-2004');
    expect(nbaIntlCallOf(after(2003, 90, { health: INTL_MIN_HEALTH - 1 }))).toBeNull();
    expect(nbaIntlCallOf(after(2003, 90, { health: INTL_MIN_HEALTH }))?.id).toBe('oly-2004');
    expect(nbaIntlCallOf(after(2004, 99))).toBeNull();
  });
  it('never comes to a career that ends after this season, by the hard stop or by his own choice', () => {
    /* the board writes the curtain before it checks the end, so the call must read the end itself */
    const long = after(2003, 90);
    long.seasons = Array.from({ length: 21 }, (_, i) => line(1983 + i, 90));
    expect(nbaIntlCallOf(long)).toBeNull();
    long.seasons = long.seasons.slice(1);
    expect(nbaIntlCallOf(long)?.id).toBe('oly-2004');
    const farewell = Object.assign(after(2003, 90), { retirement: { farewellYear: 2003 } });
    expect(nbaIntlCallOf(farewell)).toBeNull();
    expect(NBA_CAREER_INTL_LAZY.curtainLine(farewell)).toBeNull();
    expect(nbaIntlCallOf(Object.assign(after(2003, 90), { retirement: { retiredYear: 2003 } }))).toBeNull();
    expect(nbaIntlCallOf(Object.assign(after(2003, 90), { retirement: { farewellYear: 2004 } }))?.id).toBe('oly-2004');
  });
  it('rest writes the year, the edition and went false, and nothing else', () => {
    const c = after(2003, 90);
    const before = JSON.stringify(c);
    expect(NBA_CAREER_INTL.pending(c)?.edition.id).toBe('oly-2004');
    NBA_CAREER_INTL.answer(c, 'rest');
    const { intl, ...rest } = c as NbaCareerState & { intl?: unknown };
    expect(intl).toEqual({ v: 1, summers: [{ year: 2004, edition: 'oly-2004', went: false }] });
    expect(JSON.stringify(rest)).toBe(before);
    expect(NBA_CAREER_INTL.pending(c)).toBeNull();
    expect(NBA_CAREER_INTL_LAZY.curtainLine(c)).toBeNull();
  });
  it('go writes the row and never the tournament, which the save plays again; only health moves outside the block', () => {
    const c = after(2003, 92);
    const before = { ...c, health: 0 };
    expect(NBA_CAREER_INTL_LAZY.curtainLine(c)).toBe('The US national team wants you this summer. You decide next.');
    expect(NBA_CAREER_INTL_LAZY.pendingYear(c)).toBe(2004);
    const spy = vi.spyOn(Math, 'random');
    const a = NBA_CAREER_INTL.answer(c, 'go');
    expect(a?.row.went).toBe(true);
    const ic = c as NbaCareerState & { intl?: { summers: unknown[]; last?: unknown } };
    expect(ic.intl?.summers).toHaveLength(1);
    expect(ic.intl && 'last' in ic.intl).toBe(false);
    /* a later season on the save moves nothing: the replay reads the season before that summer */
    const later = { ...c, seasons: [...c.seasons, line(2004, 70)], age: c.age + 1 };
    const t = NBA_CAREER_INTL.tournamentOf(later, 2004);
    expect(spy).not.toHaveBeenCalled();
    expect(JSON.stringify(t)).toBe(JSON.stringify(a?.tournament));
    expect(t?.field).toContain('Serbia and Montenegro');
    expect(NBA_CAREER_INTL.tournamentOf(c, 2008)).toBeNull();
    const { intl: _i, ...rest } = ic;
    expect(JSON.stringify({ ...rest, health: 0 })).toBe(JSON.stringify(before));
    expect(NBA_CAREER_INTL.pending(c)).toBeNull();
    expect(NBA_CAREER_INTL.medalCount(c)).toBe(NBA_CAREER_INTL.trophyRows(c).reduce((n, r) => n + r.n, 0));
  });
  it('plays the same tournament for the same career twice', () => {
    const a = after(2015, 93);
    const b = after(2015, 93);
    NBA_CAREER_INTL.answer(a, 'go');
    NBA_CAREER_INTL.answer(b, 'go');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('the game', () => {
  it('is never level, and goes to overtime only from level', () => {
    for (let i = 0; i < 4000; i += 1) {
      const r = nbaIntlPlay(85, 85, keyedRng(`g:${i}`));
      expect(r.a).not.toBe(r.b);
      expect(r.a).toBeGreaterThanOrEqual(45);
    }
  });
  it('gives each nation its real rung in a played summer, drawing nothing, and a rung it really reached before one to come', () => {
    const never = () => { throw new Error('a played summer drew from the stream'); };
    const athens = NBA_INTL_CALENDAR.editionFor(2004);
    if (!athens) throw new Error('no Athens');
    expect(nbaIntlStrength(athens, 'Argentina', never)).toBe(92);
    expect(nbaIntlStrength(athens, 'USA', never)).toBe(87);
    expect(nbaIntlStrength(athens, 'Angola', never)).toBe(76);
    const qatar = NBA_INTL_CALENDAR.editionFor(2027);
    if (!qatar) throw new Error('no 2027');
    /* the USA really finished gold, bronze, fourth and in the quarter-finals: a draw lands on one of those */
    const seen = new Set<number>();
    for (let i = 0; i < 400; i += 1) seen.add(nbaIntlStrength(qatar, 'USA', keyedRng(`s:${i}`)));
    expect([...seen].sort()).toEqual([82, 85, 87, 92]);
    expect(nbaIntlStrength(qatar, 'Nowhere', never)).toBe(76);
    expect(nbaIntlLift(INTL_CALL_UP_OVR)).toBe(0);
    expect(nbaIntlLift(INTL_CALL_UP_OVR + 2)).toBe(1);
    expect(nbaIntlLift(99)).toBe(INTL_LIFT_CAP);
  });
  it('can draw every finish a nation really had before a summer to come, its latest one too (review of Round 1544, M5)', () => {
    const qatar = NBA_INTL_CALENDAR.editionFor(2027);
    if (!qatar) throw new Error('no 2027');
    const nations = new Set<string>();
    for (const e of NBA_INTL_CALENDAR.played()) for (const n of e.field ?? []) nations.add(n);
    let checked = 0;
    let teeth = 0;
    for (const nation of nations) {
      const past = intlRungHistory(NBA_INTL_CALENDAR, nation);
      if (past.length < 2) continue;
      /* a stream that lands in the middle of slot i must give the i-th finish, the last slot included */
      past.forEach((rung, i) => {
        expect(nbaIntlStrength(qatar, nation, () => (i + 0.5) / past.length)).toBe(INTL_RUNG_STRENGTH[rung]);
        checked += 1;
      });
      if (INTL_RUNG_STRENGTH[past[past.length - 1]] !== INTL_RUNG_STRENGTH[past[past.length - 2]]) teeth += 1;
    }
    /* measured on the ledger as it stands: 39 nations with two finishes or more, 200 slots, 15 whose latest finish
       differs from the one before (those are what catch a draw that never reaches the last slot: 44 slots go wrong) */
    expect(checked).toBeGreaterThan(50);
    expect(teeth).toBeGreaterThan(5);
  });
  it('reads every played summer of a nation\'s history, written out here rather than taken from the helper (review of Round 1544, N1)', () => {
    /* The USA's real finishes, Athens 2004 to Paris 2024: bronze 2004 and 2006, gold 2008 to 2016, out in the
       quarter-finals 2019, gold 2021, fourth 2023, gold 2024. A history cut short (Paris never seen) fails here. */
    const usa = ['bronze', 'bronze', 'gold', 'gold', 'gold', 'gold', 'gold', 'quarter', 'gold', 'fourth', 'gold'] as const;
    expect(intlRungHistory(NBA_INTL_CALENDAR, 'USA')).toEqual([...usa]);
    const qatar = NBA_INTL_CALENDAR.editionFor(2027);
    if (!qatar) throw new Error('no 2027');
    usa.forEach((rung, i) => {
      expect(nbaIntlStrength(qatar, 'USA', () => (i + 0.5) / usa.length)).toBe(INTL_RUNG_STRENGTH[rung]);
    });
  });
});

describe('his line and his medals', () => {
  it('scales his season to a 40 minute game and a team of stars: 24, 6 and 5 come out near 15, 3.75 and 3.1', () => {
    /* 24 x 40/48 x 0.75 = 15, 6 x 0.625 = 3.75, 5 x 0.625 = 3.125; the draw's spread is 3 on points and
       1.5 on the others, so over 4000 games the means have a standard error of about 0.05 and 0.02 */
    const c = after(2003, 90, {}, { ppg: 24, rpg: 6, apg: 5 });
    const n = 4000;
    const sum = { pts: 0, reb: 0, ast: 0 };
    for (let i = 0; i < n; i += 1) {
      const l = nbaIntlLine(c, keyedRng(`line:${i}`));
      sum.pts += l.pts; sum.reb += l.reb; sum.ast += l.ast;
    }
    const mean = { pts: sum.pts / n, reb: sum.reb / n, ast: sum.ast / n };
    console.log(`nbaIntlLine means over ${n} keyed games: pts ${mean.pts.toFixed(3)}, reb ${mean.reb.toFixed(3)}, ast ${mean.ast.toFixed(3)}`);
    expect(Math.abs(mean.pts - 15)).toBeLessThan(0.25);
    expect(Math.abs(mean.reb - 3.75)).toBeLessThan(0.15);
    expect(Math.abs(mean.ast - 3.125)).toBeLessThan(0.15);
  });
  it('labels a medal of an edition the ledger lacks by the name its competition went by that summer', () => {
    const c = Object.assign(after(2007, 90), {
      intl: { v: 1 as const, summers: [{ year: 2008, edition: 'wc-2008', went: true as const, age: 28, place: 'gold' as const, games: 9, wins: 9, avg: { pts: 15 }, hurt: false }] },
    });
    expect(NBA_CAREER_INTL.trophyRows(c)).toEqual([{ label: 'World Championship gold', n: 1, years: [2008] }]);
  });
});

describe('the help and the bindings', () => {
  it('quotes the module numbers and never the marks', () => {
    const text = nbaIntlHelpRules().join(' ');
    for (const n of [INTL_CALL_UP_OVR, INTL_MAX_AGE, INTL_MIN_HEALTH, INTL_LIFT_PER_POINT, INTL_LIFT_CAP, Math.round(INTL_KNOCK_BASE * 100)]) expect(text).toContain(String(n));
    expect(text).not.toMatch(/Team USA|USA Basketball|Dream Team/);
    expect(text).toContain('the US national team');
    /* names read off the ledger: the old name, the real fields' span, every announced host */
    expect(text).toContain('the World Championship in 2006 and 2010');
    expect(text).toContain('from Athens 2004 to Paris 2024 use their real hosts and fields');
    for (const h of ['Qatar 2027', 'Los Angeles 2028', 'France 2031', 'Brisbane 2032']) expect(text).toContain(h);
    expect(text).not.toMatch(/\ba \d/);
    const dashes = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
    for (const d of dashes) expect(text.includes(d)).toBe(false);
  });
  it('binds the NBA alone, the gate now and the whole face on demand (Round 1544)', async () => {
    expect(NBA_CAREER_SPORT.intl).toBe(NBA_CAREER_INTL_LAZY);
    expect(await NBA_CAREER_SPORT.intl?.load()).toBe(NBA_CAREER_INTL);
    expect(NFL_CAREER_SPORT.intl).toBeUndefined();
    expect(MLB_CAREER_SPORT.intl).toBeUndefined();
    expect(NHL_CAREER_SPORT.intl).toBeUndefined();
  });
});
