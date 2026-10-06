export type CageStyle = 'balanced' | 'striker' | 'grappler';
export type CageAction = 'jab' | 'power' | 'kick' | 'grapple' | 'submit' | 'escape';
export type CageSide = 'player' | 'cpu';
export type CagePose = 'idle' | 'move' | 'guard' | CageAction;
export interface CageInput { move: -1 | 0 | 1; guard: boolean; action: CageAction | null }
export interface CageFighter {
  x: number; health: number; stamina: number; style: CageStyle;
  action: CagePose; actionTicks: number; cooldown: number; posture: boolean;
  hits: number; takedowns: number; damageDealt: number; blocked: number;
  controlTicks: number; submission: number;
}
export interface CageFight {
  seed: number; tick: number; phase: 'fight' | 'break' | 'finished';
  position: 'standing' | 'clinch' | 'ground'; top: CageSide | null;
  groundLevel: 0 | 1 | 2; cpuInput: CageInput;
  round: 1 | 2 | 3; remainingTicks: number;
  player: CageFighter; cpu: CageFighter;
  roundStart: { player: number; cpu: number };
  roundCards: { player: number; cpu: number }[]; message: string;
  result: null | { winner: CageSide | 'draw'; method: 'KO' | 'Submission' | 'Decision'; score: number };
}

export const CAGE_TICK_MS = 50;
export const CAGE_ROUND_TICKS = 900;
export const CAGE_ACTION_COSTS: Record<CageAction, number> = { jab: 7, power: 14, kick: 16, grapple: 12, submit: 12, escape: 10 };
export const CAGE_COOLDOWNS: Record<CageAction, number> = { jab: 10, power: 20, kick: 24, grapple: 20, submit: 0, escape: 22 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const opposite = (side: CageSide): CageSide => side === 'player' ? 'cpu' : 'player';
const blankInput = (): CageInput => ({ move: 0, guard: false, action: null });
function random(seed: number) {
  let value = seed >>> 0 || 1;
  return () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; };
}
function fighter(style: CageStyle, x: number): CageFighter {
  return { x, health: 100, stamina: 100, style, action: 'idle', actionTicks: 0, cooldown: 0, posture: false,
    hits: 0, takedowns: 0, damageDealt: 0, blocked: 0, controlTicks: 0, submission: 0 };
}
export function createCageFight(playerStyle: CageStyle, cpuStyle: CageStyle, seed: number): CageFight {
  return { seed: seed >>> 0, tick: 0, phase: 'fight', position: 'standing', top: null, groundLevel: 0, cpuInput: blankInput(),
    round: 1, remainingTicks: CAGE_ROUND_TICKS, player: fighter(playerStyle, 28), cpu: fighter(cpuStyle, 72),
    roundStart: { player: 0, cpu: 0 }, roundCards: [], message: 'Move into range. Watch your stamina.', result: null };
}

// Context only, so a held control stays available during recovery between actions.
export function canCageAction(state: CageFight, action: CageAction, side: CageSide = 'player'): boolean {
  if (state.phase !== 'fight') return false;
  if (action === 'submit') return state.position === 'ground' && !state[side].posture
    && (state.top === side || (state.groundLevel === 0 && !state[opposite(side)].posture));
  if (action === 'power' && state.position === 'ground') return state.top === side && state[side].posture;
  if (action === 'grapple' && state.position === 'ground' && state.top === side) return state.groundLevel < 2;
  return true;
}
export function cageActionLabel(state: CageFight, action: CageAction, side: CageSide = 'player'): string {
  if (state.position === 'ground') {
    const top = state.top === side;
    return { jab: 'Ground strike', power: 'Heavy ground strike', kick: top ? state[side].posture ? 'Lower posture' : 'Posture up' : 'Regain guard',
      grapple: top ? 'Pass guard' : 'Sweep', submit: 'Submit', escape: 'Stand up' }[action];
  }
  if (state.position === 'clinch') return { jab: 'Short punch', power: 'Heavy punch', kick: 'Knee', grapple: 'Takedown', submit: 'Submit', escape: 'Break clinch' }[action];
  return { jab: 'Jab', power: 'Heavy', kick: 'Kick', grapple: 'Clinch', submit: 'Submit', escape: 'Step back' }[action];
}

function points(f: CageFighter): number { return f.damageDealt + f.takedowns * 4 + f.controlTicks / 40 + f.blocked * .4; }
function earnedScore(state: CageFight, winner: CageSide | 'draw', method: 'KO' | 'Submission' | 'Decision'): number {
  const outcome = winner === 'player' ? 50 : winner === 'draw' ? 25 : 0;
  const finish = winner === 'player' && method !== 'Decision' ? 15 : 0;
  const damage = Math.min(20, state.player.damageDealt / 100 * 20);
  const defense = Math.min(15, state.player.blocked * .7 + state.player.controlTicks / 90);
  return Math.round(clamp(outcome + finish + damage + defense, 0, 100));
}
export function cageClashScore(state: CageFight): number {
  return state.phase === 'finished' && state.result ? earnedScore(state, state.result.winner, state.result.method) : 0;
}
function finish(state: CageFight, winner: CageSide | 'draw', method: 'KO' | 'Submission' | 'Decision') {
  state.phase = 'finished';
  state.result = { winner, method, score: earnedScore(state, winner, method) };
  state.cpuInput = blankInput();
  state.message = winner === 'draw' ? `Draw by ${method}.` : `${winner === 'player' ? 'You win' : 'CPU wins'} by ${method}.`;
}
function guardActive(f: CageFighter, input: CageInput): boolean { return input.guard && f.stamina > 0 && f.actionTicks === 0; }
function pose(f: CageFighter, action: CageAction, ticks = 6) { f.action = action; f.actionTicks = ticks; }
function stand(state: CageFight) {
  state.position = 'standing'; state.top = null; state.groundLevel = 0;
  const middle = (state.player.x + state.cpu.x) / 2;
  state.player.x = clamp(middle - 10, 10, 70); state.cpu.x = state.player.x + 20;
  for (const side of ['player', 'cpu'] as const) { state[side].posture = false; state[side].submission = 0; }
}
function hit(state: CageFight, side: CageSide, defense: CageInput, action: 'jab' | 'power' | 'kick', rng: () => number) {
  const attacker = state[side], target = state[opposite(side)];
  const range = action === 'kick' ? 20 : action === 'power' ? 12 : 10;
  if (state.position === 'standing' && Math.abs(attacker.x - target.x) > range) {
    state.message = 'That strike missed. Get closer.'; return;
  }
  const standing = action === 'jab' ? 4 : action === 'power' ? 9 : 8;
  const base = state.position === 'ground' ? state.top === side ? action === 'power' ? 7 : 3.5 : 1.8
    : state.position === 'clinch' ? action === 'jab' ? 3 : 6 : standing;
  const style = attacker.style === 'striker' ? 1.15 : attacker.style === 'grappler' ? .88 : 1;
  const staminaFactor = .45 + .55 * attacker.stamina / 100;
  let damage = base * style * staminaFactor * (.9 + rng() * .2);
  if (guardActive(target, defense)) {
    damage *= .3; target.stamina = Math.max(0, target.stamina - 3); target.blocked += 1;
    state.message = 'Guard softened the strike.';
  } else state.message = state.position === 'ground' ? 'Ground strike landed.' : 'Strike landed.';
  damage = Math.min(target.health, damage);
  target.health = Math.max(0, target.health - damage); attacker.damageDealt += damage; attacker.hits += 1;
  target.submission = Math.max(0, target.submission - damage * 2);
  if (state.position === 'standing') {
    const direction = target.x > attacker.x ? 1 : -1;
    target.x = clamp(target.x + direction * (action === 'jab' ? .4 : 1.3), 10, 90);
  }
  if (target.health === 0) finish(state, side, 'KO');
}
function actionCost(state: CageFight, action: CageAction): number {
  return state.position === 'ground' && action === 'kick' ? 8 : CAGE_ACTION_COSTS[action];
}
function execute(state: CageFight, side: CageSide, input: CageInput, defense: CageInput, rng: () => number) {
  const action = input.action, actor = state[side], target = state[opposite(side)];
  if (!action || action === 'submit' || !canCageAction(state, action, side) || actor.cooldown > 0) return;
  const cost = actionCost(state, action);
  if (actor.stamina < cost) return;
  actor.stamina -= cost; actor.cooldown = CAGE_COOLDOWNS[action]; pose(actor, action);
  if (action === 'jab' || action === 'power' || (action === 'kick' && state.position !== 'ground')) {
    hit(state, side, defense, action, rng); return;
  }
  const advantage = (actor.stamina - target.stamina) / 300 + (actor.style === 'grappler' ? .13 : actor.style === 'striker' ? -.07 : 0);
  if (action === 'grapple') {
    if (state.position === 'standing') {
      if (Math.abs(actor.x - target.x) > 9) { state.message = 'Too far to clinch.'; return; }
      state.position = 'clinch'; state.message = 'Clinch. Takedown or break away.';
    } else if (state.position === 'clinch') {
      if (rng() < clamp(.58 + advantage - (guardActive(target, defense) ? .13 : 0), .2, .85)) {
        state.position = 'ground'; state.top = side; state.groundLevel = 0; actor.takedowns += 1;
        actor.posture = false; target.posture = false; actor.submission = 0; target.submission = 0;
        state.message = `${side === 'player' ? 'You have' : 'CPU has'} top position.`;
      } else state.message = 'Takedown defended.';
    } else if (state.top === side) {
      if (rng() < clamp(.62 + advantage - (guardActive(target, defense) ? .12 : 0), .25, .9)) {
        state.groundLevel = Math.min(2, state.groundLevel + 1) as 0 | 1 | 2;
        target.submission *= .5; state.message = state.groundLevel === 2 ? 'Passed to mount.' : 'Passed to half guard.';
      } else state.message = 'Guard pass defended.';
    } else if (rng() < clamp(.55 + advantage - state.groundLevel * .16 + (target.posture ? .12 : 0), .1, .8)) {
      state.top = side; state.groundLevel = 0; actor.posture = false; target.posture = false;
      actor.submission = 0; target.submission = 0; state.message = 'Sweep changed top position.';
    } else state.message = 'Sweep defended. Regain guard first.';
  } else if (action === 'kick') {
    if (state.top === side) { actor.posture = !actor.posture; state.message = actor.posture ? 'Postured for heavy ground strikes.' : 'Posture lowered for control or submission.'; }
    else if (rng() < clamp(.72 + advantage - (target.posture ? .12 : 0), .3, .9)) {
      state.groundLevel = Math.max(0, state.groundLevel - 1) as 0 | 1 | 2;
      target.posture = false; target.submission *= .6; state.message = 'Space made. Guard recovered.';
    } else state.message = 'No space yet. Guard and try again.';
  } else if (action === 'escape') {
    target.submission *= .45; actor.submission = 0;
    if (state.position === 'standing') {
      actor.x = clamp(actor.x + (actor.x < target.x ? -3 : 3), 10, 90); state.message = 'Stepped out of range.';
    } else {
      const chance = state.position === 'clinch' ? .7 + advantage : state.top === side ? .75 : .48 + advantage - state.groundLevel * .14;
      if (rng() < clamp(chance, .12, .9)) { stand(state); state.message = 'Back on the feet.'; }
      else { pose(actor, 'escape', 12); state.message = 'Escape resisted. Guard and make space.'; }
    }
  }
}
function submission(state: CageFight, side: CageSide, input: CageInput, defense: CageInput) {
  const actor = state[side], target = state[opposite(side)];
  if (input.action !== 'submit' || !canCageAction(state, 'submit', side) || actor.cooldown > 0) {
    actor.submission = Math.max(0, actor.submission - 1); return;
  }
  const cost = actor.submission === 0 ? CAGE_ACTION_COSTS.submit + .8 : .8;
  if (actor.stamina < cost) { actor.submission = Math.max(0, actor.submission - 2); return; }
  actor.stamina -= cost; pose(actor, 'submit', 2);
  const defenseFactor = guardActive(target, defense) ? 1 - .65 * target.stamina / 100 : 1;
  const progress = (2.1 + (actor.style === 'grappler' ? .4 : 0) + (state.top === side ? state.groundLevel * .4 : 0)) * defenseFactor;
  actor.submission = clamp(actor.submission + progress - (target.action === 'escape' && target.actionTicks > 0 ? 2.8 : 0), 0, 100);
  state.message = actor.submission > 0 ? 'Submission building. Escape or guard to resist.' : 'Submission resisted.';
  if (actor.submission === 100) finish(state, side, 'Submission');
}
function cpuIntent(state: CageFight, playerInput: CageInput, rng: () => number): CageInput {
  const cpu = state.cpu, player = state.player, distance = Math.abs(cpu.x - player.x);
  const toward: -1 | 1 = cpu.x > player.x ? -1 : 1;
  const guarding = rng() < (playerInput.action ? .32 : .18);
  if (state.position === 'standing') {
    if (cpu.stamina < 22) return { move: -toward as -1 | 1, guard: guarding, action: null };
    if (distance > 19) return { move: toward, guard: false, action: null };
    const draw = rng();
    const action: CageAction = distance <= 9 && draw < (cpu.style === 'grappler' ? .58 : .15) ? 'grapple'
      : distance > 12 ? 'kick' : draw < .55 ? 'jab' : draw < .8 ? 'power' : 'kick';
    return { move: distance > (cpu.style === 'grappler' ? 6 : 9) ? toward : 0, guard: guarding, action: guarding ? null : action };
  }
  if (cpu.stamina < 16) return { move: 0, guard: guarding, action: null };
  if (state.position === 'clinch') {
    const draw = rng();
    return { move: 0, guard: guarding, action: draw < (cpu.style === 'grappler' ? .55 : .3) ? 'grapple' : draw < .65 ? 'escape' : 'jab' };
  }
  if (player.submission > 12) return { move: 0, guard: true, action: 'escape' };
  if (cpu.submission > 0 && canCageAction(state, 'submit', 'cpu') && rng() < .86) return { move: 0, guard: false, action: 'submit' };
  const draw = rng();
  if (state.top === 'cpu') {
    const wantsSubmit = cpu.style === 'grappler' ? .45 : .18;
    const action: CageAction = draw < wantsSubmit ? cpu.posture ? 'kick' : 'submit'
      : state.groundLevel < 2 && draw < .58 ? 'grapple' : draw < .74 ? 'kick' : cpu.posture ? 'power' : 'jab';
    return { move: 0, guard: guarding, action };
  }
  return { move: 0, guard: guarding, action: draw < .36 ? 'grapple' : draw < .65 ? 'escape' : draw < .85 ? 'kick'
    : canCageAction(state, 'submit', 'cpu') && cpu.style === 'grappler' ? 'submit' : 'jab' };
}
function recover(f: CageFighter, input: CageInput, position: CageFight['position']) {
  f.cooldown = Math.max(0, f.cooldown - 1); f.actionTicks = Math.max(0, f.actionTicks - 1);
  const resting = f.actionTicks === 0 && input.action === null;
  const gain = input.action === 'submit' ? 0 : input.guard ? .1 : resting ? .65 : .25;
  f.stamina = clamp(f.stamina + gain - (input.guard ? .35 : 0) - (position === 'standing' && input.move !== 0 ? .12 : 0), 0, 100);
  if (f.actionTicks === 0) f.action = guardActive(f, input) ? 'guard' : position === 'standing' && input.move ? 'move' : 'idle';
}
function roundCard(state: CageFight) {
  const player = points(state.player) - state.roundStart.player, cpu = points(state.cpu) - state.roundStart.cpu;
  const card = Math.abs(player - cpu) < .01 ? { player: 10, cpu: 10 } : player > cpu ? { player: 10, cpu: 9 } : { player: 9, cpu: 10 };
  state.roundCards = [...state.roundCards, card];
  if (state.round === 3) {
    const total = state.roundCards.reduce((sum, c) => ({ player: sum.player + c.player, cpu: sum.cpu + c.cpu }), { player: 0, cpu: 0 });
    finish(state, total.player === total.cpu ? 'draw' : total.player > total.cpu ? 'player' : 'cpu', 'Decision');
  } else { state.phase = 'break'; state.cpuInput = blankInput(); state.message = `Round ${state.round} scored ${card.player} to ${card.cpu}. Continue when ready.`; }
}

export function stepCageFight(state: CageFight, input: CageInput, cpuOverride?: CageInput): CageFight {
  if (state.phase !== 'fight') return state;
  const next: CageFight = { ...state, tick: state.tick + 1, remainingTicks: Math.max(0, state.remainingTicks - 1), player: { ...state.player }, cpu: { ...state.cpu } };
  if (next.player.health === 0 || next.cpu.health === 0) {
    finish(next, next.player.health === next.cpu.health ? 'draw' : next.cpu.health === 0 ? 'player' : 'cpu', 'KO'); return next;
  }
  const rng = random(next.seed + next.tick * 7919);
  if (cpuOverride) next.cpuInput = cpuOverride;
  else if (state.tick % 8 === 0) next.cpuInput = cpuIntent(next, input, rng);
  const cpu = next.cpuInput;
  recover(next.player, input, next.position); recover(next.cpu, cpu, next.position);
  if (next.position === 'standing') {
    const move = (f: CageFighter, i: CageInput) => clamp(f.x + i.move * (i.guard ? .55 : .9), 10, 90);
    let px = move(next.player, input), cx = move(next.cpu, cpu);
    if (cx - px < 6) { const middle = clamp((px + cx) / 2, 13, 87); px = middle - 3; cx = middle + 3; }
    next.player.x = px; next.cpu.x = cx;
  }
  const order: CageSide[] = rng() < .5 ? ['player', 'cpu'] : ['cpu', 'player'];
  const position = next.position;
  for (const side of order) {
    execute(next, side, side === 'player' ? input : cpu, side === 'player' ? cpu : input, rng);
    if (next.phase === 'finished') return next;
    if (next.position !== position) break;
  }
  if (next.position === 'ground' && next.top) next[next.top].controlTicks += 1;
  for (const side of order) {
    submission(next, side, side === 'player' ? input : cpu, side === 'player' ? cpu : input);
    if (next.phase === 'finished') return next;
  }
  if (next.remainingTicks === 0) roundCard(next);
  return next;
}
export function continueCageRound(state: CageFight): CageFight {
  if (state.phase !== 'break' || state.round >= 3) return state;
  const next: CageFight = { ...state, phase: 'fight', round: state.round + 1 as 1 | 2 | 3, remainingTicks: CAGE_ROUND_TICKS,
    player: { ...state.player }, cpu: { ...state.cpu }, cpuInput: blankInput(),
    roundStart: { player: points(state.player), cpu: points(state.cpu) }, message: 'New round. Work your range and stamina.' };
  stand(next);
  for (const side of ['player', 'cpu'] as const) {
    next[side].stamina = Math.min(100, next[side].stamina + 40); next[side].cooldown = 0; next[side].actionTicks = 0; next[side].action = 'idle';
  }
  return next;
}
