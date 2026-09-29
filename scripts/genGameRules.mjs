/* Round 678: writes public.game_rules' seed from the family table.

   One row per completion key in src/data/pointsFamilies.ts: its family, the
   scale it records on when it pays, whether it pays, when its ranked go is
   spent, and the round behind the rule. The how and why live in
   scripts/lib/gameRulesSeed.mjs.

   Run: node scripts/genGameRules.mjs          writes scripts/data/gameRulesSeed.sql
        node scripts/genGameRules.mjs --check  writes nothing; prints the md5 E3b
                                               compares and exits 1 when the
                                               committed seed is not what the
                                               table generates now */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomic } from './lib/atomicWrite.mjs';
import { loadFamilies, seedSql, md5, SEED_FILE, FAMILIES_FILE } from './lib/gameRulesSeed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gameRules-'));
let code = 0;
try {
  const seed = seedSql(await loadFamilies(ROOT, tmp));
  const target = path.join(ROOT, SEED_FILE);
  if (CHECK) {
    const committed = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : null;
    console.log(`md5 ${md5(seed)}`);
    if (committed === seed) {
      console.log(`genGameRules --check: ${SEED_FILE} is what ${FAMILIES_FILE} generates.`);
    } else {
      const have = committed === null ? [] : committed.split('\n');
      const want = seed.split('\n');
      const differ = want.filter(l => !have.includes(l)).concat(have.filter(l => !want.includes(l)));
      console.error(`genGameRules --check: ${committed === null ? `${SEED_FILE} is missing` : `${SEED_FILE} is stale, ${differ.length} line(s) differ, first: ${differ[0]}`}. Run node scripts/genGameRules.mjs and commit it.`);
      code = 1;
    }
  } else {
    writeFileAtomic(target, seed);
    console.log(`genGameRules: wrote ${SEED_FILE}, md5 ${md5(seed)}.`);
  }
} catch (e) {
  console.error(`genGameRules: ${e.message ?? e}`);
  code = 1;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.exit(code);
