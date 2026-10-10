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

/* The DFL's PDFs carry a random token in their file names, so the game links the league page that links them.
   Checked 2026-10-10: the bytes of that page hold both PDF file names. */
const DFL_CITED = {
  citedUrl: 'https://www.bundesliga.com/de/bundesliga/news/spielplan-saison-start-termine-daten-2026-27-22043',
  citedNote: 'The fetched address is the PDF itself. The cited address is the league page that links it: its bytes held the file name of this PDF when read on 2026-10-10.',
};
/* The league's formal names, which the DFL's list and the feed both print. */
const BUNDESLIGA_NAMES = {
  '1. FC Köln': 'Köln', '1. FC Union Berlin': 'Union Berlin', '1. FSV Mainz 05': 'Mainz', 'Bayer 04 Leverkusen': 'Bayer Leverkusen',
  'Borussia Mönchengladbach': 'Gladbach', 'FC Augsburg': 'Augsburg', 'FC Bayern München': 'Bayern Munich', 'FC Schalke 04': 'Schalke 04',
  'Hamburger SV': 'Hamburg', 'SC Paderborn 07': 'Paderborn', 'SV Elversberg': 'Elversberg', 'SV Werder Bremen': 'Werder Bremen',
  'Sport-Club Freiburg': 'Freiburg', 'TSG Hoffenheim': 'Hoffenheim', 'VfB Stuttgart': 'Stuttgart',
};

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
  /* HELD, read 2026-10-10: both sources print Rennes at home to PSG twice (matchdays 1 and 23) and PSG at home
     to Rennes never, so the list as they show it is not a whole double round robin and the tool writes nothing.
     One of the two matches was moved to the other ground after the list was published; which one needs a source
     of the list as first published. Never patched by hand. The tables below are checked and stay for that day. */
  {
    leagueId: 'ligue1', exportName: 'LIGUE1_FIXTURES_2026', file: 'clubManagerLigue1Fixtures2026', orderSource: 0,
    sources: [MAXIFOOT('ligue-1-france'), FEED('ligue-1-2026')],
    names: [
      { 'Paris SG': 'PSG' },
      {
        'AJ Auxerre': 'Auxerre', 'AS Monaco': 'Monaco', 'Angers SCO': 'Angers', 'Estac Troyes': 'Troyes',
        'FC Lorient': 'Lorient', 'Havre Athletic Club': 'Le Havre', 'LOSC Lille': 'Lille', 'Le Mans FC': 'Le Mans',
        'OGC Nice': 'Nice', 'Olympique Lyonnais': 'Lyon', 'Olympique de Marseille': 'Marseille',
        'Paris Saint-Germain': 'PSG', 'RC Lens': 'Lens', 'RC Strasbourg Alsace': 'Strasbourg',
        'Stade Brestois 29': 'Brest', 'Stade Rennais FC': 'Rennes', 'Toulouse FC': 'Toulouse',
      },
    ],
  },
  {
    leagueId: 'ligue2', exportName: 'LIGUE2_FIXTURES_2026', file: 'clubManagerLigue2Fixtures2026', orderSource: 0,
    sources: [MAXIFOOT('ligue-2-france'), FEED('ligue-2-2026')],
    names: [
      { 'Boulogne/Mer': 'Boulogne', 'Clermont F.': 'Clermont', 'Pau FC': 'Pau', 'Red Star': 'Red Star FC', 'St Etienne': 'Saint-Étienne' },
      {
        'AS Nancy Lorraine': 'Nancy', 'AS Saint-Étienne': 'Saint-Étienne', 'Clermont Foot 63': 'Clermont', 'Dijon FCO': 'Dijon',
        'EN Avant Guingamp': 'Guingamp', 'FC Annecy': 'Annecy', 'FC Metz': 'Metz', 'FC Nantes': 'Nantes',
        'FC Sochaux-Montbéliard': 'Sochaux', 'Grenoble Foot 38': 'Grenoble', 'Montpellier Hérault SC': 'Montpellier',
        'Pau FC': 'Pau', 'Rodez Aveyron Football': 'Rodez', 'Stade DE Reims': 'Reims', 'Stade Lavallois MFC': 'Laval',
        'US Boulogne CO': 'Boulogne', 'USL Dunkerque': 'Dunkerque',
      },
    ],
  },
  {
    leagueId: 'eredivisie', exportName: 'EREDIVISIE_FIXTURES_2026', file: 'clubManagerEredivisieFixtures2026', orderSource: 0,
    sources: [FEED('eredivisie-2026'), MAXIFOOT('pays-bas')],
    names: [
      {
        AZ: 'AZ Alkmaar', 'Excelsior Rotterdam': 'Excelsior', 'FC Groningen': 'Groningen', 'FC Twente': 'Twente',
        'FC Utrecht': 'Utrecht', 'N.E.C. Nijmegen': 'NEC Nijmegen', 'SC Cambuur': 'Cambuur', 'sc Heerenveen': 'Heerenveen',
      },
      {
        'ADO La Haye': 'ADO Den Haag', 'Ajax Amsterd.': 'Ajax', 'Cambuur L.': 'Cambuur', 'Excelsior Rot.': 'Excelsior',
        'FC Groningen': 'Groningen', 'FC Twente': 'Twente', 'FC Utrecht': 'Utrecht', 'Feyenoord Rot.': 'Feyenoord',
        'Fortuna Sitt.': 'Fortuna Sittard', 'NEC Nimègue': 'NEC Nijmegen', 'PSV Eindhov.': 'PSV', 'SC Telstar': 'Telstar',
      },
    ],
  },
  {
    leagueId: 'primeira', exportName: 'PRIMEIRA_FIXTURES_2026', file: 'clubManagerPrimeiraFixtures2026', orderSource: 0,
    sources: [FEED('primeira-liga-2026'), MAXIFOOT('portugal')],
    names: [
      {
        'Académico': 'Académico de Viseu', 'CD Nacional': 'Nacional', 'Casa Pia AC': 'Casa Pia', 'Estoril Praia': 'Estoril',
        'FC Alverca': 'Alverca', 'FC Arouca': 'Arouca', 'FC Famalicão': 'Famalicão', 'FC Porto': 'Porto',
        'Gil Vicente FC': 'Gil Vicente', 'Marítimo M.': 'Marítimo', 'Moreirense FC': 'Moreirense', 'Rio Ave FC': 'Rio Ave',
        'SC Braga': 'Braga', 'SL Benfica': 'Benfica', 'Vitória SC': 'Vitória Guimarães',
      },
      {
        'Academico Viseu': 'Académico de Viseu', 'Benfica Lisbo.': 'Benfica', 'Estoril Praia': 'Estoril', 'FC Porto': 'Porto',
        Famalicao: 'Famalicão', 'Marit. Funchal': 'Marítimo', 'Nacio. Funchal': 'Nacional', 'Sporting Braga': 'Braga',
        'Sporting Lisbo.': 'Sporting CP', 'Vit. Guimaraes': 'Vitória Guimarães',
      },
    ],
  },
  {
    leagueId: 'seriea', exportName: 'SERIEA_FIXTURES_2026', file: 'clubManagerSerieAFixtures2026', orderSource: 0,
    sources: [
      {
        id: 'tmw', kind: 'press', label: 'TuttoMercatoWeb', ext: 'html', parser: 'tuttomercatoweb',
        url: 'https://www.tuttomercatoweb.com/serie-a/serie-a-2026-2027-ecco-il-nuovo-calendario-completo-con-le-38-giornate-2241512',
      },
      FEED('serie-a-2026'),
    ],
    names: [{ Inter: 'Inter Milan', Milan: 'AC Milan' }, { Internazionale: 'Inter Milan', Milan: 'AC Milan' }],
  },
  {
    leagueId: 'bundesliga', exportName: 'BUNDESLIGA_FIXTURES_2026', file: 'clubManagerBundesligaFixtures2026', orderSource: 0,
    sources: [
      {
        id: 'dfl', kind: 'league', label: 'DFL', ext: 'pdf', parser: 'dflPdf',
        url: 'https://media.dfl.de/sites/2/2026/07/DE_s73GnueV_Bundesliga_Spielplan_2026_27.pdf',
        ...DFL_CITED,
      },
      FEED('bundesliga-2026'),
    ],
    names: [BUNDESLIGA_NAMES, BUNDESLIGA_NAMES],
  },
  {
    leagueId: 'superlig', exportName: 'SUPERLIG_FIXTURES_2026', file: 'clubManagerSuperLigFixtures2026', orderSource: 0,
    sources: [
      { id: 'tff', kind: 'federation', label: 'TFF', ext: 'html', parser: 'tff', url: 'https://www.tff.org/default.aspx?pageID=198' },
      FEED('super-lig-2026'),
    ],
    names: [
      {
        'AMED SPORTİF FAALİYETLER': 'Amedspor', 'ARCA ÇORUM FK': 'Çorum FK', 'BEŞİKTAŞ A.Ş.': 'Beşiktaş',
        'CORENDON ALANYASPOR': 'Alanyaspor', 'ERZURUMSPOR FK': 'Erzurumspor', 'EYÜPSPOR': 'Eyüpspor',
        'FENERBAHÇE A.Ş.': 'Fenerbahçe', 'GALATASARAY A.Ş.': 'Galatasaray', 'GAZİANTEP FUTBOL KULÜBÜ A.Ş.': 'Gaziantep FK',
        'GENÇLERBİRLİĞİ': 'Gençlerbirliği', 'GÖZTEPE A.Ş.': 'Göztepe', 'KASIMPAŞA A.Ş.': 'Kasımpaşa',
        'KOCAELİSPOR': 'Kocaelispor', 'SAMSUNSPOR A.Ş.': 'Samsunspor', 'TRABZONSPOR A.Ş.': 'Trabzonspor',
        'TÜMOSAN KONYASPOR': 'Konyaspor', 'ÇAYKUR RİZESPOR A.Ş.': 'Rizespor', 'İSTANBUL BAŞAKŞEHİR FK': 'Başakşehir',
      },
      {
        Besiktas: 'Beşiktaş', Gaziantep: 'Gaziantep FK', 'Gençlerbirligi': 'Gençlerbirliği', 'Istanbul Basaksehir': 'Başakşehir',
        Kasimpasa: 'Kasımpaşa', 'Çaykur Rizespor': 'Rizespor', 'Çorum': 'Çorum FK',
      },
    ],
  },
  /* HELD, read 2026-10-10: Walfoot's table holds 305 of the 306 matches. Matchday 30 has eight rows there; the
     ninth, Club Brugge at home to Union Saint-Gilloise, is named only in the page's prose. Maxifoot prints it,
     and the other 305 rows of the two sources are equal. One source short of a whole list is not two sources:
     the tool writes nothing and the row is never filled in from the other. The tables below are checked. */
  {
    leagueId: 'proleague', exportName: 'PROLEAGUE_FIXTURES_2026', file: 'clubManagerProLeagueFixtures2026', orderSource: 0,
    sources: [
      {
        id: 'walfoot', kind: 'press', label: 'Walfoot', ext: 'html', parser: 'walfoot',
        url: 'https://www.walfoot.be/belgique/jupiler-pro-league/calendrier',
      },
      MAXIFOOT('belgique'),
    ],
    names: [
      {
        'Cercle de Bruges': 'Cercle Brugge', 'FC Bruges': 'Club Brugge', 'KRC Genk': 'Genk', 'KV Courtrai': 'Kortrijk',
        'KV Malines': 'Mechelen', 'La Gantoise': 'Gent', 'Lommel SK': 'Lommel', 'OH Louvain': 'OH Leuven',
        'RAAL La Louvière': 'La Louvière', 'SK Beveren': 'Beveren', STVV: 'Sint-Truiden', Standard: 'Standard Liège',
        'Union SG': 'Union Saint-Gilloise',
      },
      {
        'Cercle Bruges': 'Cercle Brugge', 'Charleroi SC': 'Charleroi', 'FC Bruges': 'Club Brugge', 'FC Malines': 'Mechelen',
        'KSV Beveren': 'Beveren', 'KV Courtrai': 'Kortrijk', 'La Gantoise': 'Gent', 'Lommel united': 'Lommel',
        'OH Louvain': 'OH Leuven', 'RAAL La Louv.': 'La Louvière', 'RU St Gilloise': 'Union Saint-Gilloise',
        'Racing Genk': 'Genk', 'Royal Antwerp': 'Antwerp', 'Saint-Trond': 'Sint-Truiden', 'Zulte-Waregem': 'Zulte Waregem',
      },
    ],
  },
  {
    leagueId: 'bundesliga2', exportName: 'BUNDESLIGA2_FIXTURES_2026', file: 'clubManagerBundesliga2Fixtures2026', orderSource: 0,
    sources: [
      {
        id: 'dfl', kind: 'league', label: 'DFL', ext: 'pdf', parser: 'dflPdf',
        url: 'https://media.dfl.de/sites/2/2026/07/DE_mgKX2qjj_2.-Bundesliga_Spielplan_2026_27.pdf',
        ...DFL_CITED,
      },
      {
        id: 'hessenschau', kind: 'broadcaster', label: 'hessenschau', ext: 'html', parser: 'hessenschau',
        competition: 'Fußball 2. Bundesliga 2026/2027',
        url: 'https://www.hessenschau.de/sport/ergebnisse-tabellen/fussball-2bl100~_matchday-1.html',
        pages: Array.from({ length: 34 }, (_, i) => `https://www.hessenschau.de/sport/ergebnisse-tabellen/fussball-2bl100~_matchday-${i + 1}.html`),
      },
    ],
    names: [
      {
        '1. FC Heidenheim 1846': 'Heidenheim', '1. FC Kaiserslautern': 'Kaiserslautern', '1. FC Magdeburg': 'Magdeburg',
        '1. FC Nürnberg': 'Nürnberg', 'DSC Arminia Bielefeld': 'Arminia Bielefeld', 'Eintracht Braunschweig': 'Braunschweig',
        'FC Energie Cottbus': 'Energie Cottbus', 'FC St. Pauli': 'St. Pauli', 'Karlsruher SC': 'Karlsruhe',
        'SG Dynamo Dresden': 'Dynamo Dresden', 'SV Darmstadt 98': 'Darmstadt', 'SpVgg Greuther Fürth': 'Greuther Fürth',
        'VfL Bochum 1848': 'Bochum', 'VfL Osnabrück': 'Osnabrück', 'VfL Wolfsburg': 'Wolfsburg',
      },
      {
        '1. FC Heidenheim': 'Heidenheim', '1. FC Kaiserslautern': 'Kaiserslautern', '1. FC Magdeburg': 'Magdeburg',
        '1. FC Nürnberg': 'Nürnberg', 'DSC Arminia Bielefeld': 'Arminia Bielefeld', 'Eintracht Braunschweig': 'Braunschweig',
        'FC St. Pauli': 'St. Pauli', 'Hertha BSC Berlin': 'Hertha BSC', 'Karlsruher SC': 'Karlsruhe',
        'SV Darmstadt 98': 'Darmstadt', 'SpVgg Greuther Fürth': 'Greuther Fürth', 'VfL Bochum': 'Bochum',
        'VfL Osnabrück': 'Osnabrück', 'VfL Wolfsburg': 'Wolfsburg',
      },
    ],
  },
  {
    leagueId: 'championship', exportName: 'CHAMPIONSHIP_FIXTURES_2026', file: 'clubManagerChampionshipFixtures2026', orderSource: 1,
    sources: [
      {
        id: 'espn', kind: 'press', label: 'ESPN', ext: 'html', parser: 'espnByDate',
        url: 'https://www.espn.com/soccer/story/_/id/49173379/efl-championship-fixtures-schedule-2026-27-full',
      },
      FEED('championship-2026'),
    ],
    names: [{}, {}],
  },
];

export const cmFixtureLeague = id => CM_FIXTURE_LEAGUES.find(l => l.leagueId === id) ?? null;
