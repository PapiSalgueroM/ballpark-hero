/* Release AZ fix pass 4, a probe (never committed): which man does the market list twice in simBooks section 1?
 * The same three careers on the same seeded stream (scripts/lib/seedRandom.mjs first), played to the first open
 * window where buildMarket repeats a name; prints every listing of each repeated name and the ledger's records of it.
 *   node .rc/x/dupProbe.mjs        (run from the repo root, or from a worktree root as cwd) */
import '../../scripts/lib/seedRandom.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const TAG = `${process.pid}-${Date.now()}`;
const ENTRY = path.join(os.tmpdir(), `dupEntry-${TAG}.mjs`);
const BUNDLE = path.join(os.tmpdir(), `dup-${TAG}.bundle.mjs`);
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
const ledger = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManagerWorldRoster.ts');
export { engine, ledger };
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const { engine: cm, ledger: L } = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(ENTRY, { force: true });
fs.rmSync(BUNDLE, { force: true });
const { startCareer, playNextEntry, buildMarket } = cm;

let found = 0;
for (const club of ['Everton', 'Coventry City', 'Real Madrid']) {
  let s = startCareer(club);
  let reported = false;
  for (let guard = 0; guard < 260 && !reported; guard += 1) {
    const res = playNextEntry(s, { skipHalftime: true });
    s = res.state;
    if (!s.transferWindow) continue;
    const market = buildMarket(s);
    const count = new Map();
    for (const m of market) count.set(m.name, (count.get(m.name) ?? 0) + 1);
    const dups = [...count].filter(([, n]) => n > 1).map(([name]) => name);
    if (!dups.length) {
      /* simBooks signs the cheapest affordable man every window week; so does this probe. */
      const target = market.filter(m => m.price <= s.budget).sort((a, b) => a.price - b.price)[0];
      if (target && s.squad.length < 30) { const next = cm.buyPlayer(s, target); if (next) { s = next; console.log(`  bought ${target.name} from ${target.club} s${s.season}w${s.week}`); } }
      continue;
    }
    reported = true; found += 1;
    const held = L.worldRosterView(s);
    console.log(`DUP ${club} s${s.season}w${s.week}: ${dups.length} names repeated; seed ${s.worldSeed}; ledger ${held ? held.records.length + ' records' : 'none'}; goneNames ${(s.goneNames ?? []).length}; transferLog ${(s.transferLog ?? []).length}`);
    for (const name of dups.slice(0, 6)) {
      for (const m of market.filter(x => x.name === name)) console.log(`  ${name} | at ${m.club} | ${m.position} ${m.age}y r${m.rating} v${m.value} | key ${m.worldRosterKey ?? '-'} | gen ${m.generated ?? false}`);
      for (const r of (held?.records ?? []).filter(x => x.player?.name === name || x.origin?.name === name)) {
        console.log(`  ledger: key ${r.key} status ${r.status} owner ${r.owner} origin ${r.origin?.club} year ${r.year}`);
      }
      const news = (s.transferLog ?? []).filter(t => t.name === name);
      for (const t of news) console.log(`  news: ${t.from} -> ${t.to} fee ${t.fee} s${t.season}w${t.week}`);
    }
  }
  if (!reported) console.log(`DUP ${club}: no repeated name in any window this probe reached`);
}
console.log(`DUP done: ${found} of 3 careers repeat a name`);
