/* Round 1571: bundle a copy of src/lib/playerBingo.ts against the fixture
   client (scripts/lib/bingoFixtureClient.mjs) and import it.

   loadBingoLib({ root, libSource, label, tmp, extraSources })
     root          the worktree root ('@/x' resolves to <root>/src/x)
     libSource     the text of playerBingo.ts to bundle (head's file, BASE's
                   file read with git show, or a patched copy for a control)
     label         a file name stem for the bundle inside tmp
     tmp           a folder the caller made with fs.mkdtempSync (never a fixed
                   name in os.tmpdir(): the harness temp file race)
     extraSources  optional { '@/data/x.json': text } overrides, so a control
                   can feed the lib an edited derived file without touching
                   the tree
   Returns the bundle's exports (fetchBingoData, buildCriteria, generateBoard,
   buildDeck, isAcademyRow, isSameMan, MIN_TILE_SUPPORT and the whoAmI
   helpers). */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

export async function loadBingoLib({ root, libSource, label, tmp, extraSources = {} }) {
  const libFile = path.join(tmp, `${label}.playerBingo.ts`);
  fs.writeFileSync(libFile, libSource);
  const stub = path.join(root, 'scripts', 'lib', 'bingoFixtureClient.mjs');
  const entry = path.join(tmp, `${label}.entry.ts`);
  const rel = p => p.replaceAll('\\', '/');
  fs.writeFileSync(entry, [
    `export * from '${rel(libFile)}';`,
    `export { clubKey, normalizeName, primaryNationality, positionGroup } from '@/lib/whoAmI';`,
  ].join('\n'));
  const overrides = new Map();
  for (const [spec, text] of Object.entries(extraSources)) {
    const stem = `${label}.${spec.replace(/[^a-zA-Z0-9.]+/g, '_')}`;
    const file = path.join(tmp, path.extname(spec) ? stem : `${stem}.ts`);
    fs.writeFileSync(file, text);
    overrides.set(spec, file);
  }
  const plugin = {
    name: 'bingo-fixture',
    setup(build) {
      build.onResolve({ filter: /^@\// }, async args => {
        if (args.path === '@/integrations/supabase/client') return { path: stub };
        if (overrides.has(args.path)) return { path: overrides.get(args.path) };
        const resolved = await build.resolve('./src/' + args.path.slice(2), { resolveDir: root, kind: args.kind });
        if (resolved.errors.length) return { errors: resolved.errors };
        return { path: resolved.path };
      });
    },
  };
  const outfile = path.join(tmp, `${label}.bundle.mjs`);
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'error',
    plugins: [plugin],
    absWorkingDir: root,
  });
  if (!globalThis.localStorage) {
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
  return import(pathToFileURL(outfile).href);
}

export function fixtureRows(root, file = 'scripts/data/bingoPoolHistory-2026-10-29.json') {
  const json = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  return json.rows;
}
