/* Round 1105 fixer: one small mutation at a time. node fxmut.mjs apply <id> | restore <id>. Never committed. */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const HOOK = 'src/hooks/useCollegeGrid.ts';
const ENGINE = 'src/lib/gridEngine.ts';
const LIB = 'src/lib/collegeGrid.ts';

const M = {
  /* The reviewer's five survivors. */
  M8: { what: 'school index check off by one (index equal to the list length passes)', file: LIB, edits: [['if (!isCount(at) || at >= schools.length) return null;', 'if (!isCount(at) || at > schools.length) return null;']] },
  M12: { what: 'the memory search matches the start of the name only, so a surname finds nobody', file: LIB, edits: [['if (list.norms[i].includes(normalizedQuery))', 'if (list.norms[i].startsWith(normalizedQuery))']] },
  M13: { what: 'the memory search ranks the least prominent player first', file: LIB, edits: [['rank: list.names.length - i', 'rank: i']] },
  M23: { what: 'a names list that cannot load is handed to the search as an empty list', file: LIB, edits: [['if (!list) return null;', 'if (!list) return [];']] },
  M24: { what: 'a failed names load is kept for the page life', file: LIB, edits: [['if (searchLists.get(url) === load) searchLists.delete(url);', '']] },
  /* The fixer's own changes, each undone or bent. */
  N1: { what: 'a pool under the floor is no longer forgotten by the engine', file: ENGINE, edits: [['if (!data && cfg.staticSource) forgetStaticJson(cfg.staticSource.urls);', '']] },
  N2: { what: 'a stalled body is in effect never cut', file: ENGINE, edits: [['const STATIC_STALL_MS = 20_000;', 'const STATIC_STALL_MS = 2_000_000;']] },
  N3: { what: 'the stall limit is 10 seconds, so a slow body with 15 second gaps is cut', file: ENGINE, edits: [['const STATIC_STALL_MS = 20_000;', 'const STATIC_STALL_MS = 10_000;']] },
  N4: { what: 'the open cell moves while a pick waits', file: HOOK, edits: [['if (!pickWaits.current) setActiveCellNow(cell);', 'setActiveCellNow(cell);']] },
  N5: { what: 'the hold on the open cell is never let go', file: HOOK, edits: [['pickWaits.current = false;', '']] },
  N6: { what: 'a Heisman row equal to the count passes', file: LIB, edits: [['|| row >= count ||', '|| row > count ||']] },
  N7: { what: 'the floor accepts one row under it', file: LIB, edits: [['|| count < MIN_POOL_SIZE) return null;', '|| count < MIN_POOL_SIZE - 1) return null;']] },
  N8: { what: 'the floor refuses a key of exactly the floor', file: LIB, edits: [['|| count < MIN_POOL_SIZE) return null;', '|| count <= MIN_POOL_SIZE) return null;']] },
  N9: { what: 'the stall timer is not cleared after a read (a live timer is left behind)', file: ENGINE, edits: [['clearTimeout(gap);', '']] },
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
