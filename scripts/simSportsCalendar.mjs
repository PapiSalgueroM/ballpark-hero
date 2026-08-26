/**
 * Round 258 harness (number 108): the real world lines in the ticker.
 *
 * Owner ask: "For the ticker I want real life events going on." Putting real
 * sport on the strip means putting CLAIMS ABOUT THE WORLD on every page of
 * the site, which is a different kind of risk from everything else the ticker
 * carries. Every other line is derived from the visitor's own save or from
 * the game registry and cannot be wrong; these can. So this file is stricter
 * than the feature is big.
 *
 *   1. THE ENTRIES ARE WELL FORMED. Real ISO dates, end never before start,
 *      unique never reused ids, a real emoji, and a link to a route that
 *      actually exists in App.tsx. A ticker line pointing at a 404 is worse
 *      than no ticker line.
 *   2. TWO SOURCES, ALWAYS, AND DIFFERENT ONES. Every entry carries exactly
 *      two source URLs on two DIFFERENT hosts. One source is how a wrong
 *      date gets in; two copies of the same site is one source wearing a
 *      hat.
 *   3. IT STATES FACTS, NOT RESULTS OR GUESSES. No entry may contain a
 *      score, a prediction, a superlative or a quote. The strip says what is
 *      scheduled, and the games are where opinions live.
 *   4. IT FAILS CLOSED AS IT AGES, and this is the part that matters most,
 *      because the file is kept by hand and hands stop. Driven at simulated
 *      dates from before the first entry to long after the last: the count
 *      shown never exceeds the cap, an event is never shown after it has
 *      finished, and once the calendar is exhausted the ticker returns to
 *      exactly the lines it had before this feature existed. Silence, not a
 *      stale date.
 *   5. THE PHRASING IS RIGHT ON EVERY DAY OF THE RUN UP. "today", "tomorrow",
 *      a weekday inside the week, "in N days" beyond it, and "on now" for a
 *      tournament already under way. Checked day by day against the same
 *      dates, not spot checked.
 *   6. IT NEVER REACHES A SNAPSHOT. The prerenderer strips
 *      data-no-prerender, and the ticker sets it on exactly these lines. Both
 *      halves are asserted here by reading the source, and simPrerender does
 *      the other half by reading the shipped files.
 *
 * Run: node scripts/simSportsCalendar.mjs
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = '/tmp/calendar-bundle.mjs';
const ENTRY = '/tmp/calendar-entry.mjs';

writeFileSync(ENTRY, `
export * from '${ROOT}/src/data/sportsCalendar.ts';
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: OUT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const cal = await import(pathToFileURL(OUT).href);
const { SPORTS_EVENTS, upcomingEvents, whenPhrase } = cal;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const at = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12, 0, 0); };

/* ── 1: well formed ───────────────────────────────────────────────────── */
console.log(`1) ${SPORTS_EVENTS.length} entries, shape and links`);
const routes = new Set(
  [...readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8').matchAll(/path="([^"]+)"/g)].map(m => m[1]),
);
const ids = new Set();
for (const ev of SPORTS_EVENTS) {
  const tag = ev.id || '(no id)';
  if (!ev.id || ids.has(ev.id)) fail(`${tag}: missing or duplicate id`);
  ids.add(ev.id);
  if (!ISO.test(ev.start)) fail(`${tag}: start is not an ISO date (${ev.start})`);
  if (!ISO.test(ev.end)) fail(`${tag}: end is not an ISO date (${ev.end})`);
  if (ISO.test(ev.start) && ISO.test(ev.end) && ev.end < ev.start) {
    fail(`${tag}: ends ${ev.end}, before it starts ${ev.start}`);
  }
  if (!ev.emoji || ev.emoji.length > 6) fail(`${tag}: emoji looks wrong (${JSON.stringify(ev.emoji)})`);
  if (!ev.title || ev.title.length < 8) fail(`${tag}: title too short to mean anything`);
  if (!routes.has(ev.to)) fail(`${tag}: links to ${ev.to}, which is not a route in App.tsx`);
  /* the date is worked out at render time, so writing one into the title
     would be a second copy that can disagree with the first */
  if (/\b(20\d\d|January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(ev.title)) {
    fail(`${tag}: the title carries its own date, which can drift from the real one: ${ev.title}`);
  }
}
console.log(`   ${ids.size} unique ids, every link a real route`);

/* ── 2: two sources on two hosts ──────────────────────────────────────── */
console.log('2) every entry is checked against two independent sources');
for (const ev of SPORTS_EVENTS) {
  const src = ev.sources;
  if (!Array.isArray(src) || src.length !== 2) {
    fail(`${ev.id}: ${Array.isArray(src) ? src.length : 0} sources, the rule is exactly two`);
    continue;
  }
  const hosts = src.map(u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return null; } });
  if (hosts.some(h => !h)) { fail(`${ev.id}: a source is not a URL`); continue; }
  if (hosts[0] === hosts[1]) fail(`${ev.id}: both sources are ${hosts[0]}, which is one source twice`);
  if (!src.every(u => u.startsWith('https://'))) fail(`${ev.id}: a source is not https`);
}
const allHosts = new Set(SPORTS_EVENTS.flatMap(e => e.sources.map(u => new URL(u).hostname.replace(/^www\./, ''))));
console.log(`   ${SPORTS_EVENTS.length * 2} source links across ${allHosts.size} distinct hosts`);

/* ── 3: facts, not results or opinions ────────────────────────────────── */
console.log('3) nothing on the strip is a result, a guess or a quote');
/* These are the shapes a claim takes when it stops being a schedule: a
   scoreline, a prediction, a superlative, or speech. The strip is allowed to
   say what is on, and nothing else. */
const BANNED = [
  [/\b\d+\s*[-x]\s*\d+\b/, 'a scoreline'],
  [/\b(will|should|expect|predict|favourite|favorite|odds)\b/i, 'a prediction'],
  [/\b(best|greatest|biggest|worst|must watch|unmissable)\b/i, 'a superlative'],
  [/["“”]/, 'a quotation mark'],
  [/\b(beat|beats|won|wins|lost|loses|defeated)\b/i, 'a result'],
];
for (const ev of SPORTS_EVENTS) {
  for (const [re, what] of BANNED) {
    if (re.test(ev.title)) fail(`${ev.id}: the title contains ${what}: ${ev.title}`);
  }
}
console.log(`   ${SPORTS_EVENTS.length} titles, all statements of what is scheduled`);

/* ── 4: it fails closed as it ages ────────────────────────────────────── */
console.log('4) driven day by day from before the first entry to long after the last');
const sorted = [...SPORTS_EVENTS].sort((a, b) => (a.start < b.start ? -1 : 1));
const first = at(sorted[0].start);
const last = at(sorted[sorted.length - 1].end);
const from = new Date(first.getTime() - 30 * 86400000);
const to = new Date(last.getTime() + 120 * 86400000);
let days = 0, daysWithLines = 0, maxShown = 0, dryStreak = 0, longestDry = 0;
for (let t = from.getTime(); t <= to.getTime(); t += 86400000) {
  const now = new Date(t);
  const shown = upcomingEvents(now);
  days += 1;
  maxShown = Math.max(maxShown, shown.length);
  if (shown.length) { daysWithLines += 1; dryStreak = 0; } else { dryStreak += 1; longestDry = Math.max(longestDry, dryStreak); }
  if (shown.length > 3) fail(`${now.toDateString()}: ${shown.length} lines, the cap is 3`);
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  for (const ev of shown) {
    if (ev.end < todayKey) fail(`${now.toDateString()}: still showing ${ev.id}, which finished ${ev.end}`);
  }
  /* soonest first, or the strip leads with the thing furthest away */
  for (let i = 1; i < shown.length; i++) {
    if (shown[i].start < shown[i - 1].start) fail(`${now.toDateString()}: out of order, ${shown[i].id} before ${shown[i - 1].id}`);
  }
}
console.log(`   ${days} simulated days, lines on ${daysWithLines} of them, never more than ${maxShown} at once`);
/* the run deliberately ends four months past the last entry, so it MUST go
   quiet, and it must have been noisy for a good stretch before that */
if (longestDry < 60) fail(`the calendar never went quiet for long, so the fail closed path is untested (longest dry run ${longestDry} days)`);
if (daysWithLines < 40) fail(`only ${daysWithLines} days carried a line, which is too thin to be a feature`);
/* Round 258 measured 32 quiet days before the first entry, 92 noisy, then
   120 quiet at the end. Floors are set near half of each. */

/* ── 5: the phrasing, day by day ──────────────────────────────────────── */
console.log('5) the when phrase, checked on every day of a run up');
const probe = sorted[0];
const checks = [];
for (let d = 14; d >= 0; d--) {
  const now = new Date(at(probe.start).getTime() - d * 86400000);
  const phrase = whenPhrase(probe, now);
  checks.push([d, phrase]);
  if (d === 0 && phrase !== 'today') fail(`the day of the event says ${JSON.stringify(phrase)}, not "today"`);
  if (d === 1 && phrase !== 'tomorrow') fail(`the day before says ${JSON.stringify(phrase)}, not "tomorrow"`);
  if (d >= 2 && d <= 5 && !/^(Sun|Mon|Tues|Wednes|Thurs|Fri|Satur)day$/.test(phrase)) {
    fail(`${d} days out says ${JSON.stringify(phrase)}, which should be a weekday name`);
  }
  /* six and seven days out deliberately count rather than name: a weekday
     name that far ahead is ambiguous about which one it means */
  if (d > 5 && phrase !== `in ${d} days`) fail(`${d} days out says ${JSON.stringify(phrase)}`);
  /* a phrase that names a time of day would be claiming something the
     calendar does not hold */
  if (/tonight|this morning|kick ?off at|\d\s*(am|pm)/i.test(phrase)) {
    fail(`the phrase claims a time of day the calendar never recorded: ${phrase}`);
  }
}
console.log(`   ${checks.length} days checked on ${probe.id}: ${checks.filter(c => c[0] <= 3).map(c => `${c[0]}d=${c[1]}`).join(', ')}`);
/* a multi day event already under way reads as running, not as upcoming */
const multi = SPORTS_EVENTS.find(e => e.end > e.start);
if (!multi) {
  fail('no multi day entry, so the "on now" path is never exercised');
} else {
  const mid = new Date(at(multi.start).getTime() + 86400000);
  if (whenPhrase(multi, mid) !== 'on now') {
    fail(`a tournament in its second day says ${JSON.stringify(whenPhrase(multi, mid))}, not "on now"`);
  }
  if (!upcomingEvents(mid).some(e => e.id === multi.id)) fail(`${multi.id} disappears while it is actually running`);
}

/* ── 6: the wiring, both halves ───────────────────────────────────────── */
console.log('6) these lines are marked so a snapshot can never freeze them');
const ticker = readFileSync(path.join(ROOT, 'src/components/layout/TopTicker.tsx'), 'utf8');
if (!ticker.includes('upcomingEvents')) fail('the ticker does not read the calendar at all');
/* Round 280 renamed this flag from `dated` to `volatile` and widened what it
   means, because the calendar lines were never the only ones computed from
   something outside the file: the four rotating daily games were too, and they
   had been frozen into all 126 snapshots since Round 258. The check that
   matters here is unchanged in substance, though: the calendar's own push has
   to carry the flag, whatever the flag is called. It is located by the calendar
   function it reads rather than by line number, so it cannot pass by finding
   some other line's mark. simPrerender section 13 owns the general rule. */
{
  const i = ticker.indexOf('upcomingEvents(now)');
  const call = i < 0 ? '' : ticker.slice(i, i + 400);
  if (!/\bvolatile:\s*true\b/.test(call)) {
    fail('the calendar line in the ticker does not declare itself volatile, so a snapshot will freeze a relative date into a file that outlives it');
  }
}
const marks = (ticker.match(/data-no-prerender/g) ?? []).length;
/* the visible line and its duplicate in the seamless loop both need it */
if (marks < 2) fail(`only ${marks} data-no-prerender marks in the ticker, the loop renders each line twice`);
const pre = readFileSync(path.join(ROOT, 'scripts/prerender.mjs'), 'utf8');
if (!pre.includes('[data-no-prerender]')) fail('the prerenderer does not strip data-no-prerender elements');
console.log(`   ticker marks ${marks} elements, the prerenderer strips them`);

console.log('');
if (failures > 0) {
  console.error(`simSportsCalendar: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simSportsCalendar: green. Real sport on the strip, two sources deep, and it goes quiet rather than stale.');
