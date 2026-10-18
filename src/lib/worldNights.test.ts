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
import { nightDateAt, nightsDoneAt, placeNights } from './worldNights';
import type { NightWant } from './worldNights';
import { oneOffNightsOf } from './worldOneOffs';

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
