/**
 * Round 80 harness: the phone (GTA/BitLife life layer) + karma.
 * Asserts what tsc can't:
 *  - the text pool is clean: unique ids, 2-3 choices, karma bounded, and NOT
 *    ONE em dash anywhere in any player-facing string (house rule)
 *  - pickPhoneTexts respects phase, age windows, used ids and count
 *  - initCareer seeds one youth-eligible text and neutral karma
 *  - full careers with random replying keep karma in 0-100, the inbox capped,
 *    money finite, and answered threads render a reply
 *  - exact effect application incl. clamping, idempotent answers
 *  - karma drifts toward 50 each season with coupling at the extremes
 *  - pre-R80 saves (no phone fields) advance cleanly and start receiving texts
 * Run: node scripts/simPhone.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/phoneSimEntry.mjs';
const BUNDLE = '/tmp/phoneSim.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
const eras = await import('${ROOT}/src/lib/careerEras.ts');
export { engine, eras };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { engine, eras } = await import(BUNDLE);
const { initCareer, advanceYouthYear, advanceProSeason, answerPhoneText, karmaOf, unreadPhoneCount, FALLBACK_CLUBS } = engine;
const { PHONE_POOL, pickPhoneTexts, karmaTier } = eras;

let failures = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const EM = /[–—]/; // en dash + em dash, both banned

/* ---------- 1. Pool lint ---------- */
console.log(`1) Pool lint (${PHONE_POOL.length} texts)`);
{
  const ids = new Set();
  for (const t of PHONE_POOL) {
    if (ids.has(t.id)) fail(`duplicate id ${t.id}`);
    ids.add(t.id);
    if (!t.from || !t.text || !t.emoji) fail(`${t.id}: missing from/text/emoji`);
    if (t.choices.length < 2 || t.choices.length > 3) fail(`${t.id}: ${t.choices.length} choices`);
    if (!['youth', 'pro', 'any'].includes(t.phase)) fail(`${t.id}: bad phase ${t.phase}`);
    const strings = [t.from, t.text, ...t.choices.flatMap(c => [c.label, c.reply])];
    for (const str of strings) if (EM.test(str)) fail(`${t.id}: EM/EN DASH in "${str.slice(0, 40)}"`);
    for (const c of t.choices) {
      if (Math.abs(c.karma) > 12) fail(`${t.id}: karma ${c.karma} out of bounds`);
      if (!c.label) fail(`${t.id}: choice missing label`);
      if (c.cash !== undefined && Math.abs(c.cash) > 3) fail(`${t.id}: cash ${c.cash} too big`);
    }
    if (t.text.length > 220) fail(`${t.id}: text too long (${t.text.length})`);
  }
  const youthOk = PHONE_POOL.filter(t => (t.phase === 'youth' || t.phase === 'any') && (t.minAge === undefined || t.minAge <= 16));
  if (youthOk.length < 4) fail(`only ${youthOk.length} texts available to a 16 year old`);
  for (const k of [10, 30, 50, 70, 90]) {
    const kt = karmaTier(k);
    if (!kt.label || EM.test(kt.label)) fail(`karmaTier(${k}) bad label`);
  }
}

/* ---------- 2. pickPhoneTexts filters ---------- */
console.log('2) pickPhoneTexts filters');
{
  for (let i = 0; i < 200; i++) {
    const age = 16 + Math.floor(Math.random() * 15);
    const phase = Math.random() < 0.3 ? 'youth' : 'pro';
    const used = PHONE_POOL.slice(0, Math.floor(Math.random() * 10)).map(t => t.id);
    const got = pickPhoneTexts(age, phase, used, 2);
    const seen = new Set();
    for (const t of got) {
      if (seen.has(t.id)) fail('duplicate in one pick');
      seen.add(t.id);
      if (used.includes(t.id)) fail(`${t.id}: picked despite used`);
      if (t.phase !== 'any' && t.phase !== phase) fail(`${t.id}: wrong phase for ${phase}`);
      if (t.minAge !== undefined && age < t.minAge) fail(`${t.id}: under minAge`);
      if (t.maxAge !== undefined && age > t.maxAge) fail(`${t.id}: over maxAge`);
    }
    if (got.length > 2) fail('count not honored');
  }
}

/* ---------- 3. Creation seed ---------- */
console.log('3) initCareer seeds the phone');
{
  const c = initCareer('Phone', 'Spain', 'ST', 'modern', flat(55), 55, 2020, FALLBACK_CLUBS, null, 80);
  if (karmaOf(c) !== 50) fail(`karma starts at ${karmaOf(c)}, want 50`);
  if (!c.phoneInbox || c.phoneInbox.length !== 1) fail(`seed inbox length ${c.phoneInbox?.length}`);
  else {
    const def = PHONE_POOL.find(t => t.id === c.phoneInbox[0].defId);
    if (!def) fail('seed text not from the pool');
    else {
      if (def.phase === 'pro') fail('seeded a pro-only text at 16');
      if (def.minAge !== undefined && def.minAge > 16) fail('seeded an age-locked text at 16');
      if (!c.phoneUsedIds?.includes(def.id)) fail('seed id not marked used');
    }
    if (unreadPhoneCount(c) !== 1) fail('unread count wrong at creation');
  }
}

/* ---------- 4. Careers with random replying ---------- */
console.log('4) 25 careers, replying at random every season');
{
  let crashed = 0, answeredTotal = 0;
  for (let i = 0; i < 25; i++) {
    try {
      let c = initCareer(`P${i}`, 'England', 'CM', 'modern', flat(54), 54, 2020, FALLBACK_CLUBS, null, 78 + (i % 10));
      let guard = 0;
      while (!c.retired && guard < 34) {
        guard++;
        for (const m of (c.phoneInbox ?? []).filter(m => m.answered === undefined)) {
          const idx = Math.floor(Math.random() * m.choices.length);
          const before = c;
          c = answerPhoneText(c, m.id, idx);
          if (c === before) fail(`${m.id}: valid answer was a no-op`);
          answeredTotal++;
          const am = c.phoneInbox.find(x => x.id === m.id);
          if (!am || am.answered !== idx) fail(`${m.id}: answer not recorded`);
          if (!am.choices[am.answered]) fail(`${m.id}: answered index has no choice`);
          // answering again must be a no-op
          if (answerPhoneText(c, m.id, 0) !== c) fail(`${m.id}: re-answer was not a no-op`);
        }
        const k = karmaOf(c);
        if (k < 0 || k > 100) fail(`karma ${k} out of range`);
        if ((c.phoneInbox ?? []).length > 18) fail(`inbox grew to ${c.phoneInbox.length}`);
        if (!Number.isFinite(c.netWorth)) fail('netWorth went non-finite');
        if (c.morale < 0 || c.morale > 100 || c.popularity < 0 || c.popularity > 100) fail('morale/popularity out of clamp');
        c = c.phase === 'youth' ? advanceYouthYear(c, FALLBACK_CLUBS) : advanceProSeason(c, FALLBACK_CLUBS);
        if (c.transferSituation) c = { ...c, transferSituation: null };
      }
    } catch (e) {
      crashed++;
      if (crashed === 1) console.error('   first crash: ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n') : e));
    }
  }
  console.log(`   ${answeredTotal} texts answered across 25 careers, crashes=${crashed}`);
  if (crashed > 0) fail(`${crashed} careers crashed`);
  if (answeredTotal < 100) fail(`only ${answeredTotal} texts ever arrived, delivery too dry`);
}

/* ---------- 5. Exact effects + clamps ---------- */
console.log('5) Exact effect application');
{
  let c = initCareer('FX', 'Spain', 'ST', 'modern', flat(60), 60, 2020, FALLBACK_CLUBS, null, 85);
  const def = PHONE_POOL.find(t => t.id === 'hometown_pitch');
  c = { ...c, karma: 95, popularity: 98, netWorth: 10, events: [], phoneInbox: [{ id: 'hometown_pitch-2024', defId: 'hometown_pitch', from: def.from, emoji: def.emoji, text: def.text, year: 2024, choices: def.choices }] };
  const after = answerPhoneText(c, 'hometown_pitch-2024', 0); // +12 karma, +5 pop, -1.2 cash
  if (after.karma !== 100) fail(`karma clamp: ${after.karma}, want 100`);
  if (after.popularity !== 100) fail(`popularity clamp: ${after.popularity}, want 100`);
  if (Math.abs(after.netWorth - 8.8) > 1e-9) fail(`cash: ${after.netWorth}, want 8.8`);
  if (!after.events.some(e => e.startsWith('📱'))) fail('no phone event line');
  if (answerPhoneText(after, 'nope-2024', 0) !== after) fail('bad id not a no-op');
}

/* ---------- 6. Karma drift ---------- */
console.log('6) Season drift toward 50 with coupling');
{
  let hi = initCareer('Hi', 'Spain', 'CM', 'modern', flat(55), 55, 2020, FALLBACK_CLUBS, null, 80);
  hi = { ...hi, karma: 90, morale: 50, popularity: 50 };
  const hiAfter = advanceYouthYear(hi, FALLBACK_CLUBS);
  if (hiAfter.karma !== 88) fail(`high karma drifted to ${hiAfter.karma}, want 88`);
  if (hiAfter.popularity < 52) fail('high karma should lift popularity');
  let lo = initCareer('Lo', 'Spain', 'CM', 'modern', flat(55), 55, 2020, FALLBACK_CLUBS, null, 80);
  lo = { ...lo, karma: 10, morale: 50, popularity: 50 };
  const loAfter = advanceYouthYear(lo, FALLBACK_CLUBS);
  if (loAfter.karma !== 12) fail(`low karma drifted to ${loAfter.karma}, want 12`);
  if (loAfter.popularity > 48) fail('low karma should drag popularity');
}

/* ---------- 7. Pre-R80 saves ---------- */
console.log('7) Old saves without phone fields');
{
  let c = initCareer('Old', 'England', 'ST', 'modern', flat(56), 56, 2020, FALLBACK_CLUBS, null, 80);
  delete c.karma; delete c.phoneInbox; delete c.phoneUsedIds;
  let guard = 0;
  while (!c.retired && guard < 8) {
    guard++;
    c = c.phase === 'youth' ? advanceYouthYear(c, FALLBACK_CLUBS) : advanceProSeason(c, FALLBACK_CLUBS);
    if (c.transferSituation) c = { ...c, transferSituation: null };
  }
  if (karmaOf(c) < 40 || karmaOf(c) > 60) fail(`old save karma ${karmaOf(c)} should hover near neutral`);
  if (!c.phoneInbox || c.phoneInbox.length === 0) fail('old save never received texts');
}

console.log(failures === 0 ? '\nALL PHONE CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
