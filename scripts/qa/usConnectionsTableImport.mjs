/* Round 1574: the US Connections table rows into the repo, and the fence that the live table and the repo agree.

     node scripts/qa/usConnectionsTableImport.mjs init <sport>=<export.json> "<exportedAt>"
       writes scripts/data/<sport>ConnectionsTable-2026-10.json from the lead's read only export (rows of
       { puzzle_id, sort_order, groups_json, h }, h = Postgres's md5(groups_json::text)): every row whose id the
       shipped file (src/data/<sport>ConnectionsPuzzles.ts) does not hold, in sort_order, board = exported. With
       FINGERPRINT=<md5> it first checks the export's fingerprint, md5 of the puzzle_id:h pairs joined by commas
       in sort_order (the one the lead matched against Postgres's own aggregate). It refuses to overwrite a table
       file that already carries a decision (a board that differs from its export, or a tableDecisions line in the
       sport's ledger).

     node scripts/qa/usConnectionsTableImport.mjs drift <sport>=<export.json>[,<sport>=<export.json>]
       a fresh export against the table file, row by row, with the classification the checksummed writers use
       (scripts/lib/connectionsMigration.mjs classify): current (the row holds the file's board), old (it holds the
       exported board, a round's change not applied yet), drifted (neither), missing (in the file, not the export),
       extra (in the export past the shipped file, not in the table file); and (fix-1574) moved, a row whose
       sort_order is not the table file's, which changes what dailyIndex deals. Exit 1 on drifted, missing, extra
       or moved. TABLE_DRIFT_CONTROL=sortorder swaps two rows' sort_order in memory and must end red on moved.
       The lead runs it at each release's live pass on that pass's export: no extra database read.

   Reads the exports and the repo; never the network. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { classify, plainGroups, same } from '../lib/connectionsMigration.mjs';
import { TABLE_SPORTS, tableDoc, tableFile, writeTableDoc } from '../lib/usConnectionsTables.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = { baseball: 'baseballConnectionsPuzzles', nfl: 'nflConnectionsPuzzles', nhl: 'nhlConnectionsPuzzles', nba: 'nbaConnectionsPuzzles' };

/** The shipped file's puzzle ids for a sport. */
export async function fileIds(sport) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'usconntab-'));
  const R = ROOT.split(path.sep).join('/');
  fs.writeFileSync(path.join(tmp, 'e.mjs'), `export { ${FILE[sport]} as b } from '${R}/src/data/${FILE[sport]}.ts';`);
  await build({ entryPoints: [path.join(tmp, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'o.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  const { b } = await import(pathToFileURL(path.join(tmp, 'o.mjs')).href);
  return new Set(b.map(x => x.id));
}

/** md5 of puzzle_id:h joined by commas in sort_order. */
export const fingerprint = rows => crypto.createHash('md5').update([...rows].sort((a, b) => a.sort_order - b.sort_order).map(r => `${r.puzzle_id}:${r.h}`).join(','), 'utf8').digest('hex');

const parts = arg => (arg ?? '').split(',').filter(Boolean).map(p => { const [s, f] = p.split('='); if (!TABLE_SPORTS[s] || !f) throw new Error(`not <sport>=<file>: ${p}`); return [s, f]; });

/** A fresh export against the table file: { current, old, drifted, missing, extra }. */
export async function driftOf(sport, rows) {
  const doc = tableDoc(ROOT, sport);
  if (!doc) throw new Error(`no table file for ${sport}: ${tableFile(ROOT, sport)}`);
  const plan = { [sport]: doc.rows.map(r => ({ id: r.puzzle_id, olds: [r.exported], next: r.board })) };
  const c = classify({ plan, exports: { [sport]: rows }, acceptDrifted: [] });
  const strip = xs => xs.map(x => x.slice(sport.length + 1));
  const known = new Set(doc.rows.map(r => r.puzzle_id));
  const ids = await fileIds(sport);
  return {
    current: strip(c.already),
    old: c.rows.map(r => r.id),
    drifted: strip(c.drifted),
    missing: strip(c.missing),
    extra: rows.map(r => r.puzzle_id).filter(id => !known.has(id) && !ids.has(id)),
    /* fix-1574: a row whose sort_order is not the table file's changes what dailyIndex deals on every day */
    moved: doc.rows.filter(r => { const x = rows.find(y => y.puzzle_id === r.puzzle_id); return x && Number(x.sort_order) !== r.sort_order; }).map(r => r.puzzle_id),
  };
}

const step = process.argv[2];
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (step === 'init') {
    const [[sport, file]] = parts(process.argv[3]);
    const exportedAt = process.argv[4];
    if (!exportedAt) { console.error('usage: init <sport>=<export.json> "<exportedAt>"'); process.exit(2); }
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    const fp = fingerprint(rows);
    if (process.env.FINGERPRINT && process.env.FINGERPRINT !== fp) { console.error(`STOP: the export's fingerprint is ${fp}, not ${process.env.FINGERPRINT}`); process.exit(1); }
    const orders = rows.map(r => r.sort_order);
    if (new Set(orders).size !== orders.length) { console.error('STOP: two rows share a sort_order, so the dealing order would depend on the database'); process.exit(1); }
    const old = tableDoc(ROOT, sport);
    const ledgerFile = path.join(ROOT, 'scripts', 'data', `${sport}ConnectionsVerified-2026-10.json`);
    const decisions = fs.existsSync(ledgerFile) ? (JSON.parse(fs.readFileSync(ledgerFile, 'utf8')).tableDecisions ?? []).length : 0;
    if (old && (decisions || old.rows.some(r => !same(r.exported, r.board)))) { console.error(`STOP: ${tableFile(ROOT, sport)} already carries decisions; a new export is checked with drift, never written over them`); process.exit(1); }
    const ids = await fileIds(sport);
    const past = [...rows].sort((a, b) => a.sort_order - b.sort_order).filter(r => !ids.has(r.puzzle_id));
    for (const r of past) if (!/^[0-9a-f]{32}$/.test(String(r.h ?? ''))) { console.error(`STOP: ${r.puzzle_id} has no md5 h in the export`); process.exit(1); }
    const doc = {
      about: `Round 1574. The ${TABLE_SPORTS[sport]} rows past the shipped file (src/data/${FILE[sport]}.ts), as the lead's read only export held them (exported) and as the rounds that decided them leave them (board). Written by scripts/qa/usConnectionsTableImport.mjs init; a board changes only with a tableDecisions line in scripts/data/${sport}ConnectionsVerified-2026-10.json, and reaches the live table only through that round's guarded migration. Nothing under src reads this file.`,
      table: TABLE_SPORTS[sport],
      exportedAt,
      exportFile: path.basename(file),
      fingerprint: fp,
      rows: past.map(r => { const g = plainGroups(r.groups_json); return { puzzle_id: r.puzzle_id, sort_order: r.sort_order, exportedH: r.h, exported: g, board: g }; }),
    };
    writeTableDoc(ROOT, sport, doc);
    console.log(`wrote ${path.relative(ROOT, tableFile(ROOT, sport))}: ${past.length} of ${rows.length} rows (${rows.length - past.length} are the shipped file's), fingerprint ${fp}`);
  } else if (step === 'drift') {
    /* TABLE_DRIFT_CONTROL=sortorder (fix-1574): the first two table file rows found in the first export swap their
       sort_order in memory; the run must end red on moved for both, never green */
    const CONTROL = process.env.TABLE_DRIFT_CONTROL ?? '';
    if (CONTROL && CONTROL !== 'sortorder') { console.error(`unknown TABLE_DRIFT_CONTROL=${CONTROL}`); process.exit(2); }
    let bad = 0;
    let swapped = null;
    let fired = 0;
    for (const [sport, file] of parts(process.argv[3])) {
      const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (CONTROL === 'sortorder' && !swapped) {
        const ids = (tableDoc(ROOT, sport)?.rows ?? []).map(r => r.puzzle_id);
        const [a, b] = ids.map(id => rows.find(r => r.puzzle_id === id)).filter(Boolean);
        if (a && b && a.sort_order !== b.sort_order) {
          [a.sort_order, b.sort_order] = [b.sort_order, a.sort_order];
          swapped = [a.puzzle_id, b.puzzle_id];
          console.log(`TABLE_DRIFT_CONTROL=sortorder: ${sport} ${swapped.join(' and ')} swap their sort_order in the export; this run must end red`);
        }
      }
      const d = await driftOf(sport, rows);
      const say = (k, xs) => `${xs.length} ${k}${xs.length ? ` (${xs.join(', ')})` : ''}`;
      console.log(`${sport}: ${say('current', d.current)}; ${say('old', d.old)}; ${say('drifted', d.drifted)}; ${say('missing', d.missing)}; ${say('extra', d.extra)}; ${say('moved (sort_order)', d.moved)}`);
      bad += d.drifted.length + d.missing.length + d.extra.length + d.moved.length;
      if (swapped) fired += d.moved.filter(id => swapped.includes(id)).length;
    }
    if (CONTROL) {
      if (!swapped) { console.error('TABLE_DRIFT_CONTROL=sortorder ABORTED: no two table rows with different sort_orders in the export, so a red run would prove nothing'); process.exit(2); }
      if (fired === 2) { console.error(`TABLE_DRIFT_CONTROL=sortorder fired its own rule: moved x2 for ${swapped.join(' and ')}`); process.exit(1); }
      console.log(`TABLE_DRIFT_CONTROL=sortorder did NOT fire its own rule (moved x${fired}); this control proves nothing as the code stands`);
      process.exit(0);
    }
    if (bad) { console.error(`usConnectionsTableImport drift: ${bad} row(s) drifted, missing, extra or moved in sort_order: the live table and the repo disagree; read them before any apply`); process.exit(1); }
    console.log('usConnectionsTableImport drift: green. Every live row past the files holds its table file board or its exported board.');
  } else {
    console.error('usage: init <sport>=<export.json> "<exportedAt>" | drift <sport>=<export.json>[,...]');
    process.exit(2);
  }
}
