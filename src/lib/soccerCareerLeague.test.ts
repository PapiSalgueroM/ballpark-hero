import { describe, expect, it } from "vitest";
import { drawLeagueFinish, eliteInYear, finishBand, leagueSizeFor, leagueWithArticle, managerLeagueField, MANAGER_FIELD, ordinal, readLeagueFinish } from "./soccerCareerLeague";

const ELITE = ["Bayern Munich", "PSG", "Man City", "Real Madrid", "Barcelona", "Liverpool"];
const base = { league: "La Liga", year: 2020, tier: 1, elite: false, rating: 7, leagueTitle: false, seedKey: "k" };

describe("leagueSizeFor", () => {
  it("walks every window boundary of the verified table", () => {
    expect(leagueSizeFor("Premier League", 1991)).toBeNull();
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
    const f = managerLeagueField({ clubs: CLUBS, club: "Manchester City", league: "EFL Championship", year: 2030 }, seq(0.5));
    expect(f.league).toBe("Premier League");
    expect(f.named).not.toContain("Man City");
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
  });

  it("walks the verified size into a manager's table, step by step", () => {
    const at = (y: number) => managerLeagueField({ clubs: CLUBS, club: "Bayern Munich", year: y }, seq(0.5)).size;
    expect([at(1990), at(1991), at(1992), at(2030)]).toEqual([18, 20, 18, 18]);
    expect(managerLeagueField({ clubs: CLUBS, club: "Bayern Munich", year: 1990 }, seq(0.5)).named).toEqual(["Dortmund"]);
  });

  it("names nobody when nothing names the league", () => {
    const f = managerLeagueField({ clubs: CLUBS, club: "Unknown FC", year: 2030 }, seq(0.5));
    expect(f).toEqual({ league: null, size: MANAGER_FIELD, sizeVerified: false, named: [] });
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
