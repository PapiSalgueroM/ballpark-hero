/* Round 1510: the shared night placer (worldNights.ts) on calendars built by hand, dated by a copy of the drawing
 * rule written out here (league and window entries on Saturdays, anything else the Wednesday after a Saturday or a
 * week after another midweek). Every expected index is written out. Then the placer on the ENGINE's own calendars
 * (the lead's decision 2f, the critic's correction 12): buildCalendar at every league size REAL_LEAGUES and
 * ERA_LEAGUES hold, with and without a cup, a round of 16 and two legs, dated by the engine's own dateOfEntries in
 * every world year the game plays, and the late 2020 seasons (every LEAGUE_RULES row with a lateStart, its plan). */
import { describe, expect, it } from 'vitest';
import { addDays, dayOfWeek } from './calDate';
import type { CalDate } from './calDate';
import { ERA_LEAGUES, LEAGUE_RULES, REAL_LEAGUES, buildCalendar } from './clubManager';
import { dateOfEntries } from './clubManagerCalendar';
import type { SeasonPlan } from './clubManagerCalendar';
import { nightDateAt, nightsDoneAt, placeNights, tickingWeeksDone, tickingWeeksIn, tickingWeeksLeft } from './worldNights';
import type { NightWant, ThursdayKind } from './worldNights';
import { oneOffNightsOf } from './worldOneOffs';
import { LEAGUE_PHASE_NIGHT_MARKS, leaguePhaseNightRounds } from './worldCompetition';
import { UEL_FINAL_MARK } from './euroAccess';

const KICKOFF: CalDate = { y: 2026, m: 8, d: 8 };
/** The drawing rule, from the opening Saturday, with `mid` the indexes of league rounds played on a Wednesday. */
function draw(types: { type: string }[], mid: ReadonlySet<number> = new Set()): CalDate[] {
  const out: CalDate[] = [];
  let last = addDays(KICKOFF, -7);
  types.forEach((e, i) => {
    const sat = (e.type === 'league' && !mid.has(i)) || e.type === 'window';
    if (sat) {
      let next = addDays(last, 1);
      next = addDays(next, (6 - dayOfWeek(next.y, next.m, next.d) + 7) % 7);
      out.push(next);
      last = next;
    } else {
      const next = addDays(last, dayOfWeek(last.y, last.m, last.d) === 6 ? 4 : 7);
      out.push(next);
      last = next;
    }
  });
  return out;
}
const cal = (s: string): { type: string }[] => s.split(' ').map(c => ({ type: ({ L: 'league', U: 'uclGroup', W: 'window', C: 'cup', K: 'uclKo' } as Record<string, string>)[c] }));
const iso = (d: CalDate | null) => (d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : null);

describe('placeNights', () => {
  const A = cal('L L U L L W L L C L');
  it('open is the gap before the opening Saturday, early the first Saturday gap after the first league entry', () => {
    expect(placeNights(A, draw(A), [{ place: 'open' }])).toEqual([0]);
    expect(placeNights(A, draw(A), [{ place: 'early' }])).toEqual([1]);
    const B = cal('L U L L');
    expect(placeNights(B, draw(B), [{ place: 'early' }])).toEqual([3]);
  });
  it('newYear is the first Saturday gap from the window on, and a final a league entry after its semi finals', () => {
    expect(placeNights(A, draw(A), [{ place: 'newYear' }])).toEqual([6]);
    expect(placeNights(A, draw(A), [{ place: 'newYear' }, { place: 'newYear', afterLeague: 1 }])).toEqual([6, 7]);
  });
  it('two nights never share a gap, and a night with no gap is null', () => {
    expect(placeNights(A, draw(A), [{ place: 'open' }, { place: 'open' }])).toEqual([0, null]);
    expect(placeNights(A, draw(A), [{ place: 'early' }, { place: 'early' }])).toEqual([1, 4]);
    expect(placeNights(A, draw(A), [{ place: 'open' }, { place: 'early' }])).toEqual([0, 1]);
    const C = cal('L U L U L');
    expect(placeNights(C, draw(C), [{ place: 'early' }])).toEqual([5]);
    const D = cal('U L');
    expect(placeNights(D, draw(D), [{ place: 'open' }])).toEqual([null]);
  });
  it('reads dates, not types: a league round drawn on a Wednesday is no Saturday', () => {
    const late = draw(A, new Set([1]));
    expect(iso(late[1])).toBe('2026-08-12');
    expect(placeNights(A, late, [{ place: 'early' }])).toEqual([4]);
  });
  it('takes no gap that would move a date when the caller can redraw the calendar', () => {
    const moving = (types: { type: string }[]) => { const d = draw(types); return types[1]?.type === 'night' ? d.map(x => addDays(x, 7)) : d; };
    expect(placeNights(A, draw(A), [{ place: 'early' }], moving)).toEqual([4]);
    expect(placeNights(A, draw(A), [{ place: 'early' }], t => draw(t))).toEqual([1]);
  });
  it('an entry spliced at the slot is drawn on the date nightDateAt gives, and no other entry moves', () => {
    for (const [want, s] of [['open', 0], ['early', 1], ['newYear', 6]] as const) {
      const dates = draw(A);
      const [slot] = placeNights(A, dates, [{ place: want }]);
      expect(slot).toBe(s);
      const withIt = [...A];
      withIt.splice(s, 0, { type: 'oneOff' });
      const redrawn = draw(withIt);
      expect(iso(redrawn[s])).toBe(iso(nightDateAt(dates, s)));
      expect(redrawn.filter((_, i) => i !== s).map(iso)).toEqual(dates.map(iso));
    }
    expect(iso(nightDateAt(draw(A), 0))).toBe('2026-08-05');
    expect(iso(nightDateAt(draw(A), 1))).toBe('2026-08-12');
  });
});

describe('nightsDoneAt', () => {
  it('a night before entry s is played once the week reaches s; a whole season plays every night; seen holds', () => {
    expect(nightsDoneAt(0, 40, [0])).toBe(1);
    expect(nightsDoneAt(4, 40, [5, 8])).toBe(0);
    expect(nightsDoneAt(5, 40, [5, 8])).toBe(1);
    expect(nightsDoneAt(8, 40, [5, 8])).toBe(2);
    expect(nightsDoneAt(40, 40, [5, null])).toBe(2);
    expect(nightsDoneAt(4, 40, [5, 8], 1)).toBe(1);
    expect(nightsDoneAt(4, 40, [5, 8], 9)).toBe(2);
  });
});

/* Fix-1510 (read lens, major C): the placer on every calendar the engine can build. For each calendar, world year
   and late plan, and each shape and place a row can have (a one match cup open, early or in the new year, a two
   legged one, a four club one early or in the new year, and two keys in one list), the night entries spliced at the
   slots the way insertOneOffNights does are redrawn by the engine's dateOfEntries: every other entry keeps its date,
   each night is drawn on the Wednesday nightDateAt gives a watcher, three days or more from both neighbours, the
   nights are in the order wanted and never two in one gap, and every night finds a slot. A four club cup played
   before the season ('open') is not a shape any row has: its final would need a second gap before the opener. */
describe('placeNights on the engine calendars', () => {
  const eraYears = Object.keys(ERA_LEAGUES).map(e => Number(e.replace(/\D/g, ''))).filter(y => y > 1990);
  const years = [...new Set([2026, 2027, 2028, ...eraYears.flatMap(y => [y, y + 1])])];
  const sizes = [...new Set([...REAL_LEAGUES, ...Object.values(ERA_LEAGUES).flat()].map(l => l.clubs.length))].sort((a, b) => a - b);
  const one = (place: 'open' | 'early' | 'newYear') => oneOffNightsOf({ shape: 'one', place });
  const four = (place: 'early' | 'newYear') => oneOffNightsOf({ shape: 'four', place });
  const WANTS: [string, NightWant[]][] = [
    ['one open', one('open')], ['one early', one('early')], ['one newYear', one('newYear')],
    ['two', oneOffNightsOf({ shape: 'two', place: 'open' })], ['four early', four('early')], ['four newYear', four('newYear')],
    ['one early and four newYear', [...one('early'), ...four('newYear')]],
  ];
  const FLAGS = [true, false].flatMap(cup => [false, true].flatMap(r16 => [false, true].map(two => ({ cup, r16, two }))));
  let placed = 0;
  function check(tag: string, cal: { type: string }[], year: number, plan: SeasonPlan | null): void {
    const dates = dateOfEntries(year, cal, plan);
    const redate = (types: { type: string }[]) => dateOfEntries(year, types, plan);
    for (const [name, wants] of WANTS) {
      const where = `${tag} ${name}`;
      const slots = placeNights(cal, dates, wants, redate);
      expect(slots.every(s => s !== null), `${where}: a night with no slot (${slots.join(',')})`).toBe(true);
      const at = slots as number[];
      for (let i = 1; i < at.length; i += 1) expect(at[i] > at[i - 1], `${where}: slots ${at.join(',')} out of order or two in one gap`).toBe(true);
      const withIt: { type: string; n?: number }[] = cal.map(e => ({ type: e.type }));
      for (const { s, n } of at.map((s, n) => ({ s, n })).sort((a, b) => b.s - a.s || b.n - a.n)) withIt.splice(s, 0, { type: 'oneOff', n });
      const drawn = dateOfEntries(year, withIt, plan);
      expect(drawn.filter((_, i) => withIt[i].type !== 'oneOff').map(iso), `${where}: an entry moved`).toEqual(dates.map(iso));
      const day = (d: CalDate) => Date.UTC(d.y, d.m - 1, d.d) / 86400000;
      withIt.forEach((e, i) => {
        if (e.type !== 'oneOff') return;
        const d = drawn[i];
        expect(iso(d), `${where}: night ${e.n} is not on nightDateAt's date`).toBe(iso(nightDateAt(dates, at[e.n as number])));
        expect(dayOfWeek(d.y, d.m, d.d), `${where}: night ${e.n} on ${iso(d)} is no Wednesday`).toBe(3);
        if (i > 0) expect(day(d) - day(drawn[i - 1]) >= 3, `${where}: night ${e.n} ${iso(d)} after ${iso(drawn[i - 1])}`).toBe(true);
        if (i + 1 < drawn.length) expect(day(drawn[i + 1]) - day(d) >= 3, `${where}: night ${e.n} ${iso(d)} before ${iso(drawn[i + 1])}`).toBe(true);
      });
      placed += 1;
    }
  }
  it('finds a slot that moves no date on every league size, with and without a cup, a round of 16 and two legs, in every year', () => {
    expect(sizes.length).toBeGreaterThan(3);
    for (const size of sizes) for (const f of FLAGS) for (const y of years) check(`${size} clubs ${JSON.stringify(f)} ${y}`, buildCalendar(size, f.r16, f.two, f.cup), y, null);
    expect(placed).toBe(sizes.length * FLAGS.length * years.length * WANTS.length);
  });
  it('does the same on the late seasons of 2020, each with its own plan', () => {
    const late = Object.entries(LEAGUE_RULES).flatMap(([id, r]) => (r.lateStart ? [{ id, plan: { kickoff: r.lateStart.kickoff, summerClose: r.lateStart.summerClose } }] : []));
    expect(late.length).toBeGreaterThanOrEqual(4);
    const before = placed;
    for (const { id, plan } of late) {
      const size = Object.values(ERA_LEAGUES).flat().find(l => l.id === id)?.clubs.length ?? REAL_LEAGUES.find(l => l.id === id)?.clubs.length;
      expect(size, `${id}: no league of that id`).toBeTruthy();
      for (const f of FLAGS) check(`${id} late ${JSON.stringify(f)}`, buildCalendar(size as number, f.r16, f.two, f.cup), plan.kickoff.y, plan);
    }
    expect(placed - before).toBe(late.length * FLAGS.length * WANTS.length);
  });
});

describe('Round 1514: a dated night', () => {
  const A = cal('L L U L L W L L C L');
  it('takes the free midweek nearest its date, the earlier on a tie, and none without a date', () => {
    /* A's free gaps date their nights 12 Aug (gap 1), 26 Aug (4), 2 Sep (5), 9 Sep (6), 16 Sep (7) and 30 Sep (10). */
    expect(placeNights(A, draw(A), [{ place: 'dated', on: { y: 2026, m: 9, d: 10 } }])).toEqual([6]);
    expect(placeNights(A, draw(A), [{ place: 'dated', on: { y: 2026, m: 8, d: 20 } }])).toEqual([4]);
    expect(placeNights(A, draw(A), [{ place: 'dated', on: { y: 2026, m: 8, d: 19 } }])).toEqual([1]);
    expect(placeNights(A, draw(A), [{ place: 'dated' }])).toEqual([null]);
    expect(iso(nightDateAt(draw(A), 6))).toBe('2026-09-09');
  });
  it('never shares a gap with a night placed before it', () => {
    expect(placeNights(A, draw(A), [{ place: 'early' }, { place: 'dated', on: { y: 2026, m: 8, d: 13 } }])).toEqual([1, 4]);
  });
});

/* Round 1593 (decision 6): the weeks a season charges. With no night they are the raw length's numbers at every
   week; a night is counted by none of them; on the engine's calendars of every league size the same holds. */
describe('tickingWeeks', () => {
  it('equals the raw length on a calendar with no night, at every week', () => {
    for (const size of [10, 12, 18, 20, 24]) {
      const c = buildCalendar(size, false, true, true);
      expect(tickingWeeksIn(c)).toBe(c.length);
      for (let w = 0; w <= c.length; w += 1) {
        expect(tickingWeeksDone(c, w)).toBe(w);
        expect(tickingWeeksLeft(c, w)).toBe(c.length - w);
      }
    }
  });
  it('never counts a night', () => {
    const c: { type: string; night?: { k: string; n: number } }[] = [
      { type: 'league' }, { type: 'oneOff', night: { k: 'dsc', n: 0 } }, { type: 'league' }, { type: 'uel', night: { k: 'uel', n: 0 } }, { type: 'league' },
    ];
    expect(tickingWeeksIn(c)).toBe(3);
    expect([0, 1, 2, 3, 4, 5].map(w => tickingWeeksDone(c, w))).toEqual([0, 1, 1, 2, 2, 3]);
    expect([0, 1, 2, 3, 4, 5].map(w => tickingWeeksLeft(c, w))).toEqual([3, 2, 2, 1, 1, 0]);
    expect(tickingWeeksLeft(c, 9)).toBe(0);
  });
});

/* Round 1593 (step A2, the critic's corrections 5 and 6): a participant's seventeen Europa League nights placed on
   the engine's own calendar of every league size of today's world. Each night is wanted after the entry its watched
   night follows (worldCompNights' rule for 'uel', written out here) and takes a free Saturday gap, the day after a
   Champions League week the club does not play, or the tail. The tail counts are step A0's table. */
describe('Thursday nights on the engine calendars', () => {
  const uelMarks = [...LEAGUE_PHASE_NIGHT_MARKS.slice(0, 10), UEL_FINAL_MARK];
  const watched = (c: { type: string; round: number }[]): number[] => {
    const leagueAt = c.flatMap((e, i) => (e.type === 'league' ? [i] : []));
    const rounds = leagueAt.length;
    const blockEnd = (r: number) => (r + 1 < rounds ? leagueAt[r + 1] - 1 : c.length - 1);
    const roundOf = (i: number) => Math.max(0, leagueAt.filter(x => x <= i).length - 1);
    const groupAt = (md: number) => c.findIndex(e => e.type === 'uclGroup' && e.round === md);
    const marks = leaguePhaseNightRounds(rounds, roundOf(Math.max(0, groupAt(5))), uelMarks);
    let prev = -1;
    return Array.from({ length: 17 }, (_, n) => {
      const r = n < 6 ? groupAt(n) : marks[n - 6] < rounds ? blockEnd(marks[n - 6]) : c.length - 1;
      prev = Math.max(prev, r);
      return prev;
    });
  };
  const TAIL: Record<string, number> = { '10': 5, '12': 3, '14': 2, '15': 1, '16': 1, '18': 1, '18nocup': 0, '20': 0, '24': 0 };
  const day = (d: CalDate) => Date.UTC(d.y, d.m - 1, d.d) / 86400000;
  it('places all seventeen on a Thursday, in order, never before the watched night, and moves no other date', () => {
    const seen = new Set<string>();
    for (const lg of REAL_LEAGUES) for (const year of [2026, 2027, 2028]) {
      const cup = lg.cupName !== null;
      const c = buildCalendar(lg.clubs.length, false, true, cup);
      const dates = dateOfEntries(year, c, null);
      const after = watched(c);
      const skip = new Set(c.flatMap((e, i) => (e.type === 'uclGroup' || e.type === 'uclKo' ? [i] : [])));
      const kinds: (ThursdayKind | null)[] = [];
      const slots = placeNights(c, dates, after.map(a => ({ place: 'thursday' as const, after: a })), t => dateOfEntries(year, t, null), skip, kinds);
      const tag = `${lg.id} ${year}`;
      expect(slots.every(s => s !== null), tag).toBe(true);
      const withIt: { type: string; n?: number; i?: number }[] = c.map((e, i) => ({ type: e.type, i }));
      for (const { s, n } of (slots as number[]).map((s, n) => ({ s, n })).sort((a, b) => b.s - a.s || b.n - a.n)) withIt.splice(s, 0, { type: 'uel', n });
      const drawn = dateOfEntries(year, withIt, null);
      expect(drawn.filter((_, i) => withIt[i].type !== 'uel').map(iso), `${tag}: an entry moved`).toEqual(dates.map(iso));
      const nights = withIt.flatMap((e, i) => (e.type === 'uel' ? [{ n: e.n as number, at: i, d: drawn[i] }] : []));
      expect(nights.map(x => x.n), `${tag}: out of order`).toEqual(Array.from({ length: 17 }, (_, n) => n));
      nights.forEach((x, k) => {
        expect(dayOfWeek(x.d.y, x.d.m, x.d.d), `${tag}: night ${x.n} on ${iso(x.d)}`).toBe(4);
        expect(drawn.filter((d, i) => i !== x.at && iso(d) === iso(x.d)).length, `${tag}: night ${x.n} shares ${iso(x.d)}`).toBe(0);
        if (k > 0) expect(day(x.d) - day(nights[k - 1].d) >= 7, `${tag}: night ${x.n} ${iso(x.d)} too close`).toBe(true);
        const watchedAt = withIt.findIndex(e => e.i === after[x.n]);
        expect(x.at > watchedAt, `${tag}: night ${x.n} before its watched night`).toBe(true);
      });
      const tail = kinds.filter(k => k === 'tail').length;
      const key = `${lg.clubs.length}${cup ? '' : 'nocup'}`;
      expect(tail, `${tag}: tail nights`).toBe(TAIL[key]);
      if (tail) expect(iso(nights[16].d) <= `${year + 1}-05-31`, `${tag}: the final ${iso(nights[16].d)} runs past May`).toBe(true);
      seen.add(key);
    }
    expect([...seen].sort()).toEqual(Object.keys(TAIL).sort());
  });
  it('dates a tail night a week after a night drawn the day after a midweek, and never moves last', () => {
    const c = cal('L U L U');
    const dates = dateOfEntries(2026, c, null);
    const slots = placeNights(c, dates, [{ place: 'thursday', after: 3 }, { place: 'thursday', after: 3 }], undefined, new Set([1, 3]));
    expect(slots).toEqual([4, 4]);
    const withIt = [...c, { type: 'uel' }, { type: 'uel' }];
    const drawn = dateOfEntries(2026, withIt, null);
    expect(drawn.slice(0, 4).map(iso)).toEqual(dates.map(iso));
    expect(iso(drawn[4])).toBe(iso(addDays(dates[3], 1)));
    expect(iso(drawn[5])).toBe(iso(addDays(dates[3], 8)));
    const mid = [c[0], c[1], { type: 'uel' }, c[2], c[3]];
    const d2 = dateOfEntries(2026, mid, null);
    expect([d2[0], d2[1], d2[3], d2[4]].map(iso)).toEqual(dates.map(iso));
    expect(dayOfWeek(d2[2].y, d2[2].m, d2[2].d)).toBe(4);
  });
});
