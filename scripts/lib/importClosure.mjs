/* The files a module reaches through its imports, read as code.

   Round 674. Two fences need to know which source files a test row renders
   without running it: simRankedRecorder (which boards a daily reload driver
   draws, so it knows which finished pages must carry a board's own free play
   line) and simDailyReload (which rows a swapped module can reach, so a swap
   control judges only those rows and its verdict cannot hang on how busy the
   machine is). One reader for both.

   Imports are read from the code with comments stripped: static `from '...'`,
   side effect `import '...'` and dynamic `import('...')`. `@/` resolves to
   src/, a relative path to the importing file's folder, each tried as
   written, then with .ts, .tsx, /index.ts and /index.tsx. A bare package
   name is not followed (nothing in node_modules is a source file here). An
   import.meta.glob is not followed either; a driver file names its page by
   a plain import. */
import fs from 'node:fs';
import path from 'node:path';
import { stripComments } from './readSource.mjs';

export function importReader(root) {
  const cache = new Map();
  const resolveImport = (fromRel, spec) => {
    let base;
    if (spec.startsWith('@/')) base = `src/${spec.slice(2)}`;
    else if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
    else return null;
    for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
      if (!/\.tsx?$/.test(cand)) continue;
      const abs = path.join(root, cand);
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return cand;
    }
    return null;
  };
  const importsOf = rel => {
    if (!cache.has(rel)) {
      const code = stripComments(fs.readFileSync(path.join(root, rel), 'utf8').split('\r\n').join('\n'));
      const specs = [...code.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s+['"]([^'"]+)['"]/g)].map(m => m[1] ?? m[2] ?? m[3]);
      cache.set(rel, specs.map(s => resolveImport(rel, s)).filter(Boolean));
    }
    return cache.get(rel);
  };
  /* Every repo relative file `rel` reaches, itself included. */
  const closureOf = rel => {
    const seen = new Set([rel]);
    const queue = [rel];
    while (queue.length) for (const next of importsOf(queue.shift())) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    return seen;
  };
  return { resolveImport, importsOf, closureOf };
}
