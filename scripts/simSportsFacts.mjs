/**
 * simSportsFacts: Round 660. The hand typed facts in seven game files are pinned
 * to a verification record, and nothing ships that the record does not hold.
 *
 * WHY THIS EXISTS. The 2026-09-19 data audit found the Combat Chain accepting
 * fights that never happened (Aspinall "beat" Jones at UFC 313; they never
 * fought, and UFC 313 was Pereira v Ankalaev) and fights that went the other
 * way, UFC records a year out of date, F1 win counts that were a season stale,
 * Olympic medal totals that contradicted the athlete's own clue, and Bobby Jones
 * with five majors instead of seven. Every one of those files was hand typed and
 * none carried a source. Round 660 checked each fact against two independent
 * sources (one official, one independent, Wikipedia never one of them) and wrote
 * what it found to scripts/data/sportsFactsVerified2026-09.json with the URLs
 * and the date. This harness holds the shipped files to that record.
 *
 * WHAT IT CHECKS. Each section loads the shipped module itself (bundled with
 * esbuild, so it reads the values the game reads, not a regex over the text)
 * and compares it with the record, both ways: a shipped fact the record does not
 * hold fails, a shipped fact that disagrees with its verified value fails, and a
 * record entry the file no longer ships fails, so the record cannot rot into a
 * list of things that used to be true.
 *
 *    1. The record itself. Every fact node carries its sources: a node with no
 *       src or an empty one fails by name, it is never skipped. Two sources on
 *       two different ORGANISATIONS (ufc.com and ufc.com.br are one, so are
 *       formula1.com and f1.com, nbcolympics.com and nbcsports.com, and every
 *       regional subdomain of one site), at least one official for its sport
 *       and at least one independent of it, none on Wikipedia or a copy of it
 *       (wikiwand, dbpedia and the like), and a check date that is a real
 *       calendar date and has happened. A node that says no official page
 *       supports it (noOfficial) cannot count the official URL it lists as a
 *       source. And no node may carry unverifiable, underSourced, unmatched,
 *       or a note saying part of it is unsourced: the record admitting a gap
 *       is a gap.
 *    2. UFC Guesser (src/data/ufcFighters.ts): record, birth date, nationality,
 *       last UFC division, first and latest UFC year, knockouts, submissions.
 *    3. Combat Chain fighters (src/data/ufcChainData.ts UFC_FIGHTERS): record,
 *       a chain division the fighter really fought in, Hall of Fame flag.
 *    4. Combat Chain links (FIGHT_RESULTS): every link the chain accepts is a
 *       verified fight with the right winner, loser, event, year, method,
 *       round, time and title flag.
 *    5. F1 drivers (src/data/f1Drivers.ts): every clue, word for word. Only the
 *       one word opener may be editorial, and it may not carry a number. The
 *       answer is in the record too: driverName and every accepted name, and
 *       each one typed into the game's own resolver finds its own card.
 *    6. F1 constructors (src/data/f1Constructors.ts): the same, with
 *       constructorName, plus a clue naming the team's current identity ("now
 *       racing as the Audi works team") needs that identity accepted.
 *    7. Perfect Lineup F1 pool (src/data/f1PerfectLineupPool.ts): the team,
 *       era and nationality every card shows.
 *    8. The Medal Games (src/data/olympicsAthletes.ts): every field shown, and
 *       the country as the page RENDERS it: the component the page uses is
 *       drawn with react-dom/server for every athlete, and the flag it draws
 *       and the name beside it are checked against the record, so a Soviet
 *       Union card cannot draw Russia's flag and a Jamaica flag cannot be
 *       labelled Kenya. The page itself must draw the country only through
 *       that component.
 *    9. Golf legends (src/data/golfLegends.ts): majors, first and last win,
 *       nationality and the majors won.
 *   10. The golf placeholder rows: public.golf_majors stores a single dash
 *       character (U+2014) for years a major was not played. Every read of that table in src and
 *       supabase/functions must go through the List Quiz's onlyNames filter,
 *       the four golf lists fetched through the real fetch closures (against a
 *       stub that serves dash rows) must return no dash, and no golfer in
 *       golfLegends may be a dash.
 *   Sections 2 to 9 also refuse a duplicate: the same fighter, fight, driver,
 *   constructor, pool name, athlete (by name, whatever the id) or golfer twice.
 *
 * Nothing here touches the network: section 10 stubs the database client.
 *
 * NEGATIVE CONTROLS (SPORTS_FACTS_CONTROL). Each edits only an in memory copy
 * and refuses to run if its anchor is missing or the edit changed nothing. The
 * harness then runs twice, untouched and with the control, and compares the
 * failures: the control proves its check only if every NEW failure is in its
 * own section, at least the stated number of them come from the check it
 * targets, and no other section gained or lost a failure. Comparing against
 * the untouched run is what lets a control prove something while the record
 * still has open reds. Under a control the harness exits 1 when the break was
 * caught that way and 2 when it was not (the control proves nothing).
 *   onesource      one fact in the record loses its second source         section 1
 *   nosrc          four facts lose their src (three deleted, one emptied)  section 1
 *   flagged        unverifiable, underSourced, unmatched and an unsourced
 *                  note are each put on one node                          section 1
 *   mirror         a wikiwand and a dbpedia URL stand in for sources      section 1
 *   baddate        a 30 February check date and a future one              section 1
 *   sameorg        ufc.com + ufc.com.br, formula1.com + f1.com, NBC's two
 *                  sites and espn.com + africa.espn.com                   section 1
 *   contradicted   a noOfficial fact lists the official page it says
 *                  disagrees as one of its two sources                    section 1
 *   ufcfighter     one UFC Guesser fighter's win count changes            section 2
 *   dupufc         a UFC Guesser row is listed twice                      section 2
 *   chainfighter   one chain fighter is flagged a Hall of Famer wrongly   section 3
 *   dupchain       a chain fighter row is listed twice                    section 3
 *   fakefight      the invented Aspinall over Jones link is put back      section 4
 *   dupfight       the record holds one fight twice                       section 4
 *   f1driver       Verstappen's win count goes back to 63                 section 5
 *   editorial      Verstappen's win count clue is marked editorial with
 *                  its sources deleted                                     section 5
 *   dupdriver      Hamilton's card is listed twice                        section 5
 *   answername     Verstappen's answer is misspelt                        section 5
 *   f1constructor  McLaren's title count goes back to 9                   section 6
 *   editorialnumber Ferrari's editorial opener becomes "16 titles"        section 6
 *   dupconstructor Ferrari's card is listed twice                         section 6
 *   identity       Renault stops accepting Alpine though a clue says it
 *                  now competes as Alpine                                  section 6
 *   alias          McLaren accepts "Ferrari", which the resolver sends to
 *                  Ferrari's card                                          section 6
 *   f1pool         Prost's card goes back to the 1990s                    section 7
 *   duppool        Prost's pool card is listed twice                      section 7
 *   olympics       Biles's medal line goes back to 7, 1, 2                section 8
 *   dupathlete     Biles is listed again under a new id, in the file and
 *                  the record                                              section 8
 *   sovietflag     the country component draws a flag for every value
 *                  again, so the Soviet Union gets Russia's               section 8
 *   flaglabel      the Jamaica flag is labelled Kenya                     section 8
 *   pageflag       the page draws the result line's flag itself           section 8
 *   golf           Bobby Jones goes back to 5 majors                      section 9
 *   dupgolf        Bobby Jones is listed twice                            section 9
 *   golfdash       the Masters list reads golf_majors without onlyNames   section 10
 *
 * Run: node scripts/simSportsFacts.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECORD_PATH = path.join(ROOT, 'scripts/data/sportsFactsVerified2026-09.json');
const CONTROL = process.env.SPORTS_FACTS_CONTROL || '';
/* section: where the break must show. tag: the check that must catch it.
   count: how many new failures that check must report, when it is exact. */
const CONTROLS = {
  onesource: { section: 1, tag: 'sources' },
  nosrc: { section: 1, tag: 'nosrc', count: 4 },
  flagged: { section: 1, tag: 'flagged', count: 4 },
  mirror: { section: 1, tag: 'wiki', count: 2 },
  baddate: { section: 1, tag: 'date', count: 2 },
  sameorg: { section: 1, tag: 'org', count: 4 },
  contradicted: { section: 1, tag: 'contradicted', count: 1 },
  ufcfighter: { section: 2, tag: 'value' },
  dupufc: { section: 2, tag: 'duplicate' },
  chainfighter: { section: 3, tag: 'value' },
  dupchain: { section: 3, tag: 'duplicate' },
  fakefight: { section: 4, tag: 'link' },
  dupfight: { section: 4, tag: 'duplicate' },
  f1driver: { section: 5, tag: 'clue' },
  editorial: { section: 5, tag: 'editorial' },
  dupdriver: { section: 5, tag: 'duplicate' },
  answername: { section: 5, tag: 'answer' },
  f1constructor: { section: 6, tag: 'clue' },
  editorialnumber: { section: 6, tag: 'editorial', count: 1 },
  dupconstructor: { section: 6, tag: 'duplicate' },
  identity: { section: 6, tag: 'identity', count: 1 },
  alias: { section: 6, tag: 'resolve', count: 1 },
  f1pool: { section: 7, tag: 'value' },
  duppool: { section: 7, tag: 'duplicate' },
  olympics: { section: 8, tag: 'value' },
  dupathlete: { section: 8, tag: 'duplicate' },
  sovietflag: { section: 8, tag: 'render' },
  flaglabel: { section: 8, tag: 'render' },
  pageflag: { section: 8, tag: 'page' },
  golf: { section: 9, tag: 'value' },
  dupgolf: { section: 9, tag: 'duplicate' },
  golfdash: { section: 10, tag: 'golfdash' },
};
if (CONTROL && !(CONTROL in CONTROLS)) {
  console.error(`SPORTS_FACTS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}

/* A control that edits nothing proves nothing, so every edit asserts it landed. */
const refuseControl = (why) => {
  console.error(`CONTROL ${CONTROL} cannot run: ${why}. The control is stale and a run would be green for the wrong reason.`);
  process.exit(2);
};
const rewrite = (text, from, to, what) => {
  if (!text.includes(from)) refuseControl(`${what} not found`);
  const out = text.replace(from, to);
  if (out === text) refuseControl(`rewriting ${what} changed nothing`);
  return out;
};
const eolOf = (text) => (text.includes('\r\n') ? '\r\n' : '\n');
/* The object literal around an anchor, matched by braces outside strings. */
const blockAround = (text, anchor, what) => {
  const at = text.indexOf(anchor);
  if (at < 0) refuseControl(`${what} not found`);
  let start = -1;
  for (let k = at, depth = 0; k >= 0; k--) {
    if (text[k] === '}') depth += 1;
    else if (text[k] === '{') { if (depth === 0) { start = k; break; } depth -= 1; }
  }
  if (start < 0) refuseControl(`no object opens before ${what}`);
  let depth = 0;
  for (let k = start; k < text.length; k++) {
    const ch = text[k];
    if (ch === "'" || ch === '"' || ch === '`') {
      for (k += 1; k < text.length && text[k] !== ch; k++) if (text[k] === '\\') k += 1;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') { depth -= 1; if (depth === 0) return text.slice(start, k + 1); }
  }
  return refuseControl(`the object around ${what} never closes`);
};
/* Lists a block (a multi line object) or a line (a one line row) twice. */
const listBlockTwice = (text, anchor, what, edit = (b) => b) => {
  const block = blockAround(text, anchor, what);
  const copy = edit(block);
  return rewrite(text, block, `${block},${eolOf(text)}  ${copy}`, what);
};
const listLineTwice = (text, anchor, what) => {
  const line = text.split(/\r?\n/).find(l => l.includes(anchor));
  if (!line) refuseControl(`${what} not found`);
  return rewrite(text, line, `${line}${eolOf(text)}${line}`, what);
};
const must = (ok, what) => { if (!ok) refuseControl(what); };

// ---------------------------------------------------------------------------
// Loading the shipped modules. Each is bundled on its own, with an optional in
// memory rewrite of one source file, into a private temp directory.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simSportsFacts-'));
const norm = (p) => path.resolve(p).toLowerCase();
let bundleNo = 0;
const memoryPlugin = (overrides, stubs) => {
  const overrideMap = new Map(Object.entries(overrides).map(([k, v]) => [norm(path.join(ROOT, k)), v]));
  return {
    name: 'sports-facts-memory',
    setup(b) {
      for (const [spec] of Object.entries(stubs)) {
        const filter = new RegExp('^' + spec.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '$');
        b.onResolve({ filter }, () => ({ path: spec, namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({ contents: stubs[a.path], loader: 'js' }));
      }
      b.onLoad({ filter: /\.(ts|tsx)$/ }, (a) => {
        const hit = overrideMap.get(norm(a.path));
        if (hit === undefined) return undefined;
        return { contents: hit, loader: a.path.endsWith('x') ? 'tsx' : 'ts', resolveDir: path.dirname(a.path) };
      });
    },
  };
};
async function loadModule(rel, overrides = {}, stubs = {}) {
  const outfile = path.join(TMP, `m${bundleNo++}.mjs`);
  await build({
    entryPoints: [path.join(ROOT, rel)], bundle: true, format: 'esm', platform: 'node', outfile,
    logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, jsx: 'automatic',
    plugins: [memoryPlugin(overrides, stubs)],
  });
  return import(pathToFileURL(outfile).href);
}
/* The Olympic country exactly as the page draws it: the page's own component,
   rendered to markup by react-dom/server. Bundled as CommonJS because
   react-dom/server requires node built ins, which an ESM bundle cannot. */
async function loadCountryRenderer(overrides = {}) {
  const outfile = path.join(TMP, `m${bundleNo++}.cjs`);
  await build({
    stdin: {
      contents: [
        "import { createElement } from 'react';",
        "import { renderToStaticMarkup } from 'react-dom/server';",
        "import { OlympicCountry } from '@/components/olympics/OlympicCountry';",
        "export { FLAG_CODES } from '@/components/FlagImg';",
        'export const render = (country) => renderToStaticMarkup(createElement(OlympicCountry, { country, size: 18 }));',
      ].join('\n'),
      resolveDir: ROOT, loader: 'tsx', sourcefile: 'olympic-country-render.tsx',
    },
    bundle: true, format: 'cjs', platform: 'node', outfile, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [memoryPlugin(overrides, {})],
  });
  return createRequire(import.meta.url)(outfile);
}
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

const UFCF = 'src/data/ufcFighters.ts';
const CHAIN = 'src/data/ufcChainData.ts';
const F1D = 'src/data/f1Drivers.ts';
const F1C = 'src/data/f1Constructors.ts';
const F1P = 'src/data/f1PerfectLineupPool.ts';
const OLY = 'src/data/olympicsAthletes.ts';
const GOLF = 'src/data/golfLegends.ts';
const LISTQUIZ = 'src/lib/listQuiz.ts';
const COUNTRY = 'src/components/olympics/OlympicCountry.tsx';
const OLY_PAGE = 'src/pages/Olympics.tsx';

const BASE_RECORD = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));

// ---------------------------------------------------------------------------
// The controls: one rewritten source or one edited copy of the record each.
function applyControl(name) {
  const record = structuredClone(BASE_RECORD);
  const over = {};
  const hasSrc = (node, what) => must(node && Array.isArray(node.src) && node.src.length >= 2, `${what} has no sources to work with`);
  switch (name) {
    case 'onesource': {
      hasSrc(record.golf['Bobby Jones'], 'Bobby Jones');
      record.golf['Bobby Jones'].src = record.golf['Bobby Jones'].src.slice(0, 1);
      break;
    }
    case 'nosrc': {
      const ko = record.ufcFighters['Alex Pereira']?.koTko; hasSrc(ko, "Pereira's knockouts"); delete ko.src;
      hasSrc(record.fightResults[0], 'the first verified fight'); delete record.fightResults[0].src;
      const era = record.f1Pool['Alain Prost']?.era; hasSrc(era, "Prost's era"); delete era.src;
      const medals = record.olympics['biles-2024']?.medalSummary; hasSrc(medals, "Biles's medal line"); medals.src = [];
      break;
    }
    case 'flagged': {
      const title = record.f1Constructors.mclaren?.clues.find(c => /Constructors' Championships/.test(c.text));
      must(title && !title.unverifiable, "McLaren's title clue");
      title.unverifiable = 'No opened page states the tenth title.';
      const rec = record.ufcFighters['Alex Pereira']?.record; must(rec, "Pereira's record"); rec.underSourced = true;
      const nm = record.olympics['biles-2024']?.name; must(nm, "Biles's name"); nm.unmatched = 'one host spells it differently';
      const jones = record.golf['Bobby Jones']; must(jones && !jones.note, 'Bobby Jones without a note');
      jones.note = 'The 1926 Open line could not be sourced from any opened page.';
      break;
    }
    case 'mirror': {
      hasSrc(record.golf['Bobby Jones'], 'Bobby Jones');
      record.golf['Bobby Jones'].src[1] = 'https://www.wikiwand.com/en/articles/Bobby_Jones_(golfer)';
      const team = record.f1Pool['Alain Prost']?.team; hasSrc(team, "Prost's team");
      team.src[team.src.length - 1] = 'https://dbpedia.org/page/Alain_Prost';
      break;
    }
    case 'baddate': {
      must(record.golf['Bobby Jones']?.on, "Bobby Jones's check date");
      record.golf['Bobby Jones'].on = '2026-02-30';
      const team = record.f1Pool['Alain Prost']?.team; must(team?.on, "Prost's team check date");
      team.on = '2099-01-01';
      break;
    }
    case 'sameorg': {
      const pick = (node, what, urls) => { must(node && !node.noOfficial && Array.isArray(node.src), `${what} with sources and no noOfficial`); node.src = urls; };
      pick(record.ufcFighters['Alex Pereira']?.record, "Pereira's record", ['https://www.ufc.com/athlete/alex-pereira', 'https://www.ufc.com.br/athlete/alex-pereira']);
      pick(record.f1Pool['Alain Prost']?.team, "Prost's team", ['https://www.formula1.com/en/results/1989/drivers', 'https://www.f1.com/en/results/1989/drivers']);
      pick(record.olympics['biles-2024']?.medalSummary, "Biles's medal line", ['https://www.nbcolympics.com/news/simone-biles', 'https://www.nbcsports.com/olympics/news/simone-biles']);
      pick(record.fightResults[0], 'the first verified fight', ['https://www.espn.com/mma/fightcenter/a', 'https://africa.espn.com/mma/fightcenter/a']);
      break;
    }
    case 'contradicted': {
      const dj = record.ufcFighters['Demetrious Johnson']?.record;
      must(dj && dj.noOfficial && dj.src.length === 2 && /espn\.com/.test(dj.src[1]), "Demetrious Johnson's record on Sherdog and ESPN with a noOfficial reason");
      dj.src[1] = 'https://www.ufc.com/athlete/demetrious-johnson';
      break;
    }
    case 'ufcfighter': {
      const text = src(UFCF);
      const line = text.split(/\r?\n/).find(l => l.includes("{ name: 'Alex Pereira',"));
      const m = line && line.match(/wins: (\d+),/);
      must(m, "Pereira's row with a win count");
      over[UFCF] = rewrite(text, line, line.replace(m[0], `wins: ${Number(m[1]) + 1},`), "Pereira's row in the UFC Guesser");
      break;
    }
    case 'dupufc': over[UFCF] = listLineTwice(src(UFCF), "{ name: 'Alex Pereira',", "Pereira's UFC Guesser row"); break;
    case 'chainfighter': {
      const text = src(CHAIN);
      const line = text.split(/\r?\n/).find(l => l.includes("{ name: 'Tom Aspinall', weightClass: 'Heavyweight'"));
      must(line && line.includes('isHallOfFamer: false'), "Aspinall's chain row with isHallOfFamer: false");
      over[CHAIN] = rewrite(text, line, line.replace('isHallOfFamer: false', 'isHallOfFamer: true'), "Aspinall's chain row");
      break;
    }
    case 'dupchain': over[CHAIN] = listLineTwice(src(CHAIN), "{ name: 'Tom Aspinall', weightClass: 'Heavyweight'", "Aspinall's chain row"); break;
    case 'fakefight':
      over[CHAIN] = rewrite(src(CHAIN), 'export const FIGHT_RESULTS: FightResult[] = [',
        "export const FIGHT_RESULTS: FightResult[] = [\n  { winner: 'Tom Aspinall', loser: 'Jon Jones', event: 'UFC 313', year: 2025, method: 'TKO', round: 2, time: '3:45', wasChampionshipFight: true },",
        'the FIGHT_RESULTS array');
      break;
    case 'dupfight': must(record.fightResults.length > 0, 'a verified fight'); record.fightResults.push(structuredClone(record.fightResults[0])); break;
    case 'f1driver': over[F1D] = rewrite(src(F1D), "'71 race wins through the 2025 season'", "'63 race wins through the 2025 season'", "Verstappen's win clue"); break;
    case 'editorial': {
      const clue = record.f1Drivers.verstappen?.clues[1];
      must(clue && clue.src && !clue.editorial && /\d/.test(clue.text), "Verstappen's sourced win count clue");
      clue.editorial = true; clue.why = 'flavour, not a fact'; delete clue.src;
      break;
    }
    case 'dupdriver': over[F1D] = listBlockTwice(src(F1D), "id: 'hamilton'", "Hamilton's card"); break;
    case 'answername': over[F1D] = rewrite(src(F1D), "driverName: 'Max Verstappen'", "driverName: 'Max Verstappan'", "Verstappen's answer"); break;
    case 'f1constructor': over[F1C] = rewrite(src(F1C), "'Won 10 Constructors\\' Championships'", "'Won 9 Constructors\\' Championships'", "McLaren's title clue"); break;
    case 'editorialnumber': {
      const block = blockAround(src(F1C), "id: 'ferrari'", "Ferrari's card");
      must(block.includes("'Iconic',") && record.f1Constructors.ferrari?.clues[0]?.text === 'Iconic', "Ferrari's Iconic opener in the file and the record");
      over[F1C] = rewrite(src(F1C), block, block.replace("'Iconic',", "'16 titles',"), "Ferrari's opener");
      record.f1Constructors.ferrari.clues[0].text = '16 titles';
      break;
    }
    case 'dupconstructor': over[F1C] = listBlockTwice(src(F1C), "id: 'ferrari'", "Ferrari's card"); break;
    case 'identity': {
      const block = blockAround(src(F1C), "id: 'renault'", "Renault's card");
      must(/now competes as Alpine/.test(block), 'the Renault clue that says it now competes as Alpine');
      over[F1C] = rewrite(src(F1C), "commonNames: ['Renault', 'Alpine', 'Renault F1']", "commonNames: ['Renault', 'Renault F1']", "Renault's accepted names");
      break;
    }
    case 'alias': over[F1C] = rewrite(src(F1C), "commonNames: ['McLaren', 'Mclaren']", "commonNames: ['McLaren', 'Mclaren', 'Ferrari']", "McLaren's accepted names"); break;
    case 'f1pool': over[F1P] = rewrite(src(F1P), "{ name: 'Alain Prost', team: 'McLaren', era: '1980s'", "{ name: 'Alain Prost', team: 'McLaren', era: '1990s'", "Prost's card"); break;
    case 'duppool': over[F1P] = listLineTwice(src(F1P), "{ name: 'Alain Prost',", "Prost's pool card"); break;
    case 'olympics':
      over[OLY] = rewrite(src(OLY), "medalSummary: '7 Gold, 2 Silver, 2 Bronze (across three Games)'",
        "medalSummary: '7 Gold, 1 Silver, 2 Bronze (across three Games)'", "Biles's medal line");
      break;
    case 'dupathlete': {
      must(record.olympics['biles-2024'] && !record.olympics['biles-2024-b'], "Biles's record under biles-2024 only");
      over[OLY] = listBlockTwice(src(OLY), "id: 'biles-2024'", "Biles's card", (b) => b.replace("id: 'biles-2024'", "id: 'biles-2024-b'"));
      record.olympics['biles-2024-b'] = structuredClone(record.olympics['biles-2024']);
      break;
    }
    case 'sovietflag':
      /* The bug as it shipped: every stored value goes through the flag
         component, and FLAG_CODES answers "Soviet Union" with Russia's code. */
      over[COUNTRY] = rewrite(src(COUNTRY), '{iso && <FlagFromEmoji emoji={country} size={size} />}', '<FlagFromEmoji emoji={country} size={size} />', "the country component's flag guard");
      over['src/components/FlagImg.tsx'] = rewrite(src('src/components/FlagImg.tsx'), '"Czechoslovakia": "cz",', '"Czechoslovakia": "cz", "Soviet Union": "ru",', 'the historic rows of FLAG_CODES');
      break;
    case 'flaglabel': over[COUNTRY] = rewrite(src(COUNTRY), "jm: 'Jamaica'", "jm: 'Kenya'", "the Jamaica label"); break;
    case 'pageflag': over[OLY_PAGE] = rewrite(src(OLY_PAGE), '<OlympicCountry country={athlete.country} size={16} />', '<FlagFromEmoji emoji={athlete.country} size={16} />', "the result line's country"); break;
    case 'golf': over[GOLF] = rewrite(src(GOLF), "{ name: 'Bobby Jones', majors: 7,", "{ name: 'Bobby Jones', majors: 5,", "Bobby Jones's row"); break;
    case 'dupgolf': over[GOLF] = listLineTwice(src(GOLF), "{ name: 'Bobby Jones', majors:", "Bobby Jones's row"); break;
    case 'golfdash':
      over[LISTQUIZ] = rewrite(src(LISTQUIZ), "fetch: () => onlyNames(col('golf_majors', 'player_name', q => q.ilike('tournament', '%masters%'))),",
        "fetch: () => col('golf_majors', 'player_name', q => q.ilike('tournament', '%masters%')),", 'the Masters list fetch');
      break;
    default: refuseControl('it has no edit');
  }
  return { record, over };
}

// ---------------------------------------------------------------------------
// Sources: hosts, organisations, Wikipedia and its copies.
const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; } };
const onHost = (h, list) => list.some(d => h === d || h.endsWith('.' + d));
/* Two part public suffixes, so africa.espn.com and espn.com share espn.com but
   media.toyota.co.uk is toyota.co.uk rather than co.uk. */
const MULTI_SUFFIX = new Set(['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'com.br', 'com.au', 'net.au', 'org.au', 'co.nz', 'co.jp', 'or.jp', 'com.mx', 'com.ar', 'co.za', 'co.in', 'com.cn', 'co.kr', 'com.tr', 'com.sg', 'com.hk']);
const registrable = (h) => {
  const p = h.split('.');
  return p.length >= 3 && MULTI_SUFFIX.has(p.slice(-2).join('.')) ? p.slice(-3).join('.') : p.slice(-2).join('.');
};
/* One site under a second domain: f1.com is formula1.com, olympic.org is the
   IOC's old address for olympics.com. These count as the official host too. */
const SAME_SITE = { 'f1.com': 'formula1.com', 'olympic.org': 'olympics.com' };
/* Different sites owned by one organisation. Only ownership that is certain
   goes here; a source that belongs to the same owner as another is the same
   source, however many domains it publishes under. */
const OWNER = {
  'formula1.com': 'Formula 1', 'olympics.com': 'the IOC', 'ufc.com': 'the UFC', 'ufcstats.com': 'the UFC',
  'nbcsports.com': 'NBCUniversal', 'nbcolympics.com': 'NBCUniversal', 'nbcnews.com': 'NBCUniversal', 'nbc.com': 'NBCUniversal',
  'nbclosangeles.com': 'NBCUniversal', 'nbcmiami.com': 'NBCUniversal', 'nbcnewyork.com': 'NBCUniversal', 'today.com': 'NBCUniversal',
  'cnbc.com': 'NBCUniversal', 'msnbc.com': 'NBCUniversal',
  'cbssports.com': 'CBS', 'cbsnews.com': 'CBS', 'cbs.com': 'CBS',
  'foxsports.com': 'Fox', 'foxnews.com': 'Fox', 'fox.com': 'Fox',
  'autosport.com': 'Motorsport Network', 'motorsport.com': 'Motorsport Network',
  'redbull.com': 'Red Bull', 'redbullracing.com': 'Red Bull',
  'fiaformula2.com': 'the F2 and F3 promoter', 'fiaformula3.com': 'the F2 and F3 promoter',
  'pga.com': 'the PGA of America', 'pgachampionship.com': 'the PGA of America',
  'theopen.com': 'The R&A', 'randa.org': 'The R&A', 'usga.org': 'the USGA', 'usopen.com': 'the USGA',
  'espncricinfo.com': 'espn', 'espnfc.com': 'espn', 'skysports.com': 'Sky', 'sky.com': 'Sky',
  'teamusa.com': 'the USOPC', 'teamusa.org': 'the USOPC',
};
const siteOf = (h) => { const r = registrable(h); return SAME_SITE[r] ?? r; };
/* The organisation behind a host: its owner if known, else its brand, which
   folds every regional subdomain and every country domain of one site
   (ufc.com.br, espn.co.uk) into the site itself. A country domain looks its
   owner up under the .com of the same brand, so ufc.com.br is the UFC too. */
const orgOf = (h) => {
  const s = siteOf(h);
  const brand = s.split('.')[0];
  return OWNER[s] ?? OWNER[`${brand}.com`] ?? brand;
};
const isOfficialHost = (h, list) => onHost(h, list) || list.includes(siteOf(h));
/* Wikipedia, its sister projects, and the sites that republish its text. Any
   host with "wiki" in its name is a wiki or a copy of one, and neither is a
   source. */
const WIKI_HOSTS = ['wikipedia.org', 'wikimedia.org', 'wikidata.org', 'wikiquote.org', 'wikisource.org', 'wiktionary.org',
  'wikinews.org', 'wikibooks.org', 'wikiversity.org', 'wikivoyage.org', 'wikiwand.com', 'dbpedia.org', 'wikizero.com',
  'wiki2.org', 'wikimili.com', 'wikiless.org', 'infogalactic.com', 'justapedia.org', 'everipedia.org', 'iq.wiki', 'kiddle.co',
  'en-academic.com', 'enacademic.com', 'academic.ru', 'alchetron.com', 'yago-knowledge.org', 'wikiwix.com'];
const isWikiCopy = (h) => onHost(h, WIKI_HOSTS) || /wiki/.test(h) || /^encyclopedia\d*\.thefreedictionary\.com$/.test(h);
const isRealDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};
/* Today, generous by a time zone: the later of the UTC and the local date. */
const TODAY = (() => {
  const utc = new Date().toISOString().slice(0, 10);
  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return local > utc ? local : utc;
})();
/* Keys that mean the record itself admits a gap, and note wording that says so. */
const GAP_KEY = /^(?:unverifiable|undersourced|unmatched|unsourced)$/i;
const GAP_NOTE = /\b(?:unsourced|not sourced|could not be sourced|cannot be sourced|can't be sourced|no source|not (?:stated|confirmed|supported|verified|backed) (?:by|on|in|anywhere)|unverif\w*|not verified|no opened page)/i;
const NUMBER_WORD = /\d|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|once|twice|thrice|dozen|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|single|double|triple)\b/i;
/* "now racing as the Audi works team", "now competes as Alpine": the name a
   team races under today, which a player may well type. */
const IDENTITY = /\bnow (?:racing|races|race|competing|competes|compete|running|runs|known|called|entered|enters) as (?:the )?([A-Z][\w'&.-]*(?:\s+[A-Z][\w'&.-]*)*)/;
const nameKey = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const snip = (v) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s.length > 140 ? `${s.slice(0, 140)}...` : s; };

// ---------------------------------------------------------------------------
async function runFence(record, over, quiet) {
  const failures = [];
  let section = 0;
  const say = (m) => { if (!quiet) console.log(m); };
  const fail = (tag, msg) => { failures.push({ section, tag, msg }); if (!quiet) console.error(`  FAIL [${tag}]: ${msg}`); };
  const head = (n, title) => { section = n; say(`\n--- ${n}. ${title} ---`); };
  /* Refuses the same thing twice in one list, by a key that ignores accents
     and punctuation, so "Nadia Comaneci" and "Nadia Comăneci" are one. */
  const noDuplicates = (label, rows, keyOf) => {
    const seen = new Map();
    for (const row of rows) {
      const k = nameKey(keyOf(row));
      if (seen.has(k)) fail('duplicate', `${label} "${keyOf(row)}" is listed twice`);
      else seen.set(k, row);
    }
  };

  head(1, 'the record: every fact sourced, two organisations, one official, one independent, no Wikipedia or copy of it, a real past check date, no admitted gap');
  {
    let carriers = 0; let grouped = 0;
    const noOfficial = []; const nosrc = []; const editorialClues = [];
    const checkSources = (sport, where, node) => {
      const hosts = node.src.map(hostOf);
      if (hosts.some(h => !h)) return fail('sources', `${where}: a source is not a URL`);
      const wiki = hosts.find(isWikiCopy);
      if (wiki) return fail('wiki', `${where}: ${wiki} is Wikipedia or a copy of it, a spot check at most, never a source`);
      if (node.src.length < 2) return fail('sources', `${where}: ${node.src.length} source(s), two are required`);
      const official = record.officialHosts[sport];
      const isOff = (h) => isOfficialHost(h, official);
      /* A node that says no official page supports its value cannot count the
         official page it lists: by its own account that page does not agree. */
      const supporting = [...new Set(node.noOfficial ? hosts.filter(h => !isOff(h)) : hosts)];
      if (supporting.length < 2) {
        const dropped = [...new Set(hosts.filter(isOff))];
        if (node.noOfficial && dropped.length) return fail('contradicted', `${where}: only ${supporting.join(', ') || 'no host'} supports "${snip(node.v ?? node.text)}". It also lists ${dropped.join(', ')}, but its own noOfficial says that page does not give this value ("${snip(node.noOfficial)}"), so it is one source`);
        return fail('sources', `${where}: every source is on ${supporting[0]}, which is one source twice`);
      }
      const orgs = new Set(supporting.map(orgOf));
      if (orgs.size < 2) return fail('org', `${where}: ${supporting.join(' and ')} belong to one organisation (${[...orgs][0]}), which is one source twice`);
      const offHosts = supporting.filter(isOff);
      if (!offHosts.length) {
        if (typeof node.noOfficial === 'string' && node.noOfficial.length > 20) noOfficial.push(where);
        else return fail('official', `${where}: no official source (${official.join(', ')}) and no noOfficial reason`);
      }
      const offOrgs = new Set(offHosts.map(orgOf));
      if (!supporting.some(h => !isOff(h) && !offOrgs.has(orgOf(h)))) return fail('independent', `${where}: no independent source, every source is official or owned by the same organisation as one`);
      return undefined;
    };
    const walk = (sport, where, node, inheritsFrom) => {
      if (Array.isArray(node)) { node.forEach((v, i) => walk(sport, `${where}[${i}]`, v, inheritsFrom)); return; }
      if (!node || typeof node !== 'object') return;
      for (const k of Object.keys(node)) {
        if (GAP_KEY.test(k)) fail('flagged', `${where}: carries ${k} (${snip(node[k])}). The record itself says part of this is not sourced, so it cannot ship as sourced`);
      }
      if (typeof node.note === 'string' && GAP_NOTE.test(node.note)) fail('flagged', `${where}: its note says part of it is unsourced: "${snip(node.note)}"`);
      const isRow = /^fightResults\[\d+\]$/.test(where);
      const isClue = 'text' in node && /\.clues\[\d+\]$/.test(where);
      const isFact = 'v' in node || isClue || isRow;
      const hasSrc = 'src' in node;
      if ('on' in node || hasSrc) {
        if (!isRealDate(node.on)) fail('date', `${where}: check date ${JSON.stringify(node.on)} is not a real calendar date`);
        else if (node.on > TODAY) fail('date', `${where}: check date ${node.on} is in the future (today is ${TODAY})`);
      }
      /* The one word opener: sections 5 and 6 judge whether it may be editorial. */
      if (isClue && node.editorial === true && !hasSrc) { editorialClues.push(where); return; }
      if (hasSrc && (!Array.isArray(node.src) || node.src.length === 0)) {
        nosrc.push(where); fail('nosrc', `${where}: src is ${Array.isArray(node.src) ? 'empty' : 'not a list'}, so nothing says where this comes from`); return;
      }
      if (hasSrc) {
        carriers += 1;
        checkSources(sport, where, node);
        /* A golfer's src covers every field under it ({v} with no src of its own). */
        if (!isFact) for (const [k, v] of Object.entries(node)) if (k !== 'src') walk(sport, `${where}.${k}`, v, where);
        return;
      }
      if (isFact) {
        if ('v' in node && inheritsFrom && !isClue && !isRow) { grouped += 1; return; }
        nosrc.push(where); fail('nosrc', `${where}: a fact with no src, so nothing says where it comes from`); return;
      }
      for (const [k, v] of Object.entries(node)) walk(sport, `${where}.${k}`, v, null);
    };
    const SPORT = { ufcFighters: 'ufc', ufcChain: 'ufc', fightResults: 'ufc', f1Drivers: 'f1', f1Constructors: 'f1', f1Pool: 'f1', olympics: 'olympics', golf: 'golf' };
    for (const [key, sport] of Object.entries(SPORT)) {
      if (!record[key]) { fail('coverage', `the record has no ${key} block`); continue; }
      if (!Array.isArray(record.officialHosts?.[sport])) { fail('coverage', `the record lists no official hosts for ${sport}`); continue; }
      walk(sport, key, record[key], null);
    }
    if (carriers < 500) fail('floor', `only ${carriers} sourced nodes found in the record, so the walk is broken`);
    else say(`  ${carriers} sourced nodes (plus ${grouped} fields covered by their golfer's sources and ${editorialClues.length} editorial openers left to sections 5 and 6); ${carriers - noOfficial.length} carry an official source`);
    if (noOfficial.length) say(`  ${noOfficial.length} stand on two independent organisations with a stated reason: ${noOfficial.slice(0, 8).join('; ')}${noOfficial.length > 8 ? ' ...' : ''}`);
    if (nosrc.length) say(`  ${nosrc.length} fact node(s) carry no sources: ${nosrc.join('; ')}`);
  }

  // ---------------------------------------------------------------------------
  head(2, 'UFC Guesser: every fighter matches the verified record');
  {
    const { ufcFighters } = await loadModule(UFCF, over);
    const rec = record.ufcFighters;
    const seen = new Set();
    let n = 0;
    noDuplicates('UFC Guesser fighter', ufcFighters, f => f.name);
    for (const f of ufcFighters) {
      const r = rec[f.name];
      if (!r) { fail('coverage', `${f.name} ships in the UFC Guesser with no verified record`); continue; }
      seen.add(f.name); n += 1;
      const want = {
        record: r.record?.v, wins: Number(r.record?.v.split('-')[0]), losses: Number(r.record?.v.split('-')[1]), draws: Number(r.record?.v.split('-')[2]),
        birthDate: r.birthDate?.v, weightClass: r.weightClass?.v, yearsActive: r.yearsActive?.v,
        yearsActiveStart: Number(r.yearsActive?.v.split('-')[0]), yearsActiveEnd: Number(r.yearsActive?.v.split('-')[1]),
        koTko: r.koTko?.v, submissions: r.submissions?.v,
      };
      for (const [k, v] of Object.entries(want)) {
        if (!same(f[k], v)) fail('value', `${f.name}: ${k} ships as ${JSON.stringify(f[k])}, verified ${JSON.stringify(v)}`);
      }
      if (f.nationality !== r.nationality?.v) fail('value', `${f.name}: nationality ships as ${f.nationality}, verified ${r.nationality?.v}`);
      if ('age' in f || 'highestP4PRank' in f) fail('value', `${f.name}: carries a typed age or P4P rank again; age is computed from birthDate and the P4P column was retired`);
    }
    for (const name of Object.keys(rec)) if (!seen.has(name)) fail('coverage', `the record holds ${name} but the UFC Guesser no longer ships him or her`);
    /* A floor that proves the module loaded and the loop ran. It was 100 when the
       pool was 104; Round 660 took out the fourteen fighters whose sources do not
       agree on a number the game shows, and 90 is what ships. It is a ratchet: a
       round that removes a fighter lowers it on purpose, and a load that comes
       back short cannot pass as green. */
    if (n < 90) fail('floor', `only ${n} fighters compared`);
    else say(`  ${n} fighters compared on all ten fields (${ufcFighters.length} rows shipped)`);
  }

  // ---------------------------------------------------------------------------
  head(3, 'Combat Chain fighters: record, a division they really fought in, Hall of Fame');
  const chainMod = await loadModule(CHAIN, over);
  {
    const rec = record.ufcChain;
    const seen = new Set();
    noDuplicates('chain fighter', chainMod.UFC_FIGHTERS, f => f.name);
    for (const f of chainMod.UFC_FIGHTERS) {
      const r = rec[f.name];
      if (!r) { fail('coverage', `${f.name} ships in the chain with no verified record`); continue; }
      seen.add(f.name);
      const [w, l, d] = r.record.v.split('-').map(Number);
      if (f.record !== r.record.v || f.wins !== w || f.losses !== l || f.draws !== d) {
        fail('value', `${f.name}: chain shows ${f.record} (${f.wins}-${f.losses}-${f.draws}), verified ${r.record.v}`);
      }
      if (!r.divisions.v.includes(f.weightClass)) fail('value', `${f.name}: chained in ${f.weightClass}, but the verified UFC divisions are ${r.divisions.v.join(', ')}`);
      if (Boolean(f.isHallOfFamer) !== r.hallOfFame.v) fail('value', `${f.name}: isHallOfFamer ships ${Boolean(f.isHallOfFamer)}, verified ${r.hallOfFame.v}`);
    }
    for (const name of Object.keys(rec)) if (!seen.has(name)) fail('coverage', `the record holds chain fighter ${name} but the chain no longer ships them`);
    /* The guesser and the chain share a fighter's record, so both must agree. */
    const guesser = record.ufcFighters;
    for (const [name, r] of Object.entries(rec)) {
      if (guesser[name] && guesser[name].record?.v !== r.record?.v) fail('value', `${name}: the record says ${guesser[name].record?.v} for the guesser and ${r.record?.v} for the chain`);
    }
    say(`  ${seen.size} chain fighters checked (${chainMod.UFC_FIGHTERS.length} rows shipped)`);
  }

  // ---------------------------------------------------------------------------
  head(4, 'Combat Chain links: every accepted link is a verified fight');
  {
    const key = (x) => `${x.winner} > ${x.loser} @ ${x.event} ${x.year}`;
    const verified = new Map();
    for (const x of record.fightResults) {
      if (verified.has(key(x))) fail('duplicate', `the record holds "${key(x)}" twice`);
      verified.set(key(x), x);
    }
    const shipped = new Set();
    const fighters = new Set(chainMod.UFC_FIGHTERS.map(f => f.name));
    for (const r of chainMod.FIGHT_RESULTS) {
      const k = key(r);
      const v = verified.get(k);
      if (!v) { fail('link', `the chain accepts "${k}" and no verified fight says so`); continue; }
      if (shipped.has(k)) fail('duplicate', `"${k}" is listed twice`);
      shipped.add(k);
      const want = { method: v.method, round: v.round, time: v.time, wasChampionshipFight: v.title };
      for (const [f, val] of Object.entries(want)) if (r[f] !== val) fail('value', `"${k}": ${f} ships ${JSON.stringify(r[f])}, verified ${JSON.stringify(val)}`);
      if (!fighters.has(r.winner) || !fighters.has(r.loser)) fail('link', `"${k}": a fighter in this link is not in the chain's fighter list`);
    }
    for (const k of verified.keys()) if (!shipped.has(k)) fail('coverage', `the record holds "${k}" but the chain no longer ships it`);
    say(`  ${shipped.size} links, each a verified fight`);
  }

  // ---------------------------------------------------------------------------
  /* The clue cards: every clue word for word, the editorial opener, the answer
     and every accepted name, each typed into the game's own resolver. */
  const checkCards = (label, rows, nameField, resolve, rec) => {
    const seen = new Set();
    noDuplicates(label, rows, p => p.id);
    noDuplicates(label, rows, p => p[nameField]);
    for (const p of rows) {
      const r = rec[p.id];
      if (!r) { fail('coverage', `${label} ${p.id} ships with no verified record`); continue; }
      seen.add(p.id);
      /* The answer is a fact like any clue: the record must hold it, sourced. */
      const rn = r[nameField];
      if (!rn || !same(rn.v, p[nameField])) {
        fail('answer', `${label} ${p.id}: the answer ${JSON.stringify(p[nameField])} ${rn ? `disagrees with the verified ${JSON.stringify(rn.v)}` : `is not in the record (it has no ${nameField})`}`);
      }
      const shippedNames = [...(p.commonNames ?? [])].sort();
      const rc = r.commonNames;
      if (!rc || !Array.isArray(rc.v) || !same([...rc.v].sort(), shippedNames)) {
        fail('answer', `${label} ${p.id}: the accepted names ${JSON.stringify(p.commonNames)} ${rc ? `disagree with the verified ${JSON.stringify(rc.v)}` : 'are not in the record (it has no commonNames)'}`);
      }
      const typedNames = new Map([p[nameField], ...(p.commonNames ?? [])].map(n => [String(n).toLowerCase(), n]));
      for (const typed of typedNames.values()) {
        const got = resolve(typed);
        if (got?.id !== p.id) fail('resolve', `${label} ${p.id}: typing ${JSON.stringify(typed)} finds ${got ? `${got.id}'s card` : 'no card'}, so the game refuses its own answer`);
      }
      if (p.clues.length !== r.clues.length) fail('clue', `${label} ${p.id}: ${p.clues.length} clues ship, the record holds ${r.clues.length}`);
      p.clues.forEach((c, i) => {
        const want = r.clues[i];
        if (!want) return;
        if (c !== want.text) fail('clue', `${label} ${p.id} clue ${i + 1} ships "${c}", verified "${want.text}"`);
        const now = IDENTITY.exec(c);
        if (now && resolve(now[1])?.id !== p.id) {
          fail('identity', `${label} ${p.id} clue ${i + 1} says it now races as ${now[1]}, but typing "${now[1]}" finds ${resolve(now[1])?.id ?? 'no card'}, so a player who reads the clue and answers ${now[1]} is refused`);
        }
        if (want.editorial) {
          /* Only the one word opener is flavour. Anything later marked editorial
             is a fact dodging its sources, and a number is always a fact. */
          if (i !== 0) fail('editorial', `${label} ${p.id} clue ${i + 1} is marked editorial; only clue 1, the one word opener, may be`);
          if (NUMBER_WORD.test(want.text)) fail('editorial', `${label} ${p.id} clue ${i + 1} is marked editorial but carries a number ("${want.text}"), and a number is a fact`);
          if (!(typeof want.why === 'string' && want.why.length > 5)) fail('editorial', `${label} ${p.id} clue ${i + 1} is marked editorial without saying why`);
        }
      });
      if (!r.clues[0]?.editorial) fail('editorial', `${label} ${p.id}: the first clue is expected to be the editorial one word opener`);
    }
    for (const id of Object.keys(rec)) if (!seen.has(id)) fail('coverage', `the record holds ${label} ${id} but the file no longer ships it`);
    return seen.size;
  };

  head(5, 'F1 drivers: every clue is the verified text, and the answer is in the record');
  {
    const mod = await loadModule(F1D, over);
    const n = checkCards('driver', mod.F1_DRIVERS, 'driverName', mod.resolveF1Driver, record.f1Drivers);
    say(`  ${n} drivers compared (${mod.F1_DRIVERS.length} cards shipped)`);
  }

  head(6, 'F1 constructors: every clue is the verified text, and the answer is in the record');
  {
    const mod = await loadModule(F1C, over);
    const n = checkCards('constructor', mod.F1_CONSTRUCTORS, 'constructorName', mod.resolveF1Constructor, record.f1Constructors);
    say(`  ${n} constructors compared (${mod.F1_CONSTRUCTORS.length} cards shipped)`);
  }

  head(7, 'Perfect Lineup F1: every card\'s team, era and nationality');
  {
    const { F1_POOL } = await loadModule(F1P, over);
    const rec = record.f1Pool;
    const seen = new Set();
    noDuplicates('pool driver', F1_POOL, d => d.name);
    for (const d of F1_POOL) {
      const r = rec[d.name];
      if (!r) { fail('coverage', `${d.name} ships in the F1 pool with no verified record`); continue; }
      seen.add(d.name);
      for (const k of ['team', 'era', 'nationality']) if (d[k] !== r[k]?.v) fail('value', `${d.name}: ${k} ships "${d[k]}", verified "${r[k]?.v}"`);
    }
    for (const n of Object.keys(rec)) if (!seen.has(n)) fail('coverage', `the record holds ${n} but the pool no longer ships him`);
    say(`  ${seen.size} drivers compared (${F1_POOL.length} cards shipped)`);
  }

  head(8, 'The Medal Games: every field a player can be shown, and the country as the page draws it');
  {
    const { olympicAthletes } = await loadModule(OLY, over);
    const { render, FLAG_CODES } = await loadCountryRenderer(over);
    const rec = record.olympics;
    const seen = new Set();
    const FIELDS = ['name', 'sport', 'country', 'gamesYear', 'hostCity', 'achievement', 'careerContext', 'medalSummary'];
    noDuplicates('athlete id', olympicAthletes, a => a.id);
    noDuplicates('athlete', olympicAthletes, a => a.name);
    /* The flag a stored value stands for, read here from the code points
       rather than through the site's own helper, so a bug there cannot hide. */
    const flagOf = (v) => {
      const cps = [...String(v ?? '').trim()].map(ch => ch.codePointAt(0));
      if (cps.length === 2 && cps.every(cp => cp >= 0x1f1e6 && cp <= 0x1f1ff)) return cps.map(cp => String.fromCharCode(97 + cp - 0x1f1e6)).join('');
      if (cps.some(cp => (cp >= 0x1f1e6 && cp <= 0x1f1ff) || cp === 0x1f3f4)) return 'unreadable';
      return null;
    };
    const text = (html) => html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    let rendered = 0;
    for (const a of olympicAthletes) {
      const r = rec[a.id];
      if (!r) { fail('coverage', `${a.id} ships with no verified record`); continue; }
      seen.add(a.id);
      for (const k of FIELDS) if (!same(a[k], r[k]?.v)) fail('value', `${a.id}: ${k} ships ${JSON.stringify(a[k])}, verified ${JSON.stringify(r[k]?.v)}`);
      /* The guess box accepts the full name or the last word of it, so an answer
         with a bracket or a symbol in it cannot be typed. */
      if (!/^[\p{L}][\p{L} .'&-]*$/u.test(a.name)) fail('value', `${a.id}: the answer "${a.name}" is not something a player can type`);
      /* What the page draws for the country, against what the record says. */
      const html = render(a.country);
      rendered += 1;
      const drawn = [...html.matchAll(/<img\b[^>]*\bsrc="https:\/\/flagcdn\.com\/w\d+\/([a-z-]+)\.png"/g)].map(m => m[1]);
      const images = (html.match(/<img\b/g) || []).length + (html.match(/<svg\b/g) || []).length;
      const label = text(html);
      const wantFlag = flagOf(r.country?.v);
      const shows = images ? (drawn.length === images ? `the ${drawn.join(', ')} flag` : 'a flag it cannot name') : 'no flag';
      if (wantFlag === 'unreadable') { fail('render', `${a.id}: the verified country ${JSON.stringify(r.country?.v)} is not a two letter flag or a team name`); continue; }
      if (wantFlag) {
        if (images !== 1 || drawn[0] !== wantFlag) fail('render', `${a.id}: the record says the ${wantFlag} flag and the page draws ${shows}`);
        if (!label || FLAG_CODES[label] !== wantFlag) fail('render', `${a.id}: the page labels the ${wantFlag} flag "${label}", which names ${FLAG_CODES[label] ? `the ${FLAG_CODES[label]} flag` : 'no flag at all'}`);
      } else {
        if (images) fail('render', `${a.id}: the record says "${r.country?.v}", a team with no flag today, and the page draws ${shows}`);
        if (label !== r.country?.v) fail('render', `${a.id}: the page labels the country "${label}", the record says "${r.country?.v}"`);
      }
    }
    for (const id of Object.keys(rec)) if (!seen.has(id)) fail('coverage', `the record holds ${id} but the file no longer ships it`);
    /* The page must draw the country only through that component: a flag drawn
       anywhere else on the page is a flag this section never saw. */
    const page = stripComments(over[OLY_PAGE] ?? src(OLY_PAGE));
    for (const site of ['<OlympicCountry country={clue.value}', '<OlympicCountry country={athlete.country}']) {
      if (!page.includes(site)) fail('page', `${OLY_PAGE} no longer draws ${site.includes('clue') ? 'the Country clue' : 'the result line'} through OlympicCountry (${site} ... />), so what it shows is unchecked`);
    }
    const stray = page.match(/<(?:FlagFromEmoji|FlagImg|TextWithFlags)\b|flagcdn\.com/);
    if (stray) fail('page', `${OLY_PAGE} draws a flag itself (${stray[0]}), outside the component this section renders`);
    say(`  ${seen.size} athletes compared on ${FIELDS.length} fields, ${rendered} countries rendered and checked (${olympicAthletes.length} cards shipped)`);
  }

  head(9, 'Golf legends: majors, first and last win, nationality, the majors won');
  {
    const { golfLegends } = await loadModule(GOLF, over);
    const rec = record.golf;
    const seen = new Set();
    noDuplicates('golfer', golfLegends, g => g.name);
    for (const g of golfLegends) {
      const r = rec[g.name];
      if (!r) { fail('coverage', `${g.name} ships with no verified record`); continue; }
      seen.add(g.name);
      for (const k of ['majors', 'firstWin', 'lastWin', 'nationality']) if (g[k] !== r[k]?.v) fail('value', `${g.name}: ${k} ships ${g[k]}, verified ${r[k]?.v}`);
      if (!same([...g.tournaments].sort(), [...(r.tournaments?.v ?? [])].sort())) fail('value', `${g.name}: majors won ship as ${g.tournaments.join(', ')}, verified ${(r.tournaments?.v ?? []).join(', ')}`);
    }
    for (const n of Object.keys(rec)) if (!seen.has(n)) fail('coverage', `the record holds ${n} but golfLegends no longer ships him`);
    say(`  ${seen.size} golfers compared (${golfLegends.length} rows shipped)`);
  }

  // ---------------------------------------------------------------------------
  head(10, 'golf_majors placeholder rows are never counted as a player');
  {
    /* Static half: every read of the table in code (comments stripped, so the
       prose explaining the filter cannot satisfy it) goes through onlyNames. */
    const files = [];
    const walkDir = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walkDir(p);
        else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) files.push(p);
      }
    };
    walkDir(path.join(ROOT, 'src'));
    if (fs.existsSync(path.join(ROOT, 'supabase/functions'))) walkDir(path.join(ROOT, 'supabase/functions'));
    let reads = 0;
    for (const p of files) {
      const rel = path.relative(ROOT, p).replace(/\\/g, '/');
      if (rel === 'src/integrations/supabase/types.ts') continue; // generated table types, not a reader
      const code = stripComments(over[rel] ?? fs.readFileSync(p, 'utf8'));
      for (const m of code.matchAll(/['"`]golf_majors['"`]/g)) {
        reads += 1;
        const before = code.slice(Math.max(0, m.index - 20), m.index);
        if (!/onlyNames\(col\($/.test(before)) {
          const line = code.slice(0, m.index).split('\n').length;
          fail('golfdash', `${rel}:${line} reads golf_majors without onlyNames, so a year the major was not played counts as a golfer`);
        }
      }
    }
    if (reads < 4) fail('floor', `found ${reads} reads of golf_majors, expected the four List Quiz golf lists`);
    else say(`  ${reads} reads of golf_majors in code, each through onlyNames`);

    /* Behavioural half: the real fetch closures, against a client that serves
       the table's real shape. Measured 2026-09-19: the placeholder is a single
       U+2014 character, 25 rows (the war years, 1871 and 2020 at The Open), and
       Bobby Jones's 1923 and 1929 U.S. Opens sit under "Bobby Jones" plus a
       U+2021 mark. The stub serves those, plus a hyphen and an en dash in case
       the table is ever re-scraped with a different character. */
    const STUB = `
const ROWS = ['Horton Smith', '\\u2014', 'Byron Nelson', '\\u2014', '-', ' \\u2013 ', 'Bobby Jones \\u2021', 'Jack Nicklaus'];
function q() { const o = { select: () => o, ilike: () => o, eq: () => o, order: () => o, in: () => o, not: () => o, gte: () => o, lte: () => o, range: () => o, limit: () => Promise.resolve({ data: ROWS.map(v => ({ player_name: v })), error: null }) }; return o; }
export const supabase = { from: () => q(), rpc: () => Promise.resolve({ data: [], error: null }) };
export const SUPABASE_URL = 'http://stub.invalid';
export const SUPABASE_PUBLISHABLE_KEY = 'stub';
`;
    const lq = await loadModule(LISTQUIZ, over, { '@/integrations/supabase/client': STUB });
    const golfIds = ['masters-champs', 'pga-champs', 'theopen-champs', 'usopen-golf-champs'];
    for (const id of golfIds) {
      const p = lq.LIST_PUZZLES.find(x => x.id === id);
      if (!p) { fail('golfdash', `the List Quiz has no ${id} list`); continue; }
      const got = await p.fetch();
      const dashes = got.filter(v => !/\p{L}/u.test(v ?? ''));
      if (dashes.length) fail('golfdash', `${id}: the fetch returns ${dashes.length} placeholder row(s) (${JSON.stringify(dashes)}) as golfers`);
      else say(`  ${id}: ${got.length} names from a stub serving 4 dash rows, none of them a dash`);
      const cleaned = lq.cleanAnswers(got);
      if (cleaned.some(v => !/\p{L}/u.test(v))) fail('golfdash', `${id}: a placeholder survives the quiz's own cleaning`);
      if (got.length !== 4) fail('golfdash', `${id}: expected the 4 real names back from the stub, got ${got.length}`);
    }

    const { golfLegends } = await loadModule(GOLF, over);
    const bad = golfLegends.filter(g => !/\p{L}/u.test(g.name));
    if (bad.length) fail('golfdash', `golfLegends ships ${bad.length} placeholder golfer(s)`);
  }

  return failures;
}

// ---------------------------------------------------------------------------
const keyOf = (f) => `${f.section}|${f.tag}|${f.msg}`;
let exitCode = 0;
try {
  if (!CONTROL) {
    const failures = await runFence(BASE_RECORD, {}, false);
    if (failures.length) {
      const bySection = new Map();
      for (const f of failures) bySection.set(f.section, (bySection.get(f.section) ?? 0) + 1);
      const byTag = new Map();
      for (const f of failures) byTag.set(f.tag, (byTag.get(f.tag) ?? 0) + 1);
      console.error(`\nsimSportsFacts: ${failures.length} failure(s). By section: ${[...bySection].sort((a, b) => a[0] - b[0]).map(([s, n]) => `${s} (${n})`).join(', ')}. By check: ${[...byTag].map(([t, n]) => `${t} ${n}`).join(', ')}`);
      exitCode = 1;
    } else {
      console.log('\nsimSportsFacts: every fact in the record is sourced on two organisations with a real check date and no admitted gap, every shipped fact and answer in the seven files matches it, every chain link is a verified fight, the Olympic country is drawn as the record says, and no golf placeholder counts as a player.');
    }
  } else {
    const want = CONTROLS[CONTROL];
    const { record, over } = applyControl(CONTROL);
    const base = await runFence(BASE_RECORD, {}, true);
    const ctl = await runFence(record, over, true);
    const baseKeys = new Set(base.map(keyOf));
    const ctlKeys = new Set(ctl.map(keyOf));
    const added = ctl.filter(f => !baseKeys.has(keyOf(f)));
    const gone = base.filter(f => !ctlKeys.has(keyOf(f)));
    const aimed = added.filter(f => f.section === want.section && f.tag === want.tag);
    const strayAdded = added.filter(f => f.section !== want.section);
    const strayGone = gone.filter(f => f.section !== want.section);
    console.log(`CONTROL ${CONTROL}: ${added.length} new failure(s), ${gone.length} gone, against an untouched run with ${base.length}.`);
    for (const f of added) console.log(`  + [${f.section} ${f.tag}] ${f.msg}`);
    for (const f of gone) console.log(`  - [${f.section} ${f.tag}] ${f.msg}`);
    const countOk = want.count === undefined ? aimed.length >= 1 : aimed.length === want.count;
    if (countOk && !strayAdded.length && !strayGone.length) {
      console.log(`\nCONTROL ${CONTROL}: section ${want.section}'s "${want.tag}" check caught the break (${aimed.length} new) and no other section moved.`);
      exitCode = 1;
    } else {
      console.error(`\nCONTROL ${CONTROL}: expected ${want.count ?? 'at least 1'} new "${want.tag}" failure(s) in section ${want.section} and nothing new or gone elsewhere; got ${aimed.length} aimed, ${strayAdded.length} new and ${strayGone.length} gone in other sections. The control proves nothing.`);
      exitCode = 2;
    }
  }
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
process.exit(exitCode);
