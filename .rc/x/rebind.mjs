// Round BJG kit (Release BJ): runs an urgent packet's own paired prover (scripts/qa/proveSoccerCreation1388.mjs or
// scripts/qa/proveXiSelectionRaceFixed.mjs) with its one BASE constant rebound to the full tree original reference of
// the joined tree (.rc/x/pktMinus.sh), as the packets' recipe asks. Nothing else in the prover changes: every
// assertion, case, frozen test hash, source fence and restricted inverse anchor is the packet's. The copy is written
// next to this file (two levels below the repo root, so the prover's ROOT still resolves to the root) and is left
// untracked, so the prover's clean tree check still reads the committed tree.
//   node .rc/x/rebind.mjs <prover path> <full tree reference sha>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [prover, ref] = process.argv.slice(2);
if (!prover || !/^[0-9a-f]{40}$/.test(ref || '')) { console.error('rebind: usage <prover> <40 hex reference>'); process.exit(2); }
const text = fs.readFileSync(prover, 'utf8');
const rx = /^const BASE = '([0-9a-f]{40})';$/m;
const found = text.match(new RegExp(rx.source, 'gm')) || [];
if (found.length !== 1) { console.error(`rebind: the BASE constant is in ${prover} ${found.length} times, it must be once`); process.exit(2); }
const old = text.match(rx)[1];
const here = path.dirname(fileURLToPath(import.meta.url));
/* The copy sits in .rc/x, so its one relative import is pointed at the same file in scripts/lib. */
const IMP = "import '../lib/offlineTransport.cjs';";
if (text.split(IMP).length !== 2) { console.error(`rebind: the transport import is not in ${prover} exactly once`); process.exit(2); }
const transport = pathToFileURL(path.resolve(here, '../../scripts/lib/offlineTransport.cjs')).href;
const out = text.replace(rx, `const BASE = '${ref}';`).replace(IMP, `import '${transport}';`);
if (out === text) { console.error('rebind: the rebinding changed nothing'); process.exit(2); }
const copy = path.join(here, 'rebound-' + path.basename(prover));
fs.writeFileSync(copy, out);
console.log(`rebind: ${prover} BASE ${old} -> ${ref} (${copy})`);
const r = spawnSync(process.execPath, [copy], { stdio: 'inherit', env: process.env });
process.exit(r.status ?? 1);
