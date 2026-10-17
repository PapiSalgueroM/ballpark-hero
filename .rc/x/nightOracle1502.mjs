/* Review of Round 1502 (runs lens): an INDEPENDENT oracle for when a watched night counts as played, the rule the
   critic's correction 8 binds and simWorldUcl section 3 checks only against worldUclNights' own `at` (self relative).
   Here the expectation comes from the calendar itself, never from worldUclNights:
   (a) a first stage matchday n (n < 6) IS the calendar's uclGroup entry of round n: played once the week is past
       that entry's index, and dated that entry's date;
   (b) an era's knockout leg that has a uclKo entry IS that entry: the same;
   (c) any other night: played once the week is past the LAST calendar entry dated on or before the night's own date
       (worldUclNightDates), so a night never shows before an entry of its own day or earlier is played.
   Runs the watcher fleet of scripts/lib/worldUclFleet.mjs, one season, seeds OR_SEEDS (1,2), on the tree in the
   current folder (so a mutated copy can be checked). Exit 0 green, 1 red, 2 could not run. */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { engineOf, pickFleet, tape } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs')).href);
const SEEDS = (process.env.OR_SEEDS || '1,2').split(',').map(Number);
const cannot = why => { console.log(`nightOracle1502: CANNOT RUN: ${why}`); process.exit(2); };
const fails = []; let checks = 0; const counts = {};
const ok = (c, m) => { checks += 1; if (!c) { fails.push(m); if (fails.length <= 25) console.log(`  FAIL ${m}`); } };
const bump = k => { counts[k] = (counts[k] ?? 0) + 1; };
const dayOf = d => Date.UTC(d.y, d.m - 1, d.d) / 86400000;
const OPTS = { skipHalftime: true, noCoach: true };

const E = await engineOf(ROOT, 'oracle', {}, cannot);
const fleet = pickFleet(await E.fresh(), 'watchers', cannot);
console.log(`nightOracle1502: ${fleet.length} watchers (${fleet.map(f => `${f.club} ${f.era}`).join(', ')}), seeds ${SEEDS.join(',')}`);

function checkState(M, s, tag) {
  const slice = s.worldComps?.ucl;
  if (!slice || slice.s !== s.season) return;
  const places = M.cm.worldUclNights(s);
  const dates = M.cal.worldUclNightDates(s);
  const entry = M.cal.entryDatesOf(s);
  if (!places || !dates) { ok(false, `${tag}: a watched season with no nights`); return; }
  const done = M.cm.worldUclNightsDone(s);
  const over = s.week >= s.calendar.length;
  const seen = slice.seen ?? 0;
  places.forEach((p, i) => {
    const n = p.night;
    let idx = -1; let how = 'date';
    if (n.stage === 'md' && (n.md ?? 0) < 6) { idx = s.calendar.findIndex(e => e.type === 'uclGroup' && e.round === n.md); how = 'uclGroup'; }
    else if (slice.f === 'g8' && n.stage !== 'md') {
      idx = s.calendar.findIndex(e => e.type === 'uclKo' && e.uclRound === n.stage && (e.uclLeg ?? 1) === (n.leg ?? 1));
      if (idx >= 0) how = 'uclKo';
    }
    if (idx >= 0) ok(dayOf(dates[i]) === dayOf(entry[idx]), `${tag}: ${n.id} is the ${how} entry at ${idx} (${entry[idx].y}-${entry[idx].m}-${entry[idx].d}) but is dated ${dates[i].y}-${dates[i].m}-${dates[i].d}`);
    else { for (let j = 0; j < entry.length; j += 1) if (dayOf(entry[j]) <= dayOf(dates[i])) idx = j; }
    const want = over || s.week > idx || i < seen;
    /* EARLY (counted as played before the calendar has played it) is the defect correction 8 names: a failure.
       LATE on a dated night (shown after its date has passed) is counted and printed, for an entry night it fails. */
    if (i < done && !want) ok(false, `${tag} week ${s.week}: ${n.id} (${how}, its entry ${idx}) counts as played EARLY, the calendar has not played it`);
    else if (i >= done && want) { if (how === 'date') bump(`late ${slice.f} dated nights (shown after the last entry of their day)`); else ok(false, `${tag} week ${s.week}: ${n.id} (${how}, its entry ${idx}) is not counted although its entry is played`); }
    else ok(true, '');
    bump(`checked ${slice.f} ${how}`);
  });
}

let k = 0;
for (const f of fleet) for (const seed of SEEDS) {
  const M = await E.fresh();
  const run = fn => tape((seed * 0x9e3779b1 + (k += 1) * 7919) >>> 0, fn).value;
  let s = run(() => (f.custom ? M.cm.startCareer(f.club, f.era, f.custom) : M.cm.startCareer(f.club, f.era)));
  const tag = `${f.club} (${f.era}) seed ${seed}`;
  checkState(M, s, tag);
  for (let i = 0; i < 260; i += 1) {
    const r = run(() => M.cm.playNextEntry(s, OPTS));
    s = r.state; checkState(M, s, tag);
    if (r.kind === 'seasonOver') break;
  }
}
for (const [key, n] of Object.entries(counts)) console.log(`  ${key}: ${n}`);
console.log(fails.length ? `nightOracle1502: RED, ${fails.length} failures of ${checks} checks` : `nightOracle1502: GREEN, ${checks} checks, 0 failures`);
process.exit(fails.length ? 1 : 0);
