/* The prerender clock must be independent of the day and machine running it.

   Three relative clock samples can all land on the same value in a small
   daily pool. That happened on Missing XI and Emoji Guess: the intersection
   kept a date-driven block by coincidence, then a later build kept a
   different block and falsely re-dated the page in the sitemap.

   This outcome check runs the exact browser script the prerenderer uses on
   two fake host dates. Every sample must expose the same clock and seeded
   random sequence on both hosts. The control rewrites that script back to a
   host-relative clock and must make all three samples differ.

   Run: node scripts/simPrerenderCalendarAnchor.mjs
   Controls: SIM_PRERENDER_CALENDAR_CONTROL=relative, uninstalled or hosttimezone
*/
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  SAMPLE_DAYS,
  SNAPSHOT_EPOCH_MS,
  clockScript,
} from './lib/prerenderClock.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_PRERENDER_CALENDAR_CONTROL || '';
if (CONTROL && !['relative', 'uninstalled', 'hosttimezone'].includes(CONTROL)) {
  console.error(`Unknown control ${CONTROL}. Use relative, uninstalled or hosttimezone.`);
  process.exit(1);
}

const DAY_MS = 86_400_000;
const HOST_DATES = [
  Date.UTC(2026, 8, 7, 14),
  Date.UTC(2026, 9, 23, 3),
];

function hostDate(now) {
  const NativeDate = Date;
  function HostDate(...args) {
    if (!new.target) return new NativeDate(now).toString();
    return args.length ? new NativeDate(...args) : new NativeDate(now);
  }
  HostDate.now = () => now;
  HostDate.parse = NativeDate.parse;
  HostDate.UTC = NativeDate.UTC;
  HostDate.prototype = NativeDate.prototype;
  return HostDate;
}

function run(script, hostNow) {
  const sandbox = {
    Date: hostDate(hostNow),
    Math: Object.create(Math),
    window: {},
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(script, sandbox);
  return {
    now: sandbox.Date.now(),
    noArg: new sandbox.Date().toISOString(),
    called: sandbox.Date(),
    explicit: new sandbox.Date('2001-02-03T04:05:06Z').toISOString(),
    random: [sandbox.Math.random(), sandbox.Math.random(), sandbox.Math.random()],
    prerender: sandbox.window.__DUKB_PRERENDER__,
  };
}

const rawSource = fs.readFileSync(path.join(ROOT, 'scripts/prerender.mjs'), 'utf8').replaceAll('\r\n', '\n');
const installLine = "await ctx.addInitScript(clockScript(days, { setPrerenderFlag: CONTROL !== 'noflag' }));";
const timezoneLine = "timezoneId: 'America/New_York',";
let source = rawSource;
if (CONTROL === 'uninstalled' || CONTROL === 'hosttimezone') {
  const target = CONTROL === 'uninstalled' ? installLine : timezoneLine;
  const matches = source.split(target).length - 1;
  if (matches !== 1) {
    console.error(`Control cannot run: expected one ${CONTROL} target, found ${matches}`);
    process.exit(1);
  }
  source = source.replace(target, '');
}

const wiringErrors = code => [
  !code.includes("from './lib/prerenderClock.mjs'") && 'shared stable clock import',
  !code.includes('for (const days of SAMPLE_DAYS)') && 'shared sample loop',
  !code.includes(installLine) && 'browser clock installation',
  !code.includes(timezoneLine) && 'stable browser timezone',
].filter(Boolean);
const wiring = wiringErrors(source);
if (CONTROL === 'uninstalled' || CONTROL === 'hosttimezone') {
  const expected = CONTROL === 'uninstalled' ? 'browser clock installation' : 'stable browser timezone';
  if (wiring.length === 1 && wiring[0] === expected) {
    console.log(`control ${CONTROL}: green. Removing the production wiring made its source check fail.`);
    process.exit(0);
  }
  console.error(`control ${CONTROL}: RED. Wiring errors were ${wiring.join(', ') || 'none'}.`);
  process.exit(1);
}
if (wiring.length > 0) {
  console.error(`prerender.mjs is missing: ${wiring.join(', ')}`);
  process.exit(1);
}

let differences = 0;
for (const days of SAMPLE_DAYS) {
  let script = clockScript(days);
  if (CONTROL === 'relative') {
    const stable = `const NOW = ${SNAPSHOT_EPOCH_MS} + ${days} * 86400000;`;
    const relative = `const NOW = RealDate.now() + ${days} * 86400000;`;
    const matches = script.split(stable).length - 1;
    if (matches !== 1) {
      console.error(`Control cannot run: expected one stable clock line for day ${days}, found ${matches}`);
      process.exit(1);
    }
    script = script.replace(stable, relative);
  }

  const a = run(script, HOST_DATES[0]);
  const b = run(script, HOST_DATES[1]);
  if (JSON.stringify(a) !== JSON.stringify(b)) differences += 1;

  if (!CONTROL) {
    const expected = SNAPSHOT_EPOCH_MS + days * DAY_MS;
    if (a.now !== expected || b.now !== expected) {
      console.error(`day ${days}: expected ${expected}, got ${a.now} and ${b.now}`);
      process.exit(1);
    }
    if (a.explicit !== '2001-02-03T04:05:06.000Z') {
      console.error(`day ${days}: an explicitly dated value changed to ${a.explicit}`);
      process.exit(1);
    }
    if (a.prerender !== true) {
      console.error(`day ${days}: the prerender flag was not set`);
      process.exit(1);
    }
    console.log(`sample +${days} days: stable at ${a.noArg}`);
  }
}

if (CONTROL) {
  if (differences === SAMPLE_DAYS.length) {
    console.log(`control relative: green. All ${differences} samples moved with the fake host date.`);
    process.exit(0);
  }
  console.error(`control relative: RED. Only ${differences} of ${SAMPLE_DAYS.length} samples exposed the old host-date bug.`);
  process.exit(1);
}

if (differences > 0) {
  console.error(`${differences} of ${SAMPLE_DAYS.length} prerender clocks change with the host date`);
  process.exit(1);
}
console.log(`simPrerenderCalendarAnchor: green. ${SAMPLE_DAYS.length} clock samples stayed byte identical across two host dates.`);
