import { HigherLowerPlayer, HigherLowerStatKey } from '@/types/higherLower';

/**
 * Soccer Higher or Lower pool. Read by /higher-lower and by the three soccer
 * categories in /face-off, so a number here decides two games.
 *
 * VERIFIED ON 2026-09-12. Round 535. The full row by row record, with both
 * source URLs per row, is docs/audits/higher-lower-verification-2026-09-12.md.
 *
 * WHAT WAS WRONG BEFORE. The file shipped 204 rows and five career totals per
 * row with no source of any kind. It carried the same person twice under two
 * names (Ronaldinho and "Ronaldo de Assis (R10)" were one identical row, so
 * were Antonio and "Toni" Ruediger), it gave Lev Yashin the wrong country, and
 * it ran two conventions side by side without saying so. Pele shipped the all
 * matches pair (1,363 games, 1,281 goals), which counts friendlies and tour
 * games, in a pool where everybody else was on a competitive figure. Three
 * other rows shipped more career goals than career appearances, which is what
 * a mix inside one row looks like from the outside.
 *
 * THE CONVENTION, one rule applied to every row.
 *   internationalCaps: senior full internationals (A matches), as published.
 *   appearances, goals: senior competitive CLUB matches, all competitions
 *     (league, domestic cup, league cup, continental, super cups), excluding
 *     friendlies and tour games, excluding youth and reserve teams, and
 *     excluding international matches.
 * Where a total depends on the convention, the narrowest figure a publisher
 * actually prints ships, so the row can understate a career but never inflate
 * one, and every competing figure is named in the evidence file and nowhere in
 * the game.
 *
 * WHAT IS VERIFIED AND WHAT IS NOT. Be precise about this, it is the whole
 * point of the round.
 *
 *   internationalCaps is TWO SOURCE VERIFIED on every row below. Source one
 *   is the RSSSF record international players archive (rsssf.org), source two
 *   is the relevant Wikipedia national team records article. A row ships only
 *   where the two print the SAME number. That rule is why the pool is 70 rows
 *   and not 204: the two publishers snapshot on different dates, so a player
 *   still adding caps usually cannot be pinned, and rows that could not be
 *   pinned were removed rather than guessed. Every removal is listed in the
 *   evidence file as the queue for the next round.
 *
 *   appearances and goals are NOT two source verified and are marked as such
 *   by HL_UNVERIFIED_STATS below, which both consumers print. Every publisher
 *   that prints a club career total on this convention refused the fetch
 *   (worldfootball.net, fbref, footballdatabase.eu, playmakerstats, 11v11 and
 *   weltfussball all answered 403, transfermarkt is blocked outright) and the
 *   one that answered is a single publisher, which is not two. Removing the
 *   columns would leave a one stat pool and empty both games, so under the
 *   marking rule they stay and say so. Finishing them is the next round.
 *
 * ACTIVE PLAYERS. A cap total only stops moving when a career does, and this
 * file ships inside page snapshots that are held for weeks, so a moving number
 * would be a promise broken on a schedule. The pool is therefore weighted to
 * finished international careers by construction, the same reason the MLB pool
 * in mlbHLPlayers admits only finished careers. Where an active player is here
 * it is because both publishers printed the same number anyway.
 */

/** The day every row below was checked against its two sources. */
export const HL_VERIFIED_ON = '2026-09-12';

/** Stats in this pool that are not yet two source verified. */
export const HL_UNVERIFIED_STATS: readonly HigherLowerStatKey[] = ['appearances', 'goals'];

/** What the games say when they show one of those. */
export const HL_UNVERIFIED_NOTE =
  'Club career totals here come from one publisher, not two. We are still checking them.';

/**
 * Rows with a caveat of their own on top of the pool wide one. The rule is an
 * era cut off, not a hand picked list: a club career that finished before 1985
 * has no settled appearance or goal total, because the publishers of the time
 * counted friendlies and tour games differently and nobody has reconciled them
 * since. Pele is the loud case and the evidence file carries his three figures
 * side by side: no publisher reached in this round prints his career on the
 * convention above, so the narrowest published pair ships, being the one that
 * cannot overstate him, and the card says it is not settled.
 */
export const HL_MARKED: readonly string[] = [
  'Pelé',
  'Johan Cruyff',
  'Bobby Charlton',
  'Gerd Müller',
  'Giacinto Facchetti',
];

/** What the games say on one of those cards. */
export const HL_MARKED_NOTE =
  'Career ended before 1985, back when publishers never agreed which games counted. This club total is one of them, not a settled number.';

const MARKED_SET = new Set<string>(HL_MARKED);

/**
 * The one rule both games ask. It is derived from the two lists above rather
 * than typed into either consumer, so a stat that gets two source verified in a
 * later round stops printing its caveat everywhere at once. Returns null when
 * there is nothing to say, which is the case for internationalCaps today.
 */
export function hlNoteFor(playerName: string, stat: HigherLowerStatKey): string | null {
  if (!HL_UNVERIFIED_STATS.includes(stat)) return null;
  return MARKED_SET.has(playerName) ? HL_MARKED_NOTE : HL_UNVERIFIED_NOTE;
}

export const higherLowerPlayers: HigherLowerPlayer[] = [
  // Spain. Caps: rsssf.org span-recintlp and the Spain national team records article.
  { name: "Sergio Ramos", nationality: "Spain", isIcon: false, stats: { appearances: 830, goals: 101, internationalCaps: 180 } },
  { name: "Iker Casillas", nationality: "Spain", isIcon: true, stats: { appearances: 870, goals: 0, internationalCaps: 167 } },
  { name: "Sergio Busquets", nationality: "Spain", isIcon: false, stats: { appearances: 782, goals: 18, internationalCaps: 143 } },
  { name: "Xavi", nationality: "Spain", isIcon: true, stats: { appearances: 940, goals: 85, internationalCaps: 133 } },
  { name: "Andrés Iniesta", nationality: "Spain", isIcon: true, stats: { appearances: 874, goals: 86, internationalCaps: 131 } },
  { name: "David Silva", nationality: "Spain", isIcon: false, stats: { appearances: 680, goals: 115, internationalCaps: 125 } },
  { name: "Cesc Fàbregas", nationality: "Spain", isIcon: false, stats: { appearances: 752, goals: 98, internationalCaps: 110 } },
  { name: "Fernando Torres", nationality: "Spain", isIcon: false, stats: { appearances: 680, goals: 262, internationalCaps: 110 } },
  { name: "Raúl", nationality: "Spain", isIcon: true, stats: { appearances: 862, goals: 399, internationalCaps: 102 } },
  { name: "Gerard Piqué", nationality: "Spain", isIcon: false, stats: { appearances: 650, goals: 54, internationalCaps: 102 } },
  { name: "Carles Puyol", nationality: "Spain", isIcon: true, stats: { appearances: 593, goals: 18, internationalCaps: 100 } },
  { name: "Jordi Alba", nationality: "Spain", isIcon: false, stats: { appearances: 590, goals: 26, internationalCaps: 93 } },
  { name: "Álvaro Morata", nationality: "Spain", isIcon: false, stats: { appearances: 530, goals: 195, internationalCaps: 87 } },

  // England. Caps: rsssf.org eng-recintlp and the list of England internationals.
  { name: "Wayne Rooney", nationality: "England", isIcon: false, stats: { appearances: 763, goals: 313, internationalCaps: 120 } },
  { name: "David Beckham", nationality: "England", isIcon: true, stats: { appearances: 719, goals: 127, internationalCaps: 115 } },
  { name: "Steven Gerrard", nationality: "England", isIcon: false, stats: { appearances: 748, goals: 186, internationalCaps: 114 } },
  { name: "Frank Lampard", nationality: "England", isIcon: false, stats: { appearances: 898, goals: 271, internationalCaps: 106 } },
  { name: "Bobby Charlton", nationality: "England", isIcon: true, stats: { appearances: 758, goals: 249, internationalCaps: 106 } },
  { name: "Kyle Walker", nationality: "England", isIcon: false, stats: { appearances: 620, goals: 8, internationalCaps: 96 } },
  { name: "Raheem Sterling", nationality: "England", isIcon: false, stats: { appearances: 585, goals: 160, internationalCaps: 82 } },
  { name: "Michael Owen", nationality: "England", isIcon: true, stats: { appearances: 482, goals: 222, internationalCaps: 89 } },
  { name: "Alan Shearer", nationality: "England", isIcon: true, stats: { appearances: 559, goals: 283, internationalCaps: 63 } },

  // Brazil. Caps: rsssf.org braz-recintlp and the Brazil national team records article.
  { name: "Cafu", nationality: "Brazil", isIcon: true, stats: { appearances: 801, goals: 36, internationalCaps: 142 } },
  { name: "Dani Alves", nationality: "Brazil", isIcon: false, stats: { appearances: 910, goals: 72, internationalCaps: 126 } },
  { name: "Roberto Carlos", nationality: "Brazil", isIcon: true, stats: { appearances: 850, goals: 113, internationalCaps: 125 } },
  { name: "Thiago Silva", nationality: "Brazil", isIcon: false, stats: { appearances: 730, goals: 35, internationalCaps: 113 } },
  { name: "Ronaldo Nazário", nationality: "Brazil", isIcon: true, stats: { appearances: 518, goals: 352, internationalCaps: 98 } },
  { name: "Pelé", nationality: "Brazil", isIcon: true, stats: { appearances: 647, goals: 606, internationalCaps: 92 } },

  // Italy. Caps: rsssf.org ital-recintlp and the Italy national team records article.
  { name: "Gianluigi Buffon", nationality: "Italy", isIcon: true, stats: { appearances: 1125, goals: 0, internationalCaps: 176 } },
  { name: "Fabio Cannavaro", nationality: "Italy", isIcon: true, stats: { appearances: 669, goals: 16, internationalCaps: 136 } },
  { name: "Paolo Maldini", nationality: "Italy", isIcon: true, stats: { appearances: 902, goals: 33, internationalCaps: 126 } },
  { name: "Leonardo Bonucci", nationality: "Italy", isIcon: false, stats: { appearances: 680, goals: 35, internationalCaps: 121 } },
  { name: "Giorgio Chiellini", nationality: "Italy", isIcon: false, stats: { appearances: 685, goals: 36, internationalCaps: 117 } },
  { name: "Andrea Pirlo", nationality: "Italy", isIcon: false, stats: { appearances: 686, goals: 58, internationalCaps: 116 } },
  { name: "Giacinto Facchetti", nationality: "Italy", isIcon: true, stats: { appearances: 634, goals: 75, internationalCaps: 94 } },
  { name: "Alessandro Del Piero", nationality: "Italy", isIcon: true, stats: { appearances: 705, goals: 289, internationalCaps: 91 } },
  { name: "Nicolò Barella", nationality: "Italy", isIcon: false, stats: { appearances: 380, goals: 42, internationalCaps: 70 } },
  { name: "Ciro Immobile", nationality: "Italy", isIcon: false, stats: { appearances: 555, goals: 272, internationalCaps: 57 } },
  { name: "Roberto Baggio", nationality: "Italy", isIcon: true, stats: { appearances: 490, goals: 236, internationalCaps: 56 } },
  { name: "Claudio Marchisio", nationality: "Italy", isIcon: false, stats: { appearances: 452, goals: 47, internationalCaps: 55 } },
  { name: "Lorenzo Insigne", nationality: "Italy", isIcon: false, stats: { appearances: 510, goals: 120, internationalCaps: 54 } },
  { name: "Sandro Tonali", nationality: "Italy", isIcon: false, stats: { appearances: 260, goals: 16, internationalCaps: 32 } },

  // Germany. Caps: rsssf.org duit-recintlp and the Germany national team records article.
  { name: "Lothar Matthäus", nationality: "Germany", isIcon: true, stats: { appearances: 710, goals: 159, internationalCaps: 150 } },
  { name: "Thomas Müller", nationality: "Germany", isIcon: false, stats: { appearances: 730, goals: 245, internationalCaps: 131 } },
  { name: "Toni Kroos", nationality: "Germany", isIcon: false, stats: { appearances: 735, goals: 52, internationalCaps: 114 } },
  { name: "Philipp Lahm", nationality: "Germany", isIcon: true, stats: { appearances: 560, goals: 17, internationalCaps: 113 } },
  { name: "Oliver Kahn", nationality: "Germany", isIcon: true, stats: { appearances: 632, goals: 0, internationalCaps: 86 } },
  { name: "Gerd Müller", nationality: "Germany", isIcon: true, stats: { appearances: 607, goals: 566, internationalCaps: 62 } },
  { name: "Marco Reus", nationality: "Germany", isIcon: false, stats: { appearances: 528, goals: 170, internationalCaps: 48 } },

  // France. Caps: rsssf.org fran-recintlp and the France national team records article.
  { name: "Hugo Lloris", nationality: "France", isIcon: false, stats: { appearances: 680, goals: 0, internationalCaps: 145 } },
  { name: "Antoine Griezmann", nationality: "France", isIcon: false, stats: { appearances: 720, goals: 275, internationalCaps: 137 } },
  { name: "Thierry Henry", nationality: "France", isIcon: true, stats: { appearances: 797, goals: 411, internationalCaps: 123 } },
  { name: "Zinedine Zidane", nationality: "France", isIcon: true, stats: { appearances: 681, goals: 125, internationalCaps: 108 } },
  { name: "Patrick Vieira", nationality: "France", isIcon: true, stats: { appearances: 698, goals: 54, internationalCaps: 107 } },

  // Portugal. Caps: rsssf.org port-recintlp and the Portugal national team records article.
  { name: "Pepe", nationality: "Portugal", isIcon: false, stats: { appearances: 680, goals: 38, internationalCaps: 141 } },

  // Argentina. Caps: rsssf.org arg-recintlp and the Argentina national team records article.
  { name: "Ángel Di María", nationality: "Argentina", isIcon: false, stats: { appearances: 780, goals: 165, internationalCaps: 145 } },
  { name: "Sergio Agüero", nationality: "Argentina", isIcon: false, stats: { appearances: 692, goals: 379, internationalCaps: 101 } },
  { name: "Diego Maradona", nationality: "Argentina", isIcon: true, stats: { appearances: 592, goals: 312, internationalCaps: 91 } },

  // Netherlands. Caps: rsssf.org ned-recintlp and the Netherlands national team records article.
  { name: "Wesley Sneijder", nationality: "Netherlands", isIcon: false, stats: { appearances: 610, goals: 105, internationalCaps: 134 } },
  { name: "Robin van Persie", nationality: "Netherlands", isIcon: false, stats: { appearances: 558, goals: 276, internationalCaps: 102 } },
  { name: "Arjen Robben", nationality: "Netherlands", isIcon: false, stats: { appearances: 615, goals: 248, internationalCaps: 96 } },
  { name: "Dennis Bergkamp", nationality: "Netherlands", isIcon: true, stats: { appearances: 638, goals: 201, internationalCaps: 79 } },
  { name: "Johan Cruyff", nationality: "Netherlands", isIcon: true, stats: { appearances: 520, goals: 294, internationalCaps: 48 } },

  // Belgium. Caps: rsssf.org belg-recintlp and the Belgium national team records article.
  { name: "Eden Hazard", nationality: "Belgium", isIcon: false, stats: { appearances: 574, goals: 153, internationalCaps: 126 } },
  { name: "Dries Mertens", nationality: "Belgium", isIcon: false, stats: { appearances: 590, goals: 222, internationalCaps: 109 } },

  // Croatia. Caps: rsssf.org kroa-recintlp and the Croatia national team records article.
  { name: "Ivan Rakitić", nationality: "Croatia", isIcon: false, stats: { appearances: 670, goals: 85, internationalCaps: 106 } },

  // Uruguay. Caps: rsssf.org uru-recintlp and the Uruguay national team records article.
  { name: "Edinson Cavani", nationality: "Uruguay", isIcon: false, stats: { appearances: 680, goals: 405, internationalCaps: 136 } },

  // Chile and Japan. Caps: rsssf.org century list and the 100 or more caps list.
  { name: "Alexis Sánchez", nationality: "Chile", isIcon: false, stats: { appearances: 650, goals: 240, internationalCaps: 168 } },
  { name: "Arturo Vidal", nationality: "Chile", isIcon: false, stats: { appearances: 640, goals: 95, internationalCaps: 147 } },
  { name: "Maya Yoshida", nationality: "Japan", isIcon: false, stats: { appearances: 580, goals: 30, internationalCaps: 126 } },
];
