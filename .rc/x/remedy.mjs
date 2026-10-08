// Round 1138, critic correction 2, MEASUREMENT ONLY and UNCOMMITTED. Builds the tree it runs in with the search box
// swapped for a copy carrying the remedy the critic named (when debounceMs is 0 the search is called at once, not
// through a zero timer, and its answer is committed inside flushSync), then prints where the build is. The box in
// the repo is not changed: the lead rules on the remedy. Run from the repo root: node .rc/x/remedy.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const slash = p => p.split(path.sep).join('/');
const source = fs.readFileSync(path.join(ROOT, 'src/components/game/PlayerAutocomplete.tsx'), 'utf8').replace(/\r\n/g, '\n');
let changed = source;
const swap = (anchor, replacement) => {
  if (changed.split(anchor).length - 1 !== 1) { console.error(`remedy: anchor not found exactly once: ${anchor.slice(0, 70)}`); process.exit(1); }
  changed = changed.replace(anchor, replacement);
};
swap(
  '    debounceRef.current = window.setTimeout(() => {\n      const thisRequestId = ++requestIdRef.current;',
  '    const runSearch = () => {\n      const thisRequestId = ++requestIdRef.current;',
);
swap(
  '    }, debounceMs);\n\n    return () => {',
  '    };\n    if (debounceMs <= 0) runSearch(); else debounceRef.current = window.setTimeout(runSearch, debounceMs);\n\n    return () => {',
);
swap(
  '          setSuggestions(mergeLocal(results));\n          setHeldTag(requestTag);\n          setSearchFailed(Boolean(error));\n          setLoading(false);\n          setHighlightedIndex(-1);',
  '          const commit = () => {\n            setSuggestions(mergeLocal(results));\n            setHeldTag(requestTag);\n            setSearchFailed(Boolean(error));\n            setLoading(false);\n            setHighlightedIndex(-1);\n          };\n          if (debounceMs <= 0) flushSync(commit); else commit();',
);
changed = `import { flushSync } from 'react-dom';\n${changed}`;

const folder = path.join(ROOT, '.sim-control', `remedy-${Date.now()}`);
fs.mkdirSync(folder, { recursive: true });
const copy = path.join(folder, 'PlayerAutocomplete.tsx');
fs.writeFileSync(copy, changed);
fs.writeFileSync(path.join(ROOT, '.sim-control', 'remedy-copy.txt'), slash(copy));
if (process.env.REMEDY_COPY_ONLY) { console.log(`remedy: copy written to ${slash(path.relative(ROOT, copy))}`); process.exit(0); }
const outDir = path.join(folder, 'dist');
const config = [
  `import base from ${JSON.stringify(slash(path.join(ROOT, 'vite.config.ts')))};`,
  'export default env => {',
  "  const cfg = typeof base === 'function' ? base({ ...env, mode: 'production', command: 'build' }) : base;",
  '  return {',
  '    ...cfg,',
  `    root: ${JSON.stringify(slash(ROOT))},`,
  '    resolve: {',
  '      ...cfg.resolve,',
  '      alias: [',
  `        { find: '@/components/game/PlayerAutocomplete', replacement: ${JSON.stringify(slash(copy))} },`,
  `        { find: '@', replacement: ${JSON.stringify(slash(path.join(ROOT, 'src')))} },`,
  '      ],',
  '    },',
  `    build: { ...(cfg.build || {}), outDir: ${JSON.stringify(slash(outDir))}, emptyOutDir: true },`,
  '  };',
  '};',
  '',
].join('\n');
const configPath = path.join(folder, 'remedy.vite.config.ts');
fs.writeFileSync(configPath, config);
const build = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'build', '--config', configPath], { cwd: ROOT, encoding: 'utf8' });
if (build.status !== 0 || !fs.existsSync(path.join(outDir, 'index.html'))) {
  console.error(`remedy: the side build failed\n${`${build.stdout || ''}\n${build.stderr || ''}`.slice(-3000)}`);
  process.exit(1);
}
fs.writeFileSync(path.join(ROOT, '.sim-control', 'remedy-dist.txt'), outDir);
console.log(`remedy: built with the remedy copy into ${slash(path.relative(ROOT, outDir))}`);
