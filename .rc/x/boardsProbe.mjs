// Throwaway probe (sent to the runner as .rc/x/boardsProbe.mjs, never committed): the rival every
// Club Manager board names and the league demand it makes, so two trees can be compared.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'boards-probe-'));
const aliasPlugin = { name: 'alias', setup(b) { b.onResolve({ filter: /^@\// }, async args => { const r = await b.resolve('./' + args.path.slice(2), { resolveDir: SRC, kind: args.kind }); return { path: r.path, errors: r.errors }; }); } };
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.cjs');
fs.writeFileSync(ENTRY, "export * as cm from '@/lib/clubManager';\nexport * as rv from '@/data/clubRivalries';\n");
await build({ entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node', outfile: BUNDLE, logLevel: 'error', plugins: [aliasPlugin] });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { cm, rv } = createRequire(import.meta.url)(BUNDLE);
const out = { rivals: {}, league: {}, xi: {}, tier: {}, expectation: {}, budget: {}, handMapped: Object.keys(rv.PRIMARY_RIVAL ?? {}) };
for (const lg of cm.REAL_LEAGUES) {
  for (const def of cm.playableClubs(lg.id)) { out.tier[def.name] = def.tier; out.expectation[def.name] = def.expectation; out.budget[def.name] = def.budget; }
  for (const c of lg.clubs) {
    const objs = cm.buildBoardObjectives(c, false, lg.clubs.length);
    out.rivals[c] = objs.find(x => x.id === 'rival')?.rivalName ?? null;
    out.league[c] = objs.find(x => x.id === 'league')?.label ?? null;
    out.xi[c] = cm.bakedXIAvg(c);
  }
}
const text = JSON.stringify(out);
if (process.env.RC_OUT) { fs.mkdirSync(process.env.RC_OUT, { recursive: true }); fs.writeFileSync(path.join(process.env.RC_OUT, 'boards.json'), text); }
console.log(`boardsProbe: ${Object.keys(out.rivals).length} clubs read`);
