/* Round936: generate or byte-check an unimported simulation candidate. No transport or app binding. */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMlbOpeningRatings, renderMlbOpeningRatings } from './lib/mlbOpeningRatingModel.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'src/data/mlbOpeningRatings2026.ts');
const candidate = buildMlbOpeningRatings(root), source = renderMlbOpeningRatings(candidate);
if (process.argv.includes('--check')) {
  if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8').replace(/\r\n/g, '\n') !== source) throw new Error('MLB unbound candidate differs from the frozen recipe');
  console.log('MLB candidate check:780 identity tuples and30 original opening budgets match the deterministic recipe. All grades partial; no gameplay adoption.');
} else {
  fs.writeFileSync(output, source);
  console.log('MLB candidate written:780 original simulation estimates with bounded lineage. No game imports this candidate.');
}
