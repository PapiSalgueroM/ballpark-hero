import { describe, expect, it } from "vitest";
import { clubLedgerSeason, ledgerLeague, leagueInYear, leagueSizeFor, LIST_SEASON, seasonSpan } from "./soccerCareerLeague";
import { CAREER_LEAGUE_SEASONS } from "../data/careerLeagueSeasons";

/* Round 1037: the league a club was in, season by season. Every fact below
   is one the Round 1036 ledgers hold (scripts/data/leagueSeasons/). */
const club = (name: string, league: string) => ({ name, league });

describe("leagueInYear", () => {
  it("answers the ledgers before LIST_SEASON, under the name the league carried that season", () => {
    expect(leagueInYear(club("West Ham", "Championship"), 2010)).toBe("Premier League");
    expect(leagueInYear(club("West Ham", "Championship"), 2011)).toBe("Championship");
    expect(leagueInYear(club("West Ham", "Championship"), 2012)).toBe("Premier League");
    expect(leagueInYear(club("Man City", "Premier League"), 1990)).toBe("First Division");
    expect(leagueInYear(club("Man City", "Premier League"), 1997)).toBe("First Division");
    expect(leagueInYear(club("Wolves", "Championship"), 2004)).toBe("Championship");
    expect(leagueInYear(club("Hertha Berlin", "2. Bundesliga"), 2011)).toBe("Bundesliga");
    expect(leagueInYear(club("Nantes", "Ligue 2"), 2024)).toBe("Ligue 1");
  });
  it("names no league in a season the club was in none of the six", () => {
    expect(leagueInYear(club("Man City", "Premier League"), 1998)).toBeNull();
    expect(leagueInYear(club("Juventus", "Serie A"), 2006)).toBeNull();
    expect(leagueInYear(club("Hertha Berlin", "2. Bundesliga"), 2012)).toBeNull();
    expect(leagueInYear(club("Ajax", "Eredivisie"), 2010)).toBeNull();
    expect(leagueInYear(club("Boca Juniors", "Liga Profesional"), 2025)).toBeNull();
  });
  it("names nothing for a season the ledgers do not reach", () => {
    expect(leagueInYear(club("Arsenal", "Premier League"), 1989)).toBeNull();
  });
  it("keeps today's label from LIST_SEASON on, exactly as before", () => {
    expect(LIST_SEASON).toBe(2026);
    expect(leagueInYear(club("West Ham", "Championship"), 2026)).toBe("Championship");
    expect(leagueInYear(club("Ajax", "Eredivisie"), 2031)).toBe("Eredivisie");
    expect(leagueInYear(club("Arsenal", "Premier League"), 2026)).toBe("Premier League");
  });
  it("finds a club under the market's spelling", () => {
    expect(leagueInYear(club("Manchester City", "Premier League"), 1999)).toBe("First Division");
    expect(clubLedgerSeason("Hertha BSC", 2011)?.key).toBe("Bundesliga");
  });
});

describe("clubLedgerSeason and ledgerLeague", () => {
  it("carry the season's key, name, verified size and known clubs", () => {
    const s = clubLedgerSeason("Man City", 1997);
    expect(s && [s.key, s.name, s.size]).toEqual(["Championship", "First Division", 24]);
    expect(s?.clubs).toContain("Man City");
    expect(ledgerLeague("Premier League", 1991)?.size).toBe(22);
    expect(ledgerLeague("Premier League", 2026)).toBeNull();
    expect(ledgerLeague("Eredivisie", 2010)).toBeNull();
  });
  it("hold every club the ledgers name, in exactly one league a season", () => {
    const wrong: string[] = [];
    let checked = 0;
    for (const [key, years] of Object.entries(CAREER_LEAGUE_SEASONS)) {
      for (const [y, season] of Object.entries(years)) {
        if (season.clubs.length > season.size) wrong.push(`${key} ${y}: more names than places`);
        for (const name of season.clubs) {
          checked += 1;
          const got = clubLedgerSeason(name, Number(y))?.key;
          if (got !== key) wrong.push(`${name} ${y}: ${got} for ${key}`);
        }
      }
    }
    expect(wrong).toEqual([]);
    expect(checked).toBeGreaterThan(1000);
  });
  it("size every ledger season from the ledger", () => {
    expect(leagueSizeFor("Championship", 1995)).toBe(24);
    expect(leagueSizeFor("Championship", 2026)).toBeNull();
    expect(leagueSizeFor("Championship", 2026, true)).toBe(24);
  });
});

describe("seasonSpan", () => {
  it("prints a season the way the ledgers do", () => {
    expect(seasonSpan(2009)).toBe("2009-10");
    expect(seasonSpan(1999)).toBe("1999-00");
  });
});
