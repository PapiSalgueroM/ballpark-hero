// REVIEW-run Round 1306: one small plausible mutation of a source file, applied in the CURRENT directory's tree.
// node mut.mjs <name>   exits 2 when the anchor does not occur exactly once (so a mutation can never silently do nothing).
import fs from 'node:fs';
const ENGINE = 'src/lib/clubManager.ts';
const BOOK = 'src/lib/clubManagerLeagueBook.ts';
const BOARDS = 'src/lib/clubManagerLeagueBoards.ts';
const MUTS = {
  // off by one: the late book says it started one round later than it did
  m1: [ENGINE, 'state.leagueBook = openLateBook(stamp, next.round, clubs, mine);', 'state.leagueBook = openLateBook(stamp, next.round + 1, clubs, mine);'],
  // swapped argument: an empty shirt stands at MY club's strength, not its own club's
  m2: [ENGINE, 'strengthOf(state, club), groupOf);', 'strengthOf(state, state.clubName), groupOf);'],
  // stale constant: the places of a partial eleven are a 4-3-3, not the 4-4-2 every full roster is picked in
  m3: [BOOK, 'const PLACES = { DEF: 4, MID: 4, ATT: 2 } as const;', 'const PLACES = { DEF: 4, MID: 3, ATT: 3 } as const;'],
  // dropped half of a filter: a man of mine with assists and no goal gets no baseline in a late book
  m4: [BOOK, 'book.b = mine.filter(t => t[1] > 0 || t[2] > 0)', 'book.b = mine.filter(t => t[1] > 0)'],
  // the critic's own wording for "nothing played yet": no goal scored (the builder says this is wrong after a goalless round)
  m5: [ENGINE, 'if (state.table.every(r => r.w + r.d + r.l === 0)) {', 'if (state.table.every(r => r.gf === 0)) {'],
  // wrong line: a thin club's clean sheet goes to its midfielders, not its defenders
  m6: [ENGINE, "const thinBacks = (outfield: readonly BookMan[]): BookMan[] => outfield.filter(p => groupOf(p.p) === 'DEF');", "const thinBacks = (outfield: readonly BookMan[]): BookMan[] => outfield.filter(p => groupOf(p.p) === 'MID');"],
  // the critic's correction 2 undone: the goals a late book was opened with count as unnamed in the share
  m7: [BOARDS, '  unnamed = Math.max(0, unnamed - (book.u0 ?? 0));', '  void book.u0;'],
  // a late book ranks my man on his whole season (no baseline taken off)
  m8: [BOARDS, 'goals: Math.max(0, p.goals - (b ? b[1] : 0)), assists: Math.max(0, p.assists - (b ? b[2] : 0)),', 'goals: p.goals, assists: p.assists,'],
  // swapped fields: the baseline of my men holds assists where goals belong
  m9: [ENGINE, '[p.id, p.comp?.league?.goals ?? 0, p.comp?.league?.assists ?? 0]);', '[p.id, p.comp?.league?.assists ?? 0, p.comp?.league?.goals ?? 0]);'],
  // the men of the last take cover the open places from the FRONT, so the shirts stand in the back lines
  m10: [BOOK, "  for (const line of ['DEF', 'MID', 'ATT'] as const) {", "  for (const line of ['ATT', 'MID', 'DEF'] as const) {"],
  // dropped filter: EVERY outfield man of a thin club's partial eleven gets its clean sheet (two other clubs' match)
  m6b: [ENGINE, '    if (against === 0) creditCleanSheet(book, club, thin.keeper, thinBacks(thin.outfield));', '    if (against === 0) creditCleanSheet(book, club, thin.keeper, thin.outfield);'],
  // the same slip on a club WITH an eleven (Round 1229's line), for attribution: is it only seen through the base?
  m11: [ENGINE, '  if (against === 0) creditCleanSheet(book, club, bookKeeper(xi), bookBacks(xi));', "  if (against === 0) creditCleanSheet(book, club, bookKeeper(xi), xi.filter(p => p.p !== 'GK'));"],
  // the keeper of a partial eleven is the first one listed, not the best rated
  m13: [BOOK, "  const keeper = byRating.find(m => m.p === 'GK') ?? null;", "  const keeper = roster.find(m => m.p === 'GK') ?? null;"],
  // the reader no longer refuses a late book whose starting round is not a count
  m16: [BOOK, '  if (late.r0 !== undefined && !isCount(late.r0)) return null;', '  void late.r0;'],
  // a late book forgets the sum it was opened with (the critic's correction 2 at its source)
  m17: [BOOK, '  book.u0 = before;', '  void before;'],
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.error(`mut: unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
const text = fs.readFileSync(file, 'utf8');
const n = text.split(from).length - 1;
if (n !== 1) { console.error(`mut ${name}: the anchor occurs ${n} times in ${file}, not once: NOT APPLIED`); process.exit(2); }
fs.writeFileSync(file, text.split(from).join(to));
const after = fs.readFileSync(file, 'utf8');
if (after === text || !after.includes(to)) { console.error(`mut ${name}: the file did not change`); process.exit(2); }
console.log(`mut ${name}: APPLIED in ${file}`);
