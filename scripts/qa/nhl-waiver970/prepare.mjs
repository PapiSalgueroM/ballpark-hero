import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.env.NHL_WAIVER_NATIVE_ROOT || process.cwd());
const gate = process.env.NHL_WAIVER_NATIVE_GATE && path.resolve(process.env.NHL_WAIVER_NATIVE_GATE);
assert.ok(gate, 'Parent must supply NHL_WAIVER_NATIVE_GATE after integrating and reviewing its final970 source');
assert.notEqual(gate.toLowerCase(), root.toLowerCase(), 'Build only the isolated final source gate');
const dir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(root, 'package.json'));
const { build } = require('esbuild');
const postcss = require('postcss'), tailwind = require('tailwindcss'), autoprefixer = require('autoprefixer');
const loadConfig = require('tailwindcss/loadConfig');
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const normalizedSha = file => createHash('sha256').update(fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(dir, item.name)) : [path.join(dir, item.name)]);
const critical = ['src/components/nhl-front-office/NhlFrontOfficeBoard.tsx', 'src/lib/nhlFrontOffice.ts', 'src/components/nhl-front-office/NhlWaiverReceipt.tsx', 'src/components/nhl-front-office/NhlWaiverReceipt.module.css', 'src/index.css', 'tailwind.config.ts'];
const rootHolds = critical.map(file => ({ file: path.join(root, file), sha256: fs.existsSync(path.join(root, file)) ? sha(path.join(root, file)) : null }));
const gateHolds = [...walk(path.join(gate, 'src')), path.join(gate, 'tailwind.config.ts'), path.join(gate, 'postcss.config.js')].map(file => ({ file, sha256: sha(file) }));
const board = fs.readFileSync(path.join(gate, critical[0]), 'utf8');
assert.match(board, /import\s*\{\s*NhlWaiverReceipt\b[^\n]*from\s*['"]\.\/NhlWaiverReceipt['"]/);
assert.match(board, /<NhlWaiverReceipt\s+event=\{waiverReceipt\}\s+fallbackFocus=\{/);
assert.match(board, /nhlOffseason\(lg, Math\.random, myTeam\)/, 'Keep the969 human-owner offseason argument');
for (const relative of critical) assert.ok(fs.existsSync(path.join(gate, relative)), 'Final source gate file: ' + relative);
const out = path.join(dir, 'built');
fs.mkdirSync(out, { recursive: true });

// Compile from this gate now. A prior dist stylesheet cannot stand in for final source CSS.
const config = loadConfig(path.join(gate, 'tailwind.config.ts'));
config.content = [path.join(gate, 'src/**/*.{ts,tsx}').replaceAll('\\', '/'), path.join(dir, 'entry.tsx').replaceAll('\\', '/')];
const css = await postcss([tailwind(config), autoprefixer()]).process(fs.readFileSync(path.join(gate, 'src/index.css'), 'utf8'), { from: path.join(gate, 'src/index.css'), to: path.join(out, 'base.css') });
fs.writeFileSync(path.join(out, 'base.css'), css.css);
const bundle = await build({ entryPoints: [path.join(dir, 'entry.tsx')], outfile: path.join(out, 'app.js'), bundle: true, format: 'esm', platform: 'browser', jsx: 'automatic', metafile: true, absWorkingDir: gate, nodePaths: [path.join(root, 'node_modules')], alias: {
  '@/hooks/useGameCompletion': path.join(dir, 'completions.ts'), '@/lib/completions': path.join(dir, 'completions.ts'),
  '@/components/game/ShareButtons': path.join(dir, 'share.tsx'), '@': path.join(gate, 'src'),
}, define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.DEV': 'false' }, logLevel: 'warning' });
fs.writeFileSync(path.join(out, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline NHL waiver receipt</title><link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
fs.writeFileSync(path.join(dir, 'build-inputs.json'), JSON.stringify(bundle.metafile, null, 2));
const inputs = Object.keys(bundle.metafile.inputs).map(file => path.resolve(gate, file));
assert.ok(inputs.includes(path.join(gate, critical[0])), 'Actual gate Board bundled');
assert.ok(inputs.includes(path.join(gate, critical[2])), 'Actual receipt component bundled');
assert.ok(inputs.includes(path.join(gate, critical[3])), 'Actual receipt CSS module compiled');
assert.ok(!inputs.some(file => /integrations[\\/]supabase|hooks[\\/]useAuth|contexts[\\/]Auth/.test(file)), 'No application transport imported');
const sourceInputs = inputs.filter(file => file.startsWith(gate + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep)).map(file => ({ file, sha256: sha(file) }));
const ownInputs = ['entry.tsx', 'completions.ts', 'share.tsx', 'prepare.mjs', 'driver.mjs'].map(file => ({ file: path.join(dir, file), sha256: sha(path.join(dir, file)) }));
for (const held of [...gateHolds, ...rootHolds]) assert.equal(fs.existsSync(held.file) ? sha(held.file) : null, held.sha256, 'Preparation preserves source: ' + held.file);
const outputs = ['base.css', 'app.css', 'app.js', 'index.html'].map(file => ({ file: path.join(out, file), sha256: sha(path.join(out, file)) }));
fs.writeFileSync(path.join(dir, 'build-receipt.json'), JSON.stringify({ task: 970, root, gate, builtAt: new Date().toISOString(), rootHolds, gateHolds, sourceInputs, ownInputs, outputs,
  critical: critical.map(file => ({ file, normalizedSha256: normalizedSha(path.join(gate, file)) })),
  cssMethod: 'PostCSS plus gate Tailwind configuration and current gate src/index.css, then actual CSS modules emitted by esbuild. No reused dist CSS.',
  fixtureBoundary: ['completion', 'activity', 'share'],
  sourceScope: 'Actual final970 Board, engine, error boundary and compiled source CSS.968 derived17-player fixture using969 human-owner offseason argument. No full app or live-site claim.' }, null, 2));
console.log('970 native fixture prepared from supplied source gate; CSS and inputs held. Driver remains a separate serial invocation.');
