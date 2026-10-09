/* Verifier probe (never committed): how the HEAD's own needsBrowser files every harness, against main's rule.
   The function is lifted out of scripts/runAllSims.mjs as committed, so this reads the code, not a copy of it. */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import ts from 'typescript';

const HERE = path.resolve('scripts');
const OLD_REGEX = /(?:import|require)\s*(?:[\w{},*\s]*from\s*)?['"][^'"]*playwright/i;

function lift(src, label) {
  const sf = ts.createSourceFile('r.mjs', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let fn = null;
  sf.forEachChild((n) => { if (ts.isFunctionDeclaration(n) && n.name && n.name.text === 'needsBrowser') fn = n; });
  if (!fn) throw new Error(`${label}: no needsBrowser function`);
  const text = src.slice(fn.getStart(sf), fn.end);
  return new Function('readFileSync', 'path', 'HERE', 'ts', `${text}\nreturn needsBrowser;`)(fs.readFileSync, path, HERE, ts);
}

const headRule = lift(fs.readFileSync(path.join(HERE, 'runAllSims.mjs'), 'utf8'), 'head');
let mainRule;
let mainHow = 'lifted from origin/main';
try {
  mainRule = lift(execSync('git show origin/main:scripts/runAllSims.mjs', { encoding: 'utf8', maxBuffer: 1 << 26 }), 'main');
  mainRule('runAllSims.mjs');
} catch (e) {
  mainHow = `the old regex (could not lift main's function: ${String(e.message).split('\n')[0]})`;
  mainRule = (f) => OLD_REGEX.test(fs.readFileSync(path.join(HERE, f), 'utf8'));
}

const all = fs.readdirSync(HERE).filter((f) => /^(sim|play|sweep)[A-Za-z0-9]*\.mjs$/.test(f) && f !== 'runAllSims.mjs').sort();
const rows = all.map((f) => ({ f, main: Boolean(mainRule(f)), head: Boolean(headRule(f)) }));
const n = (k) => rows.filter((r) => r[k]).length;
console.log(`main rule: ${mainHow}`);
console.log(`harnesses ${rows.length}; browser group: main rule ${n('main')}, head rule ${n('head')}`);
const moved = rows.filter((r) => r.main !== r.head);
console.log(`moved ${moved.length}:`);
for (const r of moved) console.log(`  ${r.f}: main ${r.main ? 'browser' : 'node'} -> head ${r.head ? 'browser' : 'node'}`);
for (const want of ['simLoginReturn.mjs', 'simBracketMoment.mjs', 'simBrowserHarnessDiscovery.mjs', 'simSoccerOwnGoals.mjs']) {
  const r = rows.find((x) => x.f === want);
  console.log(`${want}: ${r ? (r.head ? 'BROWSER group' : 'node group') : 'MISSING'} on head`);
}
const bad = ['simLoginReturn.mjs', 'simBracketMoment.mjs'].filter((w) => { const r = rows.find((x) => x.f === w); return !r || r.head; });
console.log(bad.length ? `NOT CLOSED: ${bad.join(', ')} filed as browser` : 'classify: simLoginReturn and simBracketMoment are in the node group');
process.exit(bad.length ? 1 : 0);
