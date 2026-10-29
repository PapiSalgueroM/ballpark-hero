/* Reviewer mutation script (runner only, never committed). node .rc/x/rvmut.mjs <name>
   Applies ONE mutation in place; the request line restores the tree with git checkout afterwards.
   Exit 3 (ABORTED) when the string a mutation changes is not in the file, so a green run proves something. */
import fs from 'node:fs';

const MUTS = {
  /* off by one: a dated club group drops its last counted season */
  clubasof: ['scripts/lib/usConnectionsCheck.mjs', 'Number(s.slice(0, 4)) <= c.asOf', 'Number(s.slice(0, 4)) < c.asOf'],
  /* dropped case: the NHL watch forgets goalie wins while WATCHED still declares it */
  watchwins: ['scripts/lib/usConnectionsCheck.mjs', "case 'wins': return m.pos === 'G' && (m.wins ?? 0) + 45 >= c.min", "case 'wins-dropped': return m.pos === 'G' && (m.wins ?? 0) + 45 >= c.min"],
  /* dropped filter: the shared classify lets a drifted row into the checksummed payload */
  classifydrop: ['scripts/lib/connectionsMigration.mjs', 'if (!acceptDrifted.includes(r.id)) continue;', 'if (false) continue;'],
  /* swapped argument: the plan writes the exported board over the decided one */
  planswap: ['scripts/qa/usConnections1574Migration.mjs', 'olds: [r.exported], next: r.board', 'olds: [r.board], next: r.exported'],
};

const name = process.argv[2];
if (name === 'tablereorder') {
  /* a later edit of the table file (two names of nhlconn-009's first group swapped): harmless to a player, but it
     shows whether anything ties the migration (written at ROUND_FILES) to the board the harness now holds */
  const f = 'scripts/data/nhlConnectionsTable-2026-10.json';
  const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
  const row = doc.rows.find(r => r.puzzle_id === 'nhlconn-009');
  if (!row) { console.error('MUT tablereorder ABORTED: no nhlconn-009'); process.exit(3); }
  const p = row.board[0].players;
  [p[0], p[1]] = [p[1], p[0]];
  const { pathToFileURL } = await import('node:url');
  const { tableText } = await import(pathToFileURL(`${process.cwd()}/scripts/lib/usConnectionsTables.mjs`).href);
  fs.writeFileSync(f, tableText(doc));
  console.log(`MUT tablereorder applied: nhlconn-009 group 0 now ${p.join(', ')}`);
  process.exit(0);
}
if (name === 'tie') {
  /* does the migration (plan at ROUND_FILES) write the boards the tree's table file holds? */
  const { pathToFileURL } = await import('node:url');
  const mig = await import(pathToFileURL(`${process.cwd()}/scripts/qa/usConnections1574Migration.mjs`).href);
  const lib = await import(pathToFileURL(`${process.cwd()}/scripts/lib/connectionsMigration.mjs`).href);
  const now = new Map(mig.tableAt(null).rows.map(r => [r.puzzle_id, r.board]));
  const off = mig.plan().filter(r => !lib.same(r.next, now.get(r.id))).map(r => r.id);
  if (off.length) { console.error(`TIE: ${off.length} migration rows write a board the tree's table file no longer holds: ${off.join(', ')}`); process.exit(1); }
  console.log(`TIE: all ${mig.plan().length} migration rows write the tree's table boards`);
  process.exit(0);
}
if (name === 'watchprobe') {
  /* an active goalie 25 wins short of a wins group must be watched */
  const { pathToFileURL } = await import('node:url');
  const lib = await import(pathToFileURL(`${process.cwd()}/scripts/lib/usConnectionsCheck.mjs`).href);
  const ck = lib.makeUsChecker(process.cwd(), 'nhl').checker;
  const c = ck.criterion('Goalies with 400 career wins');
  const w = ck.watch('Andrei Vasilevskiy', c);
  console.log(`WATCHPROBE: kind ${c?.kind}, watched set has it ${ck.watched.has(c?.kind)}, watch(Vasilevskiy) = ${JSON.stringify(w)}`);
  process.exit(w ? 0 : 1);
}
const m = MUTS[name];
if (!m) { console.error(`MUT ${name}: unknown`); process.exit(3); }
const [file, from, to] = m;
const text = fs.readFileSync(file, 'utf8');
const n = text.split(from).length - 1;
if (n !== 1) { console.error(`MUT ${name} ABORTED: "${from}" occurs ${n} times in ${file}`); process.exit(3); }
fs.writeFileSync(file, text.replace(from, to));
console.log(`MUT ${name} applied to ${file}`);
