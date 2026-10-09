/**
 * Round 834: the Soccer Career probe behind the "the awards night lift changed
 * nothing" fixture.
 *
 * Round 834 lifts Soccer Career's awards night (the Ballon d'Or shortlist and
 * countdown, the winner's speech, the World Cup winner's speech and the save
 * fields the night writes) into the shared src/lib/careerAwardsNight.ts and
 * src/components/career/AwardsNightCard.tsx. Soccer has to come out exactly as
 * it went in, and Soccer calls Math.random directly in a fixed order, so a lift
 * that reorders a single draw shifts every draw after it. This file is the one
 * procedure that measures that, used twice:
 *
 *   scripts/recordCareerAwardsNightFixture.mjs ran it ONCE, against the tree
 *   before any Round 834 code moved, and wrote
 *   scripts/data/careerAwardsNightFixture.json.
 *
 *   scripts/simCareerAwardsNight.mjs section 1 runs it again against the
 *   current tree and requires the output to match that file byte for byte.
 *
 * What it records, per career (48 of them, every nation, position, era and
 * potential band mixed, half played ambitiously and half not):
 *   - the WHOLE save, hashed after every single step the way the page writes it
 *     (JSON.stringify of the state), so any moved draw anywhere shows up;
 *   - every awards night in clear: the shortlist in order with points, the
 *     player's place, points and nomination, plus a hash of the full night
 *     (clubs, goals, trophies, nationalities);
 *   - on every night the player wins, and on every tournament the player wins,
 *     what each of the four speeches would do, each run on a copy of the save
 *     with its own seeded draws: the meters it moved, the line it wrote and the
 *     whole resulting save;
 *   - the ceremony card's server rendered markup for the first twelve careers'
 *     nights, and the tournament card's on every tournament those careers play,
 *     so the screen a player sees is part of the proof too.
 * Plus a direct speech section: sampled real saves, every option, several
 * seeds each, so both sides of every gamble are exercised.
 *
 * Every random draw goes through a seeded Math.random, restored afterwards.
 */

import { createHash } from 'node:crypto';

/** The whole state as one short string. 10 hex is 40 bits, plenty to tell two
 *  saves apart; the clear fields beside it are for reading a failure. */
export const hashOf = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 10);

/* Round 834's review gave a winning or podium night one new field, `moved`
   (what the night measurably did after the clamps), which no tree before it
   writes. It is taken out of the night before any hash, so the fixture
   recorded from main still proves everything else is unchanged; section 6 of
   scripts/simCareerAwardsNight.mjs holds the field itself. Only that one key
   is dropped, and only from a staged night, so a save is otherwise hashed
   whole. */
const withoutMeasured = night => {
  if (!night || typeof night !== 'object' || !('moved' in night)) return night;
  const { moved: _moved, ...rest } = night;
  return rest;
};
/* Round 1041 gave a played season one new field, `cupRun` (how the domestic
   cup went, drawn from its own generator), which no tree before it writes.
   It is taken out of every season row the same way, so the fixture recorded
   from main still proves the rest of the save unchanged; scripts/
   simCareerDomesticCup.mjs holds the run itself. A save with no run is
   hashed exactly as before. */
const withoutRun = r => {
  if (!r || typeof r !== 'object' || !('cupRun' in r) && !('clubCupRun' in r)) return r;
  const { cupRun: _run, clubCupRun: _clubRun, ...rest } = r;
  return rest;
};
const withoutRuns = s => {
  if (!s || typeof s !== 'object') return s;
  const runs = Array.isArray(s.seasons) && s.seasons.some(r => r && typeof r === 'object' && ('cupRun' in r || 'clubCupRun' in r));
  const pending = s.pendingSummary && typeof s.pendingSummary === 'object' && ('cupRun' in s.pendingSummary || 'clubCupRun' in s.pendingSummary);
  if (!runs && !pending) return s;
  return { ...s, ...(runs ? { seasons: s.seasons.map(withoutRun) } : {}), ...(pending ? { pendingSummary: withoutRun(s.pendingSummary) } : {}) };
};
const saveHash = s0 => {
  // Round 1172: the new immutable club campaign and its anchors are held by
  // soccerSeasonCompetitions.test.tsx; no other old save field is omitted.
  const rows = withoutRuns(s0);
  const result = rows?.lastUCLResult;
  const { seasonYear: _year, club: _club, ...legacyResult } = result ?? {};
  const s = result && ('seasonYear' in result || 'club' in result) ? { ...rows, lastUCLResult: legacyResult } : rows;
  return hashOf(s && s.pendingBallonDor && 'moved' in s.pendingBallonDor
    ? { ...s, pendingBallonDor: withoutMeasured(s.pendingBallonDor) } : s);
};

export const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** A deep copy that keeps functions by reference (an event card's choices
 *  carry `apply` functions), so a side probe can never touch the real save. */
const clone = v => {
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = clone(v[k]);
    return o;
  }
  return v;
};

export const CAREERS = 48;
const NATS = ['England', 'Brazil', 'France', 'Spain', 'Argentina', 'Nigeria', 'Japan', 'Norway'];
const POSITIONS = ['ST', 'LW', 'CAM', 'RW', 'CM', 'CB', 'GK', 'CDM'];
const ERAS = [
  { value: '1990-94', startYear: 1990 }, { value: '1995-99', startYear: 1995 },
  { value: '2000-04', startYear: 2000 }, { value: '2005-09', startYear: 2005 },
  { value: '2010-14', startYear: 2010 }, { value: '2015-19', startYear: 2015 },
  { value: '2020-24', startYear: 2020 }, { value: '2025', startYear: 2025 },
];
const POT_LADDER = [95, 92, 89, 86, 83, 80, 77, 93];
const SOCIAL = ['training_video', 'viral_celebration', 'controversial_opinion', 'charity_work', 'personal_life', 'troll_rival', 'stay_off'];
const DRILLS = ['shooting', 'pace', 'passing', 'dribbling'];
export const BDOR_SPEECHES = ['thank_rival', 'family_on_stage', 'tears', 'greatest_ever'];
export const WC_SPEECHES = ['for_the_country', 'shirt_to_the_fans', 'call_out_doubters', 'quiet_lap'];
/** The meters a speech can move, read before and after. */
const METERS = ['popularity', 'morale', 'integrityBonus', 'rivalryIntensity', 'socialMediaFollowers'];
const CODE = {
  init: 'in', youth: 'yo', contract_offer: 'co', playing: 'pl', train: 'tr', newspaper: 'np',
  season_summary: 'ss', ballon_dor: 'bd', bdor_speech: 'bs', international_debut: 'id', world_cup: 'wc',
  wc_speech: 'ws', rivalry_event: 're', social_media_action: 'sm', social_post: 'sp', cover: 'cv',
  moral_dilemma: 'md', dilemma_choice: 'dc', random_events: 'ev', red_card_appeal_result: 'ap',
  transfer_window: 'tw', rehab_choice: 'rh', retirement_suggestion: 'rs',
};

const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const tierOf = o => o?.club?.tier ?? o?.clubTier ?? 9;
const bestOffer = offers => [...offers].sort((a, b) => tierOf(a) - tierOf(b) || (b.wage ?? 0) - (a.wage ?? 0))[0];

function meterDelta(before, after) {
  const d = {};
  for (const m of METERS) {
    const a = before[m] ?? null, b = after[m] ?? null;
    if (a !== b) d[m] = b === null || a === null ? [a, b] : Math.round((b - a) * 100) / 100;
  }
  return d;
}

/** The night in clear: the shortlist in order as name:points, with each name
 *  written once in a shared table (`names`, the index before the colon; the
 *  player is P), then the full night hashed so clubs, goals and trophies count
 *  too. */
function nightRecord(c, bdor, names) {
  const ix = name => {
    let i = names.indexOf(name);
    if (i < 0) { names.push(name); i = names.length - 1; }
    return i;
  };
  return {
    c,
    year: bdor.year,
    rank: bdor.playerRank,
    pts: bdor.playerPoints,
    nom: bdor.playerNominated,
    list: bdor.nominees.map(n => `${n.isPlayer ? 'P' : ix(n.name)}:${n.points}`).join(' '),
    h: hashOf(withoutMeasured(bdor)),
  };
}

/** Run one speech on a copy of the save, with its own seeded draws. */
function trySpeech(fn, s, choice, clubs, seed) {
  const before = clone(s);
  const keep = Math.random;
  Math.random = mulberry32(seed);
  let after;
  try {
    after = fn(clone(s), choice, clubs);
  } finally {
    Math.random = keep;
  }
  const line = after.events?.length > (before.events?.length ?? 0) ? after.events[before.events.length] : null;
  return { id: choice, d: meterDelta(before, after), line, h: saveHash(after) };
}

/**
 * @param soccer the bundled src/lib/soccerCareerEngine.ts
 * @param appearance the bundled src/lib/soccerCareerAppearance.ts
 * @param cards { bdor(bdor, career) => markup, tournament(t) => markup, worldCup(wc, career) => markup }
 * @param opts.onNight (save, night) called on every ceremony as it comes up,
 *   before anything is chosen; it must not touch the save and adds nothing to
 *   the output, so a recording does not depend on it.
 * @param opts.onTournament (save, won) Round 1023: the same, on every tournament
 *   screen as it comes up, before anything is chosen.
 * @param opts.onStep (save, career index) Round 1045: the same contract, after
 *   every recorded step (scripts/simSeasonCentreNeutral.mjs reads every season
 *   the Season Centre can show from here). It must not touch the save and adds
 *   nothing to the output.
 */
export function probeAwardsNight({ soccer, appearance, cards }, { onNight, onTournament, onStep } = {}) {
  const clubs = soccer.FALLBACK_CLUBS;
  const careers = [];
  const nights = [];
  const tournaments = [];
  const bdorSamples = [];
  const wcSamples = [];
  const markup = [];
  const keptHtml = {};
  const names = [];
  const placeKind = r => r === null ? 'none' : r === 1 ? 'winner' : r <= 3 ? 'podium' : r <= 10 ? 'shortlist' : 'wider';

  for (let c = 0; c < CAREERS; c += 1) {
    const real = Math.random;
    Math.random = mulberry32(c * 7919 + 11);
    const engaged = c % 2 === 0;
    const steps = [];
    let s;
    let wins = 0, wcWins = 0, nightNo = 0;
    try {
      const era = ERAS[c % ERAS.length];
      const o = 58 + ((c * 7) % 22);
      s = soccer.initCareer(
        `Probe ${c}`, NATS[c % NATS.length], POSITIONS[(c * 3) % POSITIONS.length], era.value,
        stats(o), o, era.startYear, clubs,
        c % 3 === 0 ? appearance.defaultAppearance() : null,
        POT_LADDER[c % POT_LADDER.length],
      );
      const rec = label => { steps.push(`${CODE[label] ?? label}${saveHash(s)}`); onStep?.(s, c); };
      rec('init');
      let guard = 0, step = 0;
      while (!s.retired && guard++ < 700) {
        step += 1;
        const ph = s.phase;
        if (ph === 'retirement_ceremony' || ph === 'retired' || ph === 'post_retirement'
          || ph === 'manager_season' || ph === 'pundit_season' || ph === 'owner_season') break;
        if (engaged && ph === 'playing' && soccer.trainingAvailable(s)) {
          s = soccer.applyTrainingResult(s, DRILLS[step % DRILLS.length], 55 + ((step * 13) % 45));
          rec('train');
        }
        switch (ph) {
          case 'youth': s = soccer.advanceYouthYear(s, clubs); break;
          case 'contract_offer': {
            const offers = s.pendingOffers || [];
            s = offers.length ? soccer.acceptOffer(s, engaged ? bestOffer(offers) : offers[offers.length - 1]) : { ...s, phase: 'playing' };
            break;
          }
          case 'playing': s = soccer.advanceProSeason(s, clubs); break;
          case 'newspaper': s = soccer.dismissNewspaper(s); break;
          case 'season_summary': s = soccer.dismissSummary(s, clubs); break;
          case 'ballon_dor': {
            const bdor = s.pendingBallonDor;
            onNight?.(s, bdor);
            const night = nightRecord(c, bdor, names);
            if (c < 12 && cards) {
              const html = cards.bdor(bdor, s);
              night.ui = hashOf(html);
              const kind = placeKind(bdor.playerRank);
              if (!keptHtml[kind]) keptHtml[kind] = { night: `${c}:${bdor.year}`, html };
            }
            if (bdor.playerRank === 1) {
              night.speeches = BDOR_SPEECHES.map((choice, i) =>
                trySpeech(soccer.applyBdorSpeech, s, choice, clubs, c * 100003 + nightNo * 101 + i * 7 + 1));
              if (bdorSamples.length < 8) bdorSamples.push(clone(s));
            }
            nights.push(night);
            nightNo += 1;
            if (bdor.playerRank === 1) {
              const choice = BDOR_SPEECHES[(c + wins) % BDOR_SPEECHES.length];
              wins += 1;
              night.chose = choice;
              s = soccer.applyBdorSpeech(s, choice, clubs);
              rec('bdor_speech');
              continue;
            }
            s = soccer.dismissBallonDor(s, clubs);
            break;
          }
          case 'international_debut': s = soccer.dismissDebut(s, clubs); break;
          case 'world_cup': {
            const t = s.pendingTournament;
            const won = t ? t.myResult === 'Winner' : s.pendingWorldCup?.result === 'Winner';
            onTournament?.(s, won);
            const entry = { c, year: t?.year ?? s.pendingWorldCup?.year ?? null, name: t?.name ?? 'World Cup', result: t?.myResult ?? s.pendingWorldCup?.result ?? null };
            if (c < 12 && cards && t) entry.ui = hashOf(cards.tournament(t));
            if (won) {
              entry.speeches = WC_SPEECHES.map((choice, i) =>
                trySpeech(soccer.applyWorldCupSpeech, s, choice, clubs, c * 200003 + wcWins * 103 + i * 11 + 3));
              if (wcSamples.length < 8) wcSamples.push(clone(s));
            } else if (wcSamples.length < 4 && t && t.myResult !== 'Did Not Qualify') {
              wcSamples.push(clone(s));
            }
            tournaments.push(entry);
            if (won) {
              const choice = WC_SPEECHES[(c + wcWins) % WC_SPEECHES.length];
              wcWins += 1;
              entry.chose = choice;
              s = soccer.applyWorldCupSpeech(s, choice, clubs);
              rec('wc_speech');
              continue;
            }
            s = soccer.dismissWorldCup(s, clubs);
            break;
          }
          case 'rivalry_event': s = soccer.dismissRivalryEvent(s, clubs); break;
          case 'social_media_action': {
            if (c % 3 !== 1 && !s.socialMediaActionUsedThisSeason) {
              s = soccer.applySocialMediaAction(s, SOCIAL[(c + step) % SOCIAL.length]);
              rec('social_post');
            }
            if (s.pendingCoverAthleteEvent) {
              s = soccer.handleCoverAthleteDecision(s, step % 2 === 0);
              rec('cover');
            }
            s = soccer.dismissSocialMediaPhase(s, clubs);
            break;
          }
          case 'moral_dilemma': {
            const n = s.pendingMoralDilemma?.choices?.length ?? 1;
            s = soccer.applyMoralDilemmaChoice(s, step % Math.max(1, n));
            rec('dilemma_choice');
            if (s.phase === 'moral_dilemma') s = soccer.dismissMoralDilemma(s, clubs);
            break;
          }
          case 'random_events': {
            const ev = (s.pendingEvents || [])[0];
            if (!ev || !ev.choices || !ev.choices.length) { s = { ...s, phase: 'playing', pendingEvents: [] }; break; }
            s = soccer.applyEventChoice(s, (c + step) % ev.choices.length, clubs);
            break;
          }
          case 'red_card_appeal_result': s = soccer.dismissAppealResult(s, clubs); break;
          case 'rehab_choice': s = soccer.applyRehabChoice(s, step % 3); break;
          case 'transfer_window': {
            const sit = s.transferSituation;
            const opts = sit ? [sit.offer, sit.offerA, sit.offerB, ...(sit.offers || [])].filter(Boolean) : [];
            const better = opts.filter(o => tierOf(o) <= (s.currentClubTier ?? 9));
            if (engaged && better.length) s = soccer.acceptOffer(s, bestOffer(better));
            else if (!engaged && s.contractYearsLeft <= 1 && step % 2 === 0) s = soccer.signExtension(s);
            else s = soccer.stayAtClub(s);
            break;
          }
          case 'retirement_suggestion':
            /* Round 850 made Keep Playing play the pending season, which needs
               the clubs; a tree from before it ignores the extra argument. */
            s = s.age >= 34 ? soccer.acceptRetirementSuggestion(s) : soccer.declineRetirementSuggestion(s, clubs);
            break;
          default:
            throw new Error(`career ${c}: no driver for phase "${ph}"`);
        }
        rec(ph);
      }
    } finally {
      Math.random = real;
    }
    careers.push({ c, age: s.age, phase: s.phase, nights: nightNo, steps: steps.join(' ') });
  }

  /* Direct speeches: real saves, every option, three seeds each. */
  const speeches = [];
  const clubsList = soccer.FALLBACK_CLUBS;
  bdorSamples.forEach((st, i) => {
    BDOR_SPEECHES.forEach((choice, j) => {
      for (let k = 0; k < 3; k += 1) {
        const r = trySpeech(soccer.applyBdorSpeech, st, choice, clubsList, 900001 + i * 1009 + j * 97 + k * 13);
        speeches.push({ kind: 'bdor', sample: i, seed: k, ...r });
      }
    });
  });
  /* Release AD: the greatest_ever gamble's winning side (+8) clamps on a save
     already near the popularity cap, and after Rounds 972 and 1013 moved the
     seeded careers every one of the eight winners sat there, so the fixture
     saw only the losing side. Each sample is also tried at popularity 50, a
     state any career passes through, so both sides of the gamble are always
     exercised whatever the stream does. */
  bdorSamples.forEach((st, i) => {
    const low = { ...clone(st), popularity: 50 };
    for (let k = 0; k < 3; k += 1) {
      const r = trySpeech(soccer.applyBdorSpeech, low, 'greatest_ever', clubsList, 910001 + i * 1009 + k * 13);
      speeches.push({ kind: 'bdor-low', sample: i, seed: k, ...r });
    }
  });
  wcSamples.forEach((st, i) => {
    WC_SPEECHES.forEach((choice, j) => {
      for (let k = 0; k < 3; k += 1) {
        const r = trySpeech(soccer.applyWorldCupSpeech, st, choice, clubsList, 700001 + i * 1013 + j * 89 + k * 17);
        speeches.push({ kind: 'wc', sample: i, seed: k, ...r });
      }
    });
  });

  /* Two cards kept whole, for reading a failure; the rest are hashed. The
     World Cup cards are fixed inputs: that card only draws for a save made
     before Round 124, which no new career produces. */
  if (cards) {
    const wcFixed = (result, best) => ({
      year: 2030, nation: 'England', matches: [
        { round: 'Group', teamA: 'England', teamB: 'Japan', scoreA: 2, scoreB: 1 },
        { round: 'Final', teamA: 'England', teamB: 'Brazil', scoreA: 1, scoreB: 0 },
      ],
      playerApps: 7, playerGoals: 5, playerAssists: 2, playerAvgRating: 7.84, result, bestPlayer: best,
    });
    const wcCareer = { appearance: null, currentClubColor: '#10B981', rival: null, family: { children: 0 } };
    markup.push({ what: 'worldCup winner', html: cards.worldCup(wcFixed('Winner', true), wcCareer) });
    markup.push({ what: 'worldCup semi', ui: hashOf(cards.worldCup(wcFixed('Semi-final', false), wcCareer)) });
    markup.push({ what: 'worldCup dnq', ui: hashOf(cards.worldCup(wcFixed('Did Not Qualify', false), wcCareer)) });
    for (const kind of ['winner', 'podium', 'shortlist', 'wider', 'none']) {
      const k = keptHtml[kind];
      if (!k) markup.push({ what: `bdor ${kind}`, night: null });
      else if (kind === 'winner') markup.push({ what: `bdor ${kind}`, night: k.night, html: k.html });
      else markup.push({ what: `bdor ${kind}`, night: k.night, ui: hashOf(k.html) });
    }
  }

  return { names, careers, nights, tournaments, speeches, markup };
}
