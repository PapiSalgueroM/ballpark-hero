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
 * The data passed in is the site's own; this file reads nothing itself.
 */

export const fold = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');

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
  bosnia: 'bosniaandherzegovina', bosniaandherzegovina: 'bosniaandherzegovina',
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
};
export const club = s => { const k = fold(s); return CLUBS[k] ?? k; };

/** Builds { criterion, fits } from the site's data and the award lists. */
export function makeSoccerChecker({ careerPlayers, clubSeasonsOf, nationalityMaps, awardLists }) {
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
  for (const [name, keys] of clubSeasonsOf(careerPlayers)) {
    const set = new Set();
    for (const k of keys.exact) set.add(club(k.slice(0, k.lastIndexOf('::'))));
    clubsOf.set(fold(name), set);
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
    m = t.match(/^Played for (?:both )?(.+)$/);
    if (m) {
      if (/[()0-9+]/.test(m[1])) return null;
      const clubs = m[1].split(/,| AND | and /).map(s => s.trim()).filter(Boolean).map(club);
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
      const ns = lookup(nationsOf, name);
      if (!ns) return null;
      return ns.has(c.nation);
    }
    if (c.kind === 'club') {
      const cs = lookup(clubsOf, name);
      if (!cs) return null;
      return c.clubs.every(x => cs.has(x));
    }
    return null;
  }

  return { criterion, fits, labelOf: g => g.category };
}
