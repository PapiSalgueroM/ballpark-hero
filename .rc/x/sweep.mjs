// Round 1521 probe, never committed: set the build up's shares in scene.ts for one runner line.
// node .rc/x/sweep.mjs <forward> <forwardPush> <reset> <resetPush> <keep> <keepPush>
import { readFileSync, writeFileSync } from 'node:fs';
const file = 'src/components/pitch-motion/scene.ts';
const src = readFileSync(file, 'utf8');
const re = /const BUILD = \{[^}]*\};/;
if (!re.test(src)) { console.log('sweep: ABORT, the BUILD line is not in scene.ts'); process.exit(1); }
const [forward, forwardPush, reset, resetPush, keep, keepPush] = process.argv.slice(2).map(Number);
const line = `const BUILD = { forward: ${forward}, forwardPush: ${forwardPush}, reset: ${reset}, resetPush: ${resetPush}, keep: ${keep}, keepPush: ${keepPush} };`;
writeFileSync(file, src.replace(re, line));
console.log(`sweep: ${line}`);
