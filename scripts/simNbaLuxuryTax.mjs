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
        round and Round 631 added (taxHistory, taxDue, deadCap,
        releasedThisSeason) tips off, plays, closes, is assessed and goes
        through the summer, then closes a second season. And the shared
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
        lighter than the same clubs in a league with no tax. The band is a
        pooled mean under -0.0035, a quarter of the lightest set; under the
        zero tax control both bundles are the twin and the difference is
        exactly zero, and with the CPU steer switched off by hand it read
        0.0000 too. A second, blunter read is printed and checked too: from
        season three on, fewer clubs sit over the line with the tax than
        without it (measured 34 against 48 club seasons on seeds 1-10, and
        lower with the tax on all six sets; the GM's own club is in both
        counts).
     6) the shared descriptor. foHubTiles with a tax and a roster floor says
        so on the Trades and Roster boxes and is byte identical without them;
        a sport that declares a roster ceiling but no tip off floor (the NHL
        and MLB boards) draws its long roster's Roster box exactly as before;
        foCapLines writes the tax, apron and roster lines and nothing when
        passed neither.

   Controls, through NBA_TAX_CONTROL. None touches src: the rewritten source
   is served to the bundler from memory, and each refuses to run if its
   anchor is not in the file. Under a control the harness exits 1 when
   exactly the expected sections went red (the control fired), 3 and a loud
   line when they did not (the check is dead), and 2 when the control could
   not even be bundled:
     zerotax      every rate driven to zero              -> 1, 2 and 5
     tipoff12     the tip off floor dropped to twelve     -> 3 and 4 (the old
                  save section reads the fourteen too)
     norepeater   the repeater schedule made the standard one -> 1 and 2
     cpupool      every club fills its tip off gap from the pool  -> 3
     viewrepeater the projection never uses repeater rates        -> 2
     noapron      the first apron never binds on a trade           -> 2
     hubfloor     the hub's tip off line for any declared ceiling  -> 6
   The last four rewrite nbaFrontOffice.ts or foHub.ts (in both bundles, so
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
  zerotax: [1, 2, 5],
  /* the old save section reads the fourteen too, so a lower floor reaches it */
  tipoff12: [3, 4],
  norepeater: [1, 2],
  /* review fixes: each reaches only the one check written for it */
  cpupool: [3],
  viewrepeater: [2],
  noapron: [2],
  hubfloor: [6],
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
/* four bills worked by hand from the numbers above at the 2026-27 cap. The
   brackets end at 6.064, 12.128 and 18.192, so 20M over reaches a fourth one:
   10M over, standard: 6.064 x 1.00 + 3.936 x 1.25 = 10.984 -> 11.0
   10M over, repeater: 6.064 x 3.00 + 3.936 x 3.25 = 30.984 -> 31.0
   20M over, standard: 6.064 + 7.580 + 6.064 x 3.50 + 1.808 x 4.75 = 43.456 -> 43.5
   20M over, repeater: 18.192 + 19.708 + 6.064 x 5.50 + 1.808 x 6.75 = 83.456 -> 83.5
   (The first draft of this table put 20M over in three brackets and both
   formulas disagreed with it, which is the whole point of typing it.) */
const HAND = [[10, false, 11.0], [10, true, 31.0], [20, false, 43.5], [20, true, 83.5]];

const round1 = n => Math.round(n * 10) / 10;
const near = (a, b, eps = 0.051) => Math.abs(a - b) <= eps;
const rateAt = (i, rep) => { const t = rep ? REP : STD; return i < t.length ? t[i] : t[t.length - 1] + STEP * (i - t.length + 1); };
const lineAt = cap => round1(cap * TAX_2026 / CAP_2026);
const expectBill = (over, cap, rep) => {
  if (over <= 0) return 0;
  const width = WIDTH_2026 * cap / CAP_2026;
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
  noapron: { 'nbaFrontOffice.ts': [['  if (after > nbaFirstApron(cap)) return incoming.salary <= outgoing.salary;', '  if (after > Infinity) return incoming.salary <= outgoing.salary;']] },
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
    lg.season = 2030; lg.cap = 180;
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
  const at = payroll => { t.players[0].salary = round1(payroll); return nba.nbaTaxView(t, { cap, season: 2026 }); };
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
    p.players[0].salary = round1(nba.nbaTaxLine(plg.cap) + 20);
    const v = nba.nbaTaxView(p, plg);
    const charged = nba.nbaAssessTax(plg).find(e => e.team === p.abbr);
    ok(2, 'the projection reads a repeater as a repeater', v.repeater === true, JSON.stringify(v));
    ok(2, 'and quotes the repeater bill, not the standard one', near(v.bill, expectBill(20, plg.cap, true)), `${v.bill} against ${expectBill(20, plg.cap, true)}`);
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
    const apron = nba.nbaFirstApron(alg.cap);
    const setPayroll = total => { A.players[0].salary = round1(total - 10); };
    setPayroll(apron + 5);
    inc.salary = 12;
    ok(2, 'above the first apron after the deal: 12 back for 10 out is refused', nba.nbaSalaryFits(A, out, inc, alg.cap) === false, `payroll ${nba.nbaCapUsed(A)}, apron ${apron}`);
    ok(2, 'and the trade path refuses it as invalid', nba.nbaTrade(clone(A), clone(B), out.id, inc.id, false, alg.cap) === 'invalid');
    inc.salary = 10;
    ok(2, 'above the first apron: 10 back for 10 out is allowed', nba.nbaSalaryFits(A, out, inc, alg.cap) === true);
    inc.salary = 12;
    setPayroll(alg.cap - 30);
    ok(2, 'under the cap the same 12 for 10 is allowed', nba.nbaSalaryFits(A, out, inc, alg.cap) === true, `payroll ${nba.nbaCapUsed(A)}`);
    ok(2, 'and the trade path does not call it invalid', nba.nbaTrade(clone(A), clone(B), out.id, inc.id, false, alg.cap) !== 'invalid');
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
      allMinimum: mine.every(p => p.salary === E.NBA_MIN_CONTRACT && p.years === 1),
      fromPool: poolBefore - lg.freeAgents.length,
    });
  }
  const line = E.nbaTaxLine(lg.cap);
  const tipRatios = {};
  for (const t of Object.values(lg.teams)) {
    log.rosters.push(t.players.length);
    tipRatios[t.abbr] = E.nbaCapUsed(t) / line;
  }
  log.tipRatios.push(tipRatios);
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
  for (let k = 0; k < 2; k += 1) {
    lg.teams[me].players.push(E.nbaProspectToPlayer(remaining[0], rng));
    remaining = remaining.slice(1);
    const aiTakes = remaining.slice(0, 5);
    const order = E.nbaStandings(lg).map(t => t.abbr).reverse().filter(a => a !== me);
    aiTakes.forEach((p, i) => lg.teams[order[i % order.length]].players.push(E.nbaProspectToPlayer(p, rng)));
    remaining = remaining.filter(p => !aiTakes.includes(p));
  }
  E.nbaOffseason(lg, rng, me);
  for (const t of Object.values(lg.teams)) if (t.abbr !== me) log.cpuAfterSummer.push(t.players.length);
}
const freshLog = () => ({ userBefore: [], refusals: [], probes: [], waivers: [], tipRefused: [], fills: [], rosters: [], tipRatios: [], closes: [], cpuAfterSummer: [], poolLeaks: [], poolChances: 0 });
const runLeague = (E, seed) => {
  const rng = lcg(seed * 7919 + 17);
  const lg = E.initNbaLeague(rng);
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
console.log('4) A save from before this round tips off, closes, is assessed and goes through the summer');
{
  const rng = lcg(631);
  const lg = clone(nba.initNbaLeague(rng));
  for (const t of Object.values(lg.teams)) { delete t.deadCap; delete t.releasedThisSeason; delete t.taxHistory; delete t.taxDue; }
  const me = Object.keys(lg.teams)[7];
  let threw = null;
  try {
    const view = nba.nbaTaxView(lg.teams[me], lg);
    ok(4, 'the view reads a club with no tax fields', Number.isFinite(view.bill) && view.repeater === false && view.due === 0, JSON.stringify(view));
    ok(4, 'the room reads a club with no tax fields', Number.isFinite(nba.nbaCapRoom(lg.teams[me], lg.cap)));
    const log = freshLog();
    playSeason(nba, lg, me, rng, log);
    const first = log.closes[0];
    ok(4, 'every club was assessed', Object.keys(first).length === 30 && Object.values(first).every(c => Number.isFinite(c.bill) && c.repeater === false));
    ok(4, 'every club now carries one season of history and a taxDue', Object.values(lg.teams).every(t => (t.taxHistory ?? []).length === 1 && typeof t.taxDue === 'number'));
    ok(4, 'the summer rolled the season on', lg.season === 2027 && lg.round === 1);
    playSeason(nba, lg, me, rng, log);
    ok(4, 'a second season closes and the history is two deep', Object.values(lg.teams).every(t => (t.taxHistory ?? []).length === 2));
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
{
  const twinRuns = SEEDS.map(seed => runLeague(twin.nba, seed));
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
  ok(5, 'payers tip off lighter than their twins in a league with no tax: pooled mean difference under -0.0035', Number.isFinite(pooled) && pooled < -0.0035, `pooled ${pooled.toFixed(4)}`);
  const negative = perSeed.filter(p => p.mean < 0).length;
  ok(5, 'the difference is negative on at least eight of the ten seeds', negative >= 8, `${negative} of ${perSeed.length}`);
  /* and the CPU behaviour behind it is visible: payers that paid in season one are fewer by season three */
  const payersBySeason = realRuns.map(r => r.log.closes.map(c => Object.values(c).filter(x => x.over).length));
  const twinPayers = twinRuns.map(r => r.log.closes.map(c => Object.values(c).filter(x => x.over).length));
  const late = s => s.slice(2).reduce((x, y) => x + y, 0);
  const realLate = payersBySeason.reduce((x, s) => x + late(s), 0), twinLate = twinPayers.reduce((x, s) => x + late(s), 0);
  console.log(`   clubs over the line by season, real: ${payersBySeason.map(s => s.join('/')).join(' ')}`);
  console.log(`   clubs over the line by season, twin: ${twinPayers.map(s => s.join('/')).join(' ')}`);
  console.log(`   club seasons over the line from season three on: ${realLate} with the tax, ${twinLate} without it`);
  ok(5, 'from season three on, fewer clubs sit over the line with the tax than without it', realLate < twinLate, `${realLate} real vs ${twinLate} twin`);
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
