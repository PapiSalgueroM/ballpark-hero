/**
 * Round 946: the procedure behind scripts/data/calDateFixture946.json.
 *
 * Round 946 moves Club Manager's pure date helpers (CalDate, dayOfWeek,
 * daysInMonth, addDays, dateKey, daysBetween, MONTH_NAMES, shortDate) out of
 * src/lib/clubManagerCalendar.ts into src/lib/calDate.ts, so the GM calendar
 * can share them, and clubManagerCalendar.ts re-exports them. This probe
 * records what those helpers and the Club Manager calendar built on them
 * return, so the move can be proved to change nothing:
 *
 *  - every day from 1 January 1990 to 31 December 2060 through the helpers;
 *  - three seeded Club Manager careers in today's world: the kickoff, the
 *    date of every entry, the season's days, every month of the grid at all
 *    three training intensities, the four fast forwards, and a chain of taps
 *    (simToDate) every ten days to the end of the season, each tap's halt,
 *    week and save hash.
 *
 * scripts/recordCalDateFixture946.mjs ran this once against origin/main
 * before anything moved; scripts/simGmCalendar.mjs section 1 replays it
 * against the current tree and compares every hash.
 *
 * `mods` is { cal, cm }: the bundled clubManagerCalendar.ts and clubManager.ts.
 */
import crypto from 'node:crypto';

const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 24);

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Generated ids carry a module level counter; the rest must match byte for byte. */
const ID_SERIAL = /^(msg|pq|youth|sc|pr)-[\w-]+$/;
const norm = v => JSON.stringify(v, (k, x) => {
  if (x instanceof Map) return [...x.entries()];
  return typeof x === 'string' && ID_SERIAL.test(x) ? x.replace(ID_SERIAL, '$1-#') : x;
});

/** One section: the hash of every line, the line count, and a few lines in plain text to debug a mismatch. */
const section = lines => ({ hash: sha(lines.join('\n')), lines: lines.length, head: lines.slice(0, 3), tail: lines.slice(-2) });

export const CAREERS = [['Everton', 'now', 9461], ['Augsburg', 'now', 9462], ['Norwich City', 'now', 9463]];

export function probeCalDate(mods) {
  const { cal, cm } = mods;
  const fmt = d => `${d.y}-${d.m}-${d.d}`;
  const out = {};

  /* ---- the helpers, every day of 71 years ---- */
  const days = [], adds = [], betweens = [];
  const epoch = { y: 2000, m: 1, d: 1 };
  const OFFSETS = [-800, -366, -365, -59, -31, -1, 0, 1, 6, 7, 28, 31, 59, 365, 366, 800];
  let n = 0;
  for (let y = 1990; y <= 2060; y++) {
    for (let m = 1; m <= 12; m++) {
      const dim = cal.daysInMonth(y, m);
      for (let d = 1; d <= dim; d++) {
        const date = { y, m, d };
        days.push(`${fmt(date)} dow${cal.dayOfWeek(y, m, d)} dim${dim} key${cal.dateKey(date)} ${cal.shortDate(date)}`);
        betweens.push(`${fmt(date)} ${cal.daysBetween(epoch, date)} ${cal.daysBetween(date, epoch)}`);
        if (n % 5 === 0) adds.push(`${fmt(date)} ${OFFSETS.map(o => fmt(cal.addDays(date, o))).join(' ')}`);
        n += 1;
      }
    }
  }
  out.days = section(days);
  out.addDays = section(adds);
  out.daysBetween = section(betweens);
  out.monthNames = cal.MONTH_NAMES.join(',');

  /* ---- the Club Manager calendar on top of them ---- */
  const kick = [];
  for (let y = 1990; y <= 2060; y++) kick.push(`${y} ${fmt(cal.seasonKickoff(y))} w10 ${fmt(cal.dateOfWeek(y, 10))}`);
  out.kickoff = section(kick);

  const realDateNow = Date.now;
  Date.now = () => 1757000000000;
  out.careers = [];
  try {
    for (const [club, era, seed] of CAREERS) {
      Math.random = mulberry(seed);
      let s = cm.startCareer(club, era);
      const rec = { club, era, seed };
      const wy = cal.worldYearOf(s);
      const entryDates = cal.dateOfEntries(wy, s.calendar);
      rec.entryDates = section(entryDates.map((d, i) => `${i} ${s.calendar[i].type} ${fmt(d)}`));
      const sd = cal.seasonDays(s);
      rec.seasonDays = section([norm({ ...sd, entryDays: [...sd.entryDays.entries()] })]);
      const grid = [];
      let cur = { y: sd.seasonStart.y, m: sd.seasonStart.m };
      while (cur.y * 100 + cur.m <= sd.seasonEnd.y * 100 + sd.seasonEnd.m) {
        for (const intensity of ['light', 'normal', 'double']) {
          grid.push(`${cur.y}-${cur.m} ${intensity} ${norm(cal.monthGrid(sd, cur.y, cur.m, intensity))}`);
        }
        cur = cur.m === 12 ? { y: cur.y + 1, m: 1 } : { y: cur.y, m: cur.m + 1 };
      }
      rec.monthGrid = section(grid);
      rec.fastForwards = norm(cal.fastForwardTargets(s, sd));

      /* A chain of taps, every ten days from the season's start to its end. */
      const taps = [];
      let date = sd.seasonStart;
      for (let i = 0; i < 40; i++) {
        date = cal.addDays(date, 10);
        const run = cal.simToDate(s, date);
        if (!run) { taps.push(`${fmt(date)} none week${s.week}`); continue; }
        s = run.state;
        taps.push(`${fmt(date)} halt=${run.halt} week${s.week} last=${run.lastReport ? norm(run.lastReport).length : 0} save=${sha(norm(s))}`);
        if (run.halt === 'seasonOver' || run.halt === 'sacked') break;
      }
      rec.taps = section(taps);
      out.careers.push(rec);
    }
  } finally {
    Date.now = realDateNow;
  }
  return out;
}
