/* Round 1593 step A0 probe (never committed). For every league of today's world (REAL_LEAGUES), build the engine's
 * own calendar (buildCalendar with the flags startCareer passes in today's world), find each of the Europa League's
 * 17 watched places (worldCompNights' rule for 'uel'), and place a PARTICIPANT's 17 Thursday nights by the rule of
 * draft 3.6 with the critic's corrections 5 and 6: tried in calendar order from the watched place, never before the
 * night before; slot kinds (gap) a free gap between two Saturday entries, (cl) the day after a Champions League
 * midweek the club does not play, (tail) after the last entry, a week after the previous Europa League night.
 * Prints per league: nights by kind, tail count, first and last night dates, the minimum spacing, and a verdict:
 * FITS when all 17 are placed, every night is a Thursday, the last is on or before 31 May of the season's second
 * year (U7: the real final is in May), and no night shares a day with another entry. Run from the repo root. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'probeA0-'));
const entry = path.join(work, 'entry.ts');
const P = f => JSON.stringify(path.join(ROOT, f).split(path.sep).join('/'));
fs.writeFileSync(entry, [
  `export * as cm from ${P('src/lib/clubManager.ts')};`,
  `export * as cal from ${P('src/lib/clubManagerCalendar.ts')};`,
  `export * as wc from ${P('src/lib/worldCompetition.ts')};`,
  `export * as ea from ${P('src/lib/euroAccess.ts')};`,
  `export * as wn from ${P('src/lib/worldNights.ts')};`,
].join('\n'));
const out = path.join(work, 'bundle.mjs');
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const { cm, cal: C, wc, ea, wn } = await import(pathToFileURL(out).href);

const iso = d => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
const dow = d => C.dayOfWeek(d.y, d.m, d.d);
const day = d => Date.UTC(d.y, d.m - 1, d.d) / 86400000;
const NAMES = ['MD1', 'MD2', 'MD3', 'MD4', 'MD5', 'MD6', 'MD7', 'MD8', 'PO1', 'PO2', 'R16_1', 'R16_2', 'QF1', 'QF2', 'SF1', 'SF2', 'F'];
const uelMarks = [...wc.LEAGUE_PHASE_NIGHT_MARKS.slice(0, 10), ea.UEL_FINAL_MARK];

/** worldCompNights' 'uel' places on a fresh calendar: index `at` the night follows (or is, for an entry). */
function watched(calendar) {
  const leagueAt = [];
  calendar.forEach((e, i) => { if (e.type === 'league') leagueAt.push(i); });
  const rounds = leagueAt.length;
  const blockEnd = r => (r + 1 < rounds ? leagueAt[r + 1] - 1 : calendar.length - 1);
  const roundOf = i => Math.max(0, leagueAt.filter(x => x <= i).length - 1);
  const groupAt = md => calendar.findIndex(e => e.type === 'uclGroup' && e.round === md);
  const marks = wc.leaguePhaseNightRounds(rounds, roundOf(Math.max(0, groupAt(5))), uelMarks);
  const places = [];
  let prev = -1;
  for (let n = 0; n < 17; n += 1) {
    let at;
    if (n < 6) at = groupAt(n);
    else { const r = marks[n - 6]; at = r < rounds ? blockEnd(r) : calendar.length - 1; }
    if (at < prev) at = prev;
    prev = at;
    places.push(at);
  }
  return places;
}

/** Place 17 participant nights; seq holds { type, date, sat, skip, night }. Returns per night { kind, date, gap }. */
function placeUel(calendar, dates, pre = []) {
  const seq = calendar.map((e, i) => ({ type: e.type, date: dates[i], sat: dow(dates[i]) === 6, skip: e.type === 'uclGroup' || e.type === 'uclKo', night: false, orig: i }));
  for (const p of pre.slice().sort((a, b) => b.gap - a.gap)) seq.splice(p.gap, 0, { type: 'oneOff', date: p.date, sat: false, skip: false, night: true, orig: -1 });
  const want = watched(calendar);
  const res = [];
  let floor = 0;
  let lastUel = null;
  for (let n = 0; n < 17; n += 1) {
    const origAt = want[n];
    let from = seq.findIndex(s => s.orig === origAt) + 1;
    from = Math.max(from, floor);
    let got = null;
    for (let g = Math.max(1, from); g < seq.length && !got; g += 1) {
      const b = seq[g - 1];
      const a = seq[g];
      if (b.sat && !b.night && a.sat && !a.night) got = { g, kind: 'gap', date: C.addDays(b.date, 5) };
      else if (b.skip && !b.night && !a.night) got = { g, kind: 'cl', date: C.addDays(b.date, 1) };
    }
    if (!got) {
      const g = seq.length;
      const b = seq[g - 1];
      const date = b.night ? C.addDays(lastUel, 7) : C.addDays(b.date, b.sat ? 5 : 1);
      got = { g, kind: 'tail', date };
    }
    seq.splice(got.g, 0, { type: 'uel', date: got.date, sat: false, skip: false, night: true, orig: -1 });
    floor = got.g + 1;
    lastUel = got.date;
    res.push({ n, kind: got.kind, date: got.date, gap: got.g });
  }
  return { res, seq };
}

const today = cm.REAL_LEAGUES;
const r16 = cm.eraUclHasR16(undefined);
const two = cm.uclLegsFor(undefined, 'QF') === 2;
console.log(`today's world flags: r16=${r16} twoLegKo=${two}; ${today.length} leagues`);
const rows = [];
let stop = 0;
for (const year of [2026, 2027, 2028]) {
  for (const lg of today) {
    const cup = lg.cupName !== null;
    const calendar = cm.buildCalendar(lg.clubs.length, r16, two, cup);
    const dates = C.dateOfEntries(year, calendar, null);
    const variants = [['plain', []]];
    /* The participant of all three in one season: the domestic super cup ('open') and the UEFA Super Cup
       ('dated', 12 August) placed first by the engine's own placer, sequentially, then the Europa League. */
    const ds = wn.placeNights(calendar, dates, [{ place: 'open' }]);
    const withDs = calendar.slice(); if (ds[0] !== null) withDs.splice(ds[0], 0, { type: 'oneOff' });
    const dsDates = C.dateOfEntries(year, withDs, null);
    const us = wn.placeNights(withDs, dsDates, [{ place: 'dated', on: { y: year, m: 8, d: 12 } }]);
    const pre = [];
    if (ds[0] !== null) pre.push({ gap: ds[0], date: wn.nightDateAt(dates, ds[0]) });
    if (us[0] !== null) {
      const ug = us[0];
      pre.push({ gap: ug, date: wn.nightDateAt(dsDates, us[0]) });
    }
    variants.push(['supercups', pre]);
    for (const [vname, pv] of variants) {
      const { res, seq } = placeUel(calendar, dates, pv);
      const kinds = { gap: 0, cl: 0, tail: 0 };
      for (const r of res) kinds[r.kind] += 1;
      const notThu = res.filter(r => dow(r.date) !== 4).length;
      const last = res[16].date;
      const capOk = iso(last) <= `${year + 1}-05-31`;
      let clash = 0;
      let minGap = Infinity;
      for (let i = 0; i < seq.length; i += 1) {
        if (seq[i].type !== 'uel') continue;
        for (let j = 0; j < seq.length; j += 1) if (j !== i && iso(seq[j].date) === iso(seq[i].date)) clash += 1;
      }
      for (let i = 1; i < 17; i += 1) minGap = Math.min(minGap, day(res[i].date) - day(res[i - 1].date));
      const lastEntry = dates[dates.length - 1];
      const fits = notThu === 0 && clash === 0 && (kinds.tail === 0 || capOk);
      if (!fits) stop += 1;
      rows.push({ year, id: lg.id, size: lg.clubs.length, cup, euro: lg.euro, v: vname, ...kinds, first: iso(res[0].date), last: iso(last), seasonEnd: iso(lastEntry), minGap, notThu, clash, fits });
      if (year === 2026 && vname === 'plain' && (lg.clubs.length <= 12 || lg.id === 'premier')) {
        console.log(`  ${lg.id} (${lg.clubs.length}) nights: ${res.map(r => `${NAMES[r.n]}=${r.kind}:${iso(r.date).slice(5)}`).join(' ')}`);
      }
    }
  }
}
console.log('year id size cup euro variant | gap cl tail | first last seasonEnd minGapDays notThu clash FITS');
for (const r of rows) console.log(`${r.year} ${r.id} ${r.size} ${r.cup ? 'cup' : 'nocup'} ${r.euro ? 'euro' : '-'} ${r.v} | ${r.gap} ${r.cl} ${r.tail} | ${r.first} ${r.last} ${r.seasonEnd} ${r.minGap} ${r.notThu} ${r.clash} ${r.fits ? 'FITS' : 'NO'}`);
const bySize = {};
for (const r of rows) { const k = `${r.size}/${r.cup ? 'cup' : 'nocup'}/${r.v}`; const b = bySize[k] ??= { tail: new Set(), last: '' }; b.tail.add(r.tail); if (r.last > b.last) b.last = r.last; }
console.log('by size: ' + Object.entries(bySize).map(([k, b]) => `${k} tail=${[...b.tail].join('/')} latest=${b.last}`).join('; '));
console.log(`probeA0: ${rows.length} rows, ${stop} do not fit -> ${stop ? 'STOP' : 'all fit'}`);
