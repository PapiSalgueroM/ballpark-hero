/* Round 1583: the NBA Connections file boards (nbaconn-001 to 004) against the live table, and the guarded
   migration for the ones this round decided in place.

   The daily is dealt from nba_connections_puzzles; the shipped file (src/data/nbaConnectionsPuzzles.ts) is only the
   offline fallback, and its four ids are also live rows. Round 1574's table tools keep only the rows the file does
   not hold (usConnectionsTableImport.mjs init and drift both skip a file id), so a live nbaconn-002 that differs
   from the file would be invisible to them, and a migration whose old value comes from the file would leave such a
   row alone with a NOTICE while the harness stays green on the file (critic-1583 item 7). So:

     node scripts/qa/nbaConnections1583Migration.mjs compare nba=<export.json>
       each file id's live row, by scripts/lib/connectionsMigration.mjs classify with a plan whose old and new value
       are both the base file's board: every one must come back current. Anything else (drifted, missing) STOPS,
       exit 1, named. COMPARE_CONTROL=edit changes one base board in memory first: it must come back drifted, exit 1.
       Run it on the lead's export before any decision, and again on the fresh export of the apply day.

   The base is BASE, the commit this round's branch was cut from (Round 1574's closed head, carrying 1567's).
   Reads git, the export and the repo; never the network. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { classify } from '../lib/connectionsMigration.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const BASE = 'b4a331a9cb1db7411b91538eaeaf29385d2ce3a9';
export const TABLE = 'nba_connections_puzzles';
const FILE = 'src/data/nbaConnectionsPuzzles.ts';

/** The file's boards now (rev null) or at a commit: [{ id, groups: [{ theme, players, difficulty }] }]. */
export async function boardsAt(rev) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r1583mig-'));
  const R = ROOT.split(path.sep).join('/');
  let at = `${R}/${FILE}`;
  if (rev) {
    at = path.join(tmp, 'nbaConnectionsPuzzles.ts');
    fs.writeFileSync(at, execFileSync('git', ['show', `${rev}:${FILE}`], { cwd: ROOT, maxBuffer: 1 << 26 }));
    at = at.split(path.sep).join('/');
  }
  fs.writeFileSync(path.join(tmp, 'e.mjs'), `export { nbaConnectionsPuzzles as b } from '${at}';`);
  await build({ entryPoints: [path.join(tmp, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'o.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  const { b } = await import(pathToFileURL(path.join(tmp, 'o.mjs')).href);
  return b.map(x => ({ id: x.id, groups: x.groups.map(g => ({ theme: g.theme, players: [...g.players], difficulty: g.difficulty })) }));
}

/** The file ids' live rows against the base file: { already, drifted, missing } from classify. */
export async function compareFileRows(rows, { control = '' } = {}) {
  const base = await boardsAt(BASE);
  if (control === 'edit') {
    const g = base[1]?.groups[2];
    if (!g || !g.players.length) throw new Error('COMPARE_CONTROL=edit: no base board to edit, ABORTED');
    g.players = [...g.players.slice(1), g.players[0]];
    console.log(`COMPARE_CONTROL=edit: ${base[1].id} "${g.theme}" reordered in memory; it must come back drifted`);
  }
  const plan = { nba: base.map(b => ({ id: b.id, olds: [b.groups], next: b.groups })) };
  const c = classify({ plan, exports: { nba: rows }, acceptDrifted: [] });
  const strip = xs => xs.map(x => x.slice('nba:'.length));
  return { ids: base.map(b => b.id), already: strip(c.already), drifted: strip(c.drifted), missing: strip(c.missing) };
}

const step = process.argv[2];
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (step === 'compare') {
    const [s, file] = String(process.argv[3] ?? '').split('=');
    if (s !== 'nba' || !file) { console.error('usage: compare nba=<export.json>'); process.exit(2); }
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    let r;
    try { r = await compareFileRows(rows, { control: process.env.COMPARE_CONTROL ?? '' }); } catch (e) { console.error(e.message); process.exit(2); }
    const say = (k, xs) => `${xs.length} ${k}${xs.length ? ` (${xs.join(', ')})` : ''}`;
    console.log(`nba file ids ${r.ids.join(', ')} against ${path.basename(file)}: ${say('current', r.already)}; ${say('drifted', r.drifted)}; ${say('missing', r.missing)}`);
    if (r.drifted.length || r.missing.length || r.already.length !== r.ids.length) {
      console.error('STOP: a file id\'s live row is not the base file\'s board. Read it in the export: the live row is what gets decided, and its board joins the migration\'s old values.');
      process.exit(1);
    }
    console.log('nbaConnections1583Migration compare: green. Every file id\'s live row holds the base file\'s board.');
  } else {
    console.error('usage: compare nba=<export.json>');
    process.exit(2);
  }
}
