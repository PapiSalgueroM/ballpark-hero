// Release AT review: ON THE RUNNER ONLY. Puts Round 1190's New Manager event object and Round 1191's four news
// edits back to Release AS's text in src/lib/soccerCareerEngine.ts, so a history harness that already takes
// Rounds 1185 and 1187 out by itself can be asked whether those two rounds are all that moved its recording.
// The request line restores the file afterwards (git checkout -- src scripts).
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const FILE = 'src/lib/soccerCareerEngine.ts';
const head = fs.readFileSync(FILE, 'utf8');
const base = execSync('git show 54e3820a:' + FILE, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const count = (src, needle) => src.split(needle).length - 1;
const must = (cond, msg) => { if (!cond) { console.error('inv3 ABORT: ' + msg); process.exit(2); } };
const block = (src, start, end, who) => {
  must(count(src, start) === 1 && count(src, end) === 1, `${who}: marker not exactly once: ${start} / ${end}`);
  return src.slice(src.indexOf(start), src.indexOf(end));
};
const BLOCKS = [
  ['event12', '{ id: 12, emoji:', '{ id: 13, emoji:'],
  ['newsTally', 'totalGoals > 0 && (totalGoals === 100', 'yearsPlaying >= 5 && s.currentClubTier <= 2 && ovr >= 78'],
  ['news100', 'totalGoals >= 100 && totalGoals - season.goals < 100,', 's.intStats.caps >= 100 && (s.intStats.caps'],
];
const ONLY = process.env.INV3_ONLY || 'both';
must(['both', 'event12', 'news'].includes(ONLY), 'INV3_ONLY must be both, event12 or news');
let out = head;
for (const [name, start, end] of BLOCKS) {
  if ((ONLY === 'event12') !== (name === 'event12') && ONLY !== 'both') continue;
  const mine = block(out, start, end, 'head ' + name), theirs = block(base, start, end, 'base ' + name);
  must(mine !== theirs, name + ': already equal');
  out = out.replace(mine, () => theirs);
}
const RET = 'return personalGoalMilestoneNews(out, s, season, NEWSPAPERS[0]);';
must(count(out, RET) === 2, 'news return not twice');
if (ONLY !== 'event12') out = out.split(RET).join('return out;');
must(out !== head, 'nothing changed');
fs.writeFileSync(FILE, out);
console.log(`inv3 (${ONLY}): ${FILE} put back to Release AS's text for ${ONLY === 'both' ? 'the New Manager event and the goal tally news' : ONLY === 'event12' ? 'the New Manager event only' : 'the goal tally news only'} (${head.length - out.length} characters shorter).`);
