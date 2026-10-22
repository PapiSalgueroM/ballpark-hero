/* Review of Round 1533 (run lens): one named mutation applied to a source file ON THE RUNNER,
 * exactly once, or exit 2 (a mutation that changes nothing proves nothing). The request line restores
 * the tree with git checkout -- src scripts after the harness ran. */
import fs from 'node:fs';

const BOARD = 'src/components/front-office/FrontOfficeBoard.tsx';
const HOST = 'src/lib/gmDeskHost.ts';
const DESK = 'src/lib/nflGmDesk.ts';
const M = {
  /* closeSeason reads the render's desk (from before the press) instead of the ref the week's tick moved. */
  deskstale: [BOARD, '      const deskNow = gmLive.current;', '      const deskNow = gm;'],
  /* the career boxes switch a desk off save's desk on by looking (the filter dropped). */
  opendesk: [BOARD, 'if (key !== null && !gm && league && gmPanelFor(NFL_DESK_PANELS, key)) {', 'if (key !== null && !gm && league) {'],
  /* finishDraft builds the ask again after a move (hostSummerMandate dropped at the board). */
  summer: [BOARD, 'const m = hostSummerMandate(mandate, mandateFor(lg, myTeam, champion === myTeam, pressTilt), lg.season);',
    'const m = mandateFor(lg, myTeam, champion === myTeam, pressTilt);'],
  /* the first call may come from the club that let him go (the filter dropped). */
  firstcallold: [HOST, '.sort((a, b) => a.strength - b.strength || b.id.localeCompare(a.id)).find(t => t.id !== last.team);',
    '.sort((a, b) => a.strength - b.strength || b.id.localeCompare(a.id)).find(() => true);'],
  /* off by one: still arriving on the season he runs at the new club. */
  arriving: [HOST, '  return !s.ended && s.from > leagueSeason;', '  return !s.ended && s.from >= leagueSeason;'],
  /* the hub reads the league's season as already counted. */
  seasoncounted: [DESK, "  if (phase === 'hub' || phase === 'pick') return false;", "  if (phase === 'pick') return false;"],
  /* the take saves the old club's trust while the screen shows the new one. */
  taketrust: [BOARD, "phase: 'recap', trust: next.trust, fired: false, mandate: next.mandate,", "phase: 'recap', trust, fired: false, mandate: next.mandate,"],
};
const name = process.argv[2];
if (!M[name]) { console.error(`unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = M[name];
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`MUTATION ${name}: the text is in ${file} ${n} times, not once: refused`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`MUTATION ${name} applied to ${file}`);
