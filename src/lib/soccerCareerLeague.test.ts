import { describe, expect, it } from "vitest";
import { CAREER_LEAGUE_SEASONS } from "../data/careerLeagueSeasons";
import { divisionMove, drawLeagueFinish, dugoutTableWords, eliteInYear, finishBand, finishZone, leagueSizeFor, listLeague, leagueWithArticle, LIST_SEASON, managerLeagueField, MANAGER_FIELD, ordinal, readLeagueFinish } from "./soccerCareerLeague";

const ELITE = ["Bayern Munich", "PSG", "Man City", "Real Madrid", "Barcelona", "Liverpool"];
const base = { league: "La Liga", year: 2020, tier: 1, elite: false, rating: 7, leagueTitle: false, seedKey: "k" };

describe("leagueSizeFor", () => {
  it("walks every window boundary of the verified table", () => {
    /* Round 1037: 1990-91 and 1991-92 (the First Division) answer from the
       league ledgers now, 20 and 22 clubs; nothing before 1990 is held */
    expect(leagueSizeFor("Premier League", 1989)).toBeNull();
    expect(leagueSizeFor("Premier League", 1990)).toBe(20);
    expect(leagueSizeFor("Premier League", 1991)).toBe(22);
    expect(leagueSizeFor("Premier League", 1992)).toBe(22);
    expect(leagueSizeFor("Premier League", 1994)).toBe(22);
    expect(leagueSizeFor("Premier League", 1995)).toBe(20);
    expect(leagueSizeFor("La Liga", 1994)).toBe(20);
    expect(leagueSizeFor("La Liga", 1995)).toBe(22);
    expect(leagueSizeFor("La Liga", 1996)).toBe(22);
    expect(leagueSizeFor("La Liga", 1997)).toBe(20);
    expect(leagueSizeFor("Bundesliga", 1990)).toBe(18);
    expect(leagueSizeFor("Bundesliga", 1991)).toBe(20);
    expect(leagueSizeFor("Bundesliga", 1992)).toBe(18);
    expect(leagueSizeFor("Serie A", 2003)).toBe(18);
    expect(leagueSizeFor("Serie A", 2004)).toBe(20);
    expect(leagueSizeFor("Ligue 1", 1996)).toBe(20);
    expect(leagueSizeFor("Ligue 1", 1997)).toBe(18);
    expect(leagueSizeFor("Ligue 1", 2001)).toBe(18);
    expect(leagueSizeFor("Ligue 1", 2002)).toBe(20);
    expect(leagueSizeFor("Ligue 1", 2022)).toBe(20);
    expect(leagueSizeFor("Ligue 1", 2023)).toBe(18);
    expect(leagueSizeFor("Ligue 1", 2029)).toBe(18);
  });
  it("claims no size for a league it has not verified", () => {
    expect(leagueSizeFor("Eredivisie", 2020)).toBeNull();
    expect(leagueSizeFor("MLS", 2020)).toBeNull();
  });
});

describe("eliteInYear", () => {
  it("follows the era tier rules year by year", () => {
    expect(eliteInYear(ELITE, "Man City", 1995)).toBe(false);
    expect(eliteInYear(ELITE, "Man City", 2010)).toBe(false);
    expect(eliteInYear(ELITE, "Man City", 2011)).toBe(true);
    expect(eliteInYear(ELITE, "PSG", 2011)).toBe(false);
    expect(eliteInYear(ELITE, "PSG", 2012)).toBe(true);
    expect(eliteInYear(ELITE, "Liverpool", 2000)).toBe(false);
    expect(eliteInYear(ELITE, "Liverpool", 2001)).toBe(true);
    expect(eliteInYear(ELITE, "Real Madrid", 1990)).toBe(true);
    expect(eliteInYear(ELITE, "Arsenal", 2020)).toBe(false);
  });
});

describe("drawLeagueFinish", () => {
  it("is 1st exactly when the title was won", () => {
    expect(drawLeagueFinish({ ...base, leagueTitle: true })).toEqual({ leagueFinish: 1, leagueSize: 20 });
    expect(drawLeagueFinish({ ...base, league: "Eredivisie", leagueTitle: true })).toEqual({ leagueFinish: 1 });
    for (let i = 0; i < 200; i++) {
      const f = drawLeagueFinish({ ...base, tier: 1 + (i % 5), elite: i % 7 === 0, rating: 5 + (i % 50) / 10, seedKey: `s${i}` });
      expect(f.leagueSize).toBe(20);
      expect(f.leagueFinish).toBeGreaterThanOrEqual(2);
      expect(f.leagueFinish).toBeLessThanOrEqual(20);
    }
  });
  it("gives no finish without a title in a league with no verified size", () => {
    expect(drawLeagueFinish({ ...base, league: "Eredivisie" })).toEqual({});
  });
  it("is the same draw for the same season", () => {
    expect(drawLeagueFinish({ ...base, seedKey: "x" })).toEqual(drawLeagueFinish({ ...base, seedKey: "x" }));
  });
  it("never touches Math.random", () => {
    const real = Math.random;
    let calls = 0;
    Math.random = () => { calls++; return real(); };
    try { drawLeagueFinish({ ...base, tier: 3 }); } finally { Math.random = real; }
    expect(calls).toBe(0);
  });
});

describe("finishBand", () => {
  it("steps down the table tier by tier and stays inside it", () => {
    for (const size of [18, 20, 22]) {
      const mids = [finishBand(1, true, size, 7), ...[1, 2, 3, 4].map(t => finishBand(t, false, size, 7))].map(([lo, hi]) => (lo + hi) / 2);
      for (let i = 1; i < mids.length; i++) expect(mids[i]).toBeGreaterThan(mids[i - 1]);
      for (const r of [5, 7, 8.5]) for (const t of [1, 2, 3, 4, 5]) {
        const [lo, hi] = finishBand(t, false, size, r);
        expect(lo).toBeGreaterThanOrEqual(2);
        expect(hi).toBeLessThanOrEqual(size);
        expect(lo).toBeLessThanOrEqual(hi);
      }
    }
  });
});

describe("readLeagueFinish", () => {
  it("passes a sound row through", () => {
    expect(readLeagueFinish({ leagueFinish: 3, leagueSize: 20, leagueTitle: false })).toEqual({ finish: 3, size: 20 });
    expect(readLeagueFinish({ leagueFinish: 1, leagueTitle: true })).toEqual({ finish: 1, size: null });
  });
  it("reads an old save as no finish", () => {
    expect(readLeagueFinish({ leagueTitle: true })).toBeNull();
    expect(readLeagueFinish({ leagueTitle: false })).toBeNull();
  });
  it("drops a corrupt finish and keeps the rest of the row alone", () => {
    expect(readLeagueFinish({ leagueFinish: "3", leagueSize: 20, leagueTitle: false })).toBeNull();
    expect(readLeagueFinish({ leagueFinish: 2.5, leagueTitle: false })).toBeNull();
    expect(readLeagueFinish({ leagueFinish: 0, leagueTitle: false })).toBeNull();
    expect(readLeagueFinish({ leagueFinish: 21, leagueSize: 20, leagueTitle: false })).toBeNull();
    expect(readLeagueFinish({ leagueFinish: 1, leagueSize: 20, leagueTitle: false })).toBeNull();
    expect(readLeagueFinish({ leagueFinish: 4, leagueSize: 20, leagueTitle: true })).toBeNull();
    expect(readLeagueFinish({ leagueFinish: 4, leagueSize: "x", leagueTitle: false })).toEqual({ finish: 4, size: null });
  });
});

describe("leagueWithArticle", () => {
  it("reads like a sentence", () => {
    expect(["Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1", "MLS", "Eredivisie"].map(leagueWithArticle))
      .toEqual(["the Premier League", "La Liga", "the Bundesliga", "Serie A", "Ligue 1", "MLS", "Eredivisie"]);
  });
  it("Round 1037: the old French name takes no article, the old English ones do", () => {
    expect(["Division 1", "First Division", "Second Division", "Championship"].map(leagueWithArticle))
      .toEqual(["Division 1", "the First Division", "the Second Division", "the Championship"]);
  });
});

describe("ordinal", () => {
  it("reads like a table", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
  });
});

describe("managerLeagueField (Round 1029)", () => {
  const row = (name: string, league: string, country = "England", tier = 2) => ({ id: name, name, country, tier, color: "#000", league });
  const PL = Array.from({ length: 21 }, (_, i) => row(`PL Club ${i + 1}`, "Premier League"));
  const CLUBS = [
    row("Arsenal", "Premier League", "England", 1), row("Man City", "Premier League", "England", 1), ...PL,
    row("Boca Juniors", "Liga Profesional", "Argentina", 1), row("Flamengo", "Brasileirao", "Brazil", 1),
    row("Norwich City", "Championship", "England", 4), row("Swansea City", "Championship", "Wales", 4),
    row("Red Bull Salzburg", "Austrian Bundesliga", "Austria", 3), row("Sturm Graz", "Austrian Bundesliga", "Austria", 4),
    row("Bayern Munich", "Bundesliga", "Germany", 1), row("Dortmund", "Bundesliga", "Germany", 2),
  ];
  const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };

  it("names only clubs of his own league, at its verified size", () => {
    const f = managerLeagueField({ clubs: CLUBS, club: "Arsenal", year: 2030 }, seq(0.3, 0.7, 0.1));
    expect(f.league).toBe("Premier League");
    expect(f.size).toBe(20);
    expect(f.sizeVerified).toBe(true);
    expect(f.named).toHaveLength(19);
    expect(f.named).not.toContain("Arsenal");
    for (const n of f.named) expect(CLUBS.find(c => c.name === n)?.league).toBe("Premier League");
  });

  it("finds his club under the other game's spelling and never names it twice", () => {
    const f = managerLeagueField({ clubs: CLUBS, club: "Manchester City", league: "Premier League", year: 2030 }, seq(0.5));
    expect(f.league).toBe("Premier League");
    expect(f.named).not.toContain("Man City");
    expect(f.named).toHaveLength(19);
    const old = managerLeagueField({ clubs: CLUBS, club: "Manchester City", year: 2030 }, seq(0.5));
    expect(old.league).toBe("Premier League");
    expect(old.named).not.toContain("Man City");
  });

  it("plays the league the job came with, in the list's spelling, over the list's own row", () => {
    const f = managerLeagueField({ clubs: CLUBS, club: "Manchester City", league: "EFL Championship", year: 2030 }, seq(0.5));
    expect(f.league).toBe("Championship");
    expect(f.named).toEqual(["Norwich City", "Swansea City"]);
    const more = [...CLUBS, row("Nacional", "Primera Division Uruguay", "Uruguay"), row("Penarol", "Primera Division Uruguay", "Uruguay"),
      row("Benfica", "Primeira Liga", "Portugal"), row("Toronto FC", "MLS", "Canada"), row("Hajduk Split", "HNL", "Croatia")];
    const nacional = managerLeagueField({ clubs: more, club: "Nacional", league: "Primeira Liga", year: 2030 }, seq(0.5));
    expect(nacional.league).toBe("Primeira Liga");
    expect(nacional.named).toEqual(["Benfica"]);
    expect(managerLeagueField({ clubs: more, club: "Inter Miami", league: "MLS Eastern Conference", year: 2030 }, seq(0.5)).named).toEqual(["Toronto FC"]);
    expect(managerLeagueField({ clubs: more, club: "Rijeka", league: "SuperSport HNL", year: 2030 }, seq(0.5)).league).toBe("HNL");
    expect(listLeague(more, "Brasileirão Série A")).toBe("Brasileirao");
    expect(listLeague(more, "2. Bundesliga")).toBeNull();
  });

  it("plays every club it knows of a league without a verified size, plus his own", () => {
    const big = [...CLUBS, ...Array.from({ length: 22 }, (_, i) => row(`BR ${i}`, "Brasileirao", "Brazil"))];
    const f = managerLeagueField({ clubs: big, club: "BR 0", year: 2030 }, seq(0.5));
    expect(f.sizeVerified).toBe(false);
    expect(f.named).toHaveLength(22);
    expect(f.size).toBe(23);
  });

  it("keeps a market job's league and drops any name that could be his own club", () => {
    const f = managerLeagueField({ clubs: CLUBS, club: "RB Salzburg", league: "Austrian Bundesliga", year: 2030 }, seq(0.5));
    expect(f.league).toBe("Austrian Bundesliga");
    expect(f.named).toEqual(["Sturm Graz"]);
    expect(f.sizeVerified).toBe(false);
    expect(f.size).toBe(MANAGER_FIELD);
  });

  it("matches a league by name across a border", () => {
    const f = managerLeagueField({ clubs: CLUBS, club: "Swansea City", year: 2030 }, seq(0.5));
    expect(f.league).toBe("Championship");
    expect(f.named).toEqual(["Norwich City"]);
    expect([f.size, f.sizeVerified]).toEqual([24, true]);
  });

  it("knows the Championship's size for the dugout only, from 2004", () => {
    expect(leagueSizeFor("Championship", 2030)).toBeNull();
    /* Round 1037: the second tier before 2004 answers from the league
       ledgers now (24 clubs every season from 1990-91) */
    expect(leagueSizeFor("Championship", 2003, true)).toBe(24);
    expect(leagueSizeFor("Championship", 1989, true)).toBeNull();
    expect(leagueSizeFor("Championship", 2004, true)).toBe(24);
    expect(leagueSizeFor("Premier League", 2030, true)).toBe(20);
  });

  it("moves division only between the Premier League and the Championship", () => {
    const pl = Array.from({ length: 20 }, (_, i) => divisionMove("Premier League", i + 1, 20, 2030)?.to ?? null);
    expect(pl).toEqual([...Array(17).fill(null), "Championship", "Championship", "Championship"]);
    const ch = Array.from({ length: 24 }, (_, i) => divisionMove("Championship", i + 1, 24, 2030)?.to ?? null);
    expect(ch).toEqual(["Premier League", "Premier League", ...Array(22).fill(null)]);
    expect(divisionMove("Championship", 1, 24, 2030)?.up).toBe(true);
    expect(divisionMove("Premier League", 20, 20, 2030)?.up).toBe(false);
    expect([divisionMove("La Liga", 20, 20, 2030), divisionMove("La Liga", 1, 20, 2030), divisionMove(null, 20, 20, 2030)]).toEqual([null, null, null]);
  });

  it("moves division only from 2004/05, when the Championship got its name", () => {
    const down = (y: number) => divisionMove("Premier League", 20, 20, y)?.to ?? null;
    const up = (y: number) => divisionMove("Championship", 1, 24, y)?.to ?? null;
    expect([down(1997), down(2003), down(2004), down(2026)]).toEqual([null, null, "Championship", "Championship"]);
    expect([up(1999), up(2003), up(2004), up(2040)]).toEqual([null, null, "Premier League", "Premier League"]);
  });

  it("says where he finished without a position, at every place of a 20 field", () => {
    const zones = Array.from({ length: 20 }, (_, i) => finishZone(i + 1, 20));
    expect(zones).toEqual(["top of the table", "second", ...Array(8).fill("in the top half"),
      ...Array(7).fill("in the bottom half"), ...Array(3).fill("in the bottom three")]);
  });

  it("walks the verified size into a manager's table, step by step", () => {
    const at = (y: number) => managerLeagueField({ clubs: CLUBS, club: "Bayern Munich", year: y }, seq(0.5)).size;
    expect([at(1990), at(1991), at(1992), at(2030)]).toEqual([18, 20, 18, 18]);
    expect(managerLeagueField({ clubs: CLUBS, club: "Bayern Munich", year: 2030 }, seq(0.5)).named).toEqual(["Dortmund"]);
  });

  it("names a past season of a ledger league from the ledgers, never today's clubs", () => {
    const at = (y: number) => managerLeagueField({ clubs: CLUBS, club: "Bayern Munich", year: y }, seq(0.5));
    expect(LIST_SEASON).toBe(2026);
    /* Round 1037 (this pin moved from Round 1029's "names nobody"): before
       2026-27 the Bundesliga's table is that season's real one, Bayern in
       its own seat, the rest named only where the career world knows them */
    for (const y of [1990, 2012, 2025]) {
      const f = at(y);
      const real = CAREER_LEAGUE_SEASONS["Bundesliga"][y];
      expect([f.league, f.leagueName, f.size, f.sizeVerified, f.lineupUnknown]).toEqual(["Bundesliga", "Bundesliga", real.size, true, false]);
      expect(f.named).not.toContain("Bayern Munich");
      expect(f.named.length).toBe(real.clubs.length - 1);
      for (const n of f.named) expect(real.clubs).toContain(n);
    }
    expect([2026, 2030].map(y => at(y).named)).toEqual([["Dortmund"], ["Dortmund"]]);
    expect(at(2026).lineupUnknown).toBe(false);
    /* a past season of a league the ledgers do not hold still draws from the
       rng exactly as a later one does (Round 1029), so the races the table
       settles do not move; a ledger season draws nothing, its field is fixed */
    const big = Array.from({ length: 30 }, (_, i) => row(`NL ${i}`, "Eredivisie", "Netherlands"));
    const calls = (clubs: typeof big, club: string, y: number) => { let n = 0; managerLeagueField({ clubs, club, year: y }, () => { n += 1; return 0.5; }); return n; };
    expect(calls(big, "NL 0", 2012)).toBe(calls(big, "NL 0", 2030));
    const pl = Array.from({ length: 30 }, (_, i) => row(`PL ${i}`, "Premier League", "England"));
    expect(calls(pl, "PL 0", 2030)).toBeGreaterThan(0);
    expect(calls(pl, "PL 0", 2012)).toBe(0);
  });

  it("seats a club the ledgers had elsewhere in a real member's place", () => {
    /* Wolves were in the Championship in 2012-13: a game that has them in
       the Premier League gives them one real member's seat */
    const f = managerLeagueField({ clubs: CLUBS, club: "Wolves", league: "Premier League", year: 2012 }, seq(0.5));
    const real = CAREER_LEAGUE_SEASONS["Premier League"][2012];
    expect([f.league, f.size, f.sizeVerified]).toEqual(["Premier League", real.size, true]);
    expect(f.named).not.toContain("Wolves");
    expect(real.clubs.length - f.named.length).toBeLessThanOrEqual(1);
    for (const n of f.named) expect(real.clubs).toContain(n);
    /* promoted by the game from the Championship, he takes the seat of a
       club that really came up from the Championship that season */
    const up = managerLeagueField({ clubs: CLUBS, club: "Wolves", league: "Premier League", year: 2012, from: "Championship" }, seq(0.5));
    const promoted = real.clubs.filter(n => CAREER_LEAGUE_SEASONS["Championship"][2011].clubs.includes(n));
    const gone = real.clubs.filter(n => !up.named.includes(n));
    if (gone.length === 1) expect(promoted).toContain(gone[0]);
  });

  it("never seats a club by today's label alone: a job's first past season follows the ledgers", () => {
    /* a job at Wolves for 2012-13 under a Premier League label is played in
       the Championship they were really in */
    const w = managerLeagueField({ clubs: CLUBS, club: "Wolves", league: "Premier League", year: 2012, placed: false }, seq(0.5));
    expect([w.league, w.size, w.sizeVerified, w.lineupUnknown]).toEqual(["Championship", CAREER_LEAGUE_SEASONS["Championship"][2012].size, true, false]);
    /* Brentford were in none of the six in 2005-06: no league, nobody named,
       no verified size, whatever the label says */
    const b = managerLeagueField({ clubs: CLUBS, club: "Brentford", league: "Premier League", year: 2005, placed: false }, seq(0.5));
    expect(b).toEqual({ league: null, size: MANAGER_FIELD, sizeVerified: false, named: [], lineupUnknown: true });
    /* from 2026-27 the label is the league, as before */
    expect(managerLeagueField({ clubs: CLUBS, club: "Brentford", league: "Premier League", year: 2030, placed: false }, seq(0.5)).league).toBe("Premier League");
  });

  it("flags a past season in a league it holds even when it knows no other club there", () => {
    const solo = [...CLUBS, row("Lone FC", "Allsvenskan", "Sweden", 3)];
    const at = (y: number) => managerLeagueField({ clubs: solo, club: "Lone FC", year: y }, seq(0.5));
    expect([at(2012).league, at(2012).named, at(2012).lineupUnknown]).toEqual(["Allsvenskan", [], true]);
    expect(at(2026).lineupUnknown).toBe(false);
  });

  it("names nobody when nothing names the league", () => {
    const f = managerLeagueField({ clubs: CLUBS, club: "Unknown FC", year: 2030 }, seq(0.5));
    expect(f).toEqual({ league: null, size: MANAGER_FIELD, sizeVerified: false, named: [], lineupUnknown: false });
    expect(managerLeagueField({ clubs: CLUBS, club: "Unknown FC", year: 2012 }, seq(0.5)).lineupUnknown).toBe(false);
  });

  it("draws which known clubs fill a full table from the rng, and only then", () => {
    const a = managerLeagueField({ clubs: CLUBS, club: "Arsenal", year: 2030 }, seq(0.1, 0.9, 0.4));
    const b = managerLeagueField({ clubs: CLUBS, club: "Arsenal", year: 2030 }, seq(0.1, 0.9, 0.4));
    expect(a.named).toEqual(b.named);
    let calls = 0;
    managerLeagueField({ clubs: CLUBS, club: "Norwich City", year: 2030 }, () => { calls += 1; return 0.5; });
    expect(calls).toBe(0);
  });
});

describe("dugoutTableWords (Round 1029)", () => {
  const blank = (pos: number) => ({ club: "", pts: 90 - pos * 3, pos, unnamed: true });
  const me = { club: "Swansea City", pts: 70, pos: 6, you: true };
  const table = [blank(1), blank(2), blank(3), blank(4), me];

  it("names the league from 2026-27 on", () => {
    const w = dugoutTableWords({ league: "Championship", sizeVerified: true, leagueSize: 24, knownRivals: 0, table });
    expect(w.header).toBe("Final table · Championship");
    expect(w.note).toBe("We don't know enough Championship clubs by name to draw the table. You finished 6th of 24 on 70 points.");
  });

  it("names no league over or under a past season's table", () => {
    const past = dugoutTableWords({ league: "Championship", sizeVerified: true, leagueSize: 24, knownRivals: 0, lineupUnknown: true, table });
    expect(past.header).toBe("Final table");
    expect(past.note).toBe("We don't know who was in the league that year, so the rest of the field is counted, not named. You finished 6th of 24 on 70 points.");
    const zone = dugoutTableWords({ league: "Allsvenskan", leagueSize: 20, knownRivals: 0, lineupUnknown: true, table });
    expect([zone.header, zone.sizeUnknown]).toEqual(["Final table", true]);
    expect(zone.note).toBe("We don't know who was in the league that year, so the rest of the field is counted, not named. You finished in the top half.");
    for (const w of [past, zone]) expect(`${w.header} ${w.note} ${w.orderNote}`).not.toMatch(/Championship|Allsvenskan/);
  });

  it("keeps an old save's table and its order note", () => {
    const old = dugoutTableWords({ leagueSize: 20, table: [{ club: "Ajax", pts: 80, pos: 1 }, me] });
    expect([old.header, old.named, old.sizeUnknown, old.note, old.orderNote]).toEqual(["Final table", true, false, null, null]);
    const mls = dugoutTableWords({ league: "MLS", leagueSize: 30, knownRivals: 12, table });
    expect(mls.orderNote).toBe("The order only: we don't know how many clubs the MLS has.");
  });
});
