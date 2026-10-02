import assert from 'node:assert/strict';

export const MODEL = {
 version: 'nhl-multiyear-candidate-v2',
 seasons: [20242025, 20252026],
 recency: { 20242025: .65, 20252026: 1 },
 prior: { established: 74, shallow: 68, unresolved: 68 },
 measuredRange: [60, 98],
 features: {
  F: { pointsPerGame: [.40, 20], evPointsPerGame: [.35, 20], shotsPerGame: [.15, 20], shootingPct: [.10, 125] },
  D: { pointsPerGame: [.25, 25], evPointsPerGame: [.20, 25], usagePerGame: [.45, 36000], blockedShotsPer60: [.10, 36000] },
  G: { savePct: [1, 500] },
 },
 goalieTimeShrinkSeconds: 36000,
 minReferenceGames: { F: 30, D: 30, G: 15 },
 minReferenceGoalieShots: 400,
};
const finite = v => typeof v === 'number' && Number.isFinite(v) ? v : null;
export const broad = p => p === 'G' ? 'G' : p === 'D' ? 'D' : ['C', 'L', 'R', 'W'].includes(p) ? 'F' : null;
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clip = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const ratio = (n, d) => finite(n) !== null && finite(d) !== null && d > 0 ? n / d : null;
const pct = (values, value) => {
 if (finite(value) === null || !values.length) return null;
 if (values.length === 1) return .5;
 let below = 0, equal = 0;
 for (const v of values) { if (v < value) below++; else if (v === value) equal++; }
 return clip((below + Math.max(0, equal - 1) / 2) / (values.length - 1), 0, 1);
};
function featuresFor(row, realtime) {
 const group = row.kind === 'goalie' ? 'G' : broad(row.positionCode);
 const games = finite(row.gamesPlayed), time = group === 'G' ? finite(row.timeOnIce) : finite(row.timeOnIcePerGame) !== null && games !== null ? row.timeOnIcePerGame * games : null;
 if (group === 'G') return { savePct: { value: finite(row.savePct), exposure: finite(row.shotsAgainst), basis: 'shotsAgainst', timeExposure: time } };
 const common = {
  pointsPerGame: { value: ratio(row.points, games), exposure: games, basis: 'gamesPlayed' },
  evPointsPerGame: { value: ratio(row.evPoints, games), exposure: games, basis: 'gamesPlayed; EV opportunity not isolated' },
 };
 if (group === 'F') return { ...common,
  shotsPerGame: { value: ratio(row.shots, games), exposure: games, basis: 'gamesPlayed' },
  shootingPct: { value: finite(row.shootingPct), exposure: finite(row.shots), basis: 'shots' },
 };
 return { ...common,
  usagePerGame: { value: finite(row.timeOnIcePerGame), exposure: time, basis: 'reported seconds of ice time; usage proxy' },
  blockedShotsPer60: { value: realtime && broad(realtime.positionCode) === group ? finite(realtime.blockedShotsPer60) : null, exposure: time, basis: 'reported seconds of ice time; activity proxy' },
 };
}
export function buildCandidate(data) {
 const { seed, summaries, bios, realtime } = data;
 const stats = new Map(), rt = new Map();
 for (const row of summaries) {
  assert.ok(MODEL.seasons.includes(row.seasonId), 'Only retained dated regular seasons');
  const key = `${row.playerId}|${row.seasonId}`;
  assert.ok(!stats.has(key), 'Unique official identity/season totals');
  stats.set(key, row);
 }
 for (const row of realtime) {
  assert.ok(MODEL.seasons.includes(row.seasonId), 'Realtime has retained dated scope');
  const key = `${row.playerId}|${row.seasonId}`;
  assert.ok(!rt.has(key), 'Unique dated realtime totals');
  rt.set(key, row);
 }
 const refs = {};
 for (const season of MODEL.seasons) for (const group of ['F', 'D', 'G']) {
  const rows = summaries.filter(r => r.seasonId === season && (r.kind === 'goalie' ? 'G' : broad(r.positionCode)) === group && r.gamesPlayed >= MODEL.minReferenceGames[group] && (group !== 'G' || r.shotsAgainst >= MODEL.minReferenceGoalieShots));
  const features = rows.map(r => featuresFor(r, rt.get(`${r.playerId}|${season}`)));
  refs[`${season}|${group}`] = { count: rows.length,
   features: Object.fromEntries(Object.keys(MODEL.features[group]).map(key => [key, features.map(f => f[key]?.value).filter(v => finite(v) !== null)])),
  };
 }
 const identities = new Map();
 for (const row of bios) {
  const key = norm(row.skaterFullName || row.goalieFullName);
  if (!identities.has(key)) identities.set(key, new Map());
  identities.get(key).set(row.playerId, row);
 }
 const output = seed.map(s => {
  const group = broad(s.pos), candidates = [...(identities.get(norm(s.name))?.values() ?? [])].filter(r => (r.kind === 'goalie' ? 'G' : broad(r.positionCode)) === group);
  const key = `${s.team}|${s.name}|${s.pos}`;
  if (candidates.length !== 1) return { ...s, key, rating: MODEL.prior.unresolved, playerId: null, confidence: 0, partial: true, partialReasons: ['identity-unresolved'], basis: 'unmeasured-prior', observations: [] };
  const bio = candidates[0], observations = [], rejected = [];
  for (const season of MODEL.seasons) {
   const row = stats.get(`${bio.playerId}|${season}`);
   if (!row) continue;
   const datedRole = row.kind === 'goalie' ? 'G' : broad(row.positionCode);
   if (datedRole !== group) { rejected.push({ season, role: datedRole }); continue; }
   observations.push({ season, gamesPlayed: row.gamesPlayed, role: datedRole, teamAbbrevs: row.teamAbbrevs, features: featuresFor(row, rt.get(`${bio.playerId}|${season}`)) });
  }
  const firstSeason = finite(bio.firstSeasonForGameType);
  const established = firstSeason !== null && firstSeason < MODEL.seasons[0] && observations.some(r => r.gamesPlayed >= MODEL.minReferenceGames[group] && (group !== 'G' || r.features.savePct.exposure >= MODEL.minReferenceGoalieShots));
  const prior = established ? MODEL.prior.established : MODEL.prior.shallow;
  const featureResults = {}, reasons = [];
  let confidence = 0, percentileSum = 0;
  for (const [feature, [weight, shrink]] of Object.entries(MODEL.features[group])) {
   let exposure = 0, percentileUnits = 0, timeExposure = 0;
   for (const row of observations) {
    const f = row.features[feature], p = pct(refs[`${row.season}|${group}`].features[feature], f.value);
    if (p === null || finite(f.exposure) === null || f.exposure <= 0) continue;
    if (group === 'G' && (finite(f.timeExposure) === null || f.timeExposure <= 0)) continue;
    const e = f.exposure * MODEL.recency[row.season];
    exposure += e; percentileUnits += e * p;
    if (group === 'G' && finite(f.timeExposure) !== null && f.timeExposure > 0) timeExposure += f.timeExposure * MODEL.recency[row.season];
   }
   let c = exposure > 0 ? exposure / (exposure + shrink) : 0;
   if (group === 'G') c = Math.min(c, timeExposure > 0 ? timeExposure / (timeExposure + MODEL.goalieTimeShrinkSeconds) : 0);
   const measuredPercentile = exposure ? percentileUnits / exposure : null;
   featureResults[feature] = { weight, exposure, confidence: c, measuredPercentile, ...(group === 'G' ? { timeExposure } : {}) };
   confidence += weight * c;
   if (measuredPercentile !== null) percentileSum += weight * c * measuredPercentile;
  }
  const target = confidence > 0 ? clip(60 + 38 * percentileSum / confidence, ...MODEL.measuredRange) : null;
  const rating = Math.round(target === null ? prior : prior * (1 - confidence) + target * confidence);
  const current = observations.find(r => r.season === MODEL.seasons[1]);
  if (!current) reasons.push('current-season-unmeasured');
  else if (current.gamesPlayed < MODEL.minReferenceGames[group]) reasons.push('small-current-season-sample');
  if (firstSeason === null || firstSeason >= MODEL.seasons[1]) reasons.push('limited-career-history');
  if (confidence < .6) reasons.push('low-opportunity-confidence');
  if (Object.values(featureResults).some(f => f.confidence === 0)) reasons.push('missing-feature-opportunity');
  if (rejected.length) reasons.push('dated-role-mismatch');
  if (group === 'D') reasons.push('defensive-impact-unmeasured', 'usage-and-activity-proxies');
  if (group === 'G') reasons.push('shot-quality-unmeasured');
  return { ...s, key, rating, playerId: bio.playerId, confidence, partial: reasons.length > 0, partialReasons: reasons,
   basis: confidence === 0 ? 'unmeasured-prior' : group === 'F' ? 'offensive-production' : group === 'D' ? 'offense-usage-proxy' : 'save-rate-proxy',
   prior, established, firstSeasonForGameType: firstSeason, featureResults, observations, rejected, measuredTarget: target };
 });
 assert.equal(output.length, seed.length, 'Pool size held');
 assert.equal(new Set(output.map(p => p.key)).size, output.length, 'Unique seeded identities');
 for (const row of output) assert.ok(Number.isInteger(row.rating) && row.rating >= 0 && row.rating <= 99, 'Bounded integer simulation grade');
 return { output, refs, model: MODEL };
}

export const fictionalSalaryFor = ovr => Math.round(Math.max(.7, (ovr - 70) * .4) * 10) / 10;
export function openingPrices(output) {
 const prices = new Map(), clubs = {};
 for (const team of [...new Set(output.map(p => p.team))]) {
  const rows = output.filter(p => p.team === team);
  const originalTenths = Math.round(rows.reduce((n, p) => n + fictionalSalaryFor(p.ovr), 0) * 10), floors = rows.length * 7, surplus = originalTenths - floors;
  assert.ok(surplus >= 0, 'Opening fictional budget covers current floors');
  const demand = rows.map(p => Math.max(0, fictionalSalaryFor(p.rating) - .7)), total = demand.reduce((n, v) => n + v, 0);
  assert.ok(total > 0, 'Opening simulation allocation has demand');
  const raw = rows.map((p, index) => ({ p, index, amount: surplus * demand[index] / total }));
  const rest = surplus - raw.reduce((n, r) => n + Math.floor(r.amount), 0);
  const extras = new Set([...raw].sort((a, b) => b.amount % 1 - a.amount % 1 || a.p.key.localeCompare(b.p.key)).slice(0, rest).map(r => r.index));
  for (const r of raw) prices.set(r.p.key, (7 + Math.floor(r.amount) + (extras.has(r.index) ? 1 : 0)) / 10);
  const candidateFormula = Math.round(rows.reduce((n, p) => n + fictionalSalaryFor(p.rating), 0) * 10) / 10;
  const normalized = Math.round(rows.reduce((n, p) => n + prices.get(p.key), 0) * 10) / 10;
  assert.equal(Math.round(normalized * 10), originalTenths, 'Exact club opening fictional payroll held');
  clubs[team] = { original: originalTenths / 10, directNewFormula: candidateFormula, proposalNormalized: normalized,
   multiplier: surplus / (total * 10), rows: rows.length };
 }
 return { prices: Object.fromEntries(prices), clubs };
}
