// REVIEW-run Round 1306: an independent probe of "old saves" and "what must not move".
// node .rc/x/oldsave.mjs <base worktree> <part: A|B|C|D|E>
// It bundles the engine of THIS tree (head) and of the base worktree, the way scripts/simCmLeagueBook.mjs does,
// and never reads that harness. It prints one line a finding ("BREAK ...") and a closing line; exit 1 on any BREAK.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = path.resolve(process.argv[2]);
const PART = process.argv[3] ?? 'A';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `rv-old-${PART}-`));
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };

async function engine(label, root) {
  const entry = path.join(TMP, `${label}-entry.mjs`);
  const out = path.join(TMP, `${label}.bundle.mjs`);
  const P = f => JSON.stringify(path.join(root, f).replaceAll('\\', '/'));
  const has = f => fs.existsSync(path.join(root, f));
  fs.writeFileSync(entry, [
    `export * as cm from ${P('src/lib/clubManager.ts')};`,
    `export * as hs from ${P('src/lib/managerHotSeat.ts')};`,
    `export * as book from ${P('src/lib/clubManagerLeagueBook.ts')};`,
    has('src/lib/clubManagerLeagueBoards.ts') ? `export * as boards from ${P('src/lib/clubManagerLeagueBoards.ts')};` : 'export const boards = null;',
  ].join('\n') + '\n');
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
    absWorkingDir: root, alias: { '@': path.join(root, 'src') },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
  });
  const mod = await import(pathToFileURL(out).href);
  await mod.cm.ensureAllEraRosters();
  return mod;
}

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
function onStream(seed, fn) {
  const draw = seeded(seed);
  const realRandom = Math.random;
  const realNow = Date.now;
  Math.random = draw;
  Date.now = () => 1791302400000;
  try { return fn(draw); } finally { Math.random = realRandom; Date.now = realNow; }
}
const withoutBook = s => JSON.stringify(s, (k, v) => (k === 'leagueBook' ? undefined : v));
const sha = text => createHash('sha256').update(text).digest('hex').slice(0, 16);
const wake = (mod, s) => { mod.cm.registerCustomClub(s.customClub ?? null, s.eraId); mod.cm.registerLeagueOverrides(s.leagueOverrides ?? null); return s; };
const rivalsOf = s => s.leagueClubs.filter(c => c !== s.clubName);
const load = (mod, raw) => { store.clear(); store.set(mod.cm.SAVE_KEY, raw); return mod.cm.loadCareer(); };
const nextLeague = s => s.calendar.slice(s.week).find(e => e.type === 'league') ?? null;

let breaks = 0;
const BREAK = msg => { breaks += 1; console.log(`BREAK ${msg}`); };
const note = msg => console.log(msg);

/** The book of a head save against its table: readable, the first law club by club, whole or late. */
function lawOf(mod, s) {
  const book = mod.cm.leagueBookOf(s);
  if (!book) return { readable: false, fits: false, r0: null, misfit: -1 };
  let misfit = 0;
  for (const club of rivalsOf(s)) {
    const g = mod.book.bookClubGoals(book, club);
    if (g.rows + g.og + g.u !== (s.table.find(r => r.club === club)?.gf ?? 0)) misfit += 1;
  }
  return { readable: true, fits: misfit === 0, r0: book.r0 === undefined ? null : book.r0, misfit, book };
}

/** Play `s` to its season's end on the current stream; `each(after, result)` after every entry. Returns the state. */
function toSeasonEnd(mod, s, each, max = 260) {
  let guard = 0;
  while (s.week < s.calendar.length && guard++ < max) {
    const r = mod.cm.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    each?.(s, r);
    if (r.kind === 'seasonOver') break;
  }
  return s;
}
const summer = (mod, s) => mod.cm.startNextSeason(mod.cm.finishSeason(s).state);

const head = await engine('head', ROOT);
const base = await engine('base', BASE);
const leagues = [...head.cm.REAL_LEAGUES.map(l => ['now', l]), ...Object.entries(head.cm.ERA_LEAGUES).flatMap(([era, ls]) => ls.map(l => [era, l]))];
note(`oldsave probe part ${PART}: head ${ROOT}, base ${BASE}, ${leagues.length} leagues`);
const T0 = Date.now();

/* ---------- PART A: the default path over EVERY league, two seasons, from the LAST club's seat ---------- */
if (PART === 'A') {
  const SEASONS = Number(process.env.SEASONS ?? 2);
  let careers = 0, entries = 0, equal = 0;
  const pick = process.env.PICK ?? 'last';
  leagues.forEach(([era, league], li) => {
    const club = pick === 'last' ? league.clubs[league.clubs.length - 1] : league.clubs[Math.floor(league.clubs.length / 2)];
    const seed = (0xA11CE + li * 101) >>> 0;
    const run = (mod, isHead) => onStream(seed, draw => {
      const faces = [];
      let bad = null;
      let s = mod.cm.startCareer(club, era);
      for (let season = 0; season < SEASONS; season++) {
        s = toSeasonEnd(mod, s, after => {
          faces.push(`${sha(withoutBook(after))}|${draw.calls()}`);
          if (isHead && !bad) {
            const l = lawOf(mod, after);
            if (!l.readable || !l.fits || l.r0 !== null) bad = `season ${season + 1} week ${after.week}: readable ${l.readable}, fits ${l.fits} (misfit clubs ${l.misfit}), late from ${l.r0}, league ${mod.cm.careerLeagueOf(after).id}`;
          }
        });
        s = summer(mod, s);
        faces.push(`${sha(withoutBook(s))}|${draw.calls()}`);
      }
      return { faces, bad, league2: mod.cm.careerLeagueOf(s).id };
    });
    let h, b;
    try { h = run(head, true); } catch (e) { BREAK(`A ${era} ${league.id} ${club}: the HEAD engine threw: ${String(e?.stack ?? e).slice(0, 300)}`); return; }
    try { b = run(base, false); } catch (e) { note(`A ${era} ${league.id} ${club}: the BASE engine threw (not judged): ${String(e?.message ?? e).slice(0, 200)}`); return; }
    careers += 1; entries += h.faces.length;
    const off = h.faces.findIndex((f, i) => f !== b.faces[i]);
    if (off >= 0 || h.faces.length !== b.faces.length) BREAK(`A ${era} ${league.id} ${club}: the save but its book or the count of draws differs from the base at face ${off} of ${h.faces.length} (base ${b.faces.length})`);
    else equal += 1;
    if (h.bad) BREAK(`A ${era} ${league.id} ${club}: a healthy career's book is not whole and fitting: ${h.bad}`);
    if (h.league2 !== league.id) note(`A ${era} ${league.id} ${club}: plays in ${h.league2} after ${SEASONS} seasons`);
  });
  note(`PART A: ${careers} careers of ${leagues.length} leagues x ${SEASONS} seasons (${pick} club), ${entries} faces; ${equal} of ${careers} careers byte equal to the base entry by entry, draws included; ${Math.round((Date.now() - T0) / 1000)} s`);
}

/* ---------- PART B: saves written by the BASE's code, loaded and played on by the head ---------- */
const B_LEAGUES = ['premier', 'championship', 'bundesliga2', 'segunda', 'croatia', 'mlsEast', 'scottish', 'proleague', 'eredivisie', 'austria', 'ligue2', 'laliga2010', 'saudi', 'serieb'];
/** A base save `cut` entries into season one ('end': at the season's end; 'summary': after finishSeason). */
function baseSave(era, club, seed, cut) {
  return onStream(seed, () => {
    let s = base.cm.startCareer(club, era);
    if (cut === 'end' || cut === 'summary') {
      s = toSeasonEnd(base, s);
      if (cut === 'summary') s = base.cm.finishSeason(s).state;
    } else {
      for (let k = 0; k < cut && s.week < s.calendar.length; k++) s = base.cm.playNextEntry(s, { skipHalftime: true }).state;
    }
    return JSON.stringify(s);
  });
}
/** Carry a loaded save on to the end of the season AFTER the one it is in. */
function carryOn(mod, raw, seed, isHead, expectLate) {
  return onStream(seed, draw => {
    const faces = [];
    const bad = [];
    let s = load(mod, raw);
    if (!s) return { faces, bad: ['loadCareer gave no save'] };
    const first = nextLeague(s);
    const played = s.table.some(r => r.w + r.d + r.l > 0);
    const gfAtLoad = rivalsOf(s).reduce((n, c) => n + (s.table.find(r => r.club === c)?.gf ?? 0), 0);
    const mineAtLoad = s.squad.filter(p => (p.comp?.league?.goals ?? 0) > 0 || (p.comp?.league?.assists ?? 0) > 0).map(p => `${p.id}:${p.comp.league.goals}:${p.comp.league.assists}`).sort().join(',');
    let k = 0;
    const check = (after, season) => {
      if (!isHead) return;
      const l = lawOf(mod, after);
      const stillLeague = nextLeague(after) !== null || after.table.some(r => r.w + r.d + r.l > 0);
      if (!l.readable) { if (first) bad.push(`season ${season} entry ${k}: no readable book`); return; }
      if (!l.fits) bad.push(`season ${season} entry ${k}: the book does not fit the table (${l.misfit} clubs)`);
      if (season === 1 && expectLate && first && played) {
        if (l.r0 !== first.round) bad.push(`season 1 entry ${k}: late book from round ${l.r0}, the next league round at the load was ${first.round}`);
        if (k === 1) {
          if (l.book.u0 !== gfAtLoad) bad.push(`the late book's u0 is ${l.book.u0}, the rivals' goals at the load were ${gfAtLoad}`);
          const b = (l.book.b ?? []).map(t => `${t[0]}:${t[1]}:${t[2]}`).sort().join(',');
          if (b !== mineAtLoad) bad.push(`the late book's baseline of my men is not their league lines at the load`);
        }
      } else if (l.r0 !== null) bad.push(`season ${season} entry ${k}: the book says it started late (round ${l.r0}) where a whole one is owed`);
      void stillLeague;
    };
    if (s.week < s.calendar.length) {
      s = toSeasonEnd(mod, s, after => { k += 1; faces.push(`${sha(withoutBook(after))}|${draw.calls()}`); check(after, 1); });
    }
    if (!s.pendingSummary) s = mod.cm.finishSeason(s).state;
    s = mod.cm.startNextSeason(s);
    faces.push(`${sha(withoutBook(s))}|${draw.calls()}`);
    k = 0;
    s = toSeasonEnd(mod, s, after => { k += 1; faces.push(`${sha(withoutBook(after))}|${draw.calls()}`); check(after, 2); });
    const saved = JSON.stringify(s);
    if (isHead && !load(mod, saved)) bad.push('the save written at the end does not load again');
    return { faces, bad, bytes: saved.length };
  });
}
if (PART === 'B') {
  let saves = 0, clean = 0;
  for (const [era, league] of leagues.filter(([, l]) => B_LEAGUES.includes(l.id))) {
    const li = B_LEAGUES.indexOf(league.id);
    const club = league.clubs[1];
    for (const cut of [5, 21, 'end', 'summary']) {
      for (const strip of [false, true]) {
        if (strip && typeof cut !== 'number') continue;
        const label = `B ${era} ${league.id} ${club} cut ${cut}${strip ? ' book taken out' : ''}`;
        let raw;
        try { raw = baseSave(era, club, (0xB0B + li * 97) >>> 0, cut); } catch (e) { note(`${label}: the base could not make the save (${String(e?.message ?? e).slice(0, 120)})`); continue; }
        if (strip) { const o = JSON.parse(raw); delete o.leagueBook; raw = JSON.stringify(o); }
        saves += 1;
        let h, b;
        try { h = carryOn(head, raw, 0xC0FFEE + li, true, strip); } catch (e) { BREAK(`${label}: the HEAD threw on the base's save: ${String(e?.stack ?? e).slice(0, 400)}`); continue; }
        try { b = carryOn(base, raw, 0xC0FFEE + li, false, strip); } catch (e) { note(`${label}: the BASE threw on its own save (not judged): ${String(e?.message ?? e).slice(0, 160)}`); continue; }
        const off = h.faces.findIndex((f, i) => f !== b.faces[i]);
        if (off >= 0 || h.faces.length !== b.faces.length) BREAK(`${label}: the save but its book or the draws differ from the base carrying the same save on, at face ${off} of ${h.faces.length} (base ${b.faces.length})`);
        for (const m of h.bad.slice(0, 3)) BREAK(`${label}: ${m}${h.bad.length > 3 ? ` (and ${h.bad.length - 3} more)` : ''}`);
        if (off < 0 && !h.bad.length) clean += 1;
      }
    }
  }
  note(`PART B: ${saves} saves written by the base's code (mid season at 5 and 21 entries with and without their book, at the season's end, at the summary) loaded by the head and played to the end of the NEXT season; ${clean} clean; ${Math.round((Date.now() - T0) / 1000)} s`);
}

/* ---------- PART C: every damage I can think of, at the match week and at the second half ---------- */
function damages(good, rival) {
  const g = () => JSON.parse(JSON.stringify(good));
  const withClub = fn => { const b = g(); b.c[rival] = fn(b.c[rival]); return b; };
  const withRow = row => { const b = g(); const key = Object.keys(b.c[rival].m)[0]; b.c[rival].m[key] = row; return b; };
  const list = [
    ['null', null], ['an empty object', {}], ['a string', 'x'], ['an array', []], ['a number', 7], ['true', true],
    ['only a stamp', { s: good.s }], ['c null', { ...g(), c: null }], ['c an array', { ...g(), c: [] }], ['c a string', { ...g(), c: 'x' }],
    ['my null', { ...g(), my: null }], ['my an object', { ...g(), my: {} }], ['my a short tuple', { ...g(), my: [['id']] }], ['my a null id', { ...g(), my: [[null, 1]] }], ['my a negative count', { ...g(), my: [['id', -2]] }],
    ['club entry null', withClub(() => null)], ['club entry an array', withClub(() => [])], ['club entry a string', withClub(() => 'x')],
    ['club entry m null', withClub(e => ({ ...e, m: null }))], ['club entry m an array', withClub(e => ({ ...e, m: [] }))], ['club entry m a string', withClub(e => ({ ...e, m: 'x' }))],
    ['club entry og null', withClub(e => ({ ...e, og: null }))], ['club entry u negative', withClub(e => ({ ...e, u: -1 }))], ['club entry og a fraction', withClub(e => ({ ...e, og: 1.5 }))], ['club entry u a string', withClub(e => ({ ...e, u: '3' }))], ['club entry u missing', withClub(e => ({ m: e.m, og: e.og }))],
    ['row with a hole', withRow([1, 2, null, 0])], ['row short', withRow([1, 2, 3])], ['row a string', withRow('x')], ['row negative', withRow([-1, 0, 0, 0])], ['row a fraction', withRow([1.5, 0, 0, 0])], ['row long', withRow([1, 0, 0, 0, 0])], ['row null', withRow(null)], ['row an object', withRow({ 0: 1 })],
    ['row key with no bar', withClub(e => ({ ...e, m: { ...e.m, nokey: [1, 0, 0, 0] } }))], ['row key with no name', withClub(e => ({ ...e, m: { ...e.m, '|ST': [1, 0, 0, 0] } }))], ['row key with no position', withClub(e => ({ ...e, m: { ...e.m, 'A Man|XX': [1, 0, 0, 0] } }))],
    ['r0 negative', { ...g(), r0: -1 }], ['r0 a fraction', { ...g(), r0: 1.5 }], ['r0 a string', { ...g(), r0: '3' }], ['r0 null', { ...g(), r0: null }],
    ['b an object', { ...g(), b: {} }], ['b numbers', { ...g(), b: [[1, 2, 3]] }], ['b negative', { ...g(), b: [['id', -1, 0]] }], ['b null', { ...g(), b: null }], ['u0 a string', { ...g(), u0: 'x' }], ['u0 negative', { ...g(), u0: -5 }],
    ['stamp a number', { ...g(), s: 5 }], ['another stamp', { ...g(), s: 'elsewhere|0' }],
    ['one rival entry gone', (() => { const b = g(); delete b.c[rival]; return b; })()], ['one unnamed goal too many', withClub(e => ({ ...e, u: e.u + 1 }))], ['one own goal too few', withClub(e => ({ ...e, og: Math.max(0, e.og - 1), u: e.og > 0 ? e.u : e.u + 2 }))],
    ['a fit book that says it is late', { ...g(), r0: 3, b: [], u0: 0 }],
  ];
  return list;
}
if (PART === 'C') {
  let tried = 0, clean = 0;
  for (const [id, cut] of [['premier', 15], ['bundesliga2', 15], ['mlsEast', 9]]) {
    const [era, league] = leagues.find(([e, l]) => e === 'now' && l.id === id);
    const club = league.clubs[2];
    const raw = onStream(0xDA7A, () => { let s = head.cm.startCareer(club, era); for (let k = 0; k < cut; k++) s = head.cm.playNextEntry(s, { skipHalftime: true }).state; return JSON.stringify(s); });
    const healthy = JSON.parse(raw);
    const rival = rivalsOf(healthy).find(c => Object.keys(healthy.leagueBook.c[c]?.m ?? {}).length > 0);
    /* The same save stopped at half time of my next match: the second half does not pass the repair. */
    const half = onStream(0xDA7B, () => { let s = load(head, raw); let r = null; for (let k = 0; k < 12; k++) { r = head.cm.playNextEntry(s, {}); s = r.state; if (r.kind === 'halftime') break; } return r?.kind === 'halftime' ? JSON.stringify(s) : null; });
    if (!half) note(`C ${id} ${club}: no half time state was reached, the second half is not probed`);
    for (const [name, bad] of damages(healthy.leagueBook, rival)) {
      for (const [where, text] of [['match week', raw], ['second half', half]]) {
        if (!text) continue;
        tried += 1;
        const label = `C ${id} ${club}, ${name}, at the ${where}`;
        const o = JSON.parse(text); o.leagueBook = bad;
        for (const [who, mod] of [['HEAD', head], ['base', base]]) {
          const out = onStream(0xDA7C, () => {
            try {
              let s = load(mod, JSON.stringify(o));
              if (!s) return { threw: 'loadCareer gave no save' };
              if (where === 'second half') s = mod.cm.resumeMatch(s).state;
              const had = nextLeague(s) !== null;
              s = mod.cm.playNextEntry(s, { skipHalftime: true }).state;
              const l = who === 'HEAD' ? lawOf(mod, s) : null;
              for (let k = 0; k < 3 && s.week < s.calendar.length; k++) s = mod.cm.playNextEntry(s, { skipHalftime: true }).state;
              const l2 = who === 'HEAD' ? lawOf(mod, s) : null;
              return { had, l, l2 };
            } catch (e) { return { threw: String(e?.stack ?? e).split('\n').slice(0, 3).join(' / ').slice(0, 300) }; }
          });
          if (who === 'base') { if (out.threw) note(`${label}: the BASE throws too: ${out.threw.slice(0, 140)}`); continue; }
          if (out.threw) { BREAK(`${label}: the HEAD THREW: ${out.threw}`); continue; }
          if (out.had && (!out.l.readable || !out.l.fits)) BREAK(`${label}: after the next entry the book is ${out.l.readable ? 'readable but does not fit' : 'not readable'}`);
          else if (!out.l2.readable || !out.l2.fits) BREAK(`${label}: three entries on the book is ${out.l2.readable ? 'readable but does not fit' : 'not readable'}`);
          else clean += 1;
        }
      }
    }
  }
  note(`PART C: ${tried} damaged saves (a damage, a save, the match week or the second half); ${clean} repaired and playing on with a readable book that fits; ${Math.round((Date.now() - T0) / 1000)} s`);
}

/* ---------- PART D: a Manager Hot Seat run played and handed over by the BASE, carried on by the head ---------- */
if (PART === 'D') {
  let runs = 0, clean = 0;
  for (const date of ['2026-10-10', '2026-10-13', '2026-10-17', '2026-11-02', '2027-01-30', '2027-03-14']) {
    const label = `D hot seat ${date}`;
    let raw, club;
    try {
      raw = onStream(0x7300, () => {
        const { hs } = base;
        const setup = hs.dailyHotSeat(date);
        club = setup.club;
        let run = hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
        let guard = 0;
        while (!run.verdict && guard++ < 40) run = hs.pendingPress(run) ? hs.answerHotSeatPress(run, 0) : hs.playHotSeatMatch(run, 'balanced', null);
        return JSON.stringify(hs.handoverState(run));
      });
    } catch (e) { note(`${label}: the base could not play the run (${String(e?.message ?? e).slice(0, 140)})`); continue; }
    runs += 1;
    if ('leagueBook' in JSON.parse(raw)) note(`${label} (${club}): the base's handover carries a book`);
    let h, b;
    try { h = carryOn(head, raw, 0xD00D, true, true); } catch (e) { BREAK(`${label} (${club}): the HEAD threw on the base's handover: ${String(e?.stack ?? e).slice(0, 400)}`); continue; }
    try { b = carryOn(base, raw, 0xD00D, false, true); } catch (e) { note(`${label}: the BASE threw on its own handover (not judged): ${String(e?.message ?? e).slice(0, 160)}`); continue; }
    const off = h.faces.findIndex((f, i) => f !== b.faces[i]);
    if (off >= 0 || h.faces.length !== b.faces.length) BREAK(`${label} (${club}): the save but its book or the draws differ from the base carrying the same handover on, at face ${off} of ${h.faces.length}`);
    for (const m of h.bad.slice(0, 3)) BREAK(`${label} (${club}): ${m}`);
    if (off < 0 && !h.bad.length) clean += 1;
    note(`${label} (${club}): ${h.faces.length} faces, save ${h.bytes} bytes at the end of the next season`);
  }
  note(`PART D: ${runs} hot seat runs played to a verdict and handed over by the base, carried on by the head to the end of the next season; ${clean} clean; ${Math.round((Date.now() - T0) / 1000)} s`);
}

/* ---------- PART E: a release rolled back for a while: head, base, head again on one save ---------- */
if (PART === 'E') {
  let tried = 0, clean = 0;
  for (const [id, strip] of [['premier', true], ['bundesliga2', true], ['bundesliga2', false], ['segunda', false], ['mlsEast', true]]) {
    const [era, league] = leagues.find(([e, l]) => e === 'now' && l.id === id);
    const club = league.clubs[3];
    const label = `E ${id} ${club}${strip ? ' (a late book)' : ' (a whole book with thin rows)'}`;
    tried += 1;
    try {
      const out = onStream(0xE11A, () => {
        let s = base.cm.startCareer(club, era);
        for (let k = 0; k < 12; k++) s = base.cm.playNextEntry(s, { skipHalftime: true }).state;
        if (strip) delete s.leagueBook;
        s = load(head, JSON.stringify(s));
        for (let k = 0; k < 6; k++) s = head.cm.playNextEntry(s, { skipHalftime: true }).state;
        const a = lawOf(head, s);
        s = load(base, JSON.stringify(s));
        for (let k = 0; k < 5; k++) s = base.cm.playNextEntry(s, { skipHalftime: true }).state;
        const baseReads = base.cm.leagueBookOf(s) !== null;
        s = load(head, JSON.stringify(s));
        const before = lawOf(head, s);
        s = head.cm.playNextEntry(s, { skipHalftime: true }).state;
        const c = lawOf(head, s);
        s = toSeasonEnd(head, s);
        const end = lawOf(head, s);
        return { a, baseReads, before, c, end };
      });
      const say = l => `readable ${l.readable}, fits ${l.fits}, late from ${l.r0}`;
      note(`${label}: after six head entries ${say(out.a)}; the base reads it ${out.baseReads}; back on the head before an entry ${say(out.before)}; after one ${say(out.c)}; at the season's end ${say(out.end)}`);
      let ok = true;
      if (!out.a.readable || !out.a.fits) { BREAK(`${label}: the head's own book after six entries is not readable and fitting`); ok = false; }
      if (!out.baseReads) { BREAK(`${label}: the base's reader refuses the book the head wrote (a rolled back release drops it)`); ok = false; }
      if (!out.before.readable || !out.before.fits) { BREAK(`${label}: after five entries on the base the book no longer reads or fits (${say(out.before)})`); ok = false; }
      if (out.before.r0 !== out.a.r0 || out.c.r0 !== out.a.r0) { BREAK(`${label}: the book's starting round moved across the roll back: ${out.a.r0}, ${out.before.r0}, ${out.c.r0}`); ok = false; }
      if (!out.end.readable || !out.end.fits) { BREAK(`${label}: at the season's end the book is not readable and fitting`); ok = false; }
      if (ok) clean += 1;
    } catch (e) { BREAK(`${label}: threw: ${String(e?.stack ?? e).slice(0, 400)}`); }
  }
  note(`PART E: ${tried} saves passed head, base, head; ${clean} clean; ${Math.round((Date.now() - T0) / 1000)} s`);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(breaks ? `oldsave probe part ${PART}: ${breaks} BREAK(S)` : `oldsave probe part ${PART}: clean, no break`);
process.exit(breaks ? 1 : 0);
