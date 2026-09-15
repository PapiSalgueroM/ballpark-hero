/* ────────────────────────────────────────────────────────────────────────────
   clubManagerFinalTables2025_26.ts, how the real 2025-26 season finished (Round 612)

   WHY THIS EXISTS. A player reported on 2026-09-10 that a 2026-27 Club Manager
   save put a club that missed the places into the Champions League. From
   season two the field is read off the final tables the save itself played
   (uclQualifiersFrom, Round 547). Season one had no last season to read, so it
   handed a place to any club with a big enough squad and drew everyone else
   from a prestige pool. Chelsea finished 10th in 2025-26 and still started in
   Europe. This file is the last season season one never had: the real one.

   WHAT IS IN IT, and nothing else:
     - Per European league id, the final 2025-26 positions as the game's exact
       club strings (the league's clubs array in REAL_LEAGUES), champion first.
       Each league carries its game Champions League places plus at least three
       more, because the fill rule reads the next placed clubs.
     - The 2025-26 Champions League holders, PSG (the game's string; the
       historic 2015-16 pool spells it out in full, the modern world does not).
     - Where every position came from: the source, its URL, the day it was read.

   THE VERIFICATION RULE. A position is in only when two independent source
   families name the same club in it: family A is the league's own data or
   UEFA's, family B is press and stats sites. Where one family had a gap
   (the Eredivisie and the Belgian Pro League official pages printed only the
   top three), a third independent source settled it and is listed as `third`.
   A table stops where verification stops, so a league can be shorter than
   ten. All of it was read on 2026-09-15. The full reconciliation record, with
   both families' raw names, points and every disagreement, is
   docs/design/round-612-final-tables-2025-26.json on the research branch.

   THIN DATA. A European league the 2026-27 world plays with no verified table
   here goes in CM_FINAL_TABLES_PARTIAL, the same shape CM_PARTIAL uses for thin
   squads. Its own clubs then start season one the way they did before this
   round (see seasonOneUclField in clubManager.ts). It is empty today: all
   fifteen are verified. simUclSeasonOne holds the list to exactly the European
   leagues with no table, so the two cannot drift apart.

   Import free on purpose, so it can never close an import cycle with the engine.
   ──────────────────────────────────────────────────────────────────────────── */

export interface FinalTableSource {
  publisher: string;
  url: string;
  /** The day it was read, YYYY-MM-DD. */
  readOn: string;
}

export interface VerifiedFinalTable {
  /** Game club strings in finishing order, champion first, verified positions only. */
  table: string[];
  /** Family A: the league's own data or UEFA's. */
  official: FinalTableSource[];
  /** Family B: press and stats sites. */
  press: FinalTableSource[];
  /** A third independent source, only where family A or B had a gap. */
  third?: FinalTableSource[];
  /** What a reader checking the table needs to know: a split, a tiebreak, a gap. */
  note?: string;
}

export interface FinalTables {
  season: string;
  /** The calendar year the season kicked off. Season one of a career that
   *  starts the year after this reads these tables. */
  startYear: number;
  /** The Champions League winners, as the game spells them. */
  holders: string;
  holdersSources: { official: FinalTableSource[]; press: FinalTableSource[] };
  leagues: Record<string, VerifiedFinalTable>;
}

export const CM_FINAL_TABLES_2025_26: FinalTables = {
  season: "2025-26",
  startYear: 2025,
  holders: "PSG",
  holdersSources: {
    official: [
      { publisher: "UEFA match data API", url: "https://match.uefa.com/v5/matches?competitionId=1&seasonYear=2026&offset=0&limit=3&order=DESC", readOn: "2026-09-15" },
      { publisher: "UEFA", url: "https://www.uefa.com/uefachampionsleague/news/02a5-20c02e59f219-15e92acdc717-1000--paris-retain-champions-league-holders-edge-arsenal-on-pena/", readOn: "2026-09-15" },
    ],
    press: [
      { publisher: "ESPN", url: "https://www.espn.com/soccer/story/_/id/48920506/psg-arsenal-champions-league-final-penalty-shootout", readOn: "2026-09-15" },
      { publisher: "CBS Sports", url: "https://www.cbssports.com/soccer/news/psg-arsenal-live-updates-champions-league-final-2026-score/live/", readOn: "2026-09-15" },
    ],
  },
  leagues: {
    premier: {
      table: ["Arsenal", "Manchester City", "Manchester United", "Aston Villa", "Liverpool", "Bournemouth", "Sunderland", "Brighton", "Brentford", "Chelsea"],
      official: [
        { publisher: "Premier League official data API", url: "https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v5/competitions/8/seasons/2025/standings", readOn: "2026-09-15" },
        { publisher: "UEFA", url: "https://www.uefa.com/uefachampionsleague/news/02a8-2171a88881a0-c70193b972c6-1000--meet-the-2026-27-champions-league-league-phase-teams/", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "ESPN", url: "https://www.espn.com/soccer/standings/_/league/eng.1/season/2025", readOn: "2026-09-15" },
        { publisher: "NBC Sports", url: "https://www.nbcsports.com/premier-league-table-2025-26-season-standings", readOn: "2026-09-15" },
      ],
      note: "Chelsea finished 10th on 52 points.",
    },
    laliga: {
      table: ["Barcelona", "Real Madrid", "Villarreal", "Atlético Madrid", "Real Betis", "Celta Vigo", "Getafe", "Rayo Vallecano", "Valencia", "Real Sociedad"],
      official: [
        { publisher: "LALIGA API behind laliga.com", url: "https://apim.laliga.com/public-service/api/v1/subscriptions/laliga-easports-2025/standing?contentLanguage=en&countryCode=GB", readOn: "2026-09-15" },
        { publisher: "UEFA", url: "https://www.uefa.com/uefachampionsleague/news/02a8-2171a88881a0-c70193b972c6-1000--meet-the-2026-27-champions-league-league-phase-teams/", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "ESPN", url: "https://www.espn.com/soccer/standings/_/league/esp.1/season/2025", readOn: "2026-09-15" },
        { publisher: "Sporting Life", url: "https://www.sportinglife.com/football/league-tables/spanish-la-liga/74/seasons/2025-2026/107", readOn: "2026-09-15" },
      ],
    },
    seriea: {
      table: ["Inter Milan", "Napoli", "Roma", "Como", "AC Milan", "Juventus", "Atalanta", "Bologna", "Lazio", "Udinese"],
      official: [
        { publisher: "Lega Serie A API behind legaseriea.it", url: "https://api-sdp.legaseriea.it/v1/serie-a/football/seasons/serie-a::Football_Season::5f0e080fc3a44073984b75b3a8e06a8a/standings", readOn: "2026-09-15" },
        { publisher: "UEFA", url: "https://www.uefa.com/uefachampionsleague/news/02a8-2171a88881a0-c70193b972c6-1000--meet-the-2026-27-champions-league-league-phase-teams/", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "ESPN", url: "https://www.espn.com/soccer/standings/_/league/ita.1/season/2025", readOn: "2026-09-15" },
        { publisher: "Sporting Life", url: "https://www.sportinglife.com/football/league-tables/serie-a/6/seasons/2025-2026/107", readOn: "2026-09-15" },
      ],
    },
    bundesliga: {
      table: ["Bayern Munich", "Borussia Dortmund", "RB Leipzig", "Stuttgart", "Hoffenheim", "Bayer Leverkusen", "Freiburg", "Eintracht Frankfurt", "Augsburg", "Mainz"],
      official: [
        { publisher: "DFL / bundesliga.com", url: "https://www.bundesliga.com/en/bundesliga/table/2025-2026", readOn: "2026-09-15" },
        { publisher: "UEFA", url: "https://www.uefa.com/uefachampionsleague/news/02a8-2171a88881a0-c70193b972c6-1000--meet-the-2026-27-champions-league-league-phase-teams/", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "ESPN", url: "https://www.espn.com/soccer/standings/_/league/ger.1/season/2025", readOn: "2026-09-15" },
        { publisher: "Sporting Life", url: "https://www.sportinglife.com/football/league-tables/german-bundesliga/11/seasons/2025-2026/107", readOn: "2026-09-15" },
      ],
    },
    ligue1: {
      table: ["PSG", "Lens", "Lille", "Lyon", "Marseille", "Rennes", "Monaco", "Strasbourg", "Toulouse", "Lorient"],
      official: [
        { publisher: "LFP data API", url: "https://ma-api.ligue1.fr/championship-standings/1/general?season=2025", readOn: "2026-09-15" },
        { publisher: "UEFA match data API", url: "https://match.uefa.com/v5/matches?competitionId=1&seasonYear=2027&offset=0&limit=200&order=ASC", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "Sporting Life", url: "https://www.sportinglife.com/football/league-tables/french-ligue-1/8/seasons/2025-2026/107", readOn: "2026-09-15" },
        { publisher: "BeSoccer", url: "https://www.besoccer.com/competition/table/ligue_1/2026", readOn: "2026-09-15" },
        { publisher: "Foot Mercato (2026-05-27)", url: "https://www.footmercato.net/a206742058948473313-commission-de-discipline-nantes-sanctionne-mais-le-0-0-enterine-contre-toulouse", readOn: "2026-09-15" },
      ],
      note: "Toulouse 9th and Lorient 10th, both on 45, as the LFP API and the final press tables agree.",
    },
    eredivisie: {
      table: ["PSV", "Feyenoord", "NEC Nijmegen", "Twente", "Ajax", "Utrecht", "AZ Alkmaar", "Heerenveen", "Groningen", "Sparta Rotterdam"],
      official: [
        { publisher: "Eredivisie CV (positions 1 to 3 only)", url: "https://eredivisie.nl/nieuws/deze-momenten-uit-2025-26-mogen-niet-worden-vergeten/", readOn: "2026-09-15" },
        { publisher: "UEFA", url: "https://www.uefa.com/uefachampionsleague/news/02a8-2171a88881a0-c70193b972c6-1000--meet-the-2026-27-champions-league-league-phase-teams/", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "ESPN", url: "https://www.espn.com/soccer/standings/_/league/ned.1/season/2025", readOn: "2026-09-15" },
        { publisher: "Sporting Life", url: "https://www.sportinglife.com/football/league-tables/dutch-eredivisie/46/seasons/2025-2026/107", readOn: "2026-09-15" },
      ],
      third: [
        { publisher: "Voetbal International (vi.nl)", url: "https://www.vi.nl/competities/eredivisie/2025-2026/stand", readOn: "2026-09-15" },
        { publisher: "Wikipedia (corroborating only)", url: "https://en.wikipedia.org/wiki/2025%E2%80%9326_Eredivisie", readOn: "2026-09-15" },
      ],
      note: "The official source printed places 1 to 3 only, so places 4 to 10 are the press family plus Voetbal International, with Wikipedia agreeing.",
    },
    primeira: {
      table: ["Porto", "Sporting CP", "Benfica", "Braga", "Famalicão", "Gil Vicente", "Moreirense", "Arouca", "Vitória Guimarães", "Estoril"],
      official: [
        { publisher: "Liga Portugal (LPFP)", url: "https://www.ligaportugal.pt/competition/854/liga-portugal-betclic/round/20252026?tab=standings", readOn: "2026-09-15" },
        { publisher: "UEFA", url: "https://www.uefa.com/uefachampionsleague/news/02a8-2171a88881a0-c70193b972c6-1000--meet-the-2026-27-champions-league-league-phase-teams/", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "ESPN", url: "https://www.espn.com/soccer/standings/_/league/por.1/season/2025", readOn: "2026-09-15" },
        { publisher: "Sporting Life", url: "https://www.sportinglife.com/football/league-tables/portuguese-primeira-liga/14/seasons/2025-2026/107", readOn: "2026-09-15" },
      ],
    },
    scottish: {
      table: ["Celtic", "Hearts", "Rangers", "Motherwell", "Hibernian", "Falkirk", "Dundee United", "Dundee", "Aberdeen", "Kilmarnock"],
      official: [
        { publisher: "SPFL", url: "https://spfl.co.uk/league/premiership/archive/390", readOn: "2026-09-15" },
        { publisher: "SPFL", url: "https://spfl.co.uk/news/celtic-clinch-the-title-51235", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "ESPN", url: "https://www.espn.com/soccer/standings/_/league/sco.1/season/2025", readOn: "2026-09-15" },
        { publisher: "Sporting Life", url: "https://www.sportinglife.com/football/league-tables/scottish-premiership/62/seasons/2025-2026/107", readOn: "2026-09-15" },
      ],
      note: "The final table after the split at 33 games, so the top six are 1 to 6 whatever the points.",
    },
    superlig: {
      table: ["Galatasaray", "Fenerbahçe", "Trabzonspor", "Beşiktaş", "Başakşehir", "Göztepe", "Samsunspor", "Rizespor", "Konyaspor", "Kocaelispor"],
      official: [
        { publisher: "Turkiye Futbol Federasyonu (TFF)", url: "https://www.tff.org/default.aspx?pageID=1768", readOn: "2026-09-15" },
        { publisher: "UEFA", url: "https://www.uefa.com/uefachampionsleague/news/02a8-2171a88881a0-c70193b972c6-1000--meet-the-2026-27-champions-league-league-phase-teams/", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "ESPN", url: "https://www.espn.com/soccer/standings/_/league/tur.1/season/2025", readOn: "2026-09-15" },
        { publisher: "Sporting Life", url: "https://www.sportinglife.com/football/league-tables/turkish-super-lig/15/seasons/2025-2026/107", readOn: "2026-09-15" },
      ],
    },
    proleague: {
      table: ["Club Brugge", "Union Saint-Gilloise", "Sint-Truiden", "Anderlecht", "Gent", "Mechelen"],
      official: [
        { publisher: "Pro League (positions 1 to 3 only)", url: "https://www.proleague.be/nieuws/club-brugge-na-ijzersterke-play-offs-voor-de-twintigste-keer-landskampioen", readOn: "2026-09-15" },
        { publisher: "UEFA match data API", url: "https://match.uefa.com/v5/matches?competitionId=1&seasonYear=2027&offset=0&limit=200&order=ASC", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "ESPN", url: "https://www.espn.com/soccer/standings/_/league/bel.1/season/2025", readOn: "2026-09-15" },
        { publisher: "Sporting Life", url: "https://www.sportinglife.com/football/league-tables/belgian-jupiler-pro-league/78/seasons/2025-2026/107", readOn: "2026-09-15" },
      ],
      third: [
        { publisher: "Voetbalexpress", url: "https://www.voetbalexpress.be/seizoen2025-2026/championsplayoff2026.html", readOn: "2026-09-15" },
        { publisher: "Voetbalexpress", url: "https://www.voetbalexpress.be/seizoen2025-2026/europaleagueplayoff2026.html", readOn: "2026-09-15" },
        { publisher: "Wikipedia (corroborating only)", url: "https://en.wikipedia.org/wiki/2025%E2%80%9326_Belgian_Pro_League", readOn: "2026-09-15" },
      ],
      note: "The Champions' Play-off order after the points halving. Every source prints the Europe Play-off as its own group rather than as places 7 to 12, so those are not shipped.",
    },
    austria: {
      table: ["LASK", "Sturm Graz", "RB Salzburg", "Austria Wien", "Rapid Wien", "Hartberg", "Ried", "Wolfsberger AC", "Altach", "Grazer AK"],
      official: [
        { publisher: "Osterreichische Fussball-Bundesliga", url: "https://www.bundesliga.at/de/tabelle/saison-2025-2026", readOn: "2026-09-15" },
        { publisher: "UEFA match data API", url: "https://match.uefa.com/v5/matches?competitionId=1&seasonYear=2027&offset=0&limit=200&order=ASC", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "ESPN", url: "https://www.espn.com/soccer/standings/_/league/aut.1/season/2025", readOn: "2026-09-15" },
        { publisher: "Sporting Life", url: "https://www.sportinglife.com/football/league-tables/austrian-bundesliga/40/seasons/2025-2026/107", readOn: "2026-09-15" },
      ],
      note: "The Meistergruppe after the points halving. Salzburg sit above Austria Wien on 29 by the halved points tiebreak.",
    },
    greece: {
      table: ["AEK Athens", "Olympiacos", "PAOK", "Panathinaikos", "Aris", "Levadiakos", "OFI", "Volos", "Atromitos", "Kifisia"],
      official: [
        { publisher: "Super League Greece (slgr.gr)", url: "https://www.slgr.gr/en/scoreboard/24/", readOn: "2026-09-15" },
        { publisher: "UEFA match data API", url: "https://match.uefa.com/v5/matches?competitionId=1&seasonYear=2027&offset=0&limit=200&order=ASC", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "ESPN", url: "https://www.espn.com/soccer/standings/_/league/gre.1/season/2025", readOn: "2026-09-15" },
        { publisher: "Sporting Life", url: "https://www.sportinglife.com/football/league-tables/greek-super-league/41/seasons/2025-2026/107", readOn: "2026-09-15" },
        { publisher: "Proto Thema (2026-05-17)", url: "https://www.protothema.gr/sports/article/1820097/stin-5i-thesi-o-aris-7os-o-ofi-i-teliki-vathmologia-ton-playoffs/", readOn: "2026-09-15" },
      ],
      note: "The championship play-off is 1 to 4, then the 5 to 8 group, where Aris are 5th on head to head.",
    },
    denmark: {
      table: ["AGF", "FC Midtjylland", "FC Nordsjælland", "Brøndby IF", "Viborg FF", "SønderjyskE", "FC Copenhagen", "OB", "Silkeborg IF", "Randers FC"],
      official: [
        { publisher: "Superligaen A/S data API (behind superliga.dk/stilling)", url: "https://api.superliga.dk/tournaments/46/standings?seasonId=27018", readOn: "2026-09-15" },
        { publisher: "UEFA match data API", url: "https://match.uefa.com/v5/matches?competitionId=1&seasonYear=2027&offset=0&limit=200&order=ASC", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "ESPN", url: "https://www.espn.com/soccer/standings/_/league/den.1/season/2025", readOn: "2026-09-15" },
        { publisher: "Sporting Life", url: "https://www.sportinglife.com/football/league-tables/danish-superligaen/73/seasons/2025-2026/107", readOn: "2026-09-15" },
      ],
      note: "The championship group is 1 to 6 after 22 rounds, points carried over in full.",
    },
    switzerland: {
      table: ["Thun", "St. Gallen", "Lugano", "Sion", "Basel", "Young Boys", "Luzern", "Servette", "Lausanne-Sport", "FC Zürich"],
      official: [
        { publisher: "Swiss Football League (season selector 2025/2026)", url: "https://sfl.ch/de/superleague-tabelle", readOn: "2026-09-15" },
        { publisher: "SFL ranking feed loaded by sfl.ch", url: "https://origins-widgets-orchestrator.origins-digital.com/api/ranking?competitionId=undefined&tournamentCalendarId=d5ju52a9misru35821zuqysd0", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "TNT Sports", url: "https://www.tntsports.co.uk/football/swiss-super-league/2025-2026/standings.shtml", readOn: "2026-09-15" },
        { publisher: "Sporting Life", url: "https://www.sportinglife.com/football/league-tables/swiss-super-league/36/seasons/2025-2026/107", readOn: "2026-09-15" },
      ],
      note: "The championship round is 1 to 6, points carried over in full.",
    },
    croatia: {
      table: ["Dinamo Zagreb", "Hajduk Split", "Varaždin", "Rijeka", "Lokomotiva Zagreb", "Istra 1961", "Gorica", "Slaven Belupo", "Osijek"],
      official: [
        { publisher: "HNS / SuperSport HNL (hnl.hr)", url: "https://hnl.hr/povijest/rezultati-i-poretci/?sid=35", readOn: "2026-09-15" },
        { publisher: "UEFA match data API", url: "https://match.uefa.com/v5/matches?competitionId=1&seasonYear=2027&offset=0&limit=200&order=ASC", readOn: "2026-09-15" },
      ],
      press: [
        { publisher: "BeSoccer", url: "https://www.besoccer.com/competition/table/1_hnl/2026", readOn: "2026-09-15" },
        { publisher: "ZGnogomet", url: "https://zgnogomet.com/natjecanje/supersport-hnl-sezona-2025-2026/", readOn: "2026-09-15" },
      ],
      note: "10th was Vukovar 1991, relegated and not in the game, so the table stops at 9.",
    },
  },
};

/** European league ids with no verified 2025-26 table above. Empty: all fifteen are verified. */
export const CM_FINAL_TABLES_PARTIAL: string[] = [];
