/* Review of Round 1502 (runs lens): is the carry rule's ENTRANT branch reachable by a player, and does the head keep
   it? carryWorldUcl drops the watched slice when the joined club is one of its entrants (the critic's correction 10,
   "carried when the new club watches and is not an entrant"). simWorldUcl's moves go to the bottom club of another
   league, never to an entrant, so the branch is not exercised there. Here every watcher of the fleet plays into its
   season, then takes a mid season job (joinClubNow, accepted by hand as simWorldUcl's joinTo does) at EVERY club of
   its world's leagues that is an entrant of the competition it watches. Counted: joins that gave the new club its own
   Champions League (uclGroup, the participant path), joins that left it a watcher while it is an entrant (the branch),
   and of those how many still carry a watched slice that lists the manager's own new club (the defect).
   Exit 0 when no such slice is carried, 1 when one is, 2 when it could not run. Run from the tree to check. */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { engineOf, pickFleet, tape } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs')).href);
const cannot = why => { console.log(`entrantJoin1502: CANNOT RUN: ${why}`); process.exit(2); };
const OPTS = { skipHalftime: true, noCoach: true };
const E = await engineOf(ROOT, 'entrant', {}, cannot);
const fleet = pickFleet(await E.fresh(), 'watchers', cannot).filter(f => !f.custom);
const counts = { watchers: 0, joins: 0, nulls: 0, participant: 0, branch: 0, branchDropped: 0, carriedWithOwnClub: 0, throws: 0 };
const cases = [];
let k = 0;
for (const f of fleet) {
  const M = await E.fresh();
  const run = fn => tape((0x1502 * 0x9e3779b1 + (k += 1) * 7919) >>> 0, fn).value;
  let s = run(() => M.cm.startCareer(f.club, f.era));
  for (let i = 0; i < 40 && M.cm.worldUclNightsDone(s) < 3; i += 1) {
    const r = run(() => M.cm.playNextEntry(s, OPTS)); s = r.state; if (r.kind === 'seasonOver') break;
  }
  const slice = s.worldComps?.ucl;
  if (!slice) { console.log(`  ${f.club} (${f.era}): no watched slice at week ${s.week}, skipped`); continue; }
  counts.watchers += 1;
  const leagues = (M.eras.isHistoricEra(s.eraId) ? M.cm.ERA_LEAGUES[s.eraId] : M.cm.REAL_LEAGUES) ?? [];
  for (const league of leagues) for (const club of league.clubs) {
    if (club === s.clubName || !slice.clubs.includes(club)) continue;
    counts.joins += 1;
    let joined = null;
    try {
      const open = { club, league: league.id, tier: 3, season: s.season, week: s.week, matchesLeft: 0, roll: 0, status: 'accepted' };
      joined = run(() => M.cal.joinClubNow({ ...s, jobHunt: { open, cooldowns: [], sentSeason: s.season, sent: 1, summerMove: null } }));
    } catch (e) { counts.throws += 1; continue; }
    if (!joined) { counts.nulls += 1; continue; }
    if (joined.uclGroup) { counts.participant += 1; continue; }
    counts.branch += 1;
    const carried = joined.worldComps?.ucl;
    if (carried && carried.clubs.includes(joined.clubName)) {
      counts.carriedWithOwnClub += 1;
      if (cases.length < 12) cases.push(`${f.club} (${f.era}) week ${s.week} to ${club} (${league.id}): carries the watched ${carried.f} slice of season ${carried.s} with ${club} among its ${carried.clubs.length} entrants`);
    } else {
      counts.branchDropped += 1;
      if (cases.length < 12) cases.push(`${f.club} (${f.era}) week ${s.week} to ${club} (${league.id}): no uclGroup, slice ${carried ? 'kept without it' : 'dropped'}`);
    }
  }
}
console.log(`entrantJoin1502: ${JSON.stringify(counts)}`);
for (const c of cases) console.log(`  ${c}`);
console.log(counts.carriedWithOwnClub
  ? `entrantJoin1502: RED, ${counts.carriedWithOwnClub} mid season moves to an entrant carry a watched competition that lists the manager's own club`
  : `entrantJoin1502: GREEN, ${counts.branch} reachable moves to an entrant with no uclGroup, every one dropped the slice`);
process.exit(counts.carriedWithOwnClub ? 1 : 0);
