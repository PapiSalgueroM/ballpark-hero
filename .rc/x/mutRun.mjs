// Reviewer mutation applier for Round 1561 (runs on a GitHub runner only, restored by git checkout in the same line).
// node .rc/x/mutRun.mjs <id>   applies ONE mutation, asserts its anchor occurs exactly once, prints APPLIED.
import fs from 'node:fs';

const NHL = 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx';
const HOOK = 'src/components/front-office-shared/useGmCareerKit.ts';
const BIND = 'src/components/front-office-shared/careerBinding.ts';

const MUTS = {
  // dropped filter in the shared hook: the press waits on every hub round without the kit, not only the last
  hookwaits: [HOOK, 'waits: !kit && moment.phase === \'hub\' && moment.lastPeriod,', 'waits: !kit && moment.phase === \'hub\','],
  // off by one on the NHL last period: the last round never asks and never waits
  lastoff1: [NHL, 'lastPeriod: !!league && league.round >= NHL_FO_ROUNDS,', 'lastPeriod: !!league && league.round > NHL_FO_ROUNDS,'],
  // swapped argument: the season verdict reads the league from before the final round
  outcomepre: [NHL, 'outcome: nhlOutcome(lg, myTeam, sr, champ)', 'outcome: nhlOutcome(league, myTeam, sr, champ)'],
  // stale constant: a career box open does not hide the board's hub boxes
  hubpanels: [NHL, 'const deskPanelOpen = gmPanelFor(NHL_HUB_PANELS, gmOpen) !== null;', 'const deskPanelOpen = gmPanelFor(NHL_DESK_PANELS, gmOpen) !== null;'],
  // dropped line: taking a seat keeps a live trade call (critic 21d)
  talkskept: [NHL, 'setDraftNight(null); setTalks(null);', 'setDraftNight(null);'],
  // dropped line: a year out is not saved, so a reload can play it again
  sitnosave: [NHL, "    persist({ phase: 'fired', fired: true, postseason: { series: [], champion: r.report.champion, gradeLine: null } }, lg, myTeam);\n", ''],
  // swapped source in the shared binding: with the kit, the record from the save alone instead of the league's
  bindlegacy: [BIND, 'const seat = hostSeatOf(f.desk, kit.legacy);', 'const seat = hostSeatOf(f.desk, hostBoxLegacy(f.box));'],
};

const id = process.argv[2];
const m = MUTS[id];
if (!m) { console.error(`MUTATION ABORT: unknown id ${id}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`MUTATION ABORT: ${id} anchor occurs ${n} times in ${file}`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`MUTATION APPLIED: ${id} in ${file}`);
