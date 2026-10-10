import { readSeasonDerbies, type SeasonDerby } from './soccerCareerDerby';

export interface SavedDerbyHistorySource { seasons: readonly unknown[] }
export type SavedDerbyHistoryStatus = 'saved' | 'empty' | 'unrecorded' | 'invalid';
export type SavedDerbyHistoryResult = 'W' | 'D' | 'L';

interface SavedDerbyMetadata {
  seasonIndex: number;
  year: number | null;
  age: number | null;
  club: string | null;
  onLoanFrom: string | null;
}

export interface SavedDerbyHistoryTotals {
  team: { meetings: number; w: number; d: number; l: number };
  player: { played: number; w: number; d: number; l: number; goals: number };
  missed: number;
}

export interface SavedDerbyHistorySeason extends SavedDerbyMetadata, SavedDerbyHistoryTotals {
  status: SavedDerbyHistoryStatus;
  meetingCount: number;
}

export interface SavedDerbyHistoryMeeting extends SavedDerbyMetadata {
  rivalIndex: number;
  meetingIndex: number;
  rival: string;
  name: string;
  kind: SeasonDerby['kind'];
  home: boolean;
  gf: number;
  ga: number;
  played: boolean;
  goals: number;
  won: boolean;
  result: SavedDerbyHistoryResult;
  homeClub: string | null;
  awayClub: string | null;
  homeGoals: number;
  awayGoals: number;
}

export interface SavedDerbyHistory extends SavedDerbyHistoryTotals {
  seasons: SavedDerbyHistorySeason[];
  meetings: SavedDerbyHistoryMeeting[];
}

export interface SavedDerbyRivalRecord extends SavedDerbyHistoryTotals {
  rival: string;
  meetings: SavedDerbyHistoryMeeting[];
}

const savedNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const savedText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

function emptyTotals(): SavedDerbyHistoryTotals {
  return {
    team: { meetings: 0, w: 0, d: 0, l: 0 },
    player: { played: 0, w: 0, d: 0, l: 0, goals: 0 },
    missed: 0,
  };
}

function addMeeting(totals: SavedDerbyHistoryTotals, meeting: SavedDerbyHistoryMeeting): void {
  const outcome = meeting.gf > meeting.ga ? 'w' : meeting.gf < meeting.ga ? 'l' : 'd';
  totals.team.meetings += 1;
  totals.team[outcome] += 1;
  if (meeting.played) {
    totals.player.played += 1;
    totals.player[outcome] += 1;
    totals.player.goals += meeting.goals;
  } else totals.missed += 1;
}

/** Saved meetings only. Missing history never becomes a new fixture. */
export function savedDerbyHistory(career: SavedDerbyHistorySource): SavedDerbyHistory {
  const history: SavedDerbyHistory = { seasons: [], meetings: [], ...emptyTotals() };
  career.seasons.forEach((rawSeason, seasonIndex) => {
    if (!rawSeason || typeof rawSeason !== 'object') return;
    const row = rawSeason as Record<string, unknown>;
    if (row.type !== 'playing') return;
    const metadata: SavedDerbyMetadata = {
      seasonIndex, year: savedNumber(row.year), age: savedNumber(row.age),
      club: savedText(row.club), onLoanFrom: savedText(row.onLoanFrom),
    };
    const season: SavedDerbyHistorySeason = {
      ...metadata, status: 'unrecorded', meetingCount: 0, ...emptyTotals(),
    };
    history.seasons.push(season);
    const raw = row.derbies;
    if (raw === undefined) return;
    if (!Array.isArray(raw)) { season.status = 'invalid'; return; }
    if (raw.length === 0) { season.status = 'empty'; return; }
    const derbies = readSeasonDerbies(row);
    // Keep the original array identities when the existing reader accepts them.
    const valid = derbies.length === raw.length && derbies.every((derby, rivalIndex) => {
      const original = raw[rivalIndex] as Record<string, unknown>;
      if (derby.rival !== original.rival || derby.name !== original.name || derby.kind !== original.kind) return false;
      if (savedText(derby.rival) === null || savedText(derby.name) === null) return false;
      const meetings = original.meetings;
      return Array.isArray(meetings) && derby.meetings.length === meetings.length
        && derby.meetings.every((meeting, meetingIndex) => {
          const held = meetings[meetingIndex] as Record<string, unknown>;
          if (meeting.home !== held.home || meeting.gf !== held.gf || meeting.ga !== held.ga
            || meeting.played !== held.played || meeting.goals !== held.goals || meeting.won !== held.won) return false;
          if (meeting.goals > meeting.gf || (!meeting.played && meeting.goals !== 0)) return false;
          return !meeting.won || (meeting.played && meeting.gf > meeting.ga && meeting.goals > 0);
        });
    });
    if (!valid) { season.status = 'invalid'; return; }
    let played = 0, goals = 0;
    for (const derby of derbies) for (const meeting of derby.meetings) {
      if (meeting.played) played += 1;
      goals += meeting.goals;
    }
    const savedApps = savedNumber(row.apps), savedGoals = savedNumber(row.goals);
    if ((savedApps !== null && played > savedApps) || (savedGoals !== null && goals > savedGoals)) {
      season.status = 'invalid'; return;
    }
    season.status = 'saved';
    derbies.forEach((derby, rivalIndex) => {
      derby.meetings.forEach((held, meetingIndex) => {
        const outcome = held.gf > held.ga ? 'w' : held.gf < held.ga ? 'l' : 'd';
        const meeting: SavedDerbyHistoryMeeting = {
          ...metadata, rivalIndex, meetingIndex, rival: derby.rival, name: derby.name, kind: derby.kind,
          home: held.home, gf: held.gf, ga: held.ga, played: held.played, goals: held.goals,
          won: held.won === true, result: outcome === 'w' ? 'W' : outcome === 'l' ? 'L' : 'D',
          homeClub: held.home ? metadata.club : derby.rival,
          awayClub: held.home ? derby.rival : metadata.club,
          homeGoals: held.home ? held.gf : held.ga,
          awayGoals: held.home ? held.ga : held.gf,
        };
        history.meetings.push(meeting);
        season.meetingCount += 1;
        addMeeting(history, meeting);
        addMeeting(season, meeting);
      });
    });
  });
  return history;
}

/** Exact saved rival names, in their first saved occurrence order. */
export function savedDerbyRivalRecords(history: Pick<SavedDerbyHistory, 'meetings'>): SavedDerbyRivalRecord[] {
  const records: SavedDerbyRivalRecord[] = [];
  const byRival = new Map<string, SavedDerbyRivalRecord>();
  for (const meeting of history.meetings) {
    let record = byRival.get(meeting.rival);
    if (!record) {
      record = { rival: meeting.rival, meetings: [], ...emptyTotals() };
      byRival.set(meeting.rival, record);
      records.push(record);
    }
    record.meetings.push({ ...meeting });
    addMeeting(record, meeting);
  }
  return records;
}
