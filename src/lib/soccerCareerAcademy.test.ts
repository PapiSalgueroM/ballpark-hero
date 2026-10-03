import { describe, it, expect, vi, afterEach } from "vitest";
import {
  ACADEMY_FOCUS_BONUS, ACADEMY_FOCUS_NEAR, academyFocusOptions, academyFocusOf, academyFocusBonus,
  withAcademyFocus, applyAcademyFocus, buildAcademyReport, academyFocusResultLine, ACADEMY_CUP_STAGES,
} from "./soccerCareerAcademy";

const STATS = { pace: 60, shooting: 55, passing: 58, dribbling: 61, defending: 40, physical: 57, reflexes: 30 };
const save = (over: Record<string, unknown> = {}) => ({
  ...STATS, position: "ST", overall: 55, playerName: "Test Kid", age: 16, currentClub: "Somewhere Youth",
  seasons: [{ year: 2020, apps: 0, goals: 0, assists: 0, cleanSheets: 0, type: "youth" }],
  ...over,
});

afterEach(() => vi.restoreAllMocks());

describe("academy focus options", () => {
  it("offers the six outfield families and the seven keeper ones", () => {
    expect(academyFocusOptions("ST").map(o => o.key)).toEqual(["pace", "shooting", "passing", "dribbling", "defending", "physical"]);
    expect(academyFocusOptions("GK")).toHaveLength(7);
    expect(academyFocusOptions("GK").map(o => o.key)).toContain("reflexes");
  });

  it("reads a corrupt or foreign focus as no focus", () => {
    expect(academyFocusOf({ position: "ST", academyFocus: "shooting" })).toBe("shooting");
    expect(academyFocusOf({ position: "ST", academyFocus: "reflexes" })).toBeNull();
    expect(academyFocusOf({ position: "ST", academyFocus: "banana" })).toBeNull();
    expect(academyFocusOf({ position: "ST", academyFocus: 7 })).toBeNull();
    expect(academyFocusOf({ position: "ST" })).toBeNull();
  });
});

describe("the ceiling ladder", () => {
  it("walks every step: 2 well short, 1 within the margin, 0 on or past the ceiling", () => {
    const pot = 80;
    for (let ovr = pot - 10; ovr <= pot + 3; ovr++) {
      const want = ovr >= pot ? 0 : ovr >= pot - ACADEMY_FOCUS_NEAR ? 1 : ACADEMY_FOCUS_BONUS;
      expect(academyFocusBonus(ovr, pot)).toBe(want);
    }
    expect(academyFocusBonus(70, 80)).toBe(2);
    expect(academyFocusBonus(77, 80)).toBe(1);
    expect(academyFocusBonus(80, 80)).toBe(0);
  });
});

describe("picking and clearing", () => {
  it("clearing leaves the same save as never picking, and never mutates", () => {
    const base = save();
    const picked = withAcademyFocus(base, "passing");
    expect((picked as { academyFocus?: string }).academyFocus).toBe("passing");
    expect("academyFocus" in base).toBe(false);
    expect(JSON.stringify(withAcademyFocus(picked, null))).toBe(JSON.stringify(base));
  });
});

describe("applying the focus", () => {
  it("with no focus returns 0 and writes nothing", () => {
    const s = save();
    const was = JSON.stringify(s);
    expect(applyAcademyFocus(s, 80)).toBe(0);
    expect(JSON.stringify(s)).toBe(was);
  });

  it("moves only the focused stat, by the ladder, for every family", () => {
    for (const pos of ["ST", "GK"]) {
      for (const { key } of academyFocusOptions(pos)) {
        for (const [ovr, pot] of [[55, 80], [78, 80], [80, 80]] as const) {
          const s = withAcademyFocus(save({ position: pos, overall: ovr }), key);
          const before = { ...s };
          const added = applyAcademyFocus(s, pot);
          expect(added).toBe(academyFocusBonus(ovr, pot));
          for (const k of Object.keys(STATS) as (keyof typeof STATS)[]) {
            expect(s[k]).toBe(before[k] + (k === key ? added : 0));
          }
          expect(s.academyFocusAdded).toBe(added);
        }
      }
    }
  });

  it("never takes a stat past 99", () => {
    const s = withAcademyFocus(save({ shooting: 98 }), "shooting");
    expect(applyAcademyFocus(s, 99)).toBe(1);
    expect(s.shooting).toBe(99);
  });
});

describe("the report", () => {
  const before = withAcademyFocus(save(), "dribbling");
  const after = {
    ...before, age: 17, overall: 57, pace: 62, shooting: 57, passing: 59, dribbling: 65, defending: 41, physical: 59,
    academyFocusAdded: 2,
    seasons: [...before.seasons, { year: 2021, apps: 18, goals: 4, assists: 2, cleanSheets: 0, type: "youth" }],
  };

  it("reads what grew off the two saves and draws nothing", () => {
    const spy = vi.spyOn(Math, "random");
    const r = buildAcademyReport(before, after, 80)!;
    expect(spy).not.toHaveBeenCalled();
    expect(r.lines.find(l => l.key === "dribbling")).toMatchObject({ before: 61, after: 65, delta: 4, focus: true });
    expect(r.lines.filter(l => l.focus)).toHaveLength(1);
    expect(r.focus).toMatchObject({ key: "dribbling", added: 2, maxed: false });
    expect(r.overallBefore).toBe(55);
    expect(r.overallAfter).toBe(57);
    expect(r.apps).toBe(18);
    expect(ACADEMY_CUP_STAGES).toContain(r.cupLine);
    expect(r.verdict).toMatch(/^Your academy coach /);
  });

  it("is the same every time and refuses a stale pair", () => {
    expect(buildAcademyReport(before, after, 80)).toEqual(buildAcademyReport(before, after, 80));
    expect(buildAcademyReport(after, after, 80)).toBeNull();
  });

  it("prints what the focus really added", () => {
    expect(academyFocusResultLine({ label: "Dribbling", added: 2, maxed: false })).toContain("+2");
    expect(academyFocusResultLine({ label: "Dribbling", added: 1, maxed: false })).toContain("close to your ceiling");
    expect(academyFocusResultLine({ label: "Dribbling", added: 1, maxed: true })).toContain("took it to 99");
    expect(academyFocusResultLine({ label: "Dribbling", added: 0, maxed: false })).toContain("ceiling");
    expect(academyFocusResultLine({ label: "Dribbling", added: 0, maxed: true })).toContain("99");
  });

  it("starts the overall line from what the skills were worth, not the saved number", () => {
    /* A created career saves the average of all seven stats; the game's
       overall weighs six for an outfielder. These skills are worth 55. */
    const r = buildAcademyReport({ ...before, overall: 50 }, after, 80)!;
    expect(r.overallBefore).toBe(55);
    expect(r.overallAfter).toBe(57);
  });
});

describe("the coach's verdict", () => {
  const KEYS = ["pace", "shooting", "passing", "dribbling", "defending", "physical"] as const;
  /* One academy year where every skill grew by `per`, the focus (if any)
     adding `added` on top of its own. */
  const year = (per: number, focus: (typeof KEYS)[number] | null = null, added = 0, ceiling = 90) => {
    const start = withAcademyFocus(save(), focus);
    const grown: Record<string, number> = {};
    for (const k of KEYS) grown[k] = STATS[k] + per + (k === focus ? added : 0);
    const end = {
      ...start, ...grown, age: 17, overall: Math.round(KEYS.reduce((sum, k) => sum + grown[k], 0) / 6),
      ...(focus ? { academyFocusAdded: added } : {}),
      seasons: [...start.seasons, { year: 2021, apps: 18, goals: 4, assists: 2, cleanSheets: 0, type: "youth" }],
    };
    return buildAcademyReport(start, end, ceiling)!.verdict;
  };
  const TIERS: [string, RegExp][] = [
    ["big", /biggest jump|huge year/], ["solid", /happy with it|good, honest year/],
    ["quiet", /quiet year|coasted/], ["flat", /flat year|barely moved/],
  ];
  const tierOf = (v: string) => TIERS.find(([, re]) => re.test(v))?.[0];

  it("reads every tier off the year's growth per skill", () => {
    expect(tierOf(year(5))).toBe("big");
    expect(tierOf(year(4))).toBe("solid");
    expect(tierOf(year(3))).toBe("quiet");
    expect(tierOf(year(2))).toBe("flat");
  });

  it("is not moved by the focus, at any rung", () => {
    for (const per of [2, 3, 4, 5]) {
      for (const k of KEYS) {
        for (const added of [0, 1, 2]) expect(year(per, k, added)).toBe(year(per));
      }
    }
  });

  it("reads flat near the ceiling off the year alone, never off the focus", () => {
    /* +2 a skill leaves these skills worth 57; a +2 focus would make it 58.
       Under a 61 ceiling 58 is within 3, 57 is not. */
    expect(tierOf(year(2, null, 0, 61))).toBe("flat");
    for (const k of KEYS) expect(year(2, k, 2, 61)).toBe(year(2, null, 0, 61));
    expect(year(2, null, 0, 60)).toMatch(/close to your ceiling|not much left/);
  });
});
