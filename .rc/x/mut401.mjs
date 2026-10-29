// Reviewer mutations for PR 401 (Club year draft). Runs ON THE RUNNER only.
// node .rc/x/mut401.mjs <name>  -> applies one mutation, exits 2 if its anchor is missing (the control did not form).
import fs from 'node:fs';
const HOOK = 'src/hooks/useLineupBuilder.ts';
const PAGE = 'src/pages/LineupBuilder.tsx';
const M = {
  noyear: [HOOK, 'return Number.isInteger(year) && pick?.year === year', 'return Number.isInteger(year)'],
  nofilter: [PAGE, 'return recordedYear === null ? source : {', 'return true ? source : {'],
  nations: [HOOK, "setTeamAssignments(selectedDraft.mode === 'mixed' ? getRandomTeamAssignments(11)", 'setTeamAssignments(true ? getRandomTeamAssignments(11)'],
  rerollnations: [HOOK, "const all = draftChoice.mode === 'club-year'", 'const all = false'],
  age27: [PAGE, '(recordedInputs ? playerRating({ marketValue: value / 1_000_000, age } as Parameters<typeof playerRating>[0]) : null)',
    '(value > 0 ? playerRating({ marketValue: value / 1_000_000, age: age ?? 27 } as Parameters<typeof playerRating>[0]) : null)'],
  defaultclub: [PAGE, "useState<DraftChoice['mode']>('mixed')", "useState<DraftChoice['mode']>('club-year')"],
  noclubcheck: [HOOK, '&& clubPickVerifies(team, role, pick);', '&& true;'],
  rerollsame: [HOOK, "&& (draftChoice.mode !== 'club-year' || t.name !== prev[filledCount]?.name)", ''],
};
const name = process.argv[2];
const m = M[name];
if (!m) { console.log('MUT unknown ' + name); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`MUT ${name} ABORT: anchor found ${n} times in ${file}`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`MUT ${name} applied to ${file}`);
