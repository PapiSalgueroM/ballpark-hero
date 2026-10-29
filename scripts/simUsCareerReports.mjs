/* Round 1569 harness: the US My Career player reports of 2026-10-26, held on the engine, all four sports.

   Report C (NFL, after a playoff loss: "my team and i played great it was just a hard game"). The playoff note
   in src/lib/careerVariance.ts judged the clutch roll alone, so a strong January line was mocked. It now reads
   the January level, the form every stat of the playoff line is drawn from, against the shared market's bands
   (76 and up a player the market calls with real interest, under 70 the prove-it deal). This harness runs a
   seeded fleet through the four real bindings in the board's own order and reads the level at each call site
   (a build patch that only records it), then holds the OUTCOME against the rule:
     C1  no critical note on a January level of 70 or more (the old rule put one on 11 to 29 strong lines and
         16 to 46 middling ones a sport, 150 careers each);
     C2  every postseason lost on a level of 76 or more, without the riser line, carries the credit note;
     C3  every critical note sits on a level under 70 and a clutch drop of 7 or more, and criticism still exists:
         at least CRIT_FLOOR a sport (measured below);
     C4  none of the four old lines can appear, and no note says "everyone saw it", "disappeared", "talk shows";
     C5  (fix run, review minor 4) the credit note is never on a title win and never on a level under 76: C2 held
         it only where it must appear, so two breaks of the rule (credit at depth 4, credit from 70) passed here.
   Report B (NBA, "20 szn no offer"). The market is never empty (the incumbent always offers and never walks);
   the empty screen was the extension talk with no offer. This harness holds:
     B1  the market: every window a late career opens has at least one live offer;
     B2  seasonAheadIsLast (src/lib/usCareerNoOffer.ts) is sound: every talk it calls the last is followed by
         the end of the career after that season, in every sport;
     B3  noOfferWhy names a reason and the market price for every talk with no offer, with no dash in it;
     B4  (fix run, review major 2) the season caps, report B's own "20 szn" path, which the natural fleet almost
         never reaches (400 careers a sport made no NBA or MLB last call at all): LATE careers a sport are held at
         age 30 and rating 80 before every season, so only the sport's season count can end them, and
         seasonAheadIsLast must call exactly the season after which the career ends, once in every career.
   Controls (each must turn the run red, and each checks the source it changes exists first):
     SIM_REPORTS_CONTROL=blind     criticism on the clutch roll alone again (the old rule)      -> C1
     SIM_REPORTS_CONTROL=nocredit  the credit branch taken out                                   -> C2
     SIM_REPORTS_CONTROL=alwayslast seasonAheadIsLast answers true for every talk                -> B2
     SIM_REPORTS_CONTROL=noseason  seasonAheadIsLast forgets the season about to be played       -> B4
     SIM_REPORTS_CONTROL=titlecredit the credit note also on a title (depth 4)                   -> C5
     SIM_REPORTS_CONTROL=creditlow the credit note from a level of 70, not 76                     -> C5
   The fleet size is an argument, but the one band (CRIT_FLOOR) was measured at 150 careers a sport, so the
   run refuses fewer (a 60 career run sat exactly on the floor in one sport): more careers, never a wider bound.
   Measured on a GitHub runner (rc r1569-s2, head e208e288, seeds 1569, 1, 2, 3 at 150 careers a sport, so
   16 counts): critical notes 37 to 60 a sport (NFL 44 to 51, NBA 37 to 45, MLB 49 to 60, NHL 39 to 49);
   credit notes on every one of 380 to 938 strong losses a sport; last season calls 0 to 4 a sport, every one
   followed by the end of the career; no offer talks 196 to 279 a sport; market windows 510 to 664 a sport,
   none empty. Controls on seed 1569: blind 266 findings, nocredit 2,643, alwayslast 968. The rules C1, C2,
   C3 (the level part) and B1 to B3 are exact, so they carry no band; the one band is CRIT_FLOOR, about half
   the smallest measured count, so the gate cannot pass by deleting criticism. Each seed runs in 2 to 3 s.
   Fix run, measured on a GitHub runner (rc r1569-fx-a, head 57a0153cc, seed 1569 and 9 at 150 careers, 1569 at
   400): B4 called 40 of 40 late careers a sport last, each exactly at its cap (NFL 19, NBA 21, MLB 21, NHL 22
   seasons); C5 0 findings; controls noseason 164 findings (B4 only), titlecredit 223 and creditlow 1,086 (C5
   only), and the three old controls unchanged (blind 266, nocredit 2,643; alwayslast 4,128 now, B2 and B4).
   Report C's spirit, the fans (the lead's ruling R2, fix pass of 2026-10-29). src/lib/careerSocial.ts tiered the
   gram's comments by the fanbase meter alone, so a bench season (a backup role costs 2 a season) or an MLB
   rookie start of 30 read "Talented but man the attitude...", "Talent wasted on a villain" and "The boos ...
   Deserved." with no villain act behind it. The two low tiers' conduct lines now need a cause the save records
   (conductOnRecord: heat at or past 65, a suspension waiting, a season served banned, dirty money, and the NBA
   and NFL storylines' public trade request, held on its own three flag values below); the US
   bindings pass it as FanFacts.conduct, and Soccer Career passes nothing. Every fan view after a season's
   progress, read through the real binding (sport.fanComments), is held to:
     F1  no conduct line without a cause on the record, in any view, and a low meter with nothing on the record
         reads the fans who want more; such views must exist (at least FANS_CLEAN_FLOOR a sport);
     F2  a low meter WITH a cause still reads the conduct lines. CONDUCT careers a sport put a cause on the record
         through the engine's own corruption meter before one season's progress (a ban, money nobody can
         explain, or a file opened) and play on in the board's order, a ban served as the board serves it; such
         views must exist (at least FANS_CAUSE_FLOOR a sport);
     F3  with no conduct field every ladder reads exactly as before the gate: the digest of all five sports'
         comments over every standing and position (and soccer's derbies) is LADDER_SHA, recorded on 2ee79c595,
         and Soccer Career's call in PhonePanel.tsx passes no conduct field.
   Controls for F (each swaps the one gate line in careerSocial.ts, which must be there first):
     SIM_REPORTS_CONTROL=fangate   the gate taken out, conduct lines for a bench season again  -> F1
     SIM_REPORTS_CONTROL=fanforget the gate ignores the cause, no conduct line after a ban      -> F2
     SIM_REPORTS_CONTROL=fansoccer no field reads as no cause, so soccer's ladder moves        -> F3
   Measured (seeds 1569, 1, 2, 3 at 150 careers a sport, 16 counts each): low views with nothing on the record
   1,408 to 2,666 a sport (NFL 1,408 to 1,611, NBA 2,132 to 2,288, MLB 2,540 to 2,648, NHL 2,377 to 2,666), every
   one of which the old ladder called a villain or an attitude; low views with a cause 298 to 387 a sport. The
   floors are about half the smallest (700 and 150). Controls on seed 1569: fangate 18,088 findings (F1 only),
   fanforget 1,365 (F2 only), fansoccer 1 (F3 only, digest 4c93c68795d34a36).
   Run: node scripts/simUsCareerReports.mjs [careers per sport] (SIM_SEED picks the fleet). */
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { readFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const CONTROL = process.env.SIM_REPORTS_CONTROL || '';
if (!['', 'blind', 'nocredit', 'alwayslast', 'noseason', 'titlecredit', 'creditlow', 'fangate', 'fanforget', 'fansoccer'].includes(CONTROL)) { console.error(`unknown SIM_REPORTS_CONTROL ${CONTROL}`); process.exit(2); }
const CAREERS = Number(process.argv[2] || 150);
if (!(CAREERS >= 150)) { console.log(`ABORT: ${process.argv[2]} careers a sport; CRIT_FLOOR was measured at 150, so run 150 or more`); process.exit(2); }
/* B4's late fleet: every one of them must reach its sport's season cap, so the count is exact, not a band. */
const LATE = 40;
const SEED = Number(process.env.SIM_SEED || 1569);
/* The smallest critical count a sport may show: about half the smallest of 16 measured counts (37). */
const CRIT_FLOOR = 18;
/* F2's conduct fleet a sport, and the two F floors (about half the smallest measured count, see the header). */
const CONDUCT = 60;
const FANS_CLEAN_FLOOR = 700;
const FANS_CAUSE_FLOOR = 150;
/* F3: every ladder with no conduct field, as it read on 2ee79c595 before the gate (10,504 ladders). */
const LADDER_SHA = 'd05e19fba5eb25c8';
const SPORTS = ['nfl', 'nba', 'mlb', 'nhl'];
const CALLS = {
  'nflMyCareer.ts': ["clutchNote(clutch, depth, 'nfl', pf)", 'pf'],
  'nbaMyCareer.ts': ["clutchNote(clutch, depth, 'nba', poForm)", 'poForm'],
  'mlbMyCareer.ts': ["clutchNote(clutch, depth, 'mlb', pf)", 'pf'],
  'nhlMyCareer.ts': ["clutchNote(clutch, poDepth, 'nhl', poForm)", 'poForm'],
};
const SWAPS = {
  blind: ['careerVariance.ts', 'if (swing <= -7 && level < JANUARY_POOR) {', 'if (swing <= -7) {'],
  nocredit: ['careerVariance.ts', 'if (depth < 4 && level >= JANUARY_STRONG) {', 'if (false) {'],
  alwayslast: ['usCareerNoOffer.ts', 'return shouldRetire(ahead);', 'return true || shouldRetire(ahead);'],
  noseason: ['usCareerNoOffer.ts', 'seasons: [...c.seasons, last ?? c.seasons[0]]', 'seasons: [...c.seasons]'],
  titlecredit: ['careerVariance.ts', 'if (depth < 4 && level >= JANUARY_STRONG) {', 'if (depth <= 4 && level >= JANUARY_STRONG) {'],
  creditlow: ['careerVariance.ts', 'if (depth < 4 && level >= JANUARY_STRONG) {', 'if (depth < 4 && level >= JANUARY_POOR) {'],
  fangate: ['careerSocial.ts', 'if (f.conduct === false) {', 'if (false) {'],
  fanforget: ['careerSocial.ts', 'if (f.conduct === false) {', 'if (f.conduct !== undefined) {'],
  fansoccer: ['careerSocial.ts', 'if (f.conduct === false) {', 'if (f.conduct !== true) {'],
};
const fired = new Set();
const plugin = {
  name: 'reports1569', setup(b) {
    b.onLoad({ filter: /(MyCareer|careerVariance|usCareerNoOffer|careerSocial)\.ts$/ }, args => {
      let src = readFileSync(args.path, 'utf8');
      const base = path.basename(args.path);
      if (CALLS[base]) {
        const [call, level] = CALLS[base];
        if (!src.includes(call)) throw new Error(`the call ${call} is not in ${base}`);
        src = src.replace(call, `(globalThis.__po = { clutch, level: ${level} }, ${call})`);
        fired.add(base);
      }
      const swap = SWAPS[CONTROL];
      if (swap && swap[0] === base) {
        if (!src.includes(swap[1])) throw new Error(`control ${CONTROL}: "${swap[1]}" is not in ${base}`);
        src = src.replace(swap[1], swap[2]);
        fired.add(`control:${CONTROL}`);
      }
      return { contents: src, loader: 'ts' };
    });
  },
};
const OUT = path.join(os.tmpdir(), `us-reports-${CONTROL || 'base'}-${process.pid}.mjs`);
await build({
  stdin: {
    contents: SPORTS.map(s => `export { ${s.toUpperCase()}_CAREER_SPORT } from './src/lib/${s}CareerSport.ts';`).join('\n')
      + "\nexport { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';\nexport { extensionDue } from './src/lib/usCareerExtension.ts';"
      + "\nexport { seasonAheadIsLast, noOfferWhy } from './src/lib/usCareerNoOffer.ts';"
      + "\nexport { fanComments } from './src/lib/careerSocial.ts';\n",
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: ROOT, logLevel: 'error',
  alias: { '@': './src' }, plugins: [plugin], jsx: 'automatic',
  banner: { js: "import { createRequire as __r } from 'node:module'; const require = __r(import.meta.url);" },
});
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };
const M = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* a copy */ }
const want = 4 + (CONTROL ? 1 : 0);
if (fired.size !== want) { console.log(`ABORT: ${fired.size} of ${want} patches reached their file (${[...fired].join(', ')})`); process.exit(2); }

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const TITLE = { nfl: 'WON THE SUPER BOWL', nba: 'WON THE NBA FINALS', mlb: 'WON THE WORLD SERIES', nhl: 'WON THE STANLEY CUP' };
const OLD_LINES = ['not the same player in January', 'disappeared when it mattered', 'could not buy a hit in October', 'went quiet in the playoffs'];
const BANNED = /everyone saw it|disappeared|talk shows|could not buy|The room noticed/;
const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const CRIT = '\u{1F39E}️', CREDIT = '\u{1F4AA}', RISER = '\u{1F9CA}';
const fails = [];
const fail = (section, msg) => { if (fails.filter(f => f.startsWith(section)).length < 4) console.log(`  FAIL ${section}: ${msg}`); fails.push(`${section}: ${msg}`); };
const table = [];
/* F: one fan view, read through the sport's own binding after a season's progress, the cause read off the save
   here (not through the product's helper), and the old ladder (no conduct field) kept as the before line. */
const CONDUCT_RE = /attitude|villain|Deserved|Rooting for the old you|Can't support this guy|Focus on \w+ maybe/;
const CONDUCT_FIRST = ['Talented but man the attitude...', "Can't support this guy anymore"];
const WANT_FIRST = ['Quiet year. We know you have more in you', 'Rough stretch. It happens'];
const causeOf = c => (c.heat ?? 0) >= 65 || (c.suspendedSeasons ?? 0) > 0 || (c.dirtyMoney ?? 0) > 0 || c.seasons.some(s => s.teamResult === 'SUSPENDED')
  || c.lifeFlags?.nb_tradeReq === 1 || c.lifeFlags?.b_traderq === 1;
const fanTable = [];
function fanView(slug, S, c, t, where) {
  const lines = S.fanComments(c), cause = causeOf(c), low = c.fanbase < 50, said = lines.join(' | ');
  if (DASH.test(said)) fail('F1', `${slug}: a dash in the fans' lines "${said}"`);
  if (!cause && CONDUCT_RE.test(said)) fail('F1', `${slug} ${where}: a conduct line with nothing on the record at fanbase ${c.fanbase}: "${said}"`);
  if (low && !cause) { t.fansClean++; if (!WANT_FIRST.includes(lines[0])) fail('F1', `${slug} ${where}: fanbase ${c.fanbase} with nothing on the record reads "${lines[0]}"`); }
  if (low && cause) { t.fansCause++; if (!CONDUCT_FIRST.includes(lines[0])) fail('F2', `${slug} ${where}: fanbase ${c.fanbase} with a cause on the record reads "${lines[0]}"`); }
  const tier = c.fanbase >= 30 ? 'low' : 'lowest';
  if (low && !fanTable.some(r => r.slug === slug && r.cause === cause && r.tier === tier)) {
    const before = M.fanComments(slug, { pos: c.pos, standing: c.fanbase, followers: '1.2M' }).join(' | ');
    fanTable.push({ slug, cause, tier, fanbase: c.fanbase, where, before, after: said });
  }
}
for (const slug of SPORTS) {
  const S = M[`${slug.toUpperCase()}_CAREER_SPORT`];
  const t = { playoffs: 0, lost: 0, strongLost: 0, credit: 0, crit: 0, lastCalls: 0, lastSound: 0, noOffer: 0, windows: 0, fansClean: 0, fansCause: 0 };
  for (let k = 0; k < CAREERS; k++) {
    const rng = mulberry32(SEED * 1000 + k + slug.length * 7919);
    const pos = S.create.positions[k % S.create.positions.length];
    const arch = S.create.archetypes[pos][Math.floor(rng() * S.create.archetypes[pos].length)];
    const c = S.startCareer('Report Fleet', pos, arch, rng, null, 'now');
    let tq = S.rollTeamQuality(null, rng); S.assignRole(c, tq, rng);
    for (let guard = 0; guard < 30 && !c.retired; guard++) {
      let calledLast = null;
      if (M.extensionDue(c)) {
        const talk = S.buildExtension(c, rng);
        if (!talk.offer) {
          t.noOffer++;
          calledLast = M.seasonAheadIsLast(c, S.shouldRetire);
          const why = M.noOfferWhy({ age: c.age, ovr: c.ovr, cliffAge: S.extPushArgs(c, () => 0).cliffAge, market: talk.market });
          if (!/^No offer, and here is why: .+\. The open market prices you around \$[\d.]+M a year\.$/.test(why) || DASH.test(why)) fail('B3', `${slug}: "${why}"`);
        } else { c.contractYears = 1 + talk.offer.years; c.salary = talk.offer.salary; }
      } else if (c.contractYears <= 0) {
        const w = S.buildFaWindow(c, tq, rng); t.windows++;
        const live = w.offers.filter(o => !o.gone);
        if (!live.length) { fail('B1', `${slug} career ${k}: a market with no live offer at age ${c.age}`); break; }
        M.applyFaSigning(c, live[0]); tq = live[0].quality;
      }
      S.campBattle(c, tq, rng);
      globalThis.__po = null;
      const { line, notes } = S.simSeason(c, tq, rng);
      const po = globalThis.__po;
      S.progress(c, rng);
      fanView(slug, S, c, t, `career ${k} season ${c.seasons.length} (${c.role ?? 'no role'})`);
      const ended = S.shouldRetire(c);
      if (calledLast) { t.lastCalls++; if (ended) t.lastSound++; else fail('B2', `${slug} career ${k}: called the last season at age ${c.age - 1}, and the career went on`); }
      for (const n of notes) {
        if (OLD_LINES.some(o => n.includes(o)) || BANNED.test(n)) fail('C4', `${slug}: "${n}"`);
        if (DASH.test(n)) fail('C4', `${slug}: a dash in "${n}"`);
      }
      if (po) {
        t.playoffs++;
        const lost = line.teamResult !== TITLE[slug];
        const crit = notes.find(n => n.startsWith(CRIT)), credit = notes.find(n => n.startsWith(CREDIT)), riser = notes.find(n => n.startsWith(RISER));
        if (lost) t.lost++;
        if (crit) { t.crit++; if (po.level >= 70) fail('C1', `${slug} ${pos}: criticism on a January level of ${po.level.toFixed(1)}`); if (po.level >= 70 || po.clutch > -7) fail('C3', `${slug}: criticism at level ${po.level.toFixed(1)}, clutch ${po.clutch.toFixed(1)}`); }
        if (lost && po.level >= 76 && !riser) { t.strongLost++; if (credit) t.credit++; else fail('C2', `${slug} ${pos}: lost on a January level of ${po.level.toFixed(1)} with no credit`); }
        if (credit && (!lost || po.level < 76)) fail('C5', `${slug} ${pos}: the credit note on ${lost ? `a January level of ${po.level.toFixed(1)}` : 'a title win'}`);
        const kind = crit ? 'crit' : credit ? 'credit' : 'none';
        if (lost && po.clutch <= -7 && !table.some(r => r.slug === slug && r.kind === kind)) {
          const old = slug === 'nfl' ? 'You were not the same player in January and everyone saw it.' : slug === 'nba' ? 'You disappeared when it mattered. The talk shows had a field day.' : slug === 'mlb' ? 'You could not buy a hit in October. It will follow you all winter.' : 'You went quiet in the playoffs. The room noticed.';
          table.push({ slug, kind, pos, k, result: line.teamResult, level: po.level.toFixed(1), clutch: po.clutch.toFixed(1), before: old, after: crit ?? credit ?? '(no line)' });
        }
      }
      if (ended) { c.retired = true; break; }
      tq = S.rollTeamQuality(tq, rng);
    }
  }
  if (t.crit < CRIT_FLOOR) fail('C3', `${slug}: only ${t.crit} critical notes, the floor is ${CRIT_FLOOR}`);
  /* B4: the late fleet, held so that only the season count can end it (age 30, rating 80 before every season). */
  t.capCalls = 0; t.capSeasons = [];
  for (let k = 0; k < LATE; k++) {
    const rng = mulberry32(SEED * 7000 + k + slug.length * 104729);
    const pos = S.create.positions[k % S.create.positions.length];
    const c = S.startCareer('Report Late', pos, S.create.archetypes[pos][0], rng, null, 'now');
    let tq = S.rollTeamQuality(null, rng); S.assignRole(c, tq, rng);
    let ended = false;
    for (let guard = 0; guard < 40 && !ended; guard++) {
      c.age = 30; c.ovr = 80; c.contractYears = 3;
      const called = M.seasonAheadIsLast(c, S.shouldRetire);
      S.campBattle(c, tq, rng); S.simSeason(c, tq, rng); S.progress(c, rng);
      ended = S.shouldRetire(c);
      if (called !== ended) fail('B4', `${slug} late career ${k}: ${called ? 'called the last season and the career went on' : 'the season cap ended the career and the season was not called the last'} (${c.seasons.length} seasons)`);
      if (called && ended) { t.capCalls++; if (!t.capSeasons.includes(c.seasons.length)) t.capSeasons.push(c.seasons.length); }
      tq = S.rollTeamQuality(tq, rng);
    }
  }
  if (t.capCalls !== LATE) fail('B4', `${slug}: ${t.capCalls} of ${LATE} late careers were called last at the season cap`);
  /* F2: the conduct fleet. Before one season's progress the engine's own corruption meter gets a cause: a ban
     (heat 88 and 2M nobody can explain, so the season's drift crosses 90 and the engine suspends him, takes 30
     off the fanbase and wipes the money), money alone, or a file (heat 80, so it is still 71 after the season's
     cooling). Then the career plays on in the board's order, a ban served the way the board serves it. */
  for (let k = 0; k < CONDUCT; k++) {
    const rng = mulberry32(SEED * 9000 + k + slug.length * 15485863);
    const pos = S.create.positions[k % S.create.positions.length];
    const c = S.startCareer('Report Conduct', pos, S.create.archetypes[pos][0], rng, null, 'now');
    let tq = S.rollTeamQuality(null, rng); S.assignRole(c, tq, rng);
    const at = 1 + (k % 4), kind = k % 3;
    for (let guard = 0; guard < 12; guard++) {
      c.contractYears = 3;
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push(S.suspendedLine(c));
        S.progress(c, rng);
      } else {
        S.campBattle(c, tq, rng); S.simSeason(c, tq, rng);
        if (guard === at) { if (kind === 0) { c.heat = 88; c.dirtyMoney = 2; } else if (kind === 1) c.dirtyMoney = 1.5; else c.heat = 80; }
        S.progress(c, rng);
      }
      fanView(slug, S, c, t, `conduct career ${k} season ${c.seasons.length} (${['ban', 'money', 'file'][kind]})`);
      if (S.shouldRetire(c)) break;
      tq = S.rollTeamQuality(tq, rng);
    }
  }
  /* F1 and F2, the public trade request: the NBA and NFL storylines record it as 1 on their own flag (2 is the
     private request, 3 is staying), and the request resets the fanbase to 38 or 40. */
  const TRADE_FLAG = { nba: 'nb_tradeReq', nfl: 'b_traderq' }[slug];
  if (TRADE_FLAG) for (const v of [1, 2, 3]) {
    const pos = S.create.positions[0];
    const c = S.startCareer('Report Trade', pos, S.create.archetypes[pos][0], mulberry32(SEED + v), null, 'now');
    c.lifeFlags = { ...(c.lifeFlags ?? {}), [TRADE_FLAG]: v }; c.fanbase = 38;
    fanView(slug, S, c, t, `trade request ${v}`);
  }
  if (t.fansClean < FANS_CLEAN_FLOOR) fail('F1', `${slug}: only ${t.fansClean} low fan views with nothing on the record, the floor is ${FANS_CLEAN_FLOOR}`);
  if (t.fansCause < FANS_CAUSE_FLOOR) fail('F2', `${slug}: only ${t.fansCause} low fan views with a cause on the record, the floor is ${FANS_CAUSE_FLOOR}`);
  console.log(`${slug}: ${JSON.stringify(t)}`);
}
/* F3: with no conduct field (Soccer Career passes none) every ladder reads as it did before the gate. */
{
  const SOCCER_POS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];
  const DERBIES = [null, { won: 1, lost: 0 }, { won: 0, lost: 1 }, { won: 1, lost: 1 }, { won: 0, lost: 0 }];
  const out = [];
  for (const sport of ['soccer', ...SPORTS]) {
    const positions = sport === 'soccer' ? SOCCER_POS : M[`${sport.toUpperCase()}_CAREER_SPORT`].create.positions;
    for (const pos of positions) for (let standing = 0; standing <= 100; standing++) for (const d of sport === 'soccer' ? DERBIES : [null]) {
      out.push(M.fanComments(sport, d ? { pos, standing, followers: '1.2M', derby: { ...d, rival: 'Rivals FC' } } : { pos, standing, followers: '1.2M' }).join('|'));
    }
  }
  const sha = createHash('sha1').update(out.join('\n')).digest('hex').slice(0, 16);
  if (sha !== LADDER_SHA) fail('F3', `the ladders with no conduct field read ${sha} over ${out.length}, not ${LADDER_SHA} as before the gate`);
  const phone = readFileSync(path.join(ROOT, 'src/components/soccer-career/PhonePanel.tsx'), 'utf8');
  const call = /fanCommentsFor\("soccer", \{[\s\S]*?\}\);/.exec(phone);
  if (!call) fail('F3', 'could not read the soccer fan call out of PhonePanel.tsx, so this check proves nothing');
  else if (/conduct/.test(call[0])) fail('F3', 'Soccer Career passes the conduct field');
  console.log(`F3: ${out.length} ladders with no conduct field, digest ${sha}`);
}
console.log('The fans, before and after, fixed seeded careers (before is the ladder with no conduct field):');
for (const r of fanTable) console.log(`  ${r.slug} ${r.where} | fanbase ${r.fanbase}, ${r.cause ? 'a cause on the record' : 'nothing on the record'} | before: ${r.before} | after: ${r.after}`);
console.log('Before and after, fixed seeded postseasons (the same games; before is the old rule\'s line):');
for (const r of table) console.log(`  ${r.slug} ${r.pos} career ${r.k} | ${r.result} | level ${r.level}, clutch ${r.clutch} | before: ${r.before} | after: ${r.after}`);
const sections = ['B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'C5', 'F1', 'F2', 'F3'];
console.log(sections.map(s => `${s} ${fails.some(f => f.startsWith(s)) ? 'FAIL' : 'ok'}`).join(', '));
console.log(`simUsCareerReports ${fails.length ? 'FAIL' : 'PASS'}: ${fails.length} findings, ${CAREERS} careers a sport, seed ${SEED}${CONTROL ? `, CONTROL ${CONTROL}` : ''}`);
process.exit(fails.length ? 1 : 0);
