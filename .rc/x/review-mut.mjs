// Review mutations (r1572, reviewer "run"): applies one named mutation to a source file on the runner.
// Refuses (exit 2) unless the anchor occurs exactly once and the text changes. The request line restores with git checkout.
import fs from 'node:fs';
const LEAGUE = 'src/lib/aussieRulesLeague.ts', BOARD = 'src/components/aussie-rules-manager/AussieRulesLeagueBoard.tsx', HOOK = 'src/hooks/useAussieRulesLeague.ts';
const M = {
  // the honour board's goalkicker club reads the invented set whatever the save says (critic 6's extracted string)
  m1: [BOARD, '({clubShort(state, row.leadingGoalkicker.club)})', '({clubShort({}, row.leadingGoalkicker.club)})'],
  // the switch renames clubName but forgets to rename the clubs
  m2: [LEAGUE, "clubs: state.clubs.map(club => ({ ...club, name: identityIn('afl2026', club.id)!.full })) };", 'clubs: state.clubs };'],
  // the menu band heading is off by one at its top end
  m3: [BOARD, 'to ${ordinal(low + size)} in 2026', 'to ${ordinal(low + size - 1)} in 2026'],
  // the validator checks every club's name against the invented set (a real save is refused on load)
  m4: [LEAGUE, 'club.name !== identityIn(set, data.id)!.full', "club.name !== identityIn('fictional', data.id)!.full"],
  // the hook's start drops the set: new careers stay invented
  m5: [HOOK, 'createLeague(seed, clubId, CURRENT_CLUB_SET)', 'createLeague(seed, clubId)'],
  // the score card prints the short form
  m6: [BOARD, '<strong>{clubFull(state, match.homeId)}</strong>', '<strong>{clubShort(state, match.homeId)}</strong>'],
  // probe control: a new career's clubName is the short form (default path no longer byte identical)
  c1: [LEAGUE, 'clubName: identityIn(set, clubId)!.full', 'clubName: identityIn(set, clubId)!.short'],
  // probe control: the switch renames the clubs to their short form
  c2: [LEAGUE, "name: identityIn('afl2026', club.id)!.full }))", "name: identityIn('afl2026', club.id)!.short }))"],
};
const [file, anchor, repl] = M[process.argv[2]] || [];
if (!file) { console.error(`unknown mutation ${process.argv[2]}`); process.exit(2); }
const src = fs.readFileSync(file, 'utf8');
const count = src.split(anchor).length - 1;
if (count !== 1) { console.error(`mutation ${process.argv[2]}: anchor occurs ${count} times in ${file}`); process.exit(2); }
const next = src.split(anchor).join(repl);
if (next === src) { console.error('mutation changed nothing'); process.exit(2); }
fs.writeFileSync(file, next);
console.log(`mutation ${process.argv[2]} applied to ${file}`);
