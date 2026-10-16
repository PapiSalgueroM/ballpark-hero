/* Reviewer mutations for Round 1346. Usage: node .rc/x/mut.mjs <name>. Edits the checked out tree in place (the
   request line restores it with git checkout). Each anchor must be held exactly once. */
import fs from 'node:fs';
const MUTS = {
  /* M1 dropped filter: the card offers Undo after any showcase, not only a skip. */
  M1: ['src/components/career/DraftShowcaseCard.tsx',
    '{onUndoSkip && preDraftCanUndoSkip(state) && (',
    '{onUndoSkip && state.phase === "draft" && state.draft === null && (void preDraftCanUndoSkip, true) && ('],
  /* M2 stale layout: the over row drops back to one column even with Watch it again. */
  M2: ['src/components/career/DraftNightSequence.tsx',
    "(!over || onReplay) && 'grid-cols-2'",
    "!over && 'grid-cols-2'"],
  /* M3 dropped keys: the replay no longer remounts the card and the stage (correction 13's claim). */
  M3: ['src/components/us-career/ProspectJourney.tsx',
    '<DraftShowcaseCard key={nightRun} desc=',
    '<DraftShowcaseCard desc='],
  M3b: ['src/components/us-career/ProspectJourney.tsx',
    'key={`${eventKey}:${nightRun}`}',
    'key={eventKey}'],
  /* M4 dropped guard: a finished unemployed coach is offered Take the job in The Market. */
  M4: ['src/components/us-career/CoachCareerPanel.tsx',
    '{state.unemployed && !state.done && (',
    '{state.unemployed && ('],
};
const names = process.argv.slice(2);
if (!names.length) { console.log('name a mutation'); process.exit(2); }
for (const name of names) {
  const m = MUTS[name];
  if (!m) { console.log(`unknown mutation ${name}`); process.exit(2); }
  const [file, from, to] = m;
  const text = fs.readFileSync(file, 'utf8');
  const n = text.split(from).length - 1;
  if (n !== 1) { console.log(`MUTATION ${name} ABORT: anchor held ${n} times in ${file}`); process.exit(2); }
  fs.writeFileSync(file, text.replace(from, () => to));
  console.log(`MUTATION ${name} applied to ${file}`);
}
