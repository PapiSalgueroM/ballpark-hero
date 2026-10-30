/**
 * Round 1601 harness: Club Manager, tap any player to see his stats for this season and every season the save played.
 *
 * WHAT THE ROUND DID. finishSeason writes one short row for every man of mine who played that season (squad and men
 * out on loan) into one optional CareerState list, pastLines ([id, rows][], never a map by id, never on the CMPlayer),
 * and sets pastFrom once (src/lib/clubManagerCareerLines.ts, called once at the end of finishSeason). A card reads it.
 * The failure modes: the archive moves a result or a seeded draw; a row is not his line; a man with no game gains a
 * key; a man who left keeps his rows; the cap does not hold; an old save is stamped on load; a daily gains a key.
 *
 * WHAT IT PLAYS. A fleet (club x seed, three whole seasons with their summers, every match a quick sim, the board
 * nudged the way simClubManagerSaveSize nudges it) on one seeded stream each, with the clock pinned (youth ids carry
 * it), on two or three engines, each a module of its own playing the careers in the same order: the candidate as
 * committed; CARDS_OFF, the same source with the one archive call taken out; and, when CARDS_BASE names a worktree of
 * the base commit, that commit's own source. Sections:
 *   stream   the candidate's whole save with pastLines and pastFrom removed is byte equal to CARDS_OFF's (and the
 *            base's) after every calendar entry, at every season end and after every summer, and the stream gave
 *            the same count of draws
 *   archive  just before finishSeason the harness copies every man's line; after it every man with a game holds
 *            exactly one row for that season equal to the harness's own row of the copy, a man with none holds no
 *            entry he did not hold before, nobody outside the squad and the loans holds one, no entry is empty;
 *            after the summer the list is unchanged; pastFrom is the first season ended and never moves; nobody
 *            holds more than PAST_KEPT rows; the careful reader reads a JSON round trip as the same list
 *   cards    the card equals the save (src/lib/clubManagerCards.ts), on the first seed of every club: at every fifth
 *            entry, every season end and after every summer, for every man of mine, this season is his line, the
 *            league line is comp.league with his league clean sheets from the book (left off on a late book), his
 *            goals and assists are his numbers on the boards (plus his `b` line on a late book; never clean sheets
 *            there), and his seasons are the archive's with history's clubs; at every season end every rival book
 *            row reads as that row on its card, with the roster's facts or, for a man the roster no longer holds,
 *            none and the left club note; the late and thin notes follow the book; a man of a club outside the
 *            league reads no league line and the outside note; two men of one name in different positions at one
 *            club each read their own row; and on the two old saves six entries after the load (a late book)
 *   cap      a renewing Everton career (every man whose deal is in its last year renewed each summer through the
 *            engine's own renewContract) of CARDS_LONG seasons: the most rows any man held reaches PAST_KEPT (else
 *            exit 2, could not run) and never passes it; and a constructed squad archived twelve times holds exactly
 *            PAST_KEPT. Printed, never gated: the save's bytes a season, the archive's bytes and the slope over
 *            seasons 4 to the end, for the lead's size ruling against simClubManagerSaveSize's SIZE_BUDGET and
 *            SLOPE_CAP (and the base arm's bytes when CARDS_BASE is set)
 *   oldsave  the two committed old saves simCmLeagueBook loads (Sevilla, Valencia), through loadCareer: neither key
 *            after the load and the loaded save byte equal to CARDS_OFF's load; one season played out from each:
 *            pastFrom is that season and every row is that season's; and a save parked on its season review by the
 *            engine before the round (finishSeason already ran there) gains nothing on load, nothing at the summer,
 *            and sets pastFrom at the NEXT season end
 *   dailies  Manager Hot Seat days played through their whole leash and Deadline Day runs hold neither key
 *   markup   with no card provider above them, the Squad screen, the Stats screen, a leaders board and a club page,
 *            rendered (react-dom/server, inside a MemoryRouter) on three saves of the fleet, draw no card link, and
 *            with CARDS_BASE their markup is byte equal to the base commit's. This protects the existing SSR
 *            recordings only: the app always mounts the provider, so the shipped markup changes by design
 *
 * CONTROLS (CARDS_CONTROL=<name>), each asserts its anchor occurs exactly as often as it says before it is applied,
 * and the run prints how many checks it failed; a control is proven only by a red in the section it names:
 *   draw       the writer draws once a man                                   -> stream
 *   emptykey   a man with no row is given an empty entry                     -> archive
 *   offbyone   a row's goals are one more than his line                      -> archive
 *   noarchive  the call is taken out of finishSeason                         -> archive, oldsave
 *   nocap      the writer's slice to PAST_KEPT is gone                       -> cap
 *   loadwrite  loadCareer stamps pastFrom                                    -> oldsave
 *   allcomps   the reader's league line is the all competitions line        -> cards
 *   namekey    the reader finds a rival's book row by name alone            -> cards
 *   linkalways CmCardLink draws its button with no provider above it         -> markup
 *   hotseat    the Hot Seat calls finishSeason after every match it plays    -> dailies
 * Exit 0 green, 1 red (or a control fired), 2 could not run, 3 a control did not fire in its section.
 *
 * Run: node scripts/simCmPlayerCard.mjs                     (CARDS_SEEDS=5 is the round's fleet, the default 2)
 *      CARDS_BASE=<worktree of the base> node scripts/simCmPlayerCard.mjs
 *      CARDS_CONTROL=draw node scripts/simCmPlayerCard.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.CARDS_BASE ? path.resolve(process.env.CARDS_BASE) : null;
const CONTROL = process.env.CARDS_CONTROL || '';
const SEEDS = Number(process.env.CARDS_SEEDS ?? 2);
const SEASONS = Number(process.env.CARDS_SEASONS ?? 3);
const LONG = Number(process.env.CARDS_LONG ?? 15);
const T0 = Date.now();
const cannot = why => { console.error(`simCmPlayerCard: cannot run: ${why}`); process.exit(2); };

const ENGINE = 'src/lib/clubManager.ts';
const LINES = 'src/lib/clubManagerCareerLines.ts';
const HOT = 'src/lib/managerHotSeat.ts';
const CARDS = 'src/lib/clubManagerCards.ts';
const CALL = '  archiveCareerSeason(state);\n  state.pendingSummary = summary;';
const CARDS_OFF = [{ file: ENGINE, from: CALL, to: '  state.pendingSummary = summary;' }];

const CONTROLS = {
  draw: { section: 'stream', patches: [{ file: LINES, from: '    const rows = withSeasonRow(', to: '    Math.random();\n    const rows = withSeasonRow(' }] },
  emptykey: { section: 'archive', patches: [{ file: LINES, from: '    if (rows.length) next.push([p.id, rows]);', to: '    next.push([p.id, rows]);' }] },
  offbyone: { section: 'archive', patches: [{ file: LINES, from: '[season, apps, count(p.seasonGoals), ', to: '[season, apps, count(p.seasonGoals) + 1, ' }] },
  noarchive: { section: 'archive', patches: CARDS_OFF },
  nocap: { section: 'cap', patches: [{ file: LINES, from: '.sort((a, b) => a[0] - b[0]).slice(-PAST_KEPT);', to: '.sort((a, b) => a[0] - b[0]);' }] },
  loadwrite: { section: 'oldsave', patches: [{ file: ENGINE, from: '    ensureMadeUpNations(parsed);\n', to: '    ensureMadeUpNations(parsed);\n    parsed.pastFrom = 1;\n' }] },
  allcomps: { section: 'cards', patches: [{ file: CARDS, from: '    const lg = p.comp?.league;', to: '    const lg = { apps: p.apps, goals: p.seasonGoals, assists: p.seasonAssists, yellows: p.seasonYellows, reds: p.seasonReds, ratingSum: p.ratingSum };' }] },
  namekey: { section: 'cards', patches: [{ file: CARDS, from: 'boards.input.book.c[ref.club]?.m[rowKey({ n: ref.name, p: ref.pos, r: 0 })]', to: "Object.entries(boards.input.book.c[ref.club]?.m ?? {}).find(([key]) => key.slice(0, key.lastIndexOf('|')) === ref.name)?.[1]" }] },
  linkalways: { section: 'markup', patches: [{ file: 'src/components/club-manager/CmCards.tsx', from: '  if (!cards || !card) return only ? null : <>{children}</>;', to: '  if (!card) return only ? null : <>{children}</>;' }] },
  hotseat: { section: 'dailies', patches: [
    { file: HOT, from: '  playNextEntry,\n', to: '  playNextEntry,\n  finishSeason,\n' },
    { file: HOT, from: '    run.leash = run.leaguePlayed;\n  }\n  settle(run);', to: '    run.leash = run.leaguePlayed;\n  }\n  run.state = finishSeason(run.state).state;\n  settle(run);' },
  ] },
};
if (CONTROL && !CONTROLS[CONTROL]) cannot(`CARDS_CONTROL=${CONTROL} is not a control of this harness (${Object.keys(CONTROLS).join(', ')})`);
if (BASE && !fs.existsSync(path.join(BASE, ENGINE))) cannot(`CARDS_BASE=${BASE} holds no ${ENGINE}`);

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-cards-'));
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };

/** Bundle the engine at `root` with `patches` applied in memory; every patch must meet its anchor exactly once. */
async function engine(label, root, patches = []) {
  const entry = path.join(TMP, `${label}-entry.mjs`);
  const out = path.join(TMP, `${label}.bundle.mjs`);
  const P = f => JSON.stringify(path.join(root, f).replaceAll('\\', '/'));
  fs.writeFileSync(entry, [
    `export * as cm from ${P(ENGINE)};`,
    `export * as hs from ${P(HOT)};`,
    `export * as dd from ${P('src/lib/deadlineDay.ts')};`,
    fs.existsSync(path.join(root, LINES)) ? `export * as lines from ${P(LINES)};` : 'export const lines = null;',
    fs.existsSync(path.join(root, CARDS)) ? `export * as cards from ${P(CARDS)};` : 'export const cards = null;',
    `export * as book from ${P('src/lib/clubManagerLeagueBook.ts')};`,
    `export * as boards from ${P('src/lib/clubManagerLeagueBoards.ts')};`,
  ].join('\n') + '\n');
  const applied = new Set();
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
    absWorkingDir: root, alias: { '@': path.join(root, 'src') },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    plugins: [{ name: 'cm-cards-patch', setup(b) {
      b.onLoad({ filter: /\.ts$/ }, args => {
        const mine = patches.filter(p => path.resolve(root, p.file) === path.resolve(args.path));
        if (!mine.length) return undefined;
        let text = fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
        for (const p of mine) {
          const n = text.split(p.from).length - 1;
          if (n !== 1) throw new Error(`patch anchor occurs ${n} times, not once, in ${p.file}: ${p.from}`);
          text = text.split(p.from).join(p.to);
          applied.add(p);
        }
        return { contents: text, loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  if (applied.size !== patches.length) throw new Error(`${label}: ${patches.length - applied.size} patch(es) never met their file`);
  const mod = await import(pathToFileURL(out).href);
  await mod.cm.ensureAllEraRosters();
  return { label, cm: mod.cm, hs: mod.hs, dd: mod.dd, lines: mod.lines, cards: mod.cards, book: mod.book, boards: mod.boards };
}

/* ---------- the stream, the clock, the faces ---------- */
function seeded(seed) {
  let a = seed >>> 0;
  let calls = 0;
  const draw = () => {
    calls += 1;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  draw.calls = () => calls;
  return draw;
}
const NOW = 1791302400000;
/** Run `fn` on a seeded stream with the clock pinned; hands it the counter of draws. */
function onStream(seed, fn) {
  const draw = seeded(seed);
  const realRandom = Math.random;
  const realNow = Date.now;
  Math.random = draw;
  Date.now = () => NOW;
  try { return fn(draw); } finally { Math.random = realRandom; Date.now = realNow; }
}
const sha = text => createHash('sha256').update(text).digest('hex').slice(0, 24);
/** The whole save but the two keys of the round, as text. */
const strip = s => {
  if (!s || typeof s !== 'object') return JSON.stringify(s);
  const { pastLines, pastFrom, ...rest } = s;
  void pastLines; void pastFrom;
  return JSON.stringify(rest);
};
const wake = (mod, s) => { mod.cm.registerCustomClub(s.customClub ?? null, s.eraId); mod.cm.registerLeagueOverrides(s.leagueOverrides ?? null); return s; };
const nudge = s => (s.boardConfidence < 35 ? { ...s, boardConfidence: 55 } : s);

/* ---------- the verdict ---------- */
const failures = new Map();
const checks = new Map();
const tick = (section, n = 1) => checks.set(section, (checks.get(section) ?? 0) + n);
const shapes = new Set();
const fail = (section, msg) => {
  const list = failures.get(section) ?? [];
  /* The first failure of every shape is printed (the text after the last colon, digits folded), up to twenty. */
  const shape = `${section}:${String(msg).split(': ').slice(-1)[0].replace(/[0-9]+/g, 'N')}`;
  if (!shapes.has(shape) && shapes.size < 20) { shapes.add(shape); console.log(`  FAIL ${section}: ${msg}`); }
  list.push(msg);
  failures.set(section, list);
};

/* ---------- the fleet ---------- */
const CREST = { shape: 0, pattern: 2, color1: '#7c3aed', color2: '#f8fafc', initials: 'RA' };
const CREATED = { name: 'Real Anthony', stadium: 'Salguero Park', crest: CREST, budgetTier: 'mid', leagueId: 'premier', replacedClub: '' };
/* [club, era, spec]: league sizes 20, 20, 24, 18 (Hertha BSC's league is the thin one), a created club, an era. */
const CLUBS = [
  ['Everton', 'now'], ['Real Madrid', 'now'], ['Lincoln City', 'now'], ['Hertha BSC', 'now'],
  ['Real Anthony', 'now', CREATED], ['Arsenal', 'era2010'],
];
const seedOf = (ci, k) => (0x1601 + k * 7919 + ci * 131) >>> 0;
const FLEET = [];
for (let k = 0; k < SEEDS; k++) CLUBS.forEach(([club, era, spec], ci) => FLEET.push({ club, era, spec, seed: seedOf(ci, k), name: `${club}${era === 'now' ? '' : ` (${era})`} seed ${k}` }));

/**
 * One career on one engine: `seasons` whole seasons with their summers. Faces: the stripped save's hash and the
 * draw count after every calendar entry, after every finishSeason and after every summer. Hooks (optional):
 * before(s, season) the moment before finishSeason; finished(before, after, season); summer(fin, next, season).
 */
function playCareer(mod, f, hooks = {}, seasons = SEASONS) {
  const { cm } = mod;
  return onStream(f.seed, draw => {
    const faces = [];
    let s = f.spec ? cm.startCareer(f.club, f.era, f.spec) : cm.startCareer(f.club, f.era);
    faces.push(`start ${sha(strip(s))}|${draw.calls()}`);
    for (let season = 0; season < seasons; season++) {
      let guard = 0;
      while (s.week < s.calendar.length && guard++ < 220) {
        s = nudge(s);
        const r = cm.playNextEntry(s, { skipHalftime: true });
        s = r.state;
        faces.push(`${season}:${guard} ${sha(strip(s))}|${draw.calls()}`);
        hooks.entry?.(s, season);
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      if (s.sacked) { faces.push('sacked'); break; }
      hooks.before?.(s, season);
      const fin = cm.finishSeason(s).state;
      faces.push(`end ${season} ${sha(strip(fin))}|${draw.calls()}`);
      hooks.finished?.(s, fin, season);
      let next = hooks.renew ? hooks.renew(cm, fin) : fin;
      next = cm.startNextSeason(next);
      faces.push(`summer ${season} ${sha(strip(next))}|${draw.calls()}`);
      hooks.summer?.(fin, next, season);
      s = next;
    }
    return faces;
  });
}

/* ---------- the engines ---------- */
let candidate, off, base = null;
try {
  candidate = await engine('candidate', ROOT, CONTROL ? CONTROLS[CONTROL].patches.filter(p => !p.file.endsWith('.tsx')) : []);
  off = await engine('off', ROOT, CARDS_OFF);
  if (BASE) base = await engine('base', BASE);
} catch (e) { cannot(`a bundle did not build: ${e.message}`); }
if (!candidate.lines) cannot(`${LINES} is missing from the tree`);
const { PAST_KEPT } = candidate.lines;
console.log(`simCmPlayerCard: ${FLEET.length} careers of ${SEASONS} seasons, engines: candidate${CONTROL ? ` (control ${CONTROL})` : ''}, off${base ? ', base' : ''}; PAST_KEPT ${PAST_KEPT}`);

/* ---------- sections stream and archive ---------- */
const menOf = s => [...(s.squad ?? []), ...(s.loanedOut ?? []).map(l => l?.player).filter(Boolean)];
const rowOf = (p, season) => [season, p.apps ?? 0, p.seasonGoals ?? 0, p.seasonAssists ?? 0, p.cleanSheets ?? 0, Math.round((p.ratingSum ?? 0) * 10)];
const entriesOf = s => new Map((Array.isArray(s.pastLines) ? s.pastLines : []).map(e => [e[0], e[1]]));
const archiveHooks = (f, stats) => {
  let first = null;
  let held = null;
  return {
    before(s) { held = { men: menOf(s).map(p => ({ id: p.id, row: rowOf(p, s.season) })), had: entriesOf(s) }; },
    finished(s, fin) {
      const where = `${f.name} season ${s.season}`;
      if (first === null) first = s.season;
      tick('archive');
      if (fin.pastFrom !== first) fail('archive', `${where}: pastFrom is ${fin.pastFrom}, the first season ended was ${first}`);
      const raw = Array.isArray(fin.pastLines) ? fin.pastLines : [];
      if ('pastLines' in fin && !raw.length) fail('archive', `${where}: an empty pastLines key`);
      const now = entriesOf(fin);
      const ids = new Set(held.men.map(m => m.id));
      if (now.size !== raw.length) fail('archive', `${where}: one id holds two entries`);
      for (const [id, rows] of now) {
        tick('archive');
        if (!ids.has(id)) fail('archive', `${where}: ${id} holds rows but is neither in the squad nor out on loan`);
        if (!Array.isArray(rows) || !rows.length) fail('archive', `${where}: ${id} holds an empty entry`);
        else if (rows.length > PAST_KEPT) fail('archive', `${where}: ${id} holds ${rows.length} rows, over ${PAST_KEPT}`);
        stats.most = Math.max(stats.most, Array.isArray(rows) ? rows.length : 0);
      }
      for (const m of held.men) {
        tick('archive');
        const rows = now.get(m.id);
        const before = held.had.get(m.id);
        if (m.row[1] >= 1) {
          stats.rows += 1;
          const mine = (rows ?? []).filter(r => r[0] === s.season);
          if (mine.length !== 1) { fail('archive', `${where}: ${m.id} played ${m.row[1]} games and holds ${mine.length} rows for the season`); continue; }
          if (JSON.stringify(mine[0]) !== JSON.stringify(m.row)) fail('archive', `${where}: ${m.id}'s row ${JSON.stringify(mine[0])} is not his line ${JSON.stringify(m.row)}`);
          const kept = (before ?? []).filter(r => r[0] !== s.season).slice(-(PAST_KEPT - 1));
          if (JSON.stringify(rows.filter(r => r[0] !== s.season)) !== JSON.stringify(kept)) fail('archive', `${where}: ${m.id}'s earlier rows moved`);
        } else if (!before && rows) fail('archive', `${where}: ${m.id} played no game and gained an entry`);
        else if (before && JSON.stringify(rows) !== JSON.stringify(before)) fail('archive', `${where}: ${m.id} played no game and his rows changed`);
      }
      tick('archive');
      const back = candidate.lines.readPastLines(JSON.parse(JSON.stringify(raw)));
      if (JSON.stringify(back) !== JSON.stringify(raw)) fail('archive', `${where}: the careful reader does not read the saved list back as it is`);
    },
    summer(fin, next) {
      tick('archive');
      if (JSON.stringify(next.pastLines) !== JSON.stringify(fin.pastLines) || next.pastFrom !== fin.pastFrom) fail('archive', `${f.name} season ${fin.season}: the summer moved the archive`);
      if (next.squad.some(p => (p.apps ?? 0) !== 0 || p.seasonGoals !== 0)) fail('archive', `${f.name} season ${fin.season}: a live line was not wiped by the summer`);
    },
  };
};

/* ---------- section cards: the card equals the save ---------- */
const near = (a, b) => (a === null || b === null ? a === b : Math.abs(a - b) < 1e-9);
const avgOf = (apps, sum) => (apps > 0 ? Math.round((sum ?? 0) * 10) / 10 / apps : null);
const notesSeen = new Map();
const seeNote = n => notesSeen.set(n.k, (notesSeen.get(n.k) ?? 0) + 1);
/** Every man of mine against his own line, his league line, the boards and the archive. */
function checkMine(mod, s, where) {
  const { cm, cards, boards: bd, book } = mod;
  const lb = cm.leagueBoardsOf(s);
  const late = lb && lb.from !== null;
  const board = kind => new Map((lb ? bd.leaders(lb.input, kind, Number.MAX_SAFE_INTEGER) : []).filter(m => m.mine).map(m => [`${m.name}|${m.pos}`, m.n]));
  const goals = board('goals'), assists = board('assists'), sheets = board('sheets');
  const opened = late ? new Map((lb.input.book.b ?? []).map(t => [t[0], t])) : new Map();
  for (const p of s.squad) {
    tick('cards');
    const c = cards.playerCardOf(s, { k: 'mine', id: p.id });
    const who = `${where}: ${p.name} (${p.position})`;
    if (!c) { fail('cards', `${who}: no card`); continue; }
    c.notes.forEach(seeNote);
    const back = p.position === 'GK' || cm.groupOf(p.position) === 'DEF';
    const lg = p.comp?.league ?? {};
    const wantNow = [p.apps ?? 0, p.seasonGoals, p.seasonAssists, back ? p.cleanSheets ?? 0 : null, p.seasonYellows ?? 0, p.seasonReds ?? 0];
    const gotNow = [c.now?.apps, c.now?.goals, c.now?.assists, c.now?.cleanSheets, c.now?.yellows, c.now?.reds];
    if (JSON.stringify(gotNow) !== JSON.stringify(wantNow) || !near(c.now?.average ?? null, avgOf(p.apps ?? 0, p.ratingSum))) fail('cards', `${who}: this season ${JSON.stringify(gotNow)} is not his line ${JSON.stringify(wantNow)}`);
    const wantLg = [lg.apps ?? 0, lg.goals ?? 0, lg.assists ?? 0, back && lb && !late ? book.mineSheets(lb.input.book, p.id) : null];
    const gotLg = [c.league?.apps, c.league?.goals, c.league?.assists, c.league?.cleanSheets];
    if (JSON.stringify(gotLg) !== JSON.stringify(wantLg) || !near(c.league?.average ?? null, avgOf(lg.apps ?? 0, lg.ratingSum))) fail('cards', `${who}: league ${JSON.stringify(gotLg)} is not comp.league ${JSON.stringify(wantLg)}`);
    if (lb) {
      const key = `${p.name}|${p.position}`;
      const b = opened.get(p.id);
      /* Two of mine with one name and position share a board row: the board cannot tell them apart. */
      if (s.squad.filter(x => x.name === p.name && x.position === p.position).length === 1) {
        const g = (goals.get(key) ?? 0) + (b ? b[1] : 0), a = (assists.get(key) ?? 0) + (b ? b[2] : 0);
        if (c.league?.goals !== g || c.league?.assists !== a) fail('cards', `${who}: league ${c.league?.goals} goals ${c.league?.assists} assists, the boards say ${g} and ${a}`);
        /* The clean sheets board is keepers only (clubManagerLeagueBoards.ts ordered): a defender's are held to the book above. */
        if (p.position === 'GK' && !late && c.league?.cleanSheets !== (sheets.get(key) ?? 0)) fail('cards', `${who}: ${c.league?.cleanSheets} league clean sheets, the board says ${sheets.get(key) ?? 0}`);
      }
      if (back && late && !c.notes.some(n => n.k === 'late')) fail('cards', `${who}: a keeper or defender on a late book with no late note`);
    }
    const rows = mod.lines.pastOf(s.pastLines, p.id).slice().reverse();
    const want = rows.map(r => [r[0], s.history.find(h => h.season === r[0])?.club ?? null, r[1], r[2], r[3], back ? r[4] : null, r[5] / 10 / r[1]]);
    const got = c.past.map(l => { const m = k => l.metrics.find(x => x.key === k)?.value ?? null; return [l.season, l.club, m('apps'), m('goals'), m('assists'), m('cleanSheets'), m('rating')]; });
    if (JSON.stringify(got) !== JSON.stringify(want)) fail('cards', `${who}: seasons ${JSON.stringify(got).slice(0, 120)} are not the archive's ${JSON.stringify(want).slice(0, 120)}`);
    if (c.keptFrom !== (s.pastFrom ?? null)) fail('cards', `${who}: kept from ${c.keptFrom}, the save says ${s.pastFrom}`);
  }
}
/** Every rival row of the book, and one man outside the league. Returns how many rows were held. */
function checkRivals(mod, s, where) {
  const { cm, cards, book } = mod;
  const lb = cm.leagueBoardsOf(s);
  if (!lb) return 0;
  let n = 0;
  for (const row of book.bookRows(lb.input.book)) {
    tick('cards');
    n += 1;
    const c = cards.playerCardOf(s, { k: 'man', name: row.name, pos: row.pos, club: row.club });
    const who = `${where}: ${row.name} (${row.pos}, ${row.club})`;
    if (!c) { fail('cards', `${who}: no card for a book row`); continue; }
    c.notes.forEach(seeNote);
    const back = row.pos === 'GK' || cm.groupOf(row.pos) === 'DEF';
    const want = [null, row.goals, row.assists, back ? row.cleanSheets : null, null];
    const got = [c.league?.apps, c.league?.goals, c.league?.assists, c.league?.cleanSheets, c.league?.average];
    if (JSON.stringify(got) !== JSON.stringify(want)) fail('cards', `${who}: league ${JSON.stringify(got)} is not the book row ${JSON.stringify(want)}`);
    const man = cm.oppRosterFor(s, row.club).find(x => x.n === row.name && x.p === row.pos);
    if (man ? c.age !== man.a || c.rating !== man.r : c.age !== null || !c.notes.some(x => x.k === 'leftclub')) fail('cards', `${who}: roster facts ${c.age}/${c.rating} against ${man ? `${man.a}/${man.r}` : 'a man the roster no longer holds'}`);
    if ((lb.from !== null) !== c.notes.some(x => x.k === 'late')) fail('cards', `${who}: the late note does not follow the book`);
    if ((lb.share < 95) !== c.notes.some(x => x.k === 'thin')) fail('cards', `${who}: the thin note does not follow the share ${lb.share}`);
  }
  const other = s.leagueClubs.includes('Real Madrid') ? 'Everton' : 'Real Madrid';
  const out = cm.oppRosterFor(s, other)[0];
  tick('cards');
  const c = out && cards.playerCardOf(s, { k: 'man', name: out.n, pos: out.p, club: other });
  if (!c || c.league !== null || JSON.stringify(c.notes) !== '[{"k":"outside"}]') fail('cards', `${where}: a man of ${other} (outside the league) reads ${JSON.stringify(c && { league: c.league, notes: c.notes })}`);
  return n;
}
const cardStats = { mine: 0, rival: 0 };
let namesakeState = null;
const markupSaves = [];
const cardHooks = f => {
  let k = 0;
  return {
    entry(s) { if (++k % 5 === 0) { checkMine(candidate, s, `${f.name}, entry ${k}`); cardStats.mine += 1; } },
    before(s) { if (!namesakeState) namesakeState = JSON.parse(JSON.stringify(s)); if (markupSaves.length < 3 && !markupSaves.some(x => x.clubName === s.clubName)) markupSaves.push(JSON.parse(JSON.stringify(s))); checkMine(candidate, s, `${f.name}, season ${s.season} end`); cardStats.rival += checkRivals(candidate, s, `${f.name}, season ${s.season} end`); },
    summer(fin, next) { checkMine(candidate, next, `${f.name}, after summer ${fin.season}`); },
  };
};
const both = (a, b) => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(key => [key, (...args) => { a[key]?.(...args); b[key]?.(...args); }]));
{
  const stats = { rows: 0, most: 0 };
  const facesC = FLEET.map((f, i) => playCareer(candidate, f, i < CLUBS.length ? both(archiveHooks(f, stats), cardHooks(f)) : archiveHooks(f, stats)));
  console.log(`cards   ${checks.get('cards') ?? 0} checks: my men at ${cardStats.mine} points, ${cardStats.rival} rival book rows at season ends, on the first seed of every club; notes seen ${JSON.stringify(Object.fromEntries(notesSeen))}`);
  const arms = [['off', off], ...(base ? [['base', base]] : [])];
  for (const [name, mod] of arms) {
    let same = 0, total = 0;
    FLEET.forEach((f, i) => {
      const want = playCareer(mod, f);
      const got = facesC[i];
      total += Math.max(want.length, got.length);
      tick('stream');
      const n = Math.min(want.length, got.length);
      let k = 0;
      while (k < n && want[k] === got[k]) k++;
      same += k;
      if (k < Math.max(want.length, got.length)) fail('stream', `${f.name}: the candidate leaves the ${name} engine at face ${k} of ${want.length} (${got[k] ?? 'none'} against ${want[k] ?? 'none'})`);
    });
    console.log(`stream  ${same} of ${total} faces equal to the ${name} engine (every entry, season end and summer, with the draw count)`);
  }
  if (!base) console.log('stream  base arm NOT RUN: set CARDS_BASE to a worktree of the base commit');
  console.log(`archive ${checks.get('archive') ?? 0} checks; ${stats.rows} rows written and checked, the most rows one man held ${stats.most}`);
  if (!stats.rows) fail('archive', 'no row was written in the whole fleet');
  if (!cardStats.rival) fail('cards', 'no rival book row was held against its card in the whole fleet');
}
/* Two men of one name in different positions at one rival club (the case rowKey exists for): two goals moved off
   one row onto "Nando Hedlund|ST" and one onto "Nando Hedlund|GK", so the club's goals still add up; each card
   must read its own row. */
{
  const s = namesakeState;
  if (!s) cannot('no season end was reached, so the namesake case has no save');
  const rows = s.leagueBook?.c ? Object.entries(s.leagueBook.c) : [];
  const hit = rows.map(([club, e]) => [club, Object.entries(e.m).find(([, r]) => r[0] >= 3)]).find(([, r]) => r);
  if (!hit) cannot('no rival row of the saved season end holds three goals to move');
  const [club, [, row]] = hit;
  row[0] -= 3;
  s.leagueBook.c[club].m['Nando Hedlund|ST'] = [2, 0, 0, 1];
  s.leagueBook.c[club].m['Nando Hedlund|GK'] = [1, 0, 0, 1];
  for (const [pos, goals] of [['ST', 2], ['GK', 1]]) {
    tick('cards');
    const c = candidate.cards.playerCardOf(s, { k: 'man', name: 'Nando Hedlund', pos, club });
    if (c?.league?.goals !== goals) fail('cards', `Nando Hedlund (${pos}) at ${club}: the card reads ${c?.league?.goals} goals, his row holds ${goals}`);
  }
  console.log(`cards   the namesake case at ${club}: each of two men of one name reads his own row`);
}

/* ---------- section cap: a renewing career, and a constructed squad ---------- */
function slopeOf(points) {
  const n = points.length;
  const mx = points.reduce((a, p) => a + p[0], 0) / n;
  const my = points.reduce((a, p) => a + p[1], 0) / n;
  let num = 0, den = 0;
  for (const [x, y] of points) { num += (x - mx) * (y - my); den += (x - mx) * (x - mx); }
  return den ? num / den : 0;
}
/** Every man whose deal is in its last year is renewed through the engine's own renewContract, if the money is there. */
const renewAll = (cm, fin) => {
  let s = fin;
  for (const p of fin.squad) if (!p.onLoan && (p.contractYears ?? 0) <= 1) s = cm.renewContract(s, p.id) ?? s;
  return s;
};
{
  const long = { club: 'Everton', era: 'now', seed: seedOf(0, 0), name: `Everton renewing, ${LONG} seasons` };
  const measure = mod => {
    const sizes = [];
    const archive = [];
    let most = 0;
    playCareer(mod, long, {
      renew: renewAll,
      finished(s, fin) {
        sizes.push(JSON.stringify(fin).length);
        archive.push(JSON.stringify(fin.pastLines ?? []).length);
        for (const e of Array.isArray(fin.pastLines) ? fin.pastLines : []) {
          tick('cap');
          most = Math.max(most, e[1].length);
          if (e[1].length > PAST_KEPT) fail('cap', `${long.name}, season ${s.season}: ${e[0]} holds ${e[1].length} rows, over ${PAST_KEPT}`);
        }
      },
    }, LONG);
    return { sizes, archive, most };
  };
  const c = measure(candidate);
  const pts = c.sizes.map((b, i) => [i + 1, b]).filter(([i]) => i >= 4);
  const slope = pts.length >= 3 ? slopeOf(pts) : NaN;
  console.log(`cap     ${long.name}: ${c.sizes.length} seasons, the most rows one man held ${c.most}`);
  console.log(`size    candidate bytes a season: ${c.sizes.join(' ')}`);
  console.log(`size    archive bytes a season:   ${c.archive.join(' ')}`);
  console.log(`size    season ${c.sizes.length}: ${c.sizes[c.sizes.length - 1]} bytes, of which the archive ${c.archive[c.archive.length - 1]}; slope over seasons 4 to ${c.sizes.length} ${Number.isFinite(slope) ? slope.toFixed(0) : 'n/a'} bytes a season (printed for the lead, not gated here)`);
  if (base) {
    const b = measure(base);
    const bp = b.sizes.map((x, i) => [i + 1, x]).filter(([i]) => i >= 4);
    console.log(`size    base bytes a season:      ${b.sizes.join(' ')}`);
    console.log(`size    base season ${b.sizes.length}: ${b.sizes[b.sizes.length - 1]} bytes, slope ${bp.length >= 3 ? slopeOf(bp).toFixed(0) : 'n/a'}; candidate minus base: ${c.sizes.map((x, i) => x - (b.sizes[i] ?? 0)).join(' ')}`);
  }
  /* A control aimed at another section is judged there; the cap is then printed, not required. */
  const judged = !CONTROL || CONTROLS[CONTROL].section === 'cap';
  if (judged && c.sizes.length < LONG) cannot(`${long.name} ended after ${c.sizes.length} seasons (sacked), so the cap was never reached`);
  if (judged && c.most < PAST_KEPT) cannot(`${long.name}: nobody reached ${PAST_KEPT} rows in ${LONG} seasons, so the cap was never tried`);
  /* The cap on a constructed squad, so it is tried whatever the engine's renewals do. */
  const squad = Array.from({ length: 25 }, (_, i) => ({ id: `m${i}`, apps: 1 + (i % 30), seasonGoals: i % 4, seasonAssists: i % 3, cleanSheets: 0, ratingSum: 6.5 * (1 + (i % 30)) }));
  const st = { season: 1, squad };
  for (let season = 1; season <= PAST_KEPT + 2; season++) { st.season = season; candidate.lines.archiveCareerSeason(st); }
  tick('cap');
  const lens = (st.pastLines ?? []).map(e => e[1].length);
  if (lens.length !== 25 || lens.some(n => n !== PAST_KEPT)) fail('cap', `a constructed squad archived ${PAST_KEPT + 2} times holds ${[...new Set(lens)].join(', ')} rows a man, not ${PAST_KEPT}`);
  else console.log(`cap     a constructed squad of 25 archived ${PAST_KEPT + 2} times holds ${PAST_KEPT} rows a man, the newest`);
}

/* ---------- section oldsave ---------- */
const playOut = (mod, s) => {
  let guard = 0;
  while (s.week < s.calendar.length && guard++ < 220) {
    const r = mod.cm.playNextEntry(nudge(s), { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver' || s.sacked) break;
  }
  return s;
};
const loadOn = (mod, raw) => { store.clear(); store.set(mod.cm.SAVE_KEY, raw); return mod.cm.loadCareer(); };
const onlySeason = (fin, season) => (Array.isArray(fin.pastLines) ? fin.pastLines : []).every(e => e[1].every(r => r[0] === season));
{
  const saves = [
    ['the committed save of Round 1052 (Sevilla)', 'scripts/data/cmOldSave1052Fixture.json', 0x7001],
    ['the committed second tier save (Valencia)', 'scripts/data/cmSecondTierOldSaveFixture.json', 0x7002],
  ];
  for (const [name, file, seed] of saves) {
    /* Line endings folded, as every read of this harness does (simHarnessAnchors). */
    const raw = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
    const s = onStream(seed, () => loadOn(candidate, raw));
    const o = onStream(seed, () => loadOn(off, raw));
    tick('oldsave', 3);
    if (!s) { fail('oldsave', `${name}: did not load`); continue; }
    if ('pastLines' in s || 'pastFrom' in s) fail('oldsave', `${name}: the load wrote ${'pastLines' in s ? 'pastLines' : 'pastFrom'}`);
    if (JSON.stringify(s) !== JSON.stringify(o)) fail('oldsave', `${name}: the loaded save is not byte equal to the off engine's load`);
    /* The card on an old save: a late book after its first entries, and the kept from line. */
    const mid = onStream(seed + 5, () => { let x = s; for (let i = 0; i < 6; i++) x = candidate.cm.playNextEntry(nudge(x), { skipHalftime: true }).state; return x; });
    checkMine(candidate, mid, `${name}, six entries after the load`);
    const rivals = checkRivals(candidate, mid, `${name}, six entries after the load`);
    const first = Math.min(mid.season, ...mid.history.map(h => h.season));
    const kept = candidate.cards.playerCardOf(mid, { k: 'mine', id: mid.squad[0].id })?.notes.find(n => n.k === 'keptfrom');
    tick('oldsave');
    if (mid.season > first ? kept?.from !== mid.season : kept) fail('oldsave', `${name}: the kept from line reads ${JSON.stringify(kept)} on season ${mid.season} of a career from season ${first}`);
    console.log(`oldsave ${name}: six entries on, book ${candidate.cm.leagueBoardsOf(mid)?.from ?? 'none'} (late round index), ${rivals} rival rows held, kept from ${kept?.from ?? 'no line'}`);
    const fin = onStream(seed + 1, () => candidate.cm.finishSeason(playOut(candidate, s)).state);
    if (fin.pastFrom !== s.season) fail('oldsave', `${name}: after its season ${s.season} ended pastFrom is ${fin.pastFrom}`);
    if (!onlySeason(fin, s.season)) fail('oldsave', `${name}: a row of a season before ${s.season} was written`);
    console.log(`oldsave ${name}: loaded clean, season ${s.season} played out, pastFrom ${fin.pastFrom}, ${(fin.pastLines ?? []).length} men with a row`);
  }
  /* Parked on its season review by the engine before the round: finishSeason already ran there, so that season
     gets no row, and pastFrom is set at the NEXT season end. */
  const f = { club: 'Everton', era: 'now', seed: 0x7010 };
  const parked = onStream(f.seed, () => off.cm.finishSeason(playOut(off, off.cm.startCareer(f.club, f.era))).state);
  const raw = JSON.stringify(parked);
  const s = onStream(f.seed + 1, () => loadOn(candidate, raw));
  tick('oldsave', 4);
  if (!s) fail('oldsave', 'the parked save did not load');
  else {
    if ('pastLines' in s || 'pastFrom' in s) fail('oldsave', 'the parked save gained a key on load');
    const next = onStream(f.seed + 2, () => candidate.cm.startNextSeason(s));
    if ('pastLines' in next || 'pastFrom' in next) fail('oldsave', 'the parked save gained a key at its summer');
    const fin = onStream(f.seed + 3, () => candidate.cm.finishSeason(playOut(candidate, next)).state);
    if (fin.pastFrom !== next.season || !onlySeason(fin, next.season) || !(fin.pastLines ?? []).length) fail('oldsave', `the parked save: after season ${next.season} pastFrom is ${fin.pastFrom} and its rows are ${JSON.stringify((fin.pastLines ?? []).slice(0, 1))}`);
    else console.log(`oldsave a save parked on its season ${parked.season} review: nothing on load or at the summer, pastFrom ${fin.pastFrom} after season ${next.season}`);
  }
}

/* ---------- section dailies ---------- */
{
  const HOT_DATES = ['2026-10-10', '2026-10-11', '2026-10-17', '2027-01-30'];
  const DEADLINE_DATES = ['2026-10-10', '2026-11-09'];
  const keyed = st => !!st && typeof st === 'object' && ('pastLines' in st || 'pastFrom' in st);
  for (const date of HOT_DATES) {
    const steps = onStream(0x7300, () => {
      const { hs } = candidate;
      try {
      const setup = hs.dailyHotSeat(date);
      let run = hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
      const seen = [keyed(run.state)];
      let guard = 0;
      while (!run.verdict && guard++ < 40) {
        run = hs.pendingPress(run) ? hs.answerHotSeatPress(run, 0) : hs.playHotSeatMatch(run, 'balanced', null);
        seen.push(keyed(run.state));
      }
      seen.push(keyed(hs.handoverState(run)));
      return seen;
      } catch (e) { fail('dailies', `Hot Seat ${date}: the run threw (${e.message})`); return []; }
    });
    tick('dailies', steps.length);
    const at = steps.indexOf(true);
    if (at >= 0) fail('dailies', `Hot Seat ${date}: the state carries the archive at step ${at} of ${steps.length}`);
  }
  for (const date of DEADLINE_DATES) {
    const st = onStream(0x7301, () => candidate.dd.startDeadlineDay(candidate.dd.dailyDeadlineDay(date)).state);
    tick('dailies');
    if (keyed(st)) fail('dailies', `Deadline Day ${date}: the state carries the archive`);
  }
  console.log(`dailies ${checks.get('dailies') ?? 0} states of ${HOT_DATES.length} Hot Seat days and ${DEADLINE_DATES.length} Deadline Day runs looked at`);
}

/* ---------- section markup: with no provider above them the hosts draw what they drew ---------- */
/* This protects the existing SSR recordings and every render with no card provider (the vitest files, the SSR
   harnesses). The app itself always mounts the provider, so the shipped markup changes by design: this is not a
   proof of the page's default path. */
function findUp(rel) {
  for (let d = ROOT; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, rel))) return path.join(d, rel);
    if (path.dirname(d) === d) return null;
  }
}
async function markupBundle(label, root, patches = []) {
  const NM = findUp('node_modules');
  if (!NM) cannot('no node_modules above the tree');
  const R = root.replaceAll('\\', '/');
  const entry = path.join(TMP, `${label}-markup-entry.mjs`);
  const out = path.join(TMP, `${label}-markup.mjs`);
  fs.writeFileSync(entry, [
    `export * as cm from '${R}/src/lib/clubManager.ts';`,
    ...['SquadScreen', 'StatsScreen', 'LeagueLeadersCard', 'ClubDetailScreen'].map(c => `export { ${c} } from '${R}/src/components/club-manager/${c}.tsx';`),
    `import React from 'react';`,
    `import { renderToStaticMarkup } from 'react-dom/server';`,
    `import { MemoryRouter } from 'react-router-dom';`,
    `export const render = (C, props) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(C, props)));`,
  ].join('\n') + '\n');
  const applied = new Set();
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', jsx: 'automatic', logLevel: 'error',
    absWorkingDir: root, alias: { '@': path.join(root, 'src') }, nodePaths: [NM], define: { 'process.env.NODE_ENV': '"production"' },
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    plugins: [{ name: 'cm-cards-markup-patch', setup(b) {
      b.onLoad({ filter: /\.tsx$/ }, args => {
        const mine = patches.filter(p => path.resolve(root, p.file) === path.resolve(args.path));
        if (!mine.length) return undefined;
        let text = fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
        for (const p of mine) {
          if (text.split(p.from).length !== 2) throw new Error(`patch anchor is not in ${p.file} exactly once: ${p.from}`);
          text = text.split(p.from).join(p.to);
          applied.add(p);
        }
        return { contents: text, loader: 'tsx', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  if (applied.size !== patches.length) throw new Error(`${label}: ${patches.length - applied.size} markup patch(es) never met their file`);
  const mod = await import(pathToFileURL(out).href);
  await mod.cm.ensureAllEraRosters();
  return mod;
}
{
  if (!markupSaves.length) cannot('no season end was reached, so the markup section has no save');
  let mc, mb = null;
  try {
    mc = await markupBundle('candidate', ROOT, CONTROL ? CONTROLS[CONTROL].patches.filter(p => p.file.endsWith('.tsx')) : []);
    if (BASE) mb = await markupBundle('base', BASE);
  } catch (e) { cannot(`a markup bundle did not build: ${e.message}`); }
  const draw = (mod, s) => {
    mod.cm.registerCustomClub(s.customClub ?? null, s.eraId);
    mod.cm.registerLeagueOverrides(s.leagueOverrides ?? null);
    const rival = s.leagueClubs.find(c => c !== s.clubName);
    return {
      squad: mod.render(mod.SquadScreen, { squad: s.squad, xiIds: s.xiIds, eraId: s.eraId, captainId: null, career: s }),
      stats: mod.render(mod.StatsScreen, { career: s }),
      board: mod.render(mod.LeagueLeadersCard, { career: s, board: 'goals', onBoard: () => {} }),
      club: mod.render(mod.ClubDetailScreen, { clubName: rival, career: s, onBack: () => {} }),
    };
  };
  let same = 0, total = 0;
  for (const s of markupSaves) {
    const c = onStream(0x7400, () => draw(mc, s));
    const b = mb ? onStream(0x7400, () => draw(mb, s)) : null;
    for (const [k, html] of Object.entries(c)) {
      tick('markup');
      total += 1;
      if (html.includes('data-cm-card-link') || html.includes('Seasons: this one')) fail('markup', `${s.clubName}, ${k}: a card link is drawn with no provider above it`);
      else if (b && b[k] !== html) fail('markup', `${s.clubName}, ${k}: the markup with no provider differs from the base commit's (${html.length} against ${b[k].length} characters)`);
      else same += 1;
    }
  }
  console.log(`markup  ${same} of ${total} renders (Squad, Stats, a leaders board, a club page, on ${markupSaves.length} saves) with no provider ${mb ? 'byte equal to the base commit\'s' : 'free of any card link (base arm NOT RUN: set CARDS_BASE)'}`);
}

/* ---------- the verdict ---------- */
const secs = Math.round((Date.now() - T0) / 1000);
for (const [section, n] of checks) console.log(`  ${section.padEnd(8)} ${n} checks, ${(failures.get(section) ?? []).length} failed`);
const red = [...failures.values()].reduce((a, l) => a + l.length, 0);
if (CONTROL) {
  const own = (failures.get(CONTROLS[CONTROL].section) ?? []).length;
  if (own > 0) { console.log(`simCmPlayerCard: control ${CONTROL} FIRED, ${own} failures in section ${CONTROLS[CONTROL].section} (${red} in all) (${secs}s)`); process.exit(1); }
  console.log(`simCmPlayerCard: control ${CONTROL} DID NOT FIRE in section ${CONTROLS[CONTROL].section} (${secs}s)`);
  process.exit(3);
}
if (red) { console.log(`simCmPlayerCard: RED, ${red} failures (${secs}s)`); process.exit(1); }
console.log(`simCmPlayerCard: all green, ${[...checks.values()].reduce((a, b) => a + b, 0)} checks (${secs}s)`);
