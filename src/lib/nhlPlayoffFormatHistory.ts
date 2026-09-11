/**
 * Round 534: the NHL playoff format, season by season, as a reference page
 * that would be worth reading if NHL Front Office did not exist.
 *
 * The same pattern Round 520 built for the Champions League and Round 522
 * built for the NFL. The 2026-08-30 AdSense recovery addendum asks for
 * "playoff system explainers" plural; this is the third.
 *
 * WHAT WAS VERIFIED. Every format change below was checked against Wikipedia
 * (the relevant season page, or the Stanley Cup and Stanley Cup playoffs
 * overview pages) and against the NHL's own account: the "History of Stanley
 * Cup Playoff Formats" section of the league's 2025 Stanley Cup Playoffs
 * information guide, a PDF the league publishes on media.nhl.com, read in
 * full on NHL_PLAYOFF_VERIFIED_ON below. Sports Illustrated's format history
 * piece, the Hockey Hall of Fame's Stanley Cup history page and two NHL.com
 * news pages back individual rows. Hockey Reference, Britannica and Last Word
 * on Sports were all attempted and all blocked (403), records.nhl.com and the
 * NHL.com all time results page answered with an empty shell and a 404, so
 * none of those appears as a source; nothing here rests on a page that could
 * not actually be read.
 *
 * THREE SMALL DISAGREEMENTS BETWEEN THE TWO ACCOUNTS ARE RECORDED RATHER THAN
 * RESOLVED. Wikipedia's 1921-22 season page says the split season was dropped
 * that year; the NHL's guide first describes the top two meeting in 1922-23.
 * The file says "the early 1920s". For 1938-39 the NHL's guide has the
 * shorter series at best of three and Wikipedia has them at best of five;
 * both agree the top two met in a best of seven and that the Final was best
 * of seven for the first time, so that is what the row claims. For 1926-27
 * the guide has a best of five Final and Wikipedia describes a best of three
 * that could stretch to five, so the row names the Final without a length.
 *
 * Seasons are keyed by the year they started: 1917 means 1917-18.
 */

export const NHL_PLAYOFF_VERIFIED_ON = '2026-09-11';

export interface NhlPlayoffSource {
  id: string;
  publisher: string;
  title: string;
  url: string;
}

export const NHL_PLAYOFF_SOURCES: NhlPlayoffSource[] = [
  { id: 'nhlguide', publisher: 'NHL', title: '2025 Stanley Cup Playoffs Information Guide: History of Stanley Cup Playoff Formats', url: 'https://media.nhl.com/site/asset/public/ext/2024-25/2025StanleyCupPlayoffs_1stRound.pdf' },
  { id: 'nhlformat', publisher: 'NHL', title: 'Playoff Format', url: 'https://www.nhl.com/info/standings-info/playoff-format' },
  { id: 'nhlchamps', publisher: 'NHL', title: 'Stanley Cup Champions 1918-1929', url: 'https://www.nhl.com/news/nhl-stanley-cup-champions-1918-1929-288144788' },
  { id: 'nhlreturn', publisher: 'NHL', title: 'Blue Jackets among 24 teams included in NHL return to play format', url: 'https://www.nhl.com/bluejackets/news/blue-jackets-among-24-nhl-teams-to-return-to-play-317031564' },
  { id: 'nhlrealign', publisher: 'NHL', title: 'NHL teams in new divisions with realignment for 2020-21 season', url: 'https://www.nhl.com/news/nhl-teams-in-new-divisions-for-2020-21-season-319844882' },
  { id: 'hhof', publisher: 'Hockey Hall of Fame', title: 'Stanley Cup History', url: 'https://www.hhof.com/thecollection/stanleycup_history.html' },
  { id: 'si', publisher: 'Sports Illustrated', title: 'NHL Stanley Cup Playoffs: Format, Teams, Rules and Changes Through the Years', url: 'https://www.si.com/nhl/nhl-stanley-cup-playoffs-format-teams-rules-changes-through-the-years' },
  { id: 'silockout', publisher: 'Sports Illustrated', title: 'Revisiting the 2004-05 NHL Lockout', url: 'https://www.si.com/nhl/2012/08/21/21revisiting-the-2004-05-nhl-lockout' },
  { id: 'wpcup', publisher: 'Wikipedia', title: 'Stanley Cup', url: 'https://en.wikipedia.org/wiki/Stanley_Cup' },
  { id: 'wpplayoffs', publisher: 'Wikipedia', title: 'Stanley Cup playoffs', url: 'https://en.wikipedia.org/wiki/Stanley_Cup_playoffs' },
  { id: 'wp1917', publisher: 'Wikipedia', title: '1917-18 NHL season', url: 'https://en.wikipedia.org/wiki/1917%E2%80%9318_NHL_season' },
  { id: 'wp1921', publisher: 'Wikipedia', title: '1921-22 NHL season', url: 'https://en.wikipedia.org/wiki/1921%E2%80%9322_NHL_season' },
  { id: 'wp1925', publisher: 'Wikipedia', title: '1925-26 NHL season', url: 'https://en.wikipedia.org/wiki/1925%E2%80%9326_NHL_season' },
  { id: 'wp1926', publisher: 'Wikipedia', title: '1926-27 NHL season', url: 'https://en.wikipedia.org/wiki/1926%E2%80%9327_NHL_season' },
  { id: 'wp1928', publisher: 'Wikipedia', title: '1928-29 NHL season', url: 'https://en.wikipedia.org/wiki/1928%E2%80%9329_NHL_season' },
  { id: 'wp1937', publisher: 'Wikipedia', title: '1937-38 NHL season', url: 'https://en.wikipedia.org/wiki/1937%E2%80%9338_NHL_season' },
  { id: 'wp1938', publisher: 'Wikipedia', title: '1938-39 NHL season', url: 'https://en.wikipedia.org/wiki/1938%E2%80%9339_NHL_season' },
  { id: 'wp1939po', publisher: 'Wikipedia', title: '1939 Stanley Cup playoffs', url: 'https://en.wikipedia.org/wiki/1939_Stanley_Cup_playoffs' },
  { id: 'wp1942', publisher: 'Wikipedia', title: '1942-43 NHL season', url: 'https://en.wikipedia.org/wiki/1942%E2%80%9343_NHL_season' },
  { id: 'wp1967', publisher: 'Wikipedia', title: '1967-68 NHL season', url: 'https://en.wikipedia.org/wiki/1967%E2%80%9368_NHL_season' },
  { id: 'wp1970', publisher: 'Wikipedia', title: '1970-71 NHL season', url: 'https://en.wikipedia.org/wiki/1970%E2%80%9371_NHL_season' },
  { id: 'wp1974', publisher: 'Wikipedia', title: '1974-75 NHL season', url: 'https://en.wikipedia.org/wiki/1974%E2%80%9375_NHL_season' },
  { id: 'wp1977', publisher: 'Wikipedia', title: '1977-78 NHL season', url: 'https://en.wikipedia.org/wiki/1977%E2%80%9378_NHL_season' },
  { id: 'wp1979', publisher: 'Wikipedia', title: '1979-80 NHL season', url: 'https://en.wikipedia.org/wiki/1979%E2%80%9380_NHL_season' },
  { id: 'wp1981', publisher: 'Wikipedia', title: '1981-82 NHL season', url: 'https://en.wikipedia.org/wiki/1981%E2%80%9382_NHL_season' },
  { id: 'wp1986', publisher: 'Wikipedia', title: '1986-87 NHL season', url: 'https://en.wikipedia.org/wiki/1986%E2%80%9387_NHL_season' },
  { id: 'wp1993', publisher: 'Wikipedia', title: '1993-94 NHL season', url: 'https://en.wikipedia.org/wiki/1993%E2%80%9394_NHL_season' },
  { id: 'wp1998', publisher: 'Wikipedia', title: '1998-99 NHL season', url: 'https://en.wikipedia.org/wiki/1998%E2%80%9399_NHL_season' },
  { id: 'wp2013', publisher: 'Wikipedia', title: '2013-14 NHL season', url: 'https://en.wikipedia.org/wiki/2013%E2%80%9314_NHL_season' },
  { id: 'wp2020po', publisher: 'Wikipedia', title: '2020 Stanley Cup playoffs', url: 'https://en.wikipedia.org/wiki/2020_Stanley_Cup_playoffs' },
  { id: 'wp2020', publisher: 'Wikipedia', title: '2020-21 NHL season', url: 'https://en.wikipedia.org/wiki/2020%E2%80%9321_NHL_season' },
];

export interface NhlPlayoffPeriod {
  id: string;
  /** First season this shape was used, keyed by its starting year (1917 is 1917-18). Inclusive. */
  from: number;
  /** Last season's starting year, inclusive; null while it is current. */
  to: number | null;
  title: string;
  /** Clubs in the league in the period's first season. */
  leagueSize: number;
  /** Clubs that qualified for the NHL's own playoff in the period's first season. */
  fieldSize: number;
  /** How the field breaks down, one sentence. */
  qualifying: string;
  notes: string[];
  /** Ids into NHL_PLAYOFF_SOURCES. At least two distinct publishers per period. */
  sources: string[];
}

export const NHL_PLAYOFF_PERIODS: NhlPlayoffPeriod[] = [
  {
    id: 'west',
    from: 1917,
    to: 1925,
    title: 'The NHL champion plays the West for the Cup',
    leagueSize: 4,
    fieldSize: 2,
    qualifying: 'The NHL played off for its own title, two teams in a two game total goals series, and the winner then met the champion of the Pacific Coast Hockey Association (later the western leagues generally) in the Stanley Cup Final.',
    notes: [
      'The Cup is older than the league. It was donated in 1892 and spent its first decades as a challenge trophy, and by the time the NHL was formed in 1917 the eastern and western champions were already meeting for it every spring. The NHL simply took the eastern seat.',
      'In the first seasons the schedule was split into two halves and the half winners played off for the right to face the West. The split season was dropped in the early 1920s (Wikipedia\'s season page says 1921-22, the NHL\'s own guide first describes the top two meeting in 1922-23), after which first met second.',
      'When the Western Canada Hockey League arrived in 1921-22 there were three champions chasing one trophy, and who met whom was redrawn more than once: some springs the two western champions played off first, one spring the NHL champion had to win a semifinal to reach the Final at all. In 1925-26 the NHL let a third team into its own playoff for the first time: second played third, the winner played first.',
      'The West folded after the 1926 Final, and from 1926-27 only NHL clubs have played for the Cup.',
    ],
    sources: ['wp1917', 'wp1921', 'wp1925', 'wpcup', 'wpplayoffs', 'nhlguide', 'nhlchamps', 'hhof'],
  },
  {
    id: 'two-divisions',
    from: 1926,
    to: 1937,
    title: 'Two divisions, six of ten qualify',
    leagueSize: 10,
    fieldSize: 6,
    qualifying: 'Ten clubs in a Canadian and an American division, five each; the top three in each division qualified.',
    notes: [
      'For the first two seasons the bracket stayed inside each division: second played third in a two game total goals series, the winner played the division leader, and the two division champions met in the Stanley Cup Final.',
      'From 1928-29 it crossed over instead. The two division winners met each other in a best of five, the two seconds played each other and the two thirds played each other in two game total goals series, and the survivors of that side met the winner of the top series in the Final.',
      'The league shrank through the Depression as clubs folded. By 1937-38, the last season of the two division shape, eight teams were left, and the Montreal Maroons played their final game that March.',
    ],
    sources: ['wp1926', 'wp1928', 'wp1937', 'nhlguide', 'wpplayoffs'],
  },
  {
    id: 'seven-teams',
    from: 1938,
    to: 1941,
    title: 'One division of seven, six qualify',
    leagueSize: 7,
    fieldSize: 6,
    qualifying: 'With the Maroons gone the two divisions were folded into one table of seven, and six of the seven made the playoffs.',
    notes: [
      'First and second met straight away in a best of seven for one place in the Final. Third played fourth and fifth played sixth in short series, then the two winners met for the other place. The NHL\'s guide has those shorter series at best of three, Wikipedia has them at best of five, and this page does not pick.',
      'What both agree on is the part that stuck: the Stanley Cup Final became a best of seven in 1939, and it has never gone back.',
    ],
    sources: ['wp1938', 'wp1939po', 'nhlguide', 'si'],
  },
  {
    id: 'original-six',
    from: 1942,
    to: 1966,
    title: 'The Original Six: four of six',
    leagueSize: 6,
    fieldSize: 4,
    qualifying: 'Six clubs, and only the top four qualified: first played third and second played fourth in best of seven semifinals, then a best of seven Final.',
    notes: [
      'The Brooklyn Americans were dropped before the 1942-43 season, leaving Boston, Chicago, Detroit, Montreal, New York and Toronto. That is the whole league for twenty five seasons, which is why the era got its name.',
      'This is the one format change that made the field smaller: six qualifiers out of seven became four out of six, and two thirds of the league still made it. Two rounds, both best of seven, is the simplest shape the tournament has ever had.',
    ],
    sources: ['wp1942', 'nhlguide', 'si'],
  },
  {
    id: 'expansion',
    from: 1967,
    to: 1973,
    title: 'Expansion: two divisions, eight teams',
    leagueSize: 12,
    fieldSize: 8,
    qualifying: 'The league doubled to twelve in one summer, split into an East division of the six old clubs and a West division of the six new ones, and the top four in each division qualified, every series best of seven.',
    notes: [
      'The two brackets ran separately, first against third and second against fourth inside each division, and the division champions met in the Final. Since every expansion club sat in the West, that guaranteed one of them a place in the Stanley Cup Final in its first year.',
      'From 1970-71 the semifinals crossed over, so an East club could meet a West club a round early. The field stayed at eight as the league kept growing.',
    ],
    sources: ['wp1967', 'wp1970', 'nhlguide', 'si'],
  },
  {
    id: 'four-divisions',
    from: 1974,
    to: 1978,
    title: 'Four divisions, twelve teams, byes',
    leagueSize: 18,
    fieldSize: 12,
    qualifying: 'Eighteen clubs in two conferences of two divisions; the top three in each division qualified, twelve in all.',
    notes: [
      'The four division winners skipped the first round. The eight seconds and thirds were pooled, ranked one to eight by record, and played a best of three preliminary round; the four survivors joined the division winners in best of seven quarterfinals, with the field reranked before every round rather than following a fixed bracket.',
      'From 1977-78 the last four places went to the best four records among clubs that finished third or lower, regardless of division, the first time the NHL used a wild card in all but name.',
    ],
    sources: ['wp1974', 'wp1977', 'nhlguide', 'si'],
  },
  {
    id: 'sixteen-of-21',
    from: 1979,
    to: 1980,
    title: 'Sixteen of twenty one, ranked one to sixteen',
    leagueSize: 21,
    fieldSize: 16,
    qualifying: 'The WHA merger took the league to twenty one clubs and the field grew to sixteen, seeded one to sixteen by record regardless of division or conference.',
    notes: [
      'The preliminary round became best of five, the three rounds after it stayed best of seven, and the highest surviving seed always drew the lowest. Sixteen is the number the playoffs have kept ever since, apart from one summer.',
    ],
    sources: ['wp1979', 'nhlguide', 'si'],
  },
  {
    id: 'divisional',
    from: 1981,
    to: 1992,
    title: 'The divisional playoffs',
    leagueSize: 21,
    fieldSize: 16,
    qualifying: 'Realigned into the Wales and Campbell conferences, each of two divisions (Adams, Patrick, Norris, Smythe), with the top four in every division qualifying and the first two rounds played entirely inside the division.',
    notes: [
      'First played fourth and second played third in a division semifinal, the winners met in a division final, the two division champions in each conference met in the conference final, and the conference champions played for the Cup. No wild cards, no crossing over: a decade of the same neighbours every April.',
      'The division semifinals were best of five until 1986-87, when they became best of seven to cut down on first round upsets. Every round has been best of seven since.',
    ],
    sources: ['wp1981', 'wp1986', 'nhlguide'],
  },
  {
    id: 'conference',
    from: 1993,
    to: 2012,
    title: 'Conference seeding, one to eight',
    leagueSize: 26,
    fieldSize: 16,
    qualifying: 'The conferences became Eastern and Western, and the top eight in each conference qualified and were seeded one to eight, the division winners taking the top seeds and one playing eight, two playing seven and so on.',
    notes: [
      'For the first five seasons the two division winners in each conference held seeds one and two. When the league realigned into six divisions in 1998-99 the three division winners took seeds one to three and the next five by points filled four to eight. Series were reseeded after each round so the best surviving seed always met the worst. All best of seven throughout.',
      'The 2004-05 season inside this period was never played, which is why the Record Books show a blank for 2005.',
    ],
    sources: ['wp1993', 'wp1998', 'nhlguide', 'si'],
  },
  {
    id: 'wild-card',
    from: 2013,
    to: null,
    title: 'Top three per division plus two wild cards',
    leagueSize: 30,
    fieldSize: 16,
    qualifying: 'Two conferences of two divisions again (Atlantic, Metropolitan, Central, Pacific): the top three in each division qualify, then the two best remaining records in each conference come in as wild cards, sixteen in all.',
    notes: [
      'The division winner with the better record draws the wild card with the worse one, the other division winner gets the other, and second plays third inside each division. The first two rounds are settled within the division, the conference finals pit the two division survivors against each other, and every series is best of seven.',
      'The only two seasons that broke the pattern were the pandemic ones, set out below. Since 2021-22 the format has been exactly this again.',
    ],
    sources: ['wp2013', 'nhlguide', 'nhlformat', 'si'],
  },
];

export interface NhlPlayoffException {
  id: string;
  /** Starting year of the season, same key as the periods. */
  season: number;
  label: string;
  title: string;
  text: string;
  sources: string[];
}

/** The four springs that did not go to plan: two with no champion, two with
 *  a one season format. Each rests on two independent publishers. */
export const NHL_PLAYOFF_EXCEPTIONS: NhlPlayoffException[] = [
  {
    id: 'flu-1919',
    season: 1918,
    label: '1919',
    title: 'The Final nobody finished',
    text: 'The 1919 Stanley Cup Final between the Montreal Canadiens and the Seattle Metropolitans was cancelled after five games because of the influenza epidemic, and no champion was named. It stayed the only blank on the trophy for the next 86 years.',
    sources: ['wpcup', 'nhlchamps'],
  },
  {
    id: 'lockout-2005',
    season: 2004,
    label: '2004-05',
    title: 'The lockout season',
    text: 'The whole 2004-05 season was cancelled on 16 February 2005 over the collective bargaining dispute, the first time a North American major league lost a full season to a labour fight. No playoffs were played and the Cup went unawarded for the first time since 1919.',
    sources: ['wpcup', 'silockout'],
  },
  {
    id: 'bubble-2020',
    season: 2019,
    label: '2019-20',
    title: 'Twenty four teams in two bubbles',
    text: 'The 2019-20 season was paused in March 2020 with games unplayed, and the league came back in August with a one off 24 team tournament, the top twelve in each conference by points percentage. The top four in each conference played a round robin for seeding while seeds five to twelve played best of five qualifying series; the survivors formed a normal sixteen team bracket of best of seven series, the whole thing played in two hub arenas, Toronto for the East and Edmonton for the West and then for the last two rounds.',
    sources: ['wp2020po', 'nhlguide', 'nhlreturn'],
  },
  {
    id: 'realign-2021',
    season: 2020,
    label: '2020-21',
    title: 'Four temporary divisions, no conferences',
    text: 'With pandemic travel rules still in force the league played a 56 game season in four one year divisions (the seven Canadian clubs together in the North) and no conferences at all. The top four in each division qualified, the first two rounds stayed inside the division, and the four division champions were reseeded by points for the semifinals, so the Final could pair any two of them. Sixteen teams, every round best of seven, and the usual shape came back the following season.',
    sources: ['wp2020', 'nhlguide', 'nhlrealign'],
  },
];

export function sourceById(id: string): NhlPlayoffSource | undefined {
  return NHL_PLAYOFF_SOURCES.find(s => s.id === id);
}

/** 1917 reads as "1917-18"; 1999 reads as "1999-00". */
export function seasonLabel(startYear: number): string {
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

export function seasonRange(p: Pick<NhlPlayoffPeriod, 'from' | 'to'>): string {
  if (p.to === null) return `${seasonLabel(p.from)} onward`;
  if (p.to === p.from) return seasonLabel(p.from);
  return `${seasonLabel(p.from)} to ${seasonLabel(p.to)}`;
}

export function periodFor(startYear: number): NhlPlayoffPeriod {
  return NHL_PLAYOFF_PERIODS.find(p => startYear >= p.from && (p.to === null || startYear <= p.to)) ?? NHL_PLAYOFF_PERIODS[NHL_PLAYOFF_PERIODS.length - 1];
}
