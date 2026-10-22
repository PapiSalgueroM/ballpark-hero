// Round 1540 fix2, item 7 measurement for the lead: print lines only (no draw), applied to the runner's checkout
// and restored by the request line. Every man runDeskOffseason (gmContracts.ts, shared by the four desks) puts on a
// rival's roster after he let a sheet stand is followed through the engine's summer by id: on a roster (which club),
// in the pool, or LOST (in neither).
import fs from 'node:fs';
const file = 'src/lib/gmContracts.ts';
let src = fs.readFileSync(file, 'utf8');
const edit = (from, to) => {
  if (src.split(from).length !== 2) { console.error(`p9: anchor not once: ${from.slice(0, 70)}`); process.exit(2); }
  src = src.replace(from, to);
};
const push = '        league.teams[sheetClub].players.push({ ...man, years: (d.years ?? 1) + 1, salary: d.salary ?? man.salary });\n';
edit(push, push +
  '        ((globalThis as any).__p9 ??= []).push({ id: man.id, name: man.name, club: sheetClub, season: league.season, ovr: man.ovr });\n' +
  '        console.log(`P9 SHEET ${league.season} ${sheetClub} ${man.name} ovr ${man.ovr} roster ${league.teams[sheetClub].players.length}`);\n');
const eng = '  const engine = host.runOffseason(league, rng, ledger.team);\n';
edit(eng, eng +
  '  for (const s9 of ((globalThis as any).__p9 ?? []).splice(0)) {\n' +
  '    const on9 = Object.entries(league.teams).find(([, t]) => t.players.some(p => p.id === s9.id));\n' +
  '    const fa9 = league.freeAgents.some(p => p.id === s9.id);\n' +
  '    const what9 = on9 ? (on9[0] === s9.club ? \'ON-SHEET-CLUB\' : \'ON-OTHER\') : fa9 ? \'POOL\' : \'LOST\';\n' +
  '    console.log(`P9 ${what9} ${s9.season} ${s9.club} ${s9.name} ovr ${s9.ovr} now ${on9 ? on9[0] : \'-\'}`);\n' +
  '  }\n');
fs.writeFileSync(file, src);
console.log('p9: two print points in gmContracts.ts');
