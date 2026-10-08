/**
 * Ad readiness audit, 2026-10-08, the COPY area. Reads only.
 *
 * For every game in a reskin family: which data does its page reach? Follows
 * the page file's imports (four steps deep, skipping site chrome), and lists
 * the src/data modules, the database tables (.from), the database functions
 * (.rpc) and the edge functions it names. Then every local data module is
 * bundled and each exported list is counted, with the range of any field that
 * looks like a year. That is the pool of facts a Tier C page could state
 * without anyone inventing a number.
 *
 * Writes copy-data-sources.json beside itself. Changes nothing else.
 * Run: node docs/audits/ad-readiness-2026-10-08/copy-data-sources.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const SRC = path.join(ROOT, 'src');
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const routes = JSON.parse(fs.readFileSync(path.join(HERE, 'routes.json'), 'utf8'));

const EXT = ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx'];
const resolve = (from, spec) => {
  let base = null;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  if (!base) return null;
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const e of EXT) if (fs.existsSync(base + e)) return base + e;
  return null;
};
const rel = f => path.relative(SRC, f).replaceAll('\\', '/');
/* Site chrome and plumbing every page shares: following it would list every table on the site. */
const SKIP = /^(components\/(game|ui|seo|layout|auth|ads|home)\/|integrations\/|data\/(gameRegistry|seoMeta|searchKeywords|gameContent)|lib\/(utils|analytics|consent|sportHub|records|relatedGames|leaderboard|dailyRecord|streak)|hooks\/(use-toast|useAuth|useGameNavbarStats|useRevealScroll|useScrollToGame|useRoutePath)|contexts\/)/;
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

function reach(pageFile) {
  const seen = new Set([pageFile]); let frontier = [pageFile];
  const out = { data: new Set(), tables: new Set(), rpcs: new Set(), edge: new Set(), files: 0 };
  for (let depth = 0; depth < 5 && frontier.length; depth += 1) {
    const next = [];
    for (const f of frontier) {
      if (f.endsWith('.json')) continue;
      const src = stripComments(fs.readFileSync(f, 'utf8')); out.files += 1;
      for (const m of src.matchAll(/\.from\(\s*['"`]([a-z0-9_]+)['"`]/g)) out.tables.add(m[1]);
      for (const m of src.matchAll(/\.rpc\(\s*['"`]([a-z0-9_]+)['"`]/g)) out.rpcs.add(m[1]);
      for (const m of src.matchAll(/functions\/v1\/([a-z0-9-]+)/g)) out.edge.add(m[1]);
      for (const m of src.matchAll(/functions\.invoke\(\s*['"`]([a-z0-9-]+)['"`]/g)) out.edge.add(m[1]);
      for (const m of src.matchAll(/(?:from\s+|import\(\s*)['"]([^'"]+)['"]/g)) {
        const t = resolve(f, m[1]); if (!t || seen.has(t)) continue;
        const r = rel(t); if (SKIP.test(r)) continue;
        seen.add(t);
        /* a data module, or a lib or hook file big enough (25 KB) to be carrying its own data set */
        if (r.startsWith('data/') || (/^(lib|hooks)\//.test(r) && fs.statSync(t).size > 25000)) out.data.add(r);
        next.push(t);
      }
    }
    frontier = next;
  }
  return out;
}

const pageFile = comp => ['pages/' + comp + '.tsx'].map(p => path.join(SRC, p)).find(p => fs.existsSync(p)) ?? null;
const RESKIN = Object.entries(routes.families).filter(([, f]) => f.kind === 'reskin');
const perRoute = [];
for (const [family, f] of RESKIN) for (const url of f.registered) {
  const rec = routes.routes.find(r => r.url === url);
  const file = pageFile(rec.component);
  if (!file) { perRoute.push({ family, route: url, component: rec.component, pageFile: null }); continue; }
  const r = reach(file);
  perRoute.push({ family, route: url, component: rec.component, pageFile: rel(file), filesFollowed: r.files,
    localData: [...r.data].sort(), tables: [...r.tables].sort(), rpcs: [...r.rpcs].sort(), edgeFunctions: [...r.edge].sort() });
}
/* ---- every local data module, bundled and counted ---- */
const SHARED = new Set(['data/completionSlugs.ts', 'data/usStatesPaths.ts']);
const modules = [...new Set(perRoute.flatMap(r => r.localData ?? []))].filter(m => !SHARED.has(m)).sort();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `copyData-${process.pid}-`));
const YEAR_KEY = /year|season|debut|from|to$|first|last|start|end|born|era|drafted|since|until/i;
const describeList = list => {
  const out = { entries: list.length };
  const objs = list.filter(x => x && typeof x === 'object' && !Array.isArray(x));
  if (!objs.length) { out.kind = typeof list[0]; return out; }
  const keys = [...new Set(objs.slice(0, 200).flatMap(o => Object.keys(o)))];
  out.fields = keys.slice(0, 24);
  const years = {};
  for (const k of keys) {
    if (!YEAR_KEY.test(k)) continue;
    const vals = objs.map(o => o[k]).filter(v => Number.isInteger(v) && v >= 1850 && v <= 2030);
    if (vals.length >= Math.max(3, objs.length * 0.5)) years[k] = [Math.min(...vals), Math.max(...vals)];
  }
  if (Object.keys(years).length) out.yearRanges = years;
  /* numeric fields a comparison could be about: min, max and who holds the max when the entry has a name */
  const nums = {};
  for (const k of keys) {
    if (YEAR_KEY.test(k) || /id$/i.test(k)) continue;
    const vals = objs.filter(o => typeof o[k] === 'number');
    if (vals.length < objs.length * 0.8) continue;
    const top = vals.reduce((a, b) => (b[k] > a[k] ? b : a));
    nums[k] = { min: Math.min(...vals.map(o => o[k])), max: top[k], heldBy: top.name ?? top.player ?? top.label ?? null };
  }
  if (Object.keys(nums).length) out.numberFields = Object.fromEntries(Object.entries(nums).slice(0, 10));
  return out;
};
const moduleFacts = {};
for (const m of modules) {
  const file = path.join(SRC, m);
  const fact = { bytes: fs.statSync(file).size, exports: {} };
  try {
    const outfile = path.join(TMP, m.replace(/[\/.]/g, '_') + '.cjs');
    esbuild.buildSync({ entryPoints: [file], bundle: true, format: 'cjs', platform: 'node', alias: { '@': SRC.replaceAll('\\', '/') },
      outfile, logLevel: 'silent', loader: { '.json': 'json', '.png': 'empty', '.svg': 'empty', '.css': 'empty' }, jsx: 'automatic',
      external: ['react', 'react-dom', 'react-router-dom', '@supabase/*', 'lucide-react', 'sonner', '@radix-ui/*', '@tanstack/*', 'react-helmet-async'] });
    const mod = require(outfile);
    for (const [name, v] of Object.entries(mod)) {
      if (Array.isArray(v)) fact.exports[name] = describeList(v);
      else if (v && typeof v === 'object' && !(v instanceof Set) && !(v instanceof Map)) {
        const vals = Object.values(v);
        fact.exports[name] = { keys: vals.length, ...(vals.length && vals.every(Array.isArray) ? { listsInside: vals.reduce((n, a) => n + a.length, 0), sample: describeList(vals.flat()) } : {}) };
      } else if (v instanceof Set || v instanceof Map) fact.exports[name] = { entries: v.size };
      else if (typeof v === 'number' || typeof v === 'string') fact.exports[name] = { value: String(v).slice(0, 60) };
    }
  } catch (e) { fact.error = String(e.message || e).split('\n')[0].slice(0, 200); }
  moduleFacts[m] = fact;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(HERE, 'copy-data-sources.json'), JSON.stringify({
    generatedBy: 'docs/audits/ad-readiness-2026-10-08/copy-data-sources.mjs',
    howToReadIt: 'perRoute: what each reskin page reaches by its imports. localData are files in the repo (countable now); tables, rpcs and edgeFunctions live in the database and were NOT queried by this audit. moduleFacts: each local module bundled, every exported list counted, with year ranges and the top of each number field.',
    perRoute, moduleFacts }, null, 1) + '\n');
  console.log(`routes ${perRoute.length}, local modules ${modules.length}, bundled without error ${Object.values(moduleFacts).filter(f => !f.error).length}`);
  for (const [m, f] of Object.entries(moduleFacts)) if (f.error) console.log('  could not bundle', m, f.error);
}
export { perRoute, moduleFacts, HERE, ROOT, SRC };
