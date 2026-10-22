var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/fightCareer.ts
var fightCareer_exports = {};
__export(fightCareer_exports, {
  DAILY_MAX: () => DAILY_MAX,
  DRAIN_PER_KNOCKDOWN: () => DRAIN_PER_KNOCKDOWN,
  DRAIN_PER_PUNCH: () => DRAIN_PER_PUNCH,
  FIRST_FIGHTER_NO: () => FIRST_FIGHTER_NO,
  PAST_FIGHTERS_MAX: () => PAST_FIGHTERS_MAX,
  RETIRE_MIN_FIGHTS: () => RETIRE_MIN_FIGHTS,
  SOFT_FLOOR_FROM: () => SOFT_FLOOR_FROM,
  STANDING_FLOOR: () => STANDING_FLOOR,
  STYLES: () => STYLES,
  TACTICS: () => TACTICS,
  WEIGHT_CLASSES: () => WEIGHT_CLASSES,
  applyResult: () => applyResult,
  archiveCareer: () => archiveCareer,
  campGain: () => campGain,
  canRetire: () => canRetire,
  conditionShown: () => conditionShown,
  conditionTrack: () => conditionTrack,
  dailyFight: () => dailyFight,
  effectiveAttrs: () => effectiveAttrs,
  fighterClass: () => fighterClass,
  genFighterName: () => genFighterName,
  legacyOf: () => legacyOf,
  makeFighter: () => makeFighter,
  mintFighterId: () => mintFighterId,
  newFightCareer: () => newFightCareer,
  offersFor: () => offersFor,
  pastFighterOf: () => pastFighterOf,
  ratingOf: () => ratingOf,
  repairFighterIds: () => repairFighterIds,
  retireByChoice: () => retireByChoice,
  runCamp: () => runCamp,
  sanitizePastFighters: () => sanitizePastFighters,
  scoreDaily: () => scoreDaily,
  shouldRetire: () => shouldRetire,
  simBout: () => simBout,
  tacticEdge: () => tacticEdge,
  takeFight: () => takeFight,
  weightById: () => weightById
});

// src/lib/careerEngine.ts
function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t2 = Math.imul(a ^ a >>> 15, 1 | a);
    t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2;
    return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296;
  };
}
function hashLabel(s) {
  let h = 7;
  for (let i = 0; i < (s || "x").length; i += 1) h = Math.imul(h, 31) + s.charCodeAt(i) >>> 0;
  return h >>> 0;
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function clampi(v, lo, hi) {
  return Math.round(clamp(v, lo, hi));
}
function genPersonName(rng, first, last) {
  const f = first[Math.floor(rng() * first.length)];
  const l = last[Math.floor(rng() * last.length)];
  return `${f} ${l}`;
}
function declineAt(age, peak, cliff) {
  if (age <= peak) return 1;
  if (age <= cliff) return 1 - (age - peak) * 0.012;
  const past = age - cliff;
  return clamp(1 - (cliff - peak) * 0.012 - past * 0.038 - past * past * 4e-3, 0.42, 1);
}
function legacyTier(score) {
  if (score >= 92) return { tier: "All Time Great", hof: true };
  if (score >= 78) return { tier: "Hall of Famer", hof: true };
  if (score >= 62) return { tier: "Modern Great", hof: false };
  if (score >= 46) return { tier: "Solid Pro", hof: false };
  if (score >= 28) return { tier: "Journeyman", hof: false };
  return { tier: "Footnote", hof: false };
}

// src/lib/fightCareer.ts
var WEIGHT_CLASSES = [
  { id: "fly", label: "Flyweight", lbs: 112, koBias: 0.62 },
  { id: "bantam", label: "Bantamweight", lbs: 118, koBias: 0.7 },
  { id: "feather", label: "Featherweight", lbs: 126, koBias: 0.78 },
  { id: "light", label: "Lightweight", lbs: 135, koBias: 0.88 },
  { id: "welter", label: "Welterweight", lbs: 147, koBias: 1 },
  { id: "middle", label: "Middleweight", lbs: 160, koBias: 1.12 },
  { id: "lightheavy", label: "Light Heavyweight", lbs: 175, koBias: 1.24 },
  { id: "heavy", label: "Heavyweight", lbs: 200, koBias: 1.42 }
];
function weightById(id) {
  return WEIGHT_CLASSES.find((w) => w.id === id) ?? WEIGHT_CLASSES[4];
}
var STYLES = [
  { id: "outboxer", label: "Out-Boxer", blurb: "Long, busy, and gone before you land. Wins rounds, not highlight reels." },
  { id: "swarmer", label: "Swarmer", blurb: "Lives on your chest and never stops. Drowns you in volume." },
  { id: "slugger", label: "Slugger", blurb: "Slow feet, terrible intentions. One shot ends the night." },
  { id: "counter", label: "Counter-Puncher", blurb: "Waits, reads you, and makes you pay for your own punch." }
];
var TACTICS = [
  { id: "box", label: "Box", blurb: "Stay long, stick the jab, take the round off the aggressor." },
  { id: "press", label: "Pressure", blurb: "Walk him down and take his room away." },
  { id: "counter", label: "Counter", blurb: "Give him the first shot and punish it." },
  { id: "brawl", label: "Brawl", blurb: "Stop thinking. Throw until one of you stops." }
];
var TACTIC_EDGE = {
  box: { outboxer: 0, swarmer: 1, slugger: 0, counter: -1 },
  press: { outboxer: 1, swarmer: 0, slugger: -1, counter: 0 },
  counter: { outboxer: 0, swarmer: -1, slugger: 1, counter: 0 },
  brawl: { outboxer: -1, swarmer: 0, slugger: 0, counter: 1 }
};
function tacticEdge(t2, against) {
  return TACTIC_EDGE[t2][against];
}
var STYLE_HABIT = {
  outboxer: ["box", "box", "counter", "press"],
  swarmer: ["press", "press", "brawl", "box"],
  slugger: ["brawl", "press", "brawl", "counter"],
  counter: ["counter", "counter", "box", "brawl"]
};
var FIRST = [
  "Andre",
  "Bakary",
  "Cristian",
  "Dmitri",
  "Eze",
  "Fabio",
  "Gustavo",
  "Hiroshi",
  "Ibrahim",
  "Jonas",
  "Kwame",
  "Leif",
  "Miguel",
  "Nikolai",
  "Omar",
  "Pavel",
  "Quentin",
  "Rashid",
  "Soren",
  "Tomas",
  "Ugo",
  "Viktor",
  "Wesley",
  "Yusuf",
  "Adan",
  "Beniamin",
  "Caleb",
  "Dario",
  "Emeka",
  "Farid",
  "Gideon",
  "Hassan"
];
var LAST = [
  "Abara",
  "Bellini",
  "Costa",
  "Draganov",
  "Eze",
  "Ferreira",
  "Gallo",
  "Haddad",
  "Ibori",
  "Jovanovic",
  "Kowalski",
  "Laurent",
  "Moreno",
  "Nakamura",
  "Oyelaran",
  "Petrov",
  "Quintero",
  "Rivas",
  "Salgado",
  "Toure",
  "Ubaldi",
  "Varga",
  "Wolde",
  "Yilmaz",
  "Zadrozny",
  "Brandao",
  "Cisse",
  "Delgado",
  "Farkas",
  "Guerrero"
];
function genFighterName(rng) {
  return genPersonName(rng, FIRST, LAST);
}
function drawnId(f) {
  const a = f.attrs;
  const key = [f.name, f.style, a.power, a.chin, a.speed, a.stamina, a.defence, a.ringIq, f.age, f.potential].join("|");
  return `x${hashLabel(key).toString(36)}`;
}
var FIRST_FIGHTER_NO = 10;
function mintFighterId(book, prefix) {
  const stored = book.nextFighterNo;
  const n = typeof stored === "number" && Number.isInteger(stored) && stored >= 1 ? stored : FIRST_FIGHTER_NO;
  book.nextFighterNo = n + 1;
  return `${prefix}${(book.seed >>> 0).toString(36)}-${n}`;
}
function fighterClass(f) {
  if (f.weight !== void 0 && WEIGHT_CLASSES.some((w) => w.id === f.weight)) return f.weight;
  return WEIGHT_CLASSES[Math.abs(hashLabel(f.id)) % WEIGHT_CLASSES.length].id;
}
function repairFighterIds(book, prefix, lists) {
  const head = `${prefix}${(book.seed >>> 0).toString(36)}-`;
  let top = 0;
  for (const list of lists) {
    for (const f of list) {
      if (!f || typeof f.id !== "string" || !f.id.startsWith(head)) continue;
      const n = Number(f.id.slice(head.length));
      if (Number.isInteger(n) && n > top) top = n;
    }
  }
  const stored = book.nextFighterNo;
  const storedOk = typeof stored === "number" && Number.isInteger(stored) && stored > top;
  if (!storedOk && (stored !== void 0 || top > 0)) book.nextFighterNo = Math.max(top + 1, FIRST_FIGHTER_NO);
  const seen = /* @__PURE__ */ new Set();
  let moved = 0;
  const out = lists.map((list) => list.map((f) => {
    if (!f) return f;
    const named = typeof f.id === "string" && f.id !== "";
    if (named && !seen.has(f.id)) {
      seen.add(f.id);
      return f;
    }
    const shown = named ? fighterClass(f) : void 0;
    const fixed = { ...f, id: mintFighterId(book, prefix) };
    if (shown) fixed.weight = shown;
    seen.add(fixed.id);
    moved += 1;
    return fixed;
  }));
  return { lists: out, moved };
}
function makeFighter(rng, tier, weight, style, id) {
  const st = style ?? STYLES[Math.floor(rng() * STYLES.length)].id;
  const base = clamp(tier, 20, 99);
  const jitter = () => (rng() - 0.5) * 10;
  const shape = {
    outboxer: { speed: 8, defence: 7, ringIq: 6, power: -10, chin: -3 },
    swarmer: { stamina: 10, power: 2, chin: 5, defence: -9, ringIq: -3 },
    slugger: { power: 13, chin: 4, speed: -9, stamina: -6, defence: -4 },
    counter: { ringIq: 11, defence: 8, speed: 3, stamina: -5, power: -2 }
  };
  const s = shape[st];
  const mk = (k) => clampi(base + (s[k] ?? 0) + jitter(), 15, 99);
  const drawn = {
    name: genPersonName(rng, FIRST, LAST),
    style: st,
    attrs: {
      power: mk("power"),
      chin: mk("chin"),
      speed: mk("speed"),
      stamina: mk("stamina"),
      defence: mk("defence"),
      ringIq: mk("ringIq")
    },
    age: clampi(21 + rng() * 12, 19, 37),
    wins: 0,
    losses: 0,
    draws: 0,
    kos: 0,
    damage: 0,
    rank: 99,
    potential: clampi(base + 10 + rng() * 16, 30, 99)
  };
  return { id: id ?? drawnId(drawn), ...drawn };
}
function effectiveAttrs(f) {
  const age = declineAt(f.age, 28, 31);
  const d = f.damage;
  const chinLoss = Math.min(38, d * 0.55);
  const staminaLoss = Math.min(24, d * 0.3);
  const speedLoss = Math.min(20, d * 0.22);
  return {
    power: clampi(f.attrs.power * clamp(age + 0.04, 0.5, 1), 10, 99),
    chin: clampi(f.attrs.chin * age - chinLoss, 5, 99),
    speed: clampi(f.attrs.speed * age - speedLoss, 8, 99),
    stamina: clampi(f.attrs.stamina * age - staminaLoss, 8, 99),
    defence: clampi(f.attrs.defence * age, 8, 99),
    ringIq: clampi(f.attrs.ringIq * clamp(age + 0.08, 0.6, 1.06), 10, 99)
  };
}
function ratingOf(f) {
  const a = effectiveAttrs(f);
  return Math.round(
    a.power * 0.2 + a.chin * 0.14 + a.speed * 0.18 + a.stamina * 0.14 + a.defence * 0.16 + a.ringIq * 0.18
  );
}
var DRAIN_PER_PUNCH = 0.8;
var DRAIN_PER_KNOCKDOWN = 10;
var STANDING_FLOOR = 8;
var SOFT_FLOOR_FROM = 40;
function conditionShown(drain) {
  const straight = 100 - drain;
  if (straight >= SOFT_FLOOR_FROM) return straight;
  const span = SOFT_FLOOR_FROM - STANDING_FLOOR;
  return STANDING_FLOOR + span * Math.exp((straight - SOFT_FLOOR_FROM) / span);
}
function conditionTrack(res) {
  const stoppage = res.method === "KO" || res.method === "TKO";
  const loser = res.winner === "player" ? "opp" : res.winner === "opp" ? "player" : null;
  let playerDrain = 0;
  let oppDrain = 0;
  const out = [];
  res.rounds.forEach((r, i) => {
    playerDrain += r.oppLanded * DRAIN_PER_PUNCH + (r.knockdown === "opp" ? DRAIN_PER_KNOCKDOWN : 0);
    oppDrain += r.playerLanded * DRAIN_PER_PUNCH + (r.knockdown === "player" ? DRAIN_PER_KNOCKDOWN : 0);
    const player = conditionShown(playerDrain);
    const opp = conditionShown(oppDrain);
    const last = i === res.rounds.length - 1;
    out.push({
      round: r.round,
      player: stoppage && last && loser === "player" ? 0 : Math.round(player),
      opp: stoppage && last && loser === "opp" ? 0 : Math.round(opp)
    });
  });
  return out;
}
function habitTactic(style, rng) {
  const list = STYLE_HABIT[style];
  return list[Math.floor(rng() * list.length)];
}
var STYLE_THAT_BEATS = {
  box: "counter",
  press: "slugger",
  counter: "swarmer",
  brawl: "outboxer"
};
function oppStance(opp, lastPlayerTactic, rng) {
  if (!lastPlayerTactic) return opp.style;
  const iq = effectiveAttrs(opp).ringIq;
  return rng() < 0.1 + iq / 100 * 0.5 ? STYLE_THAT_BEATS[lastPlayerTactic] : opp.style;
}
function freshnessAt(round, total, stamina, camp) {
  const through = round / Math.max(1, total);
  const tank = 0.55 + stamina / 100 * 0.45 + camp * 0.1;
  return clamp(1 - Math.max(0, through - tank) * 1.35, 0.45, 1);
}
function simBout(input, rng) {
  const { player, opponent, rounds, weight } = input;
  const camp = clamp(input.campQuality ?? 0.5, 0, 1);
  const pa = effectiveAttrs(player);
  const oa = effectiveAttrs(opponent);
  const koBias = weightById(weight).koBias;
  const log = [];
  let playerCard = 0;
  let oppCard = 0;
  let damageTaken = 0;
  let damageDealt = 0;
  let roundsWon = 0;
  let stopped = null;
  let endedRound = rounds;
  let playerHurt = 0;
  let oppHurt = 0;
  let lastPlayerTactic = null;
  for (let r = 1; r <= rounds; r += 1) {
    const tactic = input.tactics.length ? input.tactics[(r - 1) % input.tactics.length] : "box";
    const stance = oppStance(opponent, lastPlayerTactic, rng);
    const switched = stance !== opponent.style;
    const oppTactic = habitTactic(stance, rng);
    const edge = tacticEdge(tactic, stance) - tacticEdge(oppTactic, player.style);
    const pFresh = freshnessAt(r, rounds, pa.stamina, camp);
    const oFresh = freshnessAt(r, rounds, oa.stamina, 0.5);
    const pOut = (pa.speed * 0.34 + pa.ringIq * 0.33 + pa.power * 0.33) * pFresh;
    const oOut = (oa.speed * 0.34 + oa.ringIq * 0.33 + oa.power * 0.33) * oFresh;
    const pLanded = Math.max(0, Math.round(
      (pOut - oa.defence * 0.45) / 4.2 + edge * 2.6 + oppHurt * 1.8 + (rng() - 0.5) * 5
    ));
    const oLanded = Math.max(0, Math.round(
      (oOut - pa.defence * 0.45) / 4.2 - edge * 2.6 + playerHurt * 1.8 + (rng() - 0.5) * 5
    ));
    const pKd = clamp((pa.power - oa.chin + 18 + edge * 9 + oppHurt * 12) / 460, 0, 0.42) * koBias;
    const oKd = clamp((oa.power - pa.chin + 18 - edge * 9 + playerHurt * 12) / 460, 0, 0.42) * koBias;
    const pDrops = rng() < pKd;
    const oDrops = !pDrops && rng() < oKd;
    let ps = 10;
    let os = 10;
    let knockdown = null;
    if (pDrops) {
      knockdown = "player";
      os = 8;
      oppHurt += 1;
    } else if (oDrops) {
      knockdown = "opp";
      ps = 8;
      playerHurt += 1;
    }
    if (!knockdown) {
      if (pLanded > oLanded) os = 9;
      else if (oLanded > pLanded) ps = 9;
      else if (rng() < 0.5) os = 9;
      else ps = 9;
    } else if (knockdown === "player") {
      ps = 10;
    } else {
      os = 10;
    }
    playerCard += ps;
    oppCard += os;
    if (ps > os) roundsWon += 1;
    damageTaken += oLanded * 0.022 + (oDrops ? 1.2 : 0);
    damageDealt += pLanded * 0.022 + (pDrops ? 1.2 : 0);
    log.push({
      round: r,
      tactic,
      oppTactic,
      stance,
      switched,
      playerLanded: pLanded,
      oppLanded: oLanded,
      playerScore: ps,
      oppScore: os,
      knockdown,
      note: knockdown === "player" ? `${opponent.name} is down.` : knockdown === "opp" ? "You are down." : switched ? "He has changed how he is fighting." : edge > 0 ? "The tactic is working." : edge < 0 ? "He has your number this round." : ""
    });
    lastPlayerTactic = tactic;
    if (oppHurt >= 2 && rng() < 0.55 + oppHurt * 0.12) {
      stopped = "player";
      endedRound = r;
      break;
    }
    if (playerHurt >= 2 && rng() < 0.55 + playerHurt * 0.12) {
      stopped = "opp";
      endedRound = r;
      break;
    }
  }
  if (stopped) {
    const hurt = stopped === "player" ? oppHurt : playerHurt;
    return {
      rounds: log,
      winner: stopped,
      method: hurt >= 3 ? "KO" : "TKO",
      endedRound,
      playerCard,
      oppCard,
      damageTaken,
      damageDealt,
      roundsWon
    };
  }
  let winner;
  let method;
  const gap = playerCard - oppCard;
  if (gap === 0) {
    winner = "draw";
    method = "D";
  } else {
    winner = gap > 0 ? "player" : "opp";
    const margin = Math.abs(gap);
    method = margin >= 5 ? "UD" : margin >= 3 ? "MD" : "SD";
  }
  return { rounds: log, winner, method, endedRound, playerCard, oppCard, damageTaken, damageDealt, roundsWon };
}
var CAMP_WEEKS = 6;
function campGain(cur, potential, weeks) {
  const headroom = clamp((potential - cur) / 22, 0, 1);
  return weeks / CAMP_WEEKS * 2.4 * headroom;
}
function sharpened(f, sharp) {
  const s = Math.round(sharp);
  if (!s) return f;
  const up = (v) => clampi(v + s, 15, 99);
  return {
    ...f,
    attrs: { ...f.attrs, power: up(f.attrs.power), speed: up(f.attrs.speed), stamina: up(f.attrs.stamina), defence: up(f.attrs.defence) }
  };
}
function newFightCareer(name, weight, style, seedLabel) {
  const seed = hashLabel(seedLabel ?? `${name}|${weight}|${style}`);
  const rng = rngFrom(seed);
  const me = makeFighter(rng, 52, weight, style);
  me.name = name.trim() || me.name;
  me.age = 21;
  me.rank = 99;
  const st = {
    version: 1,
    fighter: me,
    weight,
    fightNo: 0,
    champion: false,
    titleDefences: 0,
    earnings: 0,
    history: [],
    retired: false,
    offers: [],
    camp: null,
    campQuality: 0.5,
    rngTick: 0,
    seed,
    log: ["You turn professional. Nobody is watching yet."]
  };
  st.offers = offersFor(st);
  return st;
}
function streamFor(st) {
  const rng = rngFrom(st.seed + st.rngTick * 7919);
  return { rng, done: (used) => {
    st.rngTick += Math.max(1, used);
  } };
}
function offersFor(st) {
  const { rng, done } = streamFor(st);
  const mine = ratingOf(st.fighter);
  const rank = st.champion ? 0 : st.fighter.rank;
  const out = [];
  const contender = !st.champion && rank <= 1;
  const shapes = st.champion ? [
    { label: "Voluntary defence", delta: -8, pay: 1.5, gain: 0, rounds: 12 },
    { label: "Mandatory challenger", delta: 2, pay: 2.4, gain: 0, rounds: 12 },
    { label: "Unification", delta: 7, pay: 4.2, gain: 0, rounds: 12 }
  ] : contender ? [
    { label: "Vacant title", delta: -2, pay: 2, gain: 0, rounds: 12 },
    { label: "Champion away from home", delta: 4, pay: 3, gain: 0, rounds: 12 },
    { label: "Undisputed champion", delta: 9, pay: 4.6, gain: 0, rounds: 12 }
  ] : [
    { label: "Tune up", delta: -11, pay: 0.35, gain: 1, rounds: 8 },
    { label: "Even money", delta: 1, pay: 1, gain: 3, rounds: 10 },
    { label: "Step up", delta: 9, pay: 2.1, gain: 6, rounds: 10 }
  ];
  for (const s of shapes) {
    const titleFight = st.champion || contender;
    const relative = clamp(mine + s.delta, 25, 97);
    const opp = makeFighter(rng, titleFight ? Math.max(relative, 80 + rng() * 15) : relative, st.weight);
    opp.age = clampi(23 + rng() * 12, 20, 38);
    const fame = st.champion ? 5.5 : clamp((16 - Math.min(rank, 16)) / 3.4, 0.35, 4.6);
    const purse = Math.round((0.05 + fame * 0.16) * s.pay * 100) / 100;
    out.push({
      id: `o${st.fightNo}-${out.length}`,
      opponent: opp,
      purse,
      rounds: s.rounds,
      rankGain: s.gain,
      title: st.champion || contender,
      label: s.label
    });
  }
  done(12);
  return out;
}
function runCamp(st, plan) {
  const total = plan.conditioning + plan.power + plan.defence + plan.speed;
  const weeks = clamp(total, 0, CAMP_WEEKS);
  const spread = weeks === 0 ? 0 : 1 - Math.max(
    plan.conditioning,
    plan.power,
    plan.defence,
    plan.speed
  ) / Math.max(1, weeks);
  const next = { ...st, fighter: { ...st.fighter, attrs: { ...st.fighter.attrs } } };
  const pot = next.fighter.potential;
  const grow = (cur, weeks2) => clampi(cur + campGain(cur, pot, weeks2), 15, 99);
  next.fighter.attrs.stamina = grow(next.fighter.attrs.stamina, plan.conditioning);
  next.fighter.attrs.power = grow(next.fighter.attrs.power, plan.power);
  next.fighter.attrs.defence = grow(next.fighter.attrs.defence, plan.defence);
  next.fighter.attrs.speed = grow(next.fighter.attrs.speed, plan.speed);
  next.camp = plan;
  next.campQuality = clamp(0.25 + weeks / CAMP_WEEKS * 0.5 + spread * 0.32, 0, 1);
  return next;
}
function takeFight(st, offerId, tactics, mods) {
  if (st.retired) return null;
  const offer = st.offers.find((o) => o.id === offerId);
  if (!offer) return null;
  const { rng, done } = streamFor(st);
  const fought = simBout({
    player: mods?.sharp ? sharpened(st.fighter, mods.sharp) : st.fighter,
    opponent: offer.opponent,
    rounds: offer.rounds,
    weight: st.weight,
    tactics,
    campQuality: st.campQuality
  }, rng);
  const result = mods?.damageMul === void 0 ? fought : { ...fought, damageTaken: Math.round(fought.damageTaken * mods.damageMul * 100) / 100 };
  done(offer.rounds * 6 + 4);
  return { state: applyResult(st, offer, result), result, offer };
}
function applyResult(st, offer, res) {
  const f = { ...st.fighter, attrs: { ...st.fighter.attrs } };
  const next = { ...st, fighter: f, history: [...st.history], log: [...st.log] };
  f.damage = Math.round((f.damage + res.damageTaken) * 10) / 10;
  next.fightNo += 1;
  f.age = Math.round((f.age + 0.34) * 100) / 100;
  const won = res.winner === "player";
  const drew = res.winner === "draw";
  if (won) f.wins += 1;
  else if (drew) f.draws += 1;
  else f.losses += 1;
  if (won && (res.method === "KO" || res.method === "TKO")) f.kos += 1;
  if (offer.title) {
    if (won) {
      if (st.champion) next.titleDefences += 1;
      else {
        next.champion = true;
        f.rank = 0;
        next.titleDefences = 0;
      }
    } else if (!drew && st.champion) {
      next.champion = false;
      f.rank = 2;
    }
  } else if (won) {
    const gap = ratingOf(offer.opponent) - ratingOf(st.fighter);
    const cur = f.rank === 99 ? 20 : f.rank;
    const earned = cur <= 10 && gap < -6 ? 0 : offer.rankGain;
    f.rank = clampi(Math.min(cur, 20) - earned, 1, 99);
  } else if (!drew) {
    f.rank = clampi((f.rank === 99 ? 20 : f.rank) + 4, 1, 99);
  }
  next.earnings = Math.round((next.earnings + offer.purse) * 100) / 100;
  next.history.push({
    no: next.fightNo,
    opponent: offer.opponent.name,
    result: won ? "W" : drew ? "D" : "L",
    method: res.method,
    round: res.endedRound,
    rounds: offer.rounds,
    purse: offer.purse,
    title: offer.title,
    oppRating: ratingOf(offer.opponent),
    myRating: ratingOf(st.fighter)
  });
  next.log.unshift(
    `${won ? "Beat" : drew ? "Drew with" : "Lost to"} ${offer.opponent.name} by ${res.method}${res.method === "KO" || res.method === "TKO" ? ` in round ${res.endedRound}` : ""}.`
  );
  next.camp = null;
  next.campQuality = 0.5;
  next.retired = shouldRetire(next);
  next.offers = next.retired ? [] : offersFor(next);
  return next;
}
function shouldRetire(st) {
  const f = st.fighter;
  if (f.age >= 41) return true;
  if (f.damage >= 82) return true;
  if (f.age >= 35 && f.damage >= 58) return true;
  const last3 = st.history.slice(-3);
  if (last3.length === 3 && last3.every((h) => h.result === "L") && f.rank > 12) return true;
  return false;
}
var RETIRE_MIN_FIGHTS = 10;
function canRetire(st) {
  return !st.retired && st.fightNo >= RETIRE_MIN_FIGHTS;
}
function retireByChoice(st) {
  if (!canRetire(st)) return null;
  const f = st.fighter;
  return {
    ...st,
    retired: true,
    retiredBy: "choice",
    offers: [],
    camp: null,
    campQuality: 0.5,
    log: [`You hang them up after ${st.fightNo} fights, ${f.wins} and ${f.losses}${f.draws ? ` and ${f.draws}` : ""}.`, ...st.log]
  };
}
function legacyOf(st) {
  const f = st.fighter;
  const titleWins = st.history.filter((h) => h.title && h.result === "W").length;
  const bigWins = st.history.filter((h) => h.result === "W" && h.oppRating >= h.myRating - 3).length;
  const qualityKos = st.history.filter((h) => h.result === "W" && (h.method === "KO" || h.method === "TKO") && h.oppRating >= h.myRating - 3).length;
  const total = f.wins + f.losses + f.draws;
  const winPct = total ? f.wins / total : 0;
  const score = clampi(
    /* A clean record counts for something, but only something. An unbeaten
       fighter who never met anybody is a trivia answer, not a great. */
    18 * winPct + /* Who you beat. A win over somebody worth paying for is worth something and
       a win over a late replacement is not, which is why this counts purse
       rather than wins. Counting raw wins paid a long quiet career of beating
       nobodies 94 out of 100, and then subtracting losses at nearly twice a
       win's value scored an honest even record at zero. Both were wrong in the
       same way: they measured how many nights, not what happened on them. */
    bigWins * 2.4 + qualityKos * 0.6 + titleWins * 12 + st.titleDefences * 7 - Math.max(0, f.damage - 50) * 0.22,
    0,
    100
  );
  const { tier, hof } = legacyTier(score);
  const bullets = [
    `${f.wins} and ${f.losses}${f.draws ? ` and ${f.draws}` : ""}, with ${f.kos} inside the distance.`
  ];
  if (titleWins) bullets.push(`${titleWins} world title win${titleWins > 1 ? "s" : ""} and ${st.titleDefences} defence${st.titleDefences === 1 ? "" : "s"}.`);
  else bullets.push("Never won a world title.");
  bullets.push(`Career purse ${st.earnings.toFixed(2)}m.`);
  bullets.push(
    f.damage >= 70 ? "He left it all in there, and it shows." : f.damage >= 40 ? "He took his share and walked out on his own feet." : "He got out clean, which almost nobody does."
  );
  if (st.retiredBy === "choice") bullets.push(`He called time himself after ${st.fightNo} fights.`);
  return { score, tier, hof, bullets };
}
var PAST_FIGHTERS_MAX = 8;
function pastFighterOf(st) {
  const f = st.fighter;
  const v = legacyOf(st);
  return {
    key: `${st.seed >>> 0}:${st.fightNo}:${f.wins}-${f.losses}-${f.draws}:${f.kos}:${st.earnings}`,
    name: f.name,
    weight: st.weight,
    wins: f.wins,
    losses: f.losses,
    draws: f.draws,
    kos: f.kos,
    titles: st.history.filter((h) => h.title && h.result === "W").length,
    defences: st.titleDefences,
    tier: v.tier,
    score: v.score,
    chose: st.retiredBy === "choice"
  };
}
function archiveCareer(list, st) {
  if (!st.retired) return list;
  const entry = pastFighterOf(st);
  if (list.some((p) => p.key === entry.key)) return list;
  return [entry, ...list].slice(0, PAST_FIGHTERS_MAX);
}
function sanitizePastFighters(raw) {
  if (!Array.isArray(raw)) return [];
  const num = (v) => typeof v === "number" && Number.isFinite(v) ? v : null;
  const out = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const p = r;
    const nums = [p.wins, p.losses, p.draws, p.kos, p.titles, p.defences, p.score].map(num);
    if (typeof p.key !== "string" || typeof p.name !== "string" || typeof p.tier !== "string") continue;
    if (!WEIGHT_CLASSES.some((w) => w.id === p.weight) || nums.some((n) => n === null)) continue;
    const [wins, losses, draws, kos, titles, defences, score] = nums;
    out.push({
      key: p.key,
      name: p.name,
      weight: p.weight,
      wins,
      losses,
      draws,
      kos,
      titles,
      defences,
      tier: p.tier,
      score,
      chose: p.chose === true
    });
    if (out.length >= PAST_FIGHTERS_MAX) break;
  }
  return out;
}
function dailyFight(dayKey) {
  const rng = rngFrom(hashLabel(`fight-career-daily|${dayKey}`));
  const weight = WEIGHT_CLASSES[Math.floor(rng() * WEIGHT_CLASSES.length)].id;
  const player = makeFighter(rng, 70, weight);
  const opponent = makeFighter(rng, 70, weight);
  player.age = 27;
  opponent.age = 27;
  player.damage = 0;
  opponent.damage = 0;
  return { player, opponent, weight, rounds: 3 };
}
var DAILY_MAX = 100;
function scoreDaily(res, tactics, oppStyle) {
  let s = 0;
  if (res.winner === "player") s += 50;
  s += Math.min(24, res.roundsWon * 8);
  if (res.method === "KO" || res.method === "TKO") s += 12;
  const right = tactics.filter((t2) => tacticEdge(t2, oppStyle) > 0).length;
  s += Math.round(right / Math.max(1, tactics.length) * 14);
  s -= Math.min(14, Math.round(res.damageTaken * 0.7));
  return clampi(s, 0, DAILY_MAX);
}

// src/lib/fightCareerLifeFlow.ts
var fightCareerLifeFlow_exports = {};
__export(fightCareerLifeFlow_exports, {
  FIGHT_BADGES: () => FIGHT_BADGES,
  MORALE_DRIFT: () => MORALE_DRIFT,
  fansAfter: () => fansAfter,
  fightBadgeFacts: () => fightBadgeFacts,
  fightBadgesEarned: () => fightBadgesEarned,
  lifeAnswerInbox: () => lifeAnswerInbox,
  lifeBuyUpgrade: () => lifeBuyUpgrade,
  lifeLoadState: () => lifeLoadState,
  lifeNewCareer: () => lifeNewCareer,
  lifeRetire: () => lifeRetire,
  lifeRunCamp: () => lifeRunCamp,
  lifeTakeFight: () => lifeTakeFight,
  nextLifeStep: () => nextLifeStep
});

// src/lib/fightCareerLife.ts
var fightCareerLife_exports = {};
__export(fightCareerLife_exports, {
  BOUT_NEUTRAL_KEYS: () => BOUT_NEUTRAL_KEYS,
  CARDS_PER_FIGHT: () => CARDS_PER_FIGHT,
  FAN_PURSE_STEP: () => FAN_PURSE_STEP,
  FEED_MAX: () => FEED_MAX,
  GRUDGE_LABEL: () => GRUDGE_LABEL,
  GRUDGE_PURSE_MUL: () => GRUDGE_PURSE_MUL,
  LIFE_CARDS: () => LIFE_CARDS,
  MANAGERS: () => MANAGERS,
  MORALE_PER_SHARP: () => MORALE_PER_SHARP,
  PROMOTER_PURSE_MUL: () => PROMOTER_PURSE_MUL,
  REMATCH_LABEL: () => REMATCH_LABEL,
  REMATCH_RANK_GAIN: () => REMATCH_RANK_GAIN,
  REMATCH_WINDOW: () => REMATCH_WINDOW,
  SHARP_CAP: () => SHARP_CAP,
  START_FANS: () => START_FANS,
  TRAINERS: () => TRAINERS,
  answerLifeCard: () => answerLifeCard,
  applyLifeEffect: () => applyLifeEffect,
  campGrowthMul: () => campGrowthMul,
  classAfterMove: () => classAfterMove,
  cloneForLife: () => cloneForLife,
  dealLifeCards: () => dealLifeCards,
  describeLifeEffect: () => describeLifeEffect,
  describeManager: () => describeManager,
  describeTrainer: () => describeTrainer,
  dressOffers: () => dressOffers,
  eligibleCards: () => eligibleCards,
  ensureLife: () => ensureLife,
  ensureLifeBlock: () => ensureLifeBlock,
  isBoutNeutral: () => isBoutNeutral,
  lapseClosedCards: () => lapseClosedCards,
  lifeCardById: () => lifeCardById,
  lifeFightMods: () => lifeFightMods,
  lifePurseMul: () => lifePurseMul,
  lifeSharpness: () => lifeSharpness,
  lifeStream: () => lifeStream,
  lifeTakeHome: () => lifeTakeHome,
  managerDef: () => managerDef,
  newLife: () => newLife,
  pendingLifeCard: () => pendingLifeCard,
  pushLifeFeed: () => pushFeed,
  rematchInTime: () => rematchInTime,
  rivalFighter: () => rivalFighter,
  rivalInYourClass: () => rivalInYourClass,
  settleCampCarry: () => settleCampCarry,
  specialFightOnTable: () => specialFightOnTable,
  trainerDef: () => trainerDef
});

// src/lib/fightCareerMoney.ts
var round2 = (v) => Math.round(v * 100) / 100;
var MAX_UPGRADE_LEVEL = 3;
var UPGRADE_PRICES = [0.05, 0.25, 1];
var UPGRADES = [
  { id: "sparring", emoji: "\u{1F94A}", label: "Sparring partners", per: "Every fight night is 1 point sharper", step: 1 },
  { id: "strength", emoji: "\u{1F3CB}\uFE0F", label: "Strength coach", per: "Power weeks are worth 12% more", step: 0.12 },
  { id: "roadwork", emoji: "\u{1F3C3}", label: "Conditioning coach", per: "Conditioning weeks are worth 12% more", step: 0.12 },
  { id: "padman", emoji: "\u{1F3AF}", label: "Pad man", per: "Defence and speed weeks are worth 10% more", step: 0.1 },
  { id: "cutman", emoji: "\u{1FA79}", label: "Cut man", per: "You carry 4% less damage out of every fight", step: 0.04 }
];
function upgradeLevel(h, id) {
  const n = h.shop?.[id] ?? 0;
  return Number.isFinite(n) ? Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Math.floor(n))) : 0;
}
function upgradePrice(h, id) {
  const lvl = upgradeLevel(h, id);
  return lvl >= MAX_UPGRADE_LEVEL ? null : UPGRADE_PRICES[lvl];
}
function buyUpgrade(h, id) {
  const def = UPGRADES.find((u) => u.id === id);
  const price = upgradePrice(h, id);
  if (!def || price === null || h.bank < price) return null;
  h.bank = round2(h.bank - price);
  h.shop = { ...h.shop ?? {}, [id]: upgradeLevel(h, id) + 1 };
  return `${def.emoji} ${def.label}, level ${upgradeLevel(h, id)}, for ${price.toFixed(2)}m.`;
}
function purseAfterCuts(purse, cuts) {
  const taken = cuts.reduce((sum, c) => sum + Math.max(0, c), 0);
  return round2(purse * Math.max(0, 1 - taken));
}

// src/lib/fightCareerLife.ts
var TRAINERS = [
  { id: "allround", label: "The all-rounder", cut: 0.1, grow: {}, sharp: 0 },
  { id: "puncher", label: "The puncher's coach", cut: 0.1, grow: { power: 1.25, defence: 0.85 }, sharp: 0 },
  { id: "slick", label: "The defensive mind", cut: 0.1, grow: { defence: 1.2, speed: 1.2, power: 0.85 }, sharp: 0 },
  { id: "engine", label: "The conditioner", cut: 0.1, grow: { conditioning: 1.25, speed: 0.85 }, sharp: 1 }
];
var MANAGERS = [
  { id: "family", label: "The family friend", cut: 0.05, purseMul: 1, rankBonus: 0, fansPerFight: 0 },
  { id: "dealmaker", label: "The dealmaker", cut: 0.25, purseMul: 1.25, rankBonus: 0, fansPerFight: 1 },
  { id: "matchmaker", label: "The matchmaker", cut: 0.15, purseMul: 1, rankBonus: 1, fansPerFight: 0 }
];
var trainerDef = (id) => TRAINERS.find((t2) => t2.id === id) ?? TRAINERS[0];
var managerDef = (id) => MANAGERS.find((m) => m.id === id) ?? MANAGERS[0];
var pct = (frac) => `${Math.round(frac * 100)}%`;
var AREA_LABEL = {
  conditioning: "conditioning",
  power: "power",
  defence: "defence",
  speed: "speed"
};
function describeTrainer(t2) {
  const parts = [];
  for (const k of Object.keys(AREA_LABEL)) {
    const m = t2.grow[k];
    if (m === void 0 || m === 1) continue;
    const by = Math.round(Math.abs(m - 1) * 100);
    parts.push(`${AREA_LABEL[k]} weeks worth ${by}% ${m > 1 ? "more" : "less"}`);
  }
  if (t2.sharp) parts.push(`${t2.sharp} point${t2.sharp === 1 ? "" : "s"} sharper on every fight night`);
  if (parts.length === 0) parts.push("no specialty, every camp week is worth what it is worth");
  const line = parts.join(", ");
  return `${line.charAt(0).toUpperCase()}${line.slice(1)}. Takes ${pct(t2.cut)} of every purse.`;
}
function describeManager(m) {
  const parts = [];
  if (m.purseMul !== 1) parts.push(`purses ${Math.round((m.purseMul - 1) * 100)}% bigger`);
  if (m.rankBonus) parts.push(`a win that moves you up the rankings moves you up to ${m.rankBonus} more place${m.rankBonus === 1 ? "" : "s"}`);
  if (m.fansPerFight) parts.push(`${m.fansPerFight} more fan${m.fansPerFight === 1 ? "" : "s"} after every fight`);
  if (parts.length === 0) parts.push("purses as they come");
  const line = parts.join(", ");
  return `${line.charAt(0).toUpperCase()}${line.slice(1)}. Takes ${pct(m.cut)} of every purse.`;
}
var FEED_MAX = 14;
var START_FANS = 5;
var PROMOTER_PURSE_MUL = 1.2;
var GRUDGE_PURSE_MUL = 1.3;
var REMATCH_RANK_GAIN = 4;
var REMATCH_WINDOW = 4;
var FAN_PURSE_STEP = 5e-3;
var MORALE_PER_SHARP = 10;
var SHARP_CAP = 8;
function lifeStream(st) {
  const life = st.life;
  const rng = rngFrom(((st.seed ^ 1540483477) >>> 0) + (life?.tick ?? 0) * 7919);
  return { rng, done: () => {
    if (life) life.tick += 1;
  } };
}
var pushFeed = (life, line) => {
  life.feed = [line, ...life.feed].slice(0, FEED_MAX);
};
var BOUT_NEUTRAL_KEYS = ["cash", "fans", "heat", "pursePct"];
function isBoutNeutral(e) {
  return Object.keys(e).every((k) => BOUT_NEUTRAL_KEYS.includes(k) || !e[k]);
}
var signed = (n) => n > 0 ? `+${n}` : `${n}`;
function describeLifeEffect(e) {
  const parts = [];
  if (e.cash) parts.push(`Bank ${e.cash > 0 ? "+" : "-"}${Math.abs(e.cash).toFixed(2)}m`);
  if (e.fans) parts.push(`Fans ${signed(e.fans)}`);
  if (e.morale) parts.push(`Morale ${signed(e.morale)}`);
  if (e.karma) parts.push(`Karma ${signed(e.karma)}`);
  if (e.heat) parts.push(`Feud ${signed(e.heat)}`);
  if (e.damage) parts.push(`Damage +${e.damage.toFixed(1)} for good`);
  if (e.age) parts.push(`${Math.round(e.age * 12)} months out of the ring`);
  if (e.sharp) parts.push(`Next fight ${signed(e.sharp)} sharpness`);
  if (e.pursePct) parts.push(`Purses on the table ${signed(e.pursePct)}%`);
  if (e.rank) parts.push(e.rank > 0 ? `Down ${e.rank} in the rankings` : `Up ${-e.rank} in the rankings`);
  if (e.moveClass) parts.push(`Move ${e.moveClass > 0 ? "up" : "down"} a weight class, unranked again, any belt stays behind`);
  if (e.promoter) parts.push(`Purses ${signed(Math.round((PROMOTER_PURSE_MUL - 1) * 100))}% for ${e.promoter} fights, the safest offer leaves the table`);
  if (e.rematch) {
    const extra = MANAGERS.find((m) => m.rankBonus > 0);
    parts.push(`The middle offer becomes the rematch, a win worth up to ${REMATCH_RANK_GAIN} places${extra ? `, ${extra.rankBonus} more with ${extra.label.toLowerCase()}` : ""}`);
  }
  if (e.grudge) parts.push(`The middle offer becomes the grudge fight, purse ${signed(Math.round((GRUDGE_PURSE_MUL - 1) * 100))}%`);
  return parts.length ? parts.join(". ") + "." : "Nothing changes.";
}
function classAfterMove(weight, dir) {
  const i = WEIGHT_CLASSES.findIndex((w) => w.id === weight);
  return WEIGHT_CLASSES[i + dir]?.id ?? null;
}
function cloneForLife(st) {
  const life = ensureLifeBlock(st);
  return {
    ...st,
    fighter: { ...st.fighter, attrs: { ...st.fighter.attrs } },
    offers: st.offers.map((o) => ({ ...o })),
    history: [...st.history],
    log: [...st.log],
    life: {
      ...life,
      trainer: { ...life.trainer },
      manager: { ...life.manager },
      shop: { ...life.shop },
      carry: { ...life.carry },
      pending: [...life.pending],
      cooldowns: { ...life.cooldowns },
      feed: [...life.feed],
      rival: life.rival ? { ...life.rival } : null,
      rivalryChoicesSeen: [...life.rivalryChoicesSeen],
      phoneInbox: [...life.phoneInbox],
      phoneUsedIds: [...life.phoneUsedIds]
    }
  };
}
var meter = (v) => clamp(Math.round(v), 0, 100);
var middleOf = (offers) => Math.floor(offers.length / 2);
function rivalInYourClass(st) {
  const r = st.life?.rival;
  return !!r && (r.weight === void 0 || r.weight === st.weight);
}
function rivalFighter(st) {
  const r = st.life?.rival;
  if (!r || r.retired || !rivalInYourClass(st)) return null;
  let h = 2166136261;
  for (let i = 0; i < r.name.length; i += 1) h = Math.imul(h ^ r.name.charCodeAt(i), 16777619);
  const f = makeFighter(rngFrom(h >>> 0), r.rating, st.weight, r.style);
  return { ...f, name: r.name, age: r.age, wins: r.wins, losses: r.losses, kos: r.kos, rank: r.rank };
}
function dressOffers(st) {
  const life = st.life;
  const mgr = managerDef(life.manager.kind);
  const mul = mgr.purseMul * (1 + life.fanbase * FAN_PURSE_STEP);
  st.offers = st.offers.map((o) => ({
    ...o,
    purse: round2(o.purse * mul),
    rankGain: !o.title && o.rankGain > 0 ? o.rankGain + mgr.rankBonus : o.rankGain
  }));
  const rivalName = life.rival?.name;
  if (rivalName) {
    st.offers = st.offers.map((o) => o.opponent.name === rivalName && o.label !== GRUDGE_LABEL ? { ...o, opponent: { ...o.opponent, name: otherName(st, o.id, [rivalName, st.fighter.name]) } } : o);
  }
  if (life.promoterFights > 0) promoterTable(st);
}
function otherName(st, key, avoid) {
  let h = (st.seed ^ 668265263) >>> 0;
  for (let i = 0; i < key.length; i += 1) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  const rng = rngFrom(h >>> 0);
  let name = genFighterName(rng);
  for (let i = 0; i < 12 && avoid.includes(name); i += 1) name = genFighterName(rng);
  return name;
}
function promoterTable(st) {
  if (st.offers.length < 2) return;
  st.offers = st.offers.slice(1).map((o) => ({ ...o, purse: round2(o.purse * PROMOTER_PURSE_MUL) }));
}
function applyLifeEffect(st, e) {
  const life = st.life;
  const f = st.fighter;
  if (e.cash) life.bank = round2(life.bank + e.cash);
  if (e.fans) life.fanbase = meter(life.fanbase + e.fans);
  if (e.morale) life.morale = meter(life.morale + e.morale);
  if (e.karma) life.karma = meter(life.karma + e.karma);
  if (e.heat) life.rivalryIntensity = meter(life.rivalryIntensity + e.heat);
  if (e.damage && e.damage > 0) f.damage = Math.round((f.damage + e.damage) * 10) / 10;
  if (e.age && e.age > 0) f.age = round2(f.age + e.age);
  if (e.sharp) life.sharp = clamp(Math.round(life.sharp + e.sharp), -SHARP_CAP, SHARP_CAP);
  if (e.pursePct) {
    st.offers = st.offers.map((o) => ({ ...o, purse: round2(o.purse * (1 + e.pursePct / 100)) }));
    life.tablePurseMul = Math.round((life.tablePurseMul ?? 1) * (1 + e.pursePct / 100) * 1e6) / 1e6;
  }
  if (e.rank && !st.champion && f.rank < 99) {
    f.rank = clamp(Math.round(f.rank + e.rank), 1, 98);
  }
  if (e.moveClass) {
    const to = classAfterMove(st.weight, e.moveClass);
    if (to) {
      st.weight = to;
      st.champion = false;
      f.rank = 99;
      if (life.classMoves === 0) life.firstMoveAt = st.fightNo;
      life.classMoves += 1;
      life.lastBeatenBy = null;
      delete life.lastBeatenAt;
      st.offers = offersFor(st);
      dressOffers(st);
      const carried = life.tablePurseMul ?? 1;
      if (carried !== 1) st.offers = st.offers.map((o) => ({ ...o, purse: round2(o.purse * carried) }));
    }
  }
  if (e.promoter) {
    life.promoterFights = e.promoter;
    promoterTable(st);
  }
  if (e.rematch && life.lastBeatenBy && st.offers.length) {
    const i = middleOf(st.offers);
    const base = st.offers[i];
    st.offers[i] = {
      ...base,
      id: `${base.id}r`,
      opponent: { ...life.lastBeatenBy },
      label: REMATCH_LABEL,
      rankGain: base.title ? 0 : REMATCH_RANK_GAIN + managerDef(life.manager.kind).rankBonus
    };
    life.lastBeatenBy = null;
    delete life.lastBeatenAt;
  }
  if (e.grudge) {
    const him = rivalFighter(st);
    if (him && st.offers.length) {
      const i = middleOf(st.offers);
      const base = st.offers[i];
      st.offers[i] = { ...base, id: `${base.id}g`, opponent: him, label: GRUDGE_LABEL, purse: round2(base.purse * GRUDGE_PURSE_MUL) };
    }
  }
}
var GRUDGE_LABEL = "Grudge match";
var REMATCH_LABEL = "Rematch";
var specialFightOnTable = (st) => st.offers.some((o) => o.label === GRUDGE_LABEL || o.label === REMATCH_LABEL);
var STYLE_IDS = ["outboxer", "swarmer", "slugger", "counter"];
function newLife(st, trainer = "allround", manager = "family") {
  const rng = rngFrom((st.seed ^ 739982445) >>> 0);
  const trainerName = genFighterName(rng);
  let managerName = genFighterName(rng);
  for (let i = 0; i < 8 && managerName === trainerName; i += 1) managerName = genFighterName(rng);
  let rivalName = genFighterName(rng);
  for (let i = 0; i < 8 && [st.fighter.name, trainerName, managerName].includes(rivalName); i += 1) rivalName = genFighterName(rng);
  const fights = st.fightNo;
  const wins = Math.round(fights * 0.75);
  const mine = fights > 0 ? ratingOf(st.fighter) : 52;
  const rival = {
    name: rivalName,
    style: STYLE_IDS[Math.floor(rng() * STYLE_IDS.length)],
    age: Math.round((st.fighter.age + Math.floor(rng() * 3) - 1) * 100) / 100,
    rating: clamp(Math.round(mine - 2 + rng() * 5), 30, 95),
    potential: clamp(Math.round(74 + rng() * 20), 60, 97),
    wins,
    losses: fights - wins,
    kos: Math.round(wins * 0.4),
    rank: st.champion ? 3 : st.fighter.rank === 99 ? 99 : clamp(st.fighter.rank + 2, 1, 20),
    champion: false,
    retired: false,
    h2hWins: 0,
    h2hLosses: 0,
    weight: st.weight
  };
  return {
    v: 1,
    tick: 0,
    trainer: { kind: trainerDef(trainer).id, name: trainerName },
    manager: { kind: managerDef(manager).id, name: managerName },
    bank: 0,
    shop: {},
    fanbase: START_FANS,
    morale: 50,
    karma: 50,
    rivalryIntensity: 0,
    pending: [],
    cooldowns: {},
    sharp: 0,
    carry: {},
    promoterFights: 0,
    lastBeatenBy: null,
    classMoves: 0,
    decisions: 0,
    feed: [],
    rival,
    pendingRivalryEvent: null,
    lastRivalryEventId: null,
    pendingRivalryChoice: null,
    rivalryChoicesSeen: [],
    phoneInbox: [],
    phoneUsedIds: []
  };
}
var isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
var numOr = (v, d, lo, hi) => typeof v === "number" && Number.isFinite(v) ? clamp(v, lo, hi) : d;
var strings = (v) => Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
function ensureLifeBlock(st) {
  const raw = st.life;
  const fresh = newLife(st);
  if (!isObj(raw) || raw.v !== 1) return fresh;
  const corner = (v, ok) => isObj(v) && typeof v.kind === "string" && ok(v.kind) && typeof v.name === "string" && v.name.length > 0;
  const shop = {};
  if (isObj(raw.shop)) for (const u of UPGRADES) shop[u.id] = upgradeLevel({ bank: 0, shop: raw.shop }, u.id);
  const carry = {};
  if (isObj(raw.carry)) for (const k of Object.keys(AREA_LABEL)) carry[k] = numOr(raw.carry[k], 0, -1, 1);
  const cooldowns = {};
  if (isObj(raw.cooldowns)) {
    for (const [k, v] of Object.entries(raw.cooldowns)) if (typeof v === "number" && Number.isFinite(v)) cooldowns[k] = v;
  }
  const rival = isObj(raw.rival) && typeof raw.rival.name === "string" && STYLE_IDS.includes(raw.rival.style) ? { ...fresh.rival, ...raw.rival } : raw.rival === null ? null : fresh.rival;
  if (rival && rival.weight !== void 0 && !WEIGHT_CLASSES.some((w) => w.id === rival.weight)) rival.weight = st.weight;
  if (rival && rival.last !== void 0 && rival.last !== "W" && rival.last !== "L" && rival.last !== null) delete rival.last;
  const beaten = isObj(raw.lastBeatenBy) && typeof raw.lastBeatenBy.name === "string" && isObj(raw.lastBeatenBy.attrs) ? raw.lastBeatenBy : null;
  const beatenAt = beaten ? Math.floor(numOr(raw.lastBeatenAt, st.fightNo, 0, st.fightNo)) : void 0;
  const tableMul = typeof raw.tablePurseMul === "number" && Number.isFinite(raw.tablePurseMul) && raw.tablePurseMul > 0 ? clamp(raw.tablePurseMul, 0.1, 10) : 1;
  return {
    v: 1,
    tick: numOr(raw.tick, 0, 0, 1e9),
    trainer: corner(raw.trainer, (id) => TRAINERS.some((t2) => t2.id === id)) ? raw.trainer : fresh.trainer,
    manager: corner(raw.manager, (id) => MANAGERS.some((m) => m.id === id)) ? raw.manager : fresh.manager,
    bank: round2(numOr(raw.bank, 0, -1e3, 1e5)),
    shop,
    fanbase: numOr(raw.fanbase, START_FANS, 0, 100),
    morale: numOr(raw.morale, 50, 0, 100),
    karma: numOr(raw.karma, 50, 0, 100),
    rivalryIntensity: numOr(raw.rivalryIntensity, 0, 0, 100),
    pending: strings(raw.pending).filter((id) => LIFE_CARDS.some((c) => c.id === id)),
    cooldowns,
    sharp: Math.round(numOr(raw.sharp, 0, -SHARP_CAP, SHARP_CAP)),
    carry,
    promoterFights: Math.floor(numOr(raw.promoterFights, 0, 0, 20)),
    lastBeatenBy: beaten,
    ...beatenAt !== void 0 ? { lastBeatenAt: beatenAt } : {},
    ...tableMul !== 1 ? { tablePurseMul: tableMul } : {},
    classMoves: Math.floor(numOr(raw.classMoves, 0, 0, 99)),
    ...typeof raw.firstMoveAt === "number" && Number.isFinite(raw.firstMoveAt) ? { firstMoveAt: Math.max(0, Math.floor(raw.firstMoveAt)) } : {},
    decisions: Math.floor(numOr(raw.decisions, 0, 0, 1e6)),
    feed: strings(raw.feed).slice(0, FEED_MAX),
    rival,
    pendingRivalryEvent: isObj(raw.pendingRivalryEvent) && typeof raw.pendingRivalryEvent.id === "number" ? raw.pendingRivalryEvent : null,
    lastRivalryEventId: typeof raw.lastRivalryEventId === "number" ? raw.lastRivalryEventId : null,
    pendingRivalryChoice: isObj(raw.pendingRivalryChoice) && typeof raw.pendingRivalryChoice.id === "string" && Array.isArray(raw.pendingRivalryChoice.choices) ? raw.pendingRivalryChoice : null,
    rivalryChoicesSeen: strings(raw.rivalryChoicesSeen),
    phoneInbox: Array.isArray(raw.phoneInbox) ? raw.phoneInbox.filter((m) => isObj(m) && typeof m.id === "string" && Array.isArray(m.choices)) : [],
    phoneUsedIds: strings(raw.phoneUsedIds)
  };
}
function ensureLife(st) {
  return { ...st, life: ensureLifeBlock(st) };
}
var ranked = (st) => !st.champion && st.fighter.rank < 99;
var rematchInTime = (st) => st.fightNo - (st.life.lastBeatenAt ?? st.fightNo) < REMATCH_WINDOW;
var climbing = (st) => !st.champion && st.fighter.rank > 1;
var BODY_CARDS = [
  {
    id: "weight-cut",
    emoji: "\u2696\uFE0F",
    title: "Four pounds over",
    cooldown: 6,
    text: "A week out and the scale says four pounds too many. There are three ways this goes.",
    when: (st) => st.weight !== "heavy",
    options: [
      { label: "Hire the nutritionist", effect: { cash: -0.02 }, line: "Paid a nutritionist and made the weight easily.", neutral: true },
      { label: "Sweat it out the old way", effect: { sharp: -3 }, line: "Boiled down in the sauna and felt it for days." },
      { label: "Come in heavy and pay the fine", effect: { pursePct: -15, sharp: 1 }, line: "Missed the weight, paid the fine, kept the strength." }
    ]
  },
  {
    id: "move-up",
    emoji: "\u2B06\uFE0F",
    title: "The class above",
    cooldown: 14,
    /* "Punches end fights more often" up a class, and "go the distance more"
       down one, matches the engine's koBias ladder and two sources, read
       2026-10-02: Physician and Sportsmedicine 2024, PMID 37990916 (abstract
       on Europe PMC: a significant association between KO/TKO rate and
       weight class, heavyweights highest), and
       scirp.org/journal/paperinformation?paperid=107460 (knockout wins rise
       with the division's weight). */
    text: "Your trainer thinks you have outgrown the division. Up there punches end fights more often, and nobody knows your name.",
    when: (st) => st.fightNo >= 6 && classAfterMove(st.weight, 1) !== null && !specialFightOnTable(st),
    options: [
      { label: "Move up", effect: { moveClass: 1 }, line: "Moved up a weight class and started again from the bottom of it." },
      { label: "Stay where you are", effect: {}, line: "Stayed at the weight.", neutral: true }
    ]
  },
  {
    id: "move-down",
    emoji: "\u2B07\uFE0F",
    title: "The class below",
    cooldown: 14,
    text: "Your manager thinks the money and the openings are a division down. The cut is hard and fights there go the distance more.",
    when: (st) => st.fightNo >= 6 && classAfterMove(st.weight, -1) !== null && !specialFightOnTable(st),
    options: [
      { label: "Move down", effect: { moveClass: -1, sharp: -2 }, line: "Dropped a weight class and felt the cut." },
      { label: "Stay where you are", effect: {}, line: "Stayed at the weight.", neutral: true }
    ]
  },
  {
    id: "hand-injury",
    emoji: "\u{1F915}",
    title: "The right hand",
    cooldown: 10,
    text: "A knuckle came up like an egg after sparring. It is not broken, but it is not right.",
    options: [
      { label: "See the hand specialist", effect: { cash: -0.04 }, line: "Paid the specialist and the hand came good.", neutral: true },
      { label: "Tape it and fight", effect: { damage: 1.5 }, line: "Taped the hand and fought on it anyway." },
      { label: "Rest it properly", effect: { age: 0.34 }, line: "Sat out four months to let the hand heal." }
    ]
  },
  {
    id: "scar-tissue",
    emoji: "\u{1FA78}",
    title: "Scar tissue",
    cooldown: 10,
    text: "The old cut over your eye opened again in the gym. It will open on the night too unless somebody fixes it.",
    when: (st) => st.fighter.damage >= 12,
    options: [
      { label: "Pay to have it fixed", effect: { cash: -0.05 }, line: "Had the scar tissue seen to properly.", neutral: true },
      { label: "Leave it to the corner", effect: { damage: 1 }, line: "Left the cut for the corner to deal with on the night." }
    ]
  },
  {
    id: "gym-war",
    emoji: "\u{1F4A5}",
    title: "A gym war",
    cooldown: 6,
    text: "Sparring with a bigger man turned into a real fight. Your trainer is looking at you to see what you want.",
    options: [
      { label: "Stop it there", effect: {}, line: "Called time on the sparring before it got silly.", neutral: true },
      { label: "Finish the rounds", effect: { damage: 0.8, sharp: 2 }, line: "Finished the rounds, took some, learned some." }
    ]
  },
  {
    id: "bug-in-camp",
    emoji: "\u{1F912}",
    title: "A bug in camp",
    cooldown: 8,
    text: "Half the gym is ill and you can feel it coming.",
    options: [
      { label: "Pay the doctor to get you right", effect: { cash: -0.02 }, line: "Got the doctor in early and it passed.", neutral: true },
      { label: "Train through it", effect: { sharp: -3 }, line: "Trained through the bug and had a flat camp." },
      { label: "Push the date back", effect: { age: 0.17, fans: -1 }, line: "Put the fight back two months to get well." }
    ]
  },
  {
    id: "doctors-letter",
    emoji: "\u{1F4C4}",
    title: "The doctor's letter",
    cooldown: 12,
    text: "After the wars you have been in, the ringside doctor wants extra scans before your licence is renewed.",
    when: (st) => st.fighter.damage >= 40,
    options: [
      { label: "Pay for the scans", effect: { cash: -0.03 }, line: "Paid for the scans and was cleared.", neutral: true },
      { label: "Wait for the free ones", effect: { age: 0.34 }, line: "Waited four months for the scans to come round." }
    ]
  },
  {
    id: "overcooked",
    emoji: "\u{1F975}",
    title: "Left it in the gym",
    cooldown: 7,
    /* Round 916 review: an earlier line stated a general claim about
       overtraining that no source backed and the options below contradicted.
       The card now says only what happened in this camp. */
    text: "You have been flat in the gym all week, and your trainer cannot tell yet whether you need a rest or a push.",
    when: (st) => st.fightNo >= 3,
    options: [
      { label: "Keep the schedule", effect: {}, line: "Kept to the schedule.", neutral: true },
      { label: "Take the week off", effect: { sharp: -1, morale: 3 }, line: "Took a week off and came back smiling." },
      { label: "Double sessions", effect: { sharp: 2, damage: 0.5 }, line: "Doubled the sessions and paid for the sharpness." }
    ]
  }
];
var BUSINESS_CARDS = [
  {
    id: "promoter-deal",
    emoji: "\u{1F58A}\uFE0F",
    title: "An exclusive deal",
    cooldown: 10,
    text: "A promoter wants you on his shows and nobody else's. He pays better, and he does not put on easy nights.",
    when: (st) => st.fightNo >= 4 && st.life.promoterFights === 0,
    options: [
      { label: "Sign it", effect: { promoter: 4 }, line: "Signed an exclusive promoter deal for four fights." },
      { label: "Stay a free agent", effect: {}, line: "Turned the exclusive deal down.", neutral: true }
    ]
  },
  {
    id: "rematch-clause",
    emoji: "\u{1F501}",
    title: "The rematch clause",
    cooldown: 3,
    text: "There was a rematch clause in the contract for the one you lost. Your manager can invoke it today.",
    when: (st) => !!st.life.lastBeatenBy && rematchInTime(st) && climbing(st) && st.offers.length > 0 && !st.offers[0].title && !specialFightOnTable(st),
    options: [
      { label: "Invoke it", effect: { rematch: true }, line: "Invoked the rematch clause." },
      { label: "Let it go", effect: {}, line: "Let the rematch clause lapse.", neutral: true }
    ]
  },
  {
    id: "hometown-card",
    emoji: "\u{1F3E0}",
    title: "The hometown card",
    cooldown: 8,
    text: "A hall in the town you grew up in wants you top of the bill. The gate is small and every seat is somebody you know.",
    options: [
      { label: "Fight at home", effect: { fans: 5, pursePct: -15 }, line: "Took the hometown card for less money." },
      { label: "Stay on the road", effect: {}, line: "Passed on the hometown card.", neutral: true }
    ]
  },
  {
    id: "short-notice",
    emoji: "\u23F1\uFE0F",
    title: "Short notice",
    cooldown: 6,
    text: "A main event lost a fighter and the date is two weeks away. The money is better because the camp is not a camp.",
    options: [
      { label: "Take the date", effect: { pursePct: 25, sharp: -4 }, line: "Took a fight on two weeks notice." },
      { label: "Keep your own date", effect: {}, line: "Turned down the short notice date.", neutral: true }
    ]
  },
  {
    id: "tv-slot",
    emoji: "\u{1F4FA}",
    title: "A television slot",
    cooldown: 8,
    text: "You can open a big televised card for less, or headline a small one that nobody films.",
    options: [
      { label: "Open the big card", effect: { fans: 4, pursePct: -10 }, line: "Opened a televised card and the audience found you." },
      { label: "Headline the small one", effect: {}, line: "Headlined a small show.", neutral: true }
    ]
  },
  {
    id: "glove-deal",
    emoji: "\u{1F9E4}",
    title: "A glove deal",
    cooldown: 10,
    text: "An equipment maker will pay you to wear their gloves. They are not the gloves you like.",
    options: [
      { label: "Wear theirs", effect: { cash: 0.03, morale: -2 }, line: "Signed the glove deal and missed the old pair." },
      { label: "Keep your own", effect: {}, line: "Kept your own gloves.", neutral: true }
    ]
  },
  {
    id: "advance",
    emoji: "\u{1F4B5}",
    title: "An advance",
    cooldown: 8,
    /* The cost is a fifth of whichever purse you take, so it is cheap on a
       small purse and dear on a big one. The text says that and no more: an
       earlier draft promised it always cost more than it paid, which is false
       on an unranked fighter's purses (Round 916 review). */
    text: "Your manager can get you a bit of money today against the next fight. The promoter takes a fifth of that purse back for it, big or small.",
    options: [
      { label: "Take the advance", effect: { cash: 0.05, pursePct: -20 }, line: "Took an advance against the next purse." },
      { label: "Wait for the purse", effect: {}, line: "Waited for the purse.", neutral: true }
    ]
  },
  {
    id: "tax-letter",
    emoji: "\u{1F9FE}",
    title: "The tax letter",
    cooldown: 12,
    text: "A brown envelope about last year. Nobody told you a purse was income.",
    when: (st) => st.earnings >= 0.4,
    options: [
      { label: "Pay it", effect: { cash: -0.05 }, line: "Paid the tax bill in full.", neutral: true },
      { label: "Argue it down", effect: { cash: -0.02, morale: -3 }, line: "Argued the tax bill down and lost sleep over it." }
    ]
  },
  {
    id: "step-aside",
    emoji: "\u{1F6AA}",
    title: "Step aside money",
    cooldown: 9,
    text: "A promoter wants his man to jump the queue, and he will pay you to stand still while it happens.",
    when: (st) => ranked(st) && st.fighter.rank > 1 && st.fighter.rank <= 8,
    options: [
      { label: "Take the money", effect: { cash: 0.1, rank: 2 }, line: "Took step aside money and slipped down the rankings." },
      { label: "Keep your place", effect: {}, line: "Refused to step aside.", neutral: true }
    ]
  },
  {
    id: "press-conference",
    emoji: "\u{1F3A4}",
    title: "The press conference",
    cooldown: 5,
    text: "The room is full and the cameras are waiting for somebody to say something.",
    options: [
      { label: "Give them a show", effect: { fans: 3, karma: -3 }, line: "Gave the press a show." },
      { label: "Say your piece and sit down", effect: {}, line: "Kept it short at the press conference.", neutral: true },
      { label: "Praise the other man", effect: { karma: 3 }, line: "Had nothing but respect at the press conference." }
    ]
  },
  {
    id: "undercard-favour",
    emoji: "\u{1F91D}",
    title: "A favour for the gym",
    cooldown: 9,
    text: "The gym owner wants a stablemate on your undercard. The promoter will only do it if it comes out of your end.",
    options: [
      { label: "Give up some of the purse", effect: { pursePct: -8, karma: 4 }, line: "Got a stablemate onto the undercard out of your own end." },
      { label: "Not your problem", effect: {}, line: "Left the undercard to the promoter.", neutral: true }
    ]
  },
  {
    id: "ticket-seller",
    emoji: "\u{1F39F}\uFE0F",
    title: "Selling tickets",
    cooldown: 7,
    /* Being paid partly in tickets early on, two sources read 2026-10-02:
       sportsboom.com/boxing/how-much-do-boxers-make (a new pro will likely
       start on a ticket deal with a small hall promoter) and irish-boxing.com
       /off-the-wall-former-irish-pro-outlines-the-financial-reality-of-small-hall-boxing
       (a purse paid as tickets to sell). */
    text: "Early in a career you are paid partly in tickets you sell yourself. Your phone is full of people who said they would come.",
    when: (st) => st.fighter.rank > 10,
    options: [
      { label: "Spend the week selling", effect: { cash: 0.02, sharp: -1 }, line: "Sold tickets all week instead of training." },
      { label: "Let the promoter sell them", effect: {}, line: "Left the tickets to the promoter.", neutral: true }
    ]
  },
  {
    id: "belt-parade",
    emoji: "\u{1F389}",
    title: "The parade",
    cooldown: 10,
    text: "The town wants to put you on an open bus with the belt.",
    when: (st) => st.champion,
    options: [
      { label: "Do the parade", effect: { fans: 6, sharp: -1 }, line: "Rode the bus through town with the belt." },
      { label: "Back to the gym", effect: {}, line: "Skipped the parade and went back to work.", neutral: true }
    ]
  }
];
var CAMP_CARDS = [
  {
    id: "trainer-row",
    emoji: "\u{1F5EF}\uFE0F",
    title: "A row with your trainer",
    cooldown: 7,
    text: "He wants the camp run his way and you want it run yours. Somebody has to give.",
    options: [
      { label: "Do it his way", effect: { sharp: 2, morale: -2 }, line: "Ran the camp the way the trainer wanted." },
      { label: "Do it your way", effect: { sharp: -2, morale: 2 }, line: "Ran the camp your own way." },
      { label: "Split the difference", effect: {}, line: "Met the trainer halfway.", neutral: true }
    ]
  },
  {
    id: "sparring-import",
    emoji: "\u2708\uFE0F",
    title: "A sparring partner in town",
    cooldown: 5,
    text: "A good fighter with the same style as your next man is in town for a fortnight, and he charges by the round.",
    options: [
      { label: "Pay for the rounds", effect: { cash: -0.03, sharp: 2 }, line: "Paid for two weeks of proper sparring." },
      { label: "Use the gym regulars", effect: {}, line: "Sparred with the regulars.", neutral: true }
    ]
  },
  {
    id: "tape-study",
    emoji: "\u{1F39E}\uFE0F",
    title: "Tape",
    cooldown: 5,
    text: "There is film of your next opponent going back years. Somebody could cut it up for you.",
    options: [
      { label: "Pay an analyst", effect: { cash: -0.02, sharp: 1 }, line: "Paid for a proper breakdown of the tape." },
      { label: "Watch it yourself", effect: {}, line: "Watched the tape on your own.", neutral: true }
    ]
  },
  {
    id: "mountain-camp",
    emoji: "\u26F0\uFE0F",
    title: "Camp in the mountains",
    cooldown: 6,
    text: "Thin air, no phone signal and nothing to do but run. It is not cheap and it is not fun.",
    options: [
      { label: "Book it", effect: { cash: -0.06, sharp: 3, morale: -2 }, line: "Took the camp up into the mountains." },
      { label: "Stay home", effect: {}, line: "Kept the camp at home.", neutral: true }
    ]
  },
  {
    id: "camp-cook",
    emoji: "\u{1F372}",
    title: "The cook",
    cooldown: 6,
    text: "You have been living on whatever is quick. A cook for the camp would sort that out.",
    options: [
      { label: "Hire a cook", effect: { cash: -0.02, sharp: 1 }, line: "Hired a cook for the camp." },
      { label: "Cook for yourself", effect: {}, line: "Kept cooking for yourself.", neutral: true }
    ]
  },
  {
    id: "bigger-gym",
    emoji: "\u{1F3E2}",
    title: "A bigger gym",
    cooldown: 12,
    text: "A gym across town has better kit and better bodies to work with. Your own gym has known you since you were a kid.",
    options: [
      { label: "Train across town this camp", effect: { cash: -0.04, sharp: 2, morale: -2 }, line: "Trained across town and felt like a visitor." },
      { label: "Stay loyal", effect: { morale: 2 }, line: "Stayed at the old gym." },
      { label: "Think about it next time", effect: {}, line: "Put the gym question off.", neutral: true }
    ]
  },
  {
    id: "camera-crew",
    emoji: "\u{1F3A5}",
    title: "A camera crew",
    cooldown: 8,
    text: "A film crew wants to follow your camp for a behind the scenes piece. They get in the way of everything.",
    when: (st) => st.life.fanbase >= 12,
    options: [
      { label: "Let them in", effect: { fans: 4, sharp: -1 }, line: "Let a camera crew into camp." },
      { label: "Closed camp", effect: {}, line: "Kept the camp closed.", neutral: true }
    ]
  },
  {
    id: "wedding",
    emoji: "\u{1F492}",
    title: "A wedding in camp week",
    cooldown: 10,
    text: "A family wedding lands right in the middle of the hard weeks.",
    options: [
      { label: "Go, and enjoy it", effect: { sharp: -1, morale: 4 }, line: "Went to the wedding and danced." },
      { label: "Send a gift and stay in camp", effect: { cash: -0.01 }, line: "Sent a gift and stayed in camp.", neutral: true },
      { label: "Skip it and say nothing", effect: { morale: -3, karma: -2 }, line: "Missed the wedding without a word." }
    ]
  }
];
var HOME_CARDS = [
  {
    id: "the-car",
    emoji: "\u{1F697}",
    title: "The car",
    cooldown: 14,
    text: "You have wanted one since you were fourteen and there it is in the showroom.",
    when: (st) => st.life.bank >= 0.1,
    options: [
      { label: "Buy it", effect: { cash: -0.08, morale: 5 }, line: "Bought the car." },
      { label: "Keep the old one", effect: {}, line: "Walked out of the showroom.", neutral: true }
    ]
  },
  {
    id: "old-friends",
    emoji: "\u{1F465}",
    title: "Old friends",
    cooldown: 10,
    text: "Friends from home want jobs in the camp. None of them can hold pads.",
    options: [
      { label: "Put them on the payroll", effect: { cash: -0.03, morale: 4 }, line: "Put old friends on the camp payroll." },
      { label: "Buy them dinner and leave it", effect: { cash: -0.01 }, line: "Bought dinner and kept the camp small.", neutral: true },
      { label: "Tell them no", effect: { karma: -2 }, line: "Told old friends there was no job." }
    ]
  },
  {
    id: "amateur-club",
    emoji: "\u{1F3DA}\uFE0F",
    title: "The amateur club",
    cooldown: 12,
    text: "The club where you learned to box needs a new ring and has no money for one.",
    options: [
      { label: "Pay for the ring", effect: { cash: -0.05, fans: 3, karma: 4 }, line: "Paid for a new ring at the old amateur club." },
      { label: "Send signed gloves for the raffle", effect: { fans: 1 }, line: "Sent signed gloves to the amateur club.", neutral: true },
      { label: "Not this year", effect: { karma: -1 }, line: "Turned the amateur club down." }
    ]
  },
  {
    id: "night-out",
    emoji: "\u{1F303}",
    title: "A night out",
    cooldown: 5,
    text: "The fight is done and your phone will not stop. Everybody is already out.",
    options: [
      { label: "Go out", effect: { morale: 3, karma: -2, fans: 1 }, line: "Had the night out and was seen having it." },
      { label: "Stay in", effect: {}, line: "Stayed in.", neutral: true }
    ]
  },
  {
    id: "kids-session",
    emoji: "\u{1F9D2}",
    title: "The kids at the gym",
    cooldown: 6,
    text: "The junior class has asked whether you would take a session.",
    options: [
      { label: "Take the session", effect: { karma: 3, fans: 1 }, line: "Took the junior class for an afternoon." },
      { label: "Not this week", effect: {}, line: "Passed on the junior class.", neutral: true }
    ]
  },
  {
    id: "hospital-visit",
    emoji: "\u{1F3E5}",
    title: "A hospital visit",
    cooldown: 9,
    text: "The local ward has asked for a visit. Your manager wants to bring a photographer.",
    options: [
      { label: "Go quietly", effect: { karma: 4 }, line: "Visited the ward with nobody watching." },
      { label: "Go with the photographer", effect: { fans: 3, karma: -1 }, line: "Visited the ward and made the papers." },
      { label: "Send a signed glove", effect: { fans: 1 }, line: "Sent a signed glove to the ward.", neutral: true }
    ]
  },
  {
    id: "house-for-mum",
    emoji: "\u{1F3E1}",
    title: "A house for your mother",
    cooldown: 60,
    text: "You said you would do it with the first real money. This is the first real money.",
    when: (st) => st.life.bank >= 0.3,
    options: [
      { label: "Buy the house", effect: { cash: -0.25, morale: 8, karma: 3 }, line: "Bought your mother a house." },
      { label: "Not yet", effect: {}, line: "Put the house off.", neutral: true }
    ]
  },
  {
    id: "signing",
    emoji: "\u270D\uFE0F",
    title: "A signing",
    cooldown: 6,
    text: "A shop in town will pay you to sit at a table for two hours and sign things.",
    when: (st) => st.life.fanbase >= 10,
    options: [
      { label: "Sit for it", effect: { cash: 0.02, fans: 1 }, line: "Sat for a signing in town." },
      { label: "Skip it", effect: {}, line: "Skipped the signing.", neutral: true }
    ]
  },
  {
    id: "the-prospect",
    emoji: "\u{1F331}",
    title: "A prospect asks for advice",
    cooldown: 8,
    text: "A kid turning professional next month wants to know what you wish somebody had told you.",
    when: (st) => st.fightNo >= 8,
    options: [
      { label: "Give him the afternoon", effect: { karma: 3 }, line: "Spent an afternoon with a young prospect." },
      { label: "Too busy this week", effect: {}, line: "Had no time for the prospect.", neutral: true }
    ]
  },
  {
    id: "after-the-fight",
    emoji: "\u{1F4F2}",
    title: "Your phone after the fight",
    cooldown: 4,
    text: "The clip is everywhere. You could say something while people are still looking.",
    options: [
      { label: "Call out your rival", effect: { fans: 3, heat: 6, karma: -1 }, line: "Called out your rival while the clip was hot." },
      { label: "Thank the people who came", effect: { fans: 1 }, line: "Thanked the crowd and logged off.", neutral: true },
      { label: "Say nothing at all", effect: { karma: 1 }, line: "Stayed off the phone." }
    ]
  }
];
var LIFE_CARDS = [...BODY_CARDS, ...BUSINESS_CARDS, ...CAMP_CARDS, ...HOME_CARDS];
var lifeCardById = (id) => LIFE_CARDS.find((c) => c.id === id);
var CARDS_PER_FIGHT = 2;
function eligibleCards(st) {
  return LIFE_CARDS.filter((c) => (st.life.cooldowns[c.id] ?? 0) <= st.fightNo && !st.life.pending.includes(c.id) && (!c.when || c.when(st)));
}
function dealLifeCards(st) {
  const { rng, done } = lifeStream(st);
  const pool = eligibleCards(st);
  const dealt = [];
  while (dealt.length < CARDS_PER_FIGHT && pool.length > 0) {
    const card = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    dealt.push(card.id);
    st.life.cooldowns[card.id] = st.fightNo + card.cooldown;
  }
  st.life.pending = [...st.life.pending, ...dealt];
  done();
  return dealt;
}
var stillOpen = (st, card) => !card.when || card.when(st);
function pendingLifeCard(st) {
  const pending = st.life?.pending;
  if (!pending) return null;
  for (const id of pending) {
    const card = lifeCardById(id);
    if (card && stillOpen(st, card)) return card;
  }
  return null;
}
function lapseClosedCards(st) {
  st.life.pending = st.life.pending.filter((id) => {
    const waiting = lifeCardById(id);
    if (!waiting) return false;
    if (stillOpen(st, waiting)) return true;
    pushFeed(st.life, `${waiting.emoji} ${waiting.title}: no longer on the table.`);
    return false;
  });
}
function answerLifeCard(st, optionIdx) {
  const next = cloneForLife(st);
  const card = pendingLifeCard(next);
  const option2 = card?.options[optionIdx];
  if (!card || !option2) return null;
  lapseClosedCards(next);
  applyLifeEffect(next, option2.effect);
  next.life.decisions += 1;
  pushFeed(next.life, `${card.emoji} ${option2.line}`);
  next.life.pending = next.life.pending.filter((id) => id !== card.id);
  lapseClosedCards(next);
  return { state: next, line: option2.line };
}
var stepOf = (id) => UPGRADES.find((u) => u.id === id)?.step ?? 0;
var AREA_ATTR = {
  conditioning: "stamina",
  power: "power",
  defence: "defence",
  speed: "speed"
};
var AREA_UPGRADE = {
  conditioning: "roadwork",
  power: "strength",
  defence: "padman",
  speed: "padman"
};
function campGrowthMul(st, area) {
  const up = AREA_UPGRADE[area];
  return (trainerDef(st.life.trainer.kind).grow[area] ?? 1) * (1 + upgradeLevel(st.life, up) * stepOf(up));
}
function settleCampCarry(before, after, plan) {
  const pot = Math.min(99, before.fighter.potential);
  for (const area of Object.keys(AREA_ATTR)) {
    const mul = campGrowthMul(before, area);
    if (mul === 1) continue;
    const attr = AREA_ATTR[area];
    const was = before.fighter.attrs[attr];
    let carry = (after.life.carry[area] ?? 0) + campGain(was, pot, plan[area]) * (mul - 1);
    while (carry >= 1 && after.fighter.attrs[attr] < pot) {
      after.fighter.attrs[attr] += 1;
      carry -= 1;
    }
    while (carry <= -1 && after.fighter.attrs[attr] > was) {
      after.fighter.attrs[attr] -= 1;
      carry += 1;
    }
    after.life.carry[area] = clamp(Math.round(carry * 1e3) / 1e3, -1, 1);
  }
}
function lifeSharpness(st) {
  const mood = Math.trunc((st.life.morale - 50) / MORALE_PER_SHARP);
  const total = st.life.sharp + trainerDef(st.life.trainer.kind).sharp + upgradeLevel(st.life, "sparring") * stepOf("sparring") + mood;
  return clamp(Math.round(total), -SHARP_CAP, SHARP_CAP);
}
function lifeFightMods(st) {
  const mods = {};
  const lvl = upgradeLevel(st.life, "cutman");
  if (lvl > 0) mods.damageMul = 1 - lvl * stepOf("cutman");
  const sharp = lifeSharpness(st);
  if (sharp) mods.sharp = sharp;
  return mods;
}
function lifePurseMul(st) {
  return managerDef(st.life.manager.kind).purseMul * (1 + st.life.fanbase * FAN_PURSE_STEP) * (st.life.promoterFights > 0 ? PROMOTER_PURSE_MUL : 1);
}
function lifeTakeHome(st, purse) {
  return purseAfterCuts(purse, [trainerDef(st.life.trainer.kind).cut, managerDef(st.life.manager.kind).cut]);
}

// src/lib/fightCareerInbox.ts
var fightCareerInbox_exports = {};
__export(fightCareerInbox_exports, {
  FIGHT_INBOX_CALENDAR: () => FIGHT_INBOX_CALENDAR,
  FIGHT_INBOX_POOL: () => FIGHT_INBOX_POOL,
  FIGHT_INBOX_TEXTS: () => FIGHT_INBOX_TEXTS,
  answerFightInbox: () => answerFightInbox,
  describeInboxChoice: () => describeInboxChoice,
  fightInboxSport: () => fightInboxSport,
  fightInboxTick: () => fightInboxTick,
  inboxChoiceEffect: () => inboxChoiceEffect,
  neutralInboxChoice: () => neutralInboxChoice,
  unreadFightInbox: () => unreadFightInbox
});

// src/lib/keyedRng.ts
function keyedRng(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = a + 1831565813 | 0;
    let t2 = Math.imul(a ^ a >>> 15, 1 | a);
    t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2;
    return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296;
  };
}

// src/lib/careerInbox.ts
var clamp2 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function pickInboxTexts(pool, age, phase, usedIds, count, rng = Math.random) {
  const used = new Set(usedIds);
  const fits = pool.filter(
    (t2) => !used.has(t2.id) && (t2.phase === "any" || t2.phase === phase) && (t2.minAge === void 0 || age >= t2.minAge) && (t2.maxAge === void 0 || age <= t2.maxAge)
  );
  const out = [];
  const left = [...fits];
  while (out.length < count && left.length > 0) {
    const i = Math.floor(rng() * left.length);
    out.push(left[i]);
    left.splice(i, 1);
  }
  return out;
}
function pickBeatTexts(pool, calendar, beats, age, phase, usedIds, count, rng = Math.random) {
  const atBeat = (b) => pool.filter((t2) => t2.beat === b.id);
  const open = calendar.filter(
    (b) => beats.includes(b.id) && pickInboxTexts(atBeat(b), age, phase, usedIds, 1, () => 0).length > 0
  );
  const chosen = open.filter((b) => b.oneOff).slice(0, count);
  const rest = open.filter((b) => !b.oneOff);
  while (chosen.length < count && rest.length > 0) {
    const i = Math.floor(rng() * rest.length);
    chosen.push(rest[i]);
    rest.splice(i, 1);
  }
  chosen.sort((a, b) => calendar.indexOf(a) - calendar.indexOf(b));
  return chosen.map((b) => ({ def: pickInboxTexts(atBeat(b), age, phase, usedIds, 1, rng)[0], beat: b.id }));
}
function receiveInboxTexts(s, phase, sport, rng = Math.random, beats) {
  driftInboxMood(s, sport);
  return deliverInboxTexts(s, phase, sport, rng, beats);
}
function driftInboxMood(s, sport) {
  const mood = sport.moodOf(s);
  const next = mood > 50 ? mood - 2 : mood < 50 ? Math.min(50, mood + 2) : mood;
  if (next >= 70) {
    sport.addPopularity(s, 2);
    s.morale = clamp2(s.morale + 2, 0, 100);
  } else if (next <= 30) {
    sport.addPopularity(s, -2);
    s.morale = clamp2(s.morale - 1, 0, 100);
  }
  sport.setMood(s, next);
}
function deliverInboxTexts(s, phase, sport, rng = Math.random, beats) {
  const inbox = [...s.phoneInbox ?? []];
  const used = [...s.phoneUsedIds ?? []];
  const unanswered = inbox.filter((m) => m.answered === void 0).length;
  const want = Math.max(0, sport.wantPerSeason - unanswered);
  const year = sport.yearOf(s);
  const age = sport.ageOf(s);
  const fresh = [];
  const deliver = (def, beat2) => {
    const msg = { id: `${def.id}-${year}`, defId: def.id, from: def.from, emoji: def.emoji, text: def.text, year, choices: def.choices, ...beat2 ? { beat: beat2 } : {} };
    inbox.push(msg);
    fresh.push(msg);
    used.push(def.id);
  };
  if (beats === void 0) {
    for (const def of pickInboxTexts(sport.pool, age, phase, used, want, rng)) {
      deliver(def);
    }
  } else {
    for (const pick of pickBeatTexts(sport.pool, sport.calendar ?? [], beats, age, phase, used, want, rng)) {
      deliver(pick.def, pick.beat);
    }
  }
  while (inbox.length > sport.maxInbox) {
    const idx = inbox.findIndex((m) => m.answered !== void 0);
    if (idx === -1) break;
    inbox.splice(idx, 1);
  }
  s.phoneInbox = inbox;
  s.phoneUsedIds = used;
  return fresh;
}
function unreadInboxCount(s) {
  return (s.phoneInbox ?? []).filter((m) => m.answered === void 0).length;
}
function answerInboxMessage(s, msgId, choiceIdx, sport) {
  const inbox = [...s.phoneInbox ?? []];
  const i = inbox.findIndex((m) => m.id === msgId);
  if (i === -1) return null;
  const msg = inbox[i];
  if (msg.answered !== void 0) return null;
  const choice = msg.choices[choiceIdx];
  if (!choice) return null;
  inbox[i] = { ...msg, answered: choiceIdx };
  s.phoneInbox = inbox;
  sport.setMood(s, clamp2(sport.moodOf(s) + choice.karma, 0, 100));
  if (choice.morale) s.morale = clamp2(s.morale + choice.morale, 0, 100);
  if (choice.popularity) sport.addPopularity(s, choice.popularity);
  if (choice.cash) sport.addCash(s, choice.cash);
  const swing = choice.karma >= 5 ? " Karma up." : choice.karma <= -5 ? " Karma down." : "";
  return `\u{1F4F1} Replied to ${msg.from}: ${choice.label}.${swing}`;
}

// src/lib/fightCareerInbox.ts
var FIGHT_INBOX_CALENDAR = [
  { id: "debut", label: "Your debut", emoji: "\u{1F514}", oneOff: true },
  { id: "title", label: "Title night", emoji: "\u{1F3C6}", oneOff: true },
  { id: "win", label: "After a win", emoji: "\u2705" },
  { id: "loss", label: "After a loss", emoji: "\u274C" },
  { id: "gym", label: "In the gym", emoji: "\u{1F94A}" }
];
var TRAINER = "Your trainer";
var MANAGER = "Your manager";
var MOTHER = "Your mother";
var GYM_OWNER = "The gym owner";
var AMATEUR_COACH = "Your old amateur coach";
var CUT_MAN = "Your cut man";
var REPORTER = "A local reporter";
var SPARRING = "Your sparring partner";
var SISTER = "Your sister";
var t = (id, beat2, from, emoji, text, choices) => ({ id, beat: beat2, from, emoji, text, phase: "pro", choices });
var FIGHT_INBOX_POOL = [
  t("fi-debut-mum", "debut", MOTHER, "\u{1F469}", "I watched it through my fingers. Are you eating properly?", [
    { label: "Call her back", reply: "Rang home and stayed on for an hour.", karma: 4, morale: 2 },
    { label: "Send a thumbs up", reply: "Sent a thumbs up.", karma: 0 }
  ]),
  t("fi-debut-coach", "debut", AMATEUR_COACH, "\u{1F9D3}", "Saw the result. You dropped your left hand twice. Proud of you anyway.", [
    { label: "Thank him properly", reply: "Told him none of it happens without him.", karma: 3 },
    { label: "Say you will fix the left hand", reply: "Promised to keep the left hand up.", karma: 0 }
  ]),
  t("fi-title-manager", "title", MANAGER, "\u{1F4BC}", "Phone has not stopped. Everybody wants a piece of the champion now. Rest, I will sort them.", [
    { label: "Tell him to say yes to the local ones", reply: "Asked for the local requests to come first.", karma: 2, popularity: 2 },
    { label: "Leave it with him", reply: "Left the phone to the manager.", karma: 0 }
  ]),
  t("fi-title-sister", "title", SISTER, "\u{1F467}", "The whole street was in our front room. Mum cried. Dad pretended he did not.", [
    { label: "Bring the belt round", reply: "Took the belt home for the street to hold.", karma: 4, morale: 3 },
    { label: "Tell her you will call tomorrow", reply: "Said you would ring in the morning.", karma: 0 }
  ]),
  t("fi-title-reporter", "title", REPORTER, "\u{1F4F0}", "Any chance of ten minutes for the paper? People round here have followed you since the amateurs.", [
    { label: "Give him the ten minutes", reply: "Sat down with the local paper.", karma: 2, popularity: 3 },
    { label: "Point him at your manager", reply: "Passed the request to the manager.", karma: 0 },
    { label: "Ignore it", reply: "Left the local paper on read.", karma: -3 }
  ]),
  t("fi-win-trainer", "win", TRAINER, "\u{1F9E2}", "Good night. Take three days, then we look at the tape. There is plenty on it.", [
    { label: "Ask for the tape tonight", reply: "Asked to see the tape before the swelling went down.", karma: 2 },
    { label: "Take the three days", reply: "Took the three days.", karma: 0 }
  ]),
  t("fi-win-sparring", "win", SPARRING, "\u{1F94A}", "Told you that counter would land. You owe me a dinner.", [
    { label: "Buy the dinner", reply: "Bought dinner for the man who took the punches in camp.", karma: 3, cash: -0.01 },
    { label: "Tell him he owes you two", reply: "Told him the score was the other way round.", karma: 0 }
  ]),
  t("fi-win-owner", "win", GYM_OWNER, "\u{1F3DB}\uFE0F", "Three kids walked in this morning asking where you train. Putting your poster up by the door.", [
    { label: "Come in and meet them", reply: "Went in on a day off to meet the new kids.", karma: 3, popularity: 1 },
    { label: "Tell him to use the good photo", reply: "Asked for the good photo on the poster.", karma: 0 }
  ]),
  t("fi-win-reporter", "win", REPORTER, "\u{1F4F0}", "Good win. Who is next? People are asking and I would rather print something true.", [
    { label: "Name the man you want", reply: "Named a name for the paper.", karma: -1, popularity: 3 },
    { label: "Say that is the manager's job", reply: "Said the next fight was the manager's business.", karma: 0 }
  ]),
  t("fi-win-mum", "win", MOTHER, "\u{1F469}", "Well done. Your face looks fine on the photos. Is it fine?", [
    { label: "Send her a photo to prove it", reply: "Sent a photo with both eyes open.", karma: 2, morale: 1 },
    { label: "Tell her it is fine", reply: "Said it was fine.", karma: 0 }
  ]),
  t("fi-win-cutman", "win", CUT_MAN, "\u{1FA79}", "Easy night for me. Long may it last.", [
    { label: "Slip him a bit extra", reply: "Put a bit extra in the cut man's pocket.", karma: 3, cash: -0.01 },
    { label: "Tell him not to get used to it", reply: "Told the cut man not to get comfortable.", karma: 0 }
  ])
];
var MORE_TEXTS = [
  t("fi-loss-trainer", "loss", TRAINER, "\u{1F9E2}", "That one is on me as much as you. Wrong plan. We go again.", [
    { label: "Tell him it was your fault", reply: "Took the blame for the night.", karma: 3 },
    { label: "Say you will be in on Monday", reply: "Said Monday, usual time.", karma: 0 },
    { label: "Agree it was his plan", reply: "Agreed the plan was wrong, and said so.", karma: -4, morale: -2 }
  ]),
  t("fi-loss-mum", "loss", MOTHER, "\u{1F469}", "Come home for a few days. I do not care about the result.", [
    { label: "Go home", reply: "Went home and was fed until it stopped hurting.", karma: 3, morale: 3 },
    { label: "Tell her you are fine", reply: "Said you were fine.", karma: 0 }
  ]),
  t("fi-loss-manager", "loss", MANAGER, "\u{1F4BC}", "It is one loss. I have already had two calls. Nobody has forgotten you.", [
    { label: "Ask him to find the right fight back", reply: "Asked for a sensible way back.", karma: 1 },
    { label: "Thank him and leave it", reply: "Left the comeback to the manager.", karma: 0 }
  ]),
  t("fi-loss-coach", "loss", AMATEUR_COACH, "\u{1F9D3}", "You lost your first amateur fight too. Remember what you did the week after?", [
    { label: "Tell him you remember", reply: "Remembered the week after, and went for a run.", karma: 2, morale: 2 },
    { label: "Send back a smile", reply: "Sent a smile.", karma: 0 }
  ]),
  t("fi-loss-sparring", "loss", SPARRING, "\u{1F94A}", "He caught you with the one we worked on. Sorry. I should have thrown it more in camp.", [
    { label: "Tell him it is not on him", reply: "Told the sparring partner he did his job.", karma: 3 },
    { label: "Say see you in the gym", reply: "Said see you in the gym.", karma: 0 }
  ]),
  t("fi-loss-reporter", "loss", REPORTER, "\u{1F4F0}", "Tough night. Do you want to say anything before I write it up?", [
    { label: "Give the other man his credit", reply: "Gave the winner his credit in print.", karma: 3, popularity: 1 },
    { label: "No comment", reply: "Had no comment.", karma: 0 },
    { label: "Blame the judges", reply: "Blamed the cards in the paper.", karma: -5, popularity: -1 }
  ]),
  t("fi-gym-owner-rent", "gym", GYM_OWNER, "\u{1F3DB}\uFE0F", "Roof is leaking over the heavy bags again. Not asking, just telling you why there is a bucket.", [
    { label: "Pay for the roof", reply: "Paid to have the gym roof patched.", karma: 5, cash: -0.02 },
    { label: "Offer to move the bags", reply: "Moved the bags out from under the drip.", karma: 0 }
  ]),
  t("fi-gym-trainer-roadwork", "gym", TRAINER, "\u{1F9E2}", "Six in the morning at the track. Do not make me come and get you.", [
    { label: "Be there at half five", reply: "Was at the track before the trainer.", karma: 2, morale: 1 },
    { label: "Be there at six", reply: "Was at the track at six.", karma: 0 },
    { label: "Ask for seven", reply: "Asked for seven and got a look.", karma: -2 }
  ]),
  t("fi-gym-sister-tickets", "gym", SISTER, "\u{1F467}", "Fourteen people from work want tickets for the next one. Fourteen.", [
    { label: "Sort all fourteen", reply: "Found fourteen tickets.", karma: 3, popularity: 1, cash: -0.01 },
    { label: "Send her the box office number", reply: "Sent the box office number.", karma: 0 }
  ]),
  t("fi-gym-cutman-kit", "gym", CUT_MAN, "\u{1FA79}", "Need new end swells and I am out of the good adrenaline. Do I go through the manager or you?", [
    { label: "Tell him to send you the bill", reply: "Paid for the cut man's kit yourself.", karma: 2, cash: -0.01 },
    { label: "Send him to the manager", reply: "Sent the cut man to the manager.", karma: 0 }
  ]),
  t("fi-gym-manager-interview", "gym", MANAGER, "\u{1F4BC}", "Radio want you on the breakfast show. It is early and it is free. Your call.", [
    { label: "Do the radio", reply: "Did the breakfast show half asleep.", karma: 0, popularity: 2 },
    { label: "Tell him you are in camp", reply: "Said camp comes first.", karma: 1 }
  ]),
  t("fi-gym-coach-kids", "gym", AMATEUR_COACH, "\u{1F9D3}", "Got a twelve year old here who moves like you did. Would mean a lot if you watched him spar.", [
    { label: "Go and watch", reply: "Watched a twelve year old spar and saw it too.", karma: 4 },
    { label: "Ask him to film it", reply: "Asked for a video.", karma: 0 }
  ]),
  t("fi-gym-sparring-borrow", "gym", SPARRING, "\u{1F94A}", "Short this month. Any chance of a sub until the next camp?", [
    { label: "Lend it", reply: "Lent the sparring partner what he needed.", karma: 4, cash: -0.01 },
    { label: "Offer extra rounds instead", reply: "Offered more paid rounds instead of a loan.", karma: 0 },
    { label: "Say no", reply: "Said no to the loan.", karma: -2 }
  ]),
  t("fi-gym-mum-sunday", "gym", MOTHER, "\u{1F469}", "Sunday dinner. I know you are making weight. I will do you a plate with no potatoes.", [
    { label: "Be there", reply: "Went for Sunday dinner and ate the plate with no potatoes.", karma: 2, morale: 2 },
    { label: "Say you will try", reply: "Said you would try.", karma: 0 }
  ]),
  t("fi-gym-reporter-profile", "gym", REPORTER, "\u{1F4F0}", "Thinking of a longer piece about the gym. Would you be in it?", [
    { label: "Make it about the gym, not you", reply: "Pointed the paper at the people who run the gym.", karma: 4 },
    { label: "Say yes", reply: "Agreed to the piece.", karma: 0, popularity: 2 }
  ]),
  t("fi-gym-trainer-weight", "gym", TRAINER, "\u{1F9E2}", "Scale this morning was not pretty. What did you eat?", [
    { label: "Tell the truth", reply: "Owned up to the takeaway.", karma: 2 },
    { label: "Say you will run it off", reply: "Promised to run it off.", karma: 0 },
    { label: "Say the scale is broken", reply: "Blamed the scale.", karma: -3 }
  ]),
  t("fi-gym-owner-banner", "gym", GYM_OWNER, "\u{1F3DB}\uFE0F", "Want to hang a banner with your record on it. Do you mind?", [
    { label: "Ask him to put the whole gym on it", reply: "Asked for every pro in the gym to be on the banner.", karma: 3 },
    { label: "Tell him to go ahead", reply: "Said go ahead.", karma: 0, popularity: 1 }
  ]),
  t("fi-gym-manager-offer", "gym", MANAGER, "\u{1F4BC}", "Had a silly offer for an exhibition overseas. Said no for you. Shout if I was wrong.", [
    { label: "Tell him he was right", reply: "Backed the manager.", karma: 1 },
    { label: "Say nothing", reply: "Let it lie.", karma: 0 }
  ])
];
var FIGHT_INBOX_TEXTS = [...FIGHT_INBOX_POOL, ...MORE_TEXTS];
function neutralInboxChoice(m) {
  return m.choices.findIndex((c) => c.karma === 0 && !c.morale);
}
function inboxChoiceEffect(c) {
  const e = {};
  if (c.karma) e.karma = c.karma;
  if (c.morale) e.morale = c.morale;
  if (c.popularity) e.fans = c.popularity;
  if (c.cash) e.cash = c.cash;
  return e;
}
var describeInboxChoice = (c) => describeLifeEffect(inboxChoiceEffect(c));
function fightInboxSport(st) {
  return {
    pool: FIGHT_INBOX_TEXTS,
    calendar: FIGHT_INBOX_CALENDAR,
    moodOf: (l) => l.karma,
    setMood: (l, v) => {
      l.karma = v;
    },
    addPopularity: (l, d) => {
      l.fanbase = Math.max(0, Math.min(100, l.fanbase + d));
    },
    addCash: (l, amount) => {
      l.bank = round2(l.bank + amount);
    },
    ageOf: () => Math.floor(st.fighter.age),
    /* A text is dated by the fight it followed: this game has no calendar year. */
    yearOf: () => st.fightNo,
    maxInbox: 10,
    wantPerSeason: 1
  };
}
function fightInboxTick(st, life, beats) {
  const rng = keyedRng(`${st.seed}|${st.fightNo}|${life.phoneUsedIds.length}|fight-inbox`);
  return receiveInboxTexts(life, "pro", fightInboxSport(st), rng, beats);
}
function answerFightInbox(st, life, msgId, choiceIdx) {
  const line = answerInboxMessage(life, msgId, choiceIdx, fightInboxSport(st));
  return line;
}
var unreadFightInbox = (life) => unreadInboxCount(life);

// src/lib/fightCareerRivalry.ts
var fightCareerRivalry_exports = {};
__export(fightCareerRivalry_exports, {
  FIGHT_RIVALRY_CHOICES: () => FIGHT_RIVALRY_CHOICES,
  FIGHT_RIVALRY_EVENTS: () => FIGHT_RIVALRY_EVENTS,
  RIVALRY_CHOICE_CHANCE: () => RIVALRY_CHOICE_CHANCE,
  RIVAL_RETIRED_EVENT_ID: () => RIVAL_RETIRED_EVENT_ID,
  answerFightRivalryChoice: () => answerFightRivalryChoice,
  dismissFightRivalryEvent: () => dismissFightRivalryEvent,
  fightRivalryTick: () => fightRivalryTick,
  neutralRivalryChoice: () => neutralRivalryChoice,
  rivalFightNight: () => rivalFightNight,
  rivalRankLabel: () => rivalRankLabel,
  settleGrudge: () => settleGrudge
});

// src/lib/careerRivalryEvents.ts
function rivalryEventPool(p, r, defs) {
  return defs.filter((d) => d.when(p, r)).map((d) => ({ id: d.id, emoji: d.emoji, title: d.title, description: d.description(p, r), consequence: typeof d.consequence === "function" ? d.consequence(p, r) : d.consequence }));
}
function rollRivalryEvent(p, r, lastId, defs, rng = Math.random) {
  if (!r || r.retired) return null;
  if (rng() >= 0.5) return null;
  const pool = rivalryEventPool(p, r, defs).filter((e) => e.id !== lastId);
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}
function forcedRetirementEvent(p, r, lastId, defs, retirementEventId) {
  if (!r?.retired || lastId === retirementEventId) return null;
  return rivalryEventPool(p, r, defs).find((e) => e.id === retirementEventId) ?? null;
}
function applyRivalryEvent(s, r, event, defs, rng, pushLine) {
  const def = defs.find((d) => d.id === event.id);
  if (def) def.apply(s, r, rng, pushLine, event);
  pushLine(`${event.emoji} ${event.title}`);
}

// src/lib/careerRivalryChoices.ts
function rivalryChoiceOpen(p, r, def) {
  return !!r && !r.retired && def.when(p, r);
}
function rivalryChoiceCard(def, p, r) {
  return {
    id: def.id,
    emoji: def.emoji,
    title: def.title,
    description: typeof def.description === "string" ? def.description : def.description(p, r),
    choices: def.choices.map((c) => c.risk === void 0 ? { label: c.label, emoji: c.emoji, consequence: c.consequence } : { label: c.label, emoji: c.emoji, consequence: c.consequence, risk: c.risk })
  };
}
function rollRivalryChoice(p, r, seenIds, defs, chance, rng = Math.random) {
  if (!r || r.retired) return null;
  if (rng() >= chance) return null;
  const unseen = defs.filter((d) => !seenIds.includes(d.id));
  const pool = (unseen.length > 0 ? unseen : defs).filter((d) => rivalryChoiceOpen(p, r, d));
  if (pool.length === 0) return null;
  return rivalryChoiceCard(pool[Math.floor(rng() * pool.length)], p, r);
}
function resolveRivalryChoice(s, r, id, choiceIdx, defs, rng) {
  const def = defs.find((d) => d.id === id);
  const option2 = def?.choices[choiceIdx];
  if (!option2) return null;
  return option2.apply(s, r, rng);
}

// src/lib/fightCareerRivalry.ts
var round22 = (v) => Math.round(v * 100) / 100;
var clamp3 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var levelAt = (rank) => rank >= 99 ? 50 : rank === 0 ? 88 : 86 - Math.min(rank, 20) * 1.2;
function rivalFightNight(st, life, foughtYou = false) {
  const r = life.rival;
  if (!r || r.retired) return null;
  const rng = keyedRng(`${st.seed}|${st.fightNo}|fight-rival`);
  r.age = round22(r.age + 0.34);
  const drift = r.age < 29 ? Math.min(1.2, (r.potential - r.rating) * 0.12) : r.age < 32 ? 0 : -0.8;
  r.rating = clamp3(Math.round((r.rating + drift) * 10) / 10, 30, 97);
  r.last = null;
  if (r.age >= 36.5 || r.age >= 32 && r.rating < 55) {
    r.retired = true;
    r.champion = false;
    if (life.lastBeatenBy?.name === r.name) {
      life.lastBeatenBy = null;
      delete life.lastBeatenAt;
    }
    return `${r.name} has retired at ${r.wins} and ${r.losses}.`;
  }
  if (foughtYou) return null;
  if (rng() < 0.2) return null;
  const won = rng() < clamp3(0.55 + (r.rating - levelAt(r.champion ? 0 : r.rank)) / 40, 0.2, 0.9);
  const cur = r.rank >= 99 ? 20 : r.rank;
  r.last = won ? "W" : "L";
  if (won) {
    r.wins += 1;
    if (rng() < 0.4) r.kos += 1;
    if (r.champion) return null;
    if (r.rank === 1) {
      r.champion = true;
      return `${r.name} won a world title.`;
    }
    r.rank = Math.max(1, cur - 2);
    return null;
  }
  r.losses += 1;
  if (r.champion) {
    r.champion = false;
    r.rank = 2;
    return `${r.name} lost his title.`;
  }
  r.rank = cur + 3 > 20 ? 99 : cur + 3;
  return null;
}
function settleGrudge(life, youWon, drawn) {
  const r = life.rival;
  if (!r || drawn) return;
  if (youWon) {
    r.h2hWins += 1;
    r.losses += 1;
  } else {
    r.h2hLosses += 1;
    r.wins += 1;
  }
}
var rivalRankLabel = (r) => r.retired ? "Retired" : r.champion ? "CHAMPION" : r.rank >= 99 ? "Unranked" : `#${r.rank}`;
var RIVAL_RETIRED_EVENT_ID = 99;
var beat = (id, emoji, title, effect, when, description) => ({
  id,
  emoji,
  title,
  description,
  when,
  effect,
  consequence: describeLifeEffect(effect),
  apply: (s) => applyLifeEffect(s, effect)
});
var youRank = (p) => p.champion ? 0 : p.fighter.rank;
var hisRank = (r) => r.champion ? 0 : r.rank;
var everChampion = (p) => p.champion || p.history.some((h) => h.title && h.result === "W");
var sameClass = (p) => rivalInYourClass(p);
var FIGHT_RIVALRY_EVENTS = [
  beat(
    1,
    "\u{1F4C8}",
    "He keeps winning",
    { heat: 4 },
    (_p, r) => r.last === "W" && r.wins >= 2,
    (_p, r) => `${r.name} won again while you were in camp, and the papers ran the two records side by side.`
  ),
  /* "Before you do" is only true of a man who has never held a world title:
     not of one who won a belt and lost it, or left it behind with a class
     move (Round 916 review). */
  beat(
    2,
    "\u{1F3C6}",
    "He got there first",
    { heat: 8, fans: -1 },
    (p, r) => r.champion && !p.champion && !everChampion(p),
    (_p, r) => `${r.name} has a world title round his waist before you do.`
  ),
  beat(
    3,
    "\u{1F4C9}",
    "He was beaten",
    { heat: -3, fans: 1 },
    (_p, r) => r.last === "L",
    (_p, r) => `${r.name} lost, and people asked what that says about the pair of you.`
  ),
  beat(
    4,
    "\u{1F3AA}",
    "The same bill",
    { heat: 6, fans: 2 },
    (p) => p.fightNo >= 3,
    (_p, r) => `You and ${r.name} boxed on the same bill, and the crowd took sides.`
  ),
  beat(
    5,
    "\u{1F5DE}\uFE0F",
    "He has been talking",
    { heat: 7 },
    () => true,
    (_p, r) => `${r.name} let a reporter know he does not rate anybody you have beaten.`
  ),
  beat(
    6,
    "\u{1F4CA}",
    "The comparison piece",
    { fans: 2, heat: 3 },
    (p, r) => youRank(p) < 99 && hisRank(r) < 99,
    (_p, r) => `A long piece set your record beside ${r.name}'s, fight by fight.`
  ),
  beat(
    7,
    "\u{1F4B0}",
    "A price on it",
    { fans: 3 },
    (p) => p.life.rivalryIntensity >= 30,
    (_p, r) => `Promoters are openly pricing a fight between you and ${r.name}.`
  ),
  beat(
    8,
    "\u{1F504}",
    "He changed corners",
    { heat: 4 },
    (p) => p.fightNo >= 5,
    (_p, r) => `${r.name} has a new trainer, one who has been studying your fights.`
  ),
  beat(
    9,
    "\u2B06\uFE0F",
    "You are ranked above him",
    { fans: 1, heat: 2 },
    (p, r) => sameClass(p) && youRank(p) < hisRank(r),
    (_p, r) => `The new rankings have you above ${r.name}, and his people say they are wrong.`
  ),
  beat(
    10,
    "\u2B07\uFE0F",
    "He is ranked above you",
    { heat: 5 },
    (p, r) => sameClass(p) && hisRank(r) < youRank(p),
    (_p, r) => `The new rankings have ${r.name} above you.`
  ),
  beat(
    RIVAL_RETIRED_EVENT_ID,
    "\u{1F44B}",
    "He hangs them up",
    { fans: 2 },
    (_p, r) => r.retired,
    (_p, r) => `${r.name} has retired at ${r.wins} and ${r.losses}. Between the two of you it finished ${r.h2hWins} and ${r.h2hLosses} your way.`
  )
];
var option = (label, emoji, effect, line, neutral) => ({
  label,
  emoji,
  effect,
  consequence: describeLifeEffect(effect),
  ...neutral ? { neutral } : {},
  apply: (s, r) => {
    applyLifeEffect(s, effect);
    return line(r?.name ?? "your rival");
  }
});
var openTable = (p) => rivalInYourClass(p) && p.offers.length > 0 && (p.champion || !p.offers[0].title);
var FIGHT_RIVALRY_CHOICES = [
  {
    id: "fr-call-out",
    emoji: "\u{1F4E3}",
    title: "He calls you out",
    description: (_p, r) => `${r.name} used his post fight interview to ask for you by name.`,
    when: (p) => p.fightNo >= 3 && openTable(p),
    choices: [
      option("Take the fight", "\u{1F94A}", { grudge: true, heat: 10 }, (r) => `Agreed to fight ${r}.`),
      option("Tell him to get in line", "\u{1F644}", { heat: 4, karma: -1 }, (r) => `Told ${r} to get in line.`),
      option("Say nothing", "\u{1F910}", {}, (r) => `Let ${r} shout.`, true)
    ]
  },
  {
    id: "fr-face-off",
    emoji: "\u{1F624}",
    title: "Face to face",
    description: (_p, r) => `You and ${r.name} are on the same card, and the promoter has put you nose to nose for the cameras.`,
    /* A face-off is for two men who could be matched: same division only. */
    when: (p) => sameClass(p),
    choices: [
      option("Shove him", "\u{1F4A2}", { fans: 3, karma: -3, heat: 8 }, (r) => `Shoved ${r} in front of the cameras.`),
      option("Stare and say nothing", "\u{1F441}\uFE0F", { heat: 3 }, (r) => `Stared ${r} down.`, true),
      option("Shake his hand", "\u{1F91D}", { karma: 2, heat: -5 }, (r) => `Shook hands with ${r}.`)
    ]
  },
  {
    id: "fr-sparring-ask",
    emoji: "\u{1F94B}",
    title: "His camp asks a favour",
    description: (_p, r) => `${r.name}'s camp is short of bodies and has asked to borrow your sparring partner for a week.`,
    when: () => true,
    choices: [
      option("Send him over", "\u{1F44D}", { karma: 3, heat: -6 }, (r) => `Lent ${r}'s camp a sparring partner.`),
      option("Refuse", "\u{1F6AB}", { heat: 4 }, (r) => `Refused to help ${r}'s camp.`),
      option("Leave it to the trainers", "\u{1F937}", {}, () => "Left the sparring question to the trainers.", true)
    ]
  },
  {
    id: "fr-joint-interview",
    emoji: "\u{1F399}\uFE0F",
    title: "A joint interview",
    description: (_p, r) => `A radio show wants you and ${r.name} on together.`,
    when: (p) => p.life.fanbase >= 10,
    choices: [
      option("Do it and be gracious", "\u{1F60A}", { fans: 2, karma: 2, heat: -3 }, (r) => `Did the show with ${r} and kept it friendly.`),
      option("Do it and needle him", "\u{1F60F}", { fans: 4, karma: -2, heat: 7 }, (r) => `Did the show with ${r} and got under his skin.`),
      option("Decline", "\u270B", {}, () => "Turned the joint interview down.", true)
    ]
  },
  {
    id: "fr-ducking",
    emoji: "\u{1F986}",
    title: "The word is you are ducking him",
    description: (_p, r) => `It is going round that you want nothing to do with ${r.name}.`,
    when: (p) => p.life.rivalryIntensity >= 15 && p.fightNo >= 5 && openTable(p),
    choices: [
      option("Take the fight now", "\u{1F94A}", { grudge: true, heat: 8 }, (r) => `Took the fight with ${r} to end the talk.`),
      option("Answer it in public", "\u{1F4E2}", { fans: 2, heat: 6 }, (r) => `Answered the ducking talk about ${r} in public.`),
      option("Let your record answer", "\u{1F4DC}", {}, () => "Let the record do the talking.", true)
    ]
  },
  {
    id: "fr-benefit-night",
    emoji: "\u{1F397}\uFE0F",
    title: "His benefit night",
    description: (_p, r) => `${r.name} is running a benefit night for his old gym and your name is on the list of people asked.`,
    when: () => true,
    choices: [
      option("Put money in", "\u{1F49D}", { cash: -0.03, karma: 4, heat: -4 }, (r) => `Gave to ${r}'s benefit night.`),
      option("Send a signed glove", "\u{1F9E4}", { fans: 1 }, (r) => `Sent a signed glove to ${r}'s benefit night.`, true),
      option("Ignore it", "\u{1F648}", { karma: -2, heat: 2 }, (r) => `Ignored ${r}'s benefit night.`)
    ]
  }
];
var RIVALRY_CHOICE_CHANCE = 0.5;
function fightRivalryTick(st) {
  const life = st.life;
  const r = life.rival;
  if (!r || life.pendingRivalryEvent || life.pendingRivalryChoice) return;
  const forced = forcedRetirementEvent(st, r, life.lastRivalryEventId, FIGHT_RIVALRY_EVENTS, RIVAL_RETIRED_EVENT_ID);
  if (forced) {
    life.pendingRivalryEvent = forced;
    return;
  }
  const rng = keyedRng(`${st.seed}|${st.fightNo}|${life.rivalryChoicesSeen.length}|fight-rivalry`);
  const event = rollRivalryEvent(st, r, life.lastRivalryEventId, FIGHT_RIVALRY_EVENTS, rng);
  if (event) {
    life.pendingRivalryEvent = event;
    return;
  }
  const card = rollRivalryChoice(st, r, life.rivalryChoicesSeen, FIGHT_RIVALRY_CHOICES, RIVALRY_CHOICE_CHANCE, rng);
  if (card) {
    life.pendingRivalryChoice = card;
    life.rivalryChoicesSeen = [...life.rivalryChoicesSeen, card.id];
  }
}
function dismissFightRivalryEvent(st) {
  const next = cloneForLife(st);
  const event = next.life.pendingRivalryEvent;
  if (!event) return null;
  if (!next.life.rival) {
    next.life.pendingRivalryEvent = null;
    return next;
  }
  applyRivalryEvent(next, next.life.rival, event, FIGHT_RIVALRY_EVENTS, () => 0.5, (line) => pushFeed(next.life, line));
  next.life.pendingRivalryEvent = null;
  next.life.lastRivalryEventId = event.id;
  return next;
}
function answerFightRivalryChoice(st, choiceIdx) {
  const next = cloneForLife(st);
  const card = next.life.pendingRivalryChoice;
  if (!card) return null;
  if (!FIGHT_RIVALRY_CHOICES.some((d) => d.id === card.id)) {
    next.life.pendingRivalryChoice = null;
    return { state: next, line: "" };
  }
  const line = resolveRivalryChoice(next, next.life.rival, card.id, choiceIdx, FIGHT_RIVALRY_CHOICES, () => 0.5);
  if (line === null) return null;
  next.life.pendingRivalryChoice = null;
  next.life.decisions += 1;
  pushFeed(next.life, `${card.emoji} ${line}`);
  lapseClosedCards(next);
  return { state: next, line };
}
function neutralRivalryChoice(cardId) {
  const def = FIGHT_RIVALRY_CHOICES.find((d) => d.id === cardId);
  return def ? def.choices.findIndex((c) => c.neutral && isBoutNeutral(c.effect)) : -1;
}

// src/lib/careerBadges.ts
function earnedBadges(defs, f) {
  return defs.filter((d) => d.test(f));
}
function wentBackToBack(seasons, title) {
  for (let i = 1; i < seasons.length; i += 1) {
    if (seasons[i].teamResult === title && seasons[i - 1].teamResult === title) return true;
  }
  return false;
}
var tookAward = (seasons, award) => seasons.some((s) => s.awards.includes(award));
function closingBadges(ironBlurb, hofBlurb) {
  return [
    { id: "iron_man", emoji: "\u{1FA7A}", label: "Iron man", blurb: ironBlurb, test: (f) => f.fullSeasons >= 5 },
    { id: "first_million", emoji: "\u{1FA99}", label: "First million", blurb: "A million dollars to your name, cash, savings and holdings together.", test: (f) => f.wealth >= 1 },
    { id: "hundred_million", emoji: "\u{1F4B0}", label: "$100M to your name", blurb: "A hundred million dollars, cash, savings and holdings together.", test: (f) => f.wealth >= 100 },
    { id: "rivalry", emoji: "\u{1FA9E}", label: "Won the rivalry", blurb: "Your draft class rival retired behind you in the head to head.", test: (f) => !!f.rival && f.rival.retired && f.rival.myYears > f.rival.hisYears },
    { id: "hall", emoji: "\u{1F3DB}\uFE0F", label: "Hall of Famer", blurb: hofBlurb, test: (f) => f.retired && f.hof }
  ];
}
var NFL_BADGES = [
  { id: "ring", emoji: "\u{1F48D}", label: "Super Bowl champion", blurb: "A ring. The one everything else is measured against.", test: (f) => f.rings >= 1 },
  { id: "back_to_back", emoji: "\u{1F451}", label: "Back to back", blurb: "Two Super Bowls in two seasons.", test: (f) => wentBackToBack(f.seasons, "WON THE SUPER BOWL") },
  { id: "mvp", emoji: "\u{1F3C6}", label: "League MVP", blurb: "The best player in the league for one year.", test: (f) => f.seasons.some((s) => s.awards.includes("MVP")) },
  { id: "dpoy", emoji: "\u{1F6E1}\uFE0F", label: "Defensive Player of the Year", blurb: "The best defender in the league for one year.", test: (f) => f.seasons.some((s) => s.awards.includes("Defensive Player of the Year")) },
  { id: "roy", emoji: "\u{1F331}", label: "Rookie of the Year", blurb: "The best first year player on your side of the ball.", test: (f) => f.seasons.some((s) => s.awards.some((a) => a.endsWith("Rookie of the Year"))) },
  { id: "all_pro_3", emoji: "\u2B50", label: "Three All-Pros", blurb: "First team All-Pro three times.", test: (f) => f.allPros >= 3 },
  { id: "all_pro_10", emoji: "\u{1F31F}", label: "Ten All-Pros", blurb: "Ten first team All-Pro selections, the mark Jerry Rice and Jim Otto share.", test: (f) => f.allPros >= 10 },
  { id: "pass_10k", emoji: "\u{1F3AF}", label: "10,000 passing yards", blurb: "Ten thousand career yards through the air.", test: (f) => f.totals.passYds >= 1e4 },
  { id: "pass_50k", emoji: "\u{1F680}", label: "50,000 passing yards", blurb: "Fifty thousand career passing yards.", test: (f) => f.totals.passYds >= 5e4 },
  { id: "pass_5k_season", emoji: "\u{1F4A5}", label: "A 5,000 yard season", blurb: "Five thousand passing yards in one year. The record is 5,477.", test: (f) => f.seasons.some((s) => (s.passYds ?? 0) >= 5e3) },
  { id: "rush_10k", emoji: "\u{1F3C3}", label: "10,000 rushing yards", blurb: "Ten thousand career yards on the ground.", test: (f) => f.totals.rushYds >= 1e4 },
  { id: "rush_2k_season", emoji: "\u{1F32A}\uFE0F", label: "A 2,000 yard season", blurb: "Two thousand rushing yards in one year. The record is 2,105.", test: (f) => f.seasons.some((s) => (s.rushYds ?? 0) >= 2e3) },
  { id: "rec_10k", emoji: "\u{1F64C}", label: "10,000 receiving yards", blurb: "Ten thousand career receiving yards.", test: (f) => f.totals.recYds >= 1e4 },
  { id: "rec_td_75", emoji: "\u{1F525}", label: "75 receiving touchdowns", blurb: "Seventy five career catches in the end zone.", test: (f) => f.totals.recTd >= 75 },
  { id: "sacks_100", emoji: "\u{1F4A3}", label: "100 sacks", blurb: "A hundred career sacks.", test: (f) => f.totals.sacks >= 100 },
  { id: "sack_20_season", emoji: "\u{1F9E8}", label: "A 20 sack season", blurb: "Twenty sacks in one year. The record is 23.", test: (f) => f.seasons.some((s) => (s.sacks ?? 0) >= 20) },
  { id: "picks_30", emoji: "\u{1F9E4}", label: "30 interceptions", blurb: "Thirty career interceptions.", test: (f) => f.totals.picks >= 30 },
  { id: "tackles_1000", emoji: "\u{1F9F1}", label: "1,000 tackles", blurb: "A thousand career tackles.", test: (f) => f.totals.tackles >= 1e3 },
  { id: "fg_300", emoji: "\u{1F9B5}", label: "300 field goals", blurb: "Three hundred career field goals.", test: (f) => f.totals.fgMade >= 300 },
  { id: "decade", emoji: "\u{1F4C5}", label: "A decade in the league", blurb: "Ten seasons played.", test: (f) => f.seasons.length >= 10 },
  ...closingBadges("Five full seasons without missing a game.", "The legacy verdict says Canton.")
];
var NBA_BADGES = [
  { id: "ring", emoji: "\u{1F48D}", label: "NBA champion", blurb: "A ring. The one everything else is measured against.", test: (f) => f.rings >= 1 },
  { id: "back_to_back", emoji: "\u{1F451}", label: "Back to back", blurb: "Two titles in two seasons.", test: (f) => wentBackToBack(f.seasons, "WON THE NBA FINALS") },
  { id: "mvp", emoji: "\u{1F3C6}", label: "League MVP", blurb: "The best player in the league for one year.", test: (f) => tookAward(f.seasons, "MVP") },
  { id: "finals_mvp", emoji: "\u{1F3C5}", label: "Finals MVP", blurb: "The best player in the series that decided it.", test: (f) => f.finalsMvps >= 1 },
  { id: "dpoy", emoji: "\u{1F6E1}\uFE0F", label: "Defensive Player of the Year", blurb: "The best defender in the league for one year.", test: (f) => tookAward(f.seasons, "Defensive Player of the Year") },
  { id: "roy", emoji: "\u{1F331}", label: "Rookie of the Year", blurb: "The best first year player in the league.", test: (f) => tookAward(f.seasons, "Rookie of the Year") },
  { id: "scoring_title", emoji: "\u{1F525}", label: "Scoring champion", blurb: "Led the league in scoring across a season.", test: (f) => tookAward(f.seasons, "Scoring Champion") },
  { id: "all_nba_3", emoji: "\u2B50", label: "Three All-NBAs", blurb: "All-NBA three times.", test: (f) => f.allNbas >= 3 },
  { id: "all_nba_10", emoji: "\u{1F31F}", label: "Ten All-NBAs", blurb: "Ten All-NBA selections.", test: (f) => f.allNbas >= 10 },
  { id: "all_star", emoji: "\u2728", label: "All-Star", blurb: "Picked for the All-Star Game.", test: (f) => tookAward(f.seasons, "All-Star") },
  { id: "all_star_10", emoji: "\u{1F387}", label: "Ten time All-Star", blurb: "Ten All-Star selections.", test: (f) => f.seasons.filter((s) => s.awards.includes("All-Star")).length >= 10 },
  { id: "ppg_30", emoji: "\u{1F4A5}", label: "A 30 point season", blurb: "Thirty a night across a whole season. The record average is 50.4.", test: (f) => f.seasons.some((s) => s.ppg >= 30 && s.games >= 58) },
  { id: "triple_double", emoji: "\u{1F4CA}", label: "Triple double season", blurb: "Points, rebounds and assists all in double figures for a season.", test: (f) => f.seasons.some((s) => s.ppg >= 10 && s.rpg >= 10 && s.apg >= 10 && s.games >= 58) },
  { id: "pts_20k", emoji: "\u{1F3AF}", label: "20,000 points", blurb: "Twenty thousand career points.", test: (f) => f.totals.pts >= 2e4 },
  { id: "pts_30k", emoji: "\u{1F680}", label: "30,000 points", blurb: "Thirty thousand career points.", test: (f) => f.totals.pts >= 3e4 },
  { id: "reb_10k", emoji: "\u{1F9F2}", label: "10,000 rebounds", blurb: "Ten thousand career rebounds.", test: (f) => f.totals.reb >= 1e4 },
  { id: "ast_10k", emoji: "\u{1F91D}", label: "10,000 assists", blurb: "Ten thousand career assists.", test: (f) => f.totals.ast >= 1e4 },
  { id: "decade", emoji: "\u{1F4C5}", label: "A decade in the league", blurb: "Ten seasons played.", test: (f) => f.seasons.length >= 10 },
  ...closingBadges("Five seasons with all 82 games played.", "The legacy verdict says Springfield.")
];
var MLB_BADGES = [
  { id: "ring", emoji: "\u{1F48D}", label: "World Series champion", blurb: "A ring, and a parade down the middle of the city.", test: (f) => f.rings >= 1 },
  { id: "back_to_back", emoji: "\u{1F451}", label: "Back to back", blurb: "Two World Series in two seasons.", test: (f) => wentBackToBack(f.seasons, "WON THE WORLD SERIES") },
  { id: "mvp_cy", emoji: "\u{1F3C6}", label: "MVP or Cy Young", blurb: "The biggest individual award your side of the ball has.", test: (f) => f.mvpCys >= 1 },
  { id: "roy", emoji: "\u{1F331}", label: "Rookie of the Year", blurb: "The best first year player in the league.", test: (f) => tookAward(f.seasons, "Rookie of the Year") },
  { id: "all_star_5", emoji: "\u2B50", label: "Five All-Star nods", blurb: "Picked for the All-Star team five times.", test: (f) => f.allStars >= 5 },
  { id: "all_star_10", emoji: "\u{1F31F}", label: "Ten All-Star nods", blurb: "Picked for the All-Star team ten times.", test: (f) => f.allStars >= 10 },
  { id: "gold_glove", emoji: "\u{1F9E4}", label: "Gold Glove", blurb: "The best fielder at your position for a year.", test: (f) => tookAward(f.seasons, "Gold Glove") },
  { id: "slugger", emoji: "\u{1F948}", label: "Silver Slugger", blurb: "The best bat at your position for a year.", test: (f) => tookAward(f.seasons, "Silver Slugger") },
  { id: "batting_title", emoji: "\u{1F3C5}", label: "Batting title", blurb: "The highest average in the league.", test: (f) => tookAward(f.seasons, "Batting Title") },
  { id: "hr_champ", emoji: "\u{1F4A3}", label: "Home run champion", blurb: "Led the league in home runs.", test: (f) => tookAward(f.seasons, "Home Run Champion") },
  { id: "hr_50", emoji: "\u{1F680}", label: "A 50 home run season", blurb: "Fifty in one year. The single season record is 73.", test: (f) => f.seasons.some((s) => (s.hr ?? 0) >= 50) },
  { id: "avg_330", emoji: "\u{1F3AF}", label: "A .330 season", blurb: "A .330 average over a full year. Nobody has hit .400 since 1941.", test: (f) => f.seasons.some((s) => (s.avg ?? 0) >= 0.33 && s.games >= 120) },
  { id: "sb_50", emoji: "\u{1F4A8}", label: "A 50 steal season", blurb: "Fifty bags in one year. The single season record is 130.", test: (f) => f.seasons.some((s) => (s.sb ?? 0) >= 50) },
  { id: "hr_500", emoji: "\u{1F9F1}", label: "500 home runs", blurb: "Five hundred career home runs.", test: (f) => f.totals.hr >= 500 },
  { id: "rbi_1500", emoji: "\u{1F4C8}", label: "1,500 driven in", blurb: "Fifteen hundred career runs batted in.", test: (f) => f.totals.rbi >= 1500 },
  { id: "sb_400", emoji: "\u{1F3C3}", label: "400 stolen bases", blurb: "Four hundred career steals.", test: (f) => f.totals.sb >= 400 },
  { id: "era_200", emoji: "\u{1F9CA}", label: "A sub 2.00 season", blurb: "An ERA under 2.00 across a full year on the mound.", test: (f) => f.seasons.some((s) => (s.era ?? 99) <= 2 && s.games >= 20) },
  { id: "wins_300", emoji: "\u{1F94E}", label: "300 wins", blurb: "Three hundred career wins on the mound.", test: (f) => f.totals.wins >= 300 },
  { id: "so_3000", emoji: "\u{1F525}", label: "3,000 strikeouts", blurb: "Three thousand career strikeouts. The record is 5,714.", test: (f) => f.totals.so >= 3e3 },
  { id: "saves_300", emoji: "\u{1F6AA}", label: "300 saves", blurb: "Three hundred career saves out of the bullpen.", test: (f) => f.totals.saves >= 300 },
  { id: "decade", emoji: "\u{1F4C5}", label: "A decade in the league", blurb: "Ten seasons played.", test: (f) => f.seasons.length >= 10 },
  ...closingBadges("Five seasons with the whole schedule worked, whatever your job is.", "The legacy verdict says Cooperstown.")
];
var NHL_BADGES = [
  { id: "cup", emoji: "\u{1F48D}", label: "Stanley Cup champion", blurb: "Your name goes on the Cup, and it stays there.", test: (f) => f.cups >= 1 },
  { id: "back_to_back", emoji: "\u{1F451}", label: "Back to back", blurb: "Two Cups in two seasons.", test: (f) => wentBackToBack(f.seasons, "WON THE STANLEY CUP") },
  { id: "major", emoji: "\u{1F3C6}", label: "The major", blurb: "The Hart, the Vezina or the Norris, whichever your position plays for.", test: (f) => f.harts >= 1 },
  { id: "smythe", emoji: "\u{1F396}\uFE0F", label: "Conn Smythe", blurb: "The best player in the run that won it.", test: (f) => f.connSmythes >= 1 },
  { id: "calder", emoji: "\u{1F331}", label: "Calder Trophy", blurb: "The best first year player in the league.", test: (f) => tookAward(f.seasons, "Calder Trophy") },
  { id: "art_ross", emoji: "\u{1F3A9}", label: "Art Ross", blurb: "Most points in the league across a season.", test: (f) => tookAward(f.seasons, "Art Ross") },
  { id: "richard", emoji: "\u{1F680}", label: "Rocket Richard", blurb: "Most goals in the league across a season.", test: (f) => tookAward(f.seasons, "Rocket Richard") },
  { id: "all_star_5", emoji: "\u2B50", label: "Five All-Star nods", blurb: "Picked for the All-Star team five times.", test: (f) => f.allStars >= 5 },
  { id: "all_star_10", emoji: "\u{1F31F}", label: "Ten All-Star nods", blurb: "Picked for the All-Star team ten times.", test: (f) => f.allStars >= 10 },
  { id: "goals_50", emoji: "\u{1F4A5}", label: "A 50 goal season", blurb: "Fifty in one season. The single season record is 92.", test: (f) => f.seasons.some((s) => (s.goals ?? 0) >= 50) },
  { id: "points_100", emoji: "\u{1F4C8}", label: "A 100 point season", blurb: "A hundred points in one season. The record is 215.", test: (f) => f.seasons.some((s) => (s.points ?? 0) >= 100) },
  { id: "goals_500", emoji: "\u{1F945}", label: "500 goals", blurb: "Five hundred career goals.", test: (f) => f.totals.goals >= 500 },
  { id: "points_1000", emoji: "\u{1F9EE}", label: "1,000 points", blurb: "A thousand career points.", test: (f) => f.totals.points >= 1e3 },
  { id: "points_1500", emoji: "\u{1F320}", label: "1,500 points", blurb: "Fifteen hundred career points.", test: (f) => f.totals.points >= 1500 },
  { id: "wins_40", emoji: "\u{1F9E4}", label: "A 40 win season", blurb: "Forty wins in the crease in one season. The record is 48, shared.", test: (f) => f.seasons.some((s) => (s.wins ?? 0) >= 40) },
  { id: "svpct_930", emoji: "\u{1F9F1}", label: "A .930 season", blurb: "A .930 save percentage across a season in the crease.", test: (f) => f.seasons.some((s) => (s.svpct ?? 0) >= 0.93 && s.games >= 40) },
  { id: "wins_400", emoji: "\u{1F6AA}", label: "400 wins", blurb: "Four hundred career wins in the crease.", test: (f) => f.totals.wins >= 400 },
  { id: "decade", emoji: "\u{1F4C5}", label: "A decade in the league", blurb: "Ten seasons played.", test: (f) => f.seasons.length >= 10 },
  ...closingBadges("Five seasons with the whole schedule played.", "The legacy verdict says the Hall.")
];

// src/lib/fightCareerLifeFlow.ts
var meter2 = (v) => Math.max(0, Math.min(100, Math.round(v)));
var MORALE_DRIFT = 2;
function lifeNewCareer(name, weight, style, trainer = "allround", manager = "family", seedLabel) {
  const base = newFightCareer(name, weight, style, seedLabel);
  const st = cloneForLife({ ...base, life: newLife(base, trainer, manager) });
  dressOffers(st);
  return st;
}
function lifeRunCamp(st, plan) {
  const live = cloneForLife(st);
  const after = cloneForLife(runCamp(live, plan));
  settleCampCarry(live, after, plan);
  return after;
}
function fansAfter(life, won, drew, stoppage, wonTitle) {
  const swing = won ? 2 + (stoppage ? 2 : 0) + (wonTitle ? 8 : 0) : drew ? 0 : -1;
  return meter2(life.fanbase + swing + managerDef(life.manager.kind).fansPerFight);
}
function lifeTakeFight(st, offerId, tactics) {
  const before = cloneForLife(st);
  const res = takeFight(before, offerId, tactics, lifeFightMods(before));
  if (!res) return null;
  const next = cloneForLife(res.state);
  const life = next.life;
  const { offer, result } = res;
  const won = result.winner === "player";
  const drew = result.winner === "draw";
  const stoppage = result.method === "KO" || result.method === "TKO";
  const takeHome = lifeTakeHome(next, offer.purse);
  life.bank = round2(life.bank + takeHome);
  life.fanbase = fansAfter(life, won, drew, stoppage, won && offer.title && !before.champion);
  life.sharp = 0;
  life.morale = life.morale > 50 ? Math.max(50, life.morale - MORALE_DRIFT) : Math.min(50, life.morale + MORALE_DRIFT);
  if (life.promoterFights > 0) life.promoterFights -= 1;
  delete life.tablePurseMul;
  if (!won && !drew) {
    life.lastBeatenBy = { ...offer.opponent, wins: offer.opponent.wins + 1 };
    life.lastBeatenAt = next.fightNo;
  } else if (life.lastBeatenBy && !rematchInTime(next)) {
    life.lastBeatenBy = null;
    delete life.lastBeatenAt;
  }
  const grudge = offer.label === GRUDGE_LABEL || offer.label === REMATCH_LABEL && !!life.rival && offer.opponent.name === life.rival.name;
  if (grudge) {
    settleGrudge(life, won, drew);
    life.rivalryIntensity = meter2(life.rivalryIntensity + 10);
  }
  const rivalLine = rivalFightNight(next, life, grudge);
  if (rivalLine) pushFeed(life, rivalLine);
  if (next.retired) {
    life.pending = [];
    life.pendingRivalryChoice = null;
    life.pendingRivalryEvent = null;
    return { state: next, result, offer, takeHome };
  }
  dressOffers(next);
  const beats = [
    next.fightNo === 1 ? "debut" : "",
    won && offer.title ? "title" : "",
    won ? "win" : drew ? "" : "loss",
    "gym"
  ].filter(Boolean);
  fightInboxTick(next, life, beats);
  fightRivalryTick(next);
  dealLifeCards(next);
  return { state: next, result, offer, takeHome };
}
function lifeRetire(st) {
  const done = retireByChoice(cloneForLife(st));
  if (!done) return null;
  const next = cloneForLife(done);
  next.life.pending = [];
  next.life.pendingRivalryChoice = null;
  next.life.pendingRivalryEvent = null;
  return next;
}
function nextLifeStep(st) {
  const life = st.life;
  if (!life || st.retired) return null;
  if (life.pendingRivalryEvent) return { kind: "beat", event: life.pendingRivalryEvent };
  if (life.pendingRivalryChoice) return { kind: "choice", card: life.pendingRivalryChoice };
  const card = pendingLifeCard(st);
  return card ? { kind: "card", card } : null;
}
function lifeLoadState(st) {
  const live = ensureLife(st);
  const life = live.life;
  if (life.pendingRivalryChoice && !FIGHT_RIVALRY_CHOICES.some((d) => d.id === life.pendingRivalryChoice?.id)) {
    life.pendingRivalryChoice = null;
  }
  if (life.pendingRivalryEvent && !life.rival) life.pendingRivalryEvent = null;
  return live;
}
function lifeBuyUpgrade(st, id) {
  const next = cloneForLife(st);
  const line = buyUpgrade(next.life, id);
  if (!line) return null;
  pushFeed(next.life, line);
  return next;
}
function lifeAnswerInbox(st, msgId, choiceIdx) {
  const next = cloneForLife(st);
  const line = answerFightInbox(next, next.life, msgId, choiceIdx);
  if (!line) return null;
  next.life.decisions += 1;
  pushFeed(next.life, line);
  return next;
}
function fightBadgeFacts(st) {
  const live = cloneForLife(st);
  const f = live.fighter;
  return {
    fights: live.fightNo,
    wins: f.wins,
    losses: f.losses,
    kos: f.kos,
    champion: live.champion,
    titleWins: live.history.filter((h) => h.title && h.result === "W").length,
    defences: live.titleDefences,
    damage: f.damage,
    retired: live.retired,
    bank: live.life.bank,
    fans: live.life.fanbase,
    classMoves: live.life.classMoves,
    /* A history line's `no` is the fight's own number, 1 first; firstMoveAt is
       how many fights were done when the move was made. */
    titlesAfterMove: live.life.firstMoveAt === void 0 ? 0 : live.history.filter((h) => h.title && h.result === "W" && h.no > (live.life.firstMoveAt ?? 0)).length,
    rivalWins: live.life.rival?.h2hWins ?? 0,
    maxedUpgrades: UPGRADES.filter((u) => upgradeLevel(live.life, u.id) >= MAX_UPGRADE_LEVEL).length,
    decisions: live.life.decisions
  };
}
var FIGHT_BADGES = [
  { id: "fb-first-win", emoji: "\u{1F947}", label: "Off the mark", blurb: "Won a professional fight.", test: (f) => f.wins >= 1 },
  { id: "fb-ten-wins", emoji: "\u{1F51F}", label: "Ten up", blurb: "Ten professional wins.", test: (f) => f.wins >= 10 },
  { id: "fb-ten-kos", emoji: "\u{1F4A5}", label: "Heavy hands", blurb: "Ten wins inside the distance.", test: (f) => f.kos >= 10 },
  { id: "fb-unbeaten", emoji: "\u{1F9FC}", label: "Still perfect", blurb: "Ten fights in and nobody has beaten you.", test: (f) => f.fights >= 10 && f.losses === 0 },
  { id: "fb-champion", emoji: "\u{1F3C6}", label: "World champion", blurb: "Won a world title.", test: (f) => f.titleWins >= 1 },
  { id: "fb-defender", emoji: "\u{1F6E1}\uFE0F", label: "A proper reign", blurb: "Three successful title defences.", test: (f) => f.defences >= 3 },
  { id: "fb-two-weights", emoji: "\u2696\uFE0F", label: "Moved and won", blurb: "Changed weight class, then won a world title.", test: (f) => f.titlesAfterMove >= 1 },
  { id: "fb-rival", emoji: "\u{1F624}", label: "Settled it", blurb: "Beat your rival in the ring.", test: (f) => f.rivalWins >= 1 },
  { id: "fb-crowd", emoji: "\u{1F4E3}", label: "A following", blurb: "Sixty fans on the meter.", test: (f) => f.fans >= 60 },
  { id: "fb-banker", emoji: "\u{1F3E6}", label: "Kept some of it", blurb: "A million in the bank at once.", test: (f) => f.bank >= 1 },
  { id: "fb-full-corner", emoji: "\u{1F9F0}", label: "A full corner", blurb: "Took one camp upgrade to its top level.", test: (f) => f.maxedUpgrades >= 1 },
  { id: "fb-long-road", emoji: "\u{1F6E3}\uFE0F", label: "The long road", blurb: "Thirty professional fights.", test: (f) => f.fights >= 30 },
  { id: "fb-got-out", emoji: "\u{1F6B6}", label: "Got out clean", blurb: "Retired after ten or more fights with damage under 40.", test: (f) => f.retired && f.fights >= 10 && f.damage < 40 },
  { id: "fb-busy-life", emoji: "\u{1F5C2}\uFE0F", label: "A busy life", blurb: "Answered fifty cards and texts.", test: (f) => f.decisions >= 50 }
];
var fightBadgesEarned = (st) => earnedBadges(FIGHT_BADGES, fightBadgeFacts(st));

// src/lib/fightGym.ts
var fightGym_exports = {};
__export(fightGym_exports, {
  BROKE_PENALTY: () => BROKE_PENALTY,
  SELL_MIN_WEEKS: () => SELL_MIN_WEEKS,
  TRAIN_COST: () => TRAIN_COST,
  TRAIN_FOCI: () => TRAIN_FOCI,
  advanceWeek: () => advanceWeek,
  campQualityFor: () => campQualityFor,
  canSellGym: () => canSellGym,
  closeBroke: () => closeBroke,
  cutRate: () => cutRate,
  guessWeight: () => guessWeight,
  gymShouldRetire: () => gymShouldRetire,
  gymVerdict: () => gymVerdict,
  newGym: () => newGym,
  offersForFighter: () => offersForFighter,
  prospectsFor: () => prospectsFor,
  releaseFighter: () => releaseFighter,
  salePrice: () => salePrice,
  sanitizeGym: () => sanitizeGym,
  sellGym: () => sellGym,
  signProspect: () => signProspect,
  takeGymFight: () => takeGymFight,
  trainFighter: () => trainFighter,
  trainedThisWeek: () => trainedThisWeek,
  weeklyCost: () => weeklyCost,
  wentBroke: () => wentBroke
});
var GYM_ID = "g";
var TRAIN_FOCI = ["conditioning", "power", "defence", "speed"];
function weeklyCost(g) {
  return Math.round((0.012 + g.roster.length * 9e-3) * 1e3) / 1e3;
}
function cutRate(g) {
  return 0.2 + g.reputation / 100 * 0.15;
}
var SCOUT_WORDS = [
  "Hands like nobody his age.",
  "Raw, but he can take it.",
  "Been in the gym since he was nine.",
  "Everyone else passed on him.",
  "Will be a problem in two years.",
  "Fights like he has something to prove.",
  "Nothing special, but he turns up.",
  "Body of a man, head of a boy."
];
function newGym(name, seedLabel) {
  const seed = hashLabel(seedLabel ?? `gym|${name}`);
  const rng = rngFrom(seed);
  const g = {
    version: 1,
    name: name.trim() || "The Gym",
    week: 1,
    money: 0.6,
    reputation: 8,
    roster: [],
    prospects: [],
    history: [],
    titles: 0,
    alumni: [],
    closed: false,
    log: ["You open the doors. Two kids are already waiting outside."],
    seed,
    rngTick: 0
  };
  for (let i = 0; i < 2; i += 1) {
    const w = WEIGHT_CLASSES[Math.floor(rng() * WEIGHT_CLASSES.length)].id;
    const f = makeFighter(rng, 44 + rng() * 8, w, void 0, mintFighterId(g, GYM_ID));
    f.age = clampi(19 + rng() * 3, 19, 23);
    g.roster.push(f);
  }
  g.prospects = prospectsFor(g);
  return g;
}
function stream(g) {
  const rng = rngFrom(g.seed + g.rngTick * 7919);
  return { rng, done: (n) => {
    g.rngTick += Math.max(1, n);
  } };
}
function prospectsFor(g) {
  const { rng, done } = stream(g);
  const out = [];
  const tier = 38 + g.reputation / 100 * 34;
  for (let i = 0; i < 3; i += 1) {
    const w = WEIGHT_CLASSES[Math.floor(rng() * WEIGHT_CLASSES.length)].id;
    const f = makeFighter(rng, clamp(tier + (rng() - 0.4) * 14, 30, 88), w, void 0, mintFighterId(g, GYM_ID));
    f.age = clampi(18 + rng() * 6, 18, 26);
    const fee = Math.round((0.02 + (ratingOf(f) / 100) ** 2.4 * 0.72) * 1e3) / 1e3;
    out.push({
      id: `p${g.week}-${i}`,
      fighter: f,
      fee,
      word: SCOUT_WORDS[Math.floor(rng() * SCOUT_WORDS.length)]
    });
  }
  done(9);
  return out;
}
function signProspect(g, id) {
  if (g.closed) return null;
  const p = g.prospects.find((x) => x.id === id);
  if (!p) return null;
  if (p.fee > g.money) return null;
  if (g.roster.length >= 6) return null;
  const next = {
    ...g,
    money: Math.round((g.money - p.fee) * 1e3) / 1e3,
    roster: [...g.roster, p.fighter],
    prospects: g.prospects.filter((x) => x.id !== id),
    log: [`Signed ${p.fighter.name}, ${weightById(guessWeight(p.fighter)).label}, for ${p.fee.toFixed(3)}m.`, ...g.log]
  };
  return next;
}
function guessWeight(f) {
  return fighterClass(f);
}
var TRAIN_COST = 0.035;
var FOCUS_GAIN = 2.4;
var FOCUS_ATTR = {
  conditioning: "stamina",
  power: "power",
  defence: "defence",
  speed: "speed"
};
var FOCUS_LINE = {
  conditioning: "ran the hills and did the rounds on the bags",
  power: "spent the week on the heavy bag",
  defence: "spent the week slipping and blocking",
  speed: "spent the week on the pads and the rope"
};
var noBlocks = () => ({ conditioning: 0, power: 0, defence: 0, speed: 0 });
function trainedThisWeek(g, fighterId) {
  return g.training?.[fighterId]?.week === g.week;
}
function trainFighter(g, fighterId, focus) {
  if (g.closed || g.money < TRAIN_COST) return null;
  if (!FOCUS_ATTR[focus]) return null;
  if (trainedThisWeek(g, fighterId)) return null;
  const i = g.roster.findIndex((f2) => f2.id === fighterId);
  if (i < 0) return null;
  const f = { ...g.roster[i], attrs: { ...g.roster[i].attrs } };
  const key = FOCUS_ATTR[focus];
  f.attrs[key] = clampi(f.attrs[key] + clamp((f.potential - f.attrs[key]) / 22, 0, 1) * FOCUS_GAIN, 15, 99);
  const roster = g.roster.slice();
  roster[i] = f;
  const prev = g.training?.[fighterId];
  const blocks = { ...noBlocks(), ...prev?.blocks ?? {} };
  blocks[focus] += 1;
  return {
    ...g,
    money: Math.round((g.money - TRAIN_COST) * 1e3) / 1e3,
    roster,
    training: { ...g.training ?? {}, [fighterId]: { week: g.week, blocks } },
    log: [`${f.name} ${FOCUS_LINE[focus]}.`, ...g.log]
  };
}
function campQualityFor(g, fighterId) {
  const b = g.training?.[fighterId]?.blocks;
  if (!b) return 0.5;
  const total = b.conditioning + b.power + b.defence + b.speed;
  return clamp(0.5 + Math.min(total, 4) * 0.05 + (b.conditioning > 0 ? 0.1 : 0), 0, 1);
}
function offersForFighter(g, fighterId) {
  const f = g.roster.find((x) => x.id === fighterId);
  if (!f) return [];
  const { rng, done } = stream(g);
  const mine = ratingOf(f);
  const w = guessWeight(f);
  const contender = f.rank <= 1;
  const shapes = contender ? [
    { label: "Vacant title", delta: -2, pay: 2, gain: 0, rounds: 12 },
    { label: "Champion away from home", delta: 4, pay: 3, gain: 0, rounds: 12 },
    { label: "Undisputed champion", delta: 9, pay: 4.6, gain: 0, rounds: 12 }
  ] : [
    { label: "Six rounder", delta: -11, pay: 0.35, gain: 1, rounds: 6 },
    { label: "Even money", delta: 1, pay: 1, gain: 3, rounds: 10 },
    { label: "Step up", delta: 9, pay: 2.1, gain: 6, rounds: 10 }
  ];
  const rank = f.rank >= 99 ? 20 : f.rank;
  const nameValue = clamp(f.wins * 0.13 + f.kos * 0.09, 0, 4);
  const fame = (contender ? 5 : clamp((16 - Math.min(rank, 16)) / 3.4, 0.35, 4.6)) + nameValue;
  const out = shapes.map((s, i) => {
    const relative = clamp(mine + s.delta, 25, 97);
    const opp = makeFighter(rng, contender ? Math.max(relative, 80 + rng() * 15) : relative, w);
    opp.age = clampi(22 + rng() * 13, 20, 38);
    const purse = Math.round((0.04 + fame * 0.14 + g.reputation / 100 * 0.18) * s.pay * 1e3) / 1e3;
    return {
      id: `g${g.week}-${i}`,
      opponent: opp,
      purse,
      rounds: s.rounds,
      rankGain: s.gain,
      title: contender,
      label: s.label
    };
  });
  done(12);
  return out;
}
function takeGymFight(g, fighterId, offer, tactics) {
  if (g.closed) return null;
  const i = g.roster.findIndex((x) => x.id === fighterId);
  if (i < 0) return null;
  const { rng, done } = stream(g);
  const fighter = g.roster[i];
  const result = simBout({
    player: fighter,
    opponent: offer.opponent,
    rounds: offer.rounds,
    weight: guessWeight(fighter),
    tactics,
    campQuality: campQualityFor(g, fighterId)
  }, rng);
  done(offer.rounds * 6 + 4);
  const f = { ...fighter, attrs: { ...fighter.attrs } };
  f.damage = Math.round((f.damage + result.damageTaken) * 10) / 10;
  f.age = Math.round((f.age + 0.06) * 100) / 100;
  const won = result.winner === "player";
  const drew = result.winner === "draw";
  if (won) f.wins += 1;
  else if (drew) f.draws += 1;
  else f.losses += 1;
  if (won && (result.method === "KO" || result.method === "TKO")) f.kos += 1;
  if (offer.title && won) f.rank = 0;
  else if (won) f.rank = clampi(Math.min(f.rank === 99 ? 20 : f.rank, 20) - offer.rankGain, 1, 99);
  else if (!drew) f.rank = clampi((f.rank === 99 ? 20 : f.rank) + 4, 1, 99);
  const cut = Math.round(offer.purse * cutRate(g) * 1e3) / 1e3;
  const roster = g.roster.slice();
  roster[i] = f;
  const headroom = 1 - g.reputation / 100;
  const gained = (offer.title ? 9 : 2.2) * clamp(headroom * 1.5, 0.12, 1);
  let rep = g.reputation + (won ? gained : drew ? 0.3 * headroom : -1.4);
  if (fighter.damage >= 55) rep -= 1.7;
  if (fighter.damage >= 70) rep -= 2.6;
  if (!won && (result.method === "KO" || result.method === "TKO") && fighter.damage > 45) rep -= 3.2;
  const camp = g.training?.[fighterId];
  const training = camp ? { ...g.training, [fighterId]: { week: camp.week, blocks: noBlocks() } } : g.training;
  const next = {
    ...g,
    roster,
    training,
    money: Math.round((g.money + cut) * 1e3) / 1e3,
    reputation: clamp(Math.round(rep * 10) / 10, 0, 100),
    titles: g.titles + (offer.title && won ? 1 : 0),
    history: [...g.history, {
      week: g.week,
      fighter: f.name,
      opponent: offer.opponent.name,
      result: won ? "W" : drew ? "D" : "L",
      method: result.method,
      purse: offer.purse,
      cut,
      title: offer.title
    }],
    log: [
      `${f.name} ${won ? "beat" : drew ? "drew with" : "lost to"} ${offer.opponent.name} by ${result.method}. The gym takes ${cut.toFixed(3)}m.`,
      ...g.log
    ]
  };
  return { state: next, result };
}
function gymShouldRetire(f) {
  if (f.age >= 39) return true;
  if (f.damage >= 82) return true;
  if (f.age >= 34 && f.damage >= 58) return true;
  return false;
}
function releaseFighter(g, fighterId) {
  const f = g.roster.find((x) => x.id === fighterId);
  if (!f) return null;
  return retireOut(g, f, "let go");
}
function exitPenalty(f) {
  return f.damage >= 70 ? 4.5 : f.damage >= 50 ? 1.8 : 0;
}
function foughtForGym(f) {
  return f.wins + f.losses + f.draws;
}
function retireOut(g, f, how) {
  const penalty = exitPenalty(f);
  let training = g.training;
  if (training && training[f.id]) {
    training = { ...training };
    delete training[f.id];
  }
  return {
    ...g,
    training,
    roster: g.roster.filter((x) => x.id !== f.id),
    reputation: clamp(Math.round((g.reputation - penalty) * 10) / 10, 0, 100),
    alumni: [...g.alumni, {
      name: f.name,
      record: `${f.wins}-${f.losses}${f.draws ? `-${f.draws}` : ""}`,
      damage: f.damage,
      titles: f.rank === 0 ? 1 : 0,
      fights: foughtForGym(f)
    }],
    log: [`${f.name} is ${how} at ${Math.floor(f.age)}, ${f.wins}-${f.losses}, carrying ${f.damage.toFixed(0)} damage.`, ...g.log]
  };
}
function advanceWeek(g) {
  if (g.closed) return g;
  let next = { ...g, roster: g.roster.map((f) => ({ ...f, age: Math.round((f.age + 0.02) * 100) / 100 })) };
  for (const f of next.roster.slice()) {
    if (gymShouldRetire(f)) next = retireOut(next, f, "finished");
  }
  const bill = weeklyCost(next);
  next = {
    ...next,
    week: next.week + 1,
    money: Math.round((next.money - bill) * 1e3) / 1e3,
    /* A gym nobody is talking about gets forgotten. */
    reputation: clamp(Math.round((next.reputation - 0.08) * 10) / 10, 0, 100)
  };
  next.prospects = prospectsFor(next);
  if (next.money < 0) next = closeBroke(next);
  return next;
}
function settleRoster(g, how) {
  return g.roster.reduce((acc, f) => retireOut(acc, f, how), g);
}
function closeBroke(g) {
  const settled = settleRoster(g, "left without a gym");
  return { ...settled, closed: true, exit: "broke", log: ["The rent went unpaid and the doors closed.", ...settled.log] };
}
var SELL_MIN_WEEKS = 26;
function salePrice(g) {
  const rep = g.roster.reduce((r, f) => clamp(Math.round((r - exitPenalty(f)) * 10) / 10, 0, 100), g.reputation);
  const name = (clamp(rep, 0, 100) / 100) ** 1.5 * 2.5;
  const belts = g.titles * 0.3;
  const men = g.roster.filter((f) => foughtForGym(f) > 0).reduce((s, f) => s + (ratingOf(f) / 100) ** 2 * 0.6 * (1 - clamp(f.damage, 0, 100) / 100), 0);
  return Math.round((0.2 + name + belts + men) * 1e3) / 1e3;
}
function canSellGym(g) {
  return !g.closed && g.week >= SELL_MIN_WEEKS;
}
function sellGym(g) {
  if (!canSellGym(g)) return null;
  const price = salePrice(g);
  const settled = settleRoster(g, "kept on by the new owner");
  return {
    ...settled,
    money: Math.round((g.money + price) * 1e3) / 1e3,
    closed: true,
    exit: "sold",
    soldFor: price,
    log: [`You sell the gym in week ${g.week} for ${price.toFixed(3)}m and hand over the keys.`, ...settled.log]
  };
}
function wentBroke(g) {
  return g.closed && g.exit === "broke";
}
var SALE_BONUS_CAP = 8;
var BROKE_PENALTY = 12;
function sanitizeGym(g) {
  const out = { ...g };
  if (out.exit !== void 0 && out.exit !== "sold" && out.exit !== "broke") delete out.exit;
  if (out.soldFor !== void 0 && !(typeof out.soldFor === "number" && Number.isFinite(out.soldFor))) delete out.soldFor;
  if (Array.isArray(out.alumni) && out.alumni.some((a) => a && a.fights !== void 0 && !(typeof a.fights === "number" && Number.isFinite(a.fights) && a.fights >= 0))) {
    out.alumni = out.alumni.map((a) => {
      if (!a || a.fights === void 0 || typeof a.fights === "number" && Number.isFinite(a.fights) && a.fights >= 0) return a;
      const { fights: _bad, ...rest } = a;
      return rest;
    });
  }
  if (out.training !== void 0) {
    const t2 = out.training;
    if (!t2 || typeof t2 !== "object" || Array.isArray(t2)) {
      delete out.training;
    } else {
      const clean = {};
      for (const [id, raw] of Object.entries(t2)) {
        const c = raw;
        if (!c || typeof c.week !== "number" || !c.blocks || typeof c.blocks !== "object") continue;
        const blocks = noBlocks();
        let okBlocks = true;
        for (const k of TRAIN_FOCI) {
          const v = c.blocks[k];
          if (v === void 0) continue;
          if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
            okBlocks = false;
            break;
          }
          blocks[k] = Math.floor(v);
        }
        if (okBlocks) clean[id] = { week: c.week, blocks };
      }
      out.training = clean;
    }
  }
  if (Array.isArray(out.roster) && Array.isArray(out.prospects)) {
    const waiting = out.prospects.map((p) => p?.fighter);
    const fixed = repairFighterIds(out, GYM_ID, [out.roster, waiting.filter((f) => !!f)]);
    if (fixed.moved > 0) {
      out.roster = fixed.lists[0];
      let k = 0;
      out.prospects = out.prospects.map((p) => p?.fighter ? { ...p, fighter: fixed.lists[1][k++] } : p);
    }
  }
  return out;
}
function gymVerdict(g) {
  const wrecked = g.alumni.filter((a) => a.damage >= 70).length;
  const clean = g.alumni.filter((a) => a.damage < 45 && (a.fights === void 0 || a.fights > 0)).length;
  const sold = g.closed && g.exit === "sold";
  const broke = wentBroke(g);
  const exitPoints = sold ? Math.min(SALE_BONUS_CAP, (g.soldFor ?? 0) * 3) : broke ? -BROKE_PENALTY : 0;
  const score = clampi(
    g.reputation * 0.5 + g.titles * 13 + g.history.filter((h) => h.result === "W").length * 0.7 + clean * 2 - wrecked * 5 + exitPoints,
    0,
    100
  );
  const ending = sold ? `Sold in week ${g.week} for ${(g.soldFor ?? 0).toFixed(3)}m. Going out on your own terms.` : broke ? `The rent went unpaid in week ${g.week}. Going under costs the gym ${BROKE_PENALTY} points.` : null;
  const tier = score >= 88 ? "A Great Gym" : score >= 70 ? "Respected" : score >= 50 ? "Getting Known" : score >= 28 ? "Small Time" : "A Room With Bags In It";
  return {
    score,
    tier,
    bullets: [
      ...ending ? [ending] : [],
      `${g.history.filter((h) => h.result === "W").length} wins from ${g.history.length} fights over ${g.week} weeks.`,
      g.titles ? `${g.titles} world title${g.titles > 1 ? "s" : ""} out of this gym.` : "No world titles.",
      `${g.alumni.length} fighters came through. ${clean} got out clean, ${wrecked} did not.`,
      `Reputation ${g.reputation.toFixed(0)} out of 100.`
    ]
  };
}

// src/lib/fightPromoter.ts
var fightPromoter_exports = {};
__export(fightPromoter_exports, {
  BROKE_PENALTY: () => BROKE_PENALTY2,
  HANDOVER_MIN_SHOWS: () => HANDOVER_MIN_SHOWS,
  VENUES: () => VENUES,
  appealOf: () => appealOf,
  canHandOver: () => canHandOver,
  closeBroke: () => closeBroke2,
  drawOf: () => drawOf,
  expectedAttendance: () => expectedAttendance,
  handOver: () => handOver,
  handOverPrice: () => handOverPrice,
  houseFill: () => houseFill,
  legalMatch: () => legalMatch,
  newPromoter: () => newPromoter,
  promoterVerdict: () => promoterVerdict,
  purseFor: () => purseFor,
  qualityOf: () => qualityOf,
  runShow: () => runShow,
  sanitizePromoter: () => sanitizePromoter,
  venueById: () => venueById,
  weightOf: () => weightOf,
  wentBroke: () => wentBroke2
});
var VENUES = [
  { id: "hall", name: "The Leisure Centre", capacity: 1200, rent: 6e-3, needs: 0 },
  { id: "town", name: "Town Hall", capacity: 3e3, rent: 0.018, needs: 12 },
  { id: "ballroom", name: "The Ballroom", capacity: 6e3, rent: 0.05, needs: 26 },
  { id: "arena", name: "City Arena", capacity: 16e3, rent: 0.17, needs: 45 },
  { id: "dome", name: "The Dome", capacity: 42e3, rent: 0.62, needs: 68 },
  { id: "stadium", name: "National Stadium", capacity: 78e3, rent: 1.45, needs: 86 }
];
function venueById(id) {
  return VENUES.find((v) => v.id === id) ?? VENUES[0];
}
var POOL_TARGET = 10;
var PROMOTER_ID = "p";
function newPromoter(name, seedLabel) {
  const seed = hashLabel(seedLabel ?? `promoter|${name}`);
  const rng = rngFrom(seed);
  const st = {
    version: 1,
    name: name.trim() || "Small Hall Promotions",
    show: 1,
    money: 0.12,
    reputation: 5,
    pool: [],
    history: [],
    log: ["You book your first room. Nobody has heard of you."],
    closed: false,
    seed,
    rngTick: 0
  };
  for (let i = 0; i < POOL_TARGET; i += 1) {
    const w = WEIGHT_CLASSES[Math.floor(rng() * WEIGHT_CLASSES.length)].id;
    const f = makeFighter(rng, 38 + rng() * 18, w, void 0, mintFighterId(st, PROMOTER_ID));
    f.wins = Math.floor(rng() * 8);
    f.losses = Math.floor(rng() * 4);
    st.pool.push(f);
  }
  return st;
}
function stream2(st) {
  const rng = rngFrom(st.seed + st.rngTick * 7919);
  return { rng, done: (n) => {
    st.rngTick += Math.max(1, n);
  } };
}
function weightOf(f) {
  return fighterClass(f);
}
function drawOf(f) {
  return clamp(f.wins * 1.5 + f.kos * 1.1 - f.losses * 2.4, 0, 40);
}
function appealOf(a, b, title) {
  const names = drawOf(a) + drawOf(b);
  const gap = Math.abs(ratingOf(a) - ratingOf(b));
  const evenness = clamp(1 - gap / 22, 0, 1);
  return clamp(names * 1.3 + evenness * 14 + (title ? 22 : 0), 0, 100);
}
function legalMatch(a, b) {
  if (a.id === b.id) return false;
  if (weightOf(a) !== weightOf(b)) return false;
  if (a.damage >= 80 || b.damage >= 80) return false;
  return true;
}
function purseFor(a, b, title) {
  const base = (drawOf(a) + drawOf(b)) * 11e-4 + 6e-4;
  return Math.round(base * (title ? 2.4 : 1) * 1e3) / 1e3;
}
function expectedAttendance(st, plan) {
  const venue = venueById(plan.venueId);
  const bouts = plan.bookings.map((b) => {
    const a = st.pool.find((f) => f.id === b.aId);
    const c = st.pool.find((f) => f.id === b.bId);
    return a && c ? appealOf(a, c, b.title) : 0;
  }).sort((x, y) => y - x);
  if (!bouts.length) return 0;
  const cardAppeal = bouts.reduce((s, v, i) => s + v / (i + 1.6), 0);
  const pull = clamp(cardAppeal / 46 * (0.6 + st.reputation / 110), 0, 1.25);
  const fair = 4e-5 + cardAppeal / 46 * 26e-5;
  const priceFactor = clamp(1.25 - plan.ticketPrice / Math.max(1e-9, fair) * 0.55, 0.05, 1.2);
  return clampi(venue.capacity * clamp(pull * priceFactor, 0, 1), 0, venue.capacity);
}
function houseFill(attendance, capacity) {
  const soldOut = attendance >= capacity;
  const percent = soldOut ? 100 : clamp(Math.floor(attendance / capacity * 100), 0, 99);
  return { percent, soldOut };
}
function qualityOf(res, rounds) {
  const share = clamp(res.roundsWon / Math.max(1, res.rounds.length), 0, 1);
  const close = clampi(100 - Math.abs(share - 0.5) * 200, 0, 100);
  const action = Math.min(100, res.rounds.reduce((s, r) => s + r.playerLanded + r.oppLanded, 0) / Math.max(1, rounds) * 3.4);
  const competitive = close >= 45;
  const drama = competitive && res.rounds.some((r) => r.knockdown) ? 16 : 0;
  const finish = competitive && (res.method === "KO" || res.method === "TKO") ? 12 : 0;
  return clampi(close * 0.62 + action * 0.26 + drama + finish, 0, 100);
}
function runShow(st, plan, tactics = ["box", "press", "counter"]) {
  if (st.closed) return null;
  const venue = venueById(plan.venueId);
  if (venue.needs > st.reputation) return null;
  if (!plan.bookings.length) return null;
  const { rng, done } = stream2(st);
  const attendance = expectedAttendance(st, plan);
  const gate = Math.round(attendance * plan.ticketPrice * 1e3) / 1e3;
  let purses = 0;
  const bouts = [];
  const pool = st.pool.map((f) => ({ ...f, attrs: { ...f.attrs } }));
  for (const b of plan.bookings) {
    const ai = pool.findIndex((f) => f.id === b.aId);
    const bi = pool.findIndex((f) => f.id === b.bId);
    if (ai < 0 || bi < 0) continue;
    const a = pool[ai];
    const c = pool[bi];
    purses += purseFor(a, c, b.title);
    const res = simBout({
      player: a,
      opponent: c,
      rounds: b.rounds,
      weight: weightOf(a),
      tactics,
      campQuality: 0.5
    }, rng);
    const quality = qualityOf(res, b.rounds);
    bouts.push({ a: { ...a }, b: { ...c }, result: res, rounds: b.rounds, title: b.title, quality });
    a.damage = Math.round((a.damage + res.damageTaken) * 10) / 10;
    c.damage = Math.round((c.damage + res.damageDealt) * 10) / 10;
    a.age = Math.round((a.age + 0.08) * 100) / 100;
    c.age = Math.round((c.age + 0.08) * 100) / 100;
    if (res.winner === "player") {
      a.wins += 1;
      c.losses += 1;
      if (res.method === "KO" || res.method === "TKO") a.kos += 1;
    } else if (res.winner === "opp") {
      c.wins += 1;
      a.losses += 1;
      if (res.method === "KO" || res.method === "TKO") c.kos += 1;
    } else {
      a.draws += 1;
      c.draws += 1;
    }
  }
  done(plan.bookings.length * 80 + 8);
  const flat = Math.round(purses * 1e3) / 1e3;
  const share = Math.round(gate * 0.58 * 1e3) / 1e3;
  purses = Math.max(flat, share);
  const profit = Math.round((gate - purses - venue.rent) * 1e3) / 1e3;
  const best = bouts.reduce((m, b) => b.quality > m ? b.quality : m, 0);
  const meanQ = bouts.length ? bouts.reduce((s, b) => s + b.quality, 0) / bouts.length : 0;
  const headroom = 1 - st.reputation / 100;
  const repDelta = Math.round(((meanQ - 46) / 11 + (best >= 78 ? 2.2 : 0)) * clamp(headroom * 1.6, 0.15, 1) * 10) / 10;
  const next = {
    ...st,
    show: st.show + 1,
    money: Math.round((st.money + profit) * 1e3) / 1e3,
    reputation: clamp(Math.round((st.reputation + repDelta) * 10) / 10, 0, 100),
    pool,
    history: [...st.history, {
      show: st.show,
      venue: venue.name,
      attendance,
      profit,
      best: bouts.length ? `${bouts[0].a.name} vs ${bouts[0].b.name}` : "nothing"
    }],
    log: [
      `${venue.name}: ${attendance.toLocaleString()} in, gate ${gate.toFixed(3)}m, purses ${purses.toFixed(3)}m, ${profit >= 0 ? "profit" : "loss"} ${Math.abs(profit).toFixed(3)}m.`,
      ...st.log
    ]
  };
  next.pool = refreshPool(next);
  const ended = next.money < 0 ? closeBroke2(next) : next;
  const headline = bouts.length ? `${bouts[0].a.name} against ${bouts[0].b.name}, ${bouts[0].result.method}` : "no fights";
  return { state: ended, result: { venue, attendance, ticketPrice: plan.ticketPrice, gate, purses, rent: venue.rent, profit, bouts, repDelta, headline } };
}
function refreshPool(st) {
  const { rng, done } = stream2(st);
  const alive = st.pool.filter((f) => f.damage < 82 && f.age < 39);
  const out = alive.slice();
  const leaveChance = 0.55 * (1 - st.reputation / 100);
  if (out.length > 4 && rng() < leaveChance) {
    let bi = 0;
    for (let i = 1; i < out.length; i += 1) if (ratingOf(out[i]) > ratingOf(out[bi])) bi = i;
    out.splice(bi, 1);
  }
  const upgradeChance = 0.12 + st.reputation / 100 * 0.55;
  if (out.length >= POOL_TARGET && rng() < upgradeChance) {
    let wi = 0;
    for (let i = 1; i < out.length; i += 1) if (drawOf(out[i]) < drawOf(out[wi])) wi = i;
    out.splice(wi, 1);
  }
  const tier = 36 + st.reputation / 100 * 36;
  while (out.length < POOL_TARGET) {
    const w = WEIGHT_CLASSES[Math.floor(rng() * WEIGHT_CLASSES.length)].id;
    const f = makeFighter(rng, clamp(tier + (rng() - 0.45) * 15, 28, 92), w, void 0, mintFighterId(st, PROMOTER_ID));
    f.wins = Math.floor(rng() * 6);
    out.push(f);
  }
  done(POOL_TARGET * 3);
  return out;
}
function closeBroke2(st) {
  return {
    ...st,
    closed: true,
    exit: "broke",
    log: ["You cannot cover the next room. That is the business.", ...st.log]
  };
}
var HANDOVER_MIN_SHOWS = 10;
function handOverPrice(st) {
  return Math.round((0.1 + (clamp(st.reputation, 0, 100) / 100) ** 1.5 * 3) * 1e3) / 1e3;
}
function canHandOver(st) {
  return !st.closed && st.history.length >= HANDOVER_MIN_SHOWS;
}
function handOver(st) {
  if (!canHandOver(st)) return null;
  const price = handOverPrice(st);
  return {
    ...st,
    money: Math.round((st.money + price) * 1e3) / 1e3,
    closed: true,
    exit: "handed",
    handedFor: price,
    log: [`After ${st.history.length} shows you hand the promotion over for ${price.toFixed(3)}m.`, ...st.log]
  };
}
function wentBroke2(st) {
  return st.closed && st.exit === "broke";
}
var BROKE_PENALTY2 = 12;
function sanitizePromoter(st) {
  const out = { ...st };
  if (out.exit !== void 0 && out.exit !== "handed" && out.exit !== "broke") delete out.exit;
  if (out.handedFor !== void 0 && !(typeof out.handedFor === "number" && Number.isFinite(out.handedFor))) delete out.handedFor;
  if (Array.isArray(out.pool)) {
    const fixed = repairFighterIds(out, PROMOTER_ID, [out.pool]);
    if (fixed.moved > 0) out.pool = fixed.lists[0];
  }
  return out;
}
function promoterVerdict(st) {
  const shows = st.history.length;
  const profitable = st.history.filter((h) => h.profit > 0).length;
  const crowd = shows ? st.history.reduce((s, h) => s + h.attendance, 0) / shows : 0;
  const handed = st.closed && st.exit === "handed";
  const broke = wentBroke2(st);
  const score = clampi(
    st.reputation * 0.62 + Math.min(24, st.money * 5) + Math.min(14, profitable * 0.9) - (broke ? BROKE_PENALTY2 : 0),
    0,
    100
  );
  const ending = handed ? `Handed over after ${shows} shows for ${(st.handedFor ?? 0).toFixed(3)}m. Out on your own terms.` : broke ? `The money ran out after ${shows} shows. Going under costs ${BROKE_PENALTY2} points.` : null;
  const tier = score >= 86 ? "The Big Time" : score >= 68 ? "A Real Promoter" : score >= 48 ? "Making a Living" : score >= 26 ? "Small Hall" : "A Man With a Ring";
  return {
    score,
    tier,
    bullets: [
      ...ending ? [ending] : [],
      `${shows} show${shows === 1 ? "" : "s"}, ${profitable} of them in profit.`,
      `Average house ${Math.round(crowd).toLocaleString()}.`,
      `Name ${st.reputation.toFixed(0)} out of 100, ${st.money.toFixed(3)}m in the bank.`
    ]
  };
}
export {
  fightCareer_exports as fc,
  fightCareerLifeFlow_exports as ff,
  fightCareerInbox_exports as fi,
  fightCareerLife_exports as fl,
  fightCareerRivalry_exports as fr,
  fightGym_exports as gym,
  fightPromoter_exports as pro
};
