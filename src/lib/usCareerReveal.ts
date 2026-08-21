/* Round 186: the season reveal, one engine, four career games. S-3's third
   pass ("add more animation... and all the games", standing item F).

   The biggest beat of every career loop is the moment a season resolves,
   and until now it landed as static text: the feed swallowed the story and
   the hub squeezed it into one grey line. Now the season gets its curtain:
   the year slams in, the team result lands with the weight it deserves, a
   ring pours confetti, and the story lines walk in one by one in the order
   they happened. Then you continue to the crossroads exactly as before.

   The rules of the house, learned in Round 147 and kept since:

   ANIMATE EMPHASIS, NEVER A NUMBER THROUGH FALSE VALUES. The stat line
   arrives fully formed from frame one; nothing counts up through totals
   the season never had. The theatre is in when things appear, not what
   they say.

   LOSSES STAY QUIET, per Round 149: a missed postseason gets no shake and
   no siren, because a career is thirty of these and grief theatre gets
   old in an afternoon. Confetti is reserved for the one line that earns
   it. And a suspended season gets the muted card, because animating a ban
   like a parade would be the game laughing at its own player.

   INVENT NOTHING. Every line this engine emits is a string the sport
   engines already wrote (the camp note, the season notes, the progress
   notes), passed through verbatim and only DECORATED with a tone. The
   harness pins that: output lines equal input lines, in order, always.

   Shared-engine pattern per usCoachCareer (126), usCareerFreeAgency (179),
   foOwnerMandate (180) and usCareerPress (184): the boards hand in the
   strings they already have, this decides presentation facts, and one
   shared card renders it. The reveal is TRANSIENT by design: it is never
   persisted, so a reload mid-curtain simply lands on the same screens the
   save always had, the exact precedent the free agency window set. */

/** How the big result line should carry itself. */
export type RevealResultTone = 'title' | 'out' | 'banned';

/** Per-line decoration. Tones only style; the text is untouched. */
export type RevealLineTone = 'award' | 'sting' | 'plain';

export interface RevealLine {
  text: string;
  tone: RevealLineTone;
}

export interface SeasonReveal {
  /** 'The 2029 season' */
  header: string;
  /** 'Dallas · age 24 · QB', built by the board from words it already shows */
  subHeader: string;
  /** The engine's own teamResult string, shown big. */
  result: string;
  resultTone: RevealResultTone;
  /** True iff the result line starts with 'WON THE' (every sport upper-cases
      its title this way: WON THE SUPER BOWL / NBA FINALS / STANLEY CUP /
      WORLD SERIES). The trap this dodges: MLB words EVERY playoff exit
      'Lost the ...', so any looser prefix rule would shower a World Series
      LOSS in confetti. The harness pins that exact case. */
  confetti: boolean;
  /** The board's own statLine output, passed through verbatim. Empty for a
      suspended season, which has no stats to show. */
  statLine: string;
  /** Camp note, then season notes, then progress notes, verbatim, in order. */
  lines: RevealLine[];
}

/* Leading emoji decide the line tone, because the sport engines already
   speak a consistent emoji dialect: rings and trophies and camp wins lead
   with gold, benchings and bans and injuries lead with the bad news. A
   line that starts with anything else stays plain. Styling only. */
const AWARD_LEADS = ['💍', '🏆', '🚀', '🥇'];
const STING_LEADS = ['🪑', '🚫', '🤕', '📉'];

export function toneOfLine(text: string): RevealLineTone {
  if (AWARD_LEADS.some(e => text.startsWith(e))) return 'award';
  if (STING_LEADS.some(e => text.startsWith(e))) return 'sting';
  return 'plain';
}

export interface RevealBuildArgs {
  year: number;
  /** e.g. 'Dallas · age 24 · QB' */
  subHeader: string;
  /** the SeasonLine's teamResult, or 'SUSPENDED' for a banned year */
  teamResult: string;
  /** the board's formatted stat line for the season, '' when banned */
  statLine: string;
  campNote: string | null;
  notes: string[];
  progressNotes: string[];
}

/* ---------------- Round 187: the Front Office verdict ----------------
   The GM games' season-end recap is the same beat one desk over: the
   champion is crowned, ownership grades your season, and either the
   draft opens or the door does. The recap keeps every string it had;
   this helper only decides the presentation facts, so the confetti rule
   is harnessable exactly like the career one.

   Rules: confetti belongs to the GM whose BUILD won the title, and to
   nobody else. A good grade is not a parade. And fired kills confetti
   unconditionally, belt and braces: the engine's own arithmetic already
   makes a title firing impossible (a title is always +40 trust), but a
   presentation layer should not have to trust that from a distance. */

export interface VerdictStaging {
  /** Your roster won the title and you still have the job. */
  confetti: boolean;
  /** 'title' pulses gold, 'fired' goes destructive, 'plain' stays calm. */
  cardTone: 'title' | 'fired' | 'plain';
}

export function stageVerdict(a: { iAmChampion: boolean; fired: boolean }): VerdictStaging {
  return {
    confetti: a.iAmChampion && !a.fired,
    cardTone: a.fired ? 'fired' : a.iAmChampion ? 'title' : 'plain',
  };
}

export function buildSeasonReveal(a: RevealBuildArgs): SeasonReveal {
  const banned = a.teamResult === 'SUSPENDED';
  const confetti = !banned && a.teamResult.startsWith('WON THE');
  const ordered = [
    ...(a.campNote ? [a.campNote] : []),
    ...a.notes,
    ...a.progressNotes,
  ];
  return {
    header: `The ${a.year} season`,
    subHeader: a.subHeader,
    result: banned ? 'Season served on the suspended list' : a.teamResult,
    resultTone: banned ? 'banned' : confetti ? 'title' : 'out',
    confetti,
    statLine: banned ? '' : a.statLine,
    lines: ordered.map(text => ({ text, tone: banned ? 'plain' : toneOfLine(text) })),
  };
}
