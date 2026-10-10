/**
 * Round 1213: read values out of the game's own source the way the harnesses do,
 * by bundling a small entry with esbuild and importing the result.
 *
 * The fixture tool and the fixture harness both need the game's clubs for a
 * league (REAL_LEAGUES in src/lib/clubManager.ts), and the harness needs every
 * ledger under src/data as the object the game would import, never as text.
 * Each call bundles into its own uniquely named temp files, so two runs at
 * once cannot read each other's bundle.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');

let serial = 0;

/** Bundle the given entry source (ES module text) and return its exports. */
export async function importBundled(entrySource) {
  serial += 1;
  const stamp = `${process.pid}-${Date.now()}-${serial}`;
  const tmp = os.tmpdir();
  const entry = path.join(tmp, `cm-fixtures-entry-${stamp}.ts`);
  const bundle = path.join(tmp, `cm-fixtures-bundle-${stamp}.mjs`);
  fs.writeFileSync(entry, entrySource);
  try {
    await esbuild.build({
      entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error',
      absWorkingDir: ROOT, alias: { '@': `${ROOT_URL}/src` },
    });
    return await import(pathToFileURL(bundle).href);
  } finally {
    fs.rmSync(entry, { force: true });
    fs.rmSync(bundle, { force: true });
  }
}

/** The game's league rows for a new 2026/27 career: id, name and clubs in the game's spellings. */
export async function gameLeagues() {
  const mod = await importBundled(
    "import { REAL_LEAGUES } from '@/lib/clubManager';\n"
    + 'export const leagues = REAL_LEAGUES.map(l => ({ id: l.id, name: l.name, clubs: [...l.clubs] }));\n',
  );
  return mod.leagues;
}

/** Every ledger file on disk, as a list of { file, exportName, ledger }. Found by listing, not through any registry. */
export function ledgerFilesOnDisk() {
  const dir = path.join(ROOT, 'src', 'data');
  return fs.readdirSync(dir)
    .filter(f => /^clubManager[A-Za-z0-9]+Fixtures2026\.ts$/.test(f))
    .sort()
    .map(f => `src/data/${f}`);
}

export async function loadLedgers(files = ledgerFilesOnDisk()) {
  if (!files.length) return [];
  const lines = files.map((f, i) => `import * as m${i} from '${ROOT_URL}/${f.replace(/\.ts$/, '')}';`);
  lines.push(`export const mods = [${files.map((_, i) => `m${i}`).join(', ')}];`);
  const { mods } = await importBundled(`${lines.join('\n')}\n`);
  return files.map((file, i) => {
    const names = Object.keys(mods[i]);
    return { file, exportNames: names, exportName: names[0] ?? null, ledger: names.length ? mods[i][names[0]] : null };
  });
}
