import { useEffect, useRef, type MutableRefObject } from 'react';
import type { CageFight, CageFighter } from '@/lib/cageClash';

type Props = {
  fightRef: MutableRefObject<CageFight | null>;
  drawRef: MutableRefObject<(fight: CageFight | null) => void>;
};

const ink = '#121e36';
const sand = '#edddae';
const amber = '#ffc65a';
const cobalt = '#638bff';
const coral = '#fb7867';

// All artwork is drawn from original pixel shapes at the canvas's native size.
function paintArena(ctx: CanvasRenderingContext2D, state: CageFight | null, reduced: boolean) {
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const poly = (points: number[][], color: string) => {
    ctx.fillStyle = color; ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
  };
  const label = (text: string, x: number, y: number, color: string, size = 7) => {
    ctx.font = `bold ${size}px monospace`; ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(text, x, y);
  };
  ctx.imageSmoothingEnabled = false;
  rect(0, 0, 320, 180, '#0c1427');
  rect(0, 0, 320, 3, amber);
  rect(8, 11, 65, 3, '#304467'); rect(247, 11, 65, 3, '#304467');
  rect(17, 18, 41, 2, '#1f3151'); rect(262, 18, 41, 2, '#1f3151');
  rect(95, 8, 130, 22, '#25334c'); rect(98, 11, 124, 16, ink);
  label('C A G E   C L A S H', 160, 22, amber, 8);
  // Rows of tiny original spectators with alternating skin tones and shirts.
  const cheer = !reduced && state?.phase === 'fight' ? Math.floor(state.tick / 12) % 2 : 0;
  for (let row = 0; row < 3; row++) {
    const y = 38 + row * 13;
    rect(0, y + 10, 320, 3, '#0d192d');
    for (let column = 0; column < 29; column++) {
      const x = column * 12 + (row % 2) * 6 - 5;
      const tone = ['#a77760', '#d1a485', '#765542'][(column + row * 2) % 3];
      const shirt = ['#2c4568', '#4c455e', '#685742', '#254c55'][(column * 3 + row) % 4];
      const hop = cheer && (column + row) % 7 === 0 ? -2 : 0;
      rect(x, y + hop, 4, 4, tone); rect(x - 2, y + 4 + hop, 8, 6, shirt);
      if ((column + row) % 7 === 0) { rect(x - 4, y + 2 + hop, 2, 5, tone); rect(x + 6, y + 2 + hop, 2, 5, tone); }
    }
  }
  poly([[44, 82], [276, 82], [315, 115], [292, 163], [28, 163], [5, 115]], '#9e998c');
  poly([[45, 86], [275, 86], [307, 115], [286, 156], [34, 156], [13, 115]], sand);
  poly([[55, 93], [265, 93], [291, 115], [276, 147], [44, 147], [29, 115]], '#d9cba7');
  poly([[61, 97], [259, 97], [286, 115], [272, 143], [48, 143], [34, 115]], sand);
  // Floor markings stay simple so silhouettes are readable.
  poly([[140, 112], [180, 112], [193, 126], [180, 140], [140, 140], [127, 126]], '#bdb795');
  poly([[143, 115], [177, 115], [188, 126], [177, 137], [143, 137], [132, 126]], sand);
  label('CC', 160, 131, '#b1ad90', 14);
  rect(37, 115, 16, 3, '#728dc9'); rect(267, 115, 16, 3, '#d08879');
  // Back fence, diamond mesh and padded posts.
  ctx.save(); ctx.beginPath(); ctx.rect(44, 58, 232, 29); ctx.clip();
  ctx.strokeStyle = '#526171'; ctx.lineWidth = 1;
  for (let x = 20; x < 320; x += 10) {
    ctx.beginPath(); ctx.moveTo(x, 58); ctx.lineTo(x + 29, 87); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, 58); ctx.lineTo(x - 29, 87); ctx.stroke();
  }
  ctx.restore();
  rect(44, 56, 232, 3, ink); rect(44, 83, 232, 3, '#536075');
  [43, 273].forEach(x => { rect(x, 54, 5, 38, ink); rect(x + 1, 58, 2, 23, '#62738a'); });
  rect(39, 61, 9, 20, cobalt); rect(273, 61, 9, 20, coral);

  const fighter = (f: CageFighter | null, x: number, facing: number, player: boolean, pose: string, grounded = false, top = false) => {
    const color = player ? cobalt : coral;
    const shadow = player ? '#3556a1' : '#a84b4c';
    const skin = player ? '#bf825b' : '#e7b58a';
    const shade = player ? '#915b46' : '#b78264';
    const active = !!f && f.actionTicks > 0;
    const bob = !reduced && !active && state?.phase === 'fight' ? Math.floor(state.tick / 6) % 2 : 0;
    const limb = (ax: number, ay: number, bx: number, by: number, thickness: number, color: string) => {
      const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      for (let i = 0; i <= steps; i += 2) rect(ax + (bx - ax) * i / (steps || 1), ay + (by - ay) * i / (steps || 1), thickness, thickness, color);
    };
    ctx.save(); ctx.translate(Math.round(x), 136); ctx.scale(facing, 1);
    rect(-15, -1, 32, 4, '#b7b18f');
    if (grounded) {
      const y = top ? f?.posture ? -26 : pose === 'grapple' ? -15 : -19 : -5;
      if (top) {
        rect(-12, y + 7, 9, 8, shadow); limb(-9, y + 12, -15, -1, 5, skin);
        rect(-8, y - 2, 12, 12, skin); rect(-7, y + 7, 13, 5, color);
        rect(-4, y - 13, 10, 11, shade); rect(-3, y - 13, 10, 8, skin); rect(-4, y - 14, 10, 3, ink);
        if (pose === 'power' || pose === 'posture' || (f?.posture && pose !== 'jab' && pose !== 'submit')) {
          limb(0, y, 8, y - 16, 4, skin); rect(6, y - 20, 6, 6, color);
        } else if (pose === 'jab') {
          limb(2, y + 2, 14, y + 13, 4, skin); rect(12, y + 12, 6, 6, color);
        } else if (pose === 'submit') {
          limb(0, y + 1, 13, y + 5, 4, skin); limb(13, y + 5, 8, y + 12, 4, skin); rect(7, y + 10, 6, 5, color);
        } else { limb(1, y + 2, 11, y + 8, 4, skin); rect(10, y + 8, 5, 5, color); }
        limb(-4, y + 12, 6, -2, 5, skin); rect(5, -2, 10, 3, shade);
      } else {
        rect(-12, y - 4, 19, 7, skin); rect(-14, y - 4, 7, 7, color);
        rect(9, y - 6, 10, 9, skin); rect(17, y - 5, 3, 7, ink);
        limb(-12, y, -21, y - 9, 4, shade); limb(-21, y - 9, -12, y - 16, 4, skin);
        const reach = pose === 'submit' ? -23 : pose === 'escape' || pose === 'grapple' || pose === 'guard' ? -17 : -9;
        limb(2, y - 3, 3, y + reach, 4, skin); rect(1, y + reach - 2, 6, 5, color);
        if (pose === 'submit') { limb(3, y + reach, -7, y + reach, 4, skin); rect(-9, y + reach, 6, 5, color); }
      }
    } else {
      const duck = pose === 'grapple' || pose === 'escape' ? 8 : 0;
      const y = bob + duck;
      // Outlined trunks, feet, shaded torso and close-cut fictional face.
      if (pose === 'kick') {
        limb(-5, -17 + y, -10, -3, 5, shade); rect(-13, -3, 11, 3, skin);
        limb(2, -18 + y, 17, -26 + y, 6, skin); limb(17, -26 + y, 30, -25 + y, 5, skin); rect(30, -26 + y, 7, 5, shade);
      } else {
        const stride = pose === 'move' && state ? (Math.floor(state.tick / 4) % 2 ? 3 : -3) : 0;
        limb(-6, -17 + y, -10 + stride, -4, 5, shade); rect(-13 + stride, -4, 10, 4, skin);
        limb(2, -17 + y, 8 - stride, -4, 5, skin); rect(7 - stride, -4, 10, 4, shade);
      }
      rect(-9, -23 + y, 19, 10, ink); rect(-8, -22 + y, 17, 8, color); rect(-8, -22 + y, 4, 8, shadow); rect(-3, -21 + y, 2, 7, sand);
      rect(-9, -38 + y, 17, 16, shade); rect(-5, -39 + y, 13, 16, skin); rect(-7, -24 + y, 15, 2, shade);
      rect(-2, -43 + y, 6, 5, skin); rect(-5, -53 + y, 13, 12, shade); rect(-4, -52 + y, 13, 9, skin);
      rect(-5, -54 + y, 13, 4, ink); rect(-5, -50 + y, 3, 5, ink); rect(6, -48 + y, 2, 2, ink); rect(8, -46 + y, 3, 3, skin);
      limb(-6, -36 + y, -11, -27 + y, 5, shade); limb(-11, -27 + y, -3, -34 + y, 4, skin); rect(-5, -37 + y, 7, 6, color);
      if (pose === 'power') {
        limb(4, -36 + y, 16, -27 + y, 5, skin); limb(16, -27 + y, 23, -38 + y, 5, skin); rect(22, -43 + y, 8, 8, color); rect(28, -42 + y, 2, 5, sand);
      } else if (pose === 'jab') {
        limb(4, -36 + y, 25, -37 + y, 5, skin); rect(27, -40 + y, 8, 7, color); rect(33, -39 + y, 2, 5, sand);
      } else if (pose === 'guard') {
        limb(5, -34 + y, 10, -44 + y, 5, skin); rect(6, -49 + y, 8, 9, color); rect(-2, -46 + y, 6, 8, shadow);
      } else if (pose === 'grapple' || pose === 'submit') {
        limb(5, -35 + y, 21, -31 + y, 5, skin); rect(20, -33 + y, 6, 7, color);
      } else { limb(5, -35 + y, 11, -39 + y, 5, skin); rect(9, -43 + y, 7, 7, color); }
    }
    ctx.restore();
  };
  const px = state ? 28 + state.player.x * 2.64 : 117;
  const cx = state ? 28 + state.cpu.x * 2.64 : 203;
  const direction = px <= cx ? 1 : -1;
  const pose = (f: CageFighter | undefined) => f?.action ?? 'idle';
  if (state?.position === 'ground') {
    const middle = (px + cx) / 2;
    const playerTop = state.top === 'player';
    fighter(playerTop ? state.cpu : state.player, middle, playerTop ? -1 : 1, !playerTop, pose(playerTop ? state.cpu : state.player), true, false);
    fighter(playerTop ? state.player : state.cpu, middle - (playerTop ? 4 : -4), playerTop ? 1 : -1, playerTop, pose(playerTop ? state.player : state.cpu), true, true);
  } else {
    fighter(state?.player ?? null, px, direction, true, state?.position === 'clinch' ? 'grapple' : pose(state?.player));
    fighter(state?.cpu ?? null, cx, -direction, false, state?.position === 'clinch' ? 'grapple' : pose(state?.cpu));
  }
  // Low front rail frames the stage without hiding feet or ground exchanges.
  poly([[5, 115], [28, 163], [292, 163], [315, 115], [320, 118], [296, 168], [24, 168], [0, 118]], ink);
  rect(27, 162, 266, 2, '#64738a'); rect(28, 165, 264, 5, '#263954');
  rect(0, 169, 320, 11, '#0c1427');
  label('YOU', 46, 177, cobalt, 7); label('CPU', 276, 177, coral, 7);
  label(state?.position === 'ground' ? (state.top === 'player' ? 'YOU ON TOP' : 'CPU ON TOP') : state?.position === 'clinch' ? 'CLOSE QUARTERS' : 'FIND YOUR RANGE', 160, 177, '#b8c5d7', 7);
  if (!state) { rect(121, 69, 78, 13, ink); label('READY TO RUMBLE', 160, 78, amber, 7); }
}

export function CageClashCanvas({ fightRef, drawRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const paint = (fight: CageFight | null) => paintArena(ctx, fight, motion.matches);
    drawRef.current = paint;
    paint(fightRef.current);
    const change = () => paint(fightRef.current);
    motion.addEventListener('change', change);
    return () => { drawRef.current = () => {}; motion.removeEventListener('change', change); };
  }, [drawRef, fightRef]);
  return <canvas ref={canvasRef} width={320} height={180} tabIndex={0} className="block aspect-video w-full rounded-lg border border-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500" style={{ imageRendering: 'pixelated' }} role="img" aria-label="Original pixel cage arena. Fight status, health and controls are below and above the picture." />;
}
