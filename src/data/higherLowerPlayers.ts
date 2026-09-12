import { HigherLowerPlayer, HigherLowerStatKey } from '@/types/higherLower';

/**
 * Soccer Higher or Lower pool. Read by /higher-lower and by the three soccer
 * categories in /face-off, so a number here decides two games.
 *
 * CHECKED ON 2026-09-12. Round 535. The full row by row record, with a source
 * URL per row, is docs/audits/higher-lower-verification-2026-09-12.md.
 *
 * WHAT WAS WRONG BEFORE. The file shipped 204 rows and five career totals per
 * row with no source of any kind. It carried the same person twice under two
 * names (Ronaldinho and "Ronaldo de Assis (R10)" were one identical row, so
 * were Antonio and "Toni" Ruediger), it paired Lev Yashin with the wrong
 * country and Alfredo Di Stefano's Spain caps with Argentina, and it ran two
 * conventions side by side without saying so. Pele shipped the all matches
 * pair (1,363 games, 1,281 goals), which counts friendlies and tour games, in
 * a pool where everybody else was on a competitive figure. Three other rows
 * shipped more career goals than career appearances, which is what a mix
 * inside one row looks like from the outside. Career assists and career
 * trophies were dropped outright, because no publisher prints either on any
 * agreed convention, and those two columns were deciding two games.
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
 * WHAT IS CHECKED AND WHAT IS NOT. Be precise about this, it is the whole
 * point of the round, and one treatment is applied to every column rather than
 * a strict one to caps and a lenient one to everything else.
 *
 *   internationalCaps is in one of two states on every row, and the row says
 *   which. HL_CAPS_VERIFIED holds the 70 rows where two independent
 *   publishers printed the SAME number: the RSSSF record international
 *   players archive and the relevant national team records article.
 *   HL_CAPS_MARKED holds the rest, each with the one publisher behind its
 *   figure, and both games print HL_CAPS_NOTE on those cards. Where the two
 *   publishers disagree (mostly active players whose snapshots are months
 *   apart) the evidence file carries BOTH figures and the pool ships the
 *   narrower one, named.
 *
 *   appearances and goals are not checked against a publisher on the
 *   convention above at all, and are marked as such by HL_UNVERIFIED_STATS,
 *   which both consumers print. Every publisher that prints a club career
 *   total on this convention refused the fetch (worldfootball.net, fbref,
 *   footballdatabase.eu, playmakerstats, 11v11 and weltfussball all answered
 *   403, transfermarkt is blocked outright). Removing the columns would leave
 *   a one stat pool and empty both games, so under the marking rule they stay
 *   and say so. Finishing them is the next round.
 *
 * WHY NOTHING IS DROPPED FOR BEING UNFINISHED. A first pass at this round
 * removed 134 rows, two thirds of the pool, for failing the two source test on
 * caps, while keeping appearances and goals on every row under the marking
 * rule on weaker evidence. That is two standards. The five rows below are out
 * because they are broken, not because the checking is unfinished, and
 * unfinished checking is marked instead:
 *   Ronaldo de Assis (R10) and Toni Ruediger, duplicate people.
 *   Eusebio, Romario and Ferenc Puskas, more career goals than appearances.
 *
 * ACTIVE PLAYERS. A cap total only stops moving when a career does, and this
 * file ships inside page snapshots that are held for weeks, so a moving number
 * would be a promise broken on a schedule. That is one more reason an active
 * player's caps sit in HL_CAPS_MARKED rather than in the verified list: the
 * card says the number is one publisher's snapshot and not a settled total.
 */

/** The day every row below was checked against the sources on record. */
export const HL_VERIFIED_ON = '2026-09-12';

/** Stats in this pool that are not checked against a publisher yet. */
export const HL_UNVERIFIED_STATS: readonly HigherLowerStatKey[] = ['appearances', 'goals'];

/** What the games say when they show one of those. */
export const HL_UNVERIFIED_NOTE =
  'Club totals here are not checked against a publisher on our counting rule yet. Still working on them.';

/** What the games say on a cap total that only one publisher stands behind. */
export const HL_CAPS_NOTE =
  'This cap total comes from one publisher, not the two we want. Still checking it.';

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
export const HL_PRE1985_CLUB: readonly string[] = [
  'Pelé',
  'Johan Cruyff',
  'Franz Beckenbauer',
  'George Best',
  'Gerd Müller',
  'Alfredo Di Stéfano',
  'Lev Yashin',
  'Giacinto Facchetti',
  'Bobby Charlton',
];

/** What the games say on one of those cards. */
export const HL_PRE1985_CLUB_NOTE =
  'Career ended before 1985, back when publishers never agreed which games counted. This club total is one of them, not a settled number.';

/**
 * Caps two independent publishers printed the same number for, so the figure
 * is not one house's snapshot. Source one is the RSSSF record international
 * players archive, source two is the relevant national team records article.
 * The evidence file carries both URLs per row.
 */
export const HL_CAPS_VERIFIED: readonly string[] = [
  'Pelé',
  'Diego Maradona',
  'Johan Cruyff',
  'Zinedine Zidane',
  'Ronaldo Nazário',
  'Thierry Henry',
  'Paolo Maldini',
  'David Beckham',
  'Roberto Carlos',
  'Gerd Müller',
  'Alessandro Del Piero',
  'Michael Owen',
  'Raúl',
  'Patrick Vieira',
  'Dennis Bergkamp',
  'Alan Shearer',
  'Xavi',
  'Andrés Iniesta',
  'Carles Puyol',
  'Roberto Baggio',
  'Fabio Cannavaro',
  'Cafu',
  'Toni Kroos',
  'Sergio Ramos',
  'Thomas Müller',
  'Wayne Rooney',
  'Arjen Robben',
  'Andrea Pirlo',
  'Frank Lampard',
  'Steven Gerrard',
  'Robin van Persie',
  'Fernando Torres',
  'David Silva',
  'Edinson Cavani',
  'Sergio Agüero',
  'Antoine Griezmann',
  'Eden Hazard',
  'Gianluigi Buffon',
  'Iker Casillas',
  'Dani Alves',
  'Philipp Lahm',
  'Gerard Piqué',
  'Sergio Busquets',
  'Kyle Walker',
  'Jordi Alba',
  'Raheem Sterling',
  'Thiago Silva',
  'Giorgio Chiellini',
  'Leonardo Bonucci',
  'Ciro Immobile',
  'Alexis Sánchez',
  'Dries Mertens',
  'Arturo Vidal',
  'Ivan Rakitić',
  'Pepe',
  'Hugo Lloris',
  'Cesc Fàbregas',
  'Wesley Sneijder',
  'Lothar Matthäus',
  'Giacinto Facchetti',
  'Bobby Charlton',
  'Oliver Kahn',
  'Nicolò Barella',
  'Sandro Tonali',
  'Álvaro Morata',
  'Ángel Di María',
  'Marco Reus',
  'Lorenzo Insigne',
  'Maya Yoshida',
  'Claudio Marchisio',
];

/**
 * Every other row, with the one publisher behind its cap figure. A row is in
 * exactly one of these two lists, never both and never neither, and the games
 * print HL_CAPS_NOTE on a card from this one. Shrinking this list is the next
 * round's job: a row leaves it by getting a second publisher, which is why the
 * publisher already read is recorded here rather than left in a note.
 */
export const HL_CAPS_MARKED: Record<string, string> = {
  'Franz Beckenbauer': 'https://www.rsssf.org/miscellaneous/duit-recintlp.html',
  'Ronaldinho': 'https://www.rsssf.org/miscellaneous/braz-recintlp.html',
  'Kaká': 'https://www.rsssf.org/miscellaneous/braz-recintlp.html',
  'George Best': 'https://www.rsssf.org/miscellaneous/nil-recintlp.html',
  'Michel Platini': 'https://www.rsssf.org/miscellaneous/fran-recintlp.html',
  'Marco van Basten': 'https://www.rsssf.org/miscellaneous/ned-recintlp.html',
  'Rivaldo': 'https://www.rsssf.org/miscellaneous/braz-recintlp.html',
  'Andriy Shevchenko': 'https://www.rsssf.org/miscellaneous/century.html',
  'Ruud Gullit': 'https://www.rsssf.org/miscellaneous/ned-recintlp.html',
  'Ryan Giggs': 'https://www.rsssf.org/miscellaneous/wal-recintlp.html',
  'Roy Keane': 'https://www.rsssf.org/miscellaneous/ier-recintlp.html',
  'Cristiano Ronaldo': 'https://www.rsssf.org/miscellaneous/port-recintlp.html',
  'Lionel Messi': 'https://www.rsssf.org/miscellaneous/arg-recintlp.html',
  'Neymar': 'https://www.rsssf.org/miscellaneous/century.html',
  'Kylian Mbappé': 'https://www.rsssf.org/miscellaneous/fran-recintlp.html',
  'Robert Lewandowski': 'https://www.rsssf.org/miscellaneous/century.html',
  'Erling Haaland': 'https://www.rsssf.org/miscellaneous/noo-recintlp.html',
  'Mohamed Salah': 'https://www.rsssf.org/miscellaneous/century.html',
  'Kevin De Bruyne': 'https://www.rsssf.org/miscellaneous/belg-recintlp.html',
  'Luka Modrić': 'https://www.rsssf.org/miscellaneous/kroa-recintlp.html',
  'Virgil van Dijk': 'https://www.rsssf.org/miscellaneous/ned-recintlp.html',
  'Karim Benzema': 'https://www.rsssf.org/miscellaneous/fran-recintlp.html',
  'Luis Suárez': 'https://www.rsssf.org/miscellaneous/uru-recintlp.html',
  'Zlatan Ibrahimović': 'https://www.rsssf.org/miscellaneous/century.html',
  'Franck Ribéry': 'https://www.rsssf.org/miscellaneous/fran-recintlp.html',
  'Samuel Eto\'o': 'https://www.rsssf.org/miscellaneous/century.html',
  'Didier Drogba': 'https://www.rsssf.org/miscellaneous/century.html',
  'Mesut Özil': 'https://www.rsssf.org/miscellaneous/duit-recintlp.html',
  'Pierre-Emerick Aubameyang': 'https://www.rsssf.org/miscellaneous/gab-recintlp.html',
  'Sadio Mané': 'https://www.rsssf.org/miscellaneous/century.html',
  'Son Heung-min': 'https://www.rsssf.org/miscellaneous/century.html',
  'Harry Kane': 'https://www.rsssf.org/miscellaneous/eng-recintlp.html',
  'Vinicius Jr': 'https://www.rsssf.org/miscellaneous/braz-recintlp.html',
  'Jude Bellingham': 'https://www.rsssf.org/miscellaneous/eng-recintlp.html',
  'Bukayo Saka': 'https://www.rsssf.org/miscellaneous/eng-recintlp.html',
  'Phil Foden': 'https://www.rsssf.org/miscellaneous/eng-recintlp.html',
  'Pedri': 'https://www.rsssf.org/miscellaneous/span-recintlp.html',
  'Gavi': 'https://www.rsssf.org/miscellaneous/span-recintlp.html',
  'Jamal Musiala': 'https://www.rsssf.org/miscellaneous/duit-recintlp.html',
  'Florian Wirtz': 'https://www.rsssf.org/miscellaneous/duit-recintlp.html',
  'Lamine Yamal': 'https://www.rsssf.org/miscellaneous/span-recintlp.html',
  'N\'Golo Kanté': 'https://www.rsssf.org/miscellaneous/fran-recintlp.html',
  'Raphaël Varane': 'https://www.rsssf.org/miscellaneous/fran-recintlp.html',
  'Thibaut Courtois': 'https://www.rsssf.org/miscellaneous/belg-recintlp.html',
  'Alisson Becker': 'https://www.rsssf.org/miscellaneous/braz-recintlp.html',
  'Manuel Neuer': 'https://www.rsssf.org/miscellaneous/duit-recintlp.html',
  'Jan Oblak': 'https://www.rsssf.org/miscellaneous/slov-recintlp.html',
  'Marc-André ter Stegen': 'https://www.rsssf.org/miscellaneous/duit-recintlp.html',
  'Petr Čech': 'https://www.rsssf.org/miscellaneous/century.html',
  'Marcelo': 'https://www.rsssf.org/miscellaneous/braz-recintlp.html',
  'Trent Alexander-Arnold': 'https://www.rsssf.org/miscellaneous/eng-recintlp.html',
  'Achraf Hakimi': 'https://www.rsssf.org/miscellaneous/maro-recintlp.html',
  'João Cancelo': 'https://www.rsssf.org/miscellaneous/port-recintlp.html',
  'Andrew Robertson': 'https://www.rsssf.org/miscellaneous/scot-recintlp.html',
  'Casemiro': 'https://www.rsssf.org/miscellaneous/braz-recintlp.html',
  'Joshua Kimmich': 'https://www.rsssf.org/miscellaneous/duit-recintlp.html',
  'Bruno Fernandes': 'https://www.rsssf.org/miscellaneous/port-recintlp.html',
  'Bernardo Silva': 'https://www.rsssf.org/miscellaneous/port-recintlp.html',
  'Martin Ødegaard': 'https://www.rsssf.org/miscellaneous/noo-recintlp.html',
  'Rodri': 'https://www.rsssf.org/miscellaneous/span-recintlp.html',
  'Declan Rice': 'https://www.rsssf.org/miscellaneous/eng-recintlp.html',
  'Marcus Rashford': 'https://www.rsssf.org/miscellaneous/eng-recintlp.html',
  'Jack Grealish': 'https://www.rsssf.org/miscellaneous/eng-recintlp.html',
  'James Maddison': 'https://en.wikipedia.org/wiki/James_Maddison',
  'Cole Palmer': 'https://en.wikipedia.org/wiki/Cole_Palmer',
  'Leroy Sané': 'https://www.rsssf.org/miscellaneous/duit-recintlp.html',
  'Kingsley Coman': 'https://www.rsssf.org/miscellaneous/fran-recintlp.html',
  'Ousmane Dembélé': 'https://www.rsssf.org/miscellaneous/fran-recintlp.html',
  'Rafael Leão': 'https://www.rsssf.org/miscellaneous/port-recintlp.html',
  'Federico Valverde': 'https://www.rsssf.org/miscellaneous/uru-recintlp.html',
  'Rúben Dias': 'https://www.rsssf.org/miscellaneous/port-recintlp.html',
  'William Saliba': 'https://www.rsssf.org/miscellaneous/fran-recintlp.html',
  'Kim Min-jae': 'https://www.rsssf.org/miscellaneous/skor-recintlp.html',
  'Antonio Rüdiger': 'https://www.rsssf.org/miscellaneous/duit-recintlp.html',
  'Marquinhos': 'https://www.rsssf.org/miscellaneous/braz-recintlp.html',
  'Radamel Falcao': 'https://www.rsssf.org/miscellaneous/century.html',
  'Diego Costa': 'https://www.rsssf.org/miscellaneous/span-recintlp.html',
  'Mauro Icardi': 'https://en.wikipedia.org/wiki/Mauro_Icardi',
  'Romelu Lukaku': 'https://www.rsssf.org/miscellaneous/belg-recintlp.html',
  'Yaya Touré': 'https://www.rsssf.org/miscellaneous/century.html',
  'Mats Hummels': 'https://www.rsssf.org/miscellaneous/duit-recintlp.html',
  'David de Gea': 'https://www.rsssf.org/miscellaneous/span-recintlp.html',
  'Keylor Navas': 'https://www.rsssf.org/miscellaneous/century.html',
  'Ederson': 'https://www.rsssf.org/miscellaneous/braz-recintlp.html',
  'Lautaro Martínez': 'https://www.rsssf.org/miscellaneous/arg-recintlp.html',
  'Viktor Gyökeres': 'https://www.rsssf.org/miscellaneous/zwed-recintlp.html',
  'Alexander Isak': 'https://www.rsssf.org/miscellaneous/zwed-recintlp.html',
  'Ollie Watkins': 'https://en.wikipedia.org/wiki/Ollie_Watkins',
  'Darwin Núñez': 'https://www.rsssf.org/miscellaneous/uru-recintlp.html',
  'Julián Álvarez': 'https://www.rsssf.org/miscellaneous/arg-recintlp.html',
  'Khvicha Kvaratskhelia': 'https://www.rsssf.org/miscellaneous/geor-recintlp.html',
  'Lev Yashin': 'https://www.rsssf.org/miscellaneous/ussr-recintlp.html',
  'Alfredo Di Stéfano': 'https://www.rsssf.org/miscellaneous/span-recintlp.html',
  'Hristo Stoichkov': 'https://www.rsssf.org/miscellaneous/bulg-recintlp.html',
  'Peter Schmeichel': 'https://www.rsssf.org/miscellaneous/century.html',
  'Granit Xhaka': 'https://www.rsssf.org/miscellaneous/century.html',
  'Hakan Çalhanoğlu': 'https://www.rsssf.org/miscellaneous/tur-recintlp.html',
  'Alejandro Grimaldo': 'https://en.wikipedia.org/wiki/Alejandro_Grimaldo',
  'Theo Hernández': 'https://www.rsssf.org/miscellaneous/fran-recintlp.html',
  'Dayot Upamecano': 'https://www.rsssf.org/miscellaneous/fran-recintlp.html',
  'Jules Koundé': 'https://www.rsssf.org/miscellaneous/fran-recintlp.html',
  'Ronald Araújo': 'https://www.rsssf.org/miscellaneous/uru-recintlp.html',
  'Dani Carvajal': 'https://www.rsssf.org/miscellaneous/span-recintlp.html',
  'Emiliano Martínez': 'https://www.rsssf.org/miscellaneous/arg-recintlp.html',
  'Mike Maignan': 'https://www.rsssf.org/miscellaneous/fran-recintlp.html',
  'Diogo Jota': 'https://www.rsssf.org/miscellaneous/port-recintlp.html',
  'Dušan Vlahović': 'https://www.rsssf.org/miscellaneous/joeg-recintlp.html',
  'Victor Osimhen': 'https://www.rsssf.org/miscellaneous/nig-recintlp.html',
  'Kai Havertz': 'https://www.rsssf.org/miscellaneous/duit-recintlp.html',
  'Aurélien Tchouaméni': 'https://www.rsssf.org/miscellaneous/fran-recintlp.html',
  'Enzo Fernández': 'https://www.rsssf.org/miscellaneous/arg-recintlp.html',
  'Moisés Caicedo': 'https://www.rsssf.org/miscellaneous/ecua-recintlp.html',
  'Kobbie Mainoo': 'https://en.wikipedia.org/wiki/Kobbie_Mainoo',
  'Warren Zaïre-Emery': 'https://en.wikipedia.org/wiki/Warren_Za%C3%AFre-Emery',
  'Mathys Tel': 'https://en.wikipedia.org/wiki/Mathys_Tel',
  'Xavi Simons': 'https://www.rsssf.org/miscellaneous/ned-recintlp.html',
  'Nico Williams': 'https://www.rsssf.org/miscellaneous/span-recintlp.html',
  'Alejandro Garnacho': 'https://en.wikipedia.org/wiki/Alejandro_Garnacho',
  'João Félix': 'https://www.rsssf.org/miscellaneous/port-recintlp.html',
  'Ivan Perišić': 'https://www.rsssf.org/miscellaneous/kroa-recintlp.html',
  'David Alaba': 'https://www.rsssf.org/miscellaneous/century.html',
  'Paulo Dybala': 'https://www.rsssf.org/miscellaneous/arg-recintlp.html',
  'James Rodríguez': 'https://www.rsssf.org/miscellaneous/century.html',
  'Gerard Moreno': 'https://www.rsssf.org/miscellaneous/span-recintlp.html',
  'Iker Muniain': 'https://en.wikipedia.org/wiki/Iker_Muniain',
  'Jamie Vardy': 'https://en.wikipedia.org/wiki/Jamie_Vardy',
  'Ilkay Gündoğan': 'https://www.rsssf.org/miscellaneous/duit-recintlp.html',
  'Christian Eriksen': 'https://www.rsssf.org/miscellaneous/century.html',
  'Tim Howard': 'https://www.rsssf.org/miscellaneous/century.html',
};

const CAPS_VERIFIED_SET = new Set<string>(HL_CAPS_VERIFIED);
const PRE1985_SET = new Set<string>(HL_PRE1985_CLUB);

/**
 * The one rule both games ask. It is derived from the lists above rather than
 * typed into either consumer, so a row that gets a second publisher in a later
 * round stops printing its caveat everywhere at once. Returns null when there
 * is nothing to say, which is the case for a cap total in HL_CAPS_VERIFIED.
 */
export function hlNoteFor(playerName: string, stat: HigherLowerStatKey): string | null {
  if (stat === 'internationalCaps') {
    return CAPS_VERIFIED_SET.has(playerName) ? null : HL_CAPS_NOTE;
  }
  if (!HL_UNVERIFIED_STATS.includes(stat)) return null;
  return PRE1985_SET.has(playerName) ? HL_PRE1985_CLUB_NOTE : HL_UNVERIFIED_NOTE;
}

export const higherLowerPlayers: HigherLowerPlayer[] = [
  { name: "Pelé", nationality: "Brazil", isIcon: true, stats: { appearances: 647, goals: 606, internationalCaps: 92 } },
  { name: "Diego Maradona", nationality: "Argentina", isIcon: true, stats: { appearances: 592, goals: 312, internationalCaps: 91 } },
  { name: "Johan Cruyff", nationality: "Netherlands", isIcon: true, stats: { appearances: 520, goals: 294, internationalCaps: 48 } },
  { name: "Franz Beckenbauer", nationality: "Germany", isIcon: true, stats: { appearances: 584, goals: 75, internationalCaps: 103 } },
  { name: "Ronaldinho", nationality: "Brazil", isIcon: true, stats: { appearances: 615, goals: 205, internationalCaps: 97 } },
  { name: "Zinedine Zidane", nationality: "France", isIcon: true, stats: { appearances: 681, goals: 125, internationalCaps: 108 } },
  { name: "Ronaldo Nazário", nationality: "Brazil", isIcon: true, stats: { appearances: 518, goals: 352, internationalCaps: 98 } },
  { name: "Thierry Henry", nationality: "France", isIcon: true, stats: { appearances: 797, goals: 411, internationalCaps: 123 } },
  { name: "Paolo Maldini", nationality: "Italy", isIcon: true, stats: { appearances: 902, goals: 33, internationalCaps: 126 } },
  { name: "David Beckham", nationality: "England", isIcon: true, stats: { appearances: 719, goals: 127, internationalCaps: 115 } },
  { name: "Roberto Carlos", nationality: "Brazil", isIcon: true, stats: { appearances: 850, goals: 113, internationalCaps: 125 } },
  { name: "Kaká", nationality: "Brazil", isIcon: true, stats: { appearances: 618, goals: 192, internationalCaps: 92 } },
  { name: "George Best", nationality: "Northern Ireland", isIcon: true, stats: { appearances: 586, goals: 205, internationalCaps: 37 } },
  { name: "Michel Platini", nationality: "France", isIcon: true, stats: { appearances: 580, goals: 312, internationalCaps: 72 } },
  { name: "Marco van Basten", nationality: "Netherlands", isIcon: true, stats: { appearances: 373, goals: 277, internationalCaps: 58 } },
  { name: "Gerd Müller", nationality: "Germany", isIcon: true, stats: { appearances: 607, goals: 566, internationalCaps: 62 } },
  { name: "Alessandro Del Piero", nationality: "Italy", isIcon: true, stats: { appearances: 705, goals: 289, internationalCaps: 91 } },
  { name: "Rivaldo", nationality: "Brazil", isIcon: true, stats: { appearances: 676, goals: 292, internationalCaps: 74 } },
  { name: "Michael Owen", nationality: "England", isIcon: true, stats: { appearances: 482, goals: 222, internationalCaps: 89 } },
  { name: "Raúl", nationality: "Spain", isIcon: true, stats: { appearances: 862, goals: 399, internationalCaps: 102 } },
  { name: "Andriy Shevchenko", nationality: "Ukraine", isIcon: true, stats: { appearances: 651, goals: 342, internationalCaps: 111 } },
  { name: "Patrick Vieira", nationality: "France", isIcon: true, stats: { appearances: 698, goals: 54, internationalCaps: 107 } },
  { name: "Ruud Gullit", nationality: "Netherlands", isIcon: true, stats: { appearances: 483, goals: 176, internationalCaps: 66 } },
  { name: "Dennis Bergkamp", nationality: "Netherlands", isIcon: true, stats: { appearances: 638, goals: 201, internationalCaps: 79 } },
  { name: "Alan Shearer", nationality: "England", isIcon: true, stats: { appearances: 559, goals: 283, internationalCaps: 63 } },
  { name: "Ryan Giggs", nationality: "Wales", isIcon: true, stats: { appearances: 963, goals: 168, internationalCaps: 64 } },
  { name: "Roy Keane", nationality: "Ireland", isIcon: true, stats: { appearances: 602, goals: 62, internationalCaps: 67 } },
  { name: "Xavi", nationality: "Spain", isIcon: true, stats: { appearances: 940, goals: 85, internationalCaps: 133 } },
  { name: "Andrés Iniesta", nationality: "Spain", isIcon: true, stats: { appearances: 874, goals: 86, internationalCaps: 131 } },
  { name: "Carles Puyol", nationality: "Spain", isIcon: true, stats: { appearances: 593, goals: 18, internationalCaps: 100 } },
  { name: "Roberto Baggio", nationality: "Italy", isIcon: true, stats: { appearances: 490, goals: 236, internationalCaps: 56 } },
  { name: "Fabio Cannavaro", nationality: "Italy", isIcon: true, stats: { appearances: 669, goals: 16, internationalCaps: 136 } },
  { name: "Cafu", nationality: "Brazil", isIcon: true, stats: { appearances: 801, goals: 36, internationalCaps: 142 } },
  { name: "Cristiano Ronaldo", nationality: "Portugal", isIcon: false, stats: { appearances: 1240, goals: 940, internationalCaps: 226 } },
  { name: "Lionel Messi", nationality: "Argentina", isIcon: false, stats: { appearances: 1110, goals: 860, internationalCaps: 196 } },
  { name: "Neymar", nationality: "Brazil", isIcon: false, stats: { appearances: 620, goals: 280, internationalCaps: 128 } },
  { name: "Kylian Mbappé", nationality: "France", isIcon: false, stats: { appearances: 460, goals: 310, internationalCaps: 94 } },
  { name: "Robert Lewandowski", nationality: "Poland", isIcon: false, stats: { appearances: 910, goals: 672, internationalCaps: 163 } },
  { name: "Erling Haaland", nationality: "Norway", isIcon: false, stats: { appearances: 330, goals: 280, internationalCaps: 48 } },
  { name: "Mohamed Salah", nationality: "Egypt", isIcon: false, stats: { appearances: 720, goals: 340, internationalCaps: 115 } },
  { name: "Kevin De Bruyne", nationality: "Belgium", isIcon: false, stats: { appearances: 610, goals: 120, internationalCaps: 115 } },
  { name: "Luka Modrić", nationality: "Croatia", isIcon: false, stats: { appearances: 850, goals: 80, internationalCaps: 194 } },
  { name: "Toni Kroos", nationality: "Germany", isIcon: false, stats: { appearances: 735, goals: 52, internationalCaps: 114 } },
  { name: "Sergio Ramos", nationality: "Spain", isIcon: false, stats: { appearances: 830, goals: 101, internationalCaps: 180 } },
  { name: "Virgil van Dijk", nationality: "Netherlands", isIcon: false, stats: { appearances: 575, goals: 48, internationalCaps: 88 } },
  { name: "Karim Benzema", nationality: "France", isIcon: false, stats: { appearances: 860, goals: 435, internationalCaps: 97 } },
  { name: "Luis Suárez", nationality: "Uruguay", isIcon: false, stats: { appearances: 770, goals: 500, internationalCaps: 138 } },
  { name: "Zlatan Ibrahimović", nationality: "Sweden", isIcon: false, stats: { appearances: 860, goals: 496, internationalCaps: 122 } },
  { name: "Thomas Müller", nationality: "Germany", isIcon: false, stats: { appearances: 730, goals: 245, internationalCaps: 131 } },
  { name: "Wayne Rooney", nationality: "England", isIcon: false, stats: { appearances: 763, goals: 313, internationalCaps: 120 } },
  { name: "Franck Ribéry", nationality: "France", isIcon: false, stats: { appearances: 620, goals: 135, internationalCaps: 81 } },
  { name: "Arjen Robben", nationality: "Netherlands", isIcon: false, stats: { appearances: 615, goals: 248, internationalCaps: 96 } },
  { name: "Andrea Pirlo", nationality: "Italy", isIcon: false, stats: { appearances: 686, goals: 58, internationalCaps: 116 } },
  { name: "Samuel Eto'o", nationality: "Cameroon", isIcon: false, stats: { appearances: 718, goals: 395, internationalCaps: 118 } },
  { name: "Didier Drogba", nationality: "Ivory Coast", isIcon: false, stats: { appearances: 650, goals: 305, internationalCaps: 105 } },
  { name: "Frank Lampard", nationality: "England", isIcon: false, stats: { appearances: 898, goals: 271, internationalCaps: 106 } },
  { name: "Steven Gerrard", nationality: "England", isIcon: false, stats: { appearances: 748, goals: 186, internationalCaps: 114 } },
  { name: "Robin van Persie", nationality: "Netherlands", isIcon: false, stats: { appearances: 558, goals: 276, internationalCaps: 102 } },
  { name: "Fernando Torres", nationality: "Spain", isIcon: false, stats: { appearances: 680, goals: 262, internationalCaps: 110 } },
  { name: "David Silva", nationality: "Spain", isIcon: false, stats: { appearances: 680, goals: 115, internationalCaps: 125 } },
  { name: "Mesut Özil", nationality: "Germany", isIcon: false, stats: { appearances: 580, goals: 85, internationalCaps: 92 } },
  { name: "Edinson Cavani", nationality: "Uruguay", isIcon: false, stats: { appearances: 680, goals: 405, internationalCaps: 136 } },
  { name: "Pierre-Emerick Aubameyang", nationality: "Gabon", isIcon: false, stats: { appearances: 585, goals: 310, internationalCaps: 86 } },
  { name: "Sergio Agüero", nationality: "Argentina", isIcon: false, stats: { appearances: 692, goals: 379, internationalCaps: 101 } },
  { name: "Antoine Griezmann", nationality: "France", isIcon: false, stats: { appearances: 720, goals: 275, internationalCaps: 137 } },
  { name: "Eden Hazard", nationality: "Belgium", isIcon: false, stats: { appearances: 574, goals: 153, internationalCaps: 126 } },
  { name: "Sadio Mané", nationality: "Senegal", isIcon: false, stats: { appearances: 620, goals: 235, internationalCaps: 126 } },
  { name: "Son Heung-min", nationality: "South Korea", isIcon: false, stats: { appearances: 600, goals: 220, internationalCaps: 140 } },
  { name: "Harry Kane", nationality: "England", isIcon: false, stats: { appearances: 640, goals: 395, internationalCaps: 112 } },
  { name: "Vinicius Jr", nationality: "Brazil", isIcon: false, stats: { appearances: 360, goals: 132, internationalCaps: 45 } },
  { name: "Jude Bellingham", nationality: "England", isIcon: false, stats: { appearances: 300, goals: 78, internationalCaps: 46 } },
  { name: "Bukayo Saka", nationality: "England", isIcon: false, stats: { appearances: 290, goals: 78, internationalCaps: 48 } },
  { name: "Phil Foden", nationality: "England", isIcon: false, stats: { appearances: 315, goals: 88, internationalCaps: 47 } },
  { name: "Pedri", nationality: "Spain", isIcon: false, stats: { appearances: 245, goals: 27, internationalCaps: 38 } },
  { name: "Gavi", nationality: "Spain", isIcon: false, stats: { appearances: 185, goals: 15, internationalCaps: 28 } },
  { name: "Jamal Musiala", nationality: "Germany", isIcon: false, stats: { appearances: 250, goals: 65, internationalCaps: 40 } },
  { name: "Florian Wirtz", nationality: "Germany", isIcon: false, stats: { appearances: 235, goals: 60, internationalCaps: 37 } },
  { name: "Lamine Yamal", nationality: "Spain", isIcon: false, stats: { appearances: 120, goals: 22, internationalCaps: 23 } },
  { name: "N'Golo Kanté", nationality: "France", isIcon: false, stats: { appearances: 550, goals: 24, internationalCaps: 65 } },
  { name: "Raphaël Varane", nationality: "France", isIcon: false, stats: { appearances: 510, goals: 20, internationalCaps: 93 } },
  { name: "Thibaut Courtois", nationality: "Belgium", isIcon: false, stats: { appearances: 570, goals: 0, internationalCaps: 107 } },
  { name: "Alisson Becker", nationality: "Brazil", isIcon: false, stats: { appearances: 475, goals: 1, internationalCaps: 76 } },
  { name: "Manuel Neuer", nationality: "Germany", isIcon: false, stats: { appearances: 750, goals: 0, internationalCaps: 124 } },
  { name: "Jan Oblak", nationality: "Slovenia", isIcon: false, stats: { appearances: 520, goals: 0, internationalCaps: 82 } },
  { name: "Marc-André ter Stegen", nationality: "Germany", isIcon: false, stats: { appearances: 490, goals: 0, internationalCaps: 44 } },
  { name: "Gianluigi Buffon", nationality: "Italy", isIcon: true, stats: { appearances: 1125, goals: 0, internationalCaps: 176 } },
  { name: "Iker Casillas", nationality: "Spain", isIcon: true, stats: { appearances: 870, goals: 0, internationalCaps: 167 } },
  { name: "Petr Čech", nationality: "Czech Republic", isIcon: false, stats: { appearances: 670, goals: 0, internationalCaps: 124 } },
  { name: "Dani Alves", nationality: "Brazil", isIcon: false, stats: { appearances: 910, goals: 72, internationalCaps: 126 } },
  { name: "Marcelo", nationality: "Brazil", isIcon: false, stats: { appearances: 680, goals: 51, internationalCaps: 58 } },
  { name: "Philipp Lahm", nationality: "Germany", isIcon: true, stats: { appearances: 560, goals: 17, internationalCaps: 113 } },
  { name: "Gerard Piqué", nationality: "Spain", isIcon: false, stats: { appearances: 650, goals: 54, internationalCaps: 102 } },
  { name: "Sergio Busquets", nationality: "Spain", isIcon: false, stats: { appearances: 782, goals: 18, internationalCaps: 143 } },
  { name: "Trent Alexander-Arnold", nationality: "England", isIcon: false, stats: { appearances: 375, goals: 24, internationalCaps: 34 } },
  { name: "Achraf Hakimi", nationality: "Morocco", isIcon: false, stats: { appearances: 345, goals: 38, internationalCaps: 92 } },
  { name: "João Cancelo", nationality: "Portugal", isIcon: false, stats: { appearances: 440, goals: 18, internationalCaps: 64 } },
  { name: "Andrew Robertson", nationality: "Scotland", isIcon: false, stats: { appearances: 455, goals: 11, internationalCaps: 90 } },
  { name: "Kyle Walker", nationality: "England", isIcon: false, stats: { appearances: 620, goals: 8, internationalCaps: 96 } },
  { name: "Jordi Alba", nationality: "Spain", isIcon: false, stats: { appearances: 590, goals: 26, internationalCaps: 93 } },
  { name: "Casemiro", nationality: "Brazil", isIcon: false, stats: { appearances: 580, goals: 44, internationalCaps: 82 } },
  { name: "Joshua Kimmich", nationality: "Germany", isIcon: false, stats: { appearances: 465, goals: 34, internationalCaps: 106 } },
  { name: "Bruno Fernandes", nationality: "Portugal", isIcon: false, stats: { appearances: 565, goals: 152, internationalCaps: 85 } },
  { name: "Bernardo Silva", nationality: "Portugal", isIcon: false, stats: { appearances: 515, goals: 75, internationalCaps: 107 } },
  { name: "Martin Ødegaard", nationality: "Norway", isIcon: false, stats: { appearances: 375, goals: 65, internationalCaps: 67 } },
  { name: "Rodri", nationality: "Spain", isIcon: false, stats: { appearances: 395, goals: 39, internationalCaps: 59 } },
  { name: "Declan Rice", nationality: "England", isIcon: false, stats: { appearances: 355, goals: 21, internationalCaps: 72 } },
  { name: "Marcus Rashford", nationality: "England", isIcon: false, stats: { appearances: 435, goals: 142, internationalCaps: 68 } },
  { name: "Raheem Sterling", nationality: "England", isIcon: false, stats: { appearances: 585, goals: 160, internationalCaps: 82 } },
  { name: "Jack Grealish", nationality: "England", isIcon: false, stats: { appearances: 370, goals: 45, internationalCaps: 39 } },
  { name: "James Maddison", nationality: "England", isIcon: false, stats: { appearances: 365, goals: 62, internationalCaps: 7 } },
  { name: "Cole Palmer", nationality: "England", isIcon: false, stats: { appearances: 210, goals: 68, internationalCaps: 14 } },
  { name: "Leroy Sané", nationality: "Germany", isIcon: false, stats: { appearances: 430, goals: 95, internationalCaps: 72 } },
  { name: "Kingsley Coman", nationality: "France", isIcon: false, stats: { appearances: 410, goals: 66, internationalCaps: 61 } },
  { name: "Ousmane Dembélé", nationality: "France", isIcon: false, stats: { appearances: 400, goals: 80, internationalCaps: 57 } },
  { name: "Rafael Leão", nationality: "Portugal", isIcon: false, stats: { appearances: 315, goals: 70, internationalCaps: 43 } },
  { name: "Federico Valverde", nationality: "Uruguay", isIcon: false, stats: { appearances: 325, goals: 33, internationalCaps: 55 } },
  { name: "Rúben Dias", nationality: "Portugal", isIcon: false, stats: { appearances: 375, goals: 13, internationalCaps: 74 } },
  { name: "William Saliba", nationality: "France", isIcon: false, stats: { appearances: 255, goals: 8, internationalCaps: 31 } },
  { name: "Kim Min-jae", nationality: "South Korea", isIcon: false, stats: { appearances: 295, goals: 9, internationalCaps: 75 } },
  { name: "Antonio Rüdiger", nationality: "Germany", isIcon: false, stats: { appearances: 475, goals: 20, internationalCaps: 81 } },
  { name: "Marquinhos", nationality: "Brazil", isIcon: false, stats: { appearances: 565, goals: 40, internationalCaps: 103 } },
  { name: "Thiago Silva", nationality: "Brazil", isIcon: false, stats: { appearances: 730, goals: 35, internationalCaps: 113 } },
  { name: "Giorgio Chiellini", nationality: "Italy", isIcon: false, stats: { appearances: 685, goals: 36, internationalCaps: 117 } },
  { name: "Leonardo Bonucci", nationality: "Italy", isIcon: false, stats: { appearances: 680, goals: 35, internationalCaps: 121 } },
  { name: "Ciro Immobile", nationality: "Italy", isIcon: false, stats: { appearances: 555, goals: 272, internationalCaps: 57 } },
  { name: "Radamel Falcao", nationality: "Colombia", isIcon: false, stats: { appearances: 580, goals: 315, internationalCaps: 104 } },
  { name: "Diego Costa", nationality: "Spain", isIcon: false, stats: { appearances: 480, goals: 210, internationalCaps: 24 } },
  { name: "Alexis Sánchez", nationality: "Chile", isIcon: false, stats: { appearances: 650, goals: 240, internationalCaps: 168 } },
  { name: "Mauro Icardi", nationality: "Argentina", isIcon: false, stats: { appearances: 425, goals: 230, internationalCaps: 8 } },
  { name: "Romelu Lukaku", nationality: "Belgium", isIcon: false, stats: { appearances: 635, goals: 322, internationalCaps: 124 } },
  { name: "Dries Mertens", nationality: "Belgium", isIcon: false, stats: { appearances: 590, goals: 222, internationalCaps: 109 } },
  { name: "Yaya Touré", nationality: "Ivory Coast", isIcon: false, stats: { appearances: 580, goals: 88, internationalCaps: 101 } },
  { name: "Arturo Vidal", nationality: "Chile", isIcon: false, stats: { appearances: 640, goals: 95, internationalCaps: 147 } },
  { name: "Ivan Rakitić", nationality: "Croatia", isIcon: false, stats: { appearances: 670, goals: 85, internationalCaps: 106 } },
  { name: "Mats Hummels", nationality: "Germany", isIcon: false, stats: { appearances: 610, goals: 44, internationalCaps: 78 } },
  { name: "Pepe", nationality: "Portugal", isIcon: false, stats: { appearances: 680, goals: 38, internationalCaps: 141 } },
  { name: "Hugo Lloris", nationality: "France", isIcon: false, stats: { appearances: 680, goals: 0, internationalCaps: 145 } },
  { name: "David de Gea", nationality: "Spain", isIcon: false, stats: { appearances: 560, goals: 0, internationalCaps: 45 } },
  { name: "Keylor Navas", nationality: "Costa Rica", isIcon: false, stats: { appearances: 530, goals: 0, internationalCaps: 126 } },
  { name: "Ederson", nationality: "Brazil", isIcon: false, stats: { appearances: 380, goals: 0, internationalCaps: 30 } },
  { name: "Lautaro Martínez", nationality: "Argentina", isIcon: false, stats: { appearances: 390, goals: 192, internationalCaps: 75 } },
  { name: "Viktor Gyökeres", nationality: "Sweden", isIcon: false, stats: { appearances: 320, goals: 155, internationalCaps: 30 } },
  { name: "Alexander Isak", nationality: "Sweden", isIcon: false, stats: { appearances: 345, goals: 140, internationalCaps: 56 } },
  { name: "Ollie Watkins", nationality: "England", isIcon: false, stats: { appearances: 375, goals: 122, internationalCaps: 24 } },
  { name: "Darwin Núñez", nationality: "Uruguay", isIcon: false, stats: { appearances: 325, goals: 132, internationalCaps: 22 } },
  { name: "Julián Álvarez", nationality: "Argentina", isIcon: false, stats: { appearances: 310, goals: 118, internationalCaps: 49 } },
  { name: "Khvicha Kvaratskhelia", nationality: "Georgia", isIcon: false, stats: { appearances: 275, goals: 64, internationalCaps: 47 } },
  { name: "Cesc Fàbregas", nationality: "Spain", isIcon: false, stats: { appearances: 752, goals: 98, internationalCaps: 110 } },
  { name: "Wesley Sneijder", nationality: "Netherlands", isIcon: false, stats: { appearances: 610, goals: 105, internationalCaps: 134 } },
  { name: "Lev Yashin", nationality: "Soviet Union", isIcon: true, stats: { appearances: 570, goals: 0, internationalCaps: 74 } },
  { name: "Alfredo Di Stéfano", nationality: "Spain", isIcon: true, stats: { appearances: 654, goals: 510, internationalCaps: 31 } },
  { name: "Lothar Matthäus", nationality: "Germany", isIcon: true, stats: { appearances: 710, goals: 159, internationalCaps: 150 } },
  { name: "Giacinto Facchetti", nationality: "Italy", isIcon: true, stats: { appearances: 634, goals: 75, internationalCaps: 94 } },
  { name: "Bobby Charlton", nationality: "England", isIcon: true, stats: { appearances: 758, goals: 249, internationalCaps: 106 } },
  { name: "Hristo Stoichkov", nationality: "Bulgaria", isIcon: true, stats: { appearances: 595, goals: 259, internationalCaps: 83 } },
  { name: "Peter Schmeichel", nationality: "Denmark", isIcon: true, stats: { appearances: 693, goals: 0, internationalCaps: 129 } },
  { name: "Oliver Kahn", nationality: "Germany", isIcon: true, stats: { appearances: 632, goals: 0, internationalCaps: 86 } },
  { name: "Granit Xhaka", nationality: "Switzerland", isIcon: false, stats: { appearances: 560, goals: 48, internationalCaps: 143 } },
  { name: "Nicolò Barella", nationality: "Italy", isIcon: false, stats: { appearances: 380, goals: 42, internationalCaps: 70 } },
  { name: "Hakan Çalhanoğlu", nationality: "Turkey", isIcon: false, stats: { appearances: 490, goals: 88, internationalCaps: 102 } },
  { name: "Alejandro Grimaldo", nationality: "Spain", isIcon: false, stats: { appearances: 380, goals: 42, internationalCaps: 14 } },
  { name: "Theo Hernández", nationality: "France", isIcon: false, stats: { appearances: 330, goals: 36, internationalCaps: 41 } },
  { name: "Dayot Upamecano", nationality: "France", isIcon: false, stats: { appearances: 310, goals: 10, internationalCaps: 35 } },
  { name: "Jules Koundé", nationality: "France", isIcon: false, stats: { appearances: 295, goals: 10, internationalCaps: 46 } },
  { name: "Ronald Araújo", nationality: "Uruguay", isIcon: false, stats: { appearances: 200, goals: 10, internationalCaps: 16 } },
  { name: "Dani Carvajal", nationality: "Spain", isIcon: false, stats: { appearances: 490, goals: 18, internationalCaps: 52 } },
  { name: "Emiliano Martínez", nationality: "Argentina", isIcon: false, stats: { appearances: 350, goals: 0, internationalCaps: 57 } },
  { name: "Mike Maignan", nationality: "France", isIcon: false, stats: { appearances: 320, goals: 0, internationalCaps: 37 } },
  { name: "Diogo Jota", nationality: "Portugal", isIcon: false, stats: { appearances: 370, goals: 112, internationalCaps: 49 } },
  { name: "Dušan Vlahović", nationality: "Serbia", isIcon: false, stats: { appearances: 300, goals: 128, internationalCaps: 41 } },
  { name: "Victor Osimhen", nationality: "Nigeria", isIcon: false, stats: { appearances: 310, goals: 148, internationalCaps: 51 } },
  { name: "Kai Havertz", nationality: "Germany", isIcon: false, stats: { appearances: 380, goals: 88, internationalCaps: 55 } },
  { name: "Aurélien Tchouaméni", nationality: "France", isIcon: false, stats: { appearances: 280, goals: 14, internationalCaps: 43 } },
  { name: "Enzo Fernández", nationality: "Argentina", isIcon: false, stats: { appearances: 245, goals: 18, internationalCaps: 37 } },
  { name: "Moisés Caicedo", nationality: "Ecuador", isIcon: false, stats: { appearances: 225, goals: 10, internationalCaps: 58 } },
  { name: "Sandro Tonali", nationality: "Italy", isIcon: false, stats: { appearances: 260, goals: 16, internationalCaps: 32 } },
  { name: "Kobbie Mainoo", nationality: "England", isIcon: false, stats: { appearances: 95, goals: 6, internationalCaps: 14 } },
  { name: "Warren Zaïre-Emery", nationality: "France", isIcon: false, stats: { appearances: 120, goals: 8, internationalCaps: 13 } },
  { name: "Mathys Tel", nationality: "France", isIcon: false, stats: { appearances: 130, goals: 22, internationalCaps: 0 } },
  { name: "Xavi Simons", nationality: "Netherlands", isIcon: false, stats: { appearances: 175, goals: 38, internationalCaps: 32 } },
  { name: "Nico Williams", nationality: "Spain", isIcon: false, stats: { appearances: 175, goals: 28, internationalCaps: 30 } },
  { name: "Alejandro Garnacho", nationality: "Argentina", isIcon: false, stats: { appearances: 140, goals: 24, internationalCaps: 8 } },
  { name: "João Félix", nationality: "Portugal", isIcon: false, stats: { appearances: 325, goals: 78, internationalCaps: 50 } },
  { name: "Álvaro Morata", nationality: "Spain", isIcon: false, stats: { appearances: 530, goals: 195, internationalCaps: 87 } },
  { name: "Ángel Di María", nationality: "Argentina", isIcon: false, stats: { appearances: 780, goals: 165, internationalCaps: 145 } },
  { name: "Ivan Perišić", nationality: "Croatia", isIcon: false, stats: { appearances: 620, goals: 120, internationalCaps: 150 } },
  { name: "David Alaba", nationality: "Austria", isIcon: false, stats: { appearances: 515, goals: 40, internationalCaps: 111 } },
  { name: "Marco Reus", nationality: "Germany", isIcon: false, stats: { appearances: 528, goals: 170, internationalCaps: 48 } },
  { name: "Paulo Dybala", nationality: "Argentina", isIcon: false, stats: { appearances: 475, goals: 155, internationalCaps: 40 } },
  { name: "James Rodríguez", nationality: "Colombia", isIcon: false, stats: { appearances: 520, goals: 98, internationalCaps: 122 } },
  { name: "Gerard Moreno", nationality: "Spain", isIcon: false, stats: { appearances: 420, goals: 145, internationalCaps: 18 } },
  { name: "Iker Muniain", nationality: "Spain", isIcon: false, stats: { appearances: 520, goals: 65, internationalCaps: 2 } },
  { name: "Lorenzo Insigne", nationality: "Italy", isIcon: false, stats: { appearances: 510, goals: 120, internationalCaps: 54 } },
  { name: "Jamie Vardy", nationality: "England", isIcon: false, stats: { appearances: 525, goals: 205, internationalCaps: 26 } },
  { name: "Ilkay Gündoğan", nationality: "Germany", isIcon: false, stats: { appearances: 580, goals: 82, internationalCaps: 82 } },
  { name: "Christian Eriksen", nationality: "Denmark", isIcon: false, stats: { appearances: 600, goals: 105, internationalCaps: 147 } },
  { name: "Maya Yoshida", nationality: "Japan", isIcon: false, stats: { appearances: 580, goals: 30, internationalCaps: 126 } },
  { name: "Tim Howard", nationality: "USA", isIcon: false, stats: { appearances: 625, goals: 0, internationalCaps: 121 } },
  { name: "Claudio Marchisio", nationality: "Italy", isIcon: false, stats: { appearances: 452, goals: 47, internationalCaps: 55 } },
];
