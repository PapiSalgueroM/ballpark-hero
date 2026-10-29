// Review mutations for Round 1565 (run lens). Applied on the runner only; the request line restores with git checkout.
// Each mode asserts its target text exists first and exits 3 if it does not (a mutation that changes nothing proves nothing).
import fs from 'node:fs';
const mode = process.argv[2];
const edit = (file, from, to, all = false) => {
  const s = fs.readFileSync(file, 'utf8');
  if (!s.includes(from)) { console.log(`MUTATION ${mode} ABORTED: ${file} does not hold ${JSON.stringify(from).slice(0, 80)}`); process.exit(3); }
  const out = all ? s.split(from).join(to) : s.replace(from, to);
  fs.writeFileSync(file, out);
  console.log(`MUTATION ${mode}: ${file}: ${JSON.stringify(from).slice(0, 70)} -> ${JSON.stringify(to).slice(0, 70)}${all ? ` (x${s.split(from).length - 1})` : ''}`);
};
const SNAP = 'scripts/data/connectionsLiveSnapshot.json';
const FILE = 'src/data/connectionsPuzzles.ts';
const CHK = 'scripts/lib/soccerConnectionsCheck.mjs';
if (mode === 'order') {
  // the table's order moves (two appended boards swap sort_order) and the file does not follow
  const j = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  const a = j.rows.find(r => r.puzzle_id === 'crafted-1001'), b = j.rows.find(r => r.puzzle_id === 'crafted-1002');
  if (!a || !b) { console.log('MUTATION order ABORTED'); process.exit(3); }
  [a.sort_order, b.sort_order] = [b.sort_order, a.sort_order];
  fs.writeFileSync(SNAP, JSON.stringify(j, null, 2));
  console.log(`MUTATION order: swapped sort_order of crafted-1001 and crafted-1002 (${a.sort_order}, ${b.sort_order})`);
} else if (mode === 'content') {
  // one unchecked tile of the file changes and the table does not
  edit(FILE, "'Andy Legg'", "'Andy Leggs'");
} else if (mode === 'milanpair') {
  // a one club man (AC Milan only, in the career tables) dealt into "Played for both Milan clubs"
  edit(FILE, "players: ['Zlatan Ibrahimovic', 'Andrea Pirlo', 'Clarence Seedorf', 'Ronaldo Nazario']", "players: ['Zlatan Ibrahimovic', 'Andrea Pirlo', 'Gennaro Gattuso', 'Ronaldo Nazario']");
} else if (mode === 'nopairs') {
  // the Round 1565 checker change undone: a pair word is one club again
  edit(CHK, '.map(club).flatMap(c => PAIRS[c] ?? [c]);', '.map(club);');
} else if (mode === 'athletic') {
  edit(CHK, "athleticclub: 'athleticbilbao',", '');
} else if (mode === 'pgsort') {
  // jsonb key order taken as plain alphabetical (the obvious wrong guess)
  edit('scripts/lib/pgJsonbText.mjs', 'return la !== lb ? la - lb : byteCmp(a, b);', 'return byteCmp(a, b);');
} else if (mode === 'migdrift') {
  // the migration's new board for puzzle-2 is no longer the file's board
  edit('supabase/migrations/20261029120000_round_1565_connections_live.sql', 'Denílson', 'Denilson', true);
} else if (mode === 'unknownman') {
  // a man nobody knows (a manager, never a player) dealt into a checked club group: does anything see it?
  edit(FILE, "players: ['Iñaki Williams', 'Nico Williams', 'Iker Muniain', 'Fernando Llorente']", "players: ['Iñaki Williams', 'Nico Williams', 'Iker Muniain', 'Marcelo Bielsa']");
} else {
  console.log(`unknown mode ${mode}`); process.exit(3);
}
