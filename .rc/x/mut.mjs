/* Reviewer mutations (Round 1584, run lens). node mut.mjs <id>, run from the root of a throwaway worktree.
   Each mutation asserts its anchor is in the file exactly once (exit 3, MUT ABORT, otherwise). */
import fs from 'node:fs';

const FN = 'supabase/functions/soccer-grid-validate/index.ts';
const MIRROR = 'scripts/simSoccerGridLabels.mjs';
const LIB = 'scripts/lib/clubNamesakeDetect.mjs';
const SQL = 'scripts/qa/clubNamesakes1584Detect.sql';
const GEN = 'scripts/qa/genClubNamesakePurge1584.mjs';
const LEDGER = 'scripts/data/clubNamesakes1584/gridNamesakes.json';

const NL = '\n';
const FN_LINE = '    if ((CLUB_NAMESAKES[b] ?? []).map(norm).includes(a)) return false;' + NL;
const SUB_LINE = '    if (a === b || a.includes(b) || b.includes(a)) return true;' + NL;

const MUTS = {
  fnorder: [[FN, FN_LINE + SUB_LINE, SUB_LINE + FN_LINE]],
  fnkey: [[FN, '  "arsenal": [' + NL, '  "Arsenal": [' + NL]],
  fnnonorm: [[FN, '(CLUB_NAMESAKES[b] ?? []).map(norm).includes(a)', '(CLUB_NAMESAKES[b] ?? []).includes(a)']],
  forgetfn: [[FN, '"Arsenal Kyiv (-2019)", ', '']],
  forget: [[FN, '"Arsenal Kyiv (-2019)", ', ''], [LEDGER, 'JSON:drop:Arsenal Kyiv (-2019)', '']],
  mirrornonorm: [[MIRROR, '(NAMESAKES[b] ?? []).map(norm).includes(a)', '(NAMESAKES[b] ?? []).includes(a)']],
  jsbloc: [[LIB, 'if (bloc.length < rules.minBloc) continue;', 'if (bloc.length <= rules.minBloc) continue;']],
  jss1: [[LIB, 's.size_margin >= rules.s1Margin', 's.size_margin > rules.s1Margin']],
  sql14: [[SQL, 'select club, year, count(*)::int as n_all from base_all group by club, year', 'select club, year, count(*)::int as n_all from base group by club, year']],
  sqlsplit: [[SQL, " and strpos(club, ' / ') = 0", '']],
  sqlq: [[SQL, 'select percentile_cont(0.25) within group (order by u.v) as rest_q1', 'select percentile_disc(0.25) within group (order by u.v) as rest_q1']],
  purgevalid: [[GEN, '  if (verdict?.valid !== true) continue;' + NL, '']],
  purgelondon: [[GEN, '  if (rows.some(r => head.clubMatches(r.club, LABEL))) continue;' + NL, '']],
};

const id = process.argv[2];
if (!MUTS[id]) { console.error(`MUT ABORT: unknown mutation ${id}`); process.exit(3); }
for (const [file, from, to] of MUTS[id]) {
  let text = fs.readFileSync(file, 'utf8');
  const crlf = text.includes('\r\n');
  if (crlf) text = text.replace(/\r\n/g, '\n');
  if (from.startsWith('JSON:drop:')) {
    const name = from.slice('JSON:drop:'.length);
    const j = JSON.parse(text);
    const before = j.excluded.length;
    j.excluded = j.excluded.filter(e => e.stored !== name);
    if (j.excluded.length !== before - 1) { console.error(`MUT ABORT: ${name} not once in ${file}`); process.exit(3); }
    fs.writeFileSync(file, JSON.stringify(j, null, 1) + '\n');
    console.log(`MUT ${id}: dropped ${name} from ${file}`);
    continue;
  }
  const n = text.split(from).length - 1;
  if (n !== 1) { console.error(`MUT ABORT: anchor found ${n} times in ${file}: ${JSON.stringify(from).slice(0, 80)}`); process.exit(3); }
  text = text.replace(from, to);
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, '\r\n') : text);
  console.log(`MUT ${id}: applied to ${file}`);
}
