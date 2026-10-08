/* rv-mut.mjs, second set (review scratch, never committed). Mutations of the LINE and the data path into the
   awards, all in src/lib/nbaMyCareer.ts. Same mechanics as the first set.
   Usage: node .rc/x/rv-mut.mjs <id>     |     node .rc/x/rv-mut.mjs restore */
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';

const F = 'src/lib/nbaMyCareer.ts';
const M = {
  /* off by one: the rookie's minutes factor is paid for two seasons, the second year factor moves to the third */
  L1: { file: F,
    find: '    * (input.seasonsPlayed === 0 ? 0.86 : input.seasonsPlayed === 1 ? 0.94 : 1)',
    put: '    * (input.seasonsPlayed <= 1 ? 0.86 : input.seasonsPlayed === 2 ? 0.94 : 1)' },
  /* swapped argument: rebounds follow the era level of ASSISTS */
  L2: { file: F,
    find: 'minutes * era.reb * (0.92 + u4 * 0.16)',
    put: 'minutes * era.ast * (0.92 + u4 * 0.16)' },
  /* dropped binding: every season plays 82 again (the 66 game 2011-12 season is gone) */
  L5: { file: F,
    find: "  return usSeasonLength('nba', year) ?? 82;",
    put: '  return 82;' },
  /* swapped field: the awards read the club's LOSING share */
  L6: { file: F,
    find: '    winShare: (line.clubWins ?? 0) / L, madePlayoffs: result !== NBA_MISSED_PLAYOFFS,',
    put: '    winShare: (line.clubLosses ?? 0) / L, madePlayoffs: result !== NBA_MISSED_PLAYOFFS,' },
};

const BK = path.join('.rc', 'x', 'backup');
const id = process.argv[2];
if (id === 'restore') {
  for (const m of Object.values(M)) {
    const b = path.join(BK, m.file.replace(/\//g, '__'));
    if (existsSync(b)) copyFileSync(b, m.file);
  }
  console.log('restored');
  process.exit(0);
}
if (id === 'check') {
  /* read only: how many times each anchor sits in its file */
  for (const [k, v] of Object.entries(M)) console.log(k, v.file, readFileSync(v.file, 'utf8').replace(/\r\n/g, '\n').split(v.find).length - 1);
  process.exit(0);
}
const m = M[id];
if (!m) { console.error(`unknown mutation ${id}`); process.exit(2); }
mkdirSync(BK, { recursive: true });
const b = path.join(BK, m.file.replace(/\//g, '__'));
if (!existsSync(b)) copyFileSync(m.file, b);
const src = readFileSync(m.file, 'utf8').replace(/\r\n/g, '\n');
const hits = src.split(m.find).length - 1;
if (hits !== 1) { console.error(`mutation ${id}: anchor found ${hits} times in ${m.file}, expected 1. Refusing.`); process.exit(2); }
const out = src.replace(m.find, m.put);
if (out === src) { console.error(`mutation ${id}: the swap changed nothing. Refusing.`); process.exit(2); }
writeFileSync(m.file, out);
console.log(`mutation ${id} applied to ${m.file}`);
