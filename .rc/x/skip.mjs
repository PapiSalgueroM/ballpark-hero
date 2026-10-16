/* Review of Round 1344 (the runner): is the window's skip reachable in play? Real Madrid careers (2026-27) sell their
   four best men to AI clubs at the start (acceptBid, the unit file's way), then play two seasons. After every window,
   count the AI deal lines of that window whose man the ledger holds, with my wage, at a club other than the line's
   buyer: a deal the news published and the ledger refused (the reported bug). Run on the head (expect 0) and with
   mutation A applied (the skip out). Prints the count and the protected men the windows picked. Exit 0 always when
   it measured something; the verdict is read from the printed numbers. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
await import(pathToFileURL(path.join(ROOT, 'scripts/lib/offlineTransport.cjs')).href);
Date.now = () => 1791900000000;
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear(), key: i => [...memory.keys()][i] ?? null, get length() { return memory.size; } };
function withSeed(seed, fn) {
  const previous = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; }
}
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'review-skip-'));
const entry = path.join(work, 'e.ts');
fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\nexport * as wr from '@/lib/clubManagerWorldRoster';\n");
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'e.cjs'), logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const { cm, wr } = createRequire(import.meta.url)(path.join(work, 'e.cjs'));
await cm.ensureAllEraRosters();
const OPT = { skipHalftime: true, noCoach: true };
const CLUB = process.env.SKIP_CLUB || 'Real Madrid';
const tally = { careers: 0, sold: 0, windows: 0, lines: 0, protectedPicked: 0, publishedRefused: 0 };
function audit(s, label, seen) {
  const records = wr.readWorldRoster(s)?.records ?? [];
  for (const t of (s.transferLog ?? [])) {
    if (t.loan || t.season !== s.season || t.from === s.clubName || t.to === s.clubName || t.from === 'a free transfer') continue;
    const key = `${t.season}|${t.week}|${t.name}|${t.to}`;
    if (seen.has(key)) continue;
    seen.add(key); tally.lines += 1;
    const mine = records.find(r => r.status === 'owned' && r.player.name === t.name && r.player.wage !== undefined);
    if (mine) { tally.protectedPicked += 1; if (mine.owner !== t.to) { tally.publishedRefused += 1; if (tally.publishedRefused <= 8) console.log(`  ${label}: news "${t.to} sign ${t.name} from ${t.from}" but the ledger keeps him at ${mine.owner}; on goneNames: ${s.goneNames.includes(t.name)}`); } }
  }
}
for (let seed = 1; seed <= Number(process.env.SKIP_SEEDS || 16); seed += 1) {
  let s = withSeed(seed, () => cm.startCareer(CLUB, 'now'));
  const best = [...s.squad].filter(p => !p.onLoan && !p.isYouth).sort((a, b) => b.rating - a.rating).slice(0, 4);
  const clubs = [...new Set(cm.buildMarket(s).map(p => p.club).filter(c => c !== s.clubName))];
  for (const [i, man] of best.entries()) {
    const bid = { playerId: man.id, playerName: man.name, club: clubs[(seed * 7 + i * 13) % clubs.length], offer: Math.max(30, man.value ?? 30), status: 'open' };
    const sold = withSeed(seed * 100 + i, () => cm.acceptBid({ ...s, incomingBids: [...(s.incomingBids ?? []), bid] }, man.id));
    if (sold) { s = sold; tally.sold += 1; }
  }
  tally.careers += 1;
  const seen = new Set(), label = `${CLUB} seed ${seed}`;
  audit(s, label, seen);
  for (let season = 0; season < 3 && !s.sacked; season += 1) {
    for (let i = 0; i < 400; i += 1) {
      if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
      const r = withSeed(seed * 10007 + season * 997 + i, () => cm.playNextEntry(s, OPT));
      s = r.state;
      if (r.kind === 'window') { tally.windows += 1; audit(s, label, seen); }
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
    if (s.sacked) break;
    s = withSeed(seed * 31 + season, () => cm.startNextSeason(cm.finishSeason(s).state));
    tally.windows += 1; audit(s, label, seen);
  }
}
console.log(`skip probe: ${JSON.stringify(tally)}`);
console.log(tally.publishedRefused ? `skip probe: ${tally.publishedRefused} window deal(s) published that the ledger refused` : `skip probe: no window published a deal the ledger refused (${tally.protectedPicked} protected men picked)`);
