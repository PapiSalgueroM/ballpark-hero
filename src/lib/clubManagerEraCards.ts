/**
 * The calendar year the baked rosters describe. CM_ROSTER_META.asOf reads
 * "August 2026, after the summer window", so season one of a default career is
 * 2026-27. simEras asserts these two agree, so a re-bake cannot silently
 * desync the clock from the data.
 */
export const CM_BASE_YEAR = 2026;

/** "2026-27" from 2026. Every screen that shows a season shows it like this. */
export function seasonLabel(year: number): string {
  return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
}

export const CM_ERA_CARDS = [
  {
    id: 'now',
    label: seasonLabel(CM_BASE_YEAR),
    startYear: CM_BASE_YEAR,
    emoji: '\u{1F4C5}',
    /* Round 832: the old lines promised every squad exactly as it is and
       every name real, which the youth padding of thin squads made false.
       They say what the squads really are now. */
    blurb: 'Today. Real squads as of August 2026, thin ones topped up with made up youth.',
  },
  /* Round 971: the fourth past season, the newest, so it sits first. The
     blurb names only squads the bake carries (its anchors in
     scripts/bakeEra2020.mjs), and the honesty line owns up to the summer
     movers no dated record placed.
     Review fix: the honesty line says what the bake does. A move is made
     where a dated record shows it AND the next season's row names the club;
     a leaver whose new club no row confirms is left out (Glik, Tatarusanu);
     a mover no record covered stays put (Lazaro, Biraghi). The empty
     stadiums are that season's, read 2026-10-05: premierleague.com ("How has
     the COVID-19 pandemic affected Premier League matches?": behind closed
     doors "largely ... throughout the season", fans back in limited numbers
     in December in some areas and in May) and Sky Sports ("How 2020 changed
     football: Fans stay at home"). The brief also asked for five
     substitutes, but the Premier League voted to stay at three for 2020-21
     (Sky Sports, "Premier League clubs vote against allowing five
     substitutes in 2020/21 season"; ESPN), so the card does not claim it.
     Closing check fix, every source read 2026-10-05. The empty stadiums
     were all five leagues', not only England's: Deloitte's Annual Review of
     Football Finance 2022 (deloitte.com/ce/en/industries/tmt/research/
     gx-annual-review-of-football-finance.html: "matches played behind
     closed doors and stadia empty for the majority of the season") and
     KPMG Football Benchmark on the big five clubs (essma.eu, 7 September
     2021: the 2020/21 season "was played in empty stadiums"). The
     substitutes are said as they were: five in the other four leagues
     (Inside World Football, 18 December 2020, naming La Liga, the
     Bundesliga, Serie A and Ligue 1; ESPN, Dale Johnson, 4 August 2022,
     espn.com/soccer/story/_/id/37630254), three in the Premier League (Sky
     Sports 12062269, 4 September 2020: "three replacements from seven";
     ESPN 37585852, 6 August 2020; NBC Sports, 17 December 2020). Round 1331:
     the engine now plays each league's own rule by season (subsRuleFor in
     clubManagerSubsRule.ts, sourced in scripts/data/cmSubsRuleSources.json),
     so the card says the matches follow it; simEra2020 section 8 holds the
     card's numbers to the engine's. */
  {
    id: 'era2020',
    label: seasonLabel(2020),
    startYear: 2020,
    emoji: '\u{1F3DF}\u{FE0F}',
    blurb: 'Haaland and Bellingham at Dortmund, Mbappé and Neymar at PSG, Bruno at United, Lewandowski at Bayern. All of the big five, 2020-21.',
  },
  {
    id: 'era2015',
    label: seasonLabel(2015),
    startYear: 2015,
    emoji: '\u{1F98A}',
    blurb: 'The Leicester season. MSN Barcelona, Vardy at 5000 to 1, Lewandowski at Bayern, Ibrahimovic at PSG. All of the big five, 2015-16.',
  },
  {
    id: 'era2010',
    label: seasonLabel(2010),
    startYear: 2010,
    emoji: '\u{1F570}\u{FE0F}',
    /* Round 901, read 2026-10-03: Klopp's young Dortmund won the 2010-11
       Bundesliga (bundesliga.com, "Jurgen Klopp: how Borussia Dortmund won
       the 2010/11 German top flight"; ESPN, story 37503225), and Lille won
       Ligue 1 and the Coupe de France, their first double since 1946
       (UEFA.com, "Lille celebrating breakthrough double"; Al Jazeera, 21 May
       2011, "Lille win first French title in 57 years"; RSSSF's season). */
    blurb: 'Prime Messi. Mourinho\'s Madrid. Klopp\'s young Dortmund. Lille\'s double. All of the big five, 2010-11.',
  },
  {
    id: 'era2005',
    label: seasonLabel(2005),
    startYear: 2005,
    emoji: '\u{1F4FC}',
    blurb: 'Ronaldinho\'s Ballon d\'Or. Mourinho\'s Chelsea. A 17 year old Messi. Shevchenko\'s Milan, Ballack\'s Bayern, Juninho\'s Lyon. All of the big five, 2005-06.',
  },
] as const;

export const DEFAULT_ERA_ID = 'now';

export const REAL_WITH_PADDING = 'Real players, made up youth fill gaps';
