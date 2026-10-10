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
 *   A FIGURE is one quantity in one competition in one season. It is USED when two publishers each counted it
 *   (the lead's decision 1: a figure with one source is THIN and is not used). Where the two differ the
 *   STRICTER, lower count is taken. A quantity's target is the lowest per match figure among its used
 *   figures, its range runs from there to the highest count among them. One publisher's figures are never read.
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

/** The FIGURES of one quantity: one per competition and season, each with every publisher's own count of it.
 *  A figure is confirmed when two publishers counted it. strict is its lower count, loose its higher. */
export function figuresOf(rates, quantity) {
  const by = new Map();
  for (const r of readings(rates, quantity)) {
    const row = rates.rows.find(x => x.id === r.id), key = `${row.competition}|${row.season}`;
    if (!by.has(key)) by.set(key, { key, competition: row.competition, season: row.season, readings: [] });
    by.get(key).readings.push(r);
  }
  return [...by.values()].map(f => {
    const sorted = [...f.readings].sort((a, b) => a.perMatch - b.perMatch || a.id.localeCompare(b.id));
    return { ...f, confirmed: new Set(f.readings.map(r => r.publisher)).size >= 2, strict: sorted[0], loose: sorted.at(-1) };
  });
}

/** USED, with its target (the lowest count among the figures two publishers counted) and its range, or THIN with
 *  the reason. A figure one publisher counted is never read here: not for the target and not for the range. */
export function settle(rates, quantity) {
  const all = readings(rates, quantity), figures = figuresOf(rates, quantity);
  const confirmed = figures.filter(f => f.confirmed);
  if (!confirmed.length) return { quantity, used: false, why: `${figures.length} figure(s), none counted by two publishers`, readings: all, figures, confirmed };
  const strict = confirmed.map(f => f.strict).sort((a, b) => a.perMatch - b.perMatch || a.id.localeCompare(b.id));
  const loose = confirmed.map(f => f.loose).sort((a, b) => a.perMatch - b.perMatch || a.id.localeCompare(b.id));
  const figure = confirmed.find(f => f.strict === strict[0]);
  return { quantity, used: true, readings: all, figures, confirmed, figure, target: strict[0], low: strict[0].perMatch, high: loose.at(-1).perMatch };
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
  /* ONE list: the competitions kickOff covers and the names the help prints are the same rows, in the same order. */
  const covered = comps.rows.filter(r => r.verdict === 'yes');
  const coverage = Object.fromEntries(covered.map(r => [r.key, r.key.startsWith('league:') ? 'all' : r.from]));
  return {
    engine, goals, pens, law, coverage, names: covered.map(r => r.name),
    rates: {
      goalReview: n6(goals.low / engine.reviewableGoalsPerMatch), overturn: 1, penaltyReview: 0,
      missedFoulReview: n6(pens.low / engine.awardsPerMatchPerUnitRate), penaltyScores: law.scores, penaltyOnTarget: law.onTarget,
    },
  };
}

export function generatedSource() {
  const d = derive(), g = d.goals, p = d.pens, e = d.engine;
  const frac = t => `${t.count} in ${t.matches} (${t.id})`;
  /* The used figure as both of its publishers count it, the stricter first. */
  const both = s => `${s.figure.competition} ${s.figure.season}, counted by ${s.figure.readings.length} publishers: ${[...s.figure.readings].sort((a, b) => a.count - b.count || a.id.localeCompare(b.id)).map(frac).join(' and ')}`;
  const open = (JSON.parse(text('scripts/data/cmVarRates.json')).owed ?? []).filter(o => o.state === 'open');
  return [
    '/* GENERATED by scripts/genCmVarRates.mjs. Do not edit: change a ledger and run the generator.',
    ' * scripts/simCmVarLedger.mjs fails when this file is not what the ledgers give.',
    ' *',
    ' * In: scripts/data/cmVarRates.json (real football), cmVarCompetitions.json (who uses reviews in 2026-27),',
    ' *     cmVarEngine.json (the engine, measured on a runner).',
    e.provisional ? ' * PROVISIONAL: the engine figures below are not measured yet. Nothing may ship on this file.' : ` * Engine figures: ${e.leagueMatches} league matches, runner result ${e.runner}, head ${e.head}.`,
    ' *',
    ' * A figure (a quantity in one competition in one season) is used only when two publishers counted it; the',
    ' * stricter, lower count is the one derived from. Figures one publisher counted are on file and not read.',
    ...(open.length ? [` * OWED (${open.map(o => o.id).join(', ')}): see owed in scripts/data/cmVarRates.json. CM_VAR_LIVE stays false while this line is here.`] : []),
    ' *',
    ` * Goals ruled out after a review: ${both(g)}.`,
    ` *   The stricter count ${frac(g.target)} = ${n6(g.low)} a match; the range runs to ${n6(g.high)}.`,
    ` *   The engine draws ${e.reviewableGoalsPerMatch} goals a match a review can look at (no penalty, no direct free kick).`,
    ` *   goalReview = ${n6(g.low)} / ${e.reviewableGoalsPerMatch} = ${d.rates.goalReview} a goal. overturn = 1 and penaltyReview = 0: no publisher`,
    ' *   counts reviews that end with the call standing by kind of call, so the game shows none.',
    ` * Penalties awarded after a review: ${both(p)}.`,
    ` *   The stricter count ${frac(p.target)} = ${n6(p.low)} a match; the range runs to ${n6(p.high)}.`,
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
