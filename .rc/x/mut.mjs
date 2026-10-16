// Review of Round 1344: one mutation of the engine, applied on the runner, fail closed (exit 9 if its anchor is not
// in the file exactly once). The request line restores the tree with git checkout -- src after its checks.
import fs from 'node:fs';
const M = {
  // A: the window's skip taken out: a deal the ledger refuses is still published (news and goneNames).
  A: ['src/lib/clubManager.ts',
    'if (moved === working) continue; working = moved; }',
    'working = moved; }'],
  // B: ruling 3 dropped: an AI club may take a man the ledger holds from a deal of mine.
  B: ['src/lib/clubManager.ts',
    '  return record.player.wage === undefined ? plainCopy(record.player) : null;',
    '  return plainCopy(record.player);'],
  // C: the stale wording: "until the summer" in every window (correction 15 asked for "next summer" in the summer).
  C: ['src/lib/clubManager.ts',
    "career.transferWindow === 'summer' ? 'next summer' : 'the summer'",
    "'the summer'"],
  // D: the repair forgets "this season only" (open question 6).
  D: ['src/lib/clubManager.ts',
    '|| line.season !== state.season || !gone.has(line.name)',
    '|| !gone.has(line.name)'],
  // E: aiDealPlayer loses the position test (namesakes of one age at one club, critic correction 5).
  E: ['src/lib/clubManager.ts',
    ': p.n === mp.name && p.a === mp.age && p.p === mp.position);',
    ': p.n === mp.name && p.a === mp.age);'],
  // F: the join drops decision 3's gone names (a man an AI club bought earlier this season is buyable after a move).
  F: ['src/lib/clubManagerCalendar.ts',
    '...(worldSeedOf(departed) === undefined ? {} : { goneNames:',
    '...(true ? {} : { goneNames:'],
};
const id = process.argv[2];
const m = M[id];
if (!m) { console.log(`mut: unknown mutation ${id}`); process.exit(9); }
const [file, from, to] = m;
const text = fs.readFileSync(file, 'utf8');
const n = text.split(from).length - 1;
if (n !== 1) { console.log(`mut ${id}: anchor found ${n} times in ${file}, NOT APPLIED`); process.exit(9); }
fs.writeFileSync(file, text.replace(from, () => to));
console.log(`mut ${id}: applied to ${file}`);
