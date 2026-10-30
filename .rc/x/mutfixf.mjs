// Release BT fixer's negative controls. Runs ON THE RUNNER only, inside a scratch worktree.
// node .rc/x/mutFix.mjs <name> <dir>  -> applies one mutation in <dir>, exits 2 if an anchor is not there exactly once.
import fs from 'node:fs';
import path from 'node:path';
const HOOK = 'src/hooks/useLineupBuilder.ts';
const PAGE = 'src/pages/LineupBuilder.tsx';
const BOARD = 'src/components/us-career/UsCareerBoard.tsx';
const M = {
  // the two lines the fix added to reset(), taken out one at a time
  nocurtain: [[BOARD, '    setReveal(null);\n    setIntlResult(null);\n    setWallView(null);', '    setIntlResult(null);\n    setWallView(null);']],
  nointl: [[BOARD, '    setReveal(null);\n    setIntlResult(null);\n    setWallView(null);', '    setReveal(null);\n    setWallView(null);']],
  // the reviewer's three uncaught mutations (rBTG-xi401-a), same anchors
  nations: [[HOOK, "setTeamAssignments(selectedDraft.mode === 'mixed' ? getRandomTeamAssignments(11)", 'setTeamAssignments(true ? getRandomTeamAssignments(11)']],
  defaultclub: [[PAGE, "useState<DraftChoice['mode']>('mixed')", "useState<DraftChoice['mode']>('club-year')"]],
  rerollsame: [[HOOK, "&& (draftChoice.mode !== 'club-year' || t.name !== prev[filledCount]?.name)", '']],
  // the Arsenal withholding ignored by the draw, then by the reroll
  drawall: [[HOOK, '[...clubYearClubs].sort(', '[...ALL_CLUBS].sort(']],
  rerollall: [[HOOK, '? clubYearClubs.map((name)', '? ALL_CLUBS.map((name)']],
  // Mixed drawn as clubs only
  mixedclubs: [[HOOK, "setTeamAssignments(selectedDraft.mode === 'mixed' ? getRandomTeamAssignments(11)", "setTeamAssignments(selectedDraft.mode !== 'mixed' ? getRandomTeamAssignments(11)"]],
};
const [name, dir = '.'] = process.argv.slice(2);
const m = M[name];
if (!m) { console.log('MUT unknown ' + name); process.exit(2); }
for (const [file, from, to] of m) {
  const p = path.join(dir, file);
  const raw = fs.readFileSync(p, 'utf8');
  const crlf = raw.includes('\r\n');
  const src = raw.replace(/\r\n/g, '\n');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`MUT ${name} ABORT: anchor found ${n} times in ${file}`); process.exit(2); }
  const out = src.replace(from, to);
  fs.writeFileSync(p, crlf ? out.replace(/\n/g, '\r\n') : out);
  console.log(`MUT ${name} applied to ${file}`);
}
