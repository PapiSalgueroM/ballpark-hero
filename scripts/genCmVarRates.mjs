/* Round 1218. The Club Manager review rates and coverage, DERIVED from two ledgers. Nobody types a rate.
 *
 *   node scripts/genCmVarRates.mjs            writes src/data/clubManagerVarRates.ts and stamps both receipts
 *   node scripts/genCmVarRates.mjs --check    writes nothing, exits 1 if a written file would change
 *
 * In:  scripts/data/cmVarRates.json          what a review changes in real top division football, per match
 *      scripts/data/cmVarCompetitions.json   which competitions use a video assistant referee in 2026-27
 *      scripts/data/cmVarEngine.json         what the engine itself does a match (measured on a runner)
 * Out: src/data/clubManagerVarRates.ts       the constants src/lib/clubManagerVar.ts reads
 *      scripts/data/cmVar*.receipt.json      each receipt carries the sha256 of the ledger it vouches for
 *
 * THE ARITHMETIC (every step is in the generated file's header with its numbers):
 *   A quantity is USED when two publishers count it. Its target is the LOWEST per match reading in the rows
 *   (the stricter reading), its range is lowest to highest.
 *   goals:      the engine draws goals, then a review may take one away. A goal can be reviewed when it is
 *               not a penalty and not a direct free kick. So
 *                 ruledOutPerGoal = target goals ruled out a match / reviewable drawn goals a match (engine)
 *               No publisher counts reviews that end with the goal standing by kind of call, so the game
 *               shows none: goalReview = ruledOutPerGoal, overturn = 1, penaltyReview = 0.
 *   penalties:  a review can turn a foul the referee let go into a penalty. Not every foul can become one
 *               (the other side needs a chance in that stretch to hang the kick on, one a side a stretch), so
 *                 missedFoulReview = target penalties awarded a match / awards a match per unit of rate (engine)
 *               where the engine figure is awards a match measured at a probe rate, divided by that rate.
 *   the kick:   taken under the engine's own penalty law, not a number of its own.
 * Hashes are taken over the file's text with LF line endings, so Windows and Linux agree.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (...p) => path.join(ROOT, ...p);
const text = file => fs.readFileSync(at(file), 'utf8').replaceAll('\r\n', '\n');
const sha = s => createHash('sha256').update(s).digest('hex');

export const LEDGERS = [
  { ledger: 'scripts/data/cmVarRates.json', receipt: 'scripts/data/cmVarRates.receipt.json' },
  { ledger: 'scripts/data/cmVarCompetitions.json', receipt: 'scripts/data/cmVarCompetitions.receipt.json' },
];

/** The readings of one quantity: one per row that counts it, with its publisher. */
export function readings(rates, quantity) {
  return rates.rows.filter(row => typeof row.figures?.[quantity] === 'number')
    .map(row => ({ id: row.id, publisher: row.publisher, season: row.season, count: row.figures[quantity], matches: row.matches, perMatch: row.figures[quantity] / row.matches }));
}

/** USED, with its target (the lowest reading) and range, or THIN with the reason. */
export function settle(rates, quantity) {
  const all = readings(rates, quantity);
  const publishers = [...new Set(all.map(r => r.publisher))];
  if (publishers.length < 2) return { quantity, used: false, why: `${publishers.length} publisher(s)`, readings: all };
  const sorted = [...all].sort((a, b) => a.perMatch - b.perMatch || a.id.localeCompare(b.id));
  return { quantity, used: true, publishers, readings: all, target: sorted[0], low: sorted[0].perMatch, high: sorted.at(-1).perMatch };
}

/** The receipts as they should read: each with the hash of its ledger. */
export function stampedReceipts() {
  return LEDGERS.map(({ ledger, receipt }) => {
    const current = JSON.parse(text(receipt));
    return { file: receipt, body: `${JSON.stringify({ ...current, sha256: sha(text(ledger)) }, null, 2)}\n` };
  });
}

function main() {
  const check = process.argv.includes('--check');
  const outputs = [...stampedReceipts()];
  let stale = 0;
  for (const { file, body } of outputs) {
    const now = fs.existsSync(at(file)) ? text(file) : null;
    if (now === body) continue;
    stale += 1;
    if (check) console.log(`genCmVarRates: ${file} is not what the ledgers give. Run node scripts/genCmVarRates.mjs`);
    else { fs.writeFileSync(at(file), body); console.log(`genCmVarRates: wrote ${file}`); }
  }
  if (check && stale) { console.log(`genCmVarRates --check: ${stale} file(s) out of step with the ledgers.`); process.exit(1); }
  console.log(check ? `genCmVarRates --check: ${outputs.length} file(s) in step with the ledgers.` : `genCmVarRates: ${outputs.length} file(s) in step with the ledgers.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
