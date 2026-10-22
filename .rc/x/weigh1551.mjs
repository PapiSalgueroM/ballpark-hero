// Round 1551 weight: gzip bytes of every JS chunk, base dist against head dist, by chunk name.
// node weigh1551.mjs <baseDist> <headDist>
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
const sizes = dir => {
  const m = new Map();
  for (const f of readdirSync(path.join(dir, 'assets'))) {
    if (!f.endsWith('.js')) continue;
    const name = f.replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
    const g = gzipSync(readFileSync(path.join(dir, 'assets', f))).length;
    m.set(name, (m.get(name) ?? 0) + g);
  }
  return m;
};
const base = sizes(process.argv[2]);
const head = sizes(process.argv[3]);
const names = [...new Set([...base.keys(), ...head.keys()])].sort();
const lines = [];
let tb = 0; let th = 0;
for (const n of names) {
  const b = base.get(n) ?? 0; const h = head.get(n) ?? 0;
  tb += b; th += h;
  if (b !== h) lines.push(`${n}: ${b} -> ${h} (${h - b >= 0 ? '+' : ''}${h - b})`);
}
const WATCH = ['ChampOrNot', 'SilverwareSort', 'WhodTheyBeat', 'RankEm', 'HallOfChampions', 'WhatsNew', 'index'];
for (const w of WATCH) lines.push(`watch ${w}: ${base.get(w) ?? 'none'} -> ${head.get(w) ?? 'none'}`);
lines.push(`chunks ${base.size} -> ${head.size}; all js gzip ${tb} -> ${th} (${th - tb >= 0 ? '+' : ''}${th - tb})`);
const out = lines.join('\n');
console.log(out);
if (process.env.RC_OUT) writeFileSync(path.join(process.env.RC_OUT, 'weigh1551.txt'), out + '\n');
console.log('weigh1551: done');
