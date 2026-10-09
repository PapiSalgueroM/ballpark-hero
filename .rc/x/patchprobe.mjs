/* Fix pass probe (never committed): makes a copy of a harness say WHY a seed went red.
     node patchprobe.mjs screen <copy of simMatchScreen.mjs>
     node patchprobe.mjs erauc  <copy of simClubManagerEraUcl.mjs> */
import fs from 'node:fs';
const [which, file] = process.argv.slice(2);
let s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const rep = (a, b) => {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`anchor occurs ${n} times: ${a.slice(0, 80)}`);
  s = s.replace(a, b);
};
if (which === 'screen') {
  rep("  if (d.added.h1 < h1Lo || d.added.h1 > Math.min(5, h1Lo + 1)) fail(",
    "  if (d.added.h1 < h1Lo || d.added.h1 > Math.min(5, h1Lo + 1) || d.added.h2 < h2Lo || d.added.h2 > Math.min(8, h2Lo + 2)) console.log('DUMP ' + JSON.stringify({ ctx, added: d.added, et: d.et ?? null, subs: d.subs, injuries: d.injuries, cards: d.cards.map(c => [c.minute, c.plus ?? 0, c.kind, c.name]), tl: d.timeline.filter(e => ['goal', 'yellow', 'red', 'injury', 'sub'].includes(e.kind)).map(e => [e.minute, e.plus ?? 0, e.kind, e.side, e.text]) }));\n"
    + "  if (d.added.h1 < h1Lo || d.added.h1 > Math.min(5, h1Lo + 1)) fail(");
} else if (which === 'erauc') {
  rep("  s = playUntil(s, st => (st.uclGroup?.matchday ?? 0) >= 4);\n",
    "  s = playUntil(s, st => (st.uclGroup?.matchday ?? 0) >= 4);\n"
    + "  console.log('DUMP ' + JSON.stringify({ sacked: !!s.sacked, week: s.week, calendar: s.calendar.length, matchday: s.uclGroup?.matchday ?? null, hasGroup: !!s.uclGroup, confidence: s.boardConfidence, form: s.form, log: (s.resultLog ?? []).map(r => [r.week, r.comp, r.opp, r.score, r.res]), squadMorale: Math.round(s.squad.reduce((n, p) => n + p.morale, 0) / s.squad.length), xiCount: (s.xiIds ?? []).filter(Boolean).length, fit: s.squad.filter(p => p.injuryWeeks <= 0 && p.suspendedMatches <= 0).length, squad: s.squad.length }));\n");
} else throw new Error('which?');
fs.writeFileSync(file, s);
console.log(`probe added to ${file}`);
