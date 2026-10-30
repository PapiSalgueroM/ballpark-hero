/* Reviewer probe for Round 1597 (runner only, copied into scripts/). A man in the last year of his deal, loaned out
   in the summer window, is he on the review's checkpoint list (expiringPlayers) or the hub line at the end of the
   season, and where is he after the summer? */
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as hub from './src/lib/clubManagerHubLines';\n";
const out = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'loanprobe.ts', loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', logLevel: 'silent' });
const module = { exports: {} }; const store = new Map();
const require = createRequire(path.join(ROOT, 'package.json'));
const ctx = vm.createContext({ module, exports: module.exports, require, console, process, Buffer, Math, Date, URL, URLSearchParams,
  TextEncoder, TextDecoder, structuredClone, performance, setTimeout, clearTimeout, setInterval, clearInterval,
  fetch: () => Promise.reject(new Error('no network here')),
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
new vm.Script(out.outputFiles[0].text, { filename: 'loanprobe.cjs' }).runInContext(ctx);
const { cm, eras, hub } = module.exports;
await eras.ensureAllEraRosters();
let seed = 0x15977; Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
let unseen = 0, tried = 0;
for (const club of ['Everton', 'Ajax', 'Freiburg']) {
  let s = cm.startCareer(club, 'now');
  const man = cm.expiringPlayers(s).find(p => p.position !== 'GK' && cm.loanOutRefusal(s, p.id) === null);
  if (!man) { console.log(`  ${club}: nobody in his final year can be loaned out (window ${s.transferWindow})`); continue; }
  const lent = cm.loanOutPlayer(s, man.id);
  if (!lent) { console.log(`  ${club}: loanOutPlayer refused ${man.name}`); continue; }
  s = lent; tried += 1;
  const left = st => (st.calendar ?? []).slice(Math.max(0, st.week)).filter(e => e.type === 'league').length;
  let lineSeen = false;
  for (let i = 0; i < 400; i += 1) {
    if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
    const r = cm.playNextEntry(s, { skipHalftime: true, noCoach: true }); s = r.state;
    const line = hub.expiringDealsLine(s); if (line && line.text.includes(man.name)) lineSeen = true;
    if (r.kind === 'seasonOver' || s.sacked) break;
  }
  if (s.sacked) { console.log(`  ${club}: sacked`); continue; }
  s = cm.finishSeason(s).state;
  const stillOut = (s.loanedOut ?? []).some(l => l.player.name === man.name);
  const onCheckpoint = cm.expiringPlayers(s).some(p => p.name === man.name);
  const n = cm.startNextSeason(s);
  const fa = (n.freeAgents ?? []).find(f => f.name === man.name);
  const inSquad = n.squad.some(p => p.name === man.name);
  if (stillOut && !onCheckpoint && !lineSeen && fa) unseen += 1;
  console.log(`  ${club}: ${man.name} (${man.contractYears} year left) loaned out; at the review still out ${stillOut}, on the checkpoint ${onCheckpoint}, named by the hub line ${lineSeen}; after the summer in the squad ${inSquad}, on the free agent list ${fa ? `yes (${fa.reason})` : 'no'}`);
}
console.log(`loanprobe: ${tried} final year men loaned out, ${unseen} of them walked at the summer without a checkpoint row or a hub line`);
