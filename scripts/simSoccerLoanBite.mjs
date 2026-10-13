/* Release BA closing check: PR235's club loan filter on the natural careers it acts on.
 *
 * WHY. PR235 (Round 1283) made a club's own loan (a loan_listed verdict: age 23 or under, a tier 1 or 2
 * club, three strikes) skip every club whose forecast gives the player fewer than 20 league games, the
 * rule the loan window's offers already follow (src/lib/soccerCareerEngine.ts, the loan_listed loop of
 * determineTransferSituation). simSoccerLoanMinutes proves the rule on constructed saves. Release BA's F1
 * fleet played 620 natural careers and saw 0 bites, because none of them stayed weak at a big club, so
 * "0 differ" meant the population was absent, not that nothing moved. The engine-saves review
 * (results-g/review-engine-saves-BA.md, runner requests rBA-engine-saves-f1 and f1b) found the population:
 * a tier 1 club below overall 76 or a tier 2 club below 66 is reached only through the academy's homegrown
 * offer, so it is a homegrown academy player with a low ceiling who stays put. This harness plays exactly
 * those careers (natural from initCareer at 16, ceiling at overall plus 2, the homegrown first contract
 * taken only at tier 1 or 2, then loyal: he stays in every window unless the club itself moves him, and
 * takes the club's first offer when it does) on two engines bundled from this checkout, in lockstep from
 * one seed, comparing the whole save and the draw count after every step until age 26:
 *   head      the engine as it is;
 *   nofilter  the same source with PR235's filter removed by an exact once inverse. Self relative: the
 *             next engine change by anyone moves both arms alike and cannot turn this red.
 *
 * WHAT MUST HOLD, per group (t2: start 55 or 56 at a tier 2 academy; t1: start 66 at a tier 1 one):
 *   1 reached   windows where the nofilter arm offers a club loan to a club forecast under 20, per career,
 *               at or above the group's floor (a fleet that stops reaching the population goes red);
 *   2 bites     careers that differ between the arms, per career, at or above the group's floor;
 *   3 cause     every differing career first differs at a loan_listed verdict, from an equal prior state,
 *               whose nofilter offers hold a club loan forecast under 20 and whose head offers hold none
 *               (exact: 0 unattributed);
 *   4 rule      the head never offers a club loan to a club forecast under 20 (exact: 0 such offers);
 *   5 outcome   among the bitten careers, the head is on loan in the loan season, at a lower tier than the
 *               nofilter arm, with at least as many league games, each in at least 90 percent of them,
 *               and the mean gain in loan season league games is at least +6. With no bitten career this
 *               check fails: it never passes on nothing.
 *   The zero offer card ("Nobody has come in for you") is recorded, never asserted.
 *
 * MEASURED: see BANDS below for the floors and the runs they come from.
 *
 * CONTROLS (SOCCER_LOAN_BITE_CONTROL; group t2 only, 500 careers unless set):
 *   strict26  the head's threshold raised to 26: the club loan turns into a freeze out, so 3 and 5 must fail;
 *   nofilter  the head arm is the nofilter arm: 2, 4 and 5 must fail.
 * A control exits 0 only when exactly its expected checks failed, printing
 * 'control "<name>" fired: checks <list> failed as expected'; anything else exits 1.
 *
 * Env: SOCCER_LOAN_BITE_CAREERS (per group, default 1500), SOCCER_LOAN_BITE_GROUPS (default t2,t1),
 * SOCCER_LOAN_BITE_SEED (added to each group's base seed), SOCCER_LOAN_BITE_OUT (a fresh report folder).
 * Reads no network and no database: the engine and its FALLBACK_CLUBS only.
 */
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const { careerStep } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerStep.mjs')).href);

const RULE = 20;
const FILTER = ' && projectLeagueApps(state.overall, c.tier, c.name, 0).min >= 20);';
const CONTROL = process.env.SOCCER_LOAN_BITE_CONTROL || '';
const CONTROLS = { strict26: [3, 5], nofilter: [2, 4, 5] };
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control "${CONTROL}"`); process.exit(1); }

const headSource = fs.readFileSync(ENGINE, 'utf8').replace(/\r\n/g, '\n');
assert.equal(headSource.split(FILTER).length, 2, 'PR235 filter anchor must stand exactly once in the engine');
const nofilterSource = headSource.replace(FILTER, ');');
assert.notEqual(nofilterSource, headSource, 'the inverse changed the source');
// The inverse is exact: putting the filter back where it was removed restores this head byte for byte.
const at = headSource.indexOf(FILTER);
assert.equal(nofilterSource.slice(0, at) + FILTER + nofilterSource.slice(at + 2), headSource, 'inverse round trip');
const headArmSource = CONTROL === 'strict26' ? headSource.replace(FILTER, FILTER.replace('>= 20', '>= 26'))
  : CONTROL === 'nofilter' ? nofilterSource : headSource;
if (CONTROL) assert.notEqual(headArmSource, headSource, 'control changed the head arm');

const OUT = process.env.SOCCER_LOAN_BITE_OUT ? path.resolve(process.env.SOCCER_LOAN_BITE_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'loan-bite-'));
if (process.env.SOCCER_LOAN_BITE_OUT) {
  assert.equal(fs.existsSync(OUT), false, 'SOCCER_LOAN_BITE_OUT must be a fresh folder');
  fs.mkdirSync(OUT, { recursive: true });
}

const FIX = Date.parse('2026-10-12T12:00:00Z'); const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [FIX])); } static now() { return FIX; } };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

async function engine(arm, source) {
  const outfile = path.join(OUT, `engine-${arm}.mjs`);
  await build({ stdin: { contents: `export * from ${JSON.stringify(ENGINE.split(path.sep).join('/'))};`, resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'arm', setup(b) { b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, () => ({ contents: source, loader: 'ts' })); } }] });
  return import(pathToFileURL(outfile).href);
}
const EN = await engine('nofilter', nofilterSource);
const EH = await engine('head', headArmSource);
const clubs = EH.FALLBACK_CLUBS;

const rngOf = n => { let seed = n | 0; const f = () => { f.draws++; seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.draws = 0; return f; };
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const POS = ['ST', 'CM', 'CB', 'LW', 'CAM', 'RB', 'CDM', 'LB'];
const isVerdict = s => s.phase === 'transfer_window' && s.transferSituation?.type === 'frozen_out' && s.transferSituation.mode === 'loan_listed';
function loyal(E, s) {
  if (s.phase === 'transfer_window') {
    const sit = s.transferSituation;
    if (sit?.type === 'frozen_out' && sit.offers.length) { const o = sit.offers[0]; return o.isLoan ? E.acceptLoan(s, o) : E.acceptOffer(s, o); }
    return E.stayAtClub(s, clubs);
  }
  return careerStep(E, s, clubs);
}
/* The engine opens a loan_listed window and takes the club's first loan itself, in the same step
   (transferSituation becomes club_move, mode loan); a verdict left frozen_out at the window is the zero
   offer card. The forecast is the one the filter reads, at the overall of the window. */
function windowOf(E, prev, s) {
  if (s.phase !== 'transfer_window') return null;
  const sit = s.transferSituation;
  if (sit?.type === 'club_move' && sit.mode === 'loan' && !(prev?.phase === 'transfer_window' && prev.transferSituation?.type === 'club_move'))
    return { kind: 'club loan', to: s.currentClub, tier: s.currentClubTier, min: E.projectLeagueApps(s.overall, s.currentClubTier, s.currentClub, 0).min };
  if (isVerdict(s) && !isVerdict(prev ?? {})) return { kind: 'zero offer', offers: sit.offers.length };
  return null;
}
const tally = () => ({ clubLoans: 0, zeroOffer: 0, loansUnder20: 0 });
function count(t, E, prev, s) {
  const w = windowOf(E, prev, s); if (!w) return;
  if (w.kind === 'zero offer') { t.zeroOffer++; return; }
  t.clubLoans++; if (w.min < RULE) t.loansUnder20++;
}
// The first playing season after the first difference (the loan season), and the run to 25.
const after = (s, rows) => {
  const play = s.seasons.slice(rows).filter(r => r.type === 'playing' && r.age <= 25), first = play[0];
  return { loanSeason: first ? { age: first.age, club: first.club, tier: first.clubTier, league: first.leagueApps ?? null, onLoan: !!first.onLoanFrom } : null,
    leagueTo25: play.reduce((n, r) => n + (r.leagueApps ?? 0), 0), overallEnd: s.overall };
};

function career(group, id, seed, T) {
  const tier = group.tier, o = group.start(id);
  const rn = rngOf(seed), rh = rngOf(seed);
  const init = E => E.initCareer(`Bite ${id}`, group.nations[id % group.nations.length], POS[id % POS.length], 'modern', flat(o), o, id % 2 ? 2025 : 2020, clubs, null, o + 2);
  Math.random = rn; let sn = init(EN); Math.random = rh; let sh = init(EH);
  const row = { id, seed, start: o, equal: true, firstDiff: null };
  let pn = null, ph = null, signed = false;
  for (let step = 0; step < 2500; step++) {
    const doneN = sn.retired || sn.age > 25, doneH = sh.retired || sh.age > 25;
    if (doneN && doneH) break;
    if (!signed && sn.phase === 'contract_offer') {
      const pick = s => (s.pendingOffers || []).find(x => x.isHomegrown && x.club.tier <= tier) || null;
      const on = pick(sn), oh = pick(sh); if (!on || !oh) return null;
      Math.random = rn; const nn = EN.acceptOffer(sn, on); Math.random = rh; const nh = EH.acceptOffer(sh, oh);
      pn = sn; ph = sh; sn = nn; sh = nh; signed = true; continue;
    }
    const dn = rn.draws, dh = rh.draws;
    if (!doneN) { Math.random = rn; const n = loyal(EN, sn); count(T.nofilter, EN, sn, n); pn = sn; sn = n; }
    if (!doneH) { Math.random = rh; const n = loyal(EH, sh); count(T.head, EH, sh, n); ph = sh; sh = n; }
    if (row.equal && (rn.draws - dn !== rh.draws - dh || JSON.stringify(sn) !== JSON.stringify(sh))) {
      row.equal = false;
      // The filter is the cause only when the arms were equal before this step, the nofilter arm's club
      // loan went to a club forecast under 20, and the head's went to one at 20 or more (or nobody came).
      const wn = windowOf(EN, pn, sn), wh = windowOf(EH, ph, sh);
      const attributed = JSON.stringify(pn) === JSON.stringify(ph) && wn?.kind === 'club loan' && wn.min < RULE
        && !!wh && (wh.kind === 'zero offer' || wh.min >= RULE);
      row.firstDiff = { step, age: pn.age, overall: sn.overall, club: pn.currentClub, tier: pn.currentClubTier, nofilter: wn, head: wh, attributed };
      row.rows = [sn.seasons.length, sh.seasons.length];
    }
  }
  if (!row.equal) row.outcome = { nofilter: after(sn, row.rows[0]), head: after(sh, row.rows[1]) };
  return row;
}

/* Floors per career, from measured headroom (see the header's MEASURED line). */
const BANDS = {
  t2: { reached: 0.035, bites: 0.035 },
  t1: { reached: 0.004, bites: 0.004 },
};
const OUTCOME = { share: 0.9, meanGain: 6 };
const GROUPS = {
  t2: { tier: 2, seed: 0, start: id => 55 + (id % 2) },
  t1: { tier: 1, seed: 400000, start: () => 66 },
};
for (const g of Object.values(GROUPS)) g.nations = [...new Set(clubs.filter(c => c.tier === g.tier).map(c => c.country))].sort();
const wanted = (process.env.SOCCER_LOAN_BITE_GROUPS || (CONTROL ? 't2' : 't2,t1')).split(',').map(x => x.trim()).filter(Boolean);
for (const name of wanted) assert.ok(GROUPS[name], `unknown group ${name}`);
const N = Number(process.env.SOCCER_LOAN_BITE_CAREERS || (CONTROL ? 500 : 1500));
const SEED = Number(process.env.SOCCER_LOAN_BITE_SEED || 0);
assert.ok(N > 0 && Number.isInteger(SEED), 'careers and seed must be numbers');

const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const share = (a, f) => a.length ? a.filter(f).length / a.length : 0;
const report = { control: CONTROL || null, careers: N, seed: SEED, groups: {} };
const failed = new Set();
const check = (g, n, ok, text) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${g} ${n} ${text}`);
  if (!ok) failed.add(n);
  report.groups[g].checks.push({ n, ok, text });
};
for (const name of wanted) {
  const g = GROUPS[name], T = { nofilter: tally(), head: tally() }, rows = [];
  const off = g.seed + SEED;
  let tried = 0;
  for (let i = 0; rows.length < N && i < N * 6; i++) { tried++; const r = career(g, off + i, 0x7a11 + off + i, T); if (r) rows.push(r); }
  const bitten = rows.filter(r => !r.equal), unattributed = bitten.filter(r => !r.firstDiff.attributed);
  const both = bitten.filter(r => r.outcome.head.loanSeason && r.outcome.nofilter.loanSeason);
  const gains = both.filter(r => r.outcome.head.loanSeason.league !== null && r.outcome.nofilter.loanSeason.league !== null)
    .map(r => r.outcome.head.loanSeason.league - r.outcome.nofilter.loanSeason.league);
  const s = {
    careers: rows.length, tried, bitten: bitten.length, unattributed: unattributed.length,
    reachedPerCareer: T.nofilter.loansUnder20 / rows.length, bitesPerCareer: bitten.length / rows.length,
    headLoansUnder20: T.head.loansUnder20, headZeroOffer: T.head.zeroOffer, nofilterZeroOffer: T.nofilter.zeroOffer,
    onLoan: share(bitten, r => !!r.outcome.head.loanSeason?.onLoan),
    lowerTier: share(bitten, r => !!r.outcome.head.loanSeason?.onLoan && !!r.outcome.nofilter.loanSeason?.onLoan && r.outcome.head.loanSeason.tier > r.outcome.nofilter.loanSeason.tier),
    asManyGames: share(bitten, r => gains.length > 0 && r.outcome.head.loanSeason?.league !== null && r.outcome.nofilter.loanSeason?.league !== null && r.outcome.head.loanSeason.league >= r.outcome.nofilter.loanSeason.league),
    meanGain: mean(gains), loanSeasonLeague: { nofilter: mean(both.map(r => r.outcome.nofilter.loanSeason.league ?? 0)), head: mean(both.map(r => r.outcome.head.loanSeason.league ?? 0)) },
    overallAt26: { nofilter: mean(bitten.map(r => r.outcome.nofilter.overallEnd)), head: mean(bitten.map(r => r.outcome.head.overallEnd)) },
    tally: T,
  };
  report.groups[name] = { summary: s, checks: [], unattributed: unattributed.slice(0, 20), sample: bitten.slice(0, 20) };
  const pct = x => (100 * x).toFixed(2) + '%';
  console.log(`${name}: ${s.careers} careers (${tried} tried, seeds ${off}+), ${s.bitten} bitten, nofilter club loans to a club forecast under 20 ${T.nofilter.loansUnder20} (${pct(s.reachedPerCareer)} a career), head zero offer ${s.headZeroOffer}, loan season league games ${s.loanSeasonLeague.nofilter?.toFixed(2)} to ${s.loanSeasonLeague.head?.toFixed(2)}, overall at 26 ${s.overallAt26.nofilter?.toFixed(2)} to ${s.overallAt26.head?.toFixed(2)}`);
  const b = BANDS[name];
  check(name, 1, s.reachedPerCareer >= b.reached, `reached: ${pct(s.reachedPerCareer)} club loans a career go to a club forecast under 20 without the filter (floor ${pct(b.reached)})`);
  check(name, 2, s.bitesPerCareer >= b.bites, `bites: ${pct(s.bitesPerCareer)} of careers differ (floor ${pct(b.bites)})`);
  check(name, 3, s.unattributed === 0, `cause: ${s.unattributed} of ${s.bitten} differing careers first differ anywhere but a filtered loan window`);
  check(name, 4, s.headLoansUnder20 === 0, `rule: the head sent ${s.headLoansUnder20} club loans to a club forecast under 20`);
  const outcomeOk = s.bitten > 0 && s.onLoan >= OUTCOME.share && s.lowerTier >= OUTCOME.share && s.asManyGames >= OUTCOME.share && s.meanGain !== null && s.meanGain >= OUTCOME.meanGain;
  check(name, 5, outcomeOk, `outcome: of ${s.bitten} bitten, on loan ${pct(s.onLoan)}, a lower tier ${pct(s.lowerTier)}, as many league games ${pct(s.asManyGames)} (each floor ${pct(OUTCOME.share)}), mean gain ${s.meanGain === null ? "none" : s.meanGain.toFixed(2)} (floor +${OUTCOME.meanGain})`);
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1) + '\n');
console.log(`report: ${path.join(OUT, 'report.json')}`);
const got = [...failed].sort((x, y) => x - y);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  if (got.join(',') === want.join(',')) { console.log(`control "${CONTROL}" fired: checks ${got.join(', ')} failed as expected`); process.exit(0); }
  console.log(`control "${CONTROL}" DID NOT FIRE as expected: failed [${got.join(', ')}], expected [${want.join(', ')}]`);
  process.exit(1);
}
console.log(got.length ? `simSoccerLoanBite FAIL: checks ${got.join(', ')}` : 'simSoccerLoanBite PASS');
process.exit(got.length ? 1 : 0);
