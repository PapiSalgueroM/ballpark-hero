// Release BA, fleet F1 (PR235's default path). Runner only, never committed.
// Two engines bundled from this checkout: "head" as it is, "base" with PR235's filter removed (the inverse proven
// equal to merge c's first parent byte for byte). Every career is played on both in lockstep from the same seed,
// each engine with its own copy of the random stream; the whole save is compared after every step.
// usage (repo root): node fleetF1.mjs [verdictCareers=220] [yesCareers=400]
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const { careerStep } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerStep.mjs')).href);
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const FILTER = ' && projectLeagueApps(state.overall, c.tier, c.name, 0).min >= 20);';
const headSrc = fs.readFileSync(ENGINE, 'utf8');
if (headSrc.split(FILTER).length !== 2) throw new Error('filter anchor must stand once');
const baseSrc = headSrc.replace(FILTER, ');');
const FIX = Date.parse('2026-10-12T12:00:00Z'); const ND = Date;
globalThis.Date = class extends ND { constructor(...a) { super(...(a.length ? a : [FIX])); } static now() { return FIX; } };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
async function engine(arm, source) {
  const out = path.join(os.tmpdir(), `f1-${arm}-${process.pid}.mjs`);
  await build({ stdin: { contents: `export * from ${JSON.stringify(ENGINE.split(path.sep).join('/'))};`, resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'arm', setup(b) { b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, () => ({ contents: source, loader: 'ts' })); } }] });
  return import(pathToFileURL(out).href);
}
// Control F1_CONTROL=bite: the head arm's threshold becomes 99 league games, so every club loan verdict loses its
// offers there; the fleet must then report differing careers, every one attributed to a loan verdict window.
const THRESH = process.env.F1_CONTROL === 'bite' ? 99 : 20;
const headArm = THRESH === 20 ? headSrc : headSrc.replace(FILTER, FILTER.replace('>= 20', '>= 99'));
if (THRESH !== 20 && headArm === headSrc) throw new Error('bite control did not change the head source');
const EB = await engine('base', baseSrc), EH = await engine('head', headArm);
const rngOf = n => { let seed = n | 0; const f = () => { f.draws++; seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.draws = 0; return f; };
const clubs = EH.FALLBACK_CLUBS;
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
// simClubVerdict's own dispatch (section 4), c is the career index; everything else is careerStep's passive yes.
function verdictStep(E, s, c) {
  if (s.phase === 'transfer_window') {
    const sit = s.transferSituation;
    if (sit?.type === 'club_move') return E.stayAtClub(s);
    if (sit?.type === 'frozen_out') {
      if (sit.offers.length && c % 2 === 0) { const o = sit.offers[0]; return o.isLoan ? E.acceptLoan(s, o) : E.acceptOffer(s, o); }
      if (sit.mode === 'released') return E.acceptOffer(s, sit.offers[0]);
      return E.stayAtClub(s, clubs);
    }
    if (sit?.type === 'one_offer' && c % 3 === 0) return E.acceptOffer(s, sit.offer);
    return E.stayAtClub(s, clubs);
  }
  if (s.phase === 'world_cup') { const won = s.pendingWorldCup && s.pendingWorldCup.result === 'Winner'; return won ? E.applyWorldCupSpeech(s, 'for_the_country', clubs) : E.dismissWorldCup(s, clubs); }
  if (s.phase === 'retirement_suggestion') return E.acceptRetirementSuggestion(s, clubs);
  if (s.phase === 'retirement_ceremony') return E.goToPostRetirement(s);
  if (s.phase === 'post_retirement') return { ...s, retired: true };
  return careerStep(E, s, clubs);
}
const offersOf = (E, s) => (s.transferSituation?.offers ?? []).map(o => ({ club: o.club.name, tier: o.club.tier, loan: !!o.isLoan, min: E.projectLeagueApps(s.overall, o.club.tier, o.club.name, 0).min }));
const isLoanListed = s => s.phase === 'transfer_window' && s.transferSituation?.type === 'frozen_out' && s.transferSituation.mode === 'loan_listed';
// A loan listed verdict with an offer is completed into a club_move of mode loan in the same step (engine,
// completeClubVerdictMove), so a frozen_out loan_listed window is only the zero offer case. Count both.
const isClubLoan = s => s.phase === 'transfer_window' && s.transferSituation?.type === 'club_move' && s.transferSituation.mode === 'loan';
const isLoanVerdict = s => isLoanListed(s) || isClubLoan(s);
const targetsOf = (E, before, s) => isClubLoan(s) ? [{ club: s.currentClub, tier: s.currentClubTier, loan: true, min: E.projectLeagueApps(before.overall, s.currentClubTier, s.currentClub, 0).min }] : isLoanListed(s) ? offersOf(E, s) : [];
const tally = () => ({ careers: 0, loanListedWindows: 0, loanListedZeroOffer: 0, loanListedOffers: 0, loanTiers: {}, loansTaken: 0, clubLoanVerdicts: 0, clubLoanTiers: {}, clubLoanMinUnder20: 0 });
function count(t, E, prev, s) {
  if (isClubLoan(s) && !(prev && isClubLoan(prev))) {
    t.clubLoanVerdicts++; t.clubLoanTiers[s.currentClubTier] = (t.clubLoanTiers[s.currentClubTier] ?? 0) + 1;
    if (E.projectLeagueApps(prev.overall, s.currentClubTier, s.currentClub, 0).min < 20) t.clubLoanMinUnder20++;
  }
  if (isLoanListed(s) && !(prev && isLoanListed(prev))) {
    const o = offersOf(E, s); t.loanListedWindows++; t.loanListedOffers += o.length; if (!o.length) t.loanListedZeroOffer++;
    for (const x of o) t.loanTiers[x.tier] = (t.loanTiers[x.tier] ?? 0) + 1;
  }
  if (s.loan && !(prev && prev.loan)) t.loansTaken++;
}
const nextSeason = (s, rows) => { const r = s.seasons.slice(rows).find(x => x.type === 'playing'); return r ? { year: r.year, age: r.age, club: r.club, tier: r.clubTier, leagueApps: r.leagueApps ?? null, apps: r.apps, onLoan: !!r.onLoanFrom } : null; };
// One career on both engines. init(E) makes the start state (it draws), pick(E, s) may replace the first contract.
function career(id, seed, policy, init, firstContract) {
  // Control F1_CONTROL=seed: the head arm of every tenth career gets another stream; those must read UNATTRIBUTED.
  const rb = rngOf(seed), rh = rngOf(process.env.F1_CONTROL === 'seed' && id % 10 === 0 ? seed + 1 : seed);
  Math.random = rb; let sb = init(EB); Math.random = rh; let sh = init(EH);
  const row = { id, policy, seed, steps: 0, equal: true, firstDiff: null };
  let pb = null, ph = null, signed = !firstContract;
  for (let step = 0; step < 2500; step++) {
    const doneB = sb.retired, doneH = sh.retired;
    if (doneB && doneH) break;
    if (!signed && row.equal && sb.phase === 'contract_offer') {
      const ob = firstContract(sb), oh = firstContract(sh);
      if (!ob || !oh) return null;
      Math.random = rb; const nb = EB.acceptOffer(sb, ob); Math.random = rh; const nh = EH.acceptOffer(sh, oh);
      pb = sb; ph = sh; sb = nb; sh = nh; signed = true; row.startTier = sh.currentClubTier; row.startAge = sh.age; continue;
    }
    const db = rb.draws, dh = rh.draws;
    if (!doneB) { Math.random = rb; const n = policy === 'verdict' ? verdictStep(EB, sb, id) : careerStep(EB, sb, clubs); count(T.base, EB, sb, n); pb = sb; sb = n; }
    if (!doneH) { Math.random = rh; const n = policy === 'verdict' ? verdictStep(EH, sh, id) : careerStep(EH, sh, clubs); count(T.head, EH, sh, n); ph = sh; sh = n; }
    row.steps = step + 1;
    if (row.equal && (rb.draws - db !== rh.draws - dh || JSON.stringify(sb) !== JSON.stringify(sh))) {
      row.equal = false;
      // The two arms differ only by the filter line, so a first difference out of equal states at a loan verdict
      // window is the filter's; anything else is unattributed.
      const attributed = (isLoanVerdict(sb) || isLoanVerdict(sh)) && JSON.stringify(pb) === JSON.stringify(ph);
      const ob = targetsOf(EB, pb, sb), oh = targetsOf(EH, ph, sh);
      row.firstDiff = { step, phaseBefore: pb.phase, phaseAfter: [sb.phase, sh.phase], age: sh.age, overall: sh.overall, tier: sh.currentClubTier,
        club: sh.currentClub, year: sh.seasons.at(-1)?.year, drawsThisStep: [rb.draws - db, rh.draws - dh], offersBase: ob, offersHead: oh,
        filterBit: ob.some(o => o.min < THRESH) || ob.length !== oh.length || JSON.stringify(ob) !== JSON.stringify(oh), headAllAtLeast20: oh.every(o => o.min >= THRESH), attributed,
        kinds: [isClubLoan(sb) ? 'club loan' : isLoanListed(sb) ? 'zero offer' : sb.phase, isClubLoan(sh) ? 'club loan' : isLoanListed(sh) ? 'zero offer' : sh.phase] };
      row.rowsAtDiff = [sb.seasons.length, sh.seasons.length];
    }
  }
  if (!row.equal) { row.nextSeason = { base: nextSeason(sb, row.rowsAtDiff[0]), head: nextSeason(sh, row.rowsAtDiff[1]) }; }
  row.end = { base: { age: sb.age, retired: !!sb.retired, seasons: sb.seasons.length }, head: { age: sh.age, retired: !!sh.retired, seasons: sh.seasons.length } };
  return row;
}
const T = { base: tally(), head: tally() };
const VC = Number(process.argv[2] || 220), YC = Number(process.argv[3] || 400);
const rows = [];
for (let c = 0; c < VC; c++) {
  const o = 40 + (c % 30);
  rows.push(career(c, 0x2f81c7d3 + c, 'verdict', E => E.initCareer(`Verdict ${c}`, ['England', 'Brazil', 'Japan', 'Nigeria'][c % 4], ['ST', 'CM', 'CB', 'GK'][c % 4], '2020s', flat(o), o, 2020, clubs, null), null));
}
const NATIONS = ['England', 'Spain', 'France', 'Brazil', 'Germany', 'Argentina', 'Portugal', 'Italy'];
const POS = ['ST', 'CM', 'CB', 'LW', 'GK', 'CAM', 'RB', 'CDM'];
let tried = 0, yes = 0;
for (let i = 0; yes < YC && i < YC * 20; i++) {
  tried++;
  const o = 52 + (i % 21);
  const row = career(10000 + i, 0x51f1 + i, 'yes', E => E.initCareer(`F1 ${i}`, NATIONS[i % 8], POS[i % 8], 'modern', flat(o), o, i % 2 ? 2025 : 2020, clubs, null, 70 + (i % 25)),
    s => (s.pendingOffers || []).find(x => x.club.tier <= 2) || null);
  if (row) { rows.push(row); yes++; }
}
const diff = rows.filter(r => !r.equal);
const unattributed = diff.filter(r => !r.firstDiff.attributed || !r.firstDiff.filterBit || !r.firstDiff.headAllAtLeast20);
const sum = (a, f) => a.reduce((n, r) => n + (f(r) ?? 0), 0);
const lg = (side) => diff.map(r => r.nextSeason?.[side]?.leagueApps).filter(v => v !== null && v !== undefined);
const summary = { verdictCareers: VC, yesCareers: yes, yesTried: tried, careers: rows.length, equalToEnd: rows.length - diff.length, differ: diff.length,
  differByPolicy: { verdict: diff.filter(r => r.policy === 'verdict').length, yes: diff.filter(r => r.policy === 'yes').length }, unattributed: unattributed.length,
  offersAtFirstDiff: { base: sum(diff, r => r.firstDiff.offersBase.length), head: sum(diff, r => r.firstDiff.offersHead.length) },
  zeroOfferAtFirstDiff: { base: diff.filter(r => !r.firstDiff.offersBase.length).length, head: diff.filter(r => !r.firstDiff.offersHead.length).length },
  nextSeasonLeagueApps: { base: lg('base'), head: lg('head') },
  nextSeasonMean: { base: +(lg('base').reduce((a, b) => a + b, 0) / Math.max(1, lg('base').length)).toFixed(2), head: +(lg('head').reduce((a, b) => a + b, 0) / Math.max(1, lg('head').length)).toFixed(2) },
  nextSeasonOnLoan: { base: diff.filter(r => r.nextSeason?.base?.onLoan).length, head: diff.filter(r => r.nextSeason?.head?.onLoan).length },
  tally: T };
const OUT = process.env.RC_OUT || os.tmpdir();
fs.writeFileSync(path.join(OUT, `f1${process.env.F1_CONTROL ? '-' + process.env.F1_CONTROL : ''}.json`), JSON.stringify({ summary, differing: diff }, null, 1));
console.log(JSON.stringify(summary.tally));
for (const r of diff) console.log(`DIFF ${r.policy} ${r.id} step ${r.firstDiff.step} age ${r.firstDiff.age} ovr ${r.firstDiff.overall} tier ${r.firstDiff.tier} ${r.firstDiff.attributed && r.firstDiff.filterBit ? 'attributed' : 'UNATTRIBUTED'} offers ${JSON.stringify(r.firstDiff.offersBase.map(o => o.tier + ':' + o.min))} -> ${JSON.stringify(r.firstDiff.offersHead.map(o => o.tier + ':' + o.min))} next league games ${r.nextSeason?.base?.leagueApps} -> ${r.nextSeason?.head?.leagueApps}`);
const { nextSeasonLeagueApps, ...short } = summary; void nextSeasonLeagueApps;
console.log(JSON.stringify({ ...short, tally: undefined }));
console.log(unattributed.length ? `F1 STOP: ${unattributed.length} careers differ for a reason other than the filter` : `F1 done: ${rows.length} careers, ${diff.length} differ, every one first at a loan listed window the filter bit (club loan verdicts reached: base ${T.base.clubLoanVerdicts}, head ${T.head.clubLoanVerdicts}; zero offer loan listings: base ${T.base.loanListedWindows}, head ${T.head.loanListedWindows}; base club loans to a club forecast under 20: ${T.base.clubLoanMinUnder20})`);
process.exit(unattributed.length ? 1 : 0);
