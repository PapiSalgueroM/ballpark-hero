// Round 1540 fixer 3, item 7: debug prints only (no draw), applied to the runner's checkout and restored by the request line.
import fs from 'node:fs';
const edit = (file, from, to) => {
  const src = fs.readFileSync(file, 'utf8');
  if (src.split(from).length !== 2) { console.error(`dbg7: anchor not once in ${file}: ${from.slice(0, 60)}`); process.exit(2); }
  fs.writeFileSync(file, src.replace(from, to));
};
edit('src/lib/nbaFrontOffice.ts',
  '        const worst = [...t.players].sort((a, b) => a.ovr - b.ovr)[0];\n',
  '        const worst = [...t.players].sort((a, b) => a.ovr - b.ovr)[0];\n        console.log(`DBG7 CUT ${league.season} ${t.abbr} ${worst.name} ovr ${worst.ovr} years ${worst.years} roster ${t.players.length}`);\n');
edit('src/lib/nbaFrontOffice.ts',
  '  league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);\n',
  '  { const s7 = [...league.freeAgents].sort((a, b) => b.ovr - a.ovr); for (const p7 of s7.slice(30)) console.log(`DBG7 DROP ${league.season} ${p7.name} ovr ${p7.ovr} pool ${s7.length}`); }\n  league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);\n');
edit('src/lib/gmContracts.ts',
  '        league.teams[sheetClub].players.push({ ...man, years: (d.years ?? 1) + 1, salary: d.salary ?? man.salary });\n',
  '        league.teams[sheetClub].players.push({ ...man, years: (d.years ?? 1) + 1, salary: d.salary ?? man.salary });\n        console.log(`DBG7 SHEET ${league.season} ${sheetClub} ${man.name} ovr ${man.ovr} years ${(d.years ?? 1) + 1} roster ${league.teams[sheetClub].players.length} lowest ${Math.min(...league.teams[sheetClub].players.filter(p => p.id !== man.id).map(p => p.ovr))}`);\n');
console.log('dbg7: three debug prints in');
