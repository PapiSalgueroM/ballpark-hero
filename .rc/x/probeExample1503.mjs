/* Round 1503 probe (not committed): the facts the help's worked examples print, read off the engine on the
 * runner. For each example save: whether it is in the Champions League, the format and size it follows, the
 * game's date of every night (dates come from the save's own calendar and do not depend on any draw), and, after a
 * whole season played on a held random stream, the winner. Run from the repo root: node .rc/x/probeExample1503.mjs */
import path from 'node:path';
import { engineOf, tape } from '../../scripts/lib/worldUclFleet.mjs';

const ROOT = process.cwd();
const E = await engineOf(ROOT, 'probe1503');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = d => (d ? `${d.d} ${MONTHS[d.m - 1]} ${d.y}` : 'none');
for (const [club, era] of [['Chelsea', undefined], ['Sunderland', 'era2005'], ['Everton', undefined], ['Villarreal', 'era2005']]) {
  const M = await E.fresh();
  let s = tape(0x1503, () => (era ? M.cm.startCareer(club, era) : M.cm.startCareer(club))).value;
  const slice = s.worldComps?.ucl;
  console.log(`== ${club} ${era ?? 'now'}: uclGroup ${s.uclGroup ? 'set' : 'null'}, league ${M.cm.careerLeagueOf(s).name} (${s.leagueClubs.length} clubs), slice ${slice ? `${slice.f} ${slice.clubs.length} clubs, holder ${slice.holder ?? 'none'}` : 'none'}`);
  const dates = M.cal.worldUclNightDates(s);
  const places = M.cm.worldUclNights(s);
  if (dates && places) console.log('   nights: ' + places.map((p, i) => `${p.night.id} ${fmt(dates[i])}`).join(' | '));
  const field = era ? M.cm.worldUclEraField(s) : null;
  if (field?.standIn) console.log(`   stand in: ${field.standIn}`);
  let i = 0;
  while (s.week < s.calendar.length && i < 400) {
    s = tape(0x2000 + i, () => M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true })).value.state;
    i += 1;
  }
  const r = M.cm.evalWorldUcl(s);
  console.log(`   season played (${i} entries): winner ${r?.winner ?? 'none'}, runner-up ${r?.runnerUp ?? 'none'}, nights done ${r?.nightsDone}`);
  if (r?.table) console.log('   table top 3: ' + r.table.slice(0, 3).map(x => `${x.club} ${x.pts}`).join(', ') + '; 9th ' + r.table[8]?.club + '; 25th ' + r.table[24]?.club);
}
console.log('probeExample1503: done');
