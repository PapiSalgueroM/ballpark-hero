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

const GENERATED = 'src/data/clubManagerVarRates.ts';
const ENGINE = 'src/lib/clubManager.ts';
const n6 = x => Number(x.toFixed(6));

/** The engine's own penalty kick law, read off its source so a review's penalty has no number of its own. */
export function penaltyLaw() {
  const src = text(ENGINE);
  const base = /export const SHOOTOUT_BASE_RATE = (0\.\d+);/.exec(src), save = /const SHOOTOUT_SAVE_SHARE = (0\.\d+);/.exec(src);
  if (!base || !save) throw new Error('genCmVarRates: the engine penalty law (SHOOTOUT_BASE_RATE, SHOOTOUT_SAVE_SHARE) was not found');
  return { scores: Number(base[1]), onTarget: Number(save[1]) };
}

/** Everything the generated file says, as data: the harness reads this too. */
export function derive() {
  const rates = JSON.parse(text('scripts/data/cmVarRates.json'));
  const comps = JSON.parse(text('scripts/data/cmVarCompetitions.json'));
  const engine = JSON.parse(text('scripts/data/cmVarEngine.json'));
  const goals = settle(rates, 'goalsRuledOut'), pens = settle(rates, 'penaltiesAwarded');
  if (!goals.used || !pens.used) throw new Error('genCmVarRates: a modelled quantity is THIN, nothing can be derived');
  const law = penaltyLaw();
  const coverage = Object.fromEntries(comps.rows.filter(r => r.verdict === 'yes').map(r => [r.key, r.key.startsWith('league:') ? 'all' : r.from]));
  return {
    engine, goals, pens, law, coverage, names: comps.rows.filter(r => r.verdict === 'yes').map(r => r.name),
    rates: {
      goalReview: n6(goals.low / engine.reviewableGoalsPerMatch), overturn: 1, penaltyReview: 0,
      missedFoulReview: n6(pens.low / engine.awardsPerMatchPerUnitRate), penaltyScores: law.scores, penaltyOnTarget: law.onTarget,
    },
  };
}

export function generatedSource() {
  const d = derive(), g = d.goals, p = d.pens, e = d.engine;
  const frac = t => `${t.count} in ${t.matches} (${t.id})`;
  return [
    '/* GENERATED by scripts/genCmVarRates.mjs. Do not edit: change a ledger and run the generator.',
    ' * scripts/simCmVarLedger.mjs fails when this file is not what the ledgers give.',
    ' *',
    ' * In: scripts/data/cmVarRates.json (real football), cmVarCompetitions.json (who uses reviews in 2026-27),',
    ' *     cmVarEngine.json (the engine, measured on a runner).',
    e.provisional ? ' * PROVISIONAL: the engine figures below are not measured yet. Nothing may ship on this file.' : ` * Engine figures: ${e.leagueMatches} league matches, runner result ${e.runner}, head ${e.head}.`,
    ' *',
    ` * Goals ruled out after a review: lowest reading ${frac(g.target)} = ${n6(g.low)} a match, highest ${n6(g.high)}.`,
    ` *   The engine draws ${e.reviewableGoalsPerMatch} goals a match a review can look at (no penalty, no direct free kick).`,
    ` *   goalReview = ${n6(g.low)} / ${e.reviewableGoalsPerMatch} = ${d.rates.goalReview} a goal. overturn = 1 and penaltyReview = 0: no publisher`,
    ' *   counts reviews that end with the call standing by kind of call, so the game shows none.',
    ` * Penalties awarded after a review: lowest reading ${frac(p.target)} = ${n6(p.low)} a match, highest ${n6(p.high)}.`,
    ` *   The engine awards ${e.awardsPerMatchPerUnitRate} penalties a match per unit of rate (measured at ${e.probeRate} a foul).`,
    ` *   missedFoulReview = ${n6(p.low)} / ${e.awardsPerMatchPerUnitRate} = ${d.rates.missedFoulReview} a foul.`,
    ` * The kick: the engine's own penalty law, SHOOTOUT_BASE_RATE ${d.law.scores} and SHOOTOUT_SAVE_SHARE ${d.law.onTarget}.`,
    ' */',
    `export const CM_VAR_RATES = { goalReview: ${d.rates.goalReview}, overturn: ${d.rates.overturn}, penaltyReview: ${d.rates.penaltyReview}, missedFoulReview: ${d.rates.missedFoulReview}, penaltyScores: ${d.rates.penaltyScores}, penaltyOnTarget: ${d.rates.penaltyOnTarget} } as const;`,
    '',
    '/** Real football, a match: what the harness bands and the help text read. */',
    `export const CM_VAR_REAL = { goalsRuledOut: { low: ${n6(g.low)}, high: ${n6(g.high)} }, penaltiesAwarded: { low: ${n6(p.low)}, high: ${n6(p.high)} } } as const;`,
    '',
    '/** The same competitions by the name the help text prints. */',
    `export const CM_VAR_COVERED_NAMES: readonly string[] = ${JSON.stringify(d.names).replaceAll('"', "'").replaceAll("','", "', '")};`,
    '',
    "/** Competitions with reviews in 2026-27, by the engine's own key, to the first stage that has them",
    " *  ('all' for a league). A key that is not here plays without reviews. */",
    `export const CM_VAR_COVERAGE: Readonly<Record<string, string>> = ${JSON.stringify(d.coverage).replaceAll('"', "'").replaceAll("','", "', '").replaceAll("':'", "': '").replace("{'", "{ '").replace("'}", "' }")};`,
    '',
  ].join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  const outputs = [...stampedReceipts(), { file: GENERATED, body: generatedSource() }];
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
