/**
 * Round 1553: soccer's checker for scripts/lib/connectionsCrossCheck.mjs.
 *
 * It judges the three kinds of group the committed data can see, and
 * answers null (unknown, counted) for everything else:
 *
 *   "From <country>"       the nationality the site's own tables give a man:
 *                          the career tables (src/data/careerPlayers.ts) and
 *                          Club Manager's nationality worlds, today's and the
 *                          four sealed eras. A man with no row anywhere is
 *                          null. A man any source puts in that country fits.
 *   "Played for <clubs>"   the career tables through clubSeasonsOf (the Transfer
 *                          Path link rule), so only the 253 men those tables
 *                          hold are judged. "both X and Y" and "X AND Y" need
 *                          every club. A label with a qualifier the tables
 *                          cannot see ("(2020s)", "6+ clubs") is null.
 *   award lists            closed lists of winners, each from a verified
 *                          ledger: the Ballon d'Or record (Round 730), the
 *                          soccer awards record (Round 708) and the lists
 *                          this round verified in connectionsVerified2026-10.
 *
 * The data passed in is the site's own. Only loadConnectionsRecord, at the
 * bottom, reads files: the round's record and the award ledgers.
 */

import fs from 'node:fs';
import path from 'node:path';

/* Letters NFD does not split into a base and a mark. */
const PLAIN = { ı: 'i', ł: 'l', ø: 'o', đ: 'd', ð: 'd', ß: 'ss', æ: 'ae', œ: 'oe', þ: 'th' };
export const fold = s => String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/[ıłøđðßæœþ]/g, c => PLAIN[c]).replace(/[^a-z0-9]/g, '');

/* Tile spellings the data writes another way. Folded on both sides. */
const ALIASES = {
  neymarjr: ['neymar'],
  ronaldinhogaucho: ['ronaldinho'],
  ricardokaka: ['kaka'],
  ronaldonazario: ['ronaldo'],
  ronaldo: ['ronaldonazario'],
  rivaldovitor: ['rivaldo'],
  viniciusjr: ['viniciusjunior'],
  viniciusjunior: ['viniciusjr'],
  adrianoleite: ['adriano'],
  alissonbecker: ['alisson'],
  alisson: ['alissonbecker'],
  alejandrogrimaldo: ['alexgrimaldo'],
};
export const keysOf = name => {
  const k = fold(name);
  return [k, ...(ALIASES[k] ?? [])];
};

/* Board wording on the left, the data's wording on the right, both folded. */
const NATIONS = {
  thenetherlands: 'netherlands', holland: 'netherlands',
  ivorycoast: 'cotedivoire', cotedivoire: 'cotedivoire',
  republicofireland: 'ireland', ireland: 'ireland',
  bosnia: 'bosniaandherzegovina', bosniaandherzegovina: 'bosniaandherzegovina', bosniaherzegovina: 'bosniaandherzegovina',
  koreasouth: 'southkorea',
  drcongo: 'drcongo', congodr: 'drcongo', democraticrepublicofthecongo: 'drcongo',
  southkorea: 'southkorea', korearepublic: 'southkorea',
  usa: 'unitedstates', unitedstates: 'unitedstates',
  czechrepublic: 'czechia', czechia: 'czechia',
  turkey: 'turkiye', turkiye: 'turkiye',
  northmacedonia: 'northmacedonia', macedonia: 'northmacedonia',
};
export const nation = s => { const k = fold(s); return NATIONS[k] ?? k; };

const CLUBS = {
  tottenhamhotspur: 'tottenham', newcastleunited: 'newcastle', asroma: 'roma',
  olympiquelyon: 'lyon', olympiquelyonnais: 'lyon', psveindhoven: 'psv', asmonaco: 'monaco',
  slbenfica: 'benfica', wolverhamptonwanderers: 'wolverhampton', wolves: 'wolverhampton',
  parissaintgermain: 'psg', internazionale: 'intermilan', inter: 'intermilan',
  olympiquedemarseille: 'marseille', westhamunited: 'westham', fcporto: 'porto',
  sportinglisbon: 'sportingcp', bayernmunchen: 'bayernmunich', fcbarcelona: 'barcelona',
  atleticodemadrid: 'atleticomadrid', leicester: 'leicestercity',
  /* Round 1565: the club's own name today; the career tables write Athletic Bilbao */
  athleticclub: 'athleticbilbao',
};

/* Round 1565: a board's word for a pair of city rivals, the two clubs it means. Before this the
   checker read "Played for both Milan clubs" as one club called "milanclubs" and called every
   man on it false, Seedorf and Ronaldo included. */
const PAIRS = {
  manchesterclubs: ['manchesterunited', 'manchestercity'],
  milanclubs: ['acmilan', 'intermilan'],
};
export const club = s => { const k = fold(s); return CLUBS[k] ?? k; };

/** "2025-26" to the career tables' "2025-2026". */
const longSeason = s => (s.length === 4 ? s : `${s.slice(0, 4)}-${s.slice(0, 2)}${s.slice(5, 7)}`);

/**
 * Builds { criterion, fits } from the site's data, the award lists and the
 * round's ledger (scripts/data/connectionsVerified2026-10/). The ledger
 * wins over the site's tables wherever it speaks: a man's nation, the clubs
 * he played for, and whole squads for a season, each on two hosts.
 */
export function makeSoccerChecker({ careerPlayers, clubSeasonsOf, nationalityMaps, awardLists, ledger = {} }) {
  const nationsOf = new Map();
  const addNation = (name, n) => {
    if (!n) return;
    const k = fold(name);
    if (!nationsOf.has(k)) nationsOf.set(k, new Set());
    nationsOf.get(k).add(nation(n));
  };
  for (const p of careerPlayers) addNation(p.name, p.nationality);
  for (const map of nationalityMaps) for (const [n, c] of Object.entries(map)) addNation(n, c);

  const clubsOf = new Map();
  const seasonsOf = new Map();
  for (const [name, keys] of clubSeasonsOf(careerPlayers)) {
    const set = new Set();
    for (const k of keys.exact) set.add(club(k.slice(0, k.lastIndexOf('::'))));
    clubsOf.set(fold(name), set);
    seasonsOf.set(fold(name), new Set([...keys.exact].map(k => `${club(k.slice(0, k.lastIndexOf('::')))}::${k.slice(k.lastIndexOf('::') + 2)}`)));
  }

  /* The ledger's own facts about a man replace the tables' guesses. */
  const ledgerNation = new Map();
  const ledgerClubs = new Map();
  for (const [name, p] of Object.entries(ledger.players ?? {})) {
    if (p.nation) ledgerNation.set(fold(name), nation(p.nation));
    if (p.clubs) ledgerClubs.set(fold(name), { clubs: new Set(p.clubs.map(club)), complete: p.clubsComplete === true });
  }
  const squads = new Map();
  for (const sq of Object.values(ledger.squads ?? {})) {
    squads.set(`${club(sq.club)} ${sq.season}`, { lists: sq.sources.map(s => new Set(s.players.map(fold))), wonLeague: Array.isArray(sq.wonLeague) && sq.wonLeague.length >= 2, league: fold(sq.league ?? ''), season: sq.season });
  }

  const lookup = (map, name) => {
    for (const k of keysOf(name)) if (map.has(k)) return map.get(k);
    return null;
  };

  function criterion(label) {
    const t = String(label).trim();
    for (const [key, list] of Object.entries(awardLists)) {
      if (list.labels.some(re => re.test(t))) return { kind: 'award', key };
    }
    let m = t.match(/^From (?:the )?(\p{L}[\p{L} .'-]*)$/u);
    if (m) return { kind: 'nation', nation: nation(m[1]) };
    m = t.match(/^Played for (.+) in ([0-9]{4}(?:-[0-9]{2})?)$/);
    if (m) return { kind: 'clubSeason', club: club(m[1]), season: m[2] };
    /* a title group: he played for the club that season, and the club won the league */
    m = t.match(/^Won the [A-Za-z ]+ with (.+?) [(]?([0-9]{4}-[0-9]{2})[)]?$/);
    if (m) return { kind: 'clubSeason', club: club(m[1]), season: m[2], title: true };
    m = t.match(/^Played in (?:the )?(.+) in ([0-9]{4}(?:-[0-9]{2})?)$/);
    if (m) return { kind: 'leagueSeason', league: fold(m[1]), season: m[2] };
    m = t.match(/^Played for (?:both )?(.+)$/);
    if (m) {
      if (/[()0-9+]/.test(m[1])) return null;
      const clubs = m[1].split(/,| AND | and /).map(s => s.trim()).filter(Boolean).map(club).flatMap(c => PAIRS[c] ?? [c]);
      return { kind: 'club', clubs };
    }
    return null;
  }

  function fits(name, c) {
    if (c.kind === 'award') {
      const members = awardLists[c.key].members;
      return keysOf(name).some(k => members.has(k));
    }
    if (c.kind === 'nation') {
      const own = lookup(ledgerNation, name);
      if (own) return own === c.nation;
      const ns = lookup(nationsOf, name);
      if (!ns) return null;
      return ns.has(c.nation);
    }
    if (c.kind === 'club') {
      const own = lookup(ledgerClubs, name);
      const table = lookup(clubsOf, name);
      if (!own && !table) return null;
      const have = new Set([...(own?.clubs ?? []), ...(table ?? [])]);
      if (c.clubs.every(x => have.has(x))) return true;
      return own?.complete || (!own && table) ? false : null;
    }
    if (c.kind === 'clubSeason') {
      const sq = squads.get(`${c.club} ${c.season}`);
      if (c.title && !sq?.wonLeague) return null;
      const lists = sq?.lists;
      if (lists) {
        const hits = lists.filter(set => keysOf(name).some(k => set.has(k))).length;
        if (hits === lists.length) return true;
        if (hits === 0) return false;
        return null;
      }
      const s = lookup(seasonsOf, name);
      return s && s.has(`${c.club}::${longSeason(c.season)}`) ? true : null;
    }
    if (c.kind === 'leagueSeason') {
      /* true when both hosts of one of that league's squads that season list him; never false, since no ledger holds a whole league */
      for (const sq of squads.values()) {
        if (sq.league !== c.league || sq.season !== c.season) continue;
        if (sq.lists.every(set => keysOf(name).some(k => set.has(k)))) return true;
      }
      return null;
    }
    return null;
  }

  return { criterion, fits, labelOf: g => g.category };
}

/**
 * The record the checker judges by: the round's ledger with its squads, and the
 * closed award lists, each from a verified ledger. The one function here that
 * reads files; simConnectionsFacts and simFairPuzzles both load through it.
 */
export function loadConnectionsRecord(root) {
  const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  const ledger = read('scripts/data/connectionsVerified2026-10/ledger.json');
  ledger.squads = read('scripts/data/connectionsVerified2026-10/squads.json').squads;
  /* The closed award lists the checker may judge, each from a verified ledger. */
  const ballon = read('scripts/data/ballonDorVerified2026-09.json');
  const awards = read('scripts/data/soccerAwardsVerified2026-09.json');
  const setOf = names => new Set(names.map(fold));
  const men = ballon.rows.filter(r => r.award_type === 'Men' && r.rank === 1);
  /* knownGaps are winners the sources have decided and the table does not hold yet: still winners. */
  const winnersOf = award => { const a = awards.verifiedAwards.find(x => x.award === award); return [...(a?.winners ?? []), ...(a?.knownGaps ?? [])].map(w => w.winner); };
  const awardLists = {
    ballonDor: { labels: [/^Won the Ballon d'Or$/], members: setOf(men.map(r => r.player_name)) },
    ballonDor2000s: { labels: [/^Won the Ballon d'Or in the 2000s$/], members: setOf(men.filter(r => r.year >= 2000 && r.year <= 2009).map(r => r.player_name)) },
    ballonDor2010s: { labels: [/^Won the Ballon d'Or in the 2010s$/], members: setOf(men.filter(r => r.year >= 2010 && r.year <= 2019).map(r => r.player_name)) },
    ballonDorFeminin: { labels: [/^Won the Ballon d'Or F[eé]minin$/], members: setOf(ballon.rows.filter(r => r.award_type === 'Women' && r.rank === 1).map(r => r.player_name)) },
    goldenShoe: { labels: [/^Won the European Golden Shoe$/], members: setOf(winnersOf('European Golden Shoe')) },
    plPlayerOfSeason: { labels: [/^Won the Premier League Player of the Season$/], members: setOf(winnersOf('Premier League Player of the Season')) },
    mlsMvp: { labels: [/^Won the MLS MVP$/, /^MLS MVP winners$/], members: setOf(winnersOf('MLS MVP')) },
  };
  /* Lists this round verified, two hosts each, live in the ledger. */
  for (const [key, list] of Object.entries(ledger.lists ?? {})) {
    awardLists[key] = { labels: list.labels.map(l => ({ test: t => t === l })), members: setOf(list.members) };
  }
  return { ledger, awardLists };
}
