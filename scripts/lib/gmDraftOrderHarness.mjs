/* Round 1222: what scripts/simGmDraftOrder.mjs needs to run the real modules.
 *
 * 1. bundleDraftOrder: the shared lift (gmDraftOrder, gmDraftNight,
 *    gmLotteryNight, lotteryReveal, the rule sets) and the module under it
 *    (gmPicks) bundled with esbuild into OS temp. A negative control never
 *    touches src: it bundles a rewritten COPY behind a resolver, and refuses
 *    to run when the line it means to change is not in the file or when the
 *    rewrite changed nothing. Sources are read with line endings normalised
 *    and every anchor is ONE line, so a control fires on a CRLF checkout too.
 *
 * 2. A counting keyedRng. In every bundle, control or not, the modules get a
 *    shim in place of src/lib/keyedRng.ts that hands out the real streams and
 *    counts them: how many were opened, under which keys, and how many
 *    numbers were drawn. That is how the harness can say "drawn once" and
 *    "a second look draws nothing" as counts, not as hope. The harness's own
 *    by hand draws use the real function, exported beside it.
 *
 * 3. makeRng: the harness's own generator for building leagues. The modules
 *    never see it. */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'src');

export const lf = text => text.split('\r\n').join('\n');
export const readRepo = rel => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

/** mulberry32: the same seed is the same league on every machine. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FILES = {
  order: 'src/lib/gmDraftOrder.ts',
  night: 'src/lib/gmDraftNight.ts',
  lottery: 'src/lib/gmLotteryNight.ts',
  reveal: 'src/lib/lotteryReveal.ts',
  rules: 'src/data/gmDraftOrder/rules.ts',
  picks: 'src/lib/gmPicks.ts',
  draftNight: 'src/lib/draftNight.ts',
};
const KEYED = 'src/lib/keyedRng.ts';
const abs = rel => path.join(ROOT, rel);
const slash = p => p.split(path.sep).join('/');

/* A copy of one source file with each [now, was] line swapped. */
function rewrite(control, rel, swaps) {
  const src = readRepo(rel);
  let out = src;
  for (const [now, was] of swaps) {
    if (now.includes('\n')) throw new Error(`control ${control}: an anchor spans lines. One line anchors only.`);
    if (!src.includes(now)) throw new Error(`control ${control}: ${JSON.stringify(now.slice(0, 90))} is not in ${rel}, so it would change nothing. Refusing to run.`);
    if (src.split(now).length !== 2) throw new Error(`control ${control}: ${JSON.stringify(now.slice(0, 90))} is in ${rel} more than once, so the swap is not the one meant. Refusing to run.`);
    out = out.split(now).join(was);
  }
  if (out === src) throw new Error(`control ${control}: the rewrite of ${rel} changed nothing. Refusing to run.`);
  return out;
}

/** swaps: { order: [[now, was], ...], night: [...], ... } keyed like FILES. */
export async function bundleDraftOrder(control, swaps) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-gm-draft-order-')));
  process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
  /* original absolute path -> the file the bundle reads in its place */
  const stand = new Map();
  const home = new Map();
  for (const [key, list] of Object.entries(swaps ?? {})) {
    const rel = FILES[key];
    if (!rel) throw new Error(`control ${control}: no file is known as ${key}`);
    const copy = path.join(dir, `${key}.control${path.extname(rel)}`);
    fs.writeFileSync(copy, rewrite(control, rel, list));
    stand.set(abs(rel), copy);
    home.set(copy, path.dirname(abs(rel)));
  }
  const shim = path.join(dir, 'keyedRng.shim.ts');
  fs.writeFileSync(shim, [
    `import { keyedRng as real } from ${JSON.stringify(slash(abs(KEYED)))};`,
    'const tally = ((globalThis as any).__dukbKeyed ??= { keys: [] as string[], draws: 0 });',
    'export function keyedRng(key: string): () => number {',
    '  const rng = real(key);',
    '  tally.keys.push(key);',
    '  return () => { tally.draws += 1; return rng(); };',
    '}',
    'export { real as realKeyedRng };',
    '',
  ].join('\n'));
  stand.set(abs(KEYED), shim);
  home.set(shim, path.dirname(abs(KEYED)));

  const entry = path.join(dir, 'entry.ts');
  const from = rel => JSON.stringify(slash(abs(rel)));
  fs.writeFileSync(entry, [
    `export * as order from ${from(FILES.order)};`,
    `export * as night from ${from(FILES.night)};`,
    `export * as lottery from ${from(FILES.lottery)};`,
    `export * as reveal from ${from(FILES.reveal)};`,
    `export * as rules from ${from(FILES.rules)};`,
    `export * as picks from ${from(FILES.picks)};`,
    `export * as draftNight from ${from(FILES.draftNight)};`,
    `export { keyedRng, realKeyedRng } from ${from(KEYED)};`,
    '',
  ].join('\n'));

  const withExt = p => [p, `${p}.ts`, `${p}.tsx`, path.join(p, 'index.ts')].find(c => fs.existsSync(c) && fs.statSync(c).isFile());
  const resolver = {
    name: 'dukb-gm-draft-order-copies',
    setup(b) {
      b.onResolve({ filter: /.*/ }, args => {
        if (args.kind === 'entry-point') return undefined;
        let target = null;
        if (args.path.startsWith('@/')) target = path.join(SRC, args.path.slice(2));
        else if (args.path.startsWith('.')) target = path.resolve(home.get(args.importer) ?? path.dirname(args.importer), args.path);
        else if (path.isAbsolute(args.path)) target = args.path;
        if (target === null) return undefined;
        const file = withExt(path.normalize(target));
        if (!file) return { errors: [{ text: `cannot resolve ${args.path} from ${args.importer}` }] };
        /* The shim reads the real stream maker; everything else gets the stand in. */
        if (args.importer === shim) return { path: file };
        return { path: stand.get(file) ?? file };
      });
    },
  };
  const outfile = path.join(dir, 'bundle.mjs');
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, plugins: [resolver], logLevel: 'silent' });
  const mod = await import(pathToFileURL(outfile).href);
  return { ...mod, tally: globalThis.__dukbKeyed };
}
