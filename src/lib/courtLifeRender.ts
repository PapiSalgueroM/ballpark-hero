import { COURT_BALL_RADIUS, COURT_LENGTH, COURT_RIM_HEIGHT, COURT_RIM_RADIUS, COURT_THREE_POINT_DISTANCE, COURT_WIDTH, courtBackboard, courtBasket, courtPassTarget, type CourtMatch, type CourtPlayer } from '@/lib/courtLife';

export const COURT_COLORS = {
  night: '#172d3b', fence: '#466471', floor: '#386272', lane: '#b86e4d',
  line: '#f1e4be', ball: '#f19840', home: '#55c7c0', away: '#ed9879',
};

export function courtProjection(width: number, height: number) {
  const scale = Math.min((width - 28) / COURT_LENGTH, (height - 54) / (COURT_WIDTH * .72));
  const left = (width - COURT_LENGTH * scale) / 2;
  const top = (height - COURT_WIDTH * scale * .72) / 2 + 9;
  return {
    scale,
    point: (x: number, y: number, z = 0) => ({ x: left + (COURT_LENGTH - y) * scale, y: top + x * scale * .72 - z * scale * .75 }),
  };
}

export function courtSceneFrame(match: CourtMatch, width: number, height: number) {
  const projection = courtProjection(width, height);
  return {
    tick: match.tick, phase: match.phase, scale: projection.scale,
    ball: { ...projection.point(match.ball.x, match.ball.y, match.ball.z), shadow: projection.point(match.ball.x, match.ball.y), radius: Math.max(2.4, COURT_BALL_RADIUS * projection.scale), mode: match.ball.mode, flightId: match.ball.flightId },
    players: match.players.map(player => ({ id: player.id, side: player.side, action: player.action, ...projection.point(player.x, player.y, player.z), shadow: projection.point(player.x, player.y), controlled: player.id === match.controlledPlayerId })),
    baskets: (['home', 'away'] as const).map(side => ({ side, ...projection.point(courtBasket(side).x, courtBasket(side).y, COURT_RIM_HEIGHT) })),
  };
}

export function drawCourtLife(ctx: CanvasRenderingContext2D, match: CourtMatch, width: number, height: number, reducedMotion: boolean) {
  const { point, scale } = courtProjection(width, height);
  const frame = courtSceneFrame(match, width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = COURT_COLORS.night;
  ctx.fillRect(0, 0, width, height);
  const corner = point(0, COURT_LENGTH);
  const floorWidth = COURT_LENGTH * scale, floorHeight = COURT_WIDTH * scale * .72;

  // Fixed original scenery has no effect on the court simulation.
  ctx.fillStyle = '#203b49';
  for (let index = 0; index < 11; index++) {
    const x = index * width / 10 - 12, roof = 5 + index % 3 * 6;
    ctx.fillRect(x, roof, width / 11, Math.max(0, corner.y - roof - 4));
    ctx.fillStyle = index % 3 === 0 ? '#b5996e' : '#5b7278';
    ctx.fillRect(x + 5, roof + 5, 3, 4);
    ctx.fillStyle = '#203b49';
  }
  ctx.fillStyle = '#10222c';
  ctx.fillRect(corner.x - 6, corner.y - 5, floorWidth + 12, floorHeight + 13);
  ctx.fillStyle = COURT_COLORS.floor;
  ctx.fillRect(corner.x, corner.y, floorWidth, floorHeight);
  ctx.fillStyle = '#315866';
  for (let index = 1; index < 12; index += 2) ctx.fillRect(corner.x + index * floorWidth / 12, corner.y, floorWidth / 12, floorHeight);

  const line = (x1: number, y1: number, x2: number, y2: number, z = 0) => {
    const a = point(x1, y1, z), b = point(x2, y2, z);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  const worldCircle = (x: number, y: number, radius: number) => {
    const center = point(x, y);
    ctx.beginPath(); ctx.ellipse(center.x, center.y, radius * scale, radius * scale * .72, 0, 0, Math.PI * 2); ctx.stroke();
  };
  ctx.lineWidth = Math.max(1, scale * .045);
  ctx.strokeStyle = COURT_COLORS.line;
  for (const side of ['home', 'away'] as const) {
    const near = side === 'home' ? 0 : COURT_LENGTH;
    const depth = side === 'home' ? 5.2 : COURT_LENGTH - 5.2;
    const a = point(5, near), b = point(11, depth);
    ctx.fillStyle = COURT_COLORS.lane;
    ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    line(5, near, 5, depth); line(11, near, 11, depth); line(5, depth, 11, depth);
    worldCircle(8, depth, 1.65);
    const basket = courtBasket(side);
    ctx.save(); ctx.beginPath(); ctx.rect(corner.x, corner.y, floorWidth, floorHeight); ctx.clip();
    worldCircle(basket.x, basket.y, COURT_THREE_POINT_DISTANCE); ctx.restore();
  }
  ctx.strokeRect(corner.x, corner.y, floorWidth, floorHeight);
  line(0, COURT_LENGTH / 2, COURT_WIDTH, COURT_LENGTH / 2);
  worldCircle(COURT_WIDTH / 2, COURT_LENGTH / 2, 1.65);
  ctx.strokeStyle = COURT_COLORS.fence;
  line(0, 0, 0, COURT_LENGTH, 1.6);
  for (let index = 0; index <= 12; index++) line(0, index * 2, 0, index * 2, 1.6);
  ctx.fillStyle = '#b2c2ba';
  for (let index = 0; index < 9; index++) {
    const seat = point(-.65, 3 + index * 2.25);
    ctx.fillRect(Math.round(seat.x), Math.round(seat.y) - 3, 3, 3);
    ctx.fillStyle = index % 2 ? '#d28b67' : '#729995';
    ctx.fillRect(Math.round(seat.x) - 1, Math.round(seat.y), 5, 5);
    ctx.fillStyle = '#b2c2ba';
  }

  const targetId = match.controlledPlayerId && match.ball.ownerId === match.controlledPlayerId ? courtPassTarget(match, match.controlledPlayerId) : null;
  for (const player of match.players) {
    const shadow = point(player.x, player.y);
    ctx.fillStyle = '#10273199';
    ctx.beginPath(); ctx.ellipse(shadow.x, shadow.y + 1, scale * .42, scale * .2, 0, 0, Math.PI * 2); ctx.fill();
    if (player.id === match.controlledPlayerId || player.id === targetId) {
      ctx.strokeStyle = player.id === match.controlledPlayerId ? '#ffe2a3' : '#e8f6e8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash(player.id === targetId ? [3, 3] : []);
      ctx.beginPath(); ctx.ellipse(shadow.x, shadow.y + 1, scale * .62, scale * .32, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  ctx.fillStyle = '#10273188';
  ctx.beginPath(); ctx.ellipse(frame.ball.shadow.x, frame.ball.shadow.y, frame.ball.radius * 1.25, frame.ball.radius * .55, 0, 0, Math.PI * 2); ctx.fill();

  const drawPlayer = (player: CourtPlayer) => {
    const spot = point(player.x, player.y, player.z);
    const size = Math.max(13, scale * 1.5), unit = size / 12;
    const moving = Math.hypot(player.vx, player.vy) > .15;
    const stride = player.stride;
    const step = moving && !reducedMotion ? Math.sin(stride * 5) * 1.4 : 0;
    const skin = ['#dfb78f', '#a76d49', '#704934'][match.players.findIndex(other => other.id === player.id) % 3];
    const color = match.teams[player.side].color || COURT_COLORS[player.side];
    ctx.save(); ctx.translate(Math.round(spot.x), Math.round(spot.y)); ctx.scale(unit, unit);
    ctx.fillStyle = '#142b35'; ctx.fillRect(-3, -4, 2, 4 + step); ctx.fillRect(1, -4, 2, 4 - step);
    ctx.fillStyle = '#e8e5d6'; ctx.fillRect(-4, Math.round(step), 3, 1.5); ctx.fillRect(1, Math.round(-step), 3, 1.5);
    ctx.fillStyle = color; ctx.fillRect(-3, -9, 6, 5); ctx.fillRect(-3, -5, 2.5, 2); ctx.fillRect(.5, -5, 2.5, 2);
    ctx.fillStyle = skin; ctx.fillRect(-2, -12, 4, 3);
    ctx.fillStyle = '#273139'; ctx.fillRect(-2, -12.5, 4, 1.5);
    ctx.fillStyle = skin;
    const raised = player.action === 'shoot' || player.action === 'jump' || player.action === 'guard';
    const reaching = player.action === 'pass' || player.action === 'steal';
    if (raised) { ctx.fillRect(-5, -11, 2, 5); ctx.fillRect(3, -11, 2, 5); }
    else if (reaching) {
      const toward = -player.facingY >= 0 ? 1 : -1;
      ctx.fillRect(toward > 0 ? 3 : -7, -8, 4, 2); ctx.fillRect(toward > 0 ? -4 : 3, -8, 1.5, 4);
    } else { ctx.fillRect(-4.5, -8, 1.5, 4 + step * .5); ctx.fillRect(3, -8, 1.5, 4 - step * .5); }
    ctx.fillStyle = '#152b35'; ctx.fillRect(-.6, -7.5, 1.2, 2);
    ctx.restore();
  };
  [...match.players].sort((a, b) => a.x - b.x || a.y - b.y).forEach(drawPlayer);

  for (const side of ['home', 'away'] as const) {
    const basket = courtBasket(side), backboard = courtBackboard(side), near = backboard.y;
    ctx.lineWidth = Math.max(2, scale * .14); ctx.strokeStyle = '#9cacb0';
    const base = point(8, near), top = point(8, near, COURT_RIM_HEIGHT + .5);
    ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
    const low = point(backboard.x + backboard.halfWidth, near, backboard.minZ);
    const high = point(backboard.x - backboard.halfWidth, near, backboard.maxZ);
    ctx.fillStyle = '#dfe8da'; ctx.fillRect(high.x - scale * .1, high.y, scale * .2, low.y - high.y);
    const rim = point(basket.x, basket.y, COURT_RIM_HEIGHT);
    ctx.strokeStyle = '#f1a065'; ctx.lineWidth = Math.max(1.5, scale * .07);
    ctx.beginPath(); ctx.ellipse(rim.x, rim.y, COURT_RIM_RADIUS * scale, COURT_RIM_RADIUS * scale * .72, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#eceddb99'; ctx.lineWidth = .75;
    for (let strand = -1; strand <= 1; strand++) { ctx.beginPath(); ctx.moveTo(rim.x + strand * scale * .2, rim.y); ctx.lineTo(rim.x + strand * scale * .13, rim.y + scale * .45); ctx.stroke(); }
  }
  ctx.fillStyle = COURT_COLORS.ball;
  ctx.beginPath(); ctx.arc(frame.ball.x, frame.ball.y, frame.ball.radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#583c27'; ctx.lineWidth = Math.max(.65, scale * .035);
  ctx.beginPath(); ctx.arc(frame.ball.x, frame.ball.y, frame.ball.radius, 0, Math.PI * 2); ctx.moveTo(frame.ball.x - frame.ball.radius, frame.ball.y); ctx.lineTo(frame.ball.x + frame.ball.radius, frame.ball.y); ctx.stroke();
  return frame;
}
