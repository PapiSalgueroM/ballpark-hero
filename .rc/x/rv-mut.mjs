// AN2 runner reviewer's mutation tool (never committed). node .rc/x/rv-mut.mjs <id>
// Applies ONE small mutation to the checkout it runs in. Exits 3 if the text it replaces is not there exactly
// once, so a mutation that changed nothing can never read as "the tests held".
import fs from 'node:fs';

const BOARD = 'src/components/us-career/UsCareerBoard.tsx';
const FRESH = 'src/lib/freshBuild.ts';
const TYCOON = 'src/hooks/useStadiumTycoon.ts';
const PAGE = 'src/pages/SoccerCareer.tsx';

const M = {
  // 1084's core promise: a refused save is SEEN as refused. Here the failure is swallowed.
  m1: [BOARD, "      setSaveFailure(pending.value === null ? 'remove' : 'write');\n", "      /* swallowed */\n"],
  // The trap brief 3a names: the reset's removal moved to a quiet guarded form.
  m2: [BOARD, "    saveValue(null);\n    setCareer(null);\n", "    try { localStorage.removeItem(sport.saveKey); } catch { /* guarded */ }\n    setCareer(null);\n"],
  // Retry must write the LATEST progress. Here a pending save keeps the first refused value.
  m3: [BOARD, "    pendingSave.current = { key: sport.saveKey, value };\n", "    pendingSave.current ??= { key: sport.saveKey, value };\n"],
  // The merge conflict in freshBuild: the offline stand down must come before the once flag is spent.
  m4: [FRESH,
    "  if (navigator.onLine === false) return false;\n  try {\n    if (sessionStorage.getItem(STALE_KEY) === '1') return false;\n    sessionStorage.setItem(STALE_KEY, '1');\n  } catch {\n    return false;\n  }\n",
    "  try {\n    if (sessionStorage.getItem(STALE_KEY) === '1') return false;\n    sessionStorage.setItem(STALE_KEY, '1');\n  } catch {\n    return false;\n  }\n  if (navigator.onLine === false) return false;\n"],
  // The other side of that conflict: Round 1142's stand down dropped from the stale chunk reload.
  m5: [FRESH, "  if (sessionStorageIsMemory) return false;\n  /* Release AM:", "  /* Release AM:"],
  // 1083: a sale is only a sale once the write went through. Here the old order is back.
  m6: [TYCOON,
    "    try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(next, now)); } catch { return false; }\n    stateRef.current = next;\n",
    "    stateRef.current = next;\n    try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(next, now)); } catch { /* ignore */ }\n"],
  // A merge slip: the season curtain (the screen a refused Play lands on) loses the notice.
  m8: [BOARD, "  if (reveal) {\n    return withSaveStatus(\n", "  if (reveal) {\n    return (\n"],
  // 1089's whole fix undone: the closing tag back under the timeline header, the later one gone.
  m9a: [PAGE,
    "            <span className=\"text-xs font-bold uppercase tracking-wider text-muted-foreground\">Career Timeline</span>\n          </div>\n",
    "            <span className=\"text-xs font-bold uppercase tracking-wider text-muted-foreground\">Career Timeline</span>\n          </div>\n          </div>\n"],
  m9b: [PAGE,
    "            <RivalrySummaryCard summary={career.rivalrySummary} career={career} />\n          )}\n          </div>\n",
    "            <RivalrySummaryCard summary={career.rivalrySummary} career={career} />\n          )}\n"],
};

const ids = process.argv.slice(2);
if (!ids.length) { console.error('usage: rv-mut.mjs <id> [id]'); process.exit(2); }
for (const id of ids) {
  const m = M[id];
  if (!m) { console.error(`no such mutation: ${id}`); process.exit(2); }
  const [file, from, to] = m;
  const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`MUTATION ${id} NOT APPLIED: its anchor is in ${file} ${n} times (wanted 1)`); process.exit(3); }
  fs.writeFileSync(file, src.replace(from, to));
  console.log(`MUTATION ${id} applied to ${file}`);
}
