// Round 1210 reviewer fleet (runner only, an extra file): base against branch, what the six rows moved and what they did not.
// Usage: node .rc/x/reviewFleet.mjs /tmp/base   (the base worktree must exist with node_modules linked)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BASE = process.argv[2] || '/tmp/base';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
let bad = 0;
const say = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) bad += 1; };

async function load(root, tag) {
  const entry = path.join(os.tmpdir(), `fleet-${tag}.mjs`);
  const out = path.join(os.tmpdir(), `fleet-${tag}.bundle.mjs`);
  fs.writeFileSync(entry, [
    `export { confederationFor, groupByConfederation, DISPLAY_CONFED, CONFEDERATION_ORDER } from '${root}/src/lib/confederationGroups.ts';`,
    `export { NATION_CONFED } from '${root}/src/lib/soccerInternational.ts';`,
    `export { FLAG_CODES } from '${root}/src/components/FlagImg.tsx';`,
  ].join('\n'));
  execSync(`"${ROOT}/node_modules/.bin/esbuild" "${entry}" --bundle --format=esm --platform=node --loader:.tsx=tsx --outfile="${out}" --log-level=error`, { stdio: 'inherit' });
  return import(pathToFileURL(out).href);
}
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const NAT_ROW = /:\s*'((?:[^'\\]|\\.)*)',?\s*$/gm;
function nations(root) {
  const files = ['src/data/playerNationalities.ts', 'src/data/clubManagerALeague2026.ts', 'src/data/clubManagerRussia2026.ts',
    ...fs.readdirSync(path.join(root, 'src/data/nationalities')).filter(f => /^era\d{4}\.ts$/.test(f)).map(f => 'src/data/nationalities/' + f)];
  const out = new Set();
  for (const f of files) {
    let text = strip(fs.readFileSync(path.join(root, f), 'utf8'));
    if (f.includes('clubManager')) {
      // a league file holds squads and dates too: read only its nationality map's own block
      const at = text.search(/export const CM_\w+_NATIONALITIES\b[^=]*=\s*\{/);
      if (at < 0) throw new Error(`${f}: no nationality map found`);
      text = text.slice(at, text.indexOf('\n};', at));
    }
    for (const m of text.matchAll(NAT_ROW)) out.add(m[1]);
  }
  return out;
}
function picker(root) {
  const sc = strip(fs.readFileSync(path.join(root, 'src/pages/SoccerCareer.tsx'), 'utf8'));
  const at = sc.indexOf('const NATIONALITIES = [');
  return [...sc.slice(at, sc.indexOf('];', at)).matchAll(/"([^"]+)"/g)].map(m => m[1]);
}

const A = await load(BASE, 'base');
const B = await load(ROOT, 'branch');
const SIX = ['French Guiana', 'Mauritius', 'Namibia', 'Niger', 'Southern Sudan', 'Turkmenistan'];

// 1. every name any table or map knows: where do the two trees disagree
const names = new Set([...Object.keys(B.FLAG_CODES), ...Object.keys(A.FLAG_CODES), ...Object.keys(B.NATION_CONFED), ...Object.keys(B.DISPLAY_CONFED), ...nations(ROOT), ...nations(BASE), ...picker(ROOT)]);
const moved = [...names].filter(n => A.confederationFor(n) !== B.confederationFor(n)).sort();
console.log(`1. ${names.size} names read from the flag table, both confederation tables, every nationality map and the picker`);
console.log('   moved: ' + moved.map(n => `${n} ${A.confederationFor(n)} -> ${B.confederationFor(n)}`).join('; '));
say(moved.join() === SIX.join(), `exactly the six nations changed their answer (${moved.length} moved)`);
say(moved.every(n => A.confederationFor(n) === null), 'each of the six had no confederation on the base (nothing was re-homed)');

// 2. the qualifying engine's table is the same object, key for key
say(JSON.stringify(A.NATION_CONFED) === JSON.stringify(B.NATION_CONFED), `NATION_CONFED is identical (${Object.keys(B.NATION_CONFED).length} rows)`);
say(SIX.every(n => !(n in B.NATION_CONFED)), 'none of the six sits in NATION_CONFED (none can reach a qualifying draw)');

// 3. Transfer Path's Europe rule reads only "is it UEFA" over the flag table: the code set must not move
const uefa = M => [...new Set(['mc', ...Object.entries(M.FLAG_CODES).filter(([n]) => M.confederationFor(n) === 'UEFA').map(([, iso]) => iso)])].sort();
say(uefa(A).join() === uefa(B).join(), `the UEFA code set Transfer Path builds is identical (${uefa(B).length} codes)`);

// 4. the Soccer Career picker and Club Manager's homeland list group the same way
const groups = (M, list) => JSON.stringify(M.groupByConfederation(list, n => n));
say(groups(A, picker(BASE)) === groups(B, picker(ROOT)), `the Soccer Career picker groups identically (${picker(ROOT).length} nations)`);
const homelands = M => Object.keys(M.NATION_CONFED);
say(groups(A, homelands(A)) === groups(B, homelands(B)), 'a list of every NATION_CONFED key groups identically (the homeland select reads those keys)');

// 5. the market: what sat under Elsewhere on the base and what sits there now
const other = (M, root) => (M.groupByConfederation([...nations(root)], n => n).find(g => g.conf === 'other')?.items ?? []).slice().sort();
console.log(`5. Elsewhere on the base: ${other(A, BASE).join(', ') || 'none'}; on the branch: ${other(B, ROOT).join(', ') || 'none'}`);
say(other(A, BASE).join() === SIX.join(), 'the base put exactly the six under Elsewhere');
say(other(B, ROOT).length === 0, 'the branch puts nothing under Elsewhere');

// 6. each of the six has a flag code, so its row in the filter and its man in the list wear a flag
say(SIX.every(n => typeof B.FLAG_CODES[n] === 'string'), `each of the six has a flag code (${SIX.map(n => `${n} ${B.FLAG_CODES[n]}`).join(', ')})`);

console.log(`reviewFleet: ${bad} problem${bad === 1 ? '' : 's'}`);
process.exit(bad ? 1 : 0);
