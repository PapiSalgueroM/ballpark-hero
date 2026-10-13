/* ─── Round 1324: the event deck kit, the proof every pack round reruns ──────

   src/lib/gmInbox.ts is the one event deck the depth program builds on: a
   pack of cards as data, conditions over plain facts, beats, cooldowns, one
   shots, the kept and open caps, the words written from the effects, no
   Math.random. Round 1324 grows it the rules a deck of hundreds of cards
   needs (weights, story lines, a rest for the man a card is about, several
   wordings a card, cards that expire, a season clock). Every one of them is
   an optional field, so a pack without them must deal exactly what it dealt
   before. This kit holds that, and holds each new rule to its word.

     1) REPLAY. The seven GM packs at seeds 1, 2 and 3 over four drives
        (FLEET 100 desks answering three weeks in four with a random option,
        SILENT 20 desks that never answer, STUBBORN 20 desks that leave their
        first message open and answer the rest, FALLEN 20 desks handing in the
        week of the season as their clock with a year that never moves, so
        the rebase and the id suffix run), ten seasons a desk, byte equal to
        scripts/data/gmInboxReplay.json: the sha256 of every desk's JSON after
        every week with the ids dealt and the answer lines, the deck rng's call
        count and the deal count, plus a 12 character hash a desk so a red
        names the first desk that moved. The file was recorded from the base
        engine BEFORE gmInbox.ts changed, by
          SIM_EVENT_DECK_RECORD=<base sha> node scripts/simEventDeck.mjs
        which refuses unless the engine, careerInbox, keyedRng and the packs
        are byte equal to that commit. The drive is the code between the two
        FROZEN DRIVE markers below; its hash is recorded too, so a change to
        it reads as a re-record, and a re-record is the lead's call, never
        the builder's.

     2) SAME SEED, SAME DECK, another seed another deck; a JSON round trip
        and repairGmInbox between every two weeks leave every seed 1 row
        byte equal, every base state repairs to itself, and no GM desk ever
        gains a field only a new pack writes.
     3) WEIGHTS. Every GM card at weight 1, then 2.5, deals the recording
        (the uniform line, by construction). FX_WEIGHT (weights 1 and 3) over
        10,000 weeks: the light card's share sits in a measured band.
     4) STORY. FX_STORY over 100 ten season desks: never two cards of one
        story in a week or inside the cooldown, a one shot story once; the
        same cards without the story deal measurably more.
     5) SUBJECT REST. FX_SUBJECT (role and fact subjects) over 50 desks of
        400 weeks: no subject inside its rest or twice in a week, the rest
        book never holds a finished rest or more than one window's deals;
        subjectRest 0 deals exactly as no subjects.

   No board binds gmInbox yet (the importers are its own test, the packs, the
   panel and two harnesses), so every drive here is a synthetic desk: each
   fact drawn from the range its own pack declares, per season or per week.
   The FX packs live in this file, are written in roles, and never ship.
   SIM_EVENT_DECK_MEASURE=1 prints each measured statistic at seeds 1 to 10;
   SEED=n moves the fixture sections' stream (default 1).

   Negative controls (EVENT_DECK_CONTROL), each asserts its anchor exists
   exactly once in the engine and refuses to run otherwise:
     replay     one extra deck draw before every pick; section 1 fails.
     weightoff  the draw ignores weights; section 3 fails.
     story      the book key ignores the story; section 4 fails.
     rest       the subject rest test always passes; section 5 fails.

   Run: node scripts/simEventDeck.mjs
        SIM_EVENT_DECK_SHARD=nfl runs one seat's rows of section 1 only. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const T0 = Date.now();
const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const CONTROL = process.env.EVENT_DECK_CONTROL || '';
const RECORD = process.env.SIM_EVENT_DECK_RECORD || '';
const SHARD = process.env.SIM_EVENT_DECK_SHARD || '';
const REPLAY_FILE = path.join(ROOT, 'scripts/data/gmInboxReplay.json');
const CONTROLS = ['replay', 'weightoff', 'story', 'rest'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`EVENT_DECK_CONTROL=${CONTROL} is not a control this kit knows`); process.exit(2); }
if (RECORD && (CONTROL || SHARD)) { console.error('a recording runs the whole replay with no control, refusing'); process.exit(2); }
const red = new Set();
let failures = 0;
const fail = (sec, msg) => { failures++; red.add(sec); console.error(`   FAIL ${msg}`); };
const ok = msg => console.log(`   ok ${msg}`);
/* Every read of a src file normalises line endings, so an anchor typed here
   (LF) matches on a CRLF checkout too. */
const readSrc = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const count = (hay, needle) => hay.split(needle).length - 1;

/* ─── bundle the real engine and every pack index the kit knows ─────────── */

/* The pack indexes, one line each, append only: W2 and W3 add theirs. */
const PACK_INDEXES = [
  ['src/data/gmInbox/index.ts', 'GM_INBOX_PACKS'],
];
const ENGINE_REL = 'src/lib/gmInbox.ts';
/* The controls that swap one line of the engine: the line, and what it becomes. */
const ENGINE_CONTROLS = {
  replay: ['const e = came.splice(Math.floor(rng() * came.length), 1)[0];',
    'rng(); const e = came.splice(Math.floor(rng() * came.length), 1)[0]; /* replay control */'],
  weightoff: ['const wt = (e: GmEventDef): number => e.weight ?? 1;', 'const wt = (e: GmEventDef): number => 1; /* weightoff control */'],
  story: ['const bookKey = (e: GmEventDef): string => ledgerKey(e);', 'const bookKey = (e: GmEventDef): string => e.id; /* story control */'],
  rest: ['if (r !== undefined && clock - r < restFor) return false;', '/* rest control */'],
};
let engineSrc = null;
if (ENGINE_CONTROLS[CONTROL]) {
  const src = readSrc(ENGINE_REL);
  const [line, swap] = ENGINE_CONTROLS[CONTROL];
  const n = count(src, line);
  if (n !== 1) { console.error(`${CONTROL} control: its anchor is in gmInbox.ts ${n} times, not once, refusing to run`); process.exit(2); }
  engineSrc = src.replace(line, swap);
  if (engineSrc === src) { console.error(`${CONTROL} control changed nothing, refusing to run`); process.exit(2); }
}
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventdeck-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });
const R = ROOT.replaceAll('\\', '/');
const ENTRY = path.join(tmpDir, 'entry.mjs');
const BUNDLE = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(ENTRY, [
  `export * as engine from '${R}/${ENGINE_REL}';`,
  `export { keyedRng } from '${R}/src/lib/keyedRng.ts';`,
  ...PACK_INDEXES.map(([rel, name], i) => `export { ${name} as packs${i} } from '${R}/${rel}';`),
].join('\n'));
/* A control swaps the engine's source in memory, never on disk. */
const redirect = {
  name: 'event-deck-control',
  setup(b) {
    b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]gmInbox\.ts$/ }, () => (engineSrc === null ? undefined
      : { contents: engineSrc, loader: 'ts', resolveDir: path.join(ROOT, 'src/lib') }));
  },
};
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, plugins: [redirect], absWorkingDir: ROOT,
});
const B = await import(pathToFileURL(BUNDLE).href);
const E = B.engine;
const { keyedRng } = B;
const GM = B.packs0;
/* Every pack the kit knows, by a tag that is unique across indexes. */
const ALL_PACKS = Object.assign({}, ...PACK_INDEXES.map((_, i) => B[`packs${i}`]));
const GM_SEATS = Object.keys(GM);
console.log(`simEventDeck: ${Object.keys(ALL_PACKS).length} packs (${GM_SEATS.join(', ')})${CONTROL ? `, CONTROL=${CONTROL}` : ''}${SHARD ? `, shard ${SHARD}` : ''}`);

/* ═══ FROZEN DRIVE: begin. Section 1's recording was made with exactly this
   code, and its hash is in the recording; any change is a re-record. ═══ */
const SEASONS = 10;
const DRIVES = {
  FLEET: { desks: 100, policy: 'sometimes', fallen: false },
  SILENT: { desks: 20, policy: 'never', fallen: false },
  STUBBORN: { desks: 20, policy: 'stubborn', fallen: false },
  FALLEN: { desks: 20, policy: 'sometimes', fallen: true },
};
const clamp100 = v => Math.max(0, Math.min(100, v));
const newDesk = () => ({ morale: 50, trust: 50, fans: 50, cash: 10, year: 2030, recruit: 50, out: {}, rating: {} });
const BINDING = {
  moodOf: s => s.trust, setMood: (s, v) => { s.trust = v; },
  addPopularity: (s, d) => { s.fans = clamp100(s.fans + d); },
  addCash: (s, a) => { s.cash = Math.round((s.cash + a) * 1000) / 1000; },
  yearOf: s => s.year,
  setOut: (s, who, w) => { s.out[who] = (s.out[who] ?? 0) + w; },
  addRating: (s, who, d) => { s.rating[who] = (s.rating[who] ?? 0) + d; },
  addRecruit: (s, d) => { s.recruit += d; },
};
const draw = (spec, rng) => (spec.kind === 'bool' ? rng() < spec.p : Math.round((spec.min + rng() * (spec.max - spec.min)) * 100) / 100);
const factsOf = (pack, per, base, rng) => {
  const out = { ...base };
  for (const [k, spec] of Object.entries(pack.facts)) if (spec.per === per) out[k] = draw(spec, rng);
  return out;
};
const openOf = s => (s.phoneInbox ?? []).filter(m => m.answered === undefined);
/* The answer policies, a parameter of the drive (the room W1b's best and
   worst answer fleets need). */
const POLICIES = {
  sometimes: (s, got, bound, rng, lines) => {
    for (const m of openOf(s)) if (rng() < 0.75) lines.push(E.answerGmInbox(s, m.id, Math.floor(rng() * m.choices.length), bound));
  },
  never: () => undefined,
  stubborn: (s, got, bound, rng, lines, st) => {
    for (const m of got) { if (st.first === null) st.first = m.id; else lines.push(E.answerGmInbox(s, m.id, 0, bound)); }
  },
};
/** One desk, ten seasons. opts: policy (a POLICIES name or a function), bind
 *  (extra binding fields), between (takes the desk after a week and returns
 *  the desk to go on with: the reload proof), observe (sees every week and
 *  every dealt message). The recording uses none of them. */
function runDesk(pack, tag, seed, kind, desk, opts = {}) {
  const drive = DRIVES[kind];
  const policy = typeof opts.policy === 'function' ? opts.policy : POLICIES[opts.policy ?? drive.policy];
  const weeks = E.gmSeasonWeeks(pack);
  const key = `simEventDeck|${kind}|${tag}|${seed}|${desk}`;
  const factRng = keyedRng(`${key}|facts`);
  const rawDeck = keyedRng(`${key}|deck`);
  let calls = 0;
  const deckRng = () => { calls++; return rawDeck(); };
  const answerRng = keyedRng(`${key}|answer`);
  const bound = E.bindGmInbox(pack, { ...BINDING, ...(opts.bind ?? {}) });
  const h = crypto.createHash('sha256');
  const st = { first: null };
  let s = newDesk();
  let deals = 0;
  let suffixed = 0;
  let clock = 0;
  for (let season = 0; season < SEASONS; season++) {
    s.year = drive.fallen ? 2030 : 2030 + season;
    const seasonFacts = factsOf(pack, 'season', {}, factRng);
    for (let w = 0; w < weeks.length; w++) {
      const facts = factsOf(pack, 'week', seasonFacts, factRng);
      const at = drive.fallen ? w : clock;
      const got = E.gmInboxWeek(s, bound, weeks[w], facts, at, deckRng);
      deals += got.length;
      suffixed += got.filter(m => m.id !== `${m.defId}-${s.year}-w${at}`).length;
      const lines = [];
      policy(s, got, bound, answerRng, lines, st);
      h.update(`${JSON.stringify(s)}|${got.map(m => m.id).join(',')}|${lines.join('/')}\n`);
      if (opts.observe) opts.observe({ s, got, beat: weeks[w], facts, clock: at, season, week: w, desk, lines });
      if (opts.between) s = opts.between(s);
      clock++;
    }
  }
  return { hash: h.digest('hex'), calls, deals, suffixed, s };
}
/** One row: every desk of one drive for one pack and seed. */
function runRow(pack, tag, seed, kind, opts = {}) {
  const h = crypto.createHash('sha256');
  const desks = [];
  let calls = 0;
  let deals = 0;
  let suffixed = 0;
  for (let d = 0; d < DRIVES[kind].desks; d++) {
    const r = runDesk(pack, tag, seed, kind, d, opts);
    h.update(`${r.hash}\n`);
    desks.push(r.hash.slice(0, 12));
    calls += r.calls;
    deals += r.deals;
    suffixed += r.suffixed;
  }
  return { hash: h.digest('hex'), calls, deals, suffixed, desks };
}
/* ═══ FROZEN DRIVE: end ═══ */

const SEEDS = [1, 2, 3];
const KINDS = Object.keys(DRIVES);
const DRIVE_HASH = (() => {
  const txt = fs.readFileSync(SELF, 'utf8').replace(/\r\n/g, '\n');
  const a = txt.indexOf('/* ═══ FROZEN DRIVE: begin');
  const b = txt.indexOf('/* ═══ FROZEN DRIVE: end ═══ */');
  if (a < 0 || b < a) { console.error('the frozen drive markers are gone, refusing to run'); process.exit(2); }
  return crypto.createHash('sha256').update(txt.slice(a, b)).digest('hex').slice(0, 12);
})();
const secs = () => ((Date.now() - T0) / 1000).toFixed(1);

/* ═══ 1. REPLAY: the seven GM packs deal exactly what the base engine dealt ═══ */

console.log(`1) Replay: ${GM_SEATS.length} GM packs, seeds ${SEEDS.join(', ')}, drives ${KINDS.join(', ')}, ${SEASONS} seasons a desk`);
const ROWS = {};
{
  const seats = SHARD ? GM_SEATS.filter(k => k === SHARD) : GM_SEATS;
  if (SHARD && seats.length === 0) { console.error(`SIM_EVENT_DECK_SHARD=${SHARD} is not a GM seat`); process.exit(2); }
  for (const seat of seats) for (const seed of SEEDS) for (const kind of KINDS) ROWS[`${seat}|${seed}|${kind}`] = runRow(GM[seat], seat, seed, kind);
  const all = Object.values(ROWS);
  const deals = all.reduce((n, r) => n + r.deals, 0);
  const calls = all.reduce((n, r) => n + r.calls, 0);
  const suffixed = Object.entries(ROWS).filter(([k]) => k.endsWith('|FALLEN')).reduce((n, [, r]) => n + r.suffixed, 0);
  console.log(`   ${all.length} rows, ${deals} events dealt, ${calls} deck draws, ${suffixed} repeat ids suffixed on FALLEN desks (${secs()} s)`);
  /* Measured 296 over the whole replay (2026-10-13); one seat alone may have none. */
  if (!SHARD && suffixed === 0) fail(1, 'no FALLEN desk ever repeated an id, so the id suffix never ran');
  if (RECORD) {
    const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
    let sha = '';
    try { sha = git(['rev-parse', '--verify', `${RECORD}^{commit}`]); } catch { console.error(`${RECORD} is not a commit, refusing to record`); process.exit(2); }
    const watched = ['src/lib/gmInbox.ts', 'src/lib/careerInbox.ts', 'src/lib/keyedRng.ts', 'src/data/gmInbox'];
    try { execFileSync('git', ['diff', '--quiet', sha, '--', ...watched], { cwd: ROOT, stdio: 'ignore' }); } catch {
      console.error(`the engine or its packs differ from ${sha}: a recording is made from the base engine only, refusing`);
      process.exit(2);
    }
    const meta = { round: 1324, base: sha, gmInboxBlob: git(['rev-parse', `${sha}:src/lib/gmInbox.ts`]), drive: DRIVE_HASH, seeds: SEEDS, seasons: SEASONS, drives: DRIVES };
    const text = `{\n${Object.entries(meta).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}\n  "rows": {\n${
      Object.entries(ROWS).map(([k, r]) => `    ${JSON.stringify(k)}: ${JSON.stringify(r)}`).join(',\n')}\n  }\n}\n`;
    fs.writeFileSync(REPLAY_FILE, text);
    console.log(`   RECORDED ${all.length} rows from ${sha.slice(0, 8)} (gmInbox.ts blob ${meta.gmInboxBlob.slice(0, 8)}, drive ${DRIVE_HASH}) into scripts/data/gmInboxReplay.json, ${text.length} bytes`);
  }
  const rec = fs.existsSync(REPLAY_FILE) ? JSON.parse(fs.readFileSync(REPLAY_FILE, 'utf8')) : null;
  if (!rec) fail(1, 'there is no recording at scripts/data/gmInboxReplay.json: it is recorded from the base engine, never by hand');
  else {
    console.log(`   the recording: base ${rec.base.slice(0, 8)}, gmInbox.ts blob ${rec.gmInboxBlob.slice(0, 8)}, drive ${rec.drive}, ${Object.keys(rec.rows).length} rows`);
    if (rec.drive !== DRIVE_HASH) fail(1, `the frozen drive changed since the recording (${rec.drive} recorded, ${DRIVE_HASH} now): a re-record is the lead's call`);
    const want = SHARD ? Object.keys(rec.rows).filter(k => k.startsWith(`${SHARD}|`)) : Object.keys(rec.rows);
    const moved = [];
    for (const k of want) {
      const r = ROWS[k];
      const w = rec.rows[k];
      if (!r) { moved.push(`${k}: recorded, not run`); continue; }
      if (r.hash === w.hash && r.calls === w.calls && r.deals === w.deals) continue;
      const d = r.desks.findIndex((x, i) => x !== w.desks[i]);
      moved.push(`${k}: hash ${r.hash.slice(0, 12)} not ${w.hash.slice(0, 12)}, deck draws ${r.calls} not ${w.calls}, deals ${r.deals} not ${w.deals}, first desk that moved ${d}`);
    }
    for (const k of Object.keys(ROWS)) if (!rec.rows[k]) moved.push(`${k}: run, not recorded`);
    for (const m of moved.slice(0, 12)) console.error(`     ${m}`);
    if (moved.length) fail(1, `${moved.length} of ${want.length} rows differ from the recording`);
    else ok(`all ${want.length} rows byte equal to the base engine's recording (desk states, ids, answer lines, deck draws, deals)`);
  }
}

/* ─── the fixture packs: written in roles, never shipped ───────────────── */

const SEED = Number(process.env.SEED || 1);
const MEASURE = process.env.SIM_EVENT_DECK_MEASURE === '1';
const TEN = Array.from({ length: 10 }, (_, i) => i + 1);
const fxCard = (id, extra = {}) => ({
  id, beat: 'a', from: 'Your assistant', emoji: '📋', text: `A ${id} matter needs a call this week.`,
  choices: [{ label: 'Leave it', reply: 'Left.', karma: 0 }, { label: 'Act on it', reply: 'Done.', karma: 2, morale: 1 }], ...extra,
});
const fxPack = (seat, events, extra = {}) => ({
  seat, label: seat, calendar: [{ id: 'a', label: 'Season', emoji: '📅' }], span: { a: 20 },
  facts: { man: { kind: 'num', min: 1, max: 3, per: 'week' } },
  targets: { captain: 'Your captain', keeper: 'Your keeper', striker: 'Your striker' },
  meters: { trust: 'Board trust', fans: 'Fans', money: 'Budget', morale: 'Dressing room' }, money: { prefix: '$', suffix: 'M' },
  perWeek: 1, cooldown: 0, chance: 1, events, ...extra,
});
/** One fixture desk over `ticks` weeks: facts(clock, rng) hands in the
 *  facts, answer 'all' answers every open message on its first option. */
function fxRun(pack, key, ticks, { facts = () => ({}), answer = 'all', bind = {} } = {}) {
  const rawDeck = keyedRng(`simEventDeck|fx|${key}|deck`);
  const factRng = keyedRng(`simEventDeck|fx|${key}|facts`);
  let calls = 0;
  const rng = () => { calls++; return rawDeck(); };
  const s = newDesk();
  const bound = E.bindGmInbox(pack, { ...BINDING, ...bind });
  const log = [];
  for (let clock = 0; clock < ticks; clock++) {
    const f = facts(clock, factRng);
    const got = E.gmInboxWeek(s, bound, 'a', f, clock, rng);
    log.push({ clock, got, facts: f, rest: s.gmInboxRest ? { ...s.gmInboxRest } : undefined });
    if (answer === 'all') for (const m of openOf(s)) E.answerGmInbox(s, m.id, 0, bound);
  }
  return { s, log, calls: () => calls };
}

/* ═══ 2. SAME SEED, SAME DECK, and a reload between weeks changes nothing ═══ */

console.log('2) Same seed, same deck; a JSON round trip and repairGmInbox between every two weeks change nothing');
let gmStates = 0;
let gmGrew = 0;
{
  const seats = Object.keys(ROWS).map(k => k.split('|')[0]).filter((k, i, a) => a.indexOf(k) === i);
  const k0 = seats[0];
  const again = runRow(GM[k0], k0, 1, 'FLEET');
  const other = runRow(GM[k0], k0, 4, 'FLEET');
  if (again.hash !== ROWS[`${k0}|1|FLEET`].hash) fail(2, `${k0} seed 1 dealt two different decks`);
  else if (other.hash === again.hash) fail(2, `${k0} seeds 1 and 4 dealt the same deck: the stream is not reaching the deck`);
  else ok(`${k0} seed 1 dealt the same ${again.deals} events twice; seed 4 dealt another deck`);
  let bent = 0;
  const between = s => {
    const text = JSON.stringify(s);
    const back = E.repairGmInbox(JSON.parse(text));
    gmStates++;
    if (JSON.stringify(back) !== text) bent++;
    if ('gmInboxRest' in back || (back.phoneInbox ?? []).some(m => 'w' in m || 'auto' in m)) gmGrew++;
    return back;
  };
  const moved = [];
  for (const seat of seats) for (const kind of KINDS) {
    const r = runRow(GM[seat], seat, 1, kind, { between });
    if (r.hash !== ROWS[`${seat}|1|${kind}`].hash) moved.push(`${seat}|1|${kind}`);
  }
  if (gmStates < 1000) fail(2, `only ${gmStates} desk states reloaded: nothing was tested`);
  if (bent) fail(2, `${bent} of ${gmStates} base states did not repair to themselves`);
  else ok(`all ${gmStates} desk states of seed 1 repaired to themselves`);
  if (moved.length) fail(2, `reloading between weeks moved ${moved.length} rows: ${moved.slice(0, 4).join(', ')}`);
  else ok(`${seats.length * KINDS.length} rows dealt byte equal with a reload between every two weeks`);
  if (gmGrew) fail(2, `${gmGrew} GM desk states gained a field a GM pack never writes (gmInboxRest, w or auto)`);
}

/* ═══ 3. WEIGHTS: equal weights are the uniform pick, and a weight is a share ═══ */

console.log('3) Weights: equal weights deal the recording, and a weight is a share of the draw, never a rank');
const REC = fs.existsSync(REPLAY_FILE) ? JSON.parse(fs.readFileSync(REPLAY_FILE, 'utf8')) : { rows: {} };
{
  const seats = Object.keys(ROWS).map(k => k.split('|')[0]).filter((k, i, a) => a.indexOf(k) === i);
  for (const w of [1, 2.5]) {
    const moved = seats.filter(seat => {
      const p = { ...GM[seat], events: GM[seat].events.map(e => ({ ...e, weight: w })) };
      return runRow(p, seat, 1, 'FLEET').hash !== REC.rows[`${seat}|1|FLEET`]?.hash;
    });
    if (moved.length) fail(3, `every card at weight ${w} moved the FLEET rows of ${moved.join(', ')}`);
    else ok(`every card at weight ${w}: ${seats.length} FLEET rows byte equal to the recording`);
  }
  const FX_WEIGHT = fxPack('fx_weight', [fxCard('light', { weight: 1 }), fxCard('heavy', { weight: 3 })]);
  const lightShare = seed => {
    const { log } = fxRun(FX_WEIGHT, `weight|${seed}`, 10000);
    const all = log.flatMap(l => l.got);
    return { share: all.filter(m => m.defId === 'light').length / all.length, n: all.length };
  };
  /* Measured 2026-10-13 at seeds 1 to 10 (10,000 weeks each, expected 0.25):
     0.2385 to 0.2636, mean 0.2478. The band is that range widened by about
     two binomial standard deviations (0.0043) a side. The weightoff control
     lands near 0.5. */
  const BAND = [0.23, 0.272];
  const { share, n } = lightShare(SEED);
  const line = `FX_WEIGHT (weights 1 and 3): the light card took ${share.toFixed(4)} of ${n} deals (band ${BAND[0]} to ${BAND[1]})`;
  if (n < 9000 || share === 0 || share < BAND[0] || share > BAND[1]) fail(3, line); else ok(line);
  if (MEASURE) console.log(`   measure: light share at seeds 1 to 10: ${TEN.map(sd => lightShare(sd).share.toFixed(4)).join(', ')}`);
}

/* ═══ 4. STORY: cards of one story share one stamp and one one shot ═══ */

console.log('4) Story: never two of one story inside its cooldown or in one week, a one shot story once');
{
  const FX_STORY = fxPack('fx_story', [
    fxCard('feud1', { story: 'feud' }), fxCard('feud2', { story: 'feud', cooldown: 9 }), fxCard('feud3', { story: 'feud' }),
    fxCard('exitA', { story: 'exit', oneShot: true }), fxCard('exitB', { story: 'exit', oneShot: true }), fxCard('exitC', { story: 'exit' }),
    fxCard('solo1'), fxCard('solo2'),
  ], { perWeek: 2, chance: 0.5, cooldown: 6 });
  const byId = new Map(FX_STORY.events.map(e => [e.id, e]));
  const storyCards = new Set(FX_STORY.events.filter(e => e.story).map(e => e.id));
  const run = (pack, seed = SEED) => {
    const bad = [];
    let deals = 0;
    let last = {};
    let shots = 0;
    let desk = -1;
    const observe = w => {
      if (w.desk !== desk) { desk = w.desk; last = {}; shots = 0; }
      const seen = new Set();
      for (const m of w.got) {
        const e = byId.get(m.defId);
        if (storyCards.has(e.id)) deals++;
        if (!e.story) continue;
        if (seen.has(e.story)) bad.push(`desk ${desk} week ${w.clock}: two cards of ${e.story} in one week`);
        seen.add(e.story);
        const at = last[e.story];
        if (at !== undefined && w.clock - at < (e.cooldown ?? pack.cooldown)) bad.push(`desk ${desk}: ${e.id} back ${w.clock - at} weeks after its story, cooldown ${e.cooldown ?? pack.cooldown}`);
        last[e.story] = w.clock;
        if (e.oneShot && ++shots > 1) bad.push(`desk ${desk}: the one shot story dealt twice`);
      }
    };
    for (let d = 0; d < DRIVES.FLEET.desks; d++) runDesk(pack, pack.seat, seed, 'FLEET', d, { observe });
    return { bad, deals };
  };
  const LOOSE = { ...FX_STORY, events: FX_STORY.events.map(({ story, ...e }) => e) };
  const withStory = run(FX_STORY);
  const loose = run(LOOSE);
  if (MEASURE) console.log(`   measure: rise without the story at seeds 1 to 10: ${TEN.map(sd => (run(LOOSE, sd).deals / run(FX_STORY, sd).deals).toFixed(3)).join(', ')}`);
  for (const b of withStory.bad.slice(0, 6)) console.error(`     ${b}`);
  if (withStory.deals < 1000) fail(4, `only ${withStory.deals} story cards dealt: nothing was tested`);
  if (withStory.bad.length) fail(4, `${withStory.bad.length} story breaks over ${DRIVES.FLEET.desks} desks`);
  else ok(`${withStory.deals} story cards over ${DRIVES.FLEET.desks} ten season desks, no story twice in a week or inside a cooldown, the one shot story once a desk`);
  /* Measured 2026-10-13 at seeds 1 to 10: the loose cards deal 1.756 to 1.767
     times as many. The floor of 1.5 sits well under that and well over the
     story control's 1.00. */
  const rise = loose.deals / Math.max(1, withStory.deals);
  const line = `without the story field the same cards dealt ${loose.deals}, ${rise.toFixed(2)} times as many (floor 1.5)`;
  if (rise < 1.5) fail(4, line); else ok(line);
}

/* ═══ 5. SUBJECT REST: no one man twice inside his rest ═══ */

console.log('5) Subject rest: no subject inside its rest or twice in a week, the rest book born pruned');
{
  const REST = 6;
  const FX_SUBJECT = fxPack('fx_subject', [
    fxCard('cap1', { subject: 'captain' }), fxCard('cap2', { subject: 'captain' }), fxCard('keep1', { subject: 'keeper' }),
    fxCard('man1', { subject: { fact: 'man' } }), fxCard('man2', { subject: { fact: 'man' } }), fxCard('man3', { subject: { fact: 'man' } }),
    fxCard('free1'),
  ], { perWeek: 2, chance: 0.6, cooldown: 2, subjectRest: REST });
  const facts = (clock, rng) => ({ man: 1 + Math.floor(rng() * 3) });
  const keyOf = (m, f) => E.gmSubjectKey(FX_SUBJECT.events.find(e => e.id === m.defId), f);
  const bad = [];
  let dealt = 0;
  let peak = 0;
  for (let d = 0; d < 50; d++) {
    const { log } = fxRun(FX_SUBJECT, `subject|${SEED}|${d}`, 400, { facts });
    const at = {};
    const window = [];
    for (const w of log) {
      const seen = new Set();
      for (const m of w.got) {
        const k = keyOf(m, w.facts);
        if (!k) continue;
        dealt++;
        if (seen.has(k)) bad.push(`desk ${d} week ${w.clock}: two cards about ${k}`);
        seen.add(k);
        if (at[k] !== undefined && w.clock - at[k] < REST) bad.push(`desk ${d}: ${k} again after ${w.clock - at[k]} weeks, rest ${REST}`);
        at[k] = w.clock;
        window.push(w.clock);
      }
      while (window.length && w.clock - window[0] >= REST) window.shift();
      const book = w.rest ?? {};
      for (const [k, t] of Object.entries(book)) if (w.clock - t >= REST) bad.push(`desk ${d} week ${w.clock}: ${k} still in the book after its rest`);
      if (Object.keys(book).length > window.length) bad.push(`desk ${d} week ${w.clock}: the book holds ${Object.keys(book).length}, only ${window.length} dealt inside a rest`);
      peak = Math.max(peak, Object.keys(book).length);
    }
  }
  for (const b of bad.slice(0, 6)) console.error(`     ${b}`);
  if (dealt < 1000) fail(5, `only ${dealt} subject cards dealt: nothing was tested`);
  if (bad.length) fail(5, `${bad.length} subject rest breaks`);
  else ok(`${dealt} subject cards over 50 desks of 400 weeks, none inside its rest or twice in a week, the book never above ${peak} entries`);
  /* With subjectRest 0 the subjects are inert: the same deal as no subjects. */
  const zero = fxRun({ ...FX_SUBJECT, subjectRest: 0 }, `subject|${SEED}|zero`, 400, { facts });
  const none = fxRun({ ...FX_SUBJECT, subjectRest: 0, events: FX_SUBJECT.events.map(({ subject, ...e }) => e) }, `subject|${SEED}|zero`, 400, { facts });
  const ids = r => r.log.map(w => w.got.map(m => m.id).join(',')).join('|');
  if (ids(zero) !== ids(none) || zero.calls() !== none.calls()) fail(5, 'subjectRest 0 dealt differently from the same pack without subjects');
  else if ('gmInboxRest' in zero.s) fail(5, 'a pack with subjectRest 0 wrote a rest book');
  else ok(`subjectRest 0 deals exactly as no subjects (${zero.log.reduce((n, w) => n + w.got.length, 0)} deals, ${zero.calls()} draws) and writes no book`);
  if (gmStates > 0 && gmGrew === 0) ok(`no GM desk gained gmInboxRest over section 2's ${gmStates} states`);
}

/* ═══ end ═══ */

console.log('');
console.log(`runtime ${secs()} s`);
if (failures > 0) {
  console.error(`simEventDeck: ${failures} failure${failures === 1 ? '' : 's'}, red sections ${[...red].sort((a, b) => a - b).join(', ')}${CONTROL ? ` (CONTROL=${CONTROL} fired)` : ''}`);
  process.exit(1);
}
console.log(`simEventDeck: green.${CONTROL ? ` CONTROL=${CONTROL} did not fire, which is itself a failure of the control.` : ''}`);
if (CONTROL) process.exit(3);
