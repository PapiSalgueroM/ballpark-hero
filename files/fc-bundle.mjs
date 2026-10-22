// src/lib/careerEngine.ts
function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
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
function tacticEdge(t, against) {
  return TACTIC_EDGE[t][against];
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
  const right = tactics.filter((t) => tacticEdge(t, oppStyle) > 0).length;
  s += Math.round(right / Math.max(1, tactics.length) * 14);
  s -= Math.min(14, Math.round(res.damageTaken * 0.7));
  return clampi(s, 0, DAILY_MAX);
}
export {
  DAILY_MAX,
  DRAIN_PER_KNOCKDOWN,
  DRAIN_PER_PUNCH,
  FIRST_FIGHTER_NO,
  PAST_FIGHTERS_MAX,
  RETIRE_MIN_FIGHTS,
  SOFT_FLOOR_FROM,
  STANDING_FLOOR,
  STYLES,
  TACTICS,
  WEIGHT_CLASSES,
  applyResult,
  archiveCareer,
  campGain,
  canRetire,
  conditionShown,
  conditionTrack,
  dailyFight,
  effectiveAttrs,
  fighterClass,
  genFighterName,
  legacyOf,
  makeFighter,
  mintFighterId,
  newFightCareer,
  offersFor,
  pastFighterOf,
  ratingOf,
  repairFighterIds,
  retireByChoice,
  runCamp,
  sanitizePastFighters,
  scoreDaily,
  shouldRetire,
  simBout,
  tacticEdge,
  takeFight,
  weightById
};
