/* Reviewer probe (never committed): apply ONE named source mutation on the runner's throwaway checkout.
   Refuses to run unless the anchor occurs exactly once and the file really changes. */
import fs from 'node:fs';

const CENTRE = 'src/components/soccer-career/SoccerSeasonCentre.tsx';
const EVENTS = 'src/lib/season/soccerEvents.ts';
const TYCOON = 'src/pages/StadiumTycoon.tsx';
const TABLE = 'src/components/club-manager/LeagueTableCard.tsx';
const CUP = 'src/components/club-manager/CupBracketCard.tsx';
const ROLES = 'src/components/club-manager/RolesScreen.tsx';
const M = {
  /* the merge seam: the page hands the own goal pass the OFFERED moments (empty on a replay) instead of the planned ones */
  m1: [CENTRE, 'soccerOwnGoals(decided, planned)', 'soccerOwnGoals(decided, offered)'],
  /* the words credit the wrong club */
  m2: [CENTRE, "(O.G), goal for ${e.side === 'us' ? us : them}", "(O.G), goal for ${e.side === 'us' ? them : us}"],
  /* the page stops applying own goals at all */
  m2b: [CENTRE, 'decided ? soccerOwnGoals(decided, planned) : null', 'decided ? decided : null'],
  /* the latest season dialog reads the wrong club's row */
  m3: [TYCOON, 'const own = snapshot.table[0];', 'const own = snapshot.table[snapshot.table.length - 1];'],
  /* the dialog prints wins where points belong */
  m3b: [TYCOON, '<dd data-season-points className="break-words font-bold">{formatSeasonCount(own.pts)}</dd>', '<dd data-season-points className="break-words font-bold">{formatSeasonCount(own.w)}</dd>'],
  /* league table rows never become buttons */
  m4: [TABLE, "const Row = onClubClick ? 'button' : 'div';", "const Row = (onClubClick ? 'div' : 'div') as 'button' | 'div';"],
  /* bracket rows never become buttons */
  m5: [CUP, "const Line = onClubClick ? 'button' : 'div';", "const Line = (onClubClick ? 'div' : 'div') as 'button' | 'div';"],
  /* the dressing room count is capped at five again */
  m6: [ROLES, 'const broken = brokenPromises(career);', 'const broken = brokenPromises(career).slice(0, 5);'],
  /* engine: the ordinal no longer keeps the two sides apart */
  m7: [EVENTS, 'const group = `${e.min}|${e.side}`;', 'const group = `${e.min}`;'],
  /* engine: off by one at the minute he left */
  m8: [EVENTS, 'e.min <= win[1] && role === 0', 'e.min < win[1] && role === 0'],
  /* engine: a goal against in a minute he assisted in is left alone too */
  m9: [EVENTS, "(e.side === 'us' && assists.has(e.min))", 'assists.has(e.min)'],
};
const name = process.argv[2];
if (!M[name]) { console.error(`unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = M[name];
const before = fs.readFileSync(file, 'utf8');
const hits = before.split(from).length - 1;
if (hits !== 1) { console.error(`MUTATION REFUSED ${name}: anchor occurs ${hits} times in ${file}`); process.exit(2); }
const after = before.replace(from, () => to);
if (after === before) { console.error(`MUTATION REFUSED ${name}: nothing changed`); process.exit(2); }
fs.writeFileSync(file, after);
console.log(`MUTATED ${name}: ${file}`);
