// Reviewer engine-saves, Release BA: a TARGETED natural fleet for PR235's club loan filter. Runner only, never committed.
// The builder's F1 (fleetF1.mjs) found 0 bites in 620 careers. The filter can only bite a loan_listed verdict at a tier 1
// parent with overall 66 or less, or a tier 2 parent with overall 56 or less (clubAverageRating 80/72/62/55 and
// projectLeagueApps: min >= 20 needs overall >= tier average - 5). Natural careers only reach those through the
// homegrown academy offer (generateContractOffers) with a low ceiling. This fleet plays exactly those careers, on two
// engines bundled from this checkout ("head" as is, "base" with PR235's filter removed), in lockstep from one seed,
// and stops at age 26 (the filter acts at 23 or under). Usage: node fleetBite.mjs <t1|t2> <careers> <seedOffset>
// Control BITE_THRESH=n raises the head arm's threshold (n > 20), so more windows bite and must all be attributed.
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
const THRESH = Number(process.env.BITE_THRESH || 20);
const headArm = THRESH === 20 ? headSrc : headSrc.replace(FILTER, FILTER.replace('>= 20', '>= ' + THRESH));
if (THRESH !== 20 && headArm === headSrc) throw new Error('control did not change the head source');
const FIX = Date.parse('2026-10-12T12:00:00Z'); const ND = Date;
globalThis.Date = class extends ND { constructor(...a) { super(...(a.length ? a : [FIX])); } static now() { return FIX; } };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
async function engine(arm, source) {
  const out = path.join(os.tmpdir(), `fb-${arm}-${process.pid}.mjs`);
  await build({ stdin: { contents: `export * from ${JSON.stringify(ENGINE.split(path.sep).join('/'))};`, resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'arm', setup(b) { b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, () => ({ contents: source, loader: 'ts' })); } }] });
  return import(pathToFileURL(out).href);
}
const EB = await engine('base', baseSrc), EH = await engine('head', headArm);
const rngOf = n => { let seed = n | 0; const f = () => { f.draws++; seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.draws = 0; return f; };
const clubs = EH.FALLBACK_CLUBS;
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const [GROUP = 't2', NARG = '1000', OFFS = '0'] = process.argv.slice(2);
const N = Number(NARG), OFF = Number(OFFS);
const TIER = GROUP === 't1' ? 1 : 2;
const nations = [...new Set(clubs.filter(c => c.tier === TIER).map(c => c.country))].sort();
const POS = ['ST', 'CM', 'CB', 'LW', 'CAM', 'RB', 'CDM', 'LB'];
// Loyal: the first homegrown deal at tier 1 or 2, then he stays put in every window unless the club itself moves him.
function loyal(E, s) {
  if (s.phase === 'transfer_window') {
    const sit = s.transferSituation;
    if (sit?.type === 'frozen_out' && sit.offers.length) { const o = sit.offers[0]; return o.isLoan ? E.acceptLoan(s, o) : E.acceptOffer(s, o); }
    return E.stayAtClub(s, clubs);
  }
  return careerStep(E, s, clubs);
}
const isClubLoan = s => s.phase === 'transfer_window' && s.transferSituation?.type === 'club_move' && s.transferSituation.mode === 'loan';
const isLoanListed = s => s.phase === 'transfer_window' && s.transferSituation?.type === 'frozen_out' && s.transferSituation.mode === 'loan_listed';
const loanWin = (E, prev, s) => isClubLoan(s)
  ? { kind: 'club loan', parentTier: s.loan?.parentTier, ovr: prev.overall, age: s.age, to: s.currentClub, toTier: s.currentClubTier, band: E.projectLeagueApps(prev.overall, s.currentClubTier, s.currentClub, 0) }
  : isLoanListed(s) ? { kind: 'zero offer', parentTier: s.currentClubTier, ovr: s.overall, age: s.age, offers: s.transferSituation.offers.length } : null;
const tally = () => ({ loanVerdicts: 0, zeroOffer: 0, byParent: {}, minUnder20: 0 });
const T = { base: tally(), head: tally() };
function count(t, E, prev, s) {
  const w = loanWin(E, prev, s); if (!w) return;
  if (w.kind === 'zero offer' && prev && isLoanListed(prev)) return;
  t.loanVerdicts++; if (w.kind === 'zero offer') t.zeroOffer++;
  const k = `t${w.parentTier}->${w.toTier ?? 'none'}`; t.byParent[k] = (t.byParent[k] ?? 0) + 1;
  if (w.band && w.band.min < 20) t.minUnder20++;
}
const after = (s, rows) => {
  const play = s.seasons.slice(rows).filter(r => r.type === 'playing' && r.age <= 25);
  const first = play[0];
  return { loanSeason: first ? { age: first.age, club: first.club, tier: first.clubTier, league: first.leagueApps ?? null, onLoan: !!first.onLoanFrom } : null,
    leagueTo25: play.reduce((n, r) => n + (r.leagueApps ?? 0), 0), seasonsTo25: play.length, overallEnd: s.overall, clubEnd: s.currentClub, tierEnd: s.currentClubTier };
};
function career(id, seed) {
  const o = TIER === 1 ? 66 : 55 + (id % 2);
  const rb = rngOf(seed), rh = rngOf(seed);
  const init = E => E.initCareer(`Bite ${id}`, nations[id % nations.length], POS[id % POS.length], 'modern', flat(o), o, id % 2 ? 2025 : 2020, clubs, null, o + 2);
  Math.random = rb; let sb = init(EB); Math.random = rh; let sh = init(EH);
  const row = { id, seed, o, equal: true, firstDiff: null };
  let pb = null, ph = null, signed = false;
  for (let step = 0; step < 2500; step++) {
    if ((sb.retired || sb.age > 25) && (sh.retired || sh.age > 25)) break;
    if (!signed && sb.phase === 'contract_offer') {
      const pick = s => (s.pendingOffers || []).find(x => x.isHomegrown && x.club.tier <= TIER) || null;
      const ob = pick(sb), oh = pick(sh); if (!ob || !oh) return null;
      Math.random = rb; const nb = EB.acceptOffer(sb, ob); Math.random = rh; const nh = EH.acceptOffer(sh, oh);
      pb = sb; ph = sh; sb = nb; sh = nh; signed = true; row.startTier = sh.currentClubTier; row.startClub = sh.currentClub; continue;
    }
    const db = rb.draws, dh = rh.draws;
    if (!(sb.retired || sb.age > 25)) { Math.random = rb; const n = loyal(EB, sb); count(T.base, EB, sb, n); pb = sb; sb = n; }
    if (!(sh.retired || sh.age > 25)) { Math.random = rh; const n = loyal(EH, sh); count(T.head, EH, sh, n); ph = sh; sh = n; }
    if (row.equal && (rb.draws - db !== rh.draws - dh || JSON.stringify(sb) !== JSON.stringify(sh))) {
      row.equal = false;
      const wb = loanWin(EB, pb, sb), wh = loanWin(EH, ph, sh);
      const attributed = !!(wb || wh) && JSON.stringify(pb) === JSON.stringify(ph) && !!wb && (wb.kind !== 'club loan' || wb.band.min < THRESH);
      row.firstDiff = { step, age: pb.age, overall: pb.overall, club: pb.currentClub, tier: pb.currentClubTier, base: wb, head: wh, attributed, draws: [rb.draws - db, rh.draws - dh] };
      row.rows = [sb.seasons.length, sh.seasons.length];
    }
  }
  if (!row.equal) row.outcome = { base: after(sb, row.rows[0]), head: after(sh, row.rows[1]) };
  return row;
}
const rows = []; let tried = 0;
for (let i = 0; rows.length < N && i < N * 6; i++) { tried++; const r = career(OFF + i, 0x7a11 + OFF + i); if (r) rows.push(r); }
const diff = rows.filter(r => !r.equal), un = diff.filter(r => !r.firstDiff.attributed);
const mean = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null;
const ls = side => diff.map(r => r.outcome[side].loanSeason?.league).filter(v => v !== null && v !== undefined);
const summary = { group: GROUP, thresh: THRESH, careers: rows.length, tried, differ: diff.length, unattributed: un.length,
  loanSeasonLeague: { base: mean(ls('base')), head: mean(ls('head')) }, leagueTo25: { base: mean(diff.map(r => r.outcome.base.leagueTo25)), head: mean(diff.map(r => r.outcome.head.leagueTo25)) },
  overallEnd: { base: mean(diff.map(r => r.outcome.base.overallEnd)), head: mean(diff.map(r => r.outcome.head.overallEnd)) },
  headZeroOfferAtDiff: diff.filter(r => r.firstDiff.head?.kind === 'zero offer').length, tally: T };
const OUT = process.env.RC_OUT || os.tmpdir();
fs.writeFileSync(path.join(OUT, `bite-${GROUP}-${THRESH}-${OFF}.json`), JSON.stringify({ summary, differing: diff }, null, 1));
for (const r of diff.slice(0, 40)) { const f = r.firstDiff, b = r.outcome.base, h = r.outcome.head;
  console.log(`DIFF ${r.id} age ${f.age} ovr ${f.overall} ${f.club} t${f.tier} ${f.attributed ? 'attributed' : 'UNATTRIBUTED'} base ${f.base ? f.base.kind + ' t' + (f.base.toTier ?? '-') + ' ' + (f.base.band ? f.base.band.min + '-' + f.base.band.max : '') : f.base} head ${f.head ? f.head.kind + ' t' + (f.head.toTier ?? '-') + ' ' + (f.head.band ? f.head.band.min + '-' + f.head.band.max : '') : f.head} | loan season league ${b.loanSeason?.league} -> ${h.loanSeason?.league} | league to 25 ${b.leagueTo25} -> ${h.leagueTo25} | ovr end ${b.overallEnd} -> ${h.overallEnd}`); }
console.log(JSON.stringify(summary));
console.log(`${un.length ? 'FLEETBITE STOP' : 'FLEETBITE done'}: group ${GROUP} thresh ${THRESH}, ${rows.length} careers (${tried} tried), ${diff.length} differ, ${un.length} unattributed; base loan verdicts ${T.base.loanVerdicts} (${T.base.minUnder20} to a club forecast under 20), head zero offer ${T.head.zeroOffer}; loan season league games base ${summary.loanSeasonLeague.base} head ${summary.loanSeasonLeague.head}`);
process.exit(un.length ? 1 : 0);
