// Run getPollDayET exactly as shipped at a commit, at fixed instants, with a faked Date.
import { execFileSync } from 'node:child_process';
const [repo, sha] = process.argv.slice(2);
const src = execFileSync('git', ['-C', repo, 'show', `${sha}:src/lib/dateUtils.ts`], { encoding: 'utf8' });
const start = src.indexOf('export function getPollDayET');
let depth = 0, end = -1;
for (let i = src.indexOf('{', start); i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const body = src.slice(start, end).replace('export ', '').replace('(): string', '()');
const RealDate = Date;
let fixed = 0;
class FakeDate extends RealDate {
  constructor(...a) { if (a.length === 0) super(fixed); else super(...a); }
  static now() { return fixed; }
}
const fn = new Function('Date', body + '\nreturn getPollDayET;')(FakeDate);
const etFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' });
// expected: Eastern date of the instant, minus one day when the Eastern hour is before 12
const expected = ms => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new RealDate(ms)).map(x => [x.type, x.value]));
  const d = new RealDate(RealDate.UTC(+p.year, +p.month - 1, +p.day));
  if (+p.hour < 12) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};
const cases = [
  // 2026-11-01: EDT until 02:00, then EST (UTC-5). Noon EST = 17:00Z.
  '2026-11-01T04:00:00Z', '2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z', '2026-11-01T15:59:00Z', '2026-11-01T16:00:00Z', '2026-11-01T16:59:00Z', '2026-11-01T17:00:00Z', '2026-11-01T17:01:00Z',
  '2026-10-31T15:59:00Z', '2026-10-31T16:00:00Z', '2026-11-02T05:00:00Z', '2026-11-02T16:59:00Z', '2026-11-02T17:00:00Z',
  // 2027-03-14: EST until 02:00, then EDT (UTC-4). Noon EDT = 16:00Z.
  '2027-03-14T05:00:00Z', '2027-03-14T15:59:00Z', '2027-03-14T16:00:00Z', '2027-03-14T16:01:00Z', '2027-03-14T16:59:00Z', '2027-03-14T17:00:00Z',
  '2027-03-13T16:59:00Z', '2027-03-13T17:00:00Z', '2027-03-15T04:00:00Z', '2027-03-15T15:59:00Z', '2027-03-15T16:00:00Z',
  // month and year edges, leap day
  '2027-01-01T05:00:00Z', '2027-01-01T16:59:00Z', '2027-01-01T17:00:00Z', '2028-03-01T16:59:00Z', '2028-03-01T17:00:00Z',
];
let bad = 0;
for (const c of cases) {
  fixed = RealDate.parse(c);
  const got = fn(), want = expected(fixed);
  if (got !== want) bad++;
  console.log(c, 'ET', etFmt.format(new RealDate(fixed)), 'got', got, 'want', want, got === want ? 'ok' : 'WRONG');
}
// a sweep: every minute for three days around each change
for (const [from, days] of [['2026-10-31T00:00:00Z', 3], ['2027-03-13T00:00:00Z', 3]]) {
  const t0 = RealDate.parse(from);
  for (let m = 0; m < days * 1440; m++) { fixed = t0 + m * 60000; if (fn() !== expected(fixed)) bad++; }
}
console.log(sha.slice(0, 9), 'node', process.version, 'wrong', bad);
