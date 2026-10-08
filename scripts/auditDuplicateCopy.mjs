/**
 * AD READINESS AUDIT, PHASE 0 ITEM 3: DUPLICATE COPY AND THIN HEADINGS.
 *
 * Reads the same raw documents as scripts/auditCrawl.mjs (same route list,
 * same plain GET with no JavaScript, same definition of the main area: see
 * that file's header) and answers two questions about the main copy.
 *
 * Run:  node scripts/auditDuplicateCopy.mjs [baseUrl] [--routes file.json] [--out file.json] [--files]
 *   defaults: http://localhost:4190, the crawl's own route list,
 *   docs/audits/ad-readiness-2026-10-08/duplicates.json
 *
 * THE PAGE SET: every real page (a prerendered snapshot, or the home page)
 * that answered 200 and carries no noindex. Retired stubs and noindexed
 * utility pages are left out and counted in the output.
 *
 * QUESTION ONE: WHICH SENTENCES REPEAT ON MORE THAN THREE PAGES.
 *   Units. Each paragraph, list item and blockquote of the main area is split
 *   into sentences: a sentence ends at ".", "!" or "?" (plus any closing quote
 *   or bracket) when whitespace and then a capital letter, a digit or an
 *   opening quote follows. It does not end after a single capital initial
 *   ("J. Smith") or after one of the abbreviations in ABBREVIATIONS. A block
 *   with no such break is one sentence. Headings and bare link cards are kept
 *   as units of their own kind and reported apart. Table cells are data and
 *   are not split or compared. Site chrome (navigation, footer, the legal
 *   disclaimer, the cookie text) is not main copy: it is listed on its own
 *   under legalFooter.
 *   Raw pass. Each unit is normalised: emoji out, lower case, curly quotes
 *   straightened, every run of digits (with its inner "." "," ":") replaced by
 *   "#", whitespace collapsed, leading and trailing punctuation trimmed.
 *   Masked pass. Before that normalisation the page's OWN game name (its
 *   registry label, and its h1) becomes "{game}", and every sport or league
 *   word in SPORT_WORDS becomes "{sport}". So "Is Golf Higher or Lower free to
 *   play?" and "Is NBA Higher or Lower free to play?" are one sentence.
 *   A sentence "repeats" when its normal form is on MORE THAN THREE pages.
 *
 * QUESTION TWO: WHICH HEADINGS SIT ABOVE FEWER THAN 25 WORDS.
 *   For each heading in the main area, wordsUnder = the words in paragraphs,
 *   list items, blockquotes and table cells between it and the NEXT heading of
 *   any level. Under 25 is thin. Each thin heading is put in one class:
 *     container  nothing directly under it and a deeper heading follows (an
 *                h2 opening a run of h3s): the copy is in its sub sections,
 *                and sectionWords says how much
 *     links      no copy under it, only link cards (a "more games" heading)
 *     copy       everything else: the heading really does sit on a line or two
 *   sectionWords = the same count carried on to the next heading of the same
 *   or a higher level, so a heading's whole section can be judged too.
 *
 * Deterministic: sorted routes, sorted output, no clock. No install.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ROOT, AUDIT_DIR, crawl, splitPage, blocksOf, countWords } from './auditCrawl.mjs';

export const THIN_WORDS = 25;
export const MORE_THAN_PAGES = 3;

/* "no" is deliberately absent: "No. It only changes the matchups." is two
   sentences far more often on this site than "No. 1" is one. */
const ABBREVIATIONS = new Set(['vs', 'e.g', 'i.e', 'etc', 'st', 'mr', 'mrs', 'ms', 'dr', 'jr', 'sr', 'u.s', 'u.k', 'a.m', 'p.m']);

/* sports and leagues only. Player nouns ("golfer", "quarterback") are left
   alone on purpose: masking them would start hiding real differences. */
const SPORT_WORDS = [
  'college football', 'college basketball', 'american football', 'australian football', 'aussie rules',
  'rugby league', 'rugby union', 'formula 1', 'formula one', 'ice hockey',
  'soccer', 'football', 'basketball', 'baseball', 'hockey', 'golf', 'tennis', 'cricket', 'rugby', 'boxing',
  'motorsport', 'college', 'nba', 'wnba', 'nfl', 'mlb', 'nhl', 'mls', 'ufc', 'mma', 'afl', 'nrl', 'f1',
  'nascar', 'pga', 'atp', 'wta', 'ncaa', 'cfb', 'cbb',
];
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = list => new RegExp('(?<![\\p{L}\\p{N}])(?:' + list.map(escapeRe).join('|') + ')(?![\\p{L}\\p{N}])', 'gu');
const SPORT_RE = wordRe([...SPORT_WORDS].sort((a, b) => b.length - a.length));

const lower = s => String(s).replace(/[\p{Extended_Pictographic}️‍]/gu, '').toLowerCase()
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

const finish = s => s.replace(/\d+(?:[.,:]\d+)*/g, '#').replace(/\s+/g, ' ')
  .replace(/^[\s"'(\[.,;:!?·-]+/, '').replace(/[\s"')\].,;:!?·-]+$/, '');

export const normRaw = text => finish(lower(text));

export function normMasked(text, ownNames) {
  let s = lower(text);
  if (ownNames.length) s = s.replace(wordRe(ownNames), '{game}');
  return finish(s.replace(SPORT_RE, '{sport}'));
}

/** the sentences of one block of text, by the rule in the header */
export function sentencesOf(text) {
  const out = [];
  const re = /[.!?]+["')\]”’]*\s+(?=["'(\[“‘]?[A-Z0-9])/g;
  let start = 0;
  let m;
  while ((m = re.exec(text))) {
    const before = text.slice(start, m.index);
    const last = (before.match(/([A-Za-z.]+)$/) || [, ''])[1];
    const dot = text[m.index] === '.';
    if (dot && (/^[A-Z]$/.test(last) || ABBREVIATIONS.has(last.toLowerCase()))) continue;
    const end = m.index + m[0].length;
    out.push(text.slice(start, end).trim());
    start = end;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

/** route to registry label, read off src/data/gameRegistry.ts without running it */
export function registryLabels() {
  const file = path.join(ROOT, 'src/data/gameRegistry.ts');
  const map = new Map();
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (/^\s*\/\//.test(line)) continue;
    const m = line.match(/path:\s*(['"])(\/[^'"]*)\1\s*,\s*label:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/);
    if (m) map.set(m[2], (m[3] ?? m[4]).replace(/\\(.)/g, '$1'));
  }
  return map;
}

/* PART TWO: THE UNITS OF EVERY PAGE */

const isHeading = b => /^h[1-6]$/.test(b.tag);
const isCopy = b => b.tag === 'p' || b.tag === 'li' || b.tag === 'blockquote';
const isBody = b => isCopy(b) || b.tag === 'table';

/** the names a page calls itself by, longest first, for the masked pass */
function ownNamesOf(route, blocks, labels) {
  const names = new Set();
  const add = n => { const s = lower(n || ''); if (s.length >= 4) names.add(s); };
  add(labels.get(route));
  for (const b of blocks) if (b.tag === 'h1') add(b.text);
  return [...names].sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
}

/* A CRUDE MEASURE, LABELLED AS ONE: does a heading just say its own line again?
   The heading's words (small joining words left out) are looked for in the
   text under it, two words matching when their first four letters do (three
   when one of them is only three long). 0.6 and up is called a restatement.
   "Tapping the golfer with more majors" over "Tap the golfer you believe won
   more majors." scores 1. */
const JOINING = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'your', 'you', 'is', 'are', 'at', 'by', 'from', 'as', 'it', 'its', 'that', 'this', 'into', 'over']);
const bare = w => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const sameWord = (h, u) => { const n = Math.min(h.length, u.length, 4); return n >= 3 && h.slice(0, n) === u.slice(0, n); };
export function restatement(heading, under) {
  const hw = heading.split(/\s+/).map(bare).filter(w => w.length >= 3 && !JOINING.has(w));
  if (!hw.length || !under) return 0;
  const uw = under.split(/\s+/).map(bare).filter(Boolean);
  return Math.round((hw.filter(h => uw.some(u => sameWord(h, u))).length / hw.length) * 100) / 100;
}

/* the guide's fixed sections, named by the word their h2 carries */
const SECTION_WORDS = [['how', /\bhow to play\b/], ['rules', /\brules\b/], ['walkthrough', /\bwalkthrough\b/], ['tips', /\btips\b/], ['faq', /\bfaq\b/], ['more', /^more games to play$/]];
export const sectionOf = h2 => (SECTION_WORDS.find(([, re]) => re.test(h2.toLowerCase())) || ['other'])[0];

/** every heading of one page with what sits under it */
export function headingsOf(blocks) {
  const out = [];
  blocks.forEach((b, i) => {
    if (!isHeading(b)) return;
    const level = Number(b.tag[1]);
    let wordsUnder = 0;
    let linkWordsUnder = 0;
    let sectionWords = 0;
    const under = [];
    let direct = true;
    let nextLevel = null;
    for (let j = i + 1; j < blocks.length; j += 1) {
      const n = blocks[j];
      if (isHeading(n)) {
        const nl = Number(n.tag[1]);
        if (direct) nextLevel = nl;
        direct = false;
        if (nl <= level) break;
        continue;
      }
      if (isBody(n)) { sectionWords += n.words; if (direct) { wordsUnder += n.words; under.push(n.text); } }
      else if (direct && n.tag === 'a') linkWordsUnder += n.words;
    }
    const thin = wordsUnder < THIN_WORDS;
    const kind = !thin ? null : (wordsUnder === 0 && nextLevel !== null && nextLevel > level) ? 'container' : (wordsUnder === 0 && linkWordsUnder > 0) ? 'links' : 'copy';
    out.push({ level, heading: b.text, wordsUnder, linkWordsUnder, sectionWords, thin, kind, blocksUnder: under.length,
      restates: restatement(b.text, under.join(' ')), under: under.join(' | ') });
  });
  return out;
}

/** one page turned into comparable units */
export function unitsOf(page, labels) {
  const split = splitPage(page.route, page.html);
  const blocks = blocksOf(split.main);
  const own = ownNamesOf(page.route, blocks, labels);
  const units = [];
  for (const b of blocks) {
    if (b.tag === 'table') continue;
    const kind = isHeading(b) ? 'heading' : b.tag === 'a' ? 'linkcard' : 'sentence';
    const pieces = kind === 'sentence' ? sentencesOf(b.text) : [b.text];
    for (const text of pieces) {
      const raw = normRaw(text);
      if (!raw) continue;
      units.push({ kind, text, raw, masked: normMasked(text, own), words: countWords(text) });
    }
  }
  const chromeUnits = [];
  for (const c of split.chrome) {
    for (const b of blocksOf(c)) {
      const pieces = isCopy(b) ? sentencesOf(b.text) : [b.text];
      for (const text of pieces) { const raw = normRaw(text); if (raw) chromeUnits.push({ kind: isCopy(b) ? 'sentence' : b.tag === 'a' ? 'link' : 'heading', text, raw }); }
    }
  }
  return { route: page.route, family: page.family ?? null, type: page.type ?? null, ownNames: own, units, chromeUnits, headings: headingsOf(blocks),
    tables: blocks.filter(b => b.tag === 'table').length };
}

/** groups units of one kind by a normal form and keeps those on more than three pages */
function repeats(pages, kind, key) {
  const map = new Map();
  for (const p of pages) {
    for (const u of p.units) {
      if (u.kind !== kind) continue;
      const k = u[key];
      if (!map.has(k)) map.set(k, { routes: new Map(), texts: new Map(), words: u.words, occurrences: 0 });
      const g = map.get(k);
      g.occurrences += 1;
      g.routes.set(p.route, (g.routes.get(p.route) || 0) + 1);
      g.texts.set(u.text, (g.texts.get(u.text) || 0) + 1);
    }
  }
  const out = [];
  for (const [form, g] of map) {
    if (g.routes.size <= MORE_THAN_PAGES) continue;
    const routes = [...g.routes.keys()].sort();
    const texts = [...g.texts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    out.push({ form, pages: routes.length, occurrences: g.occurrences, words: g.words, wordings: texts.length,
      examples: texts.slice(0, 3).map(t => t[0]), exampleRoutes: routes.slice(0, 3) });
  }
  out.sort((a, b) => b.pages - a.pages || b.words - a.words || (a.form < b.form ? -1 : 1));
  return { distinctUnits: map.size, repeated: out };
}

/* PART THREE: THE REPORT */

const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const pct = (a, b) => (b ? round((a / b) * 100) : 0);

export function report(crawled) {
  const real = crawled.filter(p => p.status === 200 && (p.kind === 'snapshot' || p.kind === 'home'));
  const set = real.filter(p => !p.noindex);
  const labels = registryLabels();
  const pages = set.map(p => unitsOf(p, labels));

  const sRaw = repeats(pages, 'sentence', 'raw');
  const sMasked = repeats(pages, 'sentence', 'masked');
  const hRaw = repeats(pages, 'heading', 'raw');
  const hMasked = repeats(pages, 'heading', 'masked');
  const cards = repeats(pages, 'linkcard', 'raw');
  const rawSet = new Set(sRaw.repeated.map(r => r.form));
  const maskedSet = new Set(sMasked.repeated.map(r => r.form));
  /* true when no single wording of it repeats by itself: only the masking shows it */
  for (const r of sMasked.repeated) r.foundOnlyByMasking = !r.examples.some(e => rawSet.has(normRaw(e)));

  /* how much of each page's own sentences is copy that also sits on more than three other pages */
  const sets = new Map();
  const perPage = pages.map(p => {
    const sents = p.units.filter(u => u.kind === 'sentence');
    const words = sents.reduce((n, u) => n + u.words, 0);
    const inRaw = sents.filter(u => rawSet.has(u.raw));
    const inMasked = sents.filter(u => maskedSet.has(u.masked));
    sets.set(p.route, new Set(sents.filter(u => u.words >= 4).map(u => u.masked)));
    const thin = p.headings.filter(h => h.thin);
    return { route: p.route, type: p.type, family: p.family, sentences: sents.length, sentenceWords: words,
      repeatedRaw: inRaw.length, repeatedMasked: inMasked.length,
      repeatedMaskedWords: inMasked.reduce((n, u) => n + u.words, 0),
      repeatedMaskedWordShare: pct(inMasked.reduce((n, u) => n + u.words, 0), words),
      h2Sequence: p.headings.filter(h => h.level === 2).map(h => sectionOf(h.heading)).join(' > '),
      headings: p.headings.length, thinHeadings: thin.length, thinCopy: thin.filter(h => h.kind === 'copy').length,
      oneBlockHeadings: thin.filter(h => h.kind === 'copy' && h.blocksUnder === 1).length,
      restatingHeadings: thin.filter(h => h.kind === 'copy' && h.blocksUnder >= 1 && h.restates >= 0.6).length,
      thinContainer: thin.filter(h => h.kind === 'container').length, thinLinks: thin.filter(h => h.kind === 'links').length };
  });

  /* near duplicate pages: Jaccard overlap of the masked sentences (four words and up) of two pages */
  const routes = pages.map(p => p.route);
  const pairs = [];
  const nearest = new Map();
  for (let i = 0; i < routes.length; i += 1) {
    for (let j = i + 1; j < routes.length; j += 1) {
      const a = sets.get(routes[i]);
      const b = sets.get(routes[j]);
      if (!a.size || !b.size) continue;
      let shared = 0;
      for (const x of a) if (b.has(x)) shared += 1;
      const jac = shared / (a.size + b.size - shared);
      if (shared >= 3) pairs.push({ a: routes[i], b: routes[j], shared, of: [a.size, b.size], jaccard: round(jac, 3) });
      for (const [x, y] of [[routes[i], routes[j]], [routes[j], routes[i]]]) {
        const cur = nearest.get(x);
        if (!cur || jac > cur.jaccard) nearest.set(x, { route: y, shared, jaccard: round(jac, 3) });
      }
    }
  }
  pairs.sort((x, y) => y.jaccard - x.jaccard || y.shared - x.shared || (x.a + x.b < y.a + y.b ? -1 : 1));
  for (const p of perPage) p.nearest = nearest.get(p.route) ?? null;

  const famMap = new Map();
  for (const p of perPage) if (p.family) { if (!famMap.has(p.family)) famMap.set(p.family, []); famMap.get(p.family).push(p); }
  const families = [...famMap.entries()].map(([family, list]) => ({ family, pages: list.length,
    meanRepeatedMaskedWordShare: round(list.reduce((n, p) => n + p.repeatedMaskedWordShare, 0) / list.length),
    meanThinCopyHeadings: round(list.reduce((n, p) => n + p.thinCopy, 0) / list.length),
    routes: list.map(p => p.route) })).sort((a, b) => b.pages - a.pages || (a.family < b.family ? -1 : 1));

  const thinItems = pages.flatMap(p => p.headings.filter(h => h.thin).map(h => ({ route: p.route, level: h.level, heading: h.heading,
    wordsUnder: h.wordsUnder, sectionWords: h.sectionWords, kind: h.kind, blocksUnder: h.blocksUnder, restates: h.restates, under: h.under })));
  const seqMap = new Map();
  for (const p of perPage) { if (!seqMap.has(p.h2Sequence)) seqMap.set(p.h2Sequence, []); seqMap.get(p.h2Sequence).push(p.route); }
  const h2Sequences = [...seqMap.entries()].map(([sequence, list]) => ({ sequence, pages: list.length, exampleRoutes: list.slice(0, 3) }))
    .sort((a, b) => b.pages - a.pages || (a.sequence < b.sequence ? -1 : 1));
  const tally = (list, key) => { const o = {}; for (const x of list) { const k = String(key(x)); o[k] = (o[k] || 0) + 1; } return o; };
  const allHeadings = pages.reduce((n, p) => n + p.headings.length, 0);

  const chromeMap = new Map();
  for (const p of pages) for (const u of p.chromeUnits) {
    const k = u.kind + '|' + u.raw;
    if (!chromeMap.has(k)) chromeMap.set(k, { kind: u.kind, text: u.text, routes: new Set() });
    chromeMap.get(k).routes.add(p.route);
  }
  const legalFooter = [...chromeMap.values()].map(g => ({ kind: g.kind, text: g.text, pages: g.routes.size, exampleRoutes: [...g.routes].sort().slice(0, 3) }))
    .sort((a, b) => b.pages - a.pages || (a.text < b.text ? -1 : 1));

  const totalSents = perPage.reduce((n, p) => n + p.sentences, 0);
  const totalWords = perPage.reduce((n, p) => n + p.sentenceWords, 0);
  const worstPages = key => [...perPage].sort((a, b) => b[key] - a[key] || (a.route < b.route ? -1 : 1)).slice(0, 20);
  const summary = {
    pagesCompared: pages.length,
    leftOut: { stubs: crawled.filter(p => p.kind === 'stub').length, noindex: real.filter(p => p.noindex).length, notAnswering: crawled.filter(p => p.status !== 200 || p.kind === 'fallback' || p.kind === 'none').length },
    sentences: { total: totalSents, words: totalWords, distinctRaw: sRaw.distinctUnits, distinctMasked: sMasked.distinctUnits },
    repeatedSentences: {
      raw: sRaw.repeated.length, masked: sMasked.repeated.length,
      rawFourWordsUp: sRaw.repeated.filter(r => r.words >= 4).length, maskedFourWordsUp: sMasked.repeated.filter(r => r.words >= 4).length,
      occurrencesRaw: sRaw.repeated.reduce((n, r) => n + r.occurrences, 0), occurrencesMasked: sMasked.repeated.reduce((n, r) => n + r.occurrences, 0),
      shareOfAllSentencesRaw: pct(sRaw.repeated.reduce((n, r) => n + r.occurrences, 0), totalSents),
      shareOfAllSentencesMasked: pct(sMasked.repeated.reduce((n, r) => n + r.occurrences, 0), totalSents),
      shareOfAllSentenceWordsMasked: pct(perPage.reduce((n, p) => n + p.repeatedMaskedWords, 0), totalWords),
      pagesWithAtLeastOneMasked: perPage.filter(p => p.repeatedMasked > 0).length,
    },
    repeatedHeadings: { raw: hRaw.repeated.length, masked: hMasked.repeated.length },
    repeatedLinkCards: cards.repeated.length,
    headings: { total: allHeadings, perPage: round(allHeadings / pages.length) },
    thinHeadings: { threshold: THIN_WORDS, total: thinItems.length, perPage: round(thinItems.length / pages.length), shareOfAllHeadings: pct(thinItems.length, allHeadings),
      byKind: tally(thinItems, h => h.kind), byLevel: tally(thinItems, h => 'h' + h.level),
      copyByLevel: tally(thinItems.filter(h => h.kind === 'copy'), h => 'h' + h.level),
      pagesWithNone: perPage.filter(p => p.thinHeadings === 0).length,
      copyOverOneBlockOnly: thinItems.filter(h => h.kind === 'copy' && h.blocksUnder === 1).length,
      copyOverNothing: thinItems.filter(h => h.kind === 'copy' && h.blocksUnder === 0).length,
      copyRestatingItsLine: thinItems.filter(h => h.kind === 'copy' && h.blocksUnder >= 1 && h.restates >= 0.6).length },
    h2Sequences: h2Sequences.slice(0, 12),
    h2SequencesDistinct: h2Sequences.length,
    worst20BySentenceShare: worstPages('repeatedMaskedWordShare').map(p => ({ route: p.route, share: p.repeatedMaskedWordShare, repeated: p.repeatedMasked, of: p.sentences })),
    worst20ByThinHeadings: worstPages('thinHeadings').map(p => ({ route: p.route, thin: p.thinHeadings, copy: p.thinCopy, container: p.thinContainer, links: p.thinLinks, of: p.headings })),
  };
  return { summary, sRaw, sMasked, hRaw, hMasked, cards, legalFooter, perPage, pairs, families, thinItems, pages };
}

/* PART FOUR: THE BRIEF'S OWN EXAMPLES AND THE COMMAND LINE */

/** the owner's brief quotes three things; each is checked against the page word for word */
export function briefChecks(r) {
  const golf = r.pages.find(p => p.route === '/golf-higher-lower');
  const h = golf?.headings.find(x => x.heading === 'Tapping the golfer with more majors') ?? null;
  const stuffed = 'How to play Golf Higher or Lower, a daily major championship trivia game';
  /* the question is printed as a heading (an h3), its answer as a paragraph */
  const q = r.hMasked.repeated.find(x => x.form === 'is {game} free to play') ?? null;
  const a = r.sMasked.repeated.find(x => x.form === '{game} is free to play on douknowball, right in your browser') ?? null;
  return {
    golfPageCompared: !!golf,
    golfHeadingFound: !!h,
    golfHeadingLevel: h ? 'h' + h.level : null,
    golfTextUnderIt: h ? h.under : null,
    golfWordsUnderIt: h ? h.wordsUnder : null,
    golfExampleWordForWord: !!h && h.under === 'Tap the golfer you believe won more majors.',
    golfKeywordHeadingFound: !!golf?.headings.some(x => x.heading === stuffed),
    golfThinCopyHeadings: golf ? golf.headings.filter(x => x.thin && x.kind === 'copy').length : null,
    golfHeadings: golf ? golf.headings.length : null,
    freeToPlayQuestionPages: q ? q.pages : 0,
    freeToPlayQuestionWordings: q ? q.wordings : 0,
    freeToPlayAnswerPages: a ? a.pages : 0,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const files = args.includes('--files');
  const valued = new Set(['--routes', '--out'].flatMap(n => { const i = args.indexOf(n); return i >= 0 ? [i, i + 1] : []; }));
  const base = args.find((x, i) => !x.startsWith('--') && !valued.has(i)) || 'http://localhost:4190';
  const out = path.resolve(flag('--out') || path.join(AUDIT_DIR, 'duplicates.json'));
  const r = report(await crawl({ base, files, routesFile: flag('--routes') }));
  const checks = briefChecks(r);
  const source = files ? 'files: public/<route>/index.html of this tree, index.html for the home page' : base;
  const doc = {
    source,
    method: 'see the header of scripts/auditDuplicateCopy.mjs; main area as defined in scripts/auditCrawl.mjs',
    rule: { repeatsWhenOnMoreThanPages: MORE_THAN_PAGES, thinWhenUnderWords: THIN_WORDS },
    summary: r.summary,
    briefChecks: checks,
    repeatedSentences: { raw: r.sRaw.repeated, masked: r.sMasked.repeated },
    repeatedHeadings: { raw: r.hRaw.repeated, masked: r.hMasked.repeated },
    repeatedLinkCards: r.cards.repeated,
    legalFooter: r.legalFooter,
    families: r.families,
    similarPairsTop60: r.pairs.slice(0, 60),
    perPage: r.perPage,
    thinHeadings: r.thinItems,
  };
  fs.writeFileSync(out, JSON.stringify(doc, null, 1) + '\n');
  const s = r.summary;
  console.log(`source: ${source}`);
  console.log(`pages compared: ${s.pagesCompared} (left out: ${s.leftOut.stubs} stubs, ${s.leftOut.noindex} noindex)`);
  console.log(`sentences: ${s.sentences.total} in all, ${s.sentences.distinctRaw} distinct raw, ${s.sentences.distinctMasked} distinct masked`);
  console.log(`sentences on more than ${MORE_THAN_PAGES} pages: raw ${s.repeatedSentences.raw}, masked ${s.repeatedSentences.masked} (four words and up: raw ${s.repeatedSentences.rawFourWordsUp}, masked ${s.repeatedSentences.maskedFourWordsUp})`);
  console.log(`share of all sentences that are such repeats: raw ${s.repeatedSentences.shareOfAllSentencesRaw}%, masked ${s.repeatedSentences.shareOfAllSentencesMasked}% (${s.repeatedSentences.shareOfAllSentenceWordsMasked}% of sentence words)`);
  console.log(`headings on more than ${MORE_THAN_PAGES} pages: raw ${s.repeatedHeadings.raw}, masked ${s.repeatedHeadings.masked}; link cards: ${s.repeatedLinkCards}`);
  console.log(`headings: ${s.headings.total}, ${s.headings.perPage} a page; thin (under ${THIN_WORDS} words): ${s.thinHeadings.total}, ${s.thinHeadings.perPage} a page, ${s.thinHeadings.shareOfAllHeadings}% of all; by kind ${JSON.stringify(s.thinHeadings.byKind)}`);
  console.log(`brief example on /golf-higher-lower word for word: ${checks.golfExampleWordForWord ? 'CONFIRMED' : 'NOT FOUND'}; "free to play" question on ${checks.freeToPlayQuestionPages} pages`);
  console.log(`wrote ${path.relative(ROOT, out).replaceAll('\\', '/')}`);
  console.log(`auditDuplicateCopy summary: ${s.pagesCompared} pages, ${s.repeatedSentences.raw} sentences on more than ${MORE_THAN_PAGES} pages raw and ${s.repeatedSentences.masked} masked, ${s.thinHeadings.total} thin headings`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(err => { console.error(err); process.exit(1); });
}
