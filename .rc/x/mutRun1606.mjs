/* Review (run lens) of Round 1606: one small mutation per call, applied in place on the RUNNER's checkout only.
   Usage: node .rc/x/mutRun1606.mjs <name>. Refuses (exit 2) unless the anchor is there exactly once and the file
   changed. The request line restores with git checkout -- src scripts after the harness runs. */
import fs from 'node:fs';

const CM = 'src/lib/clubManager.ts';
const MUTS = {
  /* Taking over a real man's chair names him: "You take over at X from {real}." */
  takeover: [CM, 'const displacedReal = isRealChair(record[state.clubName]);', 'const displacedReal = false;'],
  /* The season end offer names the real outgoing man again. */
  offer: [CM, 'const outReal = !!out && (', 'const outReal = false && ('],
  /* The real recycle candidate is no longer spliced out of the pool (the stream moves). */
  splice: [CM, 'if (recycled) pool.splice(pool.indexOf(recycled), 1);', '/* splice dropped */'],
  /* The opening day seat forgets the world offset (a job taken years on would seat the opening day men). */
  years: [CM, 'if (state.season !== 1 || years !== 0 || club === state.clubName) return null;', 'if (state.season !== 1 || club === state.clubName) return null;'],
  /* The opening day seat forgets the clubs this career managed. */
  managedopen: [CM, "  if ((state.careerStats?.clubsManaged ?? []).includes(club)) return null;\n  return realDugoutFor", '  return realDugoutFor'],
  /* The repair no longer scrubs a real man from a club this career managed. */
  scrub: [CM, 'if (m[club] && m[club].real === 1 && managedHere.has(club)) {', 'if (false) {'],
  /* The recycled branch's real holder line names the outgoing man (only that branch). */
  recycledline: [CM, 'appoint ${name} after finishing ${ordinal(s.pos)}. He was out at', 'appoint ${name} after ${s.name} finished ${ordinal(s.pos)}. He was out at'],
  /* The display slot shows the real man at a club this career managed. */
  viewmanaged: [CM, "      if ((career.careerStats?.clubsManaged ?? []).includes(club)) return null;\n      return { name: entry.name", '      return { name: entry.name'],
  /* A byte change on the default path (key order of a minted chair): the fleet must see it. */
  fleetorder: [CM, 'm[club] = { name, since: state.season };', 'm[club] = { since: state.season, name };'],
  /* The namedsack control's anchor drifts: the control must refuse, not pass. */
  drift: [CM, 'const holderReal = realOut.has(s.name);', 'const holderReal = realOut.has(s.name) ;'],
  /* The quotes guard loses the dugout join: the dugout control must stop firing. */
  quotesnojoin: ['scripts/simNoInventedQuotes.mjs', 'for (const n of DUGOUT_NAMES) full.add(n);', '/* join dropped */'],
  /* A real dugout row whose name a generator can build: simInventedNames must go red. */
  namesrow: ['src/data/clubManagerDugouts.ts', 'export const CM_DUGOUTS: RealDugoutTable = {};', "export const CM_DUGOUTS: RealDugoutTable = { now: { Arsenal: { name: 'Aaron Abara' } } };"],
  /* The same row with the harness join dropped: shows the join is what fires it. */
  namesnojoin: ['scripts/simInventedNames.mjs', 'for (const n of dugoutNames) real.add(n);', '/* join dropped */'],
  /* The era generator no longer walks past the dugout names. */
  erasnojoin: ['src/lib/clubManagerEras.ts', 'for (const n of realDugoutNames(CM_DUGOUTS)) set.add(n);', '/* join dropped */'],
};

for (const name of process.argv.slice(2)) {
  const m = MUTS[name];
  if (!m) { console.error(`mutation ${name}: unknown`); process.exit(2); }
  const [file, from, to] = m;
  const text = fs.readFileSync(file, 'utf8');
  const count = text.split(from).length - 1;
  if (count !== 1) { console.error(`mutation ${name}: anchor found ${count} times in ${file}, refusing`); process.exit(2); }
  const next = text.replace(from, to);
  if (next === text) { console.error(`mutation ${name}: nothing changed, refusing`); process.exit(2); }
  fs.writeFileSync(file, next);
  console.log(`mutation ${name}: applied to ${file}`);
}
