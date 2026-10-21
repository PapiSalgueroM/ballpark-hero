// Runner probe: minified and gzipped size of the engine bundle (clubManager.ts and everything it imports) in two
// trees, and of single modules, so the round's weight can be split by where it lives. Not committed.
import { build } from 'esbuild';
import zlib from 'node:zlib';
import path from 'node:path';
import fs from 'node:fs';
const trees = process.argv.slice(2);
for (const root of trees) {
  for (const f of ['src/lib/clubManager.ts', 'src/lib/clubManagerTactics.ts', 'src/hooks/useClubManager.ts']) {
    if (!fs.existsSync(path.join(root, f))) { console.log(`${root} ${f}: absent`); continue; }
    const r = await build({
      entryPoints: [path.join(root, f)], bundle: true, minify: true, write: false, format: 'esm', platform: 'browser',
      logLevel: 'silent', alias: { '@': path.join(root, 'src') }, nodePaths: [path.resolve('node_modules')],
      external: ['react', 'react-dom', 'react/jsx-runtime', '@supabase/*', 'sonner'],
      loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty', '.json': 'json' },
    });
    const code = r.outputFiles[0].contents;
    console.log(`${root} ${f}: ${code.length} minified, ${zlib.gzipSync(code, { level: 9 }).length} gzipped`);
  }
}
