import {
  type PlayerAppearance,
  getSkinTone, getHairColor, getFacialHair, getAccessory,
} from "@/lib/soccerCareerAppearance";

/* ─── PlayerAvatar (Round 54) ───
   A stylized SVG bust built from the player's appearance choices plus the
   current club color for the shirt. Pure SVG so it scales crisply from the
   32px header chip to the 160px Ballon d'Or stage, with zero image assets.
   Hairstyles and facial hair are layered paths on a 100x100 viewBox. */

interface PlayerAvatarProps {
  appearance: PlayerAppearance;
  clubColor?: string;
  size?: number;
  className?: string;
  /** little idle bob, used on the career header */
  animate?: boolean;
}

const darken = (hex: string, amt: number): string => {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const n = (i: number) => Math.max(0, Math.min(255, parseInt(h.slice(i, i + 2), 16) - amt));
  return `#${[n(0), n(2), n(4)].map(v => v.toString(16).padStart(2, "0")).join("")}`;
};

const PlayerAvatar = ({ appearance, clubColor = "#3B82F6", size = 96, className = "", animate = false }: PlayerAvatarProps) => {
  const skin = getSkinTone(appearance.skinTone);
  const hair = getHairColor(appearance.hairColor);
  const facial = getFacialHair(appearance.facialHair);
  const accessory = getAccessory(appearance.accessory);
  const shirt = clubColor;
  const shirtDark = darken(clubColor, 40);

  const hairPaths: Record<string, JSX.Element | null> = {
    bald: null,
    buzz: (
      <path d="M 30 34 Q 30 16 50 16 Q 70 16 70 34 L 70 38 Q 60 32 50 32 Q 40 32 30 38 Z" fill={hair.color} opacity="0.55" />
    ),
    fade: (
      <>
        <path d="M 29 36 Q 29 15 50 15 Q 71 15 71 36 L 71 40 Q 62 30 50 30 Q 38 30 29 40 Z" fill={hair.color} />
        <path d="M 29 36 L 29 44 Q 31 38 34 35 Z M 71 36 L 71 44 Q 69 38 66 35 Z" fill={hair.color} opacity="0.35" />
      </>
    ),
    curls: (
      <>
        <circle cx="35" cy="24" r="8" fill={hair.color} />
        <circle cx="47" cy="19" r="8.5" fill={hair.color} />
        <circle cx="60" cy="22" r="8" fill={hair.color} />
        <circle cx="68" cy="30" r="7" fill={hair.color} />
        <circle cx="31" cy="32" r="7" fill={hair.color} />
        <path d="M 28 32 Q 28 22 50 20 Q 72 22 72 32 L 72 38 Q 60 30 50 30 Q 40 30 28 38 Z" fill={hair.color} />
      </>
    ),
    afro: (
      <>
        <circle cx="50" cy="24" r="21" fill={hair.color} />
        <circle cx="32" cy="30" r="11" fill={hair.color} />
        <circle cx="68" cy="30" r="11" fill={hair.color} />
      </>
    ),
    waves: (
      <>
        <path d="M 29 36 Q 29 15 50 15 Q 71 15 71 36 L 71 40 Q 62 30 50 30 Q 38 30 29 40 Z" fill={hair.color} />
        <path d="M 33 26 Q 41 22 49 26 M 37 21 Q 46 17 55 21 M 45 29 Q 54 25 63 29" stroke={darken(hair.color, 25)} strokeWidth="1.5" fill="none" opacity="0.7" />
      </>
    ),
    topknot: (
      <>
        <path d="M 30 35 Q 30 18 50 18 Q 70 18 70 35 L 70 39 Q 60 31 50 31 Q 40 31 30 39 Z" fill={hair.color} />
        <ellipse cx="50" cy="13" rx="8" ry="6.5" fill={hair.color} />
        <rect x="46" y="16" width="8" height="5" rx="2" fill={darken(hair.color, 20)} />
      </>
    ),
    long: (
      <>
        <path d="M 27 34 Q 27 14 50 14 Q 73 14 73 34 L 74 58 Q 70 62 66 58 L 66 40 Q 58 30 50 30 Q 42 30 34 40 L 34 58 Q 30 62 26 58 Z" fill={hair.color} />
      </>
    ),
    mohawk: (
      <>
        <path d="M 44 30 L 44 10 Q 50 6 56 10 L 56 30 Q 50 26 44 30 Z" fill={hair.color} />
        <path d="M 46 28 L 46 12 M 50 26 L 50 9 M 54 28 L 54 12" stroke={darken(hair.color, 25)} strokeWidth="1" opacity="0.6" />
      </>
    ),
    braids: (
      <>
        <path d="M 29 36 Q 29 15 50 15 Q 71 15 71 36 L 71 40 Q 62 31 50 31 Q 38 31 29 40 Z" fill={hair.color} />
        <path d="M 33 22 L 30 52 M 40 18 L 38 54 M 47 16 L 46 55 M 53 16 L 54 55 M 60 18 L 62 54 M 67 22 L 70 52" stroke={darken(hair.color, 22)} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <circle cx="30" cy="53" r="1.8" fill={darken(hair.color, 35)} />
        <circle cx="38" cy="55" r="1.8" fill={darken(hair.color, 35)} />
        <circle cx="46" cy="56" r="1.8" fill={darken(hair.color, 35)} />
        <circle cx="54" cy="56" r="1.8" fill={darken(hair.color, 35)} />
        <circle cx="62" cy="55" r="1.8" fill={darken(hair.color, 35)} />
        <circle cx="70" cy="53" r="1.8" fill={darken(hair.color, 35)} />
      </>
    ),
    mullet: (
      <>
        <path d="M 30 34 Q 30 16 50 16 Q 70 16 70 34 L 70 38 Q 60 30 50 30 Q 40 30 30 38 Z" fill={hair.color} />
        <path d="M 68 34 L 72 56 Q 68 60 64 56 L 64 40 Z M 32 34 L 28 56 Q 32 60 36 56 L 36 40 Z" fill={hair.color} />
      </>
    ),
    spiky: (
      <>
        <path d="M 30 34 Q 30 20 50 19 Q 70 20 70 34 L 70 37 Q 60 30 50 30 Q 40 30 30 37 Z" fill={hair.color} />
        <path d="M 33 26 L 30 15 L 39 22 L 40 11 L 47 20 L 50 9 L 53 20 L 60 11 L 61 22 L 70 15 L 67 26 Q 58 20 50 20 Q 42 20 33 26 Z" fill={hair.color} />
        <path d="M 40 11 L 47 20 M 50 9 L 53 20 M 60 11 L 61 22" stroke={darken(hair.color, 30)} strokeWidth="0.8" opacity="0.5" />
      </>
    ),
    /* ─── Round 131: eleven more cuts ───
       Same rules as the first twelve. Every one of them is paths on the same
       100x100 box, so they scale from the 32px header chip to the Ballon d'Or
       stage without a single image being fetched from anywhere. */
    sidepart: (
      <>
        <path d="M 29 36 Q 29 15 50 15 Q 71 15 71 36 L 71 40 Q 62 30 50 30 Q 38 30 29 40 Z" fill={hair.color} />
        <path d="M 40 17 Q 36 26 35 39" stroke={darken(hair.color, 45)} strokeWidth="1.6" fill="none" opacity="0.8" />
        <path d="M 42 17 Q 55 19 66 27" stroke={darken(hair.color, 20)} strokeWidth="1" fill="none" opacity="0.5" />
      </>
    ),
    slickback: (
      <>
        <path d="M 29 37 Q 29 13 50 13 Q 71 13 71 37 L 71 41 Q 62 31 50 31 Q 38 31 29 41 Z" fill={hair.color} />
        <path d="M 36 20 Q 50 16 64 22 M 34 26 Q 50 22 66 28 M 33 32 Q 50 28 67 34" stroke={darken(hair.color, 28)} strokeWidth="1.2" fill="none" opacity="0.65" />
      </>
    ),
    curtains: (
      <>
        <path d="M 28 36 Q 28 14 50 14 Q 72 14 72 36 L 72 42 Q 66 30 58 27 L 50 24 L 42 27 Q 34 30 28 42 Z" fill={hair.color} />
        <path d="M 50 15 L 50 26" stroke={darken(hair.color, 40)} strokeWidth="1.2" opacity="0.7" />
        <path d="M 42 27 Q 37 34 36 44 M 58 27 Q 63 34 64 44" stroke={darken(hair.color, 22)} strokeWidth="1.4" fill="none" opacity="0.6" />
      </>
    ),
    dreads: (
      <>
        <path d="M 29 35 Q 29 14 50 14 Q 71 14 71 35 L 71 39 Q 62 30 50 30 Q 38 30 29 39 Z" fill={hair.color} />
        <rect x="29" y="34" width="4.6" height="26" rx="2.3" fill={hair.color} />
        <rect x="36" y="36" width="4.6" height="24" rx="2.3" fill={darken(hair.color, 12)} />
        <rect x="59.4" y="36" width="4.6" height="24" rx="2.3" fill={darken(hair.color, 12)} />
        <rect x="66.4" y="34" width="4.6" height="26" rx="2.3" fill={hair.color} />
        <rect x="44" y="12" width="4.4" height="12" rx="2.2" fill={hair.color} />
        <rect x="51.6" y="12" width="4.4" height="12" rx="2.2" fill={darken(hair.color, 12)} />
      </>
    ),
    cornrows: (
      <>
        <path d="M 30 35 Q 30 16 50 16 Q 70 16 70 35 L 70 39 Q 60 31 50 31 Q 40 31 30 39 Z" fill={hair.color} />
        <path d="M 34 34 Q 36 20 44 17 M 39 35 Q 41 19 47 16.5 M 45 35.5 Q 46 19 50 16 M 55 35.5 Q 54 19 50 16 M 61 35 Q 59 19 53 16.5 M 66 34 Q 64 20 56 17" stroke={darken(hair.color, 40)} strokeWidth="1.1" fill="none" opacity="0.85" />
      </>
    ),
    hightop: (
      <>
        <path d="M 33 34 L 33 12 Q 33 9 36 9 L 64 9 Q 67 9 67 12 L 67 34 Q 58 29 50 29 Q 42 29 33 34 Z" fill={hair.color} />
        <path d="M 33 16 Q 50 13 67 16" stroke={darken(hair.color, 25)} strokeWidth="1" fill="none" opacity="0.5" />
      </>
    ),
    ponytail: (
      <>
        <path d="M 30 35 Q 30 15 50 15 Q 70 15 70 35 L 70 39 Q 60 30 50 30 Q 40 30 30 39 Z" fill={hair.color} />
        <path d="M 34 22 Q 50 18 66 24" stroke={darken(hair.color, 25)} strokeWidth="1.1" fill="none" opacity="0.6" />
        <path d="M 68 32 Q 78 34 78 46 Q 78 56 72 60 Q 76 50 74 42 Q 72 36 66 36 Z" fill={hair.color} />
        <rect x="66" y="31" width="6" height="4" rx="2" fill={darken(hair.color, 30)} />
      </>
    ),
    receding: (
      <>
        <path d="M 29 38 Q 29 24 38 20 Q 34 28 34 40 Z" fill={hair.color} />
        <path d="M 71 38 Q 71 24 62 20 Q 66 28 66 40 Z" fill={hair.color} />
        <path d="M 38 20 Q 50 17 62 20 Q 56 21 50 24 Q 44 21 38 20 Z" fill={hair.color} opacity="0.75" />
        <path d="M 30 40 Q 30 50 33 55 L 33 42 Z M 70 40 Q 70 50 67 55 L 67 42 Z" fill={hair.color} opacity="0.85" />
      </>
    ),
    shaggy: (
      <>
        <path d="M 27 36 Q 27 13 50 13 Q 73 13 73 36 L 73 47 Q 70 39 66 37 Q 58 32 50 32 Q 42 32 34 37 Q 30 39 27 47 Z" fill={hair.color} />
        <path d="M 33 33 L 30 41 L 36 36 L 35 44 L 41 37 L 42 44 L 48 37 L 50 44 L 56 37 L 59 44 L 63 36 L 66 43 L 68 34" stroke={darken(hair.color, 20)} strokeWidth="1" fill="none" opacity="0.55" />
      </>
    ),
    lines: (
      <>
        <path d="M 30 34 Q 30 16 50 16 Q 70 16 70 34 L 70 38 Q 60 32 50 32 Q 40 32 30 38 Z" fill={hair.color} opacity="0.85" />
        <path d="M 31 30 Q 38 25 45 24 M 31 35 Q 39 30 46 29" stroke={skin.color} strokeWidth="1.7" fill="none" strokeLinecap="round" />
      </>
    ),
    quiff: (
      <>
        <path d="M 30 35 Q 30 17 50 17 Q 70 17 70 35 L 70 39 Q 60 31 50 31 Q 40 31 30 39 Z" fill={hair.color} />
        <path d="M 34 26 Q 34 8 50 7 Q 62 7 64 16 Q 56 11 48 14 Q 39 18 38 29 Z" fill={hair.color} />
        <path d="M 40 22 Q 44 12 54 11" stroke={darken(hair.color, 28)} strokeWidth="1.1" fill="none" opacity="0.6" />
      </>
    ),
  };

  const facialPaths: Record<string, JSX.Element | null> = {
    none: null,
    stubble: (
      <path d="M 36 52 Q 36 66 50 67 Q 64 66 64 52 L 64 56 Q 62 68 50 69 Q 38 68 36 56 Z" fill={hair.color} opacity="0.30" />
    ),
    goatee: (
      <path d="M 45 62 Q 50 60 55 62 L 54 70 Q 50 73 46 70 Z" fill={hair.color} />
    ),
    full: (
      <path d="M 34 48 L 34 58 Q 36 72 50 73 Q 64 72 66 58 L 66 48 Q 64 60 58 62 L 58 58 Q 54 61 50 61 Q 46 61 42 58 L 42 62 Q 36 60 34 48 Z" fill={hair.color} />
    ),
    mustache: (
      <path d="M 41 57 Q 50 53 59 57 Q 55 60 50 59 Q 45 60 41 57 Z" fill={hair.color} />
    ),
    chinstrap: (
      <path d="M 34 46 L 34 56 Q 36 70 50 71 Q 64 70 66 56 L 66 46 L 63 48 L 63 56 Q 61 66 50 67 Q 39 66 37 56 L 37 48 Z" fill={hair.color} />
    ),
    soul: (
      <rect x="47" y="64" width="6" height="4.5" rx="2" fill={hair.color} />
    ),
    /* Round 131: seven more, drawn on the same face. */
    heavy: (
      <>
        <path d="M 33 44 L 33 58 Q 35 74 50 75 Q 65 74 67 58 L 67 44 Q 65 62 58 64 L 58 58 Q 54 61 50 61 Q 46 61 42 58 L 42 64 Q 35 62 33 44 Z" fill={hair.color} />
        <path d="M 40 55 Q 50 51 60 55 Q 55 58 50 57.5 Q 45 58 40 55 Z" fill={hair.color} />
      </>
    ),
    vandyke: (
      <>
        <path d="M 41.5 56.5 Q 50 52.5 58.5 56.5 Q 54.5 59.5 50 58.5 Q 45.5 59.5 41.5 56.5 Z" fill={hair.color} />
        <path d="M 45 63 Q 50 61 55 63 L 54 71 Q 50 74 46 71 Z" fill={hair.color} />
      </>
    ),
    boxed: (
      <>
        <path d="M 36 50 L 36 58 Q 38 70 50 71 Q 62 70 64 58 L 64 50 Q 62 60 57 61.5 L 57 57.5 Q 53.5 60 50 60 Q 46.5 60 43 57.5 L 43 61.5 Q 38 60 36 50 Z" fill={hair.color} />
        <path d="M 41 55 Q 50 51.5 59 55 Q 54.5 58 50 57 Q 45.5 58 41 55 Z" fill={hair.color} />
      </>
    ),
    sideburns: (
      <>
        <path d="M 33.5 40 L 37 40 L 37 56 Q 35 57 33.5 55 Z" fill={hair.color} />
        <path d="M 66.5 40 L 63 40 L 63 56 Q 65 57 66.5 55 Z" fill={hair.color} />
      </>
    ),
    pencil: (
      <path d="M 43 56.5 Q 50 54.5 57 56.5 Q 50 55.8 43 56.5 Z" fill={hair.color} stroke={hair.color} strokeWidth="1.2" strokeLinecap="round" />
    ),
    horseshoe: (
      <>
        <path d="M 41 56 Q 50 52 59 56 Q 54.5 59 50 58 Q 45.5 59 41 56 Z" fill={hair.color} />
        <path d="M 41 56 L 44.5 56 L 44.5 69 L 41 69 Z M 59 56 L 55.5 56 L 55.5 69 L 59 69 Z" fill={hair.color} />
      </>
    ),
    patchy: (
      <>
        <path d="M 36 52 Q 36 66 50 67 Q 64 66 64 52 L 64 56 Q 62 68 50 69 Q 38 68 36 56 Z" fill={hair.color} opacity="0.22" />
        <circle cx="41" cy="59" r="3.2" fill={hair.color} opacity="0.55" />
        <circle cx="59" cy="59" r="3.2" fill={hair.color} opacity="0.55" />
        <path d="M 45 63 Q 50 61 55 63 L 54 69 Q 50 71 46 69 Z" fill={hair.color} opacity="0.75" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`${animate ? "animate-avatar-bob" : ""} ${className}`}
      aria-label="Player avatar"
      role="img"
    >
      {/* shoulders / shirt */}
      <path d="M 14 100 Q 16 78 34 74 L 44 71 L 56 71 L 66 74 Q 84 78 86 100 Z" fill={shirt} />
      <path d="M 14 100 Q 16 78 34 74 L 38 73 Q 30 82 28 100 Z M 86 100 Q 84 78 66 74 L 62 73 Q 70 82 72 100 Z" fill={shirtDark} opacity="0.5" />
      {/* collar */}
      <path d="M 44 71 L 50 78 L 56 71 L 53 70 L 50 74 L 47 70 Z" fill="#FFFFFF" opacity="0.9" />
      {/* neck */}
      <rect x="43" y="60" width="14" height="14" rx="5" fill={skin.shade} />
      {/* head */}
      <path d="M 32 40 Q 32 18 50 18 Q 68 18 68 40 L 68 48 Q 68 66 50 68 Q 32 66 32 48 Z" fill={skin.color} />
      {/* ears */}
      <ellipse cx="31.5" cy="46" rx="3.4" ry="5" fill={skin.color} />
      <ellipse cx="68.5" cy="46" rx="3.4" ry="5" fill={skin.shade} opacity="0.9" />
      {/* face shading */}
      <path d="M 62 24 Q 68 30 68 40 L 68 48 Q 68 64 52 68 Q 64 62 64 46 Q 64 30 58 24 Z" fill={skin.shade} opacity="0.35" />
      {/* eyes */}
      <ellipse cx="42.5" cy="45" rx="2.6" ry="3" fill="#2A2118" />
      <ellipse cx="57.5" cy="45" rx="2.6" ry="3" fill="#2A2118" />
      <circle cx="43.3" cy="44" r="0.8" fill="#FFFFFF" opacity="0.85" />
      <circle cx="58.3" cy="44" r="0.8" fill="#FFFFFF" opacity="0.85" />
      {/* brows */}
      <path d="M 38 39.5 Q 42.5 37.5 47 39.5" stroke={hair.color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M 53 39.5 Q 57.5 37.5 62 39.5" stroke={hair.color} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* nose */}
      <path d="M 50 47 L 48.4 54 Q 50 55.4 51.6 54 Z" fill={skin.shade} />
      {/* mouth */}
      <path d="M 44.5 59.5 Q 50 62.5 55.5 59.5" stroke="#7A4A3A" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* facial hair under mouth layer */}
      {facialPaths[facial.id] ?? null}
      {/* hair on top */}
      {hairPaths[appearance.hairstyle] ?? null}
      {/* accessories */}
      {accessory.id === "headband" && (
        <path d="M 31 33 Q 50 25 69 33 L 69 38 Q 50 30 31 38 Z" fill="#FFFFFF" stroke={shirtDark} strokeWidth="0.6" />
      )}
      {accessory.id === "chain" && (
        <path d="M 40 76 Q 50 86 60 76" stroke="#E8C24A" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeDasharray="2.4 1.6" />
      )}
      {accessory.id === "earring" && (
        <circle cx="68.5" cy="51" r="1.7" fill="#DCE9F5" stroke="#9FB6CC" strokeWidth="0.5" />
      )}
      {accessory.id === "captain" && (
        <path d="M 15 92 L 30 82 L 33 88 L 18 98 Z" fill="#E8C24A" />
      )}
      {accessory.id === "sleeve" && (
        <path d="M 15 94 Q 17 82 30 77 L 33 84 Q 22 88 20 100 L 15 100 Z" fill={shirtDark} />
      )}
      {accessory.id === "gloves" && (
        <>
          <circle cx="18" cy="97" r="5" fill="#222" />
          <circle cx="82" cy="97" r="5" fill="#222" />
        </>
      )}
      {accessory.id === "tape" && (
        <path d="M 16 91 L 26 85 L 28 89 L 18 95 Z" fill="#F2F2F2" />
      )}
      {/* Round 131: eight more, same rule. Composed, not fetched. */}
      {accessory.id === "mask" && (
        <>
          <path d="M 33 41 Q 50 36 67 41 L 67 50 Q 50 46 33 50 Z" fill="#2B2B33" opacity="0.92" />
          <path d="M 50 40 L 50 55" stroke="#2B2B33" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M 33 44 L 29 45 M 67 44 L 71 45" stroke="#2B2B33" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {accessory.id === "snood" && (
        <path d="M 38 68 Q 50 76 62 68 L 64 78 Q 50 86 36 78 Z" fill={shirtDark} stroke={shirt} strokeWidth="0.8" />
      )}
      {accessory.id === "goggles" && (
        <>
          <rect x="35" y="40.5" width="12" height="9" rx="4" fill="#BFE4F2" opacity="0.55" stroke="#2B2B33" strokeWidth="1.4" />
          <rect x="53" y="40.5" width="12" height="9" rx="4" fill="#BFE4F2" opacity="0.55" stroke="#2B2B33" strokeWidth="1.4" />
          <path d="M 47 45 L 53 45 M 35 45 L 30 46 M 65 45 L 70 46" stroke="#2B2B33" strokeWidth="1.4" />
        </>
      )}
      {accessory.id === "nosestrip" && (
        <path d="M 46.5 48 L 53.5 48 L 53 54 L 47 54 Z" fill="#F6E7D6" stroke="#D8C3AC" strokeWidth="0.5" />
      )}
      {accessory.id === "sweatband" && (
        <>
          <path d="M 14 93 L 24 88 L 26.5 93 L 16.5 98 Z" fill="#FFFFFF" />
          <path d="M 86 93 L 76 88 L 73.5 93 L 83.5 98 Z" fill="#FFFFFF" />
        </>
      )}
      {accessory.id === "cap" && (
        <>
          <path d="M 30 42 Q 30 14 50 14 Q 70 14 70 42 L 66 42 Q 66 22 50 22 Q 34 22 34 42 Z" fill="#2F3540" />
          <path d="M 30 42 Q 30 14 50 14 Q 70 14 70 42 L 70 34 Q 70 20 50 20 Q 30 20 30 34 Z" fill="#3C4450" />
          <path d="M 32 42 Q 34 56 40 60" stroke="#2F3540" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M 68 42 Q 66 56 60 60" stroke="#2F3540" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </>
      )}
      {accessory.id === "hoops" && (
        <>
          <circle cx="31.5" cy="52" r="3.4" fill="none" stroke="#E8C24A" strokeWidth="1.5" />
          <circle cx="68.5" cy="52" r="3.4" fill="none" stroke="#E8C24A" strokeWidth="1.5" />
        </>
      )}
      {accessory.id === "undershirt" && (
        <>
          <path d="M 14 100 Q 16 79 33 75 L 36 82 Q 22 87 20 100 Z" fill="#1E1E24" />
          <path d="M 86 100 Q 84 79 67 75 L 64 82 Q 78 87 80 100 Z" fill="#1E1E24" />
        </>
      )}
    </svg>
  );
};

export default PlayerAvatar;
