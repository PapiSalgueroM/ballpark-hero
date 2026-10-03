/* Round936: an unbound original simulation model over the frozen903 source checkpoint.
   Whole-player ability is partial. OPS covers offense; pitching rates omit defense and contact quality. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMlbOpeningRatingInputs, normalizedInputHash } from './mlbOpeningRatingInputs.mjs';
import { GAME_TEAMS, selectTwentySix, caughtGames, gameNames, gamePos, buildPools, rateMan, ageOn } from './mlbFoRecord.mjs';

export const MLB_OPENING_MODEL_VERSION = 'mlb936-candidate-v1-2026-10-02';
export const MLB_OPENING_MODEL_WINDOW = { rosterSeason: 2026, rosterDate: '2026-09-27', statsSeasons: [2024, 2025, 2026], preparedAt: '2026-10-02' };
export const MLB_OPENING_MODEL_ASSUMPTIONS = {
  prior: 72, targetCenter: 84, targetSpread: 12, targetMin: 55, targetMax: 98,
  yearWeights: { 2024: 0.4, 2025: 0.65, 2026: 1 },
  cohortMinimum: { HIT: 150, SP: 150, RP: 60 },
  shrinkageOpportunity: { ops: { HIT: 150 }, k: { SP: 150, RP: 60 }, bb: { SP: 150, RP: 60 }, hr: { SP: 300, RP: 120 } },
  pitchingWeights: { k: 0.45, bb: 0.35, hr: 0.2 },
};
const rootDefault = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = MLB_OPENING_MODEL_ASSUMPTIONS;
const finite = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const clampTarget = target => Math.max(config.targetMin, Math.min(config.targetMax, target));
const roleFor = row => row && finite(row.g) && row.g > 0 && finite(row.gs) && row.gs <= row.g ? row.gs / row.g >= 0.5 ? 'SP' : 'RP' : null;
const valueFor = (row, feature) => {
  if (feature === 'ops') return row && finite(row.pa) && row.pa > 0 && finite(row.ops) ? row.ops : null;
  return row && finite(row.outs) && row.outs > 0 && finite(row[feature]) ? 27 * row[feature] / row.outs : null;
};
const moments = values => {
  if (!values.length) return { count: 0, mean: null, sd: null };
  const mean = values.reduce((n, x) => n + x, 0) / values.length;
  const sd = Math.sqrt(values.reduce((n, x) => n + (x - mean) ** 2, 0) / values.length);
  return { count: values.length, mean, sd: sd > 0 ? sd : null };
};

export function buildMlbAnnualCohorts(tables) {
  const cohorts = {};
  for (const [season, table] of Object.entries(tables)) {
    const hit = table.hitting.filter(row => finite(row.pa) && row.pa >= config.cohortMinimum.HIT && valueFor(row, 'ops') !== null);
    const year = { HIT: { ops: moments(hit.map(row => row.ops)) } };
    for (const role of ['SP', 'RP']) {
      const rows = table.pitching.filter(row => roleFor(row) === role && finite(row.outs) && row.outs >= MLB_OPENING_MODEL_ASSUMPTIONS.cohortMinimum[role]);
      year[role] = Object.fromEntries(['k', 'bb', 'hr'].map(feature => [feature, moments(rows.map(row => valueFor(row, feature)).filter(v => v !== null))]));
    }
    cohorts[season] = year;
  }
  return cohorts;
}

export function rateMlbObservations(observations, cohorts, currentGamePos, sampleScale = 1) {
  if (![0.5, 1, 2].includes(sampleScale)) throw new Error('MLB model only supports the reviewed half/default/double sample scales');
  const hitter = !['SP', 'RP', 'CL'].includes(currentGamePos), features = hitter ? ['ops'] : ['k', 'bb', 'hr'];
  const estimates = [], used = new Set(), datedUsage = [];
  for (const [season, row] of Object.entries(observations)) {
    const role = hitter ? 'HIT' : roleFor(row);
    if (role && row && (hitter ? row.pa > 0 : row.outs > 0)) datedUsage.push({ season: Number(season), role });
  }
  for (const feature of features) {
    let exposure = 0, targetSum = 0;
    for (const [season, row] of Object.entries(observations)) {
      const role = hitter ? 'HIT' : roleFor(row), cohort = cohorts[season]?.[role]?.[feature], value = valueFor(row, feature);
      const yearWeight = MLB_OPENING_MODEL_ASSUMPTIONS.yearWeights[season];
      if (!role || !cohort || !Number.isFinite(cohort.sd) || cohort.sd <= 0 || !Number.isFinite(cohort.mean) || value === null || !yearWeight) continue;
      const opportunity = hitter ? row.pa : row.outs;
      const evidence = yearWeight * opportunity / (MLB_OPENING_MODEL_ASSUMPTIONS.shrinkageOpportunity[feature][role] * sampleScale);
      const direction = feature === 'bb' || feature === 'hr' ? -1 : 1;
      const target = clampTarget(config.targetCenter + config.targetSpread * direction * (value - cohort.mean) / cohort.sd);
      exposure += evidence; targetSum += target * evidence; used.add(Number(season));
    }
    if (exposure > 0) {
      const sampleWeight = exposure / (1 + exposure), target = targetSum / exposure;
      estimates.push({ feature, weight: hitter ? 1 : MLB_OPENING_MODEL_ASSUMPTIONS.pitchingWeights[feature], sampleWeight, value: config.prior + sampleWeight * (target - config.prior) });
    }
  }
  const weight = estimates.reduce((n, e) => n + e.weight, 0);
  const raw = weight ? estimates.reduce((n, e) => n + e.value * e.weight, 0) / weight : config.prior;
  const sampleWeight = weight ? estimates.reduce((n, e) => n + e.sampleWeight * e.weight, 0) / weight : 0;
  const currentRole = currentGamePos === 'CL' ? 'RP' : currentGamePos;
  return { ovr: Math.round(raw), raw, sampleWeight, usedSeasons: [...used].sort(), datedUsage, usageMismatch: !hitter && datedUsage.some(r => r.role !== currentRole), basis: weight ? hitter ? 'offensive-production' : 'pitching-production' : 'unmeasured-prior', partial: true };
}

const salaryTenths = ovr => Math.round(Math.max(0.7, (ovr - 70) * 0.84) * 10);
const coreIndices = rows => {
  const sorted = rows.map((p, i) => ({ ...p, i })).sort((a, b) => b.ovr - a.ovr || a.i - b.i);
  const bats = sorted.filter(p => !['SP', 'RP', 'CL'].includes(p.pos)).slice(0, 8);
  const rotation = sorted.filter(p => p.pos === 'SP').slice(0, 3);
  const bullpen = sorted.filter(p => p.pos === 'RP' || p.pos === 'CL').slice(0, 2);
  if (bats.length !== 8 || rotation.length !== 3 || bullpen.length !== 2) throw new Error('MLB candidate cannot preserve the original8/3/2 priced unit');
  return [...bats, ...rotation, ...bullpen].map(p => p.i);
};

export function allocateMlbOpeningPrices(original, rated) {
  const originalCore = new Set(coreIndices(original)), core = coreIndices(rated), coreSet = new Set(core);
  const budgetTenths = original.reduce((n, p, i) => n + (originalCore.has(i) ? salaryTenths(p.ovr) : 7), 0);
  const available = budgetTenths - 13 * 7, weights = core.map(i => salaryTenths(rated[i].ovr)), total = weights.reduce((n, x) => n + x, 0);
  const shares = weights.map((w, i) => ({ i, value: available * w / total })), prices = shares.map(s => Math.floor(s.value));
  const remainder = available - prices.reduce((n, x) => n + x, 0);
  shares.sort((a, b) => (b.value - Math.floor(b.value)) - (a.value - Math.floor(a.value)) || a.i - b.i);
  for (const share of shares.slice(0, remainder)) prices[share.i]++;
  const byIndex = new Map(core.map((index, i) => [index, prices[i]]));
  return { budgetTenths, coreIndices: core, salaries: rated.map((_, i) => (coreSet.has(i) ? byIndex.get(i) : 7) / 10) };
}

export function buildMlbOpeningRatings(root = rootDefault, sampleScale = 1) {
  const input = readMlbOpeningRatingInputs(root);
  const statsBytes = fs.readFileSync(path.join(root, 'scripts/data/mlbStats2026.json'));
  if (normalizedInputHash(statsBytes) !== 'a63b71098284d2f4464bb597d8d80c4938fd0199f89b69f12b407f5a4595ce5e') throw new Error('MLB current statistics checkpoint refused');
  const stats = JSON.parse(statsBytes), record = JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/mlbRosters2026.json')));
  const tables = { ...input.tables, 2026: { hitting: stats.hitting, pitching: stats.pitching } }, cohorts = buildMlbAnnualCohorts(tables);
  const selected = Object.fromEntries(GAME_TEAMS.map(team => [team, selectTwentySix(record.teams[team].players, caughtGames(stats)).men])), names = gameNames(selected), pools = buildPools(stats);
  const maps = Object.fromEntries(Object.entries(tables).map(([year, table]) => [year, { hitting: new Map(table.hitting.map(p => [p.id, p])), pitching: new Map(table.pitching.map(p => [p.id, p])) }]));
  const teams = {}, budgets = {}, originalTeams = {};
  for (const team of GAME_TEAMS) {
    const original = selected[team].map(p => ({ id: p.id, name: names.get(p.id), pos: gamePos(p), age: ageOn(p.birthDate, record.meta.rosterDate), ovr: rateMan(p, pools).ovr })).sort((a, b) => (a.pos === 'SP' ? 1 : ['RP', 'CL'].includes(a.pos) ? 2 : 0) - (b.pos === 'SP' ? 1 : ['RP', 'CL'].includes(b.pos) ? 2 : 0) || b.ovr - a.ovr || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    originalTeams[team] = original;
    const rated = original.map(p => {
      const group = ['SP', 'RP', 'CL'].includes(p.pos) ? 'pitching' : 'hitting';
      const observations = Object.fromEntries(Object.entries(maps).map(([year, table]) => [year, table[group].get(p.id) ?? null]));
      return { ...p, ...rateMlbObservations(observations, cohorts, p.pos, sampleScale) };
    });
    const allocation = allocateMlbOpeningPrices(original, rated); budgets[team] = allocation.budgetTenths;
    teams[team] = rated.map((p, i) => ({ id: p.id, name: p.name, pos: p.pos, ovr: p.ovr, salary: allocation.salaries[i], evidence: { modelVersion: MLB_OPENING_MODEL_VERSION, originKey: `${team}|${p.id}|${p.name}|${p.pos}`, openingOvr: p.ovr, basis: p.basis, partial: true, sampleWeight: Math.round(p.sampleWeight * 10000) / 10000, usedSeasons: p.usedSeasons, datedUsage: p.datedUsage, usageMismatch: p.usageMismatch } }));
  }
  return { version: MLB_OPENING_MODEL_VERSION, window: MLB_OPENING_MODEL_WINDOW, assumptions: MLB_OPENING_MODEL_ASSUMPTIONS, cohorts, teams, budgets, originalTeams };
}

export function renderMlbOpeningRatings(candidate) {
  const q = JSON.stringify;
  return `// GENERATED candidate by scripts/genMlbOpeningRatings.mjs. Not imported by any game.
// Original simulation estimates, not historical statistics or comprehensive ability grades.
// All grades are partial: offense uses OPS; pitching uses K, BB and HR per9 innings.
// Dated-role reference cohorts and sampleWeight express modeled shrinkage, not probability of accuracy.
// Original opening team budgets and13 priced/13 depth-deal shape are held. Future contract pricing is unchanged.
export interface MlbOpeningRatingCandidate {
  ovr: number;
  salary: number;
  evidence: { modelVersion: string; originKey: string; openingOvr: number; basis: 'offensive-production' | 'pitching-production' | 'unmeasured-prior'; partial: true; sampleWeight: number; usedSeasons: number[]; datedUsage: { season: number; role: string }[]; usageMismatch: boolean };
}
export const MLB_OPENING_RATING_CANDIDATE_VERSION = ${q(candidate.version)};
export const MLB_OPENING_RATING_CANDIDATE_WINDOW = ${q(candidate.window)};
export const MLB_OPENING_RATING_CANDIDATE: Record<string, Record<string, MlbOpeningRatingCandidate>> = {
${GAME_TEAMS.map(team => `  ${team}: {\n${candidate.teams[team].map(p => `    ${q(`${p.name}|${p.pos}`)}: ${q({ ovr: p.ovr, salary: p.salary, evidence: p.evidence })},`).join('\n')}\n  },`).join('\n')}
};
`;
}
