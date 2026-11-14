import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { answerSoccerPress, pressRoomView, type SoccerPressHistory } from '@/lib/soccerCareerPress';
import { readCommunityShield, communityShieldSeasonStats } from '@/lib/soccerCareerExtraCups';

type ActualFixture = {
  id: string; seed: number; position: string; credibility: number; playerName: string; currentLeague: string;
  rows: [SeasonRecord, SeasonRecord]; history: SoccerPressHistory;
};
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
// Faithful minimal reader inputs from acquired run41556643008/current.breaks.jsonl.
// Only the two row indices are compacted to 0/1. Full qualification and match records stay intact.
// This is simulated QA evidence, not a real result or a newly played career.
const ACTUAL = [
  {"id":"a-ban-warning-31-2032","seed":31,"position":"ST","where":"after newspaper","originalIndexes":[21,22],"credibility":0,"playerName":"Press journey 31","currentLeague":"Championship","rows":[{"year":2031,"age":37,"club":"Aston Villa","clubCountry":"England","clubTier":4,"apps":35,"leagueApps":32,"goals":17,"assists":8,"cleanSheets":0,"yellowCards":0,"redCards":1,"rating":8.7,"leagueTitle":false,"domesticCup":true,"championsLeague":false,"worldCup":false,"ballonDor":false,"ballonDorRank":null,"type":"playing","intApps":9,"intGoals":5,"intAssists":1,"intRating":6.7,"tournament":null,"tournamentResult":null,"injury":null,"injuryWeeks":0,"injurySevere":false,"extraCups":[{"version":1,"competition":"community-shield","qualifyingYear":2030,"eventYear":2031,"seed":2905404097,"qualification":{"version":1,"competition":"community-shield","status":"ready","qualifyingYear":2030,"eventYear":2031,"seed":2905404097,"leagueWinner":"Chelsea","cupWinner":"Chelsea","runnerUp":"Tottenham","entrants":[{"club":"Chelsea","via":"league-winner"},{"club":"Tottenham","via":"league-runner-up"}],"proof":{"league":{"kind":"league-world-close","year":2030},"cup":{"kind":"phone-world","year":2030},"runnerUp":{"kind":"league-world-close","year":2030}}},"entrants":[{"club":"Chelsea","via":"league-winner"},{"club":"Tottenham","via":"league-runner-up"}],"minutes":90,"score":[1,0],"decidedBy":"normal-time","winner":"Chelsea","player":{"club":"Aston Villa","availability":"unavailable","reason":"not-entrant","selected":false,"apps":0,"goals":0,"assists":0,"cleanSheets":0,"rating":null,"title":false}}]},{"year":2032,"age":38,"club":"Aston Villa","clubCountry":"England","clubTier":4,"apps":41,"leagueApps":37,"goals":9,"assists":5,"cleanSheets":0,"yellowCards":0,"redCards":0,"rating":8.1,"leagueTitle":false,"domesticCup":false,"championsLeague":false,"worldCup":false,"ballonDor":false,"ballonDorRank":null,"type":"playing","intApps":0,"intGoals":0,"intAssists":0,"intRating":0,"tournament":"European Championship","tournamentResult":"Not Selected","injury":null,"injuryWeeks":0,"injurySevere":false,"extraCups":[{"version":1,"competition":"community-shield","qualifyingYear":2031,"eventYear":2032,"seed":3389001620,"qualification":{"version":1,"competition":"community-shield","status":"ready","qualifyingYear":2031,"eventYear":2032,"seed":3389001620,"leagueWinner":"Tottenham","cupWinner":"Aston Villa","entrants":[{"club":"Tottenham","via":"league-winner"},{"club":"Aston Villa","via":"fa-cup-winner"}],"proof":{"league":{"kind":"league-world-close","year":2031},"cup":{"kind":"validated-player-fa-cup","year":2031}}},"entrants":[{"club":"Tottenham","via":"league-winner"},{"club":"Aston Villa","via":"fa-cup-winner"}],"minutes":90,"score":[2,1],"decidedBy":"normal-time","winner":"Tottenham","player":{"club":"Aston Villa","availability":"available","selected":true,"apps":1,"goals":1,"assists":0,"cleanSheets":0,"rating":7.1,"title":false}}]}],"history":{"source":{"index":0,"year":2031,"club":"Aston Villa","position":"ST","statLine":"35 appearances, 17 goals.","apps":35,"goals":17,"assists":8,"cleanSheets":0,"rating":8.7},"topic":"discipline","question":"Looking back at 2031 at Aston Villa. 35 appearances, 17 goals. A red card or suspension was part of this year. What is your response?","answer":"Make a public promise","choice":"ambitious","promise":{"club":"Aston Villa","label":"At least 20 goals in your next played year at Aston Villa.","metric":"goals","target":20,"outcome":"missed","actual":8,"actualRating":8.1,"settledYear":2032,"settledIndex":1}}},
  {"id":"a-ban-year-34-2027","seed":34,"position":"ST","where":"after rehab_choice","originalIndexes":[16,17],"credibility":26,"playerName":"Press journey 34","currentLeague":"Premier League","rows":[{"year":2026,"age":32,"club":"Aston Villa","clubCountry":"England","clubTier":3,"apps":40,"leagueApps":35,"goals":15,"assists":3,"cleanSheets":0,"yellowCards":0,"redCards":0,"rating":8.2,"leagueTitle":true,"domesticCup":false,"championsLeague":false,"worldCup":false,"ballonDor":false,"ballonDorRank":null,"type":"playing","intApps":8,"intGoals":4,"intAssists":1,"intRating":7.2,"tournament":"World Cup","tournamentResult":"Group Stage","injury":null,"injuryWeeks":0,"injurySevere":false},{"year":2027,"age":33,"club":"Aston Villa","clubCountry":"England","clubTier":3,"apps":25,"leagueApps":24,"goals":13,"assists":5,"cleanSheets":0,"yellowCards":6,"redCards":0,"rating":7.5,"leagueTitle":false,"domesticCup":false,"championsLeague":false,"worldCup":false,"ballonDor":false,"ballonDorRank":null,"type":"playing","intApps":0,"intGoals":0,"intAssists":0,"intRating":0,"tournament":null,"tournamentResult":null,"injury":"Broken leg","injuryWeeks":15,"injurySevere":true,"extraCups":[{"version":1,"competition":"community-shield","qualifyingYear":2026,"eventYear":2027,"seed":3630653863,"qualification":{"version":1,"competition":"community-shield","status":"ready","qualifyingYear":2026,"eventYear":2027,"seed":3630653863,"leagueWinner":"Aston Villa","cupWinner":"Newcastle","entrants":[{"club":"Aston Villa","via":"league-winner"},{"club":"Newcastle","via":"fa-cup-winner"}],"proof":{"league":{"kind":"league-world-close","year":2026},"cup":{"kind":"phone-world","year":2026}}},"entrants":[{"club":"Aston Villa","via":"league-winner"},{"club":"Newcastle","via":"fa-cup-winner"}],"minutes":90,"score":[1,1],"decidedBy":"penalties","penalties":[4,3],"winner":"Aston Villa","player":{"club":"Aston Villa","availability":"available","selected":true,"apps":1,"goals":1,"assists":0,"cleanSheets":0,"rating":7.6,"title":true}}]}],"history":{"source":{"index":0,"year":2026,"club":"Aston Villa","position":"ST","statLine":"40 appearances, 15 goals.","apps":40,"goals":15,"assists":3,"cleanSheets":0,"rating":8.2},"topic":"league_champion","question":"Your 2026 record at Aston Villa is in. 40 appearances, 15 goals. You finished the year as a league champion. What are you taking into the next one?","answer":"Make a public promise","choice":"ambitious","promise":{"club":"Aston Villa","label":"At least 18 goals in your next played year at Aston Villa.","metric":"goals","target":18,"outcome":"excused","actual":12,"actualRating":7.5,"settledYear":2027,"settledIndex":1}}},
  {"id":"a-ban-year-35-2027","seed":35,"position":"CM","where":"after newspaper","originalIndexes":[16,17],"credibility":0,"playerName":"Press journey 35","currentLeague":"Premier League","rows":[{"year":2026,"age":32,"club":"Man City","clubCountry":"England","clubTier":1,"apps":41,"leagueApps":31,"goals":4,"assists":8,"cleanSheets":0,"yellowCards":1,"redCards":0,"rating":7.1,"leagueTitle":true,"domesticCup":true,"championsLeague":false,"worldCup":false,"ballonDor":false,"ballonDorRank":20,"type":"playing","intApps":13,"intGoals":6,"intAssists":9,"intRating":8,"tournament":"World Cup","tournamentResult":"Quarter-final","injury":null,"injuryWeeks":0,"injurySevere":false},{"year":2027,"age":33,"club":"Man City","clubCountry":"England","clubTier":1,"apps":44,"leagueApps":29,"goals":7,"assists":8,"cleanSheets":0,"yellowCards":2,"redCards":0,"rating":7.5,"leagueTitle":true,"domesticCup":true,"championsLeague":false,"worldCup":false,"ballonDor":false,"ballonDorRank":22,"type":"playing","intApps":5,"intGoals":1,"intAssists":1,"intRating":7.6,"tournament":null,"tournamentResult":null,"injury":null,"injuryWeeks":0,"injurySevere":false,"extraCups":[{"version":1,"competition":"community-shield","qualifyingYear":2026,"eventYear":2027,"seed":1709571232,"qualification":{"version":1,"competition":"community-shield","status":"ready","qualifyingYear":2026,"eventYear":2027,"seed":1709571232,"leagueWinner":"Man City","cupWinner":"Man City","runnerUp":"Arsenal","entrants":[{"club":"Man City","via":"league-winner"},{"club":"Arsenal","via":"league-runner-up"}],"proof":{"league":{"kind":"league-world-close","year":2026},"cup":{"kind":"validated-player-fa-cup","year":2026},"runnerUp":{"kind":"league-world-close","year":2026}}},"entrants":[{"club":"Man City","via":"league-winner"},{"club":"Arsenal","via":"league-runner-up"}],"minutes":90,"score":[4,0],"decidedBy":"normal-time","winner":"Man City","player":{"club":"Man City","availability":"available","selected":true,"apps":1,"goals":2,"assists":1,"cleanSheets":0,"rating":8.2,"title":true}}]}],"history":{"source":{"index":0,"year":2026,"club":"Man City","position":"CM","statLine":"41 appearances, 8 assists.","apps":41,"goals":4,"assists":8,"cleanSheets":0,"rating":7.1},"topic":"league_champion","question":"Your 2026 record at Man City is in. 41 appearances, 8 assists. You finished the year as a league champion. What are you taking into the next one?","answer":"Make a public promise","choice":"ambitious","promise":{"club":"Man City","label":"At least 10 assists in your next played year at Man City.","metric":"assists","target":10,"outcome":"missed","actual":7,"actualRating":7.5,"settledYear":2027,"settledIndex":1}}},
  {"id":"a-ban-year-36-2028","seed":36,"position":"CB","where":"after newspaper","originalIndexes":[17,18],"credibility":82,"playerName":"Press journey 36","currentLeague":"Championship","rows":[{"year":2027,"age":33,"club":"Fulham","clubCountry":"England","clubTier":4,"apps":40,"leagueApps":37,"goals":0,"assists":4,"cleanSheets":12,"yellowCards":2,"redCards":0,"rating":8.8,"leagueTitle":false,"domesticCup":true,"championsLeague":false,"worldCup":false,"ballonDor":false,"ballonDorRank":null,"type":"playing","intApps":8,"intGoals":0,"intAssists":0,"intRating":7.6,"tournament":null,"tournamentResult":null,"injury":null,"injuryWeeks":0,"injurySevere":false,"extraCups":[{"version":1,"competition":"community-shield","qualifyingYear":2026,"eventYear":2027,"seed":2693897327,"qualification":{"version":1,"competition":"community-shield","status":"ready","qualifyingYear":2026,"eventYear":2027,"seed":2693897327,"leagueWinner":"Man City","cupWinner":"Liverpool","entrants":[{"club":"Man City","via":"league-winner"},{"club":"Liverpool","via":"fa-cup-winner"}],"proof":{"league":{"kind":"league-world-close","year":2026},"cup":{"kind":"phone-world","year":2026}}},"entrants":[{"club":"Man City","via":"league-winner"},{"club":"Liverpool","via":"fa-cup-winner"}],"minutes":90,"score":[4,0],"decidedBy":"normal-time","winner":"Man City","player":{"club":"Fulham","availability":"unavailable","reason":"not-entrant","selected":false,"apps":0,"goals":0,"assists":0,"cleanSheets":0,"rating":null,"title":false}}]},{"year":2028,"age":34,"club":"Fulham","clubCountry":"England","clubTier":4,"apps":38,"leagueApps":36,"goals":0,"assists":4,"cleanSheets":9,"yellowCards":6,"redCards":0,"rating":8.4,"leagueTitle":false,"domesticCup":false,"championsLeague":false,"worldCup":false,"ballonDor":false,"ballonDorRank":null,"type":"playing","intApps":14,"intGoals":2,"intAssists":1,"intRating":6.9,"tournament":"European Championship","tournamentResult":"Runner-up","injury":null,"injuryWeeks":0,"injurySevere":false,"extraCups":[{"version":1,"competition":"community-shield","qualifyingYear":2027,"eventYear":2028,"seed":2896976439,"qualification":{"version":1,"competition":"community-shield","status":"ready","qualifyingYear":2027,"eventYear":2028,"seed":2896976439,"leagueWinner":"Liverpool","cupWinner":"Fulham","entrants":[{"club":"Liverpool","via":"league-winner"},{"club":"Fulham","via":"fa-cup-winner"}],"proof":{"league":{"kind":"league-world-close","year":2027},"cup":{"kind":"validated-player-fa-cup","year":2027}}},"entrants":[{"club":"Liverpool","via":"league-winner"},{"club":"Fulham","via":"fa-cup-winner"}],"minutes":90,"score":[1,0],"decidedBy":"normal-time","winner":"Liverpool","player":{"club":"Fulham","availability":"available","selected":true,"apps":1,"goals":0,"assists":0,"cleanSheets":0,"rating":7.1,"title":false}}]}],"history":{"source":{"index":0,"year":2027,"club":"Fulham","position":"CB","statLine":"40 appearances, 8.8 average rating.","apps":40,"goals":0,"assists":4,"cleanSheets":12,"rating":8.8},"topic":"strong_form","question":"About that 2027 season at Fulham. 40 appearances, 8.8 average rating. You have a strong season rating behind you. What do you want to say about the next one?","answer":"Make a public promise","choice":"ambitious","promise":{"club":"Fulham","label":"At least 38 appearances and a 7.0 average rating in your next played year at Fulham.","metric":"apps","target":38,"ratingFloor":7,"outcome":"missed","actual":37,"actualRating":8.4,"settledYear":2028,"settledIndex":1}}},
  {"id":"a-ban-year-36-2036","seed":36,"position":"CB","where":"after newspaper","originalIndexes":[25,26],"credibility":42,"playerName":"Press journey 36","currentLeague":"Championship","rows":[{"year":2035,"age":41,"club":"Fulham","clubCountry":"England","clubTier":4,"apps":30,"leagueApps":25,"goals":3,"assists":1,"cleanSheets":6,"yellowCards":4,"redCards":0,"rating":6.6,"leagueTitle":false,"domesticCup":true,"championsLeague":false,"worldCup":false,"ballonDor":false,"ballonDorRank":null,"type":"playing","intApps":0,"intGoals":0,"intAssists":0,"intRating":0,"tournament":null,"tournamentResult":null,"injury":null,"injuryWeeks":0,"injurySevere":false,"extraCups":[{"version":1,"competition":"community-shield","qualifyingYear":2034,"eventYear":2035,"seed":3823802887,"qualification":{"version":1,"competition":"community-shield","status":"ready","qualifyingYear":2034,"eventYear":2035,"seed":3823802887,"leagueWinner":"Tottenham","cupWinner":"Man United","entrants":[{"club":"Tottenham","via":"league-winner"},{"club":"Man United","via":"fa-cup-winner"}],"proof":{"league":{"kind":"league-world-close","year":2034},"cup":{"kind":"phone-world","year":2034}}},"entrants":[{"club":"Tottenham","via":"league-winner"},{"club":"Man United","via":"fa-cup-winner"}],"minutes":90,"score":[0,1],"decidedBy":"normal-time","winner":"Man United","player":{"club":"Fulham","availability":"unavailable","reason":"not-entrant","selected":false,"apps":0,"goals":0,"assists":0,"cleanSheets":0,"rating":null,"title":false}}]},{"year":2036,"age":42,"club":"Fulham","clubCountry":"England","clubTier":4,"apps":19,"leagueApps":17,"goals":2,"assists":1,"cleanSheets":8,"yellowCards":2,"redCards":0,"rating":6.2,"leagueTitle":false,"domesticCup":false,"championsLeague":false,"worldCup":false,"ballonDor":false,"ballonDorRank":null,"type":"playing","intApps":0,"intGoals":0,"intAssists":0,"intRating":0,"tournament":"European Championship","tournamentResult":"Not Selected","injury":"Hip knock","injuryWeeks":3,"injurySevere":false,"extraCups":[{"version":1,"competition":"community-shield","qualifyingYear":2035,"eventYear":2036,"seed":111660490,"qualification":{"version":1,"competition":"community-shield","status":"ready","qualifyingYear":2035,"eventYear":2036,"seed":111660490,"leagueWinner":"Liverpool","cupWinner":"Fulham","entrants":[{"club":"Liverpool","via":"league-winner"},{"club":"Fulham","via":"fa-cup-winner"}],"proof":{"league":{"kind":"league-world-close","year":2035},"cup":{"kind":"validated-player-fa-cup","year":2035}}},"entrants":[{"club":"Liverpool","via":"league-winner"},{"club":"Fulham","via":"fa-cup-winner"}],"minutes":90,"score":[7,0],"decidedBy":"normal-time","winner":"Liverpool","player":{"club":"Fulham","availability":"available","selected":true,"apps":1,"goals":0,"assists":0,"cleanSheets":0,"rating":6.5,"title":false}}]}],"history":{"source":{"index":0,"year":2035,"club":"Fulham","position":"CB","statLine":"30 appearances, 6.6 average rating.","apps":30,"goals":3,"assists":1,"cleanSheets":6,"rating":6.6},"topic":"contract","question":"Your 2035 record at Fulham is in. 30 appearances, 6.6 average rating. Your current deal has at most a year left. What comes next for you?","answer":"Make a public promise","choice":"ambitious","promise":{"club":"Fulham","label":"At least 32 appearances and a 7.0 average rating in your next played year at Fulham.","metric":"apps","target":32,"ratingFloor":7,"outcome":"missed","actual":18,"actualRating":6.2,"settledYear":2036,"settledIndex":1}}}
] as unknown as ActualFixture[];

function fixture(input: ActualFixture): CareerState {
  const saved = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')) as
    { saves: { id: string; state: CareerState }[] };
  const base = saved.saves.find(row => row.id === 'ere')?.state;
  expect(base, 'existing captured ere foundation').toBeDefined();
  const rows = copy(input.rows), last = rows[1];
  return { ...copy(base!), playerName: input.playerName, position: input.position as CareerState['position'],
    currentClub: last.club, currentClubCountry: last.clubCountry, currentClubTier: last.clubTier,
    currentLeague: input.currentLeague, phase: 'playing', retired: false, seasons: rows,
    pressRoom: { version: 1, credibility: input.credibility, history: [copy(input.history)] } };
}
function gradeLab(annualApps = 1): CareerState {
  const state = fixture(ACTUAL[3]), row = state.seasons[1], match = readCommunityShield(row);
  expect(match, 'actual recorded CB opening for the labelled grade lab').not.toBeNull();
  // Explicit arithmetic lab: the match is held, while the annual line is controlled, not naturally observed.
  const annual = { ...row, apps: annualApps, goals: 0, assists: 0, cleanSheets: 0, rating: annualApps ? 6 : 0 };
  state.seasons[1] = { ...annual, ...communityShieldSeasonStats(annual, match) };
  const promise = state.pressRoom!.history[0].promise!;
  promise.actual = annualApps; promise.actualRating = annual.rating; promise.outcome = annualApps ? 'missed' : 'excused';
  return state;
}

describe('Shield contribution and strict annual Press promises', () => {
  it.each(ACTUAL.map(row => [row.id, row] as const))('SC_SHIELD_PRESS_ACTUAL %s: keeps the recorded annual promise readable', (_id, input) => {
    const state = fixture(input), held = JSON.stringify(state), row = state.seasons[1], promise = state.pressRoom!.history[0].promise!;
    const match = readCommunityShield(row);
    expect(match, 'the actual extracted result must pass the real strict reader').not.toBeNull();
    expect(row[promise.metric]).toBe(promise.actual! + match!.player[promise.metric]);
    const view = pressRoomView(state);
    expect(view.history.length, 'SC_SHIELD_PRESS_ACTUAL: a saved opening must not erase the recorded annual promise').toBe(1);
    expect(view.history[0].promise).toEqual(promise);
    expect(view.credibility).toBe(input.credibility);
    if (input.id === 'a-ban-year-36-2028') {
      expect(row.apps).toBe(38); expect(promise.actual).toBe(37); expect(promise.target).toBe(38);
      expect(promise.outcome).toBe('missed');
    }
    expect(JSON.stringify(state)).toBe(held);
  });

  it('SC_SHIELD_PRESS_GRADE: validates a changed final grade by the actual forward merge', () => {
    const state = gradeLab(), row = state.seasons[1], promise = state.pressRoom!.history[0].promise!;
    expect(readCommunityShield(row)).not.toBeNull();
    expect(row.apps).toBe(2); expect(promise.actual).toBe(1); expect(promise.actualRating).toBe(6);
    expect(row.rating).toBe(6.6);
    expect(pressRoomView(state).history.length, 'SC_SHIELD_PRESS_GRADE: the recorded annual grade must explain the final saved grade').toBe(1);
    expect(state.pressRoom!.history[0].promise!.outcome).toBe('missed');
  });

  it('keeps an excused promise when the only appearance was a saved Shield match', () => {
    const state = gradeLab(0), row = state.seasons[1];
    row.extraCups![0].annualRating = 0;
    expect(readCommunityShield(row)).not.toBeNull();
    expect(row.apps).toBe(1);
    const before = JSON.stringify(state);
    const view = pressRoomView(state);
    expect(view.history[0]?.promise).toMatchObject({ outcome: 'excused', actual: 0, actualRating: 0 });
    expect(view.credibility).toBe(state.pressRoom!.credibility);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('uses the saved annual grade even when another grade rounds to the same combined result', () => {
    const state = fixture(ACTUAL[3]), row = state.seasons[1];
    const promise = state.pressRoom!.history[0].promise!;
    row.extraCups![0].annualRating = 8.4;
    row.extraCups![0].player.rating = 6.5;
    row.rating = 8.4;
    promise.actualRating = 8.4;
    expect(readCommunityShield(row)).not.toBeNull();
    expect(pressRoomView(state).history).toHaveLength(1);
    promise.actualRating = 8.5;
    expect(communityShieldSeasonStats({ ...row, apps: 37, rating: 8.5 }, row.extraCups![0]).rating).toBe(row.rating);
    expect(pressRoomView(state).history).toEqual([]);
  });

  it('SC_SHIELD_PRESS_REJECT: refuses wrong annual claims and unknown or invalid opening records', () => {
    const cases: [string, CareerState][] = [];
    const wrongMetric = fixture(ACTUAL[0]); wrongMetric.pressRoom!.history[0].promise!.actual! += 1;
    cases.push(['aggregate metric claimed as annual', wrongMetric]);
    const wrongOutcome = fixture(ACTUAL[3]); wrongOutcome.pressRoom!.history[0].promise!.outcome = 'met';
    cases.push(['final app threshold used for annual outcome', wrongOutcome]);
    const wrongGrade = gradeLab(); wrongGrade.pressRoom!.history[0].promise!.actualRating = 8;
    cases.push(['unexplained stored annual grade', wrongGrade]);
    const missingGrade = gradeLab(); delete missingGrade.pressRoom!.history[0].promise!.actualRating;
    cases.push(['missing annual grade', missingGrade]);
    const missing = fixture(ACTUAL[0]); delete missing.seasons[1].extraCups;
    cases.push(['no recorded opening proof', missing]);
    const invalid = fixture(ACTUAL[0]); invalid.seasons[1].extraCups![0].qualification.proof.league.year -= 1;
    cases.push(['invalid qualification year', invalid]);
    const duplicate = fixture(ACTUAL[0]); duplicate.seasons[1].extraCups!.push(copy(duplicate.seasons[1].extraCups![0]));
    cases.push(['duplicate per-row results', duplicate]);
    const changedPart = gradeLab(); changedPart.seasons[1].extraCups![0].player.rating = 9.1;
    cases.push(['unexplained recorded match grade', changedPart]);
    cases.push(['zero annual apps cannot authenticate an arbitrary annual grade', gradeLab(0)]);
    for (const [label, state] of cases) {
      const held = JSON.stringify(state);
      expect(pressRoomView(state).history, 'SC_SHIELD_PRESS_REJECT: ' + label).toEqual([]);
      expect(JSON.stringify(state)).toBe(held);
    }
  });

  it('SC_SHIELD_PRESS_SOURCE: keeps new answer snapshots bound to the complete final row', () => {
    const state = fixture(ACTUAL[3]), finalRow = state.seasons[1];
    const answered = answerSoccerPress(state, 'calm'), view = pressRoomView(answered);
    expect(view.history.length, 'SC_SHIELD_PRESS_SOURCE: a final-row answer must retain both verified histories').toBe(2);
    const source = answered.pressRoom!.history.find(row => row.source.index === 1)!.source;
    expect(source.apps).toBe(finalRow.apps); expect(source.goals).toBe(finalRow.goals);
    expect(source.assists).toBe(finalRow.assists); expect(source.cleanSheets).toBe(finalRow.cleanSheets); expect(source.rating).toBe(finalRow.rating);
    const broken = copy(answered); broken.pressRoom!.history.find(row => row.source.index === 1)!.source.apps -= 1;
    expect(pressRoomView(broken).history, 'the final answer source cannot claim an annual-only app count').toEqual([]);
  });

  it('SC_SHIELD_PRESS_LEGACY: retains exact old and zero-contribution result validation', () => {
    const state = fixture(ACTUAL[0]), row = state.seasons[1], match = readCommunityShield(row)!;
    const promise = state.pressRoom!.history[0].promise!;
    const annual = { ...row, apps: row.apps - match.player.apps, goals: row.goals - match.player.goals,
      assists: row.assists - match.player.assists, cleanSheets: row.cleanSheets - match.player.cleanSheets, rating: promise.actualRating! };
    delete annual.extraCups; state.seasons[1] = annual;
    expect(pressRoomView(state).history).toHaveLength(1);
    const bench = copy(state), benchMatch = copy(match);
    benchMatch.player = { club: row.club, availability: 'available', selected: false,
      apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: null, title: false };
    bench.seasons[1].extraCups = [benchMatch];
    expect(readCommunityShield(bench.seasons[1])).not.toBeNull();
    expect(pressRoomView(bench).history).toHaveLength(1);
    bench.pressRoom!.history[0].promise!.actual! += 1;
    expect(pressRoomView(bench).history).toEqual([]);
  });
});
