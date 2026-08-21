/* Round 184: the press room, one engine, four career games.

   The last of the five Club Manager systems named in the parity push
   (roles, press, talks, market, boards): the careers' media life used to
   be one generic podcast card that never knew what kind of season you
   just had. Now the press reacts to the actual facts on the page: win it
   all and you stand on a podium, collapse and you face the accountability
   scrum, sit on the bench and someone asks the awkward role question,
   change teams and the new city wants its introduction, play into a
   contract year and the future question follows you around.

   Every presser is three answers in three registers, the same triangle
   Club Manager's press uses: the DIPLOMAT keeps the room calm, the HONEST
   answer buys love at a small cost, and the FIREBRAND rolls dice with the
   back page. Effects are small but real, and the risky answer genuinely
   swings both ways.

   Legal shape, same as everywhere: the SPEAKER IS ALWAYS YOUR FICTIONAL
   PLAYER. Questions come from unnamed reporters ("a beat reporter",
   "the front row"), never from a named real person, and no card ever
   invents words for anyone real. The engine has no real-name inputs at
   all, so this is safe by construction.

   Shared-engine pattern per usCoachCareer (126), usCareerFreeAgency (179)
   and foOwnerMandate (180): sport words come in as data, the sport libs
   map the card into their own event shape, and the boards render it
   through the event UI they already have. Zero new screens. */

import type { UsSport } from './usCareerToCoach';

export interface PressWords {
  /** 'the Super Bowl', 'the Finals', 'the Stanley Cup', 'the World Series' */
  title: string;
  /** 'the playoffs' or 'October' */
  playoffs: string;
  /** what a bench spell is called: 'the bench', 'the second unit', ... */
  benchWord: string;
}

export const PRESS_WORDS: Record<UsSport, PressWords> = {
  nfl: { title: 'the Super Bowl', playoffs: 'the playoffs', benchWord: 'the bench' },
  nba: { title: 'the Finals', playoffs: 'the playoffs', benchWord: 'the second unit' },
  nhl: { title: 'the Stanley Cup', playoffs: 'the playoffs', benchWord: 'down the lineup' },
  mlb: { title: 'the World Series', playoffs: 'October', benchWord: 'the bench' },
};

/** What one answer does. Applied by applyPressChoice with the shared rng. */
export interface PressEffect {
  morale: number;
  fanbase: number;
  /** Firebrand answers gamble: when set, fanbase swings +gain or -risk. */
  gamble?: { gain: number; risk: number; odds: number };
}

export interface PressOption {
  label: string;
  effectLine: string;
  effect: PressEffect;
}

export interface PressMoment {
  id: string;
  title: string;
  body: string;
  /** Always [diplomat, honest, firebrand]. */
  options: [PressOption, PressOption, PressOption];
  /** Big moments preempt the ordinary offseason deck. */
  big: boolean;
}

/** The season facts the press can see. All derivable from career state. */
export interface PressFacts {
  wonTitle: boolean;
  wonMvp: boolean;
  missedPlayoffs: boolean;
  fanbase: number;
  isBackup: boolean;
  movedTeams: boolean;
  newTeamLabel: string | null;
  finalContractYear: boolean;
  seasonsPlayed: number;
}

/** Build the press moment this offseason deserves, or null for a quiet one.
    Priority: podium, scrum, introduction, then the deck-joining questions. */
export function buildPressMoment(sport: UsSport, f: PressFacts, rng: () => number): PressMoment | null {
  const w = PRESS_WORDS[sport];

  if (f.wonTitle) {
    return {
      id: 'pressTitle', big: true,
      title: 'The podium',
      body: `Confetti in your hair, a microphone in your face. The whole room wants the first word from a champion of ${w.title}.`,
      options: [
        { label: 'Credit every man in the room', effectLine: 'The locker room loves it', effect: { morale: 6, fanbase: 4 } },
        { label: 'Admit you doubted this team once', effectLine: 'The city eats honesty up', effect: { morale: -2, fanbase: 8 } },
        { label: 'Tell the doubters to start counting', effectLine: 'Instant back page, either way', effect: { morale: 4, fanbase: 0, gamble: { gain: 12, risk: 6, odds: 0.65 } } },
      ],
    };
  }

  if (f.missedPlayoffs && f.fanbase < 45 && f.seasonsPlayed >= 2) {
    return {
      id: 'pressDisaster', big: true,
      title: 'The accountability scrum',
      body: `No ${w.playoffs}, thin crowds, and a front row of reporters who counted every miss. Somebody has to answer for the season, and the cameras picked you.`,
      options: [
        { label: 'Say the right, empty things', effectLine: 'Nobody remembers it tomorrow', effect: { morale: 2, fanbase: 0 } },
        { label: 'Own every bit of it yourself', effectLine: 'Costs you, buys respect', effect: { morale: -3, fanbase: 6 } },
        { label: 'Point at the roster around you', effectLine: 'The room decides if you are right', effect: { morale: -2, fanbase: 0, gamble: { gain: 8, risk: 8, odds: 0.45 } } },
      ],
    };
  }

  if (f.movedTeams && f.newTeamLabel) {
    return {
      id: 'pressIntro', big: false,
      title: 'The introduction',
      body: `New jersey held up for the cameras. The ${f.newTeamLabel} beat writers want to know what this city is getting.`,
      options: [
        { label: 'Say all the right arrival things', effectLine: 'Clean start', effect: { morale: 3, fanbase: 3 } },
        { label: 'Tell them exactly why you left', effectLine: 'Two fanbases hear it', effect: { morale: 2, fanbase: 5 } },
        { label: 'Promise a parade', effectLine: 'They will replay this forever', effect: { morale: 3, fanbase: 0, gamble: { gain: 10, risk: 7, odds: 0.55 } } },
      ],
    };
  }

  if (f.isBackup && f.seasonsPlayed >= 1) {
    return {
      id: 'pressRole', big: false,
      title: 'The role question',
      body: `A beat reporter asks it, politely, the way they always do: how do you feel about ${w.benchWord}?`,
      options: [
        { label: 'Team first, whatever they need', effectLine: 'The coaches nod', effect: { morale: 3, fanbase: 1 } },
        { label: 'Say you believe you should start', effectLine: 'Confident, not toxic', effect: { morale: 3, fanbase: 4 } },
        { label: 'Demand the job on camera', effectLine: 'The clip goes everywhere', effect: { morale: 2, fanbase: 0, gamble: { gain: 8, risk: 8, odds: 0.5 } } },
      ],
    };
  }

  if (f.wonMvp) {
    return {
      id: 'pressAward', big: false,
      title: 'The trophy interview',
      body: 'Hardware on the table in front of you. The question is the one they always ask: what is left?',
      options: [
        { label: 'Deflect to the team goal', effectLine: 'Humble plays forever', effect: { morale: 4, fanbase: 3 } },
        { label: 'Say you want the whole mountain', effectLine: 'Ambition sells', effect: { morale: 3, fanbase: 6 } },
        { label: 'Declare a dynasty, on the record', effectLine: 'Bulletin board material', effect: { morale: 3, fanbase: 0, gamble: { gain: 10, risk: 6, odds: 0.6 } } },
      ],
    };
  }

  if (f.finalContractYear && rng() < 0.6) {
    return {
      id: 'pressContract', big: false,
      title: 'The future question',
      body: 'One year left on the deal, and every scrum ends the same way: are you staying?',
      options: [
        { label: 'Focus on this season, full stop', effectLine: 'Boring works', effect: { morale: 3, fanbase: 1 } },
        { label: 'Say you would love to stay, honestly', effectLine: 'The city relaxes', effect: { morale: 2, fanbase: 5 } },
        { label: 'Say everything is on the table', effectLine: 'Rumor mill fuel', effect: { morale: 1, fanbase: 0, gamble: { gain: 7, risk: 7, odds: 0.5 } } },
      ],
    };
  }

  return null;
}

/* The shared fields every sport's career state has. Structural typing. */
export interface PressTarget { morale: number; fanbase: number }

/** Apply one answer. Returns the feed line describing how it landed. */
export function applyPressChoice<T extends PressTarget>(c: T, opt: PressOption, rng: () => number): string {
  c.morale = Math.max(0, Math.min(100, c.morale + opt.effect.morale));
  let fanShift = opt.effect.fanbase;
  let line = `🎙️ ${opt.effectLine}.`;
  if (opt.effect.gamble) {
    const g = opt.effect.gamble;
    if (rng() < g.odds) {
      fanShift += g.gain;
      line = `🎙️ It LANDED. The clip runs all week and the city is yours (+${g.gain} fanbase).`;
    } else {
      fanShift -= g.risk;
      line = `🎙️ It backfired. The clip runs all week for the wrong reasons (${-g.risk} fanbase).`;
    }
  }
  c.fanbase = Math.max(0, Math.min(100, c.fanbase + fanShift));
  return line;
}

/** Read the press-visible facts off any sport's career state shape. */
export function pressFactsFrom(c: {
  seasons: { team: string; teamResult: string; awards: string[] }[];
  fanbase: number;
  role?: 'starter' | 'backup';
  contractYears: number;
}, newTeamLabel: string | null): PressFacts {
  const last = c.seasons[c.seasons.length - 1];
  const prev = c.seasons[c.seasons.length - 2];
  return {
    wonTitle: !!last && last.teamResult.startsWith('WON'),
    wonMvp: !!last && last.awards.includes('MVP'),
    missedPlayoffs: !!last && /Missed/.test(last.teamResult),
    fanbase: c.fanbase,
    isBackup: c.role === 'backup',
    movedTeams: !!last && !!prev && last.team !== prev.team,
    newTeamLabel,
    finalContractYear: c.contractYears === 1,
    seasonsPlayed: c.seasons.length,
  };
}
