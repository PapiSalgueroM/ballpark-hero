/**
 * Round 1558: the baseball, NFL and NHL checkers for
 * scripts/lib/connectionsCrossCheck.mjs (Round 1553's one cross check).
 *
 * Each sport answers the two questions that lib asks:
 *   criterion(label)  -> what the group claims, or null when the record
 *                        cannot judge it (counted by the harness, never
 *                        skipped silently)
 *   fits(name, crit)  -> true, false, or null when the record does not
 *                        reach the man or cannot decide
 *
 * The record a sport judges by:
 *   baseball  scripts/data/baseballConnectionsRecord-2026-10.json, the
 *             league's own data service, one row per tile name
 *   NFL       scripts/data/nflGridPlayers.json (the NFL Grid's roster
 *             table, 1970 to 2025) plus the round's ledger
 *   NHL       scripts/data/nhlConnectionsRecord-2026-10.json, the league's
 *             own data service
 * and over each, the round's two host ledger
 * (scripts/data/<sport>ConnectionsVerified-2026-10.json): closed lists the
 * record does not hold (a batting Triple Crown, a final's roster), and
 * per man corrections where the record is wrong or short (an "overlay").
 * The ledger always wins over the record, because every line of it stands
 * on two hosts.
 *
 * Nothing here reads the network or the clock. loadUsConnectionsRecord, at
 * the bottom, is the only function that reads files.
 */

import fs from 'node:fs';
import path from 'node:path';

const PLAIN = { ı: 'i', ł: 'l', ø: 'o', đ: 'd', ð: 'd', ß: 'ss', æ: 'ae', œ: 'oe', þ: 'th' };
export const fold = s => String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/[ıłøđðßæœþ]/g, c => PLAIN[c]).replace(/[^a-z0-9]/g, '');

/** A name table keyed by the folded name, with the ledger's aliases (tile spelling -> record spelling). */
function indexByName(men, aliases = {}) {
  const map = new Map();
  for (const [name, row] of Object.entries(men)) map.set(fold(name), row);
  for (const [tile, recordName] of Object.entries(aliases)) {
    const row = map.get(fold(recordName));
    if (row) map.set(fold(tile), row);
  }
  return map;
}

/** A closed list from the ledger: { members: [names], sources } -> a folded set. */
const listSet = list => new Set((list?.members ?? []).map(fold));

/* ------------------------------------------------------------------ */
/* baseball                                                            */
/* ------------------------------------------------------------------ */

/* Board wording -> the record's club id (statsapi franchise ids, stable through moves). */
const MLB_CLUBS = {
  angels: 108, losangelesangels: 108, diamondbacks: 109, arizonadiamondbacks: 109, orioles: 110, baltimoreorioles: 110,
  redsox: 111, bostonredsox: 111, cubs: 112, chicagocubs: 112, reds: 113, cincinnatireds: 113,
  guardians: 114, indians: 114, clevelandguardians: 114, clevelandindians: 114, clevelandguardiansindians: 114,
  rockies: 115, coloradorockies: 115, tigers: 116, detroittigers: 116, astros: 117, houstonastros: 117,
  royals: 118, kansascityroyals: 118, dodgers: 119, losangelesdodgers: 119,
  nationals: 120, washingtonnationals: 120, expos: 120, montrealexpos: 120, montrealexposwashingtonnationals: 120,
  mets: 121, newyorkmets: 121, athletics: 133, oaklandathletics: 133, pirates: 134, pittsburghpirates: 134,
  padres: 135, sandiegopadres: 135, mariners: 136, seattlemariners: 136, giants: 137, sanfranciscogiants: 137,
  cardinals: 138, stlouiscardinals: 138, rays: 139, tampabayrays: 139, rangers: 140, texasrangers: 140,
  bluejays: 141, torontobluejays: 141, twins: 142, minnesotatwins: 142, phillies: 143, philadelphiaphillies: 143,
  braves: 144, atlantabraves: 144, whitesox: 145, chicagowhitesox: 145, marlins: 146, miamimarlins: 146,
  yankees: 147, newyorkyankees: 147, brewers: 158, milwaukeebrewers: 158,
};
/* Board wording -> the record's birthCountry wording, both folded. */
const MLB_COUNTRIES = {
  thedominicanrepublic: 'dominicanrepublic', dominicanrepublic: 'dominicanrepublic', dom: 'dominicanrepublic',
  venezuela: 'venezuela', ven: 'venezuela', cuba: 'cuba', cub: 'cuba', puertorico: 'puertorico', pr: 'puertorico',
  japan: 'japan', mexico: 'mexico', panama: 'panama',
  /* Rod Carew was born in Gatun, in the Canal Zone the United States held inside Panama: the board's "Born in
     Panama" means the place, so the zone counts as Panama */
  panamacanalzone: 'panama',
  curacao: 'curacao', colombia: 'colombia', southkorea: 'southkorea', republicofkorea: 'southkorea', korea: 'southkorea',
  australia: 'australia', canada: 'canada', aruba: 'aruba', jamaica: 'jamaica', usa: 'usa', unitedstates: 'usa',
};
const OUTFIELD = new Set(['LF', 'CF', 'RF', 'OF']);
const POSITIONS = {
  catcher: ['C'], catchers: ['C'], firstbase: ['1B'], firstbasemen: ['1B'], secondbase: ['2B'], secondbasemen: ['2B'],
  shortstop: ['SS'], shortstops: ['SS'], thirdbase: ['3B'], thirdbasemen: ['3B'],
  outfield: ['LF', 'CF', 'RF', 'OF'], theoutfield: ['LF', 'CF', 'RF', 'OF'],
  centerfield: ['CF'], centerfielders: ['CF'], leftfielders: ['LF'], rightfielders: ['RF'],
  designatedhitter: ['DH'], pitcher: ['P'], apitcher: ['P'],
};

const awardSeasons = (m, codes) => codes.flatMap(c => (m.aw?.[c] ?? []).map(x => x[0]));
const hasAward = (m, codes) => codes.some(c => (m.aw?.[c] ?? []).length > 0);
const isPitcher = m => m.pos === 'P' || (m.car?.pG ?? 0) > 0 && (m.car?.pG ?? 0) >= (m.car?.G ?? 0) * 0.5;
/** Share of a man's games in the field at these positions (designated hitter counted, pitching not). */
function posShare(m, set) {
  let at = 0, all = 0;
  for (const [p, g] of Object.entries(m.posG ?? {})) {
    if (p === 'P') continue;
    all += g;
    if (set.has(p)) at += g;
  }
  return all > 0 ? at / all : null;
}
/**
 * The share rule: at least 35 percent of his games there fits, under 10 percent does not, between is unknown.
 * Round 1558 drew the upper line at 30 with no headroom (Stan Musial fit "Hall of Fame left fielders" on
 * bconn-057 with 30.3 percent while Frank Robinson, 29.4 percent there, was unknown beside him: a coin toss
 * either way). Round 1567 moved it into the one gap the members leave, measured 2026-10-29 over the 60
 * baseball boards (200 members the share decides): 33.8 (Jim Thome at designated hitter, bconn-038) to 40.6
 * (Harmon Killebrew at first base, bconn-035), none between. Musial, Thome and Paul Molitor (29.7 at third)
 * fell under it and left those groups, and every other tile the record could not judge (53 pairs, a man with
 * 10 to 30 percent of his games beside a position group) left its board, so no tile sits between the lines.
 * After the round the closest member is Frank Thomas, 42.6 percent at first base (bconn-022, 028, 045).
 * The 10 line has no gap to move into (the other tiles under it run evenly from 0 to 9.9: Honus Wagner,
 * 9.9 at first base, bconn-053), so it stays; a tile under it is not called a fit by anyone who knows him.
 * Section 7 of simUsConnectionsFacts holds both unknown counts at 0, so a pair between the lines that comes
 * back turns it red; it is rebuilt on its board, never settled by moving a line.
 */
export const SHARE_FITS = 0.35;
export const SHARE_OUT = 0.1;
function shareVerdict(share) {
  if (share === null) return null;
  if (share >= SHARE_FITS) return true;
  if (share < SHARE_OUT) return false;
  return null;
}
/** An award won while playing a position: the season's most games position decides. */
function awardAt(m, codes, set) {
  const seasons = awardSeasons(m, codes);
  if (!seasons.length) return false;
  let unknown = false;
  for (const y of seasons) {
    const top = m.ss?.[y]?.[3];
    if (!top) { unknown = true; continue; }
    if (set.has(top)) return true;
  }
  return unknown ? null : false;
}
const pitchRole = m => {
  const g = m.car?.pG ?? 0;
  if (!g) return null;
  return (m.car?.GS ?? 0) / g;
};
const amateurDrafts = m => (m.dr ?? []).filter(d => d[1] !== 'RV');

/**
 * Baseball's checker. record: { men }, ledger: the round's two host ledger.
 */
export function makeBaseballChecker({ record, ledger = {} }) {
  const men = { ...record.men };
  /* the ledger's corrections win over the record: each stands on two hosts */
  for (const [name, o] of Object.entries(ledger.overlay ?? {})) {
    men[name] = { ...(men[name] ?? {}), ...(o.set ?? {}) };
  }
  const byName = indexByName(men, ledger.aliases);
  const lists = new Map(Object.entries(ledger.lists ?? {}).map(([k, v]) => [fold(v.label ?? k), v]));
  /* the record's closed lists, each whole from one page (scripts/usConnections/fetchMlbLists.mjs): a man is on
     one by his baseball-reference id, his league id, or, off the record, his name */
  const recordLists = record.lists ?? {};
  const onList = (key, name, filter = () => true) => {
    const list = recordLists[key];
    if (!list) return null;
    const m = byName.get(fold(name));
    return list.members.filter(filter).some(x => (m && ((x.id && x.id === m.bbref) || (x.mlb && x.mlb === m.id))) || fold(x.name) === fold(name));
  };
  const LIST_LABELS = {
    threwanohitter: { list: 'noHitters' },
    wonthebattingtriplecrown: { list: 'tripleCrownBatting' },
    triplecrownwinners: { list: ['tripleCrownBatting', 'tripleCrownPitching'] },
    wonbattingtitle2010s2020s: { list: 'battingTitles', filter: x => x.year >= 2010 },
    wenttothesamecollegevanderbilt: { list: 'vanderbilt' },
    playedcollegebaseballatlsu: { list: 'lsu' },
    playedinthe2023worldbaseballclassicfinal: { list: 'wbc2023Final' },
    fathersonmlbplayers: { list: 'fatherSon' },
  };

  function criterion(label) {
    const f = fold(label);
    if (lists.has(f)) return { kind: 'list', key: f };
    const rl = LIST_LABELS[f];
    if (rl && [rl.list].flat().every(k => recordLists[k])) return { kind: 'recordList', keys: [rl.list].flat(), filter: rl.filter };
    if (f === 'secondbasemen21stcenturystars') return { kind: 'posEra', pos: ['2B'], since: 2001 };
    let m;
    if ((m = label.match(/^Born in (.+?)( \(pitchers\))?$/))) {
      const c = MLB_COUNTRIES[fold(m[1])];
      return c ? { kind: 'born', country: c, pitchers: !!m[2] } : null;
    }
    if ((m = label.match(/^Played for the (.+?)(?: \(as of (\d{4})\))?$/)) || (m = label.match(/^(.+) legends$/))) {
      /* "Montreal Expos / Washington Nationals" and "Cleveland Guardians/Indians" name one franchise twice */
      const ids = new Set([MLB_CLUBS[fold(m[1])], ...m[1].split(/\s*\/\s*/).map(p => MLB_CLUBS[fold(p)])].filter(Boolean));
      if (ids.size !== 1) return null;
      /* "(as of 2026)" (Round 1567): only seasons up to that year count, so a trade after it cannot add a man */
      return { kind: 'club', id: [...ids][0], legend: /legends$/.test(label), ...(m[2] ? { asOf: Number(m[2]) } : {}) };
    }
    switch (f) {
      case 'wonmvpinbothleagues': return { kind: 'mvpBoth' };
      case 'wonbacktobackmvps': return { kind: 'mvpRun' };
      case 'nlmvpwinners20152025': return { kind: 'award', codes: ['NLMVP'], from: 2015, to: 2025 };
      case 'woncyyoungaward': return { kind: 'award', codes: ['ALCY', 'NLCY'] };
      case 'wonrookieoftheyear': return { kind: 'award', codes: ['ALROY', 'NLROY'] };
      case 'worldseriesmvpwinners': return { kind: 'award', codes: ['WSMVP'] };
      case 'allstargamemvps2010s2020s': return { kind: 'award', codes: ['ASMVP'], from: 2010, to: 2029 };
      case 'wonworldserieswithmultipleteams': return { kind: 'wsClubs', min: 2 };
      case '2024worldserieschampiondodgers': return { kind: 'wsWith', season: 2024, club: 119 };
      case 'goldglovewinningcatchers': return { kind: 'awardAt', codes: ['ALGG', 'NLGG'], pos: ['C'] };
      case 'wongoldgloveatoutfield': return { kind: 'awardAt', codes: ['ALGG', 'NLGG'], pos: [...OUTFIELD] };
      case 'silversluggeratshortstop': return { kind: 'awardAt', codes: ['ALSS', 'NLSS'], pos: ['SS'] };
      case 'hit500careerhomeruns': return { kind: 'career', stat: 'HR', min: 500 };
      case '300careerwins': return { kind: 'career', stat: 'W', min: 300 };
      case '3000careerhits': return { kind: 'career', stat: 'H', min: 3000 };
      case 'pitcherswith3000strikeouts': return { kind: 'career', stat: 'SO', min: 3000, pitcher: true };
      case 'closerswith300saves': return { kind: 'career', stat: 'SV', min: 300 };
      case 'career300hitters21stcentury': return { kind: 'avg300', since: 2001 };
      case 'stole50basesinaseason': return { kind: 'season', i: 1, min: 50 };
      case '50hrinasingleseason': return { kind: 'season', i: 0, min: 50 };
      case 'hit40hrinaseason2020s': return { kind: 'season', i: 0, min: 40, from: 2020, to: 2029 };
      case 'multiple100rbiseasons': return { kind: 'season', i: 2, min: 100, count: 2 };
      case 'catcherswhohit30hrinaseason': return { kind: 'season', i: 0, min: 30, at: 'C' };
      case 'switchhitters': return { kind: 'bats', side: 'S' };
      case 'switchhittingshortstops': return { kind: 'bats', side: 'S', pos: ['SS'] };
      case 'lefthandedstartingpitchers': return { kind: 'starter', hand: 'L' };
      case 'firstoveralldraftpick': return { kind: 'firstPick' };
      case 'undraftedplayers': return { kind: 'undrafted' };
      case 'wentundraftedthenbecameallstars': return { kind: 'undrafted', allStar: true };
      case 'wenttothesamecollegevanderbilt': return { kind: 'college', re: /vanderbilt/i };
      case 'playedcollegebaseballatlsu': return { kind: 'college', re: /louisiana state|\blsu\b/i };
      default: break;
    }
    if ((m = label.match(/^Won a (Gold Glove|Silver Slugger) (?:at|in|as) (.+)$/))) {
      const pos = POSITIONS[fold(m[2])];
      if (!pos) return null;
      return { kind: 'awardAt', codes: m[1] === 'Gold Glove' ? ['ALGG', 'NLGG'] : ['ALSS', 'NLSS'], pos };
    }
    if ((m = label.match(/^Hall of Fame (.+)$/))) {
      const what = fold(m[1]);
      if (what === 'startingpitchers') return { kind: 'hofPitcher', role: 'start' };
      if (what === 'reliefpitchers') return { kind: 'hofPitcher', role: 'relief' };
      if (what === 'lefthandedpitchers') return { kind: 'hofPitcher', hand: 'L' };
      if (what === 'lefthandedstartingpitchers') return { kind: 'hofPitcher', role: 'start', hand: 'L' };
      if (what === 'righthandedstartingpitchers') return { kind: 'hofPitcher', role: 'start', hand: 'R' };
      /* "designated hitters / sluggers": the five on the board are designated hitters, and the share rule holds
         a slugger who rarely hit there out */
      if (what === 'designatedhitterssluggers') return { kind: 'hofPos', pos: ['DH'] };
      const pos = POSITIONS[what];
      return pos ? { kind: 'hofPos', pos } : null;
    }
    return null;
  }

  function fits(name, c) {
    if (c.kind === 'list') {
      const list = lists.get(c.key);
      if (listSet(list).has(fold(name))) return true;
      return list.closed ? false : null;
    }
    if (c.kind === 'recordList') return c.keys.some(k => onList(k, name, c.filter));
    const m = byName.get(fold(name));
    if (!m) return null;
    switch (c.kind) {
      case 'posEra': {
        const lastYear = m.last ? Number(m.last.slice(0, 4)) : 9999;
        if (lastYear < c.since) return false;
        /* a pitcher is no second baseman, whatever his few games elsewhere */
        if (isPitcher(m)) return false;
        return shareVerdict(posShare(m, new Set(c.pos)));
      }
      case 'born': {
        if (!m.country) return null;
        const at = MLB_COUNTRIES[fold(m.country)] ?? fold(m.country);
        if (at !== c.country) return false;
        if (!c.pitchers) return true;
        return m.pos === 'TWP' ? null : isPitcher(m);
      }
      case 'club': {
        const seasons = m.fr?.[c.id] ?? 0;
        /* a dated group: the record keeps a count of seasons per club, not which seasons, so a man with any season
           past the date (a record read after it) cannot be judged by the count and is unknown; none with the club
           at all is still no */
        if (c.asOf !== undefined && seasons > 0 && Object.keys(m.ss ?? {}).some(y => Number(y) > c.asOf)) return null;
        if (!c.legend) return seasons > 0;
        /* a legend is not a man who passed through: five seasons or more fits, none does not, one to four is
           unknown (the board cannot say whether four years make a legend, so neither can the checker) */
        if (seasons >= 5) return true;
        return seasons === 0 ? false : null;
      }
      case 'mvpBoth': return hasAward(m, ['ALMVP']) && hasAward(m, ['NLMVP']);
      case 'mvpRun': {
        const ys = new Set(awardSeasons(m, ['ALMVP', 'NLMVP']));
        return [...ys].some(y => ys.has(y + 1));
      }
      case 'award': return awardSeasons(m, c.codes).some(y => (c.from === undefined || y >= c.from) && (c.to === undefined || y <= c.to));
      case 'wsClubs': return new Set((m.aw?.WSCHAMP ?? []).map(x => x[1])).size >= c.min;
      case 'wsWith': return (m.aw?.WSCHAMP ?? []).some(x => x[0] === c.season && x[1] === c.club);
      case 'awardAt': return awardAt(m, c.codes, new Set(c.pos));
      case 'career': {
        if (c.pitcher && !(m.car?.pG > 0)) return false;
        return (m.car?.[c.stat] ?? 0) >= c.min;
      }
      case 'avg300': {
        if ((m.car?.PA ?? 0) < 3000) return false;
        const lastYear = m.last ? Number(m.last.slice(0, 4)) : 9999;
        if (lastYear < c.since) return false;
        return Number(m.car.AVG) >= 0.2995;
      }
      case 'season': {
        let n = 0;
        for (const [y, row] of Object.entries(m.ss ?? {})) {
          const yr = Number(y);
          if (c.from !== undefined && yr < c.from) continue;
          if (c.to !== undefined && yr > c.to) continue;
          if ((row[c.i] ?? 0) < c.min) continue;
          if (c.at && row[3] !== c.at) continue;
          n += 1;
        }
        return n >= (c.count ?? 1);
      }
      case 'bats': {
        if (!m.bats) return null;
        if (m.bats !== c.side) return false;
        if (!c.pos) return true;
        return isPitcher(m) ? false : shareVerdict(posShare(m, new Set(c.pos)));
      }
      case 'starter': {
        if (!m.throws) return null;
        if (!(m.car?.pG > 0) || m.throws !== c.hand) return false;
        const r = pitchRole(m);
        return r >= 0.5 ? true : r <= 0.2 ? false : null;
      }
      case 'firstPick': return amateurDrafts(m).some(d => Number(d[3]) === 1 && String(d[2]) === '1');
      case 'undrafted': {
        if (amateurDrafts(m).length > 0) return false;
        return c.allStar ? hasAward(m, ['ALAS', 'NLAS']) : true;
      }
      case 'college': {
        const schools = [...(m.col ?? []), ...(m.dr ?? []).map(d => d[4]).filter(s => s && s !== 'N/A')];
        if (schools.some(s => c.re.test(s))) return true;
        return (m.col ?? []).length ? false : null;
      }
      case 'hofPos': {
        if (!hasAward(m, ['MLBHOF'])) return false;
        if (m.pos === 'P') return false;
        return shareVerdict(posShare(m, new Set(c.pos.flatMap(p => (p === 'OF' ? [...OUTFIELD] : [p])))));
      }
      case 'hofPitcher': {
        if (!hasAward(m, ['MLBHOF'])) return false;
        if (!(m.car?.pG > 0) || !isPitcher(m)) return false;
        if (c.hand && m.throws !== c.hand) return false;
        const r = pitchRole(m);
        if (c.role === 'start') return r >= 0.5 ? true : r <= 0.2 ? false : null;
        if (c.role === 'relief') {
          if (r <= 0.2 || (m.car?.SV ?? 0) >= 150) return true;
          return r >= 0.5 ? false : null;
        }
        return true;
      }
      default: return null;
    }
  }

  /**
   * A man who does not fit now but could join the group before the board is
   * dealt again: an award for 2026 still to be named (the World Series MVP at
   * the end of October; Gold Gloves, Silver Sluggers, Rookie of the Year, Cy
   * Young and MVP in November). Returns the reason, or null.
   */
  function watch(name, c) {
    const m = byName.get(fold(name));
    if (!m || !m.ss?.['2026']) return null;
    if (fits(name, c) !== false) return null;
    const top = m.ss['2026'][3];
    switch (c.kind) {
      case 'mvpBoth':
        return hasAward(m, ['ALMVP']) || hasAward(m, ['NLMVP']) ? 'played in 2026 with an MVP in one league; the 2026 votes are named in November' : null;
      case 'mvpRun':
        return awardSeasons(m, ['ALMVP', 'NLMVP']).includes(2025) ? 'won the 2025 MVP and played in 2026' : null;
      case 'award':
        if (c.to !== undefined && c.to < 2026) return null;
        /* a two way man is on the Cy Young ballot whenever he pitched that season, whatever his career share of
           games on the mound (Round 1567: Shohei Ohtani, 14 starts in 2026, sat beside "Won Cy Young Award" on
           bconn-002 unwatched, because 114 of his 1286 games are pitching) */
        if (c.codes.includes('ALCY') && !isPitcher(m) && !((m.ss['2026'][5] ?? 0) > 0)) return null;
        if (c.codes.includes('ALROY') && m.debut && Number(m.debut.slice(0, 4)) < 2025) return null;
        if (c.codes.includes('ASMVP')) return null;
        /* the 2026 World Series MVP comes from one of its two clubs (the ledger names them on two hosts);
           without that line every man who played in 2026 is watched */
        if (c.codes.includes('WSMVP') && ledger.watchLines?.worldSeries2026?.clubs && !(m.c26 ?? []).some(id => ledger.watchLines.worldSeries2026.clubs.includes(id))) return null;
        return `played in 2026; the 2026 ${c.codes.join('/')} is still to be named`;
      case 'awardAt':
        return top && new Set(c.pos).has(top) ? `played most of 2026 at ${top}; the 2026 ${c.codes.join('/')} is still to be named` : null;
      case 'career': {
        /* a running total one more season can carry over the line */
        const reach = { HR: 50, H: 200, W: 20, SO: 300, SV: 45 }[c.stat] ?? 0;
        const have = m.car?.[c.stat] ?? 0;
        return have + reach >= c.min ? `played in 2026 with ${have}, within a season of ${c.min}` : null;
      }
      case 'season': {
        /* a single season group still open (no end year, or one past 2026): a man who came close in 2025 or 2026 */
        if (c.to !== undefined && c.to < 2027) return null;
        /* "Multiple 100+ RBI seasons" needs all but one of its seasons already */
        const have = Object.values(m.ss ?? {}).filter(row => (row[c.i] ?? 0) >= c.min && (!c.at || row[3] === c.at)).length;
        if (have < (c.count ?? 1) - 1) return null;
        const near = ['2025', '2026'].some(y => (m.ss?.[y]?.[c.i] ?? 0) >= c.min * 0.75 && (!c.at || m.ss?.[y]?.[3] === c.at));
        return near ? `played in 2026 and came within a quarter of ${c.min} in 2025 or 2026` : null;
      }
      default: return null;
    }
  }

  /* the man a tile names, by his league id: two spellings of one man ("Goose Gossage", "Rich Gossage") are one */
  const identity = name => { const m = byName.get(fold(name)); return m?.id ? `mlb:${m.id}` : fold(name); };
  /* a man who can still change clubs (Round 1567's trade check): no last game on the record (the service leaves it
     empty while a man is active, Yu Darvish's lost 2026 included), or one from 2025 on; null off the record */
  const active = name => { const m = byName.get(fold(name)); return m ? (!m.last || Number(m.last.slice(0, 4)) >= 2025) : null; };
  return { criterion, fits, watch, identity, active, watched: WATCHED.baseball, has: name => byName.has(fold(name)) };
}

/* ------------------------------------------------------------------ */
/* NFL                                                                 */
/* ------------------------------------------------------------------ */

/* Board nickname -> ESPN abbreviations and the NFL Grid table's codes (moves folded into the franchise). */
const NFL_CLUBS = {
  cardinals: [['ARI'], ['ARI']], falcons: [['ATL'], ['ATL']], ravens: [['BAL'], ['BAL']], bills: [['BUF'], ['BUF']],
  panthers: [['CAR'], ['CAR']], bears: [['CHI'], ['CHI']], bengals: [['CIN'], ['CIN']], browns: [['CLE'], ['CLE']],
  cowboys: [['DAL'], ['DAL']], broncos: [['DEN'], ['DEN']], lions: [['DET'], ['DET']], packers: [['GB'], ['GB']],
  texans: [['HOU'], ['HOU']], colts: [['IND'], ['IND']], jaguars: [['JAX'], ['JAX']], chiefs: [['KC'], ['KC']],
  raiders: [['LV', 'OAK'], ['LV']], chargers: [['LAC', 'SD'], ['LAC']], rams: [['LAR', 'STL', 'LA'], ['LA']],
  dolphins: [['MIA'], ['MIA']], vikings: [['MIN'], ['MIN']], patriots: [['NE'], ['NE']], saints: [['NO'], ['NO']],
  giants: [['NYG'], ['NYG']], jets: [['NYJ'], ['NYJ']], eagles: [['PHI'], ['PHI']], steelers: [['PIT'], ['PIT']],
  '49ers': [['SF'], ['SF']], seahawks: [['SEA'], ['SEA']], buccaneers: [['TB'], ['TB']],
  titans: [['TEN'], ['TEN']], commanders: [['WSH'], ['WAS']],
};
/* Board wording -> the folded college names the two records use. */
const NFL_COLLEGES = {
  alabama: ['alabama'], lsu: ['lsu', 'louisianastate'], ohiostate: ['ohiostate'], clemson: ['clemson'],
  michigan: ['michigan'], georgia: ['georgia'], usc: ['usc', 'southerncalifornia'], miami: ['miami', 'miamifl'],
  notredame: ['notredame'], oklahoma: ['oklahoma'], texas: ['texas'], florida: ['florida'],
};
const FIRST_OVERALL = /Rd 1, Pk 1 \(/;
/* the last season the NFL Grid roster table and the ledger's added stints reach */
const NFL_TABLE_LAST = 2025;

/**
 * NFL's checker. record: ESPN's rows; grid: the NFL Grid table; ledger: the round's two host ledger.
 * Clubs are the union of the two records (ESPN lists a club only where he has a stat line, so a lineman's
 * seasons are short there; the roster table lists every roster season), and the ledger's overlay adds a
 * stint both missed.
 */
export function makeNflChecker({ record, grid, ledger = {} }) {
  const men = { ...record.men };
  for (const [name, o] of Object.entries(ledger.overlay ?? {})) men[name] = { ...(men[name] ?? {}), ...(o.set ?? {}) };
  const byName = indexByName(men, ledger.aliases);
  const gridBy = new Map();
  for (const p of grid?.players ?? []) {
    for (const k of new Set([fold(p.name), fold(p.display ?? p.name)])) {
      if (!gridBy.has(k)) gridBy.set(k, []);
      gridBy.get(k).push(p);
    }
  }
  /* the table's row for the man ESPN means: the namesake who shares the most clubs with ESPN's seasons, and
     none at all when ESPN lists clubs and no row shares one (Clay Matthews the father played for Cleveland
     and Atlanta; the son on the board for Green Bay and the Rams) */
  const asGrid = a => Object.values(NFL_CLUBS).find(([e]) => e.includes(a))?.[1][0] ?? a;
  const gridRow = (name, m) => {
    const cands = gridBy.get(fold(name)) ?? [];
    const espnClubs = new Set(Object.values(m?.seasons ?? {}).flat().map(asGrid));
    if (!espnClubs.size) return cands.length === 1 ? cands[0] : null;
    const shared = p => p.teams.filter(t => espnClubs.has(t)).length;
    const best = [...cands].sort((a, b) => shared(b) - shared(a))[0];
    return best && shared(best) > 0 ? best : null;
  };
  const lists = new Map(Object.entries(ledger.lists ?? {}).map(([k, v]) => [fold(v.label ?? k), v]));

  function criterion(label) {
    const f = fold(label);
    if (lists.has(f)) return { kind: 'list', key: f };
    let m;
    if ((m = label.match(/^Played for the (.+?)(?: \(as of (\d{4})\))?$/))) {
      const club = NFL_CLUBS[fold(m[1])];
      /* "(as of 2025)" (Round 1567): only seasons up to that one count, so a move after it cannot add a man */
      return club ? { kind: 'club', espn: club[0], grid: club[1], ...(m[2] ? { asOf: Number(m[2]) } : {}) } : null;
    }
    if ((m = label.match(/^Played college ball at (.+)$/))) {
      const c = NFL_COLLEGES[fold(m[1])];
      return c ? { kind: 'college', names: c } : null;
    }
    if (f === 'drafted1overall') return { kind: 'firstPick' };
    if ((m = label.replace(/,/g, '').match(/^(\d+)\+ career (passing|rushing|receiving) yards$/))) return { kind: 'yards', cat: m[2], min: Number(m[1]) };
    return null;
  }

  function fits(name, c) {
    if (c.kind === 'list') {
      const list = lists.get(c.key);
      if (listSet(list).has(fold(name))) return true;
      return list.closed ? false : null;
    }
    const m = byName.get(fold(name));
    const g = gridRow(name, m);
    if (!m && !g) return null;
    switch (c.kind) {
      case 'club': {
        const upTo = y => c.asOf === undefined || Number(y) <= c.asOf;
        const espn = new Set(Object.entries(m?.seasons ?? {}).filter(([y]) => upTo(y)).flatMap(([, v]) => v));
        /* the ledger's added stints (Le'Veon Bell's 2021 Ravens games) and the roster table (1970 to 2025) carry
           no season per club, so a dated group counts them only when its date is past their last season */
        const extra = new Set(c.asOf === undefined || c.asOf >= NFL_TABLE_LAST ? m?.clubsAlso ?? [] : []);
        if (c.espn.some(a => espn.has(a) || extra.has(a))) return true;
        if (g && (c.asOf === undefined || (g.seasons?.[1] ?? 9999) <= c.asOf) && c.grid.some(a => g.teams.includes(a))) return true;
        return m ? false : null;
      }
      case 'college': {
        const names = [m?.college, g?.college].filter(Boolean).map(fold);
        if (!names.length) return null;
        return names.some(n => c.names.includes(n));
      }
      case 'firstPick': {
        if (m?.draft) return FIRST_OVERALL.test(m.draft);
        if (g?.draft && typeof g.draft === 'object') return g.draft.round === 1 && g.draft.pick === 1;
        return m || g ? false : null;
      }
      case 'yards': {
        if (!m) return null;
        return (m.yards?.[c.cat] ?? 0) >= c.min;
      }
      default: return null;
    }
  }

  /** Clubs the two records disagree on (the table's codes), for the harness to show. */
  function clubDisagreement(name) {
    const m = byName.get(fold(name));
    const g = gridRow(name, m);
    if (!m || !g) return null;
    const espnAsGrid = new Set();
    for (const a of Object.values(m.seasons ?? {}).flat()) {
      const club = Object.values(NFL_CLUBS).find(([e]) => e.includes(a));
      if (club) espnAsGrid.add(club[1][0]);
    }
    for (const a of m.clubsAlso ?? []) {
      const club = Object.values(NFL_CLUBS).find(([e]) => e.includes(a));
      if (club) espnAsGrid.add(club[1][0]);
    }
    return { onlyGrid: g.teams.filter(t => !espnAsGrid.has(t)), onlyEspn: [...espnAsGrid].filter(t => !g.teams.includes(t)) };
  }

  /* NFL boards hold no award or running total a season in progress can change, except the yard milestones:
     an active man inside one season's reach of a yards group is a watch */
  function watch(name, c) {
    if (c.kind !== 'yards') return null;
    const m = byName.get(fold(name));
    if (!m || !m.seasons?.['2026'] && !m.seasons?.['2025']) return null;
    if (fits(name, c) !== false) return null;
    const have = m.yards?.[c.cat] ?? 0;
    const reach = { passing: 5000, rushing: 2000, receiving: 1900 }[c.cat];
    return have + reach >= c.min ? `active with ${have} ${c.cat} yards, within a season of ${c.min}` : null;
  }

  const identity = name => { const m = byName.get(fold(name)); return m?.espn ? `espn:${m.espn}` : fold(name); };
  /* a man who can still change clubs (Round 1567's trade check): a season in 2025 or 2026 on ESPN's record */
  const active = name => { const m = byName.get(fold(name)); return m ? !!(m.seasons?.['2025'] || m.seasons?.['2026']) : null; };
  return { criterion, fits, watch, identity, active, clubDisagreement, watched: WATCHED.nfl, has: name => byName.has(fold(name)) || gridBy.has(fold(name)) };
}

/* ------------------------------------------------------------------ */
/* NHL                                                                 */
/* ------------------------------------------------------------------ */

/*
 * Board wording (folded) -> the club names the league's season rows carry. Round 1574: an explicit map, as NFL_CLUBS
 * and MLB_CLUBS are, in place of "a club name that ends with the nickname", which read "Winnipeg Jets (1979)" as no
 * Jet and would have counted the Minnesota North Stars as Stars. Each entry is exactly the names its label covers.
 * The league's service names a moved franchise's old seasons by the club as it then was (Quebec Nordiques, Winnipeg
 * Jets (1979), Atlanta Thrashers, Hartford Whalers, Minnesota North Stars), and a renamed club's by today's name
 * (Chicago Blackhawks, Anaheim Ducks). A label this map does not hold is not judged: it counts as unjudged, never as
 * a silent no. The ledger (nhlConnectionsVerified-2026-10.json, clubLabels) says which names each table label covers.
 */
export const NHL_CLUBS = {
  penguins: ['Pittsburgh Penguins'], mapleleafs: ['Toronto Maple Leafs'], avalanche: ['Colorado Avalanche'],
  redwings: ['Detroit Red Wings'], blackhawks: ['Chicago Blackhawks'], kings: ['Los Angeles Kings'],
  lightning: ['Tampa Bay Lightning'], ducks: ['Anaheim Ducks'], bruins: ['Boston Bruins'], oilers: ['Edmonton Oilers'],
  goldenknights: ['Vegas Golden Knights'], hurricanes: ['Carolina Hurricanes'], canadiens: ['Montréal Canadiens'],
  panthers: ['Florida Panthers'], sharks: ['San Jose Sharks'], islanders: ['New York Islanders'],
  rangers: ['New York Rangers'], capitals: ['Washington Capitals'], flyers: ['Philadelphia Flyers'],
  blues: ['St. Louis Blues'], stars: ['Dallas Stars'], sabres: ['Buffalo Sabres'], predators: ['Nashville Predators'],
  canucks: ['Vancouver Canucks'], senators: ['Ottawa Senators'], devils: ['New Jersey Devils'],
  whalers: ['Hartford Whalers'], flames: ['Calgary Flames'], wild: ['Minnesota Wild'], kraken: ['Seattle Kraken'],
  bluejackets: ['Columbus Blue Jackets'],
  /* one franchise under two names, both counted because the label names both */
  avalancheornordiques: ['Colorado Avalanche', 'Quebec Nordiques'],
  winnipegjetseitherera: ['Winnipeg Jets', 'Winnipeg Jets (1979)'],
  /* the club in Salt Lake City from 2024-25 on, under both its names; the Arizona Coyotes are not counted */
  utah: ['Utah Hockey Club', 'Utah Mammoth'],
};
/* a club name -> its franchise, for a claim about franchises ("Won the Cup with three different franchises") */
const NHL_FRANCHISE = {
  'Quebec Nordiques': 'Colorado Avalanche', 'Atlanta Thrashers': 'Winnipeg Jets', 'Minnesota North Stars': 'Dallas Stars',
  'Hartford Whalers': 'Carolina Hurricanes', 'Winnipeg Jets (1979)': 'Utah', 'Phoenix Coyotes': 'Utah', 'Arizona Coyotes': 'Utah',
  'Utah Hockey Club': 'Utah', 'Utah Mammoth': 'Utah', 'Atlanta Flames': 'Calgary Flames', 'Kansas City Scouts': 'New Jersey Devils',
  'Colorado Rockies': 'New Jersey Devils', 'California Golden Seals': 'Cleveland Barons', 'Oakland Seals': 'Cleveland Barons',
};
const franchise = t => NHL_FRANCHISE[t] ?? t;
/* the trophies a label names, as the league's landing names them */
const NHL_TROPHIES = {
  vezinatrophy: 'Vezina Trophy', norristrophy: 'James Norris Memorial Trophy', caldertrophy: 'Calder Memorial Trophy',
  artrosstrophy: 'Art Ross Trophy', rocketrichardtrophy: 'Maurice “Rocket” Richard Trophy',
  connsmythetrophy: 'Conn Smythe Trophy', harttrophy: 'Hart Memorial Trophy',
};
const NHL_DRAFT_TEAMS = { sabres: 'BUF' };
const ORDINAL = { first: 1, second: 2, third: 3 };
const COUNT = { two: 2, three: 3, four: 4 };
/* birth countries (the landing's three letters) in Europe, for "European-born" */
const EUROPE = new Set(['AUT', 'BLR', 'CHE', 'CZE', 'DEU', 'DNK', 'EST', 'FIN', 'FRA', 'GBR', 'HUN', 'ITA', 'LAT', 'LTU', 'LVA', 'NLD', 'NOR', 'POL', 'RUS', 'SVK', 'SVN', 'SWE', 'UKR']);
/* the last finished NHL season (start year) and the seasons a running watch reads */
const NHL_RECENT = ['2024-25', '2025-26', '2026-27'];
const NHL_IN_PLAY = '2026-27';
/* fix2-1574: the share of a single season mark that puts a man still playing on watch beside it (52.5 of 70, 45 of
   60): watch() reads it on the recent seasons, section 5's watch line on the career best (seasonBest) */
export const SEASON_LINE = 0.75;

/**
 * NHL's checker. record: the league's own rows; ledger: the round's two host ledger.
 * Round 1574 taught it every claim the 16 table rows past the file make (decided in the ledger's tableDecisions):
 * clubs by an explicit map, season goals, goalie wins, awards, the draft, the position, goals credited to a goalie,
 * Cups won with a club or with several franchises, the Hall of Fame with a club, and goals for one franchise.
 */
export function makeNhlChecker({ record, ledger = {} }) {
  const men = { ...record.men };
  for (const [name, o] of Object.entries(ledger.overlay ?? {})) men[name] = { ...(men[name] ?? {}), ...(o.set ?? {}) };
  const byName = indexByName(men, ledger.aliases);
  const lists = new Map(Object.entries(ledger.lists ?? {}).map(([k, v]) => [fold(v.label ?? k), v]));

  function criterion(label) {
    const f = fold(label);
    if (lists.has(f)) return { kind: 'list', key: f };
    let m;
    /* "(as of 2025-26)" (Round 1567): only seasons up to that one count, so a trade after it cannot add a man */
    if ((m = label.match(/^Played for (?:the )?(.+?)(?: \(as of (\d{4})-\d{2}\))?$/))) {
      const names = NHL_CLUBS[fold(m[1])];
      return names ? { kind: 'club', names, ...(m[2] ? { asOf: Number(m[2]) } : {}) } : null;
    }
    if ((m = label.replace(/,/g, '').match(/^(\d+)\+ career (points|goals|assists|games)$/))) {
      return { kind: 'career', stat: { points: 'P', goals: 'G', assists: 'A', games: 'GP' }[m[2]], min: Number(m[1]) };
    }
    if ((m = label.replace(/,/g, '').match(/^Played (\d+)(?: or more)? NHL games$/))) return { kind: 'career', stat: 'GP', min: Number(m[1]) };
    if ((m = label.replace(/,/g, '').match(/^Scored (\d+) career goals$/))) return { kind: 'career', stat: 'G', min: Number(m[1]) };
    if ((m = label.replace(/,/g, '').match(/^European-born (\d+) goal scorers$/))) return { kind: 'career', stat: 'G', min: Number(m[1]), europe: true };
    if ((m = label.match(/^Scored (\d+) goals in a season$/))) return { kind: 'season', min: Number(m[1]) };
    if ((m = label.match(/^Scored (\d+) goals for one franchise$/))) return { kind: 'clubGoals', min: Number(m[1]) };
    if ((m = label.replace(/,/g, '').match(/^Goalies with (\d+) career wins$/))) return { kind: 'wins', min: Number(m[1]) };
    if (f === 'goaliescreditedwithscoringagoal') return { kind: 'goalieGoal' };
    if (f === 'goaltenders') return { kind: 'pos', pos: 'G' };
    if (f === 'goalieswhowontheharttrophy') return { kind: 'award', trophy: NHL_TROPHIES.harttrophy, pos: 'G' };
    if (f === 'wontheconnsmytheinalosingcause') return { kind: 'smytheLost' };
    if ((m = label.match(/^Won the Cup with (two|three|four) different franchises$/))) return { kind: 'cupClubs', min: COUNT[m[1]] };
    /* a Cup in a finished season ("Won the 2024 Cup with the Panthers") or a finished run of them ("Won the Cup with
       the Islanders, 1980 to 1983"; years are the spring the Cup was won) */
    const season = y => `${y - 1}-${String(y).slice(2)}`;
    if ((m = label.match(/^Won the (\d{4}) Cup with the (.+)$/))) {
      const names = NHL_CLUBS[fold(m[2])];
      return names ? { kind: 'cupWith', seasons: [season(Number(m[1]))], names } : null;
    }
    if ((m = label.match(/^Won the Cup with the (.+), (\d{4}) to (\d{4})$/))) {
      const names = NHL_CLUBS[fold(m[1])];
      const [a, b] = [Number(m[2]), Number(m[3])];
      return names && a <= b ? { kind: 'cupWith', seasons: Array.from({ length: b - a + 1 }, (_, i) => season(a + i)), names } : null;
    }
    if ((m = label.match(/^Hall of Famers who played for the (.+)$/))) {
      const names = NHL_CLUBS[fold(m[1])];
      return names ? { kind: 'hofClub', names } : null;
    }
    /* an award in a closed past range ("Won the Conn Smythe Trophy before 2000": a season ending before that year) */
    if ((m = label.match(/^Won the (.+?) before (\d{4})$/))) {
      const trophy = NHL_TROPHIES[fold(m[1])] ?? NHL_TROPHIES[fold(m[1]) + 'trophy'];
      return trophy ? { kind: 'award', trophy, before: Number(m[2]) } : null;
    }
    if ((m = label.match(/^Won the (.+)$/))) {
      const trophy = NHL_TROPHIES[fold(m[1])] ?? NHL_TROPHIES[fold(m[1]) + 'trophy'];
      return trophy ? { kind: 'award', trophy } : null;
    }
    if ((m = label.match(/^Drafted (first|second|third) overall$/))) return { kind: 'draft', overall: ORDINAL[m[1]] };
    if ((m = label.match(/^Drafted by the (.+)$/))) {
      const team = NHL_DRAFT_TEAMS[fold(m[1])];
      return team ? { kind: 'draftBy', team } : null;
    }
    return null;
  }

  /* the franchises a man won the Cup with, as far as the record knows: a Cup season with no playoff club on the
     record (he won it without playing a playoff game) is counted in unknown */
  const cupFranchises = m => {
    const known = new Set();
    let unknown = 0;
    for (const y of m.aw?.['Stanley Cup'] ?? []) {
      const clubs = m.pc?.[y];
      if (!clubs?.length) { unknown += 1; continue; }
      for (const t of clubs) known.add(franchise(t));
    }
    return { known, unknown };
  };
  const clubGoalsBest = m => {
    const by = {};
    for (const [t, g] of Object.entries(m.cg ?? {})) by[franchise(t)] = (by[franchise(t)] ?? 0) + g;
    return Math.max(0, ...Object.values(by));
  };
  /* Calder eligibility for the season in play: no earlier season of more than 25 games, and not two earlier
     seasons of 6 or more (the league's rookie rule, age aside) */
  const rookieEligible = m => {
    const earlier = Object.entries(m.gp ?? {}).filter(([y]) => y < NHL_IN_PLAY).map(([, g]) => g);
    return !earlier.some(g => g > 25) && earlier.filter(g => g >= 6).length < 2;
  };

  function fits(name, c) {
    if (c.kind === 'list') {
      const list = lists.get(c.key);
      if (listSet(list).has(fold(name))) return true;
      return list.closed ? false : null;
    }
    const m = byName.get(fold(name));
    if (!m) return null;
    switch (c.kind) {
      case 'club': return Object.entries(m.seasons ?? {}).filter(([s]) => c.asOf === undefined || Number(s.slice(0, 4)) <= c.asOf).flatMap(([, v]) => v).some(t => c.names.includes(t));
      case 'career':
        if (c.europe && !m.country) return null;
        if (c.europe && !EUROPE.has(m.country)) return false;
        return (m.career?.[c.stat] ?? 0) >= c.min;
      case 'season': return m.sg ? Object.values(m.sg).some(g => g >= c.min) : null;
      case 'clubGoals': return m.cg ? clubGoalsBest(m) >= c.min : null;
      case 'wins': if (m.pos !== 'G') return false; return m.wins === undefined ? null : m.wins >= c.min;
      case 'goalieGoal': return m.pos === 'G' && (m.career?.G ?? 0) >= 1;
      case 'pos': return m.pos === c.pos;
      case 'award':
        if (!m.aw) return null;
        if (c.pos && m.pos !== c.pos) return false;
        /* "before 2000": a season ending before that year ("1998-99" ends in 1999) */
        return (m.aw[c.trophy] ?? []).some(y => c.before === undefined || Number(y.slice(0, 4)) + 1 < c.before);
      case 'smytheLost': {
        if (!m.aw) return null;
        const cups = new Set(m.aw['Stanley Cup'] ?? []);
        return (m.aw['Conn Smythe Trophy'] ?? []).some(y => !cups.has(y));
      }
      case 'cupClubs': {
        if (!m.aw) return null;
        const f = cupFranchises(m);
        if (f.known.size >= c.min) return true;
        return f.unknown ? null : false;
      }
      case 'cupWith': {
        if (!m.aw) return null;
        const cups = (m.aw['Stanley Cup'] ?? []).filter(y => c.seasons.includes(y));
        if (cups.some(y => (m.pc?.[y] ?? []).some(t => c.names.includes(t)))) return true;
        /* a Cup in the range won without a playoff game on the record: the club cannot be read */
        return cups.some(y => !(m.pc?.[y] ?? []).length) ? null : false;
      }
      case 'hofClub':
        if (m.hhof === undefined) return null;
        return m.hhof === 1 && Object.values(m.seasons ?? {}).flat().some(t => c.names.includes(t));
      case 'draft': return m.draft ? m.draft[2] === c.overall : false;
      case 'draftBy': return m.draft ? m.draft[3] === c.team : false;
      default: return null;
    }
  }

  /**
   * A man who does not fit now but could join the group before the board is dealt again (the rules are written
   * in the ledger, watchRules). The season in play is 2026-27. A career mark: active and within a season's reach.
   * A season mark: active and three quarters of the way there in one of the last two seasons or this one. An
   * award: active and eligible (the Vezina a goalie, the Norris a defenceman, the Calder a man still a rookie, the
   * Art Ross and the Rocket Richard a skater, the Hart and the Conn Smythe anyone). The Hall of Fame: anyone not in
   * it who played for the club, active or not (the Hall inducts each November).
   */
  function watch(name, c) {
    const m = byName.get(fold(name));
    if (!m || fits(name, c) !== false) return null;
    if (c.kind === 'hofClub') return Object.values(m.seasons ?? {}).flat().some(t => c.names.includes(t)) ? 'played for the club and is not in the Hall yet; the Hall inducts each November' : null;
    if (!m.active) return null;
    switch (c.kind) {
      case 'career': {
        if (c.europe && !EUROPE.has(m.country)) return null;
        const have = m.career?.[c.stat] ?? 0;
        /* a season's worth: 110 points, 60 goals, 80 assists, 82 games */
        const reach = { P: 110, G: 60, A: 80, GP: 82 }[c.stat] ?? 0;
        return have + reach >= c.min ? `active with ${have}, within a season of ${c.min}` : null;
      }
      case 'season': {
        const best = Math.max(0, ...NHL_RECENT.map(y => m.sg?.[y] ?? 0));
        return best >= c.min * SEASON_LINE ? `active with ${best} goals in a season since 2024-25, within a quarter of ${c.min}` : null;
      }
      case 'clubGoals': {
        const best = clubGoalsBest(m);
        return best + 60 >= c.min ? `active with ${best} goals for one franchise, within a season of ${c.min}` : null;
      }
      case 'wins': return m.pos === 'G' && (m.wins ?? 0) + 45 >= c.min ? `an active goalie with ${m.wins} wins, within a season of ${c.min}` : null;
      case 'goalieGoal': return m.pos === 'G' ? 'an active goalie, who may yet be credited with a goal' : null;
      case 'award': {
        const t = c.trophy;
        /* a closed past range ("before 2000") no season in play can add to */
        if (c.before !== undefined) return null;
        if (c.pos && m.pos !== c.pos) return null;
        if (t === NHL_TROPHIES.vezinatrophy && m.pos !== 'G') return null;
        if (t === NHL_TROPHIES.norristrophy && m.pos !== 'D') return null;
        if (t === NHL_TROPHIES.caldertrophy && !rookieEligible(m)) return null;
        if ((t === NHL_TROPHIES.artrosstrophy || t === NHL_TROPHIES.rocketrichardtrophy) && m.pos === 'G') return null;
        return `active and eligible; the ${NHL_IN_PLAY} ${t} is still to be won`;
      }
      case 'smytheLost': return `active; the ${NHL_IN_PLAY} Conn Smythe is still to be won`;
      case 'cupClubs': {
        const f = cupFranchises(m);
        return f.known.size + f.unknown >= c.min - 1 ? `active with Cups for ${f.known.size} franchises${f.unknown ? ` (and ${f.unknown} Cup the record cannot place)` : ''}, one Cup from ${c.min}` : null;
      }
      default: return null;
    }
  }

  /* fix2-1574: a single season mark's career best on the record, { best, season } (null when the record has no
     season by season goals for him); undefined for a kind that is not a single season mark. simUsConnectionsFacts
     section 10 ties it to AGES ('season'), and section 5's watch line reads every man still playing by it */
  function seasonBest(name, c) {
    if (c.kind !== 'season') return undefined;
    const m = byName.get(fold(name));
    if (!m?.sg) return null;
    const [season, best] = Object.entries(m.sg).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    return { best, season };
  }

  const identity = name => { const m = byName.get(fold(name)); return m?.nhl ? `nhl:${m.nhl}` : fold(name); };
  /* a man who can still change clubs (Round 1567's trade check): the league's own active flag */
  const active = name => { const m = byName.get(fold(name)); return m ? !!m.active : null; };
  return { criterion, fits, watch, seasonBest, identity, active, watched: WATCHED.nhl, has: name => byName.has(fold(name)) };
}

/*
 * Round 1574: how each criterion kind ages, for simUsConnectionsFacts section 10. 'fixed': nothing a season in play
 * can change (a birth country, a draft, a closed past range); 'running': a total, a count or an award the season
 * in play can add a man to, so the sport's watch() must handle it (WATCHED); 'move': a club, so a man still playing
 * can join it by moving, which section 8 holds by a date. A ledger list carries its own age (lists.<key>.age).
 * A kind with no entry here fails section 10 when it is on a board.
 * fix2-1574: 'season': a single season mark ("Scored 60 goals in a season"), running like the rest, and beside it
 * section 5's watch line reads every man still playing by his career best (the checker's seasonBest); section 10
 * fails a kind the checker reads by season best that is not aged 'season', and the other way round. Baseball's
 * 'season' kind stays 'running': its checker has no seasonBest yet (the baseball table rounds own it).
 */
export const AGES = {
  baseball: {
    posEra: 'running', born: 'fixed', club: 'move', mvpBoth: 'running', mvpRun: 'running', award: 'running',
    wsClubs: 'running', wsWith: 'fixed', awardAt: 'running', career: 'running', avg300: 'running', season: 'running',
    bats: 'fixed', starter: 'running', firstPick: 'fixed', undrafted: 'running', college: 'fixed',
    hofPos: 'running', hofPitcher: 'running', recordList: 'running',
  },
  nfl: { club: 'move', college: 'fixed', firstPick: 'fixed', yards: 'running' },
  nhl: {
    club: 'move', career: 'running', season: 'season', clubGoals: 'running', wins: 'running', goalieGoal: 'running',
    pos: 'fixed', award: 'running', smytheLost: 'running', cupClubs: 'running', cupWith: 'fixed', hofClub: 'running',
    draft: 'fixed', draftBy: 'fixed',
  },
};
/* the kinds each sport's watch() handles (a running kind outside its set fails section 10) */
export const WATCHED = {
  baseball: new Set(['mvpBoth', 'mvpRun', 'award', 'awardAt', 'career', 'season']),
  nfl: new Set(['yards']),
  nhl: new Set(['career', 'season', 'clubGoals', 'wins', 'goalieGoal', 'award', 'smytheLost', 'cupClubs', 'hofClub']),
};

/* ------------------------------------------------------------------ */
/* the record files                                                    */
/* ------------------------------------------------------------------ */

/** Read one sport's record and ledger: sport is 'baseball', 'nfl' or 'nhl'. */
export function loadUsConnectionsRecord(root, sport) {
  const read = f => JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'data', f), 'utf8'));
  const ledgerFile = path.join(root, 'scripts', 'data', `${sport}ConnectionsVerified-2026-10.json`);
  const ledger = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, 'utf8')) : {};
  const record = read(`${sport}ConnectionsRecord-2026-10.json`);
  const grid = sport === 'nfl' ? read('nflGridPlayers.json') : null;
  return { record, ledger, grid };
}

/** The checker for a sport, from its record files. */
export function makeUsChecker(root, sport) {
  const { record, ledger, grid } = loadUsConnectionsRecord(root, sport);
  if (sport === 'baseball') return { ledger, checker: makeBaseballChecker({ record, ledger }) };
  if (sport === 'nfl') return { ledger, checker: makeNflChecker({ record, grid, ledger }) };
  if (sport === 'nhl') return { ledger, checker: makeNhlChecker({ record, ledger }) };
  throw new Error(`no checker for ${sport}`);
}
