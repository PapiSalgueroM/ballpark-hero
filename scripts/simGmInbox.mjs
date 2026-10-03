/* ─── Round 940: the GM inbox, one deck for every manager seat ───────────────

   src/lib/gmInbox.ts is one inbox engine for seven desks (NFL, NBA, MLB and
   NHL front offices, the college programs, the fight gym, the Australian
   football club), each desk a pack of events as data under src/data/gmInbox/.
   This harness drives the real engine over the real packs and holds:

     1) LEGAL. No pack quotes anybody, names anybody off the rosters, or puts
        a name placeholder anywhere. Every voice is a role. The banks live in
        src/data, which simNoInventedQuotes' static pass skips on purpose, so
        its detectors (and simNoInventedConduct's) are run over the banks
        here. The roster name set must be big enough to mean something.
     2) EXACT EFFECTS. Every option of every event, answered through the
        engine on a fresh desk, moves exactly what it declares and nothing
        else, its card line names exactly those moves, and a second answer
        moves nothing. Answered again with each moved 0 to 100 meter one
        short of the end it moves toward, it lands exactly on that end.
     3) RULES OVER 1,000 SEASONS PER PACK (100 desks of 10 seasons): every
        delivery is on its beat with every declared condition true over that
        week's facts (judged against a pristine copy of the pack), a one shot
        never comes twice (the Australian football pack has two), a
        repeatable never comes back inside its cooldown, never more than
        three open, never more than eight kept, and no message still open is
        ever dropped. Eight and three are literals here, the brief's and
        Club Manager's numbers, and the engine's constants must equal them.
     3b) THE CAPS AT THEIR EDGES. The desks above rarely reach either cap, so
        20 silent desks a pack (never answer) must reach three open and stop
        there, and 20 stubborn desks (leave the first message open, answer
        the rest) must fill to eight kept with that first message still on
        the desk. Measured: every one of the 140 of each reaches its cap.
     4) RATE. Each pack's mean events per season sits in a band set from
        measured headroom (numbers below).
     5) REACH. Every event of every pack arrives in at least one ten season
        run, and in at least REACH_FLOOR of them.
     6) SAME SEED, SAME DECK, and a different seed deals a different one.

   No board is bound to the deck yet (Round 940 builds the engine, the packs
   and the panel only), so sections 3 to 5 drive synthetic desks: every fact
   is drawn from the range its own pack declares, per season or per week as
   declared, and a desk answers three weeks in four. The rate bands are the
   deck's own rhythm on those desks, to be remeasured on a real board when
   one binds it.

   MEASURED 2026-10-03 at seeds 1 to 10 (100 desks of 10 seasons a pack,
   packs at chance 0.5, the Australian football pack on its ten round year),
   mean events a season:
     nfl 2.76 to 2.86, nba 2.23 to 2.37, mlb 2.53 to 2.60, nhl 2.73 to 2.85,
     college 3.29 to 3.36, gym 2.77 to 2.84, afl 2.18 to 2.25.
   Seasons with no event at all: 0.0% (gym) to 6.7% (nba).
   About 18,700 to 18,900 events dealt a run, 0 rule breaks at every seed.
   The rarest event (nba_trade_demand, two conditions) reached 40% to 49% of
   ten season runs, so REACH_FLOOR is 25%.

   Negative controls, each must turn this harness red:
     GM_INBOX_CONTROL=quote   puts a quoted first person line under a real
                              roster name into the NFL pack; section 1 fails.
     GM_INBOX_CONTROL=flip    flips one condition in the pack the engine
                              reads (not the pristine copy); section 3 fails.
     GM_INBOX_CONTROL=cool    zeroes the cooldowns the engine reads; sections 3
                              and 4 fail.
     GM_INBOX_CONTROL=drift   the engine stops applying the weeks out effect;
                              section 2 fails.
     GM_INBOX_CONTROL=never   one event's condition can never be true; section
                              5 fails.
     GM_INBOX_CONTROL=random  the engine rolls chance on Math.random instead of
                              the seeded stream; section 6 fails.
     GM_INBOX_CONTROL=shift   the kept cap drops the oldest message whether or
                              not it was answered; section 3b fails.
     GM_INBOX_CONTROL=opencap the engine forgets the open cap; section 3b fails.
     GM_INBOX_CONTROL=maxcap  the engine keeps twelve; sections 3 and 3b fail.
     GM_INBOX_CONTROL=oneshot the engine ignores oneShot; section 3 fails.
     GM_INBOX_CONTROL=ungate  nfl_holdout loses its condition in both copies
                              of the pack (a data edit section 3 cannot see);
                              section 4 fails.
     GM_INBOX_CONTROL=unclamp careerInbox stops clamping trust at 0 and 100;
                              section 2 fails.
   Each control asserts the thing it mutates exists first, and refuses to run
   otherwise.

   Run: node scripts/simGmInbox.mjs   (SEED=n picks the stream, default 1) */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.GM_INBOX_CONTROL || '';
const SEED = Number(process.env.SEED || 1);
if (CONTROL && !['quote', 'flip', 'cool', 'drift', 'never', 'random', 'shift', 'opencap', 'maxcap', 'oneshot', 'ungate', 'unclamp'].includes(CONTROL)) {
  console.error(`GM_INBOX_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(2);
}
let failures = 0;
const fail = msg => { failures++; console.error(`   FAIL ${msg}`); };
const ok = msg => console.log(`   ok ${msg}`);

/* ─── bundle the real engine and packs ───────────────────────────────────── */

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gminbox-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });
const R = ROOT.replaceAll('\\', '/');
const ENGINE = path.join(ROOT, 'src/lib/gmInbox.ts');
let engineSrc = null;
/* The controls that swap one line of the engine: the line, and what it becomes. */
const ENGINE_CONTROLS = {
  drift: ['if (c.out && c.out.weeks > 0) seat.setOut(s, c.out.who, c.out.weeks);', '/* drift control: out effect dropped */'],
  random: ['filter(e => rng() < (e.chance ?? pack.chance))', 'filter(e => Math.random() < (e.chance ?? pack.chance))'],
  shift: ['const idx = inbox.findIndex(m => m.answered !== undefined);', 'const idx = 0; /* shift control */'],
  opencap: ['const want = Math.max(0, Math.min(pack.perWeek, GM_INBOX_OPEN - open));', 'const want = pack.perWeek; /* opencap control */'],
  maxcap: ['export const GM_INBOX_MAX = 8;', 'export const GM_INBOX_MAX = 12; /* maxcap control */'],
  oneshot: ['if (e.oneShot) return !used.has(e.id);', '/* oneshot control */'],
};
if (ENGINE_CONTROLS[CONTROL]) {
  const src = fs.readFileSync(ENGINE, 'utf8');
  const [line, swap] = ENGINE_CONTROLS[CONTROL];
  if (!src.includes(line)) { console.error(`${CONTROL} control: "${line}" is not in gmInbox.ts, refusing to run`); process.exit(2); }
  engineSrc = src.replace(line, swap);
  if (engineSrc === src) { console.error(`${CONTROL} control changed nothing, refusing to run`); process.exit(2); }
}
/* unclamp swaps one line of careerInbox.ts, whose answer flow moves trust. */
const CAREER = path.join(ROOT, 'src/lib/careerInbox.ts');
let careerSrc = null;
if (CONTROL === 'unclamp') {
  const src = fs.readFileSync(CAREER, 'utf8');
  const line = 'sport.setMood(s, clamp(sport.moodOf(s) + choice.karma, 0, 100));';
  if (!src.includes(line)) { console.error('unclamp control: the trust clamp is not in careerInbox.ts, refusing to run'); process.exit(2); }
  careerSrc = src.replace(line, 'sport.setMood(s, sport.moodOf(s) + choice.karma); /* unclamp control */');
}
const ENTRY = path.join(tmpDir, 'entry.mjs');
const BUNDLE = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
export * as engine from '${R}/src/lib/gmInbox.ts';
export { GM_INBOX_PACKS } from '${R}/src/data/gmInbox/index.ts';
export { keyedRng } from '${R}/src/lib/keyedRng.ts';
`);
/* The drift control swaps the engine's source in memory, never on disk. */
const redirect = {
  name: 'gm-inbox-control',
  setup(b) {
    b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]gmInbox\.ts$/ }, () => (engineSrc === null ? undefined
      : { contents: engineSrc, loader: 'ts', resolveDir: path.dirname(ENGINE) }));
    b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]careerInbox\.ts$/ }, () => (careerSrc === null ? undefined
      : { contents: careerSrc, loader: 'ts', resolveDir: path.dirname(CAREER) }));
  },
};
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, plugins: [redirect], absWorkingDir: ROOT,
});
const { engine: E, GM_INBOX_PACKS, keyedRng } = await import(pathToFileURL(BUNDLE).href);
/* The engine reads PACKS; every judgement is made against PRISTINE. */
const PRISTINE = JSON.parse(JSON.stringify(GM_INBOX_PACKS));
const PACKS = GM_INBOX_PACKS;
const SEATS = Object.keys(PACKS);
console.log(`simGmInbox: ${SEATS.length} packs, ${SEATS.map(k => `${k} ${PACKS[k].events.length}`).join(', ')} events${CONTROL ? `, CONTROL=${CONTROL}` : ''}, seed ${SEED}`);
if (SEATS.length !== 7) fail(`expected seven packs, found ${SEATS.length}`);

/* ═══ 1. LEGAL: no quote, no real name, no placeholder, every voice a role ═══ */

console.log('1) Legal: every pack is narrated and every voice is a role');
/* The real people a desk could ever hold: the rosters every GM, career and
   gym game reads. Full names only, as simNoInventedQuotes does for its own. */
const ROSTER_FILES = [
  'src/data/frontOfficePlayers.ts', 'src/data/conquestDataNba.ts', 'src/data/mlbFoPlayers.ts', 'src/data/mlbFoRosters2026.ts',
  'src/data/nhlFoPlayers.ts', 'src/data/cfbHLPlayers.ts', 'src/data/ufcFighters.ts', 'src/data/aflGoalKickers.ts',
];
const deaccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const REAL = new Set();
for (const rel of ROSTER_FILES) {
  const txt = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const m of txt.matchAll(/name:\s*['"]([A-Z][^'"]{1,40} [^'"]{2,40})['"]/g)) REAL.add(deaccent(m[1]));
}
/* Measured 2,236 names on 2026-10-03. The floor only proves the harvest
   worked: a roster file that moved or changed shape drops it far below. */
const REAL_FLOOR = 1500;
if (REAL.size < REAL_FLOOR) fail(`only ${REAL.size} real names harvested (floor ${REAL_FLOOR}): the name scan would mean nothing`);
else ok(`${REAL.size} real names harvested from ${ROSTER_FILES.length} roster files`);

/* The detectors simNoInventedQuotes and simNoInventedConduct use, copied so
   they can be pointed at src/data/gmInbox, which their static passes skip. */
const QUOTE_MARK = /["“”]/;
const QUOTED = /["“”][^"“”]{8,}["“”]/g;
const FIRST_PERSON = /\b(I|I'm|I am|I've|I'll|my|me|mine|we|we're|us|our|boss|gaffer)\b/;
const UNQUOTED_SPEECH = /(?::|,)\s+(?:I|I'm|I am|I've|my|we|we're)\b/;
const ALLEGATION = /\b(casino|gambling debts?|drunk|drink driv\w*|crashed his|arrested|having an affair|cheating on|missed training|hungover|assaulted)\b/i;
const CONDUCT = /transfer request|bust-up|bust up|agents? for|leaked|reject(ed|s)? a|refus(ed|es)|demand(ed|s)|storm(ed|s) out|fell out|falling out|row over|walked out|went on strike|downed tools|sulk|tantrum|forced? (a|his) (move|exit)|handed in/i;
/* A voice is a role: a possessive role, an indefinite or definite one, or
   one of the club's departments. */
const ROLE = /^(Your |His |A |The )[a-z]/;
const DEPARTMENTS = new Set(['Ownership', 'Team doctor', 'Ticket office', 'Marketing', 'Compliance office']);
const namesIn = text => { const flat = deaccent(text); return [...REAL].filter(n => flat.includes(n)); };

if (CONTROL === 'quote') {
  const someone = [...REAL].find(n => /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(n));
  if (!someone || !REAL.has(someone)) { console.error('quote control: no real name to borrow, refusing to run'); process.exit(2); }
  const before = PACKS.nfl.events.length;
  PACKS.nfl.events.push({ id: 'nfl_control_quote', beat: 'camp', from: someone, emoji: 'x',
    text: `${someone} told reporters: "I want a new deal before camp or I sit."`, choices: PACKS.nfl.events[0].choices });
  if (PACKS.nfl.events.length !== before + 1) { console.error('quote control changed nothing, refusing to run'); process.exit(2); }
}

{
  let strings = 0;
  const bad = [];
  for (const seat of SEATS) {
    const p = PACKS[seat];
    const lines = [['label', p.label], ...p.calendar.map(b => ['beat', b.label]), ...Object.values(p.targets).map(t => ['target', t])];
    for (const e of p.events) {
      lines.push(['text', e.text], ['from', e.from]);
      for (const c of e.choices) lines.push(['option', c.label], ['reply', c.reply]);
      if (!ROLE.test(e.from) && !DEPARTMENTS.has(e.from)) bad.push(`${e.id}: the voice "${e.from}" is not a role`);
      if (FIRST_PERSON.test(deaccent(e.text))) bad.push(`${e.id}: the message speaks in the first person instead of narrating`);
    }
    for (const [kind, s] of lines) {
      strings++;
      const where = `${seat} ${kind} "${String(s).slice(0, 50)}"`;
      if (QUOTE_MARK.test(s)) bad.push(`${where}: a quote mark`);
      if (/[{}]/.test(s)) bad.push(`${where}: a placeholder`);
      const names = namesIn(s);
      if (names.length === 0) continue;
      bad.push(`${where}: a real name (${names[0]})`);
      if ((s.match(QUOTED) ?? []).some(q => FIRST_PERSON.test(deaccent(q))) || UNQUOTED_SPEECH.test(deaccent(s))) bad.push(`${where}: a real name next to speech`);
      if (ALLEGATION.test(s) || CONDUCT.test(s)) bad.push(`${where}: a real name next to conduct`);
    }
  }
  console.log(`   scanned ${strings} strings across ${SEATS.length} packs, ${bad.length} findings`);
  for (const b of bad.slice(0, 12)) console.error(`     ${b}`);
  /* Measured 389 strings on 2026-10-03 (labels, beats, targets, every event's
     text and voice, every option's label and reply). The floor, about four
     fifths of that, proves the scan reached the packs' events without going
     red when a pack drops an event or two. */
  if (strings < 300) fail(`only ${strings} strings scanned: the packs are thinner than this harness was written for`);
  if (bad.length) fail(`${bad.length} legal findings in the packs`);
  else ok('no quote, no real name, no placeholder, every voice a role');
}

/* ═══ 2. EXACT EFFECTS: every option of every event, through the engine ═══ */

console.log('2) Every option moves exactly what its card says, once');
const clamp100 = v => Math.max(0, Math.min(100, v));
const newDesk = () => ({ morale: 50, trust: 50, fans: 50, cash: 10, year: 2030, recruit: 50, out: {}, rating: {} });
const bindDesk = pack => E.bindGmInbox(pack, {
  moodOf: s => s.trust, setMood: (s, v) => { s.trust = v; },
  addPopularity: (s, d) => { s.fans = clamp100(s.fans + d); },
  addCash: (s, a) => { s.cash = Math.round((s.cash + a) * 1000) / 1000; },
  yearOf: s => s.year,
  setOut: (s, who, w) => { s.out[who] = (s.out[who] ?? 0) + w; },
  addRating: (s, who, d) => { s.rating[who] = (s.rating[who] ?? 0) + d; },
  addRecruit: (s, d) => { s.recruit += d; },
});
const meters = s => JSON.stringify({ morale: s.morale, trust: s.trust, fans: s.fans, cash: s.cash, recruit: s.recruit, out: s.out, rating: s.rating });
/* A value that makes one condition true, so the event can be dealt. */
const satisfy = c => {
  if (c.op === '==' || c.op === '<=' || c.op === '>=') return c.value;
  if (c.op === '!=') return typeof c.value === 'boolean' ? !c.value : typeof c.value === 'number' ? c.value + 1 : `${c.value}-other`;
  return c.op === '<' ? c.value - 0.01 : c.value + 0.01;
};
const sgn = v => (v > 0 ? `+${v}` : `${v}`);
{
  let options = 0;
  const bad = [];
  for (const seat of SEATS) {
    const pack = PACKS[seat];
    const pristine = PRISTINE[seat];
    for (const pe of pristine.events) {
      const e = pack.events.find(x => x.id === pe.id);
      const facts = Object.fromEntries((pe.when ?? []).map(c => [c.fact, satisfy(c)]));
      pe.choices.forEach((pc, idx) => {
        options++;
        const s = newDesk();
        const seat1 = bindDesk({ ...pack, chance: 1, events: [{ ...e, chance: 1 }] });
        const got = E.gmInboxWeek(s, seat1, pe.beat, facts, 0, () => 0);
        if (got.length !== 1 || got[0].defId !== pe.id) { bad.push(`${pe.id}: could not be dealt with its own conditions true`); return; }
        const line = E.answerGmInbox(s, got[0].id, idx, seat1);
        const want = newDesk();
        want.trust = clamp100(50 + pc.karma);
        if (pc.popularity) want.fans = clamp100(50 + pc.popularity);
        if (pc.cash) want.cash = Math.round((10 + pc.cash) * 1000) / 1000;
        if (pc.morale) want.morale = clamp100(50 + pc.morale);
        if (pc.out && pc.out.weeks > 0) want.out[pc.out.who] = pc.out.weeks;
        if (pc.rating && pc.rating.delta) want.rating[pc.rating.who] = pc.rating.delta;
        if (pc.recruit) want.recruit = 50 + pc.recruit;
        if (meters(s) !== meters(want)) bad.push(`${pe.id} option ${idx}: moved ${meters(s)}, declared ${meters(want)}`);
        /* Rule 5 at the end of a meter: each moved 0 to 100 meter starts 1 short
           of the end it moves toward, and must land exactly on that end. */
        {
          const near = d => (d > 0 ? 99 : 1);
          const s2 = newDesk();
          if (pc.karma) s2.trust = near(pc.karma);
          if (pc.popularity) s2.fans = near(pc.popularity);
          if (pc.morale) s2.morale = near(pc.morale);
          const start = { trust: s2.trust, fans: s2.fans, morale: s2.morale };
          const [g2] = E.gmInboxWeek(s2, seat1, pe.beat, facts, 0, () => 0);
          E.answerGmInbox(s2, g2.id, idx, seat1);
          const end = { trust: clamp100(start.trust + pc.karma), fans: clamp100(start.fans + (pc.popularity ?? 0)), morale: clamp100(start.morale + (pc.morale ?? 0)) };
          for (const k of ['trust', 'fans', 'morale']) if (s2[k] !== end[k]) bad.push(`${pe.id} option ${idx}: ${k} went from ${start[k]} to ${s2[k]} at the meter's end, not ${end[k]}`);
        }
        /* The card, rebuilt here from the declaration, not from choiceEffects. */
        const m = pristine.meters;
        const card = [];
        if (pc.karma) card.push(`${m.trust} ${sgn(pc.karma)}`);
        if (pc.popularity) card.push(`${m.fans} ${sgn(pc.popularity)}`);
        if (pc.cash) card.push(`${m.money} ${pc.cash > 0 ? '+' : '-'}${pristine.money.prefix}${Math.abs(pc.cash)}${pristine.money.suffix}`);
        if (pc.morale) card.push(`${m.morale} ${sgn(pc.morale)}`);
        if (pc.out && pc.out.weeks > 0) card.push(`${pristine.targets[pc.out.who]} out ${pc.out.weeks} week${pc.out.weeks === 1 ? '' : 's'}`);
        if (pc.rating && pc.rating.delta) card.push(`${pristine.targets[pc.rating.who]} rating ${sgn(pc.rating.delta)}`);
        if (pc.recruit) card.push(`${m.recruit ?? 'Recruit interest'} ${sgn(pc.recruit)}`);
        const shown = E.gmChoiceLabel(pc, pristine);
        if (card.length === 0) bad.push(`${pe.id} option ${idx}: moves nothing`);
        if (shown !== `${pc.label} · ${card.join(', ')}`) bad.push(`${pe.id} option ${idx}: the card reads "${shown}", the effects are ${card.join(', ')}`);
        if (!line || !card.every(c => line.includes(c))) bad.push(`${pe.id} option ${idx}: the feed line "${line}" misses an effect`);
        const after = meters(s);
        if (E.answerGmInbox(s, got[0].id, idx, seat1) !== null || meters(s) !== after) bad.push(`${pe.id} option ${idx}: a second answer moved something`);
      });
    }
  }
  console.log(`   ${options} options answered on a fresh desk, ${bad.length} findings`);
  for (const b of bad.slice(0, 10)) console.error(`     ${b}`);
  if (options < 100) fail(`only ${options} options checked`);
  if (bad.length) fail(`${bad.length} options move something other than their card`);
  else ok('every option moved exactly its declared effects, its card said exactly that, and moved once');
}

/* ═══ 3 to 6. The deck over 1,000 seasons a pack ═══ */

if (CONTROL === 'flip') {
  const e = PACKS.nfl.events.find(x => x.id === 'nfl_holdout');
  const c = e?.when?.find(x => x.fact === 'starExpiring' && x.op === '==' && x.value === true);
  if (!c) { console.error('flip control: nfl_holdout has no starExpiring == true condition, refusing to run'); process.exit(2); }
  c.value = false;
}
if (CONTROL === 'never') {
  const c = PACKS.nfl.events.find(x => x.id === 'nfl_holdout')?.when?.find(x => x.fact === 'starExpiring');
  if (!c) { console.error('never control: nfl_holdout has no starExpiring condition, refusing to run'); process.exit(2); }
  c.value = 'never';
}
if (CONTROL === 'cool') {
  if (!SEATS.some(k => PACKS[k].cooldown > 0)) { console.error('cool control: no pack has a cooldown, refusing to run'); process.exit(2); }
  for (const k of SEATS) { PACKS[k].cooldown = 0; for (const e of PACKS[k].events) if (e.cooldown !== undefined) e.cooldown = 0; }
}
/* A data edit, not an engine one: the holdout loses its gate in BOTH copies,
   so section 3 (which judges by the pristine copy) has nothing to object to
   and only section 4's band can see the deck come out heavier. */
if (CONTROL === 'ungate') {
  for (const p of [PACKS.nfl, PRISTINE.nfl]) {
    const e = p.events.find(x => x.id === 'nfl_holdout');
    if (!e?.when?.length) { console.error('ungate control: nfl_holdout has no conditions to drop, refusing to run'); process.exit(2); }
    delete e.when;
  }
}

const DESKS = 100;
const SEASONS = 10;
const EDGE_DESKS = 20;
const EDGE_FLOOR = 0.5;
/* The brief's numbers, as literals: Club Manager keeps a list of eight and
   never leaves more than three open. Checking against the engine's own
   constants would follow a change to them instead of catching it. */
const KEEP = 8;
const OPEN = 3;
if (E.GM_INBOX_MAX !== KEEP) fail(`the engine keeps ${E.GM_INBOX_MAX} messages, the brief says ${KEEP}`);
if (E.GM_INBOX_OPEN !== OPEN) fail(`the engine allows ${E.GM_INBOX_OPEN} open, Club Manager's rule is ${OPEN}`);
const seasonFactsOf = (pristine, rng) => {
  const out = {};
  for (const [k, spec] of Object.entries(pristine.facts)) if (spec.per === 'season') out[k] = draw(spec, rng);
  return out;
};
const weekFactsOf = (pristine, seasonFacts, rng) => {
  const out = { ...seasonFacts };
  for (const [k, spec] of Object.entries(pristine.facts)) if (spec.per === 'week') out[k] = draw(spec, rng);
  return out;
};
/* Rule 4: a message still open before a week must still be there after it. */
const openIds = s => (s.phoneInbox ?? []).filter(m => m.answered === undefined).map(m => m.id);
const lostOpen = (s, before) => before.filter(id => !(s.phoneInbox ?? []).some(m => m.id === id));
const holds = (c, facts) => {
  if (!(c.fact in facts)) return false;
  const v = facts[c.fact];
  if (c.op === '==') return v === c.value;
  if (c.op === '!=') return v !== c.value;
  if (typeof v !== 'number') return false;
  return c.op === '<' ? v < c.value : c.op === '<=' ? v <= c.value : c.op === '>' ? v > c.value : v >= c.value;
};
const draw = (spec, rng) => (spec.kind === 'bool' ? rng() < spec.p : Math.round((spec.min + rng() * (spec.max - spec.min)) * 100) / 100);

/** One desk, ten seasons. Every judgement is made against the pristine pack. */
function runDesk(seat, desk, seed) {
  const pack = PACKS[seat];
  const pristine = PRISTINE[seat];
  const byId = new Map(pristine.events.map(e => [e.id, e]));
  const weeks = E.gmSeasonWeeks(pristine);
  const factRng = keyedRng(`simGmInbox|${seat}|${seed}|${desk}|facts`);
  const deckRng = keyedRng(`simGmInbox|${seat}|${seed}|${desk}|deck`);
  const answerRng = keyedRng(`simGmInbox|${seat}|${seed}|${desk}|answer`);
  const s = newDesk();
  const bound = bindDesk(pack);
  const seen = new Set();
  const lastAt = {};
  const log = [];
  const perSeason = [];
  const bad = [];
  let clock = 0;
  for (let season = 0; season < SEASONS; season++) {
    s.year = 2030 + season;
    const seasonFacts = seasonFactsOf(pristine, factRng);
    let count = 0;
    for (const beat of weeks) {
      const facts = weekFactsOf(pristine, seasonFacts, factRng);
      const before = openIds(s);
      const got = E.gmInboxWeek(s, bound, beat, facts, clock, deckRng);
      for (const id of lostOpen(s, before)) bad.push(`${id}: dropped from the desk while still unanswered`);
      for (const m of got) {
        const pe = byId.get(m.defId);
        count++;
        log.push(`${m.defId}@${clock}`);
        if (!pe) { bad.push(`${m.defId}: not an event in the pack`); continue; }
        if (pe.beat !== beat) bad.push(`${pe.id}: arrived on ${beat}, belongs to ${pe.beat}`);
        const off = (pe.when ?? []).find(c => !holds(c, facts));
        if (off) bad.push(`${pe.id}: arrived with ${off.fact} ${off.op} ${off.value} false (${off.fact} was ${facts[off.fact]})`);
        if (pe.oneShot && seen.has(pe.id)) bad.push(`${pe.id}: a one shot arrived twice`);
        const cd = pe.cooldown ?? pristine.cooldown;
        if (!pe.oneShot && lastAt[pe.id] !== undefined && clock - lastAt[pe.id] < cd) bad.push(`${pe.id}: back after ${clock - lastAt[pe.id]} weeks, cooldown ${cd}`);
        seen.add(pe.id);
        lastAt[pe.id] = clock;
      }
      const open = (s.phoneInbox ?? []).filter(m => m.answered === undefined);
      if (open.length > OPEN) bad.push(`${open.length} open at once`);
      if ((s.phoneInbox ?? []).length > KEEP) bad.push(`${s.phoneInbox.length} kept at once`);
      /* A desk answers most weeks, not all. The caps barely bind on desks like
         this, so section 3b drives the two desks that push them to the edge. */
      for (const m of open) if (answerRng() < 0.75) E.answerGmInbox(s, m.id, Math.floor(answerRng() * m.choices.length), bound);
      clock++;
    }
    perSeason.push(count);
  }
  return { log, perSeason, seen, bad };
}

const runs = {};
for (const seat of SEATS) runs[seat] = Array.from({ length: DESKS }, (_, d) => runDesk(seat, d, SEED));

console.log(`3) The rules hold over ${DESKS * SEASONS} seasons a pack`);
{
  const bad = SEATS.flatMap(seat => runs[seat].flatMap(r => r.bad.map(b => `${seat} ${b}`)));
  const dealt = SEATS.reduce((n, seat) => n + runs[seat].reduce((m, r) => m + r.log.length, 0), 0);
  console.log(`   ${dealt} events dealt, ${bad.length} rule breaks`);
  for (const b of [...new Set(bad)].slice(0, 10)) console.error(`     ${b}`);
  if (dealt < 1000) fail(`only ${dealt} events dealt: nothing was tested`);
  if (bad.length) fail(`${bad.length} deliveries broke a rule (beat, condition, one shot, cooldown or caps)`);
  else ok('every delivery was on its beat with every condition true, no one shot twice, no repeat inside a cooldown, caps held');
}

console.log(`3b) The caps at their edges: ${EDGE_DESKS} silent and ${EDGE_DESKS} stubborn desks a pack, ten seasons each`);
/* A silent desk never answers, so the open cap is the only thing between it
   and a pile of decisions. A stubborn desk leaves its first message open and
   answers everything after it the week it lands, so the list fills to the
   kept cap with one open message at the very front: rule 4 says that one
   stays. Each check must have bitten (the cap reached) to count. */
{
  const bad = [];
  const reached = { silent: {}, stubborn: {} };
  for (const seat of SEATS) {
    const pristine = PRISTINE[seat];
    const weeks = E.gmSeasonWeeks(pristine);
    for (const kind of ['silent', 'stubborn']) {
      reached[kind][seat] = 0;
      for (let desk = 0; desk < EDGE_DESKS; desk++) {
        const factRng = keyedRng(`simGmInbox|${kind}|${seat}|${SEED}|${desk}|facts`);
        const deckRng = keyedRng(`simGmInbox|${kind}|${seat}|${SEED}|${desk}|deck`);
        const s = newDesk();
        const bound = bindDesk(PACKS[seat]);
        let first = null;
        let peak = 0;
        let clock = 0;
        for (let season = 0; season < SEASONS; season++) {
          s.year = 2030 + season;
          const seasonFacts = seasonFactsOf(pristine, factRng);
          for (const beat of weeks) {
            const before = openIds(s);
            const got = E.gmInboxWeek(s, bound, beat, weekFactsOf(pristine, seasonFacts, factRng), clock, deckRng);
            for (const id of lostOpen(s, before)) bad.push(`${seat} ${kind} desk ${desk}: ${id} dropped while still unanswered`);
            if (kind === 'stubborn') for (const m of got) { if (first === null) first = m.id; else E.answerGmInbox(s, m.id, 0, bound); }
            const open = openIds(s).length;
            const kept = (s.phoneInbox ?? []).length;
            if (open > OPEN) bad.push(`${seat} ${kind} desk ${desk}: ${open} open at once`);
            if (kept > KEEP) bad.push(`${seat} ${kind} desk ${desk}: ${kept} kept at once`);
            peak = Math.max(peak, kind === 'silent' ? open : kept);
            clock++;
          }
        }
        if (kind === 'stubborn' && first !== null && !(s.phoneInbox ?? []).some(m => m.id === first)) bad.push(`${seat} stubborn desk ${desk}: the first message is gone`);
        if (peak >= (kind === 'silent' ? OPEN : KEEP)) reached[kind][seat]++;
      }
    }
  }
  for (const kind of ['silent', 'stubborn']) {
    const line = SEATS.map(k => `${k} ${reached[kind][k]}`).join(', ');
    const thin = SEATS.filter(k => reached[kind][k] < EDGE_DESKS * EDGE_FLOOR);
    if (thin.length) fail(`${kind} desks reached the ${kind === 'silent' ? 'open' : 'kept'} cap too rarely to test it (${line} of ${EDGE_DESKS})`);
    else console.log(`   ${kind} desks at the ${kind === 'silent' ? `open cap of ${OPEN}` : `kept cap of ${KEEP}`}: ${line} of ${EDGE_DESKS}`);
  }
  for (const b of [...new Set(bad)].slice(0, 10)) console.error(`     ${b}`);
  if (bad.length) fail(`${bad.length} cap breaks at the edges (open past ${OPEN}, kept past ${KEEP}, or an open message dropped)`);
  else ok(`never past ${OPEN} open or ${KEEP} kept, and no open message ever dropped`);
}

console.log('4) Each pack deals a measured number of events a season');
/* Mean events a season over 1,000 seasons, measured at seeds 1 to 10 (see the
   header). The band is the measured range widened by 0.15 a side: about three
   seed to seed spreads, and tight enough that one event losing its gate (the
   ungate control, about +0.4 on the NFL) lands outside it. */
const RATE_BANDS = {
  nfl: [2.61, 3.01], nba: [2.08, 2.52], mlb: [2.38, 2.75], nhl: [2.58, 3.0], college: [3.14, 3.51], gym: [2.62, 2.99], afl: [2.03, 2.4],
};
for (const seat of SEATS) {
  const all = runs[seat].flatMap(r => r.perSeason);
  const mean = all.reduce((a, b) => a + b, 0) / all.length;
  const zero = all.filter(n => n === 0).length / all.length;
  const [lo, hi] = RATE_BANDS[seat] ?? [Infinity, -Infinity];
  const line = `${seat}: ${mean.toFixed(2)} a season (band ${lo} to ${hi}), ${(zero * 100).toFixed(1)}% of seasons with none`;
  if (mean < lo || mean > hi) fail(line); else ok(line);
}

console.log('5) Every event arrives in a ten season run');
const REACH_FLOOR = 0.25;
{
  let worst = { share: 2, id: '' };
  for (const seat of SEATS) {
    for (const e of PRISTINE[seat].events) {
      const share = runs[seat].filter(r => r.seen.has(e.id)).length / DESKS;
      if (share < worst.share) worst = { share, id: e.id };
      if (share === 0) fail(`${e.id} never arrived in ${DESKS} ten season runs`);
      else if (share < REACH_FLOOR) fail(`${e.id} arrived in only ${(share * 100).toFixed(0)}% of ten season runs (floor ${REACH_FLOOR * 100}%)`);
    }
  }
  console.log(`   the rarest event, ${worst.id}, arrived in ${(worst.share * 100).toFixed(0)}% of ten season runs`);
}

console.log('6) Same seed, same deck');
{
  const a = runDesk('nfl', 7, SEED).log.join(',');
  const b = runDesk('nfl', 7, SEED).log.join(',');
  const c = runDesk('nfl', 7, SEED + 1000).log.join(',');
  if (a !== b) fail('the same seed dealt two different decks');
  else if (a === c) fail('two different seeds dealt the same deck: the stream is not reaching the deck');
  else ok(`same seed, same ${a.split(',').length} events; another seed, another deck`);
}

/* ═══ end ═══ */

console.log('');
if (failures > 0) {
  console.error(`simGmInbox: ${failures} failure${failures === 1 ? '' : 's'}${CONTROL ? ` (CONTROL=${CONTROL})` : ''}`);
  process.exit(1);
}
console.log(`simGmInbox: green.${CONTROL ? ` CONTROL=${CONTROL} did not fire, which is itself a failure of the control.` : ''}`);
if (CONTROL) process.exit(3);
