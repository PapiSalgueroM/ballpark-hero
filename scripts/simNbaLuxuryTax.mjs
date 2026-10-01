/* The NBA luxury tax and roster floor fence. Round 722.

   WHAT THE ROUND SHIPPED. src/lib/nbaLuxuryTax.ts holds the 2026-27 tax line,
   the two aprons, the bracket width and the bracket rates of the 2023
   agreement, each with two sources. The NBA engine assesses the tax once at
   season close on every club (nbaAssessTax), holds the bill back from next
   season's room (nbaCapRoom), lets a CPU club facing a cheque walk its
   expiring depth (nbaOffseason), applies the first apron's 100% matching
   rule to every trade path (nbaSalaryFits), and tips off only on fourteen to
   fifteen men (nbaTipOff, nbaTipOffRefusal). The board moves trust by the
   bill (ownerTaxReaction) and the shared hub and cap panel say so through
   the sport descriptor (foHub.ts: tax, rosterFloor, foCapLines).

   Every section runs the REAL engine, bundled with esbuild. Nothing reads
   dist or the clock.

     1) the bracket formula. The harness carries its own copy of the
        published table (rates, width, the 2026-27 lines) and recomputes the
        bill on a table of payrolls, standard and repeater, at two caps; the
        engine must agree to 0.1. Four bills are also typed by hand from the
        published numbers, so a shared mistake in the two formulas cannot
        hide. The repeater rule is checked on crafted histories, and
        nbaAssessTax on a club with such a history uses the repeater rates.
     2) a club a dollar over the line pays, the same club a dollar under pays
        nothing, a bigger overage always pays more, and a repeater always pays
        more than a first time payer on the same payroll. The all season
        projection (nbaTaxView, which the cap panel, the hub and the Tax chip
        draw) reads a repeater at repeater rates and quotes the bill the close
        then charges. The first apron's rule: above it after the deal, 12 back
        for 10 out is refused by nbaSalaryFits and invalid in nbaTrade, 10 for
        10 is fine, and the same 12 for 10 under the cap goes through.
     3) ten seeded franchises, five seasons each, the board's own loop (tip
        off, twenty rounds, playoffs, assessment, a draft the GM and the CPU
        both pick in, the summer). At every tip off every roster holds 14 to
        15 men, typed as 14 and 15 here, not read from the engine. The GM
        drafts two a season and so goes above fifteen; nbaTipOffRefusal must
        fire exactly then, nbaTipOff must leave his roster alone and name him
        refused, and the shared cuts flow (nbaRelease, dead money and all)
        brings him back under before the season starts. The path has to be
        exercised at least once or the section fails as vacuous. A GM short
        of fourteen is filled from the pool on one year minimum deals, named.
        No CPU club fills its gap out of the pool: every man who leaves the
        pool at tip off goes to the GM, checked at every tip off where a CPU
        club was filled while the pool still had men (at least one, or the
        check is vacuous).
     4) an old save. A fresh league stripped of every optional field this
        round and Round 631 added (taxScale, taxHistory, taxDue, deadCap,
        releasedThisSeason) projects no tax, says so on the cap panel and has
        no apron; it tips off, plays and closes WITHOUT a bill (that season
        started untaxed), the summer sets its tax scale, and the second
        season closes taxed with every club assessed once. And the shared
        season close test runs under vitest on all four boards, whose saves
        are exactly that old shape.
     5) the tax binds. "Payers shed more than non payers" is true but
        confounded: a high payroll loses more when its deals expire whether
        or not a tax exists, and measured with every rate at zero that gap
        still reads -0.056 against -0.073 with the rates on. So the
        measurement is paired instead: the same ten seeds run through the
        real engine and through a twin bundled with every rate at zero, and
        for every CPU club over the line at a season close the ratio of
        payroll to tax line at the next tip off is read off both. The first
        measurement (pooled -0.049, band -0.012) was taken while the first
        tip off of every league handed the ten man free agent pool, men rated
        72 to 81, to three CPU clubs on one year deals; re-signed at full
        salary the next summer in the twin and walked by the real engine's
        payers, they made up most of the gap. With the pool kept for the GM
        (review fix, 2026-10-01) the effect was measured again over six seed
        sets of ten, 1-10 through 51-60, 60 franchises and 1501 club
        seasons: pooled -0.0140, -0.0161, -0.0198, -0.0175, -0.0191 and
        -0.0192 (seeds 1-10, the ones run here, are the lightest set), every
        one of the 60 per seed means negative, from -0.002 to -0.038. The
        real engine's payers tip off about 1.5% of the line, roughly 3M,
        lighter than the same clubs in a league with no tax.
        CALIBRATED LEAGUE (second review fix, 2026-10-01). With the lines set
        from the league's own payrolls (section 7) only five clubs open over
        the line instead of fourteen, so there are fewer payers to measure.
        The twin is pinned to the real league's scale: with its rates at zero
        its own calibration sees no bill to cap and sets a lower line, and a
        first run that let it do so read a pooled -0.059 that was mostly the
        gap between two lines. Pinned, over the same six seed sets: pooled
        -0.0139, -0.0113, -0.0155, -0.0150, -0.0117 and -0.0102 over 77, 82,
        79, 75, 80 and 78 club seasons, the per seed mean negative on 8, 8,
        10, 10, 9 and 9 of each ten. The band is a pooled mean under -0.0025,
        a quarter of the lightest set, and at least six of the ten seeds
        negative, two under the fewest measured; under the zero tax control
        both bundles are the twin and the difference is exactly zero, and
        with the CPU steer switched off by hand it read 0.0000 too. The
        blunter read, clubs over the line from season three on with the tax
        and without it, is printed but no longer asserted: calibrated, it
        measured 12/13, 3/4, 4/7, 11/13, 0/2 and 3/8, always lower with the
        tax but by as little as one club season, too thin for a margin.
     6) the shared descriptor. foHubTiles with a tax and a roster floor says
        so on the Trades and Roster boxes and is byte identical without them;
        a sport that declares a roster ceiling but no tip off floor (the NHL
        and MLB boards) draws its long roster's Roster box exactly as before;
        foCapLines writes the tax, apron and roster lines and nothing when
        passed neither.
     7) a league that looks like a real one (second review fix). The game's
        salaries are its own and run rich at the top: at the real 200.4 line
        a new league opened with 14 of 30 clubs over it and a 416.5 bill for
        the top club, against eight payers and a 176.9 record in 2023-24. So
        every league sets its lines from its own payrolls (nbaCalibrateTaxScale
        in nbaLuxuryTax.ts) and this section holds the result to real seasons
        over the ten seeds: clubs over the line at the first tip off, the
        largest season one bill, the median season one taxpayer's bill, that
        a CPU payer can shed its way under the line (it tips off under while
        its no tax twin is still over, so the cap rise did not carry it), and
        that the section 4 old save, calibrated at its first summer, lands the
        same way. Measured 2026-10-01 over six seed sets of ten: the payroll
        table is a function of rating alone, so the opening league is the same
        on every seed: line 226.7 (scale 1.1311 on the real 200.4), aprons
        236.4 and 250.7, brackets 6.859 wide, five clubs over, bills 189.6,
        176.5, 59.5, 24.8 and 1.7, median 59.5. Five is under the eight of
        2023-24 because the ceiling wins: the two richest payrolls (274.6 and
        272.5) sit 21 or more above the third, and any line low enough for
        eight payers bills the top club over 250. CPU payers shed under 5, 3, 6, 5, 3 and
        9 times per set. The old save: line 227 at a cap of 177, five over,
        largest projected bill 189.5. Bands: four to ten clubs over (the
        real range of five to ten, one lower because the ceiling can take
        precedence), no bill above 190 (the top of the real record: 176.9
        paid, 188.2 projected), a median of 15 to 70 (real medians 44.9 to
        48.2 over eight payers; a five payer league's median is its third
        bill, and the real third bill in 2023-24 was 68.2), and at least one
        shed under over the ten seeds. The worked example on the page, the
        guide and What's New quote the opening league (line 226.7, brackets
        6.859, first apron 236.4, 10M over pays 10.8 or 30.8 as a repeater)
        and are read here against the engine, so they cannot drift from it.
     8) the tax does not fade (Round 824). The round 722 review measured clubs
        over the line by season running 5, then 3 or 4, then 0 to 2, then 0 or
        1, because the cap and the line rose 7% a season while every new deal
        was priced in opening season money. Round 824 prices every new deal
        (re-signs, rookie deals, the minimum, free agent asks) in the money of
        the season it starts in (nbaPayScale). Ten leagues, ten seasons each,
        the board's loop. Measured 2026-10-01 over three seed sets of ten
        (1-10, 11-20 and 21-30, NBA_TAX_LONG_SEED_BASE moves this section
        only):
          the mean club's payroll over the line, season ten over season three:
            0.952, 0.986, 0.985; with flat pay (the flatpay control) 0.588,
            the ratio falling every season from 0.863 to 0.399
          computer clubs over the line a season, seasons four to ten: 0.27,
            0.31, 0.39; with flat pay 0.00 on every set
          every club, the harness GM included (he keeps everyone he drafts):
            1.16, 1.13, 1.20; with flat pay 0.74
        Bands: at least 0.85, 0.12 and 0.95. WHAT IS NOT FIXED, printed so it
        is not forgotten: the ratio no longer decays from season three on, but
        it settles near 0.67 against 0.86 at the opening, and computer clubs
        over the line settle near one season in three. The second cause is the
        computer clubs' summer: they re-sign or walk their own men and refill
        only with minimum deals (league wide minimum deals ran from 121 to 237
        of about 423 men over ten seasons in one measured league), so nothing
        spends a computer club back up to the line. That is a free agency
        decision for a later round, not a pay scale one. The allLate band
        mostly measures the harness GM, who never lets a draftee go; cpuLate
        is the one that reads the computer clubs alone.
        Then the pool (review fix): after every summer each free agent must
        ask his rating's price in the money of the season about to start, and
        most asks must sit above the opening season's price for his rating.
        Nothing above reads the pool, since nobody here signs from it, so
        deleting the summer reprice once left every number identical.

   Controls, through NBA_TAX_CONTROL. None touches src: the rewritten source
   is served to the bundler from memory, and each refuses to run if its
   anchor is not in the file. Under a control the harness exits 1 when
   exactly the expected sections went red (the control fired), 3 and a loud
   line when they did not (the check is dead), and 2 when the control could
   not even be bundled:
     zerotax      every rate driven to zero              -> 1, 2, 5 and 7
                  (no bill means no median and nobody sheds)
     tipoff12     the tip off floor dropped to twelve     -> 3, 4 and 7 (the old
                  save section reads the fourteen too, and the opening line the
                  copy quotes moves to 223)
     norepeater   the repeater schedule made the standard one -> 1, 2 and 7
                  (the worked example's repeater bill)
     cpupool      every club fills its tip off gap from the pool  -> 3 and 7
                  (the old save calibrates on a richer top, three payers)
     viewrepeater the projection never uses repeater rates        -> 2
     noapron      the first apron never binds on a trade           -> 2
     hubfloor     the hub's tip off line for any declared ceiling  -> 6
     realline     every league keeps the real 200.4 line          -> 7
     oldbill      an old save is billed for the season it was saved in -> 4
     flatpay      every new deal priced in opening season money        -> 8
                  (Round 824; run 2026-10-01 and fired)
     noreprice    the pool's asks never repriced in the summer          -> 8
                  (Round 824 review fix: before the asks check it left every
                  number identical; run 2026-10-01 and fired)
   The last six rewrite nbaFrontOffice.ts or foHub.ts (in both bundles, so
   section 5 still compares like with like) and were added by the review.

   Run: node scripts/simNbaLuxuryTax.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(ROOT, 'src', 'lib');
const TAX_FILE = path.join(LIB, 'nbaLuxuryTax.ts');
const CONTROL = process.env.NBA_TAX_CONTROL || '';
const EXPECT = {
  /* with no rates at all the median bill is zero and nobody sheds, so section 7 goes too */
  zerotax: [1, 2, 5, 7],
  /* the old save section reads the fourteen too, so a lower floor reaches it;
     and the calibration prices a short roster at the floor, so the opening line
     moves (223 instead of 226.7) and the copy that quotes it goes red in 7 */
  tipoff12: [3, 4, 7],
  /* and 7: the worked example quotes the repeater bill, 30.8, which becomes 10.8 */
  norepeater: [1, 2, 7],
  /* review fixes: each reaches only the one check written for it */
  /* and 7: the CPU clubs that took the pool's 72 to 81 men re-sign them at full
     salary that summer, so the section 4 old save calibrates on a richer top
     and opens with three payers, under the band */
  cpupool: [3, 7],
  viewrepeater: [2],
  noapron: [2],
  hubfloor: [6],
  /* the calibration fix: the line back at the real 200.4, and an old save billed for its own season */
  realline: [7],
  oldbill: [4],
  /* Round 824: new deals priced in opening season money forever, the fade */
  flatpay: [8],
  /* Round 824 review fix: the pool's asks never repriced, which moved no other number */
  noreprice: [8],
};
if (CONTROL && !EXPECT[CONTROL]) {
  console.error(`NBA_TAX_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EXPECT).join(', ')})`);
  process.exit(1);
}

const SECTION_NAMES = {
  1: 'the bracket formula, against the published table',
  2: 'over pays, under does not, more pays more, a repeater pays most',
  3: 'fourteen to fifteen men at every tip off, ten franchises, five seasons',
  4: 'an old save tips off, closes and is assessed',
  5: 'the tax binds: payers against their twins in a league with no tax',
  6: 'the shared descriptor says so',
  7: 'a league that looks like a real one: taxpayers, the biggest bill, the typical bill, a way under',
  8: 'ten seasons: from season three payrolls hold against the line, the league keeps taxpayers, the pool asks in each season\'s money',
};

/* ---- the published table, typed here on purpose ------------------------- */
/* 2026-27, $M: https://www.nba.com/news/nba-salary-cap-2026-27-season and
   https://www.hoopsrumors.com/2026/06/salary-cap-tax-line-set-for-2026-27-nba-season.html */
const CAP_2026 = 164.961;
const TAX_2026 = 200.428;
const APRON1_2026 = 209.015;
const APRON2_2026 = 221.686;
/* bracket width 2026-27 and the rates from 2025-26, hoopsrumors glossary and salaryswish */
const WIDTH_2026 = 6.064;
const STD = [1.00, 1.25, 3.50, 4.75];
const REP = [3.00, 3.25, 5.50, 6.75];
const STEP = 0.50;
/* the roster rule, hoopsrumors glossary and slamonline */
const FLOOR = 14;
const CEILING = 15;
/* Real seasons, typed here for section 7 (the engine's own targets live in
   nbaLuxuryTax.ts and are not read from there on purpose):
   2023-24 final, eight payers: 176.9, 142.4, 68.2, 52.5, 43.8, 20.2, 15.7, 6.9, median 48.2
     https://hoopsrumors.com/2024/06/warriors-top-list-of-nbas-2023-24-taxpayers.html
   2023-24 projected before the season, eight payers, the largest 188.2, median 44.9
     https://ca.sports.yahoo.com/news/luxury-tax-2023-24-much-094006005.html
   Golden State's 2021-22 bill, the record before that, 170
     https://nbcsports.com/nba/news/joe-lacob-warriors-in-trouble-with-rest-of-nba-for-spending
   The bands are set in the header (section 7) from these and from the measurement. */
const TAXPAYERS_BAND = [4, 10];
const BILL_CEILING = 190;
const MEDIAN_BAND = [15, 70];
/* four bills worked by hand from the numbers above at the 2026-27 cap. The
   brackets end at 6.064, 12.128 and 18.192, so 20M over reaches a fourth one:
   10M over, standard: 6.064 x 1.00 + 3.936 x 1.25 = 10.984 -> 11.0
   10M over, repeater: 6.064 x 3.00 + 3.936 x 3.25 = 30.984 -> 31.0
   20M over, standard: 6.064 + 7.580 + 6.064 x 3.50 + 1.808 x 4.75 = 43.456 -> 43.5
   20M over, repeater: 18.192 + 19.708 + 6.064 x 5.50 + 1.808 x 6.75 = 83.456 -> 83.5
   (The first draft of this table put 20M over in three brackets and both
   formulas disagreed with it, which is the whole point of typing it.) */
const HAND = [[10, false, 11.0], [10, true, 31.0], [20, false, 43.5], [20, true, 83.5]];
/* Section 8 bands, set from the measurement in the header (Round 824). */
const FADE_BAND = { keep: 0.85, cpuLate: 0.12, allLate: 0.95 };

const round1 = n => Math.round(n * 10) / 10;
const near = (a, b, eps = 0.051) => Math.abs(a - b) <= eps;
const rateAt = (i, rep) => { const t = rep ? REP : STD; return i < t.length ? t[i] : t[t.length - 1] + STEP * (i - t.length + 1); };
const lineAt = cap => round1(cap * TAX_2026 / CAP_2026);
const expectBill = (over, cap, rep, scale = 1) => {
  if (over <= 0) return 0;
  const width = WIDTH_2026 * cap * scale / CAP_2026;
  let bill = 0, left = over;
  for (let i = 0; left > 1e-9; i += 1) { const s = Math.min(left, width); bill += s * rateAt(i, rep); left -= s; }
  return round1(bill);
};

let checks = 0;
const fails = [];
const bySection = new Map();
const ok = (section, label, pass, detail) => {
  checks += 1;
  const s = bySection.get(section) ?? { n: 0, bad: 0 };
  s.n += 1;
  if (!pass) { s.bad += 1; fails.push(`[${section}] ${label}${detail ? ': ' + detail : ''}`); }
  bySection.set(section, s);
};
const clone = v => JSON.parse(JSON.stringify(v));
const lcg = start => { let seed = start >>> 0; return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; };
const normaliseEol = t => t.split('\r\n').join('\n');
const req = createRequire(path.join(ROOT, 'package.json'));
const findUp = rel => {
  let dir = ROOT;
  for (let i = 0; i < 6; i += 1) {
    const p = path.join(dir, rel);
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
};
/* Rewrite a copy, refusing to run if any anchor is missing or the result is unchanged. */
const rewrite = (label, src, swaps) => {
  for (const [now] of swaps) {
    if (!src.includes(now)) throw new Error(`control ${CONTROL}: ${JSON.stringify(now.slice(0, 70))} is not in ${label}, so it would change nothing. Refusing to run.`);
  }
  let out = src;
  for (const [now, was] of swaps) out = out.split(now).join(was);
  if (out === src) throw new Error(`control ${CONTROL}: the rewrite of ${label} changed nothing. Refusing to run.`);
  return out;
};

/* ---- the engine, bundled twice: as shipped (or under the control) and as a twin with no tax ---- */
const ZERO_SWAPS = [
  ['export const NBA_TAX_RATES_STANDARD = [1.00, 1.25, 3.50, 4.75];', 'export const NBA_TAX_RATES_STANDARD = [0, 0, 0, 0];'],
  ['export const NBA_TAX_RATES_REPEATER = [3.00, 3.25, 5.50, 6.75];', 'export const NBA_TAX_RATES_REPEATER = [0, 0, 0, 0];'],
  ['export const NBA_TAX_RATE_STEP = 0.50;', 'export const NBA_TAX_RATE_STEP = 0;'],
];
const CONTROL_SWAPS = {
  zerotax: ZERO_SWAPS,
  tipoff12: [['export const NBA_TIPOFF_MIN = 14;', 'export const NBA_TIPOFF_MIN = 12;']],
  norepeater: [['export const NBA_TAX_RATES_REPEATER = [3.00, 3.25, 5.50, 6.75];', 'export const NBA_TAX_RATES_REPEATER = [1.00, 1.25, 3.50, 4.75];']],
};
/* Controls on the engine and hub files rather than the tax table. Applied to
   both bundles, real and twin, so the twin still differs from the real engine
   by the tax alone and section 5 measures what it always measured. */
const CONTROL_FILE_SWAPS = {
  cpupool: { 'nbaFrontOffice.ts': [['    const fromPool = t.abbr === myTeam;', '    const fromPool = true;']] },
  viewrepeater: { 'nbaFrontOffice.ts': [['  const repeater = nbaIsRepeater(t.taxHistory, league.season);', '  const repeater = false;']] },
  noapron: { 'nbaFrontOffice.ts': [['  if (taxScale != null && after > nbaFirstApron(cap, taxScale)) return incoming.salary <= outgoing.salary;', '  if (taxScale != null && after > Infinity) return incoming.salary <= outgoing.salary;']] },
  realline: { 'nbaFrontOffice.ts': [['  league.taxScale = nbaCalibrateTaxScale(payrolls, league.cap);', '  league.taxScale = 1;']] },
  oldbill: { 'nbaFrontOffice.ts': [['  if (scale == null) return out;', '  if (scale === -1) return out;']] },
  flatpay: { 'nbaFrontOffice.ts': [['  return cap / NBA_CAP_BASE;', '  return 1;']] },
  noreprice: { 'nbaFrontOffice.ts': [[' fa.salary = nbaSalaryFor(fa.ovr, nextCap); }', ' }']] },
  hubfloor: { 'foHub.ts': [['const tooMany = f.rosterFloor != null && f.rosterMax != null ?', 'const tooMany = f.rosterMax != null ?']] },
};
const NOTE = {
  zerotax: 'every tax rate driven to zero in the engine copy: nobody owes anything and no CPU club steers',
  tipoff12: 'the tip off floor dropped to twelve in the engine copy',
  norepeater: 'the repeater schedule replaced by the standard one in the engine copy',
  cpupool: 'every club, not just the GM, fills its tip off gap out of the free agent pool',
  viewrepeater: 'the all season projection never uses the repeater rates',
  noapron: 'the first apron never binds on a trade',
  hubfloor: 'the hub says "waive before tip off" for any sport that declares a roster ceiling',
  realline: 'every league keeps the real 200.4 line instead of one set from its own payrolls',
  oldbill: 'a league saved before the round is billed at the close of the season it was saved in',
  flatpay: 'every new deal priced in opening season money whatever the cap has risen to (before Round 824)',
  noreprice: "the free agent pool's asks are never repriced in the summer, so they stay in the money of the season each man was priced in",
}[CONTROL];
if (NOTE) console.log(`   control ${CONTROL}: ${NOTE}`);

const BUNDLE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nbatax-'));
let real = null;
let twin = null;
let hub = null;
try {
  const taxSrc = normaliseEol(fs.readFileSync(TAX_FILE, 'utf8'));
  /* The engine and hub files a control rewrites, rewritten once up front so a
     missing anchor refuses here, loudly, rather than inside the bundler. */
  const fileTexts = {};
  for (const [base, swaps] of Object.entries(CONTROL_FILE_SWAPS[CONTROL] ?? {})) {
    fileTexts[base] = rewrite(base, normaliseEol(fs.readFileSync(path.join(LIB, base), 'utf8')), swaps);
  }
  const esbuild = await import(pathToFileURL(req.resolve('esbuild')).href);
  const fwd = p => JSON.stringify(p.replaceAll('\\', '/'));
  const bundle = async (name, swaps) => {
    const text = swaps ? rewrite('nbaLuxuryTax.ts', taxSrc, swaps) : taxSrc;
    const plugin = {
      name: `dukb-${name}`,
      setup(b) {
        b.onLoad({ filter: /nbaLuxuryTax\.ts$/ }, args => ({ contents: text, loader: 'ts', resolveDir: path.dirname(args.path) }));
        b.onLoad({ filter: /(nbaFrontOffice|foHub)\.ts$/ }, args => {
          const own = fileTexts[path.basename(args.path)];
          return own === undefined ? undefined : { contents: own, loader: 'ts', resolveDir: path.dirname(args.path) };
        });
      },
    };
    const entry = path.join(BUNDLE_DIR, `${name}.entry.mjs`);
    fs.writeFileSync(entry, [
      `export * as nba from ${fwd(path.join(LIB, 'nbaFrontOffice.ts'))};`,
      `export * as tax from ${fwd(TAX_FILE)};`,
      `export * as cuts from ${fwd(path.join(LIB, 'frontOfficeCuts.ts'))};`,
      `export * as hub from ${fwd(path.join(LIB, 'foHub.ts'))};`,
      `export * as owner from ${fwd(path.join(LIB, 'foOwnerMandate.ts'))};`,
    ].join('\n') + '\n');
    const out = path.join(BUNDLE_DIR, `${name}.mjs`);
    await esbuild.build({
      entryPoints: [entry], bundle: true, format: 'esm', platform: 'node',
      alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin], outfile: out, logLevel: 'error',
    });
    return import(pathToFileURL(out).href);
  };
  real = await bundle('real', CONTROL_SWAPS[CONTROL] ?? null);
  twin = await bundle('twin', ZERO_SWAPS);
  hub = real.hub;
} catch (e) {
  console.error(`FAIL: the engine could not be bundled and run: ${String(e && e.message ? e.message : e).slice(0, 260)}`);
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  /* Under a control, 1 means "the control fired". A control that could not
     even be bundled measured nothing, so it must not read as fired. */
  process.exit(CONTROL ? 2 : 1);
} finally {
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
}
for (const fn of ['initNbaLeague', 'simRound', 'runNbaPlayoffs', 'nbaOffseason', 'nbaDraftClass', 'nbaProspectToPlayer', 'nbaStandings',
  'nbaCapUsed', 'nbaCapRoom', 'nbaRelease', 'nbaTipOff', 'nbaTipOffRefusal', 'nbaAssessTax', 'nbaTaxView', 'nbaTaxLine', 'nbaFirstApron',
  'nbaSecondApron', 'nbaTaxBill', 'nbaSalaryFits', 'nbaTrade']) {
  if (typeof real.nba[fn] !== 'function') { console.error(`FAIL: nbaFrontOffice.ts does not export ${fn}`); process.exit(1); }
}
for (const fn of ['nbaIsRepeater', 'nbaTaxRate', 'nbaTaxBracket']) {
  if (typeof real.tax[fn] !== 'function') { console.error(`FAIL: nbaLuxuryTax.ts does not export ${fn}`); process.exit(1); }
}
if (typeof hub.foHubTiles !== 'function' || typeof hub.foCapLines !== 'function' || typeof real.owner.ownerTaxReaction !== 'function') {
  console.error('FAIL: foHub.ts or foOwnerMandate.ts did not bundle the Round 722 exports');
  process.exit(1);
}
const { nba, tax } = real;

/* ---- 1. the bracket formula ---------------------------------------------- */
console.log('1) The bracket formula, against the published table typed in this file');
{
  ok(1, 'the first apron is the published 209.015', tax.NBA_FIRST_APRON_2026_27 === APRON1_2026, String(tax.NBA_FIRST_APRON_2026_27));
  ok(1, 'the second apron is the published 221.686', tax.NBA_SECOND_APRON_2026_27 === APRON2_2026, String(tax.NBA_SECOND_APRON_2026_27));
  ok(1, 'the bracket width is the published 6.064', tax.NBA_TAX_BRACKET_2026_27 === WIDTH_2026, String(tax.NBA_TAX_BRACKET_2026_27));
  ok(1, 'the 2026-27 tax line is 200.4 at the 2026-27 cap', nba.nbaTaxLine(CAP_2026) === lineAt(CAP_2026) && near(nba.nbaTaxLine(CAP_2026), TAX_2026, 0.051), String(nba.nbaTaxLine(CAP_2026)));
  ok(1, 'the aprons at the 2026-27 cap are the published figures to 0.1', near(nba.nbaFirstApron(CAP_2026), APRON1_2026) && near(nba.nbaSecondApron(CAP_2026), APRON2_2026),
    `${nba.nbaFirstApron(CAP_2026)} / ${nba.nbaSecondApron(CAP_2026)}`);
  /* the rate schedule, bracket by bracket, ten brackets out */
  for (let i = 0; i < 10; i += 1) {
    ok(1, `standard rate in bracket ${i + 1} is ${rateAt(i, false)}`, tax.nbaTaxRate(i, false) === rateAt(i, false), String(tax.nbaTaxRate(i, false)));
    ok(1, `repeater rate in bracket ${i + 1} is ${rateAt(i, true)}`, tax.nbaTaxRate(i, true) === rateAt(i, true), String(tax.nbaTaxRate(i, true)));
  }
  /* the hand worked bills: against the harness formula first, then the engine */
  for (const [over, rep, want] of HAND) {
    ok(1, `hand worked ${over}M over ${rep ? 'repeater' : 'standard'}: the harness formula gives ${want}`, expectBill(over, CAP_2026, rep) === want, String(expectBill(over, CAP_2026, rep)));
    const got = nba.nbaTaxBill(nba.nbaTaxLine(CAP_2026) + over, CAP_2026, rep);
    ok(1, `hand worked ${over}M over ${rep ? 'repeater' : 'standard'}: the engine gives ${want}`, got === want, String(got));
  }
  /* a table of payrolls at two caps: the one the game opens on and the one it reaches after a summer */
  const OVERS = [0, 0.1, 3, 6.064, 6.1, 10, 12.128, 15, 20, 25, 30.32, 33, 47.5, 61, 75, 120];
  let rows = 0;
  for (const cap of [CAP_2026, Math.round(CAP_2026 * 1.07)]) {
    const line = nba.nbaTaxLine(cap);
    for (const over of OVERS) {
      for (const rep of [false, true]) {
        const want = expectBill(over, cap, rep);
        const got = nba.nbaTaxBill(line + over, cap, rep);
        rows += 1;
        ok(1, `cap ${cap}, ${over}M over, ${rep ? 'repeater' : 'standard'}: ${want}`, near(got, want), `engine ${got}`);
      }
    }
  }
  /* the repeater rule on crafted histories */
  const hist = (...seasonsPaid) => seasonsPaid.map(s => ({ season: s, payroll: 1, line: 0, bill: 1, repeater: false }));
  ok(1, 'paid in three of the previous four seasons: a repeater', tax.nbaIsRepeater(hist(2026, 2027, 2028), 2030) === true);
  ok(1, 'paid in two of the previous four: not a repeater', tax.nbaIsRepeater(hist(2026, 2028), 2030) === false);
  ok(1, 'three payments but one fell out of the window: not a repeater', tax.nbaIsRepeater(hist(2025, 2027, 2028), 2030) === false);
  ok(1, 'the current season does not count toward its own repeater test', tax.nbaIsRepeater(hist(2028, 2029, 2030), 2030) === false);
  ok(1, 'a season with no bill is not a payment', tax.nbaIsRepeater([...hist(2027, 2028), { season: 2029, payroll: 1, line: 0, bill: 0, repeater: false }], 2030) === false);
  ok(1, 'no history at all: not a repeater', tax.nbaIsRepeater(undefined, 2026) === false);
  /* nbaAssessTax on a club carrying such a history uses the repeater rates */
  {
    const lg = nba.initNbaLeague(lcg(722));
    const abbr = Object.keys(lg.teams)[0];
    const t = lg.teams[abbr];
    /* scale 1: the formula is checked at the published lines; section 7 checks the league's own scale */
    lg.season = 2030; lg.cap = 180; lg.taxScale = 1;
    t.taxHistory = hist(2027, 2028, 2029);
    t.players.forEach(p => { p.salary = 0; });
    t.players[0].salary = round1(nba.nbaTaxLine(180) + 20);
    const entry = nba.nbaAssessTax(lg).find(e => e.team === abbr);
    ok(1, 'the assessment flags the repeater', entry.repeater === true, JSON.stringify(entry));
    ok(1, 'and bills him at repeater rates', near(entry.bill, expectBill(20, 180, true)), `${entry.bill} against ${expectBill(20, 180, true)}`);
    ok(1, 'and keeps four seasons of history', (t.taxHistory ?? []).length === 4 && t.taxHistory[3].season === 2030, JSON.stringify((t.taxHistory ?? []).map(e => e.season)));
    ok(1, 'and holds the bill back as taxDue', t.taxDue === entry.bill, String(t.taxDue));
    const again = nba.nbaAssessTax(lg).find(e => e.team === abbr);
    ok(1, 'a second assessment of the same season changes nothing', again.bill === entry.bill && t.taxHistory.length === 4);
  }
  console.log(`   ${rows} table rows at two caps, ${HAND.length} hand worked bills, twenty rates, six repeater cases, one assessed club`);
}

/* ---- 2. over pays, under does not ----------------------------------------- */
console.log('2) A dollar over pays, a dollar under does not, more pays more, a repeater pays most');
{
  const cap = CAP_2026;
  const line = nba.nbaTaxLine(cap);
  const lg = nba.initNbaLeague(lcg(2));
  const t = lg.teams[Object.keys(lg.teams)[3]];
  t.players.forEach(p => { p.salary = 0; });
  const at = payroll => { t.players[0].salary = round1(payroll); return nba.nbaTaxView(t, { cap, season: 2026, taxScale: 1 }); };
  const under = at(line - 0.1);
  const over = at(line + 0.1);
  ok(2, 'a club 0.1M under the line projects no bill', under.bill === 0 && under.over < 0, JSON.stringify(under));
  ok(2, 'the same club 0.1M over the line projects a bill', over.bill > 0 && over.over > 0, JSON.stringify(over));
  ok(2, 'and pays more than the club under it', over.bill > under.bill);
  ok(2, 'a club exactly on the line pays nothing', at(line).bill === 0);
  for (const rep of [false, true]) {
    let prev = 0;
    for (const o of [5, 11, 17, 23, 29, 35, 60]) {
      const b = nba.nbaTaxBill(line + o, cap, rep);
      ok(2, `${rep ? 'repeater' : 'standard'} ${o}M over pays more than ${o - 6}M over`, b > prev, `${b} vs ${prev}`);
      prev = b;
    }
  }
  for (const o of [0.1, 7, 20, 45]) {
    ok(2, `a repeater pays more than a first time payer ${o}M over`, nba.nbaTaxBill(line + o, cap, true) > nba.nbaTaxBill(line + o, cap, false),
      `${nba.nbaTaxBill(line + o, cap, true)} vs ${nba.nbaTaxBill(line + o, cap, false)}`);
  }
  /* the holdback: a bill assessed last season is missing from this season's room */
  const fresh = nba.initNbaLeague(lcg(3));
  const f = fresh.teams[Object.keys(fresh.teams)[5]];
  const roomBefore = nba.nbaCapRoom(f, fresh.cap);
  f.taxDue = 12.5;
  ok(2, 'last season\'s bill is held back from this season\'s room', near(nba.nbaCapRoom(f, fresh.cap), roomBefore - 12.5, 0.001), `${roomBefore} -> ${nba.nbaCapRoom(f, fresh.cap)}`);
  /* Review fix: the projection the cap panel, the hub and the Tax chip show
     all season is the bill the close will charge, repeater rates included.
     Nothing read nbaTaxView on a repeater before, so it could quote a
     repeater the standard bill all season and charge him triple at close. */
  {
    const plg = nba.initNbaLeague(lcg(5));
    const p = plg.teams[Object.keys(plg.teams)[9]];
    plg.season = 2030;
    p.taxHistory = [2027, 2028, 2029].map(s => ({ season: s, payroll: 1, line: 0, bill: 1, repeater: false }));
    p.players.forEach(x => { x.salary = 0; });
    /* at the league's own scale, the one the cap panel draws */
    p.players[0].salary = round1(nba.nbaTaxLine(plg.cap, plg.taxScale) + 20);
    const v = nba.nbaTaxView(p, plg);
    const charged = nba.nbaAssessTax(plg).find(e => e.team === p.abbr);
    const want = expectBill(20, plg.cap, true, plg.taxScale);
    ok(2, 'the projection reads a repeater as a repeater', v.repeater === true, JSON.stringify(v));
    ok(2, 'and quotes the repeater bill, not the standard one', near(v.bill, want), `${v.bill} against ${want}`);
    ok(2, 'and the close charges exactly what was projected', charged && charged.bill === v.bill, `${charged && charged.bill} vs ${v.bill}`);
  }
  /* Review fix: the first apron's matching rule. A club whose payroll after
     the deal sits above the first apron takes back no more than it sends out;
     the same deal is fine for a club under it. Nothing checked this before,
     so the rule could be deleted with every harness green. */
  {
    const alg = nba.initNbaLeague(lcg(6));
    const [aAbbr, bAbbr] = Object.keys(alg.teams).slice(10, 12);
    const A = alg.teams[aAbbr], B = alg.teams[bAbbr];
    A.players.forEach(x => { x.salary = 0; });
    B.players.forEach(x => { x.salary = 1; });
    const out = A.players[1], inc = B.players[1];
    out.salary = 10;
    const sc = alg.taxScale;
    const apron = nba.nbaFirstApron(alg.cap, sc);
    const setPayroll = total => { A.players[0].salary = round1(total - 10); };
    setPayroll(apron + 5);
    inc.salary = 12;
    ok(2, 'above the first apron after the deal: 12 back for 10 out is refused', nba.nbaSalaryFits(A, out, inc, alg.cap, sc) === false, `payroll ${nba.nbaCapUsed(A)}, apron ${apron}`);
    ok(2, 'and the trade path refuses it as invalid', nba.nbaTrade(clone(A), clone(B), out.id, inc.id, false, alg.cap, sc) === 'invalid');
    inc.salary = 10;
    ok(2, 'above the first apron: 10 back for 10 out is allowed', nba.nbaSalaryFits(A, out, inc, alg.cap, sc) === true);
    inc.salary = 12;
    setPayroll(alg.cap - 30);
    ok(2, 'under the cap the same 12 for 10 is allowed', nba.nbaSalaryFits(A, out, inc, alg.cap, sc) === true, `payroll ${nba.nbaCapUsed(A)}`);
    ok(2, 'and the trade path does not call it invalid', nba.nbaTrade(clone(A), clone(B), out.id, inc.id, false, alg.cap, sc) !== 'invalid');
  }
  /* the owner's reaction */
  const r0 = real.owner.ownerTaxReaction(0), r1 = real.owner.ownerTaxReaction(32.5), r2 = real.owner.ownerTaxReaction(400);
  ok(2, 'no bill, no reaction', r0.trustDelta === 0 && r0.line === null, JSON.stringify(r0));
  ok(2, 'a 32.5M bill costs five points of trust', r1.trustDelta === -5 && typeof r1.line === 'string' && !r1.line.includes('"'), JSON.stringify(r1));
  ok(2, 'a 400M bill costs the capped twenty', r2.trustDelta === -20, JSON.stringify(r2));
  console.log(`   line ${line}, under ${under.bill}, over ${over.bill}, monotonic on both schedules, repeater above standard at four overages`);
}

/* ---- the board's loop, one season, used by sections 3 and 5 --------------- */
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SEASONS = 5;
/* Everything the board does between the morning of round one and the next
   morning of round one, with the GM drafting two and waiving down when he
   has to. `log` collects what the sections measure. */
function playSeason(E, lg, me, rng, log) {
  const before = lg.teams[me].players.length;
  const refusal = E.nbaTipOffRefusal(lg.teams[me]);
  log.userBefore.push(before);
  log.refusals.push({ before, refusal });
  if (refusal) {
    /* nbaTipOff must refuse him and leave him alone */
    const probe = clone(lg);
    const tp = E.nbaTipOff(probe, lcg(99), me);
    log.probes.push({ refused: tp.refused.includes(me), untouched: probe.teams[me].players.length === before, filledAnyway: !!tp.filled[me] });
    /* the shared cuts flow: waive the lowest rated until fifteen */
    const deadBefore = (lg.teams[me].deadCap ?? []).length;
    while (lg.teams[me].players.length > CEILING) {
      const worst = [...lg.teams[me].players].sort((a, b) => a.ovr - b.ovr)[0];
      if (!E.nbaRelease(lg.teams[me], lg.freeAgents, worst.id)) break;
    }
    log.waivers.push({ down: lg.teams[me].players.length, deadGrew: (lg.teams[me].deadCap ?? []).length > deadBefore });
  }
  const poolBefore = lg.freeAgents.length;
  const poolIds = new Set(lg.freeAgents.map(p => p.id));
  const tip = E.nbaTipOff(lg, rng, me);
  log.tipRefused.push(tip.refused.length);
  const mine = tip.filled[me] ?? [];
  /* The pool is the GM's market: a man who left it at tip off went to the GM
     and to nobody else. A leak is counted only where it could have happened,
     a CPU club filled while the pool still held a man it could take. */
  const mineIds = new Set(mine.map(p => p.id));
  const cpuFilled = Object.keys(tip.filled).filter(a => a !== me);
  log.poolLeaks.push([...poolIds].filter(id => !lg.freeAgents.some(p => p.id === id) && !mineIds.has(id)).length);
  if (cpuFilled.length && poolBefore > mine.length) log.poolChances += 1;
  if (lg.teams[me].players.length - mine.length < FLOOR) {
    log.fills.push({
      short: FLOOR - (lg.teams[me].players.length - mine.length), got: mine.length,
      /* Round 824: the minimum of the season being tipped off, which rises with the cap */
      allMinimum: mine.every(p => p.salary === E.nbaMinContract(lg.cap) && p.years === 1),
      fromPool: poolBefore - lg.freeAgents.length,
    });
  }
  /* the league's own line; a league saved before the round has none in the
     season it was saved in, and is measured against the real one there */
  const line = E.nbaTaxLine(lg.cap, lg.taxScale ?? 1);
  const tipRatios = {};
  const tipBills = [];
  for (const t of Object.values(lg.teams)) {
    log.rosters.push(t.players.length);
    tipRatios[t.abbr] = E.nbaCapUsed(t) / line;
    tipBills.push(E.nbaTaxView(t, lg).bill);
  }
  log.tipRatios.push(tipRatios);
  /* section 7: what the season tips off with, projected, every club */
  log.tipOver.push(Object.values(tipRatios).filter(r => r > 1).length);
  log.tipBills.push(tipBills);
  for (let r = 1; r < E.NBA_ROUNDS; r += 1) { E.simRound(lg, me, rng); lg.round += 1; }
  E.simRound(lg, me, rng);
  E.runNbaPlayoffs(lg, rng);
  lg.champions.push({ season: lg.season, team: 'X' });
  const assessed = E.nbaAssessTax(lg);
  const close = {};
  for (const a of assessed) close[a.team] = { over: a.payroll > a.line, ratio: a.payroll / a.line, bill: a.bill, repeater: a.repeater };
  log.closes.push(close);
  /* the draft: the GM takes the best left twice, the CPU takes the next five each time, the way the board does */
  let remaining = E.nbaDraftClass(rng, 24, new Set());
  /* Round 824: rookie deals priced in next season's money, as the board signs them */
  const signing = E.nbaDraftSigning(lg);
  for (let k = 0; k < 2; k += 1) {
    lg.teams[me].players.push(E.nbaProspectToPlayer(remaining[0], rng, signing));
    remaining = remaining.slice(1);
    const aiTakes = remaining.slice(0, 5);
    const order = E.nbaStandings(lg).map(t => t.abbr).reverse().filter(a => a !== me);
    aiTakes.forEach((p, i) => lg.teams[order[i % order.length]].players.push(E.nbaProspectToPlayer(p, rng, signing)));
    remaining = remaining.filter(p => !aiTakes.includes(p));
  }
  E.nbaOffseason(lg, rng, me);
  for (const t of Object.values(lg.teams)) if (t.abbr !== me) log.cpuAfterSummer.push(t.players.length);
}
const freshLog = () => ({ userBefore: [], refusals: [], probes: [], waivers: [], tipRefused: [], fills: [], rosters: [], tipRatios: [], closes: [], cpuAfterSummer: [], poolLeaks: [], poolChances: 0, tipOver: [], tipBills: [] });
/* `scale` pins the league's tax scale. The twin passes the real league's: its
   rates are zero, so its own calibration would see no bill to cap and set a
   lower line, and every ratio in section 5 would then differ by the gap
   between two lines rather than by what the tax made the clubs do. */
const runLeague = (E, seed, scale) => {
  const rng = lcg(seed * 7919 + 17);
  const lg = E.initNbaLeague(rng);
  if (scale != null) lg.taxScale = scale;
  const me = Object.keys(lg.teams)[seed % 30];
  const log = freshLog();
  for (let s = 0; s < SEASONS; s += 1) playSeason(E, lg, me, rng, log);
  return { lg, me, log };
};

/* ---- 3. the roster at tip off --------------------------------------------- */
console.log('3) Fourteen to fifteen men at every tip off, ten franchises, five seasons each');
const realRuns = SEEDS.map(seed => ({ seed, ...runLeague(nba, seed) }));
{
  let overPath = 0, tipOffs = 0, fills = 0, poolChances = 0;
  for (const { seed, log } of realRuns) {
    tipOffs += log.rosters.length;
    const below = log.rosters.filter(n => n < FLOOR).length;
    const above = log.rosters.filter(n => n > CEILING).length;
    ok(3, `seed ${seed}: no roster under ${FLOOR} at any tip off`, below === 0, `${below} of ${log.rosters.length} rosters short (smallest ${Math.min(...log.rosters)})`);
    ok(3, `seed ${seed}: no roster over ${CEILING} at any tip off`, above === 0, `${above} of ${log.rosters.length} rosters long (largest ${Math.max(...log.rosters)})`);
    ok(3, `seed ${seed}: nobody left refused once the GM had waived down`, log.tipRefused.every(n => n === 0), log.tipRefused.join(','));
    ok(3, `seed ${seed}: the refusal fires exactly when the GM is above ${CEILING}`,
      log.refusals.every(r => (r.before > CEILING) === (typeof r.refusal === 'string' && r.refusal.length > 0)),
      log.refusals.map(r => `${r.before}:${r.refusal ? 'refused' : 'ok'}`).join(' '));
    for (const p of log.probes) {
      overPath += 1;
      ok(3, `seed ${seed}: tip off names the long roster refused, leaves it alone and fills it with nobody`, p.refused && p.untouched && !p.filledAnyway, JSON.stringify(p));
    }
    for (const w of log.waivers) {
      ok(3, `seed ${seed}: the shared cuts flow brought the GM to ${CEILING} and charged dead money`, w.down === CEILING && w.deadGrew, JSON.stringify(w));
    }
    for (const f of log.fills) {
      fills += 1;
      ok(3, `seed ${seed}: a GM ${f.short} short was handed exactly that many on one year minimum deals`, f.got === f.short && f.allMinimum, JSON.stringify(f));
    }
    ok(3, `seed ${seed}: the CPU clubs leave the summer at ${CEILING} or fewer`, log.cpuAfterSummer.every(n => n <= CEILING), `largest ${Math.max(...log.cpuAfterSummer)}`);
    /* Review fix: the first tip off of every new league used to hand the whole
       ten man pool to the first three clubs in table order on the minimum. */
    ok(3, `seed ${seed}: no CPU club filled its tip off gap out of the free agent pool`, log.poolLeaks.every(n => n === 0), `pool men lost to CPU clubs by season: ${log.poolLeaks.join(',')}`);
    poolChances += log.poolChances;
  }
  ok(3, 'the long roster path was exercised at least once across the seeds', overPath > 0, 'the GM never went above the ceiling, so the refusal was never tested');
  ok(3, 'the short roster fill was exercised at least once across the seeds', fills > 0, 'the GM was never short, so the fill was never tested');
  ok(3, 'a CPU club was filled at tip off while the pool still had men, at least once', poolChances > 0, 'the pool check never had anything to catch');
  console.log(`   ${tipOffs} tip offs, ${overPath} long roster refusals waived down, ${fills} short roster fills, ${poolChances} tip offs where a CPU club could have raided the pool`);
}

/* ---- 4. an old save ------------------------------------------------------- */
console.log('4) A save from before this round plays its season untaxed, is calibrated in the summer, then closes taxed');
/* What section 7 reads about the old save once it has been calibrated. */
let oldSaveAfterSummer = null;
{
  const rng = lcg(631);
  const lg = clone(nba.initNbaLeague(rng));
  for (const t of Object.values(lg.teams)) { delete t.deadCap; delete t.releasedThisSeason; delete t.taxHistory; delete t.taxDue; }
  delete lg.taxScale;
  const me = Object.keys(lg.teams)[7];
  let threw = null;
  try {
    const view = nba.nbaTaxView(lg.teams[me], lg);
    ok(4, 'the view reads a club with no tax fields and projects nothing this season', view.pending === true && view.bill === 0 && view.repeater === false && view.due === 0, JSON.stringify(view));
    ok(4, 'the room reads a club with no tax fields', Number.isFinite(nba.nbaCapRoom(lg.teams[me], lg.cap)));
    const pendingLines = hub.foCapLines({ tax: view });
    ok(4, 'the cap panel says there is no tax this season and quotes no line', pendingLines.length === 1 && /No luxury tax this season/.test(pendingLines[0].text) && !/\$/.test(pendingLines[0].text), JSON.stringify(pendingLines));
    /* no apron in a season that started without one: the pre round matching rule decides */
    const [aAbbr, bAbbr] = Object.keys(lg.teams).filter(a => a !== me).slice(0, 2);
    const A = clone(lg.teams[aAbbr]), B = clone(lg.teams[bAbbr]);
    A.players.forEach(x => { x.salary = 0; }); A.players[0].salary = 400; A.players[1].salary = 10; B.players[1].salary = 12;
    ok(4, 'and no apron rule binds a trade', nba.nbaSalaryFits(A, A.players[1], B.players[1], lg.cap, lg.taxScale) === true);
    const log = freshLog();
    playSeason(nba, lg, me, rng, log);
    const first = log.closes[0];
    ok(4, 'the season the save was made in closes with no bill: nobody is assessed', Object.keys(first).length === 0, `${Object.keys(first).length} clubs assessed`);
    ok(4, 'and no club carries a history or a held back bill into the summer', Object.values(lg.teams).every(t => t.taxHistory === undefined && t.taxDue === undefined));
    ok(4, 'the summer rolled the season on', lg.season === 2027 && lg.round === 1);
    ok(4, 'and set the league\'s tax scale', typeof lg.taxScale === 'number' && Number.isFinite(lg.taxScale) && lg.taxScale > 0, String(lg.taxScale));
    oldSaveAfterSummer = clone(lg);
    playSeason(nba, lg, me, rng, log);
    ok(4, 'a second season closes taxed: every club assessed once', Object.keys(log.closes[1]).length === 30 && Object.values(lg.teams).every(t => (t.taxHistory ?? []).length === 1));
    ok(4, 'every roster was legal at both tip offs', log.rosters.every(n => n >= FLOOR && n <= CEILING));
  } catch (e) { threw = e; }
  ok(4, 'nothing threw on the old shape', !threw, threw ? String(threw.message).slice(0, 160) : '');
  if (CONTROL) {
    console.log('   vitest skipped under this control: it reads src, which the control never touches');
  } else {
    const vitest = findUp(path.join('node_modules', 'vitest', 'vitest.mjs'));
    const TEST = 'src/components/front-office-shared/FrontOfficeSeasonClose.test.tsx';
    ok(4, 'vitest can be found by walking up from the repo root', !!vitest);
    if (vitest) {
      const r = spawnSync(process.execPath, [vitest, 'run', TEST, '--reporter=verbose'],
        { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
      const out = (r.stdout || '') + (r.stderr || '');
      const summary = out.match(/Tests\s+(.+)/);
      const line = summary ? summary[1].trim() : 'no summary line';
      console.log(`   vitest exit ${r.status}, ${line}`);
      ok(4, 'the shared season close test exits zero on all four boards', r.status === 0, out.split('\n').filter(l => /×|FAIL|AssertionError|Unable to find/.test(l)).slice(0, 8).join(' | '));
      for (const sport of ['NFL', 'NBA', 'MLB', 'NHL']) {
        ok(4, `vitest reported the ${sport} board`, out.includes(`${sport} Front Office: the season closes once`), 'that describe block is missing from the output');
      }
      ok(4, 'the summary counts passes and no failures', !!summary && /\d+ passed/.test(line) && !/failed/.test(line), line);
    }
  }
}

/* ---- 5. the tax binds ----------------------------------------------------- */
console.log('5) The tax binds: clubs over the line against the same clubs in a league with no tax');
/* Section 7 reads the twin leagues too, to tell a club that shed from one the cap rise carried under. */
let twinRunsForSeven = [];
{
  const twinRuns = SEEDS.map((seed, i) => runLeague(twin.nba, seed, realRuns[i].lg.taxScale));
  twinRunsForSeven = twinRuns;
  const perSeed = [];
  const diffs = [];
  let confReal = [], confTwin = [];
  for (let i = 0; i < SEEDS.length; i += 1) {
    const R = realRuns[i].log, T = twinRuns[i].log, me = realRuns[i].me;
    const seedDiffs = [];
    for (let s = 0; s + 1 < SEASONS; s += 1) {
      const dP = [], dN = [], tP = [], tN = [];
      for (const abbr of Object.keys(R.closes[s])) {
        if (abbr === me) continue;
        const c = R.closes[s][abbr];
        const d = R.tipRatios[s + 1][abbr] - c.ratio;
        if (c.over) { seedDiffs.push(R.tipRatios[s + 1][abbr] - T.tipRatios[s + 1][abbr]); dP.push(d); } else dN.push(d);
        const ct = T.closes[s][abbr];
        const dt = T.tipRatios[s + 1][abbr] - ct.ratio;
        if (ct.over) tP.push(dt); else tN.push(dt);
      }
      const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
      if (dP.length && dN.length) confReal.push(mean(dP) - mean(dN));
      if (tP.length && tN.length) confTwin.push(mean(tP) - mean(tN));
    }
    const m = seedDiffs.length ? seedDiffs.reduce((x, y) => x + y, 0) / seedDiffs.length : NaN;
    perSeed.push({ seed: SEEDS[i], n: seedDiffs.length, mean: m });
    diffs.push(...seedDiffs);
    ok(5, `seed ${SEEDS[i]}: at least one CPU club was over the line at a close`, seedDiffs.length > 0, 'no payers, nothing to measure');
  }
  const pooled = diffs.length ? diffs.reduce((x, y) => x + y, 0) / diffs.length : NaN;
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
  console.log(`   per seed mean difference (real minus twin, ratio of payroll to line at the next tip off): ${perSeed.map(p => `${p.seed}:${p.mean.toFixed(3)}(${p.n})`).join(' ')}`);
  console.log(`   pooled ${pooled.toFixed(4)} over ${diffs.length} club seasons; the confounded payer gap reads ${mean(confReal).toFixed(3)} real and ${mean(confTwin).toFixed(3)} twin, which is why it is not the check`);
  ok(5, 'payers tip off lighter than their twins in a league with no tax: pooled mean difference under -0.0025', Number.isFinite(pooled) && pooled < -0.0025, `pooled ${pooled.toFixed(4)}`);
  const negative = perSeed.filter(p => p.mean < 0).length;
  ok(5, 'the difference is negative on at least six of the ten seeds', negative >= 6, `${negative} of ${perSeed.length}`);
  /* and the CPU behaviour behind it is visible: payers that paid in season one are fewer by season three */
  const payersBySeason = realRuns.map(r => r.log.closes.map(c => Object.values(c).filter(x => x.over).length));
  const twinPayers = twinRuns.map(r => r.log.closes.map(c => Object.values(c).filter(x => x.over).length));
  const late = s => s.slice(2).reduce((x, y) => x + y, 0);
  const realLate = payersBySeason.reduce((x, s) => x + late(s), 0), twinLate = twinPayers.reduce((x, s) => x + late(s), 0);
  console.log(`   clubs over the line by season, real: ${payersBySeason.map(s => s.join('/')).join(' ')}`);
  console.log(`   clubs over the line by season, twin: ${twinPayers.map(s => s.join('/')).join(' ')}`);
  /* Printed, no longer asserted: on the calibrated league only 0 to 13 club
     seasons sit over the line from season three on, and the gap measured
     between 1 and 5 over six seed sets, too thin to carry a margin. The paired
     read above is the check. */
  console.log(`   club seasons over the line from season three on: ${realLate} with the tax, ${twinLate} without it (printed, not asserted)`);
}

/* ---- 6. the shared descriptor --------------------------------------------- */
console.log('6) The shared hub and cap panel say so, and say nothing new without the descriptor');
{
  const man = (name, ovr, salary = 5, out = 0) => ({ id: name, name, pos: 'G', age: 27, ovr, salary, out });
  const base = over => ({
    roster: Array.from({ length: 14 }, (_, i) => man(`Man ${i + 1}`, 70 + i, 4 + i)),
    freeAgents: [man('Spare Part', 68, 2)],
    capRoom: -30, wins: 5, losses: 3, period: 3, periods: 20, playWord: 'Play', periodWord: 'round',
    hasFixtures: false, nextOpponent: null, lastResult: null, place: 4, cut: 10, tableName: 'East', tradeLine: null, titles: 0,
    rosterMax: 15, ...over,
  });
  const byKey = (tiles, k) => tiles.find(t => t.key === k);
  const plain = hub.foHubTiles(base());
  const taxed = hub.foHubTiles(base({ tax: { bill: 32.5, over: 19.6 } }));
  ok(6, 'a bill shows on the Trades box', byKey(taxed, 'trade').value.startsWith('Tax bill') && byKey(taxed, 'trade').sub.includes('over the tax line') && byKey(taxed, 'trade').accent === true, JSON.stringify(byKey(taxed, 'trade')));
  const zeroBill = hub.foHubTiles(base({ tax: { bill: 0, over: -4 } }));
  ok(6, 'no bill, no change to any box', JSON.stringify(zeroBill) === JSON.stringify(plain));
  const noDesc = hub.foHubTiles(base({ rosterFloor: 14 }));
  ok(6, 'a legal roster with a floor declared draws the same boxes as before', JSON.stringify(noDesc) === JSON.stringify(plain));
  const short = hub.foHubTiles(base({ rosterFloor: 14, roster: Array.from({ length: 12 }, (_, i) => man(`Man ${i + 1}`, 70 + i)) }));
  ok(6, 'two short of the floor: the Roster box says so and pulses', byKey(short, 'team').sub.includes('2 short of the 14 man floor') && byKey(short, 'team').accent === true, JSON.stringify(byKey(short, 'team')));
  const long = hub.foHubTiles(base({ rosterFloor: 14, roster: Array.from({ length: 16 }, (_, i) => man(`Man ${i + 1}`, 70 + i)) }));
  ok(6, 'one over the limit: the Roster box says so and pulses', byKey(long, 'team').sub.includes('1 over the 15 man limit') && byKey(long, 'team').accent === true, JSON.stringify(byKey(long, 'team')));
  /* Review fix: the NHL and MLB boards pass rosterMax for their sign path and
     can draft above it, but have no tip off. A ceiling with no floor declared
     must draw the Roster box exactly as a board with neither does. */
  const sixteen = Array.from({ length: 16 }, (_, i) => man(`Man ${i + 1}`, 70 + i));
  const ceilingOnly = hub.foHubTiles(base({ roster: sixteen }));
  const neither = hub.foHubTiles(base({ roster: sixteen, rosterMax: undefined }));
  ok(6, 'a sport with a ceiling and no tip off floor draws the old Roster box when long', JSON.stringify(byKey(ceilingOnly, 'team')) === JSON.stringify(byKey(neither, 'team')) && !/tip off/i.test(byKey(ceilingOnly, 'team').sub),
    JSON.stringify(byKey(ceilingOnly, 'team')));
  for (const tiles of [taxed, zeroBill, short, long]) {
    for (const t of tiles) ok(6, `${t.key}: no hole in the words`, !/undefined|NaN|null/.test(t.value + t.sub) && t.value.trim() && t.sub.trim(), `"${t.value}" / "${t.sub}"`);
  }
  const taxFacts = { line: 200.4, bill: 32.5, over: 19.6, repeater: true, due: 12.5, firstApron: 209, secondApron: 221.7, aboveFirst: true, aboveSecond: false };
  const lines = hub.foCapLines({ tax: taxFacts, roster: { count: 12, floor: 14, max: 15, minContract: 2 } });
  const text = lines.map(l => l.text).join(' | ');
  ok(6, 'the cap lines name the line and both aprons', text.includes('$200.4M') && text.includes('$209M') && text.includes('$221.7M'), text);
  ok(6, 'the cap lines carry the projected bill at repeater rates', text.includes('Projected tax $32.5M') && text.includes('repeater rates'), text);
  ok(6, 'the cap lines carry the holdback', text.includes("$12.5M tax bill is held back"), text);
  ok(6, 'the cap lines carry the first apron rule', text.includes('Over the first apron') && !text.includes('second apron:'), text);
  ok(6, 'the cap lines carry the roster count and the short fill', text.includes('12 of 15 roster spots') && text.includes('2 short') && text.includes('$2M each'), text);
  ok(6, 'a bad line is red, a good one is not', lines.some(l => l.tone === 'bad') && lines.filter(l => l.tone === 'good').length === 0);
  const under = hub.foCapLines({ tax: { ...taxFacts, bill: 0, over: -3.2, repeater: false, due: 0, aboveFirst: false }, roster: { count: 15, floor: 14, max: 15, minContract: 2 } });
  ok(6, 'under the line reads as good and the legal roster adds no warning', under.some(l => l.tone === 'good' && l.text.includes('Under the tax line by $3.2M')) && !under.some(l => l.tone === 'bad'), JSON.stringify(under));
  ok(6, 'no descriptor, no lines', hub.foCapLines({}).length === 0);
  console.log(`   ${lines.length} cap lines with a tax and a short roster, ${under.length} under the line and legal, 0 without the descriptor`);
}

/* ---- 7. a league that looks like a real one ------------------------------- */
console.log('7) The league the lines are set from: taxpayers, the biggest bill and the typical one, against real seasons');
{
  const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
  const firstTip = [], topBills = [], medians = [], payerCounts = [];
  for (const { seed, log } of realRuns) {
    const n = log.tipOver[0];
    firstTip.push(n);
    ok(7, `seed ${seed}: ${TAXPAYERS_BAND[0]} to ${TAXPAYERS_BAND[1]} clubs over the line at the first tip off`, n >= TAXPAYERS_BAND[0] && n <= TAXPAYERS_BAND[1], `${n} over`);
    const bills = Object.values(log.closes[0]).map(c => c.bill).filter(b => b > 0);
    payerCounts.push(bills.length);
    const top = bills.length ? Math.max(...bills) : 0;
    topBills.push(top);
    /* a ceiling on the biggest bill is the rule the calibration keeps, not a statistic read off a max */
    ok(7, `seed ${seed}: no season one bill above $${BILL_CEILING}M, the top of the real record`, top <= BILL_CEILING, `largest ${top}`);
    const m = median(bills);
    medians.push(m);
    ok(7, `seed ${seed}: the median season one taxpayer owes $${MEDIAN_BAND[0]}M to $${MEDIAN_BAND[1]}M`, m >= MEDIAN_BAND[0] && m <= MEDIAN_BAND[1], `median ${Number.isFinite(m) ? m.toFixed(1) : m} over ${bills.length} payers`);
  }
  /* A CPU club over the line at a close that tips off under it next season,
     while the same club in the no tax twin is still over: that club shed its
     way under, the cap rise did not carry it. */
  let shedUnder = 0, carried = 0;
  const perSeed = [];
  for (let i = 0; i < realRuns.length; i += 1) {
    const R = realRuns[i].log, T = twinRunsForSeven[i]?.log, me = realRuns[i].me;
    let mine = 0;
    for (let s = 0; s + 1 < SEASONS; s += 1) {
      for (const [abbr, c] of Object.entries(R.closes[s])) {
        if (abbr === me || !c.over || R.tipRatios[s + 1][abbr] > 1) continue;
        if (T && T.tipRatios[s + 1][abbr] > 1) { shedUnder += 1; mine += 1; } else carried += 1;
      }
    }
    perSeed.push(mine);
  }
  ok(7, 'a CPU club that sheds salary gets under the line: at least once over the ten seeds, a payer tips off under while its no tax twin is still over', shedUnder > 0, `${shedUnder} shed under, ${carried} under in both leagues`);
  /* The old save from section 4, calibrated at its first summer, lands in the same place. */
  if (oldSaveAfterSummer) {
    const o = oldSaveAfterSummer;
    const line = nba.nbaTaxLine(o.cap, o.taxScale);
    const proj = Object.values(o.teams).map(t => nba.nbaTipOffPayroll(t, o.cap));
    const over = proj.filter(p => p > line).length;
    const top = Math.max(...proj.map(p => nba.nbaTaxBill(p, o.cap, false, o.taxScale)));
    ok(7, `an old save calibrated at its first summer tips off with ${TAXPAYERS_BAND[0]} to ${TAXPAYERS_BAND[1]} clubs over its line`, over >= TAXPAYERS_BAND[0] && over <= TAXPAYERS_BAND[1], `${over} over a line of ${line}`);
    ok(7, `and nobody there faces a projected bill above $${BILL_CEILING}M`, top <= BILL_CEILING, `largest ${top}`);
    console.log(`   old save after its summer: line ${line} at a cap of ${o.cap}, ${over} clubs over, largest projected bill ${top}`);
  } else {
    ok(7, 'the old save from section 4 reached its summer', false, 'section 4 threw before the summer');
  }
  /* The worked example, the guide and What's New quote the opening league's
     numbers, so they are read against the engine here: a calibration that
     moves the line has to move the copy with it. */
  {
    const fresh = nba.initNbaLeague(lcg(1));
    const sc = fresh.taxScale;
    const L = nba.nbaTaxLine(fresh.cap, sc), W = tax.nbaTaxBracket(fresh.cap, sc), A1 = nba.nbaFirstApron(fresh.cap, sc);
    const b10 = nba.nbaTaxBill(L + 10, fresh.cap, false, sc), r10 = nba.nbaTaxBill(L + 10, fresh.cap, true, sc);
    const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    const opening = WORDS[firstTip[0]] ?? String(firstTip[0]);
    const read = rel => fs.readFileSync(path.join(ROOT, ...rel.split('/')), 'utf8');
    const page = read('src/pages/NbaFrontOffice.tsx'), guide = read('src/data/gameContent/basketball.ts'), news = read('src/pages/WhatsNew.tsx');
    const example = `Open a new league on its $${L}M tax line, close the season $10M over it and pay $${b10}M (the first $${W.toFixed(3)}M at 1.00, the rest at 1.25), or $${r10}M as a repeater`;
    ok(7, 'the worked example quotes the opening league exactly', page.includes(example), example);
    const guideBits = [`opens on a ${L} million line with ${opening} clubs over it`, `(${W.toFixed(1)} million in a new league)`, `first apron (${A1} million in a new league)`];
    ok(7, 'the guide quotes the opening line, the bracket width and the first apron', guideBits.every(b => guide.includes(b)), guideBits.filter(b => !guide.includes(b)).join(' | '));
    const newsBit = `a new league opens on a $${L}M line with ${opening} clubs over it`;
    ok(7, "What's New quotes the opening line", news.includes(newsBit), newsBit);
    console.log(`   opening league: line ${L}, bracket ${W.toFixed(3)}, first apron ${A1}, 10M over pays ${b10} or ${r10} as a repeater`);
  }
  /* the scale is set once at creation and kept, so the finished league still carries it */
  console.log(`   scale at creation by seed: ${realRuns.map(r => Number(r.lg.taxScale).toFixed(4)).join(' ')}; first tip off line ${nba.nbaTaxLine(CAP_2026, realRuns[0].lg.taxScale)}`);
  console.log(`   clubs over the line at the first tip off by seed: ${firstTip.join(' ')}; season one payers ${payerCounts.join(' ')}`);
  console.log(`   largest season one bill by seed: ${topBills.map(b => b.toFixed(1)).join(' ')}; median taxpayer bill by seed: ${medians.map(m => (Number.isFinite(m) ? m.toFixed(1) : String(m))).join(' ')}`);
  console.log(`   CPU payers that shed under the line while their twin stayed over: ${perSeed.join(' ')} (${shedUnder} in all, ${carried} more under in both leagues)`);
}

/* ---- 8. the tax does not fade (Round 824) ---------------------------------- */
console.log('8) Ten seasons: from season three payrolls hold against the line, the league keeps taxpayers, and the pool asks in each season\'s money');
{
  const LONG = 10;
  const base = Number(process.env.NBA_TAX_LONG_SEED_BASE || 0);
  const ratioBySeason = Array.from({ length: LONG }, () => []);
  const cpuOverBySeason = Array.from({ length: LONG }, () => []);
  const allOverBySeason = Array.from({ length: LONG }, () => []);
  /* Free agent asks (the review fix). Neither the harness GM nor a computer
     club signs from the pool, so the numbers above cannot see an ask that
     stayed in opening season money; a player browsing the pool would. After
     every summer each man in the pool must ask his rating's price in the
     money of the season about to start. */
  let asks = 0, askWrong = 0, askRisen = 0;
  const askBad = [];
  for (const s0 of SEEDS) {
    const seed = base + s0;
    const rng = lcg(seed * 7919 + 17);
    const lg = nba.initNbaLeague(rng);
    const me = Object.keys(lg.teams)[seed % 30];
    const log = freshLog();
    for (let s = 0; s < LONG; s += 1) {
      playSeason(nba, lg, me, rng, log);
      for (const fa of lg.freeAgents) {
        asks += 1;
        const want = nba.nbaSalaryFor(fa.ovr, lg.cap);
        if (!near(fa.salary, want)) {
          askWrong += 1;
          if (askBad.length < 4) askBad.push(`seed ${seed} ${lg.season}: ${fa.name} (${fa.ovr}) asks ${fa.salary} against ${want} on a cap of ${lg.cap}`);
        } else if (fa.salary > nba.nbaSalaryFor(fa.ovr) + 0.05) askRisen += 1;
      }
    }
    log.closes.forEach((close, s) => {
      const rows = Object.entries(close);
      ratioBySeason[s].push(rows.reduce((x, [, c]) => x + c.ratio, 0) / rows.length);
      cpuOverBySeason[s].push(rows.filter(([a, c]) => a !== me && c.over).length);
      allOverBySeason[s].push(rows.filter(([, c]) => c.over).length);
    });
  }
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const ratio = ratioBySeason.map(mean);
  const late = a => mean(a.slice(3).flat());
  const cpuLate = late(cpuOverBySeason), allLate = late(allOverBySeason);
  const keep = ratio[LONG - 1] / ratio[2];
  console.log(`   league payroll over the tax line, mean club, by season: ${ratio.map(r => r.toFixed(3)).join(' ')}`);
  console.log(`   season ten against season three: ${keep.toFixed(3)}; clubs over the line by season (mean of ten leagues): ${allOverBySeason.map(a => mean(a).toFixed(1)).join(' ')}`);
  console.log(`   seasons four to ten, clubs over the line a season: ${allLate.toFixed(2)} with the GM, ${cpuLate.toFixed(2)} computer clubs only`);
  console.log(`   free agent asks after a summer: ${asks} read, ${askWrong} off the new season's price, ${askRisen} above the opening season's price for the same rating`);
  ok(8, `from season three payrolls hold their place against the line: the mean club's payroll over the line in season ten is at least ${FADE_BAND.keep} of season three's`, keep >= FADE_BAND.keep, keep.toFixed(3));
  ok(8, `computer clubs keep paying tax: seasons four to ten average at least ${FADE_BAND.cpuLate} clubs over the line a season`, cpuLate >= FADE_BAND.cpuLate, cpuLate.toFixed(2));
  ok(8, `and the league as a whole at least ${FADE_BAND.allLate} a season`, allLate >= FADE_BAND.allLate, allLate.toFixed(2));
  ok(8, `after every summer every free agent asks his rating's price in the new season's money (${asks} asks over ${SEEDS.length * LONG} summers)`, asks > 0 && askWrong === 0, `${askWrong} wrong, e.g. ${askBad.join(' | ')}`);
  ok(8, 'and that price has risen: most asks sit above the opening season price for the same rating', asks > 0 && askRisen > asks / 2, `${askRisen} of ${asks}`);
}

/* ---- report --------------------------------------------------------------- */
if (checks === 0) {
  console.error('FAIL: NOTHING WAS CHECKED');
  process.exit(1);
}
for (const [n, s] of [...bySection.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`   ${n}. ${SECTION_NAMES[n]}: ${s.n} check${s.n === 1 ? '' : 's'}${s.bad ? `, ${s.bad} FAILED` : ''}`);
}
if (CONTROL) {
  const red = [...bySection.entries()].filter(([, s]) => s.bad > 0).map(([n]) => n).sort((a, b) => a - b);
  const want = EXPECT[CONTROL];
  for (const f of fails.slice(0, 6)) console.log('   red: ' + f);
  if (red.join(',') === want.join(',')) {
    console.log(`control "${CONTROL}": section${want.length === 1 ? '' : 's'} ${want.join(' and ')} went red as expected (${fails.length} failures) and nothing else moved, the check works. Exiting non zero because the checks did fail.`);
    process.exit(1);
  }
  console.error(`control "${CONTROL}": expected section${want.length === 1 ? '' : 's'} ${want.join(' and ')} red, got ${red.length ? red.join(' and ') : 'nothing'}, so the check is dead somewhere or bleeds`);
  process.exit(3);
}
if (fails.length) {
  console.error(`simNbaLuxuryTax: ${fails.length} of ${checks} checks FAILED`);
  for (const f of fails.slice(0, 24)) console.error('  ' + f);
  process.exit(1);
}
console.log(`simNbaLuxuryTax: ${checks} checks passed over ${SEEDS.length} seeded franchises and ${SEASONS} seasons each. The bill is the published formula, a dollar over pays, every season tips off on fourteen to fifteen men, an old save closes, and clubs that pay tax shed for it.`);
