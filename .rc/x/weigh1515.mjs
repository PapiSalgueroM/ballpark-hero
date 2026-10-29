// Round 1515 weight probe (never committed): the gzipped bytes of the chunks that hold the changed modules, in two
// builds. Usage: node weigh1515.mjs <dist A> <dist B>. Prints, per marker, the chunk holding it in each build and
// its gzipped size, then the delta. Markers: the recovery module (dukb-set-aside-seen), the card (Leave it aside),
// the entry chunk named by index.html, and the Club Manager hook (cm-show-slots lives on the page; the hook names
// 'This browser would not save the switch').
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const [A, B] = process.argv.slice(2);
const markers = [
  ['recovery', 'dukb-set-aside-seen'],
  ['card', 'Leave it aside'],
  ['cm hook', 'This browser would not save the switch'],
];
function scan(dist) {
  const dir = path.join(dist, 'assets');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  const text = new Map(files.map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
  const gz = f => zlib.gzipSync(fs.readFileSync(path.join(dir, f))).length;
  const out = {};
  for (const [name, m] of markers) {
    const hit = files.filter(f => text.get(f).includes(m));
    out[name] = hit.map(f => ({ f, raw: text.get(f).length, gz: gz(f) }));
  }
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const entry = [...html.matchAll(/assets\/([^"']+\.js)/g)].map(x => x[1]);
  out.entry = entry.map(f => ({ f, raw: text.get(f)?.length ?? 0, gz: gz(f) }));
  out.allJsGz = files.reduce((s, f) => s + gz(f), 0);
  return out;
}
const a = scan(A), b = scan(B);
for (const k of [...markers.map(m => m[0]), 'entry']) {
  const sa = a[k].reduce((s, x) => s + x.gz, 0), sb = b[k].reduce((s, x) => s + x.gz, 0);
  const ra = a[k].reduce((s, x) => s + x.raw, 0), rb = b[k].reduce((s, x) => s + x.raw, 0);
  console.log(`${k}: A ${a[k].map(x => x.f).join(',')} gz ${sa} raw ${ra} | B ${b[k].map(x => x.f).join(',')} gz ${sb} raw ${rb} | delta gz ${sb - sa} raw ${rb - ra}`);
}
console.log(`all js gz: A ${a.allJsGz} B ${b.allJsGz} delta ${b.allJsGz - a.allJsGz}`);
