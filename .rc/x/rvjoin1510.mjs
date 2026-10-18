/* Review of Round 1510: a mid season move into a club of a super cup already played and shown (simOneOffCups'
 * own fleet row: Chelsea joins Manchester City at season one's entry 25, after the season one Shield of Arsenal
 * against Manchester City). Prints the slice and the nights shown before and after the move, on the engine in the
 * CURRENT directory. Run from a checkout's root: node <path>/rvjoin1510.mjs */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { engineOf, tape } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs')).href);
const cannot = why => { console.log(`rvjoin1510: cannot run: ${why}`); process.exit(2); };
const E = await engineOf(ROOT, 'join', {}, cannot);
let fell = 0, cases = 0;
for (const seed of [1, 2, 3]) {
  const M = await E.fresh();
  let s = tape(seed, () => M.cm.startCareer('Chelsea')).value;
  for (let i = 0; i < 26; i += 1) s = tape(seed * 1000 + i, () => M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true })).value.state;
  const before = { dsc: s.worldComps?.dsc, done: M.cm.oneOffNightsDone(s), res: M.cm.evalOneOff(s) };
  const lg = M.cm.REAL_LEAGUES.find(l => l.clubs.includes('Manchester City'));
  const open = { club: 'Manchester City', league: lg.id, tier: 3, season: s.season, week: s.week, matchesLeft: 0, roll: 0, status: 'accepted' };
  const joined = tape(seed + 9, () => M.cal.joinClubNow({ ...s, jobHunt: { open, cooldowns: [], sentSeason: s.season, sent: 1, summerMove: null } })).value;
  if (!joined) { console.log(`seed ${seed}: joinClubNow refused`); continue; }
  cases += 1;
  const after = { dsc: joined.worldComps?.dsc, done: M.cm.oneOffNightsDone(joined), res: M.cm.evalOneOff(joined) };
  const fx = r => (r?.fixtures ?? []).map(f => `${f.home} ${f.hg}-${f.ag} ${f.away}${f.pens ? ' pens' : ''} won by ${f.winner}`).join('; ') || 'nothing shown';
  console.log(`seed ${seed}: before the move (Chelsea, week ${s.week}): ${before.dsc?.skip ? `stub ${before.dsc.skip}` : before.dsc?.clubs?.join(' v ')}, nights shown ${before.done}: ${fx(before.res)}`);
  console.log(`seed ${seed}: after the move (${joined.clubName}, week ${joined.week}): ${after.dsc?.skip ? `stub ${after.dsc.skip}` : after.dsc?.clubs?.join(' v ')}${after.dsc?.seen ? ` seen ${after.dsc.seen}` : ''}, nights shown ${after.done}: ${fx(after.res)}`);
  if (after.done < before.done || (before.res?.done && !after.res?.done)) fell += 1;
}
console.log(fell ? `rvjoin1510: a shown super cup FELL after the move in ${fell} of ${cases} cases` : `rvjoin1510: the shown cup held in all ${cases} cases`);
process.exit(fell ? 1 : 0);
