/* Reviewer tool (Round 1556): write <tree>/scripts/simNbaGmDeskDump.mjs, the tree's own simNbaGmDesk (or the one at
   <ref>) that appends every walk save, the league and the desk right before the desk's summer, to $DUMP_FILE.
   usage: node .rc/x/dumpsave.mjs <tree> <ref or -> */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const [tree, ref] = process.argv.slice(2);
const src = (ref && ref !== '-'
  ? execFileSync('git', ['show', `${ref}:scripts/simNbaGmDesk.mjs`], { cwd: tree, encoding: 'utf8', maxBuffer: 1 << 26 })
  : fs.readFileSync(path.join(tree, 'scripts', 'simNbaGmDesk.mjs'), 'utf8')).replace(/\r\n/g, '\n');
const anchor = '  const summer = D.nbaDeskOffseason(lg, desk, team, rng);\n';
if (src.split(anchor).length !== 2) { console.error(`dumpsave: anchor found ${src.split(anchor).length - 1} times`); process.exit(2); }
const dump = "  if (process.env.DUMP_FILE) fs.appendFileSync(process.env.DUMP_FILE, JSON.stringify({ where, team, lg, desk }) + '\\n');\n";
fs.writeFileSync(path.join(tree, 'scripts', 'simNbaGmDeskDump.mjs'), src.replace(anchor, dump + anchor));
console.log(`dumpsave: wrote ${path.join(tree, 'scripts', 'simNbaGmDeskDump.mjs')} from ${ref && ref !== '-' ? ref : 'the tree'}`);
