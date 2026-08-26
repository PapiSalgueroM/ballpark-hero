/**
 * Round 289 harness: Face Off deals fair pairs, the rival is the difficulty
 * it claims to be, and the record cannot be corrupted by a bad save.
 *
 *   1. THE POOLS CAN DEAL. Every category has enough athletes with distinct
 *      numbers to make dozens of legal pairs, measured by counting them.
 *   2. A DEAL IS A DEAL. Five hundred seeded matches: ten rounds each, no
 *      athlete twice in a match, no sport twice in a row, every pair inside
 *      the ratio band, the higher card really is higher, and every sport gets
 *      its share of the deck.
 *   3. THE DAILY IS THE SAME FOR EVERYBODY AND DIFFERENT TOMORROW.
 *   4. THE RIVALS ARE ORDERED. The Rookie is beaten by a decent fan more
 *      often than not and the Legend beats that same fan more often than not,
 *      and the three hit rates climb in the order the labels promise.
 *   5. THE ARITHMETIC. Points, resolution, totals, sudden death.
 *   6. THE SAVE. Garbage loads as fresh, a real one round trips, a match books.
 *
 * NEGATIVE CONTROL: FACEOFF_CONTROL=tie hands the dealer pools where every
 * number is the same, so no legal pair exists; section 2 must go red.
 *
 * Run: node scripts/simFaceOff.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/faceOffEntry.mjs';
const BUNDLE = '/tmp/faceOff.bundle.mjs';
fs.writeFileSync(ENTRY, `export * from '${ROOT}/src/lib/faceOff.ts';`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
const F = await import(BUNDLE);

const CONTROL = process.env.FACEOFF_CONTROL || '';
if (CONTROL && CONTROL !== 'tie') { console.error(`FACEOFF_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

let cats = F.buildCategories();
if (CONTROL === 'tie') {
  const before = JSON.stringify(cats.map(c => c.pool.map(a => a.value)));
  cats = cats.map(c => ({ ...c, pool: c.pool.map(a => ({ ...a, value: 7 })) }));
  if (JSON.stringify(cats.map(c => c.pool.map(a => a.value))) === before) { console.error('control changed nothing'); process.exit(1); }
  console.log('   NEGATIVE CONTROL ON: every number in every pool set to 7, so no legal pair exists; section 2 must go red');
}

console.log('1) the pools can deal');
{
  for (const c of cats) {
    const pool = c.pool.filter(a => a.value > 0);
    let legal = 0;
    for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
      const hi = Math.max(pool[i].value, pool[j].value), lo = Math.min(pool[i].value, pool[j].value);
      if (hi / lo >= F.MIN_RATIO && hi / lo <= F.MAX_RATIO) legal += 1;
    }
    if (pool.length < 12) fail(`${c.key} has ${pool.length} athletes with a positive number, wanted 12 or more`);
    /* measured on the shipped pools: the thinnest is tennis with a few hundred legal pairs; 60 leaves headroom for a pool trimmed by half */
    if (legal < 60 && CONTROL !== 'tie') fail(`${c.key} can make ${legal} legal pairs, wanted 60 or more`);
    const names = new Set(pool.map(a => a.name));
    if (names.size !== pool.length) fail(`${c.key} lists a name twice`);
    if (!c.question.endsWith('?')) fail(`${c.key} question is not a question: ${c.question}`);
  }
  const sports = new Set(cats.map(c => c.sport));
  console.log(`   ${cats.length} categories across ${sports.size} sports, ${cats.reduce((n, c) => n + c.pool.length, 0)} athletes`);
  if (sports.size < 8) fail(`only ${sports.size} sports in the deck`);
}

console.log('2) a deal is a deal');
{
  const N = 500;
  const bySport = {};
  let rounds = 0;
  for (let m = 0; m < N; m++) {
    const rng = F.makeRng(1000 + m);
    const deal = F.dealRounds(cats, rng, 'pro');
    if (deal.length !== F.ROUNDS) { fail(`match ${m} dealt ${deal.length} rounds, wanted ${F.ROUNDS}`); continue; }
    const seen = new Set();
    let last = '';
    for (const r of deal) {
      rounds += 1;
      bySport[r.sport] = (bySport[r.sport] || 0) + 1;
      if (r.a.name === r.b.name) fail(`match ${m}: ${r.a.name} against themselves`);
      if (seen.has(r.a.name) || seen.has(r.b.name)) fail(`match ${m}: an athlete dealt twice`);
      seen.add(r.a.name); seen.add(r.b.name);
      if (r.sport === last) fail(`match ${m}: ${r.sport} twice in a row`);
      last = r.sport;
      const hi = Math.max(r.a.value, r.b.value), lo = Math.min(r.a.value, r.b.value);
      if (hi === lo) fail(`match ${m}: a tie was dealt (${r.a.name} ${r.a.value} v ${r.b.name} ${r.b.value})`);
      if (hi / lo < F.MIN_RATIO - 1e-9 || hi / lo > F.MAX_RATIO + 1e-9) fail(`match ${m}: ratio ${(hi / lo).toFixed(2)} outside the band`);
      if ((r.higher === 'a') !== (r.a.value > r.b.value)) fail(`match ${m}: higher card mislabelled`);
      if (!(r.rival.seconds >= 0 && r.rival.seconds <= F.SHOT_CLOCK)) fail(`match ${m}: rival answered at ${r.rival.seconds}s`);
    }
  }
  const shares = Object.entries(bySport).map(([s, n]) => [s, n / Math.max(1, rounds)]);
  console.log(`   ${N} matches, ${rounds} rounds; sport shares: ${shares.map(([s, p]) => `${s} ${(p * 100).toFixed(0)}%`).join(', ')}`);
  /* ten sports drawn uniformly is 10% each; the never twice in a row rule bends that a little. Floor at 5%, half the expectation. */
  for (const [s, p] of shares) if (p < 0.05) fail(`${s} is only ${(p * 100).toFixed(1)}% of the deck`);
  const sportsSeen = Object.keys(bySport).length;
  const sportsInDeck = new Set(cats.map(c => c.sport)).size;
  if (sportsSeen !== sportsInDeck && CONTROL !== 'tie') fail(`${sportsInDeck - sportsSeen} sport(s) never dealt in ${N} matches`);
  if (CONTROL === 'tie') {
    /* the later sections need a dealt match to work on, and the control has made dealing impossible on purpose */
    if (failures > 0) { console.log(`\nsimFaceOff control: green. The dealer with no legal pairs was reported (${failures} findings).`); process.exit(0); }
    console.error('\nsimFaceOff control: RED. Pools with no legal pair went unreported.'); process.exit(1);
  }
}

console.log('3) the daily is the same for everybody and different tomorrow');
{
  const key = deal => deal.map(r => `${r.a.name}|${r.b.name}`).join(';');
  const day = d => { const t = new Date(Date.UTC(2026, 7, 1)); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10); };
  const a1 = F.dealRounds(cats, F.makeRng(F.seedForDate(day(0))), F.DAILY_DIFFICULTY);
  const a2 = F.dealRounds(cats, F.makeRng(F.seedForDate(day(0))), F.DAILY_DIFFICULTY);
  if (JSON.stringify(a1) !== JSON.stringify(a2)) fail('the same date dealt two different duels');
  const keys = [];
  const pairs = [];
  for (let d = 0; d < 60; d++) {
    const deal = F.dealRounds(cats, F.makeRng(F.seedForDate(day(d))), F.DAILY_DIFFICULTY);
    keys.push(key(deal));
    pairs.push(new Set(deal.map(r => [r.a.name, r.b.name].sort().join('|'))));
  }
  if (new Set(keys).size !== 60) fail(`${60 - new Set(keys).size} of 60 days dealt an identical duel`);
  let worst = 0;
  for (let i = 0; i < 60; i++) for (let j = i + 1; j < 60; j++) {
    let shared = 0;
    for (const p of pairs[i]) if (pairs[j].has(p)) shared += 1;
    worst = Math.max(worst, shared);
  }
  console.log(`   60 days: all distinct, the two most alike days share ${worst} pair(s)`);
  if (worst > 3) fail(`two days within two months share ${worst} identical pairs`);
}

console.log('4) the rivals are ordered');
{
  const hit = {};
  const pts = {};
  for (const r of F.RIVALS) {
    let c = 0, p = 0, n = 0;
    for (let m = 0; m < 300; m++) {
      const deal = F.dealRounds(cats, F.makeRng(50_000 + m), r.key);
      for (const rd of deal) { n += 1; if (rd.rival.correct) c += 1; p += F.pointsFor(rd.rival.correct, rd.rival.seconds); }
    }
    hit[r.key] = c / n; pts[r.key] = p / n;
  }
  console.log(`   hit rate: rookie ${(hit.rookie * 100).toFixed(1)}%, pro ${(hit.pro * 100).toFixed(1)}%, legend ${(hit.legend * 100).toFixed(1)}%; points a round: ${pts.rookie.toFixed(0)}, ${pts.pro.toFixed(0)}, ${pts.legend.toFixed(0)}`);
  if (!(hit.rookie + 0.05 < hit.pro && hit.pro + 0.05 < hit.legend)) fail('the rivals do not climb by at least five points each in hit rate');
  if (!(pts.rookie + 10 < pts.pro && pts.pro + 10 < pts.legend)) fail('the rivals do not climb by at least ten points a round');
  /* a decent fan: right 72% of the time, answering in 4 seconds, modelled the same way the rival is */
  const fan = (deal, rng) => {
    const results = deal.map(rd => F.resolveRound(rd, rng() < 0.72 ? rd.higher : rd.higher === 'a' ? 'b' : 'a', 4));
    return F.outcome(F.totals(results));
  };
  const winRate = {};
  for (const r of F.RIVALS) {
    let w = 0, n = 0;
    for (let m = 0; m < 400; m++) {
      const rng = F.makeRng(90_000 + m);
      const deal = F.dealRounds(cats, rng, r.key);
      const o = fan(deal, rng);
      n += 1; if (o === 'win') w += 1;
    }
    winRate[r.key] = w / n;
  }
  console.log(`   a 72% fan at 4s wins: rookie ${(winRate.rookie * 100).toFixed(0)}%, pro ${(winRate.pro * 100).toFixed(0)}%, legend ${(winRate.legend * 100).toFixed(0)}%`);
  if (winRate.rookie < 0.6) fail(`a decent fan beats the Rookie only ${(winRate.rookie * 100).toFixed(0)}% of the time, wanted 60% or more`);
  if (winRate.legend > 0.4) fail(`a decent fan beats the Legend ${(winRate.legend * 100).toFixed(0)}% of the time, wanted 40% or less`);
  if (!(winRate.rookie > winRate.pro && winRate.pro > winRate.legend)) fail('the fan\'s win rate does not fall as the rival climbs');
}

console.log('5) the arithmetic');
{
  const cases = [[true, 0, 200], [true, 0.5, 190], [true, 4, 160], [true, 9.5, 100], [true, 10, 100], [true, 12, 100], [false, 0, 0], [false, 10, 0]];
  for (const [ok, s, want] of cases) if (F.pointsFor(ok, s) !== want) fail(`pointsFor(${ok}, ${s}) = ${F.pointsFor(ok, s)}, wanted ${want}`);
  const deal = F.dealRounds(cats, F.makeRng(7), 'pro');
  const r0 = deal[0];
  const right = F.resolveRound(r0, r0.higher, 2);
  const wrong = F.resolveRound(r0, r0.higher === 'a' ? 'b' : 'a', 2);
  const late = F.resolveRound(r0, null, F.SHOT_CLOCK);
  if (!right.youCorrect || right.you !== 180) fail(`a right pick at 2s paid ${right.you}`);
  if (wrong.youCorrect || wrong.you !== 0) fail('a wrong pick paid');
  if (late.youCorrect || late.you !== 0 || late.pick !== null) fail('a late pick paid');
  if ((right.rivalPick === r0.higher) !== r0.rival.correct) fail('the rival pick does not match the dealt answer');
  if (right.rivalSeconds !== r0.rival.seconds) fail('the reveal would show the wrong rival time');
  /* two people on one phone: the dealt rival is ignored, both clocks are real */
  const other = r0.higher === 'a' ? 'b' : 'a';
  const v1 = F.resolveVersus(r0, r0.higher, 1.5, r0.higher, 3);
  const v2 = F.resolveVersus(r0, r0.higher, 1.5, null, F.SHOT_CLOCK);
  const v3 = F.resolveVersus(r0, null, F.SHOT_CLOCK, other, 2);
  if (v1.you !== 180 || v1.rival !== 170 || !v1.youCorrect || !v1.rivalCorrect) fail(`two right picks paid ${v1.you} and ${v1.rival}`);
  if (v2.rival !== 0 || v2.rivalPick !== null || v2.rivalSeconds !== F.SHOT_CLOCK) fail('a late second chair was paid');
  if (v3.you !== 0 || v3.rival !== 0 || v3.rivalCorrect) fail('a late first chair and a wrong second chair paid something');
  if (F.outcome(F.totals([v1, v2, v3])) !== 'win') fail('the two player totals do not add up');
  const t = F.totals([right, wrong, late]);
  if (t.you !== 180 || t.youRounds + t.rivalRounds > 3) fail('totals do not add up');
  /* sudden death: tied after ten means one more, up to MAX_EXTRA, never before ten */
  const tied = Array.from({ length: F.ROUNDS }, () => ({ you: 100, rival: 100, youCorrect: true, rivalCorrect: true, pick: 'a', rivalPick: 'a', secondsUsed: 1 }));
  if (F.needsExtra(tied.slice(0, 9), 9)) fail('sudden death offered before ten rounds');
  if (!F.needsExtra(tied, F.ROUNDS)) fail('a tie after ten did not offer sudden death');
  if (F.needsExtra(tied, F.ROUNDS + 1)) fail('sudden death offered while a dealt round is unplayed');
  const maxed = tied.concat(Array.from({ length: F.MAX_EXTRA }, () => tied[0]));
  if (F.needsExtra(maxed, maxed.length)) fail('sudden death never ends');
  const settled = tied.concat([{ ...tied[0], you: 150 }]);
  if (F.needsExtra(settled, settled.length)) fail('sudden death continued after a lead');
  console.log(`   ${cases.length} point cases, right, wrong and late picks, two player picks, totals, sudden death`);
}

console.log('6) the save');
{
  for (const raw of [null, '', '{', '[]', '{"played":"x","daily":{"date":"nope"}}', '{"byRival":{"pro":{"played":-4}}}']) {
    const s = F.loadSave(raw);
    if (s.played !== 0 || s.daily !== null || s.byRival.pro.played !== 0) fail(`a bad save ${JSON.stringify(raw)} did not load fresh`);
  }
  let s = F.newSave();
  s = F.recordMatch(s, { you: 1200, rival: 900, youRounds: 6, rivalRounds: 3 }, 'rookie', '2026-08-25');
  s = F.recordMatch(s, { you: 800, rival: 1100, youRounds: 3, rivalRounds: 6 }, 'legend', null);
  s = F.recordMatch(s, { you: 1000, rival: 1000, youRounds: 5, rivalRounds: 5 }, 'pro', null);
  const back = F.loadSave(F.serialize(s));
  if (JSON.stringify(back) !== JSON.stringify(s)) fail('a real save did not round trip');
  if (s.played !== 3 || s.won !== 1 || s.lost !== 1 || s.drawn !== 1 || s.best !== 1200) fail(`the record reads ${JSON.stringify(s)}`);
  if (s.streak !== 0 || s.bestStreak !== 1) fail('the streak did not reset on a loss');
  if (!s.daily || s.daily.date !== '2026-08-25' || s.daily.outcome !== 'win') fail('the daily was not booked');
  if (s.byRival.rookie.won !== 1 || s.byRival.legend.played !== 1) fail('the per rival record is wrong');
  const line = F.shareText({ you: 1200, rival: 900, youRounds: 6, rivalRounds: 3 }, 'pro', '2026-08-25');
  if (!/beat The Pro 1200 to 900/.test(line) || !/douknowball\.com\/face-off/.test(line)) fail(`share line reads ${line}`);
  console.log('   six bad saves load fresh, a real one round trips, three matches book correctly');
}

console.log('');
if (failures > 0) { console.error(`simFaceOff: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simFaceOff: green. The deck deals fair, the daily is shared, the rivals climb, and the record holds.');
