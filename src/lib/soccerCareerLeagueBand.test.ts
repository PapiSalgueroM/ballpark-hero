/* Round 1100: finishBand and drawLeagueFinish held to what main answered
   before the round, byte for byte, over a cross recorded on the untouched
   tree (scripts/data/careerLeagueFinish1100.json, written by
   RECORD=main node scripts/simCareerLeagueWorld.mjs; the shape is in its
   note). Every row of the cross is held here. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { drawLeagueFinish, finishBand } from "./soccerCareerLeague";

interface Cross {
  years: number[];
  ratings: number[];
  tiers: [number, boolean][];
  keys: string[];
  leagues: [string | null, string][];
  pairs: [number, number, number, string, string][];
}
const cross = JSON.parse(readFileSync(path.join(process.cwd(), "scripts", "data", "careerLeagueFinish1100.json"), "utf8")) as Cross;
const keyOf = (kind: string, club: string, year: number, rating: number) => (kind === "engine" ? `Probe|${club}|${year}|30|7|4|${rating}` : kind);

/** Walks one pair in the recorder's own order and returns the rows that no
 *  longer answer as recorded. */
function mismatches(pair: Cross["pairs"][number]): string[] {
  const [li, yi, size, bands, fins] = pair;
  const [league, club] = cross.leagues[li];
  const year = cross.years[yi];
  const out: string[] = [];
  let b = 0;
  let f = 0;
  for (const [tier, elite] of cross.tiers) for (const rating of cross.ratings) {
    if (size) {
      const want = [parseInt(bands[b], 36), parseInt(bands[b + 1], 36)];
      b += 2;
      const got = finishBand(tier, elite, size, rating);
      if (got[0] !== want[0] || got[1] !== want[1]) out.push(`finishBand(${tier}, ${elite}, ${size}, ${rating}) = ${got}, recorded ${want}`);
    }
    for (const leagueTitle of [false, true]) for (const kind of cross.keys) {
      const finish = parseInt(fins[f], 36);
      f += 1;
      const want = finish === 0 ? {} : { leagueFinish: finish, ...(size ? { leagueSize: size } : {}) };
      const got = drawLeagueFinish({ league, year, tier, elite, rating, leagueTitle, seedKey: keyOf(kind, club, year, rating) });
      if (JSON.stringify(got) !== JSON.stringify(want)) out.push(`${league} ${year} t${tier}${elite ? " elite" : ""} ${rating}${leagueTitle ? " title" : ""} ${kind}: ${JSON.stringify(got)}, recorded ${JSON.stringify(want)}`);
    }
  }
  if (f !== fins.length || b !== bands.length) out.push(`${league} ${year}: the recorded strings are not the cross's length`);
  return out;
}

describe("the league finish against main's recorded answers (Round 1100)", () => {
  it("holds the whole cross and none of its groups is empty", () => {
    expect(cross.pairs.length).toBe(cross.leagues.length * cross.years.length);
    const sized = cross.pairs.filter(p => p[2] > 0).length;
    expect(sized).toBeGreaterThan(0);
    expect(cross.pairs.length - sized).toBeGreaterThan(0);
  });

  it("answers every recorded row exactly as main did", () => {
    const bad: string[] = [];
    let rows = 0;
    for (const pair of cross.pairs) {
      rows += pair[4].length;
      for (const m of mismatches(pair)) if (bad.length < 8) bad.push(m);
    }
    expect(rows).toBe(cross.pairs.length * 180);
    expect(bad).toEqual([]);
  });
});
