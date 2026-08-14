/**
 * Round 121 harness: does the manager in the other dugout actually do anything?
 *
 * Round 119 gave you a half time break and gave the opposition nothing. You
 * could go two down, throw everyone forward, and the other manager would stand
 * there for the whole second half. This measures the fix, and it has to answer
 * two questions that pull against each other.
 *
 * Does it change what happens? A side chasing a game and a side seeing one out
 * are the two most recognisable things in football, so if the rule is in and
 * nothing moves then it is decoration.
 *
 * And does it wreck the balance? Eleven rounds of work sit on top of these
 * scorelines. More goals is fine and expected. A league table that no longer
 * looks like a league table is not.
 *
 * The two arms are built by bundling the real engine twice: once as it ships,
 * and once from a copy with the rule neutralised. Nothing test-only goes into
 * the production file for this, and the arms are otherwise the same code.
 *
 * Run: node scripts/simOpposition.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src/lib/clubManager.ts');
const RUNS = Number(process.env.RUNS || 260);

/* ---------- build both engines ---------- */
/* The patched copy has to live NEXT TO the original, not in /tmp: clubManager
   imports its neighbours in src/lib, and a copy anywhere else cannot resolve
   them. It is written, bundled and deleted again in the same breath, so the
   repo is never left carrying it. */
const scratch = [];
process.on('exit', () => { for (const f of scratch) fs.rmSync(f, { force: true }); });

function bundle(tag, transform) {
  const src = fs.readFileSync(SRC, 'utf8');
  const out = transform ? transform(src) : src;
  const copy = path.join(ROOT, `src/lib/__oppArm_${tag}.ts`);
  fs.writeFileSync(copy, out);
  scratch.push(copy);
  const entry = `/tmp/oppEntry-${tag}.mjs`;
  fs.writeFileSync(entry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${copy}');
export const cm = mod;
`);
  const bundleFile = `/tmp/opp-${tag}.bundle.mjs`;
  execSync(`${ROOT}/node_modules/.bin/esbuild ${entry} --bundle --format=esm --platform=node --outfile=${bundleFile} --log-level=error`, { stdio: 'inherit' });
  return bundleFile;
}

const LIVE_RULE = "  if (oppGoals < myGoals) return half(MENT_MOD.attacking);\n  if (oppGoals - myGoals >= 2) return half(MENT_MOD.defensive);\n  return MENT_MOD.balanced;";
const DEAD_RULE = "  return MENT_MOD.balanced;";

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const withRule = bundle('on', null);
const withoutRule = bundle('off', s => {
  if (!s.includes(LIVE_RULE)) {
    // If this ever stops matching, the arms would be identical and every
    // comparison below would read as "the rule does nothing". Loud, not quiet.
    throw new Error('could not find the opposition rule to neutralise, so the two arms would have been the same engine');
  }
  return s.replace(LIVE_RULE, DEAD_RULE);
});

const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };

/** One season at Everton, every break seen, nothing changed by the player. */
async function measure(bundleFile) {
  const { cm } = await import(bundleFile);
  const { startCareer, playNextEntry, resumeMatch } = cm;
  const pts = [], gf = [], ga = [];
  let led = 0, ledAndWon = 0, ledAndLost = 0;
  for (let i = 0; i < RUNS; i++) {
    let s = startCareer('Everton');
    let guard = 0;
    while (s.week < s.calendar.length && guard < 200) {
      guard++;
      const r = playNextEntry(s);
      s = r.state;
      if (r.kind === 'seasonOver') break;
      if (r.kind !== 'halftime') continue;
      const hm = s.live.myGoals, ho = s.live.oppGoals;
      const done = resumeMatch(s);
      s = done.state;
      const rep = done.report;
      if (!rep) continue;
      const iAmHome = rep.home === s.clubName;
      const fm = iAmHome ? rep.homeGoals : rep.awayGoals;
      const fo = iAmHome ? rep.awayGoals : rep.homeGoals;
      if (hm !== ho) {
        led++;
        const leaderIsMe = hm > ho;
        const leaderWon = leaderIsMe ? fm > fo : fo > fm;
        const leaderLost = leaderIsMe ? fm < fo : fo < fm;
        if (leaderWon) ledAndWon++;
        if (leaderLost) ledAndLost++;
      }
    }
    const row = s.table.find(x => x.club === s.clubName);
    if (!row) throw new Error('my club is not in its own table');
    pts.push(row.pts); gf.push(row.gf); ga.push(row.ga);
  }
  return {
    pts, gf, ga,
    points: mean(pts), scored: mean(gf), conceded: mean(ga),
    heldPct: (100 * ledAndWon) / led,
    blewItPct: (100 * ledAndLost) / led,
    led,
  };
}

console.log(`Everton, ${RUNS} seasons an arm, every break seen and nothing changed by the player.`);
const off = await measure(withoutRule);
const on = await measure(withRule);

console.log('\n1) Does the other manager change anything');
console.log(`   opposition stands still: leader at the break won ${off.heldPct.toFixed(1)}%, lost ${off.blewItPct.toFixed(1)}%  (${off.led} matches)`);
console.log(`   opposition reacts:       leader at the break won ${on.heldPct.toFixed(1)}%, lost ${on.blewItPct.toFixed(1)}%  (${on.led} matches)`);
console.log(`   goals in a season: ${off.scored.toFixed(1)} for and ${off.conceded.toFixed(1)} against, becoming ${on.scored.toFixed(1)} and ${on.conceded.toFixed(1)}`);
if (on.heldPct >= off.heldPct) fail('a reacting opposition does not make a half time lead any harder to hold, so the rule does nothing');
if (on.scored + on.conceded <= off.scored + off.conceded) fail('two managers reacting produced no more goals than one, which cannot be right');
if (off.heldPct < 60 || off.heldPct > 90) fail(`the baseline itself looks wrong: a half time lead held ${off.heldPct.toFixed(1)}% of the time`);

console.log('\n2) Does it wreck the league');
const se = Math.sqrt(sd(off.pts) ** 2 / RUNS + sd(on.pts) ** 2 / RUNS);
const gap = Math.abs(on.points - off.points);
console.log(`   points ${off.points.toFixed(1)} against ${on.points.toFixed(1)}, a gap of ${gap.toFixed(2)} with three standard errors at ${(3 * se).toFixed(2)}`);
if (gap > 3 * se) fail(`the reacting opposition moved the league by ${gap.toFixed(2)} points, which is a balance change and not a realism one`);
if (on.points < 25 || on.points > 70) fail(`Everton finished on ${on.points.toFixed(1)} points, which is not a mid-table season`);
if (on.scored - off.scored > 12 || on.conceded - off.conceded > 12) {
  fail('goals moved by more than twelve a season, so the second half has stopped resembling the first');
}

console.log(failures === 0 ? '\nALL OPPOSITION CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
