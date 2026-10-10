/* Reviewer's mutation applier (Round 1219, the run lens). Runs on the runner only, against a checkout that is
   restored in the same request line. Each mutation is one plain text swap and refuses to run when its anchor is gone. */
import fs from 'node:fs';

const name = process.argv[2];
const K = 'src/lib/saveKeeper.ts';
const M = {
  none: null,
  /* the rule "if the copy cannot be written the key is left exactly as it was" */
  nocopycheck: [K, "      if (!copied.ok) return done(false, { why: 'no-room' });\n", ''],
  /* the copy before a version step only for an OLDER save (the draft's first form) */
  newerskip: [K, 'if (held === null || held === row.current) continue;', 'if (held === null || held >= row.current) continue;'],
  /* a journal that waited is applied anyway */
  nostale: [K, 'if (age > STAGED_FOR_MS || age < -CLOCK_SLACK_MS)', 'if (age < -CLOCK_SLACK_MS)'],
  /* a stale constant: five hours instead of five minutes */
  staleconst: [K, 'export const STAGED_FOR_MS = 5 * 60 * 1000;', 'export const STAGED_FOR_MS = 5 * 60 * 60 * 1000;'],
  /* the data path: one row of the table says the wrong thing about its game */
  aussieignores: [K, "'/aussie-rules-manager': { at: ['version'], current: 2, oldest: 2, other: 'refuses' },", "'/aussie-rules-manager': { at: ['version'], current: 2, oldest: 2, other: 'ignores' },"],
  /* a way back into the page that held the old game */
  assign: [K, 'window.location.replace(path);', 'window.location.assign(path);'],
  /* the backup a put back came from counts toward the cap again */
  playingcounted: [K, 'if (text === playing) { if (i === 0) newestIsPlaying = true; continue; }', 'if (text === playing && i === 0) newestIsPlaying = true;'],
  /* a put back is staged into a store that dies with the page */
  noblocked: [K, "  if (getStorageTrouble() === 'blocked') return { ok: false, why: 'blocked' };\n  if (!settlePendingSaves())", '  if (!settlePendingSaves())'],
  /* the boot call is gone from the entry (a merge that kept the other side) */
  nomaincall: ['src/main.tsx', '\nrunSaveKeeper();\n', '\n'],
  /* the card offers the save that is already being played */
  offerplaying: ['src/components/BrokenSaveRestore.tsx', '    if (playing) { setOffer(null); return; }\n', ''],
};
if (!Object.prototype.hasOwnProperty.call(M, name)) { console.error(`rrun-mut: no mutation named ${name}`); process.exit(3); }
if (M[name] === null) { console.log('rrun-mut: none (nothing changed)'); process.exit(0); }
const [file, from, to] = M[name];
const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
if (!src.includes(from)) { console.error(`rrun-mut ${name}: CANNOT APPLY, the anchor is not in ${file}`); process.exit(3); }
if (src.indexOf(from) !== src.lastIndexOf(from)) { console.error(`rrun-mut ${name}: CANNOT APPLY, the anchor is in ${file} twice`); process.exit(3); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`rrun-mut ${name}: applied to ${file}`);
