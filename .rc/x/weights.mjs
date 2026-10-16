// Round 1346 probe (never committed): the four US My Career pages' JS weight, base dist against head dist.
// node weights.mjs <baseDist> <headDist>
// For each page chunk: the static import closure (what the route waits for) minus the entry's own closure,
// and the full closure (static plus lazy imports) minus the entry's, raw and gzip bytes.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const PAGES = ['NbaMyCareer', 'NflMyCareer', 'MlbMyCareer', 'NhlMyCareer'];
const STATIC_RE = /(?:from|import)\s*"\.\/([^"]+?\.js)"/g;
const DYN_RE = /import\(\s*"\.\/([^"]+?\.js)"\s*\)/g;
const DEPS_RE = /"assets\/([^"]+?\.js)"/g;

function measure(dist) {
  const assets = path.join(dist, 'assets');
  const files = fs.readdirSync(assets).filter(f => f.endsWith('.js'));
  const src = new Map(files.map(f => [f, fs.readFileSync(path.join(assets, f), 'utf8')]));
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const m = html.match(/src="\/assets\/([^"]+?\.js)"/);
  const entry = m ? m[1] : files.filter(f => f.startsWith('index-')).sort((a, b) => src.get(b).length - src.get(a).length)[0];
  const edges = (f, withDyn) => {
    const s = src.get(f) || '';
    const out = new Set();
    for (const x of s.matchAll(STATIC_RE)) out.add(x[1]);
    if (withDyn) {
      for (const x of s.matchAll(DYN_RE)) out.add(x[1]);
      for (const x of s.matchAll(DEPS_RE)) out.add(x[1]);
    }
    return [...out].filter(x => src.has(x));
  };
  const closure = (start, withDyn) => {
    const seen = new Set([start]);
    const todo = [start];
    while (todo.length) for (const n of edges(todo.pop(), withDyn)) if (!seen.has(n)) { seen.add(n); todo.push(n); }
    return seen;
  };
  const entryStatic = closure(entry, false);
  const size = set => {
    let raw = 0, gz = 0;
    for (const f of set) { const b = Buffer.from(src.get(f)); raw += b.length; gz += zlib.gzipSync(b, { level: 9 }).length; }
    return { raw, gz, n: set.size };
  };
  const out = {};
  for (const p of PAGES) {
    const chunk = files.find(f => f.startsWith(p + '-'));
    if (!chunk) { out[p] = null; continue; }
    const st = new Set([...closure(chunk, false)].filter(f => !entryStatic.has(f)));
    const all = new Set([...closure(chunk, true)].filter(f => !entryStatic.has(f)));
    out[p] = { chunk: size(new Set([chunk])), route: size(st), all: size(all) };
  }
  return { entry, out };
}

const [baseDir, headDir] = process.argv.slice(2);
const base = measure(baseDir);
const head = measure(headDir);
const kb = n => (n / 1024).toFixed(1);
console.log(`entry base ${base.entry}, head ${head.entry}`);
let bad = 0;
for (const p of PAGES) {
  const b = base.out[p], h = head.out[p];
  if (!b || !h) { console.log(`${p}: chunk missing (base ${!!b}, head ${!!h})`); bad++; continue; }
  for (const k of ['chunk', 'route', 'all']) {
    console.log(`${p} ${k}: base ${kb(b[k].raw)} KB raw / ${kb(b[k].gz)} KB gzip (${b[k].n} files), head ${kb(h[k].raw)} / ${kb(h[k].gz)} (${h[k].n}), gzip delta ${(h[k].gz - b[k].gz) >= 0 ? '+' : ''}${h[k].gz - b[k].gz} bytes`);
  }
}
if (bad) { console.log('WEIGHTS: INCOMPLETE'); process.exit(1); }
console.log('WEIGHTS: MEASURED (printed, not banded)');
