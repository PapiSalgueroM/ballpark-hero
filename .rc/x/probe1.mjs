/* Reviewer's probe for Round 1227 (runner only): the one place rule AT THE REAL CALL SITE.
   The harness's N.U5 hands the hook `firstTeam` itself, so it cannot see whether simSeason passes the true
   fact. This plays the real simSeason on hand boosted careers (both men rated 97 every year, so the first
   team All-Pro is common for both) and counts the seasons where both hold the honour, by position.
   node .rc/x/probe1.mjs      exits 1 when a one place position (QB, RB, TE, K) has such a season, or when the
   fleet had no power to see one (fewer than 5 expected if the two were independent). */
import { bundleHead, seeded, POS, ONE_PLACE } from './rvlib.mjs';

const H = await bundleHead('probe'); const S = H.NFL_CAREER_SPORT;
const PER = Number(process.env.RV_PROBE || 500);
const st = {};
for (const pos of POS) {
  const t = (st[pos] = { seasons: 0, mine: 0, his: 0, both: 0, hisWhenNotMine: 0, notMine: 0 });
  for (let i = 0; i < PER; i += 1) seeded(31000 + i * 13 + pos.length * 7, rnd => {
    const archs = S.create.archetypes[pos];
    const c = S.startCareer('Probe', pos, archs[i % archs.length], rnd, null, i % 2 ? 'y2005' : 'now');
    const tq = 90; S.assignRole(c, tq, rnd);
    for (let g = 0; g < 4 && c.rival; g += 1) {
      S.campBattle(c, tq, rnd);
      c.ovr = 97; c.pot = 99; c.morale = 95; c.health = 100; c.role = 'starter'; c.age = 26;
      c.rival.ovr = 97; c.rival.pot = 99; c.rival.age = 26; c.rival.retired = false;
      const played = S.simSeason(c, tq, rnd);
      const mine = played.line.awards.includes('All-Pro'); const his = c.rival.lastAllStar === true;
      t.seasons += 1; if (mine) t.mine += 1; if (his) t.his += 1; if (mine && his) t.both += 1;
      if (!mine) { t.notMine += 1; if (his) t.hisWhenNotMine += 1; }
      S.progress(c, rnd);
    }
  });
}
let bad = 0; let weak = 0;
for (const pos of POS) {
  const t = st[pos]; const expected = t.notMine ? t.mine * (t.hisWhenNotMine / t.notMine) : 0;
  const one = ONE_PLACE.includes(pos);
  console.log(`   ${pos.padEnd(5)} ${one ? 'one place ' : 'more places'}  seasons ${t.seasons}  mine ${t.mine}  his ${t.his}  both ${t.both}  (his rate when I am not on it ${(100 * t.hisWhenNotMine / Math.max(1, t.notMine)).toFixed(1)}%, so about ${expected.toFixed(1)} both seasons expected if nothing forbade it)`);
  if (one && t.both > 0) bad += 1;
  if (one && expected < 5) weak += 1;
}
const multi = POS.filter(p => !ONE_PLACE.includes(p)).reduce((a, p) => a + st[p].both, 0);
console.log(`probe1: one place positions with both men on the first team in a season: ${bad}; without the power to see one: ${weak}; both seasons where the team names more than one: ${multi}`);
console.log(`probe1: ${bad === 0 && weak === 0 && multi > 0 ? 'HELD, the rule holds at the real call site' : bad ? 'BROKEN, two men on a first team that names one' : 'NO POWER, the probe could not have seen it'}`);
process.exit(bad === 0 && weak === 0 && multi > 0 ? 0 : 1);
