/**
 * Round 130 harness: the phone is a conversation now, not a vending machine.
 *
 * Round 80 shipped a phone where a text arrived, you picked one of two or
 * three replies, and that was the end of that person forever. The owner's
 * note: "For messages u get sent u should be able to continue the convo. Not
 * simply reply and then they don't respond back ever again. Also we should
 * have contacts. Also if we don't reply that year then they'll respond
 * negatively like wow I see how it is. And like u should receive something for
 * messaging or whatever."
 *
 * scripts/simPhone.mjs still guards the Round 80 layer (the pool, the karma
 * effects, the drift). This one measures the things that round could not:
 *
 *  1. the catalog is clean and big: unique ids, every beat has presets, every
 *     contact is reachable, no em dash or en dash anywhere in copy a player
 *     reads, no other company's product name in any of it
 *  2. a thread genuinely CONTINUES: reply and they answer, and the answer is
 *     the one attached to the preset you picked, more than once, across
 *     hundreds of careers
 *  3. contacts work in the other direction: you can open a conversation with
 *     somebody who has not texted you, and it behaves like any other thread
 *  4. ignoring somebody measurably cools them AND the copy changes, in three
 *     escalating stages, and saying sorry properly repairs it
 *  5. messaging beats not messaging against a PAIRED do nothing baseline on
 *     identical seeds, by an amount worth having and small enough not to
 *     wreck the balance work of the last thirty rounds
 *  6. the sports feed is about the rest of the world and never claims
 *     anything the world model did not produce
 *  7. the save stays bounded across a full career
 *  8. a save from before this round still opens, still ticks, still works
 *
 * Run: node scripts/simPhone2.mjs [careers]
 */
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/phone2Entry.mjs';
const BUNDLE = '/tmp/phone2.bundle.mjs';
const CAREERS = Number(process.argv[2] || 320);

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
const phone = await import('${ROOT}/src/lib/soccerPhone.ts');
const eras = await import('${ROOT}/src/lib/careerEras.ts');
export { engine, phone, eras };
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'error', alias: { '@': './src' },
});
const { engine, phone, eras } = await import(pathToFileURL(BUNDLE).href);

const {
  initCareer, advanceYouthYear, advanceProSeason, answerPhoneText,
  unreadPhoneCount, FALLBACK_CLUBS,
} = engine;
const {
  CONVOS, CONTACTS, contactAvailable, convoTopic, phoneThreads, threadReplies,
  starterConvos, phoneFeed, phoneWorld, phoneStanding, ensurePhone,
  MAX_LINES, MAX_THREADS, MAX_FEED,
} = phone;

let failures = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const DASH = /[–—]/;
const BRANDS = /\b(2K|BitLife|FIFA\s*\d|EA\s+Sports|Madden|Football\s+Manager|NBA\s*2K)\b/i;
const NATIONS = ['England', 'Spain', 'France', 'Brazil', 'Germany', 'Argentina', 'Portugal', 'Italy'];
const POSITIONS = ['ST', 'CM', 'CB', 'LW', 'GK', 'CAM', 'RB'];

const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const REAL_RANDOM = Math.random;
const avg = (arr, f) => arr.length ? arr.reduce((s, r) => s + f(r), 0) / arr.length : 0;
const sd = (arr, f) => {
  if (arr.length < 2) return 0;
  const m = avg(arr, f);
  return Math.sqrt(arr.reduce((s, r) => s + (f(r) - m) ** 2, 0) / (arr.length - 1));
};

/* ---------- 1. Catalog lint ---------- */
console.log(`1) Catalog lint: ${CONVOS.length} conversations, ${CONTACTS.length} contacts`);
{
  const ids = new Set();
  let beats = 0, presets = 0;
  const contactsUsed = new Set();
  for (const c of CONVOS) {
    if (ids.has(c.id)) fail(`duplicate convo id ${c.id}`);
    ids.add(c.id);
    contactsUsed.add(c.contact);
    if (!['youth', 'pro', 'any'].includes(c.phase)) fail(`${c.id}: bad phase ${c.phase}`);
    if (c.beats.length < 1 || c.beats.length > 4) fail(`${c.id}: ${c.beats.length} beats`);
    if (c.starter && convoTopic(c) === 'Send them a message') fail(`${c.id}: starter with no written topic`);
    for (const b of c.beats) {
      beats += 1;
      if (b.replies.length < 2 || b.replies.length > 4) fail(`${c.id}: beat with ${b.replies.length} replies`);
      if (b.text.length > 190) fail(`${c.id}: beat text too long (${b.text.length})`);
      for (const r of b.replies) {
        presets += 1;
        if (!r.label) fail(`${c.id}: preset with no label`);
        if (r.back === undefined) fail(`${c.id}/${r.label}: no answer attached, the thread would die`);
        if (Math.abs(r.warm ?? 6) > 22) fail(`${c.id}/${r.label}: warm ${r.warm} out of bounds`);
        if (r.karma !== undefined && Math.abs(r.karma) > 12) fail(`${c.id}/${r.label}: karma ${r.karma} out of bounds`);
        if (r.cash !== undefined && Math.abs(r.cash) > 1) fail(`${c.id}/${r.label}: cash ${r.cash} too big`);
        for (const str of [r.label, r.say, r.back, r.nextText || '']) {
          if (DASH.test(str)) fail(`${c.id}: EM/EN DASH in "${str.slice(0, 44)}"`);
          if (BRANDS.test(str)) fail(`${c.id}: other company's product named in "${str.slice(0, 44)}"`);
        }
      }
      if (DASH.test(b.text)) fail(`${c.id}: EM/EN DASH in beat "${b.text.slice(0, 44)}"`);
      if (BRANDS.test(b.text)) fail(`${c.id}: product name in beat "${b.text.slice(0, 44)}"`);
    }
  }
  for (const c of CONTACTS) {
    if (DASH.test(c.name) || DASH.test(c.blurb)) fail(`contact ${c.id}: dash in copy`);
    if (!contactsUsed.has(c.id)) fail(`contact ${c.id} has no conversations at all`);
  }
  const multi = CONVOS.filter(c => c.beats.length >= 2).length;
  console.log(`   ${beats} beats, ${presets} preset replies, ${multi}/${CONVOS.length} conversations run to two beats or more`);
  if (presets < 200) fail(`only ${presets} preset replies, he asked for many many`);
  if (multi < CONVOS.length * 0.8) fail('too many one beat conversations, they end where Round 80 ended');
  if (CONTACTS.length < 12) fail(`only ${CONTACTS.length} contacts`);
}

/* ---------- helpers used by the rest ---------- */

function freshCareer(seed, opts = {}) {
  Math.random = mulberry32(seed);
  const c = initCareer(
    opts.name || `P${seed}`,
    opts.nation || NATIONS[seed % NATIONS.length],
    opts.pos || POSITIONS[seed % POSITIONS.length],
    'modern', flat(56), 56, 2020, FALLBACK_CLUBS, null, 74 + (seed % 16),
  );
  return c;
}

/** Reply to everything waiting. `pick` chooses the index. */
function replyAll(c, pick) {
  let taps = 0;
  for (let pass = 0; pass < 6; pass++) {
    const ts = phoneThreads(c).filter(t => t.pending);
    if (!ts.length) break;
    let moved = false;
    for (const t of ts) {
      const opts = threadReplies(c, t);
      if (!opts.length) continue;
      const idx = pick(opts, t);
      const before = c;
      c = answerPhoneText(c, t.id, idx);
      if (c !== before) { taps += 1; moved = true; }
    }
    if (!moved) break;
  }
  return { c, taps };
}

const warmest = opts => {
  let best = 0;
  for (let i = 1; i < opts.length; i++) if ((opts[i].warm ?? 6) > (opts[best].warm ?? 6)) best = i;
  return best;
};

function runCareer(seed, mode, maxSeasons = 34) {
  let c = freshCareer(seed);
  /* The picker gets its own stream so all three arms are reproducible run to
     run. The comparison is deterministic given the seed list, which is the
     point: a guard that moves between runs is a guard nobody trusts. */
  const pickRng = mulberry32(seed ^ 0x5bd1e995);
  let guard = 0, taps = 0;
  while (!c.retired && guard < maxSeasons) {
    guard += 1;
    if (mode !== 'silent') {
      const picker = mode === 'warm' ? warmest : (opts => Math.floor(pickRng() * opts.length));
      const r = replyAll(c, picker);
      c = r.c; taps += r.taps;
    }
    c = c.phase === 'youth' ? advanceYouthYear(c, FALLBACK_CLUBS) : advanceProSeason(c, FALLBACK_CLUBS);
    if (c.transferSituation) c = { ...c, transferSituation: null };
  }
  Math.random = REAL_RANDOM;
  return { state: c, taps };
}

/* ---------- 2. A thread genuinely continues ---------- */
console.log('2) Replying produces another message, and it is the right one');
{
  let checked = 0, chains = 0, deepChains = 0, backMatches = 0, backChecks = 0;
  const chainLen = [];
  for (let i = 0; i < 120; i++) {
    let c = freshCareer(9000 + i);
    let mine = 0;
    for (let step = 0; step < 6; step++) {
      const t = phoneThreads(c).find(x => x.pending && x.pending.kind === 'convo');
      if (!t) break;
      const opts = threadReplies(c, t);
      if (!opts.length) break;
      const idx = step % opts.length;
      const chosen = opts[idx];
      const lastBefore = t.lines[t.lines.length - 1]?.t;
      c = answerPhoneText(c, t.id, idx);
      const after = phoneThreads(c).find(x => x.id === t.id);
      if (!after) { fail('thread vanished after a reply'); break; }
      checked += 1;
      /* One reply appends at most three lines (yours, their answer, their next
         message), so both of yours are always inside the last three even once
         the MAX_LINES cap starts trimming the older history. */
      const tail = after.lines.slice(-3).map(l => l.t);
      if (!tail.includes(chosen.say)) fail(`what you sent is not in the thread for "${chosen.label}"`);
      if (chosen.back) {
        backChecks += 1;
        // The reply they send has to be the one attached to the preset picked.
        if (tail.includes(chosen.back)) backMatches += 1;
        else fail(`their answer does not follow the preset picked ("${chosen.label}")`);
      }
      if (after.lines[after.lines.length - 1]?.t === lastBefore) fail('nothing new arrived after a reply');
      mine += 1;
      if (!after.pending) break;
    }
    chainLen.push(mine);
    if (mine >= 2) chains += 1;
    if (mine >= 3) deepChains += 1;
    Math.random = REAL_RANDOM;
  }
  console.log(`   ${checked} replies across 120 fresh careers, ${backMatches}/${backChecks} answers matched the preset picked`);
  console.log(`   ${chains}/120 careers reached a second exchange, ${deepChains}/120 reached a third, mean depth ${avg(chainLen, v => v).toFixed(2)}`);
  if (chains < 108) fail(`only ${chains} of 120 conversations went past one reply, that is Round 80 again`);
  if (deepChains < 60) fail(`only ${deepChains} of 120 reached a third exchange`);
  if (backChecks && backMatches !== backChecks) fail('some answers did not follow the choice');
}

/* ---------- 3. Contacts: you can message first ---------- */
console.log('3) Contacts you can open yourself');
{
  let opened = 0, covered = new Set();
  for (let i = 0; i < 60; i++) {
    let c = freshCareer(4100 + i);
    // Push a few seasons in so pro only contacts exist too.
    for (let k = 0; k < 6 && !c.retired; k++) {
      c = c.phase === 'youth' ? advanceYouthYear(c, FALLBACK_CLUBS) : advanceProSeason(c, FALLBACK_CLUBS);
      if (c.transferSituation) c = { ...c, transferSituation: null };
    }
    Math.random = REAL_RANDOM;
    const phase = c.phase === 'youth' ? 'youth' : 'pro';
    const avail = CONTACTS.filter(x => contactAvailable(x.id, c, phase));
    if (avail.length < 8) fail(`only ${avail.length} contacts available mid career`);
    for (const con of avail) {
      const starters = starterConvos(c, con.id, phase);
      const existing = phoneThreads(c).find(t => t.c === con.id);
      if (existing && existing.pending) continue;
      if (!starters.length) continue;
      const before = phoneThreads(c).find(t => t.c === con.id)?.lines.length ?? 0;
      const next = answerPhoneText(c, `open:${con.id}`, 0);
      const t = phoneThreads(next).find(x => x.c === con.id);
      if (!t) { fail(`opening ${con.id} produced no thread`); continue; }
      if (t.lines.length <= before) fail(`opening ${con.id} produced no message`);
      if (!t.pending) fail(`opening ${con.id} left nothing to reply to`);
      if (!threadReplies(next, t).length) fail(`opening ${con.id} offered no presets`);
      opened += 1; covered.add(con.id);
      c = next;
    }
  }
  console.log(`   ${opened} conversations opened by the player across ${covered.size} different contacts`);
  if (covered.size < 12) fail(`only ${covered.size} contacts could ever be messaged first`);
  if (opened < 200) fail('the contacts list barely offers anything to say');
}

/* ---------- 4. Ignoring people costs you, saying sorry fixes it ---------- */
console.log('4) Silence cools people, and the copy changes');
{
  const relDrops = [], stageSeen = new Set();
  let repaired = 0, repairTried = 0;
  for (let i = 0; i < 90; i++) {
    let c = freshCareer(2200 + i);
    const first = phoneThreads(c).find(t => t.pending && t.pending.kind === 'convo');
    if (!first) continue;
    const id = first.id;
    const relStart = first.rel;
    const textsStart = new Set(first.lines.map(l => l.t));
    // Say nothing for four seasons.
    for (let k = 0; k < 4 && !c.retired; k++) {
      c = c.phase === 'youth' ? advanceYouthYear(c, FALLBACK_CLUBS) : advanceProSeason(c, FALLBACK_CLUBS);
      if (c.transferSituation) c = { ...c, transferSituation: null };
    }
    Math.random = REAL_RANDOM;
    const cooled = phoneThreads(c).find(t => t.id === id);
    if (!cooled) continue;
    relDrops.push(relStart - cooled.rel);
    if (cooled.cold < 1) fail('four seasons of silence and nobody noticed');
    const fresh = cooled.lines.filter(l => l.w === 0 && !textsStart.has(l.t)).map(l => l.t);
    if (!fresh.length) fail('a cooled contact sent nothing new at all');
    for (const line of fresh) {
      if (/i see how it is/i.test(line)) stageSeen.add('seeit');
      if (/fame has really gotten to you/i.test(line)) stageSeen.add('fame');
      if (/you have changed|stop texting|stop bothering/i.test(line)) stageSeen.add('done');
    }
    // Now say sorry properly and watch it come back.
    const opts = threadReplies(c, cooled);
    const sorryIdx = opts.findIndex(o => /sorry|ringing you/i.test(o.say));
    if (sorryIdx >= 0) {
      repairTried += 1;
      const relBefore = cooled.rel;
      const after = answerPhoneText(c, cooled.id, sorryIdx);
      const t2 = phoneThreads(after).find(x => x.id === cooled.id);
      if (t2 && t2.rel > relBefore && t2.cold === 0) repaired += 1;
      else fail('saying sorry did not repair anything');
      if (t2 && !t2.lines.some(l => l.w === 0 && l.y === t2.lines[t2.lines.length - 1].y)) {
        fail('nobody answered the apology');
      }
    }
  }
  console.log(`   mean relationship drop after four ignored seasons: ${avg(relDrops, v => v).toFixed(1)} points over ${relDrops.length} threads`);
  console.log(`   escalation stages observed: ${[...stageSeen].join(', ') || 'none'}`);
  console.log(`   apologies that repaired the relationship: ${repaired}/${repairTried}`);
  if (relDrops.length < 40) fail('not enough cooled threads to measure');
  if (avg(relDrops, v => v) < 18) fail('ignoring people barely costs anything');
  if (!stageSeen.has('seeit')) fail('nobody ever sends the "I see how it is" line');
  if (!stageSeen.has('fame')) fail('nobody ever sends the "fame has gotten to you" line');
  if (repairTried < 20) fail('the apology path almost never came up');
  if (repaired !== repairTried) fail('saying sorry did not always repair');
}

/* ---------- 5. Messaging beats not messaging, on paired seeds ---------- */
console.log(`5) ${CAREERS} paired careers: reply to people against never opening the phone`);
{
  const warm = [], mixed = [], silent = [];
  for (let i = 0; i < CAREERS; i++) {
    try {
      warm.push(runCareer(5000 + i, 'warm'));
      mixed.push(runCareer(5000 + i, 'mixed'));
      silent.push(runCareer(5000 + i, 'silent'));
    } catch (e) {
      fail(`paired career ${i} crashed: ${e && e.message}`);
      break;
    }
  }
  const peak = r => r.state.peakOverall;
  const goals = r => r.state.seasons.reduce((s, x) => s + x.goals, 0);
  const money = r => r.state.netWorth;
  const morale = r => r.state.morale;
  const stand = r => phoneStanding(r.state);
  const line = (label, arr) =>
    `   ${label.padEnd(22)} peak ${avg(arr, peak).toFixed(2)}  goals ${avg(arr, goals).toFixed(1)}  morale ${avg(arr, morale).toFixed(1)}  worth ${avg(arr, money).toFixed(1)}m  standing ${avg(arr, stand).toFixed(1)}  taps/career ${avg(arr, r => r.taps).toFixed(1)}`;
  console.log(line('replies warmly', warm));
  console.log(line('replies at random', mixed));
  console.log(line('never opens phone', silent));

  const n = warm.length;
  if (n < 120) fail(`only ${n} careers completed, too few to measure`);
  // Margin from the measured spread rather than from a number that sounds
  // strict. Round 125 had to repair three guards that failed on noise alone.
  const sePeak = Math.sqrt(sd(warm, peak) ** 2 / n + sd(silent, peak) ** 2 / n);
  const dPeak = avg(warm, peak) - avg(silent, peak);
  const seGoals = Math.sqrt(sd(warm, goals) ** 2 / n + sd(silent, goals) ** 2 / n);
  const dGoals = avg(warm, goals) - avg(silent, goals);
  console.log(`   peak overall gap ${dPeak.toFixed(2)} (standard error ${sePeak.toFixed(2)}, ${(dPeak / Math.max(sePeak, 1e-9)).toFixed(1)} sigma)`);
  console.log(`   career goals gap ${dGoals.toFixed(1)} (standard error ${seGoals.toFixed(1)}, ${(dGoals / Math.max(seGoals, 1e-9)).toFixed(1)} sigma)`);
  if (dPeak <= sePeak * 2) fail(`replying is worth ${dPeak.toFixed(2)} peak overall, inside the noise`);
  if (dPeak > 5) fail(`replying is worth ${dPeak.toFixed(2)} peak overall, that wrecks the balance`);
  const dMorale = avg(warm, morale) - avg(silent, morale);
  if (dMorale <= 2) fail(`morale gap is only ${dMorale.toFixed(1)}`);
  if (avg(warm, stand) - avg(silent, stand) < 20) fail('replying barely moves the standing');
  if (avg(silent, stand) > 45) fail('never touching the phone leaves everybody happy with you');
  if (avg(warm, r => r.taps) < 12) fail('a full career offered barely anything to reply to');
  // Random replying should land between the two, which is the shape of a real
  // choice rather than a free reward for tapping anything.
  console.log(`   random replying sits at peak ${avg(mixed, peak).toFixed(2)} against ${avg(silent, peak).toFixed(2)} silent and ${avg(warm, peak).toFixed(2)} warm`);
}

/* ---------- 6. The feed is about other people, and it is true ---------- */
console.log('6) The sports feed against the world model that produced it');
{
  let items = 0, careers = 0, moveLines = 0;
  const seenNames = new Set();
  for (let i = 0; i < 70; i++) {
    let c = freshCareer(7700 + i);
    const allMoves = [];
    const allWorlds = [];
    let guard = 0;
    while (!c.retired && guard < 26) {
      guard += 1;
      c = c.phase === 'youth' ? advanceYouthYear(c, FALLBACK_CLUBS) : advanceProSeason(c, FALLBACK_CLUBS);
      if (c.transferSituation) c = { ...c, transferSituation: null };
      const w = phoneWorld(c);
      if (w) { allWorlds.push(w); for (const m of w.moves) allMoves.push(m); }
    }
    Math.random = REAL_RANDOM;
    careers += 1;
    const feed = phoneFeed(c);
    items += feed.length;
    const world = phoneWorld(c);
    if (!world) { fail('a full career produced no world season at all'); continue; }
    if (!feed.length) { fail('a full career produced an empty sports feed'); continue; }
    for (const line of feed) {
      if (DASH.test(line)) fail(`dash in feed line "${line}"`);
      if (BRANDS.test(line)) fail(`product name in feed line "${line}"`);
      if (line.includes(c.playerName)) fail(`the feed is talking about the player: "${line}"`);
      if (line.includes(c.currentClub)) fail(`the feed is talking about the player's own club: "${line}"`);
      const m = line.match(/^🔄 DONE DEAL\. (.+) joins (.+) from (.+)\. Fee around (\d+)m\.$/);
      if (m) {
        moveLines += 1;
        seenNames.add(m[1]);
        const real = allMoves.find(x => x.who === m[1] && x.to === m[2] && x.from === m[3] && String(x.fee) === m[4]);
        if (!real) fail(`the feed reports a transfer the world model never made: "${line}"`);
      }
      const t = line.match(/^🏆 (.+) win (?:the )?(.+)\.$/);
      if (t) {
        const club = t[1], league = t[2].replace(/^the /, '');
        const ok = allWorlds.some(w => w.leagues[league] === club);
        if (!ok) fail(`the feed reports a title the world model never awarded: "${line}"`);
      }
      const u = line.match(/^⭐ (.+) are champions of Europe\.$/);
      if (u && !allWorlds.some(w => w.ucl === u[1])) fail(`the feed reports a European champion the world never crowned: "${line}"`);
    }
    // Whoever the feed said moved has to be where the feed said he went.
    const clubs = ensurePhone(c).clubs;
    const last = allWorlds[allWorlds.length - 1];
    for (const mv of last.moves) {
      if (clubs[mv.who] && clubs[mv.who] !== mv.to) {
        fail(`${mv.who} was reported at ${mv.to} but the world model has him at ${clubs[mv.who]}`);
      }
    }
  }
  console.log(`   ${items} feed items across ${careers} careers, ${moveLines} of them transfers, ${seenNames.size} different players moved`);
  if (items < careers * 8) fail('the feed is too thin to be worth opening');
  if (moveLines < careers * 2) fail('barely any transfer news, which is the thing he asked for');
  if (seenNames.size < 20) fail('the same handful of players move every time');
}

/* ---------- 7. Save size stays bounded ---------- */
console.log('7) Save size over a full career');
{
  const sizes = [], phoneShare = [];
  for (let i = 0; i < 24; i++) {
    const r = runCareer(3300 + i, 'warm', 40);
    const total = Buffer.byteLength(JSON.stringify(r.state));
    const ph = Buffer.byteLength(JSON.stringify(r.state.phone ?? {}));
    sizes.push(total); phoneShare.push(ph);
    const p = ensurePhone(r.state);
    if (p.threads.length > MAX_THREADS) fail(`${p.threads.length} threads, cap is ${MAX_THREADS}`);
    if (p.feed.length > MAX_FEED) fail(`${p.feed.length} feed items, cap is ${MAX_FEED}`);
    for (const t of p.threads) if (t.lines.length > MAX_LINES) fail(`thread ${t.id} has ${t.lines.length} lines, cap is ${MAX_LINES}`);
  }
  sizes.sort((a, b) => a - b);
  const max = sizes[sizes.length - 1];
  console.log(`   whole save: median ${(sizes[12] / 1024).toFixed(1)} KB, biggest ${(max / 1024).toFixed(1)} KB`);
  console.log(`   the phone's share: mean ${(avg(phoneShare, v => v) / 1024).toFixed(1)} KB, biggest ${(Math.max(...phoneShare) / 1024).toFixed(1)} KB`);
  if (max > 46 * 1024) fail(`biggest save is ${(max / 1024).toFixed(1)} KB`);
  if (Math.max(...phoneShare) > 8 * 1024) fail('the phone alone is eating more than 8 KB');
}

/* ---------- 8. A save from before this round ---------- */
console.log('8) Pre Round 130 saves open and keep working');
{
  for (let i = 0; i < 30; i++) {
    let c = freshCareer(880 + i);
    for (let k = 0; k < 4 && !c.retired; k++) {
      c = c.phase === 'youth' ? advanceYouthYear(c, FALLBACK_CLUBS) : advanceProSeason(c, FALLBACK_CLUBS);
      if (c.transferSituation) c = { ...c, transferSituation: null };
    }
    Math.random = REAL_RANDOM;
    // Strip everything this round added, the way an old save arrives.
    const old = JSON.parse(JSON.stringify(c));
    delete old.phone;
    // The panel can be opened BEFORE any step function runs (Round 127), so
    // every read path has to survive an unrepaired save on its own.
    try {
      if (phoneThreads(old).length !== 0) fail('an old save invented threads on read');
      if (phoneFeed(old).length !== 0) fail('an old save invented a feed on read');
      if (phoneStanding(old) !== 50) fail(`an old save reads standing ${phoneStanding(old)}, want neutral 50`);
      if (phoneWorld(old) !== null) fail('an old save invented a world season on read');
      const phase = old.phase === 'youth' ? 'youth' : 'pro';
      for (const con of CONTACTS) starterConvos(old, con.id, phase);
      unreadPhoneCount(old);
      if (old.phone !== undefined) fail('reading an old save wrote to it');
    } catch (e) {
      fail(`opening an old save threw: ${e && e.message}`);
      continue;
    }
    // And then it has to tick, and start behaving like a Round 130 save.
    let repaired = old;
    try {
      for (let k = 0; k < 3 && !repaired.retired; k++) {
        repaired = repaired.phase === 'youth' ? advanceYouthYear(repaired, FALLBACK_CLUBS) : advanceProSeason(repaired, FALLBACK_CLUBS);
        if (repaired.transferSituation) repaired = { ...repaired, transferSituation: null };
      }
    } catch (e) {
      fail(`an old save crashed on the next season: ${e && e.message}`);
      continue;
    }
    Math.random = REAL_RANDOM;
    if (!repaired.retired) {
      if (phoneThreads(repaired).length === 0) fail('an old save never started a conversation');
      const t = phoneThreads(repaired).find(x => x.pending);
      if (t) {
        const opts = threadReplies(repaired, t);
        if (!opts.length) fail('an old save has a waiting thread with nothing to say back');
        const next = answerPhoneText(repaired, t.id, 0);
        if (next === repaired) fail('an old save could not reply to its own thread');
      }
    }
  }
  console.log('   30 stripped saves opened cold, read cleanly and ticked into the new system');
}

Math.random = REAL_RANDOM;
console.log(failures === 0 ? '\nALL PHONE ROUND 130 CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
