/* Round 1593, decision 6 (the critic's correction 8): the readers of "weeks of the season" that this round moved
 * from the calendar's raw length to the weeks a season charges (worldNights.ts tickingWeeksIn, tickingWeeksDone and
 * tickingWeeksLeft: every entry but a night). Written once, for every harness that needs the step switched off.
 *
 * WHAT MOVES. A calendar with no night entry gives the numbers it always gave. A calendar WITH a night (a super cup
 * participant's since Round 1510, a Europa League participant's from this round) moves in five places of the engine:
 * the finance projection's weeks left (wages and staff wages), a release's settlement weeks, the board's chase
 * message (a random gate: it draws only once a quarter of the season has gone, so moving the quarter moves when the
 * draw happens and every later draw of that save), the staff poach offer's lapse line, and a mid season job move's
 * point of the new season. The two screens (CalendarScreen's weeks left, the hub's Week X of Y) move with them and
 * are not in the engine's bundle.
 *
 *   import { TICKING_EDITS } from './lib/tickingWeeks1593.mjs';
 *   TICKING_EDITS   [{ file, from, to }] for scripts/lib/worldUclFleet.mjs's engineOf: each `from` is this round's
 *                   line and must stand exactly once (engineOf refuses to run otherwise), each `to` the base's line.
 */
export const TICKING_EDITS = [
  { file: 'src/lib/clubManagerFinances.ts',
    from: '  const weeksLeft = tickingWeeksLeft(state.calendar, state.week);\n',
    to: '  const weeksLeft = Math.max(0, state.calendar.length - state.week);\n' },
  { file: 'src/lib/clubManager.ts',
    from: '  const seasonWeeks = Math.max(1, tickingWeeksIn(state.calendar));\n  const leftThisSeason = Math.max(0, seasonWeeks - tickingWeeksDone(state.calendar, state.week));\n',
    to: '  const seasonWeeks = Math.max(1, state.calendar.length);\n  const leftThisSeason = Math.max(0, seasonWeeks - state.week);\n' },
  { file: 'src/lib/clubManager.ts',
    from: 'tickingWeeksDone(state.calendar, state.week) >= tickingWeeksIn(state.calendar) * 0.25 && Math.random() < 0.45',
    to: 'state.week >= state.calendar.length * 0.25 && Math.random() < 0.45' },
  { file: 'src/lib/clubManagerStaff.ts',
    from: 'tickingWeeksDone(state.calendar, state.week) + weeks >= tickingWeeksIn(state.calendar) ? ',
    to: 'state.week + weeks >= state.calendar.length ? ' },
  { file: 'src/lib/clubManagerCalendar.ts',
    from: '  const ticks = tickingWeeksIn(career.calendar);\n  const frac = ticks ? tickingWeeksDone(career.calendar, career.week) / ticks : 0;\n',
    to: '  const frac = career.calendar.length ? career.week / career.calendar.length : 0;\n' },
];
