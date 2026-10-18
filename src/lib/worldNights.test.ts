/* Round 1510: the shared night placer (worldNights.ts) on calendars built by hand, dated by a copy of the drawing
 * rule written out here (league and window entries on Saturdays, anything else the Wednesday after a Saturday or a
 * week after another midweek). Every expected index is written out. The placer on the engine's own calendars, every
 * league size and the late seasons of 2020, is the S2 half of this file's work (simOneOffCups section 2 and the
 * engine's export of buildCalendar). */
import { describe, expect, it } from 'vitest';
import { addDays, dayOfWeek } from './calDate';
import type { CalDate } from './calDate';
import { nightDateAt, nightsDoneAt, placeNights } from './worldNights';

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
