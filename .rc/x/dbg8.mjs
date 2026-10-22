// Round 1540 fixer 3, item 8 (the Arenas residual): one debug print only (no draw), applied to the runner's checkout
// and restored by the request line. Prints every NBA restricted sheet with the man's seasons here, his rating, the
// sheet's salary and years, his maximum and next season's cap.
import fs from 'node:fs';
const edit = (file, from, to) => {
  const src = fs.readFileSync(file, 'utf8');
  if (src.split(from).length !== 2) { console.error(`dbg8: anchor not once in ${file}: ${from.slice(0, 60)}`); process.exit(2); }
  fs.writeFileSync(file, src.replace(from, to));
};
const anchor = '      const sheet = raw ? { years: Math.min(NBA_NON_BIRD_MAX_YEARS, raw.years), salary: Math.min(raw.salary, max), picks: [] as number[] } : null;\n';
edit('src/lib/gmContracts.ts', anchor,
  anchor + '      if (sheet) console.log(`DBG8 SHEET ${league.season} ${man.id} svc ${seasonsHere(ledger, league, man)} round ${ledger.men[man.id]?.round} ovr ${man.ovr} salary ${sheet.salary} years ${sheet.years} max ${max} cap ${host.nextCap(league)}`);\n');
console.log('dbg8: one debug print in');
