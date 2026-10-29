/* Reviewer probe 2 (Round 1571). Runs from the repo root on a runner.
   a. youth or reserve looking keys the tree still counts, per pool man
   b. pool men whose own current club is a reserve key, and any man the tree counts at 0 clubs
   c. the record's tableClubs (the generator's refusal input) against BASE's club history, per judged man
   d. who moves on each "Played for <club>" tile, by name */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadBingoLib } from '../../scripts/lib/bingoFixtureBundle.mjs';

const ROOT = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe2-'));
const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/bingoPoolHistory-2026-10-29.json'), 'utf8')).rows;
const baseSrc = execSync('git show 692590145:src/lib/playerBingo.ts', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
const base = await loadBingoLib({ root: ROOT, libSource: baseSrc, label: 'q2base', tmp });
const head = await loadBingoLib({ root: ROOT, libSource: fs.readFileSync(path.join(ROOT, 'src/lib/playerBingo.ts'), 'utf8'), label: 'q2head', tmp });
const load = async lib => { globalThis.__bingoFixture = { rows }; return lib.fetchBingoData(); };
const bd = await load(base);
const hd = await load(head);
const derived = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/bingoClubAdditions.json'), 'utf8'));
const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/bingoClubAdditions-2026-10.json'), 'utf8'));
const reserves = new Set(derived.rules.reserves);
const LOOKS = /(\bu-?1[5-9]\b|\bu-?2[0-3]\b|\bb$|\bii$|\bc$|primavera|castilla|\bjong\b|atletic\b|next gen|reserve|youth|academy|juvenil|\bfutures?\b|\byoung\b)/;

const youth = [];
let zero = [];
for (const p of hd.pool) {
  const set = [...(hd.clubHistory.get(p.name) ?? [])];
  for (const k of set) if (LOOKS.test(k)) youth.push(`${p.name}: ${k}`);
  if (!set.length) zero.push(p.name);
}
console.log(`a) youth looking keys the tree counts: ${youth.length}: ${youth.join('; ')}`);
const ownReserve = hd.pool.filter(p => reserves.has(head.clubKey(p.club))).map(p => `${p.name} (${p.club}, tree count ${hd.clubHistory.get(p.name)?.size ?? 0})`);
console.log(`b) pool men whose current club is a reserve key: ${ownReserve.length}: ${ownReserve.join('; ')}; men at 0 clubs on the tree: ${zero.length}: ${zero.join(', ')}`);

const mism = [];
for (const e of [...record.additions, ...record.agrees]) {
  const want = [...(bd.clubHistory.get(e.name) ?? [])].sort().join('|');
  const got = [...(e.tableClubs ?? [])].sort().join('|');
  if (want !== got) mism.push(`${e.name}: record [${got}] base [${want}]`);
}
console.log(`c) tableClubs differing from BASE's history: ${mism.length} of ${record.additions.length + record.agrees.length}: ${mism.slice(0, 8).join('; ')}`);

const bc = base.buildCriteria(bd);
const hc = head.buildCriteria(hd);
for (const c of hc.filter(x => x.id.startsWith('club-') || x.id === 'one-club-man' || x.id === 'journeyman-4-clubs')) {
  const b = bc.find(x => x.id === c.id);
  const gained = c.support.filter(n => !b.support.includes(n));
  const lost = b.support.filter(n => !c.support.includes(n));
  if (gained.length || lost.length) console.log(`d) ${c.label}: gained ${gained.join(', ') || 'none'}; lost ${lost.join(', ') || 'none'}`);
}
console.log('probe2: DONE');
