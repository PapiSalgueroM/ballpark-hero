import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FALLBACK_CLUBS } from "../lib/soccerCareerEngine";
import { CAREER_POOL_SINCE } from "../data/soccerCareerClubPool";
import { clubLedgerSeason, leagueInYear, leagueKeyInYear } from "../lib/soccerCareerLeague";

const NAMES = [
  "Real Oviedo", "Mallorca", "Eibar", "Castellon", "Almeria", "Burgos", "Sabadell",
  "Sporting Gijon", "Granada", "Las Palmas", "Tenerife", "Leganes", "Valladolid",
  "Cordoba", "Eldense", "Cadiz", "FC Andorra", "Ceuta", "Albacete",
] as const;

// Literal cases from the unchanged La Liga source ledger's canon:null rows.
// These do not assert that the current clubs never existed in those years.
const UNRESOLVED: readonly { name: string; years: readonly number[] }[] = [
  { name: "Real Oviedo", years: [1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2025] },
  { name: "Mallorca", years: [1990, 1991, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2019, 2021, 2022, 2023, 2024, 2025] },
  { name: "Eibar", years: [2014, 2015, 2016, 2017, 2018, 2019, 2020] },
  { name: "Castellon", years: [1990] },
  { name: "Almeria", years: [2007, 2008, 2009, 2010, 2013, 2014, 2022, 2023] },
  { name: "Burgos", years: [1990, 1991, 1992] },
  { name: "Sporting Gijon", years: [1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 2008, 2009, 2010, 2011, 2015, 2016] },
  { name: "Granada", years: [2011, 2012, 2013, 2014, 2015, 2016, 2019, 2020, 2021, 2023] },
  { name: "Las Palmas", years: [2000, 2001, 2015, 2016, 2017, 2023, 2024] },
  { name: "Tenerife", years: [1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 2001, 2009] },
  { name: "Leganes", years: [2016, 2017, 2018, 2019, 2024] },
  { name: "Cordoba", years: [2014] },
  { name: "Cadiz", years: [1990, 1991, 1992, 2005, 2020, 2021, 2022, 2023] },
  { name: "Albacete", years: [1991, 1992, 1993, 1994, 1995, 2003, 2004] },
];

function retain(file: string, value: unknown): void {
  const dir = process.env.SC_SEGUNDA_IDENTITY_EVIDENCE;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, file + ".json"), JSON.stringify(value, null, 2) + "\n");
}
function answer(name: string, year: number) {
  const club = { name, league: "Segunda Division" };
  return { name, year, label: leagueInYear(club, year), key: leagueKeyInYear(club, year), member: clubLedgerSeason(name, year) };
}

describe("Segunda historical identity boundary", () => {
  it("refuses the current Burgos profile's three unresolved historical aliases", () => {
    const rows = [1990, 1991, 1992].map(year => answer("Burgos", year));
    retain("burgos", { marker: "SC_SEGUNDA_IDENTITY_BURGOS", rows });
    expect(rows.map(r => [r.label, r.key, r.member]), "SC_SEGUNDA_IDENTITY_BURGOS").toEqual([
      [null, null, null], [null, null, null], [null, null, null],
    ]);
  });

  it("refuses all 118 unresolved pre-2026 matches for the added canonical profiles", () => {
    const rows = UNRESOLVED.flatMap(c => c.years.map(year => answer(c.name, year)));
    const profiles = NAMES.map(name => FALLBACK_CLUBS.find(c => c.name === name) ?? null);
    const wrong = rows.filter(r => r.label !== null || r.key !== null || r.member !== null);
    retain("unresolved", { marker: "SC_SEGUNDA_IDENTITY_UNRESOLVED", profiles, cases: UNRESOLVED, rows, wrong });
    expect(rows.length).toBe(118);
    expect(wrong, "SC_SEGUNDA_IDENTITY_UNRESOLVED").toEqual([]);
  });

  it("keeps verified historical canon and the distinct Real Burgos source identity", () => {
    const queries = [["Lazio", 1990], ["Girona", 2017], ["Manchester City", 1999], ["Real Burgos", 1990]] as const;
    const rows = queries.map(([name, year]) => answer(name, year));
    retain("known-canon", { marker: "SC_SEGUNDA_IDENTITY_KNOWN", rows });
    expect(rows.map(r => [r.member?.key, r.member?.canon])).toEqual([
      ["Serie A", "Lazio"], ["La Liga", "Girona"], ["Championship", "Man City"], ["La Liga", null],
    ]);
  });

  it("keeps all nineteen real profiles and their modern 2026 labels", () => {
    const rows = NAMES.map(name => ({
      profile: FALLBACK_CLUBS.find(c => c.name === name) ?? null,
      since: CAREER_POOL_SINCE[name],
      answer: answer(name, 2026),
    }));
    retain("modern", { marker: "SC_SEGUNDA_IDENTITY_MODERN", rows });
    expect(rows.map(r => [r.profile?.name, r.profile?.league, r.since, r.answer.label, r.answer.key, r.answer.member])).toEqual(
      NAMES.map(name => [name, "Segunda Division", 2026, "Segunda Division", "Segunda Division", null]),
    );
  });

  it("keeps unrelated unnamed manager-own identities readable", () => {
    const rows = [answer("Luton Town", 2023), answer("Wimbledon", 1990)];
    retain("neutral", { marker: "SC_SEGUNDA_IDENTITY_NEUTRAL", rows });
    expect(rows.map(r => [r.member?.key, r.member?.canon])).toEqual([
      ["Premier League", null], ["Premier League", null],
    ]);
  });
});
