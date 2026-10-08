/* Reviewer scratch (Round 1051, runner lens). NOT committed to the branch: it travels as .rc/x/rmut.mjs.
   node .rc/x/rmut.mjs <name>   applies ONE named mutation to the checkout it is run in (the throwaway runner
   checkout) and refuses unless the string it replaces is there exactly once. "none" changes nothing. */
import fs from 'node:fs';

const M = {
  // A merge drops the one board line: no stamp is written when a career retires.
  nopersist: { file: 'src/components/us-career/UsCareerBoard.tsx', from: "    if (sport.hall) stampOnRetirement(c, sport.saveKey); // Round 1051: the calibration stamp, on the write that retires a career\n", to: '' },
  // The load repair writes a 1 onto an old retired save (the bytes must stay as they are).
  repairwrites1: { file: 'src/lib/usCareerRetirementFlow.ts', from: "    if (v) c.hallCal = v; else delete c.hallCal;\n  }", to: "    if (v) c.hallCal = v; else delete c.hallCal;\n  } else if (c.retired) c.hallCal = 1;" },
  // The load repair drops a VALID stamp: a career retired on 2 is re-told on 1 after a reload.
  repairdrops: { file: 'src/lib/usCareerRetirementFlow.ts', from: "    if (v) c.hallCal = v; else delete c.hallCal;", to: "    delete c.hallCal;" },
  // The board stamps with no Hall bound (the parity fixture's bytes would gain a key).
  stampnohall: { file: 'src/components/us-career/UsCareerBoard.tsx', from: "    if (sport.hall) stampOnRetirement(c, sport.saveKey);", to: "    stampOnRetirement(c, sport.saveKey);" },
  // The reader ignores the stamp: every retired career reads calibration 1, so the round changes nothing for a player.
  stampignored: { file: 'src/lib/careerHallOfFame.ts', from: "  if (stamped) return stamped;\n  return c.retired ? 1 : HALL_CALIBRATION;", to: "  return c.retired ? 1 : HALL_CALIBRATION;" },
  // The card line is printed for a calibration 1 career too (an old retired card grows a line).
  weighsoncal1: { file: 'src/lib/careerHallOfFame.ts', from: "weighs: c => (hallCalibrationOf(c) === 1 ? null : hallWeighLine(def.weighs, def.legacy(c).standout ?? null)),", to: "weighs: c => hallWeighLine(def.weighs, def.legacy(c).standout ?? null)," },
  // The calibration 2 table loses one of calibration 1's terms (the quarterback's touchdown passes).
  v2dropsterm: { file: 'src/lib/nflMyCareer.ts', from: "    QB: {\n      terms: [{ stat: 'passYds', per: 800 }, { stat: 'passTd', per: 2 }],", to: "    QB: {\n      terms: [{ stat: 'passYds', per: 800 }]," },
  // The scorer ignores a family's own top (the left fielder's halved steals push pays the full 300 again).
  topignored: { file: 'src/lib/careerHallOfFame.ts', from: "const credit = (s.top ?? LEGACY_GAME_RULES.standoutTop) * share;", to: "const credit = LEGACY_GAME_RULES.standoutTop * share;" },
  // The card clause prints the raw total, no grouped thousands.
  rawtotal: { file: 'src/lib/careerHallOfFame.ts', from: "Your ${formatNumber(standout.total)} ${standout.label} sat near", to: "Your ${standout.total} ${standout.label} sat near" },
  // One sport reads today's calibration for everybody: an old retired NBA save is re-told on 2.
  nbaalways2: { file: 'src/lib/nbaMyCareer.ts', from: "legacyRead(NBA_LEGACY_WEIGHTS[hallCalibrationOf(c)], {", to: "legacyRead(NBA_LEGACY_WEIGHTS[2], {" },
  // The standout ramp starts one mark late: nothing until `to` (a swapped argument in the clamp).
  rampswap: { file: 'src/lib/careerHallOfFame.ts', from: "Math.max(0, (total - s.from) / (s.to - s.from))", to: "Math.max(0, (total - s.to) / (s.to - s.from))" },
  // A base is planted where the ledger has none: a point guard's assists as a flat term.
  plantbasenba: { file: 'src/lib/nbaMyCareer.ts', from: "    PG: {\n      terms: [{ stat: 'pts', per: 430 }],\n      standout: [\n        { stat: 'pts', from: 37400,", to: "    PG: {\n      terms: [{ stat: 'pts', per: 430 }, { stat: 'ast', per: 100 }],\n      standout: [\n        { stat: 'pts', from: 37400," },
  // The reliever's base the anchors dropped comes back (a stale table).
  rpbase: { file: 'src/lib/mlbMyCareer.ts', from: "    RP: { terms: [{ stat: 'hr', per: 4 }, { stat: 'rbi', per: 60 }] },", to: "    RP: { terms: [{ stat: 'hr', per: 4 }, { stat: 'rbi', per: 60 }, { stat: 'saves', per: 8 }, { stat: 'holds', per: 12 }, { stat: 'so', per: 40 }] }," },
  // The reliever's saves standout the anchors dropped comes back.
  rpsaves: { file: 'src/lib/mlbMyCareer.ts', from: "    RP: { terms: [{ stat: 'hr', per: 4 }, { stat: 'rbi', per: 60 }] },", to: "    RP: { terms: [{ stat: 'hr', per: 4 }, { stat: 'rbi', per: 60 }], standout: [{ stat: 'saves', from: 700, to: 800, label: 'saves' }] }," },
  // The kicker gets a base the design says he must not have.
  kickerbase: { file: 'src/lib/nflMyCareer.ts', from: "    K: {\n      terms: [],", to: "    K: {\n      terms: [{ stat: 'fgMade', per: 4 }]," },
  // The kicker's ramp is widened by hand (a mark typed off the ledger).
  kickermark: { file: 'src/lib/nflMyCareer.ts', from: "{ stat: 'fgMade', from: 512, to: 564, label: 'field goals' }", to: "{ stat: 'fgMade', from: 500, to: 564, label: 'field goals' }" },
  // The stamp writes calibration 1 instead of today's (a stale constant).
  stampone: { file: 'src/lib/careerHallOfFame.ts', from: "if (c.retired && c.hallCal === undefined) c.hallCal = HALL_CALIBRATION;", to: "if (c.retired && c.hallCal === undefined) c.hallCal = 1;" },
};

const name = process.argv[2];
if (name === 'none') { console.log('MUTATED none: nothing changed (baseline)'); process.exit(0); }
const m = M[name];
if (!m) { console.error('unknown mutation', name); process.exit(2); }
const src = fs.readFileSync(m.file, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
const from = m.from.split('\n').join(eol);
const to = m.to.split('\n').join(eol);
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`REFUSED ${name}: the string is in ${m.file} ${n} times, wanted 1`); process.exit(2); }
if (process.env.DRY) { console.log(`DRY ${name}: found once in ${m.file}`); process.exit(0); }
fs.writeFileSync(m.file, src.replace(from, () => to));
console.log(`MUTATED ${name}: ${m.file}`);
