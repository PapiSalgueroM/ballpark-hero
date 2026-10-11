// Reviewer's probe 2: what moved in the entry chunk between two builds (the +56 bytes the integrator measured).
// usage: node probe2.mjs <dist of the base> <dist of the head>
import fs from 'node:fs';
import path from 'node:path';
const entryOf = dist => {
  const dir = path.join(dist, 'assets');
  const files = fs.readdirSync(dir).filter(f => /^index-[\w-]+\.js$/.test(f)).map(f => [f, fs.statSync(path.join(dir, f)).size]).sort((a, b) => b[1] - a[1]);
  const [name, size] = files[0];
  return { name, size, text: fs.readFileSync(path.join(dir, name), 'utf8') };
};
const NAME = /[A-Za-z0-9_$.]+-[A-Za-z0-9_-]{8}\.(?:js|css)/g;
const strip = n => n.replace(/-[A-Za-z0-9_-]{8}\.(js|css)$/, '.$1');
const bag = text => { const m = new Map(); for (const n of text.match(NAME) || []) m.set(strip(n), (m.get(strip(n)) || 0) + 1); return m; };
const [a, b] = [entryOf(process.argv[2]), entryOf(process.argv[3])];
console.log(`base entry ${a.name} ${a.size} bytes; head entry ${b.name} ${b.size} bytes; moved ${b.size - a.size}`);
const [ba, bb] = [bag(a.text), bag(b.text)];
const names = new Set([...ba.keys(), ...bb.keys()]);
let moved = 0;
for (const n of [...names].sort()) {
  const d = (bb.get(n) || 0) - (ba.get(n) || 0);
  if (d !== 0) { moved += 1; console.log(`  chunk name ${n}: ${ba.get(n) || 0} -> ${bb.get(n) || 0} mentions`); }
}
const bare = t => t.replace(NAME, '#');
console.log(`chunk names whose mention count moved: ${moved}; the entry with every chunk name blanked: ${bare(a.text).length} -> ${bare(b.text).length} characters (moved ${bare(b.text).length - bare(a.text).length})`);
const count = dist => fs.readdirSync(path.join(dist, 'assets')).filter(f => f.endsWith('.js')).length;
console.log(`js chunks: ${count(process.argv[2])} -> ${count(process.argv[3])}`);
const base = new Set(fs.readdirSync(path.join(process.argv[2], 'assets')).filter(f => f.endsWith('.js')).map(strip));
const head = new Set(fs.readdirSync(path.join(process.argv[3], 'assets')).filter(f => f.endsWith('.js')).map(strip));
console.log('chunks only on the head: ' + [...head].filter(n => !base.has(n)).join(' '));
console.log('chunks only on the base: ' + [...base].filter(n => !head.has(n)).join(' '));
