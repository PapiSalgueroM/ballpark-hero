/**
 * Round 200 harness: the commercial desk, the last line of his Club Manager
 * epic.
 *
 * Round 171 built the finance layer he asked for (gates, ticket policy,
 * ground expansions) and left the commercial side unbuilt, which is the
 * half of a club's money a manager actually negotiates. Round 200 adds
 * sponsors, and this file holds them to the four things that make the
 * choice real rather than decorative:
 *
 *   THE OFFERS ARE DIFFERENT SHAPES, NOT DIFFERENT NUMBERS. The safe deal
 *   pays the most guaranteed money. The performance deal pays less and adds
 *   a title bonus. The long deal pays least and runs four seasons. A player
 *   who wants the most money now, the most money if he wins, or the most
 *   security has three different right answers.
 *
 *   THE MONEY SCALES WITH THE CLUB. A giant is worth multiples of a lower
 *   league side, Europe is worth more than no Europe, and a trophy cabinet
 *   counts. An era world pays era money.
 *
 *   THE DEAL IS THE CLUB'S, NOT THE MANAGER'S. Walk to another club and the
 *   deal stays behind, exactly like the ground the club paid for.
 *
 *   NOTHING IS PAID TWICE OR MISSED. Signing pays year one on the spot.
 *   Every rollover pays the bonus the season actually earned, then the next
 *   year's guaranteed money, then ends the deal when the years run out.
 *
 * And the house rule from Round 199 applies to brands as much as to men:
 * every sponsor is invented, checked against the real companies that
 * actually sponsor clubs.
 *
 * Run: node scripts/simSponsors.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'sponsorEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'sponsor.bundle.mjs');

/* The stub has to be in place BEFORE the module body runs, so the import is
   dynamic and sits after the assignment. The static form hoists and the
   engine's supabase client reaches for localStorage on load. */
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const engine = mod;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const { engine: CM } = await import(pathToFileURL(BUNDLE).href);
const { sponsorOffers, signSponsor, sponsorBonusEarned, startCareer, startNextSeason } = CM;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const career = (club, extra = {}) => ({ ...startCareer(club), ...extra });

/* ---------- 1. Three offers, three genuinely different shapes ---------- */
console.log('1) The table always holds three shapes, not three numbers');
{
  for (const club of ['Manchester City', 'Newcastle', 'Brentford', 'Coventry City']) {
    const c = career(club);
    const offers = sponsorOffers(c);
    if (offers.length !== 3) { fail(`${club}: ${offers.length} offers`); continue; }
    const [safe, perf, long] = offers;
    if (safe.shape !== 'safe' || perf.shape !== 'performance' || long.shape !== 'long') {
      fail(`${club}: shapes are ${offers.map(o => o.shape).join(', ')}`);
    }
    if (!(safe.perSeason > perf.perSeason && perf.perSeason > long.perSeason)) {
      fail(`${club}: guaranteed money is not safe > performance > long (${safe.perSeason}, ${perf.perSeason}, ${long.perSeason})`);
    }
    if (safe.bonus !== 0) fail(`${club}: the safe deal carries a bonus`);
    if (!(perf.bonus > long.bonus && long.bonus > 0)) fail(`${club}: bonus sizes are wrong (${perf.bonus} vs ${long.bonus})`);
    if (long.years <= safe.years) fail(`${club}: the long deal is not longer (${long.years} vs ${safe.years})`);
    if (new Set(offers.map(o => o.brand)).size !== 3) fail(`${club}: two offers came from the same brand`);
    for (const o of offers) {
      if (!(o.perSeason > 0)) fail(`${club}: ${o.shape} pays ${o.perSeason}`);
      if (!o.pitch || o.pitch.length < 20) fail(`${club}: ${o.shape} has no pitch`);
    }
  }
  /* The same club and season always sees the same table: no reroll on reload. */
  const a = sponsorOffers(career('Newcastle'));
  const b = sponsorOffers(career('Newcastle'));
  if (a.map(o => o.brand + o.perSeason).join('|') !== b.map(o => o.brand + o.perSeason).join('|')) {
    fail('the same club drew two different tables, a reload could shop for a better one');
  }
  console.log('   four clubs, three shapes each, deterministic per club and season');
}

/* ---------- 2. Bigger clubs are worth more ---------- */
console.log('2) The money follows the club, not the calendar');
{
  const top = sponsorOffers(career('Manchester City'))[0].perSeason;
  const mid = sponsorOffers(career('Brentford'))[0].perSeason;
  const small = sponsorOffers(career('Coventry City'))[0].perSeason;
  if (!(top > mid && mid >= small)) fail(`stature does not scale: City ${top}, Brentford ${mid}, Coventry ${small}`);
  if (top < mid * 1.4) fail(`a giant is only worth ${(top / mid).toFixed(2)}x a mid table club`);
  /* Europe is worth real money. */
  /* Newcastle may already start in Europe, which would make the control
     and the test identical, so Europe is switched off explicitly first. */
  const plain = { ...career('Newcastle'), uclGroup: null };
  const euro = { ...plain, uclGroup: { group: 'A', table: [], played: 0 } };
  const gain = sponsorOffers(euro)[0].perSeason / sponsorOffers(plain)[0].perSeason;
  if (Math.abs(gain - 1.35) > 0.02) fail(`Europe moved the offer by ${gain.toFixed(2)}x, the design says 1.35`);
  /* And a cabinet does too, up to a cap. */
  const withCups = { ...plain, trophies: Array.from({ length: 3 }, (_, i) => ({ season: 2026 + i, name: 'League' })) };
  if (!(sponsorOffers(withCups)[0].perSeason > sponsorOffers(plain)[0].perSeason)) {
    fail('a trophy cabinet is worth nothing to a sponsor');
  }
  console.log(`   City ${top}m, Brentford ${mid}m, Coventry ${small}m per season, Europe x1.35`);
}

/* ---------- 3. Signing pays once, immediately ---------- */
console.log('3) Signing pays year one on the spot, and only once');
{
  const c = career('Newcastle');
  const offer = sponsorOffers(c)[0];
  const before = c.budget;
  const signed = signSponsor(c, 'safe');
  if (!signed) { fail('the safe offer could not be signed'); }
  else {
    if (Math.abs(signed.budget - (before + offer.perSeason)) > 0.011) {
      fail(`signing paid ${(signed.budget - before).toFixed(2)}, the offer says ${offer.perSeason}`);
    }
    if (signed.sponsor?.brand !== offer.brand) fail('the signed deal is not the offer that was taken');
    if (signed.sponsor?.yearsLeft !== offer.years) fail('the deal did not start with its full term');
    if (Math.abs((signed.sponsor?.paid ?? 0) - offer.perSeason) > 0.011) fail('the paid total did not start at year one');
    /* A club with a deal cannot sign another. */
    if (signSponsor(signed, 'performance') !== null) fail('a club signed two sponsors at once');
    /* An invented offer id does nothing. */
    if (signSponsor(c, 'not-an-offer') !== null) fail('an unknown offer id signed something');
  }
}

/* ---------- 4. The bonus rule ---------- */
console.log('4) The bonus is paid for what the season actually did');
{
  const base = signSponsor(career('Newcastle'), 'performance');
  if (!base) fail('could not sign the performance deal');
  else {
    if (!sponsorBonusEarned(base, 1, 20)) fail('winning the league did not earn the title bonus');
    if (sponsorBonusEarned(base, 2, 20)) fail('second place earned a title bonus');
    const longDeal = signSponsor(career('Newcastle'), 'long');
    if (!longDeal) fail('could not sign the long deal');
    else {
      if (!sponsorBonusEarned(longDeal, 10, 20)) fail('tenth of twenty is not being counted as the top half');
      if (sponsorBonusEarned(longDeal, 11, 20)) fail('eleventh of twenty counted as the top half');
    }
    const safeDeal = signSponsor(career('Newcastle'), 'safe');
    if (safeDeal && sponsorBonusEarned(safeDeal, 1, 20)) fail('the safe deal paid a bonus it does not have');
  }
}

/* ---------- 5. Seasons roll the deal correctly ---------- */
console.log('5) Every rollover pays exactly what it owes');
{
  /* A rollover moves plenty of money that has nothing to do with sponsors
     (the board's own season budget among it), so every figure here is the
     DIFFERENCE between an identical rollover with the deal and without it.
     That isolates the sponsor and nothing else. */
  const withDeal = signSponsor(career('Newcastle'), 'safe');
  const deal = withDeal.sponsor;
  const noDeal = { ...withDeal, sponsor: null };
  const roll = (state, position) => startNextSeason({ ...state, pendingSummary: { ...(state.pendingSummary ?? {}), position } });

  const midWith = roll(withDeal, 12);
  const midWithout = roll(noDeal, 12);
  const secondYear = midWith.budget - midWithout.budget;
  if (!midWith.sponsor) fail('a two season deal ended after one');
  else if (midWith.sponsor.yearsLeft !== deal.yearsLeft - 1) {
    fail(`years left went ${deal.yearsLeft} to ${midWith.sponsor.yearsLeft}`);
  }
  if (Math.abs(secondYear - deal.perSeason) > 0.011) {
    fail(`the second year paid ${secondYear.toFixed(2)}, expected ${deal.perSeason}`);
  }

  /* The final season ends the deal and pays nothing extra beyond it. */
  const endWith = roll(midWith, 12);
  if (endWith.sponsor) fail('the deal outlived its term');
  const endWithout = roll({ ...midWith, sponsor: null }, 12);
  if (Math.abs((endWith.budget - endWithout.budget)) > 0.011) {
    fail(`the season after the last one still paid ${(endWith.budget - endWithout.budget).toFixed(2)}`);
  }

  /* A title in a bonus year pays the bonus on top of the guarantee. */
  const perf = signSponsor(career('Newcastle'), 'performance');
  const wonWith = roll(perf, 1);
  const wonWithout = roll({ ...perf, sponsor: null }, 1);
  const titleYear = wonWith.budget - wonWithout.budget;
  const expected = perf.sponsor.bonus + perf.sponsor.perSeason;
  if (Math.abs(titleYear - expected) > 0.011) {
    fail(`a title season paid ${titleYear.toFixed(2)}, expected bonus ${perf.sponsor.bonus} plus year two ${perf.sponsor.perSeason}`);
  }
  if (Math.abs(wonWith.sponsor.paid - (perf.sponsor.paid + expected)) > 0.011) {
    fail('the running total does not match what was paid');
  }
  /* And missing the title in the same year pays only the guarantee. */
  const missedWith = roll(perf, 4);
  const missedWithout = roll({ ...perf, sponsor: null }, 4);
  const missedYear = missedWith.budget - missedWithout.budget;
  if (Math.abs(missedYear - perf.sponsor.perSeason) > 0.011) {
    fail(`a fourth place season paid ${missedYear.toFixed(2)}, expected only the guarantee ${perf.sponsor.perSeason}`);
  }
  console.log(`   year one on signing, ${deal.perSeason}m each rollover, ${perf.sponsor.bonus}m more for a title, ends on time`);
}

/* ---------- 6. The deal belongs to the club ---------- */
console.log('6) Leave, and the sponsor stays with the club');
{
  const signed = signSponsor(career('Newcastle'), 'safe');
  const moved = startNextSeason({ ...signed, pendingSummary: { ...(signed.pendingSummary ?? {}), position: 6 } }, 'Everton');
  if (moved.clubName !== 'Everton') fail('the move did not happen, the rest of this check is meaningless');
  else if (moved.sponsor) fail('the manager took the shirt sponsor with him to another club');
  else {
    /* And the new club is shopping, with its own offers. */
    const table = sponsorOffers(moved);
    if (table.length !== 3) fail('the new club has no offers to consider');
  }
}

/* ---------- 7. Every brand is invented ---------- */
console.log('7) No sponsor on this site is a real company');
{
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf-8');
  const m = src.match(/const SPONSOR_BRANDS[^=]*=\s*\[([\s\S]*?)\];/);
  const brands = m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : [];
  if (brands.length < 12) fail(`only ${brands.length} brands, offers would repeat constantly`);
  /* Round 467: the bad brands on the desk (clubManagerFinances) are held to
     the same wall. Bookmakers and lenders are exactly the shapes a real
     name would slip into. */
  const finSrc = fs.readFileSync(path.join(ROOT, 'src/lib/clubManagerFinances.ts'), 'utf-8');
  const mb = finSrc.match(/const BAD_SPONSOR_BRANDS[^=]*=\s*\[([\s\S]*?)\];/);
  const badBrands = mb ? [...mb[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : [];
  if (badBrands.length < 4) fail(`only ${badBrands.length} bad brands found in clubManagerFinances.ts`);
  brands.push(...badBrands);
  /* Real shirt sponsors, kit makers and the betting firms that cover half
     the shirts in Europe. A brand only has to CONTAIN one of these to fail:
     "Emirates Freight" would be as wrong as "Emirates". */
  const REAL = [
    'emirates', 'etihad', 'qatar airways', 'fly emirates', 'standard chartered', 'aia', 'chevrolet',
    'teamviewer', 'spotify', 'rakuten', 'nike', 'adidas', 'puma', 'umbro', 'castore', 'hummel',
    'macron', 'kappa', 'new balance', 'bet365', 'betano', 'stake', 'cinch', 'vodafone', 'etisalat',
    'sportsbet', 'fly better', 'visit', 'turkish airlines', 'jeep', 'socios', 'binance', 'crypto',
    'amazon', 'google', 'apple', 'samsung', 'siemens', 'bosch', 'shell', 'total', 'bp ',
    /* The six this list did not have on 2026-09-05, when the review of Round
       467 searched the bad bank name by name and found all six trading:
       Goldrush (South African casino and bookmaker), FastCash (lender),
       Quickfire (gambling software, Games Global), NightOwl (drinks and an
       Australian shop chain), RedLine Coin (crypto), Skyhigh (security). */
    'goldrush', 'gold rush', 'fastcash', 'fast cash', 'quickfire', 'nightowl', 'night owl',
    'redline', 'red line', 'skyhigh', 'sky high',
    /* And the rest of the trades the bad bank draws from, which this list
       only ever covered for Europe: bookmakers, lenders, vapes, crypto and
       the energy drinks. */
    'betway', 'hollywoodbets', 'sportingbet', '1xbet', '22bet', 'dafabet', 'fun88', 'w88',
    'paddy power', 'william hill', 'ladbrokes', 'coral', 'betfair', 'unibet', 'betfred',
    'sky bet', 'betvictor', 'bwin', 'pinnacle', 'draftkings', 'fanduel', 'wonga', 'quickquid',
    'lendup', 'satsuma', 'cashnetusa', 'speedy cash', 'advance america', 'juul', 'vuse',
    'elfbar', 'elf bar', 'geekvape', 'coinbase', 'kraken', 'red bull', 'monster', 'celsius',
    'lucozade', 'gatorade', 'powerade',
  ];
  for (const b of brands) {
    const low = b.toLowerCase();
    for (const r of REAL) {
      if (low.includes(r)) fail(`"${b}" contains the name of a real company (${r.trim()})`);
    }
  }
  /* THE SHAPE, NOT THE LIST. A list of real companies can only ever catch the
     one somebody already found, and this one missed six. What every one of
     the six had in common is how it was BUILT: a marketing idiom, two
     everyday words pushed together, which is exactly how a real bookmaker or
     payday lender names itself, so a name written that way is competing for
     the same words as a real firm and collides sooner or later. The good bank
     has never collided in eleven rounds because its words are coined
     (Northgate, Verdanta, Halcyon, Ironvale). So a brand may not be built
     from two of the words the trade markets itself with. This fires on
     "Goldrush", "Quickfire", "Fastcash", "Nightowl", "Skyhigh" and "Redline"
     and leaves the good bank alone, because "north" plus "gate" and "fox"
     plus "glove" are not selling anything. */
  const PITCH = [
    'gold', 'rush', 'quick', 'fire', 'fast', 'cash', 'night', 'owl', 'sky', 'high', 'red',
    'line', 'lucky', 'star', 'king', 'win', 'bet', 'play', 'spin', 'jack', 'ace', 'mega',
    'super', 'turbo', 'prime', 'royal', 'power', 'max', 'top', 'big', 'hot', 'live', 'bonus',
    'jackpot', 'cheap', 'easy', 'instant', 'rapid', 'swift', 'boost', 'rocket', 'moon',
  ];
  for (const b of brands) {
    for (const token of b.toLowerCase().split(/\s+/)) {
      for (const a of PITCH) {
        if (!token.startsWith(a) || token === a) continue;
        const rest = token.slice(a.length);
        if (PITCH.includes(rest)) {
          fail(`"${b}" is built like a real bookmaker's name ("${a}" plus "${rest}"), which is how the six real companies got into this bank. Coin a word instead, the way the good bank does, and search it before it ships.`);
        }
      }
    }
  }
  if (new Set(brands).size !== brands.length) fail('a brand is listed twice');
  const DASHES = /[\u2013\u2014]/; /* by codepoint, the simEras convention */
  for (const b of brands) if (DASHES.test(b)) fail(`dash in brand "${b}"`);
  console.log(`   ${brands.length} invented brands, 0 of them a real company`);
}

console.log('');
if (failures > 0) {
  console.error(`simSponsors: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simSponsors: green. The commercial desk pays real money for real reasons, and every brand is made up.');
