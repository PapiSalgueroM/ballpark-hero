/* Reviewer mutations for Round 1556 (applied on the runner's checkout only, restored by the request line).
   usage: node .rc/x/mut.mjs <name>; exit 2 if the anchor is missing or not unique. */
import fs from 'node:fs';
const HOST = 'src/lib/gmContractsHostNba.ts';
const M = {
  /* off by one in the dead money filter: his own summer entry survives when it sits first after the carried ones */
  deadoff: [HOST, '(d, i) => i < carried || d.playerId !== h.man.id', '(d, i) => i <= carried || d.playerId !== h.man.id'],
  /* the room making cut forgets the summer roll of its dead money */
  noroll: [HOST, '    rollDeadCap(cut);\n', ''],
  /* the room making loop waives one man too many (club ends at 14) */
  overcut: [HOST, 'while (club.players.length > NBA_ROSTER_MAX) {', 'while (club.players.length >= NBA_ROSTER_MAX) {'],
  /* the man handed back is the pool's line (one year, his free agent ask), not the held man on the sheet's terms */
  poolcopy: [HOST, '  if (line >= 0) league.freeAgents.splice(line, 1);', '  if (line >= 0) Object.assign(h.man, league.freeAgents.splice(line, 1)[0]);'],
  /* the room making cut spares only this arrival, not every arrival of the summer */
  onlyself: [HOST, '.filter(p => !kept.has(p.id))', '.filter(p => p.id !== h.man.id)'],
};
const name = process.argv[2];
if (!M[name]) { console.error(`no mutation ${name}`); process.exit(2); }
const [file, from, to] = M[name];
const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
if (src.split(from).length !== 2) { console.error(`MUTATION ${name} CANNOT APPLY: anchor found ${src.split(from).length - 1} times in ${file}`); process.exit(2); }
const out = src.replace(from, to);
if (out === src) { console.error(`MUTATION ${name} changed nothing`); process.exit(2); }
fs.writeFileSync(file, out);
console.log(`MUTATION ${name} applied to ${file}`);
