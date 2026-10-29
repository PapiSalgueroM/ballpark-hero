/* Reviewer mutations (Round 1559, runner lens). node .rc/x/rvMut.mjs <name> applies ONE edit to a source file on
   the runner's checkout, after asserting the old text is there exactly once (exit 2 otherwise, so a mutation that
   cannot apply never reads as a survivor). The request line restores with git checkout -- src scripts. */
import fs from 'node:fs';

const M = {
  /* the year out's draft taken in standings order instead of reversed (worst club first is the rule) */
  reverse: ['src/lib/nhlGmCareer.ts', 'const order = nhlFoStandings(league).map(t => t.abbr).reverse();', 'const order = nhlFoStandings(league).map(t => t.abbr);'],
  /* the take hands the NEW club its lineup back to automatic instead of the old one (a swapped argument) */
  swaprelease: ['src/lib/gmCareerBind.ts', 's.releaseOldClub(league, legacy.team);', 's.releaseOldClub(league, teamId);'],
  /* a year out's round forgets the rivals' moves (a dropped line) */
  dropaimoves: ['src/lib/nhlGmCareer.ts', "      nhlAiMoves(league, '', rng);\n", ''],
  /* the year out's pick ledger rolled for the wrong season (a stale read, off by one) */
  stalesummer: ['src/lib/nhlGmCareer.ts', 'const closed = league.season;', 'const closed = league.season + 1;'],
  /* the shared retained step forgets to put the kept figure back (a dropped line) */
  keepamount: ['src/lib/gmTradePackage.ts', '    entry.amount = r.kept;\n', ''],
  /* the option defaults ON: every caller without it now trims every club, his own too (the default path moves) */
  optdefault: ['src/lib/nhlFrontOffice.ts', 'const noUserClub = opts?.noUserClub === true;', 'const noUserClub = opts?.noUserClub !== false;'],
  /* the retained rows travel as the club's on a take (a fresh empty list) instead of staying the league's */
  retainedclub: ['src/lib/nhlGmCareer.ts', '{ key: NHL_DESK_KEYS.retained, owner: \'league\' },', '{ key: NHL_DESK_KEYS.retained, owner: \'club\', fresh: () => [] },'],
  /* the books word keyed to the wrong cap model */
  books: ['src/lib/gmCareerFace.ts', "gmSport(sport).cap.model === 'cbtLine'", "gmSport(sport).cap.model === 'softTax'"],
  /* the season counted rule forgets the pick screen */
  countedpick: ['src/lib/gmCareerFace.ts', "  if (phase === 'hub' || phase === 'pick') return false;\n  const stored = desk ? desk.blocks[GM_HOST_KEYS.seat] : undefined;", "  if (phase === 'hub') return false;\n  const stored = desk ? desk.blocks[GM_HOST_KEYS.seat] : undefined;"],
  /* the kit rule forgets the last period on the hub */
  kitlast: ['src/components/front-office-shared/careerKitLoader.ts', ' || (m.phase === \'hub\' && m.lastPeriod)', ''],
  /* the NHL away summer runs the engine with the old club named (it is then never trimmed) */
  namedsummer: ['src/lib/nhlGmCareer.ts', 'nhlOffseason(league, rng, undefined, { noUserClub: true });', 'nhlOffseason(league, rng, oldTeam);'],
};
const name = process.argv[2];
const m = M[name];
if (!m) { console.error(`unknown mutation ${name}: ${Object.keys(M).join(', ')}`); process.exit(2); }
const [file, from, to] = m;
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
const text = crlf ? raw.replaceAll('\r\n', '\n') : raw;
const count = text.split(from).length - 1;
if (count !== 1) { console.error(`MUTATION ${name}: anchor found ${count} times in ${file}, not applied`); process.exit(2); }
const out = text.replace(from, to);
fs.writeFileSync(file, crlf ? out.replaceAll('\n', '\r\n') : out);
console.log(`MUTATION ${name} applied to ${file}`);
