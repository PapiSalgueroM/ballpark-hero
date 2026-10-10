// keeper-libs reviewer (Release AU). Runs ONLY in a runner's checkout. One named mutation of the save keeper's
// version table or copy rule; refuses (exit 2) when the text it changes is not there, so a mutation cannot be a no-op.
import fs from 'node:fs';

const KEEPER = 'src/lib/saveKeeper.ts';
const RECOVERY = 'src/lib/brokenSaveRecovery.ts';
const L = lines => lines.join('\n');
const M = {
  // the quiet copy before a version step is no longer marked as answered: the card would offer back a save this build refuses
  dismiss: [KEEPER, '      dismissBackup(entry, copied.backupKey, storage);\n', ''],
  // the backup a put back came from now counts toward the cap: a first put back at the cap drops one
  tidycount: [KEEPER, '    if (text !== playing && k !== made) counted.push(k);', '    if (k !== made) counted.push(k);'],
  // the cap never drops anything after a put back
  nocap: [KEEPER, '  for (const k of counted.slice(BACKUPS_KEPT - (made ? 1 : 0))) {', '  for (const k of counted.slice(9999)) {'],
  // copyAside no longer reads its copy back
  readback: [RECOVERY, "    if (storage.getItem(backupKey) !== raw) throw new Error('backup did not read back');\n", ''],
  // the put back no longer reads the key back
  keyreadback: [KEEPER, "    if (storage.getItem(entry.saveKey) !== incoming) throw new Error('put back did not read back');\n", ''],
  // the journal's age is asked BEFORE "already done"
  stalefirst: [KEEPER, L([
    '  if (cur !== null && isStaged(cur)) {',
    '    const dropped = tidy(entry, storage, null, cur);',
    '    return done(true, dropped ? { dropped } : {});',
    '  }',
    '  const age = now.getTime() - rec.at;',
    "  if (age > STAGED_FOR_MS || age < -CLOCK_SLACK_MS) return done(false, { why: 'stale' });",
    '',
  ]), L([
    '  const age = now.getTime() - rec.at;',
    "  if (age > STAGED_FOR_MS || age < -CLOCK_SLACK_MS) return done(false, { why: 'stale' });",
    '  if (cur !== null && isStaged(cur)) {',
    '    const dropped = tidy(entry, storage, null, cur);',
    '    return done(true, dropped ? { dropped } : {});',
    '  }',
    '',
  ])],
  // a game that MIGRATES another version gets no copy any more
  migrates: [KEEPER, "    if (!row || row.other === 'ignores') continue;", "    if (!row || row.other !== 'refuses') continue;"],
  // the version table: the academy's row says the number is ignored (the game refuses another number)
  tableignore: [KEEPER, "  '/wonderkid-factory': { at: ['v'], current: 1, oldest: 1, other: 'refuses' },", "  '/wonderkid-factory': { at: ['v'], current: 1, oldest: 1, other: 'ignores' },"],
  // the version table: Rebuild's oldest readable version is said to be 2 (its loader still opens 1)
  tableoldest: [KEEPER, "  '/rebuild': { at: ['v'], current: 2, oldest: 1, other: 'migrates' },", "  '/rebuild': { at: ['v'], current: 2, oldest: 2, other: 'migrates' },"],
  // the journal is matched on length alone
  lenonly: [KEEPER, '  const isStaged = (t: string): boolean => t.length === rec.len && sumOf(t) === rec.sum;', '  const isStaged = (t: string): boolean => t.length === rec.len;'],
  // a crash after the copy stacks a second copy
  restack: [KEEPER, '    if (heldAside(entry, storage, cur)) {', '    if (cur === null) {'],
  // a quiet copy that prunes: the copy before a version step goes through the fresh start path's cap
  staleforever: [KEEPER, 'export const STAGED_FOR_MS = 5 * 60 * 1000;', 'export const STAGED_FOR_MS = 5 * 24 * 60 * 60 * 1000;'],
};

const name = process.argv[2];
if (!M[name]) { console.error('klMut: unknown mutation ' + name + ' (' + Object.keys(M).join(', ') + ')'); process.exit(2); }
const [file, from, to] = M[name];
const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
if (!src.includes(from)) { console.error('klMut ' + name + ': CANNOT RUN, the text it changes is not in ' + file); process.exit(2); }
if (src.split(from).length !== 2) { console.error('klMut ' + name + ': CANNOT RUN, the text is in ' + file + ' more than once'); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log('klMut ' + name + ': ' + file + ' mutated in this checkout.');
