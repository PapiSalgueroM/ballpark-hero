/* Reviewer mutations, Round 1607 run lens (never committed). Applies one or more named mutations to the
   checked out tree on the runner; the request line runs a harness after it and restores with git checkout.
   Every mutation refuses (exit 2) unless its anchor is there exactly once, so a dead mutation cannot pass.
   Run: node .rc/x/rv-mut.mjs <name> [<name> ...] */
import fs from 'node:fs';

const TABLE = 'src/data/clubManagerDugouts.ts';
const RECEIPT = 'scripts/data/cmDugouts.receipt.json';
const FENCE = 'scripts/simClubManagerDugouts.mjs';
const ENGINE = 'src/lib/clubManager.ts';
const die = m => { console.log('MUTATION REFUSED: ' + m); process.exit(2); };
const swap = (file, from, to) => {
  const text = fs.readFileSync(file, 'utf8');
  const n = text.split(from).length - 1;
  if (n !== 1) die(`${file}: anchor found ${n} times: ${from}`);
  fs.writeFileSync(file, text.replace(from, to));
};
const editReceipt = fn => {
  const r = JSON.parse(fs.readFileSync(RECEIPT, 'utf8'));
  const before = JSON.stringify(r);
  fn(r);
  if (JSON.stringify(r) === before) die('the receipt edit changed nothing');
  fs.writeFileSync(RECEIPT, JSON.stringify(r, null, 2));
};
const chair = (r, club) => r.chairs.find(c => c.club === club) ?? die(`no chair ${club}`);

const M = {
  /* a month stored where only ONE host prints it (premierleague.com prints Arteta's 2019-12, nobody else) */
  month1host() {
    swap(TABLE, '"Arsenal": { name: "Mikel Arteta" },', '"Arsenal": { name: "Mikel Arteta", appointed: "2019-12" },');
    editReceipt(r => { chair(r, 'Arsenal').appointed = '2019-12'; });
  },
  /* a source that is Wikipedia itself */
  wiki() { editReceipt(r => { r.sources.find(s => s.id === 'S-PL2').url = 'https://en.wikipedia.org/wiki/List_of_Premier_League_managers'; }); },
  /* a source that is a known Wikipedia fork whose host does not contain "wiki" */
  wikimirror() { editReceipt(r => { r.sources.find(s => s.id === 'S-PL2').url = 'https://infogalactic.com/info/List_of_Premier_League_managers'; }); },
  /* a stored month after the opening day (a mid season replacement's month) */
  lateopen() {
    swap(TABLE, '"Newcastle": { name: "Matthias Jaissle", appointed: "2026-08" },', '"Newcastle": { name: "Matthias Jaissle", appointed: "2026-09" },');
    editReceipt(r => { const c = chair(r, 'Newcastle'); c.appointed = '2026-09'; for (const x of c.reads) if (x.month) x.month = '2026-09'; });
  },
  /* every read published long after the opening day (a current list naming a later man would look like this) */
  latereads() { editReceipt(r => { for (const s of r.sources) s.published = '2026-12-01'; }); },
  /* Arsenal's reads both on one registrable domain (dazn.com, two different source ids) */
  samedomain() { editReceipt(r => { const c = chair(r, 'Arsenal'); c.reads.forEach((x, i) => { x.source = i % 2 ? 'S-ES3' : 'S-PL3'; }); }); },
  /* the fence counts source ids instead of registrable domains in section 1 */
  fenceids() { swap(FENCE, 'doms.add(domainOf(s.url));', 'doms.add(s.id);'); },
  /* the fence counts source ids instead of domains for a stored month in section 4 */
  fencemonthids() { swap(FENCE, "months.filter(r => r.month === c.appointed).map(r => domainOf(sources.get(r.source)?.url ?? 'https://x.invalid'))", 'months.filter(r => r.month === c.appointed).map(r => r.source)'); },
  /* engine: the era is ignored, every era reads the 'now' rows */
  era() { swap(ENGINE, "return realDugoutFor(CM_DUGOUTS, state.eraId ?? 'now', club);", "return realDugoutFor(CM_DUGOUTS, 'now', club);"); },
  /* engine: the season one gate is dropped (a later season's new league seats opening day men) */
  season() { swap(ENGINE, 'if (state.season !== 1 || years !== 0 || club === state.clubName) return null;', 'if (years !== 0 || club === state.clubName) return null;'); },
};
const names = process.argv.slice(2);
if (!names.length) die('name a mutation');
for (const n of names) { if (!M[n]) die(`unknown mutation ${n}`); M[n](); console.log(`mutation ${n} applied`); }
