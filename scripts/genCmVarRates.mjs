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
 *   THE STANDARD FOR A SIMULATION RATE (Round 1303, the lead's decision 1; settleRate below). A READING is one
 *   publisher's own count of a quantity over one full season of a top division under video review. A rate's
 *   quantity is USED when at least two independent publishers each hold a reading AND every reading on file
 *   agrees within a factor of two (AGREE). The publishers may count different leagues or seasons. The target is
 *   the LOWEST reading, the stricter one; the range runs from there to the highest. A quantity one publisher
 *   counted is THIN and refused, and so is one whose readings do not agree: none is left out to make the rest fit.
 *   The season total of penalties is a band, not a rate, and keeps Round 1218's rule (settle below): a FIGURE,
 *   one quantity in one competition in one season, that two publishers each counted, the lower count first.
 *   goals:      the engine draws goals, then a review may take one away. A goal can be reviewed when it is
 *               not a penalty and not a direct free kick. So
 *                 perCounted = target goals ruled out a match / reviewable goals a match (engine, no reviews)
 *               Round 1303 fix: the engine's goals are calibrated on goals that COUNTED, which in real football
 *               are already net of reviews. So the goals a review rules out are drawn ON TOP: a match that reviews
 *               goals draws them 1 / (1 - goalReview x overturn) times as often, and the rate is the chance for
 *               each DRAWN goal:
 *                 goalReview = perCounted / (1 + perCounted)
 *               which rules out the target's goals a match and leaves goals a match where they are. A drawn goal
 *               a review cannot look at is taken back at the same rate with no review, so only the goals a review
 *               can look at are lifted and penalties a match stay where they are too.
 *               No publisher counts reviews that end with the goal standing by kind of call, so the game
 *               shows none: overturn = 1, penaltyReview = 0.
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

/** Round 1303. How far apart the readings of a rate may lie: the highest at most this many times the lowest. */
export const AGREE = 2;
/** Round 1303, THE STANDARD FOR A SIMULATION RATE (the lead's decision 1). USED when two independent publishers
 *  each hold a reading (one full season of a top division under review, in any league) and EVERY reading on file
 *  agrees within a factor of AGREE; the target is the LOWEST reading. THIN with one publisher, and refused when
 *  the readings do not agree: no reading is dropped to make the rest agree. */
export function settleRate(rates, quantity) {
  const all = [...readings(rates, quantity)].sort((a, b) => a.perMatch - b.perMatch || a.id.localeCompare(b.id));
  const publishers = [...new Set(all.map(r => r.publisher))];
  const hosts = new Set(all.map(r => new URL(rates.rows.find(x => x.id === r.id).url).host.replace(/^www\./, '')));
  if (publishers.length < 2 || hosts.size < 2) return { quantity, used: false, why: `${publishers.length} publisher(s) on ${hosts.size} host(s) counted it, a rate needs two`, readings: all, publishers };
  const target = all[0], top = all.at(-1), spread = top.perMatch / target.perMatch;
  if (!(target.perMatch > 0) || spread > AGREE) return { quantity, used: false, why: `its readings do not agree within a factor of two: ${top.count} in ${top.matches} (${top.id}) is ${spread.toFixed(3)} times ${target.count} in ${target.matches} (${target.id})`, readings: all, publishers };
  /* different: do the publishers count more than one league or season? The receipt has to say so when they do. */
  const different = new Set(all.map(r => { const row = rates.rows.find(x => x.id === r.id); return `${row.competition}|${row.season}`; })).size > 1;
  return { quantity, used: true, readings: all, publishers, target, top, low: target.perMatch, high: top.perMatch, spread, different };
}

/** Round 1303, the lead's decision 2. The kinds of review the engine can play, in the engine's own order. */
export const KIND_NAMES = ['goal', 'penalty'];
/** Which kinds the ledger has on, and which the GAME plays. A kind is played when its line under kinds says on,
 *  its rate meets the standard and no open owed entry holds it. An open entry holds the kinds it names under
 *  holds; one that names none holds every kind. On and held at once is refused by scripts/simCmVarLedger.mjs. */
export function kindsOf(rates) {
  const open = (rates.owed ?? []).filter(o => o.state === 'open');
  return KIND_NAMES.map(name => {
    const line = rates.kinds?.[name] ?? {};
    const heldBy = open.filter(o => !Array.isArray(o.holds) || o.holds.includes(name)).map(o => o.id);
    const standard = typeof line.quantity === 'string' && rates.quantities?.[line.quantity]?.modelled === true && settleRate(rates, line.quantity).used === true;
    return { name, on: line.on === true, quantity: line.quantity ?? null, heldBy, standard, played: line.on === true && standard && heldBy.length === 0 };
  });
}

/** The receipts as they should read: each with the hash of its ledger. */
export function stampedReceipts() {
  return LEDGERS.map(({ ledger, receipt }) => {
    const current = JSON.parse(text(receipt));
    /* Round 1303: the rates receipt says, in plain words and for each rate, whose readings it stands on and
       that they count different leagues or seasons when they do. Written here, so it cannot go stale. */
    const standard = ledger === 'scripts/data/cmVarRates.json' ? { standard: standardLines(JSON.parse(text(ledger))) } : {};
    return { file: receipt, body: `${JSON.stringify({ ...current, ...standard, sha256: sha(text(ledger)) }, null, 2)}\n` };
  });
}

const frac = t => `${t.count} in ${t.matches} (${t.id})`;
/** Round 1303. One plain sentence a rate: how many readings by how many publishers, that they count different
 *  leagues or seasons when they do, every reading, and the one derived from. */
export function standardLine(rates, s) {
  const label = rates.quantities[s.quantity]?.label ?? s.quantity;
  if (!s.used) return `${label}: REFUSED, ${s.why}.`;
  const seasons = [...new Set(s.readings.map(r => { const row = rates.rows.find(x => x.id === r.id); return `${row.competition} ${row.season}`; }))];
  return `${label}: ${s.readings.length} readings by ${s.publishers.length} publishers${s.different ? ', who count DIFFERENT leagues and seasons' : ', who count the same league and season'} (${seasons.join('; ')}): ${s.readings.map(frac).join(', ')}. The highest is ${s.spread.toFixed(3)} times the lowest, inside the factor of ${AGREE} the standard allows. Derived from the LOWEST, ${frac(s.target)}.`;
}
export function standardLines(rates) {
  const modelled = Object.entries(rates.quantities).filter(([, q]) => q.modelled).map(([name]) => name);
  return {
    rule: `A simulation rate stands on at least two independent publishers, each counting at least one full season of a top division under video review, whose per match figures agree within a factor of ${AGREE}. It is derived from the lowest of them. No screen prints a rate as a statistic of a real league.`,
    ...Object.fromEntries(modelled.map(name => [name, standardLine(rates, settleRate(rates, name))])),
  };
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

/** Round 1302. The name the help prints for a covered competition. A cup whose reviews start after the round of
 *  16 (the first cup stage the engine plays) is named with its stage, so the help never promises an earlier round. */
const LATE_STAGE = { QF: 'from the quarter finals', SF: 'from the semi finals', F: 'the final only' };
export function helpName(row) {
  return row.key.startsWith('cup:') && Object.hasOwn(LATE_STAGE, row.from) ? `${row.name} (${LATE_STAGE[row.from]})` : row.name;
}

/** Everything the generated file says, as data: the harness reads this too. */
export function derive() {
  const rates = JSON.parse(text('scripts/data/cmVarRates.json'));
  const comps = JSON.parse(text('scripts/data/cmVarCompetitions.json'));
  const engine = JSON.parse(text('scripts/data/cmVarEngine.json'));
  const goals = settleRate(rates, 'goalsRuledOut'), pens = settleRate(rates, 'penaltiesAwarded');
  if (!goals.used || !pens.used) throw new Error(`genCmVarRates: a modelled quantity does not meet the standard for a rate, nothing can be derived (${[goals, pens].filter(s => !s.used).map(s => `${s.quantity}: ${s.why}`).join('; ')})`);
  /* Round 1302, decision 4: all the penalties of a season, the band a match with reviews on is held against. */
  const total = settle(rates, 'penaltiesTotal');
  if (!total.used) throw new Error('genCmVarRates: the season total of penalties is THIN, the band has nothing to stand on');
  const holds = (rates.owed ?? []).filter(o => o.state === 'open').map(o => o.id);
  /* Round 1303: the owed entries a ruling closed (state accepted, with who ruled, when and in what words). */
  const accepted = (rates.owed ?? []).filter(o => o.state === 'accepted').map(o => o.id);
  /* Round 1303, decision 2: the kinds of review the game plays. */
  const kinds = kindsOf(rates);
  const law = penaltyLaw();
  /* ONE list: the competitions kickOff covers and the names the help prints are the same rows, in the same order. */
  const covered = comps.rows.filter(r => r.verdict === 'yes');
  const coverage = Object.fromEntries(covered.map(r => [r.key, r.key.startsWith('league:') ? 'all' : r.from]));
  /* Round 1303 fix (owed goals-level, closed its third way: the engine). The engine's goals are calibrated on goals
     that COUNTED, and real football's counted goals are already net of what reviews took away. So a match that
     reviews goals draws them a little more often, by exactly what its reviews rule out, and the goals that count
     stay level (cmVarGoalLift and settleGoalReviews in src/lib/clubManagerVar.ts). perCounted is the lowest
     reading over the goals that count and could have been looked at. The rate handed to the engine is the chance
     for each goal it DRAWS, perCounted / (1 + perCounted): with goals drawn 1 / (1 - rate) times as often, that
     rules out the lowest reading's goals a match and leaves the goals that count where they are. (A drawn goal a
     review cannot look at, a penalty or a direct free kick, is taken back at the same rate with no review, so
     those are not lifted either.) */
  if (!(engine.reviewableGoalsPerMatch > 0)) throw new Error('genCmVarRates: scripts/data/cmVarEngine.json does not carry reviewableGoalsPerMatch (run scripts/measureCmVarEngine.mjs on a runner and adopt it)');
  const perCounted = goals.low / engine.reviewableGoalsPerMatch;
  return {
    engine, goals, pens, total, holds, accepted, kinds, played: kinds.filter(k => k.played).map(k => k.name), law, coverage, names: covered.map(helpName),
    perCounted: n6(perCounted),
    rates: {
      goalReview: n6(perCounted / (1 + perCounted)), overturn: 1, penaltyReview: 0,
      missedFoulReview: n6(pens.low / engine.awardsPerMatchPerUnitRate), penaltyScores: law.scores, penaltyOnTarget: law.onTarget,
    },
  };
}

export function generatedSource() {
  const d = derive(), g = d.goals, p = d.pens, e = d.engine;
  /* Round 1303: a rate's readings, every one, the lowest first, and whether they count different leagues or seasons. */
  const every = s => `${s.readings.length} readings by ${s.publishers.length} publishers${s.different ? ', who count DIFFERENT leagues and seasons' : ''}: ${s.readings.map(frac).join(', ')}`;
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
    ' * THE STANDARD FOR A RATE (Round 1303): a rate is a parameter of the match engine, never printed as a statistic',
    ' * of a real league. It stands on at least two independent publishers, each counting at least one full season of',
    ` * a top division under video review, whose per match figures agree within a factor of ${AGREE}, and it is derived`,
    ' * from the LOWEST of them. A quantity one publisher counted, or whose readings do not agree, is refused.',
    ...(open.length ? [` * OWED (${open.map(o => `${o.id} holds ${Array.isArray(o.holds) ? o.holds.join(' and ') : 'every kind'}`).join(', ')}): see owed in scripts/data/cmVarRates.json. A kind an open entry holds is not played.`] : []),
    ` * KINDS (Round 1303): ${d.kinds.map(k => `${k.name} ${k.played ? 'PLAYED' : `not played (${[k.on ? '' : 'off in the ledger', k.standard ? '' : 'its rate does not meet the standard', k.heldBy.length ? `held by ${k.heldBy.join(', ')}` : ''].filter(Boolean).join('; ')})`}`).join(', ')}.${d.played.length ? '' : ' No kind is played, so CM_VAR_LIVE stays false.'}`,
    ' *',
    ` * Goals ruled out after a review: ${every(g)}.`,
    ` *   The highest is ${g.spread.toFixed(3)} times the lowest. The lowest, ${frac(g.target)} = ${n6(g.low)} a match, is derived from; the range runs to ${n6(g.high)}.`,
    ` *   The engine draws ${e.goalsPerMatch} goals a match, ${e.reviewableGoalsPerMatch} of them goals a review can look at (no penalty, no direct`,
    ' *   free kick). Its goals are calibrated on goals that COUNTED, which in real football are already net of',
    ' *   reviews, so the goals a review rules out are drawn ON TOP: a match that reviews goals draws them',
    ' *   1 / (1 - goalReview x overturn) times as often (cmVarGoalLift) and goals a match stays level.',
    ` *   For each goal that counts and could have been looked at, ${n6(g.low)} / ${e.reviewableGoalsPerMatch} = ${d.perCounted} are ruled out; for each goal`,
    ` *   the engine DRAWS that is goalReview = ${d.perCounted} / (1 + ${d.perCounted}) = ${d.rates.goalReview}. overturn = 1 and penaltyReview = 0:`,
    ' *   no publisher counts reviews that end with the call standing by kind of call, so the game shows none.',
    ` * Penalties awarded after a review: ${every(p)}.`,
    ` *   The highest is ${p.spread.toFixed(3)} times the lowest. The lowest, ${frac(p.target)} = ${n6(p.low)} a match, is derived from; the range runs to ${n6(p.high)}.`,
    ` *   The engine awards ${e.awardsPerMatchPerUnitRate} penalties a match per unit of rate (measured at ${e.probeRate} a foul).`,
    ` *   missedFoulReview = ${n6(p.low)} / ${e.awardsPerMatchPerUnitRate} = ${d.rates.missedFoulReview} a foul.`,
    ` * The kick: the engine's own penalty law, SHOOTOUT_BASE_RATE ${d.law.scores} and SHOOTOUT_SAVE_SHARE ${d.law.onTarget}.`,
    ` * All penalties of a season (Round 1302, the band a match with reviews on is held against): ${both(d.total)}.`,
    ` *   ${n6(d.total.low)} to ${n6(d.total.high)} a match. scripts/simCmVar.mjs holds the engine's total against it.`,
    ' */',
    `export const CM_VAR_RATES = { goalReview: ${d.rates.goalReview}, overturn: ${d.rates.overturn}, penaltyReview: ${d.rates.penaltyReview}, missedFoulReview: ${d.rates.missedFoulReview}, penaltyScores: ${d.rates.penaltyScores}, penaltyOnTarget: ${d.rates.penaltyOnTarget} } as const;`,
    '',
    '/** Real football, a match: what the harness bands and the help text read. */',
    `export const CM_VAR_REAL = { goalsRuledOut: { low: ${n6(g.low)}, high: ${n6(g.high)} }, penaltiesAwarded: { low: ${n6(p.low)}, high: ${n6(p.high)} }, penaltiesTotal: { low: ${n6(d.total.low)}, high: ${n6(d.total.high)} } } as const;`,
    '',
    "/** Round 1303 (the lead's decision 2). The kinds of review the game asks kickOff for: the kinds the ledger",
    ' *  has on (kinds in scripts/data/cmVarRates.json), each on a rate that meets the standard and held by no open',
    ' *  owed entry. Turning a kind on is a line of that ledger and a run of the generator, never an edit here.',
    ' *  While this list is empty the switch CM_VAR_LIVE stays false. */',
    `export const CM_VAR_KINDS: readonly ('goal' | 'penalty')[] = ${JSON.stringify(d.played).replaceAll('"', "'").replaceAll("','", "', '")};`,
    '',
    '/** Round 1302. What the rates ledger still owes (its open owed entries). An open entry holds the kinds of',
    ' *  review it names: scripts/simCmVarLedger.mjs and scripts/simCmVar.mjs read it. */',
    `export const CM_VAR_HOLDS: readonly string[] = ${JSON.stringify(d.holds).replaceAll('"', "'").replaceAll("','", "', '")};`,
    '',
    '/** Round 1303. The owed entries a ruling closed: each carries who ruled, when and in what words in the ledger. */',
    `export const CM_VAR_ACCEPTED: readonly string[] = ${JSON.stringify(d.accepted).replaceAll('"', "'").replaceAll("','", "', '")};`,
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
