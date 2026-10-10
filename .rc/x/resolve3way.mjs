/* Round 1229, fix pass 2, RUNNER ONLY: resolve the two conflicts Rounds 1218 and 1225 have with EACH OTHER
   (they are there with or without Round 1229), so a tree that holds all three rounds can be tried.
   Run from the repo root in the conflicted state, "ours" holding Round 1218 and "theirs" Round 1225.
   - src/lib/clubManager.ts: one block, the two import lines. Round 1225 rewrote the clubManagerFixtures
     import and Round 1218 the clubManagerVar import: keep 1225's first line and 1218's second.
   - src/components/club-manager/ClubManagerHelp.tsx: one block, both sides only add lines: keep both,
     Round 1218's import first.
   Any other shape is refused (exit 2): this is not a general resolver. */
import fs from 'node:fs';

function split(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const out = []; let block = null;
  for (const line of lines) {
    if (line.startsWith('<<<<<<< ')) { if (block) throw new Error('nested'); block = { ours: [], theirs: [], side: 'ours' }; continue; }
    if (block && line === '=======') { block.side = 'theirs'; continue; }
    if (block && line.startsWith('>>>>>>> ')) { out.push(block); block = null; continue; }
    if (block) block[block.side].push(line); else out.push(line);
  }
  if (block) throw new Error('unclosed');
  return out;
}
function refuse(why) { console.error(`resolve3way: ${why}`); process.exit(2); }
function resolve(file, pick) {
  const parts = split(file);
  const blocks = parts.filter(p => typeof p !== 'string');
  if (blocks.length !== 1) refuse(`${file} holds ${blocks.length} conflict blocks, one was expected`);
  const text = parts.flatMap(p => (typeof p === 'string' ? [p] : pick(p))).join('\n');
  if (text.includes('<<<<<<< ') || text.includes('>>>>>>> ')) refuse(`${file} still holds a marker`);
  fs.writeFileSync(file, text);
  console.log(`resolve3way: ${file} resolved (${blocks[0].ours.length} lines of ours, ${blocks[0].theirs.length} of theirs)`);
}

resolve('src/lib/clubManager.ts', b => {
  if (b.ours.length !== 2 || b.theirs.length !== 2) refuse('the engine block is not two lines a side');
  const fixtures = "from '@/lib/clubManagerFixtures';", video = "from '@/lib/clubManagerVar';";
  if (!b.ours[0].endsWith(fixtures) || !b.theirs[0].endsWith(fixtures) || !b.ours[1].endsWith(video) || !b.theirs[1].endsWith(video)) refuse('the engine block is not the two import lines');
  if (!b.ours[1].includes('cmVarCovers') || b.theirs[1].includes('cmVarCovers')) refuse('the video referee import is not Round 1218 on our side');
  return [b.theirs[0], b.ours[1]];
});
resolve('src/components/club-manager/ClubManagerHelp.tsx', b => {
  if (b.ours.length !== 1 || !b.ours[0].startsWith('import ')) refuse('our side of the help block is not one import line');
  if (!b.theirs[0].startsWith('import ')) refuse('their side of the help block does not start with an import');
  return [...b.ours, ...b.theirs];
});
