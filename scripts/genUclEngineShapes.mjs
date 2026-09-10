/*
 * Round 520: write src/data/uclEngineShapes.json, the "what Club Manager
 * plays" block of /champions-league-format-history, by running the real
 * engine through src/lib/uclFormatHistoryEngine.ts.
 *
 * Why a generated file rather than an import: the page is a reading page and
 * the engine is 1.2 MB of JavaScript. Same reasoning as genRecordBooks.mjs.
 * scripts/simUclFormatHistory.mjs section 3 recomputes these shapes and fails
 * if this file is stale, so the JSON cannot drift from the engine unnoticed.
 *
 * Run: node scripts/genUclEngineShapes.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const ENTRY = `${TMP}/uclShapes.${process.pid}.entry.mjs`;
const BUNDLE = `${TMP}/uclShapes.${process.pid}.bundle.mjs`;
const OUT = path.join(ROOT, 'src', 'data', 'uclEngineShapes.json');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${ROOT_URL}/src/lib/uclFormatHistoryEngine.ts');
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);
const { lib } = await import(pathToFileURL(BUNDLE).href);
const shapes = lib.clubManagerUclShapes();
if (!Array.isArray(shapes) || shapes.length < 2) {
  console.error(`the engine produced ${Array.isArray(shapes) ? shapes.length : 'no'} era shapes, refusing to write`);
  process.exit(1);
}
const json = JSON.stringify({ generatedBy: 'scripts/genUclEngineShapes.mjs', shapes }, null, 2) + '\n';
const before = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
fs.writeFileSync(OUT, json);
console.log(`${shapes.length} era shapes written to src/data/uclEngineShapes.json${before === json ? ' (unchanged)' : ''}`);
for (const s of shapes) console.log(`  ${s.era.label}: ${s.line}`);
