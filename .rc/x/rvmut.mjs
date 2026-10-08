/* Round 1105 review: one small mutation at a time. node rvmut.mjs apply <id> | restore <id>. Never committed. */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const HOOK = 'src/hooks/useCollegeGrid.ts';
const ENGINE = 'src/lib/gridEngine.ts';
const LIB = 'src/lib/collegeGrid.ts';
const SEARCH = 'src/lib/playerSearch.ts';
const GEN = 'scripts/genCollegeGridData.mjs';

const M = {
  M1: { what: 'a pick with no key is charged a guess instead of being unverified', file: HOOK, edits: [['toast(KEY_UNVERIFIED);', "addDailyGuess({ t: 'x', board });"]] },
  M2: { what: 'the wait for the key is ten times longer than KEY_WAIT_MS', file: HOOK, edits: [['setTimeout(() => resolve(null), KEY_WAIT_MS)', 'setTimeout(() => resolve(null), KEY_WAIT_MS * 10)']] },
  M4: { what: 'a pick that waited is not dropped after the hook unmounted', file: HOOK, edits: [['if (!mounted.current) return;', '']] },
  M5: { what: 'a parsed but refused key is not forgotten', file: ENGINE, edits: [['if (!rows) forgetStaticJson(source.urls);', '']] },
  M6: { what: 'a URL that failed three times is kept as failed for the page life', file: ENGINE, edits: [['if (staticJson.get(url) === load) staticJson.delete(url);', '']] },
  M7: { what: 'the decoder no longer compares the two stamps', file: LIB, edits: [['judge.stamp !== search.stamp || ', '']] },
  M8: { what: 'school index check off by one (index equal to the list length passes)', file: LIB, edits: [['if (!isCount(at) || at >= schools.length) return null;', 'if (!isCount(at) || at > schools.length) return null;']] },
  M10: { what: 'the two first round bits are swapped in the decoder', file: LIB, edits: [['const FIRST_ROUND_TRUE = 1;', 'const FIRST_ROUND_TRUE = 2;'], ['const FIRST_ROUND_FALSE = 2;', 'const FIRST_ROUND_FALSE = 1;']] },
  M11: { what: 'a pick of 0 (no pick) is decoded as pick number 0 instead of null', file: LIB, edits: [['best_pick: pick === 0 ? null : pick,', 'best_pick: pick,']] },
  M12: { what: 'the memory search matches the start of the name only, so a surname finds nobody', file: LIB, edits: [['if (list.norms[i].includes(normalizedQuery))', 'if (list.norms[i].startsWith(normalizedQuery))']] },
  M13: { what: 'the memory search ranks the least prominent player first', file: LIB, edits: [['rank: list.names.length - i', 'rank: i']] },
  M14: { what: 'the audited drop matches year and pick only, so a real pick at the same slot is dropped too', file: GEN, edits: [[' && foldName(a.name) === fold);', ');']] },
  M17: { what: 'a names list that cannot load is reported as an empty result, not an error', file: SEARCH, edits: [["if (!rows) return { results: [], error: 'Could not load players' };", 'if (!rows) return { results: [], error: null };']] },
  M19: { what: 'a key file is tried once, never retried', file: ENGINE, edits: [['if (attempt >= STATIC_RETRY_MS.length) break;', 'if (attempt >= 0) break;']] },
  M23: { what: 'a names list that cannot load is handed to the search as an empty list (nobody by that name)', file: LIB, edits: [['if (!list) return null;', 'if (!list) return [];']] },
  M24: { what: 'a failed names load is kept for the page life, so typing again never retries', file: LIB, edits: [['if (searchLists.get(url) === load) searchLists.delete(url);', '']] },
  M26: { what: 'the hook keeps a failed key load, so the next pick never starts a fresh one', file: HOOK, edits: [['} else if (keyLoad.current === load) {', '} else if (keyLoad.current !== load) {']] },
  M31: { what: 'the identity open and Heisman open bits are swapped in the decoder', file: LIB, edits: [['const IDENTITY_OPEN = 8;', 'const IDENTITY_OPEN = 16;'], ['const HEISMAN_OPEN = 16;', 'const HEISMAN_OPEN = 8;']] },
  M21: { what: 'the hook reads the key through state only: a pick made before the key landed is unverified at once (no wait)', file: HOOK, edits: [['loadKey(),\n            new Promise<null>', 'Promise.resolve(null),\n            new Promise<null>']] },
};

const [, , verb, id] = process.argv;
const m = M[id];
if (!m) { console.error(`unknown mutation ${id}; known: ${Object.keys(M).join(', ')}`); process.exit(2); }
if (verb === 'restore') {
  execSync(`git checkout -- ${m.file}`, { stdio: 'inherit' });
  console.log(`restored ${m.file}`);
  process.exit(0);
}
if (verb !== 'apply') { console.error('verb is apply or restore'); process.exit(2); }
let text = fs.readFileSync(m.file, 'utf8').replace(/\r\n/g, '\n');
for (const [from, to] of m.edits) {
  const count = text.split(from).length - 1;
  if (count !== 1) { console.error(`mutation ${id}: "${from}" occurs ${count} times in ${m.file}, wanted exactly 1. NOTHING WAS MUTATED.`); process.exit(3); }
  text = text.replace(from, () => to);
}
fs.writeFileSync(m.file, text);
console.log(`applied ${id} to ${m.file}: ${m.what}`);
