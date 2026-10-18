/* fix-1509 probe (never committed): the two mid season moves no fleet of simWorldEuro makes. (a) A season one
 * Champions League participant moves to a club outside both competitions: its Europa League was kept apart from
 * its own 32, the watched Champions League the new club follows is a fresh 36. (b) A season one watcher moves to
 * an entrant of the watched Champions League, which is drawn again without the new club. After each move: is any
 * club in the carried Europa League and in the Champions League the joined season really plays? */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { engineOf, tape } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs')).href);
const cannot = why => { console.log(`probe: cannot run: ${why}`); process.exit(2); };
const E = await engineOf(ROOT, 'probe', {}, cannot);
const opts = { skipHalftime: true, noCoach: true };
const joinTo = (M, st, club, leagueId) => M.cal.joinClubNow({ ...st, jobHunt: { open: { club, league: leagueId, tier: 3, season: st.season, week: st.week, matchesLeft: 0, roll: 0, status: 'accepted' }, cooldowns: [], sentSeason: st.season, sent: 1, summerMove: null } });
const played = st => (st.uclGroup ? [st.clubName, ...st.uclGroup.opponents, ...(st.uclWorld ?? []).flatMap(g => g.clubs)] : [...(st.worldComps?.ucl?.clubs ?? [])]);
let overlaps = 0, moves = 0;
const cases = [];
for (const seed of [1, 2, 3]) {
  cases.push({ club: 'Real Madrid', seed, kind: 'participant out' });
  cases.push({ club: 'Real Madrid', seed, kind: 'participant to a club in the watched one' });
  cases.push({ club: 'Chelsea', seed, kind: 'watcher to an entrant' });
}
for (const c of cases) {
  const M = await E.fresh();
  let s = tape(c.seed, () => M.cm.startCareer(c.club)).value;
  for (let i = 0; i < 25 && s.week < s.calendar.length; i += 1) s = tape(c.seed * 1000 + i, () => M.cm.playNextEntry(s, opts)).value.state;
  const leagues = M.cm.REAL_LEAGUES.filter(l => l.euro);
  const uel = s.worldComps?.uel?.clubs ?? [];
  let target = null;
  if (c.kind === 'participant out') {
    const inUcl = new Set(played(s));
    target = leagues.flatMap(l => l.clubs.slice(-1)).find(x => !uel.includes(x) && !inUcl.has(x) && x !== s.clubName);
  } else if (c.kind === 'watcher to an entrant') {
    target = [...(s.worldComps?.ucl?.clubs ?? [])].sort().find(x => leagues.some(l => l.clubs.includes(x)) && x !== s.clubName);
  } else {
    /* A club out of my own 32 that a fresh watched 36 would hold: one of the four deepest leagues' fifth. */
    const inUcl = new Set(played(s));
    target = ['premier', 'laliga', 'seriea', 'bundesliga'].map(id => leagues.find(l => l.id === id)?.clubs).filter(Boolean).flatMap(cl => cl.slice(4, 8)).find(x => !inUcl.has(x) && !uel.includes(x) && x !== s.clubName);
  }
  if (!target) { console.log(`${c.kind} ${c.club} seed ${c.seed}: no target`); continue; }
  const lg = leagues.find(l => l.clubs.includes(target));
  const j = tape(c.seed * 7 + 1, () => joinTo(M, s, target, lg.id)).value;
  if (!j) { console.log(`${c.kind} ${c.club} seed ${c.seed}: the move to ${target} was refused`); continue; }
  moves += 1;
  const ucl = new Set(played(j));
  const ju = j.worldComps?.uel;
  const both = (ju?.clubs ?? []).filter(x => ucl.has(x));
  if (both.length) overlaps += 1;
  console.log(`${c.kind}: ${c.club} seed ${c.seed} week ${s.week} to ${target}: Europa League ${ju ? (ju.seed === s.worldComps?.uel?.seed && ju.clubs.join() === uel.join() ? 'carried' : 'drawn again') : 'none'}, Champions League ${j.uclGroup ? 'in it' : j.worldComps?.ucl ? 'watched' : 'none'}; in both: ${both.join(', ') || 'nobody'}`);
}
console.log(`PROBE TWO COMPS: ${moves} moves, ${overlaps} with a club in both competitions`);
