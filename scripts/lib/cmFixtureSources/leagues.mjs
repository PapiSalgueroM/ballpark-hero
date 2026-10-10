/**
 * Round 1213: where each Club Manager league's real 2026/27 fixture list is read from.
 *
 * One entry a league. An entry names the game's league id, the file the ledger
 * is written to, and exactly two sources on two different hosts, neither of
 * them a wiki. For each source: what it is (kind), the address that is fetched
 * (url, or pages for a source that prints one matchday a page), the address
 * the game links (citedUrl, when the fetched address is not fit to link), the
 * committed parser that turns its bytes into rows, and the table that maps the
 * source's club spellings onto the game's own (names). The table is explicit
 * and exact on purpose: these lists hold Milan and Inter, Sporting CP and
 * Sporting Braga, two clubs from Bruges. Nothing is ever matched by likeness.
 * A source spelling that is already the game's spelling needs no line.
 *
 * kind says what the source IS, never how much it is trusted: 'league' (the
 * league's own publication), 'federation', 'press' (a news publisher),
 * 'broadcaster', 'compiled feed' (a third party's machine readable list).
 * No harness looks a source up by its kind.
 *
 * orderSource is the index of the source whose order of matches inside a
 * round the ledger keeps. Round numbers are always the matchday numbers of the
 * list as it was first published, never the order games ended up played in.
 */
const feed = slug => `https://fixturedownload.com/feed/json/${slug}`;
const maxifoot = slug => `https://www.maxifoot.fr/calendrier-${slug}-2026-2027.htm`;

const FEED = slug => ({
  id: 'feed', kind: 'compiled feed', label: 'Fixture Download', url: feed(slug), ext: 'json', parser: 'feedJson',
  title: `Fixture Download JSON feed ${slug}`,
  titleNote: 'A JSON feed has no title of its own. This line names the feed.',
});
const MAXIFOOT = (slug, title) => ({
  id: 'maxifoot', kind: 'press', label: 'Maxifoot', url: maxifoot(slug), ext: 'htm', parser: 'maxifoot', title,
});

export const CM_FIXTURE_LEAGUES = [
  {
    leagueId: 'laliga', exportName: 'LALIGA_FIXTURES_2026', file: 'clubManagerLaLigaFixtures2026', orderSource: 0,
    sources: [FEED('la-liga-2026'), MAXIFOOT('liga-espagne')],
    names: [
      {
        'Atlético de Madrid': 'Atlético Madrid', 'CA Osasuna': 'Osasuna', Celta: 'Celta Vigo', 'Deportivo Alavés': 'Alavés',
        'Elche CF': 'Elche', 'FC Barcelona': 'Barcelona', 'Getafe CF': 'Getafe', 'Levante UD': 'Levante',
        'Málaga CF': 'Málaga', 'R. Racing Club': 'Racing Santander', 'RC Deportivo': 'Deportivo La Coruña',
        'RCD Espanyol de Barcelona': 'Espanyol', 'Sevilla FC': 'Sevilla', 'Valencia CF': 'Valencia', 'Villarreal CF': 'Villarreal',
      },
      {
        Alaves: 'Alavés', 'Athletic Bilbao': 'Athletic Club', 'Atl. Madrid': 'Atlético Madrid', 'Betis Séville': 'Real Betis',
        'Esp. Barcelone': 'Espanyol', 'FC Barcelone': 'Barcelona', 'FC Seville': 'Sevilla', 'FC Valence': 'Valencia',
        'La Corogne': 'Deportivo La Coruña', Malaga: 'Málaga',
      },
    ],
  },
  {
    leagueId: 'ligue1', exportName: 'LIGUE1_FIXTURES_2026', file: 'clubManagerLigue1Fixtures2026', orderSource: 0,
    sources: [MAXIFOOT('ligue-1-france'), FEED('ligue-1-2026')],
    names: [{}, {}],
  },
  {
    leagueId: 'ligue2', exportName: 'LIGUE2_FIXTURES_2026', file: 'clubManagerLigue2Fixtures2026', orderSource: 0,
    sources: [MAXIFOOT('ligue-2-france'), FEED('ligue-2-2026')],
    names: [{}, {}],
  },
  {
    leagueId: 'eredivisie', exportName: 'EREDIVISIE_FIXTURES_2026', file: 'clubManagerEredivisieFixtures2026', orderSource: 0,
    sources: [FEED('eredivisie-2026'), MAXIFOOT('pays-bas')],
    names: [{}, {}],
  },
  {
    leagueId: 'primeira', exportName: 'PRIMEIRA_FIXTURES_2026', file: 'clubManagerPrimeiraFixtures2026', orderSource: 0,
    sources: [FEED('primeira-liga-2026'), MAXIFOOT('portugal')],
    names: [{}, {}],
  },
];

export const cmFixtureLeague = id => CM_FIXTURE_LEAGUES.find(l => l.leagueId === id) ?? null;
