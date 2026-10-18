/* Review of Round 1509 (the run lens): what a mid season move and a summer move hand the followed Europa League's
 * `earned` (the route MY club earned, which the tile and the screen's first line read). Never committed. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-probe');
fs.mkdirSync(OUT, { recursive: true });
const { engineOf, tape } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs')).href);
const cannot = why => { console.log(`probe: cannot run: ${why}`); process.exit(2); };
const E = await engineOf(ROOT, 'probe', {}, cannot);
const opts = { skipHalftime: true, noCoach: true };
const words = c => (c === 'L' ? 'its league place' : c === 'C' ? 'winning its cup' : c === 'P' ? "its cup's place, passed down its league" : c === 'H' ? 'winning the Conference League' : c === 'F' ? 'the fill' : null);
const lines = [];
const say = s => { console.log(s); lines.push(s); };
let bad = 0;
const joinTo = (M, st, club, leagueId) => M.cal.joinClubNow({ ...st, jobHunt: { open: { club, league: leagueId, tier: 3, season: st.season, week: st.week, matchesLeft: 0, roll: 0, status: 'accepted' }, cooldowns: [], sentSeason: st.season, sent: 1, summerMove: null } });
/* The route the joined club earned by the rule, worked out from the slice's own field: a club outside the field
   that the rule kept out would be in it, so a club outside it earned nothing. */
for (const [club, seed, season] of [['Liverpool', 11, 1], ['Liverpool', 12, 1], ['Aston Villa', 13, 1], ['Newcastle', 14, 2], ['Chelsea', 15, 2]]) {
  const M = await E.fresh();
  let s = tape(seed, () => M.cm.startCareer(club)).value;
  let i = 0;
  const step = () => { s = tape(seed + 1 + i, () => M.cm.playNextEntry(s, opts)).value.state; i += 1; };
  if (season === 2) { while (s.week < s.calendar.length && i < 400) step(); s = tape(seed + 900, () => M.cm.startNextSeason(s)).value; }
  for (let k = 0; k < 25 && s.week < s.calendar.length; k += 1) step();
  const sl = s.worldComps?.uel;
  if (!sl) { say(`${club} seed ${seed} season ${s.season}: no Europa League followed`); continue; }
  const leagues = M.cm.REAL_LEAGUES.filter(l => l.euro);
  const mine = leagues.find(l => l.clubs.includes(club));
  const target = leagues.filter(l => l !== mine).map(l => l.clubs[l.clubs.length - 1]).find(c => !sl.clubs.includes(c) && !(s.uclField ?? []).includes(c));
  const lg = leagues.find(l => l.clubs.includes(target));
  const j = joinTo(M, s, target, lg.id);
  if (!j) { say(`${club}: the move to ${target} was refused`); continue; }
  const js = j.worldComps?.uel;
  const carried = !!js && js.seed === sl.seed;
  const first = js?.earned ? `${j.clubName} earned a place in it by ${words(js.earned)}, but your own Europa League nights are not in the game yet` : `${j.clubName} are not in it this season`;
  const lie = carried && !!js.earned && !js.clubs.includes(j.clubName);
  if (lie) bad += 1;
  say(`${club} seed ${seed} season ${s.season} (earned ${sl.earned ?? 'none'}) moved at week ${s.week} to ${target}: carried ${carried}, joined slice earned ${js?.earned ?? 'none'}; the screen's first line reads "${first}"${lie ? '  <-- UNTRUE: the route is the old club\'s' : ''}`);
  M.store.clear(); M.cm.saveCareer(j);
  const R = await E.fresh(); for (const [k, v] of M.store.entries()) R.store.set(k, v);
  const back = R.cm.loadCareer();
  say(`   after a reload: earned ${back?.worldComps?.uel?.earned ?? 'none'}`);
  fs.writeFileSync(path.join(OUT, `carry-${club.replace(/\W+/g, '')}-${seed}.json`), JSON.stringify([...M.store.entries()]));
}
say(`PROBE CARRY: ${bad} moves keep an earned route that is not the joined club's`);
fs.writeFileSync(path.join(OUT, 'probe-carry.txt'), lines.join('\n'));
