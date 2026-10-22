/* Reviewer mutations for Round 1553 (runner lens). Run from the repo root on the runner:
     node .rc/x/mut.mjs <name> [<name> ...]
   Each mutation asserts the text it replaces is there exactly once, else exits 3 (ABORTED).
   The request line restores the tree with git checkout afterwards. */
import fs from 'node:fs';

const MUTS = {
  /* the cross check stops reporting a member who does not fit his own group */
  'member-off': ['scripts/lib/connectionsCrossCheck.mjs',
    "if (v === false) out.findings.push({ id: board.id, kind: 'not-a-member'",
    "if (v === 'never') out.findings.push({ id: board.id, kind: 'not-a-member'"],
  /* the cross check stops reporting a tile that also fits another group */
  'secondfit-off': ['scripts/lib/connectionsCrossCheck.mjs',
    "if (v === true) out.findings.push({ id: board.id, kind: 'second-fit'",
    "if (v === 'never') out.findings.push({ id: board.id, kind: 'second-fit'"],
  /* the two host rule for a season squad member relaxed to one host */
  'twohost-code': ['scripts/lib/soccerConnectionsCheck.mjs',
    'if (hits === lists.length) return true;',
    'if (hits >= 1) return true;'],
  /* data: a stamped member only ONE host lists (ESPN lists Jamie Gittens for Chelsea 2025-26, StatMuse does not) */
  'twohost-data': ['src/data/connectionsPuzzles.ts',
    "players: ['Cole Palmer', 'Reece James', 'Marc Cucurella', 'Enzo Fernández'],",
    "players: ['Jamie Gittens', 'Reece James', 'Marc Cucurella', 'Enzo Fernández'],"],
  /* data: Rooney back in a treble group on puzzle-136, label exactly as the ledger refutes it */
  'refuted-exact': ['src/data/connectionsPuzzles.ts',
    "{ category: 'Won the Puskas Award', players: ['Cristiano Ronaldo', 'Neymar Jr', 'Zlatan Ibrahimović', 'Wendell Lira']",
    "{ category: 'Won the Treble', players: ['Cristiano Ronaldo', 'Neymar Jr', 'Zlatan Ibrahimović', 'Wayne Rooney']"],
  /* data: the same claim, one letter lower case */
  'refuted-case': ['src/data/connectionsPuzzles.ts',
    "{ category: 'Won the Puskas Award', players: ['Cristiano Ronaldo', 'Neymar Jr', 'Zlatan Ibrahimović', 'Wendell Lira']",
    "{ category: 'Won the treble', players: ['Cristiano Ronaldo', 'Neymar Jr', 'Zlatan Ibrahimović', 'Wayne Rooney']"],
  /* the migration's NEW puzzle-10 board carries Rooney in its Ballon d'Or group (the file does not) */
  'mig-drift': ['supabase/migrations/20261022130000_round_1553_connections_truth.sql',
    '"Luka Modrić","Rodri"]',
    '"Luka Modrić","Wayne Rooney"]'],
};

for (const name of process.argv.slice(2)) {
  const m = MUTS[name];
  if (!m) { console.error(`mutation ${name} unknown, ABORTED`); process.exit(3); }
  const [file, from, to] = m;
  const src = fs.readFileSync(file, 'utf8');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`mutation ${name}: "${from}" found ${n} times in ${file}, ABORTED`); process.exit(3); }
  fs.writeFileSync(file, src.replace(from, to));
  console.log(`mutation ${name} applied to ${file}`);
}
