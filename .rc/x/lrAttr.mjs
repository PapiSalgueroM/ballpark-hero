// Round 1509 attribution for simCmLeagueRules (never committed): patch a throwaway checkout of HEAD so that
//   strip   the harness hashes every state without worldComps.uel (and without worldComps when nothing else is left)
//   holder  clubManager.ts has the Europa League holder line reverted (scripts/lib/worldUelHolder1509.mjs)
//   board   clubManager.ts has the European rung line reverted
// Usage: node lrAttr.mjs <tree> strip[,holder[,board]]. Every edit fails closed: its anchor must stand exactly once.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [tree, modeArg] = process.argv.slice(2);
const modes = new Set((modeArg || '').split(',').filter(Boolean));
const lib = await import(pathToFileURL(path.join(tree, 'scripts/lib/worldUelHolder1509.mjs')).href);

if (modes.has('strip')) {
  const f = path.join(tree, 'scripts/simCmLeagueRules.mjs');
  const src = fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
  const anchor = "const hash = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v ?? null)).digest('hex').slice(0, 16);";
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error(`lrAttr: the hash line stands ${n} times`); process.exit(2); }
  const strip = [
    'const stripUel1509 = v => {',
    "  if (!v || typeof v !== 'object' || Array.isArray(v) || !v.worldComps || !('uel' in v.worldComps)) return v;",
    '  const c = { ...v };',
    '  const { uel, ...rest } = v.worldComps;',
    '  if (Object.keys(rest).length) c.worldComps = rest; else delete c.worldComps;',
    '  globalThis.__stripped1509 = (globalThis.__stripped1509 ?? 0) + 1;',
    '  return c;',
    '};',
    "const hash = v0 => { const v = stripUel1509(v0); return createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v ?? null)).digest('hex').slice(0, 16); };",
    "process.on('exit', () => console.log(`lrAttr: states stripped of worldComps.uel before hashing: ${globalThis.__stripped1509 ?? 0}`));",
  ].join('\n');
  fs.writeFileSync(f, src.replace(anchor, strip));
}
const cmFile = path.join(tree, 'src/lib/clubManager.ts');
let cm = fs.readFileSync(cmFile, 'utf8');
if (modes.has('holder')) cm = lib.withoutUelHolder(cm);
if (modes.has('board')) cm = lib.withoutEuroBoard(cm);
if (modes.has('holder') || modes.has('board')) fs.writeFileSync(cmFile, cm);
console.log(`lrAttr: ${tree} patched with ${[...modes].join(', ') || 'nothing'}`);
