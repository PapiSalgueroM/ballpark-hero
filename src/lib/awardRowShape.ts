/**
 * Round 708. The shape test every reader of soccer_awards runs before a row
 * can reach a game.
 *
 * soccer_awards is several wiki tables scraped into one, and the scrape put
 * whatever sat in each cell into whichever column came next. Measured
 * 2026-09-30 with read only SQL: the three World Cup awards (Golden Boot,
 * Golden Glove, Best Young Player) are 131 rows each, the SAME 131 rows
 * copied under all three names. 183 of those 393 rows are junk shaped:
 * winner_name holds the outlet that picked an all star team ('ESPN Deportes',
 * 'Associated Press'), a count ('1'), a whole nation ('Colombia',
 * 'England France'), or several players at once, and club_or_team holds goal
 * of the tournament scorelines ('2 -0'). The other 210 are name shaped rows
 * filed under the wrong award (Golden Ball and Golden Glove winners sitting
 * under 'Golden Boot'), and no shape test can see that: only the allowlist
 * below and the record keep them out of a game. The awards the List Quiz
 * reads carry smaller junk of their own: 'Not awarded' for the five years the
 * European Golden Shoe was suspended, and '(tie)' and '(2)' tags on repeat or
 * shared winners, which made the tagged man a second, unguessable answer.
 *
 * A later round ships
 * supabase/migrations/20260930120000_round_708_soccer_awards_world_cup.sql,
 * which deletes the World Cup junk and rewrites those rows from a two source
 * record; it is not in the repo yet. A re-scrape would put the junk straight
 * back, so this test runs whether or not it has landed: a row that fails it is
 * skipped, and the game gets fewer answers rather than a wrong one. It is the
 * net for shape junk in the verified awards, not a proof that a name shaped
 * row belongs to the award it sits under.
 *
 * Pure on purpose (no imports), so scripts/simSoccerAwardsShape.mjs can run
 * the exact function the quiz runs.
 */

/**
 * The awards a game may read. Each one is recorded winner by winner, with two
 * sources on two organisations, in scripts/data/soccerAwardsVerified2026-09.json,
 * and scripts/simSoccerAwardsShape.mjs section 5 holds the live table and the
 * dealt lists to that record. Anything else in the table is unverified or
 * known corrupt, and awardWinners() in src/lib/listQuiz.ts refuses to read it
 * rather than trusting a caller.
 */
export const VERIFIED_SOCCER_AWARDS: readonly string[] = [
  'European Golden Shoe',
  'Premier League Player of the Season',
  'MLS MVP',
];

/**
 * DO NOT USE, with the reason measured on 2026-09-30. Kept next to the
 * allowlist so the two cannot drift apart without somebody reading both.
 */
export const DO_NOT_USE_SOCCER_AWARDS: Readonly<Record<string, string>> = {
  'African Footballer of the Year': "winner_name holds the rank '1st' on all 70 rows; the player sits in nationality",
  'South American Footballer of the Year': "winner_name holds the rank '1st' on all 70 rows; the player sits in nationality",
  'World Soccer Player of the Year': '137 rows and 116 distinct winners across 66 years, impossible for a one per year award',
  'World Cup Golden Boot': 'the 131 row World Cup awards page scrape, junk until the Round 708 migration lands',
  'World Cup Golden Glove': 'the same 131 junk rows as the Golden Boot, copied under another name',
  'World Cup Best Young Player': 'the same 131 junk rows as the Golden Boot, copied under another name',
  'FIFA Best Goalkeeper': "winner_name holds '1' on all 16 rows; the keeper sits in nationality, men and women mixed",
  'Serie A Footballer of the Year': 'winner_name holds a position word on all 29 rows; the player sits in nationality',
  "Onze d'Or": 'unverified, with 3 duplicated rows',
  'UEFA Player of the Year': 'unverified, no record yet; its 13 rows read right, with the year as the season start year like the PL award',
};

/** Lowercase, accents and punctuation gone, single spaces. */
function flat(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips the tags some rows carry after the name: 'Mohamed Salah (2)',
 * 'Hugo Sanchez (tie)', 'Real Madrid (34) +dagger'. Repeated, so a name
 * carrying two tags loses both.
 */
export function cleanAwardWinner(raw: string | null | undefined): string {
  let s = String(raw ?? '').trim();
  for (;;) {
    const next = s.replace(/\s*\((?:\d+|tie|joint|shared)\)\s*†?\s*$/i, '').trim();
    if (next === s) return s;
    s = next;
  }
}

/**
 * Words that name a paper, a broadcaster or a sponsor and never a footballer.
 * Taken from what the scrape actually put in winner_name, plus the obvious
 * siblings. A whole word match on the flattened name, so a real surname that
 * merely contains one of these letters in a row is untouched.
 */
const OUTLET_WORDS = new Set([
  'espn', 'deportes', 'associated', 'magazin', 'magazine', 'esportivo', 'sportivo',
  'guerin', 'estadio', 'goles', 'football', 'equipe', 'castrol', 'fantasy',
  'guardian', 'reuters', 'bbc', 'gazzetta', 'kicker',
]);

/**
 * Football nations, current and historical, as the scrape and the record
 * write them. Used only to catch a nation standing where a person belongs.
 */
const NATIONS = [
  'afghanistan', 'albania', 'algeria', 'american samoa', 'andorra', 'angola', 'anguilla',
  'antigua and barbuda', 'argentina', 'armenia', 'aruba', 'australia', 'austria', 'azerbaijan',
  'bahamas', 'bahrain', 'bangladesh', 'barbados', 'belarus', 'belgium', 'belize', 'benin',
  'bermuda', 'bhutan', 'bolivia', 'bosnia and herzegovina', 'botswana', 'brazil',
  'british virgin islands', 'brunei', 'bulgaria', 'burkina faso', 'burundi', 'cambodia',
  'cameroon', 'canada', 'cape verde', 'cabo verde', 'cayman islands', 'central african republic',
  'chad', 'chile', 'china', 'china pr', 'chinese taipei', 'colombia', 'comoros', 'congo',
  'dr congo', 'congo dr', 'cook islands', 'costa rica', 'croatia', 'cuba', 'curacao', 'cyprus',
  'czech republic', 'czechia', 'czechoslovakia', 'denmark', 'djibouti', 'dominica',
  'dominican republic', 'dutch east indies', 'east germany', 'ecuador', 'egypt', 'el salvador',
  'england', 'equatorial guinea', 'eritrea', 'estonia', 'eswatini', 'ethiopia', 'faroe islands',
  'fiji', 'finland', 'france', 'gabon', 'gambia', 'georgia', 'germany', 'ghana', 'gibraltar',
  'greece', 'grenada', 'guam', 'guatemala', 'guinea', 'guinea bissau', 'guyana', 'haiti',
  'honduras', 'hong kong', 'hungary', 'iceland', 'india', 'indonesia', 'iran', 'ir iran', 'iraq',
  'ireland', 'republic of ireland', 'israel', 'italy', 'ivory coast', 'cote d ivoire', 'jamaica',
  'japan', 'jordan', 'kazakhstan', 'kenya', 'korea republic', 'korea dpr', 'south korea',
  'north korea', 'kosovo', 'kuwait', 'kyrgyzstan', 'laos', 'latvia', 'lebanon', 'lesotho',
  'liberia', 'libya', 'liechtenstein', 'lithuania', 'luxembourg', 'macau', 'madagascar',
  'malawi', 'malaysia', 'maldives', 'mali', 'malta', 'mauritania', 'mauritius', 'mexico',
  'moldova', 'mongolia', 'montenegro', 'montserrat', 'morocco', 'mozambique', 'myanmar',
  'namibia', 'nepal', 'netherlands', 'holland', 'new caledonia', 'new zealand', 'nicaragua',
  'niger', 'nigeria', 'north macedonia', 'macedonia', 'northern ireland', 'norway', 'oman',
  'pakistan', 'palestine', 'panama', 'papua new guinea', 'paraguay', 'peru', 'philippines',
  'poland', 'portugal', 'puerto rico', 'qatar', 'romania', 'russia', 'rwanda',
  'saint kitts and nevis', 'saint lucia', 'saint vincent and the grenadines', 'samoa',
  'san marino', 'sao tome and principe', 'saudi arabia', 'scotland', 'senegal', 'serbia',
  'serbia and montenegro', 'seychelles', 'sierra leone', 'singapore', 'slovakia', 'slovenia',
  'solomon islands', 'somalia', 'south africa', 'south sudan', 'soviet union', 'ussr', 'spain',
  'sri lanka', 'sudan', 'suriname', 'sweden', 'switzerland', 'syria', 'tahiti', 'tajikistan',
  'tanzania', 'thailand', 'timor leste', 'togo', 'tonga', 'trinidad and tobago', 'tunisia',
  'turkey', 'turkiye', 'turkmenistan', 'turks and caicos islands', 'uganda', 'ukraine',
  'united arab emirates', 'uae', 'united states', 'usa', 'uruguay', 'us virgin islands',
  'uzbekistan', 'vanuatu', 'venezuela', 'vietnam', 'wales', 'west germany', 'yemen',
  'yugoslavia', 'zaire', 'zambia', 'zimbabwe',
];
const NATION_SET = new Set(NATIONS);
const LONGEST_NATION = Math.max(...NATIONS.map(n => n.split(' ').length));

/** True when the whole name is one nation or several run together ('England France'). */
function isOnlyNations(words: string[]): boolean {
  const ok: boolean[] = new Array(words.length + 1).fill(false);
  ok[0] = true;
  for (let end = 1; end <= words.length; end += 1) {
    for (let len = 1; len <= LONGEST_NATION && len <= end; len += 1) {
      if (ok[end - len] && NATION_SET.has(words.slice(end - len, end).join(' '))) { ok[end] = true; break; }
    }
  }
  return words.length > 0 && ok[words.length];
}

/**
 * How many whitespace separated tokens of the raw name start with a capital
 * letter. A footballer's common name has at most three ('Guillermo Barros
 * Schelotto', 'Dwayne De Rosario'); particles stay lowercase ('Edwin van der
 * Sar', 'Jan Vennegoor of Hesselink'), so two men in one cell show up as four
 * or more ('Oleg Salenko Hristo Stoichkov', 'Oliver Kahn Rustu Recber').
 * Measured over the 123 recorded winners of the three verified awards on
 * 2026-09-30: the most any one of them has is 3, and the test fires at 4.
 * Two men with one token each ('Pele Garrincha') have the shape of one man,
 * and no shape test can tell them apart; the allowlist is what keeps a cell
 * like that out of a game.
 */
function capitalisedTokens(name: string): number {
  return name.split(/\s+/).filter(t => /^\p{Lu}/u.test(t)).length;
}

export interface AwardRowLike {
  winner_name?: string | null;
  club_or_team?: string | null;
}

/**
 * Why a row cannot be dealt, or null when it can. The winner is judged after
 * cleanAwardWinner(), so a tagged name is judged as the name itself.
 */
export function awardRowProblem(row: AwardRowLike): string | null {
  const name = cleanAwardWinner(row.winner_name);
  const words = flat(name).split(' ').filter(Boolean);
  const club = String(row.club_or_team ?? '').trim();
  if (/^\d+(?:[.,]\d+)?\s*%?$/.test(name)) return 'winner_name is a number';
  if (/^\d+(?:st|nd|rd|th)$/i.test(name)) return 'winner_name is a rank';
  if (words.join('').length < 3) return 'winner_name is blank or too short to be a name';
  if (/^(?:not awarded|not held|vacant|withheld|none|no award|cancelled|canceled)$/i.test(flat(name))) {
    return 'winner_name says nobody won';
  }
  if (words.some(w => OUTLET_WORDS.has(w))) return 'winner_name is a paper, a broadcaster or a sponsor';
  if (isOnlyNations(words)) return 'winner_name is a nation where a person belongs';
  if (words.length > 5 || capitalisedTokens(name) > 3) return 'winner_name holds several names in one cell';
  if (/^\d+\s*[-‐-―]\s*\d+$/.test(club)) return 'club_or_team is a scoreline';
  return null;
}

/** The winners of the rows that pass, cleaned, in table order. */
export function dealableAwardWinners(rows: ReadonlyArray<AwardRowLike>): string[] {
  return rows.filter(r => awardRowProblem(r) === null).map(r => cleanAwardWinner(r.winner_name));
}
