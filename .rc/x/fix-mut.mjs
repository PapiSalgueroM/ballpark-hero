/* Fixer mutations (Round 1213). Run from the repo root on the runner:  node .rc/x/fix-mut.mjs <name>
 * Each mutation asserts its anchor first and exits 2 when it cannot apply, so a mutation that changed
 * nothing is never read as a harness result. The first four are the run reviewer's survivors, as it wrote them.
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
  write(f, s.replace(from, () => to));
};
const FROZEN = 'scripts/data/cmLeagueFixtures.frozen.json';
const HARNESS = 'scripts/simCmLeagueFixtures.mjs';
const data = L => `src/data/clubManager${L}Fixtures2026.ts`;
const receipt = L => `scripts/data/clubManager${L}Fixtures2026.receipt.json`;
const readReceipt = L => JSON.parse(read(receipt(L)));
const writeReceipt = (L, R) => write(receipt(L), `${JSON.stringify(R, null, 2)}\n`);

function roundLines(f) {
  const lines = read(f).split('\n');
  const start = lines.findIndex(l => l.trim() === 'rounds: [');
  if (start < 0) bail(`${f}: no rounds line`);
  const out = [];
  for (let i = start + 1; i < lines.length && lines[i].trim().startsWith('[['); i += 1) out.push([i, JSON.parse(lines[i].trim().replace(/,$/, ''))]);
  if (out.length < 30) bail(`${f}: only ${out.length} matchday lines read`);
  return { lines, rounds: out };
}
const emitRound = pairs => `    [${pairs.map(p => `[${JSON.stringify(p[0])}, ${JSON.stringify(p[1])}]`).join(', ')}],`;
function swapBothInLedger(L) {
  const { lines, rounds } = roundLines(data(L));
  const [x, y] = rounds[0][1][0];
  let hits = 0;
  for (const [i, pairs] of rounds) {
    const next = pairs.map(p => (((p[0] === x && p[1] === y) || (p[0] === y && p[1] === x)) ? (hits += 1, [p[1], p[0]]) : p));
    if (emitRound(pairs) !== lines[i].replace(/\r$/, '')) bail(`${data(L)}: line ${i + 1} is not in the form this script re-emits`);
    lines[i] = emitRound(next);
  }
  if (hits !== 2) bail(`${data(L)}: ${x} and ${y} meet ${hits} times`);
  write(data(L), lines.join('\n'));
  return [x, y];
}
function swapBothInReceipt(L, x, y) {
  const R = readReceipt(L);
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
  /* ---- the run reviewer's six survivors, data side ---- */
  unfreeze() { dropFrozenLine('laliga-2026-27-v1'); },
  nofrozen() { if (!fs.existsSync(FROZEN)) bail('no frozen file'); fs.rmSync(FROZEN); },
  unfreezetamper() {
    const [x, y] = swapBothInLedger('LaLiga');
    const R = swapBothInReceipt('LaLiga', x, y);
    delete R.ledgerDigest;
    writeReceipt('LaLiga', R);
    dropFrozenLine('laliga-2026-27-v1');
  },
  claimrelease() {
    const R = readReceipt('LaLiga');
    if (R.asFirstPublished !== false || R.sources[0].listAsOf !== 'read day') bail('laliga is not a read day receipt');
    R.asFirstPublished = true;
    R.sources[0].listAsOf = 'release day';
    writeReceipt('LaLiga', R);
  },
  /* ---- new, data side ---- */
  /* the same claim, dressed with stamps that would bear it out if the parser were a release day one */
  claimstamps() {
    MUTATIONS.claimrelease();
    const R = readReceipt('LaLiga');
    Object.assign(R.sources[0], { published: '2026-06-30T10:00:00Z', modified: '2026-06-30T10:00:00Z', released: '2026-06-30', releasedBasis: 'made up' });
    writeReceipt('LaLiga', R);
  },
  /* a release day source whose own bytes say it was changed weeks after the list came out, claim left in place */
  latemod() {
    const R = readReceipt('SerieA');
    if (R.sources[0].listAsOf !== 'release day' || !R.sources[0].modified) bail('seriea source 1 is not a stamped release day source');
    R.sources[0].modified = '2026-09-01T10:00:00+02:00';
    writeReceipt('SerieA', R);
  },
  /* the DFL's typed release day moved in the receipt only */
  releasedmoved() {
    const R = readReceipt('Bundesliga');
    if (R.sources[0].released !== '2026-07-02') bail('bundesliga source 1 has no released day 2026-07-02');
    R.sources[0].released = '2026-07-05';
    writeReceipt('Bundesliga', R);
  },
  /* a source loses the moment it was read */
  noreadat() {
    const R = readReceipt('Bundesliga');
    if (!R.sources[0].readAtUtc) bail('bundesliga source 1 has no readAtUtc');
    delete R.sources[0].readAtUtc;
    writeReceipt('Bundesliga', R);
  },
  /* a recheck that is the first read again */
  recheckfirstread() {
    const R = readReceipt('Primeira');
    if (!R.recheck) bail('primeira has no recheck');
    R.recheck.sources.forEach((k, i) => { k.readAtUtc = R.sources[i].readAtUtc; });
    writeReceipt('Primeira', R);
  },
  /* ---- harness side: each check is taken out, and its control must notice ---- */
  harnessnosnapshot() { replaceOnce(HARNESS, "if (!(s.snapshot && /^[0-9a-f]{64}$/.test(s.snapshot.sha256 || '') && s.snapshot.bytes > 0)) red('E',", "if (false) red('E',"); },
  harnessnoreadtime() { replaceOnce(HARNESS, "red('E', `source ${n} does not say when its bytes were read", 'void (`source ${n} does not say when its bytes were read'); },
  harnessnoasof() { replaceOnce(HARNESS, 'if (s.listAsOf !== listAsOfFrom(family.listAsOf, s.released, s.modified)) {', 'if (false) {'); },
  harnessnofirstpub() { replaceOnce(HARNESS, "if (R.asFirstPublished !== sources.some(s => s.listAsOf === 'release day')) red('E',", "if (false) red('E',"); },
  harnessnorecheck() { replaceOnce(HARNESS, "if (K !== null && !whole) red('E',", "if (false) red('E',"); },
  harnessnolostline() { replaceOnce(HARNESS, 'if (!Object.hasOwn(lines, e.ledger.key)) red(', 'if (false) red('); },
  harnessnodigest() { replaceOnce(HARNESS, 'if (e.receipt && !recorded) red(', 'if (false) red('); },
  /* the pre tool list grown by one key: that ledger is then let off, and its controls no longer apply */
  harnesspretool() { replaceOnce(HARNESS, "const PRE_TOOL_KEYS = ['premier-2026-27-v1'];", "const PRE_TOOL_KEYS = ['premier-2026-27-v1', 'laliga-2026-27-v1'];"); },
};

if (!MUTATIONS[name]) bail(`no such mutation, the mutations are ${Object.keys(MUTATIONS).join(', ')}`);
MUTATIONS[name]();
console.log(`MUTATION ${name} APPLIED`);
