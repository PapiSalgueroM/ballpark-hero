/**
 * Round 215: make a colour readable without throwing the colour away.
 *
 * The World Cup predictor tints each group with its own hue and then prints
 * headings IN that hue on a header tinted WITH that hue. Group H is navy, and
 * navy on dark navy measured 1.83 to 1. The old fix would be to hardcode
 * twelve new colours by eye. This does it by arithmetic instead: keep the hue,
 * keep the saturation, and raise ONLY the lightness until the words clear the
 * contrast bar against the surface they actually sit on. Twelve groups stay
 * twelve colours, they just all become words you can read.
 *
 * Two deliberate details, both learned by measuring:
 *
 * 1. hslToRgb rounds to 8 bits on purpose. The browser paints in 8 bit
 *    channels, so a pair that clears 4.5 in floating point can land a hair
 *    under it once painted. Rounding here means the number this file computes
 *    is the number the screen shows.
 * 2. readableHsl aims at 4.6, not 4.5, for the same reason: margin against
 *    the rounding on BOTH sides of the pair.
 *
 * WCAG contrast arithmetic per the spec: relative luminance with the 2.4
 * gamma curve, contrast = (lighter + 0.05) / (darker + 0.05).
 */

export type Rgb = { r: number; g: number; b: number };

/** h in degrees, s and l as 0 to 100. Returns 8 bit channels, rounded. */
export function hslToRgb(h: number, s: number, l: number): Rgb {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp < 1) { r1 = c; g1 = x; }
  else if (hp < 2) { r1 = x; g1 = c; }
  else if (hp < 3) { g1 = c; b1 = x; }
  else if (hp < 4) { g1 = x; b1 = c; }
  else if (hp < 5) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  const m = ln - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

/** WCAG relative luminance of an 8 bit colour. */
export function luminance(c: Rgb): number {
  const chan = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b);
}

/** WCAG contrast ratio between two colours, always at least 1. */
export function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The smallest lightness at or above the given one where hsl(h, s, L) clears
 * the target contrast against the surface. Walks up in half percent steps
 * because the space is not quite monotone near the top for some hues once
 * 8 bit rounding is in play, and a walk is cheap. If even white cannot clear
 * the bar (a nearly white surface), returns the best lightness found rather
 * than pretending.
 */
export function readableL(
  h: number,
  s: number,
  startL: number,
  surface: Rgb,
  target = 4.6,
): number {
  let bestL = startL;
  let bestC = contrast(hslToRgb(h, s, startL), surface);
  if (bestC >= target) return startL;
  for (let l = startL; l <= 100; l += 0.5) {
    const c = contrast(hslToRgb(h, s, l), surface);
    if (c > bestC) { bestC = c; bestL = l; }
    if (c >= target) return l;
  }
  return bestL;
}

/**
 * An hsl() string in the same hue and saturation, no darker than the given
 * lightness, readable against the surface it will actually sit on.
 */
export function readableHsl(
  h: number,
  s: number,
  l: number,
  surface: Rgb,
  target = 4.6,
): string {
  const lift = readableL(h, s, l, surface, target);
  return `hsl(${h}, ${s}%, ${lift}%)`;
}
