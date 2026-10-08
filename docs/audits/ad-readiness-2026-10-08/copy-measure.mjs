/**
 * Ad readiness audit, 2026-10-08, the COPY area. Reads only.
 *
 * Bundles the guide loader, the guide shape helpers and the game registry
 * (the same three things scripts/simGuideHeadings.mjs bundles), then measures
 * every game's guide AT SOURCE: parts, words, headings, headings over one
 * bullet, FAQ answers that repeat on other pages once the game's name is
 * masked, keyword h2 titles, banned filler phrases, and how alike the guides
 * inside one reskin family are.
 *
 * Writes copy-by-game.json beside itself. Changes nothing else.
 * Run: node docs/audits/ad-readiness-2026-10-08/copy-measure.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `copyMeasure-${process.pid}-`));
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.cjs');
fs.writeFileSync(ENTRY, `
export { loadGameContent } from '${ROOT_URL}/src/data/gameContent/loader.ts';
export { flatGuide, guideH2Titles } from '${ROOT_URL}/src/data/gameContent/guideShape.ts';
export { ALL_GAMES, CATEGORIES } from '${ROOT_URL}/src/data/gameRegistry.ts';
export { SEO_META } from '${ROOT_URL}/src/data/seoMeta.ts';
`);
esbuild.buildSync({
  entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node',
  alias: { '@': `${ROOT_URL}/src` }, outfile: BUNDLE, logLevel: 'error',
});
const { loadGameContent, flatGuide, guideH2Titles, ALL_GAMES, CATEGORIES, SEO_META } = require(BUNDLE);

const routes = JSON.parse(fs.readFileSync(path.join(HERE, 'routes.json'), 'utf8'));
const familyOf = new Map();
for (const [name, f] of Object.entries(routes.families)) for (const r of f.registered) familyOf.set(r, { name, kind: f.kind });

/* ---- text helpers ---- */
const words = s => (String(s).match(/[A-Za-z0-9$%'’.+-]*[A-Za-z0-9][A-Za-z0-9$%'’+-]*/g) || []);
const wc = s => words(s).length;
const wcAll = arr => arr.reduce((n, s) => n + wc(s), 0);
/* A sentence ends at . ! or ? followed by a space and a capital, digit or quote. */
const sentences = s => String(s).split(/(?<=[.!?])\s+(?=["'A-Z0-9(])/).map(x => x.trim()).filter(Boolean);
const norm = s => String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9{}]+/g, ' ').trim();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* Mask the game's own name (longest spelling first) so "Is X free" reads alike everywhere. */
const masker = label => {
  const names = [label, label.replace(/^The /, '')].filter((v, i, a) => v && a.indexOf(v) === i).sort((a, b) => b.length - a.length);
  const re = new RegExp(names.map(esc).join('|'), 'gi');
  return s => String(s).replace(re, '{game}');
};
const STOP = new Set('a an the of to in on for and or with your you is are it its be by at as from that this than then each every how what why when which who into over under up out one two all any more most not no so if do does can will get got per vs'.split(' '));
const stem = w => w.replace(/(ing|ed|es|s)$/, '');
const content = s => norm(s).split(' ').filter(w => w && !STOP.has(w)).map(stem);
/* Share of a heading's content words that the text under it already uses. */
const restates = (heading, under) => {
  const h = content(heading); if (!h.length) return 0;
  const u = new Set(content(under));
  return h.filter(w => u.has(w)).length / h.length;
};

const games = ALL_GAMES.filter((g, i, a) => a.findIndex(x => x.path === g.path) === i);
const sportOf = p => CATEGORIES.find(c => c.games.some(g => g.path === p))?.title ?? null;

const PARTS = ['howToPlay', 'rules', 'example', 'tips'];
const SECTION_KEY = { howToPlay: 'howToPlaySections', rules: 'ruleSections', example: 'exampleSections', tips: 'tipSections' };
const DEFAULT_H2 = label => guideH2Titles({}, label);

const rows = [];
for (const g of games) {
  const c = await loadGameContent(g.path);
  if (!c) { rows.push({ route: g.path, label: g.label, guide: false }); continue; }
  const flat = flatGuide(c);
  const titles = guideH2Titles(c, g.label);
  const mask = masker(g.label);
  /* every heading in the guide with what sits DIRECTLY under it */
  const heads = [];
  for (const part of PARTS) {
    const secs = c[SECTION_KEY[part]];
    if (!secs) continue;
    for (const s of secs) {
      const own = part === 'example' ? s.paragraphs : s.items;
      heads.push({ part, level: 3, heading: s.heading, blocks: own, hasSub: !!(s.subsections && s.subsections.length) });
      for (const sub of s.subsections ?? []) heads.push({ part, level: 4, heading: sub.heading, blocks: sub.items, hasSub: false });
    }
  }
  const single = heads.filter(h => h.blocks.length === 1);
  const singleOneSentence = single.filter(h => sentences(h.blocks[0]).length === 1);
  const under25 = heads.filter(h => wcAll(h.blocks) < 25);
  const restating = single.filter(h => restates(h.heading, h.blocks[0]) >= 0.6);
  const partWords = Object.fromEntries(PARTS.map(p => [p, wcAll(flat[p])]));
  const faqWords = c.faqs.reduce((n, f) => n + wc(f.q) + wc(f.a), 0);
  const templateFaqWords = wc(`Is ${g.label} free to play?`) + wc(`Yes. ${g.label} is free to play on DoUKnowBall, right in your browser. No download and no signup needed.`);
  const headingWords = wcAll(Object.values(titles)) + wcAll(heads.map(h => h.heading));
  const bodyWords = wcAll(c.intro) + PARTS.reduce((n, p) => n + partWords[p], 0) + faqWords;
  rows.push({
    route: g.path, label: g.label, sport: sportOf(g.path), daily: !!g.daily,
    family: familyOf.get(g.path)?.name ?? null, familyKind: familyOf.get(g.path)?.kind ?? null,
    guide: true, converted: PARTS.some(p => c[SECTION_KEY[p]]),
    sections: ['intro', ...PARTS.filter(p => flat[p] && flat[p].length), ...(c.faqs.length ? ['faq'] : ['faq (template question only)'])],
    blocks: { intro: c.intro.length, howToPlay: flat.howToPlay.length, rules: flat.rules.length, example: flat.example.length, tips: flat.tips.length, faqsOwn: c.faqs.length },
    words: { intro: wcAll(c.intro), ...partWords, faqOwn: faqWords, faqTemplate: templateFaqWords, headings: headingWords, body: bodyWords, all: bodyWords + templateFaqWords + headingWords },
    headings: { h2: 5, h3: heads.filter(h => h.level === 3).length, h4: heads.filter(h => h.level === 4).length, faqH3: c.faqs.length + 1,
      total: 5 + heads.length + c.faqs.length + 1, sectionHeadings: heads.length,
      overOneBlock: single.length, overOneSentence: singleOneSentence.length, underTwentyFiveWords: under25.length, restatingItsOneLine: restating.length,
      wordsPerSectionHeading: heads.length ? +((PARTS.reduce((n, p) => n + partWords[p], 0)) / heads.length).toFixed(1) : null },
    h2: titles, h2IsDefault: Object.fromEntries(Object.keys(titles).map(k => [k, titles[k] === DEFAULT_H2(g.label)[k]])),
    _heads: heads, _faqs: c.faqs, _mask: mask, _text: [...c.intro, ...PARTS.flatMap(p => flat[p]), ...c.faqs.flatMap(f => [f.q, f.a])],
    _intro: c.intro,
  });
}
/* ---- 2. FAQ answers and questions that repeat once the name is masked ---- */
const withGuide = rows.filter(r => r.guide);
const tally = (pick) => {
  const m = new Map();
  for (const r of withGuide) for (const f of r._faqs) {
    const text = pick(f); const key = norm(r._mask(text));
    if (!m.has(key)) m.set(key, { example: text, routes: [] });
    m.get(key).routes.push(r.route);
  }
  return m;
};
const answerForms = tally(f => f.a);
const questionForms = tally(f => f.q);
/* sentence level, so "Yes." or one shared closing line shows too */
const faqSentenceForms = new Map();
for (const r of withGuide) for (const f of r._faqs) for (const s of sentences(f.a)) {
  const key = norm(r._mask(s));
  if (!faqSentenceForms.has(key)) faqSentenceForms.set(key, { example: s, routes: new Set() });
  faqSentenceForms.get(key).routes.add(r.route);
}
for (const r of withGuide) {
  r.faq = {
    ownQuestions: r._faqs.map(f => f.q),
    templateQuestionAppended: `Is ${r.label} free to play?`,
    answersAlsoOnOtherPages: r._faqs.filter(f => answerForms.get(norm(r._mask(f.a))).routes.length > 1)
      .map(f => ({ q: f.q, a: f.a, alsoOn: answerForms.get(norm(r._mask(f.a))).routes.filter(x => x !== r.route) })),
    questionsAlsoOnOtherPages: r._faqs.filter(f => questionForms.get(norm(r._mask(f.q))).routes.length > 1)
      .map(f => ({ q: f.q, pages: questionForms.get(norm(r._mask(f.q))).routes.length })),
    ownAnswersAboutPriceOrSignup: r._faqs.filter(f => /free to play|sign ?up|\baccount\b|download|\bpay\b/i.test(f.q)).map(f => f.q),
  };
}

/* ---- 3. every guide sentence, masked, counted across guides ---- */
const sentenceForms = new Map();
for (const r of withGuide) for (const block of r._text) for (const s of sentences(block)) {
  const key = norm(r._mask(s)); if (key.split(' ').length < 4) continue;
  if (!sentenceForms.has(key)) sentenceForms.set(key, { example: s, routes: new Set() });
  sentenceForms.get(key).routes.add(r.route);
}
const repeatedGuideSentences = [...sentenceForms.values()].filter(v => v.routes.size > 1)
  .map(v => ({ sentence: v.example, pages: v.routes.size, routes: [...v.routes] })).sort((a, b) => b.pages - a.pages);

/* ---- 4. keyword h2 titles ---- */
const SEARCH_WORDS = /\b(free|online|daily|game|games|trivia|quiz|puzzle|simulator|simulation|sim)\b/i;
const h2Rows = withGuide.flatMap(r => Object.entries(r.h2).map(([part, text]) => ({ route: r.route, label: r.label, part, text,
  isDefault: r.h2IsDefault[part], carriesLabel: text.includes(r.label), extraWords: wc(text.replace(r.label, '')),
  appendsDescriptor: /^How to play .+?, (a|an|the) /i.test(text) || /Here's how to play this /i.test(text),
  hasSearchWord: SEARCH_WORDS.test(text.replace(r.label, '')) })));
for (const r of withGuide) r.keywordH2 = {
  howToPlayAppendsDescriptor: h2Rows.find(h => h.route === r.route && h.part === 'howToPlay').appendsDescriptor,
  h2CarryingTheGameName: h2Rows.filter(h => h.route === r.route && h.carriesLabel && !h.isDefault).length,
  timesTheNameIsPrintedInH2: h2Rows.filter(h => h.route === r.route && h.carriesLabel).length,
};

/* ---- 5. the brief's banned filler, and its near relations ---- */
const FILLER = JSON.parse(fs.readFileSync(path.join(HERE, 'copy-filler-phrases.json'), 'utf8'));
const fillerCount = (texts) => {
  const out = {};
  for (const [name, src] of Object.entries(FILLER.phrases)) {
    const re = new RegExp(src, 'gi'); let n = 0; const hits = [];
    for (const t of texts) { const m = String(t.text).match(re); if (m) { n += m.length; if (hits.length < 6) hits.push({ where: t.where, text: String(t.text).slice(0, 200) }); } }
    out[name] = { count: n, examples: hits };
  }
  return out;
};
const guideTexts = withGuide.flatMap(r => [...r._text, ...Object.values(r.h2), ...r._heads.map(h => h.heading)].map(text => ({ where: `guide ${r.route}`, text })));
const registryTexts = games.map(g => ({ where: `registry description ${g.path}`, text: g.description }));
const metaTexts = Object.entries(SEO_META).flatMap(([p, m]) => [{ where: `seoMeta title ${p}`, text: m.title }, { where: `seoMeta description ${p}`, text: m.description }]);
const savedTexts = [];
for (const r of routes.routes) {
  if (!r.inSitemap) continue;
  const file = r.url === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, 'public', r.url, 'index.html');
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
  savedTexts.push({ where: `saved page ${r.url}`, text: html });
}
const filler = { inGuides: fillerCount(guideTexts), inRegistryDescriptions: fillerCount(registryTexts), inSeoMeta: fillerCount(metaTexts), inSavedPagesOfTheSitemap: fillerCount(savedTexts) };

/* ---- 6. how alike are the guides inside one family (four word runs, name masked) ---- */
const shingles = r => {
  const w = norm(r._mask(r._text.join(' '))).split(' ').filter(Boolean); const set = new Set();
  for (let i = 0; i + 4 <= w.length; i += 1) set.add(w.slice(i, i + 4).join(' '));
  return set;
};
const sh = new Map(withGuide.map(r => [r.route, shingles(r)]));
const jaccard = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n += 1; return n / (a.size + b.size - n); };
const sharedOf = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n += 1; return n / a.size; };
const familyLikeness = [];
for (const [name, f] of Object.entries(routes.families)) {
  const members = f.registered.filter(p => sh.has(p)); const pairs = [];
  for (let i = 0; i < members.length; i += 1) for (let j = i + 1; j < members.length; j += 1)
    pairs.push({ a: members[i], b: members[j], jaccard: +jaccard(sh.get(members[i]), sh.get(members[j])).toFixed(3) });
  pairs.sort((x, y) => y.jaccard - x.jaccard);
  const mine = withGuide.filter(r => members.includes(r.route));
  familyLikeness.push({ family: name, kind: f.kind, pages: members.length,
    meanPairJaccardOfFourWordRuns: pairs.length ? +(pairs.reduce((n, p) => n + p.jaccard, 0) / pairs.length).toFixed(3) : null,
    mostAlikePair: pairs[0] ?? null,
    bodyWords: mine.reduce((n, r) => n + r.words.body, 0), headingWords: mine.reduce((n, r) => n + r.words.headings, 0),
    sectionHeadings: mine.reduce((n, r) => n + r.headings.sectionHeadings, 0), sectionHeadingsOverOneBlock: mine.reduce((n, r) => n + r.headings.overOneBlock, 0) });
}
for (const r of withGuide) {
  const sibs = (routes.families[r.family]?.registered ?? []).filter(p => p !== r.route && sh.has(p));
  const best = sibs.map(p => ({ route: p, share: sharedOf(sh.get(r.route), sh.get(p)) })).sort((a, b) => b.share - a.share)[0];
  r.likeness = best ? { closestSibling: best.route, shareOfMyFourWordRunsAlsoInIt: +(best.share * 100).toFixed(1) } : null;
}

/* ---- 7. tiers (my proposal, in copy-tiers.json) and what Phase 1 would remove ---- */
const TIERS = JSON.parse(fs.readFileSync(path.join(HERE, 'copy-tiers.json'), 'utf8'));
const PLAIN_H2_WORDS = wc('How to play') + wc('Rules') + wc('Example') + wc('Tips') + wc('FAQ');
for (const r of withGuide) {
  const t = TIERS.routes[r.route] ?? TIERS.families[r.family];
  r.tier = t?.tier ?? null; r.tierReason = t?.reason ?? null;
  const oneBlockHeadingWords = wcAll(r._heads.filter(h => h.blocks.length === 1).map(h => h.heading));
  const allSectionHeadingWords = wcAll(r._heads.map(h => h.heading));
  const h2Extra = wcAll(Object.values(r.h2)) - PLAIN_H2_WORDS;
  r.phase1 = {
    wordsInHeadingsOverOneBlock: oneBlockHeadingWords,
    wordsInAllSectionHeadings: allSectionHeadingWords,
    keywordWordsInTheFiveH2: h2Extra,
    templateFaqWords: r.words.faqTemplate,
    /* the three things the brief bans outright, on any tier */
    cutOnAnyTier: oneBlockHeadingWords + h2Extra + r.words.faqTemplate,
    /* a Tier B or C page keeps no sub headings at all, and a Tier C page hands its generic steps to the family page */
    cutIfNoSubHeadings: allSectionHeadingWords + h2Extra + r.words.faqTemplate,
    howToPlayWordsAFamilyPageCouldCarry: r.tier === 'C' ? r.words.howToPlay : 0,
  };
  r.phase1.estimatedCut = r.tier === 'A' ? r.phase1.cutOnAnyTier : r.phase1.cutIfNoSubHeadings + r.phase1.howToPlayWordsAFamilyPageCouldCarry;
  r.phase1.estimatedWordsLeft = r.words.all - r.phase1.estimatedCut;
}

/* ---- 8. totals ---- */
const sum = (f, list = withGuide) => list.reduce((n, r) => n + f(r), 0);
const sorted = f => withGuide.map(f).sort((a, b) => a - b);
const quart = f => { const s = sorted(f); const at = q => s[Math.min(s.length - 1, Math.floor(q * s.length))]; return { min: s[0], q1: at(0.25), median: at(0.5), q3: at(0.75), max: s[s.length - 1] }; };
const allHeads = withGuide.flatMap(r => r._heads.map(h => ({ route: r.route, ...h })));
const byTier = t => withGuide.filter(r => r.tier === t);
const tierLine = t => ({ pages: byTier(t).length, wordsToday: sum(r => r.words.all, byTier(t)), estimatedCut: sum(r => r.phase1.estimatedCut, byTier(t)), estimatedWordsLeft: sum(r => r.phase1.estimatedWordsLeft, byTier(t)) });
const summary = {
  games: games.length, guides: withGuide.length, gamesWithNoGuide: rows.filter(r => !r.guide).map(r => r.route),
  convertedToSections: withGuide.filter(r => r.converted).length, stillFlat: withGuide.filter(r => !r.converted).map(r => r.route),
  words: { all: sum(r => r.words.all), body: sum(r => r.words.body), headings: sum(r => r.words.headings), templateFaq: sum(r => r.words.faqTemplate),
    headingWordsPerHundredBodyWords: +(100 * sum(r => r.words.headings) / sum(r => r.words.body)).toFixed(1),
    bodyPerGuide: quart(r => r.words.body), guidesWithBodyBetween385And405Words: withGuide.filter(r => r.words.body >= 385 && r.words.body <= 405).length,
    guidesWithBodyUnder450Words: withGuide.filter(r => r.words.body < 450).length },
  sectionSequence: { note: 'GameSeoContent.tsx prints intro, how to play, rules, example, tips, FAQ unconditionally, so the order cannot differ.',
    guidesWithAllFivePartsFilled: withGuide.filter(r => r.blocks.howToPlay && r.blocks.rules && r.blocks.example && r.blocks.tips && r.blocks.faqsOwn).length },
  headings: { inGuideBlocks: sum(r => r.headings.total), h2: sum(r => r.headings.h2), h3Sections: sum(r => r.headings.h3), h4: sum(r => r.headings.h4), faqQuestionsAsH3: sum(r => r.headings.faqH3),
    perGuide: quart(r => r.headings.total), sectionHeadings: allHeads.length,
    sectionHeadingsOverOneBlock: allHeads.filter(h => h.blocks.length === 1).length,
    sectionHeadingsOverOneSentence: allHeads.filter(h => h.blocks.length === 1 && sentences(h.blocks[0]).length === 1).length,
    sectionHeadingsOverFewerThan25Words: allHeads.filter(h => wcAll(h.blocks) < 25).length,
    sectionHeadingsRestatingTheirOneLine: allHeads.filter(h => h.blocks.length === 1 && restates(h.heading, h.blocks[0]) >= 0.6).length,
    guidesWhereEverySectionHeadingSitsOverOneBlock: withGuide.filter(r => r.headings.sectionHeadings && r.headings.overOneBlock === r.headings.sectionHeadings).length },
  keywordH2: { h2: h2Rows.length, leftAtTheDefault: h2Rows.filter(h => h.isDefault).length, carryingTheGameName: h2Rows.filter(h => h.carriesLabel).length,
    nameTimesPrintedInH2PerPage: 5, howToPlayH2AppendingADescriptor: h2Rows.filter(h => h.part === 'howToPlay' && h.appendsDescriptor).length,
    howToPlayH2SayingFree: h2Rows.filter(h => h.part === 'howToPlay' && /\bfree\b/i.test(h.text)).length,
    h2WithASearchWordBeyondTheName: h2Rows.filter(h => h.hasSearchWord).length,
    tenExamples: ['/golf-higher-lower', '/soccer-career', '/nfl-connect-4', '/conquest-nba', '/perfect-season-mlb', '/football-grid', '/connections', '/front-office', '/stadium-tycoon', '/hockey-higher-lower']
      .map(p => ({ route: p, h2: h2Rows.find(h => h.route === p && h.part === 'howToPlay')?.text })),
    theFourThatDoNot: h2Rows.filter(h => h.part === 'howToPlay' && !h.appendsDescriptor).map(h => ({ route: h.route, h2: h.text })) },
  faq: { handWritten: sum(r => r._faqs.length), perGuide: quart(r => r._faqs.length), templateAppendedInCodeOnPages: withGuide.length,
    templateSource: 'src/components/seo/GameSeoContent.tsx lines 177 to 178',
    wholeAnswersOnMoreThanOnePage: [...answerForms.values()].filter(v => v.routes.length > 1).map(v => ({ answer: v.example, routes: v.routes })),
    questionFormsOnMoreThanOnePage: [...questionForms.values()].filter(v => v.routes.length > 1).map(v => ({ question: v.example, pages: v.routes.length, routes: v.routes })).sort((a, b) => b.pages - a.pages),
    answersOpeningWithABareYes: [...faqSentenceForms.entries()].filter(([k]) => k === 'yes').map(([, v]) => v.routes.size)[0] ?? 0,
    answersOpeningWithABareNo: [...faqSentenceForms.entries()].filter(([k]) => k === 'no').map(([, v]) => v.routes.size)[0] ?? 0,
    pagesWhoseOwnFaqAlreadyAsksAboutPriceOrSignup: withGuide.filter(r => r.faq.ownAnswersAboutPriceOrSignup.length).map(r => ({ route: r.route, questions: r.faq.ownAnswersAboutPriceOrSignup })) },
  repeatedGuideSentences: { onMoreThanOneGuide: repeatedGuideSentences.length, onMoreThanThreeGuides: repeatedGuideSentences.filter(s => s.pages > 3).length, list: repeatedGuideSentences },
  filler, familyLikeness,
  tiers: { A: tierLine('A'), B: tierLine('B'), C: tierLine('C'),
    tierCHowToPlayWordsInsideItsCut: sum(r => r.phase1.howToPlayWordsAFamilyPageCouldCarry, byTier('C')),
    warning: 'The in game "?" help (src/components/game/GameHelp.tsx) reads the how to play steps, the rules and the example from this same guide data. A Tier C page can stop PRINTING its generic steps, but the data has to keep them or the "?" goes empty, which breaks the house rule that every game shows instructions before play.',
    note:'estimatedCut: Tier A loses only what the brief bans on every page (headings over one block, the keyword words in the five h2, the template FAQ). Tier B and C also lose every sub heading. Tier C also hands its generic how to play steps to a family page. It is an estimate of removal, not of the rewrite.' },
};
const clean = r => { const { _heads, _faqs, _mask, _text, _intro, ...rest } = r; return { ...rest, sectionHeadingList: _heads.map(h => ({ part: h.part, level: h.level, heading: h.heading, blocksUnder: h.blocks.length, wordsUnder: wcAll(h.blocks) })) }; };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = { generatedBy: 'docs/audits/ad-readiness-2026-10-08/copy-measure.mjs', readFrom: 'src/data/gameContent, src/data/gameRegistry.ts, src/data/seoMeta.ts on branch ad-readiness (Release AL)',
    howToReadIt: { words: 'body = intro + the four parts + the hand written FAQ; headings = the five h2 plus every h3 and h4; all = body + headings + the template FAQ', overOneBlock: 'a section heading whose own list holds exactly one bullet or one paragraph', likeness: 'four word runs of the guide, with the game name masked, shared with the closest guide in the same family' },
    summary, games: withGuide.map(clean) };
  fs.writeFileSync(path.join(HERE, 'copy-by-game.json'), JSON.stringify(out, null, 1) + '\n');
  const s = summary;
  console.log(`guides ${s.guides}, words ${s.words.all} (body ${s.words.body}, headings ${s.words.headings}, template FAQ ${s.words.templateFaq})`);
  console.log(`section headings ${s.headings.sectionHeadings}: over one block ${s.headings.sectionHeadingsOverOneBlock}, over one sentence ${s.headings.sectionHeadingsOverOneSentence}, under 25 words ${s.headings.sectionHeadingsOverFewerThan25Words}, restating ${s.headings.sectionHeadingsRestatingTheirOneLine}`);
  console.log(`tiers A ${JSON.stringify(s.tiers.A)} B ${JSON.stringify(s.tiers.B)} C ${JSON.stringify(s.tiers.C)}`);
  console.log('wrote copy-by-game.json');
}

export { rows, withGuide, games, SEO_META, norm, wc, wcAll, sentences, HERE, ROOT, restates, masker, PARTS,
  answerForms, questionForms, faqSentenceForms, repeatedGuideSentences, h2Rows, filler, routes, familyLikeness, TIERS, summary };
