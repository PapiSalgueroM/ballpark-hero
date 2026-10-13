/* Round 1326: Club Manager says what it means. The permanent fence for the
   round's words (a copy round: it moves no draw, scripts/qa/cmCopyOnly1326.mjs
   is the proof of that).

   The engine is bundled from CM_COPY_ROOT (default this tree), like
   simCmLeagueRules' CM_RULES_ROOT, so every section can be run against the
   tree before the round and must be RED there (proof it sees the defect),
   green on the round's head, and red under its control.

   1. ARTICLES (cm m11). For every league of REAL_LEAGUES and of every era,
      every club's buildBoardObjectives labels and boardWantLabel: a title ask
      reads exactly `Win ${toLeague(name)}` ("Win La Liga", "Win Serie A",
      "Win the Premier League"); the double reads exactly `Win the ${name} and
      ${cupName} double` (there the article belongs to "double"); no other
      label holds "the La Liga", "the Serie" or "the Ligue". Then one seeded
      season each for Barcelona, Juventus and PSG through the weekly news: at
      least one "top ..." or "sharpest attack in ..." line per league (a FAIL,
      never a skip, when none) and none with the slip. Then a source guard over
      the CODE (comments stripped by esbuild, JSX kept) of
      src/lib/clubManager*.ts and src/components/club-manager/*.tsx: no
      template or JSX text that puts a literal "the " before an interpolation
      naming a league, except two allowlisted shapes, each counted exactly.
      Control CM_COPY_CONTROL=article: leagueDemand's title line back to
      `Win the ${league.name}`.
   2. DRAMA (cm p4). Every DRAMA_POOL entry with every ordered pair of
      distinct descriptors through dramaText: a capital at the start and
      after every ". ", "? " and "! ", nothing changed but capitals, and the
      engine builds its drama line with dramaText (code, comments stripped).
      Control drama: dramaText's sentence rule back to the first letter only
      (the failure names the protein cereal entry).
   3. THE BREAK NOTE AND THE CALENDAR LINE (cm m1, the copy half). The note
      at week 0 and after it, with starters and without; the calendar line
      played and not, confirmed and approximate. None says "do not stop" or
      what real leagues do; the in season note keeps its prefix and names
      this calendar's rule; the preseason note keeps "from preseason".
      Control intl: the in season clause back to the old words.
   4. THE STAFF APPROACH (cm p5). A level 9 desk ticked week by week until an
      approach, at 2, 1 and 0 matches left: the line names the club, the
      man, his post and the weeks off the approach, counts offers, and never
      says "N matches left this season". Control staff: the line back.
      The summer (fix pass of 2026-10-13): Club Manager sets no
      walkAtSummer, so approaches forced three, two and one weeks from the
      calendar's end must say the offer lapses exactly from two weeks out,
      and the rest of the season and the summer are played to prove it (he
      walks, or he is still in his post). Then the same claim through the
      engine's own call order: a seeded Liverpool season played to four
      entries from its end, and from there season after season numbered anew
      with every man on level 9, played out with playNextEntry, finishSeason
      and startNextSeason: a line with no lapse sentence must see its man
      gone before the summer, a line with it whose man is in his post at the
      end must see him kept, and both kinds must be seen. Measured on
      6b29e6e9 plus this check: 24 seasons, 4 gone, 2 kept, 1 with the
      sentence whose man walked anyway (a bye week ticks one past its entry,
      so the sentence shows a tick early there; it stays true, the season did
      not end first). Control summer: that boundary one week late (FIRED 2).
      Control walk: walkAtSummer on, so the man the line says stays is gone
      (FIRED 7, the played half included).
   5. THE MONEY CARD (cm M14, the display half). FinancesScreen rendered with
      react-dom/server inside a MemoryRouter for a seeded Liverpool season at
      week 18, the same week with a made up 400m signing on the books (the
      kitty change goes below zero) and a fresh career at week 0: the cover
      row is the sum of the spend lines with kitty false as printed, the kitty
      row is the result plus the cover, red only below zero, and "Season
      result" is nowhere. Control finance: the old result row back.
      Measured on 6c0a8686 plus the card: Liverpool week 18 income 64.1m,
      spend 70.9m, board covers +70.9m, kitty change +64.1m.

   Run: node scripts/simCmCopy.mjs [--section=1,2,3,4,5]
        CM_COPY_ROOT=<another tree> node scripts/simCmCopy.mjs   (the base: must be red)
   Exit: 0 green, 1 red (or a control that FIRED), 2 could not run, 3 a
   control that did not fire.
*/
import { build, transform } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(process.env.CM_COPY_ROOT || SCRIPT_ROOT);
const FWD = ROOT.split(String.fromCharCode(92)).join('/');
const CONTROL = process.env.CM_COPY_CONTROL || '';
const secArg = process.argv.slice(2).find(a => a.startsWith('--section='));
const SECTIONS = secArg ? secArg.slice(10).split(',').map(Number) : [1, 2, 3, 4, 5];
const cannot = m => { console.error(`simCmCopy: could not run: ${m}`); process.exit(2); };

/* Each control rewrites one line of one file as the bundler (and the source
   guard) reads it, never on disk. */
const CONTROLS = {
  article: {
    file: 'src/lib/clubManager.ts', section: 1,
    fixed: '\n    return { target: 1, label: `Win ${toLeague(league.name)}` };',
    broken: '\n    return { target: 1, label: `Win the ${league.name}` };',
  },
  drama: {
    file: 'src/lib/clubManager.ts', section: 2,
    fixed: 'return text.replace(/(^|[.?!] )([a-z])/g,',
    broken: 'return text.replace(/(^)([a-z])/g,',
  },
  intl: {
    file: 'src/lib/clubManagerInternationals.ts', section: 3,
    fixed: "'and the calendar here keeps your fixtures going through it, so they went straight after your last game'",
    broken: "'and your fixtures do not stop for it, so they went straight after your last game'",
  },
  finance: {
    file: 'src/components/club-manager/FinancesScreen.tsx', section: 5,
    fixed: [
      '            <tr className="border-t border-border" data-projection-total="cover">',
      '              <td className="py-0.5 text-muted-foreground">Board covers running costs</td>',
      '              <td className="py-0.5 text-right tabular-nums whitespace-nowrap text-muted-foreground">{signed(k.coverActual)}</td>',
      '              <td className="py-0.5 pl-2 text-right tabular-nums whitespace-nowrap text-muted-foreground">{signed(k.coverProjected)}</td>',
      '            </tr>',
      '            <tr className="border-t border-border" data-projection-total="kitty">',
      '              <td className="py-0.5 font-bold text-foreground">Kitty change</td>',
      "              <td className={cn('py-0.5 text-right tabular-nums whitespace-nowrap', k.kittyActual < 0 ? 'text-red-400' : 'text-emerald-400')}>{signed(k.kittyActual)}</td>",
      "              <td className={cn('py-0.5 pl-2 text-right tabular-nums whitespace-nowrap font-bold', k.kittyProjected < 0 ? 'text-red-400' : 'text-emerald-400')}>{signed(k.kittyProjected)}</td>",
      '            </tr>',
    ].join('\n'),
    broken: [
      '            <tr className="border-t border-border" data-projection-total="result">',
      '              <td className="py-0.5 font-bold text-foreground">Season result</td>',
      "              <td className={cn('py-0.5 text-right tabular-nums', p.resultActual < 0 ? 'text-red-400' : 'text-muted-foreground')}>{p.resultActual < 0 ? '-' : ''}{money(Math.abs(p.resultActual))}</td>",
      "              <td className={cn('py-0.5 pl-2 text-right tabular-nums font-bold', p.resultProjected < 0 ? 'text-red-400' : 'text-emerald-400')}>{p.resultProjected < 0 ? '-' : ''}{money(Math.abs(p.resultProjected))}</td>",
      '            </tr>',
    ].join('\n'),
  },
  staff: {
    file: 'src/lib/clubManagerStaff.ts', section: 4,
    fixed: "? `${lead} Match their offer on the Staff desk within ${inWeeks} or he goes.${lapse} You can match ${n} more offer${n === 1 ? '' : 's'} this season.`",
    broken: "? `${STAFF_POST_INFO[post].emoji} ${club} have come in for ${person.name}. Match them or lose him: ${s.matchesLeft} match${s.matchesLeft === 1 ? '' : 'es'} left this season.`",
  },
  summer: {
    file: 'src/lib/clubManagerStaff.ts', section: 4,
    fixed: 'state.week + weeks >= state.calendar.length ?',
    broken: 'state.week + weeks > state.calendar.length ?',
  },
  /* The played half of the summer check is not taken on trust: with the
     packs' walkAtSummer switched on, the man the line says stays is gone. */
  walk: {
    file: 'src/lib/clubManagerStaff.ts', section: 4,
    fixed: "  promotedFrom: 'On the academy staff already',",
    broken: "  promotedFrom: 'On the academy staff already',\n  walkAtSummer: true,",
  },
};
const ctl = CONTROL ? CONTROLS[CONTROL] : null;
if (CONTROL && !ctl) cannot(`CM_COPY_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
if (ctl && !SECTIONS.includes(ctl.section)) cannot(`control ${CONTROL} guards section ${ctl.section}, which this run does not run`);
const lf = s => s.split('\r\n').join('\n');
const readTree = rel => {
  const src = lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  if (!ctl || rel !== ctl.file) return src;
  if (src.split(ctl.fixed).length !== 2) cannot(`control ${CONTROL}: ${rel} does not hold exactly one copy of the line it rewrites`);
  return src.replace(ctl.fixed, ctl.broken);
};
if (ctl) {
  readTree(ctl.file);
  console.log(`CONTROL ${CONTROL}: one line of ${ctl.file} rewritten, section ${ctl.section} must go red`);
}

let failures = 0;
const fail = m => { failures += 1; console.error(`  FAIL: ${m}`); };
const hashKey = s => { let h = 0x811c9dc5 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const REAL_RANDOM = Math.random;
Date.now = () => 1790000000000;
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};

const TMP = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'cmcopy-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });
let reached = !ctl;
async function bundle(name, lines) {
  const entry = path.join(TMP, `${name}-entry.mjs`);
  const out = path.join(TMP, `${name}.mjs`);
  fs.writeFileSync(entry, lines.join('\n'));
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', jsx: 'automatic',
    alias: { '@': `${FWD}/src` }, nodePaths: [path.join(SCRIPT_ROOT, 'node_modules')],
    /* react-dom/server asks for node's own modules with a require. */
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
    plugins: [{
      name: 'cm-copy-control',
      setup(b) {
        b.onLoad({ filter: /\.tsx?$/ }, a => {
          const rel = path.relative(ROOT, a.path).split(path.sep).join('/');
          const isEngine = rel === 'src/lib/clubManager.ts';
          const isCtl = !!ctl && rel === ctl.file;
          if (!isEngine && !isCtl) return undefined;
          if (isCtl) reached = true;
          let contents = readTree(rel);
          /* generatePlayerMessage is private on every tree, and DRAMA_POOL was
             before this round: both are exported in memory, so the base and
             the head are asked the same question. */
          if (isEngine) {
            const extra = [];
            if (/\nfunction generatePlayerMessage\(/.test(contents)) extra.push('generatePlayerMessage as __generatePlayerMessage');
            if (/\nconst DRAMA_POOL\b/.test(contents)) extra.push('DRAMA_POOL as __DRAMA_POOL');
            if (extra.length) contents += `\nexport { ${extra.join(', ')} };\n`;
          }
          return { contents, loader: a.path.endsWith('x') ? 'tsx' : 'ts', resolveDir: path.dirname(a.path) };
        });
      },
    }],
  });
  return import(pathToFileURL(out).href);
}
const engine = await bundle('engine', [
  `export * as cm from '${FWD}/src/lib/clubManager.ts';`,
  `export * as eras from '${FWD}/src/lib/clubManagerEras.ts';`,
  `export * as staff from '${FWD}/src/lib/clubManagerStaff.ts';`,
  `export * as intl from '${FWD}/src/lib/clubManagerInternationals.ts';`,
]);
const { cm } = engine;
if (ctl && ctl.file.startsWith('src/lib/') && !reached) cannot(`control ${CONTROL}: the rewritten ${ctl.file} never reached the bundle`);
if (typeof cm.toLeague !== 'function') cannot('clubManager.ts exports no toLeague (Round 1040 wrote it)');
async function ensureEra(eraId) {
  if (!eraId || eraId === 'now') return;
  const load = engine.eras.ensureEraRosters ?? cm.ensureEraRosters;
  if (typeof load === 'function') await load(eraId);
}
const SLIP = /\bthe (La Liga|Serie |Ligue )/;

/* ------------------------------------------------------------------ */
async function sectionArticles() {
  console.log('1) articles: the board asks, the weekly news and the source');
  const worlds = [['now', cm.REAL_LEAGUES], ...Object.entries(cm.ERA_LEAGUES)];
  let labels = 0;
  const titleBy = [];
  for (const [eraId, leagues] of worlds) {
    await ensureEra(eraId);
    for (const l of leagues) {
      const want = `Win ${cm.toLeague(l.name)}`;
      const titleLike = s => s === `Win the ${l.name}` || s === `Win ${l.name}`;
      let titles = 0;
      for (const club of l.clubs) {
        const era = eraId === 'now' ? undefined : eraId;
        const objs = cm.buildBoardObjectives(club, !!l.euro, l.clubs.length, era, l.clubs);
        const said = [...objs.map(o => [o.id, o.label]), ['boardWantLabel', cm.boardWantLabel(club, era)]];
        for (const [id, label] of said) {
          labels += 1;
          if (titleLike(label)) {
            if (id !== 'boardWantLabel') titles += 1;
            if (label !== want) fail(`${eraId} ${l.name}, ${club}: the ${id} ask reads "${label}", want "${want}"`);
          } else if (id === 'double') {
            const m = label.match(/^Win the (.+) and (.+) double$/);
            if (!m || m[1] !== l.name) fail(`${eraId} ${l.name}, ${club}: the double reads "${label}"`);
          } else if (SLIP.test(label)) fail(`${eraId} ${l.name}, ${club}: the ${id} ask reads "${label}"`);
        }
      }
      titleBy.push(`${eraId === 'now' ? '' : `${eraId} `}${l.name} ${titles}`);
      if (/^(La Liga|Serie A|Ligue 1)$/.test(l.name) && titles === 0) fail(`${eraId} ${l.name}: no club is sent for the title, so the check saw nothing`);
    }
  }
  console.log(`   ${labels} labels read; title asks per league: ${titleBy.join(', ')}`);

  /* One seeded season each through the weekly news. */
  for (const club of ['Barcelona', 'Juventus', 'PSG']) {
    Math.random = seeded(hashKey(`cm-copy|${club}`));
    let s = cm.startCareer(club, 'now');
    const league = cm.careerLeagueOf(s).name;
    const seen = new Set();
    for (let i = 0; i < 220; i++) {
      const r = cm.playNextEntry(s, { skipHalftime: true });
      s = r.state;
      for (const h of s.aiHeadlines ?? []) seen.add(h);
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
    Math.random = REAL_RANDOM;
    const lines = [...seen].filter(h => / top .+ on \d+ points? after /.test(h) || /sharpest attack in /.test(h));
    const named = lines.filter(h => h.includes(` ${league}`));
    if (!named.length) fail(`${club}: a season of weekly news printed no "top ..." or "sharpest attack in ..." line about ${league}`);
    for (const h of lines) if (SLIP.test(h)) fail(`${club}: the news says "${h}"`);
    console.log(`   ${club} (${league}): ${seen.size} headlines, ${lines.length} table lines, e.g. "${(named[0] ?? '').slice(0, 90)}"`);
  }

  /* The source guard: code only, JSX kept, every file of the engine and the screens. */
  const ALLOW = [
    { shape: /^Win the \$\{league\.name\} and \$\{cupName\} double$/, why: 'the article belongs to "double"', want: 1 },
    { shape: /^carrying the \$\{l\.league\} leaders$/, why: 'the article belongs to "leaders"', want: 2 },
  ];
  const counts = ALLOW.map(() => 0);
  const files = [
    ...fs.readdirSync(path.join(ROOT, 'src', 'lib')).filter(f => /^clubManager[A-Za-z]*\.ts$/.test(f)).map(f => `src/lib/${f}`),
    ...fs.readdirSync(path.join(ROOT, 'src', 'components', 'club-manager')).filter(f => f.endsWith('.tsx')).map(f => `src/components/club-manager/${f}`),
  ];
  let hits = 0;
  for (const rel of files) {
    const code = (await transform(readTree(rel), { loader: rel.endsWith('x') ? 'tsx' : 'ts', jsx: 'preserve' })).code;
    for (const m of code.matchAll(/(?<![A-Za-z])[Tt]he (?:\$\{|\{)([^{}]*)\}/g)) {
      const expr = m[1];
      if (!/league|\blg\b/i.test(expr) || /cup|uel|continental/i.test(expr)) continue;
      hits += 1;
      const line = code.slice(code.lastIndexOf('`', m.index) + 1, code.indexOf('`', m.index + m[0].length));
      const k = ALLOW.findIndex(a => a.shape.test(line));
      if (k >= 0) counts[k] += 1;
      else fail(`${rel}: "${m[0]}" puts "the" before a league name (in: ${code.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20).replace(/\s+/g, ' ')})`);
    }
  }
  ALLOW.forEach((a, i) => {
    if (counts[i] !== a.want) fail(`the allowlisted shape ${a.shape} is in the code ${counts[i]} times where ${a.want} were reasoned (${a.why})`);
  });
  console.log(`   source guard: ${files.length} files, ${hits} league interpolations after "the", allowlisted ${ALLOW.map((a, i) => `${counts[i]} (${a.why})`).join(', ')}`);
}

/* ------------------------------------------------------------------ */
/* Every descriptor squadDescriptor and otherDescriptor (clubManager.ts, beside
   DRAMA_POOL) can return. Written out here so a new one is a decision. */
const DESCRIPTORS = ['one of the academy lads', 'your star man', 'one of your keepers', 'one of your defenders',
  'one of your midfielders', 'one of your forwards', 'one of your senior lads', 'another of the senior lads'];
async function sectionDrama() {
  console.log('2) drama: every sentence of a drama line opens on a capital');
  const pool = cm.DRAMA_POOL ?? cm.__DRAMA_POOL;
  if (!Array.isArray(pool) || !pool.length) cannot('clubManager.ts holds no DRAMA_POOL to read');
  /* The engine's own output first: generatePlayerMessage called on a seeded
     squad until every entry has landed, each drama line read as printed. */
  const gen = cm.__generatePlayerMessage;
  if (typeof gen !== 'function') cannot('clubManager.ts holds no generatePlayerMessage');
  const asRe = t => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\{P\\}', '(.+)').replace('\\{Q\\}', '(.+)')}$`, 'i');
  const shapes = pool.map(e => asRe(e.text));
  const seen = pool.map(() => 0);
  Math.random = seeded(hashKey('cm-copy|drama'));
  const st = cm.startCareer('Liverpool', 'now');
  const xi = st.squad.slice(0, 11);
  let calls = 0;
  let dramas = 0;
  for (; calls < 20000 && seen.some(n => n === 0); calls++) {
    st.inbox = [];
    gen(st, xi, calls % 2 === 0, 1);
    for (const m of st.inbox) {
      if (m.kind !== 'drama') continue;
      dramas += 1;
      const k = shapes.findIndex(r => r.test(m.text));
      if (k < 0) { fail(`a drama line matches no entry: "${m.text}"`); continue; }
      seen[k] += 1;
      const lower = [...m.text.matchAll(/(^|[.?!] )([a-z])/g)];
      if (lower.length && seen[k] === 1) fail(`the engine printed "${m.text}": a sentence opens in lower case`);
    }
  }
  Math.random = REAL_RANDOM;
  const missing = pool.filter((e, i) => !seen[i]).map(e => e.text.slice(0, 40));
  if (missing.length) fail(`${missing.length} entries never landed in ${calls} calls: ${missing.join(' | ')}`);
  console.log(`   the engine: ${calls} calls, ${dramas} drama lines, every one of ${pool.length} entries landed`);
  if (typeof cm.dramaText !== 'function') { fail('clubManager.ts has no dramaText: the drama line opens only its first letter (cm p4)'); return; }
  let checked = 0;
  for (const entry of pool) {
    for (const d1 of DESCRIPTORS) {
      for (const d2 of DESCRIPTORS) {
        if (d1 === d2) continue;
        const got = cm.dramaText(entry.text, d1, d2);
        const plain = entry.text.replace('{P}', d1).replace('{Q}', d2);
        checked += 1;
        if (got.toLowerCase() !== plain.toLowerCase()) { fail(`"${entry.text.slice(0, 50)}": dramaText changed more than capitals ("${got.slice(0, 80)}")`); continue; }
        const lower = [...got.matchAll(/(^|[.?!] )([a-z])/g)];
        if (lower.length) fail(`"${entry.text.slice(0, 60)}" with ${d1} / ${d2}: a sentence opens in lower case ("...${got.slice(Math.max(0, lower[0].index - 20), lower[0].index + 30)}...")`);
      }
    }
  }
  /* And the engine builds its drama line through it (the code, comments stripped). */
  const code = (await transform(readTree('src/lib/clubManager.ts'), { loader: 'ts' })).code;
  if (!/text: dramaText\(drama\.text, d1, otherDescriptor\(p2, d1\)\)/.test(code)) fail('generatePlayerMessage does not build its drama text with dramaText');
  console.log(`   ${pool.length} entries x ${DESCRIPTORS.length * (DESCRIPTORS.length - 1)} ordered pairs: ${checked} lines read`);
}

async function sectionIntl() {
  console.log('3) the break note and the calendar line: this calendar\'s rule, never football\'s');
  const { intl } = engine;
  Math.random = seeded(hashKey('cm-copy|intl'));
  const s = cm.startCareer('Liverpool', 'now');
  Math.random = REAL_RANDOM;
  const called = intl.callUpsFor(s, { id: '2026-nov', matches: 2 });
  if (called.length < 2) { fail(`Liverpool have ${called.length} men called up, too few to read the note`); return; }
  const brk = { windowId: '2026-nov', label: '9 to 17 Nov', backWeek: 7, backOpponent: 'Everton' };
  const notes = [];
  for (const atWeek of [0, 6]) {
    for (const starts of [true, false]) {
      const m = intl.breakMessage({ ...brk, atWeek, called: called.map(c => ({ ...c, starts, injuredWeeks: 0 })) });
      notes.push([atWeek, starts, m?.text ?? '']);
    }
  }
  const w = intl.intlWindowsFor(2026)[0];
  const lines = [];
  for (const done of [false, true]) for (const partial of [false, true]) lines.push(intl.intlMarkLine({ window: w, key: 0, label: '21 Sep to 6 Oct', partial, done }));
  const BANNED = [/do not stop/i, /does not stop/i, /real league/i, /top leagues/i, /in real football/i, /in real life/i];
  for (const [atWeek, starts, text] of notes) {
    const tag = `the note at week ${atWeek}${starts ? ' with starters' : ' without'}`;
    if (!text.startsWith('International break: the window runs 9 to 17 Nov, ')) fail(`${tag} lost its prefix: "${text.slice(0, 70)}"`);
    if (atWeek === 0 && !text.includes('so they went from preseason')) fail(`${tag} lost "from preseason"`);
    if (atWeek > 0 && !text.includes('and the calendar here keeps your fixtures going through it, so they went straight after your last game')) fail(`${tag} does not name this calendar's rule: "${text.slice(0, 160)}"`);
    for (const b of BANNED) if (b.test(text)) fail(`${tag} says ${b}: "${text.slice(0, 160)}"`);
  }
  for (const line of lines) {
    for (const b of BANNED) if (b.test(line)) fail(`the calendar line says ${b}: "${line}"`);
  }
  const open = lines.filter(l => !l.includes('Played.'));
  for (const l of open) if (!l.includes('This calendar plays on through it')) fail(`the calendar line does not name this calendar's rule: "${l}"`);
  console.log(`   ${notes.length} notes and ${lines.length} calendar lines read; e.g. "${open[0]}"`);
}

async function sectionStaff() {
  console.log('4) the staff approach: offers counted, the weeks given');
  const { staff } = engine;
  const POSTS = ['attack', 'defence', 'goalkeeping', 'scout'];
  for (const n of [2, 1, 0]) {
    Math.random = seeded(hashKey('cm-copy|staff'));
    const career = cm.startCareer('Liverpool', 'now');
    Math.random = REAL_RANDOM;
    const desk = staff.ensureStaff(career);
    for (const post of POSTS) if (desk[post]) desk[post] = { ...desk[post], level: 9, potential: 10, wage: staff.staffWage(9, false) };
    desk.matchesLeft = n;
    let line = null;
    for (let season = 0; season < 2 && !line; season++) {
      career.season = (career.season ?? 0) + season;
      for (let week = 1; week <= 46 && !line; week++) {
        career.week = week;
        const before = career.aiHeadlines[0];
        staff.tickStaff(career);
        const d = staff.staffOf(career);
        if (d.poach && career.aiHeadlines[0] !== before) {
          const p = d[d.poach.postId];
          line = { text: career.aiHeadlines[0], club: d.poach.club, name: p.name, post: staff.STAFF_POST_INFO[d.poach.postId], weeks: d.poach.weeksLeft, left: d.matchesLeft };
        }
      }
    }
    if (!line) { fail(`no approach for a level 9 desk in two seasons (matches left ${n})`); continue; }
    const want = wantStaffLine(line, n, career.week + line.weeks >= career.calendar.length);
    if (line.left !== n) fail(`the desk holds ${line.left} matches after the tick, where ${n} were set`);
    if (/\d+ match(es)? left this season/.test(line.text)) fail(`with ${n} left the line still counts matches: "${line.text}"`);
    if (line.text !== want) fail(`with ${n} left the line reads\n      "${line.text}"\n    want\n      "${want}"`);
    else console.log(`   ${n} left: "${line.text}"`);
  }
  /* The summer (fix pass of 2026-10-13, review minor 1). Club Manager sets no
     walkAtSummer, so an approach still open when the season ends lapses and
     he stays (gmRolloverStaff). Every calendar entry ticks once, so an
     approach at week w walks only when w plus its weeks is short of the
     calendar's length. Approaches forced at three, two and one weeks from the
     end, at 2 and 0 matches left: the lapse sentence is there exactly from
     two weeks out. Then the rule is played: the rest of the season is ticked
     and the summer rolled over, and the man is gone exactly when the line
     gave no lapse, and still in his post exactly when it did. Control summer:
     the boundary one week late (> for >=), so two weeks out loses it. */
  let forced = 0;
  for (const n of [2, 0]) for (const back of [3, 2, 1]) {
    Math.random = seeded(hashKey('cm-copy|staff'));
    const career = cm.startCareer('Liverpool', 'now');
    Math.random = REAL_RANDOM;
    const L = career.calendar.length;
    const desk = staff.ensureStaff(career);
    for (const post of POSTS) if (desk[post]) desk[post] = { ...desk[post], level: 9, potential: 10, wage: staff.staffWage(9, false) };
    let line = null;
    for (let season = 1; season <= 400 && !line; season++) {
      career.season = season;
      career.week = L - back;
      const d0 = staff.ensureStaff(career);
      d0.poach = null;
      d0.matchesLeft = n;
      const before = career.aiHeadlines[0];
      staff.tickStaff(career);
      const d = staff.staffOf(career);
      if (d.poach && career.aiHeadlines[0] !== before) {
        const p = d[d.poach.postId];
        line = { text: career.aiHeadlines[0], club: d.poach.club, postId: d.poach.postId, id: p.id, name: p.name, post: staff.STAFF_POST_INFO[d.poach.postId], weeks: d.poach.weeksLeft, left: d.matchesLeft };
      }
    }
    const tag = `${n} left, an approach ${back} week${back === 1 ? '' : 's'} from the end of a ${L} entry calendar`;
    if (!line) { fail(`${tag}: no approach in 400 seasons`); continue; }
    forced += 1;
    const late = career.week + line.weeks >= L;
    if (late !== (back <= line.weeks)) fail(`${tag}: the harness reads the boundary wrong (late ${late})`);
    const want = wantStaffLine(line, n, late);
    if (line.text !== want) { fail(`${tag}: the line reads\n      "${line.text}"\n    want\n      "${want}"`); continue; }
    for (let wk = career.week + 1; wk < L; wk++) { career.week = wk; staff.tickStaff(career); }
    const gone = !staff.staffOf(career)[line.postId];
    const next = { ...structuredClone(career), season: career.season + 1, week: 1 };
    staff.rolloverStaff(next, career, false);
    const kept = next.staff && next.staff[line.postId] && next.staff[line.postId].id === line.id;
    if (late && (gone || !kept)) fail(`${tag}: the line says the offer lapses at the summer, but ${line.name} ${gone ? 'walked before it' : 'is not in his post after it'}`);
    if (!late && !gone) fail(`${tag}: the line says he goes, but ${line.name} was still in his post at the season's end`);
    if (!late && kept) fail(`${tag}: ${line.name} is back in his post after the summer`);
    console.log(`   ${tag}: ${late ? 'lapses, he stays' : 'he goes'}: "${line.text}"`);
  }
  if (forced !== 6) fail(`the summer cases ran ${forced} of 6`);

  /* The same claim through the engine's own call order (playNextEntry, quick
     sim, then finishSeason and startNextSeason), so it holds for the real
     ticks and not only for the week this harness sets. A seeded Liverpool
     season is played to four entries from its end; from there each sample
     takes another season number with every man on level 9 and plays the
     season out and the summer. Every approach line with no lapse sentence
     must see its man gone before the summer; every one with it whose man is
     still in his post when the season ends must see him there in the new
     season. Both kinds must be seen, or the check saw nothing. */
  Math.random = seeded(hashKey('cm-copy|staff-play'));
  let lead = cm.startCareer('Liverpool', 'now');
  for (let i = 0; i < 300 && !lead.sacked && lead.week < lead.calendar.length - 4; i++) lead = cm.playNextEntry(lead, { skipHalftime: true }).state;
  Math.random = REAL_RANDOM;
  if (lead.sacked || lead.week < lead.calendar.length - 4) { fail(`the played summer check could not reach the season's last weeks (week ${lead.week} of ${lead.calendar.length}, sacked ${!!lead.sacked})`); return; }
  const seen = { walked: 0, stayed: 0, vacuous: 0, wrong: 0, samples: 0 };
  for (let n = 1; n <= 120 && seen.wrong < 2 && (seen.walked < 2 || seen.stayed < 2); n++) {
    seen.samples += 1;
    Math.random = seeded(hashKey(`cm-copy|staff-play|${n}`));
    let s = structuredClone(lead);
    s.season = 100 + n;
    const desk = staff.ensureStaff(s);
    for (const post of POSTS) if (desk[post]) desk[post] = { ...desk[post], level: 9, potential: 10, wage: staff.staffWage(9, false) };
    desk.poach = null;
    desk.matchesLeft = 2;
    const lines = [];
    for (let i = 0; i < 40; i++) {
      const known = new Set(s.aiHeadlines ?? []);
      const r = cm.playNextEntry(s, { skipHalftime: true });
      s = r.state;
      const d = staff.staffOf(s);
      const line = (s.aiHeadlines ?? []).find(h => !known.has(h) && h.includes(' have come in for '));
      if (line && d.poach) lines.push({ line, postId: d.poach.postId, id: d[d.poach.postId].id });
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
    if (s.sacked || s.week < s.calendar.length) { Math.random = REAL_RANDOM; continue; }
    const atEnd = staff.staffOf(s);
    const next = cm.startNextSeason(cm.finishSeason(s).state);
    Math.random = REAL_RANDOM;
    const after = staff.staffOf(next);
    for (const a of lines) {
      const lapse = a.line.includes(' If the season ends first, the offer lapses and he stays.');
      const inPostAtEnd = atEnd[a.postId] && atEnd[a.postId].id === a.id;
      const inPostAfter = after[a.postId] && after[a.postId].id === a.id;
      if (!lapse && inPostAtEnd) { seen.wrong += 1; fail(`played, season ${s.season}: the line gave no lapse but the man was still in his post at the season's end: "${a.line}"`); }
      else if (!lapse) seen.walked += 1;
      else if (inPostAtEnd && !inPostAfter) { seen.wrong += 1; fail(`played, season ${s.season}: the line says he stays if the season ends first, but he is gone after the summer: "${a.line}"`); }
      else if (inPostAtEnd) seen.stayed += 1;
      else seen.vacuous += 1;
    }
  }
  Math.random = REAL_RANDOM;
  if (seen.walked < 1 || seen.stayed < 1) fail(`the played summer check saw ${seen.walked} line(s) without the lapse whose man walked and ${seen.stayed} with it whose man stayed: it needs both`);
  console.log(`   played through the engine from ${lead.calendar.length - lead.week} entries out, ${seen.samples} season(s): ${seen.walked} approach(es) with no lapse and the man gone, ${seen.stayed} with the lapse and the man kept over the summer, ${seen.vacuous} with the lapse whose man walked anyway (the season did not end first)`);
}

function wantStaffLine(line, n, late) {
  const w = `${line.weeks} week${line.weeks === 1 ? '' : 's'}`;
  const lead = `${line.post.emoji} ${line.club} have come in for ${line.name}, your ${line.post.label.toLowerCase()}.`;
  const lapse = late ? ' If the season ends first, the offer lapses and he stays.' : '';
  return n > 0
    ? `${lead} Match their offer on the Staff desk within ${w} or he goes.${lapse} You can match ${n} more offer${n === 1 ? '' : 's'} this season.`
    : `${lead} You have matched all the offers you can this season, so he goes in ${w} unless you let him go sooner.${lapse}`;
}

async function sectionMoney() {
  console.log('5) the money card: what the board covers and what that leaves the kitty');
  /* Rendered through react-dom/server inside a MemoryRouter, so a Link added
     to the desk later cannot crash the harness. */
  const ui = await bundle('screen', [
    `export { FinancesScreen } from '${FWD}/src/components/club-manager/FinancesScreen.tsx';`,
    `export * as fin from '${FWD}/src/lib/clubManagerFinances.ts';`,
    `export * as cmx from '${FWD}/src/lib/clubManager.ts';`,
    "export { createElement } from 'react';",
    "export { renderToStaticMarkup } from 'react-dom/server';",
    "export { MemoryRouter } from 'react-router-dom';",
  ]);
  if (ctl && ctl.section === 5 && !reached) cannot(`control ${CONTROL}: the rewritten ${ctl.file} never reached the bundle`);
  const noop = () => {};
  const render = c => {
    /* The server renderer's note about layout effects is not a finding here. */
    const err = console.error;
    console.error = (...a) => { if (!String(a[0]).includes('useLayoutEffect does nothing on the server')) err(...a); };
    try {
      return ui.renderToStaticMarkup(ui.createElement(ui.MemoryRouter, null,
        ui.createElement(ui.FinancesScreen, { career: c, onTickets: noop, onConcessions: noop, onSponsor: noop, onPush: noop })));
    } finally { console.error = err; }
  };
  const cells = (html, id) => {
    const row = html.match(new RegExp(`<tr[^>]*data-projection-total="${id}"[^>]*>(.*?)</tr>`, 's'));
    return row ? [...row[1].matchAll(/<td class="([^"]*)"[^>]*>(.*?)<\/td>/gs)].map(m => ({ cls: m[1], text: m[2].replace(/<[^>]+>/g, '') })) : null;
  };
  /* The three careers: a seeded Liverpool season at week 18, the same week
     with a made up 400m signing on the books (the kitty change goes below
     zero), and a fresh career at week 0. */
  Math.random = seeded(hashKey('cm-copy|money'));
  let s = ui.cmx.startCareer('Liverpool', 'now');
  const fresh = JSON.parse(JSON.stringify(s));
  for (let i = 0; i < 200 && s.week < 18; i++) s = ui.cmx.playNextEntry(s, { skipHalftime: true }).state;
  Math.random = REAL_RANDOM;
  const spender = { ...s, seasonSignings: [...(s.seasonSignings ?? []), { dir: 'in', name: 'A made up signing', fee: 400 }] };
  for (const [tag, c, wantRed] of [['Liverpool, week 18', s, false], ['the same week with a 400m signing', spender, true], ['a fresh career, week 0', fresh, false]]) {
    const html = render(c);
    const money = ui.cmx.moneyIn(c);
    const signed = n => `${n > 0 ? '+' : n < 0 ? '-' : ''}${money(Math.abs(n))}`;
    const p = ui.fin.projectFinances(c);
    const r2 = n => Math.round(n * 100) / 100;
    let ca = 0;
    let cp = 0;
    for (const l of p.spend) if (l.kitty === false) { ca += l.actual; cp += l.projected; }
    const want = { cover: [signed(r2(ca)), signed(r2(cp))], kitty: [signed(r2(p.resultActual + ca)), signed(r2(p.resultProjected + cp))] };
    if (/Season result/.test(html)) fail(`${tag}: the desk still prints "Season result"`);
    const cover = cells(html, 'cover');
    const kitty = cells(html, 'kitty');
    if (!cover || !kitty) { fail(`${tag}: the desk has no ${cover ? '' : 'cover '}${kitty ? '' : 'kitty '}row`); continue; }
    if (cover[1].text !== want.cover[0] || cover[2].text !== want.cover[1]) fail(`${tag}: the cover row prints ${cover[1].text} and ${cover[2].text}, the spend lines the board pays add to ${want.cover.join(' and ')}`);
    if (kitty[1].text !== want.kitty[0] || kitty[2].text !== want.kitty[1]) fail(`${tag}: the kitty row prints ${kitty[1].text} and ${kitty[2].text}, the result plus the cover is ${want.kitty.join(' and ')}`);
    const values = [r2(p.resultActual + ca), r2(p.resultProjected + cp)];
    values.forEach((v, i) => {
      const red = kitty[i + 1].cls.includes('text-red-400');
      if (red !== (v < 0)) fail(`${tag}: the kitty change ${kitty[i + 1].text} is ${red ? '' : 'not '}red`);
    });
    if (wantRed && !(values[1] < 0)) fail(`${tag}: the made up signing did not push the projected kitty change below zero (${values[1]})`);
    console.log(`   ${tag}: income ${money(p.incomeProjected)}, spend ${money(p.spendProjected)}, board covers ${want.cover[1]}, kitty change ${want.kitty[1]} (so far ${want.kitty[0]})`);
  }
}

/* ------------------------------------------------------------------ */
const RUN = { 1: sectionArticles, 2: sectionDrama, 3: sectionIntl, 4: sectionStaff, 5: sectionMoney };
for (const n of SECTIONS) {
  if (!RUN[n]) cannot(`no section ${n}`);
  await RUN[n]();
}
const where = ROOT === SCRIPT_ROOT ? 'this tree' : ROOT;
if (ctl) {
  if (failures) { console.log(`simCmCopy: CONTROL ${CONTROL} FIRED (${failures} failures, as it must)`); process.exit(1); }
  console.log(`simCmCopy: CONTROL ${CONTROL} DID NOT FIRE: section ${ctl.section} is blind to it`);
  process.exit(3);
}
if (failures) { console.log(`simCmCopy: RED on ${where}, ${failures} failures`); process.exit(1); }
console.log(`simCmCopy: green on ${where}. Sections ${SECTIONS.join(', ')}: Club Manager says what it means.`);
process.exit(0);
