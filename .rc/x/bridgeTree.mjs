// Round 1520 attribution: a copy of this tree's src with the round taken out (scripts/lib/cmNoMadeUpNations1520.mjs),
// for CM_RULES_ROOT. Usage: node .rc/x/bridgeTree.mjs /tmp/bridged
import fs from 'node:fs';
import path from 'node:path';
import { withoutMadeUpNations } from '../../scripts/lib/cmNoMadeUpNations1520.mjs';

const out = path.resolve(process.argv[2] || '/tmp/bridged');
fs.mkdirSync(out, { recursive: true });
fs.cpSync('src', path.join(out, 'src'), { recursive: true });
for (const f of ['package.json', 'tsconfig.json', 'tsconfig.app.json', 'index.html']) if (fs.existsSync(f)) fs.copyFileSync(f, path.join(out, f));
if (!fs.existsSync(path.join(out, 'node_modules'))) fs.symlinkSync(path.resolve('node_modules'), path.join(out, 'node_modules'));
for (const f of ['src/lib/clubManager.ts', 'src/lib/clubManagerBoardAsks.ts']) {
  const p = path.join(out, f);
  fs.writeFileSync(p, withoutMadeUpNations(fs.readFileSync(p, 'utf8'), f));
}
console.log(`bridgeTree: ${out} holds this tree's src with Round 1520 taken out`);
