/**
 * Round 124 harness: is international football a real competition?
 *
 * Before this round Soccer Career had a World Cup that only existed while the
 * player was still in it. simulateWorldCup returned the moment your nation
 * went out, so in every season you did not reach the final, NOBODY won the
 * World Cup. The continental championship was one line of Math.random with no
 * opponents and no bracket. Qualifying was a coin flip and there was no squad
 * to be dropped from.
 *
 * A harness that only proves "no crash" proves nothing, so this measures
 * outcomes over hundreds of tournaments and hundreds of careers:
 *
 *  1. every tournament crowns exactly one winner, every cycle, including the
 *     ones the player is nowhere near
 *  2. the bracket is internally honest: no nation in two ties at once, no
 *     nation playing itself, every round seeded from the real winners of the
 *     one before, no winner on a losing score
 *  3. strong nations win more than weak ones, and the spread is not
 *     degenerate in either direction
 *  4. a player's nation sometimes fails to qualify, and a player is sometimes
 *     left out of the squad, at rates that are neither zero nor absurd, and
 *     BOTH are driven by ratings rather than a coin flip
 *  5. the honours in the cabinet always agree with the brackets, the same
 *     cross check Round 102 added for the domestic cup
 *  6. being an international regular measurably changes a career against a
 *     paired do nothing baseline with identical rolled potential per seed
 *
 * Run: node scripts/simInternational.mjs [careers]
 */
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INTL_OUT = '/tmp/sc-intl.mjs';
const ENGINE_OUT = '/tmp/sc-intl-engine.mjs';

await build({
  entryPoints: ['src/lib/soccerInternational.ts'],
  bundle: true, format: 'esm', platform: 'node', outfile: INTL_OUT,
  logLevel: 'error', alias: { '@': './src' },
});
// The engine reaches for localStorage through the life/phone modules, so the
// stub goes in the entry the way simCup.mjs does it.
const ENGINE_ENTRY = '/tmp/sc-intl-entry.mjs';
fs.writeFileSync(ENGINE_ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
export const engine = mod;
`);
await build({
  entryPoints: [ENGINE_ENTRY],
  bundle: true, format: 'esm', platform: 'node', outfile: ENGINE_OUT,
  logLevel: 'error', alias: { '@': './src' },
});

const intl = await import(pathToFileURL(INTL_OUT).href);
const { engine } = await import(pathToFileURL(ENGINE_OUT).href);

const {
  runInternationalSummer, tournamentForYear, nationStrength, fifaRankOf,
  confederationOf, pickSquad, nationsIn, isWorldCupYear, isContinentalYear,
  CONFED_MEMBERS, NATION_CONFED, WC_SLOTS,
} = intl;

const {
  initCareer, advanceYouthYear, acceptOffer, advanceProSeason,
  applyRehabChoice,
  dismissSummary, dismissNewspaper, dismissDebut, dismissWorldCup,
  dismissRivalryEvent, dismissBallonDor, applyEventChoice, dismissMoralDilemma,
  dismissSocialMediaPhase, dismissAppealResult, applyBdorSpeech, applyWorldCupSpeech,
  acceptRetirementSuggestion, stayAtClub, signExtension,
  FALLBACK_CLUBS, getCareerTotals,
} = engine;

const CAREERS = Number(process.argv[2] || 90);
const clubs = FALLBACK_CLUBS;
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const pct = (a, b) => b ? ((a / b) * 100).toFixed(0) : '0';

const form = o => ({
  overall: o, position: 'ST', lastRating: 7.1, lastGoals: 18, age: 26, isCaptain: false,
});

/* ---------- 1. Every tournament crowns exactly one winner ---------- */
console.log('1) Every tournament crowns exactly one winner');
{
  // Deliberately including nations who will mostly NOT be there, so most of
  // these tournaments are ones the player has nothing to do with.
  const NATIONS = ['Spain', 'England', 'Brazil', 'Japan', 'Nigeria', 'USA',
    'Norway', 'Scotland', 'New Zealand', 'Vietnam', 'Mexico', 'Morocco'];
  let played = 0, crowned = 0, withoutMe = 0, crownedWithoutMe = 0;
  let noRunnerUp = 0;
  const years = [2026, 2028, 2030, 2032, 2034, 2036];
  for (const nation of NATIONS) {
    for (const year of years) {
      for (let rep = 0; rep < 6; rep++) {
        const t = runInternationalSummer(nation, year, form(80));
        if (!t) { fail(`${nation} ${year}: no tournament in a tournament year`); continue; }
        played++;
        if (t.champion) crowned++;
        else fail(`${nation} ${year} ${t.short}: nobody won it`);
        if (t.champion === t.runnerUp) fail(`${t.short} ${year}: champion also lost the final`);
        if (!t.runnerUp) noRunnerUp++;
        const finals = t.bracket.filter(x => x.round === 'F');
        if (finals.length !== 1) fail(`${t.short} ${year}: ${finals.length} finals`);
        const notMine = t.myResult === 'Did Not Qualify' || t.myResult === 'Not Selected';
        if (notMine) { withoutMe++; if (t.champion) crownedWithoutMe++; }
      }
    }
  }
  console.log(`   ${played} tournaments played, ${crowned} crowned a champion`);
  console.log(`   ${withoutMe} of them the player was not in at all, ${crownedWithoutMe} still crowned a champion`);
  if (crowned !== played) fail('a tournament finished with no winner');
  if (noRunnerUp) fail(`${noRunnerUp} finals with no losing finalist`);
  if (withoutMe < 30) fail(`only ${withoutMe} tournaments ran without the player, not enough to prove anything`);
  if (crownedWithoutMe < withoutMe) fail('a tournament the player was not in failed to finish');

  // Off years have nothing on.
  let offYears = 0;
  for (const y of [2027, 2029, 2031, 2033]) {
    for (const n of NATIONS) if (runInternationalSummer(n, y, form(80))) offYears++;
  }
  console.log(`   ${offYears} tournaments found in the four off years (want 0)`);
  if (offYears) fail('a tournament ran in a year with no tournament in it');
}

/* ---------- 2. The bracket is internally honest ---------- */
console.log('2) The bracket holds up');
{
  const ORDER = ['R32', 'R16', 'QF', 'SF', 'F'];
  let checked = 0, pens = 0, ties = 0;
  const sizes = new Map();
  for (const nation of ['Spain', 'Brazil', 'Japan', 'USA', 'New Zealand', 'Nigeria']) {
    for (const year of [2026, 2028]) {
      for (let rep = 0; rep < 12; rep++) {
        const t = runInternationalSummer(nation, year, form(84));
        checked++;
        sizes.set(t.short, t.teams);
        const rounds = ORDER.filter(r => t.bracket.some(x => x.round === r));
        // Rounds present must be a contiguous run ending in the final.
        const idx = rounds.map(r => ORDER.indexOf(r));
        for (let i = 1; i < idx.length; i++) {
          if (idx[i] !== idx[i - 1] + 1) fail(`${t.short}: a knockout round is missing`);
        }
        if (rounds[rounds.length - 1] !== 'F') fail(`${t.short}: the bracket does not end in a final`);

        for (const round of rounds) {
          const rs = t.bracket.filter(x => x.round === round);
          const names = rs.flatMap(x => [x.home, x.away]);
          if (new Set(names).size !== names.length) fail(`${t.short} ${round}: a nation is in two ties at once`);
          for (const x of rs) {
            ties++;
            if (x.home === x.away) fail(`${t.short} ${round}: a nation drawn against itself`);
            if (x.winner === null) fail(`${t.short} ${round}: an unfinished tie`);
            if (x.homeGoals === null || x.awayGoals === null) fail(`${t.short} ${round}: a settled tie with no score`);
            if (x.homeGoals === x.awayGoals) {
              if (!x.pens) fail(`${t.short} ${round}: a level tie with no shootout`);
              pens++;
            } else if (x.pens) {
              fail(`${t.short} ${round}: a decisive score marked as a shootout`);
            } else if ((x.homeGoals > x.awayGoals ? x.home : x.away) !== x.winner) {
              fail(`${t.short} ${round}: ${x.winner} advanced on a losing score`);
            }
            if (x.winner !== x.home && x.winner !== x.away) fail(`${t.short} ${round}: winner is in neither side of the tie`);
          }
        }
        // Every later round comes from the real winners of the one before.
        for (let i = 1; i < rounds.length; i++) {
          const won = new Set(t.bracket.filter(x => x.round === rounds[i - 1]).map(x => x.winner));
          for (const x of t.bracket.filter(x => x.round === rounds[i])) {
            if (!won.has(x.home) || !won.has(x.away)) {
              fail(`${t.short} ${rounds[i]}: ${x.home} v ${x.away} did not both win a ${rounds[i - 1]} tie`);
            }
          }
        }
        // The champion is the winner of the final, always.
        const fin = t.bracket.find(x => x.round === 'F');
        if (fin.winner !== t.champion) fail(`${t.short}: the champion is not the winner of the final`);
        // My own ties are flagged as mine and nobody else's are.
        for (const x of t.bracket) {
          const isMine = x.home === nation || x.away === nation;
          if (isMine !== x.mine) fail(`${t.short}: a tie is mis-flagged as mine`);
        }
      }
    }
  }
  console.log(`   ${checked} brackets, ${ties} ties, ${pcts(pens, ties)}% went to penalties`);
  console.log(`   field sizes: ${[...sizes].map(([k, v]) => `${k} ${v}`).join(', ')}`);
  // Verified formats, from the sources cited in soccerInternational.ts.
  const WANT = {
    'World Cup': 48, Euros: 24, 'Copa América': 16, AFCON: 24,
    'Asian Cup': 24, 'Gold Cup': 16, 'Nations Cup': 8,
  };
  for (const [name, teams] of sizes) {
    if (WANT[name] && WANT[name] !== teams) fail(`${name} ran with ${teams} nations, the real format is ${WANT[name]}`);
  }
  if (pens / ties > 0.4) fail('nearly half the knockout ties go to penalties, that is not football');
  if (pens === 0) fail('no knockout tie ever went to penalties');
}
function pcts(a, b) { return b ? ((a / b) * 100).toFixed(0) : '0'; }

/* ---------- 3. Strong nations win more, and the spread is sane ---------- */
console.log('3) Strong nations win more than weak ones');
{
  const REPS = 400;
  const wins = new Map();
  // One long run of World Cups, measured from a neutral player who is not in
  // any of them, so nothing is tilted toward whoever we happen to be.
  for (let i = 0; i < REPS; i++) {
    const t = runInternationalSummer('Vietnam', 2026, null);
    wins.set(t.champion, (wins.get(t.champion) ?? 0) + 1);
  }
  const ranked = [...wins].sort((a, b) => b[1] - a[1]);
  const distinct = ranked.length;
  const topShare = ranked[0][1] / REPS;
  console.log(`   ${REPS} World Cups: ${distinct} different champions`);
  console.log(`   most successful: ${ranked.slice(0, 5).map(([n, w]) => `${n} ${(w / REPS * 100).toFixed(0)}%`).join(', ')}`);
  if (distinct < 6) fail(`only ${distinct} nations ever win a World Cup, the game is decided before it starts`);
  if (topShare > 0.35) fail(`one nation wins ${(topShare * 100).toFixed(0)}% of World Cups, that is degenerate`);
  if (topShare < 0.06) fail(`the best nation only wins ${(topShare * 100).toFixed(0)}%, strength does not matter`);

  // Champions must skew strong. Average winner strength against the average
  // of the whole nation pool.
  const winnerStr = [...wins].reduce((s, [n, w]) => s + nationStrength(n) * w, 0) / REPS;
  const allNations = Object.keys(NATION_CONFED);
  const poolStr = allNations.reduce((s, n) => s + nationStrength(n), 0) / allNations.length;
  console.log(`   average champion strength ${winnerStr.toFixed(1)} against a world average of ${poolStr.toFixed(1)}`);
  if (winnerStr < poolStr + 8) fail('World Cup winners are barely stronger than an average nation');

  // Head to head sanity: the very best nation must beat a floor nation far
  // more often than not, but not every single time.
  let strongWins = 0;
  for (let i = 0; i < 300; i++) {
    const a = runInternationalSummer('Spain', 2026, null);
    if (a.champion === 'Spain') strongWins++;
  }
  let weakWins = 0;
  for (let i = 0; i < 300; i++) {
    const b = runInternationalSummer('Vietnam', 2026, null);
    if (b.champion === 'Vietnam') weakWins++;
  }
  console.log(`   Spain (rank ${fifaRankOf('Spain')}) won ${pct(strongWins, 300)}% of World Cups, Vietnam (rank ${fifaRankOf('Vietnam')}) won ${pct(weakWins, 300)}%`);
  if (strongWins <= weakWins) fail('the best nation in the world does no better than the 99th');
  if (strongWins === 300) fail('the best nation wins every single World Cup');
}

/* ---------- 4. Qualifying and the squad both bite ---------- */
console.log('4) Missing out is possible, and it is not a coin flip');
{
  const REPS = 300;
  const rows = [];
  for (const nation of ['Spain', 'England', 'Japan', 'Nigeria', 'Scotland', 'New Zealand', 'Vietnam']) {
    let q = 0;
    for (let i = 0; i < REPS; i++) if (runInternationalSummer(nation, 2026, form(80)).qualified) q++;
    rows.push({ nation, rank: fifaRankOf(nation), conf: confederationOf(nation), q: q / REPS });
  }
  for (const r of rows) {
    console.log(`   ${r.nation.padEnd(12)} ${r.conf.padEnd(9)} rank ${String(r.rank).padStart(3)}  qualified ${(r.q * 100).toFixed(0)}%`);
  }
  const best = rows.find(r => r.nation === 'Spain');
  const worst = rows.find(r => r.nation === 'Vietnam');
  if (best.q < 0.8) fail(`the best nation in the world only qualifies ${(best.q * 100).toFixed(0)}% of the time`);
  if (worst.q > 0.35) fail(`a 99th ranked nation qualifies ${(worst.q * 100).toFixed(0)}% of the time`);
  if (worst.q === 0) fail('a weak nation can literally never qualify, so there is nothing to play for');
  // Qualification must track ranking, not noise.
  const sortedByRank = [...rows].sort((a, b) => a.rank - b.rank);
  for (let i = 1; i < sortedByRank.length; i++) {
    if (sortedByRank[i].q > sortedByRank[i - 1].q + 0.25) {
      fail(`${sortedByRank[i].nation} qualifies far more often than the better ranked ${sortedByRank[i - 1].nation}`);
    }
  }

  console.log('   squad selection, by player rating (good form, age 26):');
  const table = {};
  for (const nation of ['Spain', 'Japan', 'Vietnam']) {
    table[nation] = [68, 74, 78, 82, 88].map(ovr => {
      let c = 0;
      for (let i = 0; i < 400; i++) if (pickSquad(nation, form(ovr)).called) c++;
      return c / 400;
    });
  }
  for (const [nation, vals] of Object.entries(table)) {
    console.log(`     ${nation.padEnd(9)} ${vals.map((v, i) => `${[68, 74, 78, 82, 88][i]}ovr ${(v * 100).toFixed(0)}%`).join('  ')}`);
  }
  // A weak player must miss a strong nation's squad, a great one must never.
  if (table.Spain[0] > 0.15) fail('a 68 rated player walks into the Spain squad');
  if (table.Spain[4] < 0.95) fail('an 88 rated player cannot get into the Spain squad');
  if (table.Vietnam[0] < 0.5) fail('a 68 rated player cannot get into a 99th ranked nation\'s squad');
  // Form has to matter on its own, holding rating fixed.
  const withForm = f => {
    let c = 0;
    for (let i = 0; i < 500; i++) {
      if (pickSquad('Spain', { overall: 80, position: 'ST', age: 26, isCaptain: false, ...f }).called) c++;
    }
    return c / 500;
  };
  const hot = withForm({ lastRating: 7.6, lastGoals: 28 });
  const cold = withForm({ lastRating: 6.4, lastGoals: 3 });
  console.log(`   same 80 rated striker: after a great season ${(hot * 100).toFixed(0)}%, after a bad one ${(cold * 100).toFixed(0)}%`);
  if (hot - cold < 0.3) fail('form makes almost no difference to being picked');
  const old = (() => {
    let c = 0;
    for (let i = 0; i < 500; i++) {
      if (pickSquad('Spain', { overall: 80, position: 'ST', lastRating: 7.1, lastGoals: 18, age: 36, isCaptain: false }).called) c++;
    }
    return c / 500;
  })();
  console.log(`   the same striker at 36 years old: ${(old * 100).toFixed(0)}%`);
  if (old >= hot) fail('age never costs anybody a squad place');
}

/* ---------- 5. Full careers: the cabinet agrees with the brackets ---------- */
console.log('5) Full careers, and the cabinet agrees with the brackets');

const NATIONS = ['England', 'Brazil', 'France', 'Japan', 'Nigeria', 'Argentina', 'Morocco', 'Norway', 'USA', 'Scotland'];
const POSITIONS = ['ST', 'CAM', 'CM', 'CB', 'GK', 'LW', 'RB', 'CDM'];
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });

/**
 * Run one career. `engaged` trains nothing (that is simCareerEngaged's job)
 * but chases the best club, which is what keeps a player in the international
 * picture. `intlOff` retires from international football at the first chance,
 * which is the do nothing baseline for section 6.
 */
function runCareer(seed, { nation, intlOff = false } = {}) {
  const pos = POSITIONS[seed % POSITIONS.length];
  const pot = [74, 78, 82, 86, 90, 94][seed % 6];
  let s = initCareer(`Sim ${seed}`, nation, pos, '2020s', stats(60), 60, 2020, clubs, null, pot);
  // The do nothing arm walks away BEFORE the first pro season, otherwise the
  // debut and the first tournament can both land in the same season and one
  // summer slips through before the baseline can opt out.
  if (intlOff) s = engine.retireFromInternational(s);
  let guard = 0;
  const tourneys = [];
  let sawTournamentPhase = 0;
  while (!s.retired && guard++ < 500) {
    if (intlOff && s.internationalCareer && !s.intStats.isRetired) {
      s = engine.retireFromInternational(s);
    }
    switch (s.phase) {
      case 'youth': s = advanceYouthYear(s, clubs); break;
      case 'contract_offer': {
        const offers = s.pendingOffers || [];
        if (!offers.length) { s = { ...s, phase: 'playing' }; break; }
        s = acceptOffer(s, [...offers].sort((a, b) => (a.club?.tier ?? 9) - (b.club?.tier ?? 9))[0]);
        break;
      }
      case 'playing': s = advanceProSeason(s, clubs); break;
      /* Round 253: a serious injury pauses the season for a rehab
         decision. This walk is about caps and tournaments, not the
         road back, so it always takes the club's plan. */
      case 'rehab_choice': s = applyRehabChoice(s, 1); break;
      case 'newspaper': s = dismissNewspaper(s); break;
      case 'season_summary': s = dismissSummary(s, clubs); break;
      case 'international_debut': s = dismissDebut(s, clubs); break;
      case 'world_cup': {
        sawTournamentPhase++;
        if (s.pendingTournament) tourneys.push(s.pendingTournament);
        // Winning it opens the speech, which is a different call.
        s = s.pendingTournament?.myResult === 'Winner'
          ? applyWorldCupSpeech(s, 'for_the_country', clubs)
          : dismissWorldCup(s, clubs);
        break;
      }
      case 'rivalry_event': s = dismissRivalryEvent(s, clubs); break;
      case 'ballon_dor': s = dismissBallonDor(s, clubs); break;
      case 'moral_dilemma': s = dismissMoralDilemma(s, clubs); break;
      case 'social_media_action': s = dismissSocialMediaPhase(s, clubs); break;
      case 'red_card_appeal_result': s = dismissAppealResult(s, clubs); break;
      case 'retirement_suggestion': s = acceptRetirementSuggestion(s); break;
      case 'retirement_ceremony': case 'retired': s = { ...s, retired: true }; break;
      case 'random_events': {
        const ev = (s.pendingEvents || [])[0];
        if (!ev?.choices?.length) { s = { ...s, phase: 'playing', pendingEvents: [] }; break; }
        s = applyEventChoice(s, 0, clubs);
        break;
      }
      case 'contract_expiring': s = signExtension(s); break;
      case 'transfer_window': {
        const sit = s.transferSituation;
        const opts = sit ? [sit.offer, sit.offerA, sit.offerB, ...(sit.offers || [])].filter(Boolean) : [];
        const better = opts.filter(o => (o.club?.tier ?? 9) <= (s.currentClubTier ?? 9));
        if (better.length) s = acceptOffer(s, [...better].sort((a, b) => (a.club?.tier ?? 9) - (b.club?.tier ?? 9))[0]);
        else s = stayAtClub(s);
        break;
      }
      default: {
        const before = s.phase;
        s = advanceProSeason(s, clubs);
        if (s.phase === before) return { stuck: before };
      }
    }
  }
  const t = getCareerTotals(s.seasons || []);
  return {
    state: s, tourneys, sawTournamentPhase, totals: t,
    seasons: (s.seasons || []).length, stuck: null,
  };
}

{
  let ok = 0, stuck = 0;
  let totalTourneys = 0, involved = 0, dnq = 0, snubs = 0, played = 0, won = 0;
  let biggestSave = 0;
  let historyRows = 0, mismatches = 0;
  let capsTotal = 0, wcWinners = 0, contWinners = 0;
  const errs = [];
  for (let i = 0; i < CAREERS; i++) {
    let r;
    try {
      r = runCareer(i, { nation: NATIONS[i % NATIONS.length] });
    } catch (e) {
      fail(`career ${i} crashed: ${e && e.message}`);
      continue;
    }
    if (r.stuck) { stuck++; if (stuck <= 2) console.error(`   stuck in phase "${r.stuck}"`); continue; }
    ok++;
    const s = r.state;
    biggestSave = Math.max(biggestSave, JSON.stringify(s).length);
    const hist = s.intlHistory ?? [];
    historyRows += hist.length;
    capsTotal += s.intStats.caps;
    if (s.intStats.worldCupWins > 0) wcWinners++;
    if (s.intStats.continentalWins > 0) contWinners++;

    // Every history row must name a champion, in every single career.
    for (const h of hist) {
      totalTourneys++;
      if (!h.champion) fail(`career ${i}: a tournament in ${h.year} has no champion`);
      if (!h.myResult) continue;          // never in the picture that summer
      involved++;
      if (h.myResult === 'Did Not Qualify') dnq++;
      else if (h.myResult === 'Not Selected') snubs++;
      else { played++; if (h.myResult === 'Winner') won++; }
    }

    /* THE ROUND 102 CROSS CHECK, applied to international football. Whatever
       is in the trophy cabinet has to be exactly what the brackets say. */
    const bracketWCs = r.tourneys.filter(t => t.kind === 'World Cup' && t.champion === t.nation && t.squad?.called).length;
    const bracketConts = r.tourneys.filter(t => t.kind === 'Continental' && t.champion === t.nation && t.squad?.called).length;
    if (bracketWCs !== s.intStats.worldCupWins) {
      mismatches++;
      errs.push(`career ${i}: brackets say ${bracketWCs} World Cups, the cabinet says ${s.intStats.worldCupWins}`);
    }
    if (bracketConts !== s.intStats.continentalWins) {
      mismatches++;
      errs.push(`career ${i}: brackets say ${bracketConts} continental titles, the cabinet says ${s.intStats.continentalWins}`);
    }
    // And the season records have to agree too, which is what the legacy and
    // the Ballon d'Or actually read.
    const seasonWCs = (s.seasons || []).filter(x => x.worldCup).length;
    const seasonConts = (s.seasons || []).filter(x => x.continentalCup).length;
    if (seasonWCs !== s.intStats.worldCupWins) {
      mismatches++;
      errs.push(`career ${i}: ${seasonWCs} World Cup seasons against ${s.intStats.worldCupWins} in the international record`);
    }
    if (seasonConts !== s.intStats.continentalWins) {
      mismatches++;
      errs.push(`career ${i}: ${seasonConts} continental seasons against ${s.intStats.continentalWins} in the international record`);
    }
    if (r.totals.worldCups !== seasonWCs) {
      mismatches++;
      errs.push(`career ${i}: getCareerTotals reports ${r.totals.worldCups} World Cups, the seasons say ${seasonWCs}`);
    }
    if (r.totals.continentalCups !== seasonConts) {
      mismatches++;
      errs.push(`career ${i}: getCareerTotals reports ${r.totals.continentalCups} continental cups, the seasons say ${seasonConts}`);
    }
  }
  if (stuck) fail(`${stuck} careers got stuck in a phase with no way forward`);
  console.log(`   ${ok}/${CAREERS} careers finished, ${totalTourneys} tournaments lived through`);
  console.log(`   ${involved} of those summers the player was in the picture for`);
  console.log(`   of those: ${pct(dnq, involved)}% country did not qualify, ${pct(snubs, involved)}% left out of the squad, ${pct(played, involved)}% played`);
  console.log(`   ${pct(won, played)}% of the tournaments the player played in, he won`);
  console.log(`   ${wcWinners} careers ended with a World Cup, ${contWinners} with a continental title, average ${(capsTotal / Math.max(1, ok)).toFixed(0)} caps`);
  for (const e of errs.slice(0, 5)) fail(e);
  if (mismatches) fail(`${mismatches} careers where the cabinet and the brackets disagree`);
  if (ok < CAREERS * 0.95) fail('too many careers failed to complete');
  if (historyRows === 0) fail('no career recorded a single tournament');
  if (dnq === 0) fail('no player ever missed out because his country did not qualify');
  if (snubs === 0) fail('no player was ever left out of a squad');
  if (dnq / involved > 0.6) fail('nations fail to qualify more often than not, which is absurd');
  if (snubs / involved > 0.6) fail('players are left out more often than not, which is absurd');
  if (played === 0) fail('nobody ever actually plays in a tournament');

  /* The save goes into localStorage, so it has a ceiling. Full brackets are
     kept for the MOST RECENT tournament only and everything older collapses
     to a one line history row; keeping every 31 tie World Cup bracket for a
     twenty year career would have put megabytes in a browser's five megabyte
     store. simCup.mjs guards the Club Manager save the same way. */
  console.log(`   biggest save seen: ${(biggestSave / 1024).toFixed(0)} KB`);
  if (biggestSave > 400_000) fail('the career save has grown too large for localStorage');
}

/* ---------- 6. Paired test: does an international career change anything? ---------- */
console.log('6) An international career against a paired do nothing baseline');
{
  // Same seed means the same rolled potential, the same nation and the same
  // position on both sides, so the only difference is whether the player
  // stays in the international picture or walks away from it.
  const N = Math.max(40, Math.round(CAREERS * 0.6));
  const withIntl = [], without = [];
  for (let i = 0; i < N; i++) {
    const nation = NATIONS[i % NATIONS.length];
    try {
      const a = runCareer(i, { nation });
      const b = runCareer(i, { nation, intlOff: true });
      if (a.stuck || b.stuck) continue;
      withIntl.push(a); without.push(b);
    } catch (e) {
      fail(`paired career ${i} crashed: ${e && e.message}`);
    }
  }
  const avg = (arr, f) => arr.reduce((s, r) => s + f(r), 0) / Math.max(1, arr.length);
  // Legacy is the number the game actually shows a player at the end, and the
  // owner's ask was that a World Cup winner's career should READ differently.
  const legacyOf = r => r.state.legacy?.score ?? 0;
  const summary = arr => ({
    caps: avg(arr, r => r.state.intStats.caps),
    trophies: avg(arr, r => r.totals.worldCups + r.totals.continentalCups),
    awards: avg(arr, r => (r.state.awards || []).length),
    legacy: avg(arr, legacyOf),
  });
  const A = summary(withIntl), B = summary(without);
  console.log(`   ${withIntl.length} paired careers`);
  console.log(`   international regular: ${A.caps.toFixed(0)} caps, ${A.trophies.toFixed(2)} international trophies, ${A.awards.toFixed(1)} awards, legacy ${A.legacy.toFixed(1)}`);
  console.log(`   walked away:           ${B.caps.toFixed(0)} caps, ${B.trophies.toFixed(2)} international trophies, ${B.awards.toFixed(1)} awards, legacy ${B.legacy.toFixed(1)}`);
  if (withIntl.length < 20) fail('not enough paired careers completed to measure anything');
  if (A.caps <= B.caps * 3) fail('staying in the international picture barely wins you any caps');
  if (B.trophies > 0.01) fail('a player who retired from international football still wins international trophies');
  if (A.trophies <= 0) fail('nobody who plays international football ever wins anything');
  /* Total awards is mostly CLUB awards, which swing far harder than anything
     a summer can add, so counting all of them measures the club career. Count
     the international ones. */
  const INTL_AWARD = /^(World Cup|Euros|Copa América|AFCON|Asian Cup|Gold Cup|Nations Cup) (Best Player|Golden Boot)$/;
  const intlAwards = r => (r.state.awards || []).filter(a => INTL_AWARD.test(a.name)).length;
  const iaA = avg(withIntl, intlAwards), iaB = avg(without, intlAwards);
  console.log(`   international awards won: ${iaA.toFixed(2)} against ${iaB.toFixed(2)}`);
  if (iaA <= 0) fail('nobody ever wins a Golden Boot or a Best Player at a tournament');
  if (iaB > 0) fail('a player who never played international football won an international award');

  /* Whole career legacy is dominated by the club career and by the ceiling
     you were born with, and those swing far harder than anything a summer
     tournament can do, so comparing two independently rolled careers at this
     sample size measures the dice. The number that actually answers the
     owner's ask is the INTERNATIONAL LINE of the legacy breakdown, which is
     the same thing the player is shown at the end of his career. */
  const intLine = r => (r.state.legacy?.breakdown ?? []).find(b => b.label === 'International')?.points ?? 0;
  const scored = arr => arr.filter(r => r.state.legacy);
  const gotA = scored(withIntl), gotB = scored(without);
  const lineA = avg(gotA, intLine), lineB = avg(gotB, intLine);
  console.log(`   legacy scored for ${gotA.length} and ${gotB.length} careers`);
  console.log(`   the International line of the legacy breakdown: ${lineA.toFixed(1)} against ${lineB.toFixed(1)}`);
  if (gotA.length < 15) fail('too few careers reached a legacy score to measure it');
  if (lineA - lineB < 3) fail(`an international career is worth only ${(lineA - lineB).toFixed(1)} legacy points, so it reads the same as never playing`);

  // And a World Cup winner must score higher on that line than a man with the
  // same caps and no trophy, which is the whole point of the round.
  const champs = gotA.filter(r => r.state.intStats.worldCupWins > 0);
  const rest = gotA.filter(r => r.state.intStats.worldCupWins === 0 && r.state.intStats.caps > 20);
  if (champs.length && rest.length) {
    console.log(`   ${champs.length} World Cup winners score ${avg(champs, intLine).toFixed(1)} on that line, the other ${rest.length} capped players score ${avg(rest, intLine).toFixed(1)}`);
    if (avg(champs, intLine) <= avg(rest, intLine)) fail('winning the World Cup does not raise a career\'s legacy at all');
  } else {
    fail('not enough careers to compare a World Cup winner against a capped player without one');
  }

  // And the tournaments still ran for the player who walked away.
  const ranAnyway = without.filter(r => (r.state.intlHistory ?? []).length > 0).length;
  console.log(`   ${ranAnyway}/${without.length} of the walk-away careers still watched the tournaments happen`);
  if (ranAnyway < without.length * 0.8) fail('the world stops holding tournaments when the player is not in them');
}

/* ---------- 7. Copy check ---------- */
console.log('7) Copy check');
{
  const files = [
    'src/lib/soccerInternational.ts',
    'src/components/soccer-career/InternationalPanel.tsx',
    'scripts/simInternational.mjs',
  ];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/[–—]/.test(line) && !line.includes('─')) fail(`${f}:${i + 1} contains an em or en dash`);
    });
  }
  // The only external image host the site is allowed to touch.
  const panel = fs.readFileSync(path.join(ROOT, 'src/components/soccer-career/InternationalPanel.tsx'), 'utf8');
  const hosts = [...panel.matchAll(/https?:\/\/([^\/"'`\s)]+)/g)].map(m => m[1]);
  const bad = hosts.filter(h => h !== 'flagcdn.com');
  console.log(`   ${files.length} files checked, ${hosts.length} external hosts referenced`);
  if (bad.length) fail(`a forbidden image or asset host appeared: ${bad.join(', ')}`);
}

console.log(failures === 0 ? '\nALL INTERNATIONAL CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
