/* Fixer mutation applier for Round 1558 (runs on the runner; each request line restores with git checkout).
   node .rc/x/mut.mjs <name>   applies one mutation, asserts its anchor occurs exactly once, exits 3 otherwise. */
import fs from 'node:fs';

const M = {
  /* the shared lib never pushes a second-fit finding */
  nosecond: ['scripts/lib/connectionsCrossCheck.mjs', "if (v === true) out.findings.push({ id: board.id, kind: 'second-fit'", "if (v === 'never') out.findings.push({ id: board.id, kind: 'second-fit'"],
  /* the shared lib never pushes a not-a-member finding */
  nomember: ['scripts/lib/connectionsCrossCheck.mjs', "if (v === false) out.findings.push({ id: board.id, kind: 'not-a-member'", "if (v === 'never') out.findings.push({ id: board.id, kind: 'not-a-member'"],
  /* the NHL watch reach for points shrinks from 110 to 50 */
  reach: ['scripts/lib/usConnectionsCheck.mjs', 'const reach = { P: 110, G: 60, A: 80, GP: 82 }[c.stat] ?? 0;', 'const reach = { P: 50, G: 60, A: 80, GP: 82 }[c.stat] ?? 0;'],
  /* section 6 compares spellings instead of the record's identity */
  identity: ['scripts/simUsConnectionsFacts.mjs', 'const id = sports[s].checker.identity?.(p) ?? fold(p);', 'const id = p;'],
  /* section 2 never matches a refuted claim on a board */
  norefuted: ['scripts/simUsConnectionsFacts.mjs', 'if (fold(g.theme) === fold(r.label) && g.players.some(p => fold(p) === fold(r.name))) {', 'if (false) {'],
  /* section 3 takes one host as enough */
  onehostok: ['scripts/simUsConnectionsFacts.mjs', '.filter(Boolean)).size >= 2;', '.filter(Boolean)).size >= 1;'],
};
const name = process.argv[2];
const m = M[name];
if (!m) { console.error(`MUTATION ${name} unknown`); process.exit(3); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`MUTATION ${name} ABORTED: anchor occurs ${n} times in ${file}`); process.exit(3); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`MUTATION ${name} applied to ${file}`);
