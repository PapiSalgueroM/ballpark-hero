/* Reviewer mutations (Round 1213, lens RUN). Run from the repo root on the runner:
 *   node .rc/x/review-run-mut.mjs <name>
 * Each mutation asserts its anchor first and exits 2 when it cannot apply, so a
 * mutation that changed nothing is never read as a harness result.
 */
import fs from 'node:fs';

const name = process.argv[2];
const read = f => fs.readFileSync(f, 'utf8');
const write = (f, s) => fs.writeFileSync(f, s);
const bail = m => { console.error(`MUTATION ${name} COULD NOT APPLY: ${m}`); process.exit(2); };
const count = (s, needle) => s.split(needle).length - 1;
const replaceOnce = (f, from, to) => {
  const s = read(f);
  if (count(s, from) !== 1) bail(`${f}: wanted exactly one "${from.slice(0, 60)}", found ${count(s, from)}`);
  write(f, s.replace(from, to));
};
const FROZEN = 'scripts/data/cmLeagueFixtures.frozen.json';
const HARNESS = 'scripts/simCmLeagueFixtures.mjs';
const data = L => `src/data/clubManager${L}Fixtures2026.ts`;
const receipt = L => `scripts/data/clubManager${L}Fixtures2026.receipt.json`;

/* The matchday lines of a data file, as [lineIndex, pairs]. */
function roundLines(f) {
  const lines = read(f).split('\n');
  const start = lines.findIndex(l => l.trim() === 'rounds: [');
  if (start < 0) bail(`${f}: no rounds line`);
  const out = [];
  for (let i = start + 1; i < lines.length && lines[i].trim().startsWith('[['); i += 1) {
    out.push([i, JSON.parse(lines[i].trim().replace(/,$/, ''))]);
  }
  if (out.length < 30) bail(`${f}: only ${out.length} matchday lines read`);
  return { lines, rounds: out };
}
const emitRound = pairs => `    [${pairs.map(p => `[${JSON.stringify(p[0])}, ${JSON.stringify(p[1])}]`).join(', ')}],`;

/* Swap the ground of BOTH meetings of the first pair of matchday 1, in the data file. Returns the pair. */
function swapBothInLedger(L) {
  const { lines, rounds } = roundLines(data(L));
  const [x, y] = rounds[0][1][0];
  let hits = 0;
  for (const [i, pairs] of rounds) {
    const next = pairs.map(p => (((p[0] === x && p[1] === y) || (p[0] === y && p[1] === x)) ? (hits += 1, [p[1], p[0]]) : p));
    const text = emitRound(next);
    if (emitRound(pairs) !== lines[i].replace(/\r$/, '')) bail(`${data(L)}: line ${i + 1} is not in the form this script re-emits`);
    lines[i] = text;
  }
  if (hits !== 2) bail(`${data(L)}: ${x} and ${y} meet ${hits} times`);
  write(data(L), lines.join('\n'));
  return [x, y];
}
function swapBothInReceipt(L, x, y) {
  const R = JSON.parse(read(receipt(L)));
  let hits = 0;
  for (const s of R.sources) {
    const table = s.nameNormalization || {};
    const map = n => (Object.hasOwn(table, n) ? table[n] : n);
    for (const r of s.rows) {
      const [h, a] = [map(r.home), map(r.away)];
      if ((h === x && a === y) || (h === y && a === x)) { [r.home, r.away] = [r.away, r.home]; hits += 1; }
    }
  }
  if (hits !== 4) bail(`${receipt(L)}: ${hits} receipt rows flipped, wanted 4`);
  return R;
}
function dropFrozenLine(key) {
  const F = JSON.parse(read(FROZEN));
  if (!F.ledgers[key]) bail(`${FROZEN}: no line ${key}`);
  delete F.ledgers[key];
  write(FROZEN, `${JSON.stringify(F, null, 2)}\n`);
}

const MUTATIONS = {
  /* 1. the game renames one La Liga club: section D must go red for laliga */
  engineclub() { replaceOnce('src/lib/clubManager.ts', "'Espanyol', 'Getafe', 'Levante'", "'Espanyol', 'Getafe CF', 'Levante'"); },
  /* 2. one pair of clubs swaps grounds for both meetings, in the ledger file only: still a whole list, E and I must go red */
  ledgerswap() { swapBothInLedger('SerieA'); },
  /* 3. two whole matchdays change places in the ledger file only: A to D stay green, E and I must go red */
  roundswap() {
    const { lines, rounds } = roundLines(data('Ligue2'));
    const [i, j] = [rounds[2][0], rounds[3][0]];
    if (lines[i] === lines[j]) bail('the two matchday lines are equal');
    [lines[i], lines[j]] = [lines[j], lines[i]];
    write(data('Ligue2'), lines.join('\n'));
  },
  /* 4. the shipped link is changed in the ledger only: F must go red */
  srcurl() { replaceOnce(data('Eredivisie'), 'https://www.maxifoot.fr/calendrier-pays-bas-2026-2027.htm', 'https://www.maxifoot.fr/calendrier-pays-bas.htm'); },
  /* 5. a read day receipt claims the list as first published: E must go red */
  firstpub() { replaceOnce(receipt('LaLiga'), '"asFirstPublished": false', '"asFirstPublished": true'); },
  /* 6. one frozen line is deleted and nothing else: what does the gate (EXPECT=9) say? */
  unfreeze() { dropFrozenLine('laliga-2026-27-v1'); },
  /* 7. the frozen file is deleted: what does the gate say? */
  nofrozen() { if (!fs.existsSync(FROZEN)) bail('no frozen file'); fs.rmSync(FROZEN); },
  /* 8. a shipped list is rewritten and its frozen line deleted with it: ledger, receipt rows, receipt digest dropped */
  unfreezetamper() {
    const [x, y] = swapBothInLedger('LaLiga');
    const R = swapBothInReceipt('LaLiga', x, y);
    delete R.ledgerDigest;
    write(receipt('LaLiga'), `${JSON.stringify(R, null, 2)}\n`);
    dropFrozenLine('laliga-2026-27-v1');
  },
  /* 9. the harness loses its two "as first published" checks: does any control notice? */
  harnessnoasof() {
    const s = read(HARNESS);
    const a = "    if (e.frozen && !['release day', 'read day'].includes(s.listAsOf))";
    const b = '  if (e.frozen && R.asFirstPublished !== sources.some(';
    const lines = s.split('\n');
    const kept = lines.filter(l => !l.replace(/\r$/, '').startsWith(a) && !l.replace(/\r$/, '').startsWith(b));
    if (lines.length - kept.length !== 2) bail(`${HARNESS}: ${lines.length - kept.length} lines matched, wanted 2`);
    write(HARNESS, kept.join('\n'));
  },
  /* 10. the harness loses its snapshot hash check: does any control notice? */
  harnessnosnapshot() {
    const s = read(HARNESS);
    const a = '    if (e.frozen && !(s.snapshot && ';
    const lines = s.split('\n');
    const kept = lines.filter(l => !l.replace(/\r$/, '').startsWith(a));
    if (lines.length - kept.length !== 1) bail(`${HARNESS}: ${lines.length - kept.length} lines matched, wanted 1`);
    write(HARNESS, kept.join('\n'));
  },
  /* 11. the harness loses section D: the ghostclub control must notice */
  harnessnod() {
    replaceOnce(HARNESS, "if (strangers.length || absent.length || row.clubs.length !== n) red('D',", "if (false) red('D',");
  },
  /* 12. the harness compares the frozen digest with itself: the refreeze control must notice */
  harnessnoi() {
    replaceOnce(HARNESS, 'if (ledgerDigest(e.ledger) !== line.sha256) red(', 'if (line.sha256 !== line.sha256) red(');
  },
  /* 13. firstpub with the receipt's sentence rewritten too, on a league whose sources are both read day: E must still go red */
  firstpubsentence() {
    MUTATIONS.firstpub();
    const R = JSON.parse(read(receipt('LaLiga')));
    R.roundNumbers = 'The matchdays and venues of the list as first published.';
    write(receipt('LaLiga'), `${JSON.stringify(R, null, 2)}\n`);
  },
  /* 14. a source's listAsOf is flipped to release day with the claim: does the harness hold the claim to anything? */
  claimrelease() {
    const R = JSON.parse(read(receipt('LaLiga')));
    if (R.asFirstPublished !== false || R.sources[0].listAsOf !== 'read day') bail('laliga is not a read day receipt');
    R.asFirstPublished = true;
    R.sources[0].listAsOf = 'release day';
    write(receipt('LaLiga'), `${JSON.stringify(R, null, 2)}\n`);
  },
};

if (!MUTATIONS[name]) bail(`no such mutation, the mutations are ${Object.keys(MUTATIONS).join(', ')}`);
MUTATIONS[name]();
console.log(`MUTATION ${name} APPLIED`);
