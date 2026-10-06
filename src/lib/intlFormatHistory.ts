/**
 * Round 1027: the World Cup and the six continental championships, format by
 * format, so a Soccer Career that starts in 1994 plays the 1994 shapes.
 *
 * WHY THIS FILE EXISTS. Before this round tournamentForYear handed out one
 * fixed shape per competition whatever the year: a 1994 World Cup was played
 * with 48 teams and a round of 32, a 1996 Euros with 24 teams, and every
 * continental cup with its 2020s shape. A career can start in 1990, so the
 * tournaments a player actually lived through were the wrong size.
 *
 * WHAT WAS VERIFIED, EXACTLY. Every row below was checked on
 * INTL_FORMAT_VERIFIED_ON against at least two publishers, neither of them
 * Wikipedia: RSSSF's page for the edition that opened the shape (its group
 * tables and the ties of its first knockout round), against the
 * confederation's own history pages where they exist (Concacaf, the OFC) or an
 * independent publisher (footballhistory.org, topendsports.com, Inside World
 * Football, guidetofootball.com, and news outlets for single editions). A row
 * is a claim about the edition that opened it and the edition that closed it,
 * with the editions in between resting on the same sources saying when the
 * shape changed next. That is the same standard src/lib/uclFormatHistory.ts
 * holds the Champions League to.
 *
 * The number of best third placed sides is never typed from memory: it is the
 * size of the first knockout round minus two per group, read off RSSSF's own
 * knockout ties (eight round of 16 ties from six groups of four means four
 * thirds went through), and the harness holds every row to that sum.
 *
 * SHAPES THE ENGINE CANNOT PLAY. The tournament engine plays groups of three
 * or four with the top two going through, plus best thirds. Some real
 * editions did something else: the 1991 Copa America ended in a final group
 * of four with no final, the 2021 Copa America sent four of each five team
 * group through, the 1996 Gold Cup took the best runner up from groups of
 * three, and three OFC editions were a knockout or a round robin. Those rows
 * are here with their real shape, marked playable: false, and point at the
 * nearest verified shape the game plays instead (playedAs). They are not
 * thin data, they are honest about a simplification.
 *
 * THIN DATA. A row the sources could not confirm twice is listed in
 * INTL_FORMAT_PARTIAL, the same shape CM_PARTIAL uses in Club Manager, and
 * falls back to the nearest verified shape rather than a guess.
 *
 * THE CALENDAR IS NOT IN HERE. The game keeps its own calendar (a World Cup
 * when year % 4 === 2, every continental cup two years later), which is a
 * deliberate simplification documented in src/lib/soccerInternational.ts.
 * This table only answers "what shape was this competition in, that year":
 * the row in force for a year is the last row whose first edition is at or
 * before it.
 *
 * THE ENGINE RULE. This module is pure data and imports nothing, so it can
 * never be part of an import cycle. src/lib/soccerInternational.ts reads it;
 * scripts/simIntlFormatHistory.mjs walks every year from 1990 to 2040 and
 * holds the engine to it.
 */

/** The day every row below was checked against its sources. */
export const INTL_FORMAT_VERIFIED_ON = '2026-10-05';

/** The same six confederations the engine uses. */
export type IntlConfederation = 'UEFA' | 'CONMEBOL' | 'CAF' | 'AFC' | 'CONCACAF' | 'OFC';

/** The World Cup, or one confederation's own championship. */
export type IntlCompetition = 'WC' | IntlConfederation;

/** Knockout rounds a shape can open with. */
export type IntlKnockoutRound = 'R32' | 'R16' | 'QF' | 'SF';

export interface IntlFormatSource {
  id: string;
  publisher: string;
  title: string;
  url: string;
}

/** Every source the table cites. No Wikipedia page is one of them. */
export const INTL_FORMAT_SOURCES: IntlFormatSource[] = [
  /* World Cup */
  { id: 'tesFormats', publisher: 'Topend Sports', title: 'FIFA World Cup Finals Formats', url: 'https://www.topendsports.com/events/worldcupsoccer/formats.htm' },
  { id: 'rs90', publisher: 'RSSSF', title: 'World Cup 1990 Final Tournament, full details', url: 'https://www.rsssf.org/tables/90full.html' },
  { id: 'rs94', publisher: 'RSSSF', title: 'World Cup 1994 Final Tournament, full details', url: 'https://www.rsssf.org/tables/94full.html' },
  { id: 'rs98', publisher: 'RSSSF', title: 'World Cup 1998 Final Tournament, full details', url: 'https://www.rsssf.org/tables/98full.html' },
  { id: 'rs02', publisher: 'RSSSF', title: 'World Cup 2002 Final Tournament, full details', url: 'https://www.rsssf.org/tables/2002full.html' },
  { id: 'fh90', publisher: 'footballhistory.org', title: 'FIFA World Cup 1990 in Italy', url: 'https://www.footballhistory.org/world-cup/1990-italy.html' },
  { id: 'fh94', publisher: 'footballhistory.org', title: 'FIFA World Cup 1994 in the United States', url: 'https://www.footballhistory.org/world-cup/1994-united-states.html' },
  { id: 'fh98', publisher: 'footballhistory.org', title: 'FIFA World Cup 1998 in France', url: 'https://www.footballhistory.org/world-cup/1998-france.html' },
  { id: 'fh02', publisher: 'footballhistory.org', title: 'FIFA World Cup 2002 in Korea and Japan', url: 'https://www.footballhistory.org/world-cup/2002-korea-japan.html' },
  { id: 'ofc2026', publisher: 'Oceania Football Confederation', title: 'FIFA Council approves international match calendars with a change in format for 2026 FIFA World Cup', url: 'https://www.oceaniafootball.com/fifa-council-approves-international-match-calendars-with-a-change-in-format-for-2026-fifa-world-cup/' },
  { id: 'arxivSlots', publisher: 'arXiv (Csato and others)', title: 'The allocation of FIFA World Cup slots based on the ranking of confederations, Table 2', url: 'https://arxiv.org/pdf/2310.19100' },
  { id: 'atrSlots', publisher: 'Around the Rings (Infobae)', title: 'Current allocation of FIFA World Cup confederation slots maintained', url: 'https://www.infobae.com/aroundtherings/federations/2021/07/12/current-allocation-of-fifa-world-cup-confederation-slots-maintained' },
  { id: 'csm2017', publisher: 'The Christian Science Monitor', title: 'FIFA expands, giving more slots to Africa, Asia, and Americas', url: 'https://www.csmonitor.com/Business/2017/0331/FIFA-expands-giving-more-slots-to-Africa-Asia-and-Americas' },
  /* European Championship */
  { id: 'fhEuro', publisher: 'footballhistory.org', title: 'The history of UEFA European Championship', url: 'https://www.footballhistory.org/european-championship.html' },
  { id: 'rsEuro', publisher: 'RSSSF', title: 'European Championship', url: 'https://www.rsssf.org/tablese/eurochamp.html' },
  { id: 'rs92e', publisher: 'RSSSF', title: 'European Championship 1992', url: 'https://www.rsssf.org/tables/92e.html' },
  { id: 'rs96e', publisher: 'RSSSF', title: 'European Championship 1996', url: 'https://www.rsssf.org/tables/96e.html' },
  { id: 'rs16e', publisher: 'RSSSF', title: 'European Championship 2016', url: 'https://www.rsssf.org/tables/2016e.html' },
  /* Copa America */
  { id: 'fhCopa', publisher: 'footballhistory.org', title: 'The history of Copa America', url: 'https://www.footballhistory.org/tournament/copa-america.html' },
  { id: 'rs91sa', publisher: 'RSSSF', title: 'Copa America 1991, full details', url: 'https://www.rsssf.org/tables/91safull.html' },
  { id: 'rs93sa', publisher: 'RSSSF', title: 'Copa America 1993, full details', url: 'https://www.rsssf.org/tables/93safull.html' },
  { id: 'sky2015', publisher: 'Sky Sports', title: 'Copa America 2015: Full guide featuring teams, fixtures and more', url: 'https://www.skysports.com/football/news/12011/9876149/copa-america-2015-full-guide-featuring-teams-fixtures-and-more' },
  { id: 'rs16sa', publisher: 'RSSSF', title: 'Copa America (Centenario) 2016', url: 'https://www.rsssf.org/tables/2016sa.html' },
  { id: 'si2016', publisher: 'Sports Illustrated', title: 'What is the Copa America Centenario? A guide for infrequent soccer viewers', url: 'https://www.si.com/soccer/2016/06/01/copa-america-centenario-tournament-format-corruption-explainer' },
  { id: 'rs19sa', publisher: 'RSSSF', title: 'Copa America 2019', url: 'https://www.rsssf.org/tables/2019sa.html' },
  { id: 'cbs2019', publisher: 'CBS Sports', title: 'Copa America 2019: Scores, standings, TV schedule, live stream, start times and more', url: 'https://www.cbssports.com/soccer/news/copa-america-2019-scores-standings-tv-schedule-live-stream-start-times-and-more/' },
  { id: 'bes2019', publisher: 'BeSoccer', title: 'All you need to know about Copa America 2019', url: 'https://www.besoccer.com/new/all-you-need-to-know-about-copa-america-2019-qualified-teams-groups-dates-607360' },
  { id: 'rs21sa', publisher: 'RSSSF', title: 'Copa America 2021', url: 'https://www.rsssf.org/tables/2021sa.html' },
  { id: 'si2021', publisher: 'Sports Illustrated', title: 'Copa America 2021: Full schedule, 10-team format, fixtures, times', url: 'https://www.si.com/soccer/2021/03/15/copa-america-2021-schedule-fixtures-ten-team-format' },
  { id: 'rs24sa', publisher: 'RSSSF', title: 'Copa America 2024', url: 'https://www.rsssf.org/tables/2024sa.html' },
  { id: 'nbc2024', publisher: 'NBC Sports', title: '2024 Copa America: How does it work, qualifying, top players, favorite, host cities, final', url: 'https://www.nbcsports.com/soccer/news/copa-america-2024-how-does-it-work-qualifying-top-players-favorite-host-cities-final' },
  /* Africa Cup of Nations */
  { id: 'fhAfcon', publisher: 'footballhistory.org', title: 'The history of African Cup of Nations', url: 'https://www.footballhistory.org/tournament/africa-cup-of-nations.html' },
  { id: 'rs92a', publisher: 'RSSSF', title: 'African Nations Cup 1992', url: 'https://www.rsssf.org/tables/92a.html' },
  { id: 'rs96a', publisher: 'RSSSF', title: 'African Nations Cup 1996', url: 'https://www.rsssf.org/tables/96a.html' },
  { id: 'tn2017', publisher: 'The National', title: 'Africa Cup of Nations 2017: Group-by-group guide and predictions', url: 'https://www.thenationalnews.com/sport/football/africa-cup-of-nations-2017-group-by-group-guide-and-predictions-1.55648' },
  { id: 'rs19a', publisher: 'RSSSF', title: 'African Nations Cup 2019', url: 'https://www.rsssf.org/tables/2019a.html' },
  { id: 'conv2019', publisher: 'The Conversation', title: 'What to expect from biggest ever Africa Cup of Nations tournament', url: 'https://theconversation.com/what-to-expect-from-biggest-ever-africa-cup-of-nations-tournament-117756' },
  /* AFC Asian Cup */
  { id: 'rs92as', publisher: 'RSSSF', title: 'Asian Nations Cup 1992', url: 'https://www.rsssf.org/tables/92asch.html' },
  { id: 'iwf1992', publisher: 'Inside World Football', title: '1992 Asian Cup', url: 'https://www.insideworldfootball.com/2024/01/03/1992-asian-cup/' },
  { id: 'rs96as', publisher: 'RSSSF', title: 'Asian Nations Cup 1996', url: 'https://www.rsssf.org/tables/96asch.html' },
  { id: 'rs00as', publisher: 'RSSSF', title: 'Asian Nations Cup 2000', url: 'https://www.rsssf.org/tables/00asch.html' },
  { id: 'iwf1996', publisher: 'Inside World Football', title: '1996 Asian Cup', url: 'https://www.insideworldfootball.com/2024/01/03/1996-asian-cup/' },
  { id: 'rs04as', publisher: 'RSSSF', title: 'Asian Nations Cup 2004', url: 'https://www.rsssf.org/tables/04asch.html' },
  { id: 'iwf2004', publisher: 'Inside World Football', title: '2004 Asian Cup', url: 'https://www.insideworldfootball.com/2024/01/03/2004-asian-cup/' },
  { id: 'rs19as', publisher: 'RSSSF', title: 'Asian Nations Cup 2019', url: 'https://www.rsssf.org/tables/2019asch.html' },
  { id: 'gtfAsian', publisher: 'guidetofootball.com', title: 'The AFC Asian Cup', url: 'https://guidetofootball.com/competitions/afc-asian-cup/' },
  /* Concacaf Gold Cup */
  { id: 'concGrowth', publisher: 'Concacaf', title: 'The growth of the Concacaf Gold Cup: From 1991 to 2019', url: 'https://www.concacaf.com/news/the-growth-of-the-concacaf-gold-cup-from-1991-to-2019' },
  { id: 'rs91gc', publisher: 'RSSSF', title: 'Gold Cup 1991', url: 'https://www.rsssf.org/tables/91gc.html' },
  { id: 'rs96gc', publisher: 'RSSSF', title: 'Gold Cup 1996', url: 'https://www.rsssf.org/tables/96gc.html' },
  { id: 'rs00gc', publisher: 'RSSSF', title: 'Gold Cup 2000', url: 'https://www.rsssf.org/tables/00gc.html' },
  { id: 'rs05gc', publisher: 'RSSSF', title: 'Gold Cup 2005', url: 'https://www.rsssf.org/tables/05gc.html' },
  { id: 'mls2017', publisher: 'MLSsoccer.com', title: '2017 CONCACAF Gold Cup: Your ultimate guide to North America\'s tournament', url: 'https://www.mlssoccer.com/news/2017-concacaf-gold-cup-your-ultimate-guide-north-americas-tournament' },
  { id: 'rs19gc', publisher: 'RSSSF', title: 'Gold Cup 2019', url: 'https://www.rsssf.org/tables/2019gc.html' },
  { id: 'mnufc', publisher: 'Minnesota United FC', title: 'A Brief History of the Gold Cup', url: 'https://www.mnufc.com/news/brief-history-gold-cup' },
  /* OFC Nations Cup */
  { id: 'rsOfc', publisher: 'RSSSF', title: 'Oceanian Nations Cup', url: 'https://www.rsssf.org/tableso/oceania-cup.html' },
  { id: 'rs96oc', publisher: 'RSSSF', title: 'Oceanian Nations Cup 1996', url: 'https://www.rsssf.org/tables/96oc.html' },
  { id: 'rs98oc', publisher: 'RSSSF', title: 'Oceanian Nations Cup 1998', url: 'https://www.rsssf.org/tables/98oc.html' },
  { id: 'rs00oc', publisher: 'RSSSF', title: 'Oceanian Nations Cup 2000', url: 'https://www.rsssf.org/tables/00oc.html' },
  { id: 'rs02oc', publisher: 'RSSSF', title: 'Oceanian Nations Cup 2002', url: 'https://www.rsssf.org/tables/02oc.html' },
  { id: 'rs04oc', publisher: 'RSSSF', title: 'Oceanian Nations Cup 2004', url: 'https://www.rsssf.org/tables/04oc.html' },
  { id: 'rs12oc', publisher: 'RSSSF', title: 'Oceanian Nations Cup 2012', url: 'https://www.rsssf.org/tables/2012oc.html' },
  { id: 'rs16oc', publisher: 'RSSSF', title: 'Oceanian Nations Cup 2016', url: 'https://www.rsssf.org/tables/2016oc.html' },
  { id: 'rs24oc', publisher: 'RSSSF', title: 'Oceanian Nations Cup 2024', url: 'https://www.rsssf.org/tables/2024oc.html' },
  { id: 'ofc1996', publisher: 'Oceania Football Confederation', title: 'OFC Men\'s Nations Cup 1996', url: 'https://www.oceaniafootball.com/ofc-mens-nations-cup-1996/' },
  { id: 'ofc1998', publisher: 'Oceania Football Confederation', title: 'OFC Men\'s Nations Cup 1998', url: 'https://www.oceaniafootball.com/ofc-mens-nations-cup-1998/' },
  { id: 'ofc2000', publisher: 'Oceania Football Confederation', title: 'OFC Men\'s Nations Cup 2000', url: 'https://www.oceaniafootball.com/ofc-mens-nations-cup-2000/' },
  { id: 'ofc2002', publisher: 'Oceania Football Confederation', title: 'OFC Men\'s Nations Cup 2002', url: 'https://www.oceaniafootball.com/ofc-mens-nations-cup-2002/' },
  { id: 'ofc2004', publisher: 'Oceania Football Confederation', title: 'OFC Men\'s Nations Cup 2004', url: 'https://www.oceaniafootball.com/ofc-mens-nations-cup-2004/' },
  { id: 'ofc2008', publisher: 'Oceania Football Confederation', title: 'OFC Men\'s Nations Cup 2008', url: 'https://www.oceaniafootball.com/ofc-mens-nations-cup-2008/' },
  { id: 'ofc2012', publisher: 'Oceania Football Confederation', title: 'OFC Men\'s Nations Cup 2012', url: 'https://www.oceaniafootball.com/ofc-mens-nations-cup-2012/' },
  { id: 'ofc2016', publisher: 'Oceania Football Confederation', title: 'OFC Men\'s Nations Cup 2016', url: 'https://www.oceaniafootball.com/ofc-mens-nations-cup-2016/' },
  { id: 'ofc2024', publisher: 'Oceania Football Confederation', title: 'Draws finalised for OFC Men\'s Nations Cup 2024 and Qualifying tournament', url: 'https://www.oceaniafootball.com/draws-finalised-for-ofc-mens-nations-cup-and-qualifying-tournament/' },
];

export interface IntlFormatPeriod {
  id: string;
  competition: IntlCompetition;
  /** Year of the first edition played in this shape, inclusive. */
  from: number;
  /** Year of the last edition in this shape, inclusive; null while current. */
  to: number | null;
  /** Nations at the finals. */
  teams: number;
  /** Groups in the first stage; 0 when there was no group stage. */
  groups: number;
  /** Nations per group; 0 when there was no group stage. */
  groupSize: number;
  /** Third placed sides that also went through to the knockout. */
  thirdsThrough: number;
  /** The first knockout round; null when the title was settled by a final
   *  group or a round robin with no knockout. */
  firstKnockout: IntlKnockoutRound | null;
  /** false when the engine cannot play the real shape. */
  playable: boolean;
  /** For an unplayable row: the id of the verified row the game plays. */
  playedAs?: string;
  /** For a Copa America: the confederation its invited guests came from. */
  guestsFrom?: IntlConfederation;
  /** One plain sentence on what the real shape was, for rows the engine
   *  plays differently or that carry a caveat. */
  note?: string;
  /** Ids into INTL_FORMAT_SOURCES, at least two publishers per row. */
  sources: string[];
}

export const INTL_FORMAT_PERIODS: IntlFormatPeriod[] = [
  /* ── World Cup ── */
  {
    id: 'wc-24', competition: 'WC', from: 1986, to: 1994,
    teams: 24, groups: 6, groupSize: 4, thirdsThrough: 4, firstKnockout: 'R16', playable: true,
    sources: ['tesFormats', 'rs90', 'rs94', 'fh90', 'fh94'],
  },
  {
    id: 'wc-32', competition: 'WC', from: 1998, to: 2022,
    teams: 32, groups: 8, groupSize: 4, thirdsThrough: 0, firstKnockout: 'R16', playable: true,
    sources: ['tesFormats', 'rs98', 'fh98', 'rs02', 'fh02'],
  },
  {
    id: 'wc-48', competition: 'WC', from: 2026, to: null,
    teams: 48, groups: 12, groupSize: 4, thirdsThrough: 8, firstKnockout: 'R32', playable: true,
    sources: ['tesFormats', 'ofc2026'],
  },
  /* ── European Championship ── */
  {
    id: 'euro-8', competition: 'UEFA', from: 1984, to: 1992,
    teams: 8, groups: 2, groupSize: 4, thirdsThrough: 0, firstKnockout: 'SF', playable: true,
    sources: ['fhEuro', 'rsEuro', 'rs92e'],
  },
  {
    id: 'euro-16', competition: 'UEFA', from: 1996, to: 2012,
    teams: 16, groups: 4, groupSize: 4, thirdsThrough: 0, firstKnockout: 'QF', playable: true,
    sources: ['fhEuro', 'rsEuro', 'rs96e'],
  },
  {
    id: 'euro-24', competition: 'UEFA', from: 2016, to: null,
    teams: 24, groups: 6, groupSize: 4, thirdsThrough: 4, firstKnockout: 'R16', playable: true,
    sources: ['fhEuro', 'rsEuro', 'rs16e'],
  },
  /* ── Copa America ── */
  {
    id: 'copa-1991', competition: 'CONMEBOL', from: 1991, to: 1991,
    teams: 10, groups: 2, groupSize: 5, thirdsThrough: 0, firstKnockout: null,
    playable: false, playedAs: 'copa-12',
    note: 'All ten CONMEBOL sides in two groups of five, the top two of each into a final group of four with no final.',
    sources: ['rs91sa', 'fhCopa'],
  },
  {
    id: 'copa-12', competition: 'CONMEBOL', from: 1993, to: 2015,
    teams: 12, groups: 3, groupSize: 4, thirdsThrough: 2, firstKnockout: 'QF', playable: true,
    guestsFrom: 'CONCACAF',
    note: 'Two invited guests made it twelve. The game draws them from Concacaf, as in 1993, when the guests were Mexico and the USA.',
    sources: ['rs93sa', 'fhCopa', 'sky2015'],
  },
  {
    id: 'copa-centenario', competition: 'CONMEBOL', from: 2016, to: 2016,
    teams: 16, groups: 4, groupSize: 4, thirdsThrough: 0, firstKnockout: 'QF', playable: true,
    guestsFrom: 'CONCACAF',
    sources: ['rs16sa', 'si2016'],
  },
  {
    id: 'copa-2019', competition: 'CONMEBOL', from: 2019, to: 2019,
    teams: 12, groups: 3, groupSize: 4, thirdsThrough: 2, firstKnockout: 'QF', playable: true,
    guestsFrom: 'AFC',
    note: 'The two guests were Japan and Qatar.',
    sources: ['rs19sa', 'cbs2019', 'bes2019'],
  },
  {
    id: 'copa-2021', competition: 'CONMEBOL', from: 2021, to: 2021,
    teams: 10, groups: 2, groupSize: 5, thirdsThrough: 0, firstKnockout: 'QF',
    playable: false, playedAs: 'copa-2019',
    note: 'No guests: two groups of five, and the top four of each went through to the quarter-finals.',
    sources: ['rs21sa', 'si2021'],
  },
  {
    id: 'copa-16', competition: 'CONMEBOL', from: 2024, to: null,
    teams: 16, groups: 4, groupSize: 4, thirdsThrough: 0, firstKnockout: 'QF', playable: true,
    guestsFrom: 'CONCACAF',
    sources: ['rs24sa', 'nbc2024'],
  },
  /* ── Africa Cup of Nations ── */
  {
    id: 'afcon-12', competition: 'CAF', from: 1992, to: 1994,
    teams: 12, groups: 4, groupSize: 3, thirdsThrough: 0, firstKnockout: 'QF', playable: true,
    sources: ['rs92a', 'fhAfcon'],
  },
  {
    id: 'afcon-16', competition: 'CAF', from: 1996, to: 2017,
    teams: 16, groups: 4, groupSize: 4, thirdsThrough: 0, firstKnockout: 'QF', playable: true,
    note: 'Built for sixteen; the 1996 finals ran with fifteen after Nigeria withdrew.',
    sources: ['rs96a', 'fhAfcon', 'tn2017'],
  },
  {
    id: 'afcon-24', competition: 'CAF', from: 2019, to: null,
    teams: 24, groups: 6, groupSize: 4, thirdsThrough: 4, firstKnockout: 'R16', playable: true,
    sources: ['rs19a', 'conv2019'],
  },
  /* ── AFC Asian Cup ── */
  {
    id: 'asian-8', competition: 'AFC', from: 1992, to: 1992,
    teams: 8, groups: 2, groupSize: 4, thirdsThrough: 0, firstKnockout: 'SF', playable: true,
    sources: ['rs92as', 'iwf1992'],
  },
  {
    id: 'asian-12', competition: 'AFC', from: 1996, to: 2000,
    teams: 12, groups: 3, groupSize: 4, thirdsThrough: 2, firstKnockout: 'QF', playable: true,
    sources: ['rs96as', 'rs00as', 'iwf1996', 'gtfAsian'],
  },
  {
    id: 'asian-16', competition: 'AFC', from: 2004, to: 2015,
    teams: 16, groups: 4, groupSize: 4, thirdsThrough: 0, firstKnockout: 'QF', playable: true,
    sources: ['rs04as', 'iwf2004', 'gtfAsian'],
  },
  {
    id: 'asian-24', competition: 'AFC', from: 2019, to: null,
    teams: 24, groups: 6, groupSize: 4, thirdsThrough: 4, firstKnockout: 'R16', playable: true,
    sources: ['rs19as', 'gtfAsian'],
  },
  /* ── Concacaf Gold Cup ── */
  {
    id: 'gold-8', competition: 'CONCACAF', from: 1991, to: 1993,
    teams: 8, groups: 2, groupSize: 4, thirdsThrough: 0, firstKnockout: 'SF', playable: true,
    sources: ['rs91gc', 'concGrowth'],
  },
  {
    id: 'gold-1996', competition: 'CONCACAF', from: 1996, to: 1996,
    teams: 9, groups: 3, groupSize: 3, thirdsThrough: 0, firstKnockout: 'SF',
    playable: false, playedAs: 'gold-8',
    note: 'Nine teams in three groups of three, with the three group winners and the best runner up in the semi-finals.',
    sources: ['rs96gc', 'concGrowth'],
  },
  {
    id: 'gold-12-threes', competition: 'CONCACAF', from: 2000, to: 2003,
    teams: 12, groups: 4, groupSize: 3, thirdsThrough: 0, firstKnockout: 'QF', playable: true,
    sources: ['rs00gc', 'concGrowth'],
  },
  {
    id: 'gold-12-fours', competition: 'CONCACAF', from: 2005, to: 2017,
    teams: 12, groups: 3, groupSize: 4, thirdsThrough: 2, firstKnockout: 'QF', playable: true,
    sources: ['rs05gc', 'concGrowth', 'mls2017'],
  },
  {
    id: 'gold-16', competition: 'CONCACAF', from: 2019, to: null,
    teams: 16, groups: 4, groupSize: 4, thirdsThrough: 0, firstKnockout: 'QF', playable: true,
    sources: ['rs19gc', 'concGrowth', 'mnufc'],
  },
  /* ── OFC Nations Cup ── */
  {
    id: 'ofc-gap', competition: 'OFC', from: 1981, to: 1995,
    teams: 0, groups: 0, groupSize: 0, thirdsThrough: 0, firstKnockout: null,
    playable: false, playedAs: 'ofc-6',
    note: 'No Nations Cup was played between the 1980 and 1996 editions. The game still runs one on its own calendar, in the nearest verified shape.',
    sources: ['rsOfc'],
  },
  {
    id: 'ofc-1996', competition: 'OFC', from: 1996, to: 1996,
    teams: 4, groups: 0, groupSize: 0, thirdsThrough: 0, firstKnockout: 'SF',
    playable: false, playedAs: 'ofc-6',
    note: 'Four nations, with semi-finals and a final all played over two legs.',
    sources: ['rs96oc', 'ofc1996'],
  },
  {
    id: 'ofc-6', competition: 'OFC', from: 1998, to: 2000,
    teams: 6, groups: 2, groupSize: 3, thirdsThrough: 0, firstKnockout: 'SF', playable: true,
    sources: ['rs98oc', 'rs00oc', 'ofc1998', 'ofc2000'],
  },
  {
    id: 'ofc-8-2002', competition: 'OFC', from: 2002, to: 2002,
    teams: 8, groups: 2, groupSize: 4, thirdsThrough: 0, firstKnockout: 'SF', playable: true,
    sources: ['rs02oc', 'ofc2002'],
  },
  {
    id: 'ofc-2004', competition: 'OFC', from: 2004, to: 2004,
    teams: 6, groups: 1, groupSize: 6, thirdsThrough: 0, firstKnockout: null,
    playable: false, playedAs: 'ofc-8-2002',
    note: 'Six nations in one round robin group, then a two legged final between the top two.',
    sources: ['rs04oc', 'ofc2004'],
  },
  {
    id: 'ofc-2008', competition: 'OFC', from: 2008, to: 2008,
    teams: 4, groups: 1, groupSize: 4, thirdsThrough: 0, firstKnockout: null,
    playable: false, playedAs: 'ofc-8',
    note: 'Four nations playing each other home and away over most of a year, with no final.',
    sources: ['rsOfc', 'ofc2008'],
  },
  {
    id: 'ofc-8', competition: 'OFC', from: 2012, to: null,
    teams: 8, groups: 2, groupSize: 4, thirdsThrough: 0, firstKnockout: 'SF', playable: true,
    sources: ['rs12oc', 'rs16oc', 'rs24oc', 'ofc2012', 'ofc2016', 'ofc2024'],
  },
];

/** Rows the sources could not confirm twice. Same shape as CM_PARTIAL: a
 *  list of ids, and a thin row always falls back to a verified one. */
export const INTL_FORMAT_PARTIAL: string[] = ['ofc-gap'];

/* ── Who fills a World Cup ──────────────────────────────────────────────────

   The engine fills a World Cup confederation by confederation. A 48 team
   allocation poured into a 32 team field would have cut whole continents, so
   the mix is part of the history too. Two kinds of row:

   'finalists': who actually played the finals, counted by confederation from
   the group tables of two publishers (RSSSF and footballhistory.org agree on
   every nation). Used where the allocation itself could not be confirmed
   twice; it is the real field, so open is 0.

   'allocation': FIFA's places. Whole places go to the confederation; the half
   places of the intercontinental play-offs and the host's place are 'open',
   and the engine hands them to the best of whoever is left, the same way it
   has always handled the 2026 play-off places. 2006 to 2022 kept one
   allocation (arXiv Table 2, Around the Rings on 2018 and 2022 keeping "the
   current allocation", and the Christian Science Monitor giving the 2026
   increases "up from" those same numbers). */
export interface WcFieldMix {
  from: number;
  kind: 'finalists' | 'allocation';
  places: Record<IntlConfederation, number>;
  /** Places that go to the best of the rest: play-off and host places. */
  open: number;
  sources: string[];
}

export const WC_FIELD_MIXES: WcFieldMix[] = [
  {
    from: 1990, kind: 'finalists', open: 0,
    places: { UEFA: 14, CAF: 2, AFC: 2, CONMEBOL: 4, CONCACAF: 2, OFC: 0 },
    sources: ['rs90', 'fh90'],
  },
  {
    from: 1994, kind: 'finalists', open: 0,
    places: { UEFA: 13, CAF: 3, AFC: 2, CONMEBOL: 4, CONCACAF: 2, OFC: 0 },
    sources: ['rs94', 'fh94'],
  },
  {
    /* 1998 and 2002 finished with the same mix, checked edition by edition. */
    from: 1998, kind: 'finalists', open: 0,
    places: { UEFA: 15, CAF: 5, AFC: 4, CONMEBOL: 5, CONCACAF: 3, OFC: 0 },
    sources: ['rs98', 'fh98', 'rs02', 'fh02'],
  },
  {
    from: 2006, kind: 'allocation', open: 3,
    places: { UEFA: 13, CAF: 5, AFC: 4, CONMEBOL: 4, CONCACAF: 3, OFC: 0 },
    sources: ['arxivSlots', 'atrSlots', 'csm2017'],
  },
  {
    /* The 2026 allocation the engine already used (WC_SLOTS in
       soccerInternational.ts): CONCACAF's three host places plus its three
       direct places make six, and two inter-confederation play-off places. */
    from: 2026, kind: 'allocation', open: 2,
    places: { UEFA: 16, CAF: 9, AFC: 8, CONMEBOL: 6, CONCACAF: 6, OFC: 1 },
    sources: ['arxivSlots', 'csm2017'],
  },
];

/* ── Lookups ─────────────────────────────────────────────────────────────── */

/** Every row of one competition, oldest first. */
export function periodsOf(competition: IntlCompetition): IntlFormatPeriod[] {
  return INTL_FORMAT_PERIODS
    .filter(p => p.competition === competition)
    .sort((a, b) => a.from - b.from);
}

/** The real shape in force in a year: the last row whose first edition is at
 *  or before it, or the first row for a year before any of them. */
export function periodInForce(competition: IntlCompetition, year: number): IntlFormatPeriod {
  const rows = periodsOf(competition);
  let found = rows[0];
  for (const r of rows) if (r.from <= year) found = r;
  return found;
}

/** The shape the game plays for that row: itself, or the verified row it
 *  points at when the engine cannot play the real one. */
export function playedPeriod(period: IntlFormatPeriod): IntlFormatPeriod {
  if (period.playable) return period;
  const target = INTL_FORMAT_PERIODS.find(p => p.id === period.playedAs);
  return target && target.playable ? target : period;
}

/** The World Cup field mix in force in a year. */
export function wcFieldMixFor(year: number): WcFieldMix {
  let found = WC_FIELD_MIXES[0];
  for (const m of WC_FIELD_MIXES) if (m.from <= year) found = m;
  return found;
}
