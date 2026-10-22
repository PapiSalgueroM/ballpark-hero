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
/** The share rule: at least 30 percent of his games there fits, under 10 percent does not, between is unknown. */
function shareVerdict(share) {
  if (share === null) return null;
  if (share >= 0.3) return true;
  if (share < 0.1) return false;
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

  function criterion(label) {
    const f = fold(label);
    if (lists.has(f)) return { kind: 'list', key: f };
    let m;
    if ((m = label.match(/^Born in (.+?)( \(pitchers\))?$/))) {
      const c = MLB_COUNTRIES[fold(m[1])];
      return c ? { kind: 'born', country: c, pitchers: !!m[2] } : null;
    }
    if ((m = label.match(/^Played for the (.+)$/)) || (m = label.match(/^(.+) legends$/))) {
      /* "Montreal Expos / Washington Nationals" and "Cleveland Guardians/Indians" name one franchise twice */
      const ids = new Set([MLB_CLUBS[fold(m[1])], ...m[1].split(/\s*\/\s*/).map(p => MLB_CLUBS[fold(p)])].filter(Boolean));
      if (ids.size !== 1) return null;
      return { kind: 'club', id: [...ids][0], legend: /legends$/.test(label) };
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
    const m = byName.get(fold(name));
    if (!m) return null;
    switch (c.kind) {
      case 'born': {
        if (!m.country) return null;
        const at = MLB_COUNTRIES[fold(m.country)] ?? fold(m.country);
        if (at !== c.country) return false;
        if (!c.pitchers) return true;
        return m.pos === 'TWP' ? null : isPitcher(m);
      }
      case 'club': {
        const seasons = m.fr?.[c.id] ?? 0;
        if (!c.legend) return seasons > 0;
        /* a legend is not a man who passed through: three seasons or more fits, none does not, one or two is unknown */
        if (seasons >= 3) return true;
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
        return c.pos ? shareVerdict(posShare(m, new Set(c.pos))) : true;
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
        if (c.codes.includes('ALCY') && !isPitcher(m)) return null;
        if (c.codes.includes('ALROY') && m.debut && Number(m.debut.slice(0, 4)) < 2025) return null;
        if (c.codes.includes('ASMVP')) return null;
        return `played in 2026; the 2026 ${c.codes.join('/')} is still to be named`;
      case 'awardAt':
        return top && new Set(c.pos).has(top) ? `played most of 2026 at ${top}; the 2026 ${c.codes.join('/')} is still to be named` : null;
      default: return null;
    }
  }

  return { criterion, fits, watch, has: name => byName.has(fold(name)) };
}
