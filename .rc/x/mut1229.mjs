/* Round 1229 review (lens RUN): one small mutation of the committed source, applied on a runner's checkout.
 * node .rc/x/mut1229.mjs <name>   exits 0 when the needle occurred exactly once and the file was rewritten,
 * 2 otherwise (so a mutation that changed nothing can never be read as "everything stayed green"). */
import fs from 'node:fs';

const ENGINE = 'src/lib/clubManager.ts';
const BOOK = 'src/lib/clubManagerLeagueBook.ts';
const MUTS = {
  /* A: the goal's own index is dropped from the deal key: every goal of one side in one match rolls the same. */
  keyindex: { file: BOOK, from: '    const rng = keyedRng(`${key}|${i}`);', to: '    const rng = keyedRng(key);' },
  /* B: a rival's goal against ME goes to the first outfield man on their pitch, whoever the report named. */
  wrongman: {
    file: ENGINE,
    from: '    let man: OppXiLine | null = bookNamed(there, line.name) ?? bookNamed(theirs, line.name);',
    to: "    let man: OppXiLine | null = there.find(p => p.p !== 'GK') ?? bookNamed(theirs, line.name);",
  },
  /* B2: the name lookup of my match finds nobody (as it would after a change to a report line's name):
     every rival goal against me is counted unnamed. */
  unnamed: {
    file: ENGINE,
    from: '    if (!creditGoal(book, opp, man) || !man || line.penalty || line.freeKick) return;',
    to: '    man = null;\n    if (!creditGoal(book, opp, man) || !man || line.penalty || line.freeKick) return;',
  },
  /* C: the filter that keeps an assist off a penalty or a direct free kick is dropped, in my match only. */
  penassistmine: {
    file: ENGINE,
    from: '    if (!creditGoal(book, opp, man) || !man || line.penalty || line.freeKick) return;',
    to: '    if (!creditGoal(book, opp, man) || !man) return;',
  },
  /* D: swapped argument: their clean sheet in my match is paid when THEY did not score. */
  cleanmine: {
    file: ENGINE,
    from: '  if (myGoals === 0 && live.oppXi) creditCleanSheet(',
    to: '  if (oppGoals === 0 && live.oppXi) creditCleanSheet(',
  },
  /* E: swapped argument: my men get a league clean sheet when I did not score. */
  creditmine: { file: ENGINE, from: '  if (oppGoals === 0) creditMine(', to: '  if (myGoals === 0) creditMine(' },
  /* F: stale constant: the taker rule is off. */
  takeroff: { file: ENGINE, from: 'export const CM_BOOK_TAKER = true;', to: 'export const CM_BOOK_TAKER = false;' },
  /* G: the bye week's results are not noted (the call is kept as text, so the harness's own anchors still count two). */
  byeweek: {
    file: ENGINE,
    from: '\n          noteBookResult(state, myLeagueId, entry.round, h, a, hg, ag);',
    to: '\n          { const keepBook = state.leagueBook; state.leagueBook = undefined; noteBookResult(state, myLeagueId, entry.round, h, a, hg, ag); state.leagueBook = keepBook; }',
  },
  /* H: off by one: the last of their lines in my match is never read (it is counted unnamed instead). */
  offbyone: { file: ENGINE, from: '  const lines = oppScorers.slice(0, oppGoals);', to: '  const lines = oppScorers.slice(0, Math.max(0, oppGoals - 1));' },
  /* I: the assist in my match is dealt over their whole eleven and bench, not the men on the pitch at that minute. */
  assistbench: { file: ENGINE, from: '    const assist = dealAssist(`${key}|${i}`, man, there, rules);', to: '    const assist = dealAssist(`${key}|${i}`, man, theirs, rules);' },
};

const name = process.argv[2];
if (name === '--dry') {
  /* Count every needle and write nothing. */
  let bad = 0;
  for (const [k, v] of Object.entries(MUTS)) {
    const n = fs.readFileSync(v.file, 'utf8').replace(/\r\n/g, '\n').split(v.from).length - 1;
    if (n !== 1) bad += 1;
    console.log(`${k}: ${n}`);
  }
  process.exit(bad ? 2 : 0);
}
const m = MUTS[name];
if (!m) { console.error(`mut1229: unknown mutation "${name}"`); process.exit(2); }
const text = fs.readFileSync(m.file, 'utf8');
const n = text.split(m.from).length - 1;
if (n !== 1) { console.error(`mut1229: ${name}: the needle occurs ${n} times in ${m.file}, not once`); process.exit(2); }
const next = text.split(m.from).join(m.to);
if (next === text) { console.error(`mut1229: ${name}: the edit changed nothing`); process.exit(2); }
fs.writeFileSync(m.file, next);
console.log(`mut1229: ${name} applied to ${m.file}`);
