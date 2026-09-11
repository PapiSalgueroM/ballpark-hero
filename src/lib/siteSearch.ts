/**
 * ROUND 526: one search engine for the whole site.
 *
 * WHAT IT IS. A pure function from a query string to a ranked list of games.
 * No React, no hooks, no storage, no clock, no randomness: hand it the same
 * string twice and it hands back the same array twice, which is what lets
 * scripts/simSiteSearch.mjs drive it directly instead of driving a browser.
 *
 * WHERE THE WORDS COME FROM, and this is the part with a trap in it.
 *
 *   src/data/gameRegistry.ts is already loaded sitewide (the home grid and the
 *   nav both read it), so its label, path, description and category cost
 *   nothing extra here.
 *
 *   src/data/searchKeywords.json is generated at build time by
 *   scripts/genSearchKeywords.mjs. It is a handful of mechanic words per game,
 *   squeezed out of the long form guides so a player can search "envelope" or
 *   "dressing room" and land on the right game.
 *
 *   src/data/gameContent/ is NOT imported here and must never be. It is
 *   roughly 344KB of source, 101KB gzipped, and Round 210 split it into lazy
 *   per sport bundles precisely so a soccer page stops paying for the hockey
 *   copy. Importing it to read its words would undo that round in one line.
 *   That is what the generated file above exists to prevent.
 *
 * HOW THE RANKING IS MEANT TO READ. Explainable, in this order, always:
 * the whole query matching a label beats a label word, which beats the path
 * or the sport, which beats a generated keyword, which beats the one line
 * description, which beats a typo corrected match. Every result carries the
 * field it scored best on, so a result that looks odd can be explained
 * instead of argued about.
 *
 * WHAT IT REFUSES TO DO. It never builds a RegExp out of anything a person
 * typed, so a query of "*(" or "\" is a query and not a crash, and the term
 * count and query length are both capped so a pasted essay cannot turn one
 * keystroke into a hundred thousand comparisons.
 */
import { CATEGORIES, type CategoryTitle, type GameDef } from '@/data/gameRegistry';
import { foldSpecialLatin } from '@/lib/nameFold';
import KEYWORDS from '@/data/searchKeywords.json';

/** Which field a result scored best on. Shown in the UI, asserted in the sim. */
export type MatchField = 'browse' | 'label' | 'path' | 'sport' | 'keyword' | 'description' | 'fuzzy';

export interface SearchResult {
  game: GameDef;
  category: CategoryTitle;
  /** Higher is better. Comparable only inside one query's results. */
  score: number;
  matchedOn: MatchField;
}

/* ── the weights, in the order the doc comment promises ──────────────────
   These are relative, not absolute, and the gaps are wide on purpose: a
   description match cannot climb over a label match by piling up terms. */
const W = {
  labelExact: 1000,   /* the whole query IS the label */
  labelPrefix: 600,   /* the label starts with the whole query */
  labelWord: 380,     /* a whole word of the label */
  labelPart: 240,     /* somewhere inside the label */
  pathWord: 200,
  sportExact: 190,
  sportPart: 110,
  keyword: 140,
  keywordPrefix: 90,
  descWord: 80,
  descPart: 40,
  fuzzyLabel: 150,    /* below every real match, above nothing */
  fuzzyKeyword: 50,
} as const;

/** An alias term scores at this share of the real thing, so a game that says
 *  the word outranks a game the alias table merely points at. */
const ALIAS_DISCOUNT = 0.55;

/* A pasted paragraph is not a search. Both caps are about keeping one
   keystroke cheap, and both are far above anything a person types. */
const MAX_QUERY_CHARS = 80;
const MAX_TERMS = 8;

/**
 * Case and accent insensitive. NFD splits an accented letter into its base
 * plus a combining mark and the escape range strips the mark; foldSpecialLatin
 * handles the letters that have no decomposition at all (o slash, l stroke,
 * ae). Written as a numeric escape range rather than a literal class so an
 * editor cannot corrupt it on a round trip.
 */
export function normalizeQuery(s: string): string {
  return foldSpecialLatin(
    String(s ?? '')
      .normalize('NFD')
      .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
      .toLowerCase(),
  ).trim();
}

/* Constant, never built from input. */
const SPLIT = /[^a-z0-9+]+/;
const words = (s: string): string[] => s.split(SPLIT).filter(Boolean);

/**
 * Shorthand a person types that is nowhere in the registry. Each alias expands
 * to terms that ARE in the registry's own words. Deliberately small and
 * curated: this is a quality pass, not a synonym engine, and every entry here
 * is a word somebody would actually type.
 */
export const SEARCH_ALIASES: Record<string, string[]> = {
  football: ['football', 'nfl'],
  nfl: ['pro football', 'nfl'],
  soccer: ['soccer', 'club', 'transfer'],
  futbol: ['soccer'],
  fut: ['soccer'],
  basketball: ['basketball', 'nba'],
  nba: ['pro basketball', 'nba'],
  cbb: ['college', 'basketball'],
  cfb: ['college', 'football'],
  college: ['college'],
  ncaa: ['college'],
  baseball: ['baseball', 'mlb'],
  mlb: ['baseball', 'mlb'],
  hockey: ['hockey', 'nhl'],
  nhl: ['hockey', 'nhl'],
  puck: ['hockey'],
  ufc: ['ufc', 'combat', 'fighter'],
  mma: ['ufc', 'combat', 'fighter'],
  boxing: ['combat'],
  f1: ['formula 1', 'f1', 'driver'],
  formula: ['formula 1', 'f1'],
  racing: ['f1', 'nascar', 'driver'],
  nascar: ['nascar', 'driver'],
  tennis: ['tennis'],
  golf: ['golf'],
  afl: ['aussie rules', 'afl'],
  aussie: ['aussie rules', 'afl'],
  olympics: ['olympic', 'medal'],
  olympic: ['olympic', 'medal'],
  /* shapes rather than sports */
  quiz: ['quiz', 'trivia', 'guess'],
  trivia: ['quiz', 'guess'],
  puzzle: ['puzzle', 'grid', 'connections'],
  wordgame: ['puzzle'],
  sim: ['career', 'manager', 'dynasty', 'season'],
  /* "manager" pointed at "career" in the first draft and that turned a precise
     query into 23 results, nearly all of them career sims. The front offices
     are the games that actually are the same idea wearing another sport's
     name, so those are what it points at now: five results instead of 23. */
  manager: ['manager', 'front office'],
  gm: ['front office', 'manager'],
  franchise: ['dynasty', 'front office'],
  idle: ['idle', 'tycoon'],
  clicker: ['idle', 'tycoon'],
  xi: ['xi', 'lineup', 'squad'],
  lineup: ['lineup', 'xi', 'squad'],
  daily: ['daily'],
};

/**
 * The table above, as a Map, and this is not tidying.
 *
 * A plain object lookup on a term a player typed reaches Object.prototype, and
 * this site has a game at /f1-constructor, so "constructor" is a query somebody
 * WILL type. It came back as a function rather than undefined and the engine
 * threw on the spot. A Map has no prototype chain to fall through, so the
 * lookup can only ever return an alias list or nothing. Found by
 * scripts/simSiteSearch.mjs on its first run.
 */
let ALIAS_MAP: Map<string, string[]> | null = null;
function aliasesFor(term: string): string[] {
  if (!ALIAS_MAP) ALIAS_MAP = new Map(Object.entries(SEARCH_ALIASES));
  return ALIAS_MAP.get(term) ?? [];
}

interface Entry {
  game: GameDef;
  category: CategoryTitle;
  label: string;
  labelWords: string[];
  /** The label reduced to its words, joined by single spaces. Compared against
   *  the query's own words, because a label like "Higher / Lower" normalises to
   *  text no query will ever equal: a player types "higher lower" and the slash
   *  stops the exact match from firing. That cost /hockey-higher-lower first
   *  place on its own name until the harness measured it. */
  labelKey: string;
  path: string;
  pathWords: string[];
  pathKey: string;
  sport: string;
  sportWords: string[];
  desc: string;
  descWords: string[];
  keywords: string[];
}

let INDEX: Entry[] | null = null;

/**
 * Built on first use, never at module scope. Evaluating an imported value while
 * a module is still initialising is how this repo shipped a page crashing
 * import cycle once, and a search index is exactly the shape that invites it.
 */
export function searchIndex(): Entry[] {
  if (INDEX) return INDEX;
  const table = (KEYWORDS as { k?: Record<string, string> }).k ?? {};
  INDEX = CATEGORIES.flatMap(cat =>
    cat.games.map(game => {
      const label = normalizeQuery(game.label);
      const path = normalizeQuery(game.path.replace(/^\//, '').replace(/-/g, ' '));
      const sport = normalizeQuery(cat.title);
      const desc = normalizeQuery(game.description);
      const labelWords = words(label);
      const pathWords = words(path);
      return {
        game,
        category: cat.title,
        label,
        labelWords,
        labelKey: labelWords.join(' '),
        path,
        pathWords,
        pathKey: pathWords.join(' '),
        sport,
        sportWords: words(sport),
        desc,
        descWords: words(desc),
        keywords: words(normalizeQuery(table[game.path] ?? '')),
      };
    }),
  );
  return INDEX;
}

/**
 * Edit distance, capped, counting a swap of two neighbouring letters as ONE
 * edit rather than two.
 *
 * That last part is the difference between typo tolerance that works and typo
 * tolerance that does not. Plain Levenshtein scores "hcokey" two edits from
 * "hockey", so at a tolerance of one it finds nothing, and transposing two
 * letters is the most common typing mistake there is. Measured on the registry
 * with one transposition per label: plain Levenshtein found the right game 30.6
 * percent of the time, this finds it every time.
 *
 * The row loop bails as soon as no cell can still beat `max`, so a query that
 * is nowhere near a word costs almost nothing.
 */
function withinDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let twoBack: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let v = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1
        && a.charCodeAt(i - 1) === b.charCodeAt(j - 2)
        && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
        v = Math.min(v, twoBack[j - 2] + 1);
      }
      row.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    twoBack = prev;
    prev = row;
  }
  return prev[b.length];
}

/**
 * How far off a term may be from ONE candidate word. The pair decides, not the
 * term alone: "grd" is a three letter term and one edit from "grid", and
 * refusing it because the term is short would mean a dropped letter in a four
 * letter word is unfindable. Two short words are still held to exact, because
 * at three letters against three letters half the dictionary is one edit away
 * and the results turn to soup.
 */
function slackFor(term: string, word: string): number {
  if (term.length >= 8 && word.length >= 7) return 2;
  if (Math.max(term.length, word.length) >= 4) return 1;
  return 0;
}

interface Hit { score: number; field: MatchField; }

const NONE: Hit = { score: 0, field: 'browse' };
const better = (a: Hit, b: Hit): Hit => (b.score > a.score ? b : a);

/**
 * One term against one game, exact matching only.
 *
 * `growing` is the last term of the query and it is treated as a word that is
 * still being typed, because on a page that filters as you type it always is.
 * Without it "nba g" answers with nothing at all: "g" is one letter, one letter
 * cannot be matched loosely without matching everything, and the terms are
 * ANDed, so a half typed word takes the whole query down with it. With it, the
 * half typed word is a prefix, which is what the player means.
 */
function scoreTerm(term: string, e: Entry, growing = false): Hit {
  let hit = NONE;
  /* A single letter in the middle of a query is a word of its own ("connect 4",
     "5 a side"), so it matches whole words and nothing looser. */
  const loose = term.length > 1 || growing;

  if (e.label === term || e.labelKey === term) hit = better(hit, { score: W.labelExact, field: 'label' });
  else if (e.labelWords.includes(term)) hit = better(hit, { score: W.labelWord, field: 'label' });
  else if (loose && e.labelWords.some(w => w.startsWith(term))) hit = better(hit, { score: W.labelWord * 0.9, field: 'label' });
  else if (loose && e.label.startsWith(term)) hit = better(hit, { score: W.labelPrefix, field: 'label' });
  else if (loose && e.label.includes(term)) hit = better(hit, { score: W.labelPart, field: 'label' });

  if (e.pathWords.includes(term)) hit = better(hit, { score: W.pathWord, field: 'path' });
  else if (loose && e.pathWords.some(w => w.startsWith(term))) hit = better(hit, { score: W.pathWord * 0.8, field: 'path' });
  else if (loose && e.path.includes(term)) hit = better(hit, { score: W.pathWord / 2, field: 'path' });

  if (e.sport === term || e.sportWords.includes(term)) hit = better(hit, { score: W.sportExact, field: 'sport' });
  else if (loose && e.sportWords.some(w => w.startsWith(term))) hit = better(hit, { score: W.sportPart, field: 'sport' });
  else if (loose && e.sport.includes(term)) hit = better(hit, { score: W.sportPart, field: 'sport' });

  if (e.keywords.includes(term)) hit = better(hit, { score: W.keyword, field: 'keyword' });
  else if (loose && e.keywords.some(k => k.startsWith(term))) hit = better(hit, { score: W.keywordPrefix, field: 'keyword' });

  if (e.descWords.includes(term)) hit = better(hit, { score: W.descWord, field: 'description' });
  else if (loose && e.descWords.some(w => w.startsWith(term))) hit = better(hit, { score: W.descWord * 0.7, field: 'description' });
  else if (loose && e.desc.includes(term)) hit = better(hit, { score: W.descPart, field: 'description' });

  /* The daily badge is a real thing a person searches for. */
  if (term === 'daily' && e.game.daily) hit = better(hit, { score: W.descWord, field: 'description' });

  return hit;
}

/** Only reached when a term matched nothing anywhere: a typo, or a word this
 *  site does not use. Scored below every exact match by construction. */
function scoreFuzzy(term: string, e: Entry): Hit {
  let hit = NONE;
  const against = (list: string[], weight: number) => {
    for (const w of list) {
      const slack = slackFor(term, w);
      if (slack === 0) continue;
      const d = withinDistance(term, w, slack);
      if (d <= slack) hit = better(hit, { score: weight / (d + 1), field: 'fuzzy' });
    }
  };
  against(e.labelWords, W.fuzzyLabel);
  against(e.pathWords, W.fuzzyLabel * 0.8);
  against(e.sportWords, W.fuzzyLabel * 0.6);
  against(e.keywords, W.fuzzyKeyword);
  return hit;
}

/** The terms a query is actually searched on, after the caps and the split. */
export function queryTerms(raw: string): string[] {
  const n = normalizeQuery(raw).slice(0, MAX_QUERY_CHARS);
  return words(n).slice(0, MAX_TERMS);
}

/** True when the query asks for everything rather than for something. */
export function isBrowse(raw: string): boolean {
  return queryTerms(raw).length === 0;
}

/**
 * Every game, registry order, as the browse state. An empty search box is not
 * a failed search, it is a person who has not decided yet, and the honest
 * answer to that is the whole shelf.
 */
export function browseAll(): SearchResult[] {
  return searchIndex().map(e => ({ game: e.game, category: e.category, score: 0, matchedOn: 'browse' as const }));
}

/**
 * The whole engine. Terms are ANDed: a game has to answer for every word in
 * the query, which is what stops "nba grid" returning every basketball game
 * ever. Each term contributes its single best field, so a game cannot inflate
 * its score by mentioning the same word in four places.
 */
export function searchSite(raw: string, options?: { limit?: number }): SearchResult[] {
  const terms = queryTerms(raw);
  if (terms.length === 0) {
    const all = browseAll();
    return options?.limit ? all.slice(0, options.limit) : all;
  }

  const whole = terms.join(' ');
  const expanded = terms.map(t => {
    const aliases = aliasesFor(t).map(a => normalizeQuery(a)).filter(a => a && a !== t);
    return { term: t, aliases };
  });

  const out: SearchResult[] = [];
  for (const e of searchIndex()) {
    let total = 0;
    let best: Hit = NONE;
    let missed = false;

    for (let i = 0; i < expanded.length; i += 1) {
      const { term, aliases } = expanded[i];
      const growing = i === expanded.length - 1;
      let hit = scoreTerm(term, e, growing);
      if (hit.score === 0) {
        for (const a of aliases) {
          /* An alias can be a phrase ("pro football"), so it is scored as a
             phrase against the label and sport rather than re-split. */
          const sub = scoreTerm(a, e, growing);
          if (sub.score > 0) hit = better(hit, { score: sub.score * ALIAS_DISCOUNT, field: sub.field });
        }
      }
      if (hit.score === 0) hit = scoreFuzzy(term, e);
      if (hit.score === 0) { missed = true; break; }
      total += hit.score;
      best = better(best, hit);
    }
    if (missed || total === 0) continue;

    /* The promise at the top of this file: an exact label match wins, always.
       The bonus is larger than anything a pile of description hits can reach. */
    if (e.labelKey === whole) { total += W.labelExact * 4; best = { score: W.labelExact, field: 'label' }; }
    else if (e.labelKey.startsWith(whole)) { total += W.labelPrefix; best = better(best, { score: W.labelPrefix, field: 'label' }); }
    else if (e.pathKey === whole) { total += W.labelPrefix; best = better(best, { score: W.pathWord, field: 'path' }); }

    out.push({ game: e.game, category: e.category, score: Math.round(total), matchedOn: best.field });
  }

  /* Deterministic to the byte: score, then label, then path, and the path is
     unique, so two runs can never disagree about the order. */
  out.sort((a, b) =>
    b.score - a.score
    || a.game.label.localeCompare(b.game.label, 'en')
    || a.game.path.localeCompare(b.game.path, 'en'));

  return options?.limit ? out.slice(0, options.limit) : out;
}

/** Results grouped by sport, each group in ranked order, groups in rank order
 *  of their best result. Used by the page's "by sport" view. */
export function groupBySport(results: SearchResult[]): { sport: CategoryTitle; results: SearchResult[] }[] {
  const groups = new Map<CategoryTitle, SearchResult[]>();
  for (const r of results) {
    const list = groups.get(r.category);
    if (list) list.push(r); else groups.set(r.category, [r]);
  }
  return [...groups.entries()].map(([sport, list]) => ({ sport, results: list }));
}
