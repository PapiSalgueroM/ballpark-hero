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
        and repairGmInbox between every two weeks leave every row of
        section 1 (seeds 1, 2 and 3) byte equal, every base state repairs to
        itself, and no GM desk ever
        gains a field only a new pack writes.
     3) WEIGHTS. Every GM card at weight 1, then 2.5, deals the recording
        (the uniform line, by construction). FX_WEIGHT (weights 1 and 3) over
        10,000 weeks: the light card's share sits in a measured band; two
        a week from three weights never deals one card twice in a week.
     4) STORY. FX_STORY over 100 ten season desks: never two cards of one
        story in a week or inside the cooldown, a one shot story once; the
        same cards without the story deal measurably more.
     5) SUBJECT REST. FX_SUBJECT (role and fact subjects) over 50 desks of
        400 weeks: no subject inside its rest or twice in a week, the rest
        book never holds a finished rest or more than one window's deals;
        subjectRest 0 deals exactly as no subjects while every fact is
        there, and still holds a card whose fact is missing (fail closed),
        which the same pack without subjects deals; on a clock that falls
        every 20 weeks the book is rebased (never ahead of the clock) and a
        lone card about the captain comes back every season.
     6) TEXTS. FX_TEXTS (cards of 2 and 4 wordings): the same deals and deck
        draws with and without wordings, the same key reads the same words,
        another key other words with the same deal, and every wording comes
        up at a measured share of its card's deals.
     7) EXPIRY. FX_EXPIRE (expiries 2, 3, 4 and 6, neutral option second) on
        20 silent ten season desks: every card is settled at exactly its
        arrival plus its expiry on its neutral option with auto set, no meter
        ever moves, the settled line names the neutral label with no dash
        and the assistant once, the deck never freezes (a measured multiple
        of the deals the same pack makes without expiry), a card whose def
        lost its expiry stays open, and on the FALLEN drive's falling clock
        every card settles in exactly its due week, a card across a fall
        counting from the fall. FX_TOLD's desks answer every plain card and
        no expiring one: the settled list a seat hands gmInboxWeek names
        exactly the cards each call settled, the ones the kept cap drops in
        that same call included. And a fence: a pack index holding an
        expiring card fails until the component it names (PACK_INDEXES'
        third field) calls gmExpiredLine. That fence is the NECESSARY half;
        the SUFFICIENT half is Round 1332's render test
        (src/components/front-office-shared/GmInboxPanel.test.tsx: an opened
        card the staff settled shows gmExpiredLine and never "You replied").
     8) NEUTRAL. Every card of every pack off NEUTRAL_BASELINE has an option
        that moves nothing, every pack on it still lacks one somewhere (the
        ratchet), gmPackProblems is empty for every pack the kit knows, and
        bind refuses each fixture breakage.
     9) SEASON CLOCK. FX_SEASON over 2,000 random ledgers and seasons: the
        season deck holds out exactly what careerEventDeck's onCooldown holds
        out (and onCooldown its own written rule); a cooldown of N is back
        after exactly N weeks on the week clock and sits out N seasons on the
        season clock.
     10) SHARE AND REACH. Every pack the kit knows over the FLEET drive (100
        desks of ten seasons): every card dealt, and the top card's share of
        its pack's deals (a mean over 1,000 seasons, never a max over runs)
        under that pack's ceiling, measured at seeds 1 to 10 and written at
        the section. A report line, not a gate: cards reached per value of a
        pack's reachBy fact (a keeper meets keeper work); W2 makes it a gate.

   Round 1332 (W1b) adds the rules every event pack needs, each an optional
   field a GM pack does not carry, so section 1 holds them to the recording:
     11) REGISTRY. FX_REGISTRY (a fixture registry of four keys: a 0 to 100
        board meter, a money key, a one man form meter, a suspension in
        weeks) on a pack whose cards use all four and the built ins: every
        option of every card answered on a fresh desk, every key read back
        with `read`, every built in meter compared: the printed words name
        exactly what moved, by exactly the printed amount; the button and the
        answer line carry those words; a second answer moves nothing; the
        neutral index is the option whose every effect is zero; an answer
        whose key the seat lost is refused; a key with no words prints raw;
        bind refuses each registry breakage.
     12) LEGAL. Every pack the kit knows plus the FX packs, against the real
        names of simGmInbox's eight roster files and Club Manager's five
        baked rosters: no quote mark, no first person in a wording, every
        voice a role, no real name anywhere, a brace only as a declared slot
        in a wording, no person slot in quote marks or by a speech verb, no
        wording that prints an effect (built in or registered), and every
        card whose words read as conduct or a private life tagged, but for
        LEGAL_BASELINE (the GM cards flagged today, each with its word).
        Then FX_CONDUCT on 100 ten season desks whose squads are about half
        real, answering late across season turns: every tagged card dealt
        and every answer the engine takes lands on generated men only, an
        answer it refuses would have landed on a real man (or nobody) and
        moves nothing, no tagged card sits open after a week about a real
        man, tagged cards were held for real men, answers were refused and
        cards settled for that, and no dealt text keeps a brace.
     13) COMPACT. Every index pack (INDEX_PACKS: every PACK_INDEXES line,
        never a list kept by hand) with store: 'compact' set in memory, plus
        FX_COMPACT (stories, a subject, one shots, wordings, slots, expiry)
        and its season clock twin, on the FLEET drive at seeds 1 to 3 (a
        rising clock), each desk three ways: whole, compact, and compact
        through gmDeskSave, JSON and gmDeskLoad between every two weeks.
        Compact deals, answers and moves exactly as whole (a hash over ids,
        texts, the inbox, answer lines and meters a week; never the book,
        which differs by design); the codec run equals the compact one to
        the byte (all four fields, text included); every week the book
        holds exactly the entries still cooling, the one shots never pass
        the pack's one shot keys, never more than eight kept. Then a size
        report (FX_BIG, 420 cards, Club Manager's rhythm, 20 desks of 15
        seasons: the compact block's mean bytes and the whole desk's) and
        the loader's three cases.
     14) FROZEN WORDS. scripts/data/eventDeckWords.json, for every pack whose
        source declares store: 'compact' (FX_COMPACT and every index pack
        that declares it, read off INDEX_PACKS): no recorded card gone, no wording changed or moved,
        a new wording only at the end, no option added, removed, reordered
        or relabelled, no story added or taken away, no card without a row,
        and (Round 1332's review fix) no change to a card's voice, emoji or
        beat or to an option's reply or effects, which a rebuilt message
        takes from the pack too.
        SIM_EVENT_DECK_WORDS=append adds rows and trailing wordings, never
        rewrites one (a changed row is the lead's call, like the replay).

     15) ECONOMY. For every index pack (INDEX_PACKS) and the FX packs, and
        every meter each moves (trust, fans,
        cash, morale, recruit, every registered key), BEST and WORST answer
        policies on the FLEET drive: the chosen options' values on that
        meter summed per season, unclamped, a mean over 1,000 seasons. The
        seven GM packs are printed (ECONOMY_BASELINE, their measurements at
        the section); any other pack fails on a meter it moves with no
        `pressure` ceiling, or when BEST or WORST passes it either way.
        An index pack whose cards move fx keys needs a PACK_BINDS entry (its
        registry over the kit's desk), or sections 13 and 15 fail on it.
     16) BYTES AND LAZY. Bytes per event (each pack module minified alone
        and gzipped, the engine too) with the projection for 420 and 690
        events, a report (BYTES_MEASURED at the section); and the fence:
        nothing in src imports the engine, a pack index or GmInboxPanel
        eagerly but the deck's own files and tests (type imports and dynamic
        imports pass; LAZY_IMPORTERS takes W2's and W3's lazy entries).

   SIM_EVENT_DECK_SECTIONS=11,12 runs only the sections named (section 1
   also runs when 2 or 3 does); the green line then names them.

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
     weightkeep the weighted draw leaves the card it picked in the draw, so a
                two a week pack can deal one card twice; section 3 fails.
     story      the book key ignores the story; section 4 fails.
     rest       the subject rest test always passes; section 5 fails.
     failopen   a card about a fact with no value is no longer held; section
                5 fails.
     restfall   the rest book keeps an entry from the future when the clock
                falls; section 5 fails.
     expirefall an open card's arrival week is not rebased when the clock
                falls; section 7 fails.
     textrng    the wording drawn from the deck's rng; section 6 fails (and 1
                would, if a recorded pack had wordings).
     seasonweek the season pack uses the week comparison; section 9 fails.
     expireoff  the engine never settles an open card; section 7 fails.
     expirefx   the engine settles on option 0 through the answer flow;
                section 7 fails.
     settledoff the engine settles but never names the card in the settled
                list a seat hands in; section 7 fails.
     panelexpiry one GM card is given an expiry in the panel fence's own
                copy (a data change in the kit) AND, since Round 1332 made
                GmInboxPanel call gmExpiredLine, that call is stripped from
                the fence's copy of the component's code (in memory); section
                7 fails.
     neutral    FX_NEUTRAL's one neutral option on its first card is given
                trust 1 (a data change in the kit, not the engine); section
                8 fails.
     heavy      the NFL's top card loses its cooldown and weighs 50 (in
                memory); section 10 fails. The brief's weight alone changed
                nothing (see section 10).
     fxsilent   choiceEffects prints no registered key; section 11 fails.
     fxdrop     answerGmInbox applies no registered key; section 11 fails.
     fxunbound  gmPackProblems no longer flags an unregistered key; section
                11 fails.
     fxneutral  gmNeutralIndex ignores fx, so an option that moves only a
                registered key reads as neutral (and an expiring card could
                be settled on it); section 11 fails.
     conductreal the tag branch of gmCardSafe always passes; section 12
                fails (a tagged card dealt about a real man).
     slotopen   a slot with no value no longer holds its card; section 12
                fails (a dealt text keeps a brace).
     quoteslot  FX_CONDUCT gains a wording with its person slot before a
                speech verb (in memory); section 12 fails.
     untagged   FX_CONDUCT's curfew card loses its tag (in memory); section
                12 fails.
     rosterword a real roster name goes into an FX_CONDUCT text (in
                memory); section 12 fails.
     pruneearly the prune drops an entry one tick before it cools; section
                13 fails (the book no longer holds every entry still
                cooling).
     codecword  the codec drops the wording index; section 13 fails.
     codecslot  the codec drops the slot values; section 13 fails.
     wordedit   FX_COMPACT's k_words gets an edited first wording (in
                memory); section 14 fails.
     wordorder  k_words's two wordings swap places (in memory); section 14
                fails.
     storymove  k_plain joins a story (in memory); section 14 fails.
     pressure   FX_COMPACT's moves times ten (in memory); section 15 fails.
     eager      src/pages/FrontOffice.tsx read with one static import of
                '@/lib/gmInbox' added (in memory); section 16 fails.
     Round 1332's review fixes (a tagged card asked again after its deal):
     conductlate   answerGmInbox no longer asks a tagged card's roles again,
                   so an answer after the season turn lands on a real man;
                   section 12 fails.
     conductstale  step 2b never settles an open tagged card whose role
                   passed to a real man; section 12 fails (it sits open).
     conducttarget the men an option moves are left out of the tag check, at
                   the deal and the answer (c_skip moves the captain, not the
                   striker it is about); section 12 fails.
     nullpass      a role that resolves to nobody passes the tag check;
                   section 12 fails.
     newpack       one more index pack in INDEX_PACKS (in memory, as a later
                   round's index line would add): compact, its words never
                   recorded, no pressure ceiling; sections 14 and 15 fail
                   (13 deals it whole against compact and stays green).
     speechpast    FX_CONDUCT gains a wording with its person slot's
                   possessive before a past tense speech verb (in memory);
                   section 12 fails (the brief's verb list alone missed it).
     voiceedit     FX_COMPACT's k_plain speaks in another voice (in memory);
                   section 14 fails.
     effectedit    k_plain's second option moves trust by one more (in
                   memory); section 14 fails.

   Runtime about 85 to 100 s on a runner, three requests at a time (section 2
   reloads all 84 rows since the review's fix pass; it was 40 s with seed 1
   alone), so SIM_EVENT_DECK_SHARD is not needed yet; SIM_EVENT_DECK_MEASURE=1 adds the
   seeds 1 to 10 measurements (about a minute more).
   Round 1332: the whole kit takes 206 to 263 s on a runner now (section 13
   alone about 70 to 110 s), over the 150 s an agent's command may take. Run
   it as three gate lines, measured on runners 2026-10-13 (rc r1332-g and
   r1332-h): SIM_EVENT_DECK_SECTIONS=1,2,3,4,5,6,7,8,9,10,11,12 (101 s),
   SIM_EVENT_DECK_SECTIONS=13 (71 s) and SIM_EVENT_DECK_SECTIONS=14,15,16
   (29 s). Section 15's measurement (SIM_EVENT_DECK_MEASURE=1) takes about
   six minutes more.

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
/* Round 1332: SIM_EVENT_DECK_SECTIONS=11,12 runs only those sections (1 runs
   too when 2 or 3 does, which read its rows), so the gate can split the kit
   in two lines. Absent: every section. */
const SECTIONS = (process.env.SIM_EVENT_DECK_SECTIONS || '').split(',').filter(Boolean).map(Number);
const runs = n => SECTIONS.length === 0 || SECTIONS.includes(n) || (n === 1 && (SECTIONS.includes(2) || SECTIONS.includes(3)));
const REPLAY_FILE = path.join(ROOT, 'scripts/data/gmInboxReplay.json');
const CONTROLS = ['replay', 'weightoff', 'weightkeep', 'story', 'rest', 'failopen', 'restfall', 'expirefall', 'textrng', 'seasonweek', 'expireoff', 'expirefx', 'settledoff', 'panelexpiry', 'neutral', 'heavy',
  'fxsilent', 'fxdrop', 'fxunbound', 'fxneutral', 'conductreal', 'slotopen', 'quoteslot', 'untagged', 'rosterword',
  'pruneearly', 'codecword', 'codecslot', 'wordedit', 'wordorder', 'storymove', 'pressure', 'eager',
  'conductlate', 'conductstale', 'conducttarget', 'nullpass', 'newpack', 'speechpast', 'voiceedit', 'effectedit'];
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

/* The pack indexes, one line each, append only: W2 and W3 add theirs (and a
   PACK_BINDS entry when their cards move fx keys). */
const PACK_INDEXES = [
  ['src/data/gmInbox/index.ts', 'GM_INBOX_PACKS', 'src/components/front-office-shared/GmInboxPanel.tsx'],
  /* Round 1334 (W2): Soccer Career's starter pack. */
  ['src/data/soccerDeck/index.ts', 'SOCCER_DECK_PACKS', 'src/pages/SoccerCareer.tsx'],
];
/* The third field is the component that shows that index's cards: section 7
   refuses an expiring card in an index whose component never calls
   gmExpiredLine (it would show the staff's answer as the manager's). */
const ENGINE_REL = 'src/lib/gmInbox.ts';
/* The controls that swap one line of the engine: the line, and what it becomes. */
const ENGINE_CONTROLS = {
  replay: ['const e = came.splice(Math.floor(rng() * came.length), 1)[0];',
    'rng(); const e = came.splice(Math.floor(rng() * came.length), 1)[0]; /* replay control */'],
  weightoff: ['const wt = (e: GmEventDef): number => e.weight ?? 1;', 'const wt = (e: GmEventDef): number => 1; /* weightoff control */'],
  weightkeep: ['return came.splice(i, 1)[0];', 'return came[i]; /* weightkeep control */'],
  story: ['const bookKey = (e: GmEventDef): string => ledgerKey(e);', 'const bookKey = (e: GmEventDef): string => e.id; /* story control */'],
  rest: ['if (r !== undefined && clock - r < restFor) return false;', '/* rest control */'],
  failopen: ['if (sk === null) return false;', '/* failopen control */'],
  restfall: ['if (clock - Math.min(at, clock) < restFor) rest[k] = Math.min(at, clock);', 'if (clock - at < restFor) rest[k] = at; /* restfall control */'],
  expirefall: ['const w = Math.min(m.w, clock);', 'const w = m.w; /* expirefall control */'],
  textrng: ["const pick = alt > 0 ? Math.floor(keyedRng(`${seat.keyOf?.(s) ?? ''}|${e.id}|${year}|${clock}`)() * (1 + alt)) : 0;",
    'const pick = alt > 0 ? Math.floor(rng() * (1 + alt)) : 0; /* textrng control */'],
  seasonweek: ["if (pack.clock === 'season') return !onCooldown(last, e, clock, pack.cooldown);", '/* seasonweek control */'],
  expireoff: ['if (ttl !== undefined && clock - w >= ttl && n >= 0) inbox[i] = { ...m, w, answered: n, auto: true };',
    'if (false) inbox[i] = m; /* expireoff control */'],
  expirefx: ['if (ttl !== undefined && clock - w >= ttl && n >= 0) inbox[i] = { ...m, w, answered: n, auto: true };',
    'if (ttl !== undefined && clock - w >= ttl) { answerInboxMessage(s, m.id, 0, seat); inbox[i] = { ...m, w, answered: 0, auto: true }; } /* expirefx control */'],
  settledoff: ['if (inbox[i].auto && !m.auto) settled?.push(inbox[i]);', '/* settledoff control */'],
  /* Round 1332's, appended. */
  fxsilent: ['    out.push(`${man}${def.label} ${amount}`);', '    /* fxsilent control */'],
  fxdrop: ['    if (v) reg[k].apply(s, v, who);', '    /* fxdrop control */'],
  fxunbound: ['if (!def) { out.push(`${e.id}: "${c.label}" moves ${k}, which the seat has not registered`); continue; }', 'if (!def) continue; /* fxunbound control */'],
  fxneutral: ['    && !gmFxMoves(c));', '    ); /* fxneutral control */'],
  conductreal: ['  return allGenerated(s, seat, people);', '  return true; /* conductreal control */'],
  slotopen: ['    if (!sl || !named(v)) return false;', '    if (!sl) return false; /* slotopen control */'],
  pruneearly: ['    if (sharing.every(e => (pack.clock === \'season\' ? !onCooldown(last, e, clock, pack.cooldown) : clock - at >= (e.cooldown ?? pack.cooldown)))) delete last[k];',
    '    if (sharing.every(e => (pack.clock === \'season\' ? !onCooldown(last, e, clock + 1, pack.cooldown) : clock + 1 - at >= (e.cooldown ?? pack.cooldown)))) delete last[k]; /* pruneearly control */'],
  codecword: ['  if (g.t) out.t = g.t;', '  /* codecword control */'],
  codecslot: ['  if (g.sv) out.s = g.sv;', '  /* codecslot control */'],
  /* Round 1332's review fixes, appended. */
  conductlate: ['  if (def?.tag !== undefined && !gmTagStillSafe(def, msg.choices as GmChoiceDef[], s, seat)) return null;', '  /* conductlate control */'],
  conductstale: ['      if (e && n >= 0 && !gmTagStillSafe(e, m.choices, s, seat)) { inbox[i] = { ...m, answered: n, auto: true }; settled?.push(inbox[i]); }', '      /* conductstale control */'],
  conducttarget: ['  for (const c of choices) refs.push(...choiceRoles(c));', '  /* conducttarget control */'],
  nullpass: ['  refs.every(ref => seat.person?.(s, ref)?.real === false);', '  refs.every(ref => seat.person?.(s, ref)?.real !== true); /* nullpass control */'],
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
  `export { onCooldown } from '${R}/src/lib/careerEventDeck.ts';`,
  ...PACK_INDEXES.map(([rel, name], i) => `export { ${name} as packs${i} } from '${R}/${rel}';`),
  /* Round 1334: the soccer words come from their data module, never from src/lib/soccerDeck.ts, which reaches the
     whole Soccer Career engine at runtime and would bundle it into this kit. */
  `export { SOCCER_FX_WORDS as soccerFxWords } from '${R}/src/data/soccerDeck/words.ts';`,
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
if (runs(1)) {
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
/* Round 1332's review fix: every pack a shipped index holds (every
   PACK_INDEXES line, the GM index first). Sections 12 to 15 read this, never
   a list kept by hand, so the next round's pack is gated the moment its
   index line lands: section 13 compares it whole against compact, section
   14 freezes its words when it declares store: 'compact', section 15 holds
   it to its own pressure ceiling. The newpack control adds one pack here in
   memory, as a later round's index would, with no words recorded and no
   ceiling declared. */
const INDEX_PACKS = { ...ALL_PACKS };
if (CONTROL === 'newpack') {
  if (INDEX_PACKS.fx_unlisted) { console.error('newpack control: an index already holds fx_unlisted, refusing to run'); process.exit(2); }
  INDEX_PACKS.fx_unlisted = fxPack('fx_unlisted', [fxCard('u_one', { cooldown: 2 }), fxCard('u_two', { cooldown: 3 })], { store: 'compact', chance: 0.5 });
}
/* What the kit binds an index pack with beyond its own desk, append only:
   W2 and W3 add an entry beside their PACK_INDEXES line when their cards
   move fx keys (the registry, written over the kit's desk) or need their
   own person resolver. A pack with fx keys and no entry fails sections 13
   and 15, which could not bind it; a pack with a tag or a person slot and
   no entry is bound with a resolver that makes everyone generated. */
const PACK_BINDS = {};
/* Round 1334 (W2): Soccer Career's keys (integrity and the training keys) over the kit's desk, each a number in a bag
   made on the desk at its first write, with the soccer words. */
PACK_BINDS.soccer = { fx: Object.fromEntries(Object.entries(B.soccerFxWords).map(([k, w]) => [k, { ...w,
  apply: (s, v) => { s.soccer = { ...(s.soccer ?? {}), [k]: ((s.soccer ?? {})[k] ?? 0) + v }; }, read: s => (s.soccer ?? {})[k] ?? 0 }])) };
const needsFx = p => p.events.some(e => e.choices.some(c => Object.keys(c.fx ?? {}).length > 0));
const aboutPeople = p => p.events.some(e => e.tag !== undefined) || Object.values(p.slots ?? {}).some(sl => sl.person);
const everyoneGenerated = (s, ref) => ('role' in ref ? { name: `Your ${ref.role}`, real: false } : { name: `Player ${Math.round(Number(ref.id))}`, real: false });
/** The binding extras for an index pack, or null when the kit cannot bind it. */
const indexBind = (k, p) => PACK_BINDS[k] ?? (needsFx(p) ? null : aboutPeople(p) ? { person: everyoneGenerated } : {});
/** One fixture desk over `ticks` weeks: facts(clock, rng) hands in the
 *  facts, answer 'all' answers every open message on its first option,
 *  clockOf(tick) is the clock the desk hands in (the tick itself, or a
 *  clock that falls, the week of a season). */
function fxRun(pack, key, ticks, { facts = () => ({}), answer = 'all', bind = {}, clockOf = t => t } = {}) {
  const rawDeck = keyedRng(`simEventDeck|fx|${key}|deck`);
  const factRng = keyedRng(`simEventDeck|fx|${key}|facts`);
  let calls = 0;
  const rng = () => { calls++; return rawDeck(); };
  const s = newDesk();
  const bound = E.bindGmInbox(pack, { ...BINDING, ...bind });
  const log = [];
  for (let t = 0; t < ticks; t++) {
    const clock = clockOf(t);
    const f = facts(clock, factRng);
    const got = E.gmInboxWeek(s, bound, 'a', f, clock, rng);
    log.push({ t, clock, got, facts: f, rest: s.gmInboxRest ? { ...s.gmInboxRest } : undefined });
    if (answer === 'all') for (const m of openOf(s)) E.answerGmInbox(s, m.id, 0, bound);
  }
  return { s, log, calls: () => calls };
}

/* ═══ 2. SAME SEED, SAME DECK, and a reload between weeks changes nothing ═══ */

console.log('2) Same seed, same deck; a JSON round trip and repairGmInbox between every two weeks change nothing');
let gmStates = 0;
let gmGrew = 0;
if (runs(2)) {
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
  for (const seat of seats) for (const seed of SEEDS) for (const kind of KINDS) {
    const r = runRow(GM[seat], seat, seed, kind, { between });
    if (r.hash !== ROWS[`${seat}|${seed}|${kind}`].hash) moved.push(`${seat}|${seed}|${kind}`);
  }
  if (gmStates < 1000) fail(2, `only ${gmStates} desk states reloaded: nothing was tested`);
  if (bent) fail(2, `${bent} of ${gmStates} base states did not repair to themselves`);
  else ok(`all ${gmStates} desk states of seeds ${SEEDS.join(', ')} repaired to themselves`);
  if (moved.length) fail(2, `reloading between weeks moved ${moved.length} rows: ${moved.slice(0, 4).join(', ')}`);
  else ok(`${seats.length * SEEDS.length * KINDS.length} rows (every row of section 1) dealt byte equal with a reload between every two weeks`);
  if (gmGrew) fail(2, `${gmGrew} GM desk states gained a field a GM pack never writes (gmInboxRest, w or auto)`);
}

/* ═══ 3. WEIGHTS: equal weights are the uniform pick, and a weight is a share ═══ */

console.log('3) Weights: equal weights deal the recording, and a weight is a share of the draw, never a rank');
const REC = fs.existsSync(REPLAY_FILE) ? JSON.parse(fs.readFileSync(REPLAY_FILE, 'utf8')) : { rows: {} };
if (runs(3)) {
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
  /* Two a week from three weights (1, 3 and 2), every card up every week:
     the picked card leaves the draw, so no week deals one card twice and
     every week deals two. Drawn without replacement the shares of the deals
     are 0.208, 0.425 and 0.367 (printed, not gated). The weightkeep control
     leaves the picked card in the draw. */
  const FX_WEIGHT2 = fxPack('fx_weight2', [fxCard('w1', { weight: 1 }), fxCard('w3', { weight: 3 }), fxCard('w2', { weight: 2 })], { perWeek: 2 });
  const two = fxRun(FX_WEIGHT2, `weight2|${SEED}`, 5000).log;
  const twice = two.filter(l => new Set(l.got.map(m => m.defId)).size !== l.got.length).length;
  const notTwo = two.filter(l => l.got.length !== 2).length;
  const dealt2 = two.flatMap(l => l.got);
  const share2 = id => (dealt2.filter(m => m.defId === id).length / Math.max(1, dealt2.length)).toFixed(3);
  const line2 = `FX_WEIGHT two a week (weights 1, 3 and 2) over ${two.length} weeks: ${twice} weeks dealt one card twice, ${notTwo} weeks dealt other than two; shares ${share2('w1')}, ${share2('w3')}, ${share2('w2')}`;
  if (twice > 0 || notTwo > 0) fail(3, line2); else ok(line2);
}

/* ═══ 4. STORY: cards of one story share one stamp and one one shot ═══ */

console.log('4) Story: never two of one story inside its cooldown or in one week, a one shot story once');
if (runs(4)) {
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
if (runs(5)) {
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
  /* With subjectRest 0 and every fact there, the subjects are inert: the same
     deal as no subjects. A fact subject with no value still holds its card
     at any rest (fail closed), stated just below on weeks without the fact. */
  const zero = fxRun({ ...FX_SUBJECT, subjectRest: 0 }, `subject|${SEED}|zero`, 400, { facts });
  const none = fxRun({ ...FX_SUBJECT, subjectRest: 0, events: FX_SUBJECT.events.map(({ subject, ...e }) => e) }, `subject|${SEED}|zero`, 400, { facts });
  const ids = r => r.log.map(w => w.got.map(m => m.id).join(',')).join('|');
  if (ids(zero) !== ids(none) || zero.calls() !== none.calls()) fail(5, 'subjectRest 0 dealt differently from the same pack without subjects');
  else if ('gmInboxRest' in zero.s) fail(5, 'a pack with subjectRest 0 wrote a rest book');
  else ok(`subjectRest 0 deals exactly as no subjects (${zero.log.reduce((n, w) => n + w.got.length, 0)} deals, ${zero.calls()} draws) and writes no book`);
  const gappy = (clock, rng) => (rng() < 0.25 ? {} : facts(clock, rng));
  const factCards = new Set(FX_SUBJECT.events.filter(e => e.subject && typeof e.subject !== 'string').map(e => e.id));
  const onGap = r => r.log.filter(w => !('man' in w.facts) && w.got.some(m => factCards.has(m.defId))).length;
  const zeroGap = onGap(fxRun({ ...FX_SUBJECT, subjectRest: 0 }, `subject|${SEED}|gap`, 400, { facts: gappy }));
  const noneGap = onGap(fxRun({ ...FX_SUBJECT, subjectRest: 0, events: FX_SUBJECT.events.map(({ subject, ...e }) => e) }, `subject|${SEED}|gap`, 400, { facts: gappy }));
  if (zeroGap > 0) fail(5, `at subjectRest 0 a card about a missing fact was dealt on ${zeroGap} weeks: it must be held (fail closed)`);
  else if (noneGap === 0) fail(5, 'without subjects no fact card was dealt on a week without the fact: the comparison tested nothing');
  else ok(`at subjectRest 0 a card about a missing fact is still held (fail closed): dealt on no week without the fact, where the same pack without subjects dealt one on ${noneGap}`);
  if (gmStates > 0 && gmGrew === 0) ok(`no GM desk gained gmInboxRest over section 2's ${gmStates} states`);
  /* On a clock that falls (a seat handing in the week of its season) the rest
     book is rebased like the cooldown book: an entry from the future reads
     as dealt now, so the man rests one more rest after the fall and comes
     back, never a whole season. Both proofs are exact. The restfall control
     keeps the entry from the future. */
  const SPAN = 20;
  const fallClock = t => t % SPAN;
  const fallBad = [];
  let fallDealt = 0;
  for (let d = 0; d < 50; d++) {
    const { log } = fxRun(FX_SUBJECT, `subject|${SEED}|fall|${d}`, 400, { facts, clockOf: fallClock });
    const at = {};
    for (const w of log) {
      const seen = new Set();
      for (const m of w.got) {
        const k = keyOf(m, w.facts);
        if (!k) continue;
        fallDealt++;
        if (seen.has(k)) fallBad.push(`desk ${d} tick ${w.t}: two cards about ${k}`);
        seen.add(k);
        if (at[k] !== undefined && w.t - at[k] < REST) fallBad.push(`desk ${d}: ${k} again after ${w.t - at[k]} ticks, rest ${REST}`);
        at[k] = w.t;
      }
      for (const [k, t] of Object.entries(w.rest ?? {})) {
        if (t > w.clock) fallBad.push(`desk ${d} tick ${w.t}: ${k} sits in the book at ${t}, ahead of the clock ${w.clock}`);
        else if (w.clock - t >= REST) fallBad.push(`desk ${d} tick ${w.t}: ${k} still in the book after its rest`);
      }
    }
  }
  for (const b of fallBad.slice(0, 6)) console.error(`     ${b}`);
  if (fallDealt < 1000) fail(5, `only ${fallDealt} subject cards dealt on a falling clock: nothing was tested`);
  if (fallBad.length) fail(5, `${fallBad.length} subject rest breaks on a clock that falls every ${SPAN} weeks`);
  else ok(`on a clock that falls every ${SPAN} weeks: ${fallDealt} subject cards over 50 desks, none inside its rest, the book never ahead of the clock or past a rest`);
  /* One card about the captain, chance 1, every week answered: dealt at
     weeks 0, 6, 12 and 18 of the first season, then the fall rebases week
     18 to week 0, so 6, 12 and 18 of every later season. */
  const FX_ALONE = fxPack('fx_alone', [fxCard('solo', { subject: 'captain' })], { subjectRest: REST });
  const alone = fxRun(FX_ALONE, `subject|${SEED}|alone`, SPAN * 10, { clockOf: fallClock }).log.filter(w => w.got.length).map(w => w.t);
  const wantAlone = [0, ...Array.from({ length: 10 }, (_, sn) => [6, 12, 18].map(c => sn * SPAN + c)).flat()];
  const lineAlone = `one card about the captain on that clock: ${alone.length} deals over ten seasons, ${wantAlone.length} expected (ticks ${alone.slice(0, 7).join(', ')} and on)`;
  if (alone.join() !== wantAlone.join()) fail(5, lineAlone); else ok(lineAlone);
}

/* ═══ 6. TEXTS: wordings move no deal, and a key reads the same words ═══ */

console.log('6) Texts: wordings move no deal and no draw, every wording comes up at its share, a key reads the same words');
if (runs(6)) {
  /* The variant counts this section was measured on: 2 and 4 wordings. */
  const FX_TEXTS = fxPack('fx_texts', [
    fxCard('pair', { texts: ['The pair matter is back on the desk.'] }),
    fxCard('quad', { texts: ['Word on the quad matter has come round again.', 'The quad matter needs an answer.', 'The quad matter is on the agenda once more.'] }),
    fxCard('plain'),
  ], { chance: 0.5, cooldown: 2 });
  const PLAIN = { ...FX_TEXTS, events: FX_TEXTS.events.map(({ texts, ...e }) => e) };
  const TICKS = 20000;
  const go = (pack, seed, key) => fxRun(pack, `texts|${seed}`, TICKS, { bind: { keyOf: () => key } });
  const ids = r => r.log.map(w => w.got.map(m => m.id).join(',')).join('|');
  const words = r => r.log.map(w => w.got.map(m => m.text).join(',')).join('|');
  const ratios = r => {
    const out = [];
    for (const e of FX_TEXTS.events.filter(x => x.texts)) {
      const all = [e.text, ...e.texts];
      const got = r.log.flatMap(w => w.got).filter(m => m.defId === e.id);
      for (const t of all) out.push({ id: e.id, t, ratio: got.filter(m => m.text === t).length / got.length * all.length, n: got.length });
    }
    return out;
  };
  const a = go(FX_TEXTS, SEED, 'save-A');
  const plain = go(PLAIN, SEED, 'save-A');
  if (ids(a) !== ids(plain) || a.calls() !== plain.calls()) fail(6, 'adding wordings moved the deal or the deck draws');
  else ok(`with and without wordings: the same ${a.log.reduce((n, w) => n + w.got.length, 0)} deals and ${a.calls()} deck draws`);
  if (words(go(FX_TEXTS, SEED, 'save-A')) !== words(a)) fail(6, 'the same key, card, year and clock read different words');
  const b = go(FX_TEXTS, SEED, 'save-B');
  const differ = a.log.filter((w, i) => w.got.map(m => m.text).join() !== b.log[i].got.map(m => m.text).join()).length;
  if (ids(a) !== ids(b)) fail(6, 'another save key moved the deal');
  else if (differ === 0) fail(6, 'two save keys read the same words every week: the key is not reaching the wording');
  else ok(`the same key reads the same words; another key reads other words on ${differ} weeks with the same deal`);
  /* Each wording's share over its card's deals, as a ratio to the even share
     (1 is exactly even). Measured 2026-10-13 at seeds 1 to 10 over all six
     wordings: 0.915 to 1.053 (about 5,000 deals a card a seed). The band is
     that range widened by about two standard deviations of the four wording
     card (0.024) a side. */
  const RATIO = [0.865, 1.1];
  const rs = ratios(a);
  const off = rs.filter(r => r.ratio < RATIO[0] || r.ratio > RATIO[1] || r.ratio === 0);
  for (const r of off) console.error(`     ${r.id} "${r.t.slice(0, 40)}": ${r.ratio.toFixed(3)} of an even share over ${r.n} deals`);
  if (rs.length !== 6) fail(6, `expected 6 wordings to measure, found ${rs.length}`);
  if (off.length) fail(6, `${off.length} wordings outside ${RATIO[0]} to ${RATIO[1]} of an even share`);
  else ok(`every one of the ${rs.length} wordings came up, each at ${Math.min(...rs.map(r => r.ratio)).toFixed(3)} to ${Math.max(...rs.map(r => r.ratio)).toFixed(3)} of an even share (band ${RATIO[0]} to ${RATIO[1]})`);
  if (MEASURE) {
    const all = TEN.flatMap(sd => ratios(go(FX_TEXTS, sd, 'save-A')).map(r => r.ratio));
    console.log(`   measure: wording ratios at seeds 1 to 10: ${Math.min(...all).toFixed(3)} to ${Math.max(...all).toFixed(3)}`);
  }
  const withTexts = Object.entries(ALL_PACKS).filter(([, p]) => p.events.some(e => e.texts)).map(([k, p]) => `${k} (${p.events.filter(e => e.texts).map(e => e.texts.length + 1).join(', ')} wordings)`);
  console.log(`   packs the kit knows that use texts: ${withTexts.length ? withTexts.join('; ') : 'none yet'}`);
}

/* ═══ 7. EXPIRY: a card left open is settled, moving nothing ═══ */

console.log('7) Expiry: an open card is settled at exactly w plus expires on its neutral option, nothing moves, the deck never freezes');
const fxHard = (id, extra = {}) => fxCard(id, {
  choices: [{ label: 'Act on it', reply: 'Done.', karma: 2, morale: 1 }, { label: 'Leave it', reply: 'Left.', karma: 0 }], ...extra,
});
const FX_EXPIRE = fxPack('fx_expire', [
  fxHard('e2', { expires: 2 }), fxHard('e3', { expires: 3 }), fxHard('e4', { expires: 4 }), fxHard('e6', { expires: 6 }),
], { chance: 0.5, cooldown: 3 });
if (runs(7)) {
  const ttl = new Map(FX_EXPIRE.events.map(e => [e.id, e.expires]));
  const meters = s => JSON.stringify([s.morale, s.trust, s.fans, s.cash, s.recruit, s.out, s.rating]);
  const calm = meters(newDesk());
  const run = (pack, seed = SEED) => {
    const bad = [];
    let deals = 0;
    let settled = 0;
    let lastSeason = 0;
    let line = null;
    const seen = new Map();
    const observe = w => {
      if (w.season === 0 && w.week === 0) seen.clear();
      deals += w.got.length;
      if (w.season === SEASONS - 1) lastSeason += w.got.length;
      if (meters(w.s) !== calm) bad.push(`desk ${w.desk} week ${w.clock}: a meter moved on a desk that never answers`);
      for (const m of w.s.phoneInbox ?? []) {
        if (!m.auto || seen.has(m.id)) continue;
        seen.set(m.id, true);
        settled++;
        if (m.answered !== 1) bad.push(`${m.id}: settled on option ${m.answered}, the neutral one is 1`);
        if (w.clock !== m.w + ttl.get(m.defId)) bad.push(`${m.id}: settled at week ${w.clock}, it arrived at ${m.w} and expires after ${ttl.get(m.defId)}`);
        line = line ?? E.gmExpiredLine(m);
      }
    };
    for (let d = 0; d < DRIVES.SILENT.desks; d++) runDesk(pack, 'fx_expire', seed, 'SILENT', d, { observe });
    return { bad, deals, settled, lastSeason, line };
  };
  const r = run(FX_EXPIRE);
  const STILL = { ...FX_EXPIRE, events: FX_EXPIRE.events.map(({ expires, ...e }) => e) };
  const still = run(STILL);
  for (const b of r.bad.slice(0, 6)) console.error(`     ${b}`);
  if (r.settled < 500) fail(7, `only ${r.settled} cards settled: nothing was tested`);
  if (r.bad.length) fail(7, `${r.bad.length} expiry breaks on ${DRIVES.SILENT.desks} silent desks`);
  else ok(`${r.settled} cards settled on ${DRIVES.SILENT.desks} silent desks, each at exactly w plus expires on its neutral option, no meter moved`);
  const dash = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
  /* FX_EXPIRE's cards come from the assistant, so the line names the
     assistant once, never "Your assistant: your assistant". */
  const assistants = r.line ? r.line.toLowerCase().split('your assistant').length - 1 : 0;
  if (!r.line || !r.line.includes('(Leave it)') || assistants !== 1 || dash.some(d => r.line.includes(d))) fail(7, `the settled line reads "${r.line}"`);
  else ok(`the settled line: ${r.line}`);
  /* Measured 2026-10-13 at seeds 1 to 10: silent desks are dealt 44.75 to
     45.42 times as many cards with expiry as without (without it every desk
     freezes at three open). The floor of 30 sits well under that and far
     over the expireoff control. */
  const rise = r.deals / Math.max(1, still.deals);
  const lineRise = `silent desks were dealt ${r.deals} cards, ${rise.toFixed(1)} times the ${still.deals} of the same pack without expiry, ${r.lastSeason} in the tenth season`;
  if (rise < 30 || r.lastSeason === 0) fail(7, lineRise); else ok(lineRise);
  if (MEASURE) console.log(`   measure: expiry rise at seeds 1 to 10: ${TEN.map(sd => (run(FX_EXPIRE, sd).deals / run(STILL, sd).deals).toFixed(2)).join(', ')}`);
  /* On a clock that falls (the FALLEN drive's week of the season, answered
     never) a card's arrival week is rebased like the book: one that arrived
     in week c with expiry e settles e weeks later when that is still inside
     the season, otherwise e weeks into the next (the fall reads as its
     arrival). Exact, per card, counted in real weeks; a card the kept cap
     drops in the call that settles it counts as settled that week (only an
     answered card is ever dropped). The expirefall control keeps the
     arrival week from the future. */
  const span = E.gmSeasonWeeks(FX_EXPIRE).length;
  const fall = { bad: [], settled: 0, crossed: 0, lastSeason: 0 };
  let due = new Map();
  const observeFall = w => {
    if (w.season === 0 && w.week === 0) due = new Map();
    const t = w.season * span + w.week;
    const now = new Map((w.s.phoneInbox ?? []).map(m => [m.id, m]));
    for (const [id, a] of due) {
      const m = now.get(id);
      if (m && m.answered === undefined) {
        if (t >= a.at) fall.bad.push(`desk ${w.desk}: ${id} still open in real week ${t}, due in week ${a.at}`);
        continue;
      }
      due.delete(id);
      fall.settled++;
      if (a.crosses) fall.crossed++;
      if (t !== a.at) fall.bad.push(`desk ${w.desk}: ${id} settled in real week ${t}, due in week ${a.at}`);
      if (m && (m.answered !== 1 || m.auto !== true)) fall.bad.push(`desk ${w.desk}: ${id} settled on option ${m.answered}, auto ${m.auto}`);
    }
    if (meters(w.s) !== calm) fall.bad.push(`desk ${w.desk} week ${t}: a meter moved on a desk that never answers`);
    if (w.season === SEASONS - 1) fall.lastSeason += w.got.length;
    for (const m of w.got) {
      const e = ttl.get(m.defId);
      const crosses = w.clock + e >= span;
      due.set(m.id, { at: t + (crosses ? span - w.clock + e : e), crosses });
    }
  };
  for (let d = 0; d < DRIVES.SILENT.desks; d++) runDesk(FX_EXPIRE, 'fx_expire_fall', SEED, 'FALLEN', d, { observe: observeFall, policy: 'never' });
  for (const b of fall.bad.slice(0, 6)) console.error(`     ${b}`);
  if (fall.crossed < 100) fail(7, `only ${fall.crossed} cards settled across a fall: nothing was tested`);
  if (fall.bad.length) fail(7, `${fall.bad.length} expiry breaks on a clock that falls every ${span} weeks`);
  else ok(`on a clock that falls every ${span} weeks: ${fall.settled} cards settled on ${DRIVES.SILENT.desks} silent desks, each in exactly its due week, ${fall.crossed} of them across a fall, no meter moved`);
  if (fall.lastSeason === 0) fail(7, 'on a falling clock the deck froze: nothing dealt in the tenth season');
  /* What the seat is told (closing check finding 2). FX_TOLD mixes two
     expiring cards with four plain ones, and its desks answer every plain
     card after each week and never an expiring one, so a card that was open
     before a call stops being open in it only by expiry: the cards one call
     settles are exactly those open before it and not open after it (still
     there, settled, or settled and dropped by the kept cap in that same
     call, which only ever drops an answered card, and here often drops the
     one it just settled). The settled list handed to gmInboxWeek must name
     exactly those, in order, each auto on its neutral option. Measured
     2026-10-13 at seeds 1 to 10 (20 desks of ten seasons): 1,556 to 1,576
     cards settled, 292 to 346 of them dropped in the call that settled them
     (about one in five, which a seat reading only the desk would never
     show), so the floors of 500 and 100 say only that it was tested. The
     settledoff control stops the list. */
  const FX_TOLD = fxPack('fx_told', [
    fxHard('t4', { expires: 4 }), fxHard('t7', { expires: 7 }), fxCard('p1'), fxCard('p2'), fxCard('p3'), fxCard('p4'),
  ], { perWeek: 2, chance: 0.6, cooldown: 2 });
  const told = { settled: 0, dropped: 0, bad: [] };
  const toldSeat = E.bindGmInbox(FX_TOLD, BINDING);
  for (let d = 0; d < DRIVES.SILENT.desks; d++) {
    const rng = keyedRng(`simEventDeck|told|${SEED}|${d}`);
    const s = newDesk();
    for (let clock = 0; clock < SEASONS * span; clock++) {
      const before = openOf(s).map(m => m.id);
      const list = [];
      E.gmInboxWeek(s, toldSeat, 'a', {}, clock, rng, list);
      const after = new Map((s.phoneInbox ?? []).map(m => [m.id, m]));
      const want = before.filter(id => !after.has(id) || after.get(id).answered !== undefined);
      const got = list.map(m => m.id);
      if (got.join(',') !== want.join(',')) told.bad.push(`desk ${d} week ${clock}: settled ${want.join(',') || 'nothing'}, the list says ${got.join(',') || 'nothing'}`);
      for (const m of list) {
        if (m.auto !== true || m.answered !== 1) told.bad.push(`desk ${d} week ${clock}: ${m.id} listed with auto ${m.auto} on option ${m.answered}`);
        if (!after.has(m.id)) told.dropped++;
      }
      told.settled += list.length;
      for (const m of openOf(s)) if (!m.defId.startsWith('t')) E.answerGmInbox(s, m.id, 0, toldSeat);
    }
  }
  for (const b of told.bad.slice(0, 6)) console.error(`     ${b}`);
  const lineTold = `the settled list named ${told.settled} cards on ${DRIVES.SILENT.desks} desks, ${told.dropped} of them dropped by the kept cap in the call that settled them`;
  if (told.bad.length) fail(7, `${told.bad.length} weeks where the settled list and the desk disagree`);
  else if (told.settled < 500 || told.dropped < 100) fail(7, `${lineTold}: too few to have tested it`);
  else ok(lineTold);
  /* A card whose def lost its expiry stays open: the manager answers it. */
  const s = newDesk();
  E.gmInboxWeek(s, E.bindGmInbox(FX_EXPIRE, BINDING), 'a', {}, 0, () => 0);
  E.gmInboxWeek(s, E.bindGmInbox(STILL, BINDING), 'a', {}, 40, () => 0.99);
  if (s.phoneInbox.length !== 1 || s.phoneInbox[0].answered !== undefined) fail(7, 'a card whose def lost its expiry was settled anyway');
  else ok('a card whose def lost its expiry stays open for the manager');
  /* Who shows a settled card (closing check finding 1). The shared panel
     shows any answered card as the manager's own reply and says nothing
     new lands until he answers, which a card that expires makes false. This
     round may not touch a component, so the fence: an index whose packs hold
     an expiring card fails until its component calls gmExpiredLine (read in
     the code, comments stripped). No GM card expires today, so it holds;
     the panelexpiry control gives one GM card an expiry in this check's own
     copy, and the fence must fail. */
  const code = rel => readSrc(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  PACK_INDEXES.forEach(([rel, , shows], i) => {
    let packs = B[`packs${i}`];
    if (CONTROL === 'panelexpiry' && i === 0) {
      const [k0] = Object.keys(packs);
      packs = { ...packs, [k0]: { ...packs[k0], events: packs[k0].events.map((e, j) => (j === 0 ? { ...e, expires: 2 } : e)) } };
    }
    const expiring = Object.entries(packs).flatMap(([k, p]) => p.events.filter(e => e.expires !== undefined).map(e => `${k}/${e.id}`));
    if (CONTROL === 'panelexpiry' && i === 0 && expiring.length === 0) { console.error('panelexpiry control changed nothing, refusing to run'); process.exit(2); }
    if (!shows || !fs.existsSync(path.join(ROOT, shows))) { fail(7, `${rel} names no component that shows its cards`); return; }
    /* Round 1332: GmInboxPanel calls gmExpiredLine now, so the control also
       strips that call from this check's own copy of the code (in memory). */
    let shown = code(shows);
    if (CONTROL === 'panelexpiry' && i === 0) {
      if (!shown.includes('gmExpiredLine(')) { console.error(`panelexpiry control: ${shows} has no gmExpiredLine call to strip, refusing to run`); process.exit(2); }
      shown = shown.replaceAll('gmExpiredLine(', 'panelExpiryControl(');
    }
    const calls = shown.includes('gmExpiredLine(');
    if (expiring.length && !calls) fail(7, `${rel} holds ${expiring.length} expiring card${expiring.length === 1 ? '' : 's'} (${expiring.slice(0, 3).join(', ')}) and ${shows} never calls gmExpiredLine, so a settled card would read as the manager's reply`);
    else ok(`${rel}: ${expiring.length} expiring cards, ${shows} ${calls ? 'calls' : 'does not call'} gmExpiredLine${expiring.length ? '' : ' (it must before any of its cards expires)'}`);
  });
}

/* ═══ 8. NEUTRAL: every new pack has an option that moves nothing ═══ */

console.log('8) Neutral: every card of every pack off the baseline has an option that moves nothing, and every pack check holds');
/* The seven GM packs were written before the rule and NOT ONE of their 54
   cards has an option that moves nothing (their unit test asserts every
   option moves something), and giving them one would move the recording.
   A ratchet: a pack on this list may lack neutral options; any other pack
   fails on its first card without one; a listed pack whose every card has
   gained one fails until it leaves the list. */
const NEUTRAL_BASELINE = ['afl', 'college', 'gym', 'mlb', 'nba', 'nfl', 'nhl'];
const FX_NEUTRAL = fxPack('fx_neutral', [
  fxHard('n1'), fxHard('n2'), fxCard('n3'),
]);
if (runs(8)) {
  if (CONTROL === 'neutral') {
    const c = FX_NEUTRAL.events[0].choices[1];
    if (!c || c.karma !== 0 || E.gmNeutralIndex(FX_NEUTRAL.events[0].choices) !== 1) { console.error('neutral control: n1 has no neutral second option, refusing to run'); process.exit(2); }
    c.karma = 1;
  }
  const FIXTURES = { FX_EXPIRE, FX_NEUTRAL };
  const known = { ...ALL_PACKS, ...FIXTURES };
  const bad = [];
  for (const [k, p] of Object.entries(known)) {
    const lacking = p.events.filter(e => E.gmNeutralIndex(e.choices) < 0).map(e => e.id);
    if (NEUTRAL_BASELINE.includes(k)) { if (lacking.length === 0) bad.push(`${k} has a neutral option on every card now: take it off NEUTRAL_BASELINE`); }
    else if (lacking.length) bad.push(`${k}: ${lacking[0]} has no option that moves nothing`);
    for (const pr of E.gmPackProblems(p, PACK_BINDS[k]?.fx)) bad.push(`${k}: ${pr}`); /* Round 1334: an index pack's own registry */
  }
  const missing = NEUTRAL_BASELINE.filter(k => !known[k]);
  if (missing.length) bad.push(`NEUTRAL_BASELINE names packs the kit does not know: ${missing.join(', ')}`);
  for (const b of bad.slice(0, 8)) console.error(`     ${b}`);
  if (bad.length) fail(8, `${bad.length} neutral or pack problems`);
  else ok(`${Object.keys(known).length} packs: the ${NEUTRAL_BASELINE.length} on the baseline each still lack a neutral option somewhere, every other card has one, no pack has a problem`);
  const breaks = [
    ['a zero weight', fxPack('fx_break', [fxCard('b', { weight: 0 })]), /weight 0/],
    ['an expiring card with nothing neutral', fxPack('fx_break', [fxCard('b', { expires: 2, choices: [{ label: 'Act on it', reply: 'Done.', karma: 2 }] })]), /moves nothing/],
    ['an undeclared subject fact', fxPack('fx_break', [fxCard('b', { subject: { fact: 'nobody' } })]), /does not declare/],
  ];
  const held = breaks.filter(([, p, re]) => { try { E.bindGmInbox(p, BINDING); return false; } catch (err) { return re.test(String(err.message)); } });
  if (held.length !== breaks.length) fail(8, `bind refused only ${held.length} of ${breaks.length} broken packs`);
  else ok(`bind refuses ${breaks.map(b => b[0]).join(', ')}`);
}

/* ═══ 9. SEASON CLOCK: careerEventDeck's rule, and the week rule kept ═══ */

console.log('9) Season clock: a card is held out exactly as careerEventDeck holds it; the week clock is back after exactly N');
if (runs(9)) {
  const FX_SEASON = fxPack('fx_season', [
    fxCard('s0', { cooldown: 0 }), fxCard('s1', { cooldown: 1 }), fxCard('s3', { cooldown: 3 }), fxCard('sd'),
    fxCard('arcA', { story: 'arc', cooldown: 4 }), fxCard('arcB', { story: 'arc' }),
  ], { clock: 'season', cooldown: 2 });
  const rng = keyedRng(`simEventDeck|season|${SEED}`);
  const keys = ['s0', 's1', 's3', 'sd', 'story:arc'];
  let checks = 0;
  let held = 0;
  let apart = 0;
  let unlike = 0;
  for (let t = 0; t < 2000; t++) {
    const season = Math.floor(rng() * 20);
    const ledger = {};
    for (const k of keys) if (rng() < 0.7) ledger[k] = season - 8 + Math.floor(rng() * 10);
    const got = new Set(E.gmEligible(FX_SEASON, 'a', {}, [], ledger, season).map(e => e.id));
    for (const e of FX_SEASON.events) {
      const deck = B.onCooldown(ledger, e, season, FX_SEASON.cooldown);
      const at = ledger[e.story ? `story:${e.story}` : e.id];
      const literal = at !== undefined && season - at <= (e.cooldown ?? FX_SEASON.cooldown);
      checks++;
      if (deck) held++;
      if (got.has(e.id) === deck) apart++;
      if (deck !== literal) unlike++;
    }
  }
  if (held < checks / 10) fail(9, `only ${held} of ${checks} cards held out: the ledgers are too thin to test anything`);
  if (unlike) fail(9, `careerEventDeck's onCooldown disagreed with its own written rule ${unlike} times`);
  if (apart) fail(9, `the season deck and careerEventDeck disagreed on ${apart} of ${checks} cards`);
  else ok(`2,000 random ledgers and seasons: the season deck held out exactly what careerEventDeck holds out (${held} of ${checks} cards)`);
  const dealtAt = (pack, key, ticks) => fxRun(pack, key, ticks).log.filter(w => w.got.length).map(w => w.clock).join(',');
  const wrong = [];
  for (const N of [1, 2, 3, 5]) {
    const week = dealtAt(fxPack('fx_week', [fxCard('w', { cooldown: N })], { cooldown: N }), `week|${N}`, 3 * N + 1);
    if (week !== [0, N, 2 * N, 3 * N].join(',')) wrong.push(`week clock, cooldown ${N}: dealt at ${week}`);
    const seas = dealtAt(fxPack('fx_seasons', [fxCard('w', { cooldown: N })], { cooldown: N, clock: 'season' }), `seasons|${N}`, 3 * (N + 1) + 1);
    if (seas !== [0, N + 1, 2 * N + 2, 3 * N + 3].join(',')) wrong.push(`season clock, cooldown ${N}: dealt at ${seas}`);
  }
  if (wrong.length) fail(9, wrong.join('; '));
  else ok('a cooldown of N is back after exactly N weeks on the week clock and sits out exactly N seasons on the season clock');
}

/* ═══ 10. SHARE AND REACH over the FLEET drive ═══ */

console.log('10) Share and reach: every card of every pack reached over 1,000 seasons, no card above its pack\'s measured ceiling');
if (runs(10)) {
  const packs = { ...ALL_PACKS };
  /* The brief's form of this control (one NFL card at weight 50) changed
     nothing here, measured: every NFL card sits out a whole season (cooldown
     22, the season's 22 weeks) and the cards that share a beat almost never
     come up together, so a weight has nothing to win. The card is made to
     dominate the only way that pack allows: the top card loses its cooldown
     (and is made heavy too, for when a pack round adds rivals to its beat). */
  if (CONTROL === 'heavy') {
    const hits = packs.nfl?.events.filter(x => x.id === 'nfl_fan_night') ?? [];
    if (hits.length !== 1 || hits[0].cooldown !== undefined) { console.error('heavy control: nfl_fan_night is not there once with the pack cooldown, refusing to run'); process.exit(2); }
    packs.nfl = { ...packs.nfl, events: packs.nfl.events.map(x => (x === hits[0] ? { ...x, cooldown: 0, weight: 50 } : x)) };
  }
  const shares = (pack, tag, seed) => {
    const n = {};
    const byValue = {};
    let total = 0;
    const observe = w => {
      for (const m of w.got) {
        n[m.defId] = (n[m.defId] ?? 0) + 1;
        total++;
        if (pack.reachBy) (byValue[String(w.facts[pack.reachBy])] ??= new Set()).add(m.defId);
      }
    };
    for (let d = 0; d < DRIVES.FLEET.desks; d++) runDesk(pack, tag, seed, 'FLEET', d, { observe, bind: PACK_BINDS[tag] }); /* Round 1334: an index pack's own registry */
    const ranked = pack.events.map(e => ({ id: e.id, share: (n[e.id] ?? 0) / Math.max(1, total) })).sort((a, b) => b.share - a.share);
    return { n, total, ranked, byValue };
  };
  /* The ceiling a card's share of its pack's deals may not pass, each a mean
     over 1,000 seasons (100 desks of 10 seasons, the FLEET drive at SEED).
     Measured 2026-10-13 at seeds 1 to 10, the top card's share of each pack
     (always the same card), lowest to highest in percent: nfl 19.38 to
     20.39, nba 26.58 to 27.79, mlb 25.56 to 26.82, nhl 24.66 to 25.81,
     college 27.54 to 28.48, gym 33.60 to 34.71, afl 33.98 to 35.36. Each
     ceiling is that pack's highest plus 2 points, about five seed to seed
     standard deviations (about 0.4 points). A pack the kit knows with no
     ceiling here fails until a pack round measures and writes one. */
  const CEILING = { nfl: 0.224, nba: 0.298, mlb: 0.288, nhl: 0.278, college: 0.305, gym: 0.367, afl: 0.374 };
  const reach = [];
  for (const [k, p] of Object.entries(packs)) {
    const r = shares(p, k, SEED);
    const unreached = p.events.filter(e => !r.n[e.id]).map(e => e.id);
    const top = r.ranked[0];
    if (unreached.length) fail(10, `${k}: ${unreached.length} cards never dealt over 1,000 seasons (${unreached.slice(0, 3).join(', ')})`);
    if (CEILING[k] === undefined) fail(10, `${k} has no measured share ceiling: run SIM_EVENT_DECK_MEASURE=1 and write one in`);
    else if (top.share > CEILING[k]) fail(10, `${k}: ${top.id} took ${(top.share * 100).toFixed(1)}% of ${r.total} deals, ceiling ${(CEILING[k] * 100).toFixed(1)}%`);
    else ok(`${k}: all ${p.events.length} cards reached in ${r.total} deals, the top card ${top.id} at ${(top.share * 100).toFixed(1)}% (ceiling ${(CEILING[k] * 100).toFixed(1)}%)`);
    if (p.reachBy) reach.push(`${k} by ${p.reachBy}: ${Object.entries(r.byValue).slice(0, 8).map(([v, s]) => `${v} ${s.size}`).join(', ')}`);
    if (MEASURE) {
      const tops = TEN.map(sd => shares(p, k, sd).ranked[0]);
      console.log(`   measure: ${k} top card share at seeds 1 to 10: ${tops.map(t => `${t.id} ${(t.share * 100).toFixed(2)}`).join(', ')}`);
    }
  }
  /* Advice 22: reachable cards per value of a pack's reach fact (a keeper
     meets keeper work). A report here; W2's packs make it a gate. */
  console.log(`   reach by position: ${reach.length ? reach.join('; ') : 'no pack the kit knows names a reachBy fact yet'}`);
}

/* ═══ 11. REGISTRY: the words name exactly what the answer moves (Round 1332) ═══ */

console.log('11) Registry: every option prints exactly the keys it moves, by exactly the amounts, and bind refuses each breakage');
const signedK = v => (v > 0 ? `+${v}` : `${v}`);
/* A fixture registry over the fixture desk: a 0 to 100 board meter, a money
   key, a one man form meter and a suspension in weeks. */
const FX_REGISTRY_DEF = {
  board: { label: 'Board confidence', apply: (s, v) => { s.board = clamp100((s.board ?? 50) + v); }, read: s => s.board ?? 50 },
  fund: { label: 'Transfer kitty', fmt: 'money', apply: (s, v) => { s.fund = Math.round(((s.fund ?? 0) + v) * 1000) / 1000; }, read: s => s.fund ?? 0 },
  form: { label: 'form', who: true, apply: (s, v, who) => { s.form = { ...(s.form ?? {}), [who]: ((s.form ?? {})[who] ?? 0) + v }; }, read: (s, who) => (s.form ?? {})[who] ?? 0 },
  ban: { label: 'suspended', fmt: 'weeks', who: true, apply: (s, v, who) => { s.ban = { ...(s.ban ?? {}), [who]: ((s.ban ?? {})[who] ?? 0) + v }; }, read: (s, who) => (s.ban ?? {})[who] ?? 0 },
};
const fxCh = (label, extra = {}) => ({ label, reply: `${label}.`, karma: 0, ...extra });
const FX_REGISTRY = fxPack('fx_registry', [
  fxCard('r1', { choices: [fxCh('Back the plan', { karma: 2, fx: { board: 3 } }), fxCh('Hold off')] }),
  fxCard('r2', { choices: [fxCh('Sign the extension', { cash: -2, fx: { fund: -1.5 } }), fxCh('Wait', { fx: { board: 0 } })] }),
  fxCard('r3', { choices: [
    fxCh('Drop him', { morale: -1, fx: { form: { who: 'striker', v: -2 }, ban: { who: 'striker', v: 2 } } }),
    fxCh('Back him', { popularity: 1, fx: { form: { who: 'striker', v: 1 } } }), fxCh('Say nothing')] }),
  fxCard('r4', { choices: [
    fxCh('Rest him', { out: { who: 'keeper', weeks: 1 }, rating: { who: 'keeper', delta: 1 }, fx: { ban: { who: 'keeper', v: 1 } } }),
    fxCh('Play him', { fx: { form: { who: 'captain', v: 0 } } })] }),
  fxCard('r5', { choices: [fxCh('Fine him', { fx: { fund: 0.5 } }), fxCh('Let it go')] }),
  fxCard('r6', { choices: [fxCh('Make the recruiting call', { recruit: 2, fx: { board: -1 } }), fxCh('Skip it')] }),
], { pressure: { trust: 8, fans: 4, cash: 8, morale: 4, recruit: 8, board: 12, fund: 6, form: 8, ban: 12 } });
if (runs(11)) {
  const pack = FX_REGISTRY;
  const T = Object.keys(pack.targets);
  /* Everything a desk holds that an option could move, read the slow way. */
  const snap = s => {
    const o = { trust: s.trust, fans: s.fans, cash: s.cash, morale: s.morale, recruit: s.recruit };
    for (const w of T) { o[`out:${w}`] = s.out[w] ?? 0; o[`rating:${w}`] = s.rating[w] ?? 0; }
    for (const [k, d] of Object.entries(FX_REGISTRY_DEF)) {
      if (d.who) for (const w of T) o[`${k}:${w}`] = d.read(s, w); else o[k] = d.read(s);
    }
    return o;
  };
  const money = v => `${v > 0 ? '+' : '-'}${pack.money.prefix}${Math.abs(v)}${pack.money.suffix}`;
  const weeks = v => `${v} week${v === 1 ? '' : 's'}`;
  /* The words for what really moved, written here from the two snapshots,
     never from the option. */
  const movedWords = (a, b) => {
    const out = [];
    const d = k => Math.round((b[k] - a[k]) * 1000) / 1000;
    const m = pack.meters;
    if (d('trust')) out.push(`${m.trust} ${signedK(d('trust'))}`);
    if (d('fans')) out.push(`${m.fans} ${signedK(d('fans'))}`);
    if (d('cash')) out.push(`${m.money} ${money(d('cash'))}`);
    if (d('morale')) out.push(`${m.morale} ${signedK(d('morale'))}`);
    for (const w of T) if (d(`out:${w}`)) out.push(`${pack.targets[w]} out ${weeks(d(`out:${w}`))}`);
    for (const w of T) if (d(`rating:${w}`)) out.push(`${pack.targets[w]} rating ${signedK(d(`rating:${w}`))}`);
    if (d('recruit')) out.push(`Recruit interest ${signedK(d('recruit'))}`);
    for (const [k, def] of Object.entries(FX_REGISTRY_DEF)) {
      const fmt = v => (def.fmt === 'money' ? money(v) : def.fmt === 'weeks' ? weeks(v) : signedK(v));
      if (def.who) { for (const w of T) if (d(`${k}:${w}`)) out.push(`${pack.targets[w]} ${def.label} ${fmt(d(`${k}:${w}`))}`); }
      else if (d(k)) out.push(`${def.label} ${fmt(d(k))}`);
    }
    return out;
  };
  const seat = E.bindGmInbox(pack, { ...BINDING, fx: FX_REGISTRY_DEF });
  const bad = [];
  let answered = 0;
  for (const e of pack.events) {
    e.choices.forEach((c, i) => {
      const s = newDesk();
      s.phoneInbox = [{ id: 'm', defId: e.id, from: e.from, emoji: e.emoji, text: e.text, year: 2030, choices: e.choices, beat: e.beat }];
      const a = snap(s);
      const line = E.answerGmInbox(s, 'm', i, seat);
      const b = snap(s);
      const words = E.choiceEffects(c, pack, FX_REGISTRY_DEF);
      const moved = movedWords(a, b);
      answered++;
      if (line === null) { bad.push(`${e.id} option ${i}: the answer was refused`); return; }
      if ([...words].sort().join('|') !== [...moved].sort().join('|')) bad.push(`${e.id} "${c.label}": prints [${words.join(', ')}], moved [${moved.join(', ')}]`);
      const want = `📨 ${e.from}: ${c.label}.${words.length ? ` ${words.join(', ')}.` : ''}`;
      if (line !== want) bad.push(`${e.id} "${c.label}": the answer line reads "${line}"`);
      if (E.gmChoiceLabel(c, pack, FX_REGISTRY_DEF) !== (words.length ? `${c.label} · ${words.join(', ')}` : c.label)) bad.push(`${e.id} "${c.label}": the button does not carry the words`);
      const again = E.answerGmInbox(s, 'm', i, seat);
      if (again !== null || JSON.stringify(snap(s)) !== JSON.stringify(b)) bad.push(`${e.id} "${c.label}": a second answer moved something`);
    });
    /* The neutral option, worked out here: every built in and every fx zero. */
    const want = e.choices.findIndex(c => !c.karma && !c.popularity && !c.cash && !c.morale && !(c.out?.weeks > 0) && !c.rating?.delta && !c.recruit
      && Object.values(c.fx ?? {}).every(v => (typeof v === 'number' ? v : v.v) === 0));
    if (E.gmNeutralIndex(e.choices) !== want) bad.push(`${e.id}: gmNeutralIndex says ${E.gmNeutralIndex(e.choices)}, the option that moves nothing is ${want}`);
  }
  const r5 = pack.events.find(e => e.id === 'r5');
  if (E.gmNeutralIndex(r5.choices) !== 1) bad.push(`r5: "Fine him" moves only a registered key and still read as neutral`);
  for (const b of bad.slice(0, 8)) console.error(`     ${b}`);
  if (answered < 12) fail(11, `only ${answered} options answered: nothing was tested`);
  if (bad.length) fail(11, `${bad.length} registry breaks over ${answered} answered options`);
  else ok(`${answered} options over ${pack.events.length} cards: each printed exactly the keys it moved, by exactly the amounts, the button and the answer line agree, a second answer moved nothing, every neutral index right (r5's fx only option is not neutral)`);
  /* The answer fails closed on a key the seat lost. */
  const s = newDesk();
  const e1 = pack.events[0];
  s.phoneInbox = [{ id: 'm', defId: e1.id, from: e1.from, emoji: e1.emoji, text: e1.text, year: 2030, choices: e1.choices, beat: e1.beat }];
  const a = JSON.stringify(s);
  const refused = E.answerGmInbox(s, 'm', 0, { ...seat, fx: {} });
  if (refused !== null || JSON.stringify(s) !== a) fail(11, 'an answer whose key the seat never registered still moved something');
  else ok('an answer whose key the seat never registered is refused and moves nothing');
  /* A key with no words prints its own name: the label never hides it. */
  const raw = E.gmChoiceLabel(fxCh('Do it', { fx: { mystery: 2, form: { who: 'keeper', v: -1 } } }), pack, {});
  if (raw !== 'Do it · mystery +2, Your keeper form -1') fail(11, `a label with unregistered keys reads "${raw}"`);
  else ok(`a label with unregistered keys prints them raw: ${raw}`);
  const breaks = [
    ['an unregistered key', fxPack('fx_break', [fxCard('b', { choices: [fxCh('Act', { fx: { nope: 1 } }), fxCh('Leave')] })]), FX_REGISTRY_DEF, /not registered/],
    ['a built in name registered', FX_REGISTRY, { ...FX_REGISTRY_DEF, morale: FX_REGISTRY_DEF.board }, /built in/],
    ['a man on a plain key', fxPack('fx_break', [fxCard('b', { choices: [fxCh('Act', { fx: { board: { who: 'captain', v: 1 } } }), fxCh('Leave')] })]), FX_REGISTRY_DEF, /names nobody/],
    ['a bare number on a key that names a man', fxPack('fx_break', [fxCard('b', { choices: [fxCh('Act', { fx: { form: 2 } }), fxCh('Leave')] })]), FX_REGISTRY_DEF, /bare number/],
    ['a man off the targets', fxPack('fx_break', [fxCard('b', { choices: [fxCh('Act', { fx: { form: { who: 'coach', v: 1 } } }), fxCh('Leave')] })]), FX_REGISTRY_DEF, /not a target/],
    ['a value that is not a number', fxPack('fx_break', [fxCard('b', { choices: [fxCh('Act', { fx: { board: Number.NaN } }), fxCh('Leave')] })]), FX_REGISTRY_DEF, /finite/],
    ['a key with no registry at all', FX_REGISTRY, undefined, /not registered/],
  ];
  const held = breaks.filter(([, p, reg, re]) => { try { E.bindGmInbox(p, { ...BINDING, fx: reg }); return false; } catch (err) { return re.test(String(err.message)); } });
  if (held.length !== breaks.length) fail(11, `bind refused only ${held.length} of ${breaks.length} broken packs (${breaks.filter(b => !held.includes(b)).map(b => b[0]).join(', ')})`);
  else ok(`bind refuses ${breaks.map(b => b[0]).join(', ')}`);
}

/* ═══ 12. LEGAL: no real man is quoted, named in a voice or given conduct ═══ */

console.log('12) Legal: every pack narrated in roles, slots only in words, and a tagged card never lands on a real man');
/* FX_CONDUCT: tagged cards about a role or a fact's man, person slots, and
   effects aimed at a role, beside plain cards with a person slot and a
   plain slot. Placeholder people only ("Player 7"), never shipped. */
const FX_CONDUCT_FX = {
  ban: { label: 'suspended', fmt: 'weeks', who: true, apply: (s, v, who) => { s.ban = { ...(s.ban ?? {}), [who]: ((s.ban ?? {})[who] ?? 0) + v }; }, read: (s, who) => (s.ban ?? {})[who] ?? 0 },
  pot: { label: 'Squad fine pot', fmt: 'money', apply: (s, v) => { s.pot = Math.round(((s.pot ?? 0) + v) * 1000) / 1000; }, read: s => s.pot ?? 0 },
};
const FX_CONDUCT = fxPack('fx_conduct', [
  fxCard('c_curfew', { tag: 'conduct', subject: 'striker', text: 'Your striker broke the team curfew on Tuesday night.',
    choices: [fxCh('Suspend him', { fx: { ban: { who: 'striker', v: 1 } } }), fxCh('Fine the whole squad', { fx: { pot: 0.2 } }), fxCh('Let it go')] }),
  fxCard('c_fined', { tag: 'conduct', subject: { fact: 'man' }, text: '{player} was fined by the club after a late night out.',
    texts: ['The club fined {player} for a late night out.'], choices: [fxCh('Back the fine', { morale: -1 }), fxCh('Drop it')] }),
  fxCard('p_home', { tag: 'private', subject: 'keeper', text: 'Your keeper has asked for a few days at home with his family.',
    choices: [fxCh('Give him the days', { out: { who: 'keeper', weeks: 1 } }), fxCh('Not this week', { rating: { who: 'keeper', delta: -1 } }), fxCh('Talk it over later')] }),
  fxCard('p_grief', { tag: 'private', subject: { fact: 'man' }, text: '{player} lost someone close this week and the room knows it.',
    choices: [fxCh('Give him space', { morale: 1 }), fxCh('Leave it with the staff')] }),
  /* Round 1332's review fix: an option that moves another role than the one
     the card is about, so the hold of every man an option moves is tested
     apart from the subject's. */
  fxCard('c_skip', { tag: 'conduct', subject: 'striker', text: 'Your striker skipped training again this week.',
    choices: [fxCh('Have your captain sort it out', { rating: { who: 'captain', delta: 1 } }), fxCh('Let it go')] }),
  fxCard('n_rival', { text: 'The game against {opponent} is the one the whole room wants.', choices: [fxCh('Talk it up', { popularity: 1 }), fxCh('Keep it low key')] }),
  fxCard('n_form', { text: '{player} is in the best form of his season.', choices: [fxCh('Praise him', { morale: 1 }), fxCh('Say nothing')] }),
], { span: { a: 20 }, facts: { man: { kind: 'num', min: 1, max: 13, per: 'week' }, rival: { kind: 'num', min: 1, max: 20, per: 'week' } },
  slots: { player: { fact: 'man', person: true }, opponent: { fact: 'rival' } }, subjectRest: 2 });
/* The fixture's squad: twelve placeholder men a desk, about half of them
   marked real (as a real footballer would be in a binding), and the three
   roles handed to a different man each season. Id 13 is nobody, and so is
   a role in about one season in five (nobody holds it: the hold must treat
   nobody as it treats a real man). */
const conductSquad = desk => Array.from({ length: 13 }, (_, i) => i > 0 && keyedRng(`simEventDeck|squad|${desk}|${i}`)() < 0.5);
const conductPerson = (s, ref) => {
  const roles = Object.keys(FX_CONDUCT.targets);
  let id;
  if ('role' in ref) {
    const r = roles.indexOf(ref.role);
    if (r < 0 || (s.year + r + s.desk) % 5 === 0) return null;
    id = 1 + ((s.year * 3 + r * 5 + s.desk) % 12);
  } else id = Number(ref.id);
  if (!(Number.isInteger(id) && id >= 1 && id <= 12)) return null;
  return { name: `Player ${id}`, real: s.real[id] };
};
/* The brief's speech verbs, plus (Round 1332's review fix) the past tense of
   the rest and the common reporting verbs, so "{player} insisted" is caught. */
const SPEECH = 'said|says|told|tells|asked|asks|claims|insists|admits|reckons|wants|demands|vows|promised|promises'
  + '|claimed|insisted|admitted|reckoned|wanted|demanded|vowed|wrote|writes|posted|posts|revealed|reveals|confirmed|confirms|hinted|hints|added|adds';
/* simGmInbox's ALLEGATION and CONDUCT, copied (append only), plus the
   brief's conduct words; and the private list (a man's own life off the
   pitch: never a playing injury, which is football and stays untagged). */
const CONDUCT_WORDS = [
  /\b(casino|gambling debts?|drunk|drink driv\w*|crashed his|arrested|having an affair|cheating on|missed training|hungover|assaulted)\b/i,
  /transfer request|bust-up|bust up|agents? for|leaked|reject(ed|s)? a|refus(ed|es)|demand(ed|s)|storm(ed|s) out|fell out|falling out|row over|walked out|went on strike|downed tools|sulk|tantrum|forced? (a|his) (move|exit)|handed in/i,
  /\b(fined|suspended|disciplin\w*|curfew|police|court|arrest\w*)\b/i,
];
const PRIVATE_WORDS = /\b(family|homesick|faith|pray\w*|fasting|religio\w*|illness|mental health|grief|funeral|bereave\w*|wedding|divorce|pregnan\w*)\b/i;
/* The GM cards the untagged scan flags today, each with the word it matched
   (decision 2 of the brief): the packs are frozen by the replay, so they sit
   on this ratchet; an entry that no longer matches must leave. The round
   that binds the AFL pack owes afl_go_home first: tag it private with a
   generated youngster, or reword it, and re-record the replay by the lead's
   leave. */
const LEGAL_BASELINE = { 'afl/afl_go_home': 'homesick', 'nba/nba_trade_demand': 'leaked' };
if (runs(12)) {
  if (CONTROL === 'quoteslot') {
    const e = FX_CONDUCT.events.find(x => x.id === 'n_form');
    if (!e || e.texts) { console.error('quoteslot control: n_form is not there without wordings, refusing to run'); process.exit(2); }
    e.texts = ['{player} told the room he is staying put.'];
  }
  if (CONTROL === 'speechpast') {
    const e = FX_CONDUCT.events.find(x => x.id === 'n_form');
    if (!e || e.texts) { console.error('speechpast control: n_form is not there without wordings, refusing to run'); process.exit(2); }
    e.texts = ['{player}\'s camp insisted he is staying put.'];
  }
  if (CONTROL === 'untagged') {
    const e = FX_CONDUCT.events.find(x => x.id === 'c_curfew');
    if (!e || e.tag !== 'conduct') { console.error('untagged control: c_curfew is not a conduct card, refusing to run'); process.exit(2); }
    delete e.tag;
  }
  /* The real people a desk could hold: simGmInbox's eight roster files and
     Club Manager's baked rosters (full names only). */
  const deaccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const REAL = new Set();
  for (const rel of ['src/data/frontOfficePlayers.ts', 'src/data/conquestDataNba.ts', 'src/data/mlbFoPlayers.ts', 'src/data/mlbFoRosters2026.ts',
    'src/data/nhlFoPlayers.ts', 'src/data/cfbHLPlayers.ts', 'src/data/ufcFighters.ts', 'src/data/aflGoalKickers.ts']) {
    /* Each quote kind read up to its own closing mark, so a name with an
       apostrophe inside double quotes (De'Aaron Fox) is harvested too. */
    for (const m of readSrc(rel).matchAll(/name:\s*(?:"([A-Z][^"]{1,40} [^"]{2,40})"|'([A-Z][^']{1,40} [^']{2,40})')/g)) REAL.add(deaccent(m[1] ?? m[2]));
  }
  for (const rel of ['src/data/clubManagerRosters.ts', 'src/data/clubManagerEra2005.ts', 'src/data/clubManagerEra2010.ts', 'src/data/clubManagerEra2015.ts', 'src/data/clubManagerEra2020.ts']) {
    for (const m of readSrc(rel).matchAll(/\bn:\s*(?:"([^"]{2,40} [^"]{2,40})"|'([^']{2,40} [^']{2,40})')/g)) REAL.add(deaccent(m[1] ?? m[2]));
  }
  if (![...REAL].some(n => /[A-Za-z]'[A-Za-z]/.test(n))) fail(12, 'no name with an apostrophe was harvested: the harvest skips them');
  if (CONTROL === 'rosterword') {
    const someone = [...REAL].find(n => /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(n));
    const e = FX_CONDUCT.events.find(x => x.id === 'n_form');
    if (!someone || !e) { console.error('rosterword control: no real name or no n_form card, refusing to run'); process.exit(2); }
    e.text = `${someone} is in the best form of his season.`;
  }
  /* Measured 2026-10-13: 10,473 full names before Round 1332's review fix
     and 10,483 after it (the ten names with an apostrophe the old pattern
     skipped; simGmInbox's eight files gave 2,236 on 2026-10-03, Club
     Manager's five 8,240). The floor only proves the harvest worked. */
  const REAL_FLOOR = 8000;
  if (REAL.size < REAL_FLOOR) fail(12, `only ${REAL.size} real names harvested (floor ${REAL_FLOOR}): the name scan would mean nothing`);
  else ok(`${REAL.size} real names harvested from thirteen roster files`);
  const QUOTE_MARK = /["“”]/;
  const FIRST_PERSON = /\b(I|I'm|I am|I've|I'll|my|me|mine|we|we're|us|our|boss|gaffer)\b/;
  const ROLE = /^(Your |His |A |The )[a-z]/;
  const DEPARTMENTS = new Set(['Ownership', 'Team doctor', 'Ticket office', 'Marketing', 'Compliance office']);
  const FX_OF = { fx_registry: FX_REGISTRY_DEF, fx_conduct: FX_CONDUCT_FX };
  const scanned = { ...INDEX_PACKS, fx_expire: FX_EXPIRE, fx_neutral: FX_NEUTRAL, fx_registry: FX_REGISTRY, fx_conduct: FX_CONDUCT };
  const bad = [];
  let strings = 0;
  const flagged = {};
  for (const [k, p] of Object.entries(scanned)) {
    const reg = FX_OF[k] ?? PACK_BINDS[k]?.fx ?? {};
    const slots = p.slots ?? {};
    const people = Object.keys(slots).filter(n => slots[n].person);
    const meterWords = [...Object.values(p.meters), 'Recruit interest', ...Object.values(reg).map(d => d.label)].map(w => w.toLowerCase());
    const weekWords = Object.values(reg).filter(d => d.fmt === 'weeks').map(d => d.label.toLowerCase());
    const printsEffect = t => {
      const low = t.toLowerCase();
      if (/\bout\s+\d+\s+weeks?\b/.test(low) || /\brating\s*[+-]\s*\d/.test(low)) return true;
      if (weekWords.some(w => new RegExp(`\\b${w}\\s+\\d+\\s+weeks?\\b`).test(low))) return true;
      return meterWords.some(w => {
        for (let at = low.indexOf(w); at >= 0; at = low.indexOf(w, at + 1)) {
          const after = low.slice(at + w.length, at + w.length + 8);
          const before = low.slice(Math.max(0, at - 10), at);
          if (/^\s*[+-]\s*\$?\d/.test(after) || /[+-]\s*\$?\d[\d.,]*\s*[a-z$]*\s*$/.test(before)) return true;
        }
        return false;
      });
    };
    const lines = [['label', p.label], ...p.calendar.map(b => ['beat', b.label]), ...Object.values(p.targets).map(t => ['target', t])];
    for (const e of p.events) {
      const wordings = [e.text, ...(e.texts ?? [])];
      for (const t of wordings) lines.push(['wording', t]);
      lines.push(['from', e.from]);
      for (const c of e.choices) lines.push(['option', c.label], ['reply', c.reply]);
      if (!ROLE.test(e.from) && !DEPARTMENTS.has(e.from)) bad.push(`${k}/${e.id}: the voice "${e.from}" is not a role`);
      for (const t of wordings) {
        if (FIRST_PERSON.test(deaccent(t))) bad.push(`${k}/${e.id}: a wording speaks in the first person`);
        if (printsEffect(t)) bad.push(`${k}/${e.id}: a wording prints an effect ("${t.slice(0, 50)}")`);
        for (const n of t.matchAll(/\{(\w+)\}/g)) if (!slots[n[1]]) bad.push(`${k}/${e.id}: {${n[1]}} is not a declared slot`);
        if (/[{}]/.test(t.replace(/\{(\w+)\}/g, ''))) bad.push(`${k}/${e.id}: a brace outside a slot`);
        for (const n of people) {
          const at = `\\{${n}\\}`;
          if (new RegExp(`["“”][^"“”]*${at}[^"“”]*["“”]`).test(t)) bad.push(`${k}/${e.id}: the person slot {${n}} inside quote marks`);
          /* A possessive ("{player}'s camp insists") counts as the slot. */
          if (new RegExp(`${at}(?:['’]s)?(?:\\s+[\\w']+){0,2}\\s+(?:${SPEECH})\\b`, 'i').test(t) || new RegExp(`\\b(?:${SPEECH})\\s+${at}`, 'i').test(t)) bad.push(`${k}/${e.id}: the person slot {${n}} next to a speech verb`);
        }
      }
      if (e.tag === undefined) {
        const words = [...wordings, ...e.choices.flatMap(c => [c.label, c.reply])].join(' | ');
        const hit = [...CONDUCT_WORDS, PRIVATE_WORDS].map(re => words.match(re)?.[0]).find(Boolean);
        const key = `${k}/${e.id}`;
        if (hit) {
          flagged[key] = hit.toLowerCase();
          if (!LEGAL_BASELINE[key]) bad.push(`${key}: an untagged card about conduct or a private life ("${hit}"): tag it conduct or private`);
        }
      }
    }
    for (const [kind, s] of lines) {
      strings++;
      if (QUOTE_MARK.test(s)) bad.push(`${k} ${kind} "${String(s).slice(0, 40)}": a quote mark`);
      if (kind !== 'wording' && /[{}]/.test(s)) bad.push(`${k} ${kind} "${String(s).slice(0, 40)}": a brace where no slot is filled`);
      const flat = deaccent(String(s));
      const name = [...REAL].find(n => flat.includes(n));
      if (name) bad.push(`${k} ${kind} "${String(s).slice(0, 40)}": a real name (${name})`);
    }
  }
  for (const [key, word] of Object.entries(LEGAL_BASELINE)) if (flagged[key] !== word) bad.push(`LEGAL_BASELINE ${key} (${word}) no longer matches${flagged[key] ? ` (it matches ${flagged[key]})` : ''}: take it off or rewrite it`);
  for (const b of bad.slice(0, 10)) console.error(`     ${b}`);
  if (strings < 400) fail(12, `only ${strings} strings scanned: nothing was tested`);
  if (bad.length) fail(12, `${bad.length} legal findings over ${Object.keys(scanned).length} packs`);
  else ok(`${strings} strings over ${Object.keys(scanned).length} packs: no quote, no first person, every voice a role, no real name, slots only where declared, no person slot by a speech verb, no wording prints an effect, every conduct or private card tagged (baseline: ${Object.keys(LEGAL_BASELINE).join(', ')})`);
}
/* The fleet: FX_CONDUCT on 100 ten season desks of twenty weeks, about half
   of each squad real and the roles changing hands every season. Every
   tagged card dealt, and every answer to one, must land on generated men
   only (checked here with the fixture's own resolver, not the engine's);
   at least one tagged card must have been held for a real man; no dealt
   text may keep a brace. Round 1332's review fix: desks answer LATE (each
   open card with a chance of 0.35 a week, so cards sit open across a
   season turn) and the season turns after the last week's deal and before
   its answers, so a role can change hands between a card's deal and its
   answer. Then every answer the engine takes must still land on generated
   men only, an answer it refuses must be one that would have landed on a
   real man (or nobody) and must move nothing, no tagged card may sit open
   after a week about a real man (step 2b settles it), and the fleet must
   have met both cases: an answer refused and a card settled for that. */
if (runs(12)) {
  const seat = E.bindGmInbox(FX_CONDUCT, { ...BINDING, fx: FX_CONDUCT_FX, person: conductPerson });
  const byId = new Map(FX_CONDUCT.events.map(e => [e.id, e]));
  const refsOf = (e, facts) => {
    const refs = [];
    const slots = FX_CONDUCT.slots;
    for (const t of [e.text, ...(e.texts ?? [])]) for (const n of t.matchAll(/\{(\w+)\}/g)) if (slots[n[1]]?.person) refs.push({ id: facts[slots[n[1]].fact] });
    if (typeof e.subject === 'string') refs.push({ role: e.subject });
    else if (e.subject) refs.push({ id: facts[e.subject.fact] });
    return refs;
  };
  const choiceRefs = c => [...(c.out ? [{ role: c.out.who }] : []), ...(c.rating ? [{ role: c.rating.who }] : []),
    ...Object.values(c.fx ?? {}).filter(v => typeof v !== 'number').map(v => ({ role: v.who }))];
  const realHit = (s, refs) => refs.some(r => conductPerson(s, r)?.real !== false);
  /* Every role a card names: its subject when a role, and every option's men. */
  const roleRefs = (e, choices) => [...(typeof e.subject === 'string' ? [{ role: e.subject }] : []), ...choices.flatMap(choiceRefs)];
  const f = { dealt: 0, tagged: 0, answered: 0, heldReal: 0, refusedReal: 0, settledReal: 0, bad: [] };
  for (let d = 0; d < 100; d++) {
    const rng = keyedRng(`simEventDeck|conduct|${SEED}|${d}|deck`);
    const fr = keyedRng(`simEventDeck|conduct|${SEED}|${d}|facts`);
    const ar = keyedRng(`simEventDeck|conduct|${SEED}|${d}|answer`);
    const s = { ...newDesk(), desk: d, real: conductSquad(d) };
    /* The ids a tagged card named at its deal (person slots, a fact's man). */
    const dealtRefs = new Map();
    for (let t = 0; t < SEASONS * 20; t++) {
      s.year = 2030 + Math.floor(t / 20);
      const facts = { man: 1 + Math.floor(fr() * 13) };
      if (fr() < 0.7) facts.rival = `Club ${1 + Math.floor(fr() * 20)}`;
      /* A tagged card the fixture says is about a real man must be held. */
      for (const e of FX_CONDUCT.events) {
        if (!e.tag) continue;
        const allNamed = refsOf(e, facts).every(r => !('id' in r) || conductPerson(s, r) !== null);
        if (allNamed && (realHit(s, refsOf(e, facts)) || e.choices.some(c => realHit(s, choiceRefs(c))))) {
          if (E.gmCardSafe(e, s, seat, facts)) f.bad.push(`desk ${d} week ${t}: ${e.id} is about a real man (or nobody) and was not held`);
          else f.heldReal++;
        }
      }
      const settled = [];
      const got = E.gmInboxWeek(s, seat, 'a', facts, t, rng, settled);
      for (const m of got) {
        f.dealt++;
        if (/[{}]/.test(m.text)) f.bad.push(`desk ${d} week ${t}: ${m.id} reads "${m.text}"`);
        const e = byId.get(m.defId);
        if (!e.tag) continue;
        f.tagged++;
        dealtRefs.set(m.id, refsOf(e, facts));
        if (realHit(s, refsOf(e, facts))) f.bad.push(`desk ${d} week ${t}: ${m.id} was dealt about a real man (or nobody)`);
      }
      for (const m of settled) {
        const e = byId.get(m.defId);
        if (!e.tag) continue;
        if (realHit(s, roleRefs(e, m.choices))) f.settledReal++;
        else f.bad.push(`desk ${d} week ${t}: ${m.id} was settled though every man it names is generated`);
      }
      for (const m of openOf(s)) {
        const e = byId.get(m.defId);
        if (e.tag && realHit(s, roleRefs(e, m.choices))) f.bad.push(`desk ${d} week ${t}: ${m.id} sits open after the week about a real man (or nobody)`);
      }
      /* The season turns after its last week's deal and before its answers. */
      if (t % 20 === 19) s.year++;
      for (const m of openOf(s)) {
        if (ar() >= 0.35) continue;
        const i = Math.floor(ar() * m.choices.length);
        const e = byId.get(m.defId);
        const before = JSON.stringify(s);
        const line = E.answerGmInbox(s, m.id, i, seat);
        if (line !== null) f.answered++;
        if (!e.tag) continue;
        const hit = realHit(s, [...(dealtRefs.get(m.id) ?? []), ...roleRefs(e, m.choices)]);
        if (line !== null && hit) f.bad.push(`desk ${d} week ${t}: answering ${m.id} lands on a real man (or nobody)`);
        else if (line === null && !hit) f.bad.push(`desk ${d} week ${t}: answering ${m.id} was refused though every man it names is generated`);
        else if (line === null) {
          f.refusedReal++;
          if (JSON.stringify(s) !== before) f.bad.push(`desk ${d} week ${t}: a refused answer to ${m.id} moved something`);
        }
      }
    }
  }
  for (const b of f.bad.slice(0, 6)) console.error(`     ${b}`);
  const line = `FX_CONDUCT on 100 ten season desks answering late: ${f.dealt} cards dealt, ${f.tagged} of them tagged, ${f.answered} answered, ${f.heldReal} tagged cards held for a real man, ${f.refusedReal} answers refused and ${f.settledReal} open cards settled after a role passed to a real man (or nobody)`;
  /* Measured 2026-10-13 at seeds 1 to 5: 91 to 121 answers refused and 245
     to 299 cards settled after a role passed to a real man (or nobody). The
     floors of 20 only prove the fleet met both cases. */
  if (f.bad.length) fail(12, `${f.bad.length} breaks: ${line}`);
  else if (f.tagged < 200 || f.heldReal < 1 || f.answered < 500 || f.refusedReal < 20 || f.settledReal < 20) fail(12, `${line}: too few to have tested it`);
  else ok(`${line}; every tagged card dealt and every answer taken landed on generated men only, every refused answer moved nothing, no tagged card sat open about a real man, no dealt text kept a brace`);
}

/* ═══ 13. COMPACT: a pruned book and messages saved as numbers deal the same ═══ */

/* FX_COMPACT: stories, a subject with a rest, one shots (plain and a
   story's), wordings, a person slot and a plain one, an expiring card, a
   long cooldown, on the week clock; FX_COMPACT_SEASON is the same cards on
   the season clock. Placeholder people only. */
const FX_COMPACT = fxPack('fx_compact', [
  fxCard('k_plain', { cooldown: 3 }), fxCard('k_once', { oneShot: true }),
  fxCard('k_arc_a', { story: 'arc', cooldown: 6 }), fxCard('k_arc_b', { story: 'arc' }),
  fxCard('k_saga_a', { story: 'saga', oneShot: true }), fxCard('k_saga_b', { story: 'saga', oneShot: true }),
  fxCard('k_words', { texts: ['The k_words matter came up again.', 'Another k_words matter landed on the desk.'] }),
  fxCard('k_slot', { text: '{player} has a matter for you this week.', texts: ['A matter about {player} needs a call.'], subject: { fact: 'man' } }),
  fxCard('k_rival', { text: 'The {opponent} matter needs a call before the weekend.' }),
  fxHard('k_exp', { expires: 3 }), fxCard('k_cool', { cooldown: 12 }),
], { store: 'compact', chance: 0.6, cooldown: 4, subjectRest: 3, pressure: { trust: 40, morale: 20 },
  facts: { man: { kind: 'num', min: 1, max: 9, per: 'week' }, rival: { kind: 'num', min: 1, max: 20, per: 'week' } },
  slots: { player: { fact: 'man', person: true }, opponent: { fact: 'rival' } } });
const FX_COMPACT_SEASON = { ...FX_COMPACT, seat: 'fx_compact_season', clock: 'season', cooldown: 2 };
const compactPerson = (s, ref) => ('role' in ref ? { name: `Your ${ref.role}`, real: false } : { name: `Player ${Math.round(Number(ref.id))}`, real: false });
const COMPACT_BIND = { person: compactPerson };
const whole4 = s => JSON.stringify([s.phoneInbox, s.phoneUsedIds, s.gmInboxLast, s.gmInboxRest]);
if (runs(13)) {
  console.log('13) Compact: a pruned book and messages saved as numbers deal, answer and read exactly as a whole desk does');
  const meters = s => JSON.stringify([s.morale, s.trust, s.fans, s.cash, s.recruit, s.out, s.rating]);
  const oneShotKeys = p => new Set(p.events.filter(e => e.oneShot).map(e => (e.story ? `story:${e.story}` : e.id))).size;
  const keyOf = e => (e.story ? `story:${e.story}` : e.id);
  /* One FLEET row three ways: whole, compact, compact through the codec
     between every two weeks. Returns per desk hashes and the breaks. */
  const row = (pack, tag, seed, bind) => {
    const whole = { ...pack, store: undefined };
    const compact = { ...pack, store: 'compact' };
    const out = { i: 0, ii: 0, desks: 0, bad: [], weeks: 0, pruned: 0, dropped: 0 };
    const limitUsed = oneShotKeys(pack);
    const byKey = new Map();
    for (const e of pack.events) byKey.set(keyOf(e), [...(byKey.get(keyOf(e)) ?? []), e]);
    for (let d = 0; d < DRIVES.FLEET.desks; d++) {
      const hashes = [];
      for (const mode of ['whole', 'compact', 'codec']) {
        const hI = crypto.createHash('sha256');
        const hII = crypto.createHash('sha256');
        const book = {};
        const observe = w => {
          const s = w.s;
          hI.update(`${w.got.map(m => `${m.id}|${m.text}`).join(',')}|${(s.phoneInbox ?? []).map(m => `${m.id}|${m.text}|${m.answered}|${m.auto}`).join(',')}|${w.lines.join('/')}|${meters(s)}\n`);
          hII.update(`${whole4(s)}|${w.lines.join('/')}|${meters(s)}\n`);
          /* Decision 3e: a whole desk (every GM desk) never gains a field
             this round adds; these are section 1's FLEET desks exactly. */
          if (mode === 'whole' && (s.phoneInbox ?? []).some(m => 't' in m || 'sv' in m)) out.bad.push(`${tag} desk ${d} week ${w.clock}: a whole desk's message carries t or sv`);
          if (mode !== 'compact') return;
          out.weeks++;
          for (const m of w.got) book[keyOf(pack.events.find(e => e.id === m.defId))] = w.clock;
          const cooling = k => (byKey.get(k) ?? []).some(e => (pack.clock === 'season' ? B.onCooldown(book, e, w.clock, pack.cooldown) : w.clock - book[k] < (e.cooldown ?? pack.cooldown)));
          const want = Object.keys(book).filter(cooling).sort();
          const have = Object.keys(s.gmInboxLast ?? {}).sort();
          if (want.join(',') !== have.join(',')) out.bad.push(`${tag} desk ${d} week ${w.clock}: the book holds [${have.slice(0, 4).join(',')}], still cooling [${want.slice(0, 4).join(',')}]`);
          for (const k of have) if (s.gmInboxLast[k] !== book[k]) out.bad.push(`${tag} desk ${d} week ${w.clock}: ${k} stamped ${s.gmInboxLast[k]}, dealt ${book[k]}`);
          out.pruned += Object.keys(book).length - have.length;
          if ((s.phoneUsedIds ?? []).length > limitUsed) out.bad.push(`${tag} desk ${d}: ${(s.phoneUsedIds ?? []).length} one shots used, the pack has ${limitUsed}`);
          if ((s.phoneInbox ?? []).length > GM_MAX) out.bad.push(`${tag} desk ${d}: ${(s.phoneInbox ?? []).length} kept`);
        };
        const between = mode !== 'codec' ? undefined : s => {
          const { host, dropped } = E.gmDeskLoad(JSON.parse(JSON.stringify(E.gmDeskSave(s, compact))), compact);
          out.dropped += dropped;
          for (const k of ['phoneInbox', 'phoneUsedIds', 'gmInboxLast', 'gmInboxRest']) { if (k in host) s[k] = host[k]; else delete s[k]; }
          return s;
        };
        runDesk(mode === 'whole' ? whole : compact, tag, seed, 'FLEET', d, { observe, between, bind });
        hashes.push([hI.digest('hex'), hII.digest('hex')]);
      }
      out.desks++;
      if (hashes[0][0] !== hashes[1][0]) { out.i++; if (out.i <= 2) out.bad.push(`${tag} seed ${seed} desk ${d}: the compact desk dealt or moved differently from the whole one`); }
      if (hashes[1][1] !== hashes[2][1]) { out.ii++; if (out.ii <= 2) out.bad.push(`${tag} seed ${seed} desk ${d}: a save and load between weeks changed the desk`); }
    }
    return out;
  };
  const GM_MAX = E.GM_INBOX_MAX;
  /* Every index pack (INDEX_PACKS, not a list kept here) and the two FX packs. */
  const packs = { ...INDEX_PACKS, fx_compact: FX_COMPACT, fx_compact_season: FX_COMPACT_SEASON };
  const binds = { fx_compact: COMPACT_BIND, fx_compact_season: COMPACT_BIND };
  for (const [k, p] of Object.entries(INDEX_PACKS)) {
    binds[k] = indexBind(k, p);
    if (binds[k] === null) { fail(13, `${k} moves fx keys and has no PACK_BINDS entry, so the kit cannot bind it`); delete packs[k]; }
  }
  const tot = { desks: 0, weeks: 0, pruned: 0, dropped: 0, bad: [] };
  for (const [k, p] of Object.entries(packs)) for (const seed of SEEDS) {
    const r = row(p, k, seed, binds[k]);
    tot.desks += r.desks; tot.weeks += r.weeks; tot.pruned += r.pruned; tot.dropped += r.dropped; tot.bad.push(...r.bad);
  }
  for (const b of tot.bad.slice(0, 8)) console.error(`     ${b}`);
  const line = `${Object.keys(packs).length} packs at seeds ${SEEDS.join(', ')}, ${tot.desks} FLEET desks three ways (${tot.weeks} compact weeks, ${tot.pruned} cooled book entries pruned in all)`;
  if (tot.bad.length || tot.dropped) fail(13, `${tot.bad.length} breaks, ${tot.dropped} messages dropped on load: ${line}`);
  else if (tot.pruned < 1000) fail(13, `${line}: too little pruned to have tested it`);
  else ok(`${line}: compact and whole dealt, answered and moved alike; a save, JSON and load between every two weeks changed nothing, text included; the book held exactly the entries still cooling, the one shots never past the pack's, never more than ${GM_MAX} kept`);
  /* Size, a report for W3 (it states its own against
     simClubManagerSaveSize): FX_BIG, 420 generated cards with Club
     Manager's rhythm (a fifty week season, about one deal a week the open
     cap allows, a quarter of them one shots, cooldowns 4 to 40), on 20 desks
     of fifteen seasons answering like the FLEET drive. The compact block's
     mean bytes beside the same desk saved whole. */
  const bigRng = keyedRng('simEventDeck|big|cards');
  const FX_BIG = fxPack('fx_big', Array.from({ length: 420 }, (_, i) => fxCard(`b${i}`, {
    ...(i % 4 === 0 ? { oneShot: true } : { cooldown: 4 + Math.floor(bigRng() * 37) }),
    ...(i % 3 === 0 ? { texts: [`The b${i} matter is back on the desk.`] } : {}),
  })), { span: { a: 50 }, chance: 0.02, store: 'compact' });
  const sizeAt = [1, 5, 10, 15];
  const sums = { compact: sizeAt.map(() => 0), whole: sizeAt.map(() => 0), deals: 0 };
  const BIG_DESKS = 20;
  for (const [mode, pack] of [['compact', FX_BIG], ['whole', { ...FX_BIG, store: undefined }]]) {
    const seat = E.bindGmInbox(pack, BINDING);
    for (let d = 0; d < BIG_DESKS; d++) {
      const rng = keyedRng(`simEventDeck|big|${SEED}|${d}|deck`);
      const ar = keyedRng(`simEventDeck|big|${SEED}|${d}|answer`);
      const s = newDesk();
      let clock = 0;
      for (let season = 1; season <= 15; season++) {
        s.year = 2030 + season;
        for (let w = 0; w < 50; w++) {
          const got = E.gmInboxWeek(s, seat, 'a', {}, clock++, rng);
          if (mode === 'compact') sums.deals += got.length;
          for (const m of openOf(s)) if (ar() < 0.75) E.answerGmInbox(s, m.id, Math.floor(ar() * m.choices.length), seat);
        }
        const at = sizeAt.indexOf(season);
        if (at >= 0) sums[mode][at] += JSON.stringify(E.gmDeskSave(s, pack)).length;
      }
    }
  }
  const mean = (mode, i) => Math.round(sums[mode][i] / BIG_DESKS);
  const slope = mode => Math.round((mean(mode, 3) - mean(mode, 2)) / 5);
  console.log(`   size report: FX_BIG (420 cards, ${(sums.deals / BIG_DESKS / 15).toFixed(1)} deals a season) on ${BIG_DESKS} desks: compact block ${sizeAt.map((y, i) => `season ${y} ${mean('compact', i)} B`).join(', ')}, slope ${slope('compact')} B a season from 10 to 15; the same desk whole ${sizeAt.map((y, i) => `season ${y} ${mean('whole', i)} B`).join(', ')}, slope ${slope('whole')} B a season`);
  if (sums.deals / BIG_DESKS / 15 < 20) fail(13, `FX_BIG dealt only ${(sums.deals / BIG_DESKS / 15).toFixed(1)} cards a season: the size report measures nothing`);
  if (mean('compact', 3) >= mean('whole', 3)) fail(13, `the compact block (${mean('compact', 3)} B) is no smaller than the whole desk (${mean('whole', 3)} B) at season 15`);
  /* The loader's three cases. */
  {
    const pack = FX_COMPACT;
    const s = newDesk();
    const seat = E.bindGmInbox(pack, { ...BINDING, ...COMPACT_BIND });
    for (let t = 0; t < 30; t++) E.gmInboxWeek(s, seat, 'a', { man: 2, rival: 5 }, t, keyedRng(`simEventDeck|load|${t}`));
    const block = JSON.parse(JSON.stringify(E.gmDeskSave(s, pack)));
    const cases = [];
    const empty = E.gmDeskLoad({ ...block, v: 2 }, pack);
    cases.push(['a block of v: 2 reads as an empty desk', JSON.stringify(empty.host) === JSON.stringify({ phoneInbox: [], phoneUsedIds: [], gmInboxLast: {} })]);
    const bent = E.gmDeskLoad({ ...block, l: [1], u: 'x' }, pack);
    cases.push(['a bad book and a bad one shot list reset alone', JSON.stringify(bent.host.gmInboxLast) === '{}' && JSON.stringify(bent.host.phoneUsedIds) === '[]'
      && JSON.stringify(bent.host.phoneInbox) === JSON.stringify(s.phoneInbox)]);
    const old = { id: 'k_plain-2029-w3', defId: 'k_plain', from: 'Your assistant', emoji: '📋', text: 'An older build saved this whole.', year: 2029, choices: pack.events[0].choices, beat: 'a', answered: 0 };
    const gone = { d: E.gmShortKey('no_such_card'), y: 2030, c: 4 };
    const mixed = E.gmDeskLoad({ ...block, m: [old, gone, ...block.m] }, pack);
    cases.push(['a whole message from an older build is kept, a compact one whose card is gone is dropped and counted',
      JSON.stringify(mixed.host.phoneInbox[0]) === JSON.stringify(old) && mixed.dropped === 1 && mixed.host.phoneInbox.length === block.m.length + 1]);
    const compactShare = block.m.filter(m => 'd' in m).length;
    cases.push([`the saved messages are compact (${compactShare} of ${block.m.length})`, block.m.length > 0 && compactShare === block.m.length]);
    const wrong = cases.filter(c => !c[1]);
    if (wrong.length) fail(13, `the loader: ${wrong.map(c => c[0]).join('; ')} FAILED`);
    else ok(`the loader: ${cases.map(c => c[0]).join('; ')}`);
  }
}

/* ═══ 14. FROZEN WORDS: a compact pack's words never change once recorded ═══ */

/* A compact message is rebuilt from its pack on read, so an edit to a
   shipped card's words would rewrite messages already sitting in saves.
   scripts/data/eventDeckWords.json records, for every pack whose source
   declares store: 'compact' (FX_COMPACT here, and every index pack that
   declares it, read off INDEX_PACKS, so no list kept by hand can leave one
   out), each card's ledger key, a hash of each wording in order,
   a hash of each option label, and its slots. A wording may only be added
   at the end; nothing recorded may change. SIM_EVENT_DECK_WORDS=append adds
   rows for new cards and new trailing wordings and never rewrites a row;
   changing a recorded row is the lead's call, like the replay. */
const WORDS_FILE = path.join(ROOT, 'scripts/data/eventDeckWords.json');
const COMPACT_PACKS = { fx_compact: FX_COMPACT, ...Object.fromEntries(Object.entries(INDEX_PACKS).filter(([, p]) => p.store === 'compact')) };
if (runs(14)) {
  console.log('14) Frozen words: no recorded card of a compact pack changes its words, options, story or slots');
  const APPEND = process.env.SIM_EVENT_DECK_WORDS === 'append';
  if (APPEND && CONTROL) { console.error('the words ledger is appended with no control, refusing'); process.exit(2); }
  const h12 = t => crypto.createHash('sha256').update(String(t)).digest('hex').slice(0, 12);
  const packs = Object.fromEntries(Object.entries(COMPACT_PACKS).map(([k, p]) => [k, { ...p, events: p.events.map(e => ({ ...e })) }]));
  const fx = packs.fx_compact.events;
  if (CONTROL === 'wordedit') {
    const e = fx.find(x => x.id === 'k_words');
    if (!e || !e.texts?.length) { console.error('wordedit control: k_words has no wordings, refusing to run'); process.exit(2); }
    e.texts = [`${e.texts[0]} Again.`, ...e.texts.slice(1)];
  }
  if (CONTROL === 'wordorder') {
    const e = fx.find(x => x.id === 'k_words');
    if (!e || !(e.texts?.length >= 2) || e.texts[0] === e.texts[1]) { console.error('wordorder control: k_words lacks two different wordings, refusing to run'); process.exit(2); }
    e.texts = [e.texts[1], e.texts[0], ...e.texts.slice(2)];
  }
  if (CONTROL === 'storymove') {
    const e = fx.find(x => x.id === 'k_plain');
    if (!e || e.story !== undefined) { console.error('storymove control: k_plain is not a plain card, refusing to run'); process.exit(2); }
    e.story = 'arc';
  }
  if (CONTROL === 'voiceedit') {
    const e = fx.find(x => x.id === 'k_plain');
    if (!e || e.from === 'Your captain') { console.error('voiceedit control: k_plain is gone or already speaks as the captain, refusing to run'); process.exit(2); }
    e.from = 'Your captain';
  }
  if (CONTROL === 'effectedit') {
    const e = fx.find(x => x.id === 'k_plain');
    if (!e || !(e.choices[1]?.karma > 0)) { console.error('effectedit control: k_plain has no second option moving trust, refusing to run'); process.exit(2); }
    e.choices = e.choices.map((c, i) => (i === 1 ? { ...c, karma: c.karma + 1 } : c));
  }
  /* Round 1332's review fix: a compact message is rebuilt with its card's
     voice, emoji, beat and every option's reply and effects too, so those
     are frozen with the words (a retune of a recorded card is the lead's
     call, like a wording). Keys are sorted before hashing, so moving a key
     in the source changes nothing. */
  const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x));
  const rowOf = e => ({
    key: e.story ? `story:${e.story}` : e.id,
    words: [e.text, ...(e.texts ?? [])].map(h12),
    options: e.choices.map(c => h12(c.label)),
    slots: [...new Set([e.text, ...(e.texts ?? [])].flatMap(t => [...t.matchAll(/\{(\w+)\}/g)].map(m => m[1])))].sort(),
    voice: h12(canon([e.from, e.emoji, e.beat])),
    effects: e.choices.map(({ label, ...rest }) => h12(canon(rest))),
  });
  const rec = fs.existsSync(WORDS_FILE) ? JSON.parse(fs.readFileSync(WORDS_FILE, 'utf8')) : { rows: {} };
  const rows = rec.rows ?? {};
  const bad = [];
  const added = [];
  const now = {};
  for (const [k, p] of Object.entries(packs)) for (const e of p.events) now[`${k}/${e.id}`] = rowOf(e);
  for (const [id, r] of Object.entries(rows)) {
    const n = now[id];
    if (!n) { bad.push(`${id}: a recorded card is gone`); continue; }
    if (n.key !== r.key) bad.push(`${id}: its ledger key moved from ${r.key} to ${n.key} (a story added or taken away)`);
    const prefix = n.words.slice(0, r.words.length);
    if (prefix.join() !== r.words.join()) bad.push(`${id}: a recorded wording changed or moved`);
    else if (n.words.length > r.words.length) {
      if (APPEND) { r.words = n.words; added.push(`${id} +${n.words.length - prefix.length} wording`); }
      else bad.push(`${id}: ${n.words.length - r.words.length} new wording(s) at the end, not yet recorded (SIM_EVENT_DECK_WORDS=append)`);
    }
    if (n.options.join() !== r.options.join()) bad.push(`${id}: an option was added, removed, reordered or relabelled`);
    if (n.slots.join() !== r.slots.join() && prefix.join() === r.words.join()) bad.push(`${id}: its slots changed`);
    /* A row recorded before these two fields gains them by the append mode
       only, which never changes a value already recorded. */
    for (const [field, what] of [['voice', 'voice, emoji or beat'], ['effects', 'option replies or effects']]) {
      if (r[field] === undefined) {
        if (APPEND) { r[field] = n[field]; added.push(`${id} ${field}`); } else bad.push(`${id}: its ${what} not yet recorded (SIM_EVENT_DECK_WORDS=append)`);
      } else if (JSON.stringify(r[field]) !== JSON.stringify(n[field])) bad.push(`${id}: its ${what} changed`);
    }
  }
  for (const [id, n] of Object.entries(now)) {
    if (rows[id]) continue;
    if (APPEND) { rows[id] = n; added.push(id); } else bad.push(`${id}: a card with no row (SIM_EVENT_DECK_WORDS=append)`);
  }
  if (APPEND && added.length && !bad.length) {
    const text = `{\n  "note": "Round 1332: the frozen words of every compact pack (scripts/simEventDeck.mjs section 14). Appended by SIM_EVENT_DECK_WORDS=append only; a changed row is the lead's call.",\n  "rows": {\n${
      Object.entries(rows).map(([k, r]) => `    ${JSON.stringify(k)}: ${JSON.stringify(r)}`).join(',\n')}\n  }\n}\n`;
    fs.writeFileSync(WORDS_FILE, text);
    console.log(`   APPENDED ${added.length} rows or wordings to scripts/data/eventDeckWords.json: ${added.slice(0, 6).join(', ')}`);
  }
  for (const b of bad.slice(0, 8)) console.error(`     ${b}`);
  const count = Object.keys(rows).length;
  if (bad.length) fail(14, `${bad.length} frozen word breaks over ${count} recorded cards`);
  else if (count < 10) fail(14, `only ${count} recorded cards: nothing was tested`);
  else ok(`${count} recorded cards of ${Object.keys(packs).length} compact pack(s): every wording, option, story and slot as recorded`);
}

/* ═══ 15. ECONOMY: no pack pushes a meter past its own seasonal ceiling ═══ */

/* Correction 13: forty or fifty effect cards a season can drive board
   confidence and the budget to their ends the way Soccer Career's fame
   ran away. For every pack and every meter it moves, two answer policies
   on the FLEET drive (100 desks of ten seasons): BEST answers every open
   card the week it lands with the option that moves that meter most, WORST
   with the one that moves it least. The statistic is declared pressure:
   the chosen options' values on that meter summed per season, unclamped,
   a mean over the 1,000 seasons. A pack off ECONOMY_BASELINE declares
   `pressure` (its own ceiling per meter, set by its binding round from the
   real engine's meter harness) and fails on a meter it moves with no
   ceiling, or when BEST or WORST passes it either way. The seven GM packs
   predate the rule: their numbers are printed and written here, never
   gated (ECONOMY_MEASURED).

   ECONOMY_MEASURED 2026-10-13 on a runner (rc r1332-e-measure), BEST and
   WORST a season, lowest to highest over seeds 1 to 10 (seed to seed
   standard deviations 0.00 to 0.14):
     nfl      cash +0.10..+0.14 / -1.09..-1.00, fans +5.19..+5.40 / -2.15..-2.00,
              morale +4.38..+4.57 / -3.55..-3.42, trust +4.30..+4.42 / -3.75..-3.58
     nba      cash +0.99..+1.08 / -0.33..-0.30, fans +2.41..+2.51 / -1.53..-1.40,
              morale +2.27..+2.44 / -1.86..-1.74, trust +2.10..+2.28 / -1.64..-1.52
     mlb      cash 0 / -0.72..-0.66, fans +3.77..+3.98 / -2.74..-2.53,
              morale +1.82..+2.00 / -1.99..-1.83, trust +3.43..+3.56 / -1.70..-1.60
     nhl      cash 0 / -0.51..-0.48, fans +3.19..+3.31 / -1.88..-1.76,
              morale +1.55..+1.66 / -1.76..-1.66, trust +2.45..+2.62 / -1.71..-1.59
     college  cash +1.35..+1.61 / -3.94..-3.63, fans +1.92..+2.05 / -1.06..-0.97,
              morale +2.39..+2.52 / -2.15..-2.02, recruit +8.56..+8.95 / +0.34..+0.55,
              trust +2.26..+2.43 / -4.69..-4.45
     gym      cash +0.06..+0.07 / -0.06, trust +4.00..+4.20 / -3.21..-2.98
     afl      morale +3.05..+3.21 / -0.91..-0.86, trust +1.30..+1.42 / -1.32..-1.20
   The FX packs' ceilings (their own `pressure`) are each its highest
   measured push (either way) rounded up with at least eight seed to seed
   deviations of room: fx_registry ban 10.23 (12), board 10.25 (12), cash
   6.88 (8), fans 3.44 (4), form 6.88 (8), fund 5.16 (6), morale 3.44 (4),
   recruit 6.82 (8), trust 6.83 (8); fx_compact morale 19.39 (20), trust
   38.79 (40). The pressure control multiplies fx_compact's moves by ten. */
const ECONOMY_BASELINE = ['afl', 'college', 'gym', 'mlb', 'nba', 'nfl', 'nhl'];
const ECONOMY_FX = {
  fx_registry: { pack: FX_REGISTRY, bind: { fx: FX_REGISTRY_DEF } },
  fx_compact: { pack: FX_COMPACT, bind: COMPACT_BIND },
};
if (runs(15)) {
  console.log('15) Economy: every meter a pack moves, BEST and WORST answered, its seasonal push under the pack\'s own ceiling');
  const valueOn = (c, meter) => {
    const built = { trust: c.karma, fans: c.popularity, cash: c.cash, morale: c.morale, recruit: c.recruit }[meter];
    if (built !== undefined || ['trust', 'fans', 'cash', 'morale', 'recruit'].includes(meter)) return built ?? 0;
    const raw = c.fx?.[meter];
    return raw === undefined ? 0 : typeof raw === 'number' ? raw : raw.v;
  };
  const metersOf = p => [...new Set(p.events.flatMap(e => e.choices).flatMap(c => ['trust', 'fans', 'cash', 'morale', 'recruit', ...Object.keys(c.fx ?? {})].filter(m => valueOn(c, m) !== 0)))].sort();
  const pressureOf = (pack, tag, meter, sign, seed, bind) => {
    let total = 0;
    const policy = (s, got, bound, rng, lines) => {
      for (const m of openOf(s)) {
        let best = 0;
        m.choices.forEach((c, i) => { if (sign * valueOn(c, meter) > sign * valueOn(m.choices[best], meter)) best = i; });
        total += valueOn(m.choices[best], meter);
        lines.push(E.answerGmInbox(s, m.id, best, bound));
      }
    };
    for (let d = 0; d < DRIVES.FLEET.desks; d++) runDesk(pack, tag, seed, 'FLEET', d, { policy, bind });
    return total / (DRIVES.FLEET.desks * SEASONS);
  };
  /* Every index pack (INDEX_PACKS, not a list kept here) and the FX packs. */
  const packs = { ...Object.fromEntries(Object.entries(INDEX_PACKS).map(([k, p]) => [k, { pack: p, bind: indexBind(k, p) }])), ...ECONOMY_FX };
  for (const [k, { bind }] of Object.entries(packs)) {
    if (bind === null) { fail(15, `${k} moves fx keys and has no PACK_BINDS entry, so the kit cannot bind it`); delete packs[k]; }
  }
  if (CONTROL === 'pressure') {
    const p = packs.fx_compact.pack;
    const times = c => ({ ...c, karma: c.karma * 10, ...(c.morale ? { morale: c.morale * 10 } : {}) });
    packs.fx_compact = { ...packs.fx_compact, pack: { ...p, events: p.events.map(e => ({ ...e, choices: e.choices.map(times) })) } };
    if (!packs.fx_compact.pack.events.some(e => e.choices.some(c => c.karma >= 20))) { console.error('pressure control changed nothing, refusing to run'); process.exit(2); }
  }
  const lines = [];
  for (const [k, { pack, bind }] of Object.entries(packs)) {
    const meters = metersOf(pack);
    const parts = [];
    for (const meter of meters) {
      const hi = pressureOf(pack, k, meter, 1, SEED, bind);
      const lo = pressureOf(pack, k, meter, -1, SEED, bind);
      parts.push(`${meter} ${hi >= 0 ? '+' : ''}${hi.toFixed(2)} / ${lo >= 0 ? '+' : ''}${lo.toFixed(2)}`);
      if (ECONOMY_BASELINE.includes(k)) continue;
      const cap = pack.pressure?.[meter];
      if (cap === undefined) fail(15, `${k} moves ${meter} and declares no pressure ceiling for it`);
      else if (Math.max(Math.abs(hi), Math.abs(lo)) > cap) fail(15, `${k}: ${meter} pushed ${hi.toFixed(2)} (BEST) and ${lo.toFixed(2)} (WORST) a season, ceiling ${cap}`);
      if (MEASURE) console.log(`   measure: ${k} ${meter} BEST and WORST at seeds 1 to 10: ${TEN.map(sd => `${pressureOf(pack, k, meter, 1, sd, bind).toFixed(2)}/${pressureOf(pack, k, meter, -1, sd, bind).toFixed(2)}`).join(', ')}`);
    }
    if (MEASURE && ECONOMY_BASELINE.includes(k)) {
      for (const meter of meters) console.log(`   measure: ${k} ${meter} BEST and WORST at seeds 1 to 10: ${TEN.map(sd => `${pressureOf(pack, k, meter, 1, sd, bind).toFixed(2)}/${pressureOf(pack, k, meter, -1, sd, bind).toFixed(2)}`).join(', ')}`);
    }
    lines.push(`${k} ${parts.join(', ')}`);
  }
  for (const l of lines) console.log(`   pressure a season (BEST / WORST): ${l}`);
  const missing = ECONOMY_BASELINE.filter(k => !packs[k]);
  if (missing.length) fail(15, `ECONOMY_BASELINE names packs the kit does not know: ${missing.join(', ')}`);
  if (!red.has(15)) ok(`${Object.keys(packs).length} packs: the ${ECONOMY_BASELINE.length} on the baseline printed, every other pack under its own ceiling on every meter it moves`);
}

/* ═══ 16. BYTES AND LAZY: what an event costs, and the deck in no eager chunk ═══ */

/* Correction 9: the whole deck (engine, rules and words) is one lazy chunk
   W3 loads before Play enables, so nothing here may sit in an eager chunk.
   Bytes per event: each pack module the indexes import, minified alone by
   esbuild and gzipped (zlib, its default level), divided by its events;
   the engine the same way (alone, and bundled with what it pulls in); the
   projection for 420 and 690 events. A report, written in BYTES_MEASURED
   below; W3 states its chunk. The fence: src read as code (comments
   stripped as section 7 does), every file that imports the engine, a pack
   index or GmInboxPanel is one of the deck's own files, a test, or uses
   `import type` or a dynamic `import(`. LAZY_IMPORTERS, append only, takes
   the modules W2 and W3 add (the lazy chunk's own entry).
   BYTES_MEASURED 2026-10-13 (Round 1332's head): the seven GM packs, 54
   events, 542 B minified and 214 B gzipped an event (each module alone,
   esbuild minify, zlib's default level), so 420 events about 222 K
   minified and 88 K gzipped, 690 about 365 K and 144 K. The engine
   src/lib/gmInbox.ts: 28,478 B LF, 8,160 B minified, 3,298 B gzipped on
   the base (082fc277) and 52,759 B LF, 16,233 B minified, 6,106 B gzipped
   here; bundled with what it pulls in (careerInbox's answer flow,
   careerEventDeck's ledger, keyedRng), 16,891 B and 6,379 B. After the
   review fix pass (rc r1332-fx-c, ba06f054): 57,375 B LF, 17,087 B
   minified, 6,350 B gzipped; bundled 17,742 B and 6,627 B. */
const LAZY_IMPORTERS = [];
/* Round 1334 (W2): Soccer Career's binding, the lazy soccer chunk's own entry
   (src/lib/soccerDeckGate.ts loads it with a dynamic import). */
LAZY_IMPORTERS.push('src/lib/soccerDeck.ts');
if (runs(16)) {
  console.log('16) Bytes and lazy: bytes per event, and nothing that is not the deck imports it eagerly');
  const zlib = await import('node:zlib');
  const { transform } = await import('esbuild');
  const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const gz = s => zlib.gzipSync(Buffer.from(s)).length;
  const minOf = async rel => (await transform(readSrc(rel), { loader: rel.endsWith('x') ? 'tsx' : 'ts', minify: true, format: 'esm' })).code;
  const bundled = async rel => (await build({ entryPoints: [path.join(ROOT, rel)], bundle: true, minify: true, write: false, format: 'esm',
    platform: 'browser', alias: { '@': path.join(ROOT, 'src') }, absWorkingDir: ROOT, logLevel: 'error' })).outputFiles[0].text;
  const rows = [];
  let packBytes = 0;
  let packGz = 0;
  let events = 0;
  for (const [rel, name] of PACK_INDEXES) {
    const idx = readSrc(rel);
    const files = [...strip(idx).matchAll(/from\s+['"]\.\/([\w-]+)['"]/g)].map(m => `${path.posix.dirname(rel)}/${m[1]}.ts`);
    const packsHere = B[`packs${PACK_INDEXES.findIndex(p => p[1] === name)}`];
    for (const f of files) {
      const min = await bundled(f);
      const seat = Object.keys(packsHere).find(k => strip(readSrc(f)).includes(`seat: '${k}'`));
      const n = seat ? packsHere[seat].events.length : 0;
      if (!n) { fail(16, `${f}: no pack of ${rel} found in it`); continue; }
      packBytes += min.length; packGz += gz(min); events += n;
      rows.push(`${path.posix.basename(f, '.ts')} ${n} events ${min.length} B min ${gz(min)} B gz (${Math.round(gz(min) / n)} B gz an event)`);
    }
  }
  const engineLf = Buffer.byteLength(readSrc(ENGINE_REL));
  const alone = await minOf(ENGINE_REL);
  const withDeps = await bundled(ENGINE_REL);
  const perMin = packBytes / Math.max(1, events);
  const perGz = packGz / Math.max(1, events);
  console.log(`   packs: ${rows.join('; ')}`);
  console.log(`   ${events} events: ${Math.round(perMin)} B minified, ${Math.round(perGz)} B gzipped an event (each module alone); 420 events about ${Math.round(perMin * 420 / 1024)} K min ${Math.round(perGz * 420 / 1024)} K gz, 690 about ${Math.round(perMin * 690 / 1024)} K min ${Math.round(perGz * 690 / 1024)} K gz`);
  console.log(`   the engine: ${engineLf} B LF, ${alone.length} B minified alone (${gz(alone)} B gzipped), ${withDeps.length} B minified with what it pulls in (${gz(withDeps)} B gzipped)`);
  if (events < 50) fail(16, `only ${events} events measured: the byte report measures nothing`);
  /* The fence. */
  const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(`${dir}/${d.name}`)
    : /\.(ts|tsx)$/.test(d.name) ? [`${dir}/${d.name}`] : []));
  const files = walk('src');
  const DECK = ['src/lib/gmInbox', 'src/components/front-office-shared/GmInboxPanel', ...PACK_INDEXES.map(([rel]) => rel.replace(/\.tsx?$/, ''))];
  const deckDirs = PACK_INDEXES.map(([rel]) => path.posix.dirname(rel));
  const own = f => f === 'src/lib/gmInbox.ts' || f === 'src/components/front-office-shared/GmInboxPanel.tsx' || deckDirs.some(d => f.startsWith(`${d}/`));
  const isTest = f => /\.test\.tsx?$/.test(f) || f.startsWith('src/test/');
  const resolve = (from, spec) => {
    const p = spec.startsWith('@/') ? `src/${spec.slice(2)}` : spec.startsWith('.') ? path.posix.normalize(`${path.posix.dirname(from)}/${spec}`) : null;
    if (!p) return null;
    const bare = p.replace(/\.(ts|tsx|js)$/, '');
    /* A pack module imported on its own is the deck too, not only its index. */
    if (deckDirs.some(d => bare.startsWith(`${d}/`))) return bare;
    return DECK.includes(bare) ? bare : DECK.includes(`${bare}/index`) ? `${bare}/index` : null;
  };
  let read = 0;
  const eager = [];
  let lazyOk = 0;
  for (const f of files) {
    let code = strip(readSrc(f));
    if (CONTROL === 'eager' && f === 'src/pages/FrontOffice.tsx') code = `import { gmInboxWeek } from '@/lib/gmInbox';\n${code}`;
    read++;
    for (const m of code.matchAll(/\b(import|export)\s+(type\s+)?[^;'"]*?\bfrom\s+['"]([^'"]+)['"]/g)) {
      const hit = resolve(f, m[3]);
      if (!hit) continue;
      if (m[2] || own(f) || isTest(f)) continue;
      if (LAZY_IMPORTERS.includes(f)) { lazyOk++; continue; }
      eager.push(`${f} imports ${m[3]}`);
    }
    for (const m of code.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)) if (resolve(f, m[1]) && !own(f) && !isTest(f)) eager.push(`${f} imports ${m[1]} for its side effects`);
  }
  if (CONTROL === 'eager' && !files.includes('src/pages/FrontOffice.tsx')) { console.error('eager control: src/pages/FrontOffice.tsx is gone, refusing to run'); process.exit(2); }
  for (const b of eager.slice(0, 6)) console.error(`     ${b}`);
  if (read < 500) fail(16, `only ${read} src files read: the fence saw nothing`);
  if (eager.length) fail(16, `${eager.length} eager imports of the deck outside it`);
  else ok(`${read} src files read as code: only the deck's own files, tests, type imports and dynamic imports reach the engine, a pack index or GmInboxPanel${lazyOk ? ` (${lazyOk} on LAZY_IMPORTERS)` : ''}`);
}

/* ═══ end ═══ */


console.log('');
console.log(`runtime ${secs()} s`);
if (failures > 0) {
  console.error(`simEventDeck: ${failures} failure${failures === 1 ? '' : 's'}, red sections ${[...red].sort((a, b) => a - b).join(', ')}${CONTROL ? ` (CONTROL=${CONTROL} fired)` : ''}`);
  process.exit(1);
}
console.log(`simEventDeck: green.${SECTIONS.length ? ` Sections ${SECTIONS.join(', ')} only.` : ''}${CONTROL ? ` CONTROL=${CONTROL} did not fire, which is itself a failure of the control.` : ''}`);
if (CONTROL) process.exit(3);
