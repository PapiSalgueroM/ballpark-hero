/* Round 829: the rules that turn MLB's own roster and season record into the
   26 men and the ratings MLB Front Office ships. Shared by the fetcher (its
   spot check samples the shipped 26), the generator, and the harness, so the
   rule exists once.

   No network, no clock, no randomness: the same record always gives the same
   26 and the same numbers. */

/* The game's club codes against the Stats API's for 2026. */
export const GAME_TO_API = {
  ARI: 'AZ', ATH: 'ATH', ATL: 'ATL', BAL: 'BAL', BOS: 'BOS', CHC: 'CHC', CHW: 'CWS', CIN: 'CIN', CLE: 'CLE', COL: 'COL',
  DET: 'DET', HOU: 'HOU', KCR: 'KC', LAA: 'LAA', LAD: 'LAD', MIA: 'MIA', MIL: 'MIL', MIN: 'MIN', NYM: 'NYM', NYY: 'NYY',
  PHI: 'PHI', PIT: 'PIT', SDP: 'SD', SEA: 'SEA', SFG: 'SF', STL: 'STL', TBR: 'TB', TEX: 'TEX', TOR: 'TOR', WSN: 'WSH',
};
export const GAME_TEAMS = Object.keys(GAME_TO_API).sort();

/* The spot check's fixed rule: positions 6, 12, 18, 24 and 30 of the sorted
   club codes, ten men each. */
export const SPOT_PER_TEAM = 10;
export const SPOT_TEAMS = [5, 11, 17, 23, 29].map(i => GAME_TEAMS[i]);
export const ESPN_ABBR = { CHC: 'chc', HOU: 'hou', MIN: 'min', SEA: 'sea', WSN: 'wsh' };
export const SPOT_LIMIT = 0.03;

/* Names compared without accents, punctuation or case. */
export const normName = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();

export const ROSTER_SIZE = 26;
export const HITTERS = 13;
export const PITCHERS = 13;
export const CATCHERS = 2;
export const ROTATION = 5;

/* Who counts as on the major league roster on the record date: the active
   list, and every injured list (D7, D10, D15, D60). Optioned men (RM) are in
   the minors that day and are not. */
export const onMajorLeagueRoster = status => status === 'A' || /^D\d+$/.test(String(status));

export const isPitcherRow = m => m.pos === 'P';
const pa = m => (m.hit ? m.hit.pa : 0);
const outs = m => (m.pit ? m.pit.outs : 0);
const gs = m => (m.pit ? m.pit.gs : 0);
const g = m => (m.pit ? m.pit.g : 0);
const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id - b.id);

/* Games caught in 2026 by API id, from the league tables' "caught" list
   (fetchMlbFoRecord.mjs --fielding). */
export const caughtGames = stats => {
  if (!stats || !Array.isArray(stats.caught)) throw new Error('the league tables carry no games caught list, run node scripts/fetchMlbFoRecord.mjs --fielding');
  return new Map(stats.caught.map(r => [r.id, r.g]));
};

/* THE 26. The 2026 September active roster is 28, so the real 26 is chosen
   by one rule from the club's major league roster on the last day of the
   regular season: the 13 position players and the 13 pitchers who carried the
   most of the club's 2026, the way a real 26 is built.
     Position players: the two catchers with the most plate appearances (a
       club always carries two), then the most plate appearances. A club with
       fewer than two men the API lists at C makes up the pair with the men
       who caught the most games in 2026, because the API's one position label
       calls some real catchers DH (Detroit's Eduardo Valencia caught 18 of
       his starts and is listed DH).
     Pitchers: the five with the most games started (the rotation), then the
       most outs recorded.
   Ties go to the man with more games, then by name. If one side is short the
   other fills the 26. Everyone else on the list is left out with the reason.
   caught: Map of API id to games caught (caughtGames above). */
export function selectTwentySix(players, caught) {
  if (!(caught instanceof Map)) throw new Error('selectTwentySix needs the games caught map (caughtGames)');
  const leftOut = [];
  const eligible = [];
  for (const m of players) {
    if (onMajorLeagueRoster(m.status)) eligible.push(m);
    else leftOut.push({ ...m, reason: `list status ${m.status} on the record date (in the minors or off the major league roster)` });
  }
  const hitters = eligible.filter(m => !isPitcherRow(m)).sort((a, b) => pa(b) - pa(a) || byName(a, b));
  const pitchers = eligible.filter(isPitcherRow).sort((a, b) => outs(b) - outs(a) || g(b) - g(a) || byName(a, b));

  const takenH = [];
  const gc = m => caught.get(m.id) || 0;
  const catchers = hitters.filter(x => x.pos === 'C').slice(0, CATCHERS);
  /* fewer than two listed at C: the men who caught the most games make it up */
  for (const m of hitters.filter(x => gc(x) > 0 && x.pos !== 'C').sort((a, b) => gc(b) - gc(a) || pa(b) - pa(a) || byName(a, b))) {
    if (catchers.length < CATCHERS) catchers.push(m);
  }
  const catcherIds = new Set(catchers.map(m => m.id));
  for (const m of catchers) takenH.push(m);
  for (const m of hitters) { if (takenH.length >= HITTERS) break; if (!takenH.includes(m)) takenH.push(m); }

  const takenP = [];
  const byStarts = [...pitchers].sort((a, b) => gs(b) - gs(a) || outs(b) - outs(a) || byName(a, b));
  for (const m of byStarts.slice(0, ROTATION)) if (gs(m) > 0) takenP.push(m);
  for (const m of pitchers) { if (takenP.length >= PITCHERS) break; if (!takenP.includes(m)) takenP.push(m); }

  /* one side short: the other side's next men by the same measure */
  const restH = hitters.filter(m => !takenH.includes(m));
  const restP = pitchers.filter(m => !takenP.includes(m));
  while (takenH.length + takenP.length < ROSTER_SIZE && (restH.length || restP.length)) {
    if (takenP.length < PITCHERS && restP.length) takenP.push(restP.shift());
    else if (takenH.length < HITTERS && restH.length) takenH.push(restH.shift());
    else if (restH.length) takenH.push(restH.shift());
    else takenP.push(restP.shift());
  }
  const rotation = new Set(byStarts.slice(0, ROTATION).filter(m => gs(m) > 0 && takenP.includes(m)).map(m => m.id));
  const men = [...takenH, ...takenP];
  const ids = new Set(men.map(m => m.id));
  for (const m of eligible) {
    if (ids.has(m.id)) continue;
    leftOut.push({ ...m, reason: isPitcherRow(m)
      ? `outside the 13 pitchers: ${gs(m)} starts and ${outs(m)} outs in 2026`
      : `outside the 13 position players: ${pa(m)} plate appearances in 2026` });
  }
  return { men: men.map(m => ({ ...m, rotation: rotation.has(m.id), catcher: catcherIds.has(m.id) })), leftOut };
}

/* NAMESAKES. Two real men can share a name (2026 has two Max Muncys, the
   Dodgers' born 1990 and the Athletics' born 2002), and the game keeps one
   name to a man in a league. The older keeps the name exactly as the API
   gives it; a younger namesake carries his birth year after it, the way the
   reference books tell them apart. Nobody is renamed beyond that. Names are
   compared without accents or case, because a reader cannot tell José Fermín
   (Cardinals, born 1999) from José Fermin (Angels, born 2001) on a trade
   screen either.
   menByClub: { ABBR: men[] } as selectTwentySix returns them.
   Returns Map of API id to the name the game shows. */
export function gameNames(menByClub) {
  const all = Object.values(menByClub).flat();
  const groups = new Map();
  for (const m of all) { const k = normName(m.name); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(m); }
  const out = new Map();
  for (const list of groups.values()) {
    list.sort((a, b) => (a.birthDate < b.birthDate ? -1 : a.birthDate > b.birthDate ? 1 : a.id - b.id));
    list.forEach((m, i) => out.set(m.id, i === 0 ? m.name : `${m.name} (${m.birthDate.slice(0, 4)})`));
  }
  const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (new Set([...out.values()].map(fold)).size !== out.size) throw new Error('two namesakes share a birth year, the rule cannot tell them apart');
  return out;
}

/* The spot check's ten: the 26 sorted by name, positions floor(i x 26 / 10). */
export function spotSample(men) {
  const sorted = [...men].sort(byName);
  const out = [];
  for (let i = 0; i < SPOT_PER_TEAM; i += 1) out.push(sorted[Math.floor((i * sorted.length) / SPOT_PER_TEAM)]);
  return out;
}

/* THE RATINGS. One stat per role for everyone, all 2026 regular season,
   all from the league table in scripts/data/mlbStats2026.json:
     Position players: OPS, as a percentile among every hitter with 300 or
       more plate appearances, mapped to 66 to 97, then pulled toward 66 in
       proportion to how far short of 300 his own plate appearances fall.
     Starters: FIP-lite, (13 HR + 3 BB - 2 K) per inning, lower is better,
       as a percentile among every pitcher who started at least half his games
       and threw 100 or more innings, mapped to 66 to 96, pulled toward 66 by
       innings short of 100.
     Relievers: the same FIP-lite among every pitcher who started fewer than
       half his games and threw 40 or more innings, mapped to 64 to 92, pulled
       toward 64 by innings short of 40. A man with 20 or more saves is the
       closer (CL) and gets 2.
   Percentiles are mid rank: the share of the pool below him plus half the
   share level with him. A rating resting on under a third of the full sample
   (under 100 plate appearances, a starter under 100 outs, a reliever under 40
   outs) is PARTIAL: it is still his own numbers, and the game says so. */
export const RULE = {
  hit: { poolPa: 300, lo: 66, span: 31, fullPa: 300, partialPa: 100 },
  sp: { poolOuts: 300, lo: 66, span: 30, fullOuts: 300, partialOuts: 100 },
  rp: { poolOuts: 120, lo: 64, span: 28, fullOuts: 120, partialOuts: 40 },
  closerSaves: 20, closerBonus: 2,
};
export const fipLite = p => (p && p.outs > 0 ? (13 * p.hr + 3 * p.bb - 2 * p.k) / (p.outs / 3) : null);
const startsShare = p => (p && p.g > 0 ? p.gs / p.g : 0);

export function buildPools(stats) {
  const hit = stats.hitting.filter(r => r.pa >= RULE.hit.poolPa && r.ops != null).map(r => r.ops).sort((a, b) => a - b);
  const sp = stats.pitching.filter(r => startsShare(r) >= 0.5 && r.outs >= RULE.sp.poolOuts).map(fipLite).sort((a, b) => a - b);
  const rp = stats.pitching.filter(r => startsShare(r) < 0.5 && r.outs >= RULE.rp.poolOuts).map(fipLite).sort((a, b) => a - b);
  return { hit, sp, rp };
}
const below = (pool, x) => { let lo = 0, hi = pool.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (pool[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
const atOrBelow = (pool, x) => { let lo = 0, hi = pool.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (pool[mid] <= x) lo = mid + 1; else hi = mid; } return lo; };
/* share of the pool strictly below x plus half the share equal to x */
export const midRank = (pool, x) => (below(pool, x) + (atOrBelow(pool, x) - below(pool, x)) / 2) / pool.length;

/* The game position for a man: a pitcher is SP if he is in the rotation or
   started at least half his games, CL with 20 or more saves, else RP. A two
   way man is listed where he hits, DH, the way the game has always carried
   him. One of the club's two catchers whom the API lists as DH is shown at C,
   where he played the field (DH is no position in the field). Every other
   position is the API's own primary position. */
export function gamePos(m) {
  if (!isPitcherRow(m)) return m.pos === 'TWP' ? 'DH' : m.catcher && m.pos === 'DH' ? 'C' : m.pos;
  if (m.rotation || startsShare(m.pit) >= 0.5) return 'SP';
  if (m.pit && m.pit.sv >= RULE.closerSaves) return 'CL';
  return 'RP';
}

export function rateMan(m, pools) {
  const pos = gamePos(m);
  if (!isPitcherRow(m)) {
    const r = RULE.hit;
    const n = pa(m);
    if (!n || m.hit.ops == null) return { pos, ovr: r.lo, partial: true, basis: 'no 2026 plate appearances' };
    const pct = midRank(pools.hit, m.hit.ops);
    const w = Math.min(1, n / r.fullPa);
    return { pos, ovr: Math.round(r.lo + r.span * pct * w), partial: n < r.partialPa, basis: `OPS ${m.hit.ops.toFixed(3)} in ${n} PA` };
  }
  const r = pos === 'SP' ? RULE.sp : RULE.rp;
  const pool = pos === 'SP' ? pools.sp : pools.rp;
  const o = outs(m);
  const f = fipLite(m.pit);
  if (!o || f == null) return { pos, ovr: r.lo, partial: true, basis: 'no 2026 innings' };
  const pct = 1 - midRank(pool, f);
  const w = Math.min(1, o / r.fullOuts);
  const bonus = pos === 'CL' ? RULE.closerBonus : 0;
  const ip = `${Math.floor(o / 3)}.${o % 3}`;
  return { pos, ovr: Math.min(99, Math.round(r.lo + r.span * pct * w) + bonus), partial: o < r.partialOuts, basis: `FIP-lite ${f.toFixed(2)} in ${ip} IP${bonus ? `, ${m.pit.sv} saves` : ''}` };
}

/* Whole years old on the record date, from the birth date. */
export function ageOn(birthDate, onDate) {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, mo, d] = onDate.split('-').map(Number);
  return y - by - (mo < bm || (mo === bm && d < bd) ? 1 : 0);
}
