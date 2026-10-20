/**
 * Round 1510: the shared pieces of a participant's NIGHT, a match only a participant's calendar holds, backed by a
 * slice of CareerState.worldComps. One mechanism for every such competition (the lead's decision 2a): the calendar
 * entry carries `night: NightRef` (the slice's key and the night's index), the participant's own results are a
 * `Record<number, NightResult>` in the slice by fixture index, and ONE placer puts every night of every key on the
 * calendar so no two midweeks ever share a gap. Its first binder is the domestic super cup (worldComps.dsc,
 * src/lib/worldOneOffs.ts); its second is the Europa League's participant half (a round after 1509), which adds its
 * own entry type and binds the rest.
 *
 * Pure: no clock, nothing from Math.random, nothing from the engine.
 */
import { addDays, dayOfWeek, daysBetween } from '@/lib/calDate';
import type { CalDate } from '@/lib/calDate';

/** A calendar entry's night: the worldComps key and the night's index in that slice. */
export interface NightRef { k: string; n: number }

/** A participant's own result of one fixture, in the fixture's own orientation (home first): the goals after any
 *  extra time, `et` when extra time was played, and `pens` the side that won the shootout. */
export interface NightResult { h: number; a: number; et?: 1; pens?: 'h' | 'a' }

/** Where a night wants to sit in the season: before the opening Saturday, in the first free midweek after the first
 *  league entry, or in the first free midweek from the window entry on. `afterLeague` starts the search that many
 *  league entries after the night placed just before it in the same list (a final after its semi finals). */
export type NightPlace = 'open' | 'early' | 'newYear' | 'dated';
/** Round 1514: 'dated' takes the free gap whose night date (nightDateAt) is nearest `on`, the earlier on a tie, and
 *  none without `on`. */
export interface NightWant { place: NightPlace; afterLeague?: number; on?: CalDate }

const saturday = (d: CalDate | undefined): boolean => !!d && dayOfWeek(d.y, d.m, d.d) === 6;

interface Slot { type: string; sat: boolean; night: boolean }

/**
 * The index each wanted night goes BEFORE in `calendar` as it stands (the count of its entries before the night),
 * or null when the season has no gap for it. A night is a midweek: it may sit only in a gap whose two sides are
 * Saturday entries by DATE (entryDatesOf's days, so a late season's Wednesday league round is not a Saturday), so
 * the drawing rule dates it the Wednesday after the first and no later entry moves (a midweek after a midweek pushes
 * every later date a week). The gap before the opening Saturday is the 'open' one (its night is the Wednesday
 * before). Nights placed earlier in the list count as midweeks for the later ones, so two never share a gap, across
 * every key when the caller hands every key's wants in one list. `redate`, when given, draws the dates of a calendar
 * of types, and a gap is taken only if every entry keeps its date with the nights inserted (a late season chooses
 * its midweek league rounds by their neighbours). Indexes come back in the order wanted.
 */
export function placeNights(
  calendar: readonly { type: string }[], dates: readonly CalDate[], wants: readonly NightWant[],
  redate?: (types: { type: string }[]) => CalDate[],
): (number | null)[] {
  const seq: Slot[] = calendar.map((e, i) => ({ type: e.type, sat: saturday(dates[i]), night: false }));
  const out: (number | null)[] = [];
  let last = -1;
  const keepsDates = (gap: number): boolean => {
    if (!redate) return true;
    const types = seq.map(s => ({ type: s.night ? 'night' : s.type }));
    types.splice(gap, 0, { type: 'night' });
    const drawn = redate(types);
    let j = 0;
    for (let i = 0; i < types.length; i += 1) {
      if (types[i].type === 'night') continue;
      const want = dates[j];
      const got = drawn[i];
      if (!want || !got || want.y !== got.y || want.m !== got.m || want.d !== got.d) return false;
      j += 1;
    }
    return true;
  };
  const free = (gap: number): boolean => {
    const before = seq[gap - 1];
    const after = seq[gap];
    if (gap === 0) return !!after && after.sat && keepsDates(0);
    return !!before && before.sat && !before.night && (!after || (after.sat && !after.night)) && keepsDates(gap);
  };
  for (const want of wants) {
    let from: number;
    if (want.place === 'open') from = 0;
    else {
      const anchor = want.place === 'early' ? seq.findIndex(s => s.type === 'league') : seq.findIndex(s => s.type === 'window');
      from = anchor < 0 ? seq.length + 1 : anchor + 1;
    }
    if (want.afterLeague && last >= 0) {
      let p = last;
      let seen = 0;
      while (p < seq.length && seen < want.afterLeague) { if (seq[p].type === 'league') seen += 1; p += 1; }
      from = Math.max(from, seen < want.afterLeague ? seq.length + 1 : p);
    }
    let gap: number | null = null;
    if (want.place === 'open') gap = free(0) ? 0 : null;
    else if (want.place === 'dated') {
      /* Round 1514: the nearest free midweek to the edition's date, a gap tried only when it would be nearer. */
      let best = Infinity;
      for (let g = 1; want.on && g <= seq.length; g += 1) {
        const d = nightDateAt(dates, g - seq.slice(0, g).filter(s => s.night).length);
        const off = d ? Math.abs(daysBetween(d, want.on)) : Infinity;
        if (off < best && free(g)) { best = off; gap = g; }
      }
    } else for (let g = from; g <= seq.length; g += 1) if (free(g)) { gap = g; break; }
    if (gap === null) { out.push(null); continue; }
    seq.splice(gap, 0, { type: 'night', sat: false, night: true });
    last = gap + 1;
    out.push(gap - seq.slice(0, gap).filter(s => s.night).length);
  }
  return out;
}

/** The date a night at `slot` is drawn on: the Wednesday after the Saturday entry before it, or the Wednesday
 *  before the opening Saturday for slot 0 (the drawing rule of clubManagerCalendar.ts, worked out without an entry,
 *  so a watcher's night and a participant's entry at the same slot share one date). Null past the dates. */
export function nightDateAt(dates: readonly CalDate[], slot: number): CalDate | null {
  if (slot === 0) return dates[0] ? addDays(dates[0], -3) : null;
  const before = dates[slot - 1];
  return before ? addDays(before, 4) : null;
}

/** How many of a watched season's nights the save has passed: a night sits before calendar entry `slot`, so it is
 *  played once every entry before it has been (`week >= slot`), and a whole season counts every night. A prefix,
 *  and never fewer than `seen`, the nights shown before a mid season move. A participant's own night entry at index
 *  i is passed once its week is played, so its caller hands i + 1 (Club Manager's oneOffNightsDone). */
export function nightsDoneAt(week: number, calendarLength: number, slots: readonly (number | null)[], seen = 0): number {
  let n = 0;
  if (week >= calendarLength) n = slots.length;
  else while (n < slots.length && slots[n] !== null && week >= (slots[n] as number)) n += 1;
  return Math.max(n, Math.min(seen, slots.length));
}
