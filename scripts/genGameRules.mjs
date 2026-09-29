/* Round 678: writes public.game_rules' seed from the family table.

   One row per completion key in src/data/pointsFamilies.ts: its family, the
   scale it records on when it pays, whether it pays, when its ranked go is
   spent, and the round behind the rule. The how and why live in
   scripts/lib/gameRulesSeed.mjs.

   Every mode also reads the seed back as SQL and holds it row by row to the
   family table itself (scripts/lib/gameRulesRows.mjs, which never imports the
   generator), so a generator that writes the wrong rows cannot check out as
   right against its own output.

   Run: node scripts/genGameRules.mjs          writes scripts/data/gameRulesSeed.sql,
                                               refusing a seed that disagrees
                                               with the table
        node scripts/genGameRules.mjs --check  writes nothing; prints the md5 E3b
                                               compares and exits 1 when the
                                               committed seed is not what the
                                               table generates now, or when
                                               any row of it disagrees with
                                               the table
        node scripts/genGameRules.mjs --release G
                                               writes nothing; exits 1 while a
                                               game Release G waits on (filed
                                               with holdsRelease, section 7.6's
                                               flagship) does not pay yet.
                                               Round 691 runs it before it
                                               publishes. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomic } from './lib/atomicWrite.mjs';
import { loadFamilies, familyRows, seedSql, md5, SEED_FILE, FAMILIES_FILE } from './lib/gameRulesSeed.mjs';
import { seedAgainstTable } from './lib/gameRulesRows.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const releaseAt = process.argv.indexOf('--release');
const RELEASE = releaseAt >= 0 ? process.argv[releaseAt + 1] ?? '' : null;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gameRules-'));
let code = 0;
try {
  const groups = await loadFamilies(ROOT, tmp);
  const target = path.join(ROOT, SEED_FILE);
  if (RELEASE !== null) {
    if (!/^[A-Z]$/.test(RELEASE)) throw new Error(`--release takes a release letter, not ${JSON.stringify(RELEASE)}`);
    const held = familyRows(groups).filter(([, , rule]) => rule.holds === RELEASE && !rule.pays).map(([key, , rule]) => `${key} (Round ${rule.round})`);
    if (held.length) {
      console.error(`genGameRules --release ${RELEASE}: Release ${RELEASE} waits on ${held.length} game(s) that do not pay yet: ${held.join(', ')}. Section 7.6: the flagship does not go for fun silently.`);
      code = 1;
    } else {
      console.log(`genGameRules --release ${RELEASE}: nothing Release ${RELEASE} waits on is still for fun.`);
    }
  } else {
    const seed = seedSql(groups);
    const disagree = seedAgainstTable(groups, seed);
    if (disagree.length) throw new Error(`the generator's own seed disagrees with ${FAMILIES_FILE}: ${disagree.slice(0, 5).join('; ')}${disagree.length > 5 ? `; and ${disagree.length - 5} more` : ''}`);
    if (CHECK) {
      const committed = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : null;
      console.log(`md5 ${md5(seed)}`);
      const rowProblems = committed === null ? [] : seedAgainstTable(groups, committed);
      if (committed === seed && rowProblems.length === 0) {
        console.log(`genGameRules --check: ${SEED_FILE} is what ${FAMILIES_FILE} generates, and every row of it is the table's.`);
      } else {
        if (committed !== seed) {
          const have = committed === null ? [] : committed.split('\n');
          const want = seed.split('\n');
          const differ = want.filter(l => !have.includes(l)).concat(have.filter(l => !want.includes(l)));
          console.error(`genGameRules --check: ${committed === null ? `${SEED_FILE} is missing` : `${SEED_FILE} is stale, ${differ.length} line(s) differ, first: ${differ[0]}`}. Run node scripts/genGameRules.mjs and commit it.`);
        }
        if (rowProblems.length) console.error(`genGameRules --check: ${rowProblems.length} row(s) of ${SEED_FILE} disagree with ${FAMILIES_FILE}, first: ${rowProblems[0]}`);
        code = 1;
      }
    } else {
      writeFileAtomic(target, seed);
      console.log(`genGameRules: wrote ${SEED_FILE}, md5 ${md5(seed)}.`);
    }
  }
} catch (e) {
  console.error(`genGameRules: ${e.message ?? e}`);
  code = 1;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.exit(code);
