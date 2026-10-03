/* Round903: retained official observations for a future simulation model.
   One publisher lineage. This module does not create or apply player ratings. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { GAME_TEAMS, selectTwentySix, caughtGames, gameNames, gamePos, normName } from './mlbFoRecord.mjs';

export const MLB_INPUT_VERSION = 'mlb-opening-observations-v1-2026-10-02';
export const MLB_INPUT_WINDOW = [2024, 2025];
export const MLB_CURRENT_SOURCE_FILES = ['scripts/data/mlbRosters2026.json', 'scripts/data/mlbStats2026.json', 'src/data/mlbFoRosters2026.ts', 'scripts/lib/mlbFoRecord.mjs', 'scripts/genMlbFrontOfficeRoster.mjs', 'scripts/fetchMlbFoRecord.mjs'];
const rootDefault = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const inputHash = value => createHash('sha256').update(value).digest('hex');
export const normalizedInputHash = bytes => inputHash(bytes.toString('utf8').replace(/\r\n/g, '\n'));
const expectedSources = [
  [2024, 'hitting', 742, 762369, '8bb44c15db16a8f8cfe2bccc08e5ad304be72ca38960a101de2454175dabd8c8', '2026-10-02T21:44:55.987Z', '14d2b20bd795f5121df1252ac57d29c26c3250f974fc0359e5e52c8945d59443'],
  [2024, 'pitching', 855, 1305371, 'f00d025220bb6ccacc24784de50c42f4a8135d7690af6026aeace9172dcdb225', '2026-10-02T21:44:56.252Z', '6b00da83798a987789a3c65fbd6eea6d0e0d6e35e372cb4e6ca2137a1b10c3e9'],
  [2025, 'hitting', 765, 785729, 'a1e6455e8758ea0350b07bbcfe0126d1f5e71b56616ff819211677e7a1094935', '2026-10-02T21:44:56.467Z', '6fea92878b82d471b1df2a11e9880407b863188ba67661a60f77875c7538440c'],
  [2025, 'pitching', 873, 1332730, '18085f1ff299af1724d677928fae14166429658971bd62a14dc59e6cb2be5392', '2026-10-02T21:44:56.798Z', '14d9b57d0eab2267d0a116b740812da4c3a5e06ec84fd0e324c34a81175c4da2'],
];
const expectedCurrentHashes = ['c4daa0be7cdeb01d19682482ec8d8027940892d4c27c470dd3af2f304ce761a1', 'a63b71098284d2f4464bb597d8d80c4938fd0199f89b69f12b407f5a4595ce5e', '8bd6fc334f97b5631b0b53fc7189df22290486eb1b52745a090ba3ddb0234bd8', 'cb4188b07fd97dec5e5a539f318c43d7210cab39376a7c712ebfb690542180ef', '13e08d08424bd47b36db5011a6f8a076dc10d5a0152cf4081fd790ead45cfe91', 'be3af6e446b2c1a1d572a33eb5f64921f81c481a723c49012bc43a3986550052'];
const integer = v => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const object = v => v != null && typeof v === 'object' && !Array.isArray(v);
const sameKeys = (v, keys) => object(v) && JSON.stringify(Object.keys(v).sort()) === JSON.stringify([...keys].sort());
const urlFor = (season, group) => `https://statsapi.mlb.com/api/v1/stats?stats=season&group=${group}&season=${season}&sportId=1&gameType=R&playerPool=ALL&limit=5000`;
const roleFor = p => p.g > 0 ? p.gs / p.g >= 0.5 ? 'SP' : p.sv >= 20 ? 'CL' : 'RP' : null;

export function currentMlbInputSelection(root = rootDefault) {
  const record = JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/mlbRosters2026.json'), 'utf8'));
  const stats = JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/mlbStats2026.json'), 'utf8'));
  const caught = caughtGames(stats), byClub = Object.fromEntries(GAME_TEAMS.map(team => [team, selectTwentySix(record.teams[team].players, caught).men]));
  const names = gameNames(byClub);
  return Object.entries(byClub).flatMap(([team, rows]) => rows.map(p => ({ id: p.id, originalName: p.name, name: names.get(p.id), team, pos: p.pos, gamePos: gamePos(p) })));
}

export function mlbInputDiagnostics(tables, current) {
  return MLB_INPUT_WINDOW.map(season => {
    const hitting = new Map(tables[season].hitting.map(p => [p.id, p])), pitching = new Map(tables[season].pitching.map(p => [p.id, p]));
    const matchedIds = [], missingIds = [], roleChanges = [], nameVariants = [];
    for (const p of current) {
      const prior = (p.pos === 'P' ? pitching : hitting).get(p.id);
      (prior ? matchedIds : missingIds).push(p.id);
      if (prior && normName(prior.name) !== normName(p.originalName)) nameVariants.push({ id: p.id, current: p.originalName, prior: prior.name });
      const observed = pitching.get(p.id), role = observed && roleFor(observed);
      if (p.pos === 'P' && role && role !== p.gamePos) roleChanges.push({ id: p.id, current: p.gamePos, prior: role });
    }
    return { season, matchedIds, missingIds, roleChanges, nameVariants };
  });
}

export function validateMlbOpeningRatingInputs(input, root = rootDefault) {
  const errors = [], reject = (condition, code) => { if (!condition) errors.push(code); };
  if (!object(input)) return { valid: false, errors: ['input-object'] };
  reject(input.version === MLB_INPUT_VERSION && input.schemaVersion === 1, 'version');
  reject(JSON.stringify(input.statsSeasons) === JSON.stringify(MLB_INPUT_WINDOW) && input.rosterSeason === 2026 && input.snapshotDate === '2026-10-02', 'window');
  reject(input.publisherLineages === 1 && input.independentlyVerified === false, 'verification-boundary');
  reject(sameKeys(input.tables, ['2024', '2025']), 'table-seasons');
  if (!Array.isArray(input.sources) || input.sources.length !== 4) return { valid: false, errors: [...errors, 'source-count'] };
  const ids = new Set();
  for (const [index, [season, group, count, bytes, rawHash, retrievedAt, compactHash]] of expectedSources.entries()) {
    const source = input.sources[index], rows = input.tables?.[season]?.[group];
    if (!object(source) || !Array.isArray(rows)) { errors.push('source-or-table-' + index); continue; }
    reject(source.season === season && source.group === group && source.type === 'season' && source.gameType === 'R' && source.playerPool === 'ALL', 'source-scope-' + index);
    reject(source.url === urlFor(season, group), 'source-url-' + index);
    reject(source.status === 200 && source.attempts === 1 && source.redirectsFollowed === 0, 'source-status-' + index);
    reject(source.rawSha256 === rawHash && source.rawBytes === bytes && source.retrievedAt === retrievedAt, 'source-provenance-' + index);
    reject(source.totalSplits === count && source.rowCount === count && rows.length === count, 'source-completeness-' + index);
    reject(source.compactSha256 === compactHash, 'table-snapshot-' + index);
    reject(source.compactSha256 === inputHash(JSON.stringify(rows)), 'table-hash-' + index);
    reject(sameKeys(input.tables[season], ['hitting', 'pitching']), 'stat-groups-' + season);
    ids.clear();
    for (const row of rows) {
      const label = `${season}-${group}-${row?.id}`;
      if (!object(row)) { errors.push('row-object-' + label); continue; }
      const fields = group === 'hitting' ? ['id', 'name', 'pa', 'ops'] : ['id', 'name', 'g', 'gs', 'outs', 'hr', 'bb', 'k', 'sv'];
      reject(sameKeys(row, fields), 'row-fields-' + label);
      reject(integer(row.id) && row.id > 0 && !ids.has(row.id), 'row-identity-' + label); ids.add(row.id);
      reject(typeof row.name === 'string' && row.name.trim().length > 0, 'row-name-' + label);
      if (group === 'hitting') {
        reject(integer(row.pa), 'hitting-opportunity-' + label);
        reject(row.ops === null || (typeof row.ops === 'number' && Number.isFinite(row.ops) && row.ops >= 0), 'hitting-rate-' + label);
      } else {
        reject(['g', 'gs', 'outs', 'hr', 'bb', 'k', 'sv'].every(field => integer(row[field])), 'pitching-counts-' + label);
        reject(row.gs <= row.g, 'pitching-starts-' + label);
      }
    }
  }
  reject(Array.isArray(input.currentSources) && input.currentSources.length === MLB_CURRENT_SOURCE_FILES.length, 'current-source-count');
  if (Array.isArray(input.currentSources)) for (const [index, file] of MLB_CURRENT_SOURCE_FILES.entries()) {
    const source = input.currentSources[index];
    reject(source?.path === file, 'current-source-path-' + index);
    reject(source?.normalizedSha256 === expectedCurrentHashes[index], 'current-source-snapshot-' + index);
    try { reject(source?.normalizedSha256 === normalizedInputHash(fs.readFileSync(path.join(root, file))), 'current-source-drift-' + index); } catch { errors.push('current-source-unavailable-' + index); }
  }
  if (!errors.length) {
    try {
      const current = currentMlbInputSelection(root);
      reject(current.length === 780 && new Set(current.map(p => p.id)).size === 780, 'current780');
      reject(JSON.stringify(input.current780) === JSON.stringify(current), 'current-joins');
      reject(JSON.stringify(input.diagnostics) === JSON.stringify(mlbInputDiagnostics(input.tables, current)), 'dated-diagnostics');
    } catch { errors.push('current-selection-unavailable'); }
  }
  return { valid: errors.length === 0, errors };
}

export function readMlbOpeningRatingInputs(root = rootDefault) {
  const input = JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/mlbOpeningRatingInputs2026.json'), 'utf8'));
  const result = validateMlbOpeningRatingInputs(input, root);
  if (!result.valid) throw new Error('MLB source checkpoint refused: ' + result.errors.join(', '));
  return input;
}
