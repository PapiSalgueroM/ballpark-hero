/* Review (runner lens) of Round 1343: apply ONE plausible mutation to the checkout, by name.
   Each anchor must be in its file exactly once, or the script exits 2 and nothing is changed.
   The request line restores the tree with git checkout -- src scripts afterwards. */
import fs from 'node:fs';

const MUTS = {
  /* A: an off by one in the seed of an old save: the matches before this one counted with this one. */
  seedcount: ['src/lib/clubManagerRecords.ts',
    '    missed = Math.max(0, playedBefore - before.length);',
    '    missed = Math.max(0, stats.played - before.length);'],
  /* B: the routing order swapped: sacked before retired (an out of work retirement reopens on the sacked screen). */
  sackedfirst: ['src/hooks/useClubManager.ts',
    "  return c.retired ? 'retired' : c.sacked ? 'sacked' : c.pendingSummary ? 'seasonEnd' : 'hub';",
    "  return c.sacked ? 'sacked' : c.retired ? 'retired' : c.pendingSummary ? 'seasonEnd' : 'hub';"],
  /* C: the write no longer comes first: the farewell shows whatever the disk said. */
  nowritefirst: ['src/hooks/useClubManager.ts',
    '    if (!next || !persist(next)) return false;',
    '    if (!next) return false;\n    persist(next);'],
  /* D: the seed drops the oldest row of the book instead of this match's row. */
  seedoldest: ['src/lib/clubManagerRecords.ts',
    '    const before = (state.h2h ?? []).slice(0, -1);',
    '    const before = (state.h2h ?? []).slice(1);'],
  /* E: the panel's second line needs two missed matches, not one. */
  missedtwo: ['src/components/club-manager/ClubManagerCareerPanel.tsx',
    '{high && (high.missed ?? 0) >= 1 && (',
    '{high && (high.missed ?? 0) > 1 && ('],
  /* F: the season end routing swapped: a season end retirement reopens on the summary. */
  summaryfirst: ['src/hooks/useClubManager.ts',
    "  return c.retired ? 'retired' : c.sacked ? 'sacked' : c.pendingSummary ? 'seasonEnd' : 'hub';",
    "  return c.sacked ? 'sacked' : c.pendingSummary ? 'seasonEnd' : c.retired ? 'retired' : 'hub';"],
};

const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`MUT unknown ${name}`); process.exit(2); }
const [file, from, to] = m;
const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const n = text.split(from).length - 1;
if (n !== 1) { console.log(`MUT ${name}: anchor found ${n} times in ${file}, not once; nothing changed`); process.exit(2); }
fs.writeFileSync(file, text.replace(from, to));
console.log(`MUT ${name} APPLIED to ${file}`);
