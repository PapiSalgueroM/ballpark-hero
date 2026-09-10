/**
 * Round 521 harness: the inbox, lifted from Soccer Career into
 * src/lib/careerInbox.ts and bound to the NFL career in
 * src/lib/nflCareerInbox.ts.
 *
 * His 2026-08-28 backlog row "Bring the Soccer Career depth to the NFL
 * career, then the other US careers" still marked two things open: an
 * inbox, and interactive rivalry events (that one is
 * scripts/simCareerRivalryEvents.mjs). This file is the inbox half.
 *
 * SECTIONS
 *
 *   1. Source. careerInbox.ts is imported by soccerCareerEngine.ts and by
 *      nflCareerInbox.ts, and the rule fingerprints (the mood drift, the
 *      drop-oldest-answered cap, the want-per-season formula) live only in
 *      careerInbox.ts, comments stripped first.
 *   2. Soccer unchanged. A hand written golden reimplementation of the
 *      exact pre-Round-521 receivePhoneTexts and answerLegacyText bodies,
 *      run against the real careerInbox.ts functions bound through
 *      SOCCER_INBOX, across many seeded scenarios (varied karma, age,
 *      phase, and inbox states) and under the SAME real message picker
 *      (careerEras.ts's PHONE_POOL). Same state and seed in, same messages
 *      and same meter moves out, to the field.
 *   3. Soccer end to end. A real career driven through initCareer,
 *      advanceYouthYear and advanceProSeason for many seasons, proving the
 *      cap, the dedupe and the Round 130 thread mirroring (which stayed
 *      OUTSIDE the lift on purpose) are all still wired.
 *   4. The NFL binding fires. Many simulated NFL careers, proving inbox
 *      messages genuinely arrive, are not always empty, never exceed the
 *      cap, and answering one works; plus a structural check that no
 *      message is ever signed by anything that reads as a real person's
 *      name rather than a role.
 *   5. Negative controls, INBOX_CONTROL=...
 *
 * NEGATIVE CONTROLS, INBOX_CONTROL=...
 *
 *   deaf     careerInbox.ts's receiveInboxTexts is patched to pick from an
 *            empty pool instead of the descriptor's own, which is exactly
 *            "the descriptor injection stripped": both soccer and the NFL
 *            must then deliver nothing, ever, which section 3 and 4 must
 *            report as a failure.
 *   nocap    the drop-oldest-answered trim is patched to a no-op. A soccer
 *            career played long enough must then carry more than six
 *            messages on the save, which section 3 must catch.
 *
 *   Each control asserts the text it rewrites is present first, so a
 *   control that rewrites a string the file does not contain cannot pass
 *   silently for the wrong reason.
 *
 * Run: node scripts/simCareerInbox.mjs
 */
import { build } from 'esbuild';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.INBOX_CONTROL || '';
const CONTROLS = ['deaf', 'nocap'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`INBOX_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const norm = s => s.split('\r\n').join('\n');
const readSrc = rel => norm(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'careerinbox-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });

const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const REAL_RANDOM = Math.random;

/* ─── controls that patch careerInbox.ts ─────────────────────────────────── */

const INBOX_SRC = 'src/lib/careerInbox.ts';
const PICK_CALL = 'for (const def of pickInboxTexts(sport.pool, age, phase, used, want, rng)) {';
const DEAF_CALL = 'for (const def of pickInboxTexts([], age, phase, used, want, rng)) {';
const CAP_LOOP = 'while (inbox.length > sport.maxInbox) {';
const NOCAP_LOOP = 'while (false && inbox.length > sport.maxInbox) {';

let redirectPath = null;
function patchedCopy(rel, from, to, label) {
  const raw = readSrc(rel);
  if (!raw.includes(from)) {
    console.error(`control ${label}: ${rel} does not contain ${JSON.stringify(from)}, so this control would prove nothing`);
    process.exit(1);
  }
  const out = path.join(tmpDir, path.basename(rel));
  fs.writeFileSync(out, raw.replace(from, to));
  return out;
}
if (CONTROL === 'deaf') redirectPath = patchedCopy(INBOX_SRC, PICK_CALL, DEAF_CALL, 'deaf');
if (CONTROL === 'nocap') redirectPath = patchedCopy(INBOX_SRC, CAP_LOOP, NOCAP_LOOP, 'nocap');
if (CONTROL) console.log(`   NEGATIVE CONTROL ON: ${CONTROL}`);

const redirectPlugin = {
  name: 'inbox-control',
  setup(b) {
    b.onResolve({ filter: /careerInbox(\.ts)?$/ }, () => (redirectPath ? { path: redirectPath } : undefined));
  },
};

/* ─── bundle the real engines ─────────────────────────────────────────────── */

const R = ROOT.replaceAll('\\', '/');
const ENTRY = path.join(tmpDir, 'inboxEntry.mjs');
const BUNDLE = path.join(tmpDir, 'inbox.bundle.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const soccer = await import('${R}/src/lib/soccerCareerEngine.ts');
export const eras = await import('${R}/src/lib/careerEras.ts');
export const inboxMod = await import('${R}/src/lib/careerInbox.ts');
export const nfl = await import('${R}/src/lib/nflMyCareer.ts');
export const nflInbox = await import('${R}/src/lib/nflCareerInbox.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  plugins: [redirectPlugin], absWorkingDir: ROOT,
});
const B = await import(pathToFileURL(BUNDLE).href);
const { soccer, eras, inboxMod, nfl, nflInbox } = B;

/* ═══════════════════════════════════════════════════════════════════════════
   1. Source: one module, imported by both careers, copied by neither
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('1) Source: careerInbox.ts is the only home for the rule');

function stripComments(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}
const code = new Map();
for (const p of walk(path.join(ROOT, 'src'))) {
  const rel = path.relative(ROOT, p).split(path.sep).join('/');
  code.set(rel, stripComments(norm(fs.readFileSync(p, 'utf8'))));
}
const RULES = [
  { home: 'src/lib/careerInbox.ts', what: 'the mood drift', re: /mood > 50 \? mood - 2/ },
  { home: 'src/lib/careerInbox.ts', what: 'the drop-oldest-answered cap', re: /findIndex\(m => m\.answered !== undefined\)/ },
  { home: 'src/lib/careerInbox.ts', what: 'the want-per-season formula', re: /sport\.wantPerSeason - unanswered/ },
  { home: 'src/lib/careerInbox.ts', what: 'the answer flow', re: /export function answerInboxMessage\b/ },
];
for (const rule of RULES) {
  if (!rule.re.test(code.get(rule.home) ?? '')) fail(`${rule.what} is not in ${rule.home}, so the fingerprint is stale and this check proves nothing`);
  for (const [rel, text] of code) {
    if (rel === rule.home) continue;
    if (rule.re.test(text)) fail(`${rel} carries a private copy of ${rule.what} (${rule.re})`);
  }
}
const IMPORTS = [
  { rel: 'src/lib/soccerCareerEngine.ts', re: /from\s+["']\.\/careerInbox["']/, what: 'the soccer engine binds careerInbox' },
  { rel: 'src/lib/nflCareerInbox.ts', re: /from\s+["']\.\/careerInbox["']/, what: 'the NFL binding binds careerInbox' },
  { rel: 'src/lib/nflMyCareer.ts', re: /from\s+["']\.\/nflCareerInbox["']/, what: 'the NFL engine runs the inbox tick' },
  { rel: 'src/components/nfl-my-career/NflMyCareerBoard.tsx', re: /from\s+["']@\/lib\/nflCareerInbox["']/, what: 'the NFL board opens the inbox' },
];
for (const imp of IMPORTS) {
  if (!imp.re.test(code.get(imp.rel) ?? '')) fail(`${imp.what}: no import found in ${imp.rel}`);
}
console.log(`   ${RULES.length} rule fingerprints checked, ${IMPORTS.length} bindings confirmed`);

/* ═══════════════════════════════════════════════════════════════════════════
   2. Soccer unchanged: golden reimplementation vs the real lifted functions
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('2) Soccer unchanged: same state and seed in, same messages and meter moves out');

/** The exact pre-Round-521 receivePhoneTexts body, minus the Round 130
 *  thread mirror and phoneSeasonTick tail, which stayed outside the lift on
 *  purpose and are proven separately in section 3. Runs on the SAME real
 *  PHONE_POOL picker (careerEras.ts's pickPhoneTexts, untouched by this
 *  round) so a divergence in the new pickInboxTexts algorithm would show up
 *  here rather than being hidden by two copies of the same code. */
function goldenReceive(s, phase) {
  const karma = s.karma ?? 50;
  const k = karma > 50 ? karma - 2 : karma < 50 ? Math.min(50, karma + 2) : karma;
  if (k >= 70) { s.popularity = clamp(s.popularity + 2, 0, 100); s.morale = clamp(s.morale + 2, 0, 100); }
  else if (k <= 30) { s.popularity = clamp(s.popularity - 2, 0, 100); s.morale = clamp(s.morale - 1, 0, 100); }
  s.karma = k;
  const inbox = [...(s.phoneInbox ?? [])];
  const used = [...(s.phoneUsedIds ?? [])];
  const unanswered = inbox.filter(m => m.answered === undefined).length;
  const want = Math.max(0, 2 - unanswered);
  const year = s.seasons[s.seasons.length - 1]?.year ?? 2020;
  for (const def of eras.pickPhoneTexts(s.age, phase, used, want)) {
    inbox.push({ id: `${def.id}-${year}`, defId: def.id, from: def.from, emoji: def.emoji, text: def.text, year, choices: def.choices });
    used.push(def.id);
  }
  while (inbox.length > 6) {
    const idx = inbox.findIndex(m => m.answered !== undefined);
    if (idx === -1) break;
    inbox.splice(idx, 1);
  }
  s.phoneInbox = inbox;
  s.phoneUsedIds = used;
}

/** The exact pre-Round-521 answerLegacyText body. Returns the event line or
 *  null, same as the real answerInboxMessage. */
function goldenAnswer(s, msgId, choiceIdx) {
  const inbox = [...(s.phoneInbox ?? [])];
  const i = inbox.findIndex(m => m.id === msgId);
  if (i === -1) return null;
  const msg = inbox[i];
  if (msg.answered !== undefined) return null;
  const choice = msg.choices[choiceIdx];
  if (!choice) return null;
  inbox[i] = { ...msg, answered: choiceIdx };
  s.phoneInbox = inbox;
  s.karma = clamp((s.karma ?? 50) + choice.karma, 0, 100);
  if (choice.morale) s.morale = clamp(s.morale + choice.morale, 0, 100);
  if (choice.popularity) s.popularity = clamp(s.popularity + choice.popularity, 0, 100);
  if (choice.cash) s.netWorth = Math.round((s.netWorth + choice.cash) * 100) / 100;
  const swing = choice.karma >= 5 ? ' Karma up.' : choice.karma <= -5 ? ' Karma down.' : '';
  return `📱 Replied to ${msg.from}: ${choice.label}.${swing}`;
}

function freshFixture(seed, overrides) {
  const rng = mulberry32(seed);
  return {
    age: 16 + Math.floor(rng() * 22),
    karma: Math.floor(rng() * 101),
    popularity: Math.floor(rng() * 101),
    morale: Math.floor(rng() * 101),
    netWorth: Math.round(rng() * 40 * 10) / 10,
    seasons: [{ year: 2018 + Math.floor(rng() * 10) }],
    phoneInbox: [],
    phoneUsedIds: [],
    ...overrides,
  };
}

let scenarios = 0;
let mismatches = 0;
for (let seed = 1; seed <= 300; seed += 1) {
  const phase = seed % 5 === 0 ? 'youth' : 'pro';
  const base = freshFixture(seed);
  const golden = JSON.parse(JSON.stringify(base));
  const real = JSON.parse(JSON.stringify(base));

  /* A handful of seasons each, so the cap and the dedupe both get exercised
     rather than only the empty-inbox first call. */
  for (let season = 0; season < 4; season += 1) {
    Math.random = mulberry32(seed * 104729 + season);
    goldenReceive(golden, phase);
    Math.random = mulberry32(seed * 104729 + season);
    inboxMod.receiveInboxTexts(real, phase, soccer.SOCCER_INBOX);
    Math.random = REAL_RANDOM;
    /* Answer whatever is unanswered, alternating choice 0 and 1, so the next
       season's want-per-season math is exercised on both sides too. */
    for (const m of [...golden.phoneInbox]) {
      if (m.answered !== undefined) continue;
      const idx = season % Math.max(1, m.choices.length);
      goldenAnswer(golden, m.id, idx);
      inboxMod.answerInboxMessage(real, m.id, idx, soccer.SOCCER_INBOX);
    }
    scenarios += 1;
    const same = JSON.stringify(golden) === JSON.stringify(real);
    if (!same) {
      mismatches += 1;
      if (mismatches <= 3) {
        fail(`seed ${seed} season ${season}: golden and real diverge\n     golden: ${JSON.stringify(golden)}\n     real:   ${JSON.stringify(real)}`);
      }
    }
  }
}
console.log(`   ${scenarios} seeded season-scenarios compared field for field, ${mismatches} diverged`);
if (mismatches > 0 && mismatches > 3) fail(`${mismatches - 3} more scenarios diverged, not printed`);
if (scenarios < 1000) fail(`only ${scenarios} scenarios run, not enough to trust this section`);

/* ═══════════════════════════════════════════════════════════════════════════
   3. Soccer end to end: the real game loop, several full careers
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('3) Soccer end to end: a real career, the cap, the dedupe, the thread mirror');
{
  const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
  let careersRun = 0, capViolations = 0, dupeViolations = 0, everMirrored = 0;
  for (let seed = 1; seed <= 12; seed += 1) {
    Math.random = mulberry32(seed * 7 + 1);
    let c = soccer.initCareer(`Inbox ${seed}`, 'England', 'CM', 'modern', flat(58), 60 + (seed % 12), 2018, soccer.FALLBACK_CLUBS, null, 78);
    Math.random = REAL_RANDOM;
    let guard = 0;
    let sawLegacyThread = (c.phone?.threads ?? []).some(t => t.pending?.kind === 'legacy');
    while (!c.retired && guard < 20) {
      guard += 1;
      Math.random = mulberry32(seed * 9973 + guard);
      c = c.phase === 'youth' ? soccer.advanceYouthYear(c, soccer.FALLBACK_CLUBS) : soccer.advanceProSeason(c, soccer.FALLBACK_CLUBS);
      Math.random = REAL_RANDOM;
      /* Answer everything waiting, every other year, so the want-per-season
         gate keeps letting new texts in across a full career the way an
         actual player would, rather than filling up to two unanswered and
         going silent for good. Without this the cap is never really tested:
         nothing ever frees a slot. */
      if (guard % 2 === 0) {
        for (const m of [...(c.phoneInbox ?? [])]) {
          if (m.answered === undefined) c = soccer.answerPhoneText(c, m.id, 0);
        }
      }
      const inbox = c.phoneInbox ?? [];
      if (inbox.length > 6) { capViolations += 1; fail(`seed ${seed} year ${guard}: phoneInbox holds ${inbox.length} messages, over the cap of 6`); }
      const usedIds = c.phoneUsedIds ?? [];
      if (new Set(usedIds).size !== usedIds.length) { dupeViolations += 1; fail(`seed ${seed} year ${guard}: phoneUsedIds repeats an id`); }
      const ids = inbox.map(m => m.id);
      if (new Set(ids).size !== ids.length) { dupeViolations += 1; fail(`seed ${seed} year ${guard}: phoneInbox holds two messages with the same id`); }
      /* The Round 130 mirror specifically: a thread whose pending slot is
         kind "legacy" only exists because mirrorLegacyMessage put it there.
         Round 130's own contacts create threads too, so counting threads in
         general would stay green even if the mirror call were deleted; this
         has to catch the legacy marker the moment it appears, because an
         answered legacy thread can move its pending on to something else by
         the time the career ends. */
      if ((c.phone?.threads ?? []).some(t => t.pending?.kind === 'legacy')) sawLegacyThread = true;
    }
    careersRun += 1;
    if (sawLegacyThread) everMirrored += 1;
  }
  console.log(`   ${careersRun} careers played to a guard limit or retirement, ${capViolations} cap violations, ${dupeViolations} duplicate ids, ${everMirrored} showed the Round 130 mirror still firing`);
  if (careersRun < 12) fail('fewer careers completed than the loop should have run');
  if (everMirrored === 0) fail('not one career showed the Round 130 thread mirror firing, so mirrorLegacyMessage may have stopped being called');
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. The NFL binding fires
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('4) The NFL binding: messages actually arrive, are not always empty, and answering works');
{
  const positions = Object.keys(nfl.ARCHETYPES);
  let careersRun = 0, everNonEmpty = 0, capViolations = 0, answeredOk = 0, refusedOk = 0, totalDelivered = 0;
  const allSeenText = [];
  for (let seed = 1; seed <= 30; seed += 1) {
    const rng = mulberry32(seed * 131 + 17);
    const pos = positions[seed % positions.length];
    const arch = nfl.ARCHETYPES[pos][seed % nfl.ARCHETYPES[pos].length];
    let c = nfl.startCareer(`Inbox NFL ${seed}`, pos, arch, rng, null);
    for (let year = 0; year < 8 && !c.retired; year += 1) {
      const tq = nfl.rollTeamQuality(year === 0 ? null : 78, rng);
      nfl.simSeason(c, tq, rng);
      nfl.progress(c, rng);
      if (nfl.shouldRetire(c)) c.retired = true;
      const inbox = c.phoneInbox ?? [];
      if (inbox.length > 6) { capViolations += 1; fail(`seed ${seed} year ${year}: NFL phoneInbox holds ${inbox.length} messages, over the cap of 6`); }
      for (const m of inbox) { allSeenText.push(m.from); allSeenText.push(m.text); for (const ch of m.choices) { allSeenText.push(ch.label); allSeenText.push(ch.reply); } }
      /* receiveInboxTexts throttles want to max(0, wantPerSeason -
         unanswered) (careerInbox.ts:178), so a career that never answers
         anything fills up in the first season or two and then goes silent
         for the rest, which would make ANY delivery-rate measurement read
         as broken even on healthy code. An attentive player checks their
         phone: catch up on everything but the newest text each season (the
         same shape the real UI's inbox panel invites), so the measured
         rate below reflects steady play, and a message is always left
         pending for the answer/refuse checks after this loop. */
      const pending = (c.phoneInbox ?? []).filter(m => m.answered === undefined);
      for (let i = 0; i < pending.length - 1; i += 1) nflInbox.answerNflInboxMessage(c, pending[i].id, 0);
    }
    careersRun += 1;
    if ((c.phoneInbox ?? []).length > 0 || (c.phoneUsedIds ?? []).length > 0) everNonEmpty += 1;
    totalDelivered += (c.phoneUsedIds ?? []).length;
    /* Answer the one left pending, refuse a bad id. */
    const first = (c.phoneInbox ?? []).find(m => m.answered === undefined);
    if (first) {
      const line = nflInbox.answerNflInboxMessage(c, first.id, 0);
      if (line) answeredOk += 1;
      const again = nflInbox.answerNflInboxMessage(c, first.id, 0);
      if (again === null) refusedOk += 1; else fail(`seed ${seed}: answering the same message twice was accepted a second time`);
    }
    const bogus = nflInbox.answerNflInboxMessage(c, 'not-a-real-id', 0);
    if (bogus !== null) fail(`seed ${seed}: answering a message id that does not exist was accepted`);
  }
  /* everNonEmpty ("did a career ever show one message across 8 years") is a
     weak signal on its own: sport.wantPerSeason halved would still leave
     most careers showing a message eventually. The strong signal is the
     DELIVERY RATE: nflCareerInbox.ts sets wantPerSeason = 2, so
     phoneUsedIds.length (every distinct message ever delivered, tracked
     even after the 6-message inbox cap drops the oldest answered one) over
     8 seasons should sit well above one a season if the binding is
     healthy. Measured here rather than assumed. */
  const seasonsRun = careersRun * 8;
  const deliveryRate = totalDelivered / seasonsRun;
  console.log(`   ${careersRun} NFL careers, ${everNonEmpty} delivered at least one message, ${totalDelivered} messages total over ${seasonsRun} career-seasons (rate ${deliveryRate.toFixed(3)} against a wantPerSeason of 2), ${capViolations} cap violations, ${answeredOk} answers accepted, ${refusedOk} double answers correctly refused`);
  if (careersRun < 30) fail('fewer NFL careers completed than the loop should have run');
  if (everNonEmpty < careersRun * 0.8) fail(`only ${everNonEmpty} of ${careersRun} NFL careers ever showed a message, the binding may not actually be firing`);
  /* Measured over this exact run, the rate sits close to 1 (a message
     roughly every season). A floor of 0.5 sits well under every measured
     run and would still catch wantPerSeason being cut in half or the
     eligible pool silently emptying out for a chunk of a career. */
  if (deliveryRate < 0.5) fail(`the message delivery rate is ${deliveryRate.toFixed(3)} per career-season against a wantPerSeason of 2, well under what a healthy binding should show`);
  if (answeredOk === 0) fail('not one NFL inbox answer was accepted across 30 careers');

  /* 4b. Nobody signs a text with a real player's name, and the shape of
     every "from" is a role, never a generated "First Last" name. */
  const dataFiles = [];
  (function scan(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) scan(p);
      else if (/\.tsx?$/.test(e.name)) dataFiles.push(p);
    }
  })(path.join(ROOT, 'src/data'));
  const real = new Set();
  for (const f of dataFiles) {
    const t = fs.readFileSync(f, 'utf8');
    for (const m of t.matchAll(/\b(?:name|n|player|playerName):\s*'([A-Z][^']{2,40})'/g)) real.add(m[1]);
    for (const m of t.matchAll(/\b(?:name|n|player|playerName):\s*"([A-Z][^"]{2,40})"/g)) real.add(m[1]);
  }
  const froms = new Set();
  for (const t of allSeenText) if (typeof t === 'string') froms.add(t);
  let matchesReal = 0;
  for (const from of froms) {
    if (real.has(from)) { matchesReal += 1; fail(`text harvested from the NFL inbox equals a real player's name: "${from}"`); }
  }
  /* Every "from" in the bank is a role, never a generated "First Last" name:
     at most the first word is capitalized ("Mom", "High school coach"), the
     one shape a real or invented person's full name would never take. */
  const NAME_SHAPE = /^[A-Z][a-z]+\s[A-Z][a-z]+/;
  const froms2 = new Set(nflInbox.NFL_INBOX.pool.map(d => d.from));
  let shapedLikeAName = 0;
  for (const from of froms2) {
    if (NAME_SHAPE.test(from)) { shapedLikeAName += 1; fail(`inbox sender "${from}" reads as a First Last name rather than a role`); }
  }
  console.log(`   ${real.size} real names harvested from src/data, ${matchesReal} collisions in harvested inbox text, ${froms2.size} distinct senders in the bank, ${shapedLikeAName} shaped like a person's name`);
  if (real.size < 3000) fail(`only ${real.size} real names harvested, this check is not checking much`);
}

console.log('');
if (failures > 0) {
  console.error(`simCareerInbox: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simCareerInbox: green. Soccer is unchanged, and the NFL inbox fires.');
