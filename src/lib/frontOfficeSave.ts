type RecordValue = Record<string, unknown>;
const record = (v: unknown): v is RecordValue => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
const number = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const count = (v: unknown): v is number => number(v) && Number.isInteger(v) && v >= 0;
const list = (v: unknown, valid: (item: unknown) => boolean): boolean => Array.isArray(v) && v.every(valid);
const optional = (v: unknown, valid: (item: unknown) => boolean): boolean => v == null || valid(v);

/** Check the NFL/NHL persisted fields before either board commits any state.
 * Optional older fields retain the boards' existing migrations. IDs are left
 * to ensureLeagueIds, which already repairs missing and duplicate IDs.
 */
export function isFrontOfficeSave(value: unknown, sport: 'NFL' | 'NHL', regularPeriods: number): boolean {
  if (!record(value) || !record(value.league)) return false;
  const s = value, lg = value.league;
  const positions = sport === 'NFL' ? ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB'] : ['C', 'W', 'D', 'G'];
  const player = (v: unknown) => record(v) && text(v.name) && positions.includes(v.pos as string)
    && ['age', 'ovr', 'salary', 'years', 'out', 'pot'].every(k => number(v[k]) && (v[k] as number) >= 0);
  const prospect = (v: unknown) => record(v) && text(v.name)
    && [...positions, ...(sport === 'NFL' ? ['DEF'] : [])].includes(v.pos as string)
    && ['age', 'grade', 'trueOvr'].every(k => number(v[k]));
  const team = (v: unknown) => record(v) && text(v.abbr) && list(v.players, player)
    && count(v.wins) && count(v.losses) && (sport === 'NFL' || count(v.otLosses)) && list(v.picks, count)
    && optional(v.deadCap, entries => list(entries, entry => record(entry) && text(entry.playerId) && text(entry.name) && number(entry.amount) && count(entry.seasonsLeft)))
    && optional(v.releasedThisSeason, entries => list(entries, text))
    && (sport !== 'NFL' || optional(v.depth, order => record(order) && Object.values(order).every(ids => list(ids, text))));
  if (!record(lg.teams) || !text(s.myTeam) || !Object.prototype.hasOwnProperty.call(lg.teams, s.myTeam)
    || !Object.entries(lg.teams).every(([abbr, tm]) => team(tm) && (tm as RecordValue).abbr === abbr)
    || !list(lg.freeAgents, player) || !count(lg.season) || !number(lg.cap) || lg.cap <= 0) return false;
  const teams = lg.teams;
  const teamId = (v: unknown) => text(v) && Object.prototype.hasOwnProperty.call(teams, v);
  const game = (v: unknown) => record(v) && teamId(v.home) && teamId(v.away)
    && count(v.week) && count(v.homeScore) && count(v.awayScore) && (v.winner === '' || teamId(v.winner));
  if (!list(lg.champions, v => record(v) && count(v.season) && teamId(v.team))) return false;
  if (sport === 'NFL') {
    const lastPeriod = s.phase === 'hub' ? regularPeriods : regularPeriods + 1;
    if (!count(lg.week) || lg.week < 1 || lg.week > lastPeriod
      || !Array.isArray(lg.schedule) || lg.schedule.length !== regularPeriods
      || !lg.schedule.every(week => list(week, game))) return false;
  } else if (!count(lg.round) || lg.round < 1 || lg.round > regularPeriods) return false;
  if (!['pick', 'hub', 'draft', 'recap', 'fired'].includes(s.phase as string)
    || !optional(s.titles, count) || !optional(s.seasonsPlayed, count) || !optional(s.picksLeft, count)
    || !optional(s.draftClass, v => list(v, prospect)) || (s.phase === 'draft' && !Array.isArray(s.draftClass))
    || !optional(s.trust, v => number(v) && v >= 0 && v <= 100)
    || !optional(s.fired, v => typeof v === 'boolean') || !optional(s.pressTilt, v => v === -1 || v === 0 || v === 1)
    || !optional(s.seasonTradeLine, text)
    || !optional(s.mandate, v => record(v) && ['title', 'contend', 'playoffs', 'respect', 'rebuild'].includes(v.tier as string)
      && text(v.text) && count(v.winFloor) && count(v.reqLevel) && count(v.season))) return false;
  if (s.postseason != null) {
    if (!record(s.postseason) || !teamId(s.postseason.champion) || !optional(s.postseason.gradeLine, text)) return false;
    if (sport === 'NFL') {
      if (!list(s.postseason.rounds, v => record(v) && text(v.name) && list(v.games, game))) return false;
    } else if (!list(s.postseason.series, v => record(v) && text(v.name) && teamId(v.home) && teamId(v.away)
      && count(v.homeWins) && count(v.awayWins) && teamId(v.winner))) return false;
  }
  return true;
}
